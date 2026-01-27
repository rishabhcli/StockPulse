import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAnalysisStore } from '../../stores/useAnalysisStore';
import { colors, spacing, fontSize, fontFamily, borderRadius } from '../../constants/theme';
import StockList from '../../components/stocks/StockList';
import { useSheetContext } from '../../components/sheets/SheetProvider';

type FilterType = 'all' | 'strong_buys' | 'buys' | 'sells' | 'strong_sells' | 'shorts';

const FILTERS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'strong_buys', label: 'Strong Buy', icon: 'arrow-up-circle' },
  { key: 'buys', label: 'Buy', icon: 'trending-up' },
  { key: 'sells', label: 'Sell', icon: 'trending-down' },
  { key: 'strong_sells', label: 'Strong Sell', icon: 'arrow-down-circle' },
  { key: 'shorts', label: 'Short', icon: 'swap-vertical' },
];

export default function ScreenerScreen() {
  const { openStockSheet } = useSheetContext();
  const { screenerResults, currentFilter, isScreening, screen, setFilter } = useAnalysisStore();

  useEffect(() => {
    screen(currentFilter, 50);
  }, []);

  const handleFilterChange = async (filter: FilterType) => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    setFilter(filter);
  };

  const getFilterColor = (filter: FilterType) => {
    switch (filter) {
      case 'strong_buys':
      case 'buys':
        return colors.strongBuy;
      case 'sells':
      case 'strong_sells':
      case 'shorts':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Stock Screener</Text>
        <Text style={styles.subtitle}>Filter stocks by investment score</Text>
      </View>

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {FILTERS.map((filter) => {
          const isActive = currentFilter === filter.key;
          const filterColor = getFilterColor(filter.key);

          return (
            <Pressable
              key={filter.key}
              onPress={() => handleFilterChange(filter.key)}
              style={[
                styles.filterPill,
                isActive && { backgroundColor: `${filterColor}20`, borderColor: filterColor },
              ]}
            >
              <Ionicons
                name={filter.icon as any}
                size={16}
                color={isActive ? filterColor : colors.textMuted}
              />
              <Text
                style={[
                  styles.filterText,
                  isActive && { color: filterColor },
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {screenerResults.length} stocks found
        </Text>
      </View>

      {/* Stock List */}
      <StockList
        stocks={screenerResults}
        isLoading={isScreening && screenerResults.length === 0}
        isRefreshing={isScreening && screenerResults.length > 0}
        onRefresh={() => screen(currentFilter, 50)}
        variant="full"
        onStockPress={(stock) => openStockSheet(stock.ticker)}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No stocks match your criteria</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.serif,
    fontWeight: '400',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: Platform.select({
      ios: colors.ios.glassRegular,
      android: colors.android.surfaceContainerHigh,
      default: colors.surface,
    }),
    borderRadius: borderRadius.full,
    borderWidth: Platform.OS === 'android' ? 0 : 1,
    borderColor: Platform.OS === 'ios' ? colors.ios.glassBorderMedium : colors.border,
    marginRight: spacing.sm,
    gap: spacing.xs,
    ...Platform.select({
      android: { elevation: 1 },
      default: {},
    }),
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  resultsCount: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
});
