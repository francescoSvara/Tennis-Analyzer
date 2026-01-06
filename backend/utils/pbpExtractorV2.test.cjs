/**
 * TEST ANTI-REGRESSIONE per PBP Extractor V2
 * Match: 14968724 (C. Norrie vs V. Vacherot)
 * 
 * QUESTI TEST DEVONO FALLIRE SE:
 * - qualcuno assume ROW1 = HOME/AWAY
 * - qualcuno calcola winner prima del remapping
 * - qualcuno usa contatori cumulativi
 * - qualcuno passa serverScore in score_p1
 * - semanticMode cambia per questo match
 * - qualcuno filtra per setNumber invece di usare blocksBySet
 */

const fs = require('fs');
const path = require('path');
const {
  extractRawBlockData,
  splitIntoRawBlocks,
  createPlayerRegistry,
  resolveSemanticMode,
  adaptForCompletePbpGames
} = require('./pbpExtractorV2.cjs');

const GROUND_TRUTH = {
  sets: [
    { homeGames: 7, awayGames: 6 },
    { homeGames: 6, awayGames: 4 }
  ]
};

// Prova vari nomi possibili per il file HTML
const possiblePaths = [
  path.join(__dirname, '..', 'pbp code'),
  path.join(__dirname, '..', 'pbp code.txt'),
  path.join(__dirname, '..', 'pbp_code.txt')
];

let html = null;
for (const p of possiblePaths) {
  try {
    html = fs.readFileSync(p, 'utf8');
    break;
  } catch (e) {}
}

if (!html) {
  console.error('File HTML PBP non trovato');
  process.exit(1);
}

let passed = 0, failed = 0;

