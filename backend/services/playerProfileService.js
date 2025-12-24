/**
 * PLAYER PROFILE SERVICE
 * 
 * Aggregates historical data for players to generate comprehensive profiles
 * with derived metrics for surface, format, and tournament series.
 * 
 * @module playerProfileService
 * @see FILOSOFIA_STATS.md - Section "Player Profile Aggregator"
 */

const { supabase } = require('../db/supabase');
const { createLogger } = require('../utils/logger');

const logger = createLogger('PlayerProfile');

// ============================================================================
// CONSTANTS
// ============================================================================

const SURFACES = ['Hard', 'Clay', 'Grass', 'Carpet'];
const FORMATS = ['best_of_3', 'best_of_5'];
const SERIES = ['Grand Slam', 'Masters 1000', 'ATP500', 'ATP250', 'ATP Finals'];

/**
 * Surface name normalization mapping
 */
const SURFACE_MAPPING = {
  'hard': 'Hard',
  'hardcourt': 'Hard',
  'hard court': 'Hard',
  'indoor hard': 'Hard',
  'outdoor hard': 'Hard',
  'clay': 'Clay',
  'red clay': 'Clay',
  'terre battue': 'Clay',
  'grass': 'Grass',
  'carpet': 'Carpet',
  'indoor': 'Hard'  // Most indoor are hard
};

/**
 * Series name normalization
 */
