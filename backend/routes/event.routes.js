/**
 * Event Routes
 * 
 * Endpoints per fetch diretto eventi SofaScore:
 * - GET /event/:eventId/point-by-point
 * - GET /event/:eventId/statistics  
 * - GET /event/:eventId/power-rankings
 * - GET /event/:eventId/live - Tutti i dati live
 * 
 * NOTE: Questi endpoint fanno fetch DIRETTO a SofaScore.
 * Per dati da DB usare /api/match/:eventId/bundle (FILOSOFIA MATCHBUNDLE_ONLY_FE)
 * 
 * @see docs/filosofie/FILOSOFIA_LIVE_TRACKING.md
 */

const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');

// Direct SofaScore fetches
router.get('/:eventId/point-by-point', eventController.getPointByPoint);
router.get('/:eventId/statistics', eventController.getStatistics);
router.get('/:eventId/power-rankings', eventController.getPowerRankings);
router.get('/:eventId/live', eventController.getLive);

module.exports = router;
