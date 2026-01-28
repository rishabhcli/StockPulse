import React, { useCallback } from 'react';
import {
  Platform,
  Pressable,
  Text,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  interpolateColor,
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
// ANIMATED COMPONENT
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// TYPES
// ============================================================================

interface GlassMenuItemProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
  chevron?: boolean;
  destructive?: boolean;
  style?: ViewStyle;
  rightElement?: React.ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GlassMenuItem({
  label,
  icon,
  onPress,
  disabled = false,
  chevron = true,
  destructive = false,
  style,
  rightElement,
}: GlassMenuItemProps) {
  const pressed = useSharedValue(0);

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

  // Animated press feedback - scale + background highlight
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.98]);
    const backgroundColor = interpolateColor(
      pressed.value,
      [0, 1],
      ['transparent', colors.ios.glassTintHover]
    );
    return {
      transform: [{ scale }],
      backgroundColor,
    };
  });

  const textColor = destructive ? colors.error : colors.text;
  const iconColor = destructive ? colors.error : colors.textSecondary;

  const useGlass = isLiquidGlassAvailable() && GlassView && Platform.OS === 'ios';

  // ============================================================================
  // iOS 26+ LIQUID GLASS MENU ITEM
  // ============================================================================
  if (useGlass) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || !onPress}
        style={[styles.menuItem, animatedStyle, style]}
        accessibilityRole="button"
      >
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle="clear"
          isInteractive
        />
        <View style={styles.menuContent}>
          <View style={styles.menuLeft}>
            {icon && (
              <View style={styles.iconContainer}>
                <Ionicons name={icon} size={20} color={iconColor} />
              </View>
            )}
            <Text style={[styles.menuLabel, { color: textColor }]}>
              {label}
            </Text>
          </View>
          <View style={styles.menuRight}>
            {rightElement}
            {chevron && (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            )}
          </View>
        </View>
        {/* Bottom separator */}
        <View style={styles.separator} />
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
        styles.menuItem,
        Platform.select({
          ios: styles.menuItemIOS,
          android: styles.menuItemAndroid,
          web: styles.menuItemWeb,
        }),
        disabled && styles.menuDisabled,
        animatedStyle,
        style,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.menuContent}>
        <View style={styles.menuLeft}>
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons name={icon} size={20} color={iconColor} />
            </View>
          )}
          <Text style={[styles.menuLabel, { color: textColor }]}>
            {label}
          </Text>
        </View>
        <View style={styles.menuRight}>
          {rightElement}
          {chevron && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMuted}
            />
          )}
        </View>
      </View>
      {/* Bottom separator */}
      <View style={styles.separator} />
    </AnimatedPressable>
  );
}

// ============================================================================
// GLASS ICON BUTTON — for header buttons like Settings
// ============================================================================

interface GlassIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
  style?: ViewStyle;
}

export function GlassIconButton({
  icon,
  onPress,
  disabled = false,
  size = 44,
  style,
}: GlassIconButtonProps) {
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(1, animation.spring.snappy);
  }, []);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, animation.spring.bouncy);
  }, []);

  const handlePress = useCallback(async () => {
    if (disabled || !onPress) return;

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onPress();
  }, [disabled, onPress]);

  // Animated press feedback
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.9]);
    return {
      transform: [{ scale }],
    };
  });

  const useGlass = isLiquidGlassAvailable() && GlassView && Platform.OS === 'ios';

  // ============================================================================
  // iOS 26+ LIQUID GLASS ICON BUTTON
  // ============================================================================
  if (useGlass) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || !onPress}
        style={[
          styles.iconButton,
          { width: size, height: size, borderRadius: size / 2 },
          animatedStyle,
          style,
        ]}
        accessibilityRole="button"
      >
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle="regular"
          isInteractive
          tintColor={colors.ios.glassTint}
        />
        <Ionicons name={icon} size={size * 0.5} color={colors.text} />
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
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        Platform.select({
          ios: styles.iconButtonIOS,
          android: styles.iconButtonAndroid,
          web: styles.iconButtonWeb,
        }),
        disabled && styles.menuDisabled,
        animatedStyle,
        style,
      ]}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={size * 0.5} color={colors.text} />
    </AnimatedPressable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Menu item
  menuItem: {
    minHeight: 48,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  menuItemIOS: {
    backgroundColor: 'transparent',
  },
  menuItemAndroid: {
    backgroundColor: 'transparent',
  },
  menuItemWeb: {
    backgroundColor: 'transparent',
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    zIndex: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconContainer: {
    width: 28,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: fontSize.md,
    fontWeight: '400',
  },
  separator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md + 28 + spacing.sm, // Aligned with text
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Platform.OS === 'ios' ? colors.ios.separatorThin : colors.border,
  },
  menuDisabled: {
    opacity: 0.5,
  },

  // Icon button
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconButtonIOS: {
    backgroundColor: colors.ios.glassRegular,
    borderWidth: 1,
    borderColor: colors.ios.glassBorderMedium,
  },
  iconButtonAndroid: {
    backgroundColor: colors.android.surfaceContainerHigh,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  iconButtonWeb: {
    backgroundColor: colors.web.glassBackground,
    borderWidth: 1,
    borderColor: colors.web.glassBorder,
  },
});

export default GlassMenuItem;
