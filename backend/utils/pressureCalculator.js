/**
 * PRESSURE CALCULATOR
 * 
 * Calculates a live pressure index for each player based on real-time statistics.
 * Used for in-play trading decisions.
 * 
 * @module pressureCalculator
 * @see FILOSOFIA_STATS.md - Section "Pressure Index Calculator"
 */

// ============================================================================
// CONSTANTS & THRESHOLDS
// ============================================================================

/**
 * Weight distribution for pressure calculation (must sum to 1.0)
 */
const PRESSURE_WEIGHTS = {
  DOUBLE_FAULTS: 0.25,      // 25% weight
  FIRST_SERVE_WON: 0.30,    // 30% weight - most important
  SECOND_SERVE_WON: 0.25,   // 25% weight
  BREAK_POINTS_SAVED: 0.20  // 20% weight
};

/**
 * Thresholds for categorizing each stat
 */
const PRESSURE_THRESHOLDS = {
  double_faults: {
    normal: 2,      // < 2 per set = ok
    warning: 4,     // 3-4 = attention
    critical: 6     // > 5 = high pressure
  },
  first_serve_won_pct: {
    excellent: 75,  // > 75% = dominant
    good: 65,       // 65-75% = solid
    warning: 55,    // 55-65% = under pressure
    critical: 45    // < 45% = break risk
  },
  second_serve_won_pct: {
    excellent: 55,
    good: 45,
    warning: 35,
    critical: 25
  },
  break_points_saved_pct: {
    excellent: 70,
    good: 55,
    warning: 40,
    critical: 30
  }
};

/**
 * Pressure level classifications
 */
const PRESSURE_LEVELS = {
  CRITICAL: { min: 70, label: 'CRITICAL', color: '#dc2626', emoji: '🔴' },
  HIGH: { min: 50, label: 'HIGH', color: '#ea580c', emoji: '🟠' },
  MODERATE: { min: 30, label: 'MODERATE', color: '#ca8a04', emoji: '🟡' },
  LOW: { min: 15, label: 'LOW', color: '#65a30d', emoji: '🟢' },
  MINIMAL: { min: 0, label: 'MINIMAL', color: '#16a34a', emoji: '✅' }
};

// ============================================================================
// CONTRIBUTION CALCULATORS
// ============================================================================

/**
 * Calculates pressure contribution from double faults
 * @param {number} doubleFaults - Number of double faults
 * @param {number} gamesPlayed - Number of service games played (for context)
 * @returns {Object} Contribution analysis
 */
function calculateDFContribution(doubleFaults, gamesPlayed = 8) {
  const thresholds = PRESSURE_THRESHOLDS.double_faults;
  const maxContribution = PRESSURE_WEIGHTS.DOUBLE_FAULTS * 100;
  
  let contribution = 0;
  let assessment = 'NORMAL';
  
  // Normalize for games played (expected ~1 DF per 4 service games)
  const expectedDF = gamesPlayed / 4;
  const dfRatio = doubleFaults / Math.max(expectedDF, 1);
  
  if (doubleFaults >= thresholds.critical) {
    contribution = maxContribution;
    assessment = 'CRITICAL';
  } else if (doubleFaults >= thresholds.warning) {
    contribution = maxContribution * 0.6;
    assessment = 'WARNING';
  } else if (doubleFaults >= thresholds.normal) {
    contribution = maxContribution * 0.3;
    assessment = 'ELEVATED';
  } else {
    contribution = maxContribution * (doubleFaults / thresholds.normal) * 0.2;
    assessment = 'NORMAL';
  }
  
  return {
    value: doubleFaults,
    expected: parseFloat(expectedDF.toFixed(1)),
    ratio: parseFloat(dfRatio.toFixed(2)),
    contribution: parseFloat(contribution.toFixed(1)),
    assessment
  };
}

/**
 * Calculates pressure contribution from first serve won percentage
 * @param {number} percentage - First serve won %
 * @returns {Object} Contribution analysis
 */
