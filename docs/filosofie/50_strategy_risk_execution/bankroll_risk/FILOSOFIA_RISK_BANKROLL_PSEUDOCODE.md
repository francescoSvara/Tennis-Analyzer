# 💰 FILOSOFIA RISK & BANKROLL MANAGEMENT – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.
# Edge corretto + staking sbagliato = bankroll bruciato.

--------------------------------------------------

START FILOSOFIA_RISK_BANKROLL

SET EDGE_REQUIRED = TRUE
SET EXPOSURE_CONTROLLED = TRUE
SET AUDIT_EVERYTHING = TRUE

--------------------------------------------------
# ARCHITETTURA DECISIONALE
--------------------------------------------------

FLOW DecisionLayer
  Features
    → StrategyEngine (READY | WATCH | OFF)
    → RiskEngine ← BankrollState
    → BetDecision
END

STRUCT BetDecision
  match_id: string
  strategy: string
  action: string           // "BACK home" | "LAY away"
  edge: decimal            // 0.05 = 5%
  price: decimal           // market price
  price_min: decimal       // minimum acceptable
  stake_suggested: number  // Kelly fractional
  confidence: decimal      // 0-1
  exposure_pct: decimal    // % of bankroll
  timestamp: ISO8601
  bundle_meta: BundleMeta  // for audit
END

--------------------------------------------------
# EDGE CALCULATION
--------------------------------------------------

FUNCTION calculateEdge(model_prob, market_odds)
  implied_prob = 1 / market_odds
  edge = model_prob - implied_prob
  
  RETURN edge
END

RULE EDGE_POSITIVE_REQUIRED
  IF edge <= 0
    THEN NO BET
  ALWAYS
END

--------------------------------------------------
# PRICE MINIMUM
--------------------------------------------------

FUNCTION calculatePriceMin(model_prob)
  RETURN 1 / model_prob
END

RULE PRICE_ABOVE_MINIMUM
  IF current_price < price_min
    THEN edge becomes negative
    THEN NO BET
END

EXAMPLE
  model_prob = 0.60
  price_min = 1 / 0.60 = 1.67
  
  IF market offers 1.85 → OK (edge positive)
  IF market offers 1.50 → NO BET (edge negative)
END

--------------------------------------------------
# STAKE SUGGESTION (KELLY)
--------------------------------------------------

FUNCTION calculateStake(edge, price, bankroll, kelly_fraction)
  IF edge <= 0
    RETURN 0
  END
  
  f = edge / (price - 1)
  stake = bankroll * f * kelly_fraction
  
  # Cap at 5% bankroll
  max_stake = bankroll * 0.05
  RETURN min(stake, max_stake)
END

RULE KELLY_FRACTIONAL
  NEVER use full Kelly (risk of ruin)
  USE 1/4 Kelly (conservative) OR 1/2 Kelly (moderate)
  DEFAULT kelly_fraction = 0.25
END

EXAMPLE
  edge = 0.06 (6%)
  price = 1.85
  bankroll = 10000
  kelly_fraction = 0.25
  
  f = 0.06 / 0.85 = 0.0706
  stake = 10000 * 0.0706 * 0.25 = 176.5
  → bet €176
END

--------------------------------------------------
# EXPOSURE CONTROL
--------------------------------------------------

CONST EXPOSURE_LIMITS
  single_match_max = 0.05  // 5% bankroll
  total_max = 0.20         // 20% bankroll
END

FUNCTION controlExposure(bets, bankroll)
  total_exposure = sum(bets.map(b => b.stake))
  exposure_pct = total_exposure / bankroll
  
  IF exposure_pct > EXPOSURE_LIMITS.total_max
    scale_factor = EXPOSURE_LIMITS.total_max / exposure_pct
    FOR EACH bet IN bets
      bet.stake = bet.stake * scale_factor
    END
  END
  
  RETURN bets
END

RULE EXPOSURE_NEVER_EXCEEDED
  IF 4 matches READY simultaneously
    THEN reduce stake for each proportionally
    SUCH THAT total_exposure <= 20%
END

--------------------------------------------------
# CORRELATION CONTROL
--------------------------------------------------

RULE CORRELATION_LIMIT
  Max 2 bets per tournament simultaneously
  
  REASON: same tournament = correlated outcomes
END

RULE SAME_STRATEGY_LIMIT
  Max 3 bets with same strategy simultaneously
  
  REASON: strategy failure = correlated losses
END

--------------------------------------------------
# AUDIT LOGGING
--------------------------------------------------

RULE LOG_EVERY_DECISION
  FOR EACH bet_decision
    LOG {
      timestamp,
      match_id,
      strategy,
      action,
      edge,
      price,
      stake,
      bundle_meta: {
        versions,
        as_of_time,
        features_snapshot
      },
      rationale: {
        model_prob,
        implied_prob,
        edge_calculation,
        kelly_inputs
      }
    }
END

RULE AUDIT_TRAIL_REQUIRED
  Every decision MUST be traceable back to:
    - Which features were used
    - What version calculated them
    - What was the market state
    - Why this stake was suggested
END

--------------------------------------------------
# OUTPUT FORMAT
--------------------------------------------------

STRUCT RiskEngineOutput
  match_id: string
  decisions: BetDecision[]
  exposure: {
    total: number
    total_pct: decimal
    by_strategy: { [strategy]: number }
    by_tournament: { [tournament]: number }
  }
  bankroll_state: {
    current: number
    at_risk: number
    available: number
  }
END

--------------------------------------------------
# FUNDAMENTAL RULES
--------------------------------------------------

RULE EDGE_POSITIVE
  NEVER bet with edge <= 0
END

RULE PRICE_ACCEPTABLE
  NEVER bet if price < price_min
END

RULE EXPOSURE_CAPPED
  NEVER exceed 20% bankroll at risk
END

RULE KELLY_FRACTIONAL_ONLY
  NEVER use full Kelly criterion
END

RULE AUDIT_COMPLETE
  Every decision MUST be fully logged
END

--------------------------------------------------
# REGOLA FINALE
--------------------------------------------------

RULE RISK_PROTECTS_CAPITAL
  Risk Engine PURPOSE is capital protection
  
  TRUTH:
    Strategy with positive edge
    + Wrong staking
    = Destroyed bankroll
  
  Risk Engine PREVENTS this outcome
END

--------------------------------------------------

END FILOSOFIA_RISK_BANKROLL

--------------------------------------------------
# REFERENCES (INTER-DOCUMENT)
--------------------------------------------------

REFERENCES
  PARENT: FILOSOFIA_MADRE_TENNIS
  DEPENDS_ON:
    - FILOSOFIA_DB (bet_decisions persistence)
    - FILOSOFIA_CALCOLI (edge calculation)
    - FILOSOFIA_STATS (strategy signals)
    - FILOSOFIA_ODDS (price validation)
    - FILOSOFIA_LINEAGE_VERSIONING (decision audit trail)
  OUTPUTS_TO:
    - FILOSOFIA_FRONTEND_DATA_CONSUMPTION (bet recommendations)
    - FILOSOFIA_FRONTEND (user confirmation UI)
    - FILOSOFIA_OBSERVABILITY_DATAQUALITY (decision quality metrics)
END

ASSERT EDGE_CALCULATED
ASSERT EXPOSURE_CONTROLLED
ASSERT KELLY_FRACTIONAL
ASSERT DECISIONS_LOGGED
ASSERT CAPITAL_PROTECTED
