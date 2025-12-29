/**
 * Player Routes
 *
 * Endpoints per giocatori e statistiche:
 * - GET /player/:name/stats - Stats complete giocatore
 * - GET /player/search - Ricerca autocomplete
 * - GET /player/h2h - Head to Head
 * - GET /player/:name/matches - Lista match giocatore
 *
 * NOTE: /match/strategy-context/:home/:away è in match.routes.js
 *
 * @see docs/filosofie/FILOSOFIA_STATS.md
 */

const express = require('express');
const router = express.Router();
const playerController = require('../controllers/player.controller');

// STATIC ROUTES FIRST
router.get('/search', playerController.search);
router.get('/h2h', playerController.getH2H);

// DYNAMIC ROUTES LAST
router.get('/:name/stats', playerController.getStats);
router.get('/:name/matches', playerController.getMatches);

module.exports = router;
