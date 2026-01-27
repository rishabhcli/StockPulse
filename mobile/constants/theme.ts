import { Platform } from 'react-native';

// ============================================================================
// CORE COLORS
// ============================================================================

export const colors = {
  // ==========================================================================
  // BASE COLORS — iOS Dark Mode System Colors
  // (base: #000000, secondary: #1C1C1E, tertiary: #2C2C2E)
  // ==========================================================================
  background: '#000000',
  surface: '#1C1C1E',
  surfaceVariant: '#2C2C2E',
  surfaceElevated: '#2C2C2E',
  border: '#38383A',
  borderSubtle: '#2C2C2E',

  // Text hierarchy (iOS semantic labels)
  text: '#FFFFFF',
  textSecondary: '#EBEBF5', // secondaryLabel at 60% → blended
  textMuted: '#8E8E93',     // systemGray
  textDisabled: '#48484A',  // systemGray3 dark

  // Brand colors
  primary: '#22c55e',
  primaryDark: '#16a34a',
  primaryLight: '#4ade80',
  primaryMuted: 'rgba(34, 197, 94, 0.15)',

  // Semantic colors
  error: '#FF453A',         // iOS systemRed dark
  errorMuted: 'rgba(255, 69, 58, 0.15)',
  warning: '#FFD60A',       // iOS systemYellow dark
  warningMuted: 'rgba(255, 214, 10, 0.15)',
  info: '#0A84FF',          // iOS systemBlue dark
  infoMuted: 'rgba(10, 132, 255, 0.15)',
  success: '#30D158',       // iOS systemGreen dark
  successMuted: 'rgba(48, 209, 88, 0.15)',

  // Score colors (gradient from red to green)
  strongBuy: '#30D158',
  buy: '#4ade80',
  hold: '#FFD60A',
  sell: '#FF9F0A',          // iOS systemOrange dark
  strongSell: '#FF453A',

  // ==========================================================================
  // iOS 26+ LIQUID GLASS DESIGN SYSTEM
  // Using Apple dark mode elevated backgrounds as glass base
  // ==========================================================================
  ios: {
    // Glass material backgrounds (layered over #000000 base)
    glassUltraThin: 'rgba(28, 28, 30, 0.45)',
    glassThin: 'rgba(28, 28, 30, 0.60)',
    glassRegular: 'rgba(28, 28, 30, 0.75)',
    glassThick: 'rgba(44, 44, 46, 0.88)',

    // Glass borders (subtle luminance from Apple vibrancy)
    glassBorderLight: 'rgba(255, 255, 255, 0.16)',
    glassBorderMedium: 'rgba(255, 255, 255, 0.10)',
    glassBorderDark: 'rgba(255, 255, 255, 0.06)',

    // Glass tints for interactive elements
    glassTint: 'rgba(34, 197, 94, 0.10)',
    glassTintActive: 'rgba(34, 197, 94, 0.18)',
    glassTintHover: 'rgba(255, 255, 255, 0.06)',

    // Vibrancy overlays (Apple separator equivalent)
    vibrancyLight: 'rgba(255, 255, 255, 0.10)',
    vibrancyMedium: 'rgba(255, 255, 255, 0.15)',

    // Blur intensities (in pixels)
    blurLight: 12,
    blurMedium: 25,
    blurHeavy: 40,

    // Shadow for depth (elevated dark mode)
    shadowColor: 'rgba(0, 0, 0, 0.75)',

    // System separator
    separator: 'rgba(84, 84, 88, 0.65)', // iOS opaqueSeparator dark
    separatorThin: 'rgba(84, 84, 88, 0.36)', // iOS separator dark
  },

  // ==========================================================================
  // ANDROID MATERIAL DESIGN 3 COLOR SYSTEM
  // Neutral tonal palette derived from green (#22c55e) seed color
  // ==========================================================================
  android: {
    // Primary tonal palette
    primary: '#22c55e',
    onPrimary: '#003314',
    primaryContainer: '#005224',
    onPrimaryContainer: '#6fffb0',

    // Secondary tonal palette
    secondary: '#b4ccb8',
    onSecondary: '#203527',
    secondaryContainer: '#364b3c',
    onSecondaryContainer: '#d0e8d4',

    // Tertiary accent
    tertiary: '#a0cfce',
    onTertiary: '#003737',
    tertiaryContainer: '#1e4e4e',
    onTertiaryContainer: '#bcebea',

    // Surface tones (M3 Neutral palette dark tones)
    surface: '#111318',          // Tone 6
    surfaceDim: '#111318',       // Tone 6
    surfaceBright: '#393C41',    // Tone 24
    surfaceContainerLowest: '#0C0E13', // Tone 4
    surfaceContainerLow: '#191C20',    // Tone 10
    surfaceContainer: '#1D2024',       // Tone 12
    surfaceContainerHigh: '#282A2E',   // Tone 17
    surfaceContainerHighest: '#333538', // Tone 22

    // On-surface
    onSurface: '#E2E2E9',       // Tone 90
    onSurfaceVariant: '#C4C6D0', // Tone 80

    // Outline
    outline: '#8E9099',          // Tone 60
    outlineVariant: '#44474E',   // Tone 30

    // Ripple effect
    ripple: 'rgba(34, 197, 94, 0.12)',
    rippleLight: 'rgba(255, 255, 255, 0.08)',

    // Elevation overlays (M3 tonal elevation — primary tint)
    elevation1: 'rgba(34, 197, 94, 0.05)',
    elevation2: 'rgba(34, 197, 94, 0.08)',
    elevation3: 'rgba(34, 197, 94, 0.11)',
    elevation4: 'rgba(34, 197, 94, 0.12)',
    elevation5: 'rgba(34, 197, 94, 0.14)',
  },

  // ==========================================================================
  // WEB GLASSMORPHISM
  // ==========================================================================
  web: {
    glassBackground: 'rgba(28, 28, 30, 0.78)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    backdropBlur: '24px',
    glassBackgroundHover: 'rgba(44, 44, 46, 0.82)',
  },
};

