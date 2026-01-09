// End-to-end test: simulates the full bundle with test data and shows output
require('dotenv').config();
const { buildStatsTab } = require('./utils/statsTabBuilder.js');

// ========================================
// TEST 1: Database format (p1_*, p2_*)
// ========================================
console.log('========================================');
console.log('TEST 1: DATABASE FORMAT (p1_*, p2_*)');
console.log('========================================\n');

const statisticsData = {
  ALL: {
    p1_aces: 1,
    p1_double_faults: 6,
    p1_first_serve_pct: 68,
    p1_first_serve_total: 38,
    p1_first_serve_won: 29,
    p1_second_serve_total: 18,
    p1_second_serve_won: 9,
    p1_break_points_won: 4,
    p1_break_points_total: 7,
    p1_total_points_won: 71,
    
    p2_aces: 0,
    p2_double_faults: 1,
    p2_first_serve_pct: 68,
    p2_first_serve_total: 36,
    p2_first_serve_won: 19,
    p2_second_serve_total: 17,
    p2_second_serve_won: 8,
    p2_break_points_won: 1,
    p2_break_points_total: 1,
    p2_total_points_won: 38
  },
  SET1: {
    p1_first_serve_total: 24,
    p1_first_serve_won: 17,
    p1_second_serve_total: 10,
    p1_second_serve_won: 4,
    p2_first_serve_total: 15,
    p2_first_serve_won: 7,
    p2_second_serve_total: 7,
    p2_second_serve_won: 4
  }
};

const matchData = { match: { id: 14968724 } };
const score = {
  sets: [
    { home: 6, away: 3 },
    { home: 6, away: 2 }
  ]
};

const statsTab1 = buildStatsTab(statisticsData, matchData, score, null);
const p1 = statsTab1.byPeriod?.ALL || statsTab1;

console.log('dataSource:', statsTab1.dataSource);
console.log('periods:', statsTab1.periods);

// ========================================
// TEST 2: Snapshot format (serve/return/points)
// ========================================
console.log('\n========================================');
console.log('TEST 2: SNAPSHOT FORMAT (serve/return/points)');
console.log('========================================\n');

// This is the format that comes from matchCardService.getMatchCardFromSnapshot()
// when stats_json contains pre-processed stats
const snapshotStats = {
  serve: {
    home: {
      aces: 1,
      doubleFaults: 6,
      firstServePct: 68,
      firstServeIn: 38,
      firstServeTotal: 56,
      firstServePointsWon: 29,
      firstServeWonPct: 76,
      secondServeTotal: 18,
      secondServePointsWon: 9,
      secondServeWonPct: 50,
      servicePointsWon: 38,
      breakPointsSaved: 0,
      breakPointsFaced: 1,
      serviceGamesPlayed: 9
    },
    away: {
      aces: 0,
      doubleFaults: 1,
      firstServePct: 68,
      firstServeIn: 36,
      firstServeTotal: 53,
      firstServePointsWon: 19,
      firstServeWonPct: 53,
      secondServeTotal: 17,
      secondServePointsWon: 8,
      secondServeWonPct: 47,
      servicePointsWon: 27,
      breakPointsSaved: 3,
      breakPointsFaced: 7,
      serviceGamesPlayed: 8
    }
  },
  return: {
    home: {
      returnPointsWon: 26,
      returnPointsWonPct: 49,
      firstReturnPointsWon: 17,
      firstReturnPointsTotal: 36,
      secondReturnPointsWon: 9,
      secondReturnPointsTotal: 17,
      breakPointsWon: 4,
      breakPointsTotal: 7,
      returnGamesPlayed: 8
    },
    away: {
      returnPointsWon: 18,
      returnPointsWonPct: 32,
      firstReturnPointsWon: 9,
      firstReturnPointsTotal: 38,
      secondReturnPointsWon: 9,
      secondReturnPointsTotal: 18,
      breakPointsWon: 1,
      breakPointsTotal: 1,
      returnGamesPlayed: 9
    }
  },
  points: {
    home: {
      totalWon: 71,
      servicePointsWon: 38,
      returnPointsWon: 26,
      winners: 7,
      unforcedErrors: 11
    },
    away: {
      totalWon: 38,
      servicePointsWon: 27,
      returnPointsWon: 18,
      winners: 2,
      unforcedErrors: 10
    }
  }
};

