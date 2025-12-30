/**
 * Match Routes
 *
 * Endpoints per match singoli e liste:
 * - GET /match/:eventId - Dati match (ibrido: DB → File → SofaScore)
 * - GET /match/:eventId/bundle - UNIFIED MATCH BUNDLE (endpoint principale)
 * - GET /matches - Lista match da file
 * - GET /matches/db - Lista match da database
 * - GET /matches/search - Ricerca con filtri
 * - GET /matches/tournaments - Lista tornei per filtro
 * - GET /suggested-matches - Match suggeriti
 * - GET /detected-matches - Match rilevati da acquisire
 * - GET /tournament/:id/events - Match di un torneo
 * - POST /sync/:eventId - Sync manuale
 * - POST /sync-match/:eventId - Sync completo
 * - GET /check-data/:eventId - Verifica completezza
 * - GET /strategy-context/:home/:away - Contesto strategie per match
 *
 * @see docs/filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md
 * @see docs/filosofie/MATCHBUNDLE_ONLY_FE
 */

const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const playerController = require('../controllers/player.controller');

// STATIC ROUTES FIRST (before dynamic :eventId routes)

// Search & Lists
router.get('/search', matchController.search);
router.get('/tournaments', matchController.getTournaments);
router.get('/db', matchController.getFromDb);

// Suggested & Detected
router.get('/suggested', matchController.getSuggested);
router.get('/detected', matchController.getDetected);

// Strategy context (uses playerController)
router.get('/strategy-context/:home/:away', playerController.getStrategyContext);

// Tournament events
router.get('/tournament/:tournamentId/events', matchController.getTournamentEvents);

// Sync
router.post('/sync/:eventId', matchController.syncMatch);
router.post('/sync-match/:eventId', matchController.syncMatchFull);

// Check data completeness
router.get('/check-data/:eventId', matchController.checkData);

// Cards list
router.get('/cards', matchController.getCards);

// Merged matches from files
router.get('/merged', matchController.getMerged);

// Calculation endpoints (static paths before :eventId)
router.post('/pressure', matchController.calculatePressure);
router.post('/segment', matchController.segmentMatch);

// DYNAMIC ROUTES LAST (after all static routes)

// Bundle endpoint (MAIN - FILOSOFIA MATCHBUNDLE_ONLY_FE)
router.get('/:eventId/bundle', matchController.getBundle);

// Match sub-endpoints
router.get('/:eventId/refresh', matchController.refresh);
router.get('/:eventId/card', matchController.getCard);
router.get('/:eventId/momentum', matchController.getMomentum);
router.post('/:eventId/momentum-svg', matchController.saveMomentumSvg);
router.get('/:eventId/statistics', matchController.getStatistics);
router.get('/:eventId/odds', matchController.getOdds);
router.get('/:eventId/points', matchController.getPoints);
router.post('/:eventId/rebuild-snapshot', matchController.rebuildSnapshot);
router.get('/:eventId/breaks', matchController.getBreaks);
router.get('/:eventId/inspector', matchController.getInspector);

// Single match data (hybrid: DB → File → SofaScore)
router.get('/:eventId', matchController.getMatch);

// File-based lists (legacy) - root path
router.get('/', matchController.listFromFiles);

module.exports = router;
