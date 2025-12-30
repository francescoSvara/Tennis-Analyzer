/**
 * 📊 FALLBACK CALCULATIONS
 *
 * Fallback functions used when primary data sources are unavailable.
 * All functions guarantee returning values (never null) per FILOSOFIA_CALCOLI.
 *
 * @module features/fallbacks
 * @see docs/filosofie/FILOSOFIA_STATS_V3.md
 */

// ============================================================================
// VOLATILITY FALLBACKS
// ============================================================================

/**
 * Calcola volatility dal punteggio quando non ci sono powerRankings
 * @param {Object} score - Match score { sets: [...] }
 * @returns {number} Volatility 0-100
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

// ============================================================================
// DOMINANCE FALLBACKS
// ============================================================================

/**
 * Calcola dominance dal punteggio
 * @param {Object} score - Match score { sets: [...] }
 * @returns {{ dominance: number, dominantPlayer: string }}
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
 * @param {Object|Array} odds - Odds data
 * @returns {{ dominance: number, dominantPlayer: string }}
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

// ============================================================================
// SERVE DOMINANCE FALLBACKS
// ============================================================================

/**
 * Stima serve dominance dai rankings
 * @param {Object} player1 - Player 1 data with ranking
 * @param {Object} player2 - Player 2 data with ranking
 * @param {string} serving - Who is serving: 'home' | 'away'
 * @returns {{ serveDominance: number, returnDominance: number }}
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

// ============================================================================
// BREAK PROBABILITY FALLBACKS
// ============================================================================

/**
 * Stima break probability da odds/rankings
 * @param {Object|Array} odds - Odds data
 * @param {Object} player1 - Player 1 data with ranking
 * @param {Object} player2 - Player 2 data with ranking
 * @param {string} serving - Who is serving: 'home' | 'away'
 * @returns {number} Break probability 0-100
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

// ============================================================================
// PRESSURE FALLBACKS
// ============================================================================

/**
 * Calcola pressure dal punteggio
 * @param {Object} score - Match score { sets: [...] }
 * @returns {number} Pressure 0-100
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

// ============================================================================
// MOMENTUM FALLBACKS
// ============================================================================

/**
 * Inferisci momentum dal punteggio
 * @param {Object} score - Match score { sets: [...] }
 * @returns {Object} Momentum indicators
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

module.exports = {
  // Volatility
  calculateVolatilityFromScore,
  // Dominance
  calculateDominanceFromScore,
  calculateDominanceFromOdds,
  // Serve Dominance
  calculateServeDominanceFromRankings,
  // Break Probability
  calculateBreakProbabilityFromOddsRankings,
  // Pressure
  calculatePressureFromScore,
  // Momentum
  calculateMomentumFromScore,
};
