import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { GlassIconButton } from '../../../components/ui/GlassMenuItem';
import { colors, fontFamily, fontSize, isIOS26Plus, spacing } from '../../../constants/theme';
import { useAnalysisQuery } from '../../../hooks/useStockQueries';
import StockAnalysisContent from '../../../components/stocks/StockAnalysisContent';
import StatePanel from '../../../components/ui/StatePanel';
import { Loading } from '../../../components/ui/Loading';
import { ApiRequestError } from '../../../lib/api';

function SheetContainer({ children }: { children: React.ReactNode }) {
  if (isIOS26Plus) {
    return <View style={styles.container}>{children}</View>;
  }

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={80} tint="dark" style={styles.container}>
        {children}
      </BlurView>
    );
  }

  return <View style={styles.container}>{children}</View>;
}

export default function StockSheet() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const normalizedTicker = (ticker ?? '').toUpperCase();
  const router = useRouter();
  const { data, error, isFetching, refetch } = useAnalysisQuery(normalizedTicker);
  const unavailablePayload = error instanceof ApiRequestError ? error.payload : null;

  return (
    <SheetContainer>
      <View style={styles.header}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{normalizedTicker || 'Stock'}</Text>
          <GlassIconButton icon="close" onPress={() => router.back()} size={32} />
        </View>
      </View>

      {isFetching && !data ? (
        <Loading message={`Analyzing ${normalizedTicker}...`} />
      ) : error ? (
        <View style={styles.content}>
          <StatePanel
            icon={unavailablePayload?.status === 'unavailable' ? 'ban-outline' : 'cloud-offline-outline'}
            title={unavailablePayload?.status === 'unavailable' ? `${normalizedTicker} unavailable` : 'Analysis failed'}
            message={
              unavailablePayload?.status === 'unavailable' && unavailablePayload?.missing_inputs?.length
                ? `${error.message} Missing inputs: ${unavailablePayload.missing_inputs.join(', ')}`
                : error.message
            }
            actionLabel="Retry"
            onAction={() => refetch()}
            tone={unavailablePayload?.status === 'unavailable' ? 'warning' : 'error'}
          />
        </View>
      ) : data ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <StockAnalysisContent analysis={data} />
        </ScrollView>
      ) : (
        <View style={styles.content}>
          <StatePanel icon="search-outline" title="No analysis" message="No analysis is available for this ticker yet." />
        </View>
      )}
    </SheetContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 5,
    marginBottom: spacing.sm,
    width: 42,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.serif,
    fontSize: fontSize.xl,
  },
});
