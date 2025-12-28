# 📘 GUIDA CONCETTUALE - Tennis Analyzer

> **Documento di riferimento** per comprendere i concetti chiave, le logiche di business e le architetture del progetto Tennis Analyzer.

---

## 🏗️ ARCHITETTURA GENERALE

Il sistema è composto da 5 layer principali:

```
┌────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                       │
│  Components → Hooks → State Management → Visualizzazione   │
└─────────────────────────┬──────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│                    API LAYER (Express)                      │
│     Routes → Controllers → Validation → Response Format     │
└─────────────────────────┬──────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│               SERVICE LAYER (Business Logic)                │
│    playerService → matchCardService → playerProfileService  │
└─────────────────────────┬──────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│              CALCULATION LAYER (Analytics)                  │
│   valueInterpreter → pressureCalculator → matchSegmenter   │
└─────────────────────────┬──────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│                 DATA LAYER (Supabase)                       │
│        matchRepository → liveTrackingRepository            │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 CONCETTI FONDAMENTALI

### 1. HPI (Historical Performance Index)

**Definizione:** Indice composito che misura la performance storica di un giocatore pesando diversi fattori.

```
HPI = (win_rate × 0.35) + 
      (break_conversion × 0.25) + 
      (tiebreak_win_rate × 0.20) + 
      (comeback_rate × 0.20)
