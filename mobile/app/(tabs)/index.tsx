import React, { useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useMarketStore } from '../../stores/useMarketStore';
import { colors, spacing, fontSize, borderRadius, animation } from '../../constants/theme';
import { isLiquidGlassAvailable } from '../../components/ui/Surface';
import SentimentHeader from '../../components/market/SentimentHeader';
import MarketStrip from '../../components/market/MarketStrip';
import StockCard from '../../components/stocks/StockCard';
import { Loading } from '../../components/ui/Loading';

// ============================================================================
// iOS 26 LIQUID GLASS
// ============================================================================

let GlassView: any = null;

try {
  const glassModule = require('expo-glass-effect');
  GlassView = glassModule.GlassView;
} catch {
  // Not available
}

// ============================================================================
// ANIMATED PRESSABLE
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// MINI STOCK CARD (Platform-adaptive)
// ============================================================================

interface MiniStockCardProps {
  stock: any;
  index: number;
}

function MiniStockCard({ stock, index }: MiniStockCardProps) {
  const router = useRouter();
  const isPositive = stock.price_change_pct >= 0;
  const pressed = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = withDelay(index * 60, withTiming(1, { duration: 250 }));
    translateY.value = withDelay(index * 60, withSpring(0, animation.spring.gentle));
  }, []);

  const handlePressIn = () => {
    pressed.value = withSpring(1, animation.spring.snappy);
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0, animation.spring.bouncy);
  };

  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/stock/${stock.ticker}`);
  };

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.97]);
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }, { scale }],
    };
  });

  const cardContent = (
    <>
      <View style={styles.miniCardLeft}>
        <Text style={styles.miniTicker}>{stock.ticker}</Text>
        <Text style={styles.miniPrice}>
          ${typeof stock.current_price === 'number' ? stock.current_price.toFixed(2) : stock.current_price}
        </Text>
      </View>
      <View style={[styles.miniChangeChip, isPositive ? styles.miniChangePositive : styles.miniChangeNegative]}>
        <Ionicons
          name={isPositive ? 'caret-up' : 'caret-down'}
          size={9}
          color={isPositive ? colors.strongBuy : colors.strongSell}
        />
        <Text style={[styles.miniChange, isPositive ? styles.positive : styles.negative]}>
          {isPositive ? '+' : ''}{typeof stock.price_change_pct === 'number' ? stock.price_change_pct.toFixed(2) : stock.price_change_pct}%
        </Text>
      </View>
    </>
  );

  // iOS 26+: Use native Liquid Glass
  if (isLiquidGlassAvailable() && GlassView) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.miniCardGlassWrapper, animatedStyle]}
      >
        <GlassView
          style={styles.miniCardGlass}
          glassEffectStyle="regular"
          isInteractive
        >
          {cardContent}
        </GlassView>
      </AnimatedPressable>
    );
  }

  // Fallback: iOS < 26 / Android / Web
  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.miniCard,
        Platform.OS === 'ios' && styles.miniCardIOS,
        Platform.OS === 'android' && styles.miniCardAndroid,
        animatedStyle,
      ]}
    >
      {/* iOS inner glow */}
      {Platform.OS === 'ios' && <View style={styles.miniCardIOSGlow} pointerEvents="none" />}
      {cardContent}
    </AnimatedPressable>
  );
}

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

function SectionHeader({ title, subtitle, icon, iconColor }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderRow}>
        {icon && (
          <Ionicons name={icon} size={18} color={iconColor || colors.text} style={styles.sectionIcon} />
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

// ============================================================================
// OVERVIEW SCREEN
// ============================================================================

export default function OverviewScreen() {
  const router = useRouter();
  const {
    sentiment,
    topPicks,
    gainers,
    losers,
    indices,
    isLoading,
    isRefreshing,
    error,
    fetchSnapshot,
    refresh,
  } = useMarketStore();

  useEffect(() => {
    fetchSnapshot();
  }, []);

  const handleRefresh = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    refresh();
  };

  if (isLoading && !sentiment) {
    return <Loading fullScreen message="Loading market data..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={
              Platform.OS === 'android' ? colors.android.surfaceContainerHigh : undefined
            }
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>StockPulse</Text>
          <Text style={styles.subtitle}>Real-time Investment Analysis</Text>
        </View>

        {/* Market Sentiment */}
        {sentiment && <SentimentHeader sentiment={sentiment} />}

        {/* Market Indices Strip */}
        {indices.length > 0 && (
          <View style={styles.section}>
            <MarketStrip
              indices={indices}
              onIndexPress={(index) => router.push(`/stock/${index.symbol}`)}
            />
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={[
            styles.errorContainer,
            Platform.OS === 'ios' && styles.errorContainerIOS,
            Platform.OS === 'android' && styles.errorContainerAndroid,
          ]}>
            <Ionicons name="warning" size={20} color={colors.strongSell} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Top Picks */}
        {topPicks.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Top Picks" subtitle="Highest scoring stocks" />
            <View style={styles.cardList}>
              {topPicks.map((stock) => (
                <StockCard key={stock.ticker} stock={stock} variant="compact" />
              ))}
            </View>
          </View>
        )}

        {/* Gainers & Losers */}
        <View style={styles.gainersLosersContainer}>
          {/* Gainers */}
          {gainers.length > 0 && (
            <View style={styles.halfSection}>
              <SectionHeader title="Gainers" icon="trending-up" iconColor={colors.strongBuy} />
              <View style={styles.miniCardList}>
                {gainers.slice(0, 4).map((stock, i) => (
                  <MiniStockCard key={stock.ticker} stock={stock} index={i} />
                ))}
              </View>
            </View>
          )}

          {/* Losers */}
          {losers.length > 0 && (
            <View style={styles.halfSection}>
              <SectionHeader title="Losers" icon="trending-down" iconColor={colors.strongSell} />
              <View style={styles.miniCardList}>
                {losers.slice(0, 4).map((stock, i) => (
                  <MiniStockCard key={stock.ticker} stock={stock} index={i} />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 3,
  },

  // ==========================================================================
  // HEADER
  // ==========================================================================
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 2,
  },

  // ==========================================================================
  // SECTIONS
  // ==========================================================================
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  cardList: {
    gap: spacing.sm,
  },

  // ==========================================================================
  // GAINERS / LOSERS
  // ==========================================================================
  gainersLosersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  halfSection: {
    flex: 1,
  },
  miniCardList: {
    gap: spacing.xs + 2,
  },

  // ==========================================================================
  // MINI STOCK CARD — iOS 26 Glass
  // ==========================================================================
  miniCardGlassWrapper: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  miniCardGlass: {
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },

  // ==========================================================================
  // MINI STOCK CARD — Fallback
  // ==========================================================================
  miniCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  // iOS Glass styling
  miniCardIOS: {
    backgroundColor: colors.ios.glassRegular,
    borderColor: colors.ios.glassBorderMedium,
    shadowColor: colors.ios.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  miniCardIOSGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.ios.vibrancyLight,
  },
  // Android M3 styling
  miniCardAndroid: {
    backgroundColor: colors.android.surfaceContainerHigh,
    borderWidth: 0,
    elevation: 1,
    borderRadius: borderRadius.md,
  },
  miniCardLeft: {
    flex: 1,
  },
  miniTicker: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  miniPrice: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  miniChangeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  miniChangePositive: {
    backgroundColor: colors.successMuted,
  },
  miniChangeNegative: {
    backgroundColor: colors.errorMuted,
  },
  miniChange: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginLeft: 2,
  },
  positive: {
    color: colors.strongBuy,
  },
  negative: {
    color: colors.strongSell,
  },

  // ==========================================================================
  // ERROR
  // ==========================================================================
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorMuted,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  errorContainerIOS: {
    borderWidth: 1,
    borderColor: `${colors.strongSell}30`,
  },
  errorContainerAndroid: {
    elevation: 1,
  },
  errorText: {
    color: colors.strongSell,
    fontSize: fontSize.sm,
    flex: 1,
  },
});
