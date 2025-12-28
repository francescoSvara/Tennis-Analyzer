# 🔍 FILOSOFIA OBSERVABILITY & DATA QUALITY  
## Versione V1 – Monitoring, Quality, Quarantine

> **Dominio**: Observability · Data Quality · Monitoring · Alerting  
> **Stato**: ATTIVA  
> **Ultimo aggiornamento**: Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|----------------|
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | Tutti i moduli | [STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md), [CONCEPT_CHECKS](../../00_foundation/FILOSOFIA_CONCEPT_CHECKS.md), MatchBundle.meta |

### 📚 Documenti Correlati (stesso layer)
| Documento | Relazione |
|-----------|-----------|
| [DB](../storage/FILOSOFIA_DB.md) | Monitor data in tables |
| [TEMPORAL](../temporal/FILOSOFIA_TEMPORAL.md) | Staleness/freshness metrics |
| [REGISTRY_CANON](../registry_canon/FILOSOFIA_REGISTRY_CANON.md) | Resolution quality |
| [LINEAGE_VERSIONING](../lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) | Version drift detection |

### 📁 File Codice Principali
| File | Descrizione | Observability Responsibility |
|------|-------------|------------------------------|
| [`backend/services/dataQualityChecker.js`](../../backend/services/dataQualityChecker.js) | Data quality validation (TODO) | Missingness, outliers, staleness |
| [`backend/services/matchCardService.js`](../../backend/services/matchCardService.js) | Bundle builder | Include dataQuality in bundle |
| [`backend/liveManager.js`](../../backend/liveManager.js) | Live tracking | Latency monitoring |
| [`backend/utils/logger.js`](../../backend/utils/logger.js) | Logging (TODO) | Structured logging |
| [`backend/server.js`](../../backend/server.js) | Bootstrap + mount routes; global middleware (logging, CORS) | Mounts logging middleware and routes |
| [`backend/routes/*.routes.js`](../../backend/routes/*.routes.js) | Route definitions | URL + middleware (per-endpoint tagging) |
| [`backend/controllers/*.controller.js`](../../backend/controllers/*.controller.js) | Controllers | req → service → response (instrumentation points) |

---

## 0️⃣ PERCHÉ ESISTE (GAMBLER REASON)

> **Garbage in, garbage out.**

Problemi senza observability:
- Odds stale da 10 minuti → strategia suggerisce bet su prezzo non valido
- Player stats mancanti → features calcolate con fallback → edge falso
- Live score delayed 30s → momentum calculation sbagliato
- Outlier non rilevato → feature spike → signal spurio

**Risultato**: decisioni basate su dati corrotti.

**Questo documento**:
- Metriche data quality da tracciare
- Quarantena dati sospetti
- Logging/metrics/alerts
- Integrazione con concept checks

---

## 1️⃣ DATA QUALITY DIMENSIONS

### 1.1 Completeness (Missingness)

**Definizione**: % campi obbligatori presenti.

**Esempio**:
```javascript
function calculateCompleteness(match) {
  const required = [
    'match_id',
    'home_player_id',
    'away_player_id',
    'tournament_id',
    'surface',
    'best_of',
    'event_time'
  ];
  
  const present = required.filter(f => match[f] != null).length;
  return present / required.length;
}
```

**Thresholds**:
- `>= 95%` → OK
- `80-95%` → Warning
- `< 80%` → Error (quarantine)

---

### 1.2 Timeliness (Freshness / Staleness)

**Definizione**: età dei dati rispetto a `now()` o `as_of_time`.

**Metriche**:
```javascript
function calculateStaleness(data) {
  const now = Date.now();
  const age = now - data.ingestion_time;
  
  return {
    age_ms: age,
    age_sec: age / 1000,
    is_stale: age > getThreshold(data.type)
  };
}

function getThreshold(type) {
  switch (type) {
    case 'live_score': return 30000;   // 30s
    case 'odds_tick': return 60000;    // 1 min (pre-match)
    case 'odds_live': return 10000;    // 10s (live)
    case 'player_stats': return 86400000;  // 1 day
    default: return 300000;  // 5 min
  }
}
```

---

### 1.3 Accuracy (Outliers)

**Definizione**: valori fuori range plausibile.

**Esempi**:
- Odds < 1.01 o > 1000 → sospetto
- Volatility > 100% → impossibile
- Pressure < 0 o > 100 → impossibile
- Score negativo → impossibile

**Detection**:
```javascript
function detectOutliers(features) {
  const outliers = [];
  
  if (features.volatility < 0 || features.volatility > 1) {
    outliers.push({ field: 'volatility', value: features.volatility });
  }
  
  if (features.pressure < 0 || features.pressure > 100) {
    outliers.push({ field: 'pressure', value: features.pressure });
  }
  
  return outliers;
}
```

---

### 1.4 Consistency (Cross-field)

**Definizione**: coerenza tra campi correlati.

**Esempi**:
- Match status "finished" ma score mancante → inconsistente
- Best_of = 3 ma sets = 5 → inconsistente
- Odds home + away implied prob != 1 → OK (overround), ma se >> 1.2 → sospetto

**Checks**:
```javascript
function checkConsistency(match) {
  const issues = [];
  
  if (match.status === 'finished' && !match.score) {
    issues.push('finished match without score');
  }
  
  if (match.best_of === 3 && match.score?.sets?.length > 3) {
    issues.push('best_of inconsistent with sets count');
  }
  
  return issues;
}
```

---

### 1.5 Uniqueness (Duplicates)

**Definizione**: entità duplicate nel registry.

Vedi [FILOSOFIA_REGISTRY_CANON](../registry_canon/FILOSOFIA_REGISTRY_CANON.md).

---

## 2️⃣ DATA QUALITY METRICS (TRACCIAMENTO)

### 2.1 Metriche per Match

```typescript
interface MatchDataQuality {
  match_id: string;
  timestamp: Date;
  
  completeness: {
    header: number;        // % campi header presenti
    statistics: number;    // % stats presenti
    odds: number;          // % odds presenti
    live: number;          // % live snapshots presenti (se live)
  };
  
  staleness: {
    odds: {
      age_sec: number;
      is_stale: boolean;
    };
    live?: {
      age_sec: number;
      is_stale: boolean;
    };
  };
  
  outliers: {
    count: number;
    fields: string[];
  };
  
  consistency_issues: string[];
  
  overall_score: number;  // 0-100
}
```

---

### 2.2 Overall Score Calculation

```javascript
function calculateOverallScore(dq) {
  // Weighted average
  const weights = {
    completeness: 0.4,
    staleness: 0.3,
    outliers: 0.2,
    consistency: 0.1
  };
  
  const scores = {
    completeness: avg([dq.completeness.header, dq.completeness.statistics, dq.completeness.odds]),
    staleness: dq.staleness.odds.is_stale ? 0 : 100,
    outliers: dq.outliers.count === 0 ? 100 : Math.max(0, 100 - dq.outliers.count * 20),
    consistency: dq.consistency_issues.length === 0 ? 100 : Math.max(0, 100 - dq.consistency_issues.length * 10)
  };
  
  const overall = Object.entries(weights)
    .reduce((sum, [key, weight]) => sum + scores[key] * weight, 0);
  
  return Math.round(overall);
}
```

---

### 2.3 Thresholds

```javascript
const DATA_QUALITY_THRESHOLDS = {
  EXCELLENT: 95,
  GOOD: 80,
  ACCEPTABLE: 60,
  POOR: 40,
  UNUSABLE: 0
};

function getQualityLevel(score) {
  if (score >= 95) return 'EXCELLENT';
  if (score >= 80) return 'GOOD';
  if (score >= 60) return 'ACCEPTABLE';
  if (score >= 40) return 'POOR';
  return 'UNUSABLE';
}
```

---

## 3️⃣ QUARANTENA DATI SOSPETTI

### 3.1 Quarantine Triggers

Dati vanno in quarantine se:
- Overall score < 40 (UNUSABLE)
- Outliers critici (es. odds < 1.01)
- Consistency issues gravi (es. finished match senza score)
- Canonical IDs mancanti (vedi REGISTRY_CANON)

---

### 3.2 Quarantine Table

```sql
CREATE TABLE quarantine_data (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,  -- "match", "odds", "player", ...
  entity_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  data JSONB NOT NULL,
  data_quality_score NUMERIC,
  issues JSONB NOT NULL,
  quarantined_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT FALSE,
  resolution TEXT,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_quarantine_type ON quarantine_data(entity_type);
CREATE INDEX idx_quarantine_reviewed ON quarantine_data(reviewed);
```

---

### 3.3 Quarantine Workflow

```javascript
async function quarantineIfNeeded(match, dataQuality) {
  if (dataQuality.overall_score < 40) {
    await db.query(`
      INSERT INTO quarantine_data (
        id, entity_type, entity_id, reason, data, data_quality_score, issues
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      generateUUID(),
      'match',
      match.match_id,
      'poor data quality',
      JSON.stringify(match),
      dataQuality.overall_score,
      JSON.stringify({
        completeness: dataQuality.completeness,
        outliers: dataQuality.outliers,
        consistency_issues: dataQuality.consistency_issues
      })
    ]);
    
    return { quarantined: true };
  }
  
  return { quarantined: false };
}
```

---

### 3.4 Review & Resolution

```javascript
async function reviewQuarantined(id, resolution) {
  await db.query(`
    UPDATE quarantine_data SET
      reviewed = TRUE,
      resolution = $1,
      resolved_at = NOW()
    WHERE id = $2
  `, [resolution, id]);
}
```

**Resolution options**:
- `"fixed"` → data corretti, re-ingest
- `"ignored"` → falso positivo, release
- `"deleted"` → data invalidi, scarta

---

## 4️⃣ LOGGING & METRICS

### 4.1 Structured Logging

**Formato standard** (JSON):
```json
{
  "timestamp": "2025-12-25T14:55:00Z",
  "level": "INFO",
  "module": "featureEngine",
  "message": "computed features",
  "context": {
    "match_id": "abc123",
    "feature_version": "v1.2.0",
    "duration_ms": 45,
    "data_quality_score": 87
  }
}
```

---

### 4.2 Log Levels

```javascript
const LOG_LEVELS = {
  DEBUG: 0,   // verbose, development only
  INFO: 1,    // informational, normal operation
  WARN: 2,    // warning, degraded quality or performance
  ERROR: 3,   // error, operation failed
  FATAL: 4    // fatal, system crash
};
```

---

### 4.3 Logger Implementation (Simple)

```javascript
// backend/utils/logger.js

class Logger {
  constructor(module) {
    this.module = module;
  }
  
  log(level, message, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      context
    };
    
    console.log(JSON.stringify(entry));
    
    // TODO: send to logging service (CloudWatch, Datadog, etc.)
  }
  
  info(message, context) { this.log('INFO', message, context); }
  warn(message, context) { this.log('WARN', message, context); }
  error(message, context) { this.log('ERROR', message, context); }
  debug(message, context) { this.log('DEBUG', message, context); }
}

module.exports = Logger;
```

**Usage**:
```javascript
const Logger = require('./utils/logger');
const logger = new Logger('featureEngine');

logger.info('computing features', { match_id: 'abc123' });
logger.warn('odds stale', { match_id: 'abc123', age_sec: 120 });
```

---

### 4.4 Metrics to Track

**System-level**:
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (%)
- CPU/memory usage

**Domain-level**:
- Data quality score distribution
- Quarantine rate (%)
- Odds staleness (p95)
- Live latency (p95)
- Feature computation time (p95)
- Strategy evaluation time (p95)

**Business-level**:
- Active matches count
- Strategies READY count
- Bet decisions count
- Total exposure

---

## 5️⃣ ALERTS

### 5.1 Alert Triggers

**Critical**:
- System crash
- DB connection lost
- Feature computation error rate > 10%
- Odds staleness > 5 min (for live match)

**Warning**:
- Data quality score < 60 for > 10 matches
- Quarantine rate > 5%
- Response time p95 > 2s
- Live latency > 60s

**Info**:
- New match ingested
- Bet decision logged

---

### 5.2 Alert Channels

**Options**:
1. Email
2. Slack/Discord webhook
3. SMS (critical only)
4. Dashboard (UI)

---

### 5.3 Alert Implementation (Simple)

```javascript
// backend/utils/alerter.js

async function sendAlert(level, message, context) {
  const alert = {
    level,
    message,
    context,
    timestamp: new Date().toISOString()
  };
  
  // Log
  console.error(`[ALERT ${level}]`, message, context);
  
  // TODO: send to alert service
  if (level === 'CRITICAL') {
    // await sendSMS(...);
  }
  
  // Store in DB for dashboard
  await db.query(`
    INSERT INTO alerts (level, message, context, timestamp)
    VALUES ($1, $2, $3, $4)
  `, [level, message, JSON.stringify(context), new Date()]);
}

module.exports = { sendAlert };
```

---

## 6️⃣ INTEGRAZIONE CON MATCHBUNDLE

### 6.1 DataQuality Block nel Bundle

```typescript
interface MatchBundle {
  header: { /* ... */ };
  tabs: { /* ... */ };
  meta: {
    // ... existing fields
    data_quality: MatchDataQuality;  // ← add this
  };
}
```

---

### 6.2 Esempio

```json
{
  "header": { "..." },
  "tabs": { "..." },
  "meta": {
    "generated_at": "2025-12-25T14:55:00Z",
    "as_of_time": "2025-12-25T14:55:00Z",
    "versions": { "..." },
    "data_quality": {
      "match_id": "abc123",
      "timestamp": "2025-12-25T14:55:00Z",
      "completeness": {
        "header": 1.0,
        "statistics": 0.95,
        "odds": 0.90,
        "live": 1.0
      },
      "staleness": {
        "odds": {
          "age_sec": 45,
          "is_stale": false
        },
        "live": {
          "age_sec": 12,
          "is_stale": false
        }
      },
      "outliers": {
        "count": 0,
        "fields": []
      },
      "consistency_issues": [],
      "overall_score": 92
    }
  }
}
```

---

### 6.3 FE Usage

```jsx
// src/components/match/DataQualityBadge.jsx

