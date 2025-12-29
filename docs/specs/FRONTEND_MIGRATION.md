# 🔄 FRONTEND MIGRATION GUIDE

## Nuova Struttura Componenti

> **Dominio**: Frontend · Migration · Structure  
> **Stato**: ATTIVA  
> **Tipo**: Guida Migrazione  
> **Ultimo aggiornamento**: 27 Dicembre 2025

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre                                                                | ➡️ Correlato                                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [FILOSOFIA_FRONTEND](../filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md) | [FRONTEND_DATA](../filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) |

---

## 0️⃣ SCOPO DEL DOCUMENTO

Guida per la **migrazione alla nuova struttura frontend** basata su:

- MatchBundle-Centric Architecture
- Hook unificato `useMatchBundle`
- Struttura componenti organizzata

---

## 1️⃣ NUOVA STRUTTURA

```
src/
├── components/
│   ├── home/
│   │   ├── HomePage.jsx        # Trading Lobby con Watchlist, Alerts
│   │   ├── HomePage.css
│   │   └── index.js
│   ├── match/
│   │   ├── MatchPage.jsx       # Main 3-zone layout
│   │   ├── MatchPage.css
│   │   ├── index.js
│   │   ├── layout/
│   │   │   ├── MatchHeader.jsx     # Scoreboard, odds
│   │   │   ├── MatchSidebar.jsx    # Tab navigation
│   │   │   ├── RightRail.jsx       # Strategy CTA
│   │   │   ├── LoadingSkeleton.jsx
│   │   │   ├── ErrorState.jsx
│   │   │   └── index.js
│   │   └── tabs/
│   │       ├── OverviewTab.jsx     # Key stats, H2H
│   │       ├── StrategiesTab.jsx   # All strategies
│   │       ├── OddsTab.jsx         # Live odds, EV
│   │       ├── PointByPointTab.jsx # Timeline
│   │       ├── StatsTab.jsx        # Stats
│   │       ├── MomentumTab.jsx     # Trends
│   │       ├── PredictorTab.jsx    # Predictions
│   │       ├── JournalTab.jsx      # Trade log
│   │       └── index.js
├── hooks/
│   └── useMatchBundle.jsx      # Unified data consumption
├── motion/
│   ├── tokens.js               # Animation tokens
│   ├── MotionCard.jsx
│   ├── MotionButton.jsx
│   ├── MotionTab.jsx
│   ├── MotionRow.jsx
│   └── index.js                # Exports
```

---

## 2️⃣ FILE DEPRECATI

Questi file in `src/components/` sono sostituiti dalla nuova struttura:

| Old File                      | Replaced By                      | Note                 |
| ----------------------------- | -------------------------------- | -------------------- |
| `HomePage.jsx`                | `home/HomePage.jsx`              | Nuova lobby          |
| `MatchHeader.jsx`             | `match/layout/MatchHeader.jsx`   | Nuovo design         |
| `MomentumTab.jsx`             | `match/tabs/MomentumTab.jsx`     | Trend analysis       |
| `PredictorTab.jsx`            | `match/tabs/PredictorTab.jsx`    | Win probability      |
| `QuotesTab.jsx`               | `match/tabs/OddsTab.jsx`         | Renamed + redesigned |
| `PointByPoint.jsx`            | `match/tabs/PointByPointTab.jsx` | Timeline view        |
| `PointRow.jsx`                | (integrated)                     | In PointByPointTab   |
| `PointByPointWidget.jsx`      | (integrated)                     | In MatchHeader       |
| `StrategiesPanel.jsx`         | `match/tabs/StrategiesTab.jsx`   | Full strategies tab  |
| `StrategiesLivePanel.jsx`     | `match/layout/RightRail.jsx`     | Quick strategy CTA   |
| `StrategyHistoricalPanel.jsx` | (integrated)                     | In StrategiesTab     |

---

## 3️⃣ FILE DA MANTENERE

Questi componenti sono ancora usati:

| File                      | Scopo                  |
| ------------------------- | ---------------------- |
| `ErrorBoundary.jsx`       | Error boundary wrapper |
| `GameBlock.jsx`           | Game block display     |
| `SetBlock.jsx`            | Set block display      |
| `MatchCard.jsx`           | Card per match list    |
| `MatchGrid.jsx`           | Grid layout matches    |
| `MonitoringDashboard.jsx` | Database monitoring    |
| `SportSidebar.jsx`        | Sport selection        |
| `PlayerPage.jsx`          | Player profiles        |
| `Statistics.jsx`          | Stats display          |
| `StatGroup.jsx`           | Stats grouping         |
| `StatRow.jsx`             | Stats row              |
| `MomentumChart.jsx`       | Momentum visualization |

---

## 4️⃣ STEP DI MIGRAZIONE

### Step 1: Update Imports in App.jsx

```jsx
// ❌ OLD
import HomePage from './components/HomePage';

// ✅ NEW
import { HomePage } from './components/home';
```

### Step 2: Update Match Page Routing

```jsx
// ❌ OLD
// ... various component imports

// ✅ NEW
import { MatchPage } from './components/match';
```

### Step 3: Delete Deprecated Files

Dopo aver verificato che tutto funziona, eliminare i file deprecati.

---

## 5️⃣ DATA CONSUMPTION PATTERN

La nuova architettura usa `useMatchBundle` hook che segue la filosofia V2:

### Principi

| Principio                   | Implementazione                |
| --------------------------- | ------------------------------ |
| **Single endpoint**         | `/api/match/:id/bundle`        |
| **No tab-specific fetches** | Tutti i dati in un payload     |
| **WebSocket + polling**     | Real-time updates con fallback |
| **Cache management**        | SWR-like pattern               |

### Esempio

```jsx
import { useMatchBundle } from '../hooks/useMatchBundle';

const MatchPage = ({ matchId }) => {
  const { bundle, loading, error } = useMatchBundle(matchId);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} />;

  return (
    <div>
      <MatchHeader data={bundle.header} />
      <MatchTabs tabs={bundle.tabs} />
    </div>
  );
};
```

---

## 6️⃣ REGOLE DI MIGRAZIONE

```
RULE Component_Organization
  home/ → HomePage + related
  match/ → MatchPage + layout/ + tabs/
  hooks/ → useMatchBundle.jsx only
  motion/ → animation components
END

RULE Data_Consumption
  ALL data from bundle
  NO direct API calls from tabs
  NO calculation in frontend
END

RULE File_Cleanup
  AFTER migration_verified
    DELETE deprecated files
END
```

---

## 📚 RIFERIMENTI

| Documento                                                                                         | Scopo                         |
| ------------------------------------------------------------------------------------------------- | ----------------------------- |
| [FILOSOFIA_FRONTEND](../filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md)                           | Visual design e UI            |
| [FRONTEND_DATA](../filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) | Data consumption architecture |
| [`src/hooks/useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx)                              | Hook implementation           |

---

**Fine documento – FRONTEND_MIGRATION**
