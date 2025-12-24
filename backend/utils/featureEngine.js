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
 * @property {string|null} dominantPlayer - 'home' | 'away' | null
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
    const swing = Math.abs((recentPR[i].value || 0) - (recentPR[i-1].value || 0));
    swingSum += swing;
  }
  
  const avgSwing = swingSum / Math.max(recentPR.length - 1, 1);
  
  // Count breaks in recent games
  const recentBreaks = recentPR.filter(pr => pr.breakOccurred).length;
  
  // High swings + many breaks = high volatility
  volatility = Math.min(100, Math.max(0,
    30 + // base
    (avgSwing * 1.5) + // swing contribution (0-30 typically)
    (recentBreaks * 10) // break contribution
  ));
  
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
 * @returns {{dominance: number, dominantPlayer: string|null}}
 */
function calculateDominance({ powerRankings = [], statistics = {} }) {
  // Get latest power ranking as dominance indicator
  if (powerRankings.length === 0) {
    return { dominance: 50, dominantPlayer: null };
  }
  
  const latestPR = powerRankings[powerRankings.length - 1];
  const prValue = latestPR.value || 0;
  
  // Convert PR value (-100 to +100) to dominance (0-100)
  // PR > 0 = home dominates, PR < 0 = away dominates
  const dominance = 50 + (prValue / 2);
  
  let dominantPlayer = null;
  if (prValue > 20) dominantPlayer = 'home';
  else if (prValue < -20) dominantPlayer = 'away';
  
  return {
    dominance: Math.round(Math.max(0, Math.min(100, dominance))),
    dominantPlayer
  };
}

// ============================================================================
// SERVE DOMINANCE
// ============================================================================

/**
 * Calculate serving/returning dominance from statistics
 * @param {Object} statistics - Match statistics (home/away)
 * @param {string} servingPlayer - 'home' | 'away'
 * @param {boolean} requireRealData - If true, returns null when no real data
 * @returns {{serveDominance: number|null, returnDominance: number|null}}
 */
function calculateServeDominance(statistics = {}, servingPlayer = 'home', requireRealData = false) {
  const defaults = { serveDominance: 50, returnDominance: 50 };
  const nullResult = { serveDominance: null, returnDominance: null };
  
  // Check if we have real statistics data
  const hasHomeStats = statistics.home && Object.keys(statistics.home).length > 0 &&
    (statistics.home.firstServePointsWonPct !== undefined || statistics.home.aces !== undefined);
  const hasAwayStats = statistics.away && Object.keys(statistics.away).length > 0 &&
    (statistics.away.firstServePointsWonPct !== undefined || statistics.away.aces !== undefined);
  
  if (!hasHomeStats && !hasAwayStats) {
    return requireRealData ? nullResult : defaults;
  }
  
  const server = servingPlayer === 'home' ? statistics.home : statistics.away;
  const returner = servingPlayer === 'home' ? statistics.away : statistics.home;
  
  if (!server || !returner) {
    return requireRealData ? nullResult : defaults;
  }
  
  // Server dominance based on serve stats
  const firstServeWon = parseFloat(server.firstServePointsWonPct) || 50;
  const secondServeWon = parseFloat(server.secondServePointsWonPct) || 35;
  const aces = parseInt(server.aces) || 0;
  const doubleFaults = parseInt(server.doubleFaults) || 0;
  
  // Weighted serve score
  let serveDominance = (
    (firstServeWon * 0.5) +
    (secondServeWon * 0.3) +
    (Math.min(aces * 5, 20)) - // Aces bonus, capped
    (Math.min(doubleFaults * 5, 20)) // DF penalty, capped
  );
  
  // Return dominance based on break points
  const bpWon = parseInt(returner.breakPointsWon) || 0;
  const bpTotal = parseInt(returner.breakPointsTotal) || 0;
  const bpPct = bpTotal > 0 ? (bpWon / bpTotal * 100) : 30;
  
  // Receiving points won
  const recPtsWon = parseFloat(returner.receiverPointsWonPct) || 30;
  
  let returnDominance = (bpPct * 0.5) + (recPtsWon * 0.5);
  
  return {
    serveDominance: Math.round(Math.max(0, Math.min(100, serveDominance))),
    returnDominance: Math.round(Math.max(0, Math.min(100, returnDominance)))
  };
}

