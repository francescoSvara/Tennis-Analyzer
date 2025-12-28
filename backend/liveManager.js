/**
 * Live Match Manager
 * Gestisce il polling intelligente per match live e salvataggio automatico su DB
 * 
 * AGGIORNATO: Ora supporta persistenza su Supabase tramite liveTrackingRepository
 * Riferimento: FILOSOFIA_LIVE_TRACKING.md
 * 
 * FILOSOFIA_LIVE_TRACKING: LivePipeline Steps
 * 1. ingest → fetchLiveData
 * 2. normalize → normalizeLiveData
 * 3. validate → validateLiveData
 * 4. enrich → enrichLiveData (features, quality)
 * 5. persist → persistLiveData (DB)
 * 6. broadcast → Socket.IO emit
 */

const fetch = require('node-fetch');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Supabase client for direct snapshot updates
let supabase = null;
try {
  const supabaseModule = require('./db/supabase');
  supabase = supabaseModule.supabase;
  console.log('✅ LiveManager: Supabase client loaded');
} catch (e) {
  console.warn('⚠️ LiveManager: Supabase client not available:', e.message);
}

// Database imports
let matchRepository = null;
try {
  matchRepository = require('./db/matchRepository');
  console.log('✅ LiveManager: Database module loaded');
} catch (e) {
  console.warn('⚠️ LiveManager: Database module not available:', e.message);
}

// Live Tracking Repository (nuovo - persistenza Supabase)
let liveTrackingRepo = null;
let USE_DB_TRACKING = false;
try {
  liveTrackingRepo = require('./db/liveTrackingRepository');
  USE_DB_TRACKING = true;
  console.log('✅ LiveManager: Live Tracking Repository loaded (DB mode)');
} catch (e) {
  console.warn('⚠️ LiveManager: Live Tracking Repository not available, using in-memory mode:', e.message);
}

// Store per le sottoscrizioni attive (WebSocket)
const subscriptions = new Map(); // eventId -> { sockets: Set, lastData: object, interval: NodeJS.Timer }

// Store FALLBACK per il tracking delle partite monitorate (se DB non disponibile)
const trackedMatchesFallback = new Map(); // eventId -> { status, lastUpdate, startTimestamp, autoTrack: boolean }

// Directory per i file
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const SCRAPES_DIR = path.join(DATA_DIR, 'scrapes');

// Configurazione
const CONFIG = {
  // Intervalli di polling per priorità (in ms)
  POLL_INTERVALS: {
    HIGH: 3000,     // 3 secondi per match importanti (finali, live seguito)
    MEDIUM: 10000,  // 10 secondi default
    LOW: 30000      // 30 secondi per match meno importanti
  },
  DEFAULT_POLL_INTERVAL: 5000, // Fallback per WebSocket subscriptions
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  MAX_FAIL_COUNT: 5,  // Dopo questo numero di errori → status ERROR
  SOFASCORE_API: 'https://api.sofascore.com/api/v1/event'
};

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.sofascore.com/'
};

/**
 * Fetch dati live per un evento
 * 
 * TEMPORAL SEMANTICS (FILOSOFIA_TEMPORAL_SEMANTICS compliance):
 * - ingestion_time: quando i dati sono stati ricevuti dal sistema
 * - event_time: timestamp dell'evento originale (se disponibile)
 */
async function fetchLiveData(eventId) {
  const baseUrl = CONFIG.SOFASCORE_API;
  const ingestionTime = new Date().toISOString();
  const result = {
    eventId,
    timestamp: ingestionTime,
    // TEMPORAL SEMANTICS
    ingestion_time: ingestionTime,
    event_time: null, // Sarà popolato dall'evento se disponibile
    event: null,
    pointByPoint: [],
    statistics: [],
    powerRankings: [],
    errors: []
  };

  const fetches = [
    fetch(`${baseUrl}/${eventId}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { 
        result.event = data?.event || data;
        // TEMPORAL SEMANTICS: Extract event_time from source
        if (result.event?.startTimestamp) {
          result.event_time = new Date(result.event.startTimestamp * 1000).toISOString();
        } else if (result.event?.changes?.changeTimestamp) {
          result.event_time = new Date(result.event.changes.changeTimestamp * 1000).toISOString();
        }
      })
      .catch(e => result.errors.push({ endpoint: 'event', error: e.message })),

    fetch(`${baseUrl}/${eventId}/point-by-point`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { result.pointByPoint = data?.pointByPoint || data || []; })
      .catch(e => result.errors.push({ endpoint: 'point-by-point', error: e.message })),

    fetch(`${baseUrl}/${eventId}/statistics`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { result.statistics = data?.statistics || []; })
      .catch(e => result.errors.push({ endpoint: 'statistics', error: e.message })),

    fetch(`${baseUrl}/${eventId}/tennis-power-rankings`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { result.powerRankings = data?.tennisPowerRankings || []; })
      .catch(e => result.errors.push({ endpoint: 'power-rankings', error: e.message }))
  ];

  await Promise.all(fetches);
  return result;
}

/**
 * Fetch COMPLETO di tutti i dati per un evento (per sync finale)
 * Include tutti gli endpoint possibili per avere dati completi per il DB
 */
async function fetchCompleteData(eventId) {
  const baseUrl = CONFIG.SOFASCORE_API;
  const result = {
    eventId,
    timestamp: new Date().toISOString(),
    syncType: 'complete',
    event: null,
    pointByPoint: [],
    statistics: [],
    powerRankings: [],
    incidents: [],
    lineups: null,
    h2h: null,
    odds: null,
    graph: null,
    errors: [],
    dataCompleteness: {}
  };

  const fetches = [
    // Dati evento base
    fetch(`${baseUrl}/${eventId}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { 
        result.event = data?.event || data;
        result.dataCompleteness.event = !!result.event;
      })
      .catch(e => result.errors.push({ endpoint: 'event', error: e.message })),

    // Point by point
    fetch(`${baseUrl}/${eventId}/point-by-point`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { 
        result.pointByPoint = data?.pointByPoint || data || [];
        result.dataCompleteness.pointByPoint = result.pointByPoint.length > 0;
      })
      .catch(e => result.errors.push({ endpoint: 'point-by-point', error: e.message })),

    // Statistiche
    fetch(`${baseUrl}/${eventId}/statistics`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { 
        result.statistics = data?.statistics || [];
        result.dataCompleteness.statistics = result.statistics.length > 0;
      })
      .catch(e => result.errors.push({ endpoint: 'statistics', error: e.message })),

    // Power rankings
    fetch(`${baseUrl}/${eventId}/tennis-power-rankings`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { 
        result.powerRankings = data?.tennisPowerRankings || [];
        result.dataCompleteness.powerRankings = result.powerRankings.length > 0;
      })
      .catch(e => result.errors.push({ endpoint: 'power-rankings', error: e.message })),

    // Incidents (eventi nel match)
    fetch(`${baseUrl}/${eventId}/incidents`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { 
        result.incidents = data?.incidents || [];
        result.dataCompleteness.incidents = result.incidents.length > 0;
      })
      .catch(e => result.errors.push({ endpoint: 'incidents', error: e.message })),

    // Lineups
    fetch(`${baseUrl}/${eventId}/lineups`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { 
        result.lineups = data;
        result.dataCompleteness.lineups = !!data;
      })
      .catch(e => result.errors.push({ endpoint: 'lineups', error: e.message })),

    // Head to head
    fetch(`${baseUrl}/${eventId}/h2h`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { 
        result.h2h = data;
        result.dataCompleteness.h2h = !!data;
      })
      .catch(e => result.errors.push({ endpoint: 'h2h', error: e.message })),

    // Graph (momentum)
    fetch(`${baseUrl}/${eventId}/graph`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { 
        result.graph = data;
        result.dataCompleteness.graph = !!data;
      })
      .catch(e => result.errors.push({ endpoint: 'graph', error: e.message }))
  ];

  await Promise.all(fetches);
  
  // Calcola completezza totale
  const fields = Object.values(result.dataCompleteness);
  result.dataCompleteness.total = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  
  return result;
}

