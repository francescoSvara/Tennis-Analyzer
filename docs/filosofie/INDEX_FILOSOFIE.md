# 📚 INDEX FILOSOFIE – VERSIONE CANONICA (V3)

> **Source of Truth documentale** allineato a:
>
> - **Architettura Unificata & Copilot Guide**
> - **MatchBundle-Centric Design**
> - **Pseudo-codice AI-ready**
>
> Questo indice non descrive _tutto_.
> Descrive **come orientarsi senza sbagliare**.

---

## 0️⃣ Principio Costituzionale

> **Tutto converge sul MatchBundle.**

Il MatchBundle è:

- l’unica interfaccia Frontend ↔ Backend
- l’unico snapshot persistito
- l’unico contenitore di dati, feature, strategie e segnali

🚫 Nessun dominio bypassa il MatchBundle

---

## 1️⃣ Come usare questo indice (per umani e AI)

1. Parti sempre dalla **FILOSOFIA_MADRE**
2. Identifica il **layer** in cui stai lavorando
3. Segui i **riferimenti di codice**
4. Verifica con i **Concept Checks**

📌 Se non sai dove mettere il codice → **STOP**

---

## 2️⃣ Documento Costituzionale

| Documento                     | Ruolo                | Quando leggerlo    |
| ----------------------------- | -------------------- | ------------------ |
| **FILOSOFIA_MADRE_TENNIS.md** | Costituzione tecnica | Prima di ogni task |

---

## 3️⃣ Mappa dei Layer (coerente con Architettura Unificata)

```
UI Layer (React)
└─ Rendering + UX
└─ src/components/

API Layer (Express)
└─ Routes: backend/routes/*.routes.js
└─ Controllers: backend/controllers/*.controller.js
└─ server.js (SOLO bootstrap + mount)

Service Layer (Business)
└─ backend/services/*
└─ Composizione MatchBundle

Calculation Layer (Analytics)
└─ backend/utils/*
└─ Funzioni pure

Data Layer (Repository)
└─ backend/db/*Repository.js
└─ DB + fonti esterne
```

🚫 Divieti assoluti:

- UI che calcola
- Service con SQL
- Repository con business logic
- Controller con logica di dominio
- server.js con logica tennis

---

## 4️⃣ Navigazione per Settori Filosofici

### 🗄️ Data Platform (Backend)

| Documento                              | Scopo                         | Codice Principale       |
| -------------------------------------- | ----------------------------- | ----------------------- |
| FILOSOFIA_DB.md                        | Schema, snapshot, persistenza | `backend/db/*`          |
| FILOSOFIA_TEMPORAL.md                  | Time semantics                | `liveManager.js`        |
| FILOSOFIA_REGISTRY_CANON.md            | Canon IDs                     | `dataNormalizer.js`     |
| FILOSOFIA_LINEAGE_VERSIONING.md        | Versioning                    | `matchCardService.js`   |
| FILOSOFIA_OBSERVABILITY_DATAQUALITY.md | Data Quality                  | `dataQualityChecker.js` |

### 🔀 API Layer (Refactored ✅)

| Struttura   | Scopo                  | File Principali                       |
| ----------- | ---------------------- | ------------------------------------- |
| Routes      | URL + middleware       | `backend/routes/*.routes.js` (11 files) |
| Controllers | req → service → res    | `backend/controllers/*.controller.js` (10 files) |
| server.js   | SOLO bootstrap + mount | `backend/server.js` (~170 righe ✅)     |

📌 Refactoring completato: **29 Dicembre 2025** (6996 → 170 righe, -97.5%)

#### Route Files Complete Reference

| File                 | Mount Path                   | Endpoints Principali                                      |
| -------------------- | ---------------------------- | --------------------------------------------------------- |
| `health.routes.js`   | `/api/`                      | `GET /`, `GET /health`                                    |
| `db.routes.js`       | `/api/db`                    | `GET /test`, `GET /matches`, `GET /matches/summary`, etc. |
| `match.routes.js`    | `/api/match`, `/api/matches` | `GET /:eventId/bundle` ⭐, `GET /db`, `GET /suggested`, `/statistics`, `/momentum`, `/odds`, `/points` |
| `tracking.routes.js` | `/api/track`, `/api/tracked` | `POST /:eventId`, `DELETE /:eventId`, `GET /stats`        |
| `player.routes.js`   | `/api/player`                | `GET /:name/stats`, `GET /search`, `GET /h2h`, `GET /:playerId/ranking-history` |
| `event.routes.js`    | `/api/event`                 | `GET /:eventId/point-by-point` (SofaScore direct)         |
| `value.routes.js`    | `/api/`                      | `POST /interpret-value`, `POST /analyze-power-rankings`   |
| `scrapes.routes.js`  | `/api/scrapes`               | `GET /`, `GET /:id`, `POST /scrape`                       |
| `stats.routes.js`    | `/api/stats`                 | `GET /db`, `GET /health`                                  |
| `admin.routes.js`    | `/api/admin`                 | `GET /queue/stats`, `POST /queue/enqueue`                 |

⭐ **MatchBundle endpoint principale**: `GET /api/match/:eventId/bundle`

---

### 🎾 Domain Tennis

