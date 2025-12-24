// ============================================================================
// SAFE RENDER - Helper per renderizzare valori in modo sicuro in React
// ============================================================================

import { apiUrl } from './config';

/**
 * Converte qualsiasi valore in stringa renderizzabile per React.
 * Gestisce oggetti, array, null/undefined in modo sicuro evitando
 * l'errore "Objects are not valid as a React child".
 * 
 * @param {any} value - Il valore da renderizzare
 * @param {string|number} fallback - Valore di fallback se non renderizzabile
 * @returns {string|number} Valore sicuro per React
 */
export function safeRender(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'Sì' : 'No';
  if (Array.isArray(value)) {
    return value.map(v => safeRender(v)).filter(Boolean).join(', ') || fallback;
  }
  if (typeof value === 'object') {
    // Cerca proprietà comuni per estrarre un valore sensato
    const possibleKeys = ['name', 'title', 'label', 'value', 'text', 'description', 'display', 'shortName', 'round'];
    for (const key of possibleKeys) {
      if (value[key] !== undefined && value[key] !== null) {
        const extracted = safeRender(value[key], null);
        if (extracted !== null) return extracted;
      }
    }
    // Se nessuna chiave nota, prova a stringificare (evitando errori)
    try {
      const str = JSON.stringify(value);
      // Se è troppo lungo o sembra dati grezzi, usa fallback
      if (str.length > 50) return fallback;
      return str;
    } catch {
      return fallback;
    }
  }
  return String(value);
}

export function countPointDescriptions(points) {
  if (!Array.isArray(points) || points.length === 0) return '';
  // Simple summary: counts of home/away points and notable types
  const total = points.length;
  let homeSum = 0;
  let awaySum = 0;
  const types = {};
  for (const p of points) {
    if (typeof p.homePoint === 'number') homeSum += p.homePoint;
    if (typeof p.awayPoint === 'number') awaySum += p.awayPoint;
    if (p.homePointType) types[p.homePointType] = (types[p.homePointType] || 0) + 1;
    if (p.awayPointType) types[p.awayPointType] = (types[p.awayPointType] || 0) + 1;
  }
  const typesSummary = Object.entries(types)
    .slice(0, 3)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
  return `Tot ${total}, H:${homeSum} A:${awaySum}${typesSummary ? ' — ' + typesSummary : ''}`;
}

// ============================================================================
// LIVE DATA FETCHING - API Helpers per dati in tempo reale
// ============================================================================

/**
 * Carica i dati point-by-point dall'API per un evento specifico
 * @param {string|number} eventId - ID dell'evento SofaScore
 * @returns {Promise<Array>} Array di point-by-point data
 */
export async function fetchPointByPoint(eventId) {
  if (!eventId) return [];
  try {
    const res = await fetch(apiUrl(`/api/event/${eventId}/point-by-point`));
    if (!res.ok) return [];
    const data = await res.json();
    return data.pointByPoint || [];
  } catch (e) {
    console.error('fetchPointByPoint error:', e);
    return [];
  }
}

/**
 * Carica le statistiche dall'API per un evento specifico
 * @param {string|number} eventId - ID dell'evento SofaScore
 * @returns {Promise<Array>} Array di statistiche
 */
export async function fetchStatistics(eventId) {
  if (!eventId) return [];
  try {
    const res = await fetch(apiUrl(`/api/event/${eventId}/statistics`));
    if (!res.ok) return [];
    const data = await res.json();
    return data.statistics || [];
  } catch (e) {
    console.error('fetchStatistics error:', e);
    return [];
  }
}

/**
 * Carica i power rankings (momentum) dall'API per un evento specifico
 * @param {string|number} eventId - ID dell'evento SofaScore
 * @returns {Promise<Array>} Array di power rankings
 */
export async function fetchPowerRankings(eventId) {
  if (!eventId) return [];
  try {
    const res = await fetch(apiUrl(`/api/event/${eventId}/power-rankings`));
    if (!res.ok) return [];
    const data = await res.json();
    return data.tennisPowerRankings || [];
  } catch (e) {
    console.error('fetchPowerRankings error:', e);
    return [];
  }
}

/**
 * Carica tutti i dati live in una sola chiamata (evento, punteggio, point-by-point, statistiche)
 * @param {string|number} eventId - ID dell'evento SofaScore
 * @returns {Promise<Object>} Oggetto con tutti i dati live
 */
export async function fetchLiveData(eventId) {
  if (!eventId) return null;
  try {
    const res = await fetch(apiUrl(`/api/event/${eventId}/live`));
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('fetchLiveData error:', e);
    return null;
  }
}

/**
 * Estrae l'eventId da varie fonti di dati
 * @param {Object} data - Dati grezzi o normalizzati
 * @returns {string|number|null} Event ID se trovato
 */
export function extractEventId(data) {
  if (!data || typeof data !== 'object') return null;
  
  // Cerca direttamente
  if (data.eventId) return data.eventId;
  if (data.id && typeof data.id === 'number') return data.id;
  
  // Cerca in event
  if (data.event?.id) return data.event.id;
  
  // Cerca in api responses
  if (data.api) {
    for (const [url, response] of Object.entries(data.api)) {
      if (response?.event?.id) return response.event.id;
      // Estrai dall'URL
      const match = url.match(/\/event\/(\d+)/);
      if (match) return match[1];
    }
  }
  
  // Cerca in _raw
  if (data._raw) return extractEventId(data._raw);
  
  return null;
}

// ============================================================================
// VALUE INTERPRETATION - Momentum/Vantaggio del giocatore
// ============================================================================

/**
 * Soglie di default per l'interpretazione del value
 */
export const VALUE_THRESHOLDS = {
  strongControl: 60,    // Controllo netto o break effettuato
  advantage: 20,        // Vantaggio chiaro nel game
  negativePressure: -20 // Pressione significativa
};

/**
 * Interpreta il campo value di un game di tennis
 * 
 * @param {Object} gameData - Dati del game
 * @param {string} gameData.serving - Chi sta servendo (home/away)
 * @param {string} gameData.scoring - Chi ha segnato l'ultimo punto
 * @param {number} gameData.value - Valore del momentum
 * @param {boolean} gameData.breakOccurred - Se c'è stato un break
 * @param {string} gameData.description - Descrizione del punto
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Object} Interpretazione del game
 */
export function interpretGameValue(gameData, options = {}) {
  const {
    serving,
    scoring,
    value,
    breakOccurred,
    description
  } = gameData;

  const thresholds = { ...VALUE_THRESHOLDS, ...(options.thresholds || {}) };

  let tags = [];
  let message = '';
  let messageIt = '';
  let status = 'neutral';

  // Gestione break
  if (breakOccurred) {
    tags.push('break');
    message = `${scoring || 'Player'} broke serve`;
    messageIt = `${scoring || 'Giocatore'} ha effettuato un break`;
    status = 'critical';
  }

  // Interpretazione basata sul value
  if (value > thresholds.strongControl) {
    if (!message) {
      if (serving === scoring) {
        tags.push('service_domination');
        message = `${serving || 'Server'} is dominating on serve`;
        messageIt = `${serving || 'Al servizio'} domina al servizio`;
        status = 'positive';
      } else {
        tags.push('break_in_progress');
        message = `${scoring || 'Receiver'} is winning points against serve`;
        messageIt = `${scoring || 'In risposta'} sta vincendo punti contro il servizio`;
        status = 'warning';
      }
    }
  } else if (value >= thresholds.advantage) {
    tags.push('advantage');
    if (serving === scoring) {
      message = `${serving || 'Server'} has an advantage`;
      messageIt = `${serving || 'Al servizio'} ha vantaggio`;
      status = 'positive';
    } else {
      message = `${scoring || 'Receiver'} has momentum`;
      messageIt = `${scoring || 'In risposta'} ha il momentum`;
      status = 'warning';
    }
  } else if (value > 0) {
    tags.push('balanced');
    message = 'Balanced game';
    messageIt = 'Game equilibrato';
    status = 'neutral';
  } else if (value > thresholds.negativePressure) {
    tags.push('slight_pressure');
    message = `${serving || 'Server'} is under slight pressure`;
    messageIt = `${serving || 'Al servizio'} è in leggera pressione`;
    status = 'warning';
  } else {
    tags.push('strong_pressure');
    message = `${serving || 'Server'} is under strong pressure`;
    messageIt = `${serving || 'Al servizio'} è in forte pressione`;
    status = 'critical';
  }

  // Punti speciali
  if (description && description !== '0' && description !== 'normal') {
    tags.push('special_point');
    const specialDesc = getSpecialPointDescription(description);
    if (specialDesc) {
      message += ` (${specialDesc.en})`;
      messageIt += ` (${specialDesc.it})`;
    }
  }

  return {
    tags,
    message,
    messageIt,
    status,
    numericState: value,
    zone: getValueZone(value, thresholds)
  };
}

/**
 * Determina la zona del value
 */
export function getValueZone(value, thresholds = VALUE_THRESHOLDS) {
  if (value > thresholds.strongControl) return 'strong_control';
  if (value >= thresholds.advantage) return 'advantage';
  if (value > 0) return 'balanced_positive';
  if (value > thresholds.negativePressure) return 'slight_pressure';
  return 'strong_pressure';
}

/**
 * Restituisce la descrizione dei punti speciali
 */
export function getSpecialPointDescription(code) {
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
 * Restituisce il colore CSS per uno status
 */
export function getStatusColor(status) {
  const colors = {
    positive: '#4caf50',   // Verde - vantaggio/dominio
    neutral: '#9e9e9e',    // Grigio - equilibrato
    warning: '#ff9800',    // Arancione - pressione leggera
    critical: '#f44336'    // Rosso - forte pressione/break
  };
  return colors[status] || colors.neutral;
}

/**
 * Restituisce l'icona per una zona
 */
export function getZoneIcon(zone) {
  const icons = {
    'strong_control': '🔥',
    'advantage': '💪',
    'balanced_positive': '⚖️',
    'slight_pressure': '😰',
    'strong_pressure': '🚨'
  };
  return icons[zone] || '';
}

/**
 * Analizza i dati tennisPowerRankings per statistiche di momentum
 */
export function analyzePowerRankings(powerRankings) {
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

  analysis.averageValue = Math.round((sum / powerRankings.length) * 10) / 10;

  return analysis;
}

// ============================================================================
// VOLATILITY, ELASTICITY & TREND ANALYSIS
// ============================================================================

const VOLATILITY_THRESHOLDS = {
  stable: 15,
  moderate: 25,
  volatile: 40,
  extreme: 40
};

/**
 * Calcola la volatilità del momentum
 * 
 * @deprecated Preferire usare i valori pre-calcolati dal MatchBundle:
 *   bundle.header.features.volatility (valore 0-100)
 *   bundle.header.features.volatilitySource ('live' | 'statistics' | 'score' | 'estimated')
 * Questa funzione rimane per retrocompatibilità con codice legacy.
 * Vedi: docs/filosofie/FILOSOFIA_CALCOLI_V1.md sezione "Volatility & Momentum".
 * 
 * @param {Array} powerRankings - Array di powerRanking points
 * @param {Object} [preComputed] - Valori pre-calcolati dal backend (opzionale)
 * @returns {Object} { value, class, deltas, maxSwing, minSwing }
 */
export function calculateVolatility(powerRankings, preComputed = null) {
  // Se abbiamo valori pre-calcolati dal backend, usiamoli
  if (preComputed?.volatility !== undefined) {
    const v = preComputed.volatility;
    let volatilityClass;
    if (v < 30) volatilityClass = 'STABILE';
    else if (v < 50) volatilityClass = 'MODERATO';
    else if (v < 70) volatilityClass = 'VOLATILE';
    else volatilityClass = 'MOLTO_VOLATILE';
    return { value: v, class: volatilityClass, deltas: [], maxSwing: 0, minSwing: 0, fromBackend: true };
  }
  
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
  if (avgDelta < VOLATILITY_THRESHOLDS.stable) volatilityClass = 'STABILE';
  else if (avgDelta < VOLATILITY_THRESHOLDS.moderate) volatilityClass = 'MODERATO';
  else if (avgDelta < VOLATILITY_THRESHOLDS.volatile) volatilityClass = 'VOLATILE';
  else volatilityClass = 'MOLTO_VOLATILE';

  return {
    value: Math.round(avgDelta * 10) / 10,
    class: volatilityClass,
    deltas,
    maxSwing: Math.max(...deltas),
    minSwing: Math.min(...deltas)
  };
}

/**
 * Calcola l'elasticità (capacità di recupero)
 * 
 * @deprecated Preferire usare i valori pre-calcolati dal MatchBundle:
 *   bundle.tabs.stats.analysis.elasticity
 * Questa funzione rimane per retrocompatibilità con codice legacy.
 * 
 * @param {Array} powerRankings - Array di powerRanking points
 * @param {Object} [preComputed] - Valori pre-calcolati dal backend (opzionale)
 * @returns {Object} { value, class, negative_phases, avg_recovery_games }
 */
export function calculateElasticity(powerRankings, preComputed = null) {
  // Se abbiamo valori pre-calcolati dal backend, usiamoli
  if (preComputed?.elasticity !== undefined) {
    const e = preComputed.elasticity;
    let elasticityClass;
    if (e >= 0.5) elasticityClass = 'RESILIENTE';
    else if (e >= 0.33) elasticityClass = 'NORMALE';
    else elasticityClass = 'FRAGILE';
    return { value: e, class: elasticityClass, negative_phases: 0, avg_recovery_games: 0, fromBackend: true };
  }

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
      inNegativePhase = true;
      negativeStart = i;
    } else if (value > 0 && inNegativePhase) {
      inNegativePhase = false;
      negativePhases++;
      recoveryGames.push(i - negativeStart);
    }
  }

  const avgRecovery = recoveryGames.length > 0 
    ? recoveryGames.reduce((a, b) => a + b, 0) / recoveryGames.length 
    : 0;
  
  const elasticityValue = avgRecovery > 0 ? Math.min(1, 1 / avgRecovery) : 0.5;
  
  let elasticityClass;
  if (elasticityValue >= 0.5) elasticityClass = 'RESILIENTE';
  else if (elasticityValue >= 0.33) elasticityClass = 'NORMALE';
  else elasticityClass = 'FRAGILE';

  return {
    value: Math.round(elasticityValue * 100) / 100,
    class: elasticityClass,
    negative_phases: negativePhases,
    avg_recovery_games: Math.round(avgRecovery * 10) / 10
  };
}

