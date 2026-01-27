import { create } from 'zustand';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

interface Position {
  id: string;
  ticker: string;
  side: 'long' | 'short';
  quantity: number;
  avg_entry_price: number;
  entry_date: string;
  human_controlled: boolean;
}

interface Trade {
  id: string;
  ticker: string;
  trade_type: 'buy' | 'sell' | 'short' | 'cover';
  side: 'long' | 'short';
  quantity: number;
  price: number;
  value: number;
  reasoning: string;
  status: string;
  error: string | null;
  is_manual: boolean;
  cash_after: number | null;
  executed_at: string;
}

interface PortfolioSnapshot {
  total_value: number;
  cash: number;
  positions_value: number;
  spy_price: number | null;
  timestamp: string;
}

interface TradingState {
  portfolioId: string | null;
  cash: number;
  initialCapital: number;
  positions: Position[];
  trades: Trade[];
  snapshots: PortfolioSnapshot[];
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  fetchPositions: () => Promise<void>;
  fetchTrades: (limit?: number) => Promise<void>;
  fetchSnapshots: (limit?: number) => Promise<void>;
  resetPortfolio: () => Promise<void>;
  subscribeToTrades: () => () => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  portfolioId: null,
  cash: 100000,
  initialCapital: 100000,
  positions: [],
  trades: [],
  snapshots: [],
  isLoading: false,
  error: null,

  initialize: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId || !isSupabaseEnabled) return;

    set({ isLoading: true, error: null });

    try {
      // Get or create portfolio
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .eq('name', 'Default Portfolio')
        .limit(1);

      let portfolioId: string;

      if (portfolios && portfolios.length > 0) {
        const portfolio = portfolios[0];
        portfolioId = portfolio.id;
        set({
          portfolioId: portfolio.id,
          cash: parseFloat(portfolio.current_cash),
          initialCapital: parseFloat(portfolio.initial_capital),
        });
      } else {
        const { data: newPortfolio } = await supabase
          .from('portfolios')
          .insert({
            user_id: userId,
            name: 'Default Portfolio',
            initial_capital: 100000,
            current_cash: 100000,
          })
          .select()
          .single();

        if (!newPortfolio) throw new Error('Failed to create portfolio');

        portfolioId = newPortfolio.id;
        set({
          portfolioId: newPortfolio.id,
          cash: 100000,
          initialCapital: 100000,
        });
      }

      await Promise.all([
        get().fetchPositions(),
        get().fetchTrades(50),
        get().fetchSnapshots(100),
      ]);

      get().subscribeToTrades();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to initialize trading' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPositions: async () => {
    const portfolioId = get().portfolioId;
    if (!portfolioId || !isSupabaseEnabled) return;

    const { data } = await supabase
      .from('portfolio_positions')
      .select('*')
      .eq('portfolio_id', portfolioId);

    if (data) {
      set({ positions: data as Position[] });
    }
  },

  fetchTrades: async (limit = 50) => {
    const portfolioId = get().portfolioId;
    if (!portfolioId || !isSupabaseEnabled) return;

    const { data } = await supabase
      .from('trades')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('executed_at', { ascending: false })
      .limit(limit);

    if (data) {
      set({ trades: data as Trade[] });
    }
  },

  fetchSnapshots: async (limit = 100) => {
    const portfolioId = get().portfolioId;
    if (!portfolioId || !isSupabaseEnabled) return;

    const { data } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (data) {
      set({ snapshots: data as PortfolioSnapshot[] });
    }
  },

  resetPortfolio: async () => {
    const portfolioId = get().portfolioId;
    if (!portfolioId || !isSupabaseEnabled) return;

    await supabase
      .from('portfolio_positions')
      .delete()
      .eq('portfolio_id', portfolioId);

    await supabase
      .from('portfolios')
      .update({
        current_cash: 100000,
        reset_at: new Date().toISOString(),
      })
      .eq('id', portfolioId);

    set({ cash: 100000, positions: [], trades: [], snapshots: [] });
  },

  subscribeToTrades: () => {
    const portfolioId = get().portfolioId;
    if (!portfolioId || !isSupabaseEnabled) return () => {};

    const channel = supabase
      .channel(`trades-${portfolioId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `portfolio_id=eq.${portfolioId}`,
        },
        (payload) => {
          const newTrade = payload.new as Trade;
          set((state) => ({ trades: [newTrade, ...state.trades] }));
          // Refresh positions and portfolio after trade
          get().fetchPositions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