function calculateFirstServeContribution(percentage) {
  const thresholds = PRESSURE_THRESHOLDS.first_serve_won_pct;
  const maxContribution = PRESSURE_WEIGHTS.FIRST_SERVE_WON * 100;
  
  let contribution = 0;
  let assessment = 'EXCELLENT';
  
  // Lower percentage = more pressure (inverse relationship)
  if (percentage < thresholds.critical) {
    contribution = maxContribution;
    assessment = 'CRITICAL';
  } else if (percentage < thresholds.warning) {
    contribution = maxContribution * 0.7;
    assessment = 'WARNING';
  } else if (percentage < thresholds.good) {
    contribution = maxContribution * 0.4;
    assessment = 'BELOW_AVERAGE';
  } else if (percentage < thresholds.excellent) {
    contribution = maxContribution * 0.15;
    assessment = 'GOOD';
  } else {
    contribution = 0;
    assessment = 'EXCELLENT';
  }
  
  return {
    percentage: parseFloat(percentage.toFixed(1)),
    contribution: parseFloat(contribution.toFixed(1)),
    assessment
  };
}

/**
 * Calculates pressure contribution from second serve won percentage
 * @param {number} percentage - Second serve won %
 * @returns {Object} Contribution analysis
 */
function calculateSecondServeContribution(percentage) {
  const thresholds = PRESSURE_THRESHOLDS.second_serve_won_pct;
  const maxContribution = PRESSURE_WEIGHTS.SECOND_SERVE_WON * 100;
  
  let contribution = 0;
  let assessment = 'EXCELLENT';
  
  if (percentage < thresholds.critical) {
    contribution = maxContribution;
    assessment = 'CRITICAL';
  } else if (percentage < thresholds.warning) {
    contribution = maxContribution * 0.65;
    assessment = 'WARNING';
  } else if (percentage < thresholds.good) {
    contribution = maxContribution * 0.35;
    assessment = 'BELOW_AVERAGE';
  } else if (percentage < thresholds.excellent) {
    contribution = maxContribution * 0.1;
    assessment = 'GOOD';
  } else {
    contribution = 0;
    assessment = 'EXCELLENT';
  }
  
  return {
    percentage: parseFloat(percentage.toFixed(1)),
    contribution: parseFloat(contribution.toFixed(1)),
    assessment
  };
}

/**
 * Calculates pressure contribution from break points saved percentage
 * @param {number} saved - Break points saved
 * @param {number} faced - Break points faced
 * @returns {Object} Contribution analysis
 */
function calculateBPContribution(saved, faced) {
  const thresholds = PRESSURE_THRESHOLDS.break_points_saved_pct;
  const maxContribution = PRESSURE_WEIGHTS.BREAK_POINTS_SAVED * 100;
  
  // No break points faced = no pressure from this metric
  if (faced === 0) {
    return {
      saved,
      faced,
      percentage: 100,
      contribution: 0,
      assessment: 'NO_PRESSURE'
    };
  }
  
  const percentage = (saved / faced) * 100;
  let contribution = 0;
  let assessment = 'EXCELLENT';
  
  if (percentage < thresholds.critical) {
    contribution = maxContribution;
    assessment = 'CRITICAL';
  } else if (percentage < thresholds.warning) {
    contribution = maxContribution * 0.7;
    assessment = 'WARNING';
  } else if (percentage < thresholds.good) {
    contribution = maxContribution * 0.4;
    assessment = 'BELOW_AVERAGE';
  } else if (percentage < thresholds.excellent) {
    contribution = maxContribution * 0.15;
    assessment = 'GOOD';
  } else {
    contribution = 0;
    assessment = 'EXCELLENT';
  }
  
  // Bonus pressure if facing many break points
  if (faced >= 5) {
    contribution *= 1.15; // 15% amplification
  }
  if (faced >= 8) {
    contribution *= 1.1; // Additional 10%
  }
  
  return {
    saved,
    faced,
    percentage: parseFloat(percentage.toFixed(1)),
    contribution: parseFloat(Math.min(contribution, maxContribution).toFixed(1)),
    assessment
  };
}

// ============================================================================
// CONTEXT MULTIPLIER
// ============================================================================

/**
 * Calculates context-based pressure multiplier
 * @param {Object} matchContext - Match context information
 * @returns {Object} Context analysis with multiplier
 */