/**
 * Calcola hash SHA256 per confronto dati
 * Usato per rilevare cambiamenti e implementare polling adattivo
 */
function computeDataHash(data) {
  if (!data || !data.event) return null;
  
  // Hash basato su elementi chiave che cambiano durante il match
  const keyData = {
    score: `${data.event?.homeScore?.current || 0}-${data.event?.awayScore?.current || 0}`,
    sets: data.event?.homeScore?.period1 !== undefined ? [
      data.event?.homeScore?.period1, data.event?.awayScore?.period1,
      data.event?.homeScore?.period2, data.event?.awayScore?.period2,
      data.event?.homeScore?.period3, data.event?.awayScore?.period3
    ] : [],
    status: data.event?.status?.type,
    server: data.event?.firstToServe,
    pbpLength: data.pointByPoint?.length || 0,
    lastPbp: data.pointByPoint?.slice(-1)[0] || null,
    prLength: data.powerRankings?.length || 0
  };
  
  const jsonStr = JSON.stringify(keyData);
  return crypto.createHash('sha256').update(jsonStr).digest('hex').substring(0, 16);
}

/**
 * Verifica se il match è terminato
 */
function isMatchFinished(data) {
  if (!data || !data.event) return false;
  const status = data.event.status;
  if (!status) return false;
  
  const type = (status.type || '').toLowerCase();
  const description = (status.description || '').toLowerCase();
  
  // Match terminato
  if (type === 'finished' || type === 'ended' || type === 'completed') return true;
  if (description.includes('finished') || description.includes('ended')) return true;
  
  // Match cancellato o rimandato (non serve più polling)
  if (type === 'canceled' || type === 'postponed' || type === 'abandoned') return true;
  
  return false;
}

/**
 * Verifica se i dati sono cambiati
 */
function hasDataChanged(oldData, newData) {
  if (!oldData) return true;
  return computeDataHash(oldData) !== computeDataHash(newData);
}

// ============================================================================
// LIVE PIPELINE STEPS (FILOSOFIA_LIVE_TRACKING: FLOW_LivePipeline)
// ============================================================================

/**
 * Step 2: Normalize live data to canonical format
 * FILOSOFIA_LIVE_TRACKING: normalizer step
 * 
 * @param {Object} rawData - Raw data from fetchLiveData
 * @returns {Object} Normalized data with canonical field names
 */
function normalizeLiveData(rawData) {
  if (!rawData) return null;
  
  const event = rawData.event || {};
  
  return {
    // Canonical identifiers
    matchId: rawData.eventId,
    eventId: rawData.eventId,
    
    // Temporal fields (FILOSOFIA_TEMPORAL)
    ingestion_time: rawData.ingestion_time,
    event_time: rawData.event_time,
    normalized_at: new Date().toISOString(),
    
    // Match header
    header: {
      match: {
        id: rawData.eventId,
        status: event.status?.type || 'unknown',
        statusDescription: event.status?.description,
        startTimestamp: event.startTimestamp,
        slug: event.slug
      },
      players: {
        home: {
          id: event.homeTeam?.id,
          name: event.homeTeam?.name || event.homeTeam?.shortName,
          slug: event.homeTeam?.slug
        },
        away: {
          id: event.awayTeam?.id,
          name: event.awayTeam?.name || event.awayTeam?.shortName,
          slug: event.awayTeam?.slug
        }
      },
      score: {
        home: event.homeScore?.current ?? event.homeScore?.display ?? 0,
        away: event.awayScore?.current ?? event.awayScore?.display ?? 0,
        sets: extractSets(event)
      },
      server: event.firstToServe
    },
    
    // Data sections
    pointByPoint: rawData.pointByPoint || [],
    statistics: rawData.statistics || [],
    powerRankings: rawData.powerRankings || [],
    
    // Original data reference
    _raw: rawData,
    
    // Errors from fetch
    errors: rawData.errors || []
  };
}

/**
 * Helper: Extract set scores from event
 */
function extractSets(event) {
  const sets = [];
  for (let i = 1; i <= 5; i++) {
    const home = event.homeScore?.[`period${i}`];
    const away = event.awayScore?.[`period${i}`];
    if (home !== undefined || away !== undefined) {
      sets.push({
        setNumber: i,
        home: home ?? 0,
        away: away ?? 0
      });
    }
  }
  return sets;
}

/**
 * Step 3: Validate live data
 * FILOSOFIA_LIVE_TRACKING: validator step
 * 
 * @param {Object} normalizedData - Normalized data from normalizeLiveData
 * @returns {Object} { valid: boolean, issues: Array, data: Object }
 */
