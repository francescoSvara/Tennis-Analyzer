/**
 * 🧮 FEATURE ENGINE
 *
 * Transforms RAW STATS into COMPUTED FEATURES.
 * Features are mid-level indicators used by Strategy Engine.
 *
 * RAW DATA → FEATURE ENGINE → STRATEGY ENGINE → SIGNALS
 *
 * @module featureEngine
 * @see docs/filosofie/FILOSOFIA_STATS_V3.md
 */

const { calculatePressureIndex } = require('./pressureCalculator');

// ============================================================================
// VERSION (FILOSOFIA_LINEAGE_VERSIONING compliance)
// ============================================================================
const FEATURE_ENGINE_VERSION = 'v1.0.0';

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
// VOLATILITY CALCULATION
// ============================================================================

/**
 * Calculate match volatility based on score swings and breaks
 * @param {Object} params
 * @param {Array} params.powerRankings - Momentum data
 * @param {Object} params.score - Current score
 * @param {Array} params.odds - Historical odds
 * @returns {number} Volatility 0-100
 */
function calculateVolatility({ powerRankings = [], score = {}, odds = [] }) {
  let volatility = 50; // Base volatility

  if (powerRankings.length < 2) return volatility;

  // Calculate momentum swings
  const recentPR = powerRankings.slice(-10);
  let swingSum = 0;

  for (let i = 1; i < recentPR.length; i++) {
    const swing = Math.abs((recentPR[i].value || 0) - (recentPR[i - 1].value || 0));
    swingSum += swing;
  }

  const avgSwing = swingSum / Math.max(recentPR.length - 1, 1);

  // Count breaks in recent games
  const recentBreaks = recentPR.filter((pr) => pr.breakOccurred).length;

  // High swings + many breaks = high volatility
  volatility = Math.min(
    100,
    Math.max(
      0,
      30 + // base
        avgSwing * 1.5 + // swing contribution (0-30 typically)
        recentBreaks * 10 // break contribution
    )
  );

  // Adjust for close score (tighter = more volatile)
  const sets = score.sets || [];
  const currentSet = sets[sets.length - 1];
  if (currentSet) {
    const gameDiff = Math.abs((currentSet.home || 0) - (currentSet.away || 0));
    if (gameDiff <= 1) volatility += 15; // Close set
  }

  return Math.round(volatility);
}

// ============================================================================
// DOMINANCE CALCULATION
// ============================================================================

/**
 * Calculate match dominance (who is in control)
 * @param {Object} params
 * @param {Array} params.powerRankings - Momentum data
 * @param {Object} params.statistics - Match statistics
 * @returns {{dominance: number, dominantPlayer: string}}
 */
function calculateDominance({ powerRankings = [], statistics = {} }) {
  // Get latest power ranking as dominance indicator
  // FILOSOFIA_CALCOLI: MAI null, usa 'none' come fallback
  if (powerRankings.length === 0) {
    return { dominance: 50, dominantPlayer: 'none' };
  }

  const latestPR = powerRankings[powerRankings.length - 1];
  const prValue = latestPR.value || 0;

  // Convert PR value (-100 to +100) to dominance (0-100)
  // PR > 0 = home dominates, PR < 0 = away dominates
  const dominance = 50 + prValue / 2;

  // FILOSOFIA_CALCOLI: MAI null, usa 'none' come default
  let dominantPlayer = 'none';
  if (prValue > 20) dominantPlayer = 'home';
  else if (prValue < -20) dominantPlayer = 'away';

  return {
    dominance: Math.round(Math.max(0, Math.min(100, dominance))),
    dominantPlayer,
  };
}

// ============================================================================
// SERVE DOMINANCE
// ============================================================================

/**
 * Calculate serving/returning dominance from statistics
 *
 * DEEP-009 (FILOSOFIA): MAI null, sempre fallback calcolato
 * Se non ci sono dati reali, restituisce valori stimati con flag isEstimated=true
 *
 * @param {Object} statistics - Match statistics (home/away)
 * @param {string} servingPlayer - 'home' | 'away'
 * @param {boolean} requireRealData - DEPRECATED: sempre restituisce valori, usa isEstimated flag
 * @returns {{serveDominance: number, returnDominance: number, isEstimated: boolean}}
 */
