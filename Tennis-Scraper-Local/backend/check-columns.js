// Script per verificare le colonne del database
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkColumns() {
  console.log('🔍 Verifico colonne tabella matches...\n');

  const { data, error } = await supabase.from('matches').select('*').limit(1);

  if (error) {
    console.error('❌ Errore:', error);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('📋 Colonne esistenti:');
    columns.forEach((c) => console.log(`   - ${c}`));

    console.log('\n🔎 Verifica colonne refresh:');
    console.log(
      `   refresh_count: ${columns.includes('refresh_count') ? '✅ ESISTE' : '❌ MANCA'}`
    );
    console.log(
      `   force_completed: ${columns.includes('force_completed') ? '✅ ESISTE' : '❌ MANCA'}`
    );

    if (!columns.includes('refresh_count') || !columns.includes('force_completed')) {
      console.log('\n📝 SQL da eseguire in Supabase Dashboard > SQL Editor:');
      console.log('─'.repeat(50));
      console.log(`
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS refresh_count INTEGER DEFAULT 0;

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS force_completed BOOLEAN DEFAULT FALSE;
      `);
      console.log('─'.repeat(50));
    }
  } else {
    console.log('⚠️ Nessun match trovato nella tabella');
  }

  process.exit(0);
}

checkColumns();
