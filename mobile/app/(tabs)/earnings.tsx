import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEarningsCalendarQuery } from '../../hooks/useStockQueries';
import { colors, fontFamily, fontSize, spacing } from '../../constants/theme';
import Surface from '../../components/ui/Surface';
import Badge from '../../components/ui/Badge';
import StatePanel from '../../components/ui/StatePanel';
import { CardSkeleton } from '../../components/ui/Loading';
import { confidenceVariant, dataQualityVariant, earningsBucketLabel, formatTimestampLabel } from '../../lib/presentation';
import type { EarningsCalendarItem } from '../../lib/types';
import SectionHeader from '../../components/ui/SectionHeader';

function EarningsGroup({ title, items }: { title: string; items: EarningsCalendarItem[] }) {
  if (!items.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={title} subtitle={`${items.length} upcoming reports`} />
      <View style={styles.list}>
        {items.map((item) => (
          <Surface key={`${title}-${item.ticker}-${item.earnings_date}`} style={styles.card} variant="filled">
            <View style={styles.cardHeader}>
              <View style={styles.cardCopy}>
                <Text style={styles.ticker}>{item.ticker}</Text>
                <Text style={styles.company}>{item.company_name}</Text>
                <Text style={styles.meta}>{item.earnings_date}</Text>
              </View>
              <View style={styles.daysWrap}>
                <Text style={styles.daysValue}>{item.days_until}</Text>
                <Text style={styles.daysLabel}>days</Text>
              </View>
            </View>
            <View style={styles.badgeRow}>
              {item.recommendation ? <Badge label={item.recommendation} variant={item.recommendation.includes('BUY') ? 'success' : item.recommendation.includes('SELL') ? 'error' : 'warning'} size="small" /> : null}
              {item.confidence ? <Badge label={item.confidence} variant={confidenceVariant(item.confidence)} size="small" /> : null}
              {item.data_quality ? <Badge label={item.data_quality.status} variant={dataQualityVariant(item.data_quality)} size="small" /> : null}
              <Badge label={`${item.days_until}d`} variant="neutral" size="small" />
            </View>
            <View style={styles.metrics}>
              <Text style={styles.metricText}>
                Surprise: {typeof item.prev_surprise_pct === 'number' ? `${item.prev_surprise_pct.toFixed(1)}%` : 'N/A'}
              </Text>
              <Text style={styles.metricText}>
                {item.generated_at ? formatTimestampLabel(item.generated_at) : 'Freshness unavailable'}
              </Text>
            </View>
          </Surface>
        ))}
      </View>
    </View>
  );
}

export default function EarningsScreen() {
  const { data, isLoading, isFetching, error, refetch } = useEarningsCalendarQuery(60);

  const grouped = useMemo(() => {
    const buckets: Record<string, EarningsCalendarItem[]> = {
      Today: [],
      'This Week': [],
      'Next 30 Days': [],
    };

    (data ?? []).forEach((item) => {
      buckets[earningsBucketLabel(item.days_until)]?.push(item);
    });

    return buckets;
  }, [data]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={isFetching && !isLoading} onRefresh={() => refetch()} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Live Only</Text>
          <Text style={styles.title}>Earnings Calendar</Text>
          <Text style={styles.subtitle}>
            Companies without real upcoming earnings dates are excluded.
          </Text>
        </View>

        {data?.length ? (
          <Surface style={styles.heroCard} variant="elevated">
            <Text style={styles.heroTitle}>Live reports with confidence and freshness.</Text>
            <Text style={styles.heroBody}>
              The calendar only shows companies with verified dates. Each card carries score, confidence, and data quality.
            </Text>
            <View style={styles.heroBadges}>
              <Badge label={`${data.length} live names`} variant="primary" />
              <Badge label={formatTimestampLabel(data[0]?.generated_at)} variant="neutral" />
              <Badge label={data[0]?.freshness_summary ?? 'Freshness tracked'} variant="success" />
            </View>
          </Surface>
        ) : null}

        {isLoading ? (
          <View style={styles.section}>
            <CardSkeleton />
            <CardSkeleton style={styles.skeletonGap} />
          </View>
        ) : error ? (
          <View style={styles.section}>
            <StatePanel
              icon="cloud-offline-outline"
              title="Earnings unavailable"
              message={error instanceof Error ? error.message : 'The backend did not return a live earnings calendar.'}
              actionLabel="Retry"
              onAction={() => refetch()}
              tone="error"
            />
          </View>
          ) : (data?.length ?? 0) === 0 ? (
          <View style={styles.section}>
            <StatePanel
              icon="calendar-outline"
              title="No live earnings"
              message="The backend only returns companies with verified upcoming dates."
            />
          </View>
        ) : (
          <>
            <EarningsGroup title="Today" items={grouped.Today} />
            <EarningsGroup title="This Week" items={grouped['This Week']} />
            <EarningsGroup title="Next 30 Days" items={grouped['Next 30 Days']} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  cardCopy: {
    flex: 1,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  company: {
    color: colors.text,
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.md,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
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
  daysLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
  },
  daysValue: {
    color: colors.text,
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl'],
  },
  daysWrap: {
    alignItems: 'flex-end',
  },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  metricText: {
    color: colors.textSecondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  ticker: {
    color: colors.textMuted,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.serif,
    fontSize: fontSize['3xl'],
    marginTop: 4,
  },
});
