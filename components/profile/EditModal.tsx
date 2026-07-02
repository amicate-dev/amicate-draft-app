import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  saveLabel?: string;
  saving: boolean;
  saveDisabled?: boolean;
};

export default function EditModal({
  visible,
  onClose,
  title,
  children,
  onSave,
  saveLabel = 'Save',
  saving,
  saveDisabled = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slide, {
        toValue: 1,
        useNativeDriver: true,
        friction: 9,
      }).start();
    } else {
      slide.setValue(0);
    }
  }, [visible, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  if (!visible) {
    return null;
  }

  const canSave = !saveDisabled && !saving;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                transform: [{ translateY }],
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.body}>{children}</View>
              <View style={styles.actions}>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Text style={styles.cancel}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                  onPress={onSave}
                  disabled={!canSave}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={styles.saveText}>{saveLabel}</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a22',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  cancel: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.brand,
    minWidth: 100,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
});