function calculateContextMultiplier(matchContext) {
  const {
    currentSet = 1,
    currentGame = '0-0',
    isDecidingSet = false,
    isBreakPoint = false,
    isSetPoint = false,
    isMatchPoint = false,
    momentum = 0,
    setsWon = 0,
    setsLost = 0
  } = matchContext;
  
  let multiplier = 1.0;
  const factors = [];
  
  // === SET IMPORTANCE ===
  if (isDecidingSet) {
    multiplier *= 1.30;
    factors.push({ name: 'Deciding set', impact: '+30%' });
  } else if (currentSet >= 2) {
    multiplier *= 1.10;
    factors.push({ name: 'Set 2+', impact: '+10%' });
  }
  
  // === GAME IMPORTANCE ===
  if (typeof currentGame === 'string' && currentGame.includes('-')) {
    const [homeGames, awayGames] = currentGame.split('-').map(Number);
    
    // Critical game scores
    if (homeGames >= 4 && awayGames >= 4) {
      multiplier *= 1.20;
      factors.push({ name: 'Critical score (4-4+)', impact: '+20%' });
    } else if (Math.max(homeGames, awayGames) === 5) {
      multiplier *= 1.10;
      factors.push({ name: 'Close to set end', impact: '+10%' });
    }
  }
  
  // === MOMENTUM ===
  if (momentum < -30) {
    multiplier *= 1.20;
    factors.push({ name: 'Negative momentum', impact: '+20%' });
  } else if (momentum < -15) {
    multiplier *= 1.10;
    factors.push({ name: 'Slight negative momentum', impact: '+10%' });
  } else if (momentum > 30) {
    multiplier *= 0.90;
    factors.push({ name: 'Positive momentum', impact: '-10%' });
  }
  
  // === POINT SITUATIONS ===
  if (isMatchPoint) {
    multiplier *= 1.40;
    factors.push({ name: 'Match point', impact: '+40%' });
  } else if (isSetPoint) {
    multiplier *= 1.25;
    factors.push({ name: 'Set point', impact: '+25%' });
  } else if (isBreakPoint) {
    multiplier *= 1.25;
    factors.push({ name: 'Break point', impact: '+25%' });
  }
  
  // === SETS SITUATION ===
  if (setsLost > setsWon) {
    multiplier *= 1.10;
    factors.push({ name: 'Behind in sets', impact: '+10%' });
  }
  
  // Cap multiplier at 2.0x
  multiplier = Math.min(multiplier, 2.0);
  
  return {
    multiplier: parseFloat(multiplier.toFixed(2)),
    factors,
    set_importance: currentSet >= 2 || isDecidingSet ? 'HIGH' : 'NORMAL',
    game_importance: factors.some(f => f.name.includes('Critical')) ? 'CRITICAL' : 'NORMAL',
    point_importance: isMatchPoint ? 'MATCH_POINT' : 
                      isSetPoint ? 'SET_POINT' : 
                      isBreakPoint ? 'BREAK_POINT' : 'NORMAL'
  };
}

// ============================================================================
// MAIN PRESSURE CALCULATOR
// ============================================================================

/**
 * Calculates complete pressure index for a player
 * 
 * @param {Object} liveStats - Live statistics for the player
 * @param {Object} matchContext - Current match context
 * @returns {Object} Complete pressure analysis
 */
function calculatePressureIndex(liveStats, matchContext = {}) {
  const {
    aces = 0,
    doubleFaults = 0,
    firstServeIn = 0,
    firstServeTotal = 0,
    firstServeWon = 0,
    secondServeWon = 0,
    secondServeTotal = 0,
    breakPointsSaved = 0,
    breakPointsFaced = 0,
    serviceGamesPlayed = 8
  } = liveStats;
  
  // === CALCULATE PERCENTAGES ===
  const firstServeWonPct = firstServeIn > 0 
    ? (firstServeWon / firstServeIn) * 100 
    : 0;
  
  const secondServeWonPct = secondServeTotal > 0
    ? (secondServeWon / secondServeTotal) * 100
    : 0;
  
  // === CALCULATE CONTRIBUTIONS ===
  const dfContrib = calculateDFContribution(doubleFaults, serviceGamesPlayed);
  const fswContrib = calculateFirstServeContribution(firstServeWonPct);
  const sswContrib = calculateSecondServeContribution(secondServeWonPct);
  const bpContrib = calculateBPContribution(breakPointsSaved, breakPointsFaced);
  
  // === BASE PRESSURE INDEX ===
  let basePressureIndex = 
    dfContrib.contribution + 
    fswContrib.contribution + 
    sswContrib.contribution + 
    bpContrib.contribution;
  
  // === CONTEXT ADJUSTMENT ===
  const contextAnalysis = calculateContextMultiplier(matchContext);
  const adjustedIndex = basePressureIndex * contextAnalysis.multiplier;
  
  // === FINAL INDEX (capped at 100) ===
  const finalIndex = Math.min(Math.round(adjustedIndex), 100);
  
  // === CLASSIFY PRESSURE LEVEL ===
  const classification = classifyPressure(finalIndex);
  
  // === IDENTIFY MAIN PRESSURE SOURCE ===
  const contributions = [
    { name: 'Double faults', value: dfContrib.contribution },
    { name: 'First serve', value: fswContrib.contribution },
    { name: 'Second serve', value: sswContrib.contribution },
    { name: 'Break points', value: bpContrib.contribution }
  ];
  contributions.sort((a, b) => b.value - a.value);
  const mainPressureSource = contributions[0].name;
  
  // === GENERATE RECOMMENDATION ===
  const recommendation = generateRecommendation(
    finalIndex, 
    classification.level, 
    mainPressureSource,
    contextAnalysis
  );
  
  return {
    // Main index
    index: finalIndex,
    base_index: Math.round(basePressureIndex),
    level: classification.level,
    color: classification.color,
    emoji: classification.emoji,
    
    // Breakdown
    breakdown: {
      double_faults: dfContrib,
      first_serve: {
        in: firstServeIn,
        total: firstServeTotal,
        won: firstServeWon,
        ...fswContrib
      },
      second_serve: {
        won: secondServeWon,
        total: secondServeTotal,
        ...sswContrib
      },
      break_points: bpContrib
    },
    
    // Context
    context_adjustment: contextAnalysis,
    
    // Interpretation
    interpretation: {
      main_pressure_source: mainPressureSource,
      risk_of_break: finalIndex >= 50 ? 'HIGH' : finalIndex >= 30 ? 'MEDIUM' : 'LOW',
      serving_quality: assessServingQuality(fswContrib, sswContrib, dfContrib),
      mental_pressure: assessMentalPressure(bpContrib, contextAnalysis)
    },
    
    // Recommendation
    recommendation,
    
    // Metadata
    timestamp: new Date().toISOString(),
    aces // Include aces for context
  };
}

