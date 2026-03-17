import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Surface from '../ui/Surface';
import Badge from '../ui/Badge';
import { colors, fontFamily, fontSize, spacing } from '../../constants/theme';
import type { MarketSentiment } from '../../lib/types';
import { confidenceVariant, formatLayerLabel, formatTimestampLabel, isTimestampStale } from '../../lib/presentation';

interface SentimentHeaderProps {
  sentiment: MarketSentiment;
}

interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
}

function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {helper ? <Text style={styles.metricHelper}>{helper}</Text> : null}
    </View>
  );
}

function formatNumber(value?: number | null, digits = 1) {
  if (typeof value !== 'number') return 'N/A';
  return value.toFixed(digits);
}

function formatPercent(value?: number | null, digits = 1) {
  if (typeof value !== 'number') return 'N/A';
  return `${value.toFixed(digits)}%`;
}

function regimeVariant(status?: string | null) {
  const value = String(status ?? '').toLowerCase();
  if (value.includes('bull') || value.includes('risk_on') || value.includes('favorable')) return 'success';
  if (value.includes('bear') || value.includes('risk_off') || value.includes('stressed')) return 'error';
  if (value.includes('partial') || value.includes('unknown')) return 'warning';
  return 'neutral';
}

export function SentimentHeader({ sentiment }: SentimentHeaderProps) {
  const stale = isTimestampStale(sentiment.generated_at);
  const proxyEntries = Object.entries(sentiment.risk_proxies ?? {}).slice(0, 3);
  const confidenceLabel =
    sentiment.regime_confidence != null ? `${Math.round(sentiment.regime_confidence * 100)}% confidence` : 'Confidence unavailable';

  return (
    <Surface style={styles.container} variant="elevated">
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Market Regime</Text>
          <Text style={styles.title}>{sentiment.regime ?? sentiment.signal ?? 'Unavailable'}</Text>
          <Text style={styles.subtitle}>
            {sentiment.description ?? 'Macro participation and cross-asset risk data are partially unavailable.'}
          </Text>
        </View>
        <View style={styles.iconWrap}>
          <Ionicons
            name={String(sentiment.regime ?? sentiment.signal ?? sentiment.overall_sentiment ?? '').toLowerCase().includes('risk_off') || String(sentiment.overall_sentiment ?? '').toLowerCase().includes('bear') ? 'trending-down' : 'pulse'}
            size={24}
            color={colors.primary}
          />
        </View>
      </View>

      <View style={styles.badgeRow}>
        <Badge label={sentiment.regime_status ?? 'unknown'} variant={regimeVariant(sentiment.regime_status)} />
        <Badge label={confidenceLabel} variant={confidenceVariant(sentiment.regime_confidence == null ? null : sentiment.regime_confidence >= 0.75 ? 'HIGH' : sentiment.regime_confidence >= 0.5 ? 'MEDIUM' : 'LOW')} />
        <Badge label={stale ? 'Stale inputs' : formatTimestampLabel(sentiment.generated_at)} variant={stale ? 'warning' : 'neutral'} />
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label="Breadth" value={formatPercent(sentiment.breadth)} helper="Participation" />
        <MetricCard label="VIX" value={formatNumber(sentiment.vix)} helper={sentiment.vix_signal ?? 'Volatility'} />
        <MetricCard label="10Y" value={formatPercent(sentiment.treasury_10y, 2)} helper="Treasury yield" />
        <MetricCard label="Fed" value={sentiment.fed_stance ?? 'N/A'} helper="Policy tone" />
      </View>

      <View style={styles.metaRow}>
        <Badge label={`Regime: ${sentiment.regime ?? 'N/A'}`} variant="primary" size="small" />
        {sentiment.yield_curve ? <Badge label={`Yield curve: ${formatLayerLabel('yield_curve')}`} variant="neutral" size="small" /> : null}
        {sentiment.sources ? <Badge label={`Sources: ${Object.keys(sentiment.sources).length}`} variant="neutral" size="small" /> : null}
      </View>

      {proxyEntries.length ? (
        <View style={styles.proxySection}>
          <Text style={styles.proxyTitle}>Risk proxies</Text>
          <View style={styles.proxyRow}>
            {proxyEntries.map(([label, value]) => (
              <View key={label} style={styles.proxyPill}>
                <Text style={styles.proxyLabel}>{label.replace(/_/g, ' ')}</Text>
                <Text style={styles.proxyValue}>{formatNumber(value, 2)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerCopy: {
    flex: 1,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  metricCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 16,
    flexBasis: '48%',
    gap: 4,
    padding: spacing.md,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metricHelper: {
    color: colors.textMuted,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
  },
  metricLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.lg,
  },
  proxyLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    textTransform: 'capitalize',
  },
  proxyPill: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 14,
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  proxyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  proxySection: {
    marginTop: spacing.lg,
  },
  proxyTitle: {
    color: colors.text,
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  proxyValue: {
    color: colors.text,
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl'],
    marginTop: 2,
  },
});

export default SentimentHeader;
