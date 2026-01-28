import React, { useCallback, useEffect } from 'react';
import {
  Platform,
  Pressable,
  Text,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
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
// ANIMATED COMPONENT
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// TYPES
// ============================================================================

interface GlassPillProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap | React.ReactNode;
  style?: ViewStyle;
  size?: 'small' | 'medium';
  selectedColor?: string;
  animationDelay?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GlassPill({
  label,
  selected = false,
  onPress,
  disabled = false,
  icon,
  style,
  size = 'medium',
  selectedColor = colors.primary,
  animationDelay = 0,
}: GlassPillProps) {
  const pressed = useSharedValue(0);
  const entranceOpacity = useSharedValue(animationDelay > 0 ? 0 : 1);
  const entranceScale = useSharedValue(animationDelay > 0 ? 0.9 : 1);

  // Entrance animation
  useEffect(() => {
    if (animationDelay > 0) {
      entranceOpacity.value = withDelay(animationDelay, withTiming(1, { duration: 200 }));
      entranceScale.value = withDelay(animationDelay, withSpring(1, animation.spring.gentle));
    }
  }, [animationDelay]);

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(1, animation.spring.snappy);
  }, []);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, animation.spring.bouncy);
  }, []);

  const handlePress = useCallback(async () => {
    if (disabled || !onPress) return;

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress();
  }, [disabled, onPress]);

  // Animated press feedback - scale only (no opacity for glass)
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.95]);
    return {
      opacity: entranceOpacity.value,
      transform: [{ scale: scale * entranceScale.value }],
    };
  });

  const sizeStyles = size === 'small' ? styles.pillSmall : styles.pillMedium;
  const textSizeStyles = size === 'small' ? styles.textSmall : styles.textMedium;

  const useGlass = isLiquidGlassAvailable() && GlassView && Platform.OS === 'ios';

  // Render icon - supports both string icon names and ReactNode
  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={16}
          color={selected ? selectedColor : colors.textMuted}
        />
      );
    }
    return icon;
  };

  // ============================================================================
  // iOS 26+ LIQUID GLASS PILL
  // ============================================================================
  if (useGlass) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || !onPress}
        style={[styles.pillBase, sizeStyles, animatedStyle, style]}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
      >
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle={selected ? 'regular' : 'clear'}
          isInteractive
          tintColor={selected ? colors.ios.glassTintActive : undefined}
        />
        <View style={styles.pillContent}>
          {renderIcon() && <View style={styles.iconContainer}>{renderIcon()}</View>}
          <Text
            style={[
              styles.text,
              textSizeStyles,
              selected ? [styles.textSelected, { color: selectedColor }] : styles.textDefault,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </AnimatedPressable>
    );
  }

  // ============================================================================
  // iOS FALLBACK & WEB & ANDROID
  // ============================================================================
  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || !onPress}
      style={[
        styles.pillBase,
        sizeStyles,
        Platform.select({
          ios: selected ? styles.pillSelectedIOS : styles.pillDefaultIOS,
          android: selected ? styles.pillSelectedAndroid : styles.pillDefaultAndroid,
          web: selected ? styles.pillSelectedWeb : styles.pillDefaultWeb,
        }),
        disabled && styles.pillDisabled,
        animatedStyle,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      {/* iOS fallback inner glow */}
      {Platform.OS === 'ios' && selected && (
        <View style={styles.iosInnerGlow} pointerEvents="none" />
      )}
      <View style={styles.pillContent}>
        {renderIcon() && <View style={styles.iconContainer}>{renderIcon()}</View>}
        <Text
          style={[
            styles.text,
            textSizeStyles,
            selected ? [styles.textSelected, { color: selectedColor }] : styles.textDefault,
            disabled && styles.textDisabled,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  pillBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  pillSmall: {
    height: 28,
    paddingHorizontal: spacing.sm + 2,
  },
  pillMedium: {
    height: 36,
    paddingHorizontal: spacing.md,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconContainer: {
    marginRight: spacing.xs,
  },

  // iOS default (fallback)
  pillDefaultIOS: {
    backgroundColor: colors.ios.glassUltraThin,
    borderWidth: 1,
    borderColor: colors.ios.glassBorderMedium,
  },
  pillSelectedIOS: {
    backgroundColor: colors.ios.glassRegular,
    borderWidth: 1,
    borderColor: colors.ios.glassBorderLight,
  },

  // Android M3
  pillDefaultAndroid: {
    backgroundColor: colors.android.surfaceContainer,
  },
  pillSelectedAndroid: {
    backgroundColor: colors.android.secondaryContainer,
  },

  // Web
  pillDefaultWeb: {
    backgroundColor: colors.web.glassBackground,
    borderWidth: 1,
    borderColor: colors.web.glassBorder,
  },
  pillSelectedWeb: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },

  pillDisabled: {
    opacity: 0.5,
  },

  // iOS inner glow
  iosInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.ios.vibrancyMedium,
  },

  // Text styles
  text: {
    fontWeight: '500',
  },
  textSmall: {
    fontSize: fontSize.xs,
  },
  textMedium: {
    fontSize: fontSize.sm,
  },
  textDefault: {
    color: colors.textSecondary,
  },
  textSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  textDisabled: {
    color: colors.textDisabled,
  },
});

export default GlassPill;
