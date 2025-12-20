/**
 * Match Repository - Operazioni CRUD per i match tennis
 * Gestisce l'inserimento e la lettura dei dati dal database Supabase
 */

const { supabase, handleSupabaseError } = require('./supabase');

// Helper per verificare se Supabase è disponibile
function checkSupabase() {
  if (!supabase) {
    console.warn('⚠️ Supabase not available, skipping database operation');
    return false;
  }
  return true;
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
  
  const playerData = {
    id: player.id,
    name: player.name || player.fullName || player.shortName || 'Unknown',
    full_name: player.fullName || player.name || null,
    short_name: player.shortName || null,
    slug: player.slug || null,
    country_alpha2: player.country?.alpha2 || player.countryAlpha2 || null,
    country_name: player.country?.name || player.countryName || null,
    current_ranking: player.ranking || player.currentRanking || null
  };

  const { data, error } = await supabase
    .from('players')
    .upsert(playerData, { onConflict: 'id' })
    .select()
    .single();

  if (error && error.code !== '23505') { // Ignora duplicati
    console.error('Error upserting player:', error.message);
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
    id: tournament.id,
    name: tournament.name || 'Unknown Tournament',
    slug: tournament.slug || null,
    category: tournament.category?.name || tournament.category || null,
    ground_type: tournament.groundType || null,
    country: tournament.country?.name || tournament.country || null
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
    console.warn('⚠️ Database not available, match not saved to DB');
    return null;
  }
  const startTime = Date.now();
  const logEntry = {
    source_url: sourceUrl || 'unknown',
    extraction_type: 'scrape',
    status: 'pending',
    started_at: new Date().toISOString()
  };

  try {
    // 1. Estrai e salva giocatori
    const homePlayer = matchData.home || matchData.homeTeam;
    const awayPlayer = matchData.away || matchData.awayTeam;
    
    if (homePlayer?.id) await upsertPlayer(homePlayer);
    if (awayPlayer?.id) await upsertPlayer(awayPlayer);

    // 2. Estrai e salva torneo
    const tournament = matchData.tournament || matchData.uniqueTournament;
    if (tournament?.id) await upsertTournament(tournament);

    // 3. Prepara dati match
    const eventId = matchData.id || matchData.eventId;
    if (!eventId) {
      throw new Error('Missing event ID');
    }

    const match = {
      id: eventId,
      slug: matchData.slug || null,
      home_player_id: homePlayer?.id || null,
      away_player_id: awayPlayer?.id || null,
      home_seed: homePlayer?.seed || null,
      away_seed: awayPlayer?.seed || null,
      tournament_id: tournament?.id || null,
      round_name: matchData.roundInfo?.name || matchData.round || null,
      start_time: matchData.startTimestamp 
        ? new Date(matchData.startTimestamp * 1000).toISOString() 
        : null,
      status_code: matchData.status?.code || null,
      status_type: matchData.status?.type || null,
      status_description: matchData.status?.description || null,
      winner_code: matchData.winnerCode || null,
      home_sets_won: calculateSetsWon(matchData.homeScore, matchData.awayScore, 'home'),
      away_sets_won: calculateSetsWon(matchData.homeScore, matchData.awayScore, 'away'),
      first_to_serve: matchData.firstToServe || null,
      sofascore_url: sourceUrl,
      extracted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_live: matchData.status?.type === 'inprogress',
      raw_json: matchData // Salva JSON completo come backup
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
    const prCount = await insertPowerRankings(eventId, matchData.tennisPowerRankings || matchData.powerRankings);

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

    console.log(`✅ Match ${eventId} saved to database (${logEntry.duration_ms}ms)`);
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
      set_winner: hGames > aGames ? 'home' : aGames > hGames ? 'away' : null
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
          home_point_type: p.homePointType || null,
          away_point_type: p.awayPointType || null,
          point_description: p.pointDescription || null,
          is_ace: p.pointDescription === 'ace',
          is_double_fault: p.pointDescription === 'double_fault'
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

  const rankings = powerRankings.map(pr => {
    const value = pr.value || 0;
    let zone = 'balanced_positive';
    let status = 'neutral';
    
    if (value > 60) { zone = 'strong_control'; status = 'positive'; }
    else if (value >= 20) { zone = 'advantage'; status = 'positive'; }
    else if (value > -20) { zone = 'balanced_positive'; status = 'neutral'; }
    else if (value > -40) { zone = 'slight_pressure'; status = 'warning'; }
    else { zone = 'strong_pressure'; status = 'critical'; }
    
    return {
      match_id: matchId,
      set_number: pr.set || 1,
      game_number: pr.game || 1,
      value: value,
      break_occurred: pr.breakOccurred || false,
      zone,
      status
    };
  });

  const { error } = await supabase.from('power_rankings').insert(rankings);
  if (error) console.error('Error inserting power rankings:', error.message);

  return rankings.length;
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
          statistics_type: item.statisticsType || null
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
 * Usa query diretta con join invece di view per compatibilità
 */
async function getMatches(options = {}) {
  if (!checkSupabase()) return [];
  const { limit = 50, offset = 0, status, tournamentId, playerId, orderBy = 'start_time' } = options;

  // Prima prova la view, se fallisce usa query diretta
  let data, error;
  
  // Query con join diretti per evitare dipendenza dalla view
  let query = supabase
    .from('matches')
    .select(`
      *,
      raw_json,
      home_player:players!matches_home_player_id_fkey(id, name, full_name, short_name, country_name, country_alpha2, current_ranking),
      away_player:players!matches_away_player_id_fkey(id, name, full_name, short_name, country_name, country_alpha2, current_ranking),
      tournament:tournaments!matches_tournament_id_fkey(id, name, category, ground_type, country)
    `)
    .order(orderBy, { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status_type', status);
  if (tournamentId) query = query.eq('tournament_id', tournamentId);
  if (playerId) query = query.or(`home_player_id.eq.${playerId},away_player_id.eq.${playerId}`);

  const result = await query;
  data = result.data;
  error = result.error;

  // Se la query con join fallisce (foreign key diversa), prova query semplice
  if (error) {
    console.log('⚠️ Join query failed, trying simple query:', error.message);
    
    const simpleQuery = supabase
      .from('matches')
      .select('*')
      .order(orderBy, { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status) simpleQuery.eq('status_type', status);
    if (tournamentId) simpleQuery.eq('tournament_id', tournamentId);
    
    const simpleResult = await simpleQuery;
    
    if (simpleResult.error) {
      handleSupabaseError(simpleResult.error, 'fetching matches');
      return [];
    }
    
    // Mappa dati nel formato atteso dal frontend
    data = (simpleResult.data || []).map(m => ({
      ...m,
      home_name: m.home_name || 'Unknown',
      away_name: m.away_name || 'Unknown',
      tournament_name: m.tournament_name || 'Unknown Tournament',
      tournament_category: m.tournament_category || ''
    }));
  } else {
    // Mappa i dati dal join al formato flat atteso
    data = (data || []).map(m => ({
      ...m,
      home_name: m.home_player?.name || m.home_player?.full_name || 'Unknown',
      away_name: m.away_player?.name || m.away_player?.full_name || 'Unknown',
      home_country: m.home_player?.country_alpha2 || '',
      away_country: m.away_player?.country_alpha2 || '',
      home_ranking: m.home_player?.current_ranking,
      away_ranking: m.away_player?.current_ranking,
      tournament_name: m.tournament?.name || 'Unknown Tournament',
      tournament_category: m.tournament?.category || '',
      tournament_ground: m.tournament?.ground_type || ''
    }));
  }
  
  return data || [];
}

/**
 * Recupera un match specifico con tutti i dati correlati
 */
async function getMatchById(matchId) {
  if (!checkSupabase()) return null;
  
  // Query diretta con join
  const { data: matchRaw, error: matchError } = await supabase
    .from('matches')
    .select(`
      *,
      home_player:players!matches_home_player_id_fkey(id, name, full_name, short_name, country_name, country_alpha2, current_ranking),
      away_player:players!matches_away_player_id_fkey(id, name, full_name, short_name, country_name, country_alpha2, current_ranking),
      tournament:tournaments!matches_tournament_id_fkey(id, name, category, ground_type, country)
    `)
    .eq('id', matchId)
    .single();

  // Se join fallisce, prova query semplice
  let match = matchRaw;
  if (matchError) {
    if (matchError.code === 'PGRST116') return null; // Not found
    
    console.log('⚠️ Join query failed for match, trying simple:', matchError.message);
    const { data: simpleMatch, error: simpleError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    
    if (simpleError) {
      if (simpleError.code === 'PGRST116') return null;
      handleSupabaseError(simpleError, 'fetching match');
      return null;
    }
    match = simpleMatch;
  }

  if (!match) return null;
  
  // Mappa al formato atteso
  const mappedMatch = {
    ...match,
    home_name: match.home_player?.name || match.home_player?.full_name || match.home_name || 'Unknown',
    away_name: match.away_player?.name || match.away_player?.full_name || match.away_name || 'Unknown',
    home_country: match.home_player?.country_alpha2 || '',
    away_country: match.away_player?.country_alpha2 || '',
    home_ranking: match.home_player?.current_ranking,
    away_ranking: match.away_player?.current_ranking,
    tournament_name: match.tournament?.name || match.tournament_name || 'Unknown Tournament',
    tournament_category: match.tournament?.category || match.tournament_category || '',
    tournament_ground: match.tournament?.ground_type || ''
  };

  // Punteggi set
  const { data: scores } = await supabase
    .from('match_scores')
    .select('*')
    .eq('match_id', matchId)
    .order('set_number');

  // Power rankings - mappa i campi DB al formato originale SofaScore
  const { data: powerRankingsRaw } = await supabase
    .from('power_rankings')
    .select('*')
    .eq('match_id', matchId)
    .order('set_number')
    .order('game_number');

  // Trasforma in formato compatibile con frontend
  const powerRankings = (powerRankingsRaw || []).map(pr => ({
    set: pr.set_number,
    game: pr.game_number,
    value: pr.value,
    breakOccurred: pr.break_occurred,
    zone: pr.zone,
    status: pr.status
  }));

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
        statisticsItems: [] 
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
      statisticsType: stat.statistics_type
    });
  }
  
  // Converti in array con groups come array
  const statistics = Object.values(statisticsByPeriod).map(p => ({
    period: p.period,
    groups: Object.values(p.groups)
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
    console.log('⚠️ v_momentum_summary not available:', e.message);
  }

  // Point-by-point
  const pointByPoint = await getPointByPoint(matchId);

  return {
    ...mappedMatch,
    scores,
    powerRankings,
    statistics,
    momentumSummary,
    pointByPoint
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
  return Object.values(bySet).map(set => ({
    ...set,
    games: Object.values(set.games)
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
      statisticsType: stat.statistics_type
    });
  }

  return {
    period,
    groups: Object.values(groups)
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
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('name');

  handleSupabaseError(error, 'fetching tournaments');
  return data;
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

module.exports = {
  // Write
  upsertPlayer,
  upsertTournament,
  insertMatch,
  
  // Read
  getMatches,
  getMatchById,
  getPointByPoint,
  getStatistics,
  searchPlayers,
  getTournaments,
  getExtractionLogs
};
