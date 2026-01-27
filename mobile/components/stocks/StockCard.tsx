import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { colors, borderRadius, spacing, fontSize, fontFamily, getScoreColor, animation } from '../../constants/theme';
import { ScreenerResult } from '../../lib/types';
import { formatPrice, formatPercent } from '../../lib/utils';
import Badge from '../ui/Badge';
import { useSheetContext } from '../sheets/SheetProvider';

// ============================================================================
// TYPES
// ============================================================================

interface StockCardProps {
  stock: ScreenerResult;
  variant?: 'compact' | 'full';
  onPress?: () => void;
}

// ============================================================================
// ANIMATED PRESSABLE
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// COMPONENT
// ============================================================================

export function StockCard({ stock, variant = 'compact', onPress }: StockCardProps) {
  const { openStockSheet } = useSheetContext();
  const scoreColor = getScoreColor(stock.investment_score);
  const isPositive = stock.price_change_pct >= 0;
  const pressed = useSharedValue(0);

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
    if (onPress) {
      onPress();
    } else {
      openStockSheet(stock.ticker);
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.98]);
    const opacity = interpolate(pressed.value, [0, 1], [1, 0.9]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const getBadgeVariant = (recommendation: string): 'success' | 'warning' | 'error' | 'neutral' => {
    switch (recommendation.toUpperCase()) {
      case 'STRONG BUY':
      case 'BUY':
        return 'success';
      case 'HOLD':
        return 'warning';
      case 'SELL':
      case 'STRONG SELL':
        return 'error';
      default:
        return 'neutral';
    }
  };

  // ============================================================================
  // COMPACT VARIANT
  // ============================================================================

  if (variant === 'compact') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.compactCard,
          Platform.OS === 'ios' && styles.compactCardIOS,
          Platform.OS === 'android' && styles.compactCardAndroid,
          animatedStyle,
        ]}
      >
        {/* iOS Inner Glow */}
        {Platform.OS === 'ios' && <View style={styles.iosInnerGlow} pointerEvents="none" />}

        <View style={styles.compactLeft}>
          {/* Score Indicator */}
          <View style={styles.scoreIndicatorContainer}>
            <View style={[styles.scoreIndicator, { backgroundColor: scoreColor }]}>
              <Text style={styles.scoreText}>{Math.round(stock.investment_score)}</Text>
            </View>
            {/* Score ring glow */}
            <View style={[styles.scoreRing, { borderColor: scoreColor }]} />
          </View>

          {/* Stock Info */}
          <View style={styles.compactInfo}>
            <Text style={styles.ticker}>{stock.ticker}</Text>
            <Text style={styles.companyName} numberOfLines={1}>
              {stock.company_name}
            </Text>
          </View>
        </View>

        <View style={styles.compactRight}>
          <Text style={styles.price}>{formatPrice(stock.current_price)}</Text>
          <View
            style={[
              styles.changeChip,
              isPositive ? styles.changeChipPositive : styles.changeChipNegative,
            ]}
          >
            <Ionicons
              name={isPositive ? 'caret-up' : 'caret-down'}
              size={10}
              color={isPositive ? colors.strongBuy : colors.error}
            />
            <Text style={[styles.change, isPositive ? styles.positive : styles.negative]}>
              {formatPercent(stock.price_change_pct)}
            </Text>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  // ============================================================================
  // FULL VARIANT
  // ============================================================================

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.fullCard,
        Platform.OS === 'ios' && styles.fullCardIOS,
        Platform.OS === 'android' && styles.fullCardAndroid,
        animatedStyle,
      ]}
    >
      {/* iOS Inner Glow */}
      {Platform.OS === 'ios' && <View style={styles.iosInnerGlow} pointerEvents="none" />}

      {/* Header */}
      <View style={styles.fullHeader}>
        <View style={styles.fullHeaderLeft}>
          <Text style={styles.tickerLarge}>{stock.ticker}</Text>
          <Text style={styles.companyNameFull} numberOfLines={1}>
            {stock.company_name}
          </Text>
        </View>

        {/* Large Score Badge */}
        <View style={styles.scoreBadgeContainer}>
          <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}20` }]}>
            <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>
              {Math.round(stock.investment_score)}
            </Text>
          </View>
          {/* Glow effect */}
          <View style={[styles.scoreBadgeGlow, { backgroundColor: scoreColor }]} />
        </View>
      </View>

      {/* Body */}
      <View style={styles.fullBody}>
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Current Price</Text>
          <Text style={styles.priceLarge}>{formatPrice(stock.current_price)}</Text>
          <View
            style={[
              styles.changeContainerLarge,
              isPositive ? styles.positiveContainer : styles.negativeContainer,
            ]}
          >
            <Ionicons
              name={isPositive ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={isPositive ? colors.strongBuy : colors.error}
            />
            <Text style={[styles.changeLarge, isPositive ? styles.positive : styles.negative]}>
              {formatPercent(stock.price_change_pct)}
            </Text>
          </View>
        </View>

        <View style={styles.recommendationSection}>
          <Badge
            label={stock.recommendation}
            variant={getBadgeVariant(stock.recommendation)}
            size="large"
          />
          {stock.sector && <Text style={styles.sector}>{stock.sector}</Text>}
        </View>
      </View>
    </AnimatedPressable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // ============================================================================
  // COMPACT VARIANT BASE
  // ============================================================================
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  compactCardIOS: {
    backgroundColor: colors.ios.glassRegular,
    borderColor: colors.ios.glassBorderMedium,
  },
  compactCardAndroid: {
    backgroundColor: colors.android.surfaceContainer,
    borderWidth: 0,
    elevation: 1,
  },

  // ============================================================================
  // COMPACT LEFT SECTION
  // ============================================================================
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  scoreIndicatorContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    opacity: 0.3,
  },
  scoreText: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  ticker: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.sansBold,
    letterSpacing: 0.5,
  },
  companyName: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },

  // ============================================================================
  // COMPACT RIGHT SECTION
  // ============================================================================
  compactRight: {
    alignItems: 'flex-end',
  },
  price: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.sansSemibold,
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  changeChipPositive: {
    backgroundColor: colors.successMuted,
  },
  changeChipNegative: {
    backgroundColor: colors.errorMuted,
  },
  change: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginLeft: 2,
  },
  positive: {
    color: colors.strongBuy,
  },
  negative: {
    color: colors.error,
  },

  // ============================================================================
  // FULL VARIANT BASE
  // ============================================================================
  fullCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fullCardIOS: {
    backgroundColor: colors.ios.glassRegular,
    borderColor: colors.ios.glassBorderMedium,
  },
  fullCardAndroid: {
    backgroundColor: colors.android.surfaceContainer,
    borderWidth: 0,
    elevation: 2,
  },

  // ============================================================================
  // FULL HEADER
  // ============================================================================
  fullHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  fullHeaderLeft: {
    flex: 1,
  },
  tickerLarge: {
    color: colors.text,
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  companyNameFull: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  scoreBadgeContainer: {
    position: 'relative',
  },
  scoreBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  scoreBadgeText: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
  },
  scoreBadgeGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: borderRadius.lg + 4,
    opacity: 0.15,
    zIndex: -1,
  },

  // ============================================================================
  // FULL BODY
  // ============================================================================
  fullBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceSection: {},
  priceLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  priceLarge: {
    color: colors.text,
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.serifItalic,
  },
  changeContainerLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  positiveContainer: {
    backgroundColor: colors.successMuted,
  },
  negativeContainer: {
    backgroundColor: colors.errorMuted,
  },
  changeLarge: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  recommendationSection: {
    alignItems: 'flex-end',
  },
  sector: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },

  // ============================================================================
  // iOS EFFECTS
  // ============================================================================
  iosInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.ios.vibrancyLight,
  },
});

export default StockCard;
