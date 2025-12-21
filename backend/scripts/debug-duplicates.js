/**
 * Debug: verifica perché Alcaraz vs Musetti non viene trovato come duplicato
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function normalizePlayerName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim();
}

function getLastName(name) {
  if (!name) return '';
  const parts = normalizePlayerName(name).split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length >= 2 && parts[parts.length - 1].match(/^[a-z]$/)) {
    return parts[0];
  }
  return parts[parts.length - 1];
}

function createMatchKey(match) {
  let player1 = '';
  let player2 = '';
  
  if (match.winner_name && match.loser_name) {
    player1 = getLastName(match.winner_name);
    player2 = getLastName(match.loser_name);
  } else if (match.home_name && match.away_name) {
    player1 = getLastName(match.home_name);
    player2 = getLastName(match.away_name);
  }
  
  if (!player1 || !player2) {
    const raw = match.raw_json || {};
    const home = raw.homeTeam?.name || raw.home?.name || raw.mapping?.home?.name || '';
    const away = raw.awayTeam?.name || raw.away?.name || raw.mapping?.away?.name || '';
    if (home) player1 = getLastName(home);
    if (away) player2 = getLastName(away);
  }
  
  if (!player1 || !player2) return null;
  
  const players = [player1, player2].sort();
  const dateStr = match.start_time ? match.start_time.split('T')[0] : '';
  if (!dateStr) return null;
  
  return `${players[0]}_${players[1]}_${dateStr}`;
}

async function debugAlcarazMusetti() {
  console.log('🔍 Debug Alcaraz vs Musetti...\n');
  
  // Cerca match con Alcaraz O Musetti nel periodo
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or('winner_name.ilike.%Alcaraz%,winner_name.ilike.%Musetti%,loser_name.ilike.%Alcaraz%,loser_name.ilike.%Musetti%')
    .gte('start_time', '2025-11-10')
    .lte('start_time', '2025-11-16');
  
  if (error) {
    console.error('Errore query 1:', error.message);
  }
  
  console.log('=== Match da winner_name/loser_name ===');
  for (const m of (data || [])) {
    const key = createMatchKey(m);
    console.log(`ID ${m.id}: ${m.winner_name || '?'} vs ${m.loser_name || '?'}`);
    console.log(`  Data: ${m.start_time?.split('T')[0]}`);
    console.log(`  Fonte: ${m.data_source}`);
    console.log(`  Chiave: ${key}`);
    console.log('');
  }
  
  // Cerca anche nel raw_json
  const { data: all } = await supabase
    .from('matches')
    .select('*')
    .gte('start_time', '2025-11-13')
    .lte('start_time', '2025-11-14');
  
  console.log('\n=== Match 13-14 novembre (cerca in raw_json) ===');
  for (const m of (all || [])) {
    const raw = m.raw_json || {};
    const home = raw.homeTeam?.name || raw.mapping?.home?.name || '';
    const away = raw.awayTeam?.name || raw.mapping?.away?.name || '';
    
    if (home.includes('Alcaraz') || home.includes('Musetti') || away.includes('Alcaraz') || away.includes('Musetti')) {
      const key = createMatchKey(m);
      console.log(`ID ${m.id}:`);
      console.log(`  raw_json.homeTeam.name: ${home}`);
      console.log(`  raw_json.awayTeam.name: ${away}`);
      console.log(`  winner_name: ${m.winner_name || '-'}`);
      console.log(`  loser_name: ${m.loser_name || '-'}`);
      console.log(`  Data: ${m.start_time?.split('T')[0]}`);
      console.log(`  Fonte: ${m.data_source}`);
      console.log(`  Chiave generata: ${key}`);
      console.log('');
    }
  }
}

debugAlcarazMusetti().catch(console.error);