function validateLiveData(normalizedData) {
  const issues = [];
  
  if (!normalizedData) {
    return { valid: false, issues: ['Data is null'], data: null };
  }
  
  // Required fields
  if (!normalizedData.matchId) {
    issues.push({ code: 'MISSING_MATCH_ID', severity: 'ERROR' });
  }
  
  if (!normalizedData.header?.players?.home?.id || !normalizedData.header?.players?.away?.id) {
    issues.push({ code: 'MISSING_PLAYER_IDS', severity: 'WARN' });
  }
  
  // Temporal validation (FILOSOFIA_TEMPORAL: no future data)
  const ingestionTime = new Date(normalizedData.ingestion_time);
  const now = new Date();
  if (ingestionTime > now) {
    issues.push({ code: 'FUTURE_TIMESTAMP', severity: 'ERROR', detail: 'ingestion_time is in future' });
  }
  
  // Score validation
  const score = normalizedData.header?.score;
  if (score?.sets) {
    for (const set of score.sets) {
      if (set.home < 0 || set.away < 0) {
        issues.push({ code: 'NEGATIVE_SCORE', severity: 'ERROR' });
      }
      if (set.home > 7 || set.away > 7) {
        // Only valid in tiebreak scenarios
        if (!(set.home === 7 || set.away === 7)) {
          issues.push({ code: 'UNLIKELY_SCORE', severity: 'WARN', detail: `Set ${set.setNumber}: ${set.home}-${set.away}` });
        }
      }
    }
  }
  
  const hasErrors = issues.some(i => i.severity === 'ERROR');
  
  return {
    valid: !hasErrors,
    issues,
    data: normalizedData,
    validated_at: new Date().toISOString()
  };
}

/**
 * Full pipeline: ingest → normalize → validate
 * 
 * @param {string} eventId - SofaScore event ID
 * @returns {Object} Processed live data
 */
async function processLivePipeline(eventId) {
  // Step 1: Ingest
  const rawData = await fetchLiveData(eventId);
  
  // Step 2: Normalize
  const normalized = normalizeLiveData(rawData);
  
  // Step 3: Validate
  const validated = validateLiveData(normalized);
  
  // Return processed data with pipeline metadata
  return {
    ...validated.data,
    _pipeline: {
      steps: ['ingest', 'normalize', 'validate'],
      valid: validated.valid,
      issues: validated.issues,
      processed_at: new Date().toISOString()
    }
  };
}

// ============================================================================
// PATCH GENERATION (FILOSOFIA_LIVE_TRACKING: RULE_LIVE_OUTPUT)
// ============================================================================

/**
 * Generate patch operations from old to new live data
 * FILOSOFIA_LIVE_TRACKING: RULE_LIVE_OUTPUT - produce patches on MatchBundle
 * 
 * @param {Object} oldData - Previous live data state
 * @param {Object} newData - New live data state
 * @returns {Array} Array of patch operations in JSON Patch format
 */
function generateLivePatches(oldData, newData) {
  const patches = [];
  
  if (!oldData || !newData) {
    return patches;
  }
  
  // Score changes
  const oldScore = oldData.header?.score;
  const newScore = newData.header?.score;
  
  if (JSON.stringify(oldScore) !== JSON.stringify(newScore)) {
    patches.push({
      op: 'replace',
      path: '/header/score',
      value: newScore,
      timestamp: new Date().toISOString()
    });
  }
  
  // Status changes
  if (oldData.header?.match?.status !== newData.header?.match?.status) {
    patches.push({
      op: 'replace',
      path: '/header/match/status',
      value: newData.header?.match?.status,
      timestamp: new Date().toISOString()
    });
  }
  
  // Server changes
  if (oldData.header?.server !== newData.header?.server) {
    patches.push({
      op: 'replace',
      path: '/header/server',
      value: newData.header?.server,
      timestamp: new Date().toISOString()
    });
  }
  
  // Point by point additions
  const oldPbpLength = oldData.pointByPoint?.length || 0;
  const newPbpLength = newData.pointByPoint?.length || 0;
  
  if (newPbpLength > oldPbpLength) {
    const newPoints = newData.pointByPoint.slice(oldPbpLength);
    patches.push({
      op: 'add',
      path: '/tabs/points/-',
      value: newPoints,
      timestamp: new Date().toISOString()
    });
  }
  
  // Power rankings changes
  const oldPrLength = oldData.powerRankings?.length || 0;
  const newPrLength = newData.powerRankings?.length || 0;
  
  if (newPrLength > oldPrLength) {
    const newRankings = newData.powerRankings.slice(oldPrLength);
    patches.push({
      op: 'add',
      path: '/tabs/momentum/-',
      value: newRankings,
      timestamp: new Date().toISOString()
    });
  }
  
  return patches;
}

/**
 * Apply patches to existing bundle
 * 
 * @param {Object} bundle - Existing MatchBundle
 * @param {Array} patches - Array of patch operations
 * @returns {Object} Updated bundle
 */
function applyLivePatches(bundle, patches) {
  if (!bundle || !patches || patches.length === 0) {
    return bundle;
  }
  
  const updated = JSON.parse(JSON.stringify(bundle)); // Deep clone
  
  for (const patch of patches) {
    try {
      const pathParts = patch.path.split('/').filter(p => p);
      let target = updated;
      
      // Navigate to parent
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (target[pathParts[i]] === undefined) {
          target[pathParts[i]] = {};
        }
        target = target[pathParts[i]];
      }
      
      const lastKey = pathParts[pathParts.length - 1];
      
      if (patch.op === 'replace') {
        target[lastKey] = patch.value;
      } else if (patch.op === 'add') {
        if (lastKey === '-' && Array.isArray(target)) {
          // Append to array
          if (Array.isArray(patch.value)) {
            target.push(...patch.value);
          } else {
            target.push(patch.value);
          }
        } else {
          target[lastKey] = patch.value;
        }
      }
    } catch (e) {
      console.warn(`Failed to apply patch: ${patch.path}`, e.message);
    }
  }
  
  // Update meta
  updated.meta = updated.meta || {};
  updated.meta.last_patch_at = new Date().toISOString();
  updated.meta.patch_count = (updated.meta.patch_count || 0) + patches.length;
  
  return updated;
}

/**
 * Inizializza il LiveManager con Socket.IO
 */
