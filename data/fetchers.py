"""
StockPulse Data Fetchers - Functions to fetch and cache financial data

Primary source: Stooq (no rate limits)
Secondary source: yfinance (rate limited)
"""

import yfinance as yf
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import StringIO
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import logging
import os

from .cache import get_ticker_cache, TickerCache

logger = logging.getLogger(__name__)

_FETCH_WORKERS = max(1, min(int(os.environ.get('STOCKPULSE_FETCH_WORKERS', '6')), 8))
_FETCH_EXECUTOR = ThreadPoolExecutor(
    max_workers=_FETCH_WORKERS,
    thread_name_prefix='stockpulse-fetch',
)
_HTTP_SESSION = requests.Session()
_HTTP_SESSION.headers.update({'User-Agent': 'StockPulse/3.0'})
_HTTP_SESSION.mount(
    'https://',
    HTTPAdapter(
        pool_connections=_FETCH_WORKERS,
        pool_maxsize=_FETCH_WORKERS * 2,
        max_retries=Retry(
            total=2,
            backoff_factor=0.25,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=frozenset({'GET'}),
        ),
    ),
)


def _utc_now_iso() -> str:
    """Return an unambiguous, timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc).isoformat()


# ============== Helper Functions ==============

def _payload_available(payload: Any) -> bool:
    """Return True when a fetched payload contains usable data."""
    if payload is None:
        return False
    if isinstance(payload, pd.DataFrame):
        return not payload.empty
    if isinstance(payload, dict):
        return bool(payload)
    if isinstance(payload, (list, tuple, set)):
        return len(payload) > 0
    if isinstance(payload, (int, float)):
        return payload > 0
    return True


def _source_entry(name: str, source: str, payload: Any, error: Optional[str] = None, stale: bool = False) -> Dict[str, Any]:
    """Build normalized metadata for a fetched input."""
    return {
        'name': name,
        'available': _payload_available(payload),
        'source': source,
        'fetched_at': _utc_now_iso(),
        'stale': stale,
        'error': error,
    }

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


def classify_instrument(symbol: str, info: Optional[Dict[str, Any]] = None) -> str:
    """Classify a symbol into equity, etf, index, or unknown."""
    symbol = normalize_ticker(symbol)
    info = info or {}

    if symbol.startswith('^'):
        return 'index'

    quote_type = str(info.get('quoteType', '')).lower()
    if quote_type in {'etf', 'mutualfund'}:
        return 'etf'
    if quote_type == 'index':
        return 'index'
    if quote_type in {'equity', 'stock'}:
        return 'equity'
    if info.get('fundFamily'):
        return 'etf'
    if info.get('sector') or info.get('marketCap'):
        return 'equity'
    return 'unknown'


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
    def load() -> Optional[pd.DataFrame]:
        # Stooq symbol mapping
        stooq_symbol = symbol.upper()
        if not stooq_symbol.startswith('^'):
            if not stooq_symbol.endswith('.US'):
                stooq_symbol = f"{stooq_symbol}.US"

        url = f'https://stooq.com/q/d/l/?s={stooq_symbol}&i=d'
        response = _HTTP_SESSION.get(url, timeout=(3.05, 10))

        if response.status_code == 200 and len(response.text) > 50:
            df = pd.read_csv(StringIO(response.text))
            if not df.empty and 'Close' in df.columns:
                df = df.tail(days)
                return df
        return None

    try:
        return cache.get_or_load(
            cache_key,
            load,
            ttl=TickerCache.TTL_QUOTE,
        )
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
    def load() -> pd.DataFrame:
        period_days = {
            '1d': 1, '2d': 2, '5d': 5, '1mo': 30, '3mo': 90,
            '6mo': 180, '1y': 365, '2y': 730, '5y': 1825,
        }
        days = period_days.get(period, 365)

        try:
            stooq_df = get_stooq_data(symbol, days=days)
            if stooq_df is not None and not stooq_df.empty:
                stooq_df = stooq_df.copy()
                stooq_df['Date'] = pd.to_datetime(stooq_df['Date'])
                stooq_df.set_index('Date', inplace=True)
                return stooq_df
        except Exception as e:
            logger.debug(f"Stooq history failed for {symbol}: {e}")

        try:
            hist = yf.Ticker(symbol).history(period=period)
            if hist is not None and not hist.empty:
                return hist
        except Exception as e:
            logger.debug(f"yfinance history failed for {symbol}: {e}")
        return pd.DataFrame()

    return cache.get_or_load(cache_key, load, ttl=TickerCache.TTL_HISTORY)


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
    def load() -> Dict[str, Any]:
        try:
            return yf.Ticker(symbol).info or {}
        except Exception as e:
            logger.debug(f"yfinance info failed for {symbol}: {e}")
            return {}

    return cache.get_or_load(cache_key, load, ttl=TickerCache.TTL_INFO)


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
    def load() -> List[Dict]:
        try:
            return yf.Ticker(symbol).news or []
        except Exception as e:
            logger.debug(f"yfinance news failed for {symbol}: {e}")
            return []

    return cache.get_or_load(cache_key, load, ttl=TickerCache.TTL_NEWS)


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
    def load() -> Optional[Any]:
        try:
            return yf.Ticker(symbol).calendar
        except Exception as e:
            logger.debug(f"yfinance calendar failed for {symbol}: {e}")
            return None

    # ``get_or_load`` can cache None, so provider failures are coalesced instead
    # of being retried by every analysis layer for the next 30 minutes.
    return cache.get_or_load(cache_key, load, ttl=TickerCache.TTL_CALENDAR)


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

def _load_all_stock_data(symbol: str) -> Dict[str, Any]:
    """
    Fetch all available data for a stock in one call.

    This aggregates all data needed for the 5-layer analysis.

    Args:
        symbol: Stock ticker

    Returns:
        Dict with all data types
    """
    symbol = normalize_ticker(symbol)

    jobs = {
        'history': lambda: get_cached_history(symbol, period="1y"),
        'info': lambda: get_cached_info(symbol),
        'news': lambda: get_cached_news(symbol),
        'calendar': lambda: get_cached_calendar(symbol),
        'financials': lambda: get_cached_financials(symbol),
        'holders': lambda: get_cached_holders(symbol),
        'recommendations': lambda: get_cached_recommendations(symbol),
    }
    defaults = {
        'history': pd.DataFrame(),
        'info': {},
        'news': [],
        'calendar': None,
        'financials': {'data_available': False},
        'holders': {'data_available': False},
        'recommendations': None,
    }
    results: Dict[str, Any] = dict(defaults)
    futures = {_FETCH_EXECUTOR.submit(job): name for name, job in jobs.items()}
    for future in as_completed(futures):
        name = futures[future]
        try:
            results[name] = future.result()
        except Exception as exc:
            logger.debug("%s fetch failed for %s: %s", name, symbol, exc)

    history = results['history']
    info = results['info']
    news = results['news']
    calendar = results['calendar']
    financials = results['financials']
    holders = results['holders']
    recommendations = results['recommendations']

    current_price = None
    if _payload_available(history):
        current_price = float(history['Close'].iloc[-1])
    elif info:
        current_price = info.get('currentPrice') or info.get('regularMarketPrice')

    sources = {
        'history': _source_entry('history', 'stooq/yfinance', history, None if _payload_available(history) else 'history_unavailable'),
        'info': _source_entry('info', 'yfinance', info, None if _payload_available(info) else 'info_unavailable'),
        'news': _source_entry('news', 'yfinance', news, None if _payload_available(news) else 'news_unavailable'),
        'calendar': _source_entry('calendar', 'yfinance', calendar, None if _payload_available(calendar) else 'calendar_unavailable'),
        'financials': _source_entry(
            'financials',
            'yfinance',
            financials if financials.get('data_available') else None,
            None if financials.get('data_available') else 'financials_unavailable'
        ),
        'holders': _source_entry(
            'holders',
            'yfinance',
            holders if holders.get('data_available') else None,
            None if holders.get('data_available') else 'holders_unavailable'
        ),
        'recommendations': _source_entry(
            'recommendations',
            'yfinance',
            recommendations,
            None if _payload_available(recommendations) else 'recommendations_unavailable'
        ),
        'quote': _source_entry(
            'quote',
            'history/info',
            current_price,
            None if current_price is not None else 'quote_unavailable'
        ),
    }

    return {
        'ticker': symbol,
        'timestamp': _utc_now_iso(),
        'history': history,
        'info': info,
        'news': news,
        'calendar': calendar,
        'financials': financials,
        'holders': holders,
        'recommendations': recommendations,
        'current_price': current_price,
        'sources': sources,
        'sources_checked': list(sources.keys()),
        'instrument_type': classify_instrument(symbol, info),
        'stale_inputs': [name for name, meta in sources.items() if meta.get('stale')],
        'missing_inputs': [name for name, meta in sources.items() if not meta.get('available')],
    }


def get_all_stock_data(symbol: str) -> Dict[str, Any]:
    """Return the canonical aggregate, coalescing whole-stock fetches.

    Individual inputs keep their longer type-specific TTLs. The shorter
    aggregate TTL keeps generated metadata current while avoiding repeated
    analyzer fan-out across snapshot, screener and detail requests.
    """
    symbol = normalize_ticker(symbol)
    return get_ticker_cache().get_or_load(
        f'all_stock_data_{symbol}',
        lambda: _load_all_stock_data(symbol),
        ttl=TickerCache.TTL_QUOTE,
    )


# ============== Market Data ==============

def get_vix() -> Optional[float]:
    """Get current VIX (volatility index) value."""
    try:
        vix_data = get_cached_history("^VIX", period="5d")
        if not vix_data.empty:
            return vix_data['Close'].iloc[-1]
    except Exception as e:
        logger.debug(f"VIX fetch failed: {e}")
    return None


def _load_market_data() -> Dict[str, Any]:
    """
    Get key market indicators for regime detection.

    Returns:
        Dict with SPY, QQQ, IWM, VIX data
    """
    tracked_symbols = ['SPY', 'QQQ', 'IWM', 'RSP', 'XLY', 'XLP', 'HYG', 'TLT']
    histories: Dict[str, pd.DataFrame] = {}
    futures = {
        _FETCH_EXECUTOR.submit(get_cached_history, symbol, "6mo"): symbol
        for symbol in tracked_symbols
    }
    vix_future = _FETCH_EXECUTOR.submit(get_vix)
    for future in as_completed(futures):
        symbol = futures[future]
        try:
            histories[symbol] = future.result()
        except Exception as exc:
            logger.debug("Market history fetch failed for %s: %s", symbol, exc)
            histories[symbol] = pd.DataFrame()
    try:
        vix = vix_future.result()
    except Exception as exc:
        logger.debug("VIX fetch failed: %s", exc)
        vix = None

    market_data = {
        'vix': vix,
        'spy': {},
        'qqq': {},
        'iwm': {},
        'rsp': {},
        'xly': {},
        'xlp': {},
        'hyg': {},
        'tlt': {},
        'timestamp': _utc_now_iso(),
        'sources': {
            'vix': _source_entry('vix', 'stooq/yfinance', vix, None if vix is not None else 'vix_unavailable'),
        },
    }

    for symbol in tracked_symbols:
        try:
            hist = histories.get(symbol, pd.DataFrame())
            if not hist.empty:
                close = hist['Close']
                sma_20 = close.rolling(20).mean().iloc[-1] if len(close) >= 20 else close.mean()
                sma_50 = close.rolling(50).mean().iloc[-1] if len(close) >= 50 else close.mean()
                sma_200 = close.rolling(200).mean().iloc[-1] if len(close) >= 200 else close.mean()
                market_data[symbol.lower()] = {
                    'price': close.iloc[-1],
                    'sma_20': sma_20,
                    'sma_50': sma_50,
                    'sma_200': sma_200,
                    'change_1d': (close.iloc[-1] / close.iloc[-2] - 1) * 100 if len(close) > 1 else 0,
                    'change_1m': (close.iloc[-1] / close.iloc[-20] - 1) * 100 if len(close) >= 20 else 0,
                    'above_50dma': bool(close.iloc[-1] > sma_50) if sma_50 else False,
                    'above_200dma': bool(close.iloc[-1] > sma_200) if sma_200 else False,
                }
                market_data['sources'][symbol.lower()] = _source_entry(symbol.lower(), 'stooq/yfinance', hist)
            else:
                market_data['sources'][symbol.lower()] = _source_entry(symbol.lower(), 'stooq/yfinance', hist, f'{symbol.lower()}_unavailable')
        except Exception as e:
            logger.debug(f"Market data fetch failed for {symbol}: {e}")
            market_data['sources'][symbol.lower()] = _source_entry(symbol.lower(), 'stooq/yfinance', None, str(e))

    breadth_components = [market_data.get(key, {}) for key in ['spy', 'qqq', 'iwm', 'rsp']]
    breadth_scores = [
        1.0 if component.get('above_50dma') else 0.0
        for component in breadth_components
        if component
    ]
    if breadth_scores:
        market_data['breadth'] = round((sum(breadth_scores) / len(breadth_scores)) * 100, 1)

    market_data['risk_proxies'] = {
        'small_vs_large': (market_data.get('iwm', {}).get('change_1m', 0) - market_data.get('spy', {}).get('change_1m', 0)),
        'equal_weight_vs_cap_weight': (market_data.get('rsp', {}).get('change_1m', 0) - market_data.get('spy', {}).get('change_1m', 0)),
        'consumer_discretionary_vs_staples': (market_data.get('xly', {}).get('change_1m', 0) - market_data.get('xlp', {}).get('change_1m', 0)),
        'credit_vs_duration': (market_data.get('hyg', {}).get('change_1m', 0) - market_data.get('tlt', {}).get('change_1m', 0)),
    }

    try:
        from data.economic_calendar import get_economic_context
        economic_context = get_economic_context()
        market_data['economic_context'] = economic_context
        market_data['sources']['economic_context'] = _source_entry(
            'economic_context',
            'fred',
            economic_context if getattr(economic_context, 'api_available', False) else None,
            getattr(economic_context, 'error', None)
        )
    except Exception as e:
        logger.debug(f"Economic context fetch failed: {e}")
        market_data['economic_context'] = None
        market_data['sources']['economic_context'] = _source_entry('economic_context', 'fred', None, str(e))

    return market_data


def get_market_data() -> Dict[str, Any]:
    """Return coalesced market-regime inputs for all analysis requests."""
    return get_ticker_cache().get_or_load(
        'market_data_aggregate',
        _load_market_data,
        ttl=TickerCache.TTL_MARKET,
    )
