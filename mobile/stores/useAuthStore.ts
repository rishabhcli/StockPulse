import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

interface Profile {
  id: string;
  username: string | null;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    if (!isSupabaseEnabled) {
      set({ isLoading: false });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      set({
        session,
        user: session.user,
        isAuthenticated: true,
      });
      await get().fetchProfile();
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user || null,
        isAuthenticated: Boolean(session),
      });
      if (session) {
        get().fetchProfile();
      } else {
        set({ profile: null });
      }
    });

    set({ isLoading: false });
  },

  signUp: async (email, password, fullName) => {
    if (!isSupabaseEnabled) {
      // Demo mode: allow signup without Supabase for development/testing
      const demoUser = {
        id: 'demo-user-001',
        email: email || 'demo@stockpulse.app',
        app_metadata: {},
        user_metadata: { full_name: fullName || 'Demo User' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any;
      set({
        session: { access_token: 'demo-token', user: demoUser } as any,
        user: demoUser,
        profile: {
          id: 'demo-user-001',
          username: 'demo_trader',
          email: email || 'demo@stockpulse.app',
          full_name: fullName || 'Demo User',
          avatar_url: null,
        },
        isAuthenticated: true,
      });
      return { error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (data.session) {
      set({
        session: data.session,
        user: data.user,
        isAuthenticated: true,
      });
      await get().fetchProfile();
    }

    return { error: error as Error | null };
  },

  signIn: async (email, password) => {
    if (!isSupabaseEnabled) {
      // Demo mode: allow login without Supabase for development/testing
      const demoUser = {
        id: 'demo-user-001',
        email: email || 'demo@stockpulse.app',
        app_metadata: {},
        user_metadata: { full_name: 'Demo User' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any;
      set({
        session: { access_token: 'demo-token', user: demoUser } as any,
        user: demoUser,
        profile: {
          id: 'demo-user-001',
          username: 'demo_trader',
          email: email || 'demo@stockpulse.app',
          full_name: 'Demo User',
          avatar_url: null,
        },
        isAuthenticated: true,
      });
      return { error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (data.session) {
      set({
        session: data.session,
        user: data.user,
        isAuthenticated: true,
      });
      await get().fetchProfile();
    }

    return { error: error as Error | null };
  },

  signOut: async () => {
    if (!isSupabaseEnabled) return;
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    const user = get().user;
    if (!user || !isSupabaseEnabled) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      set({ profile: data as Profile });
    }
  },

  updateProfile: async (updates) => {
    const user = get().user;
    if (!user || !isSupabaseEnabled) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      await get().fetchProfile();
    }

    return { error: error as Error | null };
  },
}));
