/**
 * 📊 BREAK PROBABILITY FEATURE (MARKOV MODEL)
 *
 * Calculates probability of break in current game using Markov chain model.
 * Uses serve point probabilities and game state.
 *
 * @module features/breakProbability
 * @see docs/filosofie/FILOSOFIA_STATS.md
 */

const { clamp01, clampTo0_100 } = require('../math');

// ============================================================================
// MEMOIZATION CACHE
// ============================================================================

/**
 * Memoization cache for holdProbabilityFromState.
 * Persists across calls within the module.
 */
const __holdMemo = new Map();

// ============================================================================
// MAIN BREAK PROBABILITY CALCULATION
// ============================================================================

/**
 * Calculate probability of break this game (MARKOV MODEL)
 *
 * DEEP-009 (FILOSOFIA): MAI null, sempre fallback calcolato
 *
 * Key idea:
 * - Estimate p = P(server wins a point on serve)
 * - Compute holdProb from current point state using Markov game model
 * - breakProb = 1 - holdProb
 *
 * @param {Object} params
 * @param {Object} params.statistics - Match statistics
 * @param {string} params.server - Who is serving ('home' | 'away')
 * @param {string} params.gameScore - Current game score (e.g., "30-40")
 * @param {Array} params.powerRankings - Momentum history
 * @param {boolean} params.requireRealData - DEPRECATED: sempre restituisce valori
 * @returns {number} Break probability 0-100 (sempre un valore)
 */
function calculateBreakProbability({
  statistics = {},
  server = 'home',
  gameScore = null,
  powerRankings = [],
  requireRealData = false,
}) {
  const DEFAULT_BREAK_PROB = 25; // Average break probability in tennis

  // 0) Validate: check if we have real statistics
  const hasStats =
    statistics.home &&
    statistics.away &&
    (statistics.home.firstServePointsWonPct !== undefined ||
      statistics.away.firstServePointsWonPct !== undefined);

  // DEEP-009: Sempre restituisci un valore, non null
  if (!hasStats) {
    return DEFAULT_BREAK_PROB;
  }

  const serverStats = server === 'home' ? statistics.home : statistics.away;
  const returnerStats = server === 'home' ? statistics.away : statistics.home;

  // DEEP-009: Sempre restituisci un valore, non null
  if (!serverStats || !returnerStats) {
    return DEFAULT_BREAK_PROB;
  }

  // 1) Estimate pServePoint from server statistics
  const pServe = estimateServePointWinProb(serverStats);

  // 2) Adjust pServe slightly by momentum (small effect, max ±2-3%)
  const pAdj = adjustByMomentum(pServe, server, powerRankings);

  // 3) Parse game score to Markov state (s, r)
  const state = parseGameScoreToState(gameScore);

  let breakProb;

  if (!state) {
    // No valid game score info -> use coarse proxy based on pServe
    // Lower pServe = higher break probability
    breakProb = (1 - pAdj) * 0.6; // Scale to reasonable range
  } else {
    // 4) Calculate hold probability from current state via Markov model
    const holdProb = holdProbabilityFromState(state.s, state.r, pAdj);

    // 5) Break probability = 1 - hold probability
    breakProb = 1 - holdProb;
  }

  // 6) Optional: DF penalty (tiny, avoid double counting)
  const finalBreakProb = adjustByDoubleFaults(breakProb, serverStats);

  return clampTo0_100(finalBreakProb * 100);
}

// ============================================================================
// MARKOV MODEL HELPERS
// ============================================================================

/**
 * Estimate P(server wins a point on serve) from statistics
 *
 * Uses first/second serve point win percentages weighted by first serve in %.
 * Tennis serve point win rarely falls outside 0.35..0.85 in live matches.
 *
 * @param {Object} serverStats - Server's statistics
 * @returns {number} Probability 0-1
 */
function estimateServePointWinProb(serverStats) {
  const p1 = clamp01((parseFloat(serverStats.firstServePointsWonPct) || 60) / 100);
  const p2 = clamp01((parseFloat(serverStats.secondServePointsWonPct) || 40) / 100);

  // If firstServeInPct available use it, otherwise assume ATP average ~0.62
  const firstIn =
    serverStats.firstServeInPct != null
      ? clamp01(parseFloat(serverStats.firstServeInPct) / 100)
      : 0.62;

  const p = firstIn * p1 + (1 - firstIn) * p2;

  // Hard safety bounds: tennis serve point win rarely outside 0.35..0.85 live
  return Math.max(0.35, Math.min(0.85, p));
}

/**
 * Adjust pServe by momentum (small effect, max ±2-3%)
 *
 * PowerRankings: PR>0 means home dominates, PR<0 means away dominates.
 * If momentum is AGAINST the server, reduce pServe (raise break probability).
 *
 * @param {number} pServe - Base serve point probability
 * @param {string} server - 'home' | 'away'
 * @param {Array} powerRankings - Momentum history
 * @returns {number} Adjusted pServe
 */
function adjustByMomentum(pServe, server, powerRankings) {
  if (!powerRankings || powerRankings.length === 0) return pServe;

  const recent = powerRankings.slice(-5);
  const avgPR = recent.reduce((sum, pr) => sum + (pr.value || 0), 0) / recent.length;

  // Normalize PR roughly to [-1, +1]
  const m = Math.max(-1, Math.min(1, avgPR / 60));

  // If server is home and m negative -> momentum against server
  // If server is away and m positive -> momentum against server
  const againstServer = (server === 'home' && m < 0) || (server === 'away' && m > 0);

  // Asymmetric: negative momentum hurts more than positive helps
  const delta = againstServer ? -Math.abs(m) * 0.02 : +Math.abs(m) * 0.005;
  return clamp01(pServe + delta);
}

