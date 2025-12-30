/**
 * Player Routes
 *
 * Endpoints per giocatori e statistiche:
 * - GET /player/:name/stats - Stats complete giocatore
 * - GET /player/search - Ricerca autocomplete
 * - GET /player/h2h - Head to Head
 * - GET /player/:name/matches - Lista match giocatore
 * - GET /player/:playerId - Dettagli giocatore per ID
 * - GET /player/:playerName/profile - Profilo aggregato
 * - GET /player/:playerName/inspector - Data inspector
 * - POST /player/alias - Aggiungi alias
 * - POST /player/merge - Merge giocatori
 *
 * NOTE: /match/strategy-context/:home/:away è in match.routes.js
 *
 * @see docs/filosofie/FILOSOFIA_STATS.md
 */

const express = require('express');
const router = express.Router();
const playerController = require('../controllers/player.controller');

// STATIC ROUTES FIRST (before dynamic :param routes)
router.get('/search', playerController.search);
router.get('/compare', playerController.compare);  // /players/compare
router.get('/h2h', playerController.getH2H);
router.post('/alias', playerController.addAlias);
router.post('/merge', playerController.mergePlayers);

// DYNAMIC ROUTES LAST
router.get('/:playerId/ranking-history', playerController.getRankingHistory);
router.get('/:playerName/profile', playerController.getProfile);
router.get('/:playerName/inspector', playerController.getInspector);
router.get('/:name/stats', playerController.getStats);
router.get('/:name/matches', playerController.getMatches);
router.get('/:playerId', playerController.getById);

module.exports = router;
