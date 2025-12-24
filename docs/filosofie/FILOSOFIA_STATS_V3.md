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
| [FILOSOFIA_MADRE](FILOSOFIA_MADRE_TENNIS_ROLE_DRIVEN.md) | [DB_V2](FILOSOFIA_DB_V2.md), [ODDS_V2](FILOSOFIA_ODDS_V2.md), [LIVE_V2](FILOSOFIA_LIVE_TRACKING_V2.md), [HPI](../specs/HPI_RESILIENCE.md) | [FRONTEND_DATA_V2](FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md) |

### 📚 Dominio Calcoli / Feature Library
| Documento | Scopo |
|-----------|-------|
| [FILOSOFIA_CALCOLI_V1](FILOSOFIA_CALCOLI_V1.md) | Tassonomia features, standard input/output, fallback, schede feature operative |

### 📁 File Codice Principali
| File | Descrizione | Linee chiave |
|------|-------------|---------------|
| [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) | Feature Engine - calcoli | L44-674 |
| [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js) | Strategy Engine - segnali | L39-443 |
| [`backend/utils/pressureCalculator.js`](../../backend/utils/pressureCalculator.js) | Calcolo pressure index | - |
| [`backend/server.js`](../../backend/server.js) | Bundle endpoint | L3219-3423 |

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

> 📚 **Dettaglio completo**: Vedi [FILOSOFIA_CALCOLI_V1](FILOSOFIA_CALCOLI_V1.md) per tassonomia, standard, fallback e schede feature operative.

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

> ⚠️ Per schede complete con fallback chain, edge cases e test fixtures → [FILOSOFIA_CALCOLI_V1](FILOSOFIA_CALCOLI_V1.md)

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

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [DB_V2](FILOSOFIA_DB_V2.md) | [📚 INDEX](INDEX_FILOSOFIE.md) | [FRONTEND_DATA_V2](FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md) |

---
**Fine documento – FILOSOFIA_STATS_V3**
