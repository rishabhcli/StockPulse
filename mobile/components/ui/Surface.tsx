import React from 'react';
import { Platform, View, StyleSheet, ViewStyle } from 'react-native';
import { Surface as PaperSurface } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { colors, borderRadius, shadows, animation } from '../../constants/theme';

// ============================================================================
// iOS 26 LIQUID GLASS — expo-glass-effect
// GlassView renders native UIVisualEffectView with Liquid Glass material.
// Falls back to regular View on iOS < 26 and other platforms.
// ============================================================================

let GlassView: any = null;
let GlassContainer: any = null;
let _isGlassAvailable: boolean | null = null;

try {
  const glassModule = require('expo-glass-effect');
  GlassView = glassModule.GlassView;
  GlassContainer = glassModule.GlassContainer;
  // Cache the availability check
  _isGlassAvailable = glassModule.isGlassEffectAPIAvailable?.() ?? false;
} catch {
  _isGlassAvailable = false;
}

/**
 * Returns true if the device supports iOS 26 Liquid Glass.
 * Caches the result for performance.
 */
export const isLiquidGlassAvailable = (): boolean => {
  return Platform.OS === 'ios' && (_isGlassAvailable === true);
};

/**
 * Re-export GlassContainer for use in parent components that want to
 * group multiple glass surfaces (enables merging/morphing effect).
 */
export { GlassContainer };

// ============================================================================
// TYPES
// ============================================================================

type GlassEffectStyle = 'clear' | 'regular';
type SurfaceVariant = 'default' | 'elevated' | 'outlined' | 'filled';

interface SurfaceProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: SurfaceVariant;
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  interactive?: boolean;
  glassEffectStyle?: GlassEffectStyle;
  animated?: boolean;
}

// ============================================================================
// iOS GLASS FALLBACK STYLES (for iOS < 26)
// ============================================================================

const getIOSFallbackStyle = (variant: SurfaceVariant): ViewStyle => {
  switch (variant) {
    case 'elevated':
      return {
        backgroundColor: colors.ios.glassThick,
        borderWidth: 1,
        borderColor: colors.ios.glassBorderLight,
      };
    case 'outlined':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.ios.glassBorderLight,
      };
    case 'filled':
      return {
        backgroundColor: colors.surface,
        borderWidth: 0,
      };
    default:
      return {
        backgroundColor: colors.ios.glassRegular,
        borderWidth: 1,
        borderColor: colors.ios.glassBorderMedium,
      };
  }
};

// ============================================================================
// ANDROID M3 STYLES
// ============================================================================

const getAndroidElevation = (level: number): ViewStyle => {
  return {
    backgroundColor: colors.android.surfaceContainer,
    ...(level > 0 && {
      // @ts-ignore — M3 tonal elevation overlay
      overlayColor: colors.android[`elevation${level}` as keyof typeof colors.android] || colors.android.elevation1,
    }),
  };
};

// ============================================================================
// COMPONENT
// ============================================================================

export function Surface({
  children,
  style,
  variant = 'default',
  elevation = 1,
  interactive = false,
  glassEffectStyle = 'regular',
  animated = false,
}: SurfaceProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (interactive && animated) {
      scale.value = withSpring(0.98, animation.spring.snappy);
    }
  };

  const handlePressOut = () => {
    if (interactive && animated) {
      scale.value = withSpring(1, animation.spring.bouncy);
    }
  };

  // ============================================================================
  // iOS 26+ WITH NATIVE LIQUID GLASS
  // ============================================================================
  if (isLiquidGlassAvailable() && GlassView) {
    // Determine glass style based on variant
    const effectStyle: GlassEffectStyle =
      variant === 'outlined' ? 'clear' :
      variant === 'elevated' ? 'regular' :
      glassEffectStyle;

    // For 'filled' variant, skip glass entirely (solid background per Apple HIG)
    if (variant === 'filled') {
      const content = (
        <View style={[styles.base, { backgroundColor: colors.surface, borderWidth: 0 }, style]}>
          {children}
        </View>
      );
      if (animated) {
        return <Animated.View style={animatedStyle}>{content}</Animated.View>;
      }
      return content;
    }

    // Use native GlassView for all other variants
    // IMPORTANT: Do NOT set opacity < 1 on GlassView or parents (causes render issues)
    const content = (
      <GlassView
        style={[styles.base, styles.glassBase, style]}
        glassEffectStyle={effectStyle}
        isInteractive={interactive}
        tintColor={variant === 'elevated' ? undefined : colors.ios.glassTint}
      >
        {children}
      </GlassView>
    );

    if (animated) {
      // Note: Reanimated opacity animation on parent breaks GlassView.
      // Only scale transforms are safe.
      return <Animated.View style={animatedStyle}>{content}</Animated.View>;
    }
    return content;
  }

  // ============================================================================
  // iOS FALLBACK (< iOS 26) — Glassmorphism approximation
  // ============================================================================
  if (Platform.OS === 'ios') {
    const fallbackStyle = getIOSFallbackStyle(variant);
    const elevatedShadow = variant === 'elevated' ? {
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
    } : {};

    const content = (
      <View style={[styles.base, styles.iosFallbackBase, fallbackStyle, elevatedShadow, shadows.md, style]}>
        {/* Inner glow effect — simulates Liquid Glass highlight */}
        <View style={styles.iosInnerGlow} pointerEvents="none" />
        {children}
      </View>
    );

    if (animated) {
      return <Animated.View style={animatedStyle}>{content}</Animated.View>;
    }
    return content;
  }

  // ============================================================================
  // ANDROID (MATERIAL DESIGN 3)
  // ============================================================================
  if (Platform.OS === 'android') {
    const m3Style = getAndroidElevation(elevation);

    return (
      <PaperSurface
        style={[styles.base, styles.androidBase, m3Style, style]}
        elevation={elevation as any}
      >
        {children}
      </PaperSurface>
    );
  }

  // ============================================================================
  // WEB (CSS GLASSMORPHISM)
  // ============================================================================
  const content = (
    <View style={[styles.base, styles.webGlass, style]}>
      {children}
    </View>
  );

  if (animated) {
    return <Animated.View style={animatedStyle}>{content}</Animated.View>;
  }
  return content;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.xl,
    padding: 16,
    overflow: 'hidden',
  },

  // iOS 26 Liquid Glass base
  glassBase: {
    // GlassView handles its own background — no backgroundColor needed.
    // Border radius is inherited from style. Keep overflow hidden for clip.
  },

  // iOS fallback styles
  iosFallbackBase: {
    shadowColor: colors.ios.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  iosInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.ios.vibrancyLight,
  },

  // Android M3 styles
  androidBase: {
    backgroundColor: colors.android.surfaceContainer,
  },

  // Web glassmorphism
  webGlass: {
    backgroundColor: colors.web.glassBackground,
    borderWidth: 1,
    borderColor: colors.web.glassBorder,
    // @ts-ignore - web only
    backdropFilter: `blur(${colors.web.backdropBlur})`,
    WebkitBackdropFilter: `blur(${colors.web.backdropBlur})`,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
});

export default Surface;
