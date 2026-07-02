import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors } from '../../lib/theme';

type Props = {
  label: string;
  value: string | React.ReactNode;
  onPress?: () => void;
  editable?: boolean;
  style?: ViewStyle;
};

export default function ProfileField({
  label,
  value,
  onPress,
  editable = true,
  style,
}: Props) {
  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <View style={styles.valueFlex}>
          {typeof value === 'string' ? <Text style={styles.valueText}>{value}</Text> : value}
        </View>
        {editable ? <Text style={styles.chevron}>›</Text> : null}
      </View>
    </>
  );

  if (editable && onPress) {
    return (
      <Pressable style={[styles.row, style]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.row, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  valueFlex: {
    flex: 1,
  },
  valueText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: '300',
  },
});
