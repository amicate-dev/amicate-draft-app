import { useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../lib/theme';
import ProgressBar from './ProgressBar';

type Props = {
  currentSection: 1 | 2 | 3 | 4;
  children: React.ReactNode;
};

export default function OnboardingWrapper({ currentSection, children }: Props) {
  const router = useRouter();

  const goBack = () => {
    if (currentSection === 1) {
      router.replace('/');
      return;
    }
    if (currentSection === 2) {
      router.replace('/section-one');
      return;
    }
    if (currentSection === 3) {
      router.replace('/section-two');
      return;
    }
    router.replace('/section-three');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.topRow}>
          <Pressable
            onPress={goBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backBtn}
          >
            <Text style={styles.backChevron}>‹</Text>
          </Pressable>
          <View style={styles.progressWrap}>
            <ProgressBar currentSection={currentSection} />
          </View>
          <View style={styles.backPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 40,
    justifyContent: 'center',
  },
  backChevron: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 40,
  },
  backPlaceholder: {
    width: 40,
  },
  progressWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});