/**
 * Classifica il carattere del match
 * 
 * @deprecated Preferire usare i valori pre-calcolati dal MatchBundle:
 *   bundle.tabs.stats.analysis.character
 *   bundle.tabs.stats.calculatedData.matchCharacter
 * Questa funzione rimane per retrocompatibilità con codice legacy.
 * 
 * @param {Object} volatility - Risultato di calculateVolatility
 * @param {Object} elasticity - Risultato di calculateElasticity
 * @param {number} breakCount - Numero di break nel match
 * @param {Object} [preComputed] - Valori pre-calcolati dal backend (opzionale)
 * @returns {Object} { character, description }
 */
export function classifyMatchCharacter(volatility, elasticity, breakCount = 0, preComputed = null) {
  // Se abbiamo character pre-calcolato dal backend, usiamolo
  if (preComputed?.matchCharacter || preComputed?.character) {
    const char = preComputed.matchCharacter || preComputed.character;
    return { character: char, description: `From backend: ${char}`, fromBackend: true };
  }

  const v = volatility?.class || 'STABILE';
  const e = elasticity?.class || 'NORMALE';
  
  let character, description;
  
  if (v === 'MOLTO_VOLATILE' && breakCount >= 4) {
    character = 'BATTAGLIA_EMOTIVA';
    description = 'Match con grandi oscillazioni e molti break';
  } else if (v === 'STABILE' && e === 'RESILIENTE') {
    character = 'DOMINIO_UNILATERALE';
    description = 'Un giocatore controlla il match';
  } else if (e === 'RESILIENTE' && breakCount >= 2) {
    character = 'RIMONTE_FREQUENTI';
    description = 'Match con recuperi frequenti';
  } else if (v === 'VOLATILE') {
    character = 'ALTALENA';
    description = 'Match imprevedibile';
  } else {
    character = 'MATCH_STANDARD';
    description = 'Andamento regolare';
  }

  return { character, description };
}

/**
 * Analizza il trend del momentum
 */
export function analyzeMomentumTrend(powerRankings, windowSize = 3) {
  if (!Array.isArray(powerRankings) || powerRankings.length < windowSize) {
    return { current_trend: 'STABLE', recent_avg: 0, match_avg: 0, momentum_shift_detected: false };
  }

  const matchAvg = powerRankings.reduce((sum, g) => sum + (g.value || 0), 0) / powerRankings.length;
  const recentGames = powerRankings.slice(-windowSize);
  const recentAvg = recentGames.reduce((sum, g) => sum + (g.value || 0), 0) / recentGames.length;
  
  const previousGames = powerRankings.slice(-windowSize * 2, -windowSize);
  const previousAvg = previousGames.length > 0 
    ? previousGames.reduce((sum, g) => sum + (g.value || 0), 0) / previousGames.length 
    : matchAvg;
  
  const diff = recentAvg - previousAvg;
  let trend;
  if (diff > 10) trend = 'RISING';
  else if (diff < -10) trend = 'FALLING';
  else trend = 'STABLE';
  
  return {
    current_trend: trend,
    recent_avg: Math.round(recentAvg * 10) / 10,
    match_avg: Math.round(matchAvg * 10) / 10,
    momentum_shift_detected: Math.abs(recentAvg - matchAvg) > 20,
    trend_strength: Math.abs(diff)
  };
}

/**
 * Analisi potenziata completa dei powerRankings
 */
export function analyzePowerRankingsEnhanced(powerRankings, matchContext = {}) {
  const basic = analyzePowerRankings(powerRankings);
  if (!basic) return null;

  const volatility = calculateVolatility(powerRankings);
  const elasticity = calculateElasticity(powerRankings);
  const trend = analyzeMomentumTrend(powerRankings);
  const breakCount = powerRankings.filter(g => g.breakOccurred).length;
  const matchCharacter = classifyMatchCharacter(volatility, elasticity, breakCount);

  return {
    ...basic,
    volatility,
    elasticity,
    trend,
    matchCharacter,
    breakCount,
    context: matchContext
  };
}

// Parse a value that may contain numbers mixed with text (e.g. "37/59 (63%)")
export function parseNumericValue(val) {
  if (val === null || val === undefined) return NaN;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  // Try direct parse (handles "12.3" and "12,3")
  const n = Number(s.replace(',', '.'));
  if (!isNaN(n)) return n;
  // Extract first numeric group
  const m = s.match(/(\d+[\d.,]*)/);
  if (m) return Number(m[1].replace(',', '.'));
  return NaN;
}

// Determine highlight classes for a stat item based on numeric comparison and optional compareCode
export function getStatHighlightClasses(item) {
  const homeRaw = item.homeValue ?? item.home;
  const awayRaw = item.awayValue ?? item.away;
  const homeVal = parseNumericValue(homeRaw);
  const awayVal = parseNumericValue(awayRaw);

  // default none
  let homeKey = '';
  let awayKey = '';

  if (!isNaN(homeVal) && !isNaN(awayVal)) {
    if (homeVal > awayVal) {
      if (item.compareCode === 1) homeKey = 'homeWinner';
      else if (item.compareCode === 2) awayKey = 'awayWinner';
      else homeKey = 'homeWinner';
    } else if (awayVal > homeVal) {
      if (item.compareCode === 2) awayKey = 'awayWinner';
      else if (item.compareCode === 1) homeKey = 'homeWinner';
      else awayKey = 'awayWinner';
    } else {
      homeKey = awayKey = 'equalValue';
    }
  } else {
    homeKey = awayKey = 'equalValue';
  }

  return { homeKey, awayKey };
}

// ============================================================================
// CORE: Flatten scraper data with URL keys into a single searchable object
// ============================================================================

/**
 * Flatten the scraper output { api: { 'https://...': {...}, ... } } into a single object
 * where all nested data can be easily searched. Also merges 'mapping' and 'initial' if present.
 */
export function flattenScraperData(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  
  const flattened = {};
  
  // PRIMA di tutto, copia i campi top-level che non sono oggetti speciali
  // Questo preserva tennisPowerRankings, statistics, pointByPoint, etc.
  for (const [k, v] of Object.entries(raw)) {
    if (!['api', 'mapping', 'initial', '_raw', '_flat'].includes(k)) {
      flattened[k] = v;
    }
  }
  
  // If raw has 'api' object with URL keys, extract all values
  if (raw.api && typeof raw.api === 'object') {
    for (const [url, data] of Object.entries(raw.api)) {
      if (data && typeof data === 'object') {
        // Use a simplified key based on the URL path
        const urlKey = extractUrlKey(url);
        flattened[urlKey] = data;
        
        // Also merge top-level properties directly for easier access
        for (const [k, v] of Object.entries(data)) {
          if (!flattened[k]) {
            flattened[k] = v;
          }
        }
      }
    }
  }
  
  // Merge 'mapping' if present
  if (raw.mapping && typeof raw.mapping === 'object') {
    flattened._mapping = raw.mapping;
    for (const [k, v] of Object.entries(raw.mapping)) {
      if (!flattened[k]) flattened[k] = v;
    }
  }
  
  // Merge 'initial' if present
  if (raw.initial && typeof raw.initial === 'object') {
    flattened._initial = raw.initial;
  }
  
  // Keep original for reference
  flattened._raw = raw;
  
  return flattened;
}

/**
 * Extract a readable key from a SofaScore API URL
 * e.g., "https://www.sofascore.com/api/v1/event/15108295/point-by-point" -> "event_15108295_point-by-point"
 */
function extractUrlKey(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    // Remove 'api', 'v1', 'v2' prefixes
    const relevant = parts.filter(p => !['api', 'v1', 'v2', 'www.sofascore.com'].includes(p));
    return relevant.join('_') || url;
  } catch {
    return url;
  }
}

/**
 * Deep search for a key in an object tree. Returns first match.
 */
export function deepFind(obj, key, maxDepth = 10) {
  if (!obj || typeof obj !== 'object' || maxDepth <= 0) return undefined;
  
  if (key in obj) return obj[key];
  
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const found = deepFind(v, key, maxDepth - 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/**
 * Deep search for all occurrences of a key. Returns array of values.
 */
export function deepFindAll(obj, key, maxDepth = 10, results = []) {
  if (!obj || typeof obj !== 'object' || maxDepth <= 0) return results;
  
  if (key in obj && obj[key] !== undefined) {
    results.push(obj[key]);
  }
  
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      deepFindAll(v, key, maxDepth - 1, results);
    }
  }
  return results;
}

// ============================================================================
// Normalize common JSON shapes returned by the scraper or by the example JSON
// ============================================================================

export function normalizeApiResponse(raw) {
  if (!raw || typeof raw !== 'object') return { _raw: raw };
  
  // First flatten the scraper data
  const flat = flattenScraperData(raw);
  const out = {};

  // Try to find statistics -> statistics array with period 'ALL'
  const statsArrays = deepFindAll(flat, 'statistics', 5);
  for (const statsArr of statsArrays) {
    if (Array.isArray(statsArr)) {
      out.statsAll = statsArr.find((s) => s.period === 'ALL') || statsArr[0];
      if (out.statsAll) break;
    }
  }

  // pointByPoint extraction
  const pbpArrays = deepFindAll(flat, 'pointByPoint', 5);
  for (const pbp of pbpArrays) {
    if (Array.isArray(pbp) && pbp.length > 0) {
      out.pointByPoint = pbp;
      break;
    }
  }

  // Accept alternative keys used by the live backend (e.g. `powerRankings`)
  // Normalize to the expected `tennisPowerRankings` key used across the app
  out.tennisPowerRankings = deepFind(flat, 'tennisPowerRankings', 5) || deepFind(flat, 'powerRankings', 5) || null;

  // Find event object with homeTeam/awayTeam
  const eventObj = deepFind(flat, 'event', 5);
  if (eventObj && typeof eventObj === 'object') {
    out.event = eventObj;
    out.home = eventObj.homeTeam || null;
    out.away = eventObj.awayTeam || null;
    out.homeScore = eventObj.homeScore || null;
    out.awayScore = eventObj.awayScore || null;
    out.status = eventObj.status || null;
    out.tournament = eventObj.tournament || eventObj.uniqueTournament || null;
  } else {
    // Fallback: search for homeTeam/awayTeam directly
    out.home = deepFind(flat, 'homeTeam', 5) || null;
    out.away = deepFind(flat, 'awayTeam', 5) || null;
    out.homeScore = deepFind(flat, 'homeScore', 5) || null;
    out.awayScore = deepFind(flat, 'awayScore', 5) || null;
  }

  // Tennis power rankings
  out.tennisPower = deepFind(flat, 'tennisPowerRankings', 5) || null;
  
  // Win probability
  out.winProbability = deepFind(flat, 'winProbability', 5) || deepFind(flat, 'graphPoints', 5) || null;

  out._flat = flat;
  out._raw = raw;
  return out;
}

// ============================================================================
// TASK 2: Extract Event/Match Info
// ============================================================================

/**
 * Extract comprehensive event information from any JSON structure.
 * Works with both raw scraper data and already-normalized data.
 * 
 * @param {Object} raw - Raw data from scraper or API
 * @returns {Object} Normalized event info
 */
