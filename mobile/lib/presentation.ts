import type { ConfidenceLevel, DataQualitySummary } from './types';

export function formatTimestampLabel(timestamp?: string | null) {
  if (!timestamp) return 'Freshness unavailable';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Freshness unavailable';

  const now = Date.now();
  const diffMinutes = Math.max(0, Math.round((now - date.getTime()) / 60000));
  if (diffMinutes < 1) return 'Updated just now';
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Updated ${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `Updated ${diffDays}d ago`;
}

export function isTimestampStale(timestamp?: string | null, thresholdMinutes = 20) {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;
  return (Date.now() - date.getTime()) / 60000 >= thresholdMinutes;
}

export function confidenceVariant(confidence?: ConfidenceLevel | null): 'success' | 'warning' | 'error' | 'neutral' {
  switch (confidence) {
    case 'HIGH':
      return 'success';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'error';
    default:
      return 'neutral';
  }
}

export function recommendationVariant(recommendation?: string | null): 'success' | 'warning' | 'error' | 'neutral' {
  switch ((recommendation ?? '').toUpperCase()) {
    case 'STRONG BUY':
    case 'BUY':
      return 'success';
    case 'HOLD':
      return 'warning';
    case 'SELL':
    case 'STRONG SELL':
    case 'SHORT':
      return 'error';
    default:
      return 'neutral';
  }
}

export function dataQualityVariant(dataQuality?: DataQualitySummary | null): 'success' | 'warning' | 'error' | 'neutral' {
  switch (dataQuality?.status) {
    case 'complete':
      return 'success';
    case 'partial':
      return 'warning';
    case 'unavailable':
      return 'error';
    default:
      return 'neutral';
  }
}

export function formatLayerLabel(layer: string) {
  return layer
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

export function earningsBucketLabel(daysUntil: number) {
  if (daysUntil <= 0) return 'Today';
  if (daysUntil <= 7) return 'This Week';
  return 'Next 30 Days';
}
