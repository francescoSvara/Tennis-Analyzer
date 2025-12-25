# 🔍 CHECK MAPPA CONCETTUALE

> Risultato verifica automatica: 24 dicembre 2025 alle ore 16:37
> Script: `scripts/checkConceptualMap.js`

---

## 📊 Riepilogo

| Metrica | Valore |
|---------|--------|
| Check totali | 114 |
| ✅ Passati | 112 |
| ❌ Falliti | 0 |
| ⚠️ Warning | 2 |

---

## 📄 File Non Documentati

I seguenti file esistono ma non sono nella mappa concettuale:

| # | File | Azione |
|---|------|--------|
| 1 | `backend/utils/logger.js` | [ ] Aggiungere alla mappa |

---

## 🏗️ Violazioni Architetturali (MatchBundle-Centric)

Le seguenti violazioni rispetto alle filosofie sono state rilevate:

| # | ID | Severità | Descrizione | File | Riferimento |
|---|----|----|-------------|------|-------------|
| 1 | `STRATEGY_IN_FRONTEND` | 🟡 WARN | Strategie (analyzeLayTheWinner, etc.) non devono essere nel frontend | `src/utils.js` | FILOSOFIA_STATS_V3.md sezione 2 - Migrazione in corso |
| 2 | `DATA_COMPLETENESS_FRONTEND` | 🟡 WARN | calculateDataCompleteness non deve essere nel frontend | `src/utils.js` | FILOSOFIA_CONCEPT_CHECKS_V2.md invariante 3.5 - Migrazione in corso |

---

---

## 📌 Prossime Azioni

1. Correggi i problemi elencati sopra
2. Aggiorna `docs/MAPPA_RETE_CONCETTUALE_V2.md`
3. Ri-esegui: `node scripts/checkConceptualMap.js`
4. I problemi sono stati copiati in `docs/TODO_LIST.md`

---

*Generato da checkConceptualMap.js*
