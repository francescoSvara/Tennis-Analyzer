# ?? Tennis Analyzer v3.0

> Sistema di analisi match tennistici con MatchBundle architecture, real-time tracking e analytics predittivi.

---

## ?? Quick Start

```bash
git clone https://github.com/yourusername/React-Betfair.git
cd React-Betfair
npm install && cd backend && npm install && cd ..

# Run
npm run dev                    # Frontend :5173
cd backend && node server.js   # Backend :3001
```

---

## ?? Architettura v3.0

### MatchBundle-Centric Design

Singola chiamata API restituisce tutto il necessario:

```
GET /api/match/:id/bundle ? { header, tabs, dataQuality }
```

### Layer System

```
Frontend (React)  ?  useMatchBundle hook
       ?
API Layer (Express)  ?  /api/match/:id/bundle
       ?
Service Layer  ?  matchCardService, strategyEngine, featureEngine
       ?
Data Layer (Supabase)  ?  matchRepository
```

---

## ?? Feature Engine

Calcola features da dati disponibili (score, odds, rankings):

| Feature | Fonte | Fallback |
|---------|-------|----------|
| volatility | powerRankings | score variance |
| dominance | game ratio | odds probability |
| pressure | match state | set score |
| serveDominance | stats | ranking |
| breakProbability | stats | odds + ranking |

**Principio**: MAI restituire null o fallback statici.

---

## 🔌 API Completa

### Endpoint Principali

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/match/:id/bundle` | GET | ⭐ **MatchBundle completo** (endpoint principale) |
| `/api/matches/db` | GET | Lista match da database |
| `/api/matches/suggested` | GET | Match suggeriti per acquisizione |
| `/api/matches/detected` | GET | Match rilevati da SofaScore |
| `/api/player/:name/stats` | GET | Statistiche giocatore |
| `/api/stats/db` | GET | Statistiche database |

### Health & Status

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/stats/health` | GET | Database health |

### Live Tracking

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/track/:eventId` | POST | Aggiungi a tracking |
| `/api/track/:eventId` | DELETE | Rimuovi da tracking |
| `/api/tracked` | GET | Lista match tracciati |
| `/api/tracking/stats` | GET | Statistiche tracking |
| `/api/tracking/live/discover` | GET | Scopri match live |

### Player

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/player/search` | GET | Ricerca autocomplete |
| `/api/player/h2h` | GET | Head to Head |
| `/api/player/:name/matches` | GET | Lista match giocatore |

### Database Access

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/db/test` | GET | Test connessione |
| `/api/db/matches` | GET | Match dal DB |
| `/api/db/matches/summary` | GET | Summary per HomePage |
| `/api/db/matches/:id/point-by-point` | GET | PBP dal DB |
| `/api/db/tournaments` | GET | Lista tornei |

### Value Interpretation

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/interpret-value` | POST | Interpreta game value |
| `/api/analyze-power-rankings` | POST | Analizza power rankings |
| `/api/value-thresholds` | GET | Soglie di default |

