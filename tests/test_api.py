"""Contract tests for the v3 API endpoints."""

from types import SimpleNamespace

from tests.fixtures.v3_payloads import (
    AVAILABLE_ANALYSIS,
    BACKTEST_REPORT,
    EARNINGS_CALENDAR,
    SCREEN_RESPONSE,
    SNAPSHOT_RESPONSE,
    UNAVAILABLE_ANALYSIS,
)


def _assert_request_metadata(resp, data):
    assert 'X-Request-ID' in resp.headers
    assert data['request_id'] == resp.headers['X-Request-ID']


class _BacktestResult:
    def __init__(self, payload):
        self.payload = payload

    def to_dict(self):
        return self.payload


class _ScoreRecord:
    def __init__(self, payload):
        self.payload = payload

    def to_dict(self):
        return self.payload


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
        _assert_request_metadata(resp, data)


class TestResponseDelivery:
    def test_public_market_reads_get_short_private_cache_policy(self, client, monkeypatch):
        monkeypatch.setattr('app.build_snapshot_v3', lambda: SNAPSHOT_RESPONSE)

        resp = client.get('/api/snapshot')

        assert resp.status_code == 200
        assert resp.headers['Cache-Control'].startswith('private, max-age=60')

    def test_mutations_are_never_cached(self, client, monkeypatch):
        monkeypatch.setattr('app.analyze_stock_v3', lambda ticker, persist=True: (AVAILABLE_ANALYSIS, 200))

        resp = client.post('/api/analyze', json={'ticker': 'AAPL'})

        assert resp.status_code == 200
        assert resp.headers['Cache-Control'] == 'no-store'

    def test_large_json_responses_are_compressed(self, client, monkeypatch):
        payload = dict(SNAPSHOT_RESPONSE)
        payload['market_news'] = [{'title': 'Market update ' * 40}] * 20
        monkeypatch.setattr('app.build_snapshot_v3', lambda: payload)

        resp = client.get('/api/snapshot', headers={'Accept-Encoding': 'gzip'})

        assert resp.status_code == 200
        assert resp.headers.get('Content-Encoding') == 'gzip'


class TestReadyEndpoint:
    def test_ready_returns_ready_state_when_checks_pass(self, client, monkeypatch):
        monkeypatch.setattr('app._check_scorer_config', lambda: {'ok': True, 'version': '2026-03-17', 'path': '/tmp/scoring.json', 'error': None})
        monkeypatch.setattr('app._check_cache_backend', lambda: {'ok': True, 'size': 1, 'error': None})
        monkeypatch.setattr('app._check_supabase_backend', lambda: {'ok': True, 'enabled': True, 'error': None})

        resp = client.get('/ready')
        assert resp.status_code == 200

        data = resp.get_json()
        assert data['ready'] is True
        assert data['status'] == 'ready'
        assert data['checks']['scorer_config']['ok'] is True
        assert data['checks']['cache_backend']['ok'] is True
        assert data['checks']['supabase']['ok'] is True
        _assert_request_metadata(resp, data)

    def test_ready_returns_unready_when_any_check_fails(self, client, monkeypatch):
        monkeypatch.setattr('app._check_scorer_config', lambda: {'ok': True, 'version': '2026-03-17', 'path': '/tmp/scoring.json', 'error': None})
        monkeypatch.setattr('app._check_cache_backend', lambda: {'ok': False, 'size': None, 'error': 'cache unavailable'})
        monkeypatch.setattr('app._check_supabase_backend', lambda: {'ok': True, 'enabled': True, 'error': None})

        resp = client.get('/ready')
        assert resp.status_code == 503

        data = resp.get_json()
        assert data['ready'] is False
        assert data['status'] == 'unready'
        assert data['checks']['cache_backend']['ok'] is False
        _assert_request_metadata(resp, data)


