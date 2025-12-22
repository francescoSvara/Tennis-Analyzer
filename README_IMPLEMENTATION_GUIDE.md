# 🎾 TENNIS ANALYZER - IMPLEMENTATION GUIDE

## 📋 Guida Operativa per AI Coding Agent

**Versione:** 2.7  
**Data:** 23 Dicembre 2025  
**Scopo:** Documento operativo per implementare le funzionalità BACKEND rimanenti

---

> **NOTA:** Le funzionalità frontend e i task completati sono stati spostati nel [README.md](README.md)

---

# ✅ TASK COMPLETATI (22 Dicembre 2025 - Sessione 3)

## ✅ Player Profile Aggregator (FIX 23/12 - Stats Fix)
**File:** `backend/services/playerProfileService.js`

**Funzioni implementate:**
- `getPlayerProfile(playerName, options)` - Profilo completo con tutte le metriche
- `compareProfiles(player1, player2, options)` - Confronto tra due giocatori
- `getSurfaceProfile(playerName, surface)` - Profilo specifico per superficie
- `calculateGlobalStats(matches)` - Statistiche globali
- `calculateComebackRate(matches)` - Calcola comeback rate
- `calculateROI(matches)` - ROI con stake fisso
- `calculateFirstSetWinRate(matches)` - % vittoria primo set
- `calculateDecidingSetWinRate(matches)` - % vittoria set decisivo
- `calculateSpecialMetrics(matches)` - Metriche speciali aggregate
- `analyzeRecentForm(matches, count)` - Trend recenti con streak
- `aggregateBySurface/Format/Series(matches)` - Aggregazioni per categoria
- `getPlayerMatches(playerName)` - **FIXED:** Ora cerca sia per winner_name/loser_name che per player_id

---

## ✅ Match Segmentation Engine
**File:** `backend/utils/matchSegmenter.js`

**Funzioni implementate:**
- `segmentMatch(matchData)` - Segmentazione completa in fasi logiche
- `isCriticalGame(homeGames, awayGames)` - Identifica game 4-4, 5-5, TB
- `isSetClosingGame(homeGames, awayGames, server)` - Game che può chiudere set
- `isMatchClosingGame(...)` - Game che può chiudere match
- `detectMomentumShift(prevValue, currValue)` - Rileva shift > 25 punti
- `getServerForGame(set, game, firstServer)` - Chi serve in un game
- `getSegmentSummary(matchData)` - Summary con trading insights
- `analyzeCriticalGames(matchData)` - Focus su game critici
- `analyzeMomentumShifts(matchData)` - Pattern momentum shifts

**Segmenti supportati:**
- PRE_FIRST_BREAK, POST_FIRST_BREAK, CRITICAL_GAMES
- SET_CLOSING, MATCH_CLOSING, MOMENTUM_SHIFT
- SERVE_PRESSURE, BREAK_OPPORTUNITY

---

## ✅ Break Detector
**File:** `backend/utils/breakDetector.js`

**Funzioni implementate:**
- `detectBreaksFromScore(setScore, firstServer)` - Rileva break da punteggio set
- `analyzeSetBreaks(matchData)` - Analisi completa break per match
- `estimateFirstServer(matchData)` - Stima primo servitore da ranking
- `analyzeBreakPatterns(matches, playerName)` - Pattern storici break
- `classifySet(setAnalysis)` - Classifica set (TIGHT, BALANCED, CHAOTIC)
- `generateBreakInsights(sets, ...)` - Genera insights break
- `isValidSetScore(home, away)` - Valida score tennis

---

## ✅ Pressure Index Calculator
**File:** `backend/utils/pressureCalculator.js`

**Funzioni implementate:**
- `calculatePressureIndex(liveStats, matchContext)` - Indice pressione 0-100
- `calculateContextMultiplier(matchContext)` - Moltiplicatore contesto
- `classifyPressure(index)` - MINIMAL/LOW/MODERATE/HIGH/CRITICAL
- `generateRecommendation(...)` - Raccomandazione trading
- `comparePressure(p1Stats, p2Stats, context)` - Confronto pressione
- `calculateDFContribution(doubleFaults)` - Contributo doppi falli
- `calculateFirstServeContribution(pct)` - Contributo first serve won
- `calculateSecondServeContribution(pct)` - Contributo second serve won
- `calculateBPContribution(saved, faced)` - Contributo break points

**Livelli pressione:**
- CRITICAL (70+): Consider Lay
- HIGH (50-69): Alert
- MODERATE (30-49): Watch
- LOW (15-29): Stable
- MINIMAL (0-14): In Control

---

# ✅ TASK COMPLETATI (22 Dicembre 2025 - Precedenti)

## ✅ Momentum Volatility & Elasticity Calculator
**Files:** `backend/utils/valueInterpreter.js`, `src/components/MomentumTab.jsx`

**Funzioni Backend implementate:**
- `calculateVolatility(powerRankings)` - Calcola oscillazione momentum
- `calculateElasticity(powerRankings)` - Misura capacità di recupero
- `classifyMatchCharacter(volatility, elasticity, breakCount)` - Classifica match
- `analyzeMomentumTrend(powerRankings, windowSize)` - Analizza trend
- `analyzePowerRankingsEnhanced(powerRankings, matchContext)` - Analisi completa

**Frontend implementato:**
- Nuova sezione "Analisi Avanzata" in MomentumTab
- Match Character Badge con emoji e colori
- Card Volatilità con barra visuale e statistiche
- Card Elasticità con indicatore resilienza

---

## ✅ Dynamic Surface Thresholds
**File:** `backend/utils/valueInterpreter.js`

**Implementato:**
- Costante `SURFACE_THRESHOLDS` con soglie per Hard/Clay/Grass/Indoor Hard
- Funzione `getThresholdsForSurface(surface)` con match parziale case-insensitive
- Integrazione in `interpretGameValue()`, `analyzePowerRankings()`, `analyzePowerRankingsEnhanced()`
- Clay: soglie più basse (55/18/-18) per match più equilibrati
- Grass: soglie più alte (65/25/-25) per match più volatili

---

## ✅ Enhanced analyzePowerRankings
**File:** `backend/utils/valueInterpreter.js`

**Implementato:**
- `analyzePowerRankingsEnhanced(powerRankings, matchContext)` estesa con:
  - **setAnalysis**: Breakdown momentum per ogni set
  - **playerMomentum**: Chi controlla il match (home/away/balanced)
  - **formatAdjustment**: Adattamento pesi per Bo3/Bo5
  - **tradingIndicators**: riskLevel, layConfidence, comebackOpportunity, recommendedStrategy
  - **percent**: Percentuali normalizzate 0-100 per volatility/elasticity

**Nuove funzioni helper esportate:**
- `analyzeBySet(powerRankings, thresholds)`
- `analyzePlayerMomentum(powerRankings, matchContext)`
- `getFormatAdjustment(bestOf)`
- `calculateTradingIndicators(...)`

---

# ✅ TASK COMPLETATI (23 Dicembre 2025 - Sessione 4)

## ✅ BUG FIX CRITICO: Player Stats Integration con Sofascore
**Files modificati:** 
- `backend/services/playerProfileService.js`
- `backend/services/playerStatsService.js`
- `backend/db/matchRepository.js`
- `backend/scripts/fix-empty-names.js` (NUOVO)

**Problema risolto:**
I match importati da Sofascore avevano `winner_name` e `loser_name` vuoti, causando:
- Statistiche che diminuivano quando si scrapavano nuovi match
- `getPlayerMatches()` non trovava i match Sofascore perché cercava solo per nome

**Soluzioni implementate:**
1. **Dual Search Strategy**: `getPlayerMatches()` ora cerca ANCHE per `home_player_id`/`away_player_id` con JOIN su tabella `players`
2. **Auto-populate names**: `insertMatch()` ora calcola e popola `winner_name`/`loser_name` da `winnerCode` o punteggio set
3. **Merge fix**: `mergeXlsxData()` copia i nomi dal record xlsx se quelli Sofascore sono vuoti
4. **Script fix esistenti**: `fix-empty-names.js` corregge 24 match con nomi vuoti

**Risultato:** Musetti passa da 57 a 68 match (+11 recuperati)

---

# 🚧 TASK BACKEND DA IMPLEMENTARE

## ⬜ TASK: Daily Match Evaluation Report

### Obiettivo
Generare report giornaliero automatico con valutazione match e opportunità trading.

