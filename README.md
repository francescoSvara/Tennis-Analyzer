# ?? Tennis-Analyzer

**Sistema di analisi partite di tennis con dati in tempo reale e storici**

[![Live Demo](https://img.shields.io/badge/Live-tennis--analyzer.vercel.app-blue)](https://tennis-analyzer.vercel.app)
[![Backend](https://img.shields.io/badge/API-Railway-green)](https://tennis-analyzer-production.up.railway.app)
[![Database](https://img.shields.io/badge/DB-Supabase-orange)](https://supabase.com)

---

## ?? Indice

1. [Panoramica](#panoramica)
2. [Architettura](#architettura)
3. [Setup Rapido](#setup-rapido)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Frontend](#frontend)
7. [Documentazione](#documentazione)

---

## ?? Panoramica

Tennis-Analyzer � un sistema completo per:

- ?? **Analisi match** - Statistiche, momentum, point-by-point
- ?? **Dati giocatori** - Ranking, H2H, statistiche carriera
- ?? **Quote betting** - Import storico da XLSX
- ? **Live scoring** - Aggiornamenti in tempo reale via WebSocket

### Fonti Dati

| Fonte | Dati | Uso |
|-------|------|-----|
| **SofaScore** | Stats, momentum, point-by-point | Real-time e match recenti |
| **XLSX** | Quote, ranking storici | Archivio storico |

> ?? Per dettagli completi: **[FILOSOFIA_DB.md](FILOSOFIA_DB.md)**

---

## ??? Architettura

```
+-------------------------------------------------------------+
�                    SEZIONE 1: ACQUISIZIONE                   �
�                                                              �
�   +--------------+         +--------------+                 �
�   �  SofaScore   �         �    XLSX      �                 �
�   �   Scraper    �         �   Import     �                 �
�   +--------------+         +--------------+                 �
�          �                        �                          �
�          +------------------------+                          �
�                       ?                                      �
�              +----------------+                              �
�              �   Supabase DB  �                              �
�              +----------------+                              �
+-------------------------------------------------------------+

+-------------------------------------------------------------+
�                    SEZIONE 2: CONSUMO                        �
�                                                              �
�              +----------------+                              �
�              �   Supabase DB  �                              �
�              +----------------+                              �
�                       �                                      �
�   +-------------------+-------------------+                 �
�   �                   ?                   �                 �
�   �  +---------------------------------+  �                 �
�   �  �      Backend (Node.js)          �  �                 �
�   �  �  +-----------+ +-------------+  �  �                 �
�   �  �  �MatchCard  � � PlayerServ  �  �  �                 �
�   �  �  � Service   � �   ice       �  �  �                 �
�   �  �  +-----------+ +-------------+  �  �                 �
�   �  +---------------------------------+  �                 �
�   +---------------------------------------+                 �
�                       �                                      �
�                       ?                                      �
�              +----------------+                              �
�              � Frontend React �                              �
�              +----------------+                              �
+-------------------------------------------------------------+
```

### Struttura Progetto

```
React-Betfair/
+-- backend/
�   +-- server.js                 # API Express
�   +-- services/
�   �   +-- matchCardService.js   # Assembla card match
�   �   +-- playerService.js      # Gestione giocatori
�   �   +-- playerStatsService.js # Statistiche aggregate
�   +-- scraper/
�   �   +-- sofascoreScraper.js   # Scraping SofaScore
�   +-- db/
�   �   +-- matchRepository.js    # Query database
�   �   +-- supabase.js           # Client Supabase
�   +-- migrations/
�       +-- create-new-schema.sql # Schema DB
�       +-- migrate-to-new-schema.js
+-- src/
�   +-- App.jsx                   # App principale
�   +-- components/               # Componenti React
+-- FILOSOFIA_DB.md               # Documentazione architettura
+-- README.md
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

## ??? Database Schema

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

### Diagramma Relazioni

```
players_new ?------- matches_new -------? tournaments_new
     �                    �
     �                    �
     ?                    ?
player_aliases      match_data_sources
player_rankings     match_statistics_new
player_career_stats match_power_rankings_new
                    match_point_by_point_new
                    match_odds
```

> ?? Schema completo: **[migrations/create-new-schema.sql](backend/migrations/create-new-schema.sql)**

---

## ?? API Reference

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

### Altri Endpoint

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/match/:id/card` | GET | Card completa match |
| `/api/matches/cards` | GET | Lista match recenti |
| `/api/player/:id` | GET | Dettagli giocatore |
| `/api/search/players?q=` | GET | Cerca giocatori |
| `/api/player/alias` | POST | Aggiungi alias |
| `/api/player/merge` | POST | Unisci duplicati |
| `/api/match/:id/find-sofascore` | POST | Cerca match su SofaScore |
| `/api/live` | GET | Match in corso |
| `/api/live` | WebSocket | Updates real-time |

---

## ??? Frontend

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

## Documentazione

| Documento | Contenuto |
|-----------|-----------|
| **[FILOSOFIA_DB.md](FILOSOFIA_DB.md)** | Architettura dati, flussi, troubleshooting |
| **[FILOSOFIA_STATS.md](FILOSOFIA_STATS.md)** | Funzioni di calcolo, formule, metriche derivate |
| **[migrations/new-schema-design.md](backend/migrations/new-schema-design.md)** | Design database |
| **[create-new-schema.sql](backend/migrations/create-new-schema.sql)** | Schema SQL completo |

---

## Scripts Utili

```bash
# Migrazione database
cd backend
node migrations/migrate-to-new-schema.js

# Import XLSX
node importXlsx.js ./data/atp_2024.xlsx

# Scrape match specifico
node -e "require('./scraper/sofascoreScraper').scrapeMatch(12345).then(console.log)"

# Enrichment match XLSX con dati SofaScore
node scripts/enrich-xlsx-matches.js --limit 50

# Popolare alias giocatori
node scripts/populate-player-aliases.js

# Dry run (anteprima senza modifiche)
node scripts/enrich-xlsx-matches.js --dry-run
node scripts/populate-player-aliases.js --dry-run
```

---

## Changelog

### 22 Dicembre 2025 (Sessione 3) 🆕
**Moduli Data Acquisition & Aggregation:**
- `playerProfileService.js` - Profili giocatore con metriche aggregate per superficie/formato/serie
- `matchSegmenter.js` - Segmentazione match in fasi logiche (PRE_BREAK, CRITICAL, CLOSING)
- `breakDetector.js` - Rilevamento break da punteggio set senza point-by-point
- `pressureCalculator.js` - Calcolo indice pressione live (0-100) con raccomandazioni trading

**Funzionalità principali:**
- `getPlayerProfile()` - Profilo completo con comeback_rate, ROI, win_rate per superficie
- `segmentMatch()` - Identifica game critici, momentum shifts, closing opportunities
- `detectBreaksFromScore()` - Analizza break da score set (utile per dati XLSX)
- `calculatePressureIndex()` - Indice pressione con breakdown DF/FirstServe/BP

### 22 Dicembre 2025 (Sessione 2)
- Nuovo documento FILOSOFIA_STATS.md con tutte le funzioni di calcolo
- Hook useMatchCard.jsx per frontend
- Script enrich-xlsx-matches.js per arricchimento automatico
- Script populate-player-aliases.js per alias giocatori

### 22 Dicembre 2025 (Sessione 1)
- Nuovo schema database con separazione Player/Match
- MatchCardService per card complete
- PlayerService per gestione giocatori
- Sistema alias per matching nomi
- Endpoint `/api/match/:id/card`
- Documentazione FILOSOFIA_DB.md

### Versioni Precedenti
- MomentumTab redesign
- Live scoring WebSocket
- Import XLSX con odds
- Scraper SofaScore

---

## 📚 Documentazione

| Documento | Contenuto |
|-----------|-----------|
| **[FILOSOFIA_DB.md](FILOSOFIA_DB.md)** | Architettura dati, flussi, schema DB |
| **[FILOSOFIA_STATS.md](FILOSOFIA_STATS.md)** | Funzioni calcolo, formule, metriche derivate, TODO moduli |
| **[README_IMPLEMENTATION_GUIDE.md](README_IMPLEMENTATION_GUIDE.md)** | Guida implementazione task backend |

---

## 🔧 License

MIT License - Vedi [LICENSE](LICENSE) per dettagli.

---

**Made with ❤️ for tennis data analysis**
