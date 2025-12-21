/**
 * Modulo per interpretare il campo `value` delle API SofaScore
 * 
 * Il campo `value` rappresenta il momentum/vantaggio di un giocatore nel game corrente.
 * Valori positivi = vantaggio, valori negativi = pressione/svantaggio.
 */

/**
 * Soglie di default per l'interpretazione del value
 */
const DEFAULT_THRESHOLDS = {
  strongControl: 60,    // Controllo netto o break effettuato
  advantage: 20,        // Vantaggio chiaro nel game
  negativePressure: -20 // Pressione significativa
};

/**
 * Interpreta il campo value di un game di tennis
 * 
 * @param {Object} gameData - Dati del game dall'API
 * @param {string} gameData.serving - Chi sta servendo (home/away)
 * @param {string} gameData.scoring - Chi ha segnato l'ultimo punto
 * @param {number} gameData.value - Valore del momentum
 * @param {boolean} gameData.breakOccurred - Se c'è stato un break
 * @param {string} gameData.description - Descrizione del punto (ace, double_fault, ecc.)
 * @param {Object} options - Opzioni aggiuntive
 * @param {Object} options.thresholds - Soglie personalizzate
 * @returns {Object} Interpretazione del game
 */
function interpretGameValue(gameData, options = {}) {
  const {
    serving,
    scoring,
    value,
    breakOccurred,
    description,
    homeScore,
    awayScore
  } = gameData;

  const thresholds = Object.assign({}, DEFAULT_THRESHOLDS, options.thresholds || {});

  let tags = [];
  let message = '';
  let messageIt = ''; // Messaggio in italiano
  let status = 'neutral';
  let numericState = value;

  // Gestione break
  if (breakOccurred) {
    tags.push('break');
    message = `${scoring} broke serve`;
    messageIt = `${scoring} ha effettuato un break`;
    status = 'critical';
  }

  // Interpretazione basata sul value
  if (value > thresholds.strongControl) {
    if (!message) {
      if (serving === scoring) {
        tags.push('service_domination');
        message = `${serving} is dominating on serve`;
        messageIt = `${serving} domina al servizio`;
        status = 'positive';
      } else {
        tags.push('break_in_progress');
        message = `${scoring} is winning points against serve (break opportunity)`;
        messageIt = `${scoring} sta vincendo punti contro il servizio (possibile break)`;
        status = 'warning';
      }
    }
  } else if (value >= thresholds.advantage) {
    tags.push('advantage');
    if (serving === scoring) {
      message = `${serving} has an advantage on serve`;
      messageIt = `${serving} ha vantaggio al servizio`;
      status = 'positive';
    } else {
      message = `${scoring} has momentum`;
      messageIt = `${scoring} ha il momentum`;
      status = 'warning';
    }
  } else if (value > 0) {
    tags.push('balanced');
    message = 'Balanced game with slight advantage';
    messageIt = 'Game equilibrato con leggero vantaggio';
    status = 'neutral';
  } else if (value > thresholds.negativePressure) {
    tags.push('slight_pressure');
    message = `${serving} is under slight pressure`;
    messageIt = `${serving} è in leggera pressione`;
    status = 'warning';
  } else {
    tags.push('strong_pressure');
    message = `${serving} is under strong pressure`;
    messageIt = `${serving} è in forte pressione`;
    status = 'critical';
  }

  // Punti speciali
  if (description && description !== '0' && description !== 'normal') {
    tags.push('special_point');
    const specialDesc = getSpecialPointDescription(description);
    if (specialDesc) {
      message += `; ${specialDesc.en}`;
      messageIt += `; ${specialDesc.it}`;
    }
  }

  return {
    tags,
    message,
    messageIt,
    status,
    numericState,
    thresholds,
    interpretation: getValueZone(value, thresholds)
  };
}

/**
 * Determina la zona del value
 */
function getValueZone(value, thresholds = DEFAULT_THRESHOLDS) {
  if (value > thresholds.strongControl) return 'strong_control';
  if (value >= thresholds.advantage) return 'advantage';
  if (value > 0) return 'balanced_positive';
  if (value > thresholds.negativePressure) return 'slight_pressure';
  return 'strong_pressure';
}

/**
 * Restituisce la descrizione dei punti speciali
 */
function getSpecialPointDescription(code) {
  const descriptions = {
    'ace': { en: 'Ace', it: 'Ace' },
    'double_fault': { en: 'Double Fault', it: 'Doppio fallo' },
    'unforced_error': { en: 'Unforced Error', it: 'Errore non forzato' },
    'winner': { en: 'Winner', it: 'Vincente' },
    'service_winner': { en: 'Service Winner', it: 'Servizio vincente' },
    'return_winner': { en: 'Return Winner', it: 'Risposta vincente' },
    'net_point': { en: 'Net Point', it: 'Punto a rete' },
    'break_point': { en: 'Break Point', it: 'Palla break' },
    'set_point': { en: 'Set Point', it: 'Set point' },
    'match_point': { en: 'Match Point', it: 'Match point' }
  };
  
  return descriptions[code] || null;
}

