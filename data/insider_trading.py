"""
SEC EDGAR Insider Trading Analyzer

Fetches Form 4 filings (insider transactions) from SEC EDGAR API.
Analyzes insider buying/selling patterns to generate sentiment signals.

Key signals:
- Cluster buying (multiple insiders buying) = strong bullish
- CEO/CFO buying = bullish
- Heavy insider selling = bearish

Data source: https://data.sec.gov (free, no auth required)
Rate limit: 10 requests/second
"""

import requests
import logging
import time
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import re

logger = logging.getLogger(__name__)

# SEC EDGAR API configuration
SEC_BASE_URL = "https://data.sec.gov"
SEC_COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
USER_AGENT = "StockPulse/1.0 (Stock Analysis Tool; contact@example.com)"

# Rate limiting
_last_request_time = 0
_min_request_interval = 0.1  # 10 requests/second max

# Cache for ticker to CIK mapping
_ticker_to_cik_cache = {}


@dataclass
class InsiderTrade:
    """An individual insider transaction"""
    insider_name: str
    title: str  # CEO, CFO, Director, 10% Owner, etc.
    trade_type: str  # 'BUY', 'SELL', 'OPTION_EXERCISE', 'GIFT'
    shares: int
    price: Optional[float]
    value: Optional[float]
    date: datetime
    form_type: str = '4'  # Form 4 is most common

    def to_dict(self) -> Dict[str, Any]:
        return {
            'insider_name': self.insider_name,
            'title': self.title,
            'trade_type': self.trade_type,
            'shares': self.shares,
            'price': round(self.price, 2) if self.price else None,
            'value': round(self.value, 0) if self.value else None,
            'date': self.date.strftime('%Y-%m-%d'),
        }


@dataclass
class InsiderTradingResult:
    """Result from insider trading analysis"""
    ticker: str
    cik: str = ''
    trades_90d: List[InsiderTrade] = field(default_factory=list)
    net_insider_sentiment: str = 'NEUTRAL'  # STRONG_BUY, BUY, NEUTRAL, SELL, STRONG_SELL
    buy_count: int = 0
    sell_count: int = 0
    net_shares: int = 0  # Buys - Sells
    net_value: float = 0.0  # Buy value - Sell value
    cluster_detected: bool = False  # 3+ insiders buying
    executive_buying: bool = False  # CEO or CFO buying
    unique_buyers: int = 0
    unique_sellers: int = 0
    confidence: float = 0.5
    data_date: Optional[datetime] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'ticker': self.ticker,
            'net_sentiment': self.net_insider_sentiment,
            'buy_count': self.buy_count,
            'sell_count': self.sell_count,
            'net_shares': self.net_shares,
            'net_value': round(self.net_value, 0),
            'cluster_detected': self.cluster_detected,
            'executive_buying': self.executive_buying,
            'unique_buyers': self.unique_buyers,
            'unique_sellers': self.unique_sellers,
            'recent_trades': [t.to_dict() for t in self.trades_90d[:10]],
            'confidence': round(self.confidence, 2),
            'data_date': self.data_date.strftime('%Y-%m-%d') if self.data_date else None,
            'error': self.error,
        }


