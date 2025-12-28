/**
 * Stats Routes
 * 
 * Endpoints per statistiche database e metriche:
 * - GET /stats/db - Statistiche complete del database
 * - GET /stats/health - Health check per il database
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md
 */

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

// Database statistics
router.get('/db', statsController.getDbStats);

// Health check
router.get('/health', statsController.getHealth);

module.exports = router;
