# 📋 TODO LIST – Tennis Analyzer v3.0

> **Ultimo aggiornamento**: 25 Dicembre 2025  
> **Deep Philosophy Check**: 🔴 22 errori, 📋 4 TODO  
> **Concept Checks**: 12 errori, 10 warning  
> **Check Mappa**: 125 passati, 0 falliti

---

## 🔬 Problemi Deep Philosophy Check (Auto-generato)

> Ultimo check: 2025-12-25
> Esegui: `node scripts/deepPhilosophyCheck.js`

### 🔴 File/Funzioni Mancanti (22)

- [ ] **DEEP-001** - `backend/strategies/strategyEngine.js:evaluateStrategies` - Export richiesto NON TROVATO: backend/strategies/strategyEngine.js → evaluateStrategies() (FILOSOFIA_RISK_BANKROLL)
- [ ] **DEEP-002** - `backend/strategies/strategyEngine.js:STRATEGY_ENGINE_VERSION` - Export richiesto NON TROVATO: backend/strategies/strategyEngine.js → STRATEGY_ENGINE_VERSION() (FILOSOFIA_RISK_BANKROLL)
- [ ] **DEEP-003** - `backend/services/matchCardService.js:undefined` - matchCardService deve integrare risk output nel bundle (FILOSOFIA_RISK_BANKROLL)
- [ ] **DEEP-004** - `backend/utils/featureEngine.js:FEATURE_ENGINE_VERSION` - Export richiesto NON TROVATO: backend/utils/featureEngine.js → FEATURE_ENGINE_VERSION() (FILOSOFIA_TEMPORAL)
- [ ] **DEEP-005** - `backend/liveManager.js:undefined` - liveManager deve usare timestamp semantici (ingestion_time, event_time) (FILOSOFIA_TEMPORAL)
- [ ] **DEEP-006** - `backend/utils/featureEngine.js:undefined` - featureEngine deve supportare as_of_time per anti-leakage (FILOSOFIA_TEMPORAL)
- [ ] **DEEP-007** - `backend/services/matchCardService.js:undefined` - matchCardService deve includere meta.as_of_time nel bundle (FILOSOFIA_TEMPORAL)
- [ ] **DEEP-008** - `backend/services/dataNormalizer.js:normalizeName` - Export richiesto NON TROVATO: backend/services/dataNormalizer.js → normalizeName() (FILOSOFIA_REGISTRY_CANON)
- [ ] **DEEP-009** - `backend/services/dataNormalizer.js:resolvePlayerId` - Export richiesto NON TROVATO: backend/services/dataNormalizer.js → resolvePlayerId() (FILOSOFIA_REGISTRY_CANON)
- [ ] **DEEP-010** - `backend/utils/featureEngine.js:FEATURE_ENGINE_VERSION` - Export richiesto NON TROVATO: backend/utils/featureEngine.js → FEATURE_ENGINE_VERSION() (FILOSOFIA_LINEAGE_VERSIONING)
- [ ] **DEEP-011** - `backend/strategies/strategyEngine.js:STRATEGY_ENGINE_VERSION` - Export richiesto NON TROVATO: backend/strategies/strategyEngine.js → STRATEGY_ENGINE_VERSION() (FILOSOFIA_LINEAGE_VERSIONING)
- [ ] **DEEP-012** - `backend/services/matchCardService.js:undefined` - matchCardService deve includere meta.versions nel bundle (FILOSOFIA_LINEAGE_VERSIONING)
- [ ] **DEEP-013** - `src/hooks/useMatchBundle.jsx:undefined` - useMatchBundle deve esporre meta dal bundle (FILOSOFIA_LINEAGE_VERSIONING)
- [ ] **DEEP-014** - `backend/server.js:undefined` - Odds devono avere timestamp per tracciare movimento (FILOSOFIA_ODDS)
- [ ] **DEEP-015** - `backend/db/liveTrackingRepository.js:getLatestSnapshot` - Export richiesto NON TROVATO: backend/db/liveTrackingRepository.js → getLatestSnapshot() (FILOSOFIA_LIVE_TRACKING)
- [ ] **DEEP-016** - `backend/liveManager.js:startTracking` - Export richiesto NON TROVATO: backend/liveManager.js → startTracking() (FILOSOFIA_LIVE_TRACKING)
- [ ] **DEEP-017** - `backend/liveManager.js:stopTracking` - Export richiesto NON TROVATO: backend/liveManager.js → stopTracking() (FILOSOFIA_LIVE_TRACKING)
- [ ] **DEEP-018** - `backend/db/liveTrackingRepository.js:undefined` - liveTrackingRepository deve usare snapshotTime per i dati live (FILOSOFIA_LIVE_TRACKING)
- [ ] **DEEP-019** - `backend/services/playerStatsService.js:calculateH2H` - Export richiesto NON TROVATO: backend/services/playerStatsService.js → calculateH2H() (FILOSOFIA_STATS)
- [ ] **DEEP-020** - `backend/utils/featureEngine.js:undefined` - featureEngine: MAI restituire null, sempre fallback calcolato (FILOSOFIA_CALCOLI)
- [ ] **DEEP-021** - `backend/db/matchRepository.js:saveMatch` - Export richiesto NON TROVATO: backend/db/matchRepository.js → saveMatch() (FILOSOFIA_DB)
- [ ] **DEEP-022** - `backend/db/matchRepository.js:getMatchBundle` - Export richiesto NON TROVATO: backend/db/matchRepository.js → getMatchBundle() (FILOSOFIA_DB)

