# Investment Scorer - Developer Guide

## Project Overview

Investment Scorer is an AI-powered real-time stock analysis platform. It calculates comprehensive investment scores (1-100) based on a blend of technical analysis, fundamental metrics, and market sentiment.

**Key Features:**
*   **Real-time Analysis:** Live market data via `yfinance`.
*   **Investment Scoring:** 1-100 score with recommendations from STRONG SELL to STRONG BUY.
*   **Technical Analysis:** 15+ indicators including RSI, MACD, Bollinger Bands, and Candlestick Pattern detection.
*   **Fundamental Analysis:** Evaluation of P/E, PEG, margins, growth, and ROE.
*   **Market Sentiment:** Aggregates VIX, consumer sentiment, and news impact analysis.
*   **Voice Summaries:** Narrated research briefings using ElevenLabs (optional).
*   **Stock Screener:** Parallelized screening of a 100-stock universe.
*   **Progressive Web App:** Installable as a native app on all platforms.
*   **Universal Mobile App:** React Native + Expo app for iOS, Android, and Web.

## Architecture

*   **Backend:** Python/Flask in `app.py`. A single-file core (approx. 3800 lines) containing all scoring logic, data fetching, and API endpoints.
*   **Web Frontend:** React SPA in `frontend/`. Built assets are served by the Flask app from `frontend/build/`.
*   **Mobile App:** React Native + Expo universal app in `mobile/`. Supports iOS, Android, and Web with platform-adaptive UI.
*   **Static Assets:** `templates/index.html` and `static/` provide additional UI components and styling.
*   **Deployment:** Containerized with Docker and configured for Daytona cloud development.

## Project Structure

```
/
├── app.py                    # Core Flask backend (Scoring engine & API)
├── requirements.txt          # Python dependencies
├── Dockerfile               # Container configuration
├── docker-compose.yml       # Service orchestration
├── AGENTS.md                # Detailed repository guidelines
├── CLAUDE.md                # Claude Code specific guidance
├── README.md                # Public project overview
├── .daytona/                # Daytona workspace configuration
├── .devcontainer/           # Dev container configuration
├── frontend/                # React web frontend
│   ├── src/                 # React components and hooks
│   └── package.json         # Node.js dependencies
├── static/                  # Static assets and PWA service worker
├── templates/               # HTML templates (index.html)
└── mobile/                  # React Native + Expo universal app
    ├── app/                 # Expo Router screens
    │   ├── (tabs)/          # Tab navigation
    │   │   ├── index.tsx    # Overview screen
    │   │   ├── analyze.tsx  # Stock analysis
    │   │   ├── screener.tsx # Stock screener
    │   │   ├── earnings.tsx # Earnings calendar
    │   │   └── trading.tsx  # Paper trading
    │   ├── _layout.tsx      # Root layout with providers
    │   └── stock/[ticker].tsx # Stock detail (deep link)
    ├── components/          # Platform-adaptive components
    │   ├── ui/              # Base UI (Surface, Card, Button, etc.)
    │   ├── stocks/          # Stock components
    │   ├── market/          # Market data components
    │   └── charts/          # Chart components
    ├── lib/                 # Utilities and API client
    ├── stores/              # Zustand state management
    ├── constants/           # Theme configuration
    └── package.json         # Dependencies
```

## Setup and Development

### Local Development

**Backend (Python 3.10+):**
```bash
pip install -r requirements.txt
python app.py
# Server runs at http://localhost:8080
```

**Web Frontend (Node.js & npm):**
```bash
cd frontend
npm install
npm start
# Runs at http://localhost:3000
```

**Mobile App (Expo):**
```bash
cd mobile
npm install

# Start development server
npx expo start

# Platform-specific
npx expo start --ios      # iOS Simulator (requires Xcode)
npx expo start --android  # Android Emulator
npx expo start --web      # Web browser

# Type checking
npx tsc --noEmit

# Production builds
npx expo export --platform web   # Web export
npx expo build:ios               # iOS App Store
npx expo build:android           # Google Play Store
```

**Production Build:**
```bash
cd frontend && npm run build
# Flask will now serve the updated frontend from build/
```

### Daytona Deployment

