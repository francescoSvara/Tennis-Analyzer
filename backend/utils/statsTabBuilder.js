/**
 * Stats Tab Builder - Build statistics tab for MatchBundle
 * 
 * Extracted from server.js as part of the refactor.
 * Contains complex statistics normalization and calculation logic.
 * 
 * @see docs/filosofie/FILOSOFIA_STATS.md
 */

const { calculateGameStatsFromScore } = require('./bundleHelpers');

const VERSION = '1.0.0';

// ============================================================================
// SOFASCORE FORMAT CONVERSION
// ============================================================================

/**
 * Converte formato SofaScore array in formato byPeriod
 * @param {Array} statsArray - Array [{period: 'ALL', groups: [...]}]
 * @returns {Object|null} { ALL: {...}, SET1: {...}, ... }
 */
function convertSofaScoreArrayFormat(statsArray) {
  if (!Array.isArray(statsArray)) return null;
  
  const result = {};
  
  for (const periodData of statsArray) {
    const period = periodData.period;
    if (!period || !periodData.groups) continue;
    
    // Convert period names
    let periodKey = period;
    if (period === '1ST') periodKey = 'SET1';
    else if (period === '2ND') periodKey = 'SET2';
    else if (period === '3RD') periodKey = 'SET3';
    else if (period === '4TH') periodKey = 'SET4';
    else if (period === '5TH') periodKey = 'SET5';
    
    const stats = { home: {}, away: {} };
    
    for (const group of periodData.groups) {
      if (!group.statisticsItems) continue;
      
      for (const item of group.statisticsItems) {
        const key = item.key;
        
        switch (key) {
          case 'aces':
            stats.home.aces = item.homeValue || 0;
            stats.away.aces = item.awayValue || 0;
            break;
          case 'doubleFaults':
            stats.home.doubleFaults = item.homeValue || 0;
            stats.away.doubleFaults = item.awayValue || 0;
            break;
          case 'firstServeAccuracy':
            stats.home.firstServePct = item.homeTotal ? Math.round((item.homeValue / item.homeTotal) * 100) : 0;
            stats.away.firstServePct = item.awayTotal ? Math.round((item.awayValue / item.awayTotal) * 100) : 0;
            stats.home.firstServeIn = item.homeValue || 0;
            stats.home.firstServeTotal = item.homeTotal || 0;
            stats.away.firstServeIn = item.awayValue || 0;
            stats.away.firstServeTotal = item.awayTotal || 0;
            break;
          case 'secondServeAccuracy':
            stats.home.secondServeIn = item.homeValue || 0;
            stats.home.secondServeTotal = item.homeTotal || 0;
            stats.away.secondServeIn = item.awayValue || 0;
            stats.away.secondServeTotal = item.awayTotal || 0;
            break;
          case 'firstServePointsAccuracy':
            stats.home.firstServePointsWonPct = item.homeTotal ? Math.round((item.homeValue / item.homeTotal) * 100) : 0;
            stats.away.firstServePointsWonPct = item.awayTotal ? Math.round((item.awayValue / item.awayTotal) * 100) : 0;
            stats.home.firstServePointsWon = item.homeValue || 0;
            stats.home.firstServePointsIn = item.homeTotal || 0;
            stats.away.firstServePointsWon = item.awayValue || 0;
            stats.away.firstServePointsIn = item.awayTotal || 0;
            break;
          case 'secondServePointsAccuracy':
            stats.home.secondServePointsWonPct = item.homeTotal ? Math.round((item.homeValue / item.homeTotal) * 100) : 0;
            stats.away.secondServePointsWonPct = item.awayTotal ? Math.round((item.awayValue / item.awayTotal) * 100) : 0;
            stats.home.secondServePointsWon = item.homeValue || 0;
            stats.away.secondServePointsWon = item.awayValue || 0;
            break;
          case 'breakPointsSaved':
            stats.home.breakPointsSaved = item.homeValue || 0;
            stats.home.breakPointsFaced = item.homeTotal || 0;
            stats.away.breakPointsSaved = item.awayValue || 0;
            stats.away.breakPointsFaced = item.awayTotal || 0;
            break;
          case 'breakPointsScored':
            stats.home.breakPointsWon = item.homeValue || 0;
            stats.away.breakPointsWon = item.awayValue || 0;
            break;
          case 'pointsTotal':
            stats.home.totalPointsWon = item.homeValue || 0;
            stats.away.totalPointsWon = item.awayValue || 0;
            break;
          case 'servicePointsScored':
            stats.home.servicePointsWon = item.homeValue || 0;
            stats.away.servicePointsWon = item.awayValue || 0;
            break;
          case 'receiverPointsScored':
            stats.home.receiverPointsWon = item.homeValue || 0;
            stats.away.receiverPointsWon = item.awayValue || 0;
            break;
          case 'maxPointsInRow':
            stats.home.maxConsecutivePointsWon = item.homeValue || 0;
            stats.away.maxConsecutivePointsWon = item.awayValue || 0;
            break;
          case 'gamesWon':
            stats.home.gamesWon = item.homeValue || 0;
            stats.away.gamesWon = item.awayValue || 0;
            break;
          case 'maxGamesInRow':
            stats.home.maxConsecutiveGamesWon = item.homeValue || 0;
            stats.away.maxConsecutiveGamesWon = item.awayValue || 0;
            break;
          case 'tiebreaks':
            stats.home.tiebreaksWon = item.homeValue || 0;
            stats.away.tiebreaksWon = item.awayValue || 0;
            break;
          case 'winners':
            stats.home.winners = item.homeValue || 0;
            stats.away.winners = item.awayValue || 0;
            break;
          case 'unforcedErrors':
            stats.home.unforcedErrors = item.homeValue || 0;
            stats.away.unforcedErrors = item.awayValue || 0;
            break;
          case 'serviceGamesPlayed':
          case 'serviceGamesTotal':
            stats.home.serviceGamesPlayed = item.homeValue || 0;
            stats.away.serviceGamesPlayed = item.awayValue || 0;
            break;
          case 'serviceGamesWon':
            stats.home.serviceGamesWon = item.homeValue || 0;
            stats.away.serviceGamesWon = item.awayValue || 0;
            break;
        }
      }
    }
    
    // Calculate derived fields
    if (!stats.home.totalPointsWon && stats.home.servicePointsWon !== undefined && stats.home.receiverPointsWon !== undefined) {
      stats.home.totalPointsWon = (stats.home.servicePointsWon || 0) + (stats.home.receiverPointsWon || 0);
    }
    if (!stats.away.totalPointsWon && stats.away.servicePointsWon !== undefined && stats.away.receiverPointsWon !== undefined) {
      stats.away.totalPointsWon = (stats.away.servicePointsWon || 0) + (stats.away.receiverPointsWon || 0);
    }
    
    // breakPointsTotal = breakPointsFaced of opponent
    if (!stats.home.breakPointsTotal && stats.away.breakPointsFaced) {
      stats.home.breakPointsTotal = stats.away.breakPointsFaced;
    }
    if (!stats.away.breakPointsTotal && stats.home.breakPointsFaced) {
      stats.away.breakPointsTotal = stats.home.breakPointsFaced;
    }
    
    // returnGamesPlayed = serviceGamesPlayed of opponent
    if (!stats.home.returnGamesPlayed && stats.away.serviceGamesPlayed) {
      stats.home.returnGamesPlayed = stats.away.serviceGamesPlayed;
    }
    if (!stats.away.returnGamesPlayed && stats.home.serviceGamesPlayed) {
      stats.away.returnGamesPlayed = stats.home.serviceGamesPlayed;
    }
    
    result[periodKey] = stats;
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

// ============================================================================
// EXTRACT STATS FROM RECORD
// ============================================================================

/**
 * Estrae stats da un singolo record (DB o convertito)
 */
function extractStatsFromRecord(record) {
  if (!record) return { home: {}, away: {} };
  
  // If record already has home/away structure
  if (record.home !== undefined || record.away !== undefined) {
    return {
      home: { ...record.home },
      away: { ...record.away }
    };
  }
  
  // DB format with p1_, p2_ prefixes
  return {
    home: {
      aces: record.p1_aces || 0,
      doubleFaults: record.p1_double_faults || 0,
      firstServePct: record.p1_first_serve_pct || 0,
      firstServePointsWonPct: record.p1_first_serve_won && record.p1_first_serve_total 
        ? Math.round((record.p1_first_serve_won / record.p1_first_serve_total) * 100) 
        : 0,
      secondServePointsWonPct: record.p1_second_serve_won && record.p1_second_serve_total
        ? Math.round((record.p1_second_serve_won / record.p1_second_serve_total) * 100)
        : 0,
      breakPointsWon: record.p1_break_points_won || 0,
      breakPointsTotal: record.p1_break_points_total || 0,
      totalPointsWon: record.p1_total_points_won || 0,
      winners: record.p1_winners || 0,
      unforcedErrors: record.p1_unforced_errors || 0
    },
    away: {
      aces: record.p2_aces || 0,
      doubleFaults: record.p2_double_faults || 0,
      firstServePct: record.p2_first_serve_pct || 0,
      firstServePointsWonPct: record.p2_first_serve_won && record.p2_first_serve_total
        ? Math.round((record.p2_first_serve_won / record.p2_first_serve_total) * 100)
        : 0,
      secondServePointsWonPct: record.p2_second_serve_won && record.p2_second_serve_total
        ? Math.round((record.p2_second_serve_won / record.p2_second_serve_total) * 100)
        : 0,
      breakPointsWon: record.p2_break_points_won || 0,
      breakPointsTotal: record.p2_break_points_total || 0,
      totalPointsWon: record.p2_total_points_won || 0,
      winners: record.p2_winners || 0,
      unforcedErrors: record.p2_unforced_errors || 0
    }
  };
}

// ============================================================================
// BUILD TAB FROM STATS
// ============================================================================

/**
 * Build stats tab structure from raw stats
 * FILOSOFIA_CALCOLI: "MAI NULL" - ogni feature ha SEMPRE un valore calcolato
 */
function buildTabFromStats(stats, pbpStats = null) {
  const mergeValue = (dbVal, pbpVal) => {
    if (dbVal !== undefined && dbVal !== null) return dbVal;
    if (pbpStats && pbpVal !== undefined && pbpVal !== null) return pbpVal;
    return 0;
  };
  
  const homeTotalWon = mergeValue(stats.home.totalPointsWon, pbpStats?.home?.totalPointsWon);
  const awayTotalWon = mergeValue(stats.away.totalPointsWon, pbpStats?.away?.totalPointsWon);
  
  // Calculate winners if missing
  let homeWinners = stats.home.winners;
  let awayWinners = stats.away.winners;
  
  if ((!homeWinners || homeWinners === 0) && homeTotalWon > 0) {
    const homeAces = mergeValue(stats.home.aces, pbpStats?.home?.aces);
    const homeFirstServePct = stats.home.firstServePct || 60;
    const homeFirstServeWonPct = stats.home.firstServePointsWonPct || 70;
    const homeFirstServePointsWon = Math.round(homeTotalWon * (homeFirstServePct / 100) * (homeFirstServeWonPct / 100));
    homeWinners = homeAces + Math.round(homeFirstServePointsWon * 0.15);
  }
  
  if ((!awayWinners || awayWinners === 0) && awayTotalWon > 0) {
    const awayAces = stats.away.aces || 0;
    const awayFirstServePct = stats.away.firstServePct || 60;
    const awayFirstServeWonPct = stats.away.firstServePointsWonPct || 70;
    const awayFirstServePointsWon = Math.round(awayTotalWon * (awayFirstServePct / 100) * (awayFirstServeWonPct / 100));
    awayWinners = awayAces + Math.round(awayFirstServePointsWon * 0.15);
  }
  
  // Calculate unforced errors if missing
  let homeUE = stats.home.unforcedErrors;
  let awayUE = stats.away.unforcedErrors;
  const homePointsLost = awayTotalWon;
  const awayPointsLost = homeTotalWon;
  
  if ((!homeUE || homeUE === 0) && homePointsLost > 0) {
    const homeDF = stats.home.doubleFaults || 0;
    homeUE = homeDF + Math.round(homePointsLost * 0.12);
  }
  
  if ((!awayUE || awayUE === 0) && awayPointsLost > 0) {
    const awayDF = stats.away.doubleFaults || 0;
    awayUE = awayDF + Math.round(awayPointsLost * 0.12);
  }
  
  // Calculate return percentages
  let homeReturnPct = stats.home.returnPointsWonPct;
  let awayReturnPct = stats.away.returnPointsWonPct;
  
  if ((!homeReturnPct || homeReturnPct === 0) && awayTotalWon > 0) {
    const away1stPct = stats.away.firstServePct || 60;
    const away1stWonPct = stats.away.firstServePointsWonPct || 70;
    const away2ndWonPct = stats.away.secondServePointsWonPct || 50;
    const awayServeWonPct = (away1stPct * away1stWonPct + (100 - away1stPct) * away2ndWonPct) / 100;
    homeReturnPct = Math.round(100 - awayServeWonPct);
  }
  
  if ((!awayReturnPct || awayReturnPct === 0) && homeTotalWon > 0) {
    const home1stPct = stats.home.firstServePct || 60;
    const home1stWonPct = stats.home.firstServePointsWonPct || 70;
    const home2ndWonPct = stats.home.secondServePointsWonPct || 50;
    const homeServeWonPct = (home1stPct * home1stWonPct + (100 - home1stPct) * home2ndWonPct) / 100;
    awayReturnPct = Math.round(100 - homeServeWonPct);
  }
  
  // First serve % fallback
  let homeFirstServePct = stats.home.firstServePct;
  let awayFirstServePct = stats.away.firstServePct;
  if (!homeFirstServePct || homeFirstServePct === 0) homeFirstServePct = 60;
  if (!awayFirstServePct || awayFirstServePct === 0) awayFirstServePct = 60;
  
  // First serve won % fallback
  let homeFirstServeWonPct = stats.home.firstServePointsWonPct;
  let awayFirstServeWonPct = stats.away.firstServePointsWonPct;
  if (!homeFirstServeWonPct || homeFirstServeWonPct === 0) {
    const ratio = homeTotalWon / (homeTotalWon + awayTotalWon || 1);
    homeFirstServeWonPct = Math.round(60 + ratio * 25);
  }
  if (!awayFirstServeWonPct || awayFirstServeWonPct === 0) {
    const ratio = awayTotalWon / (homeTotalWon + awayTotalWon || 1);
    awayFirstServeWonPct = Math.round(60 + ratio * 25);
  }
  
  // Second serve won % fallback
  let homeSecondServeWonPct = stats.home.secondServePointsWonPct;
  let awaySecondServeWonPct = stats.away.secondServePointsWonPct;
  if (!homeSecondServeWonPct || homeSecondServeWonPct === 0) {
    const ratio = homeTotalWon / (homeTotalWon + awayTotalWon || 1);
    homeSecondServeWonPct = Math.round(40 + ratio * 20);
  }
  if (!awaySecondServeWonPct || awaySecondServeWonPct === 0) {
    const ratio = awayTotalWon / (homeTotalWon + awayTotalWon || 1);
    awaySecondServeWonPct = Math.round(40 + ratio * 20);
  }
  
  // Break points
  let homeBreakPointsWon = mergeValue(stats.home.breakPointsWon, pbpStats?.home?.breakPointsWon);
  let awayBreakPointsWon = mergeValue(stats.away.breakPointsWon, pbpStats?.away?.breakPointsWon);
  let homeBreakPointsTotal = mergeValue(stats.home.breakPointsTotal, pbpStats?.home?.breakPointsTotal);
  let awayBreakPointsTotal = mergeValue(stats.away.breakPointsTotal, pbpStats?.away?.breakPointsTotal);
  let homeBreakPointsFaced = mergeValue(stats.home.breakPointsFaced, pbpStats?.home?.breakPointsFaced);
  let awayBreakPointsFaced = mergeValue(stats.away.breakPointsFaced, pbpStats?.away?.breakPointsFaced);
  let homeBreakPointsSaved = mergeValue(stats.home.breakPointsSaved, pbpStats?.home?.breakPointsSaved);
  let awayBreakPointsSaved = mergeValue(stats.away.breakPointsSaved, pbpStats?.away?.breakPointsSaved);
  
  if (homeBreakPointsTotal === 0 && homeBreakPointsWon > 0) {
    homeBreakPointsTotal = homeBreakPointsWon;
  }
  if (awayBreakPointsTotal === 0 && awayBreakPointsWon > 0) {
    awayBreakPointsTotal = awayBreakPointsWon;
  }
  
  // Service games
  let homeServiceGames = stats.home.serviceGamesPlayed || 0;
  let awayServiceGames = stats.away.serviceGamesPlayed || 0;
  
  // Raw values calculation
  let homeFirstServeIn = stats.home.firstServeIn || 0;
  let homeFirstServeTotal = stats.home.firstServeTotal || 0;
  let awayFirstServeIn = stats.away.firstServeIn || 0;
  let awayFirstServeTotal = stats.away.firstServeTotal || 0;
  
  if (homeFirstServeTotal === 0 && homeFirstServePct > 0 && homeTotalWon > 0) {
    homeFirstServeTotal = Math.round(homeTotalWon * 1.2);
    homeFirstServeIn = Math.round(homeFirstServeTotal * homeFirstServePct / 100);
  }
  if (awayFirstServeTotal === 0 && awayFirstServePct > 0 && awayTotalWon > 0) {
    awayFirstServeTotal = Math.round(awayTotalWon * 1.2);
    awayFirstServeIn = Math.round(awayFirstServeTotal * awayFirstServePct / 100);
  }
  
  let homeSecondServeTotal = stats.home.secondServeTotal || 0;
  let awaySecondServeTotal = stats.away.secondServeTotal || 0;
  if (homeSecondServeTotal === 0 && homeFirstServeTotal > 0) {
    homeSecondServeTotal = homeFirstServeTotal - homeFirstServeIn;
  }
  if (awaySecondServeTotal === 0 && awayFirstServeTotal > 0) {
    awaySecondServeTotal = awayFirstServeTotal - awayFirstServeIn;
  }
  
  // Service points won
  let homeServicePointsWon = mergeValue(stats.home.servicePointsWon, pbpStats?.home?.servicePointsWon);
  let awayServicePointsWon = mergeValue(stats.away.servicePointsWon, pbpStats?.away?.servicePointsWon);
  
  // Return points won
  let homeReturnPointsWon = stats.home.receiverPointsWon || 0;
  let awayReturnPointsWon = stats.away.receiverPointsWon || 0;
  
  if (homeReturnPointsWon === 0 && homeTotalWon > 0 && homeServicePointsWon > 0) {
    homeReturnPointsWon = Math.max(0, homeTotalWon - homeServicePointsWon);
  }
  if (awayReturnPointsWon === 0 && awayTotalWon > 0 && awayServicePointsWon > 0) {
    awayReturnPointsWon = Math.max(0, awayTotalWon - awayServicePointsWon);
  }
  
  // Max consecutive points
  let homeMaxConsecutivePoints = stats.home.maxConsecutivePointsWon || 0;
  let awayMaxConsecutivePoints = stats.away.maxConsecutivePointsWon || 0;
  if (homeMaxConsecutivePoints === 0 && homeTotalWon > 0) {
    homeMaxConsecutivePoints = Math.max(3, Math.round(homeTotalWon * 0.09));
  }
  if (awayMaxConsecutivePoints === 0 && awayTotalWon > 0) {
    awayMaxConsecutivePoints = Math.max(3, Math.round(awayTotalWon * 0.09));
  }
  
  return {
    serve: {
      home: {
        aces: stats.home.aces || 0,
        doubleFaults: stats.home.doubleFaults || 0,
        firstServePct: homeFirstServePct,
        firstServeIn: homeFirstServeIn,
        firstServeTotal: homeFirstServeTotal,
        firstServeWonPct: homeFirstServeWonPct,
        secondServeWonPct: homeSecondServeWonPct,
        secondServeTotal: homeSecondServeTotal,
        serviceGamesPlayed: homeServiceGames,
        servicePointsWon: homeServicePointsWon,
        breakPointsSaved: homeBreakPointsSaved,
        breakPointsFaced: homeBreakPointsFaced
      },
      away: {
        aces: stats.away.aces || 0,
        doubleFaults: stats.away.doubleFaults || 0,
        firstServePct: awayFirstServePct,
        firstServeIn: awayFirstServeIn,
        firstServeTotal: awayFirstServeTotal,
        firstServeWonPct: awayFirstServeWonPct,
        secondServeWonPct: awaySecondServeWonPct,
        secondServeTotal: awaySecondServeTotal,
        serviceGamesPlayed: awayServiceGames,
        servicePointsWon: awayServicePointsWon,
        breakPointsSaved: awayBreakPointsSaved,
        breakPointsFaced: awayBreakPointsFaced
      }
    },
    return: {
      home: {
        returnPointsWonPct: homeReturnPct,
        returnPointsWon: homeReturnPointsWon,
        breakPointsWon: homeBreakPointsWon,
        breakPointsTotal: homeBreakPointsTotal
      },
      away: {
        returnPointsWonPct: awayReturnPct,
        returnPointsWon: awayReturnPointsWon,
        breakPointsWon: awayBreakPointsWon,
        breakPointsTotal: awayBreakPointsTotal
      }
    },
    points: {
      home: {
        totalWon: homeTotalWon,
        servicePointsWon: homeServicePointsWon,
        returnPointsWon: homeReturnPointsWon,
        maxConsecutivePointsWon: homeMaxConsecutivePoints,
        winners: homeWinners,
        unforcedErrors: homeUE
      },
      away: {
        totalWon: awayTotalWon,
        servicePointsWon: awayServicePointsWon,
        returnPointsWon: awayReturnPointsWon,
        maxConsecutivePointsWon: awayMaxConsecutivePoints,
        winners: awayWinners,
        unforcedErrors: awayUE
      }
    }
  };
}

// ============================================================================
// BUILD STATS TAB (MAIN FUNCTION)
// ============================================================================

/**
 * Build complete stats tab for bundle
 * @param {Object|Array} statisticsData - Statistics from DB or SofaScore
 * @param {Object} matchData - Match data for fallback calculations
 * @param {Object} score - Extracted score object
 * @param {Object} pointByPoint - Point-by-point data
 * @returns {Object} Complete stats tab
 */
function buildStatsTab(statisticsData, matchData, score, pointByPoint = {}) {
  // Convert SofaScore array format if needed
  if (Array.isArray(statisticsData)) {
    statisticsData = convertSofaScoreArrayFormat(statisticsData);
  }
  
  const isNewFormat = statisticsData && (statisticsData.ALL || statisticsData.SET1);
  
  // Extract PBP stats if available
  const pbpPoints = Array.isArray(pointByPoint) 
    ? pointByPoint 
    : (pointByPoint?.points || []);
  const pbpStats = null; // TODO: extractAllStatsFromPBP if needed
  
  if (isNewFormat) {
    const periods = Object.keys(statisticsData).filter(k => statisticsData[k]);
    const byPeriod = {};
    const gameStatsFromScore = calculateGameStatsFromScore(score);
    const allStats = statisticsData.ALL ? extractStatsFromRecord(statisticsData.ALL) : {};
    
    const gameStats = {
      home: {
        gamesWon: allStats.home?.gamesWon || gameStatsFromScore.home.gamesWon,
        tiebreaksWon: allStats.home?.tiebreaksWon !== undefined ? allStats.home.tiebreaksWon : gameStatsFromScore.home.tiebreaksWon,
        consecutiveGamesWon: allStats.home?.maxConsecutiveGamesWon || gameStatsFromScore.home.consecutiveGamesWon,
        serviceGamesWon: allStats.home?.serviceGamesWon || 0
      },
      away: {
        gamesWon: allStats.away?.gamesWon || gameStatsFromScore.away.gamesWon,
        tiebreaksWon: allStats.away?.tiebreaksWon !== undefined ? allStats.away.tiebreaksWon : gameStatsFromScore.away.tiebreaksWon,
        consecutiveGamesWon: allStats.away?.maxConsecutiveGamesWon || gameStatsFromScore.away.consecutiveGamesWon,
        serviceGamesWon: allStats.away?.serviceGamesWon || 0
      }
    };
    
    for (const period of periods) {
      const stats = extractStatsFromRecord(statisticsData[period]);
      const periodTab = buildTabFromStats(stats, pbpStats);
      byPeriod[period] = { ...periodTab, games: gameStats };
    }
    
    const defaultStats = statisticsData.ALL 
      ? extractStatsFromRecord(statisticsData.ALL)
      : extractStatsFromRecord(statisticsData[periods[0]]);
    
    const defaultTab = buildTabFromStats(defaultStats, pbpStats);
    
    return {
      ...defaultTab,
      games: gameStats,
      periods: periods.sort((a, b) => {
        if (a === 'ALL') return -1;
        if (b === 'ALL') return 1;
        return a.localeCompare(b);
      }),
      byPeriod,
      dataSource: 'statistics'
    };
  }
  
  // Old format or missing data - estimate from score
  const statistics = statisticsData || {};
  const hasRealStats = statistics.home && (
    statistics.home.aces !== undefined ||
    statistics.home.firstServePct !== undefined ||
    statistics.home.firstServePointsWonPct !== undefined
  );
  
  if (hasRealStats) {
    const result = buildTabFromStats({
      home: statistics.home || {},
      away: statistics.away || {}
    }, pbpStats);
    const gameStatsFromScore = calculateGameStatsFromScore(score);
    const gameStats = {
      home: {
        gamesWon: gameStatsFromScore.home.gamesWon,
        tiebreaksWon: gameStatsFromScore.home.tiebreaksWon,
        consecutiveGamesWon: statistics.home?.maxConsecutiveGamesWon || gameStatsFromScore.home.consecutiveGamesWon
      },
      away: {
        gamesWon: gameStatsFromScore.away.gamesWon,
        tiebreaksWon: gameStatsFromScore.away.tiebreaksWon,
        consecutiveGamesWon: statistics.away?.maxConsecutiveGamesWon || gameStatsFromScore.away.consecutiveGamesWon
      }
    };
    return { ...result, games: gameStats, dataSource: 'statistics' };
  }
  
  // Estimate stats from score
  const sets = score?.sets || [];
  let homeGames = 0, awayGames = 0;
  let homeSetsWon = 0, awaySetsWon = 0;
  
  sets.forEach(set => {
    homeGames += set.home || 0;
    awayGames += set.away || 0;
    if ((set.home || 0) > (set.away || 0)) homeSetsWon++;
    else if ((set.away || 0) > (set.home || 0)) awaySetsWon++;
  });
  
  const totalGames = homeGames + awayGames || 1;
  const avgPointsPerGame = 6.5;
  const homePoints = Math.round(homeGames * avgPointsPerGame);
  const awayPoints = Math.round(awayGames * avgPointsPerGame);
  const gameRatio = homeGames / totalGames;
  const isHomeWinner = homeSetsWon > awaySetsWon;
  
  const homeFirstServe = Math.round(55 + (gameRatio * 20));
  const awayFirstServe = Math.round(55 + ((1 - gameRatio) * 20));
  const homeFirstServeWon = Math.round(60 + (gameRatio * 25));
  const awayFirstServeWon = Math.round(60 + ((1 - gameRatio) * 25));
  const homeSecondServeWon = Math.round(45 + (gameRatio * 15));
  const awaySecondServeWon = Math.round(45 + ((1 - gameRatio) * 15));
  
  const homeServiceGames = Math.ceil(homeGames / 2);
  const awayServiceGames = Math.ceil(awayGames / 2);
  const homeAces = Math.round(homeServiceGames * (isHomeWinner ? 0.6 : 0.4));
  const awayAces = Math.round(awayServiceGames * (!isHomeWinner ? 0.6 : 0.4));
  const homeDF = Math.round(homeServiceGames * (isHomeWinner ? 0.25 : 0.35));
  const awayDF = Math.round(awayServiceGames * (!isHomeWinner ? 0.25 : 0.35));
  
  const homeBreaksConverted = Math.max(0, awayGames - awaySetsWon * 3);
  const awayBreaksConverted = Math.max(0, homeGames - homeSetsWon * 3);
  
  return {
    serve: {
      home: {
        aces: homeAces,
        doubleFaults: homeDF,
        firstServePct: homeFirstServe,
        firstServeWonPct: homeFirstServeWon,
        secondServeWonPct: homeSecondServeWon
      },
      away: {
        aces: awayAces,
        doubleFaults: awayDF,
        firstServePct: awayFirstServe,
        firstServeWonPct: awayFirstServeWon,
        secondServeWonPct: awaySecondServeWon
      }
    },
    return: {
      home: {
        returnPointsWonPct: Math.round(35 + (gameRatio * 20)),
        breakPointsWon: homeBreaksConverted,
        breakPointsTotal: homeBreaksConverted + Math.round(Math.random() * 2)
      },
      away: {
        returnPointsWonPct: Math.round(35 + ((1 - gameRatio) * 20)),
        breakPointsWon: awayBreaksConverted,
        breakPointsTotal: awayBreaksConverted + Math.round(Math.random() * 2)
      }
    },
    points: {
      home: {
        totalWon: homePoints,
        winners: Math.round(homePoints * 0.25),
        unforcedErrors: Math.round(homePoints * (isHomeWinner ? 0.15 : 0.2))
      },
      away: {
        totalWon: awayPoints,
        winners: Math.round(awayPoints * 0.25),
        unforcedErrors: Math.round(awayPoints * (!isHomeWinner ? 0.15 : 0.2))
      }
    },
    games: calculateGameStatsFromScore(score),
    dataSource: 'estimated'
  };
}

module.exports = {
  VERSION,
  convertSofaScoreArrayFormat,
  extractStatsFromRecord,
  buildTabFromStats,
  buildStatsTab
};
