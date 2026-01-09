/**
 * Match Repository - Operazioni CRUD per i match tennis
 * Gestisce l'inserimento e la lettura dei dati dal database Supabase
 */

const { supabase, handleSupabaseError } = require('./supabase');

// Helper per verificare se Supabase Ã¨ disponibile
function checkSupabase() {
  if (!supabase) {
    console.warn('âš ï¸ Supabase not available, skipping database operation');
    return false;
  }
  return true;
}

// ============================================================================
// ID RESOLUTION: sofascore_id -> internal match_id
// ============================================================================

// Cache per evitare query ripetute
const idResolutionCache = new Map();

/**
 * Converte un sofascore_id nel match_id interno del database
 * @param {number} sofascoreId - ID SofaScore (es: 15298534)
 * @returns {Promise<number|null>} - ID interno del match (es: 168) o null
 */
async function resolveMatchId(sofascoreId) {
  if (!checkSupabase()) return null;
  
  const cached = idResolutionCache.get(sofascoreId);
  if (cached !== undefined) return cached;
  
  const { data } = await supabase
    .from('matches')
    .select('id')
    .eq('sofascore_id', sofascoreId)
    .single();
  
  if (data?.id) {
    idResolutionCache.set(sofascoreId, data.id);
    return data.id;
  }
  
  const { data: direct } = await supabase
    .from('matches')
    .select('id')
    .eq('id', sofascoreId)
    .single();
  
  if (direct?.id) {
    idResolutionCache.set(sofascoreId, direct.id);
    return direct.id;
  }
  
  idResolutionCache.set(sofascoreId, null);
  return null;
}


// ============================================================================
// BREAK CALCULATION FROM POINT-BY-POINT
// ============================================================================

/**
 * Calcola break_occurred per ogni game analizzando point-by-point
 * Un break avviene quando chi vince il game (scoring) Ã¨ diverso da chi serve (serving)
 *
 * Questa funzione viene chiamata quando si leggono i powerRankings per arricchirli
 * con l'informazione sui break calcolata dinamicamente dai dati point-by-point.
 *
 * @param {Array} pointByPoint - Dati point-by-point giÃ  strutturati (output di getPointByPoint)
 * @returns {Map} Mappa (set-game) -> boolean (true se break)
 */
function calculateBreaksFromPointByPoint(pointByPoint) {
  const breakMap = new Map();

  if (!pointByPoint || !Array.isArray(pointByPoint)) {
    return breakMap;
  }

  for (const setData of pointByPoint) {
    const setNumber = setData.set || 1;

    for (const gameData of setData.games || []) {
      const gameNumber = gameData.game || 1;

      // Cerca informazioni sul serving/scoring nei punti del game
      // Il primo punto del game contiene spesso l'info sul server
      // Oppure cerchiamo score.serving e score.scoring
      const points = gameData.points || [];

      if (points.length > 0) {
        // Metodo 1: Cerca score.serving e score.scoring
        const lastPoint = points[points.length - 1];
        let serving = null;
        let scoring = null;

        // Cerca nelle proprietÃ  del game
        if (gameData.score) {
          serving = gameData.score.serving;
          scoring = gameData.score.scoring;
        }

        // Oppure cerca nei punti
        if (serving === null || scoring === null) {
          // Cerca serving dal primo punto
          const firstPoint = points[0];
          if (firstPoint.server) {
            serving = firstPoint.server;
          }

          // scoring = chi ha vinto il game (l'ultimo punto)
          if (lastPoint.winner) {
            scoring = lastPoint.winner;
          }
        }

        // Se abbiamo entrambi i valori, determina se Ã¨ un break
        if (
          serving !== null &&
          scoring !== null &&
          serving !== undefined &&
          scoring !== undefined
        ) {
          // Break = quando scoring != serving
          const isBreak = serving !== scoring;
          const key = `${setNumber}-${gameNumber}`;
          breakMap.set(key, isBreak);
        }
      }
    }
  }

  return breakMap;
}

// ============================================================================
// PLAYERS
// ============================================================================

/**
 * Inserisce o aggiorna un giocatore (upsert)
 * @param {Object} player - Dati giocatore
 * @returns {Object} Giocatore inserito/aggiornato
 */
async function upsertPlayer(player) {
  if (!checkSupabase()) return null;
  if (!player || !player.id) return null;

  // Per players_new, usa sofascore_id per trovare/creare e id come PK autoincrement
  // Ma siccome matches usa id come FK, dobbiamo usare sofascore_id come id
  const playerData = {
    id: player.id, // Usa sofascore_id come PK
    sofascore_id: player.id,
    name: player.name || player.fullName || player.shortName || 'Unknown',
    full_name: player.fullName || player.name || null,
    first_name: player.firstName || null,
    last_name: player.lastName || null,
    slug: player.slug || null,
    country_code: player.country?.alpha2 || player.countryAlpha2 || null,
    country_name: player.country?.name || player.countryName || null,
    current_ranking: player.ranking || player.currentRanking || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('players')
    .upsert(playerData, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    if (error.code !== '23505') {
      // Ignora duplicati, logga altri errori
      console.error('Error upserting player:', error.message);
    }
    // Per duplicati, prova a recuperare il player esistente
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('players')
        .select()
        .eq('id', player.id)
        .single();
      return existing;
    }
    return null;
  }

  return data;
}

// ============================================================================
// TOURNAMENTS
// ============================================================================

/**
 * Inserisce o aggiorna un torneo
 */