// ============================================================================
// BREAK PROBABILITY
// ============================================================================

/**
 * Calculate probability of break this game
 * @param {Object} params
 * @param {Object} params.statistics - Match statistics
 * @param {string} params.server - Who is serving
 * @param {Object} params.gameScore - Current game score (e.g., "30-40")
 * @param {Array} params.powerRankings - Momentum history
 * @param {boolean} params.requireRealData - If true, returns null when no real data
 * @returns {number|null} Break probability 0-100 or null
 */
function calculateBreakProbability({ statistics = {}, server = 'home', gameScore = null, powerRankings = [], requireRealData = false }) {
  let baseProbability = 25; // Average break probability in tennis
  
  // Check if we have real statistics
  const hasStats = statistics.home && statistics.away &&
    (statistics.home.firstServePointsWonPct !== undefined || 
     statistics.away.firstServePointsWonPct !== undefined);
  
  if (!hasStats) {
    return requireRealData ? null : baseProbability;
  }
  
  const serverStats = server === 'home' ? statistics.home : statistics.away;
  const returnerStats = server === 'home' ? statistics.away : statistics.home;
  
  if (!serverStats || !returnerStats) {
    return requireRealData ? null : baseProbability;
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
  const bpConversion = (parseInt(returnerStats.breakPointsWon) || 0) / 
                       Math.max(parseInt(returnerStats.breakPointsTotal) || 1, 1) * 100;
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
      breakCount: 0
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
    const swing = Math.abs((last5[i].value || 0) - (last5[i-1].value || 0));
    maxSwing = Math.max(maxSwing, swing);
  }
  
  // Average of last 5
  const last5avg = last5.reduce((sum, pr) => sum + (pr.value || 0), 0) / last5.length;
  
  // Break count in last 10
  const breakCount = last10.filter(pr => pr.breakOccurred).length;
  
  return {
    trend,
    recentSwing: Math.round(maxSwing),
    last5avg: Math.round(last5avg),
    breakCount
  };
}

// ============================================================================
// MAIN FEATURE COMPUTATION
// ============================================================================

/**
 * Compute all features for a match
 * SEMPRE calcola qualcosa - usa dati disponibili (score, odds, rankings)
 * 
 * @param {Object} matchData - Raw match data
 * @returns {MatchFeatures} Computed features
 */
