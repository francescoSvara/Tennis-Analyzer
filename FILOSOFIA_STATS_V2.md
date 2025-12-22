# 📊 FILOSOFIA STATS – ARCHITETTURA DEI CALCOLI (V2)

> **Scopo**: definire in modo chiaro, leggibile e manutenibile **come il progetto trasforma dati puri in metriche**, distinguendo tra calcoli stabili e calcoli runtime.
>
> Questo documento è un **contratto architetturale**: guida sviluppatori e AI (es. GitHub Copilot) su *cosa* esiste, *perché* esiste e *dove* deve vivere.

---

## 1️⃣ Scopo del documento

- Rendere comprensibile l’intero sistema di calcolo
- Separare chiaramente **dati**, **funzioni** e **responsabilità**
- Evitare duplicazioni backend/frontend
- Facilitare evoluzioni future (ML, live, backtest)

⚠️ Le formule NON si inventano qui.  
⚠️ Qui si decide **la struttura**, non l’ottimizzazione.

---

## 2️⃣ Filosofia generale del sistema di calcolo

### Principi non negoziabili

1. I **dati puri** sono la fonte di verità
2. Le **metriche derivate** sono stabili e persistibili
3. I **calcoli dinamici** sono runtime e volatili
4. Le decisioni (prediction / trading) vivono **in backend**
5. Il frontend **interpreta e visualizza**, non decide

---

## 3️⃣ Classificazione dei dati

### 🧱 DATI PURI (RAW)

**Definizione**  
Dati provenienti direttamente da DB o API, non interpretati.

**Esempi**
- matches_new
- match_statistics_new
- match_power_rankings_new
- match_point_by_point_new
- match_odds
- players_new
- player_rankings

➡️ NON contengono logica.

---

### 🧮 DATI DERIVATI (CALCOLATI, STABILI)

**Definizione**  
Metriche calcolate **solo** da dati puri, non cambiano dopo il match.

**Esempi**
- volatility
- elasticity
- match_character
- data_quality
- comeback_rate
- ROI storico
- win_rate per superficie

➡️ DEVONO essere persistibili.

---

### ⚡ DATI DINAMICI (RUNTIME / LIVE)

**Definizione**  
Metriche dipendenti dal contesto live, cambiano punto per punto.

**Esempi**
- pressure_index
- detectMomentumShift
- tradingIndicators
- recommendedStrategy
- live value signals

➡️ NON sono verità storica.

---

## 4️⃣ Livelli di analisi

### 🧑 PLAYER-LEVEL (storico giocatore)

**Domanda chiave**: *Chi è questo giocatore?*

- Aggrega TUTTI i match storici
- Produce un profilo stabile
- Usato per pre-match e contesto

**Metriche tipiche**
- win_rate globale
- win_rate per superficie
- comeback_rate
- ROI
- form recente

---

### 🎾 MATCH-LEVEL (singolo match)

**Domanda chiave**: *Cosa sta succedendo in questo match?*

- Analisi live o post-match
- Usa momentum, pbp, stats
- Produce segnali e classificazioni

**Metriche tipiche**
- volatility
- elasticity
- trend
- pressure_index
- trading signals

---

### 🔗 COMBINED LEVEL

Unisce **Player-Level + Match-Level**.

Esempio:
> “Il giocatore X sta giocando sotto la sua media storica su Hard?”

➡️ Qui vivono prediction e strategie.

---

## 5️⃣ Catalogo funzioni di calcolo (pattern)

Ogni funzione DEVE essere documentata così:

```markdown
### functionName()

Tipo: RAW | DERIVED | DYNAMIC
Livello: PLAYER | MATCH | COMBINED
Input: elenco dati
Output: valore restituito
Persistenza: SÌ | NO

Dipende da:
- dati / funzioni

Usata da:
- servizi / componenti

Rischi:
- incompletezza dati
- edge case
```

Funzioni senza questa classificazione sono **incomplete**.

---

## 6️⃣ Incongruenze architetturali note

Questi pattern sono da evitare e, se presenti, da correggere:

- Metriche DERIVATE ricalcolate runtime
- Data Quality calcolata nel frontend
- Logiche duplicate backend/frontend
- Funzioni senza livello (player/match)
- Decisioni prese nel frontend

➡️ Le correzioni vanno documentate, non “nascoste nel codice”.

---

## 7️⃣ Future implementazioni (struttura obbligatoria)

Ogni nuova funzione futura DEVE dichiarare:

```markdown
Nome funzione
Livello: Player | Match | Combined
Tipo dato prodotto: Derived | Dynamic
Persistenza: SÌ | NO
Nuovi dati richiesti: elenco
Uso previsto: prediction | trading | analytics | ML
```

Se mancano campi → **non è accettabile**.

---

## 8️⃣ Collegamento con altri documenti

- **DB** → `FILOSOFIA_DB.md`
- **Live** → `FILOSOFIA_LIVE_TRACKING.md`

Questo documento NON descrive:
- polling live
- websocket
- scraping

---

## ✅ Regola finale

Se stai scrivendo una funzione e non sai:
- a che livello appartiene
- che tipo di dato produce
- se è persistibile

➡️ **fermati**: il problema è architetturale, non di codice.

Questo documento viene prima dell’implementazione.

