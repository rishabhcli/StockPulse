import { Platform } from 'react-native';

// ============================================================================
// LIQUID GLASS RUNTIME DETECTION
// ============================================================================

let _isGlassAvailable: boolean | null = null;

try {
  const glassModule = require('expo-glass-effect');
  _isGlassAvailable = glassModule.isLiquidGlassAvailable?.() ?? false;
} catch {
  _isGlassAvailable = false;
}

// ============================================================================
// TYPES
// ============================================================================

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  hasLiquidGlass: boolean;
}

// ============================================================================
// HOOKS & UTILITIES
// ============================================================================

export const usePlatformUI = (): PlatformInfo => {
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  const hasLiquidGlass = isIOS && (_isGlassAvailable === true);

  return {
    isIOS,
    isAndroid,
    isWeb,
    hasLiquidGlass,
  };
};

export const platformSelect = <T>(options: {
  ios?: T;
  android?: T;
  web?: T;
  default: T;
}): T => {
  if (Platform.OS === 'ios' && options.ios !== undefined) {
    return options.ios;
  }
  if (Platform.OS === 'android' && options.android !== undefined) {
    return options.android;
  }
  if (Platform.OS === 'web' && options.web !== undefined) {
    return options.web;
  }
  return options.default;
};
