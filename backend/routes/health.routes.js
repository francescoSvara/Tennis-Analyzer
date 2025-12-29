/**
 * Health & Root Routes
 *
 * Endpoints:
 * - GET / - Root info
 * - GET /health - Health check
 *
 * @see docs/filosofie/guida refactor server.js
 */

const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// Root endpoint
router.get('/', healthController.root);

// Health check
router.get('/health', healthController.check);

module.exports = router;
