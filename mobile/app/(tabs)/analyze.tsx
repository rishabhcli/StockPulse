import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useAnalysisStore } from '../../stores/useAnalysisStore';
import { colors, spacing, fontSize, fontFamily, borderRadius, getScoreColor, animation } from '../../constants/theme';
import { formatPrice, formatPercent } from '../../lib/utils';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Surface from '../../components/ui/Surface';
import { isLiquidGlassAvailable } from '../../components/ui/Surface';
import Badge from '../../components/ui/Badge';
import ScoreCircle from '../../components/charts/ScoreCircle';
import { IndicatorGrid } from '../../components/stocks/IndicatorCard';
import PriceDisplay from '../../components/stocks/PriceDisplay';
import { Loading } from '../../components/ui/Loading';
import TappableTerm from '../../components/sheets/TappableTerm';

// iOS 26 Liquid Glass
let GlassView: any = null;
try {
  const glassModule = require('expo-glass-effect');
  GlassView = glassModule.GlassView;
} catch {}

// ============================================================================
// ANIMATED HEADER
// ============================================================================

function AnimatedHeader() {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-10);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withSpring(0, animation.spring.gentle);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.header, animatedStyle]}>
      <Text style={styles.title}>Analyze Stock</Text>
      <Text style={styles.subtitle}>Get AI-powered investment insights</Text>
    </Animated.View>
  );
}

// ============================================================================
// SEARCH SECTION WITH GLASS
// ============================================================================

