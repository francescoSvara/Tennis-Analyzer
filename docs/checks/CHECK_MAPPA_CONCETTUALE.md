# 🔍 CHECK MAPPA CONCETTUALE

> Risultato verifica automatica: 28 dicembre 2025 alle ore 01:47
> Script: `scripts/checkConceptualMap.js`
> Esegui: `node scripts/checkConceptualMap.js`

---

## 📊 Riepilogo

| Metrica | Valore |
|---------|--------|
| Check totali | 145 |
| ✅ Passati | 143 |
| ❌ Falliti | 0 |
| ⚠️ Warning | 2 |
| 📄 Non doc | 4 |
| 🏗️ Arch viol | 0 |

---

## ⚠️ Linee da Aggiornare

Le seguenti funzioni hanno linee diverse da quelle documentate (diff > 20):

| # | Funzione | File | Documentata | Attuale | Diff | Azione |
|---|----------|------|-------------|---------|------|--------|
| 1 | `useTabData()` | `src/hooks/useMatchBundle.jsx` | L359 | L396 | +37 | [ ] Aggiornare mappa |
| 2 | `useHeaderData()` | `src/hooks/useMatchBundle.jsx` | L369 | L406 | +37 | [ ] Aggiornare mappa |

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
