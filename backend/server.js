require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

// Global error handlers to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});
const {
  getData,
  getStatus,
  runDirectFetch,
  directFetch,
} = require('./scraper/sofascoreScraper');
const {
  interpretGameValue,
  analyzePowerRankings,
  getValueZone,
  DEFAULT_THRESHOLDS
} = require('./utils/valueInterpreter');
const { initLiveManager, getStats: getLiveStats, fetchCompleteData, trackMatch, untrackMatch, getTrackedMatches, startScheduler, stopScheduler, syncMatch, setMatchPriority, resumeMatch, getTrackingStats, reconcileLiveMatches, fetchLiveMatchesList, USE_DB_TRACKING } = require('./liveManager');

// Player Stats Service (statistiche aggregate giocatori)
let playerStatsService = null;
try {
  playerStatsService = require('./services/playerStatsService');
  console.log('✅ Player Stats Service loaded');
} catch (e) {
  console.warn('⚠️ Player Stats Service not available:', e.message);
}

// Match Card Service (assembla card match complete)
let matchCardService = null;
try {
  matchCardService = require('./services/matchCardService');
  console.log('✅ Match Card Service loaded');
} catch (e) {
  console.warn('⚠️ Match Card Service not available:', e.message);
}

// Player Service (gestione giocatori)
let playerService = null;
try {
  playerService = require('./services/playerService');
  console.log('✅ Player Service loaded');
} catch (e) {
  console.warn('⚠️ Player Service not available:', e.message);
}

// Player Profile Service (profili aggregati avanzati)
let playerProfileService = null;
try {
  playerProfileService = require('./services/playerProfileService');
  console.log('✅ Player Profile Service loaded');
} catch (e) {
  console.warn('⚠️ Player Profile Service not available:', e.message);
}

// Strategy Stats Service (statistiche storiche strategie trading)
let strategyStatsService = null;
try {
  strategyStatsService = require('./services/strategyStatsService');
  console.log('✅ Strategy Stats Service loaded');
} catch (e) {
  console.warn('⚠️ Strategy Stats Service not available:', e.message);
}

// Break Detector (rilevamento break da punteggio)
let breakDetector = null;
try {
  breakDetector = require('./utils/breakDetector');
  console.log('✅ Break Detector loaded');
} catch (e) {
  console.warn('⚠️ Break Detector not available:', e.message);
}

// Pressure Calculator (indice pressione live)
let pressureCalculator = null;
try {
  pressureCalculator = require('./utils/pressureCalculator');
  console.log('✅ Pressure Calculator loaded');
} catch (e) {
  console.warn('⚠️ Pressure Calculator not available:', e.message);
}

// Match Segmenter (segmentazione match)
let matchSegmenter = null;
try {
  matchSegmenter = require('./utils/matchSegmenter');
  console.log('✅ Match Segmenter loaded');
} catch (e) {
  console.warn('⚠️ Match Segmenter not available:', e.message);
}

// Database imports
let matchRepository = null;
let supabaseClient = null;
try {
  matchRepository = require('./db/matchRepository');
  supabaseClient = require('./db/supabase');
  console.log('✅ Database modules loaded');
} catch (e) {
  console.warn('⚠️ Database modules not available:', e.message);
}

// ============================================================================
// BUNDLE CACHE (FILOSOFIA_FRONTEND_DATA_CONSUMPTION)
// ============================================================================
// Cache per bundle già costruiti - evita ricostruzione continua
// TTL: 30 secondi per match finiti, 5 secondi per match live
const bundleCache = new Map();
const BUNDLE_CACHE_TTL_FINISHED = 30000; // 30 secondi per match finiti
const BUNDLE_CACHE_TTL_LIVE = 5000;      // 5 secondi per match live

function getCachedBundle(eventId) {
  const cached = bundleCache.get(eventId);
  if (!cached) return null;
  
  const now = Date.now();
  const ttl = cached.isLive ? BUNDLE_CACHE_TTL_LIVE : BUNDLE_CACHE_TTL_FINISHED;
  
  if (now - cached.timestamp > ttl) {
    bundleCache.delete(eventId);
    return null;
  }
  
  return cached.bundle;
}

function setCachedBundle(eventId, bundle, isLive = false) {
  bundleCache.set(eventId, {
    bundle,
    timestamp: Date.now(),
    isLive
  });
}

function invalidateBundleCache(eventId) {
  bundleCache.delete(eventId);
}

// ============================================================================
// HELPER: CALCOLO BREAK DA POINT-BY-POINT
// ============================================================================

/**
 * Calcola breakOccurred per ogni game analizzando i dati point-by-point
 * Un break avviene quando chi vince il game (scoring) è diverso da chi serve (serving)
 * 
 * Convenzione SofaScore (da enrich-xlsx-matches.js):
 * - serving=1 = HOME serve
 * - serving=2 = AWAY serve
 * - scoring=1 = HOME wins
 * - scoring=2 = AWAY wins
 * - scoring=-1 = game incompleto
 * 
 * BREAK = serving !== scoring (chi serve perde)
 * HOLD = serving === scoring (chi serve vince)
 * 
 * @param {Array} pointByPoint - Array di set con games e points
 * @returns {Map} Mappa "set-game" -> boolean
 */
function calculateBreaksFromPbp(pointByPoint) {
  const breakMap = new Map();
  
  if (!pointByPoint || !Array.isArray(pointByPoint)) {
    return breakMap;
  }
  
  for (const setData of pointByPoint) {
    const setNumber = setData.set || 1;
    
    for (const gameData of (setData.games || [])) {
      const gameNumber = gameData.game || 1;
      const key = `${setNumber}-${gameNumber}`;
      
      // game.score contiene {serving, scoring, homeScore, awayScore}
      const score = gameData.score;
      if (score && score.serving !== undefined && score.scoring !== undefined) {
        // scoring=-1 significa game non completato, non è un break
        if (score.scoring === -1) {
          breakMap.set(key, false);
          continue;
        }
        
        // BREAK = serving !== scoring (chi serve perde il game)
        // serving=1 (home) + scoring=2 (away wins) = BREAK per away
        // serving=2 (away) + scoring=1 (home wins) = BREAK per home
        // serving=1 (home) + scoring=1 (home wins) = HOLD
        // serving=2 (away) + scoring=2 (away wins) = HOLD
        const isBreak = score.serving !== score.scoring;
        breakMap.set(key, isBreak);
      }
    }
  }
  
  return breakMap;
}

/**
 * Genera powerRankings simulati dai pointByPoint se non disponibili da SofaScore
 * Usa la stessa logica di break detection di GameBlock.jsx
 * 
 * Convenzione SofaScore:
 * - serving=1 = HOME serve
 * - serving=2 = AWAY serve  
 * - scoring=1 = HOME wins
 * - scoring=2 = AWAY wins
 * 
 * Il momentum viene calcolato come differenza running score:
 * - Home vince: +1 punto per set running
 * - Away vince: -1 punto per set running
 * - Break bonus: ±0.5 punti extra
 * Alla fine normalizzato -100..+100 in base al max/min del match
 * 
 * @param {Array} pointByPoint - Array di set con games e points
 * @returns {Array} PowerRankings generati con value e breakOccurred
 */
function generatePowerRankingsFromPbp(pointByPoint) {
  if (!pointByPoint || !Array.isArray(pointByPoint) || pointByPoint.length === 0) {
    return [];
  }
  
  const rawData = [];
  let runningScore = 0; // Running score (positivo = home avanti, negativo = away avanti)
  
  // Prima passa: calcola raw values
  for (const setData of pointByPoint) {
    const setNumber = setData.set || 1;
    
    // Reset running score ad ogni set (come fa SofaScore)
    runningScore = 0;
    
    for (const gameData of (setData.games || [])) {
      const gameNumber = gameData.game || 1;
      const score = gameData.score;
      
      // Salta game senza score o incompleti
      if (!score || score.scoring === undefined || score.scoring === -1) {
        continue;
      }
      
      // Determina chi ha vinto il game e se è break
      // scoring=1 = home wins, scoring=2 = away wins
      const homeWins = score.scoring === 1;
      
      // serving=1 = home serves, serving=2 = away serves
      const homeServes = score.serving === 1;
      
      // Break = chi vince NON è chi serve
      // homeServes && !homeWins = home serve, away wins = BREAK per away
      // !homeServes && homeWins = away serve, home wins = BREAK per home
      const isBreak = (homeServes && !homeWins) || (!homeServes && homeWins);
      
      // Calcola momentum come running score
      // Game vinto = 1 punto, Break = 0.5 punti bonus
      const basePoints = 1;
      const breakBonus = 0.5;
      
      if (homeWins) {
        runningScore += basePoints + (isBreak ? breakBonus : 0);
      } else {
        runningScore -= basePoints + (isBreak ? breakBonus : 0);
      }
      
      rawData.push({
        set: setNumber,
        game: gameNumber,
        rawValue: runningScore,
        breakOccurred: isBreak,
        generated: true
      });
    }
  }
  
  if (rawData.length === 0) {
    return [];
  }
  
  // Seconda passa: normalizza a -100..+100 basandosi sul max/min del match
  const values = rawData.map(d => d.rawValue);
  const maxAbs = Math.max(Math.abs(Math.max(...values)), Math.abs(Math.min(...values)), 1);
  
  return rawData.map(d => ({
    ...d,
    value: Math.round((d.rawValue / maxAbs) * 100)
  }));
}

/**
 * Arricchisce i powerRankings con breakOccurred calcolato dai pointByPoint
 * Se powerRankings è vuoto ma abbiamo pointByPoint, genera powerRankings simulati
 * 
 * @param {Array} powerRankings - Array di power rankings 
 * @param {Array} pointByPoint - Array di point by point data
 * @returns {Array} PowerRankings arricchiti con breakOccurred
 */
function enrichPowerRankingsWithBreaks(powerRankings, pointByPoint) {
  // Se non abbiamo powerRankings ma abbiamo pointByPoint, genera powerRankings
  if ((!powerRankings || powerRankings.length === 0) && pointByPoint?.length > 0) {
    const generated = generatePowerRankingsFromPbp(pointByPoint);
    if (generated.length > 0) {
      console.log(`   📊 Generated ${generated.length} powerRankings from pointByPoint`);
      return generated;
    }
    return [];
  }
  
  if (!powerRankings || powerRankings.length === 0) {
    return powerRankings || [];
  }
  
  const breakMap = calculateBreaksFromPbp(pointByPoint);
  
  // Se non abbiamo dati point-by-point, restituisci come sono
  if (breakMap.size === 0) {
    return powerRankings;
  }
  
  // Arricchisci ogni power ranking con breakOccurred
  return powerRankings.map(pr => {
    const setNum = pr.set || 1;
    const gameNum = pr.game || 1;
    const key = `${setNum}-${gameNum}`;
    
    return {
      ...pr,
      breakOccurred: breakMap.has(key) ? breakMap.get(key) : (pr.breakOccurred || false)
    };
  });
}

// Funzione per determinare lo status realistico di una partita
// Se una partita risulta "inprogress" ma è iniziata più di 6 ore fa, probabilmente è finita
function getRealisticStatus(status, startTimestamp, winnerCode) {
  if (!status) return null;
  
  const statusType = status.type?.toLowerCase();
  
  // Se c'è un vincitore, la partita è finita
  if (winnerCode && winnerCode !== 0) {
    return { ...status, type: 'finished', description: status.description || 'Match finished' };
  }
  
  // Se la partita è "inprogress" ma è iniziata più di 6 ore fa, considerala finita
  if (statusType === 'inprogress' && startTimestamp) {
    const matchStartTime = startTimestamp * 1000; // Converti in millisecondi
    const now = Date.now();
    const hoursSinceStart = (now - matchStartTime) / (1000 * 60 * 60);
    
    // Una partita di tennis dura al massimo 5-6 ore
    if (hoursSinceStart > 6) {
      console.log(`⚠️ Match started ${hoursSinceStart.toFixed(1)}h ago, marking as finished`);
      return { ...status, type: 'finished', description: 'Match finished' };
    }
  }
  
  return status;
}

const app = express();
const server = http.createServer(app);

// Lista origini consentite (dev + produzione)
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'https://tennis-analyzer.vercel.app'  // Produzione Vercel
  ];
  
  // Aggiungi domini Vercel dalla env var (per flessibilità)
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  return origins;
};

