/**
 * Bundle Helpers - Utility functions for MatchBundle construction
 *
 * Extracted from server.js as part of the refactor.
 * Pure functions, no side effects, no DB access.
 *
 * @see docs/filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md
 */

const VERSION = '1.0.0';

// ============================================================================
// SCORE EXTRACTION & NORMALIZATION
// ============================================================================

/**
 * Estrae il punteggio normalizzato da matchData
 * @param {Object} matchData - Dati del match (da snapshot)
 * @returns {Object} { sets: Array, game: string|null, point: string|null, serving: string|null }
 */
function extractScore(matchData) {
  const match = matchData.match || {};
  const homeScore = match.homeScore || {};
  const awayScore = match.awayScore || {};

  let sets;
  if (match.sets && Array.isArray(match.sets) && match.sets.length > 0) {
    // Sets array exists - normalize to { home, away } format
    sets = match.sets.map((s) => ({
      home: s.home ?? s.player1 ?? 0,
      away: s.away ?? s.player2 ?? 0,
      tiebreak: s.tiebreak ?? null,
    }));
  } else if (homeScore.period1 !== undefined || awayScore.period1 !== undefined) {
    // SofaScore format: build from homeScore.period1, etc.
    sets = buildSetsArray(homeScore, awayScore);
  } else if (match.set1_p1 !== undefined || match.set1_p2 !== undefined) {
    // Direct DB format: set1_p1, set1_p2, etc.
    sets = buildSetsFromDbFields(match);
  } else {
    sets = [];
  }

  return {
    sets,
    game: match.gameScore || null,
    point: match.pointScore || null,
    serving: match.serving || null,
  };
}

/**
 * Costruisce array di set dai campi DB (set1_p1, set1_p2, etc.)
 */
function buildSetsFromDbFields(match) {
  const sets = [];
  for (let i = 1; i <= 5; i++) {
    const p1 = match[`set${i}_p1`];
    const p2 = match[`set${i}_p2`];
    if (p1 != null || p2 != null) {
      sets.push({
        home: p1 ?? 0,
        away: p2 ?? 0,
        tiebreak: match[`set${i}_tb`] ?? null,
      });
    }
  }
  return sets;
}

/**
 * Costruisce array di set dal formato SofaScore (homeScore.period1, etc.)
 */
function buildSetsArray(homeScore, awayScore) {
  const sets = [];
  for (let i = 1; i <= 5; i++) {
    const homeSet = homeScore[`period${i}`];
    const awaySet = awayScore[`period${i}`];
    if (homeSet !== undefined || awaySet !== undefined) {
      sets.push({
        home: homeSet || 0,
        away: awaySet || 0,
        tiebreak: homeScore[`period${i}TieBreak`] || awayScore[`period${i}TieBreak`] || null,
      });
    }
  }
  return sets;
}

// ============================================================================
// ODDS NORMALIZATION
// ============================================================================

/**
 * Normalizza odds nel formato atteso dal frontend
 * Frontend si aspetta: { home: { value, trend }, away: { value, trend } }
 *
 * @param {Object} oddsData - Dati odds dal repository
 * @param {Object} matchData - Dati match per fallback
 * @returns {Object|null} Odds normalizzate o null se non disponibili
 */
function normalizeOddsForBundle(oddsData, matchData) {
  // Caso 1: oddsData dal repository (structure: { opening, closing, all })
  if (oddsData?.closing || oddsData?.opening) {
    const current = oddsData.closing || oddsData.opening;
    const opening = oddsData.opening || oddsData.closing;

    const homeTrend = current.odds_player1 - (opening?.odds_player1 || current.odds_player1);
    const awayTrend = current.odds_player2 - (opening?.odds_player2 || current.odds_player2);

    return {
      home: {
        value: current.odds_player1,
        trend: homeTrend > 0.05 ? 1 : homeTrend < -0.05 ? -1 : 0,
      },
      away: {
        value: current.odds_player2,
        trend: awayTrend > 0.05 ? 1 : awayTrend < -0.05 ? -1 : 0,
      },
      event_time: current.recorded_at || current.timestamp || new Date().toISOString(),
    };
  }

  // Caso 2: matchData.odds giÃ  strutturato
  if (matchData?.odds?.matchWinner) {
    const mw = matchData.odds.matchWinner;
    if (mw.home?.value !== undefined) {
      return mw;
    }
    if (typeof mw.home === 'number') {
      return {
        home: { value: mw.home, trend: 0 },
        away: { value: mw.away, trend: 0 },
      };
    }
  }

  // Caso 3: header.odds (valori semplici)
  if (matchData?.odds?.home !== undefined) {
    return {
      home: { value: matchData.odds.home, trend: 0 },
      away: { value: matchData.odds.away, trend: 0 },
    };
  }

  return null;
}

