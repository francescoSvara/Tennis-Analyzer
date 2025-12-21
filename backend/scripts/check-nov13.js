/**
 * Cerca TUTTI i match del 13 novembre per trovare duplicati
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkNov13() {
  console.log('Cerco TUTTI i match del 13 novembre 2025...\n');
  
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .gte('start_time', '2025-11-13T00:00:00')
    .lte('start_time', '2025-11-13T23:59:59');
  
  if (error) {
    console.error('Errore:', error.message);
    return;
  }
  
  console.log(`Trovati ${data.length} match:\n`);
  
  for (const m of data) {
    const raw = m.raw_json || {};
    const p1 = m.winner_name || raw.homeTeam?.name || raw.mapping?.home?.name || '?';
    const p2 = m.loser_name || raw.awayTeam?.name || raw.mapping?.away?.name || '?';
    const tourney = raw.tournament?.name || raw.tournament?.uniqueTournament?.name || m.series || '?';
    
    console.log(`ID ${m.id}`);
    console.log(`  ${p1} vs ${p2}`);
    console.log(`  Torneo: ${tourney}`);
    console.log(`  Data: ${m.start_time}`);
    console.log(`  Fonte: ${m.data_source}`);
    console.log('');
  }
}

checkNov13().catch(console.error);
