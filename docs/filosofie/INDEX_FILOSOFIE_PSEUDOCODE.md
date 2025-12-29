# 🧭 INDEX FILOSOFIE — PSEUDOCODICE CANONICO (AI-READY)

> Documento eseguibile mentalmente da AI / Copilot.
> NON è codice reale. NON è documentazione narrativa.
> È una macchina di orientamento concettuale.

---

## 0️⃣ Bootstrap Concettuale

START Project_Context
SET PhilosophyMother = FILOSOFIA_MADRE_TENNIS
SET Index = INDEX_FILOSOFIE
SET Architecture = MatchBundle_Centric

ASSERT PhilosophyMother EXISTS
ASSERT Index EXISTS
END

---

## 1️⃣ Regola Costituzionale

RULE Constitutional_Principle
IF concept NOT derived_from PhilosophyMother
THEN concept IS INVALID
END

RULE Central_Truth
ALL domain_output MUST converge_to MatchBundle
END

---

## 2️⃣ Entry Point per Umani e AI

ON New_Task(task)
READ PhilosophyMother
IDENTIFY task.domain
IDENTIFY task.layer
NAVIGATE Index
CONTINUE only_if rules_respected
END

ON Confusion
STOP
MARK ARCH_DECISION
END

---

## 3️⃣ Layer Resolution Engine

FUNCTION resolveLayer(task)
IF task.concerns == UI OR UX
RETURN UI_LAYER

IF task.concerns == HTTP OR Routing
RETURN API_LAYER

IF task.concerns == Composition OR Business
RETURN SERVICE_LAYER

IF task.concerns == Calculation OR Metrics
RETURN CALCULATION_LAYER

IF task.concerns == DB OR External_Data
RETURN DATA_LAYER

ELSE
STOP AND ARCH_DECISION
END

---

## 4️⃣ Layer Rules Enforcement

RULE UI_LAYER
ALLOW Rendering
ALLOW UX_Logic
DENY Domain_Logic
DENY Calculations
END

RULE SERVICE_LAYER
ALLOW Composition
ALLOW Domain_Rules
DENY SQL
DENY UI_Normalization
END

RULE CALCULATION_LAYER
ALLOW Pure_Functions
REQUIRE Deterministic_Output
DENY DB_Access
END

RULE DATA_LAYER
ALLOW Queries
DENY Interpretation
DENY Calculations
END

---

## 5️⃣ Filosofia Routing Engine

FUNCTION resolvePhilosophy(task)
IF task.topic == DATABASE
RETURN FILOSOFIA_DB

IF task.topic == TEMPORAL
RETURN FILOSOFIA_TEMPORAL

IF task.topic == LIVE
RETURN FILOSOFIA_LIVE_TRACKING

IF task.topic == ODDS
RETURN FILOSOFIA_ODDS

IF task.topic == ANALYTICS
RETURN FILOSOFIA_CALCOLI

IF task.topic == STRATEGY
RETURN FILOSOFIA_RISK

ELSE
STOP AND ARCH_DECISION
END

---

## 6️⃣ MatchBundle Guard

RULE MatchBundle_Integrity
IF output NOT instance_of MatchBundle
THEN REJECT
END

RULE Frontend_Consumption
IF consumer == Frontend
REQUIRE MatchBundle
END

---

## 7️⃣ Data Flow Canonico

FLOW Data_Pipeline
SOURCE → RAW_EVENTS
→ NORMALIZATION
→ CANONICAL_DB
→ FEATURE_ENGINE
→ STRATEGY_ENGINE
→ MATCHBUNDLE_SNAPSHOT
→ API / WS
→ useMatchBundle
→ UI_RENDER
END

---

## 8️⃣ Invariants Enforcement Engine

INVARIANT MATCHBUNDLE_ONLY_FE
INVARIANT BACKEND_INTERPRETS_DATA
INVARIANT FEATURE_NOT_STRATEGY
INVARIANT SIGNAL_NOT_PERSISTED
INVARIANT DATA_QUALITY_BACKEND_ONLY

FOR EACH invariant
IF violated
THROW ARCH_ERROR
END

---

## 9️⃣ Copilot Decision Rules

IF need_data
GO TO Data_Layer

IF need_calculation
GO TO Calculation_Layer

IF need_composition
GO TO Service_Layer

IF need_rendering
GO TO UI_Layer

