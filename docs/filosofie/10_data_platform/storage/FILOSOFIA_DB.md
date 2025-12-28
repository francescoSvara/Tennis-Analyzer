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

| Fonte | Metodo | Quando |
|-------|--------|--------|
| SofaScore API | `sofascoreScraper.js` | Match LIVE o appena finiti |
| Match Enrichment | `matchEnrichmentService.js` | Match PASSATI incompleti |
| SVG Momentum | `svgMomentumExtractor.js` | Fallback momentum |

Nessuna altra fonte è ammessa senza revisione architetturale.

---

## 4️⃣ Consumo Dati

Il frontend chiede **uno stato**, non dati.

```
GET /api/match/:id/bundle
```

### API Architecture (2025-12-28)
| File | Ruolo |
|------|-------|
| `backend/routes/match.routes.js` | Route definition |
| `backend/controllers/match.controller.js` | Controller: `getBundle()` |
| `backend/services/bundleService.js` | Business logic bundle |

Questo endpoint:
- cerca in cache (match_card_snapshot)
- fallback su matches_new
- applica Feature Engine
- applica Strategy Engine
- restituisce MatchBundle completo

---

## 5️⃣ Schema Canonico

Tabelle principali:
- `matches_new` — match normalizzati
- `match_statistics_new` — statistiche per periodo
- `match_card_snapshot` — cache bundle
- `power_rankings` — momentum game-by-game

Ogni tabella ha:
- timestamp di creazione
- source identificata
- versione schema

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
| ⬆️ Padre | ⬅️ Correlati | ➡️ Consumato da |
|---------|-------------|-----------------|
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | [FILOSOFIA_TEMPORAL](../temporal/FILOSOFIA_TEMPORAL.md) | [FILOSOFIA_LINEAGE](../lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) |
| [INDEX_FILOSOFIE](../../INDEX_FILOSOFIE.md) | [FILOSOFIA_REGISTRY](../registry_canon/FILOSOFIA_REGISTRY_CANON.md) | [FILOSOFIA_OBSERVABILITY](../quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) |

### 📁 File Codice Principali

| File | Descrizione |
|------|-------------|
| [`backend/db/supabase.js`](../../../../backend/db/supabase.js) | Client Supabase |
| [`backend/db/matchRepository.js`](../../../../backend/db/matchRepository.js) | Repository match queries |
| [`backend/db/liveTrackingRepository.js`](../../../../backend/db/liveTrackingRepository.js) | Repository live tracking |
| [`backend/routes/db.routes.js`](../../../../backend/routes/db.routes.js) | Route DB endpoints |
| [`backend/controllers/db.controller.js`](../../../../backend/controllers/db.controller.js) | Controller DB |
| [`backend/routes/match.routes.js`](../../../../backend/routes/match.routes.js) | Route MatchBundle endpoint |
| [`backend/controllers/match.controller.js`](../../../../backend/controllers/match.controller.js) | Controller MatchBundle |

---

**Fine FILOSOFIA_DB – Concetto**
