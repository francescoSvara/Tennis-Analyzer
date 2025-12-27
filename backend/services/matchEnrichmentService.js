/**
 * Match Enrichment Service
 * 
 * FILOSOFIA: Servizio unificato per completare partite passate che non hanno tutti i dati.
 * Combina pbpExtractor + svgMomentumExtractor per ottenere dati completi.
 * 
 * QUANDO USARE:
 * - Partite già finite senza PBP nel DB
 * - Partite senza power rankings/momentum
 * - Arricchimento batch di partite storiche
 * 
 * INVARIANTI:
 * - row1 = HOME, row2 = AWAY (SEMPRE, vedi FILOSOFIA_PBP_EXTRACTION.md)
 * - I 6 invarianti tennis devono essere rispettati
 * - Il DB va popolato SOLO con dati SofaScore API o tramite questo servizio
 * 
 * @see docs/filosofie/20_domain_tennis/FILOSOFIA_PBP_EXTRACTION.md
 * @see docs/filosofie/10_data_platform/storage/FILOSOFIA_DB.md
 */

const { createClient } = require('@supabase/supabase-js');

// Importa estrattori
const { extractPbp, formatPointsForDb } = require('../utils/pbpExtractor.cjs');
const { processSvgMomentum } = require('../utils/svgMomentumExtractor');

// Logger
const logger = require('../utils/logger');

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENRICHMENT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Arricchisce un match con PBP e SVG momentum da HTML copiato da SofaScore
 * 
 * @param {number} matchId - ID match nel DB
 * @param {Object} options - Opzioni di arricchimento
 * @param {string} options.pbpHtml - HTML del tab Point-by-Point di SofaScore
 * @param {string} options.svgHtml - HTML del grafico momentum SVG
 * @param {boolean} options.dryRun - Se true, non inserisce nel DB (solo validazione)
 * @returns {Promise<{success: boolean, pbp?: Object, momentum?: Object, errors: string[]}>}
 */
