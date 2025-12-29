/**
 * Health Controller
 *
 * Gestisce endpoint di health check e root info.
 * Zero logica di dominio - solo req → service → res
 *
 * @see docs/filosofie/guida refactor server.js
 */

// Lazy load per evitare circular dependencies
let supabaseClient = null;
let matchRepository = null;

try {
  supabaseClient = require('../db/supabase');
  matchRepository = require('../db/matchRepository');
} catch (e) {
  console.warn('⚠️ Database modules not available in health controller');
}

/**
 * GET / - Root endpoint
 */
exports.root = (req, res) => {
  res.json({
    message: 'Tennis Analyzer Backend',
    version: '0.1.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
};

/**
 * GET /health - Health check
 */
exports.check = (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    supabase: !!supabaseClient?.supabase,
    database: !!matchRepository,
  });
};
