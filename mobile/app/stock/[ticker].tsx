import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAnalysisQuery } from '../../hooks/useStockQueries';
import StockAnalysisContent from '../../components/stocks/StockAnalysisContent';
import StatePanel from '../../components/ui/StatePanel';
import { Loading } from '../../components/ui/Loading';
import { colors } from '../../constants/theme';
import { ApiRequestError } from '../../lib/api';

export default function StockDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const normalizedTicker = (ticker ?? '').toUpperCase();
  const { data, error, isFetching, refetch } = useAnalysisQuery(normalizedTicker);
  const unavailablePayload = error instanceof ApiRequestError ? error.payload : null;

  if (isFetching && !data) {
    return (
      <>
        <Stack.Screen options={{ title: normalizedTicker || 'Stock' }} />
        <Loading fullScreen message={`Loading ${normalizedTicker}...`} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: normalizedTicker || 'Stock' }} />
        <View style={styles.container}>
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
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: normalizedTicker || 'Stock' }} />
        <View style={styles.container}>
          <StatePanel icon="search-outline" title="No analysis" message="No analysis is available for this ticker yet." />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: data.ticker }} />
      <View style={styles.container}>
        <StockAnalysisContent analysis={data} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
