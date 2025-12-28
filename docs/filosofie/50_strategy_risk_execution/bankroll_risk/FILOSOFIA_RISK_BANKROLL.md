# 💰 FILOSOFIA RISK & BANKROLL MANAGEMENT

> Avere edge non basta: devi scommettere correttamente.  
> Edge corretto + bankroll management sbagliato = bankroll bruciato.

---

## 1️⃣ Il Problema

Senza risk management:
- Strategy dice READY → scommetti quanto?
- 3 match READY simultanei → scommetti su tutti?
- Edge 5% vs Edge 2% → stesso stake?
- Losing streak → flat betting? Kelly?

Il layer Risk converte segnali in decisioni esecutive.

---

## 2️⃣ Architettura Decisionale

```
Features → Strategy Engine (READY/WATCH/OFF)
                ↓
         Risk Engine ← Bankroll State
                ↓
         Bet Decision
```

---

## 3️⃣ Componenti del Layer Risk

### Edge Calculation
```
edge = model_probability - implied_probability
```
Se `edge < 0` → **NO BET**.

### Price Minimum
```
price_min = 1 / model_probability
```
Se il mercato scende sotto `price_min`, l'edge diventa negativo.

### Stake Suggestion (Kelly Frazionale)
```
stake = bankroll × (edge / (price - 1)) × kelly_fraction
```
- Full Kelly è aggressivo → rischio ruin
- Usa 1/4 Kelly o 1/2 Kelly
- Cap massimo: 5% del bankroll per bet

### Exposure Control
- Max exposure single match: 5% bankroll
- Max exposure totale: 20% bankroll
- Se 4 match READY → ridurre stake ciascuno proporzionalmente

---

## 4️⃣ Output: Bet Decision

```json
{
  "match_id": "abc123",
  "strategy": "BancaServizio",
  "action": "LAY home",
  "edge": 0.05,
  "price": 1.85,
  "price_min": 1.67,
  "stake_suggested": 50,
  "confidence": 0.85,
  "exposure_pct": 0.02
}
```

---

## 5️⃣ Logging Decisioni (Audit)

Ogni bet decision **deve** essere loggata con:
- Timestamp
- Bundle meta (versions, as_of_time)
- Features usate
- Edge calculation inputs
- Stake suggestion rationale

Serve per audit e analisi post-mortem.

---

## 6️⃣ Regole Fondamentali

| Regola | Descrizione |
|--------|-------------|
| Edge > 0 | Mai scommettere con edge negativo |
| Price > price_min | Mai scommettere se prezzo è sfavorevole |
| Exposure < 20% | Mai superare 20% bankroll a rischio |
| Kelly frazionale | Mai full Kelly |
| Log everything | Ogni decisione deve essere tracciabile |

---

## 7️⃣ Regola Finale

> Il Risk Engine protegge il capitale.
>
> Una strategia con edge positivo può comunque distruggere il bankroll se lo staking è sbagliato.

---

**Documenti Correlati**:
- [FILOSOFIA_STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md) – features per edge
- [FILOSOFIA_ODDS](../../30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md) – implied probability
- [FILOSOFIA_LINEAGE](../../10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) – audit decisions

### 📁 File Codice Principali

| File | Descrizione |
|------|-------------|
| [`backend/strategies/`](../../../../backend/strategies/) | Strategy implementations (edge calc) |
| [`backend/db/betDecisionsRepository.js`](../../../../backend/db/betDecisionsRepository.js) | Bet decisions logging |
| [`backend/routes/value.routes.js`](../../../../backend/routes/value.routes.js) | Route interpret-value, analyze-power |
