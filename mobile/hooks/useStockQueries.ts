import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  analysisQueryOptions,
  earningsCalendarQueryOptions,
  marketSentimentQueryOptions,
  screenerQueryOptions,
  snapshotQueryOptions,
  type ScreenerFilter,
  type ScreenerSort,
} from '../lib/queryOptions';
import { queryKeys } from '../lib/queryKeys';

export function useSnapshotQuery() {
  return useQuery(snapshotQueryOptions());
}

export function useMarketSentimentQuery() {
  return useQuery(marketSentimentQueryOptions());
}

export function useScreenerQuery(
  filter: ScreenerFilter = 'all',
  sort: ScreenerSort = 'score',
  search = '',
  limit = 100,
) {
  return useQuery(screenerQueryOptions(filter, sort, search, limit));
}

export function useAnalysisQuery(ticker: string) {
  return useQuery(analysisQueryOptions(ticker));
}

export function useEarningsCalendarQuery(limit = 50) {
  return useQuery(earningsCalendarQueryOptions(limit));
}

export function usePrefetchQueries() {
  const queryClient = useQueryClient();

  return {
    prefetchAnalysis: (ticker: string) => queryClient.prefetchQuery(analysisQueryOptions(ticker)),
    prefetchSnapshot: () => queryClient.prefetchQuery(snapshotQueryOptions()),
    prefetchMarketSentiment: () => queryClient.prefetchQuery(marketSentimentQueryOptions()),
    prefetchScreener: (filter: ScreenerFilter = 'all', sort: ScreenerSort = 'score', search = '', limit = 100) =>
      queryClient.prefetchQuery(screenerQueryOptions(filter, sort, search, limit)),
    prefetchEarningsCalendar: (limit = 50) => queryClient.prefetchQuery(earningsCalendarQueryOptions(limit)),
    invalidateAnalysis: (ticker: string) => queryClient.invalidateQueries({ queryKey: queryKeys.analysis(ticker) }),
  };
}

