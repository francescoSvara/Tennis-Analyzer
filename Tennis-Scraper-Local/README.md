# 🎾 Tennis Scraper Local

Tool locale per acquisire dati da SofaScore bypassando i blocchi IP dei server cloud (Railway, Vercel, etc.).

**Ultimo aggiornamento:** 20 Dicembre 2025

---

## 🧠 FILOSOFIA PRIMARIA: Acquisizione Ossessiva dei Dati

> **Ogni azione dell'utente deve contribuire all'accumulo di dati nel database.**
> **Ogni link inserito = SCRAPE COMPLETO + AGGIORNAMENTO DATI**

Questo progetto segue un principio fondamentale: **acquisizione spasmodica e ossessiva dei dati**. 

### ⚡ REGOLA D'ORO: MAI "duplicato", SEMPRE aggiorna

Quando inserisci un link nella barra di acquisizione:
- **NON** viene mai restituito "match già esistente"
- **SEMPRE** viene fatto scrape completo di tutti i dati
- **SEMPRE** vengono aggiornati: match, players, tournament, scores, statistics
- **SEMPRE** viene scansionato l'intero torneo per trovare partite mancanti

### Principi Operativi

| Azione Utente | Processo Scatenato |
|---------------|-------------------|
| **Inserisce link match** | → Scrape COMPLETO → Upsert match/players/tournament → Scansiona INTERO torneo → Salva in `detected_matches` |
| **Click su match esistente** | → Ri-scrape COMPLETO → Aggiorna TUTTI i dati → Ri-scansiona torneo |
| **Click su "Partite Mancanti"** | → Apre modale → Inserisci link → Scrape completo (stesso flow) |
| **Visualizza statistiche** | → Query diretta al DB → Mai calcoli client-side |

### Perché questa filosofia?

1. **DATI SEMPRE FRESCHI** - Ogni interazione aggiorna i dati
2. **NESSUNA PERDITA** - Se un match aveva dati incompleti, basta ri-inserire il link
3. **ACCUMULO AUTOMATICO** - Da un singolo match, si scopre l'intero torneo
4. **ZERO DUPLICATI** - Upsert invece di insert, dati sempre aggiornati

---

## ✨ Funzionalità UI

### Dashboard Statistiche
- **Contatori animati flip-clock** - I numeri si aggiornano con effetto orologio sveglia
- **Acquisiti** - Match nel database con dati completi
- **Mancanti** - Partite rilevate dai tornei ma non ancora acquisite
- **Totale** - Somma di acquisiti + mancanti

### Status Badge con Colori
| Status | Colore | Descrizione |
|--------|--------|-------------|
| **Not started** | 🔴 Rosso | Partita non ancora iniziata |
| **Live** | 🔴 Rosso pulsante | Partita in corso |
| **Ended** | 🟢 Verde | Partita terminata normalmente |
| **Retired** | ⚫ Grigio | Giocatore ritirato |
| **Walkover/Cancelled** | ⚫ Grigio | Partita annullata |

### Filtri Automatici
Le partite con status **Ended**, **Retired**, **Walkover**, **Cancelled**, **Postponed** vengono automaticamente nascoste dalla lista "Partite Recenti" per mostrare solo quelle da completare.

### Paginazione
- **20 match per pagina** sia per Partite Recenti che Partite Mancanti
- Navigazione con pulsanti Prec/Succ

---

### Tabella `detected_matches`: Il Cuore del Sistema

Questa tabella traccia **OGNI** partita mai rilevata da SofaScore:
- Quando viene vista per la prima volta → `detected_at`
- Se è stata acquisita → `is_acquired = true`
- Quando è stata acquisita → `acquired_at`

**Le statistiche sono sempre accurate perché vengono dal DB, non dalla memoria.**

---

## 📋 Panoramica

SofaScore blocca le richieste provenienti da IP di data center cloud. Questo tool permette di:
- Effettuare scraping usando il proprio IP locale (non bloccato)
- Salvare i dati nel database Supabase condiviso con la produzione
- Rilevare automaticamente le partite mancanti di un torneo
- Monitorare la completezza dei dati acquisiti

## 🚀 Quick Start

### 1. Installazione

```bash
cd Tennis-Scraper-Local
npm install

cd backend
npm install
```

### 2. Configurazione

Crea il file `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
PORT=3002
```

### 3. Avvio

**Terminale 1 - Backend:**
```bash
cd backend
node server.js
```

**Terminale 2 - Frontend:**
```bash
npm run client
```

Apri http://localhost:5174

## 🎯 Funzionalità

### Acquisizione / Aggiornamento Match

1. Copia un link SofaScore (es: `https://www.sofascore.com/it/tennis/match/sinner-alcaraz/abc123#id:12345`)
2. Incolla nel campo "Acquisisci / Aggiorna Match"
3. Clicca "🔄 Scrape"

