/**
 * Script per arricchire in batch i match nel DB con dati da SofaScore
 * Uso: node scripts/enrich-matches.js [--limit N] [--dry-run] [--source sofascore]
 *
 * Questo script:
 * 1. Trova match nel DB che potrebbero avere dati mancanti
 * 2. Fetch dati freschi da SofaScore per ciascuno
 * 3. Salva powerRankings, statistics, pointByPoint nelle tabelle dedicate
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit'));
const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1]) : 20;
const sourceArg = args.find((a) => a.startsWith('--source'));
const source = sourceArg ? sourceArg.split('=')[1] || args[args.indexOf('--source') + 1] : null;

const SOFASCORE_API = 'https://api.sofascore.com/api/v1/event';
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.sofascore.com/',
};

/**
 * Fetch completo dati da SofaScore
 */
async function fetchSofaScoreData(eventId) {
  const result = {
    powerRankings: [],
    statistics: [],
    pointByPoint: [],
    errors: [],
  };

  try {
    // Power Rankings
    const prRes = await fetch(`${SOFASCORE_API}/${eventId}/tennis-power-rankings`, { headers });
    if (prRes.ok) {
      const prData = await prRes.json();
      result.powerRankings = prData?.tennisPowerRankings || [];
    }
  } catch (e) {
    result.errors.push({ endpoint: 'power-rankings', error: e.message });
  }

  try {
    // Statistics
    const statsRes = await fetch(`${SOFASCORE_API}/${eventId}/statistics`, { headers });
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      result.statistics = statsData?.statistics || [];
    }
  } catch (e) {
    result.errors.push({ endpoint: 'statistics', error: e.message });
  }

  try {
    // Point by Point
    const pbpRes = await fetch(`${SOFASCORE_API}/${eventId}/point-by-point`, { headers });
    if (pbpRes.ok) {
      const pbpData = await pbpRes.json();
      result.pointByPoint = pbpData?.pointByPoint || [];
    }
  } catch (e) {
    result.errors.push({ endpoint: 'point-by-point', error: e.message });
  }

  return result;
}

/**
 * Salva powerRankings nel DB
 */
async function savePowerRankings(matchId, powerRankings) {
  if (!powerRankings || powerRankings.length === 0) return 0;

  // Elimina vecchi record
  await supabase.from('power_rankings').delete().eq('match_id', matchId);

  // Prepara nuovi record
  const records = powerRankings.map((pr, idx) => ({
    match_id: matchId,
    set_number: pr.set || 1,
    game_number: pr.game || idx + 1,
    value: pr.value || 0,
    break_occurred: pr.breakOccurred || false,
    zone: pr.zone || null,
    status: pr.status || null,
  }));

  const { error } = await supabase.from('power_rankings').insert(records);
  if (error) {
    console.error(`   ❌ Errore salvataggio PR: ${error.message}`);
    return 0;
  }
  return records.length;
}

async function main() {
  console.log('🔄 Arricchimento Match da SofaScore...');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Limit: ${limit} matches`);
  if (source) console.log(`   Source filter: ${source}`);

  // Trova match SofaScore che potrebbero avere dati
  let query = supabase
    .from('matches')
    .select('id, winner_name, loser_name, data_source, surface')
    .order('id', { ascending: false })
    .limit(limit);

  if (source) {
    query = query.eq('data_source', source);
  }

  const { data: matches, error } = await query;

  if (error) {
    console.error('❌ Errore fetch matches:', error.message);
    process.exit(1);
  }

  console.log(`📦 Trovati ${matches.length} match da processare\n`);

  // Controlla quali hanno già powerRankings
  const { data: existingPR } = await supabase
    .from('power_rankings')
    .select('match_id')
    .in(
      'match_id',
      matches.map((m) => m.id)
    );

  const existingPRIds = new Set((existingPR || []).map((p) => p.match_id));

  const results = {
    total: matches.length,
    skippedExisting: 0,
    enriched: 0,
    noData: 0,
    errors: [],
  };

  for (const match of matches) {
    // Salta se ha già powerRankings
    if (existingPRIds.has(match.id)) {
      console.log(`⏭️  Match ${match.id} (${match.winner_name}) - già ha PR`);
      results.skippedExisting++;
      continue;
    }

    console.log(`🔍 Match ${match.id} (${match.winner_name} vs ${match.loser_name})...`);

    if (dryRun) {
      console.log(`   [DRY RUN] Skip fetch`);
      continue;
    }

    try {
      const sofaData = await fetchSofaScoreData(match.id);

      if (sofaData.powerRankings.length > 0) {
        const saved = await savePowerRankings(match.id, sofaData.powerRankings);
        console.log(`   ✅ Salvati ${saved} powerRankings`);
        results.enriched++;
      } else {
        console.log(`   ⚠️  Nessun powerRanking disponibile`);
        results.noData++;
      }

      // Rate limiting
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      console.error(`   ❌ Errore: ${e.message}`);
      results.errors.push({ matchId: match.id, error: e.message });
    }
  }

  console.log('\n📊 Riepilogo:');
  console.log(`   Processati: ${results.total}`);
  console.log(`   Già con dati: ${results.skippedExisting}`);
  console.log(`   Arricchiti: ${results.enriched}`);
  console.log(`   Senza dati SofaScore: ${results.noData}`);
  console.log(`   Errori: ${results.errors.length}`);
}

main().catch(console.error);
