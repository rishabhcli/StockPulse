import { create } from 'zustand';
import { MarketSnapshot, MarketSentiment, ScreenerResult, IndexData } from '../lib/types';
import { getMarketSnapshot, getMarketSentiment, screenStocks } from '../lib/api';

interface MarketState {
  // Data
  sentiment: MarketSentiment | null;
  topPicks: ScreenerResult[];
  gainers: ScreenerResult[];
  losers: ScreenerResult[];
  indices: IndexData[];

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  fetchSnapshot: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  // Initial state
  sentiment: null,
  topPicks: [],
  gainers: [],
  losers: [],
  indices: [],
  isLoading: false,
  isRefreshing: false,
  error: null,

  fetchSnapshot: async () => {
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const snapshot = await getMarketSnapshot();
      set({
        sentiment: snapshot.sentiment,
        topPicks: snapshot.top_picks,
        gainers: snapshot.gainers,
        losers: snapshot.losers,
        indices: snapshot.indices,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch market data',
      });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true, error: null });

    try {
      const snapshot = await getMarketSnapshot();
      set({
        sentiment: snapshot.sentiment,
        topPicks: snapshot.top_picks,
        gainers: snapshot.gainers,
        losers: snapshot.losers,
        indices: snapshot.indices,
        isRefreshing: false,
      });
    } catch (error) {
      set({
        isRefreshing: false,
        error: error instanceof Error ? error.message : 'Failed to refresh market data',
      });
    }
  },

  clearError: () => set({ error: null }),
}));