export function extractEventInfo(raw) {
  if (!raw || typeof raw !== 'object') return null;
  
  // PRIORITÀ 1: Se raw.event esiste già (dati normalizzati dal DB), usalo direttamente
  // Questo evita che deepFind trovi l'event annidato in raw_json.api invece del nostro
  if (raw.event && typeof raw.event === 'object' && (raw.event.homeTeam || raw.event.id)) {
    console.log('🎯 extractEventInfo: usando raw.event esistente', raw.event.homeTeam?.name);
    return {
      eventId: raw.event.id || raw.event.customId || null,
      slug: raw.event.slug || null,
      home: extractTeamInfo(raw.event.homeTeam),
      away: extractTeamInfo(raw.event.awayTeam),
      homeScore: extractScoreInfo(raw.event.homeScore),
      awayScore: extractScoreInfo(raw.event.awayScore),
      status: extractStatusInfo(raw.event.status),
      tournament: extractTournamentInfo(raw.event.tournament || raw.event.uniqueTournament),
      round: raw.event.roundInfo || null,
      venue: raw.event.venue || null,
      startTime: raw.event.startTimestamp ? new Date(raw.event.startTimestamp * 1000) : null,
      winnerCode: raw.event.winnerCode || null,
      firstToServe: raw.event.firstToServe || null,
      _source: 'direct_event'
    };
  }
  
  // First normalize/flatten the data
  const normalized = raw._flat ? raw : normalizeApiResponse(raw);
  const flat = normalized._flat || normalized;
  
  // Find the main event object - try multiple paths
  let event = normalized.event || deepFind(flat, 'event', 5);
  
  // If no event, try to find it in API responses
  if (!event && raw.api) {
    for (const data of Object.values(raw.api)) {
      if (data?.event) {
        event = data.event;
        break;
      }
    }
  }
  
  if (!event) {
    // Try to build event info from scattered data
    // Search for homeTeam/awayTeam or home/away in multiple places
    let homeTeam = normalized.home || normalized.homeTeam || deepFind(flat, 'homeTeam', 5) || deepFind(flat, 'home', 5);
    let awayTeam = normalized.away || normalized.awayTeam || deepFind(flat, 'awayTeam', 5) || deepFind(flat, 'away', 5);
    
    // Also check in mapping
    if (!homeTeam && normalized._mapping?.home) homeTeam = normalized._mapping.home;
    if (!awayTeam && normalized._mapping?.away) awayTeam = normalized._mapping.away;
    
    // Check in raw.mapping
    if (!homeTeam && raw.mapping?.home) homeTeam = raw.mapping.home;
    if (!awayTeam && raw.mapping?.away) awayTeam = raw.mapping.away;
    
    return {
      eventId: null,
      home: extractTeamInfo(homeTeam),
      away: extractTeamInfo(awayTeam),
      homeScore: extractScoreInfo(normalized.homeScore || deepFind(flat, 'homeScore', 5)),
      awayScore: extractScoreInfo(normalized.awayScore || deepFind(flat, 'awayScore', 5)),
      status: extractStatusInfo(deepFind(flat, 'status', 5)),
      tournament: extractTournamentInfo(deepFind(flat, 'tournament', 5) || deepFind(flat, 'uniqueTournament', 5)),
      round: deepFind(flat, 'roundInfo', 5),
      venue: deepFind(flat, 'venue', 5),
      startTime: null,
      _source: 'scattered'
    };
  }
  
  return {
    eventId: event.id || event.customId || null,
    slug: event.slug || null,
    home: extractTeamInfo(event.homeTeam),
    away: extractTeamInfo(event.awayTeam),
    homeScore: extractScoreInfo(event.homeScore),
    awayScore: extractScoreInfo(event.awayScore),
    status: extractStatusInfo(event.status),
    tournament: extractTournamentInfo(event.tournament || event.uniqueTournament),
    round: event.roundInfo || null,
    venue: event.venue || null,
    startTime: event.startTimestamp ? new Date(event.startTimestamp * 1000) : null,
    winnerCode: event.winnerCode || null, // 1 = home, 2 = away, 0 = draw
    firstToServe: event.firstToServe || null,
    _source: 'event'
  };
}

/**
 * Extract team info in a consistent format
 */
function extractTeamInfo(team) {
  if (!team) return null;
  if (typeof team === 'string') return { name: team, shortName: team, id: null };
  
  // Handle various possible formats
  const name = team.name || team.fullName || team.shortName || team.displayName || team.teamName || null;
  
  return {
    id: team.id || null,
    name: name,
    fullName: team.fullName || team.name || name || null,
    shortName: team.shortName || team.name || name || null,
    slug: team.slug || null,
    country: team.country || null,
    ranking: team.ranking || team.playerTeamInfo?.currentRanking || team.currentRanking || null,
    seed: team.seed || null,
    playerInfo: team.playerTeamInfo || null
  };
}

/**
 * Extract score info with all periods
 */
function extractScoreInfo(score) {
  if (!score) return null;
  if (typeof score === 'number') return { current: score, sets: [] };
  
  const sets = [];
  // Extract period scores (period1, period2, etc.)
  for (let i = 1; i <= 5; i++) {
    const key = `period${i}`;
    if (score[key] !== undefined) {
      sets.push({
        set: i,
        games: score[key],
        tiebreak: score[`${key}TieBreak`] || null
      });
    }
  }
  
  return {
    current: score.current ?? score.display ?? null,
    display: score.display ?? score.current ?? null,
    point: score.point || null, // Current game point (e.g., "40", "A")
    sets,
    normaltime: score.normaltime ?? null
  };
}

/**
 * Extract status info
 */
function extractStatusInfo(status) {
  if (!status) return null;
  if (typeof status === 'string') return { description: status, code: null, type: null };
  
  return {
    code: status.code || null,
    description: status.description || null,
    type: status.type || null // 'finished', 'inprogress', 'notstarted', etc.
  };
}

/**
 * Extract tournament info
 */
function extractTournamentInfo(tournament) {
  if (!tournament) return null;
  if (typeof tournament === 'string') return { name: tournament };
  
  return {
    id: tournament.id || null,
    name: tournament.name || null,
    slug: tournament.slug || null,
    category: tournament.category?.name || null,
    groundType: tournament.groundType || null,
    country: tournament.country || null
  };
}

// ============================================================================
// TASK 3: Extract Statistics
// ============================================================================

/**
 * Extract and normalize match statistics from any JSON structure.
 * Returns statistics organized by period and group.
 * 
 * @param {Object} raw - Raw data from scraper or API
 * @param {string} period - Period to extract ('ALL', '1', '2', etc.). Default 'ALL'
 * @returns {Object|null} Normalized statistics or null if not found
 */
export function extractStatistics(raw, period = 'ALL') {
  if (!raw || typeof raw !== 'object') return null;
  
  // PRIORITÀ 1: Se raw.statistics esiste già in formato array (dati DB normalizzati), usalo direttamente
  if (Array.isArray(raw.statistics) && raw.statistics.length > 0 && raw.statistics[0].groups) {
    const periodData = raw.statistics.find(s => s.period === period) || raw.statistics[0];
    console.log('🎯 extractStatistics: usando raw.statistics esistente, periodo:', periodData?.period);
    if (periodData && periodData.groups) {
      return {
        period: periodData.period || period,
        groups: periodData.groups.map(group => ({
          groupName: group.groupName || 'Unknown',
          items: (group.statisticsItems || []).map(item => ({
            name: item.name || item.key || 'Unknown',
            key: item.key || null,
            home: item.home ?? item.homeValue ?? null,
            away: item.away ?? item.awayValue ?? null,
            homeValue: item.homeValue ?? parseNumericValue(item.home),
            awayValue: item.awayValue ?? parseNumericValue(item.away),
            compareCode: item.compareCode ?? null,
            statisticsType: item.statisticsType || null,
            renderType: item.renderType || null
          }))
        })),
        _availablePeriods: raw.statistics.filter(s => s?.period).map(s => s.period)
      };
    }
  }
  
  // Normalize/flatten the data first
  const normalized = raw._flat ? raw : normalizeApiResponse(raw);
  const flat = normalized._flat || normalized;
  
  // Find statistics array
  const statsArrays = deepFindAll(flat, 'statistics', 6);
  let statisticsData = null;
  
  for (const arr of statsArrays) {
    if (Array.isArray(arr) && arr.length > 0 && arr[0].groups) {
      // This is the correct statistics array with groups
      const periodData = arr.find(s => s.period === period) || arr[0];
      if (periodData) {
        statisticsData = periodData;
        break;
      }
    }
  }
  
  if (!statisticsData || !statisticsData.groups) {
    return null;
  }
  
  // Normalize the statistics structure
  return {
    period: statisticsData.period || period,
    groups: statisticsData.groups.map(group => ({
      groupName: group.groupName || 'Unknown',
      items: (group.statisticsItems || []).map(item => ({
        name: item.name || item.key || 'Unknown',
        key: item.key || null,
        home: item.home ?? item.homeValue ?? null,
        away: item.away ?? item.awayValue ?? null,
        homeValue: item.homeValue ?? parseNumericValue(item.home),
        awayValue: item.awayValue ?? parseNumericValue(item.away),
        compareCode: item.compareCode ?? null, // 1 = home better, 2 = away better, 3 = equal
        statisticsType: item.statisticsType || null, // 'positive', 'negative'
        renderType: item.renderType || null
      }))
    })),
    _availablePeriods: statsArrays.flat().filter(s => s?.period).map(s => s.period)
  };
}

/**
 * Get all available statistic periods (ALL, 1, 2, etc.)
 */
export function getAvailableStatPeriods(raw) {
  if (!raw || typeof raw !== 'object') return [];
  
  const normalized = raw._flat ? raw : normalizeApiResponse(raw);
  const flat = normalized._flat || normalized;
  
  const statsArrays = deepFindAll(flat, 'statistics', 6);
  const periods = new Set();
  
  for (const arr of statsArrays) {
    if (Array.isArray(arr)) {
      arr.forEach(s => {
        if (s?.period) periods.add(s.period);
      });
    }
  }
  
  return Array.from(periods);
}

/**
 * Get a flat list of all statistics items across all groups
 */
export function getAllStatItems(raw, period = 'ALL') {
  const stats = extractStatistics(raw, period);
  if (!stats) return [];
  
  return stats.groups.flatMap(g => 
    g.items.map(item => ({
      ...item,
      groupName: g.groupName
    }))
  );
}

// ============================================================================
// TASK 5: Extract Odds and Win Probability
// ============================================================================

/**
 * Extract odds providers information from scraped data
 * 
 * @param {Object} raw - Raw data from scraper
 * @returns {Object|null} Odds information or null
 */
export function extractOddsProviders(raw) {
  if (!raw || typeof raw !== 'object') return null;
  
  const normalized = raw._flat ? raw : normalizeApiResponse(raw);
  const flat = normalized._flat || normalized;
  
  // Look for odds providers
  const providers = deepFind(flat, 'providers', 5);
  
  if (!providers || !Array.isArray(providers)) return null;
  
  return {
    providers: providers.map(p => ({
      name: p.provider?.name || null,
      slug: p.provider?.slug || null,
      country: p.provider?.country || null,
      type: p.type || null,
      betSlipLink: p.betSlipLink || p.defaultBetSlipLink || null
    })).filter(p => p.name),
    count: providers.length
  };
}

/**
 * Extract win probability graph data
 * 
 * @param {Object} raw - Raw data from scraper
 * @returns {Object|null} Win probability data or null
 */
export function extractWinProbability(raw) {
  if (!raw || typeof raw !== 'object') return null;
  
  const normalized = raw._flat ? raw : normalizeApiResponse(raw);
  const flat = normalized._flat || normalized;
  
  // Look for win probability graph
  const graphPoints = deepFind(flat, 'graphPoints', 5);
  const winProbability = deepFind(flat, 'winProbability', 5);
  
  if (graphPoints && Array.isArray(graphPoints)) {
    return {
      type: 'graph',
      points: graphPoints,
      homeWinProb: graphPoints.length > 0 ? graphPoints[graphPoints.length - 1]?.homeWinProbability : null,
      awayWinProb: graphPoints.length > 0 ? graphPoints[graphPoints.length - 1]?.awayWinProbability : null
    };
  }
  
  if (winProbability) {
    return {
      type: 'simple',
      homeWinProb: winProbability.home || winProbability.homeWinProbability || null,
      awayWinProb: winProbability.away || winProbability.awayWinProbability || null
    };
  }
  
  return null;
}

/**
 * Extract Tennis Power Rankings (momentum/dominance graph)
 * Values > 0 = home momentum, < 0 = away momentum
 * 
 * @param {Object} raw - Raw data from scraper
 * @returns {Object|null} Tennis power data or null
 */
export function extractTennisPower(raw) {
  if (!raw || typeof raw !== 'object') return null;
  
  const normalized = raw._flat ? raw : normalizeApiResponse(raw);
  const flat = normalized._flat || normalized;
  
  const rankings = deepFind(flat, 'tennisPowerRankings', 5);
  
  if (!rankings || !Array.isArray(rankings) || rankings.length === 0) return null;
  
  // Organize by set
  const bySet = {};
  let totalHomeAdvantage = 0;
  let breaksHome = 0;
  let breaksAway = 0;
  
  for (const r of rankings) {
    const setNum = r.set || 1;
    if (!bySet[setNum]) bySet[setNum] = [];
    
    bySet[setNum].push({
      game: r.game,
      value: r.value, // positive = home advantage, negative = away
      breakOccurred: r.breakOccurred || false
    });
    
    totalHomeAdvantage += r.value || 0;
    
    if (r.breakOccurred) {
      if (r.value > 0) breaksHome++;
      else breaksAway++;
    }
  }
  
  const lastPoint = rankings[rankings.length - 1];
  
  return {
    rankings,
    bySet,
    summary: {
      totalPoints: rankings.length,
      avgHomeAdvantage: rankings.length > 0 ? totalHomeAdvantage / rankings.length : 0,
      currentMomentum: lastPoint?.value || 0,
      breaksHome,
      breaksAway
    },
    current: lastPoint
  };
}

// Walk an object tree and call cb(node, path)
function walkObject(obj, cb, path = []) {
  if (!obj || typeof obj !== 'object') return;
  cb(obj, path);
  for (const k of Object.keys(obj)) {
    try {
      walkObject(obj[k], cb, path.concat(k));
    } catch (e) {
      // ignore problematic nodes
    }
  }
}