async function upsertTournament(tournament) {
  if (!checkSupabase()) return null;
  if (!tournament || !tournament.id) return null;

  const tournamentData = {
    id: tournament.id, // Usa sofascore_id come PK
    sofascore_id: tournament.id,
    name: tournament.name || 'Unknown Tournament',
    short_name: tournament.shortName || null,
    slug: tournament.slug || null,
    category: tournament.category?.name || tournament.category || null,
    surface: tournament.groundType || null,
    country_code: tournament.country?.alpha2 || null,
    country_name: tournament.country?.name || tournament.country || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('tournaments')
    .upsert(tournamentData, { onConflict: 'id' })
    .select()
    .single();

  if (error && error.code !== '23505') {
    console.error('Error upserting tournament:', error.message);
  }

  return data;
}

// ============================================================================
// MATCHES
// ============================================================================

/**
 * Inserisce un nuovo match con tutti i dati correlati
 * @param {Object} matchData - Dati completi del match
 * @param {string} sourceUrl - URL da cui sono stati estratti i dati
 * @returns {Object} Match inserito con ID
 */
async function insertMatch(matchData, sourceUrl = null) {
  if (!checkSupabase()) {
    console.warn('âš ï¸ Database not available, match not saved to DB');
    return null;
  }
  const startTime = Date.now();
  const logEntry = {
    source_url: sourceUrl || 'unknown',
    extraction_type: 'scrape',
    status: 'pending',
    started_at: new Date().toISOString(),
  };

  try {
    // 1. Estrai e salva giocatori - ATTENDERE che vengano salvati prima di creare il match
    const homePlayerData = matchData.home || matchData.homeTeam;
    const awayPlayerData = matchData.away || matchData.awayTeam;

    // Salva i player e ottieni i risultati per verificare che esistano
    const homePlayer = homePlayerData?.id ? await upsertPlayer(homePlayerData) : null;
    const awayPlayer = awayPlayerData?.id ? await upsertPlayer(awayPlayerData) : null;

    // Se i player non sono stati salvati correttamente, continua comunque
    // I warning sono silenziati - è normale che player nuovi non esistano nel DB

    // 2. Estrai e salva torneo
    const tournament = matchData.tournament || matchData.uniqueTournament;
    if (tournament?.id) await upsertTournament(tournament);

    // 3. Prepara dati match
    const eventId = matchData.id || matchData.eventId;
    if (!eventId) {
      throw new Error('Missing event ID');
    }

    // Determina winner/loser names based on winnerCode
    const winnerCode = matchData.winnerCode;
    let winnerName = null;
    let loserName = null;

    // Usa i dati originali per i nomi, ma i player verificati per gli ID
    const homeName = homePlayerData?.name || homePlayerData?.fullName || homePlayerData?.shortName || null;
    const awayName = awayPlayerData?.name || awayPlayerData?.fullName || awayPlayerData?.shortName || null;

    if (winnerCode === 1) {
      winnerName = homeName;
      loserName = awayName;
    } else if (winnerCode === 2) {
      winnerName = awayName;
      loserName = homeName;
    }

    // Fallback: if no winnerCode, check scores
    if (!winnerName && !loserName) {
      const homeSets = calculateSetsWon(matchData.homeScore, matchData.awayScore, 'home');
      const awaySets = calculateSetsWon(matchData.homeScore, matchData.awayScore, 'away');
      if (homeSets > awaySets) {
        winnerName = homeName;
        loserName = awayName;
      } else if (awaySets > homeSets) {
        winnerName = awayName;
        loserName = homeName;
      }
    }

    // Costruisci il punteggio nel formato "6-4 7-5"
    const scoreStr = buildScoreString(matchData.homeScore, matchData.awayScore);

    // Estrai punteggi dei set
    const homeScore = matchData.homeScore || {};
    const awayScore = matchData.awayScore || {};

    const match = {
      id: eventId,
      // Colonne matches (nuovo schema)
      player1_id: homePlayer?.id || null,
      player2_id: awayPlayer?.id || null,
      winner_id:
        matchData.winnerCode === 1
          ? homePlayer?.id
          : matchData.winnerCode === 2
          ? awayPlayer?.id
          : null,
      tournament_id: tournament?.id || null,
      match_date: matchData.startTimestamp
        ? new Date(matchData.startTimestamp * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      match_time: matchData.startTimestamp
        ? new Date(matchData.startTimestamp * 1000).toISOString().split('T')[1].substring(0, 8)
        : null,
      start_timestamp: matchData.startTimestamp || null,
      round: matchData.roundInfo?.name || matchData.round || null,
      best_of: matchData.tournament?.tennisMatchFormat?.matchBestOf || 3,
      surface: matchData.groundType || matchData.tournament?.groundType || null,
      status: matchData.status?.type || 'finished',
      winner_code: matchData.winnerCode || null,
      score: scoreStr,
      sets_player1: calculateSetsWon(matchData.homeScore, matchData.awayScore, 'home'),
      sets_player2: calculateSetsWon(matchData.homeScore, matchData.awayScore, 'away'),
      // Set details
      set1_p1: homeScore.period1,
      set1_p2: awayScore.period1,
      set1_tb: null,
      set2_p1: homeScore.period2,
      set2_p2: awayScore.period2,
      set2_tb: null,
      set3_p1: homeScore.period3,
      set3_p2: awayScore.period3,
      set3_tb: null,
      set4_p1: homeScore.period4,
      set4_p2: awayScore.period4,
      set4_tb: null,
      set5_p1: homeScore.period5,
      set5_p2: awayScore.period5,
      set5_tb: null,
      // Rankings/seed (usa dati originali se player non salvato)
      player1_rank: homePlayer?.current_ranking || homePlayerData?.ranking || null,
      player2_rank: awayPlayer?.current_ranking || awayPlayerData?.ranking || null,
      player1_seed: homePlayerData?.seed || null,
      player2_seed: awayPlayerData?.seed || null,
      // Quality & timestamps
      data_quality: 50,
      updated_at: new Date().toISOString(),
    };

    // 4. Inserisci/Aggiorna match
    const { data: insertedMatch, error: matchError } = await supabase
      .from('matches')
      .upsert(match, { onConflict: 'id' })
      .select()
      .single();

    handleSupabaseError(matchError, 'inserting match');

    // 5. Inserisci punteggi set
    await insertMatchScores(eventId, matchData.homeScore, matchData.awayScore);

    // 6. Inserisci point-by-point
    const pbpCount = await insertPointByPoint(eventId, matchData.pointByPoint);

    // 7. Inserisci power rankings (momentum)
    const prCount = await insertPowerRankings(
      eventId,
      matchData.tennisPowerRankings || matchData.powerRankings
    );

    // 8. Inserisci statistiche
    const statsCount = await insertStatistics(eventId, matchData.statistics);

    // 9. Log successo
    logEntry.status = 'success';
    logEntry.match_id = eventId;
    logEntry.points_extracted = pbpCount;
    logEntry.power_rankings_extracted = prCount;
    logEntry.stats_extracted = statsCount;
    logEntry.completed_at = new Date().toISOString();
    logEntry.duration_ms = Date.now() - startTime;

    await supabase.from('extraction_log').insert(logEntry);

    console.log(`âœ… Match ${eventId} saved to database (${logEntry.duration_ms}ms)`);
    console.log(`   - Points: ${pbpCount}, Power Rankings: ${prCount}, Stats: ${statsCount}`);

    return insertedMatch;
  } catch (error) {
    // Log errore
    logEntry.status = 'failed';
    logEntry.error_message = error.message;
    logEntry.completed_at = new Date().toISOString();
    logEntry.duration_ms = Date.now() - startTime;

    await supabase.from('extraction_log').insert(logEntry);

    throw error;
  }
}

/**
 * Costruisce la stringa del punteggio (es. "6-4 7-5")
 */
function buildScoreString(homeScore, awayScore) {
  if (!homeScore || !awayScore) return null;

  const sets = [];
  for (let i = 1; i <= 5; i++) {
    const h = homeScore[`period${i}`];
    const a = awayScore[`period${i}`];
    if (h === undefined || a === undefined) break;
    sets.push(`${h}-${a}`);
  }

  return sets.length > 0 ? sets.join(' ') : null;
}

/**
 * Calcola i set vinti da un giocatore
 */
function calculateSetsWon(homeScore, awayScore, player) {
  if (!homeScore?.period1 || !awayScore?.period1) return null;

  let homeWon = 0;
  let awayWon = 0;

  for (let i = 1; i <= 5; i++) {
    const hGames = homeScore[`period${i}`];
    const aGames = awayScore[`period${i}`];
    if (hGames === undefined || aGames === undefined) break;
    if (hGames > aGames) homeWon++;
    else if (aGames > hGames) awayWon++;
  }

  return player === 'home' ? homeWon : awayWon;
}

/**
 * Inserisce i punteggi dei set
 */
async function insertMatchScores(matchId, homeScore, awayScore) {
  if (!homeScore || !awayScore) return;

  const scores = [];

  for (let i = 1; i <= 5; i++) {
    const hGames = homeScore[`period${i}`];
    const aGames = awayScore[`period${i}`];

    if (hGames === undefined || aGames === undefined) break;

    scores.push({
      match_id: matchId,
      set_number: i,
      home_games: hGames,
      away_games: aGames,
      home_tiebreak: homeScore[`period${i}TieBreak`] || null,
      away_tiebreak: awayScore[`period${i}TieBreak`] || null,
      set_winner: hGames > aGames ? 'home' : aGames > hGames ? 'away' : null,
    });
  }

  if (scores.length > 0) {
    // Prima elimina vecchi punteggi
    await supabase.from('match_scores').delete().eq('match_id', matchId);

    const { error } = await supabase.from('match_scores').insert(scores);
    if (error) console.error('Error inserting match scores:', error.message);
  }
}

/**
 * Inserisce i dati point-by-point
 */
async function insertPointByPoint(matchId, pointByPoint) {
  if (!Array.isArray(pointByPoint) || pointByPoint.length === 0) return 0;

  // Prima elimina vecchi punti
  await supabase.from('point_by_point').delete().eq('match_id', matchId);

  const points = [];

  for (const setItem of pointByPoint) {
    const setNum = setItem.set || 1;
    if (!Array.isArray(setItem.games)) continue;

    for (const game of setItem.games) {
      if (!Array.isArray(game.points)) continue;

      let pointIndex = 0;
      let prevHome = '0';
      let prevAway = '0';

      for (const p of game.points) {
        pointIndex++;

        const homePoint = String(p.homePoint ?? '0');
        const awayPoint = String(p.awayPoint ?? '0');

        // Determina chi ha vinto il punto
        let winner = null;
        if (p.homePointType === 1 || p.homePointType === 3) winner = 'home';
        else if (p.awayPointType === 1 || p.awayPointType === 3) winner = 'away';

        points.push({
          match_id: matchId,
          set_number: setNum,
          game_number: game.game || 1,
          point_index: pointIndex,
          home_point: homePoint,
          away_point: awayPoint,
          score_before: `${prevHome}-${prevAway}`,
          score_after: `${homePoint}-${awayPoint}`,
          point_winner: winner,
          serving: game.score?.serving || null,
          scoring: game.score?.scoring || null, // Chi ha vinto il game
          home_point_type: p.homePointType || null,
          away_point_type: p.awayPointType || null,
          point_description: p.pointDescription || null,
          is_ace: p.pointDescription === 'ace' || p.pointDescription === 1,
          is_double_fault: p.pointDescription === 'double_fault' || p.pointDescription === 2,
        });

        prevHome = homePoint;
        prevAway = awayPoint;
      }
    }
  }

  if (points.length > 0) {
    // Inserisci in batch da 500 per evitare limiti
    const batchSize = 500;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      const { error } = await supabase.from('point_by_point').insert(batch);
      if (error) console.error('Error inserting points batch:', error.message);
    }
  }

  return points.length;
}

/**
 * Inserisce i power rankings (momentum)
 */
async function insertPowerRankings(matchId, powerRankings) {
  if (!Array.isArray(powerRankings) || powerRankings.length === 0) return 0;

  // Prima elimina vecchi rankings
  await supabase.from('power_rankings').delete().eq('match_id', matchId);

  const rankings = powerRankings.map((pr) => {
    const value = pr.value || 0;
    let zone = 'balanced_positive';
    let status = 'neutral';

    if (value > 60) {
      zone = 'strong_control';
      status = 'positive';
    } else if (value >= 20) {
      zone = 'advantage';
      status = 'positive';
    } else if (value > -20) {
      zone = 'balanced_positive';
      status = 'neutral';
    } else if (value > -40) {
      zone = 'slight_pressure';
      status = 'warning';
    } else {
      zone = 'strong_pressure';
      status = 'critical';
    }

    return {
      match_id: matchId,
      set_number: pr.set || 1,
      game_number: pr.game || 1,
      value: value,
      break_occurred: pr.breakOccurred || false,
      zone,
      status,
    };
  });

  const { error } = await supabase.from('power_rankings').insert(rankings);
  if (error) console.error('Error inserting power rankings:', error.message);

  return rankings.length;
}

/**
 * Inserisce power rankings estratti da SVG DOM (fallback quando API non disponibile)
 * Salva i valori nella colonna value_svg, non sovrascrive value esistenti
 * @param {number} matchId - ID del match
 * @param {Array} powerRankings - Array di { set, game, value, side, source }
 * @returns {number} Numero di record inseriti/aggiornati
 */
async function insertPowerRankingsSvg(matchId, powerRankings) {
  if (!checkSupabase()) return 0;
  if (!Array.isArray(powerRankings) || powerRankings.length === 0) return 0;

  let inserted = 0;

  for (const pr of powerRankings) {
    const setNum = pr.set || 1;
    const gameNum = pr.game || 1;
    const valueSvg = pr.value || pr.value_svg || 0;

    // Calcola zone e status
    let zone = 'balanced_positive';
    let status = 'neutral';

    if (valueSvg > 60) {
      zone = 'strong_control';
      status = 'positive';
    } else if (valueSvg >= 20) {
      zone = 'advantage';
      status = 'positive';
    } else if (valueSvg > -20) {
      zone = 'balanced_positive';
      status = 'neutral';
    } else if (valueSvg > -40) {
      zone = 'slight_pressure';
      status = 'warning';
    } else {
      zone = 'strong_pressure';
      status = 'critical';
    }

    // Prova upsert: se esiste giÃ  un record, aggiorna solo value_svg
    const { data: existing } = await supabase
      .from('power_rankings')
      .select('id, value')
      .eq('match_id', matchId)
      .eq('set_number', setNum)
      .eq('game_number', gameNum)
      .single();

    if (existing) {
      // Aggiorna solo value_svg se value API non esiste
      const updateData = {
        value_svg: valueSvg,
        source: existing.value ? 'api' : 'svg_dom',
      };

      // Se non c'Ã¨ value API, usa anche value_svg come value principale
      if (!existing.value) {
        updateData.value = valueSvg;
        updateData.zone = zone;
        updateData.status = status;
      }

      const { error } = await supabase
        .from('power_rankings')
        .update(updateData)
        .eq('id', existing.id);

      if (!error) inserted++;
    } else {
      // Insert nuovo record
      const { error } = await supabase.from('power_rankings').insert({
        match_id: matchId,
        set_number: setNum,
        game_number: gameNum,
        value: valueSvg,
        value_svg: valueSvg,
        break_occurred: pr.breakOccurred || false,
        zone,
        status,
        source: 'svg_dom',
      });

      if (!error) inserted++;
    }
  }

  console.log(`ðŸ“Š SVG Momentum: ${inserted}/${powerRankings.length} records per match ${matchId}`);
  return inserted;
}

/**
 * Inserisce le statistiche del match
 */
async function insertStatistics(matchId, statistics) {
  if (!Array.isArray(statistics) || statistics.length === 0) return 0;

  // Prima elimina vecchie statistiche
  await supabase.from('match_statistics').delete().eq('match_id', matchId);

  const stats = [];

  for (const periodStats of statistics) {
    const period = periodStats.period || 'ALL';
    if (!Array.isArray(periodStats.groups)) continue;

    for (const group of periodStats.groups) {
      if (!Array.isArray(group.statisticsItems)) continue;

      for (const item of group.statisticsItems) {
        stats.push({
          match_id: matchId,
          period,
          group_name: group.groupName || 'Unknown',
          stat_key: item.key || null,
          stat_name: item.name || 'Unknown',
          home_value: String(item.home ?? item.homeValue ?? ''),
          away_value: String(item.away ?? item.awayValue ?? ''),
          home_numeric: parseNumeric(item.home ?? item.homeValue),
          away_numeric: parseNumeric(item.away ?? item.awayValue),
          compare_code: item.compareCode || null,
          statistics_type: item.statisticsType || null,
        });
      }
    }
  }

  if (stats.length > 0) {
    const { error } = await supabase.from('match_statistics').insert(stats);
    if (error) console.error('Error inserting statistics:', error.message);
  }

  return stats.length;
}

/**
 * Estrae valore numerico da stringa
 */
function parseNumeric(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  const n = parseFloat(s.replace(',', '.'));
  if (!isNaN(n)) return n;
  const m = s.match(/(\d+[\d.,]*)/);
  if (m) return parseFloat(m[1].replace(',', '.'));
  return null;
}

// ============================================================================
// QUERY - Lettura dati
// ============================================================================

/**
 * Recupera tutti i match con filtri opzionali
 * Usa query diretta con join invece di view per compatibilitÃ 
 * NOTA: Usa solo matches secondo FILOSOFIA_DB
 */
async function getMatches(options = {}) {
  if (!checkSupabase()) return [];
  const {
    limit = 50,
    offset = 0,
    status,
    tournamentId,
    playerId,
    playerSearch,
    dateFrom,
    dateTo,
    orderBy = 'start_timestamp',
  } = options;

  // Query base su matches
  let query = supabase
    .from('matches')
    .select(
      `
      *,
      player1_data:players!matches_player1_id_fkey(id, name, full_name, country_name, country_code, current_ranking),
      player2_data:players!matches_player2_id_fkey(id, name, full_name, country_name, country_code, current_ranking),
      tournament_data:tournaments!matches_tournament_id_fkey(id, name, surface)
    `
    )
    .order(orderBy, { ascending: false })
    .range(offset, offset + limit - 1);

  // Applica filtri
  if (status) query = query.eq('status', status);
  if (tournamentId) query = query.eq('tournament_id', tournamentId);
  if (playerId) query = query.or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`);
  if (dateFrom) query = query.gte('start_timestamp', dateFrom);
  if (dateTo) query = query.lte('start_timestamp', dateTo);

  // Ricerca per nome giocatore
  if (playerSearch) {
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .ilike('name', `%${playerSearch}%`);

    const playerIds = (players || []).map((p) => p.id);
    if (playerIds.length === 0) return [];

    const playerFilters = playerIds
      .map((id) => `player1_id.eq.${id},player2_id.eq.${id}`)
      .join(',');
    query = query.or(playerFilters);
  }

  const { data, error } = await query;

  if (error) {
    console.log('âš ï¸ matches query failed:', error.message);
    return [];
  }

  // Mappa al formato atteso dal frontend
  return (data || []).map((m) => ({
    id: m.sofascore_id || m.id,
    event_id: m.id,
    home_name: m.player1_data?.name || m.player1_data?.full_name || 'Player 1',
    away_name: m.player2_data?.name || m.player2_data?.full_name || 'Player 2',
    home_country: m.player1_data?.country_code || '',
    away_country: m.player2_data?.country_code || '',
    home_ranking: m.player1_data?.current_ranking || null,
    away_ranking: m.player2_data?.current_ranking || null,
    tournament_name: m.tournament_data?.name || 'Tournament',
    tournament_category: '',
    tournament_ground: m.surface || m.tournament_data?.surface || 'hard',
    status: m.status || 'finished',
    score: m.score || '',
    start_timestamp: m.start_timestamp,
    start_time: m.start_timestamp, // alias per compatibilitÃ 
    date_formatted: m.match_date,
    round: m.round || '',
    best_of: m.best_of || 3,
    surface: m.surface || 'hard',
    winner_code: m.winner_code,
    sets_home: m.sets_player1 || 0,
    sets_away: m.sets_player2 || 0,
  }));
}

/**
 * Recupera un match specifico con tutti i dati correlati
 */
async function getMatchById(matchId) {
  if (!checkSupabase()) return null;

  // Query matches usando solo id (sofascore_id non esiste in questo schema)
  const { data: newMatchRaw, error: newMatchError } = await supabase
    .from('matches')
    .select(
      `
      *,
      player1_data:players!matches_player1_id_fkey(id, name, full_name, country_name, country_code, current_ranking),
      player2_data:players!matches_player2_id_fkey(id, name, full_name, country_name, country_code, current_ranking),
      tournament_data:tournaments!matches_tournament_id_fkey(id, name, surface)
    `
    )
    .eq('id', matchId)
    .single();

  if (!newMatchError && newMatchRaw) {
    // Mappa il formato nuovo al formato atteso dall'API legacy
    const mappedMatch = {
      id: matchId,
      event_id: newMatchRaw.id,
      home_name:
        newMatchRaw.player1_data?.name || newMatchRaw.player1_data?.full_name || 'Player 1',
      away_name:
        newMatchRaw.player2_data?.name || newMatchRaw.player2_data?.full_name || 'Player 2',
      home_country: newMatchRaw.player1_data?.country_code || '',
      away_country: newMatchRaw.player2_data?.country_code || '',
      home_ranking: newMatchRaw.player1_data?.current_ranking || null,
      away_ranking: newMatchRaw.player2_data?.current_ranking || null,
      tournament_name: newMatchRaw.tournament_data?.name || 'Tournament',
      tournament_category: '',
      tournament_ground: newMatchRaw.surface || newMatchRaw.tournament_data?.surface || 'hard',
      status: newMatchRaw.status || 'finished',
      score: newMatchRaw.score || '',
      start_timestamp: newMatchRaw.start_timestamp,
      date_formatted: newMatchRaw.match_date,
      round: newMatchRaw.round || '',
      best_of: newMatchRaw.best_of || 3,
      surface: newMatchRaw.surface || 'hard',
      winner_code: newMatchRaw.winner_code,
      sets_home: newMatchRaw.sets_player1 || 0,
      sets_away: newMatchRaw.sets_player2 || 0,
    };

    return mappedMatch;
  }

  // matches non ha il match - return null per far usare altre fonti (file/SofaScore)
  // La tabella legacy 'matches' non esiste piÃ¹ secondo FILOSOFIA_DB
  if (newMatchError) {
    if (newMatchError.code === 'PGRST116') return null; // Not found
    // Log solo se non Ã¨ un "not found"
    console.log(`âš ï¸ matches query failed for ${matchId}:`, newMatchError.message);
  }
  return null;
}

/**
 * Recupera un match specifico con statistiche complete (usato solo se presente in DB)
 * @deprecated - Usare getMatchById per match singolo, le stats vengono da SofaScore
 */
async function getMatchWithStats(matchId) {
  if (!checkSupabase()) return null;

  const match = await getMatchById(matchId);
  if (!match) return null;

  // Punteggi set
  const { data: scores } = await supabase
    .from('match_scores')
    .select('*')
    .eq('match_id', matchId)
    .order('set_number');

  // Power rankings - mappa i campi DB al formato originale SofaScore
  // Usa COALESCE per fallback: value (API) prioritario, value_svg se manca
  const { data: powerRankingsRaw } = await supabase
    .from('power_rankings')
    .select('*, value, value_svg')
    .eq('match_id', matchId)
    .order('set_number')
    .order('game_number');

  // Point-by-point (fetched first to calculate breaks)
  const pointByPoint = await getPointByPoint(matchId);

  // Calcola break map dal point-by-point
  const breakMap = calculateBreaksFromPointByPoint(pointByPoint);

  // Trasforma in formato compatibile con frontend con fallback logic
  const powerRankings = (powerRankingsRaw || []).map((pr) => {
    const key = `${pr.set_number}-${pr.game_number}`;
    // Usa break calcolato da point-by-point se disponibile, altrimenti usa valore DB
    const breakOccurred = breakMap.has(key) ? breakMap.get(key) : pr.break_occurred || false;

    return {
      set: pr.set_number,
      game: pr.game_number,
      value: pr.value ?? pr.value_svg ?? 0, // Fallback: API -> SVG -> 0
      valueApi: pr.value,
      valueSvg: pr.value_svg,
      breakOccurred: breakOccurred,
      zone: pr.zone,
      status: pr.status,
      source: pr.value ? 'api' : pr.value_svg ? 'svg' : 'none',
    };
  });

  // Statistiche raw dal DB
  const { data: statsRaw } = await supabase
    .from('match_statistics')
    .select('*')
    .eq('match_id', matchId);

  // Ricostruisci statistiche nel formato originale SofaScore
  const statisticsByPeriod = {};
  for (const stat of statsRaw || []) {
    const period = stat.period || 'ALL';
    if (!statisticsByPeriod[period]) {
      statisticsByPeriod[period] = { period, groups: {} };
    }
    if (!statisticsByPeriod[period].groups[stat.group_name]) {
      statisticsByPeriod[period].groups[stat.group_name] = {
        groupName: stat.group_name,
        statisticsItems: [],
      };
    }
    statisticsByPeriod[period].groups[stat.group_name].statisticsItems.push({
      name: stat.stat_name,
      key: stat.stat_key,
      home: stat.home_value,
      away: stat.away_value,
      homeValue: stat.home_numeric,
      awayValue: stat.away_numeric,
      compareCode: stat.compare_code,
      statisticsType: stat.statistics_type,
    });
  }

  // Converti in array con groups come array
  const statistics = Object.values(statisticsByPeriod).map((p) => ({
    period: p.period,
    groups: Object.values(p.groups),
  }));

  // Momentum summary (skip se view non esiste)
  let momentumSummary = null;
  try {
    const { data: msData } = await supabase
      .from('v_momentum_summary')
      .select('*')
      .eq('match_id', matchId)
      .single();
    momentumSummary = msData;
  } catch (e) {
    console.log('âš ï¸ v_momentum_summary not available:', e.message);
  }

  // pointByPoint giÃ  calcolato sopra per il calcolo dei break

  return {
    ...match,
    scores,
    powerRankings,
    statistics,
    momentumSummary,
    pointByPoint,
  };
}

/**
 * Recupera point-by-point per un match
 */
async function getPointByPoint(matchId) {
  if (!checkSupabase()) return [];
  const { data, error } = await supabase
    .from('point_by_point')
    .select('*')
    .eq('match_id', matchId)
    .order('set_number')
    .order('game_number')
    .order('point_index');

  handleSupabaseError(error, 'fetching point-by-point');

  // Riorganizza in struttura gerarchica
  const bySet = {};
  for (const point of data || []) {
    if (!bySet[point.set_number]) {
      bySet[point.set_number] = { set: point.set_number, games: {} };
    }
    if (!bySet[point.set_number].games[point.game_number]) {
      bySet[point.set_number].games[point.game_number] = { game: point.game_number, points: [] };
    }
    bySet[point.set_number].games[point.game_number].points.push(point);
  }

  // Converti in array
  return Object.values(bySet).map((set) => ({
    ...set,
    games: Object.values(set.games),
  }));
}

/**
 * Recupera le statistiche per un match
 */
async function getStatistics(matchId, period = 'ALL') {
  if (!checkSupabase()) return { period, groups: [] };
  const { data, error } = await supabase
    .from('match_statistics')
    .select('*')
    .eq('match_id', matchId)
    .eq('period', period);

  handleSupabaseError(error, 'fetching statistics');

  // Riorganizza per gruppi
  const groups = {};
  for (const stat of data || []) {
    if (!groups[stat.group_name]) {
      groups[stat.group_name] = { groupName: stat.group_name, statisticsItems: [] };
    }
    groups[stat.group_name].statisticsItems.push({
      name: stat.stat_name,
      key: stat.stat_key,
      home: stat.home_value,
      away: stat.away_value,
      homeValue: stat.home_numeric,
      awayValue: stat.away_numeric,
      compareCode: stat.compare_code,
      statisticsType: stat.statistics_type,
    });
  }

  return {
    period,
    groups: Object.values(groups),
  };
}

/**
 * Cerca giocatori per nome
 */
async function searchPlayers(query, limit = 10) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(limit);

  handleSupabaseError(error, 'searching players');
  return data;
}

/**
 * Recupera tutti i tornei
 */
async function getTournaments() {
  if (!checkSupabase()) return [];
  const { data, error } = await supabase.from('tournaments').select('*').order('name');

  handleSupabaseError(error, 'fetching tournaments');
  return data;
}

/**
 * ðŸš€ OTTIMIZZATO: Recupera tornei dalla tabella tournaments con statistiche match
 * Usa la tabella tournaments come fonte primaria (filosofia DB corretta)
 * invece di raggruppare dai match
 */
async function getTournamentsWithStats() {
  if (!checkSupabase()) return [];

  try {
    // 1. Carica tutti i tornei dalla tabella tournaments
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('*')
      .order('name');

    if (tournamentsError) {
      console.log('getTournamentsWithStats tournaments error:', tournamentsError.message);
      return [];
    }

    if (!tournaments || tournaments.length === 0) {
      return [];
    }

    // 2. Carica tutti i match con info base (per aggregazione e preview)
    // Usa matches secondo FILOSOFIA_DB
    const { data: allMatches, error: matchError } = await supabase
      .from('matches')
      .select(
        `
        id,
        sofascore_id,
        tournament_id, 
        status, 
        start_timestamp,
        player1_data:players!matches_player1_id_fkey(name),
        player2_data:players!matches_player2_id_fkey(name)
      `
      )
      .order('start_timestamp', { ascending: false });

    if (matchError) {
      console.log('getTournamentsWithStats matches error:', matchError.message);
      // Ritorna tornei senza statistiche match
      return tournaments.map((t) => ({
        id: t.id,
        name: t.name || 'Unknown',
        category: t.category || '',
        surface: t.ground_type || '',
        country: t.country || '',
        matchCount: 0,
        byStatus: { finished: 0, inprogress: 0, notstarted: 0 },
        earliestDate: null,
        latestDate: null,
        matches: [],
      }));
    }

    // 3. Raggruppa match per torneo con preview
    const matchesByTournament = {};
    for (const m of allMatches || []) {
      const tid = m.tournament_id;
      if (!tid) continue;

      if (!matchesByTournament[tid]) {
        matchesByTournament[tid] = {
          total: 0,
          finished: 0,
          inprogress: 0,
          notstarted: 0,
          earliestDate: null,
          latestDate: null,
          previewMatches: [], // Primi 10 match per preview
        };
      }

      const stats = matchesByTournament[tid];
      stats.total++;

      // Usa 'status' da matches invece di 'status_type'
      const status = (m.status || 'other').toLowerCase();
      if (status === 'finished') stats.finished++;
      else if (status === 'inprogress') stats.inprogress++;
      else if (status === 'notstarted') stats.notstarted++;

      // Usa 'start_timestamp' da matches invece di 'start_time'
      if (m.start_timestamp) {
        const ts = Math.floor(new Date(m.start_timestamp).getTime() / 1000);
        if (!stats.earliestDate || ts < stats.earliestDate) stats.earliestDate = ts;
        if (!stats.latestDate || ts > stats.latestDate) stats.latestDate = ts;
      }

      // Aggiungi ai match preview (max 10 per torneo)
      if (stats.previewMatches.length < 10) {
        stats.previewMatches.push({
          eventId: m.sofascore_id || m.id,
          status: status,
          completeness: 50,
          homeTeam: m.player1_data?.name || '',
          awayTeam: m.player2_data?.name || '',
          startTimestamp: m.start_timestamp ? Math.floor(new Date(m.start_timestamp).getTime() / 1000) : null,
        });
      }
    }

    // 4. Carica detected_matches con dettagli completi per coverage e missing
    let detectedByTournament = {};
    try {
      const { data: detected } = await supabase
        .from('detected_matches')
        .select('*')
        .order('start_time', { ascending: false });

      for (const d of detected || []) {
        if (!d.tournament_id) continue;
        if (!detectedByTournament[d.tournament_id]) {
          detectedByTournament[d.tournament_id] = {
            total: 0,
            acquired: 0,
            missingMatches: [],
          };
        }
        const stats = detectedByTournament[d.tournament_id];
        stats.total++;

        if (d.is_acquired) {
          stats.acquired++;
        } else {
          // Aggiungi ai missing (max 50 per non appesantire)
          if (stats.missingMatches.length < 50) {
            stats.missingMatches.push({
              eventId: d.event_id || d.id,
              homeTeam: d.home_team_name || 'TBD',
              awayTeam: d.away_team_name || 'TBD',
              status: d.status_type || d.status || 'unknown',
              startTimestamp: d.start_time,
              isAcquired: false,
            });
          }
        }
      }
    } catch (e) {
      console.log('detected_matches load error:', e.message);
      // detected_matches potrebbe non esistere
    }

    // 5. Costruisci risultato finale
    const result = tournaments.map((t) => {
      const mStats = matchesByTournament[t.id] || {
        total: 0,
        finished: 0,
        inprogress: 0,
        notstarted: 0,
        previewMatches: [],
      };
      const dStats = detectedByTournament[t.id] || null;

      // Calcola coverage
      const totalDetected = dStats?.total || 0;
      const coveragePercentage =
        totalDetected > 0 ? Math.round((mStats.total / totalDetected) * 100) : 100; // Se non abbiamo detected, consideriamo 100%

      return {
        id: t.id,
        uniqueTournamentId: t.unique_tournament_id || null,
        name: t.name || 'Unknown',
        category: t.category || '',
        surface: t.ground_type || '',
        country: t.country || '',
        sport: 'tennis',
        matchCount: mStats.total,
        avgCompleteness: 50, // Default, puÃ² essere calcolato se serve
        byStatus: {
          finished: mStats.finished,
          inprogress: mStats.inprogress,
          notstarted: mStats.notstarted,
        },
        matches: mStats.previewMatches || [], // Primi 10 match per preview
        latestDate: mStats.latestDate,
        earliestDate: mStats.earliestDate,
        coverage: {
          totalDetected: totalDetected,
          acquired: mStats.total,
          missing: Math.max(0, totalDetected - mStats.total),
          percentage: coveragePercentage,
        },
        missingMatches: dStats?.missingMatches || [], // Partite rilevate ma non acquisite
      };
    });

    // 6. Ordina per data piÃ¹ recente, poi per numero match
    result.sort((a, b) => {
      // Prima i tornei con match recenti
      if (!a.latestDate && !b.latestDate) return b.matchCount - a.matchCount;
      if (!a.latestDate) return 1;
      if (!b.latestDate) return -1;
      return b.latestDate - a.latestDate;
    });

    return result;
  } catch (err) {
    console.error('getTournamentsWithStats exception:', err.message);
    return [];
  }
}

/**
 * Recupera log estrazioni recenti
 */
async function getExtractionLogs(limit = 20) {
  const { data, error } = await supabase
    .from('extraction_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  handleSupabaseError(error, 'fetching extraction logs');
  return data;
}

// ============================================================================
// DETECTED MATCHES - Partite rilevate dai tornei (solo lettura)
// ============================================================================

/**
 * Recupera tutte le partite rilevate (detected) per un torneo specifico
 * @param {number} tournamentId - ID del torneo (season_id)
 * @returns {Array} Lista partite rilevate
 */
async function getDetectedMatchesByTournament(tournamentId) {
  if (!checkSupabase()) return [];

  const { data, error } = await supabase
    .from('detected_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('start_time', { ascending: false });

  if (error) {
    // La tabella potrebbe non esistere
    console.log('detected_matches query error:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Recupera statistiche aggregate delle partite rilevate per torneo
 * @returns {Object} Statistiche per torneo { tournamentId: { total, acquired, missing } }
 */
async function getDetectedMatchesStats() {
  if (!checkSupabase()) return {};

  const { data, error } = await supabase
    .from('detected_matches')
    .select(
      'id, tournament_id, tournament_name, is_acquired, home_team_name, away_team_name, status, status_type, start_time'
    );

  if (error) {
    console.log('detected_matches stats error:', error.message);
    return {};
  }

  // Raggruppa per torneo
  const statsByTournament = {};

  for (const match of data || []) {
    const tid = match.tournament_id;
    if (!statsByTournament[tid]) {
      statsByTournament[tid] = {
        tournamentId: tid,
        tournamentName: match.tournament_name || 'Unknown',
        total: 0,
        acquired: 0,
        missing: 0,
        missingMatches: [],
      };
    }

    statsByTournament[tid].total++;

    if (match.is_acquired) {
      statsByTournament[tid].acquired++;
    } else {
      statsByTournament[tid].missing++;
      statsByTournament[tid].missingMatches.push({
        eventId: match.id,
        homeTeam: match.home_team_name || 'TBD',
        awayTeam: match.away_team_name || 'TBD',
        status: match.status_type || match.status || 'unknown',
        startTimestamp: match.start_time,
        isAcquired: false,
      });
    }
  }

  return statsByTournament;
}

/**
 * Recupera tutte le partite rilevate NON acquisite (mancanti)
 * @param {number} limit - Limite risultati
 * @returns {Array} Lista partite mancanti
 */
async function getMissingMatches(limit = 500) {
  if (!checkSupabase()) return [];

  const { data, error } = await supabase
    .from('detected_matches')
    .select('*')
    .eq('is_acquired', false)
    .order('start_timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.log('getMissingMatches error:', error.message);
    return [];
  }

  return data || [];
}

/**
 * ðŸš€ OTTIMIZZATO: Ritorna solo i conteggi raggruppati per anno/mese
 * Usato dalla HomePage per rendering iniziale SENZA caricare tutti i match
 * Filosofia: "1 query only" - leggero e veloce
 * NOTA: Usa matches secondo FILOSOFIA_DB
 */
async function getMatchesSummary() {
  if (!checkSupabase()) return { total: 0, byYearMonth: [] };

  try {
    // Prima otteniamo il count totale (leggero)
    const { count: total, error: countError } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('getMatchesSummary count error:', countError.message);
      return { total: 0, byYearMonth: [] };
    }

    // ðŸ”§ FIX: Supabase ritorna max 1000 righe di default - usiamo paginazione!
    let allData = [];
    const pageSize = 1000;
    let offset = 0;

    /* eslint-disable-next-line no-constant-condition */
    while (true) {
      const { data: page, error } = await supabase
        .from('matches')
        .select('start_timestamp')
        .not('start_timestamp', 'is', null)
        .order('start_timestamp', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.log('getMatchesSummary pagination error:', error.message);
        break;
      }

      if (!page || page.length === 0) break;
      allData = allData.concat(page);
      offset += pageSize;

      // Se abbiamo ricevuto meno di pageSize, siamo all'ultima pagina
      if (page.length < pageSize) break;
    }

    // Raggruppa lato JS (piÃ¹ flessibile di SQL per formattazione)
    const groups = {};
    for (const match of allData) {
      if (!match.start_timestamp) continue;
      const date = new Date(match.start_timestamp);
      if (isNaN(date.getTime())) continue; // Skip invalid dates
      const yearKey = String(date.getFullYear());
      const monthKey = `${yearKey}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!groups[yearKey]) groups[yearKey] = { year: yearKey, months: {} };
      if (!groups[yearKey].months[monthKey]) groups[yearKey].months[monthKey] = 0;
      groups[yearKey].months[monthKey]++;
    }

    // Converti in array ordinato (anni e mesi piÃ¹ recenti prima)
    const byYearMonth = Object.values(groups)
      .sort((a, b) => b.year.localeCompare(a.year))
      .map((yearGroup) => ({
        year: yearGroup.year,
        months: Object.entries(yearGroup.months)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([monthKey, count]) => ({ monthKey, count })),
      }));

    return {
      total: total || allData.length || 0,
      byYearMonth,
    };
  } catch (err) {
    console.error('getMatchesSummary exception:', err.message);
    return { total: 0, byYearMonth: [] };
  }
}

