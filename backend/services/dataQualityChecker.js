/**
 * 📊 DATA QUALITY CHECKER
 * 
 * Servizio di validazione qualità per MatchBundle.
 * Produce metriche deterministiche, issues con codici stabili,
 * e uno score complessivo 0-100.
 * 
 * Output standard: { status, score, metrics, issues }
 * 
 * Ref: docs/filosofie/FILOSOFIA_OBSERVABILITY.md
 * 
 * @module dataQualityChecker
 */

// ============================================================================
// VERSION
// ============================================================================
const DATA_QUALITY_CHECKER_VERSION = 'v1.0.0';

// ============================================================================
// ISSUE CODES (stabili per audit)
// ============================================================================
const ISSUE_CODES = {
  // Critical (FAIL)
  MISSING_MATCH_ID: 'MISSING_MATCH_ID',
  MISSING_PLAYER_ID: 'MISSING_PLAYER_ID',
  MISSING_STATUS: 'MISSING_STATUS',
  ODDS_INVALID: 'ODDS_INVALID',
  
  // Warning
  ODDS_STALE: 'ODDS_STALE',
  LIVE_STALE: 'LIVE_STALE',
  STATS_PARTIAL: 'STATS_PARTIAL',
  HIGH_MISSING_RATIO: 'HIGH_MISSING_RATIO',
  
  // Info
  NO_FUTURE_DATA: 'NO_FUTURE_DATA',
  FEATURES_ESTIMATED: 'FEATURES_ESTIMATED',
  LOW_DATA_COMPLETENESS: 'LOW_DATA_COMPLETENESS'
};

const SEVERITY = {
  FAIL: 'FAIL',
  WARN: 'WARN',
  INFO: 'INFO'
};

// ============================================================================
// THRESHOLDS (configurable per environment)
// ============================================================================
const THRESHOLDS = {
  // Pre-match thresholds (in seconds)
  prematch: {
    odds_stale_warn: 15 * 60,   // 15 minuti
    odds_stale_fail: 60 * 60,   // 60 minuti
  },
  // Live match thresholds (in seconds)
  live: {
    live_stale_warn: 30,        // 30 secondi
    live_stale_fail: 120,       // 2 minuti
    odds_stale_warn: 60,        // 1 minuto
    odds_stale_fail: 300,       // 5 minuti
  },
  // Generic thresholds
  missing_ratio_warn: 0.15,     // 15% campi mancanti
  missing_ratio_fail: 0.40,     // 40% campi mancanti
  features_estimated_warn: 0.5, // 50% features stimate
};

// ============================================================================
// CRITICAL FIELDS (required for valid bundle)
// ============================================================================
const CRITICAL_FIELDS = [
  'matchId',
  'header.match.id',
  'header.match.status',
  'header.players.home.id',
  'header.players.away.id',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely get nested property from object
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => 
    current && current[key] !== undefined ? current[key] : undefined, obj);
}

/**
 * Check if value is valid (not null, undefined, empty string)
 */
function isValid(value) {
  return value !== null && value !== undefined && value !== '';
}

/**
 * Check if odds value is valid
 */
function isValidOdds(value) {
  if (typeof value !== 'number') return false;
  if (isNaN(value) || !isFinite(value)) return false;
  if (value <= 1.01) return false;
  return true;
}

/**
 * Parse ISO timestamp to Date
 */
