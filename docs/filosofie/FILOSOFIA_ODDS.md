# 💰 FILOSOFIA ODDS – QUOTE, MERCATI E VALORE

> **Scopo**: definire il ruolo delle quote (bookmaker / exchange) nel progetto e separare chiaramente:
> - **quote di mercato** (esterne)
> - **quote reali / fair odds** (interne, calcolate)

Questo documento è **architetturale**: stabilisce confini, responsabilità e principi.

---

## 1️⃣ Perché le Odds sono un dominio separato

Le odds NON sono solo numeri:
- rappresentano il **mercato** (domanda/offerta, margine, bias)
- sono una fonte informativa esterna
- NON sono una verità statistica

➡️ Devono vivere in un dominio dedicato, separato da Stats e Live.

---

## 2️⃣ Tipologie di quote nel progetto

### 🧱 Quote di mercato (Bookmaker / Exchange)

**Definizione**  
Quote fornite da fonti esterne (book, exchange, aggregatori).

Caratteristiche:
- includono margine / overround
- possono essere distorte
- cambiano nel tempo (pre-match e live)

Esempi:
- odds pre-match
- odds in-play
- back/lay (exchange)

➡️ Non sono "giuste": sono **osservazioni del mercato**.

---

### 🧮 Quote reali (Fair Odds)

**Definizione**  
Quote calcolate internamente dal progetto sulla base di statistiche e modelli.

Caratteristiche:
- NON includono margine
- derivano da dati e calcoli approvati
- sono stabili a parità di input

➡️ Rappresentano la **valutazione interna** della probabilità.

---

## 3️⃣ Relazione tra quote di mercato e quote reali

Il valore nasce dal confronto:

> **Value = differenza tra quota di mercato e quota reale**

Regole:
- mai usare quote di mercato come input diretto per le quote reali
- il mercato è confronto, non fondamento

Riferimento: `FILOSOFIA_STATS_V2.md`

---

## 4️⃣ Live vs Pre-match

### Pre-match
- quote più stabili
- utili per analisi storica e backtest

### Live
- quote reattive
- influenzate da eventi puntuali
- necessitano timestamp precisi

Riferimento: `FILOSOFIA_LIVE_TRACKING.md`

---

## 5️⃣ Stato attuale del progetto

Attualmente:
- le quote di mercato possono essere ingestite
- NON esiste ancora un modello definitivo di quote reali

⚠️ Qualsiasi calcolo di fair odds è **sperimentale** finché non approvato.

---

## 6️⃣ Sezione futura: Calcolo Quote Reali (placeholder)

Questa sezione verrà completata quando:
- i dati statistici saranno validati
- i modelli saranno testati
- le formule saranno approvate

Struttura prevista:
- input statistici
- trasformazione in probabilità
- normalizzazione
- validazione

---

## 7️⃣ Cosa NON è questo documento

- non è una guida di betting
- non è una strategia di trading
- non contiene formule operative

---

## 🔗 Collegamenti

- **Stats & Calcoli**  
  `docs/filosofie/FILOSOFIA_STATS_V2.md`

- **Live Tracking**  
  `docs/filosofie/FILOSOFIA_LIVE_TRACKING.md`

---

## ✅ Regola finale

Se una logica:
- decide stake
- suggerisce scommesse
- prende decisioni finanziarie

➡️ NON è Odds: appartiene a **Strategy / Trading**.

