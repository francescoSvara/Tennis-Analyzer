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

## ?? API Principali

| Endpoint | Descrizione |
|----------|-------------|
| `/api/match/:id/bundle` | MatchBundle completo |
| `/api/matches/db` | Lista match (SofaScore + XLSX) |
| `/api/player/:id` | Profilo giocatore |
| `/api/live` | Match live + WebSocket |

---

## ??? Database (Supabase)

| Tabella | Contenuto |
|---------|-----------|
| `matches_new` | Match SofaScore |
| `matches` | Match XLSX legacy |
| `match_statistics_new` | Statistiche |
| `match_power_rankings_new` | Momentum |
| `match_odds` | Quote |
| `players_new` | Giocatori |

---

## ?? Struttura

```
+-- backend/
¦   +-- server.js              # API + bundle
¦   +-- services/              # Business logic
¦   +-- strategies/            # 5 strategie trading
¦   +-- utils/featureEngine.js # Feature calculations
+-- src/
¦   +-- components/            # React UI
¦   +-- hooks/useMatchBundle.jsx
¦   +-- motion/                # Animations
+-- docs/filosofie/            # Architecture docs
```

---

## ? Completato v3.0 (Dicembre 2025)

### Core
- **MatchBundle endpoint** - Single API per match data
- **Feature Engine** - Calcolo con fallback completo
- **Strategy Engine** - 5 strategie (LayTheWinner, BancaServizio, SuperBreak, ValueBetting, MomentumShift)
- **Dual Source** - SofaScore + XLSX unificati
- **dataQuality scoring** per ogni match

### Frontend
- useMatchBundle hook
- Tabs: Overview, Strategies, Stats, Momentum, Predictor, PointByPoint
- QuickSignals con features reali
- Motion System (Framer Motion)

### Data
- Point-by-point con fallback legacy
- Normalizzazione odds/points
- Stats stimate da score quando mancano

### Docs
- 9 documenti filosofia
- Mappa concettuale
- Check scripts automatici

---

## ?? Changelog

### v3.0 (Dic 2025) - MatchBundle Architecture
- Single endpoint design
- Feature Engine con fallback
- Strategy Engine 5 strategie
- Motion System

### v2.0 (Nov 2025)
- Nuovo schema DB
- Alias giocatori
- Import XLSX

### v1.0 (Ott 2025)
- MVP SofaScore scraping

---

## ?? Docs

- [TODO List](docs/TODO_LIST.md)
- [Filosofie](docs/filosofie/)
- [Mappa Concettuale](docs/MAPPA_RETE_CONCETTUALE_V2.md)

---

**Made with ?? for tennis analytics**
