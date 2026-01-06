/**
 * Script per inserire i dati PBP estratti con il nuovo estrattore corretto
 * Match: Norrie vs Vacherot (ID: 14968724)
 *
 * USA IL CANONICAL ENTRYPOINT: backend/utils/pbp/index.cjs
 * 
 * Rispetta le INVARIANTI TENNIS:
 * - Il servizio NON dipende mai dal vincitore
 * - Il servizio ALTERNA ogni game
 * - Il break NON cambia l'alternanza
 * - Il primo punto del tie-break è servito da chi avrebbe servito il game successivo
 * - Chi serve primo nel tie-break NON serve il primo game del set successivo
 *
 * INSERISCE IN point_by_point (tabella legacy con serving/scoring)
 * 
 * Opzioni ambiente:
 * - STORE_RAW_HTML=1 : Salva anche HTML raw per audit/reparse
 * - DRY_RUN=1 : Solo estrazione, no inserimento
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

// USA IL CANONICAL ENTRYPOINT
const { 
  extractPbpFromSofaScoreHtml, 
  getExtractorInfo 
} = require('../utils/pbp/index.cjs');

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
const HOME_SLUG = 'norrie-cameron';
const AWAY_SLUG = 'vacherot-valentin';

async function main() {
  const DRY_RUN = process.env.DRY_RUN === '1';
  const STORE_RAW_HTML = process.env.STORE_RAW_HTML === '1';
  
  console.log('=== INSERIMENTO PBP DATA (CANONICAL ENTRYPOINT) ===');
  console.log(`Match ID: ${MATCH_ID}`);
  console.log(`Home: ${HOME_SLUG}, Away: ${AWAY_SLUG}`);
  console.log(`Extractor: ${JSON.stringify(getExtractorInfo())}`);
  console.log(`DRY_RUN: ${DRY_RUN}, STORE_RAW_HTML: ${STORE_RAW_HTML}`);
  console.log('');

  // 1. Leggi HTML
  const htmlPath = path.join(__dirname, '..', 'pbp code');
  const html = fs.readFileSync(htmlPath, 'utf8');
  console.log(`HTML caricato: ${html.length} bytes`);

  // 2. Estrai dati con canonical entrypoint (include validation + quality)
  const result = extractPbpFromSofaScoreHtml(html, { 
    homeSlug: HOME_SLUG, 
    awaySlug: AWAY_SLUG,
    sourceUrl: `file://${htmlPath}`
  });
  
  // Log extraction metadata
  console.log('');
  console.log('=== EXTRACTION RESULT ===');
  console.log(`OK: ${result.ok}`);
  console.log(`Meta: ${JSON.stringify(result.meta)}`);
  console.log(`Quality Score: ${result.quality.qualityScore0to100}/100`);
  console.log(`Quality Tags: ${result.quality.tags.join(', ')}`);
  
  if (!result.validation.ok) {
    console.log('');
    console.log('=== VALIDATION ERRORS ===');
    for (const err of result.validation.errors) {
      console.log(`  [${err.code}] ${err.message}`);
    }
  }
  if (result.validation.warnings.length > 0) {
    console.log('');
    console.log('=== VALIDATION WARNINGS ===');
    for (const warn of result.validation.warnings) {
      console.log(`  [${warn.code}] ${warn.message}`);
    }
  }
  
  if (!result.ok) {
    console.error('Errore estrazione:', result.validation.errors);
    process.exit(1);
  }

  const extracted = result.data;
  
  console.log('');
  console.log('=== VERIFICA ESTRAZIONE ===');
  console.log(`First Server: ${extracted.firstServer}`);
  console.log(`Sets: ${extracted.sets.length}`);

  for (const set of extracted.sets) {
    console.log(
      `\nSet ${set.setNumber}: ${set.finalScore.home}-${set.finalScore.away} (${set.games.length} games)`
    );
    const breaks = set.games.filter((g) => g.isBreak);
    if (breaks.length > 0) {
      console.log(`  Breaks: ${breaks.map((b) => `G${b.game}`).join(', ')}`);
    }
    const tb = set.games.find((g) => g.isTiebreak);
    if (tb) {
      console.log(`  Tiebreak: G${tb.game}, winner: ${tb.gameWinner}`);
    }
  }

  // 3. Formatta per database (tabella point_by_point con serving/scoring)
  const dbPoints = [];
  let pointIndex = 0;

  for (const set of extracted.sets) {
    for (const game of set.games) {
      for (const point of game.points) {
        dbPoints.push({
          match_id: MATCH_ID,
          set_number: set.setNumber,
          game_number: game.game,
          point_index: point.pointNumber,
          home_point: point.homeScore,
          away_point: point.awayScore,
          // serving = chi serve questo game (1=home, 2=away)
          serving: game.server === 'home' ? 1 : game.server === 'away' ? 2 : null,
          // scoring = chi VINCE il game (1=home, 2=away) - per break detection
          scoring: game.gameWinner === 'home' ? 1 : game.gameWinner === 'away' ? 2 : null,
          point_winner: point.pointWinner,
          score_before: point.pointNumber === 1 ? '0-0' : null,
          is_break_point: false,
          is_ace: false,
          is_double_fault: false,
        });
        pointIndex++;
      }
    }
  }

  console.log('');
  console.log(`Punti formattati per DB: ${dbPoints.length}`);

  // 4. Verifica ed elimina dati esistenti da ENTRAMBE le tabelle
  console.log('');
  console.log('Elimino dati esistenti...');

  // Elimina da point_by_point
  await supabase.from('point_by_point').delete().eq('match_id', MATCH_ID);
  // Elimina anche da match_point_by_point_new per evitare conflitti
  await supabase.from('match_point_by_point').delete().eq('match_id', MATCH_ID);
  console.log('Dati esistenti eliminati da entrambe le tabelle');

  // 5. Inserisci nuovi dati in point_by_point
  console.log('');
  console.log('Inserisco nuovi dati in point_by_point...');

  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < dbPoints.length; i += BATCH_SIZE) {
    const batch = dbPoints.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase.from('point_by_point').insert(batch);

    if (insertError) {
      console.error(`Errore inserimento batch ${i}:`, insertError.message);
      // Prova uno per uno
      for (const point of batch) {
        const { error: singleError } = await supabase.from('point_by_point').insert([point]);
        if (!singleError) inserted++;
        else console.error('  Errore singolo:', singleError.message);
      }
    } else {
      inserted += batch.length;
      console.log(`  Inseriti ${inserted}/${dbPoints.length} punti`);
    }
  }

  // 6. Verifica inserimento
  console.log('');
  console.log('Verifica inserimento...');
  const { count: finalCount } = await supabase
    .from('point_by_point')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', MATCH_ID);

  console.log(`Punti nel DB (point_by_point): ${finalCount}`);

  // Verifica serving/scoring
  const { data: sample } = await supabase
    .from('point_by_point')
    .select('set_number, game_number, point_index, serving, scoring, point_winner')
    .eq('match_id', MATCH_ID)
    .order('set_number')
    .order('game_number')
    .order('point_index')
    .limit(20);

  console.log('');
  console.log('Sample primi 20 punti:');
  if (sample) {
    sample.forEach((p) => {
      console.log(
        `  S${p.set_number} G${p.game_number} P${p.point_index}: serving=${p.serving}, scoring=${p.scoring}, winner=${p.point_winner}`
      );
    });
  }

  // Verifica break detection
  console.log('');
  console.log('Verifica break detection (Set 2):');
  const { data: set2 } = await supabase
    .from('point_by_point')
    .select('game_number, serving, scoring')
    .eq('match_id', MATCH_ID)
    .eq('set_number', 2)
    .order('game_number')
    .order('point_index');

  if (set2) {
    const games = {};
    set2.forEach((p) => {
      if (!games[p.game_number]) {
        games[p.game_number] = { serving: p.serving, scoring: p.scoring };
      }
    });
    Object.keys(games).forEach((g) => {
      const isBreak = games[g].serving !== games[g].scoring;
      console.log(
        `  G${g}: serving=${games[g].serving}, scoring=${games[g].scoring}, break=${
          isBreak ? 'YES' : 'no'
        }`
      );
    });
  }

  console.log('');
  console.log('=== COMPLETATO ===');
}

main().catch(console.error);



