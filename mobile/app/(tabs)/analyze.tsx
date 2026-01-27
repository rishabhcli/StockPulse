import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAnalysisStore } from '../../stores/useAnalysisStore';
import { colors, spacing, fontSize, borderRadius, getScoreColor, getScoreLabel } from '../../constants/theme';
import { formatPrice, formatPercent } from '../../lib/utils';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Surface from '../../components/ui/Surface';
import Badge from '../../components/ui/Badge';
import ScoreCircle from '../../components/charts/ScoreCircle';
import { IndicatorGrid } from '../../components/stocks/IndicatorCard';
import PriceDisplay from '../../components/stocks/PriceDisplay';
import { Loading } from '../../components/ui/Loading';
import TappableTerm from '../../components/sheets/TappableTerm';

export default function AnalyzeScreen() {
  const [ticker, setTicker] = useState('');
  const { currentAnalysis, isAnalyzing, error, analyze, clearError } = useAnalysisStore();

  const handleAnalyze = async () => {
    if (!ticker.trim()) return;
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    clearError();
    await analyze(ticker.trim().toUpperCase());
  };

  // Build indicators from analysis
  const buildIndicators = () => {
    if (!currentAnalysis?.technical_analysis) return [];

    const ta = currentAnalysis.technical_analysis;
    const indicators = [];

    if (ta.rsi) {
      indicators.push({
        name: 'RSI (14)',
        value: ta.rsi.value,
        signal: ta.rsi.signal,
        description: ta.rsi.description,
      });
    }

    if (ta.macd) {
      indicators.push({
        name: 'MACD',
        value: ta.macd.histogram,
        signal: ta.macd.trend,
        description: `Signal: ${ta.macd.signal.toFixed(2)}`,
      });
    }

    if (ta.stochastic) {
      indicators.push({
        name: 'Stochastic',
        value: ta.stochastic.k,
        signal: ta.stochastic.signal,
        description: `K: ${ta.stochastic.k.toFixed(1)}, D: ${ta.stochastic.d.toFixed(1)}`,
      });
    }

    if (ta.adx) {
      indicators.push({
        name: 'ADX',
        value: ta.adx.value,
        signal: ta.adx.signal,
        description: ta.adx.description,
      });
    }

    if (ta.mfi) {
      indicators.push({
        name: 'MFI',
        value: ta.mfi.value,
        signal: ta.mfi.signal,
        description: ta.mfi.description,
      });
    }

    if (ta.cci) {
      indicators.push({
        name: 'CCI',
        value: ta.cci.value,
        signal: ta.cci.signal,
        description: ta.cci.description,
      });
    }

    return indicators;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Analyze Stock</Text>
            <Text style={styles.subtitle}>Get AI-powered investment insights</Text>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Input
              placeholder="Enter ticker symbol (e.g., AAPL)"
              value={ticker}
              onChangeText={setTicker}
              autoCapitalize="characters"
              autoCorrect={false}
              leftIcon={<Ionicons name="search" size={20} color={colors.textMuted} />}
              onSubmitEditing={handleAnalyze}
              returnKeyType="search"
            />
            <Button
              title="Analyze"
              onPress={handleAnalyze}
              loading={isAnalyzing}
              disabled={!ticker.trim()}
              style={styles.analyzeButton}
            />
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Loading */}
          {isAnalyzing && (
            <Loading message={`Analyzing ${ticker.toUpperCase()}...`} />
          )}

          {/* Analysis Results */}
          {currentAnalysis && !isAnalyzing && (
            <View style={styles.results}>
              {/* Stock Header */}
              <Surface style={styles.stockHeader}>
                <View style={styles.stockInfo}>
                  <Text style={styles.stockTicker}>{currentAnalysis.ticker}</Text>
                  <Text style={styles.stockName}>{currentAnalysis.company_name}</Text>
                  <PriceDisplay
                    price={currentAnalysis.current_price}
                    change={currentAnalysis.price_change}
                    changePercent={currentAnalysis.price_change_pct}
                    size="large"
                  />
                </View>
                <ScoreCircle score={currentAnalysis.investment_score} size={120} />
              </Surface>

              {/* Recommendation */}
              <Surface style={styles.recommendationCard}>
                <Badge
                  label={currentAnalysis.recommendation}
                  variant={
                    currentAnalysis.investment_score >= 60
                      ? 'success'
                      : currentAnalysis.investment_score >= 45
                      ? 'warning'
                      : 'error'
                  }
                  size="medium"
                />
                <View style={styles.reasons}>
                  {currentAnalysis.recommendation_reasons.slice(0, 3).map((reason: any, index: number) => (
                    <View key={index} style={styles.reasonItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={getScoreColor(currentAnalysis.investment_score)}
                      />
                      <Text style={styles.reasonText}>
                        {typeof reason === 'string' ? reason : (reason.detail || reason.factor || String(reason))}
                      </Text>
                    </View>
                  ))}
                </View>
              </Surface>

              {/* Score Breakdown */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Score Breakdown</Text>
                <View style={styles.scoreBreakdown}>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Technical</Text>
                    <Text style={[styles.scoreValue, { color: getScoreColor(currentAnalysis.technical_score) }]}>
                      {currentAnalysis.technical_score}
                    </Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Fundamental</Text>
                    <Text style={[styles.scoreValue, { color: getScoreColor(currentAnalysis.fundamental_score) }]}>
                      {currentAnalysis.fundamental_score}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Technical Indicators */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Technical Indicators</Text>
                <IndicatorGrid indicators={buildIndicators()} />
              </View>

              {/* Market Sentiment */}
              {currentAnalysis.market_sentiment && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Market Sentiment</Text>
                  <Surface style={styles.sentimentCard}>
                    <View style={styles.sentimentRow}>
                      <TappableTerm displayName="VIX" style={styles.sentimentLabel} />
                      <Text style={styles.sentimentValue}>
                        {currentAnalysis.market_sentiment.vix?.toFixed(1) ?? 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.sentimentRow}>
                      <TappableTerm displayName="Fear & Greed" style={styles.sentimentLabel} />
                      <Text style={styles.sentimentValue}>
                        {currentAnalysis.market_sentiment.fear_greed_index} ({currentAnalysis.market_sentiment.fear_greed_label ?? 'N/A'})
                      </Text>
                    </View>
                    <View style={styles.sentimentRow}>
                      <Text style={styles.sentimentLabel}>Overall</Text>
                      <Text style={styles.sentimentValue}>
                        {currentAnalysis.market_sentiment.overall_sentiment ?? 'N/A'}
                      </Text>
                    </View>
                  </Surface>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 3,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  analyzeButton: {
    marginTop: spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorMuted,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    flex: 1,
  },
  results: {
    marginTop: spacing.lg,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  stockInfo: {
    flex: 1,
  },
  stockTicker: {
    color: colors.text,
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
  },
  stockName: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  recommendationCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  reasons: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reasonText: {
    color: colors.text,
    fontSize: fontSize.sm,
    flex: 1,
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
  scoreBreakdown: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  scoreItem: {
    flex: 1,
    backgroundColor: Platform.select({
      ios: colors.ios.glassRegular,
      android: colors.android.surfaceContainerHigh,
      default: colors.surface,
    }),
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: Platform.OS === 'android' ? 0 : 1,
    borderColor: Platform.OS === 'ios' ? colors.ios.glassBorderMedium : colors.border,
    ...Platform.select({
      android: { elevation: 1 },
      default: {},
    }),
  },
  scoreLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
  },
  sentimentCard: {
    gap: spacing.sm,
  },
  sentimentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sentimentLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  sentimentValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
