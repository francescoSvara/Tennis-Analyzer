# 🔌 FILOSOFIA FRONTEND – DATA CONSUMPTION  
## Versione V2 – MatchBundle Consumer Architecture

> **Dominio**: Frontend · Data Consumption · UI State  
> **Stato**: ATTIVA  
> **Sostituisce**: `FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md` (V1 – DEPRECATA)  
> **Ultimo aggiornamento**: 25 Dicembre 2025 (Fix file extension .jsx)  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|----------------|
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | [STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md), [RISK_BANKROLL](../../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) | [FRONTEND_UI](../ui/FILOSOFIA_FRONTEND.md) |

### 📚 Documenti Correlati
| Documento | Relazione |
|-----------|-----------|
| [STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md) | MatchBundle producer (features, signals) |
| [RISK_BANKROLL](../../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) | Stake suggestions nel bundle |
| [CALCOLI](../../40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md) | Definizione features consumate |
| [TEMPORAL](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) | Timestamp display rules |
| [CONCEPT_CHECKS](../../00_foundation/FILOSOFIA_CONCEPT_CHECKS.md) | Validazione bundle prima del render |

### 📁 File Codice Principali
| File | Descrizione |
|------|-------------|
| [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) | Calcola TUTTE le features |
| [`backend/server.js`](../../backend/server.js) L3220-3430 | Endpoint `/api/match/:id/bundle` |
| [`src/components/match/tabs/OverviewTab.jsx`](../../src/components/match/tabs/OverviewTab.jsx) | Consuma `header.features` |
| [`src/hooks/useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx) | Hook per fetch bundle |

---

## ⚠️ PRINCIPIO FONDAMENTALE (LEGGERE PRIMA DI TUTTO)

> **"Mostrare dati" significa CALCOLARE dati, non passarli.**

Quando si crea una dashboard con metriche (volatility, pressure, dominance, ecc.):

### ❌ SBAGLIATO
```jsx
// Frontend mostra placeholder
<span>{features.volatility || 'N/A'}</span>  // ← SBAGLIATO
<span>{features.volatility ?? 50}</span>     // ← SBAGLIATO (default fisso)
```

### ✅ CORRETTO
Il **backend DEVE calcolare** il valore usando i dati disponibili:
- Se ha `powerRankings` → calcola da quello
- Se ha `statistics` → calcola da quello
- Se ha solo `score` → calcola da quello
- Se ha solo `odds` → calcola da quello
- Se ha solo `rankings` → calcola da quello

**NON ESISTE il caso "non ho dati"** se il match esiste.  
Un match ha SEMPRE almeno: score, odds, rankings.

### 📍 Implementazione: Feature Engine
```
backend/utils/featureEngine.js → computeFeatures()

Input disponibile?          → Metodo di calcolo
─────────────────────────────────────────────────
powerRankings[]             → calculateVolatility()
statistics.home/away        → calculateServeDominance()
score.sets[]                → calculateVolatilityFromScore()
odds.matchWinner            → calculateDominanceFromOdds()
player1.ranking             → calculateServeDominanceFromRankings()
```

**OGNI feature ha SEMPRE un valore numerico calcolato.**

---

## 0️⃣ PRINCIPIO FONDANTE

> **Il frontend non interpreta il match.  
> Il frontend visualizza uno stato già interpretato.**

Il frontend:
- riceve **un solo payload** (MatchBundle)
- non conosce DB, pipeline o fonti
- non ricalcola metriche
- non deduce logica di dominio

👉 Il frontend è **stateless a livello logico**.

---

## 1️⃣ OBIETTIVO DELLA V2

### Limiti della V1
- fetch multipli per la stessa pagina
- logiche duplicate (pressure, momentum, completeness)
- utils frontend con dominio “nascosto”
- difficoltà nel live update coerente

### Soluzione V2
- **una chiamata iniziale**
- **un solo schema dati**
- **hook unificato**
- **UI deterministica**
- **live update a patch**

---

## 2️⃣ PAYLOAD UNICO: MATCH BUNDLE

### Fonte dati esclusiva

```http
GET /api/match/:matchId/bundle
```

Il MatchBundle contiene **tutto** ciò che serve per:
- Overview
- Strategie Live
- Odds
- Point-by-Point
- Stats
- Momentum
- Predictor
- Journal
- Data Quality

❌ Nessun altro endpoint è richiesto per la Match Page.

---

## 3️⃣ MODELLO MENTALE FRONTEND

Il frontend lavora solo su:

```
MatchBundle
  ├─ header
  ├─ tabs.overview
  ├─ tabs.strategies
  ├─ tabs.odds
  ├─ tabs.pointByPoint
  ├─ tabs.stats
  ├─ tabs.momentum
  ├─ tabs.predictor
  ├─ tabs.journal
  └─ dataQuality
```

Ogni tab:
- legge solo la sua sezione
- non dipende dalle altre
- non ricalcola nulla

---

## 4️⃣ CARICAMENTO INIZIALE

### Strategia

1. fetch MatchBundle
2. mostra skeleton strutturale
3. render completo quando bundle è pronto

### Regole UI
- niente spinner globali
- skeleton per layout, non per dato
- errore solo se bundle fallisce

---

## 5️⃣ LIVE UPDATE (WS / PATCH)

### Filosofia

Il frontend **non rifetcha** il bundle intero.

Riceve:
- patch incrementali (diff)
- solo per le parti mutate

Esempi:
- score
- odds
- point-by-point
- signals strategia

### Regole
- aggiornare solo i componenti impattati
- non bloccare la UI
- indicare sempre che il dato è live

---

## 6️⃣ DATA QUALITY (SOLO VISIVA)

Il frontend:
- legge `bundle.dataQuality`
- mostra badge / warning / tooltip
- **non applica fallback logici**

Esempio:
```json
"dataQuality": {
  "momentum": 0.8,
  "predictor": 0.7
}
```

La decisione è sempre backend.

---

## 7️⃣ ERROR HANDLING

### Tipi di errore

| Tipo | Gestione |
|----|----|
| Network | Retry + messaggio umano |
| Bundle incompleto | Render con warning |
| Live desync | Attendere patch |
| WS down | Fallback a polling |

❌ Mai mostrare errori tecnici grezzi.

---

## 8️⃣ CACHE FRONTEND

Il frontend:
- può cache-are il bundle (memory / SWR)
- deve rispettare `cache.ttlSec`
- non assume mai che un dato live sia definitivo

Invalidazione:
- nuova patch
- cambio match
- TTL scaduto

---

## 9️⃣ COSA È STATO RIMOSSO

❌ Fetch separati per tab  
❌ Utils frontend con logica di dominio  
❌ Calcoli pressure / momentum / edge  
❌ Data completeness calcolata in FE  
❌ Hook multipli per stesso match  

---

## 🔟 RESPONSABILITÀ CHIARE

### Backend
- interpreta i dati
- calcola metriche
- valuta strategie
- produce segnali

### Frontend
- consuma bundle
- visualizza stato
- gestisce UX
- notifica eventi

Qualsiasi logica che **deduce** stato → backend.

---

## 1️⃣1️⃣ HOOK UNIFICATO (CONCETTUALE)

```ts
useMatchBundle(matchId) {
  state: {
    bundle,
    loading,
    error,
    isLive
  }
}
```

Tutte le tab leggono da qui.

---

## 1️⃣2️⃣ BENEFICI REALI

- ⚡ 1 fetch per match
- 🧠 frontend semplice
- 🔁 zero inconsistenze
- 🎯 strategie affidabili
- 🚀 sviluppo rapido
- 🧪 UI testabile

---

## 1️⃣3️⃣ STATO DEL DOCUMENTO

- Questa è la nuova fonte di verità per il consumo dati frontend
- La V1 è deprecata
- Qualsiasi nuova tab deve consumare **solo MatchBundle**

---

## 1️⃣4️⃣ IMPLEMENTAZIONE CORRENTE (Dicembre 2025)

### File di riferimento

| Componente | File | Descrizione |
|------------|------|-------------|
| **Hook MatchBundle** | [`src/hooks/useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx) | Hook unificato per fetch bundle + WebSocket |
| **HomePage** | [`src/components/home/HomePage.jsx`](../../src/components/home/HomePage.jsx) | Lista match da `/api/matches/db` |
| **MatchPage** | [`src/components/match/MatchPage.jsx`](../../src/components/match/MatchPage.jsx) | Container layout con tabs |
| **OverviewTab** | [`src/components/match/tabs/OverviewTab.jsx`](../../src/components/match/tabs/OverviewTab.jsx) | Scoreboard, QuickSignals, StrategyMiniPanel, MiniMomentum |
| **OverviewTab CSS** | [`src/components/match/tabs/OverviewTab.css`](../../src/components/match/tabs/OverviewTab.css) | Stili per i 4 componenti Overview |
| **StrategiesTab** | [`src/components/match/tabs/StrategiesTab.jsx`](../../src/components/match/tabs/StrategiesTab.jsx) | Card strategie con status READY/WATCH/OFF |
| **StatsTab** | [`src/components/match/tabs/StatsTab.jsx`](../../src/components/match/tabs/StatsTab.jsx) | Serve/Return/Points statistics |
| **OddsTab** | [`src/components/match/tabs/OddsTab.jsx`](../../src/components/match/tabs/OddsTab.jsx) | Odds display, Quick Tickets |
| **MomentumTab** | [`src/components/match/tabs/MomentumTab.jsx`](../../src/components/match/tabs/MomentumTab.jsx) | Trend analysis, Serve dominance |
| **PredictorTab** | [`src/components/match/tabs/PredictorTab.jsx`](../../src/components/match/tabs/PredictorTab.jsx) | Win probability, Key drivers |
| **PointByPointTab** | [`src/components/match/tabs/PointByPointTab.jsx`](../../src/components/match/tabs/PointByPointTab.jsx) | Point feed with filters |
| **JournalTab** | [`src/components/match/tabs/JournalTab.jsx`](../../src/components/match/tabs/JournalTab.jsx) | Trading journal (local storage) |