**Il sistema SEMPRE:**
- Fa scrape completo di match, players, tournament
- Aggiorna scores e statistics
- Scansiona l'intero torneo per partite mancanti
- Mostra messaggio: "✅ Acquisito" (nuovo) o "♻️ Aggiornato" (esistente)

**Formati URL supportati:**
- `/event/12345`
- `#id:12345`
- `#12345`

### Partite Mancanti

Il sistema rileva automaticamente le partite mancanti dai tornei acquisiti.

- **Tab "Partite Mancanti"**: Mostra partite del torneo non ancora acquisite
- **Click su una partita** → Apre modale per inserire il link corretto
- **Validazione automatica**: Verifica che l'ID nel link corrisponda

### Percentuale Completamento

Ogni match mostra una badge con la % di completamento:

| Colore | Significato |
|--------|-------------|
| 🟢 Verde (100%) | Tutti i campi compilati |
| 🟠 Arancione (70-99%) | Quasi completo |
| 🔴 Rosso (<70%) | Incompleto |

**Campi tracciati:**
- Player info (home/away)
- Tournament, Round, Start time
- Status, Winner code
- Sets won (home/away)
- Match scores (tabella separata)
- Statistics (tabella separata)

### Partite Complete (100%)

Le partite con completamento 100%:
- **Non appaiono** nella lista "Partite Recenti"
- **Non si possono aggiornare** (click disabilitato)
- Sono considerate "acquisite completamente"

Le partite finite ("Ended") con un risultato completo vengono automaticamente nascoste dalla lista.

### Contatori Statistiche

Sopra i tab è visibile un riepilogo con due righe:

**Riga 1 - Stats tornei rilevati:**
- **Nel Database**: Partite già acquisite (tracked in `detected_matches`)
- **Da Acquisire**: Partite mancanti da acquisire
- **Totale Rilevati**: Tutte le partite rilevate dai tornei

**Riga 2 - Contatori DB:**
- **Totale nel DB**: Totale partite nella tabella `matches`
- **In lista**: Partite visibili nelle tab
- **Ultime 24h**: Acquisite nelle ultime 24 ore

## 🗃️ Sistema detected_matches

Il sistema tiene traccia di TUTTE le partite rilevate dai tornei SofaScore, salvandole in una tabella dedicata `detected_matches`. Questo permette:

- Statistiche accurate e persistenti (non più basate su variabili in memoria)
- Tracking di quali partite sono state acquisite e quali mancano
- Breakdown per torneo
- Calcolo del tasso di acquisizione

### Creare la tabella detected_matches

Esegui questa query in Supabase SQL Editor:

```sql
-- Tabella per tracciare TUTTE le partite rilevate dai tornei
CREATE TABLE IF NOT EXISTS detected_matches (
  id BIGINT PRIMARY KEY,                        -- SofaScore event ID
  tournament_id BIGINT,                          -- ID torneo SofaScore
  tournament_name TEXT,                          -- Nome torneo
  home_team_name TEXT,                           -- Nome giocatore home
  away_team_name TEXT,                           -- Nome giocatore away
  round_name TEXT,                               -- Es: "Final", "Semifinal"
  status TEXT,                                   -- Es: "Ended", "Not started"
  status_type TEXT,                              -- Es: "finished", "notstarted"
  start_time TIMESTAMP WITH TIME ZONE,           -- Data/ora inizio
  home_score INTEGER,                            -- Punteggio home (se disponibile)
  away_score INTEGER,                            -- Punteggio away (se disponibile)
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Quando è stata rilevata
  is_acquired BOOLEAN DEFAULT FALSE,             -- Se è stata acquisita
  acquired_at TIMESTAMP WITH TIME ZONE           -- Quando è stata acquisita
);

-- Indici per query veloci
CREATE INDEX IF NOT EXISTS idx_detected_tournament ON detected_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_detected_acquired ON detected_matches(is_acquired);
CREATE INDEX IF NOT EXISTS idx_detected_at ON detected_matches(detected_at);
```

## 🔮 Roadmap - Idee Future (Filosofia Accumulo Dati)

Tutte le future funzionalità seguono la filosofia di **acquisizione ossessiva**:

### 🔄 Acquisizione Automatica
- **Cron Job Locale**: Scansione periodica (ogni 15 min) di tutti i tornei attivi
- **Watch Mode**: Monitora tornei in corso e rileva nuove partite in tempo reale
- **Batch Acquisition**: Acquisizione automatica di tutte le partite mancanti con un click

### 📊 Analisi Dati Avanzate
- **Coverage Report**: % di partite acquisite per torneo/giocatore/periodo
- **Gap Analysis**: Identificare "buchi" nei dati storici
- **Trend Detection**: Quali tornei hanno più partite mancanti

