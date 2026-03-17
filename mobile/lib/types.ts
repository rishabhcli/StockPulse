export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface IndicatorData {
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

export interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface StochasticData {
  k: number;
  d: number;
  signal: 'bullish' | 'bearish' | 'neutral';
}

export interface TechnicalAnalysis {
  rsi?: IndicatorData | null;
  macd?: MACDData | null;
  stochastic?: StochasticData | null;
  adx?: IndicatorData | null;
  mfi?: IndicatorData | null;
  cci?: IndicatorData | null;
}

export interface DataQualitySummary {
  status: 'complete' | 'partial' | 'unavailable';
  core_inputs_complete: boolean;
  applicable_layers: string[];
  available_layers: string[];
  missing_optional_inputs: string[];
  freshness_summary?: string | null;
}

export interface DisplayIndicators {
  current_price: number | null;
  price_change: number | null;
  price_change_pct: number | null;
  rsi?: number | null;
  sma_20?: number | null;
  sma_50?: number | null;
  sma_200?: number | null;
  trend_alignment?: string | null;
  vix?: number | null;
  relative_strength?: Record<string, any> | null;
}

export interface FundamentalAnalysis {
  status: string;
  reason?: string;
  market_cap?: number | null;
  trailing_pe?: number | null;
  forward_pe?: number | null;
  peg_ratio?: number | null;
  price_to_book?: number | null;
  debt_to_equity?: number | null;
  profit_margin?: number | null;
  return_on_equity?: number | null;
  revenue_growth?: number | null;
  valuation_signal?: string | null;
  margin_of_safety?: number | null;
  fair_value_range?: Record<string, number> | null;
  quality_gate?: Record<string, any> | null;
  pe_ratio?: number | null;
  roe?: number | null;
  dividend_yield?: number | null;
}

export interface MarketSentiment {
  signal?: string | null;
  vix: number | null;
  vix_signal: string;
  fear_greed_index: number;
  fear_greed_label: string;
  treasury_10y: number | null;
  sp500_trend: string;
  overall_sentiment: string;
  regime?: string | null;
  regime_status?: string | null;
  regime_confidence?: number | null;
  description?: string | null;
  breadth?: number | null;
  risk_proxies?: Record<string, number> | null;
  yield_curve?: Record<string, any> | null;
  fed_stance?: string | null;
  sources?: Record<string, any> | null;
  generated_at?: string;
  request_id?: string | null;
}

export interface NewsArticle {
  title: string;
  source: string;
  sentiment: string;
  published: string;
  content_quality?: string;
  url?: string | null;
}

export interface NewsAnalysis {
  status?: string;
  data_quality?: string;
  overall_sentiment: string;
  sentiment_score: number;
  risk_factor?: number;
  articles: NewsArticle[];
  catalysts?: Record<string, any>[];
  nearest_catalyst?: Record<string, any> | null;
  days_to_nearest?: number | null;
  reason?: string | null;
}

export interface EarningsHistoryItem {
  date: string;
  actual: number;
  expected: number;
  surprise_pct: number;
}

export interface EarningsData {
  status: string;
  source?: string;
  last_earnings_date: string | null;
  last_earnings_surprise: number | null;
  next_earnings_date: string | null;
  days_until?: number | null;
  earnings_history: EarningsHistoryItem[];
  analyst_price_targets?: Record<string, number>;
  error?: string | null;
}

export interface LayerAnalysis {
  quality_gate?: Record<string, any>;
  intrinsic_value?: Record<string, any>;
  market_regime?: Record<string, any>;
  technical_confluence?: Record<string, any>;
  catalyst?: Record<string, any>;
}

export interface StockAnalysis {
  ticker: string;
  company_name: string;
  sector?: string | null;
  industry?: string | null;
  instrument_type: string;
  scoring_version: 'v3';
  calibration_version?: string;
  score: number;
  recommendation: string;
  action: string;
  confidence: ConfidenceLevel;
  agreement_level?: number;
  explanation: string;
  layer_analysis: LayerAnalysis;
  data_quality: DataQualitySummary;
  sources_used: Record<string, any>;
  missing_inputs: string[];
  stale_inputs: string[];
  display_indicators: DisplayIndicators;
  fundamentals: FundamentalAnalysis;
  market_context: Record<string, any>;
  news_analysis: NewsAnalysis;
  earnings: EarningsData;
  current_price: number;
  change_pct: number;
  dollar_change: number;
  generated_at: string;
  request_id?: string | null;
  freshness_summary?: string | null;
  status?: 'available' | 'unavailable';
  code?: string | null;
  reason?: string | null;

  // Compatibility fields still used by current UI
  investment_score: number;
  price_change: number;
  price_change_pct: number;
  recommendation_reasons: string[];
  technical_score: number;
  fundamental_score: number;
  technical_analysis: TechnicalAnalysis | null;
  fundamental_analysis: FundamentalAnalysis | null;
  market_sentiment: MarketSentiment;
  timestamp: string;
}

export interface ScreenerResult {
  ticker: string;
  company_name: string;
  sector?: string | null;
  industry?: string | null;
  instrument_type?: string | null;
  score: number;
  recommendation: string;
  confidence: ConfidenceLevel;
  data_quality: DataQualitySummary;
  current_price: number;
  change_pct: number;
  display_indicators?: DisplayIndicators;

  // Compatibility fields still used by current UI
  investment_score: number;
  price_change_pct: number;
  generated_at?: string;
  request_id?: string | null;
  freshness_summary?: string | null;
}

export interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
}

