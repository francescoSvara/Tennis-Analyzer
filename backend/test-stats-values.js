/**
 * Test script to verify stats values are correct
 */
const { buildStatsTab } = require('./utils/statsTabBuilder.js');

// Sample data from a typical Gauff vs Sakkari match (6-3, 6-2)
// Based on SofaScore format
const statisticsData = {
  ALL: {
    p1_aces: 1,
    p1_double_faults: 6,
    p1_first_serve_pct: 68,
    p1_first_serve_total: 38,  // Prime servite entrate
    p1_first_serve_won: 29,     // Punti vinti con la prima
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
  },
  SET2: {
    p1_first_serve_total: 14,
    p1_first_serve_won: 12,
    p1_second_serve_total: 8,
    p1_second_serve_won: 5,
    p2_first_serve_total: 21,
    p2_first_serve_won: 12,
    p2_second_serve_total: 10,
    p2_second_serve_won: 4
  }
};

const score = {
  sets: [
    { home: 6, away: 3 },
    { home: 6, away: 2 }
  ]
};

// Calculate expected values manually
console.log('=== EXPECTED VALUES (calculated manually) ===\n');

// Gauff (home)
const g = {
  aces: 1,
  df: 6,
  firstServeIn: 38,
  firstServeWon: 29,
  secondServeTotal: 18,
  secondServeWon: 9,
  serviceTotal: 38 + 18, // 56
  serviceWon: 29 + 9,    // 38
  totalPointsWon: 71
};

// Sakkari (away)
const s = {
  aces: 0,
  df: 1,
  firstServeIn: 36,
  firstServeWon: 19,
  secondServeTotal: 17,
  secondServeWon: 8,
  serviceTotal: 36 + 17, // 53
  serviceWon: 19 + 8,    // 27
  totalPointsWon: 38
};

// Return points = opponent's service points lost
g.returnWon = s.serviceTotal - s.serviceWon; // 53 - 27 = 26
s.returnWon = g.serviceTotal - g.serviceWon; // 56 - 38 = 18

console.log('SERVE CARD:');
console.log('  Aces: Gauff', g.aces, '| Sakkari', s.aces);
console.log('  Doppi Falli: Gauff', g.df, '| Sakkari', s.df);
console.log('  Primo Servizio %: Gauff', g.firstServeIn + '/' + g.serviceTotal, '| Sakkari', s.firstServeIn + '/' + s.serviceTotal);
console.log('  Punti Primo Servizio: Gauff', g.firstServeWon + '/' + g.firstServeIn, '| Sakkari', s.firstServeWon + '/' + s.firstServeIn);
console.log('  Punti Secondo Servizio: Gauff', g.secondServeWon + '/' + g.secondServeTotal, '| Sakkari', s.secondServeWon + '/' + s.secondServeTotal);
console.log('  Servizio (games): Gauff 9 | Sakkari 8 (from score 17 total games)');
console.log('  Break Points Salvati: Gauff', (1 - 1) + '/' + 1, '| Sakkari', (7 - 4) + '/' + 7);

console.log('\nRETURN CARD:');
console.log('  Return Games: Gauff 8 | Sakkari 9');
console.log('  Primo Ritorno Vinti: Gauff', (s.firstServeIn - s.firstServeWon) + '/' + s.firstServeIn, '| Sakkari', (g.firstServeIn - g.firstServeWon) + '/' + g.firstServeIn);
console.log('  Secondo Ritorno Vinti: Gauff', (s.secondServeTotal - s.secondServeWon) + '/' + s.secondServeTotal, '| Sakkari', (g.secondServeTotal - g.secondServeWon) + '/' + g.secondServeTotal);
console.log('  Break Points Vinti: Gauff 4/7 | Sakkari 1/1');

console.log('\nPOINTS CARD:');
console.log('  Punti Totali Vinti: Gauff', g.totalPointsWon, '| Sakkari', s.totalPointsWon);
console.log('  Punti Servizio Vinti: Gauff', g.serviceWon, '| Sakkari', s.serviceWon);
console.log('  Punti Ritorno Vinti: Gauff', g.returnWon, '| Sakkari', s.returnWon);

// Check: total = service + return
console.log('\n  CHECK: Gauff service(' + g.serviceWon + ') + return(' + g.returnWon + ') =', g.serviceWon + g.returnWon, '(should be', g.totalPointsWon, ')');
console.log('  CHECK: Sakkari service(' + s.serviceWon + ') + return(' + s.returnWon + ') =', s.serviceWon + s.returnWon, '(should be', s.totalPointsWon, ')');

console.log('\n=== ACTUAL OUTPUT FROM buildStatsTab ===\n');

const result = buildStatsTab(statisticsData, null, score, null);

// Check serve
console.log('SERVE:');
console.log('  Aces: home', result.serve.home.aces, '| away', result.serve.away.aces);
console.log('  DF: home', result.serve.home.doubleFaults, '| away', result.serve.away.doubleFaults);
console.log('  1st%: home', result.serve.home.firstServeIn + '/' + result.serve.home.firstServeTotal, '| away', result.serve.away.firstServeIn + '/' + result.serve.away.firstServeTotal);
console.log('  1stWon: home', result.serve.home.firstServePointsWon + '/' + result.serve.home.firstServePointsIn, '| away', result.serve.away.firstServePointsWon + '/' + result.serve.away.firstServePointsIn);
console.log('  2ndWon: home', result.serve.home.secondServePointsWon + '/' + result.serve.home.secondServeTotal, '| away', result.serve.away.secondServePointsWon + '/' + result.serve.away.secondServeTotal);
console.log('  ServiceGames: home', result.serve.home.serviceGamesPlayed, '| away', result.serve.away.serviceGamesPlayed);
console.log('  BPSaved: home', result.serve.home.breakPointsSaved + '/' + result.serve.home.breakPointsFaced, '| away', result.serve.away.breakPointsSaved + '/' + result.serve.away.breakPointsFaced);

