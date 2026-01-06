/**
 * 🧮 FEATURE ENGINE (ORCHESTRATOR)
 *
 * Transforms RAW STATS into COMPUTED FEATURES.
 * Features are mid-level indicators used by Strategy Engine.
 *
 * RAW DATA → FEATURE ENGINE → STRATEGY ENGINE → SIGNALS
 *
 * This file is the orchestrator that imports from modular feature files.
 * All feature calculations are delegated to dedicated modules in ./features/
 *
 * @module featureEngine
 * @see docs/filosofie/FILOSOFIA_STATS.md
 */

const { calculatePressureIndex } = require('./pressureCalculator');

// Import from modular feature files
const { clamp01, clampTo0_100 } = require('./math');
const {
  calculateVolatility,
  hasOddsHistory,
  computePRSweepIntensity,
  computeRecentBreakRate,
  computeReversalIntensity,
  computeOddsSwingIntensity,
  extractImpliedHomeProbSeries,
  impliedProbNormalized,
  computeScorePressureAmplifier,
} = require('./features/volatility');

const {
  calculateDominance,
  smoothPR,
  statsDominanceIfAvailable,
  estimateReturnPointWinProbPct,
  finalizeDominance,
} = require('./features/dominance');

const {
  calculateServeDominance,
  estimateServePointWinProbFromPct,
  adjustServeProbByAcesDF,
  estimateReturnPointWinProb,
  probToDominance,
} = require('./features/serveDominance');

const {
  calculateBreakProbability,
  estimateServePointWinProb,
  holdProbabilityFromState,
  parseGameScoreToState,
  parseGameScore,
  adjustByMomentum,
  adjustByDoubleFaults,
} = require('./features/breakProbability');

const {
  calculateRecentMomentum,
  avgAbsDelta,
  emaSeries,
} = require('./features/momentum');

const {
  buildPressureMatchContext,
  deriveClutchFlagsFromGameScore,
  isClutchPoint,
} = require('./features/pressure');

const { calculateOddsFeatures } = require('./features/odds');

const {
  calculateVolatilityFromScore,
  calculateDominanceFromScore,
  calculateDominanceFromOdds,
  calculateServeDominanceFromRankings,
  calculateBreakProbabilityFromOddsRankings,
  calculatePressureFromScore,
  calculateMomentumFromScore,
} = require('./features/fallbacks');

// ============================================================================
// VERSION (FILOSOFIA_LINEAGE_VERSIONING compliance)
// ============================================================================
const FEATURE_ENGINE_VERSION = 'v1.1.0'; // Bumped for modular refactor

// ============================================================================
// FEATURE DEFINITIONS
// ============================================================================

/**
 * @typedef {Object} MatchFeatures
 * @property {number} volatility - Market volatility 0-100
 * @property {number} pressure - Pressure index on server 0-100
 * @property {number} dominance - Who controls the match 0-100 (50=balanced)
 * @property {number} serveDominance - Serving player dominance 0-100
 * @property {number} returnDominance - Returning player dominance 0-100
 * @property {number} breakProbability - Probability of break this game 0-100
 * @property {string} dominantPlayer - 'home' | 'away' | 'none'
 * @property {string|null} serverPlayerId - Current server ID
 * @property {Object} momentum - Recent momentum indicators
 */

// ============================================================================
// MAIN FEATURE COMPUTATION
// ============================================================================

/**
 * Compute all features for a match
 * SEMPRE calcola qualcosa - usa dati disponibili (score, odds, rankings)
 *
 * TEMPORAL SEMANTICS (FILOSOFIA_TEMPORAL_SEMANTICS compliance):
 * - as_of_time: timestamp per calcolo point-in-time (anti time leakage)
 *   Se fornito, le features vengono calcolate come se fossero a quel momento
 *
 * @param {Object} matchData - Raw match data
 * @param {Object} options - Opzioni aggiuntive
 * @param {string} options.as_of_time - Timestamp ISO per calcolo point-in-time
 * @returns {MatchFeatures} Computed features
 */
