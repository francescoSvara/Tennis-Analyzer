# 📋 TODO LIST – React Betfair Tennis

> **Ultimo aggiornamento**: 24 Dicembre 2025 (ore 22:00)

---

## ✅ COMPLETATO (Sessione 24/12/2025)

### Bundle Endpoint & Data Mapping
- [x] ✅ Endpoint `GET /api/match/:eventId/bundle` implementato (L3170-3370)
- [x] ✅ Hook `useMatchBundle.jsx` creato e funzionante
- [x] ✅ `normalizeOddsForBundle()` - converte DB format → frontend format
- [x] ✅ `normalizePointsForBundle()` - normalizza point-by-point (supporta `score_p1/score_p2` e legacy)
- [x] ✅ `header.features.serveDominance` aggiunto
- [x] ✅ `header.features.returnDominance` aggiunto
- [x] ✅ `header.features.breakProbability` aggiunto
- [x] ✅ `tabs.momentum.qualityStats` aggiunto (winners/UE)
- [x] ✅ `tabs.predictor.breakProbability` aggiunto

### Tab Fixes
- [x] ✅ `MomentumTab.jsx` - legge qualityStats e serveDominance correttamente
- [x] ✅ `PredictorTab.jsx` - legge breakProbability con fallback
- [x] ✅ `StrategiesTab.jsx` - fix `statusKey` → `status`
- [x] ✅ `RightRail.jsx` - fix mapping dati strategia
- [x] ✅ `StatsTab` - dati calcolati da score (aces, doubleFaults, etc.)
- [x] ✅ `OverviewTab.keyStats` - usa valori da statsTab invece di zeri fissi
- [x] ✅ `MatchPage.jsx` - fix tab ID `pointByPoint` (era `pointbypoint`)

### Point-by-Point Data Recovery
- [x] ✅ `getMatchPointByPoint()` - fallback a tabella `point_by_point` legacy
- [x] ✅ `normalizePointsForBundle()` - supporta `score_p1`/`score_p2` DB format
- [x] ✅ Match 15255681 restituisce 82 punti con score corretti ("15-0", "40-40", etc.)
- [x] ✅ Supporto tiebreak score ("0-1", "1-1", "6-4")
- [x] ✅ `pointWinner` normalizzato ("home"/"away")

### Match List Unification (NUOVO 24/12/2025)
- [x] ✅ `/api/matches/db` - Unifica `matches_new` (SofaScore) e `matches` (XLSX legacy)
- [x] ✅ Priorità a match SofaScore (hanno point-by-point)
- [x] ✅ Param `source`: 'sofascore' | 'xlsx' | 'all' (default)
- [x] ✅ `dataQuality` esposto per ogni match (35-55 per SofaScore, 30 per XLSX)
- [x] ✅ Match 15255681 (Tien vs Blockx) ora visibile nella lista

### Documentazione Aggiornata
- [x] ✅ `FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md` - sezioni 15-17
- [x] ✅ `FILOSOFIA_STATS_V3.md` - sezioni 12-13 espanse
- [x] ✅ `FILOSOFIA_FRONTEND.md` - sezioni Backend Functions aggiornate

---

## 🚨 VIOLAZIONI ARCHITETTURALI (da Audit 24/12/2025)

> Violazioni identificate rispetto alle filosofie in `docs/filosofie/`

| Gravità | Conteggio | Stato |
|---------|-----------|-------|
| 🔴 ALTA | 1 | Da risolvere |
| 🟠 MEDIA | 4 | Da pianificare |

---

## 🔴 ALTA PRIORITÀ – Violazioni Critiche

### ~~1. Endpoint MatchBundle MANCANTE~~ ✅ RISOLTO
~~**Violazione**: `FILOSOFIA_DB_V2.md`, `FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md`~~

### ~~2. Strategy Engine è PLACEHOLDER~~ ✅ FUNZIONANTE
~~5 strategie implementate in `backend/strategies/strategyEngine.js`~~

### ~~3. Hook useMatchBundle MANCANTE~~ ✅ CREATO
~~`src/hooks/useMatchBundle.jsx` funzionante~~

