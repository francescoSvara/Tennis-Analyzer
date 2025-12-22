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

  // Query ampia per prendere candidati (il DB non supporta ILIKE complesso)
  const { data: matchesWinner, error: err1 } = await supabase
    .from('matches')
    .select('*')
    .ilike('winner_name', `%${lastName}%`);

  const { data: matchesLoser, error: err2 } = await supabase
    .from('matches')
    .select('*')
    .ilike('loser_name', `%${lastName}%`);

  if (err1) console.error('Error fetching winner matches:', err1.message);
  if (err2) console.error('Error fetching loser matches:', err2.message);

  // Combina e filtra con matching preciso
  const allMatches = [...(matchesWinner || []), ...(matchesLoser || [])];
  
  // Rimuovi duplicati e filtra per match reale
  const uniqueMatches = new Map();
  
  for (const match of allMatches) {
    if (uniqueMatches.has(match.id)) continue;
    
    const isWinner = playerMatches(match.winner_name, playerName);
    const isLoser = playerMatches(match.loser_name, playerName);
    
    if (isWinner || isLoser) {
      uniqueMatches.set(match.id, {
        ...match,
        player_role: isWinner ? 'winner' : 'loser'
      });
    }
  }

  return Array.from(uniqueMatches.values());
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

  // Cerca nei winner_name e loser_name
  const { data: winners } = await supabase
    .from('matches')
    .select('winner_name')
    .ilike('winner_name', `%${query}%`)
    .limit(100);

  const { data: losers } = await supabase
    .from('matches')
    .select('loser_name')
    .ilike('loser_name', `%${query}%`)
    .limit(100);

  // Conta occorrenze per ogni nome
  const playerCounts = {};
  for (const w of winners || []) {
    if (w.winner_name) {
      if (!playerCounts[w.winner_name]) {
        playerCounts[w.winner_name] = { wins: 0, losses: 0 };
      }
      playerCounts[w.winner_name].wins++;
    }
  }
  for (const l of losers || []) {
    if (l.loser_name) {
      if (!playerCounts[l.loser_name]) {
        playerCounts[l.loser_name] = { wins: 0, losses: 0 };
      }
      playerCounts[l.loser_name].losses++;
    }
  }

  // Converti in array con statistiche
  const players = Object.entries(playerCounts)
    .filter(([name]) => {
      const nameLower = name.toLowerCase();
      const queryLower = query.toLowerCase();
      
      // Ricerca più intelligente: nome completo, nome, cognome
      return nameLower.includes(queryLower) || 
             nameLower.split(' ').some(part => part.startsWith(queryLower));
    })
    .map(([name, counts]) => {
      const totalMatches = counts.wins + counts.losses;
      const winRate = totalMatches > 0 ? counts.wins / totalMatches : 0;
      return {
        name,
        totalMatches,
        wins: counts.wins,
        losses: counts.losses,
        winRate
      };
    })
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
 * Ottieni statistiche rapide per confronto (utile per pre-match)
 */
async function getHeadToHeadStats(player1, player2) {
  const stats1 = await getPlayerStats(player1);
  const stats2 = await getPlayerStats(player2);

  return {
    player1: {
      name: player1,
      overall_win_rate: stats1.overall?.win_rate || 0,
      comeback_rate: stats1.overall?.comeback_rate || 0,
      avg_ranking: stats1.overall?.avg_ranking || null
    },
    player2: {
      name: player2,
      overall_win_rate: stats2.overall?.win_rate || 0,
      comeback_rate: stats2.overall?.comeback_rate || 0,
      avg_ranking: stats2.overall?.avg_ranking || null
    },
    comparison: {
      win_rate_diff: (stats1.overall?.win_rate || 0) - (stats2.overall?.win_rate || 0),
      comeback_diff: (stats1.overall?.comeback_rate || 0) - (stats2.overall?.comeback_rate || 0)
    }
  };
}

module.exports = {
  getPlayerStats,
  getPlayerMatches,
  searchPlayers,
  getHeadToHeadStats,
  calculateComebackRate,
  calculateROI
};
