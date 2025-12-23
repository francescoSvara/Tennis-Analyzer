# 📖 FILOSOFIA FRONTEND – DOCUMENTO UNIFICATO

> **Scopo**: Documento completo che unisce visual design, backend allacci, JSON schema e motion/icons spec.

---

## 🧠 PRINCIPIO BASE DEL FRONTEND

👉 **L'utente non deve "pensare", deve confermare una decisione.**

- ❌ NO dashboard piene di numeri
- ✅ SI semafori, stati, contesto
- Ogni strategia è una card indipendente
- Massimo 1 azione suggerita alla volta

---

# 📐 ARCHITETTURA INFORMATIVA (IA)

```
HOME (Lobby)
 ├─ Live Matches (selezione)
 ├─ Watchlist ⭐
 ├─ Alerts 🔔
 └─ Settings / Bankroll / Risk

MATCH (layout con sidebar)
 ├─ Overview (operativa)
 ├─ Strategie Live (hub trading)
 ├─ Odds (mercato + ladder)
 ├─ Point-by-point (log eventi)
 ├─ Stats (standard + avanzate)
 ├─ Momentum (trend + run)
 ├─ Predictor (probabilità + edge)
 └─ Journal (facoltativo ma fortissimo)
```

---

# 🏠 HOME (LOBBY)

## 🎨 Visual Design

**Obiettivo**: in 20 secondi l'utente deve scegliere quale match è "tradabile".

```
┌────────────────────────────────────────────────────────────┐
│ 🎾 HOME – LIVE TRADING HUB                                  │
│ Bankroll: €2,500  | Exposure: €120 | Alerts: 3 🔔           │
└────────────────────────────────────────────────────────────┘

┌───────────────┐  ┌─────────────────────────────────────────┐
│ ⭐ WATCHLIST   │  │ 🔥 LIVE MATCHES (ORDINA PER EDGE)        │
│               │  │                                         │
│ 1) Match A    │  │ ┌─────────────────────────────────────┐ │
│ 2) Match B    │  │ │ Djokovic vs Zverev                  │ │
│ 3) Match C    │  │ │ Set 1–0 | 2°set 2–3 | Serve: Z      │ │
│               │  │ │ Odds: D 2.10 | Z 1.78                │ │
│               │  │ │ 🟢 Strategy READY: Banca Servizio    │ │
│               │  │ │ Edge: +3.4% | Volatility: HIGH       │ │
│               │  │ └─────────────────────────────────────┘ │
│               │  │  ... altri match                        │
└───────────────┘  └─────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ 🧭 ALERTS / SIGNALS (ultimi 10)                             │
│ 12:31 🟢 LAY THE WINNER READY su Match X (quota 1.58)       │
│ 12:29 🟡 SUPER BREAK WATCH su Match Y (dom 66%)             │
└────────────────────────────────────────────────────────────┘
```

### Ogni "match row" deve avere:
- Stato match (set/game/serve)
- Odds principali (2-way)
- Semaforo strategie: quante sono 🟢/🟡
- Edge stimato
- Volatilità/velocità (per capire se è "tradabile")
- Bottone: **Apri Match**

---

## ⚙️ Backend Functions (HOME)

### Endpoint
```
GET /api/home/live → lista match live + mini card + count strategie 🟢/🟡
```

### Funzioni Backend da usare:

| Funzione | File | Scopo |
|----------|------|-------|
| `liveManager.fetchLiveList()` | `backend/liveManager.js` | Recupera lista match live |
| `matchCardService.getMatchCard()` | `backend/services/matchCardService.js` | Assembla card match con snapshot |
| `valueInterpreter.getVolatility()` | `backend/utils/valueInterpreter.js` | Calcola volatilità |
| `valueInterpreter.getElasticity()` | `backend/utils/valueInterpreter.js` | Calcola elasticità |
| `strategyEngine.evaluateAll()` | `backend/strategies/strategyEngine.js` (NUOVO) | Valuta strategie e ritorna count ready/watch |

---

# 🎾 MATCH PAGE – LAYOUT GENERALE

## 🎨 Visual Design

**Struttura a 3 zone**: Header sticky + Sidebar + Main Tabs + Right Rail

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ 🎾 MATCH: Djokovic vs Zverev                          🔔 Alerts(1)   ⚙️        │
│ Set: 1–0 | Game: 2–3 | Serve: Zverev | Surface: Hard | Tournament: ATP 500     │
│ Odds: D 2.10  (↘)   | Z 1.78 (↗)   | Volatility: HIGH | Liquidity: MED         │
└───────────────────────────────────────────────────────────────────────────────┘

