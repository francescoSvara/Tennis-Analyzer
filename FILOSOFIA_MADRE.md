# 🧭 FILOSOFIA MADRE – Documentazione di Architettura

> **Scopo**: essere l’indice unico (source of truth) della documentazione del progetto.
>
> Questo documento definisce:
> - quali documenti esistono
> - a cosa servono
> - cosa NON devono contenere
> - come si collegano tra loro (cross-reference minimale)

---

## 1️⃣ Regole globali di documentazione (vincolanti)

### 1.1 Un documento = un dominio
Ogni file di filosofia deve trattare **un solo dominio** (es. DB, Stats, Live, Odds, AI).

### 1.2 Cross-reference minimale
Nei documenti NON si copiano contenuti da altri documenti.

**Regola**: sotto ogni paragrafo (o sezione) si aggiunge al massimo una riga di riferimento:

```text
Riferimento: docs/filosofie/<NOME_DOCUMENTO>.md (sezione <Titolo>)
```

### 1.3 Dettagli tecnici: nel codice, non nella filosofia
- Le filosofie spiegano *struttura, invarianti, responsabilità, interfacce*.
- Le formule dettagliate, i pesi, e le implementazioni restano nel codice.

### 1.4 Versionamento
Ogni modifica architetturale deve:
- aggiornare il documento di dominio
- aggiornare questo indice (FILOSOFIA_MADRE)

---

## 2️⃣ Mappa attuale dei documenti (esistenti)

### 2.1 DB – Dati e persistenza
**File**: `docs/filosofie/FILOSOFIA_DB.md`

**Responsabilità**
- definire dati canonici e raw
- definire pipeline ingest → normalizzazione → persist
- definire regole per snapshot/materializzazioni

**Non deve contenere**
- logiche live runtime
- calcoli metriche avanzate (solo dove persistono)

---

### 2.2 Stats – Architettura dei calcoli
**File**: `docs/filosofie/FILOSOFIA_STATS_V2.md`

**Responsabilità**
- distinguere: RAW vs DERIVED vs DYNAMIC
- distinguere livelli: Player vs Match vs Combined
- definire pattern documentazione funzioni

**Non deve contenere**
- polling live / websocket
- dettagli implementativi lunghi

---

### 2.3 Live Tracking – Runtime match live
**File**: `docs/filosofie/FILOSOFIA_LIVE_TRACKING.md`

**Responsabilità**
- watchlist
- polling adattivo + reconcile
- cache + stream websocket
- consolidamento post-match

**Non deve contenere**
- formule di prediction
- regole DB generali

---

## 3️⃣ Documenti da creare (roadmap)

> Questa sezione è la roadmap ufficiale della documentazione.

### 3.1 Odds & Quote (Pre-match / In-play)
**Proposto**: `docs/filosofie/FILOSOFIA_ODDS.md`

**Contenuti**
- fonti quote (Betfair, book, ecc.)
- normalizzazione odds → implied prob
- gestione margin/overround
- caching e timestamping
- regole di qualità dati quote

---

### 3.2 AI / ML (feature engineering, training, serving)
**Proposto**: `docs/filosofie/FILOSOFIA_AI.md`

**Contenuti**
- feature set (da RAW + DERIVED)
- etichette/target
- dataset versioning
- training pipeline
- model registry
- inferenza (batch vs realtime)

---

### 3.3 Strategy & Backtesting (trading framework)
**Proposto**: `docs/filosofie/FILOSOFIA_STRATEGIES.md`

**Contenuti**
- come definire una strategy
- backtest engine
- metriche (ROI, drawdown, sharpe)
- regole per evitare bias (leakage)

---

### 3.4 Observability & Data Quality (monitoring)
**Proposto**: `docs/filosofie/FILOSOFIA_OBSERVABILITY.md`

**Contenuti**
- logging eventi ingest/live
- data quality score (principi)
- alerting (match live bloccati, rate limit, fonti down)
- dashboard metriche

---

## 4️⃣ Convezioni cartella e naming

Suggerimento cartella:

```text
docs/
  filosofie/
    FILOSOFIA_MADRE.md
    FILOSOFIA_DB.md
    FILOSOFIA_STATS_V2.md
    FILOSOFIA_LIVE_TRACKING.md
    FILOSOFIA_ODDS.md
    FILOSOFIA_AI.md
    FILOSOFIA_STRATEGIES.md
    FILOSOFIA_OBSERVABILITY.md
```

---

## 5️⃣ Checklist: aggiungere una nuova sezione o documento

Per aggiungere qualcosa:

1. Decidi il dominio (DB/Stats/Live/Odds/AI/Strategy/Observability)
2. Inseriscilo nel documento del dominio
3. Aggiungi il link qui in **Mappa documenti**
4. Inserisci solo un riferimento minimale sotto le sezioni correlate

---

## ✅ Regola finale

**Non duplicare conoscenza**: collega.

Se un paragrafo richiede più di 1 riferimento o più di 1 pagina di spiegazione → probabilmente appartiene a un altro documento.

