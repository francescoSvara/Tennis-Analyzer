/**
 * 📊 VOLATILITY FEATURE
 *
 * Calculates market volatility (0-100) from power rankings, score, and odds.
 * Measures match instability: momentum reversals, breaks, market re-pricing.
 *
 * @module features/volatility
 * @see docs/filosofie/FILOSOFIA_STATS_V3.md
 */

const { clamp01 } = require('../math');

// ============================================================================
// MAIN VOLATILITY CALCULATION
// ============================================================================

/**
 * Volatility 0-100
 *
 * What volatility means here (in-play trading):
 * - Not just "close match", but "unstable / swingy match":
 *   - frequent momentum reversals (PR swings)
 *   - multiple breaks (service instability)
 *   - market re-pricing (odds implied probability swings)
 *   - near-end pressure can amplify, but should not dominate alone
 *
 * Inputs:
 * - powerRankings: [{ value: number, breakOccurred?: boolean, ... }]
 * - score: { sets: [{home,away,tiebreak?}, ...] }
 * - odds: can be:
 *   a) array of snapshots [{ odds_player1, odds_player2, home, away, ... }]
 *   b) object with matchWinner { home, away, current, ... }
 *
 * Returns:
 * - number 0..100 (never null)
 */
function calculateVolatility({ powerRankings = [], score = {}, odds = [] }) {
  // Base neutral
  let base = 35;

  // If we have almost nothing, keep stable
  const hasPR = Array.isArray(powerRankings) && powerRankings.length >= 2;
  const hasScore = Array.isArray(score?.sets) && score.sets.length > 0;
  const hasOdds = hasOddsHistory(odds);

  // 1) PR swing intensity (0..1)
  const prSwing01 = hasPR ? computePRSweepIntensity(powerRankings) : 0;

  // 2) Break frequency in recent window (0..1)
  const break01 = hasPR ? computeRecentBreakRate(powerRankings) : 0;

  // 3) Market swing (odds implied probability movement) (0..1)
  const oddsSwing01 = hasOdds ? computeOddsSwingIntensity(odds) : 0;

  // 4) Dominance reversal count (PR sign flips) (0..1)
  const reversal01 = hasPR ? computeReversalIntensity(powerRankings) : 0;

  // 5) Score amplifier: end-of-set / tiebreak proximity (0..1)
  // Keep this as an amplifier, not a main driver.
  const scoreAmp01 = hasScore ? computeScorePressureAmplifier(score) : 0;

  // Weighted blend (tuned to be stable; odds and reversals are strong)
  const signal01 =
    prSwing01 * 0.30 +
    break01 * 0.25 +
    oddsSwing01 * 0.30 +
    reversal01 * 0.15;

  // Map to 0..100 around base
  let vol = base + signal01 * 60; // base 35 + up to ~95

  // Apply score amplifier lightly (+0..10)
  vol += scoreAmp01 * 10;

  return Math.round(Math.max(0, Math.min(100, vol)));
}

// ============================================================================
// VOLATILITY HELPERS
// ============================================================================

function hasOddsHistory(odds) {
  if (Array.isArray(odds) && odds.length >= 2) return true;
  if (odds && typeof odds === 'object' && odds.matchWinner) return true;
  return false;
}

/**
 * PR swing intensity:
 * average absolute delta in last N values, normalized.
 */
function computePRSweepIntensity(powerRankings) {
  const window = powerRankings.slice(-10);
  let sum = 0;
  for (let i = 1; i < window.length; i++) {
    const a = window[i - 1]?.value || 0;
    const b = window[i]?.value || 0;
    sum += Math.abs(b - a);
  }
  const avg = sum / Math.max(window.length - 1, 1);

  // Typical PR avg swing ~ 5..25; normalize with cap
  return clamp01(avg / 30);
}

/**
 * Break rate in last 10 PR points.
 * Assumes PR objects may include breakOccurred boolean.
 */
function computeRecentBreakRate(powerRankings) {
  const window = powerRankings.slice(-10);
  const breaks = window.filter((pr) => pr && pr.breakOccurred).length;

  // 0 breaks => 0, 3+ breaks => near 1
  return clamp01(breaks / 3);
}

/**
 * Dominance reversal intensity:
 * count sign flips in PR value (home->away dominance swings).
 */
