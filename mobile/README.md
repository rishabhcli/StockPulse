# StockPulse Mobile App

A universal React Native + Expo app for iOS, Android, and Web with platform-adaptive UI.

## Features

- **5 Tab Screens**: Overview, Analyze, Screener, Earnings, Paper Trading
- **Platform-Adaptive UI**:
  - iOS: Glassmorphism (Liquid Glass ready for iOS 26+)
  - Android: Material Design 3
  - Web: CSS glassmorphism
- **Real-time Analysis**: Integration with StockPulse Flask API
- **Animated Components**: Score circles, transitions with Reanimated

## Quick Start

### Prerequisites

- Node.js 20+
- Expo tooling through the project-local `npx expo` command
- For iOS: Xcode 15+ (macOS only)
- For Android: Android Studio with emulator

### Development

```bash
# Install dependencies
cd mobile
npm ci

# Start development server
npm start

# Platform-specific
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser

# Validation
npm run typecheck
npm test -- --runInBand
```

### Running the Backend

The app requires the Flask API to be running:

```bash
# From project root
pip install -r requirements.txt
python app.py
# API runs on http://localhost:8080
```

### Physical Device Testing

For testing on a physical device, you need to configure the API URL:

1. Find your computer's local IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   # Windows
   ipconfig
   ```

2. Create a `.env` file in the mobile directory:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and set your IP:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.XXX:8080
   ```

4. Make sure your Flask server binds to all interfaces:
   ```bash
   python app.py --host 0.0.0.0
   ```

## Production Deployment

### Deploy Backend to Railway

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login and deploy:
   ```bash
   cd /path/to/StockPulse
   railway login
   railway init
   railway up
   ```

3. Get your API URL from Railway dashboard

### Deploy Backend to Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Render will auto-detect the `render.yaml` configuration
4. Deploy!

### Update Mobile App for Production

1. Update `mobile/lib/config.ts`:
   ```typescript
   const PRODUCTION_API_URL = 'https://your-api-url.railway.app';
   ```

2. Or set environment variable:
   ```
   EXPO_PUBLIC_API_URL=https://your-api-url.railway.app
   ```

### Build for App Stores

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure builds
eas build:configure

# Build for iOS (requires Apple Developer account)
npm run build:ios

# Build for Android
npm run build:android

# Build for web
npm run build:web
```

## Project Structure

```
mobile/
├── app/                     # Expo Router screens
│   ├── _layout.tsx          # Root layout
│   ├── (tabs)/              # Tab screens
│   │   ├── index.tsx        # Overview
│   │   ├── analyze.tsx      # Analysis
│   │   ├── screener.tsx     # Screener
│   │   ├── earnings.tsx     # Earnings
│   │   └── trading.tsx      # Paper Trading
│   └── stock/[ticker].tsx   # Stock detail
├── components/
│   ├── ui/                  # Reusable UI components
│   ├── charts/              # Chart components
│   ├── stocks/              # Stock-related components
│   └── market/              # Market components
├── lib/
│   ├── api.ts               # API client
│   ├── config.ts            # Configuration
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # Utilities
├── stores/                  # Zustand state management
└── constants/               # Theme, colors
```

## Customization

### Theme Colors

Edit `constants/theme.ts`:

```typescript
export const colors = {
  primary: '#22c55e',     // Main accent color
  background: '#0a0a0a',  // App background
  surface: '#161616',     // Card backgrounds
  // ...
};
```

### App Icons

Generate app icons:

```bash
# Install sharp for icon generation
npm install sharp --save-dev

# Generate icons
npm run generate-icons
```

Or manually create:
- `assets/icon.png` (1024x1024)
- `assets/adaptive-icon.png` (1024x1024, for Android)
- `assets/splash-icon.png` (288x288)

## Enabling Liquid Glass (iOS 26+)

When Expo SDK supports `expo-glass-effect`:

1. Install the package:
   ```bash
   npx expo install expo-glass-effect
   ```

2. Update `components/ui/Surface.tsx` - uncomment the Liquid Glass sections

## Troubleshooting

### API Connection Issues

- **Android Emulator**: Uses `10.0.2.2` to access host localhost
- **iOS Simulator**: Uses `localhost` directly
- **Physical Device**: Must use computer's local IP address

### Build Issues

```bash
# Clear cache
npx expo start --clear

# Reset Metro bundler
rm -rf node_modules/.cache
```

## License

Educational purposes only. Not financial advice.
