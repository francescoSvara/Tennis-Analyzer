# 🧮 FILOSOFIA CALCOLI

> Una feature = una funzione canonica.  
> Tutto il resto (strategie, tab, predictor) consuma e basta.

---

## 1️⃣ Principio Fondamentale: MAI NULL

Un match ha **sempre**: score, odds, rankings.  
Quindi ogni feature ha **sempre** un valore calcolato.

❌ MAI ritornare `null`, `undefined`, `NaN`, `0` come "mancanza dati"  
✅ SEMPRE calcolare usando la gerarchia di fallback

---

## 2️⃣ Gerarchia Fallback Universale

```
1. powerRankings (dati game-by-game) → massima precisione
2. statistics (aggregati match)       → buona precisione
3. score (set/game results)           → precisione media
4. odds (market implied)              → stima ragionevole
5. rankings (world ranking)           → stima base
```

Se il livello 1 non è disponibile, si usa il 2, poi il 3, ecc.

---

## 3️⃣ Domini dei Calcoli

### Match State / Context
- `currentSet`, `currentGame`, `currentPoint`
- `serverState`, `matchPhase`
- `isClutchPoint`, `isTiebreak`

### Pressure & Clutch
- `pressure` (0-100): indice pressione globale
- `hpi` (0-100): Hold Pressure Index
- `clutchPressure`: pressione nei punti chiave

### Break & Serve Dynamics
- `breakProbability`: probabilità break game corrente
- `breakPointConversion`: % conversione storica
- `serveDominance`, `returnDominance`

### Volatility & Momentum
- `volatility`: oscillazione match
- `momentum`: chi ha inerzia positiva
- `elasticity`: capacità di rimonta

---

## 4️⃣ Scheda Feature Standard

Ogni feature **deve** dichiarare:

```yaml
Nome: pressureIndex
Livello: Match | Player | Combined
Tipo: Static | Dynamic
Input richiesti: [statistics, score, server]
Output: 0-100 (number)
Formula: calculatePressure(statistics)
Fallback: calculatePressureFromScore(score) → odds estimate → 50
Usata da: [BancaServizio, SuperBreak]
Persistenza: NO (runtime)
dataSource: live | statistics | estimated
```

---

## 5️⃣ Convenzione Naming "Break"

| Nome | Significato |
|------|-------------|
| `breakProbability` | Probabilità break nel game CORRENTE (0-100) |
| `breakPoints` | Conteggio raw break point (int) |
| `breakPointConversion` | % conversione storica (0-100) |
| `breakPointsSaved` | Conteggio BP salvati (int) |
| `breakPointsSavedPct` | % BP salvati (0-100) |

---

## 6️⃣ Determinismo

> Stessi input + stesso `as_of_time` = stesso output.

Nessun random, nessun side effect.

---

## 7️⃣ Regola Finale

> Se una feature ritorna `null` o `undefined`, il codice è sbagliato.
>
> Esiste sempre un fallback valido.

---

**Documenti Correlati**:
- [FILOSOFIA_STATS](../stats/FILOSOFIA_STATS.md) – consuma features per segnali
- [FILOSOFIA_TEMPORAL](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) – `as_of_time` per calcoli
- [HPI_RESILIENCE](../../specs/HPI_RESILIENCE.md) – specifiche pressure/resilience
