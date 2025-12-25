# 🧪 FILOSOFIA CONCEPT CHECKS  
## Versione V2.2 – Semantic & Architectural Guardrails

> **Dominio**: Architettura · Qualità · Governance del Codice  
> **Stato**: ATTIVA  
> **Versione**: V2.2 (25 Dicembre 2025)  
> **Ultimo aggiornamento**: 25 Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | 🔍 Valida | 🛡️ Protegge |
|---------|---------|------------|
| [FILOSOFIA_MADRE](FILOSOFIA_MADRE_TENNIS.md) | TUTTI i documenti | MatchBundle, Feature Engine, Strategy Engine |

### � Documenti Correlati (che valida)
| Documento | Check Type |
|-----------|------------|
| [DB](../10_data_platform/storage/FILOSOFIA_DB.md) | Schema compliance |
| [TEMPORAL](../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) | Anti-leakage rules |
| [REGISTRY_CANON](../10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md) | Entity resolution |
| [LINEAGE_VERSIONING](../10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) | Versioning audit |
| [OBSERVABILITY](../10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Data quality metrics |
| [STATS](../40_analytics_features_models/stats/FILOSOFIA_STATS.md) | Feature → Signal flow |
| [CALCOLI](../40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md) | Feature determinism |
| [RISK_BANKROLL](../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) | Bet decision audit |

### �📁 File Codice Principali
| File | Descrizione |
|------|-------------|
| [`scripts/runConceptChecks.js`](../../scripts/runConceptChecks.js) | Runner checks architetturali |
| [`scripts/checkConceptualMap.js`](../../scripts/checkConceptualMap.js) | Verifica file esistenti |
| [`docs/concept/rules.v1.json`](../concept/rules.v1.json) | Regole V1 (legacy) |
| [`docs/concept/rules.v2.json`](../concept/rules.v2.json) | Regole V2 (semantic) |

---

## 0️⃣ SCOPO DEL DOCUMENTO (AGGIORNATO)

I **Concept Checks** sono il sistema immunitario del progetto.

Servono a:
- prevenire regressioni architetturali
- garantire coerenza tra documentazione e codice
- rendere l’uso di AI / Copilot sicuro
- proteggere MatchBundle, Feature Engine e Strategy Engine

❌ NON validano formule  
❌ NON sostituiscono i test  
❌ NON giudicano performance  

👉 Verificano **responsabilità e ruolo del codice**.

---

## 1️⃣ PRINCIPIO FONDANTE

> **Ogni pezzo di codice deve sapere:**
> - *chi è*
> - *cosa può fare*
> - *cosa non deve fare*

Se questo non è verificabile automaticamente → l’architettura è fragile.

---

## 2️⃣ CAMBIO DI PARADIGMA (V1 → V2)

### V1
- controlli su path
- controlli su import
- pattern statici

### V2
- controlli **semantici**
- controlli **sull’output**
- controlli **sulla responsabilità**
- guardrail sulle **decisioni**

👉 La V1 controlla *dove sta il codice*.  
👉 La V2 controlla *cosa sta facendo*.

---

## 3️⃣ INVARIANTI ARCHITETTURALI (NON NEGOZIABILI)

### 3.1 MatchBundle Invariant

```text
La Match Page frontend può consumare SOLO MatchBundle.
```

Violazioni:
- fetch FE verso `/stats`, `/momentum`, `/odds`, `/pbp` → ❌ ERROR
- composizione manuale di dati in FE → ❌ ERROR

---

### 3.2 Backend Interpretation Invariant

```text
Solo il backend interpreta i dati.
```

Violazioni:
- calcoli pressure/momentum/edge in FE → ❌ ERROR
- FE che combina due feature → ❌ ERROR

---

### 3.3 Feature vs Strategy Invariant

| Livello | Può fare |
|------|---------|
| Feature Engine | calcolare numeri |
| Strategy Engine | decidere READY/WATCH/OFF |
| Frontend | visualizzare segnali |

Violazioni:
- funzione che ritorna READY fuori dallo Strategy Engine → ❌ ERROR
- feature che decide un’azione → ❌ ERROR

---

### 3.4 Signal Invariant

```text
I segnali NON sono metriche.
```

Violazioni:
- persistenza DB di READY/WATCH/OFF → ❌ ERROR
- uso dei segnali come input statistico → ❌ ERROR

---

### 3.5 Data Quality Invariant

```text
La Data Quality è calcolata solo nel backend.
```

Violazioni:
- FE con `calculateDataCompleteness` → ❌ ERROR
- fallback logici FE basati su completeness → ❌ ERROR

---

## 4️⃣ CLASSI DI CHECK (V2)

### 4.1 Structural Checks (ereditati V1)
- path-based
- import-based
- forbidden modules

➡️ Rimangono invariati.

---

### 4.2 Semantic Checks (nuovi)

Verificano:
- tipo di output
- responsabilità implicita
- contesto di esecuzione

Esempio:
```pseudo
IF function returns { status, confidence, action }
AND NOT in Strategy Engine:
  ERROR STRATEGY_OUTSIDE_ENGINE
```

---

### 4.3 Output-Based Checks

Analizzano:
- forma del return object
- naming semantico
- persistenza indebita

Esempio:
```pseudo
IF object persisted AND contains status READY/WATCH:
  ERROR PERSISTING_SIGNAL
```

---

## 5️⃣ RULES REGISTRY (VERSIONATO)

### File consigliati
```
docs/concept/rules.v1.json   (legacy)
docs/concept/rules.v2.json   (semantic)
```

### Struttura V2 (estensione)

```json
{
  "version": 2,
  "invariants": [
    {
      "id": "MATCHBUNDLE_ONLY_FE",
      "severity": "ERROR",
      "description": "Frontend must consume MatchBundle only"
    }
  ],
  "semanticRules": [
    {
      "id": "STRATEGY_OUTSIDE_ENGINE",
      "match": "return.status",
      "allowedDomains": ["strategy_engine"]
    }
  ]
}
```

---

## 6️⃣ SEVERITÀ E CI

| Livello | Effetto |
|------|--------|
| ERROR | blocca CI |
| WARN | report + TODO |
| INFO | solo documentazione |

Policy:

```pseudo
IF errors > 0:
  FAIL
ELSE:
  PASS
```

---

## 7️⃣ MODALITÀ DI SCANSIONE

- **Full Scan**: main / release
- **Diff Scan**: PR / feature branch

La V2 usa **gli stessi runner** della V1.

---

## 8️⃣ ECCEZIONI (ALLOWLIST)

Eccezioni:
- devono essere rare
- motivate
- annotate

### Annotazione codice

```ts
// philosophy:allow STRATEGY_OUTSIDE_ENGINE reason="temporary experiment"
```

Check:
```pseudo
IF rule in allowlist:
  downgrade severity
```

---

## 9️⃣ REPORTING

Output obbligatori:
- `docs/checks/report.md`
- `docs/checks/report.json`

Ogni finding deve includere:
- rule id
- file
- linea
- spiegazione umana
- remediation

---

## 🔟 COSA QUESTO DOCUMENTO NON È

- non è una guida di implementazione
- non è una lista di regole ESLint
- non è una spec CI/CD

È una **costituzione architetturale**.

---

## 1️⃣1️⃣ REGOLA FINALE

Se un check:
- produce troppi falsi positivi
- è difficile da spiegare
- non è legato a una filosofia

➡️ **va rimosso o semplificato**.

La disciplina architetturale viene prima del tooling.

---

## 1️⃣2️⃣ NUOVE REGOLE (V2.1 – Dicembre 2025)

> **Fonte**: [FILOSOFIA_TEMPORAL](../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md), [FILOSOFIA_REGISTRY_CANON](../10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md), [FILOSOFIA_LINEAGE_VERSIONING](../10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md), [FILOSOFIA_OBSERVABILITY_DATAQUALITY](../10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md)

### 12.1 TEMPORAL_ASOF

**Regola**:
```text
feature_snapshot.as_of_time <= match.event_time (pre-match)
feature_snapshot.as_of_time <= now() (live)
```

**Rationale**: anti-leakage temporale.

**Test**:
```javascript
function checkTemporalAsOf(bundle) {
  const { meta, header } = bundle;
  
  if (!meta.as_of_time) {
    return { error: 'missing meta.as_of_time' };
  }
  
  if (header.status === 'scheduled') {
    if (meta.as_of_time > header.event_time) {
      return { error: 'as_of_time after match start (pre-match)' };
    }
  } else if (header.status === 'live') {
    if (meta.as_of_time > Date.now()) {
      return { error: 'as_of_time in future (live)' };
    }
  }
  
  return { ok: true };
}
```

**Violazioni**:
- Bundle con `as_of_time` futuro rispetto a match start
- Features calcolate con dati post-match

---

### 12.2 NO_FUTURE_DATA

**Regola**:
```text
Nessuna query/trasformazione usa righe con event_time > as_of_time.
```

**Rationale**: leakage = edge finto.

**Test**:
```javascript
function checkNoFutureData(bundle, rawData) {
  const { meta } = bundle;
  
  const futureOdds = rawData.odds?.filter(o => o.event_time > meta.as_of_time);
  const futureSnaps = rawData.liveSnaps?.filter(s => s.event_time > meta.as_of_time);
  
  if (futureOdds?.length > 0) {
    return { error: `future odds detected: ${futureOdds.length} ticks` };
  }
  
  if (futureSnaps?.length > 0) {
    return { error: `future snapshots detected: ${futureSnaps.length} snaps` };
  }
  
  return { ok: true };
}
```

**Violazioni**:
- `computeFeatures()` usa odds con `event_time > as_of_time`
- Query DB senza filtro temporale

---

### 12.3 CANONICAL_IDS_REQUIRED

**Regola**:
```text
Nessun bundle senza player_id e tournament_id canonici.
```

**Rationale**: evitare ambiguità identità.

**Test**:
```javascript
function checkCanonicalIds(bundle) {
  const { header } = bundle;
  
  if (!header.home_player?.player_id) {
    return { error: 'missing home_player.player_id' };
  }
  
  if (!header.away_player?.player_id) {
    return { error: 'missing away_player.player_id' };
  }
  
  if (!header.tournament?.tournament_id) {
    return { error: 'missing tournament.tournament_id' };
  }
  
  // Verifica formato (opzionale)
  const idPattern = /^(sof_|uuid_|atp_|wta_)/;
  if (!idPattern.test(header.home_player.player_id)) {
    return { warning: 'player_id formato non standard' };
  }
  
  return { ok: true };
}
```

**Violazioni**:
- Bundle con `player_name` (string) invece di `player_id`
- Match senza `tournament_id`

---

### 12.4 MATCHBUNDLE_META_REQUIRED

**Regola**:
```text
meta.generated_at e meta.versions obbligatori in ogni bundle.
```

**Rationale**: riproducibilità + audit.

**Test**:
```javascript
function checkBundleMeta(bundle) {
  const { meta } = bundle;
  
  if (!meta) {
    return { error: 'missing meta block' };
  }
  
  const required = [
    'generated_at',
    'as_of_time',
    'versions',
    'versions.bundle_schema',
    'versions.data',
    'versions.features',
    'versions.odds',
    'versions.strategies'
  ];
  
  for (const field of required) {
    const value = field.includes('.') 
      ? field.split('.').reduce((obj, key) => obj?.[key], meta)
      : meta[field];
      
    if (!value) {
      return { error: `missing ${field}` };
    }
  }
  
  return { ok: true };
}
```

**Violazioni**:
- Bundle senza `meta`
- `meta.versions` incompleto

---

### 12.5 ODDS_STALENESS_WARNING

**Regola**:
```text
Se last_odds_ingestion_time troppo vecchio → warning.
```

**Thresholds**:
- Pre-match: 10 min
- Live: 30 sec

**Test**:
```javascript
function checkOddsStaleness(bundle) {
  const { meta, header } = bundle;
  const now = Date.now();
  
  const lastOdds = meta.data_freshness?.last_odds_ingestion_time;
  if (!lastOdds) {
    return { warning: 'no odds freshness data' };
  }
  
  const age_ms = now - new Date(lastOdds).getTime();
  const age_sec = age_ms / 1000;
  
  const threshold = header.status === 'live' ? 30 : 600;  // 30s live, 10min pre
  
  if (age_sec > threshold) {
    return { warning: `odds stale: ${age_sec.toFixed(0)}s old (threshold: ${threshold}s)` };
  }
  
  return { ok: true };
}
```

**Violazioni**:
- Odds vecchie 5 min per match live
- Odds vecchie 20 min per match pre-match

---

### 12.6 DATA_QUALITY_THRESHOLD

**Regola**:
```text
bundle.meta.data_quality.overall_score >= 60
```

**Rationale**: non usare dati di qualità scadente per decisioni.

**Test**:
```javascript
function checkDataQuality(bundle) {
  const dq = bundle.meta.data_quality;
  
  if (!dq) {
    return { error: 'missing data_quality in meta' };
  }
  
  if (dq.overall_score < 40) {
    return { error: `data quality too low: ${dq.overall_score}` };
  }
  
  if (dq.overall_score < 60) {
    return { warning: `data quality marginal: ${dq.overall_score}` };
  }
  
  if (dq.outliers?.count > 0) {
    return { warning: `outliers detected: ${dq.outliers.fields.join(', ')}` };
  }
  
  return { ok: true };
}
```

**Violazioni**:
- Bundle con score < 60
- Features con outlier non gestiti

---

### 12.7 NO_QUARANTINED_DATA

**Regola**:
```text
Match non deve essere in quarantine se usato per decisioni.
```

**Test**:
```javascript
async function checkNotQuarantined(match_id) {
  const quarantined = await db.query(`
    SELECT * FROM quarantine_data
    WHERE entity_type = 'match'
    AND entity_id = $1
    AND reviewed = FALSE
  `, [match_id]);
  
  if (quarantined.length > 0) {
    return { error: 'match is quarantined', reason: quarantined[0].reason };
  }
  
  return { ok: true };
}
```

**Violazioni**:
- Bundle generato per match in quarantine
- Strategy evaluation su dati quarantinati

---

## 1️⃣3️⃣ TABELLA RIEPILOGATIVA REGOLE V2.2

> **Aggiornato**: 25 Dicembre 2025 - Check automatizzati per TUTTE le filosofie

### Invarianti Esistenti (V2.0)

| ID | Nome | Severity | Filosofia | Automated |
|----|------|----------|-----------|-----------|
| `MATCHBUNDLE_ONLY_FE` | Frontend consuma SOLO MatchBundle | ERROR | MADRE | ✅ |
| `BACKEND_INTERPRETATION` | Solo backend interpreta dati | ERROR | MADRE | ✅ |
| `FEATURE_VS_STRATEGY` | Features ≠ Strategie | ERROR | STATS | ✅ |
| `SIGNAL_NOT_METRIC` | Segnali non persistibili | ERROR | STATS | ✅ |
| `DATAQUALITY_BACKEND` | DataQuality solo backend | ERROR | STATS | ✅ |
| `TEMPORAL_ASOF` | as_of_time coerente | ERROR | TEMPORAL | ✅ |
| `NO_FUTURE_DATA` | No dati futuri | ERROR | TEMPORAL | ✅ |
| `CANONICAL_IDS_REQUIRED` | IDs canonici obbligatori | ERROR | REGISTRY_CANON | ✅ |
| `MATCHBUNDLE_META_REQUIRED` | Meta completo | ERROR | LINEAGE | ✅ |
| `ODDS_STALENESS_WARNING` | Odds fresche | WARNING | TEMPORAL + OBSERVABILITY | ✅ |
| `DATA_QUALITY_THRESHOLD` | Score >= 60 | WARNING | OBSERVABILITY | ✅ |
| `NO_QUARANTINED_DATA` | No dati quarantinati | ERROR | OBSERVABILITY | ✅ |

### Architectural Checks (V2.2 - NUOVI)

| ID | Nome | Severity | Filosofia | File Target |
|----|------|----------|-----------|-------------|
| `LIN-001` | featureEngine deve esportare VERSION | ERROR | LINEAGE_VERSIONING | `backend/utils/featureEngine.js` |
| `LIN-002` | strategyEngine deve esportare VERSION | ERROR | LINEAGE_VERSIONING | `backend/strategies/strategyEngine.js` |
| `LIN-003` | Bundle endpoint deve avere meta.versions | ERROR | LINEAGE_VERSIONING | `backend/server.js` |
| `LIN-004` | matchCardService deve includere meta | WARN | LINEAGE_VERSIONING | `backend/services/matchCardService.js` |
| `LIN-005` | useMatchBundle deve esporre meta | WARN | LINEAGE_VERSIONING | `src/hooks/useMatchBundle.jsx` |
| `TEMP-001` | Repository deve avere event_time | WARN | TEMPORAL | `backend/db/matchRepository.js` |
| `TEMP-002` | Live tracking deve usare snapshotTime | WARN | TEMPORAL | `backend/db/liveTrackingRepository.js` |
| `REG-001` | players.json mapping deve esistere | ERROR | REGISTRY_CANON | `data/mappings/players.json` |
| `REG-002` | Scraper deve normalizzare nomi | WARN | REGISTRY_CANON | `backend/scraper/sofascoreScraper.js` |
| `OBS-001` | Bundle deve includere dataQuality | ERROR | OBSERVABILITY | `backend/server.js` |
| `OBS-002` | matchCardService deve calcolare quality | WARN | OBSERVABILITY | `backend/services/matchCardService.js` |
| `STATS-001` | Feature Engine deve esistere | ERROR | STATS | `backend/utils/featureEngine.js` |
| `STATS-002` | Strategy Engine deve esistere | ERROR | STATS | `backend/strategies/strategyEngine.js` |
| `STATS-003` | featureEngine deve calcolare momentum | ERROR | STATS | `backend/utils/featureEngine.js` |
| `STATS-004` | featureEngine deve calcolare pressure | ERROR | STATS | `backend/utils/featureEngine.js` |
| `CALC-001` | featureEngine NON deve MAI ritornare null | ERROR | CALCOLI | `backend/utils/featureEngine.js` |
| `CALC-002` | featureEngine deve avere fallback chain | WARN | CALCOLI | `backend/utils/featureEngine.js` |
| `CALC-003` | Features NON devono ritornare undefined | ERROR | CALCOLI | `backend/utils/featureEngine.js` |
| `FE-001` | App.jsx non deve importare featureEngine | ERROR | FRONTEND_DATA | `src/App.jsx` |
| `FE-002` | MatchCard deve usare useMemo | WARN | FRONTEND | `src/components/MatchCard.jsx` |
| `FE-003` | App.jsx deve importare useMatchBundle | WARN | FRONTEND_DATA | `src/App.jsx` |
| `DB-001` | Supabase client centralizzato | ERROR | DB | `backend/db/supabase.js` |
| `DB-002` | matchRepository deve esportare getMatchBundle | ERROR | DB | `backend/db/matchRepository.js` |
| `LIVE-001` | liveManager deve gestire WebSocket/polling | WARN | LIVE_TRACKING | `backend/liveManager.js` |
| `LIVE-002` | Live tracking deve salvare snapshots | WARN | LIVE_TRACKING | `backend/db/liveTrackingRepository.js` |
| `ODDS-001` | Odds devono avere timestamp | WARN | ODDS | `backend/services/matchCardService.js` |
| `ODDS-002` | valueInterpreter deve esistere | WARN | ODDS | `backend/utils/valueInterpreter.js` |

---

## 1️⃣4️⃣ INTEGRATION EXAMPLES

### 14.1 Pre-Bundle Build Check

```javascript
// backend/services/matchCardService.js

async function buildMatchBundle(match_id, options = {}) {
  // 1. Check not quarantined
  const quarantineCheck = await checkNotQuarantined(match_id);
  if (quarantineCheck.error) {
    throw new Error(`Cannot build bundle: ${quarantineCheck.error}`);
  }
  
  // 2. Fetch data
  const match = await matchRepository.getMatchById(match_id);
  const odds = await oddsRepository.getOdds(match_id);
  // ...
  
  // 3. Canonical IDs check
  const canonicalCheck = checkCanonicalIds({ header: match });
  if (canonicalCheck.error) {
    throw new Error(`Invalid canonical IDs: ${canonicalCheck.error}`);
  }
  
  // 4. Compute features with as_of_time
  const as_of_time = options.as_of_time || new Date();
  const features = await featureEngine.computeFeatures({
    match,
    odds: odds.filter(o => o.event_time <= as_of_time),  // ← NO_FUTURE_DATA
    // ...
  }, { as_of_time });
  
  // 5. Build bundle
  const bundle = {
    header: buildHeader(match),
    tabs: buildTabs({ match, features, odds }),
    meta: {
      generated_at: new Date(),
      as_of_time,
      versions: { /* ... */ },
      data_quality: { /* ... */ }
    }
  };
  
  // 6. Validate bundle
  const checks = [
    checkTemporalAsOf(bundle),
    checkBundleMeta(bundle),
    checkDataQuality(bundle),
    checkOddsStaleness(bundle)
  ];
  
  for (const check of checks) {
    if (check.error) {
      throw new Error(`Bundle validation failed: ${check.error}`);
    }
    if (check.warning) {
      console.warn(`Bundle warning: ${check.warning}`);
    }
  }
  
  return bundle;
}
```

---

### 14.2 CI/CD Integration

```javascript
// scripts/runConceptChecks.js

async function runAllChecks() {
  const results = [];
  
  // Load recent bundles
  const bundles = await loadRecentBundles(limit = 10);
  
  for (const bundle of bundles) {
    const checks = {
      temporal_asof: checkTemporalAsOf(bundle),
      canonical_ids: checkCanonicalIds(bundle),
      bundle_meta: checkBundleMeta(bundle),
      data_quality: checkDataQuality(bundle),
      odds_staleness: checkOddsStaleness(bundle)
    };
    
    results.push({
      bundle_id: bundle.header.match_id,
      checks,
      timestamp: new Date()
    });
  }
  
  // Report
  const errors = results.flatMap(r => 
    Object.entries(r.checks).filter(([k, v]) => v.error).map(([k, v]) => ({ ...v, check: k }))
  );
  
  if (errors.length > 0) {
    console.error(`❌ ${errors.length} errors found`);
    process.exit(1);
  }
  
  console.log(`✅ All checks passed`);
}
```

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [FRONTEND_UI](../70_frontend/ui/FILOSOFIA_FRONTEND.md) | [📚 INDEX](../INDEX_FILOSOFIE.md) | [MADRE](FILOSOFIA_MADRE_TENNIS.md) |

---

**Fine documento – FILOSOFIA_CONCEPT_CHECKS**