/**
 * ðŸš€ OTTIMIZZATO: Ritorna match di un mese specifico (lazy load)
 * Chiamato solo quando l'utente espande un mese
 * Filosofia: carica solo quello che serve, quando serve
 */
async function getMatchesByMonth(yearMonth) {
  if (!checkSupabase()) return [];

  // Parse yearMonth (es. "2024-12")
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return [];

  // Range del mese
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59); // Ultimo giorno del mese

  const { data, error } = await supabase
    .from('v_matches_full')
    .select('*')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .order('start_time', { ascending: false });

  if (error) {
    console.log('getMatchesByMonth error:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Conta i match con filtri (per paginazione)
 */
async function countMatches(options = {}) {
  if (!checkSupabase()) return 0;
  const { status, tournamentId, playerSearch, dateFrom, dateTo } = options;

  // Query base su matches secondo FILOSOFIA_DB
  let query = supabase.from('matches').select('id', { count: 'exact', head: true });

  if (status) query = query.eq('status', status);
  if (tournamentId) query = query.eq('tournament_id', tournamentId);
  if (dateFrom) query = query.gte('start_timestamp', dateFrom);
  if (dateTo) query = query.lte('start_timestamp', dateTo);

  // Ricerca per nome giocatore
  if (playerSearch) {
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .ilike('name', `%${playerSearch}%`);

    const playerIds = (players || []).map((p) => p.id);
    if (playerIds.length === 0) return 0;

    const playerFilters = playerIds
      .map((id) => `player1_id.eq.${id},player2_id.eq.${id}`)
      .join(',');
    query = query.or(playerFilters);
  }

  const { count, error } = await query;

  if (error) {
    console.log('countMatches error:', error.message);
    return 0;
  }

  return count || 0;
}

/**
 * Recupera lista tornei distinti (per dropdown filtri)
 */
async function getDistinctTournaments() {
  if (!checkSupabase()) return [];

  // Prova prima dalla tabella tournaments
  const { data: tournamentsData, error: tournamentsError } = await supabase
    .from('tournaments')
    .select('id, name, category');

  if (!tournamentsError && tournamentsData && tournamentsData.length > 0) {
    // Conta match per ogni torneo - usa matches secondo FILOSOFIA_DB
    const { data: matchCounts } = await supabase.from('matches').select('tournament_id');

    const countMap = {};
    for (const m of matchCounts || []) {
      countMap[m.tournament_id] = (countMap[m.tournament_id] || 0) + 1;
    }

    return tournamentsData
      .map((t) => ({
        id: t.id,
        name: t.name || 'Unknown',
        category: t.category || '',
        matchCount: countMap[t.id] || 0,
      }))
      .filter((t) => t.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);
  }

  // Fallback: raggruppa da matches
  const { data, error } = await supabase.from('matches').select('tournament_id');

  if (error) {
    console.log('getDistinctTournaments error:', error.message);
    return [];
  }

  // Raggruppa e conta
  const countMap = {};
  for (const m of data || []) {
    if (m.tournament_id) {
      countMap[m.tournament_id] = (countMap[m.tournament_id] || 0) + 1;
    }
  }

  // Recupera nomi tornei dalla tabella tournaments
  const tournamentIds = Object.keys(countMap);
  if (tournamentIds.length === 0) return [];

  const { data: tournamentNames } = await supabase
    .from('tournaments')
    .select('id, name, category')
    .in('id', tournamentIds);

  const nameMap = {};
  for (const t of tournamentNames || []) {
    nameMap[t.id] = { name: t.name, category: t.category };
  }

  return tournamentIds
    .map((id) => ({
      id: parseInt(id),
      name: nameMap[id]?.name || `Tournament ${id}`,
      category: nameMap[id]?.category || '',
      matchCount: countMap[id],
    }))
    .sort((a, b) => b.matchCount - a.matchCount);
}

// ============================================================================
// MATCH CARD SNAPSHOT (Single query per card)
// ============================================================================

/**
 * Get match card snapshot (pre-computed, fast)
 * @param {number} matchId - Match ID
 * @returns {Object} Complete match card data
 */
async function getMatchCardSnapshot(matchId) {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase
    .from('match_card_snapshot')
    .select('*')
    .eq('match_id', matchId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No snapshot exists, build it on demand
      console.log(`ðŸ“¸ No snapshot for match ${matchId}, building...`);
      await buildMatchCardSnapshot(matchId);
      return getMatchCardSnapshot(matchId);
    }
    console.error('Error fetching snapshot:', error.message);
    return null;
  }

  return data;
}

/**
 * Build or rebuild match card snapshot
 * @param {number} matchId - Match ID
 */
async function buildMatchCardSnapshot(matchId) {
  if (!checkSupabase()) return null;

  // Try using SQL function first
  const { error: rpcError } = await supabase.rpc('build_match_card_snapshot', {
    p_match_id: matchId,
  });

  if (rpcError) {
    if (rpcError.code === '42883') {
      // Function doesn't exist, build manually
      return await buildMatchCardSnapshotManual(matchId);
    }
    console.error('Error building snapshot via RPC:', rpcError.message);
    return null;
  }

  console.log(`âœ… Snapshot built for match ${matchId}`);
  return true;
}

/**
 * Manual snapshot builder (fallback)
 */
async function buildMatchCardSnapshotManual(matchId) {
  // Fetch all data in parallel
  const [matchResult, statsResult, momentumResult, oddsResult, sourcesResult] = await Promise.all([
    supabase.from('v_matches_with_players').select('*').eq('id', matchId).single(),
    supabase.from('match_statistics').select('*').eq('match_id', matchId),
    supabase
      .from('match_power_rankings')
      .select('*')
      .eq('match_id', matchId)
      .order('set_number')
      .order('game_number'),
    supabase.from('match_odds').select('*').eq('match_id', matchId),
    supabase.from('match_data_sources').select('*').eq('match_id', matchId),
  ]);

  const matchData = matchResult.data;
  if (!matchData) return null;

  // Applica priorità SVG al momentum
  const processedMomentum = (momentumResult.data || []).map(row => {
    if (row.value_svg != null) {
      return {
        ...row,
        value: row.value_svg,
        source: 'svg_manual',
        _original_value: row.value,
      };
    }
    return row;
  });

  // Get players
  const [p1Result, p2Result] = await Promise.all([
    supabase.from('players').select('*').eq('id', matchData.player1_id).single(),
    supabase.from('players').select('*').eq('id', matchData.player2_id).single(),
  ]);

  // Get H2H
  const [minP, maxP] =
    matchData.player1_id < matchData.player2_id
      ? [matchData.player1_id, matchData.player2_id]
      : [matchData.player2_id, matchData.player1_id];

  const { data: h2h } = await supabase
    .from('head_to_head')
    .select('*')
    .eq('player1_id', minP)
    .eq('player2_id', maxP)
    .single();

  // Calculate quality
  let quality = 0;
  if (sourcesResult.data?.length > 0) quality += 20;
  if (statsResult.data?.length > 0) quality += 20;
  if (oddsResult.data?.length > 0) quality += 20;
  if (momentumResult.data?.length > 0) quality += 20;

  const { count: pbpCount } = await supabase
    .from('match_point_by_point')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', matchId);
  if (pbpCount > 0) quality += 20;

  // Build snapshot
  const snapshot = {
    match_id: matchId,
    core_json: {
      id: matchData.id,
      date: matchData.match_date,
      time: matchData.match_time,
      round: matchData.round,
      surface: matchData.surface,
      bestOf: matchData.best_of,
      status: matchData.status,
      score: matchData.score,
      setsPlayer1: matchData.sets_player1,
      setsPlayer2: matchData.sets_player2,
      winnerCode: matchData.winner_code,
      tournament: {
        id: matchData.tournament_id,
        name: matchData.tournament_name,
        category: matchData.tournament_category,
      },
    },
    players_json: {
      player1: {
        id: p1Result.data?.id,
        name: p1Result.data?.name,
        country: p1Result.data?.country_code,
        currentRanking: p1Result.data?.current_ranking,
        rankingAtMatch: matchData.player1_rank,
        seed: matchData.player1_seed,
      },
      player2: {
        id: p2Result.data?.id,
        name: p2Result.data?.name,
        country: p2Result.data?.country_code,
        currentRanking: p2Result.data?.current_ranking,
        rankingAtMatch: matchData.player2_rank,
        seed: matchData.player2_seed,
      },
    },
    h2h_json: h2h || null,
    stats_json: statsResult.data
      ? statsResult.data.reduce((acc, s) => ({ ...acc, [s.period]: s }), {})
      : null,
    momentum_json: processedMomentum,
    odds_json: {
      opening: oddsResult.data?.find((o) => o.is_opening) || oddsResult.data?.[0] || null,
      closing:
        oddsResult.data?.find((o) => o.is_closing) ||
        oddsResult.data?.[oddsResult.data.length - 1] ||
        null,
      all: oddsResult.data || [],
    },
    data_sources_json: sourcesResult.data || [],
    data_quality_int: quality,
    last_updated_at: new Date().toISOString(),
  };

  // Upsert snapshot
  const { error: upsertError } = await supabase
    .from('match_card_snapshot')
    .upsert(snapshot, { onConflict: 'match_id' });

  if (upsertError) {
    console.error('Error upserting snapshot:', upsertError.message);
    return null;
  }

  return snapshot;
}

// ============================================================================
// PLAYER RANKINGS (Temporal lookup)
// ============================================================================

/**
 * Get player ranking at a specific date
 * @param {number} playerId - Player ID
 * @param {string} matchDate - Date to lookup ranking (YYYY-MM-DD)
 * @returns {Object} Ranking info at date
 */
async function getRankingAtDate(playerId, matchDate) {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase
    .from('player_rankings')
    .select('rank_int, points_int, ranking_date')
    .eq('player_id', playerId)
    .lte('ranking_date', matchDate)
    .order('ranking_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // May not have ranking history, return null
    return null;
  }

  return data;
}

/**
 * Insert or update player ranking
 */
async function upsertPlayerRanking(
  playerId,
  rankingDate,
  rank,
  points = null,
  rankingType = 'ATP'
) {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase
    .from('player_rankings')
    .upsert(
      {
        player_id: playerId,
        ranking_date: rankingDate,
        rank_int: rank,
        points_int: points,
        ranking_type: rankingType,
      },
      { onConflict: 'player_id,ranking_date,ranking_type' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting ranking:', error.message);
    return null;
  }

  return data;
}

// ============================================================================
// LAZY DATA ENDPOINTS (Deep data, loaded on demand)
// ============================================================================

/**
 * Get match momentum data (power rankings)
 * PRIORITÀ: Se value_svg è presente, ha la precedenza su value (dati live)
 * Questo perché value_svg viene inserito manualmente quando i dati live sono incompleti
 */
async function getMatchMomentum(matchId) {
  if (!checkSupabase()) return [];

  const { data, error } = await supabase
    .from('match_power_rankings')
    .select('*')
    .eq('match_id', matchId)
    .order('set_number')
    .order('game_number');

  if (error) {
    console.error('Error fetching momentum:', error.message);
    return [];
  }

  // Se value_svg è presente, sovrascrive value (priorità ai dati manuali)
  const processed = (data || []).map(row => {
    if (row.value_svg != null) {
      return {
        ...row,
        value: row.value_svg, // SVG ha priorità
        source: 'svg_manual', // Indica che stiamo usando dati SVG
        _original_value: row.value, // Salva il valore originale per debug
      };
    }
    return row;
  });

  return processed;
}

/**
 * Get match statistics
 */
async function getMatchStatisticsNew(matchId) {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase
    .from('match_statistics')
    .select('*')
    .eq('match_id', matchId)
    .order('period');

  if (error) {
    console.error('Error fetching statistics:', error.message);
    return null;
  }

  // Organize by period
  const byPeriod = {};
  for (const stat of data || []) {
    byPeriod[stat.period] = stat;
  }

  return byPeriod;
}

/**
 * Get match odds
 */
async function getMatchOdds(matchId) {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase
    .from('match_odds')
    .select('*')
    .eq('match_id', matchId)
    .order('recorded_at');

  if (error) {
    console.error('Error fetching odds:', error.message);
    return null;
  }

  if (!data || data.length === 0) return null;

  return {
    opening: data.find((o) => o.is_opening) || data[0],
    closing: data.find((o) => o.is_closing) || data[data.length - 1],
    all: data,
  };
}

/**
 * Get point-by-point data (paginated for large matches)
 * Tries new table first, falls back to legacy table
 */
async function getMatchPointByPoint(matchId, options = {}) {
  if (!checkSupabase()) return { data: [], total: 0 };

  const { offset = 0, limit = 500 } = options;

  // PRIORITY: Check if point_by_point has serving/scoring data (needed for break detection)
  // This table has the crucial serving/scoring fields that match_point_by_point_new lacks
  const { count: legacyCount } = await supabase
    .from('point_by_point')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', matchId);

  if (legacyCount && legacyCount > 0) {
    // Check if it has serving data
    const { data: sampleLegacy } = await supabase
      .from('point_by_point')
      .select('serving')
      .eq('match_id', matchId)
      .not('serving', 'is', null)
      .limit(1);

    if (sampleLegacy?.length > 0) {
      // Legacy table has serving data - use it for break detection
      const { data: legacyData, error: legacyError } = await supabase
        .from('point_by_point')
        .select('*')
        .eq('match_id', matchId)
        .order('set_number')
        .order('game_number')
        .order('point_index')
        .range(offset, offset + limit - 1);

      if (!legacyError && legacyData?.length > 0) {
        // Map legacy format to new format
        const mappedData = legacyData.map((p) => ({
          id: p.id,
          match_id: p.match_id,
          set_number: p.set_number,
          game_number: p.game_number,
          point_number: p.point_index,
          home_point: p.home_point,
          away_point: p.away_point,
          score_before: p.score_before,
          score_after: p.score_after,
          point_winner: p.point_winner,
          serving: p.serving,
          scoring: p.scoring,
          home_point_type: p.home_point_type,
          away_point_type: p.away_point_type,
          point_description: p.point_description,
          is_break_point: p.is_break_point,
          is_ace: p.is_ace,
          is_double_fault: p.is_double_fault,
          created_at: p.created_at,
        }));

        return {
          data: mappedData,
          total: legacyCount,
          offset,
          limit,
          hasMore: offset + limit < legacyCount,
          source: 'point_by_point',
        };
      }
    }
  }

  // Try new table if legacy doesn't have serving data
  const { count: newCount } = await supabase
    .from('match_point_by_point')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', matchId);

  if (newCount && newCount > 0) {
    // Get data from new table
    const { data, error } = await supabase
      .from('match_point_by_point')
      .select('*')
      .eq('match_id', matchId)
      .order('set_number')
      .order('game_number')
      .order('point_number')
      .range(offset, offset + limit - 1);

    if (!error && data?.length > 0) {
      // Complete games by inferring missing final points
      const { completePbpGames } = require('../utils/completePbpGames.cjs');
      const completedData = completePbpGames(data);

      return {
        data: completedData,
        total: completedData.length,
        offset,
        limit,
        hasMore: offset + limit < completedData.length,
        source: 'match_point_by_point_new_completed',
      };
    }
  }

  // FALLBACK: Try power_rankings table (SVG momentum data)
  // This data comes from SVG insertion and has game-level momentum info
  const {
    data: prData,
    count: prCount,
    error: prError,
  } = await supabase
    .from('power_rankings')
    .select('*', { count: 'exact' })
    .eq('match_id', matchId)
    .order('set_number')
    .order('game_number')
    .range(offset, offset + limit - 1);

  if (!prError && prData?.length > 0) {
    // Map power_rankings to point_by_point format for consistency
    // Momentum value indicates who won the game:
    // - POSITIVE = Home won the game
    // - NEGATIVE = Away won the game
    const mappedData = prData.map((pr, idx) => {
      const setNum = pr.set_number || 1;
      const gameNum = pr.game_number || 1;

      // Calculate server based on tennis rules:
      // AWAY serves first in set 1 (this match's data shows away served first)
      // In set 1: odd games (1,3,5...) = AWAY serves, even games (2,4,6...) = HOME serves
      // In set 2: opposite (service changes at set start)
      const awayServesFirstInSet = setNum % 2 === 1;
      const isOddGame = gameNum % 2 === 1;
      const serverNum = awayServesFirstInSet
        ? isOddGame
          ? 2
          : 1 // Set 1,3,5: odd=AWAY, even=HOME
        : isOddGame
        ? 1
        : 2; // Set 2,4: odd=HOME, even=AWAY

      // Game winner from momentum value:
      // Positive = Home won, Negative = Away won
      const value = pr.value_svg || pr.value || 0;
      const gameWinnerNum = value >= 0 ? 1 : 2; // 1=home, 2=away

      // BREAK = server loses the game (serving !== scoring)
      const isBreak = serverNum !== gameWinnerNum;

      return {
        id: pr.id,
        match_id: pr.match_id,
        set_number: setNum,
        game_number: gameNum,
        point_number: 1, // One entry per game
        value: pr.value,
        value_svg: pr.value_svg,
        break_occurred: isBreak,
        zone: pr.zone,
        source: pr.source || 'power_rankings',
        serving: serverNum,
        scoring: gameWinnerNum,
        created_at: pr.created_at,
      };
    });

    return {
      data: mappedData,
      total: prCount,
      offset,
      limit,
      hasMore: offset + limit < prCount,
      source: 'power_rankings',
    };
  }

  // FALLBACK 3: Try match_power_rankings_new table (SVG momentum data with new schema)
  // This table may have data inserted by Tennis-Scraper-Local
  const {
    data: mprData,
    count: mprCount,
    error: mprError,
  } = await supabase
    .from('match_power_rankings')
    .select('*', { count: 'exact' })
    .eq('match_id', matchId)
    .order('set_number')
    .order('game_number')
    .range(offset, offset + limit - 1);

  if (!mprError && mprData?.length > 0) {
    // Map match_power_rankings_new to point_by_point format
    // Momentum value indicates who won the game:
    // - POSITIVE = Home won the game
    // - NEGATIVE = Away won the game
    const mappedData = mprData.map((pr) => {
      const setNum = pr.set_number || 1;
      const gameNum = pr.game_number || 1;

      // Calculate server based on tennis rules
      // AWAY serves first in set 1 (this match's data shows away served first)
      const awayServesFirstInSet = setNum % 2 === 1;
      const isOddGame = gameNum % 2 === 1;
      const serverNum = awayServesFirstInSet
        ? isOddGame
          ? 2
          : 1 // Set 1,3,5: odd=AWAY, even=HOME
        : isOddGame
        ? 1
        : 2; // Set 2,4: odd=HOME, even=AWAY

      // Game winner from momentum value
      const value = pr.value_svg || pr.value || 0;
      const gameWinnerNum = value >= 0 ? 1 : 2;

      // BREAK = server loses the game
      const isBreak = serverNum !== gameWinnerNum;

      return {
        id: pr.id,
        match_id: pr.match_id,
        set_number: setNum,
        game_number: gameNum,
        point_number: 1,
        value: pr.value,
        value_svg: pr.value_svg,
        break_occurred: isBreak,
        zone: pr.zone,
        source: pr.source || 'match_power_rankings',
        serving: serverNum,
        scoring: gameWinnerNum,
        created_at: pr.created_at,
      };
    });

    return {
      data: mappedData,
      total: mprCount,
      offset,
      limit,
      hasMore: offset + limit < mprCount,
      source: 'match_power_rankings',
    };
  }

  return { data: [], total: 0, offset, limit, hasMore: false };
}

// ============================================================================
// CALCULATION QUEUE HELPERS
// ============================================================================

/**
 * Enqueue a calculation task
 */
async function enqueueCalculation(taskType, payload, uniqueKey, priority = 5) {
  if (!checkSupabase()) return null;

  // Try SQL function
  const { data, error } = await supabase.rpc('enqueue_calculation', {
    p_task_type: taskType,
    p_payload: payload,
    p_unique_key: uniqueKey,
    p_priority: priority,
  });

  if (error && error.code === '42883') {
    // Fallback to direct insert
    const { data: inserted, error: insertError } = await supabase
      .from('calculation_queue')
      .upsert(
        {
          task_type: taskType,
          payload_json: payload,
          unique_key: uniqueKey,
          priority,
          status: 'PENDING',
        },
        { onConflict: 'task_type,unique_key', ignoreDuplicates: true }
      )
      .select('id')
      .single();

    return inserted?.id;
  }

  return data;
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase.from('calculation_queue').select('status');

  if (error) return null;

  const stats = { pending: 0, running: 0, done: 0, error: 0 };
  for (const row of data || []) {
    const status = row.status?.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(stats, status)) {
      stats[status]++;
    }
  }

  return stats;
}

module.exports = {
  // Write
  upsertPlayer,
  upsertTournament,
  insertMatch,
  saveMatch: insertMatch, // alias FILOSOFIA_DB
  insertPowerRankingsSvg, // NEW: Insert momentum from SVG DOM

  // Read
  getMatches,
  getMatchById,
  getMatchBundle: getMatchCardSnapshot, // alias FILOSOFIA_DB
  getPointByPoint,
  getStatistics,
  searchPlayers,
  getTournaments,
  getTournamentsWithStats,
  getExtractionLogs,
  countMatches,
  getDistinctTournaments,

  // Detected matches (read-only)
  getDetectedMatchesByTournament,
  getDetectedMatchesStats,
  getMissingMatches,

  // NEW: Match Card Snapshot
  getMatchCardSnapshot,
  buildMatchCardSnapshot,
  buildMatchCardSnapshotManual,

  // NEW: Player Rankings
  getRankingAtDate,
  upsertPlayerRanking,

  // NEW: Lazy Data (deep data endpoints)
  getMatchMomentum,
  getMatchStatisticsNew,
  getMatchOdds,
  getMatchPointByPoint,

  // NEW: Calculation Queue
  enqueueCalculation,
  getQueueStats,

  // ID Resolution (sofascore_id -> internal id)
  resolveMatchId,

  // 🚀 OPTIMIZED: Lightweight home page endpoints
  getMatchesSummary,
  getMatchesByMonth,
};

