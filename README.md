# 🎾 Tennis-Analyzer

**Sistema di scraping e analisi partite di tennis (SofaScore)**

---

## 📌 Descrizione
Tennis-Analyzer esegue scraping delle API SofaScore, salva dati match in JSON e fornisce una UI per analisi, monitoraggio live e statistiche. Backend: Node.js/Express + Puppeteer. Frontend: React + Vite.

---

## 🚀 Quick start (sviluppo)
1. Clona il repository
   ```bash
   git clone https://github.com/francescoSvara/Tennis-Analyzer.git
   cd Tennis-Analyzer
   ```
2. Installa dipendenze
   ```bash
   npm install
   cd backend && npm install
   ```
3. Crea i file `.env` copiando `.env.example` e inserendo le tue credenziali Supabase
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```
4. Avvia il backend (porta 3001)
   ```bash
   cd backend
   node server.js
   ```
5. Avvia il frontend
   ```bash
   cd ..
   npm run dev
   ```
6. Apri `http://localhost:5173`

---

## ⚙️ Requisiti
- Node.js v18+
- NPM
- Chrome (Puppeteer lo installa automaticamente quando necessario)

---

## 🔐 Variabili d'ambiente (principali)
- BACKEND (server)
  - `SUPABASE_URL` — URL progetto Supabase
  - `SUPABASE_SERVICE_KEY` — Service role key (solo backend)
  - `PORT` — porta (default 3001)
- FRONTEND (Vite)
  - `VITE_API_URL` — (opzionale) URL base API in produzione
  - `VITE_SUPABASE_ANON_KEY` — (opzionale) chiave anon per accessi client

> Nota: mai inserire `SUPABASE_SERVICE_KEY` nel frontend. Usa i segreti della piattaforma (Vercel/Render) per le env in produzione.

---

## 🏗️ ARCHITETTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                      │
│                              porta 5173                              │
├─────────────────────────────────────────────────────────────────────┤
│  HomePage          │  MatchDetail        │  Components              │
│  - SportSidebar    │  - MatchHeader      │  - MatchCard             │
│  - MatchGrid       │  - Overview         │  - MatchGrid             │
│  - AddMatchModal   │  - PointByPoint     │  - Statistics            │
│                    │  - Statistics       │  - MomentumChart         │
│                    │  - Momentum         │  - QuotesTab             │
└────────────────────┴─────────────────────┴──────────────────────────┘
                                │
                          Proxy Vite
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Express + Node.js)                  │
│                              porta 3001                              │
├─────────────────────────────────────────────────────────────────────┤
│  API Endpoints:                                                      │
│  GET  /api/matches          → Lista match salvati (no duplicati)    │
│  POST /api/scrape           → Avvia scraping (controllo duplicati)  │
│  GET  /api/status/:id       → Stato job scraping                    │
│  GET  /api/data/:id         → Dati match                            │
│  POST /api/lookup-name      → Preview nome match                    │
├─────────────────────────────────────────────────────────────────────┤
│  Scraper (Puppeteer):                                                │
│  - Avvia Chrome headless                                             │
│  - Intercetta chiamate API SofaScore                                 │
│  - Salva dati in data/scrapes/                                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA STORAGE                                 │
├─────────────────────────────────────────────────────────────────────┤
│  data/scrapes/              → JSON completi delle partite           │
│  data/mappings/             → Mapping mercati normalizzati          │
│  Supabase (opzionale)       → Database cloud                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📂 STRUTTURA FILES

