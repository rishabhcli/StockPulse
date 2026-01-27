import { create } from 'zustand';
import { MarketSnapshot, MarketSentiment, ScreenerResult, IndexData, PennyStock } from '../lib/types';
import { getMarketSnapshot, getMarketSentiment, screenStocks } from '../lib/api';

interface MarketState {
  // Data
  sentiment: MarketSentiment | null;
  topPicks: ScreenerResult[];
  gainers: ScreenerResult[];
  losers: ScreenerResult[];
  shorts: ScreenerResult[];
  indices: IndexData[];
  pennyStocks: PennyStock[];

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
  shorts: [],
  indices: [],
  pennyStocks: [],
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
        shorts: snapshot.shorts,
        indices: snapshot.indices,
        pennyStocks: snapshot.penny_stocks,
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
        shorts: snapshot.shorts,
        indices: snapshot.indices,
        pennyStocks: snapshot.penny_stocks,
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
