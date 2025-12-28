# 💰 FILOSOFIA RISK & BANKROLL MANAGEMENT  
## Versione V1 – Betting Decision Layer

> **Dominio**: Risk Management · Staking · Bankroll · Bet Decision  
> **Stato**: ATTIVA  
> **Ultimo aggiornamento**: Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|----------------|
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | [STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md), [ODDS](../../30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md) | [FRONTEND_DATA](../../70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md), JournalTab |

### 📚 Documenti Correlati
| Documento | Relazione |
|-----------|-----------|
| [STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md) | Fonte features per edge calculation |
| [ODDS](../../30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md) | Implied probability per edge |
| [TEMPORAL](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) | Timestamp bet decisions per audit |
| [LINEAGE_VERSIONING](../../10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) | Version bet decisions per reproducibility |
| [FRONTEND_DATA](../../70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) | Consumer di stake suggestions |

### 📁 File Codice Principali
| File | Descrizione | Responsabilità |
|------|-------------|----------------|
| [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js) | Strategy signals | Produce edge + confidence |
| [`backend/services/riskEngine.js`](../../backend/services/riskEngine.js) | Risk layer | Edge → stake suggestion |
| [`backend/services/bundleService.js`](../../backend/services/bundleService.js) | Bundle builder | Include risk output in bundle |
| [`backend/routes/match.routes.js`](../../backend/routes/match.routes.js) | Bundle route | `GET /:eventId/bundle` |
| [`backend/controllers/match.controller.js`](../../backend/controllers/match.controller.js) | Bundle controller | `getBundle()` |
| [`src/components/match/tabs/JournalTab.jsx`](../../src/components/match/tabs/JournalTab.jsx) | FE bet journal | Display bet decisions |

---

## 0️⃣ PERCHÉ ESISTE (GAMBLER REASON)

> **Avere edge non basta: devi scommettere correttamente.**

Problemi senza risk management:
- Strategy dice READY → scommetti quanto? 100€? 10€?
- Hai 3 match READY simultanei → scommetti su tutti? Exposure totale?
- Una strategia ha edge 5%, un'altra 2% → stake identico?
- Losing streak → continui flat? Kelly? Half-Kelly?

**Risultato senza regole**: edge corretto, bankroll bruciato.

**Questo documento**:
- Definisce layer decisionale betting
- Standard per stake suggestion
- Exposure control
- Logging decisioni (audit)

---

## 1️⃣ LAYER DECISIONALE BETTING

```
FEATURES (volatility, pressure, ...)
      │
      ▼
STRATEGY ENGINE (READY/WATCH/OFF)
      │
      ▼
RISK ENGINE ◄─── BANKROLL STATE
      │
      ▼
BET DECISION
{
  match_id,
  strategy,
  action: "BACK home" | "LAY away" | ...,
  edge: 0.05,           // 5% edge stimato
  price: 1.85,          // prezzo mercato
  price_min: 1.75,      // prezzo minimo accettabile
  stake_suggested: 50,  // stake Kelly frazionale
  confidence: 0.85,     // confidence strategia
  exposure_pct: 0.02    // % bankroll
}
```

**Regola**: Risk Engine converte segnali → decisioni esecutive.

---

## 2️⃣ COMPONENTI DEL LAYER RISK

### 2.1 Edge Calculation

**Input**:
- Market odds (implied probability)
- Model prediction (win probability)

**Output**:
- Edge % = `model_prob - implied_prob`

**Esempio**:
```javascript
const marketOdds = 1.85;  // home win
const impliedProb = 1 / marketOdds;  // 0.54 (54%)
const modelProb = 0.60;               // nostro modello: 60%

const edge = modelProb - impliedProb;  // 0.06 (6% edge)
```

**Regola**: edge < 0 → NO BET.

---

### 2.2 Price Minimum (Worst Acceptable Price)

**Definizione**: prezzo minimo per mantenere edge positivo.

**Formula**:
```javascript
const price_min = 1 / modelProb;
```

**Esempio**:
```javascript
const modelProb = 0.60;
const price_min = 1 / 0.60;  // 1.67

// Se mercato offre 1.85 → OK
// Se mercato offre 1.50 → NO BET (edge negativo)
```

