/**
 * Script per verificare le view Supabase e testare le API
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkViews() {
  console.log('=== VERIFICA VIEW SUPABASE ===\n');

  // Test v_matches_full (usata dal backend)
  console.log('--- Test view: v_matches_full ---');
  const { data: matchesFull, error: e1 } = await supabase
    .from('v_matches_full')
    .select('*')
    .limit(1);

  if (e1) {
    console.log('❌ ERRORE v_matches_full:', e1.message);
    console.log('   Codice:', e1.code);
    console.log('   Dettagli:', e1.details);
    console.log('\n⚠️  Questa view non esiste! Il backend non può caricare i match.');
  } else {
    console.log('✅ v_matches_full funziona');
    if (matchesFull && matchesFull[0]) {
      console.log('   Colonne:', Object.keys(matchesFull[0]).join(', '));
    }
  }

  // Test v_momentum_summary
  console.log('\n--- Test view: v_momentum_summary ---');
  const { data: momentum, error: e2 } = await supabase
    .from('v_momentum_summary')
    .select('*')
    .limit(1);

  if (e2) {
    console.log('❌ ERRORE v_momentum_summary:', e2.message);
  } else {
    console.log('✅ v_momentum_summary funziona');
  }

  // Se la view non esiste, proviamo a fare una query manuale con join
  if (e1) {
    console.log('\n--- Test query manuale con join players ---');
    const { data: manualQuery, error: e3 } = await supabase
      .from('matches')
      .select(
        `
        *,
        home_player:players!home_player_id(id, name, full_name, country_name),
        away_player:players!away_player_id(id, name, full_name, country_name)
      `
      )
      .limit(1);

    if (e3) {
      console.log('❌ ERRORE query manuale:', e3.message);
    } else if (manualQuery && manualQuery[0]) {
      console.log('✅ Query manuale funziona!');
      console.log('   Home player:', manualQuery[0].home_player?.name);
      console.log('   Away player:', manualQuery[0].away_player?.name);
    }
  }

  console.log('\n=== FINE ===');
}

checkViews().catch(console.error);