```
React-Betfair/
├── backend/
│   ├── server.js              # Server Express principale
│   ├── liveManager.js         # Polling/WebSocket per aggiornamenti live
│   ├── package.json
│   ├── .env                   # Variabili ambiente (Supabase)
│   ├── db/
│   │   ├── supabase.js        # Client Supabase (opzionale)
│   │   └── matchRepository.js # Query database
│   ├── scraper/
│   │   └── sofascoreScraper.js # Scraper Puppeteer
│   └── utils/
│       └── valueInterpreter.js # Analisi valori betting
│
├── src/
│   ├── App.jsx                # Componente principale con routing
│   ├── main.jsx               # Entry point React
│   ├── utils.js               # Utility functions (strategie, parsing)
│   ├── components/
│   │   ├── HomePage.jsx       # Homepage con lista match
│   │   ├── SportSidebar.jsx   # Sidebar selezione sport
│   │   ├── MatchCard.jsx      # Card singolo match
│   │   ├── MatchGrid.jsx      # Griglia match
│   │   ├── MatchHeader.jsx    # Header dettaglio match
│   │   ├── PointByPoint.jsx   # Tab punto per punto
│   │   ├── Statistics.jsx     # Tab statistiche
│   │   ├── MomentumTab.jsx    # Tab momentum
│   │   ├── QuotesTab.jsx      # Tab quote
│   │   └── ...
│   ├── styles/
│   │   ├── homepage.css       # Stili homepage
│   │   └── overviewcharts.css # Stili grafici
│   └── hooks/
│       ├── useMatchData.jsx   # Hook polling HTTP (principale)
│       └── useLiveMatch.jsx   # Hook WebSocket (opzionale)
│
├── data/
│   ├── scrapes/               # JSON partite salvate
│   └── mappings/              # Mapping mercati
│
├── vite.config.js             # Config Vite con proxy
├── package.json
└── README.md                  # Questo file
```

---

## 🎯 FUNZIONALITÀ IMPLEMENTATE

### ✅ Homepage - Match Database
- **SportSidebar**: Selezione sport (Tennis attivo, altri coming soon)
- **MatchGrid**: Griglia card con tutti i match salvati
- **MatchCard**: Card compatta con info match (giocatori, torneo, data, stato)
- **Filtro per sport**: Mostra solo match dello sport selezionato
- **Ordinamento**: Per data/ora di inizio e torneo

### ✅ Sistema Anti-Duplicati
- **Controllo URL**: Estrae eventId dall'URL SofaScore
- **Verifica esistenza**: Controlla se match già presente prima di scraping
- **Risposta 409**: Restituisce errore se duplicato con info match esistente
- **Filtro visualizzazione**: Lista match non mostra duplicati

### ✅ Scraping SofaScore
- **Puppeteer headless**: Chrome automatico per scraping
- **Intercettazione API**: Cattura tutte le chiamate API SofaScore
- **Salvataggio locale**: JSON in data/scrapes/
- **Endpoint diretti**: Fetch aggiuntivi per dati completi

### ✅ Dettaglio Match
- **MatchHeader**: Info giocatori, punteggio, stato
- **Overview**: Panoramica con strategie betting (Lay the Winner, Banca Servizio, SuperBreak)
- **Point by Point**: Cronologia punti con analisi dettagliata
- **Statistics**: Statistiche dettagliate del match
- **Momentum**: Grafici momentum e indicatori
- **Quote**: Analisi quote betting
- **Raw JSON**: Dati grezzi per debug

### ✅ Live Mode
- **Polling HTTP**: Aggiornamenti periodici via REST API
- **useMatchData Hook**: Sistema di polling robusto con retry
- **WebSocket (opzionale)**: Connessione real-time via Socket.IO
- **Auto-refresh**: Countdown con refresh automatico

### ✅ Gestione Dati Avanzata
- **Data Completeness**: Calcolo % completezza dati per ogni match
- **Status Realistico**: Rilevamento automatico match terminati (timeout 6h)
- **Sync Manuale**: Endpoint `/api/sync-match/:eventId` per aggiornamento dati
- **Match Tracking**: Sistema di monitoraggio automatico partite in corso

