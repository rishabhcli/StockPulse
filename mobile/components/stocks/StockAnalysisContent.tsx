import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StockAnalysis } from '../../lib/types';
import { colors, spacing, fontSize, fontFamily, getScoreColor } from '../../constants/theme';
import Surface from '../ui/Surface';
import ScoreCircle from '../charts/ScoreCircle';
import PriceDisplay from './PriceDisplay';
import { IndicatorGrid } from './IndicatorCard';
import { NewsList } from '../market/NewsItem';
import Badge from '../ui/Badge';

// ============================================================================
// TYPES
// ============================================================================

interface StockAnalysisContentProps {
  analysis: StockAnalysis;
  /** Override scroll container (e.g. BottomSheetScrollView) */
  ScrollComponent?: React.ComponentType<any>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StockAnalysisContent({
  analysis,
  ScrollComponent,
}: StockAnalysisContentProps) {
  const Scroll = ScrollComponent || ScrollView;

  const buildIndicators = () => {
    if (!analysis.technical_analysis) return [];
    const ta = analysis.technical_analysis;
    const indicators = [];

    if (ta.rsi) indicators.push({ name: 'RSI', value: ta.rsi.value, signal: ta.rsi.signal, description: ta.rsi.description });
    if (ta.macd) indicators.push({ name: 'MACD', value: ta.macd.histogram ?? 0, signal: ta.macd.trend, description: `Signal: ${ta.macd.signal?.toFixed?.(2) ?? 'N/A'}` });
    if (ta.stochastic) indicators.push({ name: 'Stochastic', value: ta.stochastic.k ?? 0, signal: ta.stochastic.signal, description: `K: ${ta.stochastic.k?.toFixed?.(1) ?? 'N/A'}` });
    if (ta.adx) indicators.push({ name: 'ADX', value: ta.adx.value, signal: ta.adx.signal, description: ta.adx.description });

    return indicators;
  };

  return (
    <Scroll
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Stock Header */}
      <Surface style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.stockInfo}>
            <Text style={styles.ticker}>{analysis.ticker}</Text>
            <Text style={styles.companyName}>{analysis.company_name}</Text>
          </View>
          <ScoreCircle score={analysis.investment_score} size={100} />
        </View>

        <PriceDisplay
          price={analysis.current_price}
          change={analysis.price_change}
          changePercent={analysis.price_change_pct}
          size="large"
        />

        <View style={styles.recommendationRow}>
          <Badge
            label={analysis.recommendation}
            variant={analysis.investment_score >= 60 ? 'success' : analysis.investment_score >= 45 ? 'warning' : 'error'}
            size="medium"
          />
        </View>
      </Surface>

      {/* Recommendation Reasons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analysis Summary</Text>
        <Surface style={styles.reasonsCard}>
          {analysis.recommendation_reasons.map((reason, index) => (
            <View key={index} style={styles.reasonItem}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={getScoreColor(analysis.investment_score)}
              />
              <Text style={styles.reasonText}>
                {typeof reason === 'string' ? reason : ((reason as any).detail || (reason as any).factor || String(reason))}
              </Text>
            </View>
          ))}
        </Surface>
      </View>

      {/* Score Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Score Breakdown</Text>
        <View style={styles.scoreRow}>
          <Surface style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Technical</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(analysis.technical_score) }]}>
              {analysis.technical_score}
            </Text>
            <Text style={styles.scoreWeight}>65% weight</Text>
          </Surface>
          <Surface style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Fundamental</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(analysis.fundamental_score) }]}>
              {analysis.fundamental_score}
            </Text>
            <Text style={styles.scoreWeight}>35% weight</Text>
          </Surface>
        </View>
      </View>

      {/* Technical Indicators */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Technical Indicators</Text>
        <IndicatorGrid indicators={buildIndicators()} />
      </View>

      {/* Fundamental Metrics */}
      {analysis.fundamental_analysis && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fundamentals</Text>
          <Surface style={styles.fundamentalsCard}>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>P/E Ratio</Text>
              <Text style={styles.metricValue}>
                {analysis.fundamental_analysis.pe_ratio?.toFixed(2) || 'N/A'}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Forward P/E</Text>
              <Text style={styles.metricValue}>
                {analysis.fundamental_analysis.forward_pe?.toFixed(2) || 'N/A'}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>PEG Ratio</Text>
              <Text style={styles.metricValue}>
                {analysis.fundamental_analysis.peg_ratio?.toFixed(2) || 'N/A'}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Profit Margin</Text>
              <Text style={styles.metricValue}>
                {analysis.fundamental_analysis.profit_margin
                  ? `${(analysis.fundamental_analysis.profit_margin * 100).toFixed(1)}%`
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>ROE</Text>
              <Text style={styles.metricValue}>
                {analysis.fundamental_analysis.roe
                  ? `${(analysis.fundamental_analysis.roe * 100).toFixed(1)}%`
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Dividend Yield</Text>
              <Text style={styles.metricValue}>
                {analysis.fundamental_analysis.dividend_yield
                  ? `${(analysis.fundamental_analysis.dividend_yield * 100).toFixed(2)}%`
                  : 'N/A'}
              </Text>
            </View>
          </Surface>
        </View>
      )}

      {/* News */}
      {analysis.news_analysis?.articles && analysis.news_analysis.articles.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent News</Text>
          <NewsList articles={analysis.news_analysis.articles.slice(0, 5)} />
        </View>
      )}
    </Scroll>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  headerCard: {
    margin: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  stockInfo: {
    flex: 1,
  },
  ticker: {
    color: colors.text,
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.sansBold,
  },
  companyName: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: 4,
  },
  recommendationRow: {
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.sansBold,
    marginBottom: spacing.md,
  },
  reasonsCard: {
    gap: spacing.sm,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  reasonText: {
    color: colors.text,
    fontSize: fontSize.md,
    flex: 1,
    lineHeight: 22,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  scoreCard: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.serifItalic,
  },
  scoreWeight: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  fundamentalsCard: {
    gap: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  metricValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.sansSemibold,
  },
});
