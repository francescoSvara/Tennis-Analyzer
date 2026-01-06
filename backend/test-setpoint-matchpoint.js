/**
 * Test per le funzioni isSetPointScore e isMatchPointScore
 */

const { isSetPointScore, isMatchPointScore, isTiebreakGame } = require('./utils/bundleHelpers');

console.log('🎾 Testing Set Point and Match Point Detection\n');

// Test Set Point
const setPointTests = [
  // Game normale: 5-4, serve HOME, HOME ha 40-30 -> Set Point per HOME
  { score: '40-30', server: 'home', gameScore: { home: 5, away: 4 }, isTiebreak: false, expected: { isSetPoint: true, setPointFor: 'home' } },
  // Game normale: 4-5, serve HOME, AWAY ha 30-40 -> Set Point per AWAY
  { score: '30-40', server: 'home', gameScore: { home: 4, away: 5 }, isTiebreak: false, expected: { isSetPoint: true, setPointFor: 'away' } },
  // Game normale: 5-0, serve AWAY, AWAY ha AD -> Set Point per HOME (no, away serve quindi se home ha break point no set point perche home è a 5 ma non serve)
  // Corretto: 5-0, serve HOME, HOME ha 40-15 -> Set Point per HOME
  { score: '40-15', server: 'home', gameScore: { home: 5, away: 0 }, isTiebreak: false, expected: { isSetPoint: true, setPointFor: 'home' } },
  // 5-5, serve HOME, HOME ha 40-30 -> NON set point (serve 6-5 per andare avanti)
  { score: '40-30', server: 'home', gameScore: { home: 5, away: 5 }, isTiebreak: false, expected: { isSetPoint: false, setPointFor: null } },
  // 6-5, serve HOME, HOME ha 40-30 -> Set Point per HOME
  { score: '40-30', server: 'home', gameScore: { home: 6, away: 5 }, isTiebreak: false, expected: { isSetPoint: true, setPointFor: 'home' } },
  // 4-5, serve AWAY, AWAY ha 40-AD -> Set Point per AWAY
  { score: '40-AD', server: 'home', gameScore: { home: 4, away: 5 }, isTiebreak: false, expected: { isSetPoint: true, setPointFor: 'away' } },
  // Tiebreak: 6-6 games, score 6-5 nel TB -> Set Point per HOME
  { score: '6-5', server: 'home', gameScore: { home: 6, away: 6 }, isTiebreak: true, expected: { isSetPoint: true, setPointFor: 'home' } },
  // Tiebreak: 6-6 games, score 5-6 nel TB -> Set Point per AWAY
  { score: '5-6', server: 'home', gameScore: { home: 6, away: 6 }, isTiebreak: true, expected: { isSetPoint: true, setPointFor: 'away' } },
  // Tiebreak: 6-6 games, score 6-6 nel TB -> NON set point
  { score: '6-6', server: 'home', gameScore: { home: 6, away: 6 }, isTiebreak: true, expected: { isSetPoint: false, setPointFor: null } },
  // 3-4, serve HOME, AWAY ha 30-40 -> NON set point (away a 4 games non basta)
  { score: '30-40', server: 'home', gameScore: { home: 3, away: 4 }, isTiebreak: false, expected: { isSetPoint: false, setPointFor: null } },
];

console.log('=== SET POINT TESTS ===\n');
let passed = 0;
let failed = 0;

