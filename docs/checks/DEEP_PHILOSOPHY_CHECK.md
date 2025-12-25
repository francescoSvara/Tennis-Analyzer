# 🔬 DEEP PHILOSOPHY CHECK REPORT

> **Generato**: 2025-12-25T09:32:28.628Z  
> **Script**: `node scripts/deepPhilosophyCheck.js`

---

## 📊 SOMMARIO

| Metrica | Valore |
|---------|--------|
| Check totali | 75 |
| ✅ Passati | 47 |
| ❌ Falliti | 22 |
| 📋 TODO dichiarati | 4 |

---

## 🔴 ERRORI CRITICI (22)

Questi sono file/funzioni dichiarate nelle filosofie che **DOVREBBERO ESISTERE** ma NON esistono.

| # | Filosofia | Tipo | Dettaglio | Descrizione |
|---|-----------|------|-----------|-------------|
| 1 | BANKROLL | EXPORT_MISSING | `backend/strategies/strategyEngine.js` → evaluateStrategies() | Export richiesto NON TROVATO: backend/strategies/strategyEngine.js → evaluateStrategies() |
| 2 | BANKROLL | EXPORT_MISSING | `backend/strategies/strategyEngine.js` → STRATEGY_ENGINE_VERSION() | Export richiesto NON TROVATO: backend/strategies/strategyEngine.js → STRATEGY_ENGINE_VERSION() |
| 3 | BANKROLL | PATTERN_MISSING | `backend/services/matchCardService.js`  | matchCardService deve integrare risk output nel bundle |
| 4 | TEMPORAL | EXPORT_MISSING | `backend/utils/featureEngine.js` → FEATURE_ENGINE_VERSION() | Export richiesto NON TROVATO: backend/utils/featureEngine.js → FEATURE_ENGINE_VERSION() |
| 5 | TEMPORAL | PATTERN_MISSING | `backend/liveManager.js`  | liveManager deve usare timestamp semantici (ingestion_time, event_time) |
| 6 | TEMPORAL | PATTERN_MISSING | `backend/utils/featureEngine.js`  | featureEngine deve supportare as_of_time per anti-leakage |
| 7 | TEMPORAL | PATTERN_MISSING | `backend/services/matchCardService.js`  | matchCardService deve includere meta.as_of_time nel bundle |
| 8 | REGISTRY | EXPORT_MISSING | `backend/services/dataNormalizer.js` → normalizeName() | Export richiesto NON TROVATO: backend/services/dataNormalizer.js → normalizeName() |
| 9 | REGISTRY | EXPORT_MISSING | `backend/services/dataNormalizer.js` → resolvePlayerId() | Export richiesto NON TROVATO: backend/services/dataNormalizer.js → resolvePlayerId() |
| 10 | LINEAGE | EXPORT_MISSING | `backend/utils/featureEngine.js` → FEATURE_ENGINE_VERSION() | Export richiesto NON TROVATO: backend/utils/featureEngine.js → FEATURE_ENGINE_VERSION() |
| 11 | LINEAGE | EXPORT_MISSING | `backend/strategies/strategyEngine.js` → STRATEGY_ENGINE_VERSION() | Export richiesto NON TROVATO: backend/strategies/strategyEngine.js → STRATEGY_ENGINE_VERSION() |
| 12 | LINEAGE | PATTERN_MISSING | `backend/services/matchCardService.js`  | matchCardService deve includere meta.versions nel bundle |
| 13 | LINEAGE | PATTERN_MISSING | `src/hooks/useMatchBundle.jsx`  | useMatchBundle deve esporre meta dal bundle |
| 14 | ODDS | PATTERN_MISSING | `backend/server.js`  | Odds devono avere timestamp per tracciare movimento |
| 15 | LIVE | EXPORT_MISSING | `backend/db/liveTrackingRepository.js` → getLatestSnapshot() | Export richiesto NON TROVATO: backend/db/liveTrackingRepository.js → getLatestSnapshot() |
| 16 | LIVE | EXPORT_MISSING | `backend/liveManager.js` → startTracking() | Export richiesto NON TROVATO: backend/liveManager.js → startTracking() |
| 17 | LIVE | EXPORT_MISSING | `backend/liveManager.js` → stopTracking() | Export richiesto NON TROVATO: backend/liveManager.js → stopTracking() |
| 18 | LIVE | PATTERN_MISSING | `backend/db/liveTrackingRepository.js`  | liveTrackingRepository deve usare snapshotTime per i dati live |
| 19 | STATS | EXPORT_MISSING | `backend/services/playerStatsService.js` → calculateH2H() | Export richiesto NON TROVATO: backend/services/playerStatsService.js → calculateH2H() |
| 20 | CALCOLI | ANTIPATTERN_FOUND | `backend/utils/featureEngine.js`  | featureEngine: MAI restituire null, sempre fallback calcolato |
| 21 | DB | EXPORT_MISSING | `backend/db/matchRepository.js` → saveMatch() | Export richiesto NON TROVATO: backend/db/matchRepository.js → saveMatch() |
| 22 | DB | EXPORT_MISSING | `backend/db/matchRepository.js` → getMatchBundle() | Export richiesto NON TROVATO: backend/db/matchRepository.js → getMatchBundle() |

