import { create } from 'zustand';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

interface WatchlistItem {
  id: string;
  ticker: string;
  notes: string | null;
  added_at: string;
}

interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  items: WatchlistItem[];
  created_at: string;
  updated_at: string;
}

interface WatchlistState {
  watchlists: Watchlist[];
  isLoading: boolean;
  error: string | null;

  fetchWatchlists: () => Promise<void>;
  createWatchlist: (name: string, description?: string) => Promise<{ error: Error | null }>;
  deleteWatchlist: (watchlistId: string) => Promise<{ error: Error | null }>;
  addToWatchlist: (watchlistId: string, ticker: string, notes?: string) => Promise<{ error: Error | null }>;
  removeFromWatchlist: (itemId: string) => Promise<{ error: Error | null }>;
  subscribeToWatchlists: () => () => void;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  watchlists: [],
  isLoading: false,
  error: null,

  fetchWatchlists: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId || !isSupabaseEnabled) return;

    set({ isLoading: true });

    try {
      const { data } = await supabase
        .from('watchlists')
        .select(`
          *,
          items:watchlist_items(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) {
        set({ watchlists: data as Watchlist[] });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch watchlists' });
    } finally {
      set({ isLoading: false });
    }
  },

  createWatchlist: async (name, description) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId || !isSupabaseEnabled) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await supabase
      .from('watchlists')
      .insert({ user_id: userId, name, description });

    if (!error) {
      await get().fetchWatchlists();
    }

    return { error: error as Error | null };
  },

  deleteWatchlist: async (watchlistId) => {
    if (!isSupabaseEnabled) {
      return { error: new Error('Not configured') };
    }

    const { error } = await supabase
      .from('watchlists')
      .delete()
      .eq('id', watchlistId);

    if (!error) {
      await get().fetchWatchlists();
    }

    return { error: error as Error | null };
  },

  addToWatchlist: async (watchlistId, ticker, notes) => {
    if (!isSupabaseEnabled) {
      return { error: new Error('Not configured') };
    }

    const { error } = await supabase
      .from('watchlist_items')
      .insert({
        watchlist_id: watchlistId,
        ticker: ticker.toUpperCase(),
        notes,
      });

    if (!error) {
      await get().fetchWatchlists();
    }

    return { error: error as Error | null };
  },

  removeFromWatchlist: async (itemId) => {
    if (!isSupabaseEnabled) {
      return { error: new Error('Not configured') };
    }

    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('id', itemId);

    if (!error) {
      await get().fetchWatchlists();
    }

    return { error: error as Error | null };
  },

  subscribeToWatchlists: () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId || !isSupabaseEnabled) return () => {};

    const channel = supabase
      .channel(`watchlists-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watchlists',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          get().fetchWatchlists();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
