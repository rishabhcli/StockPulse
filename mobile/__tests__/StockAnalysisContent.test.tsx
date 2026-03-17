import React from 'react';
import { render } from '@testing-library/react-native';
import StockAnalysisContent from '../components/stocks/StockAnalysisContent';
import type { StockAnalysis } from '../lib/types';

jest.mock('../components/charts/ScoreCircle', () => 'ScoreCircle');
jest.mock('../components/stocks/IndicatorCard', () => ({
  IndicatorGrid: 'IndicatorGrid',
}));
jest.mock('../components/stocks/PriceDisplay', () => 'PriceDisplay');
jest.mock('../components/market/NewsItem', () => ({
  NewsList: 'NewsList',
}));

describe('StockAnalysisContent', () => {
  it('renders the production evidence sections from the canonical contract', () => {
    const analysis: StockAnalysis = {
      ticker: 'AAPL',
      company_name: 'Apple Inc.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      instrument_type: 'equity',
      scoring_version: 'v3',
      calibration_version: '2026-03',
      score: 78,
      recommendation: 'BUY',
      action: 'BUY',
      confidence: 'HIGH',
      explanation: 'Technical momentum and regime support remain aligned.',
      layer_analysis: {
        technical_confluence: { confluence_score: 72 },
        intrinsic_value: { conviction: 0.68 },
        market_regime: { regime: 'RISK_ON' },
      },
      data_quality: {
        status: 'partial',
        core_inputs_complete: true,
        applicable_layers: ['technical_confluence', 'market_regime', 'intrinsic_value'],
        available_layers: ['technical_confluence', 'market_regime'],
        missing_optional_inputs: ['short_interest'],
        freshness_summary: 'partial or stale inputs present',
      },
      sources_used: {
        market_data: {
          quote: { available: true },
          history: { available: true },
        },
      },
      missing_inputs: [],
      stale_inputs: ['macro'],
      display_indicators: {
        current_price: 211.2,
        price_change: 2.1,
        price_change_pct: 1.0,
        rsi: 62,
      },
      fundamentals: {
        status: 'available',
        trailing_pe: 28,
        forward_pe: 25,
        revenue_growth: 0.11,
      },
      market_context: {
        regime: 'RISK_ON',
      },
      news_analysis: {
        overall_sentiment: 'POSITIVE',
        sentiment_score: 0.61,
        risk_factor: 0.4,
        articles: [],
        catalysts: [],
        nearest_catalyst: null,
        days_to_nearest: null,
      },
      earnings: {
        status: 'available',
        last_earnings_date: '2026-01-28',
        last_earnings_surprise: 4.2,
        next_earnings_date: '2026-04-28',
        days_until: 12,
        earnings_history: [],
      },
      current_price: 211.2,
      change_pct: 1.0,
      dollar_change: 2.1,
      generated_at: new Date().toISOString(),
      request_id: 'req-456',
      freshness_summary: 'partial or stale inputs present',
      investment_score: 78,
      price_change: 2.1,
      price_change_pct: 1.0,
      recommendation_reasons: ['Technical momentum and regime support remain aligned.'],
      technical_score: 72,
      fundamental_score: 68,
      technical_analysis: {
        rsi: {
          value: 62,
          signal: 'bullish',
          description: 'Constructive momentum',
        },
      },
      fundamental_analysis: {
        status: 'available',
        trailing_pe: 28,
        forward_pe: 25,
        revenue_growth: 0.11,
      },
      market_sentiment: {
        signal: 'RISK_ON',
        vix: 18,
        vix_signal: 'RISK_ON',
        fear_greed_index: 60,
        fear_greed_label: 'RISK_ON',
        treasury_10y: 4.2,
        sp500_trend: 'UPTREND',
        overall_sentiment: 'bullish',
        regime: 'RISK_ON',
        regime_status: 'confirmed',
        regime_confidence: 0.8,
        description: 'Supportive regime.',
        breadth: 67,
        risk_proxies: null,
        yield_curve: null,
        fed_stance: 'restrictive',
        sources: null,
        generated_at: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    const { getByText } = render(<StockAnalysisContent analysis={analysis} />);

    getByText('Confidence & Data Quality');
    getByText('Why It Qualifies');
    getByText('What Could Break It');
    getByText('Technical');
    getByText('Market Regime');
    getByText('Earnings');
    getByText('Sources');
  });
});