### 4. Strategie calcolate nel FRONTEND (❌ GRAVE) - DA PULIRE
**Violazione**: `FILOSOFIA_STATS_V3.md` sezione 2
- [ ] Rimuovere `analyzeLayTheWinner` da `src/utils.js` (duplicato - ora in backend)
- [ ] Rimuovere `analyzeBancaServizio` da `src/utils.js` (duplicato - ora in backend)
- [ ] Rimuovere `analyzeSuperBreak` da `src/utils.js` (duplicato - ora in backend)
- [ ] Aggiornare `StrategiesPanel.jsx` per consumare solo da MatchBundle
- File: [src/utils.js](../src/utils.js)

---

## 🟠 MEDIA PRIORITÀ – Violazioni da Pianificare

### 5. Feature Engine duplicato nel Frontend
**Violazione**: `FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md` sezione 0
- [ ] Rimuovere `calculateVolatility` da `src/components/MomentumTab.jsx`
- [ ] Rimuovere `calculateElasticity` da `src/components/MomentumTab.jsx`
- [ ] Usare valori pre-calcolati dal MatchBundle (già disponibili)
- File: [MomentumTab.jsx](../src/components/MomentumTab.jsx)

### 6. calculatePressureIndex nel Frontend
**Violazione**: `FILOSOFIA_CONCEPT_CHECKS_V2.md` invariante 3.2
- [ ] Rimuovere `calculatePressureIndex` da `src/utils.js`
- [ ] Usare `bundle.header.features.pressure` (già disponibile)
- File: [src/utils.js](../src/utils.js)

### 7. calculateDataCompleteness nel Frontend
**Violazione**: `FILOSOFIA_CONCEPT_CHECKS_V2.md` invariante 3.5
- [ ] Rimuovere `calculateDataCompleteness` da `src/utils.js`
- [ ] Usare `bundle.dataQuality` dal backend (già disponibile)
- File: [src/utils.js](../src/utils.js)

### 8. Fetch multipli player stats
**Violazione**: `FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md` sezione 2
- [ ] Unificare fetch in componenti legacy
- I dati dovrebbero essere nel MatchBundle

---

## 📊 TODO Funzionali (Backlog Precedente)

### 🔶 Alta Priorità
- [ ] Odds Engine (Factor Registry, probabilità FAIR)
- [ ] `oddsService.js` - calcolo edge vs market
- [x] ✅ `GET /api/match/:id/strategies` endpoint (parte del bundle)

### 🔶 Media Priorità
- [ ] `momentumService.js` - shift detection (base implementata in featureEngine)
- [ ] `predictorService.js` - win probability (base implementata)
- [ ] Cache Redis per dati live
- [ ] Import automatico XLSX (watcher)
- [ ] Clutch Conversion Rate
- [ ] Serve Vulnerability Index
- [ ] Set Decay Index
- [ ] Snapshot Strategici

### 🔶 Bassa Priorità
- [ ] Provider astratti Live (`LiveProvider`)
- [ ] API esterne (API-Tennis, Sportradar)
- [ ] Live Odds Tracking
- [ ] Daily Match Evaluation Report
- [ ] Historical Pattern Detector

### 📝 Documentazione
- [ ] FILOSOFIA_AI.md
- [ ] FILOSOFIA_OBSERVABILITY.md

---

## 🔧 In Progress

*Nessuna attività in corso*

### ⚠️ PRINCIPIO FONDAMENTALE (25/12/2025)

> **"Mostrare dati = Calcolare dati"**
> 
> Se l'utente chiede di visualizzare un dato, significa che DEVE essere calcolato.
> Un match ha SEMPRE almeno: score, odds, rankings.
> Da questi tre elementi si può SEMPRE calcolare:
> - volatility (da set scores)
> - dominance (da score o odds)
> - pressure (da stato partita)
> - momentum (da andamento score)
> - serveDominance (da rankings)
> - breakProbability (da odds + rankings)
> - stats (stimate da score)
> 
> **MAI restituire null, 0, o fallback statici (50, 25).**

---

## 🎯 FRONTEND DATA CONSUMPTION – TASK LIST DETTAGLIATA (24/12/2025)

> **Obiettivo**: Ogni tab legge correttamente dal MatchBundle e visualizza dati reali.
> **Riferimento**: FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md, FILOSOFIA_STATS_V3.md

### 🔄 Flusso Dati Attuale
```
MatchPage.jsx
  └── useMatchBundle(matchId) → GET /api/match/:id/bundle
        └── returns { bundle, tabs, header, dataQuality }
              ├── header: { match, players, score, odds, features }
              └── tabs: { overview, strategies, odds, stats, momentum, predictor, pointByPoint, journal }
```

