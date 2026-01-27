# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StockPulse (Investment Scorer) is an AI-powered real-time stock analysis platform. It calculates investment scores (1-100) using a 5-layer conviction-based scoring system with 15+ technical indicators, fundamental metrics, market sentiment analysis, and stock screening capabilities.

**Key principle**: Real-time analysis, stateless architecture, paper trading only.

## Project Structure

```
/
├── app.py                    # Flask backend (~4300 lines - routes + legacy scoring)
├── requirements.txt          # Python dependencies
├── Dockerfile               # Container configuration
├── docker-compose.yml       # Service orchestration
├── Procfile                 # Heroku/Railway deployment
├── railway.json             # Railway.app deployment config
├── render.yaml              # Render deployment config
├── .env.example             # Environment variable template
├── analyzers/               # V2 layered scoring system
│   ├── base.py              # Abstract base analyzer
│   ├── quality_gate.py      # Quality gate (pass/fail filter)
│   ├── intrinsic_value.py   # Multi-method valuation (DCF, P/E, PEG, PB)
│   ├── market_regime.py     # Market environment detection
│   ├── technical_confluence.py # Signal clustering analysis
│   ├── catalyst.py          # Event/timing analysis
│   └── score_combiner.py    # Score aggregation logic
├── data/                    # Data fetching and caching
│   ├── cache.py             # Thread-safe TTL-based caching
│   ├── fetchers.py          # Stock data fetchers
│   ├── backtester.py        # Backtesting engine (SQLite storage)
│   ├── reddit_sentiment.py  # Reddit sentiment analysis
│   ├── insider_trading.py   # Insider trading data (SEC/yfinance)
│   ├── short_interest.py    # Short interest analysis
│   ├── relative_strength.py # Sector relative strength
│   └── economic_calendar.py # Economic data from FRED API
├── lib/                     # Backend utilities
│   ├── db_service.py        # Supabase database service
│   └── supabase_client.py   # Supabase client singleton
├── models/                  # Database models and constants
│   └── constants.py
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
    │   ├── (tabs)/          # Tab navigation screens (8 tabs)
    │   │   ├── index.tsx    # Overview/Snapshot (penny stocks, shorts)
    │   │   ├── analyze.tsx  # Stock Analysis
    │   │   ├── screener.tsx # Stock Screener
    │   │   ├── earnings.tsx # Earnings Calendar
    │   │   ├── trading.tsx  # Paper Trading
    │   │   ├── watchlist.tsx # Watchlist management
    │   │   ├── profile.tsx  # User profile & settings
    │   │   └── chat.tsx     # AI Chat (placeholder)
    │   ├── auth/            # Authentication screens
    │   │   ├── _layout.tsx  # Auth layout
    │   │   ├── login.tsx    # Login screen
    │   │   └── signup.tsx   # Sign-up screen
    │   ├── _layout.tsx      # Root layout + providers
    │   └── stock/[ticker].tsx # Deep link stock detail
    ├── components/          # Platform-adaptive UI components
    │   ├── ui/              # Surface, Card, Button, Badge, Input, Loading
    │   ├── stocks/          # StockCard, StockList, IndicatorCard, PriceDisplay
    │   ├── market/          # SentimentHeader, MarketStrip, NewsItem
    │   ├── charts/          # ScoreCircle (animated SVG)
    │   └── sheets/          # Bottom sheet system
    │       ├── SheetProvider.tsx      # Context provider for sheet management
    │       ├── StockAnalysisSheet.tsx # Stock analysis modal
    │       ├── GlossarySheet.tsx      # Financial glossary with term lookup
    │       ├── SheetBackground.tsx    # Custom glass background
    │       └── TappableTerm.tsx       # Interactive glossary term component
    ├── lib/                 # API client, types, utils
    │   ├── api.ts           # API client with Supabase auth token injection
    │   ├── config.ts        # API config with platform detection
    │   ├── types.ts         # TypeScript interfaces
    │   ├── supabase.ts      # Supabase client config
    │   ├── glossary.ts      # Financial terms dictionary
    │   ├── platform.ts      # Platform-specific utilities
    │   └── utils.ts         # Helper functions
    ├── stores/              # Zustand state management
    │   ├── useAuthStore.ts      # Authentication state
    │   ├── useAnalysisStore.ts  # Stock analysis cache
    │   ├── useMarketStore.ts    # Market data
    │   ├── useTradingStore.ts   # Paper trading state
    │   └── useWatchlistStore.ts # User watchlist
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

# Type checking
npm run typecheck

# Build for production
npx expo export --platform web    # Web export
npx eas build --platform ios      # iOS build (EAS)
npx eas build --platform android  # Android build (EAS)
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

### V2 Layered Scoring System (`analyzers/`)

The scoring system uses a 5-layer conviction-based architecture:

| Layer | Analyzer | Description |
|-------|----------|-------------|
| 1 | `quality_gate.py` | Pass/fail filter for company quality |
| 2 | `intrinsic_value.py` | Multi-method valuation (DCF, P/E, PEG, P/B) |
| 3 | `market_regime.py` | Market environment detection |
| 4 | `technical_confluence.py` | Signal clustering analysis |
| 5 | `catalyst.py` | Event and timing analysis |
| - | `score_combiner.py` | Aggregates all layer scores |

Controlled by `USE_LAYERED_SCORING=true` in `.env`.

### Data Layer (`data/`)

5 free data integrations plus caching and backtesting:

| Module | Description |
|--------|-------------|
| `cache.py` | Thread-safe TTL-based caching |
| `fetchers.py` | Stock data fetchers |
| `backtester.py` | Backtesting engine with SQLite storage |
| `reddit_sentiment.py` | Reddit sentiment for catalyst analysis |
| `insider_trading.py` | SEC EDGAR insider trading data |
| `short_interest.py` | Short interest analysis |
| `relative_strength.py` | Sector relative strength comparison |
| `economic_calendar.py` | FRED economic indicators |

### Legacy Core Components in `app.py`

| Component | Description |
|-----------|-------------|
| `NewsAnalyzer` | Fetches stock news via yfinance, analyzes sentiment |
| `TechnicalAnalyzer` | Support/resistance levels, pattern detection |
| `get_vix()` | Fetches VIX (fear index) from Yahoo Finance |
| `get_market_sentiment()` | Aggregates VIX, treasury yields, S&P 500 trends |
| `get_earnings_data()` | Historical earnings surprises, analyst targets |
| `calculate_fundamental_score()` | P/E, PEG, margins, growth, ROE scoring |
| `calculate_technical_score()` | RSI, MACD, Bollinger, Stochastic, ADX, etc. |
| `calculate_investment_score()` | Legacy scoring (65% tech + 35% fundamental) |
| `calculate_investment_score_v2()` | V2 layered scoring (default) |
| `screen_stocks()` | Parallel screening of 100 stocks |

### Backend Services (`lib/`)

| Module | Description |
|--------|-------------|
| `db_service.py` | Supabase database service with RLS |
| `supabase_client.py` | Supabase client singleton |

### Mobile App Architecture

| Layer | Technology | Description |
|-------|------------|-------------|
| Framework | Expo SDK 54 | Universal app (iOS, Android, Web) |
| Navigation | Expo Router v6 | File-based routing with deep links |
| iOS UI | Liquid Glass (`expo-glass-effect`) | iOS 26+ glass effects |
| Android UI | React Native Paper v5 | Material Design 3 Expressive |
| Web UI | CSS glassmorphism | Backdrop-filter based styling |
| State | Zustand v5 | Lightweight state management |
| Animations | Reanimated v4 | Spring-based animations |
| HTTP | Axios | API client with Supabase auth interceptors |
| Auth | Supabase | JWT-based authentication |
| Sheets | @gorhom/bottom-sheet v5 | Modal bottom sheets |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serves the main SPA |
| `/stock/<ticker>` | GET | Stock detail page |
| `/api/analyze` | POST | Analyze stock: `{"ticker": "AAPL"}` |
| `/api/screen` | GET | Screen stocks: `?filter=strong_buys&limit=20` |
| `/api/market-sentiment` | GET | VIX, treasury yields, S&P 500 data |
| `/api/snapshot` | GET | Full market snapshot for mobile app |
| `/api/speak` | POST | Text-to-speech via ElevenLabs (optional) |
| `/api/stock/<ticker>/chart` | GET | Chart data for ticker |
| `/api/analysis/history/<ticker>` | GET | Analysis history |
| `/api/analysis/latest/<ticker>` | GET | Latest analysis (Supabase-backed) |
| `/api/reddit-sentiment` | GET | Reddit sentiment analysis |
| `/api/insider-trading` | GET | Insider trading data (SEC EDGAR) |
| `/api/short-interest` | GET | Short interest analysis |
| `/api/relative-strength` | GET | Sector relative strength |
| `/api/economic-context` | GET | FRED economic indicators |
| `/api/backtest` | GET | Backtesting engine |
| `/api/backtest/record` | POST | Record score for backtest |
| `/api/trading-sim/status` | GET | Trading simulator status |
| `/api/trading-sim/history` | GET | Trade history |
| `/api/trading-sim/trades` | GET | Current trades |
| `/api/trading-sim/execute` | POST | Execute trade |
| `/api/trading-sim/reset` | POST | Reset simulator |
| `/api/trading-sim/manual-trade` | POST | Manual trade entry |
| `/api/trading-sim/close-position` | POST | Close position |
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
Platform.OS === 'ios'     // iOS Liquid Glass style (expo-glass-effect)
Platform.OS === 'android' // Material Design 3
Platform.OS === 'web'     // CSS glassmorphism (backdrop-filter)
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
- Bottom sheet modals for stock analysis and financial glossary
- `TappableTerm` for inline glossary lookups in trading cards

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
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret for token validation |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `ENABLE_HSTS` | No | Enable HSTS headers (default: false) |
| `FLASK_DEBUG` | No | Enable Flask debug mode (default: false) |
| `USE_LAYERED_SCORING` | No | Enable v2 scoring system (default: true) |
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
pytz>=2023.3
requests>=2.28.0
supabase>=2.0.0
python-dotenv>=1.0.0
PyJWT>=2.0.0
```

