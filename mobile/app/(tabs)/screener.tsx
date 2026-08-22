import React, { memo, useDeferredValue, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatePanel from '../../components/ui/StatePanel';
import Surface from '../../components/ui/Surface';
import { CardSkeleton } from '../../components/ui/Loading';
import { useScreenerQuery, useSnapshotQuery } from '../../hooks/useStockQueries';
import { colors, fontFamily, fontSize, spacing } from '../../constants/theme';
import { useSheetContext } from '../../components/sheets/SheetProvider';
import type { ScreenerResult } from '../../lib/types';
import {
  confidenceVariant,
  dataQualityVariant,
  formatTimestampLabel,
  isTimestampStale,
  recommendationVariant,
} from '../../lib/presentation';
import MarketStrip from '../../components/market/MarketStrip';
import SectionHeader from '../../components/ui/SectionHeader';

type FilterType = 'all' | 'strong_buys' | 'buys' | 'holds' | 'sells' | 'strong_sells' | 'shorts';
type SortType = 'score' | 'change' | 'alpha';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'strong_buys', label: 'Strong buy' },
  { key: 'buys', label: 'Buy' },
  { key: 'holds', label: 'Hold' },
  { key: 'sells', label: 'Sell' },
  { key: 'strong_sells', label: 'Strong sell' },
  { key: 'shorts', label: 'Shorts' },
];

const SORTS: { key: SortType; label: string }[] = [
  { key: 'score', label: 'Score' },
  { key: 'change', label: 'Change' },
  { key: 'alpha', label: 'A-Z' },
];

const ScreenerRow = memo(function ScreenerRow({ stock, onSelect }: { stock: ScreenerResult; onSelect: (ticker: string) => void }) {
  const stale = isTimestampStale(stock.generated_at);
  const score = stock.score ?? stock.investment_score;
  const move = stock.change_pct ?? stock.price_change_pct;
  const freshnessLabel = stock.freshness_summary ?? formatTimestampLabel(stock.generated_at);

  return (
    <Pressable onPress={() => onSelect(stock.ticker)}>
      <Surface style={styles.rowCard} variant="filled">
        <View style={styles.rowHeader}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTicker}>{stock.ticker}</Text>
            <Text style={styles.rowCompany} numberOfLines={1}>{stock.company_name}</Text>
            <Text style={styles.rowMeta}>
              {[stock.instrument_type, stock.sector].filter(Boolean).join(' • ') || 'Metadata unavailable'}
            </Text>
          </View>
          <View style={styles.rowScoreWrap}>
            <Text style={styles.rowScore}>{Math.round(score)}</Text>
            <Text style={styles.rowScoreLabel}>score</Text>
          </View>
        </View>
        <View style={styles.rowBadgeWrap}>
          <Badge label={stock.recommendation} variant={recommendationVariant(stock.recommendation)} size="small" />
          <Badge label={stock.confidence} variant={confidenceVariant(stock.confidence)} size="small" />
          <Badge label={stock.data_quality?.status ?? 'unknown'} variant={dataQualityVariant(stock.data_quality)} size="small" />
          <Badge label={stale ? 'Stale' : freshnessLabel} variant={stale ? 'warning' : 'neutral'} size="small" />
        </View>
        <View style={styles.rowFooter}>
          <Text style={styles.rowPrice}>${stock.current_price.toFixed(2)}</Text>
          <Text style={[styles.rowChange, { color: move >= 0 ? colors.success : colors.error }]}>
            {move >= 0 ? '+' : ''}
            {move.toFixed(2)}%
          </Text>
        </View>
      </Surface>
    </Pressable>
  );
});

