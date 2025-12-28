# 🔍 CHECK MAPPA CONCETTUALE

> Risultato verifica automatica: 28 dicembre 2025 alle ore 02:56
> Script: `scripts/checkConceptualMap.js`
> Esegui: `node scripts/checkConceptualMap.js`

---

## 📊 Riepilogo

| Metrica | Valore |
|---------|--------|
| Check totali | 145 |
| ✅ Passati | 127 |
| ❌ Falliti | 0 |
| ⚠️ Warning | 18 |
| 📄 Non doc | 4 |
| 🏗️ Arch viol | 0 |

---

## ⚠️ Linee da Aggiornare

Le seguenti funzioni hanno linee diverse da quelle documentate (diff > 20):

| # | Funzione | File | Documentata | Attuale | Diff | Azione |
|---|----------|------|-------------|---------|------|--------|
| 1 | `computeFeatures()` | `backend/utils/featureEngine.js` | L353 | L489 | +136 | [ ] Aggiornare mappa |
| 2 | `calculateVolatilityFromScore()` | `backend/utils/featureEngine.js` | L523 | L722 | +199 | [ ] Aggiornare mappa |
| 3 | `calculateDominanceFromScore()` | `backend/utils/featureEngine.js` | L554 | L753 | +199 | [ ] Aggiornare mappa |
| 4 | `calculateDominanceFromOdds()` | `backend/utils/featureEngine.js` | L589 | L788 | +199 | [ ] Aggiornare mappa |
| 5 | `calculateServeDominanceFromRankings()` | `backend/utils/featureEngine.js` | L624 | L823 | +199 | [ ] Aggiornare mappa |
| 6 | `calculateBreakProbabilityFromOddsRankings()` | `backend/utils/featureEngine.js` | L649 | L848 | +199 | [ ] Aggiornare mappa |
| 7 | `calculatePressureFromScore()` | `backend/utils/featureEngine.js` | L694 | L893 | +199 | [ ] Aggiornare mappa |
| 8 | `calculateMomentumFromScore()` | `backend/utils/featureEngine.js` | L725 | L924 | +199 | [ ] Aggiornare mappa |
| 9 | `evaluateAll()` | `backend/strategies/strategyEngine.js` | L44 | L69 | +25 | [ ] Aggiornare mappa |
| 10 | `evaluateLayWinner()` | `backend/strategies/strategyEngine.js` | L68 | L113 | +45 | [ ] Aggiornare mappa |
| 11 | `evaluateBancaServizio()` | `backend/strategies/strategyEngine.js` | L153 | L209 | +56 | [ ] Aggiornare mappa |
| 12 | `evaluateSuperBreak()` | `backend/strategies/strategyEngine.js` | L227 | L283 | +56 | [ ] Aggiornare mappa |
| 13 | `evaluateTiebreakSpecialist()` | `backend/strategies/strategyEngine.js` | L312 | L368 | +56 | [ ] Aggiornare mappa |
| 14 | `evaluateMomentumSwing()` | `backend/strategies/strategyEngine.js` | L383 | L439 | +56 | [ ] Aggiornare mappa |
| 15 | `initLiveManager()` | `backend/liveManager.js` | L297 | L615 | +318 | [ ] Aggiornare mappa |
| 16 | `syncMatch()` | `backend/liveManager.js` | L1242 | L1576 | +334 | [ ] Aggiornare mappa |
| 17 | `useTabData()` | `src/hooks/useMatchBundle.jsx` | L359 | L396 | +37 | [ ] Aggiornare mappa |
| 18 | `useHeaderData()` | `src/hooks/useMatchBundle.jsx` | L369 | L406 | +37 | [ ] Aggiornare mappa |

---

## 📄 File Non Documentati

I seguenti file esistono ma non sono nella mappa concettuale:

| # | File | Azione |
|---|------|--------|
| 1 | `backend/services/bundleService.js` | [ ] Aggiungere alla mappa |
| 2 | `backend/services/matchEnrichmentService.js` | [ ] Aggiungere alla mappa |
| 3 | `backend/utils/bundleHelpers.js` | [ ] Aggiungere alla mappa |
| 4 | `backend/utils/statsTabBuilder.js` | [ ] Aggiungere alla mappa |

---

---

## 📌 Prossime Azioni

1. Correggi i problemi elencati sopra
2. Aggiorna `docs/checks/MAPPA_RETE_CONCETTUALE_V2.md`
3. Ri-esegui: `node scripts/checkConceptualMap.js`
4. I problemi sono stati copiati in `docs/TODO_LIST.md`

---

*Generato da checkConceptualMap.js*
