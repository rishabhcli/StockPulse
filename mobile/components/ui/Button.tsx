import React from 'react';
import {
  Platform,
  Pressable,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing, fontSize, animation } from '../../constants/theme';
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

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  haptic?: boolean;
}

// ============================================================================
// ANIMATED WRAPPER
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// COMPONENT
// ============================================================================

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  haptic = true,
}: ButtonProps) {
  const pressed = useSharedValue(0);

  const handlePressIn = () => {
    pressed.value = withSpring(1, animation.spring.snappy);
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0, animation.spring.bouncy);
  };

  const handlePress = async () => {
    if (disabled || loading) return;

    // Haptic feedback
    if (haptic && Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onPress();
  };

  // ============================================================================
  // ANDROID - USE MATERIAL DESIGN 3 BUTTON
  // ============================================================================
  if (Platform.OS === 'android') {
    const mode = variant === 'primary' ? 'contained' :
                 variant === 'secondary' ? 'contained-tonal' :
                 variant === 'outline' ? 'outlined' :
                 variant === 'ghost' ? 'text' :
                 variant === 'danger' ? 'contained' : 'contained';

    const buttonColor = variant === 'danger' ? colors.error : undefined;

    return (
      <PaperButton
        mode={mode}
        onPress={handlePress}
        disabled={disabled}
        loading={loading}
        style={[fullWidth && styles.fullWidth, style]}
        labelStyle={textStyle}
        icon={icon ? () => icon : undefined}
        buttonColor={buttonColor}
        compact={size === 'small'}
      >
        {title}
      </PaperButton>
    );
  }

  // ============================================================================
  // iOS 26+ & iOS FALLBACK & WEB — CUSTOM STYLED BUTTON
  // ============================================================================

  // Animated press feedback
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.96]);
    return {
      transform: [{ scale }],
    };
  });

  // Size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { button: styles.small, text: styles.smallText };
      case 'large':
        return { button: styles.large, text: styles.largeText };
      default:
        return { button: styles.medium, text: styles.mediumText };
    }
  };

  // Variant styles — Platform-aware
  const getVariantStyles = () => {
    if (Platform.OS === 'ios') {
      switch (variant) {
        case 'primary':
          return { button: styles.iosPrimary, text: styles.iosPrimaryText };
        case 'secondary':
          return { button: styles.iosSecondary, text: styles.iosSecondaryText };
        case 'outline':
          return { button: styles.iosOutline, text: styles.iosOutlineText };
        case 'ghost':
          return { button: styles.iosGhost, text: styles.iosGhostText };
        case 'danger':
          return { button: styles.iosDanger, text: styles.iosDangerText };
        default:
          return { button: styles.iosPrimary, text: styles.iosPrimaryText };
      }
    } else {
      // Web
      switch (variant) {
        case 'primary':
          return { button: styles.webPrimary, text: styles.webPrimaryText };
        case 'secondary':
          return { button: styles.webSecondary, text: styles.webSecondaryText };
        case 'outline':
          return { button: styles.webOutline, text: styles.webOutlineText };
        case 'ghost':
          return { button: styles.webGhost, text: styles.webGhostText };
        case 'danger':
          return { button: styles.webDanger, text: styles.webDangerText };
        default:
          return { button: styles.webPrimary, text: styles.webPrimaryText };
      }
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();

  // ============================================================================
  // iOS 26+ LIQUID GLASS BUTTONS
  // Per Apple HIG: Use glass for secondary/ghost buttons (navigation layer).
  // Primary buttons stay solid (they are action-focused, not chrome).
  // ============================================================================
  const useGlassButton = isLiquidGlassAvailable() && GlassView &&
    (variant === 'secondary' || variant === 'ghost');

  if (useGlassButton) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.base,
          sizeStyles.button,
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          animatedStyle,
          style,
        ]}
      >
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle={variant === 'ghost' ? 'clear' : 'regular'}
          isInteractive
          tintColor={colors.ios.glassTint}
        />
        {loading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
            <Text style={[styles.text, sizeStyles.text, styles.iosSecondaryText, textStyle]}>
              {title}
            </Text>
            {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
          </View>
        )}
      </AnimatedPressable>
    );
  }

  // ============================================================================
  // STANDARD BUTTON (iOS fallback + Web)
  // ============================================================================

  const buttonStyles = [
    styles.base,
    sizeStyles.button,
    variantStyles.button,
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    sizeStyles.text,
    variantStyles.text,
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[buttonStyles, animatedStyle]}
    >
      {/* iOS fallback: Inner glow for glass-style buttons */}
      {Platform.OS === 'ios' && (variant === 'secondary' || variant === 'ghost') && (
        <View style={styles.iosInnerGlow} pointerEvents="none" />
      )}

      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? colors.background : colors.primary}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={textStyles}>{title}</Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </AnimatedPressable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },

  // ============================================================================
  // SIZES
  // ============================================================================
  small: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    minHeight: 32,
  },
  medium: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  large: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },

  // ============================================================================
  // TEXT SIZES
  // ============================================================================
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: fontSize.sm,
  },
  mediumText: {
    fontSize: fontSize.md,
  },
  largeText: {
    fontSize: fontSize.lg,
  },

  // ============================================================================
  // iOS VARIANTS
  // ============================================================================
  iosPrimary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iosPrimaryText: {
    color: colors.background,
  },
  iosSecondary: {
    backgroundColor: colors.ios.glassRegular,
    borderWidth: 1,
    borderColor: colors.ios.glassBorderMedium,
  },
  iosSecondaryText: {
    color: colors.text,
  },
  iosOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  iosOutlineText: {
    color: colors.primary,
  },
  iosGhost: {
    backgroundColor: 'transparent',
  },
  iosGhostText: {
    color: colors.primary,
  },
  iosDanger: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iosDangerText: {
    color: '#ffffff',
  },
  iosInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.ios.vibrancyLight,
  },

  // ============================================================================
  // WEB VARIANTS (Glassmorphism)
  // ============================================================================
  webPrimary: {
    backgroundColor: colors.primary,
  },
  webPrimaryText: {
    color: colors.background,
  },
  webSecondary: {
    backgroundColor: colors.web.glassBackground,
    borderWidth: 1,
    borderColor: colors.web.glassBorder,
  },
  webSecondaryText: {
    color: colors.text,
  },
  webOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  webOutlineText: {
    color: colors.primary,
  },
  webGhost: {
    backgroundColor: 'transparent',
  },
  webGhostText: {
    color: colors.primary,
  },
  webDanger: {
    backgroundColor: colors.error,
  },
  webDangerText: {
    color: '#ffffff',
  },

  // ============================================================================
  // STATES
  // ============================================================================
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: colors.textDisabled,
  },

  // ============================================================================
  // ICONS
  // ============================================================================
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});

export default Button;
