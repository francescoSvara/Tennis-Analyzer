# MAPPA RETE CONCETTUALE - Riferimenti Interni Progetto

> **Scopo**: documento di navigazione rapida per AI/sviluppatore.
> Contiene tutti i riferimenti verificati tra filosofie, file, funzioni e linee di codice.
>
> **Ultimo aggiornamento**: 23 Dicembre 2025

---

## INDICE RAPIDO

| Sezione | Contenuto |
|---------|-----------|
| [1. Gerarchia Documenti](#1-gerarchia-documenti) | Struttura filosofie + specs |
| [2. Mappa Domini](#2-mappa-domini) | DB, Stats, Live, Odds, Frontend |
| [3. File Backend](#3-file-backend) | Services, utils, scraper, db |
| [4. File Frontend](#4-file-frontend) | Components, hooks, utils |
| [5. Schema Database](#5-schema-database) | Tabelle e relazioni |
| [6. Funzioni per Dominio](#6-funzioni-per-dominio) | Mappatura funzioni - file - linea |
| [7. Flussi Dati](#7-flussi-dati) | Pipeline e trasformazioni |
| [8. Cross-Reference Rapido](#8-cross-reference-rapido) | Lookup veloce |
| [9. Sistema di Check](#9-sistema-di-check) | Verifica automatica |

---

## 1. GERARCHIA DOCUMENTI

```
docs/
├── filosofie/
│   ├── FILOSOFIA_MADRE.md           <- ENTRY POINT (indice)
│   ├── FILOSOFIA_DB.md              <- Dominio: Database + Pipeline
│   ├── FILOSOFIA_STATS_V2.md        <- Dominio: Calcoli + Metriche
│   ├── FILOSOFIA_LIVE_TRACKING.md   <- Dominio: Live + Polling
│   ├── FILOSOFIA_ODDS.md            <- Dominio: Quote + Value
│   ├── FILOSOFIA_FRONTEND_UI_UX.md  <- Dominio: UI principi
│   ├── FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md <- Dominio: Frontend data
│   ├── FILOSOFIA_CONCEPT_CHECKS.md  <- Dominio: Guardrail docs-code
│   ├── filosofia_value_svg.md       <- SVG Momentum Fallback (NEW)
│   └── FILOSOFIA_STATS.md           <- DEPRECATO
│
├── specs/
│   └── SPEC_FRONTEND_MOTION_UI.md   <- Spec operativa UI/motion
│
├── concept/
│   └── rules.v1.json                <- Regole confini domini
│
├── checks/
│   ├── report.md                    <- Report concept checks (auto)
│   └── report.json                  <- Report JSON (auto)
│
├── MAPPA_RETE_CONCETTUALE.md        <- QUESTO FILE
├── CHECK_MAPPA_CONCETTUALE.md       <- Verifica esistenza file (auto)
└── TODO_LIST.md                     <- Task + problemi (semi-auto)
```

### Dipendenze tra Documenti

| Da | A | Tipo |
|----|---|------|
| MADRE | DB, STATS_V2, LIVE, ODDS, FRONTEND_*, CONCEPT_CHECKS | indice |
| DB | STATS_V2 | ref: DATI DERIVATI |
| LIVE | DB | ref: Raw Events Pipeline |
| LIVE | STATS_V2 | ref: DATI DINAMICI |
| ODDS | STATS_V2 | ref: calcolo fair odds |
| ODDS | LIVE | ref: quote live |
| FRONTEND_UI_UX | SPEC_MOTION | dettagli implementativi |
| FRONTEND_UI_UX | FRONTEND_DATA | consumo dati |
| FRONTEND_DATA | LIVE | dati runtime |
| CONCEPT_CHECKS | rules.v1.json | definizione regole |
| MAPPA_RETE | checkConceptualMap.js | verifica esistenza |

---

## 2. MAPPA DOMINI

### 2.1 Dominio DB
**Responsabilita**: Schema, pipeline ingest, raw-canonical, snapshot

| Concetto | File Riferimento | Note |
|----------|-----------------|------|
| Schema base | `backend/migrations/create-new-schema.sql` | 17 tabelle |
| Snapshot + Queue | `backend/migrations/add-snapshot-queue-tables.sql` | 3 tabelle extra |
| Live tracking | `backend/migrations/add-live-tracking-table.sql` | 2 tabelle extra |
| Match Repository | `backend/db/matchRepository.js` | Query DB |
| Match Card Service | `backend/services/matchCardService.js` | Assembla card |
| Raw Events Processor | `backend/services/rawEventsProcessor.js` | Pipeline |
| Calculation Queue Worker | `backend/services/calculationQueueWorker.js` | Task async |
| SVG Momentum Extractor | `backend/utils/svgMomentumExtractor.js` | Estrazione momentum da DOM |

**SVG Momentum Fallback (Dicembre 2025):**
- **Filosofia**: [docs/filosofie/filosofia_value_svg.md](filosofie/filosofia_value_svg.md)
- **Colonne DB**: `value` (API prioritario), `value_svg` (fallback DOM)
- **Funzioni**: `insertPowerRankingsSvg()` L400, `processSvgMomentum()` L302

### 2.2 Dominio STATS
**Responsabilita**: RAW vs DERIVED vs DYNAMIC, livelli Player/Match/Combined

| Concetto | File Riferimento | Linee |
|----------|-----------------|-------|
| Volatility | `backend/utils/valueInterpreter.js` | L291 |
| Elasticity | `backend/utils/valueInterpreter.js` | L330 |
| Match Character | `backend/utils/valueInterpreter.js` | L386 |
| Power Rankings Enhanced | `backend/utils/valueInterpreter.js` | L465 |
| Thresholds per Surface | `backend/utils/valueInterpreter.js` | L55 |
| Comeback Rate | `backend/services/playerStatsService.js` | L214 |
| ROI Calculation | `backend/services/playerStatsService.js` | L252 |
| Player Stats | `backend/services/playerStatsService.js` | L437 |
| Break Detection | `backend/utils/breakDetector.js` | - |
| Match Segmentation | `backend/utils/matchSegmenter.js` | - |
| Pressure Calculation | `backend/utils/pressureCalculator.js` | - |

### 2.3 Dominio LIVE
**Responsabilita**: Polling, tracking, websocket, consolidamento

| Concetto | File Riferimento | Linee |
|----------|-----------------|-------|
| Init Live Manager | `backend/liveManager.js` | L271 |
| Check Tracked Matches | `backend/liveManager.js` | L857 |
| Reconcile Live | `backend/liveManager.js` | L678 |
| Fetch Live List | `backend/liveManager.js` | L775 |
| Save Match to DB | `backend/liveManager.js` | L473 |
| Compute Data Hash | `backend/liveManager.js` | L217 |
| Live Tracking Repository | `backend/db/liveTrackingRepository.js` | CRUD |

### 2.4 Dominio ODDS
**Responsabilita**: Quote mercato, fair odds, value detection, margin

| Concetto | File Riferimento | Linee |
|----------|-----------------|-------|
| Odds Import XLSX | `backend/importXlsx.js` | - |
| Match Odds Table | `backend/migrations/create-new-schema.sql` | match_odds |
| Quote Tab Frontend | `src/components/QuotesTab.jsx` | - |
| Ranking Probability | `src/components/QuotesTab.jsx` | L46 |

**Filosofia**: `docs/filosofie/FILOSOFIA_ODDS.md`
- Quote mercato vs Fair odds
- Value = differenza mercato vs reale
- Pre-match vs Live

### 2.5 Dominio FRONTEND
**Responsabilita**: Visualizzazione, data consumption, motion

| Concetto | File Riferimento | Linee |
|----------|-----------------|-------|
| Extract Key Stats | `src/utils.js` | L1590 |
| Pressure Index (FE) | `src/utils.js` | L1654 |
| Lay The Winner | `src/utils.js` | L1744 |
| Super Break | `src/utils.js` | L2082 |
| Data Completeness | `src/utils.js` | L2326 |
| Momentum Owner | `src/components/MomentumTab.jsx` | L152 |
| Momentum Shift | `src/components/MomentumTab.jsx` | L196 |
| Manual Prediction | `src/components/ManualPredictor.jsx` | L340 |
| Ranking Probability | `src/components/QuotesTab.jsx` | L46 |

---

## 3. FILE BACKEND

### 3.1 Services (`backend/services/`)

| File | Scopo | Funzioni Chiave |
|------|-------|-----------------|
| `matchCardService.js` | Assembla card match | getMatchCard() |
| `playerService.js` | Gestione player + alias | - |
| `playerStatsService.js` | Stats storiche | getPlayerStats(), calculateComebackRate(), calculateROI() |
| `playerProfileService.js` | Profilo completo | - |
| `rawEventsProcessor.js` | Pipeline raw-canonical | processRawEvents() |
| `calculationQueueWorker.js` | Worker task async | processQueue() |
| `dataNormalizer.js` | Normalizzazione dati | normalizePlayerName() L315, generateMatchFingerprint() L481 |
| `unifiedImporter.js` | Import unificato | - |

### 3.2 Utils (`backend/utils/`)

| File | Scopo | Funzioni Chiave |
|------|-------|-----------------|
| `valueInterpreter.js` | Metriche match | calculateVolatility(), calculateElasticity(), classifyMatchCharacter(), analyzePowerRankingsEnhanced() |
| `breakDetector.js` | Analisi break | detectBreaksFromScore() |
| `matchSegmenter.js` | Fasi match | segmentMatch() |
| `pressureCalculator.js` | Pressure live | calculatePressureIndex() |
| `svgMomentumExtractor.js` | Estrazione momentum SVG | extractMomentumFromSvgHtml() L152, processSvgMomentum() L302 |

### 3.3 DB Layer (`backend/db/`)

| File | Scopo |
|------|-------|
| `matchRepository.js` | Query matches |
| `liveTrackingRepository.js` | CRUD live tracking |
| `supabase.js` | Client Supabase |

### 3.4 Scraper (`backend/scraper/`)

| File | Scopo | Endpoints API SofaScore |
|------|-------|------------------------|
| `sofascoreScraper.js` | Scraping SofaScore | `/api/v1/event/{id}`, `/statistics`, `/tennis-power-rankings`, `/point-by-point` |

### 3.5 Migrations (`backend/migrations/`)

| File | Tabelle Create |
|------|----------------|
| `create-new-schema.sql` | players_new, player_aliases, player_rankings, player_career_stats, tournaments_new, matches_new, match_data_sources, match_statistics_new, match_power_rankings_new, match_point_by_point_new, match_odds, head_to_head |
| `add-snapshot-queue-tables.sql` | match_card_snapshot, raw_events, calculation_queue |
| `add-live-tracking-table.sql` | live_tracking, live_snapshots |

---

## 4. FILE FRONTEND

### 4.1 Components (`src/components/`)

| File | Scopo | Funzioni Interne |
|------|-------|------------------|
| `MomentumTab.jsx` | Visualizza momentum | analyzeMomentumOwner() L152, detectMomentumShift() L196 |
| `QuotesTab.jsx` | Analisi quote/value | calculateRankingProbability() L46 |
| `ManualPredictor.jsx` | Predizioni manuali | calculatePrediction() L340 |
| `MatchCard.jsx` | Card singolo match | - |
| `MatchGrid.jsx` | Griglia matches | - |
| `MatchHeader.jsx` | Header match | - |
| `Statistics.jsx` | Stats dettagliate | - |
| `PointByPoint.jsx` | Point-by-point principale | - |
| `PointByPointWidget.jsx` | Widget PbP compatto | - |
| `PointRow.jsx` | Riga singolo punto | - |
| `MomentumChart.jsx` | Grafico momentum | - |
| `IndicatorsChart.jsx` | Grafico indicatori | - |
| `PlayerPage.jsx` | Pagina giocatore | - |
| `HomePage.jsx` | Home | - |
| `Gestionale.jsx` | Admin/gestione | - |
| `MonitoringDashboard.jsx` | Monitoring | - |
| `PredictorTab.jsx` | Tab predizioni | - |
| `SavedScrapes.jsx` | Scrapes salvati | - |
| `ErrorBoundary.jsx` | Gestione errori React | - |
| `GameBlock.jsx` | Blocco singolo game | - |
| `SetBlock.jsx` | Blocco singolo set | - |
| `SportSidebar.jsx` | Sidebar sport | - |
| `StatGroup.jsx` | Gruppo statistiche | - |
| `StatRow.jsx` | Riga statistica | - |

### 4.2 Hooks (`src/hooks/`)

| File | Scopo |
|------|-------|
| `useMatchData.jsx` | Fetch dati match |
| `useLiveUpdates.jsx` | WebSocket live |
| `usePlayerStats.jsx` | Stats giocatore |

### 4.3 Utils (`src/`)

| File | Scopo | Funzioni Chiave |
|------|-------|-----------------|
| `utils.js` | Utility varie | extractKeyStats(), calculatePressureIndex(), layTheWinner(), superBreak(), calculateDataCompleteness() |
| `config.js` | Configurazione | API_URL |

---

## 5. SCHEMA DATABASE

### 5.1 Tabelle Principali (17)

| Tabella | Tipo | Relazioni |
|---------|------|-----------|
| `players_new` | Master | - |
| `player_aliases` | Lookup | FK: players_new |
| `player_rankings` | Storico | FK: players_new |
| `player_career_stats` | Aggregato | FK: players_new |
| `tournaments_new` | Master | - |
| `matches_new` | Core | FK: players_new, tournaments_new |
| `match_data_sources` | Audit | FK: matches_new |
| `match_statistics_new` | Dettaglio | FK: matches_new |
| `match_power_rankings_new` | Serie | FK: matches_new |
| `match_point_by_point_new` | Dettaglio | FK: matches_new |
| `match_odds` | Quote | FK: matches_new |
| `head_to_head` | Aggregato | FK: players_new |

### 5.2 Tabelle Snapshot/Queue (3)

| Tabella | Scopo |
|---------|-------|
| `match_card_snapshot` | Card pre-calcolate |
| `raw_events` | Payload originali |
| `calculation_queue` | Coda task asincroni |

### 5.3 Tabelle Live (2)

| Tabella | Scopo |
|---------|-------|
| `live_tracking` | Match in corso |
| `live_snapshots` | Snapshot periodici |

---

## 6. FUNZIONI PER DOMINIO

### 6.1 Calcolo Metriche

| Funzione | File | Linea |
|----------|------|-------|
| `calculateVolatility()` | valueInterpreter.js | 291 |
| `calculateElasticity()` | valueInterpreter.js | 330 |
| `classifyMatchCharacter()` | valueInterpreter.js | 386 |
| `analyzePowerRankingsEnhanced()` | valueInterpreter.js | 465 |
| `detectBreaksFromScore()` | breakDetector.js | - |
| `segmentMatch()` | matchSegmenter.js | - |
| `calculatePressureIndex()` | pressureCalculator.js | - |

### 6.2 SVG Momentum (Fallback)

| Funzione | File | Linea |
|----------|------|-------|
| `extractMomentumFromSvgHtml()` | svgMomentumExtractor.js | 152 |
| `processSvgMomentum()` | svgMomentumExtractor.js | 302 |
| `normalizeMomentumPerSet()` | svgMomentumExtractor.js | 262 |
| `toPowerRankingsFormat()` | svgMomentumExtractor.js | 272 |
| `insertPowerRankingsSvg()` | matchRepository.js | 400 |
| `getPowerRankings()` (con fallback) | matchRepository.js | 770 |

### 6.3 Player Stats

| Funzione | File | Linea |
|----------|------|-------|
| `getPlayerStats()` | playerStatsService.js | 437 |
| `calculateComebackRate()` | playerStatsService.js | 214 |
| `calculateROI()` | playerStatsService.js | 252 |

### 6.4 Normalizzazione

| Funzione | File | Linea |
|----------|------|-------|
| `normalizePlayerName()` | dataNormalizer.js | 315 |
| `generateMatchFingerprint()` | dataNormalizer.js | 481 |

### 6.5 Frontend Utils

| Funzione | File | Linea |
|----------|------|-------|
| `extractKeyStats()` | utils.js | 1590 |
| `calculatePressureIndex()` | utils.js | 1654 |
| `layTheWinner()` | utils.js | 1744 |
| `superBreak()` | utils.js | 2082 |
| `calculateDataCompleteness()` | utils.js | 2326 |

---

## 7. FLUSSI DATI

### 7.1 Import XLSX

```
XLSX File
  -> importXlsx.js
    -> dataNormalizer.normalizePlayerName()
    -> matchRepository.insertMatch()
      -> matches_new + match_odds
```

### 7.2 Scraping SofaScore

```
SofaScore API
  -> sofascoreScraper.js
    -> raw_events (PENDING)
      -> rawEventsProcessor.processRawEvents()
        -> matches_new + match_statistics_new + match_power_rankings_new
```

### 7.3 Live Tracking

```
liveManager.initLiveTracking()
  -> fetchLiveList() ogni 30s
    -> per ogni match live:
      -> sofascoreScraper.getMatchData()
      -> liveTrackingRepository.upsert()
      -> WebSocket broadcast
```

### 7.4 Match Card

```
GET /api/match/:id/card
  -> matchCardService.getMatchCard()
    -> check match_card_snapshot (cache)
    -> se miss: assembla da tabelle canoniche
    -> return card
```

### 7.5 SVG Momentum Fallback (Tennis-Scraper-Local)

```
1. User copia SVG da SofaScore DevTools
2. Incolla in Modal (Tennis-Scraper-Local)
3. POST localhost:3002/api/match/:eventId/momentum-svg
   -> processSvgMomentum(svgHtml)
      -> extractMomentumFromSvgHtml()
      -> normalizeMomentumPerSet()
      -> toPowerRankingsFormat()
   -> insertPowerRankingsSvg(eventId, rankings)
      -> UPDATE power_rankings SET value_svg = ... (NON tocca value!)
4. Lettura: getPowerRankings() usa COALESCE(value, value_svg)
```

**Principio**: API data (`value`) ha SEMPRE priorità. SVG (`value_svg`) è solo fallback.

---

## 8. CROSS-REFERENCE RAPIDO

### 8.1 Cerco una funzione

| Concetto | Funzione | File |
|----------|----------|------|
| Volatility match | `calculateVolatility` | backend/utils/valueInterpreter.js |
| Break detection | `detectBreaksFromScore` | backend/utils/breakDetector.js |
| Player stats | `getPlayerStats` | backend/services/playerStatsService.js |
| Match card | `getMatchCard` | backend/services/matchCardService.js |
| Scraping | `getMatchData` | backend/scraper/sofascoreScraper.js |
| Live tracking | `initLiveTracking` | backend/liveManager.js |
| SVG extraction | `extractMomentumFromSvgHtml` | backend/utils/svgMomentumExtractor.js |
| SVG insert | `insertPowerRankingsSvg` | backend/db/matchRepository.js |
| SVG process | `processSvgMomentum` | backend/utils/svgMomentumExtractor.js |

### 8.2 Cerco una tabella

| Dato | Tabella | File creazione |
|------|---------|----------------|
| Giocatori | `players_new` | create-new-schema.sql |
| Match | `matches_new` | create-new-schema.sql |
| Statistiche | `match_statistics_new` | create-new-schema.sql |
| Momentum | `match_power_rankings_new` | create-new-schema.sql |
| Quote | `match_odds` | create-new-schema.sql |
| Live | `live_tracking` | add-live-tracking-table.sql |
| Snapshot | `match_card_snapshot` | add-snapshot-queue-tables.sql |

### 8.3 Cerco una filosofia

| Argomento | Documento |
|-----------|-----------|
| Architettura generale | FILOSOFIA_MADRE.md |
| Schema DB, pipeline | FILOSOFIA_DB.md |
| Metriche, calcoli | FILOSOFIA_STATS_V2.md |
| Live, polling | FILOSOFIA_LIVE_TRACKING.md |
| Quote, value | FILOSOFIA_ODDS.md |
| UI/UX | FILOSOFIA_FRONTEND_UI_UX.md |
| Fetch dati frontend | FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md |
| Guardrail code | FILOSOFIA_CONCEPT_CHECKS.md |
| Animazioni | SPEC_FRONTEND_MOTION_UI.md |
| **SVG Momentum Fallback** | **filosofia_value_svg.md** |

---

## 9. SISTEMA DI CHECK

### 9.1 Due Livelli di Verifica

| Check | Script | Cosa Verifica |
|-------|--------|---------------|
| **Mappa Concettuale** | `checkConceptualMap.js` | File esistono? Funzioni a linee corrette? Tabelle DB esistono? |
| **Concept Checks** | `runConceptChecks.js` | Confini domini rispettati? Import leciti? Pattern corretti? |

### 9.2 Regole Architetturali (`docs/concept/rules.v1.json`)

```
domains:
├── frontend_ui        # src/components/*.jsx - NO import supabase/scraper
├── frontend_hooks     # src/hooks/*.js - NO import supabase
├── frontend_utils     # src/utils.js - NO calcoli odds complessi
├── backend_api        # server.js - routing only
├── backend_services   # services/*.js - NO req/res diretti
├── backend_db         # db/*.js - NO business logic
├── backend_utils      # utils/*.js - pure functions, NO DB access
└── backend_scraper    # scraper/*.js - external fetch only
```

### 9.3 Invarianti Principali

| ID | Severita | Regola |
|----|----------|--------|
| INV-001 | ERROR | Frontend non accede a Supabase |
| INV-002 | ERROR | Frontend non fa scraping diretto |
| INV-003 | WARN | Calcoli odds nel backend |
| INV-004 | WARN | Repository no business logic |
| INV-005 | ERROR | Utils pure (no DB access) |
| INV-006 | WARN | No duplicazione frontend/backend |
| INV-007 | INFO | No console.log in produzione |
| INV-008 | WARN | No URL hardcoded |
| INV-009 | ERROR | Services no Express diretto |
| INV-010 | WARN | No magic numbers |

### 9.4 Comandi Rapidi

```bash
# CHECK COMPLETO (tutti e tre i comandi)
node scripts/checkConceptualMap.js && node scripts/runConceptChecks.js

# Solo mappa (esistenza file/funzioni)
node scripts/checkConceptualMap.js

# Solo confini architetturali
node scripts/runConceptChecks.js

# Solo file modificati (per CI/PR)
node scripts/runConceptChecks.js --mode diff
```

**Per Copilot**: chiedi "fai check" o "controlla progetto"

---

## NOTE PER NAVIGAZIONE

1. **Partire sempre da FILOSOFIA_MADRE.md** per capire i domini
2. **Per dettagli implementativi DB** - FILOSOFIA_DB.md
3. **Per capire tipi di dati (RAW/DERIVED/DYNAMIC)** - FILOSOFIA_STATS_V2.md
4. **Per live/polling** - FILOSOFIA_LIVE_TRACKING.md
5. **Per quote e value** - FILOSOFIA_ODDS.md
6. **Per UI/motion** - SPEC_FRONTEND_MOTION_UI.md
7. **Per confini domini** - FILOSOFIA_CONCEPT_CHECKS.md + rules.v1.json
8. **Per query rapide file/linea** - Sezione 8 di questo documento

---

## INCONGRUENZE RILEVATE

### Da Concept Checks (automatico)

| Severita | ID | File | Problema |
|----------|-----|------|----------|
| ERROR | INV-002 | `src/hooks/useMatchData.jsx:124` | Frontend fa scraping diretto |
| WARN | INV-010 | `backend/utils/*.js` (36 occorrenze) | Magic numbers |

### Da FILOSOFIA_STATS_V2.md

- Metriche DERIVATE ricalcolate runtime - da correggere
- Data Quality calcolata nel frontend - `calculateDataCompleteness()` in utils.js L2326
- Logiche duplicate backend/frontend - pressureCalculator vs calculatePressureIndex
- Funzioni senza livello (player/match) - da documentare

---

*Documento aggiornato: 22 Dicembre 2025*