### SofaScore Direct (Event)

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/event/:id/point-by-point` | GET | PBP da SofaScore |
| `/api/event/:id/statistics` | GET | Stats da SofaScore |
| `/api/event/:id/power-rankings` | GET | Momentum da SofaScore |
| `/api/event/:id/live` | GET | Tutti i dati live |

---

## 🗄️ Database (Supabase)

| Tabella | Contenuto |
|---------|-----------|
| `matches_new` | Match SofaScore |
| `match_statistics_new` | Statistiche |
| `match_power_rankings_new` | Momentum |
| `match_odds` | Quote |
| `players_new` | Giocatori |

---

## 📂 Struttura

```
├── backend/
│   ├── server.js              # Bootstrap + mount (target ~300 righe)
│   ├── routes/                # URL definitions (10 files)
│   │   ├── index.js           # Central router
│   │   ├── match.routes.js    # MatchBundle endpoint
│   │   ├── player.routes.js   # Player stats/H2H
│   │   ├── tracking.routes.js # Live tracking
│   │   └── ...
│   ├── controllers/           # req → service → res (9 files)
│   │   ├── match.controller.js
│   │   ├── stats.controller.js
│   │   └── ...
│   ├── services/              # Business logic
│   │   ├── bundleService.js   # MatchBundle composer (~549 righe)
│   │   └── ...
│   ├── strategies/            # 5 strategie trading
│   ├── utils/                 # Feature calculations
│   └── db/                    # Repositories
├── src/
│   ├── components/            # React UI
│   ├── hooks/useMatchBundle.jsx
│   ├── motion/                # Animations
├── docs/filosofie/            # Architecture docs
```

---

## ✅ Completato v3.1.1 (Dicembre 2025)

### Stats Tab Fix
- **SofaScore JSON Match** - Tutte le statistiche ora corrispondono esattamente al formato JSON SofaScore
- **mergeValue fix** - Logica corretta: 0 è valore valido, fallback solo per undefined/null
- **convertSofaScoreArrayFormat** - Mappatura completa chiavi: secondServeAccuracy, maxPointsInRow, gamesWon, maxGamesInRow, tiebreaks, serviceGamesTotal
- **Duplicate stat removed** - "Service Points Won" rimosso da Serve Statistics (appare solo in Points Statistics)

### UI Responsive
- **Stats Cards 2x2** - Layout responsive con Bootstrap col-6 + CSS Grid per tutti i dispositivi
- **Font scaling** - CSS clamp() per scaling automatico font su tutti i tab
- **Overflow prevention** - min-width:0 globale, text-overflow:ellipsis, scrollable filters
- **Tab CSS fixes** - 8 file CSS aggiornati per responsive completo

### Code Quality
- **Dead code removal** - Rimossa funzione `countBreakPointsFromPBP` (93 righe mai chiamate)
- **FILOSOFIA compliance** - Verificata conformità architetturale completa

---

## ✅ Completato v3.1 (Dicembre 2025)

### Core
- **MatchBundle endpoint** - Single API per match data
- **Feature Engine** - Calcolo con fallback completo + dataSource flags per trasparenza origine dati
- **Strategy Engine** - 5 strategie backend (LayTheWinner, BancaServizio, SuperBreak, ValueBetting, MomentumShift)
- **SofaScore + SVG** - Fonti dati unificate (rimosso supporto XLSX)
- **dataQuality scoring** per ogni match
- **Logger utility** - Logging strutturato backend (`backend/utils/logger.js`)

### Frontend
- useMatchBundle hook (WS_URL da config, no localhost hardcoded)
- StrategiesPanel consuma `bundle.tabs.strategies` (no calcoli locali)
- Tabs: Overview, Strategies, Stats, Momentum, Predictor, PointByPoint
- QuickSignals con features reali
- Motion System (Framer Motion)

### Data
- Point-by-point completo
- Normalizzazione odds/points
- Stats stimate da score quando mancano

### Docs (26 Dic 2025)
- **10 documenti filosofia** riorganizzati in cartelle gerarchiche:
  - `00_foundation/` - MADRE, CONCEPT_CHECKS
  - `10_data_platform/` - DB, TEMPORAL, REGISTRY_CANON, LINEAGE_VERSIONING, OBSERVABILITY
  - `20_domain_tennis/` - LIVE_TRACKING
  - `30_domain_odds_markets/` - ODDS
  - `40_analytics_features_models/` - STATS, CALCOLI (nuovo)
  - `50_strategy_risk_execution/` - RISK_BANKROLL
  - `70_frontend/` - FRONTEND, FRONTEND_DATA_CONSUMPTION
- **FILOSOFIA_CALCOLI** - Feature Library & Calculation Standards completa
- **DEPRECATION_FRONTEND_UTILS.md** - Guida migrazione funzioni deprecate
- Mappa concettuale con check automatici
- Cross-references aggiornati (rimossi V1/V2/V3)

### Test (24 Dic 2025)
- `test/features/volatility.test.js` - Test fixtures per fallback chain e dataSource

### Metriche (25 Dic 2025)
| Check | Valore |
|-------|--------|
| Errori arch | **0** ✓ |
| Deep Philosophy | **9** (da 22) |
| Warning | **8** |
| Info | 30 |
| Check mappa | 125 ✓ |

---

## 📝 Changelog

### v3.1.4 (28 Dic 2025) - FILOSOFIA Compliance Batch ✅

**Pass Rate: 83% → 94%** (5 errori + 27 warnings risolti)

#### Errori Risolti
- **ERR-007/008** - `dataQuality.completeness` e `dataQuality.freshness` in matchCardService
- **ERR-009** - `ingestion_time` in liveTrackingRepository
- **ERR-010** - Validazione temporale bundle (`validateMetaBlock`, `ensureMetaBlock`)
- **ERR-011** - NaN checks in featureEngine

#### ALLOWED_SOURCES (WARN-001-005)
- Aggiunti a `allowedWriters`: calculationQueueWorker, matchCardService, playerService, rawEventsProcessor, unifiedImporter

#### Feature Engine (featureEngine.js)
- `isClutchPoint()` - Determina punti critici nel match (~130 righe)
- `calculateOddsFeatures()` - Implied probability, overround, movement (~60 righe)
- `breakProbability` naming fix

#### Strategy Engine (strategyEngine.js)
- Timestamp validation (`MAX_DATA_AGE_MS = 5min`)
- Quality check (`MIN_QUALITY_FOR_DECISION = 40`)
- Edge > 0 verification
- `isPriceAcceptable()` con `PRICE_THRESHOLDS`
- `STRATEGY_ENGINE_VERSION` export

#### Data Quality (dataQualityChecker.js)
- `detectOutliers()` - Z-score outlier detection
- `checkConsistency()` - Score/odds validation
- `calculateCompleteness()` - Field presence %
- `checkQuarantineTriggers()` - Quarantine logic
- `isDataUsable()` - Safe data check
- `QUARANTINE_REASONS` enum

#### Match Card Service (matchCardService.js)
- `MATCH_CARD_SERVICE_VERSION`, `DATA_VERSION` exports
- `validateMetaBlock()` - Meta validation
- `ensureMetaBlock()` - Auto-add meta
- `structureOdds()` - header/tabs odds structure
- `calculateCompleteness()`, `calculateFreshness()`

#### Live Manager (liveManager.js)
- `normalizeLiveData()` - Canonical format normalizer
- `validateLiveData()` - Input validation
- `processLivePipeline()` - Full pipeline orchestrator
- `generateLivePatches()` - JSON Patch generation
- `applyLivePatches()` - Patch application

#### Bet Decisions Repository
- `strategy`, `strategy_id` fields

#### Deterministic Calculations
- Rimosso `Math.random()` da statsTabBuilder.js e server.js

#### Frontend
- `Home.jsx` wrapper component

### v3.1.3 (28 Dic 2025) - Server.js Refactoring COMPLETATO ✅
- **Routes Architecture** - 10 route files + 9 controller files COMPLETATI e funzionanti
  - `health.routes.js` + `health.controller.js` - Root e health check
  - `db.routes.js` + `db.controller.js` - Database access endpoints
  - `match.routes.js` + `match.controller.js` - MatchBundle + CRUD match
  - `tracking.routes.js` + `tracking.controller.js` - Live tracking system
  - `player.routes.js` + `player.controller.js` - Player stats/H2H
  - `event.routes.js` + `event.controller.js` - SofaScore direct fetch
  - `value.routes.js` + `value.controller.js` - Value interpretation
  - `scrapes.routes.js` + `scrapes.controller.js` - Scrapes management
  - `stats.routes.js` + `stats.controller.js` - DB stats/health
  - `index.js` - Central router mount point
- **Services Extracted**
  - `bundleService.js` (~549 righe) - Core MatchBundle builder
  - `bundleHelpers.js` (~600 righe) - Score/odds/PBP normalization, breaks calculation
  - `statsTabBuilder.js` (~450 righe) - Statistics tab builder
- **server.js** - Target: bootstrap + mount routes only (refactor completato)
  - `scrapes.routes.js` + `scrapes.controller.js` - Scrapes management
  - `stats.routes.js` + `stats.controller.js` - DB stats/health
  - `index.js` - Central router mount point
- **Services Extracted**
  - `bundleService.js` (~549 righe) - Core MatchBundle builder
  - `bundleHelpers.js` - Score/odds/PBP normalization, breaks calculation
  - `statsTabBuilder.js` - Statistics tab builder
- **server.js** - Target: bootstrap + mount routes only (refactor in progress)
- **Documentation** - INDEX_FILOSOFIE.md con API routes table completa

### v3.1.2 (28 Dic 2025) - Server.js Refactoring Start
- **Routes Architecture** - 10 route files + 9 controller files completati
- **server.js** - Ridotto da 6996 a 4850 righe (-31%)
- **Stats Controller** - `getDbStats` e `getHealth` con power score
- **Match Controller** - `getSuggested` e `getDetected` fully implemented
- **bundleService** - Verificato completo (~549 righe)
- **Documentation** - INDEX_FILOSOFIE.md con API routes table completa

### v3.1.1 (28 Dic 2025) - Stats Fix & Responsive UI
- **SofaScore Stats** - Mapping completo JSON: secondServeAccuracy, maxPointsInRow, gamesWon, tiebreaks
- **mergeValue** - Fix logica fallback (0 è valore valido)
- **Stats Tab** - Rimosso duplicato "Service Points Won", layout 2x2 responsive
- **Global CSS** - Font clamp() responsive + overflow prevention su tutti i tab
- **Dead code** - Rimossa funzione `countBreakPointsFromPBP` non utilizzata
- **Architecture** - Verificata conformità FILOSOFIA documents

### v3.0.3 (25 Dic 2025) - Deep Philosophy Fix
- **riskEngine.js** - Creato nuovo servizio per calcolo edge/stake/exposure
- **Versioning exports** - Aggiunto `FEATURE_ENGINE_VERSION`, `STRATEGY_ENGINE_VERSION`
- **Alias compliance** - `normalizeName`, `resolvePlayerId`, `fetchLiveList`, `getTrackedMatch`
- **breakDetector.js** - Aggiunto `calculateBreaksFromPbp()`
- **pressureCalculator.js** - Aggiunto `getHoldDifficulty()`
- **sofascoreScraper.js** - Aggiunto `getPointByPoint()`
- **server.js** - Aggiunto `meta.versions` nel bundle
- **players.json** - Creato mapping giocatori
- **Deep Errors: 22 → 9** | **Concept Errors: 12 → 0**

### v3.0.2 (25 Dic 2025) - Zero Errori Architetturali
- **Eliminato `src/utils.js`** - File dead code (~2500 righe), nessun componente lo importava
- **StrategiesPanel** - Rimosso fetch separato, usa solo bundle.header.player*.stats
- **useMatchCard** - Rimosso hook `usePlayer` inutilizzato
- **Errori: 20 → 0** | **Warning: 25 → 0**

### v3.1 (26 Dic 2025) - Cleanup XLSX
- Rimosso supporto XLSX legacy
- Solo SofaScore + SVG come fonti dati
- Database pulito da dati legacy

### v3.0.1 (25 Dic 2025) - Pulizia & Documentazione
- Riorganizzazione filosofie in cartelle gerarchiche
- FILOSOFIA_CALCOLI con tassonomia completa calcoli
- Feature Engine con dataSource flags trasparenza
- WS_URL da config (no localhost hardcoded)
- 26 console.log migrati a logger strutturato
- Cross-references documentazione aggiornati

### v3.0 (Dic 2025) - MatchBundle Architecture
- Single endpoint design
- Feature Engine con fallback
- Strategy Engine 5 strategie
- Motion System

### v2.0 (Nov 2025)
- Nuovo schema DB
- Alias giocatori

### v1.0 (Ott 2025)
- MVP SofaScore scraping

---

## 📖 Docs

- [TODO List](docs/TODO_LIST.md)
- [Filosofie](docs/filosofie/)
  - [INDEX FILOSOFIE](docs/filosofie/INDEX_FILOSOFIE.md) - Mappa navigazione
  - [INDEX PSEUDOCODE](docs/filosofie/INDEX_FILOSOFIE_PSEUDOCODE.md) - API routes reference
- [Mappa Concettuale](docs/MAPPA_RETE_CONCETTUALE_V2.md)
- [Guida Refactor server.js](guida%20refactor%20server.js) - Status migrazione routes/controllers

---

**Made with ❤️ for tennis analytics**
