import { useEffect } from 'react';
import { Stack, Redirect, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as Sentry from '@sentry/react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_400Regular_Italic,
} from '@expo-google-fonts/dm-sans';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { colors, fontFamily } from '../constants/theme';
import { queryClient, queryPersister } from '../lib/queryClient';
import { useAuthStore } from '../stores/useAuthStore';
import { useTradingStore } from '../stores/useTradingStore';
import { useWatchlistStore } from '../stores/useWatchlistStore';
import { Loading } from '../components/ui/Loading';
import SheetProvider from '../components/sheets/SheetProvider';

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
let sentryConfigured = false;

if (sentryDsn && !sentryConfigured) {
  Sentry.init({
    dsn: sentryDsn,
    enabled: !__DEV__,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    tracesSampleRate: Number(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0),
    profilesSampleRate: Number(process.env.EXPO_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE ?? 0),
    attachScreenshot: false,
  });
  sentryConfigured = true;
}

// ============================================================================
// MATERIAL DESIGN 3 THEME CONFIGURATION
// ============================================================================

// Custom M3 dark theme with StockPulse brand colors
// Uses DM Sans as the default font across all Paper components
const paperTheme = {
  ...MD3DarkTheme,

  // Enable Material Design 3
  version: 3 as const,

  // Apply DM Sans to all Paper typography variants
  fonts: {
    ...MD3DarkTheme.fonts,
    ...Object.fromEntries(
      Object.entries(MD3DarkTheme.fonts).map(([key, value]) => [
        key,
        typeof value === 'object' && value !== null
          ? { ...value, fontFamily: fontFamily.sans }
          : value,
      ])
    ),
  },

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

  // Load DM Sans + Instrument Serif (matching the original web app)
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_400Regular_Italic,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      initializeTrading();
      fetchWatchlists();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  const content = isLoading || !fontsLoaded ? (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <Loading fullScreen message="Loading..." />
      </PaperProvider>
    </SafeAreaProvider>
  ) : (
    <ErrorBoundary>
      <GestureHandlerRootView style={layoutStyles.root}>
        <SafeAreaProvider>
          <PaperProvider theme={paperTheme}>
            <SheetProvider>
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
                {/* Native iOS formSheet with Liquid Glass on iOS 26+ */}
                <Stack.Screen
                  name="sheets/stock/[ticker]"
                  options={{
                    headerShown: false,
                    presentation: 'formSheet',
                    // CRITICAL: Transparent for iOS 26 Liquid Glass
                    contentStyle: {
                      backgroundColor: Platform.select({
                        ios: 'transparent',
                        android: colors.android.surfaceContainerHigh,
                        default: colors.surface,
                      }),
                    },
                    // Sheet detents
                    sheetAllowedDetents: [0.5, 0.75, 1.0],
                    sheetInitialDetentIndex: 1,
                    sheetGrabberVisible: false,
                    sheetCornerRadius: 24,
                    sheetLargestUndimmedDetentIndex: 0,
                    gestureEnabled: true,
                  }}
                />
                <Stack.Screen
                  name="sheets/glossary/[term]"
                  options={{
                    headerShown: false,
                    presentation: 'formSheet',
                    contentStyle: {
                      backgroundColor: Platform.select({
                        ios: 'transparent',
                        android: colors.android.surfaceContainerHigh,
                        default: colors.surface,
                      }),
                    },
                    sheetAllowedDetents: [0.4, 0.7],
                    sheetInitialDetentIndex: 1,
                    sheetGrabberVisible: false,
                    sheetCornerRadius: 24,
                    sheetLargestUndimmedDetentIndex: 0,
                    gestureEnabled: true,
                  }}
                />
              </Stack>
            </SheetProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: 'stockpulse-query-v2',
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success',
        },
      }}
    >
      {content}
    </PersistQueryClientProvider>
  );
}

const layoutStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
