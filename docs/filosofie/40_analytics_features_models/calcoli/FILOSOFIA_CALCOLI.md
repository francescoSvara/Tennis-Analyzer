# 🧮 FILOSOFIA CALCOLI  
## Versione V1 – Feature Library & Calculation Standards

> **Dominio**: Calcoli · Feature Library · Metriche Canoniche  
> **Stato**: ATTIVA  
> **Tipo**: Contratto Operativo  
> **Ultimo aggiornamento**: 24 Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|-----------------|
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | [DB](../../10_data_platform/storage/FILOSOFIA_DB.md), [ODDS](../../30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md), [LIVE](../../20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md) | [STATS](../stats/FILOSOFIA_STATS.md) (Strategy Engine) |

### 📚 Documenti Correlati
| Documento | Relazione |
|-----------|-----------|
| [STATS](../stats/FILOSOFIA_STATS.md) | Consuma le features per generare segnali |
| [TEMPORAL](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) | `as_of_time` per calcoli deterministici |
| [OBSERVABILITY](../../10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Outlier detection, feature range validation |
| [HPI_RESILIENCE](../../specs/HPI_RESILIENCE.md) | Specifiche pressure/resilience features |

### 📁 File Codice Principali
| File | Descrizione | Entry Point |
|------|-------------|-------------|
| [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) | Feature Engine principale | `computeFeatures()` |
| [`backend/utils/pressureCalculator.js`](../../backend/utils/pressureCalculator.js) | Calcoli pressure/HPI | `calculatePressure()` |
| [`backend/utils/breakDetector.js`](../../backend/utils/breakDetector.js) | Rilevamento break | `detectBreaks()` |
| [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js) | Consumer delle features | `evaluateAll()` |
| [`backend/routes/match.routes.js`](../../backend/routes/match.routes.js) | Bundle route (integra features) | `GET /:eventId/bundle` |
| [`backend/services/bundleService.js`](../../backend/services/bundleService.js) | Orchestrazione bundle | `buildBundle()` |

---

## 0️⃣ SCOPO DEL DOCUMENTO

Questo documento è il **contratto operativo** per tutti i calcoli del sistema.

Definisce:
- **Tassonomia** dei calcoli (pressure, break, volatility, dominance, ecc.)
- **Standard** uniformi (input, output, fallback, range, determinismo)
- **Ownership** dei moduli e regole di dipendenza
- **Schede Feature** obbligatorie per ogni metrica

> ⚠️ **Regola d'oro**: Una feature = una funzione canonica.  
> Tutto il resto (strategie, tab, predictor) **consuma** e basta.

---

## 1️⃣ PRINCIPIO FONDAMENTALE

### "MAI NULL"

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Un match ha SEMPRE: score, odds, rankings.                            │
│  Quindi ogni feature ha SEMPRE un valore calcolato.                    │
│                                                                         │
│  ❌ MAI ritornare null, undefined, NaN, 0 come "mancanza dati"         │
│  ✅ SEMPRE calcolare usando la gerarchia di fallback                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Gerarchia Fallback Universale

```
1. powerRankings (dati game-by-game) → massima precisione
2. statistics (aggregati match)      → buona precisione  
3. score (set/game results)          → precisione media
4. odds (market implied)             → stima ragionevole
5. rankings (world ranking)          → stima base
```

---

## 2️⃣ TASSONOMIA DEI CALCOLI (PER DOMINIO)

### 🎾 DOMINIO: Match State / Context

Calcoli relativi allo stato corrente del match.

| Feature | Descrizione | Owner | Output |
|---------|-------------|-------|--------|
| `currentSet` | Set corrente (1-5) | featureEngine | int |
| `currentGame` | Game nel set | featureEngine | int |
| `currentPoint` | Punteggio game | featureEngine | string (e.g. "30-15") |
| `serverState` | Chi serve (1/2) | featureEngine | int |
| `isClutchPoint` | Punto decisivo | featureEngine | boolean |
| `isTiebreak` | È tiebreak | featureEngine | boolean |
| `matchPhase` | Fase match (early/mid/late) | featureEngine | string |

#### Scheda: `isClutchPoint`
```yaml
Nome: isClutchPoint
Livello: Match
Tipo: Dynamic
Input richiesti: currentGame, currentPoint, currentSet
Output: boolean
Formula: setPoint || matchPoint || breakPoint || 30-30 || deuce
Fallback: false (se score non parsabile)
Usata da: Predictor, PressureCalculator
Persistenza: NO
dataSource: score
```

---

### 💪 DOMINIO: Pressure & Clutch

Calcoli relativi alla pressione psicologica.

| Feature | Descrizione | Owner | Range | Output |
|---------|-------------|-------|-------|--------|
| `pressure` | Indice pressione globale | pressureCalculator | 0-100 | number |
| `pressureIndex` | Alias di pressure | pressureCalculator | 0-100 | number |
| `hpi` | Hold Pressure Index | pressureCalculator | 0-100 | number |
| `clutchPressure` | Pressione nei punti chiave | pressureCalculator | 0-100 | number |

#### Scheda: `pressure`
```yaml
Nome: pressure
Livello: Match
Tipo: Dynamic
Input richiesti: statistics.breakPointsSaved, score, gameScore
Output: 0-100 (number)
Formula: 
  - Se statistics → calculatePressure(statistics)
  - Altrimenti → calculatePressureFromScore(score)
Fallback chain:
  1. statistics.breakPointsSaved → pressure reale
  2. score.sets[] → stima da punteggio
  3. odds.matchWinner → stima da odds (50 ± margin)
  4. DEFAULT: 50 (neutro)
Usata da: BancaServizio, SuperBreak, Predictor
Persistenza: NO (calcolato runtime)
dataSource: 'live' | 'statistics' | 'score' | 'estimated'
```

#### Scheda: `hpi` (Hold Pressure Index)
```yaml
Nome: hpi
Livello: Player (per giocatore)
Tipo: Dynamic/Static (storico vs live)
Input richiesti: point-by-point, breakPointsSaved, gamesServed
Output: 0-100 (%)
Formula: (games tenuti sotto pressione / totale games servizio pressione) * 100
Situazioni pressione: deuce, 30-30, breakPoint, 0-30, 15-30
Fallback: 65 (media ATP)
Usata da: LayWinner, BancaServizio
Persistenza: SI (storico), NO (live)
```

---

### 🔥 DOMINIO: Break & Serve Dynamics

Calcoli relativi ai break e al servizio.

| Feature | Descrizione | Owner | Range | Note Naming |
|---------|-------------|-------|-------|-------------|
| `breakProbability` | Prob. break game corrente | featureEngine | 0-100 | **Probabilità** |
| `breakPoints` | Conteggio raw BP | statistics | int | **Conteggio** |
| `breakPointConversion` | % conversione BP | featureEngine | 0-100 | **Percentuale** |
| `breakPointsSaved` | BP salvati | statistics | int | **Conteggio** |
| `breakPointsSavedPct` | % BP salvati | featureEngine | 0-100 | **Percentuale** |
| `serveDominance` | Dominio al servizio | featureEngine | 0-100 | |
| `returnDominance` | Dominio in risposta | featureEngine | 0-100 | |
| `holdProbability` | Prob. tenere servizio | featureEngine | 0-100 | |

#### ⚠️ Convenzione Naming "Break"

```
breakProbability     = probabilità stimata di break nel game CORRENTE (0-100)
breakPoints          = conteggio raw break point (int)
breakPointConversion = % conversione storica match/player (0-100)
breakPointsSaved     = conteggio BP salvati (int)
breakPointsSavedPct  = % BP salvati (0-100)
```

#### Scheda: `breakProbability`
```yaml
Nome: breakProbability
Livello: Match
Tipo: Dynamic
Input richiesti: statistics (1st/2nd serve %), server, gameScore, clutchPoint
Output: 0-100 (number)
Formula principale:
  - baseProb = 100 - serverFirstServe%
  - adjust per gameScore (se server avanti, -5; se sotto, +5)
  - adjust per clutchPoint (+10 se breakPoint)
Fallback chain:
  1. statistics (serve %) → calcolo preciso
  2. odds + rankings → stima basata su forza relativa
  3. DEFAULT: 25 (media ATP break rate)
Usata da: BancaServizio, SuperBreak
Persistenza: NO
Edge cases:
  - Tiebreak: breakProb = 35 (fisso, più equilibrato)
  - First game of set: breakProb += 5 (tension)
```

#### Scheda: `serveDominance`
```yaml
Nome: serveDominance
Livello: Match
Tipo: Dynamic
Input richiesti: statistics.firstServePointsWon, statistics.acesCount, statistics.doubleFaultsCount
Output: 0-100 (number)
Formula: (firstServeWon% * 0.5) + (aceRate * 0.3) - (dfRate * 0.2)
Fallback chain:
  1. statistics → calcolo pieno
  2. rankings → stima (rank migliore = dominio maggiore)
  3. DEFAULT: 50
Usata da: LayWinner, MomentumSwing
Persistenza: NO
```

---

### 📈 DOMINIO: Volatility & Momentum

Calcoli relativi alla variabilità e tendenza.

| Feature | Descrizione | Owner | Range |
|---------|-------------|-------|-------|
| `volatility` | Variabilità punteggio | featureEngine | 0-100 |
| `momentum` | Oggetto momentum | featureEngine | object |
| `momentum.trend` | Direzione (-1, 0, +1) | featureEngine | int |
| `momentum.recentSwing` | Cambio recente | featureEngine | -50 to +50 |
| `momentum.last5avg` | Media ultimi 5 games | featureEngine | -100 to +100 |
| `momentum.breakCount` | Break recenti | featureEngine | int |
| `recentMomentum` | Alias per momentum | featureEngine | object |
| `swingDetection` | Rilevamento swing | featureEngine | boolean |

#### Scheda: `volatility`
```yaml
Nome: volatility
Livello: Match
Tipo: Dynamic
Input richiesti: powerRankings (game-by-game), score.sets[]
Output: 0-100 (number)
Formula principale (powerRankings):
  - stdDev(homePoints, awayPoints per game)
  - Normalizzato 0-100
Formula fallback (score):
  - Analisi varianza set scores (6-4 = low, 7-6 = high)
  - Conta tiebreaks
Fallback chain:
  1. powerRankings → stdDev games
  2. score.sets[] → analisi set results
  3. odds → stima (odds vicine = alta volatility)
  4. DEFAULT: 50
Usata da: LayWinner, SuperBreak, TiebreakSpecialist
Persistenza: NO
determinismo: SI (stesso input = stesso output)
```

#### Scheda: `momentum`
```yaml
Nome: momentum
Livello: Match
Tipo: Dynamic
Input richiesti: powerRankings[], score.sets[]
Output: { trend: int, recentSwing: number, last5avg: number, breakCount: int }
Formula:
  trend: +1 se player1 winning streak, -1 se player2, 0 neutro
  recentSwing: delta ultimi 3 games
  last5avg: media points ultimi 5 games
  breakCount: numero break in ultimi 5 games
Fallback chain:
  1. powerRankings → calcolo preciso game-by-game
  2. score.sets[] → stima da andamento set
  3. DEFAULT: { trend: 0, recentSwing: 0, last5avg: 0, breakCount: 0 }
Usata da: MomentumSwing, Predictor
Persistenza: NO
```

---

### 🏆 DOMINIO: Dominance & Match Control

| Feature | Descrizione | Owner | Range |
|---------|-------------|-------|-------|
| `dominance` | Dominio complessivo player1 | featureEngine | 0-100 |
| `matchControl` | Chi controlla il match | featureEngine | 1 / 2 / 0 |
| `formRating` | Forma attuale | featureEngine | 0-100 |

#### Scheda: `dominance`
```yaml
Nome: dominance
Livello: Match  
Tipo: Dynamic
Input richiesti: powerRankings, statistics, score, odds
Output: 0-100 (100 = player1 domina, 0 = player2 domina, 50 = equilibrio)
Formula principale:
  - winRate games * 0.4 + pointWinRate * 0.4 + breakBalance * 0.2
Formula fallback:
  - Da score: (games vinti P1 / totale) * 100
  - Da odds: implied probability normalizzata
Fallback chain:
  1. powerRankings → calcolo game-by-game
  2. statistics → winRates aggregati
  3. score → ratio games vinti
  4. odds → implied probability
  5. DEFAULT: 50
Usata da: LayWinner, Predictor
Persistenza: NO
```

---

### 📊 DOMINIO: Fallback & Estimation

Funzioni dedicate ai calcoli di stima quando mancano dati primari.

| Funzione | Input Minimo | Output | Precision |
|----------|--------------|--------|-----------|
| `calculateVolatilityFromScore` | score.sets[] | volatility | MEDIA |
| `calculateDominanceFromScore` | score.sets[] | dominance | MEDIA |
| `calculateDominanceFromOdds` | odds.matchWinner | dominance | BASSA |
| `calculateServeDominanceFromRankings` | player.ranking | serveDominance | BASSA |
| `calculateBreakProbabilityFromOddsRankings` | odds, rankings | breakProbability | BASSA |
| `calculatePressureFromScore` | score.sets[] | pressure | MEDIA |
| `calculateMomentumFromScore` | score.sets[] | momentum | MEDIA |

### dataSource Flag

Ogni feature deve esporre `dataSource` per trasparenza:

```javascript
{
  volatility: 65,
  volatilitySource: 'live',        // da powerRankings
  pressure: 45,
  pressureSource: 'statistics',    // da stats aggregate
  dominance: 58,
  dominanceSource: 'score',        // fallback da score
  serveDominance: 52,
  serveDominanceSource: 'estimated' // stima da rankings
}
```

---

## 3️⃣ OWNERSHIP & DIPENDENZE

### Moduli Owner

```
┌─────────────────────────────────────────────────────────────┐
│                     FEATURE OWNERSHIP                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  featureEngine.js                                           │
│  ├── volatility, dominance, serveDominance, returnDominance│
│  ├── breakProbability, holdProbability                     │
│  ├── momentum, recentMomentum                              │
│  └── TUTTI i fallback (FromScore, FromOdds, ecc.)          │
│                                                             │
│  pressureCalculator.js                                      │
│  ├── pressure, pressureIndex                               │
│  ├── hpi (Hold Pressure Index)                             │
│  └── clutchPressure                                        │
│                                                             │
│  breakDetector.js                                           │
│  ├── breakDetection                                        │
│  └── breakSequence                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Regole di Dipendenza

```
✅ CONSENTITO:
   Strategy Engine → legge da Feature Engine
   Predictor → legge da Feature Engine
   Tab UI → legge da bundle.header.features

❌ VIETATO:
   Strategy Engine → calcola volatility internamente
   Tab UI → calcola pressure
   Predictor → ricalcola dominance
```

---

## 4️⃣ SCHEDA FEATURE TEMPLATE

Ogni nuova feature DEVE avere questa scheda:

```yaml
# === SCHEDA FEATURE ===
Nome: [nome_feature]
Livello: Player | Match | Combined
Tipo: Static | Dynamic
Input richiesti: [lista input]
Output: [tipo e range]
Formula: [descrizione formula]
Fallback chain:
  1. [fonte primaria] → [calcolo]
  2. [fonte secondaria] → [calcolo]
  n. DEFAULT: [valore default]
Usata da: [strategie, predictor, tab]
Persistenza: SI | NO
dataSource: [live | statistics | score | estimated]
determinismo: SI | NO
Edge cases:
  - [caso 1]: [handling]
  - [caso 2]: [handling]
Test fixtures:
  - input: {...}, expected: {...}
```

---

## 5️⃣ INVARIANTI DEI CALCOLI

| ID | Regola | Validazione |
|----|--------|-------------|
| `CALC-001` | Feature mai null/undefined | typeof feature !== 'undefined' |
| `CALC-002` | Range rispettato | 0 <= value <= 100 (per %) |
| `CALC-003` | Determinismo | f(x) = f(x) sempre |
| `CALC-004` | Fallback chain completa | Ogni feature ha DEFAULT |
| `CALC-005` | dataSource dichiarato | feature.dataSource exists |
| `CALC-006` | Owner unico | Una feature = un modulo |

---

## 6️⃣ TEST & FIXTURES

### Esempio Test Fixture per `volatility`

```javascript
// test/features/volatility.test.js
const fixtures = [
  {
    name: "High volatility match",
    input: {
      powerRankings: [
        { home: 4, away: 0 },
        { home: 0, away: 4 },
        { home: 4, away: 2 },
        // ... pattern irregolare
      ]
    },
    expected: {
      volatility: { min: 70, max: 100 },
      dataSource: 'live'
    }
  },
  {
    name: "Fallback to score",
    input: {
      powerRankings: null,
      score: { sets: [{ home: 7, away: 6 }, { home: 6, away: 7 }] }
    },
    expected: {
      volatility: { min: 60, max: 80 },
      dataSource: 'score'
    }
  },
  {
    name: "Full fallback to default",
    input: { powerRankings: null, score: null, odds: null },
    expected: {
      volatility: 50,
      dataSource: 'estimated'
    }
  }
];
```

---

## 7️⃣ MAPPING FEATURE → CONSUMER

| Feature | Strategy Engine | Predictor | Tab UI |
|---------|----------------|-----------|--------|
| volatility | LayWinner, SuperBreak, TiebreakSpecialist | ✅ | OverviewTab |
| pressure | BancaServizio, SuperBreak | ✅ | OverviewTab, StrategiesTab |
| dominance | LayWinner | ✅ | OverviewTab |
| serveDominance | LayWinner | ✅ | MomentumTab |
| returnDominance | - | ✅ | MomentumTab |
| breakProbability | BancaServizio, SuperBreak | ✅ | OverviewTab, PredictorTab |
| momentum | MomentumSwing | ✅ | MomentumTab, OverviewTab |
| hpi | LayWinner, BancaServizio | ✅ | - |

---

## 8️⃣ MIGRAZIONE ESISTENTE

### Stato Attuale (24 Dic 2025)

Le definizioni delle feature esistono in:
- ✅ `backend/utils/featureEngine.js` - implementazione
- ⚠️ `FILOSOFIA_STATS.md` - documentazione parziale
- ⚠️ `HPI_RESILIENCE.md` - spec parziale HPI

### Piano Migrazione

1. **STATS** mantiene: architettura Feature→Strategy→Signal, regole macro
2. **Questo documento** (CALCOLI) diventa: contratto operativo per ogni feature
3. **HPI_RESILIENCE** rimane: spec dettagliata pressure/resilience (collegata qui)

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [HPI_RESILIENCE](../specs/HPI_RESILIENCE.md) | [📚 INDEX](../../INDEX_FILOSOFIE.md) | [STATS](../stats/FILOSOFIA_STATS.md) |

---
**Fine documento – FILOSOFIA_CALCOLI**