This project is optimized for [Daytona](https://www.daytona.io/).
```bash
daytona create https://github.com/rishabhbansal/StockPulse
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serves the main SPA |
| `/api/snapshot` | GET | Comprehensive market snapshot (VIX, Top Buys, Shorts, News) |
| `/api/analyze` | POST | Analyze a single ticker: `{"ticker": "AAPL"}` |
| `/api/stock/<ticker>/chart` | GET | Historical chart data and stock details |
| `/api/screen` | GET | Screen 100 stocks: `?filter=strong_buys&limit=20` |
| `/api/market-sentiment` | GET | VIX, treasury yields, and S&P 500 trends |
| `/api/speak` | POST | Text-to-speech via ElevenLabs: `{"text": "..."}` |
| `/health` | GET | Health check |

## Scoring Algorithm

The Investment Score (1-100) is calculated as:
**Final Score = (Technical Score * 0.65) + (Fundamental Score * 0.35)**

### Technical Indicator Weights (within Technical Score)

| Indicator | Weight | Description |
|-----------|--------|-------------|
| Candlestick Patterns | 16% | Pattern detection and trend analysis |
| Earnings Surprise | 10% | Average surprise over last 4 quarters |
| Moving Averages | 9% | SMA 20/50/200 and Golden/Death Crosses |
| VIX (Fear Index) | 8% | Market-wide volatility sentiment |
| RSI | 7% | Relative Strength Index (14-period) |
| MACD | 7% | Moving Average Convergence Divergence |
| News Sentiment | 7% | NLP-based sentiment from recent news |
| ADX | 5% | Average Directional Index (trend strength) |
| Bollinger Bands | 5% | Price position relative to volatility bands |
| Stochastic | 5% | Momentum oscillator |
| MFI / OBV | 8% | Money Flow Index (4%) and On-Balance Volume (4%) |
| Others | 13% | Williams %R, CCI, VWAP, Consumer Sentiment |

### Score Interpretation

| Score | Recommendation | Action |
|-------|---------------|--------|
| 75-100 | STRONG BUY | Long with high confidence |
| 60-74 | BUY | Long with medium confidence |
| 45-59 | HOLD | Wait for clearer signals |
| 30-44 | SELL | Short with medium confidence |
| 1-29 | STRONG SELL | Short with high confidence |

## Mobile App Architecture

### Platform-Adaptive UI

The mobile app uses platform-specific styling for native look and feel:

| Platform | Design System | Implementation |
|----------|--------------|----------------|
| iOS 26+ | Liquid Glass | Glass effects, vibrancy, subtle shadows |
| Android | Material Design 3 | Tonal elevation, surface containers |
| Web | CSS Glassmorphism | backdrop-filter, semi-transparent surfaces |

### Key Technologies

| Technology | Purpose |
|------------|---------|
| Expo SDK 54 | Universal app framework |
| Expo Router v4 | File-based navigation with deep links |
| React Native Paper v5 | Material Design 3 components (Android) |
| React Native Reanimated | Spring-based animations |
| expo-haptics | Haptic feedback (iOS/Android) |
| Zustand | Lightweight state management |
| Axios | HTTP client with interceptors |

### Component Architecture

```typescript
// Platform-adaptive component pattern
export function Component({ ...props }) {
  return (
    <View style={[
      styles.base,
      Platform.OS === 'ios' && styles.ios,
      Platform.OS === 'android' && styles.android,
    ]}>
      {Platform.OS === 'ios' && <View style={styles.iosGlow} />}
      {/* Content */}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { /* shared styles */ },
  ios: {
    backgroundColor: colors.ios.glassRegular,
    borderColor: colors.ios.glassBorderMedium,
  },
  android: {
    backgroundColor: colors.android.surfaceContainer,
    elevation: 2,
  },
  iosGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.ios.vibrancyLight,
  },
});
```

### Animation System

```typescript
// Spring presets from constants/theme.ts
animation.spring.snappy  // Quick interactive feedback
animation.spring.bouncy  // Playful release effect
animation.spring.gentle  // Smooth entrance animations

// Usage
const pressed = useSharedValue(0);

const handlePressIn = () => {
  pressed.value = withSpring(1, animation.spring.snappy);
};

const handlePressOut = () => {
  pressed.value = withSpring(0, animation.spring.bouncy);
};
```

### Theme Configuration

```typescript
// constants/theme.ts exports:
export const colors = {
  // Base colors
  primary: '#22c55e',
  background: '#0a0a0a',
  surface: '#161616',
  text: '#fafafa',

  // iOS Liquid Glass
  ios: {
    glassUltraThin: 'rgba(18, 18, 18, 0.4)',
    glassThin: 'rgba(20, 20, 20, 0.55)',
    glassRegular: 'rgba(22, 22, 22, 0.72)',
    glassThick: 'rgba(24, 24, 24, 0.85)',
    glassBorderLight: 'rgba(255, 255, 255, 0.12)',
    glassBorderMedium: 'rgba(255, 255, 255, 0.08)',
    vibrancyLight: 'rgba(255, 255, 255, 0.06)',
  },

  // Android Material Design 3
  android: {
    primary: '#22c55e',
    surfaceContainer: '#1a1a1a',
    surfaceContainerHigh: '#222222',
    outlineVariant: '#333333',
  },

  // Score colors
  strongBuy: '#22c55e',
  buy: '#4ade80',
  hold: '#eab308',
  sell: '#f97316',
  strongSell: '#ef4444',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const fontSize = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, '2xl': 24, '3xl': 30 };
export const borderRadius = { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 };
```

## Development Conventions

*   **Logic Consolidation:** Core scoring logic resides in `app.py`. Ensure any new indicators are added to the `calculate_technical_score` or `calculate_fundamental_score` functions.
*   **Statelessness:** The backend is designed to be stateless. Data is fetched fresh from `yfinance` with minimal caching.
*   **Error Handling:** Every indicator calculation is wrapped in try-except blocks to ensure the overall score remains available even if specific data points are missing.
*   **Web Frontend UI:** Dark theme, responsive design using Tailwind CSS. Components are modularized in `frontend/src/components`.
*   **Mobile App UI:** Platform-adaptive components with iOS glass effects, Android Material Design 3, and web glassmorphism fallback.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ELEVENLABS_API_KEY` | No | Required for the "Speak Analysis" feature |
| `ELEVENLABS_VOICE_ID` | No | Custom voice ID (default: Adam) |
| `FLASK_ENV` | No | Set to `development` for auto-reloading |
| `EXPO_PUBLIC_API_URL` | No | Backend API URL for mobile app |

## Backend Deployment (for Mobile)

The mobile app requires a publicly accessible backend. Options:

| Platform | Setup |
|----------|-------|
| Railway | `railway up` or connect GitHub |
| Render | Connect GitHub, auto-deploy |
| Vercel | For web frontend only |

After deployment, update `mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://your-deployed-backend.railway.app
```

## Disclaimer

This tool is for educational purposes only. It is not financial advice. All analysis is hypothetical and based on historical data.
