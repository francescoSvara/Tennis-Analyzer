/**
 * MIGRATION: Migra dati dalla vecchia struttura alla nuova
 * 
 * PRIMA di eseguire questo script:
 * 1. Esegui create-new-schema.sql in Supabase SQL Editor
 * 2. Fai backup del database!
 * 
 * USAGE: node migrations/migrate-to-new-schema.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper per normalizzare nomi
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cache players per evitare duplicati
const playerCache = new Map();

async function migrateData() {
  console.log('🚀 Starting migration to new schema...\n');

  // Verifica che le nuove tabelle esistano
  const { error: checkError } = await supabase.from('players_new').select('count').limit(1);
  if (checkError) {
    console.error('❌ New tables not found. Run create-new-schema.sql first!');
    console.error(checkError.message);
    process.exit(1);
  }

  // Step 1: Migra Players
  console.log('📦 Step 1: Migrating players...');
  await migratePlayers();

  // Step 2: Migra Tournaments
  console.log('\n📦 Step 2: Migrating tournaments...');
  await migrateTournaments();

  // Step 3: Migra Matches
  console.log('\n📦 Step 3: Migrating matches...');
  await migrateMatches();

  // Step 4: Migra Statistics
  console.log('\n📦 Step 4: Migrating statistics...');
  await migrateStatistics();

  // Step 5: Migra Power Rankings
  console.log('\n📦 Step 5: Migrating power rankings...');
  await migratePowerRankings();

  // Step 6: Migra Point by Point
  console.log('\n📦 Step 6: Migrating point by point...');
  await migratePointByPoint();

  console.log('\n✅ Migration completed!');
}

async function migratePlayers() {
  // Ottieni tutti i player dalla vecchia tabella
  const { data: oldPlayers, error } = await supabase
    .from('players')
    .select('*');

  if (error) {
    console.error('Error fetching old players:', error.message);
    return;
  }

  console.log(`Found ${oldPlayers?.length || 0} players to migrate`);

  for (const player of oldPlayers || []) {
    try {
      // Inserisci in nuova tabella
      const { data: newPlayer, error: insertError } = await supabase
        .from('players_new')
        .upsert({
          sofascore_id: player.id,
          name: player.name || player.full_name || 'Unknown',
          full_name: player.full_name,
          first_name: player.name?.split(' ')[0],
          last_name: player.name?.split(' ').slice(-1)[0],
          slug: player.slug,
          country_code: player.country_alpha2,
          country_name: player.country_name,
          current_ranking: player.current_ranking,
          is_active: true
        }, { onConflict: 'sofascore_id' })
        .select()
        .single();

      if (!insertError && newPlayer) {
        playerCache.set(player.id, newPlayer.id);
        
        // Aggiungi alias
        const normalized = normalizeName(player.name);
        if (normalized) {
          await supabase
            .from('player_aliases')
            .upsert({
              player_id: newPlayer.id,
              alias_name: player.name,
              alias_normalized: normalized,
              source: 'migration'
            }, { onConflict: 'alias_normalized' });
        }
      }
    } catch (err) {
      console.error(`Error migrating player ${player.id}:`, err.message);
    }
  }

  console.log(`✅ Migrated ${playerCache.size} players`);
}

async function migrateTournaments() {
  const { data: oldTournaments, error } = await supabase
    .from('tournaments')
    .select('*');

  if (error) {
    console.error('Error fetching old tournaments:', error.message);
    return;
  }

  console.log(`Found ${oldTournaments?.length || 0} tournaments to migrate`);

  let count = 0;
  for (const tournament of oldTournaments || []) {
    const { error: insertError } = await supabase
      .from('tournaments_new')
      .upsert({
        sofascore_id: tournament.id,
        name: tournament.name || 'Unknown',
        slug: tournament.slug,
        category: tournament.category,
        surface: tournament.ground_type,
        country_name: tournament.country
      }, { onConflict: 'sofascore_id' });

    if (!insertError) count++;
  }

  console.log(`✅ Migrated ${count} tournaments`);
}

async function migrateMatches() {
  // Ottieni matches con conteggio
  const { count } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true });

  console.log(`Found ${count || 0} matches to migrate`);

  // Migra in batch
  const batchSize = 100;
  let offset = 0;
  let migrated = 0;

  while (true) {
    const { data: oldMatches, error } = await supabase
      .from('matches')
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (error || !oldMatches || oldMatches.length === 0) break;

    for (const match of oldMatches) {
      try {
        // Trova o crea player IDs
        const player1Id = await findOrCreatePlayer(
          match.home_player_id,
          match.winner_name,
          match.winner_name_original
        );
        const player2Id = await findOrCreatePlayer(
          match.away_player_id,
          match.loser_name,
          match.loser_name_original
        );

        // Determina winner
        let winnerId = null;
        if (match.winner_code === 1) winnerId = player1Id;
        else if (match.winner_code === 2) winnerId = player2Id;

        // Trova tournament
        const tournamentId = match.tournament_id 
          ? await findTournament(match.tournament_id)
          : null;

        // Costruisci score string
        const score = buildScoreString(match);

        // Inserisci match
        const { data: newMatch, error: insertError } = await supabase
          .from('matches_new')
          .upsert({
            id: match.id, // Mantieni stesso ID
            player1_id: player1Id,
            player2_id: player2Id,
            winner_id: winnerId,
            tournament_id: tournamentId,
            match_date: match.match_date || match.start_time?.split('T')[0],
            start_timestamp: match.start_time ? new Date(match.start_time).getTime() / 1000 : null,
            round: match.round_name || match.round,
            best_of: match.best_of || 3,
            surface: match.surface,
            status: match.status_type || 'finished',
            winner_code: match.winner_code,
            score: score,
            sets_player1: match.home_sets_won,
            sets_player2: match.away_sets_won,
            set1_p1: match.w1, set1_p2: match.l1,
            set2_p1: match.w2, set2_p2: match.l2,
            set3_p1: match.w3, set3_p2: match.l3,
            set4_p1: match.w4, set4_p2: match.l4,
            set5_p1: match.w5, set5_p2: match.l5,
            player1_rank: match.winner_rank,
            player2_rank: match.loser_rank,
            data_quality: calculateDataQuality(match)
          }, { onConflict: 'id' })
          .select()
          .single();

        if (!insertError && newMatch) {
          migrated++;

          // Registra data source
          await supabase
            .from('match_data_sources')
            .upsert({
              match_id: newMatch.id,
              source_type: match.data_source || 'unknown',
              source_id: match.id.toString(),
              source_url: match.sofascore_url,
              has_score: true,
              has_statistics: false, // Sarà aggiornato dopo
              has_power_rankings: false,
              has_point_by_point: false,
              has_odds: !!match.odds_ps_winner
            }, { onConflict: 'match_id,source_type' });

          // Migra odds se presenti
          if (match.odds_ps_winner || match.odds_max_winner) {
            await supabase
              .from('match_odds')
              .insert({
                match_id: newMatch.id,
                bookmaker: 'pinnacle',
                odds_type: 'match_winner',
                odds_player1: match.odds_ps_winner,
                odds_player2: match.odds_ps_loser,
                is_closing: true
              });
          }
        }
      } catch (err) {
        console.error(`Error migrating match ${match.id}:`, err.message);
      }
    }

    offset += batchSize;
    process.stdout.write(`\r   Migrated ${migrated}/${count || '?'} matches...`);
  }

  console.log(`\n✅ Migrated ${migrated} matches`);
}

async function findOrCreatePlayer(sofascoreId, name, originalName) {
  if (!name && !sofascoreId) return null;

  // Prima cerca in cache
  if (sofascoreId && playerCache.has(sofascoreId)) {
    return playerCache.get(sofascoreId);
  }

  // Cerca per nome normalizzato
  const normalized = normalizeName(name || originalName);
  if (normalized) {
    const { data: alias } = await supabase
      .from('player_aliases')
      .select('player_id')
      .eq('alias_normalized', normalized)
      .single();

    if (alias?.player_id) {
      if (sofascoreId) playerCache.set(sofascoreId, alias.player_id);
      return alias.player_id;
    }
  }

  // Crea nuovo player
  const { data: newPlayer, error } = await supabase
    .from('players_new')
    .insert({
      name: name || originalName || 'Unknown',
      sofascore_id: sofascoreId,
      is_active: true
    })
    .select()
    .single();

  if (error || !newPlayer) return null;

  // Aggiungi alias
  if (normalized) {
    await supabase
      .from('player_aliases')
      .upsert({
        player_id: newPlayer.id,
        alias_name: name || originalName,
        alias_normalized: normalized,
        source: 'migration'
      }, { onConflict: 'alias_normalized' });
  }

  if (sofascoreId) playerCache.set(sofascoreId, newPlayer.id);
  return newPlayer.id;
}

async function findTournament(sofascoreId) {
  if (!sofascoreId) return null;

  const { data } = await supabase
    .from('tournaments_new')
    .select('id')
    .eq('sofascore_id', sofascoreId)
    .single();

  return data?.id || null;
}

function buildScoreString(match) {
  const sets = [];
  for (let i = 1; i <= 5; i++) {
    const w = match[`w${i}`];
    const l = match[`l${i}`];
    if (w !== null && l !== null && w !== undefined && l !== undefined) {
      sets.push(`${w}-${l}`);
    }
  }
  return sets.join(' ') || null;
}

function calculateDataQuality(match) {
  let quality = 30; // Base per avere score
  
  if (match.winner_rank && match.loser_rank) quality += 10;
  if (match.odds_ps_winner) quality += 10;
  if (match.surface) quality += 5;
  if (match.round) quality += 5;
  
  return Math.min(quality, 100);
}

async function migrateStatistics() {
  const { data: oldStats, error } = await supabase
    .from('match_statistics')
    .select('match_id')
    .limit(1);

  if (error) {
    console.log('⚠️ No statistics table or empty');
    return;
  }

  // Per ora, questa migrazione richiede query più complesse
  // La struttura vecchia è molto diversa (chiave/valore vs colonne)
  console.log('⚠️ Statistics migration requires manual review - structure differs significantly');
}

async function migratePowerRankings() {
  const { count } = await supabase
    .from('power_rankings')
    .select('*', { count: 'exact', head: true });

  console.log(`Found ${count || 0} power ranking entries`);

  const batchSize = 500;
  let offset = 0;
  let migrated = 0;

  while (true) {
    const { data: oldPR, error } = await supabase
      .from('power_rankings')
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (error || !oldPR || oldPR.length === 0) break;

    const newRecords = oldPR.map(pr => ({
      match_id: pr.match_id,
      set_number: pr.set_number,
      game_number: pr.game_number,
      value: pr.value,
      break_occurred: pr.break_occurred,
      zone: pr.zone,
      favored_player: pr.value > 0 ? 1 : pr.value < 0 ? 2 : null
    }));

    const { error: insertError } = await supabase
      .from('match_power_rankings_new')
      .upsert(newRecords, { onConflict: 'match_id,set_number,game_number' });

    if (!insertError) {
      migrated += newRecords.length;

      // Aggiorna data source
      const matchIds = [...new Set(oldPR.map(pr => pr.match_id))];
      for (const matchId of matchIds) {
        await supabase
          .from('match_data_sources')
          .update({ has_power_rankings: true })
          .eq('match_id', matchId);
      }
    }

    offset += batchSize;
    process.stdout.write(`\r   Migrated ${migrated}/${count || '?'} power rankings...`);
  }

  console.log(`\n✅ Migrated ${migrated} power rankings`);
}

async function migratePointByPoint() {
  const { count } = await supabase
    .from('point_by_point')
    .select('*', { count: 'exact', head: true });

  console.log(`Found ${count || 0} point by point entries`);

  const batchSize = 500;
  let offset = 0;
  let migrated = 0;

  while (true) {
    const { data: oldPBP, error } = await supabase
      .from('point_by_point')
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (error || !oldPBP || oldPBP.length === 0) break;

    const newRecords = oldPBP.map(p => ({
      match_id: p.match_id,
      set_number: p.set_number,
      game_number: p.game_number,
      point_number: p.point_index || 1,
      score_p1: p.home_point,
      score_p2: p.away_point,
      server: p.serving === 'home' ? 1 : p.serving === 'away' ? 2 : null,
      point_winner: p.point_winner === 'home' ? 1 : p.point_winner === 'away' ? 2 : null,
      is_ace: p.is_ace,
      is_double_fault: p.is_double_fault,
      point_description: p.point_description
    }));

    const { error: insertError } = await supabase
      .from('match_point_by_point_new')
      .upsert(newRecords, { onConflict: 'match_id,set_number,game_number,point_number' });

    if (!insertError) {
      migrated += newRecords.length;

      // Aggiorna data source
      const matchIds = [...new Set(oldPBP.map(p => p.match_id))];
      for (const matchId of matchIds) {
        await supabase
          .from('match_data_sources')
          .update({ has_point_by_point: true })
          .eq('match_id', matchId);
      }
    }

    offset += batchSize;
    process.stdout.write(`\r   Migrated ${migrated}/${count || '?'} point by point...`);
  }

  console.log(`\n✅ Migrated ${migrated} point by point entries`);
}

// Run migration
migrateData().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