| Documento                   | Scopo          | Codice Principale  |
| --------------------------- | -------------- | ------------------ |
| FILOSOFIA_LIVE_TRACKING.md  | Live / WS      | `liveManager.js`   |
| FILOSOFIA_PBP_EXTRACTION.md | Point-by-Point | `pbpExtractor.cjs` |

---

### 💰 Domain Odds

| Documento         | Scopo       | Codice Principale     |
| ----------------- | ----------- | --------------------- |
| FILOSOFIA_ODDS.md | Market data | `/api/match/:id/odds` |

---

### 🧮 Analytics & Features

| Documento            | Scopo            | Codice Principale       |
| -------------------- | ---------------- | ----------------------- |
| FILOSOFIA_STATS.md   | Feature → Signal | `featureEngine.js`      |
| FILOSOFIA_CALCOLI.md | Libreria calcoli | `pressureCalculator.js` |
| HPI_RESILIENCE.md    | Spec indicatori  | `pressureCalculator.js` |

---

### 🎯 Strategy & Risk

| Documento                  | Scopo          | Codice Principale |
| -------------------------- | -------------- | ----------------- |
| FILOSOFIA_RISK_BANKROLL.md | Edge & staking | `riskEngine.js`   |

---

### 🖥️ Frontend (Presentation)

| Documento                              | Scopo        | Codice Principale    |
| -------------------------------------- | ------------ | -------------------- |
| FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md | Hook & cache | `useMatchBundle.jsx` |
| FILOSOFIA_FRONTEND.md                  | UI / UX      | `src/components/`    |

---

## 5️⃣ MatchBundle – Standard Obbligatorio

Ogni MatchBundle **DEVE** includere:

- dati match
- players
- statistics
- momentum
- odds
- analytics
- **meta standard** (temporal, lineage, data_quality)

📌 Vedi: `FILOSOFIA_LINEAGE_VERSIONING.md`

---

## 6️⃣ Flusso Dati Canonico (Sintetico)

```
FONTI → RAW EVENTS
   → NORMALIZZAZIONE (Registry)
   → DB Canonico
   → Feature Engine
   → Strategy Engine
   → MatchBundle Snapshot
   → API / WS
   → useMatchBundle
   → UI Tabs
```

---

## 7️⃣ CI & Guardrails (Sistema Immunitario)

| Script                  | Scopo                                |
| ----------------------- | ------------------------------------ |
| `checkConceptualMap.js` | Se lo dichiari, deve esistere        |
| `runConceptChecks.js`   | Questo codice non dovrebbe stare qui |
| `generateTodoReport.js` | Report unificato                     |

🚫 Violare i check = **ERROR architetturale**

---

## 8️⃣ Invarianti Non Negoziabili

| ID                     | Regola                       |
| ---------------------- | ---------------------------- |
| MATCHBUNDLE_ONLY_FE    | FE consuma solo MatchBundle  |
| BACKEND_INTERPRETATION | Solo backend interpreta dati |
| FEATURE_VS_STRATEGY    | Feature ≠ Strategie          |
| SIGNAL_NOT_METRIC      | Segnali non persistiti       |
| DATAQUALITY_BACKEND    | DataQuality solo backend     |

---

## 9️⃣ Regole per Copilot / AI

### Classificazione Codice (Decisione in 10 secondi)

| Tipo Codice | Esempio | Destinazione |
| ----------- | ------- | ------------ |
| **HTTP glue** | `req`, `res`, status code | `routes/*.routes.js` + `controllers/*.controller.js` |
| **Business logic** | READY/WATCH/OFF, edge, strategia | `services/*` + `strategies/strategyEngine.js` |
| **Calcolo puro** | pressure, momentum, break detection | `utils/featureEngine.js`, `utils/pressureCalculator.js` |
| **Accesso dati** | `supabase.from()`, query | `db/*Repository.js` |
| **Live tracking** | polling, socket, sync | `liveManager.js` + `db/liveTrackingRepository.js` |
| **Scraping** | SofaScore, fetch esterni | `scraper/sofascoreScraper.js` |

### Regole IF/THEN

```
IF devi definire URL → Routes (*.routes.js)
IF devi gestire req/res → Controllers (*.controller.js)
IF devi leggere dati → Repository (db/*Repository.js)
IF devi calcolare → Calculation Layer (utils/*)
IF devi comporre → Service Layer (services/*)
IF devi mostrare → Frontend (src/components/*)
IF non sai → STOP + ARCH_DECISION
```

### Regole Evolutive

1. **Se aggiungi un concetto**: dichiara filosofie, file owner, se entra in MatchBundle
2. **Se sposti codice**: aggiorna INDEX_FILOSOFIE.md
3. **Se endpoint sembra nuovo**: verifica se può stare nel MatchBundle prima
4. **Se server.js supera ~300 righe**: regola violata, correggi

---

## 🔟 Checklist Pre-Sviluppo

- [ ] Ho letto FILOSOFIA_MADRE
- [ ] So il mio layer
- [ ] Conosco input/output
- [ ] Rispetto gli invarianti
- [ ] Non duplico logica

---

## 📍 Stato del Documento

Questo INDEX è **canonico**.
Ogni deviazione è **tecnico-debito** da correggere.

---

**Fine INDEX FILOSOFIE – Versione Canonica V3**