function initLiveManager(io) {
  console.log('🔌 LiveManager initialized');

  io.on('connection', (socket) => {
    console.log(`📱 Client connected: ${socket.id}`);

    // Client si iscrive a un match
    socket.on('subscribe', async (eventId) => {
      if (!eventId) {
        socket.emit('error', { message: 'Missing eventId' });
        return;
      }

      console.log(`📺 Client ${socket.id} subscribing to event ${eventId}`);

      // Aggiungi alla subscription
      if (!subscriptions.has(eventId)) {
        // Prima sottoscrizione per questo evento
        subscriptions.set(eventId, {
          sockets: new Set([socket]),
          lastData: null,
          interval: null
        });

        // Avvia polling per questo evento
        startPolling(eventId, io);

        // Fetch immediato dei dati iniziali
        try {
          const data = await fetchLiveData(eventId);
          subscriptions.get(eventId).lastData = data;
          socket.emit('data', data);
          socket.emit('subscribed', { eventId, status: 'ok' });
        } catch (err) {
          socket.emit('error', { message: err.message, eventId });
        }
      } else {
        // Aggiungi socket alla subscription esistente
        subscriptions.get(eventId).sockets.add(socket);
        
        // Invia ultimi dati conosciuti
        const lastData = subscriptions.get(eventId).lastData;
        if (lastData) {
          socket.emit('data', lastData);
        }
        socket.emit('subscribed', { eventId, status: 'ok' });
      }

      // Associa eventId al socket per cleanup
      socket.eventId = eventId;
    });

    // Client si disiscrive
    socket.on('unsubscribe', (eventId) => {
      console.log(`🚫 Client ${socket.id} unsubscribing from event ${eventId}`);
      removeSocketFromSubscription(socket, eventId);
    });

    // Client disconnesso
    socket.on('disconnect', () => {
      console.log(`📴 Client disconnected: ${socket.id}`);
      if (socket.eventId) {
        removeSocketFromSubscription(socket, socket.eventId);
      }
    });

    // Ping per keep-alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  return io;
}

/**
 * Rimuove socket da una subscription
 */
function removeSocketFromSubscription(socket, eventId) {
  const sub = subscriptions.get(eventId);
  if (!sub) return;

  sub.sockets.delete(socket);

  // Se non ci sono più socket, ferma polling
  if (sub.sockets.size === 0) {
    console.log(`⏹️ No more subscribers for event ${eventId}, stopping polling`);
    if (sub.interval) {
      clearInterval(sub.interval);
    }
    subscriptions.delete(eventId);
  }
}

/**
 * Avvia polling per un evento
 */
function startPolling(eventId, io) {
  const sub = subscriptions.get(eventId);
  if (!sub || sub.interval) return;

  console.log(`▶️ Starting polling for event ${eventId}`);

  sub.interval = setInterval(async () => {
    try {
      const newData = await fetchLiveData(eventId);
      
      // Controlla se il match è terminato
      if (isMatchFinished(newData)) {
        console.log(`🏁 Match ${eventId} finished, fetching complete data...`);
        
        // Fetch COMPLETO finale per avere tutti i dati per il DB
        const completeData = await fetchCompleteData(eventId);
        
        console.log(`✅ Complete data fetched for ${eventId}, completeness: ${completeData.dataCompleteness.total}%`);
        
        // ========== SALVA SU DATABASE ==========
        await saveMatchToDatabase(eventId, completeData, 'finished');
        
        // Invia dati completi ai client (se ci sono)
        sub.lastData = completeData;
        sub.sockets.forEach(socket => {
          socket.emit('data', completeData);
          socket.emit('matchFinished', { 
            eventId, 
            message: 'Match terminato',
            dataCompleteness: completeData.dataCompleteness
          });
        });
        
        // Rimuovi dal tracking
        trackedMatchesFallback.delete(String(eventId));
        
        // Ferma polling
        clearInterval(sub.interval);
        sub.interval = null;
        return;
      }
      
      // Controlla se i dati sono cambiati
      if (hasDataChanged(sub.lastData, newData)) {
        console.log(`📊 Data changed for event ${eventId}, broadcasting to ${sub.sockets.size} clients`);
        sub.lastData = newData;
        
        // ========== SALVA AGGIORNAMENTO SU DATABASE ==========
        // Salva periodicamente durante il match (ogni cambio di dati)
        await saveMatchToDatabase(eventId, newData, 'live-update');
        
        // Aggiorna tracking (fallback in-memory)
        trackedMatchesFallback.set(String(eventId), {
          status: newData.event?.status?.type || 'inprogress',
          lastUpdate: new Date().toISOString(),
          startTimestamp: newData.event?.startTimestamp,
          autoTrack: true
        });
        
        // Broadcast a tutti i socket iscritti
        sub.sockets.forEach(socket => {
          socket.emit('data', newData);
        });
      }
    } catch (err) {
      console.error(`❌ Polling error for event ${eventId}:`, err.message);
      // Notifica errore ai client
      sub.sockets.forEach(socket => {
        socket.emit('error', { message: err.message, eventId });
      });
    }
  }, CONFIG.POLL_INTERVAL);
}

/**
 * Ottieni statistiche delle sottoscrizioni attive
 */
function getStats() {
  const stats = {
    activeSubscriptions: subscriptions.size,
    trackedMatches: trackedMatchesFallback.size,
    events: []
  };

  subscriptions.forEach((sub, eventId) => {
    stats.events.push({
      eventId,
      clients: sub.sockets.size,
      hasData: !!sub.lastData
    });
  });

  return stats;
}

// ============================================================================
// SALVATAGGIO SU DATABASE
// ============================================================================

/**
 * Salva i dati del match su Database e file JSON
 * @param {string} eventId - ID dell'evento
 * @param {object} data - Dati da salvare (formato liveData o completeData)
 * @param {string} saveType - 'live-update' | 'finished' | 'manual-sync'
 */
async function saveMatchToDatabase(eventId, data, saveType = 'live-update') {
  if (!data || !data.event) {
    console.warn(`⚠️ No event data to save for ${eventId}`);
    return null;
  }

  try {
    // 1. Prepara dati per il DB nel formato che matchRepository si aspetta
    const eventData = data.event;
    const matchForDB = {
      id: eventData.id || eventId,
      slug: eventData.slug,
      homeTeam: eventData.homeTeam,
      awayTeam: eventData.awayTeam,
      home: eventData.homeTeam,
      away: eventData.awayTeam,
      tournament: eventData.tournament?.uniqueTournament || eventData.tournament,
      uniqueTournament: eventData.tournament?.uniqueTournament,
      roundInfo: eventData.roundInfo,
      round: eventData.roundInfo?.name,
      startTimestamp: eventData.startTimestamp,
      status: eventData.status,
      winnerCode: eventData.winnerCode,
      homeScore: eventData.homeScore,
      awayScore: eventData.awayScore,
      firstToServe: eventData.firstToServe,
      // Dati aggiuntivi
      pointByPoint: data.pointByPoint || [],
      statistics: data.statistics || [],
      tennisPowerRankings: data.powerRankings || [],
      powerRankings: data.powerRankings || [],
      incidents: data.incidents || [],
      h2h: data.h2h,
      graph: data.graph
    };

    // 2. Salva su database (se disponibile)
    if (matchRepository) {
      try {
        const savedMatch = await matchRepository.insertMatch(matchForDB, `https://www.sofascore.com/event/${eventId}`);
        console.log(`💾 [${saveType}] Match ${eventId} saved to database`);
      } catch (dbError) {
        console.error(`❌ Database save failed for ${eventId}:`, dbError.message);
      }
    }

    // 3. FILOSOFIA: Aggiorna anche match_card_snapshot con i dati freschi
    // Lo snapshot è la fonte principale per il bundle API
    if (supabase) {
      try {
        // Calcola superficie da groundType o tournament
        const surface = eventData.groundType || 
                       eventData.tournament?.uniqueTournament?.groundType || 
                       eventData.tournament?.groundType ||
                       'Unknown';
        
        // Costruisci sets dai punteggi
        const sets = [];
        const homeScore = eventData.homeScore || {};
        const awayScore = eventData.awayScore || {};
        for (let i = 1; i <= 5; i++) {
          const hPeriod = homeScore[`period${i}`];
          const aPeriod = awayScore[`period${i}`];
          if (hPeriod !== undefined && aPeriod !== undefined) {
            sets.push({ home: hPeriod, away: aPeriod });
          }
        }
        
        const snapshotData = {
          match_id: parseInt(eventId),
          core_json: {
            id: parseInt(eventId),
            status: eventData.status?.type || eventData.status?.description?.toLowerCase().replace(/\s/g, '') || 'unknown',
            date: eventData.startTimestamp ? new Date(eventData.startTimestamp * 1000).toISOString().split('T')[0] : null,
            time: eventData.startTimestamp ? new Date(eventData.startTimestamp * 1000).toISOString().split('T')[1]?.substring(0, 5) : null,
            surface: surface,
            round: eventData.roundInfo?.name || null,
            bestOf: eventData.tournament?.uniqueTournament?.tennisMatchFormat?.matchBestOf || 3,
            sets: sets,
            score: homeScore?.current != null && awayScore?.current != null 
              ? `${homeScore.current}-${awayScore.current}` 
              : null,
            winner: eventData.winnerCode || null,
            setsPlayer1: homeScore?.current,
            setsPlayer2: awayScore?.current,
            tournament: {
              name: eventData.tournament?.name || eventData.tournament?.uniqueTournament?.name,
              category: eventData.tournament?.category?.name,
              id: eventData.tournament?.id
            }
          },
          players_json: {
            player1: {
              id: eventData.homeTeam?.id,
              name: eventData.homeTeam?.name,
              country: eventData.homeTeam?.country?.alpha2,
              currentRanking: eventData.homeTeam?.ranking,
              seed: eventData.homeTeam?.seed
            },
            player2: {
              id: eventData.awayTeam?.id,
              name: eventData.awayTeam?.name,
              country: eventData.awayTeam?.country?.alpha2,
              currentRanking: eventData.awayTeam?.ranking,
              seed: eventData.awayTeam?.seed
            }
          },
          stats_json: data.statistics || [],
          momentum_json: data.powerRankings || [],
          odds_json: data.odds || null,
          h2h_json: data.h2h ? {
            player1_wins: data.h2h.homeWins || 0,
            player2_wins: data.h2h.awayWins || 0
          } : null,
          data_sources_json: [{ source_type: 'sofascore_sync' }],
          data_quality_int: calculateDataQualityFromCompleteness(data.dataCompleteness),
          last_updated_at: new Date().toISOString()
        };
        
        const { error: snapshotError } = await supabase
          .from('match_card_snapshot')
          .upsert(snapshotData, { onConflict: 'match_id' });
        
        if (snapshotError) {
          console.error(`❌ Snapshot update failed for ${eventId}:`, snapshotError.message);
        } else {
          console.log(`📸 [${saveType}] Snapshot updated for match ${eventId} (surface=${surface})`);
        }
      } catch (snapErr) {
        console.error(`❌ Snapshot error for ${eventId}:`, snapErr.message);
      }
    }

    return true;
  } catch (error) {
    console.error(`❌ Error saving match ${eventId}:`, error.message);
    return false;
  }
}

/**
 * Calcola la qualità dei dati dalla completeness
 */
function calculateDataQualityFromCompleteness(completeness) {
  if (!completeness) return 20;
  
  let score = 0;
  if (completeness.event) score += 30;
  if (completeness.statistics) score += 20;
  if (completeness.pointByPoint) score += 20;
  if (completeness.powerRankings) score += 15;
  if (completeness.h2h) score += 10;
  if (completeness.graph) score += 5;
  
  return Math.min(100, score);
}

/**
 * Salva i dati in un file JSON (retrocompatibilità)
 */
async function saveMatchToFile(eventId, data, saveType) {
  try {
    // Cerca file esistente per questo eventId
    const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
    let targetFile = null;
    let existingContent = null;

    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(SCRAPES_DIR, file), 'utf8'));
        if (content.api) {
          for (const [url, apiData] of Object.entries(content.api)) {
            if (url.includes(`/event/${eventId}`) || apiData?.event?.id === parseInt(eventId)) {
              targetFile = file;
              existingContent = content;
              break;
            }
          }
        }
        if (targetFile) break;
      } catch (e) { /* skip */ }
    }

    if (targetFile && existingContent) {
      // Aggiorna file esistente
      existingContent.lastSync = new Date().toISOString();
      existingContent.syncType = saveType;
      existingContent.liveData = data;
      
      // Aggiorna l'API con dati freschi
      const baseUrl = `https://api.sofascore.com/api/v1/event/${eventId}`;
      if (data.event) existingContent.api[baseUrl] = { event: data.event };
      if (data.pointByPoint?.length) existingContent.api[`${baseUrl}/point-by-point`] = { pointByPoint: data.pointByPoint };
      if (data.statistics?.length) existingContent.api[`${baseUrl}/statistics`] = { statistics: data.statistics };
      if (data.powerRankings?.length) existingContent.api[`${baseUrl}/tennis-power-rankings`] = { tennisPowerRankings: data.powerRankings };
      
      fs.writeFileSync(path.join(SCRAPES_DIR, targetFile), JSON.stringify(existingContent, null, 2));
      console.log(`📁 [${saveType}] Updated file ${targetFile}`);
    } else {
      // Crea nuovo file
      const newFileName = `live-${eventId}-${Date.now().toString(36)}.json`;
      const newContent = {
        api: {},
        createdAt: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        syncType: saveType,
        eventId: eventId
      };
      
      const baseUrl = `https://api.sofascore.com/api/v1/event/${eventId}`;
      if (data.event) newContent.api[baseUrl] = { event: data.event };
      if (data.pointByPoint?.length) newContent.api[`${baseUrl}/point-by-point`] = { pointByPoint: data.pointByPoint };
      if (data.statistics?.length) newContent.api[`${baseUrl}/statistics`] = { statistics: data.statistics };
      if (data.powerRankings?.length) newContent.api[`${baseUrl}/tennis-power-rankings`] = { tennisPowerRankings: data.powerRankings };
      
      fs.writeFileSync(path.join(SCRAPES_DIR, newFileName), JSON.stringify(newContent, null, 2));
      console.log(`📁 [${saveType}] Created new file ${newFileName}`);
    }
  } catch (error) {
    console.error(`❌ File save error for ${eventId}:`, error.message);
  }
}

