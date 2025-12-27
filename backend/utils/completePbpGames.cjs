/**
 * Complete PBP Games - Aggiunge i punti finali mancanti
 * 
 * SofaScore HTML spesso non mostra l'ultimo punto decisivo che conclude il game.
 * Questa funzione inferisce e aggiunge i punti mancanti basandosi sulle regole del tennis.
 */

/**
 * Completa i game aggiungendo i punti finali mancanti
 * @param {Array} dbPoints - Punti dal database (formato match_point_by_point_new)
 * @returns {Array} - Punti completi con punti finali inferiti
 */
function completePbpGames(dbPoints) {
  if (!dbPoints || !Array.isArray(dbPoints)) {
    return [];
  }

  // Raggruppa per game
  const gameMap = new Map();
  dbPoints.forEach(p => {
    const key = `${p.set_number}-${p.game_number}`;
    if (!gameMap.has(key)) {
      gameMap.set(key, []);
    }
    gameMap.get(key).push({...p});
  });

  const completedPoints = [];

  for (const [gameKey, points] of gameMap) {
    // Ordina per point_number
    points.sort((a, b) => a.point_number - b.point_number);
    
    const lastPoint = points[points.length - 1];
    const setNum = lastPoint.set_number;
    const gameNum = lastPoint.game_number;
    const server = lastPoint.server;
    
    // Aggiungi i punti esistenti
    completedPoints.push(...points);
    
    // Check se il game è completo
    const lastScore = {
      p1: lastPoint.score_p1,
      p2: lastPoint.score_p2
    };
    
    const isComplete = isGameComplete(lastScore, points);
    
    if (!isComplete) {
      // Inferisci il punto finale
      const finalPoint = inferFinalPoint(points, lastPoint);
      if (finalPoint) {
        completedPoints.push(finalPoint);
      }
    }
  }
  
  // Riordina tutti i punti
  completedPoints.sort((a, b) => {
    if (a.set_number !== b.set_number) return a.set_number - b.set_number;
    if (a.game_number !== b.game_number) return a.game_number - b.game_number;
    return a.point_number - b.point_number;
  });
  
  return completedPoints;
}

/**
 * Verifica se un game è completo (ha il punto finale)
 */
function isGameComplete(score, points) {
  const { p1, p2 } = score;
  
  // Tiebreak: deve arrivare a 7+ con 2+ di differenza
  if (isTiebreakScore(score)) {
    const p1Score = parseScore(p1);
    const p2Score = parseScore(p2);
    
    if (isNaN(p1Score) || isNaN(p2Score)) return true; // Non possiamo determinare
    
    const max = Math.max(p1Score, p2Score);
    const diff = Math.abs(p1Score - p2Score);
    
    return max >= 7 && diff >= 2;
  }
  
  // Game normale: deve essere "game" o equivalente
  const tennisPoints = ['0', '15', '30', '40', 'A'];
  const p1Numeric = convertTennisScore(p1);
  const p2Numeric = convertTennisScore(p2);
  
  // Se uno ha vinto (score >= 4 e differenza >= 2, o 4-0, 4-1, 4-2)
  if (p1Numeric >= 4 && p1Numeric >= p2Numeric + 2) return true; // P1 wins
  if (p2Numeric >= 4 && p2Numeric >= p1Numeric + 2) return true; // P2 wins
  
  return false;
}

/**
 * Inferisce l'ultimo punto mancante del game
 */
function inferFinalPoint(points, lastPoint) {
  const score = {
    p1: lastPoint.score_p1,
    p2: lastPoint.score_p2
  };
  
  // Determina chi dovrebbe vincere il game
  let gameWinner = null;
  
  // Logica: in base all'ultimo server e se il game è un break
  // Se il server serve dall'inizio, probabilmente vince il game (a meno che non sia break)
  const server = lastPoint.server; // 1 = home, 2 = away
  
  // Verifica dai dati se questo è un break game
  const hasBreakIndication = points.some(p => 
    p.is_break_point || p.point_description === 'break_game'
  );
  
  if (hasBreakIndication) {
    // Break: vince chi riceve (non server)
    gameWinner = server === 1 ? 2 : 1;
  } else {
    // No break: vince il server
    gameWinner = server;
  }
  
  // Calcola il prossimo score
  const finalScore = calculateFinalScore(score, gameWinner);
  
  if (!finalScore) return null;
  
  return {
    match_id: lastPoint.match_id,
    set_number: lastPoint.set_number,
    game_number: lastPoint.game_number,
    point_number: lastPoint.point_number + 1,
    score_p1: finalScore.p1,
    score_p2: finalScore.p2,
    game_score_p1: lastPoint.game_score_p1,
    game_score_p2: lastPoint.game_score_p2,
    server: lastPoint.server,
    point_winner: gameWinner,
    is_break_point: false,
    is_set_point: false,
    is_match_point: false,
    point_description: 'inferred_game_point',
    is_inferred: true // Flag per indicare che è stato inferito
  };
}

/**
 * Calcola lo score finale del game
 */
function calculateFinalScore(currentScore, winner) {
  const { p1, p2 } = currentScore;
  
  // Tiebreak
  if (isTiebreakScore(currentScore)) {
    const p1Score = parseScore(p1);
    const p2Score = parseScore(p2);
    
    if (isNaN(p1Score) || isNaN(p2Score)) return null;
    
    if (winner === 1) {
      return { p1: Math.max(p1Score + 1, 7).toString(), p2: p2.toString() };
    } else {
      return { p1: p1.toString(), p2: Math.max(p2Score + 1, 7).toString() };
    }
  }
  
  // Game normale
  const p1Numeric = convertTennisScore(p1);
  const p2Numeric = convertTennisScore(p2);
  
  if (winner === 1) {
    // P1 vince - porta a game
    const newP1Score = Math.max(p1Numeric + 1, 4);
    return { 
      p1: newP1Score >= 4 ? 'Game' : convertNumericToTennis(newP1Score),
      p2: convertNumericToTennis(p2Numeric)
    };
  } else {
    // P2 vince - porta a game
    const newP2Score = Math.max(p2Numeric + 1, 4);
    return { 
      p1: convertNumericToTennis(p1Numeric),
      p2: newP2Score >= 4 ? 'Game' : convertNumericToTennis(newP2Score)
    };
  }
}

/**
 * Helper functions
 */
function isTiebreakScore(score) {
  const p1Num = parseScore(score.p1);
  const p2Num = parseScore(score.p2);
  
  return !isNaN(p1Num) && !isNaN(p2Num) && (p1Num > 4 || p2Num > 4);
}

function parseScore(score) {
  const num = parseInt(score);
  return isNaN(num) ? NaN : num;
}

function convertTennisScore(score) {
  switch (score) {
    case '0': return 0;
    case '15': return 1;
    case '30': return 2;
    case '40': return 3;
    case 'A': return 4;
    case 'Game': return 5;
    default: return parseScore(score);
  }
}

function convertNumericToTennis(num) {
  switch (num) {
    case 0: return '0';
    case 1: return '15';
    case 2: return '30';
    case 3: return '40';
    case 4: return 'A';
    default: return num.toString();
  }
}

module.exports = {
  completePbpGames,
  isGameComplete,
  inferFinalPoint
};