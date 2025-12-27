# ⚡ FILOSOFIA LIVE TRACKING – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.
# Live = runtime engine, non sorgente dati.

--------------------------------------------------

START FILOSOFIA_LIVE_TRACKING

SET LIVE_IS_RUNTIME_ENGINE = TRUE
SET STATE_IS_MATCHBUNDLE = TRUE

--------------------------------------------------
# PRINCIPIO FONDANTE
--------------------------------------------------

RULE LIVE_PURPOSE
  LIVE DOES:
    - observe realtime events
    - update runtime features
    - regenerate strategy signals
    - send incremental patches
  
  LIVE DOES NOT:
    - expose raw data to frontend
    - decide strategies autonomously
    - produce new persistent data
END

--------------------------------------------------
# OUTPUT UFFICIALE
--------------------------------------------------

RULE LIVE_OUTPUT
  LIVE produces ONLY patches on MatchBundle:
    - patch on header (score, status)
    - patch on tabs.* (features, strategies)
    - patch on dataQuality
  
  FORMAT: JSON Patch OR BundleDelta (structured diff)
END

STRUCT BundlePatch
  match_id: string
  timestamp: ISO8601
  patches: [
    { op: "replace", path: "/header/score", value: {...} },
    { op: "replace", path: "/tabs/strategies/0/status", value: "READY" }
  ]
END

--------------------------------------------------
# PIPELINE LIVE
--------------------------------------------------

FLOW LivePipeline
  LiveEvents (API / polling)
    → LiveNormalizer
    → FeatureEngine (runtime)
    → StrategyEngine
    → BundlePatch
    → WebSocket / CacheRefresh
END

RULE PIPELINE_ORDER
  EACH step must complete before next
  NO parallel branch produces different truth
  SINGLE bundle = single truth
END

--------------------------------------------------
# POLLING ADATTIVO
--------------------------------------------------

RULE ADAPTIVE_POLLING
  POLICY polling_interval based on context:
  
  IF score_changed
    THEN polling = FAST (2-5s)
  
  IF no_change FOR N iterations
    THEN backoff (increase interval)
  
  IF any_strategy == READY
    THEN polling = BOOST (1-2s)
  
  IF match_idle
    THEN polling = SLOW (30-60s)
END

CONST POLLING_INTERVALS
  FAST = 2000ms
  NORMAL = 10000ms
  BOOST = 1000ms
  SLOW = 30000ms
END

--------------------------------------------------
# DATA QUALITY LIVE
--------------------------------------------------

RULE LIVE_DATA_QUALITY
  LIVE updates these metrics:
    - freshness: how recent is data
    - staleness: is data expired
    - completeness: is something missing
  
  FE shows indicators, does NOT interpret
END

FUNCTION updateLiveDataQuality(bundle, event)
  age_sec = now() - event.ingestion_time
  
  IF age_sec > STALENESS_THRESHOLD
    THEN bundle.dataQuality.staleness = TRUE
    ALERT "live data stale"
  END
  
  bundle.meta.data_freshness.last_live_ingestion_time = event.ingestion_time
END

--------------------------------------------------
# CONSOLIDAMENTO
--------------------------------------------------

RULE END_OF_MATCH_CONSOLIDATION
  WHEN match.status == "finished"
    regenerate full match_bundle_snapshot
    persist to match_card_snapshot table
    NO partial snapshots
    bundle IS the single truth
END

--------------------------------------------------
# WEBSOCKET PROTOCOL
--------------------------------------------------

RULE WS_CONTRACT
  ENDPOINT /ws/match/:id
  
  CLIENT connects → receives current bundle
  SERVER pushes patches on changes
  
  MESSAGE format:
    { type: "patch", payload: BundlePatch }
    { type: "full", payload: MatchBundle }
END

--------------------------------------------------
# WHAT WAS REMOVED
--------------------------------------------------

RULE DEPRECATED_PATTERNS
  ❌ push raw events to frontend
  ❌ multiple snapshots
  ❌ frontend fallback logic
  ❌ non-contextual polling
END

--------------------------------------------------
# REGOLA FINALE
--------------------------------------------------

RULE LIVE_UPDATE_JUSTIFICATION
  FOR EACH live_update
    IF NOT modifies_bundle
      AND NOT improves_decision_latency
      THEN update IS unnecessary
END

--------------------------------------------------

END FILOSOFIA_LIVE_TRACKING

--------------------------------------------------
# REFERENCES (INTER-DOCUMENT)
--------------------------------------------------

REFERENCES
  PARENT: FILOSOFIA_MADRE_TENNIS
  DEPENDS_ON:
    - FILOSOFIA_DB (match_bundle_snapshot persistence)
    - FILOSOFIA_TEMPORAL (ingestion_time, as_of_time)
    - FILOSOFIA_PBP_EXTRACTION (live point data)
    - FILOSOFIA_ODDS (live odds integration)
  OUTPUTS_TO:
    - FILOSOFIA_STATS (live feature updates)
    - FILOSOFIA_CALCOLI (real-time calculations)
    - FILOSOFIA_FRONTEND_DATA_CONSUMPTION (WebSocket patches)
    - FILOSOFIA_RISK_BANKROLL (live exposure updates)
END

ASSERT LIVE_IS_RUNTIME
ASSERT BUNDLE_IS_SINGLE_TRUTH
ASSERT POLLING_IS_ADAPTIVE
ASSERT CONSOLIDATION_AT_END
