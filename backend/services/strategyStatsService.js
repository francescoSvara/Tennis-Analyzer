/**
 * Strategy Stats Service
 * @see docs/comments/strategy-stats-service-explanations.md#header
 */

const { supabase } = require('../db/supabase');

/**
 * Calcola statistiche "Lay the Winner" dai match storici
 *
 * La strategia funziona quando: chi PERDE il 1Â° set poi VINCE il match
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
    // Query match completati con dati set - usa matches
    // matches usa: set1_p1/set1_p2 invece di w1/l1 e sets_player1/sets_player2 invece di winner_sets/loser_sets
    let query = supabase
      .from('matches')
      .select(
        'id, player1_id, player2_id, winner_code, set1_p1, set1_p2, sets_player1, sets_player2, surface, best_of'
      )
      .not('set1_p1', 'is', null)
      .not('set1_p2', 'is', null)
      .gt('sets_player1', 0);

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

    let totalApplicable = 0; // Match dove il perdente del 1Â° set poteva recuperare
    let successCount = 0; // Match dove il perdente del 1Â° set ha vinto

    for (const match of matches) {
      // matches: set1_p1/set1_p2 sono i game del primo set per player1/player2
      // winner_code: 1 = player1 vince, 2 = player2 vince
      const p1WonSet1 = match.set1_p1 > match.set1_p2;
      const p2WonSet1 = match.set1_p2 > match.set1_p1;
      const p1WonMatch = match.winner_code === 1;
      const p2WonMatch = match.winner_code === 2;

      // Caso: chi ha vinto il primo set ha poi perso il match (LTW success)
      if ((p1WonSet1 && p2WonMatch) || (p2WonSet1 && p1WonMatch)) {
        totalApplicable++;
        // successCount NON aumenta - la strategia ha funzionato
      } else if ((p1WonSet1 && p1WonMatch) || (p2WonSet1 && p2WonMatch)) {
        // Chi ha vinto il set 1 ha anche vinto il match
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
      success: laySuccessCount, // Quante volte "Lay the Winner" avrebbe funzionato
      failure: successCount, // Quante volte il winner set1 ha anche vinto match
      success_rate: totalApplicable > 0 ? laySuccessCount / totalApplicable : 0,
      description: 'Match dove chi ha vinto il 1Â° set ha poi perso il match',
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
 * Percentuale di break = indicatore di quanto Ã¨ rischioso servire
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
      .select(
        `
        match_id,
        home_break_points_won,
        home_break_points_total,
        away_break_points_won,
        away_break_points_total,
        home_service_games_won,
        away_service_games_won
      `
      )
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

    const breakConversionRate = totalBreakPoints > 0 ? breaksConverted / totalBreakPoints : 0;

    return {
      total_matches: stats.length,
      total_break_points: totalBreakPoints,
      breaks_converted: breaksConverted,
      break_conversion_rate: breakConversionRate,
      // "Successo" della strategia = quando avviene break (banca servizio vince)
      success_rate: breakConversionRate,
      avg_breaks_per_match: stats.length > 0 ? breaksConverted / stats.length : 0,
      description: 'Percentuale break point convertiti (quante volte chi serve perde)',
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
    // matches usa player1_rank/player2_rank invece di winner_rank/loser_rank
    let query = supabase
      .from('matches')
      .select('id, player1_id, player2_id, winner_code, player1_rank, player2_rank, surface')
      .not('player1_rank', 'is', null)
      .not('player2_rank', 'is', null)
      .gt('player1_rank', 0)
      .gt('player2_rank', 0);

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
      // matches: player1_rank/player2_rank sono i ranking al momento del match
      // Ranking piÃ¹ basso = favorito (es: #5 Ã¨ favorito vs #50)
      const p1Rank = match.player1_rank;
      const p2Rank = match.player2_rank;
      const p1IsFavorite = p1Rank < p2Rank;
      const p1WonMatch = match.winner_code === 1;

      if ((p1IsFavorite && p1WonMatch) || (!p1IsFavorite && !p1WonMatch)) {
        // Favorito ha vinto
        favoriteWins++;
      } else {
        // Underdog ha vinto
        underdogWins++;
      }
    }

    const total = favoriteWins + underdogWins;
    const favoriteWinRate = total > 0 ? favoriteWins / total : 0;

    // Calcola anche il gap medio di ranking nei match
    const avgRankGap =
      matches.length > 0
        ? matches.reduce((sum, m) => sum + Math.abs(m.player1_rank - m.player2_rank), 0) /
          matches.length
        : 0;

    return {
      total_matches: total,
      favorite_wins: favoriteWins,
      underdog_wins: underdogWins,
      favorite_win_rate: favoriteWinRate,
      // "Successo" = favorito vince (strategia Super Break funziona)
      success_rate: favoriteWinRate,
      avg_ranking_gap: Math.round(avgRankGap),
      description: 'Percentuale vittorie del favorito (ranking migliore)',
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
      .select(
        `
        match_id,
        home_break_points_saved,
        home_break_points_total,
        away_break_points_saved,
        away_break_points_total,
        home_first_serve_won_pct,
        away_first_serve_won_pct,
        home_second_serve_won_pct,
        away_second_serve_won_pct
      `
      )
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

    const hpiRate = totalBPFaced > 0 ? totalBPSaved / totalBPFaced : 0;
    const avgFirstServe = serveStatsCount > 0 ? firstServeWonSum / serveStatsCount : 0;
    const avgSecondServe = serveStatsCount > 0 ? secondServeWonSum / serveStatsCount : 0;

    return {
      total_matches: stats.length,
      total_break_points_faced: totalBPFaced,
      total_break_points_saved: totalBPSaved,
      hpi_rate: hpiRate,
      success_rate: hpiRate, // Per consistenza con altre statistiche
      avg_first_serve_won: Math.round(avgFirstServe * 10) / 10,
      avg_second_serve_won: Math.round(avgSecondServe * 10) / 10,
      description: 'Hold Pressure Index - % break point salvati (game tenuti sotto pressione)',
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
 * - % match vinti dopo aver perso il 1Â° set (recovery, 40%)
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
      .select(
        `
        match_id,
        home_break_points_saved,
        home_break_points_total,
        away_break_points_saved,
        away_break_points_total
      `
      )
      .not('home_break_points_total', 'is', null);

    // Query match con comeback (perdente 1Â° set poi vince) - usa matches
    let matchQuery = supabase
      .from('matches')
      .select(
        'id, player1_id, player2_id, winner_code, set1_p1, set1_p2, sets_player1, sets_player2'
      )
      .not('set1_p1', 'is', null)
      .not('set1_p2', 'is', null)
      .gt('sets_player1', 0);

    if (surface) {
      matchQuery = matchQuery.or(`surface.ilike.%${surface}%,court_type.ilike.%${surface}%`);
    }

    const { data: matches, error: matchError } = await matchQuery;

    if (statsError || matchError) {
      console.error(
        'Error fetching data for Resilience:',
        statsError?.message || matchError?.message
      );
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

    const bpSavedRate = totalBPFaced > 0 ? totalBPSaved / totalBPFaced : 0;

    // Calcola Recovery Rate (comeback dopo perdere 1Â° set)
    let totalWithSet1Loss = 0; // Match dove il winner aveva perso il 1Â° set
    let comebackWins = 0;

    if (matches && matches.length > 0) {
      for (const match of matches) {
        // matches: set1_p1/set1_p2 e winner_code
        // Comeback = chi perde il primo set poi vince il match
        const p1WonSet1 = match.set1_p1 > match.set1_p2;
        const p2WonSet1 = match.set1_p2 > match.set1_p1;
        const p1WonMatch = match.winner_code === 1;
        const p2WonMatch = match.winner_code === 2;

        // Se winner del match aveva perso il primo set = comeback
        if ((p2WonSet1 && p1WonMatch) || (p1WonSet1 && p2WonMatch)) {
          comebackWins++;
        }
        // Tutti i match con set1 deciso
        if (match.set1_p1 !== match.set1_p2) {
          totalWithSet1Loss++;
        }
      }
    }

    const recoveryRate = totalWithSet1Loss > 0 ? comebackWins / totalWithSet1Loss : 0;

    // Combina: 60% BP saved + 40% recovery
    const resilienceScore = bpSavedRate * 0.6 + recoveryRate * 0.4;

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
      description: 'Break Resilience - capacitÃ  salvare BP e recuperare da situazioni negative',
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
  console.log(
    `ðŸ“Š [StrategyStats] Calculating for ${homeName} vs ${awayName} (surface: ${surface || 'all'})`
  );

  const [layTheWinner, bancaServizio, superBreak, hpi, resilience] = await Promise.all([
    calculateLayTheWinnerStats(null, surface),
    calculateBancaServizioStats(null, surface),
    calculateSuperBreakStats(null, surface),
    calculateHPIStats(null, surface),
    calculateBreakResilienceStats(null, surface),
  ]);

  return {
    layTheWinner,
    bancaServizio,
    superBreak,
    hpi,
    resilience,
    surface: surface || 'all',
    calculatedAt: new Date().toISOString(),
  };
}

module.exports = {
  calculateLayTheWinnerStats,
  calculateBancaServizioStats,
  calculateSuperBreakStats,
  calculateHPIStats,
  calculateBreakResilienceStats,
  getStrategyStats,
};




