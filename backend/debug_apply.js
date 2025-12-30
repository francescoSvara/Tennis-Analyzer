const { 
  splitIntoRawBlocks, 
  createPlayerRegistry, 
  applySemanticMode,
  computeGameWinnerFromPoints,
  detectGameType,
  convertTennisScoreLocal 
} = require('./utils/pbpExtractorV2.cjs');
const fs = require('fs');
const path = require('path');

// Carica HTML
let html = null;
const possiblePaths = [
  path.join(__dirname, 'pbp code'),
  path.join(__dirname, 'pbp code.txt'),
  path.join(__dirname, 'pbp_code.txt')
];

for (const p of possiblePaths) {
  try {
    html = fs.readFileSync(p, 'utf8');
    break;
  } catch (e) {}
}

const { rawBlocks } = splitIntoRawBlocks(html);
const registry = createPlayerRegistry(html);

console.log('=== Raw Blocks ===');
console.log('Total blocks:', rawBlocks.length);
console.log('First 3 blocks:');
for (let i = 0; i < Math.min(3, rawBlocks.length); i++) {
  const b = rawBlocks[i];
  console.log(`Block ${i}: setNumber=${b.setNumber}, blockIndex=${b.blockIndex}, serverSlug=${b.serverSlug}`);
  console.log(`  row1: [${b.row1Points.join(', ')}]`);
  console.log(`  row2: [${b.row2Points.join(', ')}]`);
}

const g1Block = rawBlocks[0]; // Take first block
console.log('\n=== G1 Block Detail ===');
console.log('Raw G1:', JSON.stringify(g1Block, null, 2));

// Separazione set 1 e set 2 (i dati potrebbero essere mischiati)
const allBlocks = rawBlocks;
const setNumbers = [...new Set(allBlocks.map(b => b.setNumber))];
console.log('Set numbers found:', setNumbers);

// Prova prima solo set 2 (che sembra essere il primo set nel nostro caso)
const set2Blocks = rawBlocks.filter(b => b.setNumber === 2);
console.log('Set 2 blocks:', set2Blocks.length);

console.log('=== Testing applySemanticMode ===');
console.log('Mode: C (forward + AFTER)');

const result = applySemanticMode(set2Blocks, registry, 'C');
console.log('Result games:', result.games.length);
console.log('Final score:', result.finalScore);

if (result.games.length > 0) {
  const g1 = result.games[0];
  const g2 = result.games[1];
  console.log('\n=== G1 Details ===');
  console.log('serverSide:', g1.serverSide);
  console.log('serverPoints:', g1.points.map(p => p.serverScore));
  console.log('receiverPoints:', g1.points.map(p => p.receiverScore));
  console.log('gameWinner:', g1.gameWinner);
  console.log('isBreak:', g1.isBreak);
  
  console.log('\n=== G2 Details ===');
  console.log('serverSide:', g2.serverSide);
  console.log('serverPoints:', g2.points.map(p => p.serverScore));
  console.log('receiverPoints:', g2.points.map(p => p.receiverScore));
  console.log('gameWinner:', g2.gameWinner);
  console.log('isBreak:', g2.isBreak);
  
  // Analisi di tutti i game
  console.log('\n=== All Games Analysis ===');
  let homeWins = 0, awayWins = 0, nullWins = 0;
  for (let i = 0; i < Math.min(5, result.games.length); i++) {
    const g = result.games[i];
    console.log(`G${i+1}: server=${g.serverSide}, winner=${g.gameWinner}, last=${g.points[g.points.length-1]?.serverScore}-${g.points[g.points.length-1]?.receiverScore}`);
    if (g.gameWinner === 'home') homeWins++;
    else if (g.gameWinner === 'away') awayWins++;
    else nullWins++;
  }
  console.log(`Summary first 5: home=${homeWins}, away=${awayWins}, null=${nullWins}`);
  
  // Check full result
  console.log('\n=== Full Result Check ===');
  console.log('result.finalScore:', result.finalScore);
  console.log('result.ambiguousGames:', result.ambiguousGames);
}