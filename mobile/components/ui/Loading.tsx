import React, { useEffect } from 'react';
import { Platform, View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';

// ============================================================================
// LOADING SPINNER
// ============================================================================

interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  style?: ViewStyle;
}

export function Loading({ message, size = 'large', fullScreen = false, style }: LoadingProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

// ============================================================================
// ANIMATED SKELETON
// ============================================================================

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius: radius = 8,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius: radius },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ============================================================================
// CARD SKELETON
// ============================================================================

interface CardSkeletonProps {
  style?: ViewStyle;
  variant?: 'compact' | 'full';
}

export function CardSkeleton({ style, variant = 'compact' }: CardSkeletonProps) {
  if (variant === 'full') {
    return (
      <View style={[styles.cardSkeleton, styles.cardSkeletonFull, style]}>
        <View style={styles.cardSkeletonHeader}>
          <View style={styles.cardSkeletonHeaderText}>
            <Skeleton width="50%" height={20} />
            <Skeleton width="70%" height={14} style={styles.mt8} />
          </View>
          <Skeleton width={56} height={56} borderRadius={28} />
        </View>
        <View style={styles.cardSkeletonBody}>
          <Skeleton width="40%" height={28} />
          <Skeleton width={80} height={24} borderRadius={12} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.cardSkeleton, style]}>
      <View style={styles.cardSkeletonCompact}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={styles.cardSkeletonCompactText}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} style={styles.mt6} />
        </View>
        <View style={styles.cardSkeletonCompactRight}>
          <Skeleton width={60} height={16} />
          <Skeleton width={40} height={12} style={styles.mt6} />
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// LIST SKELETON
// ============================================================================

interface ListSkeletonProps {
  count?: number;
  variant?: 'compact' | 'full';
  style?: ViewStyle;
}

export function ListSkeleton({ count = 5, variant = 'compact', style }: ListSkeletonProps) {
  return (
    <View style={[styles.listSkeleton, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} variant={variant} style={styles.listSkeletonItem} />
      ))}
    </View>
  );
}

// ============================================================================
// SCORE SKELETON
// ============================================================================

export function ScoreSkeleton({ size = 120 }: { size?: number }) {
  return (
    <View style={[styles.scoreSkeleton, { width: size, height: size }]}>
      <Skeleton width={size} height={size} borderRadius={size / 2} />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Loading
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  message: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // Skeleton base
  skeleton: {
    backgroundColor: Platform.select({
      ios: colors.ios.glassRegular,
      android: colors.android.surfaceContainerHigh,
      default: colors.surfaceVariant,
    }),
  },

  // Card skeleton
  cardSkeleton: {
    backgroundColor: Platform.select({
      ios: colors.ios.glassRegular,
      android: colors.android.surfaceContainer,
      default: colors.web.glassBackground,
    }),
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        borderWidth: 1,
        borderColor: colors.ios.glassBorderMedium,
      },
      android: {
        elevation: 1,
        borderWidth: 0,
        borderColor: 'transparent',
      },
      default: {
        borderWidth: 1,
        borderColor: colors.web.glassBorder,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      },
    } as any),
  },
  cardSkeletonFull: {
    padding: spacing.md,
  },
  cardSkeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardSkeletonHeaderText: {
    flex: 1,
    marginRight: spacing.md,
  },
  cardSkeletonBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.lg,
  },
  cardSkeletonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSkeletonCompactText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  cardSkeletonCompactRight: {
    alignItems: 'flex-end',
  },

  // List skeleton
  listSkeleton: {
    padding: spacing.md,
  },
  listSkeletonItem: {
    marginBottom: spacing.sm,
  },

  // Score skeleton
  scoreSkeleton: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Spacing helpers
  mt6: {
    marginTop: 6,
  },
  mt8: {
    marginTop: 8,
  },
});

export default Loading;
