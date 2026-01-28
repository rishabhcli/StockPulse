import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Pressable,
  FlatList,
  Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius, animation, getScoreColor } from '../../constants/theme';
import { isLiquidGlassAvailable } from './Surface';

// iOS 26 Liquid Glass
let GlassView: any = null;
try {
  const glassModule = require('expo-glass-effect');
  GlassView = glassModule.GlassView;
} catch {}

// ============================================================================
// TYPES
// ============================================================================

export interface TickerSuggestion {
  ticker: string;
  company_name: string;
  investment_score?: number;
}

export interface GlassSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  suggestions: TickerSuggestion[];
  onSelectSuggestion: (ticker: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  showSuggestions?: boolean;
}

// ============================================================================
// SUGGESTION ITEM
// ============================================================================

interface SuggestionItemProps {
  item: TickerSuggestion;
  onPress: () => void;
  index: number;
}

function SuggestionItem({ item, onPress, index }: SuggestionItemProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(150)}>
      <Pressable onPress={onPress} style={styles.suggestionItem}>
        {item.investment_score !== undefined && (
          <View style={[styles.scoreCircle, { backgroundColor: getScoreColor(item.investment_score) }]}>
            <Text style={styles.scoreText}>{Math.round(item.investment_score)}</Text>
          </View>
        )}
        <View style={styles.suggestionInfo}>
          <Text style={styles.suggestionTicker}>{item.ticker}</Text>
          <Text style={styles.suggestionCompany} numberOfLines={1}>
            {item.company_name}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// GLASS SEARCH BAR
// ============================================================================

export function GlassSearchBar({
  value,
  onChangeText,
  onSubmit,
  suggestions,
  onSelectSuggestion,
  placeholder = 'Search ticker (e.g., AAPL)',
  isLoading = false,
  showSuggestions = true,
}: GlassSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  const handleFocus = () => {
    setIsFocused(true);
    borderOpacity.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    borderOpacity.value = withTiming(0, { duration: 200 });
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.98, animation.spring.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animation.spring.bouncy);
  };

  const handleSelectSuggestion = async (ticker: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Keyboard.dismiss();
    onSelectSuggestion(ticker);
  };

  const handleSubmit = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Keyboard.dismiss();
    onSubmit();
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(34, 197, 94, ${borderOpacity.value * 0.5})`,
  }));

  const useGlass = isLiquidGlassAvailable() && GlassView && Platform.OS === 'ios';

  // Filter suggestions based on input
  const filteredSuggestions = value.trim().length > 0
    ? suggestions.filter(
        (s) =>
          s.ticker.toLowerCase().includes(value.toLowerCase()) ||
          s.company_name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 6)
    : [];

  const showDropdown = showSuggestions && isFocused && filteredSuggestions.length > 0;

  // ============================================================================
  // iOS 26+ LIQUID GLASS
  // ============================================================================
  if (useGlass) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.searchWrapper, animatedContainerStyle]}>
          <GlassView
            style={[styles.glassInput, isFocused && styles.glassInputFocused]}
            glassEffectStyle={isFocused ? 'regular' : 'clear'}
            isInteractive
          >
            <View style={styles.inputRow}>
              <Ionicons
                name="search"
                size={20}
                color={isFocused ? colors.primary : colors.textMuted}
              />
              <TextInput
                style={styles.textInput}
                value={value}
                onChangeText={onChangeText}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onSubmitEditing={handleSubmit}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="search"
              />
              {isLoading ? (
                <Ionicons name="reload" size={18} color={colors.primary} />
              ) : value.length > 0 ? (
                <Pressable onPress={() => onChangeText('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </GlassView>
        </Animated.View>

        {/* Suggestions Dropdown */}
        {showDropdown && (
          <Animated.View entering={FadeIn.duration(150)} style={styles.suggestionsDropdown}>
            <GlassView style={styles.suggestionsGlass} glassEffectStyle="regular">
              {filteredSuggestions.map((item, index) => (
                <SuggestionItem
                  key={item.ticker}
                  item={item}
                  index={index}
                  onPress={() => handleSelectSuggestion(item.ticker)}
                />
              ))}
            </GlassView>
          </Animated.View>
        )}
      </View>
    );
  }

  // ============================================================================
  // FALLBACK (iOS < 26, Android, Web)
  // ============================================================================
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.searchWrapper, animatedContainerStyle]}>
        <Animated.View
          style={[
            styles.fallbackInput,
            isFocused && styles.fallbackInputFocused,
            animatedBorderStyle,
          ]}
        >
          <View style={styles.inputRow}>
            <Ionicons
              name="search"
              size={20}
              color={isFocused ? colors.primary : colors.textMuted}
            />
            <TextInput
              style={styles.textInput}
              value={value}
              onChangeText={onChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onSubmitEditing={handleSubmit}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
            />
            {isLoading ? (
              <Ionicons name="reload" size={18} color={colors.primary} />
            ) : value.length > 0 ? (
              <Pressable onPress={() => onChangeText('')}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <Animated.View entering={FadeIn.duration(150)} style={styles.suggestionsDropdown}>
          <View style={styles.suggestionsFallback}>
            {filteredSuggestions.map((item, index) => (
              <SuggestionItem
                key={item.ticker}
                item={item}
                index={index}
                onPress={() => handleSelectSuggestion(item.ticker)}
              />
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    zIndex: 100,
  },
  searchWrapper: {
    paddingHorizontal: spacing.md,
  },

  // Glass input (iOS 26+)
  glassInput: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  glassInputFocused: {
    // GlassView handles the visual state
  },

  // Fallback input
  fallbackInput: {
    backgroundColor: Platform.select({
      ios: colors.ios.glassThin,
      android: colors.android.surfaceContainer,
      default: colors.surfaceVariant,
    }),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      default: {},
    }),
  },
  fallbackInputFocused: {
    borderColor: colors.primary,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    padding: 0,
  },

  // Suggestions dropdown
  suggestionsDropdown: {
    position: 'absolute',
    top: 56,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  suggestionsGlass: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    paddingVertical: spacing.xs,
  },
  suggestionsFallback: {
    backgroundColor: Platform.select({
      ios: colors.ios.glassRegular,
      android: colors.android.surfaceContainerHigh,
      default: colors.surface,
    }),
    borderRadius: borderRadius.md,
    borderWidth: Platform.OS === 'android' ? 0 : 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      default: {},
    }),
  },

  // Suggestion item
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  scoreCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTicker: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  suggestionCompany: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
});

export default GlassSearchBar;
