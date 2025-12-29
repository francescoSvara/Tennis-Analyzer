/**
 * 🎲 RISK ENGINE
 *
 * Gestisce il calcolo del rischio e del bankroll management.
 * Implementa edge detection, Kelly staking e exposure control.
 *
 * Ref: docs/filosofie/FILOSOFIA_RISK_BANKROLL.md
 *
 * @module riskEngine
 */

// ============================================
// VERSION (FILOSOFIA_LINEAGE_VERSIONING compliance)
// ============================================
const RISK_ENGINE_VERSION = 'v1.0.0';

// ============================================
// EDGE CALCULATION
// ============================================

/**
 * Calculate betting edge
 * Edge = model_probability - implied_probability
 *
 * @param {number} modelProb - Model predicted probability (0-1)
 * @param {number} marketOdds - Market decimal odds (e.g., 1.85)
 * @returns {number} Edge as decimal (e.g., 0.06 = 6% edge)
 */
function calculateEdge(modelProb, marketOdds) {
  if (!modelProb || !marketOdds || marketOdds <= 1) return 0;
  const impliedProb = 1 / marketOdds;
  return modelProb - impliedProb;
}

/**
 * Calculate minimum acceptable price
 * price_min = 1 / model_probability
 *
 * @param {number} modelProb - Model predicted probability (0-1)
 * @returns {number} Minimum acceptable odds
 */
function calculatePriceMin(modelProb) {
  if (!modelProb || modelProb <= 0 || modelProb >= 1) return 0;
  return 1 / modelProb;
}

// ============================================
// STAKE CALCULATION (Kelly Criterion)
// ============================================

/**
 * Calculate optimal stake using fractional Kelly
 *
 * Kelly formula: f = edge / (price - 1)
 * We use 1/4 Kelly for safety
 *
 * @param {number} edge - Calculated edge (from calculateEdge)
 * @param {number} price - Market decimal odds
 * @param {number} bankroll - Current bankroll
 * @param {number} kellyFraction - Fraction of Kelly to use (default 0.25 = 1/4)
 * @returns {number} Recommended stake amount
 */
function calculateStake(edge, price, bankroll, kellyFraction = 0.25) {
  // No bet if no edge
  if (edge <= 0) return 0;
  if (!price || price <= 1 || !bankroll || bankroll <= 0) return 0;

  // Kelly formula: f = edge / (price - 1)
  const kellyFraction_full = edge / (price - 1);

  // Apply fraction for safety
  let stake = bankroll * kellyFraction_full * kellyFraction;

  // Cap at 5% of bankroll per single bet
  const maxStake = bankroll * 0.05;
  stake = Math.min(stake, maxStake);

  return Math.max(0, stake);
}

// ============================================
// EXPOSURE CONTROL
// ============================================

/**
 * Control total exposure (max 20% of bankroll)
 * Scales down all bets proportionally if needed
 *
 * @param {Array<{stake: number}>} bets - Array of bet objects with stake
 * @param {number} bankroll - Current bankroll
 * @param {number} maxExposure - Maximum exposure percentage (default 0.20 = 20%)
 * @returns {Array} Adjusted bets with scaled stakes
 */
function controlExposure(bets, bankroll, maxExposure = 0.2) {
  if (!bets || !bets.length || !bankroll) return bets;

  const totalExposure = bets.reduce((sum, b) => sum + (b.stake || 0), 0);
  const exposurePct = totalExposure / bankroll;

  // Scale down if over limit
  if (exposurePct > maxExposure) {
    const scaleFactor = maxExposure / exposurePct;
    return bets.map((b) => ({
      ...b,
      stake: (b.stake || 0) * scaleFactor,
      scaled: true,
      originalStake: b.stake,
    }));
  }

  return bets;
}

// ============================================
// RISK ASSESSMENT
// ============================================

/**
 * Assess overall risk level for a bet
 * @param {Object} params
 * @param {number} params.edge - Calculated edge
 * @param {number} params.confidence - Model confidence (0-1)
 * @param {number} params.volatility - Market volatility (0-100)
 * @returns {Object} Risk assessment with level and factors
 */
function assessRisk({ edge, confidence, volatility }) {
  const factors = [];
  let riskScore = 50; // Base risk

  // Edge contribution
  if (edge < 0.02) {
    riskScore += 20;
    factors.push('Low edge (<2%)');
  } else if (edge > 0.1) {
    riskScore -= 10;
    factors.push('Strong edge (>10%)');
  }

  // Confidence contribution
  if (confidence && confidence < 0.5) {
    riskScore += 15;
    factors.push('Low model confidence');
  }

  // Volatility contribution
  if (volatility && volatility > 70) {
    riskScore += 15;
    factors.push('High market volatility');
  }

  // Determine level
  let level = 'MEDIUM';
  if (riskScore < 40) level = 'LOW';
  else if (riskScore > 70) level = 'HIGH';

  return {
    level,
    score: riskScore,
    factors,
  };
}

/**
 * Generate complete risk output for a betting opportunity
 * @param {Object} params
 * @param {number} params.modelProb - Model probability
 * @param {number} params.marketOdds - Market odds
 * @param {number} params.bankroll - Current bankroll
 * @param {number} params.confidence - Model confidence
 * @param {number} params.volatility - Market volatility
 * @returns {Object} Complete risk analysis
 */
function analyzeRisk({ modelProb, marketOdds, bankroll, confidence, volatility }) {
  const edge = calculateEdge(modelProb, marketOdds);
  const priceMin = calculatePriceMin(modelProb);
  const stake = calculateStake(edge, marketOdds, bankroll);
  const risk = assessRisk({ edge, confidence, volatility });

  return {
    edge: {
      value: edge,
      percentage: (edge * 100).toFixed(2) + '%',
      hasEdge: edge > 0,
    },
    priceMin,
    stake: {
      amount: stake,
      percentage: bankroll ? ((stake / bankroll) * 100).toFixed(2) + '%' : '0%',
    },
    risk,
    recommendation: edge > 0.02 && risk.level !== 'HIGH' ? 'BET' : 'PASS',
    meta: {
      version: RISK_ENGINE_VERSION,
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Version
  RISK_ENGINE_VERSION,

  // Core calculations
  calculateEdge,
  calculatePriceMin,
  calculateStake,
  controlExposure,

  // Analysis
  assessRisk,
  analyzeRisk,
};
