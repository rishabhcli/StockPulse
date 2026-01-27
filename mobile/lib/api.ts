import axios, { AxiosError } from 'axios';
import { StockAnalysis, ScreenerResult, MarketSentiment, MarketSnapshot, IndexData } from './types';
import { API_URL } from './config';
import { supabase, isSupabaseEnabled } from './supabase';

// Use configured API URL
const API_BASE_URL = API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Supabase auth token and log
api.interceptors.request.use(
  async (config) => {
    if (__DEV__) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url?.split('?')[0]}`);
    }

    // Attach Supabase JWT for authenticated Flask endpoints
    if (isSupabaseEnabled) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
      } catch {
        // Continue without auth header
      }
    }

    return config;
  },
  (error) => {
    if (__DEV__) console.error('[API] Request error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (__DEV__) {
      if (error.response) {
        console.error(`[API] Error ${error.response.status}`);
      } else {
        console.error('[API] Error:', error.message);
      }
    }
    return Promise.reject(error);
  }
);

export const analyzeStock = async (ticker: string): Promise<StockAnalysis> => {
  const response = await api.post<StockAnalysis>('/api/analyze', { ticker: ticker.toUpperCase() });
  return response.data;
};

export const screenStocks = async (
  filter: 'all' | 'strong_buys' | 'buys' | 'sells' | 'strong_sells' | 'shorts' = 'all',
  limit: number = 20
): Promise<ScreenerResult[]> => {
  const response = await api.get<{ stocks: ScreenerResult[] }>('/api/screen', {
    params: { filter, limit },
  });
  return response.data.stocks;
};

export const getMarketSentiment = async (): Promise<MarketSentiment> => {
  const response = await api.get<MarketSentiment>('/api/market-sentiment');
  return response.data;
};

export const getMarketSnapshot = async (): Promise<MarketSnapshot> => {
  try {
    // Fetch market sentiment
    const sentiment = await getMarketSentiment();

    // Fetch top picks (strong buys)
    const topPicks = await screenStocks('strong_buys', 5);

    // Get all stocks to find gainers and losers
    const allStocks = await screenStocks('all', 100);

    // Sort by price change percentage
    const sorted = [...allStocks].sort((a, b) => b.price_change_pct - a.price_change_pct);
    const gainers = sorted.slice(0, 5);
    const losers = sorted.slice(-5).reverse();

    // Mock index data (would need separate API endpoint)
    const indices: IndexData[] = [
      { symbol: 'SPY', name: 'S&P 500', price: 0, change_pct: 0 },
      { symbol: 'QQQ', name: 'NASDAQ', price: 0, change_pct: 0 },
      { symbol: 'DIA', name: 'Dow Jones', price: 0, change_pct: 0 },
    ];

    // Get actual prices for indices
    for (const index of indices) {
      const found = allStocks.find(s => s.ticker === index.symbol);
      if (found) {
        index.price = found.current_price;
        index.change_pct = found.price_change_pct;
      }
    }

    return {
      sentiment,
      top_picks: topPicks,
      gainers,
      losers,
      indices,
    };
  } catch (error) {
    console.error('[API] Failed to fetch market snapshot:', error);
    throw error;
  }
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch {
    return false;
  }
};

export default api;