// ============================================================================
// SCHEDULER - Monitoraggio automatico partite
// ============================================================================

let schedulerInterval = null;
let reconciliationInterval = null;
const SCHEDULER_INTERVAL = 30000; // Controlla ogni 30 secondi
const RECONCILIATION_INTERVAL = 5 * 60 * 1000; // Riconcilia ogni 5 minuti

/**
 * Avvia lo scheduler per monitorare partite in corso
 */
function startScheduler() {
  if (schedulerInterval) {
    console.log('⚠️ Scheduler already running');
    return;
  }

  console.log('🕐 Starting match monitoring scheduler...');
  
  schedulerInterval = setInterval(async () => {
    await checkTrackedMatches();
  }, SCHEDULER_INTERVAL);

  // Prima esecuzione immediata
  checkTrackedMatches();
  
  // Avvia anche reconciliation job
  startReconciliationJob();
}

/**
 * Ferma lo scheduler
 */
function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('⏹️ Scheduler stopped');
  }
  stopReconciliationJob();
}

// ============================================================================
// RECONCILIATION JOB - Scoperta automatica match live
// Riferimento: FILOSOFIA_LIVE_TRACKING.md sezione 6
// ============================================================================

/**
 * Avvia il job di riconciliazione per scoprire nuovi match live
 */