---

## 🟡 WARNING (2)

| # | Filosofia | Tipo | Dettaglio | Messaggio |
|---|-----------|------|-----------|-----------|
| 1 | ODDS | TABLE_NOT_IN_MIGRATION | `match_odds_new` | Tabella non trovata in migrations: match_odds_new (potrebbe esistere in Supabase) |
| 2 | LIVE | TABLE_NOT_IN_MIGRATION | `live_tracking_snapshots` | Tabella non trovata in migrations: live_tracking_snapshots (potrebbe esistere in Supabase) |

---

## 📋 TODO DICHIARATI NELLE FILOSOFIE (4)

Questi elementi sono dichiarati come "TODO" nelle filosofie stesse (non ancora implementati by design).

| # | Filosofia | Tipo | Dettaglio | Descrizione |
|---|-----------|------|-----------|-------------|
| 1 | BANKROLL | FILE_MISSING_TODO | `backend/services/riskEngine.js` | Risk layer: edge → stake suggestion |
| 2 | BANKROLL | TABLE_MISSING_TODO | `bet_decisions` | Log delle decisioni di betting |
| 3 | REGISTRY | FILE_MISSING_TODO | `data/mappings/players.json` | Registry alias mapping per player names |
| 4 | OBSERVABILITY | FILE_MISSING_TODO | `backend/services/dataQualityChecker.js` | Data quality validation: missingness, outliers, staleness |

---

## 📖 DETTAGLIO PER FILOSOFIA

### 🔴 FILOSOFIA_RISK_BANKROLL

- **File**: `docs/filosofie/50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md`
- **Check**: 1/6 passati
- **Errori**: 3 | **Warning**: 0 | **TODO**: 2

**Errori:**
- ❌ Export richiesto NON TROVATO: backend/strategies/strategyEngine.js → evaluateStrategies()
- ❌ Export richiesto NON TROVATO: backend/strategies/strategyEngine.js → STRATEGY_ENGINE_VERSION()
- ❌ Pattern richiesto NON TROVATO in backend/services/matchCardService.js: matchCardService deve integrare risk output nel bundle

**TODO:**
- 📋 File dichiarato come TODO: backend/services/riskEngine.js
- 📋 Tabella dichiarata come TODO: bet_decisions

### 🔴 FILOSOFIA_TEMPORAL

- **File**: `docs/filosofie/10_data_platform/temporal/FILOSOFIA_TEMPORAL.md`
- **Check**: 4/8 passati
- **Errori**: 4 | **Warning**: 0 | **TODO**: 0

**Errori:**
- ❌ Export richiesto NON TROVATO: backend/utils/featureEngine.js → FEATURE_ENGINE_VERSION()
- ❌ Pattern richiesto NON TROVATO in backend/liveManager.js: liveManager deve usare timestamp semantici (ingestion_time, event_time)
- ❌ Pattern richiesto NON TROVATO in backend/utils/featureEngine.js: featureEngine deve supportare as_of_time per anti-leakage
- ❌ Pattern richiesto NON TROVATO in backend/services/matchCardService.js: matchCardService deve includere meta.as_of_time nel bundle

### 🔴 FILOSOFIA_REGISTRY_CANON

- **File**: `docs/filosofie/10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md`
- **Check**: 4/7 passati
- **Errori**: 2 | **Warning**: 0 | **TODO**: 1

**Errori:**
- ❌ Export richiesto NON TROVATO: backend/services/dataNormalizer.js → normalizeName()
- ❌ Export richiesto NON TROVATO: backend/services/dataNormalizer.js → resolvePlayerId()

**TODO:**
- 📋 File dichiarato come TODO: data/mappings/players.json

### 🔴 FILOSOFIA_LINEAGE_VERSIONING

- **File**: `docs/filosofie/10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md`
- **Check**: 3/7 passati
- **Errori**: 4 | **Warning**: 0 | **TODO**: 0