### 📦 STEP 1: Verificare struttura Bundle Backend → Frontend

| # | Task | File Backend | File Frontend | Status |
|---|------|--------------|---------------|--------|
| 1.1 | Verificare `header.players` mapping | `server.js:3298-3328` | `MatchPage.jsx:84` | ⬜ |
| 1.2 | Verificare `header.score` mapping | `server.js:extractScore()` | `OverviewTab.jsx:Scoreboard` | ⬜ |
| 1.3 | Verificare `header.features` mapping | `server.js:3334-3338` | `OverviewTab.jsx:QuickSignals` | ⬜ |
| 1.4 | Verificare `tabs` distribution | `server.js:3248-3282` | `MatchPage.jsx:renderTabContent()` | ⬜ |

---

### 📋 STEP 2: Audit Tab per Tab (Frontend legge → Backend produce)

#### 2.1 OverviewTab
**File**: `src/components/match/tabs/OverviewTab.jsx`
**Riceve**: `data=tabs.overview`, `header`, `strategies=tabs.strategies`
**Bundle produce** (`server.js:buildOverviewTab`):
```js
{
  h2h, recentForm, keyStats, alerts, features
}
```

| # | Componente | Legge da | Backend produce? | Task |
|---|------------|----------|------------------|------|
| 2.1.1 | `Scoreboard` | `header.players`, `header.score` | ✅ | Verificare display |
| 2.1.2 | `QuickSignals` | `header.features` o `data.features` | ✅ volatility/pressure/dominance | Testare valori |
| 2.1.3 | `StrategyMiniPanel` | `strategies.signals` | ✅ | Verificare signals array |
| 2.1.4 | `MiniMomentum` | `data.features.momentum` | ⚠️ Da verificare | Aggiungere se manca |

**TODO OverviewTab**:
- [ ] 2.1a: Verificare che `header.score.sets` sia array corretto
- [ ] 2.1b: Verificare che `header.score.game` abbia home/away
- [ ] 2.1c: Verificare che `strategies.signals` sia array con status READY/WATCH/OFF
- [x] 2.1d: Testare QuickSignals con dati reali (volatility != 50) ✅ ORA CALCOLATI DIVERSI PER MATCH

---

#### 2.2 StrategiesTab
**File**: `src/components/match/tabs/StrategiesTab.jsx`
**Riceve**: `data=tabs.strategies`, `header`
**Bundle produce**:
```js
{
  signals: [{ id, name, status, confidence, action, target, conditions, reasons, entry, exit }],
  summary: { ready, watch, off }
}
```

| # | Componente | Legge da | Backend produce? | Task |
|---|------------|----------|------------------|------|
| 2.2.1 | `StrategyCard` | `data.signals[]` | ✅ | Verificare tutti i campi |
| 2.2.2 | Filtri | `data.signals.status` | ✅ | Testare READY/WATCH/OFF |
| 2.2.3 | EventLog | Non implementato | ❌ | Aggiungere event log |

**TODO StrategiesTab**:
- [ ] 2.2a: Verificare mapping `signals[].conditions` (array di condizioni con `met: boolean`)
- [ ] 2.2b: Verificare `entry` e `exit` rules display
- [ ] 2.2c: Testare confidence value display
- [ ] 2.2d: Aggiungere Event Log (timestamp segnali)

---

#### 2.3 OddsTab
**File**: `src/components/match/tabs/OddsTab.jsx`
**Riceve**: `data=tabs.odds`, `header`, `strategies`
**Bundle produce**:
```js
{
  matchWinner: { home: {value, trend}, away: {value, trend} } | null,
  history: [],
  spreads: null,
  totals: null
}
```

| # | Componente | Legge da | Backend produce? | Task |
|---|------------|----------|------------------|------|
| 2.3.1 | `OddsDisplay` | `data.matchWinner.home/away.value/trend` | ⚠️ | Normalizzare struttura |
| 2.3.2 | `QuickTickets` | `data.matchWinner` | ⚠️ | Aggiungere valori |
| 2.3.3 | `StrategyContext` | `strategies.signals` | ✅ | Testare |
| 2.3.4 | `OddsChart` | `data.history` | ❌ Sempre vuoto | Implementare history |

