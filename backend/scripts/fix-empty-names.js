/**
 * Script per correggere i match con winner_name/loser_name vuoti
 * Recupera i nomi dalla tabella players usando home_player_id/away_player_id
 */

require('dotenv').config();
const { supabase } = require('../db/supabase');

async function fixEmptyNames() {
  console.log('🔧 Fixing matches with empty winner_name/loser_name...\n');

  // 1. Trova match con nomi vuoti ma con player_id
  const { data: matchesToFix, error } = await supabase
    .from('matches')
    .select(
      `
      id, 
      winner_name, 
      loser_name, 
      winner_code,
      home_player_id, 
      away_player_id,
      home_sets_won,
      away_sets_won,
      data_source
    `
    )
    .not('home_player_id', 'is', null)
    .or('winner_name.is.null,winner_name.eq.,loser_name.is.null,loser_name.eq.');

  if (error) {
    console.error('❌ Error fetching matches:', error.message);
    return;
  }

  console.log(`📊 Found ${matchesToFix?.length || 0} matches to fix\n`);

  if (!matchesToFix || matchesToFix.length === 0) {
    console.log('✅ No matches need fixing!');
    return;
  }

  // 2. Raccogli tutti i player_id necessari
  const playerIds = new Set();
  matchesToFix.forEach((m) => {
    if (m.home_player_id) playerIds.add(m.home_player_id);
    if (m.away_player_id) playerIds.add(m.away_player_id);
  });

  // 3. Carica i nomi dei player
  const { data: players, error: playerErr } = await supabase
    .from('players')
    .select('id, name, full_name')
    .in('id', Array.from(playerIds));

  if (playerErr) {
    console.error('❌ Error fetching players:', playerErr.message);
    return;
  }

  // Crea mappa player_id -> name
  const playerMap = new Map();
  players?.forEach((p) => {
    playerMap.set(p.id, p.name || p.full_name || 'Unknown');
  });

  console.log(`📋 Loaded ${playerMap.size} player names\n`);

  // 4. Fix each match
  let fixed = 0;
  let errors = 0;

  for (const match of matchesToFix) {
    const homeName = playerMap.get(match.home_player_id) || null;
    const awayName = playerMap.get(match.away_player_id) || null;

    if (!homeName && !awayName) {
      console.log(`⚠️  Match ${match.id}: No player names found`);
      continue;
    }

    // Determina winner/loser
    let winnerName = null;
    let loserName = null;

    if (match.winner_code === 1) {
      winnerName = homeName;
      loserName = awayName;
    } else if (match.winner_code === 2) {
      winnerName = awayName;
      loserName = homeName;
    } else {
      // Fallback: check sets
      const homeSets = match.home_sets_won || 0;
      const awaySets = match.away_sets_won || 0;
      if (homeSets > awaySets) {
        winnerName = homeName;
        loserName = awayName;
      } else if (awaySets > homeSets) {
        winnerName = awayName;
        loserName = homeName;
      } else {
        // Can't determine winner, just set home as "winner" for naming
        winnerName = homeName;
        loserName = awayName;
      }
    }

    // Skip if current values are already correct
    if (match.winner_name === winnerName && match.loser_name === loserName) {
      continue;
    }

    // Update
    const updateData = {};
    if (!match.winner_name || match.winner_name === '') {
      updateData.winner_name = winnerName;
    }
    if (!match.loser_name || match.loser_name === '') {
      updateData.loser_name = loserName;
    }

    if (Object.keys(updateData).length === 0) continue;

    const { error: updateErr } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', match.id);

    if (updateErr) {
      console.error(`❌ Error updating match ${match.id}:`, updateErr.message);
      errors++;
    } else {
      console.log(`✅ Fixed match ${match.id}: ${winnerName} def. ${loserName}`);
      fixed++;
    }
  }

  console.log('\n📊 SUMMARY:');
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   ⚪ Skipped: ${matchesToFix.length - fixed - errors}`);
}

// Run
fixEmptyNames()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