┌───────────────┐  ┌───────────────────────────────────────────────┐  ┌─────────┐
│ Sidebar       │  │ MAIN (TAB)                                     │  │ RIGHT   │
│               │  │                                               │  │ RAIL    │
│ ▶ Overview    │  │ [ tab bar ]                                   │  │         │
│   Strategie   │  │ Overview | Strategie | Odds | P-by-P | Stats   │  │ Quick   │
│   Odds        │  │ Momentum | Predictor | Journal                 │  │ Trades  │
│   Point-by-pt │  │                                               │  │         │
│   Stats       │  │ (contenuto tab)                                │  │ Odds +  │
│   Momentum    │  │                                               │  │ CTA     │
│   Predictor   │  │                                               │  │         │
│   Journal ⭐   │  │                                               │  │ Risk    │
└───────────────┘  └───────────────────────────────────────────────┘  └─────────┘
```

**Perché Right Rail?** Da gambler vuoi eseguire senza cambiare tab: vedere odds + bottone strategia sempre a portata.

---

## ⚙️ Backend Functions (Match Page Base)

### Endpoint REST + WS
```
GET  /api/match/:id/overview → scoreboard, odds, quick signals, strategy summary
GET  /api/match/:id/bundle?tabs=overview,strategies,odds,... → payload unificato
WS   /ws/match/:id → push: scoreboard, odds, pbp, strategy signals, momentum
```

### Funzioni Backend da usare:

| Funzione | File | Scopo |
|----------|------|-------|
| `liveManager.getTrackedMatch()` | `backend/liveManager.js` | Match live snapshot |
| `rawEventsProcessor.processRawEvents()` | `backend/services/rawEventsProcessor.js` | Pipeline RAW → Canonical |
| `valueInterpreter.*` | `backend/utils/valueInterpreter.js` | Volatility, elasticity, character |
| `pressureCalculator.calculatePressureIndex()` | `backend/utils/pressureCalculator.js` | Pressure index |

---

# 📑 TAB: OVERVIEW (Operativa)

## 🎨 Visual Design

È la pagina che l'utente tiene aperta mentre guarda il match.

```
┌────────────────────────────── OVERVIEW ──────────────────────────────┐
│ ┌────────────── Scoreboard ──────────────┐   ┌────── Quick Signals ─┐ │
│ │ Set1: D 6  Z 4                          │   │ Serve diff: +0.18    │ │
│ │ Set2: D 2  Z 3   (Serve: Z)             │   │ Hold diff:  -0.05    │ │
│ │ Point: 0–40                             │   │ Pressure: HIGH (Z)   │ │
│ └─────────────────────────────────────────┘   │ Break next game: 22% │ │
│                                               └──────────────────────┘ │
│ ┌──────────────────────── Strategy Mini Panel ───────────────────────┐ │
│ │ 🟢 Banca Servizio  | READY | target: Zverev | entry: LAY | exit: break/hold │
│ │ 🟡 Lay the Winner  | WATCH | wait: BP in 2° set                         │
│ │ 🔴 Super Break     | OFF   | dominance < 60% or nextToServe mismatch     │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────── Mini Momentum (last 10 points) ──────────────────────┐ │
│ │ D: ● ○ ● ● ○ ● ○ ● ○ ●    Z: ○ ● ○ ○ ● ○ ● ○ ● ○                    │
│ └─────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

**Regola**: Overview = sintesi + decisione.

### Contenuti:
- Scoreboard completo
- Indicatori rapidi (fatigue, break chances, clutch)
- Mini momentum
- Stato strategie (riassunto)

---

## ⚙️ Backend Functions (Overview)

### Endpoint
```
GET /api/match/:id/overview
```

### Funzioni Backend da usare:

| Funzione | File | Scopo |
|----------|------|-------|
| `pressureCalculator.calculatePressureIndex()` | `backend/utils/pressureCalculator.js` | Calcola pressure index server/receiver |
| `valueInterpreter.getVolatility()` | `backend/utils/valueInterpreter.js` | Volatilità |
| `valueInterpreter.getElasticity()` | `backend/utils/valueInterpreter.js` | Elasticità |
| `valueInterpreter.getMatchCharacter()` | `backend/utils/valueInterpreter.js` | Carattere match (COMEBACK_PRONE, etc) |
| `breakDetector.calculateBreaksFromPbp()` | `backend/utils/breakDetector.js` | Calcola break da PbP |
| `strategyEngine.getSummary()` | `backend/strategies/strategyEngine.js` (NUOVO) | Count ready/watch/off |

### Dati Quick Signals:
```js
quickSignals: {
  volatility: { value: 0.62, label: "HIGH" },
  elasticity: { value: 0.48, label: "MED" },
  pressure: {
    server: { value: 0.83, label: "HIGH", playerId: "p_002" },
    receiver: { value: 0.41, label: "MED", playerId: "p_001" }
  },
  matchCharacter: { label: "COMEBACK_PRONE" }
}
```

---

# 📑 TAB: STRATEGIE LIVE (Hub Trading)

## 🎨 Visual Design

