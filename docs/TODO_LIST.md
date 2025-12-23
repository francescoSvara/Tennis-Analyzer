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

> Attività completate (ultime 25).

| # | Task | Completato | Dominio |
|---|------|------------|---------|
| 1 | **Dual Source Logic (API vs SVG)** | 23/12/2025 | Frontend |
| 2 | IndicatorsChart - Game Totali fix | 23/12/2025 | Frontend |
| 3 | IndicatorsChart - Break source tracking | 23/12/2025 | Frontend |
| 4 | FILOSOFIA_STATS_V2 - Sezione 9 API vs SVG | 23/12/2025 | Docs |
| 5 | Sistema Check Mappa Concettuale | 22/12/2025 | Docs |
| 6 | Mappa Rete Concettuale | 22/12/2025 | Docs |
| 7 | Live Tracking System | 22/12/2025 | Backend |
| 8 | Match Card Snapshot | 22/12/2025 | Backend |
| 9 | Raw Events Pipeline | 22/12/2025 | Backend |
| 10 | Calculation Queue Worker | 22/12/2025 | Backend |
| 11 | Player Profile Aggregator | 23/12/2025 | Backend |
| 12 | Match Segmentation Engine | 22/12/2025 | Stats |
| 13 | Break Detector | 22/12/2025 | Stats |
| 14 | Pressure Index Calculator | 22/12/2025 | Stats |
| 15 | Momentum Volatility & Elasticity | 22/12/2025 | Stats |
| 16 | Dynamic Surface Thresholds | 22/12/2025 | Stats |
| 17 | Enhanced analyzePowerRankings | 22/12/2025 | Stats |
| 18 | Bug Fix Player Stats + Sofascore | 23/12/2025 | Backend |
| 19 | **Frontend UI/Motion Premium** | 22/12/2025 | Frontend |
| 20 | Phosphor Icons integration | 22/12/2025 | Frontend |
| 21 | Framer Motion animations | 22/12/2025 | Frontend |
| 22 | Motion tokens system | 22/12/2025 | Frontend |
| 23 | prefers-reduced-motion support | 22/12/2025 | Frontend |
| 24 | **Tennis-Scraper API Optimization** | 23/12/2025 | Backend |
| 25 | Tennis-Scraper SVG Icon System | 23/12/2025 | Frontend |
| 26 | **FILOSOFIA_FRONTEND.md unificato** | 23/12/2025 | Docs |
| 27 | FILOSOFIA_MADRE.md aggiornamento | 23/12/2025 | Docs |
| 28 | MAPPA_RETE_CONCETTUALE.md aggiornamento | 23/12/2025 | Docs |

### Dettagli FILOSOFIA_FRONTEND.md (completato 23/12/2025)

Documento unificato che include:
- Visual design (wireframe ASCII) per HOME e MATCH PAGE
- Backend allacci per ogni TAB (funzioni + endpoint)
- Sistema strategie (🟢🟡🔴) + 3 strategie specifiche
- JSON Schema completo (match-bundle.v1)
- Motion/Icons spec (Framer Motion + Phosphor)
- Checklist finale

| Sezione | Contenuto |
|---------|-----------|
| HOME | Wireframe + `liveManager`, `matchCardService` |
| MATCH PAGE | Layout 3 zone + endpoint REST/WS |
| OVERVIEW | Quick Signals + `pressureCalculator`, `valueInterpreter` |
| STRATEGIE | Card standard + Strategy Engine (DA CREARE) |
| ODDS | Trading UI + `oddsService` (DA CREARE) |
| POINT-BY-POINT | Filtri + `breakDetector` |
| STATS | Standard + Trading-oriented |
| MOMENTUM | Trend + `momentumService` (DA CREARE) |
| PREDICTOR | Edge vs market + `predictorService` (DA CREARE) |
| JOURNAL | Trade log |
| RIGHT RAIL | Quick trades sempre visibile |

**Fonte**: Unificazione di 5 documenti txt forniti dall'utente

### Dettagli Dual Source Logic (completato 23/12/2025)