export interface PennyStock {
  ticker: string;
  company_name: string;
  sector: string;
  description: string;
  price: number;
  current_price: number;
  change_pct: number;
  score: number;
  rsi: number;
  volatility: number;
  recommendation: string;
}

export interface PennyStockData {
  buy: PennyStock[];
  hold: PennyStock[];
  sell: PennyStock[];
  short: PennyStock[];
  stocks: PennyStock[];
  count: number;
}

export interface MarketSnapshot {
  sentiment: MarketSentiment;
  top_picks: ScreenerResult[];
  gainers: ScreenerResult[];
  losers: ScreenerResult[];
  shorts: ScreenerResult[];
  indices: IndexData[];
  penny_stocks: PennyStock[];
  eligible_count?: number;
  excluded_count?: number;
  excluded_reasons_summary?: Record<string, number>;
  generated_at?: string;
  request_id?: string | null;
  freshness_summary?: string | null;
}

export interface EarningsCalendarItem {
  ticker: string;
  company_name: string;
  sector?: string | null;
  industry?: string | null;
  current_price: number | null;
  earnings_date: string;
  days_until: number;
  earnings_history: EarningsHistoryItem[];
  prev_surprise_pct: number | null;
  analyst_price_targets?: Record<string, number>;
  status: string;
  score?: number | null;
  recommendation?: string | null;
  confidence?: ConfidenceLevel | null;
  data_quality?: DataQualitySummary | null;
  generated_at?: string;
  request_id?: string | null;
  freshness_summary?: string | null;
}

// ========== Supabase Types ==========

export interface Profile {
  id: string;
  username: string | null;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  items: WatchlistItem[];
  created_at: string;
  updated_at: string;
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  ticker: string;
  notes: string | null;
  added_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  initial_capital: number;
  current_cash: number;
  spy_start_price: number | null;
  created_at: string;
  reset_at: string;
}

export interface PortfolioPosition {
  id: string;
  portfolio_id: string;
  ticker: string;
  side: 'long' | 'short';
  quantity: number;
  avg_entry_price: number;
  entry_date: string;
  human_controlled: boolean;
}

export interface Trade {
  id: string;
  portfolio_id: string;
  ticker: string;
  trade_type: 'buy' | 'sell' | 'short' | 'cover';
  side: 'long' | 'short';
  quantity: number;
  price: number;
  value: number;
  reasoning: string;
  status: 'executed' | 'rejected' | 'pending';
  error: string | null;
  is_manual: boolean;
  cash_after: number | null;
  executed_at: string;
}