```
┌──────────────────────────── STRATEGIE LIVE ───────────────────────────┐
│ Filtro: [Tutte] [🟢 READY] [🟡 WATCH] [Solo preferite ⭐]               │
│ Auto-Refresh: ON  |  Anti-spam: ON  |  Cooldown segnali: 30s           │
│                                                                        │
│ ┌─────────────────────────── Card 1 ────────────────────────────────┐  │
│ │ 🟢 BANCA SERVIZIO        Confidence: 0.78     Risk: MED            │  │
│ │ Target: Zverev  | Score: 0–40 | HoldDifficulty: HIGH               │  │
│ │ Conditions:  ✔ holdDifficulty HIGH  ✔ score in {0-30,0-40,15-40}    │  │
│ │ Action:  [ LAY ZVEREV ]  Stake: 10€  Liability cap: 30€            │  │
│ │ Exit: break point convertito OR hold (fine game)                   │  │
│ │ Why: "Servizio sotto pressione, probabile break point imminente."  │  │
│ └───────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│ ┌─────────────────────────── Card 2 ────────────────────────────────┐  │
│ │ 🟡 LAY THE WINNER        Confidence: 0.61     Risk: HIGH            │  │
│ │ Target: Winner 1° set (Zverev) | Odds: 1.58 | Favorito: Djokovic    │  │
│ │ Waiting for: break point nel 2° set                                 │  │
│ │ Action:  (disabled finché non READY)                                │  │
│ │ Exit: al BP / al break del favorito / fine game                      │  │
│ └───────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│ ┌─────────────────────────── Card 3 ────────────────────────────────┐  │
│ │ 🔴 SUPER BREAK           Confidence: --        Risk: MED            │  │
│ │ Req: dominance>60 + dominant=server + nextToServe != dominant + ATP │  │
│ │ Missing: dominance=54 (serve dominance troppo bassa)                │  │
│ └───────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│ ┌────────────────────────── Strategy Event Log ──────────────────────┐  │
│ │ 12:31 🟢 Banca Servizio READY (0–40)                                │  │
│ │ 12:30 🟡 Lay Winner WATCH (odds 1.58, set2)                         │  │
│ └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Card Strategia – Struttura Standard

```
┌──────────────────────────────────────────┐
│ 🟠 LAY THE WINNER                         │
│ Stato: ⚠️ ATTENZIONE                     │
├──────────────────────────────────────────┤
│ 🎯 Target: Zverev                        │
│ 💰 Quota attuale: 1.52                   │
│ ⏱️ Fase match: 2° set                    │
│                                          │
│ 📊 CONDIZIONI                            │
│ ✔ Favorito sotto di un set               │
│ ✔ Quote non ancora corrette              │
│ ✔ Storico rimonte: ALTO                  │
│                                          │
│ 🧠 MOTIVO                                │
│ "Mercato sottostima il recupero          │
│ del favorito"                            │
│                                          │
│ ▶️ AZIONE CONSIGLIATA                    │
│ [ LAY ZVEREV ]                            │
│                                          │
│ ⛔ STOP STRATEGIA                        │
│ Break del favorito / Fine game           │
└──────────────────────────────────────────┘
```

---

## 🔴🟡🟢 Sistema di Stato (FONDAMENTALE)

| Stato | Significato UX |
|-------|---------------|
| 🟢 READY | Condizioni perfette → entra |
| 🟡 WATCH | Quasi pronta → osserva |
| 🔴 OFF | Non valida → ignora |

**Questo evita overtrading.**

---

## 🧠 Strategie Specifiche

### STRATEGIA 1 – LAY THE WINNER

**Dati Front Essenziali:**
- ✔ Set attuale
- ✔ Vincitore 1° set
- ✔ Quota vincitore 1° set
- ✔ Chi è il favorito
- ✔ Break point 2° set (live)

```
LAY THE WINNER
━━━━━━━━━━━━━━━━
Set: 1–0 ❌
Quota: 1.48 ⚠️
Favorito: Djokovic

⏳ Aspetta break point
```

### STRATEGIA 2 – BANCA SERVIZIO (Tattica)

Card più piccola, più aggressiva:

```
┌──────────────────────────┐
│ 🔥 BANCA SERVIZIO        │
│ Stato: 🟢 READY          │
├──────────────────────────┤
│ 🎾 Servizio: Medvedev    │
│ 📉 Pressione: ALTA       │
│ 📊 Score: 0–40           │
│                          │
│ ▶️ LAY MEDVEDEV          │
│ ⏱️ Esci: break o hold    │
└──────────────────────────┘
```

**Il tempo è tutto** → pulsante grande → testo minimo → colori forti

### STRATEGIA 3 – SUPER BREAK (Strategica)

Più "di lettura", serve contesto visivo:

```
┌──────────────────────────────────────────┐
│ ⚡ SUPER BREAK                            │
│ Stato: 🟡 WATCH                          │
├──────────────────────────────────────────┤
│ Dominante: Djokovic                      │
│ Dominanza servizio: 68%                  │
│ Prossimo servizio: Avversario            │
│ Match: ATP                               │
│                                          │
│ 📈 Scenario                              │
│ Break raro → valore alto                 │
│                                          │
│ ▶️ BACK DJOKOVIC                          │
│ 🎯 Obiettivo: free bet                   │
└──────────────────────────────────────────┘
```

---

## 📊 Sezione Performance (per fiducia)

```
📊 PERFORMANCE STRATEGIA
✔ Win Rate: 63%
✔ ROI medio: +4.1%
✔ Match ideali: ATP, favoriti top 10
```

NON in tempo reale. Serve solo per fiducia psicologica.

---

## ⚙️ Backend Functions (Strategie)

### Endpoint
```
GET /api/match/:id/strategies
WS  → push: strategy signals
```

### Nuovo: Strategy Engine
**File da creare**: `backend/strategies/strategyEngine.js`

```js
// Ogni strategia ritorna sempre lo stesso schema:
{
  id,
  status: "OFF" | "WATCH" | "READY",
  action: "BACK" | "LAY" | null,
  target,
  confidence,
  entryRule,
  exitRule,
  reasons: [ ... ],
  requiredData: [ ... ],
  risk: { stakeSuggested, liabilityCap }
}
```

### Funzioni Backend da usare:

| Funzione | File | Scopo |
|----------|------|-------|
| `strategyEngine.evaluateLayWinner()` | `backend/strategies/strategyEngine.js` | Valuta Lay The Winner |
| `strategyEngine.evaluateBancaServizio()` | `backend/strategies/strategyEngine.js` | Valuta Banca Servizio |
| `strategyEngine.evaluateSuperBreak()` | `backend/strategies/strategyEngine.js` | Valuta Super Break |
| `pressureCalculator.getHoldDifficulty()` | `backend/utils/pressureCalculator.js` | Hold difficulty |

### Dipendenze dati per le 3 strategie:

| Strategia | Dati Necessari |
|-----------|---------------|
| **Lay Winner** | set, winner1set, favorite, odds winner1set |
| **Banca Servizio** | servingPlayer + scoreKey + holdDifficulty "last game" |
| **Super Break** | dominantPlayer + dominanceValue + nextToServe + matchType |

### Calcoli Backend necessari:
- `lastGameData.holdDifficulty`
- `dominanceValue` (serve dominance)
- `nextToServe`

---

# 📑 TAB: ODDS (Mercato + Esecuzione)

## 🎨 Visual Design

Deve sembrare una piattaforma trading, non un box quote.

```
┌───────────────────────────────── ODDS ─────────────────────────────────┐
│ Market: Match Odds  | (toggle) Set Winner | Next Game Winner            │
│                                                                         │
│ Djokovic: 2.10 (↘)   Implied: 47.6%    |   Zverev: 1.78 (↗)  56.2%      │
│ [mini chart 5m]                                                         │
│                                                                         │
│ Stake Presets: [5] [10] [25] [50]   Custom: [  ]  Liability cap: [30]  │
│                                                                         │
│ ┌────────────── Quick Tickets ──────────────┐  ┌──── Market Context ─┐ │
│ │ BACK Djokovic   [ 2.10 ]  [ PLACE ]       │  │ 🟢 Strategy READY:   │ │
│ │ LAY  Djokovic   [ 2.12 ]  [ PLACE ]       │  │ Banca Servizio       │ │
│ │ BACK Zverev     [ 1.78 ]  [ PLACE ]       │  │ Entry recommended:   │ │
│ │ LAY  Zverev     [ 1.80 ]  [ PLACE ]       │  │ LAY Zverev now       │ │
│ └───────────────────────────────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Contenuti:
- Odds attuali + mini chart ultimi 2–5 minuti
- Ladder (se la supporti)
- Spread / liquidità (anche stimata)
- Pulsanti rapidi (BACK / LAY) con stake predefinita
- Overlay con "strategy context"

