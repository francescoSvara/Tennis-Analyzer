/**
 * Live Tracking Repository
 * Gestisce le operazioni CRUD per la tabella live_tracking su Supabase
 * Riferimento: FILOSOFIA_LIVE_TRACKING.md
 */

const { supabase, handleSupabaseError } = require('./supabase');

// Costanti per priorità e intervalli
const PRIORITY_INTERVALS = {
  HIGH: 3, // 3 secondi per match importanti
  MEDIUM: 10, // 10 secondi default
  LOW: 30, // 30 secondi per match meno importanti
};

const STATUS = {
  WATCHING: 'WATCHING',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED',
  ERROR: 'ERROR',
};

const PRIORITY = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

// Helper per verificare disponibilità Supabase
function checkSupabase() {
  if (!supabase) {
    console.warn('⚠️ Supabase not available for live_tracking');
    return false;
  }
  return true;
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Aggiunge un match al tracking
 * @param {string} sourceEventId - ID evento SofaScore
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Object} Record inserito
 */
async function addTracking(sourceEventId, options = {}) {
  if (!checkSupabase()) return null;

  const now = new Date().toISOString();
  const trackingData = {
    source_event_id: String(sourceEventId),
    source_type: options.sourceType || 'sofascore',
    match_id: options.matchId || null,
    status: STATUS.WATCHING,
    priority: options.priority || PRIORITY.MEDIUM,
    player1_name: options.player1Name || null,
    player2_name: options.player2Name || null,
    tournament_name: options.tournamentName || null,
    match_status: options.matchStatus || 'inprogress',
    current_score: options.currentScore || null,
    next_poll_at: now,
    created_at: now,
  };

  const { data, error } = await supabase
    .from('live_tracking')
    .upsert(trackingData, {
      onConflict: 'source_event_id',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error adding tracking:', error.message);
    return null;
  }

  console.log(`✅ Tracking added: ${sourceEventId} (${trackingData.priority})`);
  return data;
}

/**
 * Rimuove un match dal tracking
 * @param {string} sourceEventId - ID evento
 * @returns {boolean} Successo
 */
async function removeTracking(sourceEventId) {
  if (!checkSupabase()) return false;

  const { error } = await supabase
    .from('live_tracking')
    .delete()
    .eq('source_event_id', String(sourceEventId));

  if (error) {
    console.error('❌ Error removing tracking:', error.message);
    return false;
  }

  console.log(`📍 Tracking removed: ${sourceEventId}`);
  return true;
}

/**
 * Ottiene tutti i match in tracking
 * @param {Object} filters - Filtri opzionali
 * @returns {Array} Lista tracking
 */
async function getAllTracking(filters = {}) {
  if (!checkSupabase()) return [];

  let query = supabase
    .from('live_tracking')
    .select('*')
    .order('priority', { ascending: true })
    .order('last_polled_at', { ascending: true, nullsFirst: true });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching tracking:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Ottiene un singolo tracking
 * @param {string} sourceEventId - ID evento
 * @returns {Object|null} Tracking record
 */
async function getTracking(sourceEventId) {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase
    .from('live_tracking')
    .select('*')
    .eq('source_event_id', String(sourceEventId))
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found
    console.error('❌ Error fetching tracking:', error.message);
  }

  return data || null;
}

/**
 * Ottiene i match pronti per il polling (due)
 * @param {number} limit - Numero massimo di match
 * @returns {Array} Match da pollare
 */
async function getTrackingDue(limit = 10) {
  if (!checkSupabase()) return [];

  const { data, error } = await supabase
    .from('live_tracking')
    .select('*')
    .eq('status', STATUS.WATCHING)
    .or(`next_poll_at.is.null,next_poll_at.lte.${new Date().toISOString()}`)
    .order('priority', { ascending: true }) // HIGH first
    .order('last_polled_at', { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching due tracking:', error.message);
    return [];
  }

  return data || [];
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Aggiorna lo status di un tracking
 * @param {string} sourceEventId - ID evento
 * @param {string} status - Nuovo status
 * @returns {Object|null} Record aggiornato
 */
async function updateStatus(sourceEventId, status) {
  if (!checkSupabase()) return null;

  if (!Object.values(STATUS).includes(status)) {
    console.error(`❌ Invalid status: ${status}`);
    return null;
  }

  const { data, error } = await supabase
    .from('live_tracking')
    .update({ status })
    .eq('source_event_id', String(sourceEventId))
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating status:', error.message);
    return null;
  }

  console.log(`📊 Status updated: ${sourceEventId} → ${status}`);
  return data;
}

/**
 * Aggiorna la priorità di un tracking
 * @param {string} sourceEventId - ID evento
 * @param {string} priority - Nuova priorità
 * @returns {Object|null} Record aggiornato
 */
async function updatePriority(sourceEventId, priority) {
  if (!checkSupabase()) return null;

  if (!Object.values(PRIORITY).includes(priority)) {
    console.error(`❌ Invalid priority: ${priority}`);
    return null;
  }

  const pollInterval = PRIORITY_INTERVALS[priority];

  const { data, error } = await supabase
    .from('live_tracking')
    .update({
      priority,
      poll_interval_sec: pollInterval,
    })
    .eq('source_event_id', String(sourceEventId))
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating priority:', error.message);
    return null;
  }

  console.log(`⚡ Priority updated: ${sourceEventId} → ${priority} (${pollInterval}s)`);
  return data;
}

/**
 * Registra un poll completato con successo
 *
 * TEMPORAL SEMANTICS (FILOSOFIA_TEMPORAL_SEMANTICS compliance):
 * - snapshotTime: momento esatto in cui lo snapshot è stato catturato
 * - last_polled_at: quando il poll è stato completato
 *
 * @param {string} sourceEventId - ID evento
 * @param {string} payloadHash - Hash del payload
 * @param {Object} scoreData - Dati punteggio aggiornati
 * @param {Object} scoreData - Dati punteggio aggiornati
 * @returns {Object|null} Record aggiornato
 */
async function recordPollSuccess(sourceEventId, payloadHash, scoreData = {}) {
  if (!checkSupabase()) return null;

  const now = new Date();
  const tracking = await getTracking(sourceEventId);
  if (!tracking) return null;

  const nextPollAt = new Date(now.getTime() + tracking.poll_interval_sec * 1000);

  const updateData = {
    last_polled_at: now.toISOString(),
    next_poll_at: nextPollAt.toISOString(),
    fail_count: 0,
    last_error: null,
    last_error_at: null,
  };

  // Aggiorna hash solo se cambiato
  if (payloadHash && payloadHash !== tracking.last_payload_hash) {
    updateData.last_payload_hash = payloadHash;
    updateData.last_change_at = now.toISOString();
  }

  // Aggiorna dati score se forniti
  if (scoreData.currentScore) {
    updateData.current_score = scoreData.currentScore;
  }
  if (scoreData.matchStatus) {
    updateData.match_status = scoreData.matchStatus;
  }

  const { data, error } = await supabase
    .from('live_tracking')
    .update(updateData)
    .eq('source_event_id', String(sourceEventId))
    .select()
    .single();

  if (error) {
    console.error('❌ Error recording poll success:', error.message);
    return null;
  }

  return data;
}

/**
 * Registra un errore di polling
 * @param {string} sourceEventId - ID evento
 * @param {string} errorMessage - Messaggio errore
 * @returns {Object|null} Record aggiornato
 */
async function recordPollError(sourceEventId, errorMessage) {
  if (!checkSupabase()) return null;

  const tracking = await getTracking(sourceEventId);
  if (!tracking) return null;

  const newFailCount = (tracking.fail_count || 0) + 1;
  const now = new Date();

  // Dopo 5 errori consecutivi → PAUSED
  const newStatus = newFailCount >= 5 ? STATUS.ERROR : tracking.status;

  // Backoff esponenziale per errori (max 5 minuti)
  const backoffMs = Math.min(
    tracking.poll_interval_sec * 1000 * Math.pow(2, newFailCount),
    5 * 60 * 1000
  );
  const nextPollAt = new Date(now.getTime() + backoffMs);

  const { data, error } = await supabase
    .from('live_tracking')
    .update({
      fail_count: newFailCount,
      last_error: errorMessage,
      last_error_at: now.toISOString(),
      status: newStatus,
      next_poll_at: nextPollAt.toISOString(),
    })
    .eq('source_event_id', String(sourceEventId))
    .select()
    .single();

  if (error) {
    console.error('❌ Error recording poll error:', error.message);
    return null;
  }

  if (newStatus === STATUS.ERROR) {
    console.error(`🚨 Tracking ${sourceEventId} marked as ERROR after ${newFailCount} failures`);
  }

  return data;
}

/**
 * Marca un match come finito
 * @param {string} sourceEventId - ID evento
 * @param {number} matchId - ID match consolidato (opzionale)
 * @returns {Object|null} Record aggiornato
 */
async function markFinished(sourceEventId, matchId = null) {
  if (!checkSupabase()) return null;

  const updateData = {
    status: STATUS.FINISHED,
    match_status: 'finished',
  };

  if (matchId) {
    updateData.match_id = matchId;
  }

  const { data, error } = await supabase
    .from('live_tracking')
    .update(updateData)
    .eq('source_event_id', String(sourceEventId))
    .select()
    .single();

  if (error) {
    console.error('❌ Error marking finished:', error.message);
    return null;
  }

  console.log(`🏁 Tracking marked finished: ${sourceEventId}`);
  return data;
}

/**
 * Riprende un tracking in errore/pausa
 * @param {string} sourceEventId - ID evento
 * @returns {Object|null} Record aggiornato
 */
async function resumeTracking(sourceEventId) {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase
    .from('live_tracking')
    .update({
      status: STATUS.WATCHING,
      fail_count: 0,
      last_error: null,
      next_poll_at: new Date().toISOString(),
    })
    .eq('source_event_id', String(sourceEventId))
    .select()
    .single();

  if (error) {
    console.error('❌ Error resuming tracking:', error.message);
    return null;
  }

  console.log(`▶️ Tracking resumed: ${sourceEventId}`);
  return data;
}

// ============================================================================
// SNAPSHOTS
// ============================================================================

/**
 * Salva uno snapshot del payload live
 * @param {string} sourceEventId - ID evento
 * @param {Object} payload - Payload completo
 * @param {string} payloadHash - Hash del payload
 * @returns {Object|null} Snapshot salvato
 */
async function saveSnapshot(sourceEventId, payload, payloadHash) {
  if (!checkSupabase()) return null;

  // Prima trova il tracking_id
  const tracking = await getTracking(sourceEventId);

  const { data, error } = await supabase
    .from('live_snapshots')
    .insert({
      live_tracking_id: tracking?.id || null,
      source_event_id: String(sourceEventId),
      payload,
      payload_hash: payloadHash,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error saving snapshot:', error.message);
    return null;
  }

  return data;
}

/**
 * Ottiene gli ultimi snapshot per un evento
 * @param {string} sourceEventId - ID evento
 * @param {number} limit - Numero massimo
 * @returns {Array} Lista snapshot
 */
async function getSnapshots(sourceEventId, limit = 10) {
  if (!checkSupabase()) return [];

  const { data, error } = await supabase
    .from('live_snapshots')
    .select('*')
    .eq('source_event_id', String(sourceEventId))
    .order('captured_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching snapshots:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Pulisce snapshot vecchi (retention 24h)
 * @returns {number} Numero record eliminati
 */
async function cleanOldSnapshots() {
  if (!checkSupabase()) return 0;

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('live_snapshots')
    .delete()
    .lt('captured_at', cutoff)
    .select('id');

  if (error) {
    console.error('❌ Error cleaning snapshots:', error.message);
    return 0;
  }

  const count = data?.length || 0;
  if (count > 0) {
    console.log(`🧹 Cleaned ${count} old snapshots`);
  }
  return count;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Ottiene statistiche del sistema di tracking
 * @returns {Object} Statistiche
 */
async function getTrackingStats() {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase.from('live_tracking').select('status, priority');

  if (error) {
    console.error('❌ Error fetching stats:', error.message);
    return null;
  }

  const stats = {
    total: data.length,
    byStatus: {},
    byPriority: {},
  };

  data.forEach((row) => {
    stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + 1;
    stats.byPriority[row.priority] = (stats.byPriority[row.priority] || 0) + 1;
  });

  return stats;
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Get latest snapshot for a match (FILOSOFIA_LIVE_TRACKING compliance)
 * @param {string} matchId - Match ID
 * @returns {Promise<Object|null>} Latest snapshot or null
 */
async function getLatestSnapshot(matchId) {
  const snapshots = await getSnapshots(matchId, 1);
  return snapshots && snapshots.length > 0 ? snapshots[0] : null;
}

module.exports = {
  // Constants
  STATUS,
  PRIORITY,
  PRIORITY_INTERVALS,

  // CRUD
  addTracking,
  removeTracking,
  getAllTracking,
  getTracking,
  getTrackingDue,

  // Updates
  updateStatus,
  updatePriority,
  recordPollSuccess,
  recordPollError,
  markFinished,
  resumeTracking,

  // Snapshots
  saveSnapshot,
  getSnapshots,
  getLatestSnapshot, // FILOSOFIA_LIVE_TRACKING
  cleanOldSnapshots,

  // Stats
  getTrackingStats,
};
