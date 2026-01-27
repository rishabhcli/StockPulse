"""
StockPulse Constants - Sector mappings, stock universes, and configuration
"""

# Sector mappings for news impact analysis
SECTOR_KEYWORDS = {
    'defense': ['defense', 'military', 'war', 'weapons', 'army', 'navy', 'pentagon', 'missile', 'drone', 'nato', 'conflict', 'troops'],
    'energy': ['oil', 'gas', 'opec', 'crude', 'petroleum', 'energy', 'drilling', 'pipeline', 'refinery', 'fuel'],
    'technology': ['tech', 'ai', 'artificial intelligence', 'semiconductor', 'chip', 'software', 'cloud', 'data center', 'cybersecurity'],
    'finance': ['fed', 'federal reserve', 'interest rate', 'banking', 'inflation', 'recession', 'gdp', 'unemployment', 'treasury'],
    'healthcare': ['fda', 'drug', 'vaccine', 'healthcare', 'hospital', 'pharma', 'biotech', 'medical', 'treatment'],
    'consumer': ['retail', 'consumer', 'spending', 'shopping', 'walmart', 'amazon', 'e-commerce', 'holiday sales'],
    'crypto': ['bitcoin', 'crypto', 'ethereum', 'blockchain', 'digital currency', 'sec crypto'],
    'china': ['china', 'tariff', 'trade war', 'beijing', 'chinese', 'taiwan'],
    'geopolitical': ['russia', 'ukraine', 'iran', 'middle east', 'sanctions', 'embargo', 'north korea']
}

# Sector to ticker mappings
SECTOR_TICKERS = {
    'defense': ['LMT', 'RTX', 'NOC', 'GD', 'BA', 'HII'],
    'energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'OXY', 'XLE'],
    'technology': ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMD', 'INTC', 'XLK'],
    'finance': ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'XLF'],
    'healthcare': ['JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'XLV'],
    'consumer': ['WMT', 'AMZN', 'HD', 'MCD', 'NKE', 'SBUX', 'XLY'],
    'crypto': ['COIN', 'MARA', 'RIOT', 'MSTR'],
    'utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP', 'XLU'],
    'industrials': ['CAT', 'DE', 'UNP', 'HON', 'UPS', 'XLI'],
    'real_estate': ['AMT', 'PLD', 'CCI', 'EQIX', 'XLRE'],
}

# Popular stocks/ETFs for screening
SCREENING_UNIVERSE = [
    # Tech
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'CRM',
    'ORCL', 'ADBE', 'NFLX', 'PYPL', 'XYZ', 'SHOP', 'UBER', 'ABNB', 'SNOW', 'PLTR',
    # Finance
    'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'V', 'MA', 'BLK',
    # Healthcare
    'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT', 'BMY', 'AMGN',
    # Consumer
    'WMT', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT', 'COST', 'LOW', 'DIS', 'CMCSA',
    # Industrials
    'CAT', 'BA', 'GE', 'MMM', 'HON', 'UPS', 'RTX', 'LMT', 'DE', 'UNP',
    # Energy
    'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'DVN', 'MPC', 'VLO', 'PSX', 'OXY',
    # ETFs
    'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'ARKK', 'XLF', 'XLE', 'XLK',
    # International & Bonds
    'GLD', 'SLV', 'TLT', 'HYG', 'EEM', 'VWO', 'IEMG', 'VEA', 'EFA', 'SOXL'
]

# Penny stock universe - higher risk, speculative stocks often under $5
PENNY_STOCK_UNIVERSE = [
    'SNDL', 'CLOV', 'WISH', 'BB', 'NOK', 'SOFI', 'LCID', 'NIO', 'XPEV',
    'AMC', 'OPEN', 'RKT', 'SKLZ', 'SPCE', 'GEVO', 'IDEX', 'MVIS',
    'OCGN', 'SENS', 'TLRY', 'ZOM', 'PLUG', 'FCEL', 'BLNK', 'WKHS',
    'RIDE', 'NAKD', 'SAVA', 'BNGO', 'UUUU', 'DNA', 'IONQ', 'RKLB', 'JOBY'
]

# Index symbols that require the ^ prefix for Yahoo Finance API
INDEX_SYMBOLS = {'DJI', 'GSPC', 'IXIC', 'RUT', 'VIX', 'TNX', 'TYX', 'FVX', 'IRX'}

# Fallback market data when APIs are rate limited
FALLBACK_MARKET_DATA = {
    'SPY': {'price': 689.23, 'change': 0.25, 'change_pct': 0.04},
    'QQQ': {'price': 622.72, 'change': 1.96, 'change_pct': 0.32},
    'VOO': {'price': 633.83, 'change': 0.26, 'change_pct': 0.04},
    '^GSPC': {'price': 6118.71, 'change': 2.26, 'change_pct': 0.04},
    '^DJI': {'price': 44424.25, 'change': -140.82, 'change_pct': -0.32},
    '^IXIC': {'price': 21774.21, 'change': 99.66, 'change_pct': 0.46},
    '^VIX': {'price': 18.21, 'change': -0.5, 'change_pct': -2.67},
    '^TNX': {'price': 4.52, 'change': 0.02, 'change_pct': 0.44},
    'AAPL': {'price': 222.64, 'change': -0.77, 'change_pct': -0.34},
    'MSFT': {'price': 438.12, 'change': 11.47, 'change_pct': 2.69},
    'GOOGL': {'price': 198.05, 'change': -0.22, 'change_pct': -0.11},
    'AMZN': {'price': 234.12, 'change': 4.73, 'change_pct': 2.06},
    'NVDA': {'price': 147.07, 'change': 2.21, 'change_pct': 1.53},
    'META': {'price': 647.49, 'change': 10.95, 'change_pct': 1.72},
    'TSLA': {'price': 426.50, 'change': 1.89, 'change_pct': 0.45},
}

# Market regime thresholds
REGIME_THRESHOLDS = {
    'vix_low': 15,       # Below this = low fear
    'vix_normal': 20,    # Normal range
    'vix_elevated': 25,  # Elevated fear
    'vix_high': 30,      # High fear
    'vix_extreme': 40,   # Extreme fear / panic
}

# Score interpretation thresholds
SCORE_THRESHOLDS = {
    'strong_buy': 75,
    'buy': 60,
    'hold_upper': 55,
    'hold_lower': 45,
    'sell': 30,
    # Below 30 = strong sell
}

# Default factor weights (adjusted by market regime)
DEFAULT_FACTOR_WEIGHTS = {
    'technical': 0.40,
    'fundamental': 0.30,
    'valuation': 0.15,
    'sentiment': 0.10,
    'catalyst': 0.05,
}

# Risk-free rate approximation (10-year treasury)
RISK_FREE_RATE = 0.045  # 4.5%

# Market risk premium for WACC calculation
MARKET_RISK_PREMIUM = 0.055  # 5.5%
