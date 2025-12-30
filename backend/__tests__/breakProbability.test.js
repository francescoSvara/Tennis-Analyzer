const { calculateBreakProbability } = require('../utils/featureEngine');

function mkStats({ home1 = 70, home2 = 50, away1 = 70, away2 = 50, homeDF = 0, awayDF = 0 } = {}) {
  return {
    home: { firstServePointsWonPct: home1, secondServePointsWonPct: home2, doubleFaults: homeDF },
    away: { firstServePointsWonPct: away1, secondServePointsWonPct: away2, doubleFaults: awayDF },
  };
}

describe('calculateBreakProbability (Markov)', () => {
  test('strong server at 0-0 => low-ish break probability', () => {
    const statistics = mkStats({ home1: 78, home2: 58 });
    const bp = calculateBreakProbability({ statistics, server: 'home', gameScore: '0-0', powerRankings: [] });
    expect(bp).toBeGreaterThanOrEqual(0);
    expect(bp).toBeLessThan(30);
  });

  test('strong server but facing 15-40 => high break probability', () => {
    const statistics = mkStats({ home1: 78, home2: 58 });
    const bp = calculateBreakProbability({ statistics, server: 'home', gameScore: '15-40', powerRankings: [] });
    expect(bp).toBeGreaterThan(50);
  });

  test('weak server at 0-0 => higher break probability', () => {
    const statistics = mkStats({ home1: 52, home2: 32 });
    const bp = calculateBreakProbability({ statistics, server: 'home', gameScore: '0-0', powerRankings: [] });
    expect(bp).toBeGreaterThan(35);
  });

  test('deuce is sensitive to serve strength', () => {
    const strong = mkStats({ home1: 78, home2: 58 });
    const weak = mkStats({ home1: 55, home2: 35 });
    const bpStrong = calculateBreakProbability({ statistics: strong, server: 'home', gameScore: '40-40', powerRankings: [] });
    const bpWeak = calculateBreakProbability({ statistics: weak, server: 'home', gameScore: '40-40', powerRankings: [] });
    expect(bpWeak).toBeGreaterThan(bpStrong);
  });

  test('many double faults slightly increases break probability', () => {
    const statisticsLowDF = mkStats({ home1: 70, home2: 45, homeDF: 0 });
    const statisticsHighDF = mkStats({ home1: 70, home2: 45, homeDF: 8 });

    const bpLow = calculateBreakProbability({ statistics: statisticsLowDF, server: 'home', gameScore: '0-0', powerRankings: [] });
    const bpHigh = calculateBreakProbability({ statistics: statisticsHighDF, server: 'home', gameScore: '0-0', powerRankings: [] });

    expect(bpHigh).toBeGreaterThan(bpLow);
    expect(bpHigh - bpLow).toBeLessThanOrEqual(10); // keep it small
  });
});
