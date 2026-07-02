import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import InterestTagInput from '../../../components/onboarding/InterestTagInput';
import EditModal from '../../../components/profile/EditModal';
import PhotoActionSheet from '../../../components/profile/PhotoActionSheet';
import ProfileField from '../../../components/profile/ProfileField';
import { useProfile } from '../../../context/ProfileContext';
import { GENDER_OPTIONS, genderDbFromLabel, genderLabelFromDb } from '../../../lib/gender';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../lib/theme';
import { uploadPhoto } from '../../../lib/upload';
import type { Enums } from '../../../supabase/types/database.types';
import type { PickerPhoto } from '../../../components/onboarding/PhotoPicker';

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
const MAX_BIO = 300;
const MAX_MATCH = 150;
const SUGGESTIONS = [
  'Cats or dogs?',
  'English or Spanish?',
  'What does your ideal Sunday look like?',
];

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

function formatDobDisplay(iso: string | null): string {
  if (!iso) return 'Not set';
  const d = parseIso(iso);
  if (!d) return 'Not set';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ProfileScreen() {
  const router = useRouter();
  const {
    profile,
    interests,
    photos: profilePhotos,
    refreshProfile,
    updateProfile,
  } = useProfile();

  const [email, setEmail] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [modalName, setModalName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [modalUser, setModalUser] = useState(false);
  const [draftUser, setDraftUser] = useState('');
  const [userAvail, setUserAvail] = useState<boolean | null>(null);
  const [userCheckErr, setUserCheckErr] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  const [modalDob, setModalDob] = useState(false);
  const [draftDob, setDraftDob] = useState<Date>(maxDobDate());
  const [savingDob, setSavingDob] = useState(false);

  const [modalGender, setModalGender] = useState(false);
  const [draftGender, setDraftGender] = useState<Enums<'gender_type'> | null>(null);
  const [savingGender, setSavingGender] = useState(false);

  const [modalBio, setModalBio] = useState(false);
  const [draftBio, setDraftBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  const [modalMatch, setModalMatch] = useState(false);
  const [draftMatch, setDraftMatch] = useState('');
  const [savingMatch, setSavingMatch] = useState(false);

  const [modalInterests, setModalInterests] = useState(false);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [savingInt, setSavingInt] = useState(false);

  const [modalPhotos, setModalPhotos] = useState(false);
  const [draftPhotos, setDraftPhotos] = useState<PickerPhoto[]>([]);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    })();
  }, []);

  useEffect(() => {
    const uid = profile?.user_id;
    if (!uid) return;
    const t = setTimeout(async () => {
      const v = draftUser.trim().toLowerCase();
      if (!modalUser || !USERNAME_RE.test(v)) {
        setUserAvail(null);
        setUserCheckErr('');
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', v)
        .neq('user_id', uid)
        .maybeSingle();
      if (error) {
        setUserCheckErr('Could not verify username');
        setUserAvail(null);
        return;
      }
      setUserCheckErr('');
      setUserAvail(!data);
    }, 500);
    return () => clearTimeout(t);
  }, [draftUser, modalUser, profile?.user_id]);

  const displayAvatar = avatarPreview ?? profile?.avatar_url ?? null;

  const openName = () => {
    setDraftName(profile?.full_name ?? '');
    setModalName(true);
  };
  const saveName = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user || !draftName.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: draftName.trim().slice(0, 50) })
        .eq('user_id', session.user.id);
      if (error) {
        Alert.alert('Could not save', error.message);
        return;
      }
      updateProfile({ full_name: draftName.trim().slice(0, 50) });
      setModalName(false);
    } finally {
      setSavingName(false);
    }
  };

  const openUser = () => {
    setDraftUser(profile?.username ?? '');
    setUserAvail(null);
    setModalUser(true);
  };

  const saveUser = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) return;
    const v = draftUser.trim().toLowerCase();
    if (!USERNAME_RE.test(v) || userAvail !== true) return;
    setSavingUser(true);
    try {
      const { error } = await supabase.from('profiles').update({ username: v }).eq('user_id', session.user.id);
      if (error) {
        if (error.code === '23505') {
          setUserCheckErr('Username taken');
          return;
        }
        Alert.alert('Could not save', error.message);
        return;
      }
      updateProfile({ username: v });
      setModalUser(false);
    } finally {
      setSavingUser(false);
    }
  };

  const openDob = () => {
    setDraftDob(parseIso(profile?.date_of_birth ?? null) ?? maxDobDate());
    setModalDob(true);
  };

  const saveDob = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) return;
    setSavingDob(true);
    try {
      const iso = formatIsoDate(draftDob);
      const { error } = await supabase
        .from('profiles')
        .update({ date_of_birth: iso })
        .eq('user_id', session.user.id);
      if (error) {
        Alert.alert('Could not save', error.message);
        return;
      }
      updateProfile({ date_of_birth: iso });
      setModalDob(false);
    } finally {
      setSavingDob(false);
    }
  };

  const openGender = () => {
    setDraftGender(profile?.gender ?? null);
    setModalGender(true);
  };

  const saveGender = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user || !draftGender) return;
    setSavingGender(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ gender: draftGender })
        .eq('user_id', session.user.id);
      if (error) {
        Alert.alert('Could not save', error.message);
        return;
      }
      updateProfile({ gender: draftGender });
      setModalGender(false);
    } finally {
      setSavingGender(false);
    }
  };

  const openBio = () => {
    setDraftBio(profile?.bio ?? '');
    setModalBio(true);
  };

  const saveBio = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) return;
    setSavingBio(true);
    try {
      const text = draftBio.trim();
      const { error } = await supabase
        .from('profiles')
        .update({ bio: text ? text.slice(0, MAX_BIO) : null })
        .eq('user_id', session.user.id);
      if (error) {
        Alert.alert('Could not save', error.message);
        return;
      }
      updateProfile({ bio: text ? text.slice(0, MAX_BIO) : null });
      setModalBio(false);
    } finally {
      setSavingBio(false);
    }
  };

  const openMatch = () => {
    setDraftMatch(profile?.matchmaking_question ?? '');
    setModalMatch(true);
  };

  const saveMatch = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) return;
    setSavingMatch(true);
    try {
      const text = draftMatch.trim().slice(0, MAX_MATCH);
      const { error } = await supabase
        .from('profiles')
        .update({ matchmaking_question: text || null })
        .eq('user_id', session.user.id);
      if (error) {
        Alert.alert('Could not save', error.message);
        return;
      }
      updateProfile({ matchmaking_question: text || null });
      setModalMatch(false);
    } finally {
      setSavingMatch(false);
    }
  };

  const openInterests = () => {
    setDraftTags([...interests]);
    setModalInterests(true);
  };

  const saveInterests = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) return;
    setSavingInt(true);
    try {
      const { error: dErr } = await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', session.user.id);
      if (dErr) {
        Alert.alert('Could not save', dErr.message);
        return;
      }
      if (draftTags.length > 0) {
        const rows = draftTags.map((tag) => ({ user_id: session.user.id, tag }));
        const { error: iErr } = await supabase.from('user_interests').insert(rows);
        if (iErr) {
          Alert.alert('Could not save', iErr.message);
          return;
        }
      }
      await refreshProfile();
      setModalInterests(false);
    } finally {
      setSavingInt(false);
    }
  };

  const openPhotosModal = () => {
    const mapped: PickerPhoto[] = profilePhotos.map((r) => ({
      localUri: r.photo_url,
      uploadedUrl: r.photo_url,
    }));
    setDraftPhotos(mapped);
    setModalPhotos(true);
  };

  const savePhotosModal = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) return;
    const valid = draftPhotos.filter((p) => p.uploadedUrl || p.localUri);
    setSavingPhotos(true);
    try {
      const resolved: { url: string }[] = [];
      for (const p of valid) {
        let url = p.uploadedUrl;
        if (!url && p.localUri) {
          url = await uploadPhoto(p.localUri, 'profile-photos');
        }
        if (url) resolved.push({ url });
      }

      const { error: dErr } = await supabase
        .from('profile_photos')
        .delete()
        .eq('user_id', session.user.id);
      if (dErr) {
        Alert.alert('Could not save', dErr.message);
        return;
      }

      if (resolved.length > 0) {
        const rows = resolved.map((r, index) => ({
          user_id: session.user.id,
          photo_url: r.url,
          display_order: index + 1,
          is_primary: index === 0,
        }));
        const { error: iErr } = await supabase.from('profile_photos').insert(rows);
        if (iErr) {
          Alert.alert('Could not save', iErr.message);
          return;
        }
      }

      await refreshProfile();
      setModalPhotos(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      Alert.alert('Error', msg);
    } finally {
      setSavingPhotos(false);
    }
  };

  const onAvatarPicked = async (localUri: string) => {
    setSheetOpen(false);
    setAvatarPreview(localUri);
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) return;
    try {
      const url = await uploadPhoto(localUri, 'profile-photos');
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('user_id', session.user.id);
      if (pErr) {
        Alert.alert('Could not save', pErr.message);
        return;
      }
      const { error: phErr } = await supabase
        .from('profile_photos')
        .update({ photo_url: url })
        .eq('user_id', session.user.id)
        .eq('is_primary', true);
      if (phErr) {
        console.warn('profile_photos primary update:', phErr.message);
      }
      updateProfile({ avatar_url: url });
      setAvatarPreview(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      Alert.alert('Error', msg);
      setAvatarPreview(null);
    }
  };

  const matchPreview = useMemo(() => {
    const q = profile?.matchmaking_question;
    if (!q) return 'Not set';
    return q.length > 80 ? `${q.slice(0, 80)}…` : q;
  }, [profile?.matchmaking_question]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/');
    } catch {
      Alert.alert('Sign out failed', 'Please try again.');
    }
  };

  const usernameHint = useMemo(() => {
    if (!modalUser) return null;
    const v = draftUser.trim().toLowerCase();
    if (!USERNAME_RE.test(v)) return null;
    if (userAvail === true) return <Text style={styles.ok}>✓ Available</Text>;
    if (userAvail === false || userCheckErr === 'Username taken')
      return <Text style={styles.bad}>Username taken</Text>;
    return null;
  }, [draftUser, modalUser, userAvail, userCheckErr]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.bigAvatarWrap} onPress={() => setSheetOpen(true)} activeOpacity={0.9}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.bigAvatar} />
          ) : (
            <View style={[styles.bigAvatar, styles.avatarPh]} />
          )}
        </TouchableOpacity>

        <Pressable style={styles.usernameBlock} onPress={openUser}>
          <Text style={styles.usernameText}>@{profile?.username ?? 'username'}</Text>
          <Text style={styles.pencil}>✎</Text>
        </Pressable>

        <ProfileField label="Full Name" value={profile?.full_name ?? 'Not set'} onPress={openName} />
        <ProfileField label="Email Address" value={email ?? '—'} editable={false} />
        <ProfileField
          label="Date of Birth"
          value={formatDobDisplay(profile?.date_of_birth ?? null)}
          onPress={openDob}
        />
        <ProfileField
          label="Gender"
          value={genderLabelFromDb(profile?.gender ?? null) || 'Not set'}
          onPress={openGender}
        />
        <ProfileField
          label="Bio"
          value={
            <Text style={[styles.fieldValue, !profile?.bio && styles.notSet]}>
              {profile?.bio?.trim() ? profile.bio : 'Not set'}
            </Text>
          }
          onPress={openBio}
        />
        <ProfileField
          label="Matchmaking Q."
          value={<Text style={styles.fieldValue}>{matchPreview}</Text>}
          onPress={openMatch}
        />

        <ProfileField
          label="Interests"
          value={
            <View style={styles.tagWrap}>
              {interests.length === 0 ? (
                <Text style={styles.notSet}>Not set</Text>
              ) : (
                interests.map((t) => (
                  <View key={t} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{t}</Text>
                  </View>
                ))
              )}
            </View>
          }
          onPress={openInterests}
        />

        <ProfileField
          label="Photos"
          value={
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.thumbRow}>
                {profilePhotos.map((p) => (
                  <Image key={p.id} source={{ uri: p.photo_url }} style={styles.thumb} />
                ))}
                {profilePhotos.length === 0 ? <Text style={styles.notSet}>Not set</Text> : null}
              </View>
            </ScrollView>
          }
          onPress={openPhotosModal}
        />

        <TouchableOpacity style={styles.logout} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>

      <PhotoActionSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPicked={(uri) => void onAvatarPicked(uri)}
        cropMode="square"
      />

      <EditModal
        visible={modalName}
        onClose={() => setModalName(false)}
        title="Full name"
        onSave={() => void saveName()}
        saving={savingName}
        saveDisabled={!draftName.trim()}
      >
        <TextInput
          style={styles.input}
          value={draftName}
          onChangeText={(t) => setDraftName(t.slice(0, 50))}
          autoCapitalize="words"
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
        />
      </EditModal>

      <EditModal
        visible={modalUser}
        onClose={() => setModalUser(false)}
        title="Username"
        onSave={() => void saveUser()}
        saving={savingUser}
        saveDisabled={userAvail !== true || !USERNAME_RE.test(draftUser.trim().toLowerCase())}
      >
        <Text style={styles.atRow}>@{draftUser.trim().toLowerCase() || 'username'}</Text>
        <TextInput
          style={styles.input}
          value={draftUser}
          onChangeText={(t) => setDraftUser(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {userCheckErr && userCheckErr !== 'Username taken' ? (
          <Text style={styles.errSmall}>{userCheckErr}</Text>
        ) : null}
        {userCheckErr === 'Username taken' ? <Text style={styles.errSmall}>Username taken</Text> : null}
        {usernameHint}
      </EditModal>

      <EditModal
        visible={modalDob}
        onClose={() => setModalDob(false)}
        title="Date of birth"
        onSave={() => void saveDob()}
        saving={savingDob}
      >
        <DateTimePicker
          value={draftDob}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={maxDobDate()}
          onChange={(_e: DateTimePickerEvent, d?: Date) => d && setDraftDob(d)}
          themeVariant="dark"
        />
      </EditModal>

      <Modal visible={modalGender} transparent animationType="fade">
        <Pressable style={styles.sheetBackdrop} onPress={() => setModalGender(false)}>
          <Pressable style={styles.genderSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Gender</Text>
            {GENDER_OPTIONS.map((opt) => {
              const db = genderDbFromLabel(opt);
              const selected = db && draftGender === db;
              return (
                <Pressable
                  key={opt}
                  style={styles.genderRow}
                  onPress={() => db && setDraftGender(db)}
                >
                  <Text style={styles.genderText}>{opt}</Text>
                  {selected ? <Text style={styles.genderDot}>●</Text> : <View style={styles.genderDotEmpty} />}
                </Pressable>
              );
            })}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalGender(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, savingGender && styles.saveBtnDis]}
                onPress={() => void saveGender()}
                disabled={savingGender || !draftGender}
              >
                <Text style={styles.saveTxt}>{savingGender ? '…' : 'Save'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <EditModal
        visible={modalBio}
        onClose={() => setModalBio(false)}
        title="Bio"
        onSave={() => void saveBio()}
        saving={savingBio}
      >
        <TextInput
          style={[styles.input, styles.bio]}
          value={draftBio}
          onChangeText={(t) => setDraftBio(t.slice(0, MAX_BIO))}
          multiline
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.counter}>
          {draftBio.length}/{MAX_BIO}
        </Text>
      </EditModal>

      <EditModal
        visible={modalMatch}
        onClose={() => setModalMatch(false)}
        title="Matchmaking question"
        onSave={() => void saveMatch()}
        saving={savingMatch}
      >
        <TextInput
          style={styles.input}
          value={draftMatch}
          onChangeText={(t) => setDraftMatch(t.slice(0, MAX_MATCH))}
          autoCapitalize="sentences"
        />
        <Text style={styles.counter}>
          {draftMatch.length}/{MAX_MATCH}
        </Text>
        <Text style={styles.suggestLabel}>Suggestions</Text>
        <View style={styles.pills}>
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} style={styles.pill} onPress={() => setDraftMatch(s)}>
              <Text style={styles.pillText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </EditModal>

      <EditModal
        visible={modalInterests}
        onClose={() => setModalInterests(false)}
        title="Interests"
        onSave={() => void saveInterests()}
        saving={savingInt}
      >
        <InterestTagInput tags={draftTags} onTagsChange={setDraftTags} />
      </EditModal>

      <EditModal
        visible={modalPhotos}
        onClose={() => setModalPhotos(false)}
        title="Photos"
        onSave={() => void savePhotosModal()}
        saving={savingPhotos}
      >
        <Text style={styles.help}>Up to 5 photos. Tap + to add. Tap a photo to remove.</Text>
        <View style={styles.photoGrid}>
          {Array.from({ length: 5 }, (_, i) => {
            const p = draftPhotos[i];
            const filled = p && (p.uploadedUrl || p.localUri);
            const canAdd = !filled && i === draftPhotos.length && draftPhotos.length < 5;
            const uri = p ? p.uploadedUrl ?? p.localUri : '';
            return (
              <View key={i} style={styles.phSlot}>
                {filled ? (
                  <>
                    <Image source={{ uri }} style={styles.phImg} />
                    <Pressable
                      style={styles.phRemove}
                      onPress={() => {
                        Alert.alert('Remove photo?', 'This will remove the photo from your profile.', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: () => setDraftPhotos((prev) => prev.filter((_, j) => j !== i)),
                          },
                        ]);
                      }}
                    >
                      <Text style={styles.phRemoveTxt}>×</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    style={[styles.phEmpty, !canAdd && styles.phEmptyDis]}
                    disabled={!canAdd}
                    onPress={() => {
                      if (canAdd) setPhotoSheet(true);
                    }}
                  >
                    <Text style={styles.plus}>+</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </EditModal>

      <PhotoActionSheet
        visible={photoSheet}
        onClose={() => setPhotoSheet(false)}
        cropMode="rect4x3"
        onPicked={(uri) => {
          setPhotoSheet(false);
          setDraftPhotos((prev) => [...prev, { localUri: uri, uploadedUrl: null }]);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  back: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 40,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bigAvatarWrap: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  bigAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  avatarPh: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  usernameBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  usernameText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  pencil: {
    color: colors.textMuted,
    fontSize: 18,
  },
  fieldValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  notSet: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tagPillText: {
    color: colors.text,
    fontSize: 13,
    textTransform: 'lowercase',
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    minHeight: 56,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  logout: {
    marginTop: 28,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  logoutText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: 16,
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
  bio: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  atRow: {
    color: colors.textMuted,
    marginBottom: 8,
  },
  errSmall: {
    color: colors.error,
    marginTop: 8,
    fontSize: 13,
  },
  ok: {
    color: colors.success,
    marginTop: 8,
    fontSize: 14,
  },
  bad: {
    color: colors.error,
    marginTop: 8,
    fontSize: 14,
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
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  genderText: {
    color: colors.text,
    fontSize: 17,
  },
  genderDot: {
    color: colors.brand,
  },
  genderDotEmpty: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    alignItems: 'center',
  },
  cancel: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  saveBtnDis: {
    opacity: 0.5,
  },
  saveTxt: {
    color: colors.background,
    fontWeight: '700',
  },
  suggestLabel: {
    color: colors.textMuted,
    marginTop: 12,
    marginBottom: 8,
    fontSize: 13,
  },
  pills: {
    gap: 8,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    color: colors.text,
    fontSize: 13,
  },
  help: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  phSlot: {
    width: 72,
    height: 96,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  phImg: {
    width: '100%',
    height: '100%',
  },
  phRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phRemoveTxt: {
    color: '#fff',
    fontWeight: '700',
  },
  phEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phEmptyDis: {
    opacity: 0.35,
  },
  plus: {
    color: colors.textMuted,
    fontSize: 28,
  },
});
