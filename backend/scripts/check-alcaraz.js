/**
 * Cerca match di Alcaraz nel DB
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAlcaraz() {
  console.log('Cerco match Alcaraz/Musetti novembre 2025...\n');
  
  // Cerca Alcaraz
  const { data: alcaraz, error: e1 } = await supabase
    .from('matches')
    .select('*')
    .or('winner_name.ilike.%Alcaraz%,loser_name.ilike.%Alcaraz%')
    .gte('start_time', '2025-11-10')
    .lte('start_time', '2025-11-16');
  
  // Cerca Musetti
  const { data: musetti, error: e2 } = await supabase
    .from('matches')
    .select('*')
    .or('winner_name.ilike.%Musetti%,loser_name.ilike.%Musetti%')
    .gte('start_time', '2025-11-10')
    .lte('start_time', '2025-11-16');
  
  if (e1) console.error('Errore Alcaraz:', e1.message);
  if (e2) console.error('Errore Musetti:', e2.message);
  
  console.log('=== MATCH ALCARAZ ===');
  for (const m of (alcaraz || [])) {
    const raw = m.raw_json || {};
    const p1 = m.winner_name || raw.homeTeam?.name || raw.mapping?.home?.name || '?';
    const p2 = m.loser_name || raw.awayTeam?.name || raw.mapping?.away?.name || '?';
    const tourney = raw.tournament?.name || raw.tournament?.uniqueTournament?.name || m.series || '?';
    console.log(`ID ${m.id}: ${p1} vs ${p2} | ${tourney} | ${m.start_time?.split('T')[0]} | ${m.data_source}`);
  }
  
  console.log('\n=== MATCH MUSETTI ===');
  for (const m of (musetti || [])) {
    const raw = m.raw_json || {};
    const p1 = m.winner_name || raw.homeTeam?.name || raw.mapping?.home?.name || '?';
    const p2 = m.loser_name || raw.awayTeam?.name || raw.mapping?.away?.name || '?';
    const tourney = raw.tournament?.name || raw.tournament?.uniqueTournament?.name || m.series || '?';
    console.log(`ID ${m.id}: ${p1} vs ${p2} | ${tourney} | ${m.start_time?.split('T')[0]} | ${m.data_source}`);
  }
  
  // Cerca anche nei raw_json per match sofascore
  console.log('\n=== CERCA IN RAW_JSON ===');
  const { data: all } = await supabase
    .from('matches')
    .select('id, data_source, raw_json, start_time')
    .gte('start_time', '2025-11-13')
    .lte('start_time', '2025-11-14');
  
  for (const m of (all || [])) {
    const raw = m.raw_json || {};
    const home = raw.homeTeam?.name || raw.mapping?.home?.name || '';
    const away = raw.awayTeam?.name || raw.mapping?.away?.name || '';
    if (home.includes('Alcaraz') || away.includes('Alcaraz') || home.includes('Musetti') || away.includes('Musetti')) {
      console.log(`ID ${m.id}: ${home} vs ${away} | ${m.start_time?.split('T')[0]} | ${m.data_source}`);
    }
  }
}

checkAlcaraz().catch(console.error);