/**
 * Analizza i dati tennisPowerRankings per estrarre informazioni di momentum
 */
function analyzePowerRankings(powerRankings) {
  if (!Array.isArray(powerRankings) || powerRankings.length === 0) {
    return null;
  }

  const analysis = {
    totalGames: powerRankings.length,
    averageValue: 0,
    maxValue: -Infinity,
    minValue: Infinity,
    breakGames: [],
    dominantGames: [],
    pressureGames: []
  };

  let sum = 0;
  for (const item of powerRankings) {
    const value = item.value || 0;
    sum += value;
    
    if (value > analysis.maxValue) analysis.maxValue = value;
    if (value < analysis.minValue) analysis.minValue = value;
    
    if (item.breakOccurred) {
      analysis.breakGames.push({ set: item.set, game: item.game, value });
    }
    if (value > 60) {
      analysis.dominantGames.push({ set: item.set, game: item.game, value });
    } else if (value < -20) {
      analysis.pressureGames.push({ set: item.set, game: item.game, value });
    }
  }

  analysis.averageValue = sum / powerRankings.length;

  return analysis;
}

// ============================================================================
// NUOVE FUNZIONI: Volatility, Elasticity, Trend Analysis
// ============================================================================

/**
 * Soglie per classificazione volatilità
 */
const VOLATILITY_THRESHOLDS = {
  stable: 15,      // delta medio < 15 = match controllato
  moderate: 25,    // 15-25 = normale alternanza
  volatile: 40,    // 25-40 = alti e bassi frequenti
  extreme: 40      // > 40 = match caotico/emotivo
};

/**
 * Calcola la volatilità del momentum (quanto oscilla tra game consecutivi)
 * @param {Array} powerRankings - Array di { set, game, value }
 * @returns {Object} { value, class, deltas }
 */
function calculateVolatility(powerRankings) {
  if (!Array.isArray(powerRankings) || powerRankings.length < 2) {
    return { value: 0, class: 'STABILE', deltas: [] };
  }

  const deltas = [];
  for (let i = 1; i < powerRankings.length; i++) {
    const prev = powerRankings[i - 1].value || 0;
    const curr = powerRankings[i].value || 0;
    deltas.push(Math.abs(curr - prev));
  }

  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  
  let volatilityClass;
  if (avgDelta < VOLATILITY_THRESHOLDS.stable) {
    volatilityClass = 'STABILE';
  } else if (avgDelta < VOLATILITY_THRESHOLDS.moderate) {
    volatilityClass = 'MODERATO';
  } else if (avgDelta < VOLATILITY_THRESHOLDS.volatile) {
    volatilityClass = 'VOLATILE';
  } else {
    volatilityClass = 'MOLTO_VOLATILE';
  }

  return {
    value: Math.round(avgDelta * 10) / 10,
    class: volatilityClass,
    deltas,
    maxSwing: Math.max(...deltas),
    minSwing: Math.min(...deltas)
  };
}

/**
 * Calcola l'elasticità (capacità di recupero da fasi negative)
 * @param {Array} powerRankings - Array di { set, game, value }
 * @returns {Object} { value, class, negative_phases, avg_recovery_games }
 */
function calculateElasticity(powerRankings) {
  if (!Array.isArray(powerRankings) || powerRankings.length < 3) {
    return { value: 0, class: 'NORMALE', negative_phases: 0, avg_recovery_games: 0 };
  }

  let negativePhases = 0;
  let recoveryGames = [];
  let inNegativePhase = false;
  let negativeStart = -1;

  for (let i = 0; i < powerRankings.length; i++) {
    const value = powerRankings[i].value || 0;
    
    if (value < -15 && !inNegativePhase) {
      // Entrato in fase negativa
      inNegativePhase = true;
      negativeStart = i;
    } else if (value > 0 && inNegativePhase) {
      // Uscito da fase negativa
      inNegativePhase = false;
      negativePhases++;
      recoveryGames.push(i - negativeStart);
    }
  }

  const avgRecovery = recoveryGames.length > 0 
    ? recoveryGames.reduce((a, b) => a + b, 0) / recoveryGames.length 
    : 0;
  
  // Elasticità = 1 / avgRecovery (più veloce a recuperare = più elastico)
  const elasticityValue = avgRecovery > 0 ? Math.min(1, 1 / avgRecovery) : 0.5;
  
  let elasticityClass;
  if (elasticityValue >= 0.5) {
    elasticityClass = 'RESILIENTE';
  } else if (elasticityValue >= 0.33) {
    elasticityClass = 'NORMALE';
  } else {
    elasticityClass = 'FRAGILE';
  }

  return {
    value: Math.round(elasticityValue * 100) / 100,
    class: elasticityClass,
    negative_phases: negativePhases,
    avg_recovery_games: Math.round(avgRecovery * 10) / 10
  };
}

