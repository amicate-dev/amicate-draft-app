import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';
import type { Tables } from '../supabase/types/database.types';

export type ProfileRow = Tables<'profiles'>;

export type ProfilePhotoRow = Tables<'profile_photos'>;

type ProfileContextValue = {
  profile: ProfileRow | null;
  interests: string[];
  photos: ProfilePhotoRow[];
  isLoading: boolean;
  isComplete: boolean;
  onboardingStep: number;
  refreshProfile: () => Promise<void>;
  updateProfile: (partial: Partial<ProfileRow>) => void;
  setInterests: (tags: string[]) => void;
  setPhotos: (rows: ProfilePhotoRow[]) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [interests, setInterestsState] = useState<string[]>([]);
  const [photos, setPhotosState] = useState<ProfilePhotoRow[]>([]);
  const [isLoading, setIsLoading] = useState(() => !!userId);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setInterestsState([]);
      setPhotosState([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const profileResult = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileResult.error || !profileResult.data) {
      setProfile(null);
      setInterestsState([]);
      setPhotosState([]);
      setIsLoading(false);
      return;
    }

    const [interestsResult, photosResult] = await Promise.all([
      supabase.from('user_interests').select('tag').eq('user_id', userId),
      supabase
        .from('profile_photos')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true }),
    ]);

    setProfile(profileResult.data);

    if (interestsResult.data) {
      setInterestsState(interestsResult.data.map((r) => r.tag));
    } else {
      setInterestsState([]);
    }

    if (photosResult.data) {
      setPhotosState(photosResult.data);
    } else {
      setPhotosState([]);
    }

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateProfile = useCallback((partial: Partial<ProfileRow>) => {
    setProfile((prev) => (prev ? { ...prev, ...partial } : null));
  }, []);

  const setInterests = useCallback((tags: string[]) => {
    setInterestsState(tags);
  }, []);

  const setPhotos = useCallback((rows: ProfilePhotoRow[]) => {
    setPhotosState(rows);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      interests,
      photos,
      isLoading,
      isComplete: profile?.is_profile_complete ?? false,
      onboardingStep: profile?.onboarding_step ?? 1,
      refreshProfile: loadProfile,
      updateProfile,
      setInterests,
      setPhotos,
    }),
    [profile, interests, photos, isLoading, loadProfile, updateProfile, setInterests, setPhotos]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return ctx;
}
