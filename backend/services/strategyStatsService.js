/**
 * Strategy Stats Service
 * Calcola statistiche storiche per le strategie di trading
 * 
 * Tipo: DERIVED (calcolato da dati puri)
 * Livello: PLAYER + MATCH (aggregato)
 * Persistenza: SÌ (può essere cachato)
 * 
 * Metriche calcolate:
 * - Lay the Winner: % successo quando il perdente del 1° set vince il match
 * - Banca Servizio: % break avvenuti (chi serve perde il game)
 * - Super Break: % match dove favorito (ranking) vince
 * 
 * Riferimento: docs/filosofie/FILOSOFIA_STATS_V2.md
 */

const { supabase } = require('../db/supabase');

/**
 * Calcola statistiche "Lay the Winner" dai match storici
 * 
 * La strategia funziona quando: chi PERDE il 1° set poi VINCE il match
 * 
 * @param {string} playerName - Nome giocatore (opzionale, per filtrare)
 * @param {string} surface - Superficie (opzionale)
 * @returns {Object} Statistiche
 */
async function calculateLayTheWinnerStats(playerName = null, surface = null) {
  if (!supabase) {
    return { error: 'Database not available' };
  }

  try {
    // Query match completati con dati set
    let query = supabase
      .from('matches')
      .select('id, winner_name, loser_name, w1, l1, winner_sets, loser_sets, surface, court_type, best_of')
      .not('w1', 'is', null)
      .not('l1', 'is', null)
      .gt('winner_sets', 0);

    if (surface) {
      query = query.or(`surface.ilike.%${surface}%,court_type.ilike.%${surface}%`);
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error('Error fetching matches for LTW stats:', error.message);
      return { error: error.message };
    }

    if (!matches || matches.length === 0) {
      return { total: 0, success: 0, rate: 0 };
    }

    let totalApplicable = 0; // Match dove il perdente del 1° set poteva recuperare
    let successCount = 0;    // Match dove il perdente del 1° set ha vinto

    for (const match of matches) {
      // w1, l1 sono game del PRIMO set dal punto di vista del WINNER
      // Se l1 > w1 → il loser aveva vinto il primo set
      // Se w1 > l1 → il winner aveva vinto il primo set
      
      const winnerWonSet1 = match.w1 > match.l1;
      const loserWonSet1 = match.l1 > match.w1;

      if (loserWonSet1) {
        // Il LOSER aveva vinto il set 1 ma poi ha perso il match
        // Questo è un caso dove "Lay the Winner" FALLISCE (il winner del set1 ha perso)
        totalApplicable++;
        // successCount NON aumenta - la strategia ha funzionato per chi ha bancato
      } else if (winnerWonSet1) {
        // Il WINNER aveva vinto il set 1 e ha vinto il match
        // Questo è un caso dove il perdente del set1 NON ha recuperato
        totalApplicable++;
        successCount++; // La strategia "Lay" avrebbe perso qui
      }
    }

    // Invertiamo la logica: successo = quando chi perde set1 poi vince
    // Quindi: rate = (totalApplicable - successCount) / totalApplicable
    // Ovvero: quante volte il vincitore del set1 ha poi PERSO
    const laySuccessCount = totalApplicable - successCount;

    return {
      total_matches: matches.length,
      applicable: totalApplicable,
      success: laySuccessCount,         // Quante volte "Lay the Winner" avrebbe funzionato
      failure: successCount,            // Quante volte il winner set1 ha anche vinto match
      success_rate: totalApplicable > 0 ? (laySuccessCount / totalApplicable) : 0,
      description: 'Match dove chi ha vinto il 1° set ha poi perso il match'
    };
  } catch (err) {
    console.error('Error in calculateLayTheWinnerStats:', err.message);
    return { error: err.message };
  }
}

/**
 * Calcola statistiche "Banca Servizio" dai match storici
 * 
 * La strategia funziona quando: avviene un BREAK (chi serve perde il game)
 * Percentuale di break = indicatore di quanto è rischioso servire
 * 
 * @param {string} playerName - Nome giocatore (opzionale)
 * @param {string} surface - Superficie (opzionale)
 * @returns {Object} Statistiche
 */
