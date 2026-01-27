import React from 'react';
import { Platform, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Badge as PaperBadge } from 'react-native-paper';
import { colors, borderRadius, spacing, fontSize } from '../../constants/theme';

// ============================================================================
// TYPES
// ============================================================================

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  outlined?: boolean;
}

// ============================================================================
// COLOR MAPPINGS
// ============================================================================

const variantColors: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  success: {
    bg: colors.successMuted,
    text: colors.strongBuy,
    border: colors.strongBuy,
  },
  warning: {
    bg: colors.warningMuted,
    text: colors.warning,
    border: colors.warning,
  },
  error: {
    bg: colors.errorMuted,
    text: colors.error,
    border: colors.error,
  },
  info: {
    bg: colors.infoMuted,
    text: colors.info,
    border: colors.info,
  },
  neutral: {
    bg: colors.surfaceVariant,
    text: colors.textSecondary,
    border: colors.border,
  },
  primary: {
    bg: colors.primaryMuted,
    text: colors.primary,
    border: colors.primary,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function Badge({
  label,
  variant = 'neutral',
  size = 'medium',
  style,
  outlined = false,
}: BadgeProps) {
  const colorScheme = variantColors[variant];

  const badgeStyle: ViewStyle[] = [
    styles.base,
    styles[size],
    {
      backgroundColor: outlined ? 'transparent' : colorScheme.bg,
      borderWidth: outlined ? 1 : 0,
      borderColor: colorScheme.border,
    },
  ];

  // Platform-specific adjustments
  if (Platform.OS === 'ios') {
    badgeStyle.push(styles.iosBadge);
  } else if (Platform.OS === 'android') {
    badgeStyle.push(styles.androidBadge);
  } else if (Platform.OS === 'web') {
    badgeStyle.push(styles.webBadge);
  }

  return (
    <View style={[...badgeStyle, style]}>
      <Text
        style={[
          styles.text,
          styles[`${size}Text`],
          { color: colorScheme.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sizes
  small: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    minHeight: 18,
  },
  medium: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 24,
  },
  large: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 30,
  },

  // Text
  text: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  smallText: {
    fontSize: fontSize.xs - 1,
  },
  mediumText: {
    fontSize: fontSize.xs,
  },
  largeText: {
    fontSize: fontSize.sm,
  },

  // Platform-specific
  iosBadge: {
    // iOS glass-tinted badge with subtle depth
    borderWidth: 1,
    borderColor: colors.ios.glassBorderMedium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  androidBadge: {
    // M3 tonal badge with pill shape
    elevation: 0,
    borderRadius: borderRadius.lg,
  },
  webBadge: {
    // Web glassmorphism badge
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderWidth: 1,
    borderColor: colors.web.glassBorder,
  } as any,
});

export default Badge;
