# 📋 TODO LIST – React Betfair Tennis

> Documento centrale per tracciare attività, problemi e sviluppi futuri.
>
> **Ultimo aggiornamento**: 23 Dicembre 2025

---

## 📑 Indice

1. [Problemi Rilevati dal Check](#-problemi-rilevati-dal-check)
2. [TODO Attivi](#-todo-attivi)
3. [In Progress](#-in-progress)
4. [Completati](#-completati)
5. [Backlog](#-backlog)

---

## 🔍 Problemi Rilevati dal Check

> Sezione auto-popolata da `node scripts/checkConceptualMap.js`
> Ultimo check: 23 dicembre 2025

### Stato Attuale: ✅ Nessun problema

La mappa concettuale è allineata con il codice.

| Metrica | Valore |
|---------|--------|
| Check totali | 105 |
| ✅ Passati | 105 |
| ❌ Falliti | 0 |
| ⚠️ Warning | 0 |

---

## 📝 TODO Attivi

> Attività da completare. Fonte: README_IMPLEMENTATION_GUIDE.md

| # | Priorità | Task | Dominio | Note |
|---|----------|------|---------|------|
| 1 | 🔴 Alta | Hold Pressure Index (HPI) | Stats | Game tenuti sotto pressione (30-30, deuce, BP) |
| 2 | 🔴 Alta | Break Resilience Score | Stats | Capacità salvare BP + peso momentum negativo |
| 3 | 🟡 Media | Clutch Conversion Rate | Stats | % punti clutch vinti (BP, GP, SP, TB) |
| 4 | 🟡 Media | Serve Vulnerability Index | Stats | Calo servizio sotto pressione |
| 5 | 🟡 Media | Set Decay Index | Stats | Calo performance tra set consecutivi |
| 6 | 🟡 Media | Player Profile Aggregato | Backend | Profilo storico per superficie/timeframe |
| 7 | 🟡 Media | Snapshot Strategici | Backend | Salvare snapshot a momenti chiave |
| 8 | 🟢 Bassa | Live Odds Tracking | Backend | Tracciamento quote live + delta |
| 9 | 🟢 Bassa | Daily Match Evaluation Report | Backend | Report giornaliero automatico |
| 10 | 🟢 Bassa | Historical Pattern Detector | Stats | Pattern ricorrenti (1st set loss recovery, etc) |

---

## 🔄 In Progress

> Attività in corso di sviluppo.

| # | Task | Assegnato | Inizio | Note |
|---|------|-----------|--------|------|
| - | *Nessuna attività in corso* | - | - | - |

---

## ✅ Completati

> Attività completate (ultime 20).

| # | Task | Completato | Dominio |
|---|------|------------|---------|
| 1 | Sistema Check Mappa Concettuale | 22/12/2025 | Docs |
| 2 | Mappa Rete Concettuale | 22/12/2025 | Docs |
| 3 | Live Tracking System | 22/12/2025 | Backend |
| 4 | Match Card Snapshot | 22/12/2025 | Backend |
| 5 | Raw Events Pipeline | 22/12/2025 | Backend |
| 6 | Calculation Queue Worker | 22/12/2025 | Backend |
| 7 | Player Profile Aggregator | 23/12/2025 | Backend |
| 8 | Match Segmentation Engine | 22/12/2025 | Stats |
| 9 | Break Detector | 22/12/2025 | Stats |
| 10 | Pressure Index Calculator | 22/12/2025 | Stats |
| 11 | Momentum Volatility & Elasticity | 22/12/2025 | Stats |
| 12 | Dynamic Surface Thresholds | 22/12/2025 | Stats |
| 13 | Enhanced analyzePowerRankings | 22/12/2025 | Stats |
| 14 | Bug Fix Player Stats + Sofascore | 23/12/2025 | Backend |
| 15 | **Frontend UI/Motion Premium** | 22/12/2025 | Frontend |
| 16 | Phosphor Icons integration | 22/12/2025 | Frontend |
| 17 | Framer Motion animations | 22/12/2025 | Frontend |
| 18 | Motion tokens system | 22/12/2025 | Frontend |
| 19 | prefers-reduced-motion support | 22/12/2025 | Frontend |
| 20 | **Tennis-Scraper API Optimization** | 23/12/2025 | Backend |
| 21 | Tennis-Scraper SVG Icon System | 23/12/2025 | Frontend |
| 22 | Tennis-Scraper CSS Design Tokens | 23/12/2025 | Frontend |
| 23 | **Cleanup file JSON ridondanti** | 23/12/2025 | Backend |
| 24 | Fix liveManager (solo DB, no file) | 23/12/2025 | Backend |

### Dettagli Tennis-Scraper Local (completato 23/12/2025)

| Componente | Modifiche | File |
|------------|-----------|------|
| API Refactor | `/api/missing-matches` ora legge solo da DB (zero API calls) | `Tennis-Scraper-Local/backend/server.js:312-358` |
| Campo fix | Corretto mapping `home_team_name`/`away_team_name` (era `home_player_name`) | `Tennis-Scraper-Local/backend/server.js:341-349` |
| SVG Icons | Sistema icone Phosphor-style con `<symbol>` e `<use>` | `Tennis-Scraper-Local/index.html:7-80` |
| CSS Tokens | `--duration-fast`, `--ease-premium`, colori, radius | `Tennis-Scraper-Local/index.html:85-115` |
| README | Aggiunto changelog v2.1.0 | `Tennis-Scraper-Local/README.md:9-32` |

### Dettagli Frontend UI (completato 22/12/2025)

| Componente | Modifiche |
|------------|-----------|
| `HomePage.jsx` | Icone Phosphor, motion hover, bottoni animati |
| `SportSidebar.jsx` | Icone sport (TennisBall, SoccerBall), hover indicator animato |
| `MatchCard.jsx` | Icone azioni, hover lift -4px, shadow soft |
| `MatchGrid.jsx` | Stagger animation, Skeleton/EmptyState |
| `PlayerPage.jsx` | Icone stats, form streak animato, motion cards |
| `MonitoringDashboard.jsx` | 30+ emoji → Phosphor icons, spinner animati |
| `MatchHeader.jsx` | MapPin, Broadcast icons |
| `motion/tokens.js` | Duration, easings, varianti: fadeUp, cardHover, stagger |
| `motion/MotionCard.jsx` | Wrapper card con hover lift |
| `motion/MotionButton.jsx` | Bottoni con micro-interazioni |
| `motion/MotionList.jsx` | Container con stagger children |
| `motion/Skeleton.jsx` | Loading shimmer elegante |
| `motion/EmptyState.jsx` | Stato vuoto animato |
| `index.css` | Motion tokens CSS, prefers-reduced-motion |
| `homepage.css` | Stili bottoni, active indicator sidebar |

---

## 📦 Backlog

> Idee e attività future non ancora prioritizzate.

### 🔴 Alta Priorità (Prossimi)
- [ ] Calcolo ELO per superficie
- [ ] Cache Redis per dati live
- [ ] Odds Engine (Factor Registry, probabilità FAIR)

### 🟡 Media Priorità
- [ ] Previsioni ML vincitore
- [ ] Alerts match interessanti
- [ ] Import automatico XLSX (watcher)
- [ ] Normalized Point Structure (1.1)
- [ ] Overreaction Detection (quote)

### 🟢 Bassa Priorità
- [ ] Provider astratti Live (`LiveProvider`)
- [ ] API esterne (API-Tennis, Sportradar)
- [ ] Redis Streams / Kafka

### 📚 Documentazione
- [ ] FILOSOFIA_ODDS.md
- [ ] FILOSOFIA_AI.md
- [ ] FILOSOFIA_STRATEGIES.md
- [ ] FILOSOFIA_OBSERVABILITY.md

---

## 📌 Come Usare

### Aggiungere un TODO
```markdown
| # | Priorità | Task | Dominio | Note |
|---|----------|------|---------|------|
| 1 | 🔴 Alta | Descrizione task | Backend | Note aggiuntive |
```

### Priorità
- 🔴 **Alta**: Blocca sviluppo o critico
- 🟡 **Media**: Importante ma non urgente
- 🟢 **Bassa**: Nice to have

### Domini
- `Backend` - Server, API, DB
- `Frontend` - UI, Components, Hooks
- `Stats` - Calcoli, Metriche
- `Live` - Tracking, WebSocket
- `Docs` - Documentazione
- `DevOps` - Deploy, CI/CD

---

*Documento gestito manualmente + auto-update sezione Check*

## 🏗️ Problemi Architetturali (Auto-generato)

> Ultimo check: 2025-12-23
> Esegui: `node scripts/runConceptChecks.js`

✅ **Nessun problema architetturale rilevato**

---

## 🧹 Pulizia File Temporanei

> I seguenti file in `data/` sono **ridondanti** - i dati sono già nel database.
> Possono essere eliminati con gli script appositi.

| Cartella | File | Scopo Originale | Azione |
|----------|------|-----------------|--------|
| `data/scrapes/` | ~~97 files~~ | Cache JSON partite | ✅ Eliminati (14.59 MB) |
| `data/mappings/` | ~1074 files | Mapping normalizzati per debug | ⏳ Da eliminare |
| `data/detected/` | ~33 files | Match rilevati da torneo | ⏳ Da eliminare |

**Script di pulizia**: `node backend/scripts/cleanup-scrapes.js --all`

**Nota**: Il salvataggio su file JSON è stato **disabilitato** in `liveManager.js` (linea ~520).
D'ora in poi i nuovi match vanno **SOLO** nel database, come da filosofia.

