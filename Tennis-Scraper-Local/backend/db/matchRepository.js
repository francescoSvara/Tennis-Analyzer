import { supabase } from './supabase.js';

/**
 * Controlla se un match esiste già nel database
 */
export async function checkDuplicate(eventId) {
  if (!eventId) return null;
  
  const { data, error } = await supabase
    .from('matches')
    .select('id, home_player_id, away_player_id')
    .eq('id', parseInt(eventId))
    .limit(1);
  
  if (error) {
    console.error('Error checking duplicate:', error);
    return null;
  }
  
  if (data && data.length > 0) {
    const match = data[0];
    // Ottieni nomi giocatori
    const { data: homeName } = await supabase
      .from('players')
      .select('name')
      .eq('id', match.home_player_id)
      .single();
    const { data: awayName } = await supabase
      .from('players')
      .select('name')
      .eq('id', match.away_player_id)
      .single();
    
    return {
      id: match.id,
      home_player: homeName?.name || 'Unknown',
      away_player: awayName?.name || 'Unknown'
    };
  }
  
  return null;
}

/**
 * Inserisce o aggiorna un player nel database
 */
export async function upsertPlayer(player) {
  if (!player?.id) return null;
  
  const playerData = {
    id: player.id,
    name: player.name || player.shortName || 'Unknown',
    full_name: player.fullName || player.name || null,
    short_name: player.shortName || null,
    slug: player.slug || null,
    country_alpha2: player.country?.alpha2 || null,
    country_name: player.country?.name || null,
    current_ranking: player.ranking || null
  };
  
  const { data, error } = await supabase
    .from('players')
    .upsert(playerData, { onConflict: 'id' })
    .select()
    .single();
  
  if (error && error.code !== '23505') {
    console.error('Error upserting player:', error.message);
  }
  return data;
}

/**
 * Inserisce o aggiorna un torneo nel database
 */
