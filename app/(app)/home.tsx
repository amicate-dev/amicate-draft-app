import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile } from '../../context/ProfileContext';
import { colors } from '../../lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, isLoading } = useProfile();
  const uri = profile?.avatar_url ?? null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.flex}>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => router.push('/profile')}
          activeOpacity={0.85}
          accessibilityLabel="Profile settings"
        >
          {isLoading ? (
            <View style={styles.placeholder}>
              <ActivityIndicator color={colors.textMuted} size="small" />
            </View>
          ) : uri ? (
            <Image source={{ uri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.placeholder} />
          )}
        </TouchableOpacity>
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const AV = 38;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  avatarBtn: {
    position: 'absolute',
    top: 8,
    right: 16,
    width: AV,
    height: AV,
    borderRadius: AV / 2,
    borderWidth: 2,
    borderColor: colors.brand,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