function calculateServeDominance(statistics = {}, servingPlayer = 'home', requireRealData = false) {
  const defaults = { serveDominance: 50, returnDominance: 50, isEstimated: true };

  // Check if we have real statistics data
  const hasHomeStats =
    statistics.home &&
    Object.keys(statistics.home).length > 0 &&
    (statistics.home.firstServePointsWonPct !== undefined || statistics.home.aces !== undefined);
  const hasAwayStats =
    statistics.away &&
    Object.keys(statistics.away).length > 0 &&
    (statistics.away.firstServePointsWonPct !== undefined || statistics.away.aces !== undefined);

  if (!hasHomeStats && !hasAwayStats) {
    return defaults;
  }

  const server = servingPlayer === 'home' ? statistics.home : statistics.away;
  const returner = servingPlayer === 'home' ? statistics.away : statistics.home;

  if (!server || !returner) {
    return defaults;
  }

  // Server dominance based on serve stats
  const firstServeWon = parseFloat(server.firstServePointsWonPct) || 50;
  const secondServeWon = parseFloat(server.secondServePointsWonPct) || 35;
  const aces = parseInt(server.aces) || 0;
  const doubleFaults = parseInt(server.doubleFaults) || 0;

  // Weighted serve score
  let serveDominance =
    firstServeWon * 0.5 +
    secondServeWon * 0.3 +
    Math.min(aces * 5, 20) - // Aces bonus, capped
    Math.min(doubleFaults * 5, 20); // DF penalty, capped

  // Return dominance based on break points
  const bpWon = parseInt(returner.breakPointsWon) || 0;
  const bpTotal = parseInt(returner.breakPointsTotal) || 0;
  const bpPct = bpTotal > 0 ? (bpWon / bpTotal) * 100 : 30;

  // Receiving points won
  const recPtsWon = parseFloat(returner.receiverPointsWonPct) || 30;

  let returnDominance = bpPct * 0.5 + recPtsWon * 0.5;

  return {
    serveDominance: Math.round(Math.max(0, Math.min(100, serveDominance))),
    returnDominance: Math.round(Math.max(0, Math.min(100, returnDominance))),
    isEstimated: false, // Calculated from real data
  };
}

// ============================================================================
// BREAK PROBABILITY
// ============================================================================

/**
 * Calculate probability of break this game
 *
 * DEEP-009 (FILOSOFIA): MAI null, sempre fallback calcolato
 *
 * @param {Object} params
 * @param {Object} params.statistics - Match statistics
 * @param {string} params.server - Who is serving
 * @param {Object} params.gameScore - Current game score (e.g., "30-40")
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
  let baseProbability = 25; // Average break probability in tennis

  // Check if we have real statistics
  const hasStats =
    statistics.home &&
    statistics.away &&
    (statistics.home.firstServePointsWonPct !== undefined ||
      statistics.away.firstServePointsWonPct !== undefined);

  // DEEP-009: Sempre restituisci un valore, non null
  if (!hasStats) {
    return baseProbability;
  }

  const serverStats = server === 'home' ? statistics.home : statistics.away;
  const returnerStats = server === 'home' ? statistics.away : statistics.home;

  // DEEP-009: Sempre restituisci un valore, non null
  if (!serverStats || !returnerStats) {
    return baseProbability;
  }

  // Server weaknesses increase break probability
  const firstServePct = parseFloat(serverStats.firstServePointsWonPct) || 60;
  const secondServePct = parseFloat(serverStats.secondServePointsWonPct) || 40;
  const doubleFaults = parseInt(serverStats.doubleFaults) || 0;

  // Adjust based on serve performance
  if (firstServePct < 55) baseProbability += 10;
  if (secondServePct < 35) baseProbability += 15;
  if (doubleFaults > 3) baseProbability += 10;

  // Returner strength
  const bpConversion =
    ((parseInt(returnerStats.breakPointsWon) || 0) /
      Math.max(parseInt(returnerStats.breakPointsTotal) || 1, 1)) *
    100;
  if (bpConversion > 50) baseProbability += 10;

  // Game score adjustment
  if (gameScore) {
    const [serverPts, returnerPts] = parseGameScore(gameScore);
    if (returnerPts >= 40 && serverPts < 40) baseProbability += 20; // Break point!
    if (returnerPts === 30 && serverPts <= 15) baseProbability += 10; // Pressure
  }

  // Momentum: if server is under pressure in recent games
  if (powerRankings.length > 0) {
    const recentPR = powerRankings.slice(-5);
    const avgPR = recentPR.reduce((sum, pr) => sum + (pr.value || 0), 0) / recentPR.length;

    // If momentum is against server, increase break probability
    if (server === 'home' && avgPR < -20) baseProbability += 10;
    if (server === 'away' && avgPR > 20) baseProbability += 10;
  }

  return Math.round(Math.max(0, Math.min(100, baseProbability)));
}

/**
 * Parse game score string into points
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

// ============================================================================
// RECENT MOMENTUM
// ============================================================================

/**
 * Calculate recent momentum indicators
 * @param {Array} powerRankings - Momentum history
 * @returns {Object} Momentum indicators
 */
