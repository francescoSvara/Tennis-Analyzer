# 🗄️ FILOSOFIA DATABASE & BACKEND (CONCETTO)

> **Costituzione del dato**
> Questo documento definisce come i dati entrano, vivono e vengono serviti nel sistema.
> Ogni query, ogni insert, ogni endpoint **discende da qui**.

---

## 1️⃣ Perché esiste questo documento

Il sistema gestisce:

- **fonti multiple** (SofaScore, SVG, future API)
- **un unico punto di consumo** (MatchBundle)
- **qualità verificabile** (dataQuality)

Il frontend non conosce le fonti. Conosce solo il bundle.

---

## 2️⃣ Principio di Separazione

> **Fonti dati ≠ Consumo dati**

Le fonti popolano il database.
Il frontend consuma un endpoint unico.

Mai confondere i due ruoli.

---

## 3️⃣ Fonti Dati Ammesse

| Fonte            | Metodo                      | Quando                     |
| ---------------- | --------------------------- | -------------------------- |
| SofaScore API    | `sofascoreScraper.js`       | Match LIVE o appena finiti |
| Match Enrichment | `matchEnrichmentService.js` | Match PASSATI incompleti   |
| SVG Momentum     | `svgMomentumExtractor.js`   | Fallback momentum          |

Nessuna altra fonte è ammessa senza revisione architetturale.

---

## 4️⃣ Consumo Dati

Il frontend chiede **uno stato**, non dati.

```
GET /api/match/:id/bundle
```

### API Architecture (2025-12-28)

| File                                      | Ruolo                     |
| ----------------------------------------- | ------------------------- |
| `backend/routes/match.routes.js`          | Route definition          |
| `backend/controllers/match.controller.js` | Controller: `getBundle()` |
| `backend/services/bundleService.js`       | Business logic bundle     |

Questo endpoint:

- cerca in cache (match_card_snapshot)
- fallback su matches
- applica Feature Engine
- applica Strategy Engine
- restituisce MatchBundle completo

---

## 5️⃣ Schema Canonico

Tabelle principali:

- `matches` — match normalizzati
- `players` — giocatori
- `tournaments` — tornei
- `match_statistics` — statistiche per periodo
- `match_power_rankings` — momentum game-by-game
- `match_point_by_point` — point-by-point data

Ogni tabella ha:

- timestamp di creazione
- source identificata
- versione schema

---

## ⚡ SINGLE SOURCE OF TRUTH (2025-12-29)

> **Un match = UNA riga in `matches`**
> **Un player = UNA riga in `players`**
> **Un torneo = UNA riga in `tournaments`**

### Principio fondamentale

Ogni entità ha **UNA SOLA rappresentazione** nel database.
Il frontend chiede dati da **UN SOLO posto**.

- ❌ MAI query multiple per lo stesso match
- ❌ MAI dati duplicati in tabelle diverse
- ❌ MAI join complessi per ricostruire un'entità
- ✅ UNA chiamata → TUTTI i dati

### Implementazione

```
GET /api/match/:id/bundle → restituisce TUTTO
```

Il bundle contiene: header, score, stats, momentum, strategies, odds.
**Una chiamata, una risposta completa.**

---

## 🚫 REGOLA ANTI-LEGACY (2025-12-29)

> **MAI usare suffissi `_new` nei nomi tabelle**

Le tabelle con suffisso `_new` sono state migrate. I nomi corretti sono quelli sopra.
Qualsiasi riferimento a `matches_new`, `players_new`, `tournaments_new` è **OBSOLETO**.

Usare SEMPRE le costanti da `backend/db/supabase.js`:
```js
const { TABLES } = require('./supabase');
// TABLES.MATCHES, TABLES.PLAYERS, TABLES.TOURNAMENTS, etc.
```

---

## 6️⃣ Data Quality

Ogni bundle include `dataQuality`:

- completeness (% campi presenti)
- freshness (età dei dati)
- source (provenienza)

Il frontend **mostra**, non interpreta.

---

## 7️⃣ Regola finale

> **Se un dato non passa dal DB, non esiste per il frontend.**

---

## 📚 Riferimenti

### 🧭 Navigazione

| ⬆️ Padre                                                         | ⬅️ Correlati                                                        | ➡️ Consumato da                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | [FILOSOFIA_TEMPORAL](../temporal/FILOSOFIA_TEMPORAL.md)             | [FILOSOFIA_LINEAGE](../lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md)                 |
| [INDEX_FILOSOFIE](../../INDEX_FILOSOFIE.md)                      | [FILOSOFIA_REGISTRY](../registry_canon/FILOSOFIA_REGISTRY_CANON.md) | [FILOSOFIA_OBSERVABILITY](../quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) |

### 📁 File Codice Principali

| File                                                                                             | Descrizione                |
| ------------------------------------------------------------------------------------------------ | -------------------------- |
| [`backend/db/supabase.js`](../../../../backend/db/supabase.js)                                   | Client Supabase + TABLES   |
| [`backend/db/matchRepository.js`](../../../../backend/db/matchRepository.js)                     | Repository match queries   |
| [`backend/db/liveTrackingRepository.js`](../../../../backend/db/liveTrackingRepository.js)       | Repository live tracking   |
| [`backend/routes/db.routes.js`](../../../../backend/routes/db.routes.js)                         | Route DB endpoints         |
| [`backend/controllers/db.controller.js`](../../../../backend/controllers/db.controller.js)       | Controller DB              |
| [`backend/routes/match.routes.js`](../../../../backend/routes/match.routes.js)                   | Route MatchBundle endpoint |
| [`backend/controllers/match.controller.js`](../../../../backend/controllers/match.controller.js) | Controller MatchBundle     |

### 📐 Pseudocode

| Documento | Descrizione |
| --------- | ----------- |
| [FILOSOFIA_DB_PSEUDOCODE](./FILOSOFIA_DB_PSEUDOCODE.md) | Regole formali, schema tabelle, SINGLE SOURCE OF TRUTH |

---

**Fine FILOSOFIA_DB – Concetto**
