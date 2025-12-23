/**
 * Script per arricchire match XLSX con dati SofaScore
 * Uso: node scripts/enrich-xlsx-matches.js [--limit N] [--dry-run] [--force]
 * 
 * Questo script:
 * 1. Trova match importati da XLSX che non hanno sofascore_event_id
 * 2. Cerca il match su SofaScore usando nomi giocatori e data
 * 3. Se trova corrispondenza, scarica powerRankings, statistics, pointByPoint
 * 4. Aggiorna il record match_data_sources con i nuovi dati
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const limitArg = args.find(a => a.startsWith('--limit'));
const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1]) : 50;

const SOFASCORE_API = 'https://api.sofascore.com/api/v1';
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.sofascore.com/'
};

// Rate limiting
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Cerca su SofaScore usando l'API search/all
 */
async function searchSofaScore(query) {
  try {
    const url = `${SOFASCORE_API}/search/all?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    return data;
  } catch (e) {
    console.error(`   Errore search: ${e.message}`);
    return null;
  }
}

/**
 * Cerca match su SofaScore per giocatore
 */
async function searchPlayerMatches(playerName) {
  const searchData = await searchSofaScore(playerName);
  if (!searchData?.results) return [];
  
  // Estrai giocatori tennis
  const players = (searchData.results || [])
    .filter(r => r.type === 'player' && r.entity?.sport?.slug === 'tennis')
    .map(r => r.entity);
  
  return players;
}

/**
 * Ottieni match recenti di un giocatore
 */
async function getPlayerEvents(playerId, page = 0) {
  try {
    const url = `${SOFASCORE_API}/player/${playerId}/events/last/${page}`;
    const res = await fetch(url, { headers });
    
    if (!res.ok) return [];
    
    const data = await res.json();
    return data.events || [];
  } catch (e) {
    return [];
  }
}

/**
 * Verifica se due date sono vicine (±1 giorno)
 */
function datesMatch(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d1 - d2);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 1;
}

/**
 * Normalizza nome per confronto
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim();
}

/**
 * Estrai cognome
 */
function extractSurname(name) {
  const normalized = normalizeName(name);
  const parts = normalized.split(' ');
  return parts[parts.length - 1];
}

/**
 * Confronta nomi giocatori
 */
function playersMatch(xlsxName, sofascoreName) {
  const surname1 = extractSurname(xlsxName);
  const surname2 = extractSurname(sofascoreName);
  
  return surname1 === surname2 || 
         normalizeName(xlsxName).includes(surname2) ||
         normalizeName(sofascoreName).includes(surname1);
}

/**
 * Trova match SofaScore corrispondente
 */
async function findSofaScoreMatch(homeName, awayName, matchDate) {
  console.log(`   🔍 Cerco ${homeName} vs ${awayName} (${matchDate})`);
  
  // Cerca entrambi i giocatori
  const players = await searchPlayerMatches(extractSurname(homeName));
  await sleep(500);
  
  if (players.length === 0) {
    console.log(`   ⚠️  Nessun giocatore trovato per "${homeName}"`);
    return null;
  }
  
  // Per ogni giocatore trovato, cerca nei match recenti
  for (const player of players.slice(0, 3)) {
    console.log(`   📋 Checking ${player.name} (ID: ${player.id})...`);
    
    // Cerca in più pagine di match
    for (let page = 0; page < 5; page++) {
      const events = await getPlayerEvents(player.id, page);
      await sleep(300);
      
      if (events.length === 0) break;
      
      for (const event of events) {
        // Verifica data
        const eventDate = new Date(event.startTimestamp * 1000).toISOString().split('T')[0];
        if (!datesMatch(eventDate, matchDate)) continue;
        
        // Verifica entrambi i giocatori
        const home = event.homeTeam?.name || event.homeTeam?.shortName || '';
        const away = event.awayTeam?.name || event.awayTeam?.shortName || '';
        
        const homeMatch = playersMatch(homeName, home) || playersMatch(awayName, home);
        const awayMatch = playersMatch(homeName, away) || playersMatch(awayName, away);
        
        if (homeMatch && awayMatch) {
          console.log(`   ✅ MATCH TROVATO: Event ID ${event.id}`);
          console.log(`      ${home} vs ${away} (${eventDate})`);
          return event;
        }
      }
    }
  }
  
  console.log(`   ❌ Nessun match trovato`);
  return null;
}

/**
 * Calcola break_occurred per ogni game analizzando point-by-point
 * Un break avviene quando chi vince il game (scoring) è diverso da chi serve (serving)
 * 
 * @param {Array} pointByPoint - Dati point-by-point da SofaScore
 * @returns {Map} Mappa (set,game) -> boolean (true se break)
 */
function calculateBreaksFromPointByPoint(pointByPoint) {
  const breakMap = new Map();
  
  if (!pointByPoint || !Array.isArray(pointByPoint)) {
    return breakMap;
  }
  
  for (const setData of pointByPoint) {
    const setNumber = setData.set || 1;
    
    for (const gameData of (setData.games || [])) {
      const gameNumber = gameData.game || 1;
      const score = gameData.score;
      
      if (score && score.serving !== undefined && score.scoring !== undefined) {
        // scoring = chi ha vinto il game (1 = home, 2 = away)
        // serving = chi stava servendo (1 = home, 2 = away)
        // Break = quando scoring != serving
        const isBreak = score.serving !== score.scoring;
        const key = `${setNumber}-${gameNumber}`;
        breakMap.set(key, isBreak);
        
        if (isBreak) {
          console.log(`   🎾 Break rilevato: Set ${setNumber} Game ${gameNumber} (serving: ${score.serving}, scoring: ${score.scoring})`);
        }
      }
    }
  }
  
  return breakMap;
}

/**
 * Fetch dati completi da SofaScore
 */
async function fetchSofaScoreData(eventId) {
  const result = {
    powerRankings: [],
    statistics: [],
    pointByPoint: []
  };

  try {
    // Power Rankings
    await sleep(300);
    const prRes = await fetch(`${SOFASCORE_API}/event/${eventId}/tennis-power-rankings`, { headers });
    if (prRes.ok) {
      const data = await prRes.json();
      result.powerRankings = data?.tennisPowerRankings || [];
    }
  } catch (e) { /* ignore */ }

  try {
    // Statistics
    await sleep(300);
    const statsRes = await fetch(`${SOFASCORE_API}/event/${eventId}/statistics`, { headers });
    if (statsRes.ok) {
      const data = await statsRes.json();
      result.statistics = data?.statistics || [];
    }
  } catch (e) { /* ignore */ }

  try {
    // Point by Point
    await sleep(300);
    const pbpRes = await fetch(`${SOFASCORE_API}/event/${eventId}/point-by-point`, { headers });
    if (pbpRes.ok) {
      const data = await pbpRes.json();
      result.pointByPoint = data?.pointByPoint || [];
    }
  } catch (e) { /* ignore */ }

  return result;
}

/**
 * Salva dati nel nuovo schema
 */
async function saveEnrichedData(matchId, sofascoreEventId, data) {
  let saved = { powerRankings: 0, statistics: 0, pointByPoint: 0, breaksCalculated: 0 };
  
  // Aggiorna o crea match_data_sources
  const { error: sourceError } = await supabase
    .from('match_data_sources')
    .upsert({
      match_id: matchId,
      source_name: 'sofascore',
      source_match_id: sofascoreEventId.toString(),
      has_statistics: data.statistics.length > 0,
      has_momentum: data.powerRankings.length > 0,
      has_point_by_point: data.pointByPoint.length > 0,
      last_fetched: new Date().toISOString()
    }, {
      onConflict: 'match_id,source_name'
    });
  
  if (sourceError) {
    console.error(`   ❌ Errore salvataggio source: ${sourceError.message}`);
  }

  // Calcola break dal point-by-point PRIMA di salvare i power rankings
  const breakMap = calculateBreaksFromPointByPoint(data.pointByPoint);
  const totalBreaks = Array.from(breakMap.values()).filter(Boolean).length;
  if (totalBreaks > 0) {
    console.log(`   🎾 Break totali calcolati: ${totalBreaks}`);
  }

  // Salva Power Rankings (con break calcolati dal point-by-point)
  if (data.powerRankings.length > 0) {
    // Elimina vecchi
    await supabase.from('match_power_rankings_new').delete().eq('match_id', matchId);
    
    const records = data.powerRankings.map((pr, idx) => {
      const setNum = pr.set || 1;
      const gameNum = pr.game || idx + 1;
      const key = `${setNum}-${gameNum}`;
      // Usa break calcolato da point-by-point, fallback al valore originale
      const breakOccurred = breakMap.has(key) ? breakMap.get(key) : (pr.breakOccurred || false);
      
      return {
        match_id: matchId,
        set_number: setNum,
        game_number: gameNum,
        value: pr.value || 0,
        home_score: pr.homeScore || null,
        away_score: pr.awayScore || null,
        server: pr.server === 1 ? 'home' : (pr.server === 2 ? 'away' : null),
        break_occurred: breakOccurred
      };
    });
    
    const { error } = await supabase.from('match_power_rankings_new').insert(records);
    if (!error) {
      saved.powerRankings = records.length;
      saved.breaksCalculated = totalBreaks;
    }
  }

  // Salva Statistics
  if (data.statistics.length > 0) {
    // Elimina vecchi
    await supabase.from('match_statistics_new').delete().eq('match_id', matchId);
    
    const records = [];
    for (const period of data.statistics) {
      const periodNum = period.period === 'ALL' ? 0 : parseInt(period.period) || 0;
      for (const group of (period.groups || [])) {
        for (const item of (group.statisticsItems || [])) {
          records.push({
            match_id: matchId,
            period: periodNum,
            stat_group: group.groupName || 'General',
            stat_name: item.name,
            home_value: item.home || null,
            away_value: item.away || null,
            compare_code: item.compareCode || 0
          });
        }
      }
    }
    
    if (records.length > 0) {
      const { error } = await supabase.from('match_statistics_new').insert(records);
      if (!error) saved.statistics = records.length;
    }
  }

  // Salva Point by Point
  if (data.pointByPoint.length > 0) {
    // Elimina vecchi
    await supabase.from('match_point_by_point_new').delete().eq('match_id', matchId);
    
    const records = [];
    for (const set of data.pointByPoint) {
      for (const game of (set.games || [])) {
        for (const point of (game.points || [])) {
          records.push({
            match_id: matchId,
            set_number: set.set || 1,
            game_number: game.game || 1,
            point_number: point.point || records.length + 1,
            server: game.server === 1 ? 'home' : 'away',
            score_before: point.scoreBefore || null,
            score_after: point.scoreAfter || null,
            point_type: point.type || null,
            winner: point.winner === 1 ? 'home' : (point.winner === 2 ? 'away' : null)
          });
        }
      }
    }
    
    if (records.length > 0) {
      const { error } = await supabase.from('match_point_by_point_new').insert(records);
      if (!error) saved.pointByPoint = records.length;
    }
  }

  return saved;
}

async function main() {
  console.log('🔄 Arricchimento Match XLSX con SofaScore...');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Limit: ${limit} matches`);
  console.log(`   Force: ${force}\n`);

  // Trova match XLSX senza sofascore_event_id
  // Usa il nuovo schema: matches_new con match_data_sources
  let query = supabase
    .from('matches_new')
    .select(`
      id,
      player1_id,
      player2_id,
      match_date,
      tournament_id,
      players_new!matches_new_player1_id_fkey(name),
      player2:players_new!matches_new_player2_id_fkey(name)
    `)
    .order('match_date', { ascending: false })
    .limit(limit * 2);  // Prendiamo di più per filtrare

  const { data: matches, error } = await query;

  if (error) {
    console.error('❌ Errore fetch matches:', error.message);
    
    // Fallback: usa vecchio schema
    console.log('🔄 Provo con vecchio schema...');
    const { data: oldMatches, error: oldError } = await supabase
      .from('matches')
      .select('id, winner_name, loser_name, match_date, surface, data_source')
      .eq('data_source', 'xlsx')
      .order('match_date', { ascending: false })
      .limit(limit);
    
    if (oldError) {
      console.error('❌ Errore anche con vecchio schema:', oldError.message);
      process.exit(1);
    }
    
    return processOldSchema(oldMatches);
  }

  // Trova quali match hanno già dati SofaScore
  const matchIds = matches.map(m => m.id);
  const { data: existingSources } = await supabase
    .from('match_data_sources')
    .select('match_id')
    .eq('source_name', 'sofascore')
    .in('match_id', matchIds);

  const hasSourceIds = new Set((existingSources || []).map(s => s.match_id));

  // Filtra match da processare
  const toProcess = matches
    .filter(m => force || !hasSourceIds.has(m.id))
    .slice(0, limit);

  console.log(`📦 Match da processare: ${toProcess.length}\n`);

  const results = {
    processed: 0,
    enriched: 0,
    notFound: 0,
    errors: []
  };

  for (const match of toProcess) {
    const player1Name = match.players_new?.name || 'Unknown';
    const player2Name = match.player2?.name || 'Unknown';
    const matchDate = match.match_date;

    console.log(`\n🎾 Match ${match.id}: ${player1Name} vs ${player2Name}`);
    console.log(`   Data: ${matchDate}`);
    results.processed++;

    if (dryRun) {
      console.log(`   [DRY RUN] Skip`);
      continue;
    }

    try {
      // Cerca su SofaScore
      const sofaMatch = await findSofaScoreMatch(player1Name, player2Name, matchDate);
      
      if (!sofaMatch) {
        results.notFound++;
        await sleep(1000);
        continue;
      }

      // Fetch dati completi
      console.log(`   📥 Scarico dati SofaScore...`);
      const data = await fetchSofaScoreData(sofaMatch.id);
      
      // Salva
      const saved = await saveEnrichedData(match.id, sofaMatch.id, data);
      console.log(`   💾 Salvati: PR=${saved.powerRankings} (${saved.breaksCalculated} break), Stats=${saved.statistics}, PBP=${saved.pointByPoint}`);
      
      if (saved.powerRankings > 0 || saved.statistics > 0) {
        results.enriched++;
      }

      // Rate limiting più lungo tra match
      await sleep(2000);

    } catch (e) {
      console.error(`   ❌ Errore: ${e.message}`);
      results.errors.push({ matchId: match.id, error: e.message });
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 RIEPILOGO:');
  console.log(`   Processati: ${results.processed}`);
  console.log(`   Arricchiti: ${results.enriched}`);
  console.log(`   Non trovati: ${results.notFound}`);
  console.log(`   Errori: ${results.errors.length}`);
}

/**
 * Fallback per vecchio schema
 */
async function processOldSchema(matches) {
  console.log(`\n📦 Processamento ${matches.length} match (vecchio schema)\n`);
  
  const results = { processed: 0, enriched: 0, notFound: 0, errors: [] };

  for (const match of matches) {
    console.log(`\n🎾 Match ${match.id}: ${match.winner_name} vs ${match.loser_name}`);
    results.processed++;

    if (dryRun) {
      console.log(`   [DRY RUN] Skip`);
      continue;
    }

    try {
      const sofaMatch = await findSofaScoreMatch(
        match.winner_name, 
        match.loser_name, 
        match.match_date
      );
      
      if (!sofaMatch) {
        results.notFound++;
        await sleep(1000);
        continue;
      }

      console.log(`   📥 Scarico dati...`);
      const data = await fetchSofaScoreData(sofaMatch.id);
      
      // Calcola break dal point-by-point
      const breakMap = calculateBreaksFromPointByPoint(data.pointByPoint);
      const totalBreaks = Array.from(breakMap.values()).filter(Boolean).length;
      
      // Salva nel vecchio schema
      if (data.powerRankings.length > 0) {
        await supabase.from('power_rankings').delete().eq('match_id', match.id);
        
        const records = data.powerRankings.map((pr, idx) => {
          const setNum = pr.set || 1;
          const gameNum = pr.game || idx + 1;
          const key = `${setNum}-${gameNum}`;
          const breakOccurred = breakMap.has(key) ? breakMap.get(key) : (pr.breakOccurred || false);
          
          return {
            match_id: match.id,
            set_number: setNum,
            game_number: gameNum,
            value: pr.value || 0,
            break_occurred: breakOccurred
          };
        });
        
        await supabase.from('power_rankings').insert(records);
        console.log(`   ✅ Salvati ${records.length} powerRankings (${totalBreaks} break)`);
        results.enriched++;
      }

      await sleep(2000);

    } catch (e) {
      console.error(`   ❌ Errore: ${e.message}`);
      results.errors.push({ matchId: match.id, error: e.message });
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 RIEPILOGO:');
  console.log(`   Processati: ${results.processed}`);
  console.log(`   Arricchiti: ${results.enriched}`);
  console.log(`   Non trovati: ${results.notFound}`);
}

main().catch(console.error);
