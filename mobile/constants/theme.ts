import { Platform } from 'react-native';

// ============================================================================
// CORE COLORS
// Aligned with the original web app (templates/index.html) CSS variables
// ============================================================================

export const colors = {
  // ==========================================================================
  // BASE COLORS — matches web app :root custom properties
  // ==========================================================================
  background: '#0a0a0a',
  surface: '#161616',
  surfaceVariant: '#1c1c1c',
  surfaceElevated: '#1c1c1c',
  border: '#222222',
  borderSubtle: '#1a1a1a',

  // Text hierarchy (matches web app --text, --text-secondary, --text-muted)
  text: '#fafafa',
  textSecondary: '#888888',
  textMuted: '#555555',
  textDisabled: '#333333',

  // Brand colors
  primary: '#22c55e',
  primaryDark: '#16a34a',
  primaryLight: '#4ade80',
  primaryMuted: 'rgba(34, 197, 94, 0.12)',

  // Semantic colors (matches web app)
  error: '#ef4444',
  errorMuted: 'rgba(239, 68, 68, 0.12)',
  warning: '#eab308',
  warningMuted: 'rgba(234, 179, 8, 0.12)',
  info: '#0A84FF',
  infoMuted: 'rgba(10, 132, 255, 0.12)',
  success: '#22c55e',
  successMuted: 'rgba(34, 197, 94, 0.12)',

  // Score colors (gradient from red to green)
  strongBuy: '#22c55e',
  buy: '#4ade80',
  hold: '#eab308',
  sell: '#FF9F0A',
  strongSell: '#ef4444',

  // ==========================================================================
  // iOS 26+ LIQUID GLASS DESIGN SYSTEM
  // Native glass materials; tinted to match the web app's warm neutral base
  // ==========================================================================
  ios: {
    // Glass material backgrounds (layered over #0a0a0a base)
    glassUltraThin: 'rgba(22, 22, 22, 0.45)',
    glassThin: 'rgba(22, 22, 22, 0.60)',
    glassRegular: 'rgba(22, 22, 22, 0.75)',
    glassThick: 'rgba(28, 28, 28, 0.88)',

    // Glass borders (subtle luminance)
    glassBorderLight: 'rgba(255, 255, 255, 0.14)',
    glassBorderMedium: 'rgba(255, 255, 255, 0.08)',
    glassBorderDark: 'rgba(255, 255, 255, 0.04)',

    // Glass tints for interactive elements
    glassTint: 'rgba(34, 197, 94, 0.10)',
    glassTintActive: 'rgba(34, 197, 94, 0.18)',
    glassTintHover: 'rgba(255, 255, 255, 0.06)',

    // Vibrancy overlays
    vibrancyLight: 'rgba(255, 255, 255, 0.08)',
    vibrancyMedium: 'rgba(255, 255, 255, 0.12)',

    // Blur intensities (in pixels)
    blurLight: 12,
    blurMedium: 25,
    blurHeavy: 40,

    // Shadow for depth
    shadowColor: 'rgba(0, 0, 0, 0.75)',

    // System separator
    separator: 'rgba(60, 60, 60, 0.65)',
    separatorThin: 'rgba(60, 60, 60, 0.36)',
  },

  // ==========================================================================
  // ANDROID MATERIAL DESIGN 3 COLOR SYSTEM
  // Warm neutral tonal palette derived from green (#22c55e) seed,
  // surface tones shifted to match web app's warm dark base (#0a0a0a)
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

    // Surface tones (warm neutral — aligned with web #0a0a0a base)
    surface: '#0e0e0e',             // Tone 6  (warm)
    surfaceDim: '#0e0e0e',          // Tone 6
    surfaceBright: '#363636',       // Tone 24
    surfaceContainerLowest: '#090909', // Tone 4
    surfaceContainerLow: '#141414',    // Tone 10
    surfaceContainer: '#1a1a1a',       // Tone 12
    surfaceContainerHigh: '#242424',   // Tone 17
    surfaceContainerHighest: '#2e2e2e', // Tone 22

    // On-surface
    onSurface: '#fafafa',          // Match web --text
    onSurfaceVariant: '#888888',   // Match web --text-secondary

    // Outline
    outline: '#666666',            // Tone 60
    outlineVariant: '#333333',     // Tone 30

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
  // WEB GLASSMORPHISM — matches web app card/hover colors
  // ==========================================================================
  web: {
    glassBackground: 'rgba(22, 22, 22, 0.78)',   // aligned with #161616
    glassBorder: 'rgba(255, 255, 255, 0.10)',     // aligned with #222222
    backdropBlur: '24px',
    glassBackgroundHover: 'rgba(28, 28, 28, 0.82)', // aligned with #1c1c1c
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
// Font families match the original web app: DM Sans (body) + Instrument Serif
// ============================================================================

/**
 * Font family constants.
 * DM Sans is the primary sans-serif (matching --sans in the web app).
 * Instrument Serif is used for display/heading text (matching --serif).
 *
 * These map to the loaded Google Fonts in _layout.tsx via expo-font.
 * Falls back to system fonts when custom fonts are unavailable.
 */
export const fontFamily = {
  // Body / UI text — "DM Sans"
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemibold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  sansItalic: 'DMSans_400Regular_Italic',

  // Display / headings — "Instrument Serif"
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',

  // Monospace (platform system)
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) as string,
};

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
  if (score >= 75) return colors.primary;
  if (score >= 60) return colors.buy;
  if (score >= 45) return colors.warning;
  if (score >= 30) return colors.sell;
  return colors.error;
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
