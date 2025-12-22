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

    // Determina winner/loser names based on winnerCode
    const winnerCode = matchData.winnerCode;
    let winnerName = null;
    let loserName = null;
    
    const homeName = homePlayer?.name || homePlayer?.fullName || homePlayer?.shortName || null;
    const awayName = awayPlayer?.name || awayPlayer?.fullName || awayPlayer?.shortName || null;
    
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
      // IMPORTANT: Always populate winner_name/loser_name for statistics queries
      winner_name: winnerName,
      loser_name: loserName,
      home_sets_won: calculateSetsWon(matchData.homeScore, matchData.awayScore, 'home'),
      away_sets_won: calculateSetsWon(matchData.homeScore, matchData.awayScore, 'away'),
      first_to_serve: matchData.firstToServe || null,
      sofascore_url: sourceUrl,
      extracted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_live: matchData.status?.type === 'inprogress',
      data_source: 'sofascore',
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
  const { 
    limit = 50, 
    offset = 0, 
    status, 
    tournamentId,
    tournamentCategory,  // Nuovo: categoria torneo (ATP, WTA, Challenger, ITF Men, ITF Women)
    playerId,
    playerSearch,  // Nuovo: ricerca per nome giocatore
    dateFrom,      // Nuovo: data inizio (ISO string)
    dateTo,        // Nuovo: data fine (ISO string)
    dataSource,    // Nuovo: filtro per fonte dati (xlsx_import, sofascore, merged_sofascore_xlsx)
    orderBy = 'start_time' 
  } = options;

  // Se c'è ricerca per giocatore, prima trova gli ID dei player che matchano
  let playerIds = [];
  if (playerSearch) {
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .ilike('name', `%${playerSearch}%`);
    
    playerIds = (players || []).map(p => p.id);
    
    // Se nessun giocatore trovato, ritorna vuoto
    if (playerIds.length === 0) {
      return [];
    }
  }
  
  // Se c'è filtro per categoria torneo, trova gli ID dei tornei che matchano
  let categoryTournamentIds = [];
  if (tournamentCategory) {
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('id')
      .eq('category', tournamentCategory);
    
    categoryTournamentIds = (tournaments || []).map(t => t.id);
    
    // Se nessun torneo trovato, ritorna vuoto
    if (categoryTournamentIds.length === 0) {
      return [];
    }
  }

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
  
  // Filtro per categoria torneo
  if (categoryTournamentIds.length > 0) {
    query = query.in('tournament_id', categoryTournamentIds);
  }
  
  // Filtro per data
  if (dateFrom) query = query.gte('start_time', dateFrom);
  if (dateTo) query = query.lte('start_time', dateTo);
  
  // Filtro per fonte dati
  if (dataSource) {
    if (dataSource === 'sofascore') {
      // Match Sofascore hanno data_source null o 'sofascore'
      query = query.or('data_source.is.null,data_source.eq.sofascore');
    } else {
      query = query.eq('data_source', dataSource);
    }
  }
  
  // Filtro per player IDs trovati dalla ricerca nome
  if (playerIds.length > 0) {
    // Costruisci filtro OR per home_player_id o away_player_id
    const playerFilters = playerIds.map(id => `home_player_id.eq.${id},away_player_id.eq.${id}`).join(',');
    query = query.or(playerFilters);
  }

  const result = await query;
  data = result.data;
  error = result.error;

  // Se la query con join fallisce (foreign key diversa), prova query semplice
  if (error) {
    console.log('⚠️ Join query failed, trying simple query:', error.message);
    
    let simpleQuery = supabase
      .from('matches')
      .select('*')
      .order(orderBy, { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status) simpleQuery = simpleQuery.eq('status_type', status);
    if (tournamentId) simpleQuery = simpleQuery.eq('tournament_id', tournamentId);
    if (dateFrom) simpleQuery = simpleQuery.gte('start_time', dateFrom);
    if (dateTo) simpleQuery = simpleQuery.lte('start_time', dateTo);
    // Filtro per fonte dati
    if (dataSource) {
      if (dataSource === 'sofascore') {
        simpleQuery = simpleQuery.or('data_source.is.null,data_source.eq.sofascore');
      } else {
        simpleQuery = simpleQuery.eq('data_source', dataSource);
      }
    }
    // Per playerSearch usa gli stessi playerIds già trovati
    if (playerIds.length > 0) {
      const playerFilters = playerIds.map(id => `home_player_id.eq.${id},away_player_id.eq.${id}`).join(',');
      simpleQuery = simpleQuery.or(playerFilters);
    }
    
    const simpleResult = await simpleQuery;
    
    if (simpleResult.error) {
      handleSupabaseError(simpleResult.error, 'fetching matches');
      return [];
    }
    
    // Mappa dati nel formato atteso dal frontend
    // Usa winner_name/loser_name come fallback per match xlsx senza player_id
    data = (simpleResult.data || []).map(m => ({
      ...m,
      home_name: m.home_name || m.winner_name || 'Unknown',
      away_name: m.away_name || m.loser_name || 'Unknown',
      home_ranking: m.home_ranking || m.winner_rank,
      away_ranking: m.away_ranking || m.loser_rank,
      tournament_name: m.tournament_name || m.location || 'Unknown Tournament',
      tournament_category: m.tournament_category || m.series || '',
      tournament_ground: m.tournament_ground || m.surface || ''
    }));
  } else {
    // Mappa i dati dal join al formato flat atteso
    // Usa winner_name/loser_name come fallback per match xlsx senza player_id
    data = (data || []).map(m => ({
      ...m,
      home_name: m.home_player?.name || m.home_player?.full_name || m.winner_name || 'Unknown',
      away_name: m.away_player?.name || m.away_player?.full_name || m.loser_name || 'Unknown',
      home_country: m.home_player?.country_alpha2 || '',
      away_country: m.away_player?.country_alpha2 || '',
      home_ranking: m.home_player?.current_ranking || m.winner_rank,
      away_ranking: m.away_player?.current_ranking || m.loser_rank,
      tournament_name: m.tournament?.name || m.location || 'Unknown Tournament',
      tournament_category: m.tournament?.category || m.series || '',
      tournament_ground: m.tournament?.ground_type || m.surface || ''
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
 * 🚀 OTTIMIZZATO: Recupera tornei dalla tabella tournaments con statistiche match
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
    const { data: allMatches, error: matchError } = await supabase
      .from('matches')
      .select(`
        id,
        tournament_id, 
        status_type, 
        start_time,
        home_player:players!matches_home_player_id_fkey(name),
        away_player:players!matches_away_player_id_fkey(name)
      `)
      .order('start_time', { ascending: false });
    
    if (matchError) {
      console.log('getTournamentsWithStats matches error:', matchError.message);
      // Ritorna tornei senza statistiche match
      return tournaments.map(t => ({
        id: t.id,
        name: t.name || 'Unknown',
        category: t.category || '',
        surface: t.ground_type || '',
        country: t.country || '',
        matchCount: 0,
        byStatus: { finished: 0, inprogress: 0, notstarted: 0 },
        earliestDate: null,
        latestDate: null,
        matches: []
      }));
    }
    
    // 3. Raggruppa match per torneo con preview
    const matchesByTournament = {};
    for (const m of (allMatches || [])) {
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
          previewMatches: [] // Primi 10 match per preview
        };
      }
      
      const stats = matchesByTournament[tid];
      stats.total++;
      
      const status = (m.status_type || 'other').toLowerCase();
      if (status === 'finished') stats.finished++;
      else if (status === 'inprogress') stats.inprogress++;
      else if (status === 'notstarted') stats.notstarted++;
      
      if (m.start_time) {
        const ts = Math.floor(new Date(m.start_time).getTime() / 1000);
        if (!stats.earliestDate || ts < stats.earliestDate) stats.earliestDate = ts;
        if (!stats.latestDate || ts > stats.latestDate) stats.latestDate = ts;
      }
      
      // Aggiungi ai match preview (max 10 per torneo)
      if (stats.previewMatches.length < 10) {
        stats.previewMatches.push({
          eventId: m.id,
          status: status,
          completeness: 50,
          homeTeam: m.home_player?.name || '',
          awayTeam: m.away_player?.name || '',
          startTimestamp: m.start_time ? Math.floor(new Date(m.start_time).getTime() / 1000) : null
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
      
      for (const d of (detected || [])) {
        if (!d.tournament_id) continue;
        if (!detectedByTournament[d.tournament_id]) {
          detectedByTournament[d.tournament_id] = { 
            total: 0, 
            acquired: 0,
            missingMatches: []
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
              isAcquired: false
            });
          }
        }
      }
    } catch (e) {
      console.log('detected_matches load error:', e.message);
      // detected_matches potrebbe non esistere
    }
    
    // 5. Costruisci risultato finale
    const result = tournaments.map(t => {
      const mStats = matchesByTournament[t.id] || { total: 0, finished: 0, inprogress: 0, notstarted: 0, previewMatches: [] };
      const dStats = detectedByTournament[t.id] || null;
      
      // Calcola coverage
      const totalDetected = dStats?.total || 0;
      const coveragePercentage = totalDetected > 0 
        ? Math.round((mStats.total / totalDetected) * 100)
        : 100; // Se non abbiamo detected, consideriamo 100%
      
      return {
        id: t.id,
        uniqueTournamentId: t.unique_tournament_id || null,
        name: t.name || 'Unknown',
        category: t.category || '',
        surface: t.ground_type || '',
        country: t.country || '',
        sport: 'tennis',
        matchCount: mStats.total,
        avgCompleteness: 50, // Default, può essere calcolato se serve
        byStatus: {
          finished: mStats.finished,
          inprogress: mStats.inprogress,
          notstarted: mStats.notstarted
        },
        matches: mStats.previewMatches || [], // Primi 10 match per preview
        latestDate: mStats.latestDate,
        earliestDate: mStats.earliestDate,
        coverage: {
          totalDetected: totalDetected,
          acquired: mStats.total,
          missing: Math.max(0, totalDetected - mStats.total),
          percentage: coveragePercentage
        },
        missingMatches: dStats?.missingMatches || [] // Partite rilevate ma non acquisite
      };
    });
    
    // 6. Ordina per data più recente, poi per numero match
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
    .select('id, tournament_id, tournament_name, is_acquired, home_team_name, away_team_name, status, status_type, start_time');
  
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
        missingMatches: []
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
        isAcquired: false
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
 * 🚀 OTTIMIZZATO: Ritorna solo i conteggi raggruppati per anno/mese
 * Usato dalla HomePage per rendering iniziale SENZA caricare tutti i match
 * Filosofia: "1 query only" - leggero e veloce
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
    
    // Query ottimizzata: prendi solo start_time con limit ragionevole
    // Se ci sono troppi match, usa paginazione
    const { data, error } = await supabase
      .from('matches')
      .select('start_time')
      .not('start_time', 'is', null)
      .order('start_time', { ascending: false })
      .limit(10000); // Limite ragionevole per evitare timeout
    
    if (error) {
      console.log('getMatchesSummary error:', error.message);
      return { total: total || 0, byYearMonth: [] };
    }
    
    // Raggruppa lato JS (più flessibile di SQL per formattazione)
    const groups = {};
    for (const match of (data || [])) {
      if (!match.start_time) continue;
      const date = new Date(match.start_time);
      if (isNaN(date.getTime())) continue; // Skip invalid dates
      const yearKey = String(date.getFullYear());
      const monthKey = `${yearKey}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups[yearKey]) groups[yearKey] = { year: yearKey, months: {} };
      if (!groups[yearKey].months[monthKey]) groups[yearKey].months[monthKey] = 0;
      groups[yearKey].months[monthKey]++;
    }
    
    // Converti in array ordinato (anni e mesi più recenti prima)
    const byYearMonth = Object.values(groups)
      .sort((a, b) => b.year.localeCompare(a.year))
      .map(yearGroup => ({
        year: yearGroup.year,
        months: Object.entries(yearGroup.months)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([monthKey, count]) => ({ monthKey, count }))
      }));
    
    return { 
      total: total || data?.length || 0, 
      byYearMonth 
    };
  } catch (err) {
    console.error('getMatchesSummary exception:', err.message);
    return { total: 0, byYearMonth: [] };
  }
}

/**
 * 🚀 OTTIMIZZATO: Ritorna match di un mese specifico (lazy load)
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
  const { status, tournamentId, tournamentCategory, playerSearch, dateFrom, dateTo, dataSource } = options;
  
  // Se c'è ricerca per giocatore, prima trova gli ID dei player che matchano
  let playerIds = [];
  if (playerSearch) {
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .ilike('name', `%${playerSearch}%`);
    
    playerIds = (players || []).map(p => p.id);
    
    // Se nessun giocatore trovato, ritorna 0
    if (playerIds.length === 0) {
      return 0;
    }
  }
  
  // Se c'è filtro per categoria torneo, trova gli ID dei tornei che matchano
  let categoryTournamentIds = [];
  if (tournamentCategory) {
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('id')
      .eq('category', tournamentCategory);
    
    categoryTournamentIds = (tournaments || []).map(t => t.id);
    
    // Se nessun torneo trovato, ritorna 0
    if (categoryTournamentIds.length === 0) {
      return 0;
    }
  }
  
  let query = supabase
    .from('matches')
    .select('id', { count: 'exact', head: true });
  
  if (status) query = query.eq('status_type', status);
  if (tournamentId) query = query.eq('tournament_id', tournamentId);
  if (categoryTournamentIds.length > 0) query = query.in('tournament_id', categoryTournamentIds);
  if (dateFrom) query = query.gte('start_time', dateFrom);
  if (dateTo) query = query.lte('start_time', dateTo);
  
  // Filtro per fonte dati
  if (dataSource) {
    if (dataSource === 'sofascore') {
      query = query.or('data_source.is.null,data_source.eq.sofascore');
    } else {
      query = query.eq('data_source', dataSource);
    }
  }
  
  // Filtro per player IDs trovati dalla ricerca nome
  if (playerIds.length > 0) {
    const playerFilters = playerIds.map(id => `home_player_id.eq.${id},away_player_id.eq.${id}`).join(',');
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
    // Conta match per ogni torneo
    const { data: matchCounts } = await supabase
      .from('matches')
      .select('tournament_id');
    
    const countMap = {};
    for (const m of matchCounts || []) {
      countMap[m.tournament_id] = (countMap[m.tournament_id] || 0) + 1;
    }
    
    return tournamentsData
      .map(t => ({
        id: t.id,
        name: t.name || 'Unknown',
        category: t.category || '',
        matchCount: countMap[t.id] || 0
      }))
      .filter(t => t.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);
  }
  
  // Fallback: raggruppa da matches
  const { data, error } = await supabase
    .from('matches')
    .select('tournament_id');
  
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
    .map(id => ({
      id: parseInt(id),
      name: nameMap[id]?.name || `Tournament ${id}`,
      category: nameMap[id]?.category || '',
      matchCount: countMap[id]
    }))
    .sort((a, b) => b.matchCount - a.matchCount);
}

// ============================================================================
// MERGE XLSX + SOFASCORE DATA
// ============================================================================

/**
 * Normalizza il nome di un giocatore per il matching
 * "Vukic A." -> "vukic a"
 * "Aleksandar Vukic" -> "vukic a" (prende iniziale nome)
 */
function normalizePlayerName(name) {
  if (!name) return '';
  
  // Rimuovi caratteri speciali e converti in minuscolo
  let normalized = name.toLowerCase()
    .replace(/[''`]/g, '')  // Rimuovi apostrofi
    .replace(/\./g, '')     // Rimuovi punti
    .replace(/\s+/g, ' ')   // Normalizza spazi
    .trim();
  
  // Dividi in parti
  const parts = normalized.split(' ');
  
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    const firstPart = parts[0];
    
    // CASO xlsx: "Nishikori K" -> cognome è la prima parte lunga
    // La prima parte è lunga e l'ultima è corta (iniziale)
    if (firstPart.length > 2 && lastPart.length <= 2) {
      // È già nel formato xlsx "Cognome N", ritorna così
      return normalized;
    }
    
    // CASO Sofascore: "Kei Nishikori" -> nome cognome
    // La prima parte è corta o media, l'ultima è lunga (cognome)
    if (lastPart.length > 2) {
      // Converti "Nome Cognome" -> "cognome n"
      const firstName = parts.slice(0, -1).join(' ');
      const lastName = parts[parts.length - 1];
      return `${lastName} ${firstName.charAt(0)}`;
    }
  }
  
  return normalized;
}

/**
 * Cerca un match xlsx che corrisponde a un match Sofascore
 * Criteri di matching:
 * 1. Stessa data (±2 giorni per timezone)
 * 2. Stesso giocatore (nome normalizzato con matching fuzzy)
 */
async function findMatchingXlsxMatch(sofascoreMatch) {
  if (!checkSupabase()) return null;
  
  const homeName = sofascoreMatch.home?.name || sofascoreMatch.homeTeam?.name;
  const awayName = sofascoreMatch.away?.name || sofascoreMatch.awayTeam?.name;
  const matchDate = sofascoreMatch.startTimestamp 
    ? new Date(sofascoreMatch.startTimestamp * 1000) 
    : null;
  
  if (!matchDate || (!homeName && !awayName)) return null;
  
  // Cerca match xlsx nella stessa data (±2 giorni per maggiore tolleranza)
  const startDate = new Date(matchDate);
  startDate.setDate(startDate.getDate() - 2);
  const endDate = new Date(matchDate);
  endDate.setDate(endDate.getDate() + 2);
  
  // Cerca sia xlsx_import che xlsx_2025 (diversi formati di import)
  const { data: xlsxMatches, error } = await supabase
    .from('matches')
    .select('*')
    .in('data_source', ['xlsx_import', 'xlsx_2025'])
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString());
  
  if (error || !xlsxMatches) return null;
  
  // Normalizza i nomi per il confronto
  const homeNormalized = normalizePlayerName(homeName);
  const awayNormalized = normalizePlayerName(awayName);
  
  // Estrai cognome per matching più robusto
  const getLastName = (name) => {
    if (!name) return '';
    const parts = name.toLowerCase().trim().split(/\s+/);
    // Se il formato è "Cognome I." ritorna il cognome
    if (parts.length >= 1 && parts[parts.length - 1].match(/^[a-z]\.?$/)) {
      return parts[0];
    }
    // Altrimenti ritorna l'ultima parte (cognome)
    return parts[parts.length - 1];
  };
  
  const homeLastName = getLastName(homeName);
  const awayLastName = getLastName(awayName);
  
  // Cerca match con giocatori corrispondenti
  for (const xlsx of xlsxMatches) {
    const xlsxWinner = normalizePlayerName(xlsx.winner_name);
    const xlsxLoser = normalizePlayerName(xlsx.loser_name);
    const xlsxWinnerLast = getLastName(xlsx.winner_name);
    const xlsxLoserLast = getLastName(xlsx.loser_name);
    
    // Check 1: Match esatto normalizzato
    const homeMatchesWinner = homeNormalized.includes(xlsxWinner) || xlsxWinner.includes(homeNormalized);
    const homeMatchesLoser = homeNormalized.includes(xlsxLoser) || xlsxLoser.includes(homeNormalized);
    const awayMatchesWinner = awayNormalized.includes(xlsxWinner) || xlsxWinner.includes(awayNormalized);
    const awayMatchesLoser = awayNormalized.includes(xlsxLoser) || xlsxLoser.includes(awayNormalized);
    
    if ((homeMatchesWinner && awayMatchesLoser) || (homeMatchesLoser && awayMatchesWinner)) {
      console.log(`🔗 Match trovato! Sofascore "${homeName} vs ${awayName}" = xlsx "${xlsx.winner_name} vs ${xlsx.loser_name}"`);
      return xlsx;
    }
    
    // Check 2: Match per cognome (più tollerante)
    const homeLastMatchesWinner = homeLastName === xlsxWinnerLast;
    const homeLastMatchesLoser = homeLastName === xlsxLoserLast;
    const awayLastMatchesWinner = awayLastName === xlsxWinnerLast;
    const awayLastMatchesLoser = awayLastName === xlsxLoserLast;
    
    if ((homeLastMatchesWinner && awayLastMatchesLoser) || (homeLastMatchesLoser && awayLastMatchesWinner)) {
      console.log(`🔗 Match trovato (by cognome)! Sofascore "${homeName} vs ${awayName}" = xlsx "${xlsx.winner_name} vs ${xlsx.loser_name}"`);
      return xlsx;
    }
  }
  
  return null;
}

