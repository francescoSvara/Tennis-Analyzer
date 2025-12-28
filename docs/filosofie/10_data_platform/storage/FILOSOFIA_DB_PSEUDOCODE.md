# 🗄️ FILOSOFIA DATABASE – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.
# NON è codice eseguibile.
# È una specifica formale di regole.

--------------------------------------------------

START FILOSOFIA_DB

SET PRIMARY_TABLE        = matches_new
SET CACHE_TABLE          = match_card_snapshot
SET CONSUMPTION_ENDPOINT = /api/match/:id/bundle

# API Architecture (as of 2025-12-28)
SET ROUTE_FILE      = backend/routes/match.routes.js
SET CONTROLLER_FILE = backend/controllers/match.controller.js
SET SERVICE_FILE    = backend/services/bundleService.js

--------------------------------------------------
# SEPARAZIONE FONTI / CONSUMO
--------------------------------------------------

RULE SOURCE_VS_CONSUMPTION
  SOURCE popola DB
  CONSUMPTION legge da bundle
  NEVER mix the two
END

--------------------------------------------------
# FONTI AMMESSE
--------------------------------------------------

RULE ALLOWED_SOURCES
  ALLOW sofascoreScraper.js
  ALLOW matchEnrichmentService.js
  ALLOW svgMomentumExtractor.js
  DENY all_other_sources
END

RULE SOURCE_VALIDATION
  FOR EACH insert
    ASSERT source IS IDENTIFIED
    ASSERT timestamp EXISTS
  END
END

--------------------------------------------------
# CONSUMO UNICO
--------------------------------------------------

RULE SINGLE_ENDPOINT
  Frontend CALLS /api/match/:id/bundle
  Frontend NEVER calls /stats, /odds, /momentum directly
END

RULE BUNDLE_BUILD_FLOW
  1. CHECK cache (match_card_snapshot)
  2. IF miss → LOAD from matches_new
  3. APPLY featureEngine
  4. APPLY strategyEngine
  5. RETURN MatchBundle
END

--------------------------------------------------
# SCHEMA REQUIREMENTS
--------------------------------------------------

RULE TABLE_REQUIREMENTS
  FOR EACH table
    ASSERT created_at EXISTS
    ASSERT source EXISTS
    ASSERT version EXISTS
  END
END

RULE CANONICAL_SCHEMA
  matches_new:
    - home_player_id (FK)
    - away_player_id (FK)
    - tournament_id (FK)
    - event_time
    - status
    - data_quality
END

--------------------------------------------------
# DATA QUALITY
--------------------------------------------------

RULE DATAQUALITY_REQUIRED
  FOR EACH bundle
    ASSERT dataQuality.completeness EXISTS
    ASSERT dataQuality.freshness EXISTS
    ASSERT dataQuality.source EXISTS
  END
END

RULE DATAQUALITY_BACKEND_ONLY
  dataQuality CALCULATED in backend
  Frontend DISPLAYS only
  Frontend NEVER calculates
END

--------------------------------------------------
# PBP EXTRACTION RULES
--------------------------------------------------

RULE PBP_ROW_MAPPING
  row1 = HOME (always)
  row2 = AWAY (always)
  NEVER changes based on server
END

RULE PBP_VALIDATION
  BEFORE insert
    CHECK server_score_progression
    CHECK alternanza_servizio
    CHECK break_definition
    CHECK point_winner_detection
  END
END

--------------------------------------------------
# REGOLA FINALE
--------------------------------------------------

RULE NO_DATA_NO_FRONTEND
  IF data NOT in DB
    THEN data NOT exists for frontend
END

RULE API_LAYER_IMPLEMENTATION
 WHEN defining API endpoints
  - Routes: backend/routes/*.routes.js define URL + middleware
  - Controllers: backend/controllers/*.controller.js handle req -> service -> res
  - server.js MUST only bootstrap and mount routes/sockets (no domain logic)
 END

--------------------------------------------------

END FILOSOFIA_DB

--------------------------------------------------
# REFERENCES (INTER-DOCUMENT)
--------------------------------------------------

REFERENCES
  PARENT: FILOSOFIA_MADRE_TENNIS
  DEPENDS_ON:
    - FILOSOFIA_TEMPORAL (as_of_time, event_time)
    - FILOSOFIA_REGISTRY_CANON (canonical IDs, FK)
    - FILOSOFIA_LINEAGE_VERSIONING (data_version)
    - FILOSOFIA_OBSERVABILITY_DATAQUALITY (dataQuality)
  OUTPUTS_TO:
    - FILOSOFIA_STATS (raw data → features)
    - FILOSOFIA_FRONTEND_DATA_CONSUMPTION (MatchBundle)
END

ASSERT SOURCES_ARE_CONTROLLED
ASSERT CONSUMPTION_IS_UNIFIED
ASSERT QUALITY_IS_MEASURED
