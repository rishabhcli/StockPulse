import { Platform } from 'react-native';
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

// ============================================================================
// NATIVE TABS LAYOUT — iOS 26 LIQUID GLASS + ANDROID M3
// ============================================================================
//
// This uses expo-router's native tabs which automatically provide:
// - iOS 26: Native UITabBarController with Liquid Glass effect
// - iOS < 26: Native UITabBarController with system blur
// - Android: Native bottom navigation with Material Design 3
//
// SF Symbols are used for iOS icons (sf prop)
// VectorIcon via androidSrc is used for Android with Ionicons
// ============================================================================

export default function TabLayout() {
  return (
    <NativeTabs>
      {/* === OVERVIEW TAB === */}
      <NativeTabs.Trigger name="index">
        <Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          androidSrc={<VectorIcon family={Ionicons} name="home" />}
        />
        <Label>Overview</Label>
      </NativeTabs.Trigger>

      {/* === SCREENER TAB (combined Analyze + Screener) === */}
      <NativeTabs.Trigger name="screener">
        <Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          androidSrc={<VectorIcon family={Ionicons} name="stats-chart" />}
        />
        <Label>Screener</Label>
      </NativeTabs.Trigger>

      {/* === PENNY STOCKS TAB === */}
      <NativeTabs.Trigger name="pennystocks">
        <Icon
          sf={{ default: 'dollarsign.circle', selected: 'dollarsign.circle.fill' }}
          androidSrc={<VectorIcon family={Ionicons} name="cash" />}
        />
        <Label>Penny</Label>
      </NativeTabs.Trigger>

      {/* === TRADING TAB === */}
      <NativeTabs.Trigger name="trading">
        <Icon
          sf={{ default: 'briefcase', selected: 'briefcase.fill' }}
          androidSrc={<VectorIcon family={Ionicons} name="briefcase" />}
        />
        <Label>Trading</Label>
      </NativeTabs.Trigger>

      {/* === AI CHAT TAB === */}
      <NativeTabs.Trigger name="chat">
        <Icon
          sf="sparkles"
          androidSrc={<VectorIcon family={Ionicons} name="sparkles" />}
        />
        <Label>AI</Label>
      </NativeTabs.Trigger>

      {/* === HIDDEN TABS — accessible via router.push, not shown in tab bar === */}
      <NativeTabs.Trigger name="earnings" hidden>
        <Label>Earnings</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="watchlist" hidden>
        <Label>Watchlist</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" hidden>
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