function computeReversalIntensity(powerRankings) {
  const window = powerRankings.slice(-12);
  let flips = 0;
  let prevSign = 0;

  for (const pr of window) {
    const v = pr?.value || 0;
    const sign = v > 10 ? 1 : v < -10 ? -1 : 0; // ignore small noise around 0
    if (sign !== 0 && prevSign !== 0 && sign !== prevSign) flips++;
    if (sign !== 0) prevSign = sign;
  }

  // 0 flips => 0, 2+ flips => 1
  return clamp01(flips / 2);
}

/**
 * Odds swing intensity: compute average absolute movement in implied probability (home)
 * over last N ticks.
 *
 * Supports:
 * - odds array snapshots with either:
 *   - { odds_player1, odds_player2 } OR { home, away }
 * - odds object with matchWinner.* (best-effort)
 */
function computeOddsSwingIntensity(odds) {
  const probs = extractImpliedHomeProbSeries(odds);
  if (probs.length < 2) return 0;

  const window = probs.slice(-12);
  let sum = 0;
  for (let i = 1; i < window.length; i++) {
    sum += Math.abs(window[i] - window[i - 1]);
  }
  const avg = sum / Math.max(window.length - 1, 1);

  // avg move 0.00..0.08 typical; normalize with cap
  return clamp01(avg / 0.08);
}

/**
 * Extract a series of implied probabilities for "home" from odds structure.
 * We normalize for overround using the two-runner normalization:
 * p_home = (1/homeOdds) / ((1/homeOdds) + (1/awayOdds))
 */
function extractImpliedHomeProbSeries(odds) {
  const out = [];

  if (Array.isArray(odds)) {
    for (const snap of odds) {
      const homeOdds = snap?.odds_player1 ?? snap?.home;
      const awayOdds = snap?.odds_player2 ?? snap?.away;
      const p = impliedProbNormalized(homeOdds, awayOdds);
      if (p != null) out.push(p);
    }
    return out;
  }

  // object form: odds.matchWinner.home/away or current
  if (odds && typeof odds === 'object' && odds.matchWinner) {
    // best effort: accept either numbers or {value}
    const homeOdds = odds.matchWinner.home?.value ?? odds.matchWinner.home;
    const awayOdds = odds.matchWinner.away?.value ?? odds.matchWinner.away;
    const p = impliedProbNormalized(homeOdds, awayOdds);
    if (p != null) out.push(p);

    // if there is a "current" representing the favorite only, we can't build 2-runner normalization reliably
    // so we stop here (single point => no swing)
    return out;
  }

  return out;
}

function impliedProbNormalized(homeOdds, awayOdds) {
  if (typeof homeOdds !== 'number' || typeof awayOdds !== 'number') return null;
  if (homeOdds <= 1 || awayOdds <= 1) return null;

  const ih = 1 / homeOdds;
  const ia = 1 / awayOdds;
  const sum = ih + ia;
  if (sum <= 0) return null;
  return ih / sum;
}

/**
 * Score pressure amplifier (0..1):
 * - close to end of set (5-5, 6-5 etc) adds pressure
 * - tiebreak set adds more
 * Keep small because closeness != volatility.
 */
function computeScorePressureAmplifier(score) {
  const sets = score.sets || [];
  const currentSet = sets[sets.length - 1];
  if (!currentSet) return 0;

  const h = currentSet.home || 0;
  const a = currentSet.away || 0;

  // Tiebreak or 6-6 situation
  const isTB =
    currentSet.tiebreak ||
    (h === 6 && a === 6) ||
    (h === 7 && a === 6) ||
    (h === 6 && a === 7);

  if (isTB) return 1;

  // Near end of set: at least one at 5+
  if (Math.max(h, a) >= 5) {
    const diff = Math.abs(h - a);
    if (diff <= 1) return 0.7; // 5-5 / 6-5
    return 0.4;                // 6-4-ish
  }

  return 0;
}

module.exports = {
  calculateVolatility,
  // Helpers exposed for testing
  hasOddsHistory,
  computePRSweepIntensity,
  computeRecentBreakRate,
  computeReversalIntensity,
  computeOddsSwingIntensity,
  extractImpliedHomeProbSeries,
  impliedProbNormalized,
  computeScorePressureAmplifier,
};
