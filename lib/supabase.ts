import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Database } from '../supabase/types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to your .env file.'
  );
}

/** expo-secure-store's web implementation is `{}` — no getValueWithKeyAsync. Use AsyncStorage on web. */
const useAsyncStorage = Platform.OS === 'web';

// #region agent log
fetch('http://127.0.0.1:7288/ingest/549e6392-44b8-4c8f-abfe-255984051424', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'be81bc' },
  body: JSON.stringify({
    sessionId: 'be81bc',
    location: 'lib/supabase.ts:storage-init',
    message: 'Auth storage backend',
    data: { platform: Platform.OS, useAsyncStorage },
    timestamp: Date.now(),
    hypothesisId: 'H1',
    runId: 'post-fix',
  }),
}).catch(() => {});
// #endregion

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const WebAsyncStorageAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

const authStorage = useAsyncStorage ? WebAsyncStorageAdapter : ExpoSecureStoreAdapter;

export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
