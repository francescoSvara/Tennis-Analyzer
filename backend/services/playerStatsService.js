/**
 * Player Stats Service
 * Calcola statistiche aggregate per giocatore dai dati storici (2700+ match)
 * 
 * Metriche calcolate:
 * - Win rate per superficie (Hard, Clay, Grass)
 * - Comeback rate (% vittorie dopo perdita set 1)
 * - ROI con stake fisso
 * - Statistiche per formato (Bo3, Bo5) e serie (GS, M1000, etc.)
 */

const { supabase } = require('../db/supabase');

/**
 * Normalizza il nome di un giocatore per il matching
 * Gestisce formati: "Sinner J." vs "Jannik Sinner"
 */
function normalizePlayerName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[''`\.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Estrae il cognome da un nome (per matching fuzzy)
 */
function extractLastName(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  
  // Formato "Cognome I" (xlsx) - prima parte è cognome
  if (parts.length >= 2 && parts[parts.length - 1].length <= 2) {
    return parts[0].toLowerCase();
  }
  
  // Formato "Nome Cognome" - ultima parte è cognome
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Verifica se un giocatore corrisponde a un nome (matching fuzzy)
 */
function playerMatches(playerName, searchName) {
  const normalizedPlayer = normalizePlayerName(playerName);
  const normalizedSearch = normalizePlayerName(searchName);
  
  // Match esatto
  if (normalizedPlayer.includes(normalizedSearch) || normalizedSearch.includes(normalizedPlayer)) {
    return true;
  }
  
  // Match per cognome
  const playerLastName = extractLastName(playerName);
  const searchLastName = extractLastName(searchName);
  
  return playerLastName === searchLastName && playerLastName.length > 2;
}

/**
 * Recupera tutti i match di un giocatore
 * Searches BOTH by winner_name/loser_name (xlsx) AND by player_id (sofascore)
 * This ensures all matches are found regardless of data source
 * 
 * @param {string} playerName - Nome del giocatore da cercare
 * @returns {Array} Lista dei match
 */
async function getPlayerMatches(playerName) {
  if (!supabase) {
    console.warn('⚠️ Supabase not available');
    return [];
  }

  const searchName = normalizePlayerName(playerName);
  const lastName = extractLastName(playerName);

  console.log(`🔍 [Stats] Searching matches for "${playerName}" (lastName: ${lastName})`);

  // ===== STRATEGY 1: Search by player_id directly (primary strategy for matches_new) =====
  // Note: matches_new uses player1_id/player2_id instead of winner_name/loser_name
  // First get player IDs from players_new
  const { data: players, error: playerErr } = await supabase
    .from('players_new')
    .select('id, name, full_name')
    .or(`name.ilike.%${lastName}%,full_name.ilike.%${lastName}%`);
  
  if (playerErr) console.error('Error fetching players:', playerErr.message);
  
  // Filter to actual matching players
  const matchingPlayerIds = (players || [])
    .filter(p => playerMatches(p.name, playerName) || playerMatches(p.full_name, playerName))
    .map(p => p.id);

  // Skip legacy winner_name/loser_name search as matches_new doesn't have these columns
  let matchesWinner = [];
  let matchesLoser = [];
  const err1 = null;
  const err2 = null;

  if (err1) console.error('Error fetching winner matches:', err1.message);
  if (err2) console.error('Error fetching loser matches:', err2.message);
  
  // ===== STRATEGY 2: Search by player_id in matches_new =====
  // matches_new uses player1_id and player2_id columns
  let matchesByPlayerId = [];
  if (matchingPlayerIds.length > 0) {
    const { data: player1Matches, error: p1Err } = await supabase
      .from('matches_new')
      .select(`
        *,
        player1:players_new!matches_new_player1_id_fkey(id, name, full_name),
        player2:players_new!matches_new_player2_id_fkey(id, name, full_name)
      `)
      .in('player1_id', matchingPlayerIds);
    
    const { data: player2Matches, error: p2Err } = await supabase
      .from('matches_new')
      .select(`
        *,
        player1:players_new!matches_new_player1_id_fkey(id, name, full_name),
        player2:players_new!matches_new_player2_id_fkey(id, name, full_name)
      `)
      .in('player2_id', matchingPlayerIds);
    
    if (p1Err) console.error('Error fetching player1 matches:', p1Err.message);
    if (p2Err) console.error('Error fetching player2 matches:', p2Err.message);
    
    matchesByPlayerId = [...(player1Matches || []), ...(player2Matches || [])];
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
    
    // Determine player role
    let isWinner = false;
    let isLoser = false;
    
    // Check winner_name/loser_name first (xlsx format)
    if (match.winner_name && playerMatches(match.winner_name, playerName)) {
      isWinner = true;
    } else if (match.loser_name && playerMatches(match.loser_name, playerName)) {
      isLoser = true;
    }
    
    // Check by player_id if not found by name (matches_new format)
    if (!isWinner && !isLoser && matchingPlayerIds.length > 0) {
      const isPlayer1 = matchingPlayerIds.includes(match.player1_id);
      const isPlayer2 = matchingPlayerIds.includes(match.player2_id);
      
      if (isPlayer1 || isPlayer2) {
        const winnerCode = match.winner_code;
        if (winnerCode === 1 && isPlayer1) isWinner = true;
        else if (winnerCode === 2 && isPlayer2) isWinner = true;
        else if (winnerCode === 1 && isPlayer2) isLoser = true;
        else if (winnerCode === 2 && isPlayer1) isLoser = true;
        else {
          // Fallback: check sets (matches_new uses sets_player1/sets_player2)
          const p1Sets = match.sets_player1 || 0;
          const p2Sets = match.sets_player2 || 0;
          if (p1Sets > p2Sets && isPlayer1) isWinner = true;
          else if (p2Sets > p1Sets && isPlayer2) isWinner = true;
          else if (p1Sets > p2Sets && isPlayer2) isLoser = true;
          else if (p2Sets > p1Sets && isPlayer1) isLoser = true;
        }
      }
    }
    
    // Check player1/player2 objects from join (matches_new format)
    if (!isWinner && !isLoser) {
      const p1Name = match.player1?.name || match.player1?.full_name;
      const p2Name = match.player2?.name || match.player2?.full_name;
      
      if (p1Name && playerMatches(p1Name, playerName)) {
        const winnerCode = match.winner_code;
        isWinner = winnerCode === 1;
        isLoser = winnerCode === 2;
      } else if (p2Name && playerMatches(p2Name, playerName)) {
        const winnerCode = match.winner_code;
        isWinner = winnerCode === 2;
        isLoser = winnerCode === 1;
      }
    }
    
    if (isWinner || isLoser) {
      uniqueMatches.set(match.id, {
        ...match,
        player_role: isWinner ? 'winner' : 'loser'
      });
    }
  }

  const result = Array.from(uniqueMatches.values());
  console.log(`   ✅ [Stats] Total matches: ${result.length} (${result.filter(m => m.player_role === 'winner').length}W - ${result.filter(m => m.player_role === 'loser').length}L)`);
  
  return result;
}

/**
 * Calcola il comeback rate (vittorie dopo aver perso il set 1)
 * Un comeback = winner_sets > loser_sets AND l1 > w1
 */
function calculateComebackRate(matches, playerName) {
  let winsAfterLosingSet1 = 0;
  let lossesSet1 = 0;

  for (const match of matches) {
    const isWinner = match.player_role === 'winner';
    
    // Verifica se ha perso il set 1
    // w1, l1 sono dal punto di vista del WINNER
    // Se il player è winner e l1 > w1 → ha perso set 1 e poi vinto
    // Se il player è loser e w1 > l1 → ha perso set 1 (il winner gli ha preso il set1)
    
    if (isWinner) {
      // Il winner ha perso il primo set se l1 > w1
      if (match.l1 > match.w1) {
        lossesSet1++;
        winsAfterLosingSet1++; // Ha vinto il match dopo aver perso set 1
      }
    } else {
      // Il loser ha perso il primo set se w1 > l1
      if (match.w1 > match.l1) {
        lossesSet1++;
        // Non ha fatto comeback (ha perso il match)
      }
    }
  }

  return {
    total_lost_set1: lossesSet1,
    comebacks: winsAfterLosingSet1,
    comeback_rate: lossesSet1 > 0 ? winsAfterLosingSet1 / lossesSet1 : 0
  };
}

/**
 * Calcola ROI con stake fisso (1 unità per match)
 * ROI = (profitto totale / stake totale) * 100
 */
function calculateROI(matches, playerName, oddsField = 'odds_b365') {
  let totalStake = 0;
  let totalReturn = 0;
  let betsPlaced = 0;

  for (const match of matches) {
    const isWinner = match.player_role === 'winner';
    
    // Prendi la quota appropriata
    const odds = isWinner 
      ? match[`${oddsField}_winner`] 
      : match[`${oddsField}_loser`];
    
    if (!odds || odds <= 1) continue; // Skip se no quota valida
    
    totalStake += 1; // Stake fisso 1 unità
    betsPlaced++;
    
    if (isWinner) {
      totalReturn += odds; // Vinto: ritorno = quota
    }
    // Se perso: ritorno = 0
  }

  const profit = totalReturn - totalStake;
  const roi = totalStake > 0 ? (profit / totalStake) : 0;

  return {
    bets_placed: betsPlaced,
    total_stake: totalStake,
    total_return: parseFloat(totalReturn.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
    roi: parseFloat(roi.toFixed(4)), // es: 0.0523 = 5.23%
    roi_percent: parseFloat((roi * 100).toFixed(2))
  };
}

/**
 * Raggruppa statistiche per superficie
 */
function groupBySurface(matches) {
  const surfaces = {};
  
  for (const match of matches) {
    const surface = match.surface || 'Unknown';
    if (!surfaces[surface]) {
      surfaces[surface] = {
        matches: [],
        wins: 0,
        losses: 0
      };
    }
    
    surfaces[surface].matches.push(match);
    if (match.player_role === 'winner') {
      surfaces[surface].wins++;
    } else {
      surfaces[surface].losses++;
    }
  }

  // Calcola statistiche per ogni superficie
  const result = {};
  for (const [surface, data] of Object.entries(surfaces)) {
    const comebackData = calculateComebackRate(data.matches, '');
    const roiData = calculateROI(data.matches, '');
    
    // Calcola quote medie
    let oddsWhenWon = [];
    let oddsWhenLost = [];
    
    for (const match of data.matches) {
      const odds = match.player_role === 'winner' 
        ? match.odds_b365_winner 
        : match.odds_b365_loser;
      
      if (odds && odds > 1) {
        if (match.player_role === 'winner') {
          oddsWhenWon.push(odds);
        } else {
          oddsWhenLost.push(odds);
        }
      }
    }

    result[surface] = {
      matches: data.matches.length,
      wins: data.wins,
      losses: data.losses,
      win_rate: data.matches.length > 0 
        ? parseFloat((data.wins / data.matches.length).toFixed(4)) 
        : 0,
      comeback_rate: comebackData.comeback_rate,
      comebacks: comebackData.comebacks,
      lost_set1_total: comebackData.total_lost_set1,
      avg_odds_when_won: oddsWhenWon.length > 0 
        ? parseFloat((oddsWhenWon.reduce((a, b) => a + b, 0) / oddsWhenWon.length).toFixed(2))
        : null,
      avg_odds_when_lost: oddsWhenLost.length > 0
        ? parseFloat((oddsWhenLost.reduce((a, b) => a + b, 0) / oddsWhenLost.length).toFixed(2))
        : null,
      roi: roiData
    };
  }

  return result;
}

/**
 * Raggruppa statistiche per formato (Best of 3 vs Best of 5)
 */
function groupByFormat(matches) {
  const formats = {
    'best_of_3': { matches: [], wins: 0, losses: 0 },
    'best_of_5': { matches: [], wins: 0, losses: 0 }
  };

  for (const match of matches) {
    const format = match.best_of === 5 ? 'best_of_5' : 'best_of_3';
    formats[format].matches.push(match);
    if (match.player_role === 'winner') {
      formats[format].wins++;
    } else {
      formats[format].losses++;
    }
  }

  const result = {};
  for (const [format, data] of Object.entries(formats)) {
    if (data.matches.length === 0) continue;
    
    const comebackData = calculateComebackRate(data.matches, '');
    
    result[format] = {
      matches: data.matches.length,
      wins: data.wins,
      losses: data.losses,
      win_rate: parseFloat((data.wins / data.matches.length).toFixed(4)),
      comeback_rate: comebackData.comeback_rate
    };
  }

  return result;
}

/**
 * Raggruppa statistiche per serie torneo
 */
function groupBySeries(matches) {
  const series = {};

  for (const match of matches) {
    const seriesName = match.series || 'Unknown';
    if (!series[seriesName]) {
      series[seriesName] = { matches: [], wins: 0, losses: 0 };
    }
    
    series[seriesName].matches.push(match);
    if (match.player_role === 'winner') {
      series[seriesName].wins++;
    } else {
      series[seriesName].losses++;
    }
  }

  const result = {};
  for (const [seriesName, data] of Object.entries(series)) {
    if (data.matches.length === 0) continue;
    
    result[seriesName] = {
      matches: data.matches.length,
      wins: data.wins,
      losses: data.losses,
      win_rate: parseFloat((data.wins / data.matches.length).toFixed(4))
    };
  }

  return result;
}

/**
 * Calcola statistiche complete per un giocatore
 * @param {string} playerName - Nome del giocatore
 * @returns {Object} Statistiche complete
 */
async function getPlayerStats(playerName) {
  console.log(`📊 Calculating stats for: ${playerName}`);
  
  const matches = await getPlayerMatches(playerName);
  
  if (matches.length === 0) {
    return {
      player_name: playerName,
      error: 'No matches found',
      total_matches: 0
    };
  }

  console.log(`   Found ${matches.length} matches`);

  // Calcola statistiche generali
  const wins = matches.filter(m => m.player_role === 'winner').length;
  const losses = matches.filter(m => m.player_role === 'loser').length;
  const overallComeback = calculateComebackRate(matches, playerName);
  const overallROI = calculateROI(matches, playerName);

  // Calcola ranking medio (quando disponibile)
  const rankings = matches
    .map(m => m.player_role === 'winner' ? m.winner_rank : m.loser_rank)
    .filter(r => r && r > 0);
  
  const avgRanking = rankings.length > 0
    ? Math.round(rankings.reduce((a, b) => a + b, 0) / rankings.length)
    : null;

  // Date range dei match
  const dates = matches
    .map(m => m.start_time)
    .filter(d => d)
    .sort();

  return {
    player_name: playerName,
    total_matches: matches.length,
    date_range: {
      first_match: dates[0] || null,
      last_match: dates[dates.length - 1] || null
    },
    
    // Statistiche per superficie
    surfaces: groupBySurface(matches),
    
    // Statistiche per formato
    formats: groupByFormat(matches),
    
    // Statistiche per serie torneo
    series: groupBySeries(matches),
    
    // Statistiche overall
    overall: {
      wins,
      losses,
      win_rate: parseFloat((wins / matches.length).toFixed(4)),
      comeback_rate: overallComeback.comeback_rate,
      comebacks: overallComeback.comebacks,
      lost_set1_total: overallComeback.total_lost_set1,
      avg_ranking: avgRanking,
      roi: overallROI
    },

    // Metadata
    generated_at: new Date().toISOString(),
    data_source: 'historical_matches_db'
  };
}

/**
 * Cerca giocatori per nome (autocomplete)
 * Restituisce oggetti con { name, totalMatches, winRate }
 */
async function searchPlayers(query, limit = 10) {
  if (!supabase || !query || query.length < 2) return [];

  // Cerca in players_new (schema corretto)
  const { data: playersData } = await supabase
    .from('players_new')
    .select('id, name, full_name')
    .or(`name.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(100);

  // DEDUPLICAZIONE: raggruppa giocatori con stesso nome (possono esserci duplicati nel DB)
  const playersByName = new Map();
  for (const player of playersData || []) {
    const displayName = player.full_name || player.name;
    const normalizedName = displayName.toLowerCase().trim();
    
    if (!playersByName.has(normalizedName)) {
      playersByName.set(normalizedName, {
        ids: [player.id],
        name: displayName
      });
    } else {
      playersByName.get(normalizedName).ids.push(player.id);
    }
  }

  // Per ogni giocatore unico, conta wins e losses da matches_new
  const playerStats = [];
  for (const [, playerData] of playersByName) {
    let totalWins = 0;
    let totalLosses = 0;
    
    // Conta match per tutti gli ID associati a questo nome
    for (const playerId of playerData.ids) {
      // Conta match come player1
      const { count: p1Wins } = await supabase
        .from('matches_new')
        .select('*', { count: 'exact', head: true })
        .eq('player1_id', playerId)
        .eq('winner_code', 1);
      
      const { count: p1Losses } = await supabase
        .from('matches_new')
        .select('*', { count: 'exact', head: true })
        .eq('player1_id', playerId)
        .eq('winner_code', 2);

      // Conta match come player2
      const { count: p2Wins } = await supabase
        .from('matches_new')
        .select('*', { count: 'exact', head: true })
        .eq('player2_id', playerId)
        .eq('winner_code', 2);
      
      const { count: p2Losses } = await supabase
        .from('matches_new')
        .select('*', { count: 'exact', head: true })
        .eq('player2_id', playerId)
        .eq('winner_code', 1);

      totalWins += (p1Wins || 0) + (p2Wins || 0);
      totalLosses += (p1Losses || 0) + (p2Losses || 0);
    }

    const totalMatches = totalWins + totalLosses;

    if (totalMatches > 0) {
      playerStats.push({
        name: playerData.name,
        totalMatches,
        wins: totalWins,
        losses: totalLosses,
        winRate: totalWins / totalMatches
      });
    }
  }

  // Ordina i risultati
  const players = playerStats
    .sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const qLower = query.toLowerCase();
      
      // Priorità 1: Match esatto del nome/cognome
      const aExactMatch = aLower.split(' ').some(part => part === qLower);
      const bExactMatch = bLower.split(' ').some(part => part === qLower);
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      // Priorità 2: Chi inizia con la query
      if (aLower.startsWith(qLower) && !bLower.startsWith(qLower)) return -1;
      if (!aLower.startsWith(qLower) && bLower.startsWith(qLower)) return 1;
      
      // Priorità 3: Cognome che inizia con la query
      const aLastNameMatch = aLower.split(' ').pop().startsWith(qLower);
      const bLastNameMatch = bLower.split(' ').pop().startsWith(qLower);
      if (aLastNameMatch && !bLastNameMatch) return -1;
      if (!aLastNameMatch && bLastNameMatch) return 1;
      
      // Poi per numero di match (più dati = più rilevante)
      return b.totalMatches - a.totalMatches;
    })
    .slice(0, limit);

  return players;
}

