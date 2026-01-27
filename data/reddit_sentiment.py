"""
Reddit Sentiment Analyzer

Fetches and analyzes sentiment from stock-related subreddits:
- r/wallstreetbets
- r/stocks
- r/investing
- r/options
- r/stockmarket

Uses Reddit's public JSON API (no authentication required for read-only).
"""

import requests
import re
import time
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Rate limiting - Reddit allows ~60 requests/minute for unauthenticated
_last_request_time = 0
_min_request_interval = 1.0  # 1 second between requests


@dataclass
class RedditPost:
    """A Reddit post with sentiment data"""
    title: str
    subreddit: str
    score: int  # upvotes - downvotes
    num_comments: int
    created_utc: float
    url: str
    sentiment: str = 'NEUTRAL'  # 'BULLISH', 'BEARISH', 'NEUTRAL'
    sentiment_score: float = 0.0  # -1 to +1


@dataclass
class RedditSentimentResult:
    """Result from Reddit sentiment analysis"""
    ticker: str
    total_mentions: int = 0
    bullish_count: int = 0
    bearish_count: int = 0
    neutral_count: int = 0
    sentiment_score: float = 0.0  # -1 (very bearish) to +1 (very bullish)
    sentiment_label: str = 'NEUTRAL'
    volume_spike: bool = False  # Unusual mention activity
    weighted_sentiment: float = 0.0  # Weighted by upvotes
    top_posts: List[RedditPost] = field(default_factory=list)
    subreddit_breakdown: Dict[str, int] = field(default_factory=dict)
    data_freshness: str = '24h'  # How recent the data is
    confidence: float = 0.5

    def to_dict(self) -> Dict[str, Any]:
        return {
            'ticker': self.ticker,
            'total_mentions': self.total_mentions,
            'bullish_count': self.bullish_count,
            'bearish_count': self.bearish_count,
            'neutral_count': self.neutral_count,
            'sentiment_score': round(self.sentiment_score, 3),
            'sentiment_label': self.sentiment_label,
            'volume_spike': self.volume_spike,
            'weighted_sentiment': round(self.weighted_sentiment, 3),
            'top_posts': [
                {
                    'title': p.title[:100],
                    'subreddit': p.subreddit,
                    'score': p.score,
                    'sentiment': p.sentiment,
                    'url': p.url
                }
                for p in self.top_posts[:5]
            ],
            'subreddit_breakdown': self.subreddit_breakdown,
            'confidence': round(self.confidence, 2)
        }


