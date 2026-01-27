import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
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
import { colors, borderRadius, spacing, fontSize, animation } from '../../constants/theme';
import { IndexData } from '../../lib/types';
import { formatPrice, formatPercent } from '../../lib/utils';
import { GlassContainer, isLiquidGlassAvailable } from '../ui/Surface';

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

interface MarketStripProps {
  indices: IndexData[];
  onIndexPress?: (index: IndexData) => void;
}

interface MarketIndexItemProps {
  index: IndexData;
  onPress?: () => void;
  itemIndex: number;
}

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// MARKET INDEX ITEM
// ============================================================================

function MarketIndexItem({ index, onPress, itemIndex }: MarketIndexItemProps) {
  const isPositive = index.change_pct >= 0;
  const pressed = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(itemIndex * 80, withTiming(1, { duration: 300 }));
    translateX.value = withDelay(itemIndex * 80, withSpring(0, animation.spring.gentle));
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
    onPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.95]);
    return {
      opacity: opacity.value,
      transform: [{ translateX: translateX.value }, { scale }],
    };
  });

  const itemContent = (
    <>
      {/* Symbol */}
      <Text style={styles.symbol}>{index.symbol}</Text>

      {/* Price */}
      <Text style={styles.price}>{formatPrice(index.price)}</Text>

      {/* Change Chip */}
      <View style={[styles.changeContainer, isPositive ? styles.positive : styles.negative]}>
        <Ionicons
          name={isPositive ? 'caret-up' : 'caret-down'}
          size={10}
          color={isPositive ? colors.strongBuy : colors.error}
        />
        <Text style={[styles.change, isPositive ? styles.positiveText : styles.negativeText]}>
          {formatPercent(index.change_pct)}
        </Text>
      </View>
    </>
  );

  // iOS 26+: Use GlassView with interactive press effect
  if (isLiquidGlassAvailable() && GlassView) {
    return (
      <AnimatedPressable
        style={[styles.glassItemWrapper, animatedStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <GlassView
          style={styles.glassItem}
          glassEffectStyle="regular"
          isInteractive
        >
          {itemContent}
        </GlassView>
      </AnimatedPressable>
    );
  }

  // Fallback: iOS < 26 / Android / Web
  return (
    <AnimatedPressable
      style={[
        styles.item,
        Platform.OS === 'ios' && styles.itemIOS,
        Platform.OS === 'android' && styles.itemAndroid,
        animatedStyle,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {/* iOS Inner Glow */}
      {Platform.OS === 'ios' && <View style={styles.iosInnerGlow} pointerEvents="none" />}
      {itemContent}
    </AnimatedPressable>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MarketStrip({ indices, onIndexPress }: MarketStripProps) {
  const useGlass = isLiquidGlassAvailable() && GlassView && GlassContainer;

  // iOS 26+: Wrap items in GlassContainer so adjacent items visually merge
  if (useGlass) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        decelerationRate="fast"
        snapToInterval={116}
      >
        <GlassContainer spacing={8}>
          <View style={styles.glassRow}>
            {indices.map((index, i) => (
              <MarketIndexItem
                key={index.symbol}
                index={index}
                onPress={() => onIndexPress?.(index)}
                itemIndex={i}
              />
            ))}
          </View>
        </GlassContainer>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      decelerationRate="fast"
      snapToInterval={116}
    >
      {indices.map((index, i) => (
        <MarketIndexItem
          key={index.symbol}
          index={index}
          onPress={() => onIndexPress?.(index)}
          itemIndex={i}
        />
      ))}
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  glassRow: {
    flexDirection: 'row',
  },

  // iOS 26 Glass item
  glassItemWrapper: {
    marginRight: spacing.sm,
    minWidth: 108,
    overflow: 'hidden',
  },
  glassItem: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
  },

  // Fallback item
  item: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.sm,
    minWidth: 108,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  itemIOS: {
    backgroundColor: colors.ios.glassRegular,
    borderColor: colors.ios.glassBorderMedium,
  },
  itemAndroid: {
    backgroundColor: colors.android.surfaceContainer,
    borderWidth: 0,
    elevation: 1,
  },
  iosInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.ios.vibrancyLight,
  },
  symbol: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  price: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  positive: {
    backgroundColor: colors.successMuted,
  },
  negative: {
    backgroundColor: colors.errorMuted,
  },
  change: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginLeft: 2,
  },
  positiveText: {
    color: colors.strongBuy,
  },
  negativeText: {
    color: colors.error,
  },
});

export default MarketStrip;
