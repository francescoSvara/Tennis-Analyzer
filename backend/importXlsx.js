/**
 * Script per importare dati storici tennis da file XLSX
 * 
 * USO:
 *   node importXlsx.js <percorso-file.xlsx>
 * 
 * ESEMPIO:
 *   node importXlsx.js ../data/atp_matches_2024.xlsx
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

// Configurazione Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Mappatura colonne XLSX -> colonne DB
// NOTA: I nomi delle colonne devono corrispondere ESATTAMENTE a quelli del file xlsx
const COLUMN_MAPPING = {
  // Info torneo
  'ATP': null, // indice, ignorato
  'WTA': null, // indice, ignorato
  'Location': 'location',
  'Tournament': 'tournament_name_temp', // verrà rimosso prima dell'insert
  'Date': 'start_time',
  'Series': 'series',
  'Court': 'court_type',
  'Surface': 'surface',
  'Round': 'round_name',
  'Best of': 'best_of',
  
  // Giocatori
  'Winner': 'winner_name',
  'Loser': 'loser_name',
  'WRank': 'winner_rank',
  'LRank': 'loser_rank',
  'WPts': 'winner_points',
  'LPts': 'loser_points',
  
  // Punteggi set
  'W1': 'w1',
  'L1': 'l1',
  'W2': 'w2',
  'L2': 'l2',
  'W3': 'w3',
  'L3': 'l3',
  'W4': 'w4',
  'L4': 'l4',
  'W5': 'w5',
  'L5': 'l5',
  'Wsets': 'winner_sets',
  'Lsets': 'loser_sets',
  
  // Commenti
  'Comment': 'comment',
  
  // Quote Bet365
  'B365W': 'odds_b365_winner',
  'B365L': 'odds_b365_loser',
  
  // Quote Pinnacle
  'PSW': 'odds_ps_winner',
  'PSL': 'odds_ps_loser',
  
  // Quote Max
  'MaxW': 'odds_max_winner',
  'MaxL': 'odds_max_loser',
  
  // Quote Average
  'AvgW': 'odds_avg_winner',
  'AvgL': 'odds_avg_loser',
  
  // Betfair Exchange
  'BFEW': 'odds_bfe_winner',
  'BFEL': 'odds_bfe_loser',
};

/**
 * Converte una data dal formato xlsx a ISO
 */
function parseDate(dateValue) {
  if (!dateValue) return null;
  
  // Se è un numero (Excel serial date)
  if (typeof dateValue === 'number') {
    const date = XLSX.SSF.parse_date_code(dateValue);
    return new Date(date.y, date.m - 1, date.d).toISOString();
  }
  
  // Se è una stringa (es: "29/12/2024")
  if (typeof dateValue === 'string') {
    // Prova formato DD/MM/YYYY
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(year, month - 1, day).toISOString();
    }
    // Prova formato ISO
    return new Date(dateValue).toISOString();
  }
  
  return null;
}

/**
 * Genera un ID univoco per match importati
 */
function generateMatchId(row, index) {
  const date = row.start_time || new Date().toISOString();
  const winner = (row.winner_name || 'unknown').toLowerCase().replace(/[^a-z]/g, '');
  const loser = (row.loser_name || 'unknown').toLowerCase().replace(/[^a-z]/g, '');
  const hash = `${date}_${winner}_${loser}_${index}`;
  // Crea un ID numerico dal hash
  let id = 0;
  for (let i = 0; i < hash.length; i++) {
    id = ((id << 5) - id) + hash.charCodeAt(i);
    id = id & id; // Convert to 32bit integer
  }
  return Math.abs(id);
}

/**
 * Converte una riga xlsx in un record per il DB
 */