const SERIES_MAPPING = {
  'grand slam': 'Grand Slam',
  'grandslam': 'Grand Slam',
  'gs': 'Grand Slam',
  'masters 1000': 'Masters 1000',
  'masters1000': 'Masters 1000',
  'm1000': 'Masters 1000',
  'atp 500': 'ATP500',
  'atp500': 'ATP500',
  '500': 'ATP500',
  'atp 250': 'ATP250',
  'atp250': 'ATP250',
  '250': 'ATP250',
  'atp finals': 'ATP Finals',
  'finals': 'ATP Finals'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes player name for matching
 */
function normalizePlayerName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[''`\.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts last name from full name
 */
function extractLastName(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  
  // Format "LastName I." (xlsx) - first part is last name
  if (parts.length >= 2 && parts[parts.length - 1].length <= 2) {
    return parts[0].toLowerCase();
  }
  
  // Format "FirstName LastName" - last part is last name
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Checks if player name matches search name
 */
function playerMatches(playerName, searchName) {
  const normalizedPlayer = normalizePlayerName(playerName);
  const normalizedSearch = normalizePlayerName(searchName);
  
  if (normalizedPlayer.includes(normalizedSearch) || normalizedSearch.includes(normalizedPlayer)) {
    return true;
  }
  
  const playerLastName = extractLastName(playerName);
  const searchLastName = extractLastName(searchName);
  
  return playerLastName === searchLastName && playerLastName.length > 2;
}

/**
 * Normalizes surface name
 */
function normalizeSurface(surface) {
  if (!surface) return 'Unknown';
  const lower = surface.toLowerCase().trim();
  return SURFACE_MAPPING[lower] || surface;
}

/**
 * Normalizes series/tournament level
 */
function normalizeSeries(series) {
  if (!series) return 'Other';
  const lower = series.toLowerCase().trim();
  return SERIES_MAPPING[lower] || series;
}

/**
 * Determines format from series or match data
 */
function getFormat(match) {
  const series = normalizeSeries(match.series);
  
  // Grand Slams are best of 5 (for men's singles)
  if (series === 'Grand Slam') {
    return 'best_of_5';
  }
  
  return 'best_of_3';
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetches all matches for a player from database
 * Searches BOTH by winner_name/loser_name (xlsx) AND by player_id (sofascore)
 * This ensures all matches are found regardless of data source
 * 
 * @param {string} playerName - Player name to search
 * @returns {Promise<Array>} Array of matches with player_role
 */
async function getPlayerMatches(playerName) {
  if (!supabase) {
    logger.warn('Supabase not available');
    return [];
  }

  const lastName = extractLastName(playerName);
  const normalizedSearch = normalizePlayerName(playerName);
  
  logger.debug(`Searching matches for "${playerName}" (lastName: ${lastName})`);
  
  // ===== STRATEGY 1: Search by winner_name/loser_name (works for xlsx data) =====
  const { data: matchesWinner, error: err1 } = await supabase
    .from('matches')
    .select('*')
    .ilike('winner_name', `%${lastName}%`);

  const { data: matchesLoser, error: err2 } = await supabase
    .from('matches')
    .select('*')
    .ilike('loser_name', `%${lastName}%`);

  if (err1) logger.error('Error fetching winner matches:', err1.message);
  if (err2) logger.error('Error fetching loser matches:', err2.message);

  // ===== STRATEGY 2: Search by player_id (works for sofascore data with empty names) =====
  // First, find the player ID(s) matching this name
  const { data: players, error: playerErr } = await supabase
    .from('players')
    .select('id, name, full_name')
    .or(`name.ilike.%${lastName}%,full_name.ilike.%${lastName}%`);
  
  if (playerErr) logger.error('Error fetching players:', playerErr.message);
  
  // Filter players that actually match the search name
  const matchingPlayerIds = (players || [])
    .filter(p => playerMatches(p.name, playerName) || playerMatches(p.full_name, playerName))
    .map(p => p.id);
  
  logger.debug(`Found ${matchingPlayerIds.length} matching player IDs: ${matchingPlayerIds.join(', ')}`);
  
  // Query matches by player_id if we found matching players
  let matchesByPlayerId = [];
  if (matchingPlayerIds.length > 0) {
    // Get matches where player is home
    const { data: homeMatches, error: homeErr } = await supabase
      .from('matches')
      .select(`
        *,
        home_player:players!matches_home_player_id_fkey(id, name, full_name),
        away_player:players!matches_away_player_id_fkey(id, name, full_name)
      `)
      .in('home_player_id', matchingPlayerIds);
    
    // Get matches where player is away
    const { data: awayMatches, error: awayErr } = await supabase
      .from('matches')
      .select(`
        *,
        home_player:players!matches_home_player_id_fkey(id, name, full_name),
        away_player:players!matches_away_player_id_fkey(id, name, full_name)
      `)
      .in('away_player_id', matchingPlayerIds);
    
    if (homeErr) logger.error('Error fetching home matches by ID:', homeErr.message);
    if (awayErr) logger.error('Error fetching away matches by ID:', awayErr.message);
    
    matchesByPlayerId = [...(homeMatches || []), ...(awayMatches || [])];
    logger.debug(`Found ${matchesByPlayerId.length} matches by player_id`);
  }

  // ===== COMBINE ALL MATCHES =====
  const allMatches = [
    ...(matchesWinner || []), 
    ...(matchesLoser || []),
    ...matchesByPlayerId
  ];
  
  const uniqueMatches = new Map();
  
  for (const match of allMatches) {
    if (uniqueMatches.has(match.id)) continue;
    
    // Determine player role - check multiple fields
    let isWinner = false;
    let isLoser = false;
    
    // Check winner_name/loser_name (xlsx format)
    if (match.winner_name && playerMatches(match.winner_name, playerName)) {
      isWinner = true;
    } else if (match.loser_name && playerMatches(match.loser_name, playerName)) {
      isLoser = true;
    }
    
    // Check by player_id if not found by name (sofascore format)
    if (!isWinner && !isLoser && matchingPlayerIds.length > 0) {
      const isHome = matchingPlayerIds.includes(match.home_player_id);
      const isAway = matchingPlayerIds.includes(match.away_player_id);
      
      if (isHome || isAway) {
        // Determine win/loss by winner_code or score comparison
        const winnerCode = match.winner_code;
        if (winnerCode === 1 && isHome) {
          isWinner = true;
        } else if (winnerCode === 2 && isAway) {
          isWinner = true;
        } else if (winnerCode === 1 && isAway) {
          isLoser = true;
        } else if (winnerCode === 2 && isHome) {
          isLoser = true;
        } else {
          // Fallback: check sets won
          const homeSets = match.home_sets_won || 0;
          const awaySets = match.away_sets_won || 0;
          if (homeSets > awaySets && isHome) isWinner = true;
          else if (awaySets > homeSets && isAway) isWinner = true;
          else if (homeSets > awaySets && isAway) isLoser = true;
          else if (awaySets > homeSets && isHome) isLoser = true;
        }
      }
    }
    
    // Also check home_player/away_player objects (from join)
    if (!isWinner && !isLoser) {
      const homeName = match.home_player?.name || match.home_player?.full_name;
      const awayName = match.away_player?.name || match.away_player?.full_name;
      
      if (homeName && playerMatches(homeName, playerName)) {
        const winnerCode = match.winner_code;
        isWinner = winnerCode === 1;
        isLoser = winnerCode === 2;
      } else if (awayName && playerMatches(awayName, playerName)) {
        const winnerCode = match.winner_code;
        isWinner = winnerCode === 2;
        isLoser = winnerCode === 1;
      }
    }
    
    if (isWinner || isLoser) {
      uniqueMatches.set(match.id, {
        ...match,
        player_role: isWinner ? 'winner' : 'loser',
        surface_normalized: normalizeSurface(match.surface),
        series_normalized: normalizeSeries(match.series),
        format: getFormat(match)
      });
    }
  }

  const result = Array.from(uniqueMatches.values());
  logger.info(`Total unique matches found: ${result.length} (${result.filter(m => m.player_role === 'winner').length}W - ${result.filter(m => m.player_role === 'loser').length}L)`);
  
  return result;
}

// ============================================================================
// METRIC CALCULATIONS
// ============================================================================

/**
 * Calculates global statistics
 */
function calculateGlobalStats(matches) {
  const wins = matches.filter(m => m.player_role === 'winner').length;
  const losses = matches.filter(m => m.player_role === 'loser').length;
  const total = matches.length;
  
  // Calculate average sets per match
  let totalSets = 0;
  let tiebreakWins = 0;
  let tiebreakMatches = 0;
  
  for (const match of matches) {
    // Count sets from w1/l1, w2/l2, etc.
    let setsPlayed = 0;
    for (let i = 1; i <= 5; i++) {
      if (match[`w${i}`] !== null && match[`l${i}`] !== null) {
        setsPlayed++;
        
        // Check for tiebreak
        const wGames = match[`w${i}`];
        const lGames = match[`l${i}`];
        if ((wGames === 7 && lGames === 6) || (wGames === 6 && lGames === 7)) {
          tiebreakMatches++;
          // Did player win the tiebreak?
          const isWinner = match.player_role === 'winner';
          if ((isWinner && wGames > lGames) || (!isWinner && lGames > wGames)) {
            tiebreakWins++;
          }
        }
      }
    }
    totalSets += setsPlayed;
  }
  
  return {
    total_matches: total,
    wins,
    losses,
    win_rate: total > 0 ? wins / total : 0,
    avg_sets_per_match: total > 0 ? totalSets / total : 0,
    tiebreak_win_rate: tiebreakMatches > 0 ? tiebreakWins / tiebreakMatches : 0
  };
}

/**
 * Calculates comeback rate (wins after losing set 1)
 */
function calculateComebackRate(matches) {
  let winsAfterLosingSet1 = 0;
  let lossesSet1 = 0;

  for (const match of matches) {
    const isWinner = match.player_role === 'winner';
    const w1 = match.w1;
    const l1 = match.l1;
    
    if (w1 === null || l1 === null) continue;
    
    // Winner's perspective: if l1 > w1, winner lost set 1
    if (isWinner && l1 > w1) {
      lossesSet1++;
      winsAfterLosingSet1++;
    } else if (!isWinner && w1 > l1) {
      lossesSet1++;
      // Lost the match, so no comeback
    }
  }

  return {
    matches_lost_set1: lossesSet1,
    comebacks: winsAfterLosingSet1,
    comeback_rate: lossesSet1 > 0 ? winsAfterLosingSet1 / lossesSet1 : 0
  };
}

/**
 * Calculates ROI with flat stake
 */
function calculateROI(matches, oddsField = 'avgw') {
  let totalStake = 0;
  let totalReturn = 0;
  let betsPlaced = 0;

  for (const match of matches) {
    const isWinner = match.player_role === 'winner';
    
    // Get appropriate odds field
    const odds = isWinner 
      ? match[oddsField] || match.avgw || match.b365w
      : match[oddsField?.replace('w', 'l')] || match.avgl || match.b365l;
    
    if (!odds || odds <= 1) continue;
    
    totalStake += 1;
    betsPlaced++;
    
    if (isWinner) {
      totalReturn += odds;
    }
  }

  const profit = totalReturn - totalStake;
  const roi = totalStake > 0 ? profit / totalStake : 0;

  return {
    bets_placed: betsPlaced,
    total_stake: totalStake,
    total_return: parseFloat(totalReturn.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
    roi: parseFloat(roi.toFixed(4)),
    roi_percent: parseFloat((roi * 100).toFixed(2))
  };
}

/**
 * Calculates first set win rate
 */
function calculateFirstSetWinRate(matches) {
  let firstSetWins = 0;
  let firstSetLosses = 0;
  let matchesWithFirstSetWin = 0;
  let matchWinsAfterFirstSet = 0;

  for (const match of matches) {
    const isWinner = match.player_role === 'winner';
    const w1 = match.w1;
    const l1 = match.l1;
    
    if (w1 === null || l1 === null) continue;
    
    // Did player win first set?
    const playerWonFirstSet = (isWinner && w1 > l1) || (!isWinner && l1 > w1);
    
    if (playerWonFirstSet) {
      firstSetWins++;
      matchesWithFirstSetWin++;
      if (isWinner) matchWinsAfterFirstSet++;
    } else {
      firstSetLosses++;
    }
  }

  const total = firstSetWins + firstSetLosses;
  
  return {
    first_set_wins: firstSetWins,
    first_set_losses: firstSetLosses,
    first_set_win_rate: total > 0 ? firstSetWins / total : 0,
    match_win_after_first_set: matchesWithFirstSetWin > 0 
      ? matchWinsAfterFirstSet / matchesWithFirstSetWin 
      : 0
  };
}

/**
 * Calculates deciding set win rate
 */
function calculateDecidingSetWinRate(matches) {
  let decidingSetMatches = 0;
  let decidingSetWins = 0;

  for (const match of matches) {
    const isWinner = match.player_role === 'winner';
    const format = match.format;
    
    // Count sets to determine if deciding set
    let setsPlayer = 0;
    let setsOpponent = 0;
    
    for (let i = 1; i <= 5; i++) {
      const wGames = match[`w${i}`];
      const lGames = match[`l${i}`];
      
      if (wGames === null || lGames === null) break;
      
      if (isWinner) {
        if (wGames > lGames) setsPlayer++;
        else setsOpponent++;
      } else {
        if (lGames > wGames) setsPlayer++;
        else setsOpponent++;
      }
    }
    
    // Was there a deciding set?
    const isDecidingSet = (format === 'best_of_3' && setsPlayer === 1 && setsOpponent === 1) ||
                          (format === 'best_of_5' && setsPlayer === 2 && setsOpponent === 2);
    
    if (isDecidingSet || (setsPlayer + setsOpponent >= 3 && format === 'best_of_3')) {
      decidingSetMatches++;
      if (isWinner) decidingSetWins++;
    }
  }

  return {
    deciding_set_matches: decidingSetMatches,
    deciding_set_wins: decidingSetWins,
    deciding_set_win_rate: decidingSetMatches > 0 ? decidingSetWins / decidingSetMatches : 0
  };
}

// ============================================================================
// AGGREGATION BY CATEGORY
// ============================================================================

/**
 * Aggregates statistics by surface
 */
function aggregateBySurface(matches) {
  const surfaces = {};
  
  for (const surface of SURFACES) {
    const surfaceMatches = matches.filter(m => m.surface_normalized === surface);
    
    if (surfaceMatches.length === 0) continue;
    
    const wins = surfaceMatches.filter(m => m.player_role === 'winner').length;
    const comeback = calculateComebackRate(surfaceMatches);
    const roi = calculateROI(surfaceMatches);
    
    surfaces[surface] = {
      matches: surfaceMatches.length,
      wins,
      losses: surfaceMatches.length - wins,
      win_rate: surfaceMatches.length > 0 ? wins / surfaceMatches.length : 0,
      comeback_rate: comeback.comeback_rate,
      roi: roi.roi_percent
    };
  }
  
  return surfaces;
}

/**
 * Aggregates statistics by format (Bo3/Bo5)
 */
function aggregateByFormat(matches) {
  const formats = {};
  
  for (const format of FORMATS) {
    const formatMatches = matches.filter(m => m.format === format);
    
    if (formatMatches.length === 0) continue;
    
    const wins = formatMatches.filter(m => m.player_role === 'winner').length;
    
    // Calculate average sets
    let totalSets = 0;
    let tiebreakCount = 0;
    
    for (const match of formatMatches) {
      for (let i = 1; i <= 5; i++) {
        if (match[`w${i}`] !== null && match[`l${i}`] !== null) {
          totalSets++;
          if ((match[`w${i}`] === 7 && match[`l${i}`] === 6) || 
              (match[`w${i}`] === 6 && match[`l${i}`] === 7)) {
            tiebreakCount++;
          }
        }
      }
    }
    
    formats[format] = {
      matches: formatMatches.length,
      wins,
      losses: formatMatches.length - wins,
      win_rate: formatMatches.length > 0 ? wins / formatMatches.length : 0,
      avg_sets: formatMatches.length > 0 ? totalSets / formatMatches.length : 0,
      tiebreak_rate: totalSets > 0 ? tiebreakCount / totalSets : 0
    };
  }
  
  return formats;
}

/**
 * Aggregates statistics by series/tournament level
 */
function aggregateBySeries(matches) {
  const seriesStats = {};
  
  for (const series of SERIES) {
    const seriesMatches = matches.filter(m => m.series_normalized === series);
    
    if (seriesMatches.length === 0) continue;
    
    const wins = seriesMatches.filter(m => m.player_role === 'winner').length;
    
    // Count finals reached (round = 'The Final' or similar)
    const finalsReached = seriesMatches.filter(m => 
      m.round?.toLowerCase().includes('final') && 
      !m.round?.toLowerCase().includes('semi')
    ).length;
    
    seriesStats[series] = {
      matches: seriesMatches.length,
      wins,
      losses: seriesMatches.length - wins,
      win_rate: seriesMatches.length > 0 ? wins / seriesMatches.length : 0,
      finals_reached: finalsReached
    };
  }
  
  return seriesStats;
}

/**
 * Calculates special metrics
 */
function calculateSpecialMetrics(matches) {
  const comebackData = calculateComebackRate(matches);
  const firstSetData = calculateFirstSetWinRate(matches);
  const decidingSetData = calculateDecidingSetWinRate(matches);
  
  // Calculate break back rate (estimation from set patterns)
  // A break back is when a player loses set after leading
  let breakBackOpportunities = 0;
  let breakBacks = 0;
  
  for (const match of matches) {
    const isWinner = match.player_role === 'winner';
    
    // Check patterns like 6-4, 4-6, 7-5 (came back after losing set 2)
    for (let i = 2; i <= 5; i++) {
      const prevW = match[`w${i-1}`];
      const prevL = match[`l${i-1}`];
      const currW = match[`w${i}`];
      const currL = match[`l${i}`];
      
      if (prevW === null || prevL === null || currW === null || currL === null) break;
      
      // Player lost previous set but won current (break back metaphorically)
      const lostPrevSet = (isWinner && prevL > prevW) || (!isWinner && prevW > prevL);
      const wonCurrSet = (isWinner && currW > currL) || (!isWinner && currL > currW);
      
      if (lostPrevSet) {
        breakBackOpportunities++;
        if (wonCurrSet) breakBacks++;
      }
    }
  }
  
  return {
    first_set_win_rate: firstSetData.first_set_win_rate,
    match_win_after_first_set: firstSetData.match_win_after_first_set,
    comeback_rate: comebackData.comeback_rate,
    deciding_set_win_rate: decidingSetData.deciding_set_win_rate,
    break_back_rate: breakBackOpportunities > 0 ? breakBacks / breakBackOpportunities : 0,
    tiebreak_win_rate: calculateGlobalStats(matches).tiebreak_win_rate
  };
}

/**
 * Analyzes recent form (last N matches)
 */
function analyzeRecentForm(matches, count = 20) {
  // Sort by date descending
  const sorted = [...matches].sort((a, b) => {
    const dateA = new Date(a.date || a.tourney_date || 0);
    const dateB = new Date(b.date || b.tourney_date || 0);
    return dateB - dateA;
  });
  
  const recent = sorted.slice(0, count);
  const historical = sorted;
  
  const recentWinRate = recent.length > 0 
    ? recent.filter(m => m.player_role === 'winner').length / recent.length 
    : 0;
  
  const historicalWinRate = historical.length > 0
    ? historical.filter(m => m.player_role === 'winner').length / historical.length
    : 0;
  
  let trend = 'STABLE';
  if (recentWinRate > historicalWinRate + 0.08) trend = 'IMPROVING';
  else if (recentWinRate < historicalWinRate - 0.08) trend = 'DECLINING';
  
  return {
    recent_matches: recent.length,
    win_rate: recentWinRate,
    historical_win_rate: historicalWinRate,
    trend,
    streak: calculateCurrentStreak(recent)
  };
}

/**
 * Calculates current win/loss streak
 */
function calculateCurrentStreak(sortedMatches) {
  if (sortedMatches.length === 0) return { type: 'none', count: 0 };
  
  const firstResult = sortedMatches[0].player_role;
  let count = 0;
  
  for (const match of sortedMatches) {
    if (match.player_role === firstResult) {
      count++;
    } else {
      break;
    }
  }
  
  return {
    type: firstResult === 'winner' ? 'W' : 'L',
    count
  };
}

// ============================================================================
// MAIN EXPORT FUNCTIONS
// ============================================================================

/**
 * Generates complete player profile with all aggregated statistics
 * 
 * @param {string} playerName - Player name to analyze
 * @param {Object} options - Options { surface?, format?, minMatches? }
 * @returns {Promise<Object>} Complete player profile
 */
async function getPlayerProfile(playerName, options = {}) {
  const startTime = Date.now();
  
  // Fetch all matches
  let matches = await getPlayerMatches(playerName);
  
  if (matches.length === 0) {
    return {
      player: { name: playerName },
      error: 'No matches found',
      calculated_at: new Date().toISOString()
    };
  }
  
  // Apply filters if provided
  if (options.surface) {
    matches = matches.filter(m => m.surface_normalized === normalizeSurface(options.surface));
  }
  if (options.format) {
    matches = matches.filter(m => m.format === options.format);
  }
  if (options.series) {
    matches = matches.filter(m => m.series_normalized === normalizeSeries(options.series));
  }
  
  // Calculate all metrics
  const profile = {
    player: {
      name: playerName,
      matches_analyzed: matches.length
    },
    
    global: calculateGlobalStats(matches),
    
    by_surface: aggregateBySurface(matches),
    
    by_format: aggregateByFormat(matches),
    
    by_series: aggregateBySeries(matches),
    
    special_metrics: calculateSpecialMetrics(matches),
    
    recent_form: analyzeRecentForm(matches, options.recentCount || 20),
    
    roi: calculateROI(matches),
    
    // Metadata
    calculated_at: new Date().toISOString(),
    calculation_time_ms: Date.now() - startTime
  };
  
  return profile;
}

/**
 * Compares two player profiles
 * 
 * @param {string} player1Name - First player
 * @param {string} player2Name - Second player
 * @param {Object} options - Options { surface?, format? }
 * @returns {Promise<Object>} Comparison object
 */
async function compareProfiles(player1Name, player2Name, options = {}) {
  const [profile1, profile2] = await Promise.all([
    getPlayerProfile(player1Name, options),
    getPlayerProfile(player2Name, options)
  ]);
  
  // Calculate advantages
  const surface = options.surface ? normalizeSurface(options.surface) : null;
  
  const comparison = {
    player1: profile1,
    player2: profile2,
    
    head_to_head: {
      // Would need H2H data from database
      note: 'H2H requires separate query'
    },
    
    advantages: {
      win_rate: {
        leader: profile1.global.win_rate > profile2.global.win_rate ? player1Name : player2Name,
        difference: Math.abs(profile1.global.win_rate - profile2.global.win_rate)
      },
      
      surface_win_rate: surface && profile1.by_surface[surface] && profile2.by_surface[surface] ? {
        leader: profile1.by_surface[surface].win_rate > profile2.by_surface[surface].win_rate 
          ? player1Name : player2Name,
        difference: Math.abs(
          profile1.by_surface[surface].win_rate - profile2.by_surface[surface].win_rate
        )
      } : null,
      
      comeback_rate: {
        leader: profile1.special_metrics.comeback_rate > profile2.special_metrics.comeback_rate 
          ? player1Name : player2Name,
        difference: Math.abs(
          profile1.special_metrics.comeback_rate - profile2.special_metrics.comeback_rate
        )
      },
      
      recent_form: {
        leader: profile1.recent_form.win_rate > profile2.recent_form.win_rate 
          ? player1Name : player2Name,
        player1_trend: profile1.recent_form.trend,
        player2_trend: profile2.recent_form.trend
      }
    },
    
    calculated_at: new Date().toISOString()
  };
  
  return comparison;
}

/**
 * Gets surface-specific profile for a player
 */
async function getSurfaceProfile(playerName, surface) {
  return getPlayerProfile(playerName, { surface: normalizeSurface(surface) });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main functions
  getPlayerProfile,
  compareProfiles,
  getSurfaceProfile,
  
  // Utility functions
  getPlayerMatches,
  normalizePlayerName,
  normalizeSurface,
  normalizeSeries,
  
  // Calculation functions (for testing/reuse)
  calculateGlobalStats,
  calculateComebackRate,
  calculateROI,
  calculateFirstSetWinRate,
  calculateDecidingSetWinRate,
  calculateSpecialMetrics,
  analyzeRecentForm,
  aggregateBySurface,
  aggregateByFormat,
  aggregateBySeries
};
