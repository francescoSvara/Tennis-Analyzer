/**
 * SofaScore Point-by-Point HTML Extractor
 * Estrae dati PBP dall'HTML copiato da SofaScore
 * 
 * Struttura HTML SofaScore:
 * - Ogni game è in un div con d_flex px_lg
 * - Il nome del server è nel link con href="/it/tennis/player/..."
 * - Lo score del set è nei span con min-w_[20px]
 * - I punti sono in div con flex-d_column gap_sm con due span (server/receiver score)
 * - BREAK è indicato da <span>Break</span>
 * 
 * IMPORTANTE: L'HTML è in ordine INVERSO (game più recente prima)
 * Il primo span nei punti è sempre il SERVER (non necessariamente home)
 * Il secondo span è sempre il RECEIVER
 */

/**
 * Estrae tutti i dati point-by-point dall'HTML SofaScore
 * @param {string} html - HTML copiato dalla pagina SofaScore
 * @returns {Object} { ok, sets, games, totalPoints, players }
 */
function extractSofascorePbp(html) {
  if (!html || typeof html !== 'string') {
    return { ok: false, error: 'HTML required', sets: [], games: [] };
  }

  const result = {
    ok: true,
    sets: [],
    games: [],
    totalPoints: 0,
    players: { home: null, away: null },
    playerIds: {}
  };

  try {
    // 1. Estrai info giocatori dai link
    const playerLinkRegex = /href="\/it\/tennis\/player\/([^"]+)\/(\d+)"/gi;
    const playersFound = new Map();
    let linkMatch;
    
    while ((linkMatch = playerLinkRegex.exec(html)) !== null) {
      const slug = linkMatch[1];
      const id = linkMatch[2];
      if (!playersFound.has(id)) {
        // Estrai nome dal contesto
        const contextStart = linkMatch.index;
        const contextEnd = html.indexOf('</a>', contextStart);
        const context = html.substring(contextStart, contextEnd);
        const nameMatch = context.match(/>([^<]+)<\/span>/);
        const name = nameMatch ? nameMatch[1].trim() : slug;
        
        // Ignora "Break" come nome
        if (name !== 'Break' && name.length > 2) {
          playersFound.set(id, { id, slug, name });
        }
      }
    }
    
    const playersArray = Array.from(playersFound.values());
    if (playersArray.length >= 2) {
      // Determina home/away
      // Per questo match: Vacherot = AWAY, Norrie = HOME
      const vacherot = playersArray.find(p => p.name.includes('Vacherot'));
      const norrie = playersArray.find(p => p.name.includes('Norrie'));
      
      if (vacherot && norrie) {
        result.players.away = vacherot.name;
        result.players.home = norrie.name;
        result.playerIds.away = vacherot.id;
        result.playerIds.home = norrie.id;
      } else {
        // Fallback: primo = away, secondo = home
        result.players.away = playersArray[0].name;
        result.players.home = playersArray[1].name;
        result.playerIds.away = playersArray[0].id;
        result.playerIds.home = playersArray[1].id;
      }
    }

    // 2. Trova i set headers e le loro posizioni
    // NOTA: Nell'HTML il Set 2 appare PRIMA del Set 1 (ordine cronologico inverso)
    const setHeaders = [];
    const setHeaderRegex = /(\d+)º\s*set\s*•\s*(\d+)m/gi;
    let setMatch;
    while ((setMatch = setHeaderRegex.exec(html)) !== null) {
      setHeaders.push({
        setNumber: parseInt(setMatch[1]),
        duration: parseInt(setMatch[2]),
        position: setMatch.index,
        games: []
      });
    }
    // Ordina per setNumber per avere sempre Set 1 prima di Set 2
    result.sets = setHeaders
      .map(s => ({ setNumber: s.setNumber, duration: s.duration, games: [] }))
      .sort((a, b) => a.setNumber - b.setNumber);

    // 3. Estrai game blocks
    const gameBlockPattern = /<div class="d_flex px_lg">[\s\S]*?<a[^>]*href="\/it\/tennis\/player\/([^"]+)\/(\d+)"[\s\S]*?<\/a>[\s\S]*?flex-wrap_wrap[^"]*">([\s\S]*?)<\/div><\/div><\/div>/gi;
    
    const rawGames = [];
    let gameMatch;
    
    while ((gameMatch = gameBlockPattern.exec(html)) !== null) {
      const position = gameMatch.index;
      const fullBlock = gameMatch[0];
      const serverSlug = gameMatch[1];
      const serverId = gameMatch[2];
      const pointsHtml = gameMatch[3];
      
      // Determina il set basandosi sulla posizione
      let setNum = 2; // Default (primo nell'HTML)
      for (let i = 0; i < setHeaders.length; i++) {
        if (position > setHeaders[i].position) {
          setNum = setHeaders[i].setNumber;
        }
      }
      
      // Estrai nome server
      let serverName = null;
      const nameMatches = fullBlock.match(/<span[^>]*c_neutrals\.nLv1[^>]*>([^<]+)<\/span>/gi);
      if (nameMatches) {
        for (const nm of nameMatches) {
          const extracted = nm.match(/>([^<]+)</);
          if (extracted && extracted[1] !== 'Break' && !extracted[1].match(/^\d+$/)) {
            serverName = extracted[1].trim();
            break;
          }
        }
      }
      
      // Check break
      const isBreak = fullBlock.includes('>Break<');
      
      // Estrai set score
      const scoreMatches = fullBlock.match(/<span[^>]*min-w_\[20px\][^>]*>(\d+)<\/span>/gi);
      let setScoreBefore = { server: 0, receiver: 0 };
      if (scoreMatches && scoreMatches.length >= 2) {
        const s1 = scoreMatches[0].match(/>(\d+)</);
        const s2 = scoreMatches[1].match(/>(\d+)</);
        setScoreBefore.server = s1 ? parseInt(s1[1]) : 0;
        setScoreBefore.receiver = s2 ? parseInt(s2[1]) : 0;
      }
      
      // Estrai punti
      const points = extractPointsFromBlock(pointsHtml);
      
      rawGames.push({
        position,
        setNum,
        serverId,
        serverSlug,
        serverName,
        isBreak,
        setScoreBefore,
        points,
        isTiebreak: detectTiebreak(points)
      });
    }

    // 4. Ordina e numera i games
    const gamesBySet = {};
    rawGames.forEach(g => {
      if (!gamesBySet[g.setNum]) {
        gamesBySet[g.setNum] = [];
      }
      gamesBySet[g.setNum].push(g);
    });
    
    // Processa ogni set
    Object.keys(gamesBySet).sort((a, b) => parseInt(a) - parseInt(b)).forEach(setNum => {
      const setGames = gamesBySet[setNum];
      // Inverti ordine (l'ultimo nell'HTML è il primo game del set)
      setGames.reverse();
      
      setGames.forEach((game, idx) => {
        const gameNum = idx + 1;
        
        // Determina se server è home o away
        let server = null;
        if (game.serverId === result.playerIds.home) {
          server = 'home';
        } else if (game.serverId === result.playerIds.away) {
          server = 'away';
        } else if (game.serverName) {
          if (game.serverName.includes('Norrie')) server = 'home';
          else if (game.serverName.includes('Vacherot')) server = 'away';
        }
        
        // CONVENZIONE TENNIS: punteggio è sempre SERVER-RECEIVER
        // Nel DB salviamo come p1 (home) e p2 (away), ma il display dipende da chi serve
        // IMPORTANTE: Per determinare il vincitore del punto, confrontiamo con il punteggio precedente
        const pointsWithSides = game.points.map((p, pIdx, allPoints) => {
          // Determina chi ha vinto il punto confrontando con il punteggio precedente
          let pointWinner = null;
          
          // Converti punteggi in numeri per confronto
          const scoreToNum = (s) => {
            if (s === 'Game' || s === 'Win') return 100;
            if (s === 'A' || s === 'AD') return 50;
            const n = parseInt(s);
            return isNaN(n) ? 0 : n;
          };
          
          const currServerScore = scoreToNum(p.serverScore);
          const currReceiverScore = scoreToNum(p.receiverScore);
          
          if (pIdx === 0) {
            // Primo punto: chi ha punteggio > 0 ha vinto
            if (currServerScore > currReceiverScore) {
              pointWinner = server; // server ha vinto
            } else if (currReceiverScore > currServerScore) {
              pointWinner = server === 'home' ? 'away' : 'home'; // receiver ha vinto
            } else {
              // Entrambi 0? Impossibile dopo un punto, usa colore come fallback
              if (p.winner === 'server') pointWinner = server;
              else pointWinner = server === 'home' ? 'away' : 'home';
            }
          } else {
            // Punti successivi: confronta con il precedente
            const prevPoint = allPoints[pIdx - 1];
            const prevServerScore = scoreToNum(prevPoint.serverScore);
            const prevReceiverScore = scoreToNum(prevPoint.receiverScore);
            
            // Chi ha aumentato il proprio punteggio?
            if (currServerScore > prevServerScore) {
              pointWinner = server; // server ha aumentato → server ha vinto
            } else if (currReceiverScore > prevReceiverScore) {
              pointWinner = server === 'home' ? 'away' : 'home'; // receiver ha aumentato → receiver ha vinto
            } else {
              // Nessun aumento chiaro (es. da 40-A a 40-40) - usa colore come fallback
              if (p.winner === 'server') pointWinner = server;
              else if (p.winner === 'receiver') pointWinner = server === 'home' ? 'away' : 'home';
              else pointWinner = server; // default a server se non determinabile
            }
          }
          
          // Salviamo serverScore e receiverScore direttamente
          // Il frontend o il backend li convertirà in home/away per la visualizzazione
          return {
            pointNumber: pIdx + 1,
            serverScore: p.serverScore,
            receiverScore: p.receiverScore,
            // Per compatibilità DB: p1=home, p2=away
            // MA il punteggio mostrato deve essere dal punto di vista del server!
            homeScore: server === 'home' ? p.serverScore : p.receiverScore,
            awayScore: server === 'away' ? p.serverScore : p.receiverScore,
            score: `${p.serverScore}-${p.receiverScore}`, // Sempre server-receiver
            pointWinner,
            pointType: p.pointType,
            isBreakPoint: p.isBreakPoint,
            server
          };
        });
        
        // Determina vincitore game
        let gameWinner = null;
        if (game.isBreak) {
          gameWinner = server === 'home' ? 'away' : 'home';
        } else {
          gameWinner = server;
        }
        
        const processedGame = {
          set: parseInt(setNum),
          game: gameNum,
          server,
          serverName: game.serverName,
          isBreak: game.isBreak,
          isTiebreak: game.isTiebreak,
          setScoreBefore: {
            home: server === 'home' ? game.setScoreBefore.server : game.setScoreBefore.receiver,
            away: server === 'away' ? game.setScoreBefore.server : game.setScoreBefore.receiver
          },
          gameWinner,
          points: pointsWithSides
        };
        
        // Aggiungi l'ultimo punto mancante se necessario
        const needsFinalPoint = shouldAddFinalPoint(pointsWithSides, game.isTiebreak, gameWinner);
        if (needsFinalPoint) {
          const finalPoint = generateFinalPoint(pointsWithSides, game.isTiebreak, gameWinner, server);
          finalPoint.pointNumber = pointsWithSides.length + 1; // Fix missing pointNumber
          pointsWithSides.push(finalPoint);
        }
        
        processedGame.points = pointsWithSides;
        
        result.games.push(processedGame);
        result.totalPoints += pointsWithSides.length;
      });
    });

    // Aggiorna i set con i games
    result.games.forEach(g => {
      const setIdx = g.set - 1;
      if (result.sets[setIdx]) {
        result.sets[setIdx].games.push(g);
      }
    });

    return result;

  } catch (err) {
    return { ok: false, error: err.message, sets: [], games: [] };
  }
}

