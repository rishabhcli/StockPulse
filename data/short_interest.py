"""
Short Interest Analyzer

Fetches short interest data to identify squeeze potential or crowded shorts.

Key metrics:
- Short Interest % of Float - how much of tradable shares are shorted
- Days to Cover - trading days needed to cover all shorts
- Short Interest Change - trend in short positions

Primary source: FINRA API (requires free account)
Fallback: yfinance (limited data)

Data freshness: Bi-weekly (published ~10 days after settlement date)
"""

import requests
import logging
import os
from dataclasses import dataclass
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# FINRA API configuration
FINRA_API_BASE = "https://api.finra.org/data/group/otcMarket/name/shortInterest"
FINRA_API_KEY = os.environ.get('FINRA_API_KEY', '')


@dataclass
class ShortInterestResult:
    """Short interest analysis result"""
    ticker: str
    short_interest: Optional[int] = None  # Number of shares shorted
    short_percent_of_float: Optional[float] = None  # % of float shorted
    short_percent_of_shares: Optional[float] = None  # % of outstanding shorted
    days_to_cover: Optional[float] = None  # Short interest / avg daily volume
    previous_short_interest: Optional[int] = None
    change_from_prior: Optional[float] = None  # % change
    avg_daily_volume: Optional[int] = None
    float_shares: Optional[int] = None
    squeeze_risk: str = 'UNKNOWN'  # HIGH, MEDIUM, LOW, UNKNOWN
    signal: str = 'NEUTRAL'  # BULLISH_SQUEEZE, BEARISH_CROWDED, NEUTRAL
    data_date: Optional[datetime] = None
    confidence: float = 0.3
    source: str = 'unknown'
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'ticker': self.ticker,
            'short_interest': self.short_interest,
            'percent_of_float': round(self.short_percent_of_float, 2) if self.short_percent_of_float else None,
            'percent_of_shares': round(self.short_percent_of_shares, 2) if self.short_percent_of_shares else None,
            'days_to_cover': round(self.days_to_cover, 2) if self.days_to_cover else None,
            'change_from_prior': round(self.change_from_prior, 2) if self.change_from_prior else None,
            'squeeze_risk': self.squeeze_risk,
            'signal': self.signal,
            'data_date': self.data_date.strftime('%Y-%m-%d') if self.data_date else None,
            'confidence': round(self.confidence, 2),
            'source': self.source,
            'error': self.error,
        }