function computeFeatures(matchData) {
  const {
    powerRankings = [],
    statistics = {},
    score = {},
    odds = [],
    serving = null,
    gameScore = null,
    // Dati aggiuntivi per calcoli fallback
    player1 = {},
    player2 = {}
  } = matchData;
  
  // Identifica quali dati abbiamo
  const statsFields = ['firstServePointsWonPct', 'secondServePointsWonPct', 'aces', 'doubleFaults', 'breakPointsWon'];
  const hasRealHomeStats = statistics.home && statsFields.some(f => statistics.home[f] !== undefined);
  const hasRealAwayStats = statistics.away && statsFields.some(f => statistics.away[f] !== undefined);
  const hasStatistics = hasRealHomeStats || hasRealAwayStats;
  const hasPowerRankings = powerRankings.length > 0;
  const hasScore = score.sets && score.sets.length > 0;
  const hasOdds = odds.length > 0 || (odds.matchWinner && (odds.matchWinner.home || odds.matchWinner.away));
  const hasRankings = (player1.ranking || player1.currentRanking) || (player2.ranking || player2.currentRanking);
  
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
    dominantPlayer = null;
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
    breakProbability = calculateBreakProbability({ statistics, server: serving || 'home', gameScore, powerRankings, requireRealData: false });
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
  const volatilitySource = hasPowerRankings ? 'live' : (hasScore ? 'score' : 'estimated');
  const pressureSource = hasStatistics ? 'statistics' : (hasScore ? 'score' : 'estimated');
  const dominanceSource = hasPowerRankings ? 'live' : (hasScore ? 'score' : (hasOdds ? 'odds' : 'estimated'));
  const serveDominanceSource = hasStatistics ? 'statistics' : (hasRankings ? 'rankings' : 'estimated');
  const breakProbabilitySource = hasStatistics ? 'statistics' : (hasOdds || hasRankings ? 'odds' : 'estimated');
  const momentumSource = hasPowerRankings ? 'live' : (hasScore ? 'score' : 'estimated');
  
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
    dataSource: hasPowerRankings ? 'live' : (hasStatistics ? 'statistics' : (hasScore ? 'score' : 'estimated'))
  };
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
  sets.forEach(set => {
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
  const sets = score.sets || [];
  if (sets.length === 0) return { dominance: 50, dominantPlayer: null };
  
  let homeGames = 0, awayGames = 0;
  let homeSets = 0, awaySets = 0;
  
  sets.forEach(set => {
    homeGames += set.home || 0;
    awayGames += set.away || 0;
    if ((set.home || 0) > (set.away || 0)) homeSets++;
    else if ((set.away || 0) > (set.home || 0)) awaySets++;
  });
  
  const totalGames = homeGames + awayGames || 1;
  const homeRatio = homeGames / totalGames;
  
  // Dominance 0-100, 50 = equilibrato
  const dominance = 50 + ((homeRatio - 0.5) * 60) + ((homeSets - awaySets) * 8);
  
  let dominantPlayer = null;
  if (dominance > 60) dominantPlayer = 'home';
  else if (dominance < 40) dominantPlayer = 'away';
  
  return {
    dominance: Math.min(100, Math.max(0, dominance)),
    dominantPlayer
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
    return { dominance: 50, dominantPlayer: null };
  }
  
  // Converti odds in probabilità implicita
  const homeProb = 1 / homeOdds;
  const awayProb = 1 / awayOdds;
  const total = homeProb + awayProb || 1;
  const homeProbNorm = homeProb / total;
  
  // Dominance: favorito domina
  const dominance = homeProbNorm * 100;
  
  let dominantPlayer = null;
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
  
  return { serveDominance: Math.round(serveDominance), returnDominance: Math.round(returnDominance) };
}

/**
 * Stima break probability da odds/rankings
 */
function calculateBreakProbabilityFromOddsRankings(odds, player1, player2, serving) {
  let breakProb = 25; // Base tennis
  
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
      breakProb = 20;
    } else if (serverOdds > returnerOdds) {
      // Server sfavorito: break più probabile
      breakProb = 35;
    }
  }
  
  // Da rankings
  const rank1 = player1.ranking || player1.currentRanking || 100;
  const rank2 = player2.ranking || player2.currentRanking || 100;
  const serverRank = serving === 'away' ? rank2 : rank1;
  const returnerRank = serving === 'away' ? rank1 : rank2;
  
  if (returnerRank < serverRank) {
    // Returner con ranking migliore: break più probabile
    breakProb += 5;
  }
  
  return Math.min(50, Math.max(15, breakProb));
}

/**
 * Calcola pressure dal punteggio
 */
function calculatePressureFromScore(score) {
  const sets = score.sets || [];
  if (sets.length === 0) return 50;
  
  let pressure = 40; // Base
  
  const currentSet = sets[sets.length - 1];
  const homeSets = sets.filter(s => (s.home || 0) > (s.away || 0)).length;
  const awaySets = sets.filter(s => (s.away || 0) > (s.home || 0)).length;
  
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
    const currentLeader = (currentSet.home || 0) > (currentSet.away || 0) ? 'home' : 
                          (currentSet.away || 0) > (currentSet.home || 0) ? 'away' : null;
    
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
    breakCount: Math.max(0, Math.min(homeGames, awayGames) - 1) // Stima break come min(games) - 1
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  computeFeatures,
  calculateVolatility,
  calculateDominance,
  calculateServeDominance,
  calculateBreakProbability,
  calculateRecentMomentum,
  // Fallback functions
  calculateVolatilityFromScore,
  calculateDominanceFromScore,
  calculateDominanceFromOdds,
  calculateServeDominanceFromRankings,
  calculateBreakProbabilityFromOddsRankings,
  calculatePressureFromScore,
  calculateMomentumFromScore
};
