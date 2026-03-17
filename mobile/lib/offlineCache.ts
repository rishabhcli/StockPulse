import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'stockpulse_cache_';
const QUERY_CACHE_KEY = 'stockpulse_react_query_cache';
const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > entry.ttl) {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Silently fail — cache is best-effort
  }
}

export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Silently fail
  }
}

export const queryStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(`${QUERY_CACHE_KEY}:${key}`);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(`${QUERY_CACHE_KEY}:${key}`, value);
    } catch {
      // Best effort
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(`${QUERY_CACHE_KEY}:${key}`);
    } catch {
      // Best effort
    }
  },
};
