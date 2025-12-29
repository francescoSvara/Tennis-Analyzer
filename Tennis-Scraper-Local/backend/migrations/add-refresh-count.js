import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function addRefreshCountColumns() {
  console.log('🔧 Aggiunta colonne refresh_count e force_completed alla tabella matches...\n');

  // Supabase non supporta ALTER TABLE direttamente via JS client
  // Dobbiamo usare una query su una tabella esistente per verificare

  // Prima verifichiamo la struttura attuale
  const { data: sample, error: sampleError } = await supabase.from('matches').select('*').limit(1);

  if (sampleError) {
    console.error('❌ Errore accesso tabella matches:', sampleError);
    return;
  }

  if (sample && sample.length > 0) {
    const columns = Object.keys(sample[0]);
    console.log('📋 Colonne esistenti:', columns.join(', '));

    if (columns.includes('refresh_count')) {
      console.log('✅ refresh_count già esiste');
    } else {
      console.log(
        '⚠️ refresh_count NON esiste - devi aggiungerla manualmente in Supabase Dashboard'
      );
    }

    if (columns.includes('force_completed')) {
      console.log('✅ force_completed già esiste');
    } else {
      console.log(
        '⚠️ force_completed NON esiste - devi aggiungerla manualmente in Supabase Dashboard'
      );
    }
  }

  console.log('\n📝 SQL da eseguire in Supabase SQL Editor:');
  console.log('----------------------------------------');
  console.log(`
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS refresh_count INTEGER DEFAULT 0;

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS force_completed BOOLEAN DEFAULT FALSE;
  `);
  console.log('----------------------------------------');
  console.log('\n🔗 Vai su: https://supabase.com/dashboard → tuo progetto → SQL Editor');
}

addRefreshCountColumns();
