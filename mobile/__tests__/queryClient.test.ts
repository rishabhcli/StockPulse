import { shouldRetryQuery } from '../lib/queryClient';

describe('shouldRetryQuery', () => {
  it('does not retry permanent client errors', () => {
    expect(shouldRetryQuery(0, { status: 422 })).toBe(false);
    expect(shouldRetryQuery(0, { response: { status: 401 } })).toBe(false);
  });

  it('retries transient failures with a bounded attempt count', () => {
    expect(shouldRetryQuery(0, { status: 503 })).toBe(true);
    expect(shouldRetryQuery(0, { status: 429 })).toBe(true);
    expect(shouldRetryQuery(1, new Error('Network unavailable'))).toBe(true);
    expect(shouldRetryQuery(2, { status: 503 })).toBe(false);
  });
});
