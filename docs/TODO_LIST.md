# 📋 TODO LIST – Tennis Analyzer v3.0

> **Ultimo aggiornamento**: 26 Dicembre 2025  
> **Deep Philosophy Check**: ✅ 0 errori  
> **TODO Filosofie**: ✅ 0 rimanenti (tutti implementati!)  
> **Concept Checks**: 0 errori, 4 warning ✅  
> **Check Mappa**: 125+ passati ✅

---

## 🔬 Problemi Deep Philosophy Check (Auto-generato)

> Ultimo check: 2025-12-25
> Esegui: `node scripts/deepPhilosophyCheck.js`

### 🔴 File/Funzioni Mancanti (5)

- [ ] **DEEP-001** - `backend/services/matchCardService.js:undefined` - matchCardService deve integrare risk output nel bundle (FILOSOFIA_RISK_BANKROLL)
- [ ] **DEEP-002** - `backend/services/matchCardService.js:undefined` - matchCardService deve includere meta.as_of_time nel bundle (FILOSOFIA_TEMPORAL)
- [ ] **DEEP-003** - `backend/services/matchCardService.js:undefined` - matchCardService deve includere meta.versions nel bundle (FILOSOFIA_LINEAGE_VERSIONING)
- [ ] **DEEP-004** - `backend/server.js:undefined` - Odds devono avere timestamp per tracciare movimento (FILOSOFIA_ODDS)
- [ ] **DEEP-005** - `backend/utils/featureEngine.js:undefined` - featureEngine: MAI restituire null, sempre fallback calcolato (FILOSOFIA_CALCOLI)

## 📊 STATO COMPLESSIVO

```
✅ DEEP-CHECK:     0 errori (tutti i pattern implementati!)
✅ TODO-FILOS:     0 rimanenti (quality, bet_decisions, surface)
✅ CONCEPT:        0 errori, 4 warning
✅ MAPPA:        125+ file verificati esistenti
```

> **PRINCIPIO FONDAMENTALE:**
> Le filosofie dichiarano cosa DEVE esistere → Il codice si adatta alle filosofie, MAI il contrario.

**⚠️ Comandi check:**
```bash
node scripts/deepPhilosophyCheck.js   # Verifica implementazione filosofie
node scripts/runConceptChecks.js      # Verifica pattern architetturali  
node scripts/checkConceptualMap.js    # Verifica esistenza file
```

---

## ✅ Problemi Deep Philosophy Check - TUTTI RISOLTI!

> Ultimo check: 2025-12-25 (Notte)
> Esegui: `node scripts/deepPhilosophyCheck.js`

### ✅ TEMPORAL SEMANTICS (3/3 risolti)

| ID | File | Problema | Status |
|----|------|----------|--------|
| DEEP-002 | `backend/liveManager.js` | Pattern `ingestion_time`, `event_time` | ✅ Implementato |
| DEEP-003 | `backend/utils/featureEngine.js` | Supporto `as_of_time` | ✅ Implementato |
| DEEP-004 | `backend/server.js` | Bundle con `meta.as_of_time` | ✅ Implementato |

### ✅ MATCHCARDSERVICE (2/2 risolti)

| ID | File | Problema | Status |
|----|------|----------|--------|
| DEEP-001 | `backend/server.js` | Integrazione `risk` output | ✅ riskEngine.analyzeRisk integrato |
| DEEP-005 | `backend/server.js` | `meta.versions` | ✅ Già presente |

### ✅ FRONTEND HOOK (1/1 risolto)

| ID | File | Problema | Status |
|----|------|----------|--------|
| DEEP-006 | `src/hooks/useMatchBundle.jsx` | Espone `meta` dal bundle | ✅ Implementato |

### ✅ ODDS (1/1 risolto)

| ID | File | Problema | Status |
|----|------|----------|--------|
| DEEP-007 | `backend/server.js` | Odds con `event_time` | ✅ Implementato in normalizeOddsForBundle |

### ✅ LIVE TRACKING (1/1 risolto)

