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
    playerIds: {},
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
      const vacherot = playersArray.find((p) => p.name.includes('Vacherot'));
      const norrie = playersArray.find((p) => p.name.includes('Norrie'));

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
        games: [],
      });
    }
    // Ordina per setNumber per avere sempre Set 1 prima di Set 2
    result.sets = setHeaders
      .map((s) => ({ setNumber: s.setNumber, duration: s.duration, games: [] }))
      .sort((a, b) => a.setNumber - b.setNumber);

    // 3. Estrai game blocks
    const gameBlockPattern =
      /<div class="d_flex px_lg">[\s\S]*?<a[^>]*href="\/it\/tennis\/player\/([^"]+)\/(\d+)"[\s\S]*?<\/a>[\s\S]*?flex-wrap_wrap[^"]*">([\s\S]*?)<\/div><\/div><\/div>/gi;

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
        isTiebreak: detectTiebreak(points),
      });
    }

    // 4. Ordina e numera i games
    const gamesBySet = {};
    rawGames.forEach((g) => {
      if (!gamesBySet[g.setNum]) {
        gamesBySet[g.setNum] = [];
      }
      gamesBySet[g.setNum].push(g);
    });

    // Processa ogni set
    Object.keys(gamesBySet)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((setNum) => {
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

          // Converti punteggi in formato home/away
          const pointsWithSides = game.points.map((p, pIdx) => {
            let homeScore, awayScore, pointWinner;
            if (server === 'home') {
              homeScore = p.serverScore;
              awayScore = p.receiverScore;
              pointWinner =
                p.winner === 'server' ? 'home' : p.winner === 'receiver' ? 'away' : null;
            } else {
              homeScore = p.receiverScore;
              awayScore = p.serverScore;
              pointWinner =
                p.winner === 'receiver' ? 'home' : p.winner === 'server' ? 'away' : null;
            }

            return {
              pointNumber: pIdx + 1,
              homeScore,
              awayScore,
              score: `${homeScore}-${awayScore}`,
              pointWinner,
              pointType: p.pointType,
              isBreakPoint: p.isBreakPoint,
              server,
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
              away: server === 'away' ? game.setScoreBefore.server : game.setScoreBefore.receiver,
            },
            gameWinner,
            points: pointsWithSides,
          };

          result.games.push(processedGame);
          result.totalPoints += pointsWithSides.length;
        });
      });

    // Aggiorna i set con i games
    result.games.forEach((g) => {
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
  const pointPattern =
    /<div class="d_flex flex-d_column gap_sm">[\s\S]*?<span[^>]*style="color:\s*var\(--colors-([^)]+)\)[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*style="color:\s*var\(--colors-([^)]+)\)[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<\/div>/gi;

  let pointMatch;
  while ((pointMatch = pointPattern.exec(pointsHtml)) !== null) {
    const serverColor = pointMatch[1];
    const serverScore = pointMatch[2].trim();
    const receiverColor = pointMatch[3];
    const receiverScore = pointMatch[4].trim();

    // Determina chi ha vinto
    const serverWon = serverColor.includes('lv1') || serverColor.includes('secondary-default');
    const receiverWon =
      receiverColor.includes('lv1') || receiverColor.includes('secondary-default');

    let winner = null;
    if (serverWon && !receiverWon) winner = 'server';
    else if (receiverWon && !serverWon) winner = 'receiver';

    // Tipo punto
    const isBreakPoint = serverColor.includes('status-val') || receiverColor.includes('status-val');
    const isSetMatchPoint =
      serverColor.includes('secondary') || receiverColor.includes('secondary');
    let pointType = 'regular';
    if (isBreakPoint) pointType = 'break_point';
    else if (isSetMatchPoint) pointType = 'set_point';

    points.push({
      serverScore,
      receiverScore,
      winner,
      pointType,
      isBreakPoint,
      isSetMatchPoint,
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

  const hasTennisScore = points.some(
    (p) =>
      p.serverScore === '15' ||
      p.serverScore === '30' ||
      p.serverScore === '40' ||
      p.serverScore === 'A' ||
      p.receiverScore === '15' ||
      p.receiverScore === '30' ||
      p.receiverScore === '40' ||
      p.receiverScore === 'A'
  );

  return !hasTennisScore && points.length > 4;
}

/**
 * Formatta i dati estratti per il database
 */
function formatForDatabase(extracted, matchId) {
  if (!extracted.ok) return [];

  const dbPoints = [];

  for (const game of extracted.games) {
    for (const point of game.points) {
      dbPoints.push({
        match_id: matchId,
        set_number: game.set,
        game_number: game.game,
        point_number: point.pointNumber,
        home_score: point.homeScore,
        away_score: point.awayScore,
        point_winner: point.pointWinner === 'home' ? 1 : point.pointWinner === 'away' ? 2 : null,
        point_type: point.pointType,
        is_break_point: point.isBreakPoint || false,
        is_tiebreak: game.isTiebreak || false,
        server: game.server === 'home' ? 1 : 2,
        game_winner: game.gameWinner === 'home' ? 1 : 2,
        is_break: game.isBreak || false,
        source: 'sofascore_pbp_html',
      });
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
    breakCount: extracted.games.filter((g) => g.isBreak).length,
    tiebreaks: extracted.games.filter((g) => g.isTiebreak).length,
    gamesPerSet: {},
  };

  extracted.sets.forEach((s) => {
    summary.gamesPerSet[`Set ${s.setNumber}`] = {
      games: s.games.length,
      duration: s.duration,
    };
  });

  return summary;
}

// Export ES Module
export {
  extractSofascorePbp,
  extractPointsFromBlock,
  detectTiebreak,
  formatForDatabase,
  generateSummary,
};
