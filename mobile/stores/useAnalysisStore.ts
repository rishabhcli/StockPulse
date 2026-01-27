import { create } from 'zustand';
import { StockAnalysis, ScreenerResult } from '../lib/types';
import { analyzeStock, screenStocks } from '../lib/api';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

type FilterType = 'all' | 'strong_buys' | 'buys' | 'sells' | 'strong_sells' | 'shorts';

interface AnalysisState {
  // Current analysis
  currentAnalysis: StockAnalysis | null;
  analysisHistory: StockAnalysis[];

  // Screener
  screenerResults: ScreenerResult[];
  currentFilter: FilterType;

  // Loading states
  isAnalyzing: boolean;
  isScreening: boolean;
  error: string | null;

  // Actions
  analyze: (ticker: string) => Promise<StockAnalysis | null>;
  screen: (filter: FilterType, limit?: number) => Promise<void>;
  setFilter: (filter: FilterType) => void;
  clearAnalysis: () => void;
  clearError: () => void;
  subscribeToAnalysis: (ticker: string) => () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  // Initial state
  currentAnalysis: null,
  analysisHistory: [],
  screenerResults: [],
  currentFilter: 'all',
  isAnalyzing: false,
  isScreening: false,
  error: null,

  analyze: async (ticker: string) => {
    if (get().isAnalyzing) return null;

    set({ isAnalyzing: true, error: null });

    try {
      const analysis = await analyzeStock(ticker);

      // Add to history (keep last 10)
      const history = [analysis, ...get().analysisHistory.filter(a => a.ticker !== ticker)].slice(0, 10);

      set({
        currentAnalysis: analysis,
        analysisHistory: history,
        isAnalyzing: false,
      });

      return analysis;
    } catch (error) {
      set({
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Failed to analyze stock',
      });
      return null;
    }
  },

  screen: async (filter: FilterType, limit: number = 20) => {
    if (get().isScreening) return;

    set({ isScreening: true, error: null, currentFilter: filter });

    try {
      const results = await screenStocks(filter, limit);
      set({
        screenerResults: results,
        isScreening: false,
      });
    } catch (error) {
      set({
        isScreening: false,
        error: error instanceof Error ? error.message : 'Failed to screen stocks',
      });
    }
  },

  setFilter: (filter: FilterType) => {
    set({ currentFilter: filter });
    get().screen(filter);
  },

  clearAnalysis: () => set({ currentAnalysis: null }),

  clearError: () => set({ error: null }),

  subscribeToAnalysis: (ticker: string) => {
    if (!isSupabaseEnabled) return () => {};

    const channel = supabase
      .channel(`analysis-${ticker.toUpperCase()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stock_analyses',
          filter: `ticker=eq.${ticker.toUpperCase()}`,
        },
        (payload) => {
          // Update current analysis if it matches the viewed ticker
          const current = get().currentAnalysis;
          if (current && current.ticker === ticker.toUpperCase()) {
            const newData = payload.new as any;
            set({
              currentAnalysis: {
                ...current,
                investment_score: newData.investment_score,
                technical_score: newData.technical_score,
                fundamental_score: newData.fundamental_score,
                current_price: newData.current_price,
                recommendation: newData.recommendation,
                timestamp: newData.timestamp,
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
