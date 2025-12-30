/**
 * 📊 ODDS FEATURES
 *
 * Calculates odds-derived features: implied probability, overround, fair odds.
 *
 * @module features/odds
 * @see docs/filosofie/FILOSOFIA_ODDS.md
 */

// ============================================================================
// MAIN ODDS FEATURES CALCULATION
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

module.exports = {
  calculateOddsFeatures,
};
