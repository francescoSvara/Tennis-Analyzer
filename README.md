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

## 📊 STATISTICHE ATTUALI (20 Dicembre 2025)

- **26 match** nel database
- **178 partite rilevate** dai tornei monitorati
- **15+ tornei** tracciati (ATP, ITF, Challenger, United Cup)
- **Giocatori top**: Zverev, Alcaraz, Hurkacz, de Minaur, Tien

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

### 🔜 Prossimi Step
- [ ] Ricerca per nome giocatore
- [ ] Filtri avanzati (torneo, status, data)
- [ ] Notifiche match importanti
- [ ] Export dati CSV/Excel

### 📅 Futuro
- [ ] Altri sport (Calcio, Basket)
- [ ] Integrazione API Betfair
- [ ] App mobile React Native
- [ ] Predizioni ML/AI

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