// ============================================================================
// POINT-BY-POINT NORMALIZATION
// ============================================================================

/**
 * Normalizza point-by-point nel formato atteso dal frontend
 * @param {Object} pointsData - Dati PBP dal repository
 * @returns {Object} { points: Array, games: Array, hasMore: boolean, total: number, source: string }
 */
function normalizePointsForBundle(pointsData) {
  if (!pointsData?.data || !Array.isArray(pointsData.data)) {
    return { points: [], games: [], hasMore: false, total: 0, source: 'none' };
  }

  const gameMap = new Map();

  // 1. Raccogli punti per game
  for (const p of pointsData.data) {
    const setNum = p.set_number || p.set || 1;
    const gameNum = p.game_number || p.game || 1;
    const key = `${setNum}-${gameNum}`;

    if (!gameMap.has(key)) {
      gameMap.set(key, { points: [] });
    }
    gameMap.get(key).points.push(p);
  }

  // 2. Analizza ogni game per determinare server, winner e break
  for (const [key, gameData] of gameMap) {
    const points = gameData.points;
    points.sort(
      (a, b) => (a.point_number || a.point_index || 0) - (b.point_number || b.point_index || 0)
    );

    const firstPoint = points[0];

    // Determine Server
    let server = 'unknown';
    const rawServer = firstPoint.server || firstPoint.serving;
    if (rawServer === 1 || rawServer === 'home') server = 'home';
    else if (rawServer === 2 || rawServer === 'away') server = 'away';

    // Determine Winner using 'scoring'
    let gameWinner = null;
    for (const p of points) {
      if (p.scoring === 1 || p.scoring === '1') {
        gameWinner = 'home';
        break;
      } else if (p.scoring === 2 || p.scoring === '2') {
        gameWinner = 'away';
        break;
      }
    }

    // Determine Break
    const calculatedBreak = server !== 'unknown' && gameWinner !== null && server !== gameWinner;
    const breakOccurredFromDb = points.some((p) => p.break_occurred === true);
    const isBreak = breakOccurredFromDb || calculatedBreak;

    gameData.set = points[0].set_number || points[0].set;
    gameData.game = points[0].game_number || points[0].game;
    gameData.gameServer = server;
    gameData.gameWinner = gameWinner;
    gameData.gameIsBreak = isBreak;
    gameData.pointsCount = points.length;
  }

  const games = Array.from(gameMap.values()).map((g) => ({
    set: g.set,
    game: g.game,
    gameServer: g.gameServer,
    gameWinner: g.gameWinner,
    gameIsBreak: g.gameIsBreak,
    pointsCount: g.pointsCount,
  }));

  const points = pointsData.data.map((p) => {
    const setNum = p.set_number || p.set || 1;
    const gameNum = p.game_number || p.game || 1;
    const key = `${setNum}-${gameNum}`;
    const gameInfo = gameMap.get(key) || {};

    // Determine server
    let server = 'unknown';
    if (p.server === 1 || p.serving === 1) server = 'home';
    else if (p.server === 2 || p.serving === 2) server = 'away';
    else if (p.server === 'home' || p.serving === 'home') server = 'home';
    else if (p.server === 'away' || p.serving === 'away') server = 'away';
    else if (p.server_id && p.home_player_id)
      server = p.server_id === p.home_player_id ? 'home' : 'away';

    if (server === 'unknown' && gameInfo.gameServer) server = gameInfo.gameServer;

    // Determine score
    let score = '';
    if (p.home_point !== undefined && p.away_point !== undefined) {
      score = `${p.home_point}-${p.away_point}`;
    } else if (p.homePoint !== undefined && p.awayPoint !== undefined) {
      score = `${p.homePoint}-${p.awayPoint}`;
    } else if (p.score_p1 !== undefined && p.score_p2 !== undefined) {
      score = `${p.score_p1}-${p.score_p2}`;
    } else if (p.score_after) {
      score = p.score_after;
    } else if (p.score_before) {
      score = p.score_before;
    }

    // Determine point winner
    let pointWinner = null;
    if (p.point_winner === 1) pointWinner = 'home';
    else if (p.point_winner === 2) pointWinner = 'away';
    else if (p.point_winner === 'home' || p.point_winner === 'away') pointWinner = p.point_winner;

    // Determine type
    let type = 'regular';
    let isAce = false;
    let isDoubleFault = false;

    if (p.is_break_point) type = 'break_point';
    else if (p.is_ace || p.point_description === 1) {
      type = 'ace';
      isAce = true;
    } else if (p.is_double_fault || p.point_description === 2) {
      type = 'double_fault';
      isDoubleFault = true;
    } else if (p.is_winner) type = 'winner';
    else if (p.is_unforced_error) type = 'unforced_error';
    else if (p.point_type) type = p.point_type;

    return {
      time: p.timestamp || p.created_at || null,
      set: setNum,
      game: gameNum,
      server,
      score,
      pointWinner,
      description: p.point_description || p.description || '',
      type,
      isBreakPoint: p.is_break_point || false,
      isAce,
      isDoubleFault,
      isSetPoint: p.is_set_point || false,
      isMatchPoint: p.is_match_point || false,
      rallyLength: p.rally_length || null,
      pointNumber: p.point_number || p.point_index || null,
      gameServer: gameInfo.gameServer || server,
      gameWinner: gameInfo.gameWinner,
      gameIsBreak: gameInfo.gameIsBreak || false,
      value: p.value,
      value_svg: p.value_svg,
    };
  });

  return {
    points,
    games,
    hasMore: pointsData.hasMore || false,
    total: pointsData.total || points.length,
    source: pointsData.source || 'database',
  };
}

