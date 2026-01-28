import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAnalysisStore } from '../../stores/useAnalysisStore';
import { colors, spacing, fontSize, fontFamily, borderRadius, animation, getScoreColor } from '../../constants/theme';
import { ScreenerResult, StockAnalysis } from '../../lib/types';
import { useSheetContext } from '../../components/sheets/SheetProvider';
import { formatPercent, formatPrice } from '../../lib/utils';
import { GlassSearchBar } from '../../components/ui/GlassSearchBar';
import Surface from '../../components/ui/Surface';
import ScoreCircle from '../../components/charts/ScoreCircle';
import Badge from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';

// ============================================================================
// TYPES
// ============================================================================

type FilterType = 'all' | 'strong_buys' | 'buys' | 'holds' | 'sells' | 'strong_sells';
type SortType = 'score' | 'change' | 'alpha';

interface FilterConfig {
  key: FilterType;
  label: string;
  color: string;
  scoreRange: [number, number];
}

const FILTERS: FilterConfig[] = [
  { key: 'all', label: 'All', color: colors.primary, scoreRange: [0, 100] },
  { key: 'strong_buys', label: 'Strong Buy', color: colors.strongBuy, scoreRange: [75, 100] },
  { key: 'buys', label: 'Buy', color: colors.buy, scoreRange: [60, 74] },
  { key: 'holds', label: 'Hold', color: colors.hold, scoreRange: [45, 59] },
  { key: 'sells', label: 'Sell', color: colors.sell, scoreRange: [30, 44] },
  { key: 'strong_sells', label: 'Strong Sell', color: colors.strongSell, scoreRange: [0, 29] },
];

const SORT_OPTIONS: { key: SortType; label: string }[] = [
  { key: 'score', label: 'Score' },
  { key: 'change', label: 'Change %' },
  { key: 'alpha', label: 'A-Z' },
];

// ============================================================================
// FILTER CHIP
// ============================================================================

interface FilterChipProps {
  config: FilterConfig;
  count: number;
  selected: boolean;
  onPress: () => void;
}

function FilterChip({ config, count, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: config.color }]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{config.label}</Text>
      <View style={[styles.countBadge, selected && styles.countBadgeSelected]}>
        <Text style={[styles.countText, selected && styles.countTextSelected]}>{count}</Text>
      </View>
    </Pressable>
  );
}

// ============================================================================
// ANALYSIS RESULT CARD
// ============================================================================

interface AnalysisCardProps {
  analysis: StockAnalysis;
  onClose: () => void;
}