**Uso**: alert se prezzo scende sotto `price_min` prima dell'esecuzione.

---

### 2.3 Stake Suggestion (Kelly Criterion)

**Full Kelly**:
```javascript
const f = (edge / (price - 1));
const stake = bankroll * f;
```

**Problema**: Full Kelly è aggressivo → rischio ruin.

**Soluzione**: Kelly Frazionale (1/4 Kelly o 1/2 Kelly).

```javascript
function calculateStake(edge, price, bankroll, kelly_fraction = 0.25) {
  if (edge <= 0) return 0;
  
  const f = edge / (price - 1);
  const stake = bankroll * f * kelly_fraction;
  
  return Math.max(0, Math.min(stake, bankroll * 0.05));  // cap 5% bankroll
}
```

**Esempio**:
```javascript
const edge = 0.06;         // 6%
const price = 1.85;
const bankroll = 10000;

const stake = calculateStake(edge, price, bankroll, 0.25);
// f = 0.06 / 0.85 = 0.0706
// stake = 10000 * 0.0706 * 0.25 = 176.5
// → bet €176
```

---

### 2.4 Exposure Control

**Definizione**: % bankroll totale a rischio simultaneamente.

**Regole**:
- Max exposure single match: 5% bankroll
- Max exposure totale: 20% bankroll
- Se 4 match READY simultanei → ridurre stake ciascuno

**Esempio**:
```javascript
function controlExposure(bets, bankroll) {
  const totalExposure = bets.reduce((sum, b) => sum + b.stake, 0);
  const exposurePct = totalExposure / bankroll;
  
  if (exposurePct > 0.20) {
    // Scale down
    const scaleFactor = 0.20 / exposurePct;
    bets.forEach(b => b.stake *= scaleFactor);
  }
  
  return bets;
}
```

---

### 2.5 Correlation Control (Avanzato)

**Problema**: se scommetti su 3 match dello stesso torneo con strategia "LayWinner", hanno correlation.

**Soluzione** (semplice):
- Max 2 bet per torneo simultanei
- Se stesso player in più match → ridurre exposure

**TODO**: non implementato ora, ma da considerare.

---

## 3️⃣ BET DECISION OUTPUT (STANDARD)

### 3.1 Struttura Obbligatoria

```typescript
interface BetDecision {
  match_id: string;
  timestamp: Date;           // quando è stata presa la decisione
  
  // Strategy
  strategy_id: string;       // "LayWinner", "BancaServizio", ...
  strategy_version: string;  // vedi LINEAGE
  signal_status: "READY" | "WATCH" | "OFF";
  
  // Market
  market: string;            // "match_winner", ...
  selection: string;         // "home", "away", ...
  action: "BACK" | "LAY";
  
  // Pricing
  market_price: number;      // prezzo mercato attuale
  price_min: number;         // prezzo minimo accettabile
  implied_prob: number;      // probabilità implicita mercato
  model_prob: number;        // probabilità modello
  edge: number;              // edge stimato (%)
  
  // Stake
  bankroll: number;          // bankroll attuale
  stake_suggested: number;   // stake Kelly frazionale
  exposure_pct: number;      // % bankroll
  kelly_fraction: number;    // es. 0.25 per 1/4 Kelly
  
  // Confidence
  confidence: number;        // confidence strategia (0-1)
  reason: string;            // reason code (vedi STATS)
  
  // Meta
  bundle_meta: {
    feature_version: string;
    strategy_version: string;
    as_of_time: Date;
  };
}
```

---

### 3.2 Esempio Completo

```json
{
  "match_id": "abc123",
  "timestamp": "2025-12-25T14:55:00Z",
  "strategy_id": "LayWinner",
  "strategy_version": "v2.0.0",
  "signal_status": "READY",
  "market": "match_winner",
  "selection": "home",
  "action": "LAY",
  "market_price": 1.85,
  "price_min": 1.67,
  "implied_prob": 0.54,
  "model_prob": 0.60,
  "edge": 0.06,
  "bankroll": 10000,
  "stake_suggested": 176,
  "exposure_pct": 0.0176,
  "kelly_fraction": 0.25,
  "confidence": 0.85,
  "reason": "high_pressure_favorite",
  "bundle_meta": {
    "feature_version": "v1.2.0",
    "strategy_version": "v2.0.0",
    "as_of_time": "2025-12-25T14:55:00Z"
  }
}
```

