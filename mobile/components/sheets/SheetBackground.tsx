import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, borderRadius } from '../../constants/theme';

// ============================================================================
// iOS 26 LIQUID GLASS — expo-glass-effect
// ============================================================================

let GlassView: any = null;
let _isGlassAvailable: boolean = false;

try {
  const glassModule = require('expo-glass-effect');
  GlassView = glassModule.GlassView;
  _isGlassAvailable = glassModule.isLiquidGlassAvailable?.() ?? false;
} catch {
  _isGlassAvailable = false;
}

const isLiquidGlass = Platform.OS === 'ios' && _isGlassAvailable;

// ============================================================================
// SHEET BACKGROUND COMPONENT
// ============================================================================
// Used as `backgroundComponent` for @gorhom/bottom-sheet.
// Receives animated style (position, transform) from the sheet library.
// We render GlassView inside with absoluteFill so it doesn't receive
// animated opacity (which breaks GlassView rendering).
// ============================================================================

interface SheetBackgroundProps {
  style?: any;
  animatedIndex?: any;
  animatedPosition?: any;
}

export default function SheetBackground({ style }: SheetBackgroundProps) {
  // iOS 26+ — Native Liquid Glass
  if (isLiquidGlass && GlassView) {
    return (
      <Animated.View style={[styles.wrapper, style]}>
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle="regular"
        />
      </Animated.View>
    );
  }

  // iOS < 26 — Dark glass fallback
  if (Platform.OS === 'ios') {
    return (
      <Animated.View style={[styles.wrapper, styles.iosFallback, style]}>
        <View style={styles.iosInnerGlow} />
      </Animated.View>
    );
  }

  // Android — Solid M3 surface
  if (Platform.OS === 'android') {
    return (
      <Animated.View style={[styles.wrapper, styles.android, style]} />
    );
  }

  // Web — CSS glassmorphism
  const webExtras = {
    backdropFilter: `blur(${colors.web.backdropBlur})`,
    WebkitBackdropFilter: `blur(${colors.web.backdropBlur})`,
  } as any;

  return (
    <Animated.View style={[styles.wrapper, styles.web, webExtras, style]} />
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    overflow: 'hidden',
    ...StyleSheet.absoluteFillObject,
  },
  iosFallback: {
    backgroundColor: colors.ios.glassThick,
    borderWidth: 1,
    borderColor: colors.ios.glassBorderLight,
    borderBottomWidth: 0,
    shadowColor: colors.ios.shadowColor,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  iosInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.ios.vibrancyLight,
  },
  android: {
    backgroundColor: colors.android.surfaceContainerHigh,
    elevation: 8,
  },
  web: {
    backgroundColor: colors.web.glassBackground,
    borderWidth: 1,
    borderColor: colors.web.glassBorder,
    borderBottomWidth: 0,
    boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.3)',
  } as any,
});