// Extract players / home-away info from arbitrary JSON shapes
export function extractPlayers(raw, queries = []) {
  if (!raw || typeof raw !== 'object') return { events: [], matches: [], home: null, away: null };
  const q = Array.isArray(queries) ? queries.map((s) => String(s).toLowerCase()) : [];

  const events = [];
  const matches = [];

  walkObject(raw, (node, path) => {
    // event-like: homeTeam & awayTeam
    if (
      node &&
      typeof node === 'object' &&
      ('homeTeam' in node || 'home' in node) &&
      ('awayTeam' in node || 'away' in node)
    ) {
      const home = node.homeTeam || node.home || null;
      const away = node.awayTeam || node.away || null;
      events.push({ path: path.join('.'), home, away });
    }

    // potential player object with name/fullName
    const name = node && (node.name || node.fullName);
    if (name) {
      const lower = String(name).toLowerCase();
      const id = node.id || null;
      const snippet = node.shortName || node.slug || '';
      // if queries given, only record matches; otherwise record all
      if (q.length === 0 || q.some((qq) => lower.includes(qq))) {
        matches.push({ path: path.join('.'), name, id, snippet, node });
      }
    }
  });

  // Decide primary home/away
  let primaryHome = null;
  let primaryAway = null;

  if (events.length > 0) {
    primaryHome = events[0].home || null;
    primaryAway = events[0].away || null;
  }

  // if not found by events, try to assign from matches
  if ((!primaryHome || !primaryAway) && matches.length >= 2) {
    // if queries provided and two queries, try to map each
    if (q.length >= 2) {
      const foundA = matches.find((m) => q.some((qq) => String(m.name).toLowerCase().includes(qq)));
      // fallback: first two matches
      primaryHome = matches[0].node || primaryHome;
      primaryAway = matches[1].node || primaryAway;
    } else {
      primaryHome = matches[0].node;
      primaryAway = matches[1].node;
    }
  }

  // if we have queries and one match, try to place it as home or away depending
  if ((!primaryHome || !primaryAway) && q.length >= 1 && matches.length >= 1) {
    // if only one match, attach to home by default
    if (!primaryHome) primaryHome = matches[0].node;
  }

  return { events, matches, home: primaryHome, away: primaryAway };
}

// Find a pointByPoint array in the object tree and return its path and array
export function findPointByPoint(raw) {
  let found = null;
  let foundPath = null;
  walkObject(raw, (node, path) => {
    if (found) return;
    if (node && typeof node === 'object') {
      if (Array.isArray(node.pointByPoint)) {
        found = node.pointByPoint;
        foundPath = path.concat('pointByPoint');
      }
    }
  });
  return { array: found, path: foundPath ? foundPath.join('.') : null };
}

// Extract a concise match summary (players, current point, sets, pointByPoint)
export function extractMatchSummary(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const normalized = normalizeApiResponse(raw);
  const players = extractPlayers(raw, []);

  // find score object with homeScore/awayScore
  let scoreNode = null;
  walkObject(raw, (node) => {
    if (scoreNode) return;
    if (node && typeof node === 'object' && ('homeScore' in node || 'awayScore' in node)) {
      scoreNode = node;
    }
  });

  const homeScore =
    scoreNode && (scoreNode.homeScore || scoreNode.home)
      ? scoreNode.homeScore || scoreNode.home
      : null;
  const awayScore =
    scoreNode && (scoreNode.awayScore || scoreNode.away)
      ? scoreNode.awayScore || scoreNode.away
      : null;

  // build sets arrays from period1/period2/... if present
  const sets = { home: [], away: [] };
  if (homeScore) {
    Object.keys(homeScore).forEach((k) => {
      const m = k.match(/^period(\d+)$/);
      if (m) sets.home[parseInt(m[1], 10) - 1] = homeScore[k];
    });
  }
  if (awayScore) {
    Object.keys(awayScore).forEach((k) => {
      const m = k.match(/^period(\d+)$/);
      if (m) sets.away[parseInt(m[1], 10) - 1] = awayScore[k];
    });
  }

  const pbp = (normalized && normalized.pointByPoint) || findPointByPoint(raw).array || null;

  return {
    eventId: raw.event && raw.event.id ? raw.event.id : raw.id || null,
    home: players.home || normalized.home || null,
    away: players.away || normalized.away || null,
    currentPoint: {
      home:
        homeScore && homeScore.point
          ? homeScore.point
          : homeScore && homeScore.current
          ? homeScore.current
          : null,
      away:
        awayScore && awayScore.point
          ? awayScore.point
          : awayScore && awayScore.current
          ? awayScore.current
          : null,
    },
    sets,
    pointByPoint: pbp,
    pointByPointPath: findPointByPoint(raw).path,
  };
}

// Return the raw pointByPoint array (if any) found in the JSON
export function loadPointByPoint(raw) {
  // First try the new normalized approach
  if (!raw || typeof raw !== 'object') return null;
  
  // PRIORITÀ 1: Se raw.pointByPoint esiste già come array (dati normalizzati dal DB), usalo
  if (Array.isArray(raw.pointByPoint) && raw.pointByPoint.length > 0) {
    console.log('🎯 loadPointByPoint: usando raw.pointByPoint esistente, sets:', raw.pointByPoint.length);
    return raw.pointByPoint.slice();
  }
  
  const normalized = raw._flat ? raw : normalizeApiResponse(raw);
  if (normalized.pointByPoint && Array.isArray(normalized.pointByPoint)) {
    return normalized.pointByPoint.slice();
  }
  
  // Fallback to old method
  const f = findPointByPoint(raw);
  return f.array ? f.array.slice() : null;
}

// ============================================================================
// TASK 4: Normalize Tennis Point-by-Point (improved)
// ============================================================================

/**
 * Convert SofaScore point string to standardized format
 * SofaScore uses: "0", "15", "30", "40", "A" (advantage)
 */
function parsePointString(pt) {
  if (pt === 'A' || pt === 'AD') return 'A';
  const n = parseInt(pt, 10);
  if (!isNaN(n)) return n;
  return pt;
}

/**
 * Normalize tennis point-by-point into a flat sequence of point events with tennis scoring.
 * Works with SofaScore data format where points are strings ("0", "15", "30", "40", "A").
 */
export function normalizeTennisPointByPoint(raw) {
  const pbp = loadPointByPoint(raw);
  if (!pbp || !Array.isArray(pbp)) return { events: [], sets: [], current: null, games: [] };

  const events = [];
  const setsSummary = [];
  const allGames = [];

  for (const setItem of pbp) {
    const setIdx = setItem.set || setsSummary.length + 1;
    let homeGames = 0;
    let awayGames = 0;
    
    if (!Array.isArray(setItem.games)) continue;
    
    for (const game of setItem.games) {
      if (!Array.isArray(game.points)) continue;
      
      const gameData = {
        set: setIdx,
        game: game.game || null,
        serving: game.score?.serving || null, // 1 = home serving, 2 = away serving
        points: [],
        finalScore: game.score || null
      };
      
      let pointIndex = 0;
      let prevHomePoint = '0';
      let prevAwayPoint = '0';
      
      for (const p of game.points) {
        pointIndex++;
        
        const homePoint = parsePointString(p.homePoint);
        const awayPoint = parsePointString(p.awayPoint);
        
        // Determine who won this point based on score progression
        let winner = null;
        
        // Check point types (SofaScore: 1 = winner, 5 = loser typically)
        if (p.homePointType === 1 || p.homePointType === 3) {
          winner = 'home';
        } else if (p.awayPointType === 1 || p.awayPointType === 3) {
          winner = 'away';
        } else {
          // Infer from score change
          const homeProgressed = homePoint !== prevHomePoint && homePoint !== '0';
          const awayProgressed = awayPoint !== prevAwayPoint && awayPoint !== '0';
          if (homeProgressed && !awayProgressed) winner = 'home';
          else if (awayProgressed && !homeProgressed) winner = 'away';
        }
        
        const pointEvent = {
          set: setIdx,
          game: game.game || null,
          pointIndex,
          winner,
          homePoint,
          awayPoint,
          scoreBefore: `${prevHomePoint}-${prevAwayPoint}`,
          scoreAfter: `${homePoint}-${awayPoint}`,
          homePointType: p.homePointType || null,
          awayPointType: p.awayPointType || null,
          description: p.pointDescription || null,
          serving: game.score?.serving || null
        };
        
        events.push(pointEvent);
        gameData.points.push(pointEvent);
        
        prevHomePoint = homePoint;
        prevAwayPoint = awayPoint;
      }
      
      // Determine game winner from final game score
      if (game.score) {
        const finalHomeGames = game.score.homeScore;
        const finalAwayGames = game.score.awayScore;
        if (game.score.scoring === 1) {
          homeGames = finalHomeGames;
          awayGames = finalAwayGames;
        } else if (game.score.scoring === 2) {
          homeGames = finalHomeGames;
          awayGames = finalAwayGames;
        }
      }
      
      allGames.push(gameData);
    }
    
    // Use final game score if available, otherwise count
    const lastGame = setItem.games[0]; // Games are in reverse order typically
    if (lastGame?.score) {
      setsSummary.push({ 
        set: setIdx, 
        homeGames: lastGame.score.homeScore || homeGames, 
        awayGames: lastGame.score.awayScore || awayGames 
      });
    } else {
      setsSummary.push({ set: setIdx, homeGames, awayGames });
    }
  }

  const current = events.length ? events[events.length - 1] : null;
  
  return { 
    events, 
    sets: setsSummary, 
    current,
    games: allGames,
    totalPoints: events.length
  };
}

// Calculate a completeness/score value based on which link fields are filled
// linkFields: an object with key -> value (e.g. parsed query params)
// options:
//   - weights: { fieldName: number } custom weight per field
//   - important: array of field names to evaluate (defaults to Object.keys(linkFields))
// Returns: { score, maxScore, completeness } where completeness is in [0..1]
export function calculateScoreFromLink(linkFields = {}, options = {}) {
  if (!linkFields || typeof linkFields !== 'object')
    return { score: 0, maxScore: 0, completeness: 0 };

  const keys =
    Array.isArray(options.important) && options.important.length > 0
      ? options.important
      : Object.keys(linkFields);

  const weights = options.weights || {};

  // default important fields get extra weight if not explicitly overridden
  const defaultImportant = options.defaultImportant || [
    'eventId',
    'home',
    'away',
    'matchId',
    'sets',
  ];

  let score = 0;
  let maxScore = 0;
  let filled = 0;

  for (const k of keys) {
    let w = Number(weights[k] ?? null);
    if (!isFinite(w)) {
      w = defaultImportant.includes(k) ? 2 : 1;
    }
    maxScore += w;

    const v = linkFields[k];
    const hasValue = v !== undefined && v !== null && String(v).trim() !== '';
    if (hasValue) {
      score += w;
      filled += 1;
    }
  }

  const completeness = keys.length > 0 ? filled / keys.length : 0;
  return { score, maxScore, completeness };
}

// ============================================================================
// STRATEGIE DI TRADING TENNIS - Analisi automatica
// ============================================================================

// Soglie empiriche per pressione al servizio
const PRESSURE_THRESHOLDS = {
  doubleFaults: { normal: 2, warning: 4, critical: 6 },
  firstServeWonPct: { excellent: 75, good: 65, warning: 55, critical: 45 },
  secondServeWonPct: { excellent: 55, good: 45, warning: 35, critical: 25 },
  breakPointsSavedPct: { excellent: 70, good: 55, warning: 40, critical: 30 }
};

// Soglie per superficie (comeback rate empirici)
const SURFACE_COMEBACK_RATES = {
  'Hard': 0.22,
  'Clay': 0.28,     // Più rimonte su terra rossa
  'Grass': 0.18,    // Meno rimonte su erba (più veloce)
  'Carpet': 0.20,
  'default': 0.22
};

/**
 * Estrae statistiche chiave dal match per le strategie
 * @param {Object} data - Dati del match
 * @returns {Object} Statistiche estratte
 */
export function extractKeyStats(data) {
  const stats = extractStatistics(data, 'ALL');
  if (!stats) return null;
  
  const result = {
    home: {},
    away: {}
  };
  
  for (const group of stats.groups || []) {
    for (const item of group.items || []) {
      const key = item.key || item.name?.toLowerCase().replace(/\s+/g, '_');
      
      // Parse percentages from strings like "82/128 (64%)"
      const parseStatValue = (val) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const pctMatch = val.match(/\((\d+)%\)/);
          if (pctMatch) return parseInt(pctMatch[1]);
          const numMatch = val.match(/^(\d+)/);
          if (numMatch) return parseInt(numMatch[1]);
        }
        return null;
      };
      
      if (key?.includes('aces') || key === 'aces') {
        result.home.aces = parseStatValue(item.home);
        result.away.aces = parseStatValue(item.away);
      }
      if (key?.includes('double') || key?.includes('faults')) {
        result.home.doubleFaults = parseStatValue(item.home);
        result.away.doubleFaults = parseStatValue(item.away);
      }
      if (key?.includes('first_serve') && key?.includes('points') || key?.includes('firstServePoints')) {
        result.home.firstServeWonPct = parseStatValue(item.home);
        result.away.firstServeWonPct = parseStatValue(item.away);
      }
      if (key?.includes('second_serve') && key?.includes('points') || key?.includes('secondServePoints')) {
        result.home.secondServeWonPct = parseStatValue(item.home);
        result.away.secondServeWonPct = parseStatValue(item.away);
      }
      if (key?.includes('break') && key?.includes('saved') || key?.includes('breakPointsSaved')) {
        result.home.breakPointsSavedPct = parseStatValue(item.home);
        result.away.breakPointsSavedPct = parseStatValue(item.away);
      }
      if (key?.includes('break') && key?.includes('converted') || key?.includes('breakPointsScored')) {
        result.home.breakPointsConverted = parseStatValue(item.home);
        result.away.breakPointsConverted = parseStatValue(item.away);
      }
      if (key?.includes('total') && group.groupName?.includes('Points') || key === 'pointsTotal') {
        result.home.totalPoints = parseStatValue(item.home);
        result.away.totalPoints = parseStatValue(item.away);
      }
    }
  }
  
  return result;
}

