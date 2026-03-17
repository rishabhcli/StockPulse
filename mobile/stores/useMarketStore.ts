import { create } from 'zustand';
import type { IndexData, MarketSentiment, PennyStock, ScreenerResult } from '../lib/types';
import { queryClient } from '../lib/queryClient';
import { snapshotQueryOptions } from '../lib/queryOptions';

interface MarketState {
  sentiment: MarketSentiment | null;
  topPicks: ScreenerResult[];
  gainers: ScreenerResult[];
  losers: ScreenerResult[];
  shorts: ScreenerResult[];
  indices: IndexData[];
  pennyStocks: PennyStock[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  fetchSnapshot: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

function applySnapshotState(snapshot: any) {
  return {
    sentiment: snapshot?.sentiment ?? null,
    topPicks: snapshot?.top_picks ?? [],
    gainers: snapshot?.gainers ?? [],
    losers: snapshot?.losers ?? [],
    shorts: snapshot?.shorts ?? [],
    indices: snapshot?.indices ?? [],
    pennyStocks: snapshot?.penny_stocks ?? [],
  };
}

export const useMarketStore = create<MarketState>((set, get) => ({
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
      const snapshot = await queryClient.fetchQuery(snapshotQueryOptions());
      set({
        ...applySnapshotState(snapshot),
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
      const snapshot = await queryClient.fetchQuery(snapshotQueryOptions());
      set({
        ...applySnapshotState(snapshot),
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

