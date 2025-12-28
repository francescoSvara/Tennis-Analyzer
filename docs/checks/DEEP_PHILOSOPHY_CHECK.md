# 🔬 DEEP PHILOSOPHY CHECK REPORT

> **Generato**: 2025-12-28T00:47:13.471Z  
> **Script**: `node scripts/deepPhilosophyCheck.js`

---

## 📊 SOMMARIO

| Metrica | Valore |
|---------|--------|
| Check totali | 83 |
| ✅ Passati | 76 |
| ❌ Falliti | 1 |
| 📋 TODO dichiarati | 4 |

---

## 🔴 ERRORI CRITICI (1)

Questi sono file/funzioni dichiarate nelle filosofie che **DOVREBBERO ESISTERE** ma NON esistono.

| # | Filosofia | Tipo | Dettaglio | Descrizione |
|---|-----------|------|-----------|-------------|
| 1 | DB | PATTERN_MISSING | `backend/server.js`  | server.js deve avere fallback legacy per match XLSX |

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
| 1 | BANKROLL | EXPORT_MISSING_TODO | `backend/services/riskEngine.js` | Export dichiarato come TODO: backend/services/riskEngine.js → kellyFractional |
| 2 | OBSERVABILITY | EXPORT_MISSING_TODO | `backend/services/dataQualityChecker.js` | Export dichiarato come TODO: backend/services/dataQualityChecker.js → calculateCompleteness |
| 3 | OBSERVABILITY | EXPORT_MISSING_TODO | `backend/services/dataQualityChecker.js` | Export dichiarato come TODO: backend/services/dataQualityChecker.js → detectOutliers |
| 4 | OBSERVABILITY | EXPORT_MISSING_TODO | `backend/services/dataQualityChecker.js` | Export dichiarato come TODO: backend/services/dataQualityChecker.js → checkConsistency |

---

## 📖 DETTAGLIO PER FILOSOFIA

### 📋 FILOSOFIA_RISK_BANKROLL

- **File**: `docs/filosofie/50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md`
- **Check**: 9/10 passati
- **Errori**: 0 | **Warning**: 0 | **TODO**: 1

**TODO:**
- 📋 Export dichiarato come TODO: backend/services/riskEngine.js → kellyFractional

### ✅ FILOSOFIA_TEMPORAL

- **File**: `docs/filosofie/10_data_platform/temporal/FILOSOFIA_TEMPORAL.md`
- **Check**: 8/8 passati
- **Errori**: 0 | **Warning**: 0 | **TODO**: 0

### ✅ FILOSOFIA_REGISTRY_CANON

- **File**: `docs/filosofie/10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md`
- **Check**: 7/7 passati
- **Errori**: 0 | **Warning**: 0 | **TODO**: 0

### ✅ FILOSOFIA_LINEAGE_VERSIONING

- **File**: `docs/filosofie/10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md`
- **Check**: 7/7 passati
- **Errori**: 0 | **Warning**: 0 | **TODO**: 0

### 📋 FILOSOFIA_OBSERVABILITY_DATAQUALITY

- **File**: `docs/filosofie/10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md`
- **Check**: 6/9 passati
- **Errori**: 0 | **Warning**: 0 | **TODO**: 3

**TODO:**
- 📋 Export dichiarato come TODO: backend/services/dataQualityChecker.js → calculateCompleteness
- 📋 Export dichiarato come TODO: backend/services/dataQualityChecker.js → detectOutliers
- 📋 Export dichiarato come TODO: backend/services/dataQualityChecker.js → checkConsistency

### 🟡 FILOSOFIA_ODDS

- **File**: `docs/filosofie/30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md`
- **Check**: 3/4 passati
- **Errori**: 0 | **Warning**: 1 | **TODO**: 0

**Warning:**
- ⚠️ Tabella non trovata in migrations: match_odds_new (potrebbe esistere in Supabase)

### 🟡 FILOSOFIA_LIVE_TRACKING

- **File**: `docs/filosofie/20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md`
- **Check**: 9/10 passati
- **Errori**: 0 | **Warning**: 1 | **TODO**: 0

**Warning:**
- ⚠️ Tabella non trovata in migrations: live_tracking_snapshots (potrebbe esistere in Supabase)

### ✅ FILOSOFIA_STATS

- **File**: `docs/filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md`
- **Check**: 9/9 passati
- **Errori**: 0 | **Warning**: 0 | **TODO**: 0

### ✅ FILOSOFIA_CALCOLI

- **File**: `docs/filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md`
- **Check**: 1/1 passati
- **Errori**: 0 | **Warning**: 0 | **TODO**: 0

### 🔴 FILOSOFIA_DB

- **File**: `docs/filosofie/10_data_platform/storage/FILOSOFIA_DB.md`
- **Check**: 11/12 passati
- **Errori**: 1 | **Warning**: 0 | **TODO**: 0

**Errori:**
- ❌ Pattern richiesto NON TROVATO in backend/server.js: server.js deve avere fallback legacy per match XLSX

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
