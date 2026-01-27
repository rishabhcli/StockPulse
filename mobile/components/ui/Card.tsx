import React from 'react';
import { Platform, View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing, shadows, animation } from '../../constants/theme';
import { isLiquidGlassAvailable } from './Surface';

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

type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: CardVariant;
  disabled?: boolean;
  haptic?: boolean;
}

// ============================================================================
// ANIMATED PRESSABLE WRAPPER
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// COMPONENT
// ============================================================================

export function Card({
  children,
  style,
  onPress,
  variant = 'default',
  disabled = false,
  haptic = true,
}: CardProps) {
  const pressed = useSharedValue(0);

  const handlePressIn = () => {
    pressed.value = withSpring(1, animation.spring.snappy);
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0, animation.spring.bouncy);
  };

  const handlePress = async () => {
    if (disabled || !onPress) return;

    if (haptic && Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress();
  };

  // Animated press feedback
  // Note: Avoid opacity < 1 on GlassView or parents as it breaks rendering
  // See: https://docs.expo.dev/versions/v54.0.0/sdk/glass-effect/#known-issues
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.98]);
    return {
      transform: [{ scale }],
    };
  });

  // ============================================================================
  // iOS 26+ LIQUID GLASS CARD
  // Per Apple HIG: Glass for navigation chrome only.
  // Cards are content items, so use 'clear' glass (more transparent) or
  // only apply glass to elevated/default variants that serve as chrome.
  // ============================================================================
  const useGlassCard = isLiquidGlassAvailable() && GlassView && variant !== 'filled';

  if (useGlassCard) {
    const effectStyle = variant === 'outlined' ? 'clear' : 'regular';
    const isInteractive = !!onPress;

    if (!onPress) {
      return (
        <GlassView
          style={[styles.base, style]}
          glassEffectStyle={effectStyle}
          isInteractive={false}
        >
          {children}
        </GlassView>
      );
    }

    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[styles.base, disabled && styles.disabled, animatedStyle, style]}
      >
        {/* Key ensures remount if isInteractive changes (it's immutable after mount) */}
        <GlassView
          key="interactive-glass"
          style={StyleSheet.absoluteFill}
          glassEffectStyle={effectStyle}
          isInteractive
        />
        {children}
      </AnimatedPressable>
    );
  }

  // ============================================================================
  // FALLBACK — Platform-specific non-Glass rendering
  // ============================================================================

  const getVariantStyle = (): ViewStyle[] => {
    const baseStyles: ViewStyle[] = [styles.base];

    if (Platform.OS === 'ios') {
      baseStyles.push(styles.iosBase);
      switch (variant) {
        case 'elevated':
          baseStyles.push(styles.iosElevated);
          break;
        case 'outlined':
          baseStyles.push(styles.iosOutlined);
          break;
        case 'filled':
          baseStyles.push(styles.iosFilled);
          break;
        default:
          baseStyles.push(styles.iosDefault);
      }
    } else if (Platform.OS === 'android') {
      baseStyles.push(styles.androidBase);
      switch (variant) {
        case 'elevated':
          baseStyles.push(styles.androidElevated);
          break;
        case 'outlined':
          baseStyles.push(styles.androidOutlined);
          break;
        case 'filled':
          baseStyles.push(styles.androidFilled);
          break;
        default:
          baseStyles.push(styles.androidDefault);
      }
    } else {
      baseStyles.push(styles.webBase);
      switch (variant) {
        case 'elevated':
          baseStyles.push(styles.webElevated);
          break;
        case 'outlined':
          baseStyles.push(styles.webOutlined);
          break;
        case 'filled':
          baseStyles.push(styles.webFilled);
          break;
        default:
          baseStyles.push(styles.webDefault);
      }
    }

    if (disabled) {
      baseStyles.push(styles.disabled);
    }

    return baseStyles;
  };

  // Non-interactive card
  if (!onPress) {
    return (
      <View style={[...getVariantStyle(), style]}>
        {/* iOS: Inner highlight for glass effect */}
        {Platform.OS === 'ios' && variant !== 'outlined' && (
          <View style={styles.iosInnerHighlight} pointerEvents="none" />
        )}
        {children}
      </View>
    );
  }

  // Interactive card with animation
  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[...getVariantStyle(), animatedStyle, style]}
    >
      {/* iOS: Inner highlight for glass effect */}
      {Platform.OS === 'ios' && variant !== 'outlined' && (
        <View style={styles.iosInnerHighlight} pointerEvents="none" />
      )}
      {children}
    </AnimatedPressable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    overflow: 'hidden',
  },

  // ============================================================================
  // iOS STYLES (Liquid Glass fallback)
  // ============================================================================
  iosBase: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iosDefault: {
    backgroundColor: colors.ios.glassRegular,
    borderWidth: 1,
    borderColor: colors.ios.glassBorderMedium,
  },
  iosElevated: {
    backgroundColor: colors.ios.glassThick,
    borderWidth: 1,
    borderColor: colors.ios.glassBorderLight,
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  iosOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.ios.glassBorderLight,
  },
  iosFilled: {
    backgroundColor: colors.surface,
    borderWidth: 0,
  },
  iosInnerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.ios.vibrancyLight,
  },

  // ============================================================================
  // ANDROID STYLES (Material Design 3)
  // ============================================================================
  androidBase: {
    elevation: 0,
  },
  androidDefault: {
    backgroundColor: colors.android.surfaceContainer,
    borderWidth: 0,
  },
  androidElevated: {
    backgroundColor: colors.android.surfaceContainerHigh,
    elevation: 3,
  },
  androidOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.android.outlineVariant,
  },
  androidFilled: {
    backgroundColor: colors.android.surfaceContainerHighest,
  },

  // ============================================================================
  // WEB STYLES (Glassmorphism)
  // ============================================================================
  webBase: {
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  webDefault: {
    backgroundColor: colors.web.glassBackground,
    borderWidth: 1,
    borderColor: colors.web.glassBorder,
    // @ts-ignore
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  webElevated: {
    backgroundColor: colors.web.glassBackground,
    borderWidth: 1,
    borderColor: colors.web.glassBorder,
    // @ts-ignore
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  webOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  webFilled: {
    backgroundColor: colors.surface,
  },

  // ============================================================================
  // STATES
  // ============================================================================
  disabled: {
    opacity: 0.5,
  },
});

export default Card;
