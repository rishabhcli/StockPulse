import { useEffect } from 'react';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { useAuthStore } from '../stores/useAuthStore';
import { useTradingStore } from '../stores/useTradingStore';
import { useWatchlistStore } from '../stores/useWatchlistStore';
import { Loading } from '../components/ui/Loading';

// ============================================================================
// MATERIAL DESIGN 3 THEME CONFIGURATION
// ============================================================================

// Custom M3 dark theme with StockPulse brand colors
const paperTheme = {
  ...MD3DarkTheme,

  // Enable Material Design 3
  version: 3 as const,

  // Custom color scheme based on #22c55e (green) seed color
  colors: {
    ...MD3DarkTheme.colors,

    // Primary colors
    primary: colors.primary,
    onPrimary: '#003314',
    primaryContainer: '#005224',
    onPrimaryContainer: '#6fffb0',

    // Secondary colors
    secondary: colors.android.secondary,
    onSecondary: colors.android.onSecondary,
    secondaryContainer: colors.android.secondaryContainer,
    onSecondaryContainer: colors.android.onSecondaryContainer,

    // Tertiary colors
    tertiary: colors.android.tertiary,
    onTertiary: colors.android.onTertiary,
    tertiaryContainer: colors.android.tertiaryContainer,
    onTertiaryContainer: colors.android.onTertiaryContainer,

    // Error colors
    error: colors.error,
    onError: '#ffffff',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',

    // Surface colors (M3 tonal elevation)
    surface: colors.android.surface,
    surfaceVariant: colors.android.surfaceContainerHigh,
    onSurface: colors.android.onSurface,
    onSurfaceVariant: colors.android.onSurfaceVariant,

    // Background
    background: colors.background,
    onBackground: colors.text,

    // Outline
    outline: colors.android.outline,
    outlineVariant: colors.android.outlineVariant,

    // Inverse colors
    inverseSurface: '#e2e3de',
    inverseOnSurface: '#1a1c19',
    inversePrimary: '#006d35',

    // Elevation overlay colors (M3 tonal surface hierarchy)
    elevation: {
      level0: 'transparent',
      level1: colors.android.surfaceContainerLow,
      level2: colors.android.surfaceContainer,
      level3: colors.android.surfaceContainerHigh,
      level4: colors.android.surfaceContainerHigh,
      level5: colors.android.surfaceContainerHighest,
    },

    // Surface disabled
    surfaceDisabled: 'rgba(227, 227, 221, 0.12)',
    onSurfaceDisabled: 'rgba(227, 227, 221, 0.38)',

    // Shadow
    shadow: '#000000',
    scrim: '#000000',
  },

  // Rounded corners (M3 uses more rounded shapes)
  roundness: 4,

  // Animation configuration for M3 Expressive
  animation: {
    scale: 1.0,
    defaultAnimationDuration: 200,
  },
};

// ============================================================================
// ROOT LAYOUT
// ============================================================================

export default function RootLayout() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initializeTrading = useTradingStore((state) => state.initialize);
  const fetchWatchlists = useWatchlistStore((state) => state.fetchWatchlists);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      initializeTrading();
      fetchWatchlists();
    }
  }, [isAuthenticated]);

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <Loading fullScreen message="Loading..." />
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <StatusBar style="light" />
        {/* Redirect to login if not authenticated */}
        {!isAuthenticated && <Redirect href="/auth/login" />}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: Platform.select({
              ios: 'default',
              android: 'fade_from_bottom',
              default: 'fade',
            }),
          }}
        >
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="stock/[ticker]"
            options={{
              headerShown: true,
              headerStyle: {
                backgroundColor: Platform.OS === 'ios'
                  ? colors.ios.glassThick
                  : colors.android.surfaceContainer,
              },
              headerTintColor: colors.text,
              headerBackTitle: 'Back',
              headerShadowVisible: false,
              presentation: Platform.OS === 'ios' ? 'card' : 'modal',
              animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
            }}
          />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