/**
 * Calcola il Pressure Index per un giocatore basato sulle statistiche
 * 
 * @deprecated PREFERIRE usare i valori pre-calcolati dal MatchBundle:
 *   bundle.header.features.pressure (0-100)
 *   bundle.header.features.pressureSource ('statistics' | 'score' | 'estimated')
 * Questa funzione rimane per retrocompatibilità con codice legacy.
 * Vedi: docs/filosofie/FILOSOFIA_CALCOLI_V1.md sezione "Pressure & Clutch".
 * 
 * @param {Object} playerStats - Statistiche del giocatore
 * @returns {Object} Pressure index e breakdown
 */
export function calculatePressureIndex(playerStats) {
  if (!playerStats) return { value: 0, level: 'UNKNOWN', breakdown: {} };
  
  let pressureIndex = 0;
  const breakdown = {};
  
  // Double Faults (peso: 25%)
  const df = playerStats.doubleFaults || 0;
  if (df >= PRESSURE_THRESHOLDS.doubleFaults.critical) {
    pressureIndex += 25;
    breakdown.doubleFaults = 'CRITICAL';
  } else if (df >= PRESSURE_THRESHOLDS.doubleFaults.warning) {
    pressureIndex += 15;
    breakdown.doubleFaults = 'WARNING';
  } else if (df >= PRESSURE_THRESHOLDS.doubleFaults.normal) {
    pressureIndex += 5;
    breakdown.doubleFaults = 'NORMAL';
  } else {
    breakdown.doubleFaults = 'LOW';
  }
  
  // First Serve Won % (peso: 30%)
  const fsw = playerStats.firstServeWonPct;
  if (fsw !== null && fsw !== undefined) {
    if (fsw < PRESSURE_THRESHOLDS.firstServeWonPct.critical) {
      pressureIndex += 30;
      breakdown.firstServe = 'CRITICAL';
    } else if (fsw < PRESSURE_THRESHOLDS.firstServeWonPct.warning) {
      pressureIndex += 20;
      breakdown.firstServe = 'WARNING';
    } else if (fsw < PRESSURE_THRESHOLDS.firstServeWonPct.good) {
      pressureIndex += 10;
      breakdown.firstServe = 'MODERATE';
    } else {
      breakdown.firstServe = 'GOOD';
    }
  }
  
  // Second Serve Won % (peso: 25%)
  const ssw = playerStats.secondServeWonPct;
  if (ssw !== null && ssw !== undefined) {
    if (ssw < PRESSURE_THRESHOLDS.secondServeWonPct.critical) {
      pressureIndex += 25;
      breakdown.secondServe = 'CRITICAL';
    } else if (ssw < PRESSURE_THRESHOLDS.secondServeWonPct.warning) {
      pressureIndex += 15;
      breakdown.secondServe = 'WARNING';
    } else if (ssw < PRESSURE_THRESHOLDS.secondServeWonPct.good) {
      pressureIndex += 8;
      breakdown.secondServe = 'MODERATE';
    } else {
      breakdown.secondServe = 'GOOD';
    }
  }
  
  // Break Points Saved % (peso: 20%)
  const bps = playerStats.breakPointsSavedPct;
  if (bps !== null && bps !== undefined) {
    if (bps < PRESSURE_THRESHOLDS.breakPointsSavedPct.critical) {
      pressureIndex += 20;
      breakdown.breakPointsSaved = 'CRITICAL';
    } else if (bps < PRESSURE_THRESHOLDS.breakPointsSavedPct.warning) {
      pressureIndex += 12;
      breakdown.breakPointsSaved = 'WARNING';
    } else if (bps < PRESSURE_THRESHOLDS.breakPointsSavedPct.good) {
      pressureIndex += 5;
      breakdown.breakPointsSaved = 'MODERATE';
    } else {
      breakdown.breakPointsSaved = 'GOOD';
    }
  }
  
  // Classify pressure level
  let level;
  if (pressureIndex >= 70) level = 'CRITICAL';
  else if (pressureIndex >= 50) level = 'HIGH';
  else if (pressureIndex >= 30) level = 'MODERATE';
  else if (pressureIndex >= 15) level = 'LOW';
  else level = 'MINIMAL';
  
  return { value: pressureIndex, level, breakdown };
}

/**
 * Analizza la strategia "Lay the Winner"
 * Si banca il tennista che ha vinto il primo set
 * POTENZIATA: include superficie, formato, momentum, statistiche servizio
 * @param {Object} data - Dati grezzi del match
 * @returns {Object} Analisi della strategia
 */
export function analyzeLayTheWinner(data) {
  const eventInfo = extractEventInfo(data);
  const pbp = loadPointByPoint(data);
  const keyStats = extractKeyStats(data);
  // Cerca sia tennisPowerRankings che powerRankings (per dati SVG)
  let powerRankings = deepFindAll(data, 'tennisPowerRankings', 5).flat().filter(Boolean);
  if (!powerRankings || powerRankings.length === 0) {
    powerRankings = deepFindAll(data, 'powerRankings', 5).flat().filter(Boolean);
  }
  
  const result = {
    applicable: false,
    signal: 'none', // 'none', 'weak', 'medium', 'strong'
    message: '',
    details: {},
    recommendation: '',
    // NUOVI campi potenziati
    confidence: 0,
    factors: {}
  };
  
  if (!eventInfo) {
    result.message = 'Dati match non disponibili';
    return result;
  }
  
  // Estrai info superficie e formato (controlla più campi possibili)
  let surface = data.surface || eventInfo.surface || data.tournament_ground || 'Unknown';
  // Normalizza superficie da tournament_ground (es: "Hardcourt indoor" -> "Hard")
  if (surface.toLowerCase().includes('hard')) surface = 'Hard';
  else if (surface.toLowerCase().includes('clay') || surface.toLowerCase().includes('terra')) surface = 'Clay';
  else if (surface.toLowerCase().includes('grass') || surface.toLowerCase().includes('erba')) surface = 'Grass';
  else if (surface.toLowerCase().includes('carpet')) surface = 'Carpet';
  
  const bestOf = data.best_of || eventInfo.bestOf || 3;
  const comebackBaseRate = SURFACE_COMEBACK_RATES[surface] || SURFACE_COMEBACK_RATES.default;
  
  // Bonus formato: +40% per Grand Slam (Bo5)
  const formatMultiplier = bestOf === 5 ? 1.4 : 1.0;
  const adjustedComebackRate = comebackBaseRate * formatMultiplier;
  
  result.details.surface = surface;
  result.details.bestOf = bestOf;
  result.details.comebackRate = Math.round(adjustedComebackRate * 100);
  
  const homeScore = eventInfo.homeScore;
  const awayScore = eventInfo.awayScore;
  
  if (!homeScore?.sets?.length || !awayScore?.sets?.length) {
    result.message = 'In attesa del primo set';
    return result;
  }
  
  // Calcola i set vinti
  let homeSetsWon = 0;
  let awaySetsWon = 0;
  
  for (let i = 0; i < homeScore.sets.length; i++) {
    const hGames = homeScore.sets[i]?.games ?? 0;
    const aGames = awayScore.sets[i]?.games ?? 0;
    if (hGames > aGames) homeSetsWon++;
    else if (aGames > hGames) awaySetsWon++;
  }
  
  result.details.homeSetsWon = homeSetsWon;
  result.details.awaySetsWon = awaySetsWon;
  result.details.totalSets = homeScore.sets.length;
  result.details.homeName = eventInfo.home?.name || 'Home';
  result.details.awayName = eventInfo.away?.name || 'Away';
  
  // Determina chi ha vinto il primo set
  const firstSetHome = homeScore.sets[0]?.games ?? 0;
  const firstSetAway = awayScore.sets[0]?.games ?? 0;
  
  if (firstSetHome === firstSetAway || (firstSetHome < 6 && firstSetAway < 6)) {
    result.message = 'Primo set non ancora concluso';
    return result;
  }
  
  const firstSetWinner = firstSetHome > firstSetAway ? 'home' : 'away';
  result.details.firstSetWinner = firstSetWinner;
  result.details.firstSetWinnerName = firstSetWinner === 'home' 
    ? result.details.homeName 
    : result.details.awayName;
  
  // Controlla se siamo nel secondo set
  const currentSet = homeScore.sets.length;
  
  if (currentSet === 1) {
    result.message = 'Primo set appena concluso - ATTENDERE secondo set';
    result.applicable = true;
    result.signal = 'weak';
    result.recommendation = `Preparati a bancare ${result.details.firstSetWinnerName} all'inizio del secondo set`;
    return result;
  }
  
  if (currentSet >= 2) {
    result.applicable = true;
    
    // Analizza il secondo set per break points
    const secondSetHome = homeScore.sets[1]?.games ?? 0;
    const secondSetAway = awayScore.sets[1]?.games ?? 0;
    
    result.details.secondSetScore = `${secondSetHome}-${secondSetAway}`;
    
    // Chi sta perdendo il secondo set potrebbe recuperare
    const loserFirstSet = firstSetWinner === 'home' ? 'away' : 'home';
    const loserName = loserFirstSet === 'home' ? result.details.homeName : result.details.awayName;
    const loserSecondSetGames = loserFirstSet === 'home' ? secondSetHome : secondSetAway;
    const winnerSecondSetGames = loserFirstSet === 'home' ? secondSetAway : secondSetHome;
    
    if (loserSecondSetGames >= winnerSecondSetGames) {
      result.signal = 'strong';
      result.message = `${loserName} sta recuperando nel 2° set!`;
      result.recommendation = `BANCA ${result.details.firstSetWinnerName} - Il perdente del 1° set sta reagendo`;
      result.confidence = 75;
    } else if (winnerSecondSetGames - loserSecondSetGames <= 1) {
      result.signal = 'medium';
      result.message = `Secondo set equilibrato (${secondSetHome}-${secondSetAway})`;
      result.recommendation = `Monitora break points per bancare ${result.details.firstSetWinnerName}`;
      result.confidence = 55;
    } else {
      result.signal = 'weak';
      result.message = `${result.details.firstSetWinnerName} sta dominando anche il 2° set`;
      result.recommendation = 'Strategia meno favorevole - il vincitore 1° set continua a dominare';
      result.confidence = 25;
    }
    
    // POTENZIAMENTO: Analizza momentum per conferma
    if (powerRankings && powerRankings.length > 0) {
      const recentMomentum = powerRankings.slice(-5);
      const avgRecent = recentMomentum.reduce((a, b) => {
        // Usa raw_v se disponibile (dati SVG), altrimenti value (API)
        // raw_v è solitamente assoluto, quindi applichiamo il segno di value
        const val = (b.raw_v !== undefined) 
          ? (b.value >= 0 ? b.raw_v : -b.raw_v) 
          : (b.value || 0);
        return a + val;
      }, 0) / recentMomentum.length;
      
      // Se il loser del primo set ha momentum positivo, aumenta confidence
      // Soglia ridotta a 5 per raw_v che potrebbe avere scala diversa
      const threshold = recentMomentum.some(r => r.raw_v !== undefined) ? 5 : 10;
      
      const loserMomentumPositive = (loserFirstSet === 'home' && avgRecent > threshold) || 
                                    (loserFirstSet === 'away' && avgRecent < -threshold);
      
      if (loserMomentumPositive) {
        result.confidence = Math.min(95, result.confidence + 15);
        result.factors.momentum = 'FAVORABLE';
        result.details.recentMomentum = Math.round(avgRecent);
      } else {
        result.factors.momentum = 'NEUTRAL';
      }
    }
    
    // POTENZIAMENTO: Analizza statistiche servizio del vincitore set 1
    if (keyStats) {
      const winnerStats = firstSetWinner === 'home' ? keyStats.home : keyStats.away;
      const loserStats = firstSetWinner === 'home' ? keyStats.away : keyStats.home;
      
      // Se il vincitore ha statistiche servizio in calo, aumenta confidence
      if (winnerStats.firstServeWonPct && winnerStats.firstServeWonPct < 60) {
        result.confidence = Math.min(95, result.confidence + 10);
        result.factors.winnerServe = 'DECLINING';
        result.details.winnerFirstServe = winnerStats.firstServeWonPct;
      }
      
      // Se il perdente ha buone statistiche servizio, è resiliente
      if (loserStats.firstServeWonPct && loserStats.firstServeWonPct > 65) {
        result.confidence = Math.min(95, result.confidence + 5);
        result.factors.loserServe = 'SOLID';
        result.details.loserFirstServe = loserStats.firstServeWonPct;
      }
      
      // Doppi falli del vincitore
      if (winnerStats.doubleFaults && winnerStats.doubleFaults >= 4) {
        result.confidence = Math.min(95, result.confidence + 5);
        result.factors.doubleFaults = 'HIGH';
        result.details.winnerDoubleFaults = winnerStats.doubleFaults;
      }
    }
    
    // Aggiungi fattori superficie e formato
    result.factors.surface = surface;
    result.factors.format = bestOf === 5 ? 'Grand Slam (Bo5)' : 'Standard (Bo3)';
    result.factors.baseComeback = `${Math.round(comebackBaseRate * 100)}%`;
    
    // POTENZIAMENTO HPI + RESILIENCE: Analizza capacità di recupero del perdente
    try {
      const loserHPI = calculateHPI(data, loserFirstSet);
      const loserResilience = calculateBreakResilience(data, loserFirstSet);
      const winnerHPI = calculateHPI(data, firstSetWinner);
      
      // Se il perdente è resiliente e tiene bene sotto pressione
      if (loserResilience.level === 'RESILIENT' || loserResilience.level === 'SOLID') {
        result.confidence = Math.min(95, result.confidence + 10);
        result.factors.loserResilience = loserResilience.level;
        result.details.loserResilienceValue = loserResilience.value;
      }
      
      // Se il perdente ha buon HPI (tiene servizio sotto pressione)
      if (loserHPI.level === 'ELITE' || loserHPI.level === 'STRONG') {
        result.confidence = Math.min(95, result.confidence + 8);
        result.factors.loserHPI = loserHPI.level;
        result.details.loserHPIValue = loserHPI.value;
      }
      
      // Se il vincitore ha basso HPI (fragile sotto pressione) → più probabile il comeback
      if (winnerHPI.level === 'VULNERABLE' || winnerHPI.level === 'WEAK') {
        result.confidence = Math.min(95, result.confidence + 12);
        result.factors.winnerHPI = winnerHPI.level;
        result.details.winnerHPIValue = winnerHPI.value;
        result.message += ' | ⚠️ Winner fragile sotto pressione';
      }
    } catch (e) {
      // HPI/Resilience non disponibili - continua senza
    }
  }
  
  return result;
}

