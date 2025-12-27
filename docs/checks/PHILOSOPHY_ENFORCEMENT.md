# 🔬 Philosophy Enforcement Report V2

> Generated: 2025-12-27T06:45:51.577Z
> Total Rules: 69

## 📊 Summary

| Status | Count | % |
|--------|-------|---|
| ✅ Passed | 59 | 86% |
| ❌ Errors | 3 | 4% |
| ⚠️ Warnings | 4 | 6% |
| ℹ️ Info | 3 | 4% |

---

## ❌ Errors (3) - MUST FIX

| ID | Source | Rule | Detail |
|----|--------|------|--------|
| DB-001 | FILOSOFIA_DB | DATAQUALITY_REQUIRED | dataQuality is flat variable, should be {completeness, freshness, source} |
| DB-002 | FILOSOFIA_DB | TABLE_REQUIREMENTS | Missing columns: source, version |
| DB-005 | FILOSOFIA_DB | DATAQUALITY_BACKEND_ONLY | Frontend calculates dataQuality: src\components\match\MatchPage.jsx |

## ⚠️ Warnings (4) - Should Fix

| ID | Source | Rule | Detail |
|----|--------|------|--------|
| DB-004 | FILOSOFIA_DB | ALLOWED_SOURCES | Unauthorized writes: backend\liveManager.js, backend\scripts\enrich-matches.js, backend\scripts\extract-power-rankings.js, backend\scripts\insert-pbp-correct.js, backend\scripts\populate-player-aliases.js, backend\server.js, backend\services\calculationQueueWorker.js, backend\services\matchCardService.js, backend\services\playerService.js, backend\services\rawEventsProcessor.js, backend\services\unifiedImporter.js |
| TEMP-001 | FILOSOFIA_TEMPORAL | EVENT_TIME_REQUIRED | Missing event_time: match_statistics_new, match_odds, match_power_rankings_new |
| PBP-004 | FILOSOFIA_PBP | VALIDATE_SCORE_PROGRESSION | No score validation |
| FE-003 | FILOSOFIA_FRONTEND_DATA | SINGLE_PAYLOAD | Multiple fetches: src\components\home\HomePage.jsx, src\components\MatchGrid.jsx, src\components\MonitoringDashboard.jsx, src\components\PlayerPage.jsx |

## ℹ️ Info (3) - Nice to Have

| ID | Source | Rule | Detail |
|----|--------|------|--------|
| PBP-003 | FILOSOFIA_PBP | POINT_WINNER_FROM_CSS | No CSS winner detection |
| LIVE-004 | FILOSOFIA_LIVE | ADAPTIVE_POLLING | Fixed interval may be used |
| UI-004 | FILOSOFIA_FRONTEND | NO_NULL_DISPLAY | Found N/A in: src\components\match\tabs\OverviewTab.jsx, src\components\match\tabs\PredictorTab.jsx, src\components\MatchCard.jsx, src\components\MonitoringDashboard.jsx |

## ✅ Passed (59)

### FILOSOFIA_DB (3)
- ✅ DB-003: SINGLE_ENDPOINT
- ✅ DB-006: BUNDLE_BUILD_FLOW
- ✅ DB-007: CANONICAL_SCHEMA

### FILOSOFIA_TEMPORAL (4)
- ✅ TEMP-002: AS_OF_TIME_REPRODUCIBILITY
- ✅ TEMP-003: INGESTION_TIME_TRACKING
- ✅ TEMP-004: STALENESS_TRACKING
- ✅ TEMP-005: NO_FUTURE_DATA

### FILOSOFIA_REGISTRY (4)
- ✅ REG-001: PLAYER_ALIASES_TABLE
- ✅ REG-002: NORMALIZE_NAME_FUNCTION
- ✅ REG-003: RESOLVE_PLAYER_ID
- ✅ REG-004: CANONICAL_IDS_IN_BUNDLE

### FILOSOFIA_LINEAGE (4)
- ✅ LIN-001: FEATURE_ENGINE_VERSION
- ✅ LIN-002: STRATEGY_ENGINE_VERSION
- ✅ LIN-003: BUNDLE_META_VERSIONS
- ✅ LIN-004: SNAPSHOT_HAS_VERSIONS

### FILOSOFIA_OBSERVABILITY (5)
- ✅ OBS-001: DATAQUALITY_CHECKER_EXISTS
- ✅ OBS-002: EVALUATE_BUNDLE_QUALITY
- ✅ OBS-003: QUALITY_METRICS
- ✅ OBS-004: QUALITY_IN_BUNDLE
- ✅ OBS-005: LOGGER_EXISTS

### FILOSOFIA_PBP (3)
- ✅ PBP-001: PBP_EXTRACTOR_EXISTS
- ✅ PBP-002: ROW1_IS_HOME_INVARIANT
- ✅ PBP-005: EXTRACT_PBP_FUNCTION

### FILOSOFIA_LIVE (4)
- ✅ LIVE-001: LIVE_MANAGER_EXISTS
- ✅ LIVE-002: POLLING_OR_WEBSOCKET
- ✅ LIVE-003: LIVE_TRACKING_REPOSITORY
- ✅ LIVE-005: END_MATCH_CONSOLIDATION

### FILOSOFIA_ODDS (4)
- ✅ ODDS-001: ODDS_HAVE_TIMESTAMP
- ✅ ODDS-002: IMPLIED_PROBABILITY
- ✅ ODDS-003: ODDS_OBSERVED_NOT_DECIDED
- ✅ ODDS-004: ODDS_STALENESS

### FILOSOFIA_CALCOLI (4)
- ✅ CALC-001: NO_NULL_EVER
- ✅ CALC-002: FALLBACK_HIERARCHY
- ✅ CALC-003: DETERMINISTIC
- ✅ CALC-004: OUTPUT_VALIDATION

### FILOSOFIA_STATS (5)
- ✅ STATS-001: FEATURE_ENGINE_EXISTS
- ✅ STATS-002: COMPUTE_FEATURES_FUNCTION
- ✅ STATS-003: STRATEGY_ENGINE_EXISTS
- ✅ STATS-004: EVALUATE_ALL_FUNCTION
- ✅ STATS-005: SIGNALS_EPHEMERAL

### FILOSOFIA_RISK (7)
- ✅ RISK-001: RISK_ENGINE_EXISTS
- ✅ RISK-002: EDGE_CALCULATION
- ✅ RISK-003: EDGE_POSITIVE_CHECK
- ✅ RISK-004: KELLY_FRACTIONAL
- ✅ RISK-005: EXPOSURE_LIMIT
- ✅ RISK-006: BET_DECISIONS_TABLE
- ✅ RISK-007: PRICE_ACCEPTABLE_CHECK

### FILOSOFIA_FRONTEND_DATA (4)
- ✅ FE-001: NO_FRONTEND_CALCULATION
- ✅ FE-002: USE_MATCH_BUNDLE_HOOK
- ✅ FE-004: DATAQUALITY_DISPLAY_ONLY
- ✅ FE-005: ERROR_HANDLING

### FILOSOFIA_FRONTEND (3)
- ✅ UI-001: SEMAPHORES_USED
- ✅ UI-002: USER_CONFIRMS_ACTION
- ✅ UI-003: SKELETON_LOADING

### FILOSOFIA_META (5)
- ✅ META-001: NO_ENGINE_IMPORT_IN_FE
- ✅ META-002: BACKEND_INTERPRETATION
- ✅ META-003: RULES_FILE_EXISTS
- ✅ META-004: ENFORCER_SCRIPT_EXISTS
- ✅ META-005: MAPPA_CONCETTUALE_EXISTS

