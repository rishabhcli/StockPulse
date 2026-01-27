import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
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
import { colors, borderRadius, spacing, fontSize, animation } from '../../constants/theme';
import { NewsArticle } from '../../lib/types';
import { formatDate } from '../../lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface NewsItemProps {
  article: NewsArticle;
  onPress?: () => void;
  index?: number;
}

interface NewsListProps {
  articles: NewsArticle[];
  onArticlePress?: (article: NewsArticle) => void;
}

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// NEWS ITEM COMPONENT
// ============================================================================

export function NewsItem({ article, onPress, index = 0 }: NewsItemProps) {
  const pressed = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(15);

  useEffect(() => {
    // Staggered entrance animation
    opacity.value = withDelay(index * 60, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(index * 60, withSpring(0, animation.spring.gentle));
  }, []);

  const handlePressIn = () => {
    pressed.value = withSpring(1, animation.spring.snappy);
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0, animation.spring.bouncy);
  };

  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.98]);
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }, { scale }],
    };
  });

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
      case 'bullish':
        return colors.strongBuy;
      case 'negative':
      case 'bearish':
        return colors.error;
      default:
        return colors.warning;
    }
  };

  const getSentimentIcon = (sentiment: string): keyof typeof Ionicons.glyphMap => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
      case 'bullish':
        return 'trending-up';
      case 'negative':
      case 'bearish':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const sentimentColor = getSentimentColor(article.sentiment);

  return (
    <AnimatedPressable
      style={[
        styles.container,
        Platform.OS === 'ios' && styles.containerIOS,
        Platform.OS === 'android' && styles.containerAndroid,
        animatedStyle,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {/* iOS Inner Glow */}
      {Platform.OS === 'ios' && <View style={styles.iosInnerGlow} pointerEvents="none" />}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {article.title}
        </Text>
        <View style={styles.meta}>
          <View style={styles.sourceContainer}>
            <Ionicons name="newspaper-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.source}>{article.source}</Text>
          </View>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.date}>{formatDate(article.published)}</Text>
        </View>
      </View>

      {/* Sentiment Badge */}
      <View style={[styles.sentimentBadge, { backgroundColor: `${sentimentColor}20` }]}>
        <Ionicons name={getSentimentIcon(article.sentiment)} size={18} color={sentimentColor} />
      </View>
    </AnimatedPressable>
  );
}

// ============================================================================
// NEWS LIST COMPONENT
// ============================================================================

export function NewsList({ articles, onArticlePress }: NewsListProps) {
  if (articles.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="newspaper-outline" size={40} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No News Available</Text>
        <Text style={styles.emptyText}>Check back later for market updates</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {articles.map((article, index) => (
        <NewsItem
          key={index}
          article={article}
          index={index}
          onPress={() => onArticlePress?.(article)}
        />
      ))}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // ============================================================================
  // CONTAINER
  // ============================================================================
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  containerIOS: {
    backgroundColor: colors.ios.glassRegular,
    borderColor: colors.ios.glassBorderMedium,
  },
  containerAndroid: {
    backgroundColor: colors.android.surfaceContainer,
    borderWidth: 0,
    elevation: 1,
  },
  iosInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.ios.vibrancyLight,
  },

  // ============================================================================
  // CONTENT
  // ============================================================================
  content: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  source: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  dot: {
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  date: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },

  // ============================================================================
  // SENTIMENT BADGE
  // ============================================================================
  sentimentBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },

  // ============================================================================
  // LIST
  // ============================================================================
  listContainer: {
    gap: spacing.sm,
  },

  // ============================================================================
  // EMPTY STATE
  // ============================================================================
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
  },
});

export default NewsItem;