async function calculateBancaServizioStats(playerName = null, surface = null) {
  if (!supabase) {
    return { error: 'Database not available' };
  }

  try {
    // Prendiamo dati di break dalle statistiche match
    let query = supabase
      .from('match_statistics')
      .select(`
        match_id,
        home_break_points_won,
        home_break_points_total,
        away_break_points_won,
        away_break_points_total,
        home_service_games_won,
        away_service_games_won
      `)
      .not('home_break_points_total', 'is', null);

    const { data: stats, error } = await query;

    if (error) {
      console.error('Error fetching stats for Banca Servizio:', error.message);
      return { error: error.message };
    }

    if (!stats || stats.length === 0) {
      return { total: 0, breaks: 0, break_rate: 0 };
    }

    let totalBreakPoints = 0;
    let breaksConverted = 0;
    let totalServiceGames = 0;
    let serviceGamesLost = 0;

    for (const stat of stats) {
      // Break points
      const homeBpTotal = stat.home_break_points_total || 0;
      const homeBpWon = stat.home_break_points_won || 0;
      const awayBpTotal = stat.away_break_points_total || 0;
      const awayBpWon = stat.away_break_points_won || 0;

      totalBreakPoints += homeBpTotal + awayBpTotal;
      breaksConverted += homeBpWon + awayBpWon;

      // Service games (se disponibili)
      if (stat.home_service_games_won !== null && stat.away_service_games_won !== null) {
        // Stimiamo i game al servizio totali dalla durata match
        // Per ora usiamo i break points come proxy
      }
    }

    const breakConversionRate = totalBreakPoints > 0 
      ? (breaksConverted / totalBreakPoints) 
      : 0;

    return {
      total_matches: stats.length,
      total_break_points: totalBreakPoints,
      breaks_converted: breaksConverted,
      break_conversion_rate: breakConversionRate,
      // "Successo" della strategia = quando avviene break (banca servizio vince)
      success_rate: breakConversionRate,
      avg_breaks_per_match: stats.length > 0 ? (breaksConverted / stats.length) : 0,
      description: 'Percentuale break point convertiti (quante volte chi serve perde)'
    };
  } catch (err) {
    console.error('Error in calculateBancaServizioStats:', err.message);
    return { error: err.message };
  }
}

/**
 * Calcola statistiche "Super Break" dai match storici
 * 
 * La strategia funziona quando: il FAVORITO (ranking migliore) vince
 * 
 * @param {string} playerName - Nome giocatore (opzionale)
 * @param {string} surface - Superficie (opzionale)
 * @returns {Object} Statistiche
 */
async function calculateSuperBreakStats(playerName = null, surface = null) {
  if (!supabase) {
    return { error: 'Database not available' };
  }

  try {
    let query = supabase
      .from('matches')
      .select('id, winner_name, loser_name, winner_rank, loser_rank, surface, court_type')
      .not('winner_rank', 'is', null)
      .not('loser_rank', 'is', null)
      .gt('winner_rank', 0)
      .gt('loser_rank', 0);

    if (surface) {
      query = query.or(`surface.ilike.%${surface}%,court_type.ilike.%${surface}%`);
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error('Error fetching matches for Super Break stats:', error.message);
      return { error: error.message };
    }

    if (!matches || matches.length === 0) {
      return { total: 0, favorite_wins: 0, rate: 0 };
    }

    let favoriteWins = 0;
    let underdogWins = 0;

    for (const match of matches) {
      // Ranking più basso = favorito (es: #5 è favorito vs #50)
      const winnerRank = match.winner_rank;
      const loserRank = match.loser_rank;

      if (winnerRank < loserRank) {
        // Favorito ha vinto
        favoriteWins++;
      } else {
        // Underdog ha vinto
        underdogWins++;
      }
    }

    const total = favoriteWins + underdogWins;
    const favoriteWinRate = total > 0 ? (favoriteWins / total) : 0;

    // Calcola anche il gap medio di ranking nei match
    const avgRankGap = matches.length > 0 
      ? matches.reduce((sum, m) => sum + Math.abs(m.winner_rank - m.loser_rank), 0) / matches.length
      : 0;

    return {
      total_matches: total,
      favorite_wins: favoriteWins,
      underdog_wins: underdogWins,
      favorite_win_rate: favoriteWinRate,
      // "Successo" = favorito vince (strategia Super Break funziona)
      success_rate: favoriteWinRate,
      avg_ranking_gap: Math.round(avgRankGap),
      description: 'Percentuale vittorie del favorito (ranking migliore)'
    };
  } catch (err) {
    console.error('Error in calculateSuperBreakStats:', err.message);
    return { error: err.message };
  }
}