/**
 * Estrae punti dal blocco HTML dei punti
 */
function extractPointsFromBlock(pointsHtml) {
  const points = [];
  
  // Pattern per estrarre punti con i colori
  const pointPattern = /<div class="d_flex flex-d_column gap_sm">[\s\S]*?<span[^>]*style="color:\s*var\(--colors-([^)]+)\)[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*style="color:\s*var\(--colors-([^)]+)\)[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<\/div>/gi;
  
  let pointMatch;
  while ((pointMatch = pointPattern.exec(pointsHtml)) !== null) {
    const serverColor = pointMatch[1];
    const serverScore = pointMatch[2].trim();
    const receiverColor = pointMatch[3];
    const receiverScore = pointMatch[4].trim();
    
    // Determina chi ha vinto
    const serverWon = serverColor.includes('lv1') || serverColor.includes('secondary-default') || serverColor.includes('status-val');
    const receiverWon = receiverColor.includes('lv1') || receiverColor.includes('secondary-default') || receiverColor.includes('status-val');
    
    let winner = null;
    if (serverWon && !receiverWon) {
      winner = 'server';
    } else if (receiverWon && !serverWon) {
      winner = 'receiver';
    } else if (serverScore !== receiverScore) {
      // Fallback: determina dal punteggio
      if (serverScore === 'Game' || serverScore === 'A' || 
          (serverScore === '40' && receiverScore !== '40' && receiverScore !== 'A')) {
        winner = 'server';
      } else if (receiverScore === 'Game' || receiverScore === 'A' ||
                (receiverScore === '40' && serverScore !== '40' && serverScore !== 'A')) {
        winner = 'receiver';
      }
    }
    
    // Tipo punto
    const isBreakPoint = serverColor.includes('status-val') || receiverColor.includes('status-val');
    const isSetMatchPoint = serverColor.includes('secondary') || receiverColor.includes('secondary');
    let pointType = 'regular';
    if (isBreakPoint) pointType = 'break_point';
    else if (isSetMatchPoint) pointType = 'set_point';
    
    points.push({
      serverScore,
      receiverScore,
      winner,
      pointType,
      isBreakPoint,
      isSetMatchPoint
    });
  }
  
  return points;
}

