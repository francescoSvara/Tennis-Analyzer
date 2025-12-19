/**
 * Live Match Manager
 * Gestisce il polling intelligente per match live e salvataggio automatico su DB
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Database imports
let matchRepository = null;
try {
  matchRepository = require('./db/matchRepository');
  console.log('✅ LiveManager: Database module loaded');
} catch (e) {
  console.warn('⚠️ LiveManager: Database module not available:', e.message);
}

// Store per le sottoscrizioni attive
const subscriptions = new Map(); // eventId -> { sockets: Set, lastData: object, interval: NodeJS.Timer }

// Store per il tracking delle partite monitorate (persistente)
const trackedMatches = new Map(); // eventId -> { status, lastUpdate, startTimestamp, autoTrack: boolean }

// Directory per i file
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const SCRAPES_DIR = path.join(DATA_DIR, 'scrapes');

// Configurazione
const CONFIG = {
  POLL_INTERVAL: 5000, // Polling ogni 5 secondi (server-side)
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
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
 */
async function fetchLiveData(eventId) {
  const baseUrl = CONFIG.SOFASCORE_API;
  const result = {
    eventId,
    timestamp: new Date().toISOString(),
    event: null,
    pointByPoint: [],
    statistics: [],
    powerRankings: [],
    errors: []
  };

  const fetches = [
    fetch(`${baseUrl}/${eventId}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { result.event = data?.event || data; })
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
 * Calcola hash semplice per confronto dati
 */
function computeDataHash(data) {
  // Hash basato su elementi chiave che cambiano durante il match
  const key = JSON.stringify({
    score: data.event?.homeScore?.current + '-' + data.event?.awayScore?.current,
    status: data.event?.status?.type,
    pbpLength: data.pointByPoint?.length || 0,
    lastPbp: data.pointByPoint?.slice(-1)[0] || null,
    prLength: data.powerRankings?.length || 0
  });
  return key;
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
        trackedMatches.delete(String(eventId));
        
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
        
        // Aggiorna tracking
        trackedMatches.set(String(eventId), {
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
    trackedMatches: trackedMatches.size,
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

    // 3. Salva/aggiorna anche il file JSON per retrocompatibilità
    await saveMatchToFile(eventId, data, saveType);

    return true;
  } catch (error) {
    console.error(`❌ Error saving match ${eventId}:`, error.message);
    return false;
  }
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
const SCHEDULER_INTERVAL = 30000; // Controlla ogni 30 secondi

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
}

/**
 * Controlla tutte le partite tracciate
 */
async function checkTrackedMatches() {
  if (trackedMatches.size === 0) return;

  console.log(`🔍 Checking ${trackedMatches.size} tracked matches...`);

  for (const [eventId, trackInfo] of trackedMatches) {
    try {
      // Salta se è già in polling attivo tramite WebSocket
      if (subscriptions.has(eventId)) continue;

      // Fetch dati aggiornati
      const data = await fetchLiveData(eventId);
      
      if (isMatchFinished(data)) {
        console.log(`🏁 Tracked match ${eventId} finished, fetching complete data...`);
        
        const completeData = await fetchCompleteData(eventId);
        await saveMatchToDatabase(eventId, completeData, 'scheduler-finished');
        
        trackedMatches.delete(eventId);
        console.log(`✅ Match ${eventId} completed and removed from tracking`);
      } else {
        // Aggiorna dati periodicamente anche se non finito
        const lastUpdate = new Date(trackInfo.lastUpdate);
        const now = new Date();
        const minutesSinceUpdate = (now - lastUpdate) / 60000;

        // Aggiorna ogni 2 minuti per partite in corso
        if (minutesSinceUpdate >= 2) {
          await saveMatchToDatabase(eventId, data, 'scheduler-update');
          trackedMatches.set(eventId, {
            ...trackInfo,
            status: data.event?.status?.type || 'inprogress',
            lastUpdate: now.toISOString()
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error checking tracked match ${eventId}:`, error.message);
    }
  }
}

/**
 * Aggiungi una partita al tracking automatico
 */
function trackMatch(eventId, options = {}) {
  const id = String(eventId);
  
  if (trackedMatches.has(id)) {
    console.log(`⚠️ Match ${eventId} already tracked`);
    return false;
  }

  trackedMatches.set(id, {
    status: options.status || 'pending',
    lastUpdate: new Date().toISOString(),
    startTimestamp: options.startTimestamp || null,
    autoTrack: true
  });

  console.log(`📌 Match ${eventId} added to tracking`);
  
  // Avvia scheduler se non attivo
  if (!schedulerInterval) {
    startScheduler();
  }

  return true;
}

/**
 * Rimuovi una partita dal tracking
 */
function untrackMatch(eventId) {
  const removed = trackedMatches.delete(String(eventId));
  if (removed) {
    console.log(`📍 Match ${eventId} removed from tracking`);
  }
  return removed;
}

/**
 * Ottieni lista partite tracciate
 */
function getTrackedMatches() {
  return Array.from(trackedMatches.entries()).map(([eventId, info]) => ({
    eventId,
    ...info
  }));
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

module.exports = {
  initLiveManager,
  getStats,
  fetchLiveData,
  fetchCompleteData,
  // Nuove funzioni
  saveMatchToDatabase,
  trackMatch,
  untrackMatch,
  getTrackedMatches,
  startScheduler,
  stopScheduler,
  syncMatch
};