| ID | File | Problema | Status |
|----|------|----------|--------|
| DEEP-008 | `liveTrackingRepository.js` | Pattern `snapshotTime` | ✅ Implementato in recordPollSuccess |

### ✅ CALCOLI (1/1 risolto)

| ID | File | Problema | Status |
|----|------|----------|--------|
| DEEP-009 | `featureEngine.js` | MAI null, sempre fallback | ✅ Rimossi null, aggiunto isEstimated flag |

---

## ✅ Problemi Risolti (25 Dic 2025 - Notte)

I seguenti problemi sono stati corretti:

| Categoria | Risolti |
|-----------|---------|
| **TEMPORAL SEMANTICS** | `ingestion_time`, `event_time` in liveManager ✅ |
| **AS_OF_TIME** | Parametro in featureEngine + meta.as_of_time in bundle ✅ |
| **RISK ENGINE** | Integrato `analyzeRisk()` nel bundle meta ✅ |
| **META EXPOSED** | useMatchBundle espone `meta` object ✅ |
| **ODDS EVENT_TIME** | normalizeOddsForBundle con event_time ✅ |
| **SNAPSHOT_TIME** | recordPollSuccess con snapshotTime ✅ |
| **NO NULL RETURNS** | featureEngine usa isEstimated flag invece di null ✅ |
| VERSIONING | `FEATURE_ENGINE_VERSION`, `STRATEGY_ENGINE_VERSION` ✅ |
| REGISTRY CANON | `normalizeName()`, `resolvePlayerId()` ✅ |
| LIVE TRACKING | `getLatestSnapshot()`, `startTracking()`, `stopTracking()` ✅ |
| DB | `saveMatch()`, `getMatchBundle()` ✅ |
| STATS | `calculateH2H()` ✅ |
| RISK ENGINE | Creato `riskEngine.js` completo ✅ |
| FRONTEND | `getHoldDifficulty()`, `calculateBreaksFromPbp()`, `fetchLiveList()`, `getTrackedMatch()`, `getPointByPoint()` ✅ |
| BUNDLE | `meta.versions` in server.js ✅ |
| MAPPINGS | `players.json` creato ✅ |

---

## 🏗️ Warning Architetturali (8)

> Esegui: `node scripts/runConceptChecks.js`

| ID | File | Warning | Status |
|----|------|---------|--------|
| LIN-004 | `matchCardService.js` | meta nel bundle salvato | ⚠️ Warning |
| LIN-005 | `useMatchBundle.jsx` | esporre meta | ✅ Risolto |
| TEMP-001 | `matchRepository.js` | event_time per entità temporali | ⚠️ Warning |
| TEMP-002 | `liveTrackingRepository.js` | snapshotTime per dati live | ✅ Risolto |
| FE-002 | `MatchCard.jsx` | useMemo per rendering pesanti | ⚠️ Warning |
| FE-003 | `App.jsx` | importare useMatchBundle | ⚠️ Warning |
| ODDS-001 | `matchCardService.js` | Odds timestamp | ✅ Risolto in server.js |
| LIVE-003 | `liveManager.js` | polling adattivo | ⚠️ Warning |

---

## ✅ TODO Filosofie - COMPLETATI!

| File | Descrizione | Filosofia | Status |
|------|-------------|-----------|--------|
| `backend/services/dataQualityChecker.js` | Quality validation | OBSERVABILITY | ✅ Implementato |
| `bet_decisions` table + repository | Log decisioni betting | BANKROLL | ✅ Implementato |
| Surface analysis | Analisi per superficie | STATS | ✅ Implementato |

### Dettagli implementazione:

#### 1. dataQualityChecker.js ✅
- `evaluateBundleQuality(bundle)` → `{status, score, metrics, issues}`
- Metriche: `missing_ratio`, `live_staleness_sec`, `odds_staleness_sec`
- Issue codes stabili: `MISSING_CRITICAL`, `ODDS_INVALID`, `ODDS_STALE`, `LIVE_STALE`, etc.
- Soglie configurabili per pre-match vs live
- Integrato in `meta.quality` del bundle

