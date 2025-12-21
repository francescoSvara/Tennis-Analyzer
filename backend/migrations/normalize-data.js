/**
 * MIGRATION: Normalize and Deduplicate Existing Data
 * 
 * Questo script:
 * 1. Legge tutti i match esistenti dal DB
 * 2. Normalizza i nomi (giocatori, tornei, superfici)
 * 3. Identifica i duplicati tramite fingerprint
 * 4. Merge dei duplicati mantenendo il match più completo
 * 5. Aggiorna il DB con i dati puliti
 * 
 * USAGE: node migrations/normalize-data.js [--dry-run]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const {
  normalizePlayerName,
  normalizeSurface,
  normalizeTournament,
  normalizeDate,
  generateMatchFingerprint,
  mergeMatches
} = require('../services/dataNormalizer');

// ============================================
// CONFIGURAZIONE
// ============================================

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 100;

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// STATISTICHE
// ============================================

const stats = {
  totalRead: 0,
  normalized: 0,
  duplicatesFound: 0,
  merged: 0,
  updated: 0,
  deleted: 0,
  errors: 0,
  playerNamesFixed: 0,
  surfacesFixed: 0,
  tournamentsFixed: 0,
};

// ============================================
// FUNZIONI PRINCIPALI
// ============================================

/**
 * Legge tutti i match dal DB
 */
async function fetchAllMatches() {
  console.log('📥 Fetching all matches from database...');
  
  const allMatches = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .range(offset, offset + 999)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching matches:', error.message);
      throw error;
    }
    
    if (data && data.length > 0) {
      allMatches.push(...data);
      offset += data.length;
      console.log(`  Fetched ${allMatches.length} matches...`);
    }
    
    hasMore = data && data.length === 1000;
  }
  
  stats.totalRead = allMatches.length;
  console.log(`✅ Total matches fetched: ${allMatches.length}`);
  
  return allMatches;
}

/**
 * Normalizza un singolo match
 */
function normalizeMatchData(match) {
  const normalized = { ...match };
  let hasChanges = false;
  
  // Normalizza winner_name
  if (match.winner_name) {
    const normalizedWinner = normalizePlayerName(match.winner_name);
    if (normalizedWinner !== match.winner_name) {
      normalized.winner_name = normalizedWinner;
      normalized.winner_name_original = match.winner_name;
      hasChanges = true;
      stats.playerNamesFixed++;
    }
  }
  
  // Normalizza loser_name
  if (match.loser_name) {
    const normalizedLoser = normalizePlayerName(match.loser_name);
    if (normalizedLoser !== match.loser_name) {
      normalized.loser_name = normalizedLoser;
      normalized.loser_name_original = match.loser_name;
      hasChanges = true;
      stats.playerNamesFixed++;
    }
  }
  
  // Normalizza surface
  if (match.surface) {
    const normalizedSurface = normalizeSurface(match.surface);
    if (normalizedSurface !== match.surface) {
      normalized.surface = normalizedSurface;
      normalized.surface_original = match.surface;
      hasChanges = true;
      stats.surfacesFixed++;
    }
  }
  
  // Normalizza tournament
  if (match.tournament) {
    const normalizedTournament = normalizeTournament(match.tournament);
    if (normalizedTournament !== match.tournament) {
      normalized.tournament = normalizedTournament;
      normalized.tournament_original = match.tournament;
      hasChanges = true;
      stats.tournamentsFixed++;
    }
  }
  
  // Normalizza data
  if (match.match_date) {
    const normalizedDate = normalizeDate(match.match_date);
    if (normalizedDate && normalizedDate !== match.match_date) {
      normalized.match_date = normalizedDate;
    }
  }
  
  // Genera fingerprint
  const { fingerprint } = generateMatchFingerprint(normalized);
  normalized.fingerprint = fingerprint;
  
  if (hasChanges) {
    stats.normalized++;
  }
  
  return { normalized, hasChanges };
}

/**
 * Raggruppa i match per fingerprint (trova duplicati)
 */
function groupByFingerprint(matches) {
  const groups = new Map();
  
  for (const match of matches) {
    const { fingerprint } = generateMatchFingerprint(match);
    
    if (!groups.has(fingerprint)) {
      groups.set(fingerprint, []);
    }
    groups.get(fingerprint).push(match);
  }
  
  return groups;
}

/**
 * Risolve i duplicati: merge dei dati e selezione del match principale
 */