### 📝 Funzionalità
- Fetch automatico match del giorno da API
- Valutazione basata su fattori: superficie, ranking, H2H, momentum patterns
- Output JSON con confidence score per ogni match
- Integrazione con sistema notifiche

---

## ⬜ TASK: Historical Pattern Detector

### Obiettivo
Identificare pattern ricorrenti nel comportamento dei giocatori.

### Pattern da rilevare
- First set loss recovery rate per player
- Break back tendency after being broken
- Tiebreak performance patterns
- Third set specialists

---

## 🎯 COME USARE QUESTO DOCUMENTO

Questo documento è scritto **per un AI coding agent** che ha accesso al codice del progetto Tennis-Analyzer.

**Tu (Agent) hai:**
- Accesso al codice React + Node.js
- Lo stesso README.md di architettura che hai letto
- Questo documento con i concetti da implementare

**Il tuo compito:**
- Leggere ogni sezione
- Capire la logica
- Implementare nel codice esistente
- Marcare completato `/` quando fatto

---

## 🏗️ ARCHITETTURA RAPIDA (RECAP)

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React/Vercel)                                        │
│  - Dashboard visualizzazione                                     │
│  - Match analysis UI                                             │
│  - Quote & Value display                                         │
└─────────────────────────────────────────────────────────────────┘
                          ▲ HTTPS
                          │
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (Node.js/Railway)                                       │
│  - API REST                                                      │
│  - Computation Layer (metriche, odds engine)                     │
│  - AI Analysis Layer                                             │
└─────────────────────────────────────────────────────────────────┘
                          ▲ Query
                          │
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE (Supabase/PostgreSQL)                                  │
│  - matches, players, tournaments                                 │
│  - match_statistics, point_by_point                              │
│  - player_profiles (storico aggregato)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

# 📊 MODULO 1: DATABASE & METRICHE DERIVATE

## Obiettivo
Calcolare e salvare metriche avanzate partendo dai dati grezzi SofaScore.

---

## TODO LIST - Database & Normalizzazione

### ⬜ 1.1 Struttura Eventi Normalizzati
**File:** `backend/db/` o nuovo `backend/metrics/`

Creare una struttura normalizzata per ogni punto del match:

```
NormalizedPoint {
    match_id
    point_index          // incrementale
    set_number
    game_number
    player_server        // chi sta servendo
    player_receiver
    score_before_point   // es: "30-15"
    score_after_point
    is_ace              // boolean
    is_double_fault     // boolean
    is_break_point      // boolean
    is_game_point       // boolean
    is_set_point        // boolean
    is_tiebreak         // boolean
    momentum_raw_value  // da tennisPowerRankings.value
}
```

**Fonte dati:** JSON SofaScore nel campo `raw_json` della tabella `matches`

---

### ⬜ 1.2 Classificazione Dati PURI vs DERIVATI

**DATI PURI** (salvare direttamente):
- Tournament, Surface, Round
- Player name, Live odds
- Current set, Sets won
- Set scores (w1, l1, w2, l2...)
- Aces, Double faults
- first_serves_in, first_serves_total
- break_points_faced, break_points_saved

**DATI DERIVATI** (calcolare, non salvare come verità):
- First Serve % = (first_serves_in / first_serves_total) * 100
- First Serve Won % = (points_won_on_1st / first_serves_in) * 100
- Second Serve Won % = (points_won_on_2nd / second_serves) * 100
- Break Points Saved % = (bp_saved / bp_faced) * 100

**Regola:** Se possibile, salva i RAW data e ricalcola le percentuali.

---

### ✅ 1.3 Segmentazione Match (COMPLETATO - matchSegmenter.js)

Ogni match va suddiviso in **segmenti logici**:

| Segmento | Definizione |
|----------|-------------|
| `PRE_FIRST_BREAK` | Dal primo punto fino al primo break subito |
| `POST_FIRST_BREAK` | Dal game dopo il primo break fino a fine set |
| `CRITICAL_GAMES` | Game con score 4-4, 5-5, o tie-break |
| `SET_CLOSING` | Game che assegna il set |
| `MATCH_CLOSING` | Game che assegna il match |

**Ogni punto deve appartenere ad almeno un segmento.**

**Break Detection dai Set Scores:**
```javascript
// Rileva se c'è stato break analizzando il punteggio del set
function detectBreakFromSetScore(setScore, firstServer) {
    // setScore: { home: 7, away: 4 }
    // firstServer: "home" | "away"
    
    const totalGames = setScore.home + setScore.away;
    const homeServeGames = Math.ceil(totalGames / 2);  // approssimativo
    const awayServeGames = Math.floor(totalGames / 2);
    
    // Se un giocatore ha più game di quanti ne avrebbe servendo
    // = ha ottenuto almeno un break
    const homeExpectedHolds = firstServer === "home" ? homeServeGames : awayServeGames;
    const awayExpectedHolds = firstServer === "away" ? homeServeGames : awayServeGames;
    
    return {
        home_breaks: Math.max(0, setScore.home - homeExpectedHolds),
        away_breaks: Math.max(0, setScore.away - awayExpectedHolds),
        break_occurred: setScore.home !== homeExpectedHolds
    };
}

// Analisi andamento set dai punteggi storici (W1, L1, W2, L2...)
function analyzeSetDynamics(setScores) {
    return setScores.map((set, index) => ({
        set_number: index + 1,
        winner_games: set.winner,
        loser_games: set.loser,
        was_close: Math.abs(set.winner - set.loser) <= 2,
        was_tiebreak: set.winner === 7 && set.loser === 6,
        was_bagel: set.loser === 0,
        was_breadstick: set.loser === 1
    }));
}
```

---

## TODO LIST - Momentum Engine

### ✅ 1.4 Momentum Base (COMPLETATO - valueInterpreter.js)

**Input:** `tennisPowerRankings.value` dal JSON SofaScore

**Calcoli:**
```
momentum_game_avg = MEDIA(momentum_raw_value) per game
momentum_set_avg = MEDIA(momentum_game_avg) per set
momentum_match_avg = MEDIA(momentum_set_avg) per match
```

**Fallback:** Se `tennisPowerRankings.value` non presente, calcolare momentum sintetico da score + eventi.

**Normalizzazione:** Scala -100 / +100 (dove 0 = equilibrio perfetto)

---

### ✅ 1.5 Momentum Volatility (COMPLETATO - valueInterpreter.js)

**Definizione:** Quanto il momentum cambia tra game consecutivi.

**Calcolo:**
```
Per ogni game N > 1:
    delta = ABS(momentum_game_avg[N] - momentum_game_avg[N-1])

Momentum_Volatility = MEDIA(tutti i delta)
```

**Interpretazione:**
- Valore ALTO → match instabile/emotivo
- Valore BASSO → match controllato

---

### ✅ 1.6 Momentum Elasticity (COMPLETATO - valueInterpreter.js)

**Definizione:** Capacità di recuperare momentum negativo.

**Logica:**
1. Individuare game con `momentum_game_avg < 0`
2. Misurare quanti game servono per tornare `>= 0`

**Formula:**
```
Elasticity_Score = 1 / (numero medio game per recupero)
```

**Interpretazione:** Più alto = migliore resilienza mentale

---

## TODO LIST - Metriche Pressione

### ⬜ 1.7 Hold Pressure Index (HPI)

**Definizione:** Capacità di tenere il servizio sotto pressione.

**Pressure Points:**
- Score 30-30
- Deuce
- Break point contro
- Score 15-40, 0-40

**Formula:**
```
HPI = (game tenuti in pressure) / (game al servizio con pressure)
```

**Range:** 0-1 normalizzato

---

### ⬜ 1.8 Break Resilience Score

**Definizione:** Capacità di salvare break point e reagire.

**Calcolo:**
```
Base = break_points_saved / break_points_faced
Peso maggiore se momentum < 0
Peso maggiore nei CRITICAL_GAMES
```

**Output:** Media pesata delle situazioni

---

### ⬜ 1.9 Clutch Conversion Rate

**Clutch Points:**
- Break point
- Game point
- Set point
- Tie-break point

**Formula:**
```
Clutch_Rate = punti_clutch_vinti / punti_clutch_totali
```

**Calcolare per:** match, set, segmento

---

### ⬜ 1.10 Serve Vulnerability Index

**Definizione:** Quanto il servizio peggiora sotto pressione.

