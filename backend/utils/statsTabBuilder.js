/**
 * Stats Tab Builder - Build statistics tab for MatchBundle
 *
 * Extracted from server.js as part of the refactor.
 * Contains complex statistics normalization and calculation logic.
 *
 * @module statsTabBuilder
 * @memberof ConceptualMap#Utils
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
            stats.home.firstServePct = item.homeTotal
              ? Math.round((item.homeValue / item.homeTotal) * 100)
              : 0;
            stats.away.firstServePct = item.awayTotal
              ? Math.round((item.awayValue / item.awayTotal) * 100)
              : 0;
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
            stats.home.firstServePointsWonPct = item.homeTotal
              ? Math.round((item.homeValue / item.homeTotal) * 100)
              : 0;
            stats.away.firstServePointsWonPct = item.awayTotal
              ? Math.round((item.awayValue / item.awayTotal) * 100)
              : 0;
            stats.home.firstServePointsWon = item.homeValue || 0;
            stats.home.firstServePointsIn = item.homeTotal || 0;
            stats.away.firstServePointsWon = item.awayValue || 0;
            stats.away.firstServePointsIn = item.awayTotal || 0;
            break;
          case 'secondServePointsAccuracy':
            stats.home.secondServePointsWonPct = item.homeTotal
              ? Math.round((item.homeValue / item.homeTotal) * 100)
              : 0;
            stats.away.secondServePointsWonPct = item.awayTotal
              ? Math.round((item.awayValue / item.awayTotal) * 100)
              : 0;
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
    if (
      !stats.home.totalPointsWon &&
      stats.home.servicePointsWon !== undefined &&
      stats.home.receiverPointsWon !== undefined
    ) {
      stats.home.totalPointsWon =
        (stats.home.servicePointsWon || 0) + (stats.home.receiverPointsWon || 0);
    }
    if (
      !stats.away.totalPointsWon &&
      stats.away.servicePointsWon !== undefined &&
      stats.away.receiverPointsWon !== undefined
    ) {
      stats.away.totalPointsWon =
        (stats.away.servicePointsWon || 0) + (stats.away.receiverPointsWon || 0);
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
      away: { ...record.away },
    };
  }

  // DB format with p1_, p2_ prefixes
  // Map ALL available columns from match_statistics table
  // 
  // SofaScore DB semantics:
  // - p1_first_serve_total = number of FIRST SERVES IN (prime entrate)
  // - p1_first_serve_won = number of POINTS WON on first serve
  // - p1_first_serve_pct = % of first serves in (already calculated)
  // - p1_second_serve_total = number of SECOND SERVES played
  // - p1_second_serve_won = number of POINTS WON on second serve
  //
  // Total service points = first_serve_total + second_serve_total
  
  const homeFirstServeIn = record.p1_first_serve_total || 0;  // Prime entrate
  const homeSecondServeTotal = record.p1_second_serve_total || 0;
  const homeTotalServicePoints = homeFirstServeIn + homeSecondServeTotal;
  
  const awayFirstServeIn = record.p2_first_serve_total || 0;
  const awaySecondServeTotal = record.p2_second_serve_total || 0;
  const awayTotalServicePoints = awayFirstServeIn + awaySecondServeTotal;
  
  const home = {
    // Serve stats
    aces: record.p1_aces || 0,
    doubleFaults: record.p1_double_faults || 0,
    // Primo Servizio %: prime entrate / totale punti serviti
    firstServePct: record.p1_first_serve_pct || (homeTotalServicePoints > 0 
      ? Math.round((homeFirstServeIn / homeTotalServicePoints) * 100) 
      : 0),
    firstServeIn: homeFirstServeIn,  // Quante prime sono entrate
    firstServeTotal: homeTotalServicePoints, // Totale punti al servizio
    firstServePointsWon: record.p1_first_serve_won || 0,  // Punti vinti con la prima
    firstServePointsIn: homeFirstServeIn,  // = firstServeIn (prime entrate)
    // Punti Primo Servizio %: punti vinti / prime entrate
    firstServePointsWonPct:
      record.p1_first_serve_won && homeFirstServeIn
        ? Math.round((record.p1_first_serve_won / homeFirstServeIn) * 100)
        : 0,
    secondServeTotal: homeSecondServeTotal,
    secondServePointsWon: record.p1_second_serve_won || 0,
    secondServePointsWonPct:
      record.p1_second_serve_won && homeSecondServeTotal
        ? Math.round((record.p1_second_serve_won / homeSecondServeTotal) * 100)
        : 0,
    // Service games: estimate from total service points (avg ~4-5 points per game)
    servicePointsWon: (record.p1_first_serve_won || 0) + (record.p1_second_serve_won || 0),
    servicePointsTotal: homeTotalServicePoints,
    serviceGamesPlayed: homeTotalServicePoints > 0 
      ? Math.round(homeTotalServicePoints / 4.5) 
      : 0,
    // Break points
    breakPointsWon: record.p1_break_points_won || 0,
    breakPointsTotal: record.p1_break_points_total || 0,
    breakPointsSaved: (record.p2_break_points_total || 0) - (record.p2_break_points_won || 0),
    breakPointsFaced: record.p2_break_points_total || 0,
    // Points
    totalPointsWon: record.p1_total_points_won || 0,
    winners: record.p1_winners || 0,
    unforcedErrors: record.p1_unforced_errors || 0,
  };

  const away = {
    // Serve stats
    aces: record.p2_aces || 0,
    doubleFaults: record.p2_double_faults || 0,
    firstServePct: record.p2_first_serve_pct || (awayTotalServicePoints > 0
      ? Math.round((awayFirstServeIn / awayTotalServicePoints) * 100)
      : 0),
    firstServeIn: awayFirstServeIn,
    firstServeTotal: awayTotalServicePoints,
    firstServePointsWon: record.p2_first_serve_won || 0,
    firstServePointsIn: awayFirstServeIn,
    firstServePointsWonPct:
      record.p2_first_serve_won && awayFirstServeIn
        ? Math.round((record.p2_first_serve_won / awayFirstServeIn) * 100)
        : 0,
    secondServeTotal: awaySecondServeTotal,
    secondServePointsWon: record.p2_second_serve_won || 0,
    secondServePointsWonPct:
      record.p2_second_serve_won && awaySecondServeTotal
        ? Math.round((record.p2_second_serve_won / awaySecondServeTotal) * 100)
        : 0,
    // Service games
    servicePointsWon: (record.p2_first_serve_won || 0) + (record.p2_second_serve_won || 0),
    servicePointsTotal: awayTotalServicePoints,
    serviceGamesPlayed: awayTotalServicePoints > 0
      ? Math.round(awayTotalServicePoints / 4.5)
      : 0,
    // Break points
    breakPointsWon: record.p2_break_points_won || 0,
    breakPointsTotal: record.p2_break_points_total || 0,
    breakPointsSaved: (record.p1_break_points_total || 0) - (record.p1_break_points_won || 0),
    breakPointsFaced: record.p1_break_points_total || 0,
    // Points
    totalPointsWon: record.p2_total_points_won || 0,
    winners: record.p2_winners || 0,
    unforcedErrors: record.p2_unforced_errors || 0,
  };

  // Calculate return stats (opponent's service stats)
  // First return = points won when opponent serves FIRST serve (using firstServeIn, not firstServeTotal)
  // firstServeIn = number of first serves that went IN
  // firstServeTotal = total service points (first + second)
  home.returnGamesPlayed = away.serviceGamesPlayed;
  home.firstReturnPointsWon = away.firstServeIn - away.firstServePointsWon;  // Changed from firstServeTotal
  home.firstReturnPointsTotal = away.firstServeIn;  // Changed from firstServeTotal
  home.secondReturnPointsWon = away.secondServeTotal - away.secondServePointsWon;
  home.secondReturnPointsTotal = away.secondServeTotal;
  home.returnPointsWon = home.firstReturnPointsWon + home.secondReturnPointsWon;
  home.returnPointsWonPct = (away.servicePointsTotal > 0) 
    ? Math.round(((away.servicePointsTotal - away.servicePointsWon) / away.servicePointsTotal) * 100)
    : 0;

  away.returnGamesPlayed = home.serviceGamesPlayed;
  away.firstReturnPointsWon = home.firstServeIn - home.firstServePointsWon;  // Changed from firstServeTotal
  away.firstReturnPointsTotal = home.firstServeIn;  // Changed from firstServeTotal
  away.secondReturnPointsWon = home.secondServeTotal - home.secondServePointsWon;
  away.secondReturnPointsTotal = home.secondServeTotal;
  away.returnPointsWon = away.firstReturnPointsWon + away.secondReturnPointsWon;
  away.returnPointsWonPct = (home.servicePointsTotal > 0)
    ? Math.round(((home.servicePointsTotal - home.servicePointsWon) / home.servicePointsTotal) * 100)
    : 0;

  return { home, away };
}

// ============================================================================
// BUILD TAB FROM STATS
// ============================================================================

/**
 * Build stats tab structure from raw stats
 * FILOSOFIA_CALCOLI: "MAI NULL" - ogni feature ha SEMPRE un valore calcolato
 */