IF unsure
STOP AND ARCH_DECISION

---

## 🔟 Pre-Code Checklist (Executable)

BEFORE write_code
CHECK PhilosophyMother_read
CHECK Layer_identified
CHECK Philosophy_resolved
CHECK Invariants_respected
CHECK No_logic_duplication
END

---

## 1️⃣1️⃣ Evolution Protocol

ON New_Idea
WRITE Philosophy_Document
UPDATE Index
UPDATE Conceptual_Map
WRITE Code
RUN Concept_Checks
END

RULE No_Document_No_Code
IF document_missing
THEN code IS FORBIDDEN
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

RULE API_ROUTES_REFERENCE

# Complete route mapping (as of 2025-12-28)

# Source: backend/routes/index.js + individual route files

ROUTE health.routes.js
MOUNT /api/
GET / → healthController.root
GET /health → healthController.check
END

ROUTE match.routes.js
MOUNT /api/match, /api/matches # STATIC ROUTES (first)
GET /search → matchController.search
GET /tournaments → matchController.getTournaments
GET /db → matchController.getFromDb
GET /suggested → matchController.getSuggested
GET /detected → matchController.getDetected
GET /strategy-context/:home/:away → playerController.getStrategyContext
GET /tournament/:tournamentId/events → matchController.getTournamentEvents
POST /sync/:eventId → matchController.syncMatch
POST /sync-match/:eventId → matchController.syncMatchFull
GET /check-data/:eventId → matchController.checkData # DYNAMIC ROUTES (last)
GET /:eventId/bundle → matchController.getBundle # ⭐ MAIN ENDPOINT
GET /:eventId → matchController.getMatch
GET / → matchController.listFromFiles
END

ROUTE player.routes.js
MOUNT /api/player
GET /search → playerController.search
GET /h2h → playerController.getH2H
GET /:name/stats → playerController.getStats
GET /:name/matches → playerController.getMatches
END

ROUTE tracking.routes.js
MOUNT /api/track, /api/tracked, /api/tracking
POST /:eventId → trackingController.track
DELETE /:eventId → trackingController.untrack
GET / → trackingController.listTracked
POST /:eventId/priority → trackingController.setPriority
POST /:eventId/resume → trackingController.resume
GET /stats → trackingController.getStats
POST /reconcile → trackingController.reconcile
GET /live/discover → trackingController.discover
GET /live/status → trackingController.getStatus
GET /live/stats → trackingController.getLiveStats
POST /scheduler/start → trackingController.startScheduler
POST /scheduler/stop → trackingController.stopScheduler
END

ROUTE stats.routes.js
MOUNT /api/stats
GET /db → statsController.getDbStats
GET /health → statsController.getHealth
END

ROUTE value.routes.js
MOUNT /api/
POST /interpret-value → valueController.interpret
POST /analyze-power-rankings → valueController.analyzePowerRankings
GET /value-thresholds → valueController.getThresholds
GET /value-zone/:value → valueController.getZone
END

ROUTE event.routes.js
MOUNT /api/event
GET /:eventId/point-by-point → eventController.getPointByPoint
GET /:eventId/statistics → eventController.getStatistics
GET /:eventId/power-rankings → eventController.getPowerRankings
GET /:eventId/live → eventController.getLive
END

ROUTE db.routes.js
MOUNT /api/db
GET -stats → dbController.getDbStats # alias /api/db-stats
GET /test → dbController.testConnection
GET /matches/summary → dbController.getMatchesSummary
GET /matches/by-month/:yearMonth → dbController.getMatchesByMonth
GET /matches/:id/point-by-point → dbController.getPointByPoint
GET /matches/:id/statistics → dbController.getStatistics
GET /matches/:id → dbController.getMatchById
GET /matches → dbController.getMatches
GET /tournaments → dbController.getTournaments
GET /players/search → dbController.searchPlayers
GET /logs → dbController.getLogs
END

ROUTE scrapes.routes.js
MOUNT /api/scrapes
GET / → scrapesController.list
GET /:id → scrapesController.get # Root-level (via index.js):
POST /scrape → scrapesController.scrape
GET /status/:id → scrapesController.getStatus
GET /data/:id → scrapesController.getData
POST /lookup-name → scrapesController.lookupName
END

END Index_Filosofie_PseudoCode
ASSERT System_Is_Governed
ASSERT AI_Is_Aligned