**TODO OddsTab**:
- [ ] 2.3a: Backend `tabs.odds.matchWinner` deve avere struttura `{ home: { value, trend }, away: { value, trend } }`
- [ ] 2.3b: Se `matchWinner` è null, mostrare placeholder / messaggio
- [ ] 2.3c: Implementare odds history fetch/storage (attualmente sempre `[]`)
- [ ] 2.3d: Verificare QuickTickets con valori reali

---

#### 2.4 PointByPointTab
**File**: `src/components/match/tabs/PointByPointTab.jsx`
**Riceve**: `data=tabs.pointByPoint`, `header`
**Bundle produce**:
```js
{
  points: [{ time, set, game, server, score, description, type, isBreakPoint, rallyLength }],
  hasMore: boolean,
  total: number
}
```

| # | Componente | Legge da | Backend produce? | Task |
|---|------------|----------|------------------|------|
| 2.4.1 | `PointRow` | `data.points[]` | ⚠️ | Verificare struttura punto |
| 2.4.2 | Filtri | `point.type`, `point.isBreakPoint` | ⚠️ | Verificare flags |
| 2.4.3 | Load More | `data.hasMore`, `data.total` | ✅ | Implementare load more |

**TODO PointByPointTab**:
- [x] 2.4a: Verificare che backend restituisca `points[]` con struttura corretta ✅ COMPLETATO
- [x] 2.4b: Ogni punto deve avere: `time, set, game, server ('home'|'away'), score, description` ✅ COMPLETATO
- [x] 2.4c: Flag `isBreakPoint`, `type` ('break_point', 'double_fault', 'ace') ✅ COMPLETATO
- [ ] 2.4d: Implementare "Load More" fetch se `hasMore = true`

**Note Point-by-Point (24/12/2025)**:
- Tabelle supportate: `match_point_by_point_new` (primaria), `point_by_point` (legacy fallback)
- Match 15255681 (Tien vs Blockx) ha 82 punti nel DB
- Formato score: `score_p1`-`score_p2` normalizzato a "15-0", "30-15", etc.
- Campo `server` è `null` nel DB originale → mostrato come "unknown"
- Campo `point_winner`: 1=home, 2=away → normalizzato a "home"/"away"

---

#### 2.5 StatsTab
**File**: `src/components/match/tabs/StatsTab.jsx`
**Riceve**: `data=tabs.stats`, `header`
**Bundle produce** (`server.js:buildStatsTab`):
```js
{
  serve: { home: {...}, away: {...} },
  return: { home: {...}, away: {...} },
  points: { home: {...}, away: {...} }
}
```

| # | Componente | Legge da | Backend produce? | Task |
|---|------------|----------|------------------|------|
| 2.5.1 | `StatBar` serve | `data.serve.home/away` | ✅ | Verificare valori |
| 2.5.2 | `StatBar` return | `data.return.home/away` | ✅ | Verificare valori |
| 2.5.3 | `TradingStat` | `data.tradingStats` | ❌ Mancante | Aggiungere a backend |

**TODO StatsTab**:
- [x] 2.5a: Verificare `serve.home/away` hanno: `aces, doubleFaults, firstServePct, firstServeWonPct, secondServeWonPct` ✅ STIMATI DA SCORE
- [x] 2.5b: Verificare `return.home/away` hanno: `returnPointsWonPct, breakPointsWonPct` ✅ STIMATI
- [x] 2.5c: Verificare `points.home/away` hanno: `totalPointsWon` ✅ CALCOLATI
- [ ] 2.5d: Aggiungere `tradingStats` al backend (holdDifficulty, pressurePointsWon, clutchIndex)

---

#### 2.6 MomentumTab
**File**: `src/components/match/tabs/MomentumTab.jsx`
**Riceve**: `data=tabs.momentum`, `header`
**Bundle produce**:
```js
{
  powerRankings: [],
  features: { trend, recentSwing, breakCount }
}
```

| # | Componente | Legge da | Backend produce? | Task |
|---|------------|----------|------------------|------|
| 2.6.1 | Trend indicator | `data.features.trend` | ✅ | Verificare 'stable'/'up'/'down' |
| 2.6.2 | `ServeDominance` | `header.features.serveDominance` | ❌ Mancante | Aggiungere |
| 2.6.3 | `QualityStats` | Non collegato | ❌ | Aggiungere winners/UE |
| 2.6.4 | `PowerRankings` visualization | `data.powerRankings` | ✅ | Implementare chart |

