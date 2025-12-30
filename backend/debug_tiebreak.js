const { splitIntoRawBlocks, createPlayerRegistry, detectTiebreak, applySemanticMode } = require('./utils/pbpExtractorV2.cjs');
const fs = require('fs');

const html = fs.readFileSync('pbp code.txt', 'utf8');
const { rawBlocks } = splitIntoRawBlocks(html);
const registry = createPlayerRegistry(html);
const s1 = rawBlocks.filter(b => b.setNumber === 1).reverse();

console.log(`=== DEBUG SET 1 (${s1.length} games) ===`);

// Cerca il tiebreak
for (let i = 0; i < s1.length; i++) {
  const b = s1[i];
  const isTiebreak = detectTiebreak(b.row1Points, b.row2Points);
  if (isTiebreak || i === s1.length - 1) {
    console.log(`G${i+1}: server=${b.serverSlug}, isTiebreak=${isTiebreak}`);
    console.log(`  row1=${JSON.stringify(b.row1Points)}`);
    console.log(`  row2=${JSON.stringify(b.row2Points)}`);
    console.log(`  blockScore=${b.blockScoreA}-${b.blockScoreB}`);
  }
}

console.log('\n=== SEMANTIC RESULT ===');
const result = applySemanticMode(s1, registry, 'A');
console.log(`Final score: ${result.finalScore.home}-${result.finalScore.away}`);

const lastGame = result.games[result.games.length - 1];
console.log(`Last game (G${result.games.length}): server=${lastGame.serverSide}, winner=${lastGame.gameWinner}, isBreak=${lastGame.isBreak}`);