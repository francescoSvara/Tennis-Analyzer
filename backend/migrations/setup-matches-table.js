/**
 * MIGRATION: Setup matches table with all required columns
 * 
 * Questo script:
 * 1. Aggiunge le colonne mancanti alla tabella matches
 * 2. Crea indici per performance
 * 
 * USAGE: node migrations/setup-matches-table.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupMatchesTable() {
  console.log('🔧 Setting up matches table...\n');
  
  // SQL per aggiungere tutte le colonne necessarie
  const alterTableSQL = `
    -- Aggiungi colonne se non esistono
    DO $$ 
    BEGIN
      -- Fingerprint per deduplicazione
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'fingerprint') THEN
        ALTER TABLE matches ADD COLUMN fingerprint TEXT;
        CREATE INDEX IF NOT EXISTS idx_matches_fingerprint ON matches(fingerprint);
      END IF;
      
      -- Nomi normalizzati
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'winner_name_original') THEN
        ALTER TABLE matches ADD COLUMN winner_name_original TEXT;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'loser_name_original') THEN
        ALTER TABLE matches ADD COLUMN loser_name_original TEXT;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'surface_original') THEN
        ALTER TABLE matches ADD COLUMN surface_original TEXT;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'tournament_original') THEN
        ALTER TABLE matches ADD COLUMN tournament_original TEXT;
      END IF;
      
      -- Set scores
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'w1') THEN
        ALTER TABLE matches ADD COLUMN w1 INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'l1') THEN
        ALTER TABLE matches ADD COLUMN l1 INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'w2') THEN
        ALTER TABLE matches ADD COLUMN w2 INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'l2') THEN
        ALTER TABLE matches ADD COLUMN l2 INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'w3') THEN
        ALTER TABLE matches ADD COLUMN w3 INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'l3') THEN
        ALTER TABLE matches ADD COLUMN l3 INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'w4') THEN
        ALTER TABLE matches ADD COLUMN w4 INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'l4') THEN
        ALTER TABLE matches ADD COLUMN l4 INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'w5') THEN
        ALTER TABLE matches ADD COLUMN w5 INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'l5') THEN
        ALTER TABLE matches ADD COLUMN l5 INTEGER;
      END IF;
      
      -- Quote aggiuntive
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'odds_ps_winner') THEN
        ALTER TABLE matches ADD COLUMN odds_ps_winner DECIMAL(10,2);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'odds_ps_loser') THEN
        ALTER TABLE matches ADD COLUMN odds_ps_loser DECIMAL(10,2);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'odds_max_winner') THEN
        ALTER TABLE matches ADD COLUMN odds_max_winner DECIMAL(10,2);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'odds_max_loser') THEN
        ALTER TABLE matches ADD COLUMN odds_max_loser DECIMAL(10,2);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'odds_avg_winner') THEN
        ALTER TABLE matches ADD COLUMN odds_avg_winner DECIMAL(10,2);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'odds_avg_loser') THEN
        ALTER TABLE matches ADD COLUMN odds_avg_loser DECIMAL(10,2);
      END IF;
      
      -- Ranking points
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'winner_points') THEN
        ALTER TABLE matches ADD COLUMN winner_points INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'loser_points') THEN
        ALTER TABLE matches ADD COLUMN loser_points INTEGER;
      END IF;
      
      -- Round e Best of
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'round') THEN
        ALTER TABLE matches ADD COLUMN round TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'best_of') THEN
        ALTER TABLE matches ADD COLUMN best_of INTEGER DEFAULT 3;
      END IF;
      
      -- Data source
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'data_source') THEN
        ALTER TABLE matches ADD COLUMN data_source TEXT;
      END IF;
      
      -- Timestamps
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'created_at') THEN
        ALTER TABLE matches ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'updated_at') THEN
        ALTER TABLE matches ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
      END IF;
      
    END $$;
  `;
  
  try {
    // Supabase non supporta SQL raw direttamente, dobbiamo usare rpc o SQL Editor
    // Proviamo prima a vedere la struttura attuale
    console.log('📋 Checking current table structure...');
    
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('⚠️ Table might not exist:', error.message);
    } else {
      console.log('✅ Table exists');
      if (data && data.length > 0) {
        console.log('Current columns:', Object.keys(data[0]).join(', '));
      }
    }
    
    console.log('\n⚠️  Cannot run ALTER TABLE directly via Supabase JS client.');
    console.log('📝 Please run the following SQL in Supabase SQL Editor:\n');
    console.log('=' .repeat(60));
    console.log(alterTableSQL);
    console.log('=' .repeat(60));
    
    console.log('\n📋 Or run this simpler version column by column:');
    console.log(`
ALTER TABLE matches ADD COLUMN IF NOT EXISTS fingerprint TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_name_original TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS loser_name_original TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS surface_original TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_original TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS w1 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS l1 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS w2 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS l2 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS w3 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS l3 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS w4 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS l4 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS w5 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS l5 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_ps_winner DECIMAL(10,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_ps_loser DECIMAL(10,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_max_winner DECIMAL(10,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_max_loser DECIMAL(10,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_avg_winner DECIMAL(10,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_avg_loser DECIMAL(10,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_points INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS loser_points INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS round TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS best_of INTEGER DEFAULT 3;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS data_source TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_matches_fingerprint ON matches(fingerprint);
CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches(winner_name);
CREATE INDEX IF NOT EXISTS idx_matches_loser ON matches(loser_name);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
    `);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

setupMatchesTable();
