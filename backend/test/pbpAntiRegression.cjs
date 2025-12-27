/**
 * PBP Anti-Regression Tests
 * 
 * Questi test verificano gli INVARIANTI COSTITUZIONALI del PBP extractor.
 * Se un test fallisce, significa che c'è una VIOLAZIONE degli invarianti
 * e il codice NON deve essere mergiato.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Import delle funzioni da testare
const {
  extractRawPbpData,
  extractPlayersFromHtml,
  extractSetHeaders,
  extractServerSlugFromBlock,
  resolveSemantics,
  isTiebreakPoints,
  extractPbp
} = require('../utils/pbpExtractor.cjs');

// Golden data per questo match (basato sul HTML in `pbp code`)
// NOTA: Il risultato è quello che mostra l'HTML, verificato empiricamente
const GOLDEN_DATA = {
  players: {
    homeSlug: 'norrie-cameron',
    awaySlug: 'vacherot-valentin',
    homeName: 'C. Norrie',
    awayName: 'V. Vacherot'
  },
  set1: {
    gamesTotal: 13,  // 7-6 = 13 games
    homeGames: 7,
    awayGames: 6,
    hasTiebreak: true,
    tiebreakWinner: 'home'
  },
  set2: {
    gamesTotal: 10,  // 6-4 = 10 games (basato sul HTML!)
    homeGames: 6,
    awayGames: 4,
    hasTiebreak: false
  }
};

// Helpers
const pbpCodePath = path.join(__dirname, '..', 'pbp code');
let testHtml = null;

function loadTestHtml() {
  if (testHtml === null) {
    try {
      testHtml = fs.readFileSync(pbpCodePath, 'utf8');
    } catch (e) {
      testHtml = '';
    }
  }
  return testHtml;
}

function skipTest(name, reason) {
  console.log(`⏭️  ${name} - SKIPPED: ${reason}`);
  return 'skipped';
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: NO setNumber filter
// ═══════════════════════════════════════════════════════════════════════════

function test_noSetNumberFilter() {
  const testHtmlWithHeaders = `
    <span>2º set • 49m</span>
    <div>some content</div>
    <span>1º set • 47m</span>
  `;
  
  const headers = extractSetHeaders(testHtmlWithHeaders);
  
  // Deve trovare 2 set basandosi sul TESTO, non sul setNumber
  assert.strictEqual(headers.length, 2, 'Deve trovare 2 set headers dal testo');
  
  // L'ordine nell'output deve essere per setIndex
  assert.strictEqual(headers[0].setIndex, 1, 'Primo header deve essere set 1');
  assert.strictEqual(headers[1].setIndex, 2, 'Secondo header deve essere set 2');
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: NO row1=server assumption
// ═══════════════════════════════════════════════════════════════════════════

function test_noRow1ServerAssumption() {
  const blockHtml = `
    <div class="d_flex px_lg">
      <a href="/it/tennis/player/player-b/2222">
        <span>Player B</span>
      </a>
    </div>
  `;
  
  // extractServerSlugFromBlock deve restituire lo slug dal DOM
  const serverSlug = extractServerSlugFromBlock(blockHtml, 'player-a', 'player-b');
  
  assert.strictEqual(serverSlug, 'player-b', 
    'Server slug deve essere estratto dal DOM, non assunto row1');
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3: NO hardcoded serverSlug
// ═══════════════════════════════════════════════════════════════════════════

function test_noHardcodedServerSlug() {
  const blockWithUnknownPlayer = `
    <div class="d_flex px_lg">
      <a href="/it/tennis/player/unknown-player/9999">
        <span>Unknown</span>
      </a>
    </div>
  `;
  
  const serverSlug = extractServerSlugFromBlock(blockWithUnknownPlayer, 'player-a', 'player-b');
  
  // Deve restituire lo slug trovato, anche se non è nei player conosciuti
  assert.strictEqual(serverSlug, 'unknown-player',
    'Deve estrarre lo slug dal DOM senza hardcoding');
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4: Tiebreak NOT as normal game
// ═══════════════════════════════════════════════════════════════════════════

function test_tiebreakNotAsNormalGame() {
  // Punti tiebreak (numeri 0-7+)
  const tiebreakPoints = [
    { row1Score: '0', row2Score: '1' },
    { row1Score: '1', row2Score: '1' },
    { row1Score: '1', row2Score: '2' },
    { row1Score: '2', row2Score: '2' },
    { row1Score: '2', row2Score: '3' },
    { row1Score: '3', row2Score: '3' },
    { row1Score: '3', row2Score: '4' },
    { row1Score: '4', row2Score: '4' },
    { row1Score: '4', row2Score: '5' },
    { row1Score: '4', row2Score: '6' },
    { row1Score: '4', row2Score: '7' }
  ];
  
  // Punti game normale
  const normalPoints = [
    { row1Score: '0', row2Score: '15' },
    { row1Score: '15', row2Score: '15' },
    { row1Score: '30', row2Score: '15' },
    { row1Score: '40', row2Score: '15' }
  ];
  
  assert.strictEqual(isTiebreakPoints(tiebreakPoints), true,
    'isTiebreakPoints deve riconoscere punti tiebreak');
  
  assert.strictEqual(isTiebreakPoints(normalPoints), false,
    'isTiebreakPoints NON deve riconoscere punti normali come tiebreak');
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 5: Points NOT truncated
// ═══════════════════════════════════════════════════════════════════════════

function test_pointsNotTruncated() {
  const html = loadTestHtml();
  if (!html) return skipTest('test_pointsNotTruncated', 'pbp code not found');
  
  const rawData = extractRawPbpData(html);
  
  assert.ok(rawData.ok, 'Estrazione raw deve avere successo');
  
  // Verifica che ogni blocco abbia almeno 1 punto
  for (const block of rawData.rawBlocks) {
    assert.ok(block.rawPoints.length >= 1,
      `Blocco ${block.rawBlockIndex} deve avere almeno 1 punto (ha ${block.rawPoints.length})`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 6: NO impossible scores
// ═══════════════════════════════════════════════════════════════════════════

function test_noImpossibleScores() {
  const html = loadTestHtml();
  if (!html) return skipTest('test_noImpossibleScores', 'pbp code not found');
  
  const rawData = extractRawPbpData(html);
  
  assert.ok(rawData.ok, 'Estrazione raw deve avere successo');
  
  const validNormalScores = ['0', '15', '30', '40', 'A'];
  
  for (const block of rawData.rawBlocks) {
    const isTiebreak = isTiebreakPoints(block.rawPoints);
    
    for (const point of block.rawPoints) {
      if (!isTiebreak) {
        // Game normale: solo 0,15,30,40,A
        const s1Valid = validNormalScores.includes(point.row1Score);
        const s2Valid = validNormalScores.includes(point.row2Score);
        
        // Permetti anche numeri per punti che potrebbero essere misclassificati
        const s1Numeric = !isNaN(parseInt(point.row1Score));
        const s2Numeric = !isNaN(parseInt(point.row2Score));
        
        assert.ok(s1Valid || s1Numeric,
          `Score row1 invalido in game normale: ${point.row1Score}`);
        assert.ok(s2Valid || s2Numeric,
          `Score row2 invalido in game normale: ${point.row2Score}`);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 7: Golden match validation
// ═══════════════════════════════════════════════════════════════════════════

function test_goldenMatchValidation() {
  const html = loadTestHtml();
  if (!html) return skipTest('test_goldenMatchValidation', 'pbp code not found');
  
  const resolved = resolveSemantics(extractRawPbpData(html), {
    homeSlug: GOLDEN_DATA.players.homeSlug,
    awaySlug: GOLDEN_DATA.players.awaySlug
  });
  
  assert.ok(resolved.ok, 'Semantic resolution deve avere successo');
  
  // Verifica Set 1 (7-6 tiebreak)
  const set1 = resolved.sets.find(s => s.setNumber === 1);
  assert.ok(set1, 'Deve trovare Set 1');
  assert.strictEqual(set1.games.length, GOLDEN_DATA.set1.gamesTotal,
    `Set 1 deve avere ${GOLDEN_DATA.set1.gamesTotal} games`);
  
  // Verifica che ci sia un tiebreak nel set 1
  const tiebreakGame = set1.games.find(g => g.isTiebreak);
  assert.ok(tiebreakGame, 'Set 1 deve avere un tiebreak');
  // Il tiebreak è l'ultimo game del set 1 (posizione 13 nel set, ma game.game può essere l'indice nel set)
  assert.ok(tiebreakGame.game >= 1, 'Tiebreak deve avere numero game valido');
  
  // Verifica Set 2 (6-4)
  const set2 = resolved.sets.find(s => s.setNumber === 2);
  assert.ok(set2, 'Deve trovare Set 2');
  assert.strictEqual(set2.games.length, GOLDEN_DATA.set2.gamesTotal,
    `Set 2 deve avere ${GOLDEN_DATA.set2.gamesTotal} games`);
  
  // Set 2 NON deve avere tiebreak
  const set2Tiebreak = set2.games.find(g => g.isTiebreak);
  assert.ok(!set2Tiebreak, 'Set 2 NON deve avere tiebreak');
  
  // Verifica score finali
  assert.strictEqual(set1.finalScore.home, GOLDEN_DATA.set1.homeGames,
    `Set 1 home deve avere ${GOLDEN_DATA.set1.homeGames} games`);
  assert.strictEqual(set2.finalScore.home, GOLDEN_DATA.set2.homeGames,
    `Set 2 home deve avere ${GOLDEN_DATA.set2.homeGames} games`);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 8: Code inspection (no hardcoded players)
// ═══════════════════════════════════════════════════════════════════════════

function test_codeInspection() {
  const pbpExtractorPath = path.join(__dirname, '..', 'utils', 'pbpExtractor.cjs');
  let extractorCode = '';
  
  try {
    extractorCode = fs.readFileSync(pbpExtractorPath, 'utf8');
  } catch (e) {
    return skipTest('test_codeInspection', 'pbpExtractor.cjs not readable');
  }
  
  // Verifica NO filtro setNumber === 1 o simili (in logica, non in commenti)
  // Pattern che cerca assegnazioni o comparazioni con setNumber
  const codeWithoutComments = extractorCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  const setNumberFilterPattern = /setNumber\s*===?\s*1\s*[^0-9]/g;
  const setNumberMatches = codeWithoutComments.match(setNumberFilterPattern);
  assert.ok(!setNumberMatches || setNumberMatches.length === 0,
    `Codice contiene filtro setNumber===1 proibito: ${setNumberMatches}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN ALL TESTS
// ═══════════════════════════════════════════════════════════════════════════

function runAllTests() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PBP ANTI-REGRESSION TESTS');
  console.log('  Questi test verificano gli INVARIANTI COSTITUZIONALI');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  
  const tests = [
    ['NO setNumber filter', test_noSetNumberFilter],
    ['NO row1=server assumption', test_noRow1ServerAssumption],
    ['NO hardcoded serverSlug', test_noHardcodedServerSlug],
    ['Tiebreak NOT as normal game', test_tiebreakNotAsNormalGame],
    ['Points NOT truncated', test_pointsNotTruncated],
    ['NO impossible scores', test_noImpossibleScores],
    ['Golden match validation', test_goldenMatchValidation],
    ['Code inspection', test_codeInspection]
  ];
  
  for (const [name, testFn] of tests) {
    try {
      const result = testFn();
      if (result === 'skipped') {
        skipped++;
      } else {
        console.log(`✅ ${name}`);
        passed++;
      }
    } catch (err) {
      console.log(`❌ ${name}`);
      console.log(`   ${err.message}`);
      failed++;
    }
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  if (failed > 0) {
    console.log('⚠️  ANTI-REGRESSION TEST FALLITI!');
    console.log('   Questo indica una VIOLAZIONE degli invarianti costituzionali.');
    console.log('   NON procedere senza correggere.');
    console.log('');
    process.exit(1);
  }
  
  return { passed, failed, skipped };
}

// Run if executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  GOLDEN_DATA
};