console.log('\nRETURN:');
console.log('  ReturnGames: home', result.return.home.returnGamesPlayed, '| away', result.return.away.returnGamesPlayed);
console.log('  1stReturn: home', result.return.home.firstReturnPointsWon + '/' + result.return.home.firstReturnPointsTotal, '| away', result.return.away.firstReturnPointsWon + '/' + result.return.away.firstReturnPointsTotal);
console.log('  2ndReturn: home', result.return.home.secondReturnPointsWon + '/' + result.return.home.secondReturnPointsTotal, '| away', result.return.away.secondReturnPointsWon + '/' + result.return.away.secondReturnPointsTotal);
console.log('  BPWon: home', result.return.home.breakPointsWon + '/' + result.return.home.breakPointsTotal, '| away', result.return.away.breakPointsWon + '/' + result.return.away.breakPointsTotal);

console.log('\nPOINTS:');
console.log('  TotalWon: home', result.points.home.totalWon, '| away', result.points.away.totalWon);
console.log('  ServicePtsWon: home', result.points.home.servicePointsWon, '| away', result.points.away.servicePointsWon);
console.log('  ReturnPtsWon: home', result.points.home.returnPointsWon, '| away', result.points.away.returnPointsWon);

console.log('\nGAMES:');
console.log('  GamesWon: home', result.games.home.gamesWon, '| away', result.games.away.gamesWon);
console.log('  ServiceGamesWon: home', result.games.home.serviceGamesWon, '| away', result.games.away.serviceGamesWon);
console.log('  TiebreaksWon: home', result.games.home.tiebreaksWon, '| away', result.games.away.tiebreaksWon);

console.log('\n=== COMPARISON ===\n');
const issues = [];

// Service Games
if (result.serve.home.serviceGamesPlayed !== 9) issues.push('Home serviceGames should be 9, got ' + result.serve.home.serviceGamesPlayed);
if (result.serve.away.serviceGamesPlayed !== 8) issues.push('Away serviceGames should be 8, got ' + result.serve.away.serviceGamesPlayed);

// Return Games
if (result.return.home.returnGamesPlayed !== 8) issues.push('Home returnGames should be 8, got ' + result.return.home.returnGamesPlayed);
if (result.return.away.returnGamesPlayed !== 9) issues.push('Away returnGames should be 9, got ' + result.return.away.returnGamesPlayed);

// Points
if (result.points.home.totalWon !== 71) issues.push('Home totalWon should be 71, got ' + result.points.home.totalWon);
if (result.points.away.totalWon !== 38) issues.push('Away totalWon should be 38, got ' + result.points.away.totalWon);
if (result.points.home.servicePointsWon !== 38) issues.push('Home servicePointsWon should be 38, got ' + result.points.home.servicePointsWon);
if (result.points.away.servicePointsWon !== 27) issues.push('Away servicePointsWon should be 27, got ' + result.points.away.servicePointsWon);
if (result.points.home.returnPointsWon !== 26) issues.push('Home returnPointsWon should be 26, got ' + result.points.home.returnPointsWon);
if (result.points.away.returnPointsWon !== 18) issues.push('Away returnPointsWon should be 18, got ' + result.points.away.returnPointsWon);

// First Return
if (result.return.home.firstReturnPointsWon !== 17) issues.push('Home 1stReturn should be 17, got ' + result.return.home.firstReturnPointsWon);
if (result.return.home.firstReturnPointsTotal !== 36) issues.push('Home 1stReturn total should be 36, got ' + result.return.home.firstReturnPointsTotal);
if (result.return.away.firstReturnPointsWon !== 9) issues.push('Away 1stReturn should be 9, got ' + result.return.away.firstReturnPointsWon);
if (result.return.away.firstReturnPointsTotal !== 38) issues.push('Away 1stReturn total should be 38, got ' + result.return.away.firstReturnPointsTotal);

// Second Return
if (result.return.home.secondReturnPointsWon !== 9) issues.push('Home 2ndReturn should be 9, got ' + result.return.home.secondReturnPointsWon);
if (result.return.home.secondReturnPointsTotal !== 17) issues.push('Home 2ndReturn total should be 17, got ' + result.return.home.secondReturnPointsTotal);
if (result.return.away.secondReturnPointsWon !== 9) issues.push('Away 2ndReturn should be 9, got ' + result.return.away.secondReturnPointsWon);
if (result.return.away.secondReturnPointsTotal !== 18) issues.push('Away 2ndReturn total should be 18, got ' + result.return.away.secondReturnPointsTotal);

// Games Won
if (result.games.home.gamesWon !== 12) issues.push('Home gamesWon should be 12, got ' + result.games.home.gamesWon);
if (result.games.away.gamesWon !== 5) issues.push('Away gamesWon should be 5, got ' + result.games.away.gamesWon);

if (issues.length === 0) {
  console.log('✅ All values are CORRECT!');
} else {
  console.log('❌ Issues found:');
  issues.forEach(i => console.log('  -', i));
}
