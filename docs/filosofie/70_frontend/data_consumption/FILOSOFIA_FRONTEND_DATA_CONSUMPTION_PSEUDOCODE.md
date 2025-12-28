# 🔌 FILOSOFIA FRONTEND DATA CONSUMPTION – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.
# Frontend non interpreta, visualizza stato già interpretato.

--------------------------------------------------

START FILOSOFIA_FRONTEND_DATA_CONSUMPTION

SET FRONTEND_IS_DISPLAY_LAYER = TRUE
SET FRONTEND_NEVER_CALCULATES = TRUE
SET SINGLE_PAYLOAD = TRUE

--------------------------------------------------
# PRINCIPIO FONDANTE
--------------------------------------------------

RULE FRONTEND_STATELESS
  Frontend:
    - receives ONE payload (MatchBundle)
    - does NOT know DB, pipeline, sources
    - does NOT recalculate metrics
    - does NOT deduce domain logic
  
  Frontend IS stateless at logic level
END

--------------------------------------------------
# THE GOLDEN RULE
--------------------------------------------------

RULE NEVER_FALLBACK_IN_FRONTEND
  ❌ WRONG: features.volatility || 'N/A'
  ❌ WRONG: features.volatility ?? 50
  
  ✅ CORRECT: Backend ALWAYS calculates using fallback hierarchy
  
  IF match exists
    THEN data exists
    THEN value IS calculated
    THEN frontend JUST displays
END

--------------------------------------------------
# PAYLOAD UNICO: MATCHBUNDLE
--------------------------------------------------

ENDPOINT /api/match/:matchId/bundle
  RETURNS MatchBundle
  CONTAINS everything for Match Page
  NO other endpoint needed
END

RULE API_LAYER_IMPLEMENTATION
 WHEN implementing this endpoint
  - Route: backend/routes/match.routes.js → GET /:eventId/bundle
  - Controller: backend/controllers/match.controller.js → getBundle()
  - Service: backend/services/bundleService.js → buildBundle()
  - Features: backend/utils/featureEngine.js → computeFeatures()
  - Strategies: backend/strategies/strategyEngine.js → evaluateAll()
  - server.js only bootstraps and mounts routes (NO domain logic)
 END

# Related Routes Reference (2025-12-28)
ROUTES:
  GET /api/match/:eventId/bundle    → matchController.getBundle (MAIN)
  GET /api/matches/db               → matchController.getFromDb
  GET /api/matches/suggested        → matchController.getSuggested
  GET /api/player/:name/stats       → playerController.getStats
  GET /api/stats/db                 → statsController.getDbStats
END

STRUCT MatchBundle
  header: {
    match_id, players, tournament, score, status, odds
  }
  tabs: {
    overview: OverviewData
    strategies: StrategySignal[]
    odds: OddsData
    pointByPoint: PbpEvent[]
    stats: StatsData
    momentum: MomentumData
    predictor: PredictorData
    journal: JournalData
  }
  dataQuality: DataQualityMetrics
  meta: BundleMeta
END

--------------------------------------------------
# MODELLO MENTALE FRONTEND
--------------------------------------------------

RULE TAB_ISOLATION
  FOR EACH tab IN bundle.tabs
    tab READS only its section
    tab DOES NOT depend on other tabs
    tab DOES NOT recalculate anything
END

EXAMPLE OverviewTab
  READS: bundle.tabs.overview
  DISPLAYS: score, features, quick signals
  NEVER: calculates volatility from raw data
END

--------------------------------------------------
# CARICAMENTO INIZIALE
--------------------------------------------------

FLOW InitialLoad
  1. FETCH /api/match/:id/bundle
  2. WHILE loading
       SHOW skeleton (structural, not per-data)
  3. WHEN bundle ready
       RENDER complete
  4. IF fetch fails
       SHOW error (only then)
END

RULE NO_GLOBAL_SPINNERS
  NO full-page spinners
  YES skeleton for layout structure
  ERROR only if bundle fetch fails
END

--------------------------------------------------
# LIVE UPDATE (WEBSOCKET)
--------------------------------------------------

RULE INCREMENTAL_PATCHES
  Frontend DOES NOT refetch full bundle
  Frontend RECEIVES patches:
    - score changes
    - odds updates
    - point-by-point append
    - strategy signals update
END

STRUCT BundlePatch
  path: string      // e.g., "/header/score"
  op: enum (replace | add | remove)
  value: any
END

RULE PATCH_APPLICATION
  FOR EACH patch
    UPDATE only affected component
    DO NOT block UI
    INDICATE data is live (visual cue)
END

--------------------------------------------------
# DATA QUALITY (SOLO VISIVA)
--------------------------------------------------

RULE DQ_DISPLAY_ONLY
  Frontend:
    - READS bundle.dataQuality
    - SHOWS badge / warning / tooltip
    - NEVER applies fallback logic
  
  IF dataQuality.completeness.odds < 0.80
    THEN SHOW warning "dati odds incompleti"
    NEVER invent numbers
END

--------------------------------------------------
# HOOK STANDARD
--------------------------------------------------

HOOK useMatchBundle(matchId)
  STATE bundle = null
  STATE loading = true
  STATE error = null
  
  ON_MOUNT:
    bundle = FETCH /api/match/${matchId}/bundle
    SUBSCRIBE to WS /ws/match/${matchId}
  
  ON_PATCH(patch):
    bundle = applyPatch(bundle, patch)
  
  RETURN { bundle, loading, error }
END

RULE SINGLE_SOURCE_OF_TRUTH
  useMatchBundle IS the only data source
  Components NEVER fetch directly
  Components NEVER have local state for domain data
END

--------------------------------------------------
# COMPONENT PATTERN
--------------------------------------------------

PATTERN TabComponent
  PROPS: { bundle }
  
  FUNCTION render()
    data = bundle.tabs[thisTab]
    
    IF !data
      RETURN <Loading />
    
    RETURN <Display data={data} />
  END
  
  NEVER calculate
  NEVER fetch
  NEVER fallback
END

--------------------------------------------------
# REGOLA FINALE
--------------------------------------------------

RULE FRONTEND_IS_DISPLAY
  Frontend IS a display layer
  
  NEVER calculate
  NEVER deduce
  NEVER invent
  
  IF data not in bundle
    THEN ask backend to add it
    NEVER create frontend workaround
END

--------------------------------------------------

END FILOSOFIA_FRONTEND_DATA_CONSUMPTION

--------------------------------------------------
# REFERENCES (INTER-DOCUMENT)
--------------------------------------------------

REFERENCES
  PARENT: FILOSOFIA_MADRE_TENNIS
  DEPENDS_ON:
    - FILOSOFIA_DB (match_bundle_snapshot API)
    - FILOSOFIA_LIVE_TRACKING (WebSocket patches)
    - FILOSOFIA_STATS (pre-calculated features)
    - FILOSOFIA_CALCOLI (no frontend calc)
    - FILOSOFIA_ODDS (market data display)
    - FILOSOFIA_RISK_BANKROLL (bet recommendations)
  OUTPUTS_TO:
    - FILOSOFIA_FRONTEND (UI rendering)
END

ASSERT SINGLE_PAYLOAD
ASSERT NO_FRONTEND_CALCULATION
ASSERT PATCHES_FOR_LIVE
ASSERT DQ_DISPLAY_ONLY
ASSERT DISPLAY_LAYER_ONLY
