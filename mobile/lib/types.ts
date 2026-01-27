export interface StockAnalysis {
  ticker: string;
  company_name: string;
  investment_score: number;
  current_price: number;
  price_change: number;
  price_change_pct: number;
  recommendation: string;
  recommendation_reasons: string[];
  technical_score: number;
  fundamental_score: number;
  technical_analysis: TechnicalAnalysis;
  fundamental_analysis: FundamentalAnalysis;
  market_sentiment: MarketSentiment;
  news_analysis: NewsAnalysis;
  earnings_data: EarningsData;
  timestamp: string;
}

export interface TechnicalAnalysis {
  rsi: IndicatorData;
  macd: MACDData;
  bollinger: BollingerData;
  stochastic: StochasticData;
  adx: IndicatorData;
  mfi: IndicatorData;
  obv: OBVData;
  williams_r: IndicatorData;
  cci: IndicatorData;
  vwap: VWAPData;
  moving_averages: MovingAveragesData;
  support_levels: number[];
  resistance_levels: number[];
  patterns: string[];
}

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

export interface BollingerData {
  upper: number;
  middle: number;
  lower: number;
  position: string;
}

export interface StochasticData {
  k: number;
  d: number;
  signal: 'bullish' | 'bearish' | 'neutral';
}

export interface OBVData {
  value: number;
  trend: string;
}

export interface VWAPData {
  value: number;
  position: string;
}

export interface MovingAveragesData {
  sma_20: number;
  sma_50: number;
  sma_200: number;
  trend: string;
}

export interface FundamentalAnalysis {
  pe_ratio: number | null;
  forward_pe: number | null;
  peg_ratio: number | null;
  price_to_book: number | null;
  debt_to_equity: number | null;
  profit_margin: number | null;
  roe: number | null;
  revenue_growth: number | null;
  earnings_growth: number | null;
  dividend_yield: number | null;
  analyst_rating: string;
  price_target: number | null;
}

export interface MarketSentiment {
  vix: number;
  vix_signal: string;
  fear_greed_index: number;
  fear_greed_label: string;
  treasury_10y: number;
  sp500_trend: string;
  overall_sentiment: string;
}

export interface NewsAnalysis {
  articles: NewsArticle[];
  overall_sentiment: string;
  sentiment_score: number;
}

export interface NewsArticle {
  title: string;
  source: string;
  sentiment: string;
  published: string;
}

export interface EarningsData {
  last_earnings_date: string;
  last_earnings_surprise: number;
  next_earnings_date: string;
  earnings_history: EarningsHistoryItem[];
}

export interface EarningsHistoryItem {
  date: string;
  actual: number;
  expected: number;
  surprise_pct: number;
}

export interface ScreenerResult {
  ticker: string;
  company_name: string;
  investment_score: number;
  current_price: number;
  price_change_pct: number;
  recommendation: string;
  sector?: string;
}

export interface MarketSnapshot {
  sentiment: MarketSentiment;
  top_picks: ScreenerResult[];
  gainers: ScreenerResult[];
  losers: ScreenerResult[];
  indices: IndexData[];
}

export interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
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

export interface PortfolioSnapshot {
  id: string;
  portfolio_id: string;
  total_value: number;
  cash: number;
  positions_value: number;
  spy_price: number | null;
  timestamp: string;
}