class ShortInterestAnalyzer:
    """
    Analyzes short interest data from multiple sources.
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key or FINRA_API_KEY
        self.session = requests.Session()
        self._cache = {}
        self._cache_expiry = {}
        self._cache_ttl = 14400  # 4 hours (data is bi-weekly anyway)

    def _is_cache_valid(self, key: str) -> bool:
        """Check if cached data is still valid."""
        if key not in self._cache:
            return False
        if key not in self._cache_expiry:
            return False
        return datetime.now() < self._cache_expiry[key]

    def _fetch_from_yfinance(self, ticker: str) -> ShortInterestResult:
        """
        Fetch short interest data from yfinance.
        This is a fallback when FINRA API is not available.
        """
        try:
            import yfinance as yf

            stock = yf.Ticker(ticker)
            info = stock.info

            # Extract short interest metrics
            short_interest = info.get('sharesShort')
            short_percent_float = info.get('shortPercentOfFloat')
            short_ratio = info.get('shortRatio')  # Days to cover
            float_shares = info.get('floatShares')
            shares_outstanding = info.get('sharesOutstanding')
            avg_volume = info.get('averageVolume')
            prior_short = info.get('sharesShortPriorMonth')
            short_date = info.get('dateShortInterest')

            # Calculate percent of shares if not provided
            short_percent_shares = None
            if short_interest and shares_outstanding:
                short_percent_shares = (short_interest / shares_outstanding) * 100

            # Calculate percent of float if not provided
            if not short_percent_float and short_interest and float_shares:
                short_percent_float = (short_interest / float_shares) * 100

            # Calculate change from prior
            change = None
            if short_interest and prior_short and prior_short > 0:
                change = ((short_interest - prior_short) / prior_short) * 100

            # Calculate days to cover if not provided
            if not short_ratio and short_interest and avg_volume and avg_volume > 0:
                short_ratio = short_interest / avg_volume

            # Parse date
            data_date = None
            if short_date:
                try:
                    if isinstance(short_date, int):
                        data_date = datetime.fromtimestamp(short_date)
                    elif isinstance(short_date, str):
                        data_date = datetime.strptime(short_date, '%Y-%m-%d')
                except:
                    pass

            # Determine squeeze risk and signal
            squeeze_risk, signal = self._analyze_squeeze_risk(
                short_percent_float,
                short_ratio,
                change
            )

            if not any([
                short_interest,
                short_percent_float,
                short_percent_shares,
                short_ratio,
                prior_short,
                change is not None,
            ]):
                return ShortInterestResult(
                    ticker=ticker,
                    signal='UNAVAILABLE',
                    squeeze_risk='UNKNOWN',
                    confidence=0.0,
                    source='yfinance',
                    error='Short interest metrics unavailable',
                )

            # Calculate confidence
            confidence = 0.3
            if short_interest:
                confidence += 0.2
            if short_percent_float:
                confidence += 0.2
            if short_ratio:
                confidence += 0.1
            if change is not None:
                confidence += 0.1

            return ShortInterestResult(
                ticker=ticker,
                short_interest=short_interest,
                short_percent_of_float=short_percent_float,
                short_percent_of_shares=short_percent_shares,
                days_to_cover=short_ratio,
                previous_short_interest=prior_short,
                change_from_prior=change,
                avg_daily_volume=avg_volume,
                float_shares=float_shares,
                squeeze_risk=squeeze_risk,
                signal=signal,
                data_date=data_date or datetime.now(),
                confidence=confidence,
                source='yfinance',
            )

        except Exception as e:
            logger.warning(f"yfinance short interest fetch failed for {ticker}: {e}")
            return ShortInterestResult(
                ticker=ticker,
                signal='UNAVAILABLE',
                confidence=0.0,
                source='yfinance',
                error=str(e),
            )

    def _fetch_from_finra(self, ticker: str) -> Optional[ShortInterestResult]:
        """
        Fetch short interest data from FINRA API.
        Requires free FINRA account registration.
        """
        if not self.api_key:
            return None

        try:
            # Note: FINRA API structure may vary
            # This is a placeholder for the actual implementation
            # Users need to register at developer.finra.org

            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Accept': 'application/json',
            }

            params = {
                'symbol': ticker,
                'limit': 2,  # Current and prior
            }

            response = self.session.get(
                FINRA_API_BASE,
                headers=headers,
                params=params,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                # Parse FINRA response (structure depends on actual API)
                # This is a placeholder
                return None

        except Exception as e:
            logger.debug(f"FINRA API fetch failed: {e}")

        return None

    def _analyze_squeeze_risk(
        self,
        short_percent_float: Optional[float],
        days_to_cover: Optional[float],
        change: Optional[float]
    ) -> tuple:
        """
        Analyze squeeze potential and generate signal.

        Returns:
            Tuple of (squeeze_risk, signal)
        """
        if not short_percent_float and not days_to_cover:
            return 'UNKNOWN', 'NEUTRAL'

        risk_score = 0

        # High short % of float increases squeeze risk
        if short_percent_float:
            if short_percent_float > 25:
                risk_score += 3
            elif short_percent_float > 15:
                risk_score += 2
            elif short_percent_float > 10:
                risk_score += 1

        # High days to cover increases squeeze risk
        if days_to_cover:
            if days_to_cover > 10:
                risk_score += 3
            elif days_to_cover > 5:
                risk_score += 2
            elif days_to_cover > 3:
                risk_score += 1

        # Increasing short interest could mean either squeeze setup or bearish
        # Decreasing short interest with high levels = covering = bullish

        # Determine risk level
        if risk_score >= 5:
            squeeze_risk = 'HIGH'
        elif risk_score >= 3:
            squeeze_risk = 'MEDIUM'
        elif risk_score >= 1:
            squeeze_risk = 'LOW'
        else:
            squeeze_risk = 'MINIMAL'

        # Determine signal
        if squeeze_risk == 'HIGH' and change and change < -5:
            # High short interest but covering = bullish squeeze potential
            signal = 'BULLISH_SQUEEZE'
        elif squeeze_risk == 'HIGH' and change and change > 5:
            # High and increasing = crowded short, could be bearish catalyst
            signal = 'BEARISH_CROWDED'
        elif squeeze_risk in ['HIGH', 'MEDIUM']:
            signal = 'HIGH_SHORT_INTEREST'
        else:
            signal = 'NEUTRAL'

        return squeeze_risk, signal

    def get_short_interest(self, ticker: str) -> ShortInterestResult:
        """
        Get short interest analysis for a ticker.

        Args:
            ticker: Stock symbol

        Returns:
            ShortInterestResult
        """
        ticker = ticker.upper()
        cache_key = ticker

        # Check cache
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        # Try FINRA first if API key available
        result = self._fetch_from_finra(ticker)

        # Fall back to yfinance
        if not result:
            result = self._fetch_from_yfinance(ticker)

        # Cache result
        self._cache[cache_key] = result
        self._cache_expiry[cache_key] = datetime.now() + timedelta(seconds=self._cache_ttl)

        return result


# Singleton instance
_analyzer = None


def get_short_interest(ticker: str) -> ShortInterestResult:
    """
    Get short interest analysis for a ticker.

    Args:
        ticker: Stock symbol

    Returns:
        ShortInterestResult
    """
    global _analyzer
    if _analyzer is None:
        _analyzer = ShortInterestAnalyzer()

    return _analyzer.get_short_interest(ticker)
