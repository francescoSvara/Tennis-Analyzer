/**
 * BREAK DETECTOR
 *
 * Detects breaks from set scores WITHOUT point-by-point data.
 * Useful for XLSX data where we only have W1/L1, W2/L2, etc.
 *
 * @module breakDetector
 * @see FILOSOFIA_STATS.md - Section "Break Detection"
 */

// ============================================================================
// CORE BREAK DETECTION
// ============================================================================

/**
 * Detects breaks from a single set score
 *
 * In tennis:
 * - First server serves odd games (1, 3, 5, 7...)
 * - Second server serves even games (2, 4, 6, 8...)
 * - If a player wins more games than they served = they got breaks
 *
 * @param {Object} setScore - { home: number, away: number }
 * @param {string} firstServer - 'home' or 'away' (who served first in set)
 * @returns {Object} Break analysis for the set
 */
function detectBreaksFromScore(setScore, firstServer = 'home') {
  const { home, away } = setScore;
  const totalGames = home + away;

  // Handle invalid input
  if (totalGames === 0) {
    return {
      home_breaks: 0,
      away_breaks: 0,
      total_breaks: 0,
      break_advantage: 0,
      is_tiebreak: false,
      first_server: firstServer,
      confidence: 0,
    };
  }

  // Calculate how many games each player served
  // First server serves games 1, 3, 5, 7... (odd)
  // Second server serves games 2, 4, 6, 8... (even)
  const oddGames = Math.ceil(totalGames / 2); // 1st, 3rd, 5th...
  const evenGames = Math.floor(totalGames / 2); // 2nd, 4th, 6th...

  const homeServeGames = firstServer === 'home' ? oddGames : evenGames;
  const awayServeGames = firstServer === 'away' ? oddGames : evenGames;

  // Games won on return = breaks
  // If home won 6 games but only served 5 = home got 1 break on away's serve
  // This is simplified: home_breaks = games won - games served IF positive

  // More accurate calculation:
  // In a non-tiebreak set, winner must break at least once (unless tiebreak)
  // If score is 6-4: total 10 games, 5 served each (if first server)
  // Winner (6) served 5, won 6 = got 1 game on opponent's serve = 1 break

  const isTiebreak = (home === 7 && away === 6) || (home === 6 && away === 7);

  // For non-tiebreak sets:
  // The difference between games won and expected holds equals net breaks
  let homeBreaks = 0;
  let awayBreaks = 0;

  if (!isTiebreak) {
    // Expected holds = games served
    // Actual result shows breaks
    // Net calculation: if home won 6, served 5, got 1 break (or opponent got broken once)

    // Method: In a set, the game difference tells us about break differential
    // 6-4 = +2 games for winner = 1 break advantage typically
    // 6-3 = +3 games = could be 2 breaks vs 1 (net +1) or other combos
    // 6-0 = +6 games = typically 2 breaks with no breaks received

    // Minimum breaks for winner:
    // To win 6-4: need at least 1 break
    // To win 6-3: need at least 1 break (could have 2 if lost serve once)
    // To win 6-2: need at least 2 breaks (or 1 break if opponent double-broke)
    // To win 6-1: need at least 2 breaks
    // To win 6-0: need at least 2 breaks (perfect = 2 breaks, no breaks given)

    const winner = home > away ? 'home' : 'away';
    const winnerGames = Math.max(home, away);
    const loserGames = Math.min(home, away);
    const diff = winnerGames - loserGames;

    // Estimate minimum breaks needed by winner
    // Winner serves ceil((winnerGames + loserGames)/2) or floor depending on first server
    // Winner's breaks = winner's games - winner's holds
    // Winner's holds = winner's serve games - opponent's breaks on winner's serve

    // Simplified estimation based on game difference:
    if (diff === 2) {
      // 6-4, 7-5: typically 1 break difference
      if (winner === 'home') {
        homeBreaks = 1;
        awayBreaks = 0;
      } else {
        awayBreaks = 1;
        homeBreaks = 0;
      }
    } else if (diff === 3) {
      // 6-3: 1-2 breaks typically
      if (winner === 'home') {
        homeBreaks = 2;
        awayBreaks = 1;
      } else {
        awayBreaks = 2;
        homeBreaks = 1;
      }
    } else if (diff === 4) {
      // 6-2: 2 breaks with 0 or 2 with 0
      if (winner === 'home') {
        homeBreaks = 2;
        awayBreaks = 0;
      } else {
        awayBreaks = 2;
        homeBreaks = 0;
      }
    } else if (diff === 5) {
      // 6-1: 2 breaks minimum
      if (winner === 'home') {
        homeBreaks = 2;
        awayBreaks = 0;
      } else {
        awayBreaks = 2;
        homeBreaks = 0;
      }
    } else if (diff === 6) {
      // 6-0: bagel, exactly 2 breaks
      if (winner === 'home') {
        homeBreaks = 2;
        awayBreaks = 0;
      } else {
        awayBreaks = 2;
        homeBreaks = 0;
      }
    } else if (diff === 1 && winnerGames === 7) {
      // 7-5: went to 5-5, one break decided it
      if (winner === 'home') {
        homeBreaks = 1;
        awayBreaks = 0;
      } else {
        awayBreaks = 1;
        homeBreaks = 0;
      }
    }

    // More accurate calculation using serve pattern
    // This overrides the simplified estimation when we can be more precise
    const homeExpectedHolds = homeServeGames;
    const awayExpectedHolds = awayServeGames;

    // If home won more than their serve games, they broke
    // But we also need to consider the final score
    const homeReturnGamesWon = Math.max(0, home - homeExpectedHolds);
    const awayReturnGamesWon = Math.max(0, away - awayExpectedHolds);

    // These are minimum estimates - could be higher if there were rebreaks
    if (homeReturnGamesWon > 0) homeBreaks = Math.max(homeBreaks, homeReturnGamesWon);
    if (awayReturnGamesWon > 0) awayBreaks = Math.max(awayBreaks, awayReturnGamesWon);
  } else {
    // Tiebreak set (7-6 or 6-7)
    // In a tiebreak, typically 1 break each in the set OR no breaks and TB decides
    // Most common: 0 breaks, tiebreak decides
    // But could be 1-1 breaks (each broke once, went to TB)

    // Conservative estimate: no break in set, TB decided
    homeBreaks = 0;
    awayBreaks = 0;

    // Note: The tiebreak winner is who wins 7-6
    // This doesn't indicate a "break" in traditional sense
  }

  return {
    home_breaks: homeBreaks,
    away_breaks: awayBreaks,
    total_breaks: homeBreaks + awayBreaks,
    break_advantage: homeBreaks - awayBreaks,
    is_tiebreak: isTiebreak,
    first_server: firstServer,
    set_score: `${home}-${away}`,
    winner: home > away ? 'home' : 'away',
    confidence: isTiebreak ? 0.7 : 0.85, // Tiebreaks harder to analyze
  };
}

