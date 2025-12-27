/**
 * Point-by-Point Extractor per SofaScore
 * Estrae dati punto per punto dall'HTML di SofaScore
 * 
 * @module pbpExtractor
 */

/**
 * Estrae i dati point-by-point dall'HTML di SofaScore
 * @param {string} htmlString - HTML contenente i dati PBP
 * @returns {Object} { ok, sets, points, error? }
 */
function extractPointByPoint(htmlString) {
  if (!htmlString || typeof htmlString !== 'string') {
    return { ok: false, error: 'Input HTML string is required', sets: [], points: [] };
  }

  try {
    const sets = [];
    const allPoints = [];
    
    // Pattern per trovare i set headers (es: "1º set • 47m")
    const setHeaderRegex = /(\d+)º\s*set\s*•\s*(\d+)m/gi;
    
    // Pattern per trovare i punti (struttura tipica SofaScore)
    // I punti sono tipicamente in elementi con score come "15-0", "30-15", etc.
    const pointPatterns = [
      // Pattern 1: Score in formato "15-0", "30-15", "40-30", "AD-40", etc.
      /<[^>]*>(\d+|AD|A)-(\d+|AD|A)<\/[^>]*>/gi,
      // Pattern 2: Game score con servizio
      /game\s*(\d+)[^<]*<[^>]*>([^<]*)<\/[^>]*>/gi,
    ];
    
    // Trova tutti i blocchi di set
    // SofaScore usa div con class che contiene info sul set
    const setBlockRegex = /<div[^>]*>[\s\S]*?(\d+)º\s*set[\s\S]*?<\/div>/gi;
    
    let setMatch;
    let setIndex = 0;
    
    // Prima estrai info sui set
    while ((setMatch = setHeaderRegex.exec(htmlString)) !== null) {
      sets.push({
        setNumber: parseInt(setMatch[1]),
        duration: parseInt(setMatch[2]),
        games: []
      });
      setIndex++;
    }
    
    // Cerca pattern di punti nel contenuto
    // Pattern per punti tennis: 0, 15, 30, 40, AD
    const scoreRegex = /\b(0|15|30|40|AD|A)\s*[-–]\s*(0|15|30|40|AD|A)\b/gi;
    let scoreMatch;
    
    while ((scoreMatch = scoreRegex.exec(htmlString)) !== null) {
      allPoints.push({
        homeScore: scoreMatch[1],
        awayScore: scoreMatch[2],
        raw: scoreMatch[0]
      });
    }
    
    // Cerca pattern per game scores (es: 6-4, 7-5)
    const gameScoreRegex = /\b([0-7])\s*[-–]\s*([0-7])\b/gi;
    const gameScores = [];
    let gameMatch;
    
    while ((gameMatch = gameScoreRegex.exec(htmlString)) !== null) {
      // Filtra solo score validi per tennis (max 7 games per set)
      const home = parseInt(gameMatch[1]);
      const away = parseInt(gameMatch[2]);
      if (home <= 7 && away <= 7) {
        gameScores.push({ home, away, raw: gameMatch[0] });
      }
    }

    return {
      ok: true,
      sets,
      points: allPoints,
      gameScores,
      rawLength: htmlString.length
    };
    
  } catch (err) {
    return { ok: false, error: `Parse error: ${err.message}`, sets: [], points: [] };
  }
}

/**
 * Parser più strutturato per HTML SofaScore espanso
 * Cerca elementi specifici del DOM di SofaScore
 * @param {string} htmlString - HTML completo della pagina PBP
 * @returns {Object} Dati strutturati per set/game/punto
 */
function parseDetailedPbp(htmlString) {
  if (!htmlString) {
    return { ok: false, error: 'HTML required', data: null };
  }

  const result = {
    sets: [],
    totalPoints: 0,
    totalGames: 0
  };

  try {
    // SofaScore struttura tipica:
    // - Ogni set è in un contenitore espandibile
    // - Ogni game contiene punti con score progressivo
    // - I tiebreak hanno struttura speciale
    
    // Pattern per identificare blocchi game
    // Cerca pattern come "Game 1", "Game 2", o icone servizio
    const gameBlockRegex = /game[^0-9]*(\d+)|servizio|serve/gi;
    
    // Pattern per punti con descrizione (ace, double fault, winner, etc.)
    const pointTypePatterns = {
      ace: /ace/i,
      doubleFault: /double\s*fault|doppio\s*fallo/i,
      winner: /winner|vincente/i,
      unforcedError: /unforced\s*error|errore\s*non\s*forzato/i,
      breakPoint: /break\s*point|palla\s*break/i,
      setPoint: /set\s*point|palla\s*set/i,
      matchPoint: /match\s*point|palla\s*match/i
    };

    // Estrai punti con contesto
    const points = [];
    
    // Pattern per riga punto tipica SofaScore
    // Formato: [score] [tipo punto] [descrizione]
    const pointRowRegex = /<[^>]*class="[^"]*point[^"]*"[^>]*>([\s\S]*?)<\/[^>]*>/gi;
    let pointMatch;
    
    while ((pointMatch = pointRowRegex.exec(htmlString)) !== null) {
      const content = pointMatch[1];
      
      // Estrai score
      const scoreMatch = content.match(/(0|15|30|40|AD)\s*[-–]\s*(0|15|30|40|AD)/i);
      
      // Determina tipo punto
      let pointType = 'regular';
      for (const [type, pattern] of Object.entries(pointTypePatterns)) {
        if (pattern.test(content)) {
          pointType = type;
          break;
        }
      }
      
      points.push({
        score: scoreMatch ? scoreMatch[0] : null,
        homeScore: scoreMatch ? scoreMatch[1] : null,
        awayScore: scoreMatch ? scoreMatch[2] : null,
        type: pointType,
        raw: content.substring(0, 100)
      });
    }
    
    result.totalPoints = points.length;
    result.points = points;
    result.ok = true;
    
    return result;
    
  } catch (err) {
    return { ok: false, error: err.message, data: null };
  }
}