**Calcolo:**
```
Isolare punti al servizio con momentum < 0

DF_vulnerability = DF_rate_pressure - DF_rate_normal
Ace_vulnerability = Ace_rate_normal - Ace_rate_pressure
```

**Interpretazione:** Valori alti = servizio fragile

---

### ⬜ 1.11 Set Decay Index

**Definizione:** Calo tra set consecutivi.

**Confrontare:**
- momentum_set_avg[N] vs [N+1]
- % punti vinti
- HPI

**Formula:**
```
Set_Decay = MEDIA(delta negativi tra set)
```

**Interpretazione:** Valore alto = calo fisico/mentale

---

## TODO LIST - Trading Stats (Metriche Storiche)

### ⬜ 1.12 Resilience Metrics

Calcolare per ogni giocatore (storicamente):

| Metrica | Descrizione |
|---------|-------------|
| `lost_set_one_won_set_two` | % vittoria 2° set dopo perdita 1° |
| `lost_set_one_get_first_break_set_two` | % break per primo nel 2° set dopo perdita 1° |
| `broken_and_break_back_same_set` | % restituzione break nello stesso set |
| `set_and_break_recovery` | % vittoria 2° set da situazione set+break sotto |
| `third_set_win_rate` | % vittoria nei 3° set |
| `serving_for_set_won` | % set chiusi quando si serve per il set |
| `get_first_break` | % volte che brekka per primo |

**Fonte:** Aggregazione da storico match

---

### ✅ 1.13 Pressure Metrics (Live) (COMPLETATO - pressureCalculator.js)

**Struttura LiveMetric:**
```javascript
LiveMetric {
    name: string,           // es: "double_faults"
    type: "RAW" | "DERIVED",
    value: number,
    weight: number,         // peso nel calcolo pressure
    thresholds: {
        low: number,
        medium: number,
        high: number,
        critical: number
    }
}
```

**Metriche RAW (salvare direttamente):**
| Metrica | Descrizione | Criticità |
|---------|-------------|-----------|
| `aces` | Numero aces | Bassa |
| `double_faults` | Numero doppi falli | **ALTA** |
| `first_serves_in` | Primi servizi entrati | Media |
| `first_serves_total` | Totale primi servizi | Media |
| `break_points_faced` | Palle break affrontate | Alta |
| `break_points_saved` | Palle break salvate | Alta |

**Metriche DERIVATE (calcolare al volo):**
```javascript
// First Serve % - Qualità meccanica servizio
first_serve_pct = (first_serves_in / first_serves_total) * 100

// First Serve Won % - FONDAMENTALE per pressure
first_serve_won_pct = (points_won_on_1st / first_serves_in) * 100

// Second Serve Won % - Resilienza sotto pressione
second_serve_won_pct = (points_won_on_2nd / second_serves) * 100

// Break Points Saved % - Rischio break
break_points_saved_pct = (bp_saved / bp_faced) * 100
```

**Soglie Empiriche:**
```javascript
const LIVE_THRESHOLDS = {
    double_faults: {
        normal: 2,      // < 2 = ok
        warning: 4,     // 3-4 = attenzione
        critical: 6     // > 5 = pressione alta
    },
    first_serve_won_pct: {
        excellent: 75,  // > 75% = dominante
        good: 65,       // 65-75% = solido
        warning: 55,    // 55-65% = sotto pressione
        critical: 45    // < 45% = rischio break
    },
    second_serve_won_pct: {
        excellent: 55,
        good: 45,
        warning: 35,
        critical: 25
    },
    break_points_saved_pct: {
        excellent: 70,
        good: 55,
        warning: 40,
        critical: 30
    }
};
```

**Calcolo PRESSURE_INDEX Completo:**
```javascript
function calculatePressureIndex(liveStats) {
    let pressureIndex = 0;
    
    // Double Faults (peso: 25%)
    const df = liveStats.double_faults;
    if (df >= LIVE_THRESHOLDS.double_faults.critical) {
        pressureIndex += 25;
    } else if (df >= LIVE_THRESHOLDS.double_faults.warning) {
        pressureIndex += 15;
    } else if (df >= LIVE_THRESHOLDS.double_faults.normal) {
        pressureIndex += 5;
    }
    
    // First Serve Won % (peso: 30%)
    const fsw = liveStats.first_serve_won_pct;
    if (fsw < LIVE_THRESHOLDS.first_serve_won_pct.critical) {
        pressureIndex += 30;
    } else if (fsw < LIVE_THRESHOLDS.first_serve_won_pct.warning) {
        pressureIndex += 20;
    } else if (fsw < LIVE_THRESHOLDS.first_serve_won_pct.good) {
        pressureIndex += 10;
    }
    
    // Second Serve Won % (peso: 25%)
    const ssw = liveStats.second_serve_won_pct;
    if (ssw < LIVE_THRESHOLDS.second_serve_won_pct.critical) {
        pressureIndex += 25;
    } else if (ssw < LIVE_THRESHOLDS.second_serve_won_pct.warning) {
        pressureIndex += 15;
    } else if (ssw < LIVE_THRESHOLDS.second_serve_won_pct.good) {
        pressureIndex += 8;
    }
    
    // Break Points Saved % (peso: 20%)
    const bps = liveStats.break_points_saved_pct;
    if (bps < LIVE_THRESHOLDS.break_points_saved_pct.critical) {
        pressureIndex += 20;
    } else if (bps < LIVE_THRESHOLDS.break_points_saved_pct.warning) {
        pressureIndex += 12;
    } else if (bps < LIVE_THRESHOLDS.break_points_saved_pct.good) {
        pressureIndex += 5;
    }
    
    return {
        value: pressureIndex,           // 0-100
        level: classifyPressure(pressureIndex),
        breakdown: {
            df_contribution: df >= 4 ? "HIGH" : "LOW",
            serve_contribution: fsw < 55 ? "HIGH" : "LOW",
            mental_contribution: bps < 40 ? "HIGH" : "LOW"
        }
    };
}

function classifyPressure(index) {
    if (index >= 70) return "CRITICAL";   // Break quasi certo
    if (index >= 50) return "HIGH";        // Forte rischio break
    if (index >= 30) return "MODERATE";    // Sotto pressione
    if (index >= 15) return "LOW";         // Leggera pressione
    return "MINIMAL";                      // Controllo del game
}
```

**Uso Algoritmico per Strategie:**
```javascript
// Gating strategie in base allo stato
if (currentSet >= 2) {
    enableLayStrategies();
}

// Trigger per Banca Servizio
if (pressureIndex.level === "HIGH" || pressureIndex.level === "CRITICAL") {
    if (scoreIs("30-30") || scoreIs("deuce") || isBreakPoint()) {
        return bancaServizioSignal();
    }
}
```

**Soglie da definire:** configurable per strategia

---

### ⬜ 1.14 Player Profile (Aggregato)

Per ogni giocatore, salvare profilo storico:

```
PlayerProfile {
    player_id
    surface                 // per superficie
    timeframe               // last_20, all_time
    
    momentum_volatility_avg
    elasticity_avg
    break_resilience_avg
    clutch_conversion_avg
    
    // Trading stats
    lost_set_one_won_set_two
    get_first_break
    serving_for_set_won
    set_and_break_recovery
    
    // Performance
    roi_surface             // simulazione stake fisso
    win_rate_surface
}
```

**Aggiornamento:** Incrementale dopo ogni match

---

### ⬜ 1.15 Snapshot Strategici

Salvare snapshot in momenti chiave:

- Primo break del match
- Fine di ogni set
- Inizio/fine tie-break
- Game chiusura match

**Contenuto snapshot:**
```
{
    score,
    momentum_avg,
    HPI,
    break_resilience_parziale,
    timestamp
}
```

---

### ⬜ 1.16 Live Odds Tracking

**Quote Live - Dati PURI da salvare:**
```javascript
LiveOdds {
    player_id: string,
    timestamp: datetime,
    live_odds: decimal,          // es: 1.75, 2.28
    pre_match_odds: decimal,     // quota apertura
    source: "betfair" | "bet365" | "pinnacle"
}
```