/**
 * Optional tiny boost to breakProb if double faults are high
 *
 * @param {number} breakProb - Current break probability (0-1)
 * @param {Object} serverStats - Server's statistics
 * @returns {number} Adjusted break probability (0-1)
 */
function adjustByDoubleFaults(breakProb, serverStats) {
  const df = parseInt(serverStats.doubleFaults) || 0;
  if (df <= 2) return breakProb;

  const bonus = Math.min(0.04, (df - 2) * 0.01); // max +4%
  return clamp01(breakProb + bonus);
}

/**
 * Convert game score string to Markov state (serverPoints, returnerPoints)
 *
 * Convention: state.s = points for SERVER, state.r = points for RETURNER
 * Points: 0=0, 1=15, 2=30, 3=40, 4=Advantage
 *
 * @param {string} gameScore - e.g., "30-40", "15-0", "A-40", "40-A"
 * @returns {Object|null} { s, r } or null if invalid
 */
function parseGameScoreToState(gameScore) {
  if (!gameScore || typeof gameScore !== 'string' || !gameScore.includes('-')) return null;

  const [left, right] = gameScore.split('-').map((x) => x.trim().toUpperCase());

  const toN = (p) => {
    if (p === 'A' || p === 'AD') return 4;
    if (p === '0') return 0;
    if (p === '15') return 1;
    if (p === '30') return 2;
    if (p === '40') return 3;
    return null;
  };

  const s = toN(left);
  const r = toN(right);
  if (s == null || r == null) return null;
  return { s, r };
}

/**
 * Markov model for tennis game: P(server holds) from state (s,r) given p
 *
 * Terminal conditions:
 * - Server wins if s>=4 and s-r>=2
 * - Returner wins if r>=4 and r-s>=2
 *
 * Special handling for deuce states:
 * - At deuce (3,3), use analytic formula: p^2 / (p^2 + (1-p)^2)
 * - Normalize advantage states to (4,3) or (3,4)
 *
 * Memoized by (s,r,pBucket) to avoid redundant computation.
 *
 * @param {number} s - Server points (0,1,2,3,4+)
 * @param {number} r - Returner points (0,1,2,3,4+)
 * @param {number} p - P(server wins a point)
 * @returns {number} Probability server holds the game (0-1)
 */
function holdProbabilityFromState(s, r, p) {
  // Bucket p to 2 decimals for memoization key
  const pb = Math.round(p * 100);
  const key = `${s}|${r}|${pb}`;
  if (__holdMemo.has(key)) return __holdMemo.get(key);

  // Terminal: server wins (game over)
  if (s >= 4 && s - r >= 2) {
    __holdMemo.set(key, 1);
    return 1;
  }
  // Terminal: returner wins (break)
  if (r >= 4 && r - s >= 2) {
    __holdMemo.set(key, 0);
    return 0;
  }

  // Deuce state (3,3): use analytic formula to avoid infinite recursion
  // P(hold from deuce) = p^2 / (p^2 + (1-p)^2)
  if (s === 3 && r === 3) {
    const p2 = p * p;
    const q2 = (1 - p) * (1 - p);
    const res = p2 / (p2 + q2);
    __holdMemo.set(key, res);
    return res;
  }

  // Advantage server (4,3): one point from win
  if (s === 4 && r === 3) {
    // Win next point = hold, lose = back to deuce (3,3)
    const deuceProb = holdProbabilityFromState(3, 3, p);
    const res = p * 1 + (1 - p) * deuceProb;
    __holdMemo.set(key, res);
    return res;
  }

  // Advantage returner (3,4): one point from break
  if (s === 3 && r === 4) {
    // Win next point = back to deuce, lose = break
    const deuceProb = holdProbabilityFromState(3, 3, p);
    const res = p * deuceProb + (1 - p) * 0;
    __holdMemo.set(key, res);
    return res;
  }

  // Normal recursive case
  const res = p * holdProbabilityFromState(s + 1, r, p) + (1 - p) * holdProbabilityFromState(s, r + 1, p);
  __holdMemo.set(key, res);
  return res;
}

/**
 * Parse game score string into points (legacy helper, kept for compatibility)
 * @param {string} scoreStr - e.g., "30-40", "15-0", "A-40"
 * @returns {[number, number]} [serverPoints, returnerPoints]
 */
function parseGameScore(scoreStr) {
  if (!scoreStr || typeof scoreStr !== 'string') return [0, 0];

  const parts = scoreStr.split('-');
  if (parts.length !== 2) return [0, 0];

  const parsePoint = (p) => {
    p = p.trim().toUpperCase();
    if (p === 'A') return 50; // Advantage
    if (p === '40') return 40;
    if (p === '30') return 30;
    if (p === '15') return 15;
    return 0;
  };

  return [parsePoint(parts[0]), parsePoint(parts[1])];
}

module.exports = {
  calculateBreakProbability,
  // Helpers exposed for testing
  estimateServePointWinProb,
  holdProbabilityFromState,
  parseGameScoreToState,
  parseGameScore,
  adjustByMomentum,
  adjustByDoubleFaults,
  // Expose memo for testing/clearing if needed
  __holdMemo,
};
