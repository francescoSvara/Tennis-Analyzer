# 📖 FILOSOFIA FRONTEND (UI) – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.
# L'utente non deve pensare, deve confermare una decisione.

--------------------------------------------------

START FILOSOFIA_FRONTEND_UI

SET USER_CONFIRMS_DECISIONS = TRUE
SET NO_NUMBER_OVERLOAD = TRUE
SET SEMAPHORES_EVERYWHERE = TRUE

--------------------------------------------------
# PRINCIPIO BASE
--------------------------------------------------

RULE UI_PURPOSE
  ❌ NO dashboards full of numbers
  ✅ YES semaphores, states, context
  
  Each strategy = independent card
  Max 1 suggested action at a time
END

CONST SEMAPHORES
  READY = 🟢 green
  WATCH = 🟡 yellow
  OFF = ⚫ gray
END

--------------------------------------------------
# ARCHITETTURA INFORMATIVA
--------------------------------------------------

STRUCTURE Home
  LiveMatches     // match selection
  Watchlist       // starred matches
  Alerts          // notifications
  Settings        // bankroll, risk config
END

STRUCTURE MatchPage
  Overview        // operative dashboard
  StrategieLive   // trading hub
  Odds            // market + ladder
  PointByPoint    // event log
  Stats           // standard + advanced
  Momentum        // trend + runs
  Predictor       // probability + edge
  Journal         // bet tracking
END

--------------------------------------------------
# HOME (LOBBY)
--------------------------------------------------

RULE HOME_20_SECONDS
  User MUST choose tradable match in 20 seconds
END

COMPONENT MatchRow
  DISPLAYS:
    - match_state (set/game/serve)
    - odds_principal (2-way)
    - strategy_semaphore (count 🟢/🟡)
    - edge_estimate
    - volatility
    - button: "Open Match"
END

--------------------------------------------------
# MATCH PAGE LAYOUT
--------------------------------------------------

LAYOUT MatchPage
  Header (sticky):
    - players
    - score
    - odds
    - volatility
    - liquidity
  
  Sidebar (navigation):
    - tab links
  
  Main (tab content):
    - active tab content
  
  RightRail (always visible):
    - quick trades
    - odds
    - CTA buttons
END

RULE RIGHT_RAIL_PURPOSE
  Trader wants to execute WITHOUT changing tab
  Odds + action button ALWAYS visible
END

# API LAYER IMPLEMENTATION (UX NOTE)
RULE API_LAYER_IMPLEMENTATION
  Frontend MUST call only MatchBundle endpoint (`/api/match/:id/bundle`)
  All endpoints MUST be provided by backend routes/controllers
  Frontend MUST NOT rely on server.js internal files
END

--------------------------------------------------
# TAB SPECIFICATIONS
--------------------------------------------------

TAB Overview
  SHOWS:
    - full scoreboard
    - quick signals (🟢 strategies)
    - key features (volatility, pressure)
    - match status (serving, clutch point)
END

TAB StrategieLive
  SHOWS:
    - card per strategy
    - semaphore + suggested action
    - confidence + reason
    - one-click execution (future)
END

TAB Odds
  SHOWS:
    - main market + ladder
    - trend (movement arrows)
    - implied probability
    - staleness indicator
END

TAB PointByPoint
  SHOWS:
    - chronological event log
    - key moments highlighted
    - break points, set points
END

TAB Stats
  SHOWS:
    - aggregate statistics
    - player comparison
    - radar charts
END

TAB Momentum
  SHOWS:
    - temporal momentum graph
    - point runs
    - trends
END

TAB Predictor
  SHOWS:
    - model probability vs market
    - edge visualization
    - confidence interval
END

TAB Journal
  SHOWS:
    - bet decisions logged
    - P&L tracking
    - decision audit
END

--------------------------------------------------
# COMPONENT PATTERNS
--------------------------------------------------

COMPONENT StrategyCard
  PROPS: strategy_signal
  
  RENDER:
    <Card>
      <Header>
        <Name>{strategy.name}</Name>
        <Semaphore status={strategy.status} />
      </Header>
      <Body>
        <Action>{strategy.action}</Action>
        <Confidence>{strategy.confidence}%</Confidence>
        <Reason>{strategy.reason}</Reason>
      </Body>
      IF status == READY
        <CTA>Execute</CTA>
      END
    </Card>
END

COMPONENT FeatureBadge
  PROPS: feature_name, value, quality
  
  RENDER:
    <Badge>
      <Label>{feature_name}</Label>
      <Value>{formatValue(value)}</Value>
      IF quality < threshold
        <Warning>stale</Warning>
      END
    </Badge>
END

--------------------------------------------------
# UI RULES
--------------------------------------------------

RULE SKELETON_LOADING
  NEVER use global spinners
  USE skeleton for layout structure
  ERROR only if bundle fetch fails
END

RULE SEMAPHORES_EVERYWHERE
  Every actionable item HAS semaphore
  READY = 🟢 = can act now
  WATCH = 🟡 = monitor
  OFF = ⚫ = ignore
END

RULE ONE_CTA_PER_CARD
  Max 1 prominent CTA per card
  User knows exactly what to click
END

RULE STALENESS_VISIBLE
  IF data_age > threshold
    SHOW age indicator
    VISUAL dim or warning
END

RULE MOBILE_FIRST
  Layout IS responsive
  Essential info visible on mobile
  Secondary info collapsible
END

--------------------------------------------------
# DATA DISPLAY RULES
--------------------------------------------------

RULE NO_NULL_DISPLAY
  NEVER show "N/A" or "—"
  Backend ALWAYS provides calculated value
  Frontend JUST displays
END

RULE PRECISION_APPROPRIATE
  Percentages: 0 decimal (85%)
  Odds: 2 decimals (1.85)
  Probabilities: 1 decimal (60.5%)
  Money: 2 decimals (€123.45)
END

--------------------------------------------------
# REGOLA FINALE
--------------------------------------------------

RULE DESIGN_SERVES_DECISION
  Every UI element MUST help decision-making
  
  IF element does NOT help decide
    THEN remove it
  
  Design serves the decision
  Not the other way around
END

--------------------------------------------------

END FILOSOFIA_FRONTEND_UI

--------------------------------------------------
# REFERENCES (INTER-DOCUMENT)
--------------------------------------------------

REFERENCES
  PARENT: FILOSOFIA_MADRE_TENNIS
  DEPENDS_ON:
    - FILOSOFIA_FRONTEND_DATA_CONSUMPTION (data contract)
    - FILOSOFIA_RISK_BANKROLL (user confirmation flow)
    - FILOSOFIA_OBSERVABILITY_DATAQUALITY (quality indicators)
  OUTPUTS_TO:
    - User Interface (final display layer)
    - NO backend outputs (frontend is leaf node)
END

ASSERT USER_CONFIRMS
ASSERT SEMAPHORES_USED
ASSERT ONE_ACTION_MAX
ASSERT NO_NUMBER_OVERLOAD
ASSERT DESIGN_SERVES_DECISION