## 📊 STATO COMPLESSIVO

```
🔴 DEEP-CHECK:  22 errori (funzioni/export mancanti dichiarati in filosofie)
📋 TODO-FILOS:   4 elementi dichiarati "da fare" nelle filosofie
🟡 CONCEPT:     12 errori, 10 warning (pattern architetturali)
   └─ Include: 5 FE-DEEP, 4 RISK, 3 LIN errors
✅ MAPPA:      125 file verificati esistenti
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

## 🔬 DEEP PHILOSOPHY CHECK – Errori Critici (22)

> **Questi sono file/funzioni dichiarati nelle filosofie che DEVONO esistere ma NON esistono.**
> Report completo: `docs/checks/DEEP_PHILOSOPHY_CHECK.md`

### 🔴 VERSIONING & LINEAGE (Priorità ALTA)

| ID | File | Export Mancante | Fix |
|----|------|-----------------|-----|
| DEEP-001/011 | `backend/strategies/strategyEngine.js` | `STRATEGY_ENGINE_VERSION` | Aggiungere e esportare costante |
| DEEP-004/010 | `backend/utils/featureEngine.js` | `FEATURE_ENGINE_VERSION` | Aggiungere e esportare costante |

```javascript
// Fix: backend/utils/featureEngine.js
const FEATURE_ENGINE_VERSION = 'v1.0.0';
module.exports = { computeFeatures, FEATURE_ENGINE_VERSION };