---

## ⚙️ Backend Functions (Odds)

### Endpoint
```
GET /api/match/:id/odds
```

### Nuovo: Odds Service
**File da creare**: `backend/services/oddsService.js`

| Funzione | Scopo |
|----------|-------|
| `oddsService.calculateImpliedProbability()` | Probabilità implicita dalle quote |
| `oddsService.calculateFairOdds()` | Fair odds da ranking + stats |
| `oddsService.detectValueEdge()` | Rileva edge vs mercato |

### Fonti Dati:
- Pre-match: `match_odds`
- Live: feed da `liveManager` o refresh scraper

---

# 📑 TAB: POINT-BY-POINT (Log + Trigger)

## 🎨 Visual Design

```
┌──────────────────────────── POINT BY POINT ────────────────────────────┐
│ Filters: [All] [Break points] [Double faults] [Long rallies] [Key pts]  │
│                                                                          │
│ 12:31  Set2 G6  Z serve  0–40   DF ❗  (Pressure spike)                   │
│ 12:31  Set2 G6  Z serve  0–30   2nd serve won by D                        │
│ 12:30  Set2 G6  Z serve  0–15   Rally 18 shots (Return winner D)          │
│ ...                                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Contenuti:
- Feed punti con timestamp
- Highlight momenti: break point, double fault, medical, challenge
- Filtri: "solo punti chiave"

---

## ⚙️ Backend Functions (Point-by-Point)

### Endpoint
```
GET /api/match/:id/point-by-point
```

### Funzioni Backend da usare:

| Funzione | File | Scopo |
|----------|------|-------|
| `sofascoreScraper.getPointByPoint()` | `backend/scraper/sofascoreScraper.js` | Fetch PbP da SofaScore |
| `breakDetector.calculateBreaksFromPbp()` | `backend/utils/breakDetector.js` | Calcola break da PbP |

### Arricchimento:
- Tag break point / set point / match point
- Detect break

### Convention Provider:
```js
providerConvention: {
  serving: { "1": "home", "2": "away" },
  scoring: { "1": "home", "2": "away" },
  breakRule: "serving != scoring"
}
```

---

# 📑 TAB: STATS (Standard + Trading)

## 🎨 Visual Design

```
┌────────────────────────────── STATS ───────────────────────────────────┐
│ Standard                    | Trading-Oriented                           │
│ 1st in: 62% vs 58%          | HoldDifficulty (last service): HIGH (Z)    │
│ 1st won: 74% vs 69%         | Pressure points won: 31% vs 55%            │
│ 2nd won: 48% vs 52%         | Break chance next game: 22%                │
│ BP saved: 2/4 vs 3/3        | Clutch index (last 10): -0.6 vs +0.4        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Contenuti Standard:
- 1st in, 1st won, 2nd won, BP saved/converted

### Contenuti "Trading-Oriented":
- Hold% live stimata
- Break conversion trend (ultimi 3 turni)
- Pressure points won% (30–30 / deuce / BP)
- Error rate sotto pressione

---

## ⚙️ Backend Functions (Stats)

### Endpoint
```
GET /api/match/:id/stats
```

### Funzioni Backend da usare:

| Funzione | File | Scopo |
|----------|------|-------|
| `pressureCalculator.calculatePressureIndex()` | `backend/utils/pressureCalculator.js` | Pressure |
| `matchSegmenter.segmentMatch()` | `backend/utils/matchSegmenter.js` | Segmentazione match |
| `sofascoreScraper.getStatistics()` | `backend/scraper/sofascoreScraper.js` | Stats da SofaScore |

### Fonte: `match_statistics_new` + calcoli dinamici

---

# 📑 TAB: MOMENTUM (Trend + Run)

## 🎨 Visual Design

