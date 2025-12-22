# 🎾 Tennis-Analyzer

**Sistema di analisi partite di tennis con dati in tempo reale e storici**

[![Live Demo](https://img.shields.io/badge/Live-tennis--analyzer.vercel.app-blue)](https://tennis-analyzer.vercel.app)
[![Backend](https://img.shields.io/badge/API-Railway-green)](https://tennis-analyzer-production.up.railway.app)
[![Database](https://img.shields.io/badge/DB-Supabase-orange)](https://supabase.com)

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Architettura](#architettura)
3. [Setup Rapido](#setup-rapido)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Frontend](#frontend)
7. [Documentazione](#documentazione)

---

## 📖 Panoramica

Tennis-Analyzer è un sistema completo per:

- 📊 **Analisi match** - Statistiche, momentum, point-by-point
- 👤 **Dati giocatori** - Ranking, H2H, statistiche carriera
- 💰 **Quote betting** - Import storico da XLSX
- ⚡ **Live scoring** - Aggiornamenti in tempo reale via WebSocket

### Fonti Dati

| Fonte | Dati | Uso |
|-------|------|-----|
| **SofaScore** | Stats, momentum, point-by-point | Real-time e match recenti |
| **XLSX** | Quote, ranking storici | Archivio storico |

> 📚 Per dettagli completi: **[FILOSOFIA_DB.md](FILOSOFIA_DB.md)**

---

## ⚙️ Architettura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUSSO DATI COMPLETO                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INPUT                      PROCESSING                      OUTPUT           │
│  ┌──────────┐              ┌──────────────┐              ┌───────────────┐  │
│  │ SofaScore│──────────────▶│  raw_events  │──────────────▶│ TABELLE       │  │
│  │   API    │              │  (PENDING)   │              │ CANONICHE     │  │
│  └──────────┘              └──────────────┘              └───────┬───────┘  │
│  ┌──────────┐                     │                             │          │
│  │   XLSX   │──────────────▶      │                             ▼          │
│  │  Import  │                     │                      ┌─────────────┐   │
│  └──────────┘                     ▼                      │ calculation │   │
│                            ┌──────────────┐              │   _queue    │   │
│                            │ RAW EVENTS   │              └──────┬──────┘   │
│                            │   WORKER     │                     │          │
│                            └──────────────┘                     ▼          │
│                                                          ┌─────────────┐   │
│                                                          │ CALCULATION │   │
│                                                          │   WORKER    │   │
│                                                          └──────┬──────┘   │
│                                                                 │          │
│  CONSUMO                                               ┌───────▼─────────┐ │
│  ┌──────────┐     GET /api/match/:id/card              │match_card_snapshot│
│  │ Frontend │◀─────────────────────────────────────────│  (1 query only)  ││
│  │  React   │                                          └──────────────────┘│
│  └──────────┘                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Struttura Progetto

```
React-Betfair/
├── backend/
│   ├── server.js                      # API Express
│   ├── services/
│   │   ├── matchCardService.js        # Assembla card match
│   │   ├── playerService.js           # Gestione giocatori
│   │   ├── playerStatsService.js      # Statistiche aggregate
│   │   ├── rawEventsProcessor.js      # 🆕 Pipeline raw→canonical
│   │   └── calculationQueueWorker.js  # 🆕 Worker task asincroni
│   ├── scraper/
│   │   └── sofascoreScraper.js        # Scraping SofaScore
│   ├── db/
│   │   ├── matchRepository.js         # Query database
│   │   └── supabase.js                # Client Supabase
│   ├── migrations/
│       ├── create-new-schema.sql       # Schema DB base
│       └── add-snapshot-queue-tables.sql # 🆕 Nuove tabelle architettura
├── src/
│   ├── App.jsx                         # App principale
│   └── components/                     # Componenti React
├── FILOSOFIA_DB.md                     # Documentazione architettura
└── README.md
```

---

## ?? Setup Rapido

### Prerequisiti

- Node.js 18+
- Account Supabase (gratuito)
- (Opzionale) Account Railway per deploy

### 1. Clone e Installa

```bash
git clone https://github.com/yourusername/React-Betfair.git
cd React-Betfair

# Frontend
npm install

# Backend
cd backend
npm install
```

### 2. Configura Variabili Ambiente

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...
PORT=3001
```

**Frontend** (`.env`):
```env
VITE_API_URL=http://localhost:3001
```

### 3. Setup Database

1. Vai su [Supabase SQL Editor](https://supabase.com/dashboard)
2. Esegui `backend/migrations/create-new-schema.sql`
3. (Opzionale) Migra dati esistenti:
   ```bash
   cd backend
   node migrations/migrate-to-new-schema.js
   ```

### 4. Avvia

```bash
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Frontend
npm run dev
```

?? Apri http://localhost:5173

---

## 🗃️ Database Schema

### Tabelle Principali

| Tabella | Descrizione |
|---------|-------------|
| `players_new` | Anagrafica tennisti |
| `player_aliases` | Mapping varianti nomi |
| `player_rankings` | Storico ranking |
| `player_career_stats` | Stats carriera |
| `tournaments_new` | Tornei |
| `matches_new` | Match base |
| `match_data_sources` | Traccia fonti dati |
| `match_statistics_new` | Stats dettagliate |
| `match_power_rankings_new` | Momentum |
| `match_point_by_point_new` | Ogni punto |
| `match_odds` | Quote betting |
| `head_to_head` | H2H giocatori |

### Nuove Tabelle (Dicembre 2025) 🆕

| Tabella | Descrizione |
|---------|-------------|
| `raw_events` | Payload originali per reprocessing |
| `calculation_queue` | Coda task asincroni |
| `match_card_snapshot` | Card pre-calcolate (1 query) |

### Diagramma Relazioni

```
players_new ◀───── matches_new ─────▶ tournaments_new
     │                  │
     │                  │
     ▼                  ▼
player_aliases      match_data_sources
player_rankings     match_statistics_new
player_career_stats match_power_rankings_new
                    match_point_by_point_new
                    match_odds
                    match_card_snapshot
```

> 📄 Schema completo: **[migrations/create-new-schema.sql](backend/migrations/create-new-schema.sql)**
> 📄 Nuove tabelle: **[migrations/add-snapshot-queue-tables.sql](backend/migrations/add-snapshot-queue-tables.sql)**

---

## 📡 API Reference

### Match Card

```http
GET /api/match/:eventId/card
```

**Risposta:**
```json
{
  "match": {
    "id": 12345,
    "date": "2025-04-12",
    "round": "Final",
    "surface": "clay",
    "score": "6-4 7-5",
    "winner": 1
  },
  "player1": {
    "id": 100,
    "name": "Lorenzo Musetti",
    "country": "IT",
    "currentRanking": 15,
    "stats": { "winPercentage": 68.5 },
    "recentForm": [{"result": "W"}]
  },
  "player2": { },
  "h2h": {
    "total": "5-3",
    "onClay": "2-1"
  },
  "statistics": { },
  "momentum": [ ],
  "odds": {
    "opening": { "p1": 1.85, "p2": 2.10 },
    "closing": { "p1": 1.75, "p2": 2.20 }
  },
  "dataQuality": 85,
  "dataSources": ["xlsx_2025", "sofascore"]
}
```

### Endpoint Principali

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/match/:id/card` | GET | Card completa (da snapshot) ⚡ |
| `/api/match/:id/momentum` | GET | Solo power rankings |
| `/api/match/:id/statistics` | GET | Solo statistiche |
| `/api/match/:id/odds` | GET | Solo quote |
| `/api/match/:id/points` | GET | Point-by-point (paginato) |
| `/api/match/:id/rebuild-snapshot` | POST | 🆕 Ricostruisce snapshot |
| `/api/matches/cards` | GET | Lista match recenti |
| `/api/player/:id` | GET | Dettagli giocatore |
| `/api/search/players?q=` | GET | Cerca giocatori |
| `/api/player/alias` | POST | Aggiungi alias |
| `/api/player/merge` | POST | Unisci duplicati |
| `/api/match/:id/find-sofascore` | POST | Cerca match su SofaScore |
| `/api/live` | GET | Match in corso |
| `/api/live` | WebSocket | Updates real-time |
| `/api/admin/queue/stats` | GET | 🆕 Statistiche coda calcoli |

---

## 🔧 Servizi Backend

### Servizi Principali

| Servizio | File | Descrizione |
|----------|------|-------------|
| **MatchCardService** | `matchCardService.js` | Assembla card match (usa snapshot) |
| **PlayerService** | `playerService.js` | Gestione giocatori + alias |
| **PlayerStatsService** | `playerStatsService.js` | Statistiche aggregate |
| **SofascoreScraper** | `sofascoreScraper.js` | Scraping dati SofaScore |

### Nuovi Servizi (Dicembre 2025) 🆕

| Servizio | File | Descrizione |
|----------|------|-------------|
| **RawEventsProcessor** | `rawEventsProcessor.js` | Pipeline raw→canonical (reprocessing) |
| **CalculationQueueWorker** | `calculationQueueWorker.js` | Worker task asincroni (H2H, stats, snapshot) |

> 📚 Dettagli architettura: **[FILOSOFIA_DB.md](FILOSOFIA_DB.md)**

---

## 🖥️ Frontend

### Componenti Principali

| Componente | Scopo |
|------------|-------|
| `App.jsx` | Layout e routing |
| `MatchCard.jsx` | Card singolo match |
| `MomentumTab.jsx` | Grafico momentum |
| `StatsSection.jsx` | Statistiche match |
| `H2HSection.jsx` | Head-to-head |
| `OddsPanel.jsx` | Pannello quote |
| `LiveIndicator.jsx` | Badge live |

### Fetch Dati

```jsx
// Esempio: Fetch card match
const [card, setCard] = useState(null);

useEffect(() => {
  fetch(`${API_URL}/api/match/${matchId}/card`)
    .then(res => res.json())
    .then(setCard);
}, [matchId]);
```

### WebSocket Live

```jsx
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3001');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'score_update') {
      updateScore(data.match);
    }
  };
  
  return () => ws.close();
}, []);
```

---

---

## 📚 Documentazione

| Documento | Contenuto |
|-----------|-----------|
| **[FILOSOFIA_DB.md](FILOSOFIA_DB.md)** | Architettura dati, flussi, schema DB |
| **[FILOSOFIA_STATS.md](FILOSOFIA_STATS.md)** | Funzioni calcolo, formule, metriche derivate |
| **[README_IMPLEMENTATION_GUIDE.md](README_IMPLEMENTATION_GUIDE.md)** | Guida implementazione task backend |
| **[create-new-schema.sql](backend/migrations/create-new-schema.sql)** | Schema SQL base |
| **[add-snapshot-queue-tables.sql](backend/migrations/add-snapshot-queue-tables.sql)** | 🆕 Nuove tabelle architettura |

---

## 🛠️ Scripts Utili

```bash
# Import XLSX
cd backend && node importXlsx.js ./data/atp_2024.xlsx

# Enrichment match con SofaScore
node scripts/enrich-xlsx-matches.js --limit 50

# Popolare alias giocatori
node scripts/populate-player-aliases.js

# Dry run (anteprima)
node scripts/enrich-xlsx-matches.js --dry-run
```

---

## 📜 Changelog

### Dicembre 2025 - Architettura Avanzata 🆕
- **Match Card Snapshot** - Single query per card complete (~5ms)
- **Raw Events Pipeline** - Separazione raw/canonical per reprocessing
- **Calculation Queue** - Task asincroni per H2H, career stats, snapshots
- **Nuovi endpoint API** - `/api/match/:id/momentum`, `/statistics`, `/odds`, `/points`
- **Nuove tabelle** - `raw_events`, `calculation_queue`, `match_card_snapshot`

### Dicembre 2025 - Fix Player Profile
- Fix bug perdita match nelle statistiche
- Query ora cerca per nome E player_id
- `insertMatch()` popola sempre winner_name/loser_name

### Sessioni Precedenti
- Nuovo schema database con separazione Player/Match
- Sistema alias per matching nomi
- MomentumTab redesign
- Live scoring WebSocket

---

## 🔧 License

MIT License

---

**Made with ❤️ for tennis data analysis**
