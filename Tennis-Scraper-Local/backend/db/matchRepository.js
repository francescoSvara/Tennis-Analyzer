import { supabase } from './supabase.js';

/**
 * Controlla se un match esiste già nel database
 * NUOVO SCHEMA: usa player1_id/player2_id invece di home/away
 */
export async function checkDuplicate(eventId) {
  if (!eventId) return null;
  
  const { data, error } = await supabase
    .from('matches_new')
    .select('id, player1_id, player2_id')
    .eq('id', parseInt(eventId))
    .limit(1);
  
  if (error) {
    console.error('Error checking duplicate:', error);
    return null;
  }
  
  if (data && data.length > 0) {
    const match = data[0];
    // Ottieni nomi giocatori
    const { data: p1Name } = await supabase
      .from('players_new')
      .select('name')
      .eq('id', match.player1_id)
      .single();
    const { data: p2Name } = await supabase
      .from('players_new')
      .select('name')
      .eq('id', match.player2_id)
      .single();
    
    return {
      id: match.id,
      home_player: p1Name?.name || 'Unknown',
      away_player: p2Name?.name || 'Unknown',
      refresh_count: 0
    };
  }
  
  return null;
}

/**
 * Inserisce o aggiorna un player nel database
 * NUOVO SCHEMA: country_code invece di country_alpha2
 */
export async function upsertPlayer(player) {
  if (!player?.id) return null;
  
  const playerData = {
    sofascore_id: player.id,
    name: player.name || player.shortName || 'Unknown',
    full_name: player.fullName || player.name || null,
    slug: player.slug || null,
    country_code: player.country?.alpha2 || null,
    country_name: player.country?.name || null,
    current_ranking: player.ranking || null
  };
  
  // Prima cerca se esiste già per sofascore_id
  const { data: existing } = await supabase
    .from('players_new')
    .select('id')
    .eq('sofascore_id', player.id)
    .single();
  
  if (existing) {
    // Aggiorna
    const { data, error } = await supabase
      .from('players_new')
      .update(playerData)
      .eq('sofascore_id', player.id)
      .select()
      .single();
    
    if (error) console.error('Error updating player:', error.message);
    return data;
  } else {
    // Inserisce
    const { data, error } = await supabase
      .from('players_new')
      .insert(playerData)
      .select()
      .single();
    
    if (error && error.code !== '23505') {
      console.error('Error inserting player:', error.message);
    }
    return data;
  }
}

/**
 * Inserisce o aggiorna un torneo nel database
 * NUOVO SCHEMA: surface invece di ground_type
 */
