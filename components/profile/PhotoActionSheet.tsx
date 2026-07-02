import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cropLocalImage, type CropMode } from '../../lib/cropImage';
import { colors } from '../../lib/theme';

export type PhotoCropMode = 'square' | 'rect4x3';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called with a local file URI (cropped JPEG when applicable). */
  onPicked: (localUri: string) => void;
  cropMode?: PhotoCropMode;
};

function cropModeToPickerAspect(mode: PhotoCropMode): [number, number] {
  return mode === 'square' ? [1, 1] : [4, 3];
}

function cropModeToLib(mode: PhotoCropMode): CropMode {
  return mode === 'square' ? 'square' : 'rect4x3';
}

export default function PhotoActionSheet({
  visible,
  onClose,
  onPicked,
  cropMode = 'square',
}: Props) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      setCameraOpen(false);
      setBusy(false);
      setCameraReady(false);
    }
  }, [visible]);

  const finishWithUri = useCallback(
    async (uri: string) => {
      try {
        setBusy(true);
        const cropped = await cropLocalImage(uri, cropModeToLib(cropMode));
        onPicked(cropped);
        onClose();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not process the image.';
        console.warn(msg);
        onPicked(uri);
        onClose();
      } finally {
        setBusy(false);
        setCameraOpen(false);
      }
    },
    [cropMode, onClose, onPicked]
  );

  const pickFromGallery = useCallback(async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) {
      onClose();
      return;
    }
    const aspect = cropModeToPickerAspect(cropMode);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]?.uri) {
      onClose();
      return;
    }
    await finishWithUri(result.assets[0].uri);
  }, [cropMode, finishWithUri, onClose]);

  const openCamera = useCallback(async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        onClose();
        return;
      }
    }
    setCameraOpen(true);
  }, [permission?.granted, requestPermission, onClose]);

  const takePicture = useCallback(async () => {
    try {
      setBusy(true);
      const cam = cameraRef.current;
      if (!cam) return;
      const photo = await cam.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        await finishWithUri(photo.uri);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not take a photo.';
      console.warn(msg);
    } finally {
      setBusy(false);
    }
  }, [finishWithUri]);

  if (!visible) {
    return null;
  }

  return (
    <>
      <Modal visible={visible && !cameraOpen} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Add photo</Text>
            <Pressable
              style={styles.option}
              onPress={() => {
                void openCamera();
              }}
              disabled={busy}
            >
              <Text style={styles.optionText}>Take Photo</Text>
            </Pressable>
            <Pressable
              style={styles.option}
              onPress={() => {
                void pickFromGallery();
              }}
              disabled={busy}
            >
              <Text style={styles.optionText}>Choose from Gallery</Text>
            </Pressable>
            <Pressable style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            {busy ? (
              <View style={styles.busy}>
                <ActivityIndicator color={colors.text} />
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={cameraOpen} animationType="slide">
        <View style={[styles.cameraWrap, { paddingTop: insets.top }]}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            mode="picture"
            onCameraReady={() => setCameraReady(true)}
          />
          <View style={[styles.cameraBar, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              onPress={() => {
                setCameraOpen(false);
                setBusy(false);
              }}
              style={styles.camSecondary}
            >
              <Text style={styles.camSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => void takePicture()}
              style={styles.shutter}
              disabled={busy || !cameraReady}
            >
              {busy ? <ActivityIndicator color="#000" /> : <View style={styles.shutterInner} />}
            </Pressable>
            <View style={{ width: 72 }} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a22',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    paddingTop: 12,
  },
  sheetTitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  option: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  cancel: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    color: colors.error,
    fontSize: 17,
    fontWeight: '600',
  },
  busy: {
    paddingVertical: 8,
  },
  cameraWrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: '#000',
  },
  camSecondary: {
    width: 72,
  },
  camSecondaryText: {
    color: colors.text,
    fontSize: 16,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: '#333',
  },
});