// Fix: backend/strategies/strategyEngine.js  
const STRATEGY_ENGINE_VERSION = 'v1.0.0';
module.exports = { evaluateAll, STRATEGY_ENGINE_VERSION };
```

### 🔴 TEMPORAL SEMANTICS (Priorità ALTA)

| ID | File | Problema |
|----|------|----------|
| DEEP-005 | `backend/liveManager.js` | Manca pattern `ingestion_time`, `event_time` |
| DEEP-006 | `backend/utils/featureEngine.js` | Manca supporto `as_of_time` |
| DEEP-007 | `backend/services/matchCardService.js` | Bundle senza `meta.as_of_time` |

### 🔴 REGISTRY CANON

| ID | File | Export Mancante |
|----|------|-----------------|
| DEEP-008 | `backend/services/dataNormalizer.js` | `normalizeName()` |
| DEEP-009 | `backend/services/dataNormalizer.js` | `resolvePlayerId()` |

### 🔴 LIVE TRACKING

| ID | File | Mancante |
|----|------|----------|
| DEEP-015 | `backend/db/liveTrackingRepository.js` | `getLatestSnapshot()` |
| DEEP-016 | `backend/liveManager.js` | `startTracking()` |
| DEEP-017 | `backend/liveManager.js` | `stopTracking()` |
| DEEP-018 | `backend/db/liveTrackingRepository.js` | Pattern `snapshotTime` |

### 🔴 DB & BUNDLE

| ID | File | Export Mancante |
|----|------|-----------------|
| DEEP-021 | `backend/db/matchRepository.js` | `saveMatch()` |
| DEEP-022 | `backend/db/matchRepository.js` | `getMatchBundle()` |
| DEEP-003 | `backend/services/matchCardService.js` | Pattern `risk` |
| DEEP-012 | `backend/services/matchCardService.js` | Pattern `meta.versions` |

### 🔴 STATS, CALCOLI, ODDS

| ID | File | Problema |
|----|------|----------|
| DEEP-019 | `backend/services/playerStatsService.js` | `calculateH2H()` mancante |
| DEEP-020 | `backend/utils/featureEngine.js` | Anti-pattern: ritorna `null` |
| DEEP-013 | `src/hooks/useMatchBundle.jsx` | Non espone `meta` |
| DEEP-014 | `backend/server.js` | Odds senza `event_time` |

### 🔴 RISK & BANKROLL PHILOSOPHY – riskEngine da Implementare (Priorità ALTA)

> **Dichiarati in FILOSOFIA_RISK_BANKROLL.md**: componenti del Risk Engine che devono esistere.
> **AZIONE**: Creare `backend/services/riskEngine.js` con le funzioni specificate.

| ID | File Backend | Funzione da Creare | Filosofia Ref | Fix Richiesto |
|----|--------------|-------------------|---------------|---------------|
| RISK-001 | `backend/services/riskEngine.js` | FILE | sezione 1 | Creare il file (mustExist) |
| RISK-002 | `backend/services/riskEngine.js` | `calculateEdge()` | sezione 2.1 | edge = model_prob - implied_prob |
| RISK-003 | `backend/services/riskEngine.js` | `calculateStake()` | sezione 2.3 | Kelly frazionale (1/4 Kelly) |
| RISK-004 | `backend/services/riskEngine.js` | `controlExposure()` | sezione 2.4 | Max 20% bankroll totale |
| RISK-005 | `backend/services/riskEngine.js` | `calculatePriceMin()` | sezione 2.2 | price_min = 1/model_prob |

### 📝 Dettaglio Fix RISK:

```javascript
// backend/services/riskEngine.js (FILE DA CREARE)
const RISK_ENGINE_VERSION = 'v1.0.0';

function calculateEdge(modelProb, marketOdds) {
  const impliedProb = 1 / marketOdds;
  return modelProb - impliedProb;  // es: 0.60 - 0.54 = 0.06 (6% edge)
}

function calculatePriceMin(modelProb) {
  return 1 / modelProb;  // es: 1/0.60 = 1.67 minimo
}

function calculateStake(edge, price, bankroll, kellyFraction = 0.25) {
  if (edge <= 0) return 0;
  const f = edge / (price - 1);
  const stake = bankroll * f * kellyFraction;
  return Math.max(0, Math.min(stake, bankroll * 0.05));  // cap 5%
}

function controlExposure(bets, bankroll) {
  const totalExposure = bets.reduce((sum, b) => sum + b.stake, 0);
  const exposurePct = totalExposure / bankroll;
  
  if (exposurePct > 0.20) {  // max 20%
    const scaleFactor = 0.20 / exposurePct;
    bets.forEach(b => b.stake *= scaleFactor);
  }
  return bets;
}

