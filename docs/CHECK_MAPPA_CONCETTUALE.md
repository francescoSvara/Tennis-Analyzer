# 🔍 CHECK MAPPA CONCETTUALE

> Risultato verifica automatica: 24 dicembre 2025 alle ore 00:20
> Script: `scripts/checkConceptualMap.js`

---

## 📊 Riepilogo

| Metrica | Valore |
|---------|--------|
| Check totali | 122 |
| ✅ Passati | 116 |
| ❌ Falliti | 5 |
| ⚠️ Warning | 1 |

---

## 🏗️ Violazioni Architetturali (MatchBundle-Centric)

Le seguenti violazioni rispetto alle filosofie sono state rilevate:

| # | ID | Severità | Descrizione | File | Riferimento |
|---|----|----|-------------|------|-------------|
| 1 | `BUNDLE_ENDPOINT` | 🔴 ERROR | Endpoint /api/match/:id/bundle deve esistere | `backend/server.js` | FILOSOFIA_DB_V2.md sezione 3 |
| 2 | `USE_MATCH_BUNDLE_HOOK` | 🔴 ERROR | Hook useMatchBundle.jsx deve esistere per consumare MatchBundle | `src/hooks/useMatchBundle.jsx` | FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md sezione 3 |
| 3 | `STRATEGY_ENGINE_IMPLEMENTED` | 🔴 ERROR | Strategy Engine deve avere implementazione reale | `backend/strategies/strategyEngine.js` | FILOSOFIA_STATS_V3.md sezione 6 |
| 4 | `STRATEGY_IN_FRONTEND` | 🔴 ERROR | Strategie (analyzeLayTheWinner, etc.) non devono essere nel frontend | `src/utils.js` | FILOSOFIA_STATS_V3.md sezione 2 |
| 5 | `DATA_COMPLETENESS_FRONTEND` | 🔴 ERROR | calculateDataCompleteness non deve essere nel frontend | `src/utils.js` | FILOSOFIA_CONCEPT_CHECKS_V2.md invariante 3.5 |
| 6 | `FEATURE_ENGINE_DUPLICATE` | 🟡 WARN | calculateVolatility/calculateElasticity duplicati in MomentumTab | `src/components/MomentumTab.jsx` | FILOSOFIA_STATS_V3.md - Feature Engine |

---

---

## 📌 Prossime Azioni

1. Correggi i problemi elencati sopra
2. Aggiorna `docs/MAPPA_RETE_CONCETTUALE_V2.md`
3. Ri-esegui: `node scripts/checkConceptualMap.js`
4. I problemi sono stati copiati in `docs/TODO_LIST.md`

---

*Generato da checkConceptualMap.js*