for (const test of setPointTests) {
  const result = isSetPointScore(test.score, test.server, test.gameScore, test.isTiebreak);
  const isPass = result.isSetPoint === test.expected.isSetPoint && result.setPointFor === test.expected.setPointFor;
  
  if (isPass) {
    passed++;
    console.log(`✅ PASS: ${test.score} | Server: ${test.server} | Games: ${test.gameScore.home}-${test.gameScore.away} | TB: ${test.isTiebreak}`);
    console.log(`   Expected: SP=${test.expected.isSetPoint}, For=${test.expected.setPointFor}`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${test.score} | Server: ${test.server} | Games: ${test.gameScore.home}-${test.gameScore.away} | TB: ${test.isTiebreak}`);
    console.log(`   Expected: SP=${test.expected.isSetPoint}, For=${test.expected.setPointFor}`);
    console.log(`   Got:      SP=${result.isSetPoint}, For=${result.setPointFor}`);
  }
}

// Test Match Point
const matchPointTests = [
  // Set 2, HOME ha già 1 set, 5-4 games, 40-30 -> Match Point per HOME
  { score: '40-30', server: 'home', gameScore: { home: 5, away: 4 }, setScore: { home: 1, away: 0 }, isTiebreak: false, expected: { isMatchPoint: true, matchPointFor: 'home' } },
  // Set 2, AWAY ha già 1 set, 4-5 games, 30-40 -> Match Point per AWAY
  { score: '30-40', server: 'home', gameScore: { home: 4, away: 5 }, setScore: { home: 0, away: 1 }, isTiebreak: false, expected: { isMatchPoint: true, matchPointFor: 'away' } },
  // Set 1, 5-4 games, 40-30 -> Set Point ma NON Match Point
  { score: '40-30', server: 'home', gameScore: { home: 5, away: 4 }, setScore: { home: 0, away: 0 }, isTiebreak: false, expected: { isMatchPoint: false, matchPointFor: null } },
  // Set 3, 1-1 sets, 6-5 games, 40-30 -> Match Point per HOME
  { score: '40-30', server: 'home', gameScore: { home: 6, away: 5 }, setScore: { home: 1, away: 1 }, isTiebreak: false, expected: { isMatchPoint: true, matchPointFor: 'home' } },
  // Tiebreak Set 3, 1-1 sets, 6-5 nel TB -> Match Point per HOME
  { score: '6-5', server: 'home', gameScore: { home: 6, away: 6 }, setScore: { home: 1, away: 1 }, isTiebreak: true, expected: { isMatchPoint: true, matchPointFor: 'home' } },
];

console.log('\n=== MATCH POINT TESTS ===\n');

for (const test of matchPointTests) {
  const result = isMatchPointScore(test.score, test.server, test.gameScore, test.setScore, test.isTiebreak, 3);
  const isPass = result.isMatchPoint === test.expected.isMatchPoint && result.matchPointFor === test.expected.matchPointFor;
  
  if (isPass) {
    passed++;
    console.log(`✅ PASS: ${test.score} | Server: ${test.server} | Games: ${test.gameScore.home}-${test.gameScore.away} | Sets: ${test.setScore.home}-${test.setScore.away} | TB: ${test.isTiebreak}`);
    console.log(`   Expected: MP=${test.expected.isMatchPoint}, For=${test.expected.matchPointFor}`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${test.score} | Server: ${test.server} | Games: ${test.gameScore.home}-${test.gameScore.away} | Sets: ${test.setScore.home}-${test.setScore.away} | TB: ${test.isTiebreak}`);
    console.log(`   Expected: MP=${test.expected.isMatchPoint}, For=${test.expected.matchPointFor}`);
    console.log(`   Got:      MP=${result.isMatchPoint}, For=${result.matchPointFor}`);
  }
}

// Test Tiebreak Detection
console.log('\n=== TIEBREAK DETECTION TESTS ===\n');

const tiebreakTests = [
  { gameNumber: 13, gameScore: { home: 6, away: 6 }, expected: true },
  { gameNumber: 12, gameScore: { home: 6, away: 5 }, expected: false },
  { gameNumber: 13, gameScore: { home: 6, away: 6 }, expected: true },
  { gameNumber: 7, gameScore: { home: 3, away: 3 }, expected: false },
  { gameNumber: 1, gameScore: { home: 6, away: 6 }, expected: true },
];

for (const test of tiebreakTests) {
  const result = isTiebreakGame(test.gameNumber, test.gameScore);
  const isPass = result === test.expected;
  
  if (isPass) {
    passed++;
    console.log(`✅ PASS: Game ${test.gameNumber} | Score: ${test.gameScore.home}-${test.gameScore.away} -> ${result}`);
  } else {
    failed++;
    console.log(`❌ FAIL: Game ${test.gameNumber} | Score: ${test.gameScore.home}-${test.gameScore.away}`);
    console.log(`   Expected: ${test.expected}, Got: ${result}`);
  }
}

console.log('\n========================================');
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