// ============================================================================
// CLASSIFICATION & RECOMMENDATION
// ============================================================================

/**
 * Classifies pressure level from index
 */
function classifyPressure(index) {
  if (index >= PRESSURE_LEVELS.CRITICAL.min) {
    return PRESSURE_LEVELS.CRITICAL;
  } else if (index >= PRESSURE_LEVELS.HIGH.min) {
    return PRESSURE_LEVELS.HIGH;
  } else if (index >= PRESSURE_LEVELS.MODERATE.min) {
    return PRESSURE_LEVELS.MODERATE;
  } else if (index >= PRESSURE_LEVELS.LOW.min) {
    return PRESSURE_LEVELS.LOW;
  }
  return PRESSURE_LEVELS.MINIMAL;
}

/**
 * Generates trading recommendation based on pressure analysis
 */
function generateRecommendation(index, level, mainSource, context) {
  const recommendations = {
    action: 'MONITOR',
    confidence: 0,
    reason: '',
    exit_trigger: null
  };
  
  if (level === 'CRITICAL') {
    recommendations.action = 'CONSIDER_LAY';
    recommendations.confidence = 75;
    recommendations.reason = `Critical pressure from ${mainSource}. High break risk.`;
    recommendations.exit_trigger = 'Hold confirmed or break obtained';
  } else if (level === 'HIGH') {
    recommendations.action = 'ALERT';
    recommendations.confidence = 60;
    recommendations.reason = `High pressure, mainly from ${mainSource}. Monitor closely.`;
    recommendations.exit_trigger = 'Score change or pressure reduction';
  } else if (level === 'MODERATE') {
    recommendations.action = 'WATCH';
    recommendations.confidence = 45;
    recommendations.reason = 'Moderate pressure. Stay alert for escalation.';
  } else if (level === 'LOW') {
    recommendations.action = 'STABLE';
    recommendations.confidence = 30;
    recommendations.reason = 'Low pressure. Server in reasonable control.';
  } else {
    recommendations.action = 'CONTROL';
    recommendations.confidence = 20;
    recommendations.reason = 'Minimal pressure. Server dominant.';
  }
  
  // Adjust for context
  if (context.point_importance === 'MATCH_POINT') {
    recommendations.confidence = Math.min(recommendations.confidence + 20, 95);
    recommendations.reason += ' MATCH POINT situation.';
  } else if (context.point_importance === 'SET_POINT') {
    recommendations.confidence = Math.min(recommendations.confidence + 10, 90);
  }
  
  return recommendations;
}

/**
 * Assesses overall serving quality
 */
