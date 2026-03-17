import { applyScreenerTransforms } from '../lib/queryOptions';
import type { ScreenerResult } from '../lib/types';

const baseRow = (overrides: Partial<ScreenerResult>): ScreenerResult => ({
  ticker: 'AAA',
  company_name: 'Alpha',
  instrument_type: 'equity',
  score: 70,
  recommendation: 'BUY',
  confidence: 'HIGH',
  data_quality: {
    status: 'complete',
    core_inputs_complete: true,
    applicable_layers: [],
    available_layers: [],
    missing_optional_inputs: [],
  },
  current_price: 10,
  change_pct: 1,
  investment_score: 70,
  price_change_pct: 1,
  ...overrides,
});

describe('applyScreenerTransforms', () => {
  it('filters by search and sorts by selected mode', () => {
    const results = applyScreenerTransforms(
      [
        baseRow({ ticker: 'AAPL', company_name: 'Apple', investment_score: 90, price_change_pct: 0.5 }),
        baseRow({ ticker: 'MSFT', company_name: 'Microsoft', investment_score: 80, price_change_pct: 2.1 }),
        baseRow({ ticker: 'AMD', company_name: 'Advanced Micro Devices', investment_score: 75, price_change_pct: -1.2 }),
      ],
      'change',
      'm',
    );

    expect(results.map((row) => row.ticker)).toEqual(['MSFT', 'AMD']);
  });
});