interface GlassSearchProps {
  ticker: string;
  onTickerChange: (text: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

function GlassSearch({ ticker, onTickerChange, onAnalyze, isAnalyzing }: GlassSearchProps) {
  const useGlass = isLiquidGlassAvailable() && GlassView;
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.98);

  useEffect(() => {
    opacity.value = withDelay(100, withTiming(1, { duration: 300 }));
    scale.value = withDelay(100, withSpring(1, animation.spring.gentle));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const searchContent = (
    <>
      <Input
        placeholder="Enter ticker symbol (e.g., AAPL)"
        value={ticker}
        onChangeText={onTickerChange}
        autoCapitalize="characters"
        autoCorrect={false}
        leftIcon={<Ionicons name="search" size={20} color={colors.textMuted} />}
        onSubmitEditing={onAnalyze}
        returnKeyType="search"
      />
      <Button
        title="Analyze"
        onPress={onAnalyze}
        loading={isAnalyzing}
        disabled={!ticker.trim()}
        style={styles.analyzeButton}
      />
    </>
  );

  if (useGlass) {
    return (
      <Animated.View style={[styles.searchContainerGlassWrapper, animatedStyle]}>
        <GlassView
          style={styles.searchContainerGlass}
          glassEffectStyle="clear"
          tintColor={colors.ios.glassTint}
        >
          {searchContent}
        </GlassView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.searchContainer, animatedStyle]}>
      {searchContent}
    </Animated.View>
  );
}

// ============================================================================
// ANIMATED SCORE BREAKDOWN ITEM
// ============================================================================

interface ScoreBreakdownItemProps {
  label: string;
  score: number;
  delay: number;
}

function ScoreBreakdownItem({ label, score, delay }: ScoreBreakdownItemProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    scale.value = withDelay(delay, withSpring(1, animation.spring.bouncy));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const useGlass = isLiquidGlassAvailable() && GlassView;

  if (useGlass) {
    return (
      <Animated.View style={[styles.scoreItemGlassWrapper, animatedStyle]}>
        <GlassView style={styles.scoreItemGlass} glassEffectStyle="clear">
          <Text style={styles.scoreLabel}>{label}</Text>
          <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
            {score}
          </Text>
        </GlassView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.scoreItem, animatedStyle]}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
        {score}
      </Text>
    </Animated.View>
  );
}

// ============================================================================
// QUICK PICKS SECTION (shown when no analysis)
// ============================================================================

interface QuickPicksProps {
  stocks: { ticker: string; company_name: string; investment_score: number; current_price: number; price_change_pct: number }[];
  onSelect: (ticker: string) => void;
  isLoading: boolean;
}

function QuickPicks({ stocks, onSelect, isLoading }: QuickPicksProps) {
  if (isLoading) {
    return (
      <View style={styles.quickPicksContainer}>
        <Text style={styles.quickPicksTitle}>Top Picks</Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  if (stocks.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.delay(200)} style={styles.quickPicksContainer}>
      <Text style={styles.quickPicksTitle}>Top Picks</Text>
      <Text style={styles.quickPicksSubtitle}>Tap to analyze</Text>
      <View style={styles.quickPicksGrid}>
        {stocks.slice(0, 6).map((stock, index) => (
          <Animated.View
            key={stock.ticker}
            entering={FadeInDown.delay(100 + index * 50).duration(200)}
          >
            <Pressable
              onPress={() => onSelect(stock.ticker)}
              style={styles.quickPickCard}
            >
              <View style={[styles.quickPickScore, { backgroundColor: getScoreColor(stock.investment_score) }]}>
                <Text style={styles.quickPickScoreText}>{Math.round(stock.investment_score)}</Text>
              </View>
              <View style={styles.quickPickInfo}>
                <Text style={styles.quickPickTicker}>{stock.ticker}</Text>
                <Text style={styles.quickPickPrice}>{formatPrice(stock.current_price)}</Text>
              </View>
              <Text style={[
                styles.quickPickChange,
                stock.price_change_pct >= 0 ? styles.positive : styles.negative
              ]}>
                {stock.price_change_pct >= 0 ? '+' : ''}{formatPercent(stock.price_change_pct)}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnalyzeScreen() {
  const [ticker, setTicker] = useState('');
  const { currentAnalysis, isAnalyzing, error, analyze, clearError, screenerResults, isScreening, screen } = useAnalysisStore();

  // Fetch top picks on mount
  useEffect(() => {
    if (screenerResults.length === 0) {
      screen('strong_buys', 10);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!ticker.trim()) return;
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    clearError();
    await analyze(ticker.trim().toUpperCase());
  };

  const handleQuickPick = async (selected: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTicker(selected);
    clearError();
    await analyze(selected);
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
          {/* Animated Header */}
          <AnimatedHeader />

          {/* Glass Search Container */}
          <GlassSearch
            ticker={ticker}
            onTickerChange={setTicker}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />

          {/* Error */}
          {error && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          {/* Loading */}
          {isAnalyzing && (
            <Loading message={`Analyzing ${ticker.toUpperCase()}...`} />
          )}

          {/* Quick Picks - shown when no analysis */}
          {!currentAnalysis && !isAnalyzing && (
            <QuickPicks
              stocks={screenerResults}
              onSelect={handleQuickPick}
              isLoading={isScreening}
            />
          )}

          {/* Analysis Results */}
          {currentAnalysis && !isAnalyzing && (
            <Animated.View
              style={styles.results}
              entering={FadeInDown.duration(400).delay(100)}
            >
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
                  <ScoreBreakdownItem
                    label="Technical"
                    score={currentAnalysis.technical_score}
                    delay={200}
                  />
                  <ScoreBreakdownItem
                    label="Fundamental"
                    score={currentAnalysis.fundamental_score}
                    delay={300}
                  />
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
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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
    fontFamily: fontFamily.serif,
    fontWeight: '400',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  // Glass search container
  searchContainerGlassWrapper: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  searchContainerGlass: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    overflow: 'hidden',
  },
  // Fallback search container
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
    fontFamily: fontFamily.sansBold,
    marginBottom: spacing.md,
  },
  scoreBreakdown: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  scoreItemGlassWrapper: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  scoreItemGlass: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
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

  // Quick Picks
  quickPicksContainer: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  quickPicksTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  quickPicksSubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  quickPicksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickPickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  quickPickScore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickPickScoreText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontWeight: 'bold',
  },
  quickPickInfo: {
    gap: 2,
  },
  quickPickTicker: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  quickPickPrice: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  quickPickChange: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  positive: {
    color: colors.strongBuy,
  },
  negative: {
    color: colors.error,
  },
});
