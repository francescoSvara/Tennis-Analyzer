# 🔍 FILOSOFIA OBSERVABILITY & DATA QUALITY – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.
# Data quality = fondamenta di tutto.

--------------------------------------------------

START FILOSOFIA_OBSERVABILITY_DATAQUALITY

SET DATA_QUALITY_REQUIRED = TRUE
SET GARBAGE_IN_GARBAGE_OUT = TRUE

--------------------------------------------------
# DIMENSIONI DATA QUALITY
--------------------------------------------------

DIMENSION Completeness
  MEASURE % required_fields present
  THRESHOLD
    >= 95% → OK
    80-95% → WARNING
    < 80% → ERROR (quarantine)
END

DIMENSION Timeliness
  MEASURE age of data vs now() or as_of_time
  THRESHOLDS
    live_score: max 30s
    odds_live: max 10s
    odds_prematch: max 60s
    player_stats: max 24h
END

DIMENSION Accuracy
  DETECT outliers outside plausible range
  RULES
    odds < 1.01 OR odds > 1000 → SUSPECT
    volatility NOT IN [0, 1] → INVALID
    pressure NOT IN [0, 100] → INVALID
    score < 0 → INVALID
END

DIMENSION Consistency
  CHECK cross-field coherence
  RULES
    IF status == "finished" AND score IS NULL → INCONSISTENT
    IF best_of == 3 AND sets.count > 3 → INCONSISTENT
    IF home_player_id == away_player_id → INCONSISTENT
END

--------------------------------------------------
# OVERALL QUALITY SCORE
--------------------------------------------------

FUNCTION calculateOverallScore(dq)
  weights = {
    completeness: 0.4,
    staleness: 0.3,
    outliers: 0.2,
    consistency: 0.1
  }
  
  scores = {
    completeness: avg(dq.completeness.*),
    staleness: IF any_stale THEN 0 ELSE 100,
    outliers: max(0, 100 - outlier_count * 20),
    consistency: max(0, 100 - issue_count * 10)
  }
  
  RETURN weighted_average(scores, weights)
END

CONST QUALITY_LEVELS
  EXCELLENT = score >= 95
  GOOD = score >= 80
  ACCEPTABLE = score >= 60
  POOR = score >= 40
  UNUSABLE = score < 40
END

--------------------------------------------------
# QUARANTENA
--------------------------------------------------

RULE QUARANTINE_TRIGGERS
  IF overall_score < 40 → QUARANTINE
  IF outlier.critical (odds < 1.01) → QUARANTINE
  IF consistency.grave_issue → QUARANTINE
  IF canonical_ids.missing → QUARANTINE
END

TABLE quarantine_data
  entity_type: string
  entity_id: string
  reason: string
  data: JSONB
  data_quality_score: number
  issues: JSONB
  reviewed: boolean
  resolution: enum (fixed | ignored | deleted)
END

RULE QUARANTINED_DATA_EXCLUSION
  FOR EACH decision
    NEVER use quarantined data
    WAIT for review + resolution
END

--------------------------------------------------
# LOGGING STRUTTURATO
--------------------------------------------------

STRUCT LogEntry
  timestamp: ISO8601
  level: enum (DEBUG | INFO | WARN | ERROR | FATAL)
  module: string
  message: string
  context: {
    match_id?: string
    duration_ms?: number
    error?: string
    ...
  }
END

RULE STRUCTURED_LOGGING
  FOR EACH operation
    LOG with context object
    NEVER log plain strings only
END

--------------------------------------------------
# METRICHE
--------------------------------------------------

METRICS system_level
  request_rate: req/sec
  response_time: p50, p95, p99
  error_rate: %
  cpu_memory: usage
END

METRICS domain_level
  data_quality_score: distribution
  quarantine_rate: %
  odds_staleness: p95
  live_latency: p95
  feature_computation_time: p95
END

METRICS business_level
  active_matches_count: number
  strategies_ready_count: number
  total_exposure: currency
END

--------------------------------------------------
# ALERTING
--------------------------------------------------

ALERT CRITICAL
  system_crash
  db_connection_lost
  feature_error_rate > 10%
  odds_staleness > 5min (live match)
END

ALERT WARNING
  data_quality_score < 60 for > 10 matches
  quarantine_rate > 5%
  response_time_p95 > 2s
  live_latency > 60s
END

RULE ALERT_DELIVERY
  CRITICAL → immediate notification (SMS, email, slack)
  WARNING → dashboard + slack
  INFO → log only
END

--------------------------------------------------
# INTEGRAZIONE MATCHBUNDLE
--------------------------------------------------

STRUCT MatchDataQuality
  match_id: string
  timestamp: ISO8601
  completeness: {
    header: number [0-1]
    statistics: number [0-1]
    odds: number [0-1]
    live: number [0-1]
  }
  staleness: {
    odds: { age_sec, is_stale }
    live: { age_sec, is_stale }
  }
  outliers: { count, fields[] }
  consistency_issues: string[]
  overall_score: number [0-100]
END

RULE BUNDLE_INCLUDES_DQ
  bundle.meta.data_quality = MatchDataQuality
  REQUIRED for every bundle
END

--------------------------------------------------
# DRIFT DETECTION
--------------------------------------------------

RULE DETECT_DRIFT
  FOR EACH feature
    historical = distribution over 7 days
    recent = distribution over 1 hour
    z_score = |recent.mean - historical.mean| / historical.stddev
    
    IF z_score > 3
      ALERT WARNING "drift detected"
END

--------------------------------------------------
# REGOLA FINALE
--------------------------------------------------

RULE DATA_QUALITY_GATE
  FOR EACH bundle
    IF data_quality.overall_score < 60
      THEN flag as LOW_QUALITY
    IF data_quality.overall_score < 40
      THEN REJECT for decisions
END

--------------------------------------------------

END FILOSOFIA_OBSERVABILITY_DATAQUALITY

--------------------------------------------------
# REFERENCES (INTER-DOCUMENT)
--------------------------------------------------

REFERENCES
  PARENT: FILOSOFIA_MADRE_TENNIS
  DEPENDS_ON:
    - FILOSOFIA_DB (data monitoring)
    - FILOSOFIA_TEMPORAL (staleness/freshness)
    - FILOSOFIA_REGISTRY_CANON (resolution quality)
    - FILOSOFIA_LINEAGE_VERSIONING (version drift)
  OUTPUTS_TO:
    - FILOSOFIA_STATS (feature quality metrics)
    - FILOSOFIA_CONCEPT_CHECKS (quality gates)
    - FILOSOFIA_FRONTEND_DATA_CONSUMPTION (dataQuality display)
END

ASSERT DATA_QUALITY_TRACKED
ASSERT QUARANTINE_ENFORCED
ASSERT ALERTS_CONFIGURED
ASSERT DRIFT_MONITORED