function DataQualityBadge({ bundle }) {
  const { data_quality } = bundle.meta;
  const level = getQualityLevel(data_quality.overall_score);
  
  const colors = {
    EXCELLENT: 'green',
    GOOD: 'blue',
    ACCEPTABLE: 'yellow',
    POOR: 'orange',
    UNUSABLE: 'red'
  };
  
  return (
    <div className={`badge badge-${colors[level]}`}>
      Data Quality: {data_quality.overall_score}% ({level})
    </div>
  );
}
```

---

## 7️⃣ CONCEPT CHECKS INTEGRATION

### 7.1 Checks Esistenti

Vedi [FILOSOFIA_CONCEPT_CHECKS](../../00_foundation/FILOSOFIA_CONCEPT_CHECKS.md):
- TEMPORAL_ASOF
- NO_FUTURE_DATA
- CANONICAL_IDS_REQUIRED
- MATCHBUNDLE_META_REQUIRED
- ODDS_STALENESS_WARNING

---

### 7.2 Nuovi Checks Proposti

**DATA_QUALITY_THRESHOLD**:
```text
bundle.meta.data_quality.overall_score >= 60
```

**NO_QUARANTINED_DATA**:
```text
Match non deve essere in quarantine se usato per decisioni.
```

**OUTLIER_FREE**:
```text
bundle.meta.data_quality.outliers.count === 0
```

---

### 7.3 Integration

```javascript
// scripts/runConceptChecks.js