**TODO MomentumTab**:
- [x] 2.6a: Backend `header.features` deve includere `serveDominance`, `returnDominance` ✅ CALCOLATI
- [x] 2.6b: Backend `tabs.momentum` deve includere `qualityStats: { home: { winners, ue }, away: { winners, ue } }` ✅ STIMATI
- [ ] 2.6c: Implementare visualizzazione powerRankings (punti ultimi N)
- [x] 2.6d: Verificare `features.trend` logica backend (quando è 'up'/'down'?) ✅ CALCOLATO DA SCORE

---

#### 2.7 PredictorTab
**File**: `src/components/match/tabs/PredictorTab.jsx`
**Riceve**: `data=tabs.predictor`, `header`
**Bundle produce**:
```js
{
  winProbability: { home, away },
  keyFactors: [],
  breakProbability: null,
  marketComparison: null
}
```

| # | Componente | Legge da | Backend produce? | Task |
|---|------------|----------|------------------|------|
| 2.7.1 | `ProbabilityGauge` | `data.winProbability` | ✅ | Verificare valori |
| 2.7.2 | `KeyFactors` | `data.keyFactors` | ⚠️ | Verificare struttura |
| 2.7.3 | `BreakProbability` | `data.breakProbability` | ❌ | Aggiungere |
| 2.7.4 | `MarketComparison` | `data.marketComparison` | ❌ | Aggiungere edge calc |

**TODO PredictorTab**:
- [ ] 2.7a: `winProbability.home + away` deve fare 100
- [ ] 2.7b: `keyFactors[]` deve avere `{ label, value, impact: 'positive'|'negative'|'neutral' }`
- [ ] 2.7c: Aggiungere `breakProbability` dal featureEngine
- [ ] 2.7d: Aggiungere `marketComparison` con edge vs implied odds

---

#### 2.8 JournalTab
**File**: `src/components/match/tabs/JournalTab.jsx`
**Riceve**: `data=tabs.journal`, `matchId`
**Bundle produce**: `{ enabled: true }` (dati in localStorage)

**TODO JournalTab**:
- [ ] 2.8a: Verificare localStorage read/write funziona
- [ ] 2.8b: Verificare UI per aggiungere trade entries
- [ ] 2.8c: (Opzionale) Sincronizzare con backend per persistenza

---

### 🔧 STEP 3: Backend Fixes Required

| # | Fix | File | Linea Approx | Priorità | Status |
|---|-----|------|--------------|----------|--------|
| 3.1 | `tabs.odds.matchWinner` struttura normalizzata | `server.js` | ~3268 | 🔴 ALTA | ✅ DONE |
| 3.2 | `header.features` aggiungere serveDominance/returnDominance/breakProb | `server.js` | ~3346 | 🔴 ALTA | ✅ DONE |
| 3.3 | `tabs.stats` aggiungere tradingStats (holdDifficulty etc) | `server.js:buildStatsTab` | ~3433 | 🟠 MEDIA | ⬜ |
| 3.4 | `tabs.momentum.qualityStats` aggiungere winners/UE | `server.js` | ~3284 | 🟠 MEDIA | ✅ DONE |
| 3.5 | `tabs.predictor.breakProbability` aggiungere | `server.js` | ~3298 | 🟠 MEDIA | ✅ DONE |
| 3.6 | `tabs.pointByPoint.points[]` normalizzare struttura | `server.js` | ~3273 | 🔴 ALTA | ✅ DONE |
| 3.7 | Feature Engine: calcolare serveDominance, returnDominance | `featureEngine.js` | ESISTENTE | 🔴 ALTA | ✅ GIÀ FATTO |

### Frontend Tab Fixes Done:
- ✅ `MomentumTab.jsx`: Legge `data.qualityStats` e `header.features.serveDominance/returnDominance`
- ✅ `PredictorTab.jsx`: Legge `data.breakProbability` con fallback a `header.features.breakProbability`
- ✅ `OddsTab.jsx`: Legge `data.matchWinner.home.value/trend` (già corretto)

---

### 🧪 STEP 4: Test End-to-End

