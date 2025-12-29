/**
 * SCRIPT: Normalizza i nomi giocatori esistenti nel DB
 *
 * Questo script:
 * 1. Legge tutti i match
 * 2. Normalizza winner_name e loser_name
 * 3. Aggiorna il DB
 *
 * USAGE: node scripts/normalize-player-names.js [--dry-run]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { normalizePlayerName, normalizeSurface } = require('../services/dataNormalizer');

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 100;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const stats = {
  total: 0,
  updated: 0,
  unchanged: 0,
  errors: 0,
};

async function normalizeAllMatches() {
  console.log('🔄 Starting player name normalization...');
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // Fetch tutti i match
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id, winner_name, loser_name, surface')
      .range(offset, offset + BATCH_SIZE - 1)
      .order('id');

    if (error) {
      console.error('Error fetching:', error.message);
      break;
    }

    if (!matches || matches.length === 0) {
      hasMore = false;
      break;
    }

    // Process batch
    for (const match of matches) {
      stats.total++;

      const normalizedWinner = normalizePlayerName(match.winner_name || '');
      const normalizedLoser = normalizePlayerName(match.loser_name || '');
      const normalizedSurface = normalizeSurface(match.surface || '');

      const needsUpdate =
        normalizedWinner !== match.winner_name ||
        normalizedLoser !== match.loser_name ||
        normalizedSurface !== match.surface;

      if (needsUpdate) {
        if (DRY_RUN) {
          console.log(`[DRY] ID ${match.id}:`);
          if (normalizedWinner !== match.winner_name) {
            console.log(`  Winner: "${match.winner_name}" -> "${normalizedWinner}"`);
          }
          if (normalizedLoser !== match.loser_name) {
            console.log(`  Loser: "${match.loser_name}" -> "${normalizedLoser}"`);
          }
          if (normalizedSurface !== match.surface) {
            console.log(`  Surface: "${match.surface}" -> "${normalizedSurface}"`);
          }
        } else {
          const { error: updateError } = await supabase
            .from('matches')
            .update({
              winner_name: normalizedWinner,
              loser_name: normalizedLoser,
              surface: normalizedSurface,
              updated_at: new Date().toISOString(),
            })
            .eq('id', match.id);

          if (updateError) {
            console.error(`Error updating ${match.id}:`, updateError.message);
            stats.errors++;
          }
        }
        stats.updated++;
      } else {
        stats.unchanged++;
      }
    }

    offset += matches.length;
    console.log(`Progress: ${offset} matches processed (${stats.updated} to update)`);

    hasMore = matches.length === BATCH_SIZE;
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 NORMALIZATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`
Total processed: ${stats.total}
Updated:         ${stats.updated}
Unchanged:       ${stats.unchanged}
Errors:          ${stats.errors}
  `);

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN - no changes made. Run without --dry-run to apply.');
  }
}

normalizeAllMatches().catch(console.error);