**Errori:**
- ❌ Export richiesto NON TROVATO: backend/utils/featureEngine.js → FEATURE_ENGINE_VERSION()
- ❌ Export richiesto NON TROVATO: backend/strategies/strategyEngine.js → STRATEGY_ENGINE_VERSION()
- ❌ Pattern richiesto NON TROVATO in backend/services/matchCardService.js: matchCardService deve includere meta.versions nel bundle
- ❌ Pattern richiesto NON TROVATO in src/hooks/useMatchBundle.jsx: useMatchBundle deve esporre meta dal bundle

### 📋 FILOSOFIA_OBSERVABILITY_DATAQUALITY

- **File**: `docs/filosofie/10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md`
- **Check**: 4/5 passati
- **Errori**: 0 | **Warning**: 0 | **TODO**: 1

**TODO:**
- 📋 File dichiarato come TODO: backend/services/dataQualityChecker.js

### 🔴 FILOSOFIA_ODDS

- **File**: `docs/filosofie/30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md`
- **Check**: 2/4 passati
- **Errori**: 1 | **Warning**: 1 | **TODO**: 0

**Errori:**
- ❌ Pattern richiesto NON TROVATO in backend/server.js: Odds devono avere timestamp per tracciare movimento

**Warning:**
- ⚠️ Tabella non trovata in migrations: match_odds_new (potrebbe esistere in Supabase)

### 🔴 FILOSOFIA_LIVE_TRACKING

- **File**: `docs/filosofie/20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md`
- **Check**: 5/10 passati
- **Errori**: 4 | **Warning**: 1 | **TODO**: 0

**Errori:**
- ❌ Export richiesto NON TROVATO: backend/db/liveTrackingRepository.js → getLatestSnapshot()
- ❌ Export richiesto NON TROVATO: backend/liveManager.js → startTracking()
- ❌ Export richiesto NON TROVATO: backend/liveManager.js → stopTracking()
- ❌ Pattern richiesto NON TROVATO in backend/db/liveTrackingRepository.js: liveTrackingRepository deve usare snapshotTime per i dati live

**Warning:**
- ⚠️ Tabella non trovata in migrations: live_tracking_snapshots (potrebbe esistere in Supabase)

### 🔴 FILOSOFIA_STATS

- **File**: `docs/filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md`
- **Check**: 8/9 passati
- **Errori**: 1 | **Warning**: 0 | **TODO**: 0

**Errori:**
- ❌ Export richiesto NON TROVATO: backend/services/playerStatsService.js → calculateH2H()

### 🔴 FILOSOFIA_CALCOLI

- **File**: `docs/filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md`
- **Check**: 0/1 passati
- **Errori**: 1 | **Warning**: 0 | **TODO**: 0

**Errori:**
- ❌ Anti-pattern trovato in backend/utils/featureEngine.js: featureEngine: MAI restituire null, sempre fallback calcolato

### 🔴 FILOSOFIA_DB

- **File**: `docs/filosofie/10_data_platform/storage/FILOSOFIA_DB.md`
- **Check**: 10/12 passati
- **Errori**: 2 | **Warning**: 0 | **TODO**: 0

**Errori:**
- ❌ Export richiesto NON TROVATO: backend/db/matchRepository.js → saveMatch()
- ❌ Export richiesto NON TROVATO: backend/db/matchRepository.js → getMatchBundle()

### ✅ FILOSOFIA_FRONTEND

- **File**: `docs/filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md`
- **Check**: 4/4 passati
- **Errori**: 0 | **Warning**: 0 | **TODO**: 0

### ✅ FILOSOFIA_FRONTEND_DATA_CONSUMPTION

- **File**: `docs/filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md`
- **Check**: 2/2 passati
- **Errori**: 0 | **Warning**: 0 | **TODO**: 0


---

## 🛠️ COME RISOLVERE

### Per ogni ERRORE FILE_MISSING:
1. Crea il file nel path indicato
2. Implementa le funzioni richieste dalla filosofia
3. Esporta le funzioni

### Per ogni ERRORE EXPORT_MISSING:
1. Apri il file indicato
2. Implementa la funzione mancante
3. Esportala con `module.exports` o `export`

### Per ogni ERRORE PATTERN_MISSING:
1. Apri il file indicato
2. Implementa la logica richiesta (vedi descrizione)

### Per i TODO:
Questi sono elementi dichiarati "in roadmap" nelle filosofie. Non sono errori immediati.

---

**Fine report**
