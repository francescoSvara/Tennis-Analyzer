# 🎾 Tennis-Analyzer

**Sistema di analisi partite di tennis in tempo reale**

[![Live Demo](https://img.shields.io/badge/Live-tennis--analyzer.vercel.app-blue)](https://tennis-analyzer.vercel.app)
[![Backend](https://img.shields.io/badge/API-Railway-green)](https://tennis-analyzer-production.up.railway.app)
[![Database](https://img.shields.io/badge/DB-Supabase-orange)](https://supabase.com)

---

## ⚠️ ARCHITETTURA IMPORTANTE

### 🚫 NO SCRAPING DAL SERVER CLOUD

**Il backend su Railway NON può fare scraping da SofaScore** perché:
- SofaScore blocca le richieste dai server cloud (errore 409/403)
- Railway ha IP datacenter che vengono riconosciuti e bloccati

### ✅ SOLUZIONE: Scraping LOCALE

Lo scraping va fatto **esclusivamente** dal progetto locale `Tennis-Scraper-Local`:
1. Esegui lo scraper in locale sul tuo PC
2. I dati vengono salvati su Supabase (cloud)
3. Il frontend/backend leggono solo dal database

```
┌─────────────────────────────────────────────────────────────────────┐
│  🖥️ LOCALE (tuo PC)                                                 │
│  Tennis-Scraper-Local/                                               │
│  └── Scraping SofaScore → Salva su Supabase                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                          Scrive su DB
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ☁️ CLOUD (Supabase)                                                 │
│  Database PostgreSQL con tutti i dati match                          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                          Legge da DB
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  🌐 CLOUD (Railway + Vercel)                                         │
│  Backend API + Frontend React                                        │
│  SOLO LETTURA - nessuno scraping!                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🌐 LINK PRODUZIONE

| Servizio | URL | Status |
|----------|-----|--------|
| **Frontend** | https://tennis-analyzer.vercel.app | ✅ Live |
| **Backend API** | https://tennis-analyzer-production.up.railway.app | ✅ Live |
| **Health Check** | https://tennis-analyzer-production.up.railway.app/api/health | ✅ OK |
| **Repository** | https://github.com/francescoSvara/Tennis-Analyzer | ✅ |

---

## 📊 STATISTICHE ATTUALI (21 Dicembre 2025)

- **5448 match** nel database (2807 Sofascore + 2641 storici xlsx)
- **205 giocatori unici** con nomi normalizzati
- **210 mapping giocatori** per normalizzazione automatica
- **4420 record normalizzati** nella migrazione
- **15+ tornei** tracciati (ATP, ITF, Challenger, United Cup)
- **Giocatori top**: Jannik Sinner (128 match), Carlos Alcaraz (116 match)

---

## 🔄 DATA NORMALIZATION LAYER (NUOVO!)

### Problema Risolto
I dati provenienti da fonti diverse (xlsx, Sofascore) avevano formati diversi:
- xlsx: `"Sinner J."`, `"Alcaraz C."`  
- Sofascore: `"Jannik Sinner"`, `"Carlos Alcaraz"`

### Soluzione Implementata
**`backend/services/dataNormalizer.js`** con 210 mapping completi:

```javascript
// Esempio utilizzo
const { normalizePlayerName } = require('./services/dataNormalizer');

normalizePlayerName("Sinner J.")     // → "Jannik Sinner"
normalizePlayerName("Alcaraz C.")    // → "Carlos Alcaraz"
normalizePlayerName("Djokovic N.")   // → "Novak Djokovic"
```

### Script di Migrazione
```bash
# Normalizza tutti i nomi nel database esistente
cd backend
node scripts/normalize-player-names.js

# Dry run (solo preview)
node scripts/normalize-player-names.js --dry-run
```

### Unified Import Gateway
**`backend/services/unifiedImporter.js`** - Gateway unico per qualsiasi fonte:

```javascript
const { importXlsx, importSofascoreJson } = require('./services/unifiedImporter');

// Import da xlsx
await importXlsx('/path/to/2025.xlsx');

// Import da Sofascore JSON
await importSofascoreJson(sofascoreData);
```

---

## 🗄️ SCHEMA DATABASE COMPLETO

### Tabella `matches` - Struttura Campi

La tabella `matches` contiene tutti i dati delle partite. I campi sono organizzati per categoria:

#### 📌 Campi Identificativi
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | BIGINT | ID univoco partita (da Sofascore o generato) |
| `slug` | TEXT | URL-friendly identifier (es: "nadal-r-vs-federer-r") |
| `data_source` | TEXT | Fonte dati: `sofascore`, `xlsx_import`, `manual` |

#### 🏆 Campi Torneo/Evento
| Campo | Tipo | Descrizione | Uso per Calcoli |
|-------|------|-------------|-----------------|
| `tournament_id` | BIGINT | FK alla tabella tournaments | Join tornei |
| `location` | TEXT | Città/luogo (Brisbane, Melbourne, etc.) | Analisi per location |
| `series` | TEXT | Livello: ATP250, ATP500, ATP1000, Grand Slam | Filtri importanza |
| `court_type` | TEXT | `Indoor` o `Outdoor` | Analisi condizioni |
| `surface` | TEXT | `Hard`, `Clay`, `Grass`, `Carpet` | Analisi per superficie |
| `round_name` | TEXT | Turno: 1st Round, Quarterfinal, Final, etc. | Filtri fasi torneo |
| `best_of` | INTEGER | Formato: 3 o 5 set | Calcoli durata/strategia |

#### 👤 Campi Giocatori
| Campo | Tipo | Descrizione | Uso per Calcoli |
|-------|------|-------------|-----------------|
| `home_player_id` | BIGINT | FK giocatore casa | Join players |
| `away_player_id` | BIGINT | FK giocatore ospite | Join players |
| `home_seed` | INTEGER | Testa di serie home | Analisi seeding |
| `away_seed` | INTEGER | Testa di serie away | Analisi seeding |
| `winner_name` | TEXT | Nome vincitore (per import xlsx) | Query veloci |
| `loser_name` | TEXT | Nome perdente (per import xlsx) | Query veloci |
| `winner_rank` | INTEGER | Ranking vincitore al match | **Analisi ranking** |
| `loser_rank` | INTEGER | Ranking perdente al match | **Analisi ranking** |
| `winner_points` | INTEGER | Punti ATP/WTA vincitore | **Analisi punti** |
| `loser_points` | INTEGER | Punti ATP/WTA perdente | **Analisi punti** |

#### 📊 Campi Punteggio
| Campo | Tipo | Descrizione | Uso per Calcoli |
|-------|------|-------------|-----------------|
| `winner_code` | INTEGER | 1=home vince, 2=away vince | Risultato finale |
| `home_sets_won` | INTEGER | Set vinti da home | Score finale |
| `away_sets_won` | INTEGER | Set vinti da away | Score finale |
| `winner_sets` | INTEGER | Tot set vinti dal vincitore | Analisi dominanza |
| `loser_sets` | INTEGER | Tot set vinti dal perdente | Analisi competitività |
| `w1` | INTEGER | Games vinti winner nel SET 1 | **Analisi set** |
| `l1` | INTEGER | Games vinti loser nel SET 1 | **Analisi set** |
| `w2` | INTEGER | Games vinti winner nel SET 2 | **Analisi set** |
| `l2` | INTEGER | Games vinti loser nel SET 2 | **Analisi set** |
| `w3` | INTEGER | Games vinti winner nel SET 3 | **Analisi set** |
| `l3` | INTEGER | Games vinti loser nel SET 3 | **Analisi set** |
| `w4` | INTEGER | Games vinti winner nel SET 4 | **Analisi set** |
| `l4` | INTEGER | Games vinti loser nel SET 4 | **Analisi set** |
| `w5` | INTEGER | Games vinti winner nel SET 5 | **Analisi set** |
| `l5` | INTEGER | Games vinti loser nel SET 5 | **Analisi set** |

#### 💰 Campi Quote Bookmaker
| Campo | Tipo | Descrizione | Uso per Calcoli |
|-------|------|-------------|-----------------|
| `odds_b365_winner` | DECIMAL(6,3) | Quota Bet365 vincitore | **Value betting** |
| `odds_b365_loser` | DECIMAL(6,3) | Quota Bet365 perdente | **Value betting** |
| `odds_ps_winner` | DECIMAL(6,3) | Quota Pinnacle vincitore | **Sharp odds** |
| `odds_ps_loser` | DECIMAL(6,3) | Quota Pinnacle perdente | **Sharp odds** |
| `odds_max_winner` | DECIMAL(6,3) | Quota MAX vincitore | **Best odds** |
| `odds_max_loser` | DECIMAL(6,3) | Quota MAX perdente | **Best odds** |
| `odds_avg_winner` | DECIMAL(6,3) | Quota MEDIA vincitore | **Market consensus** |
| `odds_avg_loser` | DECIMAL(6,3) | Quota MEDIA perdente | **Market consensus** |
| `odds_bfe_winner` | DECIMAL(6,3) | Quota Betfair Exchange vincitore | **Exchange odds** |
| `odds_bfe_loser` | DECIMAL(6,3) | Quota Betfair Exchange perdente | **Exchange odds** |

#### ⏰ Campi Stato/Tempo
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `start_time` | TIMESTAMPTZ | Data/ora inizio match |
| `status_code` | INTEGER | Codice stato (100=finished) |
| `status_type` | TEXT | Tipo: `finished`, `inprogress`, `notstarted` |
| `status_description` | TEXT | Descrizione: Ended, In Progress, etc. |
| `comment` | TEXT | Note: Completed, Retired, Walkover, etc. |
| `is_live` | BOOLEAN | True se partita in corso |
| `first_to_serve` | INTEGER | Chi serve per primo (1 o 2) |

#### 🔗 Campi Metadata
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `sofascore_url` | TEXT | URL originale Sofascore |
| `raw_json` | JSONB | JSON completo dati Sofascore |
| `extracted_at` | TIMESTAMPTZ | Quando estratto |
| `created_at` | TIMESTAMPTZ | Quando creato nel DB |
| `updated_at` | TIMESTAMPTZ | Ultimo aggiornamento |
| `last_updated_at` | TIMESTAMPTZ | Legacy update timestamp |

---

### 🧮 FORMULE E CALCOLI UTILI

#### Probabilità implicita dalle quote
```
prob_winner = 1 / odds_winner
prob_loser = 1 / odds_loser
overround = prob_winner + prob_loser - 1
true_prob_winner = prob_winner / (prob_winner + prob_loser)
```

#### Value Bet Detection
```sql
-- Trova value bets dove Pinnacle dà quota migliore di Bet365
SELECT * FROM matches 
WHERE odds_ps_winner > odds_b365_winner * 1.05
  AND data_source = 'xlsx_import';
```

#### Analisi Ranking vs Risultato
```sql
-- Upset: quando il giocatore con ranking peggiore vince
SELECT winner_name, loser_name, winner_rank, loser_rank,
       loser_rank - winner_rank as rank_difference
FROM matches 
WHERE winner_rank > loser_rank  -- Ranking più alto = peggiore
ORDER BY rank_difference DESC;
```

#### Analisi per Superficie
```sql
-- Win rate per superficie e serie
SELECT surface, series, 
       COUNT(*) as total_matches,
       AVG(winner_sets::float / (winner_sets + loser_sets)) as avg_dominance
FROM matches 
WHERE surface IS NOT NULL
GROUP BY surface, series;
```

#### Tiebreak Analysis
```sql
-- Match con tiebreak (set finiti 7-6)
SELECT * FROM matches 
WHERE (w1 = 7 AND l1 = 6) OR (w1 = 6 AND l1 = 7)
   OR (w2 = 7 AND l2 = 6) OR (w2 = 6 AND l2 = 7);
```

#### Closing Line Value (CLV)
```sql
-- Confronto quote apertura vs chiusura (richiede storico)
-- CLV positivo = value bet confermato dal mercato
SELECT winner_name, 
       odds_ps_winner as pinnacle_odds,
       odds_avg_winner as market_avg,
       (odds_ps_winner - odds_avg_winner) / odds_avg_winner * 100 as edge_pct
FROM matches
WHERE odds_ps_winner > odds_avg_winner;
```

---

## 📌 Descrizione

Tennis-Analyzer è un sistema completo per:
- 📥 **Scraping** dati partite da SofaScore (**SOLO DA LOCALE**)
- 💾 **Salvataggio** su database Supabase cloud
- 📊 **Analisi** strategie trading (Lay the Winner, Banca Servizio, SuperBreak)
- 🔴 **Monitoraggio live** partite in corso
- 📈 **Dashboard** statistiche e copertura tornei

---

## 🏗️ ARCHITETTURA PRODUZIONE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🖥️ LOCALE (Tennis-Scraper-Local)                  │
│              Scraping SofaScore → Supabase                           │
├─────────────────────────────────────────────────────────────────────┤
│  - Puppeteer per scraping browser                                    │
│  - Intercetta API SofaScore                                          │
│  - Salva dati su Supabase                                            │
│  - NO LIMITAZIONI da IP residenziale                                 │
└─────────────────────────────────────────────────────────────────────┘
                                │
                          Scrive su DB
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    🗄️ DATABASE (Supabase)                            │
│              PostgreSQL cloud + Real-time subscriptions              │
├─────────────────────────────────────────────────────────────────────┤
│  Tabelle:                                                            │
│  - matches (id, event_id, home_player, away_player, status, ...)     │
│  - players (id, name, country, ranking)                              │
│  - tournaments (id, name, category, sport)                           │
│  - match_scores (set scores, tiebreaks)                              │
│  - point_by_point (cronologia punti)                                 │
│  - match_statistics (stats dettagliate)                              │
│  - power_rankings (indicatori momentum)                              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                          Legge da DB
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    🌐 FRONTEND (Vercel)                              │
│              https://tennis-analyzer.vercel.app                      │
├─────────────────────────────────────────────────────────────────────┤
│  React 18 + Vite                                                     │
│  - HomePage con MatchGrid raggruppato per data                       │
│  - MatchDetail con analisi strategie                                 │
│  - MonitoringDashboard con stats tornei (SOLO LETTURA DB)            │
│  - SportSidebar per navigazione                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                          HTTPS API
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    🚂 BACKEND (Railway)                              │
│        https://tennis-analyzer-production.up.railway.app             │
├─────────────────────────────────────────────────────────────────────┤
│  Node.js + Express                                                   │
│  - REST API per matches, tornei, statistiche                         │
│  - SOLO LETTURA da Supabase (NO scraping!)                           │
│  - WebSocket per aggiornamenti live                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 FUNZIONALITÀ

### ✅ Homepage - Match Database
- **Raggruppamento temporale**: Oggi, Ieri, Questo mese, Mese scorso
- **Partite rilevate**: Mostra match da tornei monitorati non ancora nel DB
- **Filtro sport**: Tennis (altri sport coming soon)
- **Match count**: Visualizza totale match + rilevate

### ✅ Scraping SofaScore
- **One-click scrape**: Incolla URL SofaScore, ottieni tutti i dati
- **Anti-duplicati**: Controllo automatico prima di salvare
- **Dati completi**: Punteggi, statistiche, point-by-point, quote

### ✅ Dettaglio Match
- **Overview**: Strategie trading con indicatori
- **Point by Point**: Cronologia completa con analisi
- **Statistics**: Ace, doppi falli, punti vinti, etc.
- **Momentum**: Grafici andamento partita
- **Quote**: Analisi quote betting

### ✅ Database Monitor
- **Overview**: Totale match, tornei, completezza media
- **Tornei**: Lista con % copertura e partite mancanti
- **Acquisizioni**: Timeline ultimi 30 giorni
- **Live Tracking**: Partite in monitoraggio automatico

### ✅ Live Updates
- **Auto-refresh**: Aggiornamento automatico partite in corso
- **WebSocket**: Connessione real-time opzionale
- **Tracking**: Monitoraggio automatico nuove partite

---

## 🔧 API ENDPOINTS PRINCIPALI

### Match & Database
| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/health` | GET | Health check con status Supabase |
| `/api/db/matches` | GET | Lista match dal database |
| `/api/match/:eventId` | GET | Dettaglio singolo match |
| `/api/scrape` | POST | Avvia scraping URL SofaScore |
| `/api/db-stats` | GET | Statistiche complete DB |
| `/api/tournament/:id/events` | GET | Partite torneo con copertura |
| `/api/sync/:eventId` | POST | Sincronizza dati match |
| `/api/tracked` | GET | Partite in monitoraggio |

### Player Stats API (NUOVO!)
| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/player/search?q=xxx` | GET | Ricerca giocatori (autocomplete) |
| `/api/player/:name/stats` | GET | Statistiche complete giocatore |
| `/api/player/:name/matches` | GET | Lista match giocatore |
| `/api/player/h2h?player1=xxx&player2=yyy` | GET | Head to Head |

**Esempio Response `/api/player/Jannik%20Sinner/stats`:**
```json
{
  "overall": { "total": 128, "wins": 116, "losses": 12, "winRate": 0.906 },
  "bySurface": {
    "Hard": { "total": 84, "wins": 78, "winRate": 0.929 },
    "Clay": { "total": 26, "wins": 22, "winRate": 0.846 },
    "Grass": { "total": 18, "wins": 16, "winRate": 0.889 }
  },
  "byFormat": {
    "BO3": { "total": 72, "wins": 64, "winRate": 0.889 },
    "BO5": { "total": 56, "wins": 52, "winRate": 0.929 }
  },
  "bySeries": {
    "Grand Slam": { "total": 56, "wins": 52, "winRate": 0.929 },
    "Masters 1000": { "total": 38, "wins": 32, "winRate": 0.842 }
  }
}
```

---

## 📂 STRUTTURA SERVIZI BACKEND

```
backend/
├── server.js                    # Express server principale
├── db/
│   ├── supabase.js              # Client Supabase
│   └── matchRepository.js       # Queries database
├── services/
│   ├── dataNormalizer.js        # 🆕 Normalizzazione nomi/superfici
│   ├── unifiedImporter.js       # 🆕 Gateway import xlsx/Sofascore  
│   └── playerStatsService.js    # 🆕 Statistiche giocatori
├── scripts/
│   ├── normalize-player-names.js    # 🆕 Migrazione DB
│   └── generate-player-mappings.js  # 🆕 Generatore mapping
├── scraper/
│   └── sofascoreScraper.js      # Scraping (SOLO LOCALE!)
└── utils/
    └── valueInterpreter.js      # Calcoli momentum/value
```

### File Chiave

| File | Scopo | Note |
|------|-------|------|
| `dataNormalizer.js` | 210 mapping giocatori ATP | Converte "Sinner J." → "Jannik Sinner" |
| `unifiedImporter.js` | Import da qualsiasi fonte | xlsx, Sofascore JSON, manual |
| `playerStatsService.js` | API statistiche giocatori | Win rate per superficie/serie |
| `normalize-player-names.js` | Script migrazione | Normalizza DB esistente |

---

## ⚙️ CONFIGURAZIONE PRODUZIONE

### Vercel (Frontend)
**Environment Variables:**
```
VITE_API_URL=https://tennis-analyzer-production.up.railway.app
VITE_WS_URL=https://tennis-analyzer-production.up.railway.app
```

**Build Settings:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### Railway (Backend)
**Environment Variables:**
```
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_KEY=[your-service-role-key]
FRONTEND_URL=https://tennis-analyzer.vercel.app
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

**Start Command:** `cd backend && node server.js`

### Supabase (Database)
**Tabelle richieste:**
- `players` - Anagrafica giocatori
- `tournaments` - Tornei
- `matches` - Partite (con FK a players e tournaments)
- `match_scores` - Punteggi set
- `point_by_point` - Cronologia punti
- `match_statistics` - Statistiche dettagliate
- `power_rankings` - Indicatori momentum

---

## 🚀 SVILUPPO LOCALE (opzionale)

Se vuoi modificare il codice:

```bash
# 1. Clona repository
git clone https://github.com/francescoSvara/Tennis-Analyzer.git
cd Tennis-Analyzer

# 2. Installa dipendenze
npm install
cd backend && npm install && cd ..

# 3. Crea file .env
cp .env.example .env
cp backend/.env.example backend/.env
# Modifica con le tue credenziali Supabase

# 4. Avvia backend (terminale 1)
cd backend && node server.js

# 5. Avvia frontend (terminale 2)
npm run dev

# 6. Apri http://localhost:5173
```

---

## 📂 STRUTTURA PROGETTO

```
Tennis-Analyzer/
├── src/                        # Frontend React
│   ├── App.jsx                 # Router principale
│   ├── config.js               # Configurazione API URLs
│   ├── components/
│   │   ├── HomePage.jsx        # Homepage con MatchGrid
│   │   ├── MatchGrid.jsx       # Griglia match raggruppata
│   │   ├── MatchCard.jsx       # Card singolo match
│   │   ├── MonitoringDashboard.jsx  # Dashboard statistiche
│   │   ├── PointByPoint.jsx    # Tab cronologia punti
│   │   ├── Statistics.jsx      # Tab statistiche
│   │   └── ...
│   ├── hooks/
│   │   ├── useMatchData.jsx    # Hook polling HTTP
│   │   └── useLiveMatch.jsx    # Hook WebSocket
│   └── styles/
│       └── homepage.css        # Stili homepage
│
├── backend/                    # Backend Node.js
│   ├── server.js               # Server Express
│   ├── liveManager.js          # Gestione live updates
│   ├── db/
│   │   ├── supabase.js         # Client Supabase
│   │   └── matchRepository.js  # Query database
│   ├── scraper/
│   │   └── sofascoreScraper.js # Scraper Puppeteer
│   └── utils/
│       └── valueInterpreter.js # Analisi valori
│
├── data/                       # Dati locali (backup)
│   ├── scrapes/                # JSON partite
│   └── mappings/               # Mapping mercati
│
├── .env.production             # Env produzione frontend
├── vite.config.js              # Config Vite
└── README.md                   # Questo file
```

---

## 🗺️ ROADMAP

### ✅ Completati
- [x] Scraping SofaScore con Puppeteer
- [x] Database Supabase cloud
- [x] Deploy Vercel + Railway
- [x] Sistema anti-duplicati
- [x] Analisi strategie trading
- [x] Database Monitor Dashboard
- [x] Live tracking automatico
- [x] Raggruppamento match per data
- [x] **Import dati storici xlsx** (2641+ match ATP 2025)
- [x] **Auto-merge Sofascore + xlsx** (quote, ranking, punteggi set)
- [x] **Documentazione schema DB completo** (50+ campi con formule)
- [x] **🆕 Data Normalization Layer** (210 mapping giocatori ATP)
- [x] **🆕 Player Stats API** (statistiche per superficie/serie)
- [x] **🆕 Unified Import Gateway** (xlsx + Sofascore)
- [x] **🆕 PredictorTab Frontend** (confronto statistiche in-match)
- [x] **🆕 ManualPredictor** (predictor da DB Monitor)

### 🔜 Prossimi Step
- [ ] Momentum Volatility & Elasticity Calculator
- [ ] Dynamic Surface Thresholds
- [ ] Pressure Index Calculator
- [ ] Multi-Source Odds Analysis
- [ ] Historical Comeback Rate API
- [ ] Match Character Classifier

### 📅 Futuro
- [ ] Altri sport (Calcio, Basket)
- [ ] Integrazione API Betfair
- [ ] App mobile React Native
- [ ] Predizioni ML/AI

---

## 🔄 DATABASE MIGRATIONS

### Normalizzazione Nomi Giocatori (21/12/2025)
**Problema:** Nomi duplicati (xlsx: "Sinner J." vs Sofascore: "Jannik Sinner")

**Soluzione:**
```bash
cd backend
node scripts/normalize-player-names.js
```

**Risultato:**
- 4420 record normalizzati
- 205 giocatori unici
- 0 duplicati rimasti

### Import xlsx con ID Numerici
**Problema:** Supabase richiede BIGINT per `id`, xlsx ha slug testuali

**Soluzione:** Hash numerici in `unifiedImporter.js`
```javascript
// Genera ID numerico da data+giocatori
function generateXlsxId(match) {
  const hash = createHash('md5')
    .update(`${match.Date}_${match.Winner}_${match.Loser}`)
    .digest('hex');
  return BigInt('0x' + hash.slice(0, 12)) % BigInt('999999999999');
}
```

---

## 🐛 TROUBLESHOOTING

### Frontend non mostra dati
1. Verifica che `VITE_API_URL` sia configurato su Vercel
2. Controlla la console browser per errori CORS
3. Verifica che Railway sia attivo: `/api/health`

### Backend non risponde
1. Controlla logs su Railway dashboard
2. Verifica variabili ambiente (specialmente Supabase)
3. Redeploy se necessario

### Database vuoto
1. Verifica connessione Supabase su Railway logs
2. Controlla che le tabelle esistano
3. Usa `/api/scrape` per aggiungere nuovi match

---

## 📝 NOTE TECNICHE

### Stack
- **Frontend**: React 18, Vite 5, CSS custom
- **Backend**: Node.js 18+, Express 4, Puppeteer
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel (frontend), Railway (backend)
- **CI/CD**: GitHub → auto-deploy su push

### CORS
Il backend accetta richieste da:
- `https://tennis-analyzer.vercel.app`
- `*.vercel.app` (preview deployments)
- `localhost:5173` (sviluppo)

---

## 👥 CONTRIBUIRE

1. Fork del repository
2. Crea branch: `git checkout -b feature/nuova-funzione`
3. Commit: `git commit -m 'Aggiunge nuova funzione'`
4. Push: `git push origin feature/nuova-funzione`
5. Apri Pull Request

---

## 📄 LICENZA

Progetto privato - Tutti i diritti riservati.

---

*Ultimo aggiornamento: 20 Dicembre 2025*