**Metriche Derivate dalle Quote:**
```javascript
// Range Quota (classificazione)
function classifyOddsRange(odds) {
    if (odds < 1.30) return "HEAVY_FAVORITE";
    if (odds < 1.60) return "FAVORITE";
    if (odds < 2.00) return "SLIGHT_FAVORITE";
    if (odds < 2.50) return "BALANCED";
    if (odds < 3.50) return "SLIGHT_UNDERDOG";
    if (odds < 5.00) return "UNDERDOG";
    return "BIG_UNDERDOG";
}

// Delta Quote (variazione dal pre-match)
function calculateOddsDelta(liveOdds, preMatchOdds) {
    const delta = liveOdds - preMatchOdds;
    const deltaPercent = (delta / preMatchOdds) * 100;
    
    return {
        absolute: delta,
        percent: deltaPercent,
        direction: delta > 0 ? "DRIFTING" : "SHORTENING",
        significance: classifyDeltaSignificance(deltaPercent)
    };
}

function classifyDeltaSignificance(deltaPercent) {
    const abs = Math.abs(deltaPercent);
    if (abs < 5) return "MINIMAL";      // < 5% = normale
    if (abs < 15) return "NOTABLE";     // 5-15% = da monitorare
    if (abs < 30) return "SIGNIFICANT"; // 15-30% = evento importante
    return "MAJOR_SHIFT";               // > 30% = break/set perso
}
```

**Uso per Overreaction Detection:**
```javascript
// Se quota cambia troppo velocemente rispetto allo score
function detectOverreaction(match) {
    const oddsDelta = calculateOddsDelta(match.liveOdds, match.preMatchOdds);
    const scoreDelta = calculateExpectedOddsMove(match.score);
    
    if (oddsDelta.percent > scoreDelta.expected * 1.5) {
        return {
            type: "MARKET_OVERREACTION",
            side: oddsDelta.direction === "DRIFTING" ? "BACK_OPPORTUNITY" : "LAY_OPPORTUNITY",
            confidence: calculateOverreactionConfidence(oddsDelta, scoreDelta)
        };
    }
    return null;
}
```

---

# 💰 MODULO 2: ODDS & VALUE ENGINE

## Obiettivo
Stimare probabilità FAIR, confrontarle con mercato, individuare VALUE.

---

## TODO LIST - Odds Engine

### ? 2.1 Baseline Probabilità

**Regola fondamentale:**
```
Probabilità iniziale = 50% / 50%

Tutti i fattori successivi sono DELTA incrementali
```

**MAI partire dal ranking come verità assoluta.**

---

### ? 2.2 Factor Registry

Ogni fattore è un oggetto con:

```
Factor {
    name
    calculate(data) → delta [-0.50, +0.50]
    getWeight(context) → peso dinamico 0-1
    getConfidence() → affidabilità 0-1
    getExplanation() → stringa leggibile
}
```

---

### ? 2.3 Implementare Fattori

| Fattore | Peso PRE-MATCH | Peso IN-PLAY | Note |
|---------|----------------|--------------|------|
| Ranking | 0.20-0.25 | 0.10-0.15 | CAP massimo, non domina mai |
| Momentum | 0.15-0.20 | 0.25-0.35 ⭐ | DOMINANTE in-play |
| Break | 0.10-0.15 | 0.15-0.25 | Dinamico: più peso nei game critici |
| Set | 0.15-0.20 | 0.15-0.20 | Primo set pesa meno del decisivo |
| Clutch/Mental | 0.10-0.15 | 0.10-0.15 | Corregge ranking e momentum |
| Surface | 0.05-0.10 | 0.05-0.10 | Performance storica su superficie |

---

### ? 2.4 Ranking Factor

```
ranking_gap = rank_away - rank_home
adjustment = sigmoid(ranking_gap) * max_weight

// CAP: ranking NON può mai dare più del 25% di edge
adjustment = MIN(adjustment, 0.25)

// In-play: ridurre peso
if (match_in_progress):
    adjustment *= 0.6
```

---

### ? 2.5 Momentum Factor

```
// Momentum recente pesa più del medio
momentum_score = 
    0.3 * momentum_match_avg +
    0.7 * momentum_recent (ultimi 3 game)

// Momentum instabile riduce affidabilità
if (momentum_volatility > threshold):
    confidence *= 0.7

// DOMINANTE in-play
adjustment = momentum_score * weight_momentum
```

---

### ? 2.6 Break Factor

```
break_advantage = home_breaks - away_breaks

// Peso dinamico
if (game in CRITICAL_GAMES):
    weight *= 1.5
    
if (break_confermato):  // hold successivo
    weight *= 1.3

adjustment = break_advantage * weight
```

---

### ? 2.7 Set Factor

```
set_advantage = home_sets - away_sets

// Primo set pesa meno
if (current_set == 2):
    weight *= 0.8

// Set decisivo pesa di più
if (is_deciding_set):
    weight *= 1.4

// Set vinto in rimonta pesa di più
if (came_from_behind):
    weight *= 1.2
```

---

### ? 2.8 Clutch/Mental Factor

Usa metriche storiche + live:

```
clutch_score =
    0.3 * HPI +
    0.3 * break_resilience +
    0.4 * clutch_conversion_rate

// Corregge gli altri fattori
if (clutch_score > 0.7):
    bonus = +0.05  // giocatore solido
else if (clutch_score < 0.3):
    malus = -0.05  // giocatore fragile
```

---

### ? 2.9 Normalizzazione Probabilità

```
prob_home = 0.50 + SUM(all_adjustments_home)
prob_away = 0.50 + SUM(all_adjustments_away)

// Clamp
prob_home = CLAMP(prob_home, 0.01, 0.99)
prob_away = CLAMP(prob_away, 0.01, 0.99)

// Normalizza a 100%
total = prob_home + prob_away
prob_home = prob_home / total
prob_away = prob_away / total
```

---

### ? 2.10 Conversione in Quote FAIR

```
fair_odds_home = 1 / prob_home
fair_odds_away = 1 / prob_away
```

**Queste sono quote SENZA margine bookmaker.**

---

### ? 2.11 Calcolo VALUE

```
VALUE = market_odds - fair_odds

// Interpretazione:
VALUE > 0  → quota mercato più alta del fair (potenziale value)
VALUE = 0  → allineato
VALUE < 0  → quota mercato più bassa (sfavorevole)
```

---

### ? 2.12 Semaforo VALUE

```
🟢 VERDE (BACK/BUY):   VALUE > +0.15 AND confidence > 0.7
🟡 GIALLO (MONITORA):  VALUE ∈ [+0.05, +0.15]
🟠 ARANCIONE (NEUTRO): VALUE ∈ [-0.05, +0.05]
🔴 ROSSO (LAY/SELL):   VALUE < -0.05 AND confidence > 0.7
```

**Il semaforo è SUPPORTO VISIVO, non decisione automatica.**

---

### ? 2.13 Factor Breakdown (Trasparenza)

Output per UI:
```
{
    factor_name: "Momentum",
    contribution: +0.12,
    weight: 0.30,
    confidence: 0.85,
    explanation: "Momentum recente favorevole (+8.5 avg ultimi 3 game)"
}
```

---

### ? 2.14 Live Update Logic

```
// Ricalcola SOLO se cambia un fattore
if (score_changed OR momentum_changed OR break_event):
    recalculate()

// Smoothing per evitare oscillazioni
new_prob = 0.7 * new_calculated + 0.3 * previous_prob
```

---

# 🧠 MODULO 3: AI ANALYSIS LAYER

## Obiettivo
Interpretare i dati calcolati in linguaggio naturale comprensibile.

---

## TODO LIST - AI Layer

### ? 3.1 Ruolo AI

**L'AI È:** Un layer di interpretazione che legge metriche già calcolate.

**L'AI NON È:** Un predittore, un oracolo, un decisore automatico.

```
Input ammessi:
✅ Momentum (media, trend, volatilità)
✅ Segmenti del match
✅ HPI, Break Resilience, Clutch Rate
✅ Profili giocatore storici
✅ Comparazioni match

Input vietati:
❌ Raw JSON SofaScore
❌ Dati non normalizzati
❌ Probabilità inventate
❌ Quote grezze non validate
```

---

### ? 3.2 Prompt Templates

Creare template strutturati per ogni scenario:

**Template Momentum Shift:**
```
Analizza il cambio di momentum nel match {match_id}.
Dati: momentum_before={X}, momentum_after={Y}, game={Z}
Contesto: {segmento}, score={score}
Output: spiegazione in italiano, max 3 frasi.
```

**Template Break Point:**
```
Il giocatore {player} ha {salvato/perso} break point.
HPI storico: {value}, Break Resilience: {value}
Momentum attuale: {value}
Output: commento sul significato tattico.
```