function startReconciliationJob() {
  if (reconciliationInterval) {
    console.log('⚠️ Reconciliation job already running');
    return;
  }

  console.log('🔄 Starting reconciliation job (every 5 min)...');
  
  reconciliationInterval = setInterval(async () => {
    await reconcileLiveMatches();
  }, RECONCILIATION_INTERVAL);

  // Prima esecuzione dopo 30 secondi (per non sovraccaricare all'avvio)
  setTimeout(() => reconcileLiveMatches(), 30000);
}

/**
 * Ferma il job di riconciliazione
 */
function stopReconciliationJob() {
  if (reconciliationInterval) {
    clearInterval(reconciliationInterval);
    reconciliationInterval = null;
    console.log('⏹️ Reconciliation job stopped');
  }
}

/**
 * Riconcilia i match live da SofaScore con il tracking locale
 * - Aggiunge nuovi match ATP live
 * - Marca come FINISHED i match spariti dalla lista live
 */
async function reconcileLiveMatches() {
  console.log('🔄 Running reconciliation job...');
  
  try {
    // 1. Fetch lista match live da SofaScore
    const liveMatches = await fetchLiveMatchesList();
    
    if (!liveMatches || liveMatches.length === 0) {
      console.log('📭 No live matches found on SofaScore');
      return { added: 0, finished: 0 };
    }
    
    console.log(`📡 Found ${liveMatches.length} live matches on SofaScore`);
    
    // 2. Ottieni match attualmente tracciati
    let currentlyTracked = [];
    if (USE_DB_TRACKING && liveTrackingRepo) {
      currentlyTracked = await liveTrackingRepo.getAllTracking({ status: 'WATCHING' });
    } else {
      currentlyTracked = Array.from(trackedMatchesFallback.entries()).map(([id, info]) => ({
        source_event_id: id,
        ...info
      }));
    }
    
    const trackedIds = new Set(currentlyTracked.map(t => String(t.source_event_id)));
    const liveIds = new Set(liveMatches.map(m => String(m.id)));
    
    // 3. Aggiungi nuovi match live (non ancora tracciati)
    let addedCount = 0;
    for (const match of liveMatches) {
      const eventId = String(match.id);
      
      if (!trackedIds.has(eventId)) {
        // Determina priorità in base a torneo/round
        const priority = determinePriority(match);
        
        const added = await trackMatch(eventId, {
          priority,
          status: 'inprogress',
          player1Name: match.homeTeam?.name,
          player2Name: match.awayTeam?.name,
          tournamentName: match.tournament?.name
        });
        
        if (added) {
          addedCount++;
          console.log(`➕ Auto-added: ${match.homeTeam?.name} vs ${match.awayTeam?.name} (${priority})`);
        }
      }
    }
    
    // 4. Marca come FINISHED i match spariti dalla lista live
    let finishedCount = 0;
    for (const tracked of currentlyTracked) {
      const eventId = tracked.source_event_id;
      
      if (!liveIds.has(eventId)) {
        // Match non più nella lista live → probabilmente finito
        console.log(`🏁 Match ${eventId} no longer live, checking status...`);
        
        try {
          // Verifica effettivo stato
          const data = await fetchLiveData(eventId);
          
          if (isMatchFinished(data)) {
            // Fetch dati completi e salva
            const completeData = await fetchCompleteData(eventId);
            await saveMatchToDatabase(eventId, completeData, 'reconciliation-finished');
            
            if (USE_DB_TRACKING && liveTrackingRepo) {
              await liveTrackingRepo.markFinished(eventId);
            } else {
              trackedMatchesFallback.delete(eventId);
            }
            
            finishedCount++;
            console.log(`✅ Match ${eventId} marked as finished`);
          }
        } catch (e) {
          console.warn(`⚠️ Could not verify match ${eventId}:`, e.message);
        }
      }
    }
    
    console.log(`🔄 Reconciliation complete: +${addedCount} added, ${finishedCount} finished`);
    return { added: addedCount, finished: finishedCount };
    
  } catch (error) {
    console.error('❌ Reconciliation error:', error.message);
    return { error: error.message };
  }
}

