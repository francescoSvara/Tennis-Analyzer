/**
 * MATCH SEGMENTER
 *
 * Divides a tennis match into logical segments for targeted analysis.
 * Each point/game belongs to one or more segments.
 *
 * @module matchSegmenter
 * @see FILOSOFIA_STATS.md - Section "Match Segmentation Engine"
 */

// ============================================================================
// SEGMENT DEFINITIONS
// ============================================================================

/**
 * Segment types and their definitions
 */
const SEGMENTS = {
  PRE_FIRST_BREAK: {
    code: 'PRE_FIRST_BREAK',
    name: 'Pre First Break',
    description: 'From first point until first break',
    trading_importance: 'MEDIUM',
  },
  POST_FIRST_BREAK: {
    code: 'POST_FIRST_BREAK',
    name: 'Post First Break',
    description: 'From game after first break to end of set',
    trading_importance: 'HIGH',
  },
  CRITICAL_GAMES: {
    code: 'CRITICAL_GAMES',
    name: 'Critical Games',
    description: 'Score 4-4, 5-5, 6-6 or tiebreak',
    trading_importance: 'VERY_HIGH',
  },
  SET_CLOSING: {
    code: 'SET_CLOSING',
    name: 'Set Closing',
    description: 'Game that can decide the set',
    trading_importance: 'HIGH',
  },
  MATCH_CLOSING: {
    code: 'MATCH_CLOSING',
    name: 'Match Closing',
    description: 'Game that can decide the match',
    trading_importance: 'VERY_HIGH',
  },
  MOMENTUM_SHIFT: {
    code: 'MOMENTUM_SHIFT',
    name: 'Momentum Shift',
    description: 'Game where momentum changes > 25 points',
    trading_importance: 'HIGH',
  },
  SERVE_PRESSURE: {
    code: 'SERVE_PRESSURE',
    name: 'Serve Under Pressure',
    description: 'Service game with break points against',
    trading_importance: 'HIGH',
  },
  BREAK_OPPORTUNITY: {
    code: 'BREAK_OPPORTUNITY',
    name: 'Break Opportunity',
    description: 'Return game with break points',
    trading_importance: 'MEDIUM',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Checks if game score represents a critical game
 * @param {number} homeGames - Home player games in set
 * @param {number} awayGames - Away player games in set
 * @param {boolean} isInTiebreak - Whether in tiebreak
 * @returns {boolean}
 */
function isCriticalGame(homeGames, awayGames, isInTiebreak = false) {
  if (isInTiebreak) return true;

  // 4-4, 5-5, 6-6
  if (homeGames === awayGames && homeGames >= 4) return true;

  // 5-4 or 4-5 (serving for the set)
  if (Math.max(homeGames, awayGames) === 5 && Math.min(homeGames, awayGames) === 4) return true;

  // 6-5 or 5-6 (must hold to force tiebreak or win)
  if (Math.max(homeGames, awayGames) === 6 && Math.min(homeGames, awayGames) === 5) return true;

  return false;
}

/**
 * Checks if game is a set-closing opportunity
 * @param {number} homeGames - Home games
 * @param {number} awayGames - Away games
 * @param {string} server - 'home' or 'away'
 * @returns {Object|null}
 */
function isSetClosingGame(homeGames, awayGames, server) {
  // Server can close the set
  if (server === 'home' && homeGames >= 5 && homeGames > awayGames && homeGames - awayGames >= 1) {
    return { server: 'home', canWinSet: true, gamesNeeded: 1 };
  }
  if (server === 'away' && awayGames >= 5 && awayGames > homeGames && awayGames - homeGames >= 1) {
    return { server: 'away', canWinSet: true, gamesNeeded: 1 };
  }

  // In tiebreak, either can close
  if (homeGames === 6 && awayGames === 6) {
    return { server, canWinSet: true, gamesNeeded: 1, isTiebreak: true };
  }

  return null;
}

/**
 * Checks if game is a match-closing opportunity
 * @param {number} homeSets - Home sets won
 * @param {number} awaySets - Away sets won
 * @param {number} homeGames - Home games in current set
 * @param {number} awayGames - Away games in current set
 * @param {string} server - 'home' or 'away'
 * @param {number} bestOf - 3 or 5
 * @returns {Object|null}
 */
function isMatchClosingGame(homeSets, awaySets, homeGames, awayGames, server, bestOf = 3) {
  const setsToWin = Math.ceil(bestOf / 2);

  // Check if either player can close the match with set win
  const homeCanCloseMatch = homeSets === setsToWin - 1;
  const awayCanCloseMatch = awaySets === setsToWin - 1;

  if (!homeCanCloseMatch && !awayCanCloseMatch) return null;

  // Check if current game can decide set (and therefore match)
  const setClosing = isSetClosingGame(homeGames, awayGames, server);

  if (!setClosing) return null;

  if (homeCanCloseMatch && setClosing.server === 'home') {
    return { player: 'home', canWinMatch: true, setClosing };
  }
  if (awayCanCloseMatch && setClosing.server === 'away') {
    return { player: 'away', canWinMatch: true, setClosing };
  }

  return null;
}

/**
 * Detects momentum shift between consecutive games
 * @param {number} prevValue - Previous game momentum value
 * @param {number} currValue - Current game momentum value
 * @param {number} threshold - Minimum change to consider shift (default: 25)
 * @returns {Object|null}
 */
function detectMomentumShift(prevValue, currValue, threshold = 25) {
  const delta = currValue - prevValue;

  if (Math.abs(delta) < threshold) return null;

  return {
    delta,
    direction: delta > 0 ? 'to_home' : 'to_away',
    magnitude: Math.abs(delta) > 40 ? 'MAJOR' : 'SIGNIFICANT',
    from_value: prevValue,
    to_value: currValue,
  };
}

/**
 * Determines who is serving based on game number (alternating service)
 * @param {number} setNumber - Current set
 * @param {number} gameNumber - Current game in set
 * @param {string} firstServer - Who served first in match ('home' or 'away')
 * @returns {string} 'home' or 'away'
 */
function getServerForGame(setNumber, gameNumber, firstServer = 'home') {
  // In each set, first server alternates
  // Within set, servers alternate each game
  const setAlternation = (setNumber - 1) % 2;
  const gameAlternation = (gameNumber - 1) % 2;

  const totalAlternations = setAlternation + gameAlternation;

  if (firstServer === 'home') {
    return totalAlternations % 2 === 0 ? 'home' : 'away';
  } else {
    return totalAlternations % 2 === 0 ? 'away' : 'home';
  }
}

// ============================================================================
// MAIN SEGMENTATION FUNCTION
// ============================================================================

/**
 * Segments a match into logical phases
 *
 * @param {Object} matchData - Match data object containing:
 *   - scores: { period1: {home, away}, period2: {...} }
 *   - powerRankings: [{ set, game, value, breakOccurred }]
 *   - statistics: optional additional stats
 *   - bestOf: 3 or 5
 *   - firstServer: 'home' or 'away' (optional)
 * @returns {Object} Segmentation analysis
 */
function segmentMatch(matchData) {
  const {
    scores = {},
    powerRankings = [],
    statistics = {},
    bestOf = 3,
    firstServer = 'home',
  } = matchData;

  const segmentation = {
    match_id: matchData.id || matchData.match_id,

    segments: {
      PRE_FIRST_BREAK: null,
      POST_FIRST_BREAK: null,
      CRITICAL_GAMES: [],
      SET_CLOSING: [],
      MATCH_CLOSING: [],
      MOMENTUM_SHIFTS: [],
      SERVE_PRESSURE: [],
      BREAK_OPPORTUNITY: [],
    },

    summary: {
      total_critical_games: 0,
      home_critical_games_won: 0,
      away_critical_games_won: 0,
      momentum_shifts_count: 0,
      avg_break_response_games: 0,
      set_closing_efficiency: 0,
    },

    sets_analyzed: 0,
    total_games_analyzed: 0,
  };

  // Track state across the match
  let firstBreakFound = false;
  let firstBreakGame = null;
  let previousMomentum = null;
  let currentSetGames = { home: 0, away: 0 };
  let currentSets = { home: 0, away: 0 };
  let breakResponseGames = [];
  let setClosingAttempts = 0;
  let setClosingSuccesses = 0;

  // Analyze power rankings game by game
  for (let i = 0; i < powerRankings.length; i++) {
    const pr = powerRankings[i];
    const { set, game, value, breakOccurred } = pr;

    segmentation.total_games_analyzed++;

    // Update set tracking
    if (set > segmentation.sets_analyzed) {
      segmentation.sets_analyzed = set;
      // Reset game counters for new set
      currentSetGames = { home: 0, away: 0 };
    }

    // Determine server for this game
    const server = getServerForGame(set, game, firstServer);

    // === BREAK DETECTION ===
    if (breakOccurred && !firstBreakFound) {
      firstBreakFound = true;
      firstBreakGame = { set, game };

      // Set PRE_FIRST_BREAK segment
      segmentation.segments.PRE_FIRST_BREAK = {
        start_game: { set: 1, game: 1 },
        end_game: { set, game: game - 1 },
        total_games: game - 1,
        player_with_break: server === 'home' ? 'away' : 'home', // Breaker is not server
      };

      // Start POST_FIRST_BREAK
      segmentation.segments.POST_FIRST_BREAK = {
        start_game: { set, game },
        break_holder: server === 'home' ? 'away' : 'home',
        break_holder_performance: 'IN_PROGRESS',
      };
    }

    // Track break response if we're in POST_FIRST_BREAK
    if (
      firstBreakFound &&
      segmentation.segments.POST_FIRST_BREAK?.break_holder_performance === 'IN_PROGRESS'
    ) {
      // Check if break was returned
      if (breakOccurred && game > firstBreakGame.game) {
        const responseGames = game - firstBreakGame.game;
        breakResponseGames.push(responseGames);
        segmentation.segments.POST_FIRST_BREAK.break_holder_performance = 'BROKEN_BACK';
      }
    }

    // === CRITICAL GAMES ===
    // Parse score to determine game state (simplified)
    const isCritical = isCriticalGame(
      currentSetGames.home,
      currentSetGames.away,
      pr.isTiebreak || false
    );

    if (isCritical) {
      segmentation.segments.CRITICAL_GAMES.push({
        set,
        game,
        score: `${currentSetGames.home}-${currentSetGames.away}`,
        momentum_avg: value,
        server,
        is_tiebreak: pr.isTiebreak || false,
      });

      segmentation.summary.total_critical_games++;

      // Track who won critical games (simplified: use next game's momentum)
      if (i < powerRankings.length - 1) {
        const nextPr = powerRankings[i + 1];
        if (nextPr.value > value) {
          segmentation.summary.home_critical_games_won++;
        } else {
          segmentation.summary.away_critical_games_won++;
        }
      }
    }

    // === SET CLOSING ===
    const setClosing = isSetClosingGame(currentSetGames.home, currentSetGames.away, server);
    if (setClosing) {
      setClosingAttempts++;

      // Check if set was actually closed (simplified)
      const held = !breakOccurred;
      if (held) setClosingSuccesses++;

      segmentation.segments.SET_CLOSING.push({
        set,
        game,
        score: `${currentSetGames.home}-${currentSetGames.away}`,
        server,
        held,
        is_tiebreak: setClosing.isTiebreak || false,
      });
    }

    // === MATCH CLOSING ===
    const matchClosing = isMatchClosingGame(
      currentSets.home,
      currentSets.away,
      currentSetGames.home,
      currentSetGames.away,
      server,
      bestOf
    );

    if (matchClosing) {
      segmentation.segments.MATCH_CLOSING.push({
        set,
        game,
        score: `${currentSetGames.home}-${currentSetGames.away}`,
        sets_score: `${currentSets.home}-${currentSets.away}`,
        server,
        can_close: matchClosing.player,
        is_tiebreak: matchClosing.setClosing?.isTiebreak || false,
      });
    }

    // === MOMENTUM SHIFT ===
    if (previousMomentum !== null) {
      const shift = detectMomentumShift(previousMomentum, value);
      if (shift) {
        segmentation.segments.MOMENTUM_SHIFTS.push({
          game: { set, game },
          ...shift,
          cause: breakOccurred ? 'break_subito' : 'performance_change',
        });
        segmentation.summary.momentum_shifts_count++;
      }
    }
    previousMomentum = value;

    // === SERVE PRESSURE ===
    // Would need point-by-point for accurate BP tracking
    // Estimate from momentum: if server and momentum < -20, under pressure
    if (server === 'home' && value < -20) {
      segmentation.segments.SERVE_PRESSURE.push({
        set,
        game,
        server: 'home',
        pressure_level: value < -40 ? 'HIGH' : 'MODERATE',
        held: !breakOccurred,
      });
    } else if (server === 'away' && value > 20) {
      segmentation.segments.SERVE_PRESSURE.push({
        set,
        game,
        server: 'away',
        pressure_level: value > 40 ? 'HIGH' : 'MODERATE',
        held: !breakOccurred,
      });
    }

    // Update game counters (simplified - would need actual results)
    // This is an approximation; real implementation would use actual scores
    currentSetGames[server === 'home' ? 'home' : 'away']++;
  }

  // === FINALIZE SUMMARY ===
  segmentation.summary.avg_break_response_games =
    breakResponseGames.length > 0
      ? breakResponseGames.reduce((a, b) => a + b, 0) / breakResponseGames.length
      : 0;

  segmentation.summary.set_closing_efficiency =
    setClosingAttempts > 0 ? setClosingSuccesses / setClosingAttempts : 0;

  return segmentation;
}

// ============================================================================
// SEGMENT-SPECIFIC ANALYSIS
// ============================================================================

/**
 * Analyzes only critical games
 */
function analyzeCriticalGames(matchData) {
  const segmentation = segmentMatch(matchData);

  const criticalGames = segmentation.segments.CRITICAL_GAMES;

  if (criticalGames.length === 0) {
    return { critical_games: [], analysis: 'No critical games found' };
  }

  // Calculate stats
  const tiebreaks = criticalGames.filter((g) => g.is_tiebreak);
  const avgMomentum =
    criticalGames.reduce((sum, g) => sum + g.momentum_avg, 0) / criticalGames.length;

  return {
    critical_games: criticalGames,
    analysis: {
      total: criticalGames.length,
      tiebreaks: tiebreaks.length,
      avg_momentum_in_critical: avgMomentum,
      momentum_favorable_to: avgMomentum > 0 ? 'home' : avgMomentum < 0 ? 'away' : 'balanced',
      home_won: segmentation.summary.home_critical_games_won,
      away_won: segmentation.summary.away_critical_games_won,
    },
  };
}

/**
 * Analyzes momentum shifts throughout match
 */
function analyzeMomentumShifts(matchData) {
  const segmentation = segmentMatch(matchData);

  const shifts = segmentation.segments.MOMENTUM_SHIFTS;

  if (shifts.length === 0) {
    return { shifts: [], analysis: 'No significant momentum shifts' };
  }

  // Analyze patterns
  const majorShifts = shifts.filter((s) => s.magnitude === 'MAJOR');
  const breakRelated = shifts.filter((s) => s.cause === 'break_subito');
  const toHome = shifts.filter((s) => s.direction === 'to_home');
  const toAway = shifts.filter((s) => s.direction === 'to_away');

  return {
    shifts,
    analysis: {
      total: shifts.length,
      major_shifts: majorShifts.length,
      break_related: breakRelated.length,
      shifts_to_home: toHome.length,
      shifts_to_away: toAway.length,
      net_direction:
        toHome.length > toAway.length
          ? 'FAVORS_HOME'
          : toAway.length > toHome.length
          ? 'FAVORS_AWAY'
          : 'BALANCED',
      match_stability: shifts.length < 3 ? 'STABLE' : shifts.length < 6 ? 'MODERATE' : 'VOLATILE',
    },
  };
}

/**
 * Gets segment summary with trading recommendations
 */
function getSegmentSummary(matchData) {
  const segmentation = segmentMatch(matchData);

  const { segments, summary } = segmentation;

  // Trading insights
  const tradingInsights = [];

  // Check momentum shifts pattern
  if (summary.momentum_shifts_count > 5) {
    tradingInsights.push({
      type: 'WARNING',
      message: 'High volatility match - unpredictable swings',
      action: 'Consider smaller stakes or avoid',
    });
  }

  // Check set closing efficiency
  if (summary.set_closing_efficiency < 0.5 && segments.SET_CLOSING.length > 2) {
    tradingInsights.push({
      type: 'OPPORTUNITY',
      message: 'Poor set closing - potential for comebacks',
      action: 'Consider lay strategies on set leader',
    });
  }

  // Check critical games performance
  const criticalDiff = summary.home_critical_games_won - summary.away_critical_games_won;
  if (Math.abs(criticalDiff) >= 3) {
    tradingInsights.push({
      type: 'INFO',
      message: `${criticalDiff > 0 ? 'Home' : 'Away'} dominant in critical moments`,
      action: 'Factor into closing game predictions',
    });
  }

  return {
    ...segmentation,
    trading_insights: tradingInsights,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main segmentation
  segmentMatch,
  getSegmentSummary,

  // Specific analysis
  analyzeCriticalGames,
  analyzeMomentumShifts,

  // Helper functions
  isCriticalGame,
  isSetClosingGame,
  isMatchClosingGame,
  detectMomentumShift,
  getServerForGame,

  // Constants
  SEGMENTS,
};
