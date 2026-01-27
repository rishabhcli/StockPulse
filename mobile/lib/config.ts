import { Platform } from 'react-native';

/**
 * API Configuration
 *
 * The API URL is determined by:
 * 1. EXPO_PUBLIC_API_URL environment variable (highest priority)
 * 2. Default based on environment (__DEV__ flag)
 *
 * For development:
 *   - iOS Simulator: localhost works
 *   - Android Emulator: use 10.0.2.2 (Android's localhost alias)
 *   - Physical device: use your computer's local IP address
 *
 * For production:
 *   - Set EXPO_PUBLIC_API_URL to your deployed API URL
 */

// Get local development URL based on platform
const getLocalApiUrl = (): string => {
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return 'http://10.0.2.2:8080';
  }
  // iOS simulator and web can use localhost directly
  return 'http://localhost:8080';
};

// Production API URL - update this when you deploy
const PRODUCTION_API_URL = 'https://stockpulse-api.railway.app';

// Determine the API URL
export const API_URL: string = (() => {
  // Check for environment variable first (works with Expo)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // Use appropriate URL based on environment
  if (__DEV__) {
    return getLocalApiUrl();
  }

  return PRODUCTION_API_URL;
})();

// Export config object for extensibility
export const config = {
  api: {
    url: API_URL,
    timeout: 90000,
  },
  app: {
    name: 'StockPulse',
    version: '1.0.0',
  },
} as const;

export default config;
