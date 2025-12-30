/**
 * Test Fixtures per Feature Engine
 * Come da FILOSOFIA_CALCOLI_V1 sezione 6
 */

const {
  calculateVolatility,
  calculateDominance,
  calculateBreakProbability,
  calculatePressureFromScore,
  computeFeatures,
} = require('../../backend/utils/featureEngine');

describe('Feature Engine - Volatility', () => {
  test('High volatility match (powerRankings)', () => {
    const input = {
      powerRankings: [
        { value: 40, breakOccurred: false },
        { value: -30, breakOccurred: true },
        { value: 35, breakOccurred: false },
        { value: -25, breakOccurred: true },
        { value: 42, breakOccurred: true },
        { value: -15, breakOccurred: false },
        { value: 38, breakOccurred: true },
      ],
      score: { sets: [{ home: 6, away: 7 }] },
    };

    const result = calculateVolatility(input);

    expect(result).toBeGreaterThanOrEqual(70);
    expect(result).toBeLessThanOrEqual(100);
  });

  test('Fallback to score', () => {
    const input = {
      powerRankings: [],
      score: {
        sets: [
          { home: 7, away: 6 },
          { home: 6, away: 7 },
        ],
      },
    };

    const features = computeFeatures(input);

    expect(features.volatility).toBeGreaterThanOrEqual(60);
    expect(features.volatility).toBeLessThanOrEqual(80);
    expect(features.volatilitySource).toBe('score');
  });

  test('Full fallback to default', () => {
    const input = {
      powerRankings: [],
      score: {},
      odds: [],
    };

    const features = computeFeatures(input);

    expect(features.volatility).toBe(50);
    expect(features.volatilitySource).toBe('estimated');
  });
});

describe('Feature Engine - Dominance', () => {
  test('Home player dominant (powerRankings)', () => {
    const input = {
      powerRankings: [{ value: 60 }, { value: 55 }, { value: 62 }],
    };

    const result = calculateDominance(input);

    expect(result.dominance).toBeGreaterThan(70);
    expect(result.dominantPlayer).toBe('home');
  });

  test('Fallback to score', () => {
    const input = {
      powerRankings: [],
      score: {
        sets: [
          { home: 6, away: 2 },
          { home: 4, away: 2 },
        ],
      },
    };

    const features = computeFeatures(input);

    expect(features.dominance).toBeGreaterThan(60);
    expect(features.dominanceSource).toBe('score');
  });

  test('Fallback to odds', () => {
    const input = {
      powerRankings: [],
      score: {},
      odds: { matchWinner: { home: 1.5, away: 2.8 } },
    };

    const features = computeFeatures(input);

    expect(features.dominance).toBeGreaterThan(55);
    expect(features.dominanceSource).toBe('odds');
  });
});