module.exports = {
  RISK_ENGINE_VERSION,
  calculateEdge,
  calculatePriceMin,
  calculateStake,
  controlExposure
};
```

### 🔴 FRONTEND PHILOSOPHY – Backend Functions da Implementare (Priorità MEDIA)

> **Dichiarati in FILOSOFIA_FRONTEND.md**: funzioni che le filosofie specificano ma che NON esistono ancora nel codice.
> **AZIONE**: Implementare nel codice, NON modificare le filosofie.

| ID | File Backend | Funzione da Creare | Filosofia Ref | Fix Richiesto |
|----|--------------|-------------------|---------------|---------------|
| FE-DEEP-001 | `backend/utils/pressureCalculator.js` | `getHoldDifficulty()` | Strategie L623 | Creare funzione + esportare |
| FE-DEEP-002 | `backend/utils/breakDetector.js` | `calculateBreaksFromPbp()` | Overview L393 | Spostare da server.js L138 + esportare |
| FE-DEEP-003 | `backend/liveManager.js` | `fetchLiveList()` | HOME L105 | Creare alias o rinominare `fetchLiveMatchesList` |
| FE-DEEP-004 | `backend/liveManager.js` | `getTrackedMatch()` | Match Page L134 | Creare funzione (singolo match, non array) |
| FE-DEEP-005 | `backend/scraper/sofascoreScraper.js` | `getPointByPoint()` | PbP L718 | Creare ed esportare funzione |

### 📝 Dettaglio Fix Richiesti:

```javascript
// FE-DEEP-001: backend/utils/pressureCalculator.js
function getHoldDifficulty(stats, context) {
  // Calcola difficoltà di hold basata su pressure index
  const pressure = calculatePressureIndex(stats, context);
  if (pressure > 70) return 'HIGH';
  if (pressure > 40) return 'MED';
  return 'LOW';
}
module.exports = { ..., getHoldDifficulty };

// FE-DEEP-002: backend/utils/breakDetector.js
// SPOSTARE da server.js L138-185 questa funzione:
function calculateBreaksFromPbp(pointByPoint) { /* ... */ }
module.exports = { ..., calculateBreaksFromPbp };

// FE-DEEP-003: backend/liveManager.js
// Aggiungere alias:
const fetchLiveList = fetchLiveMatchesList; // alias per filosofia
module.exports = { ..., fetchLiveList };

// FE-DEEP-004: backend/liveManager.js
function getTrackedMatch(matchId) {
  const tracked = getTrackedMatches();
  return tracked.find(m => m.id === matchId) || null;
}
module.exports = { ..., getTrackedMatch };

