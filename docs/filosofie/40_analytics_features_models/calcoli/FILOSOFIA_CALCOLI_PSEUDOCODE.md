# 🧮 FILOSOFIA CALCOLI – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.
# Una feature = una funzione canonica.

--------------------------------------------------

START FILOSOFIA_CALCOLI

SET NEVER_NULL = TRUE
SET DETERMINISM = TRUE

--------------------------------------------------
# PRINCIPIO FONDAMENTALE
--------------------------------------------------

RULE NEVER_RETURN_NULL
  FOR EACH feature
    NEVER return null | undefined | NaN | 0 as "missing"
    ALWAYS calculate using fallback hierarchy
END

RULE FALLBACK_HIERARCHY
  ORDER by precision:
    1. powerRankings (game-by-game) → highest
    2. statistics (match aggregates) → good
    3. score (set/game results) → medium
    4. odds (market implied) → reasonable
    5. rankings (world ranking) → base
  
  IF level_N unavailable
    THEN use level_(N+1)
END

--------------------------------------------------
# DOMINI DEI CALCOLI
--------------------------------------------------

DOMAIN MatchState
  currentSet: int (1-5)
  currentGame: int
  currentPoint: string ("30-15")
  serverState: int (1|2)
  matchPhase: enum (early|mid|late)
  isClutchPoint: boolean
  isTiebreak: boolean
END

DOMAIN PressureClutch
  pressure: number (0-100)      // global pressure index
  hpi: number (0-100)           // Hold Pressure Index
  clutchPressure: number (0-100) // pressure in key points
END

DOMAIN BreakServe
  breakProbability: number (0-100)    // prob break current game
  breakPointConversion: number (0-100) // historical %
  breakPoints: int                     // raw count
  breakPointsSaved: int                // raw count
  breakPointsSavedPct: number (0-100)  // %
  serveDominance: number (0-100)
  returnDominance: number (0-100)
END

DOMAIN VolatilityMomentum
  volatility: number (0-1)
  momentum: number (-100 to +100)
  elasticity: number (0-100)
END

--------------------------------------------------
# SCHEDA FEATURE STANDARD
--------------------------------------------------

TEMPLATE FeatureCard
  Nome: string
  Livello: enum (Player | Match | Combined)
  Tipo: enum (Static | Dynamic)
  Input_richiesti: string[]
  Output: type + range
  Formula: description
  Fallback_chain: ordered list
  Usata_da: string[] (strategies)
  Persistenza: boolean
  dataSource: enum (live | statistics | estimated)
END

--------------------------------------------------
# FEATURE DEFINITIONS
--------------------------------------------------

FEATURE pressure
  Livello: Match
  Tipo: Dynamic
  Input: statistics.breakPointsSaved, score, gameScore
  Output: number (0-100)
  
  FORMULA:
    IF statistics.available
      RETURN calculatePressure(statistics)
    ELIF score.available
      RETURN calculatePressureFromScore(score)
    ELIF odds.available
      RETURN 50 + (odds_margin * 10)
    ELSE
      RETURN 50 (neutral)
  
  Usata_da: BancaServizio, SuperBreak, Predictor
  Persistenza: NO
END

FEATURE hpi
  Livello: Player
  Tipo: Dynamic/Static
  Input: point_by_point, breakPointsSaved, gamesServed
  Output: number (0-100)
  
  FORMULA:
    held_under_pressure = games held when deuce|30-30|BP|0-30|15-30
    total_pressure_games = total service games under pressure
    RETURN (held_under_pressure / total_pressure_games) * 100
  
  Fallback: 65 (ATP average)
  Usata_da: LayWinner, BancaServizio
  Persistenza: YES (historical), NO (live)
END

FEATURE breakProbability
  Livello: Match
  Tipo: Dynamic
  Input: statistics.firstServe%, server, gameScore, clutchPoint
  Output: number (0-100)
  
  FORMULA:
    baseProb = 100 - server.firstServePercent
    IF server_ahead: baseProb -= 5
    IF server_behind: baseProb += 5
    IF clutchPoint: baseProb += 10
    IF tiebreak: RETURN 35 (fixed, more balanced)
    RETURN clamp(baseProb, 5, 95)
  
  Fallback: 25 (ATP average break rate)
  Usata_da: BancaServizio, SuperBreak
  Persistenza: NO
END

FEATURE volatility
  Livello: Match
  Tipo: Dynamic
  Input: powerRankings[], score.sets[]
  Output: number (0-1)
  
  FORMULA:
    IF powerRankings.available
      stddev = calculateStdDev(powerRankings.map(g => g.delta))
      RETURN normalize(stddev, 0, 1)
    ELIF score.available
      variance = analyzeSetScores(score.sets)
      RETURN variance / maxVariance
    ELSE
      RETURN 0.5 (neutral)
  
  Usata_da: all strategies
  Persistenza: NO
END

--------------------------------------------------
# NAMING CONVENTION: BREAK
--------------------------------------------------

RULE BREAK_NAMING
  breakProbability = prob current game (0-100)
  breakPoints = raw count (int)
  breakPointConversion = historical % (0-100)
  breakPointsSaved = raw count (int)
  breakPointsSavedPct = % saved (0-100)
  
  NEVER confuse counts with percentages
  ALWAYS suffix with Pct for percentages
END

--------------------------------------------------
# DETERMINISMO
--------------------------------------------------

RULE DETERMINISTIC_CALCULATION
  FOR EACH feature
    GIVEN same_inputs AND same_as_of_time
    THEN output MUST be identical
  
  NO random
  NO side effects
  NO external state dependency
END

--------------------------------------------------
# OUTPUT RANGES
--------------------------------------------------

RULE OUTPUT_VALIDATION
  FOR EACH feature
    ASSERT output IN declared_range
    IF output OUT_OF_RANGE
      THEN clamp OR fallback
  
  percentages: 0-100
  probabilities: 0-1 OR 0-100 (documented)
  indices: declared bounds
END

--------------------------------------------------
# REGOLA FINALE
--------------------------------------------------

RULE NO_NULL_EVER
  IF feature_returns null | undefined
    THEN code IS WRONG
  
  ALWAYS exists valid fallback
  DOCUMENT fallback chain in FeatureCard
END

--------------------------------------------------

END FILOSOFIA_CALCOLI

--------------------------------------------------
# REFERENCES (INTER-DOCUMENT)
--------------------------------------------------

REFERENCES
  PARENT: FILOSOFIA_MADRE_TENNIS
  DEPENDS_ON:
    - FILOSOFIA_DB (match_bundle_snapshot)
    - FILOSOFIA_TEMPORAL (as_of_time for reproducibility)
    - FILOSOFIA_PBP_EXTRACTION (point-by-point data)
    - FILOSOFIA_ODDS (implied probabilities)
    - FILOSOFIA_LINEAGE_VERSIONING (calculation versions)
  OUTPUTS_TO:
    - FILOSOFIA_STATS (raw calculations → features)
    - FILOSOFIA_RISK_BANKROLL (edge calculation)
    - FILOSOFIA_FRONTEND_DATA_CONSUMPTION (calculated values)
END

ASSERT NEVER_NULL
ASSERT FALLBACK_EXISTS
ASSERT DETERMINISTIC
ASSERT RANGE_VALIDATED
