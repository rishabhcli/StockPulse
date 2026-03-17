import React from 'react';
import { render } from '@testing-library/react-native';
import SentimentHeader from '../components/market/SentimentHeader';

describe('SentimentHeader', () => {
  it('renders regime-driven market context and risk proxies', () => {
    const { getByText, getAllByText } = render(
      <SentimentHeader
        sentiment={{
          signal: 'RISK_ON',
          vix: 17.4,
          vix_signal: 'RISK_ON',
          fear_greed_index: 63,
          fear_greed_label: 'RISK_ON',
          treasury_10y: 4.23,
          sp500_trend: 'UPTREND',
          overall_sentiment: 'bullish',
          regime: 'RISK_ON',
          regime_status: 'confirmed',
          regime_confidence: 0.82,
          description: 'Breadth and cross-asset participation support risk appetite.',
          breadth: 68.4,
          risk_proxies: {
            credit_spreads: -0.22,
            high_beta: 1.14,
          },
          yield_curve: null,
          fed_stance: 'restrictive',
          sources: null,
          generated_at: new Date().toISOString(),
          request_id: 'req-123',
        }}
      />
    );

    getByText('Market Regime');
    expect(getAllByText('RISK_ON').length).toBeTruthy();
    getByText('Breadth and cross-asset participation support risk appetite.');
    getByText('credit spreads');
    getByText('high beta');
  });
});
