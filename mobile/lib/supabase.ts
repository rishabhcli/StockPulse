import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

let accessToken: string | null = null;
let tokenInitialized = false;
let sessionRequest: Promise<string | null> | null = null;

if (isSupabaseEnabled) {
  supabase.auth.onAuthStateChange((_event, session) => {
    accessToken = session?.access_token ?? null;
    tokenInitialized = true;
  });
}

/**
 * Resolve the current token once and then keep it synchronized via Supabase
 * auth events. This avoids an AsyncStorage read before every API request.
 */
export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseEnabled) return null;
  if (tokenInitialized) return accessToken;
  if (sessionRequest) return sessionRequest;

  sessionRequest = supabase.auth.getSession()
    .then(({ data }) => {
      accessToken = data.session?.access_token ?? null;
      tokenInitialized = true;
      return accessToken;
    })
    .finally(() => {
      sessionRequest = null;
    });
  return sessionRequest;
}