function calculateRecentMomentum(powerRankings = []) {
  if (powerRankings.length === 0) {
    return {
      trend: 'stable',
      recentSwing: 0,
      last5avg: 0,
      breakCount: 0,
    };
  }

  const last5 = powerRankings.slice(-5);
  const last10 = powerRankings.slice(-10);

  // Calculate trend
  const first = last5[0]?.value || 0;
  const last = last5[last5.length - 1]?.value || 0;
  const diff = last - first;

  let trend = 'stable';
  if (diff > 15) trend = 'home_rising';
  else if (diff < -15) trend = 'away_rising';

  // Calculate recent swing
  let maxSwing = 0;
  for (let i = 1; i < last5.length; i++) {
    const swing = Math.abs((last5[i].value || 0) - (last5[i - 1].value || 0));
    maxSwing = Math.max(maxSwing, swing);
  }

  // Average of last 5
  const last5avg = last5.reduce((sum, pr) => sum + (pr.value || 0), 0) / last5.length;

  // Break count in last 10
  const breakCount = last10.filter((pr) => pr.breakOccurred).length;

  return {
    trend,
    recentSwing: Math.round(maxSwing),
    last5avg: Math.round(last5avg),
    breakCount,
  };
}

// ============================================================================
// CLUTCH POINT DETECTION (FILOSOFIA_CALCOLI: DOMAIN_MatchState_isClutchPoint)
// ============================================================================

/**
 * Determines if the current point is a "clutch point" (punto decisivo)
 *
 * FILOSOFIA_CALCOLI: MatchState must include isClutchPoint
 *
 * Clutch points are critical moments in tennis:
 * - Break points (30-40, 40-AD against server)
 * - Set points (one game away from winning set)
 * - Match points (one point away from winning match)
 * - Tiebreak with score >= 6
 *
 * @param {Object} matchState - Current match state
 * @param {Object} matchState.score - Current score { sets: [], currentGame: {home, away} }
 * @param {string} matchState.serving - Who is serving: 'home' | 'away'
 * @param {Object} matchState.gameScore - Current game score { home: '40', away: '30' } or points
 * @param {boolean} matchState.isTiebreak - Whether currently in tiebreak
 * @returns {Object} { isClutchPoint: boolean, clutchType: string|null, pressure: number }
 */
