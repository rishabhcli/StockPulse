import { queryOptions } from '@tanstack/react-query';
import {
  analyzeStock,
  getEarningsCalendar,
  getMarketSentiment,
  getMarketSnapshot,
  screenStocks,
} from './api';
import { queryKeys } from './queryKeys';
import type { ScreenerResult } from './types';

type ScreenerSort = 'score' | 'change' | 'alpha';
type ScreenerFilter = 'all' | 'strong_buys' | 'buys' | 'holds' | 'sells' | 'strong_sells' | 'shorts';

const applyScreenerTransforms = (
  stocks: ScreenerResult[],
  sort: ScreenerSort,
  search: string,
): ScreenerResult[] => {
  const normalizedSearch = search.trim().toUpperCase();
  const filtered = normalizedSearch
    ? stocks.filter((item) => {
        const company = (item.company_name ?? '').toUpperCase();
        return item.ticker.toUpperCase().includes(normalizedSearch) || company.includes(normalizedSearch);
      })
    : stocks;

  return [...filtered].sort((a, b) => {
    switch (sort) {
      case 'change':
        return (b.price_change_pct ?? 0) - (a.price_change_pct ?? 0);
      case 'alpha':
        return a.ticker.localeCompare(b.ticker);
      case 'score':
      default:
        return (b.investment_score ?? b.score ?? 0) - (a.investment_score ?? a.score ?? 0);
    }
  });
};

export const snapshotQueryOptions = () => queryOptions({
  queryKey: queryKeys.snapshot,
  queryFn: getMarketSnapshot,
});

export const marketSentimentQueryOptions = () => queryOptions({
  queryKey: queryKeys.marketSentiment,
  queryFn: getMarketSentiment,
});

export const screenerQueryOptions = (
  filter: ScreenerFilter = 'all',
  sort: ScreenerSort = 'score',
  search = '',
  limit = 100,
) => queryOptions({
  queryKey: queryKeys.screener(filter, sort, search, limit),
  queryFn: async () => {
    const results = await screenStocks(filter, limit);
    return applyScreenerTransforms(results, sort, search);
  },
});

export const analysisQueryOptions = (ticker: string) => queryOptions({
  queryKey: queryKeys.analysis(ticker),
  queryFn: () => analyzeStock(ticker),
  enabled: Boolean(ticker.trim()),
});

export const earningsCalendarQueryOptions = (limit = 50) => queryOptions({
  queryKey: queryKeys.earningsCalendar(limit),
  queryFn: () => getEarningsCalendar(limit),
});

export { applyScreenerTransforms };
export type { ScreenerFilter, ScreenerSort };