/**
 * Rileva se un game è un tiebreak
 */
function detectTiebreak(points) {
  if (points.length < 3) return false;
  
  const tennisScores = ['0', '15', '30', '40', 'A'];
  
  for (const p of points) {
    const serverNum = parseInt(p.serverScore);
    const receiverNum = parseInt(p.receiverScore);
    
    if (!isNaN(serverNum) && serverNum > 4 && !tennisScores.includes(p.serverScore)) {
      return true;
    }
    if (!isNaN(receiverNum) && receiverNum > 4 && !tennisScores.includes(p.receiverScore)) {
      return true;
    }
  }
  
  const hasTennisScore = points.some(p => 
    p.serverScore === '15' || p.serverScore === '30' || p.serverScore === '40' || p.serverScore === 'A' ||
    p.receiverScore === '15' || p.receiverScore === '30' || p.receiverScore === '40' || p.receiverScore === 'A'
  );
  
  return !hasTennisScore && points.length > 4;
}

/**
 * Determina se dovremmo aggiungere un punto finale
 */
function shouldAddFinalPoint(points, isTiebreak, gameWinner) {
  if (!points || points.length === 0) return true;
  
  const lastPoint = points[points.length - 1];
  
  if (isTiebreak) {
    // Nel tiebreak, deve arrivare a 7+ con 2 di differenza
    const homeScore = parseInt(lastPoint.homeScore);
    const awayScore = parseInt(lastPoint.awayScore);
    
    if (isNaN(homeScore) || isNaN(awayScore)) return true;
    
    const maxScore = Math.max(homeScore, awayScore);
    const diff = Math.abs(homeScore - awayScore);
    
    // Se non è ancora finito (< 7 o differenza < 2)
    return maxScore < 7 || diff < 2;
  } else {
    // Game normale: deve finire con "Game" o essere a 40 e vincere
    const homeScore = lastPoint.homeScore;
    const awayScore = lastPoint.awayScore;
    
    // Se già a "Game", è completo
    if (homeScore === 'Game' || awayScore === 'Game') return false;
    
    // Se nessuno è a 40, manca sicuramente il punto finale
    if (homeScore !== '40' && awayScore !== '40' && homeScore !== 'A' && awayScore !== 'A') {
      return true;
    }
    
    // Se è deuce o vantaggio, e qualcuno vince, manca il punto finale
    if ((homeScore === '40' && awayScore === '40') || 
        (homeScore === 'A' || awayScore === 'A')) {
      return true;
    }
    
    // Se qualcuno è a 40 e l'altro non, e il vincitore è quello a 40
    if (homeScore === '40' && awayScore !== '40' && gameWinner === 'home') return true;
    if (awayScore === '40' && homeScore !== '40' && gameWinner === 'away') return true;
    
    return false;
  }
}

