"""
Score Combiner: Final Conviction-Based Scoring

Combines all 5 layers into a final investment score using
conviction-based logic rather than weighted averaging.

Scoring Logic:
1. Quality Gate filter (fail = cap at 40)
2. Layer agreement analysis
3. Regime-adjusted base scoring
4. Catalyst uncertainty adjustment
5. Conviction confidence calculation

Extended Data Sources (v2.1):
- Insider trading (SEC EDGAR)
- Short interest (FINRA/yfinance)
- Relative strength (vs sector)
- Economic context (FRED API)
"""

from typing import Dict, Any, Optional, List, Tuple
import logging
import json
import os

from analyzers.base import BaseAnalyzer
from analyzers.quality_gate import QualityGateAnalyzer
from analyzers.intrinsic_value import IntrinsicValueAnalyzer
from analyzers.market_regime import MarketRegimeAnalyzer
from analyzers.technical_confluence import TechnicalConfluenceAnalyzer
from analyzers.catalyst import CatalystAnalyzer

from models.results import (
    QualityGateResult,
    IntrinsicValueResult,
    MarketRegimeResult,
    TechnicalConfluenceResult,
    CatalystResult,
    ConvictionScore,
    LayerResults
)

logger = logging.getLogger(__name__)


class ScoreCombiner:
    """
    Combines all layer results into a final conviction score.

    Unlike traditional weighted averaging, this uses conviction-based
    logic where layer agreement and regime context matter more than
    individual indicator values.
    """

    DEFAULT_CONFIG_PATH = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', 'config', 'scoring_v3.json')
    )

    def __init__(self):
        """Initialize all layer analyzers."""
        self.config = self._load_config()
        self._apply_config()
        self.quality_gate = QualityGateAnalyzer()
        self.intrinsic_value = IntrinsicValueAnalyzer()
        self.market_regime = MarketRegimeAnalyzer()
        self.technical_confluence = TechnicalConfluenceAnalyzer()
        self.catalyst = CatalystAnalyzer()

    def _load_config(self) -> Dict[str, Any]:
        config_path = os.environ.get('STOCKPULSE_SCORING_CONFIG', self.DEFAULT_CONFIG_PATH)
        try:
            with open(config_path, 'r', encoding='utf-8') as config_file:
                return json.load(config_file)
        except Exception as exc:
            logger.warning(f"Unable to load scoring config at {config_path}: {exc}")
            return {
                'recommendation_thresholds': {
                    'default': {'strong_buy': 75, 'buy': 60, 'hold': 45, 'sell': 30},
                },
                'confidence_thresholds': {'high': 0.75, 'medium': 0.5},
                'adjustments': {
                    'quality_fail_cap': 40,
                    'strong_agreement_bonus': 15,
                    'moderate_agreement_bonus': 8,
                    'conflict_penalty': 10,
                    'major_conflict_penalty': 15,
                    'imminent_catalyst_uncertainty': 8,
                    'near_catalyst_uncertainty': 5,
                    'cluster_buying_bonus': 10,
                    'executive_buying_bonus': 5,
                    'heavy_selling_penalty': 5,
                    'squeeze_potential_bonus': 5,
                    'crowded_short_flag': 5,
                    'outperforming_bonus': 5,
                    'underperforming_penalty': 5,
                },
                'instrument_weights': {
                    'default': {'technical_scale_divisor': 2.0, 'relative_strength_scale_divisor': 3.0},
                },
            }

    def _apply_config(self):
        adjustments = self.config.get('adjustments', {})
        self.QUALITY_FAIL_CAP = adjustments.get('quality_fail_cap', 40)
        self.STRONG_AGREEMENT_BONUS = adjustments.get('strong_agreement_bonus', 15)
        self.MODERATE_AGREEMENT_BONUS = adjustments.get('moderate_agreement_bonus', 8)
        self.CONFLICT_PENALTY = adjustments.get('conflict_penalty', 10)
        self.MAJOR_CONFLICT_PENALTY = adjustments.get('major_conflict_penalty', 15)
        self.IMMINENT_CATALYST_UNCERTAINTY = adjustments.get('imminent_catalyst_uncertainty', 8)
        self.NEAR_CATALYST_UNCERTAINTY = adjustments.get('near_catalyst_uncertainty', 5)
        self.CLUSTER_BUYING_BONUS = adjustments.get('cluster_buying_bonus', 10)
        self.EXECUTIVE_BUYING_BONUS = adjustments.get('executive_buying_bonus', 5)
        self.HEAVY_SELLING_PENALTY = adjustments.get('heavy_selling_penalty', 5)
        self.SQUEEZE_POTENTIAL_BONUS = adjustments.get('squeeze_potential_bonus', 5)
        self.CROWDED_SHORT_FLAG = adjustments.get('crowded_short_flag', 5)
        self.OUTPERFORMING_BONUS = adjustments.get('outperforming_bonus', 5)
        self.UNDERPERFORMING_PENALTY = adjustments.get('underperforming_penalty', 5)
        self.confidence_thresholds = self.config.get('confidence_thresholds', {'high': 0.75, 'medium': 0.5})

    def _get_thresholds(self, instrument_type: str) -> Dict[str, float]:
        thresholds = self.config.get('recommendation_thresholds', {})
        return thresholds.get(instrument_type, thresholds.get('default', {
            'strong_buy': 75,
            'buy': 60,
            'hold': 45,
            'sell': 30,
        }))

    def _get_instrument_weights(self, instrument_type: str) -> Dict[str, float]:
        weights = self.config.get('instrument_weights', {})
        return weights.get(instrument_type, weights.get('default', {
            'technical_scale_divisor': 2.0,
            'relative_strength_scale_divisor': 3.0,
        }))

    def analyze_all_layers(
        self,
        ticker: str,
        stock_data: Dict[str, Any],
        market_data: Dict[str, Any]
    ) -> LayerResults:
        """
        Run all 5 layers of analysis.

        Args:
            ticker: Stock symbol
            stock_data: Dict with 'info', 'financials', 'history', 'news', 'calendar'
            market_data: Dict with 'spy', 'qqq', 'iwm', 'vix' data

        Returns:
            LayerResults containing all layer outputs
        """
        instrument_type = stock_data.get('instrument_type', 'unknown')

        if instrument_type == 'equity':
            quality_result = self.quality_gate.analyze(ticker, {
                'info': stock_data.get('info', {}),
                'financials': stock_data.get('financials', {})
            })

            value_result = self.intrinsic_value.analyze(ticker, {
                'info': stock_data.get('info', {}),
                'financials': stock_data.get('financials', {}),
                'history': stock_data.get('history'),
                'current_price': stock_data.get('current_price'),
            })
        else:
            quality_result = QualityGateResult(
                passed=None,
                confidence=0.0,
                data_quality='not_applicable',
                status='not_applicable',
                applicable=False,
                reason='Quality gate applies to equities only',
            )
            value_result = IntrinsicValueResult(
                current_price=stock_data.get('current_price') or 0.0,
                conviction=0.0,
                status='not_applicable',
                applicable=False,
                data_quality='not_applicable',
                reason='Intrinsic valuation is disabled for non-equities',
            )

        # Layer 3: Market Regime
        regime_result = self.market_regime.analyze(ticker, {
            'market_data': market_data,
            'economic_context': market_data.get('economic_context'),
        })

        # Layer 4: Technical Confluence
        technical_result = self.technical_confluence.analyze(ticker, {
            'history': stock_data.get('history'),
            'info': stock_data.get('info', {})
        })

        # Layer 5: Catalyst
        catalyst_result = self.catalyst.analyze(ticker, {
            'info': stock_data.get('info', {}),
            'news': stock_data.get('news', []),
            'calendar': stock_data.get('calendar')
        })

        return LayerResults(
            quality_gate=quality_result,
            intrinsic_value=value_result,
            market_regime=regime_result,
            technical_confluence=technical_result,
            catalyst=catalyst_result
        )

    def calculate_conviction_score(
        self,
        ticker: str,
        stock_data: Dict[str, Any],
        market_data: Dict[str, Any]
    ) -> ConvictionScore:
        """
        Calculate the final conviction score from all layers.

        This is the main entry point for the v2 scoring system.

        Args:
            ticker: Stock symbol
            stock_data: Complete stock data dict
            market_data: Market-wide data dict

        Returns:
            ConvictionScore with final score, recommendation, and explanation
        """
        # Run all layers
        layers = self.analyze_all_layers(ticker, stock_data, market_data)

        # 1. Check quality gate first for equities only.
        if layers.quality_gate.applicable and layers.quality_gate.passed is False:
            return self._create_quality_fail_score(ticker, layers)

        # 2. Calculate base score from value and technical
        instrument_type = stock_data.get('instrument_type', 'unknown')
        base_score = self._calculate_base_score(layers, stock_data, instrument_type)

        # 3. Apply layer agreement adjustment
        agreement_adj, agreement_level = self._calculate_agreement_adjustment(layers)

        # 4. Apply regime adjustment
        regime_adj = self._calculate_regime_adjustment(layers)

        # 5. Apply catalyst uncertainty
        catalyst_adj = self._calculate_catalyst_adjustment(layers)

        # 6. Apply extended data adjustments (v2.1)
        insider_adj = self._calculate_insider_adjustment(stock_data)
        short_adj = self._calculate_short_interest_adjustment(stock_data)
        rs_adj = self._calculate_relative_strength_adjustment(stock_data)

        # 7. Combine adjustments
        final_score = (
            base_score
            + agreement_adj
            + regime_adj
            - catalyst_adj
            + insider_adj
            + short_adj
            + rs_adj
        )
        final_score = max(1, min(100, final_score))  # Clamp to 1-100

        # 8. Determine recommendation
        recommendation = self._score_to_recommendation(final_score, instrument_type)

        # 9. Calculate confidence
        confidence = self._calculate_confidence(layers, agreement_level)

        # 10. Build explanation
        explanation = self._build_explanation(
            ticker, layers, base_score, agreement_adj, regime_adj, catalyst_adj,
            insider_adj, short_adj, rs_adj
        )

        return ConvictionScore(
            score=round(final_score, 1),
            recommendation=recommendation,
            confidence=confidence,
            layer_results=layers,
            agreement_level=agreement_level,
            explanation=explanation,
            scoring_version='v3'
        )

    def _create_quality_fail_score(
        self,
        ticker: str,
        layers: LayerResults
    ) -> ConvictionScore:
        """Create score for stocks that fail quality gate."""
        flags = layers.quality_gate.flags

        # Score based on severity
        critical_count = len([f for f in flags if getattr(f, 'severity', '') == 'critical'])

        score = max(20, self.QUALITY_FAIL_CAP - (critical_count * 5))

        return ConvictionScore(
            score=score,
            recommendation='AVOID',
            confidence='HIGH',
            layer_results=layers,
            agreement_level=0.0,
            explanation=f"Quality gate failed: {', '.join(flags[:3])}",
            scoring_version='v3'
        )

    def _calculate_base_score(
        self,
        layers: LayerResults,
        stock_data: Dict[str, Any],
        instrument_type: str,
    ) -> float:
        """Calculate base score from value and technical layers."""
        score = 50.0
        weights = self._get_instrument_weights(instrument_type)

        # Value contribution (up to +/- 25 points)
        if layers.intrinsic_value.applicable and layers.intrinsic_value.status == 'available':
            value_signal = layers.intrinsic_value.valuation_signal
            margin = layers.intrinsic_value.margin_of_safety

            if value_signal == 'UNDERVALUED':
                score += min(25, margin * 50)
            elif value_signal == 'OVERVALUED':
                score += max(-25, margin * 50)

        # Technical contribution (up to +/- 25 points)
        if layers.technical_confluence.status == 'available':
            tech_score = layers.technical_confluence.confluence_score
            score += (tech_score - 50) / weights.get('technical_scale_divisor', 2.0)

        # Relative strength matters more for ETFs and indices.
        rs_data = stock_data.get('relative_strength')
        if rs_data is not None:
            rs_score = getattr(rs_data, 'strength_score', None)
            if rs_score is not None:
                score += (rs_score - 50) / weights.get('relative_strength_scale_divisor', 3.0)

        return score

    def _calculate_agreement_adjustment(
        self,
        layers: LayerResults
    ) -> Tuple[float, float]:
        """
        Calculate adjustment based on layer agreement.

        Returns:
            Tuple of (adjustment points, agreement level 0-1)
        """
        signals = []

        if layers.intrinsic_value.applicable and layers.intrinsic_value.status == 'available':
            if layers.intrinsic_value.valuation_signal == 'UNDERVALUED':
                signals.append(1)
            elif layers.intrinsic_value.valuation_signal == 'OVERVALUED':
                signals.append(-1)
            else:
                signals.append(0)

        # Technical signal
        if layers.technical_confluence.status == 'available' and layers.technical_confluence.trend_alignment == 'ALIGNED_UP':
            signals.append(1)
        elif layers.technical_confluence.status == 'available' and layers.technical_confluence.trend_alignment == 'ALIGNED_DOWN':
            signals.append(-1)
        elif layers.technical_confluence.status == 'available':
            signals.append(0)

        # Catalyst sentiment
        if layers.catalyst.status == 'available' and layers.catalyst.catalyst_sentiment == 'POSITIVE':
            signals.append(1)
        elif layers.catalyst.status == 'available' and layers.catalyst.catalyst_sentiment == 'NEGATIVE':
            signals.append(-1)
        elif layers.catalyst.status == 'available':
            signals.append(0)

        if not signals:
            return (0, 0.2)

        # Calculate agreement
        bullish_count = sum(1 for s in signals if s > 0)
        bearish_count = sum(1 for s in signals if s < 0)
        neutral_count = sum(1 for s in signals if s == 0)

        # Strong agreement: all 3 aligned
        if bullish_count == 3:
            return (self.STRONG_AGREEMENT_BONUS, 1.0)
        elif bearish_count == 3:
            return (-self.STRONG_AGREEMENT_BONUS, 1.0)

        # Moderate agreement: 2 aligned
        if bullish_count == 2 and bearish_count == 0:
            return (self.MODERATE_AGREEMENT_BONUS, 0.7)
        elif bearish_count == 2 and bullish_count == 0:
            return (-self.MODERATE_AGREEMENT_BONUS, 0.7)

        # Conflict: bullish and bearish signals
        if bullish_count >= 1 and bearish_count >= 1:
            if bullish_count == bearish_count:
                return (0, 0.3)  # Equal conflict
            else:
                # Mild conflict - lean toward majority
                lean = self.CONFLICT_PENALTY if bullish_count > bearish_count else -self.CONFLICT_PENALTY
                return (lean / 2, 0.4)

        # Mixed with neutral
        return (0, 0.5)

    def _calculate_regime_adjustment(self, layers: LayerResults) -> float:
        """Calculate adjustment based on market regime."""
        regime = layers.market_regime.regime

        # In crisis, be more conservative
        if regime == 'CRISIS':
            # Reduce bullish scores, increase bearish
            if layers.intrinsic_value.applicable and layers.intrinsic_value.status == 'available' and layers.intrinsic_value.valuation_signal == 'UNDERVALUED':
                return -5  # Even undervalued stocks risky in crisis
            return 0

        # In risk-on, momentum matters more
        if regime == 'RISK_ON':
            if layers.technical_confluence.status == 'available' and layers.technical_confluence.trend_alignment == 'ALIGNED_UP':
                return 5  # Boost bullish technicals
            elif layers.technical_confluence.status == 'available' and layers.technical_confluence.trend_alignment == 'ALIGNED_DOWN':
                return -3  # Slight penalty for fighting the trend

        # In recovery, favor value
        if regime == 'RECOVERY':
            if layers.intrinsic_value.applicable and layers.intrinsic_value.status == 'available' and layers.intrinsic_value.valuation_signal == 'UNDERVALUED':
                return 5  # Value plays in recovery

        return 0

    def _calculate_catalyst_adjustment(self, layers: LayerResults) -> float:
        """Calculate uncertainty penalty for imminent catalysts."""
        if layers.catalyst.status != 'available':
            return 0

        days_to_nearest = layers.catalyst.days_to_nearest

        # Imminent catalyst (within 7 days) = high uncertainty
        if days_to_nearest <= 7:
            # Unless sentiment is clear
            if layers.catalyst.catalyst_sentiment in ['POSITIVE', 'NEGATIVE']:
                return self.NEAR_CATALYST_UNCERTAINTY
            return self.IMMINENT_CATALYST_UNCERTAINTY

        # Near catalyst (7-14 days)
        if days_to_nearest <= 14:
            return self.NEAR_CATALYST_UNCERTAINTY / 2

        return 0

    def _calculate_insider_adjustment(self, stock_data: Dict[str, Any]) -> float:
        """Calculate adjustment based on insider trading patterns."""
        insider_data = stock_data.get('insider_trading')
        if not insider_data:
            return 0

        adjustment = 0

        # Cluster buying is the strongest signal
        if getattr(insider_data, 'cluster_detected', False):
            adjustment += self.CLUSTER_BUYING_BONUS

        # Executive buying is also significant
        elif getattr(insider_data, 'executive_buying', False):
            adjustment += self.EXECUTIVE_BUYING_BONUS

        # Check for heavy selling
        sentiment = getattr(insider_data, 'net_insider_sentiment', 'NEUTRAL')
        if sentiment in ['SELL', 'STRONG_SELL']:
            adjustment -= self.HEAVY_SELLING_PENALTY

        return adjustment

    def _calculate_short_interest_adjustment(self, stock_data: Dict[str, Any]) -> float:
        """Calculate adjustment based on short interest data."""
        short_data = stock_data.get('short_interest')
        if not short_data:
            return 0

        adjustment = 0

        squeeze_risk = getattr(short_data, 'squeeze_risk', 'UNKNOWN')
        signal = getattr(short_data, 'signal', 'NEUTRAL')

        # Squeeze potential with bullish price action
        if squeeze_risk == 'HIGH' and signal == 'BULLISH_SQUEEZE':
            adjustment += self.SQUEEZE_POTENTIAL_BONUS

        # Crowded short (could be warning or opportunity)
        elif squeeze_risk == 'HIGH' and signal == 'BEARISH_CROWDED':
            # High short interest that's increasing = bearish pressure
            adjustment -= 3

        # Very high short % of float is a volatility flag
        short_pct = getattr(short_data, 'short_percent_of_float', 0) or 0
        if short_pct > 20:
            # Don't add/subtract, but this affects confidence
            pass

        return adjustment

    def _calculate_relative_strength_adjustment(self, stock_data: Dict[str, Any]) -> float:
        """Calculate adjustment based on relative strength vs sector."""
        rs_data = stock_data.get('relative_strength')
        if not rs_data:
            return 0

        signal = getattr(rs_data, 'signal', 'INLINE')

        if signal == 'OUTPERFORMING':
            return self.OUTPERFORMING_BONUS
        elif signal == 'SLIGHTLY_OUTPERFORMING':
            return self.OUTPERFORMING_BONUS / 2
        elif signal == 'UNDERPERFORMING':
            return -self.UNDERPERFORMING_PENALTY
        elif signal == 'SLIGHTLY_UNDERPERFORMING':
            return -self.UNDERPERFORMING_PENALTY / 2

        return 0

    def _score_to_recommendation(self, score: float, instrument_type: str = 'default') -> str:
        """Convert score to recommendation string."""
        thresholds = self._get_thresholds(instrument_type)

        if score >= thresholds['strong_buy']:
            return 'STRONG BUY'
        elif score >= thresholds['buy']:
            return 'BUY'
        elif score >= thresholds['hold']:
            return 'HOLD'
        elif score >= thresholds['sell']:
            return 'SELL'
        else:
            return 'STRONG SELL'

    def _calculate_confidence(
        self,
        layers: LayerResults,
        agreement_level: float
    ) -> str:
        """Calculate confidence level in the recommendation."""
        # Factors affecting confidence:
        # 1. Layer agreement
        # 2. Data quality (from each layer's confidence)
        # 3. Catalyst uncertainty

        confidences: List[float] = []
        if layers.quality_gate.applicable and layers.quality_gate.status == 'available':
            confidences.append(layers.quality_gate.confidence)
        if layers.intrinsic_value.applicable and layers.intrinsic_value.status == 'available':
            confidences.append(layers.intrinsic_value.conviction)
        if layers.market_regime.status == 'available':
            confidences.append(layers.market_regime.confidence)
        if layers.technical_confluence.status == 'available':
            confidences.append(layers.technical_confluence.confidence)
        if layers.catalyst.status == 'available':
            confidences.append(max(0.0, 1 - layers.catalyst.risk_factor))

        if not confidences:
            return 'LOW'

        avg_layer_confidence = sum(confidences) / len(confidences)

        # Combine with agreement
        overall = (avg_layer_confidence * 0.6) + (agreement_level * 0.4)

        # Catalyst uncertainty reduces confidence
        if layers.catalyst.status == 'available' and layers.catalyst.days_to_nearest <= 7:
            overall *= 0.8

        if overall >= self.confidence_thresholds.get('high', 0.75):
            return 'HIGH'
        elif overall >= self.confidence_thresholds.get('medium', 0.5):
            return 'MEDIUM'
        else:
            return 'LOW'

    def _build_explanation(
        self,
        ticker: str,
        layers: LayerResults,
        base_score: float,
        agreement_adj: float,
        regime_adj: float,
        catalyst_adj: float,
        insider_adj: float = 0,
        short_adj: float = 0,
        rs_adj: float = 0
    ) -> str:
        """Build human-readable explanation of the score."""
        parts = []

        # Value assessment
        value = layers.intrinsic_value
        if not value.applicable:
            parts.append("valuation not applicable")
        elif value.status != 'available':
            parts.append("valuation unavailable")
        elif value.valuation_signal == 'UNDERVALUED':
            parts.append(f"Undervalued by {abs(value.margin_of_safety)*100:.0f}%")
        elif value.valuation_signal == 'OVERVALUED':
            parts.append(f"Overvalued by {abs(value.margin_of_safety)*100:.0f}%")
        else:
            parts.append("Fairly valued")

        # Technical assessment
        tech = layers.technical_confluence
        if tech.status != 'available':
            parts.append("technical history unavailable")
        elif tech.trend_alignment == 'ALIGNED_UP':
            parts.append(f"bullish technicals ({len(tech.signals_bullish)} confirming signals)")
        elif tech.trend_alignment == 'ALIGNED_DOWN':
            parts.append(f"bearish technicals ({len(tech.signals_bearish)} warning signals)")
        else:
            parts.append("mixed technical signals")

        # Regime context
        regime = layers.market_regime
        parts.append(f"in {regime.regime.lower().replace('_', ' ')} market")

        # Catalyst note
        cat = layers.catalyst
        if cat.status == 'available' and cat.days_to_nearest < 30:
            nearest = cat.nearest_catalyst
            if nearest:
                parts.append(f"{nearest.catalyst_type.lower()} in {cat.days_to_nearest}d")

        # Insider trading note
        if insider_adj >= self.CLUSTER_BUYING_BONUS:
            parts.append("insider cluster buying")
        elif insider_adj >= self.EXECUTIVE_BUYING_BONUS:
            parts.append("executive buying")
        elif insider_adj < 0:
            parts.append("insider selling")

        # Relative strength note
        if rs_adj > 0:
            parts.append("outperforming sector")
        elif rs_adj < 0:
            parts.append("underperforming sector")

        # Short interest note
        if short_adj > 0:
            parts.append("squeeze potential")
        elif short_adj < 0:
            parts.append("crowded short")

        # Agreement note
        if agreement_adj > 10:
            parts.append("strong layer agreement")
        elif agreement_adj < -5:
            parts.append("conflicting signals")

        return "; ".join(parts)


def calculate_investment_score_v2(
    ticker: str,
    stock_data: Dict[str, Any],
    market_data: Dict[str, Any]
) -> ConvictionScore:
    """
    Main entry point for v2 scoring system.

    This function can be called from app.py as a drop-in replacement
    for the existing calculate_investment_score() function.

    Args:
        ticker: Stock symbol
        stock_data: Dict containing:
            - 'info': yfinance ticker.info
            - 'financials': Dict with balance_sheet, cashflow, income_stmt
            - 'history': DataFrame from ticker.history()
            - 'news': List from ticker.news
            - 'calendar': From ticker.calendar
        market_data: Dict containing:
            - 'vix': Current VIX value
            - 'spy': Dict with price, sma_20, sma_50, sma_200, change_1m
            - 'qqq': Dict with price, change_1m
            - 'iwm': Dict with price, change_1m

    Returns:
        ConvictionScore with score, recommendation, confidence, and layer details
    """
    combiner = ScoreCombiner()
    return combiner.calculate_conviction_score(ticker, stock_data, market_data)