async function enrichMatchFromHtml(matchId, options = {}) {
  const { pbpHtml, svgHtml, dryRun = false } = options;
  const errors = [];
  const result = { success: false, pbp: null, momentum: null, errors };

  // 1. Verifica che il match esista nel DB
  const { data: match, error: matchError } = await supabase
    .from('matches_new')
    .select('id, home_player_id, away_player_id, sofascore_id')
    .eq('sofascore_id', matchId)
    .single();

  if (matchError || !match) {
    errors.push(`Match ${matchId} non trovato nel DB`);
    return result;
  }

  logger.info(`[EnrichService] Arricchimento match ${matchId}...`);

  // 2. Estrai e inserisci PBP se fornito
  if (pbpHtml) {
    try {
      const pbpResult = await extractAndInsertPbp(matchId, pbpHtml, dryRun);
      result.pbp = pbpResult;
      if (!pbpResult.success) {
        errors.push(...(pbpResult.errors || ['Errore estrazione PBP']));
      }
    } catch (err) {
      errors.push(`Errore PBP: ${err.message}`);
    }
  }

  // 3. Estrai e inserisci SVG momentum se fornito
  if (svgHtml) {
    try {
      const svgResult = await extractAndInsertMomentum(matchId, svgHtml, dryRun);
      result.momentum = svgResult;
      if (!svgResult.success) {
        errors.push(...(svgResult.errors || ['Errore estrazione SVG']));
      }
    } catch (err) {
      errors.push(`Errore SVG: ${err.message}`);
    }
  }

  // 4. Aggiorna data_quality del match
  if (!dryRun && (result.pbp?.success || result.momentum?.success)) {
    await updateMatchDataQuality(matchId);
  }

  result.success = errors.length === 0;
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// PBP EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estrae PBP da HTML e inserisce nel DB
 */
async function extractAndInsertPbp(matchId, html, dryRun = false) {
  const result = { success: false, pointsCount: 0, errors: [] };

  // Estrai usando pbpExtractor (versione corretta con row1=HOME, row2=AWAY)
  const extracted = extractPbp(html);
  
  if (!extracted || !extracted.points || extracted.points.length === 0) {
    result.errors.push('Nessun punto estratto dal HTML');
    return result;
  }

  // Valida i dati estratti
  const validation = validatePbpData(extracted.points);
  if (!validation.valid) {
    result.errors.push(...validation.errors);
    logger.warn(`[EnrichService] PBP validation warnings: ${validation.errors.join(', ')}`);
    // Continua comunque se ci sono solo warning
  }

  result.pointsCount = extracted.points.length;

  if (dryRun) {
    logger.info(`[EnrichService] DRY RUN: ${result.pointsCount} punti estratti per match ${matchId}`);
    result.success = true;
    result.dryRun = true;
    return result;
  }

  // Prepara i punti per il DB
  const dbPoints = extracted.points.map((p, idx) => ({
    match_id: matchId,
    set_number: p.set,
    game_number: p.game,
    point_number: idx + 1,
    home_score: p.homeScore,
    away_score: p.awayScore,
    serving: p.server === 'home' ? 1 : 2,  // 1=HOME, 2=AWAY
    scoring: p.pointWinner === 'home' ? 1 : 2,
    is_break_point: p.isBreakPoint || false,
    is_set_point: p.isSetPoint || false,
    is_match_point: p.isMatchPoint || false
  }));

  // Elimina PBP esistente per questo match
  const { error: deleteError } = await supabase
    .from('point_by_point')
    .delete()
    .eq('match_id', matchId);

  if (deleteError) {
    result.errors.push(`Errore cancellazione PBP esistente: ${deleteError.message}`);
    return result;
  }

  // Inserisci nuovi punti
  const { error: insertError } = await supabase
    .from('point_by_point')
    .insert(dbPoints);

  if (insertError) {
    result.errors.push(`Errore inserimento PBP: ${insertError.message}`);
    return result;
  }

  logger.info(`[EnrichService] Inseriti ${result.pointsCount} punti PBP per match ${matchId}`);
  result.success = true;
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// SVG MOMENTUM EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estrae momentum da SVG HTML e inserisce nel DB
 */
async function extractAndInsertMomentum(matchId, html, dryRun = false) {
  const result = { success: false, gamesCount: 0, errors: [] };

  // Estrai usando svgMomentumExtractor
  const extracted = processSvgMomentum(html);
  
  if (!extracted || !extracted.ok) {
    result.errors.push(extracted?.error || 'Errore estrazione SVG momentum');
    return result;
  }

  // Conta game totali
  const totalGames = extracted.sets.reduce((sum, s) => sum + (s.games?.length || 0), 0);
  result.gamesCount = totalGames;

  if (totalGames === 0) {
    result.errors.push('Nessun game estratto dal SVG');
    return result;
  }

  if (dryRun) {
    logger.info(`[EnrichService] DRY RUN: ${totalGames} game momentum estratti per match ${matchId}`);
    result.success = true;
    result.dryRun = true;
    return result;
  }

  // Prepara power rankings per il DB
  const powerRankings = [];
  for (const set of extracted.sets) {
    for (const game of (set.games || [])) {
      powerRankings.push({
        set: game.set,
        game: game.game,
        value: game.value,
        side: game.side,
        homeValue: game.side === 'home' ? Math.abs(game.value) : 0,
        awayValue: game.side === 'away' ? Math.abs(game.value) : 0
      });
    }
  }

  // Aggiorna il campo svg_momentum_json nel match
  const { error: updateError } = await supabase
    .from('matches_new')
    .update({ 
      svg_momentum_json: powerRankings,
      updated_at: new Date().toISOString()
    })
    .eq('sofascore_id', matchId);

  if (updateError) {
    result.errors.push(`Errore aggiornamento momentum: ${updateError.message}`);
    return result;
  }

  logger.info(`[EnrichService] Aggiornato SVG momentum (${totalGames} games) per match ${matchId}`);
  result.success = true;
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida i dati PBP rispettando i 6 invarianti tennis
 * @see FILOSOFIA_PBP_EXTRACTION.md
 */
function validatePbpData(points) {
  const errors = [];
  
  if (!points || points.length === 0) {
    return { valid: false, errors: ['Nessun punto da validare'] };
  }

  // Invariante 1: Score progression
  let prevScore = { home: '0', away: '0' };
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    
    // Score deve essere valido
    if (!isValidTennisScore(p.homeScore) || !isValidTennisScore(p.awayScore)) {
      errors.push(`Punto ${i}: Score non valido (${p.homeScore}-${p.awayScore})`);
    }
  }

  // Invariante 3: Break detection
  const games = groupPointsByGame(points);
  for (const game of games) {
    if (game.points.length === 0) continue;
    
    const lastPoint = game.points[game.points.length - 1];
    const gameWinner = lastPoint.pointWinner;
    const server = game.server;
    
    // Se game finito e winner != server, è un break
    if (gameWinner && server && gameWinner !== server) {
      // Questo è un break - logga per verifica
      logger.debug(`Break at S${game.set}G${game.game}: ${gameWinner} broke ${server}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Raggruppa punti per game
 */
function groupPointsByGame(points) {
  const games = [];
  let currentGame = null;

  for (const p of points) {
    const key = `${p.set}-${p.game}`;
    if (!currentGame || currentGame.key !== key) {
      if (currentGame) games.push(currentGame);
      currentGame = {
        key,
        set: p.set,
        game: p.game,
        server: p.server,
        points: []
      };
    }
    currentGame.points.push(p);
  }
  
  if (currentGame) games.push(currentGame);
  return games;
}

/**
 * Valida score tennis
 */
function isValidTennisScore(score) {
  if (!score) return true; // 0 è valido
  const s = String(score).trim().toUpperCase();
  if (['0', '15', '30', '40', 'A', 'AD'].includes(s)) return true;
  const num = parseInt(s);
  return !isNaN(num) && num >= 0 && num < 100; // Tiebreak
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA QUALITY UPDATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ricalcola data_quality dopo arricchimento
 */
async function updateMatchDataQuality(matchId) {
  try {
    // Controlla cosa ha il match ora
    const { data: match } = await supabase
      .from('matches_new')
      .select('*')
      .eq('sofascore_id', matchId)
      .single();

    if (!match) return;

    // Calcola quality score (0-100)
    let quality = 0;
    
    // Base data
    if (match.home_player_id && match.away_player_id) quality += 20;
    if (match.winner_code) quality += 10;
    if (match.tournament_id) quality += 10;
    
    // Score
    if (match.home_score !== null && match.away_score !== null) quality += 15;
    
    // SVG Momentum
    if (match.svg_momentum_json && Array.isArray(match.svg_momentum_json) && match.svg_momentum_json.length > 0) {
      quality += 15;
    }

    // PBP
    const { count: pbpCount } = await supabase
      .from('point_by_point')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', matchId);
    
    if (pbpCount && pbpCount > 0) quality += 20;

    // Statistics
    if (match.raw_json?.statistics) quality += 10;

    // Aggiorna
    await supabase
      .from('matches_new')
      .update({ 
        data_quality: quality,
        updated_at: new Date().toISOString()
      })
      .eq('sofascore_id', matchId);

    logger.info(`[EnrichService] Data quality aggiornata a ${quality}% per match ${matchId}`);
  } catch (err) {
    logger.error(`[EnrichService] Errore aggiornamento data_quality: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  enrichMatchFromHtml,
  extractAndInsertPbp,
  extractAndInsertMomentum,
  validatePbpData,
  updateMatchDataQuality
};