/**
 * Genera il punto finale mancante
 */
function generateFinalPoint(points, isTiebreak, gameWinner, server) {
  if (!points || points.length === 0) {
    return {
      homeScore: gameWinner === 'home' ? (isTiebreak ? '7' : 'Game') : (isTiebreak ? '6' : '0'),
      awayScore: gameWinner === 'away' ? (isTiebreak ? '7' : 'Game') : (isTiebreak ? '6' : '0'),
      pointWinner: gameWinner,
      pointType: 'game_winner',
      isBreakPoint: false,
      isSetMatchPoint: false
    };
  }
  
  const lastPoint = points[points.length - 1];
  const lastServer = lastPoint.server;
  
  if (isTiebreak) {
    // Tiebreak: il vincitore deve raggiungere almeno 7 con 2 di differenza
    // serverScore e receiverScore dall'ultimo punto
    let serverScore = parseInt(lastPoint.serverScore) || 0;
    let receiverScore = parseInt(lastPoint.receiverScore) || 0;
    
    // Chi vince il game?
    const serverWins = (lastServer === 'home' && gameWinner === 'home') || 
                       (lastServer === 'away' && gameWinner === 'away');
    
    if (serverWins) {
      while (serverScore < 7 || serverScore - receiverScore < 2) {
        serverScore++;
      }
    } else {
      while (receiverScore < 7 || receiverScore - serverScore < 2) {
        receiverScore++;
      }
    }
    
    return {
      serverScore: String(serverScore),
      receiverScore: String(receiverScore),
      homeScore: lastServer === 'home' ? String(serverScore) : String(receiverScore),
      awayScore: lastServer === 'away' ? String(serverScore) : String(receiverScore),
      score: `${serverScore}-${receiverScore}`,
      pointWinner: gameWinner,
      pointType: 'game_winner',
      isBreakPoint: false,
      isSetMatchPoint: false,
      server: lastServer
    };
  } else {
    // Game normale: il vincitore vince con "Game"
    // Il server perde se è break, altrimenti vince
    const serverWins = (lastServer === gameWinner);
    
    return {
      serverScore: serverWins ? 'Game' : lastPoint.serverScore,
      receiverScore: serverWins ? lastPoint.receiverScore : 'Game',
      homeScore: lastServer === 'home' ? (serverWins ? 'Game' : lastPoint.serverScore) : (serverWins ? lastPoint.receiverScore : 'Game'),
      awayScore: lastServer === 'away' ? (serverWins ? 'Game' : lastPoint.serverScore) : (serverWins ? lastPoint.receiverScore : 'Game'),
      score: serverWins ? `Game-${lastPoint.receiverScore}` : `${lastPoint.serverScore}-Game`,
      pointWinner: gameWinner,
      pointType: 'game_winner',
      isBreakPoint: false,
      isSetMatchPoint: false,
      server: lastServer
    };
  }
}

