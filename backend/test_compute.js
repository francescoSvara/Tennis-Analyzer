const { computeGameWinnerFromPoints } = require('./utils/pbpExtractorV2.cjs');

// Test G1: 30-40 (server=2, receiver=3)
const serverPoints = ['0', '0', '15', '15', '30'];
const receiverPoints = ['15', '30', '30', '40', '40'];

console.log('=== Testing computeGameWinnerFromPoints ===');
console.log('Server points:', serverPoints);
console.log('Receiver points:', receiverPoints);

const result = computeGameWinnerFromPoints(serverPoints, receiverPoints, 'normal');
console.log('Result:', result);
console.log('Expected: receiver');

// Test mapping scores
const { convertTennisScoreLocal } = require('./utils/pbpExtractorV2.cjs');
console.log('\n=== Score Mapping ===');
console.log('30 →', convertTennisScoreLocal('30'));
console.log('40 →', convertTennisScoreLocal('40'));