"""
Backtesting Engine

Tracks historical scores and validates prediction accuracy.
Critical for understanding if the scoring algorithm actually works.

Key metrics:
- Hit rate: % of correct directional predictions
- Avg return by signal: How each recommendation performs
- Sharpe ratio: Risk-adjusted returns
- Max drawdown: Worst peak-to-trough decline

Storage: SQLite (lightweight, no setup required)
"""

import sqlite3
import logging
import os
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from contextlib import contextmanager
import statistics

logger = logging.getLogger(__name__)

# Database configuration
DB_PATH = os.environ.get('BACKTEST_DB_PATH', 'data/backtest.db')


@dataclass
class ScoreRecord:
    """A single score recording"""
    ticker: str
    score: float
    recommendation: str  # STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
    price_at_scoring: float
    timestamp: datetime
    id: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'ticker': self.ticker,
            'score': round(self.score, 1),
            'recommendation': self.recommendation,
            'price_at_scoring': round(self.price_at_scoring, 2),
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        }


@dataclass
class ValidationResult:
    """Result of validating a single prediction"""
    ticker: str
    score: float
    recommendation: str
    price_at_scoring: float
    price_current: float
    return_pct: float
    days_held: int
    correct: bool  # Direction correct?
    timestamp: datetime

    def to_dict(self) -> Dict[str, Any]:
        return {
            'ticker': self.ticker,
            'score': round(self.score, 1),
            'recommendation': self.recommendation,
            'price_at_scoring': round(self.price_at_scoring, 2),
            'price_current': round(self.price_current, 2),
            'return_pct': round(self.return_pct, 2),
            'days_held': self.days_held,
            'correct': self.correct,
            'timestamp': self.timestamp.strftime('%Y-%m-%d'),
        }


@dataclass
class BacktestResult:
    """Comprehensive backtest performance report"""
    period: str  # '1W', '1M', '3M', '6M', 'ALL'
    total_signals: int
    strong_buy_count: int = 0
    buy_count: int = 0
    hold_count: int = 0
    sell_count: int = 0
    strong_sell_count: int = 0
    hit_rate: float = 0.0  # % of correct directional predictions
    avg_return_strong_buy: float = 0.0
    avg_return_buy: float = 0.0
    avg_return_hold: float = 0.0
    avg_return_sell: float = 0.0
    avg_return_strong_sell: float = 0.0
    overall_avg_return: float = 0.0
    sharpe_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    win_rate_by_recommendation: Dict[str, float] = field(default_factory=dict)
    validated_predictions: List[ValidationResult] = field(default_factory=list)
    data_start: Optional[datetime] = None
    data_end: Optional[datetime] = None
    confidence: float = 0.5
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'period': self.period,
            'total_signals': self.total_signals,
            'signal_counts': {
                'strong_buy': self.strong_buy_count,
                'buy': self.buy_count,
                'hold': self.hold_count,
                'sell': self.sell_count,
                'strong_sell': self.strong_sell_count,
            },
            'hit_rate': round(self.hit_rate * 100, 1),
            'avg_returns': {
                'strong_buy': round(self.avg_return_strong_buy, 2),
                'buy': round(self.avg_return_buy, 2),
                'hold': round(self.avg_return_hold, 2),
                'sell': round(self.avg_return_sell, 2),
                'strong_sell': round(self.avg_return_strong_sell, 2),
                'overall': round(self.overall_avg_return, 2),
            },
            'sharpe_ratio': round(self.sharpe_ratio, 2) if self.sharpe_ratio else None,
            'max_drawdown': round(self.max_drawdown, 2) if self.max_drawdown else None,
            'win_rate_by_recommendation': {
                k: round(v * 100, 1) for k, v in self.win_rate_by_recommendation.items()
            },
            'recent_validations': [v.to_dict() for v in self.validated_predictions[:20]],
            'data_start': self.data_start.strftime('%Y-%m-%d') if self.data_start else None,
            'data_end': self.data_end.strftime('%Y-%m-%d') if self.data_end else None,
            'confidence': round(self.confidence, 2),
            'error': self.error,
        }


