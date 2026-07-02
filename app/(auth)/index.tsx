import { makeRedirectUri } from 'expo-auth-session';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../../lib/supabase';

export default function LandingScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const redirectUri = makeRedirectUri({ scheme: 'draftapp' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setErrorMessage(
          error.message.toLowerCase() ||
            'we could not start google sign in. please try again in a moment.'
        );
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

        if (result.type !== 'success') {
          setErrorMessage('google sign in was cancelled. please try again if you want to use it.');
        }
      }
    } catch {
      setErrorMessage(
        'we could not reach google right now. please check your internet and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={['#ffcf4a', '#ff7854', '#fd267d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.landingContainer}>
            <View style={styles.landingTop}>
              <Text style={styles.landingLogoText}>Amicate</Text>
            </View>

            <View style={styles.landingButtons}>
              <TouchableOpacity
                style={styles.landingGoogleButton}
                onPress={handleGoogleLogin}
                activeOpacity={0.9}
                disabled={isSubmitting}
              >
                <View style={styles.landingGoogleButtonInner}>
                  <View style={styles.googleLogoMark}>
                    <Text style={styles.googleLogoMarkText}>G</Text>
                  </View>
                  <Text style={styles.landingGoogleButtonText}>Log in with Google</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.landingSignUpButton}
                onPress={() => router.push('/sign-up')}
                activeOpacity={0.9}
              >
                <Text style={styles.landingSignUpButtonText}>Sign Up</Text>
              </TouchableOpacity>

              <View style={styles.landingExistingWrapper}>
                <Text style={styles.landingExistingText}>Already an existing member?</Text>
                <TouchableOpacity
                  style={styles.landingLoginButton}
                  onPress={() => router.push('/sign-in')}
                  activeOpacity={0.9}
                >
                  <Text style={styles.landingLoginButtonText}>Log in</Text>
                </TouchableOpacity>
              </View>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            </View>
          </View>

          <StatusBar style="light" />
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  flex: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  landingContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  landingTop: {
    alignItems: 'center',
  },
  landingLogoText: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  landingButtons: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  landingGoogleButton: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  landingGoogleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogoMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  googleLogoMarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4285F4',
  },
  landingGoogleButtonText: {
    color: '#1b1b1f',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  landingSignUpButton: {
    marginTop: 16,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(11, 11, 15, 0.2)',
  },
  landingSignUpButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'lowercase',
  },
  landingExistingWrapper: {
    marginTop: 18,
    alignItems: 'center',
  },
  landingExistingText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
  },
  landingLoginButton: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 32,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landingLoginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'lowercase',
    letterSpacing: 0.5,
  },
  errorText: {
    marginTop: 10,
    color: '#ffd1d9',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