class TestAnalyzeEndpoint:
    def test_analyze_returns_canonical_v3_shape(self, client, monkeypatch):
        monkeypatch.setattr('app.analyze_stock_v3', lambda ticker, persist=True: (AVAILABLE_ANALYSIS, 200))

        resp = client.post('/api/analyze', json={'ticker': 'AAPL', 'scoring': 'v1'})
        assert resp.status_code == 200

        data = resp.get_json()
        assert data['ticker'] == 'AAPL'
        assert data['scoring_version'] == 'v3'
        assert data['score'] == AVAILABLE_ANALYSIS['score']
        assert data['recommendation'] == AVAILABLE_ANALYSIS['recommendation']
        assert data['confidence'] == AVAILABLE_ANALYSIS['confidence']
        assert 'layer_analysis' in data
        assert 'data_quality' in data
        assert 'display_indicators' in data
        assert 'fundamentals' in data
        assert 'market_context' in data
        assert 'news_analysis' in data
        assert 'earnings' in data
        assert 'generated_at' in data
        _assert_request_metadata(resp, data)

    def test_analyze_returns_422_for_unavailable_core_inputs(self, client, monkeypatch):
        monkeypatch.setattr('app.analyze_stock_v3', lambda ticker, persist=True: (UNAVAILABLE_ANALYSIS, 422))

        resp = client.post('/api/analyze', json={'ticker': 'XYZ'})
        assert resp.status_code == 422

        data = resp.get_json()
        assert data['status'] == 'unavailable'
        assert data['code'] == 'insufficient_core_data'
        assert data['reason']
        assert data['missing_inputs'] == ['financials']
        assert 'sources_checked' in data
        _assert_request_metadata(resp, data)

    def test_analyze_missing_body(self, client):
        resp = client.post('/api/analyze', content_type='application/json')
        assert resp.status_code == 400
        data = resp.get_json()
        assert data['code'] == 'invalid_input'
        _assert_request_metadata(resp, data)

    def test_analyze_invalid_ticker_chars(self, client):
        resp = client.post('/api/analyze', json={'ticker': 'DROP TABLE'})
        assert resp.status_code == 400
        data = resp.get_json()
        assert data['code'] == 'invalid_input'
        _assert_request_metadata(resp, data)


class TestScreenEndpoint:
    def test_screen_returns_only_eligible_results(self, client, monkeypatch):
        monkeypatch.setattr('app.screen_stocks_v3', lambda filter_type, limit, tickers=None: SCREEN_RESPONSE)

        resp = client.get('/api/screen?filter=all&limit=10')
        assert resp.status_code == 200

        data = resp.get_json()
        assert data['eligible_count'] == 2
        assert data['excluded_count'] == 1
        assert data['excluded_reasons_summary'] == {'liquidity_filter': 1}
        assert len(data['stocks']) == 2
        assert all('confidence' in stock for stock in data['stocks'])
        assert all('data_quality' in stock for stock in data['stocks'])
        assert 'freshness' in data
        assert data['freshness']['status'] in {'fresh', 'partial', 'stale'}
        _assert_request_metadata(resp, data)

    def test_screen_reuses_short_lived_server_payload_cache(self, client, monkeypatch):
        calls = 0

        def fake_screen(filter_type, limit, tickers=None):
            nonlocal calls
            calls += 1
            return SCREEN_RESPONSE

        monkeypatch.setattr('app.screen_stocks_v3', fake_screen)

        first = client.get('/api/screen?filter=all&limit=10')
        second = client.get('/api/screen?filter=all&limit=10')

        assert first.status_code == second.status_code == 200
        assert calls == 1
        assert first.get_json()['request_id'] != second.get_json()['request_id']

    def test_screen_rejects_unbounded_or_invalid_inputs(self, client):
        assert client.get('/api/screen?filter=unknown').status_code == 400
        assert client.get('/api/screen?tickers=AAPL,<script>').status_code == 400


class TestSnapshotEndpoint:
    def test_snapshot_is_backend_composed(self, client, monkeypatch):
        monkeypatch.setattr('app.build_snapshot_v3', lambda: SNAPSHOT_RESPONSE)

        resp = client.get('/api/snapshot')
        assert resp.status_code == 200

        data = resp.get_json()
        assert data['eligible_count'] == 2
        assert 'market_sentiment' in data
        assert 'market_indexes' in data
        assert 'strong_buys' in data
        assert 'gainers' in data
        assert 'losers' in data
        assert 'freshness' in data
        _assert_request_metadata(resp, data)


