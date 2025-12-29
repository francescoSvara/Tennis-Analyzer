/**
 * Script per eseguire la migrazione live_tracking su Supabase
 * Esegui con: node run-live-tracking-migration.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running live_tracking migration...\n');

  try {
    // 1. Crea tabella live_tracking
    console.log('1️⃣ Creating live_tracking table...');
    const { error: e1 } = await supabase.from('live_tracking').select('id').limit(1);

    if (e1 && e1.code === '42P01') {
      // Tabella non esiste, la creiamo via REST API non è possibile
      // L'utente deve eseguire manualmente l'SQL dalla dashboard Supabase
      console.log('\n⚠️ La tabella live_tracking non esiste.');
      console.log('\n📋 Per creare la tabella, vai su:');
      console.log('   https://supabase.com/dashboard → SQL Editor');
      console.log('\n   Copia e incolla il contenuto di:');
      console.log('   backend/migrations/add-live-tracking-table.sql\n');
      return;
    } else if (!e1) {
      console.log('✅ Tabella live_tracking già esiste!');
    }

    // 2. Verifica struttura
    console.log('\n2️⃣ Verifying table structure...');
    const { data, error: e2 } = await supabase.from('live_tracking').select('*').limit(0);

    if (e2) {
      console.error('❌ Error:', e2.message);
    } else {
      console.log('✅ Tabella live_tracking accessibile');
    }

    // 3. Test insert
    console.log('\n3️⃣ Testing insert...');
    const testData = {
      source_event_id: 'test-migration-' + Date.now(),
      source_type: 'sofascore',
      status: 'WATCHING',
      priority: 'LOW',
      player1_name: 'Test Player 1',
      player2_name: 'Test Player 2',
    };

    const { data: inserted, error: e3 } = await supabase
      .from('live_tracking')
      .insert(testData)
      .select()
      .single();

    if (e3) {
      console.error('❌ Insert failed:', e3.message);
      console.log('\n⚠️ Probabilmente la tabella non ha la struttura corretta.');
      console.log('   Esegui lo script SQL dalla dashboard Supabase.');
    } else {
      console.log('✅ Insert OK, id:', inserted.id);

      // Cleanup test record
      await supabase.from('live_tracking').delete().eq('id', inserted.id);
      console.log('✅ Test record cleaned up');
    }

    console.log('\n✅ Migration verification complete!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  }
}

runMigration();
