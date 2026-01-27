import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../../constants/theme';

// ============================================================================
// iOS 26 NATIVE TABS (Liquid Glass)
// Uses Apple's real UITabBarController — automatic Liquid Glass appearance,
// tab bar minimization on scroll, SF Symbol support.
// ============================================================================

let NativeTabs: any = null;
let hasNativeTabs = false;

if (Platform.OS === 'ios') {
  try {
    const mod = require('expo-router/unstable-native-tabs');
    NativeTabs = mod.NativeTabs;
    hasNativeTabs = !!NativeTabs;
  } catch {
    hasNativeTabs = false;
  }
}

// ============================================================================
// TAB BAR ICON COMPONENT (for JS Tabs fallback)
// ============================================================================

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
}

function TabIcon({ name, color, size, focused }: TabIconProps) {
  const outlineName = `${name}-outline` as keyof typeof Ionicons.glyphMap;
  const iconName = focused ? name : outlineName;

  // Android M3: Active indicator pill behind focused icon
  if (Platform.OS === 'android') {
    return (
      <View style={focused ? styles.androidActiveIndicator : undefined}>
        <Ionicons name={iconName} size={size} color={color} />
      </View>
    );
  }

  // iOS fallback & Web: Standard filled/outline toggle
  return <Ionicons name={iconName} size={size - 1} color={color} />;
}

// ============================================================================
// iOS 26 NATIVE TABS LAYOUT
// ============================================================================

function IOSNativeTabLayout() {
  if (!NativeTabs) return null;

  return (
    <NativeTabs
      tintColor={colors.primary}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Overview</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="analyze">
        <NativeTabs.Trigger.Label>Analyze</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="screener">
        <NativeTabs.Trigger.Label>Screener</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="earnings">
        <NativeTabs.Trigger.Label>Earnings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'calendar', selected: 'calendar' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trading">
        <NativeTabs.Trigger.Label>Trading</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'briefcase', selected: 'briefcase.fill' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="watchlist">
        <NativeTabs.Trigger.Label>Watchlist</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bookmark', selected: 'bookmark.fill' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.circle', selected: 'person.circle.fill' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ============================================================================
// JS TABS LAYOUT (Android + Web + iOS fallback)
// ============================================================================

function JSTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,

        // Platform-specific tab bar styling
        tabBarStyle: Platform.OS === 'ios'
          ? styles.tabBarIOS
          : Platform.OS === 'android'
          ? styles.tabBarAndroid
          : styles.tabBarWeb,

        // iOS fallback: System blur background (matches native UITabBarController)
        tabBarBackground: Platform.OS === 'ios' ? () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={80}
              tint="systemChromeMaterialDark"
              style={StyleSheet.absoluteFill}
            />
            {/* Top hairline separator (Apple style) */}
            <View style={styles.iosTabBarSeparator} />
          </View>
        ) : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="analyze"
        options={{
          title: 'Analyze',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="search" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="screener"
        options={{
          title: 'Screener',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="stats-chart" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="calendar" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trading"
        options={{
          title: 'Trading',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="briefcase" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="bookmark" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="person-circle" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

// ============================================================================
// MAIN EXPORT — Pick native or JS tabs
// ============================================================================

export default function TabLayout() {
  // iOS 26+: Use Apple's native UITabBarController with Liquid Glass
  if (hasNativeTabs) {
    return <IOSNativeTabLayout />;
  }

  // Android / Web / iOS < 26: Use JS tabs with BlurView fallback
  return <JSTabLayout />;
}

// ============================================================================
// STYLES (JS Tabs only — NativeTabs handles its own styling)
// ============================================================================

const styles = StyleSheet.create({
  // ==========================================================================
  // iOS TAB BAR FALLBACK — Native Blur (matches UITabBarController)
  // ==========================================================================
  tabBarIOS: {
    position: 'absolute',
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
    height: 88,
    paddingBottom: 28,
    paddingTop: 8,
  },
  iosTabBarSeparator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.ios.separatorThin,
  },

  // ==========================================================================
  // ANDROID TAB BAR — Material Design 3 NavigationBar
  // ==========================================================================
  tabBarAndroid: {
    backgroundColor: colors.android.surfaceContainer,
    borderTopWidth: 0,
    elevation: 2,
    height: 80,
    paddingBottom: 12,
    paddingTop: 12,
  },
  androidActiveIndicator: {
    backgroundColor: colors.android.secondaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderRadius: 16,
  },

  // ==========================================================================
  // WEB TAB BAR — Glassmorphism
  // ==========================================================================
  tabBarWeb: {
    backgroundColor: colors.web.glassBackground,
    borderTopWidth: 1,
    borderTopColor: colors.web.glassBorder,
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
    // @ts-ignore - web only
    backdropFilter: `blur(${colors.web.backdropBlur})`,
    WebkitBackdropFilter: `blur(${colors.web.backdropBlur})`,
  },

  // ==========================================================================
  // SHARED
  // ==========================================================================
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