/**
 * Analyzes all sets in a match for breaks
 *
 * @param {Object} matchData - Match data with w1/l1, w2/l2, etc.
 * @returns {Object} Complete break analysis
 */
function analyzeSetBreaks(matchData) {
  const sets = [];
  let totalHomeBreaks = 0;
  let totalAwayBreaks = 0;

  // First server alternates each set (simplified assumption)
  // In reality, the loser of previous set often serves first in next
  // But for estimation, alternating is reasonable
  let currentFirstServer = estimateFirstServer(matchData);

  // Parse set scores
  for (let i = 1; i <= 5; i++) {
    const wGames = matchData[`w${i}`];
    const lGames = matchData[`l${i}`];

    if (wGames === undefined || wGames === null || lGames === undefined || lGames === null) {
      break;
    }

    // Convert to home/away perspective
    // Assuming winner_name is home perspective (this may need adjustment)
    const homeGames = wGames;
    const awayGames = lGames;

    const setAnalysis = detectBreaksFromScore(
      { home: homeGames, away: awayGames },
      currentFirstServer
    );

    sets.push({
      set_number: i,
      score: { home: homeGames, away: awayGames },
      ...setAnalysis,
      estimated_first_server: currentFirstServer,
    });

    totalHomeBreaks += setAnalysis.home_breaks;
    totalAwayBreaks += setAnalysis.away_breaks;

    // Alternate first server for next set
    currentFirstServer = currentFirstServer === 'home' ? 'away' : 'home';
  }

  // Determine if match was close (fewer breaks = more competitive on serve)
  const avgBreaksPerSet = sets.length > 0 ? (totalHomeBreaks + totalAwayBreaks) / sets.length : 0;

  const matchWasClose = avgBreaksPerSet < 2.5;

  return {
    match_id: matchData.id,

    sets,

    match_summary: {
      total_home_breaks: totalHomeBreaks,
      total_away_breaks: totalAwayBreaks,
      total_breaks: totalHomeBreaks + totalAwayBreaks,
      break_differential: totalHomeBreaks - totalAwayBreaks,
      avg_breaks_per_set: parseFloat(avgBreaksPerSet.toFixed(2)),
      match_was_close: matchWasClose,
      sets_played: sets.length,
    },

    insights: generateBreakInsights(sets, totalHomeBreaks, totalAwayBreaks),
  };
}

