# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Investment Scorer is an AI-powered real-time stock analysis platform. It calculates investment scores (1-100) based on 15+ technical indicators and fundamental metrics, with market sentiment analysis and stock screening capabilities.

**Key principle**: Real-time analysis, stateless architecture, paper trading only.

## Project Structure

```
/
├── app.py                    # Flask backend (~3800 lines - all logic)
├── requirements.txt          # Python dependencies
├── Dockerfile               # Container configuration
├── docker-compose.yml       # Service orchestration
├── .daytona/
│   └── config.yaml          # Daytona cloud workspace config
├── .devcontainer/
│   └── devcontainer.json    # Dev container configuration
├── templates/
│   └── index.html           # Main SPA template (dark theme UI)
├── static/                  # Static assets
├── frontend/                # React frontend (optional)
│   ├── package.json
│   ├── public/
│   └── src/
└── mobile/                  # React Native + Expo universal app
    ├── app/                 # Expo Router screens
    │   ├── (tabs)/          # Tab navigation screens
    │   │   ├── index.tsx    # Overview/Snapshot
    │   │   ├── analyze.tsx  # Stock Analysis
    │   │   ├── screener.tsx # Stock Screener
    │   │   ├── earnings.tsx # Earnings Calendar
    │   │   └── trading.tsx  # Paper Trading
    │   ├── _layout.tsx      # Root layout + providers
    │   └── stock/[ticker].tsx # Deep link stock detail
    ├── components/          # Platform-adaptive UI components
    │   ├── ui/              # Surface, Card, Button, Badge, Input, Loading
    │   ├── stocks/          # StockCard, StockList, IndicatorCard, PriceDisplay
    │   ├── market/          # SentimentHeader, MarketStrip, NewsItem
    │   └── charts/          # ScoreCircle (animated SVG)
    ├── lib/                 # API client, types, utils
    ├── stores/              # Zustand state management
    ├── constants/           # Theme (colors, spacing, animations)
    └── package.json
```

## Common Commands

### Run the Backend

```bash
# Install dependencies and run
pip install -r requirements.txt
python app.py

# Server starts on http://localhost:8080
```

### Run the Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Platform-specific
npx expo start --ios      # iOS Simulator
npx expo start --android  # Android Emulator
npx expo start --web      # Web browser