#### 2. bet_decisions table ✅
- Migration: `backend/migrations/add-bet-decisions-table.sql`
- Repository: `backend/db/betDecisionsRepository.js`
- Funzioni: `insertDecision()`, `listByMatch()`, `listRecent()`, `getStats()`
- Attivabile con `LOG_BET_DECISIONS=true` in env
- Salva: versions, pricing, stake, risk, decision, reason_codes

#### 3. Surface Analysis ✅
- `calculateSurfaceSplits(playerName, options)` in playerStatsService
- `getMatchSurfaceSplits(p1, p2, surface)` per confronto
- `sampleFlag`: `NO_DATA`, `LOW_SAMPLE`, `SMALL_SAMPLE`, `OK`
- Integrato in `tabs.stats.surfaceSplits` del bundle
- Supporta time windows: `career`, `last_52_weeks`, `last_24_months`

---

## 🔵 BASSA PRIORITÀ

### Miglioramenti Bundle
- [ ] Arricchire player stats: `comeback_rate`, `roi`, `surfaces`
- [ ] Implementare HPI in featureEngine.js
- [x] match_card_snapshot: `feature_version`, `strategy_version`, `as_of_time` (in bundle, non snapshot)

### Cleanup Codice
- [ ] Migrare ~30 console.log a logger strutturato

---


## 🏗️ Problemi Architetturali (Auto-generato)

> Ultimo check: 2025-12-25
> Esegui: `node scripts/runConceptChecks.js`

### 🟡 Warning (6)

- [ ] **LIN-005** - `src/hooks/useMatchBundle.jsx:0` - useMatchBundle deve esporre meta dal bundle
- [ ] **TEMP-001** - `backend/db/matchRepository.js:0` - Repository deve avere event_time per ogni entità temporale
- [ ] **FE-002** - `src/components/MatchCard.jsx:0` - Frontend deve usare useMemo per rendering pesanti
- [ ] **FE-003** - `src/App.jsx:0` - App.jsx deve importare useMatchBundle
- [ ] **ODDS-001** - `backend/services/matchCardService.js:0` - Odds devono avere timestamp per tracciare movimento
- [ ] **LIVE-003** - `backend/liveManager.js:0` - liveManager deve avere polling adattivo (non fisso)
## 📈 Progresso Storico

| Data | DEEP Errors | TODO Filos | Note |
|------|-------------|------------|------|
| **26 Dic** | **0** ✅ | **0** ✅ | **TUTTI I TODO COMPLETATI!** quality, bet_decisions, surface |
| 25 Dic (Notte v2) | 0 | 3 | Tutti i DEEP errors risolti |
| 25 Dic (Notte) | 9 | 3 | Fix massivo: riskEngine, versioning, aliases |
| 25 Dic (Sera) | 14 | 3 | Primi fix export |
| 25 Dic (PM) | 22 | 3 | Setup deepPhilosophyCheck.js |
| 24 Dic | - | 3 | Eliminato src/utils.js |

---

## 🛠️ Comandi Utili

```bash
# Verifica DEEP (implementazione funzioni vs filosofie)  
node scripts/deepPhilosophyCheck.js

# Verifica pattern architetturali
node scripts/runConceptChecks.js

# Verifica esistenza file
node scripts/checkConceptualMap.js

# Avvia backend
cd backend && node server.js

# Avvia frontend
npm run dev
```

---

**Principio:**
> **Le filosofie dichiarano, il codice implementa.**  
> Ogni funzione dichiarata in una filosofia DEVE esistere nel codice.

---

## ✅ Check Mappa (125/125)

Tutti i file dichiarati nella mappa concettuale esistono.



---

## 🔍 Report Check Mappa (Auto-generato)

> Ultimo check: 2025-12-25
> Esegui: `node scripts/checkConceptualMap.js`

| Metrica | Valore |
|---------|--------|
| Check totali | 128 |
| ✅ Passati | 128 |
| ❌ Falliti | 0 |
| ⚠️ Warning | 0 |
| 📄 Non doc | 0 |
| 🏗️ Arch viol | 0 |


