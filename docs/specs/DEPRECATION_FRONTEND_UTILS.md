# 📝 DEPRECATION FRONTEND UTILS

## Migration Notice – src/utils.js Eliminato

> **Dominio**: Frontend · Migration · Deprecation  
> **Stato**: ✅ COMPLETATO  
> **Data completamento**: 25 Dicembre 2025  
> **Ultimo aggiornamento**: 27 Dicembre 2025

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre                                                                                                    | ➡️ Correlato                                                                                |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [FILOSOFIA_FRONTEND_DATA](../filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) | [FILOSOFIA_CALCOLI](../filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md) |

### 📁 File Codice Principali

| File                                                                     | Stato               |
| ------------------------------------------------------------------------ | ------------------- |
| `src/utils.js`                                                           | ❌ ELIMINATO        |
| [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) | ✅ Source of Truth  |
| [`src/hooks/useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx)     | ✅ Consumer Pattern |

---

## 0️⃣ STATO ATTUALE

```
✅ COMPLETATO: src/utils.js ELIMINATO (25 Dicembre 2025)
```

Il file `src/utils.js` (~2500 righe) era **dead code** dopo la migrazione a MatchBundle architecture.

---

## 1️⃣ FUNZIONI RIMOSSE

| Categoria      | Funzioni                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| **Volatility** | `calculateVolatility()`, `calculateElasticity()`, `classifyMatchCharacter()` |
| **Pressure**   | `calculatePressureIndex()`, `calculateHPI()`, `calculateBreakResilience()`   |
| **Strategies** | `analyzeLayTheWinner()`, `analyzeBancaServizio()`, `analyzeSuperBreak()`     |
| **Altre**      | ~50 funzioni di utilità non usate                                            |

---

## 2️⃣ PATTERN CORRETTO

### ❌ PRIMA (Sbagliato)

```javascript
import { calculateVolatility } from '../utils';

const volatility = calculateVolatility(rawData); // ❌ Frontend calcola
```

### ✅ DOPO (Corretto)

```javascript
import { useMatchBundle } from '../hooks/useMatchBundle';

const MyComponent = ({ matchId }) => {
  const { bundle } = useMatchBundle(matchId);

  // ✅ Frontend consuma solo
  const volatility = bundle?.header?.features?.volatility || 50;
  const volatilitySource = bundle?.header?.features?.volatilitySource || 'estimated';

  return (
    <div>
      <span>Volatility: {volatility}%</span>
      <small>Source: {volatilitySource}</small>
    </div>
  );
};
```

---

## 3️⃣ DATASOURCE FLAG

Ogni feature ora espone la sua **origine dati**:

```javascript
bundle.header.features = {
  volatility: 72,
  volatilitySource: 'live', // powerRankings disponibili

  pressure: 65,
  pressureSource: 'statistics', // da statistics aggregate

  dominance: 58,
  dominanceSource: 'score', // fallback da score

  serveDominance: 52,
  serveDominanceSource: 'rankings', // stima da world rankings
};
```

### Valori Possibili per `*Source`

| Valore         | Descrizione                     | Precisione |
| -------------- | ------------------------------- | ---------- |
| `'live'`       | Da powerRankings (game-by-game) | Massima    |
| `'statistics'` | Da statistics aggregate         | Buona      |
| `'score'`      | Da score/set results            | Media      |
| `'odds'`       | Da market odds                  | Stima      |
| `'rankings'`   | Da world rankings               | Base       |
| `'estimated'`  | Fallback default                | Minima     |

---

## 4️⃣ MIGRAZIONE COMPLETATA

### Per Componenti UI

| Componente            | Stato | Note                                   |
| --------------------- | ----- | -------------------------------------- |
| `StrategiesTab.jsx`   | ✅    | Usa `bundle.tabs.strategies.signals`   |
| `StrategiesPanel.jsx` | ✅    | Usa solo `bundle.header.player*.stats` |
| Altri componenti      | ✅    | Nessuno importa funzioni calcolo       |

### Per Backend

| Task                  | Stato | File                               |
| --------------------- | ----- | ---------------------------------- |
| Features con fallback | ✅    | `featureEngine.js`                 |
| `*Source` flag        | ✅    | `computeFeatures()`                |
| Test fixtures         | ✅    | `test/features/volatility.test.js` |

---

## 5️⃣ REGOLA ARCHITETTTURALE

```
RULE Frontend_No_Calculation
  IF component needs calculated_value
    THEN read from bundle.header.features
    NEVER import calculation_function
END

RULE Backend_Calculates_All
  ALL features computed in featureEngine.js
  ALL features include *Source flag
END
```

---

## 📚 RIFERIMENTI

| Documento                                                                                   | Scopo                                |
| ------------------------------------------------------------------------------------------- | ------------------------------------ |
| [FILOSOFIA_CALCOLI](../filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md) | Tassonomia features e standard       |
| [HPI_RESILIENCE](HPI_RESILIENCE.md)                                                         | Spec dettagliata pressure/HPI        |
| [FILOSOFIA_STATS](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md)       | Feature→Strategy→Signal architecture |

---

**Fine documento – DEPRECATION_FRONTEND_UTILS**
