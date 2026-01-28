import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAnalysisStore } from '../../../stores/useAnalysisStore';
import { colors, spacing, fontSize, fontFamily, isIOS26Plus } from '../../../constants/theme';
import StockAnalysisContent from '../../../components/stocks/StockAnalysisContent';
import { Loading } from '../../../components/ui/Loading';
import { GlassIconButton } from '../../../components/ui/GlassMenuItem';

// ============================================================================
// SHEET: STOCK DETAIL (formSheet presentation)
// iOS 26+: Native Liquid Glass via transparent background
// iOS < 26: BlurView fallback for glass-like effect
// ============================================================================

// Wrapper component that provides blur on iOS < 26
const SheetContainer = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  // iOS 26+ uses native Liquid Glass, so just transparent View
  if (Platform.OS === 'ios' && isIOS26Plus) {
    return <Animated.View style={[styles.container, style]} entering={FadeIn.duration(200)}>{children}</Animated.View>;
  }
  
  // iOS < 26: Use BlurView for glass-like effect
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={80} tint="dark" style={[styles.container, style]}>
        {children}
      </BlurView>
    );
  }
  
  // Android/Web: Solid background
  return <View style={[styles.container, style]}>{children}</View>;
};

export default function StockSheet() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const router = useRouter();
  const { currentAnalysis, isAnalyzing, error, analyze } = useAnalysisStore();

  React.useEffect(() => {
    if (ticker && (!currentAnalysis || currentAnalysis.ticker !== ticker)) {
      analyze(ticker);
    }
  }, [ticker]);

  const handleClose = () => {
    router.back();
  };

  // Sheet header with grabber and close button
  const SheetHeader = () => (
    <View style={styles.header}>
      <View style={styles.grabber} />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{ticker || 'Stock'}</Text>
        <GlassIconButton
          icon="close"
          onPress={handleClose}
          size={32}
        />
      </View>
    </View>
  );

  if (isAnalyzing && !currentAnalysis) {
    return (
      <SheetContainer>
        <SheetHeader />
        <Loading message={`Analyzing ${ticker}...`} />
      </SheetContainer>
    );
  }

  if (error) {
    return (
      <SheetContainer>
        <SheetHeader />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SheetContainer>
    );
  }

  if (!currentAnalysis) {
    return (
      <SheetContainer>
        <SheetHeader />
        <View style={styles.errorContainer}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorText}>Stock not found</Text>
        </View>
      </SheetContainer>
    );
  }

  return (
    <SheetContainer>
      <SheetHeader />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StockAnalysisContent analysis={currentAnalysis} />
      </ScrollView>
    </SheetContainer>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Transparent for iOS (Liquid Glass or BlurView shows through)
    // Solid for Android
    backgroundColor: Platform.select({
      ios: 'transparent',
      android: colors.android.surfaceContainerHigh,
      default: colors.surface,
    }),
  },
  header: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  grabber: {
    width: 36,
    height: 5,
    backgroundColor: Platform.select({
      ios: colors.ios.glassBorderLight,
      android: colors.android.outlineVariant,
      default: colors.border,
    }),
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.sansBold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
