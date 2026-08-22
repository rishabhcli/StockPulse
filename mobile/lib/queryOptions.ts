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
  staleTime: 60_000,
});

export const marketSentimentQueryOptions = () => queryOptions({
  queryKey: queryKeys.marketSentiment,
  queryFn: getMarketSentiment,
  staleTime: 2 * 60_000,
});

export const screenerQueryOptions = (
  filter: ScreenerFilter = 'all',
  sort: ScreenerSort = 'score',
  search = '',
  limit = 100,
) => queryOptions({
  queryKey: queryKeys.screener(filter, limit),
  queryFn: () => screenStocks(filter, limit),
  select: (results) => applyScreenerTransforms(results, sort, search),
  staleTime: 5 * 60_000,
});

export const analysisQueryOptions = (ticker: string) => queryOptions({
  queryKey: queryKeys.analysis(ticker),
  queryFn: () => analyzeStock(ticker.trim().toUpperCase()),
  enabled: Boolean(ticker.trim()),
  staleTime: 10 * 60_000,
});

export const earningsCalendarQueryOptions = (limit = 50) => queryOptions({
  queryKey: queryKeys.earningsCalendar(limit),
  queryFn: () => getEarningsCalendar(limit),
  staleTime: 30 * 60_000,
});

export { applyScreenerTransforms };
export type { ScreenerFilter, ScreenerSort };
