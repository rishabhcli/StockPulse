import axios, { AxiosError } from 'axios';
import { StockAnalysis, ScreenerResult, MarketSentiment, MarketSnapshot, IndexData, PennyStock, PennyStockData } from './types';
import { API_URL } from './config';
import { supabase, isSupabaseEnabled } from './supabase';

// Use configured API URL
const API_BASE_URL = API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
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

// Build a signal description from a raw indicator value
function describeIndicator(name: string, value: number): { signal: 'bullish' | 'bearish' | 'neutral'; description: string } {
  switch (name) {
    case 'rsi':
      if (value > 70) return { signal: 'bearish', description: `Overbought at ${value.toFixed(1)}` };
      if (value < 30) return { signal: 'bullish', description: `Oversold at ${value.toFixed(1)}` };
      return { signal: 'neutral', description: `Neutral at ${value.toFixed(1)}` };
    case 'mfi':
      if (value > 80) return { signal: 'bearish', description: `Overbought at ${value.toFixed(1)}` };
      if (value < 20) return { signal: 'bullish', description: `Oversold at ${value.toFixed(1)}` };
      return { signal: 'neutral', description: `Neutral at ${value.toFixed(1)}` };
    case 'adx':
      if (value > 25) return { signal: 'bullish', description: `Strong trend (${value.toFixed(1)})` };
      return { signal: 'neutral', description: `Weak trend (${value.toFixed(1)})` };
    case 'cci':
      if (value > 100) return { signal: 'bearish', description: `Overbought at ${value.toFixed(1)}` };
      if (value < -100) return { signal: 'bullish', description: `Oversold at ${value.toFixed(1)}` };
      return { signal: 'neutral', description: `Neutral at ${value.toFixed(1)}` };
    default:
      return { signal: 'neutral', description: `${value.toFixed(2)}` };
  }
}

// Transform flat indicators dict to the nested TechnicalAnalysis shape
function buildTechnicalAnalysis(raw: any): any {
  if (!raw || typeof raw !== 'object') return null;

  // If already in nested format, return as-is
  if (raw.rsi && typeof raw.rsi === 'object' && 'value' in raw.rsi) return raw;

  const rsiVal = raw.RSI ?? raw.rsi;
  const adxVal = raw.ADX ?? raw.adx;
  const mfiVal = raw.MFI ?? raw.mfi;
  const cciVal = raw.CCI ?? raw.cci;
  const macdVal = raw.MACD ?? raw.macd;
  const macdSig = raw.MACD_Signal ?? raw.macd_signal;
  const macdHist = raw.MACD_Histogram ?? raw.macd_histogram;
  const stochK = raw.Stochastic_K ?? raw.stochastic_k;
  const stochD = raw.Stochastic_D ?? raw.stochastic_d;

  return {
    rsi: rsiVal != null ? { value: rsiVal, ...describeIndicator('rsi', rsiVal) } : null,
    macd: macdVal != null ? {
      macd: macdVal,
      signal: macdSig ?? 0,
      histogram: macdHist ?? 0,
      trend: (macdHist ?? 0) > 0 ? 'bullish' : (macdHist ?? 0) < 0 ? 'bearish' : 'neutral',
    } : null,
    stochastic: stochK != null ? {
      k: stochK,
      d: stochD ?? 0,
      signal: stochK > 80 ? 'bearish' : stochK < 20 ? 'bullish' : 'neutral',
    } : null,
    adx: adxVal != null ? { value: adxVal, ...describeIndicator('adx', adxVal) } : null,
    mfi: mfiVal != null ? { value: mfiVal, ...describeIndicator('mfi', mfiVal) } : null,
    cci: cciVal != null ? { value: cciVal, ...describeIndicator('cci', cciVal) } : null,
  };
}

export const analyzeStock = async (ticker: string): Promise<StockAnalysis> => {
  const response = await api.post('/api/analyze', { ticker: ticker.toUpperCase() });
  const data = response.data;

  // Normalize API field names to match app types
  const ms = data.market_sentiment ?? {};
  const fgi = ms.fear_greed_index ?? 50;
  const vix = ms.vix ?? 0;
  let overall = 'Neutral';
  if (fgi >= 55) overall = 'Bullish';
  else if (fgi <= 45 || vix > 30) overall = 'Bearish';

  return {
    ...data,
    investment_score: data.investment_score ?? data.score ?? 0,
    price_change: data.price_change ?? data.dollar_change ?? 0,
    price_change_pct: data.price_change_pct ?? data.change_pct ?? 0,
    fundamental_analysis: data.fundamental_analysis ?? data.fundamentals ?? null,
    technical_analysis: buildTechnicalAnalysis(data.technical_analysis ?? data.indicators),
    recommendation_reasons: (data.recommendation_reasons ?? data.evidence ?? data.signals ?? [])
      .map((r: any) => typeof r === 'string' ? r : (r.detail || r.factor || JSON.stringify(r))),
    technical_score: data.technical_score ?? 0,
    fundamental_score: data.fundamental_score ?? 0,
    market_sentiment: {
      ...ms,
      vix_signal: ms.vix_signal ?? 'N/A',
      fear_greed_label: ms.fear_greed_label ?? ms.fear_greed_signal ?? 'N/A',
      treasury_10y: ms.treasury_10y ?? 0,
      sp500_trend: ms.sp500_trend ?? 'N/A',
      overall_sentiment: ms.overall_sentiment ?? overall,
    },
  };
};

