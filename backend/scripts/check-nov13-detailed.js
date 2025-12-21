/**
 * Debug specifico: controlla tutti i match del 13 novembre 2025
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkNov13() {
  // Cerca tutti i match tra 12 e 14 novembre
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .gte('start_time', '2025-11-12T00:00:00')
    .lte('start_time', '2025-11-14T23:59:59')
    .order('start_time');
  
  if (error) {
    console.error('Errore:', error.message);
    return;
  }
  
  console.log(`Match 12-14 novembre 2025: ${data.length}\n`);
  
  for (const m of data) {
    const raw = m.raw_json || {};
    const p1 = m.winner_name || raw.homeTeam?.name || raw.mapping?.home?.name || '?';
    const p2 = m.loser_name || raw.awayTeam?.name || raw.mapping?.away?.name || '?';
    const tourney = raw.tournament?.uniqueTournament?.name || raw.tournament?.name || m.series || '?';
    
    console.log(`ID: ${m.id}`);
    console.log(`  Giocatori: ${p1} vs ${p2}`);
    console.log(`  Torneo: ${tourney}`);
    console.log(`  Data: ${m.start_time}`);
    console.log(`  Fonte: ${m.data_source}`);
    console.log(`  Status: ${m.status_type || 'null'} (${m.status_description || '-'})`);
    console.log(`  winner_rank: ${m.winner_rank || '-'}, loser_rank: ${m.loser_rank || '-'}`);
    console.log('');
  }
}

checkNov13().catch(console.error);