```
┌──────────────────────────── MOMENTUM ───────────────────────────────────┐
│ Last 10 points:   D 6  |  Z 4                                             │
│ Runs:             D (4/5)  Z (2/3)                                        │
│ Quality:          Winners D: 3  | UE D: 1  | UE Z: 3                      │
│ Serve dominance:  D 68%  |  Z 54%                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

### Contenuti:
- Punti ultimi 10 / 20
- Run (es: 6 su 7)
- Quality: winners vs errors
- "Serve dominance" (utile per Super Break)

---

## ⚙️ Backend Functions (Momentum)

### Endpoint
```
GET /api/match/:id/momentum
```

### Nuovo: Momentum Service
**File da creare**: `backend/services/momentumService.js`

| Funzione | Scopo |
|----------|-------|
| `momentumService.analyzeMomentumOwner()` | Chi domina il momentum |
| `momentumService.detectMomentumShift()` | Rileva shift momentum |

### Funzioni Backend da usare:

| Funzione | File | Scopo |
|----------|------|-------|
| `sofascoreScraper.getPowerRankings()` | `backend/scraper/sofascoreScraper.js` | Power rankings |
| `svgMomentumExtractor.extract()` | `backend/utils/svgMomentumExtractor.js` | Fallback SVG |

### Fonti:
- Primary: `match_power_rankings_new.value`
- Fallback: `value_svg` tramite `getPowerRankings()` (COALESCE)

---

# 📑 TAB: PREDICTOR (Probabilità + Edge)

## 🎨 Visual Design

```
┌──────────────────────────── PREDICTOR ──────────────────────────────────┐
│ Win Prob (model):   D 49% | Z 51%        Confidence band: MED             │
│ Market implied:     D 47.6% | Z 56.2%                                     │
│ Edge:               +1.4% su D   (WARNING: liquidity MED)                 │
│ Drivers: return points ↑, pressure points ↑, serve dominance ↑            │
└──────────────────────────────────────────────────────────────────────────┘
```

### Contenuti:
- Win probability live (con banda confidenza)
- Break next game probability
- Edge vs mercato (implied probability)
- Motivazione breve (feature top)

---

## ⚙️ Backend Functions (Predictor)

### Endpoint
```
GET /api/match/:id/predictor
```

### Nuovo: Predictor Service
**File da creare**: `backend/services/predictorService.js`

| Funzione | Scopo |
|----------|-------|
| `predictorService.computeWinProbability()` | Win prob live |
| `predictorService.computeBreakNextGameProbability()` | Prob break prossimo game |
| `predictorService.computeEdgeVsMarket()` | Edge vs mercato |

### Funzioni Backend da usare:

| Funzione | File | Scopo |
|----------|------|-------|
| `playerStatsService.getPlayerStats()` | `backend/services/playerStatsService.js` | Stats giocatore + comeback rate |
| `valueInterpreter.*` | `backend/utils/valueInterpreter.js` | Volatility/elasticity |
| `oddsService.calculateImpliedProbability()` | `backend/services/oddsService.js` | Implied prob |

---

# 📑 TAB: JOURNAL (Log Trade)

## 🎨 Visual Design

```
┌────────────────────────────── JOURNAL ──────────────────────────────────┐
│ [ + New Trade ]  Auto-log: ON (when strategy CTA used)                    │
│                                                                          │
│ 12:31  Strategy: Banca Servizio | LAY Zverev | stake 10€ | exit: break ✅  │
│ P/L: +6.2€ | Notes: "DF sul 0-40, entry perfetta"                         │
│                                                                          │
│ Export: [CSV]  | Filters: [strategy] [match] [date]                       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Contenuti:
- Entry/exit
- Strategia usata
- Motivo (auto-compilato dalla strategia)
- Outcome
- Note utente
- Esportazione CSV

---

## ⚙️ Backend Functions (Journal)

### Endpoint
```
POST /api/match/:id/trade → salva trade
GET  /api/match/:id/journal → recupera log
```

### Nuovo: Journal/Trade Table
- Tabella: `trades` o `strategy_actions`
- Auto-log da frontend quando clicca CTA

---

# 📑 RIGHT RAIL (Sempre Presente)

## 🎨 Visual Design

```
┌──────────────────────── RIGHT RAIL ────────────────────────┐
│ 🟢 NOW READY: BANCA SERVIZIO                                 │
│ Target: Zverev | Score: 0–40 | Confidence: 0.78             │
│ [ LAY ZVEREV ]   Stake: 10€   Liability cap: 30€            │
│ Exit rule: break OR hold (fine game)                        │
│─────────────────────────────────────────────────────────────│
│ Odds Quick View                                              │
│ Zverev: 1.78 (↗)   Djokovic: 2.10 (↘)                        │
│─────────────────────────────────────────────────────────────│
│ Risk Controls                                                 │
│ Exposure this match: 20€ / Max 60€                            │
│ Daily stop: -50€  (current: -12€)                             │
│ Toggle: [Auto-cashout OFF] [Notifications ON]                 │
└─────────────────────────────────────────────────────────────┘
```

Questa parte aumenta tantissimo l'usabilità.

---

# 📋 RIASSUNTO ALLACCI BACKEND

## Mattoni Esistenti (Riusabili)

| File | Funzionalità |
|------|-------------|
| `backend/liveManager.js` | Polling, reconcile, tracked matches, broadcast |
| `backend/db/liveTrackingRepository.js` | CRUD tracking |
| `backend/scraper/sofascoreScraper.js` | Endpoint SofaScore (event, statistics, power rankings, PbP) |
| `backend/services/rawEventsProcessor.js` | Pipeline RAW → Canonical |
| `backend/services/calculationQueueWorker.js` | Task async |
| `backend/utils/valueInterpreter.js` | Volatility, elasticity, match character, power rankings enhanced |
| `backend/utils/pressureCalculator.js` | Pressure index |
| `backend/utils/breakDetector.js` | Break detection |
| `backend/utils/matchSegmenter.js` | Fasi match |
| `backend/services/matchCardService.js` | Match card assembly + snapshots |

## Nuovi Servizi da Creare

