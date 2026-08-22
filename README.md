# StockPulse

**StockPulse** is a stock-analysis platform that calculates a transparent **Investment Score (1-100)** from data quality, intrinsic value, market regime, technical confluence, and catalysts.

Whether you are a day trader or long-term investor, Investment Scorer helps you cut through the noise with clear **Buy/Sell recommendations**, real-time data, and AI-driven insights.

## Features

- **Investment Score (1-100)**: Canonical v3 layered scoring with confidence and data-quality metadata
- **Technical Analysis**: RSI, MACD, Bollinger Bands, Stochastic, Williams %R, CCI, ADX, MFI, OBV, VWAP
- **Fundamental Analysis**: P/E, PEG, Profit Margins, Revenue Growth, ROE, Debt/Equity
- **Market Sentiment**: VIX, Treasury Yields, S&P 500 trends
- **Stock Screener**: Find strong buys, sells, and short opportunities
- **Price Targets**: Entry, exit, and stop-loss levels
- **Earnings Data**: Historical earnings surprises and analyst targets

## Quick Start (Local)

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py

# Open browser to http://localhost:8080
```

Run the deterministic backend checks with `pytest -q`. Mobile checks are
`npm run typecheck` and `npm test -- --runInBand` from `mobile/`.

## Runtime Performance

- Independent market-data inputs are fetched concurrently and protected by a
  bounded in-process LRU/TTL cache.
- Identical concurrent cache misses are coalesced so only one upstream request
  reaches Stooq or Yahoo Finance.
- Large JSON/HTML responses are compressed, while public market-data reads use
  short browser cache windows and all mutations remain `no-store`.
- Production launches share `gunicorn.conf.py` across Docker, Railway, Render,
  and the Procfile. Tune with `WEB_CONCURRENCY`, `GUNICORN_THREADS`,
  `GUNICORN_TIMEOUT`, and `STOCKPULSE_FETCH_WORKERS`.

## Daytona Cloud Deployment

This project is configured for [Daytona](https://www.daytona.io/) cloud development environments.

### Prerequisites

- Daytona CLI installed
- Daytona account configured

### Deploy with Daytona

```bash
# Create a new workspace
daytona create https://github.com/YOUR_USERNAME/investment-scorer

# Or from local directory
daytona create .

# The workspace will automatically:
# 1. Set up Python 3.11 environment
# 2. Install all dependencies
# 3. Start the Flask server on port 8080
# 4. Forward ports for browser access
```

### Daytona Configuration

The project includes:

- `.devcontainer/devcontainer.json` - Dev container configuration
- `.daytona/config.yaml` - Daytona workspace settings
- `docker-compose.yml` - Multi-service orchestration
- `Dockerfile` - Production-ready container

## API Endpoints

### Analyze Stock

```bash
POST /api/analyze
Content-Type: application/json
{"ticker": "AAPL"}
```

### Screen Stocks

```bash
GET /api/screen?filter=strong_buys&limit=20
# Filters: all, strong_buys, buys, sells, strong_sells, shorts
```

### Market Sentiment

```bash
GET /api/market-sentiment
```

## Scoring Algorithm

The v3 score combines five evidence layers. Applicability and data quality are
reported separately, so unavailable fundamentals are not silently treated as a
neutral signal.

### Score Interpretation

| Score  | Recommendation | Action                       |
| ------ | -------------- | ---------------------------- |
| 75-100 | STRONG BUY     | Long with high confidence    |
| 60-74  | BUY            | Long with medium confidence  |
| 45-59  | HOLD           | Wait for clearer signals     |
| 30-44  | SELL           | Short with medium confidence |
| 1-29   | STRONG SELL    | Short with high confidence   |

## Technical Indicators Used

| Indicator            | Weight | Description                                |
| -------------------- | ------ | ------------------------------------------ |
| Candlestick Patterns | 16%    | Pattern detection and trend analysis       |
| Earnings             | 10%    | Historical earnings surprises              |
| Moving Averages      | 9%     | SMA 20/50/200, Golden/Death Cross          |
| VIX                  | 8%     | Market fear gauge                          |
| RSI                  | 7%     | Relative Strength Index (14-period)        |
| MACD                 | 7%     | Moving Average Convergence Divergence      |
| News Sentiment       | 7%     | NLP-based news sentiment                   |
| ADX                  | 5%     | Average Directional Index (trend strength) |
| Bollinger Bands      | 5%     | Price position within bands                |
| Stochastic           | 5%     | Stochastic Oscillator                      |
| MFI                  | 4%     | Money Flow Index                           |
| OBV                  | 4%     | On-Balance Volume                          |
| Williams %R          | 3%     | Overbought/oversold                        |
| CCI                  | 3%     | Commodity Channel Index                    |
| VWAP                 | 3%     | Volume Weighted Average Price              |
| Consumer Sentiment   | 4%     | Retail sentiment analysis                  |

## New: Market Snapshot Dashboard

The landing page now features a comprehensive Market Snapshot:

- **Market Sentiment Bar**: VIX, Fear/Greed Index, S&P 500 trend, Treasury yields
- **Top BUY Signals**: Stocks with highest investment scores
- **Short Candidates**: Stocks with lowest scores for short opportunities
- **Daily Movers**: Biggest gainers and losers
- **Market News**: Aggregated news with sentiment analysis
- Click any stock to view detailed charts and analysis

### New API Endpoints

```bash
# Market Snapshot (all data in one call)
GET /api/snapshot

# Stock chart and details
GET /api/stock/AAPL/chart

# Stock detail page
GET /stock/AAPL
```

## 📱 Install as Native App (PWA)

Investment Scorer is a **Progressive Web App (PWA)**. You can install it directly to your home screen on iOS, Android, macOS, and Windows for a full-screen, native, and offline-capable experience.

### **iOS (iPhone & iPad)**

1. Open the website in **Safari**
2. Tap the **Share** button (square with arrow up)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top right

### **Android (Chrome)**

1. Open the website in **Chrome**
2. Tap the **Menu** button (three dots)
3. Tap **"Install app"** or **"Add to Home Screen"**
4. Confirm by tapping **"Install"**

### **Mac & Windows (Chrome/Edge)**

1. Open the website in your browser
2. Look for the **Install icon** (monitor with arrow) in the address bar (right side)
3. Click **"Install"**
4. The app will launch in its own window via Chrome/Edge

## PWA Features

- **Offline Support**: Static assets are cached for offline access
- **Native App Experience**: Runs in standalone mode without browser UI
- **Touch Optimized**: Dark theme UI designed for mobile
- **Resilient Data**: Public market reads prefer the network and clearly mark cached offline fallbacks

## Disclaimer

This tool is for educational purposes only. The investment score and recommendations are based on technical and fundamental analysis and should not be considered financial advice. Always do your own research and consult with a qualified financial advisor before making investment decisions.

## License

MIT
