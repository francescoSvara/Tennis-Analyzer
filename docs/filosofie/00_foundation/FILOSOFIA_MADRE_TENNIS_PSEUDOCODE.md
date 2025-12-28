# 🧠 FILOSOFIA MADRE – TENNIS ANALYZER
# PSEUDOCODICE CANONICO (STRICT AI-READY)

# Questo documento è PSEUDOCODICE.
# NON è testo descrittivo.
# NON è codice eseguibile.
# È una specifica formale di regole.

--------------------------------------------------

START FILOSOFIA_MADRE

SET SYSTEM_NAME            = "Tennis Analyzer"
SET CORE_DOMAIN_OBJECT     = MatchBundle
SET ARCHITECTURE_TYPE      = MatchBundle_Centric
SET AUTHORITY_LEVEL        = CONSTITUTIONAL

ASSERT CORE_DOMAIN_OBJECT IS UNIQUE
ASSERT ARCHITECTURE_TYPE IS ENFORCED

--------------------------------------------------
# PRINCIPI DI VERITÀ
--------------------------------------------------

RULE RAW_DATA_IS_NOT_TRUTH
 IF data.state == RAW
  THEN data.truth = FALSE
END

RULE INTERPRETED_DATA_IS_TRUTH
 IF data.state == INTERPRETED
 AND data.location == BACKEND
  THEN data.truth = TRUE
END

--------------------------------------------------
# PRIMATO DEL MATCHBUNDLE
--------------------------------------------------

RULE MATCHBUNDLE_PRIMACY
 FOR EACH domain_output
  ASSERT domain_output.TYPE == MatchBundle
 END
END

RULE FRONTEND_CONSUMPTION
 IF consumer == FRONTEND
  ASSERT input.TYPE == MatchBundle
 END
END

--------------------------------------------------
# SEPARAZIONE DEI RUOLI
--------------------------------------------------

ROLE REPOSITORY
 ALLOW read_data
 ALLOW write_data
 DENY interpretation
 DENY calculation
END

ROLE CALCULATION
 ALLOW pure_function
 REQUIRE deterministic
 DENY data_access
END

ROLE SERVICE
 ALLOW compose_objects
 ALLOW domain_rules
 DENY sql_queries
 DENY ui_normalization
END

ROLE STRATEGY
 ALLOW decision_logic
 DENY data_persistence
END

ROLE FRONTEND
 ALLOW render
 ALLOW user_interaction
 DENY domain_logic
 DENY calculation
END

--------------------------------------------------
# TEMPO, VERSIONI, QUALITÀ
--------------------------------------------------

RULE TEMPORAL_INTEGRITY
 FOR EACH data_item
  ASSERT data_item.timestamp EXISTS
 END
END

RULE VERSIONING_INTEGRITY
 FOR EACH snapshot
  ASSERT snapshot.version EXISTS
 END
END

RULE DATA_QUALITY_REQUIRED
 FOR EACH snapshot
  ASSERT snapshot.data_quality EXISTS
 END
END

--------------------------------------------------
# COMPORTAMENTO AI
--------------------------------------------------

RULE AI_LIMITS
 AI MUST_NOT modify_philosophy
 AI MUST_NOT bypass_rules
 AI MUST signal_violation
 AI MUST stop_if_uncertain
END

--------------------------------------------------
# LEGGE FINALE
--------------------------------------------------

RULE NO_DOCUMENT_NO_CODE
 IF decision.documented == FALSE
  THEN code_generation = FORBIDDEN
 END
END

--------------------------------------------------

RULE API_LAYER_IMPLEMENTATION
 WHEN exposing constitutional endpoints
  - ensure they are implemented via routes/controllers and services
  - server.js MUST remain an entrypoint only (bootstrap + mount)
  
  CONSTITUTIONAL_ENDPOINTS:
    - GET /api/match/:id/bundle     # MatchBundle - SINGLE SOURCE OF TRUTH for FE
    - GET /api/stats/db             # Database statistics
    - GET /api/matches/suggested    # Match suggestions
    - GET /api/matches/detected     # Detected matches
    - GET /api/player/:name/stats   # Player statistics
    - GET /api/tracking/*           # Live tracking operations
  
  ARCHITECTURE:
    backend/routes/*.routes.js     → URL + middleware
    backend/controllers/*.js       → req → service → res (thin)
    backend/services/*.js          → business logic, bundle composition
    backend/utils/*.js             → calculations (pure functions)
    backend/db/*Repository.js      → data access (no business logic)
 END

END FILOSOFIA_MADRE

--------------------------------------------------
# REFERENCES (INTER-DOCUMENT)
--------------------------------------------------

REFERENCES
  PARENT: ROOT (no parent - this IS the root)
  DEPENDS_ON: (none - foundation document)
  OUTPUTS_TO:
    - ALL other FILOSOFIA documents
    - FILOSOFIA_DB (storage principles)
    - FILOSOFIA_TEMPORAL (time semantics)
    - FILOSOFIA_REGISTRY_CANON (identity mapping)
    - FILOSOFIA_LINEAGE_VERSIONING (reproducibility)
    - FILOSOFIA_OBSERVABILITY_DATAQUALITY (monitoring)
    - FILOSOFIA_CONCEPT_CHECKS (validation)
    - FILOSOFIA_LIVE_TRACKING (live updates)
    - FILOSOFIA_PBP_EXTRACTION (tennis data)
    - FILOSOFIA_ODDS (market data)
    - FILOSOFIA_CALCOLI (calculations)
    - FILOSOFIA_STATS (features/signals)
    - FILOSOFIA_RISK_BANKROLL (risk management)
    - FILOSOFIA_FRONTEND_DATA_CONSUMPTION (data contract)
    - FILOSOFIA_FRONTEND (UI principles)
END

ASSERT SYSTEM_IS_COHERENT
ASSERT ARCHITECTURE_IS_GOVERNED
ASSERT AI_IS_ALIGNED
