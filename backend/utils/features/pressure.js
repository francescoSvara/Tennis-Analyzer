/**
 * 📊 PRESSURE FEATURE
 *
 * Pressure context builder and clutch point detection.
 * Builds match context for pressure calculation and detects critical moments.
 *
 * @module features/pressure
 * @see docs/filosofie/FILOSOFIA_STATS_V3.md
 */

// ============================================================================
// PRESSURE MATCH CONTEXT BUILDER
// ============================================================================

/**
 * Build matchContext for pressureCalculator from available match data.
 * This enables context multipliers (clutch, momentum, deciding set, etc.)
 *
 * @param {Object} params
 * @param {Object} params.score - Match score { sets: [...] }
 * @param {string} params.serving - Who is serving: 'home' | 'away'
 * @param {string} params.gameScore - Current game score (e.g., "30-40")
 * @param {Object} params.momentum - Momentum object from calculateRecentMomentum
 * @returns {Object} Match context for pressure calculation
 */
function buildPressureMatchContext({ score = {}, serving = 'home', gameScore = null, momentum = {} }) {
  const sets = score.sets || [];
  const currentSetIndex = sets.length > 0 ? sets.length : 1;
  const currentSet = sets.length > 0 ? sets[sets.length - 1] : { home: 0, away: 0 };

  // deciding set heuristic (best-of-3 typical):
  // if 1-1 sets after 2 sets => deciding set
  let homeSetsWon = 0;
  let awaySetsWon = 0;
  for (const s of sets.slice(0, -1)) {
    if ((s.home || 0) > (s.away || 0)) homeSetsWon++;
    else if ((s.away || 0) > (s.home || 0)) awaySetsWon++;
  }
  const isDecidingSet = homeSetsWon === 1 && awaySetsWon === 1;

  const isTB = Boolean(currentSet.tiebreak) || (currentSet.home === 6 && currentSet.away === 6);

  // Determine clutch flags from gameScore (simple but reliable)
  const clutch = deriveClutchFlagsFromGameScore(gameScore, serving);

  // Map momentum object (PR-based) to a signed momentum scalar:
  // existing momentum.last5avg is PR avg (home positive, away negative)
  const momScalar = typeof momentum?.last5avg === 'number' ? momentum.last5avg : 0;

  return {
    currentSet: currentSetIndex,
    currentGame: `${currentSet.home || 0}-${currentSet.away || 0}`,
    isDecidingSet,
    isTiebreak: isTB,

    isBreakPoint: clutch.isBreakPoint,
    isSetPoint: clutch.isSetPoint,
    isMatchPoint: clutch.isMatchPoint,

    // pressureCalculator expects "momentum" in [-100..+100] style
    momentum: momScalar,

    setsWon: serving === 'home' ? homeSetsWon : awaySetsWon,
    setsLost: serving === 'home' ? awaySetsWon : homeSetsWon,
  };
}

/**
 * Derive clutch point flags from gameScore string.
 * Minimal safe heuristic for break points.
 *
 * @param {string} gameScore - Game score string (e.g., "30-40")
 * @param {string} serving - Who is serving: 'home' | 'away'
 * @returns {Object} { isBreakPoint, isSetPoint, isMatchPoint }
 */
function deriveClutchFlagsFromGameScore(gameScore, serving) {
  if (!gameScore || typeof gameScore !== 'string' || !gameScore.includes('-')) {
    return { isBreakPoint: false, isSetPoint: false, isMatchPoint: false };
  }

  const [left, right] = gameScore.split('-').map((x) => x.trim().toUpperCase());
  const toVal = (p) => (p === 'A' || p === 'AD' ? 50 : parseInt(p, 10) || 0);

  // gameScore appears oriented as "server-returner" in strategy checks (e.g. '0-40')
  const serverPts = toVal(left);
  const returnerPts = toVal(right);

  const isBreakPoint =
    (returnerPts >= 40 && serverPts < 40) || (returnerPts === 50); // AD on return side

  return { isBreakPoint, isSetPoint: false, isMatchPoint: false };
}

// ============================================================================
// CLUTCH POINT DETECTION
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

module.exports = {
  buildPressureMatchContext,
  deriveClutchFlagsFromGameScore,
  isClutchPoint,
};
