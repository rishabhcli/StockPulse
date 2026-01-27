import React from 'react';
import { Text, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize } from '../../constants/theme';
import { getGlossaryKey, GLOSSARY } from '../../lib/glossary';
import { useSheetContext } from './SheetProvider';

// ============================================================================
// TAPPABLE TERM — Inline pressable text that opens a glossary sheet
// ============================================================================

interface TappableTermProps {
  /** The display name of the term (e.g. "RSI (14)", "VIX") */
  displayName: string;
  /** Override glossary key if the display name doesn't map automatically */
  glossaryKey?: string;
  /** Text style overrides */
  style?: any;
}

export default function TappableTerm({ displayName, glossaryKey, style }: TappableTermProps) {
  const { openGlossarySheet } = useSheetContext();
  const key = glossaryKey || getGlossaryKey(displayName);

  // If we don't have a glossary entry, render plain text
  if (!key || !GLOSSARY[key]) {
    return <Text style={style}>{displayName}</Text>;
  }

  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    openGlossarySheet(key);
  };

  return (
    <Pressable onPress={handlePress} style={styles.pressable}>
      <Text style={[styles.term, style]}>
        {displayName}
      </Text>
      <Ionicons
        name="information-circle-outline"
        size={12}
        color={colors.textMuted}
        style={styles.icon}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  term: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  icon: {
    marginLeft: 3,
    opacity: 0.6,
  },
});
