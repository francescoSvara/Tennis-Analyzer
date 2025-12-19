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
    
    if (value > 60) {
      analysis.dominantGames.push({ set: item.set, game: item.game, value });
    } else if (value < -20) {
      analysis.pressureGames.push({ set: item.set, game: item.game, value });
    }
  }

  analysis.averageValue = sum / powerRankings.length;

  return analysis;
}

module.exports = {
  interpretGameValue,
  getValueZone,
  getSpecialPointDescription,
  analyzePowerRankings,
  DEFAULT_THRESHOLDS
};