### ✅ Database Monitor Dashboard (NUOVO)
- **Overview Tab**: Statistiche globali (match totali, tornei, completezza media)
- **Distribuzione Status**: Grafico barre con partite finite/in corso/da iniziare
- **Timeline Acquisizioni**: Grafico 30 giorni con acquisizioni giornaliere
- **Tornei Tab**: Lista tornei con % copertura, partite mancanti, dettagli
- **Copertura Torneo**: Fetch dinamico partite torneo da SofaScore vs DB locale
- **Recenti Tab**: Ultime 20 acquisizioni con timestamp e completezza
- **Live Tracking Tab**: Partite in monitoraggio automatico con pulse animation
- **Progress Ring**: Indicatori circolari % completezza per ogni torneo
- **API `/api/db-stats`**: Statistiche complete del database
- **API `/api/tournament/:id/events`**: Partite torneo con % copertura

---

## 🔧 API ENDPOINTS

### GET /api/matches
Lista tutti i match salvati (senza duplicati).

**Query params:**
- `sport`: Filtra per sport (es. `tennis`, `football`)

**Response:**
```json
{
  "matches": [
    {
      "id": "mjca5nue8p0moa",
      "fileDate": "2025-12-19T...",
      "eventId": 15222472,
      "sport": "tennis",
      "tournament": "Next Gen Finals",
      "category": "ATP",
      "homeTeam": { "name": "Learner Tien", "ranking": 28 },
      "awayTeam": { "name": "Nicolai Budkov Kjaer", "ranking": null },
      "status": "notstarted"
    }
  ],
  "total": 1
}
```

### POST /api/scrape
Avvia scraping di un match.

**Body:**
```json
{
  "url": "https://www.sofascore.com/it/tennis/match/...",
  "force": false  // true per forzare anche se duplicato
}
```

**Response (successo):**
```json
{ "id": "mjca5nue8p0moa", "method": "scrape" }
```

**Response (duplicato - 409):**
```json
{
  "error": "duplicate",
  "message": "Match già presente: Tien vs Budkov Kjaer",
  "existingId": "mjca5nue8p0moa",
  "eventId": 15222472
}
```

### GET /api/status/:id
Stato del job di scraping.

**Response:**
```json
{ "status": "finished" }  // pending | running | finished | error
```

### GET /api/data/:id
Dati completi del match.

### GET /api/db-stats
Statistiche complete del database.

**Response:**
```json
{
  "summary": {
    "totalMatches": 25,
    "totalTournaments": 7,
    "avgCompleteness": 81,
    "byStatus": { "finished": 20, "inprogress": 2, "notstarted": 3 }
  },
  "tournaments": [...],
  "recentAcquisitions": [...],
  "timeline": [{ "date": "2025-12-17", "count": 13 }, ...],
  "tracking": { "active": 0, "matches": [] }
}
```

### GET /api/tournament/:tournamentId/events
Partite di un torneo da SofaScore con % copertura nel DB locale.

**Response:**
```json
{
  "tournamentId": "123",
  "events": [...],
  "stats": {
    "total": 32,
    "inDatabase": 28,
    "missing": 4,
    "completionRate": 87
  }
}
```

---

## 🗺️ ROADMAP - PROGETTI FUTURI

### ✅ Completati (19 Dicembre 2025)

1. ~~**Modal Aggiungi Match**~~ ✅
   - Form con input URL
   - Preview match prima di conferma
   - Gestione errore duplicato
   - Feedback visivo durante scraping

2. ~~**Sistema Anti-Duplicati**~~ ✅
   - Controllo automatico URL
   - Risposta 409 per duplicati
   - Deduplicazione nella lista match

3. ~~**Analisi Strategie Trading**~~ ✅
   - Lay the Winner analysis
   - Banca Servizio strategy
   - SuperBreak detection
   - Indicatori momentum e trend

4. ~~**Gestione Dati Avanzata**~~ ✅
   - Data Completeness indicator
   - Match status detection automatico
   - Sync manuale endpoint
   - Match tracking scheduler

