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

## 🔌 API Principali

| Endpoint | Descrizione |
|----------|-------------|
| `/api/match/:id/bundle` | MatchBundle completo |
| `/api/matches/db` | Lista match (SofaScore) |
| `/api/player/:id` | Profilo giocatore |
| `/api/live` | Match live + WebSocket |

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
│   ├── server.js              # API + bundle
│   ├── services/              # Business logic
│   ├── strategies/            # 5 strategie trading
│   ├── utils/featureEngine.js # Feature calculations
├── src/
│   ├── components/            # React UI
│   ├── hooks/useMatchBundle.jsx
│   ├── motion/                # Animations
├── docs/filosofie/            # Architecture docs
```

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
- [Mappa Concettuale](docs/MAPPA_RETE_CONCETTUALE_V2.md)

---

**Made with ❤️ for tennis analytics**
