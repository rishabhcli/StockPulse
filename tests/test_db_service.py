"""Tests for database service (lib/db_service.py)."""
import pytest


class TestDatabaseServiceDisabled:
    """Test graceful degradation when Supabase is not configured."""

    def test_disabled_service(self):
        """When Supabase is not configured, all methods should return safe defaults."""
        from lib.db_service import DatabaseService
        service = DatabaseService()
        # Force disabled state
        service.enabled = False

        assert service.save_stock_analysis({}) is None
        assert service.get_latest_analysis('AAPL') is None
        assert service.get_analysis_history('AAPL') == []
        assert service.get_or_create_portfolio('user-1') is None
        assert service.update_portfolio_cash('pid', 100.0) is False
        assert service.save_trade('pid', {'ticker': 'AAPL', 'type': 'buy', 'quantity': 1, 'price': 100, 'value': 100}) is None
        assert service.upsert_position('pid', 'AAPL', 'long', 10, 100.0) is False
        assert service.delete_position('pid', 'AAPL', 'long') is False
        assert service.save_portfolio_snapshot('pid', 100000, 100000, 0) is False
        assert service.get_portfolio_positions('pid') == []
        assert service.get_trades('pid') == []
        assert service.get_portfolio_snapshots('pid') == []
        assert service.reset_portfolio('pid') is False
        assert service.save_backtest_record('AAPL', 75, 195.0) is False
        assert service.cache_market_sentiment({}) is False