/**
 * Estimates who served first in the match
 *
 * @param {Object} matchData - Match data with rankings
 * @returns {string} 'home' or 'away'
 */
function estimateFirstServer(matchData) {
  // The favorite (better ranking) typically chooses to serve first
  // In about 60% of matches, the favorite serves first

  const homeRanking = matchData.winner_rank || matchData.wrank || 999;
  const awayRanking = matchData.loser_rank || matchData.lrank || 999;

  // Lower ranking number = better player
  if (homeRanking < awayRanking) return 'home';
  if (awayRanking < homeRanking) return 'away';

  // Default to home
  return 'home';
}

/**
 * Generates insights from break analysis
 */
function generateBreakInsights(sets, totalHomeBreaks, totalAwayBreaks) {
  const insights = {
    dominant_server: null,
    first_break_pattern: null,
    break_back_tendency: null,
    decisive_set_analysis: null,
  };

  // Determine dominant server
  const breakDiff = totalHomeBreaks - totalAwayBreaks;
  if (breakDiff >= 2) {
    insights.dominant_server = 'away'; // Away held better, home broke more
  } else if (breakDiff <= -2) {
    insights.dominant_server = 'home'; // Home held better, away broke more
  }

  // Analyze first set break pattern
  if (sets.length > 0) {
    const firstSet = sets[0];
    insights.first_break_pattern = {
      home_broke_first_set: firstSet.home_breaks > 0,
      away_broke_first_set: firstSet.away_breaks > 0,
      first_set_was_tight: firstSet.total_breaks <= 1,
    };
  }

  // Break-back tendency (did loser of first set come back?)
  if (sets.length >= 2) {
    const firstSetWinner = sets[0].home_breaks > sets[0].away_breaks ? 'home' : 'away';
    const secondSetWinner = sets[1].home_breaks > sets[1].away_breaks ? 'home' : 'away';

    // If different winner in set 2, there was a "break back" in momentum
    insights.break_back_tendency = firstSetWinner !== secondSetWinner;
  }

  // Decisive set analysis
  const decidingSet = sets.length === 3 ? sets[2] : sets.length === 5 ? sets[4] : null;
  if (decidingSet) {
    insights.decisive_set_analysis = {
      set_number: decidingSet.set_number,
      total_breaks: decidingSet.total_breaks,
      was_close: decidingSet.total_breaks <= 2,
      winner: decidingSet.home_breaks > decidingSet.away_breaks ? 'home' : 'away',
    };
  }

  return insights;
}

// ============================================================================
// PATTERN ANALYSIS
// ============================================================================

/**
 * Analyzes break patterns across multiple matches for a player
 *
 * @param {Array} matches - Array of match data with break analysis
 * @param {string} playerName - Player to analyze (as home or away)
 * @returns {Object} Pattern analysis
 */
function analyzeBreakPatterns(matches, playerName) {
  let totalMatches = 0;
  let totalBreaksGiven = 0;
  let totalBreaksTaken = 0;
  let firstSetBreakWins = 0;
  let firstSetBreakTotal = 0;

  for (const match of matches) {
    const isHome = match.player_role === 'winner' || match.winner_name?.includes(playerName);

    // Get break analysis
    const breakAnalysis = analyzeSetBreaks(match);

    if (breakAnalysis.sets.length === 0) continue;

    totalMatches++;

    // Sum breaks
    const playerBreaks = isHome
      ? breakAnalysis.match_summary.total_home_breaks
      : breakAnalysis.match_summary.total_away_breaks;

    const opponentBreaks = isHome
      ? breakAnalysis.match_summary.total_away_breaks
      : breakAnalysis.match_summary.total_home_breaks;

    totalBreaksTaken += playerBreaks;
    totalBreaksGiven += opponentBreaks;

    // First set break analysis
    const firstSet = breakAnalysis.sets[0];
    const playerFirstSetBreaks = isHome ? firstSet.home_breaks : firstSet.away_breaks;

    if (playerFirstSetBreaks > 0) {
      firstSetBreakTotal++;
      // Check if player won match after getting first set break
      if (match.player_role === 'winner') {
        firstSetBreakWins++;
      }
    }
  }

  return {
    total_matches: totalMatches,

    break_stats: {
      total_breaks_taken: totalBreaksTaken,
      total_breaks_given: totalBreaksGiven,
      break_differential: totalBreaksTaken - totalBreaksGiven,
      avg_breaks_per_match: totalMatches > 0 ? totalBreaksTaken / totalMatches : 0,
      avg_breaks_given_per_match: totalMatches > 0 ? totalBreaksGiven / totalMatches : 0,
    },

    first_set_break: {
      matches_with_first_set_break: firstSetBreakTotal,
      wins_after_first_set_break: firstSetBreakWins,
      conversion_rate: firstSetBreakTotal > 0 ? firstSetBreakWins / firstSetBreakTotal : 0,
    },

    assessment: {
      is_strong_breaker: totalBreaksTaken / Math.max(totalMatches, 1) > 2.5,
      is_strong_holder: totalBreaksGiven / Math.max(totalMatches, 1) < 2,
      net_break_positive: totalBreaksTaken > totalBreaksGiven,
    },
  };
}

