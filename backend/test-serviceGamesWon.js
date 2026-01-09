const { buildStatsTab } = require('./utils/statsTabBuilder');

// Snapshot format test
const snapshotData = {
  serve: {
    home: { aces: 2, doubleFaults: 2, firstServePct: 64, firstServeWonPct: 71 },
    away: { aces: 4, doubleFaults: 2, firstServePct: 66, firstServeWonPct: 74 }
  },
  return: {
    home: { breakPointsWon: 1 },
    away: { breakPointsWon: 2 }
  },
  points: {
    home: { totalWon: 71, servicePointsWon: 38, returnPointsWon: 26 },
    away: { totalWon: 38, servicePointsWon: 27, returnPointsWon: 18 }
  }
};

const score = {
  sets: [{ home: 6, away: 3 }, { home: 7, away: 6 }],
  currentSet: 3
};

const result = buildStatsTab(snapshotData, null, score, {});

console.log('=== ALL Period ===');
console.log('serve.home.serviceGamesWon:', result.ALL?.serve?.home?.serviceGamesWon);
console.log('serve.away.serviceGamesWon:', result.ALL?.serve?.away?.serviceGamesWon);
console.log('games.home.serviceGamesWon:', result.ALL?.games?.home?.serviceGamesWon);
console.log('games.away.serviceGamesWon:', result.ALL?.games?.away?.serviceGamesWon);

console.log('\n=== SET1 Period ===');
console.log('serve.home.serviceGamesWon:', result.SET1?.serve?.home?.serviceGamesWon);
console.log('serve.away.serviceGamesWon:', result.SET1?.serve?.away?.serviceGamesWon);

console.log('\n=== SET2 Period ===');
console.log('serve.home.serviceGamesWon:', result.SET2?.serve?.home?.serviceGamesWon);
console.log('serve.away.serviceGamesWon:', result.SET2?.serve?.away?.serviceGamesWon);

// Validation
const allHome = result.ALL?.serve?.home?.serviceGamesWon;
const allAway = result.ALL?.serve?.away?.serviceGamesWon;

if (allHome !== undefined && allHome > 0) {
  console.log('\n✅ serviceGamesWon is present in serve.home for ALL period');
} else {
  console.log('\n❌ serviceGamesWon missing or zero in serve.home for ALL period');
}

if (allAway !== undefined && allAway > 0) {
  console.log('✅ serviceGamesWon is present in serve.away for ALL period');
} else {
  console.log('❌ serviceGamesWon missing or zero in serve.away for ALL period');
}
