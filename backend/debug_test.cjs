
const { inferFinalPoint } = require('./utils/completePbpGames.cjs');

// Simula G1: server=away (2), punti 0-15, 0-30
// In questo caso: score_p1 = serverScore, score_p2 = receiverScore
// Server=2 (away), quindi p1=server=0, p2=receiver=30
const mockPoints = [
  { score_p1: '0', score_p2: '15', server: 2, point_number: 1 },
  { score_p1: '0', score_p2: '30', server: 2, point_number: 2 }
];

const lastPoint = mockPoints[mockPoints.length - 1];
console.log('Last score: server=' + lastPoint.score_p1 + ', receiver=' + lastPoint.score_p2);
console.log('Server:', lastPoint.server, '(1=home, 2=away)');

const inferred = inferFinalPoint(mockPoints, lastPoint);
console.log('Inferred point_winner:', inferred?.point_winner, '(1=home, 2=away)');
console.log('Expected: 1 (home/receiver vince = BREAK)');