/**
 * Analizza la strategia "Banca Servizio"
 * Si banca chi serve quando è sotto pressione
 * POTENZIATA: include PRESSURE_INDEX basato su statistiche reali
 * @param {Object} data - Dati grezzi del match
 * @returns {Object} Analisi della strategia
 */
export function analyzeBancaServizio(data) {
  const eventInfo = extractEventInfo(data);
  // Cerca sia tennisPowerRankings che powerRankings (per dati SVG)
  let powerRankings = deepFindAll(data, 'tennisPowerRankings', 5).flat().filter(Boolean);
  if (!powerRankings || powerRankings.length === 0) {
    powerRankings = deepFindAll(data, 'powerRankings', 5).flat().filter(Boolean);
  }
  const keyStats = extractKeyStats(data);
  
  const result = {
    applicable: false,
    signal: 'none',
    message: '',
    details: {},
    recommendation: '',
    // NUOVI campi potenziati
    pressureIndex: null,
    confidence: 0
  };
  
  if (!eventInfo) {
    result.message = 'Dati match non disponibili';
    return result;
  }
  
  result.details.homeName = eventInfo.home?.name || 'Home';
  result.details.awayName = eventInfo.away?.name || 'Away';

  // Try to use normalized point-by-point for consistent scoring
  const normalizedPbp = normalizeTennisPointByPoint(data);
  const current = normalizedPbp && normalizedPbp.current ? normalizedPbp.current : null;

  if (!current) {
    // Fallback: no pbp
    result.message = 'Dati point-by-point non disponibili';
    return result;
  }

  // Determine serving and server name
  const serving = current.serving || null; // 1 = home, 2 = away
  const serverName = serving === 1 ? result.details.homeName : result.details.awayName;
  result.details.serving = serving;
  result.details.serverName = serverName;

  // current.scoreAfter is like '40-15' or '30-30' or 'A-40'
  const scoreAfter = current.scoreAfter || current.score || `${current.homePoint}-${current.awayPoint}`;
  const [homeStr = '0', awayStr = '0'] = String(scoreAfter).split('-');

  const toValue = (s) => {
    if (s === 'A' || s === 'AD') return 50;
    const n = parseInt(s, 10);
    if (!isNaN(n)) return n;
    if (s === '40') return 40;
    if (s === '30') return 30;
    if (s === '15') return 15;
    return 0;
  };

  const serverPoint = serving === 1 ? homeStr : awayStr;
  const receiverPoint = serving === 1 ? awayStr : homeStr;

  const serverVal = toValue(serverPoint);
  const receiverVal = toValue(receiverPoint);

  result.details.currentGameScore = `${homeStr}-${awayStr}`;
  result.applicable = true;
  result.details.serverPoint = serverPoint;
  result.details.receiverPoint = receiverPoint;

  // BREAK conditions: receiver at 40 and server below 40, or receiver advantage
  if ((receiverVal === 40 && serverVal < 40) || (receiverVal >= 50 && serverVal < receiverVal)) {
    result.signal = 'strong';
    result.message = `🚨 BREAK POINT! ${serverName} è in pericolo`;
    result.recommendation = `BANCA ${serverName} ADESSO - Palla break in corso!`;
    return result;
  }

  // High pressure but not immediate break
  if (receiverVal >= 30 && serverVal <= 15) {
    result.signal = 'strong';
    result.message = `${serverName} sotto pressione (${serverPoint}-${receiverPoint})`;
    result.recommendation = `BANCA ${serverName} - Situazione critica al servizio`;
    return result;
  }

  if (receiverVal === 30 && serverVal === 30) {
    result.signal = 'medium';
    result.message = `Game equilibrato (30-30) - ${serverName} al servizio`;
    result.recommendation = `Prepara banca ${serverName} se perde il prossimo punto`;
    return result;
  }

  if (serverVal > receiverVal) {
    result.signal = 'weak';
    result.message = `${serverName} in controllo del game (${serverPoint}-${receiverPoint})`;
    result.recommendation = 'Server in controllo - attendere momento di pressione';
    return result;
  }

  // POTENZIAMENTO: Calcola Pressure Index dal server
  if (keyStats) {
    const serverStats = serving === 1 ? keyStats.home : keyStats.away;
    const pressureData = calculatePressureIndex(serverStats);
    result.pressureIndex = pressureData;
    result.details.serverStats = serverStats;
    
    // Mostra breakdown pressure
    if (pressureData.level === 'CRITICAL' || pressureData.level === 'HIGH') {
      if (result.signal === 'weak' || result.signal === 'none') {
        result.signal = 'medium';
      }
      result.message += ` | ⚠️ Pressure Index: ${pressureData.value}/100 (${pressureData.level})`;
      result.confidence = Math.min(85, 50 + pressureData.value / 2);
    } else if (pressureData.level === 'MODERATE') {
      result.confidence = 40;
    } else {
      result.confidence = 25;
    }
    
    // Dettagli statistici
    if (serverStats.doubleFaults) {
      result.details.doubleFaults = serverStats.doubleFaults;
    }
    if (serverStats.firstServeWonPct) {
      result.details.firstServeWonPct = serverStats.firstServeWonPct;
    }
    if (serverStats.breakPointsSavedPct) {
      result.details.breakPointsSavedPct = serverStats.breakPointsSavedPct;
    }
  }

  // Analizza momentum se disponibile
  if (powerRankings.length > 0) {
    const lastMomentum = powerRankings[powerRankings.length - 1];
    // Usa raw_v se disponibile, altrimenti value
    const val = (lastMomentum.raw_v !== undefined) 
      ? (lastMomentum.value >= 0 ? lastMomentum.raw_v : -lastMomentum.raw_v) 
      : (lastMomentum.value || 0);
      
    if (val !== 0) {
      // Se il server ha momentum negativo, aumenta il segnale
      // Soglia 15 per value (scala 100), ridotta a 5 per raw_v
      const threshold = lastMomentum.raw_v !== undefined ? 5 : 15;
      
      const serverMomentumBad = (serving === 1 && val < -threshold) ||
                                (serving === 2 && val > threshold);
                                
      if (serverMomentumBad) {
        result.signal = result.signal === 'weak' ? 'medium' : result.signal;
        result.confidence = Math.min(95, result.confidence + 10);
      }
      result.details.momentum = val;
      result.message += ` | Momentum: ${val > 0 ? '+' : ''}${val}`;
    }
  }

  // POTENZIAMENTO HPI: Analizza Hold Pressure Index del server
  try {
    const serverSide = serving === 1 ? 'home' : 'away';
    const serverHPI = calculateHPI(data, serverSide);
    const serverResilience = calculateBreakResilience(data, serverSide);
    
    result.details.serverHPI = serverHPI.value;
    result.details.serverHPILevel = serverHPI.level;
    
    // Se il server ha HPI basso → più probabile che ceda
    if (serverHPI.level === 'VULNERABLE' || serverHPI.level === 'WEAK') {
      result.signal = result.signal === 'weak' ? 'medium' : 
                      result.signal === 'medium' ? 'strong' : result.signal;
      result.confidence = Math.min(95, result.confidence + 15);
      result.factors = result.factors || {};
      result.factors.serverHPI = serverHPI.level;
      result.message += ` | 🎯 HPI Basso: ${serverHPI.value}%`;
    }
    
    // Se il server ha bassa resilienza → fragile mentalmente
    if (serverResilience.level === 'FRAGILE' || serverResilience.level === 'BRITTLE') {
      result.confidence = Math.min(95, result.confidence + 10);
      result.factors = result.factors || {};
      result.factors.serverResilience = serverResilience.level;
    }
  } catch (e) {
    // HPI non disponibile - continua senza
  }

  return result;
}

/**
 * Analizza la strategia "Super Break"
 * Puntare favorito dominante aspettando break point
 * POTENZIATA: include volatilità, elasticity, analisi dominio completa
 * @param {Object} data - Dati grezzi del match
 * @returns {Object} Analisi della strategia
 */
