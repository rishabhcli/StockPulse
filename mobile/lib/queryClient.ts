import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { queryStorage } from './offlineCache';

type RetryableError = {
  status?: number | null;
  response?: { status?: number };
};

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  const candidate = error as RetryableError | null;
  const status = candidate?.status ?? candidate?.response?.status;
  if (typeof status === 'number' && status < 500 && status !== 408 && status !== 429) {
    return false;
  }
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: shouldRetryQuery,
      retryDelay: (attempt) => Math.min(500 * (2 ** attempt), 4_000),
      refetchOnMount: false,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: queryStorage,
  key: 'stockpulse-react-query-cache',
  throttleTime: 1000,
});
