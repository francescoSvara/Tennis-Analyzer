const { calculateDominance } = require('../utils/featureEngine');

describe('calculateDominance (improved)', () => {
  test('no PR and no stats => neutral', () => {
    const r = calculateDominance({ powerRankings: [], statistics: {} });
    expect(r.dominance).toBe(50);
    expect(r.dominantPlayer).toBe('none');
  });

  test('PR smoothing avoids single spike dominating', () => {
    const pr = [
      { value: 5 }, { value: 8 }, { value: 6 }, { value: 7 }, { value: 6 },
      { value: 80 } // spike
    ];
    const r = calculateDominance({ powerRankings: pr, statistics: {} });
    // With smoothing + cap, dominance should be elevated but not extreme
    expect(r.dominance).toBeGreaterThan(52);
    expect(r.dominance).toBeLessThan(85);
  });

  test('stats-based dominance works even if PR small', () => {
    const powerRankings = [{ value: 0 }, { value: 10 }];
    const statistics = {
      home: { firstServePointsWonPct: 82, secondServePointsWonPct: 60 },
      away: { firstServePointsWonPct: 55, secondServePointsWonPct: 35 },
    };

    const r = calculateDominance({ powerRankings, statistics });
    expect(r.dominance).toBeGreaterThan(60);
    expect(r.dominantPlayer).toBe('home');
  });

  test('away dominates by stats', () => {
    const powerRankings = [{ value: 0 }, { value: -5 }];
    const statistics = {
      home: { firstServePointsWonPct: 58, secondServePointsWonPct: 35 },
      away: { firstServePointsWonPct: 78, secondServePointsWonPct: 55 },
    };

    const r = calculateDominance({ powerRankings, statistics });
    expect(r.dominance).toBeLessThan(40);
    expect(r.dominantPlayer).toBe('away');
  });
});
