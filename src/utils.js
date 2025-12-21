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

  analysis.averageValue = Math.round((sum / powerRankings.length) * 10) / 10;

  return analysis;
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

/**
 * Analizza la strategia "Lay the Winner"
 * Si banca il tennista che ha vinto il primo set
 * @param {Object} data - Dati grezzi del match
 * @returns {Object} Analisi della strategia
 */
export function analyzeLayTheWinner(data) {
  const eventInfo = extractEventInfo(data);
  const pbp = loadPointByPoint(data);
  
  const result = {
    applicable: false,
    signal: 'none', // 'none', 'weak', 'medium', 'strong'
    message: '',
    details: {},
    recommendation: ''
  };
  
  if (!eventInfo) {
    result.message = 'Dati match non disponibili';
    return result;
  }
  
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
    } else if (winnerSecondSetGames - loserSecondSetGames <= 1) {
      result.signal = 'medium';
      result.message = `Secondo set equilibrato (${secondSetHome}-${secondSetAway})`;
      result.recommendation = `Monitora break points per bancare ${result.details.firstSetWinnerName}`;
    } else {
      result.signal = 'weak';
      result.message = `${result.details.firstSetWinnerName} sta dominando anche il 2° set`;
      result.recommendation = 'Strategia meno favorevole - il vincitore 1° set continua a dominare';
    }
  }
  
  return result;
}

/**
 * Analizza la strategia "Banca Servizio"
 * Si banca chi serve quando è sotto pressione
 * @param {Object} data - Dati grezzi del match
 * @returns {Object} Analisi della strategia
 */
export function analyzeBancaServizio(data) {
  const eventInfo = extractEventInfo(data);
  const powerRankings = deepFindAll(data, 'tennisPowerRankings', 5).flat().filter(Boolean);
  
  const result = {
    applicable: false,
    signal: 'none',
    message: '',
    details: {},
    recommendation: ''
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

  // Analizza momentum se disponibile
  if (powerRankings.length > 0) {
    const lastMomentum = powerRankings[powerRankings.length - 1];
    if (lastMomentum?.value < -20) {
      result.signal = result.signal === 'strong' ? 'strong' : 'medium';
      result.details.momentum = lastMomentum.value;
      result.message += ` | Momentum: ${lastMomentum.value}`;
    }
  }

  return result;
}

/**
 * Analizza la strategia "Super Break"
 * Puntare favorito dominante aspettando break point
 * @param {Object} data - Dati grezzi del match
 * @returns {Object} Analisi della strategia
 */
export function analyzeSuperBreak(data) {
  const eventInfo = extractEventInfo(data);
  const pbp = loadPointByPoint(data);
  const powerRankings = deepFindAll(data, 'tennisPowerRankings', 5).flat().filter(Boolean);
  
  const result = {
    applicable: false,
    signal: 'none',
    message: '',
    details: {},
    recommendation: ''
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
    const sum = powerRankings.reduce((a, b) => a + (b.value || 0), 0);
    avgMomentum = Math.round(sum / powerRankings.length);
    dominantGames = powerRankings.filter(p => p.value > 60).length;
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