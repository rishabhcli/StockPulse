import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GLOSSARY } from '../../../lib/glossary';
import { colors, spacing, fontSize, fontFamily, borderRadius, isIOS26Plus } from '../../../constants/theme';
import { GlassIconButton } from '../../../components/ui/GlassMenuItem';
import Surface from '../../../components/ui/Surface';

// ============================================================================
// SHEET: GLOSSARY TERM (formSheet presentation)
// iOS 26+: Native Liquid Glass via transparent background
// iOS < 26: BlurView fallback for glass-like effect
// ============================================================================

// Wrapper component that provides blur on iOS < 26
const SheetContainer = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  // iOS 26+ uses native Liquid Glass
  if (Platform.OS === 'ios' && isIOS26Plus) {
    return <View style={[styles.container, style]}>{children}</View>;
  }
  
  // iOS < 26: Use BlurView for glass-like effect
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={80} tint="dark" style={[styles.container, style]}>
        {children}
      </BlurView>
    );
  }
  
  // Android/Web: Solid background
  return <View style={[styles.container, style]}>{children}</View>;
};

export default function GlossarySheet() {
  const { term } = useLocalSearchParams<{ term: string }>();
  const router = useRouter();

  const glossaryEntry = term ? GLOSSARY[term.toLowerCase()] : null;

  const handleClose = () => {
    router.back();
  };

  // Sheet header with grabber and close button
  const SheetHeader = () => (
    <View style={styles.header}>
      <View style={styles.grabber} />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {glossaryEntry?.term || term || 'Term'}
        </Text>
        <GlassIconButton
          icon="close"
          onPress={handleClose}
          size={32}
        />
      </View>
    </View>
  );

  if (!glossaryEntry) {
    return (
      <SheetContainer>
        <SheetHeader />
        <View style={styles.errorContainer}>
          <Ionicons name="help-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorText}>Term not found in glossary</Text>
        </View>
      </SheetContainer>
    );
  }

  return (
    <SheetContainer>
      <SheetHeader />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Short Description */}
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.shortDescription}>{glossaryEntry.shortDescription}</Text>
        </Surface>

        {/* Full Description */}
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.fullDescription}>{glossaryEntry.fullDescription}</Text>
        </Surface>

        {/* Formula (if available) */}
        {glossaryEntry.formula && (
          <Surface style={styles.section}>
            <Text style={styles.sectionTitle}>Formula</Text>
            <View style={styles.formulaBox}>
              <Text style={styles.formulaText}>{glossaryEntry.formula}</Text>
            </View>
          </Surface>
        )}

        {/* Interpretation */}
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>How to Interpret</Text>
          <Text style={styles.interpretationText}>{glossaryEntry.interpretation}</Text>
        </Surface>

        {/* Category Badge */}
        <View style={styles.categoryContainer}>
          <View style={[
            styles.categoryBadge,
            glossaryEntry.category === 'technical' && styles.categoryTechnical,
            glossaryEntry.category === 'fundamental' && styles.categoryFundamental,
            glossaryEntry.category === 'sentiment' && styles.categorySentiment,
          ]}>
            <Text style={styles.categoryText}>
              {glossaryEntry.category.toUpperCase()}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SheetContainer>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Transparent for iOS (Liquid Glass or BlurView shows through)
    backgroundColor: Platform.select({
      ios: 'transparent',
      android: colors.android.surfaceContainerHigh,
      default: colors.surface,
    }),
  },
  header: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  grabber: {
    width: 36,
    height: 5,
    backgroundColor: Platform.select({
      ios: colors.ios.glassBorderLight,
      android: colors.android.outlineVariant,
      default: colors.border,
    }),
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.sansBold,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  shortDescription: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
    lineHeight: fontSize.md * 1.4,
  },
  fullDescription: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.6,
  },
  formulaBox: {
    backgroundColor: Platform.select({
      ios: colors.ios.glassUltraThin,
      android: colors.android.surfaceContainer,
      default: colors.surfaceVariant,
    }),
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: Platform.OS === 'ios' ? 1 : 0,
    borderColor: colors.ios.glassBorderMedium,
  },
  formulaText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    lineHeight: fontSize.sm * 1.6,
  },
  interpretationText: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.6,
  },
  categoryContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryTechnical: {
    backgroundColor: colors.primary + '20',
  },
  categoryFundamental: {
    backgroundColor: colors.info + '20',
  },
  categorySentiment: {
    backgroundColor: colors.warning + '20',
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
