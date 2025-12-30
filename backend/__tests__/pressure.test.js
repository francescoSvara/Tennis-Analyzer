const { computeFeatures } = require('../utils/featureEngine');

describe('pressure integration uses matchContext and index', () => {
  test('pressure uses pressureCalculator.index and stays within 0..100', () => {
    const matchData = {
      statistics: {
        home: {
          firstServePointsWonPct: 55,
          secondServePointsWonPct: 30,
          doubleFaults: 6,
          aces: 1,
          firstServeIn: 20,
          firstServeTotal: 40,
          firstServeWon: 11,
          secondServeWon: 8,
          secondServeTotal: 20,
          breakPointsSaved: 1,
          breakPointsFaced: 4,
          serviceGamesPlayed: 8,
        },
        away: { firstServePointsWonPct: 70, secondServePointsWonPct: 50, doubleFaults: 0, aces: 2 },
      },
      score: { sets: [{ home: 5, away: 5 }] },
      serving: 'home',
      gameScore: '15-40', // break point against server
      powerRankings: [{ value: -30 }, { value: -35 }, { value: -40 }],
      odds: [],
    };

    const features = computeFeatures(matchData);
    expect(features.pressure).toBeGreaterThanOrEqual(0);
    expect(features.pressure).toBeLessThanOrEqual(100);
    // should be elevated given DF + weak 2nd serve + BP context
    expect(features.pressure).toBeGreaterThan(50);
  });

  test('pressure without statistics falls back to score-based', () => {
    const matchData = {
      statistics: {},
      score: { sets: [{ home: 6, away: 6, tiebreak: true }] },
      serving: 'home',
      powerRankings: [],
      odds: [],
    };

    const features = computeFeatures(matchData);
    expect(features.pressure).toBeGreaterThanOrEqual(0);
    expect(features.pressure).toBeLessThanOrEqual(100);
    // Tiebreak should elevate pressure
    expect(features.pressure).toBeGreaterThanOrEqual(50);
  });

  test('pressure without any data defaults to 50', () => {
    const matchData = {
      statistics: {},
      score: {},
      serving: 'home',
      powerRankings: [],
      odds: [],
    };

    const features = computeFeatures(matchData);
    expect(features.pressure).toBe(50);
  });
});
