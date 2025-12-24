# 📝 Deprecation Notice - Frontend Utils Functions

> **Data**: 24 Dicembre 2025  
> **Riferimento**: FILOSOFIA_CALCOLI_V1.md  

---

## ⚠️ Funzioni Deprecate in `src/utils.js`

Le seguenti funzioni di calcolo features esistono sia nel frontend che nel backend.  
**L'implementazione canonica è nel backend** ([FILOSOFIA_CALCOLI_V1](../filosofie/FILOSOFIA_CALCOLI_V1.md)).

### 🔴 Da Rimuovere/Deprecare

| Funzione Frontend | Stato | Rimpiazzare con |
|-------------------|-------|-----------------|
| `calculateVolatility()` | ✅ **DEPRECATED** (già marcata) | `bundle.header.features.volatility` + `volatilitySource` |
| `calculateElasticity()` | ✅ **DEPRECATED** (già marcata) | `bundle.tabs.stats.analysis.elasticity` |
| `calculatePressureIndex()` | ⚠️ **DA DEPRECARE** | `bundle.header.features.pressure` + `pressureSource` |
| `calculateHPI()` | ⚠️ **DA DEPRECARE** | `bundle.tabs.stats.hpi` (futuro) o backend calculation |
| `calculatePressurePerformance()` | ⚠️ **DA DEPRECARE** | `bundle.tabs.stats.pressurePerformance` (futuro) |
| `calculateBreakResilience()` | ⚠️ **DA DEPRECARE** | `bundle.tabs.stats.breakResilience` (futuro) |

---

## ✅ Pattern Corretto di Consumo

### Prima (❌ Deprecato)
```javascript
import { calculateVolatility, calculatePressure } from '../utils';

const MyComponent = ({ powerRankings, statistics }) => {
  const volatility = calculateVolatility(powerRankings);
  const pressure = calculatePressure(statistics);
  
  return <div>Volatility: {volatility.value}%</div>;
};
```

### Dopo (✅ Corretto)
```javascript
import { useMatchBundle } from '../hooks/useMatchBundle';

const MyComponent = ({ matchId }) => {
  const { bundle } = useMatchBundle(matchId);
  
  const volatility = bundle?.header?.features?.volatility || 50;
  const volatilitySource = bundle?.header?.features?.volatilitySource || 'estimated';
  const pressure = bundle?.header?.features?.pressure || 50;
  const pressureSource = bundle?.header?.features?.pressureSource || 'estimated';
  
  return (
    <div>
      <span>Volatility: {volatility}%</span>
      <small>Source: {volatilitySource}</small>
    </div>
  );
};
```

---

## 📊 DataSource Flag

Ogni feature ora espone la sua origine dati:

```javascript
bundle.header.features = {
  volatility: 72,
  volatilitySource: 'live',        // powerRankings disponibili
  
  pressure: 65,
  pressureSource: 'statistics',    // da statistics aggregate
  
  dominance: 58,
  dominanceSource: 'score',        // fallback da score
  
  serveDominance: 52,
  serveDominanceSource: 'rankings' // stima da world rankings
}
```

**Valori possibili** per `*Source`:
- `'live'` - Da powerRankings (game-by-game, massima precisione)
- `'statistics'` - Da statistics aggregate (buona precisione)
- `'score'` - Da score/set results (precisione media)
- `'odds'` - Da market odds (stima)
- `'rankings'` - Da world rankings (stima base)
- `'estimated'` - Fallback default

---

## 🔧 Azioni Richieste

### Per Componenti UI
1. ✅ Già fatto: `StrategiesTab.jsx` usa `bundle.tabs.strategies.signals`
2. ⏳ **TODO**: Rimuovere import di `calculateVolatility`, `calculatePressure` dai componenti
3. ⏳ **TODO**: Usare sempre `bundle.header.features.*` e `bundle.header.features.*Source`

### Per Backend
1. ✅ Fatto: `featureEngine.js` calcola tutte le features con fallback chain
2. ✅ Fatto: Aggiunto `*Source` flag a ogni feature in `computeFeatures()`
3. ✅ Fatto: Test fixtures creati in `test/features/volatility.test.js`

---

## 📚 Riferimenti

- [FILOSOFIA_CALCOLI_V1](../filosofie/FILOSOFIA_CALCOLI_V1.md) - Tassonomia features e standard
- [HPI_RESILIENCE](HPI_RESILIENCE.md) - Spec dettagliata pressure/HPI
- [FILOSOFIA_STATS_V3](../filosofie/FILOSOFIA_STATS_V3.md) - Feature→Strategy→Signal architecture
- [TODO_LIST](../TODO_LIST.md) - Progresso migrazione

---

**Fine documento**
