# 📊 FILOSOFIA_STATS - Guida alle Funzioni di Calcolo

> **Scopo**: Documentare TUTTE le funzioni che trasformano dati puri in metriche derivate.
> Questo documento serve come riferimento per controllare, migliorare e potenziare le funzioni di calcolo.

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Backend - Funzioni di Calcolo](#backend---funzioni-di-calcolo)
   - [valueInterpreter.js](#valueinterpreterjs---interpretazione-momentum)
   - [playerStatsService.js](#playerstatsservicejs---statistiche-giocatori)
   - [matchCardService.js](#matchcardservicejs---qualità-dati)
   - [dataNormalizer.js](#datanormalizerjs---normalizzazione)
3. [Frontend - Funzioni di Calcolo](#frontend---funzioni-di-calcolo)
   - [utils.js](#utilsjs---utility-principali)
   - [MomentumTab.jsx](#momentumtabjsx---analisi-momentum)
   - [QuotesTab.jsx](#quotestabljsx---probabilità-avanzate)
   - [ManualPredictor.jsx](#manualpredictorjsx---predizioni)
4. [Formule Chiave](#formule-chiave)
5. [Idee Future](#idee-future)

---

## 🎯 Panoramica

### Flusso Dati → Calcolo → Output

```
┌──────────────────────────────────────────────────────────────┐
│                    DATI PURI (Database)                       │
│  matches, statistics, power_rankings, point_by_point, odds   │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│              FUNZIONI DI TRASFORMAZIONE                       │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ Momentum    │  │ Statistics  │  │ Probability         │   │
│  │ Analysis    │  │ Aggregation │  │ Calculations        │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ Trading     │  │ Data        │  │ Player              │   │
│  │ Strategies  │  │ Quality     │  │ Matching            │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    METRICHE DERIVATE                          │
│  volatility, elasticity, win_rate, ROI, pressure_index,      │
│  probability, value_signals, trading_recommendations         │
└──────────────────────────────────────────────────────────────┘
```

### Categorie Funzioni

| Categoria | Backend | Frontend | Totale |
|-----------|---------|----------|--------|
| **Momentum Analysis** | 12 | 8 | 20 |
| **Statistics Aggregation** | 8 | 3 | 11 |
| **Probability/Prediction** | 2 | 5 | 7 |
| **Trading Strategies** | 2 | 4 | 6 |
| **Data Normalization** | 12 | 15 | 27 |
| **Data Quality** | 1 | 2 | 3 |

---

## 🖥️ Backend - Funzioni di Calcolo

### valueInterpreter.js - Interpretazione Momentum

📁 **File**: `backend/utils/valueInterpreter.js`

#### `getThresholdsForSurface(surface)`
**Linee**: 51-76

**Input**: `string` (Hard, Clay, Grass, Indoor Hard)

**Output**:
```javascript
{
  strongControl: number,    // Soglia controllo forte
  advantage: number,        // Soglia vantaggio
  negativePressure: number, // Soglia pressione negativa
  description: string
}
```

**Logica**:
```javascript
SURFACE_THRESHOLDS = {
  'Hard':        { strongControl: 60, advantage: 20, negativePressure: -20 },
  'Clay':        { strongControl: 55, advantage: 18, negativePressure: -18 },  // Più equilibrato
  'Grass':       { strongControl: 65, advantage: 25, negativePressure: -25 },  // Più volatile
  'Indoor Hard': { strongControl: 62, advantage: 22, negativePressure: -22 }
}
```

**Note**: Clay ha soglie più basse perché i match sono più equilibrati. Grass più alte per volatilità maggiore.

---

#### `interpretGameValue(value, surface, context)`
**Linee**: 87-160

**Input**: 
- `value`: number (valore momentum SofaScore, tipicamente -100 a +100)
- `surface`: string
- `context`: object (optional, contiene break info)

**Output**:
```javascript
{
  status: 'positive' | 'neutral' | 'warning' | 'critical',
  zone: 'strong_control' | 'advantage' | 'balanced_positive' | 'slight_pressure' | 'strong_pressure',
  tags: ['break', 'service_domination', 'pressure_point', ...],
  messages: { en: string, it: string },
  thresholds: object
}
```

**Logica**:
- Se `value >= strongControl` → status: 'positive', zone: 'strong_control'
- Se `value >= advantage` → status: 'positive', zone: 'advantage'
- Se `value >= 0` → status: 'neutral', zone: 'balanced_positive'
- Se `value >= negativePressure` → status: 'warning', zone: 'slight_pressure'
- Altrimenti → status: 'critical', zone: 'strong_pressure'

---

#### `calculateVolatility(powerRankings)`
**Linee**: 264-295

**Input**: `Array<{value: number}>`

**Output**:
```javascript
{
  value: number,        // Media delta tra game consecutivi
  class: 'STABILE' | 'MODERATO' | 'VOLATILE' | 'MOLTO_VOLATILE',
  deltas: number[],
  maxSwing: number,
  minSwing: number,
  percentage: number    // 0-100 per visualizzazione
}
```

**Formula**:
```
volatility = Σ|value[i] - value[i-1]| / (n-1)

Classificazione:
- STABILE: volatility < 15
- MODERATO: volatility < 30
- VOLATILE: volatility < 50
- MOLTO_VOLATILE: volatility >= 50
```

---

#### `calculateElasticity(powerRankings)`
**Linee**: 302-345

**Input**: `Array<{value: number}>`

**Output**:
```javascript
{
  value: number,           // Score elasticità
  class: 'RESILIENTE' | 'NORMALE' | 'FRAGILE',
  negative_phases: number, // Fasi con value < -15
  avg_recovery_games: number,
  percentage: number
}
```

**Formula**:
```
Per ogni fase negativa (value < -15):
  - Conta game fino a recupero (value > 0)
  - Se non recupera: penalità = 10 game

avg_recovery = Σ recovery_games / negative_phases
elasticity = 100 - (avg_recovery * 10)

Classificazione:
- RESILIENTE: elasticity >= 70
- NORMALE: elasticity >= 40
- FRAGILE: elasticity < 40
```

---

#### `classifyMatchCharacter(volatility, elasticity, breakCount)`
**Linee**: 352-378

**Input**: 
- `volatility`: object (da calculateVolatility)
- `elasticity`: object (da calculateElasticity)
- `breakCount`: number

**Output**:
```javascript
{
  character: string,
  description: string,
  emoji: string,
  color: string
}
```

**Logica Decisionale**:
```javascript
if (breakCount > 8 && volatility.class === 'MOLTO_VOLATILE')
  → 'BATTAGLIA_EMOTIVA' ⚔️

if (elasticity.class === 'FRAGILE' && volatility.class === 'STABILE')
  → 'DOMINIO_UNILATERALE' 👑

if (elasticity.class === 'RESILIENTE' && breakCount > 4)
  → 'RIMONTE_FREQUENTI' 🔄

if (volatility.class === 'VOLATILE' && elasticity.class === 'NORMALE')
  → 'ALTALENA' 🎢

default → 'MATCH_STANDARD' 📊
```

---

#### `detectTrendShift(powerRankings, windowSize)`
**Linee**: 385-415

**Input**: 
- `powerRankings`: Array
- `windowSize`: number (default: 5)

**Output**:
```javascript
{
  isShifting: boolean,
  direction: 'home' | 'away' | null,
  magnitude: number,
  recentAvg: number,
  previousAvg: number
}
```

**Formula**:
```
recentAvg = avg(ultimi windowSize games)
previousAvg = avg(windowSize games precedenti)
shift = recentAvg - previousAvg

isShifting = |shift| > 20
direction = shift > 0 ? 'home' : 'away'
```

---

#### `analyzePowerRankingsEnhanced(powerRankings, matchContext)`
**Linee**: 424-475

**Input**:
- `powerRankings`: Array
- `matchContext`: `{ surface, bestOf, series, homeName, awayName }`

**Output**: Oggetto completo con tutte le analisi:
```javascript
{
  basic: { totalGames, breaks, averageValue },
  volatility: { value, class, percent, deltas, maxSwing },
  elasticity: { value, class, percent, negative_phases, avg_recovery_games },
  trend: { current_trend, recent_avg, match_avg },
  setAnalysis: [{ set, games, averageValue, breaks, dominant }],
  playerMomentum: { home: {controlPercent}, away: {controlPercent}, currentOwner },
  formatAdjustment: { format, volatilityWeight, breakImportance },
  tradingIndicators: { riskLevel, layConfidence, comebackOpportunity, recommendedStrategy }
}
```

**Uso**: Funzione master che combina tutte le analisi momentum in un unico oggetto.

---

#### `generateTradingIndicators(analysis)`
**Linee**: 595-623

**Input**: Oggetto analisi completo

**Output**:
```javascript
{
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
  layConfidence: number,      // 0-100
  comebackOpportunity: number, // 0-100
  recommendedStrategy: string
}
```

**Logica**:
```javascript
// Risk Level
if (volatility.class === 'MOLTO_VOLATILE') riskLevel = 'HIGH'
else if (volatility.class === 'VOLATILE') riskLevel = 'MEDIUM'
else riskLevel = 'LOW'

// Lay Confidence (fiducia nel lay del leader)
layConfidence = 50 + (elasticity.value - 50) * 0.5

// Comeback Opportunity
comebackOpportunity = elasticity.percentage * (volatility.value / 50)
```

---

#### `getRecommendedStrategy(riskLevel, layConf, comebackOpp, trend)`
**Linee**: 628-642

**Output**: `'HOLD' | 'BACK_COMEBACK' | 'CAUTION' | 'LAY_LOSER' | 'MONITOR'`

**Logica**:
```javascript
if (riskLevel === 'HIGH' && comebackOpp > 60) return 'BACK_COMEBACK'
if (riskLevel === 'HIGH') return 'CAUTION'
if (layConf > 70 && trend === 'STABLE') return 'LAY_LOSER'
if (comebackOpp > 70) return 'BACK_COMEBACK'
return 'MONITOR'
```

---

### playerStatsService.js - Statistiche Giocatori

📁 **File**: `backend/services/playerStatsService.js`

#### `calculateComebackRate(matches, playerName)`
**Linee**: 111-138

**Input**: 
- `matches`: Array di match
- `playerName`: string

**Output**:
```javascript
{
  rate: number,          // 0-1
  wins_after_losing_set1: number,
  total_matches_lost_set1: number
}
```

**Formula**:
```javascript
// Per ogni match:
if (player lost set 1 && player won match) {
  wins_after_losing_set1++
}
if (player lost set 1) {
  total_matches_lost_set1++
}

rate = wins_after_losing_set1 / total_matches_lost_set1
```

**Note**: Analizza il campo `w1`/`l1` per determinare chi ha vinto il primo set.

---

#### `calculateROI(matches, playerName, oddsField)`
**Linee**: 143-178

**Input**:
- `matches`: Array
- `playerName`: string
- `oddsField`: 'avgw' | 'maxw' | 'avg_odds_winner'

**Output**:
```javascript
{
  roi: number,           // Percentuale ROI
  totalBets: number,
  totalReturn: number,
  avgOdds: number,
  profitUnits: number
}
```

**Formula**:
```javascript
// Per ogni match:
stake = 1 unit
if (player won) {
  totalReturn += stake * odds
}
totalStake += stake

roi = ((totalReturn - totalStake) / totalStake) * 100
```

---

#### `aggregateByField(matches, playerName, fieldName, groupFn)`
**Pattern generale usato da**:
- `aggregateBySurface()` - Linee 183-240
- `aggregateByFormat()` - Linee 245-278
- `aggregateBySeries()` - Linee 283-316

**Output per gruppo**:
```javascript
{
  [groupKey]: {
    matches: number,
    wins: number,
    losses: number,
    win_rate: number,
    comeback_rate: number,
    avg_odds: number
  }
}
```

---

#### `getPlayerStats(playerName)`
**Linee**: 324-393

**Input**: `playerName`: string

**Output**: Statistiche complete giocatore
```javascript
{
  name: string,
  total_matches: number,
  wins: number,
  losses: number,
  win_rate: number,
  by_surface: {
    Hard: { matches, wins, win_rate, comeback_rate },
    Clay: { ... },
    Grass: { ... }
  },
  by_format: {
    best_of_3: { ... },
    best_of_5: { ... }
  },
  by_series: {
    'Grand Slam': { ... },
    'Masters 1000': { ... },
    ...
  },
  comeback_rate: number,
  roi: { roi, totalBets, profitUnits }
}
```

---

### matchCardService.js - Qualità Dati

📁 **File**: `backend/services/matchCardService.js`

#### `calculateDataQuality(sources, stats, momentum, pbp)`
**Linee**: 383-401

**Input**:
- `sources`: Array di fonti dati
- `stats`: Object statistiche
- `momentum`: Array power rankings
- `pbp`: Array point-by-point

**Output**: `number` (0-100)

**Formula**:
```javascript
let score = 20  // Base

if (sources.length > 1) score += 10  // Multiple sources bonus

if (stats && Object.keys(stats).length > 0) score += 25
if (momentum && momentum.length > 0) score += 25
if (pbp && pbp.length > 0) score += 20

return Math.min(score, 100)
```

---

### dataNormalizer.js - Normalizzazione

📁 **File**: `backend/services/dataNormalizer.js`

#### `normalizePlayerName(name)`
**Linee**: 315-368

**Input**: `string` (es. "Sinner J.", "SINNER Jannik", "J. Sinner")

**Output**: `string` (es. "Jannik Sinner")

**Logica**:
1. Cerca in `PLAYER_NAME_MAPPINGS` (200+ mappings manuali)
2. Se formato "Cognome I." → cerca nel mapping
3. Se formato "I. Cognome" → normalizza
4. Ritorna nome normalizzato o originale

**Mappings Esempio**:
```javascript
PLAYER_NAME_MAPPINGS = {
  'sinner j': 'Jannik Sinner',
  'j sinner': 'Jannik Sinner',
  'alcaraz c': 'Carlos Alcaraz',
  'alcaraz garfia c': 'Carlos Alcaraz',
  // ... 200+ mappings
}
```

---

#### `calculateSimilarity(str1, str2)`
**Linee**: 513-523

**Input**: Due stringhe

**Output**: `number` (0-1, dove 1 = identiche)

**Formula**:
```javascript
similarity = (longerLength - levenshteinDistance) / longerLength
```

---

#### `levenshteinDistance(str1, str2)`
**Linee**: 525-542

**Algoritmo**: Edit distance classico
- Costo 1 per insert, delete, replace
- Implementazione con matrice DP

---

#### `createMatchFingerprint(match)`
**Linee**: 475-497

**Input**: Match object

**Output**: `string` (fingerprint unico)

**Formula**:
```javascript
// Ordina giocatori alfabeticamente
players = [player1, player2].sort()

fingerprint = `${normalizedDate}_${players[0]}_${players[1]}_${surface}`
```

**Uso**: Identificare match duplicati da fonti diverse.

---

#### `impliedProbability(odds)`
**Linee**: 461-465

**Input**: `number` (quota decimale, es. 1.85)

**Output**: `number` (probabilità implicita)

**Formula**:
```javascript
probability = 1 / odds
// Es: odds 1.85 → 1/1.85 = 0.54 (54%)
```

---

## 🖼️ Frontend - Funzioni di Calcolo

### utils.js - Utility Principali

📁 **File**: `src/utils.js`

#### `extractKeyStats(data)`
**Linee**: 1549-1607

**Input**: Match data object

**Output**:
```javascript
{
  player1: {
    aces: number,
    doubleFaults: number,
    firstServePercent: number,
    firstServeWonPercent: number,
    secondServeWonPercent: number,
    breakPointsSaved: string,  // "5/8"
    breakPointsConverted: string
  },
  player2: { ... }
}
```

**Logica**: Cerca nelle statistiche i campi noti, gestisce vari formati (numero, "37/59 (63%)", etc.)

---

#### `calculatePressureIndex(playerStats)`
**Linee**: 1614-1680

**Input**: Stats oggetto singolo giocatore

**Output**:
```javascript
{
  index: number,         // 0-100
  level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL',
  factors: {
    doubleFaults: { value, contribution },
    firstServe: { value, contribution },
    secondServe: { value, contribution },
    breakPoints: { value, contribution }
  }
}
```

**Formula**:
```javascript
// Pesi
WEIGHTS = {
  doubleFaults: 0.25,
  firstServe: 0.30,
  secondServe: 0.25,
  breakPoints: 0.20
}

// Contributi (inversi per metriche positive)
dfContrib = (doubleFaults / 10) * 100 * 0.25  // Più DF = più pressione
firstContrib = (100 - firstServePercent) * 0.30
secondContrib = (100 - secondServeWon) * 0.25
bpContrib = (100 - breakPointsSaved%) * 0.20

index = dfContrib + firstContrib + secondContrib + bpContrib

// Livelli
CRITICAL: index >= 70
HIGH: index >= 50
MODERATE: index >= 30
LOW: index >= 15
MINIMAL: index < 15
```

---

#### `analyzeLayTheWinner(matchData)`
**Linee**: 1690-1807

**Input**: Match data completo

**Output**:
```javascript
{
  recommendation: 'LAY' | 'HOLD' | 'CAUTION',
  target: 'player1' | 'player2',
  confidence: number,    // 0-100
  reasons: string[],
  riskFactors: string[],
  exitStrategy: string,
  analysis: {
    setWinner: string,
    comebackRate: number,
    momentumShift: boolean,
    pressureOnServer: boolean
  }
}
```

**Logica**:
```javascript
// Strategia: Lay chi vince il primo set

// 1. Identifica vincitore Set 1
setWinner = scores.period1.home > scores.period1.away ? 'player1' : 'player2'

// 2. Calcola probabilità comeback per superficie
COMEBACK_RATES = {
  'Clay': 0.28,    // Più rimonte su terra
  'Hard': 0.22,
  'Grass': 0.18    // Meno rimonte su erba
}

// 3. Aggiustamenti
if (bestOf5) comebackRate *= 1.4  // +40% per Bo5
if (momentumShift) confidence += 15
if (highPressureOnWinner) confidence += 10

// 4. Raccomandazione
if (confidence > 60) return 'LAY'
if (confidence > 40) return 'HOLD'
return 'CAUTION'
```

---

#### `analyzeBankTheServer(matchData)`
**Linee**: 1815-1972

**Input**: Match data

**Output**:
```javascript
{
  recommendation: 'BANK' | 'HOLD' | 'SKIP',
  server: 'player1' | 'player2',
  confidence: number,
  gameScore: string,
  breakPointsAgainst: number,
  pressureIndex: number,
  analysis: { ... }
}
```

**Logica**:
```javascript
// Strategia: Bank il server sotto pressione che tiene

// 1. Identifica chi sta servendo
server = getCurrentServer(pointByPoint)

// 2. Calcola pressione
pressureIndex = calculatePressureIndex(serverStats)

// 3. Analizza break points
if (breakPointsAgainst > 0 && serverHolding) {
  confidence += 20
}

// 4. Raccomandazione
if (pressureIndex > 50 && serverPerformance > 70) return 'BANK'
```

---

#### `analyzeSuperBreak(matchData)`
**Linee**: 1980-2200

**Input**: Match data

**Output**:
```javascript
{
  recommendation: 'BACK' | 'HOLD' | 'EXIT',
  target: 'player1' | 'player2',
  confidence: number,
  dominanceScore: number,
  exitTrigger: string,
  analysis: {
    aceDominance: number,
    serveDominance: number,
    breakPointDominance: number,
    isTiebreak: boolean
  }
}
```

**Formula Dominance**:
```javascript
// Calcola dominanza per categoria
aceDominance = (p1Aces - p2Aces) / max(p1Aces + p2Aces, 1) * 100
serveDominance = p1FirstServeWon - p2FirstServeWon
breakDominance = (p1BPConverted - p2BPConverted) * 10

dominanceScore = (aceDominance * 0.3) + (serveDominance * 0.4) + (breakDominance * 0.3)

// Exit su tiebreak
if (isTiebreak) return { recommendation: 'EXIT', reason: 'Tiebreak - troppo rischioso' }
```

---

#### `calculateDataCompleteness(rawData)`
**Linee**: 2327-2408

**Input**: Raw API response

**Output**:
```javascript
{
  score: number,         // 0-100
  breakdown: {
    event: { present: boolean, weight: 20 },
    pointByPoint: { present: boolean, weight: 20 },
    statistics: { present: boolean, weight: 15 },
    incidents: { present: boolean, weight: 10 },
    h2h: { present: boolean, weight: 10 },
    powerRankings: { present: boolean, weight: 10 },
    lineups: { present: boolean, weight: 5 },
    graph: { present: boolean, weight: 10 }
  },
  missingData: string[]
}
```

**Formula**:
```javascript
weights = {
  event: 20,
  pointByPoint: 20,
  statistics: 15,
  incidents: 10,
  h2h: 10,
  powerRankings: 10,
  lineups: 5,
  graph: 10
}

score = Σ (hasData[field] ? weights[field] : 0)
```

---

### MomentumTab.jsx - Analisi Momentum

📁 **File**: `src/components/MomentumTab.jsx`

#### `addVolatilityVisualization(powerRankings)`
**Linee**: 18-52

**Input**: Array power rankings

**Output**: Array con `visualPercent` aggiunto
```javascript
[
  { ...originalData, visualPercent: number }  // 0-60 per progress bar
]
```

**Formula**:
```javascript
// Normalizza value (-100,+100) a (0,60) per visualizzazione
visualPercent = ((value + 100) / 200) * 60
```

---

#### `addElasticityVisualization(powerRankings)`
**Linee**: 57-97

**Input**: Array power rankings

**Output**: Array con `elasticityVisual` aggiunto

**Formula**:
```javascript
elasticityVisual = elasticityValue * 100
```

---

#### `analyzeMomentumOwner(powerRankings, homeName, awayName)`
**Linee**: 141-178

**Input**:
- `powerRankings`: Array
- `homeName`, `awayName`: string

**Output**:
```javascript
{
  owner: 'home' | 'away' | 'balanced',
  ownerName: string,
  strength: number,        // 0-100
  reason: string,          // "sta dominando", "leggero controllo", etc.
  lastValue: number,
  avgLast3: number,
  avgLast5: number
}
```

**Logica**:
```javascript
avgLast5 = average(last 5 games)

if (avgLast5 > 30) {
  owner = 'home'
  strength = min(avgLast5, 100)
  reason = avgLast5 > 50 ? 'sta dominando' : 'leggero controllo'
}
else if (avgLast5 < -30) {
  owner = 'away'
  strength = min(abs(avgLast5), 100)
}
else {
  owner = 'balanced'
  reason = 'equilibrio'
}
```

---

#### `detectMomentumShift(powerRankings, homeName, awayName)`
**Linee**: 183-253

**Input**: Same as above

**Output**:
```javascript
{
  isShifting: boolean,
  direction: 'home' | 'away' | null,
  cause: 'Break subito' | 'Errori non forzati' | 'Crescita avversario' | 'Calo rendimento',
  confidence: number,
  metrics: {
    shift: number,
    trendSlope: number,
    volatility: number,
    recentBreaks: number
  }
}
```

**Formula**:
```javascript
avgLast5 = average(last 5 games)
avgPrev5 = average(games 6-10)
shift = avgLast5 - avgPrev5

isShifting = abs(shift) > 20

// Determina causa
if (hasRecentBreak) cause = 'Break subito'
else if (trendSlope < -5) cause = 'Calo rendimento'
else if (trendSlope > 5) cause = 'Crescita avversario'
else cause = 'Errori non forzati'
```

---

### QuotesTab.jsx - Probabilità Avanzate

📁 **File**: `src/components/QuotesTab.jsx`

#### `calculateEloWinProb(rankA, rankB)`
**Linee**: 50-55

**Input**: Due ranking ATP

**Output**: `number` (0-1)

**Formula**:
```javascript
diff = rankB - rankA  // Ranking più basso = migliore
probability = 1 / (1 + Math.pow(10, -diff / 400))
```

**Note**: Formula ELO-style dove diff/400 è il parametro di scala.

---

#### `useMemo: calculateAdvancedProbability`
**Linee**: 103-332

**Input**: Multiple (stats1, stats2, odds, momentum, surface, etc.)

**Output**:
```javascript
{
  player1: number,       // Probabilità P1 (0-1)
  player2: number,       // Probabilità P2 (0-1)
  confidence: number,    // Affidabilità calcolo (0-1)
  factors: {
    historical: { weight: 0.25, p1: number, p2: number },
    surface: { weight: 0.20, p1: number, p2: number },
    format: { weight: 0.10, p1: number, p2: number },
    ranking: { weight: 0.15, p1: number, p2: number },
    momentum: { weight: 0.15, p1: number, p2: number },
    comeback: { weight: 0.10, p1: number, p2: number },
    experience: { weight: 0.05, p1: number, p2: number }
  }
}
```

**Formula Completa**:
```javascript
WEIGHTS = {
  HISTORICAL_WIN_RATE: 0.25,
  SURFACE_WIN_RATE: 0.20,
  FORMAT_WIN_RATE: 0.10,
  RANKING: 0.15,
  MOMENTUM_LIVE: 0.15,
  COMEBACK_RATE: 0.10,
  EXPERIENCE: 0.05
}

// Per ogni fattore, calcola contributo
historicalP1 = stats1.win_rate || 0.5
surfaceP1 = stats1.by_surface[surface]?.win_rate || historicalP1
formatP1 = stats1.by_format[bestOf]?.win_rate || historicalP1
rankingP1 = calculateEloWinProb(rank1, rank2)
momentumP1 = (currentMomentum + 100) / 200  // Normalizza -100,+100 a 0,1

// Combina
rawP1 = Σ (factor_p1 * weight)
rawP2 = Σ (factor_p2 * weight)

// Normalizza a somma 1
total = rawP1 + rawP2
p1 = rawP1 / total
p2 = rawP2 / total

// Confidence
confidence = (hasStats1 + hasStats2 + hasRanking + hasMomentum) / 4
```

---

#### `useMemo: impliedOdds`
**Linee**: 335-339

**Input**: Probabilità calcolate

**Output**: Quote implicite
```javascript
{
  player1: 1 / probability1,  // Es: 0.6 → 1.67
  player2: 1 / probability2
}
```

---

#### `useMemo: valueSignals`
**Linee**: 342-417

**Input**: Quote Betfair + probabilità stimate

**Output**:
```javascript
{
  player1: {
    signal: 'BUY' | 'WATCH' | 'NEUTRAL' | 'CAUTION' | 'SELL',
    edge: number,        // Differenza percentuale
    color: string
  },
  player2: { ... }
}
```

**Logica**:
```javascript
impliedFromBetfair = 1 / betfairOdds
edge = (estimatedProb - impliedFromBetfair) * 100

if (edge > 8) signal = 'BUY'      // Value significativo
if (edge > 3) signal = 'WATCH'   // Potenziale value
if (edge > -3) signal = 'NEUTRAL'
if (edge > -8) signal = 'CAUTION'
else signal = 'SELL'             // Overpriced
```

---

### ManualPredictor.jsx - Predizioni

📁 **File**: `src/components/ManualPredictor.jsx`

#### `calculatePrediction()`
**Linee**: 306-362

**Input**: State interno (player1Stats, player2Stats, h2h)

**Output**:
```javascript
{
  player1Prob: number,
  player2Prob: number,
  confidence: number,
  factors: string[]
}
```

**Formula**:
```javascript
// 1. Base: Win Rate con peso esperienza
matchWeight1 = Math.min(player1Stats.total_matches / 50, 1)
matchWeight2 = Math.min(player2Stats.total_matches / 50, 1)

baseP1 = player1Stats.win_rate * matchWeight1
baseP2 = player2Stats.win_rate * matchWeight2

// 2. H2H Bonus (se disponibile)
if (h2h) {
  h2hWinRate1 = h2h.player1Wins / (h2h.player1Wins + h2h.player2Wins)
  h2hBonus1 = (h2hWinRate1 - 0.5) * 0.15  // Max ±7.5%
}

// 3. Comeback Bonus
comebackBonus1 = player1Stats.comeback_rate * 0.1

// 4. Combina
rawP1 = baseP1 + h2hBonus1 + comebackBonus1
rawP2 = baseP2 + h2hBonus2 + comebackBonus2

// Normalizza
total = rawP1 + rawP2
prob1 = rawP1 / total

// Confidence
dataQuality = (hasStats1 * 0.35 + hasStats2 * 0.35 + hasH2H * 0.30)
confidence = dataQuality
```

---

## 📐 Formule Chiave

### Riepilogo Formule Principali

| Nome | Formula | Uso |
|------|---------|-----|
| **Volatility** | `Σ\|Δvalue\| / (n-1)` | Misura oscillazione momentum |
| **Elasticity** | `100 - (avg_recovery * 10)` | Capacità di recupero |
| **ELO Win Prob** | `1 / (1 + 10^(-diff/400))` | Probabilità da ranking |
| **Implied Prob** | `1 / odds` | Probabilità dalle quote |
| **ROI** | `(return - stake) / stake * 100` | Ritorno investimento |
| **Pressure Index** | `Σ(factor * weight)` | Pressione su giocatore |
| **Similarity** | `(len - levenshtein) / len` | Matching nomi |
| **Data Quality** | `base + Σ(hasData * weight)` | Completezza dati |

### Soglie Importanti

| Metrica | Soglia | Significato |
|---------|--------|-------------|
| Momentum Shift | `\|Δavg5\| > 20` | Cambio momentum significativo |
| Strong Control | `value > 60` (Hard) | Dominio completo |
| Volatility Alta | `> 30` | Match imprevedibile |
| Elasticity Buona | `> 70` | Giocatore resiliente |
| Value Bet | `edge > 8%` | Scommessa con valore |
| Pressure Critical | `index > 70` | Giocatore in difficoltà |

---

## 💡 Idee Future

### Da Implementare

#### 1. **Persistenza Metriche Calcolate**
Salvare nel DB le metriche derivate per evitare ricalcoli:

```sql
CREATE TABLE match_analytics (
  match_id INTEGER REFERENCES matches_new(id),
  volatility DECIMAL,
  volatility_class VARCHAR(20),
  elasticity DECIMAL,
  elasticity_class VARCHAR(20),
  match_character VARCHAR(30),
  pressure_index_p1 DECIMAL,
  pressure_index_p2 DECIMAL,
  data_quality INTEGER,
  calculated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. **Player Analytics Aggregati**
Pre-calcolare statistiche giocatore:

```sql
CREATE TABLE player_analytics (
  player_id INTEGER REFERENCES players_new(id),
  avg_volatility DECIMAL,
  avg_elasticity DECIMAL,
  preferred_character VARCHAR(30),  -- Tipo match preferito
  pressure_handling DECIMAL,        -- Come gestisce pressione
  comeback_specialist BOOLEAN,
  surface_specialist VARCHAR(20),
  updated_at TIMESTAMP
);
```

#### 3. **Nuove Funzioni Calcolo**

| Funzione | Input | Output | Scopo |
|----------|-------|--------|-------|
| `calculateFatigueFactor()` | Recent matches, travel | 0-1 | Stanchezza stimata |
| `predictSetDuration()` | Player styles, surface | minutes | Tempo stimato set |
| `calculateClutchFactor()` | Tiebreak stats, BP saved | 0-100 | Mentalità nei momenti chiave |
| `analyzeServeBotScore()` | Serve stats history | 0-100 | Quanto dipende dal servizio |
| `predictBreakProbability()` | Returner stats, server form | 0-1 | Probabilità break prossimo game |

#### 4. **Machine Learning Ready**

Preparare dati per ML:
```javascript
// Feature extraction per modello predittivo
extractMLFeatures(match) {
  return {
    // Player features
    p1_elo: number,
    p1_surface_wr: number,
    p1_recent_form: number,  // Win rate ultimi 10 match
    p1_h2h_wr: number,
    
    // Match context
    surface: one_hot_encoded,
    tournament_level: one_hot_encoded,
    round: number,
    is_bo5: boolean,
    
    // Calculated features
    volatility_expected: number,
    pressure_differential: number,
    
    // Target
    p1_won: boolean
  }
}
```

#### 5. **Real-time Calculations**

Durante match live:
- `updateLivePressure()` - Aggiorna ogni punto
- `predictNextGameWinner()` - Chi vincerà prossimo game
- `calculateLiveValueBet()` - Value bet in tempo reale
- `detectMomentumSwingLive()` - Alert cambio momentum

#### 6. **Backtest Framework**

```javascript
// Testare strategie su dati storici
backtestStrategy(strategyFn, matches, bankroll) {
  for (match of matches) {
    decision = strategyFn(match)
    result = simulateBet(decision, match.odds, match.outcome)
    updateBankroll(result)
  }
  return {
    totalROI,
    winRate,
    maxDrawdown,
    sharpeRatio
  }
}
```

---

## 📊 Mappatura Funzioni → File

### Quick Reference

| Funzione | File | Linee |
|----------|------|-------|
| `getThresholdsForSurface` | valueInterpreter.js | 51-76 |
| `interpretGameValue` | valueInterpreter.js | 87-160 |
| `calculateVolatility` | valueInterpreter.js | 264-295 |
| `calculateElasticity` | valueInterpreter.js | 302-345 |
| `classifyMatchCharacter` | valueInterpreter.js | 352-378 |
| `analyzePowerRankingsEnhanced` | valueInterpreter.js | 424-475 |
| `getPlayerStats` | playerStatsService.js | 324-393 |
| `calculateComebackRate` | playerStatsService.js | 111-138 |
| `calculateROI` | playerStatsService.js | 143-178 |
| `normalizePlayerName` | dataNormalizer.js | 315-368 |
| `createMatchFingerprint` | dataNormalizer.js | 475-497 |
| `extractKeyStats` | utils.js | 1549-1607 |
| `calculatePressureIndex` | utils.js | 1614-1680 |
| `analyzeLayTheWinner` | utils.js | 1690-1807 |
| `analyzeBankTheServer` | utils.js | 1815-1972 |
| `analyzeSuperBreak` | utils.js | 1980-2200 |
| `calculateDataCompleteness` | utils.js | 2327-2408 |
| `analyzeMomentumOwner` | MomentumTab.jsx | 141-178 |
| `detectMomentumShift` | MomentumTab.jsx | 183-253 |
| `calculateEloWinProb` | QuotesTab.jsx | 50-55 |
| `calculateAdvancedProbability` | QuotesTab.jsx | 103-332 |
| `calculatePrediction` | ManualPredictor.jsx | 306-362 |

---

**Ultimo aggiornamento**: 22 Dicembre 2025
