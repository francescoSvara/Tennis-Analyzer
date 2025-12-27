# 📜 FILOSOFIA LINEAGE & VERSIONING  
## Versione V1 – Reproducibility & Auditability

> **Dominio**: Versioning · Lineage · Reproducibility · Audit Trail  
> **Stato**: ATTIVA  
> **Ultimo aggiornamento**: Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|----------------|
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | Tutti i moduli | MatchBundle `_meta`, [OBSERVABILITY](../quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) |

### 📚 Documenti Correlati (stesso layer)
| Documento | Relazione |
|-----------|-----------|
| [DB](../storage/FILOSOFIA_DB.md) | Schema versioning |
| [TEMPORAL](../temporal/FILOSOFIA_TEMPORAL.md) | `as_of_time` per snapshot |
| [REGISTRY_CANON](../registry_canon/FILOSOFIA_REGISTRY_CANON.md) | Entity mapping versions |
| [OBSERVABILITY](../quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Version drift alerts |

### 📁 File Codice Principali
| File | Descrizione | Versioning Responsibility |
|------|-------------|---------------------------|
| [`backend/services/matchCardService.js`](../../backend/services/matchCardService.js) | MatchBundle builder | Aggiungi `meta.versions` al bundle |
| [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) | Feature computation | Export `feature_version` |
| [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js) | Strategy evaluation | Export `strategy_version` |
| [`backend/db/matchRepository.js`](../../backend/db/matchRepository.js) | Match card snapshot storage | Salva `meta` con bundle |
| [`src/hooks/useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx) | FE bundle consumer | Leggi `meta.versions` |

---

## 0️⃣ PERCHÉ ESISTE (GAMBLER REASON)

> **Senza versioning, non sai se l'edge era reale o un bug.**

Scenario reale:
```text
2025-01-10: Strategy "LayWinner" suggerisce bet → perdi €500.
2025-01-11: Bug fix in featureEngine → volatility calculation errata.

Domanda: la decisione del 10 era valida?
Risposta: NON LO SAI, perché non hai versioning.
```

**Con versioning**:
```json
{
  "bet_decision": {
    "match_id": "abc123",
    "timestamp": "2025-01-10T14:55:00Z",
    "bundle_meta": {
      "feature_version": "v1.1.0",  // ← bug era qui
      "strategy_version": "v2.0.0",
      "odds_schema_version": "v1.0.0"
    }
  }
}
```

👉 Ora sai: decision era basata su `feature_version: v1.1.0` (buggy).  
👉 Puoi **ri-calcolare** con `v1.2.0` e capire l'errore.

**Questo = riproducibilità = fondamenta del betting quantitativo.**

---

## 1️⃣ COSA SI VERSIONA (RIGIDO)

Ogni layer del sistema ha una versione:

### 1.1 `data_version`

**Cosa**: schema DB + origine dataset.

Esempi:
- `"legacy_v1"` → matches table con `winner_name`, `loser_name`
- `"canonical_v2"` → matches_new con `home_player_id`, `away_player_id`
- `"sofascore_2025"` → scraping SofaScore API

**Bump quando**:
- Cambio schema tabella
- Nuova fonte dati
- Migration importante

---

### 1.2 `feature_version`

**Cosa**: versione del `featureEngine.js`.

Esempi:
- `"v1.0.0"` → volatility da powerRankings only
- `"v1.1.0"` → aggiunto fallback da score
- `"v1.2.0"` → fix bug calcolo dominance

**Bump quando**:
- Cambio formula feature
- Aggiunta nuova feature
- Fix bug calcolo

**Standard**: semantic versioning (`major.minor.patch`)

---

### 1.3 `odds_schema_version`

**Cosa**: formato odds ticks/snapshot.

Esempi:
- `"v1.0.0"` → simple `{ home, away, timestamp }`
- `"v2.0.0"` → aggiunto `{ event_time, ingestion_time, liquidity }`

**Bump quando**:
- Cambio struttura odds
- Aggiunta campi temporali (vedi [TEMPORAL](../temporal/FILOSOFIA_TEMPORAL.md))

---

### 1.4 `strategy_version`

**Cosa**: versione del `strategyEngine.js`.

Esempi:
- `"v1.0.0"` → LayWinner, BancaServizio
- `"v2.0.0"` → aggiunto SuperBreak, cambiato threshold LayWinner

**Bump quando**:
- Nuova strategia
- Cambio logica decisionale (READY/WATCH/OFF)
- Cambio threshold o parametri

---

### 1.5 `bundle_schema_version`

**Cosa**: contratto MatchBundle.

Esempi:
- `"v1.0.0"` → `{ header, tabs }`
- `"v2.0.0"` → aggiunto `meta` block
- `"v2.1.0"` → aggiunto `tabs.predictor`

**Bump quando**:
- Cambio struttura bundle
- Aggiunta/rimozione tab
- Cambio contratto header

---

### 1.6 `model_version` (futuro)

**Cosa**: versione predictor/AI model.

Esempi:
- `"xgboost_v1"` → primo modello
- `"neural_v2"` → rete neurale

**Bump quando**:
- Ritraining model
- Cambio architettura

**NOTA**: non ancora implementato, ma va nel design.

---

## 2️⃣ LINEAGE (CATENA DI DERIVAZIONE)

### 2.1 Flusso Standard

```
RawEvents (SofaScore API / SVG Momentum)
      │  data_version
      ▼
Canonical Tables (matches_new, players, odds)
      │  REGISTRY_CANON
      ▼
FeatureSnapshot
      │  feature_version
      │  as_of_time (TEMPORAL)
      ▼
StrategyEvaluation
      │  strategy_version
      ▼
MatchBundleSnapshot
      │  bundle_schema_version
      │  meta.versions + meta.as_of_time
      ▼
Bet Decision (opzionale)
```

**Regola**: ogni step produce `meta` con version + timestamp.

---

### 2.2 Esempio Pratico

```javascript
// 1. Raw Events → DB
const match = await scraper.fetchMatch(sofascoreId);
await matchRepository.saveMatch({
  ...match,
  data_version: 'canonical_v2'
});

// 2. Feature Snapshot
const features = await featureEngine.computeFeatures(match, {
  as_of_time: new Date()
});
const featureSnapshot = {
  match_id: match.match_id,
  as_of_time: features.as_of_time,
  feature_version: 'v1.2.0',  // ← lineage
  features: features.data
};

// 3. Strategy Evaluation
const strategies = await strategyEngine.evaluateAll(features);
const strategySnapshot = {
  match_id: match.match_id,
  strategy_version: 'v2.0.0',  // ← lineage
  signals: strategies
};

// 4. MatchBundle
const bundle = {
  header: { /* ... */ },
  tabs: { /* ... */ },
  meta: {
    generated_at: new Date(),
    as_of_time: features.as_of_time,
    versions: {
      bundle_schema: 'v2.1.0',
      data: 'canonical_v2',
      features: 'v1.2.0',
      odds: 'v2.0.0',
      strategies: 'v2.0.0'
    }
  }
};
```

---

## 3️⃣ MATCHBUNDLE.META (OBBLIGATORIO)

### 3.1 Struttura Standard

```typescript
interface MatchBundleMeta {
  generated_at: Date;        // quando il bundle è stato generato
  as_of_time: Date;          // cut temporale logico (vedi TEMPORAL)
  
  versions: {
    bundle_schema: string;   // es. "v2.1.0"
    data: string;            // es. "canonical_v2"
    features: string;        // es. "v1.2.0"
    odds: string;            // es. "v2.0.0"
    strategies: string;      // es. "v2.0.0"
  };
  
  data_freshness: {
    last_live_ingestion_time?: Date;  // se match live
    last_odds_ingestion_time?: Date;  // ultima odds tick ricevuta
  };
  
  identity_warnings?: {  // vedi REGISTRY_CANON
    home_player?: { confidence: number; reason: string; };
    tournament?: { confidence: number; reason: string; };
  };
}
```

**Regola**: OGNI MatchBundle DEVE avere `meta`.

---

### 3.2 Esempio Completo

```json
{
  "header": { "..." },
  "tabs": { "..." },
  "meta": {
    "generated_at": "2025-12-25T14:55:30Z",
    "as_of_time": "2025-12-25T14:55:00Z",
    "versions": {
      "bundle_schema": "v2.1.0",
      "data": "canonical_v2",
      "features": "v1.2.0",
      "odds": "v2.0.0",
      "strategies": "v2.0.0"
    },
    "data_freshness": {
      "last_live_ingestion_time": "2025-12-25T14:55:20Z",
      "last_odds_ingestion_time": "2025-12-25T14:54:50Z"
    }
  }
}
```

---

## 4️⃣ RIPRODUCIBILITÀ (CONTRATTO)

### 4.1 Definizione

> **Dato**: `match_id` + `meta.versions` + `as_of_time`  
> **Devo poter**: rigenerare lo stesso bundle (entro tolleranza).

**Tolleranza**:
- Features numeriche: ±0.01%
- Signals discreti: identici
- Timestamps: identici (input) o tolleranza ±1s (generated_at)

---

### 4.2 Pseudo-codice Test

```javascript
async function testReproducibility(original_bundle) {
  const { header, meta } = original_bundle;
  
  // Re-fetch raw data "as-of" original timestamp
  const rawData = await fetchRawDataAsOf({
    match_id: header.match_id,
    as_of_time: meta.as_of_time
  });
  
  // Re-compute usando stesse versioni
  const features = await featureEngine.computeFeatures(rawData, {
    as_of_time: meta.as_of_time,
    version: meta.versions.features  // ← pinned version
  });
  
  const strategies = await strategyEngine.evaluateAll(features, {
    version: meta.versions.strategies
  });
  
  const recomputed_bundle = buildBundle({
    match_id: header.match_id,
    features,
    strategies,
    versions: meta.versions,
    as_of_time: meta.as_of_time
  });
  
  // Compare
  assert.deepEqual(
    recomputed_bundle.tabs.strategies,
    original_bundle.tabs.strategies
  );
  
  assertClose(
    recomputed_bundle.tabs.stats.volatility,
    original_bundle.tabs.stats.volatility,
    0.0001  // tolleranza
  );
}
```

---

### 4.3 Limiti Accettati

**Non riproducibile al 100%**:
- `generated_at` (ovviamente diverso)
- `data_freshness.last_*_ingestion_time` (dipende da timing)
- Random seed (se usato) deve essere persistito

**Riproducibile al 100%**:
- Features deterministiche
- Strategy signals (READY/WATCH/OFF)
- Odds snapshot

---

## 5️⃣ STORAGE / SNAPSHOT

### 5.1 `match_card_snapshot` Table

**Requisiti**:
- Salva `meta` insieme al bundle
- Salva `as_of_time` per query temporali
- Salva `versions` per audit

**Schema suggerito**:
```sql
CREATE TABLE match_card_snapshot (
  match_id TEXT PRIMARY KEY,
  snapshot JSONB NOT NULL,  -- intero bundle
  meta JSONB NOT NULL,      -- meta block separato per indexing
  as_of_time TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  feature_version TEXT,
  strategy_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshot_as_of ON match_card_snapshot(as_of_time);
CREATE INDEX idx_snapshot_versions ON match_card_snapshot USING GIN(meta);
```

---

### 5.2 Segnali NON Persistiti come Storia

**Regola** (da [FILOSOFIA_STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md)):
```text
I segnali (READY/WATCH/OFF) NON sono metriche storiche persistibili.
```

**MA**: puoi persistere il **bundle snapshot** per audit.

**Differenza**:
- ❌ NON creare tabella `strategy_signals_history`
- ✅ OK salvare `match_card_snapshot` con `tabs.strategies` incluso

**Rationale**: snapshot bundle = audit, non serie temporale statistica.

---

## 6️⃣ CONCEPT CHECKS

### 6.1 MATCHBUNDLE_META_REQUIRED

**Regola**:
```text
meta.generated_at e meta.versions obbligatori in ogni bundle.
```

**Test**:
```javascript
function checkBundleMeta(bundle) {
  assert(bundle.meta, 'missing meta block');
  assert(bundle.meta.generated_at, 'missing meta.generated_at');
  assert(bundle.meta.as_of_time, 'missing meta.as_of_time');
  assert(bundle.meta.versions, 'missing meta.versions');
  
  const { versions } = bundle.meta;
  assert(versions.bundle_schema, 'missing bundle_schema version');
  assert(versions.data, 'missing data version');
  assert(versions.features, 'missing features version');
  assert(versions.odds, 'missing odds version');
  assert(versions.strategies, 'missing strategies version');
}
```

---

### 6.2 VERSION_BUMP_RULE

**Regola**:
```text
Se cambi calcoli o strategia, incrementa version.
```

**Checklist**:
- [ ] Cambio formula feature → bump `feature_version`
- [ ] Nuova strategia → bump `strategy_version`
- [ ] Fix bug calcolo → bump `feature_version` (patch)
- [ ] Cambio struttura bundle → bump `bundle_schema_version`

**Standard**: semantic versioning
- `major`: breaking changes
- `minor`: feature aggiunte (backward compatible)
- `patch`: bug fix

---

## 7️⃣ ESEMPI PRATICI

### Esempio 1: Bundle con Meta Completo

```javascript
async function buildMatchBundleWithMeta(match_id, as_of_time) {
  // 1. Fetch raw data
  const match = await matchRepository.getMatchById(match_id);
  const odds = await oddsRepository.getOddsAsOf(match_id, as_of_time);
  const liveSnaps = await liveRepository.getSnapshotsAsOf(match_id, as_of_time);
  
  // 2. Compute features
  const features = await featureEngine.computeFeatures({
    match,
    odds,
    liveSnaps,
    as_of_time
  });
  
  // 3. Evaluate strategies
  const strategies = await strategyEngine.evaluateAll(features);
  
  // 4. Build bundle
  const bundle = {
    header: buildHeader(match),
    tabs: {
      overview: buildOverview(match, features),
      stats: features,
      strategies: strategies,
      odds: normalizeOdds(odds),
      // ...
    },
    meta: {
      generated_at: new Date(),
      as_of_time,
      versions: {
        bundle_schema: 'v2.1.0',
        data: 'canonical_v2',
        features: featureEngine.VERSION,   // export from module
        odds: 'v2.0.0',
        strategies: strategyEngine.VERSION
      },
      data_freshness: {
        last_live_ingestion_time: liveSnaps[liveSnaps.length - 1]?.ingestion_time,
        last_odds_ingestion_time: odds[odds.length - 1]?.ingestion_time
      }
    }
  };
  
  return bundle;
}
```

---

### Esempio 2: Feature Engine con Version Export

```javascript
// backend/utils/featureEngine.js

const FEATURE_ENGINE_VERSION = 'v1.2.0';  // ← export this

function computeFeatures(data, options) {
  const features = {
    volatility: calculateVolatility(data.powerRankings),
    pressure: calculatePressure(data.score),
    // ...
  };
  
  return {
    match_id: data.match.match_id,
    as_of_time: options.as_of_time,
    feature_version: FEATURE_ENGINE_VERSION,  // ← include
    features,
    computed_at: new Date()
  };
}

module.exports = {
  computeFeatures,
  VERSION: FEATURE_ENGINE_VERSION  // ← export
};
```

---

### Esempio 3: Snapshot con Meta Salvato

```javascript
async function saveMatchCardSnapshot(bundle) {
  await db.query(`
    INSERT INTO match_card_snapshot (
      match_id,
      snapshot,
      meta,
      as_of_time,
      generated_at,
      feature_version,
      strategy_version
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (match_id) DO UPDATE SET
      snapshot = EXCLUDED.snapshot,
      meta = EXCLUDED.meta,
      as_of_time = EXCLUDED.as_of_time,
      generated_at = EXCLUDED.generated_at,
      feature_version = EXCLUDED.feature_version,
      strategy_version = EXCLUDED.strategy_version
  `, [
    bundle.header.match_id,
    JSON.stringify(bundle),
    JSON.stringify(bundle.meta),
    bundle.meta.as_of_time,
    bundle.meta.generated_at,
    bundle.meta.versions.features,
    bundle.meta.versions.strategies
  ]);
}
```

---

### Esempio 4: FE Mostra Version Info

```jsx
// src/components/match/MatchBundleMeta.jsx

function MatchBundleMeta({ bundle }) {
  const { meta } = bundle;
  
  return (
    <div className="meta-panel">
      <h4>Bundle Info</h4>
      <dl>
        <dt>Generated:</dt>
        <dd>{formatTimestamp(meta.generated_at)}</dd>
        
        <dt>As-of:</dt>
        <dd>{formatTimestamp(meta.as_of_time)}</dd>
        
        <dt>Features:</dt>
        <dd>{meta.versions.features}</dd>
        
        <dt>Strategies:</dt>
        <dd>{meta.versions.strategies}</dd>
        
        {meta.data_freshness?.last_odds_ingestion_time && (
          <>
            <dt>Last Odds:</dt>
            <dd className={isStale(meta.data_freshness.last_odds_ingestion_time) ? 'warning' : ''}>
              {formatTimestamp(meta.data_freshness.last_odds_ingestion_time)}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
```

---

## 8️⃣ VERSION BUMP WORKFLOW

### 8.1 Prima di Committare

Checklist:
- [ ] Ho cambiato una feature calculation?  
  → Bump `FEATURE_ENGINE_VERSION` in `featureEngine.js`
  
- [ ] Ho cambiato una strategia?  
  → Bump `STRATEGY_ENGINE_VERSION` in `strategyEngine.js`
  
- [ ] Ho cambiato il contratto MatchBundle?  
  → Bump `BUNDLE_SCHEMA_VERSION` in `matchCardService.js`
  
- [ ] Ho fatto migration DB?  
  → Bump `DATA_VERSION` in `matchRepository.js`

---

### 8.2 Changelog

Mantieni `CHANGELOG.md` per ogni modulo versionato:

```markdown
# Feature Engine Changelog

## [v1.2.0] - 2025-12-25
### Fixed
- Dominance calculation fallback from odds now uses correct implied probability

## [v1.1.0] - 2025-12-20
### Added
- Fallback volatility calculation from score sets when powerRankings missing

## [v1.0.0] - 2025-12-01
### Initial
- Volatility, dominance, pressure, momentum features
```

---

## 9️⃣ REGOLA FINALE

> **Ogni decisione deve essere riproducibile.**

Se non puoi rispondere:
- "Quali features ho usato per questa bet?"
- "Quale versione della strategia ha suggerito READY?"
- "Posso rigenerare questo bundle?"

→ **il sistema non è audit-compliant**.

**Versioning = fondamenta della riproducibilità.**

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [REGISTRY_CANON](../registry_canon/FILOSOFIA_REGISTRY_CANON.md) | [📚 INDEX](../../INDEX_FILOSOFIE.md) | [RISK_BANKROLL](../../50_strategy_risk_execution/risk_bankroll/FILOSOFIA_RISK_BANKROLL.md) |

---

**Fine documento – FILOSOFIA_LINEAGE_VERSIONING**
