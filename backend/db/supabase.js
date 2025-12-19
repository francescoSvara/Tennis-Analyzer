/**
 * Supabase Client - Connessione al database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
// Supporta entrambi i nomi delle variabili (Railway usa SERVICE_ROLE_KEY)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Required: SUPABASE_URL and (SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY)');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  // Non uscire, continua senza DB
  console.warn('⚠️ Running without database connection');
}

// Client con service_role key (accesso completo per il backend)
// Se mancano credenziali, crea un client fittizio che non farà nulla
const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * Test della connessione al database
 */
async function testConnection() {
  if (!supabase) {
    console.warn('⚠️ Supabase client not initialized');
    return false;
  }
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
