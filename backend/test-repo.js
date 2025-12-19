require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testGetMatches() {
  console.log('=== Test getMatches emulando il repository ===\n');
  
  const { data, error } = await supabase
    .from('v_matches_full')
    .select('*')
    .order('start_time', { ascending: false })
    .range(0, 2);
  
  if (error) {
    console.log('Errore:', error.message);
    return;
  }
  
  console.log('Numero record:', data.length);
  console.log('\nPrimo record (tutte le colonne):');
  console.log(Object.keys(data[0]).join(', '));
  
  console.log('\nValori chiave per primo match:');
  const m = data[0];
  console.log('  id:', m.id);
  console.log('  home_name:', m.home_name);
  console.log('  away_name:', m.away_name);
  console.log('  home_country:', m.home_country);
  console.log('  away_country:', m.away_country);
  console.log('  tournament_name:', m.tournament_name);
  
  console.log('\nSimulazione trasformazione per API:');
  const transformed = {
    id: m.id,
    homeTeam: {
      id: m.home_player_id,
      name: m.home_name || '',
      country: m.home_country || '',
      ranking: m.home_ranking
    },
    awayTeam: {
      id: m.away_player_id,
      name: m.away_name || '',
      country: m.away_country || '',
      ranking: m.away_ranking
    },
    tournament: m.tournament_name
  };
  console.log(JSON.stringify(transformed, null, 2));
}

testGetMatches();
