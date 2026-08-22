"""Tests for security hardening (Phase 1)."""
import os
import jwt
import pytest


def _make_jwt(payload, secret='test-secret-for-jwt-verification'):
    """Create a signed JWT for testing."""
    return jwt.encode(payload, secret, algorithm='HS256')


class TestJWTVerification:
    """Verify JWT bypass is fixed."""

    def test_auth_required_without_token(self, client):
        """Authenticated endpoints must return 401 without a token."""
        protected_endpoints = [
            '/api/trading-sim/status',
            '/api/trading-sim/history',
            '/api/trading-sim/trades',
        ]
        for endpoint in protected_endpoints:
            resp = client.get(endpoint)
            assert resp.status_code == 401, f"{endpoint} should require auth"

    def test_auth_required_with_invalid_token(self, client):
        """Authenticated endpoints reject invalid JWT."""
        headers = {'Authorization': 'Bearer invalid.token.here'}
        resp = client.get('/api/trading-sim/status', headers=headers)
        assert resp.status_code == 401

    def test_auth_rejects_unsigned_jwt_when_secret_set(self, client):
        """JWT signed with wrong secret should be rejected."""
        token = _make_jwt(
            {'sub': 'user-123', 'aud': 'authenticated'},
            secret='wrong-secret-that-is-at-least-32-bytes'
        )
        headers = {'Authorization': f'Bearer {token}'}
        resp = client.get('/api/trading-sim/status', headers=headers)
        assert resp.status_code == 401


class TestSecurityHeaders:
    """Verify security headers on responses."""

    def test_csp_header(self, client):
        resp = client.get('/health')
        assert 'Content-Security-Policy' in resp.headers
        assert "frame-ancestors 'none'" in resp.headers['Content-Security-Policy']

    def test_x_frame_options(self, client):
        resp = client.get('/health')
        assert resp.headers.get('X-Frame-Options') == 'DENY'

    def test_x_content_type_options(self, client):
        resp = client.get('/health')
        assert resp.headers.get('X-Content-Type-Options') == 'nosniff'

    def test_permissions_policy(self, client):
        resp = client.get('/health')
        assert 'Permissions-Policy' in resp.headers


class TestInputValidation:
    """Verify input validation on endpoints."""

    def test_analyze_empty_ticker(self, client):
        resp = client.post('/api/analyze', json={'ticker': ''})
        assert resp.status_code == 400

    def test_analyze_invalid_ticker(self, client):
        resp = client.post('/api/analyze', json={'ticker': '<script>alert(1)</script>'})
        assert resp.status_code == 400

    def test_screen_invalid_limit(self, client, monkeypatch):
        """Non-integer limit should use the bounded default without I/O."""
        def fake_screen(_filter, limit, tickers=None):
            assert limit == 20
            return {'stocks': [], 'eligible_count': 0, 'excluded_count': 0}

        monkeypatch.setattr('app.screen_stocks_v3', fake_screen)
        resp = client.get('/api/screen?limit=abc')
        assert resp.status_code == 200

    def test_screen_limit_clamped(self, client, monkeypatch):
        """Limit should be clamped to max 100 without calling providers."""
        def fake_screen(_filter, limit, tickers=None):
            assert limit == 100
            return {'stocks': [], 'eligible_count': 0, 'excluded_count': 0}

        monkeypatch.setattr('app.screen_stocks_v3', fake_screen)
        resp = client.get('/api/screen?limit=99999')
        assert resp.status_code == 200

    def test_reddit_sentiment_invalid_ticker(self, client):
        resp = client.get('/api/reddit-sentiment?ticker=<script>')
        assert resp.status_code == 400

    def test_insider_trading_invalid_ticker(self, client):
        resp = client.get('/api/insider-trading?ticker=')
        assert resp.status_code == 400


class TestErrorHandlers:
    """Verify global error handlers."""

    def test_404_api_returns_json(self, client):
        resp = client.get('/api/nonexistent')
        assert resp.status_code == 404
        data = resp.get_json()
        assert 'error' in data

    def test_health_endpoint(self, client):
        resp = client.get('/health')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['status'] == 'healthy'
