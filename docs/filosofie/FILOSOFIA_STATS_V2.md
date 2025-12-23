# 📊 FILOSOFIA STATS – ARCHITETTURA DEI CALCOLI (V2)

> **Scopo**: definire come il progetto trasforma dati puri in metriche, distinguendo tra calcoli stabili e runtime.
>
> **Dominio**: Stats – Architettura dei calcoli

Riferimento: [FILOSOFIA_MADRE.md](FILOSOFIA_MADRE.md) (sezione Mappa documenti)

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

Riferimento: docs/filosofie/FILOSOFIA_DB.md (sezione Schema Database)
Riferimento: docs/filosofie/FILOSOFIA_LIVE_TRACKING.md (sezione DATI DINAMICI)

Questo documento NON descrive:
- polling live
- websocket
- scraping

---

## 9️⃣ Mappatura Funzioni → File

### Backend - Momentum & Match Analysis

| Funzione | File | Linee |
|----------|------|-------|
| `getThresholdsForSurface` | `backend/utils/valueInterpreter.js` | 51-76 |
| `interpretGameValue` | `backend/utils/valueInterpreter.js` | 87-160 |
| `calculateVolatility` | `backend/utils/valueInterpreter.js` | 264-295 |
| `calculateElasticity` | `backend/utils/valueInterpreter.js` | 302-345 |
| `classifyMatchCharacter` | `backend/utils/valueInterpreter.js` | 352-378 |
| `analyzePowerRankingsEnhanced` | `backend/utils/valueInterpreter.js` | 424-475 |

### Backend - Player Stats

| Funzione | File | Linee |
|----------|------|-------|
| `getPlayerStats` | `backend/services/playerStatsService.js` | 324-393 |
| `calculateComebackRate` | `backend/services/playerStatsService.js` | 111-138 |
| `calculateROI` | `backend/services/playerStatsService.js` | 143-178 |

### Backend - Match Segmentation & Breaks

| Funzione | File | Linee |
|----------|------|-------|
| `segmentMatch` | `backend/utils/matchSegmenter.js` | - |
| `detectBreaksFromScore` | `backend/utils/breakDetector.js` | - |
| `calculatePressureIndex` | `backend/utils/pressureCalculator.js` | - |
| `calculateBreaksFromPbp` | `backend/server.js` | 170-225 |
| `generatePowerRankingsFromPbp` | `backend/server.js` | 227-310 |

### Convenzione SofaScore serving/scoring

**IMPORTANTE**: Convenzione ufficiale SofaScore per point-by-point:
- `serving = 1` → HOME serve
- `serving = 2` → AWAY serve
- `scoring = 1` → HOME vince il game
- `scoring = 2` → AWAY vince il game
- `scoring = -1` → game ancora in corso

**Calcolo BREAK**: Un break si verifica quando `serving !== scoring` (chi serve perde il game)

**Note sui dati**:
- `raw_json.pointByPoint` contiene `game.score.serving/scoring` (usare questo!)
- `dbMatch.pointByPoint` (tabelle DB) NON ha questi campi
- Riferimento: `backend/server.js` endpoint `/api/match/:eventId`

### Algoritmo Momentum (Running Score)

L'algoritmo `generatePowerRankingsFromPbp()` calcola il momentum con:

1. **Running Score per Set**: Per ogni game, accumula +1 (HOME) o -1 (AWAY)
2. **Reset ad ogni Set**: Il running score riparte da 0
3. **Normalizzazione finale**: Scala il valore su range -100..+100

```
Esempio: Set 3, score finale 6-4 per HOME
Games: H H A H A H A H A H → running: +1,+2,+1,+2,+1,+2,+1,+2,+1,+2
Max=+2, Min=-0 → Normalizzato: valore=100 (max HOME advantage)
```

### Backend - Normalization

| Funzione | File | Linee |
|----------|------|-------|
| `normalizePlayerName` | `backend/services/dataNormalizer.js` | 315-368 |
| `createMatchFingerprint` | `backend/services/dataNormalizer.js` | 475-497 |

### Frontend - Utilities & Trading

| Funzione | File | Linee |
|----------|------|-------|
| `extractKeyStats` | `src/utils.js` | 1549-1607 |
| `calculatePressureIndex` | `src/utils.js` | 1614-1680 |
| `analyzeLayTheWinner` | `src/utils.js` | 1690-1807 |
| `analyzeBankTheServer` | `src/utils.js` | 1815-1972 |
| `analyzeSuperBreak` | `src/utils.js` | 1980-2200 |
| `calculateDataCompleteness` | `src/utils.js` | 2327-2408 |

### Frontend - Components

| Funzione | File | Linee |
|----------|------|-------|
| `analyzeMomentumOwner` | `src/components/MomentumTab.jsx` | 141-178 |
| `detectMomentumShift` | `src/components/MomentumTab.jsx` | 183-253 |
| `calculateEloWinProb` | `src/components/QuotesTab.jsx` | 50-55 |
| `calculateAdvancedProbability` | `src/components/QuotesTab.jsx` | 103-332 |
| `calculatePrediction` | `src/components/ManualPredictor.jsx` | 306-362 |

---

## 🔟 Schema Relazioni tra Moduli

```
┌─────────────────────────────────────────────────────────────────┐
│                     MODULI DI CALCOLO                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────┐        ┌──────────────────────┐          │
│   │ playerProfile    │◄──────►│  matchRepository     │          │
│   │ Service.js       │        │  (query storici)     │          │
│   └────────┬─────────┘        └──────────────────────┘          │
│            │                                                     │
│            ▼                                                     │
│   ┌──────────────────┐        ┌──────────────────────┐          │
│   │ breakDetector.js │◄──────►│  matchSegmenter.js   │          │
│   │ (analisi break)  │        │  (fasi match)        │          │
│   └────────┬─────────┘        └──────────┬───────────┘          │
│            │                              │                      │
│            └──────────────┬───────────────┘                      │
│                           ▼                                      │
│                  ┌──────────────────┐                            │
│                  │pressureCalculator│                            │
│                  │    .js (live)    │                            │
│                  └────────┬─────────┘                            │
│                           │                                      │
│                           ▼                                      │
│                  ┌──────────────────┐                            │
│                  │  Trading Engine  │                            │
│                  │   (futuro)       │                            │
│                  └──────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Regola finale

Se stai scrivendo una funzione e non sai:
- a che livello appartiene
- che tipo di dato produce
- se è persistibile

➡️ **fermati**: il problema è architetturale, non di codice.

Questo documento viene prima dell’implementazione.