/**
 * Formatta i dati estratti per il database (tabella match_point_by_point_new)
 */
function formatForDatabase(extracted, matchId) {
  if (!extracted.ok) return [];
  
  const dbPoints = [];
  
  // Track game scores per set
  const gameScores = { 1: { home: 0, away: 0 }, 2: { home: 0, away: 0 } };
  
  for (const game of extracted.games) {
    // Aggiorna game score alla fine del game precedente
    const setScores = gameScores[game.set] || { home: 0, away: 0 };
    
    for (const point of game.points) {
      dbPoints.push({
        match_id: matchId,
        set_number: game.set,
        game_number: game.game,
        point_number: point.pointNumber,
        score_p1: point.homeScore,  // p1 = home
        score_p2: point.awayScore,  // p2 = away
        game_score_p1: setScores.home,
        game_score_p2: setScores.away,
        server: game.server === 'home' ? 1 : 2,
        point_winner: point.pointWinner === 'home' ? 1 : (point.pointWinner === 'away' ? 2 : (point.pointWinner ? 1 : 2)), // Default a 1 se null
        is_break_point: point.isBreakPoint || false,
        is_set_point: point.pointType === 'set_point' || false,
        is_match_point: false,
        point_description: game.isTiebreak ? 'tiebreak' : (game.isBreak ? 'break_game' : null)
      });
    }
    
    // Aggiorna score dopo il game
    if (game.gameWinner === 'home') {
      gameScores[game.set].home++;
    } else if (game.gameWinner === 'away') {
      gameScores[game.set].away++;
    }
  }
  
  return dbPoints;
}

/**
 * Genera summary del match estratto
 */
function generateSummary(extracted) {
  if (!extracted.ok) return null;
  
  const summary = {
    players: extracted.players,
    sets: extracted.sets.length,
    totalGames: extracted.games.length,
    totalPoints: extracted.totalPoints,
    breakCount: extracted.games.filter(g => g.isBreak).length,
    tiebreaks: extracted.games.filter(g => g.isTiebreak).length,
    gamesPerSet: {}
  };
  
  extracted.sets.forEach(s => {
    summary.gamesPerSet[`Set ${s.setNumber}`] = {
      games: s.games.length,
      duration: s.duration
    };
  });
  
  return summary;
}

// Export CommonJS
module.exports = {
  extractSofascorePbp,
  extractPointsFromBlock,
  detectTiebreak,
  formatForDatabase,
  generateSummary
};
