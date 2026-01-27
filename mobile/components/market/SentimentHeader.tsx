import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, borderRadius, spacing, fontSize, animation } from '../../constants/theme';
import { MarketSentiment } from '../../lib/types';
import Surface, { GlassContainer, isLiquidGlassAvailable } from '../ui/Surface';
import TappableTerm from '../sheets/TappableTerm';

// ============================================================================
// iOS 26 LIQUID GLASS — expo-glass-effect
// ============================================================================

let GlassView: any = null;

try {
  const glassModule = require('expo-glass-effect');
  GlassView = glassModule.GlassView;
} catch {
  // Not available
}

// ============================================================================
// TYPES
// ============================================================================

interface SentimentHeaderProps {
  sentiment: MarketSentiment;
}

interface SentimentItemProps {
  label: string;
  value: string | number;
  signal?: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  index: number;
  glossaryKey?: string;
}

// ============================================================================
// SENTIMENT ITEM COMPONENT
// ============================================================================

function SentimentItem({ label, value, signal, color, icon, index, glossaryKey }: SentimentItemProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withDelay(index * 100, withTiming(1, { duration: 300 }));
    scale.value = withDelay(index * 100, withSpring(1, animation.spring.gentle));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.item, animatedStyle]}>
      {glossaryKey ? (
        <TappableTerm displayName={label} glossaryKey={glossaryKey} style={styles.label} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
      {icon ? (
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color={color || colors.text} />
        </View>
      ) : (
        <Text style={[styles.value, color ? { color } : undefined]}>
          {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}
        </Text>
      )}
      {signal && <Text style={styles.signal}>{signal}</Text>}
    </Animated.View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SentimentHeader({ sentiment }: SentimentHeaderProps) {
  const getFearGreedColor = (index: number) => {
    if (index >= 75) return colors.strongBuy;
    if (index >= 55) return colors.buy;
    if (index >= 45) return colors.warning;
    if (index >= 25) return colors.sell;
    return colors.strongSell;
  };

  const getVixColor = (vix: number) => {
    if (vix < 15) return colors.strongBuy;
    if (vix < 20) return colors.buy;
    if (vix < 25) return colors.warning;
    if (vix < 30) return colors.sell;
    return colors.strongSell;
  };

  const getSentimentIcon = (sentiment: string | undefined): keyof typeof Ionicons.glyphMap => {
    switch ((sentiment ?? '').toLowerCase()) {
      case 'bullish':
        return 'trending-up';
      case 'bearish':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getSentimentColor = (sentiment: string | undefined) => {
    switch ((sentiment ?? '').toLowerCase()) {
      case 'bullish':
        return colors.strongBuy;
      case 'bearish':
        return colors.error;
      default:
        return colors.warning;
    }
  };

  const sentimentItems = (
    <View style={styles.row}>
      {/* VIX */}
      <SentimentItem
        label="VIX"
        value={sentiment.vix}
        signal={sentiment.vix_signal}
        color={getVixColor(sentiment.vix)}
        index={0}
        glossaryKey="vix"
      />

      {/* Divider */}
      <View style={styles.divider} />

      {/* Fear & Greed */}
      <SentimentItem
        label="Fear & Greed"
        value={sentiment.fear_greed_index}
        signal={sentiment.fear_greed_label}
        color={getFearGreedColor(sentiment.fear_greed_index)}
        index={1}
        glossaryKey="fear_greed"
      />

      {/* Divider */}
      <View style={styles.divider} />

      {/* 10Y Treasury */}
      <SentimentItem
        label="10Y"
        value={`${sentiment.treasury_10y.toFixed(2)}%`}
        signal="Treasury"
        index={2}
      />

      {/* Divider */}
      <View style={styles.divider} />

      {/* Overall Sentiment */}
      <SentimentItem
        label="Market"
        value=""
        signal={sentiment.overall_sentiment}
        icon={getSentimentIcon(sentiment.overall_sentiment)}
        color={getSentimentColor(sentiment.overall_sentiment)}
        index={3}
      />
    </View>
  );

  // ============================================================================
  // iOS 26+ — Wrap in GlassContainer for Liquid Glass grouping/morphing
  // When multiple GlassView elements are inside a GlassContainer, they
  // visually merge when close together (the signature Liquid Glass effect).
  // ============================================================================
  if (isLiquidGlassAvailable() && GlassView && GlassContainer) {
    return (
      <View style={styles.outerContainer}>
        <GlassContainer spacing={16}>
          <GlassView
            style={[styles.glassContainer]}
            glassEffectStyle="regular"
          >
            {/* iOS: Decorative accent line */}
            <View style={styles.iosGradient} pointerEvents="none" />
            {sentimentItems}
          </GlassView>
        </GlassContainer>
      </View>
    );
  }

  // ============================================================================
  // FALLBACK — Use Surface component (handles iOS < 26, Android, Web)
  // ============================================================================
  return (
    <Surface style={styles.container} variant="elevated">
      {/* iOS Decorative Gradient */}
      {Platform.OS === 'ios' && <View style={styles.iosGradient} pointerEvents="none" />}
      {sentimentItems}
    </Surface>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  glassContainer: {
    borderRadius: borderRadius.xl,
    padding: 16,
    overflow: 'hidden',
  },
  iosGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  value: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  iconContainer: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signal: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 44,
    backgroundColor: Platform.OS === 'ios'
      ? colors.ios.separator
      : colors.android.outlineVariant,
  },
});

export default SentimentHeader;