function isClutchPoint(matchState = {}) {
  const { score = {}, serving = 'home', gameScore = {}, isTiebreak = false } = matchState;

  // Default response - FILOSOFIA_CALCOLI: MAI null
  const result = {
    isClutchPoint: false,
    clutchType: null,
    pressure: 0, // 0-100 scale
  };

  // Parse game score (can be '40', 'AD' or numeric points like 0, 15, 30, 40)
  const parseGameScore = (val) => {
    if (val === 'AD' || val === 'A') return 50; // Advantage
    if (typeof val === 'string') return parseInt(val) || 0;
    return val || 0;
  };

  const homeGame = parseGameScore(gameScore.home);
  const awayGame = parseGameScore(gameScore.away);

  // Get set scores
  const sets = score.sets || [];
  const currentSet = sets.length > 0 ? sets[sets.length - 1] : { home: 0, away: 0 };
  const homeGames = currentSet.home || 0;
  const awayGames = currentSet.away || 0;

  // Count sets won
  let homeSetsWon = 0;
  let awaySetsWon = 0;
  for (const set of sets.slice(0, -1)) {
    // Exclude current set
    if ((set.home || 0) > (set.away || 0)) homeSetsWon++;
    else if ((set.away || 0) > (set.home || 0)) awaySetsWon++;
  }

  // ========= CHECK CLUTCH CONDITIONS =========

  // 1. TIEBREAK - High pressure if score >= 6
  if (isTiebreak) {
    const tbHome = homeGame;
    const tbAway = awayGame;
    if (tbHome >= 6 || tbAway >= 6) {
      const diff = Math.abs(tbHome - tbAway);
      if (diff >= 1) {
        // Someone has set point in tiebreak
        result.isClutchPoint = true;
        result.clutchType = 'tiebreak_set_point';
        result.pressure = 90;
        return result;
      }
    }
    // Regular tiebreak point - moderate pressure
    result.isClutchPoint = true;
    result.clutchType = 'tiebreak';
    result.pressure = 60;
    return result;
  }

  // 2. BREAK POINT (receiver at 40, server at 30 or less, or AD out)
  const serverScore = serving === 'home' ? homeGame : awayGame;
  const receiverScore = serving === 'home' ? awayGame : homeGame;

  if (receiverScore >= 40 && serverScore < 40) {
    result.isClutchPoint = true;
    result.clutchType = 'break_point';
    result.pressure = 75;

    // Double break point (0-40 or 15-40)
    if (serverScore <= 15 && receiverScore === 40) {
      result.pressure = 85;
    }
    return result;
  }

  // 3. GAME POINT for server (40-30 or better for server)
  if (serverScore >= 40 && receiverScore < 40) {
    // Check if this game point is also a SET POINT
    const serverGames = serving === 'home' ? homeGames : awayGames;
    const receiverGames = serving === 'home' ? awayGames : homeGames;

    if (serverGames >= 5 && serverGames > receiverGames) {
      result.isClutchPoint = true;
      result.clutchType = 'set_point';
      result.pressure = 80;

      // Check if also MATCH POINT
      const serverSets = serving === 'home' ? homeSetsWon : awaySetsWon;
      if (serverSets >= 1) {
        // In best of 3, one set won means match point
        result.clutchType = 'match_point';
        result.pressure = 95;
      }
      return result;
    }
  }

  // 4. DEUCE - moderate pressure
  if (homeGame >= 40 && awayGame >= 40 && homeGame === awayGame) {
    result.isClutchPoint = true;
    result.clutchType = 'deuce';
    result.pressure = 55;
    return result;
  }

  // 5. ADVANTAGE - higher pressure
  if (homeGame === 50 || awayGame === 50) {
    // 50 represents AD
    result.isClutchPoint = true;
    result.clutchType =
      serving === 'home'
        ? homeGame === 50
          ? 'game_point'
          : 'break_point'
        : awayGame === 50
        ? 'game_point'
        : 'break_point';
    result.pressure = 70;
    return result;
  }

  return result;
}

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
  // PRESSURE: Da statistics SE ci sono, altrimenti da score
  // =====================================================================
  let pressure;
  if (hasStatistics) {
    try {
      const serverStats = serving === 'away' ? statistics.away : statistics.home;
      if (serverStats) {
        const pressureResult = calculatePressureIndex(serverStats);
        pressure = pressureResult?.pressure_index || 50;
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
  // MOMENTUM: Da powerRankings SE ci sono, altrimenti inferisci da score
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

  return {
    volatility: Math.round(volatility),
    volatilitySource,
    pressure: Math.round(pressure),
    pressureSource,
    dominance: Math.round(dominance),
    dominanceSource,
    serveDominance: Math.round(serveDominance),
    serveDominanceSource,
    returnDominance: Math.round(returnDominance),
    returnDominanceSource: serveDominanceSource, // Same as serveDominance
    breakProbability: Math.round(breakProbability),
    breakProbabilitySource,
    dominantPlayer,
    serverPlayerId: serving,
    momentum,
    momentumSource,
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
// ODDS FEATURES (FILOSOFIA_ODDS: FUNCTION_calculateOddsFeatures)
// ============================================================================

/**
 * Calculate odds-derived features
 *
 * FILOSOFIA_ODDS: implied probability, overround, fair odds
 *
 * @param {Object} odds - Odds data { matchWinner: { home, away }, ... }
 * @returns {Object} { impliedProbHome, impliedProbAway, overround, fairOddsHome, fairOddsAway }
 */
function calculateOddsFeatures(odds = {}) {
  const result = {
    impliedProbHome: null,
    impliedProbAway: null,
    overround: null,
    fairOddsHome: null,
    fairOddsAway: null,
    margin: null,
  };

  // Extract odds values
  let homeOdds = null;
  let awayOdds = null;

  if (odds.matchWinner) {
    homeOdds = odds.matchWinner.home?.value || odds.matchWinner.home;
    awayOdds = odds.matchWinner.away?.value || odds.matchWinner.away;
  } else if (Array.isArray(odds) && odds.length > 0) {
    const latest = odds[odds.length - 1];
    homeOdds = latest.odds_player1 || latest.home;
    awayOdds = latest.odds_player2 || latest.away;
  }

  // Validate odds
  if (typeof homeOdds !== 'number' || typeof awayOdds !== 'number') return result;
  if (homeOdds <= 1 || awayOdds <= 1) return result;

  // Calculate implied probabilities
  const impliedHome = 1 / homeOdds;
  const impliedAway = 1 / awayOdds;

  result.impliedProbHome = Math.round(impliedHome * 1000) / 10; // As percentage with 1 decimal
  result.impliedProbAway = Math.round(impliedAway * 1000) / 10;

  // Calculate overround (bookmaker margin)
  const totalImplied = impliedHome + impliedAway;
  result.overround = Math.round((totalImplied - 1) * 1000) / 10; // As percentage
  result.margin = result.overround;

  // Calculate fair odds (removing margin)
  if (totalImplied > 0) {
    const fairProbHome = impliedHome / totalImplied;
    const fairProbAway = impliedAway / totalImplied;

    result.fairOddsHome = Math.round(100 / fairProbHome) / 100; // 2 decimals
    result.fairOddsAway = Math.round(100 / fairProbAway) / 100;
  }

  return result;
}

// ============================================================================
// FALLBACK CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calcola volatility dal punteggio quando non ci sono powerRankings
 */
function calculateVolatilityFromScore(score) {
  const sets = score.sets || [];
  if (sets.length === 0) return 50;

  let volatility = 40; // Base

  // Analizza ogni set
  sets.forEach((set) => {
    const home = set.home || 0;
    const away = set.away || 0;
    const diff = Math.abs(home - away);

    // Set combattuto (diff <= 2) = più volatile
    if (diff <= 1) volatility += 15;
    else if (diff <= 2) volatility += 8;

    // Tiebreak = alta volatilità
    if (set.tiebreak || (home === 7 && away === 6) || (home === 6 && away === 7)) {
      volatility += 12;
    }
  });

  // Match lungo (3 set) = più volatile
  if (sets.length >= 3) volatility += 10;

  return Math.min(100, Math.max(0, volatility));
}

/**
 * Calcola dominance dal punteggio
 */
function calculateDominanceFromScore(score) {
  // FILOSOFIA_CALCOLI: MAI null, sempre fallback calcolato
  const sets = score.sets || [];
  if (sets.length === 0) return { dominance: 50, dominantPlayer: 'none' };

  let homeGames = 0,
    awayGames = 0;
  let homeSets = 0,
    awaySets = 0;

  sets.forEach((set) => {
    homeGames += set.home || 0;
    awayGames += set.away || 0;
    if ((set.home || 0) > (set.away || 0)) homeSets++;
    else if ((set.away || 0) > (set.home || 0)) awaySets++;
  });

  const totalGames = homeGames + awayGames || 1;
  const homeRatio = homeGames / totalGames;

  // Dominance 0-100, 50 = equilibrato
  const dominance = 50 + (homeRatio - 0.5) * 60 + (homeSets - awaySets) * 8;

  // FILOSOFIA_CALCOLI: MAI null, usa 'none' come default
  let dominantPlayer = 'none';
  if (dominance > 60) dominantPlayer = 'home';
  else if (dominance < 40) dominantPlayer = 'away';

  return {
    dominance: Math.min(100, Math.max(0, dominance)),
    dominantPlayer,
  };
}

/**
 * Calcola dominance dalle quote
 */
function calculateDominanceFromOdds(odds) {
  let homeOdds, awayOdds;

  if (odds.matchWinner) {
    homeOdds = odds.matchWinner.home?.value || odds.matchWinner.home || 2;
    awayOdds = odds.matchWinner.away?.value || odds.matchWinner.away || 2;
  } else if (Array.isArray(odds) && odds.length > 0) {
    const latest = odds[odds.length - 1];
    homeOdds = latest.odds_player1 || 2;
    awayOdds = latest.odds_player2 || 2;
  } else {
    // FILOSOFIA_CALCOLI: MAI null, usa 'none' come fallback
    return { dominance: 50, dominantPlayer: 'none' };
  }

  // Converti odds in probabilità implicita
  const homeProb = 1 / homeOdds;
  const awayProb = 1 / awayOdds;
  const total = homeProb + awayProb || 1;
  const homeProbNorm = homeProb / total;

  // Dominance: favorito domina
  const dominance = homeProbNorm * 100;

  // FILOSOFIA_CALCOLI: MAI null, usa 'none' come default
  let dominantPlayer = 'none';
  if (dominance > 60) dominantPlayer = 'home';
  else if (dominance < 40) dominantPlayer = 'away';

  return { dominance: Math.round(dominance), dominantPlayer };
}

/**
 * Stima serve dominance dai rankings
 */
function calculateServeDominanceFromRankings(player1, player2, serving) {
  const rank1 = player1.ranking || player1.currentRanking || 100;
  const rank2 = player2.ranking || player2.currentRanking || 100;

  // Ranking migliore (più basso) = servizio più forte
  const rankDiff = rank2 - rank1; // Positivo se P1 è meglio

  // Server advantage
  const serverRank = serving === 'away' ? rank2 : rank1;
  const returnerRank = serving === 'away' ? rank1 : rank2;

  // Base 50, bonus/malus per ranking
  let serveDominance = 50 + (returnerRank - serverRank) / 5;
  let returnDominance = 50 + (serverRank - returnerRank) / 5;

  // Limita
  serveDominance = Math.min(80, Math.max(30, serveDominance));
  returnDominance = Math.min(70, Math.max(30, returnDominance));

  return {
    serveDominance: Math.round(serveDominance),
    returnDominance: Math.round(returnDominance),
  };
}

/**
 * Stima break probability da odds/rankings
 */
function calculateBreakProbabilityFromOddsRankings(odds, player1, player2, serving) {
  let breakProbability = 25; // Base tennis

  // Da odds: underdog ha più chance di breakare
  if (odds.matchWinner || (Array.isArray(odds) && odds.length > 0)) {
    let homeOdds, awayOdds;
    if (odds.matchWinner) {
      homeOdds = odds.matchWinner.home?.value || odds.matchWinner.home || 2;
      awayOdds = odds.matchWinner.away?.value || odds.matchWinner.away || 2;
    } else {
      const latest = odds[odds.length - 1];
      homeOdds = latest.odds_player1 || 2;
      awayOdds = latest.odds_player2 || 2;
    }

    // Se il server è favorito, break prob più bassa
    const serverOdds = serving === 'away' ? awayOdds : homeOdds;
    const returnerOdds = serving === 'away' ? homeOdds : awayOdds;

    if (serverOdds < returnerOdds) {
      // Server favorito: break meno probabile
      breakProbability = 20;
    } else if (serverOdds > returnerOdds) {
      // Server sfavorito: break più probabile
      breakProbability = 35;
    }
  }

  // Da rankings
  const rank1 = player1.ranking || player1.currentRanking || 100;
  const rank2 = player2.ranking || player2.currentRanking || 100;
  const serverRank = serving === 'away' ? rank2 : rank1;
  const returnerRank = serving === 'away' ? rank1 : rank2;

  if (returnerRank < serverRank) {
    // Returner con ranking migliore: break più probabile
    breakProbability += 5;
  }

  return Math.min(50, Math.max(15, breakProbability));
}

/**
 * Calcola pressure dal punteggio
 */
function calculatePressureFromScore(score) {
  const sets = score.sets || [];
  if (sets.length === 0) return 50;

  let pressure = 40; // Base

  const currentSet = sets[sets.length - 1];
  const homeSets = sets.filter((s) => (s.home || 0) > (s.away || 0)).length;
  const awaySets = sets.filter((s) => (s.away || 0) > (s.home || 0)).length;

  // Set decisivo (1-1 in best of 3)
  if (homeSets === 1 && awaySets === 1) pressure += 20;

  // Punteggio stretto nel set corrente
  if (currentSet) {
    const diff = Math.abs((currentSet.home || 0) - (currentSet.away || 0));
    if (diff <= 1) pressure += 15;

    // Vicini al tiebreak
    if ((currentSet.home || 0) >= 5 && (currentSet.away || 0) >= 5) pressure += 10;
  }

  // Qualcuno sta per vincere il match
  if (homeSets === 2 || awaySets === 2) pressure += 15; // Match point/set imminente

  return Math.min(100, Math.max(20, pressure));
}

/**
 * Inferisci momentum dal punteggio
 */
function calculateMomentumFromScore(score) {
  const sets = score.sets || [];
  if (sets.length === 0) {
    return { trend: 'stable', recentSwing: 0, last5avg: 50, breakCount: 0 };
  }

  // Guarda l'ultimo set vs precedenti
  const currentSet = sets[sets.length - 1];
  const prevSets = sets.slice(0, -1);

  let trend = 'stable';
  let recentSwing = 0;

  if (prevSets.length > 0) {
    const lastPrev = prevSets[prevSets.length - 1];
    const prevWinner = (lastPrev.home || 0) > (lastPrev.away || 0) ? 'home' : 'away';

    // Chi sta vincendo il set corrente?
    const currentLeader =
      (currentSet.home || 0) > (currentSet.away || 0)
        ? 'home'
        : (currentSet.away || 0) > (currentSet.home || 0)
        ? 'away'
        : null;

    if (currentLeader && currentLeader !== prevWinner) {
      trend = currentLeader === 'home' ? 'home_rising' : 'away_rising';
      recentSwing = 20;
    }
  }

  // Stima game vinti recenti
  const homeGames = currentSet.home || 0;
  const awayGames = currentSet.away || 0;
  const total = homeGames + awayGames || 1;
  const homeRatio = homeGames / total;
  const last5avg = 50 + (homeRatio - 0.5) * 60;

  return {
    trend,
    recentSwing,
    last5avg: Math.round(last5avg),
    breakCount: Math.max(0, Math.min(homeGames, awayGames) - 1), // Stima break come min(games) - 1
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
};