class RedditSentimentAnalyzer:
    """
    Analyzes Reddit sentiment for stock tickers.

    Uses public Reddit JSON API - no authentication required.
    """

    # Subreddits to search (ordered by relevance for stocks)
    SUBREDDITS = [
        'wallstreetbets',
        'stocks',
        'investing',
        'stockmarket',
        'options',
    ]

    # User agent to identify our requests (Reddit requires this)
    USER_AGENT = 'StockPulse/1.0 (Stock Analysis Tool)'

    # Sentiment keywords
    BULLISH_KEYWORDS = [
        'bull', 'bullish', 'long', 'calls', 'buy', 'moon', 'rocket',
        'tendies', 'gain', 'gains', 'up', 'rally', 'squeeze', 'breakout',
        'undervalued', 'cheap', 'discount', 'opportunity', 'loading',
        'accumulate', 'strong', 'beat', 'crush', 'soar', 'rip', 'pump',
        'diamond hands', 'hodl', 'hold', 'yolo', 'all in', 'lambo'
    ]

    BEARISH_KEYWORDS = [
        'bear', 'bearish', 'short', 'puts', 'sell', 'dump', 'crash',
        'loss', 'losses', 'down', 'drop', 'tank', 'drill', 'plunge',
        'overvalued', 'expensive', 'bubble', 'warning', 'avoid',
        'exit', 'weak', 'miss', 'fail', 'fade', 'red', 'rug pull',
        'paper hands', 'bag holder', 'bagholder', 'rekt', 'guh'
    ]

    # Average daily mentions for "normal" activity (approximate)
    BASELINE_MENTIONS = {
        'AAPL': 50, 'TSLA': 100, 'NVDA': 80, 'AMD': 60, 'MSFT': 40,
        'GOOGL': 30, 'AMZN': 35, 'META': 40, 'GME': 150, 'AMC': 100,
        'SPY': 80, 'QQQ': 40, 'default': 10
    }

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.USER_AGENT
        })

    def _rate_limit(self):
        """Enforce rate limiting between requests."""
        global _last_request_time
        elapsed = time.time() - _last_request_time
        if elapsed < _min_request_interval:
            time.sleep(_min_request_interval - elapsed)
        _last_request_time = time.time()

    def _fetch_subreddit_search(
        self,
        subreddit: str,
        query: str,
        limit: int = 25,
        time_filter: str = 'week'
    ) -> List[Dict]:
        """
        Search a subreddit for posts mentioning the query.

        Args:
            subreddit: Subreddit name (without r/)
            query: Search query (ticker symbol)
            limit: Max posts to fetch (max 100)
            time_filter: 'hour', 'day', 'week', 'month', 'year', 'all'

        Returns:
            List of post data dicts
        """
        self._rate_limit()

        url = f"https://www.reddit.com/r/{subreddit}/search.json"
        params = {
            'q': query,
            'restrict_sr': 'true',  # Only search this subreddit
            'sort': 'relevance',
            't': time_filter,
            'limit': min(limit, 100)
        }

        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            posts = []
            for child in data.get('data', {}).get('children', []):
                post = child.get('data', {})
                posts.append(post)

            return posts

        except requests.exceptions.RequestException as e:
            logger.warning(f"Reddit API error for r/{subreddit}: {e}")
            return []
        except Exception as e:
            logger.warning(f"Error parsing Reddit response: {e}")
            return []

    def _analyze_post_sentiment(self, title: str) -> tuple:
        """
        Analyze sentiment of a post title.

        Returns:
            Tuple of (sentiment_label, sentiment_score)
        """
        title_lower = title.lower()

        bullish_count = sum(1 for kw in self.BULLISH_KEYWORDS if kw in title_lower)
        bearish_count = sum(1 for kw in self.BEARISH_KEYWORDS if kw in title_lower)

        total = bullish_count + bearish_count
        if total == 0:
            return 'NEUTRAL', 0.0

        score = (bullish_count - bearish_count) / total

        if score > 0.3:
            return 'BULLISH', score
        elif score < -0.3:
            return 'BEARISH', score
        else:
            return 'NEUTRAL', score

    def _is_relevant_post(self, post: Dict, ticker: str) -> bool:
        """Check if post is actually about the ticker (not just mentioning it)."""
        title = post.get('title', '').upper()
        selftext = post.get('selftext', '').upper()[:500]  # First 500 chars

        # Check for ticker mention with word boundaries
        # Match $TICKER, TICKER, or ticker in context
        patterns = [
            rf'\${ticker}\b',  # $AAPL
            rf'\b{ticker}\b',  # AAPL as whole word
        ]

        for pattern in patterns:
            if re.search(pattern, title) or re.search(pattern, selftext):
                return True

        return False

    def get_ticker_sentiment(
        self,
        ticker: str,
        time_filter: str = 'week'
    ) -> RedditSentimentResult:
        """
        Get Reddit sentiment for a ticker.

        Args:
            ticker: Stock ticker symbol (e.g., 'AAPL')
            time_filter: Time range ('day', 'week', 'month')

        Returns:
            RedditSentimentResult with sentiment analysis
        """
        ticker = ticker.upper()
        all_posts: List[RedditPost] = []
        subreddit_counts: Dict[str, int] = {}

        # Search each subreddit
        for subreddit in self.SUBREDDITS:
            # Search for both $TICKER and TICKER
            queries = [f"${ticker}", ticker]

            for query in queries:
                posts = self._fetch_subreddit_search(
                    subreddit,
                    query,
                    limit=25,
                    time_filter=time_filter
                )

                for post in posts:
                    # Skip if not actually relevant
                    if not self._is_relevant_post(post, ticker):
                        continue

                    # Skip duplicates (same post found with different query)
                    post_id = post.get('id')
                    if any(p.url.endswith(post_id) for p in all_posts):
                        continue

                    title = post.get('title', '')
                    sentiment_label, sentiment_score = self._analyze_post_sentiment(title)

                    reddit_post = RedditPost(
                        title=title,
                        subreddit=subreddit,
                        score=post.get('score', 0),
                        num_comments=post.get('num_comments', 0),
                        created_utc=post.get('created_utc', 0),
                        url=f"https://reddit.com{post.get('permalink', '')}",
                        sentiment=sentiment_label,
                        sentiment_score=sentiment_score
                    )
                    all_posts.append(reddit_post)

                    # Track subreddit counts
                    subreddit_counts[subreddit] = subreddit_counts.get(subreddit, 0) + 1

        # Calculate aggregate sentiment
        if not all_posts:
            return RedditSentimentResult(
                ticker=ticker,
                total_mentions=0,
                sentiment_label='UNKNOWN',
                confidence=0.1
            )

        # Count sentiments
        bullish = sum(1 for p in all_posts if p.sentiment == 'BULLISH')
        bearish = sum(1 for p in all_posts if p.sentiment == 'BEARISH')
        neutral = sum(1 for p in all_posts if p.sentiment == 'NEUTRAL')

        # Simple sentiment score
        total = len(all_posts)
        simple_score = (bullish - bearish) / total if total > 0 else 0

        # Weighted sentiment (by upvotes)
        total_weight = sum(max(p.score, 1) for p in all_posts)
        weighted_score = sum(
            p.sentiment_score * max(p.score, 1) for p in all_posts
        ) / total_weight if total_weight > 0 else 0

        # Determine overall label
        if weighted_score > 0.2:
            sentiment_label = 'BULLISH'
        elif weighted_score < -0.2:
            sentiment_label = 'BEARISH'
        else:
            sentiment_label = 'NEUTRAL'

        # Check for volume spike
        baseline = self.BASELINE_MENTIONS.get(ticker, self.BASELINE_MENTIONS['default'])
        # Adjust baseline for time filter
        if time_filter == 'day':
            expected = baseline
        elif time_filter == 'week':
            expected = baseline * 7
        else:
            expected = baseline * 30

        volume_spike = total > expected * 1.5

        # Sort by score for top posts
        all_posts.sort(key=lambda p: p.score, reverse=True)

        # Calculate confidence based on data quantity
        confidence = min(0.3 + (total / 50) * 0.5, 0.9)

        return RedditSentimentResult(
            ticker=ticker,
            total_mentions=total,
            bullish_count=bullish,
            bearish_count=bearish,
            neutral_count=neutral,
            sentiment_score=simple_score,
            sentiment_label=sentiment_label,
            volume_spike=volume_spike,
            weighted_sentiment=weighted_score,
            top_posts=all_posts[:10],
            subreddit_breakdown=subreddit_counts,
            data_freshness=time_filter,
            confidence=confidence
        )


# Singleton instance
_reddit_analyzer = None


def get_reddit_sentiment(ticker: str, time_filter: str = 'week') -> RedditSentimentResult:
    """
    Get Reddit sentiment for a ticker (convenience function).

    Args:
        ticker: Stock ticker symbol
        time_filter: 'day', 'week', or 'month'

    Returns:
        RedditSentimentResult
    """
    global _reddit_analyzer
    if _reddit_analyzer is None:
        _reddit_analyzer = RedditSentimentAnalyzer()

    return _reddit_analyzer.get_ticker_sentiment(ticker, time_filter)
