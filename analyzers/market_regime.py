"""
Layer 3: Market Regime Analyzer

Detects the current market environment and adjusts factor weights accordingly:
- RISK_ON: Bull market, momentum favored
- RISK_OFF: Defensive, quality favored
- CRISIS: High fear, cash/quality favored
- RECOVERY: Early bull, momentum + value favored
- ROTATION: Choppy, balanced approach

Extended data sources (v2.1):
- FRED economic indicators (yield curve, Fed funds rate)
- VIX levels and trends
- Index correlations
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional
import logging

from analyzers.base import BaseAnalyzer
from models.results import MarketRegimeResult

logger = logging.getLogger(__name__)


class MarketRegimeAnalyzer(BaseAnalyzer):
    """
    Layer 3: Market Regime Detection.

    Analyzes market-wide indicators to determine the current environment
    and adjust factor weights for stock analysis.
    """

    # VIX thresholds
    VIX_LOW = 15
    VIX_NORMAL = 20
    VIX_ELEVATED = 25
    VIX_HIGH = 30
    VIX_EXTREME = 40

    @property
    def layer_name(self) -> str:
        return "Market Regime"

    @property
    def layer_number(self) -> int:
        return 3

    def analyze(self, ticker: str = None, data: Dict[str, Any] = None) -> MarketRegimeResult:
        """
        Analyze current market regime.

        Note: This analyzer looks at market-wide data, not individual stocks.
        The ticker parameter is ignored.

        Args:
            ticker: Ignored
            data: Dict containing 'market_data' with SPY, QQQ, VIX info
                  and optionally 'economic_context' with FRED data

        Returns:
            MarketRegimeResult with regime classification and factor weights
        """
        market_data = data.get('market_data', {}) if data else {}
        economic_context = data.get('economic_context') if data else None

        # Get key indicators
        vix = market_data.get('vix')
        spy_data = market_data.get('spy', {})
        qqq_data = market_data.get('qqq', {})
        iwm_data = market_data.get('iwm', {})
        risk_proxies = market_data.get('risk_proxies', {}) or {}

        if vix is None and not spy_data and not qqq_data and not iwm_data:
            return MarketRegimeResult(
                regime='ROTATION',
                spy_trend='UNKNOWN',
                confidence=0.1,
                description='Market context unavailable',
                status='unavailable',
                data_quality='insufficient',
                reason='VIX and index trend data unavailable',
            )

        # Calculate regime indicators
        vix_signal = self._classify_vix(vix) if vix is not None else 'UNKNOWN'
        spy_trend = self._determine_trend(spy_data)
        breadth = market_data.get('breadth')
        if breadth is None:
            breadth = self._estimate_breadth(spy_data, iwm_data)

        # Get economic indicators (yield curve, Fed stance)
        yield_curve_inverted = False
        fed_stance = 'NEUTRAL'
        risk_environment = 'NEUTRAL'

        if economic_context:
            yield_curve_inverted = getattr(economic_context, 'yield_curve_inverted', False)
            fed_stance = getattr(economic_context, 'fed_stance', 'NEUTRAL')
            risk_environment = getattr(economic_context, 'risk_environment', 'NEUTRAL')

        # Determine regime (now with economic context)
        regime, description = self._determine_regime(
            vix_signal, spy_trend, breadth, spy_data, qqq_data, iwm_data,
            yield_curve_inverted, fed_stance, risk_environment, risk_proxies
        )

        # Get factor weights for this regime
        factor_weights = self._get_factor_weights(regime)

        # Sector rotation analysis
        sector_rotation = self._analyze_sector_rotation(qqq_data, iwm_data)

        # Calculate confidence (increased with economic data)
        confidence = self._calculate_confidence(market_data, economic_context)

        # Calculate VIX percentile (approximation based on historical ranges)
        vix_percentile = self._vix_to_percentile(vix) if vix is not None else None

        result = MarketRegimeResult(
            regime=regime,
            vix_level=vix,
            vix_percentile=vix_percentile,
            spy_trend=spy_trend,
            breadth=breadth,
            sector_rotation=sector_rotation,
            factor_weights=factor_weights,
            confidence=confidence,
            description=description,
            status='available',
            data_quality='complete' if vix is not None and spy_data else 'partial',
            reason='' if vix is not None and spy_data else 'One or more macro inputs unavailable',
        )

        self._log_analysis("MARKET", f"regime={regime}, vix={vix if vix is not None else 'N/A'}, yield_inverted={yield_curve_inverted}")
        return result

    def _classify_vix(self, vix: float) -> str:
        """Classify VIX level."""
        if vix < self.VIX_LOW:
            return 'LOW'
        elif vix < self.VIX_NORMAL:
            return 'NORMAL'
        elif vix < self.VIX_ELEVATED:
            return 'ELEVATED'
        elif vix < self.VIX_HIGH:
            return 'HIGH'
        else:
            return 'EXTREME'

    def _determine_trend(self, spy_data: Dict) -> str:
        """Determine trend from price vs moving averages."""
        if not spy_data:
            return 'NEUTRAL'

        price = spy_data.get('price', 0)
        sma_20 = spy_data.get('sma_20', price)
        sma_50 = spy_data.get('sma_50', price)
        sma_200 = spy_data.get('sma_200', price)

        above_20 = price > sma_20 if sma_20 else True
        above_50 = price > sma_50 if sma_50 else True
        above_200 = price > sma_200 if sma_200 else True

        if above_20 and above_50 and above_200:
            return 'UPTREND'
        elif not above_20 and not above_50 and not above_200:
            return 'DOWNTREND'
        elif above_200 and not above_50:
            return 'PULLBACK'
        elif not above_200 and above_50:
            return 'RECOVERY'
        else:
            return 'NEUTRAL'

    def _estimate_breadth(self, spy_data: Dict, iwm_data: Dict) -> float:
        """Estimate market breadth (% stocks participating in rally)."""
        # Use small cap relative performance as proxy for breadth
        if not spy_data or not iwm_data:
            return 50.0

        spy_change = spy_data.get('change_1m', 0)
        iwm_change = iwm_data.get('change_1m', 0)

        # If small caps outperforming, breadth is good
        if iwm_change > spy_change:
            return min(70 + (iwm_change - spy_change) * 2, 90)
        else:
            return max(30 + (iwm_change - spy_change) * 2, 10)

    def _determine_regime(
        self,
        vix_signal: str,
        spy_trend: str,
        breadth: float,
        spy_data: Dict,
        qqq_data: Dict,
        iwm_data: Dict,
        yield_curve_inverted: bool = False,
        fed_stance: str = 'NEUTRAL',
        risk_environment: str = 'NEUTRAL',
        risk_proxies: Optional[Dict[str, float]] = None,
    ) -> tuple:
        """Determine overall market regime with economic context."""
        risk_score, risk_details = self._score_risk_proxies(risk_proxies or {})

        # CRISIS: VIX extreme or high with downtrend
        if vix_signal in ['EXTREME', 'HIGH'] and spy_trend == 'DOWNTREND':
            return 'CRISIS', 'High fear with declining prices - defensive positioning recommended'

        # Yield curve inversion is a strong recession signal
        if yield_curve_inverted and vix_signal in ['ELEVATED', 'HIGH'] and risk_score <= 0:
            return 'RISK_OFF', 'Yield curve inverted with elevated VIX - recession risk elevated'

        # RISK_OFF: Elevated VIX or defensive trend, or adverse economic environment
        if vix_signal == 'ELEVATED' or (vix_signal == 'HIGH' and spy_trend != 'DOWNTREND'):
            desc = 'Elevated uncertainty - favor quality and defensive sectors'
            if yield_curve_inverted:
                desc += ' (yield curve inverted)'
            return 'RISK_OFF', desc

        if risk_environment == 'ADVERSE':
            return 'RISK_OFF', 'Adverse economic conditions - favor quality and defensive sectors'

        if breadth <= 35 or risk_score <= -2:
            desc = 'Weak market participation and defensive cross-asset signals'
            if risk_details:
                desc += f" ({', '.join(risk_details)})"
            return 'RISK_OFF', desc

        # RECOVERY: VIX declining from high, trend improving
        if spy_trend == 'RECOVERY':
            desc = 'Market recovering from selloff - momentum + value favored'
            if fed_stance == 'DOVISH':
                desc += ' (Fed supportive)'
            if breadth < 50 or risk_score < 0:
                desc += ' but participation remains uneven'
            return 'RECOVERY', desc

        # RISK_ON: Low/normal VIX with uptrend
        if vix_signal in ['LOW', 'NORMAL'] and spy_trend == 'UPTREND':
            # Check if growth outperforming (QQQ vs SPY)
            qqq_change = qqq_data.get('change_1m', 0) if qqq_data else 0
            spy_change = spy_data.get('change_1m', 0) if spy_data else 0

            if yield_curve_inverted:
                # Be cautious even in bullish conditions if yield curve inverted
                return 'ROTATION', 'Bull trend but yield curve inverted - balanced approach with caution'

            if breadth < 50 or risk_score < 0:
                desc = 'Bull trend but leadership is narrow - balanced approach'
                if risk_details:
                    desc += f" ({', '.join(risk_details)})"
                return 'ROTATION', desc

            if qqq_change > spy_change + 2:
                desc = 'Bull market with growth leadership - momentum favored'
                if fed_stance == 'DOVISH':
                    desc += ' (Fed supportive)'
                if breadth >= 65 and risk_score >= 2:
                    desc = 'Bull market with broad risk participation - momentum favored'
                return 'RISK_ON', desc

            desc = 'Bull market conditions - momentum and growth favored'
            if breadth >= 65 and risk_score >= 2:
                desc = 'Bull market with broad participation - momentum and cyclicals favored'
            return 'RISK_ON', desc

        # ROTATION: Mixed signals
        desc = 'Mixed signals with sector rotation - balanced approach'
        if fed_stance == 'HAWKISH':
            desc += ' (Fed hawkish)'
        elif risk_details:
            desc += f" ({', '.join(risk_details)})"
        return 'ROTATION', desc

    def _get_factor_weights(self, regime: str) -> Dict[str, float]:
        """Get factor weights adjusted for current regime."""
        weights = {
            'RISK_ON': {
                'momentum': 0.35,
                'growth': 0.25,
                'value': 0.15,
                'quality': 0.15,
                'sentiment': 0.10
            },
            'RISK_OFF': {
                'quality': 0.35,
                'value': 0.25,
                'momentum': 0.15,
                'growth': 0.15,
                'sentiment': 0.10
            },
            'CRISIS': {
                'quality': 0.40,
                'value': 0.25,
                'momentum': 0.10,
                'growth': 0.10,
                'sentiment': 0.15
            },
            'RECOVERY': {
                'momentum': 0.30,
                'value': 0.30,
                'quality': 0.20,
                'growth': 0.15,
                'sentiment': 0.05
            },
            'ROTATION': {
                'quality': 0.25,
                'value': 0.25,
                'momentum': 0.20,
                'growth': 0.20,
                'sentiment': 0.10
            }
        }
        return weights.get(regime, weights['ROTATION'])

    def _analyze_sector_rotation(self, qqq_data: Dict, iwm_data: Dict) -> Dict[str, str]:
        """Analyze which sectors are leading/lagging."""
        rotation = {}

        if qqq_data and iwm_data:
            qqq_change = qqq_data.get('change_1m', 0)
            iwm_change = iwm_data.get('change_1m', 0)

            if qqq_change > iwm_change + 3:
                rotation['Technology'] = 'leading'
                rotation['Small Cap'] = 'lagging'
            elif iwm_change > qqq_change + 3:
                rotation['Small Cap'] = 'leading'
                rotation['Technology'] = 'lagging'
            else:
                rotation['Technology'] = 'neutral'
                rotation['Small Cap'] = 'neutral'

        return rotation

    def _calculate_confidence(self, market_data: Dict, economic_context=None) -> float:
        """Calculate confidence in regime classification."""
        if not market_data:
            return 0.3

        # More data = more confidence
        data_points = sum([
            bool(market_data.get('vix')),
            bool(market_data.get('spy')),
            bool(market_data.get('qqq')),
            bool(market_data.get('iwm')),
            market_data.get('breadth') is not None,
            bool(market_data.get('risk_proxies')),
        ])

        confidence = 0.35 + (data_points * 0.08)

        # Economic context adds confidence
        if economic_context:
            econ_confidence = getattr(economic_context, 'confidence', 0)
            if econ_confidence > 0.5:
                confidence += 0.1
            if getattr(economic_context, 'api_available', False):
                confidence += 0.05

        return min(confidence, 0.9)

    def _score_risk_proxies(self, risk_proxies: Dict[str, float]) -> tuple[float, list[str]]:
        """Score cross-asset risk appetite using liquid ETF relationships."""
        if not risk_proxies:
            return 0.0, []

        score = 0.0
        details = []

        def apply_signal(value: Optional[float], positive_threshold: float, negative_threshold: float, label: str) -> None:
            nonlocal score
            if value is None:
                return
            if value >= positive_threshold:
                score += 1.0
                details.append(f"{label} supportive")
            elif value <= negative_threshold:
                score -= 1.0
                details.append(f"{label} defensive")

        apply_signal(risk_proxies.get('small_vs_large'), 1.0, -1.0, 'small caps')
        apply_signal(risk_proxies.get('equal_weight_vs_cap_weight'), 0.75, -0.75, 'breadth')
        apply_signal(risk_proxies.get('consumer_discretionary_vs_staples'), 1.5, -1.5, 'consumer cyclicals')
        apply_signal(risk_proxies.get('credit_vs_duration'), 1.0, -1.0, 'credit')

        return score, details

    def _vix_to_percentile(self, vix: float) -> float:
        """Convert VIX level to approximate historical percentile."""
        # Based on historical VIX distribution
        if vix < 12:
            return 5
        elif vix < 15:
            return 20
        elif vix < 18:
            return 40
        elif vix < 22:
            return 60
        elif vix < 28:
            return 80
        elif vix < 35:
            return 90
        else:
            return 95