**Template Comparazione Storica:**
```
Trova match simili a {match_id} basandoti su:
- Stessa superficie
- Simile ranking gap
- Simile andamento primo set
Output: lista match simili con pattern osservati.
```

---

### ? 3.3 Event-Driven Activation

L'AI si attiva SOLO per eventi significativi:

```
TRIGGER_EVENTS = [
    "break_point",
    "break_subito",
    "momentum_shift > threshold",
    "tiebreak_start",
    "set_point",
    "match_point",
    "game_chiusura_set"
]
```

**Obiettivo:** Ridurre spam, costi, aumentare rilevanza.

---

### ? 3.4 Output Format

```
AIAnalysis {
    type: "momentum_shift" | "break_analysis" | "comparison"
    text: "Il calo nel Set 2 è accompagnato da..."
    confidence: 0.85
    data_points: 47  // su quanti dati si basa
    factors_used: ["HPI", "momentum", "break_resilience"]
}
```

---

### ? 3.5 Hard Rules (Limiti)

L'AI DEVE rifiutare output se:
- Dati insufficienti (< 10 data points)
- Match troppo corto (< 3 game)
- Assenza storico minimo per comparazioni
- Metriche con confidence < 0.5

**Risposta in questi casi:**
```
{
    type: "insufficient_data",
    text: "Analisi non disponibile: dati insufficienti per una valutazione affidabile.",
    reason: "match_too_short"
}
```

---

### ? 3.6 AI + Quote (Supporto Indiretto)

L'AI può:
- ✅ Spiegare PERCHÉ una quota sembra alta/bassa
- ✅ Evidenziare fragilità storica
- ✅ Supportare la lettura del VALUE

L'AI NON può:
- ❌ Dire "questa è value bet"
- ❌ Suggerire back/lay espliciti
- ❌ Calcolare stake

---

# ⚙️ MODULO 4: TRADING ENGINE

## Obiettivo
Filtrare match, identificare opportunità, supportare decisioni trading.

---

## TODO LIST - Trading Engine

### ? 4.1 Strategie Supportate

```
STRATEGIES = {
    "LAY_SET_ONE_WINNER": {
        condition: "lost_set_one_won_set_two > 0.50",
        phase: "inizio_set_2",
        risk: "medium"
    },
    "LAY_MATCH_WINNER": {
        condition: "break_resilience > 0.60 AND momentum < 0",
        phase: "post_break",
        risk: "high"
    },
    "BACK_THE_SERVER": {
        condition: "HPI > 0.70 AND first_serve_won > 0.65",
        phase: "live",
        risk: "low"
    },
    "SET_AND_BREAK_RECOVERY": {
        condition: "set_and_break_recovery > 0.40",
        phase: "set+break_sotto",
        risk: "high"
    }
}
```

---

### ? 4.2 Match Evaluation

```
function evaluateMatch(match):
    stats_home = getPlayerProfile(match.home, match.surface)
    stats_away = getPlayerProfile(match.away, match.surface)
    
    resilience_home = computeResilienceScore(stats_home)
    resilience_away = computeResilienceScore(stats_away)
    
    overreaction_potential = computeOverreaction(match)
    
    compatible_strategies = detectStrategies(match, stats_home, stats_away)
    
    return {
        match_id,
        resilience_home,
        resilience_away,
        overreaction_potential,
        compatible_strategies,
        priority: assignPriority(score)
    }
```

---

### ? 4.3 Daily Report

```
function generateDailyReport(date):
    matches = DB.getMatches(date)
    report = []
    
    for match in matches:
        evaluation = evaluateMatch(match)
        if (evaluation.score > MIN_THRESHOLD):
            report.append(evaluation)
    
    return sortByPriority(report)
```

---

### ? 4.4 Overreaction Detection

```
function computeOverreaction(match):
    // Il mercato overreacts quando:
    // 1. Favorito vince 1° set → quota scende troppo
    // 2. Underdog sotto break → quota sale troppo
    
    odds_movement = current_odds - pre_match_odds
    expected_movement = calculateExpectedMovement(score)
    
    overreaction = odds_movement - expected_movement
    
    return overreaction
```

---

### ? 4.5 Output Signal

```
MatchSignal {
    match_id
    priority: "HIGH" | "MEDIUM" | "LOW"
    compatible_strategies: ["LAY_SET_ONE_WINNER", ...]
    risk_level: "low" | "medium" | "high"
    suggested_phase: "pre-match" | "set1" | "set2" | "live"
    confidence: 0.75
    explanation: "Giocatore con alta resilienza storica..."
}
```

---

### ? 4.6 Feedback Loop (Opzionale)

```
function storeOutcome(match_id, strategy, outcome):
    DB.saveTradeOutcome({
        match_id,
        strategy,
        outcome: "win" | "loss" | "scratch",
        actual_roi
    })

function updateMetricWeights():
    // Analizza storico outcomes
    // Aggiusta pesi metriche
    // Migliora soglie
```

---

# 🖥️ MODULO 5: FRONTEND COMPONENTS

## Obiettivo
Visualizzare dati in modo chiaro e azionabile.

---

## TODO LIST - Frontend

### ? 5.1 Sezioni Principali

| Sezione | Domanda che risponde |
|---------|---------------------|
| Overview | "Che tipo di match sto guardando?" |
| Momentum | "Chi sta controllando e quando?" |
| Point-by-Point | "Come si è arrivati a questo punto?" |
| Statistiche | "Cosa dicono i numeri?" |
| Quote & Value | "Il mercato è allineato?" |
| AI Analysis | "Cosa significa tutto questo?" |

---

### ? 5.2 Value Display Component

```
┌─────────────────────────────────────────┐
│  💰 ODDS & VALUE ANALYSIS               │
├─────────────────────────────────────────┤
│  PLAYER A        vs        PLAYER B     │
│                                         │
│  Fair Odds:   1.65          2.35        │
│  Market:      1.75          2.20        │
│  Value:      +0.10 🟢      -0.15 🔴     │
├─────────────────────────────────────────┤
│  📊 FACTOR BREAKDOWN                    │
│  Ranking     ████░░░░░░  +4%            │
│  Momentum    ███████░░░  +12% ⭐        │
│  Break       ██████░░░░  +8%            │
│  Set Score   ████░░░░░░  +5%            │
│  Clutch      ███░░░░░░░  +3%            │
│  Surface     ██░░░░░░░░  +2%            │
├─────────────────────────────────────────┤
│  ⚠️ Confidence: HIGH (92%)              │
│  📈 Basato su: 47 match                 │
└─────────────────────────────────────────┘
```

---

### ? 5.3 Momentum Chart

Visualizzare:
- Trend momentum nel tempo
- Punti di inversione
- Segmenti colorati per fase match

---

### ? 5.4 Trading Report Dashboard

```
┌─────────────────────────────────────────┐
│  📋 DAILY TRADING REPORT                │
├─────────────────────────────────────────┤
│  Filtri: [Superficie ▼] [Strategia ▼]   │
├─────────────────────────────────────────┤
│  🔴 HIGH PRIORITY                        │
│  ├─ Match 1: Sinner vs Alcaraz          │
│  │  Strategie: LAY_SET_ONE_WINNER       │
│  │  Confidence: 85%                     │
│  ├─ Match 2: ...                        │
├─────────────────────────────────────────┤
│  🟡 MEDIUM PRIORITY                      │
│  ├─ ...                                 │
└─────────────────────────────────────────┘
```

---

# 📋 RIEPILOGO TODO COMPLETO

## Modulo 1: Database & Metriche
- / 1.1 Struttura Eventi Normalizzati
- / 1.2 Classificazione PURI vs DERIVATI
- / 1.3 Segmentazione Match
- / 1.4 Momentum Base
- / 1.5 Momentum Volatility
- / 1.6 Momentum Elasticity
- / 1.7 Hold Pressure Index (HPI)
- / 1.8 Break Resilience Score
- / 1.9 Clutch Conversion Rate
- / 1.10 Serve Vulnerability Index
- / 1.11 Set Decay Index
- / 1.12 Resilience Metrics (storiche)
- / 1.13 Pressure Metrics (live) - **DETTAGLIATO**
- / 1.14 Player Profile (aggregato)
- / 1.15 Snapshot Strategici
- / 1.16 Live Odds Tracking 🆕

