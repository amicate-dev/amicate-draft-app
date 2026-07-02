import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import OnboardingWrapper from '../../components/onboarding/OnboardingWrapper';
import PhotoPicker, { type PickerPhoto } from '../../components/onboarding/PhotoPicker';
import SectionButton from '../../components/onboarding/SectionButton';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { uploadPhoto } from '../../lib/upload';

export default function SectionThreeScreen() {
  const router = useRouter();
  const { refreshProfile } = useProfile();
  const [photos, setPhotos] = useState<PickerPhoto[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean[]>(() => []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user) return;
      const { data, error } = await supabase
        .from('profile_photos')
        .select('photo_url, display_order')
        .eq('user_id', session.user.id)
        .order('display_order', { ascending: true });
      if (cancelled) return;
      if (!error && data?.length) {
        const mapped: PickerPhoto[] = data.map((row) => ({
          localUri: row.photo_url,
          uploadedUrl: row.photo_url,
        }));
        setPhotos(mapped);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLoadingSlots((prev) => {
      if (prev.length === photos.length) return prev;
      return Array.from({ length: photos.length }, (_, i) => prev[i] ?? false);
    });
  }, [photos.length]);

  const canSubmit =
    photos.length > 0 && photos.every((p) => p.uploadedUrl || p.localUri);

  const onNext = useCallback(async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) {
      Alert.alert('Sign in required', 'Please sign in again.');
      return;
    }

    setIsSaving(true);

    try {
      const withUrls: PickerPhoto[] = [];
      for (let i = 0; i < photos.length; i += 1) {
        const p = photos[i];
        let url = p.uploadedUrl;
        if (!url && p.localUri) {
          setLoadingSlots((prev) => {
            const n = [...prev];
            n[i] = true;
            return n;
          });
          try {
            url = await uploadPhoto(p.localUri, 'profile-photos');
          } finally {
            setLoadingSlots((prev) => {
              const n = [...prev];
              n[i] = false;
              return n;
            });
          }
        }
        if (url) {
          withUrls.push({ localUri: p.localUri, uploadedUrl: url });
        }
      }

      if (withUrls.length === 0) {
        Alert.alert('Photos required', 'Add at least one photo.');
        return;
      }

      const { error: delErr } = await supabase
        .from('profile_photos')
        .delete()
        .eq('user_id', session.user.id);
      if (delErr) {
        Alert.alert('Could not save', delErr.message);
        return;
      }

      const rows = withUrls.map((photo, index) => ({
        user_id: session.user.id,
        photo_url: photo.uploadedUrl!,
        display_order: index + 1,
        is_primary: index === 0,
      }));

      const { error: insErr } = await supabase.from('profile_photos').insert(rows);
      if (insErr) {
        Alert.alert('Could not save', insErr.message);
        return;
      }

      const { error: upErr } = await supabase
        .from('profiles')
        .update({ onboarding_step: 4 })
        .eq('user_id', session.user.id);
      if (upErr) {
        Alert.alert('Could not save', upErr.message);
        return;
      }

      await refreshProfile();
      router.replace('/section-four');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [photos, refreshProfile, router]);

  return (
    <OnboardingWrapper currentSection={3}>
      <Text style={styles.title}>Add your photos</Text>
      <Text style={styles.sub}>Up to 5 photos shown on your discovery card.</Text>

      <View style={styles.spacer} />
      <PhotoPicker
        maxPhotos={5}
        shape="rectangle"
        photos={photos}
        onChange={setPhotos}
        loadingSlots={loadingSlots}
      />

      <View style={styles.bottom} />
      <SectionButton
        label="Next"
        onPress={() => void onNext()}
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
    marginBottom: 8,
  },
  spacer: {
    height: 8,
  },
  bottom: {
    height: 32,
  },
});
