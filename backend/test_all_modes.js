const { 
  splitIntoRawBlocks, 
  createPlayerRegistry, 
  applySemanticMode
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

const { setHeaders, rawBlocks, blocksBySet, sortedSetIndices } = splitIntoRawBlocks(html);
const registry = createPlayerRegistry(html);

console.log('=== Block Analysis ===');
console.log('Set 1 blocks:', blocksBySet.get(1)?.length || 0);
console.log('Set 2 blocks:', blocksBySet.get(2)?.length || 0);
console.log('Total blocks:', rawBlocks.length);
console.log('sortedSetIndices:', sortedSetIndices);

// Usa blocksBySet invece di filter
const set1Blocks = blocksBySet.get(1) || [];
const set2Blocks = blocksBySet.get(2) || [];

console.log('=== Testing Set 1 ===');
for (const mode of ['A', 'B', 'C', 'D']) {
  const result = applySemanticMode(set1Blocks, registry, mode);
  console.log(`Mode ${mode}: ${result.finalScore.home}-${result.finalScore.away} (${result.games.length} games)`);
  
  const isCorrect = result.finalScore.home === 7 && result.finalScore.away === 6;
  console.log(`  → ${isCorrect ? '✅ MATCHES' : '❌ No match'} ground truth 7-6`);
}

console.log('\n=== Testing Set 2 ===');

for (const mode of ['A', 'B', 'C', 'D']) {
  const result = applySemanticMode(set2Blocks, registry, mode);
  console.log(`Mode ${mode}: ${result.finalScore.home}-${result.finalScore.away} (${result.games.length} games, ${result.ambiguousGames} ambiguous)`);
  
  // Check if matches ground truth
  const isCorrect = result.finalScore.home === 7 && result.finalScore.away === 6;
  console.log(`  → ${isCorrect ? '✅ MATCHES' : '❌ No match'} ground truth 7-6`);
}