/**
 * Tracking Routes
 * 
 * Endpoints per live tracking:
 * - POST /track/:eventId - Aggiungi a tracking
 * - DELETE /track/:eventId - Rimuovi da tracking  
 * - GET /tracked - Lista tracked matches
 * - POST /track/:eventId/priority - Cambia priorità
 * - POST /track/:eventId/resume - Riprendi tracking
 * - GET /tracking/stats - Statistiche tracking
 * - POST /reconcile - Riconciliazione manuale
 * - GET /live/discover - Scopri match live
 * - GET /live/status - Status sistema live
 * - GET /live/stats - Stats WebSocket
 * - POST /scheduler/start - Avvia scheduler
 * - POST /scheduler/stop - Ferma scheduler
 * 
 * @see docs/filosofie/FILOSOFIA_LIVE_TRACKING.md
 */

const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/tracking.controller');

// Track/Untrack
router.post('/:eventId', trackingController.track);
router.delete('/:eventId', trackingController.untrack);

// List tracked
router.get('/', trackingController.listTracked);

// Priority & Resume
router.post('/:eventId/priority', trackingController.setPriority);
router.post('/:eventId/resume', trackingController.resume);

// Stats
router.get('/stats', trackingController.getStats);

// Reconciliation
router.post('/reconcile', trackingController.reconcile);

// Live discovery
router.get('/live/discover', trackingController.discover);
router.get('/live/status', trackingController.getStatus);
router.get('/live/stats', trackingController.getLiveStats);

// Scheduler
router.post('/scheduler/start', trackingController.startScheduler);
router.post('/scheduler/stop', trackingController.stopScheduler);

module.exports = router;
