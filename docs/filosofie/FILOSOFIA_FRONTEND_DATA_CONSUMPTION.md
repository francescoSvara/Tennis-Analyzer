# 🔌 FILOSOFIA FRONTEND – DATA CONSUMPTION

> **Scopo**: definire come il frontend **consuma i dati** (snapshot, live, errori, loading) senza conoscere il DB né ridefinire logiche di dominio.
>
> Questo documento è **architetturale**. NON contiene implementazioni dettagliate.

---

## 1️⃣ Ruolo del Frontend nella Data Consumption

Il frontend:
- **consuma** dati già interpretati dal backend
- distingue tra **snapshot** (stabili) e **runtime live** (volatili)
- gestisce stati UI (loading, empty, error)

Il frontend **non**:
- costruisce query DB
- ricalcola metriche
- combina sorgenti raw

Riferimento: `FILOSOFIA_DB.md` – `FILOSOFIA_STATS_V2.md`

---

## 2️⃣ Tipologie di dati consumati

### 🧱 Snapshot (dati stabili)

Caratteristiche:
- restituiti da endpoint REST
- coerenti nel tempo
- pronti per UI

Esempi:
- Match card
- KPI aggregati
- Tabelle storiche

Uso UI:
- dashboard iniziale
- navigazione
- analisi post-match

---

### ⚡ Live Runtime (dati volatili)

Caratteristiche:
- aggiornati frequentemente
- incompleti per definizione
- provenienti da polling o websocket

Esempi:
- score live
- momentum live
- indicatori temporanei

Uso UI:
- live dashboard
- badge / highlight
- micro-aggiornamenti

Riferimento: `FILOSOFIA_LIVE_TRACKING.md`

---

## 3️⃣ Pattern di consumo dati

### 3.1 Caricamento iniziale

- mostra skeleton
- evita spinner invasivi
- carica snapshot

---

### 3.2 Aggiornamento su filtro

- invalidare vista corrente
- mostrare stato di transizione
- aggiornare solo componenti impattati

Riferimento UI: `SPEC_FRONTEND_MOTION_UI.md`

---

### 3.3 Live update

- non bloccare UI
- aggiornare solo parti necessarie
- indicare che il dato è live

---

## 4️⃣ Stati UI legati ai dati

### Loading
- skeleton
- shimmer leggero

### Empty
- messaggio chiaro
- CTA esplicita

### Error
- messaggio umano
- retry esplicito
- fallback se possibile

---

## 5️⃣ Error Handling (principi)

- errori di rete ≠ errori di dominio
- mai mostrare errori tecnici grezzi
- distinguere:
  - dati mancanti
  - errore temporaneo

---

## 6️⃣ Cache e invalidazione (concettuale)

Il frontend:
- può cache-are risposte
- deve rispettare invalidazioni dal backend
- non assume mai che il dato sia definitivo se live

---

## 7️⃣ Cosa NON è questo documento

- non è una guida API
- non è una spec di fetch hooks
- non descrive query o endpoint

---

## 🔗 Collegamenti

- **Frontend UI/UX**  
  `docs/filosofie/FILOSOFIA_FRONTEND_UI_UX.md`

- **Spec UI/Motion**  
  `docs/specs/SPEC_FRONTEND_MOTION_UI.md`

- **Live Tracking**  
  `docs/filosofie/FILOSOFIA_LIVE_TRACKING.md`

---

## ✅ Regola finale

Se una logica di consumo dati:
- richiede calcoli
- combina sorgenti raw
- cambia il significato del dato

➡️ NON è frontend: va spostata in backend o stats.

