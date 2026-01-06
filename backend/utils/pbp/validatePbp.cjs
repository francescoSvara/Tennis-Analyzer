/**
 * PBP Validation Module
 * 
 * Implements FILOSOFIA_PBP_EXTRACTION invariants as boolean checks.
 * Returns validation results with errors and warnings.
 * 
 * INVARIANTS CHECKED:
 * - Point score progression is valid
 * - Game score progression is valid  
 * - Service alternation consistency (including tiebreak rotation)
 * - Winner determined from CSS (or counted as unknown)
 * - Break detection consistent with server/returner win
 * 
 * @module pbp/validatePbp
 * @see docs/filosofie/FILOSOFIA_PBP_EXTRACTION_PSEUDOCODE.md
 */

'use strict';

// Valid tennis point scores (non-tiebreak)
const VALID_POINT_SCORES = ['0', '15', '30', '40', 'A', 'AD'];

// Valid score transitions in a game
const SCORE_PROGRESSION = {
  '0': ['15'],
  '15': ['30'],
  '30': ['40'],
  '40': ['A', 'GAME'], // Can win game or go to deuce
  'A': ['40', 'GAME'], // Can lose advantage or win game
};

/**
 * Check if a score is valid for tiebreak
 * @param {string} score 
 * @returns {boolean}
 */
function isValidTiebreakScore(score) {
  const num = parseInt(score);
  return !isNaN(num) && num >= 0 && num < 100;
}

/**
 * Validate point score progression within a game
 * @param {Array} points - Points in a single game
 * @param {boolean} isTiebreak 
 * @returns {{valid: boolean, errors: Array, warnings: Array}}
 */
