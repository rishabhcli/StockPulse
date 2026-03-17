export const queryKeys = {
  snapshot: ['market-snapshot'] as const,
  marketSentiment: ['market-sentiment'] as const,
  screener: (filter: string, sort: string, search: string, limit: number) =>
    ['screener', filter, sort, search.trim().toUpperCase(), limit] as const,
  analysis: (ticker: string) => ['analysis', ticker.trim().toUpperCase()] as const,
  earningsCalendar: (limit: number) => ['earnings-calendar', limit] as const,
};