/**
 * Unisce i dati xlsx con un match Sofascore esistente
 * I dati xlsx aggiungono: ranking, punti, quote, punteggi set dettagliati
 */
async function mergeXlsxData(sofascoreMatchId, xlsxMatch) {
  if (!checkSupabase()) return null;
  
  // First, get the current match to check if winner_name/loser_name need to be filled
  const { data: currentMatch } = await supabase
    .from('matches')
    .select('winner_name, loser_name')
    .eq('id', sofascoreMatchId)
    .single();
  
  const updateData = {};
  
  // IMPORTANT: Copy winner_name/loser_name if empty (for statistics queries)
  if ((!currentMatch?.winner_name || currentMatch.winner_name === '') && xlsxMatch.winner_name) {
    updateData.winner_name = xlsxMatch.winner_name;
  }
  if ((!currentMatch?.loser_name || currentMatch.loser_name === '') && xlsxMatch.loser_name) {
    updateData.loser_name = xlsxMatch.loser_name;
  }
  
  // Aggiungi solo i campi che xlsx ha e sofascore non ha (o sono più completi)
  if (xlsxMatch.location) updateData.location = xlsxMatch.location;
  if (xlsxMatch.series) updateData.series = xlsxMatch.series;
  if (xlsxMatch.court_type) updateData.court_type = xlsxMatch.court_type;
  if (xlsxMatch.surface) updateData.surface = xlsxMatch.surface;
  if (xlsxMatch.best_of) updateData.best_of = xlsxMatch.best_of;
  
  // Ranking e punti (xlsx ha dati storici precisi)
  if (xlsxMatch.winner_rank) updateData.winner_rank = xlsxMatch.winner_rank;
  if (xlsxMatch.loser_rank) updateData.loser_rank = xlsxMatch.loser_rank;
  if (xlsxMatch.winner_points) updateData.winner_points = xlsxMatch.winner_points;
  if (xlsxMatch.loser_points) updateData.loser_points = xlsxMatch.loser_points;
  
  // Punteggi set dettagliati
  if (xlsxMatch.w1 !== null) updateData.w1 = xlsxMatch.w1;
  if (xlsxMatch.l1 !== null) updateData.l1 = xlsxMatch.l1;
  if (xlsxMatch.w2 !== null) updateData.w2 = xlsxMatch.w2;
  if (xlsxMatch.l2 !== null) updateData.l2 = xlsxMatch.l2;
  if (xlsxMatch.w3 !== null) updateData.w3 = xlsxMatch.w3;
  if (xlsxMatch.l3 !== null) updateData.l3 = xlsxMatch.l3;
  if (xlsxMatch.w4 !== null) updateData.w4 = xlsxMatch.w4;
  if (xlsxMatch.l4 !== null) updateData.l4 = xlsxMatch.l4;
  if (xlsxMatch.w5 !== null) updateData.w5 = xlsxMatch.w5;
  if (xlsxMatch.l5 !== null) updateData.l5 = xlsxMatch.l5;
  if (xlsxMatch.winner_sets !== null) updateData.winner_sets = xlsxMatch.winner_sets;
  if (xlsxMatch.loser_sets !== null) updateData.loser_sets = xlsxMatch.loser_sets;
  
  // Quote (xlsx ha quote di chiusura)
  if (xlsxMatch.odds_b365_winner) updateData.odds_b365_winner = xlsxMatch.odds_b365_winner;
  if (xlsxMatch.odds_b365_loser) updateData.odds_b365_loser = xlsxMatch.odds_b365_loser;
  if (xlsxMatch.odds_ps_winner) updateData.odds_ps_winner = xlsxMatch.odds_ps_winner;
  if (xlsxMatch.odds_ps_loser) updateData.odds_ps_loser = xlsxMatch.odds_ps_loser;
  if (xlsxMatch.odds_max_winner) updateData.odds_max_winner = xlsxMatch.odds_max_winner;
  if (xlsxMatch.odds_max_loser) updateData.odds_max_loser = xlsxMatch.odds_max_loser;
  if (xlsxMatch.odds_avg_winner) updateData.odds_avg_winner = xlsxMatch.odds_avg_winner;
  if (xlsxMatch.odds_avg_loser) updateData.odds_avg_loser = xlsxMatch.odds_avg_loser;
  if (xlsxMatch.odds_bfe_winner) updateData.odds_bfe_winner = xlsxMatch.odds_bfe_winner;
  if (xlsxMatch.odds_bfe_loser) updateData.odds_bfe_loser = xlsxMatch.odds_bfe_loser;
  
  // Comment
  if (xlsxMatch.comment) updateData.comment = xlsxMatch.comment;
  
  // Segna che i dati sono stati merged
  updateData.data_source = 'merged_sofascore_xlsx';
  updateData.updated_at = new Date().toISOString();
  
  if (Object.keys(updateData).length <= 2) {
    console.log(`ℹ️ Nessun dato nuovo da xlsx per match ${sofascoreMatchId}`);
    return null;
  }
  
  const { data, error } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', sofascoreMatchId)
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Errore merge match ${sofascoreMatchId}:`, error.message);
    return null;
  }
  
  console.log(`✅ Match ${sofascoreMatchId} arricchito con dati xlsx (${Object.keys(updateData).length - 2} campi)`);
  return data;
}

/**
 * Inserisce un match Sofascore e automaticamente cerca/merge con dati xlsx
 */
async function insertMatchWithXlsxMerge(matchData, sourceUrl = null) {
  // Prima inserisci il match normalmente
  const insertedMatch = await insertMatch(matchData, sourceUrl);
  
  if (!insertedMatch) return null;
  
  // Cerca match xlsx corrispondente
  const xlsxMatch = await findMatchingXlsxMatch(matchData);
  
  if (xlsxMatch) {
    // Merge i dati
    const mergedMatch = await mergeXlsxData(insertedMatch.id, xlsxMatch);
    
    // Elimina il record xlsx duplicato
    await supabase.from('matches').delete().eq('id', xlsxMatch.id);
    console.log(`🗑️ Eliminato xlsx duplicato ID ${xlsxMatch.id}`);
    
    return mergedMatch || insertedMatch;
  }
  
  return insertedMatch;
}

/**
 * Esegue il merge batch di tutti i match sofascore con xlsx
 * Cerca match Sofascore (con home_player_id non null) che non sono già merged
 */
async function batchMergeXlsxData() {
  if (!checkSupabase()) return { merged: 0, errors: 0 };
  
  console.log('\n🔄 Inizio batch merge Sofascore + xlsx...\n');
  
  // Prendi tutti i match sofascore che:
  // 1. Hanno home_player_id (sono da Sofascore, non xlsx)
  // 2. Non sono già merged
  const { data: sofascoreMatches, error } = await supabase
    .from('matches')
    .select('*')
    .not('home_player_id', 'is', null)
    .or('data_source.is.null,data_source.eq.sofascore')
    .order('start_time', { ascending: false });
  
  if (error || !sofascoreMatches) {
    console.error('Errore caricamento match sofascore:', error?.message);
    return { merged: 0, errors: 1 };
  }
  
  console.log(`📊 Trovati ${sofascoreMatches.length} match Sofascore da verificare\n`);
  
  let merged = 0;
  let notFound = 0;
  let deleted = 0;

  for (const match of sofascoreMatches) {
    // Estrai i nomi dai dati raw_json (formato Sofascore)
    let homeName = null;
    let awayName = null;
    
    if (match.raw_json) {
      // Prova diversi path nel raw_json
      homeName = match.raw_json.home?.name || 
                 match.raw_json.homeTeam?.name || 
                 match.raw_json.mapping?.home?.name;
      awayName = match.raw_json.away?.name || 
                 match.raw_json.awayTeam?.name || 
                 match.raw_json.mapping?.away?.name;
    }
    
    // Se non trovati nel raw_json, usa winner_name/loser_name
    if (!homeName) homeName = match.winner_name;
    if (!awayName) awayName = match.loser_name;
    
    // Costruisci oggetto per la ricerca
    const matchData = {
      home: { name: homeName },
      away: { name: awayName },
      startTimestamp: match.start_time ? new Date(match.start_time).getTime() / 1000 : null
    };
    
    const xlsxMatch = await findMatchingXlsxMatch(matchData);
    
    if (xlsxMatch) {
      await mergeXlsxData(match.id, xlsxMatch);
      merged++;
      
      // Elimina il record xlsx duplicato
      const { error: deleteError } = await supabase
        .from('matches')
        .delete()
        .eq('id', xlsxMatch.id);
      
      if (!deleteError) {
        deleted++;
        console.log(`🗑️ Eliminato xlsx duplicato ID ${xlsxMatch.id}`);
      }
    } else {
      notFound++;
    }
  }
  
  console.log(`\n📊 BATCH MERGE COMPLETATO:`);
  console.log(`   ✅ Merged: ${merged}`);
  console.log(`   🗑️ xlsx eliminati: ${deleted}`);
  console.log(`   ⚪ Non trovati in xlsx: ${notFound}`);
  
  return { merged, notFound, deleted };
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
      console.log(`📸 No snapshot for match ${matchId}, building...`);
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
    p_match_id: matchId
  });

  if (rpcError) {
    if (rpcError.code === '42883') {
      // Function doesn't exist, build manually
      return await buildMatchCardSnapshotManual(matchId);
    }
    console.error('Error building snapshot via RPC:', rpcError.message);
    return null;
  }

  console.log(`✅ Snapshot built for match ${matchId}`);
  return true;
}

/**
 * Manual snapshot builder (fallback)
 */
async function buildMatchCardSnapshotManual(matchId) {
  // Fetch all data in parallel
  const [matchResult, statsResult, momentumResult, oddsResult, sourcesResult] = await Promise.all([
    supabase.from('v_matches_with_players').select('*').eq('id', matchId).single(),
    supabase.from('match_statistics_new').select('*').eq('match_id', matchId),
    supabase.from('match_power_rankings_new').select('*').eq('match_id', matchId).order('set_number').order('game_number'),
    supabase.from('match_odds').select('*').eq('match_id', matchId),
    supabase.from('match_data_sources').select('*').eq('match_id', matchId)
  ]);

  const matchData = matchResult.data;
  if (!matchData) return null;

  // Get players
  const [p1Result, p2Result] = await Promise.all([
    supabase.from('players_new').select('*').eq('id', matchData.player1_id).single(),
    supabase.from('players_new').select('*').eq('id', matchData.player2_id).single()
  ]);

  // Get H2H
  const [minP, maxP] = matchData.player1_id < matchData.player2_id 
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
    .from('match_point_by_point_new')
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
        category: matchData.tournament_category
      }
    },
    players_json: {
      player1: {
        id: p1Result.data?.id,
        name: p1Result.data?.name,
        country: p1Result.data?.country_code,
        currentRanking: p1Result.data?.current_ranking,
        rankingAtMatch: matchData.player1_rank,
        seed: matchData.player1_seed
      },
      player2: {
        id: p2Result.data?.id,
        name: p2Result.data?.name,
        country: p2Result.data?.country_code,
        currentRanking: p2Result.data?.current_ranking,
        rankingAtMatch: matchData.player2_rank,
        seed: matchData.player2_seed
      }
    },
    h2h_json: h2h || null,
    stats_json: statsResult.data ? statsResult.data.reduce((acc, s) => ({ ...acc, [s.period]: s }), {}) : null,
    momentum_json: momentumResult.data || [],
    odds_json: {
      opening: oddsResult.data?.find(o => o.is_opening) || oddsResult.data?.[0] || null,
      closing: oddsResult.data?.find(o => o.is_closing) || oddsResult.data?.[oddsResult.data.length - 1] || null,
      all: oddsResult.data || []
    },
    data_sources_json: sourcesResult.data || [],
    data_quality_int: quality,
    last_updated_at: new Date().toISOString()
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
async function upsertPlayerRanking(playerId, rankingDate, rank, points = null, rankingType = 'ATP') {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase
    .from('player_rankings')
    .upsert({
      player_id: playerId,
      ranking_date: rankingDate,
      rank_int: rank,
      points_int: points,
      ranking_type: rankingType
    }, { onConflict: 'player_id,ranking_date,ranking_type' })
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
 */
async function getMatchMomentum(matchId) {
  if (!checkSupabase()) return [];

  const { data, error } = await supabase
    .from('match_power_rankings_new')
    .select('*')
    .eq('match_id', matchId)
    .order('set_number')
    .order('game_number');

  if (error) {
    console.error('Error fetching momentum:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Get match statistics
 */
async function getMatchStatisticsNew(matchId) {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase
    .from('match_statistics_new')
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
    opening: data.find(o => o.is_opening) || data[0],
    closing: data.find(o => o.is_closing) || data[data.length - 1],
    all: data
  };
}

/**
 * Get point-by-point data (paginated for large matches)
 */
async function getMatchPointByPoint(matchId, options = {}) {
  if (!checkSupabase()) return { data: [], total: 0 };

  const { offset = 0, limit = 500 } = options;

  // Get total count
  const { count } = await supabase
    .from('match_point_by_point_new')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', matchId);

  // Get data
  const { data, error } = await supabase
    .from('match_point_by_point_new')
    .select('*')
    .eq('match_id', matchId)
    .order('set_number')
    .order('game_number')
    .order('point_number')
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching point-by-point:', error.message);
    return { data: [], total: 0 };
  }

  return {
    data: data || [],
    total: count || 0,
    offset,
    limit,
    hasMore: (offset + limit) < count
  };
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
    p_priority: priority
  });

  if (error && error.code === '42883') {
    // Fallback to direct insert
    const { data: inserted, error: insertError } = await supabase
      .from('calculation_queue')
      .upsert({
        task_type: taskType,
        payload_json: payload,
        unique_key: uniqueKey,
        priority,
        status: 'PENDING'
      }, { onConflict: 'task_type,unique_key', ignoreDuplicates: true })
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

  const { data, error } = await supabase
    .from('calculation_queue')
    .select('status');

  if (error) return null;

  const stats = { pending: 0, running: 0, done: 0, error: 0 };
  for (const row of data || []) {
    const status = row.status?.toLowerCase();
    if (stats.hasOwnProperty(status)) {
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
  insertMatchWithXlsxMerge,
  
  // Merge
  findMatchingXlsxMatch,
  mergeXlsxData,
  batchMergeXlsxData,
  
  // Read
  getMatches,
  getMatchById,
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

  // 🚀 OPTIMIZED: Lightweight home page endpoints
  getMatchesSummary,
  getMatchesByMonth
};
