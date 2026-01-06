/**
 * Reproducibility Test
 *
 * FILOSOFIA_LINEAGE_VERSIONING: FUNCTION_testReproducibility
 * Verifies that given the same inputs and same as_of_time,
 * featureEngine.computeFeatures() produces identical output.
 *
 * @see docs/filosofie/10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md
 */

const { computeFeatures, FEATURE_ENGINE_VERSION } = require('../utils/featureEngine');

describe('Feature Reproducibility (FILOSOFIA_LINEAGE_VERSIONING)', () => {
  // Standard test input - simulates a typical in-progress match
  const testInput = {
    powerRankings: [
      { value: -37 }, { value: 50 }, { value: -55 }, { value: 83 },
      { value: -16 }, { value: 100 }, { value: -81 }, { value: 92 },
      { value: -73 }, { value: 100 }, { value: -45 }, { value: -32 }
    ],
    statistics: {
      home: {
        aces: 5,
        doubleFaults: 2,
        firstServePercentage: 65,
        firstServePointsWon: 70,
        secondServePointsWon: 45,
        breakPointsSaved: 3,
        breakPointsFaced: 4,
        serviceGamesWon: 4,
        returnGamesWon: 1
      },
      away: {
        aces: 3,
        doubleFaults: 3,
        firstServePercentage: 60,
        firstServePointsWon: 65,
        secondServePointsWon: 40,
        breakPointsSaved: 1,
        breakPointsFaced: 2,
        serviceGamesWon: 3,
        returnGamesWon: 2
      }
    },
    score: {
      sets: [
        { home: 4, away: 6 },
        { home: 2, away: 1 }
      ]
    },
    odds: [],
    serving: 'home',
    gameScore: '30-15'
  };

  test('RULE DETERMINISTIC_FEATURES: same input produces same output', () => {
    // Compute features twice with the same input
    const result1 = computeFeatures(testInput);
    const result2 = computeFeatures(testInput);

    // All numeric features must be identical
    expect(result1.volatility).toBe(result2.volatility);
    expect(result1.pressure).toBe(result2.pressure);
    expect(result1.dominance).toBe(result2.dominance);
    expect(result1.serveDominance).toBe(result2.serveDominance);
    expect(result1.returnDominance).toBe(result2.returnDominance);
    expect(result1.breakProbability).toBe(result2.breakProbability);

    // String features must be identical
    expect(result1.dominantPlayer).toBe(result2.dominantPlayer);
    expect(result1.volatilitySource).toBe(result2.volatilitySource);
    expect(result1.version).toBe(result2.version);
  });

  test('RULE NEVER_RETURN_NaN: no feature returns NaN', () => {
    const result = computeFeatures(testInput);

    expect(Number.isNaN(result.volatility)).toBe(false);
    expect(Number.isNaN(result.pressure)).toBe(false);
    expect(Number.isNaN(result.dominance)).toBe(false);
    expect(Number.isNaN(result.serveDominance)).toBe(false);
    expect(Number.isNaN(result.returnDominance)).toBe(false);
    expect(Number.isNaN(result.breakProbability)).toBe(false);
  });

  test('RULE NEVER_RETURN_NULL: no feature returns null', () => {
    const result = computeFeatures(testInput);

    expect(result.volatility).not.toBeNull();
    expect(result.pressure).not.toBeNull();
    expect(result.dominance).not.toBeNull();
    expect(result.serveDominance).not.toBeNull();
    expect(result.returnDominance).not.toBeNull();
    expect(result.breakProbability).not.toBeNull();
    expect(result.dominantPlayer).not.toBeNull();
  });

  test('VERSION is exported and follows semver', () => {
    expect(FEATURE_ENGINE_VERSION).toBeDefined();
    expect(FEATURE_ENGINE_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  test('Empty input produces valid fallback values (not NaN/null)', () => {
    const emptyResult = computeFeatures({});

    expect(typeof emptyResult.volatility).toBe('number');
    expect(typeof emptyResult.pressure).toBe('number');
    expect(typeof emptyResult.dominance).toBe('number');
    expect(Number.isNaN(emptyResult.volatility)).toBe(false);
    expect(Number.isNaN(emptyResult.pressure)).toBe(false);
    expect(Number.isNaN(emptyResult.dominance)).toBe(false);
  });

  test('Malformed input produces valid fallback values (not NaN)', () => {
    const malformedResult = computeFeatures({
      powerRankings: [{ value: NaN }, { value: undefined }],
      statistics: { home: { aces: 'invalid' } },
      score: { sets: null }
    });

    expect(Number.isNaN(malformedResult.volatility)).toBe(false);
    expect(Number.isNaN(malformedResult.pressure)).toBe(false);
    expect(Number.isNaN(malformedResult.dominance)).toBe(false);
  });
});
