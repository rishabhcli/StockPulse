import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StockAnalysis } from '../../lib/types';
import { colors, fontFamily, fontSize, spacing } from '../../constants/theme';
import {
  confidenceVariant,
  dataQualityVariant,
  formatLayerLabel,
  formatTimestampLabel,
  isTimestampStale,
  recommendationVariant,
} from '../../lib/presentation';
import Surface from '../ui/Surface';
import Badge from '../ui/Badge';
import ScoreCircle from '../charts/ScoreCircle';
import PriceDisplay from './PriceDisplay';
import { IndicatorGrid } from './IndicatorCard';
import { NewsList } from '../market/NewsItem';

interface StockAnalysisContentProps {
  analysis: StockAnalysis;
  ScrollComponent?: React.ComponentType<any>;
}

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      <Surface style={styles.sectionCard} variant="filled">
        {children}
      </Surface>
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function asPercent(value?: number | null, digits = 1) {
  if (typeof value !== 'number') return 'N/A';
  return `${(Math.abs(value) <= 1 ? value * 100 : value).toFixed(digits)}%`;
}

function asNumber(value?: number | null, digits = 2) {
  if (typeof value !== 'number') return 'N/A';
  return value.toFixed(digits);
}

function buildTechnicalIndicators(analysis: StockAnalysis) {
  const indicators: Array<{ name: string; value: number; signal: 'bullish' | 'bearish' | 'neutral'; description: string }> = [];
  const technical = analysis.technical_analysis;
  if (!technical) return indicators;

  if (technical.rsi) indicators.push({ name: 'RSI', value: technical.rsi.value, signal: technical.rsi.signal, description: technical.rsi.description });
  if (technical.macd) indicators.push({ name: 'MACD', value: technical.macd.histogram ?? 0, signal: technical.macd.trend, description: `Histogram ${asNumber(technical.macd.histogram ?? 0)}` });
  if (technical.stochastic) indicators.push({ name: 'Stochastic', value: technical.stochastic.k ?? 0, signal: technical.stochastic.signal, description: `K ${asNumber(technical.stochastic.k ?? 0, 1)}` });
  if (technical.adx) indicators.push({ name: 'ADX', value: technical.adx.value, signal: technical.adx.signal, description: technical.adx.description });
  if (technical.mfi) indicators.push({ name: 'MFI', value: technical.mfi.value, signal: technical.mfi.signal, description: technical.mfi.description });
  if (technical.cci) indicators.push({ name: 'CCI', value: technical.cci.value, signal: technical.cci.signal, description: technical.cci.description });

  return indicators;
}

function buildRiskItems(analysis: StockAnalysis) {
  const items: string[] = [];
  if (analysis.stale_inputs?.length) items.push(`Stale inputs: ${analysis.stale_inputs.join(', ')}`);
  if (analysis.data_quality?.missing_optional_inputs?.length) {
    items.push(`Optional inputs unavailable: ${analysis.data_quality.missing_optional_inputs.join(', ')}`);
  }
  if ((analysis.market_context?.regime ?? '').toUpperCase() === 'RISK_OFF') {
    items.push('Macro regime is currently risk-off.');
  }
  if (typeof analysis.news_analysis?.risk_factor === 'number' && analysis.news_analysis.risk_factor > 0.5) {
    items.push(`News risk factor is elevated at ${analysis.news_analysis.risk_factor.toFixed(2)}.`);
  }
  if (typeof analysis.earnings?.days_until === 'number' && analysis.earnings.days_until <= 7) {
    items.push(`Earnings are due in ${analysis.earnings.days_until} day${analysis.earnings.days_until === 1 ? '' : 's'}.`);
  }
  return items;
}