function AnalysisCard({ analysis, onClose }: AnalysisCardProps) {
  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.analysisCard}>
      {/* Header */}
      <View style={styles.analysisHeader}>
        <View>
          <Text style={styles.analysisTicker}>{analysis.ticker}</Text>
          <Text style={styles.analysisCompany}>{analysis.company_name}</Text>
        </View>
        <ScoreCircle score={analysis.investment_score} size={80} />
      </View>

      {/* Price */}
      <View style={styles.priceRow}>
        <Text style={styles.analysisPrice}>{formatPrice(analysis.current_price)}</Text>
        <View style={[
          styles.priceChangeChip,
          analysis.price_change_pct >= 0 ? styles.positive : styles.negative
        ]}>
          <Text style={[
            styles.priceChangeText,
            analysis.price_change_pct >= 0 ? styles.textPositive : styles.textNegative
          ]}>
            {analysis.price_change_pct >= 0 ? '+' : ''}{formatPercent(analysis.price_change_pct)}
          </Text>
        </View>
      </View>

      {/* Recommendation */}
      <View style={styles.recommendationRow}>
        <Badge
          label={analysis.recommendation}
          variant={
            analysis.investment_score >= 60 ? 'success' :
            analysis.investment_score >= 45 ? 'warning' : 'error'
          }
          size="medium"
        />
      </View>

      {/* Score Breakdown */}
      <View style={styles.scoreBreakdown}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Technical</Text>
          <Text style={[styles.scoreValue, { color: getScoreColor(analysis.technical_score) }]}>
            {analysis.technical_score}
          </Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Fundamental</Text>
          <Text style={[styles.scoreValue, { color: getScoreColor(analysis.fundamental_score) }]}>
            {analysis.fundamental_score}
          </Text>
        </View>
      </View>

      {/* Reasons */}
      {analysis.recommendation_reasons.length > 0 && (
        <View style={styles.reasonsContainer}>
          {analysis.recommendation_reasons.slice(0, 3).map((reason, index) => (
            <View key={index} style={styles.reasonItem}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={getScoreColor(analysis.investment_score)}
              />
              <Text style={styles.reasonText} numberOfLines={2}>
                {typeof reason === 'string' ? reason : String(reason)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Close Button */}
      <Pressable onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>Back to Screener</Text>
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// STOCK ROW
// ============================================================================

interface StockRowProps {
  stock: ScreenerResult;
  onPress: () => void;
  index: number;
}

function StockRow({ stock, onPress, index }: StockRowProps) {
  const scoreColor = getScoreColor(stock.investment_score);
  const isPositive = stock.price_change_pct >= 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 25).duration(180)}>
      <Pressable onPress={onPress} style={styles.stockRow}>
        <View style={[styles.stockScore, { backgroundColor: scoreColor }]}>
          <Text style={styles.stockScoreText}>{Math.round(stock.investment_score)}</Text>
        </View>
        <View style={styles.stockInfo}>
          <Text style={styles.stockTicker}>{stock.ticker}</Text>
          <Text style={styles.stockCompany} numberOfLines={1}>{stock.company_name}</Text>
        </View>
        <View style={styles.stockPriceCol}>
          <Text style={styles.stockPrice}>{formatPrice(stock.current_price)}</Text>
          <Text style={[styles.stockChange, isPositive ? styles.textPositive : styles.textNegative]}>
            {isPositive ? '+' : ''}{formatPercent(stock.price_change_pct)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ScreenerScreen() {
  const { openStockSheet } = useSheetContext();
  const {
    screenerResults,
    currentFilter,
    isScreening,
    screen,
    setFilter,
    currentAnalysis,
    isAnalyzing,
    analyze,
    clearAnalysis,
  } = useAnalysisStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('score');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Fetch on mount
  useEffect(() => {
    fetchData('all');
  }, []);

  // Show analysis when loaded
  useEffect(() => {
    if (currentAnalysis && !isAnalyzing) {
      setShowAnalysis(true);
    }
  }, [currentAnalysis, isAnalyzing]);

  const fetchData = async (filter: FilterType) => {
    await screen(filter, 100);
    setLastUpdated(new Date());
  };

  const handleFilterChange = async (filter: FilterType) => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    setFilter(filter);
    setLastUpdated(new Date());
  };

  const handleRefresh = () => {
    fetchData(currentFilter as FilterType);
  };

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    await analyze(searchQuery.trim().toUpperCase());
  };

  const handleSelectSuggestion = async (ticker: string) => {
    setSearchQuery(ticker);
    await analyze(ticker);
  };

  const handleCloseAnalysis = () => {
    setShowAnalysis(false);
    clearAnalysis();
    setSearchQuery('');
  };

  // Compute filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: screenerResults.length,
      strong_buys: 0,
      buys: 0,
      holds: 0,
      sells: 0,
      strong_sells: 0,
    };

    screenerResults.forEach((stock) => {
      const score = stock.investment_score;
      if (score >= 75) counts.strong_buys++;
      else if (score >= 60) counts.buys++;
      else if (score >= 45) counts.holds++;
      else if (score >= 30) counts.sells++;
      else counts.strong_sells++;
    });

    return counts;
  }, [screenerResults]);

  // Filter and sort results
  const displayedStocks = useMemo(() => {
    let filtered = screenerResults;
    if (currentFilter !== 'all') {
      const config = FILTERS.find((f) => f.key === currentFilter);
      if (config) {
        filtered = screenerResults.filter(
          (s) => s.investment_score >= config.scoreRange[0] && s.investment_score <= config.scoreRange[1]
        );
      }
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'score': return b.investment_score - a.investment_score;
        case 'change': return b.price_change_pct - a.price_change_pct;
        case 'alpha': return a.ticker.localeCompare(b.ticker);
        default: return 0;
      }
    });
  }, [screenerResults, currentFilter, sortBy]);

  // Build suggestions from screener results
  const suggestions = useMemo(() => {
    return screenerResults.map((s) => ({
      ticker: s.ticker,
      company_name: s.company_name,
      investment_score: s.investment_score,
    }));
  }, [screenerResults]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* SEARCH BAR */}
        <View style={styles.searchSection}>
          <GlassSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmit={handleSearchSubmit}
            suggestions={suggestions}
            onSelectSuggestion={handleSelectSuggestion}
            placeholder="Search ticker (e.g., AAPL)"
            isLoading={isAnalyzing}
            showSuggestions={!showAnalysis}
          />
        </View>

        {/* LOADING ANALYSIS */}
        {isAnalyzing && (
          <Loading message={`Analyzing ${searchQuery.toUpperCase()}...`} />
        )}

        {/* ANALYSIS RESULT */}
        {showAnalysis && currentAnalysis && !isAnalyzing && (
          <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
            <AnalysisCard analysis={currentAnalysis} onClose={handleCloseAnalysis} />
          </ScrollView>
        )}

        {/* SCREENER LIST */}
        {!showAnalysis && !isAnalyzing && (
          <>
            {/* Filters */}
            <View style={styles.filtersSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {FILTERS.map((config) => (
                  <FilterChip
                    key={config.key}
                    config={config}
                    count={filterCounts[config.key]}
                    selected={currentFilter === config.key}
                    onPress={() => handleFilterChange(config.key)}
                  />
                ))}
              </ScrollView>

              {/* Sort + Summary */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {displayedStocks.length} stocks
                </Text>
                <Text style={styles.summaryDot}>•</Text>
                <Pressable
                  onPress={() => {
                    const idx = SORT_OPTIONS.findIndex((s) => s.key === sortBy);
                    setSortBy(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].key);
                  }}
                  style={styles.sortButton}
                >
                  <Ionicons name="swap-vertical" size={14} color={colors.textSecondary} />
                  <Text style={styles.sortText}>{SORT_OPTIONS.find((s) => s.key === sortBy)?.label}</Text>
                </Pressable>
              </View>
            </View>

            {/* Stock List */}
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isScreening && screenerResults.length > 0}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary}
                />
              }
            >
              {displayedStocks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Stocks Found</Text>
                  <Text style={styles.emptyText}>Try a different filter or refresh</Text>
                </View>
              ) : (
                displayedStocks.map((stock, index) => (
                  <StockRow
                    key={stock.ticker}
                    stock={stock}
                    index={index}
                    onPress={() => openStockSheet(stock.ticker)}
                  />
                ))
              )}
            </ScrollView>
          </>
        )}
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
  flex: {
    flex: 1,
  },

  // Search
  searchSection: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    zIndex: 100,
  },

  // Filters
  filtersSection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    gap: 4,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.background,
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 18,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  countBadgeSelected: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  countText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  countTextSelected: {
    color: 'rgba(255,255,255,0.9)',
  },

  // Summary Row
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  summaryText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  summaryDot: {
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '500',
  },

  // List
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl * 4,
  },

  // Stock Row
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stockScore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockScoreText: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  stockInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  stockTicker: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  stockCompany: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  stockPriceCol: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  stockChange: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  textPositive: {
    color: colors.strongBuy,
  },
  textNegative: {
    color: colors.error,
  },

  // Analysis Card
  analysisCard: {
    margin: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  analysisTicker: {
    color: colors.text,
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
  },
  analysisCompany: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  analysisPrice: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  priceChangeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  positive: {
    backgroundColor: colors.successMuted,
  },
  negative: {
    backgroundColor: colors.errorMuted,
  },
  priceChangeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  recommendationRow: {
    marginTop: spacing.md,
  },
  scoreBreakdown: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  scoreItem: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  scoreLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  reasonsContainer: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  reasonText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
  },
  closeButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
