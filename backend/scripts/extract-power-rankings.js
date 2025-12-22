/**
 * Script per estrarre i powerRankings dal raw_json e popolarli nella tabella power_rankings
 * Uso: node scripts/extract-power-rankings.js [--dry-run] [--limit N]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit'));
const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1]) : null;

/**
 * Estrae powerRankings da una struttura raw_json
 */
function extractPowerRankings(rawJson) {
  if (!rawJson) return [];
  
  // Cerca nelle chiavi API
  if (rawJson.api) {
    for (const [url, data] of Object.entries(rawJson.api)) {
      // Cerca endpoint tennis-power o tennis-power-rankings
      if (url.includes('tennis-power') && data) {
        if (data.tennisPowerRankings && Array.isArray(data.tennisPowerRankings)) {
          return data.tennisPowerRankings;
        }
        if (data.powerRankings && Array.isArray(data.powerRankings)) {
          return data.powerRankings;
        }
        // Se il data stesso è un array di power rankings
        if (Array.isArray(data) && data.length > 0 && data[0].value !== undefined) {
          return data;
        }
      }
    }
  }
  
  // Cerca al top level
  if (rawJson.tennisPowerRankings && Array.isArray(rawJson.tennisPowerRankings)) {
    return rawJson.tennisPowerRankings;
  }
  if (rawJson.powerRankings && Array.isArray(rawJson.powerRankings)) {
    return rawJson.powerRankings;
  }
  
  return [];
}

/**
 * Estrae statistics da una struttura raw_json
 */
function extractStatistics(rawJson) {
  if (!rawJson) return [];
  
  if (rawJson.api) {
    for (const [url, data] of Object.entries(rawJson.api)) {
      if (url.includes('/statistics') && data) {
        if (data.statistics && Array.isArray(data.statistics)) {
          return data.statistics;
        }
        if (Array.isArray(data)) {
          return data;
        }
      }
    }
  }
  
  if (rawJson.statistics && Array.isArray(rawJson.statistics)) {
    return rawJson.statistics;
  }
  
  return [];
}

/**
 * Estrae pointByPoint da una struttura raw_json
 */
function extractPointByPoint(rawJson) {
  if (!rawJson) return [];
  
  if (rawJson.api) {
    for (const [url, data] of Object.entries(rawJson.api)) {
      if (url.includes('point-by-point') && data) {
        if (data.pointByPoint && Array.isArray(data.pointByPoint)) {
          return data.pointByPoint;
        }
        if (Array.isArray(data)) {
          return data;
        }
      }
    }
  }
  
  if (rawJson.pointByPoint && Array.isArray(rawJson.pointByPoint)) {
    return rawJson.pointByPoint;
  }
  
  return [];
}

async function main() {
  console.log('🔍 Estrazione PowerRankings da raw_json...');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (limit) console.log(`   Limit: ${limit} matches`);
  
  // Fetch match con raw_json
  let query = supabase
    .from('matches')
    .select('id, raw_json, winner_name, loser_name')
    .not('raw_json', 'is', null);
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data: matches, error } = await query;
  
  if (error) {
    console.error('❌ Errore fetch matches:', error.message);
    process.exit(1);
  }
  
  console.log(`📦 Trovati ${matches.length} match con raw_json`);
  
  let extractedCount = 0;
  let insertedCount = 0;
  let statsExtracted = 0;
  let pbpExtracted = 0;
  
  for (const match of matches) {
    const rawJson = typeof match.raw_json === 'string' 
      ? JSON.parse(match.raw_json) 
      : match.raw_json;
    
    // Estrai powerRankings
    const powerRankings = extractPowerRankings(rawJson);
    const statistics = extractStatistics(rawJson);
    const pointByPoint = extractPointByPoint(rawJson);
    
    if (powerRankings.length > 0) {
      extractedCount++;
      console.log(`✅ Match ${match.id} (${match.winner_name} vs ${match.loser_name}): ${powerRankings.length} powerRankings`);
      
      if (!dryRun) {
        // Inserisci nella tabella power_rankings
        const prRecords = powerRankings.map((pr, idx) => ({
          match_id: match.id,
          set_number: pr.set || 1,
          game_number: pr.game || idx + 1,
          value: pr.value || 0,
          break_occurred: pr.breakOccurred || false,
          zone: pr.zone || null,
          status: pr.status || null
        }));
        
        // Prima elimina eventuali vecchi record
        await supabase.from('power_rankings').delete().eq('match_id', match.id);
        
        // Inserisci nuovi
        const { error: insertError } = await supabase
          .from('power_rankings')
          .insert(prRecords);
        
        if (insertError) {
          console.error(`   ❌ Errore inserimento: ${insertError.message}`);
        } else {
          insertedCount++;
        }
      }
    }
    
    if (statistics.length > 0) {
      statsExtracted++;
    }
    if (pointByPoint.length > 0) {
      pbpExtracted++;
    }
  }
  
  console.log('\n📊 Riepilogo:');
  console.log(`   Match analizzati: ${matches.length}`);
  console.log(`   PowerRankings trovati: ${extractedCount}`);
  console.log(`   Statistics trovate: ${statsExtracted}`);
  console.log(`   PointByPoint trovati: ${pbpExtracted}`);
  if (!dryRun) {
    console.log(`   Inseriti in DB: ${insertedCount}`);
  }
}

main().catch(console.error);
