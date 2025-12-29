# 🗄️ FILOSOFIA DATABASE – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.

# NON è codice eseguibile.

# È una specifica formale di regole.

---

START FILOSOFIA_DB

SET PRIMARY_TABLE = matches
SET PLAYERS_TABLE = players
SET TOURNAMENTS_TABLE = tournaments
SET STATS_TABLE = match_statistics
SET MOMENTUM_TABLE = match_power_rankings
SET PBP_TABLE = match_point_by_point
SET CONSUMPTION_ENDPOINT = /api/match/:id/bundle

# API Architecture (as of 2025-12-28)

SET ROUTE_FILE = backend/routes/match.routes.js
SET CONTROLLER_FILE = backend/controllers/match.controller.js
SET SERVICE_FILE = backend/services/bundleService.js

---

# SEPARAZIONE FONTI / CONSUMO

---

RULE SOURCE_VS_CONSUMPTION
SOURCE popola DB
CONSUMPTION legge da bundle
NEVER mix the two
END

---

# FONTI AMMESSE

---

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

---

# CONSUMO UNICO

---

RULE SINGLE_ENDPOINT
Frontend CALLS /api/match/:id/bundle
Frontend NEVER calls /stats, /odds, /momentum directly
END

RULE BUNDLE_BUILD_FLOW
1. CHECK cache (match_card_snapshot)
2. IF miss → LOAD from matches table
3. JOIN players, tournaments, match_statistics, match_power_rankings
4. APPLY featureEngine
5. APPLY strategyEngine
6. RETURN MatchBundle (complete, single response)
END

---

# SCHEMA REQUIREMENTS

---

RULE TABLE_REQUIREMENTS
FOR EACH table
ASSERT created_at EXISTS
ASSERT source EXISTS
ASSERT version EXISTS
END
END

RULE CANONICAL_SCHEMA
matches: player1_id (FK), player2_id (FK), tournament_id (FK), start_timestamp, status, score
players: id, name, country_code, current_ranking
tournaments: id, name, surface
match_statistics: match_id (FK), period, stat_name, home_value, away_value
match_power_rankings: match_id (FK), set_number, game_number, value
match_point_by_point: match_id (FK), set_number, game_number, point_number, server, point_winner
END

---

# SINGLE SOURCE OF TRUTH (2025-12-29)

---

RULE SINGLE_SOURCE_OF_TRUTH
FOR match: ONE row in `matches` table
FOR player: ONE row in `players` table  
FOR tournament: ONE row in `tournaments` table
NEVER duplicate data across tables
NEVER multiple queries for same entity
ONE API call → ALL data
END

RULE NO_LEGACY_SUFFIXES
NEVER use matches_new
NEVER use players_new
NEVER use tournaments_new
ALWAYS use TABLES constants from backend/db/supabase.js
END

---

# DATA QUALITY

---

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

---

# PBP EXTRACTION RULES

---

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

---

# REGOLA FINALE

---

RULE NO_DATA_NO_FRONTEND
IF data NOT in DB
THEN data NOT exists for frontend
END

RULE API_LAYER_IMPLEMENTATION
WHEN defining API endpoints

- Routes: backend/routes/\*.routes.js define URL + middleware
- Controllers: backend/controllers/\*.controller.js handle req -> service -> res
- server.js MUST only bootstrap and mount routes/sockets (no domain logic)
  END

---

END FILOSOFIA_DB

---

# REFERENCES (INTER-DOCUMENT)

---

REFERENCES
PARENT: FILOSOFIA_MADRE_TENNIS
DEPENDS_ON: - FILOSOFIA_TEMPORAL (as_of_time, event_time) - FILOSOFIA_REGISTRY_CANON (canonical IDs, FK) - FILOSOFIA_LINEAGE_VERSIONING (data_version) - FILOSOFIA_OBSERVABILITY_DATAQUALITY (dataQuality)
OUTPUTS_TO: - FILOSOFIA_STATS (raw data → features) - FILOSOFIA_FRONTEND_DATA_CONSUMPTION (MatchBundle)
END

ASSERT SOURCES_ARE_CONTROLLED
ASSERT CONSUMPTION_IS_UNIFIED
ASSERT QUALITY_IS_MEASURED
