/**
 * Routes Index - Central router mount point
 *
 * FILOSOFIA: server.js deve contenere SOLO bootstrap + mount routes
 * Questo file centralizza l'import di tutte le route.
 *
 * @see docs/filosofie/guida refactor server.js
 */

const express = require('express');
const router = express.Router();

// Import route modules
const healthRoutes = require('./health.routes');
const dbRoutes = require('./db.routes');
const matchRoutes = require('./match.routes');
const trackingRoutes = require('./tracking.routes');
const playerRoutes = require('./player.routes');
const eventRoutes = require('./event.routes');
const valueRoutes = require('./value.routes');
const scrapesRoutes = require('./scrapes.routes');
const statsRoutes = require('./stats.routes');
const adminRoutes = require('./admin.routes');
const scrapesController = require('../controllers/scrapes.controller');

// Mount routes
router.use('/', healthRoutes);
router.use('/db', dbRoutes);
router.use('/match', matchRoutes);
router.use('/matches', matchRoutes); // Alias per retrocompatibilità
router.use('/track', trackingRoutes);
router.use('/tracked', trackingRoutes);
router.use('/tracking', trackingRoutes);
router.use('/player', playerRoutes);
router.use('/players', playerRoutes); // Alias per /players/search, /players/compare
router.use('/event', eventRoutes);
router.use('/', valueRoutes); // /interpret-value, /analyze-power-rankings, etc.
router.use('/scrapes', scrapesRoutes);
router.use('/stats', statsRoutes); // /stats/db, /stats/health
router.use('/admin', adminRoutes); // /admin/queue/stats, /admin/queue/enqueue

// Legacy endpoint aliases
const playerController = require('../controllers/player.controller');
router.get('/search/players', playerController.searchPlayers); // /api/search/players

// Root-level scraper endpoints (not under /scrapes)
router.post('/scrape', scrapesController.scrape);
router.get('/status/:id', scrapesController.getStatus);
router.get('/data/:id', scrapesController.getData);
router.post('/lookup-name', scrapesController.lookupName);

// Legacy alias: /db-stats -> /stats/db
router.get('/db-stats', require('../controllers/stats.controller').getDbStats);

module.exports = router;
