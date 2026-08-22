import axios, { AxiosError } from 'axios';
import {
  EarningsCalendarItem,
  IndexData,
  MarketSentiment,
  MarketSnapshot,
  PennyStock,
  PennyStockData,
  ScreenerResult,
  StockAnalysis,
} from './types';
import { API_URL } from './config';
import { getAccessToken, isSupabaseEnabled } from './supabase';

const API_BASE_URL = API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class ApiRequestError extends Error {
  status: number | null;
  code: string | null;
  payload: any;

  constructor(message: string, options?: { status?: number | null; code?: string | null; payload?: any }) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = options?.status ?? null;
    this.code = options?.code ?? null;
    this.payload = options?.payload ?? null;
  }
}

api.interceptors.request.use(
  async (config) => {
    if (__DEV__) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url?.split('?')[0]}`);
    }

    if (isSupabaseEnabled) {
      try {
        const accessToken = await getAccessToken();
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
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

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    if (__DEV__) {
      if (error.response) {
        console.error(`[API] Error ${error.response.status}`);
      } else {
        console.error('[API] Error:', error.message);
      }
    }

    const apiReason = error.response?.data?.reason || error.response?.data?.error;
    if (apiReason) {
      return Promise.reject(new ApiRequestError(String(apiReason), {
        status: error.response?.status ?? null,
        code: error.response?.data?.code ?? null,
        payload: error.response?.data ?? null,
      }));
    }
    return Promise.reject(error);
  }
);

function describeIndicator(name: string, value: number): { signal: 'bullish' | 'bearish' | 'neutral'; description: string } {
  switch (name) {
    case 'rsi':
      if (value > 70) return { signal: 'bearish', description: `Overbought at ${value.toFixed(1)}` };
      if (value < 30) return { signal: 'bullish', description: `Oversold at ${value.toFixed(1)}` };
      return { signal: 'neutral', description: `Neutral at ${value.toFixed(1)}` };
    case 'adx':
      if (value > 25) return { signal: 'bullish', description: `Strong trend (${value.toFixed(1)})` };
      return { signal: 'neutral', description: `Weak trend (${value.toFixed(1)})` };
    default:
      return { signal: 'neutral', description: `${value.toFixed(2)}` };
  }
}

function buildTechnicalAnalysis(raw: any): any {
  if (!raw || typeof raw !== 'object') return null;

  const indicators = raw.indicators ?? {};
  const rsiVal = indicators.RSI ?? indicators.rsi;
  const adxVal = indicators.ADX ?? indicators.adx;
  const mfiVal = indicators.MFI ?? indicators.mfi;
  const cciVal = indicators.CCI ?? indicators.cci;
  const macdVal = indicators.MACD ?? indicators.macd;
  const macdSig = indicators.MACD_Signal ?? indicators.macd_signal;
  const macdHist = indicators.MACD_Histogram ?? indicators.MACD_Hist ?? indicators.macd_histogram;
  const stochK = indicators.Stochastic_K ?? indicators.stochastic_k;
  const stochD = indicators.Stochastic_D ?? indicators.stochastic_d;

  return {
    rsi: typeof rsiVal === 'number' ? { value: rsiVal, ...describeIndicator('rsi', rsiVal) } : null,
    macd: typeof macdVal === 'number' ? {
      macd: macdVal,
      signal: macdSig ?? 0,
      histogram: macdHist ?? 0,
      trend: (macdHist ?? 0) > 0 ? 'bullish' : (macdHist ?? 0) < 0 ? 'bearish' : 'neutral',
    } : null,
    stochastic: typeof stochK === 'number' ? {
      k: stochK,
      d: stochD ?? 0,
      signal: stochK > 80 ? 'bearish' : stochK < 20 ? 'bullish' : 'neutral',
    } : null,
    adx: typeof adxVal === 'number' ? { value: adxVal, ...describeIndicator('adx', adxVal) } : null,
    mfi: typeof mfiVal === 'number' ? { value: mfiVal, ...describeIndicator('mfi', mfiVal) } : null,
    cci: typeof cciVal === 'number' ? { value: cciVal, ...describeIndicator('cci', cciVal) } : null,
  };
}

function toMarketSentiment(data: any): MarketSentiment {
  const vix = typeof data?.vix === 'number' ? data.vix : null;
  const sentimentSignal = data?.signal ?? data?.regime ?? 'NEUTRAL';
  const breadth = typeof data?.breadth === 'number' ? data.breadth : null;
  const riskProxies = data?.risk_proxies && typeof data.risk_proxies === 'object' ? data.risk_proxies : null;

  const vixScore = typeof vix === 'number'
    ? Math.max(0, Math.min(100, 100 - ((vix - 12) * 4)))
    : null;
  const breadthScore = typeof breadth === 'number'
    ? Math.max(0, Math.min(100, breadth))
    : null;
  const proxyValues = riskProxies ? Object.values(riskProxies).filter((value): value is number => typeof value === 'number') : [];
  const proxyScore = proxyValues.length
    ? Math.max(0, Math.min(100, 50 + ((proxyValues.reduce((sum, value) => sum + value, 0) / proxyValues.length) * 12)))
    : null;

  const compositeInputs = [vixScore, breadthScore, proxyScore].filter((value): value is number => typeof value === 'number');
  const riskScale = compositeInputs.length
    ? Math.round(compositeInputs.reduce((sum, value) => sum + value, 0) / compositeInputs.length)
    : sentimentSignal === 'RISK_ON'
      ? 65
      : sentimentSignal === 'RISK_OFF'
        ? 35
        : 50;

  return {
    signal: data?.signal ?? null,
    vix,
    vix_signal: sentimentSignal,
    fear_greed_index: riskScale,
    fear_greed_label: sentimentSignal,
    treasury_10y: data?.yield_curve?.ten_year ?? null,
    sp500_trend: typeof data?.spy_change_1m === 'number'
      ? (data.spy_change_1m >= 0 ? 'UPTREND' : 'DOWNTREND')
      : 'UNKNOWN',
    overall_sentiment: sentimentSignal,
    regime: data?.regime ?? null,
    regime_status: data?.regime_status ?? null,
    regime_confidence: typeof data?.regime_confidence === 'number' ? data.regime_confidence : null,
    description: data?.description ?? null,
    breadth,
    risk_proxies: riskProxies,
    yield_curve: data?.yield_curve ?? null,
    fed_stance: data?.fed_stance ?? null,
    sources: data?.sources ?? null,
    generated_at: data?.generated_at ?? data?.timestamp ?? undefined,
    request_id: data?.request_id ?? null,
  };
}

function normalizeAnalysis(data: any): StockAnalysis {
  const technicalLayer = data.layer_analysis?.technical_confluence ?? {};
  const intrinsicLayer = data.layer_analysis?.intrinsic_value ?? {};
  const displayIndicators = data.display_indicators ?? {};
  const marketSentiment = toMarketSentiment({
    vix: data.market_context?.vix_level,
    signal: data.market_context?.regime,
    spy_change_1m: data.market_context?.indexes?.spy?.change_1m,
    yield_curve: data.market_context?.economic_context?.yield_curve,
    fed_stance: data.market_context?.fed_stance,
    sources: data.market_context?.sources,
  });

  const investmentScore = data.score ?? 0;
  const currentPrice = data.current_price ?? displayIndicators.current_price ?? 0;
  const priceChange = data.dollar_change ?? displayIndicators.price_change ?? 0;
  const priceChangePct = data.change_pct ?? displayIndicators.price_change_pct ?? 0;

  return {
    ...data,
    data_quality: {
      ...data.data_quality,
      freshness_summary: data.data_quality?.freshness_summary ?? data.freshness_summary ?? null,
    },
    company_name: data.company_name ?? data.ticker,
    current_price: currentPrice,
    change_pct: priceChangePct,
    dollar_change: priceChange,
    display_indicators: displayIndicators,
    fundamentals: {
      ...data.fundamentals,
      pe_ratio: data.fundamentals?.pe_ratio ?? data.fundamentals?.trailing_pe ?? null,
      roe: data.fundamentals?.roe ?? data.fundamentals?.return_on_equity ?? null,
    },
    news_analysis: {
      ...data.news_analysis,
      overall_sentiment: data.news_analysis?.sentiment ?? 'NEUTRAL',
      sentiment_score: data.news_analysis?.news_sentiment_score ?? 0,
      articles: (data.news_analysis?.articles ?? []).map((article: any) => ({
        ...article,
        published: article.published ?? '',
      })),
    },
    earnings: {
      ...data.earnings,
      last_earnings_date: data.earnings?.earnings_history?.[0]?.date ?? null,
      last_earnings_surprise: data.earnings?.earnings_history?.[0]?.surprise ?? data.earnings?.earnings_surprise_avg ?? null,
      next_earnings_date: data.earnings?.earnings_date ?? null,
      earnings_history: (data.earnings?.earnings_history ?? []).map((item: any) => ({
        date: item.date,
        actual: item.actual ?? 0,
        expected: item.estimate ?? item.expected ?? 0,
        surprise_pct: item.surprise ?? item.surprise_pct ?? 0,
      })),
    },
    investment_score: investmentScore,
    price_change: priceChange,
    price_change_pct: priceChangePct,
    recommendation_reasons: [data.explanation].filter(Boolean),
    technical_score: technicalLayer.confluence_score ?? 0,
    fundamental_score: typeof intrinsicLayer.conviction === 'number' ? Math.round(intrinsicLayer.conviction * 100) : 0,
    technical_analysis: buildTechnicalAnalysis(technicalLayer),
    fundamental_analysis: data.fundamentals ?? null,
    market_sentiment: marketSentiment,
    timestamp: data.generated_at,
  };
}

function normalizeScreenerResult(data: any): ScreenerResult {
  return {
    ...data,
    investment_score: data.investment_score ?? data.score ?? 0,
    price_change_pct: data.price_change_pct ?? data.change_pct ?? 0,
    generated_at: data.generated_at ?? undefined,
    request_id: data.request_id ?? null,
    freshness_summary: data.freshness_summary ?? data.data_quality?.freshness_summary ?? null,
  };
}

export const analyzeStock = async (ticker: string): Promise<StockAnalysis> => {
  const response = await api.post('/api/analyze', { ticker: ticker.trim().toUpperCase(), scoring: 'v3' });
  return normalizeAnalysis(response.data);
};

export const screenStocks = async (
  filter: 'all' | 'strong_buys' | 'buys' | 'holds' | 'sells' | 'strong_sells' | 'shorts' = 'all',
  limit: number = 20
): Promise<ScreenerResult[]> => {
  const response = await api.get<{ stocks: any[] }>('/api/screen', {
    params: { filter, limit },
  });
  return (response.data.stocks ?? []).map(normalizeScreenerResult);
};

export const getMarketSentiment = async (): Promise<MarketSentiment> => {
  const response = await api.get('/api/market-sentiment');
  return toMarketSentiment(response.data);
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
  // The penny-stock panel is a separate endpoint, so start both requests at
  // once instead of extending the critical path after the snapshot resolves.
  const [response, pennyStocks] = await Promise.all([
    api.get('/api/snapshot'),
    getPennyStocks(),
  ]);
  const data = response.data;

  return {
    sentiment: toMarketSentiment(data.market_sentiment),
    top_picks: (data.strong_buys ?? []).map(normalizeScreenerResult),
    gainers: (data.gainers ?? []).map(normalizeScreenerResult),
    losers: (data.losers ?? []).map(normalizeScreenerResult),
    shorts: (data.shorts ?? []).map(normalizeScreenerResult),
    indices: (data.market_indexes ?? []).map((index: any): IndexData => ({
      symbol: index.symbol,
      name: index.name,
      price: index.price ?? 0,
      change_pct: index.change_pct ?? 0,
    })),
    penny_stocks: pennyStocks,
    eligible_count: data.eligible_count,
    excluded_count: data.excluded_count,
    excluded_reasons_summary: data.excluded_reasons_summary,
    generated_at: data.generated_at ?? data.timestamp,
    request_id: data.request_id ?? null,
    freshness_summary: data.freshness_summary ?? null,
  };
};

export const getEarningsCalendar = async (limit: number = 50): Promise<EarningsCalendarItem[]> => {
  const response = await api.get('/api/earnings-calendar', { params: { limit } });
  return response.data.earnings ?? [];
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