```

**Interpretazione:**
- `HPI > 0.75` → Elite performer
- `HPI 0.60-0.75` → Solid performer
- `HPI < 0.60` → Developing/inconsistent

---

### 2. Resilience Index (Elasticità)

**Definizione:** Misura la capacità di un giocatore di recuperare da situazioni sfavorevoli.

```javascript
// Calcolo Elasticity
function calculateElasticity(tennisPowerRankings) {
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
    
    if (negativePhases.length === 0) return 1.0;
    
    const avgRecoveryLength = negativePhases.reduce((a, b) => a + b.length, 0) 
                              / negativePhases.length;
    
    return 1 / avgRecoveryLength;  // più alto = recupera più veloce
}
```

**Classificazione:**
- `elasticity > 0.6` → RESILIENTE (recupera velocemente)
- `elasticity ≤ 0.6` → FRAGILE (fatica a recuperare)

---

### 3. Clutch Factor

**Definizione:** Performance nei momenti decisivi del match (break point, set point, match point).

```javascript
const clutchFactor = {
    break_point_saved_rate: 0.65,    // % BP salvati al servizio
    break_point_converted_rate: 0.42, // % BP convertiti in risposta
    set_point_won_rate: 0.78,         // % set point vinti
    match_point_won_rate: 0.85        // % match point vinti
};
```

---

### 4. Volatility (Volatilità Match)

**Definizione:** Quanto un match è imprevedibile, misurato dai cambiamenti nel tennisPowerRanking.

```javascript
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
```

**Classificazione:**
- `volatility > 40` → MOLTO_VOLATILE (match pazzo)
- `volatility 25-40` → VOLATILE (alti e bassi)
- `volatility 15-25` → MODERATO (normale)
- `volatility < 15` → STABILE (match controllato)

---

### 5. Match Character

**Definizione:** Classificazione qualitativa del tipo di partita basata su metriche combinate.

```javascript
function generateMatchCharacter(volatility, elasticity, breaks) {
    if (volatility > 30 && breaks > 4) return "BATTAGLIA_EMOTIVA";
    if (volatility < 15 && breaks < 2) return "DOMINIO_UNILATERALE";
    if (elasticity > 0.6 && breaks > 2) return "RIMONTE_FREQUENTI";
    return "MATCH_STANDARD";
}
```

---

## 🎾 SEGMENTAZIONE MATCH

### Set Segments

Ogni set è diviso in fasi logiche:

| Segment | Game Range | Descrizione |
|---------|------------|-------------|
| `OPENING` | 1-3 | Fase iniziale, adattamento |
| `DEVELOPMENT` | 4-6 | Sviluppo pattern |
| `CRITICAL` | 7+ | Fase decisiva |

### Momentum Phases

| Fase | Value Range | Significato |
|------|-------------|-------------|
| `DOMINANCE` | > 60 | Controllo netto |
| `ADVANTAGE` | 20-60 | Vantaggio solido |
| `EQUILIBRIUM` | -20 a +20 | Match in bilico |
| `PRESSURE` | -60 a -20 | Sotto pressione |
| `CRISIS` | < -60 | Situazione critica |

---

## 📈 SOGLIE DINAMICHE PER SUPERFICIE

Le soglie di interpretazione cambiano in base alla superficie:

```javascript
const SURFACE_THRESHOLDS = {
    'Hard': {
        dominance: 60,
        advantage: 20,
        equilibrium: 0,
        pressure: -20,
        comeback_rate: 0.1917
    },
    'Clay': {
        dominance: 55,      // terra più equilibrata
        advantage: 18,
        equilibrium: 0,
        pressure: -18,
        comeback_rate: 0.2072
    },
    'Grass': {
        dominance: 65,      // erba più volatile
        advantage: 25,
        equilibrium: 0,
        pressure: -25,
        comeback_rate: 0.2346  // più rimonte storiche
    }
};
```

**Regola:** Su erba soglie più alte perché il servizio domina di più.

---

## 🎯 SOGLIE PER FORMATO (Bo3 vs Bo5)

```javascript
const FORMAT_ADJUSTMENT = {
    'best_of_3': {
        comeback_multiplier: 1.0,
        set_weight: 0.5,
        comeback_rate: 0.1917
    },
    'best_of_5': {
        comeback_multiplier: 1.4,    // 40% più rimonte nei Grand Slam
        set_weight: 0.33,
        comeback_rate: 0.2682
    }
};
```

**Insight:** In Grand Slam (Bo5), la perdita del primo set ha meno peso.

---

## 🏆 CONFIGURAZIONE TORNEI

```javascript
const SERIES_CONFIG = {
    'Grand Slam': {
        importance: 1.0,
        upset_rate: 0.36,
        pressure_multiplier: 1.3,
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
        upset_rate: 0.38,       // più upset nei 250
        pressure_multiplier: 1.0,
        comeback_rate: 0.1804
    }
};
```

---

## 💰 VALUE ENGINE - CONCETTI

### Multi-Source Odds Analysis

Il sistema confronta quote da più fonti:

| Source | Tipo | Uso |
|--------|------|-----|
| Pinnacle | Sharp odds | Reference (più accurate) |
| Bet365 | Soft odds | Value hunting |
| Max | Best available | Arbitraggio |
| Avg | Market consensus | Baseline |

**Segnali Value:**
- **PINNACLE_DISAGREES:** Pinnacle > Bet365 di >5% → Sharp money su un lato
- **MARKET_SPLIT:** Max >> Avg di >15% → Mercato diviso, opportunità

### Implied Probability

```javascript
const impliedProbWinner = 1 / oddsWinner;
const impliedProbLoser = 1 / oddsLoser;
const overround = impliedProbWinner + impliedProbLoser - 1;
```

---

## 🤖 AI ANALYSIS LAYER - LOGICHE

### Pattern Recognition Rules

```javascript
const AI_RULES = {
    BREAK_PATTERN: {
        condition: "3+ break in set corrente",
        signal: "HIGH_BREAK_FREQUENCY",
        implication: "Match aperto, opportunità lay favorite"
    },
    MOMENTUM_SHIFT: {
        condition: "Value cambia >40 punti in 3 game",
        signal: "MOMENTUM_SWING",
        implication: "Possibile turning point"
    },
    FATIGUE_INDICATOR: {
        condition: "Set 3+ e elasticity < 0.4",
        signal: "FATIGUE_DETECTED",
        implication: "Giocatore in difficoltà fisica/mentale"
    }
};
```

---

## 📊 FATTORI DI PESO METRICHE

### Match Card Weights

```javascript
const MATCH_CARD_WEIGHTS = {
    recent_form: 0.25,        // Ultimi 10 match
    h2h: 0.15,                // Head to head
    surface_stats: 0.20,      // Performance su superficie
    tournament_history: 0.10, // Storico in questo torneo
    momentum: 0.15,           // Momentum attuale (se live)
    clutch: 0.15              // Performance nei momenti chiave
};
```

### Player Profile Weights

```javascript
const PROFILE_WEIGHTS = {
    career_stats: 0.20,
    current_season: 0.30,     // Peso maggiore stagione corrente
    last_3_months: 0.25,
    surface_specific: 0.25
};
```

---

## 🔄 FLUSSI DATI PRINCIPALI

### 1. Match Analysis Flow

```
Raw Event (SofaScore) 
    → rawEventsProcessor (normalizza)
    → matchSegmenter (segmenta per set/game)
    → valueInterpreter (calcola momentum)
    → pressureCalculator (identifica momenti chiave)
    → Frontend Display
