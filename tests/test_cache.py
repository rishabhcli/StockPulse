"""Tests for the caching system (data/cache.py)."""
import time
import threading
import pytest
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
