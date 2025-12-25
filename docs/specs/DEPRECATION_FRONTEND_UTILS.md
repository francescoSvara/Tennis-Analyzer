# 📝 Deprecation Notice - Frontend Utils Functions

> **Data**: 25 Dicembre 2025 (aggiornato)  
> **Stato**: ✅ **COMPLETATO** - `src/utils.js` eliminato  
> **Riferimento**: [FILOSOFIA_CALCOLI](../filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md)  

---

## ✅ COMPLETATO: `src/utils.js` ELIMINATO

Il file `src/utils.js` (~2500 righe) è stato **completamente eliminato** il 25 Dicembre 2025.

**Motivo**: Nessun componente lo importava - era dead code dopo la migrazione a MatchBundle architecture.

### Funzioni rimosse:
- `calculateVolatility()`, `calculateElasticity()`, `classifyMatchCharacter()`
- `calculatePressureIndex()`, `calculateHPI()`, `calculateBreakResilience()`
- `analyzeLayTheWinner()`, `analyzeBancaServizio()`, `analyzeSuperBreak()`
- E altre ~50 funzioni di utilità non usate

---

## ✅ Pattern Corretto di Consumo
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

## 🔧 Migrazione Completata

### Per Componenti UI
1. ✅ `StrategiesTab.jsx` usa `bundle.tabs.strategies.signals`
2. ✅ `StrategiesPanel.jsx` usa solo `bundle.header.player*.stats`
3. ✅ Nessun componente importa più funzioni di calcolo frontend

### Per Backend
1. ✅ Fatto: `featureEngine.js` calcola tutte le features con fallback chain
2. ✅ Fatto: Aggiunto `*Source` flag a ogni feature in `computeFeatures()`
3. ✅ Fatto: Test fixtures creati in `test/features/volatility.test.js`

---

## 📚 Riferimenti

- [FILOSOFIA_CALCOLI](../filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md) - Tassonomia features e standard
- [HPI_RESILIENCE](HPI_RESILIENCE.md) - Spec dettagliata pressure/HPI
- [FILOSOFIA_STATS](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md) - Feature→Strategy→Signal architecture
- [TODO_LIST](../TODO_LIST.md) - Progresso migrazione

---

**Fine documento**
