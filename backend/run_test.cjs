
const fs = require('fs');
const path = require('path');
const {
  splitIntoRawBlocks,
  createPlayerRegistry,
  resolveSemanticMode,
  extractPbpWithSemanticResolution
} = require('./utils/pbpExtractorV2.cjs');

// Ground truth
const GROUND_TRUTH = {
  sets: [
    { homeGames: 7, awayGames: 6 },
    { homeGames: 6, awayGames: 4 }
  ]
};

// Carica HTML
const htmlPath = path.join(__dirname, 'pbp code');
let html;
try {
  html = fs.readFileSync(htmlPath, 'utf8');
} catch (e) {
  console.log('ERRORE: File non trovato');
  process.exit(1);
}

console.log('========================================');
console.log('TEST PBP EXTRACTOR V2');
console.log('========================================');

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log('PASS: ' + name);
    passed++;
  } else {
    console.log('FAIL: ' + name);
    failed++;
  }
}

// Test 1: Split
const { setHeaders, rawBlocks } = splitIntoRawBlocks(html);
test('Set headers trovati = 2', setHeaders.length === 2);
test('Raw blocks > 0', rawBlocks.length > 0);
console.log('  Blocks totali:', rawBlocks.length);

// Test 2: Registry
const registry = createPlayerRegistry(html);
test('Registry homeId presente', registry.homeId !== null);
test('Registry awayId presente', registry.awayId !== null);
console.log('  Home:', registry.homeName);
console.log('  Away:', registry.awayName);

// Test 3: Semantic Set 1
const set1Blocks = rawBlocks.filter(b => b.setNumber === 1);
const set1Result = resolveSemanticMode(set1Blocks, registry, GROUND_TRUTH.sets[0]);
test('Set 1 resolved', set1Result.resolved === true);
test('Set 1 score home = 7', set1Result.finalScore.home === 7);
test('Set 1 score away = 6', set1Result.finalScore.away === 6);
console.log('  Mode:', set1Result.mode);
console.log('  Score:', set1Result.finalScore.home + '-' + set1Result.finalScore.away);

// Test 4: Semantic Set 2
const set2Blocks = rawBlocks.filter(b => b.setNumber === 2);
const set2Result = resolveSemanticMode(set2Blocks, registry, GROUND_TRUTH.sets[1]);
test('Set 2 resolved', set2Result.resolved === true);
test('Set 2 score home = 6', set2Result.finalScore.home === 6);
test('Set 2 score away = 4', set2Result.finalScore.away === 4);
console.log('  Mode:', set2Result.mode);
console.log('  Score:', set2Result.finalScore.home + '-' + set2Result.finalScore.away);

// Test 5: G1 formato
if (set1Result.games && set1Result.games.length > 0) {
  const g1 = set1Result.games[0];
  test('G1 server = away', g1.serverSide === 'away');
  test('G1 winner = home', g1.gameWinner === 'home');
  test('G1 isBreak = true', g1.isBreak === true);
  console.log('  G1 punti:', g1.points.map(p => p.serverScore + '-' + p.receiverScore).join(', '));
}

// Test 6: G2 formato
if (set1Result.games && set1Result.games.length > 1) {
  const g2 = set1Result.games[1];
  test('G2 server = home', g2.serverSide === 'home');
  test('G2 winner = home', g2.gameWinner === 'home');
  test('G2 isBreak = false', g2.isBreak === false);
  console.log('  G2 punti:', g2.points.map(p => p.serverScore + '-' + p.receiverScore).join(', '));
}

console.log('========================================');
console.log('RISULTATO: ' + passed + ' passed, ' + failed + ' failed');
console.log('========================================');

if (failed > 0) process.exit(1);
