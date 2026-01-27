"""
FRED Economic Calendar & Indicators

Fetches macroeconomic data from the Federal Reserve Economic Data (FRED) API.
Provides context for market regime detection and risk assessment.

Key indicators:
- Yield curve (10Y-2Y spread) - recession predictor
- Fed Funds Rate - monetary policy
- Unemployment rate - economic health
- CPI - inflation

Data source: https://fred.stlouisfed.org
Rate limit: 120 requests/minute
Auth: Free API key required (register at fred.stlouisfed.org)
"""

import requests
import logging
import os
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# FRED API configuration
FRED_API_BASE = "https://api.stlouisfed.org/fred"
FRED_API_KEY = os.environ.get('FRED_API_KEY', '')

# Key economic series
FRED_SERIES = {
    'DFF': {
        'name': 'Federal Funds Effective Rate',
        'frequency': 'daily',
        'impact': 'high',
    },
    'T10Y2Y': {
        'name': '10-Year Treasury Minus 2-Year Treasury',
        'frequency': 'daily',
        'impact': 'high',
    },
    'T10Y3M': {
        'name': '10-Year Treasury Minus 3-Month Treasury',
        'frequency': 'daily',
        'impact': 'high',
    },
    'UNRATE': {
        'name': 'Unemployment Rate',
        'frequency': 'monthly',
        'impact': 'medium',
    },
    'CPIAUCSL': {
        'name': 'Consumer Price Index for All Urban Consumers',
        'frequency': 'monthly',
        'impact': 'high',
    },
    'GDP': {
        'name': 'Gross Domestic Product',
        'frequency': 'quarterly',
        'impact': 'high',
    },
    'VIXCLS': {
        'name': 'CBOE Volatility Index: VIX',
        'frequency': 'daily',
        'impact': 'high',
    },
}


@dataclass
class EconomicIndicator:
    """A single economic indicator reading"""
    series_id: str
    name: str
    value: float
    previous_value: Optional[float]
    change: float
    change_percent: float
    date: datetime
    frequency: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            'series_id': self.series_id,
            'name': self.name,
            'value': round(self.value, 3),
            'previous': round(self.previous_value, 3) if self.previous_value else None,
            'change': round(self.change, 3),
            'change_percent': round(self.change_percent, 2),
            'date': self.date.strftime('%Y-%m-%d'),
            'frequency': self.frequency,
        }


@dataclass
class EconomicContextResult:
    """Aggregated economic context for market analysis"""
    yield_curve_spread: Optional[float] = None
    yield_curve_inverted: bool = False
    fed_funds_rate: Optional[float] = None
    fed_stance: str = 'NEUTRAL'  # HAWKISH, DOVISH, NEUTRAL
    unemployment_rate: Optional[float] = None
    unemployment_trend: str = 'STABLE'  # RISING, FALLING, STABLE
    inflation_rate: Optional[float] = None
    inflation_trend: str = 'STABLE'  # RISING, FALLING, STABLE
    vix_level: Optional[float] = None
    risk_environment: str = 'NEUTRAL'  # FAVORABLE, CAUTIOUS, ADVERSE
    indicators: List[EconomicIndicator] = field(default_factory=list)
    confidence: float = 0.5
    data_date: Optional[datetime] = None
    api_available: bool = True
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'yield_curve': {
                'spread': round(self.yield_curve_spread, 2) if self.yield_curve_spread else None,
                'inverted': self.yield_curve_inverted,
            },
            'fed_funds_rate': round(self.fed_funds_rate, 2) if self.fed_funds_rate else None,
            'fed_stance': self.fed_stance,
            'unemployment': {
                'rate': round(self.unemployment_rate, 1) if self.unemployment_rate else None,
                'trend': self.unemployment_trend,
            },
            'inflation': {
                'rate': round(self.inflation_rate, 1) if self.inflation_rate else None,
                'trend': self.inflation_trend,
            },
            'vix': round(self.vix_level, 1) if self.vix_level else None,
            'risk_environment': self.risk_environment,
            'indicators': [i.to_dict() for i in self.indicators],
            'confidence': round(self.confidence, 2),
            'data_date': self.data_date.strftime('%Y-%m-%d') if self.data_date else None,
            'api_available': self.api_available,
            'error': self.error,
        }