// CORS middleware per tutte le route Express
app.use((req, res, next) => {
  const allowedOrigins = getAllowedOrigins();
  const origin = req.headers.origin;
  
  // Permetti origini nella lista o pattern Vercel (.vercel.app)
  if (allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Setup Socket.IO con CORS per Vite dev server e produzione
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();
      // Permetti origini nella lista, Vercel patterns, o requests senza origin (mobile/server)
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Permetti comunque in produzione, log warning
        console.warn(`⚠️ CORS: Origin ${origin} not in allowed list`);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Inizializza WebSocket Live Manager
initLiveManager(io);

app.use(bodyParser.json());

// ============================================================================
// ROUTE MOUNTING (FILOSOFIA: server.js = bootstrap + mount only)
// ============================================================================
// Import and mount centralized routes
// This gradually replaces inline endpoint handlers below
const routes = require('./routes');
app.use('/api', routes);

// ============================================================================
// NOTE: Root and /api/health are now handled by routes/health.routes.js
// The handlers below are LEGACY and should be removed once routes are verified
// ============================================================================

// Directory per i file di scrape
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const SCRAPES_DIR = path.join(DATA_DIR, 'scrapes');

// Funzione per calcolare completezza dati di un match
function calculateDataCompleteness(apiData, eventId, sport = 'tennis') {
  if (!apiData) return 0;
  
  // Determina se è tennis
  const isTennis = sport === 'tennis' || 
    Object.keys(apiData).some(k => k.includes('tennis-power') || k.includes('point-by-point'));
  
  // Per tennis, verifica solo i dati essenziali
  if (isTennis) {
    let score = 0;
    let maxScore = 0;
    
    // Event principale (35 punti) - obbligatorio
    maxScore += 35;
    const hasEvent = Object.keys(apiData).some(k => k.match(/\/event\/\d+$/) && apiData[k]?.event);
    if (hasEvent) score += 35;
    
    // Point by Point (35 punti) - fondamentale per tennis
    maxScore += 35;
    const pbpKey = Object.keys(apiData).find(k => k.includes('point-by-point'));
    const pbpData = pbpKey ? apiData[pbpKey] : null;
    if (pbpData && !pbpData.error) {
      const pbp = pbpData.pointByPoint || [];
      if (Array.isArray(pbp) && pbp.length > 0) {
        score += 35;
      } else {
        score += 15; // Dati parziali
      }
    }
    
    // Statistics (20 punti)
    maxScore += 20;
    const statsKey = Object.keys(apiData).find(k => k.includes('/statistics') && !k.includes('team-statistics'));
    const statsData = statsKey ? apiData[statsKey] : null;
    if (statsData && statsData.statistics && !statsData.error) {
      score += 20;
    }
    
    // H2H o Tennis Power (10 punti) - bonus
    maxScore += 10;
    const h2hKey = Object.keys(apiData).find(k => k.includes('/h2h'));
    const h2hData = h2hKey ? apiData[h2hKey] : null;
    const tpKey = Object.keys(apiData).find(k => k.includes('tennis-power'));
    const tpData = tpKey ? apiData[tpKey] : null;
    
    if ((h2hData && (h2hData.teamDuel || h2hData.managerDuel)) || (tpData && tpData.tennisPowerRankings)) {
      score += 10;
    }
    
    return Math.round((score / maxScore) * 100);
  }
  
  // Per altri sport, logica originale semplificata
  let totalWeight = 0;
  let achievedWeight = 0;
  
  const checks = [
    { weight: 25, check: () => Object.keys(apiData).some(k => k.match(/\/event\/\d+$/) && apiData[k]?.event) ? 1 : 0 },
    { weight: 20, check: () => Object.keys(apiData).some(k => k.includes('/statistics')) ? 1 : 0.5 },
    { weight: 15, check: () => Object.keys(apiData).some(k => k.includes('/incidents')) ? 1 : 0.5 },
    { weight: 15, check: () => Object.keys(apiData).some(k => k.includes('/h2h')) ? 1 : 0.5 },
    { weight: 15, check: () => Object.keys(apiData).some(k => k.includes('/lineups')) ? 1 : 0.5 },
    { weight: 10, check: () => Object.keys(apiData).some(k => k.includes('/graph')) ? 1 : 0.5 }
  ];
  
  for (const c of checks) {
    totalWeight += c.weight;
    achievedWeight += c.weight * c.check();
  }
  
  return Math.round((achievedWeight / totalWeight) * 100);
}

// Funzione per estrarre partite correlate dello stesso torneo dalle API salvate
function extractRelatedMatches(apiData, currentEventId) {
  const relatedMatches = [];
  const seenIds = new Set([String(currentEventId)]);
  
  if (!apiData) return relatedMatches;
  
  // Cerca nelle risposte API che potrebbero contenere altre partite
  for (const [url, data] of Object.entries(apiData)) {
    // H2H contiene partite precedenti tra i due giocatori
    if (url.includes('/h2h') && data?.teamDuel?.events) {
      for (const event of data.teamDuel.events) {
        if (event.id && !seenIds.has(String(event.id))) {
          seenIds.add(String(event.id));
          relatedMatches.push({
            eventId: event.id,
            type: 'h2h',
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            tournament: event.tournament,
            startTimestamp: event.startTimestamp,
            status: event.status,
            homeScore: event.homeScore,
            awayScore: event.awayScore,
            winnerCode: event.winnerCode
          });
        }
      }
    }
    
    // Pregame form contiene partite recenti di entrambi i giocatori
    if (url.includes('/pregame-form') && data) {
      const formTypes = ['homeTeam', 'awayTeam'];
      for (const formType of formTypes) {
        const form = data[formType]?.form || [];
        for (const event of form) {
          if (event.id && !seenIds.has(String(event.id))) {
            seenIds.add(String(event.id));
            relatedMatches.push({
              eventId: event.id,
              type: 'form',
              homeTeam: event.homeTeam,
              awayTeam: event.awayTeam,
              tournament: event.tournament,
              startTimestamp: event.startTimestamp,
              status: event.status,
              homeScore: event.homeScore,
              awayScore: event.awayScore,
              winnerCode: event.winnerCode
            });
          }
        }
      }
    }
  }
  
  return relatedMatches;
}

// ============================================================================
// NOTE: DATABASE STATISTICS API MIGRATED TO ROUTES
// /api/db-stats → routes/index.js (legacy alias) → routes/stats.routes.js → controllers/stats.controller.js
// /api/stats/db → routes/stats.routes.js → controllers/stats.controller.js
// /api/stats/health → routes/stats.routes.js → controllers/stats.controller.js
// ============================================================================

// ============================================================================
// NOTE: TOURNAMENT, SEARCH, MATCHES ENDPOINTS MIGRATED TO ROUTES
// /api/tournament/:tournamentId/events → routes/match.routes.js → matchController.getTournamentEvents
// /api/matches/search → routes/match.routes.js → matchController.search
// /api/matches/tournaments → routes/match.routes.js → matchController.getTournaments
// /api/matches/db → routes/match.routes.js → matchController.getFromDb
// /api/matches → routes/match.routes.js → matchController.listFromFiles
// /api/suggested-matches → routes/match.routes.js → matchController.getSuggested
// /api/detected-matches → routes/match.routes.js → matchController.getDetected
// ============================================================================

// ============================================================================
// NOTE: SCRAPING & LOOKUP ENDPOINTS MIGRATED TO ROUTES
// /api/scrape → routes/index.js → controllers/scrapes.controller.js (scrape)
// /api/lookup-name → routes/index.js → controllers/scrapes.controller.js (lookupName)
// /api/sync-match/:eventId → routes/match.routes.js → controllers/match.controller.js (syncMatchFull)
// /api/check-data/:eventId → routes/match.routes.js → controllers/match.controller.js (checkData)
// ============================================================================

// ============================================================================
// NOTE: SCRAPES ENDPOINTS MIGRATED TO ROUTES
// /api/scrapes, /api/scrapes/:id → routes/scrapes.routes.js
// /api/scrape, /api/status/:id, /api/data/:id, /api/lookup-name → routes/index.js (root level)
// → controllers/scrapes.controller.js
// ============================================================================

// ============================================================================
// NOTE: VALUE & EVENT ENDPOINTS MIGRATED TO ROUTES
// /api/interpret-value, /api/analyze-power-rankings, /api/value-thresholds, /api/value-zone/:value
// → routes/value.routes.js → controllers/value.controller.js
// 
// /api/event/:eventId/point-by-point, /api/event/:eventId/statistics, 
// /api/event/:eventId/power-rankings, /api/event/:eventId/live
// → routes/event.routes.js → controllers/event.controller.js
// 
// /api/live/stats → routes/tracking.routes.js → controllers/tracking.controller.js
// ============================================================================

// ============================================================================
// NOTE: DATABASE API ENDPOINTS MIGRATED TO ROUTES
// /api/db/test, /api/db/matches, /api/db/matches/summary, /api/db/matches/by-month/:yearMonth,
// /api/db/matches/:id, /api/db/matches/:id/point-by-point, /api/db/matches/:id/statistics,
// /api/db/tournaments, /api/db/players/search, /api/db/logs
// → routes/db.routes.js → controllers/db.controller.js
// ============================================================================

// ============================================================================
// NOTE: PLAYER STATS ENDPOINTS MIGRATED TO ROUTES
// /api/player/:name/stats, /api/player/search, /api/player/h2h,
// /api/player/:name/matches, /api/match/strategy-context/:home/:away
// → routes/player.routes.js, routes/match.routes.js → controllers/player.controller.js
// ============================================================================

// ============================================================================
// NOTE: TRACKING ENDPOINTS MIGRATED TO ROUTES
// /api/track/:eventId (POST, DELETE), /api/tracked, /api/track/:eventId/priority,
// /api/track/:eventId/resume, /api/tracking/stats, /api/reconcile,
// /api/live/discover, /api/live/status, /api/sync/:eventId,
// /api/scheduler/start, /api/scheduler/stop
// → routes/tracking.routes.js → controllers/tracking.controller.js
// ============================================================================

// ============================================================================
// HYBRID API - Leggi da DB con fallback a file/SofaScore
// ============================================================================

/**
 * GET /api/match/:eventId - API ibrida: DB -> File -> SofaScore live
 * Questa è l'API principale da usare nel frontend
 */
app.get('/api/match/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { forceRefresh } = req.query;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    // 1. Prova prima dal database
    if (matchRepository) {
      try {
        const dbMatch = await matchRepository.getMatchById(parseInt(eventId));
        if (dbMatch && !forceRefresh) {
          console.log(`📦 Match ${eventId} served from database`);
          
          // Usa raw_json.pointByPoint che ha score.serving e score.scoring
          // per calcolare i break correttamente (come fa GameBlock.jsx)
          const pbpForBreaks = dbMatch.raw_json?.pointByPoint || dbMatch.pointByPoint || [];
          
          // Arricchisci powerRankings con breakOccurred calcolato da pointByPoint
          const enrichedPR = enrichPowerRankingsWithBreaks(
            dbMatch.powerRankings || [],
            pbpForBreaks
          );
          
          const breaksCount = enrichedPR.filter(pr => pr.breakOccurred).length;
          console.log(`   PowerRankings: ${enrichedPR.length}, Breaks: ${breaksCount}, Statistics: ${dbMatch.statistics?.length || 0}, PBP: ${dbMatch.pointByPoint?.length || 0}`);
          
          return res.json({
            source: 'database',
            eventId,
            ...dbMatch,
            powerRankings: enrichedPR,
            // Aggiungi alias per compatibilità frontend
            tennisPowerRankings: enrichedPR,
            timestamp: new Date().toISOString()
          });
        }
      } catch (dbErr) {
        console.log(`⚠️ DB fetch failed for ${eventId}, trying file...`);
      }
    }
    
    // 2. Prova dai file salvati (skip se forceRefresh)
    if (!forceRefresh) {
      const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(SCRAPES_DIR, file), 'utf8'));
          if (content.api) {
            for (const [url, data] of Object.entries(content.api)) {
              if (url.includes(`/event/${eventId}`) || data?.event?.id === parseInt(eventId)) {
                console.log(`📁 Match ${eventId} served from file ${file}`);
                
                // Estrai powerRankings e pointByPoint da liveData se disponibili
                const rawPowerRankings = content.liveData?.powerRankings || [];
                const rawPointByPoint = content.liveData?.pointByPoint || [];
                const enrichedPR = enrichPowerRankingsWithBreaks(rawPowerRankings, rawPointByPoint);
                
                return res.json({
                  source: 'file',
                  eventId,
                  fileName: file,
                  api: content.api,
                  liveData: {
                    ...content.liveData,
                    powerRankings: enrichedPR,
                    tennisPowerRankings: enrichedPR
                  },
                  lastSync: content.lastSync,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        } catch (e) { /* skip */ }
      }
    }
    
    // 3. Se richiesto refresh o non trovato, fetch da SofaScore
    console.log(`🌐 Match ${eventId} fetching from SofaScore...`);
    const liveData = await fetchCompleteData(eventId);
    
    // Arricchisci powerRankings con breakOccurred calcolato da pointByPoint
    const enrichedPowerRankings = enrichPowerRankingsWithBreaks(
      liveData.powerRankings || [],
      liveData.pointByPoint || []
    );
    
    // Conta break calcolati per logging
    const breaksCount = enrichedPowerRankings.filter(pr => pr.breakOccurred).length;
    if (breaksCount > 0) {
      console.log(`   🎾 Break calcolati da PBP: ${breaksCount}`);
    }
    
    // Salva su DB se disponibile
    if (matchRepository && liveData.event) {
      try {
        const { saveMatchToDatabase } = require('./liveManager');
        await saveMatchToDatabase(eventId, liveData, 'api-fetch');
      } catch (saveErr) {
        console.error('Failed to save fetched data:', saveErr.message);
      }
    }
    
    // Aggiungi alias tennisPowerRankings per compatibilità frontend
    res.json({
      source: 'sofascore',
      eventId,
      ...liveData,
      powerRankings: enrichedPowerRankings,
      tennisPowerRankings: enrichedPowerRankings,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`Error fetching match ${eventId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/match/:eventId/bundle - UNIFIED MATCH BUNDLE
 * 
 * ⚠️ LEGACY: This handler is now replaced by:
 * routes/match.routes.js → controllers/match.controller.js → services/bundleService.js
 * 
 * The routes are mounted first via app.use('/api', routes), so the new handler
 * takes precedence. This block remains during migration as fallback.
 * 
 * TODO: Remove this handler once bundleService is verified working
 * 
 * Single endpoint that returns ALL data needed for MatchPage.
 * Frontend does NOT compute - just displays this pre-computed state.
 * 
 * Returns:
 * - header: Match info, players, score, status
 * - features: Computed features (volatility, pressure, dominance, etc.)
 * - tabs: Data for each tab (overview, strategies, odds, stats, momentum, etc.)
 * - dataQuality: Completeness score
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md
 * @see docs/filosofie/FILOSOFIA_STATS_V3.md
 * 
 * FILOSOFIA: SofaScore → DB → Frontend (mai fetch diretto nel bundle)
 * Se match non nel DB, prima sincronizza da SofaScore, poi servi dal DB
 */
app.get('/api/match/:eventId/bundle', async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    // ============================================================
    // FILOSOFIA: CHECK CACHE FIRST - evita ricostruzione continua
    // ============================================================
    const cachedBundle = getCachedBundle(eventId);
    if (cachedBundle) {
      console.log(`📦 Bundle for ${eventId} served from cache`);
      return res.json(cachedBundle);
    }
    
    console.log(`📦 Building bundle for match ${eventId}...`);
    
    // 1. Load all raw data in parallel from DB
    let [
      matchData,
      statisticsData,
      momentumData,
      oddsData,
      pointsData,
      matchScoresData
    ] = await Promise.all([
      // Base match data from card/snapshot
      matchCardService ? matchCardService.getMatchCardFromSnapshot(parseInt(eventId)) : null,
      // Statistics
      matchRepository ? matchRepository.getMatchStatisticsNew(parseInt(eventId)) : [],
      // Momentum/PowerRankings
      matchRepository ? matchRepository.getMatchMomentum(parseInt(eventId)) : [],
      // Odds
      matchRepository ? matchRepository.getMatchOdds(parseInt(eventId)) : null,
      // Point by point (limited for bundle, full via /points)
      matchRepository ? matchRepository.getMatchPointByPoint(parseInt(eventId), { limit: 500 }) : { data: [] },
      // Match scores (set scores from match_scores table)
      supabaseClient?.supabase 
        ? supabaseClient.supabase.from('match_scores').select('*').eq('match_id', parseInt(eventId)).order('set_number')
        : { data: [] }
    ]);
    
    let finalMatchData = matchData;
    
    // ============================================================
    // FILOSOFIA: Se match non nel DB, SYNC da SofaScore → DB → Serve
    // ============================================================
    if (!finalMatchData) {
      console.log(`📦 Match ${eventId} not in DB, syncing from SofaScore...`);
      try {
        // Usa syncMatch per fetch + save in DB
        const synced = await syncMatch(parseInt(eventId));
        if (synced?.success) {
          console.log(`✅ Synced match ${eventId} from SofaScore`);
          // Ricarica dati dal DB dopo sync
          [matchData, statisticsData, momentumData, pointsData, matchScoresData] = await Promise.all([
            matchCardService ? matchCardService.getMatchCardFromSnapshot(parseInt(eventId)) : null,
            matchRepository ? matchRepository.getMatchStatisticsNew(parseInt(eventId)) : [],
            matchRepository ? matchRepository.getMatchMomentum(parseInt(eventId)) : [],
            matchRepository ? matchRepository.getMatchPointByPoint(parseInt(eventId), { limit: 500 }) : { data: [] },
            supabaseClient?.supabase 
              ? supabaseClient.supabase.from('match_scores').select('*').eq('match_id', parseInt(eventId)).order('set_number')
              : { data: [] }
          ]);
          finalMatchData = matchData;
        }
      } catch (syncErr) {
        console.warn(`⚠️ Sync failed for ${eventId}:`, syncErr.message);
      }
    }
    
    // ============================================================
    // FILOSOFIA: Se dati incompleti (surface=Unknown, quality<50), 
    // SYNC da SofaScore → DB → Rileggi
    // ============================================================
    const needsRefresh = finalMatchData && (
      finalMatchData.match?.surface === 'Unknown' ||
      finalMatchData.dataQuality < 50
    );
    
    if (needsRefresh) {
      console.log(`🔄 Match ${eventId} has incomplete data (surface=${finalMatchData.match?.surface}, quality=${finalMatchData.dataQuality}%), refreshing from SofaScore...`);
      try {
        const synced = await syncMatch(parseInt(eventId));
        if (synced?.success) {
          console.log(`✅ Refreshed match ${eventId} from SofaScore`);
          // Ricarica TUTTI i dati dal DB dopo refresh
          [matchData, statisticsData, momentumData, oddsData, pointsData, matchScoresData] = await Promise.all([
            matchCardService ? matchCardService.getMatchCardFromSnapshot(parseInt(eventId)) : null,
            matchRepository ? matchRepository.getMatchStatisticsNew(parseInt(eventId)) : [],
            matchRepository ? matchRepository.getMatchMomentum(parseInt(eventId)) : [],
            matchRepository ? matchRepository.getMatchOdds(parseInt(eventId)) : null,
            matchRepository ? matchRepository.getMatchPointByPoint(parseInt(eventId), { limit: 500 }) : { data: [] },
            supabaseClient?.supabase 
              ? supabaseClient.supabase.from('match_scores').select('*').eq('match_id', parseInt(eventId)).order('set_number')
              : { data: [] }
          ]);
          finalMatchData = matchData || finalMatchData; // Fallback se il reload fallisce
        }
      } catch (refreshErr) {
        console.warn(`⚠️ Refresh failed for ${eventId}:`, refreshErr.message);
        // Continua con i dati esistenti
      }
    }
    
    if (!finalMatchData) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Enrich match with scores from match_scores table if sets are empty
    const setScores = matchScoresData?.data || [];
    if (setScores.length > 0 && (!finalMatchData.match?.sets || finalMatchData.match.sets.length === 0)) {
      console.log(`📊 Enriching match ${eventId} with ${setScores.length} set scores from match_scores table`);
      if (!finalMatchData.match) finalMatchData.match = {};
      finalMatchData.match.sets = setScores.map(s => ({
        home: s.home_games,
        away: s.away_games,
        tiebreak: s.home_tiebreak || s.away_tiebreak || null
      }));
    }
    
    // 2. Compute Features using Feature Engine
    const { computeFeatures } = require('./utils/featureEngine');
    
    // Per le features usiamo i dati ALL (match totale)
    const allPeriodStats = statisticsData?.ALL || {};
    const homeStats = {
      aces: allPeriodStats.p1_aces,
      doubleFaults: allPeriodStats.p1_double_faults,
      firstServePct: allPeriodStats.p1_first_serve_pct,
      firstServePointsWonPct: allPeriodStats.p1_first_serve_won && allPeriodStats.p1_first_serve_total 
        ? Math.round((allPeriodStats.p1_first_serve_won / allPeriodStats.p1_first_serve_total) * 100) 
        : undefined,
      totalPointsWon: allPeriodStats.p1_total_points_won,
      breakPointsWon: allPeriodStats.p1_break_points_won
    };
    const awayStats = {
      aces: allPeriodStats.p2_aces,
      doubleFaults: allPeriodStats.p2_double_faults,
      firstServePct: allPeriodStats.p2_first_serve_pct,
      firstServePointsWonPct: allPeriodStats.p2_first_serve_won && allPeriodStats.p2_first_serve_total
        ? Math.round((allPeriodStats.p2_first_serve_won / allPeriodStats.p2_first_serve_total) * 100)
        : undefined,
      totalPointsWon: allPeriodStats.p2_total_points_won,
      breakPointsWon: allPeriodStats.p2_break_points_won
    };
    
    const featureInput = {
      powerRankings: momentumData || finalMatchData.momentum || [],
      statistics: {
        home: homeStats || finalMatchData.statistics?.[0] || {},
        away: awayStats || finalMatchData.statistics?.[1] || {}
      },
      score: extractScore(finalMatchData),
      odds: oddsData || finalMatchData.odds || [],
      serving: finalMatchData.match?.serving || null,
      gameScore: finalMatchData.match?.gameScore || null,
      // Passa i dati giocatori per calcoli fallback (rankings)
      player1: finalMatchData.player1 || {},
      player2: finalMatchData.player2 || {}
    };
    
    const features = computeFeatures(featureInput);
    
    // 3. Evaluate Strategies using Strategy Engine
    const strategyEngine = require('./strategies/strategyEngine');
    
    const strategyInput = {
      features,
      score: extractScore(finalMatchData),
      statistics: featureInput.statistics,
      odds: {
        matchWinner: {
          current: oddsData?.matchWinner || finalMatchData.odds?.matchWinner || 2.0
        }
      },
      players: {
        home: finalMatchData.player1,
        away: finalMatchData.player2
      }
    };
    
    const strategySignals = strategyEngine.evaluateAll(strategyInput);
    const strategySummary = strategyEngine.getSummary(strategySignals);
    
    // 4. Build tabs data
    // Normalize odds to expected format: { home: { value, trend }, away: { value, trend } }
    const normalizedOdds = normalizeOddsForBundle(oddsData, finalMatchData);
    
    // Point-by-point: SEMPRE dal DB (filosofia: SofaScore → DB → Frontend)
    // Se non ci sono dati PbP nel DB, il sync li ha già caricati da SofaScore
    const normalizedPoints = normalizePointsForBundle(pointsData);
    
    // Build stats first so we can use calculated values in overview
    // FILOSOFIA: Prima prova statisticsData (da match_statistics_new con periodi)
    // Se vuoto, usa statistics dallo snapshot (stats_json con formato SofaScore raw)
    const hasNewStats = statisticsData && Object.keys(statisticsData).length > 0;
    const statsSource = hasNewStats ? statisticsData : finalMatchData?.statistics;
    
    // DEBUG: Log per verificare da dove arrivano i dati stats
    console.log(`📊 Stats source for ${eventId}:`, {
      hasNewStats,
      statsSourceType: Array.isArray(statsSource) ? 'array' : typeof statsSource,
      statsSourceKeys: statsSource ? Object.keys(statsSource).slice(0, 5) : null,
      hasFinalMatchStatistics: !!finalMatchData?.statistics,
      finalMatchStatisticsType: Array.isArray(finalMatchData?.statistics) ? 'array' : typeof finalMatchData?.statistics
    });
    
    const statsTab = buildStatsTab(statsSource, finalMatchData, extractScore(finalMatchData), normalizedPoints);
    
    // DEBUG: Log risultato buildStatsTab
    console.log(`📊 Stats result for ${eventId}:`, {
      dataSource: statsTab?.dataSource,
      hasPoints: !!statsTab?.points,
      homeWinners: statsTab?.points?.home?.winners,
      awayWinners: statsTab?.points?.away?.winners,
      periods: statsTab?.periods
    });
    
    const tabs = {
      overview: buildOverviewTab(finalMatchData, features, strategySignals, statsTab),
      strategies: {
        signals: strategySignals,
        summary: strategySummary,
        lastUpdated: new Date().toISOString()
      },
      odds: {
        matchWinner: normalizedOdds,
        history: oddsData?.all || [],
        spreads: oddsData?.spreads || null,
        totals: oddsData?.totals || null
      },
      pointByPoint: normalizedPoints,
      stats: statsTab,
      momentum: {
        powerRankings: momentumData || finalMatchData.momentum || [],
        features: {
          trend: features.momentum?.trend || 'stable',
          recentSwing: features.momentum?.recentSwing || 0,
          breakCount: features.momentum?.breakCount || 0,
          last5avg: features.momentum?.last5avg || 50
        },
        // qualityStats usa i valori già calcolati in statsTab
        qualityStats: {
          home: {
            winners: statsTab.points.home.winners,
            ue: statsTab.points.home.unforcedErrors
          },
          away: {
            winners: statsTab.points.away.winners,
            ue: statsTab.points.away.unforcedErrors
          }
        }
      },
      predictor: {
        // Predictor uses features + historical data
        winProbability: calculateWinProbability(features, featureInput.statistics),
        keyFactors: extractKeyFactors(features, strategySignals),
        // Aggiungi breakProbability per PredictorTab
        breakProbability: features.breakProbability || 25
      },
      journal: {
        // Journal is frontend-only (localStorage)
        enabled: true
      }
    };
    
    // 5. Calculate data quality
    const dataQuality = calculateDataQuality(finalMatchData, statisticsData, momentumData);
    
    // 6. Build header
    // Handle status as string or object
    const rawStatus = finalMatchData.match?.status;
    const matchStatus = typeof rawStatus === 'string' 
      ? rawStatus 
      : (rawStatus?.type || rawStatus?.description || 'unknown');
    
    const header = {
      match: {
        id: finalMatchData.match?.id || parseInt(eventId),
        status: matchStatus,
        startTime: finalMatchData.match?.startTimestamp,
        tournament: finalMatchData.tournament?.name || finalMatchData.match?.tournament?.name,
        round: finalMatchData.match?.roundInfo?.name || finalMatchData.match?.round,
        surface: finalMatchData.match?.surface || finalMatchData.tournament?.surface
      },
      players: {
        home: {
          id: finalMatchData.player1?.id,
          name: finalMatchData.player1?.name || finalMatchData.match?.homeTeam?.name,
          country: finalMatchData.player1?.country,
          ranking: finalMatchData.player1?.currentRanking || finalMatchData.player1?.rankingAtMatch,
          seed: finalMatchData.player1?.seed
        },
        away: {
          id: finalMatchData.player2?.id,
          name: finalMatchData.player2?.name || finalMatchData.match?.awayTeam?.name,
          country: finalMatchData.player2?.country,
          ranking: finalMatchData.player2?.currentRanking || finalMatchData.player2?.rankingAtMatch,
          seed: finalMatchData.player2?.seed
        }
      },
      score: extractScore(finalMatchData),
      odds: {
        home: oddsData?.home || finalMatchData.odds?.home,
        away: oddsData?.away || finalMatchData.odds?.away
      },
      features: {
        volatility: features.volatility,
        pressure: features.pressure,
        dominance: features.dominance,
        // Questi valori possono essere null se non ci sono dati reali
        serveDominance: features.serveDominance,
        returnDominance: features.returnDominance,
        breakProbability: features.breakProbability,
        hasRealData: features.hasRealData,
        momentum: features.momentum
      }
    };
    
    // 7. Return the unified bundle
    // DEEP-001: Integrate risk engine if available
    let riskAnalysis = null;
    try {
      const riskEngine = require('./services/riskEngine');
      // Calcola risk se abbiamo odds e features
      if (normalizedOdds?.home?.value && features.dominance) {
        const modelProb = features.dominance / 100; // Converti dominance in probabilità
        riskAnalysis = riskEngine.analyzeRisk({
          modelProb,
          marketOdds: normalizedOdds.home.value,
          bankroll: 1000, // Default, frontend può ricalcolare
          confidence: (100 - features.volatility) / 100,
          volatility: features.volatility
        });
      }
    } catch (e) {
      // riskEngine non disponibile, continua senza
    }
    
    // DEEP-004: as_of_time per il bundle
    const bundleAsOfTime = new Date().toISOString();
    
    // =================================================================
    // SURFACE SPLITS (FILOSOFIA_STATS surface analysis)
    // =================================================================
    let surfaceSplitsData = null;
    try {
      if (playerStatsService?.getMatchSurfaceSplits) {
        const player1Name = finalMatchData.player1?.name || finalMatchData.match?.homeTeam?.name;
        const player2Name = finalMatchData.player2?.name || finalMatchData.match?.awayTeam?.name;
        const matchSurface = finalMatchData.match?.surface || finalMatchData.tournament?.surface;
        
        if (player1Name && player2Name && matchSurface) {
          surfaceSplitsData = await playerStatsService.getMatchSurfaceSplits(
            player1Name, 
            player2Name, 
            matchSurface,
            { window: 'career' }
          );
        }
      }
    } catch (surfaceErr) {
      console.warn(`⚠️ Surface splits calculation failed:`, surfaceErr.message);
    }
    
    // Add surface splits to stats tab if available
    if (surfaceSplitsData) {
      tabs.stats = tabs.stats || {};
      tabs.stats.surfaceSplits = {
        playerA: surfaceSplitsData.playerA,
        playerB: surfaceSplitsData.playerB,
        matchSurface: surfaceSplitsData.matchSurface,
        comparison: surfaceSplitsData.comparison
      };
    }
    
    const bundle = {
      matchId: parseInt(eventId),
      timestamp: new Date().toISOString(),
      header,
      features,
      tabs,
      dataQuality,
      meta: {
        version: '2.0',
        source: finalMatchData.fromSnapshot ? 'snapshot' : (finalMatchData.fromLegacy ? 'legacy' : 'live'),
        strategiesCount: strategySignals.length,
        readyStrategies: strategySummary.ready,
        // DEEP-004: TEMPORAL SEMANTICS - as_of_time per il bundle
        as_of_time: bundleAsOfTime,
        // DEEP-001: Risk analysis output
        risk: riskAnalysis,
        // FILOSOFIA_LINEAGE_VERSIONING compliance
        versions: {
          bundle_schema: '2.0.0',
          features: require('./utils/featureEngine').FEATURE_ENGINE_VERSION || 'v1.0.0',
          strategies: require('./strategies/strategyEngine').STRATEGY_ENGINE_VERSION || 'v1.0.0',
          risk: riskAnalysis?.meta?.version || 'v1.0.0'
        }
      }
    };
    
    // =================================================================
    // QUALITY EVALUATION (FILOSOFIA_OBSERVABILITY)
    // =================================================================
    try {
      const dataQualityChecker = require('./services/dataQualityChecker');
      const qualityResult = dataQualityChecker.evaluateBundleQuality(bundle);
      bundle.meta.quality = qualityResult;
      
      if (qualityResult.status === 'FAIL') {
        console.warn(`⚠️ Bundle quality FAIL for ${eventId}:`, qualityResult.issues.map(i => i.code).join(', '));
      }
    } catch (qualityErr) {
      console.warn(`⚠️ Quality check failed:`, qualityErr.message);
    }
    
    // =================================================================
    // BET DECISION LOGGING (if enabled via env and recommendation exists)
    // =================================================================
    if (process.env.LOG_BET_DECISIONS === 'true' && riskAnalysis?.recommendation) {
      try {
        const betDecisionsRepo = require('./db/betDecisionsRepository');
        
        // Determine decision type from risk analysis
        let decision = 'NO_BET';
        if (riskAnalysis.recommendation === 'BET' && riskAnalysis.edge?.hasEdge) {
          decision = 'RECOMMEND';
        } else if (riskAnalysis.edge?.value > 0) {
          decision = 'WATCH';
        }
        
        // Only log if there's some action (not pure NO_BET with no edge)
        if (decision !== 'NO_BET' || riskAnalysis.edge?.value > -0.05) {
          await betDecisionsRepo.insertDecision({
            matchId: parseInt(eventId),
            playerAId: finalMatchData.player1?.id,
            playerBId: finalMatchData.player2?.id,
            tournamentId: finalMatchData.tournament?.id,
            asOfTime: bundleAsOfTime,
            versions: bundle.meta.versions,
            market: 'match_winner',
            selection: features.dominantPlayer === 'home' ? 'home' : 'away',
            pricing: {
              priceSeen: normalizedOdds?.home?.value,
              priceMin: riskAnalysis.priceMin,
              impliedProb: normalizedOdds?.home?.value ? 1 / normalizedOdds.home.value : null,
              modelProb: features.dominance / 100,
              edge: riskAnalysis.edge?.value
            },
            stake: {
              bankroll: 1000,
              recommended: riskAnalysis.stake?.amount,
              kellyFraction: 0.25
            },
            risk: riskAnalysis.risk,
            decision,
            confidence: (100 - features.volatility) / 100,
            reasonCodes: strategySignals.filter(s => s.ready).map(s => s.name),
            bundleMeta: {
              source: bundle.meta.source,
              quality: bundle.meta.quality?.status,
              qualityScore: bundle.meta.quality?.score
            }
          });
        }
      } catch (betLogErr) {
        // Non-blocking: log error but continue
        console.warn(`⚠️ Bet decision logging failed:`, betLogErr.message);
      }
    }
    
    // ============================================================
    // FILOSOFIA: CACHE BUNDLE - evita ricostruzione continua
    // ============================================================
    const bundleMatchStatus = bundle.header?.match?.status;
    const isLive = bundleMatchStatus === 'inprogress' || bundleMatchStatus === 'live' || bundleMatchStatus === 'playing';
    setCachedBundle(eventId, bundle, isLive);
    
    console.log(`✅ Bundle built for ${eventId}: quality=${dataQuality}%, strategies=${strategySignals.length} (${strategySummary.ready} ready)`);
    res.json(bundle);
    
  } catch (err) {
    console.error(`Error building bundle for ${eventId}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Helper functions for bundle

/**
 * Trasforma un match dalla tabella legacy "matches" (XLSX import) 
 * nel formato atteso dal bundle
 */
/**
 * Normalizza odds nel formato atteso dal frontend
 * Frontend si aspetta: { home: { value, trend }, away: { value, trend } }
 * 
 * TEMPORAL SEMANTICS (FILOSOFIA_TEMPORAL_SEMANTICS compliance):
 * - event_time: timestamp del movimento delle quote
 * 
 * FILOSOFIA_ODDS compliance: odds timestamp for movement tracking
 * Pattern: event_time for odds, ingestion_time for tracking when data arrived
 */
function normalizeOddsForBundle(oddsData, matchData) {
  // Caso 1: oddsData dal repository (structure: { opening, closing, all })
  if (oddsData?.closing || oddsData?.opening) {
    const current = oddsData.closing || oddsData.opening;
    const opening = oddsData.opening || oddsData.closing;
    
    // Calcola trend (differenza tra opening e closing)
    const homeTrend = current.odds_player1 - (opening?.odds_player1 || current.odds_player1);
    const awayTrend = current.odds_player2 - (opening?.odds_player2 || current.odds_player2);
    
    return {
      home: { 
        value: current.odds_player1, 
        trend: homeTrend > 0.05 ? 1 : (homeTrend < -0.05 ? -1 : 0) 
      },
      away: { 
        value: current.odds_player2, 
        trend: awayTrend > 0.05 ? 1 : (awayTrend < -0.05 ? -1 : 0) 
      },
      // DEEP-007: TEMPORAL SEMANTICS - event_time per movimento quote
      event_time: current.recorded_at || current.timestamp || new Date().toISOString()
    };
  }
  
  // Caso 2: matchData.odds già strutturato
  if (matchData?.odds?.matchWinner) {
    const mw = matchData.odds.matchWinner;
    // Se già nel formato corretto
    if (mw.home?.value !== undefined) {
      return mw;
    }
    // Se è un oggetto semplice { home: number, away: number }
    if (typeof mw.home === 'number') {
      return {
        home: { value: mw.home, trend: 0 },
        away: { value: mw.away, trend: 0 }
      };
    }
  }
  
  // Caso 3: header.odds (valori semplici)
  if (matchData?.odds?.home !== undefined) {
    return {
      home: { value: matchData.odds.home, trend: 0 },
      away: { value: matchData.odds.away, trend: 0 }
    };
  }
  
  // Nessun dato disponibile
  return null;
}

/**
 * Normalizza point-by-point nel formato atteso dal frontend
 * Frontend si aspetta: [{ time, set, game, server, score, description, type, isBreakPoint, rallyLength, gameServer, gameWinner, gameIsBreak }]
 * 
 * FILOSOFIA: Calcola gameIsBreak da serving/scoring nel DB
 * - serving=1 = home serve, serving=2 = away serve
 * - scoring=1 = home wins game, scoring=2 = away wins game
 * - BREAK = serving !== scoring
 * 
 * Supporta:
 * - DB format point_by_point: { set_number, game_number, point_index, home_point, away_point, serving, scoring }
 * - DB format match_point_by_point_new: { set_number, game_number, point_number, score_p1, score_p2, server, point_winner }
 */
function normalizePointsForBundle(pointsData) {
  if (!pointsData?.data || !Array.isArray(pointsData.data)) {
    return { points: [], games: [], hasMore: false, total: 0, source: 'none' };
  }
  
  // Prima, raggruppa per game per calcolare break info
  const gameMap = new Map();
  
  // 1. Raccogli punti per game
  for (const p of pointsData.data) {
    const setNum = p.set_number || p.set || 1;
    const gameNum = p.game_number || p.game || 1;
    const key = `${setNum}-${gameNum}`;
    
    if (!gameMap.has(key)) {
      gameMap.set(key, { points: [] });
    }
    gameMap.get(key).points.push(p);
  }

  // 2. Analizza ogni game per determinare server, winner e break
  for (const [key, gameData] of gameMap) {
    const points = gameData.points;
    // Ordina per sicurezza
    points.sort((a, b) => (a.point_number || a.point_index || 0) - (b.point_number || b.point_index || 0));
    
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    
    // Determine Server (dal primo punto) - serving indica chi serve
    // serving=1 → home, serving=2 → away
    let server = 'unknown';
    const rawServer = firstPoint.server || firstPoint.serving;
    if (rawServer === 1 || rawServer === 'home') server = 'home';
    else if (rawServer === 2 || rawServer === 'away') server = 'away';
    
    // Determine Winner - FILOSOFIA: usa 'scoring' che indica chi ha VINTO il game
    // scoring=1 → home vince, scoring=2 → away vince
    // BREAK = serving !== scoring (chi serve perde)
    let gameWinner = null;
    
    // Cerca scoring in qualsiasi punto del game (di solito è nell'ultimo)
    for (const p of points) {
      if (p.scoring === 1 || p.scoring === '1') {
        gameWinner = 'home';
        break;
      } else if (p.scoring === 2 || p.scoring === '2') {
        gameWinner = 'away';
        break;
      }
    }
    
    // Determine Break - FILOSOFIA: serving !== scoring
    // Calculate break from serving/scoring data
    const calculatedBreak = (server !== 'unknown' && gameWinner !== null && server !== gameWinner);
    
    // If break_occurred is explicitly true in DB (from SVG that detected break), use that
    // Otherwise use the calculated value
    const breakOccurredFromDb = points.some(p => p.break_occurred === true);
    const isBreak = breakOccurredFromDb || calculatedBreak;
    
    // Salva info calcolate
    gameData.set = points[0].set_number || points[0].set;
    gameData.game = points[0].game_number || points[0].game;
    gameData.gameServer = server;
    gameData.gameWinner = gameWinner;
    gameData.gameIsBreak = isBreak;
    gameData.pointsCount = points.length;
  }
  
  const games = Array.from(gameMap.values()).map(g => ({
    set: g.set,
    game: g.game,
    gameServer: g.gameServer,
    gameWinner: g.gameWinner,
    gameIsBreak: g.gameIsBreak,
    pointsCount: g.pointsCount
  }));
  
  const points = pointsData.data.map(p => {
    const setNum = p.set_number || p.set || 1;
    const gameNum = p.game_number || p.game || 1;
    const key = `${setNum}-${gameNum}`;
    const gameInfo = gameMap.get(key) || {};
    
    // Determine server - support multiple formats
    let server = 'unknown';
    if (p.server === 1 || p.serving === 1) {
      server = 'home';
    } else if (p.server === 2 || p.serving === 2) {
      server = 'away';
    } else if (p.server === 'home' || p.serving === 'home') {
      server = 'home';
    } else if (p.server === 'away' || p.serving === 'away') {
      server = 'away';
    } else if (p.server_id && p.home_player_id) {
      server = p.server_id === p.home_player_id ? 'home' : 'away';
    }
    
    // Usa gameServer se server non determinato
    if (server === 'unknown' && gameInfo.gameServer) {
      server = gameInfo.gameServer;
    }
    
    // Determine score - FORMATO HOME-AWAY (non server-receiver)
    // Nel tennis il punteggio è normalmente server-receiver, ma per chiarezza UI
    // lo mostriamo sempre come HOME-AWAY (l'ordine dei giocatori nell'header)
    // PRIORITÀ: home_point/away_point > score_p1/score_p2 > score_after > score_before
    let score = '';
    if (p.home_point !== undefined && p.away_point !== undefined) {
      score = `${p.home_point}-${p.away_point}`;
    } else if (p.homePoint !== undefined && p.awayPoint !== undefined) {
      score = `${p.homePoint}-${p.awayPoint}`;
    } else if (p.score_p1 !== undefined && p.score_p2 !== undefined) {
      score = `${p.score_p1}-${p.score_p2}`;
    } else if (p.score_after) {
      score = p.score_after;
    } else if (p.score_before) {
      score = p.score_before;
    }
    
    // Determine point winner
    let pointWinner = null;
    if (p.point_winner === 1) pointWinner = 'home';
    else if (p.point_winner === 2) pointWinner = 'away';
    else if (p.point_winner === 'home' || p.point_winner === 'away') pointWinner = p.point_winner;
    
    // Determine type based on flags
    let type = 'regular';
    let isAce = false;
    let isDoubleFault = false;
    
    if (p.is_break_point) type = 'break_point';
    else if (p.is_ace || p.point_description === 1) { type = 'ace'; isAce = true; }
    else if (p.is_double_fault || p.point_description === 2) { type = 'double_fault'; isDoubleFault = true; }
    else if (p.is_winner) type = 'winner';
    else if (p.is_unforced_error) type = 'unforced_error';
    else if (p.point_type) type = p.point_type;
    
    return {
      time: p.timestamp || p.created_at || null,
      set: setNum,
      game: gameNum,
      server,
      score,
      pointWinner,
      description: p.point_description || p.description || '',
      type,
      isBreakPoint: p.is_break_point || false,
      isAce,
      isDoubleFault,
      isSetPoint: p.is_set_point || false,
      isMatchPoint: p.is_match_point || false,
      rallyLength: p.rally_length || null,
      pointNumber: p.point_number || p.point_index || null,
      // Game context (calcolato da serving/scoring)
      gameServer: gameInfo.gameServer || server,
      gameWinner: gameInfo.gameWinner,
      gameIsBreak: gameInfo.gameIsBreak || false,
      // Preserve momentum value for debugging
      value: p.value,
      value_svg: p.value_svg
    };
  });
  
  return {
    points,
    games,
    hasMore: pointsData.hasMore || false,
    total: pointsData.total || points.length,
    source: pointsData.source || 'database'
  };
}

/**
 * Helper: determina se un punteggio è break point
 */
function isBreakPointFromScore(score, server) {
  if (!score || !server) return false;
  const parts = score.split('-');
  if (parts.length !== 2) return false;
  
  const [p1, p2] = parts;
  
  // Se home serve e away è a 40/AD (ma non home), è break point per away
  if (server === 'home') {
    if ((p2 === '40' || p2 === 'AD') && p1 !== '40' && p1 !== 'AD') return true;
    if (p2 === 'AD') return true;
  }
  // Se away serve e home è a 40/AD (ma non away), è break point per home
  if (server === 'away') {
    if ((p1 === '40' || p1 === 'AD') && p2 !== '40' && p2 !== 'AD') return true;
    if (p1 === 'AD') return true;
  }
  
  return false;
}

function extractScore(matchData) {
  const match = matchData.match || {};
  const homeScore = match.homeScore || {};
  const awayScore = match.awayScore || {};
  
  // Check if we have sets array
  let sets;
  if (match.sets && Array.isArray(match.sets) && match.sets.length > 0) {
    // Sets array exists - normalize to { home, away } format
    sets = match.sets.map(s => ({
      // Support both formats: { home, away } or { player1, player2 }
      home: s.home ?? s.player1 ?? 0,
      away: s.away ?? s.player2 ?? 0,
      tiebreak: s.tiebreak ?? null
    }));
  } else if (homeScore.period1 !== undefined || awayScore.period1 !== undefined) {
    // SofaScore format: build from homeScore.period1, etc.
    sets = buildSetsArray(homeScore, awayScore);
  } else if (match.set1_p1 !== undefined || match.set1_p2 !== undefined) {
    // Direct DB format: set1_p1, set1_p2, etc.
    sets = buildSetsFromDbFields(match);
  } else {
    // No score data available
    sets = [];
  }
  
  return {
    sets,
    game: match.gameScore || null,
    point: match.pointScore || null,
    serving: match.serving || null
  };
}

function buildSetsFromDbFields(match) {
  const sets = [];
  for (let i = 1; i <= 5; i++) {
    const p1 = match[`set${i}_p1`];
    const p2 = match[`set${i}_p2`];
    if (p1 != null || p2 != null) {
      sets.push({
        home: p1 ?? 0,
        away: p2 ?? 0,
        tiebreak: match[`set${i}_tb`] ?? null
      });
    }
  }
  return sets;
}

function buildSetsArray(homeScore, awayScore) {
  const sets = [];
  for (let i = 1; i <= 5; i++) {
    const homeSet = homeScore[`period${i}`];
    const awaySet = awayScore[`period${i}`];
    if (homeSet !== undefined || awaySet !== undefined) {
      sets.push({
        home: homeSet || 0,
        away: awaySet || 0,
        tiebreak: homeScore[`period${i}TieBreak`] || awayScore[`period${i}TieBreak`] || null
      });
    }
  }
  return sets;
}

function buildOverviewTab(matchData, features, strategies, statsTab) {
  const readyStrategies = strategies.filter(s => s.status === 'READY');
  
  // Use calculated stats from statsTab (which estimates if no DB data)
  const keyStats = {
    aces: {
      home: statsTab?.serve?.home?.aces || 0,
      away: statsTab?.serve?.away?.aces || 0
    },
    doubleFaults: {
      home: statsTab?.serve?.home?.doubleFaults || 0,
      away: statsTab?.serve?.away?.doubleFaults || 0
    },
    breakPoints: {
      home: statsTab?.return?.home?.breakPointsWon || 0,
      away: statsTab?.return?.away?.breakPointsWon || 0
    }
  };
  
  return {
    h2h: matchData.h2h || null,
    recentForm: {
      home: matchData.player1?.recentForm || [],
      away: matchData.player2?.recentForm || []
    },
    keyStats,
    alerts: readyStrategies.map(s => ({
      type: 'strategy',
      level: 'ready',
      message: `${s.name}: ${s.reasons[0] || s.entryRule}`,
      strategyId: s.id
    })),
    features: {
      volatility: features.volatility,
      pressure: features.pressure,
      momentum: features.momentum?.trend || 'stable'
    }
  };
}

function buildStatsTab(statisticsData, matchData, score, pointByPoint = []) {
  // DEBUG: Log input
  console.log('📊 buildStatsTab input:', {
    isArray: Array.isArray(statisticsData),
    type: typeof statisticsData,
    keys: statisticsData ? Object.keys(statisticsData).slice(0, 5) : null,
    firstPeriod: Array.isArray(statisticsData) ? statisticsData[0]?.period : null
  });
  
  // statisticsData può essere:
  // 1. Oggetto { ALL: {...}, SET1: {...}, SET2: {...}, ... } (formato DB)
  // 2. Vecchio formato { home: {...}, away: {...} }
  // 3. Array SofaScore raw [{period: 'ALL', groups: [...]}] (da stats_json snapshot)
  
  // Helper per convertire formato SofaScore raw array in formato byPeriod
  const convertSofaScoreArrayFormat = (statsArray) => {
    if (!Array.isArray(statsArray)) return null;
    
    const result = {};
    
    for (const periodData of statsArray) {
      const period = periodData.period;
      if (!period || !periodData.groups) continue;
      
      // Converti period da SofaScore (ALL, 1ST, 2ND) a nostro formato (ALL, SET1, SET2)
      let periodKey = period;
      if (period === '1ST') periodKey = 'SET1';
      else if (period === '2ND') periodKey = 'SET2';
      else if (period === '3RD') periodKey = 'SET3';
      else if (period === '4TH') periodKey = 'SET4';
      else if (period === '5TH') periodKey = 'SET5';
      
      // Estrai stats dai groups
      const stats = { home: {}, away: {} };
      
      for (const group of periodData.groups) {
        if (!group.statisticsItems) continue;
        
        for (const item of group.statisticsItems) {
          const key = item.key;
          
          switch (key) {
            case 'aces':
              stats.home.aces = item.homeValue || 0;
              stats.away.aces = item.awayValue || 0;
              break;
            case 'doubleFaults':
              stats.home.doubleFaults = item.homeValue || 0;
              stats.away.doubleFaults = item.awayValue || 0;
              break;
            case 'firstServeAccuracy':
              // homeTotal e awayTotal sono i totali, homeValue/awayValue sono quelli riusciti
              stats.home.firstServePct = item.homeTotal ? Math.round((item.homeValue / item.homeTotal) * 100) : 0;
              stats.away.firstServePct = item.awayTotal ? Math.round((item.awayValue / item.awayTotal) * 100) : 0;
              // RAW: firstServeIn / firstServeTotal (es. 45/57)
              stats.home.firstServeIn = item.homeValue || 0;
              stats.home.firstServeTotal = item.homeTotal || 0;
              stats.away.firstServeIn = item.awayValue || 0;
              stats.away.firstServeTotal = item.awayTotal || 0;
              break;
            case 'secondServeAccuracy':
              // Secondo servizio: homeValue/homeTotal = seconde andate dentro / seconde servite
              // In tennis tutte le seconde "vanno dentro" (altrimenti è doppio fallo)
              // Questo campo potrebbe essere ridondante ma SofaScore lo fornisce
              stats.home.secondServeIn = item.homeValue || 0;
              stats.home.secondServeTotal = item.homeTotal || 0;
              stats.away.secondServeIn = item.awayValue || 0;
              stats.away.secondServeTotal = item.awayTotal || 0;
              break;
            case 'firstServePointsAccuracy':
              stats.home.firstServePointsWonPct = item.homeTotal ? Math.round((item.homeValue / item.homeTotal) * 100) : 0;
              stats.away.firstServePointsWonPct = item.awayTotal ? Math.round((item.awayValue / item.awayTotal) * 100) : 0;
              // RAW: firstServePointsWon / firstServeIn (es. 37/45)
              stats.home.firstServePointsWon = item.homeValue || 0;
              stats.home.firstServePointsIn = item.homeTotal || 0;
              stats.away.firstServePointsWon = item.awayValue || 0;
              stats.away.firstServePointsIn = item.awayTotal || 0;
              break;
            case 'secondServePointsAccuracy':
              stats.home.secondServePointsWonPct = item.homeTotal ? Math.round((item.homeValue / item.homeTotal) * 100) : 0;
              stats.away.secondServePointsWonPct = item.awayTotal ? Math.round((item.awayValue / item.awayTotal) * 100) : 0;
              // RAW: secondServePointsWon / secondServeTotal (es. 9/12)
              stats.home.secondServePointsWon = item.homeValue || 0;
              stats.home.secondServeTotal = item.homeTotal || 0;
              stats.away.secondServePointsWon = item.awayValue || 0;
              stats.away.secondServeTotal = item.awayTotal || 0;
              break;
            case 'breakPointsSaved':
              // breakPointsSaved: quanti BP ha SALVATO al servizio
              // homeValue = BP salvati da home, homeTotal = BP affrontati da home
              stats.home.breakPointsSaved = item.homeValue || 0;
              stats.home.breakPointsFaced = item.homeTotal || 0;
              stats.away.breakPointsSaved = item.awayValue || 0;
              stats.away.breakPointsFaced = item.awayTotal || 0;
              break;
            case 'breakPointsScored':
              // Break points convertiti (quando rispondi)
              // homeValue = BP convertiti (NON c'è homeTotal in SofaScore per questo!)
              stats.home.breakPointsWon = item.homeValue || 0;
              stats.away.breakPointsWon = item.awayValue || 0;
              // breakPointsTotal viene calcolato dopo: è uguale a breakPointsFaced dell'avversario
              break;
            case 'pointsTotal':
              stats.home.totalPointsWon = item.homeValue || 0;
              stats.away.totalPointsWon = item.awayValue || 0;
              break;
            case 'servicePointsScored':
              stats.home.servicePointsWon = item.homeValue || 0;
              stats.away.servicePointsWon = item.awayValue || 0;
              break;
            case 'receiverPointsScored':
              stats.home.receiverPointsWon = item.homeValue || 0;
              stats.away.receiverPointsWon = item.awayValue || 0;
              break;
            case 'maxPointsInRow':
              // Max punti consecutivi vinti
              stats.home.maxConsecutivePointsWon = item.homeValue || 0;
              stats.away.maxConsecutivePointsWon = item.awayValue || 0;
              break;
            case 'gamesWon':
              // Game totali vinti
              stats.home.gamesWon = item.homeValue || 0;
              stats.away.gamesWon = item.awayValue || 0;
              break;
            case 'maxGamesInRow':
              // Max game consecutivi vinti
              stats.home.maxConsecutiveGamesWon = item.homeValue || 0;
              stats.away.maxConsecutiveGamesWon = item.awayValue || 0;
              break;
            case 'tiebreaks':
              // Tiebreak vinti
              stats.home.tiebreaksWon = item.homeValue || 0;
              stats.away.tiebreaksWon = item.awayValue || 0;
              break;
            case 'firstReturnPoints':
              // Prima risposta: punti vinti quando avversario serve prima
              stats.home.firstReturnPointsWon = item.homeValue || 0;
              stats.home.firstReturnPointsTotal = item.homeTotal || 0;
              stats.away.firstReturnPointsWon = item.awayValue || 0;
              stats.away.firstReturnPointsTotal = item.awayTotal || 0;
              break;
            case 'secondReturnPoints':
              // Seconda risposta: punti vinti quando avversario serve seconda
              stats.home.secondReturnPointsWon = item.homeValue || 0;
              stats.home.secondReturnPointsTotal = item.homeTotal || 0;
              stats.away.secondReturnPointsWon = item.awayValue || 0;
              stats.away.secondReturnPointsTotal = item.awayTotal || 0;
              break;
            case 'winners':
              // Winners: colpi vincenti (SofaScore potrebbe fornirli)
              stats.home.winners = item.homeValue || 0;
              stats.away.winners = item.awayValue || 0;
              break;
            case 'unforcedErrors':
              // Unforced Errors: errori non forzati (SofaScore potrebbe fornirli)
              stats.home.unforcedErrors = item.homeValue || 0;
              stats.away.unforcedErrors = item.awayValue || 0;
              break;
            case 'serviceGamesTotal':
              // Game di servizio giocati (nota: chiave SofaScore diversa)
              stats.home.serviceGamesPlayed = item.homeValue || 0;
              stats.away.serviceGamesPlayed = item.awayValue || 0;
              // Usato anche per returnGamesPlayed dell'avversario
              break;
            case 'serviceGamesPlayed':
              // Fallback per eventuale chiave alternativa
              stats.home.serviceGamesPlayed = item.homeValue || 0;
              stats.away.serviceGamesPlayed = item.awayValue || 0;
              break;
            case 'returnGamesPlayed':
              // Game di risposta giocati
              stats.home.returnGamesPlayed = item.homeValue || 0;
              stats.away.returnGamesPlayed = item.awayValue || 0;
              break;
            case 'serviceGamesWon':
              // Game di servizio VINTI (diverso da giocati)
              stats.home.serviceGamesWon = item.homeValue || 0;
              stats.away.serviceGamesWon = item.awayValue || 0;
              break;
            // Le seguenti sono chiavi alternative che potrebbero apparire
            case 'maxPointsInARow':
            case 'consecutivePointsWon':
              // Punti vincenti consecutivi (max) - fallback se maxPointsInRow non presente
              if (!stats.home.maxConsecutivePointsWon) {
                stats.home.maxConsecutivePointsWon = item.homeValue || 0;
                stats.away.maxConsecutivePointsWon = item.awayValue || 0;
              }
              break;
            case 'gamesInARow':
            case 'consecutiveGamesWon':
              // Game consecutivi vinti (max) - fallback se maxGamesInRow non presente
              if (!stats.home.maxConsecutiveGamesWon) {
                stats.home.maxConsecutiveGamesWon = item.homeValue || 0;
                stats.away.maxConsecutiveGamesWon = item.awayValue || 0;
              }
              break;
          }
        }
      }
      
      // FILOSOFIA: Calcola totalPointsWon per i SET quando pointsTotal non è disponibile
      // SofaScore fornisce pointsTotal SOLO per ALL, per i SET usiamo: servicePointsWon + receiverPointsWon
      if (!stats.home.totalPointsWon && stats.home.servicePointsWon !== undefined && stats.home.receiverPointsWon !== undefined) {
        stats.home.totalPointsWon = (stats.home.servicePointsWon || 0) + (stats.home.receiverPointsWon || 0);
      }
      if (!stats.away.totalPointsWon && stats.away.servicePointsWon !== undefined && stats.away.receiverPointsWon !== undefined) {
        stats.away.totalPointsWon = (stats.away.servicePointsWon || 0) + (stats.away.receiverPointsWon || 0);
      }
      
      // FILOSOFIA: breakPointsTotal = breakPointsFaced dell'avversario
      // HOME ha avuto X opportunità di break = AWAY ha affrontato X break points
      if (!stats.home.breakPointsTotal && stats.away.breakPointsFaced) {
        stats.home.breakPointsTotal = stats.away.breakPointsFaced;
      }
      if (!stats.away.breakPointsTotal && stats.home.breakPointsFaced) {
        stats.away.breakPointsTotal = stats.home.breakPointsFaced;
      }
      
      // FILOSOFIA: returnGamesPlayed = serviceGamesPlayed dell'avversario
      if (!stats.home.returnGamesPlayed && stats.away.serviceGamesPlayed) {
        stats.home.returnGamesPlayed = stats.away.serviceGamesPlayed;
      }
      if (!stats.away.returnGamesPlayed && stats.home.serviceGamesPlayed) {
        stats.away.returnGamesPlayed = stats.home.serviceGamesPlayed;
      }
      
      // FILOSOFIA: Calcola metriche derivate che SofaScore non fornisce direttamente
      // returnPointsWonPct = receiverPointsWon / totalReceiverPoints
      // totalReceiverPoints = totalPointsWon dell'avversario (punti servizio avversario)
      if (stats.home.receiverPointsWon !== undefined && stats.away.servicePointsWon !== undefined) {
        const homeTotalReceiverPoints = (stats.away.servicePointsWon || 0) + (stats.home.receiverPointsWon || 0);
        stats.home.returnPointsWonPct = homeTotalReceiverPoints > 0 
          ? Math.round((stats.home.receiverPointsWon / homeTotalReceiverPoints) * 100) 
          : 0;
      }
      if (stats.away.receiverPointsWon !== undefined && stats.home.servicePointsWon !== undefined) {
        const awayTotalReceiverPoints = (stats.home.servicePointsWon || 0) + (stats.away.receiverPointsWon || 0);
        stats.away.returnPointsWonPct = awayTotalReceiverPoints > 0 
          ? Math.round((stats.away.receiverPointsWon / awayTotalReceiverPoints) * 100) 
          : 0;
      }
      
      result[periodKey] = stats;
    }
    
    return Object.keys(result).length > 0 ? result : null;
  };
  
  // Se è formato array SofaScore, convertilo prima
  if (Array.isArray(statisticsData)) {
    statisticsData = convertSofaScoreArrayFormat(statisticsData);
  }
  
  // Rileva se è il nuovo formato (byPeriod) o il vecchio
  const isNewFormat = statisticsData && (statisticsData.ALL || statisticsData.SET1);
  
  // Helper per estrarre stats da un singolo record 
  // Supporta sia formato DB (p1_, p2_) che formato convertito da SofaScore (home., away.)
  const extractStatsFromRecord = (record) => {
    if (!record) return { home: {}, away: {} };
    
    // Se il record ha già la struttura home/away (convertito da SofaScore), usala direttamente
    // IMPORTANTE: Passa TUTTI i campi raw, non solo le percentuali
    if (record.home !== undefined || record.away !== undefined) {
      return {
        home: {
          // Serve stats
          aces: record.home?.aces || 0,
          doubleFaults: record.home?.doubleFaults || 0,
          firstServePct: record.home?.firstServePct || 0,
          firstServeIn: record.home?.firstServeIn || 0,
          firstServeTotal: record.home?.firstServeTotal || 0,
          secondServeIn: record.home?.secondServeIn || 0,
          secondServeTotal: record.home?.secondServeTotal || 0,
          firstServePointsWonPct: record.home?.firstServePointsWonPct || 0,
          firstServePointsWon: record.home?.firstServePointsWon || 0,
          firstServePointsIn: record.home?.firstServePointsIn || 0,
          secondServePointsWonPct: record.home?.secondServePointsWonPct || 0,
          secondServePointsWon: record.home?.secondServePointsWon || 0,
          serviceGamesPlayed: record.home?.serviceGamesPlayed || 0,
          serviceGamesWon: record.home?.serviceGamesWon || 0,
          servicePointsWon: record.home?.servicePointsWon || 0,
          breakPointsSaved: record.home?.breakPointsSaved || 0,
          breakPointsFaced: record.home?.breakPointsFaced || 0,
          // Return stats
          breakPointsWon: record.home?.breakPointsWon || 0,
          breakPointsTotal: record.home?.breakPointsTotal || 0,
          receiverPointsWon: record.home?.receiverPointsWon || 0,
          firstReturnPointsWon: record.home?.firstReturnPointsWon || 0,
          firstReturnPointsTotal: record.home?.firstReturnPointsTotal || 0,
          secondReturnPointsWon: record.home?.secondReturnPointsWon || 0,
          secondReturnPointsTotal: record.home?.secondReturnPointsTotal || 0,
          returnGamesPlayed: record.home?.returnGamesPlayed || 0,
          // Points stats
          totalPointsWon: record.home?.totalPointsWon || 0,
          maxConsecutivePointsWon: record.home?.maxConsecutivePointsWon || 0,
          winners: record.home?.winners || 0,
          unforcedErrors: record.home?.unforcedErrors || 0,
          // Games stats
          gamesWon: record.home?.gamesWon || 0,
          maxConsecutiveGamesWon: record.home?.maxConsecutiveGamesWon || 0,
          tiebreaksWon: record.home?.tiebreaksWon || 0
        },
        away: {
          // Serve stats
          aces: record.away?.aces || 0,
          doubleFaults: record.away?.doubleFaults || 0,
          firstServePct: record.away?.firstServePct || 0,
          firstServeIn: record.away?.firstServeIn || 0,
          firstServeTotal: record.away?.firstServeTotal || 0,
          secondServeIn: record.away?.secondServeIn || 0,
          secondServeTotal: record.away?.secondServeTotal || 0,
          firstServePointsWonPct: record.away?.firstServePointsWonPct || 0,
          firstServePointsWon: record.away?.firstServePointsWon || 0,
          firstServePointsIn: record.away?.firstServePointsIn || 0,
          secondServePointsWonPct: record.away?.secondServePointsWonPct || 0,
          secondServePointsWon: record.away?.secondServePointsWon || 0,
          serviceGamesPlayed: record.away?.serviceGamesPlayed || 0,
          serviceGamesWon: record.away?.serviceGamesWon || 0,
          servicePointsWon: record.away?.servicePointsWon || 0,
          breakPointsSaved: record.away?.breakPointsSaved || 0,
          breakPointsFaced: record.away?.breakPointsFaced || 0,
          // Return stats
          breakPointsWon: record.away?.breakPointsWon || 0,
          breakPointsTotal: record.away?.breakPointsTotal || 0,
          receiverPointsWon: record.away?.receiverPointsWon || 0,
          firstReturnPointsWon: record.away?.firstReturnPointsWon || 0,
          firstReturnPointsTotal: record.away?.firstReturnPointsTotal || 0,
          secondReturnPointsWon: record.away?.secondReturnPointsWon || 0,
          secondReturnPointsTotal: record.away?.secondReturnPointsTotal || 0,
          returnGamesPlayed: record.away?.returnGamesPlayed || 0,
          // Points stats
          totalPointsWon: record.away?.totalPointsWon || 0,
          maxConsecutivePointsWon: record.away?.maxConsecutivePointsWon || 0,
          winners: record.away?.winners || 0,
          unforcedErrors: record.away?.unforcedErrors || 0,
          // Games stats
          gamesWon: record.away?.gamesWon || 0,
          maxConsecutiveGamesWon: record.away?.maxConsecutiveGamesWon || 0,
          tiebreaksWon: record.away?.tiebreaksWon || 0
        }
      };
    }
    
    // Formato DB con prefissi p1_, p2_
    return {
      home: {
        aces: record.p1_aces || 0,
        doubleFaults: record.p1_double_faults || 0,
        firstServePct: record.p1_first_serve_pct || 0,
        firstServePointsWonPct: record.p1_first_serve_won && record.p1_first_serve_total 
          ? Math.round((record.p1_first_serve_won / record.p1_first_serve_total) * 100) 
          : 0,
        secondServePointsWonPct: record.p1_second_serve_won && record.p1_second_serve_total
          ? Math.round((record.p1_second_serve_won / record.p1_second_serve_total) * 100)
          : 0,
        breakPointsWon: record.p1_break_points_won || 0,
        breakPointsTotal: record.p1_break_points_total || 0,
        totalPointsWon: record.p1_total_points_won || 0,
        winners: record.p1_winners || 0,
        unforcedErrors: record.p1_unforced_errors || 0
      },
      away: {
        aces: record.p2_aces || 0,
        doubleFaults: record.p2_double_faults || 0,
        firstServePct: record.p2_first_serve_pct || 0,
        firstServePointsWonPct: record.p2_first_serve_won && record.p2_first_serve_total
          ? Math.round((record.p2_first_serve_won / record.p2_first_serve_total) * 100)
          : 0,
        secondServePointsWonPct: record.p2_second_serve_won && record.p2_second_serve_total
          ? Math.round((record.p2_second_serve_won / record.p2_second_serve_total) * 100)
          : 0,
        breakPointsWon: record.p2_break_points_won || 0,
        breakPointsTotal: record.p2_break_points_total || 0,
        totalPointsWon: record.p2_total_points_won || 0,
        winners: record.p2_winners || 0,
        unforcedErrors: record.p2_unforced_errors || 0
      }
    };
  };
  
  // Estrai stats dal PBP se disponibile - QUESTA È LA FONTE PRIMARIA
  // pointByPoint può essere: array (legacy) o oggetto { points: [...] }
  const pbpPoints = Array.isArray(pointByPoint) 
    ? pointByPoint 
    : (pointByPoint?.points || []);
  
  const pbpStats = pbpPoints.length > 0 ? extractAllStatsFromPBP(pbpPoints) : null;
  
  // Helper per costruire la struttura tab da stats estratte
  // FILOSOFIA_CALCOLI: "MAI NULL" - ogni feature ha SEMPRE un valore calcolato
  // USA pbpStats come fallback quando stats DB sono undefined/null (NON quando sono 0!)
  const buildTabFromStats = (stats) => {
    // MERGE: Se stats DB è undefined/null, usa pbpStats se disponibile
    // ATTENZIONE: 0 è un valore VALIDO, non usare fallback per 0!
    const mergeValue = (dbVal, pbpVal) => {
      // Se dbVal esiste (incluso 0), usalo
      if (dbVal !== undefined && dbVal !== null) return dbVal;
      // Altrimenti usa pbpVal se disponibile
      if (pbpStats && pbpVal !== undefined && pbpVal !== null) return pbpVal;
      // Fallback a 0
      return 0;
    };
    
    // ===== CALCOLO WINNERS =====
    // LOGICA: Se winners=0 ma totalPointsWon>0, SofaScore NON ha fornito il dato
    // In quel caso, CALCOLA con formula:
    // Winners ≈ aces + 15% punti vinti primo servizio + 10% punti vinti in risposta
    let homeWinners = stats.home.winners;
    let awayWinners = stats.away.winners;
    
    const homeTotalWon = mergeValue(stats.home.totalPointsWon, pbpStats?.home?.totalPointsWon);
    const awayTotalWon = mergeValue(stats.away.totalPointsWon, pbpStats?.away?.totalPointsWon);
    
    // Se winners=0 ma ci sono punti vinti, calcola fallback
    if ((!homeWinners || homeWinners === 0) && homeTotalWon > 0) {
      const homeAces = mergeValue(stats.home.aces, pbpStats?.home?.aces);
      const homeFirstServePct = stats.home.firstServePct || 60;
      const homeFirstServeWonPct = stats.home.firstServePointsWonPct || 70;
      // Stima punti vinti al primo servizio
      const homeFirstServePointsWon = Math.round(homeTotalWon * (homeFirstServePct / 100) * (homeFirstServeWonPct / 100));
      // Winners ≈ aces + 15% dei punti vinti al primo servizio (colpi vincenti)
      homeWinners = homeAces + Math.round(homeFirstServePointsWon * 0.15);
    }
    
    if ((!awayWinners || awayWinners === 0) && awayTotalWon > 0) {
      const awayAces = stats.away.aces || 0;
      const awayFirstServePct = stats.away.firstServePct || 60;
      const awayFirstServeWonPct = stats.away.firstServePointsWonPct || 70;
      const awayFirstServePointsWon = Math.round(awayTotalWon * (awayFirstServePct / 100) * (awayFirstServeWonPct / 100));
      awayWinners = awayAces + Math.round(awayFirstServePointsWon * 0.15);
    }
    
    // ===== CALCOLO UNFORCED ERRORS =====
    // LOGICA: Se UE=0 ma totalPointsWon>0, SofaScore NON ha fornito il dato
    // Formula: UE ≈ doubleFaults + 12% dei punti persi (errori non forzati)
    let homeUE = stats.home.unforcedErrors;
    let awayUE = stats.away.unforcedErrors;
    
    // punti persi = punti vinti dall'avversario
    const homePointsLost = awayTotalWon;
    const awayPointsLost = homeTotalWon;
    
    if ((!homeUE || homeUE === 0) && homePointsLost > 0) {
      const homeDF = stats.home.doubleFaults || 0;
      // UE ≈ doubleFaults + 12% dei punti persi
      homeUE = homeDF + Math.round(homePointsLost * 0.12);
    }
    
    if ((!awayUE || awayUE === 0) && awayPointsLost > 0) {
      const awayDF = stats.away.doubleFaults || 0;
      awayUE = awayDF + Math.round(awayPointsLost * 0.12);
    }
    
    // ===== CALCOLO RETURN POINTS WON % =====
    // LOGICA: returnPointsWonPct = punti vinti in risposta / punti totali giocati in risposta
    // In risposta significa quando l'AVVERSARIO serve
    // Punti vinti in risposta da HOME = punti persi da AWAY al servizio
    // Formula: returnPct = (puntiAvversarioPersi / puntiAvversarioTotaliServizio) * 100
    // Semplificazione: returnPct ≈ 100 - avversario1stServeWonPct (se serve solo prima)
    // O meglio: returnPct = (awayPointsLost al servizio) / (awayTotalServePoints) * 100
    let homeReturnPct = stats.home.returnPointsWonPct;
    let awayReturnPct = stats.away.returnPointsWonPct;
    
    if ((!homeReturnPct || homeReturnPct === 0) && awayTotalWon > 0) {
      // HOME vince punti in risposta quando AWAY serve
      // returnPct ≈ 100 - weighted average of away's serve win %
      const away1stPct = stats.away.firstServePct || 60;
      const away1stWonPct = stats.away.firstServePointsWonPct || 70;
      const away2ndWonPct = stats.away.secondServePointsWonPct || 50;
      // Weighted: (1st% × 1stWon%) + ((100-1st%) × 2ndWon%)
      const awayServeWonPct = (away1stPct * away1stWonPct + (100 - away1stPct) * away2ndWonPct) / 100;
      homeReturnPct = Math.round(100 - awayServeWonPct);
    }
    
    if ((!awayReturnPct || awayReturnPct === 0) && homeTotalWon > 0) {
      const home1stPct = stats.home.firstServePct || 60;
      const home1stWonPct = stats.home.firstServePointsWonPct || 70;
      const home2ndWonPct = stats.home.secondServePointsWonPct || 50;
      const homeServeWonPct = (home1stPct * home1stWonPct + (100 - home1stPct) * home2ndWonPct) / 100;
      awayReturnPct = Math.round(100 - homeServeWonPct);
    }
    
    // ===== CALCOLO FIRST SERVE % (se mancante) =====
    let homeFirstServePct = stats.home.firstServePct;
    let awayFirstServePct = stats.away.firstServePct;
    
    if (!homeFirstServePct || homeFirstServePct === 0) {
      // Stima: giocatori ATP/WTA tipicamente 55-65%
      homeFirstServePct = 60;
    }
    if (!awayFirstServePct || awayFirstServePct === 0) {
      awayFirstServePct = 60;
    }
    
    // ===== CALCOLO FIRST SERVE WON % (se mancante) =====
    let homeFirstServeWonPct = stats.home.firstServePointsWonPct;
    let awayFirstServeWonPct = stats.away.firstServePointsWonPct;
    
    if (!homeFirstServeWonPct || homeFirstServeWonPct === 0) {
      // Stima basata su punti vinti: se vinci più punti, serve meglio
      const ratio = homeTotalWon / (homeTotalWon + awayTotalWon || 1);
      homeFirstServeWonPct = Math.round(60 + ratio * 25); // 60-85 range
    }
    if (!awayFirstServeWonPct || awayFirstServeWonPct === 0) {
      const ratio = awayTotalWon / (homeTotalWon + awayTotalWon || 1);
      awayFirstServeWonPct = Math.round(60 + ratio * 25);
    }
    
    // ===== CALCOLO SECOND SERVE WON % (se mancante) =====
    let homeSecondServeWonPct = stats.home.secondServePointsWonPct;
    let awaySecondServeWonPct = stats.away.secondServePointsWonPct;
    
    if (!homeSecondServeWonPct || homeSecondServeWonPct === 0) {
      // Seconda serve tipicamente 40-55%
      const ratio = homeTotalWon / (homeTotalWon + awayTotalWon || 1);
      homeSecondServeWonPct = Math.round(40 + ratio * 20);
    }
    if (!awaySecondServeWonPct || awaySecondServeWonPct === 0) {
      const ratio = awayTotalWon / (homeTotalWon + awayTotalWon || 1);
      awaySecondServeWonPct = Math.round(40 + ratio * 20);
    }
    
    // ===== CALCOLO SERVICE GAMES PLAYED =====
    // Service games = punti totali serviti / ~5 punti per game (media tennis)
    let homeServiceGames = stats.home.serviceGamesPlayed || 0;
    let awayServiceGames = stats.away.serviceGamesPlayed || 0;
    
    // ===== RAW VALUES: Calcola se mancanti =====
    // firstServeIn/Total
    let homeFirstServeIn = stats.home.firstServeIn || 0;
    let homeFirstServeTotal = stats.home.firstServeTotal || 0;
    let awayFirstServeIn = stats.away.firstServeIn || 0;
    let awayFirstServeTotal = stats.away.firstServeTotal || 0;
    
    // Se abbiamo % ma non raw, calcola raw
    if (homeFirstServeTotal === 0 && homeFirstServePct > 0 && homeTotalWon > 0) {
      // Stima: totalServes ≈ totalPointsWon * 1.2 (circa)
      homeFirstServeTotal = Math.round(homeTotalWon * 1.2);
      homeFirstServeIn = Math.round(homeFirstServeTotal * homeFirstServePct / 100);
    }
    if (awayFirstServeTotal === 0 && awayFirstServePct > 0 && awayTotalWon > 0) {
      awayFirstServeTotal = Math.round(awayTotalWon * 1.2);
      awayFirstServeIn = Math.round(awayFirstServeTotal * awayFirstServePct / 100);
    }
    
    // secondServeTotal = firstServeTotal - firstServeIn (seconde servite)
    let homeSecondServeTotal = stats.home.secondServeTotal || 0;
    let awaySecondServeTotal = stats.away.secondServeTotal || 0;
    if (homeSecondServeTotal === 0 && homeFirstServeTotal > 0) {
      homeSecondServeTotal = homeFirstServeTotal - homeFirstServeIn;
    }
    if (awaySecondServeTotal === 0 && awayFirstServeTotal > 0) {
      awaySecondServeTotal = awayFirstServeTotal - awayFirstServeIn;
    }
    
    // Calcola serviceGamesPlayed dopo aver calcolato i totali serve
    // Punti totali serviti / ~5 punti per game (media tennis)
    if (homeServiceGames === 0 && homeFirstServeTotal > 0) {
      homeServiceGames = Math.round(homeFirstServeTotal / 5);
    }
    if (awayServiceGames === 0 && awayFirstServeTotal > 0) {
      awayServiceGames = Math.round(awayFirstServeTotal / 5);
    }
    
    // firstServePointsWon/In
    let homeFirstServePointsWon = stats.home.firstServePointsWon || 0;
    let homeFirstServePointsIn = stats.home.firstServePointsIn || homeFirstServeIn;
    let awayFirstServePointsWon = stats.away.firstServePointsWon || 0;
    let awayFirstServePointsIn = stats.away.firstServePointsIn || awayFirstServeIn;
    
    if (homeFirstServePointsWon === 0 && homeFirstServeWonPct > 0 && homeFirstServeIn > 0) {
      homeFirstServePointsWon = Math.round(homeFirstServeIn * homeFirstServeWonPct / 100);
    }
    if (awayFirstServePointsWon === 0 && awayFirstServeWonPct > 0 && awayFirstServeIn > 0) {
      awayFirstServePointsWon = Math.round(awayFirstServeIn * awayFirstServeWonPct / 100);
    }
    
    // secondServePointsWon/Total
    let homeSecondServePointsWon = stats.home.secondServePointsWon || 0;
    let awaySecondServePointsWon = stats.away.secondServePointsWon || 0;
    
    if (homeSecondServePointsWon === 0 && homeSecondServeWonPct > 0 && homeSecondServeTotal > 0) {
      homeSecondServePointsWon = Math.round(homeSecondServeTotal * homeSecondServeWonPct / 100);
    }
    if (awaySecondServePointsWon === 0 && awaySecondServeWonPct > 0 && awaySecondServeTotal > 0) {
      awaySecondServePointsWon = Math.round(awaySecondServeTotal * awaySecondServeWonPct / 100);
    }
    
    // ===== BREAK POINTS - USA pbpStats (già calcolato sopra) =====
    // breakPointsSaved/Faced - usa DB, poi pbpStats
    let homeBreakPointsSaved = mergeValue(stats.home.breakPointsSaved, pbpStats?.home?.breakPointsSaved);
    let homeBreakPointsFaced = mergeValue(stats.home.breakPointsFaced, pbpStats?.home?.breakPointsFaced);
    let awayBreakPointsSaved = mergeValue(stats.away.breakPointsSaved, pbpStats?.away?.breakPointsSaved);
    let awayBreakPointsFaced = mergeValue(stats.away.breakPointsFaced, pbpStats?.away?.breakPointsFaced);
    
    // Calcola breakPointsTotal per return (quante opportunità hai avuto in attacco)
    let homeBreakPointsTotal = mergeValue(stats.home.breakPointsTotal, pbpStats?.home?.breakPointsTotal);
    let awayBreakPointsTotal = mergeValue(stats.away.breakPointsTotal, pbpStats?.away?.breakPointsTotal);
    let homeBreakPointsWon = mergeValue(stats.home.breakPointsWon, pbpStats?.home?.breakPointsWon);
    let awayBreakPointsWon = mergeValue(stats.away.breakPointsWon, pbpStats?.away?.breakPointsWon);
    
    // Log per debug
    console.log('🎾 Break Points Final:', JSON.stringify({
      home: { faced: homeBreakPointsFaced, saved: homeBreakPointsSaved, won: homeBreakPointsWon, total: homeBreakPointsTotal },
      away: { faced: awayBreakPointsFaced, saved: awayBreakPointsSaved, won: awayBreakPointsWon, total: awayBreakPointsTotal }
    }));
    
    // Se breakPointsTotal=0 ma breakPointsWon>0, il total è almeno il won
    if (homeBreakPointsTotal === 0 && homeBreakPointsWon > 0) {
      homeBreakPointsTotal = homeBreakPointsWon;
    }
    if (awayBreakPointsTotal === 0 && awayBreakPointsWon > 0) {
      awayBreakPointsTotal = awayBreakPointsWon;
    }
    
    // Se non abbiamo breakPointsFaced, calcoliamo dall'avversario breakPointsTotal
    // HOME faced = quante opportunità ha avuto AWAY = AWAY breakPointsTotal
    if (homeBreakPointsFaced === 0 && awayBreakPointsTotal > 0) {
      homeBreakPointsFaced = awayBreakPointsTotal;
      // Saved = faced - converted dall'avversario
      homeBreakPointsSaved = Math.max(0, homeBreakPointsFaced - awayBreakPointsWon);
    }
    if (awayBreakPointsFaced === 0 && homeBreakPointsTotal > 0) {
      awayBreakPointsFaced = homeBreakPointsTotal;
      awayBreakPointsSaved = Math.max(0, awayBreakPointsFaced - homeBreakPointsWon);
    }
    
    // ===== SERVICE POINTS WON (PuntiVintiAlServizio) =====
    // = firstServePointsWon + secondServePointsWon
    let homeServicePointsWon = mergeValue(stats.home.servicePointsWon, pbpStats?.home?.servicePointsWon);
    let awayServicePointsWon = mergeValue(stats.away.servicePointsWon, pbpStats?.away?.servicePointsWon);
    
    if (homeServicePointsWon === 0 && (homeFirstServePointsWon > 0 || homeSecondServePointsWon > 0)) {
      homeServicePointsWon = homeFirstServePointsWon + homeSecondServePointsWon;
    }
    if (awayServicePointsWon === 0 && (awayFirstServePointsWon > 0 || awaySecondServePointsWon > 0)) {
      awayServicePointsWon = awayFirstServePointsWon + awaySecondServePointsWon;
    }
    
    // ===== FIRST RETURN POINTS (PuntiDiRispostaPrimoServizio) =====
    // PRIMA calcola questi, poi usa per returnPointsWon totale
    // homeFirstReturnPointsWon = punti vinti quando AWAY serve prima
    // homeFirstReturnPointsTotal = quante prime ha servito AWAY = awayFirstServeIn
    let homeFirstReturnPointsWon = stats.home.firstReturnPointsWon || 0;
    let homeFirstReturnPointsTotal = stats.home.firstReturnPointsTotal || awayFirstServeIn;
    let awayFirstReturnPointsWon = stats.away.firstReturnPointsWon || 0;
    let awayFirstReturnPointsTotal = stats.away.firstReturnPointsTotal || homeFirstServeIn;
    
    // Calcola: se AWAY vince 44 su 51 prime, HOME ne vince 51-44=7
    if (homeFirstReturnPointsWon === 0 && awayFirstServeIn > 0 && awayFirstServePointsWon > 0) {
      homeFirstReturnPointsWon = awayFirstServeIn - awayFirstServePointsWon;
      homeFirstReturnPointsTotal = awayFirstServeIn;
    }
    if (awayFirstReturnPointsWon === 0 && homeFirstServeIn > 0 && homeFirstServePointsWon > 0) {
      awayFirstReturnPointsWon = homeFirstServeIn - homeFirstServePointsWon;
      awayFirstReturnPointsTotal = homeFirstServeIn;
    }
    
    // ===== SECOND RETURN POINTS (PuntiDiRispostaSecondoServizio) =====
    let homeSecondReturnPointsWon = stats.home.secondReturnPointsWon || 0;
    let homeSecondReturnPointsTotal = stats.home.secondReturnPointsTotal || awaySecondServeTotal;
    let awaySecondReturnPointsWon = stats.away.secondReturnPointsWon || 0;
    let awaySecondReturnPointsTotal = stats.away.secondReturnPointsTotal || homeSecondServeTotal;
    
    // Calcola: se AWAY vince 10 su 27 seconde, HOME ne vince 27-10=17
    if (homeSecondReturnPointsWon === 0 && awaySecondServeTotal > 0 && awaySecondServePointsWon > 0) {
      homeSecondReturnPointsWon = awaySecondServeTotal - awaySecondServePointsWon;
      homeSecondReturnPointsTotal = awaySecondServeTotal;
    }
    if (awaySecondReturnPointsWon === 0 && homeSecondServeTotal > 0 && homeSecondServePointsWon > 0) {
      awaySecondReturnPointsWon = homeSecondServeTotal - homeSecondServePointsWon;
      awaySecondReturnPointsTotal = homeSecondServeTotal;
    }
    
    // ===== RETURN POINTS WON TOTAL (PuntiVintiInRicezione) =====
    // CALCOLA SEMPRE come somma di first + second return points
    // Questo è più accurato di total - service perché usa i dati grezzi
    let homeReturnPointsWon = homeFirstReturnPointsWon + homeSecondReturnPointsWon;
    let awayReturnPointsWon = awayFirstReturnPointsWon + awaySecondReturnPointsWon;
    
    // Fallback: se first/second return sono 0 ma abbiamo receiverPointsWon dal DB
    if (homeReturnPointsWon === 0 && stats.home.receiverPointsWon > 0) {
      homeReturnPointsWon = stats.home.receiverPointsWon;
    }
    if (awayReturnPointsWon === 0 && stats.away.receiverPointsWon > 0) {
      awayReturnPointsWon = stats.away.receiverPointsWon;
    }
    
    // Ultimo fallback: calcola da total - service
    if (homeReturnPointsWon === 0 && homeTotalWon > 0 && homeServicePointsWon > 0) {
      homeReturnPointsWon = Math.max(0, homeTotalWon - homeServicePointsWon);
    }
    if (awayReturnPointsWon === 0 && awayTotalWon > 0 && awayServicePointsWon > 0) {
      awayReturnPointsWon = Math.max(0, awayTotalWon - awayServicePointsWon);
    }
    
    // ===== CORREGGI SERVICE POINTS WON =====
    // Se servicePointsWon + returnPointsWon != totalWon, c'è un errore
    // In quel caso, ricalcola servicePointsWon = totalWon - returnPointsWon
    const homeSumCheck = homeServicePointsWon + homeReturnPointsWon;
    const awaySumCheck = awayServicePointsWon + awayReturnPointsWon;
    
    if (homeTotalWon > 0 && Math.abs(homeSumCheck - homeTotalWon) > 2) {
      // C'è discrepanza, usa total - return per service
      homeServicePointsWon = Math.max(0, homeTotalWon - homeReturnPointsWon);
    }
    if (awayTotalWon > 0 && Math.abs(awaySumCheck - awayTotalWon) > 2) {
      awayServicePointsWon = Math.max(0, awayTotalWon - awayReturnPointsWon);
    }
    
    // ===== RETURN GAMES PLAYED (GameDiRispostaGiocati) =====
    // = serviceGamesPlayed dell'avversario
    let homeReturnGamesPlayed = stats.home.returnGamesPlayed || awayServiceGames || 0;
    let awayReturnGamesPlayed = stats.away.returnGamesPlayed || homeServiceGames || 0;
    
    // ===== SERVICE GAMES WON (GameDiServizioVinti) =====
    // = serviceGamesPlayed - breaks subiti
    // breaks subiti = breakPointsWon dell'avversario
    let homeServiceGamesWon = stats.home.serviceGamesWon || 0;
    let awayServiceGamesWon = stats.away.serviceGamesWon || 0;
    
    if (homeServiceGamesWon === 0 && homeServiceGames > 0) {
      // HOME perde tanti service games quanti breaks fa AWAY
      homeServiceGamesWon = Math.max(0, homeServiceGames - awayBreakPointsWon);
    }
    if (awayServiceGamesWon === 0 && awayServiceGames > 0) {
      awayServiceGamesWon = Math.max(0, awayServiceGames - homeBreakPointsWon);
    }
    
    // ===== MAX CONSECUTIVE POINTS WON (PuntiVincentiConsecutivi) =====
    // Difficile da calcolare senza point-by-point, usa placeholder o stima
    let homeMaxConsecutivePoints = stats.home.maxConsecutivePointsWon || 0;
    let awayMaxConsecutivePoints = stats.away.maxConsecutivePointsWon || 0;
    
    // Stima: ~10% dei punti vinti come max consecutivi (rough estimate)
    if (homeMaxConsecutivePoints === 0 && homeTotalWon > 0) {
      homeMaxConsecutivePoints = Math.max(3, Math.round(homeTotalWon * 0.09));
    }
    if (awayMaxConsecutivePoints === 0 && awayTotalWon > 0) {
      awayMaxConsecutivePoints = Math.max(3, Math.round(awayTotalWon * 0.09));
    }
    
    // ===== MAX CONSECUTIVE GAMES WON (GameConsecutiviVinti) =====
    let homeMaxConsecutiveGames = stats.home.maxConsecutiveGamesWon || 0;
    let awayMaxConsecutiveGames = stats.away.maxConsecutiveGamesWon || 0;
    // Questo viene calcolato da calculateGameStatsFromScore, qui mettiamo fallback
    
    return {
      serve: {
        home: {
          aces: stats.home.aces || 0,
          doubleFaults: stats.home.doubleFaults || 0,
          firstServePct: homeFirstServePct,
          firstServeIn: homeFirstServeIn,
          firstServeTotal: homeFirstServeTotal,
          firstServeWonPct: homeFirstServeWonPct,
          firstServePointsWon: homeFirstServePointsWon,
          firstServePointsIn: homeFirstServePointsIn,
          secondServeWonPct: homeSecondServeWonPct,
          secondServePointsWon: homeSecondServePointsWon,
          secondServeTotal: homeSecondServeTotal,
          serviceGamesPlayed: homeServiceGames || 0,
          serviceGamesWon: homeServiceGamesWon,
          servicePointsWon: homeServicePointsWon,
          breakPointsSaved: homeBreakPointsSaved,
          breakPointsFaced: homeBreakPointsFaced
        },
        away: {
          aces: stats.away.aces || 0,
          doubleFaults: stats.away.doubleFaults || 0,
          firstServePct: awayFirstServePct,
          firstServeIn: awayFirstServeIn,
          firstServeTotal: awayFirstServeTotal,
          firstServeWonPct: awayFirstServeWonPct,
          firstServePointsWon: awayFirstServePointsWon,
          firstServePointsIn: awayFirstServePointsIn,
          secondServeWonPct: awaySecondServeWonPct,
          secondServePointsWon: awaySecondServePointsWon,
          secondServeTotal: awaySecondServeTotal,
          serviceGamesPlayed: awayServiceGames || 0,
          serviceGamesWon: awayServiceGamesWon,
          servicePointsWon: awayServicePointsWon,
          breakPointsSaved: awayBreakPointsSaved,
          breakPointsFaced: awayBreakPointsFaced
        }
      },
      return: {
        home: {
          returnPointsWonPct: homeReturnPct,
          returnPointsWon: homeReturnPointsWon,
          firstReturnPointsWon: homeFirstReturnPointsWon,
          firstReturnPointsTotal: homeFirstReturnPointsTotal,
          secondReturnPointsWon: homeSecondReturnPointsWon,
          secondReturnPointsTotal: homeSecondReturnPointsTotal,
          returnGamesPlayed: homeReturnGamesPlayed,
          breakPointsWon: homeBreakPointsWon,
          breakPointsTotal: homeBreakPointsTotal
        },
        away: {
          returnPointsWonPct: awayReturnPct,
          returnPointsWon: awayReturnPointsWon,
          firstReturnPointsWon: awayFirstReturnPointsWon,
          firstReturnPointsTotal: awayFirstReturnPointsTotal,
          secondReturnPointsWon: awaySecondReturnPointsWon,
          secondReturnPointsTotal: awaySecondReturnPointsTotal,
          returnGamesPlayed: awayReturnGamesPlayed,
          breakPointsWon: awayBreakPointsWon,
          breakPointsTotal: awayBreakPointsTotal
        }
      },
      points: {
        home: {
          totalWon: stats.home.totalPointsWon || 0,
          servicePointsWon: homeServicePointsWon,
          returnPointsWon: homeReturnPointsWon,
          maxConsecutivePointsWon: homeMaxConsecutivePoints,
          winners: homeWinners,
          unforcedErrors: homeUE
        },
        away: {
          totalWon: stats.away.totalPointsWon || 0,
          servicePointsWon: awayServicePointsWon,
          returnPointsWon: awayReturnPointsWon,
          maxConsecutivePointsWon: awayMaxConsecutivePoints,
          winners: awayWinners,
          unforcedErrors: awayUE
        }
      }
    };
  };
  
  if (isNewFormat) {
    // Nuovo formato con periodi
    const periods = Object.keys(statisticsData).filter(k => statisticsData[k]);
    const byPeriod = {};
    
    // Calcola games stats dallo score come FALLBACK
    const gameStatsFromScore = calculateGameStatsFromScore(score);
    
    // Prendi i valori dal DB ALL se presenti (questi sono i valori SofaScore corretti!)
    const allStats = statisticsData.ALL ? extractStatsFromRecord(statisticsData.ALL) : {};
    
    // FILOSOFIA: Usa SEMPRE valori SofaScore se disponibili, altrimenti calcolo da score
    const gameStats = {
      home: {
        // gamesWon: usa SofaScore se disponibile
        gamesWon: allStats.home?.gamesWon || gameStatsFromScore.home.gamesWon,
        // tiebreaksWon: usa SofaScore se disponibile
        tiebreaksWon: allStats.home?.tiebreaksWon !== undefined ? allStats.home.tiebreaksWon : gameStatsFromScore.home.tiebreaksWon,
        // consecutiveGamesWon: usa SofaScore se disponibile
        consecutiveGamesWon: allStats.home?.maxConsecutiveGamesWon || gameStatsFromScore.home.consecutiveGamesWon,
        // serviceGamesWon: usa SofaScore se disponibile
        serviceGamesWon: allStats.home?.serviceGamesWon || 0
      },
      away: {
        gamesWon: allStats.away?.gamesWon || gameStatsFromScore.away.gamesWon,
        tiebreaksWon: allStats.away?.tiebreaksWon !== undefined ? allStats.away.tiebreaksWon : gameStatsFromScore.away.tiebreaksWon,
        consecutiveGamesWon: allStats.away?.maxConsecutiveGamesWon || gameStatsFromScore.away.consecutiveGamesWon,
        serviceGamesWon: allStats.away?.serviceGamesWon || 0
      }
    };
    
    console.log('🎯 Game Stats from SofaScore:', JSON.stringify({
      home: { gamesWon: allStats.home?.gamesWon, tiebreaks: allStats.home?.tiebreaksWon, consec: allStats.home?.maxConsecutiveGamesWon, serviceWon: allStats.home?.serviceGamesWon },
      away: { gamesWon: allStats.away?.gamesWon, tiebreaks: allStats.away?.tiebreaksWon, consec: allStats.away?.maxConsecutiveGamesWon, serviceWon: allStats.away?.serviceGamesWon }
    }));
    
    for (const period of periods) {
      const stats = extractStatsFromRecord(statisticsData[period]);
      const periodTab = buildTabFromStats(stats);
      // Aggiungi games a OGNI periodo
      byPeriod[period] = { ...periodTab, games: gameStats };
    }
    
    // Usa ALL come default, fallback al primo periodo disponibile
    const defaultStats = statisticsData.ALL 
      ? extractStatsFromRecord(statisticsData.ALL)
      : extractStatsFromRecord(statisticsData[periods[0]]);
    
    const defaultTab = buildTabFromStats(defaultStats);
    
    return {
      ...defaultTab,
      games: gameStats,
      periods: periods.sort((a, b) => {
        // Ordina: ALL prima, poi SET1, SET2, etc.
        if (a === 'ALL') return -1;
        if (b === 'ALL') return 1;
        return a.localeCompare(b);
      }),
      byPeriod,
      dataSource: 'statistics'
    };
  }
  
  // Vecchio formato o dati mancanti
  const statistics = statisticsData || {};
  
  // Check if we have real statistics
  const hasRealStats = statistics.home && (
    statistics.home.aces !== undefined ||
    statistics.home.firstServePct !== undefined ||
    statistics.home.firstServePointsWonPct !== undefined
  );
  
  if (hasRealStats) {
    // FILOSOFIA: Usa buildTabFromStats per calcolare winners/UE con fallback
    const statsForBuilder = {
      home: {
        aces: statistics.home?.aces || 0,
        doubleFaults: statistics.home?.doubleFaults || 0,
        firstServePct: statistics.home?.firstServePct || 0,
        firstServePointsWonPct: statistics.home?.firstServePointsWonPct || 0,
        firstServePointsWon: statistics.home?.firstServePointsWon || 0,
        secondServePointsWonPct: statistics.home?.secondServePointsWonPct || 0,
        breakPointsWon: statistics.home?.breakPointsWon || 0,
        breakPointsTotal: statistics.home?.breakPointsTotal || 0,
        totalPointsWon: statistics.home?.totalPointsWon || 0,
        returnPointsWonPct: statistics.home?.receiverPointsWonPct || 0,
        winners: statistics.home?.winners,
        unforcedErrors: statistics.home?.unforcedErrors
      },
      away: {
        aces: statistics.away?.aces || 0,
        doubleFaults: statistics.away?.doubleFaults || 0,
        firstServePct: statistics.away?.firstServePct || 0,
        firstServePointsWonPct: statistics.away?.firstServePointsWonPct || 0,
        firstServePointsWon: statistics.away?.firstServePointsWon || 0,
        secondServePointsWonPct: statistics.away?.secondServePointsWonPct || 0,
        breakPointsWon: statistics.away?.breakPointsWon || 0,
        breakPointsTotal: statistics.away?.breakPointsTotal || 0,
        totalPointsWon: statistics.away?.totalPointsWon || 0,
        returnPointsWonPct: statistics.away?.receiverPointsWonPct || 0,
        winners: statistics.away?.winners,
        unforcedErrors: statistics.away?.unforcedErrors
      }
    };
    const result = buildTabFromStats(statsForBuilder);
    const gameStatsFromScore = calculateGameStatsFromScore(score);
    
    // Merge: usa valori DB se presenti (consecutiveGamesWon)
    const gameStats = {
      home: {
        gamesWon: gameStatsFromScore.home.gamesWon,
        tiebreaksWon: gameStatsFromScore.home.tiebreaksWon,
        consecutiveGamesWon: statistics.home?.maxConsecutiveGamesWon || gameStatsFromScore.home.consecutiveGamesWon
      },
      away: {
        gamesWon: gameStatsFromScore.away.gamesWon,
        tiebreaksWon: gameStatsFromScore.away.tiebreaksWon,
        consecutiveGamesWon: statistics.away?.maxConsecutiveGamesWon || gameStatsFromScore.away.consecutiveGamesWon
      }
    };
    
    return { ...result, games: gameStats, dataSource: 'statistics' };
  }
  
  // Estimate stats from score for legacy matches
  const sets = score?.sets || [];
  let homeGames = 0, awayGames = 0;
  let homeSetsWon = 0, awaySetsWon = 0;
  
  sets.forEach(set => {
    homeGames += set.home || 0;
    awayGames += set.away || 0;
    if ((set.home || 0) > (set.away || 0)) homeSetsWon++;
    else if ((set.away || 0) > (set.home || 0)) awaySetsWon++;
  });
  
  const totalGames = homeGames + awayGames || 1;
  
  // Estimate points from games (avg ~6.5 points per game in tennis)
  const avgPointsPerGame = 6.5;
  const homePoints = Math.round(homeGames * avgPointsPerGame);
  const awayPoints = Math.round(awayGames * avgPointsPerGame);
  
  // Winner typically has higher serve %, closer match = closer stats
  const gameRatio = homeGames / totalGames;
  const isHomeWinner = homeSetsWon > awaySetsWon;
  
  // Estimate serve percentages - winner typically 60-70%, loser 55-65%
  const homeFirstServe = Math.round(55 + (gameRatio * 20)); // 55-75 range
  const awayFirstServe = Math.round(55 + ((1 - gameRatio) * 20));
  
  // First serve won % correlates with games won
  const homeFirstServeWon = Math.round(60 + (gameRatio * 25)); // 60-85 range
  const awayFirstServeWon = Math.round(60 + ((1 - gameRatio) * 25));
  
  // Second serve won % typically 45-60%
  const homeSecondServeWon = Math.round(45 + (gameRatio * 15));
  const awaySecondServeWon = Math.round(45 + ((1 - gameRatio) * 15));
  
  // Estimate aces: roughly 1 per 2 service games for top players
  const homeServiceGames = Math.ceil(homeGames / 2);
  const awayServiceGames = Math.ceil(awayGames / 2);
  const homeAces = Math.round(homeServiceGames * (isHomeWinner ? 0.6 : 0.4));
  const awayAces = Math.round(awayServiceGames * (!isHomeWinner ? 0.6 : 0.4));
  
  // Estimate double faults: roughly 1 per 3-4 service games
  const homeDF = Math.round(homeServiceGames * (isHomeWinner ? 0.25 : 0.35));
  const awayDF = Math.round(awayServiceGames * (!isHomeWinner ? 0.25 : 0.35));
  
  // FILOSOFIA: Se abbiamo point_by_point reali, calcola break stats corrette
  if (pointByPoint && pointByPoint.length > 0) {
    const realBreakStats = calculateBreakStatsFromPointByPoint(pointByPoint);
    if (realBreakStats) {
      // Usa le break stats reali invece di quelle stimate casualmente
      homeBreaksConverted = realBreakStats.home.breakPointsWon;
      awayBreaksConverted = realBreakStats.away.breakPointsWon;
      
      // Usa breakPointsTotal direttamente dalla funzione
      const homeBreakPointsTotal = realBreakStats.home.breakPointsTotal;
      const awayBreakPointsTotal = realBreakStats.away.breakPointsTotal;
      
      return {
        serve: {
          home: {
            aces: homeAces,
            doubleFaults: homeDF,
            firstServePct: homeFirstServe,
            firstServeWonPct: homeFirstServeWon,
            secondServeWonPct: homeSecondServeWon
          },
          away: {
            aces: awayAces,
            doubleFaults: awayDF,
            firstServePct: awayFirstServe,
            firstServeWonPct: awayFirstServeWon,
            secondServeWonPct: awaySecondServeWon
          }
        },
        return: {
          home: {
            returnPointsWonPct: Math.round(35 + (gameRatio * 20)),
            breakPointsWon: homeBreaksConverted,
            breakPointsTotal: homeBreakPointsTotal
          },
          away: {
            returnPointsWonPct: Math.round(35 + ((1 - gameRatio) * 20)),
            breakPointsWon: awayBreaksConverted,
            breakPointsTotal: awayBreakPointsTotal
          }
        },
        points: {
          home: {
            totalWon: homePoints,
            winners: Math.round(homePoints * 0.25),
            unforcedErrors: Math.round(homePoints * (isHomeWinner ? 0.15 : 0.2))
          },
          away: {
            totalWon: awayPoints,
            winners: Math.round(awayPoints * 0.25),
            unforcedErrors: Math.round(awayPoints * (!isHomeWinner ? 0.15 : 0.2))
          }
        },
        games: calculateGameStatsFromScore(score),
        dataSource: 'point_by_point'
      };
    }
  }
  
  // Fallback: logica estimated
  const homeBreaksConverted = Math.max(0, awayGames - awaySetsWon * 3); // rough estimate
  const awayBreaksConverted = Math.max(0, homeGames - homeSetsWon * 3);
  
  return {
    serve: {
      home: {
        aces: homeAces,
        doubleFaults: homeDF,
        firstServePct: homeFirstServe,
        firstServeWonPct: homeFirstServeWon,
        secondServeWonPct: homeSecondServeWon
      },
      away: {
        aces: awayAces,
        doubleFaults: awayDF,
        firstServePct: awayFirstServe,
        firstServeWonPct: awayFirstServeWon,
        secondServeWonPct: awaySecondServeWon
      }
    },
    return: {
      home: {
        returnPointsWonPct: Math.round(35 + (gameRatio * 20)), // 35-55%
        breakPointsWon: homeBreaksConverted,
        // FILOSOFIA_CALCOLI: deterministic calculation, estimate attempts as won + 1
        breakPointsTotal: homeBreaksConverted + 1
      },
      away: {
        returnPointsWonPct: Math.round(35 + ((1 - gameRatio) * 20)),
        breakPointsWon: awayBreaksConverted,
        // FILOSOFIA_CALCOLI: deterministic calculation, estimate attempts as won + 1
        breakPointsTotal: awayBreaksConverted + 1
      }
    },
    points: {
      home: {
        totalWon: homePoints,
        winners: Math.round(homePoints * 0.25), // ~25% of points are winners
        unforcedErrors: Math.round(homePoints * (isHomeWinner ? 0.15 : 0.2)) // winner makes fewer UE
      },
      away: {
        totalWon: awayPoints,
        winners: Math.round(awayPoints * 0.25),
        unforcedErrors: Math.round(awayPoints * (!isHomeWinner ? 0.15 : 0.2))
      }
    },
    games: calculateGameStatsFromScore(score),
    dataSource: 'estimated'
  };
}

/**
 * Calcola statistiche di game dallo score (sets)
 * FILOSOFIA: DATA_LAYER → estrae dati dallo score
 * Calcola: gamesWon, tiebreaksWon, consecutiveGamesWon
 */
function calculateGameStatsFromScore(score) {
  const sets = score?.sets || [];
  
  let homeGamesWon = 0;
  let awayGamesWon = 0;
  let homeTiebreaksWon = 0;
  let awayTiebreaksWon = 0;
  let homeMaxConsecutive = 0;
  let awayMaxConsecutive = 0;
  
  // Calcola games totali e tiebreaks
  for (const set of sets) {
    const homeSetGames = set.home || 0;
    const awaySetGames = set.away || 0;
    
    homeGamesWon += homeSetGames;
    awayGamesWon += awaySetGames;
    
    // Tiebreak: se il set finisce 7-6 o 6-7, c'è stato un tiebreak
    // Il vincitore del tiebreak è chi ha vinto il set
    if ((homeSetGames === 7 && awaySetGames === 6) || 
        (homeSetGames === 6 && awaySetGames === 7)) {
      if (homeSetGames > awaySetGames) {
        homeTiebreaksWon++;
      } else {
        awayTiebreaksWon++;
      }
    }
  }
  
  // Consecutive games: stima basata sul margine di vittoria nei set
  // Se vinci un set 6-1, hai probabilmente vinto 4-5 game consecutivi
  // Anche chi perde ha sempre almeno 1 game consecutivo (il proprio servizio)
  for (const set of sets) {
    const homeSetGames = set.home || 0;
    const awaySetGames = set.away || 0;
    const diff = Math.abs(homeSetGames - awaySetGames);
    
    // FILOSOFIA: Ogni giocatore vince ALMENO 1 game consecutivo (proprio servizio tenuto)
    // diff >= 4 → vincitore ha ~3-4 consecutive, diff >= 2 → vincitore ha ~2-3
    if (homeSetGames > awaySetGames) {
      // Home vince set
      homeMaxConsecutive = Math.max(homeMaxConsecutive, Math.min(diff + 1, 5));
      // Away perde ma avrà tenuto almeno 1-2 servizi consecutivi
      awayMaxConsecutive = Math.max(awayMaxConsecutive, Math.min(awaySetGames > 0 ? 2 : 1, awaySetGames));
    } else if (awaySetGames > homeSetGames) {
      // Away vince set
      awayMaxConsecutive = Math.max(awayMaxConsecutive, Math.min(diff + 1, 5));
      // Home perde ma avrà tenuto almeno 1-2 servizi consecutivi
      homeMaxConsecutive = Math.max(homeMaxConsecutive, Math.min(homeSetGames > 0 ? 2 : 1, homeSetGames));
    }
  }
  
  // FALLBACK: Se ancora 0, ogni giocatore con games > 0 ha almeno 1 consecutivo
  if (homeMaxConsecutive === 0 && homeGamesWon > 0) homeMaxConsecutive = 1;
  if (awayMaxConsecutive === 0 && awayGamesWon > 0) awayMaxConsecutive = 1;
  
  return {
    home: {
      gamesWon: homeGamesWon,
      tiebreaksWon: homeTiebreaksWon,
      consecutiveGamesWon: homeMaxConsecutive
    },
    away: {
      gamesWon: awayGamesWon,
      tiebreaksWon: awayTiebreaksWon,
      consecutiveGamesWon: awayMaxConsecutive
    }
  };
}

/**
 * Conta i break points effettivi analizzando i punteggi nel PBP
 * Score format: "home-away" (es. "40-30" = Home ha 40, Away ha 30)
 * Break point = receiver è a 40/A mentre server non ha A
 * Se server=away e homeScore=40 → Home (receiver) ha break point
 * Se server=home e awayScore=40 → Away (receiver) ha break point
 */
/**
 * FUNZIONE MASTER: Estrae TUTTE le statistiche dal PBP in un JSON strutturato
 * Questa è la SINGOLA fonte di verità per tutti i calcoli statistici
 * Score format: "home-away" (es. "40-30" = Home ha 40, Away ha 30)
 */
function extractAllStatsFromPBP(points) {
  if (!Array.isArray(points) || points.length === 0) return null;
  
  // Inizializza tutti i contatori
  const stats = {
    home: {
      // SERVE
      aces: 0,
      doubleFaults: 0,
      firstServeIn: 0,
      firstServeTotal: 0,
      firstServePointsWon: 0,
      secondServeTotal: 0,
      secondServePointsWon: 0,
      servicePointsWon: 0,
      servicePointsTotal: 0,
      serviceGamesWon: 0,
      serviceGamesTotal: 0,
      breakPointsFaced: 0,
      breakPointsSaved: 0,
      // RETURN  
      firstReturnPointsWon: 0,
      firstReturnPointsTotal: 0,
      secondReturnPointsWon: 0,
      secondReturnPointsTotal: 0,
      returnPointsWon: 0,
      returnPointsTotal: 0,
      breakPointsWon: 0,
      breakPointsTotal: 0,
      // POINTS
      totalPointsWon: 0,
      maxConsecutivePointsWon: 0,
      // GAMES
      gamesWon: 0,
      tiebreaksWon: 0,
      consecutiveGamesWon: 0
    },
    away: {
      aces: 0,
      doubleFaults: 0,
      firstServeIn: 0,
      firstServeTotal: 0,
      firstServePointsWon: 0,
      secondServeTotal: 0,
      secondServePointsWon: 0,
      servicePointsWon: 0,
      servicePointsTotal: 0,
      serviceGamesWon: 0,
      serviceGamesTotal: 0,
      breakPointsFaced: 0,
      breakPointsSaved: 0,
      firstReturnPointsWon: 0,
      firstReturnPointsTotal: 0,
      secondReturnPointsWon: 0,
      secondReturnPointsTotal: 0,
      returnPointsWon: 0,
      returnPointsTotal: 0,
      breakPointsWon: 0,
      breakPointsTotal: 0,
      totalPointsWon: 0,
      maxConsecutivePointsWon: 0,
      gamesWon: 0,
      tiebreaksWon: 0,
      consecutiveGamesWon: 0
    }
  };
  
  // Tracciatori per calcoli complessi
  let currentConsecutiveHome = 0;
  let currentConsecutiveAway = 0;
  let lastBpKeyHome = '';
  let lastBpKeyAway = '';
  let lastGameKey = '';
  let lastGameServer = null;
  let lastGameWinner = null;
  let currentConsecutiveGamesHome = 0;
  let currentConsecutiveGamesAway = 0;
  
  // Traccia primo/secondo servizio per game corrente
  let currentGameFirstServes = { home: 0, away: 0 };
  let currentGameKey = '';
  
  for (const point of points) {
    const server = point.server || point.gameServer;
    const winner = point.pointWinner;
    const score = point.score || '';
    const set = point.set;
    const game = point.game;
    const isAce = point.isAce || false;
    const isDoubleFault = point.isDoubleFault || false;
    const isTiebreak = point.isTiebreak || false;
    
    if (!server || !winner) continue;
    
    const gameKey = `${set}-${game}`;
    
    // Reset contatori per nuovo game
    if (gameKey !== currentGameKey) {
      currentGameKey = gameKey;
      currentGameFirstServes = { home: 0, away: 0 };
    }
    
    // === PUNTI TOTALI ===
    if (winner === 'home') {
      stats.home.totalPointsWon++;
      currentConsecutiveHome++;
      stats.home.maxConsecutivePointsWon = Math.max(stats.home.maxConsecutivePointsWon, currentConsecutiveHome);
      currentConsecutiveAway = 0;
    } else {
      stats.away.totalPointsWon++;
      currentConsecutiveAway++;
      stats.away.maxConsecutivePointsWon = Math.max(stats.away.maxConsecutivePointsWon, currentConsecutiveAway);
      currentConsecutiveHome = 0;
    }
    
    // === ACE e DOPPI FALLI ===
    if (isAce) {
      if (server === 'home') stats.home.aces++;
      else stats.away.aces++;
    }
    if (isDoubleFault) {
      if (server === 'home') stats.home.doubleFaults++;
      else stats.away.doubleFaults++;
    }
    
    // === SERVIZIO ===
    if (server === 'home') {
      stats.home.servicePointsTotal++;
      if (winner === 'home') stats.home.servicePointsWon++;
      
      // Determina se primo o secondo servizio
      // Primo servizio: primo punto del game o dopo un punto vinto/perso
      // Secondo servizio: dopo un fault (ma non abbiamo questo dato diretto)
      // APPROSSIMAZIONE: consideriamo che ~65% siano prime, ~35% seconde
      // Oppure usiamo isDoubleFault come indicatore di seconda
      if (!isDoubleFault) {
        // Se non è doppio fallo, è o prima o seconda andata dentro
        // Usiamo una euristica: track dei servizi per game
        currentGameFirstServes.home++;
        if (currentGameFirstServes.home <= 4) { // ~60% prime nei primi punti
          stats.home.firstServeTotal++;
          stats.home.firstServeIn++;
          if (winner === 'home') stats.home.firstServePointsWon++;
        } else {
          stats.home.secondServeTotal++;
          if (winner === 'home') stats.home.secondServePointsWon++;
        }
      } else {
        // Doppio fallo = seconda servizio fallita
        stats.home.secondServeTotal++;
      }
      
      // Return per Away (quando Home serve)
      stats.away.returnPointsTotal++;
      if (winner === 'away') stats.away.returnPointsWon++;
      
    } else if (server === 'away') {
      stats.away.servicePointsTotal++;
      if (winner === 'away') stats.away.servicePointsWon++;
      
      if (!isDoubleFault) {
        currentGameFirstServes.away++;
        if (currentGameFirstServes.away <= 4) {
          stats.away.firstServeTotal++;
          stats.away.firstServeIn++;
          if (winner === 'away') stats.away.firstServePointsWon++;
        } else {
          stats.away.secondServeTotal++;
          if (winner === 'away') stats.away.secondServePointsWon++;
        }
      } else {
        stats.away.secondServeTotal++;
      }
      
      // Return per Home (quando Away serve)
      stats.home.returnPointsTotal++;
      if (winner === 'home') stats.home.returnPointsWon++;
    }
    
    // === BREAK POINTS (dal punteggio) ===
    // Ogni punto con score 40-X o A-40 è un break point UNICO
    // Non usiamo chiavi per evitare duplicati - ogni punto è un BP separato
    const parts = score.split('-');
    if (parts.length === 2) {
      const homeScore = parts[0].trim();
      const awayScore = parts[1].trim();
      
      // BP per Home (quando Away serve e Home è a 40/A)
      if (server === 'away') {
        const isBP = (homeScore === '40' && ['0', '15', '30'].includes(awayScore)) ||
                     (homeScore === 'A' && awayScore === '40');
        if (isBP) {
          // Ogni punto con questo score è un break point
          stats.away.breakPointsFaced++;
          stats.home.breakPointsTotal++;
          if (winner === 'away') {
            stats.away.breakPointsSaved++;
          } else if (winner === 'home') {
            stats.home.breakPointsWon++;
          }
        }
      }
      
      // BP per Away (quando Home serve e Away è a 40/A)
      if (server === 'home') {
        const isBP = (awayScore === '40' && ['0', '15', '30'].includes(homeScore)) ||
                     (awayScore === 'A' && homeScore === '40');
        if (isBP) {
          stats.home.breakPointsFaced++;
          stats.away.breakPointsTotal++;
          if (winner === 'home') {
            stats.home.breakPointsSaved++;
          } else if (winner === 'away') {
            stats.away.breakPointsWon++;
          }
        }
      }
    }
    
    // === GAMES (traccia vincitori di game) ===
    // Rileva fine game quando il punteggio torna a 0-0 o cambia set/game
    if (gameKey !== lastGameKey && lastGameKey !== '') {
      // Il game precedente è finito
      if (lastGameServer && lastGameWinner) {
        if (lastGameServer === 'home') {
          stats.home.serviceGamesTotal++;
          if (lastGameWinner === 'home') {
            stats.home.serviceGamesWon++;
            stats.home.gamesWon++;
            currentConsecutiveGamesHome++;
            stats.home.consecutiveGamesWon = Math.max(stats.home.consecutiveGamesWon, currentConsecutiveGamesHome);
            currentConsecutiveGamesAway = 0;
          } else {
            stats.away.gamesWon++;
            currentConsecutiveGamesAway++;
            stats.away.consecutiveGamesWon = Math.max(stats.away.consecutiveGamesWon, currentConsecutiveGamesAway);
            currentConsecutiveGamesHome = 0;
          }
        } else {
          stats.away.serviceGamesTotal++;
          if (lastGameWinner === 'away') {
            stats.away.serviceGamesWon++;
            stats.away.gamesWon++;
            currentConsecutiveGamesAway++;
            stats.away.consecutiveGamesWon = Math.max(stats.away.consecutiveGamesWon, currentConsecutiveGamesAway);
            currentConsecutiveGamesHome = 0;
          } else {
            stats.home.gamesWon++;
            currentConsecutiveGamesHome++;
            stats.home.consecutiveGamesWon = Math.max(stats.home.consecutiveGamesWon, currentConsecutiveGamesHome);
            currentConsecutiveGamesAway = 0;
          }
        }
      }
    }
    
    lastGameKey = gameKey;
    lastGameServer = server;
    lastGameWinner = winner; // L'ultimo winner del game è chi ha vinto il game
  }
  
  // Processa l'ultimo game
  if (lastGameServer && lastGameWinner) {
    if (lastGameServer === 'home') {
      stats.home.serviceGamesTotal++;
      if (lastGameWinner === 'home') {
        stats.home.serviceGamesWon++;
        stats.home.gamesWon++;
        currentConsecutiveGamesHome++;
        stats.home.consecutiveGamesWon = Math.max(stats.home.consecutiveGamesWon, currentConsecutiveGamesHome);
      } else {
        stats.away.gamesWon++;
        currentConsecutiveGamesAway++;
        stats.away.consecutiveGamesWon = Math.max(stats.away.consecutiveGamesWon, currentConsecutiveGamesAway);
      }
    } else {
      stats.away.serviceGamesTotal++;
      if (lastGameWinner === 'away') {
        stats.away.serviceGamesWon++;
        stats.away.gamesWon++;
        currentConsecutiveGamesAway++;
        stats.away.consecutiveGamesWon = Math.max(stats.away.consecutiveGamesWon, currentConsecutiveGamesAway);
      } else {
        stats.home.gamesWon++;
        currentConsecutiveGamesHome++;
        stats.home.consecutiveGamesWon = Math.max(stats.home.consecutiveGamesWon, currentConsecutiveGamesHome);
      }
    }
  }
  
  // === CALCOLI DERIVATI ===
  // First/Second Return Points
  stats.home.firstReturnPointsTotal = stats.away.firstServeIn;
  stats.home.firstReturnPointsWon = stats.away.firstServeIn - stats.away.firstServePointsWon;
  stats.home.secondReturnPointsTotal = stats.away.secondServeTotal;
  stats.home.secondReturnPointsWon = stats.away.secondServeTotal - stats.away.secondServePointsWon;
  
  stats.away.firstReturnPointsTotal = stats.home.firstServeIn;
  stats.away.firstReturnPointsWon = stats.home.firstServeIn - stats.home.firstServePointsWon;
  stats.away.secondReturnPointsTotal = stats.home.secondServeTotal;
  stats.away.secondReturnPointsWon = stats.home.secondServeTotal - stats.home.secondServePointsWon;
  
  console.log('📊 PBP Stats Extracted:', JSON.stringify({
    totalPoints: stats.home.totalPointsWon + stats.away.totalPointsWon,
    home: { 
      total: stats.home.totalPointsWon,
      service: stats.home.servicePointsWon,
      return: stats.home.returnPointsWon,
      bpFaced: stats.home.breakPointsFaced,
      bpSaved: stats.home.breakPointsSaved
    },
    away: {
      total: stats.away.totalPointsWon,
      service: stats.away.servicePointsWon,
      return: stats.away.returnPointsWon,
      bpFaced: stats.away.breakPointsFaced,
      bpSaved: stats.away.breakPointsSaved
    }
  }));
  
  return stats;
}

/**
 * Calcola le statistiche break dai dati point_by_point reali
 * FILOSOFIA: serving !== scoring = break, serving === scoring = hold
 */
function calculateBreakStatsFromPointByPoint(pointByPoint) {
  if (!Array.isArray(pointByPoint) || pointByPoint.length === 0) return null;
  
  let homeBreakPointsWon = 0;     // Break convertiti da home (away perde servizio)
  let awayBreakPointsWon = 0;     // Break convertiti da away (home perde servizio)
  let homeGamesServed = 0;        // Giochi serviti da home
  let awayGamesServed = 0;        // Giochi serviti da away
  let homeHolds = 0;             // Servizi tenuti da home
  let awayHolds = 0;             // Servizi tenuti da away
  
  // Conta break e hold da tutti i punti (ogni punto rappresenta un game)
  for (const p of pointByPoint) {
    const server = p.serving === 1 ? 'home' : (p.serving === 2 ? 'away' : null);
    const winner = p.scoring === 1 ? 'home' : (p.scoring === 2 ? 'away' : null);
    
    if (server && winner) {
      if (server === 'home') {
        homeGamesServed++;
        if (winner === 'home') {
          homeHolds++;
        } else {
          // Home serve e perde → away converte break
          awayBreakPointsWon++;
        }
      } else {
        awayGamesServed++;
        if (winner === 'away') {
          awayHolds++;
        } else {
          // Away serve e perde → home converte break  
          homeBreakPointsWon++;
        }
      }
    }
  }
  
  // STIMA break points totali: in un match con tanti break, 
  // ogni game di servizio ha in media 1.5-2 break points
  // Se ci sono molti break (>70%), stima più break points
  const homeBreakRate = homeGamesServed > 0 ? awayBreakPointsWon / homeGamesServed : 0;
  const awayBreakRate = awayGamesServed > 0 ? homeBreakPointsWon / awayGamesServed : 0;
  
  // Se break rate > 80% (match molto combattuto), stima ~2 BP per game servito
  // Se break rate < 20% (molti hold), stima ~1.2 BP per game servito  
  const homeBpMultiplier = homeBreakRate > 0.8 ? 2.0 : (homeBreakRate > 0.5 ? 1.7 : 1.3);
  const awayBpMultiplier = awayBreakRate > 0.8 ? 2.0 : (awayBreakRate > 0.5 ? 1.7 : 1.3);
  
  const homeBreakPointsTotal = Math.max(homeBreakPointsWon, Math.round(awayGamesServed * homeBpMultiplier));
  const awayBreakPointsTotal = Math.max(awayBreakPointsWon, Math.round(homeGamesServed * awayBpMultiplier));
  
  return {
    home: {
      breakPointsWon: homeBreakPointsWon,
      breakPointsTotal: homeBreakPointsTotal,
      breakPointsSaved: homeBreakPointsTotal - homeBreakPointsWon
    },
    away: {
      breakPointsWon: awayBreakPointsWon, 
      breakPointsTotal: awayBreakPointsTotal,
      breakPointsSaved: awayBreakPointsTotal - awayBreakPointsWon
    }
  };
}

function calculateWinProbability(features, statistics) {
  // Simple probability model based on features
  const { dominance = 50, serveDominance = 50, returnDominance = 50 } = features;
  
  // Home win prob starts at dominance
  let homeProb = dominance;
  
  // Adjust for serve performance differential
  const homeServe = parseFloat(statistics.home?.firstServePointsWonPct) || 50;
  const awayServe = parseFloat(statistics.away?.firstServePointsWonPct) || 50;
  homeProb += (homeServe - awayServe) * 0.3;
  
  return {
    home: Math.round(Math.max(5, Math.min(95, homeProb))),
    away: Math.round(Math.max(5, Math.min(95, 100 - homeProb)))
  };
}

function extractKeyFactors(features, strategies) {
  const factors = [];
  
  if (features.volatility > 60) {
    factors.push({ factor: 'High Volatility', impact: 'neutral', value: features.volatility });
  }
  if (features.pressure > 60) {
    factors.push({ factor: 'Server Under Pressure', impact: 'negative', value: features.pressure });
  }
  if (features.dominance > 65) {
    factors.push({ factor: 'Home Dominating', impact: 'positive', value: features.dominance });
  } else if (features.dominance < 35) {
    factors.push({ factor: 'Away Dominating', impact: 'negative', value: features.dominance });
  }
  if (features.breakProbability > 50) {
    factors.push({ factor: 'Break Likely', impact: 'neutral', value: features.breakProbability });
  }
  
  // Add strategy-based factors
  const readyStrategies = strategies.filter(s => s.status === 'READY');
  readyStrategies.forEach(s => {
    factors.push({ 
      factor: s.name, 
      impact: s.action === 'BACK' ? 'positive' : 'negative',
      value: Math.round(s.confidence * 100)
    });
  });
  
  return factors;
}

function calculateDataQuality(matchData, statistics, momentum) {
  let score = 0;
  let total = 0;
  
  // Match data (30%)
  total += 30;
  if (matchData?.match) score += 10;
  if (matchData?.player1?.name) score += 10;
  if (matchData?.player2?.name) score += 10;
  
  // Statistics (30%)
  total += 30;
  if (statistics && statistics.length > 0) score += 15;
  if (statistics?.[0]?.aces !== undefined) score += 15;
  
  // Momentum (20%)
  total += 20;
  if (momentum && momentum.length > 0) score += 10;
  if (momentum && momentum.length > 10) score += 10;
  
  // Odds (20%)
  total += 20;
  if (matchData?.odds) score += 20;
  
  return Math.round((score / total) * 100);
}

/**
 * GET /api/match/:eventId/refresh - Forza aggiornamento da SofaScore e salva su DB
 */
app.get('/api/match/:eventId/refresh', async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    const result = await syncMatch(eventId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
});

// ============================================================================
// NUOVE API - Match Card Service e Player Service
// ============================================================================

/**
 * GET /api/match/:eventId/card - Card completa del match (FAST - from snapshot)
 * Prima verifica snapshot, se non esiste usa il service tradizionale
 */
app.get('/api/match/:eventId/card', async (req, res) => {
  const { eventId } = req.params;
  const { useSnapshot = 'true' } = req.query;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    // Try snapshot first (fast path)
    if (useSnapshot === 'true' && matchRepository) {
      const snapshot = await matchRepository.getMatchCardSnapshot(parseInt(eventId));
      
      if (snapshot) {
        console.log(`⚡ Match card ${eventId} from snapshot (quality=${snapshot.data_quality_int}%)`);
        
        // Format snapshot for API response
        return res.json({
          match: snapshot.core_json,
          tournament: snapshot.core_json?.tournament,
          player1: snapshot.players_json?.player1,
          player2: snapshot.players_json?.player2,
          h2h: snapshot.h2h_json,
          statistics: snapshot.stats_json,
          momentum: snapshot.momentum_json,
          odds: snapshot.odds_json,
          dataSources: snapshot.data_sources_json?.map(s => s.source_type) || [],
          dataQuality: snapshot.data_quality_int,
          fromSnapshot: true,
          snapshotUpdatedAt: snapshot.last_updated_at
        });
      }
    }
    
    // Fallback to traditional service
    if (!matchCardService) {
      return res.status(503).json({ error: 'Match Card Service not available' });
    }
    
    const card = await matchCardService.getMatchCard(parseInt(eventId));
    
    if (!card) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    console.log(`🎾 Match card ${eventId}: quality=${card.dataQuality}%, sources=${card.dataSources?.join(', ')}`);
    res.json({ ...card, fromSnapshot: false });
  } catch (err) {
    console.error('Error getting match card:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/match/:eventId/momentum - Solo power rankings (lazy load)
 */
app.get('/api/match/:eventId/momentum', async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId || !matchRepository) {
    return res.status(400).json({ error: 'Missing eventId or repository not available' });
  }
  
  try {
    const momentum = await matchRepository.getMatchMomentum(parseInt(eventId));
    res.json({ matchId: eventId, momentum, count: momentum.length });
  } catch (err) {
    console.error('Error getting momentum:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/match/:eventId/momentum-svg - Inserisce momentum estratto da SVG DOM
 * Body: { svgHtml: string } oppure { powerRankings: Array }
 * 
 * NUOVO: Genera anche dati point-by-point sintetici dai game SVG
 * Questo permette di visualizzare almeno i game nel PointByPointTab
 */
app.post('/api/match/:eventId/momentum-svg', async (req, res) => {
  const { eventId } = req.params;
  const { svgHtml, powerRankings } = req.body;
  
  if (!eventId || !matchRepository) {
    return res.status(400).json({ error: 'Missing eventId or repository not available' });
  }
  
  if (!svgHtml && !powerRankings) {
    return res.status(400).json({ error: 'Missing svgHtml or powerRankings in body' });
  }
  
  try {
    let rankings = powerRankings;
    
    // Se è passato svgHtml, estrailo
    if (svgHtml && !powerRankings) {
      const { processSvgMomentum } = require('./utils/svgMomentumExtractor');
      const result = processSvgMomentum(svgHtml);
      
      if (!result.ok) {
        return res.status(400).json({ error: result.error });
      }
      
      rankings = result.powerRankings;
    }
    
    if (!rankings || rankings.length === 0) {
      return res.status(400).json({ error: 'No power rankings extracted' });
    }
    
    // Inserisci nel DB con source = 'svg_dom'
    const inserted = await matchRepository.insertPowerRankingsSvg(parseInt(eventId), rankings);
    
    // FILOSOFIA: Genera point-by-point sintetici SOLO se non esistono già
    // Se esistono dati SofaScore con serving/scoring corretti, NON sovrascrivere
    let pbpInserted = 0;
    const existingPbp = await supabaseClient.supabase
      .from('point_by_point')
      .select('id')
      .eq('match_id', parseInt(eventId))
      .limit(1);
    
    if (!existingPbp.data || existingPbp.data.length === 0) {
      // Nessun point_by_point esistente, genera sintetici dal SVG
      pbpInserted = await generatePointByPointFromSvg(parseInt(eventId), rankings);
      console.log(`📊 SVG Momentum inserito per match ${eventId}: ${inserted} game, ${pbpInserted} punti sintetici generati`);
    } else {
      console.log(`📊 SVG Momentum inserito per match ${eventId}: ${inserted} game (point_by_point già esistenti, non sovrascritti)`);
    }
    
    res.json({ 
      success: true, 
      matchId: eventId, 
      inserted,
      gamesCount: rankings.length,
      pointByPointGenerated: pbpInserted,
      pointByPointPreserved: existingPbp.data?.length > 0
    });
  } catch (err) {
    console.error('Error inserting SVG momentum:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Genera dati point-by-point sintetici dai power rankings SVG
 * Crea un "punto finale" per ogni game che rappresenta il risultato
 * 
 * @param {number} matchId - ID del match
 * @param {Array} rankings - Power rankings estratti da SVG
 * @returns {number} Numero di punti inseriti
 */
async function generatePointByPointFromSvg(matchId, rankings) {
  if (!supabaseClient?.supabase || !rankings || rankings.length === 0) return 0;
  
  const supabase = supabaseClient.supabase;
  
  // Prima elimina vecchi punti per questo match
  await supabase.from('point_by_point')
    .delete()
    .eq('match_id', matchId);
  
  // Raggruppa per set per calcolare i punteggi dei game
  const setMap = new Map();
  for (const r of rankings) {
    const setNum = r.set || 1;
    if (!setMap.has(setNum)) {
      setMap.set(setNum, []);
    }
    setMap.get(setNum).push(r);
  }
  
  const points = [];
  
  for (const [setNum, games] of setMap) {
    // Ordina per game number
    games.sort((a, b) => (a.game || 1) - (b.game || 1));
    
    let homeGames = 0;
    let awayGames = 0;
    
    for (const g of games) {
      const gameNum = g.game || 1;
      const value = g.value || 0;
      
      // Determina chi ha vinto il game dal valore momentum
      // value > 0 = home winning, value < 0 = away winning
      const gameWinner = value >= 0 ? 'home' : 'away';
      
      // Determina il server (alterna ogni game, home inizia game dispari nel set 1)
      const homeServesFirst = setNum % 2 === 1;
      const isOddGame = gameNum % 2 === 1;
      const server = homeServesFirst ? (isOddGame ? 'home' : 'away') : (isOddGame ? 'away' : 'home');
      
      // Aggiorna punteggio
      if (gameWinner === 'home') homeGames++;
      else awayGames++;
      
      // Determina se è un break
      const isBreak = server !== gameWinner;
      
      // Crea un punto "sintetico" che rappresenta la fine del game
      // Usa lo schema corretto della tabella point_by_point
      points.push({
        match_id: matchId,
        set_number: setNum,
        game_number: gameNum,
        point_index: 1,  // Un solo punto per game (sintetico)
        home_point: 'G', // Game point
        away_point: 'G',
        score_before: `${homeGames - (gameWinner === 'home' ? 1 : 0)}-${awayGames - (gameWinner === 'away' ? 1 : 0)}`,
        score_after: `${homeGames}-${awayGames}`,
        point_winner: gameWinner,
        serving: server === 'home' ? 1 : 2,
        scoring: gameWinner === 'home' ? 1 : 2,
        is_break_point: isBreak,
        is_ace: false,
        is_double_fault: false,
        point_description: isBreak ? 'Break' : 'Hold'
      });
    }
  }
  
  if (points.length > 0) {
    const { error } = await supabase.from('point_by_point').insert(points);
    if (error) {
      console.error('Error inserting synthetic PbP:', error.message);
      return 0;
    }
    console.log(`Generated ${points.length} synthetic point-by-point records from SVG for match ${matchId}`);
  }
  
  return points.length;
}

/**
 * GET /api/match/:eventId/statistics - Solo statistiche match (lazy load)
 */
app.get('/api/match/:eventId/statistics', async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId || !matchRepository) {
    return res.status(400).json({ error: 'Missing eventId or repository not available' });
  }
  
  try {
    const statistics = await matchRepository.getMatchStatisticsNew(parseInt(eventId));
    res.json({ matchId: eventId, statistics });
  } catch (err) {
    console.error('Error getting statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/match/:eventId/odds - Solo quote (lazy load)
 */
app.get('/api/match/:eventId/odds', async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId || !matchRepository) {
    return res.status(400).json({ error: 'Missing eventId or repository not available' });
  }
  
  try {
    const odds = await matchRepository.getMatchOdds(parseInt(eventId));
    res.json({ matchId: eventId, odds });
  } catch (err) {
    console.error('Error getting odds:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/match/:eventId/points - Point-by-point (lazy load, paginated)
 */
app.get('/api/match/:eventId/points', async (req, res) => {
  const { eventId } = req.params;
  const { offset = 0, limit = 500 } = req.query;
  
  if (!eventId || !matchRepository) {
    return res.status(400).json({ error: 'Missing eventId or repository not available' });
  }
  
  try {
    const result = await matchRepository.getMatchPointByPoint(parseInt(eventId), {
      offset: parseInt(offset),
      limit: parseInt(limit)
    });
    res.json({ matchId: eventId, ...result });
  } catch (err) {
    console.error('Error getting point-by-point:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/match/:eventId/rebuild-snapshot - Forza rebuild snapshot
 */
app.post('/api/match/:eventId/rebuild-snapshot', async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId || !matchRepository) {
    return res.status(400).json({ error: 'Missing eventId or repository not available' });
  }
  
  try {
    await matchRepository.buildMatchCardSnapshot(parseInt(eventId));
    const snapshot = await matchRepository.getMatchCardSnapshot(parseInt(eventId));
    res.json({ success: true, matchId: eventId, snapshot });
  } catch (err) {
    console.error('Error rebuilding snapshot:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// CALCULATION QUEUE & RAW EVENTS API
// ============================================================================

/**
 * GET /api/admin/queue/stats - Queue statistics
 */
app.get('/api/admin/queue/stats', async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Repository not available' });
  }
  
  try {
    const stats = await matchRepository.getQueueStats();
    res.json({ stats });
  } catch (err) {
    console.error('Error getting queue stats:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/queue/enqueue - Manually enqueue a task
 */
app.post('/api/admin/queue/enqueue', async (req, res) => {
  const { taskType, payload, uniqueKey, priority } = req.body;
  
  if (!taskType || !payload || !uniqueKey || !matchRepository) {
    return res.status(400).json({ error: 'Missing required fields or repository not available' });
  }
  
  try {
    const taskId = await matchRepository.enqueueCalculation(taskType, payload, uniqueKey, priority || 5);
    res.json({ success: true, taskId });
  } catch (err) {
    console.error('Error enqueueing task:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/player/:playerId/ranking-history - Player ranking at specific dates
 */
app.get('/api/player/:playerId/ranking-history', async (req, res) => {
  const { playerId } = req.params;
  const { date } = req.query;
  
  if (!playerId || !matchRepository) {
    return res.status(400).json({ error: 'Missing playerId or repository not available' });
  }
  
  try {
    if (date) {
      // Get ranking at specific date
      const ranking = await matchRepository.getRankingAtDate(parseInt(playerId), date);
      res.json({ playerId, date, ranking });
    } else {
      // TODO: Get full history
      res.json({ playerId, message: 'Full history not implemented yet' });
    }
  } catch (err) {
    console.error('Error getting ranking history:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/matches/cards - Lista match con card minimali
 */
app.get('/api/matches/cards', async (req, res) => {
  const { limit = 20, surface, tournament, playerId } = req.query;
  
  if (!matchCardService) {
    return res.status(503).json({ error: 'Match Card Service not available' });
  }
  
  try {
    const matches = await matchCardService.getRecentMatches(
      parseInt(limit),
      { surface, tournament: tournament ? parseInt(tournament) : null, playerId: playerId ? parseInt(playerId) : null }
    );
    
    res.json({ matches, count: matches.length });
  } catch (err) {
    console.error('Error getting match cards:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/player/:playerId - Dettagli giocatore
 */
app.get('/api/player/:playerId', async (req, res) => {
  const { playerId } = req.params;
  
  if (!playerId) {
    return res.status(400).json({ error: 'Missing playerId' });
  }
  
  if (!playerService) {
    return res.status(503).json({ error: 'Player Service not available' });
  }
  
  try {
    const player = await playerService.getById(parseInt(playerId));
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Aggiungi statistiche carriera
    const careerStats = await playerService.getCareerStats(player.id);
    const aliases = await playerService.getAliases(player.id);
    
    res.json({
      ...player,
      careerStats,
      aliases
    });
  } catch (err) {
    console.error('Error getting player:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/players - Cerca giocatori
 */
app.get('/api/search/players', async (req, res) => {
  const { q, limit = 10 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }
  
  if (!playerService) {
    return res.status(503).json({ error: 'Player Service not available' });
  }
  
  try {
    const players = await playerService.search(q, parseInt(limit));
    res.json({ players });
  } catch (err) {
    console.error('Error searching players:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/player/alias - Aggiungi alias per un giocatore
 */
app.post('/api/player/alias', async (req, res) => {
  const { playerId, aliasName, source } = req.body;
  
  if (!playerId || !aliasName) {
    return res.status(400).json({ error: 'Missing playerId or aliasName' });
  }
  
  if (!playerService) {
    return res.status(503).json({ error: 'Player Service not available' });
  }
  
  try {
    await playerService.addAlias(parseInt(playerId), aliasName, source || 'manual');
    res.json({ success: true, message: `Alias "${aliasName}" added for player ${playerId}` });
  } catch (err) {
    console.error('Error adding alias:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/player/merge - Unisci due giocatori duplicati
 */
app.post('/api/player/merge', async (req, res) => {
  const { keepId, mergeId } = req.body;
  
  if (!keepId || !mergeId) {
    return res.status(400).json({ error: 'Missing keepId or mergeId' });
  }
  
  if (!playerService) {
    return res.status(503).json({ error: 'Player Service not available' });
  }
  
  try {
    const success = await playerService.mergePlayers(parseInt(keepId), parseInt(mergeId));
    if (success) {
      res.json({ success: true, message: `Player ${mergeId} merged into ${keepId}` });
    } else {
      res.status(400).json({ error: 'Merge failed' });
    }
  } catch (err) {
    console.error('Error merging players:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// PLAYER PROFILE ENDPOINTS (Sessione 3 - New Analytics)
// ============================================================================

/**
 * GET /api/player/:playerName/profile - Profilo completo aggregato giocatore
 * Query params: surface, format, series
 */
app.get('/api/player/:playerName/profile', async (req, res) => {
  const { playerName } = req.params;
  const { surface, format, series } = req.query;
  
  if (!playerName) {
    return res.status(400).json({ error: 'Missing playerName' });
  }
  
  if (!playerProfileService) {
    return res.status(503).json({ error: 'Player Profile Service not available' });
  }
  
  try {
    const profile = await playerProfileService.getPlayerProfile(
      decodeURIComponent(playerName),
      { surface, format, series }
    );
    
    res.json(profile);
  } catch (err) {
    console.error('Error getting player profile:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/player/:playerName/inspector - Data Inspector per giocatore
 * Restituisce dati puri vs calcolati con info sulla copertura
 */
app.get('/api/player/:playerName/inspector', async (req, res) => {
  const { playerName } = req.params;
  
  if (!playerName) {
    return res.status(400).json({ error: 'Missing playerName' });
  }
  
  try {
    const decodedName = decodeURIComponent(playerName);
    console.log(`🔬 Inspector: Loading data for "${decodedName}"`);
    
    // Dati puri dal database - usa playerProfileService.getPlayerMatches() per fuzzy matching
    const rawData = {};
    let playerMatches = [];
    
    // Carica match del giocatore usando il servizio che ha fuzzy matching
    if (playerProfileService && playerProfileService.getPlayerMatches) {
      playerMatches = await playerProfileService.getPlayerMatches(decodedName);
      console.log(`   Found ${playerMatches.length} matches via playerProfileService`);
    } else if (matchRepository && matchRepository.getMatches) {
      // Fallback: cerca per nome giocatore
      const allMatches = await matchRepository.getMatches({ limit: 5000, playerSearch: decodedName });
      playerMatches = allMatches || [];
      console.log(`   Found ${playerMatches.length} matches via matchRepository`);
    }
    
    if (playerMatches.length > 0) {
      // Conteggi base
      rawData.totalMatches = playerMatches.length;
      
      // Vittorie/sconfitte
      rawData.wins = playerMatches.filter(m => m.player_role === 'winner').length;
      rawData.losses = playerMatches.filter(m => m.player_role === 'loser').length;
      
      // Superfici (dati puri dal DB)
      const surfaces = playerMatches.map(m => m.surface || m.surface_normalized).filter(Boolean);
      rawData.surfaces = {
        hard: surfaces.filter(s => s.toLowerCase().includes('hard')).length,
        clay: surfaces.filter(s => s.toLowerCase().includes('clay')).length,
        grass: surfaces.filter(s => s.toLowerCase().includes('grass')).length,
        indoor: surfaces.filter(s => s.toLowerCase().includes('indoor')).length
      };
      
      // Tornei (dati puri dal DB)
      const series = playerMatches.map(m => m.series || m.series_normalized).filter(Boolean);
      rawData.series = {
        grandSlam: series.filter(s => s.includes('Grand Slam')).length,
        masters: series.filter(s => s.includes('Masters')).length,
        atp250: series.filter(s => s.includes('ATP250') || s.includes('250')).length,
        atp500: series.filter(s => s.includes('ATP500') || s.includes('500')).length,
        challenger: series.filter(s => s.toLowerCase().includes('challenger')).length
      };
      
      // Quote disponibili (dati puri dal DB)
      const matchesWithOdds = playerMatches.filter(m => m.avgw || m.maxw || m.avgl || m.maxl);
      rawData.matchesWithOdds = matchesWithOdds.length;
      if (matchesWithOdds.length > 0) {
        const avgOdds = matchesWithOdds.reduce((sum, m) => sum + (parseFloat(m.avgw) || parseFloat(m.avgl) || 0), 0) / matchesWithOdds.length;
        rawData.avgOddsValue = avgOdds.toFixed(2);
      }
      
      // Punteggi disponibili (dati puri: w1, l1, w2, l2, etc.)
      const matchesWithScore = playerMatches.filter(m => m.w1 !== null && m.l1 !== null);
      rawData.matchesWithScore = matchesWithScore.length;
      
      // Set breakdown per ogni match (campione dei primi 10)
      rawData.sampleMatches = playerMatches.slice(0, 5).map(m => ({
        opponent: m.player_role === 'winner' ? m.loser_name : m.winner_name,
        result: m.player_role,
        surface: m.surface,
        sets: [
          m.w1 !== null ? `${m.w1}-${m.l1}` : null,
          m.w2 !== null ? `${m.w2}-${m.l2}` : null,
          m.w3 !== null ? `${m.w3}-${m.l3}` : null,
          m.w4 !== null ? `${m.w4}-${m.l4}` : null,
          m.w5 !== null ? `${m.w5}-${m.l5}` : null
        ].filter(Boolean).join(', '),
        odds: m.avgw || m.avgl || 'N/A'
      }));
      
      // Tornei unici
      rawData.uniqueTournaments = [...new Set(playerMatches.map(m => m.tournament_name || m.tournament).filter(Boolean))].length;
      
      // Range date
      const dates = playerMatches.map(m => m.dateTimestamp || m.date || m.start_time).filter(Boolean).sort();
      rawData.earliestMatch = dates[0] || 'N/A';
      rawData.latestMatch = dates[dates.length - 1] || 'N/A';
    }
    
    // Dati calcolati
    const calculatedData = {};
    
    if (playerProfileService && rawData.totalMatches > 0) {
      try {
        const profile = await playerProfileService.getPlayerProfile(decodedName, {});
        // I dati sono in profile.global, profile.by_surface, etc.
        if (profile.global) {
          calculatedData.winRate = profile.global.win_rate;
          calculatedData.totalWins = profile.global.wins;
          calculatedData.totalLosses = profile.global.losses;
          calculatedData.avgSetsPerMatch = profile.global.avg_sets_per_match;
          calculatedData.tiebreakWinRate = profile.global.tiebreak_win_rate;
        }
        if (profile.special_metrics) {
          calculatedData.comebackRate = profile.special_metrics.comeback_rate;
          calculatedData.firstSetWinRate = profile.special_metrics.first_set_win_rate;
          calculatedData.decidingSetWinRate = profile.special_metrics.deciding_set_win_rate;
          calculatedData.matchWinAfterFirstSet = profile.special_metrics.match_win_after_first_set;
        }
        if (profile.recent_form) {
          calculatedData.recentForm = profile.recent_form;
        }
        if (profile.roi) {
          calculatedData.roi = profile.roi;
        }
        if (profile.by_surface) {
          calculatedData.bySurface = profile.by_surface;
        }
        if (profile.by_format) {
          calculatedData.byFormat = profile.by_format;
        }
        if (profile.by_series) {
          calculatedData.bySeries = profile.by_series;
        }
      } catch (e) {
        console.warn('Could not calculate profile:', e.message);
      }
    }
    
    // Coverage info
    const totalPossibleFields = 15;
    let availableFields = 0;
    if (rawData.totalMatches > 0) availableFields += 3;
    if (rawData.matchesWithOdds > 0) availableFields += 2;
    if (rawData.matchesWithStats > 0) availableFields += 3;
    if (rawData.matchesWithPowerRankings > 0) availableFields += 2;
    if (calculatedData.winRate !== undefined) availableFields += 2;
    if (calculatedData.comebackRate !== undefined) availableFields += 3;
    
    // Fonti dati
    const sources = [
      { name: 'Match History', available: rawData.totalMatches > 0 },
      { name: 'Odds Data', available: rawData.matchesWithOdds > 0 },
      { name: 'Statistics', available: rawData.matchesWithStats > 0 },
      { name: 'Power Rankings', available: rawData.matchesWithPowerRankings > 0 },
      { name: 'Profile Service', available: Object.keys(calculatedData).length > 0 }
    ];
    
    res.json({
      name: decodedName,
      rawData,
      calculatedData,
      coverage: {
        total: totalPossibleFields,
        available: availableFields
      },
      sources
    });
    
  } catch (err) {
    console.error('Error in player inspector:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/match/:matchId/inspector - Data Inspector per match
 * Restituisce dati puri vs calcolati con info sulla copertura
 */
app.get('/api/match/:matchId/inspector', async (req, res) => {
  const { matchId } = req.params;
  
  if (!matchId) {
    return res.status(400).json({ error: 'Missing matchId' });
  }
  
  try {
    // Dati puri dal database
    let rawData = {};
    let match = null;
    let matchInfo = '';
    
    if (matchRepository) {
      // Prova prima per eventId (stringa)
      const matches = await matchRepository.getAllMatches();
      match = matches.find(m => 
        String(m.event_id) === String(matchId) || 
        String(m.id) === String(matchId) ||
        String(m.eventId) === String(matchId)
      );
      
      if (match) {
        matchInfo = `${match.home_player} vs ${match.away_player}`;
        
        rawData = {
          homePlayer: match.home_player || 'N/A',
          awayPlayer: match.away_player || 'N/A',
          tournament: match.tournament_name || match.tournament || 'N/A',
          surface: match.surface || 'N/A',
          status: match.status || 'N/A',
          score: match.score || 'N/A',
          winner: match.winner || 'N/A',
          loser: match.loser || 'N/A',
          set1: match.w1 && match.l1 ? `${match.w1}-${match.l1}` : 'N/A',
          set2: match.w2 && match.l2 ? `${match.w2}-${match.l2}` : 'N/A',
          set3: match.w3 && match.l3 ? `${match.w3}-${match.l3}` : 'N/A',
          oddsWinner: match.avgw || match.avg_odds_winner || 'N/A',
          oddsLoser: match.avgl || match.avg_odds_loser || 'N/A',
          statsCount: match.statistics ? Object.keys(match.statistics).length : 0,
          powerRankingsCount: match.power_rankings?.length || 0,
          pointByPointCount: match.point_by_point?.length || 0,
          bestOf: match.best_of || 'N/A',
          series: match.series || 'N/A'
        };
      }
    }
    
    // Dati calcolati
    const calculatedData = {};
    
    if (match && match.power_rankings && match.power_rankings.length > 0) {
      try {
        const analysis = analyzePowerRankings(match.power_rankings, {
          surface: match.surface,
          bestOf: match.best_of || 3
        });
        calculatedData.volatility = analysis?.volatility;
        calculatedData.elasticity = analysis?.elasticity;
        calculatedData.matchCharacter = analysis?.character;
        calculatedData.trend = analysis?.trend;
        calculatedData.tradingIndicators = analysis?.tradingIndicators;
      } catch (e) {
        console.warn('Could not analyze power rankings:', e.message);
      }
    }
    
    if (match && breakDetector) {
      try {
        const breakAnalysis = breakDetector.analyzeSetBreaks({ 
          score: match.score,
          w1: match.w1, l1: match.l1,
          w2: match.w2, l2: match.l2,
          w3: match.w3, l3: match.l3,
          w4: match.w4, l4: match.l4,
          w5: match.w5, l5: match.l5
        });
        calculatedData.breakAnalysis = breakAnalysis;
      } catch (e) {
        console.warn('Could not analyze breaks:', e.message);
      }
    }
    
    if (match && matchSegmenter) {
      try {
        const segments = matchSegmenter.getSegmentSummary({
          power_rankings: match.power_rankings,
          score: match.score
        });
        calculatedData.segments = segments;
      } catch (e) {
        console.warn('Could not segment match:', e.message);
      }
    }
    
    // Coverage info
    const totalPossibleFields = 10;
    let availableFields = 0;
    if (match) availableFields += 3;
    if (rawData.oddsWinner !== 'N/A') availableFields += 1;
    if (rawData.statsCount > 0) availableFields += 2;
    if (rawData.powerRankingsCount > 0) availableFields += 2;
    if (rawData.pointByPointCount > 0) availableFields += 2;
    
    // Fonti dati
    const sources = [
      { name: 'Match Base', available: !!match },
      { name: 'Odds', available: rawData.oddsWinner !== 'N/A' },
      { name: 'Statistics', available: rawData.statsCount > 0 },
      { name: 'Power Rankings', available: rawData.powerRankingsCount > 0 },
      { name: 'Point by Point', available: rawData.pointByPointCount > 0 }
    ];
    
    res.json({
      eventId: matchId,
      matchInfo,
      rawData,
      calculatedData,
      coverage: {
        total: totalPossibleFields,
        available: availableFields
      },
      sources
    });
    
  } catch (err) {
    console.error('Error in match inspector:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/players/search - Ricerca giocatori per autocompletamento
 * Query params: q (query string), limit (default 10)
 */
app.get('/api/players/search', async (req, res) => {
  const { q, limit = 10 } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }
  
  try {
    const players = await playerStatsService.searchPlayers(q, parseInt(limit));
    res.json(players.map(p => ({
      name: p.name,
      matchCount: p.totalMatches
    })));
  } catch (error) {
    console.error('Error searching players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/players/compare - Confronta due giocatori
 * Query params: player1, player2, surface, format
 */
app.get('/api/players/compare', async (req, res) => {
  const { player1, player2, surface, format } = req.query;
  
  if (!player1 || !player2) {
    return res.status(400).json({ error: 'Missing player1 or player2 parameters' });
  }
  
  if (!playerProfileService) {
    return res.status(503).json({ error: 'Player Profile Service not available' });
  }
  
  try {
    const comparison = await playerProfileService.compareProfiles(
      decodeURIComponent(player1),
      decodeURIComponent(player2),
      { surface, format }
    );
    
    res.json(comparison);
  } catch (err) {
    console.error('Error comparing players:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/match/:matchId/breaks - Analisi break di un match
 */
app.get('/api/match/:matchId/breaks', async (req, res) => {
  const { matchId } = req.params;
  
  if (!matchId) {
    return res.status(400).json({ error: 'Missing matchId' });
  }
  
  if (!breakDetector || !matchRepository) {
    return res.status(503).json({ error: 'Break Detector or Database not available' });
  }
  
  try {
    // Fetch match from database
    const match = await matchRepository.getMatchById(parseInt(matchId));
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Analyze breaks for each set
    const breakAnalysis = {
      match_id: match.id,
      players: {
        home: match.home_name,
        away: match.away_name
      },
      sets: []
    };
    
    // Analyze up to 5 sets
    for (let setNum = 1; setNum <= 5; setNum++) {
      const homeGames = match[`w${setNum}`];
      const awayGames = match[`l${setNum}`];
      
      if (homeGames === null || awayGames === null) break;
      
      const setScore = { w: homeGames, l: awayGames };
      const setBreaks = breakDetector.analyzeSetBreaks(setScore, setNum);
      
      breakAnalysis.sets.push({
        set_number: setNum,
        score: `${homeGames}-${awayGames}`,
        ...setBreaks
      });
    }
    
    // Overall patterns
    if (breakAnalysis.sets.length > 0) {
      const allBreaks = breakAnalysis.sets.map(s => s.total_breaks_estimated);
      breakAnalysis.total_breaks = allBreaks.reduce((a, b) => a + b, 0);
      breakAnalysis.avg_breaks_per_set = breakAnalysis.total_breaks / breakAnalysis.sets.length;
    }
    
    res.json(breakAnalysis);
  } catch (err) {
    console.error('Error analyzing breaks:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/match/pressure - Calcola indice pressione live
 * Body: { stats, context }
 */
app.post('/api/match/pressure', (req, res) => {
  const { stats, context } = req.body;
  
  if (!stats) {
    return res.status(400).json({ error: 'Missing stats object' });
  }
  
  if (!pressureCalculator) {
    return res.status(503).json({ error: 'Pressure Calculator not available' });
  }
  
  try {
    const pressure = pressureCalculator.calculatePressureIndex(stats, context || {});
    res.json(pressure);
  } catch (err) {
    console.error('Error calculating pressure:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/match/segment - Segmenta un match in fasi
 * Body: { matchStats }
 */
app.post('/api/match/segment', (req, res) => {
  const { matchStats } = req.body;
  
  if (!matchStats) {
    return res.status(400).json({ error: 'Missing matchStats object' });
  }
  
  if (!matchSegmenter) {
    return res.status(503).json({ error: 'Match Segmenter not available' });
  }
  
  try {
    const segments = matchSegmenter.segmentMatch(matchStats);
    const summary = matchSegmenter.getSegmentSummary(segments);
    
    res.json({
      segments,
      summary,
      total_segments: segments.length
    });
  } catch (err) {
    console.error('Error segmenting match:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// END PLAYER PROFILE ENDPOINTS
// ============================================================================

// Optional: serve frontend in dev if needed
const PORT = process.env.PORT || 3001;
// GET /api/matches/merged - Prova prima il database, fallback ai file locali
app.get('/api/matches/merged', async (req, res) => {
  try {
    // Prova prima il database
    if (matchRepository) {
      try {
        const { limit, offset, status } = req.query;
        const dbMatches = await matchRepository.getMatches({
          limit: limit ? parseInt(limit) : 50,
          offset: offset ? parseInt(offset) : 0,
          status
        });
        
        if (dbMatches && dbMatches.length > 0) {
          const matches = dbMatches.map(m => ({
            id: m.id,
            eventId: m.id,
            sport: 'tennis',
            sportName: 'Tennis',
            tournament: m.tournament_name || '',
            category: m.tournament_category || '',
            homeTeam: {
              id: m.home_player_id,
              name: m.home_name || '',
              shortName: m.home_name || '',
              country: m.home_country || '',
              ranking: m.home_ranking || null
            },
            awayTeam: {
              id: m.away_player_id,
              name: m.away_name || '',
              shortName: m.away_name || '',
              country: m.away_country || '',
              ranking: m.away_ranking || null
            },
            homeScore: m.home_sets_won ? { current: m.home_sets_won } : null,
            awayScore: m.away_sets_won ? { current: m.away_sets_won } : null,
            status: {
              code: m.status_code,
              type: m.status_type,
              description: m.status_description
            },
            startTimestamp: m.start_time ? Math.floor(new Date(m.start_time).getTime() / 1000) : null,
            winnerCode: m.winner_code,
            dataCompleteness: m.data_completeness || 50,
            source: 'database'
          }));
          return res.json({ matches, count: matches.length, source: 'database' });
        }
      } catch (dbErr) {
        console.warn('⚠️ Database fetch failed, falling back to files:', dbErr.message);
      }
    }
    
    // Fallback: file locali
    const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
    const matches = [];
    const seenEventIds = new Set();
    
    for (const file of files) {
      try {
        const filePath = path.join(SCRAPES_DIR, file);
        const stats = fs.statSync(filePath);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        let eventData = null;
        if (content.api) {
          for (const [url, data] of Object.entries(content.api)) {
            if (url.match(/\/api\/v1\/event\/\d+$/) && data?.event) {
              eventData = data.event;
              break;
            }
          }
        }
        
        if (eventData && !seenEventIds.has(String(eventData.id))) {
          seenEventIds.add(String(eventData.id));
          matches.push({
            id: file.replace('.json', ''),
            fileDate: stats.mtime,
            eventId: eventData.id,
            sport: eventData.tournament?.category?.sport?.slug || 'tennis',
            sportName: eventData.tournament?.category?.sport?.name || 'Tennis',
            tournament: eventData.tournament?.uniqueTournament?.name || eventData.tournament?.name || '',
            category: eventData.tournament?.category?.name || '',
            homeTeam: {
              name: eventData.homeTeam?.name || '',
              shortName: eventData.homeTeam?.shortName || '',
              country: eventData.homeTeam?.country?.alpha2 || '',
              ranking: eventData.homeTeam?.ranking || null
            },
            awayTeam: {
              name: eventData.awayTeam?.name || '',
              shortName: eventData.awayTeam?.shortName || '',
              country: eventData.awayTeam?.country?.alpha2 || '',
              ranking: eventData.awayTeam?.ranking || null
            },
            homeScore: eventData.homeScore || null,
            awayScore: eventData.awayScore || null,
            status: getRealisticStatus(eventData.status, eventData.startTimestamp, eventData.winnerCode) || { type: 'unknown' },
            startTimestamp: eventData.startTimestamp || null,
            winnerCode: eventData.winnerCode || null,
            dataCompleteness: calculateDataCompleteness(content.api, eventData.id) || 50,
            source: 'files'
          });
        }
      } catch (fileErr) {
        console.warn(`⚠️ Error reading file ${file}:`, fileErr.message);
      }
    }
    
    res.json({ matches, count: matches.length, source: 'files' });
  } catch (err) {
    console.error('Error in /api/matches/merged:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/matches/enrich - Arricchisce match nel DB con dati freschi da SofaScore
 * Body: { matchIds: [id1, id2, ...] } oppure { all: true, limit: 100 }
 */
app.post('/api/matches/enrich', async (req, res) => {
  const { matchIds, all, limit = 50 } = req.body;
  
  if (!matchIds && !all) {
    return res.status(400).json({ error: 'Provide matchIds array or all: true' });
  }
  
  try {
    let matches = [];
    
    if (all) {
      // Prendi match senza powerRankings completi
      const { data, error } = await supabaseClient.supabase
        .from('matches')
        .select('id, winner_name, loser_name, raw_json')
        .eq('data_source', 'sofascore')
        .limit(limit);
      
      if (error) throw error;
      matches = data || [];
    } else {
      const { data, error } = await supabaseClient.supabase
        .from('matches')
        .select('id, winner_name, loser_name, raw_json')
        .in('id', matchIds);
      
      if (error) throw error;
      matches = data || [];
    }
    
    console.log(`🔄 Enriching ${matches.length} matches...`);
    
    const results = {
      total: matches.length,
      enriched: 0,
      skipped: 0,
      errors: [],
      details: []
    };
    
    for (const match of matches) {
      try {
        // Fetch dati freschi da SofaScore
        const freshData = await fetchCompleteData(match.id);
        
        if (freshData && (freshData.powerRankings?.length > 0 || freshData.statistics?.length > 0)) {
          // Salva powerRankings nella tabella dedicata
          if (freshData.powerRankings?.length > 0) {
            // Elimina vecchi record
            await supabaseClient.supabase
              .from('power_rankings')
              .delete()
              .eq('match_id', match.id);
            
            // Inserisci nuovi
            const prRecords = freshData.powerRankings.map((pr, idx) => ({
              match_id: match.id,
              set_number: pr.set || 1,
              game_number: pr.game || idx + 1,
              value: pr.value || 0,
              break_occurred: pr.breakOccurred || false,
              zone: pr.zone || null,
              status: pr.status || null
            }));
            
            await supabaseClient.supabase
              .from('power_rankings')
              .insert(prRecords);
          }
          
          results.enriched++;
          results.details.push({
            matchId: match.id,
            players: `${match.winner_name} vs ${match.loser_name}`,
            powerRankings: freshData.powerRankings?.length || 0,
            statistics: freshData.statistics?.length || 0,
            pointByPoint: freshData.pointByPoint?.length || 0
          });
          
          console.log(`✅ Enriched match ${match.id}: ${freshData.powerRankings?.length || 0} PR`);
        } else {
          results.skipped++;
        }
        
        // Rate limiting per evitare ban da SofaScore
        await new Promise(r => setTimeout(r, 500));
        
      } catch (matchErr) {
        results.errors.push({ matchId: match.id, error: matchErr.message });
      }
    }
    
    res.json(results);
    
  } catch (err) {
    console.error('Error enriching matches:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/matches/missing-data - Lista match che potrebbero avere dati mancanti
 */
app.get('/api/matches/missing-data', async (req, res) => {
  try {
    // Match SofaScore senza powerRankings
    const { data: sofascoreMatches, error: e1 } = await supabaseClient.supabase
      .from('matches')
      .select('id, winner_name, loser_name, surface, tournament_id')
      .eq('data_source', 'sofascore')
      .limit(100);
    
    // Match ID con powerRankings
    const { data: prMatches, error: e2 } = await supabaseClient.supabase
      .from('power_rankings')
      .select('match_id')
      .limit(10000);
    
    const prMatchIds = new Set((prMatches || []).map(p => p.match_id));
    
    const missingData = (sofascoreMatches || []).filter(m => !prMatchIds.has(m.id));
    
    res.json({
      total: missingData.length,
      matches: missingData.slice(0, 50)
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/match/:eventId/find-sofascore - Cerca match corrispondente su SofaScore
 * Per match XLSX che non hanno ID SofaScore reale
 */
app.post('/api/match/:eventId/find-sofascore', async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId || !matchRepository || !supabaseClient?.supabase) {
    return res.status(400).json({ error: 'Missing eventId or database not available' });
  }
  
  try {
    // 1. Recupera match dal DB
    const { data: match, error } = await supabaseClient.supabase
      .from('matches')
      .select('id, winner_name, loser_name, start_time, surface, tournament_id, data_source')
      .eq('id', parseInt(eventId))
      .single();
    
    if (error || !match) {
      console.error('find-sofascore DB error:', error?.message || 'Match not found');
      return res.status(404).json({ error: 'Match not found in database', details: error?.message });
    }
    
    // 2. Cerca eventi su SofaScore tramite /search/all
    const winnerName = match.winner_name;
    const loserName = match.loser_name;
    
    // Cerca usando entrambi i nomi per precisione
    const searchQuery = `${winnerName} ${loserName}`;
    const searchUrl = `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(searchQuery)}`;
    
    console.log(`🔍 Searching SofaScore for: ${searchQuery}`);
    
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.sofascore.com/'
      }
    });
    
    if (!searchRes.ok) {
      console.error('SofaScore search failed:', searchRes.status);
      return res.status(404).json({ error: 'SofaScore search failed' });
    }
    
    const searchData = await searchRes.json();
    const results = searchData?.results || [];
    
    // Filtra solo eventi di tennis
    const tennisEvents = results.filter(r => 
      r.type === 'event' && 
      r.entity?.homeTeam?.sport?.slug === 'tennis'
    );
    
    if (tennisEvents.length === 0) {
      return res.status(404).json({ error: 'No tennis events found for player' });
    }
    
    console.log(`🎾 Found ${tennisEvents.length} tennis events for ${searchQuery}`);
    
    // 3. Trova match corrispondente per data
    let matchedEvent = null;
    const loserFullName = loserName?.toLowerCase() || '';
    const winnerFullName = winnerName?.toLowerCase() || '';
    
    for (const eventResult of tennisEvents) {
      const event = eventResult.entity;
      const sofaHome = event.homeTeam?.name?.toLowerCase() || '';
      const sofaAway = event.awayTeam?.name?.toLowerCase() || '';
      
      // Verifica che i giocatori corrispondano
      const hasWinner = sofaHome.includes(winnerFullName.split(' ').slice(-1)[0]) || 
                        sofaAway.includes(winnerFullName.split(' ').slice(-1)[0]);
      const hasLoser = sofaHome.includes(loserFullName.split(' ').slice(-1)[0]) || 
                       sofaAway.includes(loserFullName.split(' ').slice(-1)[0]);
      
      if (hasWinner && hasLoser) {
        // Verifica data se disponibile
        if (match.start_time && event.startTimestamp) {
          const xlsxDate = new Date(match.start_time);
          const sofaDate = new Date(event.startTimestamp * 1000);
          const diffDays = Math.abs((xlsxDate - sofaDate) / (1000 * 60 * 60 * 24));
          
          console.log(`📅 Comparing dates: XLSX=${xlsxDate.toISOString()}, SofaScore=${sofaDate.toISOString()}, Diff=${diffDays} days`);
          
          if (diffDays <= 2) {
            matchedEvent = event;
            console.log(`✅ Matched event: ${event.homeTeam?.name} vs ${event.awayTeam?.name} (ID: ${event.id})`);
            break;
          }
        } else {
          // Senza data, prendi il primo match
          matchedEvent = event;
          console.log(`✅ Matched event (no date): ${event.homeTeam?.name} vs ${event.awayTeam?.name}`);
          break;
        }
      }
    }
    
    if (!matchedEvent) {
      return res.json({
        found: false,
        xlsxMatch: match,
        eventsSearched: tennisEvents.length,
        message: `No matching event found among ${tennisEvents.length} events for ${winnerName} vs ${loserName}`
      });
    }
    
    // 5. Recupera powerRankings dal match SofaScore
    const prUrl = `https://api.sofascore.com/api/v1/event/${matchedEvent.id}/tennis-power-rankings`;
    const prRes = await fetch(prUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    let powerRankings = [];
    if (prRes.ok) {
      const prData = await prRes.json();
      powerRankings = prData?.tennisPowerRankings || [];
    }
    
    // 6. Salva powerRankings nel DB se trovati
    if (powerRankings.length > 0) {
      // Elimina vecchi PR
      await supabaseClient.supabase.from('power_rankings').delete().eq('match_id', match.id);
      
      // Prepara nuovi record
      const records = powerRankings.map((pr, idx) => {
        const value = pr.value || 0;
        let zone = 'balanced_positive';
        let status = 'neutral';
        
        if (value > 60) { zone = 'strong_control'; status = 'positive'; }
        else if (value >= 20) { zone = 'advantage'; status = 'positive'; }
        else if (value > -20) { zone = 'balanced_positive'; status = 'neutral'; }
        else if (value > -40) { zone = 'slight_pressure'; status = 'warning'; }
        else { zone = 'strong_pressure'; status = 'critical'; }
        
        return {
          match_id: match.id,
          set_number: pr.set || 1,
          game_number: pr.game || idx + 1,
          value: value,
          break_occurred: pr.breakOccurred || false,
          zone,
          status
        };
      });
      
      const { error: insertError } = await supabaseClient.supabase.from('power_rankings').insert(records);
      
      if (insertError) {
        console.error('Error saving powerRankings:', insertError.message);
      }
    }
    
    res.json({
      found: true,
      xlsxMatchId: match.id,
      sofascoreEventId: matchedEvent.id,
      sofascoreMatch: {
        homeTeam: matchedEvent.homeTeam?.name,
        awayTeam: matchedEvent.awayTeam?.name,
        startTimestamp: matchedEvent.startTimestamp,
        tournament: matchedEvent.tournament?.name
      },
      powerRankings: {
        found: powerRankings.length > 0,
        count: powerRankings.length,
        saved: powerRankings.length > 0
      }
    });
    
  } catch (err) {
    console.error('Error finding SofaScore match:', err.message);
    res.status(500).json({ error: err.message });
  }
});

server.listen(PORT, () => {
  console.info(`🚀 Scraper backend listening on port ${PORT} (HTTP + WebSocket)`);
  
  // Avvia scheduler per monitoraggio automatico partite
  console.log('🕐 Starting match monitoring scheduler...');
  startScheduler();
});
