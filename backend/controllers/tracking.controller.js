/**
 * Tracking Controller
 * 
 * Controller per live tracking.
 * Zero logica di dominio - delega a liveManager.
 * 
 * @see docs/filosofie/FILOSOFIA_LIVE_TRACKING.md
 */

// Import liveManager functions
const {
  trackMatch,
  untrackMatch,
  getTrackedMatches,
  setMatchPriority,
  resumeMatch,
  getTrackingStats,
  reconcileLiveMatches,
  fetchLiveMatchesList,
  syncMatch,
  startScheduler,
  stopScheduler,
  getStats: getLiveStats,
  USE_DB_TRACKING
} = require('../liveManager');

/**
 * POST /api/track/:eventId - Aggiungi a tracking
 */
exports.track = async (req, res) => {
  const { eventId } = req.params;
  const { status, startTimestamp, priority, player1Name, player2Name, tournamentName } = req.body;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    const tracked = await trackMatch(eventId, { 
      status, 
      startTimestamp, 
      priority: priority || 'MEDIUM',
      player1Name,
      player2Name,
      tournamentName
    });
    res.json({ 
      success: tracked, 
      eventId,
      priority: priority || 'MEDIUM',
      dbMode: USE_DB_TRACKING,
      message: tracked ? 'Match added to tracking' : 'Match already tracked'
    });
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
};

/**
 * DELETE /api/track/:eventId - Rimuovi da tracking
 */
exports.untrack = async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    const removed = await untrackMatch(eventId);
    res.json({ 
      success: removed, 
      eventId,
      message: removed ? 'Match removed from tracking' : 'Match was not tracked'
    });
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
};

/**
 * GET /api/tracked - Lista tracked matches
 */
exports.listTracked = async (req, res) => {
  try {
    const tracked = await getTrackedMatches();
    res.json({ 
      matches: tracked, 
      count: tracked.length,
      dbMode: USE_DB_TRACKING
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/track/:eventId/priority - Cambia priorità
 */
exports.setPriority = async (req, res) => {
  const { eventId } = req.params;
  const { priority } = req.body;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  if (!priority || !['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
    return res.status(400).json({ 
      error: 'Invalid priority. Must be HIGH, MEDIUM, or LOW',
      valid: ['HIGH', 'MEDIUM', 'LOW']
    });
  }
  
  try {
    const success = await setMatchPriority(eventId, priority);
    res.json({ 
      success, 
      eventId,
      priority,
      message: success ? `Priority set to ${priority}` : 'Match not found in tracking'
    });
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
};

/**
 * POST /api/track/:eventId/resume - Riprendi tracking
 */
exports.resume = async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    const success = await resumeMatch(eventId);
    res.json({ 
      success, 
      eventId,
      message: success ? 'Match tracking resumed' : 'Match not found or resume not available'
    });
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
};

/**
 * GET /api/tracking/stats - Statistiche tracking
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await getTrackingStats();
    res.json({
      ...stats,
      dbMode: USE_DB_TRACKING,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/reconcile - Riconciliazione manuale
 */
exports.reconcile = async (req, res) => {
  try {
    console.log('🔄 Manual reconciliation requested...');
    const result = await reconcileLiveMatches();
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
};

/**
 * GET /api/live/discover - Scopri match live
 */
exports.discover = async (req, res) => {
  try {
    const liveMatches = await fetchLiveMatchesList();
    const tracked = await getTrackedMatches();
    const trackedIds = new Set(tracked.map(t => t.eventId));
    
    const matchesWithStatus = liveMatches.map(m => ({
      id: m.id,
      homeTeam: m.homeTeam?.name,
      awayTeam: m.awayTeam?.name,
      tournament: m.tournament?.name,
      round: m.roundInfo?.name,
      score: {
        home: m.homeScore?.current,
        away: m.awayScore?.current
      },
      status: m.status?.type,
      isTracked: trackedIds.has(String(m.id))
    }));
    
    res.json({
      count: matchesWithStatus.length,
      trackedCount: matchesWithStatus.filter(m => m.isTracked).length,
      matches: matchesWithStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/live/status - Status sistema live
 */
exports.getStatus = async (req, res) => {
  try {
    const wsStats = getLiveStats();
    const tracked = await getTrackedMatches();
    const trackingStats = await getTrackingStats();
    
    res.json({
      websocket: wsStats,
      tracking: {
        matches: tracked,
        count: tracked.length,
        stats: trackingStats
      },
      dbMode: USE_DB_TRACKING,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/live/stats - Stats WebSocket
 */
exports.getLiveStats = (req, res) => {
  res.json(getLiveStats());
};

/**
 * POST /api/scheduler/start - Avvia scheduler
 */
exports.startScheduler = (req, res) => {
  startScheduler();
  res.json({ success: true, message: 'Scheduler started' });
};

/**
 * POST /api/scheduler/stop - Ferma scheduler
 */
exports.stopScheduler = (req, res) => {
  stopScheduler();
  res.json({ success: true, message: 'Scheduler stopped' });
};
