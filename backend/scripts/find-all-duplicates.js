/**
 * Cerca TUTTI i match che potrebbero essere duplicati
 * usando cognomi + data con tolleranza ±1 giorno
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getLastName(name) {
  if (!name) return '';
  const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, '').trim();
  const parts = normalized.split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length >= 2 && parts[parts.length - 1].match(/^[a-z]$/)) {
    return parts[0];
  }
  return parts[parts.length - 1];
}

function getMatchPlayers(match) {
  const raw = match.raw_json || {};
  
  // Prova in ordine: winner/loser, homeTeam/awayTeam, mapping
  let p1 = match.winner_name || raw.homeTeam?.name || raw.mapping?.home?.name || '';
  let p2 = match.loser_name || raw.awayTeam?.name || raw.mapping?.away?.name || '';
  
  return {
    player1: getLastName(p1),
    player2: getLastName(p2),
    originalP1: p1,
    originalP2: p2
  };
}

async function findAllDuplicates() {
  console.log('🔍 Cercando TUTTI i duplicati nel database...\n');
  
  // Carica tutti i match
  let allMatches = [];
  let offset = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: page } = await supabase
      .from('matches')
      .select('*')
      .order('start_time', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    if (!page || page.length === 0) break;
    allMatches = [...allMatches, ...page];
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  
  console.log(`📊 Totale match: ${allMatches.length}\n`);
  
  // Raggruppa per (giocatori + data)
  const groups = new Map();
  
  for (const match of allMatches) {
    const { player1, player2 } = getMatchPlayers(match);
    if (!player1 || !player2) continue;
    
    const dateStr = match.start_time ? match.start_time.split('T')[0] : '';
    if (!dateStr) continue;
    
    // Ordina giocatori per chiave consistente
    const players = [player1, player2].sort();
    const key = `${players[0]}_${players[1]}_${dateStr}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(match);
  }
  
  // Trova duplicati
  const duplicates = [];
  for (const [key, matches] of groups) {
    if (matches.length > 1) {
      duplicates.push({ key, matches });
    }
  }
  
  console.log(`🔄 Trovati ${duplicates.length} gruppi con duplicati:\n`);
  
  for (const dup of duplicates) {
    console.log(`=== ${dup.key} ===`);
    for (const m of dup.matches) {
      const { originalP1, originalP2 } = getMatchPlayers(m);
      const raw = m.raw_json || {};
      const tourney = raw.tournament?.uniqueTournament?.name || raw.tournament?.name || m.series || '?';
      console.log(`  ID ${m.id}: ${originalP1 || '?'} vs ${originalP2 || '?'}`);
      console.log(`    Torneo: ${tourney}`);
      console.log(`    Fonte: ${m.data_source}`);
    }
    console.log('');
  }
  
  // Cerca anche duplicati con tolleranza ±1 giorno
  console.log('\n🔍 Cercando duplicati con tolleranza ±1 giorno...\n');
  
  // Crea indice per data
  const byDate = new Map();
  for (const match of allMatches) {
    const { player1, player2 } = getMatchPlayers(match);
    if (!player1 || !player2) continue;
    
    const dateStr = match.start_time ? match.start_time.split('T')[0] : '';
    if (!dateStr) continue;
    
    const players = [player1, player2].sort();
    const playerKey = `${players[0]}_${players[1]}`;
    
    if (!byDate.has(playerKey)) {
      byDate.set(playerKey, []);
    }
    byDate.get(playerKey).push({ match, date: new Date(dateStr) });
  }
  
  // Trova match con stessi giocatori ma date vicine
  let fuzzyDuplicates = 0;
  for (const [playerKey, entries] of byDate) {
    if (entries.length < 2) continue;
    
    // Ordina per data
    entries.sort((a, b) => a.date - b.date);
    
    for (let i = 0; i < entries.length - 1; i++) {
      const diff = (entries[i+1].date - entries[i].date) / (1000 * 60 * 60 * 24);
      if (diff > 0 && diff <= 1) {
        const m1 = entries[i].match;
        const m2 = entries[i+1].match;
        const { originalP1: p1a, originalP2: p2a } = getMatchPlayers(m1);
        const { originalP1: p1b, originalP2: p2b } = getMatchPlayers(m2);
        const t1 = m1.raw_json?.tournament?.name || m1.series || '?';
        const t2 = m2.raw_json?.tournament?.name || m2.series || '?';
        
        console.log(`🟡 Possibile duplicato (${diff} giorni di differenza):`);
        console.log(`   ID ${m1.id}: ${p1a} vs ${p2a} | ${t1} | ${m1.start_time?.split('T')[0]} | ${m1.data_source}`);
        console.log(`   ID ${m2.id}: ${p1b} vs ${p2b} | ${t2} | ${m2.start_time?.split('T')[0]} | ${m2.data_source}`);
        console.log('');
        fuzzyDuplicates++;
      }
    }
  }
  
  console.log(`\n📊 Totale duplicati fuzzy: ${fuzzyDuplicates}`);
}

findAllDuplicates().catch(console.error);