### Backend Endpoints

| Endpoint | File | Descrizione |
|----------|------|-------------|
| `GET /api/matches/db` | [`backend/server.js`](../../backend/server.js) L1131-1210 | Lista match dal database Supabase |
| `GET /api/match/:id/bundle` | [`backend/server.js`](../../backend/server.js) L3219-3423 | Bundle completo per MatchPage |
| `WS /ws/match/:id` | [`backend/server.js`](../../backend/server.js) L4950+ | WebSocket per live updates |

### Helper Functions Backend

| Funzione | File | Descrizione |
|----------|------|-------------|
| `extractScore()` | [`backend/server.js`](../../backend/server.js) L3591-3640 | Estrae score da matchData (supporta player1/player2 e home/away) |
| `buildSetsFromDbFields()` | [`backend/server.js`](../../backend/server.js) L3630-3640 | Costruisce sets da campi DB (set1_p1, set1_p2, etc.) |
| `normalizeOddsForBundle()` | [`backend/server.js`](../../backend/server.js) L3507-3590 | Normalizza odds per frontend |
| `buildOverviewTab()` | [`backend/server.js`](../../backend/server.js) L3650+ | Costruisce dati per tabs.overview |

### Mapping Bundle → Tab

```
bundle.header       → OverviewTab (Scoreboard), tutti i tab (players info)
bundle.header.features → OverviewTab (QuickSignals)
bundle.tabs.overview    → OverviewTab (h2h, recentForm)
bundle.tabs.strategies  → OverviewTab (StrategyMiniPanel), StrategiesTab
bundle.tabs.stats       → StatsTab (serve, return, points)
bundle.tabs.odds        → OddsTab (matchWinner, history)
bundle.tabs.momentum    → MomentumTab (powerRankings, features)
bundle.tabs.predictor   → PredictorTab (winProbability, keyFactors)
bundle.tabs.pointByPoint → PointByPointTab (points array)
bundle.tabs.journal     → JournalTab (enabled flag)
bundle.dataQuality      → MatchHeader (quality badge)
```

