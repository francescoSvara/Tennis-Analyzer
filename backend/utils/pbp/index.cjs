/**
 * PBP Module - Canonical Entrypoint
 * 
 * REPO INSPECTION RESULTS (STEP 0):
 * 
 * Q1) Which extractor is used in production?
 *     ANSWER: pbpExtractor.cjs is the production extractor, used by:
 *     - matchEnrichmentService.js (line 24)
 *     - insert-pbp-correct.js (line 19)
 *     - pbpAntiRegression.cjs (line 24)
 *     Legacy pbpExtractor.js exists only in Tennis-Scraper-Local subfolder.
 * 
 * Q2) Do we store raw HTML?
 *     ANSWER: NO - only normalized PBP is stored in point_by_point table.
 *     matchEnrichmentService.js inserts points directly, no raw HTML storage.
 * 
 * Q3) Winner from CSS?
 *     ANSWER: YES - pbpExtractor.cjs uses CSS classes (lines 678-686):
 *     - row1Color.includes('lv1') || row1Color.includes('status-val') → row1 won
 *     - row2Color.includes('lv1') || row2Color.includes('status-val') → row2 won
 * 
 * This module provides:
 * - extractPbpFromSofaScoreHtml(): Main extraction function with validation & quality
 * - Uses pbpExtractor.cjs as canonical extractor
 * - Adds validation, quality flags, and metadata to output
 * 
 * @module pbp
 * @see docs/filosofie/FILOSOFIA_PBP_EXTRACTION_PSEUDOCODE.md
 */

'use strict';

const { extractPbp, formatPointsForDb } = require('../pbpExtractor.cjs');
const { validatePbp } = require('./validatePbp.cjs');
const { computeQualityFlags } = require('./qualityFlags.cjs');

/**
 * Extractor version for tracking
 */
const EXTRACTOR_VERSION = '2.0.0';

/**
 * Main extraction function with validation and quality flags
 * 
 * @param {string} html - SofaScore PBP HTML
 * @param {Object} options - Extraction options
 * @param {string} options.homeSlug - Home player slug (optional)
 * @param {string} options.awaySlug - Away player slug (optional)
 * @param {string} options.sourceUrl - Source URL for metadata (optional)
 * @param {boolean} options.skipValidation - Skip validation step (default: false)
 * @returns {{ok: boolean, data: Object, validation: Object, quality: Object, meta: Object}}
 */
function extractPbpFromSofaScoreHtml(html, options = {}) {
  const startTime = Date.now();
  const meta = {
    sourceUrl: options.sourceUrl || null,
    scrapedAt: new Date().toISOString(),
    extractorVersion: EXTRACTOR_VERSION,
    usedExtractor: 'v2', // Canonical extractor
    extractionTimeMs: 0
  };

  // Validate input
  if (!html || typeof html !== 'string') {
    return {
      ok: false,
      data: null,
      validation: { ok: false, errors: [{ code: 'NO_HTML', message: 'No HTML provided' }], warnings: [] },
      quality: computeQualityFlags(null),
      meta
    };
  }

  // Extract using canonical extractor
  let extracted;
  try {
    extracted = extractPbp(html, {
      homeSlug: options.homeSlug,
      awaySlug: options.awaySlug
    });
  } catch (error) {
    return {
      ok: false,
      data: null,
      validation: { 
        ok: false, 
        errors: [{ code: 'EXTRACTION_ERROR', message: error.message }], 
        warnings: [] 
      },
      quality: computeQualityFlags(null),
      meta: { ...meta, error: error.message }
    };
  }

  // Check extraction success
  if (!extracted || !extracted.ok) {
    return {
      ok: false,
      data: extracted,
      validation: { 
        ok: false, 
        errors: [{ code: 'EXTRACTION_FAILED', message: extracted?.error || 'Unknown error' }], 
        warnings: [] 
      },
      quality: computeQualityFlags(null),
      meta
    };
  }

  // Run validation unless skipped
  let validation = { ok: true, errors: [], warnings: [] };
  if (!options.skipValidation) {
    validation = validatePbp(extracted);
  }

  // Compute quality flags
  const quality = computeQualityFlags(extracted, { usedExtractor: 'v2' });

  meta.extractionTimeMs = Date.now() - startTime;

  return {
    ok: true,
    data: extracted,
    validation,
    quality,
    meta
  };
}

/**
 * Format extracted data for database insertion
 * Wrapper around pbpExtractor's formatPointsForDb
 * 
 * @param {Object} extractedData - Output from extractPbpFromSofaScoreHtml
 * @param {number} matchId - Match ID for DB
 * @returns {Array} Points formatted for DB insertion
 */
function formatForDatabase(extractedData, matchId) {
  if (!extractedData || !extractedData.data) {
    return [];
  }

  // Use the extracted points directly
  const data = extractedData.data;
  const points = data.points || [];

  return points.map((p, idx) => ({
    match_id: matchId,
    set_number: p.set,
    game_number: p.game,
    point_number: idx + 1,
    home_score: p.homeScore,
    away_score: p.awayScore,
    serving: p.server === 'home' ? 1 : 2,
    scoring: p.pointWinner === 'home' ? 1 : 2,
    is_break_point: p.isBreakPoint || false,
    is_set_point: p.isSetPoint || false,
    is_match_point: p.isMatchPoint || false,
    // Extended fields from meta
    extractor_version: extractedData.meta?.extractorVersion,
    quality_score: extractedData.quality?.qualityScore0to100
  }));
}

/**
 * Get extractor info
 * @returns {Object}
 */
function getExtractorInfo() {
  return {
    version: EXTRACTOR_VERSION,
    canonical: 'pbpExtractor.cjs',
    features: [
      'CSS-based winner detection',
      'Service alternation with tiebreak rotation',
      'Break detection from DOM',
      'Validation invariants',
      'Quality scoring'
    ]
  };
}

module.exports = {
  // Main functions
  extractPbpFromSofaScoreHtml,
  formatForDatabase,
  getExtractorInfo,
  
  // Re-export from submodules for convenience
  validatePbp: require('./validatePbp.cjs').validatePbp,
  computeQualityFlags: require('./qualityFlags.cjs').computeQualityFlags,
  
  // Re-export legacy-compatible function
  extractPbp,
  formatPointsForDb,
  
  // Version
  EXTRACTOR_VERSION
};
