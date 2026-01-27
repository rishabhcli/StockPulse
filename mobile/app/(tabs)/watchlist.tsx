import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Platform,
  Alert,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSheetContext } from '../../components/sheets/SheetProvider';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';
import Surface from '../../components/ui/Surface';
import Button from '../../components/ui/Button';
import { useWatchlistStore } from '../../stores/useWatchlistStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Loading } from '../../components/ui/Loading';

export default function WatchlistScreen() {
  const { openStockSheet } = useSheetContext();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const {
    watchlists,
    isLoading,
    error,
    fetchWatchlists,
    createWatchlist,
    deleteWatchlist,
    addToWatchlist,
    removeFromWatchlist,
  } = useWatchlistStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [showAddTicker, setShowAddTicker] = useState<string | null>(null);
  const [newTicker, setNewTicker] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchWatchlists();
    }
  }, [isAuthenticated]);

  const handleRefresh = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsRefreshing(true);
    await fetchWatchlists();
    setIsRefreshing(false);
  }, [fetchWatchlists]);

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) return;
    const { error } = await createWatchlist(newWatchlistName.trim());
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNewWatchlistName('');
      setShowCreateForm(false);
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleDeleteWatchlist = (watchlistId: string, name: string) => {
    Alert.alert(
      'Delete Watchlist',
      `Delete "${name}" and all its items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteWatchlist(watchlistId),
        },
      ]
    );
  };

  const handleAddTicker = async (watchlistId: string) => {
    if (!newTicker.trim()) return;
    const { error } = await addToWatchlist(watchlistId, newTicker.trim());
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNewTicker('');
      setShowAddTicker(null);
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleRemoveItem = (itemId: string, ticker: string) => {
    Alert.alert(
      'Remove Stock',
      `Remove ${ticker} from watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFromWatchlist(itemId),
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptySubtitle}>Sign in to create watchlists</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && watchlists.length === 0) {
    return <Loading fullScreen message="Loading watchlists..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Watchlists</Text>
              <Text style={styles.subtitle}>Track your favorite stocks</Text>
            </View>
            <Pressable
              onPress={() => setShowCreateForm(!showCreateForm)}
              style={styles.addButton}
            >
              <Ionicons
                name={showCreateForm ? 'close' : 'add-circle'}
                size={28}
                color={colors.primary}
              />
            </Pressable>
          </View>
        </View>

        {/* Create Form */}
        {showCreateForm && (
          <Surface style={styles.createForm}>
            <TextInput
              style={styles.input}
              placeholder="Watchlist name"
              placeholderTextColor={colors.textMuted}
              value={newWatchlistName}
              onChangeText={setNewWatchlistName}
              autoFocus
              onSubmitEditing={handleCreateWatchlist}
            />
            <Button
              title="Create"
              onPress={handleCreateWatchlist}
              style={styles.createButton}
            />
          </Surface>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Watchlists */}
        {watchlists.length === 0 && !showCreateForm ? (
          <View style={styles.emptyContent}>
            <Ionicons name="bookmark-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Watchlists</Text>
            <Text style={styles.emptySubtitle}>
              Tap + to create your first watchlist
            </Text>
          </View>
        ) : (
          watchlists.map((watchlist) => (
            <View key={watchlist.id} style={styles.watchlistSection}>
              <View style={styles.watchlistHeader}>
                <View style={styles.watchlistTitleRow}>
                  <Ionicons name="bookmark" size={18} color={colors.primary} />
                  <Text style={styles.watchlistName}>{watchlist.name}</Text>
                  <Text style={styles.watchlistCount}>
                    {watchlist.items?.length || 0}
                  </Text>
                </View>
                <View style={styles.watchlistActions}>
                  <Pressable
                    onPress={() => setShowAddTicker(
                      showAddTicker === watchlist.id ? null : watchlist.id
                    )}
                    hitSlop={8}
                  >
                    <Ionicons name="add" size={22} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteWatchlist(watchlist.id, watchlist.name)}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                </View>
              </View>

              {/* Add ticker form */}
              {showAddTicker === watchlist.id && (
                <View style={styles.addTickerRow}>
                  <TextInput
                    style={styles.tickerInput}
                    placeholder="Ticker (e.g. AAPL)"
                    placeholderTextColor={colors.textMuted}
                    value={newTicker}
                    onChangeText={(t) => setNewTicker(t.toUpperCase())}
                    autoFocus
                    autoCapitalize="characters"
                    onSubmitEditing={() => handleAddTicker(watchlist.id)}
                  />
                  <Button
                    title="Add"
                    onPress={() => handleAddTicker(watchlist.id)}
                    style={styles.addTickerButton}
                  />
                </View>
              )}

              {/* Watchlist items */}
              {(!watchlist.items || watchlist.items.length === 0) ? (
                <Surface style={styles.emptyWatchlist}>
                  <Text style={styles.emptyWatchlistText}>
                    No stocks added yet
                  </Text>
                </Surface>
              ) : (
                watchlist.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => openStockSheet(item.ticker)}
                    onLongPress={() => handleRemoveItem(item.id, item.ticker)}
                  >
                    <Surface style={styles.watchlistItem}>
                      <View style={styles.itemLeft}>
                        <Text style={styles.itemTicker}>{item.ticker}</Text>
                        <Text style={styles.itemDate}>
                          Added {new Date(item.added_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </Surface>
                  </Pressable>
                ))
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 3,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  addButton: {
    padding: spacing.xs,
  },
  // Create form
  createForm: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createButton: {
    minWidth: 80,
  },
  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.errorMuted,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    flex: 1,
  },
  // Empty states
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyContent: {
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  // Watchlist sections
  watchlistSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  watchlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  watchlistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  watchlistName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  watchlistCount: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },
  watchlistActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // Add ticker
  addTickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tickerInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addTickerButton: {
    minWidth: 60,
  },
  // Watchlist items
  emptyWatchlist: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyWatchlistText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  watchlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  itemLeft: {
    flex: 1,
  },
  itemTicker: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  itemDate: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