export async function upsertTournament(tournament) {
  if (!tournament?.id) return null;
  
  const tournamentData = {
    id: tournament.id,
    name: tournament.name || 'Unknown Tournament',
    slug: tournament.slug || null,
    category: tournament.category?.name || null,
    ground_type: tournament.groundType || null,
    country: tournament.category?.country?.name || null
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

/**
 * Calcola i set vinti
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
 * Inserisce punteggi set
 */
async function insertMatchScores(matchId, homeScore, awayScore) {
  if (!homeScore || !awayScore) return 0;

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
    await supabase.from('match_scores').delete().eq('match_id', matchId);
    const { error } = await supabase.from('match_scores').insert(scores);
    if (error) console.error('Error inserting scores:', error.message);
  }
  
  return scores.length;
}

/**
 * Inserisce statistiche
 */
async function insertStatistics(matchId, statistics) {
  if (!statistics || !Array.isArray(statistics)) return 0;
  
  await supabase.from('match_statistics').delete().eq('match_id', matchId);
  
  let count = 0;
  for (const period of statistics) {
    if (!period.groups) continue;
    
    for (const group of period.groups) {
      for (const item of group.statisticsItems || []) {
        const stat = {
          match_id: matchId,
          period: period.period || 'ALL',
          group_name: group.groupName,
          stat_name: item.name,
          home_value: item.home,
          away_value: item.away,
          compare_code: item.compareCode
        };
        
        const { error } = await supabase.from('match_statistics').insert(stat);
        if (!error) count++;
      }
    }
  }
  
  return count;
}

/**
 * Inserisce un match nel database
 */
export async function insertMatch(scrapeData) {
  try {
    let eventData = null;
    let statisticsData = null;
    
    if (scrapeData.api) {
      for (const [url, data] of Object.entries(scrapeData.api)) {
        if (url.match(/\/event\/\d+$/) && data?.event) {
          eventData = data.event;
        }
        if (url.includes('/statistics') && data?.statistics) {
          statisticsData = data.statistics;
        }
      }
    }
    
    if (!eventData) {
      console.error('No event data found in scrape');
      return null;
    }
    
    const homePlayer = eventData.homeTeam;
    const awayPlayer = eventData.awayTeam;
    const tournament = eventData.tournament?.uniqueTournament;
    
    // Upsert players
    if (homePlayer?.id) await upsertPlayer(homePlayer);
    if (awayPlayer?.id) await upsertPlayer(awayPlayer);
    
    // Upsert tournament
    if (tournament?.id) await upsertTournament(tournament);
    
    // Prepara match
    const matchData = {
      id: eventData.id,
      slug: eventData.slug || null,
      home_player_id: homePlayer?.id || null,
      away_player_id: awayPlayer?.id || null,
      home_seed: homePlayer?.seed || null,
      away_seed: awayPlayer?.seed || null,
      tournament_id: tournament?.id || null,
      round_name: eventData.roundInfo?.name || null,
      start_time: eventData.startTimestamp 
        ? new Date(eventData.startTimestamp * 1000).toISOString() 
        : null,
      status_code: eventData.status?.code || null,
      status_type: eventData.status?.type || null,
      status_description: eventData.status?.description || null,
      winner_code: eventData.winnerCode || null,
      home_sets_won: calculateSetsWon(eventData.homeScore, eventData.awayScore, 'home'),
      away_sets_won: calculateSetsWon(eventData.homeScore, eventData.awayScore, 'away'),
      first_to_serve: eventData.firstToServe || null,
      extracted_at: new Date().toISOString(),
      is_live: eventData.status?.type === 'inprogress',
      raw_json: scrapeData
    };
    
    const { data: insertedMatch, error: matchError } = await supabase
      .from('matches')
      .upsert(matchData, { onConflict: 'id' })
      .select()
      .single();
    
    if (matchError) {
      console.error('Error inserting match:', matchError);
      return null;
    }
    
    // Inserisci scores e stats
    const scoresCount = await insertMatchScores(eventData.id, eventData.homeScore, eventData.awayScore);
    const statsCount = await insertStatistics(eventData.id, statisticsData);
    
    const homeName = homePlayer?.name || homePlayer?.shortName || 'Unknown';
    const awayName = awayPlayer?.name || awayPlayer?.shortName || 'Unknown';
    
    console.log(`✅ Match inserito: ${homeName} vs ${awayName}`);
    console.log(`   Event ID: ${eventData.id}, Scores: ${scoresCount}, Stats: ${statsCount}`);
    
    return insertedMatch;
  } catch (err) {
    console.error('Error in insertMatch:', err);
    return null;
  }
}

/**
 * Ottieni match dal database
 */
export async function getMatches(limit = 50) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      slug,
      home_player_id,
      away_player_id,
      tournament_id,
      round_name,
      start_time,
      status_description,
      status_type,
      winner_code,
      home_sets_won,
      away_sets_won,
      extracted_at,
      home_player:players!matches_home_player_id_fkey(id, name, country_alpha2),
      away_player:players!matches_away_player_id_fkey(id, name, country_alpha2),
      tournament:tournaments(id, name, category, ground_type)
    `)
    .order('extracted_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Statistiche
 */
export async function getStats() {
  try {
    const { count: totalMatches } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalPlayers } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { count: recentMatches } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .gte('extracted_at', yesterday.toISOString());
    
    return {
      totalMatches: totalMatches || 0,
      totalPlayers: totalPlayers || 0,
      matchesLast24h: recentMatches || 0
    };
  } catch (err) {
    console.error('Error getting stats:', err);
    return { totalMatches: 0, totalPlayers: 0, matchesLast24h: 0 };
  }
}

/**
 * Calcola la percentuale di completamento di un match
 * Campi tracciati: player info, tournament, scores
 * NOTA: has_statistics è opzionale perché non tutti i match hanno stats su SofaScore
 */
export async function getMatchCompleteness(matchId) {
  const fields = {
    // Campi base match (dalla tabella matches)
    home_player_id: false,
    away_player_id: false,
    tournament_id: false,
    round_name: false,
    start_time: false,
    status_description: false,
    winner_code: false,
    home_sets_won: false,
    away_sets_won: false,
    // Dati correlati - scores è obbligatorio, statistics opzionale
    has_scores: false
  };
  
  // Campo opzionale (non conta per il 100%)
  let hasStatistics = false;
  
  // Ottieni dati match
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();
  
  if (!match) return { percentage: 0, fields, hasStatistics: false };
  
  // Controlla campi base
  if (match.home_player_id) fields.home_player_id = true;
  if (match.away_player_id) fields.away_player_id = true;
  if (match.tournament_id) fields.tournament_id = true;
  if (match.round_name) fields.round_name = true;
  if (match.start_time) fields.start_time = true;
  if (match.status_description) fields.status_description = true;
  if (match.winner_code) fields.winner_code = true;
  if (match.home_sets_won !== null) fields.home_sets_won = true;
  if (match.away_sets_won !== null) fields.away_sets_won = true;
  
  // Controlla scores (obbligatorio)
  const { count: scoresCount } = await supabase
    .from('match_scores')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId);
  
  if (scoresCount > 0) fields.has_scores = true;
  
  // Controlla statistics (opzionale - bonus info)
  const { count: statsCount } = await supabase
    .from('match_statistics')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId);
  
  if (statsCount > 0) hasStatistics = true;
  
  // Calcola percentuale (10 campi obbligatori)
  const totalFields = Object.keys(fields).length;
  const completedFields = Object.values(fields).filter(v => v).length;
  const percentage = Math.round((completedFields / totalFields) * 100);
  
  return { percentage, fields, completedFields, totalFields, hasStatistics };
}

/**
 * Ottieni match con percentuale di completamento
 */
export async function getMatchesWithCompleteness(limit = 50) {
  const matches = await getMatches(limit);
  
  // Per ogni match, calcola la completezza
  const matchesWithCompleteness = await Promise.all(
    matches.map(async (match) => {
      const completeness = await getMatchCompleteness(match.id);
      return {
        ...match,
        completeness: completeness.percentage,
        completenessDetails: completeness.fields
      };
    })
  );
  
  return matchesWithCompleteness;
}

/**
 * Ottieni tornei recenti con partite (ultimi 7 giorni)
 */
export async function getRecentTournaments() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const { data, error } = await supabase
    .from('matches')
    .select(`
      tournament_id,
      tournament:tournaments(id, name, category, ground_type)
    `)
    .gte('extracted_at', weekAgo.toISOString())
    .not('tournament_id', 'is', null);
  
  if (error || !data) return [];
  
  // Raggruppa per torneo unico
  const tournamentsMap = new Map();
  for (const match of data) {
    if (match.tournament && !tournamentsMap.has(match.tournament_id)) {
      tournamentsMap.set(match.tournament_id, match.tournament);
    }
  }
  
  return Array.from(tournamentsMap.values());
}

/**
 * Ottieni tutti gli ID dei match esistenti per un torneo
 */
export async function getMatchIdsByTournament(tournamentId) {
  const { data, error } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId);
  
  if (error || !data) return new Set();
  return new Set(data.map(m => m.id));
}

// =====================================================
// DETECTED MATCHES - Sistema tracciamento partite rilevate
// =====================================================

/**
 * Crea la tabella detected_matches se non esiste
 * Questa tabella tiene traccia di TUTTE le partite rilevate da SofaScore
 */
export async function ensureDetectedMatchesTable() {
  // Verifica se la tabella esiste provando una query
  const { error } = await supabase
    .from('detected_matches')
    .select('id')
    .limit(1);
  
  if (error && error.code === '42P01') {
    // Tabella non esiste - la creiamo tramite SQL raw non è supportato da Supabase JS
    // L'utente dovrà crearla manualmente
    console.log('⚠️ Tabella detected_matches non esiste. Creala con la query SQL nel README.');
    return false;
  }
  
  return true;
}

/**
 * Upsert di partite rilevate da SofaScore
 * @param {Array} matches - Array di match da SofaScore API
 * @param {number} tournamentId - ID del torneo
 * @param {string} tournamentName - Nome del torneo
 */
export async function upsertDetectedMatches(matches, tournamentId, tournamentName) {
  if (!matches || matches.length === 0) return { inserted: 0, updated: 0 };
  
  let inserted = 0;
  let updated = 0;
  
  for (const match of matches) {
    const detectedData = {
      id: match.id,
      tournament_id: tournamentId,
      tournament_name: tournamentName,
      home_team_name: match.homeTeam?.name || match.homeTeam?.shortName || 'TBD',
      away_team_name: match.awayTeam?.name || match.awayTeam?.shortName || 'TBD',
      round_name: match.roundInfo?.name || null,
      status: match.status?.description || 'Unknown',
      status_type: match.status?.type || null,
      start_time: match.startTimestamp ? new Date(match.startTimestamp * 1000).toISOString() : null,
      home_score: match.homeScore?.current ?? null,
      away_score: match.awayScore?.current ?? null,
      detected_at: new Date().toISOString(),
      is_acquired: false // Verrà aggiornato quando il match viene acquisito
    };
    
    // Controlla se è già nel DB matches (quindi acquisito)
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id')
      .eq('id', match.id)
      .single();
    
    if (existingMatch) {
      detectedData.is_acquired = true;
      detectedData.acquired_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('detected_matches')
      .upsert(detectedData, { onConflict: 'id' });
    
    if (error) {
      if (error.code === '42P01') {
        console.error('Tabella detected_matches non esiste!');
        return { inserted: 0, updated: 0, error: 'table_not_exists' };
      }
      console.error('Error upserting detected match:', error.message);
    } else {
      if (existingMatch) updated++;
      else inserted++;
    }
  }
  
  return { inserted, updated };
}

/**
 * Marca un match come acquisito
 */
export async function markMatchAsAcquired(matchId) {
  const { error } = await supabase
    .from('detected_matches')
    .update({ 
      is_acquired: true, 
      acquired_at: new Date().toISOString() 
    })
    .eq('id', matchId);
  
  if (error && error.code !== '42P01') {
    console.error('Error marking match as acquired:', error.message);
  }
}

/**
 * Ottieni statistiche complete dal database
 */
export async function getAdvancedStats() {
  const stats = {
    // Stats da tabella matches
    totalInDb: 0,
    acquiredLast24h: 0,
    
    // Stats da tabella detected_matches
    totalDetected: 0,
    totalAcquired: 0,
    totalMissing: 0,
    
    // Stats calcolate
    acquisitionRate: 0,
    
    // Breakdown per torneo
    tournaments: []
  };
  
  try {
    // Conta totale matches nel DB
    const { count: matchesCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true });
    stats.totalInDb = matchesCount || 0;
    
    // Conta matches ultime 24h
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { count: recent } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .gte('extracted_at', yesterday.toISOString());
    stats.acquiredLast24h = recent || 0;
    
    // Conta detected matches (se la tabella esiste)
    const { count: detectedCount, error: detectedError } = await supabase
      .from('detected_matches')
      .select('*', { count: 'exact', head: true });
    
    if (!detectedError) {
      stats.totalDetected = detectedCount || 0;
      
      // Conta acquisiti
      const { count: acquiredCount } = await supabase
        .from('detected_matches')
        .select('*', { count: 'exact', head: true })
        .eq('is_acquired', true);
      stats.totalAcquired = acquiredCount || 0;
      
      // Conta mancanti
      const { count: missingCount } = await supabase
        .from('detected_matches')
        .select('*', { count: 'exact', head: true })
        .eq('is_acquired', false);
      stats.totalMissing = missingCount || 0;
      
      // Calcola percentuale
      if (stats.totalDetected > 0) {
        stats.acquisitionRate = Math.round((stats.totalAcquired / stats.totalDetected) * 100);
      }
      
      // Breakdown per torneo
      const { data: tournamentStats } = await supabase
        .from('detected_matches')
        .select('tournament_id, tournament_name, is_acquired');
      
      if (tournamentStats) {
        const tournamentMap = new Map();
        for (const m of tournamentStats) {
          if (!tournamentMap.has(m.tournament_id)) {
            tournamentMap.set(m.tournament_id, {
              id: m.tournament_id,
              name: m.tournament_name,
              total: 0,
              acquired: 0,
              missing: 0
            });
          }
          const t = tournamentMap.get(m.tournament_id);
          t.total++;
          if (m.is_acquired) t.acquired++;
          else t.missing++;
        }
        stats.tournaments = Array.from(tournamentMap.values());
      }
    }
  } catch (err) {
    console.error('Error getting advanced stats:', err);
  }
  
  return stats;
}

/**
 * Ottieni partite mancanti (detected ma non acquisite)
 */
export async function getMissingMatches() {
  const { data, error } = await supabase
    .from('detected_matches')
    .select('*')
    .eq('is_acquired', false)
    .order('start_time', { ascending: false });
  
  if (error) {
    if (error.code === '42P01') {
      return { matches: [], error: 'table_not_exists' };
    }
    console.error('Error getting missing matches:', error);
    return { matches: [], error: error.message };
  }
  
  return { matches: data || [] };
}

/**
 * Ottieni partite rilevate per un torneo specifico
 */
export async function getDetectedMatchesByTournament(tournamentId) {
  const { data, error } = await supabase
    .from('detected_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('start_time', { ascending: false });
  
  if (error) {
    console.error('Error getting detected matches:', error);
    return [];
  }
  
  return data || [];
}
/**
 * SYNC ACQUISITI - Sincronizza detected_matches con la tabella matches
 * Marca come acquired tutte le partite che esistono già nella tabella matches
 */
export async function syncAcquiredMatches() {
  try {
    // Ottieni tutti gli ID dalla tabella matches
    const { data: matchIds, error: matchError } = await supabase
      .from('matches')
      .select('id');
    
    if (matchError) {
      console.error('Error fetching match IDs:', matchError);
      return { synced: 0, error: matchError.message };
    }
    
    if (!matchIds || matchIds.length === 0) {
      return { synced: 0 };
    }
    
    const ids = matchIds.map(m => m.id);
    
    // Aggiorna detected_matches per tutti questi ID
    const { data, error } = await supabase
      .from('detected_matches')
      .update({
        is_acquired: true,
        acquired_at: new Date().toISOString()
      })
      .in('id', ids)
      .eq('is_acquired', false);
    
    if (error) {
      if (error.code === '42P01') {
        return { synced: 0, error: 'table_not_exists' };
      }
      console.error('Error syncing acquired matches:', error);
      return { synced: 0, error: error.message };
    }
    
    console.log(`✅ Sincronizzati ${ids.length} match come acquisiti`);
    return { synced: ids.length };
    
  } catch (err) {
    console.error('Error in syncAcquiredMatches:', err);
    return { synced: 0, error: err.message };
  }
}

/**
 * MASS SCAN - Scansiona tutti i tornei recenti e salva in detected_matches
 */
export async function massScanRecentTournaments(tournaments) {
  const results = {
    tournamentsScanned: 0,
    totalEventsDetected: 0,
    errors: []
  };
  
  for (const tournament of tournaments) {
    try {
      // Questa funzione sarà chiamata dal server.js che ha accesso a directFetch
      results.tournamentsScanned++;
    } catch (err) {
      results.errors.push({ tournamentId: tournament.id, error: err.message });
    }
  }
  
  return results;
}

/**
 * Ottieni tutti i tornei unici dalla tabella matches
 */
export async function getUniqueTournaments() {
  const { data, error } = await supabase
    .from('matches')
    .select('tournament_id, tournament:tournaments(id, name)')
    .not('tournament_id', 'is', null);
  
  if (error) {
    console.error('Error getting unique tournaments:', error);
    return [];
  }
  
  // Rimuovi duplicati
  const tournamentMap = new Map();
  for (const m of data || []) {
    if (m.tournament_id && !tournamentMap.has(m.tournament_id)) {
      tournamentMap.set(m.tournament_id, {
        id: m.tournament_id,
        name: m.tournament?.name || `Torneo ${m.tournament_id}`
      });
    }
  }
  
  return Array.from(tournamentMap.values());
}