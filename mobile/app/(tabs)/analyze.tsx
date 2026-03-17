import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import StatePanel from '../../components/ui/StatePanel';
import StockAnalysisContent from '../../components/stocks/StockAnalysisContent';
import { CardSkeleton } from '../../components/ui/Loading';
import Surface from '../../components/ui/Surface';
import { StockCard } from '../../components/stocks/StockCard';
import { colors, fontFamily, fontSize, spacing } from '../../constants/theme';
import { useAnalysisQuery, usePrefetchQueries, useSnapshotQuery } from '../../hooks/useStockQueries';
import { ApiRequestError } from '../../lib/api';
import { useSheetContext } from '../../components/sheets/SheetProvider';
import Badge from '../../components/ui/Badge';
import SectionHeader from '../../components/ui/SectionHeader';
import { formatTimestampLabel, isTimestampStale } from '../../lib/presentation';

export default function AnalyzeScreen() {
  const [input, setInput] = useState('');
  const [submittedTicker, setSubmittedTicker] = useState('');
  const { data: snapshot } = useSnapshotQuery();
  const { data, error, isFetching, refetch } = useAnalysisQuery(submittedTicker);
  const { prefetchAnalysis } = usePrefetchQueries();
  const { openStockSheet } = useSheetContext();

  const quickPicks = useMemo(() => snapshot?.top_picks?.slice(0, 6) ?? [], [snapshot?.top_picks]);
  const analysisStale = isTimestampStale(data?.generated_at);

  const handleAnalyze = async () => {
    const normalized = input.trim().toUpperCase();
    if (!normalized) return;
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSubmittedTicker(normalized);
  };

  const unavailablePayload = error instanceof ApiRequestError ? error.payload : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Strict Analyzer</Text>
            <Text style={styles.title}>Single-Name Analysis</Text>
            <Text style={styles.subtitle}>
              The screen only surfaces the canonical v3 thesis. Missing core data returns unavailable.
            </Text>
          </View>

          <Surface style={styles.heroCard} variant="elevated">
            <Text style={styles.heroTitle}>Evidence-led, not weight-led.</Text>
            <Text style={styles.heroBody}>
              Each result is built from the same analysis payload and rendered only when the underlying inputs are complete.
            </Text>
            <View style={styles.heroBadges}>
              <Badge label="Canonical v3" variant="primary" />
              <Badge label="Core gate" variant="neutral" />
              <Badge label="Freshness-aware" variant={analysisStale ? 'warning' : 'success'} />
            </View>
            {data ? (
              <View style={styles.heroMeta}>
                <Badge label={`Updated ${formatTimestampLabel(data.generated_at)}`} variant={analysisStale ? 'warning' : 'neutral'} size="small" />
                <Badge label={data.data_quality?.status ?? 'unknown'} variant={data.data_quality?.status === 'complete' ? 'success' : data.data_quality?.status === 'partial' ? 'warning' : 'error'} size="small" />
              </View>
            ) : null}
          </Surface>

          <Surface style={styles.searchCard} variant="filled">
            <Input
              placeholder="Enter ticker symbol"
              value={input}
              onChangeText={setInput}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleAnalyze}
              leftIcon={<Ionicons name="search-outline" size={18} color={colors.textMuted} />}
            />
            <Button title="Run analysis" onPress={handleAnalyze} loading={isFetching} disabled={!input.trim()} style={styles.searchButton} />
          </Surface>

          {!submittedTicker && quickPicks.length ? (
            <View style={styles.section}>
              <SectionHeader title="Quick picks" subtitle="Tap to inspect an eligible name that already passed the gate." />
              <View style={styles.quickGrid}>
                {quickPicks.map((stock) => (
                  <StockCard
                    key={stock.ticker}
                    stock={stock}
                    variant="compact"
                    onPress={() => {
                      setInput(stock.ticker);
                      setSubmittedTicker(stock.ticker);
                      void prefetchAnalysis(stock.ticker);
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {submittedTicker && isFetching && !data ? (
            <View style={styles.section}>
              <CardSkeleton variant="full" />
              <CardSkeleton style={styles.skeletonGap} />
            </View>
          ) : null}

          {error && unavailablePayload?.status === 'unavailable' ? (
            <View style={styles.section}>
              <StatePanel
                icon="ban-outline"
                title={`${submittedTicker} is unavailable`}
                message={`${error.message}${unavailablePayload?.missing_inputs?.length ? ` Missing inputs: ${unavailablePayload.missing_inputs.join(', ')}` : ''}`}
                actionLabel="Retry"
                onAction={() => refetch()}
                tone="warning"
              />
            </View>
          ) : null}

          {error && unavailablePayload?.status !== 'unavailable' ? (
            <View style={styles.section}>
              <StatePanel
                icon="cloud-offline-outline"
                title="Analysis failed"
                message={error instanceof Error ? error.message : 'The backend did not return a usable analysis.'}
                actionLabel="Retry"
                onAction={() => refetch()}
                tone="error"
              />
            </View>
          ) : null}

          {data ? (
            <View style={styles.analysisWrap}>
              {analysisStale ? (
                <View style={styles.section}>
                  <StatePanel
                    icon="time-outline"
                    title="Stale analysis"
                    message="The result is still valid, but the underlying inputs should be refreshed before you rely on it."
                    tone="warning"
                  />
                </View>
              ) : null}
              <StockAnalysisContent analysis={data} />
            </View>
          ) : null}

          {submittedTicker && !isFetching && !data && !error ? (
            <View style={styles.section}>
              <StatePanel
                icon="search-outline"
                title="No analysis yet"
                message="Run a ticker to load the canonical v3 analysis."
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  analysisWrap: {
    marginTop: spacing.md,
  },
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
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
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
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: fontFamily.serif,
    fontSize: fontSize.xl,
  },
  quickGrid: {
    gap: spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  searchButton: {
    marginTop: spacing.sm,
  },
  searchCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
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
  title: {
    color: colors.text,
    fontFamily: fontFamily.serif,
    fontSize: fontSize['3xl'],
    marginTop: 4,
  },
});
