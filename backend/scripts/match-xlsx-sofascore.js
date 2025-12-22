/**
 * Script per abbinare match XLSX a SofaScore e recuperare powerRankings
 * 
 * Il problema: i match importati da XLSX hanno ID numerici generati,
 * non sono ID SofaScore reali. Questo script:
 * 1. Trova match XLSX senza powerRankings
 * 2. Cerca su SofaScore per nome giocatori e data
 * 3. Recupera i dati e li salva
 * 
 * Uso: node scripts/match-xlsx-sofascore.js [--limit N] [--dry-run]
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
const limitArg = args.find(a => a.startsWith('--limit'));
const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1]) : 20;

const SOFASCORE_API = 'https://api.sofascore.com/api/v1';
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.sofascore.com/'
};

/**
 * Cerca match su SofaScore per nome giocatore
 * @param {string} playerName - Nome giocatore (es. "Lorenzo Musetti")
 * @param {Date} matchDate - Data del match
 * @returns {Array} Lista di possibili match
 */
async function searchSofaScoreByPlayer(playerName, matchDate) {
  try {
    // SofaScore usa slugs per la ricerca (nome in minuscolo con trattini)
    const slug = playerName.toLowerCase().replace(/\s+/g, '-');
    
    // Prima trova l'ID del giocatore
    const searchUrl = `${SOFASCORE_API}/search/players/${encodeURIComponent(playerName)}/tennis`;
    const searchRes = await fetch(searchUrl, { headers });
    
    if (!searchRes.ok) {
      console.log(`   ⚠️ Ricerca fallita per ${playerName}`);
      return [];
    }
    
    const searchData = await searchRes.json();
    const players = searchData?.results || [];
    
    if (players.length === 0) {
      console.log(`   ⚠️ Nessun giocatore trovato per ${playerName}`);
      return [];
    }
    
    // Prendi il primo risultato (più rilevante)
    const playerId = players[0].entity?.id;
    if (!playerId) return [];
    
    console.log(`   🎾 Trovato giocatore ${playerName}: ID ${playerId}`);
    
    // Cerca le partite recenti del giocatore
    const eventsUrl = `${SOFASCORE_API}/player/${playerId}/events/last/0`;
    const eventsRes = await fetch(eventsUrl, { headers });
    
    if (!eventsRes.ok) return [];
    
    const eventsData = await eventsRes.json();
    return eventsData?.events || [];
    
  } catch (e) {
    console.log(`   ❌ Errore ricerca: ${e.message}`);
    return [];
  }
}

/**
 * Verifica se due match corrispondono
 */
function matchesCorrespond(xlsxMatch, sofaEvent) {
  // Verifica giocatori
  const sofaHome = sofaEvent.homeTeam?.name?.toLowerCase() || '';
  const sofaAway = sofaEvent.awayTeam?.name?.toLowerCase() || '';
  const xlsxWinner = xlsxMatch.winner_name?.toLowerCase() || '';
  const xlsxLoser = xlsxMatch.loser_name?.toLowerCase() || '';
  
  // Almeno uno dei due nomi deve corrispondere parzialmente
  const homeMatch = sofaHome.includes(xlsxWinner.split(' ')[0]) || sofaHome.includes(xlsxLoser.split(' ')[0]);
  const awayMatch = sofaAway.includes(xlsxWinner.split(' ')[0]) || sofaAway.includes(xlsxLoser.split(' ')[0]);
  
  if (!homeMatch && !awayMatch) return false;
  
  // Verifica data (entro 1 giorno)
  if (xlsxMatch.start_time && sofaEvent.startTimestamp) {
    const xlsxDate = new Date(xlsxMatch.start_time);
    const sofaDate = new Date(sofaEvent.startTimestamp * 1000);
    const diffDays = Math.abs((xlsxDate - sofaDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1) return false;
  }
  
  return true;
}

/**
 * Recupera i powerRankings da SofaScore per un match
 */
async function fetchPowerRankings(eventId) {
  try {
    const url = `${SOFASCORE_API}/event/${eventId}/tennis-power-rankings`;
    const res = await fetch(url, { headers });
    
    if (!res.ok) return [];
    
    const data = await res.json();
    return data?.tennisPowerRankings || [];
    
  } catch (e) {
    return [];
  }
}

/**
 * Salva powerRankings nel DB
 */
async function savePowerRankings(matchId, powerRankings) {
  if (!powerRankings || powerRankings.length === 0) return 0;
  
  // Elimina vecchi record
  await supabase.from('power_rankings').delete().eq('match_id', matchId);
  
  // Prepara nuovi record
  const records = powerRankings.map((pr, idx) => {
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
      game_number: pr.game || idx + 1,
      value: value,
      break_occurred: pr.breakOccurred || false,
      zone,
      status
    };
  });
  
  const { error } = await supabase.from('power_rankings').insert(records);
  if (error) {
    console.error(`   ❌ Errore salvataggio PR: ${error.message}`);
    return 0;
  }
  return records.length;
}