---

## 4️⃣ STAKING STRATEGIES

### 4.1 Kelly Frazionale (RACCOMANDATO)

```javascript
function kellyFractional(edge, price, bankroll, fraction = 0.25) {
  const kelly = edge / (price - 1);
  return bankroll * kelly * fraction;
}
```

**Pro**:
- Massimizza crescita long-term
- Si adatta all'edge

**Con**:
- Richiede stima accurata di edge
- Può suggerire stake grandi

---

### 4.2 Flat Staking

```javascript
function flatStaking(bankroll, flat_pct = 0.01) {
  return bankroll * flat_pct;  // es. 1% bankroll fisso
}
```

**Pro**:
- Semplice
- Prevedibile

**Con**:
- Ignora edge
- Non ottimale

---

### 4.3 Confidence-Weighted

```javascript
function confidenceWeighted(edge, price, bankroll, confidence) {
  const baseStake = kellyFractional(edge, price, bankroll, 0.25);
  return baseStake * confidence;
}
```

**Esempio**:
```javascript
const edge = 0.06;
const price = 1.85;
const bankroll = 10000;
const confidence = 0.70;  // strategia ha confidence 70%

const stake = confidenceWeighted(edge, price, bankroll, confidence);
// base = 176, weighted = 176 * 0.70 = 123
```

---

## 5️⃣ BET DECISION LOG (AUDIT)

### 5.1 Perché Loggare

> **Se non loggi le decisioni, non puoi fare post-analysis.**

Domande che puoi rispondere con log:
- Quale strategia ha ROI migliore?
- Sto sovra-staking o sotto-staking?
- Le mie stime di edge sono accurate?
- Quali reason codes sono profittevoli?

---

### 5.2 Storage

**Opzioni**:
1. **File log** (semplice): `bet_decisions.jsonl`
2. **DB table** (scalabile): `bet_decisions`

**Schema table**:
```sql
CREATE TABLE bet_decisions (
  decision_id UUID PRIMARY KEY,
  match_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  strategy_id TEXT NOT NULL,
  action TEXT NOT NULL,  -- "BACK", "LAY"
  market_price NUMERIC NOT NULL,
  stake_suggested NUMERIC NOT NULL,
  edge NUMERIC NOT NULL,
  confidence NUMERIC NOT NULL,
  reason TEXT,
  bundle_meta JSONB NOT NULL,
  -- Outcome (filled post-match)
  executed BOOLEAN DEFAULT FALSE,
  actual_price NUMERIC,
  result TEXT,  -- "WIN", "LOSS", "VOID"
  profit_loss NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_decisions_match ON bet_decisions(match_id);
CREATE INDEX idx_decisions_strategy ON bet_decisions(strategy_id);
CREATE INDEX idx_decisions_timestamp ON bet_decisions(timestamp);
```

---

### 5.3 Logging Example

