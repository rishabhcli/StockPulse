import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../../constants/theme';

// ============================================================================
// iOS 26 NATIVE TABS (Liquid Glass)
// ============================================================================

let NativeTabs: any = null;
let NativeLabel: any = null;
let NativeIcon: any = null;

if (Platform.OS === 'ios') {
  try {
    const mod = require('expo-router/unstable-native-tabs');
    NativeTabs = mod.NativeTabs;
    NativeLabel = mod.Label;
    NativeIcon = mod.Icon;
  } catch {
    // Not available — fall back to JS tabs
  }
}

const hasNativeTabs = Platform.OS === 'ios' && NativeTabs != null;

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
// 5 visible tabs: Overview, Analyze, Screener, Trading, AI Chat
// Hidden screens (navigable via router.push): earnings, watchlist, profile
// ============================================================================

function IOSNativeTabLayout() {
  if (!NativeTabs || !NativeLabel || !NativeIcon) return null;

  return (
    <NativeTabs
      tintColor={colors.primary}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index">
        <NativeLabel>Overview</NativeLabel>
        <NativeIcon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="analyze">
        <NativeLabel>Analyze</NativeLabel>
        <NativeIcon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="screener">
        <NativeLabel>Screener</NativeLabel>
        <NativeIcon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trading">
        <NativeLabel>Trading</NativeLabel>
        <NativeIcon sf={{ default: 'briefcase', selected: 'briefcase.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <NativeLabel>AI</NativeLabel>
        <NativeIcon sf={{ default: 'sparkles', selected: 'sparkles' }} />
      </NativeTabs.Trigger>

      {/* These screens exist but are NOT in the tab bar.
          Per Expo docs, NativeTabs hidden="true" makes screens
          completely un-navigable, so we simply omit the triggers.
          The screens are still registered as tab routes and
          can be navigated to via router.push(). */}
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
          : [styles.tabBarWeb, {
              backdropFilter: `blur(${colors.web.backdropBlur})`,
              WebkitBackdropFilter: `blur(${colors.web.backdropBlur})`,
            } as any],

        // iOS fallback: System blur background
        tabBarBackground: Platform.OS === 'ios' ? () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={80}
              tint="systemChromeMaterialDark"
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.iosTabBarSeparator} />
          </View>
        ) : undefined,
      }}
    >
      {/* === 5 visible tabs === */}
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
        name="trading"
        options={{
          title: 'Trading',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="briefcase" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="sparkles" color={color} size={size} focused={focused} />
          ),
        }}
      />

      {/* === Hidden tabs — navigable via router.push, not shown in tab bar === */}
      <Tabs.Screen name="earnings" options={{ href: null }} />
      <Tabs.Screen name="watchlist" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export default function TabLayout() {
  if (hasNativeTabs) {
    return <IOSNativeTabLayout />;
  }
  return <JSTabLayout />;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // iOS TAB BAR FALLBACK
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

  // ANDROID TAB BAR
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

  // WEB TAB BAR
  tabBarWeb: {
    backgroundColor: colors.web.glassBackground,
    borderTopWidth: 1,
    borderTopColor: colors.web.glassBorder,
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
  },

  // SHARED
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