/**
 * Ottieni statistiche H2H REALI cercando le partite tra due giocatori nel DB
 * Cerca in entrambe le direzioni: player1 vs player2 e player2 vs player1
 */
async function getHeadToHeadStats(player1, player2) {
  if (!supabase) {
    console.warn('⚠️ Supabase not available for H2H');
    return { totalMatches: 0, player1Wins: 0, player2Wins: 0, matches: [] };
  }

  const lastName1 = extractLastName(player1);
  const lastName2 = extractLastName(player2);

  console.log(`🎾 [H2H] Searching matches: "${player1}" (${lastName1}) vs "${player2}" (${lastName2})`);

  // matches_new non ha winner_name/loser_name, skip legacy search
  let matches1wins = [];
  let matches2wins = [];

  // ===== STRATEGY: Cerca per player_id in matches_new =====
  // Prima trova gli ID dei giocatori in players_new
  const { data: players1 } = await supabase
    .from('players_new')
    .select('id, name, full_name')
    .or(`name.ilike.%${lastName1}%,full_name.ilike.%${lastName1}%`);

  const { data: players2 } = await supabase
    .from('players_new')
    .select('id, name, full_name')
    .or(`name.ilike.%${lastName2}%,full_name.ilike.%${lastName2}%`);

  // Filtra per match effettivo
  const matchingIds1 = (players1 || [])
    .filter(p => playerMatches(p.name, player1) || playerMatches(p.full_name, player1))
    .map(p => p.id);
  
  const matchingIds2 = (players2 || [])
    .filter(p => playerMatches(p.name, player2) || playerMatches(p.full_name, player2))
    .map(p => p.id);

  let matchesByPlayerId = [];
  
  if (matchingIds1.length > 0 && matchingIds2.length > 0) {
    // Player1 as player1_id, Player2 as player2_id
    const { data: p1p2Matches } = await supabase
      .from('matches_new')
      .select(`*, player1:players_new!matches_new_player1_id_fkey(id, name), player2:players_new!matches_new_player2_id_fkey(id, name)`)
      .in('player1_id', matchingIds1)
      .in('player2_id', matchingIds2);

    // Player2 as player1_id, Player1 as player2_id
    const { data: p2p1Matches } = await supabase
      .from('matches_new')
      .select(`*, player1:players_new!matches_new_player1_id_fkey(id, name), player2:players_new!matches_new_player2_id_fkey(id, name)`)
      .in('player1_id', matchingIds2)
      .in('player2_id', matchingIds1);

    matchesByPlayerId = [...(p1p2Matches || []), ...(p2p1Matches || [])];
  }

  // ===== COMBINE E DEDUPLICA =====
  const allMatches = [
    ...(matches1wins || []),
    ...(matches2wins || []),
    ...matchesByPlayerId
  ];

  const uniqueMatches = new Map();
  let player1Wins = 0;
  let player2Wins = 0;
  const h2hMatches = [];

  for (const match of allMatches) {
    if (uniqueMatches.has(match.id)) continue;

    // Verifica che ENTRAMBI i giocatori siano nel match (usando player1_id/player2_id)
    const hasPlayer1 = 
      matchingIds1.includes(match.player1_id) ||
      matchingIds1.includes(match.player2_id);

    const hasPlayer2 = 
      matchingIds2.includes(match.player1_id) ||
      matchingIds2.includes(match.player2_id);

    if (!hasPlayer1 || !hasPlayer2) continue;

    uniqueMatches.set(match.id, match);

    // Determina chi ha vinto usando player1_id/player2_id e winner_code
    let p1Won = false;
    let p2Won = false;

    // Check by player_id + winner_code (matches_new format)
    if (!p1Won && !p2Won && match.winner_code) {
      const p1IsPlayer1 = matchingIds1.includes(match.player1_id);
      const p1IsPlayer2 = matchingIds1.includes(match.player2_id);
      
      if (match.winner_code === 1 && p1IsPlayer1) p1Won = true;
      else if (match.winner_code === 2 && p1IsPlayer2) p1Won = true;
      else if (match.winner_code === 1 && !p1IsPlayer1) p2Won = true;
      else if (match.winner_code === 2 && !p1IsPlayer2) p2Won = true;
    }

    // Fallback: check sets won (matches_new uses sets_player1/sets_player2)
    if (!p1Won && !p2Won) {
      const p1Sets = match.sets_player1 || 0;
      const p2Sets = match.sets_player2 || 0;
      const p1IsPlayer1 = matchingIds1.includes(match.player1_id);
      
      if (p1Sets > p2Sets) {
        p1Won = p1IsPlayer1;
        p2Won = !p1IsPlayer1;
      } else if (p2Sets > p1Sets) {
        p1Won = !p1IsPlayer1;
        p2Won = p1IsPlayer1;
      }
    }

    if (p1Won) player1Wins++;
    if (p2Won) player2Wins++;

    h2hMatches.push({
      id: match.id,
      date: match.match_date || match.start_timestamp,
      tournament: match.tournament_id,
      surface: match.surface,
      winner: p1Won ? player1 : (p2Won ? player2 : 'Unknown'),
      score: match.score || `${match.sets_player1 || 0}-${match.sets_player2 || 0}`,
      round: match.round
    });
  }

  // Sort by date descending (most recent first)
  h2hMatches.sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log(`   ✅ [H2H] Found ${h2hMatches.length} matches: ${player1} ${player1Wins} - ${player2Wins} ${player2}`);

  return {
    player1: { name: player1 },
    player2: { name: player2 },
    totalMatches: h2hMatches.length,
    player1Wins,
    player2Wins,
    matches: h2hMatches.slice(0, 20) // Limita a 20 match più recenti
  };
}