---

## 1️⃣5️⃣ BUNDLE ENDPOINT – STRUTTURA IMPLEMENTATA (24/12/2025)

### Endpoint
```http
GET /api/match/:eventId/bundle
```

### Struttura Response Completa
```json
{
  "matchId": 15108295,
  "timestamp": "2025-12-24T01:55:55.456Z",
  
  "header": {
    "match": {
      "id": 15108295,
      "status": "finished|live|notstarted",
      "startTime": "2025-11-16T17:00:00Z",
      "tournament": "Masters Cup",
      "round": "Final",
      "surface": "Hard"
    },
    "players": {
      "home": { "id": 23, "name": "Carlos Alcaraz", "country": "ES", "ranking": 1, "seed": null },
      "away": { "id": 18, "name": "Jannik Sinner", "country": "IT", "ranking": 2, "seed": null }
    },
    "score": {
      "sets": [{ "home": 7, "away": 6, "tiebreak": 5 }, { "home": 7, "away": 5 }],
      "game": { "home": 0, "away": 0 },
      "point": null,
      "serving": "home|away|null"
    },
    "odds": { "home": 1.5, "away": 2.8 },
    "features": {
      "volatility": 50,
      "pressure": 50,
      "dominance": 50,
      "serveDominance": 36,
      "returnDominance": 30,
      "breakProbability": 25
    }
  },
  
  "features": {
    "volatility": 50,
    "pressure": 50,
    "dominance": 50,
    "serveDominance": 36,
    "returnDominance": 30,
    "breakProbability": 25,
    "dominantPlayer": null,
    "serverPlayerId": null,
    "momentum": {
      "trend": "stable|rising|falling",
      "recentSwing": 0,
      "last5avg": 0,
      "breakCount": 0
    }
  },
  
  "tabs": {
    "overview": { /* h2h, recentForm, keyStats, alerts, features */ },
    "strategies": { /* signals[], summary */ },
    "odds": { /* matchWinner, history[], spreads, totals */ },
    "pointByPoint": { /* points[], hasMore, total */ },
    "stats": { /* serve, return, points */ },
    "momentum": { /* powerRankings[], features, qualityStats */ },
    "predictor": { /* winProbability, keyFactors[], breakProbability */ },
    "journal": { "enabled": true }
  },
  
  "dataQuality": 50,
  
  "meta": {
    "version": "2.0",
    "source": "snapshot|live",
    "strategiesCount": 5,
    "readyStrategies": 0
  }
}
```

