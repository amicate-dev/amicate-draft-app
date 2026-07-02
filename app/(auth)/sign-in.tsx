import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../../lib/supabase';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (!email.trim() || !password.trim()) {
        setErrorMessage('please fill in both email and password.');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        setErrorMessage(
          error.message.toLowerCase() ||
            'could not log you in. please check your details and try again.'
        );
      }
    } catch {
      setErrorMessage('we could not reach the server. please check your internet and try again.');
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
          <View style={styles.formContainer}>
            <View style={styles.formHeaderRow}>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
                <Text style={styles.backButtonText}>back</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.formTitleText}>welcome back</Text>
            <Text style={styles.formSubtitleText}>
              log in with the email and password you used before.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="email"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={styles.input}
              placeholder="password"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : (
              <Text style={styles.hintText}>
                we never share your details. use a strong password you do not use elsewhere.
              </Text>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSubmit}
              activeOpacity={0.9}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#1b1b1f" />
              ) : (
                <Text style={styles.primaryButtonText}>log in</Text>
              )}
            </TouchableOpacity>
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
  formContainer: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 24,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  formTitleText: {
    marginTop: 24,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  formSubtitleText: {
    marginTop: 6,
    marginBottom: 8,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#ffffff',
    backgroundColor: 'rgba(27, 27, 31, 0.9)',
  },
  errorText: {
    marginTop: 10,
    color: '#ffd1d9',
    fontSize: 13,
    lineHeight: 18,
  },
  hintText: {
    marginTop: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#1b1b1f',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'lowercase',
  },
});