function buildTabFromStats(stats, pbpStats = null, score = null) {
  const mergeValue = (dbVal, pbpVal) => {
    if (dbVal !== undefined && dbVal !== null) return dbVal;
    if (pbpStats && pbpVal !== undefined && pbpVal !== null) return pbpVal;
    return 0;
  };

  // Calculate service games from score as fallback
  const gameStatsFromScore = score ? calculateGameStatsFromScore(score) : null;

  // Calculate totalWon - prefer direct value, then sum of service + return
  let homeTotalWon = mergeValue(stats.home.totalPointsWon, pbpStats?.home?.totalPointsWon);
  let awayTotalWon = mergeValue(stats.away.totalPointsWon, pbpStats?.away?.totalPointsWon);
  
  // Fallback: calculate from servicePointsWon + returnPointsWon
  const homeServicePts = stats.home.servicePointsWon || 
    ((stats.home.firstServePointsWon || 0) + (stats.home.secondServePointsWon || 0));
  const awayServicePts = stats.away.servicePointsWon || 
    ((stats.away.firstServePointsWon || 0) + (stats.away.secondServePointsWon || 0));
  const homeReturnPts = stats.home.returnPointsWon || 
    ((stats.home.firstReturnPointsWon || 0) + (stats.home.secondReturnPointsWon || 0));
  const awayReturnPts = stats.away.returnPointsWon || 
    ((stats.away.firstReturnPointsWon || 0) + (stats.away.secondReturnPointsWon || 0));
  
  if (homeTotalWon === 0 && (homeServicePts > 0 || homeReturnPts > 0)) {
    homeTotalWon = homeServicePts + homeReturnPts;
  }
  if (awayTotalWon === 0 && (awayServicePts > 0 || awayReturnPts > 0)) {
    awayTotalWon = awayServicePts + awayReturnPts;
  }

  // Calculate winners if missing
  let homeWinners = stats.home.winners;
  let awayWinners = stats.away.winners;

  if ((!homeWinners || homeWinners === 0) && homeTotalWon > 0) {
    const homeAces = mergeValue(stats.home.aces, pbpStats?.home?.aces);
    const homeFirstServePct = stats.home.firstServePct || 60;
    const homeFirstServeWonPct = stats.home.firstServePointsWonPct || 70;
    const homeFirstServePointsWon = Math.round(
      homeTotalWon * (homeFirstServePct / 100) * (homeFirstServeWonPct / 100)
    );
    homeWinners = homeAces + Math.round(homeFirstServePointsWon * 0.15);
  }

  if ((!awayWinners || awayWinners === 0) && awayTotalWon > 0) {
    const awayAces = stats.away.aces || 0;
    const awayFirstServePct = stats.away.firstServePct || 60;
    const awayFirstServeWonPct = stats.away.firstServePointsWonPct || 70;
    const awayFirstServePointsWon = Math.round(
      awayTotalWon * (awayFirstServePct / 100) * (awayFirstServeWonPct / 100)
    );
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
  let homeBreakPointsTotal = mergeValue(
    stats.home.breakPointsTotal,
    pbpStats?.home?.breakPointsTotal
  );
  let awayBreakPointsTotal = mergeValue(
    stats.away.breakPointsTotal,
    pbpStats?.away?.breakPointsTotal
  );
  let homeBreakPointsFaced = mergeValue(
    stats.home.breakPointsFaced,
    pbpStats?.home?.breakPointsFaced
  );
  let awayBreakPointsFaced = mergeValue(
    stats.away.breakPointsFaced,
    pbpStats?.away?.breakPointsFaced
  );
  let homeBreakPointsSaved = mergeValue(
    stats.home.breakPointsSaved,
    pbpStats?.home?.breakPointsSaved
  );
  let awayBreakPointsSaved = mergeValue(
    stats.away.breakPointsSaved,
    pbpStats?.away?.breakPointsSaved
  );

  if (homeBreakPointsTotal === 0 && homeBreakPointsWon > 0) {
    homeBreakPointsTotal = homeBreakPointsWon;
  }
  if (awayBreakPointsTotal === 0 && awayBreakPointsWon > 0) {
    awayBreakPointsTotal = awayBreakPointsWon;
  }

  // Service games - ALWAYS prefer score-based calculation if available
  // The estimated value from servicePointsTotal/4.5 is inaccurate
  let homeServiceGames = gameStatsFromScore?.home?.serviceGamesPlayed || stats.home.serviceGamesPlayed || 0;
  let awayServiceGames = gameStatsFromScore?.away?.serviceGamesPlayed || stats.away.serviceGamesPlayed || 0;

  // Raw values calculation
  let homeFirstServeIn = stats.home.firstServeIn || 0;
  let homeFirstServeTotal = stats.home.firstServeTotal || 0;
  let awayFirstServeIn = stats.away.firstServeIn || 0;
  let awayFirstServeTotal = stats.away.firstServeTotal || 0;

  if (homeFirstServeTotal === 0 && homeFirstServePct > 0 && homeTotalWon > 0) {
    homeFirstServeTotal = Math.round(homeTotalWon * 1.2);
    homeFirstServeIn = Math.round((homeFirstServeTotal * homeFirstServePct) / 100);
  }
  if (awayFirstServeTotal === 0 && awayFirstServePct > 0 && awayTotalWon > 0) {
    awayFirstServeTotal = Math.round(awayTotalWon * 1.2);
    awayFirstServeIn = Math.round((awayFirstServeTotal * awayFirstServePct) / 100);
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
  let homeServicePointsWon = mergeValue(
    stats.home.servicePointsWon,
    pbpStats?.home?.servicePointsWon
  );
  let awayServicePointsWon = mergeValue(
    stats.away.servicePointsWon,
    pbpStats?.away?.servicePointsWon
  );

  // Return points won
  let homeReturnPointsWon = stats.home.receiverPointsWon || stats.home.returnPointsWon || 0;
  let awayReturnPointsWon = stats.away.receiverPointsWon || stats.away.returnPointsWon || 0;

  if (homeReturnPointsWon === 0 && homeTotalWon > 0 && homeServicePointsWon > 0) {
    homeReturnPointsWon = Math.max(0, homeTotalWon - homeServicePointsWon);
  }
  if (awayReturnPointsWon === 0 && awayTotalWon > 0 && awayServicePointsWon > 0) {
    awayReturnPointsWon = Math.max(0, awayTotalWon - awayServicePointsWon);
  }

  // ===== FIRST/SECOND RETURN POINTS (calcolati dai dati serve avversario) =====
  // homeFirstReturnPointsWon = punti vinti quando AWAY serve prima
  // = awayFirstServeIn - awayFirstServePointsWon (punti persi da away al primo servizio)
  let homeFirstServePointsWon = stats.home.firstServePointsWon || 0;
  let awayFirstServePointsWon = stats.away.firstServePointsWon || 0;

  // Calcola se non disponibili
  if (homeFirstServePointsWon === 0 && homeFirstServeIn > 0 && homeFirstServeWonPct > 0) {
    homeFirstServePointsWon = Math.round((homeFirstServeIn * homeFirstServeWonPct) / 100);
  }
  if (awayFirstServePointsWon === 0 && awayFirstServeIn > 0 && awayFirstServeWonPct > 0) {
    awayFirstServePointsWon = Math.round((awayFirstServeIn * awayFirstServeWonPct) / 100);
  }

  let homeSecondServePointsWon = stats.home.secondServePointsWon || 0;
  let awaySecondServePointsWon = stats.away.secondServePointsWon || 0;

  if (homeSecondServePointsWon === 0 && homeSecondServeTotal > 0 && homeSecondServeWonPct > 0) {
    homeSecondServePointsWon = Math.round((homeSecondServeTotal * homeSecondServeWonPct) / 100);
  }
  if (awaySecondServePointsWon === 0 && awaySecondServeTotal > 0 && awaySecondServeWonPct > 0) {
    awaySecondServePointsWon = Math.round((awaySecondServeTotal * awaySecondServeWonPct) / 100);
  }

  // Calculate servicePointsWon from first + second if not available
  if (homeServicePointsWon === 0 && (homeFirstServePointsWon > 0 || homeSecondServePointsWon > 0)) {
    homeServicePointsWon = homeFirstServePointsWon + homeSecondServePointsWon;
  }
  if (awayServicePointsWon === 0 && (awayFirstServePointsWon > 0 || awaySecondServePointsWon > 0)) {
    awayServicePointsWon = awayFirstServePointsWon + awaySecondServePointsWon;
  }

  // Calculate returnPointsWon if still 0: totalWon - servicePointsWon
  if (homeReturnPointsWon === 0 && homeTotalWon > 0 && homeServicePointsWon > 0) {
    homeReturnPointsWon = Math.max(0, homeTotalWon - homeServicePointsWon);
  }
  if (awayReturnPointsWon === 0 && awayTotalWon > 0 && awayServicePointsWon > 0) {
    awayReturnPointsWon = Math.max(0, awayTotalWon - awayServicePointsWon);
  }

  // FIRST RETURN: HOME vince quando AWAY serve prima
  let homeFirstReturnPointsWon = stats.home.firstReturnPointsWon || 0;
  let homeFirstReturnPointsTotal = stats.home.firstReturnPointsTotal || awayFirstServeIn;
  let awayFirstReturnPointsWon = stats.away.firstReturnPointsWon || 0;
  let awayFirstReturnPointsTotal = stats.away.firstReturnPointsTotal || homeFirstServeIn;

  if (homeFirstReturnPointsWon === 0 && awayFirstServeIn > 0 && awayFirstServePointsWon > 0) {
    homeFirstReturnPointsWon = Math.max(0, awayFirstServeIn - awayFirstServePointsWon);
    homeFirstReturnPointsTotal = awayFirstServeIn;
  }
  if (awayFirstReturnPointsWon === 0 && homeFirstServeIn > 0 && homeFirstServePointsWon > 0) {
    awayFirstReturnPointsWon = Math.max(0, homeFirstServeIn - homeFirstServePointsWon);
    awayFirstReturnPointsTotal = homeFirstServeIn;
  }

  // SECOND RETURN: HOME vince quando AWAY serve seconda
  let homeSecondReturnPointsWon = stats.home.secondReturnPointsWon || 0;
  let homeSecondReturnPointsTotal = stats.home.secondReturnPointsTotal || awaySecondServeTotal;
  let awaySecondReturnPointsWon = stats.away.secondReturnPointsWon || 0;
  let awaySecondReturnPointsTotal = stats.away.secondReturnPointsTotal || homeSecondServeTotal;

  if (homeSecondReturnPointsWon === 0 && awaySecondServeTotal > 0 && awaySecondServePointsWon > 0) {
    homeSecondReturnPointsWon = Math.max(0, awaySecondServeTotal - awaySecondServePointsWon);
    homeSecondReturnPointsTotal = awaySecondServeTotal;
  }
  if (awaySecondReturnPointsWon === 0 && homeSecondServeTotal > 0 && homeSecondServePointsWon > 0) {
    awaySecondReturnPointsWon = Math.max(0, homeSecondServeTotal - homeSecondServePointsWon);
    awaySecondReturnPointsTotal = homeSecondServeTotal;
  }

  // RETURN GAMES PLAYED = service games dell'avversario
  // Always prefer score-based values (awayServiceGames/homeServiceGames) over stats-based estimates
  let homeReturnGamesPlayed = awayServiceGames || stats.home.returnGamesPlayed || 0;
  let awayReturnGamesPlayed = homeServiceGames || stats.away.returnGamesPlayed || 0;

  // Max consecutive points
  let homeMaxConsecutivePoints = stats.home.maxConsecutivePointsWon || 0;
  let awayMaxConsecutivePoints = stats.away.maxConsecutivePointsWon || 0;
  if (homeMaxConsecutivePoints === 0 && homeTotalWon > 0) {
    homeMaxConsecutivePoints = Math.max(3, Math.round(homeTotalWon * 0.09));
  }
  if (awayMaxConsecutivePoints === 0 && awayTotalWon > 0) {
    awayMaxConsecutivePoints = Math.max(3, Math.round(awayTotalWon * 0.09));
  }

  // Service games won = service games played - break points conceded to opponent
  // break subiti da home = awayBreakPointsWon (away ha convertito break sul servizio di home)
  const homeServiceGamesWon = Math.max(0, homeServiceGames - awayBreakPointsWon);
  const awayServiceGamesWon = Math.max(0, awayServiceGames - homeBreakPointsWon);

  return {
    serve: {
      home: {
        aces: stats.home.aces || 0,
        doubleFaults: stats.home.doubleFaults || 0,
        firstServePct: homeFirstServePct,
        firstServeIn: homeFirstServeIn,
        firstServeTotal: homeFirstServeTotal,
        firstServeWonPct: homeFirstServeWonPct,
        firstServePointsWon: homeFirstServePointsWon,
        firstServePointsIn: homeFirstServeIn,
        secondServeWonPct: homeSecondServeWonPct,
        secondServePointsWon: homeSecondServePointsWon,
        secondServeTotal: homeSecondServeTotal,
        serviceGamesPlayed: homeServiceGames,
        serviceGamesWon: homeServiceGamesWon,
        servicePointsWon: homeServicePointsWon,
        breakPointsSaved: homeBreakPointsSaved,
        breakPointsFaced: homeBreakPointsFaced,
      },
      away: {
        aces: stats.away.aces || 0,
        doubleFaults: stats.away.doubleFaults || 0,
        firstServePct: awayFirstServePct,
        firstServeIn: awayFirstServeIn,
        firstServeTotal: awayFirstServeTotal,
        firstServeWonPct: awayFirstServeWonPct,
        firstServePointsWon: awayFirstServePointsWon,
        firstServePointsIn: awayFirstServeIn,
        secondServeWonPct: awaySecondServeWonPct,
        secondServePointsWon: awaySecondServePointsWon,
        secondServeTotal: awaySecondServeTotal,
        serviceGamesPlayed: awayServiceGames,
        serviceGamesWon: awayServiceGamesWon,
        servicePointsWon: awayServicePointsWon,
        breakPointsSaved: awayBreakPointsSaved,
        breakPointsFaced: awayBreakPointsFaced,
      },
    },
    return: {
      home: {
        returnPointsWonPct: homeReturnPct,
        returnPointsWon: homeReturnPointsWon,
        firstReturnPointsWon: homeFirstReturnPointsWon,
        firstReturnPointsTotal: homeFirstReturnPointsTotal,
        secondReturnPointsWon: homeSecondReturnPointsWon,
        secondReturnPointsTotal: homeSecondReturnPointsTotal,
        returnGamesPlayed: homeReturnGamesPlayed,
        breakPointsWon: homeBreakPointsWon,
        breakPointsTotal: homeBreakPointsTotal,
      },
      away: {
        returnPointsWonPct: awayReturnPct,
        returnPointsWon: awayReturnPointsWon,
        firstReturnPointsWon: awayFirstReturnPointsWon,
        firstReturnPointsTotal: awayFirstReturnPointsTotal,
        secondReturnPointsWon: awaySecondReturnPointsWon,
        secondReturnPointsTotal: awaySecondReturnPointsTotal,
        returnGamesPlayed: awayReturnGamesPlayed,
        breakPointsWon: awayBreakPointsWon,
        breakPointsTotal: awayBreakPointsTotal,
      },
    },
    points: {
      home: {
        totalWon: homeTotalWon,
        servicePointsWon: homeServicePointsWon,
        returnPointsWon: homeReturnPointsWon,
        maxConsecutivePointsWon: homeMaxConsecutivePoints,
        winners: homeWinners,
        unforcedErrors: homeUE,
      },
      away: {
        totalWon: awayTotalWon,
        servicePointsWon: awayServicePointsWon,
        returnPointsWon: awayReturnPointsWon,
        maxConsecutivePointsWon: awayMaxConsecutivePoints,
        winners: awayWinners,
        unforcedErrors: awayUE,
      },
    },
  };
}

// ============================================================================
// CALCULATE STATS FROM POINT-BY-POINT (PER SET)
// ============================================================================

/**
 * Calculate statistics per set from point-by-point data
 * @param {Array} points - Array of point objects with set, pointWinner, isAce, etc.
 * @param {Array} games - Array of game objects with set, gameServer, gameWinner, gameIsBreak
 * @returns {Object} { SET1: {serve, return, points, games}, SET2: {...}, ... }
 */
function calculateStatsFromPointByPoint(points, games) {
  if (!Array.isArray(points) || points.length === 0) return null;
  
  // Group points and games by set
  const setNumbers = [...new Set(points.map(p => p.set))].sort((a, b) => a - b);
  const result = {};
  
  for (const setNum of setNumbers) {
    const setKey = `SET${setNum}`;
    const setPoints = points.filter(p => p.set === setNum);
    const setGames = games?.filter(g => g.set === setNum) || [];
    
    // Initialize counters
    const stats = {
      home: { aces: 0, doubleFaults: 0, pointsWon: 0, gamesWon: 0, breakPointsWon: 0, serviceGames: 0, returnGames: 0 },
      away: { aces: 0, doubleFaults: 0, pointsWon: 0, gamesWon: 0, breakPointsWon: 0, serviceGames: 0, returnGames: 0 }
    };
    
    // Count from points
    for (const point of setPoints) {
      const winner = point.pointWinner;
      if (winner === 'home') stats.home.pointsWon++;
      if (winner === 'away') stats.away.pointsWon++;
      
      // Aces and double faults depend on server
      const server = point.server || point.gameServer;
      if (point.isAce) {
        if (server === 'home') stats.home.aces++;
        if (server === 'away') stats.away.aces++;
      }
      if (point.isDoubleFault) {
        if (server === 'home') stats.home.doubleFaults++;
        if (server === 'away') stats.away.doubleFaults++;
      }
    }
    
    // Count from games
    for (const game of setGames) {
      const winner = game.gameWinner;
      const server = game.gameServer;
      
      if (winner === 'home') stats.home.gamesWon++;
      if (winner === 'away') stats.away.gamesWon++;
      
      if (server === 'home') stats.home.serviceGames++;
      if (server === 'away') stats.away.serviceGames++;
      
      // Break points won (when returner wins against server)
      if (game.gameIsBreak) {
        if (server === 'home' && winner === 'away') stats.away.breakPointsWon++;
        if (server === 'away' && winner === 'home') stats.home.breakPointsWon++;
      }
    }
    
    // Calculate return games (opponent's service games)
    stats.home.returnGames = stats.away.serviceGames;
    stats.away.returnGames = stats.home.serviceGames;
    
    // Build standard structure
    result[setKey] = {
      serve: {
        home: {
          aces: stats.home.aces,
          doubleFaults: stats.home.doubleFaults,
          serviceGamesPlayed: stats.home.serviceGames,
          serviceGamesWon: stats.home.gamesWon - stats.away.breakPointsWon,
          servicePointsWon: 0, // Would need more detailed tracking
          firstServePct: 0,
          firstServeWonPct: 0,
          firstServePointsWon: 0,
          firstServePointsIn: 0,
          firstServeIn: 0,
          firstServeTotal: 0,
          secondServeWonPct: 0,
          secondServePointsWon: 0,
          secondServeTotal: 0,
          breakPointsSaved: 0,
          breakPointsFaced: 0,
        },
        away: {
          aces: stats.away.aces,
          doubleFaults: stats.away.doubleFaults,
          serviceGamesPlayed: stats.away.serviceGames,
          serviceGamesWon: stats.away.gamesWon - stats.home.breakPointsWon,
          servicePointsWon: 0,
          firstServePct: 0,
          firstServeWonPct: 0,
          firstServePointsWon: 0,
          firstServePointsIn: 0,
          firstServeIn: 0,
          firstServeTotal: 0,
          secondServeWonPct: 0,
          secondServePointsWon: 0,
          secondServeTotal: 0,
          breakPointsSaved: 0,
          breakPointsFaced: 0,
        }
      },
      return: {
        home: {
          returnGamesPlayed: stats.home.returnGames,
          breakPointsWon: stats.home.breakPointsWon,
          breakPointsTotal: 0,
          returnPointsWonPct: 0,
          firstReturnPointsWon: 0,
          firstReturnPointsTotal: 0,
          secondReturnPointsWon: 0,
          secondReturnPointsTotal: 0,
        },
        away: {
          returnGamesPlayed: stats.away.returnGames,
          breakPointsWon: stats.away.breakPointsWon,
          breakPointsTotal: 0,
          returnPointsWonPct: 0,
          firstReturnPointsWon: 0,
          firstReturnPointsTotal: 0,
          secondReturnPointsWon: 0,
          secondReturnPointsTotal: 0,
        }
      },
      points: {
        home: { totalWon: stats.home.pointsWon, servicePointsWon: 0, returnPointsWon: 0, maxConsecutivePointsWon: 0, winners: 0, unforcedErrors: 0 },
        away: { totalWon: stats.away.pointsWon, servicePointsWon: 0, returnPointsWon: 0, maxConsecutivePointsWon: 0, winners: 0, unforcedErrors: 0 }
      },
      games: {
        home: { gamesWon: stats.home.gamesWon, serviceGamesWon: stats.home.gamesWon - stats.away.breakPointsWon, tiebreaksWon: 0, consecutiveGamesWon: 0 },
        away: { gamesWon: stats.away.gamesWon, serviceGamesWon: stats.away.gamesWon - stats.home.breakPointsWon, tiebreaksWon: 0, consecutiveGamesWon: 0 }
      }
    };
  }
  
  return result;
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

  // Check for snapshot format: {serve: {home, away}, return: {home, away}, points: {home, away}}
  const isSnapshotFormat = statisticsData && statisticsData.serve && statisticsData.return && statisticsData.points;
  
  if (isSnapshotFormat) {
    // Calculate game stats from score first
    const gameStatsFromScore = calculateGameStatsFromScore(score);
    const totalGames = gameStatsFromScore.home.gamesWon + gameStatsFromScore.away.gamesWon;
    
    // Use existing serviceGamesPlayed if available, otherwise estimate from total games
    let homeServiceGames = statisticsData.serve?.home?.serviceGamesPlayed || 0;
    let awayServiceGames = statisticsData.serve?.away?.serviceGamesPlayed || 0;
    
    // If not available in data, try to estimate from total games (alternating serve)
    if (homeServiceGames === 0 && awayServiceGames === 0 && totalGames > 0) {
      homeServiceGames = Math.ceil(totalGames / 2);
      awayServiceGames = Math.floor(totalGames / 2);
    }
    
    // Final fallback: estimate from first serve totals (avg ~5 points per service game)
    if (homeServiceGames === 0 && awayServiceGames === 0) {
      // Try different field names for first serve total
      const homeFirstServeTotal = statisticsData.serve?.home?.firstServeTotal 
        || statisticsData.serve?.home?.firstServeIn 
        || statisticsData.serve?.home?.servicePointsWon 
        || 0;
      const awayFirstServeTotal = statisticsData.serve?.away?.firstServeTotal 
        || statisticsData.serve?.away?.firstServeIn 
        || statisticsData.serve?.away?.servicePointsWon 
        || 0;
      
      // Avg ~5-6 service points per game
      if (homeFirstServeTotal > 0) {
        homeServiceGames = Math.max(1, Math.round(homeFirstServeTotal / 5));
      }
      if (awayFirstServeTotal > 0) {
        awayServiceGames = Math.max(1, Math.round(awayFirstServeTotal / 5));
      }
    }
    
    // Convert snapshot format to standard home/away format with enriched data
    // Include ALL raw fields that buildTabFromStats needs for accurate calculations
    const homeServe = statisticsData.serve?.home || {};
    const awayServe = statisticsData.serve?.away || {};
    const homeReturn = statisticsData.return?.home || {};
    const awayReturn = statisticsData.return?.away || {};
    const homePoints = statisticsData.points?.home || {};
    const awayPoints = statisticsData.points?.away || {};
    
    const homeStats = {
      // Serve stats
      aces: homeServe.aces || 0,
      doubleFaults: homeServe.doubleFaults || 0,
      firstServePct: homeServe.firstServePct || 0,
      firstServeIn: homeServe.firstServeIn || homeServe.firstServePointsIn || 0,
      firstServeTotal: homeServe.firstServeTotal || 0,
      firstServePointsWon: homeServe.firstServePointsWon || 0,
      firstServePointsWonPct: homeServe.firstServeWonPct || homeServe.firstServePointsWonPct || 0,
      secondServeTotal: homeServe.secondServeTotal || 0,
      secondServePointsWon: homeServe.secondServePointsWon || 0,
      secondServePointsWonPct: homeServe.secondServeWonPct || homeServe.secondServePointsWonPct || 0,
      servicePointsWon: homeServe.servicePointsWon || homePoints.servicePointsWon || 0,
      breakPointsSaved: homeServe.breakPointsSaved || 0,
      breakPointsFaced: homeServe.breakPointsFaced || 0,
      // Points stats
      totalPointsWon: homePoints.totalWon || 0,
      winners: homePoints.winners || 0,
      unforcedErrors: homePoints.unforcedErrors || 0,
      // Return stats
      returnPointsWon: homeReturn.returnPointsWon || homePoints.returnPointsWon || 0,
      returnPointsWonPct: homeReturn.returnPointsWonPct || 0,
      firstReturnPointsWon: homeReturn.firstReturnPointsWon || 0,
      firstReturnPointsTotal: homeReturn.firstReturnPointsTotal || 0,
      secondReturnPointsWon: homeReturn.secondReturnPointsWon || 0,
      secondReturnPointsTotal: homeReturn.secondReturnPointsTotal || 0,
      breakPointsWon: homeReturn.breakPointsWon || 0,
      breakPointsTotal: homeReturn.breakPointsTotal || 0,
      // Games
      serviceGamesPlayed: homeServiceGames,
      returnGamesPlayed: awayServiceGames,
    };
    const awayStats = {
      // Serve stats
      aces: awayServe.aces || 0,
      doubleFaults: awayServe.doubleFaults || 0,
      firstServePct: awayServe.firstServePct || 0,
      firstServeIn: awayServe.firstServeIn || awayServe.firstServePointsIn || 0,
      firstServeTotal: awayServe.firstServeTotal || 0,
      firstServePointsWon: awayServe.firstServePointsWon || 0,
      firstServePointsWonPct: awayServe.firstServeWonPct || awayServe.firstServePointsWonPct || 0,
      secondServeTotal: awayServe.secondServeTotal || 0,
      secondServePointsWon: awayServe.secondServePointsWon || 0,
      secondServePointsWonPct: awayServe.secondServeWonPct || awayServe.secondServePointsWonPct || 0,
      servicePointsWon: awayServe.servicePointsWon || awayPoints.servicePointsWon || 0,
      breakPointsSaved: awayServe.breakPointsSaved || 0,
      breakPointsFaced: awayServe.breakPointsFaced || 0,
      // Points stats
      totalPointsWon: awayPoints.totalWon || 0,
      winners: awayPoints.winners || 0,
      unforcedErrors: awayPoints.unforcedErrors || 0,
      // Return stats
      returnPointsWon: awayReturn.returnPointsWon || awayPoints.returnPointsWon || 0,
      returnPointsWonPct: awayReturn.returnPointsWonPct || 0,
      firstReturnPointsWon: awayReturn.firstReturnPointsWon || 0,
      firstReturnPointsTotal: awayReturn.firstReturnPointsTotal || 0,
      secondReturnPointsWon: awayReturn.secondReturnPointsWon || 0,
      secondReturnPointsTotal: awayReturn.secondReturnPointsTotal || 0,
      breakPointsWon: awayReturn.breakPointsWon || 0,
      breakPointsTotal: awayReturn.breakPointsTotal || 0,
      // Games
      serviceGamesPlayed: awayServiceGames,
      returnGamesPlayed: homeServiceGames,
    };
    
    const result = buildTabFromStats({ home: homeStats, away: awayStats }, null, score);
    const gameStats = {
      home: {
        gamesWon: gameStatsFromScore.home.gamesWon,
        tiebreaksWon: gameStatsFromScore.home.tiebreaksWon,
        consecutiveGamesWon: gameStatsFromScore.home.consecutiveGamesWon,
        serviceGamesWon: gameStatsFromScore.home.gamesWon - (statisticsData.return?.away?.breakPointsWon || 0),
      },
      away: {
        gamesWon: gameStatsFromScore.away.gamesWon,
        tiebreaksWon: gameStatsFromScore.away.tiebreaksWon,
        consecutiveGamesWon: gameStatsFromScore.away.consecutiveGamesWon,
        serviceGamesWon: gameStatsFromScore.away.gamesWon - (statisticsData.return?.home?.breakPointsWon || 0),
      },
    };
    
    // For snapshot format, calculate per-set stats from point-by-point data
    const snapshotResult = { ...result, games: gameStats };
    
    // Try to get per-set stats from point-by-point
    const pbpPoints = Array.isArray(pointByPoint) ? pointByPoint : pointByPoint?.points || [];
    const pbpGames = pointByPoint?.games || [];
    const perSetStats = calculateStatsFromPointByPoint(pbpPoints, pbpGames);
    
    // Build periods array and byPeriod object
    const periods = ['ALL'];
    const byPeriod = { ALL: snapshotResult };
    
    if (perSetStats && Object.keys(perSetStats).length > 0) {
      // Add SET1, SET2, etc. from point-by-point calculation
      const setKeys = Object.keys(perSetStats).sort();
      for (const setKey of setKeys) {
        periods.push(setKey);
        byPeriod[setKey] = perSetStats[setKey];
      }
    } else if (score?.sets && score.sets.length > 0) {
      // Fallback: create set entries from score when no PBP data available
      for (let i = 0; i < score.sets.length; i++) {
        const setKey = `SET${i + 1}`;
        const setData = score.sets[i];
        const homeGames = setData.home || 0;
        const awayGames = setData.away || 0;
        
        // Tiebreak detection for this set
        const isTiebreak = (homeGames === 7 && awayGames === 6) || (homeGames === 6 && awayGames === 7);
        const homeTiebreakWon = isTiebreak && homeGames > awayGames ? 1 : 0;
        const awayTiebreakWon = isTiebreak && awayGames > homeGames ? 1 : 0;
        
        // Consecutive games estimate
        const diff = Math.abs(homeGames - awayGames);
        let homeConsec = homeGames > 0 ? 1 : 0;
        let awayConsec = awayGames > 0 ? 1 : 0;
        if (homeGames > awayGames) {
          homeConsec = Math.min(diff + 1, 5);
          awayConsec = awayGames > 0 ? Math.min(2, awayGames) : 0;
        } else if (awayGames > homeGames) {
          awayConsec = Math.min(diff + 1, 5);
          homeConsec = homeGames > 0 ? Math.min(2, homeGames) : 0;
        }
        
        // Estimate service games per player (alternating serve)
        const totalGames = homeGames + awayGames;
        const homeServiceGames = Math.ceil(totalGames / 2);
        const awayServiceGames = Math.floor(totalGames / 2);
        
        // Estimate service games won from games won and breaks
        // Assuming proportional distribution of breaks across sets
        const totalHomeServiceGamesWon = snapshotResult.serve?.home?.serviceGamesWon || 0;
        const totalAwayServiceGamesWon = snapshotResult.serve?.away?.serviceGamesWon || 0;
        const totalHomeGamesWon = gameStatsFromScore.home.gamesWon || 1;
        const totalAwayGamesWon = gameStatsFromScore.away.gamesWon || 1;
        
        // Proportional estimate
        const homeServiceGamesWonEst = Math.round(totalHomeServiceGamesWon * (homeGames / totalHomeGamesWon));
        const awayServiceGamesWonEst = Math.round(totalAwayServiceGamesWon * (awayGames / totalAwayGamesWon));
        
        // Estimate points for this set proportionally from ALL
        const allPoints = snapshotResult.points || { home: {}, away: {} };
        const allTotalGames = totalHomeGamesWon + totalAwayGamesWon || 1;
        const setTotalGames = homeGames + awayGames;
        const setRatio = setTotalGames / allTotalGames;
        
        const homePointsEst = Math.round((allPoints.home?.totalWon || 0) * setRatio);
        const awayPointsEst = Math.round((allPoints.away?.totalWon || 0) * setRatio);
        const homeServicePointsEst = Math.round((allPoints.home?.servicePointsWon || 0) * setRatio);
        const awayServicePointsEst = Math.round((allPoints.away?.servicePointsWon || 0) * setRatio);
        const homeReturnPointsEst = Math.round((allPoints.home?.returnPointsWon || 0) * setRatio);
        const awayReturnPointsEst = Math.round((allPoints.away?.returnPointsWon || 0) * setRatio);
        
        // Max consecutive points - estimate based on set length (shorter sets = fewer consecutive)
        const homeMaxConsec = Math.max(2, Math.round((allPoints.home?.maxConsecutivePointsWon || 3) * Math.sqrt(setRatio)));
        const awayMaxConsec = Math.max(2, Math.round((allPoints.away?.maxConsecutivePointsWon || 3) * Math.sqrt(setRatio)));
        
        periods.push(setKey);
        byPeriod[setKey] = {
          serve: { 
            home: { serviceGamesPlayed: homeServiceGames, serviceGamesWon: homeServiceGamesWonEst }, 
            away: { serviceGamesPlayed: awayServiceGames, serviceGamesWon: awayServiceGamesWonEst } 
          },
          return: { 
            home: { returnGamesPlayed: awayServiceGames }, 
            away: { returnGamesPlayed: homeServiceGames } 
          },
          points: { 
            home: { 
              totalWon: homePointsEst, 
              servicePointsWon: homeServicePointsEst, 
              returnPointsWon: homeReturnPointsEst,
              maxConsecutivePointsWon: homeMaxConsec,
              winners: 0,
              unforcedErrors: 0
            }, 
            away: { 
              totalWon: awayPointsEst, 
              servicePointsWon: awayServicePointsEst, 
              returnPointsWon: awayReturnPointsEst,
              maxConsecutivePointsWon: awayMaxConsec,
              winners: 0,
              unforcedErrors: 0
            } 
          },
          games: {
            home: {
              gamesWon: homeGames,
              tiebreaksWon: homeTiebreakWon,
              consecutiveGamesWon: homeConsec,
              serviceGamesWon: homeServiceGamesWonEst,
            },
            away: {
              gamesWon: awayGames,
              tiebreaksWon: awayTiebreakWon,
              consecutiveGamesWon: awayConsec,
              serviceGamesWon: awayServiceGamesWonEst,
            },
          },
        };
      }
    }
    
    return {
      periods,
      byPeriod,
      ...snapshotResult,
      dataSource: 'snapshot',
    };
  }

  const isNewFormat = statisticsData && (statisticsData.ALL || statisticsData.SET1);

  // Extract PBP stats if available
  const pbpPoints = Array.isArray(pointByPoint) ? pointByPoint : pointByPoint?.points || [];
  const pbpStats = null; // TODO: extractAllStatsFromPBP if needed

  if (isNewFormat) {
    const periods = Object.keys(statisticsData).filter((k) => statisticsData[k]);
    const byPeriod = {};
    const gameStatsFromScore = calculateGameStatsFromScore(score);
    const allStats = statisticsData.ALL ? extractStatsFromRecord(statisticsData.ALL) : {};

    // Calculate serviceGamesWon: serviceGames - breaks conceded
    // Home's service games won = home service games - away break points won
    const homeServiceGames = allStats.home?.serviceGamesPlayed || Math.ceil(gameStatsFromScore.home.gamesWon + gameStatsFromScore.away.gamesWon) / 2;
    const awayServiceGames = allStats.away?.serviceGamesPlayed || Math.floor(gameStatsFromScore.home.gamesWon + gameStatsFromScore.away.gamesWon) / 2;
    const homeBreakPointsWon = allStats.home?.breakPointsWon || 0;
    const awayBreakPointsWon = allStats.away?.breakPointsWon || 0;
    
    const homeServiceGamesWon = Math.max(0, homeServiceGames - awayBreakPointsWon);
    const awayServiceGamesWon = Math.max(0, awayServiceGames - homeBreakPointsWon);

    const gameStats = {
      home: {
        gamesWon: allStats.home?.gamesWon || gameStatsFromScore.home.gamesWon,
        tiebreaksWon:
          allStats.home?.tiebreaksWon !== undefined
            ? allStats.home.tiebreaksWon
            : gameStatsFromScore.home.tiebreaksWon,
        consecutiveGamesWon:
          allStats.home?.maxConsecutiveGamesWon || gameStatsFromScore.home.consecutiveGamesWon,
        serviceGamesWon: homeServiceGamesWon,
      },
      away: {
        gamesWon: allStats.away?.gamesWon || gameStatsFromScore.away.gamesWon,
        tiebreaksWon:
          allStats.away?.tiebreaksWon !== undefined
            ? allStats.away.tiebreaksWon
            : gameStatsFromScore.away.tiebreaksWon,
        consecutiveGamesWon:
          allStats.away?.maxConsecutiveGamesWon || gameStatsFromScore.away.consecutiveGamesWon,
        serviceGamesWon: awayServiceGamesWon,
      },
    };

    for (const period of periods) {
      const stats = extractStatsFromRecord(statisticsData[period]);
      
      // Build period-specific score for accurate service games calculation
      let periodScore = score;
      if (period !== 'ALL') {
        const setMatch = period.match(/SET(\d+)/);
        const setIndex = setMatch ? parseInt(setMatch[1]) - 1 : -1;
        const sets = score?.sets || [];
        if (setIndex >= 0 && setIndex < sets.length) {
          // Create score with only this set for accurate service games
          periodScore = { sets: [sets[setIndex]] };
        }
      }
      
      const periodTab = buildTabFromStats(stats, pbpStats, periodScore);
      
      // Calculate period-specific game stats
      let periodGameStats;
      if (period === 'ALL') {
        // Use the overall gameStats for ALL
        periodGameStats = gameStats;
      } else {
        // Extract set index from period name (SET1 -> 0, SET2 -> 1, etc.)
        const setMatch = period.match(/SET(\d+)/);
        const setIndex = setMatch ? parseInt(setMatch[1]) - 1 : -1;
        const sets = score?.sets || [];
        const setData = setIndex >= 0 && setIndex < sets.length ? sets[setIndex] : null;
        
        if (setData) {
          // Calculate from actual set score
          const homeGames = setData.home || 0;
          const awayGames = setData.away || 0;
          
          // Tiebreak detection for this set
          const isTiebreak = (homeGames === 7 && awayGames === 6) || (homeGames === 6 && awayGames === 7);
          const homeTiebreakWon = isTiebreak && homeGames > awayGames ? 1 : 0;
          const awayTiebreakWon = isTiebreak && awayGames > homeGames ? 1 : 0;
          
          // Consecutive games estimate for this set
          const diff = Math.abs(homeGames - awayGames);
          let homeConsec = 1, awayConsec = 1;
          if (homeGames > awayGames) {
            homeConsec = Math.min(diff + 1, 5);
            awayConsec = awayGames > 0 ? Math.min(2, awayGames) : 0;
          } else if (awayGames > homeGames) {
            awayConsec = Math.min(diff + 1, 5);
            homeConsec = homeGames > 0 ? Math.min(2, homeGames) : 0;
          }
          
          // Service games won: games won minus breaks conceded
          // Breaks conceded by home = stats.away.breakPointsWon (away converted breaks on home's serve)
          const homeServiceWon = Math.max(0, homeGames - (stats.away?.breakPointsWon || 0));
          const awayServiceWon = Math.max(0, awayGames - (stats.home?.breakPointsWon || 0));
          
          periodGameStats = {
            home: {
              gamesWon: homeGames,
              tiebreaksWon: stats.home?.tiebreaksWon ?? homeTiebreakWon,
              consecutiveGamesWon: stats.home?.maxConsecutiveGamesWon || homeConsec,
              serviceGamesWon: stats.home?.serviceGamesWon || homeServiceWon,
            },
            away: {
              gamesWon: awayGames,
              tiebreaksWon: stats.away?.tiebreaksWon ?? awayTiebreakWon,
              consecutiveGamesWon: stats.away?.maxConsecutiveGamesWon || awayConsec,
              serviceGamesWon: stats.away?.serviceGamesWon || awayServiceWon,
            },
          };
        } else {
          // Fallback: use stats from the period if available, otherwise use match totals
          periodGameStats = {
            home: {
              gamesWon: stats.home?.gamesWon || 0,
              tiebreaksWon: stats.home?.tiebreaksWon || 0,
              consecutiveGamesWon: stats.home?.maxConsecutiveGamesWon || 0,
              serviceGamesWon: stats.home?.serviceGamesWon || 0,
            },
            away: {
              gamesWon: stats.away?.gamesWon || 0,
              tiebreaksWon: stats.away?.tiebreaksWon || 0,
              consecutiveGamesWon: stats.away?.maxConsecutiveGamesWon || 0,
              serviceGamesWon: stats.away?.serviceGamesWon || 0,
            },
          };
        }
      }
      
      byPeriod[period] = { ...periodTab, games: periodGameStats };
    }

    const defaultStats = statisticsData.ALL
      ? extractStatsFromRecord(statisticsData.ALL)
      : extractStatsFromRecord(statisticsData[periods[0]]);

    const defaultTab = buildTabFromStats(defaultStats, pbpStats, score);

    return {
      ...defaultTab,
      games: gameStats,
      periods: periods.sort((a, b) => {
        if (a === 'ALL') return -1;
        if (b === 'ALL') return 1;
        return a.localeCompare(b);
      }),
      byPeriod,
      dataSource: 'statistics',
    };
  }

  // Old format or missing data - estimate from score
  const statistics = statisticsData || {};
  const hasRealStats =
    statistics.home &&
    (statistics.home.aces !== undefined ||
      statistics.home.firstServePct !== undefined ||
      statistics.home.firstServePointsWonPct !== undefined);

  if (hasRealStats) {
    const result = buildTabFromStats(
      {
        home: statistics.home || {},
        away: statistics.away || {},
      },
      pbpStats,
      score
    );
    const gameStatsFromScore = calculateGameStatsFromScore(score);
    const gameStats = {
      home: {
        gamesWon: gameStatsFromScore.home.gamesWon,
        tiebreaksWon: gameStatsFromScore.home.tiebreaksWon,
        consecutiveGamesWon:
          statistics.home?.maxConsecutiveGamesWon || gameStatsFromScore.home.consecutiveGamesWon,
      },
      away: {
        gamesWon: gameStatsFromScore.away.gamesWon,
        tiebreaksWon: gameStatsFromScore.away.tiebreaksWon,
        consecutiveGamesWon:
          statistics.away?.maxConsecutiveGamesWon || gameStatsFromScore.away.consecutiveGamesWon,
      },
    };
    return { ...result, games: gameStats, dataSource: 'statistics' };
  }

  // Estimate stats from score
  const sets = score?.sets || [];
  let homeGames = 0,
    awayGames = 0;
  let homeSetsWon = 0,
    awaySetsWon = 0;

  sets.forEach((set) => {
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

  const homeFirstServe = Math.round(55 + gameRatio * 20);
  const awayFirstServe = Math.round(55 + (1 - gameRatio) * 20);
  const homeFirstServeWon = Math.round(60 + gameRatio * 25);
  const awayFirstServeWon = Math.round(60 + (1 - gameRatio) * 25);
  const homeSecondServeWon = Math.round(45 + gameRatio * 15);
  const awaySecondServeWon = Math.round(45 + (1 - gameRatio) * 15);

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
        secondServeWonPct: homeSecondServeWon,
      },
      away: {
        aces: awayAces,
        doubleFaults: awayDF,
        firstServePct: awayFirstServe,
        firstServeWonPct: awayFirstServeWon,
        secondServeWonPct: awaySecondServeWon,
      },
    },
    return: {
      home: {
        returnPointsWonPct: Math.round(35 + gameRatio * 20),
        breakPointsWon: homeBreaksConverted,
        // FILOSOFIA_CALCOLI: deterministic calculation, estimate attempts as won + 1
        breakPointsTotal: homeBreaksConverted + 1,
      },
      away: {
        returnPointsWonPct: Math.round(35 + (1 - gameRatio) * 20),
        breakPointsWon: awayBreaksConverted,
        // FILOSOFIA_CALCOLI: deterministic calculation, estimate attempts as won + 1
        breakPointsTotal: awayBreaksConverted + 1,
      },
    },
    points: {
      home: {
        totalWon: homePoints,
        winners: Math.round(homePoints * 0.25),
        unforcedErrors: Math.round(homePoints * (isHomeWinner ? 0.15 : 0.2)),
      },
      away: {
        totalWon: awayPoints,
        winners: Math.round(awayPoints * 0.25),
        unforcedErrors: Math.round(awayPoints * (!isHomeWinner ? 0.15 : 0.2)),
      },
    },
    games: calculateGameStatsFromScore(score),
    dataSource: 'estimated',
  };
}

module.exports = {
  VERSION,
  convertSofaScoreArrayFormat,
  extractStatsFromRecord,
  buildTabFromStats,
  buildStatsTab,
};