/**
 * Fetch lista match tennis live da SofaScore
 */
async function fetchLiveMatchesList() {
  try {
    // Endpoint per match tennis live
    const url = 'https://api.sofascore.com/api/v1/sport/tennis/events/live';
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.warn(`⚠️ Live matches fetch failed: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const events = data?.events || [];
    
    // Filtra solo match ATP/WTA principali (opzionale)
    const mainTourEvents = events.filter(e => {
      const category = e.tournament?.category?.name?.toLowerCase() || '';
      const tournamentName = e.tournament?.name?.toLowerCase() || '';
      
      // Include ATP, WTA, Grand Slam
      return category.includes('atp') || 
             category.includes('wta') ||
             tournamentName.includes('grand slam') ||
             tournamentName.includes('australian open') ||
             tournamentName.includes('roland garros') ||
             tournamentName.includes('wimbledon') ||
             tournamentName.includes('us open');
    });
    
    return mainTourEvents;
  } catch (error) {
    console.error('❌ Error fetching live matches:', error.message);
    return [];
  }
}

/**
 * Determina la priorità di un match in base a torneo e round
 */
function determinePriority(match) {
  const tournamentName = (match.tournament?.name || '').toLowerCase();
  const roundName = (match.roundInfo?.name || '').toLowerCase();
  const category = (match.tournament?.category?.name || '').toLowerCase();
  
  // Grand Slam finals/semis = HIGH
  if (tournamentName.includes('australian open') ||
      tournamentName.includes('roland garros') ||
      tournamentName.includes('wimbledon') ||
      tournamentName.includes('us open')) {
    if (roundName.includes('final') || roundName.includes('semifinal')) {
      return 'HIGH';
    }
    return 'MEDIUM';
  }
  
  // ATP Masters 1000 finals = HIGH
  if (category.includes('atp') && tournamentName.includes('1000')) {
    if (roundName.includes('final')) {
      return 'HIGH';
    }
  }
  
  // Qualificazioni = LOW
  if (roundName.includes('qualification') || roundName.includes('qualifying')) {
    return 'LOW';
  }
  
  // Round 1 di tornei minori = LOW
  if (roundName.includes('round 1') || roundName.includes('1st round')) {
    if (!category.includes('grand slam') && !tournamentName.includes('1000')) {
      return 'LOW';
    }
  }
  
  return 'MEDIUM';
}

/**
 * Controlla tutte le partite tracciate
 * Versione aggiornata con supporto DB e fallback in-memory
 */
async function checkTrackedMatches() {
  let trackedList = [];
  
  // Ottieni lista da DB o fallback
  if (USE_DB_TRACKING && liveTrackingRepo) {
    try {
      trackedList = await liveTrackingRepo.getTrackingDue(20);
    } catch (e) {
      console.error('❌ Error fetching tracking from DB:', e.message);
      // Fallback to in-memory
      trackedList = Array.from(trackedMatchesFallback.entries()).map(([eventId, info]) => ({
        source_event_id: eventId,
        ...info
      }));
    }
  } else {
    trackedList = Array.from(trackedMatchesFallback.entries()).map(([eventId, info]) => ({
      source_event_id: eventId,
      ...info
    }));
  }
  
  if (trackedList.length === 0) return;
  
  console.log(`🔍 Checking ${trackedList.length} tracked matches...`);

  for (const trackInfo of trackedList) {
    const eventId = trackInfo.source_event_id;
    
    try {
      // Salta se è già in polling attivo tramite WebSocket
      if (subscriptions.has(eventId)) continue;

      // Fetch dati aggiornati
      const data = await fetchLiveData(eventId);
      const payloadHash = computeDataHash(data);
      
      if (isMatchFinished(data)) {
        console.log(`🏁 Tracked match ${eventId} finished, fetching complete data...`);
        
        const completeData = await fetchCompleteData(eventId);
        await saveMatchToDatabase(eventId, completeData, 'scheduler-finished');
        
        // Marca come finito
        if (USE_DB_TRACKING && liveTrackingRepo) {
          await liveTrackingRepo.markFinished(eventId);
        } else {
          trackedMatchesFallback.delete(eventId);
        }
        console.log(`✅ Match ${eventId} completed and marked as finished`);
      } else {
        // Aggiorna tracking con nuovo hash e timestamp
        const scoreData = {
          currentScore: {
            sets: extractSetsFromEvent(data.event),
            game: `${data.event?.homeScore?.point || 0}-${data.event?.awayScore?.point || 0}`,
            server: data.event?.firstToServe
          },
          matchStatus: data.event?.status?.type || 'inprogress'
        };
        
        if (USE_DB_TRACKING && liveTrackingRepo) {
          // Hash diverso = cambio nel match
          if (payloadHash !== trackInfo.last_payload_hash) {
            await saveMatchToDatabase(eventId, data, 'scheduler-update');
          }
          await liveTrackingRepo.recordPollSuccess(eventId, payloadHash, scoreData);
        } else {
          trackedMatchesFallback.set(eventId, {
            ...trackInfo,
            status: data.event?.status?.type || 'inprogress',
            lastUpdate: new Date().toISOString(),
            last_payload_hash: payloadHash
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error checking tracked match ${eventId}:`, error.message);
      
      // Registra errore
      if (USE_DB_TRACKING && liveTrackingRepo) {
        await liveTrackingRepo.recordPollError(eventId, error.message);
      }
    }
  }
}

/**
 * Estrae i set dal formato evento SofaScore
 */
function extractSetsFromEvent(event) {
  if (!event || !event.homeScore) return [];
  const sets = [];
  for (let i = 1; i <= 5; i++) {
    const h = event.homeScore[`period${i}`];
    const a = event.awayScore?.[`period${i}`];
    if (h !== undefined && a !== undefined) {
      sets.push([h, a]);
    }
  }
  return sets;
}

/**
 * Aggiungi una partita al tracking automatico
 * Supporta priorità: HIGH, MEDIUM, LOW
 */
