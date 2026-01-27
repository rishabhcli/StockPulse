import { Platform } from 'react-native';

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  hasLiquidGlass: boolean;
}

export const usePlatformUI = (): PlatformInfo => {
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';

  // Liquid Glass is available on iOS 26+ (we'll check for it at runtime)
  // For now, we'll use a simple version check approximation
  const hasLiquidGlass = false; // Will be enabled when expo-glass-effect is available

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
