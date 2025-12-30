const { calculateVolatility } = require('../utils/featureEngine');

describe('calculateVolatility (improved)', () => {
  test('no data => near baseline', () => {
    const v = calculateVolatility({ powerRankings: [], score: {}, odds: [] });
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
    expect(v).toBeGreaterThanOrEqual(30);
    expect(v).toBeLessThanOrEqual(45);
  });

  test('many PR swings + breaks => high volatility', () => {
    const powerRankings = [
      { value: 10 }, { value: -30, breakOccurred: true }, { value: 25 },
      { value: -20, breakOccurred: true }, { value: 35 }, { value: -25, breakOccurred: true },
      { value: 15 }, { value: -10 }, { value: 20 }, { value: -15 }
    ];
    const score = { sets: [{ home: 4, away: 4 }] };
    const v = calculateVolatility({ powerRankings, score, odds: [] });
    expect(v).toBeGreaterThan(65);
  });

  test('odds swinging strongly increases volatility even if PR missing', () => {
    const odds = [
      { home: 1.40, away: 3.00 },
      { home: 1.60, away: 2.50 },
      { home: 1.90, away: 2.05 },
      { home: 2.10, away: 1.85 },
    ];
    const v = calculateVolatility({ powerRankings: [], score: { sets: [{ home: 2, away: 2 }] }, odds });
    expect(v).toBeGreaterThan(45); // odds alone add ~15-20 to baseline
  });

  test('close set alone should not produce extreme volatility', () => {
    const v = calculateVolatility({
      powerRankings: [],
      score: { sets: [{ home: 5, away: 5 }] },
      odds: [],
    });
    expect(v).toBeLessThan(60);
  });

  test('tiebreak amplifies volatility but does not max it alone', () => {
    const v = calculateVolatility({
      powerRankings: [],
      score: { sets: [{ home: 6, away: 6, tiebreak: true }] },
      odds: [],
    });
    expect(v).toBeGreaterThan(40);
    expect(v).toBeLessThan(75);
  });
});
