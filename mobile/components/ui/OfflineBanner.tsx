import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface OfflineBannerProps {
  isConnected: boolean;
}

export function OfflineBanner({ isConnected }: OfflineBannerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setShow(true);
    } else {
      // Delay hiding to show "back online" briefly
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  if (!show) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.container, !isConnected ? styles.offline : styles.online]}
    >
      <Ionicons
        name={isConnected ? 'wifi' : 'cloud-offline'}
        size={16}
        color={isConnected ? colors.success : colors.warning}
      />
      <Text style={[styles.text, !isConnected ? styles.offlineText : styles.onlineText]}>
        {isConnected ? 'Back online' : 'You\'re offline — showing cached data'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  offline: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
  },
  online: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
  offlineText: {
    color: colors.warning,
  },
  onlineText: {
    color: colors.success,
  },
});
