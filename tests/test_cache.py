"""Tests for the caching system (data/cache.py)."""
import time
import threading
from data.cache import TickerCache, get_ticker_cache, clear_global_cache


class TestTickerCache:
    """Test TickerCache operations."""

    def test_set_and_get(self):
        cache = TickerCache(default_ttl=60)
        cache.set('AAPL', {'price': 195.0})
        assert cache.get('AAPL') == {'price': 195.0}

    def test_get_missing_key(self):
        cache = TickerCache(default_ttl=60)
        assert cache.get('MISSING') is None

    def test_ttl_expiry(self):
        cache = TickerCache(default_ttl=1)
        cache.set('AAPL', {'price': 195.0}, ttl=1)
        time.sleep(1.1)
        assert cache.get('AAPL') is None

    def test_delete(self):
        cache = TickerCache(default_ttl=60)
        cache.set('AAPL', 100)
        assert cache.delete('AAPL') is True
        assert cache.get('AAPL') is None
        assert cache.delete('AAPL') is False

    def test_clear(self):
        cache = TickerCache(default_ttl=60)
        cache.set('AAPL', 1)
        cache.set('MSFT', 2)
        cache.clear()
        assert len(cache) == 0

    def test_clear_expired(self):
        cache = TickerCache(default_ttl=60)
        cache.set('fresh', 'data', ttl=60)
        cache.set('stale', 'old', ttl=0)
        time.sleep(0.1)
        removed = cache.clear_expired()
        assert removed == 1
        assert cache.get('fresh') == 'data'
        assert cache.get('stale') is None

    def test_stats_tracking(self):
        cache = TickerCache(default_ttl=60)
        cache.set('A', 1)
        cache.get('A')  # hit
        cache.get('B')  # miss
        stats = cache.get_stats()
        assert stats['hits'] == 1
        assert stats['misses'] == 1
        assert stats['sets'] == 1
        assert stats['hit_rate'] > 0

    def test_contains(self):
        cache = TickerCache(default_ttl=60)
        cache.set('AAPL', 100)
        assert 'AAPL' in cache
        assert 'MSFT' not in cache

    def test_len(self):
        cache = TickerCache(default_ttl=60)
        cache.set('A', 1)
        cache.set('B', 2)
        assert len(cache) == 2

    def test_thread_safety(self):
        cache = TickerCache(default_ttl=60)
        errors = []

        def writer(n):
            try:
                for i in range(100):
                    cache.set(f'key_{n}_{i}', i)
            except Exception as e:
                errors.append(e)

        def reader(n):
            try:
                for i in range(100):
                    cache.get(f'key_{n}_{i}')
            except Exception as e:
                errors.append(e)

        threads = []
        for n in range(5):
            threads.append(threading.Thread(target=writer, args=(n,)))
            threads.append(threading.Thread(target=reader, args=(n,)))

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0

    def test_lru_capacity_evicts_oldest_entry(self):
        cache = TickerCache(default_ttl=60, max_size=2)
        cache.set('A', 1)
        cache.set('B', 2)
        assert cache.get('A') == 1  # A is now most recently used.

        cache.set('C', 3)

        assert cache.get('B') is None
        assert cache.get('A') == 1
        assert cache.get('C') == 3
        assert cache.get_stats()['capacity_evictions'] == 1

    def test_get_or_load_coalesces_concurrent_requests(self):
        cache = TickerCache(default_ttl=60)
        start = threading.Barrier(6)
        release = threading.Event()
        calls = 0
        calls_lock = threading.Lock()
        results = []

        def loader():
            nonlocal calls
            with calls_lock:
                calls += 1
            release.wait(timeout=2)
            return {'price': 195.0}

        def worker():
            start.wait(timeout=2)
            results.append(cache.get_or_load('AAPL', loader, ttl=60))

        threads = [threading.Thread(target=worker) for _ in range(5)]
        for thread in threads:
            thread.start()
        start.wait(timeout=2)
        time.sleep(0.05)
        release.set()
        for thread in threads:
            thread.join(timeout=2)

        assert calls == 1
        assert results == [{'price': 195.0}] * 5
        assert cache.get_stats()['coalesced_waits'] == 4

    def test_get_or_load_can_negative_cache_none(self):
        cache = TickerCache(default_ttl=60)
        calls = 0

        def loader():
            nonlocal calls
            calls += 1
            return None

        assert cache.get_or_load('calendar_AAPL', loader) is None
        assert cache.get_or_load('calendar_AAPL', loader) is None
        assert calls == 1


class TestGlobalCache:
    """Test singleton cache functions."""

    def test_get_ticker_cache_singleton(self):
        c1 = get_ticker_cache()
        c2 = get_ticker_cache()
        assert c1 is c2

    def test_clear_global_cache(self):
        cache = get_ticker_cache()
        cache.set('test_key', 'test_value')
        clear_global_cache()
        assert cache.get('test_key') is None
