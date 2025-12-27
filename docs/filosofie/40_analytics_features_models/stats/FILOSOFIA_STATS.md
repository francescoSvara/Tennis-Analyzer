# 📊 FILOSOFIA STATS & STRATEGY ENGINE  
## Versione V3 – Feature → Signal Architecture

> **Dominio**: Stats · Feature Engineering · Strategy Engine  
> **Stato**: ATTIVA  
> **Sostituisce**: `FILOSOFIA_STATS_V2.md` (DEPRECATA)  
> **Ultimo aggiornamento**: Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|----------------|
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | [DB](../../10_data_platform/storage/FILOSOFIA_DB.md), [ODDS](../../30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md), [LIVE](../../20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md), [HPI](../../specs/HPI_RESILIENCE.md) | [FRONTEND_DATA](../../70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md), [RISK_BANKROLL](../../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) |

### 📚 Documenti Correlati
| Documento | Relazione |
|-----------|-----------|
| [CALCOLI](../calcoli/FILOSOFIA_CALCOLI.md) | Tassonomia features, standard input/output, fallback |
| [TEMPORAL](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) | `as_of_time` per feature calculation |
| [OBSERVABILITY](../../10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Feature quality metrics, outlier detection |
| [RISK_BANKROLL](../../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) | Consuma features per edge calculation |

### 📁 File Codice Principali
| File | Descrizione | Linee chiave |
|------|-------------|---------------|
| [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) | Feature Engine - calcoli | L44-674 |
| [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js) | Strategy Engine - segnali | L39-443 |
| [`backend/utils/pressureCalculator.js`](../../backend/utils/pressureCalculator.js) | Calcolo pressure index | - |
| [`backend/server.js`](../../backend/server.js) | Bundle endpoint | L2920-3374 |

---

## 0️⃣ CAMBIO DI PARADIGMA (IMPORTANTE)

La V2 separava:
- dati puri
- dati derivati
- dati dinamici

Questo rimane corretto **concettualmente**, ma **non è più il centro del sistema**.

### 🔄 Nuovo centro: **la decisione operativa**

> Il sistema non esiste per calcolare metriche.  
> Esiste per **produrre segnali affidabili**.

Le metriche sono **mezzi**, non obiettivi.

---

## 1️⃣ OBIETTIVO DEL DOCUMENTO

Questo documento definisce:
- come i dati vengono **trasformati in feature**
- come le feature diventano **segnali di strategia**
- dove vivono i calcoli (backend only)
- cosa è persistibile e cosa no

❌ NON descrive scraping  
❌ NON descrive frontend  
❌ NON descrive UI

---

## 2️⃣ ARCHITETTURA AD ALBERO (NUOVA)

```
RAW DATA
(matches, stats, pbp, odds)
      │
      ▼
FEATURE ENGINE
(volatility, pressure, dominance, context)
      │
      ▼
STRATEGY ENGINE
(LayWinner, BancaServizio, SuperBreak, ...)
      │
      ▼
SIGNALS
(READY / WATCH / OFF + action)
```

👉 **Tutto questo avviene nel backend**  
👉 Il frontend consuma solo il risultato

---

## 3️⃣ CLASSI DI DATI (SEMPLIFICATE)

### 🧱 RAW DATA
- dati canonici DB
- nessuna interpretazione
- persistiti

Esempi:
- match_statistics_new
- match_point_by_point_new
- match_odds
- player_stats

---

### 🧩 FEATURES (NUCLEO DEL SISTEMA)

Le **features** sono:
- funzioni pure
- deterministicamente calcolabili
- contestuali (player / match / combined)

Esempi:
- volatility
- elasticity
- pressureIndex
- serveDominance
- breakProbability
- comebackContext

✔ Possono essere persistite **solo se utili storicamente**  
✔ Altrimenti sono runtime

---

### 🚦 SIGNALS (OUTPUT FINALI)

I **signals** sono:
- discreti
- orientati all’azione
- temporanei

Esempi:
- Strategy READY
- Strategy WATCH
- Strategy OFF
- Suggested BACK / LAY

❌ NON sono metriche  
❌ NON sono persistibili come verità storica

---

## 4️⃣ LIVELLI DI ANALISI (INVARIATI)

### 🧑 Player-Level
Contesto storico del giocatore.
Usato come **prior**.

Esempi:
- win rate superficie
- comeback rate
- ROI storico

---

### 🎾 Match-Level
Stato corrente del match.
Usato come **likelihood**.

Esempi:
- pressure
- momentum
- volatility
- dominance

---

### 🔗 Combined-Level
Player + Match.
Qui nascono le strategie.

Esempio:
> “Giocatore storicamente resiliente + pressione live alta sull’avversario”

---

## 5️⃣ FEATURE ENGINE (REGOLE)

> 📚 **Dettaglio completo**: Vedi [FILOSOFIA_CALCOLI](../calcoli/FILOSOFIA_CALCOLI.md) per tassonomia, standard, fallback e schede feature operative.

Ogni feature DEVE dichiarare:

```md
Nome feature
Livello: Player | Match | Combined
Tipo: Static | Dynamic
Input richiesti
Output
Usata da: (strategie / predictor)
Persistenza: SI / NO
```

Esempio:

```md
PressureIndex
Livello: Match
Tipo: Dynamic
Input: point-by-point, score, server
Output: 0..1
Usata da: BancaServizio, Predictor
Persistenza: NO
```

Feature senza questa scheda sono **architetturalmente incomplete**.

> ⚠️ Per schede complete con fallback chain, edge cases e test fixtures → [FILOSOFIA_CALCOLI](../calcoli/FILOSOFIA_CALCOLI.md)

---

## 6️⃣ STRATEGY ENGINE (NUOVO DOMINIO)

Le strategie:
- **non leggono raw data**
- **non parlano con il DB**
- consumano solo feature

### Interfaccia standard

```ts
StrategySignal {
  id
  status: READY | WATCH | OFF
  confidence: number
  action?: BACK | LAY
  targetPlayerId?
  reasons: string[]
  entry
  exit
}
```

Ogni strategia:
- dichiara le feature richieste
- esplicita le condizioni
- produce un segnale unico

---

## 7️⃣ COSA NON È PIÙ CONSENTITO

❌ strategie nel frontend  
❌ feature calcolate nel frontend  
❌ fallback logici nel frontend  
❌ segnali derivati dalla UI  

Il frontend **non deduce**, visualizza.

---

## 8️⃣ PERSISTENZA (RIDOTTA E CONSAPEVOLE)

Persistiamo solo:
- raw data
- feature storiche utili (player stats)
- snapshot MatchBundle
- journal / trade log

NON persistiamo:
- pressure live
- dominance live
- segnali READY/WATCH

---

## 9️⃣ RELAZIONE CON MATCH BUNDLE

Il MatchBundle contiene:
- feature calcolate (quando servono alla UI)
- segnali finali delle strategie
- mai raw data inutili

Il bundle è:
- l’unica interfaccia FE ← BE
- il punto di integrazione di tutto il sistema

---

## 🔟 BENEFICI DELLA V3

- 🧠 architettura orientata alla decisione
- 🎯 strategie spiegabili
- 🔁 meno duplicazioni
- ⚡ performance migliori
- 🚀 aggiungere una strategia è semplice

---

## 1️⃣1️⃣ REGOLA FINALE

Se una funzione:
- non sai se è feature o strategia
- non sai se è persistibile
- non sai chi la consuma

➡️ **non scriverla**.

Prima si chiarisce l’architettura, poi il codice.

---
## 1️⃣2️⃣ IMPLEMENTAZIONE CORRENTE (24 Dicembre 2025)

### ⚠️ PRINCIPIO CHIAVE: CALCOLARE SEMPRE

> **"Mostrare dati" = CALCOLARE dati**

Quando una dashboard mostra metriche, il backend DEVE calcolarle.  
Non esistono "dati mancanti" - ogni match ha almeno: score, odds, rankings.

### Feature Engine
**File**: [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js)

#### Funzioni Primarie (dati completi)
| Feature | Funzione | Linea | Input | Output |
|---------|----------|-------|-------|--------|
| volatility | [`calculateVolatility()`](../../backend/utils/featureEngine.js#L92) | L92 | powerRankings, score, odds | 0..100 |
| dominance | [`calculateDominance()`](../../backend/utils/featureEngine.js#L191) | L191 | powerRankings, statistics | 0..100 |
| serveDominance | [`calculateServeDominance()`](../../backend/utils/featureEngine.js#L277) | L277 | statistics, serving | 0..100 |
| returnDominance | [`calculateServeDominance()`](../../backend/utils/featureEngine.js#L277) | L277 | statistics, serving | 0..100 |
| breakProbability | [`calculateBreakProbability()`](../../backend/utils/featureEngine.js#L331) | L331 | statistics, server, gameScore | 0..100 |
| pressure | via `pressureCalculator` | - | statistics | 0..100 |
| momentum | [`calculateRecentMomentum()`](../../backend/utils/featureEngine.js#L540) | L540 | powerRankings | { trend, swing, avg, breaks } |

#### Funzioni Fallback (dati parziali)
| Feature | Funzione Fallback | Linea | Input Minimo |
|---------|-------------------|-------|---------------|
| volatility | [`calculateVolatilityFromScore()`](../../backend/utils/featureEngine.js#L126) | L126 | score.sets[] |
| dominance | [`calculateDominanceFromScore()`](../../backend/utils/featureEngine.js#L476) | L476 | score.sets[] |
| dominance | [`calculateDominanceFromOdds()`](../../backend/utils/featureEngine.js#L507) | L507 | odds.matchWinner |
| serveDominance | [`calculateServeDominanceFromRankings()`](../../backend/utils/featureEngine.js#L573) | L573 | player1.ranking, player2.ranking |
| breakProbability | [`calculateBreakProbabilityFromOddsRankings()`](../../backend/utils/featureEngine.js#L598) | L598 | odds, rankings |
| pressure | [`calculatePressureFromScore()`](../../backend/utils/featureEngine.js#L643) | L643 | score.sets[] |
| momentum | [`calculateMomentumFromScore()`](../../backend/utils/featureEngine.js#L674) | L674 | score.sets[] |

#### Gerarchia di Calcolo in `computeFeatures()`
```
Per ogni feature:
1. Se ho powerRankings → usa funzione primaria
2. Altrimenti se ho statistics → usa da statistics
3. Altrimenti se ho score → calcola da score
4. Altrimenti se ho odds → calcola da odds
5. Altrimenti se ho rankings → stima da rankings
6. MAI ritornare null/undefined
```

### Strategy Engine
**File**: [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js)

| Strategia | Funzione | Linea | Status Conditions |
|-----------|----------|-------|-------------------|
| **LayWinner** | [`evaluateLayWinner()`](../../backend/strategies/strategyEngine.js#L63) | L63 | volatility > 60 + dominance > 70 → READY |
| **BancaServizio** | [`evaluateBancaServizio()`](../../backend/strategies/strategyEngine.js#L148) | L148 | breakProb > 35 + pressure > 50 → READY |
| **SuperBreak** | [`evaluateSuperBreak()`](../../backend/strategies/strategyEngine.js#L222) | L222 | volatility > 70 + breakProb > 40 + pressure > 60 → READY |
| **TiebreakSpecialist** | [`evaluateTiebreakSpecialist()`](../../backend/strategies/strategyEngine.js#L307) | L307 | tiebreak detected + volatility > 50 → READY |
| **MomentumSwing** | [`evaluateMomentumSwing()`](../../backend/strategies/strategyEngine.js#L378) | L378 | momentum shift + volatile + close score → READY |

### Bundle Endpoint
**File**: [`backend/server.js`](../../backend/server.js) (L3220-3430)

```
GET /api/match/:eventId/bundle
├── 1. Load raw data (matchData, statistics, momentum, odds, points)
├── 2. Compute features via featureEngine.computeFeatures()
│   └── Passa: powerRankings, statistics, score, odds, player1, player2
├── 3. Evaluate strategies via strategyEngine.evaluateAll()
├── 4. Build tabs data
├── 5. Calculate dataQuality
└── 6. Return unified bundle con features SEMPRE valorizzate
```

---

## 1️⃣3️⃣ FEATURE → FRONTEND MAPPING (24/12/2025)

### header.features (esposto a tutti i tab)
```js
header.features = {
  volatility: features.volatility,          // 0-100, SEMPRE calcolato
  pressure: features.pressure,              // 0-100, SEMPRE calcolato
  dominance: features.dominance,            // 0-100, SEMPRE calcolato
  serveDominance: features.serveDominance,  // 0-100, SEMPRE calcolato
  returnDominance: features.returnDominance,// 0-100, SEMPRE calcolato
  breakProbability: features.breakProbability, // 0-100, SEMPRE calcolato
  momentum: features.momentum,              // { trend, recentSwing, last5avg, breakCount }
  dataSource: features.dataSource           // 'live' | 'statistics' | 'score' | 'estimated'
}
```

### Mapping Feature → Tab

| Feature | Tab che la consuma | Componente UI |
|---------|-------------------|---------------|
| volatility | OverviewTab, PredictorTab | QuickSignals, PredictionDrivers |
| pressure | OverviewTab, StrategiesTab | QuickSignals, ConditionItem |
| dominance | OverviewTab, StrategiesTab | QuickSignals, ConditionItem |
| serveDominance | OverviewTab, MomentumTab | QuickSignals, ServeDominance meter |
| returnDominance | OverviewTab, MomentumTab | QuickSignals, Return Analysis |
| breakProbability | OverviewTab, PredictorTab | QuickSignals, BreakProbability gauge |
| momentum.trend | OverviewTab, MomentumTab | MiniMomentum, TrendIndicator |
| dataSource | OverviewTab | Indicatore qualità dati |

---

## 1️⃣4️⃣ NO FUTURE LEAKAGE (TEMPORAL INTEGRITY)

> **Vedi**: [FILOSOFIA_TEMPORAL.md](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md)

### 14.1 Principio Anti-Leakage

**Regola fondamentale**:
```text
Nessuna feature può usare dati con event_time > as_of_time.
```

**Rationale**: se usi dati futuri → edge finto, modello inutile.

---

### 14.2 Implementation in featureEngine

```javascript
// backend/utils/featureEngine.js

function computeFeatures(data, options) {
  const { as_of_time } = options;  // ← parametro obbligatorio
  
  // Filter all data by as_of_time
  const validOdds = data.odds.filter(o => o.event_time <= as_of_time);
  const validLiveSnaps = data.liveSnaps?.filter(s => s.event_time <= as_of_time);
  
  // Compute features using only valid data
  const features = {
    volatility: calculateVolatility(data.powerRankings, as_of_time),
    pressure: calculatePressure(data.score, as_of_time),
    // ...
  };
  
  return {
    match_id: data.match.match_id,
    as_of_time,                    // ← include in output
    feature_version: VERSION,
    features,
    computed_at: new Date()
  };
}
```

---

### 14.3 Concept Check Integration

**Check**: `NO_FUTURE_DATA`

```javascript
function checkNoFutureData(bundle, rawData) {
  const { meta } = bundle;
  const futureOdds = rawData.odds.filter(o => o.event_time > meta.as_of_time);
  const futureSnaps = rawData.liveSnaps?.filter(s => s.event_time > meta.as_of_time);
  
  if (futureOdds.length > 0 || futureSnaps.length > 0) {
    return { error: 'future data detected', details: { futureOdds, futureSnaps } };
  }
  
  return { ok: true };
}
```

---

## 1️⃣5️⃣ FEATURE SNAPSHOT AS-OF

> **Vedi**: [FILOSOFIA_TEMPORAL.md](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md), [FILOSOFIA_LINEAGE_VERSIONING.md](../../10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md)

### 15.1 FeatureSnapshot Contract

```typescript
interface FeatureSnapshot {
  match_id: string;
  as_of_time: Date;         // cut temporale (TEMPORAL)
  feature_version: string;  // versioning (LINEAGE)
  features: {
    volatility: number;
    pressure: number;
    dominance: number;
    // ...
  };
  computed_at: Date;        // ingestion_time
  data_sources: {
    had_power_rankings: boolean;
    had_statistics: boolean;
    had_odds: boolean;
    had_live_snapshots: boolean;
  };
}
```

---

### 15.2 Uso

**Pre-match snapshot**:
```javascript
const as_of_time = new Date(match.event_time.getTime() - 5 * 60000);  // -5 min
const preMatchFeatures = await featureEngine.computeFeatures({
  match,
  odds,
  stats,
  as_of_time
});
```

**Live snapshot**:
```javascript
const as_of_time = new Date();  // now
const liveFeatures = await featureEngine.computeFeatures({
  match,
  odds,
  stats,
  liveSnaps,
  as_of_time
});
```

---

### 15.3 Storage (Opzionale)

Non è obbligatorio persistere feature snapshots, ma **se lo fai**:

```sql
CREATE TABLE feature_snapshots (
  match_id TEXT NOT NULL,
  as_of_time TIMESTAMPTZ NOT NULL,
  feature_version TEXT NOT NULL,
  features JSONB NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_id, as_of_time)
);

CREATE INDEX idx_features_match ON feature_snapshots(match_id);
CREATE INDEX idx_features_time ON feature_snapshots(as_of_time);
```

**Uso**: backtest, audit, riproducibilità.

---

## 1️⃣6️⃣ REASON CODES OUTPUT

> **Vedi**: [FILOSOFIA_RISK_BANKROLL.md](../../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md)

### 16.1 Perché Reason Codes?

**Problema**: Strategy dice READY, ma perché?

**Soluzione**: ogni strategy output include `reason` code.

---

### 16.2 Standard Reason Codes

```typescript
type ReasonCode = 
  | "high_pressure_favorite"       // Favorite sotto pressione
  | "weak_server_vulnerable"       // Servizio debole
  | "momentum_shift_detected"      // Cambio momentum
  | "volatile_match_conditions"    // Match volatile
  | "tiebreak_specialist_edge"     // Vantaggio tiebreak
  | "break_point_resilience"       // Resilienza break point
  | "comeback_pattern"             // Pattern rimonta
  | "closing_odds_value"           // Value su closing line
  | "low_confidence_opponent";     // Avversario bassa confidence
```

---

### 16.3 Strategy Output

```typescript
interface StrategySignal {
  id: string;               // "LayWinner", "BancaServizio", ...
  status: "READY" | "WATCH" | "OFF";
  action?: "BACK" | "LAY";
  selection?: "home" | "away";
  confidence: number;       // 0-1
  reason: ReasonCode;       // ← obbligatorio se READY
  conditions: {
    [key: string]: {
      value: number;
      threshold: number;
      met: boolean;
    };
  };
}
```

---

### 16.4 Esempio Implementation

```javascript
// backend/strategies/strategyEngine.js

function evaluateLayWinner(features) {
  const conditions = {
    pressure: { value: features.pressure, threshold: 60, met: features.pressure > 60 },
    volatility: { value: features.volatility, threshold: 50, met: features.volatility > 50 },
    dominance: { value: features.dominance, threshold: 40, met: features.dominance < 40 }
  };
  
  const allMet = Object.values(conditions).every(c => c.met);
  
  return {
    id: 'LayWinner',
    status: allMet ? 'READY' : 'WATCH',
    action: 'LAY',
    selection: features.dominance < 50 ? 'home' : 'away',
    confidence: allMet ? 0.85 : 0.50,
    reason: allMet ? 'high_pressure_favorite' : null,  // ← reason code
    conditions
  };
}
```

---

### 16.5 FE Display

```jsx
function StrategyCard({ strategy }) {
  const reasonLabels = {
    high_pressure_favorite: "Favorito sotto pressione",
    weak_server_vulnerable: "Servizio vulnerabile",
    // ...
  };
  
  return (
    <div className={`strategy-card status-${strategy.status}`}>
      <h3>{strategy.id}</h3>
      <StatusBadge status={strategy.status} />
      {strategy.reason && (
        <p className="reason">
          {reasonLabels[strategy.reason]}
        </p>
      )}
    </div>
  );
}
```

---

## 1️⃣7️⃣ EDGE CALCULATION VS MARKET

> **Vedi**: [FILOSOFIA_ODDS](../../30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md), [FILOSOFIA_RISK_BANKROLL](../../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md)

### 17.1 Chi Calcola l'Edge?

**Separazione responsabilità**:

- **STATS (featureEngine)**: calcola features
- **ODDS**: fornisce market odds + implied prob
- **Predictor** (futuro): calcola model probability
- **RISK (riskEngine)**: calcola edge = model_prob - implied_prob

**Regola**: `featureEngine` NON calcola edge.

---

### 17.2 Edge Calculation (Risk Layer)

```javascript
// backend/services/riskEngine.js

function calculateEdge(strategy, odds, predictor) {
  // 1. Get market odds
  const marketOdds = odds[strategy.selection];  // es. 1.85
  const impliedProb = 1 / marketOdds;           // 0.54
  
  // 2. Get model probability
  const modelProb = predictor.predictWinProb(strategy.selection);  // 0.60
  
  // 3. Calculate edge
  const edge = modelProb - impliedProb;  // 0.06 (6%)
  
  return {
    market_odds: marketOdds,
    implied_prob: impliedProb,
    model_prob: modelProb,
    edge,
    has_edge: edge > 0
  };
}
```

---

### 17.3 Integration con Strategy Signals

```javascript
// backend/services/matchCardService.js

async function buildMatchBundle(match_id) {
  // ... fetch data
  
  // 1. Compute features
  const features = await featureEngine.computeFeatures(data);
  
  // 2. Evaluate strategies
  const strategies = await strategyEngine.evaluateAll(features);
  
  // 3. Calculate edge for READY strategies
  const strategiesWithEdge = strategies
    .filter(s => s.status === 'READY')
    .map(s => ({
      ...s,
      edge: riskEngine.calculateEdge(s, odds, predictor)
    }));
  
  return {
    header: { /* ... */ },
    tabs: {
      strategies: strategiesWithEdge,
      // ...
    },
    meta: { /* ... */ }
  };
}
```

---

### 17.4 Output nel Bundle

```typescript
interface StrategyWithEdge extends StrategySignal {
  edge?: {
    market_odds: number;
    implied_prob: number;
    model_prob: number;
    edge: number;           // edge %
    has_edge: boolean;
  };
}
```

**NOTA**: edge è opzionale, presente solo se strategy = READY e predictor disponibile.

---

## 1️⃣8️⃣ INTEGRAZIONE FILOSOFIE CORRELATE

### 18.1 TEMPORAL

- `as_of_time` parametro obbligatorio per `computeFeatures()`
- Anti-leakage: filtrare odds/live con `event_time <= as_of_time`
- Feature snapshot include `as_of_time`

---

### 18.2 REGISTRY_CANON

- Features usano `player_id` canonico
- NON usano `player_name` (string)
- Player stats linkati tramite canonical ID

---

### 18.3 LINEAGE

- `feature_version` in output
- `strategy_version` in output
- Meta bundle include entrambe

---

### 18.4 OBSERVABILITY

- Feature computation errors → log
- Outlier detection (volatility > 100)
- Data quality score integrato

---

### 18.5 RISK_BANKROLL

- Strategy signals → risk engine
- Edge calculation separato
- Bet decisions con reason codes

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [DB](../../10_data_platform/storage/FILOSOFIA_DB.md) | [📚 INDEX](../../INDEX_FILOSOFIE.md) | [FRONTEND_DATA](../../70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) |

---
**Fine documento – FILOSOFIA_STATS**
