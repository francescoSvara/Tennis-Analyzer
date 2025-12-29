# 💹 FILOSOFIA ODDS & MARKET DATA

> Le odds descrivono il mercato, non decidono il trade.  
> Il dominio Odds osserva, normalizza, produce feature di mercato.

---

## 1️⃣ Principio Fondante

Il dominio Odds è un **Market Data Layer**.

Cosa fa:

- Osserva il mercato
- Normalizza prezzi
- Calcola implied probability
- Fornisce feature di mercato

Cosa NON fa:

- Decidere stake
- Decidere strategie
- Calcolare fair odds (quello è del Predictor)

---

## 2️⃣ Oggetti Standard

Ogni match ha:

```json
{
  "marketOdds": {
    "matchOdds": { "back": 1.85, "lay": 1.87, "last": 1.86 },
    "trend": { "delta5m": -0.03 },
    "liquidity": { "level": "high", "spreadPct": 1.08 },
    "lastUpdateTs": "2025-12-25T14:55:00Z"
  }
}
```

Nessun componente deve "inventare" questi campi.

---

## 3️⃣ Separazione Fondamentale

| Concetto   | Cosa È                 | Chi lo Calcola |
| ---------- | ---------------------- | -------------- |
| **Market** | Odds osservate         | Dominio Odds   |
| **Model**  | Probabilità interne    | Predictor      |
| **Edge**   | Differenza controllata | Risk/Strategy  |

Il dominio Odds calcola **implied probability**, non win probability.

---

## 4️⃣ Live Odds Policy

Le odds live hanno:

- Timestamp preciso
- Indicatore freshness
- Affidabilità

Se staleness supera la soglia:

- `dataQuality.odds` diminuisce
- Confidence delle strategie diminuisce

---

## 5️⃣ OddsTick vs OddsSnapshot

**OddsTick**: singolo tick di odds con timestamp

- Usato per analisi temporale, trend, closing line

**OddsSnapshot**: vista aggregata "as-of" un timestamp

- Usato per feature calculation nel bundle

---

## 6️⃣ Integrazione MatchBundle

Nel bundle:

- `header.market` → mercato grezzo
- `tabs.odds` → presentazione UI
- `tabs.predictor` → model vs market comparison

---

## 7️⃣ Regola Finale

> Se una logica odds:
>
> - Suggerisce un trade
> - Calcola stake
> - Decide READY/WATCH
>
> **→ Non è dominio Odds.**

---

**Documenti Correlati**:

- [FILOSOFIA_TEMPORAL](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) – `event_time` per odds, anti-leakage
- [FILOSOFIA_RISK_BANKROLL](../../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) – edge calculation
- [FILOSOFIA_LIVE_TRACKING](../../20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md) – sync live odds
- [FILOSOFIA_STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md) – features da market data

### � Pseudocode

| Documento                                                      | Descrizione              |
| -------------------------------------------------------------- | ------------------------ |
| [FILOSOFIA_ODDS_PSEUDOCODE](./FILOSOFIA_ODDS_PSEUDOCODE.md)    | Regole formali odds      |

### �📁 File Codice Principali

| File                                                                                             | Descrizione           |
| ------------------------------------------------------------------------------------------------ | --------------------- |
| [`backend/routes/value.routes.js`](../../../../backend/routes/value.routes.js)                   | Route interpret-value |
| [`backend/controllers/value.controller.js`](../../../../backend/controllers/value.controller.js) | Controller value/odds |
| [`backend/services/matchCardService.js`](../../../../backend/services/matchCardService.js)       | structureOdds()       |