// ============================================================================
// SURFACE ANALYSIS (FILOSOFIA_STATS surface splits)
// ============================================================================

/**
 * Sample size thresholds for surface analysis
 */
const SURFACE_SAMPLE_THRESHOLDS = {
  MIN_SAMPLE: 8,           // Minimum matches for valid analysis
  LOW_SAMPLE_WARN: 15,     // Below this, flag as LOW_SAMPLE
  OK_SAMPLE: 25            // Above this, sample is good
};

/**
 * Normalize surface name
 */
function normalizeSurface(surface) {
  if (!surface) return 'unknown';
  const s = surface.toLowerCase().trim();
  
  if (s.includes('hard')) return 'hard';
  if (s.includes('clay')) return 'clay';
  if (s.includes('grass')) return 'grass';
  if (s.includes('carpet')) return 'carpet';
  
  return s;
}

/**
 * Calculate surface splits for a player
 * 
 * Returns win rate, hold/break rates (if available), with sample flags
 * 
 * ANTI-BIAS RULES:
 * - sampleFlag = "LOW_SAMPLE" if matches < 8
 * - sampleFlag = "OK" if matches >= 8
 * - Supports time windows: career, last_52_weeks, last_24_months
 * 
 * @param {string} playerName - Player name to search
 * @param {Object} options - Options
 * @param {string} [options.window='career'] - Time window: 'career' | 'last_52_weeks' | 'last_24_months'
 * @returns {Object} Surface splits { hard, clay, grass } with sampleFlag
 */
