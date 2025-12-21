/**
 * Script per fare il merge di TUTTI i match xlsx con sofascore
 * e riorganizzare gli ID
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Normalizza nome per confronto
function normalizePlayerName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim();
}

// Estrai cognome
function getLastName(name) {
  if (!name) return '';
  const parts = normalizePlayerName(name).split(/\s+/);
  // Se formato "Cognome I." ritorna il cognome
  if (parts.length >= 1 && parts[parts.length - 1].match(/^[a-z]$/)) {
    return parts[0];
  }
  return parts[parts.length - 1];
}

// Confronta se due match sono gli stessi
function areMatchesSame(m1, m2) {
  const m1w = getLastName(m1.winner_name || m1.home_name);
  const m1l = getLastName(m1.loser_name || m1.away_name);
  const m2w = getLastName(m2.winner_name || m2.home_name);
  const m2l = getLastName(m2.loser_name || m2.away_name);
  
  return (m1w === m2w && m1l === m2l) || (m1w === m2l && m1l === m2w);
}

async function batchMergeAll() {
  console.log('🔄 Inizio batch merge di tutti i match...\n');
  
  // 1. Prendi tutti i match sofascore
  const { data: sofaMatches, error: err1 } = await supabase
    .from('matches')
    .select('*')
    .or('data_source.eq.sofascore,data_source.is.null')
    .not('home_player_id', 'is', null);
  
  if (err1) {
    console.error('Errore caricamento sofascore:', err1.message);
    return;
  }
  
  console.log(`📊 Match Sofascore da verificare: ${sofaMatches.length}`);
  
  let merged = 0;
  let deleted = 0;
  let errors = 0;
  
  for (const sofa of sofaMatches) {
    // Estrai nomi dal match sofascore
    let homeName = sofa.raw_json?.mapping?.home?.name || 
                   sofa.raw_json?.home?.name ||
                   sofa.winner_name;
    let awayName = sofa.raw_json?.mapping?.away?.name ||
                   sofa.raw_json?.away?.name ||
                   sofa.loser_name;
    
    if (!homeName && !awayName) continue;
    
    // Cerca xlsx corrispondente (±2 giorni)
    const matchDate = new Date(sofa.start_time);
    const startDate = new Date(matchDate);
    startDate.setDate(startDate.getDate() - 2);
    const endDate = new Date(matchDate);
    endDate.setDate(endDate.getDate() + 2);
    
    const { data: xlsxMatches } = await supabase
      .from('matches')
      .select('*')
      .in('data_source', ['xlsx_import', 'xlsx_2025'])
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());
    
    if (!xlsxMatches || xlsxMatches.length === 0) continue;
    
    // Trova match corrispondente
    const sofaForCompare = { winner_name: homeName, loser_name: awayName };
    
    for (const xlsx of xlsxMatches) {
      if (areMatchesSame(sofaForCompare, xlsx)) {
        // Merge i dati xlsx nel match sofascore
        const updateData = {
          winner_name: xlsx.winner_name || sofa.winner_name,
          loser_name: xlsx.loser_name || sofa.loser_name,
          winner_rank: xlsx.winner_rank,
          loser_rank: xlsx.loser_rank,
          winner_points: xlsx.winner_points,
          loser_points: xlsx.loser_points,
          w1: xlsx.w1, l1: xlsx.l1,
          w2: xlsx.w2, l2: xlsx.l2,
          w3: xlsx.w3, l3: xlsx.l3,
          w4: xlsx.w4, l4: xlsx.l4,
          w5: xlsx.w5, l5: xlsx.l5,
          odds_b365_winner: xlsx.odds_b365_winner,
          odds_b365_loser: xlsx.odds_b365_loser,
          odds_ps_winner: xlsx.odds_ps_winner,
          odds_ps_loser: xlsx.odds_ps_loser,
          odds_max_winner: xlsx.odds_max_winner,
          odds_max_loser: xlsx.odds_max_loser,
          odds_avg_winner: xlsx.odds_avg_winner,
          odds_avg_loser: xlsx.odds_avg_loser,
          location: xlsx.location || sofa.location,
          surface: xlsx.surface || sofa.surface,
          best_of: xlsx.best_of || sofa.best_of,
          series: xlsx.series || sofa.series,
          // Salva ID xlsx nel raw_json esistente
          raw_json: {
            ...sofa.raw_json,
            xlsx_original_id: xlsx.id
          },
          data_source: 'merged_sofascore_xlsx'
        };
        
        const { error: updateErr } = await supabase
          .from('matches')
          .update(updateData)
          .eq('id', sofa.id);
        
        if (updateErr) {
          console.error(`❌ Errore update ${sofa.id}:`, updateErr.message);
          errors++;
          continue;
        }
        
        // Elimina il duplicato xlsx
        const { error: deleteErr } = await supabase
          .from('matches')
          .delete()
          .eq('id', xlsx.id);
        
        if (deleteErr) {
          console.error(`❌ Errore delete ${xlsx.id}:`, deleteErr.message);
          errors++;
        } else {
          deleted++;
        }
        
        merged++;
        if (merged <= 10 || merged % 50 === 0) {
          console.log(`✅ Merged: ${homeName} vs ${awayName} (sofa:${sofa.id} + xlsx:${xlsx.id})`);
        }
        
        break; // Un solo match per sofascore
      }
    }
  }
  
  console.log(`\n========================================`);
  console.log(`✅ COMPLETATO!`);
  console.log(`   Match merged: ${merged}`);
  console.log(`   Xlsx eliminati: ${deleted}`);
  console.log(`   Errori: ${errors}`);
  console.log(`========================================\n`);
}

batchMergeAll().catch(console.error);
