import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  RefreshControl,
  ActivityIndicator,
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
import { colors, spacing, fontSize, fontFamily, borderRadius, animation, getScoreColor } from '../../constants/theme';
import { PennyStock } from '../../lib/types';
import { getPennyStocks } from '../../lib/api';
import { formatPercent, formatPrice } from '../../lib/utils';
import TappableTerm from '../../components/sheets/TappableTerm';
import { useSheetContext } from '../../components/sheets/SheetProvider';

// ============================================================================
// CONSTANTS
// ============================================================================

type CategoryType = 'all' | 'strong_buy' | 'buy' | 'hold' | 'sell';

interface CategoryConfig {
  key: CategoryType;
  label: string;
  color: string;
  scoreRange: [number, number];
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'all', label: 'All', color: colors.primary, scoreRange: [0, 100], icon: 'apps' },
  { key: 'strong_buy', label: 'Strong Buy', color: colors.strongBuy, scoreRange: [75, 100], icon: 'arrow-up-circle' },
  { key: 'buy', label: 'Buy', color: colors.buy, scoreRange: [60, 74], icon: 'trending-up' },
  { key: 'hold', label: 'Hold', color: colors.hold, scoreRange: [45, 59], icon: 'pause-circle' },
  { key: 'sell', label: 'Sell/Short', color: colors.sell, scoreRange: [0, 44], icon: 'trending-down' },
];

// ============================================================================
// CATEGORY TAB
// ============================================================================

interface CategoryTabProps {
  config: CategoryConfig;
  count: number;
  selected: boolean;
  onPress: () => void;
}

function CategoryTab({ config, count, selected, onPress }: CategoryTabProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, animation.spring.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animation.spring.bouncy);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.categoryTab, selected && { backgroundColor: config.color }]}
      >
        <Ionicons
          name={config.icon}
          size={16}
          color={selected ? colors.background : colors.textMuted}
        />
        <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>
          {config.label}
        </Text>
        <View style={[styles.countBadge, selected && styles.countBadgeSelected]}>
          <Text style={[styles.countText, selected && styles.countTextSelected]}>{count}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// PENNY STOCK CARD (Sophisticated Design)
// ============================================================================

interface PennyStockCardProps {
  stock: PennyStock;
  index: number;
  onPress: () => void;
}