async function main() {
  console.log('🔄 Match XLSX ↔ SofaScore Matcher');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Limit: ${limit} matches\n`);
  
  // 1. Trova match XLSX senza powerRankings
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, winner_name, loser_name, start_time, surface, tournament_name, data_source')
    .eq('data_source', 'xlsx_2025')
    .order('start_time', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('❌ Errore fetch matches:', error.message);
    process.exit(1);
  }
  
  console.log(`📦 Trovati ${matches.length} match XLSX da processare\n`);
  
  // Verifica quali hanno già powerRankings
  const { data: existingPR } = await supabase
    .from('power_rankings')
    .select('match_id')
    .in('match_id', matches.map(m => m.id));
  
  const existingPRIds = new Set((existingPR || []).map(p => p.match_id));
  
  const results = {
    total: matches.length,
    skippedExisting: 0,
    matched: 0,
    enriched: 0,
    notFound: 0,
    noPowerRankings: 0,
    errors: []
  };
  
  for (const match of matches) {
    // Skip se ha già powerRankings
    if (existingPRIds.has(match.id)) {
      console.log(`⏭️  ${match.winner_name} vs ${match.loser_name} - già ha PR`);
      results.skippedExisting++;
      continue;
    }
    
    console.log(`🔍 ${match.winner_name} vs ${match.loser_name} (${match.start_time || 'data n/d'})...`);
    
    if (dryRun) {
      console.log(`   [DRY RUN] Skipping search\n`);
      continue;
    }
    
    try {
      // Cerca per nome del vincitore
      const sofaEvents = await searchSofaScoreByPlayer(match.winner_name, match.start_time);
      
      if (sofaEvents.length === 0) {
        console.log(`   ⚠️ Nessun evento trovato per ${match.winner_name}`);
        results.notFound++;
        continue;
      }
      
      // Trova il match corrispondente
      let matchedEvent = null;
      for (const event of sofaEvents) {
        if (matchesCorrespond(match, event)) {
          matchedEvent = event;
          break;
        }
      }
      
      if (!matchedEvent) {
        console.log(`   ⚠️ Nessun match corrispondente trovato tra ${sofaEvents.length} eventi`);
        results.notFound++;
        continue;
      }
      
      results.matched++;
      console.log(`   ✅ Match trovato: SofaScore ID ${matchedEvent.id}`);
      
      // Recupera powerRankings
      const powerRankings = await fetchPowerRankings(matchedEvent.id);
      
      if (powerRankings.length === 0) {
        console.log(`   ⚠️ Nessun powerRanking disponibile su SofaScore`);
        results.noPowerRankings++;
        continue;
      }
      
      // Salva
      const saved = await savePowerRankings(match.id, powerRankings);
      console.log(`   💾 Salvati ${saved} powerRankings`);
      results.enriched++;
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 1500));
      
    } catch (e) {
      console.error(`   ❌ Errore: ${e.message}`);
      results.errors.push({ matchId: match.id, error: e.message });
    }
    
    console.log('');
  }
  
  console.log('\n📊 Riepilogo:');
  console.log(`   Processati: ${results.total}`);
  console.log(`   Già con dati: ${results.skippedExisting}`);
  console.log(`   Match trovati su SofaScore: ${results.matched}`);
  console.log(`   Arricchiti con PR: ${results.enriched}`);
  console.log(`   Non trovati: ${results.notFound}`);
  console.log(`   Senza PR su SofaScore: ${results.noPowerRankings}`);
  console.log(`   Errori: ${results.errors.length}`);
}

main().catch(console.error);