---

## 1️⃣6️⃣ NORMALIZZAZIONE DATI – HELPER FUNCTIONS

### `normalizeOddsForBundle(oddsData, matchData)`
**File**: `backend/server.js` L3370-3420

Normalizza le odds dal formato database al formato frontend:
```js
// Input (dal DB match_odds):
{ opening: {...}, closing: {...}, all: [...] }

// Output (per frontend):
{
  home: { value: 1.5, trend: 0|-1|1 },
  away: { value: 2.8, trend: 0|-1|1 }
}
```

Logica trend: `trend = current - opening > 0.05 ? 1 : (< -0.05 ? -1 : 0)`

### `normalizePointsForBundle(pointsData)`
**File**: `backend/server.js` L3425-3480

Normalizza point-by-point dal formato database:
```js
// Output per PointByPointTab:
{
  points: [{
    time: "12:31",
    set: 2,
    game: 6,
    server: "home|away",
    score: "0-40",
    description: "Double fault",
    type: "double_fault|ace|break_point|normal",
    isBreakPoint: true,
    isKeyPoint: true,
    rallyLength: 8
  }],
  hasMore: false,
  total: 45
}
```

---

## 1️⃣7️⃣ TAB DATA CONTRACTS (Implementati)

### tabs.strategies
```json
{
  "signals": [{
    "id": "lay-the-winner",
    "name": "Lay The Winner",
    "status": "OFF|WATCH|READY",
    "confidence": 0.78,
    "action": "LAY|BACK|null",
    "target": "home|away|null",
    "entryRule": "...",
    "exitRule": "...",
    "reasons": ["reason1", "reason2"],
    "conditions": {
      "set1Winner": true,
      "favoriteLeading": false,
      "lowOdds": true
    }
  }],
  "summary": { "ready": 0, "watch": 0, "off": 5 },
  "lastUpdated": "2025-12-24T01:55:55.456Z"
}
```

