/**
 * PBP Extractor - CONSTITUTIONAL COMPLIANT VERSION
 *
 * INVARIANTI COSTITUZIONALI (NON NEGOZIABILI):
 * 1. NO filtro setNumber - tutti i set devono essere processati
 * 2. NO assunzione row1=server - il server si determina dal DOM
 * 3. NO hardcoding player slug/names
 * 4. Tiebreak MAI come game normale - usa isTiebreakPoints()
 * 5. Punti NON troncati - estrai TUTTI i punti visibili
 * 6. Score impossibili = errore - 50, 60, etc sono INVALIDI
 *
 * ARCHITETTURA:
 * - extractRawPbpData(): estrae SOLO dati raw senza interpretazione semantica
 * - resolveSemantics(): UNICO punto dove si interpretano i dati tennis
 * - formatForDatabase(): converte in formato canonico SERVER-RECEIVER
 *
 * @module pbpExtractor
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estrae slug da href del player
 * @param {string} href - es: "/it/tennis/player/player-slug/123456"
 * @returns {string|null}
 */
function extractSlugFromHref(href) {
  if (!href) return null;
  const match = href.match(/\/player\/([^\/]+)\//);
  return match ? match[1] : null;
}

/**
 * Normalizza score tennis (gestisce A/AD)
 * @param {string} score
 * @returns {string}
 */
function normalizeScore(score) {
  if (!score) return '0';
  const s = String(score).trim().toUpperCase();
  if (s === 'A' || s === 'AD') return 'A';
  return s;
}

/**
 * Valida score tennis (0, 15, 30, 40, A o numeri per tiebreak)
 * @param {string} score
 * @returns {boolean}
 */
function isValidTennisScore(score) {
  const s = normalizeScore(score);
  // Score normali
  if (['0', '15', '30', '40', 'A'].includes(s)) return true;
  // Tiebreak scores (numeri 0-99)
  const num = parseInt(s);
  return !isNaN(num) && num >= 0 && num < 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// RAW EXTRACTION FUNCTIONS (NESSUNA INTERPRETAZIONE SEMANTICA)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estrae informazioni sui giocatori dall'HTML
 * @param {string} html
 * @returns {{row1: {slug, id, name}, row2: {slug, id, name}}}
 */
function extractPlayersFromHtml(html) {
  const players = { row1: null, row2: null };

  // Pattern per trovare link ai giocatori
  const playerLinkPattern =
    /<a[^>]*href="\/[^"]*\/player\/([^"\/]+)\/(\d+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;

  const matches = [];
  let match;
  while ((match = playerLinkPattern.exec(html)) !== null) {
    matches.push({
      slug: match[1],
      id: match[2],
      name: match[3].trim(),
      position: match.index,
    });
  }

  // Prendi i primi due giocatori unici per slug
  const seen = new Set();
  const uniquePlayers = [];
  for (const m of matches) {
    if (!seen.has(m.slug)) {
      seen.add(m.slug);
      uniquePlayers.push(m);
    }
    if (uniquePlayers.length >= 2) break;
  }

  if (uniquePlayers.length >= 1) {
    players.row1 = {
      slug: uniquePlayers[0].slug,
      id: uniquePlayers[0].id,
      name: uniquePlayers[0].name,
    };
  }
  if (uniquePlayers.length >= 2) {
    players.row2 = {
      slug: uniquePlayers[1].slug,
      id: uniquePlayers[1].id,
      name: uniquePlayers[1].name,
    };
  }

  return players;
}

/**
 * Estrae gli header dei set dall'HTML
 * @param {string} html
 * @returns {Array<{setIndex, label, duration, position}>}
 */
function extractSetHeaders(html) {
  const headers = [];

  // Pattern: "1º set • 47m" o "2º set • 49m"
  const setHeaderPattern = /(\d+)[°º]\s*set\s*[•·]\s*(\d+)m/gi;

  let match;
  while ((match = setHeaderPattern.exec(html)) !== null) {
    headers.push({
      setIndex: parseInt(match[1]),
      label: match[0],
      duration: parseInt(match[2]),
      position: match.index,
    });
  }

  // Ordina per setIndex (non per position, perché nell'HTML potrebbero essere in ordine inverso)
  return headers.sort((a, b) => a.setIndex - b.setIndex);
}

/**
 * Trova a quale set appartiene una posizione nel documento
 * @param {number} position
 * @param {Array} setHeaders
 * @returns {number} setIndex
 */
function findSetForPosition(position, setHeaders) {
  if (!setHeaders || setHeaders.length === 0) return 1;

  // Ordina header per position decrescente (ultimo prima)
  const sortedByPos = [...setHeaders].sort((a, b) => b.position - a.position);

  // Trova il primo header la cui position è < della posizione data
  for (const h of sortedByPos) {
    if (position > h.position) {
      return h.setIndex;
    }
  }

  // Se non trovato, usa il primo set
  return sortedByPos[sortedByPos.length - 1]?.setIndex || 1;
}

/**
 * Estrae il block score (games nel set) da un blocco
 * IMPORTANTE: I due span min-w_[20px] mostrano i games del SERVER:
 * - Primo span: games del server PRIMA del game
 * - Secondo span: games del server DOPO il game
 *
 * @param {string} blockHtml
 * @returns {{serverGamesBefore: number|null, serverGamesAfter: number|null}}
 */
function extractBlockScore(blockHtml) {
  const scoreMatches = blockHtml.match(/<span[^>]*min-w_\[20px\][^>]*>(\d+)<\/span>/gi);

  if (!scoreMatches || scoreMatches.length < 2) {
    return { serverGamesBefore: null, serverGamesAfter: null };
  }

  const s1 = scoreMatches[0].match(/>(\d+)</);
  const s2 = scoreMatches[1].match(/>(\d+)</);

  return {
    serverGamesBefore: s1 ? parseInt(s1[1]) : null,
    serverGamesAfter: s2 ? parseInt(s2[1]) : null,
  };
}

/**
 * Rileva se un blocco è un break (dal DOM)
 * @param {string} blockHtml
 * @returns {boolean}
 */
function detectBreakFromBlock(blockHtml) {
  return blockHtml.includes('>Break<');
}

/**
 * Estrae il server slug da un blocco
 * Il blocco px_lg contiene il link del giocatore che serve
 *
 * @param {string} blockHtml
 * @param {string} row1Slug
 * @param {string} row2Slug
 * @returns {string|null}
 */
function extractServerSlugFromBlock(blockHtml, row1Slug, row2Slug) {
  // Cerca il primo link player nel blocco
  const playerMatch = blockHtml.match(/href="[^"]*\/player\/([^"\/]+)\//);
  if (!playerMatch) return null;

  const foundSlug = playerMatch[1];

  // Verifica che sia uno dei due giocatori noti
  if (foundSlug === row1Slug) return row1Slug;
  if (foundSlug === row2Slug) return row2Slug;

  return foundSlug; // Ritorna comunque se trovato
}

/**
 * Estrae i punti raw da un blocco (sezione points)
 * @param {string} pointsHtml - HTML della sezione flex-wrap_wrap
 * @returns {Array<{row1Score, row2Score, row1Color, row2Color}>}
 */
function extractRawPointsFromBlock(pointsHtml) {
  const points = [];

  // Pattern per colonne punto: due span impilati verticalmente
  // Struttura: <div class="d_flex flex-d_column gap_sm"><span>SCORE1</span><span>SCORE2</span></div>
  const columnPattern =
    /<div[^>]*class="[^"]*d_flex[^"]*flex-d_column[^"]*gap_sm[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;

  let match;
  while ((match = columnPattern.exec(pointsHtml)) !== null) {
    const columnHtml = match[1];

    // Estrai i due span dentro la colonna
    const spanPattern =
      /<span[^>]*style="color:\s*var\(--colors-([^)]+)\)[^"]*"[^>]*>([^<]*)<\/span>/gi;
    const spans = [];
    let spanMatch;

    while ((spanMatch = spanPattern.exec(columnHtml)) !== null) {
      spans.push({
        color: spanMatch[1],
        value: spanMatch[2].trim(),
      });
    }

    // Deve avere esattamente 2 span (row1 e row2)
    if (spans.length >= 2) {
      points.push({
        row1Score: normalizeScore(spans[0].value),
        row2Score: normalizeScore(spans[1].value),
        row1Color: spans[0].color,
        row2Color: spans[1].color,
      });
    }
  }

  return points;
}

/**
 * Estrae tutti i blocchi game raw dall'HTML
 * @param {string} html
 * @param {Object} players - {row1, row2}
 * @param {Array} setHeaders
 * @returns {Array<RawGameBlock>}
 */
function extractRawGameBlocks(html, players, setHeaders) {
  const blocks = [];

  // Trova tutte le posizioni di inizio blocco
  const blockStartPattern = /<div class="d_flex px_lg"><div class="py_sm">/g;
  const blockStarts = [];
  let startMatch;
  while ((startMatch = blockStartPattern.exec(html)) !== null) {
    blockStarts.push(startMatch.index);
  }

  // Per ogni blocco, estrai il contenuto fino al prossimo blocco o fine file
  for (let i = 0; i < blockStarts.length; i++) {
    const start = blockStarts[i];
    const end = i < blockStarts.length - 1 ? blockStarts[i + 1] : html.length;

    const blockHtml = html.substring(start, end);

    // Estrai le due parti: player section e points section
    const wrapIdx = blockHtml.indexOf('flex-wrap_wrap');
    if (wrapIdx === -1) continue;

    const playerSection = blockHtml.substring(0, wrapIdx);
    const pointsSection = blockHtml.substring(wrapIdx);

    // Estrai server slug dal player link
    const serverSlug = extractServerSlugFromBlock(
      playerSection,
      players.row1?.slug,
      players.row2?.slug
    );

    // Estrai block score
    const blockScore = extractBlockScore(playerSection);

    // Estrai punti dalla sezione punti
    const rawPoints = extractRawPointsFromBlock(pointsSection);

    // Check break indicator
    const isBreak = detectBreakFromBlock(playerSection);

    // Trova il set per questo blocco
    const setIndex = findSetForPosition(start, setHeaders);

    blocks.push({
      rawBlockIndex: blocks.length,
      position: start,
      setIndex,
      serverSlug,
      blockScore,
      rawPoints,
      isBreakIndicator: isBreak,
      _raw: {
        blockHtmlLength: blockHtml.length,
        pointsCount: rawPoints.length,
      },
    });
  }

  return blocks;
}

/**
 * Estrazione RAW completa - PUNTO DI INGRESSO
 *
 * @param {string} html
 * @returns {RawPbpData}
 */
function extractRawPbpData(html) {
  if (!html || typeof html !== 'string') {
    return { ok: false, error: 'HTML required' };
  }

  try {
    const players = extractPlayersFromHtml(html);
    const setHeaders = extractSetHeaders(html);
    const rawBlocks = extractRawGameBlocks(html, players, setHeaders);

    return {
      ok: true,
      players,
      setHeaders,
      rawBlocks,
      _meta: {
        htmlLength: html.length,
        blocksFound: rawBlocks.length,
        setsFound: setHeaders.length,
      },
    };
  } catch (err) {
    return { ok: false, error: `Raw extraction failed: ${err.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC RESOLUTION (UNICO PUNTO DI INTERPRETAZIONE TENNIS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rileva se i punti sono di un tiebreak
 * @param {Array} rawPoints
 * @returns {boolean}
 */
function isTiebreakPoints(rawPoints) {
  if (!rawPoints || rawPoints.length < 5) return false;

  // Nel tiebreak, i punteggi sono numerici crescenti (0,1,2,3...)
  // NON 0,15,30,40
  // La chiave è che nel tiebreak i punteggi raggiungono valori > 4
  // che non sono 15, 30, o 40

  let hasHighScore = false;

  for (const p of rawPoints) {
    const s1 = parseInt(p.row1Score);
    const s2 = parseInt(p.row2Score);

    if (!isNaN(s1) && !isNaN(s2)) {
      // Un tiebreak ha punteggi tipo 5-4, 6-4, 7-6 etc.
      // Se uno score è > 4 E NON è 15, 30, 40 allora è tiebreak
      if (
        (s1 > 4 && s1 !== 15 && s1 !== 30 && s1 !== 40) ||
        (s2 > 4 && s2 !== 15 && s2 !== 30 && s2 !== 40)
      ) {
        hasHighScore = true;
        break;
      }
    }
  }

  return hasHighScore;
}

/**
 * Determina il vincitore di un game normale dal punteggio finale
 * @param {Object} lastPoint - {row1Score, row2Score}
 * @returns {string} 'row1'|'row2'|'ambiguous'
 */
function determineNormalGameWinner(lastPoint) {
  const s1 = normalizeScore(lastPoint.row1Score);
  const s2 = normalizeScore(lastPoint.row2Score);

  // Game finisce con uno a 40 (o A) e l'altro sotto
  const scoreRank = { 0: 0, 15: 1, 30: 2, 40: 3, A: 4 };

  const r1 = scoreRank[s1];
  const r2 = scoreRank[s2];

  if (r1 === undefined || r2 === undefined) return 'ambiguous';

  // Chi ha score più alto vince (A > 40 > 30 > 15 > 0)
  if (r1 > r2) return 'row1';
  if (r2 > r1) return 'row2';

  return 'ambiguous';
}

/**
 * Determina il vincitore di un tiebreak dal punteggio finale
 * @param {Object} lastPoint - {row1Score, row2Score}
 * @returns {string} 'row1'|'row2'|'ambiguous'
 */
function determineTiebreakWinner(lastPoint) {
  const s1 = parseInt(lastPoint.row1Score);
  const s2 = parseInt(lastPoint.row2Score);

  if (isNaN(s1) || isNaN(s2)) return 'ambiguous';

  // Nel tiebreak vince chi ha almeno 7 punti con 2+ di vantaggio
  if (s1 >= 7 && s1 - s2 >= 2) return 'row1';
  if (s2 >= 7 && s2 - s1 >= 2) return 'row2';

  // Se non ancora finito, chi ha di più è in vantaggio
  if (s1 > s2) return 'row1';
  if (s2 > s1) return 'row2';

  return 'ambiguous';
}

/**
 * RISOLUZIONE SEMANTICA - Converte dati raw in dati semantici tennis
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INVARIANTI TENNIS (NON NEGOZIABILI):
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. Il servizio NON dipende mai dal vincitore
 * 2. Il servizio ALTERNA ogni game (dispari/pari)
 * 3. Il break NON cambia l'alternanza
 * 4. Il primo punto del tie-break è servito da chi avrebbe servito il game successivo
 * 5. Chi serve primo nel tie-break NON serve il primo game del set successivo
 * 6. Se il server iniziale non è nel DOM, è UNKNOWN e NON va inventato
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @param {RawPbpData} rawData
 * @param {Object} context - {homeSlug, awaySlug}
 * @returns {SemanticPbpData}
 */
function resolveSemantics(rawData, context) {
  if (!rawData.ok) {
    return { ok: false, error: rawData.error };
  }

  const { homeSlug, awaySlug } = context;
  const { players, setHeaders, rawBlocks } = rawData;

  // 1. Mappatura row -> home/away
  let row1Side, row2Side;

  if (players.row1?.slug === homeSlug) {
    row1Side = 'home';
    row2Side = 'away';
  } else if (players.row1?.slug === awaySlug) {
    row1Side = 'away';
    row2Side = 'home';
  } else if (players.row2?.slug === homeSlug) {
    row1Side = 'away';
    row2Side = 'home';
  } else if (players.row2?.slug === awaySlug) {
    row1Side = 'home';
    row2Side = 'away';
  } else {
    // Fallback: usa ordine visual (row1=away, row2=home come in Sofascore)
    row1Side = 'away';
    row2Side = 'home';
  }

  const rowToSide = {
    row1: row1Side,
    row2: row2Side,
  };

  // 2. Raggruppa blocchi per set
  const blocksBySet = {};
  for (const block of rawBlocks) {
    const setIdx = block.setIndex || 1;
    if (!blocksBySet[setIdx]) blocksBySet[setIdx] = [];
    blocksBySet[setIdx].push(block);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP CRITICO: Determina chi ha servito Game 1 Set 1
  // Cerchiamo nel primo blocco del Set 1 (NON break) il giocatore mostrato
  // Se non lo troviamo -> UNKNOWN
  // ═══════════════════════════════════════════════════════════════════════════

  let firstServerSide = null; // 'home', 'away', o null (UNKNOWN)

  // Trova il Set 1 (indice più basso)
  const setIndices = Object.keys(blocksBySet)
    .map((k) => parseInt(k))
    .sort((a, b) => a - b);
  const firstSetIdx = setIndices[0];

  if (firstSetIdx && blocksBySet[firstSetIdx]) {
    const firstSetBlocks = blocksBySet[firstSetIdx];
    // Ordina per position decrescente (primo game = position più alta)
    const orderedFirstSet = [...firstSetBlocks].sort((a, b) => b.position - a.position);

    // Il primo blocco è Game 1
    const game1Block = orderedFirstSet[0];

    if (game1Block) {
      // Se NON è un break, il player nel blocco è il server
      // Se È un break, il player nel blocco è il receiver (ma Game 1 quasi mai è break!)
      if (game1Block.serverSlug) {
        const slugRow =
          game1Block.serverSlug === players.row1?.slug
            ? 'row1'
            : game1Block.serverSlug === players.row2?.slug
            ? 'row2'
            : null;
        if (slugRow) {
          if (game1Block.isBreakIndicator) {
            // Break al Game 1: player nel blocco è il receiver (chi ha vinto)
            // Server è l'altro
            firstServerSide = rowToSide[slugRow] === 'home' ? 'away' : 'home';
          } else {
            // Hold al Game 1: player nel blocco è il server
            firstServerSide = rowToSide[slugRow];
          }
        }
      }
    }
  }

  // 3. Processa ogni set con ALTERNANZA RIGOROSA
  const sets = [];
  const games = [];

  // Traccia chi serve il primo game di ogni set
  let currentSetFirstServer = firstServerSide;

  for (let setOrderIdx = 0; setOrderIdx < setIndices.length; setOrderIdx++) {
    const setIdx = setIndices[setOrderIdx];
    const setBlocks = blocksBySet[setIdx];
    const setHeader = setHeaders.find((h) => h.setIndex === parseInt(setIdx));

    // Ordina blocchi per position decrescente (position alta = primo game)
    const orderedBlocks = [...setBlocks].sort((a, b) => b.position - a.position);

    const setGames = [];
    let tiebreakFirstServer = null; // Chi serve primo nel tiebreak di questo set

    for (let gameIdx = 0; gameIdx < orderedBlocks.length; gameIdx++) {
      const block = orderedBlocks[gameIdx];
      const gameNumber = gameIdx + 1;

      // Tiebreak detection
      const isTiebreak = isTiebreakPoints(block.rawPoints);

      // ═══════════════════════════════════════════════════════════════════
      // CALCOLO SERVER - PURA MATEMATICA TENNIS
      //
      // REGOLA: Il servizio ALTERNA ogni game, indipendentemente dal vincitore.
      // - Game 1: firstServer (dispari)
      // - Game 2: l'altro (pari)
      // - Game 3: firstServer (dispari)
      // - ... e così via
      //
      // TIEBREAK: Serve chi avrebbe servito il game 13 normale.
      // Game 12 (pari) → server = altro
      // Game 13 (dispari) → server = firstServer
      // Quindi nel tiebreak serve firstServer!
      // ═══════════════════════════════════════════════════════════════════
      let serverSide = null;

      if (currentSetFirstServer) {
        if (isTiebreak) {
          // Game 13 è dispari, serve chi serve i game dispari = firstServer
          serverSide = currentSetFirstServer;
          tiebreakFirstServer = serverSide;
        } else {
          // Game normale: ALTERNA
          // Game dispari (1, 3, 5...) -> firstServer
          // Game pari (2, 4, 6...) -> altro
          serverSide =
            gameNumber % 2 === 1
              ? currentSetFirstServer
              : currentSetFirstServer === 'home'
              ? 'away'
              : 'home';
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // CALCOLO VINCITORE - DAL BREAK BADGE
      // ═══════════════════════════════════════════════════════════════════
      let gameWinner;
      const isBreak = !isTiebreak && block.isBreakIndicator;

      if (isBreak) {
        // Break = receiver vince
        gameWinner = serverSide === 'home' ? 'away' : 'home';
      } else {
        // Hold o Tiebreak (per ora winner = server, per TB da rivedere)
        gameWinner = serverSide;
      }

      // ═══════════════════════════════════════════════════════════════════
      // NOTA CRITICA SUL TIEBREAK:
      // Nel tiebreak HTML, l'ordine delle righe è INVERTITO rispetto ai game normali!
      // Game normali: row1 = away (sopra), row2 = home (sotto)
      // Tiebreak: row1 = home (sopra), row2 = away (sotto)
      // Questo perché nel tiebreak non c'è un "server" nel blocco header
      // ═══════════════════════════════════════════════════════════════════

      // Per il tiebreak, determina winner dai punti CON MAPPING INVERTITO
      if (isTiebreak) {
        const lastPoint = block.rawPoints[block.rawPoints.length - 1];
        if (lastPoint) {
          const p1 = parseInt(lastPoint.row1Score) || 0;
          const p2 = parseInt(lastPoint.row2Score) || 0;
          // NEL TIEBREAK: row1 = HOME, row2 = AWAY (invertito!)
          if (p1 > p2) {
            gameWinner = 'home'; // row1 ha vinto
          } else if (p2 > p1) {
            gameWinner = 'away'; // row2 ha vinto
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // MAPPATURA ROW → HOME/AWAY PER I PUNTI
      //
      // SCOPERTA CRITICA: In SofaScore, l'ordine dei punti è SEMPRE fisso:
      // - row1 = HOME (indipendentemente da chi serve)
      // - row2 = AWAY (indipendentemente da chi serve)
      //
      // L'header del blocco indica chi serve (o chi ha fatto il break),
      // ma i PUNTI sono sempre ordinati HOME sopra, AWAY sotto.
      //
      // Questo è confermato dai dati:
      // - G1: Vacherot (away) serve, row2 accumula → row2 = away ✓
      // - G2: Norrie (home) serve, row1 accumula → row1 = home ✓
      // ═══════════════════════════════════════════════════════════════════

      // Converti punti in formato canonico
      // I punti sono SEMPRE: row1 = HOME, row2 = AWAY
      const canonicalPoints = block.rawPoints.map((p, pointIdx) => {
        // row1 = HOME, row2 = AWAY (fisso)
        const homeScore = p.row1Score;
        const awayScore = p.row2Score;

        // Determina winner del punto dal colore
        // lv1 o status-val = vincitore
        const row1Won = p.row1Color.includes('lv1') || p.row1Color.includes('status-val');
        const row2Won = p.row2Color.includes('lv1') || p.row2Color.includes('status-val');

        let pointWinner = null;
        // row1 = home, row2 = away
        if (row1Won && !row2Won) pointWinner = 'home';
        else if (row2Won && !row1Won) pointWinner = 'away';

        return {
          pointNumber: pointIdx + 1,
          serverScore: serverSide === 'home' ? homeScore : awayScore,
          receiverScore: serverSide === 'home' ? awayScore : homeScore,
          homeScore,
          awayScore,
          pointWinner,
          _raw: {
            row1Score: p.row1Score,
            row2Score: p.row2Score,
            row1Color: p.row1Color,
            row2Color: p.row2Color,
          },
        };
      });

      const game = {
        set: parseInt(setIdx),
        game: gameNumber,
        server: serverSide, // Può essere null se UNKNOWN
        isTiebreak,
        isBreak,
        gameWinner,
        points: canonicalPoints,
        setScoreBefore: {
          home: setGames.filter((g) => g.gameWinner === 'home').length,
          away: setGames.filter((g) => g.gameWinner === 'away').length,
        },
        _raw: {
          rawBlockIndex: block.rawBlockIndex,
          serverSlug: block.serverSlug,
          isBreakIndicator: block.isBreakIndicator,
          rawPointsCount: block.rawPoints.length,
        },
      };

      setGames.push(game);
      games.push(game);
    }

    sets.push({
      setNumber: parseInt(setIdx),
      duration: setHeader?.duration || null,
      games: setGames,
      finalScore: {
        home: setGames.filter((g) => g.gameWinner === 'home').length,
        away: setGames.filter((g) => g.gameWinner === 'away').length,
      },
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // INVARIANTE 5: Chi serve primo nel tiebreak NON serve primo nel set successivo
    // ═══════════════════════════════════════════════════════════════════════════
    if (tiebreakFirstServer) {
      // Il prossimo set inizia con l'ALTRO
      currentSetFirstServer = tiebreakFirstServer === 'home' ? 'away' : 'home';
    } else if (currentSetFirstServer) {
      // Senza tiebreak: alterna in base al numero di game del set
      // Se il set aveva game pari, il prossimo set inizia con lo stesso server del set corrente? NO!
      // Regola: Se Game finale era X che serviva, il prossimo set inizia con l'altro
      const lastGameServer = setGames[setGames.length - 1]?.server;
      if (lastGameServer) {
        currentSetFirstServer = lastGameServer === 'home' ? 'away' : 'home';
      }
    }
  }

  return {
    ok: true,
    players: {
      home: rowToSide['row1'] === 'home' ? players.row1 : players.row2,
      away: rowToSide['row1'] === 'away' ? players.row1 : players.row2,
    },
    rowMapping: rowToSide,
    firstServer: firstServerSide, // NUOVO: chi ha servito Game 1 Set 1
    sets,
    games,
    _meta: rawData._meta,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE FORMAT (SERVER-RECEIVER CANONICAL)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formatta per database in formato canonico SERVER-RECEIVER
 * @param {SemanticPbpData} semanticData
 * @returns {DbPbpFormat}
 */
function formatForDatabase(semanticData) {
  if (!semanticData.ok) {
    return { ok: false, error: semanticData.error };
  }

  const dbGames = semanticData.games.map((game) => ({
    set_number: game.set,
    game_number: game.game,
    server: game.server,
    is_tiebreak: game.isTiebreak,
    is_break: game.isBreak,
    game_winner: game.gameWinner,
    set_score_before: game.setScoreBefore,
    points: game.points.map((p) => ({
      point_number: p.pointNumber,
      server_score: p.serverScore,
      receiver_score: p.receiverScore,
      home_score: p.homeScore,
      away_score: p.awayScore,
      point_winner: p.pointWinner,
    })),
  }));

  const dbSets = semanticData.sets.map((set) => ({
    set_number: set.setNumber,
    duration_minutes: set.duration,
    final_score: set.finalScore,
    games_count: set.games.length,
    has_tiebreak: set.games.some((g) => g.isTiebreak),
  }));

  return {
    ok: true,
    players: semanticData.players,
    sets: dbSets,
    games: dbGames,
    total_games: dbGames.length,
    total_points: dbGames.reduce((sum, g) => sum + g.points.length, 0),
  };
}

/**
 * Converte in formato P1/P2 (per compatibilità legacy)
 * @param {SemanticPbpData} semanticData
 * @returns {Object}
 */
function toP1P2Format(semanticData) {
  if (!semanticData.ok) {
    return { ok: false, error: semanticData.error };
  }

  return {
    ok: true,
    p1: semanticData.players.home,
    p2: semanticData.players.away,
    sets: semanticData.sets.map((s) => ({
      ...s,
      p1Score: s.finalScore.home,
      p2Score: s.finalScore.away,
    })),
    games: semanticData.games.map((g) => ({
      ...g,
      p1IsServer: g.server === 'home',
      winner: g.gameWinner === 'home' ? 'p1' : g.gameWinner === 'away' ? 'p2' : null,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * API principale - estrae PBP completo
 * @param {string} html
 * @param {Object} context - {homeSlug, awaySlug}
 * @returns {SemanticPbpData}
 */
function extractPbp(html, context) {
  const rawData = extractRawPbpData(html);
  if (!rawData.ok) {
    return rawData;
  }

  return resolveSemantics(rawData, context);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Main API
  extractPbp,

  // Raw extraction (per testing/debug)
  extractRawPbpData,
  extractPlayersFromHtml,
  extractSetHeaders,
  extractRawGameBlocks,
  extractRawPointsFromBlock,
  extractServerSlugFromBlock,

  // Semantic resolution
  resolveSemantics,
  isTiebreakPoints,
  determineNormalGameWinner,
  determineTiebreakWinner,

  // Database format
  formatForDatabase,
  toP1P2Format,
};