/**
 * Classifica il carattere del match basandosi su volatilità, elasticità e break
 * @param {Object} volatility - Output di calculateVolatility
 * @param {Object} elasticity - Output di calculateElasticity
 * @param {number} breakCount - Numero di break nel match
 * @returns {Object} { character, description }
 */
function classifyMatchCharacter(volatility, elasticity, breakCount = 0) {
  const v = volatility?.class || 'STABILE';
  const e = elasticity?.class || 'NORMALE';
  
  let character, description;
  
  if (v === 'MOLTO_VOLATILE' && breakCount >= 4) {
    character = 'BATTAGLIA_EMOTIVA';
    description = 'Match con grandi oscillazioni e molti break, emotivamente intenso';
  } else if (v === 'STABILE' && e === 'RESILIENTE') {
    character = 'DOMINIO_UNILATERALE';
    description = 'Un giocatore controlla il match con poca resistenza';
  } else if (e === 'RESILIENTE' && breakCount >= 2) {
    character = 'RIMONTE_FREQUENTI';
    description = 'Match con recuperi frequenti dopo momenti difficili';
  } else if (v === 'VOLATILE') {
    character = 'ALTALENA';
    description = 'Match imprevedibile con continui cambi di momentum';
  } else {
    character = 'MATCH_STANDARD';
    description = 'Andamento regolare senza particolari estremi';
  }

  return { character, description };
}

/**
 * Analizza il trend del momentum (direzione: sale, scende, stabile)
 * @param {Array} powerRankings - Array di { set, game, value }
 * @param {number} windowSize - Dimensione finestra per media mobile (default 3)
 * @returns {Object} { current_trend, recent_avg, match_avg, momentum_shift_detected }
 */
function analyzeMomentumTrend(powerRankings, windowSize = 3) {
  if (!Array.isArray(powerRankings) || powerRankings.length < windowSize) {
    return { current_trend: 'STABLE', recent_avg: 0, match_avg: 0, momentum_shift_detected: false };
  }

  // Media totale match
  const matchAvg = powerRankings.reduce((sum, g) => sum + (g.value || 0), 0) / powerRankings.length;
  
  // Media ultimi N game
  const recentGames = powerRankings.slice(-windowSize);
  const recentAvg = recentGames.reduce((sum, g) => sum + (g.value || 0), 0) / recentGames.length;
  
  // Media N game precedenti (per confronto)
  const previousGames = powerRankings.slice(-windowSize * 2, -windowSize);
  const previousAvg = previousGames.length > 0 
    ? previousGames.reduce((sum, g) => sum + (g.value || 0), 0) / previousGames.length 
    : matchAvg;
  
  // Determina trend
  const diff = recentAvg - previousAvg;
  let trend;
  if (diff > 10) {
    trend = 'RISING';
  } else if (diff < -10) {
    trend = 'FALLING';
  } else {
    trend = 'STABLE';
  }
  
  // Detect momentum shift (cambio significativo rispetto alla media)
  const momentumShift = Math.abs(recentAvg - matchAvg) > 20;

  return {
    current_trend: trend,
    recent_avg: Math.round(recentAvg * 10) / 10,
    match_avg: Math.round(matchAvg * 10) / 10,
    momentum_shift_detected: momentumShift,
    trend_strength: Math.abs(diff)
  };
}

/**
 * Analisi potenziata dei powerRankings che include tutto
 * @param {Array} powerRankings - Array tennisPowerRankings
 * @param {Object} matchContext - Contesto match { surface, bestOf, series }
 * @returns {Object} Analisi completa
 */
function analyzePowerRankingsEnhanced(powerRankings, matchContext = {}) {
  const basic = analyzePowerRankings(powerRankings);
  if (!basic) return null;

  const volatility = calculateVolatility(powerRankings);
  const elasticity = calculateElasticity(powerRankings);
  const trend = analyzeMomentumTrend(powerRankings);
  const breakCount = powerRankings.filter(g => g.breakOccurred).length;
  const matchCharacter = classifyMatchCharacter(volatility, elasticity, breakCount);

  // Soglie dinamiche per superficie (se disponibile)
  let thresholds = DEFAULT_THRESHOLDS;
  if (matchContext.surface) {
    const surfaceThresholds = {
      'Hard': { strongControl: 60, advantage: 20, negativePressure: -20 },
      'Clay': { strongControl: 55, advantage: 18, negativePressure: -18 },
      'Grass': { strongControl: 65, advantage: 25, negativePressure: -25 }
    };
    thresholds = surfaceThresholds[matchContext.surface] || DEFAULT_THRESHOLDS;
  }

  return {
    ...basic,
    volatility,
    elasticity,
    trend,
    matchCharacter,
    breakCount,
    thresholds,
    context: matchContext
  };
}

module.exports = {
  interpretGameValue,
  getValueZone,
  getSpecialPointDescription,
  analyzePowerRankings,
  calculateVolatility,
  calculateElasticity,
  classifyMatchCharacter,
  analyzeMomentumTrend,
  analyzePowerRankingsEnhanced,
  DEFAULT_THRESHOLDS,
  VOLATILITY_THRESHOLDS
};
