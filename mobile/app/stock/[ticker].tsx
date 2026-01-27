import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAnalysisStore } from '../../stores/useAnalysisStore';
import { colors, spacing, fontSize, getScoreColor } from '../../constants/theme';
import { formatPrice, formatPercent } from '../../lib/utils';
import Surface from '../../components/ui/Surface';
import ScoreCircle from '../../components/charts/ScoreCircle';
import PriceDisplay from '../../components/stocks/PriceDisplay';
import { IndicatorGrid } from '../../components/stocks/IndicatorCard';
import { NewsList } from '../../components/market/NewsItem';
import { Loading } from '../../components/ui/Loading';
import Badge from '../../components/ui/Badge';

export default function StockDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const { currentAnalysis, isAnalyzing, error, analyze } = useAnalysisStore();

  useEffect(() => {
    if (ticker) {
      analyze(ticker);
    }
  }, [ticker]);

  // Build indicators from analysis
  const buildIndicators = () => {
    if (!currentAnalysis?.technical_analysis) return [];

    const ta = currentAnalysis.technical_analysis;
    const indicators = [];

    if (ta.rsi) indicators.push({ name: 'RSI', value: ta.rsi.value, signal: ta.rsi.signal, description: ta.rsi.description });
    if (ta.macd) indicators.push({ name: 'MACD', value: ta.macd.histogram, signal: ta.macd.trend, description: `Signal: ${ta.macd.signal.toFixed(2)}` });
    if (ta.stochastic) indicators.push({ name: 'Stochastic', value: ta.stochastic.k, signal: ta.stochastic.signal, description: `K: ${ta.stochastic.k.toFixed(1)}` });
    if (ta.adx) indicators.push({ name: 'ADX', value: ta.adx.value, signal: ta.adx.signal, description: ta.adx.description });

    return indicators;
  };

  if (isAnalyzing && !currentAnalysis) {
    return (
      <>
        <Stack.Screen options={{ title: ticker || 'Stock' }} />
        <Loading fullScreen message={`Loading ${ticker}...`} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: ticker || 'Stock' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </>
    );
  }

  if (!currentAnalysis) {
    return (
      <>
        <Stack.Screen options={{ title: ticker || 'Stock' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorText}>Stock not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: currentAnalysis.ticker }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stock Header */}
        <Surface style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.stockInfo}>
              <Text style={styles.ticker}>{currentAnalysis.ticker}</Text>
              <Text style={styles.companyName}>{currentAnalysis.company_name}</Text>
            </View>
            <ScoreCircle score={currentAnalysis.investment_score} size={100} />
          </View>

          <PriceDisplay
            price={currentAnalysis.current_price}
            change={currentAnalysis.price_change}
            changePercent={currentAnalysis.price_change_pct}
            size="large"
          />

          <View style={styles.recommendationRow}>
            <Badge
              label={currentAnalysis.recommendation}
              variant={currentAnalysis.investment_score >= 60 ? 'success' : currentAnalysis.investment_score >= 45 ? 'warning' : 'error'}
              size="medium"
            />
          </View>
        </Surface>

        {/* Recommendation Reasons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analysis Summary</Text>
          <Surface style={styles.reasonsCard}>
            {currentAnalysis.recommendation_reasons.map((reason, index) => (
              <View key={index} style={styles.reasonItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={getScoreColor(currentAnalysis.investment_score)}
                />
                <Text style={styles.reasonText}>{reason}</Text>
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
              <Text style={[styles.scoreValue, { color: getScoreColor(currentAnalysis.technical_score) }]}>
                {currentAnalysis.technical_score}
              </Text>
              <Text style={styles.scoreWeight}>65% weight</Text>
            </Surface>
            <Surface style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Fundamental</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(currentAnalysis.fundamental_score) }]}>
                {currentAnalysis.fundamental_score}
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
        {currentAnalysis.fundamental_analysis && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fundamentals</Text>
            <Surface style={styles.fundamentalsCard}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>P/E Ratio</Text>
                <Text style={styles.metricValue}>
                  {currentAnalysis.fundamental_analysis.pe_ratio?.toFixed(2) || 'N/A'}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Forward P/E</Text>
                <Text style={styles.metricValue}>
                  {currentAnalysis.fundamental_analysis.forward_pe?.toFixed(2) || 'N/A'}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>PEG Ratio</Text>
                <Text style={styles.metricValue}>
                  {currentAnalysis.fundamental_analysis.peg_ratio?.toFixed(2) || 'N/A'}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Profit Margin</Text>
                <Text style={styles.metricValue}>
                  {currentAnalysis.fundamental_analysis.profit_margin
                    ? `${(currentAnalysis.fundamental_analysis.profit_margin * 100).toFixed(1)}%`
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>ROE</Text>
                <Text style={styles.metricValue}>
                  {currentAnalysis.fundamental_analysis.roe
                    ? `${(currentAnalysis.fundamental_analysis.roe * 100).toFixed(1)}%`
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Dividend Yield</Text>
                <Text style={styles.metricValue}>
                  {currentAnalysis.fundamental_analysis.dividend_yield
                    ? `${(currentAnalysis.fundamental_analysis.dividend_yield * 100).toFixed(2)}%`
                    : 'N/A'}
                </Text>
              </View>
            </Surface>
          </View>
        )}

        {/* News */}
        {currentAnalysis.news_analysis?.articles && currentAnalysis.news_analysis.articles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent News</Text>
            <NewsList articles={currentAnalysis.news_analysis.articles.slice(0, 5)} />
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