| File | Funzionalità |
|------|-------------|
| `backend/strategies/strategyEngine.js` | Strategy evaluation engine |
| `backend/services/oddsService.js` | Implied prob, fair odds, edge |
| `backend/services/momentumService.js` | Momentum owner, shift detection |
| `backend/services/predictorService.js` | Win prob, break prob, edge vs market |

## Spostamenti Obbligati

- ❌ FE scraping → ✅ Solo backend
- ❌ Duplicazione pressure calcs → ✅ Pressure calcolato backend, FE solo render
- ❌ Strategie in FE utils → ✅ Strategy engine backend, FE consuma segnali
- ❌ Data completeness in FE → ✅ Backend calcola completeness e manda badge

---

# 📦 JSON SCHEMA – MATCH BUNDLE

```json
{
  "schemaVersion": "match-bundle.v1",
  "generatedAt": "2025-12-23T14:05:12.123Z",
  "matchId": "sofascore:12345678",
  "source": {
    "provider": "sofascore",
    "eventId": 12345678,
    "isLive": true,
    "lastIngestAt": "2025-12-23T14:05:10.800Z"
  },

  "header": {
    "tournament": {
      "name": "ATP 500 Vienna",
      "surface": "HARD",
      "round": "QF"
    },
    "players": {
      "home": { "id": "p_001", "name": "Novak Djokovic" },
      "away": { "id": "p_002", "name": "Alexander Zverev" }
    },
    "favoritePlayerId": "p_001",
    "matchType": "ATP",
    "bestOf": 3,

    "score": {
      "sets": { "home": 1, "away": 0 },
      "games": { "home": 2, "away": 3 },
      "point": { "home": 0, "away": 40 },
      "isTiebreak": false,
      "tiebreakPoint": null,
      "servingSide": "away",
      "serverPlayerId": "p_002",
      "nextToServePlayerId": "p_001"
    },

    "market": {
      "matchOdds": {
        "home": { "back": 2.10, "lay": 2.12, "last": 2.10 },
        "away": { "back": 1.78, "lay": 1.80, "last": 1.78 }
      },
      "trend": {
        "windowSec": 300,
        "homeDelta": -0.06,
        "awayDelta": 0.04
      },
      "liquidity": {
        "level": "MED",
        "spreadPct": 1.1
      }
    },

    "quickSignals": {
      "volatility": { "value": 0.62, "label": "HIGH" },
      "elasticity": { "value": 0.48, "label": "MED" },
      "pressure": {
        "server": { "value": 0.83, "label": "HIGH", "playerId": "p_002" },
        "receiver": { "value": 0.41, "label": "MED", "playerId": "p_001" }
      },
      "matchCharacter": { "label": "COMEBACK_PRONE" }
    }
  },

  "tabs": {
    "overview": {
      "miniMomentum": {
        "lastNPoints": 10,
        "sequence": [
          { "winnerSide": "home", "isKey": false },
          { "winnerSide": "away", "isKey": true }
        ]
      },
      "strategySummary": {
        "readyCount": 1,
        "watchCount": 1,
        "offCount": 1,
        "topReadyStrategyId": "banca_servizio"
      }
    },

    "strategies": {
      "cooldownSec": 30,
      "antiFlap": { "enabled": true, "minStableTicks": 2 },
      "signals": [
        {
          "id": "banca_servizio",
          "name": "Banca Servizio",
          "status": "READY",
          "confidence": 0.78,
          "riskTag": "MED",
          "action": { "type": "LAY", "targetPlayerId": "p_002" },
          "entry": {
            "recommendedStake": 10,
            "liabilityCap": 30,
            "market": "matchOdds",
            "notes": "Entry su 0-40 / 15-40 / 0-30 quando holdDifficulty HIGH"
          },
          "exit": {
            "primary": "BREAK_OR_HOLD_END_OF_GAME",
            "guards": ["STOP_IF_SCORE_NORMALIZES", "STOP_IF_TIMEOUT"]
          },
          "conditions": [
            { "label": "HoldDifficulty HIGH (server)", "ok": true },
            { "label": "PointScore in {0-30,0-40,15-40}", "ok": true }
          ],
          "reasons": [
            "Servizio sotto pressione. Probabile break point imminente."
          ],
          "debug": {
            "scoreKey": "0-40",
            "servingPlayerId": "p_002",
            "holdDifficulty": "HIGH"
          }
        },

        {
          "id": "lay_the_winner",
          "name": "Lay the Winner",
          "status": "WATCH",
          "confidence": 0.61,
          "riskTag": "HIGH",
          "action": null,
          "entry": {
            "recommendedStake": 10,
            "liabilityCap": 40,
            "market": "matchOdds",
            "notes": "Entra quando READY (tipicamente su BP nel 2° set)"
          },
          "exit": {
            "primary": "AT_BREAKPOINT_OR_BREAK_OCCURRED",
            "guards": ["STOP_IF_ODDS_MOVED_TOO_FAST"]
          },
          "conditions": [
            { "label": "CurrentSet == 2", "ok": true },
            { "label": "WinnerFirstSet != Favorite", "ok": true },
            { "label": "Odds(winnerFirstSet) < 1.60", "ok": true }
          ],
          "reasons": [
            "Favorito sotto di un set. Quote non aggiornate al rischio."
          ],
          "debug": {
            "currentSet": 2,
            "winnerFirstSetPlayerId": "p_002",
            "favoritePlayerId": "p_001",
            "oddsWinnerFirstSet": 1.58
          }
        },

        {
          "id": "super_break",
          "name": "Super Break",
          "status": "OFF",
          "confidence": null,
          "riskTag": "MED",
          "action": null,
          "entry": { "recommendedStake": 10, "liabilityCap": 30, "market": "matchOdds", "notes": "" },
          "exit": { "primary": "TIEBREAK_OR_BREAK_UNDERDOG", "guards": [] },
          "conditions": [
            { "label": "matchType in {ATP,male}", "ok": true },
            { "label": "dominanceValue > 60", "ok": false },
            { "label": "dominantPlayer == servingPlayer", "ok": false },
            { "label": "nextToServe != dominantPlayer", "ok": true }
          ],
          "reasons": [
            "Non attiva: dominanceValue insufficiente."
          ],
          "debug": {
            "dominanceValue": 54,
            "dominantPlayerId": "p_001",
            "servingPlayerId": "p_002",
            "nextToServePlayerId": "p_001"
          }
        }
      ],
      "eventLog": [
        { "ts": "2025-12-23T14:05:09.000Z", "type": "SIGNAL_READY", "strategyId": "banca_servizio", "note": "0-40 con holdDifficulty HIGH" }
      ]
    },

    "odds": {
      "markets": [
        {
          "key": "matchOdds",
          "label": "Match Odds",
          "runners": {
            "home": { "back": 2.10, "lay": 2.12 },
            "away": { "back": 1.78, "lay": 1.80 }
          }
        }
      ],
      "impliedProbability": {
        "home": 0.476,
        "away": 0.562
      },
      "edge": {
        "home": { "modelProb": 0.49, "marketProb": 0.476, "edge": 0.014 },
        "away": { "modelProb": 0.51, "marketProb": 0.562, "edge": -0.052 }
      }
    },

    "pointByPoint": {
      "providerConvention": {
        "serving": { "1": "home", "2": "away" },
        "scoring": { "1": "home", "2": "away" },
        "breakRule": "serving != scoring"
      },
      "lastN": 50,
      "events": [
        {
          "ts": "2025-12-23T14:05:10.100Z",
          "set": 2,
          "game": 6,
          "point": "0-40",
          "serverSide": "away",
          "winnerSide": "home",
          "tags": ["BREAK_POINT", "DOUBLE_FAULT"]
        }
      ],
      "derived": {
        "breaks": {
          "homeBreaks": 1,
          "awayBreaks": 0,
          "lastBreakAt": "2025-12-23T14:02:12.500Z"
        }
      }
    },

    "stats": {
      "standard": {
        "home": {
          "firstServeInPct": 0.62,
          "firstServeWonPct": 0.74,
          "secondServeWonPct": 0.48,
          "aces": 5,
          "doubleFaults": 1,
          "breakPointsSaved": { "won": 2, "total": 4 }
        },
        "away": {
          "firstServeInPct": 0.58,
          "firstServeWonPct": 0.69,
          "secondServeWonPct": 0.52,
          "aces": 8,
          "doubleFaults": 3,
          "breakPointsSaved": { "won": 3, "total": 3 }
        }
      },
      "tradingOriented": {
        "holdDifficulty": {
          "home": "LOW",
          "away": "HIGH"
        },
        "pressurePointsWonPct": {
          "home": 0.55,
          "away": 0.31
        },
        "breakNextGameProb": {
          "home": 0.22,
          "away": 0.14
        },
        "clutchIndexLast10": {
          "home": 0.40,
          "away": -0.60
        },
        "serveDominance": {
          "home": 0.68,
          "away": 0.54
        }
      }
    },

    "momentum": {
      "series": {
        "source": "power_rankings",
        "fallbackUsed": false,
        "points": [
          { "ts": "2025-12-23T14:04:10.000Z", "value": 12 },
          { "ts": "2025-12-23T14:04:40.000Z", "value": 18 }
        ],
        "normalizedRange": [-100, 100]
      },
      "analysis": {
        "owner": "home",
        "shiftDetected": true,
        "shiftAt": "2025-12-23T14:03:50.000Z",
        "notes": "Owner cambia dopo run 4/5 + DF avversario"
      }
    },

    "predictor": {
      "winProbability": { "home": 0.49, "away": 0.51, "confidence": "MED" },
      "breakNextGameProbability": { "home": 0.22, "away": 0.14 },
      "drivers": [
        { "name": "returnPointsTrend", "impact": "POSITIVE", "side": "home" },
        { "name": "pressureIndexServer", "impact": "NEGATIVE", "side": "away" },
        { "name": "serveDominance", "impact": "POSITIVE", "side": "home" }
      ]
    },

    "journal": {
      "enabled": true,
      "summary": { "trades": 3, "profit": 12.4, "roiPct": 0.8 },
      "items": [
        {
          "id": "t_001",
          "ts": "2025-12-23T14:01:12.000Z",
          "strategyId": "banca_servizio",
          "action": "LAY",
          "targetPlayerId": "p_002",
          "stake": 10,
          "liability": 28,
          "entryOdds": 1.80,
          "exitOdds": 1.62,
          "result": "WIN",
          "pnl": 6.2,
          "notes": "Auto-log CTA click"
        }
      ]
    }
  },

  "dataQuality": {
    "completeness": {
      "overview": 1.0,
      "strategies": 0.95,
      "odds": 0.9,
      "pointByPoint": 0.85,
      "stats": 0.9,
      "momentum": 0.8,
      "predictor": 0.75,
      "journal": 1.0
    },
    "missing": [
      { "field": "tabs.momentum.series.points", "severity": "WARN", "note": "fallback svg disponibile se necessario" }
    ]
  },

  "cache": {
    "ttlSec": 10,
    "etag": "W/\"a1b2c3d4\"",
    "nextRefreshRecommendedSec": 5
  }
}
```

