const { calculateServeDominance } = require('../utils/featureEngine');

function mkStats({ h1=70, h2=50, a1=70, a2=50, hAces=0, hDF=0, aAces=0, aDF=0, aRec=null } = {}) {
  return {
    home: { firstServePointsWonPct: h1, secondServePointsWonPct: h2, aces: hAces, doubleFaults: hDF },
    away: { firstServePointsWonPct: a1, secondServePointsWonPct: a2, aces: aAces, doubleFaults: aDF,
            ...(aRec != null ? { receiverPointsWonPct: aRec } : {}) },
  };
}

describe('calculateServeDominance (improved)', () => {
  test('strong server stats => serveDominance > 50', () => {
    const statistics = mkStats({ h1: 78, h2: 58 });
    const r = calculateServeDominance(statistics, 'home');
    expect(r.serveDominance).toBeGreaterThan(55);
  });

  test('weak second serve => serveDominance drops', () => {
    const statistics = mkStats({ h1: 70, h2: 28 });
    const r = calculateServeDominance(statistics, 'home');
    expect(r.serveDominance).toBeLessThan(50);
  });

  test('receiverPointsWonPct present boosts returnDominance', () => {
    const statistics = mkStats({ h1: 75, h2: 55, aRec: 48 });
    const r = calculateServeDominance(statistics, 'home');
    expect(r.returnDominance).toBeGreaterThan(55);
  });

  test('many double faults slightly reduces serveDominance', () => {
    const lowDF = mkStats({ h1: 72, h2: 48, hDF: 0 });
    const highDF = mkStats({ h1: 72, h2: 48, hDF: 8 });

    const r1 = calculateServeDominance(lowDF, 'home');
    const r2 = calculateServeDominance(highDF, 'home');

    expect(r2.serveDominance).toBeLessThan(r1.serveDominance);
    expect(r1.serveDominance - r2.serveDominance).toBeLessThanOrEqual(15); // keep it bounded
  });
});
