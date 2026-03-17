import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSnapshotQuery } from '../../hooks/useStockQueries';
import { colors, fontFamily, fontSize, spacing } from '../../constants/theme';
import SentimentHeader from '../../components/market/SentimentHeader';
import MarketStrip from '../../components/market/MarketStrip';
import { StockCard } from '../../components/stocks/StockCard';
import { CardSkeleton } from '../../components/ui/Loading';
import StatePanel from '../../components/ui/StatePanel';
import Surface from '../../components/ui/Surface';
import Badge from '../../components/ui/Badge';
import { useSheetContext } from '../../components/sheets/SheetProvider';
import type { ScreenerResult } from '../../lib/types';
import { formatTimestampLabel, isTimestampStale } from '../../lib/presentation';
import SectionHeader from '../../components/ui/SectionHeader';

interface RankedSectionProps {
  title: string;
  subtitle: string;
  stocks: ScreenerResult[];
  emptyCopy: string;
  onOpenTicker: (ticker: string) => void;
}

function RankedSection({ title, subtitle, stocks, emptyCopy, onOpenTicker }: RankedSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {stocks.length ? (
        <View style={styles.list}>
          {stocks.map((stock) => (
            <StockCard key={`${title}-${stock.ticker}`} stock={stock} variant="compact" onPress={() => onOpenTicker(stock.ticker)} />
          ))}
        </View>
      ) : (
        <StatePanel icon="bar-chart-outline" title="No ranked ideas" message={emptyCopy} tone="info" />
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { data, isLoading, isFetching, error, refetch } = useSnapshotQuery();
  const { openStockSheet } = useSheetContext();

  const stale = isTimestampStale(data?.generated_at);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={isFetching && !isLoading} onRefresh={() => refetch()} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Production Snapshot</Text>
          <Text style={styles.title}>Market Overview</Text>
          <Text style={styles.subtitle}>
            Ranked surfaces exclude names that fail the v3 eligibility gate and carry confidence plus freshness.
          </Text>
        </View>

        <Surface style={styles.heroCard} variant="elevated">
          <Text style={styles.heroTitle}>Evidence-led market snapshot.</Text>
          <Text style={styles.heroBody}>
            The home tab prioritizes regime, participation, and data quality before any ranked list appears.
          </Text>
          <View style={styles.heroBadges}>
            <Badge label={data?.eligible_count != null ? `${data.eligible_count} eligible` : 'Eligible universe'} variant="primary" />
            <Badge label={data?.excluded_count != null ? `${data.excluded_count} excluded` : 'Eligibility gate'} variant="neutral" />
            <Badge label={stale ? 'Stale inputs' : 'Fresh snapshot'} variant={stale ? 'warning' : 'success'} />
          </View>
        </Surface>

        {isLoading ? (
          <View style={styles.section}>
            <CardSkeleton variant="full" />
            <CardSkeleton style={styles.skeletonGap} />
            <CardSkeleton style={styles.skeletonGap} />
          </View>
        ) : error ? (
          <View style={styles.section}>
            <StatePanel
              icon="cloud-offline-outline"
              title="Snapshot unavailable"
              message={error instanceof Error ? error.message : 'The backend did not return a usable market snapshot.'}
              actionLabel="Retry"
              onAction={() => refetch()}
              tone="error"
            />
            </View>
          ) : data ? (
          <>
            <SentimentHeader sentiment={data.sentiment} />

            <View style={styles.section}>
              <Surface style={styles.summaryCard} variant="filled">
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={styles.summaryTitle}>Freshness & coverage</Text>
                    <Text style={styles.summaryText}>{formatTimestampLabel(data.generated_at)}</Text>
                  </View>
                  <Badge label={stale ? 'Stale inputs' : 'Fresh'} variant={stale ? 'warning' : 'success'} />
                </View>
                <View style={styles.summaryMeta}>
                  <Badge label={`${data.eligible_count ?? 0} eligible`} variant="primary" />
                  <Badge label={`${data.excluded_count ?? 0} excluded`} variant="neutral" />
                  {data.freshness_summary ? <Badge label={data.freshness_summary} variant="neutral" /> : null}
                </View>
              </Surface>
            </View>

            {data.indices.length ? (
              <View style={styles.section}>
                <SectionHeader title="Indices" subtitle="Cross-market context" />
                <MarketStrip indices={data.indices} />
              </View>
            ) : null}

            <RankedSection
              title="Top Picks"
              subtitle="Highest-confidence long candidates"
              stocks={data.top_picks}
              emptyCopy="No candidates met the strict long criteria."
              onOpenTicker={openStockSheet}
            />

            <RankedSection
              title="Shorts"
              subtitle="Highest-conviction bearish setups"
              stocks={data.shorts}
              emptyCopy="No bearish setups passed the quality gate."
              onOpenTicker={openStockSheet}
            />

            <RankedSection
              title="Gainers"
              subtitle="Best intraday movers still passing eligibility"
              stocks={data.gainers}
              emptyCopy="No eligible gainers are available right now."
              onOpenTicker={openStockSheet}
            />

            <RankedSection
              title="Losers"
              subtitle="Weakest movers still passing eligibility"
              stocks={data.losers}
              emptyCopy="No eligible losers are available right now."
              onOpenTicker={openStockSheet}
            />
          </>
        ) : (
          <View style={styles.section}>
            <StatePanel
              icon="information-circle-outline"
              title="No market snapshot"
              message="The backend returned an empty snapshot."
              actionLabel="Retry"
              onAction={() => refetch()}
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
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fontFamily.serif,
    fontSize: fontSize.xl,
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
  summaryCard: {
    gap: spacing.md,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryText: {
    color: colors.textSecondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  summaryTitle: {
    color: colors.text,
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.md,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.serif,
    fontSize: fontSize['3xl'],
    marginTop: 4,
  },
});