async function calculateSurfaceSplits(playerName, options = {}) {
  const { window = 'career' } = options;
  
  // Get all matches for player
  let matches = await getPlayerMatches(playerName);
  
  if (!matches || matches.length === 0) {
    return {
      hard: { matches: 0, winRate: 0, sampleFlag: 'NO_DATA' },
      clay: { matches: 0, winRate: 0, sampleFlag: 'NO_DATA' },
      grass: { matches: 0, winRate: 0, sampleFlag: 'NO_DATA' },
      window,
      totalMatches: 0
    };
  }
  
  // Apply time window filter
  const now = new Date();
  if (window === 'last_52_weeks') {
    const cutoff = new Date(now.getTime() - 52 * 7 * 24 * 60 * 60 * 1000);
    matches = matches.filter(m => {
      const matchDate = new Date(m.start_time || m.date || m.match_date);
      return matchDate >= cutoff;
    });
  } else if (window === 'last_24_months') {
    const cutoff = new Date(now.getTime() - 24 * 30 * 24 * 60 * 60 * 1000);
    matches = matches.filter(m => {
      const matchDate = new Date(m.start_time || m.date || m.match_date);
      return matchDate >= cutoff;
    });
  }
  
  // Group by surface
  const surfaces = {
    hard: { wins: 0, losses: 0, matches: [] },
    clay: { wins: 0, losses: 0, matches: [] },
    grass: { wins: 0, losses: 0, matches: [] }
  };
  
  for (const match of matches) {
    const surface = normalizeSurface(match.surface);
    
    if (!surfaces[surface]) {
      surfaces[surface] = { wins: 0, losses: 0, matches: [] };
    }
    
    surfaces[surface].matches.push(match);
    
    if (match.player_role === 'winner') {
      surfaces[surface].wins++;
    } else {
      surfaces[surface].losses++;
    }
  }
  
  // Build result with sample flags
  const result = {
    window,
    totalMatches: matches.length
  };
  
  for (const [surface, data] of Object.entries(surfaces)) {
    const matchCount = data.matches.length;
    const winRate = matchCount > 0 ? data.wins / matchCount : 0;
    
    // Determine sample flag
    let sampleFlag;
    if (matchCount === 0) {
      sampleFlag = 'NO_DATA';
    } else if (matchCount < SURFACE_SAMPLE_THRESHOLDS.MIN_SAMPLE) {
      sampleFlag = 'LOW_SAMPLE';
    } else if (matchCount < SURFACE_SAMPLE_THRESHOLDS.LOW_SAMPLE_WARN) {
      sampleFlag = 'SMALL_SAMPLE';
    } else {
      sampleFlag = 'OK';
    }
    
    // Calculate hold/break rates from statistics if available (future enhancement)
    // For now, use estimate from win rate
    let holdRate = null;
    let breakRate = null;
    
    // Estimate hold/break from win rate (rough approximation)
    // Better players hold more and break more
    if (matchCount >= SURFACE_SAMPLE_THRESHOLDS.MIN_SAMPLE) {
      // Hold rate typically 70-90% for pros, correlates with win rate
      holdRate = 0.70 + (winRate * 0.20);
      // Break rate typically 15-35% for pros
      breakRate = 0.15 + (winRate * 0.20);
    }
    
    result[surface] = {
      matches: matchCount,
      wins: data.wins,
      losses: data.losses,
      winRate: parseFloat(winRate.toFixed(4)),
      winRatePercent: parseFloat((winRate * 100).toFixed(1)),
      holdRate: holdRate ? parseFloat(holdRate.toFixed(4)) : null,
      breakRate: breakRate ? parseFloat(breakRate.toFixed(4)) : null,
      sampleFlag,
      // Include recent form if we have recent matches
      recentForm: data.matches.slice(-5).map(m => m.player_role === 'winner' ? 'W' : 'L').reverse()
    };
  }
  
  return result;
}

