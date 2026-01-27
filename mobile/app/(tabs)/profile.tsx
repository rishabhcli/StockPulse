import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';
import Surface from '../../components/ui/Surface';
import Button from '../../components/ui/Button';
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
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

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Pressable onPress={() => {}} style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable onPress={() => {}} style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>App</Text>

          <Pressable onPress={() => {}} style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>About StockPulse</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <Button
            title={signingOut ? 'Signing Out...' : 'Sign Out'}
            onPress={handleSignOut}
            variant="outline"
            style={styles.signOutButton}
          />
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          StockPulse - Educational purposes only
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
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
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuItemText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  // Sign out
  signOutSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
  signOutButton: {
    borderColor: colors.error,
  },
  // Footer
  footer: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