function checkDataQuality(bundle) {
  const dq = bundle.meta.data_quality;
  
  if (!dq) {
    return { error: 'missing data_quality in meta' };
  }
  
  if (dq.overall_score < 60) {
    return { warning: `data quality too low: ${dq.overall_score}` };
  }
  
  if (dq.outliers.count > 0) {
    return { warning: `outliers detected: ${dq.outliers.fields.join(', ')}` };
  }
  
  if (dq.staleness.odds.is_stale) {
    return { warning: 'odds are stale' };
  }
  
  return { ok: true };
}
```

---

## 8️⃣ MONITORING DASHBOARD (OPZIONALE)

### 8.1 Metrics to Display

- Active matches count
- Data quality distribution (histogram)
- Quarantine rate (%)
- Odds staleness (time series)
- Live latency (time series)
- Error rate (%)
- Strategy READY count
- Total exposure

---

### 8.2 Tools

**Options**:
1. Grafana + Prometheus (standard)
2. CloudWatch (AWS)
3. Datadog (SaaS)
4. Custom React dashboard (simple)

---

## 9️⃣ DRIFT DETECTION (AVANZATO)

### 9.1 Definizione

**Drift**: distribuzione dati cambia nel tempo.

**Esempio**:
- Feature `volatility` normalmente 0.2-0.6
- Improvvisamente 80% match hanno volatility > 0.8
- → Possibile bug o cambio dati SofaScore

---

### 9.2 Detection (Simple)

```javascript
async function detectDrift(feature_name, window_days = 7) {
  // 1. Get historical distribution
  const historical = await db.query(`
    SELECT AVG(features->>'${feature_name}') as mean,
           STDDEV(features->>'${feature_name}') as stddev
    FROM match_card_snapshot
    WHERE generated_at >= NOW() - INTERVAL '${window_days} days'
  `);
  
  // 2. Get recent distribution (last hour)
  const recent = await db.query(`
    SELECT AVG(features->>'${feature_name}') as mean
    FROM match_card_snapshot
    WHERE generated_at >= NOW() - INTERVAL '1 hour'
  `);
  
  // 3. Compare
  const z_score = Math.abs((recent.mean - historical.mean) / historical.stddev);
  
  if (z_score > 3) {
    await sendAlert('WARNING', 'drift detected', {
      feature: feature_name,
      z_score,
      historical_mean: historical.mean,
      recent_mean: recent.mean
    });
  }
}
```

---

## 🔟 ESEMPI PRATICI

### Esempio 1: Data Quality Check in matchCardService

```javascript
// backend/services/matchCardService.js