function resolveDuplicates(groups) {
  const toKeep = [];     // Match da mantenere (aggiornati)
  const toDelete = [];   // ID dei match da eliminare
  
  for (const [fingerprint, matches] of groups.entries()) {
    if (matches.length === 1) {
      // Nessun duplicato, normalizza e tieni
      const { normalized } = normalizeMatchData(matches[0]);
      toKeep.push(normalized);
    } else {
      // Duplicati trovati!
      stats.duplicatesFound += matches.length - 1;
      
      console.log(`\n🔍 Duplicate found (${matches.length} matches):`);
      console.log(`   Fingerprint: ${fingerprint}`);
      
      // Ordina per completezza dei dati (più campi non-null = meglio)
      const scored = matches.map(m => ({
        match: m,
        score: countNonNullFields(m)
      })).sort((a, b) => b.score - a.score);
      
      // Il primo è il "master", gli altri vengono mergiati e poi eliminati
      let master = scored[0].match;
      console.log(`   Master (id=${master.id}): ${master.winner_name} vs ${master.loser_name}`);
      
      for (let i = 1; i < scored.length; i++) {
        const duplicate = scored[i].match;
        console.log(`   Duplicate (id=${duplicate.id}): ${duplicate.winner_name} vs ${duplicate.loser_name}`);
        
        // Merge i dati del duplicato nel master
        master = mergeMatches(master, duplicate);
        stats.merged++;
        
        // Segna il duplicato per eliminazione
        toDelete.push(duplicate.id);
      }
      
      // Normalizza il master finale
      const { normalized } = normalizeMatchData(master);
      toKeep.push(normalized);
    }
  }
  
  return { toKeep, toDelete };
}

/**
 * Conta i campi non-null in un oggetto
 */
function countNonNullFields(obj) {
  let count = 0;
  for (const value of Object.values(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      count++;
    }
  }
  return count;
}

/**
 * Aggiorna i match nel DB
 */
async function updateMatches(matches) {
  console.log(`\n📝 Updating ${matches.length} matches in database...`);
  
  for (let i = 0; i < matches.length; i += BATCH_SIZE) {
    const batch = matches.slice(i, i + BATCH_SIZE);
    
    for (const match of batch) {
      if (!match.id) {
        console.log('⚠️  Skipping match without ID');
        continue;
      }
      
      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would update id=${match.id}`);
        stats.updated++;
        continue;
      }
      
      const { error } = await supabase
        .from('matches')
        .update({
          winner_name: match.winner_name,
          loser_name: match.loser_name,
          surface: match.surface,
          tournament: match.tournament,
          match_date: match.match_date,
          fingerprint: match.fingerprint,
          winner_name_original: match.winner_name_original,
          loser_name_original: match.loser_name_original,
          surface_original: match.surface_original,
          tournament_original: match.tournament_original,
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.id);
      
      if (error) {
        console.error(`  ❌ Error updating id=${match.id}:`, error.message);
        stats.errors++;
      } else {
        stats.updated++;
      }
    }
    
    console.log(`  Updated ${Math.min(i + BATCH_SIZE, matches.length)}/${matches.length}`);
  }
}

/**
 * Elimina i duplicati dal DB
 */
async function deleteDuplicates(ids) {
  if (ids.length === 0) {
    console.log('\n✅ No duplicates to delete');
    return;
  }
  
  console.log(`\n🗑️  Deleting ${ids.length} duplicate matches...`);
  
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would delete IDs: ${ids.slice(0, 10).join(', ')}${ids.length > 10 ? '...' : ''}`);
    stats.deleted = ids.length;
    return;
  }
  
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('matches')
      .delete()
      .in('id', batch);
    
    if (error) {
      console.error(`  ❌ Error deleting batch:`, error.message);
      stats.errors++;
    } else {
      stats.deleted += batch.length;
    }
    
    console.log(`  Deleted ${Math.min(i + BATCH_SIZE, ids.length)}/${ids.length}`);
  }
}

/**
 * Stampa il riepilogo finale
 */
function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes were made');
  }
  
  console.log(`
Total matches read:      ${stats.totalRead}
Matches normalized:      ${stats.normalized}
  - Player names fixed:  ${stats.playerNamesFixed}
  - Surfaces fixed:      ${stats.surfacesFixed}
  - Tournaments fixed:   ${stats.tournamentsFixed}
Duplicates found:        ${stats.duplicatesFound}
Matches merged:          ${stats.merged}
Matches updated:         ${stats.updated}
Duplicates deleted:      ${stats.deleted}
Errors:                  ${stats.errors}
`);
  
  if (stats.duplicatesFound > 0) {
    console.log(`✅ Cleaned ${stats.duplicatesFound} duplicate entries`);
  }
  
  if (stats.errors > 0) {
    console.log(`⚠️  There were ${stats.errors} errors during migration`);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('🚀 Starting Data Normalization Migration');
  console.log('='.repeat(50));
  
  if (DRY_RUN) {
    console.log('📋 DRY RUN MODE - No changes will be made to the database');
    console.log('   Remove --dry-run to apply changes\n');
  }
  
  try {
    // 1. Fetch all matches
    const matches = await fetchAllMatches();
    
    if (matches.length === 0) {
      console.log('No matches found in database');
      return;
    }
    
    // 2. Group by fingerprint to find duplicates
    console.log('\n🔎 Analyzing for duplicates...');
    const groups = groupByFingerprint(matches);
    console.log(`   Found ${groups.size} unique matches`);
    
    // 3. Resolve duplicates
    const { toKeep, toDelete } = resolveDuplicates(groups);
    
    // 4. Update normalized matches
    await updateMatches(toKeep);
    
    // 5. Delete duplicates
    await deleteDuplicates(toDelete);
    
    // 6. Print summary
    printSummary();
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run
main();
