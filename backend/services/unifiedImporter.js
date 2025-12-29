/**
 * UNIFIED IMPORTER SERVICE
 *
 * Gateway unico per QUALSIASI dato in ingresso:
 * - Scrape Sofascore (JSON)
 * - API live
 * - Qualsiasi altra fonte
 *
 * TUTTO passa per dataNormalizer prima di entrare nel DB
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const {
  normalizePlayerName,
  normalizeSurface,
  normalizeTournament,
  normalizeDate,
  generateMatchFingerprint,
  mergeMatches,
  areMatchesSame,
} = require('./dataNormalizer');
const { createLogger } = require('../utils/logger');

const logger = createLogger('UnifiedImporter');

// ============================================
// SUPABASE CLIENT
// ============================================

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Usa SERVICE_KEY per bypassare RLS
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

/**
 * Genera un ID unico numerico per match xlsx (non ha ID Sofascore)
 * Usa hash numerico basato su data + giocatori
 */
function generateXlsxId(date, winner, loser) {
  const str = `${date}_${winner}_${loser}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Rendi positivo e aggiungi prefisso per xlsx (900000000000+)
  return Math.abs(hash) + 900000000000;
}

// ============================================
// STATISTICHE IMPORT
// ============================================

const stats = {
  processed: 0,
  inserted: 0,
  updated: 0,
  duplicates: 0,
  errors: 0,
  source: '',
};

function resetStats() {
  stats.processed = 0;
  stats.inserted = 0;
  stats.updated = 0;
  stats.duplicates = 0;
  stats.errors = 0;
  stats.source = '';
}

// ============================================
// CORE: CHECK E INSERT MATCH
// ============================================

/**
 * Controlla se un match esiste giÃ  nel DB
 * Usa data + nomi giocatori normalizzati per check
 * @param {string} matchDate - Data match
 * @param {string} winnerName - Nome vincitore normalizzato
 * @param {string} loserName - Nome perdente normalizzato
 * @returns {Object|null} Match esistente o null
 */
async function findExistingMatch(matchDate, winnerName, loserName) {
  if (!supabase) return null;

  // Cerca match con stessa data e stessi giocatori (in qualsiasi ordine)
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('match_date', matchDate)
    .or(
      `and(winner_name.eq.${winnerName},loser_name.eq.${loserName}),and(winner_name.eq.${loserName},loser_name.eq.${winnerName})`
    )
    .limit(1);

  if (error) {
    // Fallback: cerca solo per data e un giocatore
    const { data: fallbackData } = await supabase
      .from('matches')
      .select('*')
      .eq('match_date', matchDate)
      .or(
        `winner_name.ilike.%${winnerName.split(' ').pop()}%,loser_name.ilike.%${winnerName
          .split(' ')
          .pop()}%`
      )
      .limit(5);

    // Check manuale
    if (fallbackData) {
      for (const m of fallbackData) {
        if (
          areMatchesSame(
            { date: matchDate, winner_name: winnerName, loser_name: loserName },
            { date: m.match_date, winner_name: m.winner_name, loser_name: m.loser_name }
          )
        ) {
          return m;
        }
      }
    }
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

/**
 * Inserisce o aggiorna un match nel DB
 * FUNZIONE PRINCIPALE - tutto passa da qui
 */
async function upsertMatch(matchData, source = 'unknown') {
  stats.processed++;

  // 1. Normalizza tutti i campi
  const startTime = normalizeDate(matchData.match_date || matchData.Date || matchData.date);
  const winnerName = normalizePlayerName(matchData.winner_name || matchData.Winner || '');
  const loserName = normalizePlayerName(matchData.loser_name || matchData.Loser || '');

  // Genera ID per xlsx data
  const matchId = matchData.id || generateXlsxId(startTime, winnerName, loserName);

  const normalized = {
    // ID (required)
    id: matchId,

    // Giocatori
    winner_name: winnerName,
    loser_name: loserName,

    // Data - usa start_time come nella tabella
    start_time: startTime ? new Date(startTime).toISOString() : null,

    // Location/Tournament
    location: matchData.tournament || matchData.Tournament || matchData.location || '',
    series: matchData.series || matchData.Series || '',

    // Superficie
    surface: normalizeSurface(matchData.surface || matchData.Surface || ''),

    // Risultato
    comment: matchData.score || matchData.Comment || '',
    winner_sets: matchData.winner_sets || matchData.Wsets || null,
    loser_sets: matchData.loser_sets || matchData.Lsets || null,

    // Set scores
    w1: matchData.w1 || matchData.W1 || null,
    l1: matchData.l1 || matchData.L1 || null,
    w2: matchData.w2 || matchData.W2 || null,
    l2: matchData.l2 || matchData.L2 || null,
    w3: matchData.w3 || matchData.W3 || null,
    l3: matchData.l3 || matchData.L3 || null,
    w4: matchData.w4 || matchData.W4 || null,
    l4: matchData.l4 || matchData.L4 || null,
    w5: matchData.w5 || matchData.W5 || null,
    l5: matchData.l5 || matchData.L5 || null,

    // Ranking
    winner_rank: matchData.winner_rank || matchData.WRank || null,
    loser_rank: matchData.loser_rank || matchData.LRank || null,
    winner_points: matchData.winner_points || matchData.WPts || null,
    loser_points: matchData.loser_points || matchData.LPts || null,

    // Quote Bet365
    odds_b365_winner: matchData.odds_b365_winner || matchData.B365W || null,
    odds_b365_loser: matchData.odds_b365_loser || matchData.B365L || null,

    // Quote Pinnacle
    odds_ps_winner: matchData.odds_ps_winner || matchData.PSW || null,
    odds_ps_loser: matchData.odds_ps_loser || matchData.PSL || null,

    // Quote Max/Avg
    odds_max_winner: matchData.odds_max_winner || matchData.MaxW || null,
    odds_max_loser: matchData.odds_max_loser || matchData.MaxL || null,
    odds_avg_winner: matchData.odds_avg_winner || matchData.AvgW || null,
    odds_avg_loser: matchData.odds_avg_loser || matchData.AvgL || null,

    // Round/Best of
    round_name: matchData.round || matchData.Round || '',
    best_of: matchData.best_of || matchData['Best of'] || 3,

    // Sorgente dati
    data_source: source,

    // Timestamp
    updated_at: new Date().toISOString(),
  };

  // 2. Upsert (insert o update se esiste)
  const { data, error } = await supabase
    .from('matches')
    .upsert(normalized, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error(`âŒ Error upserting match ${matchId}:`, error.message);
    stats.errors++;
    return null;
  }

  stats.inserted++;
  return data;
}

// ============================================
// IMPORT SOFASCORE JSON
// ============================================

/**
 * Importa un file JSON di Sofascore
 */
async function importSofascoreJson(filePath, options = {}) {
  const { dryRun = false, verbose = false } = options;

  logger.debug(`Importing Sofascore: ${path.basename(filePath)}`);

  if (!fs.existsSync(filePath)) {
    logger.error(`File not found: ${filePath}`);
    return null;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Struttura Sofascore puÃ² variare
  const event = data.event || data;

  if (!event) {
    logger.warn('Invalid structure, skipping');
    return null;
  }

  // Estrai dati dal formato Sofascore
  const matchData = {
    winner_name: event.winnerCode === 1 ? event.homeTeam?.name : event.awayTeam?.name,
    loser_name: event.winnerCode === 1 ? event.awayTeam?.name : event.homeTeam?.name,
    date: event.startTimestamp ? new Date(event.startTimestamp * 1000).toISOString() : null,
    tournament: event.tournament?.name || '',
    surface: event.groundType || '',
    score:
      event.homeScore && event.awayScore
        ? `${event.homeScore.display || ''} - ${event.awayScore.display || ''}`
        : '',
    series: event.tournament?.category?.name || '',
    round: event.roundInfo?.name || '',
    sofascore_id: event.id,
  };

  if (verbose) {
    logger.debug(`${matchData.winner_name} vs ${matchData.loser_name}`);
    logger.debug(`Tournament: ${matchData.tournament}`);
  }

  if (dryRun) {
    stats.processed++;
    return matchData;
  }

  return await upsertMatch(matchData, 'sofascore');
}

/**
 * Importa tutti i JSON da una cartella
 */
async function importSofascoreFolder(folderPath, options = {}) {
  logger.info('IMPORTING SOFASCORE FOLDER');
  logger.info(`Folder: ${folderPath}`);

  resetStats();
  stats.source = 'sofascore';

  if (!fs.existsSync(folderPath)) {
    logger.error(`Folder not found: ${folderPath}`);
    return stats;
  }

  const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.json'));
  logger.info(`Found ${files.length} JSON files`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await importSofascoreJson(path.join(folderPath, file), options);

    if ((i + 1) % 50 === 0) {
      logger.info(`Progress: ${i + 1}/${files.length}`);
    }
  }

  printStats();
  return stats;
}

// ============================================
// UTILITY
// ============================================

function printStats() {
  logger.info(
    `IMPORT SUMMARY - Source: ${stats.source}, Processed: ${stats.processed}, Inserted: ${stats.inserted}, Updated: ${stats.updated}, Duplicates: ${stats.duplicates}, Errors: ${stats.errors}`
  );
}

/**
 * Controlla quanti match ci sono nel DB
 */
async function getMatchCount() {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true });

  return count || 0;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Core
  upsertMatch,
  findExistingMatch,

  // Import
  importSofascoreJson,
  importSofascoreFolder,

  // Utility
  getMatchCount,
  resetStats,

  // Stats
  getStats: () => ({ ...stats }),
};

// ============================================
// CLI
// ============================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  (async () => {
    switch (command) {
      case 'sofascore': {
        const sofaPath = args[1] || path.join(__dirname, '../../data/scrapes');
        await importSofascoreFolder(sofaPath, {
          dryRun: args.includes('--dry-run'),
          verbose: args.includes('--verbose'),
        });
        break;
      }

      case 'count': {
        const count = await getMatchCount();
        console.log(`Total matches in DB: ${count}`);
        break;
      }

      default:
        console.log(`
UNIFIED IMPORTER - Import tennis data from SofaScore

Usage:
  node unifiedImporter.js sofascore [folder]       Import Sofascore JSONs
  node unifiedImporter.js count                    Count matches in DB

Options:
  --dry-run     Simulate without writing to DB
  --verbose     Show detailed output

Examples:
  node unifiedImporter.js sofascore ../data/scrapes --dry-run
        `);
    }

    process.exit(0);
  })();
}