class TestMarketSentimentEndpoint:
    def test_market_sentiment_uses_regime_contract(self, client, monkeypatch):
        monkeypatch.setattr('app.fetch_market_data', lambda: {
            'vix': 16.8,
            'breadth': 68.0,
            'risk_proxies': {'small_vs_large': 1.2},
            'spy': {'change_1m': 2.1},
            'qqq': {'change_1m': 3.4},
            'iwm': {'change_1m': 2.8},
            'economic_context': {'yield_curve': 0.42, 'fed_stance': 'DOVISH'},
            'sources': {'vix': {'available': True, 'source': 'stooq/yfinance'}},
        })
        monkeypatch.setattr(
            'app.MarketRegimeAnalyzer.analyze',
            lambda self, data=None: SimpleNamespace(
                regime='RISK_ON',
                status='available',
                confidence=0.82,
                description='Bull market with broad participation - momentum and cyclicals favored',
            ),
        )

        resp = client.get('/api/market-sentiment')
        assert resp.status_code == 200

        data = resp.get_json()
        assert data['signal'] == 'RISK_ON'
        assert data['regime'] == 'RISK_ON'
        assert data['regime_status'] == 'available'
        assert data['regime_confidence'] == 0.82
        assert data['breadth'] == 68.0
        assert data['risk_proxies']['small_vs_large'] == 1.2
        _assert_request_metadata(resp, data)


class TestEarningsCalendarEndpoint:
    def test_earnings_calendar_returns_live_entries_only(self, client, monkeypatch):
        monkeypatch.setattr('app.get_live_earnings_calendar_v3', lambda limit=50: EARNINGS_CALENDAR[:limit])

        resp = client.get('/api/earnings-calendar?limit=10')
        assert resp.status_code == 200

        data = resp.get_json()
        assert data['count'] == 1
        assert data['earnings'][0]['ticker'] == 'AAPL'
        assert data['earnings'][0]['earnings_date']
        assert 'freshness' in data
        _assert_request_metadata(resp, data)


class TestBacktestEndpoints:
    def test_backtest_report_contract(self, client, monkeypatch):
        monkeypatch.setattr('data.backtester.get_performance_report', lambda period='1M': _BacktestResult(BACKTEST_REPORT))

        resp = client.get('/api/backtest?period=1M')
        assert resp.status_code == 200

        data = resp.get_json()
        assert data['period'] == '1M'
        assert data['forward_horizons'] == [5, 20, 60]
        assert 'by_horizon' in data
        assert 'avg_returns' in data
        _assert_request_metadata(resp, data)

    def test_backtest_record_accepts_v3_metadata(self, client, monkeypatch):
        def fake_record_score(ticker, score, price, **kwargs):
            assert kwargs['scoring_version'] == 'v3'
            assert kwargs['instrument_type'] == 'equity'
            assert kwargs['forward_horizons'] == [5, 20, 60]
            return _ScoreRecord({
                'ticker': ticker,
                'score': score,
                'price_at_scoring': price,
                'recommendation': kwargs['recommendation'],
                'scoring_version': kwargs['scoring_version'],
                'instrument_type': kwargs['instrument_type'],
                'forward_horizons': kwargs['forward_horizons'],
            })

        monkeypatch.setattr('data.backtester.record_score', fake_record_score)

        resp = client.post('/api/backtest/record', json={
            'ticker': 'AAPL',
            'score': 78.4,
            'price': 198.42,
            'recommendation': 'STRONG BUY',
            'scoring_version': 'v3',
            'instrument_type': 'equity',
            'forward_horizons': [5, 20, 60],
            'transaction_cost_bps': 10,
            'slippage_bps': 5,
            'metadata': {'confidence': 'HIGH'},
        })
        assert resp.status_code == 200

        data = resp.get_json()
        assert data['ticker'] == 'AAPL'
        assert data['scoring_version'] == 'v3'
        assert data['forward_horizons'] == [5, 20, 60]
        _assert_request_metadata(resp, data)


class TestDataSourceEndpoints:
    def test_reddit_sentiment_missing_ticker(self, client):
        resp = client.get('/api/reddit-sentiment')
        assert resp.status_code == 400
        data = resp.get_json()
        assert data['code'] == 'invalid_input'
        _assert_request_metadata(resp, data)

    def test_insider_trading_missing_ticker(self, client):
        resp = client.get('/api/insider-trading')
        assert resp.status_code == 400
        data = resp.get_json()
        assert data['code'] == 'invalid_input'
        _assert_request_metadata(resp, data)

    def test_short_interest_missing_ticker(self, client):
        resp = client.get('/api/short-interest')
        assert resp.status_code == 400
        data = resp.get_json()
        assert data['code'] == 'invalid_input'
        _assert_request_metadata(resp, data)

    def test_relative_strength_missing_ticker(self, client):
        resp = client.get('/api/relative-strength')
        assert resp.status_code == 400
        data = resp.get_json()
        assert data['code'] == 'invalid_input'
        _assert_request_metadata(resp, data)
