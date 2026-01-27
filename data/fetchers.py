"""
StockPulse Data Fetchers - Functions to fetch and cache financial data

Primary source: Stooq (no rate limits)
Secondary source: yfinance (rate limited)
"""

import yfinance as yf
import pandas as pd
import requests
from io import StringIO
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

from .cache import get_ticker_cache, TickerCache

logger = logging.getLogger(__name__)


# ============== Helper Functions ==============

def normalize_ticker(ticker: str) -> str:
    """
    Normalize ticker symbol - add ^ prefix for index symbols if missing.

    Args:
        ticker: Raw ticker symbol

    Returns:
        Normalized ticker symbol
    """
    INDEX_SYMBOLS = {'DJI', 'GSPC', 'IXIC', 'RUT', 'VIX', 'TNX', 'TYX', 'FVX', 'IRX'}
    ticker_upper = ticker.upper().strip()

    if ticker_upper.startswith('^'):
        return ticker_upper
    if ticker_upper in INDEX_SYMBOLS:
        return f'^{ticker_upper}'
    return ticker_upper


# ============== Stooq Data Source ==============

def get_stooq_data(symbol: str, days: int = 365) -> Optional[pd.DataFrame]:
    """
    Fetch stock data from Stooq.com (no rate limits, no API key needed).

    Args:
        symbol: Stock ticker (e.g., 'AAPL')
        days: Number of days of history to fetch

    Returns:
        DataFrame with OHLCV data or None if failed
    """
    cache = get_ticker_cache()
    cache_key = f"stooq_{symbol}_{days}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        # Stooq symbol mapping
        stooq_symbol = symbol.upper()
        if not stooq_symbol.startswith('^'):
            if not stooq_symbol.endswith('.US'):
                stooq_symbol = f"{stooq_symbol}.US"

        url = f'https://stooq.com/q/d/l/?s={stooq_symbol}&i=d'
        response = requests.get(url, timeout=10)

        if response.status_code == 200 and len(response.text) > 50:
            df = pd.read_csv(StringIO(response.text))
            if not df.empty and 'Close' in df.columns:
                df = df.tail(days)
                cache.set(cache_key, df, ttl=TickerCache.TTL_QUOTE)
                return df
    except Exception as e:
        logger.debug(f"Stooq fetch failed for {symbol}: {e}")

    return None


def get_stooq_quote(symbol: str) -> Optional[Dict[str, float]]:
    """
    Get latest quote from Stooq with Yahoo Finance fallback.

    Args:
        symbol: Stock ticker

    Returns:
        Dict with price, change, change_pct or None
    """
    df = get_stooq_data(symbol, days=5)
    if df is not None and len(df) >= 2:
        current = df.iloc[-1]['Close']
        prev = df.iloc[-2]['Close']
        change = current - prev
        change_pct = ((current - prev) / prev) * 100
        return {
            'price': round(current, 2),
            'change': round(change, 2),
            'change_pct': round(change_pct, 2)
        }
    return None


# ============== yfinance Data Fetching ==============

def get_cached_history(symbol: str, period: str = "1y") -> pd.DataFrame:
    """
    Get cached historical data (Stooq primary, yfinance backup).

    Args:
        symbol: Stock ticker
        period: Time period ('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y')

    Returns:
        DataFrame with OHLCV data
    """
    cache = get_ticker_cache()
    symbol = normalize_ticker(symbol)
    cache_key = f"history_{symbol}_{period}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # Period to days mapping for Stooq
    period_days = {
        '1d': 1, '5d': 5, '1mo': 30, '3mo': 90,
        '6mo': 180, '1y': 365, '2y': 730, '5y': 1825
    }
    days = period_days.get(period, 365)

    # Try Stooq first (no rate limits)
    try:
        stooq_df = get_stooq_data(symbol, days=days)
        if stooq_df is not None and not stooq_df.empty:
            stooq_df = stooq_df.copy()
            stooq_df['Date'] = pd.to_datetime(stooq_df['Date'])
            stooq_df.set_index('Date', inplace=True)
            cache.set(cache_key, stooq_df, ttl=TickerCache.TTL_HISTORY)
            return stooq_df
    except Exception as e:
        logger.debug(f"Stooq history failed for {symbol}: {e}")

    # Fallback to yfinance
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        if hist is not None and not hist.empty:
            cache.set(cache_key, hist, ttl=TickerCache.TTL_HISTORY)
            return hist
    except Exception as e:
        logger.debug(f"yfinance history failed for {symbol}: {e}")

    return pd.DataFrame()


