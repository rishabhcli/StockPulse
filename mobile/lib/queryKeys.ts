export const queryKeys = {
  snapshot: ['market-snapshot'] as const,
  marketSentiment: ['market-sentiment'] as const,
  // Sorting and searching are client-side projections of the same server
  // payload, so they must not fragment the network cache.
  screener: (filter: string, limit: number) => ['screener', filter, limit] as const,
  analysis: (ticker: string) => ['analysis', ticker.trim().toUpperCase()] as const,
  earningsCalendar: (limit: number) => ['earnings-calendar', limit] as const,
};
