require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  const { data, error } = await sb
    .from('v_matches_full')
    .select('id, home_name, away_name, home_country, away_country, tournament_name')
    .limit(3);
  
  if (error) {
    console.log('Errore:', error.message);
  } else {
    console.log('Dati dalla view v_matches_full:');
    console.log(JSON.stringify(data, null, 2));
  }
}

test();
