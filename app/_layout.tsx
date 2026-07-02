import * as WebBrowser from 'expo-web-browser';
import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { User } from '@supabase/supabase-js';

import { ProfileProvider, useProfile } from '../context/ProfileContext';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const AUTH_PATHS = new Set(['/', '/sign-in', '/sign-up']);

/** Maps profiles.onboarding_step to resume route (incomplete profiles only). */
function onboardingPathForStep(step: number): string {
  switch (step) {
    case 2:
      return '/section-two';
    case 3:
      return '/section-three';
    case 4:
    case 5:
      return '/section-four';
    case 1:
    default:
      return '/section-one';
  }
}

function isAppPath(pathname: string | undefined): boolean {
  if (!pathname) return false;
  return pathname === '/home' || pathname.startsWith('/profile');
}

/** Avoid replace loops if pathname/trailing slash differs slightly */
function pathsDiffer(pathname: string | undefined, target: string): boolean {
  const a = (pathname ?? '').replace(/\/+$/, '') || '/';
  const b = target.replace(/\/+$/, '') || '/';
  return a !== b;
}

let _navDebugCount = 0;
function debugNavReplace(
  hypothesisId: string,
  data: Record<string, string | boolean | number | undefined>
) {
  if (_navDebugCount > 40) return;
  _navDebugCount += 1;
  const href =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? String(window.location?.href ?? '').slice(0, 120)
      : undefined;
  // #region agent log
  fetch('http://127.0.0.1:7288/ingest/549e6392-44b8-4c8f-abfe-255984051424', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'be81bc' },
    body: JSON.stringify({
      sessionId: 'be81bc',
      location: 'app/_layout.tsx:NavigationRoot',
      message: 'router.replace',
      data: { ...data, href },
      timestamp: Date.now(),
      hypothesisId,
      runId: 'history-insecure',
    }),
  }).catch(() => {});
  // #endregion
}

function NavigationRoot({ user }: { user: User | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const navigationState = useRootNavigationState();
  const { isLoading: profileLoading, isComplete, onboardingStep } = useProfile();

  useEffect(() => {
    if (!navigationState?.key) return;
    if (user && profileLoading) return;

    if (!user) {
      if (pathname && !AUTH_PATHS.has(pathname) && pathsDiffer(pathname, '/')) {
        debugNavReplace('H1', { branch: 'no-user', pathname, target: '/' });
        router.replace('/');
      }
      return;
    }

    if (!isComplete) {
      const target = onboardingPathForStep(onboardingStep);
      if (pathsDiffer(pathname, target)) {
        debugNavReplace('H2', { branch: 'onboarding', pathname, target });
        router.replace(target);
      }
      return;
    }

    if (!isAppPath(pathname) && pathsDiffer(pathname, '/home')) {
      debugNavReplace('H3', { branch: 'home', pathname, target: '/home' });
      router.replace('/home');
    }
  }, [
    user,
    profileLoading,
    isComplete,
    onboardingStep,
    pathname,
    navigationState?.key,
    router,
  ]);

  return (
    <>
      {user && profileLoading ? (
        <View style={styles.profileLoadingOverlay} pointerEvents="auto">
          <Text style={styles.loadingText}>getting things ready for you…</Text>
          <ActivityIndicator size="small" color="#ffffff" style={styles.loadingSpinner} />
          <StatusBar style="light" />
        </View>
      ) : null}
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user ?? null);
        // NavigationRoot handles redirects — avoid duplicate router.replace (web history "operation is insecure").
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (active) {
          setUser(session?.user ?? null);
        }
      })
      .finally(() => {
        if (active) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      {isCheckingSession ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>getting things ready for you…</Text>
          <ActivityIndicator size="small" color="#ffffff" style={styles.loadingSpinner} />
          <StatusBar style="light" />
        </View>
      ) : (
        <ProfileProvider key={user?.id ?? 'guest'} userId={user?.id ?? null}>
          <NavigationRoot user={user} />
        </ProfileProvider>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  profileLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0b0b0f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 100,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  loadingSpinner: {
    marginTop: 16,
  },
});
