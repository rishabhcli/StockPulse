import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAnalysisStore } from '../../stores/useAnalysisStore';
import { colors, spacing, fontSize } from '../../constants/theme';
import StockAnalysisContent from '../../components/stocks/StockAnalysisContent';
import { Loading } from '../../components/ui/Loading';

export default function StockDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const { currentAnalysis, isAnalyzing, error, analyze } = useAnalysisStore();

  useEffect(() => {
    if (ticker) {
      analyze(ticker);
    }
  }, [ticker]);

  if (isAnalyzing && !currentAnalysis) {
    return (
      <>
        <Stack.Screen options={{ title: ticker || 'Stock' }} />
        <Loading fullScreen message={`Loading ${ticker}...`} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: ticker || 'Stock' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </>
    );
  }

  if (!currentAnalysis) {
    return (
      <>
        <Stack.Screen options={{ title: ticker || 'Stock' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorText}>Stock not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: currentAnalysis.ticker }} />
      <View style={styles.container}>
        <StockAnalysisContent analysis={currentAnalysis} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
