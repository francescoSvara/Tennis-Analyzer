/**
 * Admin Routes
 *
 * Endpoints per operazioni amministrative:
 * - GET /queue/stats - Statistiche queue
 * - POST /queue/enqueue - Enqueue manuale task
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Queue management
router.get('/queue/stats', adminController.getQueueStats);
router.post('/queue/enqueue', adminController.enqueueTask);

module.exports = router;
