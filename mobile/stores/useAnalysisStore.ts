import { create } from 'zustand';
import type { ScreenerResult, StockAnalysis } from '../lib/types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import { analysisQueryOptions, screenerQueryOptions, type ScreenerFilter } from '../lib/queryOptions';
import { queryKeys } from '../lib/queryKeys';

interface AnalysisState {
  currentAnalysis: StockAnalysis | null;
  currentTicker: string | null;
  analysesByTicker: Record<string, StockAnalysis>;
  analysisHistory: StockAnalysis[];
  screenerResults: ScreenerResult[];
  currentFilter: ScreenerFilter;
  isAnalyzing: boolean;
  isScreening: boolean;
  error: string | null;
  analyze: (ticker: string) => Promise<StockAnalysis | null>;
  screen: (filter: ScreenerFilter, limit?: number) => Promise<void>;
  setFilter: (filter: ScreenerFilter) => void;
  clearAnalysis: () => void;
  clearError: () => void;
  subscribeToAnalysis: (ticker: string) => () => void;
}

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function mergeHistory(history: StockAnalysis[], analysis: StockAnalysis) {
  return [analysis, ...history.filter((item) => item.ticker !== analysis.ticker)].slice(0, 10);
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  currentAnalysis: null,
  currentTicker: null,
  analysesByTicker: {},
  analysisHistory: [],
  screenerResults: [],
  currentFilter: 'all',
  isAnalyzing: false,
  isScreening: false,
  error: null,

  analyze: async (ticker: string) => {
    const normalizedTicker = normalizeTicker(ticker);
    if (!normalizedTicker || get().isAnalyzing) return null;

    set({ isAnalyzing: true, error: null });

    try {
      const analysis = await queryClient.fetchQuery(analysisQueryOptions(normalizedTicker));

      set((state) => ({
        currentAnalysis: analysis,
        currentTicker: normalizedTicker,
        analysesByTicker: {
          ...state.analysesByTicker,
          [normalizedTicker]: analysis,
        },
        analysisHistory: mergeHistory(state.analysisHistory, analysis),
        isAnalyzing: false,
      }));

      return analysis;
    } catch (error) {
      set({
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Failed to analyze stock',
      });
      return null;
    }
  },

  screen: async (filter: ScreenerFilter, limit: number = 20) => {
    if (get().isScreening) return;

    set({ isScreening: true, error: null, currentFilter: filter });

    try {
      const results = await queryClient.fetchQuery(screenerQueryOptions(filter, 'score', '', limit));
      set({ screenerResults: results, isScreening: false });
    } catch (error) {
      set({
        isScreening: false,
        error: error instanceof Error ? error.message : 'Failed to screen stocks',
      });
    }
  },

  setFilter: (filter: ScreenerFilter) => {
    set({ currentFilter: filter, isScreening: false });
    void get().screen(filter);
  },

  clearAnalysis: () => set({ currentAnalysis: null, currentTicker: null }),

  clearError: () => set({ error: null }),

  subscribeToAnalysis: (ticker: string) => {
    if (!isSupabaseEnabled) return () => {};

    const normalizedTicker = normalizeTicker(ticker);
    const channel = supabase
      .channel(`analysis-${normalizedTicker}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stock_analyses',
          filter: `ticker=eq.${normalizedTicker}`,
        },
        () => {
          void queryClient.fetchQuery(analysisQueryOptions(normalizedTicker)).then((analysis) => {
            set((state) => {
              if (state.currentTicker !== normalizedTicker && state.analysesByTicker[normalizedTicker] === analysis) {
                return state;
              }

              return {
                currentAnalysis: state.currentTicker === normalizedTicker ? analysis : state.currentAnalysis,
                analysesByTicker: {
                  ...state.analysesByTicker,
                  [normalizedTicker]: analysis,
                },
                analysisHistory: mergeHistory(state.analysisHistory, analysis),
              };
            });
          }).catch(() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.analysis(normalizedTicker) });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));

