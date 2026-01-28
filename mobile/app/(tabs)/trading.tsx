import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Platform, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors, spacing, fontSize, fontFamily, borderRadius, animation } from '../../constants/theme';
import Surface from '../../components/ui/Surface';
import Button from '../../components/ui/Button';
import { isLiquidGlassAvailable } from '../../components/ui/Surface';
import { useTradingStore } from '../../stores/useTradingStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Loading } from '../../components/ui/Loading';
import api from '../../lib/api';

// ============================================================================
// iOS 26 LIQUID GLASS
// ============================================================================

let GlassView: any = null;
try {
  const glassModule = require('expo-glass-effect');
  GlassView = glassModule.GlassView;
} catch {}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// ANIMATED PORTFOLIO HERO CARD
// ============================================================================

interface PortfolioHeroProps {
  totalValue: number;
  cash: number;
  totalPnL: number;
  totalReturnPct: number;
  formatCurrency: (value: number) => string;
  formatPnL: (value: number) => string;
}

function PortfolioHero({ totalValue, cash, totalPnL, totalReturnPct, formatCurrency, formatPnL }: PortfolioHeroProps) {
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, animation.spring.gentle);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const useGlass = isLiquidGlassAvailable() && GlassView;

  const cardContent = (
    <>
      <Text style={styles.portfolioLabel}>Portfolio Value</Text>
      <Text style={styles.portfolioValue}>{formatCurrency(totalValue)}</Text>

      <View style={styles.pnlRow}>
        <View style={styles.pnlItem}>
          <Text style={styles.pnlLabel}>Cash</Text>
          <Text style={styles.pnlValueNeutral}>{formatCurrency(cash)}</Text>
        </View>
        <View style={styles.pnlDivider} />
        <View style={styles.pnlItem}>
          <Text style={styles.pnlLabel}>Total P&L</Text>
          <Text style={[styles.pnlValue, totalPnL >= 0 ? styles.positive : styles.negative]}>
            {formatPnL(totalPnL)} ({totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}%)
          </Text>
        </View>
      </View>
    </>
  );

  if (useGlass) {
    return (
      <Animated.View style={[styles.portfolioCardWrapper, animatedStyle]}>
        <GlassView
          style={styles.portfolioCardGlass}
          glassEffectStyle="regular"
          tintColor={colors.ios.glassTint}
        >
          {cardContent}
        </GlassView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Surface style={styles.portfolioCard}>
        {cardContent}
      </Surface>
    </Animated.View>
  );
}

// ============================================================================
// ANIMATED POSITION CARD
// ============================================================================

interface AnimatedPositionCardProps {
  position: any;
  index: number;
  formatCurrency: (value: number) => string;
}

