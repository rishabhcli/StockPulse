import React, { useCallback, useEffect, useMemo, useState, forwardRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { analyzeStock } from '../../lib/api';
import { StockAnalysis } from '../../lib/types';
import { colors, spacing, fontSize } from '../../constants/theme';
import { Loading } from '../ui/Loading';
import SheetBackground from './SheetBackground';
import StockAnalysisContent from '../stocks/StockAnalysisContent';

// ============================================================================
// CUSTOM HANDLE — per @gorhom/bottom-sheet docs, handleComponent receives
// BottomSheetHandleProps = { animatedIndex, animatedPosition }
// ============================================================================

interface SheetHandleProps extends BottomSheetHandleProps {
  onClose: () => void;
}

function SheetHandle({ onClose }: SheetHandleProps) {
  return (
    <View style={styles.handleContainer}>
      <View style={styles.handle} />
      <Pressable onPress={onClose} style={styles.closeButtonOuter} hitSlop={12}>
        <Ionicons name="close-circle" size={28} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

// ============================================================================
// STOCK ANALYSIS SHEET — Full-screen (92%) bottom sheet
// Uses its own local state so it doesn't clobber the analyze screen's store.
// ============================================================================

interface StockAnalysisSheetProps {
  ticker: string | null;
}

const StockAnalysisSheet = forwardRef<BottomSheetModal, StockAnalysisSheetProps>(
  ({ ticker }, ref) => {
    const snapPoints = useMemo(() => ['92%'], []);
    const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!ticker) return;

      let cancelled = false;
      setIsLoading(true);
      setError(null);
      setAnalysis(null);

      analyzeStock(ticker)
        .then((result) => {
          if (!cancelled) {
            setAnalysis(result);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Failed to analyze stock');
            setIsLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [ticker]);

    const handleClose = useCallback(async () => {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
          pressBehavior="close"
        />
      ),
      [],
    );

    // handleComponent receives BottomSheetHandleProps per library docs
    const renderHandle = useCallback(
      (props: BottomSheetHandleProps) => (
        <SheetHandle {...props} onClose={handleClose} />
      ),
      [handleClose],
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
      >
        {isLoading ? (
          <BottomSheetView style={styles.loadingContainer}>
            <Loading message={`Analyzing ${ticker}...`} />
          </BottomSheetView>
        ) : error ? (
          <BottomSheetView style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </BottomSheetView>
        ) : analysis ? (
          <StockAnalysisContent
            analysis={analysis}
            ScrollComponent={BottomSheetScrollView}
          />
        ) : null}
      </BottomSheetModal>
    );
  },
);

StockAnalysisSheet.displayName = 'StockAnalysisSheet';

export default StockAnalysisSheet;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  handleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  closeButtonOuter: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.sm - 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xl * 2,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
