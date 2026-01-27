"""
Sector Relative Strength Analyzer

Compares individual stock performance against its sector ETF to determine
if the stock is outperforming or underperforming its peers.

Key insight: Strong stocks in weak sectors often become leaders when
the sector rotates. Weak stocks in strong sectors are laggards to avoid.
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Sector ETF mappings (SPDR Select Sector ETFs)
SECTOR_ETFS = {
    'Technology': 'XLK',
    'Financial Services': 'XLF',
    'Healthcare': 'XLV',
    'Energy': 'XLE',
    'Industrials': 'XLI',
    'Consumer Defensive': 'XLP',
    'Utilities': 'XLU',
    'Consumer Cyclical': 'XLY',
    'Communication Services': 'XLC',
    'Real Estate': 'XLRE',
    'Basic Materials': 'XLB',
    # Alternative names used by yfinance
    'Financial': 'XLF',
    'Consumer Staples': 'XLP',
    'Consumer Discretionary': 'XLY',
    'Materials': 'XLB',
    'Information Technology': 'XLK',
}

# Default to SPY if sector not found
DEFAULT_BENCHMARK = 'SPY'


@dataclass
class RelativeStrengthResult:
    """Result from relative strength analysis"""
    ticker: str
    sector: str
    sector_etf: str
    stock_return_1w: float = 0.0
    stock_return_1m: float = 0.0
    stock_return_3m: float = 0.0
    sector_return_1w: float = 0.0
    sector_return_1m: float = 0.0
    sector_return_3m: float = 0.0
    relative_strength_1w: float = 0.0  # Stock - Sector return
    relative_strength_1m: float = 0.0
    relative_strength_3m: float = 0.0
    signal: str = 'INLINE'  # 'OUTPERFORMING', 'INLINE', 'UNDERPERFORMING'
    strength_score: float = 50.0  # 0-100, 50 is neutral
    confidence: float = 0.5

    def to_dict(self) -> Dict[str, Any]:
        return {
            'ticker': self.ticker,
            'sector': self.sector,
            'sector_etf': self.sector_etf,
            'stock_returns': {
                '1w': round(self.stock_return_1w, 2),
                '1m': round(self.stock_return_1m, 2),
                '3m': round(self.stock_return_3m, 2),
            },
            'sector_returns': {
                '1w': round(self.sector_return_1w, 2),
                '1m': round(self.sector_return_1m, 2),
                '3m': round(self.sector_return_3m, 2),
            },
            'relative_strength': {
                '1w': round(self.relative_strength_1w, 2),
                '1m': round(self.relative_strength_1m, 2),
                '3m': round(self.relative_strength_3m, 2),
            },
            'signal': self.signal,
            'strength_score': round(self.strength_score, 1),
            'confidence': round(self.confidence, 2),
        }


class RelativeStrengthAnalyzer:
    """
    Analyzes stock performance relative to its sector.

    Uses sector ETFs as benchmarks to determine if a stock
    is leading or lagging its peers.
    """

    def __init__(self):
        self._history_cache = {}

    def _get_history(self, symbol: str, period: str = '3mo'):
        """Get price history, using cache if available."""
        cache_key = f"{symbol}_{period}"
        if cache_key in self._history_cache:
            return self._history_cache[cache_key]

        try:
            # Import here to avoid circular imports
            from data.fetchers import get_cached_history

            hist = get_cached_history(symbol, period=period)
            self._history_cache[cache_key] = hist
            return hist
        except Exception as e:
            logger.warning(f"Failed to get history for {symbol}: {e}")
            return None

    def _calculate_return(self, history, days: int) -> Optional[float]:
        """Calculate return over specified number of days."""
        if history is None or history.empty:
            return None

        if len(history) < days:
            days = len(history) - 1

        if days <= 0:
            return None

        try:
            current_price = history['Close'].iloc[-1]
            past_price = history['Close'].iloc[-days - 1]

            if past_price <= 0:
                return None

            return ((current_price / past_price) - 1) * 100
        except Exception:
            return None

    def _get_sector_etf(self, sector: str) -> str:
        """Get the appropriate sector ETF for the given sector."""
        if not sector:
            return DEFAULT_BENCHMARK

        # Try exact match first
        if sector in SECTOR_ETFS:
            return SECTOR_ETFS[sector]

        # Try case-insensitive match
        sector_lower = sector.lower()
        for key, etf in SECTOR_ETFS.items():
            if key.lower() == sector_lower:
                return etf

        # Try partial match
        for key, etf in SECTOR_ETFS.items():
            if sector_lower in key.lower() or key.lower() in sector_lower:
                return etf

        return DEFAULT_BENCHMARK

    def _determine_signal(
        self,
        rs_1w: float,
        rs_1m: float,
        rs_3m: float
    ) -> tuple:
        """
        Determine the overall signal based on relative strength.

        Returns:
            Tuple of (signal, strength_score)
        """
        # Weight recent performance more heavily
        weighted_rs = (rs_1w * 0.4) + (rs_1m * 0.4) + (rs_3m * 0.2)

        # Convert to 0-100 score (50 is neutral)
        # Each 1% outperformance = 5 points above 50
        strength_score = 50 + (weighted_rs * 5)
        strength_score = max(0, min(100, strength_score))

        # Determine signal
        if weighted_rs >= 5:
            signal = 'OUTPERFORMING'
        elif weighted_rs >= 2:
            signal = 'SLIGHTLY_OUTPERFORMING'
        elif weighted_rs <= -5:
            signal = 'UNDERPERFORMING'
        elif weighted_rs <= -2:
            signal = 'SLIGHTLY_UNDERPERFORMING'
        else:
            signal = 'INLINE'

        return signal, strength_score

    def analyze(
        self,
        ticker: str,
        sector: str = None,
        info: Dict = None
    ) -> RelativeStrengthResult:
        """
        Analyze relative strength of a stock vs its sector.

        Args:
            ticker: Stock symbol
            sector: Sector name (optional, will try to get from info)
            info: yfinance info dict (optional)

        Returns:
            RelativeStrengthResult with comparison data
        """
        # Get sector from info if not provided
        if not sector and info:
            sector = info.get('sector', '')

        sector_etf = self._get_sector_etf(sector)

        # Get price histories
        stock_hist = self._get_history(ticker, '3mo')
        sector_hist = self._get_history(sector_etf, '3mo')

        # Calculate returns for different periods
        stock_1w = self._calculate_return(stock_hist, 5) or 0
        stock_1m = self._calculate_return(stock_hist, 22) or 0
        stock_3m = self._calculate_return(stock_hist, 63) or 0

        sector_1w = self._calculate_return(sector_hist, 5) or 0
        sector_1m = self._calculate_return(sector_hist, 22) or 0
        sector_3m = self._calculate_return(sector_hist, 63) or 0

        # Calculate relative strength (stock - sector)
        rs_1w = stock_1w - sector_1w
        rs_1m = stock_1m - sector_1m
        rs_3m = stock_3m - sector_3m

        # Determine signal and score
        signal, strength_score = self._determine_signal(rs_1w, rs_1m, rs_3m)

        # Calculate confidence based on data availability
        confidence = 0.3
        if stock_hist is not None and len(stock_hist) >= 63:
            confidence += 0.3
        if sector_hist is not None and len(sector_hist) >= 63:
            confidence += 0.3
        if sector != DEFAULT_BENCHMARK:
            confidence += 0.1

        return RelativeStrengthResult(
            ticker=ticker,
            sector=sector or 'Unknown',
            sector_etf=sector_etf,
            stock_return_1w=stock_1w,
            stock_return_1m=stock_1m,
            stock_return_3m=stock_3m,
            sector_return_1w=sector_1w,
            sector_return_1m=sector_1m,
            sector_return_3m=sector_3m,
            relative_strength_1w=rs_1w,
            relative_strength_1m=rs_1m,
            relative_strength_3m=rs_3m,
            signal=signal,
            strength_score=strength_score,
            confidence=confidence,
        )


# Singleton instance
_analyzer = None


def get_relative_strength(
    ticker: str,
    sector: str = None,
    info: Dict = None
) -> RelativeStrengthResult:
    """
    Get relative strength analysis for a ticker.

    Args:
        ticker: Stock symbol
        sector: Sector name (optional)
        info: yfinance info dict (optional)

    Returns:
        RelativeStrengthResult
    """
    global _analyzer
    if _analyzer is None:
        _analyzer = RelativeStrengthAnalyzer()

    return _analyzer.analyze(ticker, sector, info)