## Modulo 2: Odds & Value Engine
- / 2.1 Baseline Probabilità 50/50
- / 2.2 Factor Registry
- / 2.3 Implementare 6 Fattori
- / 2.4 Ranking Factor
- / 2.5 Momentum Factor
- / 2.6 Break Factor
- / 2.7 Set Factor
- / 2.8 Clutch/Mental Factor
- / 2.9 Normalizzazione Probabilità
- / 2.10 Conversione Quote FAIR
- / 2.11 Calcolo VALUE
- / 2.12 Semaforo VALUE
- / 2.13 Factor Breakdown
- / 2.14 Live Update Logic

## Modulo 3: AI Analysis Layer
- / 3.1 Definizione Ruolo AI
- / 3.2 Prompt Templates
- / 3.3 Event-Driven Activation
- / 3.4 Output Format
- / 3.5 Hard Rules (Limiti)
- / 3.6 AI + Quote (Supporto)

## Modulo 4: Trading Engine
- / 4.1 Strategie Supportate
- / 4.2 Match Evaluation
- / 4.3 Daily Report
- / 4.4 Overreaction Detection
- / 4.5 Output Signal
- / 4.6 Feedback Loop

## Modulo 5: Frontend
- / 5.1 Sezioni Principali
- / 5.2 Value Display Component
- / 5.3 Momentum Chart
- / 5.4 Trading Report Dashboard

**(Modulo 6 e 7 aggiunti in fondo al documento)**

---

# 🧭 PRINCIPI GUIDA PER L'IMPLEMENTAZIONE

## Filosofia Sistema
1. **Chiarezza > Quantità** - Meglio poche metriche chiare che molte confuse
2. **Contesto > Media** - Ogni statistica va contestualizzata
3. **Spiegazione > Predizione** - Descriviamo, non promettiamo
4. **Sistema > Feature singola** - Tutto deve essere coerente

## Anti-Pattern (COSA NON FARE)
- ❌ Dashboard con 47 metriche insieme
- ❌ Tab "Altro" o "Varie"
- ❌ Grafici senza contesto temporale
- ❌ Colori casuali decorativi
- ❌ Predizioni senza confidence range
- ❌ AI che "inventa" numeri

## Regole Operative
```
RULE: Algorithm filters, Human decides
RULE: No signal is mandatory
RULE: Absence of signal is a signal
RULE: Il mercato può avere ragione
RULE: Il VALUE è ipotesi, non promessa
```

---

# � MODULO 6: POTENZIAMENTI BASATI SU DATI STORICI (XLSX)

## Obiettivo
Sfruttare i 2703+ match storici con quote multiple e ranking per potenziare strategie e value detection.

---

## 📊 STATISTICHE CHIAVE DAL DATASET (Base Empirica)

```
DATASET 2024:
├── Totale match: 2703
├── Superfici: Hard (1520), Clay (859), Grass (324)
├── Serie: ATP250 (1081), Masters1000 (695), GrandSlam (508), ATP500 (404)
├── Best of 3: 2196 (81%)
├── Best of 5: 507 (19%) - Solo Grand Slam
│
├── RIMONTE (vincitore che ha perso set 1):
│   ├── Totale: 20.61%
│   ├── Per superficie: Hard 19.93%, Clay 20.72%, Grass 23.46%
│   ├── Per serie: GrandSlam 26.77%, ATP500 21.29%, Masters1000 20%, ATP250 18.04%
│   └── Per formato: Bo5 26.82%, Bo3 19.17%
│
├── UPSET (ranking peggiore vince): 36.29%
│   └── Big upset (diff > 50 posizioni): 12.84%
│
├── FAVORITO (quota) vince: 66.78%
│   ├── Vittorie quota > 2.0: 26.82%
│   └── Vittorie quota > 3.0: 7.36%
│
├── TIEBREAK:
│   ├── Set 1 al TB: 20.13%
│   └── Set 2 al TB: 18.50%
│
└── STRAIGHT SETS (2-0): 78.99%
```

---

## TODO LIST - Potenziamento Value Interpreter

### ✅ 6.1 Soglie Dinamiche per Superficie (COMPLETATO - valueInterpreter.js)

**PROBLEMA:** Le soglie attuali sono fisse (>60, >20, etc.)
**SOLUZIONE:** Soglie diverse per superficie basate su dati empirici

```javascript
const SURFACE_THRESHOLDS = {
    'Hard': {
        dominance: 60,      // standard
        advantage: 20,
        equilibrium: 0,
        pressure: -20,
        comeback_rate: 0.1993  // 19.93% rimonte storiche
    },
    'Clay': {
        dominance: 55,      // terra più equilibrata
        advantage: 18,
        equilibrium: 0,
        pressure: -18,
        comeback_rate: 0.2072  // 20.72% rimonte storiche
    },
    'Grass': {
        dominance: 65,      // erba più volatile
        advantage: 25,
        equilibrium: 0,
        pressure: -25,
        comeback_rate: 0.2346  // 23.46% rimonte storiche - PIÙ ALTA!
    }
};
```

**Regola:** Su erba, soglie più alte perché il servizio domina di più.

---

### ⬜ 6.2 Soglie Dinamiche per Formato (Bo3 vs Bo5)

```javascript
const FORMAT_ADJUSTMENT = {
    'best_of_3': {
        comeback_multiplier: 1.0,    // base
        set_weight: 0.5,             // ogni set pesa 50%
        comeback_rate: 0.1917        // 19.17%
    },
    'best_of_5': {
        comeback_multiplier: 1.4,    // 40% più rimonte nei Grand Slam!
        set_weight: 0.33,            // ogni set pesa 33%
        comeback_rate: 0.2682        // 26.82% - molto più alto!
    }
};

// In Grand Slam, dare meno peso alla perdita del primo set
if (bestOf === 5) {
    valueAdjustment *= FORMAT_ADJUSTMENT.best_of_5.comeback_multiplier;
}
```

---

### ⬜ 6.3 Serie Tournament Weight

```javascript
const SERIES_CONFIG = {
    'Grand Slam': {
        importance: 1.0,           // massima importanza
        upset_rate: 0.36,          // 36% upset
        pressure_multiplier: 1.3,   // più pressione
        comeback_rate: 0.2677
    },
    'Masters 1000': {
        importance: 0.85,
        upset_rate: 0.35,
        pressure_multiplier: 1.2,
        comeback_rate: 0.20
    },
    'ATP500': {
        importance: 0.70,
        upset_rate: 0.34,
        pressure_multiplier: 1.1,
        comeback_rate: 0.2129
    },
    'ATP250': {
        importance: 0.55,
        upset_rate: 0.38,          // più upset nei 250!
        pressure_multiplier: 1.0,
        comeback_rate: 0.1804      // meno rimonte
    }
};
```

---

## TODO LIST - Potenziamento Strategie Trading

### ⬜ 6.4 Lay The Winner - Versione Potenziata

```javascript
function layTheWinnerEnhanced(match, stats) {
    const { surface, bestOf, series } = match;
    const { winnerFirstSet, currentOdds, favoritePlayer } = stats;
    
    // Soglia base dinamica per superficie
    const baseThreshold = SURFACE_THRESHOLDS[surface].comeback_rate;
    
    // Adjustment per formato
    const formatBonus = bestOf === 5 ? 0.08 : 0;  // +8% in Grand Slam
    
    // Adjustment per serie
    const seriesBonus = SERIES_CONFIG[series].comeback_rate - 0.20;
    
    const adjustedThreshold = baseThreshold + formatBonus + seriesBonus;
    
    // Condizioni potenziate
    if (winnerFirstSet !== favoritePlayer) {
        if (currentOdds[winnerFirstSet] < 1.60) {
            // CHECK STORICO: il perdente del 1° set quanto spesso rimonta?
            const playerComebackRate = getPlayerComebackRate(favoritePlayer, surface);
            
            if (playerComebackRate > adjustedThreshold) {
                return {
                    action: "LAY",
                    target: winnerFirstSet,
                    confidence: calculateConfidence(playerComebackRate, adjustedThreshold),
                    reason: `Favorito con ${(playerComebackRate*100).toFixed(1)}% rimonte storiche su ${surface}`,
                    surface_factor: surface,
                    format_factor: bestOf === 5 ? "Grand Slam boost" : "standard"
                };
            }
        }
    }
    return null;
}
```

---

### ⬜ 6.5 Set & Break Recovery Strategy (NUOVA)

**Strategia mancante nel codice attuale!**

