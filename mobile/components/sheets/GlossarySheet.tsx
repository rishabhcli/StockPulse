import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { GLOSSARY, GlossaryEntry } from '../../lib/glossary';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';
import Surface from '../ui/Surface';
import Badge from '../ui/Badge';
import SheetBackground from './SheetBackground';

// ============================================================================
// GLOSSARY SHEET — Half-screen (50%) bottom sheet
// ============================================================================

interface GlossarySheetProps {
  termKey: string | null;
}

const GlossarySheet = forwardRef<BottomSheetModal, GlossarySheetProps>(
  ({ termKey }, ref) => {
    const snapPoints = useMemo(() => ['50%'], []);
    const entry: GlossaryEntry | undefined = termKey ? GLOSSARY[termKey] : undefined;

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
          pressBehavior="close"
        />
      ),
      [],
    );

    const getCategoryVariant = (category: string): 'success' | 'warning' | 'error' | 'neutral' => {
      switch (category) {
        case 'technical':
          return 'success';
        case 'fundamental':
          return 'warning';
        case 'sentiment':
          return 'neutral';
        default:
          return 'neutral';
      }
    };

    const renderHandle = useCallback(
      () => (
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backgroundComponent={SheetBackground}
        handleComponent={renderHandle}
        backdropComponent={renderBackdrop}
        enableDynamicSizing={false}
        enablePanDownToClose
        enableDismissOnClose
        stackBehavior="push"
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {entry ? (
            <>
              {/* Category Badge */}
              <Badge
                label={entry.category.charAt(0).toUpperCase() + entry.category.slice(1)}
                variant={getCategoryVariant(entry.category)}
                size="small"
              />

              {/* Term Name */}
              <Text style={styles.term}>{entry.term}</Text>

              {/* Short Description */}
              <Text style={styles.shortDescription}>{entry.shortDescription}</Text>

              {/* Full Description */}
              <Text style={styles.fullDescription}>{entry.fullDescription}</Text>

              {/* Formula */}
              {entry.formula && (
                <Surface style={styles.formulaBox}>
                  <Text style={styles.formulaLabel}>Formula</Text>
                  <Text style={styles.formulaText}>{entry.formula}</Text>
                </Surface>
              )}

              {/* Interpretation */}
              <Surface style={styles.interpretationBox}>
                <Text style={styles.interpretationLabel}>How to Read</Text>
                <Text style={styles.interpretationText}>{entry.interpretation}</Text>
              </Surface>
            </>
          ) : (
            <Text style={styles.notFound}>Term not found</Text>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

GlossarySheet.displayName = 'GlossarySheet';

export default GlossarySheet;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  term: {
    color: colors.text,
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  shortDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  fullDescription: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  formulaBox: {
    marginBottom: spacing.md,
  },
  formulaLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  formulaText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    lineHeight: 20,
  },
  interpretationBox: {
    marginBottom: spacing.md,
  },
  interpretationLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  interpretationText: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  notFound: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
