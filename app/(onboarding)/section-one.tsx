import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import OnboardingWrapper from '../../components/onboarding/OnboardingWrapper';
import PhotoPicker, { type PickerPhoto } from '../../components/onboarding/PhotoPicker';
import SectionButton from '../../components/onboarding/SectionButton';
import { useProfile } from '../../context/ProfileContext';
import { GENDER_OPTIONS, genderDbFromLabel, genderLabelFromDb } from '../../lib/gender';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { uploadPhoto } from '../../lib/upload';
import type { Enums } from '../../supabase/types/database.types';

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
const MAX_BIO = 300;

function maxDobDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
}

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIso(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function SectionOneScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useProfile();

  const [photos, setPhotos] = useState<PickerPhoto[]>([]);
  const [username, setUsername] = useState(profile?.username ?? '');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(parseIso(profile?.date_of_birth ?? null));
  const [gender, setGender] = useState<Enums<'gender_type'> | null>(profile?.gender ?? null);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showGenderSheet, setShowGenderSheet] = useState(false);
  const [iosDob, setIosDob] = useState<Date>(dateOfBirth ?? maxDobDate());
  const hydrated = useRef(false);

  useEffect(() => {
    if (!profile || hydrated.current) return;
    hydrated.current = true;
    if (profile.username) setUsername(profile.username);
    if (profile.full_name) setFullName(profile.full_name);
    if (profile.date_of_birth) {
      const d = parseIso(profile.date_of_birth);
      if (d) {
        setDateOfBirth(d);
        setIosDob(d);
      }
    }
    if (profile.gender) setGender(profile.gender);
    if (profile.bio) setBio(profile.bio);
    if (profile.avatar_url) {
      setPhotos([
        { localUri: profile.avatar_url, uploadedUrl: profile.avatar_url },
      ]);
    }
  }, [profile]);

  const usernameLiveError = useMemo(() => {
    const t = username.trim().toLowerCase();
    if (!t) return '';
    if (!USERNAME_RE.test(t)) {
      return 'Use 3–30 characters: lowercase letters, numbers, underscores only.';
    }
    return '';
  }, [username]);

  const genderLabel = genderLabelFromDb(gender);

  const canSubmit = useMemo(() => {
    const u = username.trim().toLowerCase();
    const photoOk =
      photos.length > 0 && !!(photos[0].uploadedUrl || photos[0].localUri);
    return (
      photoOk &&
      USERNAME_RE.test(u) &&
      fullName.trim().length > 0 &&
      dateOfBirth !== null &&
      gender !== null &&
      !usernameLiveError
    );
  }, [photos, username, fullName, dateOfBirth, gender, usernameLiveError]);

  const onNext = useCallback(async () => {
    setUsernameError('');
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) {
      Alert.alert('Sign in required', 'Please sign in again.');
      return;
    }

    setIsSaving(true);
    try {
      let avatarUrl = photos[0]?.uploadedUrl ?? null;
      const local = photos[0]?.localUri;
      if (local && !avatarUrl) {
        avatarUrl = await uploadPhoto(local, 'profile-photos');
        setPhotos([{ localUri: local, uploadedUrl: avatarUrl }]);
      }

      if (!avatarUrl) {
        Alert.alert('Photo required', 'Please add a profile photo.');
        return;
      }

      const u = username.trim().toLowerCase();
      const dobStr = dateOfBirth ? formatIsoDate(dateOfBirth) : null;

      const { error } = await supabase
        .from('profiles')
        .update({
          username: u,
          full_name: fullName.trim(),
          date_of_birth: dobStr,
          gender,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
          onboarding_step: 2,
        })
        .eq('user_id', session.user.id);

      if (error) {
        if (error.code === '23505') {
          setUsernameError('This username is already taken');
          return;
        }
        Alert.alert('Could not save', error.message || 'Something went wrong. Try again.');
        return;
      }

      await refreshProfile();
      router.replace('/section-two');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [
    photos,
    username,
    fullName,
    dateOfBirth,
    gender,
    bio,
    refreshProfile,
    router,
  ]);

  const onDobChange = (_e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDobPicker(false);
    }
    if (selected) {
      setDateOfBirth(selected);
      setIosDob(selected);
    }
  };

  return (
    <OnboardingWrapper currentSection={1}>
      <Text style={styles.title}>Set up your profile</Text>

      <PhotoPicker
        maxPhotos={1}
        shape="circle"
        photos={photos}
        onChange={setPhotos}
        label="Add profile photo"
      />

      <Text style={styles.fieldLabel}>Username</Text>
      <View style={styles.usernameRow}>
        <Text style={styles.at}>@</Text>
        <TextInput
          style={styles.usernameInput}
          value={username}
          onChangeText={(t) => {
            setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''));
            setUsernameError('');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="your_username"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      {usernameLiveError ? <Text style={styles.errorSmall}>{usernameLiveError}</Text> : null}
      {usernameError ? <Text style={styles.errorSmall}>{usernameError}</Text> : null}

      <Text style={styles.fieldLabel}>Full name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        placeholder="Your name"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.fieldLabel}>Date of birth</Text>
      <Pressable
        style={styles.inputLike}
        onPress={() => {
          setIosDob(dateOfBirth ?? maxDobDate());
          setShowDobPicker(true);
        }}
      >
        <Text style={dateOfBirth ? styles.inputLikeText : styles.placeholder}>
          {dateOfBirth
            ? dateOfBirth.toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'Select date'}
        </Text>
      </Pressable>
      {showDobPicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={dateOfBirth ?? maxDobDate()}
          mode="date"
          display="default"
          maximumDate={maxDobDate()}
          onChange={onDobChange}
        />
      ) : null}
      {showDobPicker && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide">
          <View style={styles.iosPickerBackdrop}>
            <View style={styles.iosPickerSheet}>
              <DateTimePicker
                value={iosDob}
                mode="date"
                display="spinner"
                maximumDate={maxDobDate()}
                onChange={(_e, d) => d && setIosDob(d)}
                themeVariant="dark"
              />
              <Pressable
                style={styles.iosDone}
                onPress={() => {
                  setDateOfBirth(iosDob);
                  setShowDobPicker(false);
                }}
              >
                <Text style={styles.iosDoneText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}

      <Text style={styles.fieldLabel}>Gender</Text>
      <Pressable style={styles.inputLike} onPress={() => setShowGenderSheet(true)}>
        <Text style={gender ? styles.inputLikeText : styles.placeholder}>
          {genderLabel || 'Select'}
        </Text>
      </Pressable>

      <Modal visible={showGenderSheet} transparent animationType="fade">
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowGenderSheet(false)}>
          <Pressable style={styles.genderSheet} onPress={(e) => e.stopPropagation()}>
            {GENDER_OPTIONS.map((opt) => {
              const db = genderDbFromLabel(opt);
              const selected = db && gender === db;
              return (
                <Pressable
                  key={opt}
                  style={styles.genderRow}
                  onPress={() => {
                    if (db) setGender(db);
                    setShowGenderSheet(false);
                  }}
                >
                  <Text style={styles.genderText}>{opt}</Text>
                  {selected ? <Text style={styles.genderDot}>●</Text> : <View style={styles.genderDotEmpty} />}
                </Pressable>
              );
            })}
            <Pressable style={styles.genderCancel} onPress={() => setShowGenderSheet(false)}>
              <Text style={styles.genderCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.bioHeader}>
        <Text style={styles.fieldLabel}>Bio</Text>
        <Text style={styles.optional}>Optional</Text>
      </View>
      <TextInput
        style={[styles.input, styles.bioInput]}
        value={bio}
        onChangeText={(t) => setBio(t.slice(0, MAX_BIO))}
        multiline
        placeholder="A short intro…"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.counter}>
        {bio.length}/{MAX_BIO}
      </Text>

      <View style={styles.spacer} />
      <SectionButton label="Next" onPress={() => void onNext()} loading={isSaving} disabled={!canSubmit} />
    </OnboardingWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 16,
    marginBottom: 8,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  at: {
    color: colors.textMuted,
    fontSize: 16,
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 12,
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
  inputLike: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputLikeText: {
    color: colors.text,
    fontSize: 16,
  },
  placeholder: {
    color: colors.textMuted,
    fontSize: 16,
  },
  errorSmall: {
    color: colors.error,
    fontSize: 13,
    marginTop: 6,
  },
  iosPickerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  iosPickerSheet: {
    backgroundColor: '#1a1a22',
    paddingBottom: 24,
  },
  iosDone: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  iosDoneText: {
    color: colors.brand,
    fontWeight: '700',
    fontSize: 17,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  genderSheet: {
    backgroundColor: '#1a1a22',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  genderText: {
    color: colors.text,
    fontSize: 17,
  },
  genderDot: {
    color: colors.brand,
    fontSize: 14,
  },
  genderDotEmpty: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  genderCancel: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  genderCancelText: {
    color: colors.error,
    fontSize: 17,
    fontWeight: '600',
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  optional: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 16,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  spacer: {
    height: 24,
  },
});