```javascript
function setAndBreakRecoveryStrategy(match, liveStats) {
    const { currentSet, breakStatus, momentum, surface } = liveStats;
    
    // Condizione: giocatore sotto di 1 set E sotto di 1 break nel set corrente
    if (currentSet === 2 && breakStatus.behindBreak) {
        const player = breakStatus.playerBehind;
        
        // Recupera statistiche storiche
        const recoveryRate = getSetAndBreakRecoveryRate(player, surface);
        
        // Soglia empirica: ~15-20% recuperano da set+break
        if (recoveryRate > 0.15) {
            return {
                action: "BACK",
                target: player,
                reason: `Set & Break: ${player} recupera ${(recoveryRate*100).toFixed(1)}% delle volte`,
                risk: "HIGH",
                entry_odds_min: 3.0,  // entrare solo se quota > 3.0
                exit_condition: "break_back OR set_won"
            };
        }
    }
    return null;
}
```

---

### ⬜ 6.6 Tiebreak Strategy (NUOVA)

**Dati:** 20% dei set finisce al tiebreak

```javascript
function tiebreakStrategy(match, liveStats) {
    const { gameScore, setScore, servingPlayer, momentum } = liveStats;
    
    // Siamo vicini al tiebreak?
    if (gameScore === "5-5" || gameScore === "6-5" || gameScore === "5-6") {
        
        // Chi serve meglio nei tiebreak?
        const serverTBWinRate = getTiebreakWinRate(servingPlayer);
        
        if (serverTBWinRate > 0.55) {  // Server vince >55% TB
            return {
                action: "BACK",
                target: servingPlayer,
                reason: `Tiebreak imminente. ${servingPlayer} vince ${(serverTBWinRate*100).toFixed(1)}% TB`,
                phase: "pre_tiebreak",
                exit_condition: "tiebreak_end"
            };
        }
    }
    return null;
}
```

---

## TODO LIST - Potenziamento Value Engine

### ⬜ 6.7 Multi-Source Odds Comparison

**Dati disponibili:** B365, Pinnacle, Max, Avg per ogni match

```javascript
function calculateMultiSourceValue(match) {
    const { B365W, B365L, PSW, PSL, MaxW, MaxL, AvgW, AvgL } = match.odds;
    
    // Pinnacle = sharp odds (più accurate)
    // Bet365 = soft odds (più generose per value)
    // Max = best available
    // Avg = market consensus
    
    const analysis = {
        // Edge Pinnacle vs Bet365
        pinnacle_edge_winner: PSW - B365W,
        pinnacle_edge_loser: PSL - B365L,
        
        // Best odds vs Average
        max_vs_avg_winner: MaxW - AvgW,
        max_vs_avg_loser: MaxL - AvgL,
        
        // Implied probability spread
        implied_prob_spread: (1/B365W + 1/B365L) - 1,  // overround
        
        // VALUE signals
        signals: []
    };
    
    // Se Pinnacle > Bet365 di più del 5%, possibile value
    if (analysis.pinnacle_edge_winner > 0.05) {
        analysis.signals.push({
            type: "PINNACLE_DISAGREES",
            side: "winner",
            edge: analysis.pinnacle_edge_winner,
            interpretation: "Sharp money on winner - possibile value"
        });
    }
    
    // Se Max >> Avg, il mercato è diviso
    if (analysis.max_vs_avg_winner > 0.15) {
        analysis.signals.push({
            type: "MARKET_SPLIT",
            side: "winner", 
            spread: analysis.max_vs_avg_winner,
            interpretation: "Mercato diviso - opportunità arbitraggio"
        });
    }
    
    return analysis;
}
```

---

### ⬜ 6.8 Ranking-Based Value Adjustment

```javascript
function rankingValueAdjustment(match) {
    const { WRank, LRank, WPts, LPts } = match;
    const { B365W, B365L } = match.odds;
    
    // Calcola gap ranking
    const rankGap = Math.abs(WRank - LRank);
    const ptsGap = Math.abs(WPts - LPts);
    
    // Implied probability dal mercato
    const impliedProbWinner = 1 / B365W;
    const impliedProbLoser = 1 / B365L;
    
    // Upset rate empirico per gap
    let expectedUpsetRate;
    if (rankGap < 20) {
        expectedUpsetRate = 0.42;  // Match equilibrati
    } else if (rankGap < 50) {
        expectedUpsetRate = 0.35;
    } else if (rankGap < 100) {
        expectedUpsetRate = 0.28;
    } else {
        expectedUpsetRate = 0.20;  // Big gap = meno upset
    }
    
    // Se mercato sottostima upset potential
    if (impliedProbLoser < expectedUpsetRate * 0.8) {
        return {
            signal: "UNDERDOG_UNDERVALUED",
            expected_upset: expectedUpsetRate,
            market_implied: impliedProbLoser,
            edge: expectedUpsetRate - impliedProbLoser
        };
    }
    
    return null;
}
```

---

### ⬜ 6.9 Court Type Factor (Indoor vs Outdoor)

```javascript
const COURT_CONFIG = {
    'Indoor': {
        serve_advantage: 1.15,    // servizio più forte indoor
        upset_modifier: 0.95,     // meno upset
        tiebreak_rate: 0.22       // più tiebreak
    },
    'Outdoor': {
        serve_advantage: 1.0,
        upset_modifier: 1.0,
        tiebreak_rate: 0.19
    }
};
```

---

## TODO LIST - Player Profile Enhancement

### ⬜ 6.10 Surface-Specific Player Stats

```javascript
// Per ogni giocatore, calcolare da storico xlsx:
const playerSurfaceProfile = {
    player_name: "Sinner",
    surfaces: {
        'Hard': {
            matches: 45,
            win_rate: 0.78,
            comeback_rate: 0.25,      // % rimonte dopo perdita set 1
            avg_odds_when_won: 1.42,
            avg_odds_when_lost: 2.85,
            roi: 0.12                  // ROI se puntato sempre
        },
        'Clay': {
            matches: 28,
            win_rate: 0.71,
            comeback_rate: 0.18,
            avg_odds_when_won: 1.55,
            avg_odds_when_lost: 2.20,
            roi: 0.05
        },
        'Grass': {
            matches: 12,
            win_rate: 0.67,
            comeback_rate: 0.22,
            avg_odds_when_won: 1.80,
            avg_odds_when_lost: 1.95,
            roi: -0.03
        }
    }
};
```

---

### ⬜ 6.11 Historical ROI Calculator

```javascript
function calculatePlayerROI(playerName, surface, oddsRange) {
    // Query: tutti i match di playerName su surface con quota in range
    const matches = getPlayerMatches(playerName, surface, oddsRange);
    
    let totalStake = 0;
    let totalReturn = 0;
    
    matches.forEach(match => {
        const isWinner = match.Winner === playerName;
        const odds = isWinner ? match.B365W : match.B365L;
        
        totalStake += 1;  // stake fisso 1 unità
        if (isWinner) {
            totalReturn += odds;
        }
    });
    
    return {
        roi: (totalReturn - totalStake) / totalStake,
        matches: matches.length,
        wins: matches.filter(m => m.Winner === playerName).length,
        avg_odds: totalReturn / matches.filter(m => m.Winner === playerName).length
    };
}
```

---

## 📋 RIEPILOGO TODO MODULO 6

### Value Interpreter Potenziato
- / 6.1 Soglie Dinamiche per Superficie
- / 6.2 Soglie Dinamiche per Formato (Bo3/Bo5)
- / 6.3 Serie Tournament Weight

### Strategie Trading Potenziate
- / 6.4 Lay The Winner Enhanced
- / 6.5 Set & Break Recovery Strategy (NUOVA)
- / 6.6 Tiebreak Strategy (NUOVA)

### Value Engine Potenziato
- / 6.7 Multi-Source Odds Comparison
- / 6.8 Ranking-Based Value Adjustment
- / 6.9 Court Type Factor

### Player Profile Enhancement
- / 6.10 Surface-Specific Player Stats
- / 6.11 Historical ROI Calculator

---

# 🔬 MODULO 7: CODICE ESISTENTE - UPGRADE SPECIFICI

## TODO LIST - Upgrade analizzaTennisPowerRankings

### ✅ 7.1 Aggiungere Volatility al Value Interpreter (COMPLETATO)

**File attuale:** `Interpretare Value su sofascore (codice).txt`