async function trackMatch(eventId, options = {}) {
  const id = String(eventId);
  
  if (USE_DB_TRACKING && liveTrackingRepo) {
    // Verifica se già tracciato
    const existing = await liveTrackingRepo.getTracking(id);
    if (existing && existing.status === 'WATCHING') {
      console.log(`⚠️ Match ${eventId} already tracked in DB`);
      return false;
    }
    
    // Fetch dati iniziali per metadati
    let player1Name = options.player1Name;
    let player2Name = options.player2Name;
    let tournamentName = options.tournamentName;
    
    if (!player1Name || !player2Name) {
      try {
        const data = await fetchLiveData(id);
        player1Name = data.event?.homeTeam?.name || player1Name;
        player2Name = data.event?.awayTeam?.name || player2Name;
        tournamentName = data.event?.tournament?.name || tournamentName;
      } catch (e) { /* ignore */ }
    }
    
    const result = await liveTrackingRepo.addTracking(id, {
      priority: options.priority || 'MEDIUM',
      matchStatus: options.status || 'inprogress',
      player1Name,
      player2Name,
      tournamentName
    });
    
    if (result) {
      console.log(`📌 Match ${eventId} added to DB tracking (${options.priority || 'MEDIUM'})`);
    }
    return !!result;
  } else {
    // Fallback in-memory
    if (trackedMatchesFallback.has(id)) {
      console.log(`⚠️ Match ${eventId} already tracked (in-memory)`);
      return false;
    }

    trackedMatchesFallback.set(id, {
      status: options.status || 'pending',
      lastUpdate: new Date().toISOString(),
      startTimestamp: options.startTimestamp || null,
      priority: options.priority || 'MEDIUM',
      autoTrack: true
    });

    console.log(`📌 Match ${eventId} added to tracking (in-memory)`);
  }
  
  // Avvia scheduler se non attivo
  if (!schedulerInterval) {
    startScheduler();
  }

  return true;
}

/**
 * Rimuovi una partita dal tracking
 */
async function untrackMatch(eventId) {
  const id = String(eventId);
  
  if (USE_DB_TRACKING && liveTrackingRepo) {
    const removed = await liveTrackingRepo.removeTracking(id);
    return removed;
  } else {
    const removed = trackedMatchesFallback.delete(id);
    if (removed) {
      console.log(`📍 Match ${eventId} removed from tracking`);
    }
    return removed;
  }
}

/**
 * Ottieni lista partite tracciate
 */
async function getTrackedMatches() {
  if (USE_DB_TRACKING && liveTrackingRepo) {
    try {
      const tracking = await liveTrackingRepo.getAllTracking({ status: 'WATCHING' });
      return tracking.map(t => ({
        eventId: t.source_event_id,
        status: t.match_status,
        priority: t.priority,
        lastUpdate: t.last_polled_at,
        player1: t.player1_name,
        player2: t.player2_name,
        tournament: t.tournament_name,
        currentScore: t.current_score,
        failCount: t.fail_count
      }));
    } catch (e) {
      console.error('❌ Error fetching tracked matches from DB:', e.message);
    }
  }
  
  // Fallback
  return Array.from(trackedMatchesFallback.entries()).map(([eventId, info]) => ({
    eventId,
    ...info
  }));
}

/**
 * Cambia priorità di un match
 */
async function setMatchPriority(eventId, priority) {
  const id = String(eventId);
  
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
    console.error(`❌ Invalid priority: ${priority}`);
    return false;
  }
  
  if (USE_DB_TRACKING && liveTrackingRepo) {
    const result = await liveTrackingRepo.updatePriority(id, priority);
    return !!result;
  } else {
    const tracking = trackedMatchesFallback.get(id);
    if (tracking) {
      tracking.priority = priority;
      return true;
    }
    return false;
  }
}

/**
 * Riprende un match in errore/pausa
 */
async function resumeMatch(eventId) {
  const id = String(eventId);
  
  if (USE_DB_TRACKING && liveTrackingRepo) {
    const result = await liveTrackingRepo.resumeTracking(id);
    return !!result;
  }
  return false;
}

/**
 * Ottieni statistiche del sistema di tracking
 */
async function getTrackingStats() {
  if (USE_DB_TRACKING && liveTrackingRepo) {
    return await liveTrackingRepo.getTrackingStats();
  }
  
  return {
    total: trackedMatchesFallback.size,
    byStatus: { WATCHING: trackedMatchesFallback.size },
    byPriority: {},
    mode: 'in-memory'
  };
}

/**
 * Sync manuale di una partita (fetch + save)
 */
async function syncMatch(eventId) {
  console.log(`🔄 Manual sync for event ${eventId}...`);
  
  try {
    const completeData = await fetchCompleteData(eventId);
    await saveMatchToDatabase(eventId, completeData, 'manual-sync');
    
    return {
      success: true,
      eventId,
      dataCompleteness: completeData.dataCompleteness,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Sync error for ${eventId}:`, error.message);
    return {
      success: false,
      eventId,
      error: error.message
    };
  }
}

/**
 * Get a single tracked match by ID (FILOSOFIA_FRONTEND compliance)
 * @param {string} matchId - Match ID to find
 * @returns {Object|null} Tracked match or null
 */
function getTrackedMatch(matchId) {
  const tracked = getTrackedMatches();
  return tracked.find(m => m.id === matchId || m.eventId === matchId) || null;
}

module.exports = {
  initLiveManager,
  getStats,
  fetchLiveData,
  fetchCompleteData,
  // Funzioni tracking
  saveMatchToDatabase,
  trackMatch,
  untrackMatch,
  getTrackedMatches,
  getTrackedMatch, // FILOSOFIA_FRONTEND: singolo match
  startScheduler,
  stopScheduler,
  syncMatch,
  // Nuove funzioni (FILOSOFIA_LIVE_TRACKING compliance)
  setMatchPriority,
  resumeMatch,
  getTrackingStats,
  computeDataHash,
  // Reconciliation Job
  reconcileLiveMatches,
  fetchLiveMatchesList,
  fetchLiveList: fetchLiveMatchesList, // alias FILOSOFIA_FRONTEND
  startReconciliationJob,
  stopReconciliationJob,
  // FILOSOFIA_LIVE_TRACKING aliases
  startTracking: trackMatch,
  stopTracking: untrackMatch,
  // FILOSOFIA_LIVE_TRACKING: Pipeline functions
  normalizeLiveData,
  validateLiveData,
  processLivePipeline,
  // FILOSOFIA_LIVE_TRACKING: Patch functions (RULE_LIVE_OUTPUT)
  generateLivePatches,
  applyLivePatches,
  // Constants
  CONFIG,
  USE_DB_TRACKING
};
