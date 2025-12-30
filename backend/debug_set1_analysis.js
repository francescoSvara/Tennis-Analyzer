const { 
  splitIntoRawBlocks, 
  createPlayerRegistry, 
  applySemanticMode,
  computeGameWinnerFromPoints,
  detectGameType
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

const { rawBlocks, blocksBySet, sortedSetIndices } = splitIntoRawBlocks(html);
const registry = createPlayerRegistry(html);

console.log('=== Registry ===');
console.log('homeId:', registry.homeId, '(Norrie)');
console.log('awayId:', registry.awayId, '(Vacherot)');

const set1Blocks = blocksBySet.get(1) || [];

console.log('\n=== IPOTESI: row1=AWAY, row2=HOME ===');
for (let i = 0; i < set1Blocks.length; i++) {
  const block = set1Blocks[i];
  const serverIsHome = block.serverId === registry.homeId;
  const serverSide = serverIsHome ? 'home' : 'away';
  
  // NUOVA IPOTESI: row1=AWAY, row2=HOME (fisso per tutto il match)
  const homePoints = block.row2Points;
  const awayPoints = block.row1Points;
  
  // Server/Receiver basato su chi serve
  const serverPoints = serverSide === 'home' ? homePoints : awayPoints;
  const receiverPoints = serverSide === 'home' ? awayPoints : homePoints;
  
  const lastServer = serverPoints[serverPoints.length - 1];
  const lastReceiver = receiverPoints[receiverPoints.length - 1] || '0';
  
  // Rileva gameType
  const gameType = detectGameType(serverPoints, receiverPoints, {});
  
  // Calcola winner con gameType corretto
  const winner = computeGameWinnerFromPoints(serverPoints, receiverPoints, gameType);
  const gameWinner = winner === 'server' ? serverSide : 
                     winner === 'receiver' ? (serverSide === 'home' ? 'away' : 'home') : 
                     null;
  
  console.log(`G${i+1}: type=${gameType}, server=${serverSide}, S:${lastServer} R:${lastReceiver}, winner=${gameWinner}`);
}

// Conta winners
let homeWins = 0, awayWins = 0;
for (let i = 0; i < set1Blocks.length; i++) {
  const block = set1Blocks[i];
  const serverIsHome = block.serverId === registry.homeId;
  const serverSide = serverIsHome ? 'home' : 'away';
  const homePoints = block.row2Points;
  const awayPoints = block.row1Points;
  const serverPoints = serverSide === 'home' ? homePoints : awayPoints;
  const receiverPoints = serverSide === 'home' ? awayPoints : homePoints;
  const gameType = detectGameType(serverPoints, receiverPoints, {});
  const winner = computeGameWinnerFromPoints(serverPoints, receiverPoints, gameType);
  const gameWinner = winner === 'server' ? serverSide : 
                     winner === 'receiver' ? (serverSide === 'home' ? 'away' : 'home') : 
                     null;
  if (gameWinner === 'home') homeWins++;
  else if (gameWinner === 'away') awayWins++;
}
console.log(`\nTOTAL: home=${homeWins}, away=${awayWins}`);
console.log(`Ground truth: 7-6`);

// Test con MODE A (reverse)
console.log('\n=== Test Mode A (reverse blocks) ===');
const { applySemanticMode } = require('./utils/pbpExtractorV2.cjs');
const modeAResult = applySemanticMode(set1Blocks, registry, 'A');
console.log('Mode A score:', modeAResult.finalScore);
console.log('Mode A games:', modeAResult.games.length);
if (modeAResult.games.length > 0) {
  console.log('First 3 games:');
  for (let i = 0; i < Math.min(3, modeAResult.games.length); i++) {
    const g = modeAResult.games[i];
    console.log(`  G${g.gameNum}: server=${g.serverSide}, winner=${g.gameWinner}, pts=${g.points.length}`);
  }
}