/**
 * Classifies a set based on break activity
 *
 * @param {Object} setAnalysis - Set break analysis
 * @returns {Object} Classification
 */
function classifySet(setAnalysis) {
  const { total_breaks, is_tiebreak, home_breaks, away_breaks } = setAnalysis;

  let classification;
  let description;

  if (is_tiebreak && total_breaks === 0) {
    classification = 'SERVE_DOMINATED';
    description = 'Both players held all service games, decided by tiebreak';
  } else if (total_breaks <= 1) {
    classification = 'TIGHT';
    description = 'Very few breaks, competitive serving';
  } else if (total_breaks <= 3) {
    classification = 'BALANCED';
    description = 'Normal break activity';
  } else if (total_breaks <= 5) {
    classification = 'ACTIVE';
    description = 'Many breaks exchanged';
  } else {
    classification = 'CHAOTIC';
    description = 'Extremely high break count, unstable serving';
  }

  // One-sided?
  const breakDiff = Math.abs(home_breaks - away_breaks);
  const isOneSided = breakDiff >= 2;

  return {
    classification,
    description,
    is_one_sided: isOneSided,
    dominant_player: isOneSided ? (home_breaks > away_breaks ? 'home' : 'away') : null,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates set score
 */
function isValidSetScore(home, away) {
  // Valid tennis set scores
  if (home < 0 || away < 0) return false;
  if (home > 7 || away > 7) return false;

  // Winner must have at least 6
  const winner = Math.max(home, away);
  const loser = Math.min(home, away);

  if (winner < 6) return false;
  if (winner === 6 && loser > 4) return false; // 6-5 is not a valid final score
  if (winner === 7 && loser !== 5 && loser !== 6) return false; // 7-5 or 7-6 only

  return true;
}

/**
 * Calculates break efficiency from raw data
 */
function calculateBreakEfficiency(breakPointsWon, breakPointsTotal) {
  if (!breakPointsTotal || breakPointsTotal === 0) return 0;
  return breakPointsWon / breakPointsTotal;
}

// ============================================================================
// CALCULATE BREAKS FROM POINT-BY-POINT (FILOSOFIA_FRONTEND compliance)
// ============================================================================

/**
 * Calculate breaks from point-by-point data
 * Moved from server.js for modularity (FILOSOFIA_FRONTEND)
 *
 * @param {Array} pointByPoint - Array di set con games e points
 * @returns {Map} Mappa "set-game" -> boolean (true se break)
 */
function calculateBreaksFromPbp(pointByPoint) {
  const breakMap = new Map();

  if (!pointByPoint || !Array.isArray(pointByPoint)) {
    return breakMap;
  }

  for (const setData of pointByPoint) {
    const setNumber = setData.set || 1;

    for (const gameData of setData.games || []) {
      const gameNumber = gameData.game || 1;
      const key = `${setNumber}-${gameNumber}`;

      // game.score contiene {serving, scoring, homeScore, awayScore}
      const score = gameData.score;
      if (score && score.serving !== undefined && score.scoring !== undefined) {
        // scoring=-1 significa game non completato, non è un break
        if (score.scoring === -1) {
          breakMap.set(key, false);
          continue;
        }

        // BREAK = serving !== scoring (chi serve perde il game)
        // serving=1 (home) + scoring=2 (away wins) = BREAK per away
        // serving=2 (away) + scoring=1 (home wins) = BREAK per home
        // serving=1 (home) + scoring=1 (home wins) = HOLD
        // serving=2 (away) + scoring=2 (away wins) = HOLD
        const isBreak = score.serving !== score.scoring;
        breakMap.set(key, isBreak);
      }
    }
  }

  return breakMap;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core functions
  detectBreaksFromScore,
  analyzeSetBreaks,

  // Pattern analysis
  analyzeBreakPatterns,
  classifySet,

  // Point-by-point (FILOSOFIA_FRONTEND)
  calculateBreaksFromPbp,

  // Utilities
  estimateFirstServer,
  generateBreakInsights,
  isValidSetScore,
  calculateBreakEfficiency,
};
