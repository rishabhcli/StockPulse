import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontFamily, borderRadius } from '../../constants/theme';
import { isLiquidGlassAvailable } from '../../components/ui/Surface';

// iOS 26 Liquid Glass
let GlassView: any = null;
try {
  const glassModule = require('expo-glass-effect');
  GlassView = glassModule.GlassView;
} catch {}

export default function ChatScreen() {
  const useGlass = isLiquidGlassAvailable() && GlassView;

  const emptyContent = (
    <>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>Coming Soon</Text>
      <Text style={styles.emptySubtitle}>
        AI-powered stock analysis chat will be available here.
      </Text>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.subtitle}>Ask anything about stocks</Text>
      </View>
      <View style={styles.emptyState}>
        {useGlass ? (
          <View style={styles.glassCardWrapper}>
            <GlassView style={styles.glassCard} glassEffectStyle="clear">
              <View style={styles.glassCardContent}>
                {emptyContent}
              </View>
            </GlassView>
          </View>
        ) : (
          emptyContent
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xl * 4,
  },
  glassCardWrapper: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    marginHorizontal: spacing.xl,
  },
  glassCard: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  glassCardContent: {
    padding: spacing.xl,
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
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
