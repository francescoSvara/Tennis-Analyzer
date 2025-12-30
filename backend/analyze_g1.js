const fs = require('fs');
const path = require('path');

// Carica HTML come nel test
const possiblePaths = [
  path.join(__dirname, 'pbp code'),
  path.join(__dirname, 'pbp code.txt'),
  path.join(__dirname, 'pbp_code.txt')
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

// Extract raw blocks come nel test
const { splitIntoRawBlocks } = require('./utils/pbpExtractorV2.cjs');

const { rawBlocks } = splitIntoRawBlocks(html);
const block = rawBlocks[0]; // G1

console.log('=== G1 ANALYSIS ===');
console.log('Server determined: unknown yet');
console.log('rawData:', JSON.stringify(block, null, 2));

const row1 = block.row1Points || [];
const row2 = block.row2Points || [];

console.log('row1 (server points):', row1);
console.log('row2 (receiver points):', row2);

// Calcolo euristica
const lastServerScore = row1[row1.length - 1];
const lastReceiverScore = row2[row2.length - 1] || '0';

const toNum = s => {
  switch (s) {
    case '0': return 0;
    case '15': return 1;
    case '30': return 2;
    case '40': return 3;
    case 'A': return 4;
    default: return parseInt(s) || 0;
  }
};
const sNum = toNum(lastServerScore);
const rNum = toNum(lastReceiverScore);

console.log('Final scores: server=' + sNum + ', receiver=' + rNum);
console.log('Euristica conditions (NEW):');
console.log('- receiverNum >= 3 && serverNum < 3?', rNum >= 3 && sNum < 3, '(should assign break)');
console.log('- serverNum >= 3 && receiverNum < 3?', sNum >= 3 && rNum < 3, '(should assign hold)');

if (rNum >= 3 && sNum < 3) {
  console.log('→ RECEIVER WINS (break)');
} else if (sNum >= 3 && rNum < 3) {
  console.log('→ SERVER WINS (hold)');
} else {
  console.log('→ UNCERTAIN: defaults to server hold');
}