const statsTab2 = buildStatsTab(snapshotStats, matchData, score, null);
const p2 = statsTab2.byPeriod?.ALL || statsTab2;

console.log('dataSource:', statsTab2.dataSource);
console.log('periods:', statsTab2.periods);

// ========================================
// VALIDATION
// ========================================
console.log('\n========================================');
console.log('VALIDATION');
console.log('========================================\n');

const expected = {
  totalPointsHome: 71,
  totalPointsAway: 38,
  servicePointsHome: 38,
  servicePointsAway: 27,
  returnPointsHome: 26,
  returnPointsAway: 18,
  serviceGamesHome: 9,
  serviceGamesAway: 8
};

function check(name, actual, expectedVal) {
  const ok = actual === expectedVal;
  console.log(ok ? `✅ ${name}: ${actual}` : `❌ ${name}: got ${actual}, expected ${expectedVal}`);
  return ok;
}

console.log('--- DB FORMAT ---');
let allCorrect1 = true;
allCorrect1 &= check('Total Points Home', p1.points?.home?.totalWon, expected.totalPointsHome);
allCorrect1 &= check('Total Points Away', p1.points?.away?.totalWon, expected.totalPointsAway);
allCorrect1 &= check('Service Points Home', p1.points?.home?.servicePointsWon, expected.servicePointsHome);
allCorrect1 &= check('Service Points Away', p1.points?.away?.servicePointsWon, expected.servicePointsAway);
allCorrect1 &= check('Return Points Home', p1.points?.home?.returnPointsWon, expected.returnPointsHome);
allCorrect1 &= check('Return Points Away', p1.points?.away?.returnPointsWon, expected.returnPointsAway);
allCorrect1 &= check('Service Games Home', p1.serve?.home?.serviceGamesPlayed, expected.serviceGamesHome);
allCorrect1 &= check('Service Games Away', p1.serve?.away?.serviceGamesPlayed, expected.serviceGamesAway);
// Service Games Won = service games played - breaks conceded
// Home gioca 9 servizi, away converte 1 break -> home vince 8 servizi
// Away gioca 8 servizi, home converte 4 break -> away vince 4 servizi
allCorrect1 &= check('Service Games WON Home', p1.serve?.home?.serviceGamesWon, 8);
allCorrect1 &= check('Service Games WON Away', p1.serve?.away?.serviceGamesWon, 4);

console.log('\n--- SNAPSHOT FORMAT ---');
let allCorrect2 = true;
allCorrect2 &= check('Total Points Home', p2.points?.home?.totalWon, expected.totalPointsHome);
allCorrect2 &= check('Total Points Away', p2.points?.away?.totalWon, expected.totalPointsAway);
allCorrect2 &= check('Service Points Home', p2.points?.home?.servicePointsWon, expected.servicePointsHome);
allCorrect2 &= check('Service Points Away', p2.points?.away?.servicePointsWon, expected.servicePointsAway);
allCorrect2 &= check('Return Points Home', p2.points?.home?.returnPointsWon, expected.returnPointsHome);
allCorrect2 &= check('Return Points Away', p2.points?.away?.returnPointsWon, expected.returnPointsAway);
allCorrect2 &= check('Service Games Home', p2.serve?.home?.serviceGamesPlayed, expected.serviceGamesHome);
allCorrect2 &= check('Service Games Away', p2.serve?.away?.serviceGamesPlayed, expected.serviceGamesAway);
allCorrect2 &= check('Service Games WON Home', p2.serve?.home?.serviceGamesWon, 8);
allCorrect2 &= check('Service Games WON Away', p2.serve?.away?.serviceGamesWon, 4);

console.log('\n========================================');
console.log(allCorrect1 && allCorrect2 ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED!');
console.log('========================================');
