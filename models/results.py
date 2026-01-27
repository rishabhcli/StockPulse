"""
Result Data Classes - Standardized outputs for each analysis layer
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


# ============== Layer 1: Quality Gate ==============

class QualityFlagType(Enum):
    """Types of quality red flags"""
    ACCOUNTING = "accounting"
    LIQUIDITY = "liquidity"
    SOLVENCY = "solvency"
    GOVERNANCE = "governance"
    OPERATIONAL = "operational"


@dataclass
class QualityFlag:
    """A specific quality issue detected"""
    flag_type: QualityFlagType
    severity: str  # 'critical', 'warning', 'info'
    metric_name: str
    metric_value: float
    threshold: float
    description: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            'type': self.flag_type.value,
            'severity': self.severity,
            'metric': self.metric_name,
            'value': self.metric_value,
            'threshold': self.threshold,
            'description': self.description
        }


@dataclass
class QualityGateResult:
    """Result from Layer 1: Quality Gate analysis"""
    passed: bool
    flags: List[QualityFlag] = field(default_factory=list)
    confidence: float = 0.5  # 0-1, how confident in the assessment
    data_quality: str = 'complete'  # 'complete', 'partial', 'insufficient'

    # Specific metrics calculated
    altman_z_score: Optional[float] = None
    current_ratio: Optional[float] = None
    interest_coverage: Optional[float] = None
    cash_flow_quality: Optional[float] = None  # CFO / Net Income

    def to_dict(self) -> Dict[str, Any]:
        return {
            'passed': self.passed,
            'flags': [f.to_dict() for f in self.flags],
            'confidence': round(self.confidence, 2),
            'data_quality': self.data_quality,
            'metrics': {
                'altman_z_score': self.altman_z_score,
                'current_ratio': self.current_ratio,
                'interest_coverage': self.interest_coverage,
                'cash_flow_quality': self.cash_flow_quality
            }
        }


# ============== Layer 2: Intrinsic Value ==============

@dataclass
class ValuationMethod:
    """Result from a single valuation method"""
    method_name: str  # 'DCF', 'Owner_Earnings', 'Peer_Relative', 'Reverse_DCF'
    fair_value: Optional[float]
    confidence: float  # 0-1
    inputs_used: Dict[str, Any] = field(default_factory=dict)
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            'method': self.method_name,
            'fair_value': round(self.fair_value, 2) if self.fair_value else None,
            'confidence': round(self.confidence, 2),
            'notes': self.notes
        }


@dataclass
class IntrinsicValueResult:
    """Result from Layer 2: Intrinsic Value analysis"""
    fair_value_low: Optional[float] = None
    fair_value_mid: Optional[float] = None
    fair_value_high: Optional[float] = None
    current_price: float = 0.0
    margin_of_safety: float = 0.0  # (fair_value_mid - current) / fair_value_mid
    valuation_signal: str = 'UNKNOWN'  # 'UNDERVALUED', 'FAIRLY_VALUED', 'OVERVALUED'
    methods_used: List[ValuationMethod] = field(default_factory=list)
    conviction: float = 0.5  # 0-1, based on method agreement
    implied_growth_rate: Optional[float] = None  # From reverse DCF

    def to_dict(self) -> Dict[str, Any]:
        return {
            'fair_value_low': round(self.fair_value_low, 2) if self.fair_value_low else None,
            'fair_value_mid': round(self.fair_value_mid, 2) if self.fair_value_mid else None,
            'fair_value_high': round(self.fair_value_high, 2) if self.fair_value_high else None,
            'current_price': round(self.current_price, 2),
            'margin_of_safety': round(self.margin_of_safety, 3),
            'signal': self.valuation_signal,
            'methods': [m.to_dict() for m in self.methods_used],
            'conviction': round(self.conviction, 2),
            'implied_growth': round(self.implied_growth_rate, 3) if self.implied_growth_rate else None
        }


# ============== Layer 3: Market Regime ==============

class RegimeType(Enum):
    """Market regime classifications"""
    RISK_ON = "RISK_ON"
    RISK_OFF = "RISK_OFF"
    CRISIS = "CRISIS"
    RECOVERY = "RECOVERY"
    ROTATION = "ROTATION"


@dataclass
class MarketRegimeResult:
    """Result from Layer 3: Market Regime analysis"""
    regime: str = 'ROTATION'  # RegimeType value
    vix_level: float = 20.0
    vix_percentile: float = 50.0  # Where current VIX is vs history
    spy_trend: str = 'NEUTRAL'  # 'UPTREND', 'DOWNTREND', 'NEUTRAL'
    breadth: float = 50.0  # % of stocks above 200 SMA
    sector_rotation: Dict[str, str] = field(default_factory=dict)  # sector: 'leading'/'lagging'
    factor_weights: Dict[str, float] = field(default_factory=dict)  # Adjusted weights
    confidence: float = 0.5
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            'regime': self.regime,
            'vix': round(self.vix_level, 2),
            'vix_percentile': round(self.vix_percentile, 1),
            'spy_trend': self.spy_trend,
            'breadth': round(self.breadth, 1),
            'sector_rotation': self.sector_rotation,
            'factor_weights': {k: round(v, 2) for k, v in self.factor_weights.items()},
            'confidence': round(self.confidence, 2),
            'description': self.description
        }


# ============== Layer 4: Technical Confluence ==============

@dataclass
class Divergence:
    """A price/indicator divergence detected"""
    divergence_type: str  # 'bullish', 'bearish'
    indicator: str  # 'RSI', 'MACD', 'OBV'
    price_direction: str  # 'higher_high', 'lower_low'
    indicator_direction: str  # 'lower_high', 'higher_low'
    strength: str  # 'strong', 'moderate', 'weak'

    def to_dict(self) -> Dict[str, Any]:
        return {
            'type': self.divergence_type,
            'indicator': self.indicator,
            'price': self.price_direction,
            'indicator_move': self.indicator_direction,
            'strength': self.strength
        }


@dataclass
class TechnicalConfluenceResult:
    """Result from Layer 4: Technical Confluence analysis"""
    confluence_score: float = 50.0  # 0-100
    signals_bullish: List[str] = field(default_factory=list)
    signals_bearish: List[str] = field(default_factory=list)
    divergences: List[Divergence] = field(default_factory=list)
    trend_alignment: str = 'MIXED'  # 'ALIGNED_UP', 'ALIGNED_DOWN', 'MIXED'
    key_levels: Dict[str, float] = field(default_factory=dict)  # 'support', 'resistance'
    price_position: str = 'NEUTRAL'  # 'AT_SUPPORT', 'AT_RESISTANCE', 'BREAKOUT', 'NEUTRAL'
    momentum_state: str = 'NEUTRAL'  # 'ACCELERATING', 'DECELERATING', 'REVERSING'
    confidence: float = 0.5  # 0-1, based on signal clarity and data quality

    # Raw indicators for display
    indicators: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'confluence_score': round(self.confluence_score, 1),
            'signals_bullish': self.signals_bullish,
            'signals_bearish': self.signals_bearish,
            'signals_agreeing': len(self.signals_bullish) if self.confluence_score > 50 else len(self.signals_bearish),
            'divergences': [d.to_dict() for d in self.divergences],
            'trend_alignment': self.trend_alignment,
            'key_levels': {k: round(v, 2) for k, v in self.key_levels.items()},
            'price_position': self.price_position,
            'momentum': self.momentum_state,
            'confidence': round(self.confidence, 2),
            'indicators': {k: round(v, 2) if isinstance(v, float) else v for k, v in self.indicators.items()}
        }


# ============== Layer 5: Catalyst ==============

@dataclass
class Catalyst:
    """An upcoming event that could move the stock"""
    catalyst_type: str  # 'EARNINGS', 'DIVIDEND', 'FDA', 'PRODUCT', 'MACRO', 'TECHNICAL'
    date: Optional[datetime] = None
    days_away: int = 999
    expected_impact: str = 'MEDIUM'  # 'HIGH', 'MEDIUM', 'LOW'
    sentiment: str = 'NEUTRAL'  # 'POSITIVE', 'NEGATIVE', 'NEUTRAL', 'UNCERTAIN'
    description: str = ""
    confidence: float = 0.5

    def to_dict(self) -> Dict[str, Any]:
        return {
            'type': self.catalyst_type,
            'date': self.date.strftime('%Y-%m-%d') if self.date else None,
            'days_away': self.days_away,
            'impact': self.expected_impact,
            'sentiment': self.sentiment,
            'description': self.description,
            'confidence': round(self.confidence, 2)
        }


@dataclass
class CatalystResult:
    """Result from Layer 5: Catalyst analysis"""
    catalysts: List[Catalyst] = field(default_factory=list)
    nearest_catalyst: Optional[Catalyst] = None
    days_to_nearest: int = 999
    catalyst_sentiment: str = 'NEUTRAL'  # Overall sentiment of upcoming catalysts
    risk_factor: float = 0.5  # 0-1, uncertainty from catalysts
    news_sentiment_score: float = 0.0  # -1 to +1
    social_sentiment_score: Optional[float] = None  # -1 to +1, from X API

    def to_dict(self) -> Dict[str, Any]:
        return {
            'catalysts': [c.to_dict() for c in self.catalysts],
            'nearest': self.nearest_catalyst.to_dict() if self.nearest_catalyst else None,
            'days_to_nearest': self.days_to_nearest,
            'sentiment': self.catalyst_sentiment,
            'risk_factor': round(self.risk_factor, 2),
            'news_sentiment': round(self.news_sentiment_score, 2),
            'social_sentiment': round(self.social_sentiment_score, 2) if self.social_sentiment_score else None
        }


# ============== Final Combined Score ==============

@dataclass
class LayerScores:
    """Individual scores from each layer"""
    quality_gate: float = 50.0
    intrinsic_value: float = 50.0
    market_regime: float = 50.0
    technical_confluence: float = 50.0
    catalyst: float = 50.0

    def to_dict(self) -> Dict[str, float]:
        return {
            'quality': round(self.quality_gate, 1),
            'value': round(self.intrinsic_value, 1),
            'regime': round(self.market_regime, 1),
            'technical': round(self.technical_confluence, 1),
            'catalyst': round(self.catalyst, 1)
        }


@dataclass
class LayerResults:
    """Container for all layer analysis results"""
    quality_gate: 'QualityGateResult' = None
    intrinsic_value: 'IntrinsicValueResult' = None
    market_regime: 'MarketRegimeResult' = None
    technical_confluence: 'TechnicalConfluenceResult' = None
    catalyst: 'CatalystResult' = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'quality_gate': self.quality_gate.to_dict() if self.quality_gate else None,
            'intrinsic_value': self.intrinsic_value.to_dict() if self.intrinsic_value else None,
            'market_regime': self.market_regime.to_dict() if self.market_regime else None,
            'technical_confluence': self.technical_confluence.to_dict() if self.technical_confluence else None,
            'catalyst': self.catalyst.to_dict() if self.catalyst else None
        }


@dataclass
class ConvictionScore:
    """Final conviction-based investment score"""
    score: float = 50.0  # 1-100
    recommendation: str = 'HOLD'  # 'STRONG BUY', 'BUY', 'HOLD', 'SELL', 'STRONG SELL', 'AVOID'
    confidence: str = 'MEDIUM'  # 'HIGH', 'MEDIUM', 'LOW'

    # Layer details
    layer_results: LayerResults = None
    agreement_level: float = 0.5  # 0-1, how much layers agree

    # Explanation of the score
    explanation: str = ""
    scoring_version: str = 'v2'

    # Legacy compatibility fields
    action: str = 'hold'  # 'long', 'short', 'hold'
    layer_scores: LayerScores = field(default_factory=LayerScores)
    quality_passed: bool = True
    quality_warnings: List[str] = field(default_factory=list)
    evidence: List[Dict[str, Any]] = field(default_factory=list)

    def __post_init__(self):
        """Set derived fields after initialization."""
        # Set action based on recommendation
        if self.recommendation in ['STRONG BUY', 'BUY']:
            self.action = 'long'
        elif self.recommendation in ['STRONG SELL', 'SELL', 'AVOID']:
            self.action = 'short'
        else:
            self.action = 'hold'

        # Set quality_passed from layer_results
        if self.layer_results and self.layer_results.quality_gate:
            self.quality_passed = self.layer_results.quality_gate.passed
            if not self.quality_passed:
                self.quality_warnings = [f.description for f in self.layer_results.quality_gate.flags[:3]]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to API-compatible dictionary"""
        result = {
            'scoring_version': self.scoring_version,
            'score': round(self.score, 1),
            'recommendation': self.recommendation,
            'action': self.action,
            'confidence': self.confidence,
            'agreement_level': round(self.agreement_level, 2),
            'explanation': self.explanation,
            'quality_passed': self.quality_passed,
            'quality_warnings': self.quality_warnings,
        }

        # Add layer analysis if available
        if self.layer_results:
            result['layer_analysis'] = self.layer_results.to_dict()

        # Add legacy layer_scores if populated
        if self.layer_scores:
            result['layer_scores'] = self.layer_scores.to_dict()

        if self.evidence:
            result['evidence'] = self.evidence

        return result

    def to_v1_compatible_dict(self) -> Dict[str, Any]:
        """
        Convert to a format compatible with the v1 API response.

        This allows gradual migration - the frontend can use existing fields
        while new layer_analysis fields are added.
        """
        base = self.to_dict()

        # Calculate backward-compatible technical/fundamental scores
        tech_score = 50.0
        fund_score = 50.0

        if self.layer_results:
            if self.layer_results.technical_confluence:
                tech_score = self.layer_results.technical_confluence.confluence_score

            if self.layer_results.intrinsic_value:
                # Map margin of safety to a 0-100 score
                mos = self.layer_results.intrinsic_value.margin_of_safety
                if mos > 0:  # Undervalued
                    fund_score = min(100, 50 + (mos * 100))
                else:  # Overvalued
                    fund_score = max(0, 50 + (mos * 100))

        base['technical_score'] = round(tech_score, 1)
        base['fundamental_score'] = round(fund_score, 1)

        return base