```javascript
async function logBetDecision(decision) {
  await db.query(`
    INSERT INTO bet_decisions (
      decision_id,
      match_id,
      timestamp,
      strategy_id,
      action,
      market_price,
      stake_suggested,
      edge,
      confidence,
      reason,
      bundle_meta
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    generateUUID(),
    decision.match_id,
    decision.timestamp,
    decision.strategy_id,
    decision.action,
    decision.market_price,
    decision.stake_suggested,
    decision.edge,
    decision.confidence,
    decision.reason,
    JSON.stringify(decision.bundle_meta)
  ]);
}
```

---

### 5.4 Post-Match Update

```javascript
async function updateBetOutcome(decision_id, outcome) {
  await db.query(`
    UPDATE bet_decisions SET
      executed = $1,
      actual_price = $2,
      result = $3,
      profit_loss = $4
    WHERE decision_id = $5
  `, [
    outcome.executed,
    outcome.actual_price,
    outcome.result,      // "WIN" | "LOSS" | "VOID"
    outcome.profit_loss,
    decision_id
  ]);
}
```

---

## 6️⃣ JOURNAL TAB (FRONTEND)

### 6.1 Cosa Mostra

JournalTab mostra:
- Bet decisions log per match
- Stake suggested
- Edge stimato
- Confidence
- Outcome (se match finito)

**NOTA**: il tab mostra dati già calcolati dal backend, non fa calcoli.

---

### 6.2 Struttura Bundle

```typescript
interface MatchBundle {
  // ...
  tabs: {
    // ...
    journal?: {
      decisions: BetDecision[];
      summary: {
        total_decisions: number;
        total_stake: number;
        avg_edge: number;
        avg_confidence: number;
      };
    };
  };
}
```

---

### 6.3 UI Mockup

```jsx
function JournalTab({ bundle }) {
  const { journal } = bundle.tabs;
  
  if (!journal || journal.decisions.length === 0) {
    return <div>No bet decisions for this match.</div>;
  }
  
  return (
    <div className="journal-tab">
      <h3>Bet Journal</h3>
      
      <table>
        <thead>
          <tr>
            <th>Strategy</th>
            <th>Action</th>
            <th>Price</th>
            <th>Edge</th>
            <th>Stake</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {journal.decisions.map(d => (
            <tr key={d.timestamp}>
              <td>{d.strategy_id}</td>
              <td>{d.action} {d.selection}</td>
              <td>{d.market_price.toFixed(2)}</td>
              <td className={d.edge > 0 ? 'positive' : 'negative'}>
                {(d.edge * 100).toFixed(1)}%
              </td>
              <td>€{d.stake_suggested.toFixed(0)}</td>
              <td>
                <StatusBadge status={d.signal_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="journal-summary">
        <p>Total Decisions: {journal.summary.total_decisions}</p>
        <p>Avg Edge: {(journal.summary.avg_edge * 100).toFixed(1)}%</p>
        <p>Avg Confidence: {(journal.summary.avg_confidence * 100).toFixed(0)}%</p>
      </div>
    </div>
  );
}
```

---

## 7️⃣ RISK ENGINE (TODO)

### 7.1 Responsabilità

`backend/services/riskEngine.js` (da creare):
- Riceve signals da strategyEngine
- Calcola edge da model vs market
- Calcola stake Kelly frazionale
- Controlla exposure
- Produce `BetDecision[]`

---

### 7.2 Pseudo-implementazione

```javascript
// backend/services/riskEngine.js

const KELLY_FRACTION = 0.25;
const MAX_EXPOSURE_PCT = 0.20;
const MAX_SINGLE_BET_PCT = 0.05;

async function evaluateBetDecisions(match, strategies, odds, bankroll) {
  const decisions = [];
  
  for (const strategy of strategies) {
    if (strategy.status !== 'READY') continue;
    
    // 1. Get market odds
    const marketOdds = getMarketOdds(odds, strategy.market, strategy.selection);
    if (!marketOdds) continue;
    
    // 2. Get model probability (from predictor)
    const modelProb = strategy.model_prob || 0.5;  // TODO: integrate predictor
    
    // 3. Calculate edge
    const impliedProb = 1 / marketOdds.price;
    const edge = modelProb - impliedProb;
    
    if (edge <= 0) continue;  // no edge
    
    // 4. Calculate stake
    const price_min = 1 / modelProb;
    const stake = calculateStake(edge, marketOdds.price, bankroll, KELLY_FRACTION);
    
    // 5. Build decision
    decisions.push({
      match_id: match.match_id,
      timestamp: new Date(),
      strategy_id: strategy.id,
      strategy_version: strategy.version,
      signal_status: strategy.status,
      market: strategy.market,
      selection: strategy.selection,
      action: strategy.action,
      market_price: marketOdds.price,
      price_min,
      implied_prob: impliedProb,
      model_prob: modelProb,
      edge,
      bankroll,
      stake_suggested: stake,
      exposure_pct: stake / bankroll,
      kelly_fraction: KELLY_FRACTION,
      confidence: strategy.confidence,
      reason: strategy.reason,
      bundle_meta: {
        feature_version: '...',
        strategy_version: '...',
        as_of_time: new Date()
      }
    });
  }
  
  // 6. Control exposure
  const controlled = controlExposure(decisions, bankroll);
  
  return controlled;
}

module.exports = { evaluateBetDecisions };
```

---

## 8️⃣ INTEGRATION CON MATCHBUNDLE

### 8.1 Flusso

```
strategyEngine.evaluateAll()
      │
      ▼
riskEngine.evaluateBetDecisions()  ← bankroll attuale
      │
      ▼
tabs.journal = { decisions, summary }
      │
      ▼
MatchBundle
```

---

### 8.2 matchCardService Integration

```javascript
// backend/services/matchCardService.js

async function buildMatchBundle(match_id, options = {}) {
  // ... existing code
  
  const strategies = await strategyEngine.evaluateAll(features);
  
  // NEW: risk evaluation
  const bankroll = await getBankrollState();  // from config or DB
  const betDecisions = await riskEngine.evaluateBetDecisions(
    match,
    strategies,
    odds,
    bankroll
  );
  
  return {
    header: { /* ... */ },
    tabs: {
      // ... existing tabs
      journal: {
        decisions: betDecisions,
        summary: {
          total_decisions: betDecisions.length,
          total_stake: sum(betDecisions, 'stake_suggested'),
          avg_edge: avg(betDecisions, 'edge'),
          avg_confidence: avg(betDecisions, 'confidence')
        }
      }
    },
    meta: { /* ... */ }
  };
}
```

---

## 9️⃣ BANKROLL STATE

### 9.1 Storage Options

**Opzione 1: Config file** (semplice)
```json
{
  "bankroll": {
    "initial": 10000,
    "current": 9850,
    "last_updated": "2025-12-25T14:00:00Z"
  }
}
```

**Opzione 2: DB table** (scalabile)
```sql
CREATE TABLE bankroll_state (
  id SERIAL PRIMARY KEY,
  amount NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 9.2 Update dopo Bet

```javascript
async function updateBankroll(profit_loss) {
  const current = await getBankrollState();
  const new_amount = current.amount + profit_loss;
  
  await db.query(`
    INSERT INTO bankroll_state (amount) VALUES ($1)
  `, [new_amount]);
  
  return new_amount;
}
```

---

## 🔟 CONCEPT CHECKS

### 10.1 EDGE_REQUIRED

**Regola**:
```text
Nessuna bet decision con edge <= 0.
```

**Test**:
```javascript
function checkEdgeRequired(decisions) {
  for (const d of decisions) {
    assert(d.edge > 0, `decision ${d.match_id} has edge <= 0`);
  }
}
```

---

### 10.2 STAKE_CAP

**Regola**:
```text
stake_suggested <= 5% bankroll.
```

**Test**:
```javascript
function checkStakeCap(decisions) {
  for (const d of decisions) {
    const cap = d.bankroll * 0.05;
    assert(d.stake_suggested <= cap, `stake exceeds 5% cap`);
  }
}
```

---

### 10.3 EXPOSURE_LIMIT

**Regola**:
```text
Total exposure <= 20% bankroll.
```

**Test**:
```javascript
function checkExposureLimit(decisions, bankroll) {
  const totalStake = decisions.reduce((sum, d) => sum + d.stake_suggested, 0);
  const exposurePct = totalStake / bankroll;
  
  assert(exposurePct <= 0.20, `total exposure ${exposurePct} exceeds 20%`);
}
```

---

## 1️⃣1️⃣ REGOLA FINALE

> **Edge senza stake control = edge sprecato.**

Se hai:
- Strategy READY con edge 5%
- Scommetti flat €10 ogni volta
- Oppure scommetti 10% bankroll flat

→ **non stai sfruttando l'edge ottimamente**.

**Kelly frazionale** = metodo scientificamente dimostrato per massimizzare crescita long-term riducendo rischio ruin.

**Questo layer = differenza tra "ho un buon modello" e "faccio profitto".**

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [LINEAGE](../../10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) | [📚 INDEX](../../INDEX_FILOSOFIE.md) | [OBSERVABILITY](../../10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) |

---

**Fine documento – FILOSOFIA_RISK_BANKROLL**
