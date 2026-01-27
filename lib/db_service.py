"""
Database service layer for StockPulse.
Abstracts all Supabase operations from business logic.
All methods degrade gracefully when Supabase is not configured.
"""
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class DatabaseService:
    """Handles all Supabase database operations."""

    def __init__(self):
        from .supabase_client import is_supabase_enabled
        self.enabled = is_supabase_enabled()
        self._client = None

    @property
    def supabase(self):
        if self._client is None and self.enabled:
            from .supabase_client import get_supabase
            self._client = get_supabase()
        return self._client

    # ========== STOCK ANALYSES ==========

    def save_stock_analysis(self, result):
        """Save a stock analysis result to database. Returns analysis ID or None."""
        if not self.enabled:
            return None

        try:
            record = {
                'ticker': result.get('ticker', ''),
                'company_name': result.get('company_name', result.get('ticker', '')),
                'investment_score': result.get('score', 0),
                'technical_score': result.get('technical_score', 0),
                'fundamental_score': result.get('fundamental_score', 0),
                'current_price': result.get('current_price', 0),
                'price_change': result.get('dollar_change'),
                'price_change_pct': result.get('change_pct'),
                'recommendation': result.get('recommendation', 'HOLD'),
                'recommendation_reasons': result.get('evidence', []),
                'technical_analysis': {
                    'indicators': result.get('indicators', {}),
                    'individual_scores': result.get('individual_scores', {}),
                    'signals': result.get('signals', {}),
                },
                'fundamental_analysis': result.get('fundamentals', {}),
                'market_sentiment': result.get('market_sentiment'),
                'news_analysis': result.get('news_analysis'),
                'earnings_data': result.get('earnings'),
                'timestamp': datetime.utcnow().isoformat(),
            }

            resp = self.supabase.table('stock_analyses').insert(record).execute()
            if resp.data:
                logger.info(f"Saved analysis for {record['ticker']}: {resp.data[0]['id']}")
                return resp.data[0]['id']
        except Exception as e:
            logger.error(f"Error saving stock analysis: {e}")

        return None

    def get_latest_analysis(self, ticker, max_age_minutes=60):
        """Get most recent analysis for a ticker, optionally within a max age."""
        if not self.enabled:
            return None

        try:
            resp = (
                self.supabase.table('stock_analyses')
                .select('*')
                .eq('ticker', ticker.upper())
                .order('timestamp', desc=True)
                .limit(1)
                .execute()
            )
            if resp.data:
                return resp.data[0]
        except Exception as e:
            logger.error(f"Error fetching latest analysis for {ticker}: {e}")

        return None

    def get_analysis_history(self, ticker, limit=30):
        """Get analysis score history for a ticker."""
        if not self.enabled:
            return []

        try:
            resp = (
                self.supabase.table('stock_analyses')
                .select('id,ticker,investment_score,technical_score,fundamental_score,current_price,recommendation,timestamp')
                .eq('ticker', ticker.upper())
                .order('timestamp', desc=True)
                .limit(limit)
                .execute()
            )
            return resp.data or []
        except Exception as e:
            logger.error(f"Error fetching analysis history for {ticker}: {e}")
            return []

    # ========== PORTFOLIO & TRADING ==========

    def get_or_create_portfolio(self, user_id):
        """Get user's default portfolio ID or create one. Returns portfolio_id or None."""
        if not self.enabled:
            return None

        try:
            resp = (
                self.supabase.table('portfolios')
                .select('id')
                .eq('user_id', user_id)
                .eq('name', 'Default Portfolio')
                .limit(1)
                .execute()
            )
            if resp.data:
                return resp.data[0]['id']

            new = {
                'user_id': user_id,
                'name': 'Default Portfolio',
                'initial_capital': 100000.00,
                'current_cash': 100000.00,
            }
            resp = self.supabase.table('portfolios').insert(new).execute()
            if resp.data:
                return resp.data[0]['id']
        except Exception as e:
            logger.error(f"Error getting/creating portfolio: {e}")

        return None

    def update_portfolio_cash(self, portfolio_id, cash):
        """Update portfolio cash balance."""
        if not self.enabled:
            return False
        try:
            self.supabase.table('portfolios').update(
                {'current_cash': float(cash)}
            ).eq('id', portfolio_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating portfolio cash: {e}")
            return False

    def save_trade(self, portfolio_id, trade):
        """Save a trade record. Returns trade ID or None."""
        if not self.enabled:
            return None

        try:
            record = {
                'portfolio_id': portfolio_id,
                'ticker': trade['ticker'],
                'trade_type': trade['type'],
                'side': trade.get('side', 'long'),
                'quantity': trade['quantity'],
                'price': trade['price'],
                'value': trade['value'],
                'reasoning': trade.get('reasoning', ''),
                'status': trade.get('status', 'executed'),
                'error': trade.get('error'),
                'is_manual': trade.get('is_manual', False),
                'cash_after': trade.get('cash_after'),
                'executed_at': trade.get('timestamp', datetime.utcnow().isoformat()),
            }
            resp = self.supabase.table('trades').insert(record).execute()
            if resp.data:
                return resp.data[0]['id']
        except Exception as e:
            logger.error(f"Error saving trade: {e}")

        return None

    def upsert_position(self, portfolio_id, ticker, side, quantity, avg_price, human_controlled=False):
        """Create or update a portfolio position."""
        if not self.enabled:
            return False

        try:
            resp = (
                self.supabase.table('portfolio_positions')
                .select('id')
                .eq('portfolio_id', portfolio_id)
                .eq('ticker', ticker)
                .eq('side', side)
                .limit(1)
                .execute()
            )

            if resp.data:
                self.supabase.table('portfolio_positions').update({
                    'quantity': float(quantity),
                    'avg_entry_price': float(avg_price),
                    'human_controlled': human_controlled,
                    'updated_at': datetime.utcnow().isoformat(),
                }).eq('id', resp.data[0]['id']).execute()
            else:
                self.supabase.table('portfolio_positions').insert({
                    'portfolio_id': portfolio_id,
                    'ticker': ticker,
                    'side': side,
                    'quantity': float(quantity),
                    'avg_entry_price': float(avg_price),
                    'entry_date': datetime.utcnow().isoformat(),
                    'human_controlled': human_controlled,
                }).execute()
            return True
        except Exception as e:
            logger.error(f"Error upserting position: {e}")
            return False

    def delete_position(self, portfolio_id, ticker, side):
        """Remove a fully closed position."""
        if not self.enabled:
            return False

        try:
            self.supabase.table('portfolio_positions').delete().eq(
                'portfolio_id', portfolio_id
            ).eq('ticker', ticker).eq('side', side).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting position: {e}")
            return False

    def save_portfolio_snapshot(self, portfolio_id, total_value, cash, positions_value, spy_price=None):
        """Save a portfolio value snapshot."""
        if not self.enabled:
            return False

        try:
            self.supabase.table('portfolio_snapshots').insert({
                'portfolio_id': portfolio_id,
                'total_value': float(total_value),
                'cash': float(cash),
                'positions_value': float(positions_value),
                'spy_price': float(spy_price) if spy_price else None,
                'timestamp': datetime.utcnow().isoformat(),
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Error saving portfolio snapshot: {e}")
            return False

    def get_portfolio_positions(self, portfolio_id):
        """Get all positions for a portfolio."""
        if not self.enabled:
            return []

        try:
            resp = (
                self.supabase.table('portfolio_positions')
                .select('*')
                .eq('portfolio_id', portfolio_id)
                .execute()
            )
            return resp.data or []
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            return []

    def get_trades(self, portfolio_id, limit=50):
        """Get recent trades for a portfolio."""
        if not self.enabled:
            return []

        try:
            resp = (
                self.supabase.table('trades')
                .select('*')
                .eq('portfolio_id', portfolio_id)
                .order('executed_at', desc=True)
                .limit(limit)
                .execute()
            )
            return resp.data or []
        except Exception as e:
            logger.error(f"Error fetching trades: {e}")
            return []

    def get_portfolio_snapshots(self, portfolio_id, limit=100):
        """Get portfolio value history."""
        if not self.enabled:
            return []

        try:
            resp = (
                self.supabase.table('portfolio_snapshots')
                .select('*')
                .eq('portfolio_id', portfolio_id)
                .order('timestamp', desc=True)
                .limit(limit)
                .execute()
            )
            return resp.data or []
        except Exception as e:
            logger.error(f"Error fetching snapshots: {e}")
            return []

    def reset_portfolio(self, portfolio_id):
        """Reset a portfolio to initial state."""
        if not self.enabled:
            return False

        try:
            self.supabase.table('portfolio_positions').delete().eq(
                'portfolio_id', portfolio_id
            ).execute()
            self.supabase.table('portfolios').update({
                'current_cash': 100000.00,
                'reset_at': datetime.utcnow().isoformat(),
            }).eq('id', portfolio_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error resetting portfolio: {e}")
            return False

    # ========== BACKTEST ==========

    def save_backtest_record(self, ticker, score, price, recommendation=None):
        """Save a backtest score record."""
        if not self.enabled:
            return False

        if recommendation is None:
            if score >= 75:
                recommendation = 'STRONG_BUY'
            elif score >= 60:
                recommendation = 'BUY'
            elif score >= 45:
                recommendation = 'HOLD'
            elif score >= 30:
                recommendation = 'SELL'
            else:
                recommendation = 'STRONG_SELL'

        try:
            self.supabase.table('backtest_records').insert({
                'ticker': ticker.upper(),
                'score': float(score),
                'recommendation': recommendation,
                'price_at_scoring': float(price),
                'timestamp': datetime.utcnow().isoformat(),
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Error saving backtest record: {e}")
            return False

    # ========== MARKET SENTIMENT CACHE ==========

    def cache_market_sentiment(self, sentiment_data, ttl_minutes=30):
        """Cache market sentiment data."""
        if not self.enabled:
            return False

        try:
            expires = datetime.utcnow()
            from datetime import timedelta
            expires += timedelta(minutes=ttl_minutes)

            self.supabase.table('market_sentiment_cache').insert({
                'vix': sentiment_data.get('vix'),
                'vix_signal': sentiment_data.get('vix_signal'),
                'fear_greed_index': sentiment_data.get('fear_greed_index'),
                'fear_greed_label': sentiment_data.get('fear_greed_label'),
                'treasury_10y': sentiment_data.get('treasury_10y'),
                'sp500_trend': sentiment_data.get('sp500_trend'),
                'overall_sentiment': sentiment_data.get('overall_sentiment'),
                'timestamp': datetime.utcnow().isoformat(),
                'expires_at': expires.isoformat(),
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Error caching market sentiment: {e}")
            return False


# Global service instance (lazy initialization)
db_service = DatabaseService()