// ============================================================================
// SPACING SYSTEM (8pt grid)
// ============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const fontSize = {
  // iOS minimum: 11pt, Android M3 minimum: 11sp
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

// ============================================================================
// SHADOWS (Platform-specific)
// ============================================================================

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: colors.ios.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: colors.ios.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: colors.ios.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
};

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

export const animation = {
  // Spring configurations for React Native Reanimated
  spring: {
    // Snappy - fast response, minimal overshoot
    snappy: { damping: 20, stiffness: 300, mass: 0.8 },
    // Bouncy - playful, elastic feel
    bouncy: { damping: 8, stiffness: 200, mass: 1 },
    // Smooth - elegant, natural movement
    smooth: { damping: 15, stiffness: 150, mass: 1 },
    // Gentle - slow, refined motion
    gentle: { damping: 20, stiffness: 100, mass: 1.2 },
  },
  // Duration presets (ms)
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
};

// ============================================================================
// SCORE UTILITIES
// ============================================================================

export const getScoreColor = (score: number): string => {
  if (score >= 75) return colors.strongBuy;
  if (score >= 60) return colors.buy;
  if (score >= 45) return colors.hold;
  if (score >= 30) return colors.sell;
  return colors.strongSell;
};

export const getScoreLabel = (score: number): string => {
  if (score >= 75) return 'STRONG BUY';
  if (score >= 60) return 'BUY';
  if (score >= 45) return 'HOLD';
  if (score >= 30) return 'SELL';
  return 'STRONG SELL';
};

export const getScoreBadgeVariant = (score: number): 'success' | 'warning' | 'error' => {
  if (score >= 60) return 'success';
  if (score >= 45) return 'warning';
  return 'error';
};
