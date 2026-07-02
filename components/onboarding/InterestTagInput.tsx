import React, { useCallback, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../../lib/theme';

const MAX_TAGS = 5;

type Props = {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
};

export default function InterestTagInput({ tags, onTagsChange }: Props) {
  const [input, setInput] = React.useState('');
  const [dupMessage, setDupMessage] = React.useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const runShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [shake]);

  const addTag = useCallback(() => {
    const raw = input.trim().toLowerCase();
    if (!raw) return;
    if (tags.includes(raw)) {
      setDupMessage(true);
      runShake();
      return;
    }
    if (tags.length >= MAX_TAGS) return;
    setDupMessage(false);
    onTagsChange([...tags, raw]);
    setInput('');
  }, [input, onTagsChange, runShake, tags]);

  const removeTag = useCallback(
    (tag: string) => {
      onTagsChange(tags.filter((t) => t !== tag));
    },
    [onTagsChange, tags]
  );

  const atMax = tags.length >= MAX_TAGS;

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ transform: [{ translateX: shake }] }}>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, atMax && styles.inputDisabled]}
            placeholder="Add an interest"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={(t) => {
              setDupMessage(false);
              setInput(t);
            }}
            editable={!atMax}
            onSubmitEditing={addTag}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addBtn, atMax && styles.addBtnDisabled]}
            onPress={addTag}
            disabled={atMax || !input.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      {dupMessage ? <Text style={styles.dupText}>Already added</Text> : null}
      {atMax ? (
        <Text style={styles.maxText}>Maximum of 5 interests reached</Text>
      ) : null}

      <View style={styles.tags}>
        {tags.map((tag) => (
          <View key={tag} style={styles.pill}>
            <Text style={styles.pillText}>{tag}</Text>
            <TouchableOpacity
              onPress={() => removeTag(tag)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`Remove ${tag}`}
            >
              <Text style={styles.pillRemove}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  inputDisabled: {
    opacity: 0.45,
  },
  addBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.brand,
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 15,
  },
  dupText: {
    marginTop: 8,
    color: colors.error,
    fontSize: 13,
  },
  maxText: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 13,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  pillRemove: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '600',
  },
});
