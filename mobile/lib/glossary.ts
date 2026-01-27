// ============================================================================
// FINANCIAL GLOSSARY — Term definitions for bottom sheet education
// ============================================================================

export interface GlossaryEntry {
  term: string;
  shortDescription: string;
  fullDescription: string;
  category: 'technical' | 'fundamental' | 'sentiment';
  formula?: string;
  interpretation: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  rsi: {
    term: 'RSI (Relative Strength Index)',
    shortDescription: 'Momentum oscillator measuring speed and magnitude of price changes.',
    fullDescription:
      'The Relative Strength Index (RSI) is a momentum oscillator developed by J. Welles Wilder Jr. It measures the speed and magnitude of recent price changes to evaluate overbought or oversold conditions.\n\nRSI oscillates between 0 and 100. Traditionally, readings above 70 indicate overbought conditions (potential pullback), while readings below 30 indicate oversold conditions (potential bounce). The standard period is 14 days.',
    category: 'technical',
    formula: 'RSI = 100 - (100 / (1 + RS)), where RS = Avg Gain / Avg Loss over 14 periods',
    interpretation:
      'Above 70: Overbought (bearish signal). Below 30: Oversold (bullish signal). Divergence between RSI and price often signals reversals.',
  },
  macd: {
    term: 'MACD (Moving Average Convergence Divergence)',
    shortDescription: 'Trend-following momentum indicator showing relationship between two moving averages.',
    fullDescription:
      'MACD is a trend-following momentum indicator that shows the relationship between two exponential moving averages (EMAs) of a security\'s price. It is calculated by subtracting the 26-period EMA from the 12-period EMA.\n\nThe result is the MACD line. A 9-period EMA of the MACD, called the "signal line," is plotted on top. The histogram shows the difference between the MACD line and signal line.',
    category: 'technical',
    formula: 'MACD Line = 12-period EMA - 26-period EMA\nSignal Line = 9-period EMA of MACD\nHistogram = MACD - Signal',
    interpretation:
      'Bullish crossover: MACD crosses above signal line. Bearish crossover: MACD crosses below signal line. Histogram expansion shows strengthening momentum.',
  },
  stochastic: {
    term: 'Stochastic Oscillator',
    shortDescription: 'Momentum indicator comparing closing price to price range over a given period.',
    fullDescription:
      'The Stochastic Oscillator is a momentum indicator that compares a security\'s closing price to its price range over a specific period (typically 14 days). It generates values between 0 and 100.\n\n%K is the fast line and %D is a 3-period moving average of %K. Like RSI, readings above 80 suggest overbought conditions, while below 20 suggests oversold.',
    category: 'technical',
    formula: '%K = ((Close - Low14) / (High14 - Low14)) x 100\n%D = 3-period SMA of %K',
    interpretation:
      'Above 80: Overbought. Below 20: Oversold. Bullish signal when %K crosses above %D. Bearish when %K crosses below %D.',
  },
  adx: {
    term: 'ADX (Average Directional Index)',
    shortDescription: 'Measures the strength of a trend regardless of direction.',
    fullDescription:
      'The Average Directional Index (ADX) measures the strength of a trend, regardless of whether it is up or down. ADX is derived from the smoothed averages of the difference between +DI and -DI.\n\nADX itself is non-directional; it only measures trend strength. The +DI and -DI lines indicate direction. ADX values range from 0 to 100.',
    category: 'technical',
    formula: 'ADX = 14-period smoothed average of DX\nDX = (|+DI - -DI| / |+DI + -DI|) x 100',
    interpretation:
      'Below 20: Weak/no trend. 20-40: Emerging trend. 40-60: Strong trend. Above 60: Very strong trend.',
  },
  mfi: {
    term: 'MFI (Money Flow Index)',
    shortDescription: 'Volume-weighted RSI that measures buying and selling pressure.',
    fullDescription:
      'The Money Flow Index (MFI) is a technical oscillator that uses price and volume to identify overbought or oversold conditions. It is related to RSI but incorporates volume, making it a "volume-weighted RSI."\n\nMFI ranges from 0 to 100. It is useful for confirming price trends with volume data.',
    category: 'technical',
    formula: 'MFI = 100 - (100 / (1 + Money Flow Ratio))\nMoney Flow Ratio = Positive Money Flow / Negative Money Flow',
    interpretation:
      'Above 80: Overbought. Below 20: Oversold. Divergence with price suggests potential reversal. Volume confirmation adds reliability.',
  },
  cci: {
    term: 'CCI (Commodity Channel Index)',
    shortDescription: 'Measures deviation of price from its statistical mean.',
    fullDescription:
      'The Commodity Channel Index (CCI) measures the current price level relative to an average price level over a given period. It can be used on any asset, not just commodities.\n\nCCI oscillates above and below zero. High values indicate the price is well above the average, while low values indicate the price is well below.',
    category: 'technical',
    formula: 'CCI = (Typical Price - SMA) / (0.015 x Mean Deviation)\nTypical Price = (High + Low + Close) / 3',
    interpretation:
      'Above +100: Overbought / strong uptrend. Below -100: Oversold / strong downtrend. Zero line crossovers signal potential trend changes.',
  },
  bollinger: {
    term: 'Bollinger Bands',
    shortDescription: 'Volatility bands placed above and below a moving average.',
    fullDescription:
      'Bollinger Bands consist of a middle band (20-period SMA) and upper/lower bands placed 2 standard deviations away. They expand during high volatility and contract during low volatility.\n\nPrice touching the upper band does not automatically mean "sell," nor does the lower band mean "buy." The bands provide context about relative price levels.',
    category: 'technical',
    formula: 'Middle Band = 20-period SMA\nUpper Band = SMA + (2 x StdDev)\nLower Band = SMA - (2 x StdDev)',
    interpretation:
      'Price near upper band: Relatively high. Price near lower band: Relatively low. Band squeeze (narrowing) often precedes breakouts.',
  },
  williams_r: {
    term: 'Williams %R',
    shortDescription: 'Momentum indicator showing overbought/oversold levels.',
    fullDescription:
      'Williams %R is a momentum indicator that measures overbought and oversold levels, similar to the Stochastic Oscillator. It ranges from 0 to -100.\n\nDeveloped by Larry Williams, it reflects the level of the close relative to the highest high over a look-back period (typically 14 days).',
    category: 'technical',
    formula: '%R = ((Highest High - Close) / (Highest High - Lowest Low)) x -100',
    interpretation:
      'Above -20: Overbought. Below -80: Oversold. Best used in trending markets to identify entry points.',
  },
  obv: {
    term: 'OBV (On-Balance Volume)',
    shortDescription: 'Cumulative volume indicator that relates volume to price change.',
    fullDescription:
      'On-Balance Volume (OBV) is a cumulative indicator that adds volume on up days and subtracts volume on down days. It is used to confirm price trends and detect divergences.\n\nThe theory is that volume precedes price: if OBV is rising while price is flat, accumulation is occurring and a price rise may follow.',
    category: 'technical',
    interpretation:
      'Rising OBV with rising price: Confirms uptrend. Falling OBV with falling price: Confirms downtrend. OBV diverging from price: Potential reversal.',
  },
  vwap: {
    term: 'VWAP (Volume Weighted Average Price)',
    shortDescription: 'Average price weighted by volume, used as a trading benchmark.',
    fullDescription:
      'VWAP gives the average price a security has traded at throughout the day, weighted by volume. It is commonly used by institutional traders as a benchmark.\n\nTrading above VWAP suggests bullish sentiment; below VWAP suggests bearish sentiment.',
    category: 'technical',
    formula: 'VWAP = Cumulative(Price x Volume) / Cumulative(Volume)',
    interpretation:
      'Price above VWAP: Bullish intraday bias. Price below VWAP: Bearish intraday bias. Often used as support/resistance.',
  },
  vix: {
    term: 'VIX (Volatility Index)',
    shortDescription: 'Measures expected 30-day market volatility, known as the "fear gauge."',
    fullDescription:
      'The CBOE Volatility Index (VIX) measures the market\'s expectation of 30-day forward-looking volatility. It is derived from S&P 500 index option prices.\n\nOften called the "fear gauge," the VIX tends to rise when markets fall and decline when markets are calm. It is a contrarian indicator: extreme readings often precede reversals.',
    category: 'sentiment',
    interpretation:
      'Below 15: Low volatility (complacency). 15-20: Normal range. 20-30: Elevated fear. Above 30: High fear (potential buying opportunity).',
  },
  fear_greed: {
    term: 'Fear & Greed Index',
    shortDescription: 'Composite sentiment indicator measuring investor emotions.',
    fullDescription:
      'The Fear & Greed Index aggregates seven market indicators to gauge whether investors are driven by fear or greed. It ranges from 0 (extreme fear) to 100 (extreme greed).\n\nComponents include: stock price momentum, stock price strength, stock price breadth, put/call ratio, junk bond demand, market volatility, and safe haven demand.',
    category: 'sentiment',
    interpretation:
      'Below 25: Extreme Fear (contrarian buy signal). 25-45: Fear. 45-55: Neutral. 55-75: Greed. Above 75: Extreme Greed (contrarian sell signal).',
  },
  pe_ratio: {
    term: 'P/E Ratio (Price-to-Earnings)',
    shortDescription: 'Share price divided by earnings per share.',
    fullDescription:
      'The P/E ratio measures how much investors pay per dollar of earnings. A high P/E suggests investors expect higher future growth, while a low P/E may indicate undervaluation or declining earnings.\n\nTrailing P/E uses the past 12 months of earnings. It is one of the most widely used valuation metrics but should be compared within the same industry.',
    category: 'fundamental',
    formula: 'P/E = Stock Price / Earnings Per Share (trailing 12 months)',
    interpretation:
      'Low P/E (< 15): Potentially undervalued or slow growth. Mid P/E (15-25): Fairly valued. High P/E (> 25): Growth expectations or overvaluation. Compare to sector average.',
  },
  forward_pe: {
    term: 'Forward P/E',
    shortDescription: 'Price divided by estimated future earnings.',
    fullDescription:
      'Forward P/E uses analyst estimates for the next 12 months of earnings rather than historical data. It provides a more forward-looking valuation metric.\n\nIf forward P/E is significantly lower than trailing P/E, analysts expect earnings growth. The reverse suggests expected earnings decline.',
    category: 'fundamental',
    formula: 'Forward P/E = Stock Price / Estimated Future EPS',
    interpretation:
      'Forward P/E < Trailing P/E: Analysts expect earnings growth. Forward P/E > Trailing P/E: Analysts expect earnings decline. Compare to industry peers.',
  },
  peg_ratio: {
    term: 'PEG Ratio (Price/Earnings-to-Growth)',
    shortDescription: 'P/E ratio divided by earnings growth rate.',
    fullDescription:
      'The PEG ratio adjusts the P/E ratio by the company\'s expected earnings growth rate. It provides a more complete picture than P/E alone by accounting for growth.\n\nDeveloped by Peter Lynch, who considered a PEG of 1.0 to be fair value. Below 1.0 suggests the stock may be undervalued relative to its growth.',
    category: 'fundamental',
    formula: 'PEG = P/E Ratio / Annual EPS Growth Rate',
    interpretation:
      'Below 1.0: Potentially undervalued relative to growth. Around 1.0: Fairly valued. Above 2.0: Potentially overvalued. Negative values (declining earnings) are unreliable.',
  },
  profit_margin: {
    term: 'Profit Margin',
    shortDescription: 'Percentage of revenue retained as profit after all expenses.',
    fullDescription:
      'Net profit margin measures how much net income is generated as a percentage of revenue. It indicates how effectively a company converts revenue into actual profit.\n\nHigher margins generally indicate better cost control and pricing power. Margins vary significantly across industries.',
    category: 'fundamental',
    formula: 'Profit Margin = (Net Income / Revenue) x 100',
    interpretation:
      'Above 20%: Excellent (typical for tech/software). 10-20%: Good. 5-10%: Average. Below 5%: Thin margins (retail, commodities). Compare within industry.',
  },
  roe: {
    term: 'ROE (Return on Equity)',
    shortDescription: 'Measures profitability relative to shareholders\' equity.',
    fullDescription:
      'Return on Equity measures a company\'s ability to generate profits from shareholders\' equity. It shows how effectively management uses investor capital to generate earnings.\n\nConsistently high ROE (above 15%) is a hallmark of quality companies. However, high debt can artificially inflate ROE.',
    category: 'fundamental',
    formula: 'ROE = Net Income / Shareholders\' Equity x 100',
    interpretation:
      'Above 20%: Excellent capital efficiency. 15-20%: Good. 10-15%: Average. Below 10%: Poor. Watch for debt-inflated ROE.',
  },
  dividend_yield: {
    term: 'Dividend Yield',
    shortDescription: 'Annual dividends paid relative to stock price.',
    fullDescription:
      'Dividend yield shows how much a company pays out in dividends each year relative to its stock price. It is a key metric for income-focused investors.\n\nA high yield can indicate a good income investment, but extremely high yields may signal financial distress or an unsustainable payout.',
    category: 'fundamental',
    formula: 'Dividend Yield = (Annual Dividends Per Share / Stock Price) x 100',
    interpretation:
      'Above 4%: High yield (verify sustainability). 2-4%: Moderate yield. Below 2%: Low yield (growth focus). 0%: No dividend (reinvesting in growth).',
  },
  moving_averages: {
    term: 'Moving Averages (SMA)',
    shortDescription: 'Average price over a specific number of periods, smoothing out volatility.',
    fullDescription:
      'Simple Moving Averages (SMA) calculate the average closing price over a set number of periods. Common periods are 20, 50, and 200 days.\n\nThe 50/200 crossover is particularly watched: a "Golden Cross" (50 crosses above 200) is bullish, while a "Death Cross" (50 crosses below 200) is bearish.',
    category: 'technical',
    formula: 'SMA = Sum of closing prices over N periods / N',
    interpretation:
      'Price above SMA: Bullish. Price below SMA: Bearish. Golden Cross (50 > 200): Strong buy signal. Death Cross (50 < 200): Strong sell signal.',
  },
  consumer_sentiment: {
    term: 'Consumer Sentiment',
    shortDescription: 'Index measuring consumer confidence in the economy.',
    fullDescription:
      'Consumer sentiment indices (University of Michigan, Conference Board) measure how optimistic or pessimistic consumers are about the economy. Higher sentiment typically correlates with increased spending.\n\nAs a leading indicator, declining sentiment can foreshadow economic slowdown and market weakness.',
    category: 'sentiment',
    interpretation:
      'Rising sentiment: Bullish for consumer stocks and broader market. Falling sentiment: Bearish signal. Extreme readings often precede reversals.',
  },
};

// Display name to glossary key mapping
export const TERM_KEY_MAP: Record<string, string> = {
  'RSI (14)': 'rsi',
  'RSI': 'rsi',
  'MACD': 'macd',
  'Stochastic': 'stochastic',
  'ADX': 'adx',
  'MFI': 'mfi',
  'CCI': 'cci',
  'Bollinger Bands': 'bollinger',
  'Williams %R': 'williams_r',
  'OBV': 'obv',
  'VWAP': 'vwap',
  'VIX': 'vix',
  'Fear & Greed': 'fear_greed',
  'P/E Ratio': 'pe_ratio',
  'Forward P/E': 'forward_pe',
  'PEG Ratio': 'peg_ratio',
  'Profit Margin': 'profit_margin',
  'ROE': 'roe',
  'Dividend Yield': 'dividend_yield',
  'Moving Averages': 'moving_averages',
  'Consumer Sentiment': 'consumer_sentiment',
};

export function getGlossaryKey(displayName: string): string | undefined {
  return TERM_KEY_MAP[displayName];
}