export function analyzeSuperBreak(data) {
  const eventInfo = extractEventInfo(data);
  const pbp = loadPointByPoint(data);
  // Cerca sia tennisPowerRankings che powerRankings (per dati SVG)
  let powerRankings = deepFindAll(data, 'tennisPowerRankings', 5).flat().filter(Boolean);
  if (!powerRankings || powerRankings.length === 0) {
    powerRankings = deepFindAll(data, 'powerRankings', 5).flat().filter(Boolean);
  }
  const keyStats = extractKeyStats(data);
  
  const result = {
    applicable: false,
    signal: 'none',
    message: '',
    details: {},
    recommendation: '',
    // NUOVI campi potenziati
    confidence: 0,
    dominanceScore: 0,
    matchCharacter: null
  };
  
  if (!eventInfo) {
    result.message = 'Dati match non disponibili';
    return result;
  }
  
  result.details.homeName = eventInfo.home?.name || 'Home';
  result.details.awayName = eventInfo.away?.name || 'Away';
  
  // Cerca ranking per determinare il favorito
  const homeRanking = eventInfo.home?.ranking;
  const awayRanking = eventInfo.away?.ranking;
  
  let favorito = null;
  let sfavorito = null;
  
  if (homeRanking && awayRanking) {
    if (homeRanking < awayRanking) {
      favorito = { side: 'home', name: result.details.homeName, ranking: homeRanking };
      sfavorito = { side: 'away', name: result.details.awayName, ranking: awayRanking };
    } else {
      favorito = { side: 'away', name: result.details.awayName, ranking: awayRanking };
      sfavorito = { side: 'home', name: result.details.homeName, ranking: homeRanking };
    }
    result.details.favorito = favorito;
    result.details.sfavorito = sfavorito;
    result.details.rankingGap = Math.abs(homeRanking - awayRanking);
  } else {
    result.message = 'Ranking non disponibile per determinare favorito';
    result.applicable = true;
    result.signal = 'weak';
    return result;
  }
  
  if (!pbp || pbp.length === 0) {
    result.message = `Favorito: ${favorito.name} (#${favorito.ranking})`;
    result.applicable = true;
    result.signal = 'weak';
    result.recommendation = 'In attesa dati point-by-point';
    return result;
  }
  
  result.applicable = true;
  
  // Calcola break totali
  let homeBreaks = 0;
  let awayBreaks = 0;
  let totalGames = 0;
  
  for (const set of pbp) {
    if (!set.games) continue;
    for (const game of set.games) {
      totalGames++;
      const serving = game.score?.serving;
      const scoring = game.score?.scoring;
      
      // Se chi ha vinto il game non è chi serviva -> break
      if (serving && scoring && serving !== scoring) {
        if (scoring === 1) homeBreaks++;
        else awayBreaks++;
      }
    }
  }
  
  result.details.homeBreaks = homeBreaks;
  result.details.awayBreaks = awayBreaks;
  result.details.totalGames = totalGames;
  
  const favoritoBreaks = favorito.side === 'home' ? homeBreaks : awayBreaks;
  const sfavoritoBreaks = favorito.side === 'home' ? awayBreaks : homeBreaks;
  
  // Analizza momentum per vedere se favorito domina
  let avgMomentum = 0;
  let dominantGames = 0;
  
  if (powerRankings.length > 0) {
    const sum = powerRankings.reduce((a, b) => {
      const val = (b.raw_v !== undefined) 
        ? (b.value >= 0 ? b.raw_v : -b.raw_v) 
        : (b.value || 0);
      return a + val;
    }, 0);
    avgMomentum = Math.round(sum / powerRankings.length);
    
    // Per dominantGames, se abbiamo raw_v usiamo soglia più bassa (es. 15)
    // altrimenti usiamo value > 60 (scala 0-100)
    dominantGames = powerRankings.filter(p => {
      if (p.raw_v !== undefined) return p.raw_v > 15;
      return (p.value || 0) > 60;
    }).length;
    
    result.details.avgMomentum = avgMomentum;
    result.details.dominantGames = dominantGames;
  }
  
  // Valuta segnale
  const breakRatio = totalGames > 0 ? ((homeBreaks + awayBreaks) / totalGames * 100).toFixed(0) : 0;
  result.details.breakRatio = breakRatio;
  
  // Check if we're in a potential break point situation
  const lastSet = pbp[pbp.length - 1];
  const lastGame = lastSet?.games?.[0];
  const serving = lastGame?.score?.serving;
  const lastPoint = lastGame?.points?.[lastGame.points.length - 1];
  
  // Favorito sta dominando?
  if (favoritoBreaks > sfavoritoBreaks || dominantGames >= 3) {
    result.signal = 'strong';
    result.message = `${favorito.name} sta dominando! (${favoritoBreaks} break, ${dominantGames} game dominanti)`;
    
    // Check if sfavorito is serving
    if (serving && ((favorito.side === 'home' && serving === 2) || (favorito.side === 'away' && serving === 1))) {
      result.recommendation = `PUNTA ${favorito.name} - ${sfavorito.name} al servizio, aspetta break point per bancare`;
    } else {
      result.recommendation = `${favorito.name} al servizio - Attendi turno servizio ${sfavorito.name}`;
    }
  } else if (favoritoBreaks === sfavoritoBreaks && avgMomentum > 20) {
    result.signal = 'medium';
    result.message = `Match equilibrato ma momentum positivo (${avgMomentum})`;
    result.recommendation = `Monitora ${favorito.name} per opportunità Super Break`;
  } else {
    result.signal = 'weak';
    result.message = `${favorito.name} non sta dominando - Break ratio: ${breakRatio}%`;
    result.recommendation = 'Attendere dominio chiaro del favorito al servizio';
  }
  
  // Warning per tie-break
  const homeScore = eventInfo.homeScore;
  const awayScore = eventInfo.awayScore;
  if (homeScore?.sets?.length > 0) {
    const lastSetIdx = homeScore.sets.length - 1;
    const hGames = homeScore.sets[lastSetIdx]?.games ?? 0;
    const aGames = awayScore.sets?.[lastSetIdx]?.games ?? 0;
    
    if (hGames >= 6 && aGames >= 6) {
      result.signal = 'weak';
      result.message = '⚠️ TIE-BREAK in corso - ESCI dalla strategia!';
      result.recommendation = 'Super Break non applicabile durante tie-break';
      result.confidence = 10;
      return result;
    }
  }
  
  // POTENZIAMENTO: Calcola volatilità e carattere match
  if (powerRankings.length >= 5) {
    const volatilityData = calculateVolatility(powerRankings);
    const elasticityData = calculateElasticity(powerRankings);
    
    result.details.volatility = volatilityData.class;
    result.details.volatilityValue = volatilityData.value;
    result.details.elasticity = elasticityData.class;
    
    // Classifica il carattere del match
    const character = classifyMatchCharacter(volatilityData, elasticityData, homeBreaks + awayBreaks);
    result.matchCharacter = character;
    
    // Aggiusta confidence basata sul carattere match
    if (character.character === 'DOMINIO') {
      result.confidence = Math.min(95, result.confidence + 20);
    } else if (character.character === 'BATTAGLIA_EMOTIVA') {
      result.confidence = Math.max(20, result.confidence - 10);
      result.message += ' | ⚡ Match molto volatile';
    } else if (character.character === 'RIMONTE_FREQUENTI') {
      result.confidence = Math.max(30, result.confidence - 5);
    }
  }
  
  // POTENZIAMENTO: Analizza statistiche per conferma dominio
  if (keyStats) {
    const favoritoStats = favorito.side === 'home' ? keyStats.home : keyStats.away;
    const sfavoritoStats = favorito.side === 'home' ? keyStats.away : keyStats.home;
    
    // Calcola dominance score (0-100)
    let dominanceScore = 50; // base
    
    // Aces advantage
    if (favoritoStats.aces && sfavoritoStats.aces) {
      const acesAdv = favoritoStats.aces - sfavoritoStats.aces;
      dominanceScore += Math.min(10, acesAdv * 2);
      result.details.acesAdvantage = acesAdv;
    }
    
    // First serve superiority
    if (favoritoStats.firstServeWonPct && sfavoritoStats.firstServeWonPct) {
      const serveAdv = favoritoStats.firstServeWonPct - sfavoritoStats.firstServeWonPct;
      dominanceScore += Math.min(15, serveAdv / 2);
      result.details.serveAdvantage = Math.round(serveAdv);
    }
    
    // Break points converted advantage
    if (favoritoStats.breakPointsConverted && sfavoritoStats.breakPointsConverted) {
      const bpAdv = favoritoStats.breakPointsConverted - sfavoritoStats.breakPointsConverted;
      dominanceScore += Math.min(15, bpAdv * 5);
    }
    
    // Total points advantage
    if (favoritoStats.totalPoints && sfavoritoStats.totalPoints) {
      const totalAdv = favoritoStats.totalPoints - sfavoritoStats.totalPoints;
      dominanceScore += Math.min(10, totalAdv / 2);
      result.details.pointsAdvantage = totalAdv;
    }
    
    result.dominanceScore = Math.round(Math.max(0, Math.min(100, dominanceScore)));
    
    // Adjust signal based on dominance score
    if (result.dominanceScore >= 70) {
      result.signal = 'strong';
      result.confidence = Math.min(95, result.confidence + 15);
    } else if (result.dominanceScore >= 55) {
      if (result.signal === 'weak') result.signal = 'medium';
      result.confidence = Math.min(85, result.confidence + 5);
    } else if (result.dominanceScore < 45) {
      result.signal = 'weak';
      result.confidence = Math.max(20, result.confidence - 10);
    }
  }
  
  // POTENZIAMENTO HPI + RESILIENCE: Analizza fragilità underdog
  try {
    const favoritoHPI = calculateHPI(data, favorito.side);
    const sfavoritoHPI = calculateHPI(data, sfavorito.side);
    const sfavoritoResilience = calculateBreakResilience(data, sfavorito.side);
    
    // Se il favorito ha alto HPI → conferma dominio
    if (favoritoHPI.level === 'ELITE' || favoritoHPI.level === 'STRONG') {
      result.confidence = Math.min(95, result.confidence + 10);
      result.factors = result.factors || {};
      result.factors.favoritoHPI = favoritoHPI.level;
      result.details.favoritoHPIValue = favoritoHPI.value;
    }
    
    // Se lo sfavorito ha basso HPI → break più facile
    if (sfavoritoHPI.level === 'VULNERABLE' || sfavoritoHPI.level === 'WEAK') {
      result.confidence = Math.min(95, result.confidence + 8);
      result.factors = result.factors || {};
      result.factors.sfavoritoHPI = sfavoritoHPI.level;
      result.details.sfavoritoHPIValue = sfavoritoHPI.value;
      result.message += ' | 🎯 Underdog fragile al servizio';
    }
    
    // Se lo sfavorito ha bassa resilienza → tende a cedere
    if (sfavoritoResilience.level === 'FRAGILE' || sfavoritoResilience.level === 'BRITTLE') {
      result.confidence = Math.min(95, result.confidence + 12);
      result.factors = result.factors || {};
      result.factors.sfavoritoResilience = sfavoritoResilience.level;
      result.details.sfavoritoResilienceValue = sfavoritoResilience.value;
    }
  } catch (e) {
    // HPI/Resilience non disponibili - continua senza
  }
  
  // Calcola confidence finale basata su tutti i fattori
  if (result.signal === 'strong') {
    result.confidence = Math.max(70, result.confidence);
  } else if (result.signal === 'medium') {
    result.confidence = Math.max(40, Math.min(70, result.confidence));
  } else {
    result.confidence = Math.min(40, result.confidence);
  }
  
  return result;
}
// ============================================================================
// HPI - HOLD PRESSURE INDEX
// Misura quanto un giocatore tiene il servizio sotto pressione
// ============================================================================

/**
 * Soglie per situazioni di pressione al servizio
 */
export const HPI_PRESSURE_SITUATIONS = {
  // Punteggi critici dal punto di vista del server
  deuce: ['40-40', 'DEUCE', '40-AD', 'AD-40'],
  thirtyAll: ['30-30'],
  breakPoint: ['30-40', '15-40', '0-40', '40-AD'], // Server perde prossimo punto = break
  serverDanger: ['0-30', '15-30', '0-15'], // Server in difficoltà
};

/**
 * Calcola l'Hold Pressure Index (HPI) di un giocatore
 * 
 * HPI = (game tenuti sotto pressione / game totali al servizio sotto pressione) * 100
 * 
 * Situazioni di pressione considerate:
 * - 30-30 (parità critica)
 * - Deuce (40-40)
 * - Break Point salvati (30-40, 15-40, 0-40)
 * 
 * Tipo: DERIVED (calcolato da dati puri)
 * Livello: GAME/MATCH
 * 
 * @param {Object} data - Dati del match (con point-by-point)
 * @param {string} playerSide - 'home' o 'away'
 * @returns {Object} { value, level, breakdown }
 */
export function calculateHPI(data, playerSide = 'home') {
  const normalizedPbp = normalizeTennisPointByPoint(data);
  const keyStats = extractKeyStats(data);
  
  const result = {
    value: 0,
    level: 'N/A',
    breakdown: {
      deuceHeld: 0,
      deuceTotal: 0,
      thirtyAllHeld: 0,
      thirtyAllTotal: 0,
      breakPointsSaved: 0,
      breakPointsTotal: 0,
      pressureGamesHeld: 0,
      pressureGamesTotal: 0
    },
    confidence: 0,
    message: ''
  };
  
  // Prova prima dalle statistiche match
  if (keyStats) {
    const stats = playerSide === 'home' ? keyStats.home : keyStats.away;
    
    // Break points saved dalla statistiche
    if (stats.breakPointsSavedPct !== null && stats.breakPointsSavedPct !== undefined) {
      result.breakdown.breakPointsSaved = stats.breakPointsSaved || 0;
      result.breakdown.breakPointsTotal = stats.breakPointsTotal || 0;
      
      // Se abbiamo solo la % e non il conteggio, usiamo la %
      if (result.breakdown.breakPointsTotal === 0 && stats.breakPointsSavedPct > 0) {
        // Stima conservativa
        result.value = stats.breakPointsSavedPct;
        result.confidence = 60; // Bassa confidence senza dati granulari
      }
    }
    
    // First serve won % contribuisce alla pressione
    if (stats.firstServeWonPct) {
      result.breakdown.firstServeWonPct = stats.firstServeWonPct;
    }
    
    // Second serve won % (più importante per HPI)
    if (stats.secondServeWonPct) {
      result.breakdown.secondServeWonPct = stats.secondServeWonPct;
    }
  }
  
  // Analizza point-by-point per dati granulari
  if (normalizedPbp && normalizedPbp.points && normalizedPbp.points.length > 0) {
    let pressureGamesHeld = 0;
    let pressureGamesTotal = 0;
    let deuceHeld = 0;
    let deuceTotal = 0;
    let thirtyAllHeld = 0;
    let thirtyAllTotal = 0;
    
    // Raggruppa punti per game
    const games = {};
    for (const point of normalizedPbp.points) {
      const gameKey = `${point.set}-${point.game}`;
      if (!games[gameKey]) {
        games[gameKey] = {
          points: [],
          serving: point.serving,
          set: point.set,
          game: point.game,
          hadPressure: false,
          held: false
        };
      }
      games[gameKey].points.push(point);
      
      // Controlla se c'è stata pressione
      const score = point.scoreBefore || point.scoreAfter || '';
      if (HPI_PRESSURE_SITUATIONS.deuce.some(s => score.includes(s))) {
        games[gameKey].hadPressure = true;
        games[gameKey].hadDeuce = true;
      }
      if (HPI_PRESSURE_SITUATIONS.thirtyAll.some(s => score.includes(s))) {
        games[gameKey].hadPressure = true;
        games[gameKey].hadThirtyAll = true;
      }
      if (HPI_PRESSURE_SITUATIONS.breakPoint.some(s => score.includes(s))) {
        games[gameKey].hadPressure = true;
        games[gameKey].hadBreakPoint = true;
      }
    }
    
    // Analizza ogni game
    for (const gameKey of Object.keys(games)) {
      const game = games[gameKey];
      
      // Solo game dove il player stava servendo
      const isPlayerServing = (playerSide === 'home' && game.serving === 1) ||
                              (playerSide === 'away' && game.serving === 2);
      
      if (!isPlayerServing) continue;
      
      // Determina se il game è stato tenuto (il server ha vinto)
      const lastPoint = game.points[game.points.length - 1];
      const gameWinner = lastPoint?.gameWinner || lastPoint?.scoring;
      const held = (playerSide === 'home' && gameWinner === 1) ||
                   (playerSide === 'away' && gameWinner === 2);
      
      if (game.hadPressure) {
        pressureGamesTotal++;
        if (held) pressureGamesHeld++;
      }
      
      if (game.hadDeuce) {
        deuceTotal++;
        if (held) deuceHeld++;
      }
      
      if (game.hadThirtyAll) {
        thirtyAllTotal++;
        if (held) thirtyAllHeld++;
      }
    }
    
    result.breakdown.pressureGamesHeld = pressureGamesHeld;
    result.breakdown.pressureGamesTotal = pressureGamesTotal;
    result.breakdown.deuceHeld = deuceHeld;
    result.breakdown.deuceTotal = deuceTotal;
    result.breakdown.thirtyAllHeld = thirtyAllHeld;
    result.breakdown.thirtyAllTotal = thirtyAllTotal;
    
    // Calcola HPI
    if (pressureGamesTotal > 0) {
      result.value = Math.round((pressureGamesHeld / pressureGamesTotal) * 100);
      result.confidence = Math.min(95, 50 + pressureGamesTotal * 10);
    }
  }
  
  // Determina livello
  if (result.value >= 80) {
    result.level = 'ELITE';
    result.message = 'Eccezionale sotto pressione';
  } else if (result.value >= 65) {
    result.level = 'STRONG';
    result.message = 'Solido nei momenti chiave';
  } else if (result.value >= 50) {
    result.level = 'AVERAGE';
    result.message = 'Normale gestione pressione';
  } else if (result.value >= 35) {
    result.level = 'VULNERABLE';
    result.message = 'Fragile sotto pressione';
  } else if (result.value > 0) {
    result.level = 'WEAK';
    result.message = 'Crolla nei momenti decisivi';
  }
  
  return result;
}