def get_cached_info(symbol: str) -> Dict[str, Any]:
    """
    Get cached ticker info (fundamentals).

    Args:
        symbol: Stock ticker

    Returns:
        Dict with fundamental data
    """
    cache = get_ticker_cache()
    symbol = normalize_ticker(symbol)
    cache_key = f"info_{symbol}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        if info:
            cache.set(cache_key, info, ttl=TickerCache.TTL_INFO)
            return info
    except Exception as e:
        logger.debug(f"yfinance info failed for {symbol}: {e}")

    return {}


def get_cached_news(symbol: str) -> List[Dict]:
    """
    Get cached news for a ticker.

    Args:
        symbol: Stock ticker

    Returns:
        List of news items
    """
    cache = get_ticker_cache()
    symbol = normalize_ticker(symbol)
    cache_key = f"news_{symbol}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        ticker = yf.Ticker(symbol)
        news = ticker.news or []
        cache.set(cache_key, news, ttl=TickerCache.TTL_NEWS)
        return news
    except Exception as e:
        logger.debug(f"yfinance news failed for {symbol}: {e}")
        return []


def get_cached_calendar(symbol: str) -> Optional[Any]:
    """
    Get cached calendar (earnings dates) for a ticker.

    Args:
        symbol: Stock ticker

    Returns:
        Calendar data or None
    """
    cache = get_ticker_cache()
    symbol = normalize_ticker(symbol)
    cache_key = f"calendar_{symbol}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        ticker = yf.Ticker(symbol)
        calendar = ticker.calendar
        cache.set(cache_key, calendar, ttl=TickerCache.TTL_CALENDAR)
        return calendar
    except Exception as e:
        logger.debug(f"yfinance calendar failed for {symbol}: {e}")
        cache.set(cache_key, None, ttl=TickerCache.TTL_CALENDAR)
        return None


# ============== NEW: Financial Statements ==============

def get_cached_financials(symbol: str) -> Dict[str, Any]:
    """
    Get cached financial statements (balance sheet, income, cash flow).

    This is NEW data not fetched in the original app.py.

    Args:
        symbol: Stock ticker

    Returns:
        Dict with all financial statement data
    """
    cache = get_ticker_cache()
    symbol = normalize_ticker(symbol)
    cache_key = f"financials_{symbol}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    financials = {
        'balance_sheet': None,
        'quarterly_balance_sheet': None,
        'income_stmt': None,
        'quarterly_income_stmt': None,
        'cashflow': None,
        'quarterly_cashflow': None,
        'data_available': False
    }

    try:
        ticker = yf.Ticker(symbol)

        # Balance Sheet
        try:
            financials['balance_sheet'] = ticker.balance_sheet
            financials['quarterly_balance_sheet'] = ticker.quarterly_balance_sheet
        except Exception as e:
            logger.debug(f"Balance sheet failed for {symbol}: {e}")

        # Income Statement
        try:
            financials['income_stmt'] = ticker.income_stmt
            financials['quarterly_income_stmt'] = ticker.quarterly_income_stmt
        except Exception as e:
            logger.debug(f"Income statement failed for {symbol}: {e}")

        # Cash Flow
        try:
            financials['cashflow'] = ticker.cashflow
            financials['quarterly_cashflow'] = ticker.quarterly_cashflow
        except Exception as e:
            logger.debug(f"Cash flow failed for {symbol}: {e}")

        # Check if we got any data
        financials['data_available'] = any([
            financials['balance_sheet'] is not None and not financials['balance_sheet'].empty,
            financials['income_stmt'] is not None and not financials['income_stmt'].empty,
            financials['cashflow'] is not None and not financials['cashflow'].empty,
        ])

        cache.set(cache_key, financials, ttl=TickerCache.TTL_FINANCIALS)
        return financials

    except Exception as e:
        logger.error(f"Failed to fetch financials for {symbol}: {e}")
        cache.set(cache_key, financials, ttl=TickerCache.TTL_CALENDAR)  # Shorter TTL on failure
        return financials