```

### 2. Player Stats Flow

```
SofaScore API Data
    → unifiedImporter (importa/deduplica)
    → playerStatsService (aggrega metriche)
    → playerProfileService (costruisce profilo)
    → API Response
```

### 3. Live Tracking Flow

```
SofaScore Live API
    → liveManager (orchestra polling)
    → breakDetector (identifica break)
    → liveTrackingRepository (persiste)
    → calculationQueueWorker (calcoli async)
    → WebSocket Push
```

---

## 📦 STRUTTURA DATI CHIAVE

### Match Object

```javascript
{
    match_id: "uuid",
    tournament: "Australian Open",
    series: "Grand Slam",
    surface: "Hard",
    best_of: 5,
    player1: { id, name, rank },
    player2: { id, name, rank },
    score: {
        sets: [[6,4], [3,6], [7,5]],
        current_game: "40-30",
        serving: "player1"
    },
    momentum: {
        current_value: 35,
        phase: "ADVANTAGE",
        volatility: 22,
        elasticity: 0.65
    },
    odds: {
        player1: 1.75,
        player2: 2.10
    }
}
```

### Player Profile Object

```javascript
{
    player_id: "uuid",
    name: "Jannik Sinner",
    current_rank: 1,
    hpi: 0.82,
    clutch_factor: {
        bp_saved: 0.68,
        bp_converted: 0.44
    },
    surface_stats: {
        hard: { win_rate: 0.78, roi: 0.12 },
        clay: { win_rate: 0.71, roi: 0.05 },
        grass: { win_rate: 0.67, roi: -0.03 }
    },
    recent_form: {
        last_10: { wins: 8, losses: 2 },
        trend: "POSITIVE"
    }
}
```

---

## 🏁 STRATEGIE TRADING - LOGICHE BASE

### Lay The Winner (Post Set 1)

**Logica:** Dopo il primo set, se il vincitore del set è in forte vantaggio nelle quote, valutare lay.

**Condizioni:**
1. Set 2 iniziato
2. Vincitore set 1 ≠ Favorito pre-match
3. Quota vincitore set 1 < soglia (es. 1.60)
4. Storico rimonte del perdente > soglia superficie

### Set & Break Recovery

**Logica:** Giocatore sotto di 1 set E sotto di 1 break nel set corrente.

**Condizioni:**
1. Set 2 in corso
2. Giocatore sotto di 1 break
3. Storico recovery > 15%
4. Quote target > 3.0

### Tiebreak Strategy

**Logica:** Quando ci si avvicina al tiebreak (5-5, 6-5), valutare chi ha vantaggio.

**Condizioni:**
1. Game score 5-5 o 6-5
2. Server tiebreak win rate > 55%

---

## 📐 CONFIGURAZIONE COURT TYPE

```javascript
const COURT_CONFIG = {
    'Indoor': {
        serve_advantage: 1.15,
        upset_modifier: 0.95,
        tiebreak_rate: 0.22
    },
    'Outdoor': {
        serve_advantage: 1.0,
        upset_modifier: 1.0,
        tiebreak_rate: 0.19
    }
};
```

---

## 📊 STATISTICHE EMPIRICHE DI RIFERIMENTO

| Metrica | Hard | Clay | Grass |
|---------|------|------|-------|
| Comeback rate (Bo3) | 19.2% | 20.7% | 23.5% |
| Comeback rate (Bo5) | 26.8% | 27.5% | 28.1% |
| Tiebreak rate | 19% | 17% | 22% |
| Upset rate (top 20) | 35% | 36% | 38% |

---

## 📚 DOCUMENTI CORRELATI

| Documento | Contenuto |
|-----------|-----------|
| `docs/filosofie/FILOSOFIA_MADRE.md` | Visione complessiva del progetto |
| `docs/filosofie/FILOSOFIA_DB.md` | Architettura database |
| `docs/filosofie/FILOSOFIA_STATS_V2.md` | Sistema statistiche |
| `docs/filosofie/FILOSOFIA_LIVE_TRACKING.md` | Tracking real-time |
| `docs/filosofie/FILOSOFIA_FRONTEND_UI_UX.md` | Design frontend |
| `docs/MAPPA_RETE_CONCETTUALE.md` | Mappa riferimenti file |
| `docs/TODO_LIST.md` | Task da completare |

---

**Questo documento contiene solo concetti e definizioni.**  
**Per i task da implementare, vedere `docs/TODO_LIST.md`**

---

*Versione: 1.0*  
*Creato: Gennaio 2025*
