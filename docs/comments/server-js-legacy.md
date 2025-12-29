// dref:server-js-legacy: 2512281745
// ============================================================================
// NOTE: DATABASE STATISTICS API MIGRATED TO ROUTES
// /api/db-stats → routes/index.js (legacy alias) → routes/stats.routes.js → controllers/stats.controller.js
// /api/stats/db → routes/stats.routes.js → controllers/stats.controller.js
// /api/stats/health → routes/stats.routes.js → controllers/stats.controller.js
// ============================================================================

// ============================================================================
// NOTE: TOURNAMENT, SEARCH, MATCHES ENDPOINTS MIGRATED TO ROUTES
// /api/tournament/:tournamentId/events → routes/match.routes.js → matchController.getTournamentEvents
// /api/matches/search → routes/match.routes.js → matchController.search
// /api/matches/tournaments → routes/match.routes.js → matchController.getTournaments
// /api/matches/db → routes/match.routes.js → matchController.getFromDb
// /api/matches → routes/match.routes.js → matchController.listFromFiles
// /api/suggested-matches → routes/match.routes.js → matchController.getSuggested
// /api/detected-matches → routes/match.routes.js → matchController.getDetected
// ============================================================================

// ============================================================================
// NOTE: SCRAPING & LOOKUP ENDPOINTS MIGRATED TO ROUTES
// /api/scrape → routes/index.js → controllers/scrapes.controller.js (scrape)
// /api/lookup-name → routes/index.js → controllers/scrapes.controller.js (lookupName)
// /api/sync-match/:eventId → routes/match.routes.js → controllers/match.controller.js (syncMatchFull)
// /api/check-data/:eventId → routes/match.routes.js → controllers/match.controller.js (checkData)
// ============================================================================

// ============================================================================
// NOTE: SCRAPES ENDPOINTS MIGRATED TO ROUTES
// /api/scrapes, /api/scrapes/:id → routes/scrapes.routes.js
// /api/scrape, /api/status/:id, /api/data/:id, /api/lookup-name → routes/index.js (root level)
// → controllers/scrapes.controller.js
// ============================================================================

// ============================================================================
// NOTE: VALUE & EVENT ENDPOINTS MIGRATED TO ROUTES
// /api/interpret-value, /api/analyze-power-rankings, /api/value-thresholds, /api/value-zone/:value
// → routes/value.routes.js → controllers/value.controller.js
//
// /api/event/:eventId/point-by-point, /api/event/:eventId/statistics,
// /api/event/:eventId/power-rankings, /api/event/:eventId/live
// → routes/event.routes.js → controllers/event.controller.js
//
// /api/live/stats → routes/tracking.routes.js → controllers/tracking.controller.js
// ============================================================================

// ============================================================================
// NOTE: DATABASE API ENDPOINTS MIGRATED TO ROUTES
// /api/db/test, /api/db/matches, /api/db/matches/summary, /api/db/matches/by-month/:yearMonth,
// /api/db/matches/:id, /api/db/matches/:id/point-by-point, /api/db/matches/:id/statistics,
// /api/db/tournaments, /api/db/players/search, /api/db/logs
// → routes/db.routes.js → controllers/db.controller.js
// ============================================================================

// ============================================================================
// NOTE: PLAYER STATS ENDPOINTS MIGRATED TO ROUTES
// /api/player/:name/stats, /api/player/search, /api/player/h2h,
// /api/player/:name/matches, /api/match/strategy-context/:home/:away
// → routes/player.routes.js, routes/match.routes.js → controllers/player.controller.js
// ============================================================================

// ============================================================================
// NOTE: TRACKING ENDPOINTS MIGRATED TO ROUTES
// /api/track/:eventId (POST, DELETE), /api/tracked, /api/track/:eventId/priority,
// /api/track/:eventId/resume, /api/tracking/stats, /api/reconcile,
// /api/live/discover, /api/live/status, /api/sync/:eventId,
// /api/scheduler/start, /api/scheduler/stop
// → routes/tracking.routes.js → controllers/tracking.controller.js
// ============================================================================

// ============================================================================
// HYBRID API - Leggi da DB con fallback a file/SofaScore
// ============================================================================
