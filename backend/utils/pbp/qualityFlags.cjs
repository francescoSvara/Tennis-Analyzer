/**
 * PBP Quality Flags Module
 * 
 * Computes quality metrics for extracted PBP data.
 * Used to determine trustworthiness for analytics.
 * 
 * @module pbp/qualityFlags
 * @see docs/filosofie/FILOSOFIA_PBP_EXTRACTION_PSEUDOCODE.md
 */

'use strict';

/**
 * Quality score weights
 */
const WEIGHTS = {
  UNKNOWN_WINNER_PENALTY: 5,      // Per unknown point winner
  ALTERNATION_FALLBACK_PENALTY: 3, // Per alternation fallback used
  MISSING_SERVER_PENALTY: 4,       // Per missing server icon
  INCONSISTENT_SCORE_PENALTY: 10,  // Per inconsistent score
  LEGACY_HEURISTICS_PENALTY: 15,   // If legacy heuristics were used
};

/**
 * Compute quality flags from PBP data
 * 
 * @param {Object} pbpData - Extracted PBP data
 * @param {Object} extractionMeta - Metadata from extraction process
 * @returns {Object} Quality flags and score
 */
function computeQualityFlags(pbpData, extractionMeta = {}) {
  const flags = {
    missingServerIconCount: 0,
    usedAlternationFallbackCount: 0,
    unknownPointWinnerCount: 0,
    inconsistentScoreCount: 0,
    usedLegacyHeuristics: false,
    totalPoints: 0,
    totalGames: 0,
    qualityScore0to100: 100,
    tags: []
  };

  if (!pbpData) {
    flags.qualityScore0to100 = 0;
    flags.tags.push('NO_DATA');
    return flags;
  }

  // Extract points and games
  const points = pbpData.points || [];
  const games = pbpData.games || pbpData.sets?.flatMap(s => s.games) || [];

  flags.totalPoints = points.length;
  flags.totalGames = games.length;

  // Count unknown point winners
  for (const p of points) {
    const winner = p.pointWinner || p.winner || p.scoring;
    if (!winner || winner === 'unknown' || winner === null) {
      flags.unknownPointWinnerCount++;
    }
  }

  // Count missing server icons (server determined by fallback)
  for (const g of games) {
    if (g.serverSource === 'alternation' || g.serverSource === 'fallback') {
      flags.usedAlternationFallbackCount++;
    }
    if (g.serverSource === 'missing' || !g.server) {
      flags.missingServerIconCount++;
    }
  }

  // Check for inconsistent scores
  // (This would need the raw extraction data to properly count)
  flags.inconsistentScoreCount = extractionMeta.inconsistentScoreCount || 0;

  // Check if legacy heuristics were used
  flags.usedLegacyHeuristics = extractionMeta.usedLegacyExtractor === true || 
                               extractionMeta.usedExtractor === 'legacy';

  // Calculate quality score
  let deductions = 0;
  deductions += flags.unknownPointWinnerCount * WEIGHTS.UNKNOWN_WINNER_PENALTY;
  deductions += flags.usedAlternationFallbackCount * WEIGHTS.ALTERNATION_FALLBACK_PENALTY;
  deductions += flags.missingServerIconCount * WEIGHTS.MISSING_SERVER_PENALTY;
  deductions += flags.inconsistentScoreCount * WEIGHTS.INCONSISTENT_SCORE_PENALTY;
  
  if (flags.usedLegacyHeuristics) {
    deductions += WEIGHTS.LEGACY_HEURISTICS_PENALTY;
  }

  // Normalize deductions by total data size
  const normalizer = Math.max(flags.totalPoints, 1);
  const normalizedDeduction = (deductions / normalizer) * 10;

  flags.qualityScore0to100 = Math.max(0, Math.round(100 - normalizedDeduction));

  // Generate tags
  if (flags.unknownPointWinnerCount > 0) {
    const pct = Math.round(flags.unknownPointWinnerCount / flags.totalPoints * 100);
    if (pct > 20) {
      flags.tags.push('HIGH_UNKNOWN_WINNERS');
    } else if (pct > 5) {
      flags.tags.push('SOME_UNKNOWN_WINNERS');
    }
  }

  if (flags.usedAlternationFallbackCount > 0) {
    flags.tags.push('USED_ALTERNATION_FALLBACK');
  }

  if (flags.missingServerIconCount > 0) {
    flags.tags.push('MISSING_SERVER_ICONS');
  }

  if (flags.usedLegacyHeuristics) {
    flags.tags.push('LEGACY_EXTRACTOR');
  }

  if (flags.qualityScore0to100 >= 90) {
    flags.tags.push('HIGH_QUALITY');
  } else if (flags.qualityScore0to100 >= 70) {
    flags.tags.push('MEDIUM_QUALITY');
  } else {
    flags.tags.push('LOW_QUALITY');
  }

  return flags;
}

/**
 * Merge quality flags from multiple sources
 * @param {Array<Object>} flagsList 
 * @returns {Object}
 */
function mergeQualityFlags(flagsList) {
  if (!flagsList || flagsList.length === 0) {
    return computeQualityFlags(null);
  }

  const merged = {
    missingServerIconCount: 0,
    usedAlternationFallbackCount: 0,
    unknownPointWinnerCount: 0,
    inconsistentScoreCount: 0,
    usedLegacyHeuristics: false,
    totalPoints: 0,
    totalGames: 0,
    qualityScore0to100: 0,
    tags: []
  };

  for (const flags of flagsList) {
    merged.missingServerIconCount += flags.missingServerIconCount || 0;
    merged.usedAlternationFallbackCount += flags.usedAlternationFallbackCount || 0;
    merged.unknownPointWinnerCount += flags.unknownPointWinnerCount || 0;
    merged.inconsistentScoreCount += flags.inconsistentScoreCount || 0;
    merged.usedLegacyHeuristics = merged.usedLegacyHeuristics || flags.usedLegacyHeuristics;
    merged.totalPoints += flags.totalPoints || 0;
    merged.totalGames += flags.totalGames || 0;
  }

  // Average quality score
  const validScores = flagsList.filter(f => typeof f.qualityScore0to100 === 'number');
  if (validScores.length > 0) {
    merged.qualityScore0to100 = Math.round(
      validScores.reduce((sum, f) => sum + f.qualityScore0to100, 0) / validScores.length
    );
  }

  // Merge tags (unique)
  const tagSet = new Set();
  for (const flags of flagsList) {
    for (const tag of (flags.tags || [])) {
      tagSet.add(tag);
    }
  }
  merged.tags = Array.from(tagSet);

  return merged;
}

module.exports = {
  computeQualityFlags,
  mergeQualityFlags,
  WEIGHTS
};
