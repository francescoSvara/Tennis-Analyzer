/**
 * Database Routes
 * 
 * Endpoints per accesso al database:
 * - GET /db-stats - Statistiche complete del database
 * - GET /db/test - Test connessione
 * - GET /db/matches - Lista match dal DB
 * - GET /db/matches/summary - Summary per HomePage
 * - GET /db/matches/by-month/:yearMonth - Match di un mese
 * - GET /db/matches/:id - Singolo match
 * - GET /db/matches/:id/point-by-point
 * - GET /db/matches/:id/statistics
 * - GET /db/tournaments - Lista tornei
 * - GET /db/players/search - Ricerca giocatori
 * - GET /db/logs - Extraction logs
 * 
 * @see docs/filosofie/FILOSOFIA_DB.md
 */

const express = require('express');
const router = express.Router();
const dbController = require('../controllers/db.controller');

// Database statistics (mounted at /api/db-stats)
router.get('-stats', dbController.getDbStats);

// Test connection
router.get('/test', dbController.testConnection);

// Matches
router.get('/matches/summary', dbController.getMatchesSummary);
router.get('/matches/by-month/:yearMonth', dbController.getMatchesByMonth);
router.get('/matches/:id/point-by-point', dbController.getPointByPoint);
router.get('/matches/:id/statistics', dbController.getStatistics);
router.get('/matches/:id', dbController.getMatchById);
router.get('/matches', dbController.getMatches);

// Tournaments
router.get('/tournaments', dbController.getTournaments);

// Players
router.get('/players/search', dbController.searchPlayers);

// Logs
router.get('/logs', dbController.getLogs);

module.exports = router;
