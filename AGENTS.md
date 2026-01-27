# Repository Guidelines

## Project Structure & Module Organization

### Backend
- `app.py`: Flask API + server-side rendering, serves built React assets from `frontend/build` and HTML from `templates/index.html`.
- `templates/` and `static/`: Server-rendered assets (landing page, styling, any future static files).
- `frontend/`: Create React App PWA (React 18) for the client UI; built output is served by Flask in production.
- Platform configs: `.daytona/`, `.devcontainer/`, `docker-compose.yml`, and `Dockerfile` for local or Daytona-based environments.

### Mobile App
- `mobile/`: React Native + Expo universal app (iOS, Android, Web)
  - `app/`: Expo Router screens with file-based navigation
    - `(tabs)/`: Tab navigation (Overview, Analyze, Screener, Earnings, Trading)
    - `stock/[ticker].tsx`: Dynamic stock detail screen
  - `components/`: Platform-adaptive UI components
    - `ui/`: Base components (Surface, Card, Button, Badge, Input, Loading)
    - `stocks/`: Stock-specific (StockCard, StockList, IndicatorCard, PriceDisplay)
    - `market/`: Market data (SentimentHeader, MarketStrip, NewsItem)
    - `charts/`: Visualizations (ScoreCircle with animated SVG)
  - `lib/`: Shared utilities (api.ts, types.ts, utils.ts, config.ts)
  - `stores/`: Zustand state management
  - `constants/`: Theme configuration (colors, spacing, animations)

## Build, Test, and Development Commands

### Python Backend
```bash
pip install -r requirements.txt
python app.py  # Default port 8080
# Use FLASK_ENV=development for auto-reload
```

### React Frontend
```bash
cd frontend && npm install
npm start      # Dev server
npm run build  # Production build for Flask
```

### Mobile App
```bash
cd mobile && npm install

# Development
npx expo start           # Start dev server
npx expo start --ios     # iOS Simulator
npx expo start --android # Android Emulator
npx expo start --web     # Web browser

# Type checking
npx tsc --noEmit

# Production builds
npx expo export --platform web  # Web export to dist/
npx expo build:ios              # iOS App Store build
npx expo build:android          # Android Play Store build
```

### Docker
```bash
docker compose up --build  # Full stack with baked frontend
```

## Coding Style & Naming Conventions

### Python
- 4-space indent, keep functions cohesive in `app.py`
- Prefer separating helpers into modules if they grow
- Aim for Black/PEP8 style (88–100 cols)
- Use descriptive names for analyzers and indicators

### JavaScript/React (Web Frontend)
- Functional components, PascalCase for components, camelCase for props/state
- Stick to CRA defaults; lint with `npm run test`

### TypeScript/React Native (Mobile)
- Strict TypeScript with proper type annotations
- Platform-adaptive components using `Platform.OS` checks
- Component structure:
  ```typescript
  // ============================================================================
  // TYPES
  // ============================================================================
  interface ComponentProps { ... }

  // ============================================================================
  // COMPONENT
  // ============================================================================
  export function Component({ ... }: ComponentProps) { ... }

  // ============================================================================
  // STYLES
  // ============================================================================
  const styles = StyleSheet.create({ ... });

  export default Component;
  ```
- Animation conventions:
  - Use Reanimated's `withSpring` for interactive feedback
  - Use `withTiming` for non-interactive transitions
  - Haptic feedback on all tappable elements (non-web)
- Platform styling pattern:
  ```typescript
  style={[
    styles.base,
    Platform.OS === 'ios' && styles.ios,
    Platform.OS === 'android' && styles.android,
  ]}
  ```

### Templates/CSS
- Keep inline styles minimal; prefer extracting shared styles

## Testing Guidelines

### Backend API
Validate endpoints manually with `curl`/Postman:
- `POST /api/analyze` with `{"ticker":"AAPL"}`
- `GET /api/screen?filter=strong_buys&limit=20`
- `GET /api/market-sentiment`
- `GET /api/snapshot`

### Web Frontend
- `npm test` (CRA) for basic sanity
- Manual QA in browser for scoring flows and PWA install

### Mobile App
```bash
cd mobile

# Type checking
npx tsc --noEmit

# Web export verification
npx expo export --platform web

# Manual testing
npx expo start --ios      # Test on iOS Simulator
npx expo start --android  # Test on Android Emulator
npx expo start --web      # Test in browser
```

Platform test checklist:
- [ ] iOS: Glass effects render correctly
- [ ] iOS: Haptic feedback works
- [ ] Android: M3 theme applies
- [ ] Android: Elevation shadows visible
- [ ] Web: Glassmorphism CSS renders
- [ ] All: API calls succeed
- [ ] All: Navigation works
- [ ] All: Animations smooth (60fps)

## Commit & Pull Request Guidelines

- Commits: concise, sentence-case subjects (e.g., `Add earnings sentiment endpoint`, `Tweak score weights`, `Enhance StockCard animations`)
- PRs: describe scope, list endpoints or UI changes, include screenshots/GIFs for frontend/mobile tweaks
- Note any new env vars or dependencies

## Configuration & Secrets

### Backend
- `ELEVENLABS_API_KEY` (optional) and `ELEVENLABS_VOICE_ID`
- Set in shell or compose overrides; do not commit secrets

### Web Frontend
- CRA defaults; no env required unless you add APIs (`REACT_APP_*`)

### Mobile App
- `EXPO_PUBLIC_API_URL`: Backend API URL (defaults to localhost:8080)
- Create `mobile/.env` from `mobile/.env.example`:
  ```
  EXPO_PUBLIC_API_URL=http://localhost:8080
  ```
- For production, deploy backend to Railway/Render and update URL

### Daytona
- Keep `.daytona/config.yaml` and `Dockerfile` in sync with dependency changes
- Rebuild images after Python/Node upgrades

## Mobile App Component Guidelines

### Creating New Components
1. Use platform-adaptive patterns from existing components
2. Include iOS glass styling, Android M3 styling, and web fallback
3. Add haptic feedback for interactive elements
4. Use spring animations from `constants/theme.ts`
5. Export from appropriate index.ts file

### Theme Usage
```typescript
import { colors, spacing, fontSize, borderRadius, animation } from '../../constants/theme';

// Platform colors
colors.ios.glassRegular      // iOS glass background
colors.android.surfaceContainer  // Android M3 surface
colors.surface               // Web/fallback surface
```

### Animation Presets
```typescript
import { animation } from '../../constants/theme';

// Press feedback
pressed.value = withSpring(1, animation.spring.snappy);

// Release feedback
pressed.value = withSpring(0, animation.spring.bouncy);

// Entrance animations
withSpring(0, animation.spring.gentle);
```
