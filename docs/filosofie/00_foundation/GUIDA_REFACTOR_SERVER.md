# Guida di Refactor — `server.js`

> **Documento operativo per Copilot / Dev**
>
> Questo file descrive **cosa fare ORA** con `server.js` (6000+ righe) e **come comportarsi in FUTURO** quando questo documento e le filosofie evolveranno.
>
> `server.js` è un _God File_: contiene routing, business logic, calcoli, DB access, scraping, live tracking. Questo documento serve a **smontarlo senza rompere l’architettura**.

---

## 1. Ruolo ufficiale di `server.js`

`server.js` **NON** è un file di dominio.

Deve contenere **solo**:

- bootstrap Express
- middleware globali (cors, bodyParser, error handler)
- inizializzazione Socket / LiveManager
- mount delle route (`app.use('/api', ...)`)
- `server.listen()`

❌ Non deve contenere:

- logica tennis
- calcoli (pressure, momentum, break, value)
- query DB / Supabase
- orchestrazione MatchBundle
- strategie trading

Se una funzione “capisce il tennis”, **non può stare qui**.

---

## 2. Come classificare il codice (decisione in 10 secondi)

Quando trovi una funzione o un blocco in `server.js`, chiediti:

### A) È HTTP glue?

(Esempi: `req`, `res`, status code, parsing parametri)

➡️ **Va in**

- `backend/routes/*.routes.js`
- `backend/controllers/*.controller.js`

**Regola**:

- routes = URL + middleware
- controller = req → service → res
- zero logica di dominio

---

### B) È logica di business / dominio?

(Esempi: READY/WATCH/OFF, edge, strategia, interpretazione)

➡️ **Va in**

- `backend/services/*`
- `backend/strategies/strategyEngine.js`

Esempi reali da `server.js`:

- valutazione strategie live
- interpretazione power rankings
- decisioni operative

---

### C) È un calcolo puro / feature?

(Esempi: pressure, momentum, break detection, value zones)

➡️ **Va in**

- `backend/utils/featureEngine.js`
- `backend/utils/pressureCalculator.js`
- `backend/utils/breakDetector.js`

⚠️ Divieto assoluto:

- fallback in frontend (`?? 50`, `|| 'N/A'`)
- il backend deve SEMPRE calcolare con i dati disponibili

---

### D) È accesso dati?

(Esempi: `supabase.from()`, query, insert, update)

➡️ **Va in**

- `backend/db/*Repository.js`

Regola:

- nessuna query DB in controller o service
- il repository NON contiene business logic

---

### E) È live tracking / runtime?

(Esempi: polling, socket, sync match, tracked matches)

➡️ **Va in**

- `backend/liveManager.js`
- `backend/db/liveTrackingRepository.js`

---

### F) È scraping o fonte esterna?

(Esempi: SofaScore, fetch diretti)

➡️ **Va in**

- `backend/scraper/sofascoreScraper.js`

---

## 3. Filosofie → Concetti → File (mappa mentale obbligatoria)

Usa sempre questa mappa quando sposti o aggiungi codice:

- **MATCHBUNDLE_ONLY_FE**

  - Tutto confluisce nel MatchBundle
  - FE non fa fetch paralleli
  - Owner: `services/matchCardService.js`

- **TEMPORAL / AS_OF_TIME**

  - Snapshot coerenti, no data leakage
  - Owner: `liveManager.js`, `matchCardService.js`

- **REGISTRY_CANON**

  - ID canonici, deduplica
  - Owner: `dataNormalizer.js`, `matchRepository.js`

- **STATS / FEATURES / HPI**

  - Calcoli puri
  - Owner: `utils/*`

- **STRATEGY_ENGINE**

  - Segnali runtime (non persistiti)
  - Owner: `strategies/strategyEngine.js`

- **DATA_QUALITY / COMPLETENESS**
  - Stato pending / partial / complete
  - Owner: `services/dataQualityChecker.js`

---

## 4. Task pratico: svuotamento `server.js` ✅ COMPLETATO

Tutti i task sono stati completati il **29 Dicembre 2025**:

- [x] Creare `backend/routes/` e `backend/controllers/`
- [x] Spostare ogni `app.get` / `app.post` in un file route coerente
- [x] Ogni handler diventa un controller
- [x] Estrarre query DB in repository
- [x] Estrarre calcoli in utils / services
- [x] Lasciare in `server.js` SOLO bootstrap + mount routes