describe('Feature Engine - Break Probability', () => {
  test('High break probability (weak server)', () => {
    const input = {
      statistics: {
        home: {
          firstServePointsWonPct: 52,
          secondServePointsWonPct: 32,
          doubleFaults: 5,
        },
        away: {
          breakPointsWon: 4,
          breakPointsTotal: 6,
        },
      },
      server: 'home',
      gameScore: '15-40',
    };

    const result = calculateBreakProbability(input);

    expect(result).toBeGreaterThanOrEqual(50);
    expect(result).toBeLessThanOrEqual(100);
  });

  test('Low break probability (strong server)', () => {
    const input = {
      statistics: {
        home: {
          firstServePointsWonPct: 75,
          secondServePointsWonPct: 55,
          doubleFaults: 1,
        },
        away: {
          breakPointsWon: 1,
          breakPointsTotal: 5,
        },
      },
      server: 'home',
      gameScore: '40-15',
    };

    const result = calculateBreakProbability(input);

    expect(result).toBeLessThan(30);
  });

  test('Fallback to odds/rankings', () => {
    const input = {
      statistics: {},
      odds: { matchWinner: { home: 1.8, away: 2.1 } },
      player1: { ranking: 10 },
      player2: { ranking: 15 },
      serving: 'home',
    };

    const features = computeFeatures(input);

    expect(features.breakProbability).toBeGreaterThanOrEqual(15);
    expect(features.breakProbability).toBeLessThanOrEqual(50);
    expect(features.breakProbabilitySource).toBe('odds');
  });

  // ===== NEW MARKOV MODEL TESTS =====

  test('Markov: 0-0 with strong server -> low break prob', () => {
    const input = {
      statistics: {
        home: {
          firstServePointsWonPct: 75,
          secondServePointsWonPct: 55,
          firstServeInPct: 65,
          doubleFaults: 0,
        },
        away: {},
      },
      server: 'home',
      gameScore: '0-0',
    };

    const result = calculateBreakProbability(input);

    // Strong server at 0-0 should have low break probability (~10-20%)
    expect(result).toBeLessThan(25);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  test('Markov: 15-40 (break point) -> high break prob', () => {
    const input = {
      statistics: {
        home: {
          firstServePointsWonPct: 65,
          secondServePointsWonPct: 45,
          firstServeInPct: 62,
          doubleFaults: 2,
        },
        away: {},
      },
      server: 'home',
      gameScore: '15-40',
    };

    const result = calculateBreakProbability(input);

    // Break point should have high break probability (>50%)
    expect(result).toBeGreaterThanOrEqual(50);
  });

  test('Markov: 40-40 (deuce) -> intermediate break prob', () => {
    const input = {
      statistics: {
        home: {
          firstServePointsWonPct: 65,
          secondServePointsWonPct: 45,
          firstServeInPct: 62,
          doubleFaults: 1,
        },
        away: {},
      },
      server: 'home',
      gameScore: '40-40',
    };

    const result = calculateBreakProbability(input);

    // Deuce should be intermediate (~25-45%)
    expect(result).toBeGreaterThanOrEqual(20);
    expect(result).toBeLessThanOrEqual(50);
  });

  test('Markov: pServe sensitivity - weak vs strong server at 0-0', () => {
    const strongServer = {
      statistics: {
        home: {
          firstServePointsWonPct: 80,
          secondServePointsWonPct: 60,
          firstServeInPct: 70,
          doubleFaults: 0,
        },
        away: {},
      },
      server: 'home',
      gameScore: '0-0',
    };

    const weakServer = {
      statistics: {
        home: {
          firstServePointsWonPct: 50,
          secondServePointsWonPct: 30,
          firstServeInPct: 55,
          doubleFaults: 4,
        },
        away: {},
      },
      server: 'home',
      gameScore: '0-0',
    };

    const strongResult = calculateBreakProbability(strongServer);
    const weakResult = calculateBreakProbability(weakServer);

    // Weak server should have significantly higher break probability
    expect(weakResult).toBeGreaterThan(strongResult);
    expect(weakResult - strongResult).toBeGreaterThanOrEqual(15);
  });

  test('Markov: double faults penalty', () => {
    const baseStats = {
      firstServePointsWonPct: 65,
      secondServePointsWonPct: 45,
      firstServeInPct: 62,
    };

    const lowDF = {
      statistics: {
        home: { ...baseStats, doubleFaults: 1 },
        away: {},
      },
      server: 'home',
      gameScore: '30-30',
    };

    const highDF = {
      statistics: {
        home: { ...baseStats, doubleFaults: 8 },
        away: {},
      },
      server: 'home',
      gameScore: '30-30',
    };

    const lowDFResult = calculateBreakProbability(lowDF);
    const highDFResult = calculateBreakProbability(highDF);

    // High double faults should increase break probability
    expect(highDFResult).toBeGreaterThan(lowDFResult);
  });

  test('Markov: Advantage-40 (advantage returner) -> very high break prob', () => {
    const input = {
      statistics: {
        home: {
          firstServePointsWonPct: 65,
          secondServePointsWonPct: 45,
          firstServeInPct: 62,
          doubleFaults: 2,
        },
        away: {},
      },
      server: 'home',
      gameScore: '40-A', // Advantage returner
    };

    const result = calculateBreakProbability(input);

    // Advantage returner should have very high break probability (>55%)
    expect(result).toBeGreaterThanOrEqual(55);
  });
});

describe('Feature Engine - Pressure', () => {
  test('High pressure (decisive set)', () => {
    const input = {
      score: {
        sets: [
          { home: 6, away: 4 },
          { home: 4, away: 6 },
          { home: 5, away: 5 },
        ],
      },
    };

    const result = calculatePressureFromScore(input.score);

    expect(result).toBeGreaterThanOrEqual(65);
    expect(result).toBeLessThanOrEqual(100);
  });

  test('Low pressure (dominant first set)', () => {
    const input = {
      score: {
        sets: [{ home: 6, away: 1 }],
      },
    };

    const result = calculatePressureFromScore(input.score);

    expect(result).toBeLessThan(60);
  });
});

describe('Feature Engine - DataSource Transparency', () => {
  test('All features have dataSource flag', () => {
    const input = {
      powerRankings: [{ value: 20 }],
      statistics: {
        home: { firstServePointsWonPct: 65 },
        away: { firstServePointsWonPct: 60 },
      },
      score: { sets: [{ home: 3, away: 2 }] },
      odds: { matchWinner: { home: 1.8, away: 2.1 } },
      player1: { ranking: 10 },
      player2: { ranking: 15 },
    };

    const features = computeFeatures(input);

    // Verifica che ogni feature abbia il suo dataSource
    expect(features.volatilitySource).toBeDefined();
    expect(features.pressureSource).toBeDefined();
    expect(features.dominanceSource).toBeDefined();
    expect(features.serveDominanceSource).toBeDefined();
    expect(features.breakProbabilitySource).toBeDefined();
    expect(features.momentumSource).toBeDefined();

    // Verifica che siano stringhe valide
    const validSources = ['live', 'statistics', 'score', 'odds', 'rankings', 'estimated'];
    expect(validSources).toContain(features.volatilitySource);
    expect(validSources).toContain(features.pressureSource);
    expect(validSources).toContain(features.dominanceSource);
  });

  test('dataSource reflects actual data used', () => {
    const input = {
      powerRankings: [],
      statistics: {},
      score: { sets: [{ home: 6, away: 4 }] },
      odds: {},
      player1: {},
      player2: {},
    };

    const features = computeFeatures(input);

    // Solo score disponibile
    expect(features.volatilitySource).toBe('score');
    expect(features.dominanceSource).toBe('score');
    expect(features.pressureSource).toBe('score');
    expect(features.momentumSource).toBe('score');
  });
});

module.exports = {
  // Export fixtures per riuso
  highVolatilityMatch: {
    powerRankings: [
      { value: 40, breakOccurred: false },
      { value: -30, breakOccurred: true },
      { value: 35, breakOccurred: false },
    ],
  },
  dominantHomePlayer: {
    score: {
      sets: [
        { home: 6, away: 2 },
        { home: 4, away: 1 },
      ],
    },
  },
  weakServer: {
    statistics: {
      home: {
        firstServePointsWonPct: 52,
        secondServePointsWonPct: 32,
        doubleFaults: 5,
      },
    },
  },
};