// ============================================================================
// BREAK CALCULATIONS
// ============================================================================

/**
 * Calcola breakOccurred per ogni game analizzando i dati point-by-point
 * @param {Array} pointByPoint - Array di set con games e points
 * @returns {Map} Mappa "set-game" -> boolean
 */
function calculateBreaksFromPbp(pointByPoint) {
  const breakMap = new Map();

  if (!pointByPoint || !Array.isArray(pointByPoint)) {
    return breakMap;
  }

  for (const set of pointByPoint) {
    if (!set.games || !Array.isArray(set.games)) continue;
    const setNumber = set.set;

    for (const game of set.games) {
      const gameNumber = game.game;
      const key = `${setNumber}-${gameNumber}`;

      // serving indica chi serve: 1=HOME, 2=AWAY
      // scoring indica chi ha VINTO il game: 1=HOME, 2=AWAY
      const serving = game.serving;
      const scoring = game.scoring;

      // BREAK = serving !== scoring
      if (serving && scoring && serving !== scoring && scoring !== -1) {
        breakMap.set(key, true);
      } else {
        breakMap.set(key, false);
      }
    }
  }

  return breakMap;
}

/**
 * Genera powerRankings simulati dai pointByPoint
 * @param {Array} pointByPoint - Array di set con games e points
 * @returns {Array} PowerRankings generati
 */
function generatePowerRankingsFromPbp(pointByPoint) {
  if (!pointByPoint || !Array.isArray(pointByPoint) || pointByPoint.length === 0) {
    return [];
  }

  const rankings = [];
  let runningMomentum = 0;
  let maxMomentum = 0;
  let minMomentum = 0;

  for (const set of pointByPoint) {
    if (!set.games || !Array.isArray(set.games)) continue;
    const setNumber = set.set || 1;

    for (const game of set.games) {
      const gameNumber = game.game || 1;
      const serving = game.serving;
      const scoring = game.scoring;

      // Skip incomplete games
      if (scoring === -1 || scoring === undefined) continue;

      // HOME vince: +1, AWAY vince: -1
      if (scoring === 1) {
        runningMomentum += 1;
      } else if (scoring === 2) {
        runningMomentum -= 1;
      }

      // Break bonus: Â±0.5
      if (serving && scoring && serving !== scoring) {
        if (scoring === 1) {
          runningMomentum += 0.5; // Break per home
        } else if (scoring === 2) {
          runningMomentum -= 0.5; // Break per away
        }
      }

      maxMomentum = Math.max(maxMomentum, runningMomentum);
      minMomentum = Math.min(minMomentum, runningMomentum);

      const isBreak = serving && scoring && serving !== scoring;

      rankings.push({
        set: setNumber,
        game: gameNumber,
        rawValue: runningMomentum,
        serving,
        scoring,
        breakOccurred: isBreak,
      });
    }
  }

  // Normalizza -100..+100
  const range = Math.max(Math.abs(maxMomentum), Math.abs(minMomentum)) || 1;

  return rankings.map((r) => ({
    ...r,
    value: Math.round((r.rawValue / range) * 100),
  }));
}