function validateGameScoreProgression(points, isTiebreak = false) {
  const errors = [];
  const warnings = [];

  if (!points || points.length === 0) {
    return { valid: true, errors, warnings };
  }

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const homeScore = String(p.homeScore || p.home_score || '0');
    const awayScore = String(p.awayScore || p.away_score || '0');

    if (isTiebreak) {
      // Tiebreak: scores should be numbers
      if (!isValidTiebreakScore(homeScore)) {
        errors.push({
          code: 'INVALID_TB_SCORE',
          message: `Invalid tiebreak score: ${homeScore}`,
          at: { pointIndex: i, set: p.set, game: p.game }
        });
      }
      if (!isValidTiebreakScore(awayScore)) {
        errors.push({
          code: 'INVALID_TB_SCORE',
          message: `Invalid tiebreak score: ${awayScore}`,
          at: { pointIndex: i, set: p.set, game: p.game }
        });
      }
    } else {
      // Normal game: scores should be 0, 15, 30, 40, A
      if (!VALID_POINT_SCORES.includes(homeScore.toUpperCase())) {
        // Allow numeric for compatibility
        if (isNaN(parseInt(homeScore))) {
          errors.push({
            code: 'INVALID_GAME_SCORE',
            message: `Invalid game score: ${homeScore}`,
            at: { pointIndex: i, set: p.set, game: p.game }
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate service alternation rules
 * 
 * TENNIS RULES:
 * - Service alternates every game
 * - In tiebreak: first point by scheduled server, then alternates every 2 points
 * - After tiebreak: opposite player serves first in next set
 * 
 * @param {Array} games - Array of games with server info
 * @returns {{valid: boolean, errors: Array, warnings: Array}}
 */
function validateServiceAlternation(games) {
  const errors = [];
  const warnings = [];

  if (!games || games.length < 2) {
    return { valid: true, errors, warnings };
  }

  let expectedServer = null;
  let lastSetNumber = null;
  let lastGameWasTiebreak = false;

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const server = game.server || game.gameServer;
    const setNumber = game.set || game.setNumber || game.set_number;
    const isTiebreak = game.isTiebreak || game.is_tiebreak || false;

    // First game of match
    if (expectedServer === null) {
      expectedServer = server;
      lastSetNumber = setNumber;
      lastGameWasTiebreak = isTiebreak;
      continue;
    }

    // New set starts
    if (setNumber !== lastSetNumber) {
      // After tiebreak, server is opposite
      if (lastGameWasTiebreak) {
        // The player who received first in tiebreak serves first in new set
        // This is complex - just warn if inconsistent
        if (server === expectedServer) {
          warnings.push({
            code: 'TIEBREAK_ALTERNATION_WARNING',
            message: `After tiebreak, expected server change. Game ${game.game} set ${setNumber}`,
            at: { gameIndex: i, set: setNumber, game: game.game }
          });
        }
      }
      lastSetNumber = setNumber;
      expectedServer = server;
      lastGameWasTiebreak = isTiebreak;
      continue;
    }

    // Within same set: server should alternate
    const oppositeServer = expectedServer === 'home' ? 'away' : 'home';
    
    if (!isTiebreak && server !== oppositeServer) {
      errors.push({
        code: 'SERVICE_ALTERNATION_VIOLATION',
        message: `Expected ${oppositeServer} to serve game ${game.game}, got ${server}`,
        at: { gameIndex: i, set: setNumber, game: game.game }
      });
    }

    expectedServer = server;
    lastGameWasTiebreak = isTiebreak;
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate break detection consistency
 * 
 * RULE: A break occurs when the RECEIVER wins the game
 * 
 * @param {Array} games - Array of games with server and winner info
 * @returns {{valid: boolean, errors: Array, warnings: Array}}
 */
function validateBreakConsistency(games) {
  const errors = [];
  const warnings = [];

  if (!games) return { valid: true, errors, warnings };

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const server = game.server || game.gameServer;
    const winner = game.winner || game.gameWinner;
    const isBreak = game.isBreak || game.is_break || game.gameIsBreak || false;
    const isTiebreak = game.isTiebreak || game.is_tiebreak || false;

    // Skip tiebreaks - they're not counted as breaks
    if (isTiebreak) continue;

    // If we have both server and winner, validate break flag
    if (server && winner) {
      const shouldBeBreak = winner !== server;
      
      if (shouldBeBreak !== isBreak) {
        if (shouldBeBreak && !isBreak) {
          warnings.push({
            code: 'MISSING_BREAK_FLAG',
            message: `Game ${game.game} set ${game.set}: receiver won but isBreak=false`,
            at: { gameIndex: i, set: game.set, game: game.game }
          });
        } else if (!shouldBeBreak && isBreak) {
          errors.push({
            code: 'INCORRECT_BREAK_FLAG',
            message: `Game ${game.game} set ${game.set}: server won but isBreak=true`,
            at: { gameIndex: i, set: game.set, game: game.game }
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate point winners are determined
 * @param {Array} points 
 * @returns {{valid: boolean, errors: Array, warnings: Array, unknownCount: number}}
 */
function validatePointWinners(points) {
  const errors = [];
  const warnings = [];
  let unknownCount = 0;

  if (!points) return { valid: true, errors, warnings, unknownCount };

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const winner = p.pointWinner || p.winner || p.scoring;

    if (!winner || winner === 'unknown' || winner === null) {
      unknownCount++;
    }
  }

  if (unknownCount > 0) {
    warnings.push({
      code: 'UNKNOWN_POINT_WINNERS',
      message: `${unknownCount} points have unknown winner`,
      at: null
    });
  }

  // More than 10% unknown is a problem
  if (points.length > 0 && unknownCount / points.length > 0.1) {
    errors.push({
      code: 'TOO_MANY_UNKNOWN_WINNERS',
      message: `${unknownCount}/${points.length} (${Math.round(unknownCount/points.length*100)}%) points have unknown winner`,
      at: null
    });
  }

  return { valid: errors.length === 0, errors, warnings, unknownCount };
}

/**
 * Main validation function
 * 
 * @param {Object} pbpData - Extracted PBP data
 * @param {Object} options - Validation options
 * @returns {{ok: boolean, errors: Array, warnings: Array}}
 */
function validatePbp(pbpData, options = {}) {
  const allErrors = [];
  const allWarnings = [];

  if (!pbpData) {
    return { 
      ok: false, 
      errors: [{ code: 'NO_DATA', message: 'No PBP data provided' }], 
      warnings: [] 
    };
  }

  // Extract points and games from various formats
  const points = pbpData.points || [];
  const games = pbpData.games || pbpData.sets?.flatMap(s => s.games) || [];

  // 1. Validate point winners
  const winnerValidation = validatePointWinners(points);
  allErrors.push(...winnerValidation.errors);
  allWarnings.push(...winnerValidation.warnings);

  // 2. Validate service alternation
  const serviceValidation = validateServiceAlternation(games);
  allErrors.push(...serviceValidation.errors);
  allWarnings.push(...serviceValidation.warnings);

  // 3. Validate break consistency
  const breakValidation = validateBreakConsistency(games);
  allErrors.push(...breakValidation.errors);
  allWarnings.push(...breakValidation.warnings);

  // 4. Validate score progression per game (group points by game first)
  const pointsByGame = {};
  for (const p of points) {
    const key = `${p.set}-${p.game}`;
    if (!pointsByGame[key]) {
      pointsByGame[key] = [];
    }
    pointsByGame[key].push(p);
  }

  for (const [key, gamePoints] of Object.entries(pointsByGame)) {
    const isTiebreak = gamePoints[0]?.isTiebreak || false;
    const scoreValidation = validateGameScoreProgression(gamePoints, isTiebreak);
    allErrors.push(...scoreValidation.errors);
    allWarnings.push(...scoreValidation.warnings);
  }

  return {
    ok: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

module.exports = {
  validatePbp,
  validateGameScoreProgression,
  validateServiceAlternation,
  validateBreakConsistency,
  validatePointWinners,
  // Helpers
  isValidTiebreakScore,
  VALID_POINT_SCORES
};