/**
 * Combina dati SVG momentum con dati PBP
 * SVG fornisce: chi ha dominato ogni game (momentum)
 * PBP fornisce: punti individuali dentro ogni game
 * 
 * @param {Array} svgData - Power rankings da SVG (per game)
 * @param {Array} pbpData - Punti individuali da PBP
 * @returns {Array} Dati combinati con punti arricchiti
 */
function combineSvgAndPbp(svgData, pbpData) {
  if (!svgData || !pbpData) {
    return { ok: false, error: 'Both SVG and PBP data required' };
  }

  const combined = [];
  
  // Raggruppa PBP per set/game
  const pbpByGame = {};
  for (const point of pbpData) {
    const key = `${point.set}-${point.game}`;
    if (!pbpByGame[key]) {
      pbpByGame[key] = [];
    }
    pbpByGame[key].push(point);
  }
  
  // Per ogni game da SVG, aggiungi i punti PBP
  for (const svgGame of svgData) {
    const key = `${svgGame.set}-${svgGame.game}`;
    const gamePoints = pbpByGame[key] || [];
    
    combined.push({
      set: svgGame.set,
      game: svgGame.game,
      // Dati da SVG
      momentum: svgGame.value,
      side: svgGame.side,
      gameServer: svgGame.gameServer,
      gameWinner: svgGame.gameWinner,
      gameIsBreak: svgGame.gameIsBreak,
      // Punti da PBP
      points: gamePoints,
      pointCount: gamePoints.length
    });
  }
  
  return {
    ok: true,
    games: combined,
    totalGames: combined.length,
    totalPoints: combined.reduce((sum, g) => sum + g.pointCount, 0)
  };
}

/**
 * Genera punti simulati per un game basandosi sul momentum
 * Usato quando non abbiamo PBP reale ma vogliamo mostrare qualcosa
 * 
 * @param {Object} gameData - Dati del game (da SVG)
 * @returns {Array} Array di punti simulati
 */
function generateSimulatedPoints(gameData) {
  const { gameServer, gameWinner, momentum } = gameData;
  const points = [];
  
  // Score possibili nel tennis
  const scores = ['0', '15', '30', '40'];
  
  // Simula un game tipico basandosi su chi vince
  // Game più dominanti (alto momentum) = meno punti per l'avversario
  const dominance = Math.abs(momentum || 50) / 100; // 0-1
  
  // Determina se è un game "a zero" o combattuto
  const isLovegame = dominance > 0.8;
  const isDeuce = dominance < 0.3;
  
  if (isLovegame) {
    // Game a zero: 4 punti diretti
    const winner = gameWinner || gameServer;
    for (let i = 0; i < 4; i++) {
      const homeScore = winner === 'home' ? scores[i] : '0';
      const awayScore = winner === 'away' ? scores[i] : '0';
      points.push({
        pointNumber: i + 1,
        homeScore,
        awayScore,
        score: `${homeScore}-${awayScore}`,
        pointWinner: winner,
        type: 'simulated'
      });
    }
  } else if (isDeuce) {
    // Game combattuto con deuce
    const sequence = ['15-0', '15-15', '30-15', '30-30', '40-30', '40-40', 'AD-40', '40-40', 'AD-40'];
    const winner = gameWinner || gameServer;
    sequence.forEach((score, i) => {
      const [h, a] = score.split('-');
      points.push({
        pointNumber: i + 1,
        homeScore: h,
        awayScore: a,
        score,
        pointWinner: i % 2 === 0 ? 'home' : 'away',
        type: 'simulated'
      });
    });
    // Punto finale
    points.push({
      pointNumber: points.length + 1,
      homeScore: winner === 'home' ? 'Game' : '40',
      awayScore: winner === 'away' ? 'Game' : '40',
      score: 'Game',
      pointWinner: winner,
      type: 'simulated'
    });
  } else {
    // Game normale: 5-6 punti
    const winner = gameWinner || gameServer;
    const loser = winner === 'home' ? 'away' : 'home';
    
    // Sequenza tipica: vincitore prende 4, perdente prende 1-2
    const winnerPoints = 4;
    const loserPoints = Math.floor(Math.random() * 2) + 1; // 1 o 2
    
    let homeScore = 0;
    let awayScore = 0;
    let pointNum = 0;
    
    while (homeScore < 4 && awayScore < 4) {
      pointNum++;
      // Alterna punti in modo realistico
      const winnerTurn = pointNum <= winnerPoints + loserPoints 
        ? (pointNum % 3 !== 0) // Vincitore prende ~2/3 dei punti
        : true;
      
      if (winnerTurn && (winner === 'home' ? homeScore : awayScore) < 4) {
        if (winner === 'home') homeScore++;
        else awayScore++;
      } else {
        if (loser === 'home') homeScore++;
        else awayScore++;
      }
      
      const h = homeScore >= 4 ? 'Game' : scores[Math.min(homeScore, 3)];
      const a = awayScore >= 4 ? 'Game' : scores[Math.min(awayScore, 3)];
      
      points.push({
        pointNumber: pointNum,
        homeScore: h,
        awayScore: a,
        score: `${h}-${a}`,
        pointWinner: winnerTurn ? winner : loser,
        type: 'simulated'
      });
    }
  }
  
  return points;
}

export {
  extractPointByPoint,
  parseDetailedPbp,
  combineSvgAndPbp,
  generateSimulatedPoints
};