/**
 * Arricchisce i powerRankings con breakOccurred dai PBP
 * @param {Array} powerRankings - Array di power rankings
 * @param {Array} pointByPoint - Array di point by point data
 * @returns {Array} PowerRankings arricchiti
 */
function enrichPowerRankingsWithBreaks(powerRankings, pointByPoint) {
  // Se powerRankings vuoto ma abbiamo PBP, genera da PBP
  if ((!powerRankings || powerRankings.length === 0) && pointByPoint && pointByPoint.length > 0) {
    return generatePowerRankingsFromPbp(pointByPoint);
  }

  if (!powerRankings || powerRankings.length === 0) {
    return [];
  }

  const breakMap = calculateBreaksFromPbp(pointByPoint);

  return powerRankings.map((ranking) => {
    const setNum = ranking.set || 1;
    const gameNum = ranking.game || 1;
    const key = `${setNum}-${gameNum}`;

    return {
      ...ranking,
      breakOccurred: ranking.breakOccurred ?? breakMap.get(key) ?? false,
    };
  });
}

// ============================================================================
// DATA QUALITY
// ============================================================================

/**
 * Calcola punteggio di qualitÃ  dei dati del bundle
 * @param {Object} matchData - Dati match
 * @param {Object} statisticsData - Statistiche
 * @param {Array} momentumData - Power rankings
 * @returns {number} Score 0-100
 */
function calculateDataQuality(matchData, statisticsData, momentumData) {
  let score = 0;
  let factors = 0;

  // Match base data (40 punti)
  if (matchData?.match?.id) {
    score += 10;
    factors++;
  }
  if (matchData?.player1?.name) {
    score += 10;
    factors++;
  }
  if (matchData?.player2?.name) {
    score += 10;
    factors++;
  }
  if (matchData?.match?.surface && matchData.match.surface !== 'Unknown') {
    score += 10;
    factors++;
  }

  // Score data (20 punti)
  const match = matchData?.match || {};
  if (match.sets && match.sets.length > 0) {
    score += 10;
    factors++;
  }
  if (match.homeScore || match.awayScore) {
    score += 10;
    factors++;
  }

  // Statistics (20 punti)
  const hasStats =
    statisticsData &&
    (statisticsData.ALL ||
      (Array.isArray(statisticsData) && statisticsData.length > 0) ||
      statisticsData.home?.aces !== undefined);
  if (hasStats) {
    score += 20;
    factors++;
  }

  // Momentum (10 punti)
  if (momentumData && momentumData.length > 0) {
    score += 10;
    factors++;
  }

  // Tournament info (10 punti)
  if (matchData?.tournament?.name) {
    score += 5;
    factors++;
  }
  if (matchData?.match?.round || matchData?.match?.roundInfo) {
    score += 5;
    factors++;
  }

  return factors > 0 ? Math.min(100, Math.round(score)) : 0;
}

// ============================================================================
// GAME STATS FROM SCORE
// ============================================================================

/**
 * Calcola statistiche di game dallo score (sets)
 * @param {Object} score - Punteggio { sets: Array }
 * @returns {Object} { home: {...}, away: {...} }
 */
function calculateGameStatsFromScore(score) {
  const sets = score?.sets || [];

  let homeGamesWon = 0;
  let awayGamesWon = 0;
  let homeTiebreaksWon = 0;
  let awayTiebreaksWon = 0;
  let homeMaxConsecutive = 0;
  let awayMaxConsecutive = 0;

  for (const set of sets) {
    const homeSetGames = set.home || 0;
    const awaySetGames = set.away || 0;

    homeGamesWon += homeSetGames;
    awayGamesWon += awaySetGames;

    // Tiebreak detection
    if ((homeSetGames === 7 && awaySetGames === 6) || (homeSetGames === 6 && awaySetGames === 7)) {
      if (homeSetGames > awaySetGames) {
        homeTiebreaksWon++;
      } else {
        awayTiebreaksWon++;
      }
    }

    // Consecutive games estimate
    const diff = Math.abs(homeSetGames - awaySetGames);
    if (homeSetGames > awaySetGames) {
      homeMaxConsecutive = Math.max(homeMaxConsecutive, Math.min(diff + 1, 5));
      awayMaxConsecutive = Math.max(
        awayMaxConsecutive,
        Math.min(awaySetGames > 0 ? 2 : 1, awaySetGames)
      );
    } else if (awaySetGames > homeSetGames) {
      awayMaxConsecutive = Math.max(awayMaxConsecutive, Math.min(diff + 1, 5));
      homeMaxConsecutive = Math.max(
        homeMaxConsecutive,
        Math.min(homeSetGames > 0 ? 2 : 1, homeSetGames)
      );
    }
  }

  if (homeMaxConsecutive === 0 && homeGamesWon > 0) homeMaxConsecutive = 1;
  if (awayMaxConsecutive === 0 && awayGamesWon > 0) awayMaxConsecutive = 1;

  return {
    home: {
      gamesWon: homeGamesWon,
      tiebreaksWon: homeTiebreaksWon,
      consecutiveGamesWon: homeMaxConsecutive,
    },
    away: {
      gamesWon: awayGamesWon,
      tiebreaksWon: awayTiebreaksWon,
      consecutiveGamesWon: awayMaxConsecutive,
    },
  };
}

