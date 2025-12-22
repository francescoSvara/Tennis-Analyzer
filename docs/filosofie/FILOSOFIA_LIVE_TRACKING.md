# 🎾 FILOSOFIA LIVE TRACKING

> Documento architetturale per la gestione dei match live (polling, tracking, streaming e consolidamento dati).
>
> **Dominio**: Live – Runtime match live

Riferimento: [FILOSOFIA_MADRE.md](FILOSOFIA_MADRE.md) (sezione Mappa documenti)

---

## ✅ STATO IMPLEMENTAZIONE

| Sezione | Status | File Riferimento |
|---------|--------|------------------|
| Tabella live_tracking | ✅ | `backend/migrations/add-live-tracking-table.sql` |
| Repository CRUD | ✅ | `backend/db/liveTrackingRepository.js` |
| Polling Engine | ✅ | `backend/liveManager.js` |
| Reconciliation Job | ✅ | `backend/liveManager.js` → `reconcileLiveMatches()` |
| API Endpoints | ✅ | `backend/server.js` |
| WebSocket Streaming | ✅ | `backend/liveManager.js` → `initLiveManager()` |

---

## 1️⃣ Scopo del documento

Questo documento descrive **come funziona il live tracking** nel progetto:

- quali match vengono seguiti
- come e ogni quanto vengono aggiornati
- quali dati sono runtime e quali diventano canonici
- come evitare rate-limit e inconsistenze

⚠️ Il live è **runtime**, non dato storico.
⚠️ Nessuna logica live deve violare le filosofie di `FILOSOFIA_DB.md` e `FILOSOFIA_STATS.md`.

---

## 2️⃣ Principi fondamentali (vincolanti)

1. Il live **non è fonte di verità storica**
2. Il live è **volatile** (cache / snapshot)
3. Solo a match finito i dati diventano canonici
4. Il polling deve essere **intelligente e adattivo**
5. Il frontend NON decide cosa seguire: lo chiede al backend

---

## 3️⃣ Classificazione dei dati live

### ⚡ DATI DINAMICI (RUNTIME)

- score live
- server corrente
- momentum parziale
- pressure index
- trading indicators
- snapshot SofaScore

➡️ NON persistiti come verità storica

---

### 🧱 DATI RAW LIVE

- payload SofaScore live
- eventi punto/game/set

➡️ Possono essere salvati come `raw_events` o `live_snapshots`

---

### 🧮 DATI DERIVATI (POST-MATCH)

- match statistics finali
- point-by-point completo
- volatility / elasticity
- match_character

➡️ Calcolati **dopo consolidamento**

---

## 4️⃣ Tabella principale: `live_tracking`

📁 **File:** `backend/migrations/add-live-tracking-table.sql`
📁 **Repository:** `backend/db/liveTrackingRepository.js`

Scopo: lista ufficiale dei match seguiti.

```pseudo
TABLE live_tracking (
  id PK,
  source_type ENUM('sofascore'),
  source_event_id TEXT UNIQUE,
  match_id FK NULL,
  status ENUM('WATCHING','PAUSED','FINISHED','ERROR'),
  priority ENUM('LOW','MEDIUM','HIGH'),
  poll_interval_sec INT,
  last_polled_at TIMESTAMP,
  last_change_at TIMESTAMP,
  last_payload_hash TEXT,
  fail_count INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## 5️⃣ Polling Engine (Live Poller)

📁 **File:** `backend/liveManager.js` → `checkTrackedMatches()`, `computeDataHash()`

### Worker principale

```pseudo
WORKER livePoller_tick():
  candidates = SELECT * FROM live_tracking
               WHERE status='WATCHING'
                 AND polling_due
               ORDER BY priority DESC
               LIMIT N

  FOR each tracking:
    poll_one(tracking)
```

### Logica di polling

```pseudo
FUNCTION poll_one(tracking):
  payload = SofaScoreAPI.get_event(tracking.source_event_id)
  hash = hash(payload.important_fields)

  IF hash == tracking.last_payload_hash:
    backoff()
    RETURN

  update_tracking()
  cache_snapshot(payload)
  publish_websocket_diff()

  IF payload.finished:
    mark_finished()
    enqueue_consolidation()
```

---

## 6️⃣ Reconciliation Job

📁 **File:** `backend/liveManager.js` → `reconcileLiveMatches()`, `fetchLiveMatchesList()`

Scopo: scoprire nuovi live e chiudere quelli finiti.

```pseudo
JOB reconcile_live_matches():
  live_list = SofaScoreAPI.get_live_matches()

  ADD missing live to live_tracking
  VERIFY disappeared live
```

---

## 7️⃣ Cache e Streaming

📁 **File:** `backend/liveManager.js` → `initLiveManager()`, `subscriptions` Map

### Cache Live

- Redis / in-memory
- TTL breve
- key: `live:{source_event_id}`

### WebSocket

```pseudo
WS /api/live/stream
  subscribe(eventId)
  push(diff or snapshot)
```

---

## 8️⃣ API minime

📁 **File:** `backend/server.js`

```
POST /api/track/:eventId           - Aggiunge match al tracking
DELETE /api/track/:eventId         - Rimuove match
GET  /api/tracked                  - Lista match tracciati
POST /api/track/:eventId/priority  - Cambia priorità
POST /api/track/:eventId/resume    - Riprende match in errore
GET  /api/live/discover            - Match live disponibili
POST /api/reconcile                - Riconciliazione manuale
GET  /api/tracking/stats           - Statistiche sistema
```

---

## 9️⃣ Consolidamento post-match

📁 **File:** `backend/liveManager.js` → `saveMatchToDatabase()`
📁 **File:** `backend/db/matchRepository.js` → `insertMatchWithXlsxMerge()`

```pseudo
TASK CONSOLIDATE_MATCH(eventId):
  payload = SofaScoreAPI.get_event(eventId)
  normalize()
  upsert_matches()
  upsert_stats()
  rebuild_snapshots()
```

➡️ Solo qui i dati diventano storici.

---

## 🔟 Failure modes e difese

- Rate limit → backoff + pause
- Match sparito → verify + pause
- Payload incompleto → data completeness bassa

---

## 1️⃣1️⃣ Future evoluzioni

- Provider astratti (`LiveProvider`)
- API esterne (API-Tennis, Sportradar)
- Redis Streams / Kafka
- ML live alerts

---

## 1️⃣2️⃣ Collegamenti con altri documenti

Riferimento: docs/filosofie/FILOSOFIA_DB.md (sezione Raw Events Pipeline)
Riferimento: docs/filosofie/FILOSOFIA_STATS_V2.md (sezione DATI DINAMICI)

---

## ✅ Regola finale

Il live:
- **segue** il match
- **non lo interpreta definitivamente**
- **non rompe il modello dati**

Ogni modifica al live deve rispettare questo documento.