# Build for production
npx expo export --platform web    # Web export
npx expo build:ios                # iOS build
npx expo build:android            # Android build
```

### Docker

```bash
docker-compose up --build      # Build and run
docker-compose up -d           # Detached mode
docker-compose logs -f         # View logs
docker-compose down            # Stop
```

### Daytona Deployment

```bash
daytona create .
# Or from GitHub:
daytona create https://github.com/rishabhbansal/StockPulse
```

## Architecture

### Core Components in `app.py`

| Component | Lines | Description |
|-----------|-------|-------------|
| `NewsAnalyzer` | 59-161 | Fetches stock news via yfinance, analyzes sentiment |
| `TechnicalAnalyzer` | 163-271 | Support/resistance levels, pattern detection |
| `get_vix()` | 273-283 | Fetches VIX (fear index) from Yahoo Finance |
| `get_market_sentiment()` | 285-354 | Aggregates VIX, treasury yields, S&P 500 trends |
| `get_earnings_data()` | 388-443 | Historical earnings surprises, analyst targets |
| `calculate_fundamental_score()` | 445-587 | P/E, PEG, margins, growth, ROE scoring |
| `calculate_technical_score()` | 589-881 | RSI, MACD, Bollinger, Stochastic, ADX, etc. |
| `calculate_investment_score()` | 986-1268 | Main scoring function (65% tech + 35% fundamental) |
| `screen_stocks()` | 1270-1320 | Parallel screening of 100 stocks |

### Mobile App Architecture

| Layer | Technology | Description |
|-------|------------|-------------|
| Framework | Expo SDK 54 | Universal app (iOS, Android, Web) |
| Navigation | Expo Router v4 | File-based routing with deep links |
| iOS UI | Liquid Glass ready | Platform-adaptive glass effects |
| Android UI | React Native Paper v5 | Material Design 3 Expressive |
| Web UI | CSS glassmorphism | Backdrop-filter based styling |
| State | Zustand | Lightweight state management |
| Animations | Reanimated | Spring-based animations |
| HTTP | Axios | API client with interceptors |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serves the main SPA |
| `/api/analyze` | POST | Analyze stock: `{"ticker": "AAPL"}` |
| `/api/screen` | GET | Screen stocks: `?filter=strong_buys&limit=20` |
| `/api/market-sentiment` | GET | VIX, treasury yields, S&P 500 data |
| `/api/snapshot` | GET | Full market snapshot for mobile app |
| `/api/speak` | POST | Text-to-speech via ElevenLabs (optional) |
| `/health` | GET | Health check endpoint |

### Screening Filters

- `all` - All 100 stocks in universe
- `strong_buys` - Score >= 75
- `buys` - Score 60-74
- `sells` - Score 30-44
- `strong_sells` - Score < 30
- `shorts` - Score < 40 (short candidates)

### Technical Indicators (with weights)

| Indicator | Weight | Function |
|-----------|--------|----------|
| Candlestick Patterns | 16% | Pattern detection |
| Earnings Surprise | 10% | Beat/miss history |
| Moving Averages | 9% | SMA 20/50/200 |
| VIX | 8% | Market fear gauge |
| RSI (14) | 7% | Overbought/oversold |
| MACD | 7% | Trend momentum |
| News Sentiment | 7% | NLP analysis |
| ADX | 5% | Trend strength |
| Bollinger Bands | 5% | Volatility position |
| Stochastic | 5% | Momentum oscillator |
| MFI | 4% | Money flow |
| OBV | 4% | Volume trend |
| Williams %R | 3% | Overbought/oversold |
| CCI | 3% | Price deviation |
| VWAP | 3% | Volume-weighted price |
| Consumer Sentiment | 4% | Retail sentiment |

### Score Interpretation

| Score | Recommendation | Action |
|-------|---------------|--------|
| 75-100 | STRONG BUY | Long with high confidence |
| 60-74 | BUY | Long with medium confidence |
| 45-59 | HOLD | Wait for clearer signals |
| 30-44 | SELL | Short with medium confidence |
| 1-29 | STRONG SELL | Short with high confidence |

## Mobile App UI Patterns

### Platform-Specific Styling

```typescript
// Components use Platform.OS for adaptive styling
Platform.OS === 'ios'     // iOS Liquid Glass style
Platform.OS === 'android' // Material Design 3
Platform.OS === 'web'     // CSS glassmorphism
```

### Animation Presets

```typescript
// Spring animations from constants/theme.ts
animation.spring.snappy  // { damping: 20, stiffness: 300, mass: 0.8 }
animation.spring.bouncy  // { damping: 8, stiffness: 200, mass: 1 }
animation.spring.gentle  // { damping: 15, stiffness: 120, mass: 1 }
```

### Component Patterns

- All interactive components use haptic feedback (expo-haptics)
- Cards/surfaces have iOS inner glow effect
- Android uses tonal elevation from M3
- Staggered entrance animations on lists

## Stock Universe

The screener analyzes 100 stocks across sectors:
- **Tech**: AAPL, MSFT, GOOGL, NVDA, META, AMD, etc.
- **Finance**: JPM, BAC, GS, V, MA, etc.
- **Healthcare**: JNJ, UNH, PFE, LLY, etc.
- **Consumer**: WMT, AMZN, HD, NKE, etc.
- **Energy**: XOM, CVX, COP, SLB, etc.
- **ETFs**: SPY, QQQ, IWM, XLF, XLE, etc.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ELEVENLABS_API_KEY` | No | For text-to-speech feature |
| `ELEVENLABS_VOICE_ID` | No | Voice ID (default: Adam) |
| `EXPO_PUBLIC_API_URL` | No | Backend API URL for mobile app |

## Dependencies

### Backend
```
flask>=2.0.0
flask-cors>=4.0.0
yfinance>=0.2.0
pandas>=1.5.0
numpy>=1.21.0
gunicorn>=21.0.0
redis>=4.0.0
```

### Mobile App
```
expo ~54.0.0
expo-router ~4.0.0
react-native-paper ^5.12.0
react-native-reanimated ~3.10.0
expo-haptics ~13.0.0
axios ^1.6.0
zustand ^4.5.0
```

## Key Implementation Details

1. **Parallel Processing**: Stock screening uses `ThreadPoolExecutor` for concurrent analysis
2. **Error Handling**: Each indicator calculation is wrapped in try/except to prevent single failures from crashing analysis
3. **Caching**: No caching - all data fetched fresh from Yahoo Finance
4. **Rate Limiting**: None implemented - relies on yfinance's built-in handling
5. **Mobile UI**: Platform-adaptive components with consistent design language

## Disclaimer

Educational purposes only. Not financial advice.