export const screenStocks = async (
  filter: 'all' | 'strong_buys' | 'buys' | 'sells' | 'strong_sells' | 'shorts' = 'all',
  limit: number = 20
): Promise<ScreenerResult[]> => {
  const response = await api.get<{ stocks: any[] }>('/api/screen', {
    params: { filter, limit },
  });
  // Normalize API field names to match app types
  return (response.data.stocks ?? []).map((s: any) => ({
    ...s,
    investment_score: s.investment_score ?? s.score ?? 0,
    price_change_pct: s.price_change_pct ?? s.change_pct ?? 0,
  }));
};

export const getMarketSentiment = async (): Promise<MarketSentiment> => {
  const response = await api.get('/api/market-sentiment');
  const data = response.data;

  // Normalize API response to match MarketSentiment type.
  // The backend returns fear_greed_signal but the app expects fear_greed_label,
  // and doesn't include overall_sentiment or sp500_trend.
  const vix = data.vix ?? 0;
  const fearGreedIndex = data.fear_greed_index ?? 50;

  // Derive overall sentiment from VIX + Fear & Greed
  let overall = 'Neutral';
  if (fearGreedIndex >= 70 && vix < 20) overall = 'Bullish';
  else if (fearGreedIndex >= 55) overall = 'Bullish';
  else if (fearGreedIndex <= 30 || vix > 30) overall = 'Bearish';
  else if (fearGreedIndex <= 45) overall = 'Bearish';

  return {
    vix,
    vix_signal: data.vix_signal ?? 'N/A',
    fear_greed_index: fearGreedIndex,
    fear_greed_label: data.fear_greed_signal ?? data.fear_greed_label ?? 'N/A',
    treasury_10y: data.treasury_10y ?? 0,
    sp500_trend: data.sp500_trend ?? 'N/A',
    overall_sentiment: data.overall_sentiment ?? overall,
  };
};

export const getPennyStocks = async (): Promise<PennyStock[]> => {
  try {
    const response = await api.get<PennyStockData>('/api/penny-stocks');
    return response.data.stocks ?? [];
  } catch {
    return [];
  }
};

export const getMarketSnapshot = async (): Promise<MarketSnapshot> => {
  try {
    // Fetch sentiment, all stocks, and penny stocks in parallel
    const [sentiment, allStocks, pennyStocks] = await Promise.all([
      getMarketSentiment(),
      screenStocks('all', 100),
      getPennyStocks(),
    ]);

    // Derive top picks from the full list (score >= 75)
    const topPicks = allStocks
      .filter(s => s.investment_score >= 75)
      .sort((a, b) => b.investment_score - a.investment_score)
      .slice(0, 5);

    // Sort by price change percentage for gainers/losers
    const sorted = [...allStocks].sort((a, b) => b.price_change_pct - a.price_change_pct);
    const gainers = sorted.slice(0, 5);
    const losers = sorted.slice(-5).reverse();

    // Bottom-rated stocks (shorts)
    const shorts = [...allStocks]
      .sort((a, b) => a.investment_score - b.investment_score)
      .slice(0, 5);

    // Extract index data from the screened stocks
    const indices: IndexData[] = [
      { symbol: 'SPY', name: 'S&P 500', price: 0, change_pct: 0 },
      { symbol: 'QQQ', name: 'NASDAQ', price: 0, change_pct: 0 },
      { symbol: 'DIA', name: 'Dow Jones', price: 0, change_pct: 0 },
    ];
    for (const index of indices) {
      const found = allStocks.find(s => s.ticker === index.symbol);
      if (found) {
        index.price = found.current_price;
        index.change_pct = found.price_change_pct;
      }
    }

    return { sentiment, top_picks: topPicks, gainers, losers, shorts, indices, penny_stocks: pennyStocks };
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
