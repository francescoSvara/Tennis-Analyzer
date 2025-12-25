# 💹 FILOSOFIA ODDS & MARKET DATA  
## Versione V2 – Market Layer → Feature Provider

> **Dominio**: Odds · Market Data · Pricing  
> **Stato**: ATTIVA  
> **Sostituisce**: `FILOSOFIA_ODDS.md` (V1 – DEPRECATA)  
> **Ultimo aggiornamento**: Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|----------------|
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | Market APIs | [STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md), [RISK_BANKROLL](../../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) |

### 📚 Documenti Correlati
| Documento | Relazione |
|-----------|-----------|
| [TEMPORAL](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) | `event_time` per odds ticks, anti-leakage |
| [LIVE](../../20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md) | Sync live odds con live score |
| [RISK_BANKROLL](../../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) | Calcolo edge usa implied probability |
| [OBSERVABILITY](../../10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Staleness odds alerts |

### 📁 File Codice Principali
| File | Descrizione | Linee chiave |
|------|-------------|---------------|
| [`backend/server.js`](../../backend/server.js) | `normalizeOddsForBundle()` | L3507-3590 |
| [`backend/scraper/sofascoreScraper.js`](../../backend/scraper/sofascoreScraper.js) | Fetch odds da SofaScore | `/api/v1/event/:id/odds` |
| [`src/components/match/tabs/OddsTab.jsx`](../../src/components/match/tabs/OddsTab.jsx) | UI display odds | - |

---

## 0️⃣ PRINCIPIO FONDANTE

> **Le odds descrivono il mercato,  
> non decidono il trade.**

Il dominio Odds:
- osserva il mercato
- normalizza prezzi
- produce feature di mercato

❌ Non decide stake  
❌ Non decide strategie  

---

## 1️⃣ RUOLO DEL DOMINIO ODDS

Il dominio Odds è un **Market Data Layer**.

Produce:
- implied probability
- trend
- liquidità
- spread
- staleness

Consumato da:
- Predictor
- Strategy Engine
- MatchBundle

---

## 2️⃣ OGGETTI STANDARD (OBBLIGATORI)

```json
marketOdds: {
  matchOdds: { back, lay, last },
  trend: { delta5m },
  liquidity: { level, spreadPct },
  lastUpdateTs
}
```

Nessun componente frontend deve “inventare” questi campi.

---

## 3️⃣ MARKET VS MODEL VS EDGE

Separazione obbligatoria:

- **Market**: odds osservate
- **Model**: probabilità interne (Predictor)
- **Edge**: differenza controllata

Il dominio Odds:
- calcola implied probability
- NON calcola win probability

---

## 4️⃣ LIVE ODDS POLICY

Le odds live hanno:
- timestamp
- freshness
- affidabilità

Se staleness > soglia:
- dataQuality.odds ↓
- confidence strategie ↓

---

## 5️⃣ FAIR ODDS (CHI LE CALCOLA)

Le fair odds:
- NON vivono nel dominio Odds
- sono output del Predictor

Odds fornisce solo:
- input puliti
- feature di mercato

---

## 6️⃣ MATCHBUNDLE INTEGRAZIONE

Nel MatchBundle:
- `header.market` → mercato grezzo
- `tabs.odds` → presentazione
- `tabs.predictor` → model vs market

---

## 7️⃣ COSA È STATO RIMOSSO

❌ fair odds placeholder  
❌ stake suggestion  
❌ trade execution logic  
❌ frontend odds logic  

---

## 8️⃣ REGOLA FINALE

Se una logica odds:
- suggerisce un trade
- calcola stake
- decide READY/WATCH

➡️ **non è dominio Odds**.

---

## 9️⃣ ODDSTICK VS ODDSSNAPSHOT

> **Vedi**: [FILOSOFIA_TEMPORAL.md](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md)

### 9.1 OddsTick (Serie Temporale)

**Definizione**: singolo tick di odds con timestamp.

```typescript
interface OddsTick {
  match_id: string;
  market: string;           // "match_winner", "set_winner", ...
  selection: string;        // "home", "away", ...
  book_id: string;          // "bet365", "pinnacle", ...
  price: number;            // decimal odds
  event_time: Date;         // quando la quota era valida
  ingestion_time: Date;     // quando l'abbiamo ricevuta
}
```

**Uso**:
- Analisi temporale
- Trend calculation
- Closing line identification

---

### 9.2 OddsSnapshot (Punto-nel-Tempo)

**Definizione**: vista aggregata odds "as-of" un timestamp.

```typescript
interface OddsSnapshot {
  match_id: string;
  as_of_time: Date;         // cut temporale
  markets: {
    match_winner: {
      home: { price: number; book_id: string; };
      away: { price: number; book_id: string; };
    };
    // altri mercati...
  };
  metadata: {
    last_update: Date;
    data_quality: number;
  };
}
```

**Uso**:
- Feature calculation
- Bundle construction
- Pre-match analysis

---

### 9.3 API Design

```javascript
// GET /api/match/:id/odds/ticks
// → ritorna stream temporale (OddsTick[])

// GET /api/match/:id/odds/snapshot?as_of=<timestamp>
// → ritorna snapshot aggregato (OddsSnapshot)
```

---

## 🔟 TIME SEMANTICS

> **Vedi**: [FILOSOFIA_TEMPORAL.md](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md)

### 10.1 Timestamps Obbligatori

Ogni odds tick DEVE avere:
- `event_time`: quando la quota era valida nel mercato
- `ingestion_time`: quando l'abbiamo salvata

**Regola**: `event_time` ≠ `ingestion_time`

---

### 10.2 Staleness Detection

```javascript
function checkOddsStaleness(oddsTick, match) {
  const now = Date.now();
  const age = now - oddsTick.ingestion_time;
  
  const threshold = match.status === 'live' ? 30000 : 600000;  // 30s live, 10min pre-match
  
  return {
    age_ms: age,
    is_stale: age > threshold,
    warning: age > threshold ? 'STALE_ODDS' : null
  };
}
```

**Integration**: incluso in `meta.data_quality.staleness.odds`

---

### 10.3 As-Of Query

```javascript
async function getOddsAsOf(match_id, as_of_time) {
  return await db.query(`
    SELECT * FROM match_odds_new
    WHERE match_id = $1
    AND event_time <= $2
    ORDER BY event_time DESC
  `, [match_id, as_of_time]);
}
```

**Anti-Leakage**: nessun tick con `event_time > as_of_time`.

---

## 1️⃣1️⃣ CLOSING LINE & SNAPSHOT

> **Vedi**: [FILOSOFIA_TEMPORAL.md](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md)

### 11.1 Definizione Closing Line

**Closing Line** = ultima quota con `event_time` < match start

```javascript
function getClosingLine(match, allOdds) {
  const cutoff = new Date(match.event_time.getTime() - 60000);  // -1 min buffer
  
  const preMatchOdds = allOdds.filter(o => 
    o.match_id === match.match_id &&
    o.market === 'match_winner' &&
    o.event_time < cutoff
  );
  
  if (preMatchOdds.length === 0) return null;
  
  // Ultima quota per selection
  const homeClosing = preMatchOdds
    .filter(o => o.selection === 'home')
    .sort((a, b) => b.event_time - a.event_time)[0];
    
  const awayClosing = preMatchOdds
    .filter(o => o.selection === 'away')
    .sort((a, b) => b.event_time - a.event_time)[0];
  
  return {
    home: homeClosing?.price,
    away: awayClosing?.price,
    timestamp: homeClosing?.event_time
  };
}
```

---

### 11.2 Opening vs Closing

**Opening**: prima quota disponibile (es. 24h pre-match)  
**Closing**: ultima quota pre-match

**Uso**:
- Market movement analysis
- Sharp money detection
- Value betting signals

---

### 11.3 MatchBundle Integration

```typescript
interface MatchBundleOddsTab {
  current: {
    home: number;
    away: number;
    timestamp: Date;
  };
  opening?: {
    home: number;
    away: number;
    timestamp: Date;
  };
  closing?: {
    home: number;
    away: number;
    timestamp: Date;
  };
  movement: {
    home_delta: number;  // closing - opening
    away_delta: number;
    direction: "shortened" | "drifted" | "stable";
  };
}
```

---

## 1️⃣2️⃣ MARKET FEATURES (OUTPUT)

### 12.1 Features Standard

```javascript
function calculateMarketFeatures(odds, match) {
  return {
    implied_prob_home: 1 / odds.home,
    implied_prob_away: 1 / odds.away,
    overround: (1/odds.home + 1/odds.away - 1) * 100,  // %
    spread_pct: Math.abs(odds.home - odds.away) / Math.min(odds.home, odds.away) * 100,
    liquidity_indicator: odds.overround < 5 ? 'high' : 'low',
    favorite: odds.home < odds.away ? 'home' : 'away',
    odds_movement: calculateMovement(odds.opening, odds.closing)
  };
}
```

---

### 12.2 Sharp Market Detection

```javascript
function detectSharpMarket(odds) {
  // Sharp books have low overround
  const SHARP_THRESHOLD = 3;  // 3% overround
  
  return {
    is_sharp: odds.overround < SHARP_THRESHOLD,
    confidence: Math.max(0, 1 - odds.overround / 10)
  };
}
```

---

## 1️⃣3️⃣ INTEGRAZIONE CON ALTRE FILOSOFIE

### 13.1 TEMPORAL

- Odds ticks con `event_time` + `ingestion_time`
- As-of queries per anti-leakage
- Staleness detection

---

### 13.2 REGISTRY_CANON

- `book_id` canonico
- `market` enum standard
- Normalizzazione nomi bookmaker

---

### 13.3 LINEAGE

- `odds_schema_version` in `meta.versions`
- Versioning quando cambio struttura OddsTick

---

### 13.4 OBSERVABILITY

- Staleness monitoring
- Missing odds detection
- Outlier detection (price < 1.01 o > 1000)

---

### 13.5 RISK_BANKROLL

- Odds → implied probability → edge calculation
- Price_min per bet decisions

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | [📚 INDEX](../../INDEX_FILOSOFIE.md) | [LIVE](../../20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md) |

---

**Fine documento – FILOSOFIA_ODDS**