// FE-DEEP-005: backend/scraper/sofascoreScraper.js
async function getPointByPoint(eventId) {
  return await directFetch(eventId, 'incidents');
}
module.exports = { ..., getPointByPoint };
```

---

## 📋 TODO Dichiarati nelle Filosofie (4)

> Elementi marcati "TODO" nelle filosofie stesse - implementazioni future pianificate.

| File | Descrizione | Filosofia |
|------|-------------|-----------|
| `backend/services/riskEngine.js` | Risk layer: edge → stake | BANKROLL |
| `data/mappings/players.json` | Alias mapping players | REGISTRY |
| `backend/services/dataQualityChecker.js` | Quality validation | OBSERVABILITY |
| `bet_decisions` table | Log decisioni betting | BANKROLL |

---

## 🏗️ Problemi Architetturali (runConceptChecks.js)

### 🔴 Errori (5)

- [ ] **LIN-001** - `featureEngine.js` - deve esportare FEATURE_ENGINE_VERSION
- [ ] **LIN-002** - `strategyEngine.js` - deve esportare STRATEGY_ENGINE_VERSION
- [ ] **LIN-003** - `server.js` - Bundle deve avere meta.versions
- [ ] **REG-001** - `data/mappings/players.json` - deve esistere
- [ ] **DB-002** - `matchRepository.js` - deve esportare getMatchBundle

### 🟡 Warning (7)

- [ ] **LIN-004** - `matchCardService.js` - meta nel bundle
- [ ] **LIN-005** - `useMatchBundle.jsx` - esporre meta
- [ ] **TEMP-001** - `matchRepository.js` - event_time
- [ ] **TEMP-002** - `liveTrackingRepository.js` - snapshotTime
- [ ] **FE-002** - `MatchCard.jsx` - useMemo
- [ ] **FE-003** - `App.jsx` - useMatchBundle
- [ ] **ODDS-001** - `matchCardService.js` - Odds timestamp

---

## 📊 STATO ATTUALE

---

## 🔵 BASSA PRIORITÀ

### Miglioramenti Bundle
- [ ] Arricchire player stats: `comeback_rate`, `roi`, `surfaces`
- [ ] Implementare HPI in featureEngine.js
- [ ] match_card_snapshot: aggiungere `feature_version`, `strategy_version`, `as_of_time`

### Cleanup Codice
- [ ] Migrare ~30 console.log a logger strutturato

---


## 🏗️ Problemi Architetturali (Auto-generato)

> Ultimo check: 2025-12-25
> Esegui: `node scripts/runConceptChecks.js`

### 🔴 Errori (12)

- [ ] **LIN-001** - `backend/utils/featureEngine.js:0` - featureEngine.js deve esportare FEATURE_ENGINE_VERSION
- [ ] **LIN-002** - `backend/strategies/strategyEngine.js:0` - strategyEngine.js deve esportare STRATEGY_ENGINE_VERSION
- [ ] **LIN-003** - `backend/server.js:0` - Bundle endpoint deve avere meta.versions con bundle_schema, features, strategies
- [ ] **REG-001** - `data/mappings/players.json:0` - Registry Canon: mappings/players.json deve esistere per normalizzazione nomi
- [ ] **DB-002** - `backend/db/matchRepository.js:0` - matchRepository deve esportare getMatchBundle
- [ ] **RISK-002** - `backend/services/riskEngine.js:0` - File non trovato: backend/services/riskEngine.js
- [ ] **RISK-003** - `backend/services/riskEngine.js:0` - File non trovato: backend/services/riskEngine.js
- [ ] **RISK-004** - `backend/services/riskEngine.js:0` - File non trovato: backend/services/riskEngine.js
- [ ] **FE-DEEP-001** - `backend/utils/pressureCalculator.js:0` - pressureCalculator deve esportare getHoldDifficulty()
- [ ] **FE-DEEP-002** - `backend/utils/breakDetector.js:0` - breakDetector deve esportare calculateBreaksFromPbp()
- [ ] **FE-DEEP-003** - `backend/liveManager.js:0` - liveManager deve esportare fetchLiveList()
- [ ] **FE-DEEP-005** - `backend/scraper/sofascoreScraper.js:0` - sofascoreScraper deve esportare getPointByPoint()

### 🟡 Warning (10)

- [ ] **LIN-004** - `backend/services/matchCardService.js:0` - matchCardService deve includere meta nel bundle salvato
- [ ] **LIN-005** - `src/hooks/useMatchBundle.jsx:0` - useMatchBundle deve esporre meta dal bundle
- [ ] **TEMP-001** - `backend/db/matchRepository.js:0` - Repository deve avere event_time per ogni entità temporale
- [ ] **TEMP-002** - `backend/db/liveTrackingRepository.js:0` - Live tracking deve usare snapshotTime per i dati live
- [ ] **FE-002** - `src/components/MatchCard.jsx:0` - Frontend deve usare useMemo per rendering pesanti
- [ ] **FE-003** - `src/App.jsx:0` - App.jsx deve importare useMatchBundle
- [ ] **ODDS-001** - `backend/services/matchCardService.js:0` - Odds devono avere timestamp per tracciare movimento
- [ ] **LIVE-003** - `backend/liveManager.js:0` - liveManager deve avere polling adattivo (non fisso)
- [ ] **RISK-001** - `backend/services/riskEngine.js:0` - riskEngine deve esistere per decisioni betting
- [ ] **RISK-005** - `backend/services/riskEngine.js:0` - File non trovato: backend/services/riskEngine.js
## ✅ Check Mappa (125/125)

Tutti i file dichiarati nella mappa concettuale esistono.

---

## 📈 Progresso Storico

| Data | DEEP Errors | Concept Errors | Note |
|------|-------------|----------------|------|
| 25 Dic (Sera) | **27** | 5 | Aggiunto 5 errori FE-DEEP da FILOSOFIA_FRONTEND |
| 25 Dic (PM) | **22** | 5 | Aggiunto `deepPhilosophyCheck.js` |
| 25 Dic (AM) | - | 3 | Fix principali |
| 24 Dic | - | 20 | Eliminato `src/utils.js` |

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

## 🔍 Report Check Mappa (Auto-generato)

> Ultimo check: 2025-12-25
> Esegui: `node scripts/checkConceptualMap.js`

| Metrica | Valore |
|---------|--------|
| Check totali | 125 |
| ✅ Passati | 125 |
| ❌ Falliti | 0 |
| ⚠️ Warning | 0 |
| 📄 Non doc | 0 |
| 🏗️ Arch viol | 0 |