function convertRow(row, index, allColumns) {
  const record = {
    data_source: 'xlsx_import',
    extracted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Mappa ogni colonna - cerca match case-insensitive e con trim
  for (const [xlsxCol, dbCol] of Object.entries(COLUMN_MAPPING)) {
    if (!dbCol) continue;
    
    // Cerca la colonna nel row (case-insensitive)
    let value = row[xlsxCol];
    if (value === undefined) {
      // Prova a cercare con trim e case-insensitive
      const matchingKey = allColumns.find(k => k.trim().toLowerCase() === xlsxCol.toLowerCase());
      if (matchingKey) {
        value = row[matchingKey];
      }
    }
    
    if (value === undefined) continue;
    
    // Conversioni specifiche
    if (dbCol === 'start_time') {
      value = parseDate(value);
    } else if (dbCol === 'best_of' || dbCol.includes('rank') || dbCol.includes('points') ||
               (dbCol.match(/^[wl]\d$/) || dbCol.includes('sets'))) {
      value = value ? parseInt(value, 10) : null;
      if (isNaN(value)) value = null;
    } else if (dbCol.startsWith('odds_')) {
      value = value ? parseFloat(value) : null;
      if (isNaN(value)) value = null;
    } else if (typeof value === 'string') {
      value = value.trim();
    }
    
    record[dbCol] = value;
  }
  
  // Rimuovi campi temporanei che non esistono nel DB
  delete record.tournament_name_temp;
  
  // Genera ID se non presente
  record.id = generateMatchId(record, index);
  
  // Determina winner_code (1 = home wins, 2 = away wins)
  record.winner_code = 1;
  
  // Crea uno slug
  const winnerSlug = (record.winner_name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const loserSlug = (record.loser_name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
  record.slug = `${winnerSlug}-vs-${loserSlug}`;
  
  // Status per match completati
  record.status_type = 'finished';
  record.status_description = record.comment || 'Completed';
  
  return record;
}

/**
 * Importa il file xlsx nel database
 */
async function importXlsx(filePath) {
  console.log(`\n📂 Lettura file: ${filePath}\n`);
  
  // Leggi il file xlsx
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Converti in array di oggetti
  const rows = XLSX.utils.sheet_to_json(worksheet);
  console.log(`📊 Trovate ${rows.length} righe nel foglio "${sheetName}"\n`);
  
  if (rows.length === 0) {
    console.log('❌ Nessun dato trovato nel file');
    return;
  }
  
  // Mostra colonne rilevate
  const columns = Object.keys(rows[0]);
  console.log('📋 Colonne rilevate:', columns.join(', '));
  
  // Verifica colonne riconosciute
  const recognizedCols = columns.filter(c => COLUMN_MAPPING[c] !== undefined);
  const unknownCols = columns.filter(c => COLUMN_MAPPING[c] === undefined);
  console.log(`✅ Colonne riconosciute (${recognizedCols.length}):`, recognizedCols.join(', '));
  if (unknownCols.length > 0) {
    console.log(`⚠️ Colonne non mappate (${unknownCols.length}):`, unknownCols.join(', '));
  }
  
  // Debug: mostra prima riga raw per vedere i valori
  console.log('\n🔍 Prima riga raw dal file:');
  console.log(JSON.stringify(rows[0], null, 2));
  
  // Converti tutte le righe
  console.log('\n🔄 Conversione righe in corso...');
  const records = rows.map((row, index) => convertRow(row, index, columns));
  
  // Mostra esempio del primo record
  console.log('\n📝 Esempio primo record convertito:');
  console.log(JSON.stringify(records[0], null, 2));
  
  // Importa in batch
  const BATCH_SIZE = 100;
  let imported = 0;
  let errors = 0;
  
  console.log(`\n🚀 Importazione in corso (batch di ${BATCH_SIZE})...\n`);
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    const { data, error } = await supabase
      .from('matches')
      .upsert(batch, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`❌ Errore batch ${i}-${i + batch.length}:`, error.message);
      errors += batch.length;
    } else {
      imported += batch.length;
      process.stdout.write(`\r✅ Importati: ${imported}/${records.length} (${Math.round(imported/records.length*100)}%)`);
    }
  }
  
  console.log('\n\n📊 RIEPILOGO IMPORTAZIONE:');
  console.log(`   ✅ Importati con successo: ${imported}`);
  console.log(`   ❌ Errori: ${errors}`);
  console.log(`   📁 Totale righe file: ${records.length}`);
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           IMPORT DATI STORICI TENNIS DA XLSX                  ║
╠═══════════════════════════════════════════════════════════════╣
║  USO:                                                         ║
║    node importXlsx.js <percorso-file.xlsx>                    ║
║                                                               ║
║  ESEMPIO:                                                     ║
║    node importXlsx.js ../data/atp_matches_2024.xlsx           ║
║                                                               ║
║  COLONNE SUPPORTATE:                                          ║
║    ATP, Location, Tournament, Date, Series, Court, Surface,   ║
║    Round, Best of, Winner, Loser, WRank, LRank, WPts, LPts,   ║
║    W1-W5, L1-L5, Wsets, Lsets, Comment,                       ║
║    B365W, B365L, PSW, PSL, MaxW, MaxL, AvgW, AvgL, BFEW, BFEL ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

const filePath = path.resolve(args[0]);
importXlsx(filePath)
  .then(() => console.log('\n✨ Importazione completata!'))
  .catch(err => console.error('\n💥 Errore fatale:', err));