function computeFeatures(matchData, options = {}) {
  const {
    powerRankings = [],
    statistics = {},
    score = {},
    odds = [],
    serving = null,
    gameScore = null,
    // Dati aggiuntivi per calcoli fallback
    player1 = {},
    player2 = {},
  } = matchData;

  // TEMPORAL SEMANTICS: as_of_time per calcoli point-in-time
  const asOfTime = options.as_of_time || new Date().toISOString();

  // Identifica quali dati abbiamo
  const statsFields = [
    'firstServePointsWonPct',
    'secondServePointsWonPct',
    'aces',
    'doubleFaults',
    'breakPointsWon',
  ];
  const hasRealHomeStats =
    statistics.home && statsFields.some((f) => statistics.home[f] !== undefined);
  const hasRealAwayStats =
    statistics.away && statsFields.some((f) => statistics.away[f] !== undefined);
  const hasStatistics = hasRealHomeStats || hasRealAwayStats;
  const hasPowerRankings = powerRankings.length > 0;
  const hasScore = score.sets && score.sets.length > 0;
  const hasOdds =
    odds.length > 0 || (odds.matchWinner && (odds.matchWinner.home || odds.matchWinner.away));
  const hasRankings =
    player1.ranking || player1.currentRanking || player2.ranking || player2.currentRanking;

  // =====================================================================
  // VOLATILITY: Calcola da powerRankings SE ci sono, altrimenti da score
  // =====================================================================
  let volatility;
  if (hasPowerRankings) {
    volatility = calculateVolatility({ powerRankings, score, odds });
  } else if (hasScore) {
    // Calcola volatility dal punteggio: set combattuti = alta volatilità
    volatility = calculateVolatilityFromScore(score);
  } else {
    volatility = 50; // Default medio
  }

  // =====================================================================
  // DOMINANCE: Da powerRankings SE ci sono, altrimenti da score/odds
  // =====================================================================
  let dominance, dominantPlayer;
  if (hasPowerRankings) {
    const result = calculateDominance({ powerRankings, statistics });
    dominance = result.dominance;
    dominantPlayer = result.dominantPlayer;
  } else if (hasScore) {
    const result = calculateDominanceFromScore(score);
    dominance = result.dominance;
    dominantPlayer = result.dominantPlayer;
  } else if (hasOdds) {
    const result = calculateDominanceFromOdds(odds);
    dominance = result.dominance;
    dominantPlayer = result.dominantPlayer;
  } else {
    dominance = 50;
    // FILOSOFIA_CALCOLI: MAI null, usa 'none'
    dominantPlayer = 'none';
  }

  // =====================================================================
  // SERVE/RETURN DOMINANCE: Da statistics SE ci sono, altrimenti stima
  // =====================================================================
  let serveDominance, returnDominance;
  if (hasStatistics) {
    const result = calculateServeDominance(statistics, serving || 'home', false);
    serveDominance = result.serveDominance;
    returnDominance = result.returnDominance;
  } else if (hasRankings) {
    // Stima da ranking: giocatore con ranking migliore ha servizio più forte
    const result = calculateServeDominanceFromRankings(player1, player2, serving);
    serveDominance = result.serveDominance;
    returnDominance = result.returnDominance;
  } else {
    serveDominance = 50;
    returnDominance = 50;
  }

  // =====================================================================
  // BREAK PROBABILITY: Da statistics SE ci sono, altrimenti stima
  // =====================================================================
  let breakProbability;
  if (hasStatistics) {
    breakProbability = calculateBreakProbability({
      statistics,
      server: serving || 'home',
      gameScore,
      powerRankings,
      requireRealData: false,
    });
  } else if (hasRankings || hasOdds) {
    // Stima: sfavorito ha più probabilità di breakare (underdog break)
    breakProbability = calculateBreakProbabilityFromOddsRankings(odds, player1, player2, serving);
  } else {
    breakProbability = 25; // Media tennis
  }

  // =====================================================================
  // MOMENTUM: Da powerRankings SE ci sono, altrimenti inferisci da score
  // (moved BEFORE pressure because pressure uses momentum in matchContext)
  // =====================================================================
  let momentum;
  if (hasPowerRankings) {
    momentum = calculateRecentMomentum(powerRankings);
  } else if (hasScore) {
    momentum = calculateMomentumFromScore(score);
  } else {
    momentum = { trend: 'stable', recentSwing: 0, last5avg: 50, breakCount: 0 };
  }

  // =====================================================================
  // PRESSURE: Use pressureCalculator WITH matchContext (clutch/context multiplier)
  // =====================================================================
  let pressure;
  if (hasStatistics) {
    try {
      const serverStats = serving === 'away' ? statistics.away : statistics.home;

      if (serverStats) {
        // Build matchContext using available data (score, serving, gameScore, momentum)
        const matchContext = buildPressureMatchContext({
          score,
          serving: serving || 'home',
          gameScore,
          momentum,
        });

        const pressureResult = calculatePressureIndex(serverStats, matchContext);

        // pressureCalculator returns { index: number, ... }
        pressure = typeof pressureResult?.index === 'number' ? pressureResult.index : 50;
      } else {
        pressure = 50;
      }
    } catch (e) {
      pressure = 50;
    }
  } else if (hasScore) {
    // Calcola pressure dal punteggio: set decisivo = alta pressione
    pressure = calculatePressureFromScore(score);
  } else {
    pressure = 50;
  }

  // =====================================================================
  // DATA SOURCE FLAGS: Indica l'origine di ogni feature per trasparenza
  // =====================================================================
  const volatilitySource = hasPowerRankings ? 'live' : hasScore ? 'score' : 'estimated';
  const pressureSource = hasStatistics ? 'statistics' : hasScore ? 'score' : 'estimated';
  const dominanceSource = hasPowerRankings
    ? 'live'
    : hasScore
    ? 'score'
    : hasOdds
    ? 'odds'
    : 'estimated';
  const serveDominanceSource = hasStatistics
    ? 'statistics'
    : hasRankings
    ? 'rankings'
    : 'estimated';
  const breakProbabilitySource = hasStatistics
    ? 'statistics'
    : hasOdds || hasRankings
    ? 'odds'
    : 'estimated';
  const momentumSource = hasPowerRankings ? 'live' : hasScore ? 'score' : 'estimated';

  // hasRealData: true se abbiamo dati live/statistics/score, false solo se tutto è stimato
  const hasRealData = hasPowerRankings || hasStatistics || hasScore || hasOdds || hasRankings;

  // =====================================================================
  // NaN GUARDS (FILOSOFIA_CALCOLI: NEVER_RETURN_NaN)
  // =====================================================================
  const safeRound = (val, fallback = 50) => {
    const rounded = Math.round(val);
    return Number.isNaN(rounded) ? fallback : rounded;
  };

  return {
    volatility: safeRound(volatility, 50),
    volatilitySource,
    pressure: safeRound(pressure, 50),
    pressureSource,
    dominance: safeRound(dominance, 50),
    dominanceSource,
    serveDominance: safeRound(serveDominance, 50),
    serveDominanceSource,
    returnDominance: safeRound(returnDominance, 50),
    returnDominanceSource: serveDominanceSource, // Same as serveDominance
    breakProbability: safeRound(breakProbability, 25),
    breakProbabilitySource,
    dominantPlayer,
    serverPlayerId: serving,
    momentum,
    momentumSource,
    // Flag per UI: indica se abbiamo dati reali o solo stime
    hasRealData,
    // Backward compatibility: dataSource globale (più conservativo)
    dataSource: hasPowerRankings
      ? 'live'
      : hasStatistics
      ? 'statistics'
      : hasScore
      ? 'score'
      : 'estimated',
    // TEMPORAL SEMANTICS: as_of_time per tracciabilità
    as_of_time: asOfTime,
    // Version for lineage
    version: FEATURE_ENGINE_VERSION,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Version (FILOSOFIA_LINEAGE_VERSIONING)
  FEATURE_ENGINE_VERSION,
  // Main
  computeFeatures,
  calculateVolatility,
  calculateDominance,
  calculateServeDominance,
  calculateBreakProbability,
  calculateRecentMomentum,
  // FILOSOFIA_CALCOLI: isClutchPoint for MatchState
  isClutchPoint,
  // FILOSOFIA_ODDS: calculateOddsFeatures (implied, overround, fair odds)
  calculateOddsFeatures,
  // Fallback functions
  calculateVolatilityFromScore,
  calculateDominanceFromScore,
  calculateDominanceFromOdds,
  calculateServeDominanceFromRankings,
  calculateBreakProbabilityFromOddsRankings,
  calculatePressureFromScore,
  calculateMomentumFromScore,
  // Markov helpers (exposed for testing/transparency)
  estimateServePointWinProb,
  holdProbabilityFromState,
  parseGameScoreToState,
  adjustByMomentum,
  adjustByDoubleFaults,
  clamp01,
  clampTo0_100,
  // Serve/Return Dominance helpers (exposed for testing/transparency)
  estimateServePointWinProbFromPct,
  adjustServeProbByAcesDF,
  estimateReturnPointWinProb,
  probToDominance,
  // Volatility helpers (exposed for testing/transparency)
  hasOddsHistory,
  computePRSweepIntensity,
  computeRecentBreakRate,
  computeReversalIntensity,
  computeOddsSwingIntensity,
  extractImpliedHomeProbSeries,
  impliedProbNormalized,
  computeScorePressureAmplifier,
  // Pressure helpers
  buildPressureMatchContext,
  deriveClutchFlagsFromGameScore,
};
