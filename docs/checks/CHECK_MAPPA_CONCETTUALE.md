# 🔍 CHECK MAPPA CONCETTUALE

> Risultato verifica automatica: 30 dicembre 2025 alle ore 00:03
> Script: `scripts/checkConceptualMap.js`
> Esegui: `node scripts/checkConceptualMap.js`

---

## 📊 Riepilogo

| Metrica | Valore |
|---------|--------|
| Check totali | 148 |
| ✅ Passati | 117 |
| ❌ Falliti | 21 |
| ⚠️ Warning | 10 |
| 📄 Non doc | 4 |
| 🏗️ Arch viol | 1 |

---

## ❌ File Mancanti

I seguenti file sono referenziati nella mappa ma non esistono:

| # | File | Azione |
|---|------|--------|
| 1 | `backend/migrations/create-new-schema.sql` | [ ] Creare o rimuovere riferimento |
| 2 | `backend/migrations/add-snapshot-queue-tables.sql` | [ ] Creare o rimuovere riferimento |
| 3 | `backend/migrations/add-live-tracking-table.sql` | [ ] Creare o rimuovere riferimento |

---

## ⚠️ Linee da Aggiornare

Le seguenti funzioni hanno linee diverse da quelle documentate (diff > 20):

| # | Funzione | File | Documentata | Attuale | Diff | Azione |
|---|----------|------|-------------|---------|------|--------|
| 1 | `evaluateAll()` | `backend/strategies/strategyEngine.js` | L44 | L69 | +25 | [ ] Aggiornare mappa |
| 2 | `evaluateLayWinner()` | `backend/strategies/strategyEngine.js` | L68 | L121 | +53 | [ ] Aggiornare mappa |
| 3 | `evaluateBancaServizio()` | `backend/strategies/strategyEngine.js` | L153 | L217 | +64 | [ ] Aggiornare mappa |
| 4 | `evaluateSuperBreak()` | `backend/strategies/strategyEngine.js` | L227 | L291 | +64 | [ ] Aggiornare mappa |
| 5 | `evaluateTiebreakSpecialist()` | `backend/strategies/strategyEngine.js` | L312 | L376 | +64 | [ ] Aggiornare mappa |
| 6 | `evaluateMomentumSwing()` | `backend/strategies/strategyEngine.js` | L383 | L447 | +64 | [ ] Aggiornare mappa |
| 7 | `initLiveManager()` | `backend/liveManager.js` | L297 | L625 | +328 | [ ] Aggiornare mappa |
| 8 | `syncMatch()` | `backend/liveManager.js` | L1242 | L1552 | +310 | [ ] Aggiornare mappa |
| 9 | `useTabData()` | `src/hooks/useMatchBundle.jsx` | L359 | L399 | +40 | [ ] Aggiornare mappa |
| 10 | `useHeaderData()` | `src/hooks/useMatchBundle.jsx` | L369 | L409 | +40 | [ ] Aggiornare mappa |

---

## ❌ Tabelle DB Non Trovate

Le seguenti tabelle non sono state trovate nelle migrations:

| # | Tabella | Migration | Azione |
|---|---------|-----------|--------|
| 1 | `players` | `schema-final.sql` | [ ] Verificare |
| 2 | `player_aliases` | `schema-final.sql` | [ ] Verificare |
| 3 | `player_rankings` | `schema-final.sql` | [ ] Verificare |
| 4 | `player_career_stats` | `schema-final.sql` | [ ] Verificare |
| 5 | `tournaments` | `schema-final.sql` | [ ] Verificare |
| 6 | `matches` | `schema-final.sql` | [ ] Verificare |
| 7 | `match_data_sources` | `schema-final.sql` | [ ] Verificare |
| 8 | `match_statistics` | `schema-final.sql` | [ ] Verificare |
| 9 | `match_power_rankings` | `schema-final.sql` | [ ] Verificare |
| 10 | `match_point_by_point` | `schema-final.sql` | [ ] Verificare |
| 11 | `match_odds` | `schema-final.sql` | [ ] Verificare |
| 12 | `head_to_head` | `schema-final.sql` | [ ] Verificare |
| 13 | `match_card_snapshot` | `add-snapshot-queue-tables.sql` | [ ] Verificare |
| 14 | `raw_events` | `add-snapshot-queue-tables.sql` | [ ] Verificare |
| 15 | `calculation_queue` | `add-snapshot-queue-tables.sql` | [ ] Verificare |
| 16 | `live_tracking` | `add-live-tracking-table.sql` | [ ] Verificare |
| 17 | `live_snapshots` | `add-live-tracking-table.sql` | [ ] Verificare |

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

## 🏗️ Violazioni Architetturali (MatchBundle-Centric)

Le seguenti violazioni rispetto alle filosofie sono state rilevate:

| # | ID | Severità | Descrizione | File | Riferimento |
|---|----|----|-------------|------|-------------|
| 1 | `BUNDLE_ENDPOINT` | 🔴 ERROR | Endpoint /api/match/:id/bundle deve esistere | `backend/server.js` | docs/filosofie/10_data_platform/storage/FILOSOFIA_DB.md#sezione-3 |

---

---

## 📌 Prossime Azioni

1. Correggi i problemi elencati sopra
2. Aggiorna `docs/checks/MAPPA_RETE_CONCETTUALE_V2.md`
3. Ri-esegui: `node scripts/checkConceptualMap.js`
4. I problemi sono stati copiati in `docs/TODO_LIST.md`

---

*Generato da checkConceptualMap.js*
