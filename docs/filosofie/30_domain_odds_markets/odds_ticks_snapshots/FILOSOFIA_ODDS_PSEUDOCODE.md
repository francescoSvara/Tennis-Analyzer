# 💹 FILOSOFIA ODDS & MARKET DATA – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.

# Odds descrivono il mercato, non decidono il trade.

---

START FILOSOFIA_ODDS

SET ODDS_IS_MARKET_LAYER = TRUE
SET ODDS_DOES_NOT_DECIDE = TRUE

---

# PRINCIPIO FONDANTE

---

RULE ODDS_PURPOSE
ODDS DOES: - observe market - normalize prices - calculate implied probability - provide market features

ODDS DOES NOT: - decide stake - decide strategies - calculate fair odds (that's Predictor)
END

---

# SEPARAZIONE FONDAMENTALE

---

RULE MARKET_MODEL_EDGE_SEPARATION
MARKET = observed odds → Odds Domain
MODEL = internal probability → Predictor
EDGE = controlled difference → Risk/Strategy

NEVER mix these in same module
END

RULE IMPLIED_VS_WIN_PROBABILITY
Odds Domain calculates: implied_probability = 1 / decimal_odds
Predictor calculates: win_probability (model output)

THESE ARE DIFFERENT
END

---

# OGGETTI STANDARD

---

STRUCT MarketOdds
matchOdds: {
back: decimal // best back price
lay: decimal // best lay price
last: decimal // last traded
}
trend: {
delta5m: decimal // movement in last 5 min
}
liquidity: {
level: enum (high | medium | low)
spreadPct: decimal // (lay - back) / back \* 100
}
lastUpdateTs: timestamp
END

RULE MARKET_ODDS_REQUIRED
FOR EACH match
marketOdds MUST exist
NO component may invent these fields
END

---

# ODDSTICK VS ODDSSNAPSHOT

---

STRUCT OddsTick
match_id: string
market: string // "match_winner", "set_winner"
selection: string // "home", "away"
book_id: string // "bet365", "pinnacle"
price: decimal // decimal odds
event_time: timestamp // when quote was valid
ingestion_time: timestamp // when we received it
END

STRUCT OddsSnapshot
match_id: string
as_of_time: timestamp // temporal cut
markets: {
match_winner: {
home: { price, book_id }
away: { price, book_id }
}
}
metadata: {
last_update: timestamp
data_quality: number
}
END

RULE TICK_VS_SNAPSHOT_USAGE
OddsTick → temporal analysis, trend, closing line
OddsSnapshot → feature calculation in bundle
END

---

# LIVE ODDS POLICY

---

RULE LIVE_ODDS_FRESHNESS
LIVE odds MUST have: - precise timestamp - freshness indicator - reliability score

IF staleness > threshold
THEN dataQuality.odds decreases
THEN strategy confidence decreases
END

CONST STALENESS_THRESHOLDS
live_match: 10 seconds
prematch: 60 seconds
historical: N/A
END

---

# INTEGRAZIONE MATCHBUNDLE

---

RULE BUNDLE_ODDS_PLACEMENT
header.market → raw market data
tabs.odds → UI presentation
tabs.predictor → model vs market comparison
END

---

# FEATURE OUTPUT

---

FUNCTION calculateOddsFeatures(odds)
RETURN {
implied_home: 1 / odds.back.home,
implied_away: 1 / odds.back.away,
overround: (1/back.home + 1/back.away) - 1,
spread: (lay - back) / back,
trend_direction: sign(delta5m),
liquidity_score: mapLiquidityToScore(liquidity)
}
END

---

# COSA NON È DOMINIO ODDS

---

RULE NOT_ODDS_DOMAIN
IF logic_suggests_trade → NOT odds domain
IF logic_calculates_stake → NOT odds domain
IF logic_decides_READY_WATCH → NOT odds domain
IF logic_calculates_fair_odds → NOT odds domain (it's Predictor)
END

---

# REGOLA FINALE

---

RULE ODDS_BOUNDARY
Odds Domain IS:
Market Data Provider
Feature Calculator
Freshness Monitor

Odds Domain IS NOT:
Decision Maker
Stake Calculator
Strategy Engine
END

---

RULE API_LAYER_IMPLEMENTATION
WHEN defining API endpoints

- CREATE routes: backend/routes/\*.routes.js → define URL + middleware
- CREATE controllers: backend/controllers/\*.controller.js → handle req → service → res
- IMPLEMENT services in backend/services/\* (business logic, composition)
- server.js MUST only bootstrap, mount routes and sockets (NO domain logic)
- Controllers MUST be thin; move calculations to utils/services and DB to repositories
  END

END FILOSOFIA_ODDS

---

# REFERENCES (INTER-DOCUMENT)

---

REFERENCES
PARENT: FILOSOFIA_MADRE_TENNIS
DEPENDS_ON: - FILOSOFIA_DB (odds_tick, odds_snapshot tables) - FILOSOFIA_TEMPORAL (tick timestamps, as_of_time) - FILOSOFIA_REGISTRY_CANON (market identifiers)
OUTPUTS_TO: - FILOSOFIA_CALCOLI (implied probabilities, overround) - FILOSOFIA_STATS (odds features) - FILOSOFIA_LIVE_TRACKING (live odds integration) - FILOSOFIA_RISK_BANKROLL (price validation) - FILOSOFIA_FRONTEND_DATA_CONSUMPTION (market display)
END

ASSERT MARKET_OBSERVED_NOT_DECIDED
ASSERT IMPLIED_PROBABILITY_ONLY
ASSERT STALENESS_MONITORED
ASSERT SEPARATION_ENFORCED
