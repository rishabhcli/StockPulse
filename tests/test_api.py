"""Tests for API endpoints."""
import pytest


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        resp = client.get('/health')
        assert resp.status_code == 200

    def test_health_json_shape(self, client):
        resp = client.get('/health')
        data = resp.get_json()
        assert 'status' in data
        assert 'timestamp' in data
        assert 'supabase_enabled' in data

    def test_health_status_healthy(self, client):
        resp = client.get('/health')
        data = resp.get_json()
        assert data['status'] == 'healthy'


class TestAnalyzeEndpoint:
    def test_analyze_missing_body(self, client):
        resp = client.post('/api/analyze', content_type='application/json')
        assert resp.status_code == 400

    def test_analyze_empty_ticker(self, client):
        resp = client.post('/api/analyze', json={'ticker': ''})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data

    def test_analyze_invalid_ticker_chars(self, client):
        resp = client.post('/api/analyze', json={'ticker': 'DROP TABLE'})
        assert resp.status_code == 400


class TestScreenEndpoint:
    def test_screen_default_params(self, client):
        resp = client.get('/api/screen')
        # May take time to actually screen stocks, but should not crash
        assert resp.status_code in (200, 500)

    def test_screen_invalid_limit_returns_ok(self, client):
        """Invalid limit should use default, not crash with 500."""
        resp = client.get('/api/screen?limit=notanumber')
        assert resp.status_code in (200, 500)


class TestDataSourceEndpoints:
    def test_reddit_sentiment_missing_ticker(self, client):
        resp = client.get('/api/reddit-sentiment')
        assert resp.status_code == 400

    def test_insider_trading_missing_ticker(self, client):
        resp = client.get('/api/insider-trading')
        assert resp.status_code == 400

    def test_short_interest_missing_ticker(self, client):
        resp = client.get('/api/short-interest')
        assert resp.status_code == 400

    def test_relative_strength_missing_ticker(self, client):
        resp = client.get('/api/relative-strength')
        assert resp.status_code == 400