### Mobile App
```
expo ~54.0.32
expo-router ^6.0.22
react 19.1.0
react-native 0.81.5
react-native-paper ^5.14.5
react-native-reanimated ~4.1.1
expo-haptics ^15.0.8
expo-glass-effect ~0.1.8
expo-blur ~15.0.8
@gorhom/bottom-sheet ^5.2.8
@supabase/supabase-js ^2.49.1
@react-native-async-storage/async-storage ^2.1.2
axios ^1.13.3
zustand ^5.0.10
```

## Key Implementation Details

1. **Parallel Processing**: Stock screening uses `ThreadPoolExecutor` for concurrent analysis
2. **V2 Scoring**: 5-layer conviction-based system (quality gate, intrinsic value, market regime, technical confluence, catalyst) replaces single-pass scoring
3. **Caching**: Thread-safe TTL-based caching in `data/cache.py`
4. **Authentication**: Supabase JWT validation with RLS (Row-Level Security)
5. **Backtesting**: SQLite-backed engine tracking hit rates, Sharpe ratios, and drawdowns
6. **Error Handling**: Each indicator calculation is wrapped in try/except to prevent single failures from crashing analysis
7. **Rate Limiting**: None implemented - relies on yfinance's built-in handling
8. **Mobile UI**: Platform-adaptive components with Liquid Glass (iOS), Material Design 3 (Android), and glassmorphism (web)
9. **Data Integrations**: Reddit sentiment, insider trading (SEC EDGAR), short interest, sector relative strength, FRED economic data

## Deployment

| Platform | Config File | Notes |
|----------|-------------|-------|
| Docker | `docker-compose.yml` | Full container orchestration |
| Heroku/Railway | `Procfile` | Gunicorn, 2 workers, 4 threads |
| Railway | `railway.json` | NIXPACKS builder, health check at `/health` |
| Render | `render.yaml` | Python 3.11 runtime |
| Daytona | `.daytona/config.yaml` | Cloud workspace |

## Disclaimer

Educational purposes only. Not financial advice.