export async function upsertTournament(tournament) {
  if (!tournament?.id) return null;
  
  const tournamentData = {
    sofascore_id: tournament.id,
    name: tournament.name || 'Unknown Tournament',
    slug: tournament.slug || null,
    category: tournament.category?.name || null,
    surface: tournament.groundType || null,
    country_name: tournament.category?.country?.name || null
  };
  
  // Prima cerca se esiste già per sofascore_id
  const { data: existing } = await supabase
    .from('tournaments_new')
    .select('id')
    .eq('sofascore_id', tournament.id)
    .single();
  
  if (existing) {
    // Aggiorna
    const { data, error } = await supabase
      .from('tournaments_new')
      .update(tournamentData)
      .eq('sofascore_id', tournament.id)
      .select()
      .single();
    
    if (error) console.error('Error updating tournament:', error.message);
    return data;
  } else {
    // Inserisce
    const { data, error } = await supabase
      .from('tournaments_new')
      .insert(tournamentData)
      .select()
      .single();
    
    if (error && error.code !== '23505') {
      console.error('Error inserting tournament:', error.message);
    }
    return data;
  }
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
 * Estrae i punteggi set dal formato SofaScore
 * NUOVO SCHEMA: i punteggi set sono colonne nella tabella matches_new
 */
function extractSetScores(homeScore, awayScore) {
  const setData = {};
  
  for (let i = 1; i <= 5; i++) {
    const hGames = homeScore?.[`period${i}`];
    const aGames = awayScore?.[`period${i}`];
    if (hGames === undefined || aGames === undefined) break;
    
    setData[`set${i}_p1`] = hGames;
    setData[`set${i}_p2`] = aGames;
    setData[`set${i}_tb`] = homeScore?.[`period${i}TieBreak`] || awayScore?.[`period${i}TieBreak`] || null;
  }
  
  return setData;
}

/**
 * Calcola data_quality (0-100) basato sui dati disponibili
 * 
 * LOGICA COMPLETEZZA:
 * - score base (6-4 7-5): +30 punti
 * - player1_id e player2_id: +10 punti ciascuno
 * - tournament_id: +10 punti
 * - winner_code: +10 punti
 * - statistics presenti: +20 punti
 * - power_rankings presenti: +10 punti
 * 
 * Se < 50: match è "pending" (in sospeso)
 * Se >= 50 e < 80: match è "partial" (parziale)
 * Se >= 80: match è "complete" (completo)
 */
function calculateDataQuality(matchData, hasStats, hasPowerRankings, hasPointByPoint = false) {
  let quality = 0;
  
  // Score base
  if (matchData.score && matchData.score.length > 0) quality += 25;
  
  // Players
  if (matchData.player1_id) quality += 10;
  if (matchData.player2_id) quality += 10;
  
  // Tournament
  if (matchData.tournament_id) quality += 10;
  
  // Winner
  if (matchData.winner_code) quality += 5;
  
  // Statistics
  if (hasStats) quality += 15;
  
  // Power Rankings / Momentum
  if (hasPowerRankings) quality += 10;
  
  // Point By Point (NUOVO - importante per break detection)
  if (hasPointByPoint) quality += 15;
  
  return Math.min(100, quality);
}

/**
 * Determina lo status di completezza del match
 */
function getCompletenessStatus(dataQuality) {
  if (dataQuality < 50) return 'pending';      // In attesa - dati insufficienti
  if (dataQuality < 80) return 'partial';      // Parziale - usabile ma incompleto
  return 'complete';                           // Completo - tutti i dati essenziali
}

/**
 * Inserisce statistiche per TUTTI i periodi (ALL, SET1, SET2, SET3, ecc.)
 * Usa le key dell'API SofaScore per mapping affidabile
 */
async function insertStatistics(matchId, statistics) {
  if (!statistics || !Array.isArray(statistics)) return 0;
  
  await supabase.from('match_statistics_new').delete().eq('match_id', matchId);
  
  // Funzione helper per estrarre stats da un periodo
  const extractStatsFromPeriod = (periodData) => {
    const statMap = {
      // Service stats
      p1_aces: null,
      p2_aces: null,
      p1_double_faults: null,
      p2_double_faults: null,
      p1_first_serve_pct: null,
      p2_first_serve_pct: null,
      p1_first_serve_won: null,
      p1_first_serve_total: null,
      p2_first_serve_won: null,
      p2_first_serve_total: null,
    p1_second_serve_won: null,
      p1_second_serve_total: null,
      p2_second_serve_won: null,
      p2_second_serve_total: null,
      p1_service_points_won: null,
      p1_service_points_total: null,
      p2_service_points_won: null,
      p2_service_points_total: null,
      // Break points
      p1_break_points_won: null,
      p1_break_points_total: null,
      p2_break_points_won: null,
      p2_break_points_total: null,
      // Points
      p1_total_points_won: null,
      p2_total_points_won: null,
      // Winners/Errors (se disponibili)
      p1_winners: null,
      p2_winners: null,
      p1_unforced_errors: null,
      p2_unforced_errors: null
    };
    
    if (!periodData?.groups) return statMap;
    
    // Itera su tutti i gruppi e items usando la key per mapping affidabile
    for (const group of periodData.groups) {
      for (const item of group.statisticsItems || []) {
        const key = item.key;
        
        switch (key) {
          case 'aces':
            statMap.p1_aces = item.homeValue ?? parseInt(item.home) ?? null;
            statMap.p2_aces = item.awayValue ?? parseInt(item.away) ?? null;
            break;
            
          case 'doubleFaults':
            statMap.p1_double_faults = item.homeValue ?? parseInt(item.home) ?? null;
            statMap.p2_double_faults = item.awayValue ?? parseInt(item.away) ?? null;
            break;
            
          case 'firstServeAccuracy':
            // Percentuale primo servizio
            if (item.homeTotal && item.awayTotal) {
              statMap.p1_first_serve_pct = Math.round((item.homeValue / item.homeTotal) * 100);
              statMap.p2_first_serve_pct = Math.round((item.awayValue / item.awayTotal) * 100);
            }
            break;
            
          case 'firstServePointsAccuracy':
            // Punti vinti al primo servizio
            statMap.p1_first_serve_won = item.homeValue ?? null;
            statMap.p1_first_serve_total = item.homeTotal ?? null;
            statMap.p2_first_serve_won = item.awayValue ?? null;
            statMap.p2_first_serve_total = item.awayTotal ?? null;
            break;
            
          case 'secondServePointsAccuracy':
            // Punti vinti al secondo servizio
            statMap.p1_second_serve_won = item.homeValue ?? null;
            statMap.p1_second_serve_total = item.homeTotal ?? null;
            statMap.p2_second_serve_won = item.awayValue ?? null;
            statMap.p2_second_serve_total = item.awayTotal ?? null;
            break;
            
          case 'breakPointsSaved':
            // Break points total = break points faced dall'avversario
            statMap.p1_break_points_total = item.awayTotal ?? null;
            statMap.p2_break_points_total = item.homeTotal ?? null;
            break;
            
          case 'breakPointsScored':
            // Break points convertiti (dal receiver)
            statMap.p1_break_points_won = item.homeValue ?? null;
            statMap.p2_break_points_won = item.awayValue ?? null;
            break;
            
          case 'pointsTotal':
            statMap.p1_total_points_won = item.homeValue ?? parseInt(item.home) ?? null;
            statMap.p2_total_points_won = item.awayValue ?? parseInt(item.away) ?? null;
            break;
            
          case 'servicePointsScored':
            statMap.p1_service_points_won = item.homeValue ?? null;
            statMap.p2_service_points_won = item.awayValue ?? null;
            break;
            
          case 'winners':
            statMap.p1_winners = item.homeValue ?? parseInt(item.home) ?? null;
            statMap.p2_winners = item.awayValue ?? parseInt(item.away) ?? null;
            break;
            
          case 'unforcedErrors':
            statMap.p1_unforced_errors = item.homeValue ?? parseInt(item.home) ?? null;
            statMap.p2_unforced_errors = item.awayValue ?? parseInt(item.away) ?? null;
            break;
        }
      }
    }
    
    return statMap;
  };
  
  // Normalizza il nome del periodo: "1ST" -> "SET1", "2ND" -> "SET2", ecc.
  const normalizePeriod = (period) => {
    const periodMap = {
      'ALL': 'ALL',
      '1ST': 'SET1',
      '2ND': 'SET2', 
      '3RD': 'SET3',
      '4TH': 'SET4',
      '5TH': 'SET5'
    };
    return periodMap[period] || period;
  };
  
  // Processa TUTTI i periodi disponibili
  const records = [];
  
  for (const periodData of statistics) {
    const normalizedPeriod = normalizePeriod(periodData.period);
    const statMap = extractStatsFromPeriod(periodData);
    
    records.push({
      match_id: matchId,
      period: normalizedPeriod,
      ...statMap
    });
  }
  
  if (records.length === 0) return 0;
  
  // Inserisci tutti i record
  const { error } = await supabase.from('match_statistics_new').insert(records);
  if (error) {
    console.error('Error inserting statistics:', error.message);
    return 0;
  }
  
  // Log dettagliato
  const allStats = records.find(r => r.period === 'ALL');
  console.log(`📊 Statistiche salvate per match ${matchId} (${records.length} periodi: ${records.map(r => r.period).join(', ')})`);
  if (allStats) {
    console.log(`   ALL: Aces ${allStats.p1_aces}-${allStats.p2_aces}, DF ${allStats.p1_double_faults}-${allStats.p2_double_faults}, Points ${allStats.p1_total_points_won}-${allStats.p2_total_points_won}`);
  }
  
  return records.length;
}

/**
 * Inserisce i power rankings (momentum del match)
 * NUOVO SCHEMA: usa zone e favored_player invece di status
 */
async function insertPowerRankings(matchId, powerRankings) {
  if (!Array.isArray(powerRankings) || powerRankings.length === 0) return 0;

  // Prima elimina vecchi rankings
  await supabase.from('match_power_rankings_new').delete().eq('match_id', matchId);

  const rankings = powerRankings.map(pr => {
    const value = pr.value || 0;
    let zone = 'balanced';
    let favored_player = null;
    
    if (value > 60) { zone = 'strong_control'; favored_player = 1; }
    else if (value >= 20) { zone = 'advantage'; favored_player = 1; }
    else if (value > -20) { zone = 'balanced'; favored_player = null; }
    else if (value > -60) { zone = 'advantage'; favored_player = 2; }
    else { zone = 'strong_control'; favored_player = 2; }
    
    return {
      match_id: matchId,
      set_number: pr.set || 1,
      game_number: pr.game || 1,
      value: value,
      break_occurred: pr.breakOccurred || false,
      zone,
      favored_player
    };
  });

  const { error } = await supabase.from('match_power_rankings_new').insert(rankings);
  if (error) console.error('Error inserting power rankings:', error.message);

  return rankings.length;
}

/**
 * Inserisce i dati point-by-point nel database
 * FILOSOFIA: Salva serving/scoring per calcolo BREAK dal backend
 * 
 * Struttura SofaScore:
 * pointByPoint: [{ set, games: [{ game, score: { serving, scoring }, points: [...] }] }]
 * 
 * @see docs/filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md
 */
export async function insertPointByPoint(matchId, pointByPoint) {
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
        
        // Determina chi ha vinto il punto basandosi sui pointType
        // pointType: 1 = won point, 3 = won game
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
          serving: game.score?.serving || null,   // 1 = home serve, 2 = away serve
          scoring: game.score?.scoring || null,   // 1 = home wins game, 2 = away wins game
          home_point_type: p.homePointType || null,
          away_point_type: p.awayPointType || null,
          point_description: p.pointDescription || null,
          is_ace: p.pointDescription === 'ace' || p.pointDescription === 1,
          is_double_fault: p.pointDescription === 'double_fault' || p.pointDescription === 2
        });
        
        prevHome = homePoint;
        prevAway = awayPoint;
      }
    }
  }

  if (points.length > 0) {
    // Inserisci in batch da 500 per evitare limiti API Supabase
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
 * Inserisce un match nel database
 * NUOVO SCHEMA: player1_id/player2_id, match_date, colonne set nel match stesso
 */
export async function insertMatch(scrapeData) {
  try {
    let eventData = null;
    let statisticsData = null;
    let powerRankingsData = null;
    let pointByPointData = null;
    
    if (scrapeData.api) {
      for (const [url, data] of Object.entries(scrapeData.api)) {
        if (url.match(/\/event\/\d+$/) && data?.event) {
          eventData = data.event;
        }
        if (url.includes('/statistics') && data?.statistics) {
          statisticsData = data.statistics;
        }
        if (url.includes('/tennis-power-rankings') && data?.tennisPowerRankings) {
          powerRankingsData = data.tennisPowerRankings;
        }
        if (url.includes('/point-by-point') && data?.pointByPoint) {
          pointByPointData = data.pointByPoint;
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
    
    // Upsert players e ottieni gli ID interni
    const player1 = homePlayer?.id ? await upsertPlayer(homePlayer) : null;
    const player2 = awayPlayer?.id ? await upsertPlayer(awayPlayer) : null;
    
    // Upsert tournament e ottieni l'ID interno
    const tournamentRecord = tournament?.id ? await upsertTournament(tournament) : null;
    
    // Estrai match_date dal timestamp
    const matchDate = eventData.startTimestamp 
      ? new Date(eventData.startTimestamp * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    // Estrai punteggi set
    const setScores = extractSetScores(eventData.homeScore, eventData.awayScore);
    
    // Calcola score string (es: "6-4 7-5")
    let scoreString = '';
    for (let i = 1; i <= 5; i++) {
      const p1 = setScores[`set${i}_p1`];
      const p2 = setScores[`set${i}_p2`];
      if (p1 !== undefined && p2 !== undefined) {
        if (scoreString) scoreString += ' ';
        scoreString += `${p1}-${p2}`;
      }
    }
    
    // Determina winner_id
    let winnerId = null;
    if (eventData.winnerCode === 1 && player1) winnerId = player1.id;
    else if (eventData.winnerCode === 2 && player2) winnerId = player2.id;
    
    // Mappa status SofaScore -> nuovo schema
    const statusMap = {
      'finished': 'finished',
      'inprogress': 'live',
      'notstarted': 'scheduled'
    };
    
    // Prepara match con nuovo schema
    const matchData = {
      player1_id: player1?.id || null,
      player2_id: player2?.id || null,
      winner_id: winnerId,
      tournament_id: tournamentRecord?.id || null,
      match_date: matchDate,
      start_timestamp: eventData.startTimestamp || null,
      round: eventData.roundInfo?.name || null,
      surface: tournament?.groundType || null,
      status: statusMap[eventData.status?.type] || 'finished',
      winner_code: eventData.winnerCode || null,
      score: scoreString || null,
      sets_player1: calculateSetsWon(eventData.homeScore, eventData.awayScore, 'home'),
      sets_player2: calculateSetsWon(eventData.homeScore, eventData.awayScore, 'away'),
      player1_rank: homePlayer?.ranking || null,
      player2_rank: awayPlayer?.ranking || null,
      player1_seed: homePlayer?.seed || null,
      player2_seed: awayPlayer?.seed || null,
      ...setScores
    };
    
    // Cerca se il match esiste già per sofascore event ID (salvato in una colonna custom o tramite altro metodo)
    // Per ora usiamo l'ID sofascore come chiave (ID bigint)
    // Il nuovo schema non usa direttamente l'event ID, quindi cerchiamo per giocatori e data
    const { data: existingMatch } = await supabase
      .from('matches_new')
      .select('id')
      .eq('player1_id', matchData.player1_id)
      .eq('player2_id', matchData.player2_id)
      .eq('match_date', matchData.match_date)
      .single();
    
    let insertedMatch;
    if (existingMatch) {
      // Aggiorna match esistente
      const { data, error: matchError } = await supabase
        .from('matches_new')
        .update(matchData)
        .eq('id', existingMatch.id)
        .select()
        .single();
      
      if (matchError) {
        console.error('Error updating match:', matchError);
        return null;
      }
      insertedMatch = data;
    } else {
      // Inserisce nuovo match
      const { data, error: matchError } = await supabase
        .from('matches_new')
        .insert(matchData)
        .select()
        .single();
      
      if (matchError) {
        console.error('Error inserting match:', matchError);
        return null;
      }
      insertedMatch = data;
    }
    
    // Inserisci stats, power rankings e point-by-point (i punteggi set sono già nel match)
    const statsCount = await insertStatistics(insertedMatch.id, statisticsData);
    const prCount = await insertPowerRankings(insertedMatch.id, powerRankingsData);
    const pbpCount = await insertPointByPoint(insertedMatch.id, pointByPointData);
    
    // Calcola data_quality basato sui dati disponibili (incluso PbP)
    const dataQuality = calculateDataQuality(matchData, statsCount > 0, prCount > 0, pbpCount > 0);
    const completenessStatus = getCompletenessStatus(dataQuality);
    
    // Aggiorna data_quality nel match
    await supabase
      .from('matches_new')
      .update({ data_quality: dataQuality })
      .eq('id', insertedMatch.id);
    
    const homeName = homePlayer?.name || homePlayer?.shortName || 'Unknown';
    const awayName = awayPlayer?.name || awayPlayer?.shortName || 'Unknown';
    
    // Log con status completezza
    const statusEmoji = completenessStatus === 'complete' ? '✅' : 
                        completenessStatus === 'partial' ? '🟡' : '🔴';
    
    console.log(`${statusEmoji} Match inserito: ${homeName} vs ${awayName}`);
    console.log(`   Match ID: ${insertedMatch.id}, Stats: ${statsCount}, PowerRankings: ${prCount}, PointByPoint: ${pbpCount}`);
    console.log(`   Data Quality: ${dataQuality}% [${completenessStatus.toUpperCase()}]`);
    
    // Se pending, avvisa
    if (completenessStatus === 'pending') {
      console.log(`   ⚠️ PENDING: Match in attesa di dati aggiuntivi (stats/momentum/pbp)`);
    }
    
    return insertedMatch;
  } catch (err) {
    console.error('Error in insertMatch:', err);
    return null;
  }
}

/**
 * Ottieni match dal database
 * NUOVO SCHEMA: player1_id/player2_id, match_date, sets_player1/sets_player2
 */
export async function getMatches(limit = 50) {
  const { data, error } = await supabase
    .from('matches_new')
    .select(`
      id,
      player1_id,
      player2_id,
      tournament_id,
      round,
      match_date,
      status,
      winner_code,
      score,
      sets_player1,
      sets_player2,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
  
  // Arricchisci con info giocatori e torneo
  const enriched = await Promise.all((data || []).map(async (match) => {
    const [p1Res, p2Res, tournRes] = await Promise.all([
      match.player1_id ? supabase.from('players_new').select('id, name, country_code').eq('id', match.player1_id).single() : { data: null },
      match.player2_id ? supabase.from('players_new').select('id, name, country_code').eq('id', match.player2_id).single() : { data: null },
      match.tournament_id ? supabase.from('tournaments_new').select('id, name, category, surface').eq('id', match.tournament_id).single() : { data: null }
    ]);
    
    return {
      ...match,
      home_player: p1Res.data,
      away_player: p2Res.data,
      tournament: tournRes.data
    };
  }));
  
  return enriched;
}

/**
 * Statistiche
 * NUOVO SCHEMA: usa match_date invece di extracted_at
 */
export async function getStats() {
  try {
    const { count: totalMatches } = await supabase
      .from('matches_new')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalPlayers } = await supabase
      .from('players_new')
      .select('*', { count: 'exact', head: true });
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { count: recentMatches } = await supabase
      .from('matches_new')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString());
    
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
 * NUOVO SCHEMA: include statistiche come parte della completezza
 */
export async function getMatchCompleteness(matchId) {
  const fields = {
    // Dati base match
    player1_id: false,
    player2_id: false,
    tournament_id: false,
    round: false,
    match_date: false,
    status: false,
    winner_code: false,
    sets_player1: false,
    sets_player2: false,
    has_set_scores: false,
    // Statistiche (ora obbligatorie per 100%)
    has_statistics: false,
    has_aces: false,
    has_double_faults: false,
    has_total_points: false
  };
  
  const missingFields = [];
  
  // Ottieni dati match
  const { data: match } = await supabase
    .from('matches_new')
    .select('*')
    .eq('id', matchId)
    .single();
  
  if (!match) return { percentage: 0, fields, missingFields: ['match not found'] };
  
  // Controlla campi base (NUOVO SCHEMA)
  if (match.player1_id) fields.player1_id = true; else missingFields.push('player1_id');
  if (match.player2_id) fields.player2_id = true; else missingFields.push('player2_id');
  if (match.tournament_id) fields.tournament_id = true; else missingFields.push('tournament_id');
  if (match.round) fields.round = true; else missingFields.push('round');
  if (match.match_date) fields.match_date = true; else missingFields.push('match_date');
  if (match.status) fields.status = true; else missingFields.push('status');
  if (match.winner_code) fields.winner_code = true; else missingFields.push('winner_code');
  if (match.sets_player1 !== null) fields.sets_player1 = true; else missingFields.push('sets_player1');
  if (match.sets_player2 !== null) fields.sets_player2 = true; else missingFields.push('sets_player2');
  
  // Controlla se ci sono punteggi set
  if (match.set1_p1 !== null && match.set1_p2 !== null) {
    fields.has_set_scores = true;
  } else {
    missingFields.push('set_scores');
  }
  
  // Controlla statistics
  const { data: stats } = await supabase
    .from('match_statistics_new')
    .select('*')
    .eq('match_id', matchId)
    .single();
  
  if (stats) {
    fields.has_statistics = true;
    
    if (stats.p1_aces !== null && stats.p2_aces !== null) {
      fields.has_aces = true;
    } else {
      missingFields.push('aces');
    }
    
    if (stats.p1_double_faults !== null && stats.p2_double_faults !== null) {
      fields.has_double_faults = true;
    } else {
      missingFields.push('double_faults');
    }
    
    if (stats.p1_total_points_won !== null && stats.p2_total_points_won !== null) {
      fields.has_total_points = true;
    } else {
      missingFields.push('total_points');
    }
  } else {
    missingFields.push('statistics (none)');
  }
  
  // Calcola percentuale
  const totalFields = Object.keys(fields).length;
  const completedFields = Object.values(fields).filter(v => v).length;
  const percentage = Math.round((completedFields / totalFields) * 100);
  
  return { 
    percentage, 
    fields, 
    completedFields, 
    totalFields, 
    missingFields,
    isComplete: percentage === 100
  };
}

/**
 * Ottieni partite problematiche (completezza < 100%)
 */
export async function getProblematicMatches(limit = 100) {
  const matches = await getMatches(limit);
  const problematic = [];
  
  for (const match of matches) {
    const completeness = await getMatchCompleteness(match.id);
    
    if (completeness.percentage < 100) {
      problematic.push({
        ...match,
        completeness: completeness.percentage,
        missingFields: completeness.missingFields,
        completenessDetails: completeness.fields
      });
    }
  }
  
  // Ordina per completezza (le peggiori prima)
  problematic.sort((a, b) => a.completeness - b.completeness);
  
  return problematic;
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
 * NUOVO SCHEMA: usa match_date invece di extracted_at
 */
export async function getRecentTournaments() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const { data, error } = await supabase
    .from('matches_new')
    .select(`tournament_id`)
    .gte('match_date', weekAgo.toISOString().split('T')[0])
    .not('tournament_id', 'is', null);
  
  if (error || !data) return [];
  
  // Raggruppa per torneo unico e carica info
  const tournamentIds = [...new Set(data.map(m => m.tournament_id).filter(Boolean))];
  
  if (tournamentIds.length === 0) return [];
  
  const { data: tournaments } = await supabase
    .from('tournaments_new')
    .select('id, name, category, surface')
    .in('id', tournamentIds);
  
  return tournaments || [];
}

/**
 * Ottieni tutti gli ID dei match esistenti per un torneo
 */
export async function getMatchIdsByTournament(tournamentId) {
  const { data, error } = await supabase
    .from('matches_new')
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
      .from('matches_new')
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
      .from('matches_new')
      .select('*', { count: 'exact', head: true });
    stats.totalInDb = matchesCount || 0;
    
    // Conta matches ultime 24h (usa created_at invece di extracted_at)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { count: recent } = await supabase
      .from('matches_new')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString());
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
      .from('matches_new')
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
    .from('matches_new')
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
    if (firstPart.length > 2 && lastPart.length <= 2) {
      return normalized;
    }
    
    // CASO Sofascore: "Kei Nishikori" -> nome cognome
    if (lastPart.length > 2) {
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
 * 1. Stessa data (±1 giorno per timezone)
 * 2. Stesso giocatore (nome normalizzato)
 */
export async function findMatchingXlsxMatch(sofascoreMatch) {
  const homeName = sofascoreMatch.home?.name || sofascoreMatch.homeTeam?.name;
  const awayName = sofascoreMatch.away?.name || sofascoreMatch.awayTeam?.name;
  const matchDate = sofascoreMatch.startTimestamp 
    ? new Date(sofascoreMatch.startTimestamp * 1000) 
    : null;
  
  if (!matchDate || (!homeName && !awayName)) return null;
  
  // Cerca match xlsx nella stessa data (±1 giorno)
  const startDate = new Date(matchDate);
  startDate.setDate(startDate.getDate() - 1);
  const endDate = new Date(matchDate);
  endDate.setDate(endDate.getDate() + 1);
  
  // Cerca sia xlsx_import che xlsx_2025 (diversi formati di import)
  const { data: xlsxMatches, error } = await supabase
    .from('matches_new')
    .select('*')
    .in('data_source', ['xlsx_import', 'xlsx_2025'])
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString());
  
  if (error || !xlsxMatches) return null;
  
  // Normalizza i nomi per il confronto
  const homeNormalized = normalizePlayerName(homeName);
  const awayNormalized = normalizePlayerName(awayName);
  
  // Cerca match con giocatori corrispondenti
  for (const xlsx of xlsxMatches) {
    const xlsxWinner = normalizePlayerName(xlsx.winner_name);
    const xlsxLoser = normalizePlayerName(xlsx.loser_name);
    
    // Check se i giocatori corrispondono (in qualsiasi ordine)
    const homeMatchesWinner = homeNormalized.includes(xlsxWinner) || xlsxWinner.includes(homeNormalized);
    const homeMatchesLoser = homeNormalized.includes(xlsxLoser) || xlsxLoser.includes(homeNormalized);
    const awayMatchesWinner = awayNormalized.includes(xlsxWinner) || xlsxWinner.includes(awayNormalized);
    const awayMatchesLoser = awayNormalized.includes(xlsxLoser) || xlsxLoser.includes(awayNormalized);
    
    if ((homeMatchesWinner && awayMatchesLoser) || (homeMatchesLoser && awayMatchesWinner)) {
      console.log(`🔗 Match trovato! Sofascore "${homeName} vs ${awayName}" = xlsx "${xlsx.winner_name} vs ${xlsx.loser_name}"`);
      return xlsx;
    }
  }
  
  return null;
}

/**
 * Unisce i dati xlsx con un match Sofascore esistente
 */
export async function mergeXlsxData(sofascoreMatchId, xlsxMatch) {
  const updateData = {};
  
  // Aggiungi solo i campi che xlsx ha
  if (xlsxMatch.location) updateData.location = xlsxMatch.location;
  if (xlsxMatch.series) updateData.series = xlsxMatch.series;
  if (xlsxMatch.court_type) updateData.court_type = xlsxMatch.court_type;
  if (xlsxMatch.surface) updateData.surface = xlsxMatch.surface;
  if (xlsxMatch.best_of) updateData.best_of = xlsxMatch.best_of;
  
  // Ranking e punti
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
  
  // Quote
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
  
  if (xlsxMatch.comment) updateData.comment = xlsxMatch.comment;
  
  // Segna merge
  updateData.data_source = 'merged_sofascore_xlsx';
  updateData.updated_at = new Date().toISOString();
  
  if (Object.keys(updateData).length <= 2) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('matches_new')
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
 * Elimina un match xlsx dopo che è stato merged
 */
export async function deleteXlsxMatch(xlsxMatchId) {
  const { error } = await supabase
    .from('matches_new')
    .delete()
    .eq('id', xlsxMatchId);
  
  if (error) {
    console.error(`❌ Errore eliminazione xlsx ${xlsxMatchId}:`, error.message);
    return false;
  }
  
  console.log(`🗑️ Record xlsx ${xlsxMatchId} eliminato (dati già merged)`);
  return true;
}

/**
 * Cerca un match esistente per ID SofaScore (univoco!)
 * Questo è il metodo corretto per evitare duplicati
 */
export async function findExistingSofascoreMatch(matchData) {
  const eventId = matchData.id;
  
  if (!eventId) return null;
  
  // Cerca match con lo stesso ID SofaScore
  const { data: existingMatch, error } = await supabase
    .from('matches_new')
    .select('*')
    .eq('id', eventId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error checking existing match:', error.message);
    return null;
  }
  
  if (existingMatch) {
    const homeName = matchData.home?.name || matchData.homeTeam?.name || 'Unknown';
    const awayName = matchData.away?.name || matchData.awayTeam?.name || 'Unknown';
    console.log(`⚠️ Match già esistente! "${homeName} vs ${awayName}" (ID ${eventId})`);
    return existingMatch;
  }
  
  return null;
}

/**
 * Inserisce un match e automaticamente cerca/merge con dati xlsx
 * Se trova un xlsx corrispondente:
 * 1. Merge i dati xlsx nel match Sofascore
 * 2. Elimina il record xlsx duplicato
 * 
 * IMPORTANTE: Prima controlla se il match esiste già (evita duplicati sofascore)
 */
export async function insertMatchWithXlsxMerge(scrapeData) {
  // Estrai i dati del match per i controlli
  let matchData = null;
  if (scrapeData?.api) {
    for (const [url, response] of Object.entries(scrapeData.api)) {
      if (response?.event) {
        matchData = response.event;
        break;
      }
    }
  }
  
  // NUOVO: Prima controlla se esiste già un match sofascore con stessi giocatori/data
  if (matchData) {
    const existingMatch = await findExistingSofascoreMatch(matchData);
    if (existingMatch) {
      console.log(`🔄 Match già esistente (ID: ${existingMatch.id}), skip inserimento duplicato`);
      return existingMatch; // Ritorna il match esistente invece di crearne uno nuovo
    }
  }
  
  // Inserisci il match (ora sappiamo che non esiste)
  const insertedMatch = await insertMatch(scrapeData);
  
  if (!insertedMatch) return null;
  
  if (matchData) {
    // Cerca match xlsx corrispondente
    const xlsxMatch = await findMatchingXlsxMatch(matchData);
    
    if (xlsxMatch) {
      // Merge i dati xlsx nel match Sofascore
      await mergeXlsxData(insertedMatch.id, xlsxMatch);
      
      // ELIMINA il record xlsx duplicato
      await deleteXlsxMatch(xlsxMatch.id);
    }
  }
  
  return insertedMatch;
}

/**
 * Aggiorna il refresh_count di un match tramite event_id (SofaScore ID)
 * NOTA: refresh_count non esiste nel nuovo schema - funzione no-op per compatibilità
 */
export async function updateRefreshCount(eventId, count) {
  console.log(`   → updateRefreshCount: no-op (colonna rimossa nel nuovo schema)`);
  return true;
}

/**
 * Marca un match come "force complete" dopo 3 tentativi di refresh
 * NOTA: force_completed e refresh_count non esistono nel nuovo schema - funzione no-op
 */
export async function markMatchAsForceComplete(eventId, refreshCount) {
  console.log(`   → markMatchAsForceComplete: no-op (colonne rimosse nel nuovo schema)`);
  return true;
}

/**
 * Inserisce power rankings estratti da SVG DOM
 * NUOVO SCHEMA: Salva direttamente nel campo 'value' (non c'è value_svg separato)
 * @param {number} matchId - ID del match
 * @param {Array} powerRankings - Array di rankings con set, game, value
 * @returns {number} Numero di righe inserite/aggiornate
 */
export async function insertPowerRankingsSvg(matchId, powerRankings) {
  if (!Array.isArray(powerRankings) || powerRankings.length === 0) {
    console.log(`⚠️ [SVG] Nessun power ranking da inserire per match ${matchId}`);
    return 0;
  }
  
  const matchIdInt = parseInt(matchId);
  console.log(`📊 [SVG] Inserimento ${powerRankings.length} power rankings per match ${matchIdInt}`);
  
  let updatedCount = 0;
  let insertedCount = 0;
  
  for (const pr of powerRankings) {
    const setNum = pr.set || 1;
    const gameNum = pr.game || 1;
    const value = pr.value_svg ?? pr.value ?? 0;
    
    // Determina zone e favored_player
    let zone = 'balanced';
    let favored_player = null;
    
    if (value > 60) { zone = 'strong_control'; favored_player = 1; }
    else if (value >= 20) { zone = 'advantage'; favored_player = 1; }
    else if (value > -20) { zone = 'balanced'; favored_player = null; }
    else if (value > -60) { zone = 'advantage'; favored_player = 2; }
    else { zone = 'strong_control'; favored_player = 2; }
    
    // Prima controlla se esiste già un record per questo game
    const { data: existing } = await supabase
      .from('match_power_rankings_new')
      .select('id')
      .eq('match_id', matchIdInt)
      .eq('set_number', setNum)
      .eq('game_number', gameNum)
      .single();
    
    if (existing) {
      // Record esiste: aggiorna value
      const { error } = await supabase
        .from('match_power_rankings_new')
        .update({ value, zone, favored_player })
        .eq('id', existing.id);
      
      if (!error) updatedCount++;
    } else {
      // Record non esiste: crea nuovo
      const { error } = await supabase
        .from('match_power_rankings_new')
        .insert({
          match_id: matchIdInt,
          set_number: setNum,
          game_number: gameNum,
          value: value,
          break_occurred: false,
          zone,
          favored_player
        });
      
      if (!error) insertedCount++;
    }
  }
  
  console.log(`✅ [SVG] Match ${matchIdInt}: ${updatedCount} aggiornati, ${insertedCount} nuovi`);
  return updatedCount + insertedCount;
}

/**
 * Inserisce power rankings nella tabella PRINCIPALE power_rankings
 * (usata dall'app React su porta 3001)
 * @param {number} sofascoreId - ID SofaScore del match
 * @param {Array} powerRankings - Array di rankings con set, game, value
 * @returns {number} Numero di righe inserite/aggiornate
 */
export async function insertPowerRankingsMainTable(sofascoreId, powerRankings) {
  if (!Array.isArray(powerRankings) || powerRankings.length === 0) {
    console.log(`⚠️ [SVG-MAIN] Nessun power ranking da inserire per sofascoreId ${sofascoreId}`);
    return 0;
  }
  
  const matchIdInt = parseInt(sofascoreId);
  console.log(`📊 [SVG-MAIN] Inserimento ${powerRankings.length} power rankings in tabella principale per sofascoreId ${matchIdInt}`);
  
  // Prima elimina eventuali record esistenti per evitare duplicati
  await supabase
    .from('power_rankings')
    .delete()
    .eq('match_id', matchIdInt);
  
  // Prepara i record da inserire
  const records = powerRankings.map(pr => {
    const setNum = pr.set || 1;
    const gameNum = pr.game || 1;
    const value = pr.value_svg ?? pr.value ?? 0;
    
    // Determina zone
    let zone = 'balanced';
    if (value > 60) zone = 'strong_control';
    else if (value >= 20) zone = 'advantage';
    else if (value > -20) zone = 'balanced';
    else if (value > -60) zone = 'advantage';
    else zone = 'strong_control';
    
    return {
      match_id: matchIdInt,
      set_number: setNum,
      game_number: gameNum,
      value: value,
      value_svg: value,  // Salva anche in value_svg per tracciare la fonte
      source: 'svg_manual',  // Indica che viene da inserimento manuale SVG
      break_occurred: false,
      zone: zone
    };
  });
  
  // Inserisci tutti i record
  const { data, error } = await supabase
    .from('power_rankings')
    .insert(records)
    .select();
  
  if (error) {
    console.error(`❌ [SVG-MAIN] Errore inserimento:`, error);
    throw error;
  }
  
  console.log(`✅ [SVG-MAIN] Inseriti ${data?.length || 0} record in power_rankings`);
  return data?.length || 0;
}

/**
 * Ottieni match pendenti (data_quality < 50)
 * Questi match hanno dati insufficienti e sono in attesa di completamento
 */
export async function getPendingMatches(limit = 50) {
  const { data, error } = await supabase
    .from('matches_new')
    .select(`
      id,
      player1_id,
      player2_id,
      tournament_id,
      match_date,
      score,
      data_quality,
      status,
      created_at
    `)
    .lt('data_quality', 50)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching pending matches:', error);
    return [];
  }
  
  // Arricchisci con nomi giocatori e torneo
  const enriched = await Promise.all((data || []).map(async (match) => {
    const [p1Res, p2Res, tournRes] = await Promise.all([
      match.player1_id ? supabase.from('players_new').select('name').eq('id', match.player1_id).single() : { data: null },
      match.player2_id ? supabase.from('players_new').select('name').eq('id', match.player2_id).single() : { data: null },
      match.tournament_id ? supabase.from('tournaments_new').select('name').eq('id', match.tournament_id).single() : { data: null }
    ]);
    
    return {
      ...match,
      player1_name: p1Res.data?.name || 'Unknown',
      player2_name: p2Res.data?.name || 'Unknown',
      tournament_name: tournRes.data?.name || 'Unknown',
      completeness_status: 'pending'
    };
  }));
  
  return enriched;
}

/**
 * Ottieni match parziali (data_quality >= 50 e < 80)
 * Questi match hanno dati usabili ma incompleti
 */
export async function getPartialMatches(limit = 50) {
  const { data, error } = await supabase
    .from('matches_new')
    .select(`
      id,
      player1_id,
      player2_id,
      tournament_id,
      match_date,
      score,
      data_quality,
      status,
      created_at
    `)
    .gte('data_quality', 50)
    .lt('data_quality', 80)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching partial matches:', error);
    return [];
  }
  
  // Arricchisci
  const enriched = await Promise.all((data || []).map(async (match) => {
    const [p1Res, p2Res, tournRes] = await Promise.all([
      match.player1_id ? supabase.from('players_new').select('name').eq('id', match.player1_id).single() : { data: null },
      match.player2_id ? supabase.from('players_new').select('name').eq('id', match.player2_id).single() : { data: null },
      match.tournament_id ? supabase.from('tournaments_new').select('name').eq('id', match.tournament_id).single() : { data: null }
    ]);
    
    return {
      ...match,
      player1_name: p1Res.data?.name || 'Unknown',
      player2_name: p2Res.data?.name || 'Unknown',
      tournament_name: tournRes.data?.name || 'Unknown',
      completeness_status: 'partial'
    };
  }));
  
  return enriched;
}

/**
 * Marca un match come completo manualmente (forza data_quality = 100)
 * Usato quando l'utente decide che i dati sono sufficienti
 */
export async function markMatchAsComplete(matchId) {
  const { error } = await supabase
    .from('matches_new')
    .update({ data_quality: 100 })
    .eq('id', matchId);
  
  if (error) {
    console.error('Error marking match as complete:', error);
    return false;
  }
  
  console.log(`✅ Match ${matchId} marcato come COMPLETO`);
  return true;
}

/**
 * Ottieni statistiche di completezza del database
 */
export async function getCompletenessStats() {
  const { count: total } = await supabase
    .from('matches_new')
    .select('*', { count: 'exact', head: true });
  
  const { count: pending } = await supabase
    .from('matches_new')
    .select('*', { count: 'exact', head: true })
    .lt('data_quality', 50);
  
  const { count: partial } = await supabase
    .from('matches_new')
    .select('*', { count: 'exact', head: true })
    .gte('data_quality', 50)
    .lt('data_quality', 80);
  
  const { count: complete } = await supabase
    .from('matches_new')
    .select('*', { count: 'exact', head: true })
    .gte('data_quality', 80);
  
  return {
    total: total || 0,
    pending: pending || 0,
    partial: partial || 0,
    complete: complete || 0,
    pendingPercentage: total ? Math.round((pending / total) * 100) : 0,
    partialPercentage: total ? Math.round((partial / total) * 100) : 0,
    completePercentage: total ? Math.round((complete / total) * 100) : 0
  };
}
