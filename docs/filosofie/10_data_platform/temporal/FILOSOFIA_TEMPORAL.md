# ⏰ FILOSOFIA TEMPORAL SEMANTICS  
## Versione V1 – Time as First-Class Rule

> **Dominio**: Time Semantics · Anti-Leakage · Temporal Correctness  
> **Stato**: ATTIVA  
> **Ultimo aggiornamento**: Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|----------------|
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | Tutte le fonti dati | [DB](../storage/FILOSOFIA_DB.md), [STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md), [ODDS](../../30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md), [LIVE](../../20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md) |

### 📚 Documenti Correlati (stesso layer)
| Documento | Relazione |
|-----------|-----------|
| [DB](../storage/FILOSOFIA_DB.md) | Applica time semantics a insert/query |
| [REGISTRY_CANON](../registry_canon/FILOSOFIA_REGISTRY_CANON.md) | Timestamps per entity resolution |
| [LINEAGE_VERSIONING](../lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) | `as_of_time` per reproducibility |
| [OBSERVABILITY](../quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Staleness/freshness metrics |

### 📁 File Codice Principali
| File | Descrizione | Responsabilità Temporale |
|------|-------------|--------------------------|
| [`backend/liveManager.js`](../../backend/liveManager.js) | Live tracking | `ingestion_time`, `event_time` per snapshot |
| [`backend/server.js`](../../backend/server.js) | API endpoints odds/live | Distinguere tick vs snapshot, timestamp |
| [`backend/services/matchCardService.js`](../../backend/services/matchCardService.js) | MatchBundle builder | Costruire bundle `as-of` coerente |
| [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) | Feature computation | Calcoli con `as_of_time` |
| [`src/hooks/useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx) | FE bundle consumer | Non inventa tempo; usa `meta` dal bundle |

---

## 0️⃣ PERCHÉ ESISTE (GAMBLER REASON)

> **Se sbagli i timestamps, produci edge finti.**

Nel betting:
- Odds e live sono **serie temporali**
- Ogni quota ha un `event_time` (quando è valida)
- Ogni feature deve essere **"as-of"** rispetto al match
- Usare dati futuri = **leakage fatale**

**Esempio distruttivo**:
```text
Match inizia alle 14:00.
Calcolo features alle 13:55 usando:
- Quota delle 14:05 (in-play)
- Score parziale del 1° set

Risultato: edge finto, modello inutile.
```

👉 **Il TEMPO è una regola, non un dettaglio**.

---

## 1️⃣ GLOSSARIO TEMPI (DEFINIZIONI RIGIDE)

Ogni evento nel sistema ha **almeno** un timestamp. Questi sono i tipi obbligatori:

### 1.1 `event_time`

**Definizione**: quando l'evento è **valido nel mondo reale**.

Esempi:
- Quota osservata alle 14:03 → `event_time = 14:03`
- Punto giocato alle 14:10 → `event_time = 14:10`
- Match scheduled per le 15:00 → `event_time = 15:00`

✔ Usato per: anti-leakage, snapshot logici  
❌ NON è: quando l'hai ricevuto

---

### 1.2 `source_time`

**Definizione**: timestamp fornito dalla **fonte esterna** (se disponibile).

Esempi:
- SofaScore invia `lastUpdate: 1735134020` → `source_time`
- Book API ritorna `timestamp: "2025-12-25T14:03:00Z"` → `source_time`

✔ Usato per: audit, confronto con `ingestion_time`  
❌ NON sempre disponibile

---

### 1.3 `ingestion_time`

**Definizione**: quando il **nostro sistema** riceve/salva l'evento.

Esempi:
- Polling SofaScore → `ingestion_time = Date.now()`
- Insert DB → `ingestion_time = now()`

✔ Usato per: staleness check, freshness, debug  
⚠️ **CRITICAL**: `ingestion_time` ≠ `event_time`

**Regola d'oro**:
```javascript
// ❌ SBAGLIATO
const featureSnapshot = {
  volatility: 0.42,
  timestamp: Date.now()  // questo è ingestion_time!
}

// ✅ CORRETTO
const featureSnapshot = {
  volatility: 0.42,
  as_of_time: match.event_time,      // tempo logico
  computed_at: Date.now()             // tempo fisico
}
```

---

### 1.4 `as_of_time`

**Definizione**: timestamp di riferimento per **calcoli/snapshot** (il "cut" temporale).

È il tempo logico che risponde alla domanda:  
*"Quali dati sono conosciuti a questo momento?"*

Esempi:
- Feature snapshot pre-match → `as_of_time = match.event_time - 5 min`
- Feature snapshot live → `as_of_time = now()`
- Backtest → `as_of_time = historical_timestamp`

✔ Usato per: riproducibilità, anti-leakage, audit  
✔ È l'invariante fondamentale

**Regola fondamentale**:
```text
NESSUN DATO con event_time > as_of_time può essere usato.
```

---

## 2️⃣ TIPI DI DATI E SEMANTICA TEMPORALE

### 2.1 Match (Evento Discreto)

```javascript
{
  match_id: "...",
  event_time: "2025-12-25T15:00:00Z",  // scheduled start
  status: "scheduled" | "live" | "finished" | "retired" | "walkover"
}
```

**Semantica**:
- `event_time` = scheduled start (o actual start se diverso)
- `status` determina fase temporale
- Match finito → `event_time` fisso, `end_time` disponibile

---

### 2.2 Live Snapshots (Serie Temporale)

```javascript
{
  match_id: "...",
  event_time: "2025-12-25T15:23:45Z",  // quando è avvenuto il punto/game
  ingestion_time: "2025-12-25T15:23:47Z",  // quando l'abbiamo ricevuto
  snapshot: {
    score: { ... },
    serve: "home",
    ...
  }
}
```

**Semantica**:
- Ogni snapshot ha `event_time` + `ingestion_time`
- `event_time` ≈ tempo reale evento
- `ingestion_time` - `event_time` = **latency**

---

### 2.3 Odds Ticks (Serie Temporale)

```javascript
{
  match_id: "...",
  market: "match_winner",
  selection: "home",
  book_id: "bet365",
  price: 1.85,
  event_time: "2025-12-25T14:55:00Z",  // quando la quota era valida
  ingestion_time: "2025-12-25T14:55:02Z"  // quando l'abbiamo salvata
}
```

**Semantica**:
- Ogni tick è **valido a un istante**
- `event_time` determina **quando** la quota era disponibile
- Per closing line: max `event_time` < match start

---

### 2.4 Feature Snapshots (Derivati)

```javascript
{
  match_id: "...",
  as_of_time: "2025-12-25T14:55:00Z",  // cut temporale
  feature_version: "v1.2.0",
  features: {
    volatility: 0.42,
    pressure: 65,
    ...
  },
  computed_at: "2025-12-25T14:55:01Z"  // ingestion_time
}
```

**Semantica**:
- `as_of_time` = **quale conoscenza uso**
- `computed_at` = quando ho fatto il calcolo (per cache)
- Tutti i dati input hanno `event_time <= as_of_time`

---

## 3️⃣ REGOLE ANTI-LEAKAGE (INVARIANTI)

### 3.1 NO_FUTURE_DATA

```text
Nessun calcolo può usare dati con event_time > as_of_time.
```

**Implementazione**:
```javascript
// ❌ VIOLAZIONE
function computeFeatures(match, allData) {
  const futureOdds = allData.odds.filter(o => o.event_time > match.event_time);
  // ... usa futureOdds
}

// ✅ CORRETTO
function computeFeatures(match, allData, as_of_time) {
  const knownOdds = allData.odds.filter(o => o.event_time <= as_of_time);
  // ... usa knownOdds
}
```

**Concept Check**: `NO_FUTURE_DATA`

---

### 3.2 TEMPORAL_ASOF

```text
feature_snapshot.as_of_time <= match.event_time (pre-match)
feature_snapshot.as_of_time <= now() (live)
```

**Rationale**: non posso usare feature calcolate **dopo** il match è iniziato per predirlo.

**Implementazione**:
```javascript
// Pre-match
const as_of_time = match.event_time - (5 * 60 * 1000);  // 5 min before

// Live
const as_of_time = Date.now();
```

**Concept Check**: `TEMPORAL_ASOF`

---

### 3.3 ODDS_PHASE

```text
Pre-match odds NON possono includere ticks in-play (se non esplicitato).
```

**Definizioni**:
- **Pre-match odds**: `event_time < match.event_time`
- **In-play odds**: `event_time >= match.event_time` AND `match.status = "live"`

**Uso**:
```javascript
// Odds pre-match
const preMatchOdds = allOdds.filter(o => 
  o.event_time < match.event_time
);

// Closing line
const closingLine = preMatchOdds
  .sort((a, b) => b.event_time - a.event_time)[0];
```

---

### 3.4 CLOSING_LINE_DEFINITION

**Definizione rigida**:
```text
Closing Line = ultima quota con event_time < match.event_time
```

Varianti accettate:
- `event_time < match.event_time - 60s` (buffer di 1 min)
- `event_time < match.actual_start_time` (se diverso da scheduled)

**NON accettate**:
- Prima quota in-play (è già leakage)
- Media ultime N quote (introduce ambiguità)

**Pseudo-codice**:
```javascript
function getClosingLine(odds, match) {
  const cutoff = match.event_time - 60000;  // -1 min
  return odds
    .filter(o => o.event_time < cutoff)
    .sort((a, b) => b.event_time - a.event_time)[0];
}
```

---

## 4️⃣ CONTRATTI PRATICI (PSEUDO-CONTRATTI)

### 4.1 OddsTick

```typescript
interface OddsTick {
  match_id: string;
  market: MarketEnum;  // "match_winner", "set_winner", etc.
  selection: string;   // "home", "away", "over", etc.
  book_id: string;     // "bet365", "pinnacle", etc.
  price: number;       // decimal odds
  event_time: Date;    // quando la quota era valida
  ingestion_time: Date;  // quando l'abbiamo salvata
}
```

**Storage**: `match_odds_new` table

---

### 4.2 FeatureSnapshot

```typescript
interface FeatureSnapshot {
  match_id: string;
  as_of_time: Date;         // cut temporale
  feature_version: string;  // "v1.2.0"
  features: {
    volatility?: number;
    pressure?: number;
    dominance?: number;
    // ...
  };
  computed_at: Date;  // ingestion_time
  data_sources: {
    had_power_rankings: boolean;
    had_statistics: boolean;
    had_odds: boolean;
  };
}
```

**Storage**: opzionale (cache), non tabella dedicata

---

### 4.3 MatchBundle.meta (OBBLIGATORIO)

```typescript
interface MatchBundleMeta {
  generated_at: Date;        // quando il bundle è stato creato
  as_of_time: Date;          // cut temporale logico
  versions: {
    bundle_schema: string;
    data: string;
    features: string;
    odds: string;
    strategies: string;
  };
  data_freshness: {
    last_live_ingestion_time?: Date;  // se match live
    last_odds_ingestion_time?: Date;  // ultima odds tick ricevuta
  };
}
```

**Regola**: ogni `MatchBundle` DEVE avere `meta`.

👉 Vedi [FILOSOFIA_LINEAGE_VERSIONING](../lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md)

---

## 5️⃣ IMPATTI SU MODULI ESISTENTI

### 5.1 `backend/liveManager.js`

**Responsabilità**: produrre snapshot con timestamp corretti.

**TODO**:
- [ ] Ogni snapshot deve includere `event_time` + `ingestion_time`
- [ ] Usare `source_time` se disponibile da SofaScore
- [ ] Calcolare `latency = ingestion_time - event_time`
- [ ] Se latency > soglia → `dataQuality.staleness ↓`

---

### 5.2 `backend/server.js` (Odds Endpoints)

**Responsabilità**: distinguere tick vs snapshot.

**TODO**:
- [ ] GET `/api/match/:id/odds/ticks` → ritorna stream temporale
- [ ] GET `/api/match/:id/odds/snapshot` → ritorna odds "as-of"
- [ ] Includere `event_time` in ogni oggetto odds
- [ ] Filtrare ticks con `event_time <= as_of_time`

---

### 5.3 `backend/services/matchCardService.js`

**Responsabilità**: costruire bundle "as-of" coerente.

**TODO**:
- [ ] Accettare `as_of_time` come parametro (default = `now()`)
- [ ] Filtrare tutti i dati: `event_time <= as_of_time`
- [ ] Passare `as_of_time` al featureEngine
- [ ] Includere `meta.as_of_time` nel bundle

---

### 5.4 `backend/utils/featureEngine.js`

**Responsabilità**: calcolare feature con `as_of_time`.

**TODO**:
- [ ] Aggiungere parametro `as_of_time` a `computeFeatures()`
- [ ] Filtrare odds: `o.event_time <= as_of_time`
- [ ] Filtrare live snapshots: `s.event_time <= as_of_time`
- [ ] Ritornare `FeatureSnapshot` con `as_of_time`

---

### 5.5 `src/hooks/useMatchBundle.jsx`

**Responsabilità**: FE non inventa tempo; usa `meta`.

**TODO**:
- [ ] Leggere `bundle.meta.as_of_time`
- [ ] Mostrare warning se `data_freshness` vecchia
- [ ] NON calcolare timestamp lato FE
- [ ] Usare `meta.generated_at` per cache locale

---

## 6️⃣ TEST / CONCEPT CHECKS

### 6.1 TEMPORAL_ASOF

**Regola**:
```text
feature_snapshot.as_of_time <= match.event_time (pre-match)
feature_snapshot.as_of_time <= now() (live)
```

**Test**:
```javascript
function checkTemporalAsOf(bundle) {
  const { meta, header } = bundle;
  if (header.status === 'scheduled') {
    assert(meta.as_of_time <= header.event_time);
  } else if (header.status === 'live') {
    assert(meta.as_of_time <= Date.now());
  }
}
```

---

### 6.2 NO_FUTURE_DATA

**Regola**:
```text
Nessuna query/trasformazione usa righe con event_time > as_of_time.
```

**Test**:
```javascript
function checkNoFutureData(bundle, rawData) {
  const { meta } = bundle;
  const futureOdds = rawData.odds.filter(o => o.event_time > meta.as_of_time);
  const futureSnaps = rawData.liveSnaps.filter(s => s.event_time > meta.as_of_time);
  
  assert(futureOdds.length === 0);
  assert(futureSnaps.length === 0);
}
```

---

### 6.3 ODDS_STALENESS_WARNING

**Regola**:
```text
Se last_odds_ingestion_time troppo vecchio → warning.
```

**Soglie**:
- Pre-match: 10 min
- Live: 30 sec

**Test**:
```javascript
function checkOddsStaleness(bundle) {
  const { meta, header } = bundle;
  const now = Date.now();
  const lastOdds = meta.data_freshness?.last_odds_ingestion_time;
  
  if (!lastOdds) return { warning: 'No odds data' };
  
  const age = now - lastOdds;
  const threshold = header.status === 'live' ? 30000 : 600000;
  
  if (age > threshold) {
    return { warning: `Odds stale: ${age}ms old` };
  }
  return { ok: true };
}
```

---

## 7️⃣ ESEMPI PRATICI

### Esempio 1: Feature Snapshot Pre-Match

```javascript
const match = {
  match_id: "abc123",
  event_time: new Date("2025-12-25T15:00:00Z"),
  status: "scheduled"
};

const as_of_time = new Date(match.event_time.getTime() - 5 * 60000);  // -5 min

const features = computeFeatures({
  match,
  allOdds: rawOdds.filter(o => o.event_time <= as_of_time),
  allStats: rawStats,
  as_of_time
});

const snapshot = {
  match_id: match.match_id,
  as_of_time,
  feature_version: "v1.2.0",
  features,
  computed_at: new Date()
};
```

---

### Esempio 2: Closing Line

```javascript
function getClosingLine(match, allOdds) {
  const cutoff = new Date(match.event_time.getTime() - 60000);  // -1 min
  
  const preMatchOdds = allOdds.filter(o => 
    o.match_id === match.match_id &&
    o.market === 'match_winner' &&
    o.event_time < cutoff
  );
  
  if (preMatchOdds.length === 0) return null;
  
  // Ordina per event_time desc
  preMatchOdds.sort((a, b) => b.event_time - a.event_time);
  
  return {
    home: preMatchOdds.find(o => o.selection === 'home')?.price,
    away: preMatchOdds.find(o => o.selection === 'away')?.price,
    event_time: preMatchOdds[0].event_time
  };
}
```

---

### Esempio 3: Live Feature Update

```javascript
async function updateLiveFeatures(match_id) {
  const match = await getMatch(match_id);
  
  if (match.status !== 'live') return;
  
  const as_of_time = new Date();  // now
  
  const liveSnaps = await getLiveSnapshots(match_id, {
    where: { event_time: { lte: as_of_time } }
  });
  
  const features = computeFeatures({
    match,
    liveSnaps,
    as_of_time
  });
  
  return {
    match_id,
    as_of_time,
    features,
    computed_at: new Date()
  };
}
```

---

## 8️⃣ REGOLA FINALE

> **Il tempo è una dimensione, non un dettaglio.**

Ogni volta che scrivi:
- `Date.now()`
- `.timestamp`
- `.lastUpdate`

Chiediti:
- È `event_time` o `ingestion_time`?
- Serve un `as_of_time`?
- Posso creare leakage?

Se in dubbio → chiedi al DBA o al Quant.

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [DB](../storage/FILOSOFIA_DB.md) | [📚 INDEX](../../INDEX_FILOSOFIE.md) | [REGISTRY_CANON](../registry_canon/FILOSOFIA_REGISTRY_CANON.md) |

---

**Fine documento – FILOSOFIA_TEMPORAL**