---

# ✨ SPEC MOTION / UI / ICONS

## 1️⃣ Stack Vincolante

- **React + TypeScript**
- **Tailwind CSS**
- **Animazioni**: Framer Motion (primary)
- **Lottie**: opzionale per empty/loading
- **Icone**: Phosphor Icons (primary)
- **Accessibilità**: rispettare `prefers-reduced-motion`

---

## 2️⃣ Obiettivo UX/Motion

- Micro-interazioni sui componenti (hover, tap, focus)
- Transizioni di pagina/route leggere
- Animazioni **data-aware** (quando cambiano filtri e metriche)
- Stati: loading, empty, error e success più curati

---

## 3️⃣ Regole Motion Design

1. Animazioni rapide: **180–420ms max**, niente bounce eccessivo
2. **Easing custom**:
   - Default: `cubic-bezier(0.22, 1, 0.36, 1)` (easeOut "premium")
   - Ingresso: opacity + y (8–16px)
   - Hover: scale 0.98→1 o 1→1.02 con ombra/blur leggero
3. **Layout shift**: usare layout animations quando cambiano card/filtri
4. **Riduzione motion**: se `prefers-reduced-motion`, disattivare spostamenti

---

## 4️⃣ Iconografia

- Usare **un unico set**: Phosphor Icons
- **Weight coerente**: `duotone` o `regular`
- **Dimensioni standard**:
  - Sidebar/menu: 20–22
  - Azioni su card: 18–20
  - KPI header: 24–28

