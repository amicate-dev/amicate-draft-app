import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import PhotoActionSheet, { type PhotoCropMode } from '../profile/PhotoActionSheet';
import { colors } from '../../lib/theme';

export type PickerPhoto = {
  localUri: string;
  uploadedUrl: string | null;
};

type Props = {
  maxPhotos: number;
  shape: 'circle' | 'rectangle';
  photos: PickerPhoto[];
  onChange: (photos: PickerPhoto[]) => void;
  label?: string;
  /** Per-slot upload in progress */
  loadingSlots?: boolean[];
};

function displayUri(p: PickerPhoto): string {
  return p.uploadedUrl ?? p.localUri;
}

export default function PhotoPicker({
  maxPhotos,
  shape,
  photos,
  onChange,
  label,
  loadingSlots,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [targetIndex, setTargetIndex] = useState(0);

  const cropMode: PhotoCropMode = shape === 'circle' ? 'square' : 'rect4x3';

  const padded = Array.from({ length: maxPhotos }, (_, i) => photos[i] ?? null);

  const openForIndex = useCallback((index: number) => {
    setTargetIndex(index);
    setSheetOpen(true);
  }, []);

  const handlePicked = useCallback(
    (localUri: string) => {
      const next = [...photos];
      if (targetIndex < next.length) {
        next[targetIndex] = { localUri, uploadedUrl: null };
      } else {
        next.push({ localUri, uploadedUrl: null });
      }
      onChange(next);
    },
    [onChange, photos, targetIndex]
  );

  const removeAt = useCallback(
    (index: number) => {
      const next = photos.filter((_, i) => i !== index);
      onChange(next);
    },
    [onChange, photos]
  );

  const isCircle = shape === 'circle';
  const slotStyle = isCircle ? styles.slotCircle : styles.slotRect;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.grid, isCircle && styles.gridCenter]}>
        {padded.map((slot, index) => {
          const loading = loadingSlots?.[index] ?? false;
          const filled = slot && (slot.localUri || slot.uploadedUrl);
          const canAddHere = !filled && index === photos.length && photos.length < maxPhotos;

          return (
            <View key={index} style={[styles.slotWrap, slotStyle]}>
              {filled ? (
                <>
                  <Image source={{ uri: displayUri(slot!) }} style={styles.image} />
                  <Pressable
                    style={styles.remove}
                    onPress={() => removeAt(index)}
                    hitSlop={8}
                  >
                    <Text style={styles.removeText}>×</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[styles.empty, !canAddHere && styles.emptyDisabled]}
                  onPress={() => (canAddHere ? openForIndex(index) : undefined)}
                  disabled={loading || !canAddHere}
                >
                  <Text style={styles.plus}>+</Text>
                </Pressable>
              )}
              {loading ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator color={colors.text} />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <PhotoActionSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPicked={handlePicked}
        cropMode={cropMode}
      />
    </View>
  );
}

const SLOT_CIRCLE = 160;
const SLOT_W = 108;
const SLOT_H = 144;

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  gridCenter: {
    justifyContent: 'center',
  },
  slotWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  slotCircle: {
    width: SLOT_CIRCLE,
    height: SLOT_CIRCLE,
    borderRadius: SLOT_CIRCLE / 2,
  },
  slotRect: {
    width: SLOT_W,
    height: SLOT_H,
    borderRadius: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    color: colors.textMuted,
    fontSize: 36,
    fontWeight: '300',
  },
  emptyDisabled: {
    opacity: 0.35,
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
