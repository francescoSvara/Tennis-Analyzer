/**
 * 📊 MOMENTUM FEATURE
 *
 * Calculates momentum indicators from power rankings history.
 * Uses EMA for trend detection and stable swing measurement.
 *
 * @module features/momentum
 * @see docs/filosofie/FILOSOFIA_STATS_V3.md
 */

const { clamp01 } = require('../math');

// ============================================================================
// MAIN MOMENTUM CALCULATION
// ============================================================================

/**
 * Momentum indicators derived from powerRankings history.
 *
 * powerRankings: [{ value: number, breakOccurred?: boolean, ... }]
 * Convention (existing code): PR > 0 => home momentum, PR < 0 => away momentum.
 *
 * Output (same shape as before, so StrategyEngine keeps working):
 * - trend: 'stable' | 'home_rising' | 'away_rising'
 * - recentSwing: 0..100 (stable-ish measure, not max spike)
 * - last5avg: average PR last 5
 * - breakCount: breaks in last 10 (if breakOccurred present)
 *
 * @param {Array} powerRankings - Power rankings history
 * @returns {Object} Momentum indicators
 */
function calculateRecentMomentum(powerRankings = []) {
  if (!Array.isArray(powerRankings) || powerRankings.length === 0) {
    return { trend: 'stable', recentSwing: 0, last5avg: 0, breakCount: 0 };
  }

  const last5 = powerRankings.slice(-5);
  const last10 = powerRankings.slice(-10);
  const last12 = powerRankings.slice(-12);

  const values5 = last5.map((x) => x?.value || 0);
  const values12 = last12.map((x) => x?.value || 0);

  // --- 1) last5avg (keep same semantics)
  const last5avg = values5.reduce((s, v) => s + v, 0) / Math.max(values5.length, 1);

  // --- 2) EMA slope for trend (robust vs noise)
  // EMA alpha: higher => more reactive
  const ema = emaSeries(values12, 0.35);
  const slope = ema.length >= 2 ? ema[ema.length - 1] - ema[ema.length - 2] : 0;

  // Trend thresholds (PR units). Keep conservative to avoid flip-flop.
  let trend = 'stable';
  if (slope > 6) trend = 'home_rising';
  else if (slope < -6) trend = 'away_rising';

  // --- 3) recentSwing: use average absolute delta over last 5 (not max)
  // Convert PR delta to a 0..100 scale with a cap.
  const swingAvg = avgAbsDelta(values5);
  const recentSwing = Math.round(clamp01(swingAvg / 25) * 100);

  // --- 4) breakCount in last 10 (same as before)
  const breakCount = last10.filter((pr) => pr && pr.breakOccurred).length;

  return {
    trend,
    recentSwing,
    last5avg: Math.round(last5avg),
    breakCount,
  };
}

// ============================================================================
// MOMENTUM HELPERS
// ============================================================================

/**
 * Calculate average absolute delta between consecutive values
 * @param {Array<number>} arr - Array of values
 * @returns {number} Average absolute delta
 */
function avgAbsDelta(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < arr.length; i++) sum += Math.abs(arr[i] - arr[i - 1]);
  return sum / (arr.length - 1);
}

/**
 * Calculate EMA series from values
 * @param {Array<number>} values - Input values
 * @param {number} alpha - EMA smoothing factor (0-1, higher = more reactive)
 * @returns {Array<number>} EMA series
 */
function emaSeries(values, alpha) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const a = clamp01(alpha);
  const out = [];
  let ema = values[0];
  out.push(ema);
  for (let i = 1; i < values.length; i++) {
    ema = a * values[i] + (1 - a) * ema;
    out.push(ema);
  }
  return out;
}

module.exports = {
  calculateRecentMomentum,
  // Helpers exposed for testing
  avgAbsDelta,
  emaSeries,
};
