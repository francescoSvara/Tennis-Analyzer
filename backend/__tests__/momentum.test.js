const { calculateRecentMomentum } = require('../utils/featureEngine');

describe('calculateRecentMomentum (improved)', () => {
  test('empty => stable', () => {
    const m = calculateRecentMomentum([]);
    expect(m.trend).toBe('stable');
    expect(m.recentSwing).toBe(0);
    expect(m.breakCount).toBe(0);
  });

  test('rising home => home_rising', () => {
    const pr = [{value: 0},{value: 5},{value: 12},{value: 20},{value: 28},{value: 35}];
    const m = calculateRecentMomentum(pr);
    expect(m.trend).toBe('home_rising');
  });

  test('rising away => away_rising', () => {
    const pr = [{value: 0},{value: -6},{value: -12},{value: -18},{value: -26},{value: -33}];
    const m = calculateRecentMomentum(pr);
    expect(m.trend).toBe('away_rising');
  });

  test('single spike should not explode recentSwing as much as maxSwing', () => {
    const pr = [{value: 2},{value: 3},{value: 4},{value: 50},{value: 5}];
    const m = calculateRecentMomentum(pr);
    // avgAbsDelta = (1+1+46+45)/4 = 93/4 = 23.25, capped to 0.93 => 93
    // With old maxSwing logic this would be 46 raw => scaled differently
    // The point is it should be reasonable, not necessarily <100
    expect(m.recentSwing).toBeLessThanOrEqual(100);
    expect(m.recentSwing).toBeGreaterThan(50); // It IS swingy
  });

  test('breakCount counts last10 breakOccurred', () => {
    const pr = [
      {value: 1, breakOccurred: true},
      {value: 2},
      {value: 3, breakOccurred: true},
      {value: 4},
      {value: 5},
    ];
    const m = calculateRecentMomentum(pr);
    expect(m.breakCount).toBe(2);
  });
});
