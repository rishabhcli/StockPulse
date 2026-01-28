import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, fontFamily, borderRadius } from '../../constants/theme';
import Surface from '../../components/ui/Surface';
import Button from '../../components/ui/Button';
import { GlassMenuItem, GlassIconButton } from '../../components/ui/GlassMenuItem';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTradingStore } from '../../stores/useTradingStore';
import { useWatchlistStore } from '../../stores/useWatchlistStore';

export default function ProfileScreen() {
  const router = useRouter();
  const {
    user,
    profile,
    isAuthenticated,
    signOut,
    isLoading: authLoading,
  } = useAuthStore();

  const portfolioId = useTradingStore((s) => s.portfolioId);
  const positions = useTradingStore((s) => s.positions);
  const watchlists = useWatchlistStore((s) => s.watchlists);

  const [signingOut, setSigningOut] = useState(false);

  const performSignOut = async () => {
    setSigningOut(true);
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    await signOut();
    setSigningOut(false);
    router.replace('/auth/login');
  };

  const handleSignOut = () => {
    // Alert.alert() is not available on web, use window.confirm() instead
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        performSignOut();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: performSignOut,
          },
        ]
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centeredContent}>
          <Ionicons name="person-circle-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Not Signed In</Text>
          <Text style={styles.emptySubtitle}>Sign in to view your profile</Text>
          <Button
            title="Sign In"
            onPress={() => router.push('/auth/login')}
            style={styles.signInButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Settings Button */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <GlassIconButton
            icon="settings-outline"
            onPress={() => {
              // TODO: Navigate to settings
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            }}
          />
        </View>

        {/* User Info */}
        <Surface style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color={colors.primary} />
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {profile?.full_name || profile?.username || 'StockPulse User'}
            </Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>
        </Surface>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Surface style={styles.statCard}>
            <Text style={styles.statValue}>{positions.length}</Text>
            <Text style={styles.statLabel}>Positions</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={styles.statValue}>{watchlists.length}</Text>
            <Text style={styles.statLabel}>Watchlists</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={styles.statValue}>
              {watchlists.reduce((sum, w) => sum + (w.items?.length || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Tracked</Text>
          </Surface>
        </View>

        {/* Menu Items — Account */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Surface style={styles.menuContainer} variant="outlined">
            <GlassMenuItem
              label="Edit Profile"
              icon="person-outline"
              onPress={() => {}}
            />
            <GlassMenuItem
              label="Notifications"
              icon="notifications-outline"
              onPress={() => {}}
            />
            <GlassMenuItem
              label="Privacy & Security"
              icon="shield-checkmark-outline"
              onPress={() => {}}
            />
          </Surface>
        </View>

        {/* Menu Items — App */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>App</Text>

          <Surface style={styles.menuContainer} variant="outlined">
            <GlassMenuItem
              label="Appearance"
              icon="color-palette-outline"
              onPress={() => {}}
            />
            <GlassMenuItem
              label="About StockPulse"
              icon="information-circle-outline"
              onPress={() => {}}
            />
            <GlassMenuItem
              label="Help & Support"
              icon="help-circle-outline"
              onPress={() => {}}
            />
          </Surface>
        </View>

        {/* Sign Out */}
        <View style={styles.menuSection}>
          <Surface style={styles.menuContainer} variant="outlined">
            <GlassMenuItem
              label={signingOut ? 'Signing Out...' : 'Sign Out'}
              icon="log-out-outline"
              onPress={handleSignOut}
              destructive
              chevron={false}
              disabled={signingOut}
            />
          </Surface>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          StockPulse v1.0.0{'\n'}
          Educational purposes only
        </Text>
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
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  signInButton: {
    marginTop: spacing.md,
    minWidth: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  // User card
  userCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  userEmail: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 4,
  },
  // Menu
  menuSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.sansSemibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  menuContainer: {
    overflow: 'hidden',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  // Footer
  footer: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: fontSize.xs * 1.5,
  },
});