function assessServingQuality(firstServe, secondServe, doubleFaults) {
  const issues = [];
  
  if (firstServe.assessment === 'CRITICAL' || firstServe.assessment === 'WARNING') {
    issues.push('First serve struggling');
  }
  if (secondServe.assessment === 'CRITICAL' || secondServe.assessment === 'WARNING') {
    issues.push('Second serve vulnerable');
  }
  if (doubleFaults.assessment === 'CRITICAL' || doubleFaults.assessment === 'WARNING') {
    issues.push('Double fault issues');
  }
  
  if (issues.length === 0) return 'SOLID';
  if (issues.length === 1) return 'SHAKY';
  if (issues.length === 2) return 'STRUGGLING';
  return 'COLLAPSING';
}

/**
 * Assesses mental pressure
 */
function assessMentalPressure(breakPoints, context) {
  let mentalPressure = 'LOW';
  
  // High BP faced with low save rate = mental pressure
  if (breakPoints.faced >= 4 && breakPoints.percentage < 50) {
    mentalPressure = 'HIGH';
  } else if (breakPoints.faced >= 2 && breakPoints.percentage < 40) {
    mentalPressure = 'HIGH';
  } else if (breakPoints.faced >= 3) {
    mentalPressure = 'ELEVATED';
  }
  
  // Context amplifies mental pressure
  if (context.multiplier > 1.3) {
    if (mentalPressure === 'LOW') mentalPressure = 'ELEVATED';
    else if (mentalPressure === 'ELEVATED') mentalPressure = 'HIGH';
  }
  
  return mentalPressure;
}

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

/**
 * Compares pressure between two players
 * @param {Object} player1Stats - Player 1 live stats
 * @param {Object} player2Stats - Player 2 live stats
 * @param {Object} matchContext - Match context
 * @returns {Object} Comparative analysis
 */
function comparePressure(player1Stats, player2Stats, matchContext = {}) {
  const p1Pressure = calculatePressureIndex(player1Stats, matchContext);
  const p2Pressure = calculatePressureIndex(player2Stats, matchContext);
  
  const differential = p1Pressure.index - p2Pressure.index;
  
  return {
    player1: p1Pressure,
    player2: p2Pressure,
    
    comparison: {
      pressure_differential: differential,
      more_pressured: differential > 0 ? 'player1' : 
                      differential < 0 ? 'player2' : 'equal',
      differential_significance: Math.abs(differential) > 20 ? 'SIGNIFICANT' :
                                 Math.abs(differential) > 10 ? 'NOTABLE' : 'MINIMAL'
    },
    
    trading_insight: generateComparativeInsight(p1Pressure, p2Pressure, differential)
  };
}

/**
 * Generates comparative trading insight
 */
function generateComparativeInsight(p1, p2, diff) {
  if (Math.abs(diff) < 10) {
    return {
      signal: 'NEUTRAL',
      message: 'Both players under similar pressure. No clear trading advantage.'
    };
  }
  
  const pressured = diff > 0 ? 'Player 1' : 'Player 2';
  const level = Math.abs(diff) > 30 ? 'significant' : 'notable';
  
  return {
    signal: diff > 20 ? 'LAY_P1' : diff < -20 ? 'LAY_P2' : 'MONITOR',
    message: `${pressured} under ${level}ly more pressure (${Math.abs(diff)} points difference)`,
    more_pressured: diff > 0 ? 'player1' : 'player2',
    confidence: Math.min(Math.abs(diff), 40) + 30 // 30-70% confidence based on diff
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Get hold difficulty based on pressure index (FILOSOFIA_FRONTEND compliance)
 * @param {Object} stats - Player statistics
 * @param {Object} context - Match context (score, set, etc.)
 * @returns {'HIGH'|'MED'|'LOW'} Hold difficulty level
 */
function getHoldDifficulty(stats, context = {}) {
  const pressure = calculatePressureIndex(stats, context);
  if (pressure > 70) return 'HIGH';
  if (pressure > 40) return 'MED';
  return 'LOW';
}

module.exports = {
  // Main function
  calculatePressureIndex,
  
  // Hold difficulty (FILOSOFIA_FRONTEND)
  getHoldDifficulty,
  
  // Comparison
  comparePressure,
  
  // Individual contributors
  calculateDFContribution,
  calculateFirstServeContribution,
  calculateSecondServeContribution,
  calculateBPContribution,
  
  // Context
  calculateContextMultiplier,
  
  // Classification
  classifyPressure,
  generateRecommendation,
  
  // Constants
  PRESSURE_WEIGHTS,
  PRESSURE_THRESHOLDS,
  PRESSURE_LEVELS
};