---

## 5️⃣ Varianti Motion Base

### fadeUp
```js
initial: { opacity: 0, y: 12 }
animate: { opacity: 1, y: 0 }
exit:    { opacity: 0, y: 8 }
transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
```

### cardHover
```js
whileHover: { y: -3, scale: 1.01 }
transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
```

### staggerContainer
```js
animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } }
```

---

## 6️⃣ File Motion da Creare

### `src/motion/tokens.ts`
```typescript
export const durations = {
  fast: 0.18,
  normal: 0.32,
  slow: 0.42,
};

export const easings = {
  premium: [0.22, 1, 0.36, 1],
  bounce: [0.175, 0.885, 0.32, 1.275],
};

export const variants = {
  fadeUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: durations.normal, ease: easings.premium },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  cardHover: {
    whileHover: { y: -3, scale: 1.01 },
    transition: { duration: durations.fast, ease: easings.premium },
  },
  staggerContainer: {
    animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
  },
  tableRow: {
    initial: { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 8 },
  },
};
```

---

## 7️⃣ Wrapper Components da Creare

- `<MotionCard>` - Card con hover animation
- `<MotionButton>` - Button con tap/hover feedback
- `<MotionTab>` - Tab con underline animata
- `<MotionRow>` - Row tabella con fade slide

### Esempio MotionCard
```tsx
import { motion } from 'framer-motion';
import { variants, durations, easings } from '@/motion/tokens';

export const MotionCard = ({ children, className, ...props }) => (
  <motion.div
    className={`rounded-2xl shadow-soft border border-subtle ${className}`}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -3, scale: 1.01 }}
    transition={{ duration: durations.normal, ease: easings.premium }}
    {...props}
  >
    {children}
  </motion.div>
);
```

---

## 8️⃣ Look & Feel

- **Card**: `rounded-2xl`, shadow soft, border subtle, spacing generosa
- **Tipografia**: numeri KPI ben leggibili, gerarchia chiara
- **Colore**: 1 colore primario + 1 accento; stati discreti
- **Densità**: dashboard "aria", non troppo compressa

---

## 9️⃣ Stati UI

### Loading
- Skeleton elegante con shimmer leggerissimo
- Lottie SOLO se davvero serve e coerente

### Empty State
- Illustrazione minimale + call to action
- Messaggio chiaro e diretto

### Error State
- Messaggio chiaro + retry button con micro-interazione

### Success Toast
- Snackbar con motion pulita (fade + slide)

---

## 🔟 AnimatePresence

Usare `AnimatePresence` per mount/unmount:
- Modali
- Drawer
- Espansioni accordion
- Tab content

### Esempio
```tsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {content}
    </motion.div>
  )}
</AnimatePresence>
```

---

## 1️⃣1️⃣ prefers-reduced-motion

```tsx
import { useReducedMotion } from 'framer-motion';

const shouldReduceMotion = useReducedMotion();

// Se true: rimuovere y/scale, mantenere solo opacity
const variants = shouldReduceMotion
  ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
  : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
```

---

## 1️⃣2️⃣ Dipendenze NPM

```bash
npm install framer-motion @phosphor-icons/react
# Opzionale:
npm install lottie-react
```

---

# ✅ CHECKLIST FINALE

## Visual/UX
- [ ] Card modulari
- [ ] Stato semaforico (🟢🟡🔴)
- [ ] Azione unica per strategia
- [ ] Dati minimi ma decisivi
- [ ] Psicologia > numeri

## Backend
- [ ] Strategy Engine nel backend
- [ ] Odds Service con edge calculation
- [ ] Momentum Service con shift detection
- [ ] Predictor Service con win probability
- [ ] Niente scraping dal frontend
- [ ] Pressure calculator solo backend

## Motion
- [ ] tokens.ts con durations/easings/variants
- [ ] MotionCard, MotionButton, MotionTab, MotionRow
- [ ] AnimatePresence per mount/unmount
- [ ] prefers-reduced-motion rispettato
- [ ] Phosphor Icons con weight coerente

## Performance
- [ ] UNA sola strategia attiva per match (evita overload)
- [ ] Notifiche solo 🟢 READY (niente spam)
- [ ] Cooldown segnali (anti-flap)
- [ ] Data completeness badge

---

> 📌 **Riferimento**: Questo documento unifica le filosofie frontend, i wireframe visivi, gli allacci backend e le specifiche motion/UI in un unico punto di verità.
