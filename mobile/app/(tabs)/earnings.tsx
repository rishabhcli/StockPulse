import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontFamily, borderRadius } from '../../constants/theme';
import Surface from '../../components/ui/Surface';

// Earnings date badge uses platform-adapted styling
const dateBadgeStyle = Platform.select({
  ios: {
    backgroundColor: colors.ios.glassRegular,
    borderWidth: 1,
    borderColor: colors.ios.glassBorderMedium,
  },
  android: {
    backgroundColor: colors.android.surfaceContainerHigh,
    elevation: 1,
  },
  default: {
    backgroundColor: colors.surfaceVariant,
  },
});

export default function EarningsScreen() {
  // This would typically fetch from an earnings calendar API
  // For now, showing placeholder UI

  const upcomingEarnings = [
    { ticker: 'AAPL', company: 'Apple Inc.', date: 'Jan 30, 2026', estimate: '$2.35' },
    { ticker: 'MSFT', company: 'Microsoft Corporation', date: 'Jan 31, 2026', estimate: '$3.12' },
    { ticker: 'GOOGL', company: 'Alphabet Inc.', date: 'Feb 1, 2026', estimate: '$1.89' },
    { ticker: 'AMZN', company: 'Amazon.com Inc.', date: 'Feb 1, 2026', estimate: '$1.45' },
    { ticker: 'META', company: 'Meta Platforms Inc.', date: 'Feb 2, 2026', estimate: '$5.23' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Earnings Calendar</Text>
          <Text style={styles.subtitle}>Upcoming earnings announcements</Text>
        </View>

        {/* This Week */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>This Week</Text>
          </View>

          {upcomingEarnings.map((item, index) => (
            <Surface key={index} style={styles.earningsCard}>
              <View style={styles.earningsHeader}>
                <View>
                  <Text style={styles.earningsTicker}>{item.ticker}</Text>
                  <Text style={styles.earningsCompany}>{item.company}</Text>
                </View>
                <View style={styles.earningsDate}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.dateText}>{item.date}</Text>
                </View>
              </View>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>EPS Estimate</Text>
                <Text style={styles.estimateValue}>{item.estimate}</Text>
              </View>
            </Surface>
          ))}
        </View>

        {/* Info Box */}
        <Surface style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color={colors.info} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Earnings Season</Text>
            <Text style={styles.infoText}>
              Q4 2025 earnings season is underway. Major tech companies report this week.
              Tap any stock to analyze before earnings.
            </Text>
          </View>
        </Surface>
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
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.sansBold,
  },
  earningsCard: {
    marginBottom: spacing.sm,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  earningsTicker: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  earningsCompany: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  earningsDate: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
    ...dateBadgeStyle,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Platform.OS === 'ios' ? colors.ios.separator : colors.border,
  },
  estimateLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  estimateValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.infoMuted,
    borderColor: `${colors.info}30`,
    gap: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