5. ~~**Hook Dati Robusto**~~ ✅
   - useMatchData con polling HTTP
   - Retry automatico su errori
   - Fallback system

6. ~~**Database Monitor Dashboard**~~ ✅ (NUOVO)
   - Overview con statistiche globali
   - Gestione tornei con % copertura
   - Timeline acquisizioni 30 giorni
   - Live tracking monitor
   - API statistiche DB

### 🔜 Prossimi Step (Priorità Alta)

1. **Miglioramento UI Homepage**
   - Skeleton loading per card
   - Infinite scroll o paginazione
   - Ricerca/filtro per nome giocatore
   - Badge per match live

2. **Gestione Match Avanzata**
   - Eliminazione match singoli
   - Refresh singolo match da UI
   - Note/tag personalizzati
   - Bulk operations

### 📅 Medio Termine

3. **Altri Sport**
   - Calcio (struttura dati diversa)
   - Basket
   - Rugby

4. **Analisi Avanzate**
   - Trend giocatori nel tempo
   - Storico H2H completo
   - Predizioni ML/AI

5. **Export Dati**
   - CSV export
   - Excel export
   - API pubblica documentata

### 🔮 Lungo Termine

6. **Integrazione Betfair**
   - Connessione API Betfair
   - Quote live sincronizzate
   - Segnali trading automatici

7. **Mobile App**
   - React Native
   - Notifiche push

8. **Multi-utente**
   - Autenticazione
   - Preferenze salvate
   - Condivisione analisi

---

## 🛠️ COMANDI UTILI

### Avvio Sviluppo
```bash
# Backend
cd backend && node server.js

# Frontend
npm run dev
```

### Scraping Manuale (PowerShell)
```powershell
$body = '{"url":"URL_SOFASCORE"}'; Invoke-RestMethod -Uri "http://localhost:3001/api/scrape" -Method Post -Body $body -ContentType "application/json"
```

### Verifica Match Salvati
```powershell
Get-ChildItem "data/scrapes" | Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name, Length, LastWriteTime
```

### Reinstalla Chrome per Puppeteer
```bash
cd backend && npx puppeteer browsers install chrome
```

---

## 🐛 TROUBLESHOOTING

### Errore "Could not find Chrome"
```bash
cd backend
npx puppeteer browsers install chrome
```

### Porta 3001 già in uso
```powershell
Get-NetTCPConnection -LocalPort 3001 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Errore CORS
Verifica che il backend sia attivo su porta 3001 e che vite.config.js abbia il proxy configurato.

### Scraping fallisce
- Verifica connessione internet
- URL deve essere di SofaScore
- Formato: `https://www.sofascore.com/it/tennis/match/...#id:NUMERO`

---

## 📝 NOTE TECNICHE

### Stack Tecnologico
- **Frontend**: React 18, Vite, CSS custom
- **Backend**: Node.js, Express, Puppeteer
- **Database**: File JSON locali (primario) + Supabase (opzionale)
- **Scraping**: Puppeteer con Chrome headless
- **Live Updates**: HTTP Polling (primario) + WebSocket/Socket.IO (opzionale)

### Configurazione Vite Proxy
```js
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```

### Struttura Dati Match
I file JSON in `data/scrapes/` contengono:
- `api`: Oggetto con tutte le risposte API intercettate
- Chiavi come `https://www.sofascore.com/api/v1/event/123456`
- Dati evento, statistiche, point-by-point, quote, ecc.

---

## 👥 CONTRIBUIRE

1. Fork del repository
2. Crea branch feature: `git checkout -b feature/nuova-funzione`
3. Commit: `git commit -m 'Aggiunge nuova funzione'`
4. Push: `git push origin feature/nuova-funzione`
5. Pull Request

---

## 📄 LICENZA

Progetto privato - Tutti i diritti riservati.

---

*Ultimo aggiornamento: 19 Dicembre 2025*