### tabs.odds
```json
{
  "matchWinner": {
    "home": { "value": 1.5, "trend": 0 },
    "away": { "value": 2.8, "trend": 0 }
  },
  "history": [{ "id": 1, "match_id": 123, "odds_player1": 1.5, ... }],
  "spreads": null,
  "totals": null
}
```

### tabs.stats
```json
{
  "serve": {
    "home": { "aces": 5, "doubleFaults": 2, "firstServePct": 62, "firstServeWonPct": 74, "secondServeWonPct": 48 },
    "away": { "aces": 8, "doubleFaults": 3, "firstServePct": 58, "firstServeWonPct": 69, "secondServeWonPct": 52 }
  },
  "return": {
    "home": { "returnPointsWonPct": 45, "breakPointsWon": 2, "breakPointsTotal": 4 },
    "away": { "returnPointsWonPct": 38, "breakPointsWon": 1, "breakPointsTotal": 3 }
  },
  "points": {
    "home": { "totalWon": 65, "winners": 12, "unforcedErrors": 8 },
    "away": { "totalWon": 58, "winners": 15, "unforcedErrors": 14 }
  }
}
```

### tabs.momentum
```json
{
  "powerRankings": [{ "value": 12 }, { "value": 18 }, ...],
  "features": {
    "trend": "stable|rising|falling",
    "recentSwing": 0,
    "breakCount": 2
  },
  "qualityStats": {
    "home": { "winners": 12, "ue": 8 },
    "away": { "winners": 15, "ue": 14 }
  }
}
```

### tabs.predictor
```json
{
  "winProbability": { "home": 50, "away": 50 },
  "keyFactors": [
    { "label": "Serve dominance", "value": "+12%", "impact": "positive|negative|neutral" }
  ],
  "breakProbability": 25
}
```

---

## 🎾 POINT-BY-POINT E BREAK DETECTION

### Flusso dati (FILOSOFIA: SofaScore → DB → Frontend)

```
1. Match richiesto via /api/match/:id/bundle
2. Controlla se esiste nel DB (matches_new + point_by_point)
3. SE non esiste O dati incompleti:
   → syncMatch() fetcha da SofaScore
   → Salva nel DB (matches_new, point_by_point, power_rankings)
4. Leggi dal DB e normalizza
5. Restituisci al frontend
```

### Tabelle coinvolte

| Tabella | Descrizione | Campi chiave |
|---------|-------------|--------------|
| `matches_new` | Match base | `id`, `home_score`, `away_score`, `status` |
| `point_by_point` | Punti dettagliati | `serving`, `scoring`, `point_winner` |
| `power_rankings` | Momentum per game | `value`, `home_score`, `away_score` |

### Break Detection nel DB

Il break viene calcolato dalla tabella `point_by_point`:
- `serving = 1` → Home serve
- `serving = 2` → Away serve
- `scoring = 1` → Home vince il game
- `scoring = 2` → Away vince il game
- **BREAK** = `serving !== scoring` (chi serve perde)

### Formato normalizzato per frontend

```json
{
  "points": [{
    "set": 1,
    "game": 1,
    "server": "home",
    "score": "15-0",
    "pointWinner": "home",
    "gameServer": "home",
    "gameWinner": "home",
    "gameIsBreak": false
  }],
  "games": [{
    "set": 1,
    "game": 1,
    "gameServer": "home",
    "gameWinner": "home",
    "gameIsBreak": false,
    "pointsCount": 4
  }],
  "source": "database"
}
```

### File implementazione

| File | Funzione | Descrizione |
|------|----------|-------------|
| `backend/server.js` L3305-3380 | Bundle endpoint | Sync automatico se mancante |
| `backend/server.js` L3685-3800 | `normalizePointsForBundle()` | Calcola gameIsBreak |
| `backend/db/matchRepository.js` L366-425 | `insertPointByPoint()` | Salva serving/scoring |
| `backend/liveManager.js` L1132-1150 | `syncMatch()` | Fetch + save da SofaScore |
| `src/components/match/tabs/PointByPointTab.jsx` | Frontend | Mostra break games |

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md) | [📚 INDEX](../../INDEX_FILOSOFIE.md) | [FRONTEND_UI](../ui/FILOSOFIA_FRONTEND.md) |

---

**Fine documento – FILOSOFIA_FRONTEND_DATA_CONSUMPTION**