class Backtester:
    """
    Tracks and validates scoring algorithm performance.

    Records scores when generated, then validates them against
    actual price movements to calculate hit rate and returns.
    """

    # Map score to recommendation
    SCORE_TO_RECOMMENDATION = {
        (75, 100): 'STRONG_BUY',
        (60, 74): 'BUY',
        (45, 59): 'HOLD',
        (30, 44): 'SELL',
        (0, 29): 'STRONG_SELL',
    }

    # Expected direction for each recommendation
    EXPECTED_DIRECTION = {
        'STRONG_BUY': 'up',
        'BUY': 'up',
        'HOLD': 'neutral',
        'SELL': 'down',
        'STRONG_SELL': 'down',
    }

    def __init__(self, db_path: str = None):
        self.db_path = db_path or DB_PATH
        self._ensure_db_exists()

    def _ensure_db_exists(self):
        """Create database and tables if they don't exist."""
        # Ensure directory exists
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS score_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    score REAL NOT NULL,
                    recommendation TEXT NOT NULL,
                    price_at_scoring REAL NOT NULL,
                    timestamp DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_ticker_timestamp
                ON score_history (ticker, timestamp)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_timestamp
                ON score_history (timestamp)
            ''')
            conn.commit()

    @contextmanager
    def _get_connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _score_to_recommendation(self, score: float) -> str:
        """Convert numeric score to recommendation string."""
        for (low, high), rec in self.SCORE_TO_RECOMMENDATION.items():
            if low <= score <= high:
                return rec
        return 'HOLD'

    def record_score(
        self,
        ticker: str,
        score: float,
        price: float,
        timestamp: datetime = None
    ) -> ScoreRecord:
        """
        Record a score for later validation.

        Args:
            ticker: Stock symbol
            score: Investment score (0-100)
            price: Current stock price at scoring time
            timestamp: When the score was generated (default: now)

        Returns:
            ScoreRecord with assigned ID
        """
        ticker = ticker.upper()
        timestamp = timestamp or datetime.now()
        recommendation = self._score_to_recommendation(score)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO score_history (ticker, score, recommendation, price_at_scoring, timestamp)
                VALUES (?, ?, ?, ?, ?)
            ''', (ticker, score, recommendation, price, timestamp))
            conn.commit()
            record_id = cursor.lastrowid

        logger.info(f"Recorded score for {ticker}: {score} ({recommendation}) at ${price:.2f}")

        return ScoreRecord(
            id=record_id,
            ticker=ticker,
            score=score,
            recommendation=recommendation,
            price_at_scoring=price,
            timestamp=timestamp,
        )

    def get_historical_scores(
        self,
        ticker: str = None,
        days: int = 90,
        limit: int = 100
    ) -> List[ScoreRecord]:
        """
        Retrieve historical score records.

        Args:
            ticker: Filter by ticker (optional)
            days: Look back period
            limit: Maximum records to return

        Returns:
            List of ScoreRecords
        """
        cutoff = datetime.now() - timedelta(days=days)

        with self._get_connection() as conn:
            cursor = conn.cursor()

            if ticker:
                cursor.execute('''
                    SELECT id, ticker, score, recommendation, price_at_scoring, timestamp
                    FROM score_history
                    WHERE ticker = ? AND timestamp >= ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                ''', (ticker.upper(), cutoff, limit))
            else:
                cursor.execute('''
                    SELECT id, ticker, score, recommendation, price_at_scoring, timestamp
                    FROM score_history
                    WHERE timestamp >= ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                ''', (cutoff, limit))

            records = []
            for row in cursor.fetchall():
                records.append(ScoreRecord(
                    id=row['id'],
                    ticker=row['ticker'],
                    score=row['score'],
                    recommendation=row['recommendation'],
                    price_at_scoring=row['price_at_scoring'],
                    timestamp=datetime.strptime(row['timestamp'], '%Y-%m-%d %H:%M:%S'),
                ))

        return records

    def _get_current_price(self, ticker: str) -> Optional[float]:
        """Get current price for a ticker using yfinance."""
        try:
            import yfinance as yf
            stock = yf.Ticker(ticker)
            hist = stock.history(period='1d')
            if hist.empty:
                return None
            return float(hist['Close'].iloc[-1])
        except Exception as e:
            logger.warning(f"Failed to get current price for {ticker}: {e}")
            return None

    def _is_prediction_correct(
        self,
        recommendation: str,
        return_pct: float,
        threshold: float = 0.5
    ) -> bool:
        """
        Determine if a prediction was correct based on actual return.

        Args:
            recommendation: The recommendation made
            return_pct: Actual return percentage
            threshold: Minimum move % to count as directional (default 0.5%)

        Returns:
            True if prediction direction was correct
        """
        expected = self.EXPECTED_DIRECTION.get(recommendation, 'neutral')

        if expected == 'up':
            return return_pct > threshold
        elif expected == 'down':
            return return_pct < -threshold
        else:  # neutral
            return abs(return_pct) <= threshold * 2

    def validate_predictions(
        self,
        days: int = 30,
        min_holding_days: int = 5
    ) -> List[ValidationResult]:
        """
        Validate past predictions against actual price movements.

        Args:
            days: Look back period for predictions
            min_holding_days: Minimum days a prediction must be held

        Returns:
            List of ValidationResults
        """
        # Get predictions from the specified period
        end_date = datetime.now() - timedelta(days=min_holding_days)
        start_date = end_date - timedelta(days=days)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT DISTINCT ticker, score, recommendation, price_at_scoring, timestamp
                FROM score_history
                WHERE timestamp >= ? AND timestamp <= ?
                ORDER BY timestamp DESC
            ''', (start_date, end_date))

            validations = []
            seen_tickers = set()

            for row in cursor.fetchall():
                ticker = row['ticker']

                # Only validate most recent prediction per ticker
                if ticker in seen_tickers:
                    continue
                seen_tickers.add(ticker)

                # Get current price
                current_price = self._get_current_price(ticker)
                if current_price is None:
                    continue

                price_at_scoring = row['price_at_scoring']
                if price_at_scoring <= 0:
                    continue

                return_pct = ((current_price / price_at_scoring) - 1) * 100
                timestamp = datetime.strptime(row['timestamp'], '%Y-%m-%d %H:%M:%S')
                days_held = (datetime.now() - timestamp).days

                correct = self._is_prediction_correct(row['recommendation'], return_pct)

                validations.append(ValidationResult(
                    ticker=ticker,
                    score=row['score'],
                    recommendation=row['recommendation'],
                    price_at_scoring=price_at_scoring,
                    price_current=current_price,
                    return_pct=return_pct,
                    days_held=days_held,
                    correct=correct,
                    timestamp=timestamp,
                ))

        return validations

    def _calculate_sharpe_ratio(
        self,
        returns: List[float],
        risk_free_rate: float = 0.05
    ) -> Optional[float]:
        """
        Calculate Sharpe ratio for a list of returns.

        Args:
            returns: List of return percentages
            risk_free_rate: Annual risk-free rate (default 5%)

        Returns:
            Annualized Sharpe ratio or None if insufficient data
        """
        if len(returns) < 2:
            return None

        try:
            avg_return = statistics.mean(returns)
            std_return = statistics.stdev(returns)

            if std_return == 0:
                return None

            # Assume average holding period of 20 trading days
            periods_per_year = 252 / 20

            # Annualize
            annual_return = avg_return * periods_per_year
            annual_std = std_return * (periods_per_year ** 0.5)
            annual_rf = risk_free_rate * 100  # Convert to percentage

            sharpe = (annual_return - annual_rf) / annual_std
            return sharpe

        except Exception:
            return None

    def _calculate_max_drawdown(self, returns: List[float]) -> Optional[float]:
        """
        Calculate maximum drawdown from a list of returns.

        Args:
            returns: List of return percentages (chronological order)

        Returns:
            Maximum drawdown percentage or None
        """
        if not returns:
            return None

        try:
            # Convert returns to cumulative equity curve (starting at 100)
            equity = 100
            equity_curve = [equity]

            for ret in returns:
                equity *= (1 + ret / 100)
                equity_curve.append(equity)

            # Calculate drawdowns
            max_dd = 0
            peak = equity_curve[0]

            for value in equity_curve:
                if value > peak:
                    peak = value
                dd = (peak - value) / peak * 100
                if dd > max_dd:
                    max_dd = dd

            return max_dd

        except Exception:
            return None

    def get_performance_report(
        self,
        period: str = '1M',
        min_holding_days: int = 5
    ) -> BacktestResult:
        """
        Generate comprehensive performance report.

        Args:
            period: Time period ('1W', '1M', '3M', '6M', 'ALL')
            min_holding_days: Minimum holding period for validation

        Returns:
            BacktestResult with all metrics
        """
        # Convert period to days
        period_days = {
            '1W': 7,
            '1M': 30,
            '3M': 90,
            '6M': 180,
            'ALL': 365 * 5,  # 5 years max
        }.get(period, 30)

        try:
            # Get all predictions in period
            validations = self.validate_predictions(
                days=period_days,
                min_holding_days=min_holding_days
            )

            if not validations:
                return BacktestResult(
                    period=period,
                    total_signals=0,
                    confidence=0.1,
                    error="No validated predictions found for this period"
                )

            # Group by recommendation
            by_rec = {
                'STRONG_BUY': [],
                'BUY': [],
                'HOLD': [],
                'SELL': [],
                'STRONG_SELL': [],
            }

            for v in validations:
                if v.recommendation in by_rec:
                    by_rec[v.recommendation].append(v)

            # Calculate metrics
            total_correct = sum(1 for v in validations if v.correct)
            hit_rate = total_correct / len(validations) if validations else 0

            def avg_return(results: List[ValidationResult]) -> float:
                if not results:
                    return 0.0
                return statistics.mean(v.return_pct for v in results)

            def win_rate(results: List[ValidationResult]) -> float:
                if not results:
                    return 0.0
                return sum(1 for v in results if v.correct) / len(results)

            # Get all returns for overall metrics
            all_returns = [v.return_pct for v in validations]

            # Get date range
            timestamps = [v.timestamp for v in validations]
            data_start = min(timestamps) if timestamps else None
            data_end = max(timestamps) if timestamps else None

            # Calculate confidence based on sample size
            confidence = min(0.9, 0.3 + (len(validations) * 0.01))

            return BacktestResult(
                period=period,
                total_signals=len(validations),
                strong_buy_count=len(by_rec['STRONG_BUY']),
                buy_count=len(by_rec['BUY']),
                hold_count=len(by_rec['HOLD']),
                sell_count=len(by_rec['SELL']),
                strong_sell_count=len(by_rec['STRONG_SELL']),
                hit_rate=hit_rate,
                avg_return_strong_buy=avg_return(by_rec['STRONG_BUY']),
                avg_return_buy=avg_return(by_rec['BUY']),
                avg_return_hold=avg_return(by_rec['HOLD']),
                avg_return_sell=avg_return(by_rec['SELL']),
                avg_return_strong_sell=avg_return(by_rec['STRONG_SELL']),
                overall_avg_return=statistics.mean(all_returns) if all_returns else 0,
                sharpe_ratio=self._calculate_sharpe_ratio(all_returns),
                max_drawdown=self._calculate_max_drawdown(all_returns),
                win_rate_by_recommendation={
                    'STRONG_BUY': win_rate(by_rec['STRONG_BUY']),
                    'BUY': win_rate(by_rec['BUY']),
                    'HOLD': win_rate(by_rec['HOLD']),
                    'SELL': win_rate(by_rec['SELL']),
                    'STRONG_SELL': win_rate(by_rec['STRONG_SELL']),
                },
                validated_predictions=sorted(validations, key=lambda x: x.timestamp, reverse=True),
                data_start=data_start,
                data_end=data_end,
                confidence=confidence,
            )

        except Exception as e:
            logger.error(f"Error generating performance report: {e}")
            return BacktestResult(
                period=period,
                total_signals=0,
                confidence=0.1,
                error=str(e),
            )

    def get_ticker_history(self, ticker: str, limit: int = 50) -> List[Dict]:
        """
        Get scoring history for a specific ticker.

        Args:
            ticker: Stock symbol
            limit: Maximum records

        Returns:
            List of score records as dicts
        """
        records = self.get_historical_scores(ticker=ticker, days=365, limit=limit)
        return [r.to_dict() for r in records]

    def clear_old_records(self, days: int = 365):
        """
        Remove records older than specified days.

        Args:
            days: Records older than this will be deleted
        """
        cutoff = datetime.now() - timedelta(days=days)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM score_history
                WHERE timestamp < ?
            ''', (cutoff,))
            deleted = cursor.rowcount
            conn.commit()

        logger.info(f"Cleared {deleted} records older than {days} days")
        return deleted


# Singleton instance
_backtester = None


def get_backtester() -> Backtester:
    """Get the singleton backtester instance."""
    global _backtester
    if _backtester is None:
        _backtester = Backtester()
    return _backtester


def record_score(ticker: str, score: float, price: float) -> ScoreRecord:
    """
    Record a score for backtesting.

    Args:
        ticker: Stock symbol
        score: Investment score (0-100)
        price: Current stock price

    Returns:
        ScoreRecord
    """
    return get_backtester().record_score(ticker, score, price)


def get_performance_report(period: str = '1M') -> BacktestResult:
    """
    Get backtesting performance report.

    Args:
        period: Time period ('1W', '1M', '3M', '6M', 'ALL')

    Returns:
        BacktestResult
    """
    return get_backtester().get_performance_report(period)
