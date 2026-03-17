"""Deterministic unit tests for the v3 scoring pipeline."""

from datetime import datetime
import sys
import types

import pandas as pd

from analyzers.market_regime import MarketRegimeAnalyzer
from analyzers.quality_gate import QualityGateAnalyzer
from analyzers.score_combiner import ScoreCombiner
from data.short_interest import ShortInterestAnalyzer
from models.results import (
    CatalystResult,
    IntrinsicValueResult,
    LayerResults,
    MarketRegimeResult,
    QualityGateResult,
    TechnicalConfluenceResult,
)


def _history(days: int = 260, start: float = 100.0, step: float = 0.5) -> pd.DataFrame:
    dates = pd.date_range(end=datetime(2026, 3, 17), periods=days, freq='B')
    closes = [start + (i * step) for i in range(days)]
    return pd.DataFrame({
        'Close': closes,
        'Open': closes,
        'High': [value + 1 for value in closes],
        'Low': [value - 1 for value in closes],
        'Volume': [1_000_000 for _ in closes],
    }, index=dates)


class TestQualityGate:
    def test_missing_financials_returns_unknown(self):
        result = QualityGateAnalyzer().analyze('AAPL', {'info': {}, 'financials': {}})

        assert result.status == 'unknown'
        assert result.passed is None
        assert result.reason == 'Financial statements unavailable'


class TestScoreCombiner:
    def test_non_equity_marks_equity_layers_not_applicable(self):
        combiner = ScoreCombiner()

        layers = combiner.analyze_all_layers(
            'SPY',
            {
                'ticker': 'SPY',
                'instrument_type': 'etf',
                'history': _history(),
                'info': {'quoteType': 'ETF'},
                'current_price': 520.0,
                'news': [],
                'calendar': None,
                'financials': {},
            },
            {
                'vix': 17.0,
                'spy': {'price': 520, 'sma_20': 510, 'sma_50': 500, 'sma_200': 470, 'change_1m': 2.5},
                'qqq': {'price': 450, 'change_1m': 3.1},
                'iwm': {'price': 210, 'change_1m': 1.0},
            },
        )

        assert layers.quality_gate.status == 'not_applicable'
        assert layers.quality_gate.applicable is False
        assert layers.intrinsic_value.status == 'not_applicable'
        assert layers.intrinsic_value.applicable is False

    def test_recommendation_thresholds_are_canonical(self):
        combiner = ScoreCombiner()

        assert combiner._score_to_recommendation(80) == 'STRONG BUY'
        assert combiner._score_to_recommendation(65) == 'BUY'
        assert combiner._score_to_recommendation(50) == 'HOLD'
        assert combiner._score_to_recommendation(35) == 'SELL'
        assert combiner._score_to_recommendation(20) == 'STRONG SELL'

    def test_confidence_is_low_when_no_layer_is_available(self):
        combiner = ScoreCombiner()
        layers = LayerResults(
            quality_gate=QualityGateResult(status='unknown', applicable=True, passed=None, confidence=0.0),
            intrinsic_value=IntrinsicValueResult(status='unavailable', applicable=True, conviction=0.0),
            market_regime=MarketRegimeResult(status='unavailable', applicable=True, confidence=0.0),
            technical_confluence=TechnicalConfluenceResult(status='unavailable', applicable=True, confidence=0.0),
            catalyst=CatalystResult(status='partial', applicable=True, data_quality='partial'),
        )

        assert combiner._calculate_confidence(layers, agreement_level=0.2) == 'LOW'


class TestMarketRegime:
    def test_narrow_uptrend_is_not_classified_as_risk_on(self):
        result = MarketRegimeAnalyzer().analyze(
            data={
                'market_data': {
                    'vix': 16.0,
                    'breadth': 32.0,
                    'risk_proxies': {
                        'small_vs_large': -2.5,
                        'equal_weight_vs_cap_weight': -1.4,
                        'consumer_discretionary_vs_staples': -2.2,
                        'credit_vs_duration': -1.6,
                    },
                    'spy': {
                        'price': 520.0,
                        'sma_20': 515.0,
                        'sma_50': 505.0,
                        'sma_200': 480.0,
                        'change_1m': 2.2,
                    },
                    'qqq': {'price': 450.0, 'change_1m': 5.8},
                    'iwm': {'price': 208.0, 'change_1m': -0.3},
                },
            }
        )

        assert result.regime == 'RISK_OFF'
        assert result.breadth == 32.0
        assert 'defensive' in result.description.lower() or 'weak market participation' in result.description.lower()


class TestOptionalDataSources:
    def test_short_interest_without_metrics_is_unavailable(self, monkeypatch):
        monkeypatch.setitem(
            sys.modules,
            'yfinance',
            types.SimpleNamespace(Ticker=lambda ticker: types.SimpleNamespace(info={})),
        )

        result = ShortInterestAnalyzer(api_key='')._fetch_from_yfinance('AAPL')

        assert result.signal == 'UNAVAILABLE'
        assert result.confidence == 0.0
        assert result.error == 'Short interest metrics unavailable'