### Struttura finale:

```
backend/
├── server.js              # ~170 righe (solo bootstrap + mount)
├── server.old.js          # Backup del vecchio server (4600+ righe)
├── routes/
│   ├── index.js           # Central router mount
│   ├── health.routes.js   # GET / e GET /health
│   ├── db.routes.js       # GET /db/* (test, matches, tournaments, players)
│   ├── match.routes.js    # GET/POST /match/:id/*, /matches/*
│   ├── tracking.routes.js # /track/*, /tracked, /live/*
│   ├── player.routes.js   # GET /player/:name/*, /search, /h2h, /ranking-history
│   ├── event.routes.js    # GET /event/:id/* (SofaScore direct fetch)
│   ├── value.routes.js    # POST /interpret-value, /analyze-power-rankings
│   ├── scrapes.routes.js  # GET/POST /scrapes/*
│   ├── stats.routes.js    # GET /stats/db, /stats/health
│   └── admin.routes.js    # GET/POST /admin/queue/*
├── controllers/
│   ├── health.controller.js   # Root + health check
│   ├── db.controller.js       # Database queries
│   ├── match.controller.js    # MatchBundle + 12 sub-endpoints
│   ├── tracking.controller.js # Live tracking operations
│   ├── player.controller.js   # Player stats, H2H, ranking history
│   ├── event.controller.js    # SofaScore direct fetches
│   ├── value.controller.js    # Value interpretation
│   ├── scrapes.controller.js  # Scrape management
│   ├── stats.controller.js    # DB stats with power score
│   └── admin.controller.js    # Queue management
```

### REFACTORING COMPLETATO:

| Data      | Righe server.js | Note                                    |
| --------- | --------------- | --------------------------------------- |
| Inizio    | ~6996           | God file originale                      |
| 27 Dic    | ~5329           | Prima migrazione routes/controllers     |
| 28 Dic AM | ~4850           | Migrato suggested, detected, db-stats   |
| **29 Dic**| **~170**        | **✅ COMPLETATO - Solo bootstrap + mount** |

### Tutti gli Endpoint Migrati:

- ✅ GET /api/health
- ✅ GET /api/stats/db, /api/stats/health
- ✅ GET /api/match/:eventId/bundle
- ✅ GET /api/match/:eventId/card, /momentum, /statistics, /odds, /points
- ✅ POST /api/match/:eventId/momentum-svg, /rebuild-snapshot
- ✅ GET /api/match/:eventId/breaks, /inspector, /refresh
- ✅ GET /api/matches/db, /suggested, /detected, /cards, /merged
- ✅ GET /api/player/:name/stats, /matches
- ✅ GET /api/player/search, /h2h
- ✅ GET /api/player/:playerId/ranking-history
- ✅ POST/DELETE /api/track/:eventId
- ✅ GET /api/event/:eventId/* (SofaScore direct)
- ✅ POST /api/interpret-value, /analyze-power-rankings
- ✅ GET/POST /api/admin/queue/stats, /admin/queue/enqueue

---

## 5. Come comportarsi in FUTURO (documento vivo)

Questo documento **cambierà**. Quindi:

### Regola 1 — Se aggiungi un concetto, devi etichettarlo

Ogni nuova feature / tab / strategia deve dichiarare:

- concetto
- filosofie coinvolte
- file owner
- entra (o no) nel MatchBundle
- persistito o runtime

### Regola 2 — Se sposti codice, aggiorna la mappa

Se crei o sposti un file:

- aggiorna `INDEX_FILOSOFIE.md`
- verifica che ogni concetto abbia un owner chiaro

### Regola 3 — Se un endpoint sembra “nuovo”

Prima di creare un nuovo endpoint:

1. può stare nel MatchBundle?
2. può essere una estensione di un service?

Se la risposta è sì → **non creare endpoint FE dedicati**.

### Regola 4 — `server.js` non deve mai ricrescere

Attualmente: **~170 righe** ✅

Se supera ~300–400 righe, significa che una regola è stata violata.

---

## 6. Regola d’oro

> **Il codice segue le filosofie, non il contrario.**

Se sei indeciso su dove mettere qualcosa:

- identifica la filosofia
- identifica il concetto
- il file giusto diventa ovvio

---

**Questo documento è la guida per smontare `server.js` oggi e non ricaderci domani.**