class FREDAnalyzer:
    """
    Fetches and analyzes economic data from FRED API.
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key or FRED_API_KEY
        self.session = requests.Session()
        self._cache = {}
        self._cache_expiry = {}
        self._cache_ttl = 3600  # 1 hour cache

    def _is_cache_valid(self, key: str) -> bool:
        """Check if cached data is still valid."""
        if key not in self._cache:
            return False
        if key not in self._cache_expiry:
            return False
        return datetime.now() < self._cache_expiry[key]

    def _get_series(
        self,
        series_id: str,
        limit: int = 10
    ) -> Optional[List[Dict]]:
        """
        Fetch a series from FRED API.

        Args:
            series_id: FRED series ID (e.g., 'DFF', 'T10Y2Y')
            limit: Number of observations to fetch

        Returns:
            List of observation dicts or None
        """
        cache_key = f"{series_id}_{limit}"

        # Check cache
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        if not self.api_key:
            logger.debug("FRED API key not configured")
            return None

        try:
            url = f"{FRED_API_BASE}/series/observations"
            params = {
                'series_id': series_id,
                'api_key': self.api_key,
                'file_type': 'json',
                'sort_order': 'desc',
                'limit': limit,
            }

            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            observations = data.get('observations', [])

            # Cache the result
            self._cache[cache_key] = observations
            self._cache_expiry[cache_key] = datetime.now() + timedelta(seconds=self._cache_ttl)

            return observations

        except Exception as e:
            logger.warning(f"Failed to fetch FRED series {series_id}: {e}")
            return None

    def _parse_observation(self, obs: Dict) -> Optional[tuple]:
        """Parse a FRED observation into (date, value)."""
        try:
            date_str = obs.get('date')
            value_str = obs.get('value')

            if not date_str or not value_str or value_str == '.':
                return None

            date = datetime.strptime(date_str, '%Y-%m-%d')
            value = float(value_str)

            return (date, value)
        except:
            return None

    def _get_indicator(self, series_id: str) -> Optional[EconomicIndicator]:
        """Get the latest indicator value with change from previous."""
        observations = self._get_series(series_id, limit=5)

        if not observations:
            return None

        # Parse observations
        parsed = []
        for obs in observations:
            result = self._parse_observation(obs)
            if result:
                parsed.append(result)

        if not parsed:
            return None

        # Get current and previous values
        current_date, current_value = parsed[0]
        previous_value = parsed[1][1] if len(parsed) > 1 else None

        change = current_value - previous_value if previous_value else 0
        change_percent = (change / abs(previous_value) * 100) if previous_value and previous_value != 0 else 0

        series_info = FRED_SERIES.get(series_id, {})

        return EconomicIndicator(
            series_id=series_id,
            name=series_info.get('name', series_id),
            value=current_value,
            previous_value=previous_value,
            change=change,
            change_percent=change_percent,
            date=current_date,
            frequency=series_info.get('frequency', 'unknown'),
        )

    def _determine_fed_stance(self, fed_rate: float, rate_change: float) -> str:
        """Determine Fed monetary policy stance."""
        if rate_change > 0.1:
            return 'HAWKISH'
        elif rate_change < -0.1:
            return 'DOVISH'
        elif fed_rate > 4.5:
            return 'HAWKISH'
        elif fed_rate < 2.0:
            return 'DOVISH'
        return 'NEUTRAL'

    def _determine_trend(self, indicator: EconomicIndicator) -> str:
        """Determine trend based on change."""
        if indicator.change_percent > 2:
            return 'RISING'
        elif indicator.change_percent < -2:
            return 'FALLING'
        return 'STABLE'

    def _determine_risk_environment(
        self,
        yield_curve_inverted: bool,
        vix: float,
        unemployment_trend: str,
        inflation_trend: str
    ) -> str:
        """Determine overall risk environment."""
        risk_score = 0

        if yield_curve_inverted:
            risk_score += 2

        if vix:
            if vix > 30:
                risk_score += 2
            elif vix > 20:
                risk_score += 1
            elif vix < 15:
                risk_score -= 1

        if unemployment_trend == 'RISING':
            risk_score += 1
        elif unemployment_trend == 'FALLING':
            risk_score -= 1

        if inflation_trend == 'RISING':
            risk_score += 1

        if risk_score >= 3:
            return 'ADVERSE'
        elif risk_score >= 1:
            return 'CAUTIOUS'
        else:
            return 'FAVORABLE'

    def get_economic_context(self) -> EconomicContextResult:
        """
        Get comprehensive economic context.

        Returns:
            EconomicContextResult with all indicators
        """
        indicators = []
        yield_curve_spread = None
        yield_curve_inverted = False
        fed_rate = None
        fed_stance = 'NEUTRAL'
        unemployment = None
        unemployment_trend = 'STABLE'
        inflation = None
        inflation_trend = 'STABLE'
        vix = None

        # Check if API key is available
        if not self.api_key:
            return EconomicContextResult(
                api_available=False,
                confidence=0.1,
                error="FRED_API_KEY not configured. Register free at fred.stlouisfed.org"
            )

        # Fetch key indicators
        try:
            # Yield curve (10Y-2Y)
            yc_indicator = self._get_indicator('T10Y2Y')
            if yc_indicator:
                indicators.append(yc_indicator)
                yield_curve_spread = yc_indicator.value
                yield_curve_inverted = yc_indicator.value < 0

            # Fed Funds Rate
            ff_indicator = self._get_indicator('DFF')
            if ff_indicator:
                indicators.append(ff_indicator)
                fed_rate = ff_indicator.value
                fed_stance = self._determine_fed_stance(ff_indicator.value, ff_indicator.change)

            # Unemployment
            ur_indicator = self._get_indicator('UNRATE')
            if ur_indicator:
                indicators.append(ur_indicator)
                unemployment = ur_indicator.value
                unemployment_trend = self._determine_trend(ur_indicator)

            # CPI (Inflation) - year-over-year change
            cpi_indicator = self._get_indicator('CPIAUCSL')
            if cpi_indicator:
                indicators.append(cpi_indicator)
                # Note: CPI is an index, not a rate. Would need more data for YoY
                inflation = cpi_indicator.change_percent * 12  # Rough annualized
                inflation_trend = self._determine_trend(cpi_indicator)

            # VIX
            vix_indicator = self._get_indicator('VIXCLS')
            if vix_indicator:
                indicators.append(vix_indicator)
                vix = vix_indicator.value

        except Exception as e:
            logger.warning(f"Error fetching FRED data: {e}")

        # Determine risk environment
        risk_env = self._determine_risk_environment(
            yield_curve_inverted,
            vix or 20,
            unemployment_trend,
            inflation_trend
        )

        # Calculate confidence based on data availability
        confidence = 0.3 + (len(indicators) * 0.1)
        confidence = min(0.9, confidence)

        return EconomicContextResult(
            yield_curve_spread=yield_curve_spread,
            yield_curve_inverted=yield_curve_inverted,
            fed_funds_rate=fed_rate,
            fed_stance=fed_stance,
            unemployment_rate=unemployment,
            unemployment_trend=unemployment_trend,
            inflation_rate=inflation,
            inflation_trend=inflation_trend,
            vix_level=vix,
            risk_environment=risk_env,
            indicators=indicators,
            confidence=confidence,
            data_date=datetime.now(),
            api_available=True,
        )


# Singleton instance
_analyzer = None


def get_economic_context(api_key: str = None) -> EconomicContextResult:
    """
    Get economic context for market analysis.

    Args:
        api_key: FRED API key (optional, uses FRED_API_KEY env var)

    Returns:
        EconomicContextResult
    """
    global _analyzer
    if _analyzer is None:
        _analyzer = FREDAnalyzer(api_key)

    return _analyzer.get_economic_context()
