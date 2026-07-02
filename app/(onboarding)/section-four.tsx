import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import OnboardingWrapper from '../../components/onboarding/OnboardingWrapper';
import SectionButton from '../../components/onboarding/SectionButton';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

const MAX_Q = 150;
const SUGGESTIONS = [
  'Cats or dogs?',
  'English or Spanish?',
  'What does your ideal Sunday look like?',
];

export default function SectionFourScreen() {
  const router = useRouter();
  const { refreshProfile } = useProfile();
  const [question, setQuestion] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = question.trim().length > 0;

  const onCreate = useCallback(async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) {
      Alert.alert('Sign in required', 'Please sign in again.');
      return;
    }

    const uid = session.user.id;

    const { count: interestCount, error: iErr } = await supabase
      .from('user_interests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid);
    const { count: photoCount, error: pErr } = await supabase
      .from('profile_photos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid);

    if (iErr || pErr) {
      Alert.alert('Could not verify', (iErr || pErr)?.message ?? 'Try again.');
      return;
    }

    if ((interestCount ?? 0) === 0) {
      Alert.alert(
        'Interests missing',
        'Add at least one interest before finishing.',
        [
          { text: 'Go to interests', onPress: () => router.replace('/section-two') },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    if ((photoCount ?? 0) === 0) {
      Alert.alert(
        'Photos missing',
        'Add at least one profile photo before finishing.',
        [
          { text: 'Go to photos', onPress: () => router.replace('/section-three') },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          matchmaking_question: question.trim(),
          is_profile_complete: true,
          onboarding_step: 6,
        })
        .eq('user_id', uid);

      if (error) {
        Alert.alert(
          'Something went wrong',
          'Your progress is saved — please try again.'
        );
        return;
      }

      await refreshProfile();
      router.replace('/home');
    } catch {
      Alert.alert(
        'Something went wrong',
        'Your progress is saved — please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [question, refreshProfile, router]);

  return (
    <OnboardingWrapper currentSection={4}>
      <Text style={styles.title}>What&apos;s your quiz?</Text>
      <Text style={styles.sub}>People on the discovery feed will answer this to connect with you.</Text>

      <TextInput
        style={styles.input}
        value={question}
        onChangeText={(t) => setQuestion(t.slice(0, MAX_Q))}
        placeholder="Your question…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="sentences"
      />
      <Text style={styles.counter}>
        {question.length}/{MAX_Q}
      </Text>

      <Text style={styles.suggestLabel}>Suggestions</Text>
      <View style={styles.pills}>
        {SUGGESTIONS.map((s) => (
          <Pressable key={s} style={styles.pill} onPress={() => setQuestion(s)}>
            <Text style={styles.pillText}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.bottom} />
      <SectionButton
        label="Create Profile"
        onPress={() => void onCreate()}
        loading={isSaving}
        disabled={!canSubmit}
      />
    </OnboardingWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  sub: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  counter: {
    alignSelf: 'flex-end',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  suggestLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 24,
    marginBottom: 10,
  },
  pills: {
    gap: 10,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  bottom: {
    height: 32,
  },
});