export default function ScreenerScreen() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('score');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const { data: snapshot } = useSnapshotQuery();
  const { data, isLoading, isFetching, error, refetch } = useScreenerQuery(filter, sort, deferredSearch, 100);
  const { openStockSheet } = useSheetContext();
  const stale = isTimestampStale(snapshot?.generated_at);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={isFetching && !isLoading} onRefresh={() => refetch()} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Eligible Universe</Text>
          <Text style={styles.title}>Screener</Text>
          <Text style={styles.subtitle}>
            Only names that pass the strict v3 input gate appear here. Confidence and data quality travel with each row.
          </Text>
        </View>

        <Surface style={styles.heroCard} variant="elevated">
          <Text style={styles.heroTitle}>Ranked surfaces exclude incomplete ideas.</Text>
          <Text style={styles.heroBody}>
            The screener shows only eligible names. Each row carries confidence, freshness, and data-quality state.
          </Text>
          <View style={styles.heroBadges}>
            <Badge label={snapshot?.eligible_count != null ? `${snapshot.eligible_count} eligible` : 'Eligible only'} variant="primary" />
            <Badge label={snapshot?.excluded_count != null ? `${snapshot.excluded_count} excluded` : 'Strict gate'} variant="neutral" />
            <Badge label={snapshot?.freshness_summary ?? (stale ? 'Stale inputs' : 'Fresh snapshot')} variant={stale ? 'warning' : 'success'} />
          </View>
        </Surface>

        {snapshot?.indices?.length ? (
          <View style={styles.section}>
            <SectionHeader title="Indices" subtitle="Cross-market context for the eligible universe." />
            <MarketStrip indices={snapshot.indices} />
          </View>
        ) : null}

        <Surface style={styles.toolbar} variant="filled">
          <Input
            placeholder="Search ticker or company"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="characters"
          />
          <View style={styles.filterWrap}>
            {FILTERS.map((item) => (
              <Pressable key={item.key} onPress={() => setFilter(item.key)}>
                <Badge label={item.label} variant={filter === item.key ? 'primary' : 'neutral'} />
              </Pressable>
            ))}
          </View>
          <View style={styles.sortWrap}>
            {SORTS.map((item) => (
              <Button
                key={item.key}
                title={item.label}
                variant={sort === item.key ? 'primary' : 'ghost'}
                size="small"
                onPress={() => setSort(item.key)}
              />
            ))}
          </View>
        </Surface>

        {isLoading ? (
          <View style={styles.section}>
            <CardSkeleton />
            <CardSkeleton style={styles.skeletonGap} />
            <CardSkeleton style={styles.skeletonGap} />
          </View>
        ) : error ? (
          <View style={styles.section}>
            <StatePanel
              icon="cloud-offline-outline"
              title="Screener unavailable"
              message={error instanceof Error ? error.message : 'The backend did not return eligible names.'}
              actionLabel="Retry"
              onAction={() => refetch()}
              tone="error"
            />
          </View>
        ) : data?.length ? (
          <View style={styles.section}>
            <SectionHeader title="Results" subtitle={`${data.length} names after filters`} />
            <View style={styles.list}>
              {data.map((stock) => (
                <ScreenerRow key={stock.ticker} stock={stock} onSelect={openStockSheet} />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <StatePanel
              icon="filter-outline"
              title="No eligible results"
              message="Try widening the filter or clearing the search query."
              actionLabel="Reset filters"
              onAction={() => {
                setFilter('all');
                setSort('score');
                setSearch('');
              }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroBody: {
    color: colors.textSecondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  heroCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: fontFamily.serif,
    fontSize: fontSize.xl,
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  rowBadgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rowCard: {
    gap: spacing.sm,
  },
  rowChange: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.sm,
  },
  rowCompany: {
    color: colors.text,
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.md,
  },
  rowCopy: {
    flex: 1,
  },
  rowFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowMeta: {
    color: colors.textMuted,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  rowPrice: {
    color: colors.text,
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.md,
  },
  rowScore: {
    color: colors.text,
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl'],
  },
  rowScoreLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
  },
  rowScoreWrap: {
    alignItems: 'flex-end',
  },
  rowTicker: {
    color: colors.textMuted,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  skeletonGap: {
    marginTop: spacing.sm,
  },
  sortWrap: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.serif,
    fontSize: fontSize['3xl'],
    marginTop: 4,
  },
  toolbar: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
});