### 🗄️ Espansione Database
- **Giocatori**: Tabella separata con statistiche aggregate
- **H2H**: Storico head-to-head tra giocatori
- **Odds History**: Integrazione con dati quote (se disponibili)
- **Surface Stats**: Performance per superficie

### 🔗 Integrazioni
- **Import da CSV/JSON**: Caricamento batch di dati esterni
- **Export schedulato**: Backup automatico dei dati
- **API pubblica**: Esporre i dati per altri servizi

### 🎯 Ottimizzazione Acquisizione
- **Smart Priority**: Acquisire prima partite di giocatori top-ranked
- **Completeness Score**: Dare priorità a match quasi completi
- **Retry automatico**: Riprovare match falliti dopo N minuti

## 🔧 API Endpoints

### Endpoints Base
| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/stats` | GET | Statistiche base (totale match, match 24h) |
| `/api/matches` | GET | Lista match recenti |
| `/api/matches?completeness=true` | GET | Match con % completamento |
| `/api/match/:id/completeness` | GET | Completamento singolo match |
| `/api/scrape` | POST | Acquisisce un match (body: `{ url }`) |

### Endpoints detected_matches (Nuovo Sistema)
| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/advanced-stats` | GET | Stats complete dal sistema detected_matches |
| `/api/detected-matches` | POST | Salva partite rilevate (body: `{ matches, tournamentId, tournamentName }`) |
| `/api/detected-missing` | GET | Partite rilevate ma non acquisite |
| `/api/detected-matches/:tournamentId` | GET | Partite di un torneo specifico |
| `/api/scan-tournament/:id` | POST | Scansiona torneo e salva in DB |
| `/api/mark-acquired/:matchId` | POST | Segna partita come acquisita |

### Endpoints Tornei
| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/missing-matches` | GET | Partite mancanti (vecchio sistema) |
| `/api/recent-tournaments` | GET | Tornei con partite recenti |
| `/api/tournament-events/:id` | GET | Eventi di un torneo da SofaScore |

## 📁 Struttura Progetto

```
Tennis-Scraper-Local/
├── index.html          # Frontend (Vite serve questo)
├── package.json        # Dependencies frontend
├── vite.config.js      # Configurazione Vite + proxy API
├── backend/
│   ├── server.js       # Express server (porta 3002)
│   ├── scraper.js      # Logica scraping SofaScore
│   ├── package.json    # Dependencies backend
│   └── db/
│       ├── supabase.js      # Client Supabase
│       └── matchRepository.js # Operazioni DB
└── README.md
```

## 🗄️ Database Schema

### Tabella `matches`
- `id` (PK) - SofaScore event ID
- `home_player_id`, `away_player_id` - FK a players
- `tournament_id` - FK a tournaments
- `round_name`, `start_time`, `status_*`
- `winner_code`, `home_sets_won`, `away_sets_won`
- `extracted_at`, `is_live`, `raw_json`

### Tabella `detected_matches` (Nuovo!)
- `id` (PK) - SofaScore event ID
- `tournament_id`, `tournament_name`
- `home_team_name`, `away_team_name`
- `round_name`, `status`, `status_type`
- `start_time`, `home_score`, `away_score`
- `detected_at`, `is_acquired`, `acquired_at`

### Tabella `match_scores`
- `match_id`, `set_number`
- `home_games`, `away_games`
- `home_tiebreak`, `away_tiebreak`

### Tabella `match_statistics`
- `match_id`, `period`, `group_name`
- `stat_name`, `home_value`, `away_value`

## 🔄 Workflow Tipico

1. **Apri** http://localhost:5174
2. **Controlla** il tab "Partite Mancanti" per vedere cosa manca
3. **Cerca** la partita su SofaScore
4. **Copia** il link della partita
5. **Incolla** nel campo acquisizione o nella modale
6. **Verifica** che l'ID corrisponda (validazione automatica)
7. **Acquisisci** - i dati vengono salvati su Supabase
8. **Ripeti** per tutte le partite mancanti

## ⚠️ Troubleshooting

### Creare la tabella detected_matches

Se la tabella `detected_matches` non esiste, esegui la query SQL nella sezione "Sistema detected_matches" sopra.

### "Server Offline"
- Verifica che il backend sia in esecuzione (`node server.js`)
- Controlla che la porta 3002 sia libera

### "SofaScore ha bloccato la richiesta"
- Attendi qualche minuto e riprova
- Usa una VPN se il problema persiste
- Il tuo IP potrebbe essere stato temporaneamente bloccato

### "Errore database"
- Verifica le credenziali Supabase in `.env`
- Controlla che le tabelle esistano nel database

## 📝 Note

- Il frontend usa Vite con proxy verso il backend (porta 3002)
- I dati sono condivisi con la produzione (stesso database Supabase)
- Lo scraping locale bypassa i blocchi perché usa il tuo IP residenziale