// ============================================================================
// BREAK RESILIENCE SCORE
// Misura la capacità di salvare break point + recuperare da momentum negativo
// ============================================================================

/**
 * Calcola il Break Resilience Score di un giocatore
 * 
 * Formula: (BP Saved % * 0.6) + (Recovery Rate * 0.4)
 * 
 * Componenti:
 * - Break Point Saved % (peso 60%): % palle break salvate
 * - Recovery Rate (peso 40%): capacità di recuperare da momentum negativo
 * 
 * Tipo: DERIVED (calcolato da dati puri)
 * Livello: GAME/MATCH
 * 
 * @param {Object} data - Dati del match
 * @param {string} playerSide - 'home' o 'away'
 * @returns {Object} { value, level, breakdown }
 */
export function calculateBreakResilience(data, playerSide = 'home') {
  const keyStats = extractKeyStats(data);
  // Cerca sia tennisPowerRankings che powerRankings (per dati SVG)
  let powerRankings = deepFindAll(data, 'tennisPowerRankings', 5).flat().filter(Boolean);
  if (!powerRankings || powerRankings.length === 0) {
    powerRankings = deepFindAll(data, 'powerRankings', 5).flat().filter(Boolean);
  }
  
  const result = {
    value: 0,
    level: 'N/A',
    breakdown: {
      breakPointsSavedPct: 0,
      breakPointsSaved: 0,
      breakPointsTotal: 0,
      recoveryRate: 0,
      negativePhases: 0,
      recoveredPhases: 0,
      avgRecoveryGames: 0
    },
    confidence: 0,
    message: ''
  };
  
  let hasBreakPointData = false;
  let hasRecoveryData = false;
  
  // 1. Break Points Saved % (peso 60%)
  if (keyStats) {
    const stats = playerSide === 'home' ? keyStats.home : keyStats.away;
    
    if (stats.breakPointsSavedPct !== null && stats.breakPointsSavedPct !== undefined) {
      result.breakdown.breakPointsSavedPct = stats.breakPointsSavedPct;
      result.breakdown.breakPointsSaved = stats.breakPointsSaved || 0;
      result.breakdown.breakPointsTotal = stats.breakPointsTotal || 0;
      hasBreakPointData = true;
    }
  }
  
  // 2. Recovery Rate dal momentum (peso 40%)
  if (powerRankings && powerRankings.length >= 5) {
    // Calcola elasticità (capacità di recupero da fasi negative)
    const elasticityData = calculateElasticity(powerRankings);
    
    // Conta fasi di momentum negativo e recuperi per il player specifico
    let negativePhases = 0;
    let recoveredPhases = 0;
    let recoveryGames = [];
    let inNegativePhase = false;
    let negativeStart = -1;
    
    for (let i = 0; i < powerRankings.length; i++) {
      const pr = powerRankings[i];
      // Usa raw_v se disponibile, altrimenti value
      let value = pr.value || 0;
      if (pr.raw_v !== undefined) {
        value = pr.value >= 0 ? pr.raw_v : -pr.raw_v;
      }
      
      // Per home, momentum positivo è buono; per away, negativo è buono
      const isPlayerNegative = (playerSide === 'home' && value < -15) ||
                               (playerSide === 'away' && value > 15);
      const isPlayerPositive = (playerSide === 'home' && value > 5) ||
                               (playerSide === 'away' && value < -5);
      
      if (isPlayerNegative && !inNegativePhase) {
        inNegativePhase = true;
        negativeStart = i;
        negativePhases++;
      } else if (isPlayerPositive && inNegativePhase) {
        inNegativePhase = false;
        recoveredPhases++;
        recoveryGames.push(i - negativeStart);
      }
    }
    
    const avgRecovery = recoveryGames.length > 0 
      ? recoveryGames.reduce((a, b) => a + b, 0) / recoveryGames.length 
      : 0;
    
    // Recovery rate: % fasi negative da cui si è recuperato
    const recoveryRate = negativePhases > 0 
      ? Math.round((recoveredPhases / negativePhases) * 100) 
      : 50; // Default neutro se nessuna fase negativa
    
    result.breakdown.recoveryRate = recoveryRate;
    result.breakdown.negativePhases = negativePhases;
    result.breakdown.recoveredPhases = recoveredPhases;
    result.breakdown.avgRecoveryGames = Math.round(avgRecovery * 10) / 10;
    
    hasRecoveryData = negativePhases > 0;
  }
  
  // Calcola score finale
  if (hasBreakPointData || hasRecoveryData) {
    const bpComponent = hasBreakPointData ? result.breakdown.breakPointsSavedPct * 0.6 : 0;
    const recoveryComponent = hasRecoveryData ? result.breakdown.recoveryRate * 0.4 : 0;
    
    if (hasBreakPointData && hasRecoveryData) {
      result.value = Math.round(bpComponent + recoveryComponent);
      result.confidence = 85;
    } else if (hasBreakPointData) {
      result.value = Math.round(result.breakdown.breakPointsSavedPct);
      result.confidence = 60;
    } else {
      result.value = Math.round(result.breakdown.recoveryRate);
      result.confidence = 50;
    }
  }
  
  // Determina livello
  if (result.value >= 75) {
    result.level = 'RESILIENT';
    result.message = 'Alta capacità di recupero';
  } else if (result.value >= 60) {
    result.level = 'SOLID';
    result.message = 'Buona resistenza mentale';
  } else if (result.value >= 45) {
    result.level = 'AVERAGE';
    result.message = 'Resilienza nella media';
  } else if (result.value >= 30) {
    result.level = 'FRAGILE';
    result.message = 'Difficoltà a recuperare';
  } else if (result.value > 0) {
    result.level = 'BRITTLE';
    result.message = 'Crolla dopo momenti negativi';
  }
  
  return result;
}

/**
 * Combina HPI e Break Resilience in un Pressure Performance Score
 * 
 * @deprecated PREFERIRE usare i valori pre-calcolati dal MatchBundle:
 *   bundle.tabs.stats.pressurePerformance (se implementato nel backend)
 * Questa funzione rimane per analisi legacy point-by-point.
 * Vedi: docs/specs/HPI_RESILIENCE.md per formule.
 * 
 * @param {Object} data - Dati del match
 * @param {string} playerSide - 'home' o 'away'
 * @returns {Object} Score combinato
 */
export function calculatePressurePerformance(data, playerSide = 'home') {
  const hpi = calculateHPI(data, playerSide);
  const resilience = calculateBreakResilience(data, playerSide);
  
  const result = {
    hpi,
    resilience,
    combined: 0,
    level: 'N/A',
    message: ''
  };
  
  // Combina i due score con pesi uguali
  if (hpi.value > 0 || resilience.value > 0) {
    const hpiWeight = hpi.confidence > 30 ? 0.5 : 0.3;
    const resWeight = resilience.confidence > 30 ? 0.5 : 0.3;
    
    const totalWeight = hpiWeight + resWeight;
    result.combined = Math.round(
      (hpi.value * hpiWeight + resilience.value * resWeight) / totalWeight
    );
    
    // Livello combinato
    if (result.combined >= 75) {
      result.level = 'CLUTCH';
      result.message = 'Giocatore decisivo nei momenti chiave';
    } else if (result.combined >= 60) {
      result.level = 'RELIABLE';
      result.message = 'Affidabile sotto pressione';
    } else if (result.combined >= 45) {
      result.level = 'STANDARD';
      result.message = 'Performance nella norma';
    } else if (result.combined >= 30) {
      result.level = 'INCONSISTENT';
      result.message = 'Alti e bassi sotto pressione';
    } else {
      result.level = 'CHOKER';
      result.message = 'Tende a cedere nei momenti decisivi';
    }
  }
  
  return result;
}

// ============================================================================
// CALCOLO COMPLETEZZA DATI - Per barra di avanzamento nelle card
// ============================================================================

/**
 * Calcola la percentuale di completezza dei dati di una partita.
 * Analizza la presenza e qualità dei dati salvati nel file JSON.
 * 
 * @param {Object} data - I dati grezzi della partita (rawData)
 * @returns {Object} { percentage: number, details: Object }
 */
export function calculateDataCompleteness(data) {
  if (!data) return { percentage: 0, details: {} };
  
  const api = data.api || data;
  const details = {};
  let totalWeight = 0;
  let achievedWeight = 0;
  
  // Trova eventId dai dati
  const eventId = extractEventId(data);
  
  // Definizione dei dati importanti e loro peso
  const dataChecks = [
    // Dato fondamentale: evento principale (peso alto)
    {
      key: 'event',
      weight: 20,
      check: () => {
        const eventKey = Object.keys(api).find(k => 
          k.includes(`/event/${eventId}`) && 
          !k.includes('/') && 
          k.endsWith(eventId?.toString())
        ) || Object.keys(api).find(k => 
          k.match(/\/event\/\d+$/)
        );
        const eventData = eventKey ? api[eventKey] : null;
        return eventData && eventData.event && !eventData.error;
      }
    },
    // Point by Point (peso medio-alto)
    {
      key: 'pointByPoint',
      weight: 20,
      check: () => {
        const pbpKey = Object.keys(api).find(k => k.includes('point-by-point'));
        const pbpData = pbpKey ? api[pbpKey] : null;
        if (!pbpData || pbpData.error) return 0;
        const pbp = pbpData.pointByPoint || [];
        if (!Array.isArray(pbp) || pbp.length === 0) return 0.5; // Partita non iniziata
        return 1;
      }
    },
    // Statistics (peso medio)
    {
      key: 'statistics',
      weight: 15,
      check: () => {
        const statsKey = Object.keys(api).find(k => 
          k.includes('/statistics') && !k.includes('team-statistics')
        );
        const statsData = statsKey ? api[statsKey] : null;
        return statsData && statsData.statistics && !statsData.error;
      }
    },
    // Incidents (peso medio)
    {
      key: 'incidents',
      weight: 10,
      check: () => {
        const incKey = Object.keys(api).find(k => k.includes('/incidents'));
        const incData = incKey ? api[incKey] : null;
        // incidents può essere vuoto per partite non iniziate
        if (!incData) return 0;
        if (incData.error?.code === 404) return 0.5; // Non ancora disponibile
        return incData.incidents ? 1 : 0.5;
      }
    },
    // H2H (peso medio)
    {
      key: 'h2h',
      weight: 10,
      check: () => {
        const h2hKey = Object.keys(api).find(k => k.includes('/h2h'));
        const h2hData = h2hKey ? api[h2hKey] : null;
        if (!h2hData || h2hData.error) return 0;
        return h2hData.teamDuel || h2hData.managerDuel ? 1 : 0.5;
      }
    },
    // Tennis Power Rankings (peso medio)
    {
      key: 'tennisPower',
      weight: 10,
      check: () => {
        const powerKey = Object.keys(api).find(k => k.includes('tennis-power'));
        const powerData = powerKey ? api[powerKey] : null;
        if (!powerData || powerData.error) return 0;
        return powerData.tennisPowerRankings ? 1 : 0.5;
      }
    },
    // Lineups (peso basso - non sempre disponibile)
    {
      key: 'lineups',
      weight: 5,
      check: () => {
        const lineupsKey = Object.keys(api).find(k => k.includes('/lineups'));
        const lineupsData = lineupsKey ? api[lineupsKey] : null;
        // Per tennis spesso non c'è lineup
        if (!lineupsData || lineupsData === null) return 0.5;
        return lineupsData.error ? 0 : 1;
      }
    },
    // Graph/Momentum (peso medio)
    {
      key: 'graph',
      weight: 10,
      check: () => {
        const graphKey = Object.keys(api).find(k => 
          k.includes('/graph') || k.includes('win-probability')
        );
        const graphData = graphKey ? api[graphKey] : null;
        // Graph potrebbe non essere disponibile all'inizio
        if (!graphData || graphData === null) return 0.5;
        return graphData.error ? 0 : 1;
      }
    }
  ];
  
  // Calcola i pesi
  for (const check of dataChecks) {
    totalWeight += check.weight;
    const result = check.check();
    const score = typeof result === 'number' ? result : (result ? 1 : 0);
    achievedWeight += check.weight * score;
    details[check.key] = Math.round(score * 100);
  }
  
  const percentage = Math.round((achievedWeight / totalWeight) * 100);
  
  return { percentage, details };
}