def get_cached_holders(symbol: str) -> Dict[str, Any]:
    """
    Get cached holder information (institutional, major holders).

    This is NEW data not fetched in the original app.py.

    Args:
        symbol: Stock ticker

    Returns:
        Dict with holder data
    """
    cache = get_ticker_cache()
    symbol = normalize_ticker(symbol)
    cache_key = f"holders_{symbol}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    holders = {
        'major_holders': None,
        'institutional_holders': None,
        'mutualfund_holders': None,
        'insider_transactions': None,
        'data_available': False
    }

    try:
        ticker = yf.Ticker(symbol)

        try:
            holders['major_holders'] = ticker.major_holders
        except Exception as e:
            logger.debug(f"Major holders failed for {symbol}: {e}")

        try:
            holders['institutional_holders'] = ticker.institutional_holders
        except Exception as e:
            logger.debug(f"Institutional holders failed for {symbol}: {e}")

        try:
            holders['mutualfund_holders'] = ticker.mutualfund_holders
        except Exception as e:
            logger.debug(f"Mutual fund holders failed for {symbol}: {e}")

        try:
            holders['insider_transactions'] = ticker.insider_transactions
        except Exception as e:
            logger.debug(f"Insider transactions failed for {symbol}: {e}")

        holders['data_available'] = any([
            holders['major_holders'] is not None,
            holders['institutional_holders'] is not None,
        ])

        cache.set(cache_key, holders, ttl=TickerCache.TTL_HOLDERS)
        return holders

    except Exception as e:
        logger.error(f"Failed to fetch holders for {symbol}: {e}")
        cache.set(cache_key, holders, ttl=TickerCache.TTL_CALENDAR)
        return holders


def get_cached_recommendations(symbol: str) -> Optional[pd.DataFrame]:
    """
    Get cached analyst recommendations.

    Args:
        symbol: Stock ticker

    Returns:
        DataFrame with analyst recommendations or None
    """
    cache = get_ticker_cache()
    symbol = normalize_ticker(symbol)
    cache_key = f"recommendations_{symbol}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        ticker = yf.Ticker(symbol)
        recommendations = ticker.recommendations
        cache.set(cache_key, recommendations, ttl=TickerCache.TTL_INFO)
        return recommendations
    except Exception as e:
        logger.debug(f"Recommendations failed for {symbol}: {e}")
        return None


# ============== Aggregated Data Fetch ==============

def get_all_stock_data(symbol: str) -> Dict[str, Any]:
    """
    Fetch all available data for a stock in one call.

    This aggregates all data needed for the 5-layer analysis.

    Args:
        symbol: Stock ticker

    Returns:
        Dict with all data types
    """
    symbol = normalize_ticker(symbol)

    data = {
        'ticker': symbol,
        'timestamp': datetime.now().isoformat(),
        'history': get_cached_history(symbol, period="1y"),
        'info': get_cached_info(symbol),
        'news': get_cached_news(symbol),
        'calendar': get_cached_calendar(symbol),
        'financials': get_cached_financials(symbol),
        'holders': get_cached_holders(symbol),
        'recommendations': get_cached_recommendations(symbol),
    }

    # Extract current price
    if not data['history'].empty:
        data['current_price'] = data['history']['Close'].iloc[-1]
    elif data['info']:
        data['current_price'] = data['info'].get('currentPrice') or data['info'].get('regularMarketPrice', 0)
    else:
        data['current_price'] = 0

    return data


# ============== Market Data ==============

def get_vix() -> float:
    """Get current VIX (volatility index) value."""
    try:
        vix_data = get_cached_history("^VIX", period="5d")
        if not vix_data.empty:
            return vix_data['Close'].iloc[-1]
    except Exception as e:
        logger.debug(f"VIX fetch failed: {e}")
    return 20.0  # Default moderate VIX


def get_market_data() -> Dict[str, Any]:
    """
    Get key market indicators for regime detection.

    Returns:
        Dict with SPY, QQQ, IWM, VIX data
    """
    cache = get_ticker_cache()
    cache_key = "market_data_aggregate"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    market_data = {
        'vix': get_vix(),
        'spy': {},
        'qqq': {},
        'iwm': {},
        'timestamp': datetime.now().isoformat()
    }

    for symbol in ['SPY', 'QQQ', 'IWM']:
        try:
            hist = get_cached_history(symbol, period="6mo")
            if not hist.empty:
                close = hist['Close']
                market_data[symbol.lower()] = {
                    'price': close.iloc[-1],
                    'sma_20': close.rolling(20).mean().iloc[-1],
                    'sma_50': close.rolling(50).mean().iloc[-1],
                    'sma_200': close.rolling(200).mean().iloc[-1] if len(close) >= 200 else close.mean(),
                    'change_1d': (close.iloc[-1] / close.iloc[-2] - 1) * 100 if len(close) > 1 else 0,
                    'change_1m': (close.iloc[-1] / close.iloc[-20] - 1) * 100 if len(close) >= 20 else 0,
                }
        except Exception as e:
            logger.debug(f"Market data fetch failed for {symbol}: {e}")

    cache.set(cache_key, market_data, ttl=TickerCache.TTL_MARKET)
    return market_data
