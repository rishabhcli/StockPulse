import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors, spacing, fontSize, borderRadius, animation } from '../../constants/theme';
import { formatPrice, formatPercent } from '../../lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface PriceDisplayProps {
  price: number;
  change: number;
  changePercent: number;
  size?: 'small' | 'medium' | 'large';
  animate?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PriceDisplay({
  price,
  change,
  changePercent,
  size = 'medium',
  animate = true,
}: PriceDisplayProps) {
  const isPositive = change >= 0;
  const changeColor = isPositive ? colors.strongBuy : colors.error;

  // Animation values
  const scale = useSharedValue(animate ? 0.9 : 1);
  const opacity = useSharedValue(animate ? 0 : 1);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    if (animate) {
      // Entrance animation
      scale.value = withSpring(1, animation.spring.gentle);
      opacity.value = withTiming(1, { duration: 300 });

      // Flash effect on price change
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 })
      );
    }
  }, [price, animate]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return { price: fontSize.xl, change: fontSize.sm };
      case 'large':
        return { price: fontSize['4xl'], change: fontSize.lg };
      default:
        return { price: fontSize['3xl'], change: fontSize.md };
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return { chip: spacing.xs, container: spacing.sm };
      case 'large':
        return { chip: spacing.sm, container: spacing.md };
      default:
        return { chip: spacing.xs + 2, container: spacing.md };
    }
  };

  const fontSizes = getFontSize();
  const paddings = getPadding();

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* Flash overlay on price change */}
      <Animated.View
        style={[
          styles.flashOverlay,
          { backgroundColor: changeColor },
          flashAnimatedStyle,
        ]}
        pointerEvents="none"
      />

      {/* Main Price */}
      <Text style={[styles.price, { fontSize: fontSizes.price }]}>
        {formatPrice(price)}
      </Text>

      {/* Change Chip */}
      <View
        style={[
          styles.changeContainer,
          isPositive ? styles.positiveContainer : styles.negativeContainer,
          { paddingHorizontal: paddings.chip, paddingVertical: paddings.chip - 2 },
          Platform.OS === 'ios' && styles.changeContainerIOS,
          Platform.OS === 'android' && styles.changeContainerAndroid,
          Platform.OS === 'web' && styles.changeContainerWeb,
        ]}
      >
        <Ionicons
          name={isPositive ? 'caret-up' : 'caret-down'}
          size={fontSizes.change}
          color={changeColor}
        />
        <Text style={[styles.changeText, { color: changeColor, fontSize: fontSizes.change }]}>
          {formatPrice(Math.abs(change))}
        </Text>
        <View style={styles.divider} />
        <Text style={[styles.changePercent, { color: changeColor, fontSize: fontSizes.change }]}>
          {formatPercent(changePercent)}
        </Text>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    position: 'relative',
  },
  flashOverlay: {
    position: 'absolute',
    top: -spacing.sm,
    left: -spacing.sm,
    right: -spacing.sm,
    bottom: -spacing.sm,
    borderRadius: borderRadius.md,
    opacity: 0,
  },
  price: {
    color: colors.text,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  positiveContainer: {
    backgroundColor: colors.successMuted,
  },
  negativeContainer: {
    backgroundColor: colors.errorMuted,
  },
  changeContainerIOS: {
    borderWidth: 1,
    borderColor: colors.ios.glassBorderMedium,
    backgroundColor: undefined,
  },
  changeContainerAndroid: {
    elevation: 1,
    borderRadius: borderRadius.lg,
  },
  changeContainerWeb: {
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderWidth: 1,
    borderColor: colors.web.glassBorder,
  } as any,
  changeText: {
    fontWeight: '600',
    marginLeft: 2,
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  changePercent: {
    fontWeight: '700',
  },
});

export default PriceDisplay;
