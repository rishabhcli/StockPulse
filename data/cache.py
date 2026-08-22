"""Bounded, thread-safe caching for StockPulse market data.

The cache intentionally stays in-process: it is the fast first-level cache in
front of slower data providers.  It uses monotonic TTLs, LRU eviction and
single-flight loading so concurrent requests for the same ticker do not create
an upstream request stampede.
"""

from __future__ import annotations

from collections import OrderedDict
import threading
import time
from typing import Any, Callable, Optional, TypeVar


T = TypeVar("T")
_MISSING = object()


class TickerCache:
    """A bounded TTL/LRU cache with request coalescing.

    ``get_or_load`` elects one caller to load a missing key while other callers
    wait for that result.  This matters for StockPulse because a single screen
    or snapshot can request the same Yahoo/Stooq input through several layers.
    """

    TTL_QUOTE = 300
    TTL_HISTORY = 3600
    TTL_INFO = 7200
    TTL_NEWS = 600
    TTL_CALENDAR = 1800
    TTL_EARNINGS = 3600
    TTL_FINANCIALS = 14400
    TTL_HOLDERS = 86400
    TTL_MARKET = 300

    def __init__(
        self,
        default_ttl: int = 3600,
        max_size: int = 1024,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if default_ttl < 0:
            raise ValueError("default_ttl must be non-negative")
        if max_size < 1:
            raise ValueError("max_size must be at least 1")

        self.default_ttl = default_ttl
        self.max_size = max_size
        self._clock = clock
        self._cache: OrderedDict[str, dict[str, Any]] = OrderedDict()
        self._inflight: dict[str, threading.Event] = {}
        self._lock = threading.RLock()
        self._stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "evictions": 0,
            "capacity_evictions": 0,
            "loads": 0,
            "load_errors": 0,
            "coalesced_waits": 0,
        }

    def _is_expired(self, entry: dict[str, Any], now: Optional[float] = None) -> bool:
        return (self._clock() if now is None else now) >= entry["expires"]

    def _get_locked(self, key: str, default: Any, *, track_stats: bool) -> Any:
        entry = self._cache.get(key)
        if entry is None:
            if track_stats:
                self._stats["misses"] += 1
            return default

        if self._is_expired(entry):
            del self._cache[key]
            self._stats["evictions"] += 1
            if track_stats:
                self._stats["misses"] += 1
            return default

        self._cache.move_to_end(key)
        if track_stats:
            self._stats["hits"] += 1
        return entry["data"]

    def get(self, key: str, default: Any = None) -> Any:
        """Return a fresh value, or ``default`` when the key is unavailable."""
        with self._lock:
            return self._get_locked(key, default, track_stats=True)

    def set(self, key: str, data: Any, ttl: Optional[int] = None) -> None:
        """Store ``data`` and evict the least-recently-used keys if needed."""
        ttl = self.default_ttl if ttl is None else ttl
        if ttl < 0:
            raise ValueError("ttl must be non-negative")

        with self._lock:
            now = self._clock()
            self._remove_expired_locked(now)
            if key in self._cache:
                del self._cache[key]
            while len(self._cache) >= self.max_size:
                self._cache.popitem(last=False)
                self._stats["evictions"] += 1
                self._stats["capacity_evictions"] += 1
            self._cache[key] = {
                "data": data,
                "expires": now + ttl,
                "created": now,
            }
            self._stats["sets"] += 1

    def get_or_load(
        self,
        key: str,
        loader: Callable[[], T],
        *,
        ttl: Optional[int] = None,
        cache_if: Optional[Callable[[T], bool]] = None,
    ) -> T:
        """Return a cached value or coalesce concurrent calls to ``loader``.

        By default every loader result, including ``None`` or an empty list, is
        cached.  ``cache_if`` can reject transient or unusable results.
        Exceptions are never cached. The elected loader sees the error while
        waiting callers retry rather than receiving an ambiguous sentinel.
        """
        with self._lock:
            cached = self._get_locked(key, _MISSING, track_stats=True)
            if cached is not _MISSING:
                return cached

            event = self._inflight.get(key)
            if event is None:
                event = threading.Event()
                self._inflight[key] = event
                self._stats["loads"] += 1
                is_loader = True
            else:
                self._stats["coalesced_waits"] += 1
                is_loader = False

        if not is_loader:
            event.wait()
            with self._lock:
                cached = self._get_locked(key, _MISSING, track_stats=False)
            if cached is not _MISSING:
                return cached
            # The elected loader failed or declined to cache its result.  A
            # retry is preferable to returning an ambiguous sentinel.
            return self.get_or_load(key, loader, ttl=ttl, cache_if=cache_if)

        try:
            value = loader()
            if cache_if is None or cache_if(value):
                self.set(key, value, ttl=ttl)
            return value
        except Exception:
            with self._lock:
                self._stats["load_errors"] += 1
            raise
        finally:
            with self._lock:
                finished = self._inflight.pop(key, None)
                if finished is not None:
                    finished.set()

    def delete(self, key: str) -> bool:
        with self._lock:
            return self._cache.pop(key, _MISSING) is not _MISSING

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def _remove_expired_locked(self, now: Optional[float] = None) -> int:
        now = self._clock() if now is None else now
        expired = [key for key, entry in self._cache.items() if self._is_expired(entry, now)]
        for key in expired:
            del self._cache[key]
        self._stats["evictions"] += len(expired)
        return len(expired)

    def clear_expired(self) -> int:
        with self._lock:
            return self._remove_expired_locked()

    def get_stats(self) -> dict[str, Any]:
        with self._lock:
            total_requests = self._stats["hits"] + self._stats["misses"]
            return {
                **self._stats,
                "size": len(self._cache),
                "max_size": self.max_size,
                "inflight": len(self._inflight),
                "hit_rate": round(self._stats["hits"] / total_requests, 3) if total_requests else 0,
            }

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)

    def __contains__(self, key: str) -> bool:
        return self.get(key, _MISSING) is not _MISSING


_ticker_cache: Optional[TickerCache] = None
_ticker_cache_lock = threading.Lock()


def get_ticker_cache() -> TickerCache:
    """Return the process-wide first-level ticker cache."""
    global _ticker_cache
    if _ticker_cache is None:
        with _ticker_cache_lock:
            if _ticker_cache is None:
                _ticker_cache = TickerCache(default_ttl=3600, max_size=1024)
    return _ticker_cache


def clear_global_cache() -> None:
    """Clear the process-wide cache without replacing its shared instance."""
    cache = _ticker_cache
    if cache is not None:
        cache.clear()
