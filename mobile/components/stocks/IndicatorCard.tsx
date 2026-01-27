import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, borderRadius, spacing, fontSize, animation } from '../../constants/theme';
import { useEffect } from 'react';
import TappableTerm from '../sheets/TappableTerm';
import { getGlossaryKey } from '../../lib/glossary';

// ============================================================================
// TYPES
// ============================================================================

interface IndicatorCardProps {
  name: string;
  value: string | number;
  signal: 'bullish' | 'bearish' | 'neutral';
  description?: string;
  icon?: string;
  index?: number; // For staggered animations
}

interface IndicatorGridProps {
  indicators: IndicatorCardProps[];
}

// ============================================================================
// INDICATOR CARD COMPONENT
// ============================================================================

export function IndicatorCard({ name, value, signal, description, icon, index = 0 }: IndicatorCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    // Staggered entrance animation
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(
      index * 50,
      withSpring(0, animation.spring.gentle)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const getSignalColor = () => {
    switch (signal) {
      case 'bullish':
        return colors.strongBuy;
      case 'bearish':
        return colors.error;
      default:
        return colors.warning;
    }
  };

  const getSignalIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (signal) {
      case 'bullish':
        return 'trending-up';
      case 'bearish':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getSignalLabel = () => {
    switch (signal) {
      case 'bullish':
        return 'Bullish';
      case 'bearish':
        return 'Bearish';
      default:
        return 'Neutral';
    }
  };

  const signalColor = getSignalColor();

  return (
    <Animated.View
      style={[
        styles.container,
        Platform.OS === 'ios' && styles.containerIOS,
        Platform.OS === 'android' && styles.containerAndroid,
        animatedStyle,
      ]}
    >
      {/* iOS Inner Glow */}
      {Platform.OS === 'ios' && <View style={styles.iosInnerGlow} pointerEvents="none" />}

      {/* Header */}
      <View style={styles.header}>
        {getGlossaryKey(name) ? (
          <TappableTerm displayName={name} style={styles.name} />
        ) : (
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        )}
        <View style={[styles.signalBadge, { backgroundColor: `${signalColor}20` }]}>
          <Ionicons name={getSignalIcon()} size={12} color={signalColor} />
        </View>
      </View>

      {/* Value */}
      <Text style={[styles.value, { color: signalColor }]}>
        {typeof value === 'number' ? value.toFixed(2) : value}
      </Text>

      {/* Signal Label */}
      <View style={styles.signalLabelContainer}>
        <View style={[styles.signalDot, { backgroundColor: signalColor }]} />
        <Text style={[styles.signalLabel, { color: signalColor }]}>{getSignalLabel()}</Text>
      </View>

      {/* Description */}
      {description && (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      )}
    </Animated.View>
  );
}

// ============================================================================
// INDICATOR GRID COMPONENT
// ============================================================================

export function IndicatorGrid({ indicators }: IndicatorGridProps) {
  return (
    <View style={styles.grid}>
      {indicators.map((indicator, index) => (
        <View key={index} style={styles.gridItem}>
          <IndicatorCard {...indicator} index={index} />
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // ============================================================================
  // CONTAINER
  // ============================================================================
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  containerIOS: {
    backgroundColor: colors.ios.glassRegular,
    borderColor: colors.ios.glassBorderMedium,
  },
  containerAndroid: {
    backgroundColor: colors.android.surfaceContainer,
    borderWidth: 0,
    elevation: 1,
  },

  // ============================================================================
  // HEADER
  // ============================================================================
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: spacing.xs,
  },
  signalBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ============================================================================
  // VALUE
  // ============================================================================
  value: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },

  // ============================================================================
  // SIGNAL LABEL
  // ============================================================================
  signalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  signalLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },

  // ============================================================================
  // DESCRIPTION
  // ============================================================================
  description: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
    marginTop: spacing.xs,
  },

  // ============================================================================
  // GRID
  // ============================================================================
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
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

export default IndicatorCard;
