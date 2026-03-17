"""
Layer 4: Technical Confluence Analyzer

Signal clustering analysis instead of weighted averaging:
- Zone analysis (price at key levels)
- Signal clustering (multiple indicators agreeing)
- Divergence detection
- Multi-timeframe alignment
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List, Tuple
import logging

from analyzers.base import BaseAnalyzer
from models.results import TechnicalConfluenceResult, Divergence

logger = logging.getLogger(__name__)


class TechnicalConfluenceAnalyzer(BaseAnalyzer):
    """
    Layer 4: Technical Confluence - Signal clustering at key levels.

    Instead of averaging 16 indicators, looks for confluence:
    - Multiple signals agreeing at the same time
    - Signals at meaningful price levels
    - Divergences between price and momentum
    """

    @property
    def layer_name(self) -> str:
        return "Technical Confluence"

    @property
    def layer_number(self) -> int:
        return 4

    def analyze(self, ticker: str, data: Dict[str, Any]) -> TechnicalConfluenceResult:
        """
        Perform technical confluence analysis.

        Args:
            ticker: Stock ticker symbol
            data: Dict containing 'history' DataFrame

        Returns:
            TechnicalConfluenceResult with confluence score and signals
        """
        history = data.get('history')

        if history is None or history.empty or len(history) < 50:
            return TechnicalConfluenceResult(
                confluence_score=50.0,
                signals_bullish=[],
                signals_bearish=[],
                trend_alignment='UNKNOWN',
                confidence=0.0,
                status='unavailable',
                data_quality='insufficient',
                reason='At least 50 trading days of history are required',
            )

        close = history['Close']
        high = history['High']
        low = history['Low']
        volume = history['Volume']
        current_price = close.iloc[-1]

        # Calculate all indicators
        indicators = self._calculate_indicators(history)

        # Collect bullish and bearish signals
        signals_bullish = []
        signals_bearish = []

        # ============== RSI Analysis ==============
        rsi = indicators.get('rsi', 50)
        if rsi < 30:
            signals_bullish.append(f'RSI oversold ({rsi:.0f})')
        elif rsi < 40:
            signals_bullish.append(f'RSI approaching oversold ({rsi:.0f})')
        elif rsi > 70:
            signals_bearish.append(f'RSI overbought ({rsi:.0f})')
        elif rsi > 60:
            signals_bearish.append(f'RSI approaching overbought ({rsi:.0f})')

        # ============== MACD Analysis ==============
        macd_hist = indicators.get('macd_histogram', 0)
        macd_hist_prev = indicators.get('macd_histogram_prev', 0)

        if macd_hist > 0 and macd_hist_prev <= 0:
            signals_bullish.append('MACD bullish crossover')
        elif macd_hist < 0 and macd_hist_prev >= 0:
            signals_bearish.append('MACD bearish crossover')
        elif macd_hist > 0 and macd_hist > macd_hist_prev:
            signals_bullish.append('MACD momentum increasing')
        elif macd_hist < 0 and macd_hist < macd_hist_prev:
            signals_bearish.append('MACD momentum decreasing')

        # ============== Moving Average Analysis ==============
        sma_20 = indicators.get('sma_20', current_price)
        sma_50 = indicators.get('sma_50', current_price)
        sma_200 = indicators.get('sma_200', current_price)

        above_20 = current_price > sma_20
        above_50 = current_price > sma_50
        above_200 = current_price > sma_200

        if above_20 and above_50 and above_200:
            signals_bullish.append('Price above all major MAs (20/50/200)')
        elif not above_20 and not above_50 and not above_200:
            signals_bearish.append('Price below all major MAs (20/50/200)')

        # Golden/Death cross
        if sma_50 > sma_200 and indicators.get('sma_50_prev', sma_50) <= indicators.get('sma_200_prev', sma_200):
            signals_bullish.append('Golden cross (50 SMA crossed above 200)')
        elif sma_50 < sma_200 and indicators.get('sma_50_prev', sma_50) >= indicators.get('sma_200_prev', sma_200):
            signals_bearish.append('Death cross (50 SMA crossed below 200)')

        # ============== Bollinger Bands ==============
        bb_position = indicators.get('bb_percent_b', 0.5)
        if bb_position < 0:
            signals_bullish.append('Price below lower Bollinger Band (oversold)')
        elif bb_position < 0.2:
            signals_bullish.append('Price near lower Bollinger Band')
        elif bb_position > 1:
            signals_bearish.append('Price above upper Bollinger Band (overbought)')
        elif bb_position > 0.8:
            signals_bearish.append('Price near upper Bollinger Band')

        # ============== Stochastic ==============
        stoch_k = indicators.get('stoch_k', 50)
        stoch_d = indicators.get('stoch_d', 50)

        if stoch_k < 20 and stoch_d < 20:
            signals_bullish.append(f'Stochastic oversold ({stoch_k:.0f})')
        elif stoch_k > 80 and stoch_d > 80:
            signals_bearish.append(f'Stochastic overbought ({stoch_k:.0f})')

        # Stochastic crossover
        if stoch_k > stoch_d and indicators.get('stoch_k_prev', stoch_k) <= indicators.get('stoch_d_prev', stoch_d):
            if stoch_k < 30:
                signals_bullish.append('Stochastic bullish crossover in oversold zone')

        # ============== Volume Analysis ==============
        avg_volume = volume.rolling(20).mean().iloc[-1]
        current_volume = volume.iloc[-1]
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1

        price_change = (close.iloc[-1] - close.iloc[-2]) / close.iloc[-2]

        if volume_ratio > 1.5 and price_change > 0.02:
            signals_bullish.append(f'High volume rally ({volume_ratio:.1f}x avg)')
        elif volume_ratio > 1.5 and price_change < -0.02:
            signals_bearish.append(f'High volume selloff ({volume_ratio:.1f}x avg)')

        # ============== Support/Resistance ==============
        key_levels = self._find_key_levels(history)
        price_position = self._analyze_price_position(current_price, key_levels)

        if price_position == 'AT_SUPPORT':
            signals_bullish.append('Price at support level')
        elif price_position == 'AT_RESISTANCE':
            signals_bearish.append('Price at resistance level')
        elif price_position == 'BREAKOUT_UP':
            signals_bullish.append('Breaking out above resistance')
        elif price_position == 'BREAKOUT_DOWN':
            signals_bearish.append('Breaking down below support')

        # ============== Divergence Detection ==============
        divergences = self._detect_divergences(history, indicators)
        for div in divergences:
            if div.divergence_type == 'bullish':
                signals_bullish.append(f'Bullish {div.indicator} divergence')
            else:
                signals_bearish.append(f'Bearish {div.indicator} divergence')

        # ============== Trend Alignment ==============
        trend_alignment = self._determine_trend_alignment(indicators, signals_bullish, signals_bearish)

        # ============== Momentum State ==============
        momentum_state = self._determine_momentum_state(indicators)

        # ============== Calculate Confluence Score ==============
        confluence_score = self._calculate_confluence_score(
            signals_bullish, signals_bearish, trend_alignment, divergences
        )

        # ============== Calculate Confidence ==============
        confidence = self._calculate_confidence(
            signals_bullish, signals_bearish, trend_alignment, len(history)
        )

        result = TechnicalConfluenceResult(
            confluence_score=confluence_score,
            signals_bullish=signals_bullish,
            signals_bearish=signals_bearish,
            divergences=divergences,
            trend_alignment=trend_alignment,
            key_levels=key_levels,
            price_position=price_position,
            momentum_state=momentum_state,
            confidence=confidence,
            indicators=indicators
        )

        self._log_analysis(
            ticker,
            f"score={confluence_score:.0f}, bullish={len(signals_bullish)}, bearish={len(signals_bearish)}"
        )
        return result

    def _calculate_indicators(self, history: pd.DataFrame) -> Dict[str, float]:
        """Calculate all technical indicators."""
        close = history['Close']
        high = history['High']
        low = history['Low']
        volume = history['Volume']

        indicators = {}

        # RSI
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        indicators['rsi'] = rsi.iloc[-1] if not pd.isna(rsi.iloc[-1]) else 50

        # MACD
        exp_fast = close.ewm(span=12, adjust=False).mean()
        exp_slow = close.ewm(span=26, adjust=False).mean()
        macd = exp_fast - exp_slow
        signal = macd.ewm(span=9, adjust=False).mean()
        histogram = macd - signal
        indicators['macd'] = macd.iloc[-1]
        indicators['macd_signal'] = signal.iloc[-1]
        indicators['macd_histogram'] = histogram.iloc[-1]
        indicators['macd_histogram_prev'] = histogram.iloc[-2] if len(histogram) > 1 else 0

        # Moving Averages
        indicators['sma_20'] = close.rolling(20).mean().iloc[-1]
        indicators['sma_50'] = close.rolling(50).mean().iloc[-1]
        indicators['sma_200'] = close.rolling(200).mean().iloc[-1] if len(close) >= 200 else close.mean()

        if len(close) >= 2:
            indicators['sma_50_prev'] = close.rolling(50).mean().iloc[-2]
            indicators['sma_200_prev'] = close.rolling(200).mean().iloc[-2] if len(close) >= 200 else close.mean()

        # Bollinger Bands
        sma = close.rolling(window=20).mean()
        std = close.rolling(window=20).std()
        upper = sma + (std * 2)
        lower = sma - (std * 2)
        percent_b = (close - lower) / (upper - lower)
        indicators['bb_upper'] = upper.iloc[-1]
        indicators['bb_lower'] = lower.iloc[-1]
        indicators['bb_percent_b'] = percent_b.iloc[-1]

        # Stochastic
        lowest_low = low.rolling(window=14).min()
        highest_high = high.rolling(window=14).max()
        stoch_k = 100 * ((close - lowest_low) / (highest_high - lowest_low))
        stoch_d = stoch_k.rolling(window=3).mean()
        indicators['stoch_k'] = stoch_k.iloc[-1] if not pd.isna(stoch_k.iloc[-1]) else 50
        indicators['stoch_d'] = stoch_d.iloc[-1] if not pd.isna(stoch_d.iloc[-1]) else 50
        if len(stoch_k) > 1:
            indicators['stoch_k_prev'] = stoch_k.iloc[-2]
            indicators['stoch_d_prev'] = stoch_d.iloc[-2]

        # ADX
        try:
            plus_dm = high.diff()
            minus_dm = low.diff()
            plus_dm[plus_dm < 0] = 0
            minus_dm[minus_dm > 0] = 0

            tr1 = high - low
            tr2 = abs(high - close.shift())
            tr3 = abs(low - close.shift())
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr = tr.rolling(window=14).mean()

            plus_di = 100 * (plus_dm.rolling(window=14).mean() / atr)
            minus_di = 100 * (abs(minus_dm).rolling(window=14).mean() / atr)

            dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
            adx = dx.rolling(window=14).mean()

            indicators['adx'] = adx.iloc[-1] if not pd.isna(adx.iloc[-1]) else 20
            indicators['plus_di'] = plus_di.iloc[-1] if not pd.isna(plus_di.iloc[-1]) else 25
            indicators['minus_di'] = minus_di.iloc[-1] if not pd.isna(minus_di.iloc[-1]) else 25
        except:
            indicators['adx'] = 20
            indicators['plus_di'] = 25
            indicators['minus_di'] = 25

        # ATR
        indicators['atr'] = atr.iloc[-1] if 'atr' in dir() and not pd.isna(atr.iloc[-1]) else close.iloc[-1] * 0.02

        # Current price
        indicators['price'] = close.iloc[-1]

        return indicators

    def _find_key_levels(self, history: pd.DataFrame) -> Dict[str, float]:
        """Find key support and resistance levels."""
        close = history['Close']
        high = history['High']
        low = history['Low']
        current = close.iloc[-1]

        levels = {}

        # Recent pivot highs and lows
        recent_high = high.tail(20).max()
        recent_low = low.tail(20).min()

        # 52-week high/low
        yearly_high = high.tail(252).max() if len(high) >= 252 else high.max()
        yearly_low = low.tail(252).min() if len(low) >= 252 else low.min()

        # Find nearest support (below current price)
        potential_supports = [recent_low, yearly_low]
        supports = [s for s in potential_supports if s < current]
        levels['support'] = max(supports) if supports else current * 0.95

        # Find nearest resistance (above current price)
        potential_resistance = [recent_high, yearly_high]
        resistances = [r for r in potential_resistance if r > current]
        levels['resistance'] = min(resistances) if resistances else current * 1.05

        levels['52w_high'] = yearly_high
        levels['52w_low'] = yearly_low

        return levels

    def _analyze_price_position(
        self, current_price: float, key_levels: Dict[str, float]
    ) -> str:
        """Determine price position relative to key levels."""
        support = key_levels.get('support', current_price * 0.95)
        resistance = key_levels.get('resistance', current_price * 1.05)

        # Calculate distance as percentage
        dist_to_support = (current_price - support) / current_price
        dist_to_resistance = (resistance - current_price) / current_price

        if dist_to_support < 0.02:
            return 'AT_SUPPORT'
        elif dist_to_resistance < 0.02:
            return 'AT_RESISTANCE'
        elif dist_to_support < 0:  # Below support
            return 'BREAKOUT_DOWN'
        elif dist_to_resistance < 0:  # Above resistance
            return 'BREAKOUT_UP'
        else:
            return 'NEUTRAL'

    def _detect_divergences(
        self, history: pd.DataFrame, indicators: Dict
    ) -> List[Divergence]:
        """Detect bullish and bearish divergences."""
        divergences = []
        close = history['Close']

        if len(close) < 20:
            return divergences

        # Check last 20 bars for divergence
        recent_close = close.tail(20)

        # Find local minima and maxima in price
        price_lows = []
        price_highs = []

        for i in range(2, len(recent_close) - 2):
            if recent_close.iloc[i] < recent_close.iloc[i-1] and recent_close.iloc[i] < recent_close.iloc[i+1]:
                price_lows.append((i, recent_close.iloc[i]))
            if recent_close.iloc[i] > recent_close.iloc[i-1] and recent_close.iloc[i] > recent_close.iloc[i+1]:
                price_highs.append((i, recent_close.iloc[i]))

        # RSI divergence
        rsi = indicators.get('rsi', 50)
        rsi_prev = indicators.get('rsi_prev', rsi)  # Simplified

        # Bullish divergence: price lower low, RSI higher low
        if len(price_lows) >= 2:
            if price_lows[-1][1] < price_lows[-2][1] and rsi > 30 and rsi < 50:
                divergences.append(Divergence(
                    divergence_type='bullish',
                    indicator='RSI',
                    price_direction='lower_low',
                    indicator_direction='higher_low',
                    strength='moderate'
                ))

        # Bearish divergence: price higher high, RSI lower high
        if len(price_highs) >= 2:
            if price_highs[-1][1] > price_highs[-2][1] and rsi < 70 and rsi > 50:
                divergences.append(Divergence(
                    divergence_type='bearish',
                    indicator='RSI',
                    price_direction='higher_high',
                    indicator_direction='lower_high',
                    strength='moderate'
                ))

        return divergences

    def _determine_trend_alignment(
        self,
        indicators: Dict,
        signals_bullish: List[str],
        signals_bearish: List[str]
    ) -> str:
        """Determine if multiple timeframes/indicators align."""
        price = indicators.get('price', 0)
        sma_20 = indicators.get('sma_20', price)
        sma_50 = indicators.get('sma_50', price)
        sma_200 = indicators.get('sma_200', price)

        above_all = price > sma_20 > sma_50 > sma_200
        below_all = price < sma_20 < sma_50 < sma_200

        bullish_count = len(signals_bullish)
        bearish_count = len(signals_bearish)

        if above_all and bullish_count > bearish_count + 2:
            return 'ALIGNED_UP'
        elif below_all and bearish_count > bullish_count + 2:
            return 'ALIGNED_DOWN'
        elif abs(bullish_count - bearish_count) <= 2:
            return 'MIXED'
        elif bullish_count > bearish_count:
            return 'LEANING_UP'
        else:
            return 'LEANING_DOWN'

    def _determine_momentum_state(self, indicators: Dict) -> str:
        """Determine current momentum state."""
        macd_hist = indicators.get('macd_histogram', 0)
        macd_hist_prev = indicators.get('macd_histogram_prev', 0)
        adx = indicators.get('adx', 20)

        if adx < 20:
            return 'WEAK_TREND'

        if macd_hist > 0:
            if macd_hist > macd_hist_prev:
                return 'ACCELERATING_UP'
            else:
                return 'DECELERATING_UP'
        else:
            if macd_hist < macd_hist_prev:
                return 'ACCELERATING_DOWN'
            else:
                return 'DECELERATING_DOWN'

    def _calculate_confluence_score(
        self,
        signals_bullish: List[str],
        signals_bearish: List[str],
        trend_alignment: str,
        divergences: List[Divergence]
    ) -> float:
        """Calculate final confluence score based on signal agreement."""
        base_score = 50

        # Net signals
        net_signals = len(signals_bullish) - len(signals_bearish)

        # Each net signal adds/subtracts points
        base_score += net_signals * 5

        # Trend alignment bonus
        if trend_alignment == 'ALIGNED_UP':
            base_score += 15
        elif trend_alignment == 'ALIGNED_DOWN':
            base_score -= 15
        elif trend_alignment == 'LEANING_UP':
            base_score += 8
        elif trend_alignment == 'LEANING_DOWN':
            base_score -= 8

        # Divergence adjustment
        for div in divergences:
            if div.divergence_type == 'bullish':
                base_score += 10
            else:
                base_score -= 10

        # Clamp to 0-100
        return max(0, min(100, base_score))

    def _calculate_confidence(
        self,
        signals_bullish: List[str],
        signals_bearish: List[str],
        trend_alignment: str,
        data_points: int
    ) -> float:
        """Calculate confidence in the technical analysis."""
        confidence = 0.5  # Base confidence

        # More data = more confidence
        if data_points >= 200:
            confidence += 0.15
        elif data_points >= 100:
            confidence += 0.10
        elif data_points >= 50:
            confidence += 0.05

        # Clear signal direction increases confidence
        total_signals = len(signals_bullish) + len(signals_bearish)
        if total_signals > 0:
            dominant = max(len(signals_bullish), len(signals_bearish))
            signal_clarity = dominant / total_signals
            confidence += (signal_clarity - 0.5) * 0.2

        # Aligned trend increases confidence
        if trend_alignment in ['ALIGNED_UP', 'ALIGNED_DOWN']:
            confidence += 0.15
        elif trend_alignment in ['LEANING_UP', 'LEANING_DOWN']:
            confidence += 0.05

        return max(0.2, min(0.95, confidence))
