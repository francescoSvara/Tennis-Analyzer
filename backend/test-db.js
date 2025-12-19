/**
 * Script di test per verificare la connessione Supabase e contare i record
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('=== TEST CONNESSIONE SUPABASE ===\n');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? '***' + supabaseServiceKey.slice(-6) : 'MANCANTE');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Credenziali Supabase mancanti nel file .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testConnection() {
  console.log('\n--- Conteggio record nelle tabelle ---\n');
  
  const tables = ['matches', 'players', 'match_statistics', 'point_by_point', 'match_scores', 'power_rankings'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ERRORE - ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count || 0} record`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ERRORE - ${err.message}`);
    }
  }
  
  // Test query matches con dettagli
  console.log('\n--- Ultimi 3 match salvati ---\n');
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('id, home_player_name, away_player_name, tournament_name, start_time')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (matchError) {
    console.log('❌ Errore query matches:', matchError.message);
  } else if (matches && matches.length > 0) {
    matches.forEach((m, i) => {
      console.log(`${i+1}. ${m.home_player_name} vs ${m.away_player_name}`);
      console.log(`   Torneo: ${m.tournament_name || 'N/A'}`);
      console.log(`   Data: ${m.start_time || 'N/A'}`);
    });
  } else {
    console.log('⚠️  Nessun match trovato nel database');
  }
  
  console.log('\n=== FINE TEST ===');
}

testConnection().catch(console.error);