```javascript
// AGGIUNTA: Calcolo volatility
function calculateVolatility(tennisPowerRankings) {
    if (tennisPowerRankings.length < 3) return 0;
    
    let deltas = [];
    for (let i = 1; i < tennisPowerRankings.length; i++) {
        const delta = Math.abs(
            tennisPowerRankings[i].value - tennisPowerRankings[i-1].value
        );
        deltas.push(delta);
    }
    
    return deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

// AGGIUNTA: Classificazione volatility
function classifyVolatility(volatility) {
    if (volatility > 40) return "MOLTO_VOLATILE";  // match pazzo
    if (volatility > 25) return "VOLATILE";         // alti e bassi
    if (volatility > 15) return "MODERATO";         // normale
    return "STABILE";                               // match controllato
}
```

---

### ✅ 7.2 Aggiungere Elasticity (COMPLETATO)

```javascript
// AGGIUNTA: Calcolo elasticity (capacità recupero)
function calculateElasticity(tennisPowerRankings, targetPlayer) {
    const negativePhases = [];
    let currentPhase = null;
    
    tennisPowerRankings.forEach((point, i) => {
        const isNegative = point.value < 0;
        
        if (isNegative && !currentPhase) {
            currentPhase = { start: i, length: 1 };
        } else if (isNegative && currentPhase) {
            currentPhase.length++;
        } else if (!isNegative && currentPhase) {
            negativePhases.push(currentPhase);
            currentPhase = null;
        }
    });
    
    if (negativePhases.length === 0) return 1.0;  // mai in negativo = massima elasticity
    
    const avgRecoveryLength = negativePhases.reduce((a, b) => a + b.length, 0) / negativePhases.length;
    
    return 1 / avgRecoveryLength;  // più alto = recupera più veloce
}
```

---

### ⬜ 7.3 Output Arricchito

```javascript
function analizzaTennisPowerRankingsEnhanced(tennisPowerRankings, matchContext) {
    // ... codice esistente ...
    
    // NUOVI CAMPI
    const volatility = calculateVolatility(tennisPowerRankings);
    const elasticity = calculateElasticity(tennisPowerRankings);
    
    // Adjust per superficie
    const surfaceThresholds = SURFACE_THRESHOLDS[matchContext.surface] || SURFACE_THRESHOLDS['Hard'];
    
    // Ricalcola statoAttuale con soglie dinamiche
    let statoAttuale = "";
    if (valueAttuale > surfaceThresholds.dominance) {
        statoAttuale = "Controllo netto o break effettuato";
    } else if (valueAttuale > surfaceThresholds.advantage) {
        statoAttuale = "Vantaggio nel game";
    } // ... etc
    
    return {
        // Campi esistenti
        set: ultimoValore.set,
        game: ultimoValore.game,
        valueAttuale: valueAttuale,
        statoAttuale: statoAttuale,
        differenza: differenza,
        dinamica: dinamica,
        breakTotali: breakTotali,
        
        // NUOVI CAMPI
        volatility: volatility,
        volatilityClass: classifyVolatility(volatility),
        elasticity: elasticity,
        elasticityClass: elasticity > 0.5 ? "RESILIENTE" : "FRAGILE",
        surfaceContext: matchContext.surface,
        formatContext: matchContext.bestOf,
        
        // Insight aggregato
        matchCharacter: generateMatchCharacter(volatility, elasticity, breakTotali)
    };
}

function generateMatchCharacter(volatility, elasticity, breaks) {
    if (volatility > 30 && breaks > 4) return "BATTAGLIA_EMOTIVA";
    if (volatility < 15 && breaks < 2) return "DOMINIO_UNILATERALE";
    if (elasticity > 0.6 && breaks > 2) return "RIMONTE_FREQUENTI";
    return "MATCH_STANDARD";
}
```

---

### ⬜ 7.4 Upgrade Strategie Base

```javascript
// UPGRADE layTheWinnerStrategy
function layTheWinnerStrategyV2(params) {
    const { 
        currentSet, winnerFirstSet, marketOdds, favoritePlayer,
        surface, bestOf, series,  // NUOVI
        playerStats               // NUOVO: storico giocatore
    } = params;
    
    // Soglia dinamica
    const comebackRate = SURFACE_THRESHOLDS[surface]?.comeback_rate || 0.20;
    const formatMultiplier = bestOf === 5 ? 1.4 : 1.0;
    const adjustedRate = comebackRate * formatMultiplier;
    
    if (currentSet === 2 && winnerFirstSet !== favoritePlayer) {
        // Check storico specifico del giocatore
        const playerComebackRate = playerStats?.comeback_rate || adjustedRate;
        
        // Soglia quota dinamica per serie
        const oddsThreshold = series === 'Grand Slam' ? 1.70 : 1.60;
        
        if (marketOdds[winnerFirstSet] < oddsThreshold) {
            const confidence = Math.min(
                (playerComebackRate / adjustedRate) * 0.7 + 0.3,
                0.95
            );
            
            return {
                action: "LAY",
                target: winnerFirstSet,
                confidence: confidence,
                reason: `Rimonta attesa: ${(playerComebackRate*100).toFixed(1)}% (base ${surface}: ${(comebackRate*100).toFixed(1)}%)`,
                factors: {
                    surface: surface,
                    format: bestOf === 5 ? "Bo5 +40%" : "Bo3",
                    player_history: playerComebackRate > adjustedRate ? "ABOVE_AVG" : "BELOW_AVG"
                }
            };
        }
    }
    return null;
}
```

---

## 📋 RIEPILOGO TODO MODULO 7

- ✅ 7.1 Aggiungere Volatility al Value Interpreter
- ✅ 7.2 Aggiungere Elasticity
- ⬜ 7.3 Output Arricchito con contesto
- ⬜ 7.4 Upgrade Strategie Base con dati storici

---

# 📋 RIEPILOGO TODO COMPLETO (AGGIORNATO 23/12/2025)

## Modulo 1: Database & Metriche (16 TODO)
### ✅ Completati (5):
- ✅ 1.3 Segmentazione Match (matchSegmenter.js)
- ✅ 1.4 Momentum Base (valueInterpreter.js)
- ✅ 1.5 Momentum Volatility (valueInterpreter.js)
- ✅ 1.6 Momentum Elasticity (valueInterpreter.js)
- ✅ 1.13 Pressure Metrics Live (pressureCalculator.js)

### ⬜ Da fare (11):
- ⬜ 1.1, 1.2, 1.7-1.12, 1.14-1.16

## Modulo 2: Odds & Value Engine (14 TODO)
- ⬜ 2.1 - 2.14 (tutti pending)

## Modulo 3: AI Analysis Layer (6 TODO)
- ⬜ 3.1 - 3.6 (tutti pending)

## Modulo 4: Trading Engine (6 TODO)
- ⬜ 4.1 - 4.6 (tutti pending)

## Modulo 5: Frontend (4 TODO)
- ⬜ 5.1 - 5.4 (tutti pending)

## Modulo 6: Potenziamenti Storici (11 TODO)
### ✅ Completati (1):
- ✅ 6.1 Soglie Dinamiche Superficie (valueInterpreter.js)

### ⬜ Da fare (10):
- ⬜ 6.2 - 6.11

## Modulo 7: Upgrade Codice Esistente (4 TODO)
### ✅ Completati (2):
- ✅ 7.1 Volatility al Value Interpreter
- ✅ 7.2 Elasticity

### ⬜ Da fare (2):
- ⬜ 7.3, 7.4

---

## 📊 STATISTICHE AVANZAMENTO

| Modulo | Completati | Totale | % |
|--------|------------|--------|---|
| 1. Database & Metriche | 5 | 16 | 31% |
| 2. Odds Engine | 0 | 14 | 0% |
| 3. AI Layer | 0 | 6 | 0% |
| 4. Trading Engine | 0 | 6 | 0% |
| 5. Frontend | 0 | 4 | 0% |
| 6. Potenziamenti | 1 | 11 | 9% |
| 7. Upgrade Codice | 2 | 4 | 50% |
| **TOTALE** | **8** | **61** | **13%** |

---

# 📚 DOCUMENTI CORRELATI

- `README.md` - Architettura generale e schema DB
- `FILOSOFIA_DB.md` - Filosofia Database e Acquisizione Dati
- `FILOSOFIA_STATS.md` - Filosofia Statistiche

---

**FINE DOCUMENTO**

*Ultimo aggiornamento: 23 Dicembre 2025*
*Versione: 2.7 - Aggiornato stato TODO, fix bug player stats*