class InsiderTradingAnalyzer:
    """
    Analyzes insider trading patterns using SEC EDGAR data.
    """

    # Titles that indicate executive-level insiders
    EXECUTIVE_TITLES = [
        'ceo', 'chief executive', 'president',
        'cfo', 'chief financial', 'treasurer',
        'coo', 'chief operating',
        'chairman', 'vice chairman',
    ]

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        })

    def _rate_limit(self):
        """Enforce SEC rate limits."""
        global _last_request_time
        elapsed = time.time() - _last_request_time
        if elapsed < _min_request_interval:
            time.sleep(_min_request_interval - elapsed)
        _last_request_time = time.time()

    def _get_cik_for_ticker(self, ticker: str) -> Optional[str]:
        """
        Get the CIK (Central Index Key) for a ticker symbol.
        """
        global _ticker_to_cik_cache

        ticker = ticker.upper()

        # Check cache first
        if ticker in _ticker_to_cik_cache:
            return _ticker_to_cik_cache[ticker]

        # Load company tickers from SEC
        if not _ticker_to_cik_cache:
            try:
                self._rate_limit()
                response = self.session.get(SEC_COMPANY_TICKERS_URL, timeout=10)
                response.raise_for_status()
                data = response.json()

                # Build mapping
                for item in data.values():
                    t = item.get('ticker', '').upper()
                    cik = str(item.get('cik_str', ''))
                    if t and cik:
                        _ticker_to_cik_cache[t] = cik.zfill(10)  # CIK is 10 digits

            except Exception as e:
                logger.warning(f"Failed to load SEC company tickers: {e}")
                return None

        return _ticker_to_cik_cache.get(ticker)

    def _fetch_filings(self, cik: str) -> Optional[Dict]:
        """
        Fetch recent filings for a company from SEC EDGAR.
        """
        try:
            self._rate_limit()
            url = f"{SEC_BASE_URL}/submissions/CIK{cik}.json"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.warning(f"Failed to fetch SEC filings for CIK {cik}: {e}")
            return None

    def _parse_form4_filings(
        self,
        filings_data: Dict,
        days: int = 90
    ) -> List[InsiderTrade]:
        """
        Parse Form 4 filings to extract insider transactions.

        Note: SEC EDGAR submissions endpoint provides filing metadata,
        not the actual transaction details. For full details, we'd need
        to parse the XML files. This simplified version extracts what
        we can from the metadata.
        """
        trades = []
        cutoff_date = datetime.now() - timedelta(days=days)

        try:
            recent = filings_data.get('filings', {}).get('recent', {})

            forms = recent.get('form', [])
            dates = recent.get('filingDate', [])
            accessions = recent.get('accessionNumber', [])
            primary_docs = recent.get('primaryDocument', [])

            for i, form in enumerate(forms):
                # Only process Form 4 (insider ownership changes)
                if form != '4':
                    continue

                if i >= len(dates):
                    continue

                try:
                    filing_date = datetime.strptime(dates[i], '%Y-%m-%d')
                except:
                    continue

                if filing_date < cutoff_date:
                    continue

                # Extract reporting owner from accession
                # Note: Full parsing would require fetching the XML file
                # This is a simplified approximation

                # For now, create a placeholder trade entry
                # In production, you'd fetch and parse the actual Form 4 XML
                trades.append(InsiderTrade(
                    insider_name="Insider",  # Would parse from XML
                    title="Officer/Director",  # Would parse from XML
                    trade_type="UNKNOWN",  # Would parse from XML
                    shares=0,
                    price=None,
                    value=None,
                    date=filing_date,
                    form_type='4'
                ))

        except Exception as e:
            logger.debug(f"Error parsing Form 4 filings: {e}")

        return trades

    def _fetch_insider_data_fallback(self, ticker: str) -> List[InsiderTrade]:
        """
        Fallback method using yfinance insider data if available.
        """
        trades = []
        try:
            import yfinance as yf
            stock = yf.Ticker(ticker)

            # Try to get insider transactions
            insider_txns = stock.insider_transactions
            if insider_txns is not None and not insider_txns.empty:
                cutoff = datetime.now() - timedelta(days=90)

                for _, row in insider_txns.iterrows():
                    try:
                        # Parse date
                        date_val = row.get('Start Date') or row.get('startDate')
                        if date_val is None:
                            continue

                        if hasattr(date_val, 'to_pydatetime'):
                            trade_date = date_val.to_pydatetime()
                        elif isinstance(date_val, str):
                            trade_date = datetime.strptime(date_val[:10], '%Y-%m-%d')
                        else:
                            continue

                        if trade_date.tzinfo:
                            trade_date = trade_date.replace(tzinfo=None)

                        if trade_date < cutoff:
                            continue

                        # Determine trade type
                        txn_text = str(row.get('Text', '') or row.get('Transaction', '')).lower()
                        shares = abs(int(row.get('Shares', 0) or 0))

                        if 'sale' in txn_text or 'sold' in txn_text:
                            trade_type = 'SELL'
                        elif 'purchase' in txn_text or 'bought' in txn_text or 'buy' in txn_text:
                            trade_type = 'BUY'
                        elif 'option' in txn_text or 'exercise' in txn_text:
                            trade_type = 'OPTION_EXERCISE'
                        elif 'gift' in txn_text:
                            trade_type = 'GIFT'
                        else:
                            trade_type = 'OTHER'

                        # Get value
                        value = row.get('Value', 0) or 0
                        price = value / shares if shares > 0 else None

                        insider_name = str(row.get('Insider', '') or row.get('insider', 'Unknown'))
                        title = str(row.get('Position', '') or row.get('Relationship', 'Unknown'))

                        trades.append(InsiderTrade(
                            insider_name=insider_name,
                            title=title,
                            trade_type=trade_type,
                            shares=shares,
                            price=price,
                            value=float(value) if value else None,
                            date=trade_date,
                        ))

                    except Exception as e:
                        logger.debug(f"Error parsing insider row: {e}")
                        continue

        except Exception as e:
            logger.debug(f"yfinance insider fallback failed: {e}")

        return trades

    def _is_executive(self, title: str) -> bool:
        """Check if the insider is an executive (CEO, CFO, etc.)."""
        title_lower = title.lower()
        return any(exec_title in title_lower for exec_title in self.EXECUTIVE_TITLES)

    def _analyze_trades(self, trades: List[InsiderTrade]) -> Dict[str, Any]:
        """
        Analyze the trades to determine sentiment.
        """
        if not trades:
            return {
                'sentiment': 'NEUTRAL',
                'buy_count': 0,
                'sell_count': 0,
                'net_shares': 0,
                'net_value': 0,
                'cluster': False,
                'executive_buying': False,
                'unique_buyers': 0,
                'unique_sellers': 0,
            }

        buyers = set()
        sellers = set()
        buy_shares = 0
        sell_shares = 0
        buy_value = 0
        sell_value = 0
        executive_buying = False

        for trade in trades:
            if trade.trade_type == 'BUY':
                buyers.add(trade.insider_name)
                buy_shares += trade.shares
                buy_value += trade.value or 0
                if self._is_executive(trade.title):
                    executive_buying = True

            elif trade.trade_type == 'SELL':
                sellers.add(trade.insider_name)
                sell_shares += trade.shares
                sell_value += trade.value or 0

        buy_count = len([t for t in trades if t.trade_type == 'BUY'])
        sell_count = len([t for t in trades if t.trade_type == 'SELL'])
        net_shares = buy_shares - sell_shares
        net_value = buy_value - sell_value
        cluster = len(buyers) >= 3

        # Determine sentiment
        if cluster and net_value > 0:
            sentiment = 'STRONG_BUY'
        elif executive_buying and net_value > 0:
            sentiment = 'BUY'
        elif len(buyers) > len(sellers) and net_value > 0:
            sentiment = 'BUY'
        elif len(sellers) > len(buyers) * 2 and net_value < -1000000:
            sentiment = 'STRONG_SELL'
        elif len(sellers) > len(buyers) and net_value < 0:
            sentiment = 'SELL'
        else:
            sentiment = 'NEUTRAL'

        return {
            'sentiment': sentiment,
            'buy_count': buy_count,
            'sell_count': sell_count,
            'net_shares': net_shares,
            'net_value': net_value,
            'cluster': cluster,
            'executive_buying': executive_buying,
            'unique_buyers': len(buyers),
            'unique_sellers': len(sellers),
        }

    def get_insider_trading(
        self,
        ticker: str,
        days: int = 90
    ) -> InsiderTradingResult:
        """
        Get insider trading analysis for a ticker.

        Args:
            ticker: Stock symbol
            days: Number of days to look back (default 90)

        Returns:
            InsiderTradingResult with analysis
        """
        ticker = ticker.upper()
        trades = []

        # Try yfinance first (more reliable for transaction details)
        trades = self._fetch_insider_data_fallback(ticker)

        # If no trades from yfinance, try SEC EDGAR
        if not trades:
            cik = self._get_cik_for_ticker(ticker)
            if cik:
                filings = self._fetch_filings(cik)
                if filings:
                    trades = self._parse_form4_filings(filings, days)

        # Analyze the trades
        analysis = self._analyze_trades(trades)

        # Calculate confidence
        confidence = 0.3
        if trades:
            confidence += min(0.4, len(trades) * 0.05)
            if analysis['cluster']:
                confidence += 0.2
            if analysis['executive_buying']:
                confidence += 0.1

        return InsiderTradingResult(
            ticker=ticker,
            cik=self._get_cik_for_ticker(ticker) or '',
            trades_90d=sorted(trades, key=lambda t: t.date, reverse=True),
            net_insider_sentiment=analysis['sentiment'],
            buy_count=analysis['buy_count'],
            sell_count=analysis['sell_count'],
            net_shares=analysis['net_shares'],
            net_value=analysis['net_value'],
            cluster_detected=analysis['cluster'],
            executive_buying=analysis['executive_buying'],
            unique_buyers=analysis['unique_buyers'],
            unique_sellers=analysis['unique_sellers'],
            confidence=min(0.95, confidence),
            data_date=datetime.now(),
        )


# Singleton instance
_analyzer = None


def get_insider_trading(ticker: str, days: int = 90) -> InsiderTradingResult:
    """
    Get insider trading analysis for a ticker.

    Args:
        ticker: Stock symbol
        days: Number of days to look back

    Returns:
        InsiderTradingResult
    """
    global _analyzer
    if _analyzer is None:
        _analyzer = InsiderTradingAnalyzer()

    return _analyzer.get_insider_trading(ticker, days)