function parseTimestamp(ts) {
  if (!ts) return null;
  const date = new Date(ts);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Calculate staleness in seconds
 */
function calculateStaleness(timestamp, now) {
  const ts = parseTimestamp(timestamp);
  if (!ts) return Infinity;
  return Math.max(0, (now - ts.getTime()) / 1000);
}

/**
 * Determine if match is live based on status
 */
function isLiveMatch(status) {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s === 'live' || s === 'inprogress' || s === 'in_progress' || 
         s === '1st set' || s === '2nd set' || s === '3rd set' ||
         s.includes('set') || s.includes('live');
}

/**
 * Count missing fields in object
 */
function countMissingFields(obj, fieldList) {
  let missing = 0;
  let total = 0;
  
  for (const field of fieldList) {
    total++;
    const value = getNestedValue(obj, field);
    if (!isValid(value)) {
      missing++;
    }
  }
  
  return { missing, total, ratio: total > 0 ? missing / total : 0 };
}

// ============================================================================
// MAIN QUALITY EVALUATION
// ============================================================================

/**
 * Evaluate bundle quality
 * 
 * @param {Object} bundle - MatchBundle to evaluate
 * @param {number} now - Current timestamp (ms), default Date.now()
 * @returns {Object} { status, score, metrics, issues }
 */
function evaluateBundleQuality(bundle, now = Date.now()) {
  const issues = [];
  let score = 100;
  
  // Determine if live match
  const matchStatus = bundle?.header?.match?.status;
  const isLive = isLiveMatch(matchStatus);
  const thresholds = isLive ? THRESHOLDS.live : THRESHOLDS.prematch;
  
  // =========================================================================
  // A) COMPLETENESS - Check critical fields
  // =========================================================================
  const missingCritical = [];
  
  for (const field of CRITICAL_FIELDS) {
    const value = getNestedValue(bundle, field);
    if (!isValid(value)) {
      missingCritical.push(field);
    }
  }
  
  if (missingCritical.length > 0) {
    // Check specific critical failures
    if (missingCritical.includes('matchId') || missingCritical.includes('header.match.id')) {
      issues.push({
        code: ISSUE_CODES.MISSING_MATCH_ID,
        severity: SEVERITY.FAIL,
        detail: 'Match ID is required'
      });
      score -= 50;
    }
    
    if (missingCritical.includes('header.players.home.id') || missingCritical.includes('header.players.away.id')) {
      issues.push({
        code: ISSUE_CODES.MISSING_PLAYER_ID,
        severity: SEVERITY.FAIL,
        detail: `Missing player IDs: ${missingCritical.filter(f => f.includes('player')).join(', ')}`
      });
      score -= 30;
    }
    
    if (missingCritical.includes('header.match.status')) {
      issues.push({
        code: ISSUE_CODES.MISSING_STATUS,
        severity: SEVERITY.FAIL,
        detail: 'Match status is required'
      });
      score -= 20;
    }
  }
  
  // Calculate overall missing ratio for non-critical fields
  const tabFields = [
    'tabs.overview', 'tabs.stats', 'tabs.odds', 'tabs.momentum',
    'tabs.pointByPoint', 'tabs.strategies', 'tabs.predictor'
  ];
  const { ratio: missingRatio } = countMissingFields(bundle, tabFields);
  
  if (missingRatio > THRESHOLDS.missing_ratio_fail) {
    issues.push({
      code: ISSUE_CODES.HIGH_MISSING_RATIO,
      severity: SEVERITY.FAIL,
      detail: `Missing ratio ${(missingRatio * 100).toFixed(1)}% exceeds threshold`
    });
    score -= 25;
  } else if (missingRatio > THRESHOLDS.missing_ratio_warn) {
    issues.push({
      code: ISSUE_CODES.HIGH_MISSING_RATIO,
      severity: SEVERITY.WARN,
      detail: `Missing ratio ${(missingRatio * 100).toFixed(1)}% is high`
    });
    score -= 10;
  }
  
  // =========================================================================
  // B) FRESHNESS / STALENESS
  // =========================================================================
  
  // Live staleness (from meta.as_of_time or bundle timestamp)
  const liveTimestamp = bundle?.meta?.as_of_time || bundle?.timestamp;
  const liveStaleness = calculateStaleness(liveTimestamp, now);
  
  // Odds staleness (from tabs.odds.matchWinner.event_time)
  const oddsTimestamp = bundle?.tabs?.odds?.matchWinner?.event_time || 
                        bundle?.meta?.as_of_time;
  const oddsStaleness = calculateStaleness(oddsTimestamp, now);
  
  // Check live staleness (only for live matches)
  if (isLive) {
    if (liveStaleness > thresholds.live_stale_fail) {
      issues.push({
        code: ISSUE_CODES.LIVE_STALE,
        severity: SEVERITY.FAIL,
        detail: `Live data stale by ${Math.round(liveStaleness)}s (threshold: ${thresholds.live_stale_fail}s)`
      });
      score -= 25;
    } else if (liveStaleness > thresholds.live_stale_warn) {
      issues.push({
        code: ISSUE_CODES.LIVE_STALE,
        severity: SEVERITY.WARN,
        detail: `Live data stale by ${Math.round(liveStaleness)}s`
      });
      score -= 10;
    }
  }
  
  // Check odds staleness
  if (oddsStaleness > (thresholds.odds_stale_fail || THRESHOLDS.prematch.odds_stale_fail)) {
    issues.push({
      code: ISSUE_CODES.ODDS_STALE,
      severity: SEVERITY.FAIL,
      detail: `Odds stale by ${Math.round(oddsStaleness)}s`
    });
    score -= 20;
  } else if (oddsStaleness > (thresholds.odds_stale_warn || THRESHOLDS.prematch.odds_stale_warn)) {
    issues.push({
      code: ISSUE_CODES.ODDS_STALE,
      severity: SEVERITY.WARN,
      detail: `Odds stale by ${Math.round(oddsStaleness)}s`
    });
    score -= 8;
  }
  
  // =========================================================================
  // C) CONSISTENCY - Validate odds
  // =========================================================================
  const homeOdds = bundle?.tabs?.odds?.matchWinner?.home?.value || 
                   bundle?.header?.odds?.home;
  const awayOdds = bundle?.tabs?.odds?.matchWinner?.away?.value || 
                   bundle?.header?.odds?.away;
  
  const oddsInvalid = [];
  if (homeOdds !== undefined && !isValidOdds(homeOdds)) {
    oddsInvalid.push(`home: ${homeOdds}`);
  }
  if (awayOdds !== undefined && !isValidOdds(awayOdds)) {
    oddsInvalid.push(`away: ${awayOdds}`);
  }
  
  if (oddsInvalid.length > 0) {
    issues.push({
      code: ISSUE_CODES.ODDS_INVALID,
      severity: SEVERITY.FAIL,
      detail: `Invalid odds values: ${oddsInvalid.join(', ')}`
    });
    score -= 25;
  }
  
  // =========================================================================
  // D) Check for future data (anti-leakage)
  // =========================================================================
  const asOfTime = parseTimestamp(bundle?.meta?.as_of_time);
  const eventTime = parseTimestamp(bundle?.tabs?.odds?.matchWinner?.event_time);
  
  if (asOfTime && eventTime && eventTime > asOfTime) {
    issues.push({
      code: ISSUE_CODES.NO_FUTURE_DATA,
      severity: SEVERITY.WARN,
      detail: 'Event time is after as_of_time (potential time leakage)'
    });
    score -= 15;
  }
  
  // =========================================================================
  // E) Stats completeness
  // =========================================================================
  const stats = bundle?.tabs?.stats;
  if (stats) {
    const hasServeStats = stats.serve?.home?.firstServe !== undefined;
    const hasPointsStats = stats.points?.home?.winners !== undefined;
    
    if (!hasServeStats && !hasPointsStats) {
      issues.push({
        code: ISSUE_CODES.STATS_PARTIAL,
        severity: SEVERITY.WARN,
        detail: 'Statistics data is incomplete'
      });
      score -= 5;
    }
  }
  
  // =========================================================================
  // F) Features estimation check
  // =========================================================================
  const features = bundle?.features;
  if (features) {
    const estimatedSources = ['estimated', 'score', 'odds'];
    let estimatedCount = 0;
    let totalFeatures = 0;
    
    const sourceFields = ['volatilitySource', 'pressureSource', 'dominanceSource', 
                          'serveDominanceSource', 'breakProbabilitySource', 'momentumSource'];
    
    for (const field of sourceFields) {
      if (features[field]) {
        totalFeatures++;
        if (estimatedSources.includes(features[field])) {
          estimatedCount++;
        }
      }
    }
    
    const estimatedRatio = totalFeatures > 0 ? estimatedCount / totalFeatures : 0;
    
    if (estimatedRatio > THRESHOLDS.features_estimated_warn) {
      issues.push({
        code: ISSUE_CODES.FEATURES_ESTIMATED,
        severity: SEVERITY.INFO,
        detail: `${Math.round(estimatedRatio * 100)}% of features are estimated`
      });
      score -= 3;
    }
  }
  
  // =========================================================================
  // G) Data quality from bundle
  // =========================================================================
  const bundleQuality = bundle?.dataQuality;
  if (typeof bundleQuality === 'number' && bundleQuality < 50) {
    issues.push({
      code: ISSUE_CODES.LOW_DATA_COMPLETENESS,
      severity: SEVERITY.INFO,
      detail: `Bundle data quality is ${bundleQuality}%`
    });
    score -= 5;
  }
  
  // =========================================================================
  // FINAL STATUS
  // =========================================================================
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  const hasFail = issues.some(i => i.severity === SEVERITY.FAIL);
  const hasWarn = issues.some(i => i.severity === SEVERITY.WARN);
  
  let status = 'OK';
  if (hasFail || score < 40) {
    status = 'FAIL';
  } else if (hasWarn || score < 70) {
    status = 'WARN';
  }
  
  return {
    status,
    score,
    metrics: {
      missing_ratio: Math.round(missingRatio * 100) / 100,
      live_staleness_sec: Math.round(liveStaleness),
      odds_staleness_sec: Math.round(oddsStaleness),
      is_live: isLive
    },
    issues,
    meta: {
      version: DATA_QUALITY_CHECKER_VERSION,
      evaluated_at: new Date(now).toISOString(),
      thresholds_used: isLive ? 'live' : 'prematch'
    }
  };
}

/**
 * Quick check if bundle passes minimum quality
 */
function passesMinimumQuality(bundle) {
  const result = evaluateBundleQuality(bundle);
  return result.status !== 'FAIL';
}

/**
 * Get quality summary for logging
 */
function getQualitySummary(bundle) {
  const result = evaluateBundleQuality(bundle);
  const issuesSummary = result.issues.map(i => i.code).join(', ') || 'none';
  return `[Quality: ${result.status} score=${result.score}] Issues: ${issuesSummary}`;
}

// ============================================================================
// ACCURACY & OUTLIER DETECTION (FILOSOFIA_OBSERVABILITY_DATAQUALITY: DIMENSION_Accuracy)
// ============================================================================

/**
 * Detect outliers in numeric data
 * 
 * FILOSOFIA_OBSERVABILITY: DIMENSION_Accuracy verification
 * 
 * @param {Array} values - Array of numeric values
 * @param {number} threshold - Z-score threshold (default 3)
 * @returns {Object} { outliers: Array, mean: number, std: number }
 */
function detectOutliers(values, threshold = 3) {
  if (!Array.isArray(values) || values.length < 3) {
    return { outliers: [], mean: null, std: null };
  }
  
  // Filter to only numbers
  const nums = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
  if (nums.length < 3) return { outliers: [], mean: null, std: null };
  
  // Calculate mean
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  
  // Calculate standard deviation
  const squaredDiffs = nums.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / nums.length;
  const std = Math.sqrt(variance);
  
  if (std === 0) return { outliers: [], mean, std: 0 };
  
  // Find outliers (values with z-score > threshold)
  const outliers = nums.filter(v => Math.abs((v - mean) / std) > threshold);
  
  return {
    outliers,
    mean: Math.round(mean * 100) / 100,
    std: Math.round(std * 100) / 100
  };
}

/**
 * Check data consistency
 * 
 * FILOSOFIA_OBSERVABILITY: verify internal consistency of bundle data
 * 
 * @param {Object} bundle - MatchBundle to check
 * @returns {Object} { consistent: boolean, issues: Array }
 */
function checkConsistency(bundle) {
  const issues = [];
  
  if (!bundle) return { consistent: false, issues: ['Bundle is null'] };
  
  // Check score consistency
  const header = bundle.header || bundle;
  const score = header?.match?.score || header?.score;
  
  if (score?.sets && Array.isArray(score.sets)) {
    for (let i = 0; i < score.sets.length; i++) {
      const set = score.sets[i];
      const home = set.home || 0;
      const away = set.away || 0;
      
      // Tennis set can't exceed reasonable limits
      if (home > 7 || away > 7) {
        // Could be valid in tiebreak, but check
        if (!(home === 7 && away >= 5) && !(away === 7 && home >= 5)) {
          issues.push(`Set ${i+1} has unlikely score: ${home}-${away}`);
        }
      }
      
      // Neither can be negative
      if (home < 0 || away < 0) {
        issues.push(`Set ${i+1} has negative score`);
      }
    }
  }
  
  // Check odds consistency
  const odds = header?.odds || bundle?.odds;
  if (odds?.matchWinner) {
    const homeOdds = odds.matchWinner.home?.value || odds.matchWinner.home;
    const awayOdds = odds.matchWinner.away?.value || odds.matchWinner.away;
    
    if (homeOdds && awayOdds) {
      // Both odds should sum to more than 100% implied prob (bookmaker margin)
      const totalImplied = (1/homeOdds) + (1/awayOdds);
      if (totalImplied < 0.95) {
        issues.push('Odds implied probability too low - data may be incorrect');
      }
      if (totalImplied > 1.20) {
        issues.push('Odds overround too high (>20%)');
      }
    }
  }
  
  // Check player consistency
  const homePlayer = header?.players?.home || bundle?.player1;
  const awayPlayer = header?.players?.away || bundle?.player2;
  
  if (homePlayer?.id && awayPlayer?.id && homePlayer.id === awayPlayer.id) {
    issues.push('Home and away player have same ID');
  }
  
  return {
    consistent: issues.length === 0,
    issues
  };
}

/**
 * Calculate data completeness percentage
 * 
 * @param {Object} bundle - MatchBundle
 * @returns {number} Completeness 0-100
 */
function calculateCompleteness(bundle) {
  if (!bundle) return 0;
  
  let present = 0;
  let total = 0;
  
  // Check key fields
  const fieldsToCheck = [
    'header.match.id',
    'header.match.status',
    'header.players.home.id',
    'header.players.away.id',
    'header.score',
    'header.odds',
    'tabs.stats',
    'tabs.momentum',
    'tabs.points'
  ];
  
  for (const field of fieldsToCheck) {
    total++;
    if (getNestedValue(bundle, field)) present++;
  }
  
  return Math.round((present / total) * 100);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Version
  DATA_QUALITY_CHECKER_VERSION,
  
  // Constants
  ISSUE_CODES,
  SEVERITY,
  THRESHOLDS,
  
  // Main functions
  evaluateBundleQuality,
  passesMinimumQuality,
  getQualitySummary,
  
  // FILOSOFIA_OBSERVABILITY: Accuracy/outlier functions
  detectOutliers,
  checkConsistency,
  calculateCompleteness,
  
  // Helpers (exported for testing)
  isValidOdds,
  isLiveMatch,
  calculateStaleness
};
