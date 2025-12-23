# 🎾 Tennis Analyzer

> Sistema avanzato di analisi match tennistici con dati real-time, storico quote e analytics predittivi.

[![Version](https://img.shields.io/badge/Version-4.0-blue)](https://github.com/yourusername/React-Betfair)
[![Backend](https://img.shields.io/badge/API-Railway-green)](https://tennis-analyzer-production.up.railway.app)
[![Database](https://img.shields.io/badge/DB-Supabase-orange)](https://supabase.com)

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/yourusername/React-Betfair.git
cd React-Betfair

# Install
npm install && cd backend && npm install && cd ..

# Configure (crea .env files - vedi sezione Configurazione)

# Run
npm run dev                    # Frontend (porta 5173)
cd backend && node server.js   # Backend (porta 3001)
```

---

## 📋 Indice

- [Panoramica](#-panoramica)
- [Architettura](#-architettura)
- [Installazione](#-installazione)
- [Configurazione](#-configurazione)
- [API Reference](#-api-reference)
- [Documentazione](#-documentazione)
- [Scripts](#-scripts)
- [Changelog](#-changelog)

---

## 📖 Panoramica

Tennis Analyzer è una piattaforma completa per:

| Feature | Descrizione |
|---------|-------------|
| 📊 **Match Analysis** | Statistiche, momentum, point-by-point tracking |
| 👤 **Player Profiles** | Ranking, H2H, career stats, surface-specific performance |
| 💰 **Odds Engine** | Import storico quote, value detection, multi-source comparison |
| ⚡ **Live Tracking** | WebSocket updates, break detection, real-time momentum |
| 🤖 **Analytics Layer** | HPI, Resilience Index, Clutch Factor, Volatility |

### Fonti Dati

| Fonte | Tipo | Contenuto |
|-------|------|-----------|
| **SofaScore** | API | Stats live, momentum, point-by-point |
| **XLSX** | Import | Quote storiche (B365, Pinnacle, Max, Avg), ranking |

---

## ⚙️ Architettura

### Layer System (v4.0)

```
┌────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                       │
│    MatchCard • MomentumTab • PlayerProfile • LiveBadge     │
└─────────────────────────┬──────────────────────────────────┘
                          │ REST + WebSocket
┌─────────────────────────▼──────────────────────────────────┐
│                    API LAYER (Express)                      │
│              /api/match • /api/player • /api/live           │
└─────────────────────────┬──────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│               SERVICE LAYER (Business Logic)                │
│   matchCardService • playerService • playerProfileService   │
└─────────────────────────┬──────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│              CALCULATION LAYER (Analytics)                  │
│   valueInterpreter • pressureCalculator • matchSegmenter    │
└─────────────────────────┬──────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┘
│                 DATA LAYER (Supabase)                       │
│        matchRepository • liveTrackingRepository             │
└────────────────────────────────────────────────────────────┘
```

### Struttura Progetto

```
React-Betfair/
├── backend/
│   ├── server.js              # Express API server
│   ├── db/                    # Repository layer
│   ├── services/              # Business logic
│   ├── utils/                 # Calculation utilities
│   ├── scraper/               # SofaScore scraper
│   └── migrations/            # SQL schemas
├── src/
│   ├── App.jsx               # Main React app
│   ├── components/           # UI components (24)
│   ├── hooks/                # Custom hooks (3)
│   └── utils/                # Frontend utilities
├── docs/
│   ├── filosofie/            # Philosophy docs (7)
│   ├── specs/                # Technical specs
│   ├── MAPPA_RETE_CONCETTUALE.md
│   └── TODO_LIST.md
└── scripts/                  # Utility scripts
```

---

## 📦 Installazione

### Prerequisiti

- Node.js 18+
- Account [Supabase](https://supabase.com) (gratuito)
- (Opzionale) Account [Railway](https://railway.app) per deploy

### Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/React-Betfair.git
cd React-Betfair

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Setup database
# Vai su Supabase SQL Editor ed esegui:
# - backend/migrations/create-new-schema.sql
# - backend/migrations/add-snapshot-queue-tables.sql
# - backend/migrations/add-live-tracking-table.sql

# 4. Configure environment (vedi sezione successiva)

# 5. Run
npm run dev              # Frontend http://localhost:5173
cd backend && node server.js  # Backend http://localhost:3001
```

---

## ⚙️ Configurazione

### Backend (`backend/.env`)

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...
PORT=3001
```

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:3001
```

---

## 📡 API Reference

### Endpoints Principali

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/match/:id/card` | GET | Card completa match |
| `/api/match/:id/momentum` | GET | Power rankings |
| `/api/match/:id/statistics` | GET | Statistiche dettagliate |
| `/api/match/:id/odds` | GET | Quote betting |
| `/api/match/:id/points` | GET | Point-by-point (paginato) |
| `/api/matches/cards` | GET | Lista match recenti |
| `/api/player/:id` | GET | Profilo giocatore |
| `/api/player/:id/stats` | GET | Statistiche aggregate |
| `/api/search/players?q=` | GET | Ricerca giocatori |
| `/api/live` | GET | Match in corso |
| `/api/live` | WS | WebSocket updates |

### Esempio Response

```json
GET /api/match/12345/card

{
  "match": {
    "id": 12345,
    "tournament": "Australian Open",
    "surface": "Hard",
    "round": "Final",
    "score": "6-4 7-5"
  },
  "player1": {
    "name": "Jannik Sinner",
    "rank": 1,
    "stats": { "winRate": 0.78 }
  },
  "player2": { ... },
  "h2h": { "total": "5-3" },
  "momentum": [ ... ],
  "odds": {
    "opening": { "p1": 1.85, "p2": 2.10 },
    "closing": { "p1": 1.75, "p2": 2.20 }
  }
}
```

---

## 📚 Documentazione

### Documenti di Progetto

| Documento | Contenuto |
|-----------|-----------|
| [README_IMPLEMENTATION_GUIDE.md](README_IMPLEMENTATION_GUIDE.md) | **Guida concettuale** - Definizioni, formule, architetture |
| [docs/MAPPA_RETE_CONCETTUALE.md](docs/MAPPA_RETE_CONCETTUALE.md) | **Mappa riferimenti** - File, funzioni, tabelle, relazioni |
| [docs/TODO_LIST.md](docs/TODO_LIST.md) | **Task list** - TODO attivi, completati, backlog |
| [docs/CHECK_MAPPA_CONCETTUALE.md](docs/CHECK_MAPPA_CONCETTUALE.md) | **Verifica automatica** - Stato integrità documentazione |
| [docs/checks/report.md](docs/checks/report.md) | **Concept Checks** - Verifica confini architetturali |
| [docs/concept/rules.v1.json](docs/concept/rules.v1.json) | **Regole domini** - Definizione confini architetturali |

### Filosofie (Architettura Concettuale)

| Documento | Focus |
|-----------|-------|
| [FILOSOFIA_MADRE.md](docs/filosofie/FILOSOFIA_MADRE.md) | Visione complessiva progetto |
| [FILOSOFIA_DB.md](docs/filosofie/FILOSOFIA_DB.md) | Schema database, flussi dati |
| [FILOSOFIA_STATS_V2.md](docs/filosofie/FILOSOFIA_STATS_V2.md) | Metriche e calcoli statistici |
| [FILOSOFIA_LIVE_TRACKING.md](docs/filosofie/FILOSOFIA_LIVE_TRACKING.md) | Sistema tracking real-time |
| [FILOSOFIA_FRONTEND_UI_UX.md](docs/filosofie/FILOSOFIA_FRONTEND_UI_UX.md) | Design patterns UI/UX |
| [FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md](docs/filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) | Consumo dati frontend |
| [FILOSOFIA_CONCEPT_CHECKS.md](docs/filosofie/FILOSOFIA_CONCEPT_CHECKS.md) | Guardrail Docs ↔ Code |
| [SPEC_FRONTEND_MOTION_UI.md](docs/specs/SPEC_FRONTEND_MOTION_UI.md) | Specifiche animazioni |

### Verifica Documentazione

```bash
# Verifica mappa concettuale (esistenza file/funzioni/tabelle)
node scripts/checkConceptualMap.js

# Verifica confini architetturali (import proibiti, pattern)
node scripts/runConceptChecks.js

# Output:
# - docs/CHECK_MAPPA_CONCETTUALE.md - Stato file/funzioni
# - docs/checks/report.md - Problemi architetturali
# - docs/TODO_LIST.md - Sezioni auto-aggiornate
```

---

## 🛠️ Scripts

### Import Dati

```bash
# Import file XLSX quote storiche
cd backend && node importXlsx.js ./data/atp_2024.xlsx

# Arricchimento match con dati SofaScore
node scripts/enrich-xlsx-matches.js --limit 50

# Popolare alias giocatori
node scripts/populate-player-aliases.js
```

### Manutenzione

```bash
# Deduplica match
node scripts/deduplicate-all.js

# Normalizza nomi giocatori
node scripts/normalize-player-names.js

# Check stato database
node backend/check_supabase.js
```

### Verifica

```bash
# Test connessione database
cd backend && node test-db.js

# Test repository
node test-repo.js

# Verifica integrità documentazione
node scripts/checkConceptualMap.js
```

---

## 🗃️ Database Schema

### Tabelle Principali

| Tabella | Descrizione |
|---------|-------------|
| `players_new` | Anagrafica tennisti |
| `player_aliases` | Mapping varianti nomi |
| `player_rankings` | Storico ranking ATP/WTA |
| `tournaments_new` | Tornei (Grand Slam, Masters, etc.) |
| `matches_new` | Match con risultati |
| `match_statistics_new` | Statistiche dettagliate |
| `match_power_rankings_new` | Momentum point-by-point |
| `match_odds` | Quote betting multi-source |
| `match_card_snapshot` | Card pre-calcolate |
| `live_tracking` | Dati tracking real-time |

> Schema completo: [backend/migrations/create-new-schema.sql](backend/migrations/create-new-schema.sql)

---

## 📜 Changelog

### v4.3 (Dicembre 2025) - Dual Source Logic (API vs SVG)
- **Data Source Detection** - Rilevamento automatico origine dati
  - `isSvgSource`: controlla `source === 'svg_dom'`
  - `hasBreakOccurred`: verifica presenza campo `breakOccurred`
- **Game Totali Logic** - Calcolo adattivo
  - **API**: Usa punteggi set reali (`w1+l1`, `w2+l2`, etc.)
  - **SVG**: Conta dal campo `side` o segno di `value`
- **Break Source Tracking** - Campo `breakSource` nel return
  - `'api'`: da `powerRankings.breakOccurred`
  - `'statistics'`: da `statistics.breakPointsScored`  
  - `'unavailable'`: nessuna fonte disponibile
- **IndicatorsChart Enhanced**
  - Logica separata per `isSvgSource`
  - `dataSource` field per debug/UI
  - Documentato in `FILOSOFIA_STATS_V2.md` sezione 9

### v4.2 (Gennaio 2025) - SVG Momentum & Break Fallback
- **SVG Momentum Extractor** - Estrazione momentum da DOM SVG SofaScore
  - Funzione `extractMomentumFromSvgHtml()` per parsing SVG paths
  - Normalizzazione valori per set o per match
  - Output: `{ set, game, value, raw_v, side, source: 'svg_dom' }`
- **Break Fallback System** - Triple source per dati break:
  1. `powerRankings.breakOccurred` (da point-by-point)
  2. `matchData.statistics.breakPointsScored` (da API statistics)
  3. Fallback a 0 se nessuna fonte disponibile
- **Max Momentum Fix** - Non più sempre 100
  - Usa `raw_v` (valori originali) se disponibile dal SVG
  - Altrimenti calcola momentum medio per giocatore
  - I valori normalizzati (-100..+100) erano sempre ~100 max
- **IndicatorsChart Enhanced**
  - `extractBreaksFromStatistics()` per fallback break da statistics
  - Supporto `raw_v` nel calcolo Max Momentum

### v4.1 (Gennaio 2025) - Fix Break/Momentum Calculation
- **Break Detection Fix** - Corretta convenzione serving/scoring SofaScore
  - `serving=1` = HOME serve, `serving=2` = AWAY serve
  - `scoring=1` = HOME wins, `scoring=2` = AWAY wins
  - Break = il giocatore che vince NON è quello che serve
- **Break Frontend** - Separazione `homeBreaks` e `awayBreaks` in IndicatorsChart
- **Momentum Normalization** - Algoritmo running score con reset per set
  - Accumulo +1/-1 per ogni game vinto (HOME/AWAY)
  - Normalizzazione finale su scala -100..+100
- **Raw JSON Usage** - Uso `raw_json.pointByPoint` per break (contiene serving/scoring)

### v4.0 (Dicembre 2025) - Documentazione Strutturata
- **Mappa Rete Concettuale** - Riferimenti completi file/funzioni/tabelle
- **Sistema Check Automatico** - Verifica integrità documentazione
- **TODO_LIST Centralizzato** - Task management con auto-update
- **Guida Concettuale** - README_IMPLEMENTATION_GUIDE pulito (solo concetti)
- **7 Documenti Filosofia** - Architettura completa documentata

### v3.5 (Dicembre 2025) - Live Tracking
- WebSocket real-time updates
- Break detection automatico
- Pressure calculator
- Match segmenter

### v3.0 (Dicembre 2025) - Architettura Avanzata
- Match Card Snapshot (single query ~5ms)
- Raw Events Pipeline
- Calculation Queue Worker
- Multi-source odds comparison

### v2.0 (Novembre 2025) - Nuovo Schema DB
- Separazione Player/Match
- Sistema alias nomi
- Import XLSX storico

### v1.0 (Ottobre 2025) - MVP
- SofaScore scraping
- Match card base
- Frontend React

---

## 🤝 Contributing

1. Leggi [docs/MAPPA_RETE_CONCETTUALE.md](docs/MAPPA_RETE_CONCETTUALE.md) per orientarti
2. Controlla [docs/TODO_LIST.md](docs/TODO_LIST.md) per task aperti
3. Segui le filosofie in `docs/filosofie/`
4. Esegui `node scripts/checkConceptualMap.js` prima di committare

---

## 📄 License

MIT License

---

**Made with ❤️ for tennis data analysis**
