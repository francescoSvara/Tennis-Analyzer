/**
 * Script per trovare e rimuovere TUTTI i duplicati nel database
 * Indipendentemente dalla fonte (sofascore, xlsx, merged)
 *
 * Criteri di duplicato:
 * - Stessi giocatori (per cognome)
 * - Stessa data (±1 giorno)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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
  if (parts.length === 0) return '';
  // Se formato "Cognome I." ritorna il cognome
  if (parts.length >= 2 && parts[parts.length - 1].match(/^[a-z]$/)) {
    return parts[0];
  }
  return parts[parts.length - 1];
}

// Crea chiave univoca per un match (giocatori ordinati + data)
function createMatchKey(match) {
  // Estrai nomi giocatori
  let player1 = '';
  let player2 = '';

  // Da campi diretti
  if (match.winner_name && match.loser_name) {
    player1 = getLastName(match.winner_name);
    player2 = getLastName(match.loser_name);
  } else if (match.home_name && match.away_name) {
    player1 = getLastName(match.home_name);
    player2 = getLastName(match.away_name);
  }

  // Da raw_json se disponibile
  if (!player1 || !player2) {
    const raw = match.raw_json || {};
    const home = raw.homeTeam?.name || raw.home?.name || raw.mapping?.home?.name || '';
    const away = raw.awayTeam?.name || raw.away?.name || raw.mapping?.away?.name || '';
    if (home) player1 = getLastName(home);
    if (away) player2 = getLastName(away);
  }

  if (!player1 || !player2) return null;

  // Ordina i nomi alfabeticamente per chiave consistente
  const players = [player1, player2].sort();

  // Estrai data (solo giorno)
  const dateStr = match.start_time ? match.start_time.split('T')[0] : '';
  if (!dateStr) return null;

  return `${players[0]}_${players[1]}_${dateStr}`;
}

// Calcola "qualità" del match per decidere quale tenere
function calculateMatchQuality(match) {
  let score = 0;

  // Preferisci match con più dati sofascore (hanno player_id, raw_json.api, etc.)
  if (match.home_player_id) score += 10;
  if (match.away_player_id) score += 10;
  if (match.raw_json?.api) score += 20;
  if (match.raw_json?.statistics) score += 15;
  if (match.raw_json?.pointByPoint) score += 15;
  if (match.raw_json?.powerRankings) score += 10;

  // Dati xlsx aggiuntivi
  if (match.odds_b365_winner) score += 5;
  if (match.winner_rank) score += 5;
  if (match.loser_rank) score += 5;
  if (match.w1 !== null) score += 3; // punteggi set

  // Match già merged hanno già i dati combinati
  if (match.data_source === 'merged_sofascore_xlsx') score += 25;

  // Status chiaro
  if (match.status_type === 'finished') score += 5;
  if (match.winner_code) score += 5;

  return score;
}

async function deduplicateAll() {
  console.log('🔍 Ricerca TUTTI i duplicati nel database...\n');

  // 1. Carica TUTTI i match (con paginazione per superare limite 1000)
  let allMatches = [];
  let offset = 0;
  const pageSize = 1000;

  /* eslint-disable-next-line no-constant-condition */
  while (true) {
    const { data: page, error } = await supabase
      .from('matches')
      .select('*')
      .order('start_time', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('❌ Errore caricamento:', error.message);
      return;
    }

    if (!page || page.length === 0) break;

    allMatches = [...allMatches, ...page];
    console.log(`   Caricati ${allMatches.length} match...`);

    if (page.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`📊 Totale match nel DB: ${allMatches.length}`);

  // 2. Raggruppa per chiave (giocatori + data)
  const matchGroups = new Map();
  let skipped = 0;

  for (const match of allMatches) {
    const key = createMatchKey(match);
    if (!key) {
      skipped++;
      continue;
    }

    if (!matchGroups.has(key)) {
      matchGroups.set(key, []);
    }
    matchGroups.get(key).push(match);
  }

  console.log(`📊 Match con chiave valida: ${allMatches.length - skipped}`);
  console.log(`📊 Gruppi unici: ${matchGroups.size}`);
  console.log(`⚠️ Match senza chiave (skipped): ${skipped}\n`);

  // 3. Trova gruppi con duplicati
  const duplicateGroups = [];
  for (const [key, matches] of matchGroups) {
    if (matches.length > 1) {
      duplicateGroups.push({ key, matches });
    }
  }

  console.log(`🔄 Gruppi con duplicati: ${duplicateGroups.length}\n`);

  if (duplicateGroups.length === 0) {
    console.log('✅ Nessun duplicato trovato!');
    return;
  }

  // 4. Mostra e processa duplicati
  let merged = 0;
  let deleted = 0;
  let errors = 0;

  for (const group of duplicateGroups) {
    console.log(`\n📋 Duplicato: ${group.key}`);

    // Calcola qualità per ogni match
    const withQuality = group.matches.map((m) => ({
      match: m,
      quality: calculateMatchQuality(m),
    }));

    // Ordina per qualità (il migliore primo)
    withQuality.sort((a, b) => b.quality - a.quality);

    const best = withQuality[0];
    const toDelete = withQuality.slice(1);

    console.log(
      `   ⭐ Tengo: ID ${best.match.id} (${best.match.data_source}, quality: ${best.quality})`
    );

    // Mostra quali verranno eliminati
    for (const dup of toDelete) {
      console.log(
        `   🗑️  Elimino: ID ${dup.match.id} (${dup.match.data_source}, quality: ${dup.quality})`
      );
    }

    // Merge dei dati migliori nel record che teniamo
    const mergeData = {};
    let hasXlsxData = false;
    let hasSofaData = false;

    // Raccogli dati da tutti i duplicati
    for (const dup of toDelete) {
      const m = dup.match;

      // Dati xlsx
      if (m.odds_b365_winner && !best.match.odds_b365_winner) {
        mergeData.odds_b365_winner = m.odds_b365_winner;
        hasXlsxData = true;
      }
      if (m.odds_ps_winner && !best.match.odds_ps_winner) {
        mergeData.odds_ps_winner = m.odds_ps_winner;
        hasXlsxData = true;
      }
      if (m.winner_rank && !best.match.winner_rank) {
        mergeData.winner_rank = m.winner_rank;
        hasXlsxData = true;
      }
      if (m.loser_rank && !best.match.loser_rank) {
        mergeData.loser_rank = m.loser_rank;
        hasXlsxData = true;
      }
      if (m.w1 !== null && best.match.w1 === null) {
        mergeData.w1 = m.w1;
        mergeData.l1 = m.l1;
        mergeData.w2 = m.w2;
        mergeData.l2 = m.l2;
        mergeData.w3 = m.w3;
        mergeData.l3 = m.l3;
        mergeData.w4 = m.w4;
        mergeData.l4 = m.l4;
        mergeData.w5 = m.w5;
        mergeData.l5 = m.l5;
        hasXlsxData = true;
      }

      // Dati Sofascore
      if (m.home_player_id && !best.match.home_player_id) {
        mergeData.home_player_id = m.home_player_id;
        hasSofaData = true;
      }
      if (m.away_player_id && !best.match.away_player_id) {
        mergeData.away_player_id = m.away_player_id;
        hasSofaData = true;
      }
      if (m.status_type && !best.match.status_type) {
        mergeData.status_type = m.status_type;
        mergeData.status_code = m.status_code;
        mergeData.status_description = m.status_description;
      }
      if (m.winner_code && !best.match.winner_code) {
        mergeData.winner_code = m.winner_code;
      }

      // Merge raw_json
      if (m.raw_json) {
        const bestRaw = best.match.raw_json || {};
        const dupRaw = m.raw_json;

        if (dupRaw.api && !bestRaw.api) {
          mergeData.raw_json = { ...bestRaw, api: dupRaw.api };
          hasSofaData = true;
        }
        if (dupRaw.statistics && !bestRaw.statistics) {
          mergeData.raw_json = {
            ...(mergeData.raw_json || bestRaw),
            statistics: dupRaw.statistics,
          };
        }
        if (dupRaw.pointByPoint && !bestRaw.pointByPoint) {
          mergeData.raw_json = {
            ...(mergeData.raw_json || bestRaw),
            pointByPoint: dupRaw.pointByPoint,
          };
        }

        // Salva xlsx_original_id se presente
        if (dupRaw.xlsx_original_id || m.data_source?.includes('xlsx')) {
          const existingRaw = mergeData.raw_json || best.match.raw_json || {};
          mergeData.raw_json = {
            ...existingRaw,
            xlsx_original_id: dupRaw.xlsx_original_id || m.id,
          };
        }
      }
    }

    // Determina data_source finale
    if (hasXlsxData && hasSofaData) {
      mergeData.data_source = 'merged_sofascore_xlsx';
    } else if (hasXlsxData && best.match.data_source?.includes('sofa')) {
      mergeData.data_source = 'merged_sofascore_xlsx';
    } else if (hasSofaData && best.match.data_source?.includes('xlsx')) {
      mergeData.data_source = 'merged_sofascore_xlsx';
    }

    // Aggiorna record migliore con dati merged
    if (Object.keys(mergeData).length > 0) {
      const { error: updateErr } = await supabase
        .from('matches')
        .update(mergeData)
        .eq('id', best.match.id);

      if (updateErr) {
        console.log(`   ❌ Errore update: ${updateErr.message}`);
        errors++;
        continue;
      }
      merged++;
    }

    // Elimina duplicati
    const idsToDelete = toDelete.map((d) => d.match.id);
    const { error: deleteErr } = await supabase.from('matches').delete().in('id', idsToDelete);

    if (deleteErr) {
      console.log(`   ❌ Errore delete: ${deleteErr.message}`);
      errors++;
    } else {
      deleted += idsToDelete.length;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 RIEPILOGO DEDUPLICAZIONE');
  console.log('='.repeat(50));
  console.log(`✅ Gruppi processati: ${duplicateGroups.length}`);
  console.log(`🔗 Match merged: ${merged}`);
  console.log(`🗑️  Match eliminati: ${deleted}`);
  console.log(`❌ Errori: ${errors}`);

  // Verifica finale
  const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true });

  console.log(`\n📊 Match rimanenti nel DB: ${count}`);
}

// Esegui
deduplicateAll().catch(console.error);