function PennyStockCard({ stock, index, onPress }: PennyStockCardProps) {
  const scoreColor = getScoreColor(stock.score);
  const isPositive = stock.change_pct >= 0;
  const price = stock.current_price || stock.price;

  // Volatility indicator
  const getVolatilityLabel = (vol: number) => {
    if (vol >= 80) return { label: 'Extreme', color: colors.error };
    if (vol >= 60) return { label: 'High', color: colors.sell };
    if (vol >= 40) return { label: 'Moderate', color: colors.hold };
    return { label: 'Low', color: colors.buy };
  };

  // RSI indicator
  const getRSISignal = (rsi: number) => {
    if (rsi >= 70) return { label: 'Overbought', color: colors.error };
    if (rsi <= 30) return { label: 'Oversold', color: colors.strongBuy };
    return { label: 'Neutral', color: colors.textMuted };
  };

  const volatility = getVolatilityLabel(stock.volatility);
  const rsiSignal = getRSISignal(stock.rsi);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(200)}>
      <Pressable onPress={onPress} style={styles.card}>
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.scoreCircle, { backgroundColor: scoreColor }]}>
              <Text style={styles.scoreText}>{Math.round(stock.score)}</Text>
            </View>
            <View>
              <Text style={styles.ticker}>{stock.ticker}</Text>
              <Text style={styles.sector}>{stock.sector}</Text>
            </View>
          </View>
          <View style={styles.cardHeaderRight}>
            <Text style={styles.price}>{formatPrice(price)}</Text>
            <View style={[styles.changeChip, isPositive ? styles.changePositive : styles.changeNegative]}>
              <Text style={[styles.changeText, isPositive ? styles.textPositive : styles.textNegative]}>
                {isPositive ? '+' : ''}{formatPercent(stock.change_pct)}
              </Text>
            </View>
          </View>
        </View>

        {/* Company Name */}
        <Text style={styles.companyName} numberOfLines={1}>{stock.company_name}</Text>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          {/* RSI */}
          <View style={styles.metricItem}>
            <TappableTerm displayName="RSI" glossaryKey="rsi" />
            <View style={styles.metricValue}>
              <Text style={[styles.metricNumber, { color: rsiSignal.color }]}>
                {stock.rsi.toFixed(1)}
              </Text>
              <Text style={[styles.metricSignal, { color: rsiSignal.color }]}>
                {rsiSignal.label}
              </Text>
            </View>
          </View>

          {/* Volatility */}
          <View style={styles.metricItem}>
            <TappableTerm displayName="Volatility" glossaryKey="volatility" />
            <View style={styles.metricValue}>
              <Text style={[styles.metricNumber, { color: volatility.color }]}>
                {stock.volatility.toFixed(0)}%
              </Text>
              <Text style={[styles.metricSignal, { color: volatility.color }]}>
                {volatility.label}
              </Text>
            </View>
          </View>

          {/* Recommendation */}
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Signal</Text>
            <View style={[styles.recommendationBadge, { backgroundColor: scoreColor + '20', borderColor: scoreColor }]}>
              <Text style={[styles.recommendationText, { color: scoreColor }]}>
                {stock.recommendation}
              </Text>
            </View>
          </View>
        </View>

        {/* Description Preview */}
        {stock.description && (
          <Text style={styles.description} numberOfLines={2}>
            {stock.description}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// INFO HEADER
// ============================================================================

function InfoHeader() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <View style={styles.infoHeader}>
      <View style={styles.infoHeaderLeft}>
        <Text style={styles.title}>Penny Stocks</Text>
        <Pressable onPress={() => setShowInfo(!showInfo)} style={styles.infoButton}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
        </Pressable>
      </View>
      <Text style={styles.subtitle}>High-risk, high-reward opportunities</Text>
      
      {showInfo && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Ionicons name="warning" size={16} color={colors.hold} />
            <Text style={styles.infoText}>
              Penny stocks (under $5) are highly volatile and speculative
            </Text>
          </View>
          <View style={styles.infoRow}>
            <TappableTerm displayName="RSI" glossaryKey="rsi" />
            <Text style={styles.infoText}>measures momentum (under 30 = oversold)</Text>
          </View>
          <View style={styles.infoRow}>
            <TappableTerm displayName="Volatility" glossaryKey="volatility" />
            <Text style={styles.infoText}>measures price swing risk</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PennyStocksScreen() {
  const { openStockSheet } = useSheetContext();
  const [stocks, setStocks] = useState<PennyStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');

  // Fetch penny stocks
  const fetchStocks = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getPennyStocks();
      setStocks(data);
    } catch (error) {
      console.error('Failed to fetch penny stocks:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const handleRefresh = () => {
    fetchStocks(true);
  };

  const handleCategoryChange = async (category: CategoryType) => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    setSelectedCategory(category);
  };

  // Count stocks per category
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryType, number> = {
      all: stocks.length,
      strong_buy: 0,
      buy: 0,
      hold: 0,
      sell: 0,
    };

    stocks.forEach((stock) => {
      const score = stock.score;
      if (score >= 75) counts.strong_buy++;
      else if (score >= 60) counts.buy++;
      else if (score >= 45) counts.hold++;
      else counts.sell++;
    });

    return counts;
  }, [stocks]);

  // Filter stocks by category
  const filteredStocks = useMemo(() => {
    if (selectedCategory === 'all') return stocks;

    const config = CATEGORIES.find((c) => c.key === selectedCategory);
    if (!config) return stocks;

    return stocks.filter(
      (s) => s.score >= config.scoreRange[0] && s.score <= config.scoreRange[1]
    );
  }, [stocks, selectedCategory]);

  // Sort by score descending
  const sortedStocks = useMemo(() => {
    return [...filteredStocks].sort((a, b) => b.score - a.score);
  }, [filteredStocks]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <InfoHeader />

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {CATEGORIES.map((config) => (
          <CategoryTab
            key={config.key}
            config={config}
            count={categoryCounts[config.key]}
            selected={selectedCategory === config.key}
            onPress={() => handleCategoryChange(config.key)}
          />
        ))}
      </ScrollView>

      {/* Stock List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading penny stocks...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {sortedStocks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Penny Stocks</Text>
              <Text style={styles.emptyText}>
                {selectedCategory === 'all'
                  ? 'Unable to load stocks. Pull to refresh.'
                  : `No stocks in the "${CATEGORIES.find((c) => c.key === selectedCategory)?.label}" category.`}
              </Text>
            </View>
          ) : (
            sortedStocks.map((stock, index) => (
              <PennyStockCard
                key={stock.ticker}
                stock={stock}
                index={index}
                onPress={() => openStockSheet(stock.ticker)}
              />
            ))
          )}
        </ScrollView>
      )}
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

  // Info Header
  infoHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  infoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.sansBold,
  },
  infoButton: {
    padding: 4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    flex: 1,
  },

  // Category Tabs
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: 18,
    backgroundColor: colors.surfaceVariant,
    gap: spacing.xs,
  },
  categoryLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  categoryLabelSelected: {
    color: colors.background,
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  countBadgeSelected: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  countText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  countTextSelected: {
    color: 'rgba(255,255,255,0.9)',
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl * 4,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  ticker: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  sector: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  price: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  changeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  changePositive: {
    backgroundColor: colors.successMuted,
  },
  changeNegative: {
    backgroundColor: colors.errorMuted,
  },
  changeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  textPositive: {
    color: colors.strongBuy,
  },
  textNegative: {
    color: colors.error,
  },
  companyName: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metricValue: {
    marginTop: 4,
  },
  metricNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  metricSignal: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  recommendationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  recommendationText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Description
  description: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
    lineHeight: 16,
  },

  // Loading & Empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
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
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
