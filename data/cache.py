"""
StockPulse Cache - Thread-safe caching for financial data

Provides a TTL-based caching layer to avoid API rate limits from
Yahoo Finance and other data sources.
"""

import threading
import time
from typing import Any, Optional


class TickerCache:
    """
    Thread-safe cache for financial data with TTL (Time-To-Live).

    Default TTLs by data type:
    - Historical data: 1 hour
    - Fundamentals (info): 2 hours
    - News: 10 minutes
    - Calendar/Earnings: 30 minutes
    - Financial statements: 4 hours
    - Holdings: 24 hours
    - Quotes: 5 minutes
    """

    # Default TTLs in seconds
    TTL_QUOTE = 300         # 5 minutes
    TTL_HISTORY = 3600      # 1 hour
    TTL_INFO = 7200         # 2 hours
    TTL_NEWS = 600          # 10 minutes
    TTL_CALENDAR = 1800     # 30 minutes
    TTL_EARNINGS = 3600     # 1 hour
    TTL_FINANCIALS = 14400  # 4 hours
    TTL_HOLDERS = 86400     # 24 hours
    TTL_MARKET = 300        # 5 minutes

    def __init__(self, default_ttl: int = 3600):
        """
        Initialize cache with default TTL.

        Args:
            default_ttl: Default time-to-live in seconds (default: 1 hour)
        """
        self._cache = {}
        self._lock = threading.Lock()
        self.default_ttl = default_ttl
        self._stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'evictions': 0
        }

    def _is_expired(self, entry: dict) -> bool:
        """Check if a cache entry has expired."""
        return time.time() > entry['expires']

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if exists and not expired.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        with self._lock:
            if key in self._cache:
                entry = self._cache[key]
                if not self._is_expired(entry):
                    self._stats['hits'] += 1
                    return entry['data']
                else:
                    # Expired - remove it
                    del self._cache[key]
                    self._stats['evictions'] += 1

            self._stats['misses'] += 1
            return None

    def set(self, key: str, data: Any, ttl: Optional[int] = None) -> None:
        """
        Store value in cache with TTL.

        Args:
            key: Cache key
            data: Data to cache
            ttl: Time-to-live in seconds (uses default if not specified)
        """
        if ttl is None:
            ttl = self.default_ttl

        with self._lock:
            self._cache[key] = {
                'data': data,
                'expires': time.time() + ttl,
                'created': time.time()
            }
            self._stats['sets'] += 1

    def delete(self, key: str) -> bool:
        """
        Delete a specific key from cache.

        Args:
            key: Cache key to delete

        Returns:
            True if key was found and deleted, False otherwise
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self) -> None:
        """Clear all cached data."""
        with self._lock:
            self._cache.clear()

    def clear_expired(self) -> int:
        """
        Remove all expired entries.

        Returns:
            Number of entries removed
        """
        removed = 0
        with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items()
                if self._is_expired(entry)
            ]
            for key in expired_keys:
                del self._cache[key]
                removed += 1
            self._stats['evictions'] += removed
        return removed

    def get_stats(self) -> dict:
        """Get cache statistics."""
        with self._lock:
            total_requests = self._stats['hits'] + self._stats['misses']
            hit_rate = self._stats['hits'] / total_requests if total_requests > 0 else 0
            return {
                **self._stats,
                'size': len(self._cache),
                'hit_rate': round(hit_rate, 3)
            }

    def __len__(self) -> int:
        """Return number of items in cache."""
        with self._lock:
            return len(self._cache)

    def __contains__(self, key: str) -> bool:
        """Check if key exists and is not expired."""
        return self.get(key) is not None


# Global cache instance
_ticker_cache: Optional[TickerCache] = None


def get_ticker_cache() -> TickerCache:
    """
    Get the global ticker cache instance (singleton pattern).

    Returns:
        TickerCache instance
    """
    global _ticker_cache
    if _ticker_cache is None:
        _ticker_cache = TickerCache(default_ttl=3600)
    return _ticker_cache


def clear_global_cache() -> None:
    """Clear the global cache."""
    global _ticker_cache
    if _ticker_cache is not None:
        _ticker_cache.clear()