/**
 * Calcola statistiche HPI (Hold Pressure Index) dai match storici
 * 
 * HPI storico = % break point salvati aggregati su tutti i match
 * Indica quanto i giocatori tengono il servizio sotto pressione nel DB
 * 
 * Tipo: DERIVED
 * 
 * @param {string} playerName - Nome giocatore (opzionale)
 * @param {string} surface - Superficie (opzionale)
 * @returns {Object} Statistiche HPI
 */
async function calculateHPIStats(playerName = null, surface = null) {
  if (!supabase) {
    return { error: 'Database not available' };
  }

  try {
    // Query statistiche break point saved
    let query = supabase
      .from('match_statistics')
      .select(`
        match_id,
        home_break_points_saved,
        home_break_points_total,
        away_break_points_saved,
        away_break_points_total,
        home_first_serve_won_pct,
        away_first_serve_won_pct,
        home_second_serve_won_pct,
        away_second_serve_won_pct
      `)
      .not('home_break_points_total', 'is', null);

    const { data: stats, error } = await query;

    if (error) {
      console.error('Error fetching stats for HPI:', error.message);
      return { error: error.message };
    }

    if (!stats || stats.length === 0) {
      return { total: 0, hpi_avg: 0 };
    }

    let totalBPSaved = 0;
    let totalBPFaced = 0;
    let firstServeWonSum = 0;
    let secondServeWonSum = 0;
    let serveStatsCount = 0;

    for (const stat of stats) {
      // Break points
      const homeBpSaved = stat.home_break_points_saved || 0;
      const homeBpTotal = stat.home_break_points_total || 0;
      const awayBpSaved = stat.away_break_points_saved || 0;
      const awayBpTotal = stat.away_break_points_total || 0;

      totalBPSaved += homeBpSaved + awayBpSaved;
      totalBPFaced += homeBpTotal + awayBpTotal;

      // Serve stats
      if (stat.home_first_serve_won_pct !== null) {
        firstServeWonSum += stat.home_first_serve_won_pct;
        serveStatsCount++;
      }
      if (stat.away_first_serve_won_pct !== null) {
        firstServeWonSum += stat.away_first_serve_won_pct;
        serveStatsCount++;
      }
      if (stat.home_second_serve_won_pct !== null) {
        secondServeWonSum += stat.home_second_serve_won_pct;
      }
      if (stat.away_second_serve_won_pct !== null) {
        secondServeWonSum += stat.away_second_serve_won_pct;
      }
    }

    const hpiRate = totalBPFaced > 0 ? (totalBPSaved / totalBPFaced) : 0;
    const avgFirstServe = serveStatsCount > 0 ? (firstServeWonSum / serveStatsCount) : 0;
    const avgSecondServe = serveStatsCount > 0 ? (secondServeWonSum / serveStatsCount) : 0;

    return {
      total_matches: stats.length,
      total_break_points_faced: totalBPFaced,
      total_break_points_saved: totalBPSaved,
      hpi_rate: hpiRate,
      success_rate: hpiRate, // Per consistenza con altre statistiche
      avg_first_serve_won: Math.round(avgFirstServe * 10) / 10,
      avg_second_serve_won: Math.round(avgSecondServe * 10) / 10,
      description: 'Hold Pressure Index - % break point salvati (game tenuti sotto pressione)'
    };
  } catch (err) {
    console.error('Error in calculateHPIStats:', err.message);
    return { error: err.message };
  }
}

/**
 * Calcola statistiche Break Resilience dai match storici
 * 
 * Resilience = combinazione di:
 * - % BP salvati (60%)
 * - % match vinti dopo aver perso il 1° set (recovery, 40%)
 * 
 * Tipo: DERIVED
 * 
 * @param {string} playerName - Nome giocatore (opzionale)
 * @param {string} surface - Superficie (opzionale)
 * @returns {Object} Statistiche Resilience
 */
