"""
Layer 5: Catalyst Analyzer

Identifies upcoming events that could move the stock:
- Earnings announcements
- Dividend events
- News-based catalysts
- Technical breakout setups
- Social sentiment (Reddit)
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import logging
import re
import requests

from analyzers.base import BaseAnalyzer
from models.results import CatalystResult, Catalyst, AnalyzedArticle

logger = logging.getLogger(__name__)

# Flag to enable/disable Reddit sentiment (can be slow due to API calls)
ENABLE_REDDIT_SENTIMENT = True


class CatalystAnalyzer(BaseAnalyzer):
    """
    Layer 5: Catalyst Detection - Identify upcoming events.

    Analyzes earnings calendar, news, and technical setups
    to identify potential stock-moving events.
    """

    # Keywords for catalyst detection in news
    CATALYST_KEYWORDS = {
        'earnings': ['earnings', 'quarterly results', 'eps', 'revenue report', 'guidance'],
        'fda': ['fda', 'approval', 'clinical trial', 'phase 3', 'drug approval'],
        'product': ['product launch', 'new product', 'release', 'unveil', 'announce'],
        'acquisition': ['acquisition', 'merger', 'buyout', 'takeover', 'acquire'],
        'legal': ['lawsuit', 'settlement', 'sec', 'investigation', 'regulatory'],
        'dividend': ['dividend', 'special dividend', 'dividend increase', 'dividend cut'],
        'split': ['stock split', 'reverse split'],
        'insider': ['insider buying', 'insider selling', 'ceo', 'cfo']
    }

    # Sentiment keywords
    POSITIVE_KEYWORDS = [
        'beat', 'exceed', 'surge', 'soar', 'upgrade', 'bullish', 'growth',
        'profit', 'record', 'success', 'breakthrough', 'outperform', 'strong'
    ]
    NEGATIVE_KEYWORDS = [
        'miss', 'decline', 'plunge', 'downgrade', 'bearish', 'loss',
        'weak', 'concern', 'warning', 'fail', 'underperform', 'cut'
    ]

    @property
    def layer_name(self) -> str:
        return "Catalyst"

    @property
    def layer_number(self) -> int:
        return 5

    def analyze(self, ticker: str, data: Dict[str, Any]) -> CatalystResult:
        """
        Analyze upcoming catalysts for the stock.

        Args:
            ticker: Stock ticker symbol
            data: Dict containing 'info', 'news', 'calendar'

        Returns:
            CatalystResult with identified catalysts
        """
        info = data.get('info', {})
        news = data.get('news', [])
        calendar = data.get('calendar')

        catalysts: List[Catalyst] = []
        today = datetime.now()

        # ============== Earnings Catalyst ==============
        earnings_catalyst = self._analyze_earnings(info, calendar, today)
        if earnings_catalyst:
            catalysts.append(earnings_catalyst)

        # ============== Dividend Catalyst ==============
        dividend_catalyst = self._analyze_dividend(info, today)
        if dividend_catalyst:
            catalysts.append(dividend_catalyst)

        analyzed_articles = self._build_articles(news)

        # ============== News-Based Catalysts ==============
        news_catalysts = self._analyze_news_catalysts(analyzed_articles)
        catalysts.extend(news_catalysts)

        # ============== Calculate News Sentiment ==============
        news_sentiment = self._calculate_news_sentiment(analyzed_articles)

        # ============== Reddit Social Sentiment ==============
        social_sentiment = self._get_reddit_sentiment(ticker)

        # ============== Sort and Find Nearest ==============
        catalysts.sort(key=lambda c: c.days_away)
        nearest = catalysts[0] if catalysts else None
        days_to_nearest = nearest.days_away if nearest else 999

        # ============== Overall Catalyst Sentiment ==============
        catalyst_sentiment = self._determine_catalyst_sentiment(
            catalysts, news_sentiment, social_sentiment
        )

        # ============== Risk Factor ==============
        risk_factor = self._calculate_risk_factor(catalysts, days_to_nearest)

        result = CatalystResult(
            catalysts=catalysts,
            nearest_catalyst=nearest,
            days_to_nearest=days_to_nearest,
            catalyst_sentiment=catalyst_sentiment,
            risk_factor=risk_factor,
            news_sentiment_score=news_sentiment,
            social_sentiment_score=social_sentiment,
            analyzed_articles=analyzed_articles,
            status='available' if analyzed_articles or catalysts else 'partial',
            data_quality='complete' if analyzed_articles else 'partial',
            reason='' if analyzed_articles or catalysts else 'No catalyst or article content available',
        )

        self._log_analysis(
            ticker,
            f"catalysts={len(catalysts)}, nearest={days_to_nearest}d, sentiment={catalyst_sentiment}, reddit={f'{social_sentiment:.2f}' if social_sentiment else 'N/A'}"
        )
        return result

    def _get_reddit_sentiment(self, ticker: str) -> Optional[float]:
        """Fetch Reddit sentiment for the ticker."""
        if not ENABLE_REDDIT_SENTIMENT:
            return None

        try:
            from data.reddit_sentiment import get_reddit_sentiment

            result = get_reddit_sentiment(ticker, time_filter='week')

            if result.total_mentions > 0:
                return result.weighted_sentiment
            return None

        except ImportError:
            logger.debug("Reddit sentiment module not available")
            return None
        except Exception as e:
            logger.debug(f"Reddit sentiment error for {ticker}: {e}")
            return None

    def _analyze_earnings(
        self, info: Dict, calendar: Any, today: datetime
    ) -> Optional[Catalyst]:
        """Analyze upcoming earnings event."""
        earnings_date = None

        # Try to get earnings date from calendar
        if calendar is not None:
            try:
                if isinstance(calendar, dict) and 'Earnings Date' in calendar:
                    ed = calendar['Earnings Date']
                    if isinstance(ed, list) and len(ed) > 0:
                        ed = ed[0]
                    if ed is not None:
                        if hasattr(ed, 'to_pydatetime'):
                            earnings_date = ed.to_pydatetime()
                        elif isinstance(ed, datetime):
                            earnings_date = ed
                        elif hasattr(ed, 'year'):
                            earnings_date = datetime.combine(ed, datetime.min.time())
            except Exception as e:
                logger.debug(f"Error parsing calendar: {e}")

        # Try info timestamps
        if earnings_date is None:
            ts = info.get('earningsTimestamp') or info.get('earningsTimestampStart')
            if ts:
                try:
                    earnings_date = datetime.fromtimestamp(ts)
                except:
                    pass

        if earnings_date is None:
            return None

        # Make timezone-naive
        if hasattr(earnings_date, 'tzinfo') and earnings_date.tzinfo is not None:
            earnings_date = earnings_date.replace(tzinfo=None)

        days_away = (earnings_date.date() - today.date()).days

        # Skip if too far away or in the past
        if days_away < 0 or days_away > 90:
            return None

        # Determine expected impact based on historical surprise
        # (simplified - would use actual earnings history in production)
        expected_impact = 'HIGH' if days_away <= 7 else 'MEDIUM'

        # Sentiment based on analyst expectations
        recommendation = info.get('recommendationKey', '').lower()
        if recommendation in ['strong_buy', 'buy']:
            sentiment = 'POSITIVE'
        elif recommendation in ['sell', 'strong_sell']:
            sentiment = 'NEGATIVE'
        else:
            sentiment = 'UNCERTAIN'

        return Catalyst(
            catalyst_type='EARNINGS',
            date=earnings_date,
            days_away=days_away,
            expected_impact=expected_impact,
            sentiment=sentiment,
            description=f"Earnings report in {days_away} days",
            confidence=0.9
        )

    def _analyze_dividend(
        self, info: Dict, today: datetime
    ) -> Optional[Catalyst]:
        """Analyze upcoming dividend event."""
        ex_div_ts = info.get('exDividendDate')
        if not ex_div_ts:
            return None

        try:
            if isinstance(ex_div_ts, int):
                ex_div_date = datetime.fromtimestamp(ex_div_ts)
            else:
                ex_div_date = ex_div_ts
        except:
            return None

        if hasattr(ex_div_date, 'tzinfo') and ex_div_date.tzinfo is not None:
            ex_div_date = ex_div_date.replace(tzinfo=None)

        days_away = (ex_div_date.date() - today.date()).days

        if days_away < 0 or days_away > 60:
            return None

        div_yield = info.get('dividendYield', 0) or 0

        return Catalyst(
            catalyst_type='DIVIDEND',
            date=ex_div_date,
            days_away=days_away,
            expected_impact='LOW',
            sentiment='POSITIVE' if div_yield > 0.03 else 'NEUTRAL',
            description=f"Ex-dividend date in {days_away} days ({div_yield*100:.1f}% yield)",
            confidence=0.95
        )

    def _analyze_news_catalysts(
        self, articles: List[AnalyzedArticle]
    ) -> List[Catalyst]:
        """Extract catalysts from recent news."""
        catalysts = []

        for article in articles[:10]:
            if article.content_quality == 'insufficient_content':
                continue

            title = article.title.lower()

            # Check for catalyst keywords
            for catalyst_type, keywords in self.CATALYST_KEYWORDS.items():
                if any(kw in title for kw in keywords):
                    catalysts.append(Catalyst(
                        catalyst_type=catalyst_type.upper(),
                        date=None,  # News is past event
                        days_away=0,  # Already happened
                        expected_impact='MEDIUM' if catalyst_type in ['acquisition', 'fda'] else 'LOW',
                        sentiment=article.sentiment,
                        description=article.title[:100],
                        confidence=max(article.confidence, 0.6),
                    ))
                    break  # One catalyst per news item

        return catalysts[:5]  # Limit to 5 news-based catalysts

    def _calculate_news_sentiment(self, articles: List[AnalyzedArticle]) -> float:
        """Calculate overall news sentiment score (-1 to +1)."""
        if not articles:
            return 0.0

        total_sentiment = 0
        count = 0

        for article in articles[:10]:
            if article.content_quality == 'insufficient_content':
                continue

            if article.sentiment == 'POSITIVE':
                total_sentiment += article.confidence
                count += 1
            elif article.sentiment == 'NEGATIVE':
                total_sentiment -= article.confidence
                count += 1

        if count == 0:
            return 0.0

        return total_sentiment / count

    def _build_articles(self, news: List[Dict[str, Any]]) -> List[AnalyzedArticle]:
        """Normalize raw provider news into a scored article list."""
        analyzed: List[AnalyzedArticle] = []
        for item in news[:10]:
            title = item.get('title', '') or ''
            link = item.get('link')
            source = item.get('publisher', 'Unknown')
            published = None

            publish_time = item.get('providerPublishTime')
            if publish_time:
                try:
                    published = datetime.fromtimestamp(publish_time).strftime('%Y-%m-%d %H:%M')
                except Exception:
                    published = None

            article_text = self._extract_article_text(item)
            content_quality = 'provider'

            if len(article_text) < 120 and link:
                fetched_text = self._fetch_article_body(link)
                if fetched_text:
                    article_text = fetched_text
                    content_quality = 'fetched'

            if len(article_text) < 60:
                analyzed.append(AnalyzedArticle(
                    title=title,
                    source=source,
                    published=published,
                    url=link,
                    sentiment='NEUTRAL',
                    confidence=0.0,
                    content_quality='insufficient_content',
                ))
                continue

            sentiment, confidence = self._score_text_sentiment(article_text)
            analyzed.append(AnalyzedArticle(
                title=title,
                source=source,
                published=published,
                url=link,
                sentiment=sentiment,
                confidence=confidence,
                content_quality=content_quality,
            ))

        return analyzed

    def _extract_article_text(self, item: Dict[str, Any]) -> str:
        """Extract article text from provider fields before attempting network fetch."""
        parts: List[str] = []

        for key in ('title', 'summary', 'description', 'snippet'):
            value = item.get(key)
            if isinstance(value, str) and value.strip():
                parts.append(value.strip())

        content = item.get('content')
        if isinstance(content, str) and content.strip():
            parts.append(content.strip())
        elif isinstance(content, dict):
            for key in ('summary', 'description', 'snippet', 'title', 'body'):
                value = content.get(key)
                if isinstance(value, str) and value.strip():
                    parts.append(value.strip())

        return ' '.join(dict.fromkeys(parts))

    def _fetch_article_body(self, url: str) -> str:
        """Fetch article content when provider metadata is insufficient."""
        try:
            response = requests.get(
                url,
                timeout=5,
                headers={'User-Agent': 'StockPulse/1.0'},
            )
            response.raise_for_status()
            body = response.text
            body = re.sub(r'(?is)<(script|style).*?>.*?</\\1>', ' ', body)
            body = re.sub(r'(?s)<[^>]+>', ' ', body)
            body = re.sub(r'\\s+', ' ', body)
            return body[:4000].strip()
        except Exception:
            return ''

    def _score_text_sentiment(self, text: str) -> tuple[str, float]:
        """Score article sentiment from extracted text."""
        text_lower = text.lower()
        positive_count = sum(1 for word in self.POSITIVE_KEYWORDS if word in text_lower)
        negative_count = sum(1 for word in self.NEGATIVE_KEYWORDS if word in text_lower)
        total = positive_count + negative_count

        if total == 0:
            return 'NEUTRAL', 0.2
        if positive_count > negative_count:
            return 'POSITIVE', min(1.0, (positive_count - negative_count) / total + 0.25)
        if negative_count > positive_count:
            return 'NEGATIVE', min(1.0, (negative_count - positive_count) / total + 0.25)
        return 'NEUTRAL', 0.3

    def _determine_catalyst_sentiment(
        self,
        catalysts: List[Catalyst],
        news_sentiment: float,
        social_sentiment: Optional[float] = None
    ) -> str:
        """Determine overall catalyst sentiment including social media."""
        # Combine news and social sentiment
        combined_sentiment = news_sentiment
        if social_sentiment is not None:
            # Social sentiment weighted at 40% (news 60%)
            combined_sentiment = news_sentiment * 0.6 + social_sentiment * 0.4

        if not catalysts:
            if combined_sentiment > 0.3:
                return 'POSITIVE'
            elif combined_sentiment < -0.3:
                return 'NEGATIVE'
            return 'NEUTRAL'

        # Weight catalysts by proximity
        weighted_sentiment = 0
        total_weight = 0

        for cat in catalysts:
            weight = 1 / max(cat.days_away + 1, 1)  # Closer = higher weight

            if cat.sentiment == 'POSITIVE':
                weighted_sentiment += weight
            elif cat.sentiment == 'NEGATIVE':
                weighted_sentiment -= weight
            # UNCERTAIN adds to uncertainty

            total_weight += weight

        if total_weight > 0:
            avg_catalyst_sentiment = weighted_sentiment / total_weight

            # Combine catalyst sentiment with news/social (50/50)
            final_sentiment = avg_catalyst_sentiment * 0.5 + combined_sentiment * 0.5

            if final_sentiment > 0.3:
                return 'POSITIVE'
            elif final_sentiment < -0.3:
                return 'NEGATIVE'
            elif any(c.sentiment == 'UNCERTAIN' for c in catalysts[:2]):
                return 'UNCERTAIN'

        return 'NEUTRAL'

    def _calculate_risk_factor(
        self, catalysts: List[Catalyst], days_to_nearest: int
    ) -> float:
        """Calculate risk factor (0-1) based on catalyst uncertainty."""
        if not catalysts:
            return 0.3  # Base risk

        risk = 0.3

        # Earnings within 7 days = high event risk
        earnings_near = any(
            c.catalyst_type == 'EARNINGS' and c.days_away <= 7
            for c in catalysts
        )
        if earnings_near:
            risk += 0.3

        # Uncertain catalysts add risk
        uncertain_count = sum(1 for c in catalysts if c.sentiment == 'UNCERTAIN')
        risk += uncertain_count * 0.1

        # FDA or legal events add risk
        high_risk_events = sum(
            1 for c in catalysts
            if c.catalyst_type in ['FDA', 'LEGAL', 'ACQUISITION']
        )
        risk += high_risk_events * 0.15

        return min(risk, 1.0)