async function buildMatchBundle(match_id, options = {}) {
  const match = await matchRepository.getMatchById(match_id);
  const odds = await oddsRepository.getOdds(match_id);
  const stats = await statsRepository.getStats(match_id);
  
  // 1. Check data quality
  const dataQuality = await dataQualityChecker.check({
    match,
    odds,
    stats
  });
  
  // 2. Quarantine if needed
  const quarantineResult = await quarantineIfNeeded(match, dataQuality);
  if (quarantineResult.quarantined) {
    throw new Error(`Match ${match_id} quarantined due to poor data quality`);
  }
  
  // 3. Build bundle with DQ
  const bundle = {
    header: buildHeader(match),
    tabs: buildTabs({ match, odds, stats }),
    meta: {
      generated_at: new Date(),
      as_of_time: options.as_of_time || new Date(),
      versions: { /* ... */ },
      data_quality: dataQuality  // ← include
    }
  };
  
  return bundle;
}
```

---

### Esempio 2: Logger Usage in featureEngine

```javascript
// backend/utils/featureEngine.js

const Logger = require('./logger');
const logger = new Logger('featureEngine');

function computeFeatures(data, options) {
  const start = Date.now();
  
  logger.info('computing features', { 
    match_id: data.match.match_id,
    as_of_time: options.as_of_time 
  });
  
  try {
    const features = {
      volatility: calculateVolatility(data.powerRankings),
      pressure: calculatePressure(data.score),
      // ...
    };
    
    const duration = Date.now() - start;
    
    logger.info('features computed', {
      match_id: data.match.match_id,
      duration_ms: duration,
      feature_count: Object.keys(features).length
    });
    
    return features;
    
  } catch (error) {
    logger.error('feature computation failed', {
      match_id: data.match.match_id,
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
}
```

---

### Esempio 3: Alert on Stale Odds

```javascript
// backend/liveManager.js

const { sendAlert } = require('./utils/alerter');

async function checkOddsFreshness(match_id) {
  const odds = await oddsRepository.getLatestOdds(match_id);
  
  if (!odds) {
    await sendAlert('WARNING', 'no odds available', { match_id });
    return;
  }
  
  const age_ms = Date.now() - odds.ingestion_time;
  const age_sec = age_ms / 1000;
  
  if (age_sec > 300) {  // 5 min
    await sendAlert('WARNING', 'odds stale', {
      match_id,
      age_sec,
      last_update: odds.ingestion_time
    });
  }
}
```

---

## 1️⃣1️⃣ REGOLA FINALE

> **Puoi avere il miglior modello del mondo,  
> ma se i dati sono sporchi → output inutile.**

**Data quality = fondamenta di tutto.**

Senza observability:
- Non sai quando i dati sono corrotti
- Non puoi debuggare decisioni sbagliate
- Non puoi migliorare il sistema

**Monitoring + Logging + Alerting = sistema production-ready.**

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [RISK_BANKROLL](../../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) | [📚 INDEX](../../INDEX_FILOSOFIE.md) | [CONCEPT_CHECKS](../../00_foundation/FILOSOFIA_CONCEPT_CHECKS.md) |

---

**Fine documento – FILOSOFIA_OBSERVABILITY_DATAQUALITY**
