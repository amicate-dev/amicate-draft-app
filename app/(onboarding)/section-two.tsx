import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import InterestTagInput from '../../components/onboarding/InterestTagInput';
import OnboardingWrapper from '../../components/onboarding/OnboardingWrapper';
import SectionButton from '../../components/onboarding/SectionButton';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

export default function SectionTwoScreen() {
  const router = useRouter();
  const { refreshProfile } = useProfile();
  const [tags, setTags] = useState<string[]>([]);
  const loadedRef = useRef<string[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user) return;
      const { data, error } = await supabase
        .from('user_interests')
        .select('tag')
        .eq('user_id', session.user.id)
        .order('added_at', { ascending: true });
      if (cancelled) return;
      if (!error && data) {
        const list = data.map((r) => r.tag);
        loadedRef.current = list;
        setTags(list);
      } else {
        loadedRef.current = [];
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onNext = useCallback(async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) {
      Alert.alert('Sign in required', 'Please sign in again.');
      return;
    }

    setIsSaving(true);
    try {
      const initial = loadedRef.current;
      const norm = (t: string[]) => [...t].map((x) => x.trim().toLowerCase()).sort().join('|');
      const changed = !initial || norm(initial) !== norm(tags);

      if (changed) {
        const { error: delErr } = await supabase
          .from('user_interests')
          .delete()
          .eq('user_id', session.user.id);
        if (delErr) {
          Alert.alert('Could not save', delErr.message);
          return;
        }
        if (tags.length > 0) {
          const rows = tags.map((tag) => ({
            user_id: session.user.id,
            tag,
          }));
          const { error: insErr } = await supabase.from('user_interests').insert(rows);
          if (insErr) {
            Alert.alert('Could not save', insErr.message);
            return;
          }
        }
      }

      const { error: upErr } = await supabase
        .from('profiles')
        .update({ onboarding_step: 3 })
        .eq('user_id', session.user.id);
      if (upErr) {
        Alert.alert('Could not save', upErr.message);
        return;
      }

      await refreshProfile();
      router.replace('/section-three');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [refreshProfile, router, tags]);

  return (
    <OnboardingWrapper currentSection={2}>
      <Text style={styles.title}>What are you into?</Text>
      <Text style={styles.sub}>Add up to 5 interests. Shown on your profile.</Text>

      <View style={styles.spacer} />
      <InterestTagInput tags={tags} onTagsChange={setTags} />

      <View style={styles.bottom} />
      <SectionButton label="Next" onPress={() => void onNext()} loading={isSaving} />
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
    marginBottom: 8,
  },
  spacer: {
    height: 8,
  },
  bottom: {
    height: 32,
  },
});