async function calculateBreakResilienceStats(playerName = null, surface = null) {
  if (!supabase) {
    return { error: 'Database not available' };
  }

  try {
    // Query break points saved
    const { data: stats, error: statsError } = await supabase
      .from('match_statistics')
      .select(`
        match_id,
        home_break_points_saved,
        home_break_points_total,
        away_break_points_saved,
        away_break_points_total
      `)
      .not('home_break_points_total', 'is', null);

    // Query match con comeback (perdente 1° set poi vince)
    let matchQuery = supabase
      .from('matches')
      .select('id, winner_name, loser_name, w1, l1, winner_sets, loser_sets')
      .not('w1', 'is', null)
      .not('l1', 'is', null)
      .gt('winner_sets', 0);

    if (surface) {
      matchQuery = matchQuery.or(`surface.ilike.%${surface}%,court_type.ilike.%${surface}%`);
    }

    const { data: matches, error: matchError } = await matchQuery;

    if (statsError || matchError) {
      console.error('Error fetching data for Resilience:', statsError?.message || matchError?.message);
      return { error: (statsError || matchError).message };
    }

    // Calcola BP Saved %
    let totalBPSaved = 0;
    let totalBPFaced = 0;

    if (stats && stats.length > 0) {
      for (const stat of stats) {
        totalBPSaved += (stat.home_break_points_saved || 0) + (stat.away_break_points_saved || 0);
        totalBPFaced += (stat.home_break_points_total || 0) + (stat.away_break_points_total || 0);
      }
    }

    const bpSavedRate = totalBPFaced > 0 ? (totalBPSaved / totalBPFaced) : 0;

    // Calcola Recovery Rate (comeback dopo perdere 1° set)
    let totalWithSet1Loss = 0; // Match dove il winner aveva perso il 1° set
    let comebackWins = 0;

    if (matches && matches.length > 0) {
      for (const match of matches) {
        // Se l1 > w1, significa che il loser aveva vinto il primo set
        // Quindi il winner ha fatto comeback
        if (match.l1 > match.w1) {
          comebackWins++;
        }
        // Tutti i match dove qualcuno ha perso il primo set
        if (match.l1 !== match.w1) {
          totalWithSet1Loss++;
        }
      }
    }

    const recoveryRate = totalWithSet1Loss > 0 ? (comebackWins / totalWithSet1Loss) : 0;

    // Combina: 60% BP saved + 40% recovery
    const resilienceScore = (bpSavedRate * 0.6) + (recoveryRate * 0.4);

    return {
      total_matches: matches?.length || 0,
      total_bp_faced: totalBPFaced,
      total_bp_saved: totalBPSaved,
      bp_saved_rate: bpSavedRate,
      comeback_matches: comebackWins,
      total_set1_losses: totalWithSet1Loss,
      recovery_rate: recoveryRate,
      resilience_score: resilienceScore,
      success_rate: resilienceScore, // Per consistenza
      description: 'Break Resilience - capacità salvare BP e recuperare da situazioni negative'
    };
  } catch (err) {
    console.error('Error in calculateBreakResilienceStats:', err.message);
    return { error: err.message };
  }
}

/**
 * Calcola tutte le statistiche strategie per una coppia di giocatori
 * 
 * @param {string} homeName - Nome giocatore home
 * @param {string} awayName - Nome giocatore away
 * @param {string} surface - Superficie (opzionale)
 * @returns {Object} Statistiche aggregate
 */
async function getStrategyStats(homeName, awayName, surface = null) {
  console.log(`📊 [StrategyStats] Calculating for ${homeName} vs ${awayName} (surface: ${surface || 'all'})`);

  const [layTheWinner, bancaServizio, superBreak, hpi, resilience] = await Promise.all([
    calculateLayTheWinnerStats(null, surface),
    calculateBancaServizioStats(null, surface),
    calculateSuperBreakStats(null, surface),
    calculateHPIStats(null, surface),
    calculateBreakResilienceStats(null, surface)
  ]);

  return {
    layTheWinner,
    bancaServizio,
    superBreak,
    hpi,
    resilience,
    surface: surface || 'all',
    calculatedAt: new Date().toISOString()
  };
}

module.exports = {
  calculateLayTheWinnerStats,
  calculateBancaServizioStats,
  calculateSuperBreakStats,
  calculateHPIStats,
  calculateBreakResilienceStats,
  getStrategyStats
};