| Componente | Modifiche | File |
|------------|-----------|------|
| Data Detection | `isSvgSource`, `hasBreakOccurred` flags | `IndicatorsChart.jsx:189-190` |
| Game Totali | Logica separata API vs SVG | `IndicatorsChart.jsx:195-230` |
| Break Source | Campo `breakSource` nel return | `IndicatorsChart.jsx:335` |
| Documentation | Sezione 9 - Gestione Data Source | `FILOSOFIA_STATS_V2.md` |

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
- [ ] FILOSOFIA_AI.md
- [ ] FILOSOFIA_OBSERVABILITY.md
- [x] ~~FILOSOFIA_STRATEGIES.md~~ → Integrato in FILOSOFIA_FRONTEND.md (sezione Strategie)
- [x] ~~FILOSOFIA_ODDS.md~~ → Esiste già

### ⚠️ Deprecato (concettualmente superato)
- [x] `FILOSOFIA_FRONTEND_UI_UX.md` → Principi UI ora in FILOSOFIA_FRONTEND.md (sezione Motion/Icons)
- [ ] `FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md` → **DA VALUTARE**: contiene pattern data consumption (snapshot vs live, loading, error) - potrebbe restare separato
- [x] `SPEC_FRONTEND_MOTION_UI.md` → Integrato in FILOSOFIA_FRONTEND.md (sezione Motion finale)
- [x] `FILOSOFIA_STATS.md` → Sostituito da V2

---

## 🆕 Nuovi File da Creare (da FILOSOFIA_FRONTEND.md)

> File backend e frontend identificati nel documento unificato

### Backend - Strategie (`backend/strategies/`)

| File | Funzioni | Priorità | Status |
|------|----------|----------|--------|
| `strategyEngine.js` | `evaluateAll()`, `evaluateLayWinner()`, `evaluateBancaServizio()`, `evaluateSuperBreak()`, `getSummary()` | 🔴 Alta | ⏳ TODO |

### Backend - Services (`backend/services/`)

| File | Funzioni | Priorità | Status |
|------|----------|----------|--------|
| `oddsService.js` | `calculateImpliedProbability()`, `calculateFairOdds()`, `detectValueEdge()` | 🔴 Alta | ⏳ TODO |
| `momentumService.js` | `analyzeMomentumOwner()`, `detectMomentumShift()` | 🟡 Media | ⏳ TODO |
| `predictorService.js` | `computeWinProbability()`, `computeBreakNextGameProbability()`, `computeEdgeVsMarket()` | 🟡 Media | ⏳ TODO |

### Frontend - Motion (`src/motion/`)

| File | Exports | Priorità | Status |
|------|---------|----------|--------|
| `tokens.ts` | `durations`, `easings`, `variants` (fadeUp, cardHover, stagger, tableRow) | 🟡 Media | ⏳ TODO |
| `MotionCard.tsx` | Wrapper card con hover lift | 🟢 Bassa | ⏳ TODO |
| `MotionButton.tsx` | Button con tap/hover feedback | 🟢 Bassa | ⏳ TODO |
| `MotionTab.tsx` | Tab con underline animata | 🟢 Bassa | ⏳ TODO |
| `MotionRow.tsx` | Row tabella con fade slide | 🟢 Bassa | ⏳ TODO |

### Backend - Endpoint REST

| Endpoint | Payload | Priorità |
|----------|---------|----------|
| `GET /api/home/live` | Lista match + mini card + count strategie 🟢/🟡 | 🔴 Alta |
| `GET /api/match/:id/overview` | Scoreboard, odds, quick signals, strategy summary | 🔴 Alta |
| `GET /api/match/:id/strategies` | Strategy signals array | 🔴 Alta |
| `GET /api/match/:id/bundle?tabs=...` | Payload unificato per tab | 🟡 Media |
| `WS /ws/match/:id` | Push: scoreboard, odds, pbp, strategy signals | 🟡 Media |
| `POST /api/match/:id/trade` | Salva trade | 🟢 Bassa |
| `GET /api/match/:id/journal` | Trade log | 🟢 Bassa |

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