| # | Test | Comando/Metodo | Status |
|---|------|----------------|--------|
| 4.1 | Bundle endpoint returns valid JSON | `curl /api/match/{id}/bundle` | ✅ OK |
| 4.2 | Frontend riceve bundle completo | Browser DevTools Network | ✅ Struttura corretta |
| 4.3 | OverviewTab mostra score corretto | Visual check | ✅ Players, QuickSignals, StrategyMiniPanel |
| 4.4 | StrategiesTab mostra signals | Visual check | ✅ 5 signals, conditions object |
| 4.5 | StatsTab mostra stats numeriche | Visual check | ✅ Struttura serve/return/points |
| 4.6 | MomentumTab mostra trend | Visual check | ✅ features.trend, qualityStats |
| 4.7 | OddsTab mostra quote | Visual check | ✅ matchWinner.home/away.value |

### 📝 NOTE: Dati vuoti nel database

Il match 15108295 (Sinner vs Alcaraz) non ha statistiche nel database:
- `match_statistics_new`: vuota
- `match_point_by_point_new`: vuota
- Solo `match_odds` ha 1 record

**Soluzione implementata (25/12/2025)**: 
- `buildStatsTab()` ora stima le statistiche dallo score quando mancano nel DB
- `featureEngine.js` calcola features da score/odds/rankings quando mancano powerRankings
- Tutti i match mostrano valori calcolati, MAI zeri o fallback statici
- Campo `dataSource: "estimated"|"database"` indica l'origine dei dati

---

### 📊 Priorità Esecuzione

**COMPLETATO 24/12/2025:**
1. ✅ **STEP 3.1**: Fix `tabs.odds.matchWinner` - ora `{ home: { value, trend }, away: { value, trend } }`
2. ✅ **STEP 3.6**: Fix `tabs.pointByPoint.points[]` - normalizzato con helper `normalizePointsForBundle()`
3. ✅ **STEP 3.7**: Feature Engine serveDominance - già esistente in featureEngine.js
4. ✅ **STEP 3.2**: header.features - aggiunto serveDominance, returnDominance, breakProbability
5. ✅ **STEP 3.4-3.5**: Momentum qualityStats e Predictor breakProbability aggiunti

**PROSSIMI STEP:**
- 🟠 STEP 3.3: Aggiungere tradingStats a buildStatsTab (holdDifficulty, clutchIndex, etc.)
- 🟠 STEP 2.x: Visual testing in browser di tutti i tab

### 📁 File Modificati (24/12/2025)

**Backend:**
- `backend/server.js`: Aggiunti `normalizeOddsForBundle()`, `normalizePointsForBundle()`, aggiornato bundle endpoint

**Frontend:**
- `src/components/match/tabs/MomentumTab.jsx`: Legge qualityStats, serveDominance, returnDominance
- `src/components/match/tabs/PredictorTab.jsx`: Legge breakProbability dal bundle
- `src/components/match/tabs/StrategiesTab.jsx`: Fix variabile `statusKey` → `status`

---

## ✅ Completati (24/12/2025)

- [x] Link obsoleti in SPEC_VALUE_SVG.md corretti
- [x] MotionTab.jsx creato (con MotionTabList, MotionTabButton, MotionTabPanel)
- [x] MotionRow.jsx creato (con MotionRowGroup, MotionTableRow)
- [x] interpretGameValue - già esistente nel backend
- [x] rules.v2.json creato con regole MatchBundle-Centric
- [x] checkConceptualMap.js aggiornato con check architetturali
- [x] runConceptChecks.js aggiornato per usare rules.v2.json

## ✅ Completati (25/12/2025) - Feature Calculation Fix

> **Problema risolto**: QuickSignals e StatsTab mostravano valori fissi (50%, 25%, 0) per tutti i match.
> **Principio implementato**: "Mostrare dati = Calcolare dati" - MAI restituire null o fallback statici.

### 🔧 featureEngine.js - Riscrittura completa con fallback calculations

- [x] **computeFeatures()** riscritta con gerarchia di fallback completa
- [x] Aggiunta funzione `calculateVolatilityFromScore()` - stima volatilità da set score
- [x] Aggiunta funzione `calculateDominanceFromScore()` - da rapporto game vinti
- [x] Aggiunta funzione `calculateDominanceFromOdds()` - da probabilità implicita quote
- [x] Aggiunta funzione `calculateServeDominanceFromRankings()` - da ranking ATP
- [x] Aggiunta funzione `calculateBreakProbabilityFromOddsRankings()` - combinata
- [x] Aggiunta funzione `calculatePressureFromScore()` - da stato set corrente
- [x] Aggiunta funzione `calculateMomentumFromScore()` - inferito da andamento score

