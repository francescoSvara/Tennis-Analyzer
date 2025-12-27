# 🧪 FILOSOFIA CONCEPT CHECKS – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.
# Sistema immunitario dell'architettura.

--------------------------------------------------

START FILOSOFIA_CONCEPT_CHECKS

SET CONCEPT_CHECKS_ENFORCED = TRUE
SET ARCHITECTURE_PROTECTED = TRUE

--------------------------------------------------
# PRINCIPIO COSTITUZIONALE
--------------------------------------------------

RULE EVERY_CODE_KNOWS_ITSELF
  Every piece of code MUST know:
    - WHO it is
    - WHAT it can do
    - WHAT it must NOT do
END

--------------------------------------------------
# INVARIANTI NON NEGOZIABILI
--------------------------------------------------

INVARIANT MATCHBUNDLE_ONLY_FE
  Frontend consumes ONLY MatchBundle
  
  IF frontend fetches /stats OR /momentum directly
    THEN ERROR "use MatchBundle"
END

INVARIANT BACKEND_INTERPRETATION
  ONLY backend interprets data
  
  IF frontend calculates pressure OR edge
    THEN ERROR "backend only"
END

INVARIANT FEATURE_VS_STRATEGY
  Feature Engine → calculates numbers
  Strategy Engine → decides READY/WATCH/OFF
  Frontend → visualizes signals
  
  IF boundaries crossed
    THEN ERROR "wrong responsibility"
END

INVARIANT SIGNAL_NOT_METRIC
  Signals are NOT metrics
  
  IF READY/WATCH persisted in DB as history
    THEN ERROR "signals are point-in-time"
END

INVARIANT DATAQUALITY_BACKEND
  DataQuality calculated ONLY in backend
  
  IF frontend has calculateCompleteness()
    THEN ERROR "backend only"
END

--------------------------------------------------
# REGOLE TEMPORALI
--------------------------------------------------

RULE TEMPORAL_ASOF
  feature_snapshot.as_of_time <= match.event_time (pre-match)
  feature_snapshot.as_of_time <= now() (live)
  
  IF as_of_time > reference_time
    THEN ERROR "temporal violation"
END

RULE NO_FUTURE_DATA
  NO query uses rows with event_time > as_of_time
  
  IF future_data_used
    THEN ERROR "future data = fake edge"
END

--------------------------------------------------
# REGOLE IDENTITÀ
--------------------------------------------------

RULE CANONICAL_IDS_REQUIRED
  bundle MUST have:
    header.home_player.player_id
    header.away_player.player_id
    header.tournament.tournament_id
  
  IF any_id missing
    THEN ERROR "canonical ID required"
END

RULE MATCHBUNDLE_META_REQUIRED
  meta MUST include:
    generated_at
    as_of_time
    versions.bundle_schema
    versions.data
    versions.features
    versions.strategies
  
  IF any_field missing
    THEN ERROR "meta field required"
END

--------------------------------------------------
# REGOLE QUALITÀ
--------------------------------------------------

RULE DATA_QUALITY_THRESHOLD
  IF data_quality.overall_score < 40
    THEN ERROR "unusable data"
  
  IF data_quality.overall_score < 60
    THEN WARNING "poor data quality"
END

RULE ODDS_STALENESS_WARNING
  IF match.is_live AND odds_age > 30s
    THEN WARNING "odds stale (live)"
  
  IF NOT match.is_live AND odds_age > 10min
    THEN WARNING "odds stale (pre-match)"
END

RULE NO_QUARANTINED_DATA
  IF match.is_quarantined
    THEN ERROR "quarantined data"
    DO NOT use for decisions
END

--------------------------------------------------
# CHECK ARCHITETTURALI
--------------------------------------------------

CHECK LIN-001
  FILE: featureEngine.js
  ASSERT exports.VERSION exists
  REASON: lineage traceability
END

CHECK LIN-002
  FILE: strategyEngine.js
  ASSERT exports.VERSION exists
  REASON: lineage traceability
END

CHECK CALC-001
  FILE: featureEngine.js
  ASSERT computeFeatures() NEVER returns null
  REASON: fallback hierarchy
END

CHECK FE-001
  FILE: App.jsx
  ASSERT NO import from featureEngine
  REASON: frontend boundary
END

CHECK DB-001
  FILE: supabase.js
  ASSERT supabase client centralized
  REASON: single connection management
END

--------------------------------------------------
# SEVERITÀ
--------------------------------------------------

CONST SEVERITY_LEVELS
  ERROR = blocks CI (merge denied)
  WARN = report + TODO (merge allowed)
  INFO = documentation only
END

POLICY CI_Gate
  IF errors.count > 0
    THEN FAIL build
  ELSE
    PASS build
END

--------------------------------------------------
# ECCEZIONI
--------------------------------------------------

ANNOTATION philosophy_allow
  FORMAT: // philosophy:allow RULE_ID reason="explanation"
  
  IF annotation present
    THEN downgrade severity
    MUST have valid reason
END

RULE EXCEPTION_REVIEW
  Exceptions MUST be reviewed periodically
  IF reason no longer valid
    THEN remove exception
END

--------------------------------------------------
# REGOLA FINALE
--------------------------------------------------

RULE CHECK_QUALITY
  IF check produces too many false positives
    OR check hard to explain
    OR check not linked to philosophy
  THEN remove OR simplify
  
  TRUTH: Architectural discipline > tooling
END

--------------------------------------------------

END FILOSOFIA_CONCEPT_CHECKS

--------------------------------------------------
# REFERENCES (INTER-DOCUMENT)
--------------------------------------------------

REFERENCES
  PARENT: FILOSOFIA_MADRE_TENNIS
  DEPENDS_ON:
    - FILOSOFIA_DB (schema validation)
    - FILOSOFIA_TEMPORAL (temporal invariants)
    - FILOSOFIA_REGISTRY_CANON (identity checks)
    - FILOSOFIA_LINEAGE_VERSIONING (version checks)
    - FILOSOFIA_OBSERVABILITY_DATAQUALITY (quality gates)
  OUTPUTS_TO:
    - CI/CD pipeline (automated enforcement)
    - All code modules (invariant checking)
END

ASSERT INVARIANTS_ENFORCED
ASSERT TEMPORAL_PROTECTED
ASSERT IDENTITY_VERIFIED
ASSERT QUALITY_GATED
ASSERT CI_INTEGRATED
