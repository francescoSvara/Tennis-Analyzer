/**
 * 📊 SERVE/RETURN DOMINANCE FEATURE
 *
 * Calculates serve and return dominance from match statistics.
 * Uses coherent tennis probability model.
 *
 * @module features/serveDominance
 * @see docs/filosofie/FILOSOFIA_STATS.md
 */

const { clamp01, clampTo0_100 } = require('../math');

// ============================================================================
// MAIN SERVE/RETURN DOMINANCE CALCULATION
// ============================================================================

/**
 * Calculate serving/returning dominance from statistics
 *
 * Output:
 * - serveDominance: 0-100 (50 neutral). Higher = server's serve is strong / holding likely.
 * - returnDominance: 0-100 (50 neutral). Higher = returner is strong / break threat higher.
 *
 * Principles:
 * - Prefer point-level probabilities (pServePoint, pReturnPoint) over raw % fields.
 * - Keep Aces/DF effect small (they are already partially reflected in points won).
 * - If receiverPointsWonPct missing, infer return strength from opponent serve weakness.
 *
 * DEEP-009: MAI null, sempre fallback calcolato (use isEstimated flag).
 *
 * @param {Object} statistics - Match statistics (home/away)
 * @param {string} servingPlayer - 'home' | 'away'
 * @param {boolean} requireRealData - deprecated
 * @returns {{serveDominance: number, returnDominance: number, isEstimated: boolean}}
 */
function calculateServeDominance(statistics = {}, servingPlayer = 'home', requireRealData = false) {
  const defaults = { serveDominance: 50, returnDominance: 50, isEstimated: true };

  const hasHomeStats =
    statistics.home &&
    Object.keys(statistics.home).length > 0 &&
    (statistics.home.firstServePointsWonPct !== undefined ||
      statistics.home.secondServePointsWonPct !== undefined);
  const hasAwayStats =
    statistics.away &&
    Object.keys(statistics.away).length > 0 &&
    (statistics.away.firstServePointsWonPct !== undefined ||
      statistics.away.secondServePointsWonPct !== undefined);

  if (!hasHomeStats && !hasAwayStats) return defaults;

  const server = servingPlayer === 'home' ? statistics.home : statistics.away;
  const returner = servingPlayer === 'home' ? statistics.away : statistics.home;
  if (!server || !returner) return defaults;

  // ---- 1) Estimate server point win probability ----
  const pServe = estimateServePointWinProbFromPct(server);

  // Small ace/DF adjustments (tiny to avoid double counting)
  const pServeAdj = adjustServeProbByAcesDF(pServe, server);

  // ---- 2) Estimate returner point win probability ----
  // Prefer receiverPointsWonPct if available, else infer from opponent serve weakness.
  const pReturn = estimateReturnPointWinProb(returner, server);

  // ---- 3) Map to 0-100 dominance scales ----
  // Baselines (tennis-ish): pServe ~0.62 neutral, pReturn ~0.38 neutral.
  // Spread: +-0.12 is already a big swing live.
  const serveDom = probToDominance(pServeAdj, 0.62, 0.12);
  const returnDom = probToDominance(pReturn, 0.38, 0.12);

  return {
    serveDominance: serveDom,
    returnDominance: returnDom,
    isEstimated: false,
  };
}

// ============================================================================
// SERVE/RETURN DOMINANCE HELPERS
// ============================================================================

/**
 * Estimate pServePoint from available percent fields (schema currently has won%).
 * If firstServeInPct exists in future feeds, you can plug it here; for now assume 0.62.
 */
function estimateServePointWinProbFromPct(playerStats) {
  const p1 = clamp01((parseFloat(playerStats.firstServePointsWonPct) || 60) / 100);
  const p2 = clamp01((parseFloat(playerStats.secondServePointsWonPct) || 40) / 100);

  const firstIn =
    playerStats.firstServeInPct !== undefined && playerStats.firstServeInPct !== null
      ? clamp01(parseFloat(playerStats.firstServeInPct) / 100)
      : 0.62;

  const p = firstIn * p1 + (1 - firstIn) * p2;

  // Safety bounds
  return Math.max(0.35, Math.min(0.85, p));
}

/**
 * Tiny adjustment by aces/DF: keep small (max few points of probability).
 */
function adjustServeProbByAcesDF(pServe, stats) {
  const aces = parseInt(stats.aces) || 0;
  const dfs = parseInt(stats.doubleFaults) || 0;

  // Both adjustments are capped to avoid destabilizing.
  const aceBoost = Math.min(0.015, aces * 0.002); // max +1.5%
  const dfPenalty = Math.min(0.02, dfs * 0.003);  // max -2.0%

  return clamp01(pServe + aceBoost - dfPenalty);
}

/**
 * Estimate pReturnPoint:
 * - Prefer receiverPointsWonPct if present (already 0-100)
 * - Else: infer as (1 - opponent pServePoint), blended with BP conversion (small weight)
 */
function estimateReturnPointWinProb(returnerStats, serverStats) {
  const rec = returnerStats.receiverPointsWonPct;
  if (rec !== undefined && rec !== null && !Number.isNaN(parseFloat(rec))) {
    const p = clamp01(parseFloat(rec) / 100);
    // Return points won is typically 0.25..0.55
    return Math.max(0.20, Math.min(0.60, p));
  }

  const pOppServe = estimateServePointWinProbFromPct(serverStats);
  let p = clamp01(1 - pOppServe);

  // BP conversion (very noisy) -> tiny nudge only
  const bpWon = parseInt(returnerStats.breakPointsWon) || 0;
  const bpTot = parseInt(returnerStats.breakPointsTotal) || 0;
  if (bpTot > 0) {
    const bpPct = clamp01(bpWon / bpTot); // 0..1
    // baseline conversion ~0.40. Nudge max +-2%
    p = clamp01(p + (bpPct - 0.40) * 0.02);
  }

  return p;
}

/**
 * Convert probability into dominance 0..100 centered on baseline.
 * spread = how much probability delta corresponds to a big dominance swing.
 */
function probToDominance(p, baseline, spread) {
  const z = (p - baseline) / Math.max(spread, 0.001); // roughly -1..+1 typical
  // Map: z=-1 => ~35, z=0 => 50, z=+1 => ~65 (then clamp)
  return clampTo0_100(50 + z * 15);
}

module.exports = {
  calculateServeDominance,
  // Helpers exposed for testing
  estimateServePointWinProbFromPct,
  adjustServeProbByAcesDF,
  estimateReturnPointWinProb,
  probToDominance,
};
