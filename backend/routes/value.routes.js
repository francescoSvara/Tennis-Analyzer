/**
 * Value Routes
 * 
 * Endpoints per interpretazione valori tennis:
 * - POST /interpret-value - Interpreta singolo game value
 * - POST /analyze-power-rankings - Analizza array power rankings
 * - GET /value-thresholds - Soglie di default
 * - GET /value-zone/:value - Zona di un valore
 * 
 * @see docs/filosofie/FILOSOFIA_CALCOLI.md
 */

const express = require('express');
const router = express.Router();
const valueController = require('../controllers/value.controller');

// Interpretation
router.post('/interpret-value', valueController.interpret);
router.post('/analyze-power-rankings', valueController.analyzePowerRankings);

// Thresholds & Zones
router.get('/value-thresholds', valueController.getThresholds);
router.get('/value-zone/:value', valueController.getZone);

module.exports = router;