export default function StockAnalysisContent({ analysis, ScrollComponent }: StockAnalysisContentProps) {
  const Scroll = ScrollComponent || ScrollView;
  const technicalIndicators = buildTechnicalIndicators(analysis);
  const riskItems = buildRiskItems(analysis);
  const freshnessLabel = formatTimestampLabel(analysis.generated_at);
  const freshnessTone = isTimestampStale(analysis.generated_at) ? 'warning' : 'neutral';
  const sourceGroups = Object.entries(analysis.sources_used ?? {});
  const availableLayers = analysis.data_quality?.available_layers ?? [];
  const applicableLayers = analysis.data_quality?.applicable_layers ?? [];
  const catalysts = analysis.news_analysis?.catalysts ?? [];

  return (
    <Scroll style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Surface style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.ticker}>{analysis.ticker}</Text>
            <Text style={styles.company}>{analysis.company_name}</Text>
            <Text style={styles.meta}>
              {analysis.instrument_type.toUpperCase()}
              {analysis.sector ? ` • ${analysis.sector}` : ''}
            </Text>
          </View>
          <ScoreCircle score={analysis.investment_score} size={96} />
        </View>

        <PriceDisplay price={analysis.current_price} change={analysis.price_change} changePercent={analysis.price_change_pct} size="large" />

        <View style={styles.badgeRow}>
          <Badge label={analysis.recommendation} variant={recommendationVariant(analysis.recommendation)} />
          <Badge label={`${analysis.confidence} confidence`} variant={confidenceVariant(analysis.confidence)} />
          <Badge label={analysis.data_quality?.status ?? 'unknown'} variant={dataQualityVariant(analysis.data_quality)} />
          <Badge label={freshnessLabel} variant={freshnessTone} />
        </View>
      </Surface>

      <Section title="Confidence & Data Quality" subtitle={analysis.data_quality?.freshness_summary ?? undefined}>
        <Text style={styles.bodyText}>
          {analysis.data_quality?.core_inputs_complete
            ? 'Core inputs passed the production gate.'
            : 'This analysis is missing core inputs and should be treated as unavailable.'}
        </Text>
        <View style={styles.tagWrap}>
          {applicableLayers.map((layer) => (
            <Badge key={`applicable-${layer}`} label={`Applicable: ${formatLayerLabel(layer)}`} variant="neutral" size="small" />
          ))}
          {availableLayers.map((layer) => (
            <Badge key={`available-${layer}`} label={`Available: ${formatLayerLabel(layer)}`} variant="primary" size="small" />
          ))}
        </View>
        {analysis.data_quality?.missing_optional_inputs?.length ? (
          <Text style={styles.helperText}>
            Missing optional inputs: {analysis.data_quality.missing_optional_inputs.join(', ')}
          </Text>
        ) : null}
      </Section>

      <Section title="Why It Qualifies">
        <Text style={styles.bodyText}>{analysis.explanation}</Text>
      </Section>

      {riskItems.length ? (
        <Section title="What Could Break It">
          {riskItems.map((item) => (
            <View key={item} style={styles.listRow}>
              <Ionicons name="warning-outline" size={16} color={colors.warning} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </Section>
      ) : null}

      {technicalIndicators.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Technical</Text>
            <Text style={styles.sectionSubtitle}>Only available indicators are shown.</Text>
          </View>
          <IndicatorGrid indicators={technicalIndicators} />
        </View>
      ) : null}

      {analysis.fundamental_analysis && analysis.fundamental_analysis.status !== 'not_applicable' && analysis.fundamental_analysis.status !== 'unavailable' ? (
        <Section title="Fundamental">
          <MetricRow label="Market cap" value={analysis.fundamental_analysis.market_cap ? `$${Math.round(analysis.fundamental_analysis.market_cap).toLocaleString()}` : 'N/A'} />
          <MetricRow label="Trailing P/E" value={asNumber(analysis.fundamental_analysis.pe_ratio ?? analysis.fundamental_analysis.trailing_pe)} />
          <MetricRow label="Forward P/E" value={asNumber(analysis.fundamental_analysis.forward_pe)} />
          <MetricRow label="PEG ratio" value={asNumber(analysis.fundamental_analysis.peg_ratio)} />
          <MetricRow label="Profit margin" value={asPercent(analysis.fundamental_analysis.profit_margin)} />
          <MetricRow label="ROE" value={asPercent(analysis.fundamental_analysis.roe ?? analysis.fundamental_analysis.return_on_equity)} />
          <MetricRow label="Revenue growth" value={asPercent(analysis.fundamental_analysis.revenue_growth)} />
          {analysis.fundamental_analysis.valuation_signal ? <MetricRow label="Valuation" value={String(analysis.fundamental_analysis.valuation_signal)} /> : null}
        </Section>
      ) : null}

      <Section title="Market Regime">
        <MetricRow label="Regime" value={String(analysis.market_context?.regime ?? analysis.market_sentiment?.regime ?? 'N/A')} />
        <MetricRow label="Regime status" value={String(analysis.market_sentiment?.regime_status ?? 'N/A')} />
        <MetricRow label="VIX" value={asNumber(analysis.market_sentiment?.vix, 1)} />
        <MetricRow label="Breadth" value={asPercent(analysis.market_sentiment?.breadth)} />
        <MetricRow label="10Y Treasury" value={asPercent(analysis.market_sentiment?.treasury_10y, 2)} />
      </Section>

      {(catalysts.length || analysis.news_analysis?.nearest_catalyst || analysis.news_analysis?.articles?.length) ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Catalysts</Text>
            <Text style={styles.sectionSubtitle}>
              {analysis.news_analysis?.overall_sentiment ?? 'Sentiment unavailable'}
            </Text>
          </View>
          {analysis.news_analysis?.nearest_catalyst ? (
            <Surface style={styles.inlineCard} variant="filled">
              <Text style={styles.inlineTitle}>Nearest catalyst</Text>
              <Text style={styles.bodyText}>
                {String(analysis.news_analysis.nearest_catalyst.title ?? analysis.news_analysis.nearest_catalyst.event ?? 'Upcoming event')}
              </Text>
              {typeof analysis.news_analysis.days_to_nearest === 'number' ? (
                <Text style={styles.helperText}>{analysis.news_analysis.days_to_nearest} days away</Text>
              ) : null}
            </Surface>
          ) : null}
          {analysis.news_analysis?.articles?.length ? <NewsList articles={analysis.news_analysis.articles.slice(0, 3)} /> : null}
        </View>
      ) : null}

      {(analysis.earnings?.next_earnings_date || analysis.earnings?.earnings_history?.length) ? (
        <Section title="Earnings">
          <MetricRow label="Next earnings" value={analysis.earnings.next_earnings_date ?? 'N/A'} />
          <MetricRow label="Days until" value={analysis.earnings.days_until != null ? String(analysis.earnings.days_until) : 'N/A'} />
          <MetricRow label="Last surprise" value={asPercent(analysis.earnings.last_earnings_surprise)} />
          {analysis.earnings.earnings_history?.slice(0, 3).map((item) => (
            <View key={item.date} style={styles.listRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.listText}>
                {item.date}: actual {item.actual} vs expected {item.expected} ({asPercent(item.surprise_pct)})
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      {sourceGroups.length ? (
        <Section title="Sources">
          {sourceGroups.map(([groupName, groupValue]) => {
            const values = Object.values((groupValue ?? {}) as Record<string, any>);
            const availableCount = values.filter((item) => item?.available).length;
            return (
              <MetricRow
                key={groupName}
                label={formatLayerLabel(groupName)}
                value={`${availableCount}/${values.length} available`}
              />
            );
          })}
        </Section>
      ) : null}
    </Scroll>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bodyText: {
    color: colors.textSecondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    lineHeight: 21,
  },
  company: {
    color: colors.text,
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.lg,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  helperText: {
    color: colors.textMuted,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  heroCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  heroCopy: {
    flex: 1,
  },
  heroTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  inlineCard: {
    marginBottom: spacing.md,
  },
  inlineTitle: {
    color: colors.text,
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  listRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  listText: {
    color: colors.textSecondary,
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    letterSpacing: 0.4,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  metricLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
  },
  metricRow: {
    alignItems: 'center',
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  metricValue: {
    color: colors.text,
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.sm,
    maxWidth: '50%',
    textAlign: 'right',
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  section: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionCard: {
    gap: spacing.xs,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fontFamily.serif,
    fontSize: fontSize.xl,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  ticker: {
    color: colors.textMuted,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