/**
 * Get surface splits for both players in a match
 * 
 * @param {string} player1Name - Player 1 name
 * @param {string} player2Name - Player 2 name
 * @param {string} matchSurface - Surface of current match (for highlighting)
 * @param {Object} options - Options passed to calculateSurfaceSplits
 * @returns {Object} { playerA: surfaceSplits, playerB: surfaceSplits, matchSurface }
 */
async function getMatchSurfaceSplits(player1Name, player2Name, matchSurface, options = {}) {
  const [player1Splits, player2Splits] = await Promise.all([
    calculateSurfaceSplits(player1Name, options),
    calculateSurfaceSplits(player2Name, options)
  ]);
  
  const normalizedSurface = normalizeSurface(matchSurface);
  
  return {
    playerA: player1Splits,
    playerB: player2Splits,
    matchSurface: normalizedSurface,
    // Quick comparison for current surface
    comparison: {
      surface: normalizedSurface,
      playerA: player1Splits[normalizedSurface] || null,
      playerB: player2Splits[normalizedSurface] || null,
      advantage: calculateSurfaceAdvantage(
        player1Splits[normalizedSurface], 
        player2Splits[normalizedSurface]
      )
    }
  };
}

/**
 * Calculate which player has advantage on surface
 */
function calculateSurfaceAdvantage(p1Stats, p2Stats) {
  if (!p1Stats || !p2Stats) return null;
  if (p1Stats.sampleFlag === 'NO_DATA' || p2Stats.sampleFlag === 'NO_DATA') return null;
  
  // Low sample warning
  const lowSample = p1Stats.sampleFlag === 'LOW_SAMPLE' || p2Stats.sampleFlag === 'LOW_SAMPLE';
  
  const diff = p1Stats.winRate - p2Stats.winRate;
  
  let advantage = 'even';
  if (diff > 0.10) advantage = 'playerA';
  else if (diff < -0.10) advantage = 'playerB';
  else if (diff > 0.05) advantage = 'slight_playerA';
  else if (diff < -0.05) advantage = 'slight_playerB';
  
  return {
    advantage,
    winRateDiff: parseFloat(diff.toFixed(4)),
    lowSampleWarning: lowSample
  };
}

module.exports = {
  getPlayerStats,
  getPlayerMatches,
  searchPlayers,
  getHeadToHeadStats,
  calculateH2H: getHeadToHeadStats, // alias FILOSOFIA_STATS
  calculateComebackRate,
  calculateROI,
  // Surface analysis (new)
  calculateSurfaceSplits,
  getMatchSurfaceSplits,
  normalizeSurface,
  SURFACE_SAMPLE_THRESHOLDS
};
