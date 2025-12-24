# Frontend Migration Guide

## New Structure (FILOSOFIA_FRONTEND.md)

```
src/
├── components/
│   ├── home/
│   │   ├── HomePage.jsx        # NEW - Trading Lobby with Watchlist, Alerts
│   │   ├── HomePage.css
│   │   └── index.js
│   ├── match/
│   │   ├── MatchPage.jsx       # NEW - Main 3-zone layout
│   │   ├── MatchPage.css
│   │   ├── index.js
│   │   ├── layout/
│   │   │   ├── MatchHeader.jsx     # NEW - Scoreboard, odds
│   │   │   ├── MatchSidebar.jsx    # NEW - Tab navigation
│   │   │   ├── RightRail.jsx       # NEW - Strategy CTA
│   │   │   ├── LoadingSkeleton.jsx # NEW
│   │   │   ├── ErrorState.jsx      # NEW
│   │   │   └── index.js
│   │   └── tabs/
│   │       ├── OverviewTab.jsx     # NEW - Key stats, H2H
│   │       ├── StrategiesTab.jsx   # NEW - All strategies
│   │       ├── OddsTab.jsx         # NEW - Live odds, EV
│   │       ├── PointByPointTab.jsx # NEW - Timeline
│   │       ├── StatsTab.jsx        # NEW - Stats
│   │       ├── MomentumTab.jsx     # NEW - Trends
│   │       ├── PredictorTab.jsx    # NEW - Predictions
│   │       ├── JournalTab.jsx      # NEW - Trade log
│   │       └── index.js
├── hooks/
│   └── useMatchBundle.jsx      # NEW - Unified data consumption
├── motion/
│   ├── tokens.js               # Animation tokens
│   ├── MotionCard.jsx
│   ├── MotionButton.jsx
│   ├── MotionTab.jsx           # NEW
│   ├── MotionRow.jsx           # NEW
│   └── index.js                # NEW - Exports
```

## Deprecated Files (can be removed)

These files in `src/components/` are now replaced by the new structure:

| Old File | Replaced By | Notes |
|----------|-------------|-------|
| `HomePage.jsx` | `home/HomePage.jsx` | New lobby with Watchlist, Alerts |
| `MatchHeader.jsx` | `match/layout/MatchHeader.jsx` | New scoreboard design |
| `MomentumTab.jsx` | `match/tabs/MomentumTab.jsx` | Trend analysis |
| `MomentumTab.css` | `match/tabs/MomentumTab.css` | - |
| `PredictorTab.jsx` | `match/tabs/PredictorTab.jsx` | Win probability |
| `PredictorTab.css` | `match/tabs/PredictorTab.css` | - |
| `QuotesTab.jsx` | `match/tabs/OddsTab.jsx` | Renamed + redesigned |
| `QuotesTab.css` | `match/tabs/OddsTab.css` | - |
| `PointByPoint.jsx` | `match/tabs/PointByPointTab.jsx` | Timeline view |
| `PointRow.jsx` | (integrated) | Integrated into PointByPointTab |
| `PointByPointWidget.jsx` | (integrated) | Integrated into MatchHeader |
| `StrategiesPanel.jsx` | `match/tabs/StrategiesTab.jsx` | Full strategies tab |
| `StrategiesPanel.css` | `match/tabs/StrategiesTab.css` | - |
| `StrategiesLivePanel.jsx` | `match/layout/RightRail.jsx` | Quick strategy CTA |
| `StrategyHistoricalPanel.jsx` | (integrated) | Integrated into StrategiesTab |

## Files to Keep

These components may still be used:

- `ErrorBoundary.jsx` - Error boundary wrapper
- `GameBlock.jsx` - Game block display
- `SetBlock.jsx` - Set block display  
- `Gestionale.jsx` - Admin/management (if needed)
- `MatchCard.jsx` - Card for match list
- `MatchGrid.jsx` - Grid layout for matches
- `MonitoringDashboard.jsx` - Database monitoring
- `SportSidebar.jsx` - Sport selection
- `PlayerPage.jsx/css` - Player profiles
- `SavedScrapes.jsx` - Scrape management
- `Statistics.jsx` - Stats display
- `StatGroup.jsx` - Stats grouping
- `StatRow.jsx` - Stats row
- `IndicatorsChart.jsx` - Chart component
- `MomentumChart.jsx` - Momentum visualization
- `ManualPredictor.jsx/css` - Manual prediction tool

## Migration Steps

1. Update `App.jsx` imports:
   ```jsx
   // Old
   import HomePage from './components/HomePage';
   
   // New
   import { HomePage } from './components/home';
   ```

2. Update match page routing:
   ```jsx
   // Old
   // ... various component imports
   
   // New
   import { MatchPage } from './components/match';
   ```

3. After confirming everything works, delete deprecated files

## Data Consumption Pattern

The new architecture uses `useMatchBundle` hook which follows the V2 philosophy:

- **Single endpoint**: `/api/match/:id/bundle`
- **No tab-specific fetches**: All data in one payload
- **WebSocket + polling**: Real-time updates with fallback
- **Cache management**: SWR-like pattern

See: `src/hooks/useMatchBundle.jsx`