// ============================================================================
// WIN PROBABILITY
// ============================================================================

/**
 * Calcola probabilitÃ  di vittoria basata su features
 */
function calculateWinProbability(features, statistics) {
  // Base: 50%
  let homeProb = 50;

  // Dominance contribuisce (max Â±20%)
  if (features.dominance) {
    const dominanceContrib = (features.dominance - 50) * 0.4;
    homeProb += dominanceContrib;
  }

  // Momentum contribuisce (max Â±10%)
  if (features.momentum?.trend) {
    if (features.momentum.trend === 'home') homeProb += 5;
    else if (features.momentum.trend === 'away') homeProb -= 5;
  }

  // Serve dominance contribuisce (max Â±5%)
  if (features.serveDominance) {
    const serveContrib = (features.serveDominance - 50) * 0.1;
    homeProb += serveContrib;
  }

  // Clamp 5-95%
  return {
    home: Math.max(5, Math.min(95, Math.round(homeProb))),
    away: Math.max(5, Math.min(95, Math.round(100 - homeProb))),
  };
}

/**
 * Estrae key factors dalle features per il predictor
 */
function extractKeyFactors(features, strategySignals) {
  const factors = [];

  if (features.volatility > 70) {
    factors.push({ type: 'volatility', level: 'high', description: 'Match molto volatile' });
  }

  if (features.pressure > 70) {
    factors.push({ type: 'pressure', level: 'high', description: 'Momento ad alta pressione' });
  }

  if (features.momentum?.trend === 'home' || features.momentum?.trend === 'away') {
    factors.push({
      type: 'momentum',
      level: features.momentum.trend,
      description: `Momentum favorisce ${features.momentum.trend}`,
    });
  }

  // Ready strategies
  const readyCount = strategySignals?.filter((s) => s.status === 'READY').length || 0;
  if (readyCount > 0) {
    factors.push({
      type: 'strategies',
      level: 'ready',
      description: `${readyCount} strategie pronte`,
    });
  }

  return factors;
}

// ============================================================================
// MATCH STATUS
// ============================================================================

/**
 * Determina lo status realistico di una partita
 */
function getRealisticStatus(status, startTimestamp, winnerCode) {
  // Se c'Ã¨ un winner, Ã¨ sicuramente finita
  if (winnerCode && winnerCode !== 0) {
    return 'finished';
  }

  // Se lo status Ã¨ giÃ  "finished" o "ended"
  if (typeof status === 'string') {
    const s = status.toLowerCase();
    if (s === 'finished' || s === 'ended' || s === 'completed') {
      return 'finished';
    }
  }

  // Se inprogress ma iniziata piÃ¹ di 6 ore fa, probabilmente Ã¨ finita
  if (startTimestamp && typeof status === 'string' && status.toLowerCase() === 'inprogress') {
    const startTime = new Date(startTimestamp * 1000);
    const now = new Date();
    const hoursDiff = (now - startTime) / (1000 * 60 * 60);

    if (hoursDiff > 6) {
      return 'finished';
    }
  }

  return typeof status === 'string' ? status : status?.type || status?.description || 'unknown';
}

module.exports = {
  VERSION,
  // Score
  extractScore,
  buildSetsFromDbFields,
  buildSetsArray,
  // Odds
  normalizeOddsForBundle,
  // Points
  normalizePointsForBundle,
  // Breaks
  calculateBreaksFromPbp,
  generatePowerRankingsFromPbp,
  enrichPowerRankingsWithBreaks,
  // Quality
  calculateDataQuality,
  // Game stats
  calculateGameStatsFromScore,
  // Probability
  calculateWinProbability,
  extractKeyFactors,
  // Status
  getRealisticStatus,
};

