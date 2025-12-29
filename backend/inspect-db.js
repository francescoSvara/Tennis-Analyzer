/**
 * Script per vedere la struttura delle tabelle Supabase
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function inspectTables() {
  console.log('=== STRUTTURA TABELLE SUPABASE ===\n');

  // Prendi un record da matches per vedere le colonne
  console.log('--- Tabella MATCHES (1 record esempio) ---');
  const { data: match, error: e1 } = await supabase.from('matches').select('*').limit(1);
  if (e1) console.log('Errore:', e1.message);
  else if (match && match[0]) {
    console.log('Colonne:', Object.keys(match[0]).join(', '));
    console.log('Esempio:', JSON.stringify(match[0], null, 2));
  } else {
    console.log('Nessun record');
  }

  console.log('\n--- Tabella PLAYERS (1 record esempio) ---');
  const { data: player, error: e2 } = await supabase.from('players').select('*').limit(1);
  if (e2) console.log('Errore:', e2.message);
  else if (player && player[0]) {
    console.log('Colonne:', Object.keys(player[0]).join(', '));
    console.log('Esempio:', JSON.stringify(player[0], null, 2));
  } else {
    console.log('Nessun record');
  }

  console.log('\n--- Tabella MATCH_STATISTICS (1 record esempio) ---');
  const { data: stat, error: e3 } = await supabase.from('match_statistics').select('*').limit(1);
  if (e3) console.log('Errore:', e3.message);
  else if (stat && stat[0]) {
    console.log('Colonne:', Object.keys(stat[0]).join(', '));
  } else {
    console.log('Nessun record');
  }

  console.log('\n=== FINE ===');
}

inspectTables().catch(console.error);
