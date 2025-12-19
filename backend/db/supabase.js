/**
 * Supabase Client - Connessione al database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Client con service_role key (accesso completo per il backend)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Test della connessione al database
 */
async function testConnection() {
  try {
    const { data, error } = await supabase.from('players').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connection successful');
    return true;
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
    return false;
  }
}

/**
 * Helper per gestire errori Supabase
 */
function handleSupabaseError(error, context = '') {
  if (error) {
    console.error(`❌ Supabase error ${context}:`, error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

module.exports = {
  supabase,
  testConnection,
  handleSupabaseError
};
