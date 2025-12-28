/**
 * Scrapes Routes
 * 
 * Endpoints per gestione scrapes salvati:
 * - GET /scrapes - Lista scrapes salvati
 * - GET /scrapes/:id - Singolo scrape
 * 
 * NOTE: Some endpoints need to be at root level - mounted via index.js:
 * - POST /scrape - Avvia scrape (DISABILITATO in produzione) 
 * - GET /status/:id - Status scrape
 * - GET /data/:id - Dati scrape
 * - POST /lookup-name - Quick lookup URL
 * 
 * @see docs/filosofie/FILOSOFIA_DB.md
 */

const express = require('express');
const router = express.Router();
const scrapesController = require('../controllers/scrapes.controller');

// List & Get (mounted at /api/scrapes)
router.get('/', scrapesController.list);
router.get('/:id', scrapesController.get);

module.exports = router;
