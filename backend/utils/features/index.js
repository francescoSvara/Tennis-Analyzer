/**
 * 📊 FEATURES MODULE INDEX
 *
 * Central export point for all feature calculation modules.
 *
 * @module features/index
 */

const { calculateVolatility, hasOddsHistory, computePRSweepIntensity, computeRecentBreakRate, computeReversalIntensity, computeOddsSwingIntensity, extractImpliedHomeProbSeries, impliedProbNormalized, computeScorePressureAmplifier } = require('./volatility');
const { calculateDominance, smoothPR, statsDominanceIfAvailable, estimateServePointWinProbFromPct: dominanceEstimateServeProb, estimateReturnPointWinProbPct, finalizeDominance } = require('./dominance');
const { calculateServeDominance, estimateServePointWinProbFromPct, adjustServeProbByAcesDF, estimateReturnPointWinProb, probToDominance } = require('./serveDominance');
const { calculateBreakProbability, estimateServePointWinProb, holdProbabilityFromState, parseGameScoreToState, parseGameScore, adjustByMomentum, adjustByDoubleFaults, __holdMemo } = require('./breakProbability');
const { calculateRecentMomentum, avgAbsDelta, emaSeries } = require('./momentum');
const { buildPressureMatchContext, deriveClutchFlagsFromGameScore, isClutchPoint } = require('./pressure');
const { calculateOddsFeatures } = require('./odds');
const { calculateVolatilityFromScore, calculateDominanceFromScore, calculateDominanceFromOdds, calculateServeDominanceFromRankings, calculateBreakProbabilityFromOddsRankings, calculatePressureFromScore, calculateMomentumFromScore } = require('./fallbacks');

module.exports = {
  // Volatility
  calculateVolatility,
  hasOddsHistory,
  computePRSweepIntensity,
  computeRecentBreakRate,
  computeReversalIntensity,
  computeOddsSwingIntensity,
  extractImpliedHomeProbSeries,
  impliedProbNormalized,
  computeScorePressureAmplifier,

  // Dominance
  calculateDominance,
  smoothPR,
  statsDominanceIfAvailable,
  estimateReturnPointWinProbPct,
  finalizeDominance,

  // Serve/Return Dominance
  calculateServeDominance,
  estimateServePointWinProbFromPct,
  adjustServeProbByAcesDF,
  estimateReturnPointWinProb,
  probToDominance,

  // Break Probability
  calculateBreakProbability,
  estimateServePointWinProb,
  holdProbabilityFromState,
  parseGameScoreToState,
  parseGameScore,
  adjustByMomentum,
  adjustByDoubleFaults,
  __holdMemo,

  // Momentum
  calculateRecentMomentum,
  avgAbsDelta,
  emaSeries,

  // Pressure
  buildPressureMatchContext,
  deriveClutchFlagsFromGameScore,
  isClutchPoint,

  // Odds
  calculateOddsFeatures,

  // Fallbacks
  calculateVolatilityFromScore,
  calculateDominanceFromScore,
  calculateDominanceFromOdds,
  calculateServeDominanceFromRankings,
  calculateBreakProbabilityFromOddsRankings,
  calculatePressureFromScore,
  calculateMomentumFromScore,
};
