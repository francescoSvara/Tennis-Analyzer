# Guida di Refactor — `server.js`

> **Documento operativo per Copilot / Dev**
>
> Questo file descrive **cosa fare ORA** con `server.js` (6000+ righe) e **come comportarsi in FUTURO** quando questo documento e le filosofie evolveranno.
>
> `server.js` è un *God File*: contiene routing, business logic, calcoli, DB access, scraping, live tracking. Questo documento serve a **smontarlo senza rompere l’architettura**.

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

## 4. Task pratico: come svuotare `server.js`

Checklist che Copilot deve seguire:

- [ ] Creare `backend/routes/` e `backend/controllers/`
- [ ] Spostare ogni `app.get` / `app.post` in un file route coerente
- [ ] Ogni handler diventa un controller
- [ ] Estrarre query DB in repository
- [ ] Estrarre calcoli in utils / services
- [ ] Lasciare in `server.js` SOLO bootstrap + mount routes

Esempio mapping:

`/api/db-stats`
➡️ `routes/db.routes.js`
➡️ `controllers/db.controller.js`
➡️ `services/dbStatsService.js`
➡️ `db/matchRepository.js`

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

Se supera:
- ~300–400 righe

Significa che una regola è stata violata.

---

## 6. Regola d’oro

> **Il codice segue le filosofie, non il contrario.**

Se sei indeciso su dove mettere qualcosa:
- identifica la filosofia
- identifica il concetto
- il file giusto diventa ovvio

---

**Questo documento è la guida per smontare `server.js` oggi e non ricaderci domani.**

