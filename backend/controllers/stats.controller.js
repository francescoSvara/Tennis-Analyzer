/**
 * Stats Controller
 * 
 * Controller per statistiche database e metriche.
 * Fornisce metriche su tornei, partite, completezza dati.
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md
 */

const path = require('path');
const fs = require('fs');

// Directory paths
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const SCRAPES_DIR = path.join(DATA_DIR, 'scrapes');

// Lazy load dependencies
let matchRepository = null;
let supabaseClient = null;
let liveManager = null;

function loadDependencies() {
  if (!matchRepository) {
    try { matchRepository = require('../db/matchRepository'); }
    catch (e) { console.warn('⚠️ matchRepository not available for stats'); }
  }
  if (!supabaseClient) {
    try { supabaseClient = require('../db/supabase'); }
    catch (e) { console.warn('⚠️ supabaseClient not available for stats'); }
  }
  if (!liveManager) {
    try { liveManager = require('../liveManager'); }
    catch (e) { console.warn('⚠️ liveManager not available for stats'); }
  }
}

/**
 * GET /api/stats/db - Statistiche complete del database
 * Fornisce metriche su tornei, partite, completezza dati
 * Legge dal database Supabase, con fallback ai file JSON locali
 */
exports.getDbStats = async (req, res) => {
  loadDependencies();
  
  try {
    let dbMatches = [];
    let tournamentStats = [];
    
    // 🚀 OTTIMIZZATO: Carica tornei dalla tabella tournaments
    if (matchRepository && matchRepository.getTournamentsWithStats) {
      try {
        tournamentStats = await matchRepository.getTournamentsWithStats() || [];
        console.log(`📊 DB Stats: Found ${tournamentStats.length} tournaments from DB`);
      } catch (err) {
        console.log('⚠️ getTournamentsWithStats failed:', err.message);
      }
    }
    
    // Carica match per statistiche generali
    if (matchRepository) {
      try {
        dbMatches = await matchRepository.getMatches({ limit: 10000 }) || [];
        console.log(`📊 DB Stats: Found ${dbMatches.length} matches in database`);
      } catch (dbErr) {
        console.log('⚠️ Database query failed, falling back to files:', dbErr.message);
      }
    }
    
    // Fallback a file locali se DB vuoto
    if (dbMatches.length === 0 && fs.existsSync(SCRAPES_DIR)) {
      console.log('📂 DB Stats: Loading from local files...');
      const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(SCRAPES_DIR, file), 'utf8'));
          let eventData = null;
          
          if (content.api) {
            for (const [url, data] of Object.entries(content.api)) {
              if (url.match(/\/api\/v1\/event\/\d+$/) && data?.event) {
                eventData = data.event;
                break;
              }
            }
          }
          
          if (eventData) {
            const sportSlug = eventData.tournament?.category?.sport?.slug || 'tennis';
            const statusType = eventData.status?.type || 'unknown';
            
            dbMatches.push({
              id: eventData.id,
              status_type: statusType,
              start_time: eventData.startTimestamp ? new Date(eventData.startTimestamp * 1000).toISOString() : null,
              created_at: new Date().toISOString(),
              tournament_id: eventData.tournament?.id || eventData.season?.id,
              home_name: eventData.homeTeam?.name || '',
              away_name: eventData.awayTeam?.name || '',
              sport: sportSlug
            });
          }
        } catch (e) { /* skip */ }
      }
      console.log(`📂 DB Stats: Loaded ${dbMatches.length} matches from files`);
    }
    
    // Statistiche generali match
    const matchesByStatus = { finished: 0, inprogress: 0, notstarted: 0, other: 0 };
    const matchesByDay = new Map();
    
    // Processa ogni match per statistiche generali
    for (const match of dbMatches || []) {
      // Status
      const statusType = (match.status_type || 'other').toLowerCase();
      if (matchesByStatus.hasOwnProperty(statusType)) {
        matchesByStatus[statusType]++;
      } else {
        matchesByStatus.other++;
      }
      
      // Per giorno di ACQUISIZIONE
      const acquiredDate = match.created_at;
      if (acquiredDate) {
        const day = new Date(acquiredDate).toISOString().split('T')[0];
        matchesByDay.set(day, (matchesByDay.get(day) || 0) + 1);
      }
    }
    
    // Timeline per giorno (ultimi 30 giorni)
    const timeline = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      timeline.push({
        date: dayStr,
        count: matchesByDay.get(dayStr) || 0
      });
    }
    
    // Acquisizioni recenti (ordinate per created_at)
    const recentAcquisitions = (dbMatches || [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20)
      .map(m => ({
        eventId: m.id,
        acquiredAt: m.created_at,
        tournament: m.tournament?.name || '',
        homeTeam: m.home_player?.name || m.home_name || '',
        awayTeam: m.away_player?.name || m.away_name || '',
        status: m.status_type || 'unknown',
        completeness: 50
      }));
    
    // Partite tracciate (live monitoring)
    let tracked = [];
    if (liveManager && liveManager.getTrackedMatches) {
      tracked = liveManager.getTrackedMatches() || [];
    }
    
    // === CALCOLO DATABASE POWER SCORE ===
    const baseFields = [
      'home_name', 'away_name', 'tournament_id', 'tournament_name',
      'start_time', 'status_type'
    ];
    const resultFields = ['winner_code', 'home_sets_won', 'away_sets_won'];
    const extraFields = ['home_player_id', 'away_player_id', 'round_name', 'surface', 'court_type'];
    
    let matchesWith100Percent = 0;
    let matchesIncomplete = 0;
    let totalFilledFields = 0;
    let totalPossibleFields = 0;
    let detectedCount = 0;
    
    const dataSources = { sofascore: 0, unknown: 0 };
    
    // Analizza ogni match
    for (const match of dbMatches || []) {
      const isFinished = (match.status_type || '').toLowerCase() === 'finished';
      const requiredFields = isFinished ? [...baseFields, ...resultFields] : baseFields;
      
      let filledRequired = 0;
      for (const field of requiredFields) {
        if (match[field] !== null && match[field] !== undefined && match[field] !== '') {
          filledRequired++;
        }
      }
      
      let filledExtra = 0;
      for (const field of extraFields) {
        if (match[field] !== null && match[field] !== undefined && match[field] !== '') {
          filledExtra++;
        }
      }
      
      const totalFieldsForMatch = requiredFields.length + extraFields.length;
      totalFilledFields += filledRequired + filledExtra;
      totalPossibleFields += totalFieldsForMatch;
      
      if (filledRequired === requiredFields.length) {
        matchesWith100Percent++;
      } else {
        matchesIncomplete++;
      }
      
      const isSofascore = match.sofascore_url || match.sofascore_id || 
                          match.data_source === 'sofascore' ||
                          (match.raw_json && typeof match.raw_json === 'string' && match.raw_json.includes('sofascore'));
      
      if (isSofascore) {
        dataSources.sofascore++;
      } else {
        dataSources.unknown++;
      }
    }
    
    // Conta detected matches dal DB
    try {
      if (supabaseClient?.supabase) {
        const detectedResult = await supabaseClient.supabase
          .from('detected_matches')
          .select('*', { count: 'exact', head: true });
        if (detectedResult?.count !== null) {
          detectedCount = detectedResult.count;
        }
      }
      console.log('📊 Detected matches count:', detectedCount);
    } catch (e) {
      console.log('Detected count error:', e.message);
    }
    
    const totalMatches = (dbMatches || []).length;
    
    // === METRICHE POWER SCORE ===
    const targetMatches = 1000;
    const dbSizeScore = Math.min(100, Math.round((totalMatches / targetMatches) * 100));
    const completenessScore = totalMatches > 0 ? Math.round((matchesWith100Percent / totalMatches) * 100) : 0;
    const qualityScore = totalPossibleFields > 0 ? Math.round((totalFilledFields / totalPossibleFields) * 100) : 0;
    const finishedMatches = matchesByStatus.finished || 0;
    const finishedScore = totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0;
    
    const powerScore = Math.round(
      (dbSizeScore * 0.25) +
      (completenessScore * 0.30) +
      (qualityScore * 0.30) +
      (finishedScore * 0.15)
    );
    
    res.json({
      summary: {
        totalMatches,
        totalTournaments: tournamentStats.length,
        powerScore,
        powerDetails: {
          dbSize: { 
            score: dbSizeScore, 
            label: 'Match nel DB', 
            detail: `${totalMatches} totali · ${tournamentStats.length} tornei` 
          },
          completeness: { 
            score: completenessScore, 
            label: 'Dati Completi', 
            detail: `${matchesWith100Percent} completi · ${matchesIncomplete} parziali` 
          },
          quality: { 
            score: qualityScore, 
            label: 'Qualità Dati', 
            detail: `${totalFilledFields}/${totalPossibleFields} campi (${totalMatches > 0 ? Math.round(totalFilledFields/totalMatches) : 0} per match)` 
          },
          finished: { 
            score: finishedScore, 
            label: 'Match Finiti', 
            detail: `${finishedMatches} finiti · ${matchesByStatus.inprogress || 0} live · ${matchesByStatus.notstarted || 0} da giocare` 
          }
        },
        sources: {
          sofascore: dataSources.sofascore,
          unknown: dataSources.unknown
        },
        detected: detectedCount,
        byStatus: matchesByStatus
      },
      tournaments: tournamentStats,
      recentAcquisitions,
      timeline,
      tracking: {
        active: tracked.length,
        matches: tracked
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Error fetching DB stats:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/stats/health - Health check per il database
 */
exports.getHealth = async (req, res) => {
  loadDependencies();
  
  const status = {
    database: 'unknown',
    matchRepository: matchRepository ? 'connected' : 'unavailable',
    supabase: supabaseClient?.supabase ? 'connected' : 'unavailable',
    liveManager: liveManager ? 'available' : 'unavailable'
  };
  
  // Test DB connection
  if (supabaseClient?.supabase) {
    try {
      const { count, error } = await supabaseClient.supabase
        .from('matches')
        .select('*', { count: 'exact', head: true });
      status.database = error ? 'error' : 'connected';
      status.matchCount = count || 0;
    } catch (e) {
      status.database = 'error';
      status.error = e.message;
    }
  }
  
  res.json({
    status: status.database === 'connected' ? 'healthy' : 'degraded',
    components: status,
    timestamp: new Date().toISOString()
  });
};
