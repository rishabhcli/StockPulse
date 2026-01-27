import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScreenerResult } from '../../lib/types';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';
import StockCard from './StockCard';
import { ListSkeleton } from '../ui/Loading';

// ============================================================================
// TYPES
// ============================================================================

interface StockListProps {
  stocks: ScreenerResult[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  variant?: 'compact' | 'full';
  onStockPress?: (stock: ScreenerResult) => void;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function DefaultEmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="search-outline" size={40} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No Stocks Found</Text>
      <Text style={styles.emptyText}>Try adjusting your filters or search criteria</Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StockList({
  stocks,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  variant = 'compact',
  onStockPress,
  ListHeaderComponent,
  ListEmptyComponent,
}: StockListProps) {
  // Handle refresh with haptic feedback
  const handleRefresh = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onRefresh?.();
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        {ListHeaderComponent}
        <ListSkeleton count={6} variant={variant} style={styles.skeletonList} />
      </View>
    );
  }

  return (
    <FlatList
      data={stocks}
      keyExtractor={(item) => item.ticker}
      renderItem={({ item, index }) => (
        <StockCard
          stock={item}
          variant={variant}
          onPress={onStockPress ? () => onStockPress(item) : undefined}
        />
      )}
      contentContainerStyle={[
        styles.listContent,
        stocks.length === 0 && styles.emptyListContent,
      ]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent || <DefaultEmptyState />}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={
              Platform.OS === 'android' ? colors.android.surfaceContainer : undefined
            }
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
      // Optimization props
      removeClippedSubviews={Platform.OS !== 'web'}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={8}
      // Bounce effect on iOS
      bounces={Platform.OS === 'ios'}
      // Momentum scroll on iOS for natural feel
      decelerationRate={Platform.OS === 'ios' ? 'normal' : 'fast'}
    />
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 4, // Extra padding for tab bar
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  separator: {
    height: spacing.sm,
  },
  skeletonList: {
    paddingTop: spacing.md,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    paddingVertical: spacing.xl * 2,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Platform.OS === 'ios'
      ? colors.ios.glassRegular
      : colors.android.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    maxWidth: 250,
  },
});

export default StockList;