### 🔧 server.js - buildStatsTab() con stima da score

- [x] **buildStatsTab()** riscritta per stimare statistiche quando mancano nel DB
- [x] Stima aces da games vinti (4-6 per giocatore tipo)
- [x] Stima firstServePct da dominanza (60-70% range)
- [x] Stima winners da points won (2-3 per game)
- [x] Stima unforced errors da points lost
- [x] Aggiunto campo `dataSource: "estimated"|"database"` per tracciabilità

### 🔧 server.js - buildOverviewTab con statsTab

- [x] **buildOverviewTab()** ora riceve `statsTab` come parametro
- [x] keyStats.aces usa `statsTab.serve.home/away.aces`
- [x] keyStats.doubleFaults usa `statsTab.serve.home/away.doubleFaults`
- [x] keyStats.breakPoints usa `statsTab.return.home/away.breakPointsWon`
- [x] Rimossa chiamata duplicata a buildStatsTab() (ottimizzazione)

### 🔧 server.js - Fix header.features

- [x] Rimossi fallback statici `|| 50` e `|| 25` da header.features
- [x] Features ora passano direttamente dal featureEngine (calcolate)
- [x] Aggiunto `player1`, `player2` a featureInput per fallback calculations

### 🔧 server.js - qualityStats per MomentumTab

- [x] qualityStats ora usa valori da buildStatsTab() invece di zeri fissi
- [x] MomentumTab mostra winners/UE reali (stimati se necessario)

### 📚 Documentazione aggiornata

- [x] FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md - Aggiunto "⚠️ PRINCIPIO FONDAMENTALE"
- [x] FILOSOFIA_STATS_V3.md - Aggiunta tabella funzioni fallback, sezione "CALCOLARE SEMPRE"
- [x] MAPPA_RETE_CONCETTUALE_V2.md - Aggiunto "Problema 2" e tabella Feature Engine
- [x] INDEX_FILOSOFIE.md - Aggiunta sezione Feature Engine e "LEZIONI APPRESE"

### ✅ Verificato funzionante

- Match 15108295: volatility=75, pressure=65, dominance=70, serveDominance=65
- Match 15087204: volatility=48, pressure=55, dominance=75
- Match 15104536: volatility=48, pressure=55, dominance=76
- Stats: aces, firstServePct, winners, UE tutti diversi per match

---

## 📦 TODO da Ultimi Implementi (24/12/2025)

> Task emerse durante l'implementazione dei motion components e check scripts

### Motion Components - Integrazione
- [ ] Integrare `MotionTab` nei tab esistenti (MomentumTab, PredictorTab, QuotesTab, StrategiesPanel)
- [ ] Integrare `MotionRow` nelle tabelle esistenti (MatchList, PlayerList)
- [ ] Verificare che `framer-motion` sia installato in package.json
- [ ] Usare `MotionCard` in MatchCard.jsx e PlayerCard.jsx
- [ ] Usare `Skeleton` per loading states nei componenti
- [ ] Usare `EmptyState` per stati vuoti

### Motion Tokens - Completamento
- [ ] Esportare varianti mancanti da tokens.js (springTransition non usata)
- [ ] Aggiungere tokens per colori/ombre motion-aware
- [ ] Documentare tokens in SPEC_FRONTEND_MOTION_UI.md

### Check Scripts - Miglioramenti
- [ ] Aggiungere più regole a rules.v2.json (HPI_IN_FRONTEND, INV-006 patterns)
- [ ] runConceptChecks.js: generare report in formato più leggibile
- [ ] checkConceptualMap.js: aggiungere check per componenti motion non usati
- [ ] Creare script `npm run check:arch` in package.json

### Testing
- [ ] Test per MotionTab (render, switch tab, animation)
- [ ] Test per MotionRow (render, expand/collapse, hover)
- [ ] Test per tokens.js (varianti, reduced motion)

---

## 📏 Legenda

- 🔴 **Alta**: Violazione architetturale critica - blocca allineamento filosofie
- 🟠 **Media**: Violazione importante - da pianificare
- 🟡 **Bassa**: Nice to have / refactoring
- 🔶 **Funzionale**: Feature da implementare

---

*Ultimo audit: 25 Dicembre 2025 | Verifica: `node scripts/checkConceptualMap.js`*

