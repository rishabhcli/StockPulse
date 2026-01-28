import React, { useCallback } from 'react';
import { Platform, View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, borderRadius, spacing, animation } from '../../constants/theme';
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
// ANIMATED PRESSABLE
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// FLOATING AI BUTTON PROPS
// ============================================================================

interface FloatingAIButtonProps {
  onPress: () => void;
  visible?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FloatingAIButton({ onPress, visible = true }: FloatingAIButtonProps) {
  const insets = useSafeAreaInsets();
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(1, animation.spring.snappy);
  }, []);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, animation.spring.bouncy);
  }, []);

  const handlePress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  }, [onPress]);

  // Animated press feedback - scale only (no opacity to preserve glass effect)
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.9]);
    return {
      transform: [{ scale }],
    };
  });

  if (!visible) return null;

  // Calculate bottom position to sit alongside tab bar
  const bottomOffset = Platform.select({
    ios: 88 + insets.bottom - 28 + spacing.lg, // Tab bar height + safe area + offset
    android: 80 + spacing.lg, // Tab bar height + offset
    default: 65 + spacing.lg,
  }) || 100;

  const useGlass = isLiquidGlassAvailable() && GlassView && Platform.OS === 'ios';

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        { bottom: bottomOffset },
        animatedStyle,
      ]}
      accessibilityLabel="AI Assistant"
      accessibilityRole="button"
    >
      {useGlass ? (
        <GlassView
          style={styles.buttonGlass}
          glassEffectStyle="regular"
          isInteractive
          tintColor={colors.ios.glassTint}
        >
          <Ionicons name="sparkles" size={24} color={colors.primary} />
        </GlassView>
      ) : (
        <View style={[styles.button, Platform.OS === 'android' && styles.buttonAndroid]}>
          {Platform.OS === 'ios' && <View style={styles.iosInnerGlow} pointerEvents="none" />}
          <Ionicons name="sparkles" size={24} color={colors.primary} />
        </View>
      )}
    </AnimatedPressable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 1000,
  },
  buttonGlass: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    // iOS fallback
    backgroundColor: colors.ios.glassRegular,
    borderWidth: 1,
    borderColor: colors.ios.glassBorderMedium,
    shadowColor: colors.ios.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  buttonAndroid: {
    backgroundColor: colors.android.surfaceContainerHigh,
    borderWidth: 0,
    elevation: 6,
  },
  iosInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.ios.vibrancyLight,
  },
});

export default FloatingAIButton;