function AnimatedPositionCard({ position, index, formatCurrency }: AnimatedPositionCardProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-20);
  const pressed = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(index * 80, withTiming(1, { duration: 300 }));
    translateX.value = withDelay(index * 80, withSpring(0, animation.spring.gentle));
  }, [index]);

  const handlePressIn = () => {
    pressed.value = withSpring(1, animation.spring.snappy);
  };
  const handlePressOut = () => {
    pressed.value = withSpring(0, animation.spring.bouncy);
  };

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.98]);
    return {
      opacity: opacity.value,
      transform: [{ translateX: translateX.value }, { scale }],
    };
  });

  const marketValue = position.quantity * position.avg_entry_price;

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
    >
      <Surface style={styles.positionCard}>
        <View style={styles.positionHeader}>
          <View>
            <View style={styles.tickerRow}>
              <Text style={styles.positionTicker}>{position.ticker}</Text>
              <View style={[
                styles.sideBadge,
                position.side === 'long' ? styles.sideBadgeLong : styles.sideBadgeShort,
              ]}>
                <Text style={[
                  styles.sideBadgeText,
                  position.side === 'long' ? styles.sideBadgeTextLong : styles.sideBadgeTextShort,
                ]}>
                  {position.side.toUpperCase()}
                </Text>
              </View>
              {position.human_controlled && (
                <Ionicons name="person" size={12} color={colors.info} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.positionShares}>
              {position.quantity} shares
            </Text>
          </View>
          <View style={styles.positionRight}>
            <Text style={styles.positionPrice}>{formatCurrency(marketValue)}</Text>
          </View>
        </View>

        <View style={styles.positionDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Avg Cost</Text>
            <Text style={styles.detailValue}>{formatCurrency(position.avg_entry_price)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Entry</Text>
            <Text style={styles.detailValue}>
              {new Date(position.entry_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </Surface>
    </AnimatedPressable>
  );
}

// ============================================================================
// ANIMATED TRADE CARD
// ============================================================================

interface AnimatedTradeCardProps {
  trade: any;
  index: number;
  formatCurrency: (value: number) => string;
}

function AnimatedTradeCard({ trade, index, formatCurrency }: AnimatedTradeCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 250 }));
    translateY.value = withDelay(index * 50, withSpring(0, animation.spring.gentle));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Surface style={styles.tradeCard}>
        <View style={styles.tradeHeader}>
          <View style={styles.tradeLeft}>
            <View style={[
              styles.tradeTypeBadge,
              (trade.trade_type === 'buy' || trade.trade_type === 'cover')
                ? styles.tradeTypeBuy
                : styles.tradeTypeSell,
            ]}>
              <Text style={styles.tradeTypeText}>
                {trade.trade_type.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.tradeTicker}>{trade.ticker}</Text>
            {trade.is_manual && (
              <Ionicons name="person" size={10} color={colors.info} style={{ marginLeft: 4 }} />
            )}
          </View>
          <View style={styles.tradeRight}>
            <Text style={styles.tradeValue}>{formatCurrency(trade.value)}</Text>
            <Text style={styles.tradeQty}>
              {trade.quantity} @ {formatCurrency(trade.price)}
            </Text>
          </View>
        </View>
        {trade.reasoning ? (
          <Text style={styles.tradeReasoning} numberOfLines={2}>
            {trade.reasoning}
          </Text>
        ) : null}
        <Text style={styles.tradeTime}>
          {new Date(trade.executed_at).toLocaleString()}
        </Text>
      </Surface>
    </Animated.View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TradingScreen() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const {
    portfolioId,
    cash,
    initialCapital,
    positions,
    trades,
    isLoading,
    error,
    fetchPositions,
    fetchTrades,
    resetPortfolio,
    initialize,
  } = useTradingStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !portfolioId) {
      initialize();
    }
  }, [isAuthenticated]);

  const handleRefresh = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsRefreshing(true);
    await Promise.all([fetchPositions(), fetchTrades(50)]);
    setIsRefreshing(false);
  }, [fetchPositions, fetchTrades]);

  const handleExecuteAI = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsExecuting(true);
    try {
      await api.post('/api/trading-sim/execute');
      await Promise.all([fetchPositions(), fetchTrades(20)]);
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to execute AI trading cycle');
    }
    setIsExecuting(false);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Portfolio',
      'This will delete all positions and reset cash to $100,000. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetPortfolio();
            if (Platform.OS !== 'web') {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatPnL = (value: number) => {
    const formatted = formatCurrency(Math.abs(value));
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  // Calculate total portfolio value from positions
  const positionsValue = positions.reduce((sum, p) => sum + p.quantity * p.avg_entry_price, 0);
  const totalValue = cash + positionsValue;
  const totalPnL = totalValue - initialCapital;
  const totalReturnPct = ((totalValue - initialCapital) / initialCapital) * 100;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptySubtitle}>Sign in to access paper trading</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Loading portfolio..." />;
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
          <Text style={styles.title}>Paper Trading</Text>
          <Text style={styles.subtitle}>AI-driven portfolio simulation</Text>
        </View>

        {/* Animated Portfolio Hero Card */}
        <PortfolioHero
          totalValue={totalValue}
          cash={cash}
          totalPnL={totalPnL}
          totalReturnPct={totalReturnPct}
          formatCurrency={formatCurrency}
          formatPnL={formatPnL}
        />

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Button
            title={isExecuting ? 'Running...' : 'AI Trade Cycle'}
            onPress={handleExecuteAI}
            style={styles.actionButton}
            disabled={isExecuting}
          />
          <Button title="Reset" onPress={handleReset} variant="outline" style={styles.actionButton} />
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Positions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Open Positions ({positions.length})
          </Text>

          {positions.length === 0 ? (
            <Surface style={styles.emptyCard}>
              <Ionicons name="briefcase-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyCardText}>No open positions</Text>
              <Text style={styles.emptyCardSubtext}>Run an AI trade cycle to get started</Text>
            </Surface>
          ) : (
            positions.map((position, index) => (
              <AnimatedPositionCard
                key={position.id}
                position={position}
                index={index}
                formatCurrency={formatCurrency}
              />
            ))
          )}
        </View>

        {/* Recent Trades */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recent Trades ({trades.length})
          </Text>

          {trades.length === 0 ? (
            <Surface style={styles.emptyCard}>
              <Ionicons name="swap-horizontal-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyCardText}>No trades yet</Text>
            </Surface>
          ) : (
            trades.slice(0, 20).map((trade, index) => (
              <AnimatedTradeCard
                key={trade.id}
                trade={trade}
                index={index}
                formatCurrency={formatCurrency}
              />
            ))
          )}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.disclaimerText}>
            This is a paper trading simulator. No real money is involved.
            For educational purposes only.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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
  // Portfolio hero - Glass
  portfolioCardWrapper: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  portfolioCardGlass: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  // Portfolio hero - Fallback
  portfolioCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  portfolioLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  portfolioValue: {
    color: colors.text,
    fontSize: fontSize['4xl'],
    fontFamily: fontFamily.serifItalic,
    marginVertical: spacing.sm,
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Platform.OS === 'ios' ? colors.ios.separator : colors.border,
  },
  pnlItem: {
    flex: 1,
    alignItems: 'center',
  },
  pnlDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: Platform.OS === 'ios' ? colors.ios.separator : colors.border,
  },
  pnlLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginBottom: 4,
  },
  pnlValue: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  pnlValueNeutral: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  positive: {
    color: colors.strongBuy,
  },
  negative: {
    color: colors.error,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
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
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.sansBold,
    marginBottom: spacing.md,
  },
  // Empty states
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyCardText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  emptyCardSubtext: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  // Position cards
  positionCard: {
    marginBottom: spacing.sm,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  positionTicker: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  sideBadge: {
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  sideBadgeLong: {
    backgroundColor: colors.successMuted,
  },
  sideBadgeShort: {
    backgroundColor: colors.errorMuted,
  },
  sideBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  sideBadgeTextLong: {
    color: colors.strongBuy,
  },
  sideBadgeTextShort: {
    color: colors.error,
  },
  positionShares: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  positionRight: {
    alignItems: 'flex-end',
  },
  positionPrice: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  positionDetails: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Platform.OS === 'ios' ? colors.ios.separatorThin : colors.border,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginBottom: 4,
  },
  detailValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  // Trade cards
  tradeCard: {
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginRight: spacing.xs,
  },
  tradeTypeBuy: {
    backgroundColor: colors.successMuted,
  },
  tradeTypeSell: {
    backgroundColor: colors.errorMuted,
  },
  tradeTypeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },
  tradeTicker: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  tradeRight: {
    alignItems: 'flex-end',
  },
  tradeValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  tradeQty: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  tradeReasoning: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  tradeTime: {
    color: colors.textDisabled,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  disclaimerText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    flex: 1,
    lineHeight: 16,
  },
});
