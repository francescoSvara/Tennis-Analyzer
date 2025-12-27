# 📊 FILOSOFIA STATS & STRATEGY ENGINE – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.
# Sistema esiste per produrre segnali affidabili.

--------------------------------------------------

START FILOSOFIA_STATS

SET SIGNALS_ARE_THE_GOAL = TRUE
SET FEATURES_ARE_MEANS = TRUE

--------------------------------------------------
# ARCHITETTURA AD ALBERO
--------------------------------------------------

FLOW DataToSignals
  RawData (matches, stats, pbp, odds)
    → FeatureEngine (volatility, pressure, dominance)
    → StrategyEngine (LayWinner, BancaServizio, SuperBreak)
    → Signals (READY | WATCH | OFF + action)
END

RULE BACKEND_ONLY
  ALL computation happens in backend
  Frontend consumes result only
END

--------------------------------------------------
# CLASSI DI DATI
--------------------------------------------------

CLASS RawData
  PROPERTIES:
    - canonical DB data
    - no interpretation
    - persisted
  EXAMPLES:
    - match_statistics_new
    - match_point_by_point_new
    - match_odds
END

CLASS Features
  PROPERTIES:
    - pure functions
    - deterministic
    - contextual (player | match | combined)
  EXAMPLES:
    - volatility
    - pressure
    - breakProbability
  PERSISTENCE: only if historically useful
END

CLASS Signals
  PROPERTIES:
    - discrete
    - action-oriented
    - temporary
  VALUES: READY | WATCH | OFF
  ACTIONS: BACK | LAY | NONE
  
  NOT metrics
  NOT persistible as historical truth
END

--------------------------------------------------
# LIVELLI DI ANALISI
--------------------------------------------------

LEVEL Player
  DESCRIPTION: historical context of player
  USAGE: prior in Bayesian sense
  EXAMPLES:
    - win_rate_surface
    - comeback_rate
    - historical_ROI
END

LEVEL Match
  DESCRIPTION: current match state
  USAGE: likelihood in Bayesian sense
  EXAMPLES:
    - pressure
    - momentum
    - volatility
    - dominance
END

LEVEL Combined
  DESCRIPTION: player + match intersection
  USAGE: where strategies are born
  EXAMPLE:
    "Resilient player + high pressure on opponent → LayWinner READY"
END

--------------------------------------------------
# FEATURE ENGINE
--------------------------------------------------

RULE FEATURE_DECLARATION
  FOR EACH feature
    MUST declare:
      - name
      - level (Player | Match | Combined)
      - type (Static | Dynamic)
      - inputs required
      - output type + range
      - fallback chain
      - used_by (strategies/predictor)
      - persistence (yes/no)
END

FUNCTION FeatureEngine.compute(rawData, options)
  as_of_time = options.as_of_time
  
  features = {
    volatility: calculateVolatility(rawData.powerRankings),
    pressure: calculatePressure(rawData.statistics, rawData.score),
    dominance: calculateDominance(rawData),
    momentum: calculateMomentum(rawData),
    context: buildContext(rawData)
  }
  
  RETURN {
    match_id: rawData.match.match_id,
    as_of_time: as_of_time,
    features: features,
    feature_version: FEATURE_VERSION
  }
END

--------------------------------------------------
# STRATEGY ENGINE
--------------------------------------------------

STRUCT StrategySignal
  name: string           // "LayWinner"
  status: enum (READY | WATCH | OFF)
  action: string         // "LAY home"
  reason: string         // why this status
  confidence: number     // 0-100
  conditions_met: string[]
END

FUNCTION StrategyEngine.evaluate(features)
  signals = []
  
  FOR EACH strategy IN registered_strategies
    signal = strategy.evaluate(features)
    signals.push(signal)
  END
  
  RETURN signals
END

EXAMPLE LayWinner
  EVALUATE(features):
    IF features.dominance.home > 70
      AND features.pressure.away > 60
      AND features.odds.implied_home > 0.7
      THEN status = READY, action = "LAY away"
    ELIF features.dominance.home > 50
      THEN status = WATCH, reason = "monitoring"
    ELSE
      status = OFF
END

--------------------------------------------------
# SIGNALS NON PERSISTIBILI
--------------------------------------------------

RULE SIGNALS_NOT_PERSISTABLE
  Signals (READY/WATCH/OFF) are NOT historical metrics
  
  ✅ OK: persist bundle_snapshot for audit
  ❌ NO: create strategy_signals_history table
  
  REASON: signals are point-in-time decisions, not statistics
END

RULE SNAPSHOT_VS_HISTORY
  snapshot = audit trail (what did we know at time T)
  history = statistical series (how did metric evolve)
  
  signals belong in snapshot, NOT in history
END

--------------------------------------------------
# DETERMINISMO
--------------------------------------------------

RULE DETERMINISTIC_FEATURES
  FOR EACH feature
    GIVEN same_inputs AND same_as_of_time
    THEN output MUST be identical
  
  NO random
  NO side effects
  NO timestamp-dependent logic (use as_of_time)
END

--------------------------------------------------
# OUTPUT FORMATO
--------------------------------------------------

STRUCT StrategyOutput
  match_id: string
  as_of_time: timestamp
  strategy_version: string
  signals: StrategySignal[]
END

EXAMPLE
  {
    "match_id": "abc123",
    "as_of_time": "2025-12-25T14:55:00Z",
    "strategy_version": "v2.0.0",
    "signals": [
      { "name": "LayWinner", "status": "READY", "action": "LAY home", "confidence": 85 },
      { "name": "BancaServizio", "status": "WATCH", "reason": "pressure rising" }
    ]
  }
END

--------------------------------------------------
# REGOLA FINALE
--------------------------------------------------

RULE FEATURES_PROPERTIES
  Features MUST be:
    - Deterministic (same input → same output)
    - Contextual (know what they represent)
    - Documented (feature card required)
END

RULE SIGNALS_PROPERTIES
  Signals MUST be:
    - Actionable (READY = can act)
    - Temporary (valid for this moment)
    - Not persistable as history
END

--------------------------------------------------

END FILOSOFIA_STATS

--------------------------------------------------
# REFERENCES (INTER-DOCUMENT)
--------------------------------------------------

REFERENCES
  PARENT: FILOSOFIA_MADRE_TENNIS
  DEPENDS_ON:
    - FILOSOFIA_DB (feature persistence, snapshot)
    - FILOSOFIA_CALCOLI (calculated values)
    - FILOSOFIA_PBP_EXTRACTION (point data)
    - FILOSOFIA_ODDS (market features)
    - FILOSOFIA_TEMPORAL (feature freshness)
  OUTPUTS_TO:
    - FILOSOFIA_RISK_BANKROLL (features → strategy signals)
    - FILOSOFIA_FRONTEND_DATA_CONSUMPTION (feature display)
    - FILOSOFIA_LIVE_TRACKING (live feature updates)
END

ASSERT SIGNALS_ARE_GOAL
ASSERT FEATURES_ARE_DETERMINISTIC
ASSERT SIGNALS_NOT_HISTORY
ASSERT BACKEND_COMPUTES_ALL
