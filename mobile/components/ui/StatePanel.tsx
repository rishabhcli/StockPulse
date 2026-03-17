import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Surface from './Surface';
import { colors, fontFamily, fontSize, spacing } from '../../constants/theme';

interface StatePanelProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'info' | 'warning' | 'error';
}

const toneColors = {
  info: colors.info,
  warning: colors.warning,
  error: colors.error,
} as const;

export function StatePanel({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'info',
}: StatePanelProps) {
  return (
    <Surface style={styles.container} variant="filled">
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: `${toneColors[tone]}20` }]}>
          <Ionicons name={icon} size={20} color={toneColors[tone]} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {actionLabel && onAction ? (
            <Pressable onPress={onAction} style={styles.action}>
              <Text style={styles.actionText}>{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: spacing.sm,
  },
  actionText: {
    color: colors.primary,
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.sm,
  },
  container: {
    marginBottom: spacing.md,
  },
  copy: {
    flex: 1,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 36,
    justifyContent: 'center',
    marginTop: 2,
    width: 36,
  },
  message: {
    color: colors.textSecondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: 4,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.sansSemibold,
    fontSize: fontSize.md,
  },
});

export default StatePanel;
