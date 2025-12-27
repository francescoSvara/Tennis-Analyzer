/**
 * Script per inserire i dati PBP estratti nel database
 * Match: Norrie vs Vacherot (ID: 14968724)
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const { extractSofascorePbp, formatForDatabase } = require('../utils/sofascorePbpExtractor.cjs');

// Supabase config
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'configurato' : 'MANCANTE');
console.log('Supabase Key:', supabaseKey ? 'configurato' : 'MANCANTE');

if (!supabaseUrl || !supabaseKey) {
  console.error('Credenziali Supabase mancanti!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MATCH_ID = 14968724;

async function main() {
  console.log('=== INSERIMENTO PBP DATA ===');
  console.log(`Match ID: ${MATCH_ID}`);
  console.log('');

  // 1. Leggi HTML
  const htmlPath = path.join(__dirname, '..', 'pbp code');
  const html = fs.readFileSync(htmlPath, 'utf8');
  console.log(`HTML caricato: ${html.length} bytes`);

  // 2. Estrai dati
  const extracted = extractSofascorePbp(html);
  if (!extracted.ok) {
    console.error('Errore estrazione:', extracted.error);
    process.exit(1);
  }
  console.log(`Estratti: ${extracted.games.length} games, ${extracted.totalPoints} punti`);

  // 3. Formatta per database
  const dbPoints = formatForDatabase(extracted, MATCH_ID);
  console.log(`Punti formattati per DB: ${dbPoints.length}`);
  console.log('');

  // 4. Verifica tabella esistente
  console.log('Verifico tabella match_point_by_point_new...');
  const { data: existing, error: checkError } = await supabase
    .from('match_point_by_point_new')
    .select('id')
    .eq('match_id', MATCH_ID)
    .limit(1);

  if (checkError) {
    console.error('Errore check tabella:', checkError.message);
  }

  if (existing && existing.length > 0) {
    console.log(`Trovati dati esistenti per match ${MATCH_ID}, li elimino...`);
    const { error: deleteError } = await supabase
      .from('match_point_by_point_new')
      .delete()
      .eq('match_id', MATCH_ID);
    
    if (deleteError) {
      console.error('Errore eliminazione:', deleteError.message);
    } else {
      console.log('Dati esistenti eliminati');
    }
  }

  // 5. Inserisci nuovi dati
  console.log('');
  console.log('Inserisco nuovi dati in match_point_by_point_new...');
  
  // Inserisci UNO PER UNO per evitare errori batch
  let inserted = 0;
  
  for (const point of dbPoints) {
    const { error: insertError } = await supabase
      .from('match_point_by_point_new')
      .insert([point]);

    if (insertError) {
      console.error(`Errore inserimento punto ${inserted + 1}:`, insertError.message);
      console.log('Dati punto:', JSON.stringify(point, null, 2));
      break;
    } else {
      inserted++;
      if (inserted % 20 === 0) {
        console.log(`  Inseriti ${inserted}/${dbPoints.length} punti`);
      }
    }
  }

  console.log('');
  console.log(`✅ Completato! Inseriti ${inserted} punti per match ${MATCH_ID}`);

  // 6. Verifica inserimento
  const { data: verify, count } = await supabase
    .from('match_point_by_point_new')
    .select('*', { count: 'exact' })
    .eq('match_id', MATCH_ID);

  console.log(`Verifica: ${count || verify?.length || 0} punti nel database`);

  // 7. Mostra esempio dati
  if (verify && verify.length > 0) {
    console.log('');
    console.log('Esempio primi 3 punti:');
    verify.slice(0, 3).forEach(p => {
      console.log(`  S${p.set_number}G${p.game_number}P${p.point_number}: ${p.score_p1}-${p.score_p2} | winner: ${p.point_winner} | server: ${p.server}`);
    });
  }
}

main().catch(err => {
  console.error('Errore:', err);
  process.exit(1);
});