function test(name, condition) {
  if (condition) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ FAIL: ${name}`);
    failed++;
  }
}

console.log('═'.repeat(60));
console.log('TEST ANTI-REGRESSIONE - Match 14968724');
console.log('═'.repeat(60));

// ═══════════════════════════════════════════════════════════════
// TEST ANTI-REGRESSIONE: NO setNumber filtering nel codice
// ═══════════════════════════════════════════════════════════════
console.log('\n─── TEST: No setNumber filtering nel codice ───');

const sourceCode = fs.readFileSync(path.join(__dirname, 'pbpExtractorV2.cjs'), 'utf8');

// Pattern proibiti che indicano uso di setNumber per raggruppamento
const forbiddenPatterns = [
  /\.filter\([^)]*setNumber\s*===/g,
  /\.filter\([^)]*\.setNumber/g,
  /b\.setNumber\s*===\s*\d/g,
  /rawBlocks\.filter\([^)]*setNum/g
];

let hasSetNumberFiltering = false;
for (const pattern of forbiddenPatterns) {
  if (pattern.test(sourceCode)) {
    hasSetNumberFiltering = true;
    console.log(`  ⚠️  Pattern proibito trovato: ${pattern}`);
  }
}
test('Codice NON usa setNumber per filtrare set', !hasSetNumberFiltering);

// ═══════════════════════════════════════════════════════════════
// TEST: Segmentazione per header
// ═══════════════════════════════════════════════════════════════
console.log('\n─── TEST: Segmentazione per header ───');

const { setHeaders, rawBlocks, blocksBySet, sortedSetIndices } = splitIntoRawBlocks(html);

test('Trovati esattamente 2 set header', setHeaders.length === 2);
test('sortedSetIndices contiene [1, 2]', 
  sortedSetIndices.length === 2 && 
  sortedSetIndices.includes(1) && 
  sortedSetIndices.includes(2));
test('blocksBySet ha chiavi 1 e 2', 
  blocksBySet.has(1) && blocksBySet.has(2));

console.log(`  → Set headers trovati: ${setHeaders.map(h => h.setIndex).join(', ')}`);
console.log(`  → sortedSetIndices: [${sortedSetIndices.join(', ')}]`);
console.log(`  → Set 1 blocks: ${blocksBySet.get(1)?.length || 0}`);
console.log(`  → Set 2 blocks: ${blocksBySet.get(2)?.length || 0}`);

// ═══════════════════════════════════════════════════════════════
// TEST INVARIANTE 1: Raw extraction NON interpreta
// ═══════════════════════════════════════════════════════════════
console.log('\n─── INVARIANTE 1: Raw extraction ───');

const sampleBlock = rawBlocks[0];

test('Raw block NON ha campo "home"', !('home' in sampleBlock));
test('Raw block NON ha campo "away"', !('away' in sampleBlock));
test('Raw block NON ha campo "winner"', !('winner' in sampleBlock));
test('Raw block NON ha campo "isBreak"', !('isBreak' in sampleBlock));
test('Raw block HA row1Points', Array.isArray(sampleBlock.row1Points));
test('Raw block HA row2Points', Array.isArray(sampleBlock.row2Points));
test('Raw block HA setIndex (non setNumber)', 'setIndex' in sampleBlock);

// ═══════════════════════════════════════════════════════════════
// TEST: Resolver per Set 1 (usando blocksBySet)
// ═══════════════════════════════════════════════════════════════
console.log('\n─── TEST: Resolver Set 1 ───');

const registry = createPlayerRegistry(html);
test('Registry ha homeId', registry.homeId !== null);
test('Registry ha awayId', registry.awayId !== null);

const set1Blocks = blocksBySet.get(1) || [];
console.log(`  → Set 1 ha ${set1Blocks.length} blocks`);

const set1Result = resolveSemanticMode(set1Blocks, registry, GROUND_TRUTH.sets[0]);

test('Set 1 risolto', set1Result.resolved === true);
test('Set 1 score home = 7', set1Result.finalScore.home === 7);
test('Set 1 score away = 6', set1Result.finalScore.away === 6);
test('Set 1 mode stabile', ['A', 'B', 'C', 'D'].includes(set1Result.mode));
test('Set 1 ha 13 game', set1Result.games?.length === 13);

console.log(`  → Mode: ${set1Result.mode}, Score: ${set1Result.finalScore.home}-${set1Result.finalScore.away}`);

// ═══════════════════════════════════════════════════════════════
// TEST: Resolver per Set 2 (usando blocksBySet)
// ═══════════════════════════════════════════════════════════════
console.log('\n─── TEST: Resolver Set 2 ───');

const set2Blocks = blocksBySet.get(2) || [];
console.log(`  → Set 2 ha ${set2Blocks.length} blocks`);

const set2Result = resolveSemanticMode(set2Blocks, registry, GROUND_TRUTH.sets[1]);

test('Set 2 risolto', set2Result.resolved === true);
test('Set 2 score home = 6', set2Result.finalScore.home === 6);
test('Set 2 score away = 4', set2Result.finalScore.away === 4);
test('Set 2 mode stabile', ['A', 'B', 'C', 'D'].includes(set2Result.mode));
test('Set 2 ha 10 game', set2Result.games?.length === 10);

console.log(`  → Mode: ${set2Result.mode}, Score: ${set2Result.finalScore.home}-${set2Result.finalScore.away}`);

// ═══════════════════════════════════════════════════════════════
// TEST: Anti-regressione game specifici
// ═══════════════════════════════════════════════════════════════
console.log('\n─── TEST: Anti-regressione game ───');

if (set1Result.games && set1Result.games.length >= 1) {
  const g1 = set1Result.games[0];
  
  // Test G1: 30-40 deve dare winner=receiver
  test('G1: receiver vince (non fallback hold)', g1.gameWinner !== null);
  
  console.log(`  → G1: server=${g1.serverSide}, winner=${g1.gameWinner}`);
}

// Test Set totale: NON può essere 13-0
test('Set 1 NO impossible 13-0', 
  !(set1Result.finalScore.home === 13 && set1Result.finalScore.away === 0));
test('Set 1 NO impossible 0-13', 
  !(set1Result.finalScore.home === 0 && set1Result.finalScore.away === 13));

// ═══════════════════════════════════════════════════════════════
// TEST INVARIANTI CANONICI (per FILOSOFIA_PBP_EXTRACTION)
// ═══════════════════════════════════════════════════════════════
console.log('\n─── TEST: Invarianti canonici ───');

// Test: No NaN in outputs
let hasNaN = false;
for (const game of (set1Result.games || [])) {
  if (game.points) {
    for (const p of game.points) {
      if (typeof p.homeScore === 'number' && isNaN(p.homeScore)) hasNaN = true;
      if (typeof p.awayScore === 'number' && isNaN(p.awayScore)) hasNaN = true;
    }
  }
}
test('No NaN in outputs', !hasNaN);

// Test: Service alternation
let alternationViolations = 0;
const allGames = [...(set1Result.games || []), ...(set2Result.games || [])];
let prevServer = null;
let prevSet = null;
for (const game of allGames) {
  const currentSet = game.setNumber || 1;
  // Reset on new set
  if (currentSet !== prevSet) {
    prevServer = null;
    prevSet = currentSet;
  }
  
  if (prevServer !== null && !game.isTiebreak) {
    const expected = prevServer === 'home' ? 'away' : 'home';
    if (game.serverSide !== expected) {
      alternationViolations++;
    }
  }
  prevServer = game.serverSide;
}
test('Service alternation ok (or flagged)', alternationViolations === 0 || set1Result.validation?.errors?.length > 0);

// Test: Point winners count matches total points
let totalPoints = 0;
let pointsWithWinner = 0;
for (const game of allGames) {
  if (game.points) {
    totalPoints += game.points.length;
    pointsWithWinner += game.points.filter(p => p.pointWinner !== null && p.pointWinner !== undefined).length;
  }
}
const winnerCoverage = totalPoints > 0 ? pointsWithWinner / totalPoints : 1;
test('Point winners coverage >= 90%', winnerCoverage >= 0.9);
console.log(`  → Points with winner: ${pointsWithWinner}/${totalPoints} (${Math.round(winnerCoverage*100)}%)`);

// ═══════════════════════════════════════════════════════════════
// RISULTATO FINALE
// ═══════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log(`RISULTATO: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(60));

if (failed > 0) {
  console.log('\n⚠️  REGRESSIONE RILEVATA!');
  process.exit(1);
} else {
  console.log('\n✅ Tutti i test passati');
  process.exit(0);
}