/**
 * Match Controller
 * 
 * Controller per match singoli e bundle.
 * Zero logica di dominio - delega a services e repositories.
 * 
 * FILOSOFIA MATCHBUNDLE_ONLY_FE:
 * Il bundle è l'unica interfaccia Frontend ↔ Backend
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md
 */

const path = require('path');
const fs = require('fs');

// Directory paths
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const SCRAPES_DIR = path.join(DATA_DIR, 'scrapes');

// Lazy load dependencies to avoid circular imports
let matchRepository = null;
let supabaseClient = null;
let matchCardService = null;
let liveManager = null;
let bundleService = null;

// Load dependencies
try {
  matchRepository = require('../db/matchRepository');
} catch (e) {
  console.warn('⚠️ matchRepository not available');
}

try {
  supabaseClient = require('../db/supabase');
} catch (e) {
  console.warn('⚠️ supabaseClient not available');
}

try {
  matchCardService = require('../services/matchCardService');
} catch (e) {
  console.warn('⚠️ matchCardService not available');
}

try {
  liveManager = require('../liveManager');
} catch (e) {
  console.warn('⚠️ liveManager not available');
}

try {
  bundleService = require('../services/bundleService');
} catch (e) {
  console.warn('⚠️ bundleService not available - will fallback to server.js logic');
}

/**
 * GET /api/match/:eventId/bundle - UNIFIED MATCH BUNDLE
 * 
 * Single endpoint that returns ALL data needed for MatchPage.
 * Frontend does NOT compute - just displays this pre-computed state.
 * 
 * FILOSOFIA: SofaScore → DB → Frontend (mai fetch diretto nel bundle)
 */
exports.getBundle = async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    // Se bundleService è disponibile, usalo
    if (bundleService) {
      const bundle = await bundleService.buildBundle(parseInt(eventId));
      if (!bundle) {
        return res.status(404).json({ error: 'Match not found' });
      }
      return res.json(bundle);
    }
    
    // Fallback: redirect alla logica esistente in server.js
    // Questo verrà rimosso quando bundleService sarà completo
    return res.status(503).json({ 
      error: 'Bundle service not available',
      hint: 'Bundle logic is still in server.js during migration'
    });
    
  } catch (err) {
    console.error(`Error building bundle for ${eventId}:`, err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/match/:eventId - Dati match (ibrido: DB → File → SofaScore)
 */
exports.getMatch = async (req, res) => {
  const { eventId } = req.params;
  const { forceRefresh } = req.query;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    // 1. Prova prima dal database
    if (matchRepository && !forceRefresh) {
      try {
        const dbMatch = await matchRepository.getMatchById(parseInt(eventId));
        if (dbMatch) {
          console.log(`📦 Match ${eventId} served from database`);
          return res.json({
            source: 'database',
            eventId,
            ...dbMatch,
            timestamp: new Date().toISOString()
          });
        }
      } catch (dbErr) {
        console.log(`⚠️ DB fetch failed for ${eventId}:`, dbErr.message);
      }
    }
    
    // 2. Prova dai file salvati
    if (!forceRefresh && fs.existsSync(SCRAPES_DIR)) {
      const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(SCRAPES_DIR, file), 'utf8'));
          if (content.api) {
            for (const [url, data] of Object.entries(content.api)) {
              if (url.includes(`/event/${eventId}`) || data?.event?.id === parseInt(eventId)) {
                console.log(`📁 Match ${eventId} served from file ${file}`);
                return res.json({
                  source: 'file',
                  eventId,
                  fileName: file,
                  api: content.api,
                  liveData: content.liveData,
                  lastSync: content.lastSync,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        } catch (e) { /* skip */ }
      }
    }
    
    // 3. Fetch da SofaScore via liveManager
    if (liveManager) {
      console.log(`🌐 Match ${eventId} fetching from SofaScore...`);
      const liveData = await liveManager.fetchCompleteData(eventId);
      
      return res.json({
        source: 'sofascore',
        eventId,
        ...liveData,
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(404).json({ error: 'Match not found' });
    
  } catch (err) {
    console.error(`Error fetching match ${eventId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/matches/search - Ricerca con filtri
 */
exports.search = async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    const {
      status,
      tournamentId,
      tournamentCategory,
      playerSearch,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;
    
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (pageNum - 1) * limitNum;
    
    const totalCount = await matchRepository.countMatches({
      status,
      tournamentId: tournamentId ? parseInt(tournamentId, 10) : undefined,
      tournamentCategory,
      playerSearch,
      dateFrom,
      dateTo
    });
    
    const matches = await matchRepository.getMatches({
      status,
      tournamentId: tournamentId ? parseInt(tournamentId, 10) : undefined,
      tournamentCategory,
      playerSearch,
      dateFrom,
      dateTo,
      limit: limitNum,
      offset
    });
    
    res.json({
      matches: matches.map(m => transformMatch(m)),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNext: pageNum * limitNum < totalCount,
        hasPrev: pageNum > 1
      }
    });
    
  } catch (err) {
    console.error('Error searching matches:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/matches/tournaments - Lista tornei per filtro
 */
exports.getTournaments = async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    const tournaments = await matchRepository.getDistinctTournaments();
    res.json({ tournaments });
  } catch (err) {
    console.error('Error fetching tournaments:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/matches/db - Lista match dal database
 */
exports.getFromDb = async (req, res) => {
  if (!supabaseClient?.supabase) {
    return res.status(503).json({ error: 'Database not available', matches: [] });
  }
  
  try {
    const { limit = 20, search, surface, series, dateFrom, dateTo } = req.query;
    const limitNum = parseInt(limit);
    
    let query = supabaseClient.supabase
      .from('v_matches_with_players')
      .select(`
        id, player1_name, player2_name, player1_rank, player2_rank,
        set1_p1, set1_p2, set2_p1, set2_p2, set3_p1, set3_p2,
        surface, round, tournament_name, tournament_category,
        start_timestamp, best_of, winner_code, status, data_quality
      `)
      .not('player1_name', 'is', null)
      .not('player2_name', 'is', null);
    
    if (search?.trim()) {
      const term = search.trim().toLowerCase();
      query = query.or(`player1_name.ilike.%${term}%,player2_name.ilike.%${term}%`);
    }
    if (surface) query = query.ilike('surface', `%${surface}%`);
    if (series) query = query.or(`tournament_name.ilike.%${series}%,tournament_category.ilike.%${series}%`);
    if (dateFrom) query = query.gte('start_timestamp', new Date(dateFrom).getTime() / 1000);
    if (dateTo) query = query.lte('start_timestamp', new Date(dateTo).getTime() / 1000);
    
    query = query.order('start_timestamp', { ascending: false }).limit(limitNum);
    
    const { data, error } = await query;
    if (error) throw error;
    
    const matches = (data || []).map(m => {
      const sets = [];
      if (m.set1_p1 != null) sets.push(`${m.set1_p1}-${m.set1_p2}`);
      if (m.set2_p1 != null) sets.push(`${m.set2_p1}-${m.set2_p2}`);
      if (m.set3_p1 != null) sets.push(`${m.set3_p1}-${m.set3_p2}`);
      
      return {
        id: m.id,
        eventId: m.id,
        homePlayer: m.player1_name,
        awayPlayer: m.player2_name,
        homeRank: m.player1_rank,
        awayRank: m.player2_rank,
        tournament: m.tournament_name || m.tournament_category,
        surface: m.surface || 'Unknown',
        status: m.status || 'finished',
        score: sets.join(', ') || null,
        date: m.start_timestamp ? new Date(m.start_timestamp * 1000).toISOString() : null,
        winnerCode: m.winner_code,
        source: 'sofascore',
        dataQuality: m.data_quality || 50
      };
    });
    
    res.json({ matches, count: matches.length, hasSearch: !!search?.trim() });
    
  } catch (err) {
    console.error('Error in /api/matches/db:', err);
    res.status(500).json({ error: err.message, matches: [] });
  }
};

/**
 * GET /api/matches - Lista match da file (legacy)
 */
exports.listFromFiles = async (req, res) => {
  try {
    const { sport } = req.query;
    
    if (!fs.existsSync(SCRAPES_DIR)) {
      return res.json({ matches: [], count: 0 });
    }
    
    const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
    const matches = [];
    const seenEventIds = new Set();
    
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
        
        if (eventData && !seenEventIds.has(String(eventData.id))) {
          seenEventIds.add(String(eventData.id));
          const sportSlug = eventData.tournament?.category?.sport?.slug || 'unknown';
          
          if (sport && sportSlug !== sport) continue;
          
          matches.push({
            id: file.replace('.json', ''),
            eventId: eventData.id,
            sport: sportSlug,
            tournament: eventData.tournament?.uniqueTournament?.name || eventData.tournament?.name || '',
            homeTeam: {
              name: eventData.homeTeam?.name || '',
              ranking: eventData.homeTeam?.ranking || null
            },
            awayTeam: {
              name: eventData.awayTeam?.name || '',
              ranking: eventData.awayTeam?.ranking || null
            },
            status: eventData.status,
            startTimestamp: eventData.startTimestamp,
            winnerCode: eventData.winnerCode
          });
        }
      } catch (e) { /* skip */ }
    }
    
    matches.sort((a, b) => (a.startTimestamp || 0) - (b.startTimestamp || 0));
    res.json({ matches, count: matches.length });
    
  } catch (err) {
    console.error('Error fetching matches:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/suggested-matches - Match suggeriti
 * Estrae partite correlate da H2H e form, poi cerca in tornei esistenti
 */
exports.getSuggested = async (req, res) => {
  try {
    if (!fs.existsSync(SCRAPES_DIR)) {
      return res.json({ matches: [], count: 0, sources: { related: 0, tournament: 0 } });
    }
    
    const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
    const existingEventIds = new Set();
    const tournamentIds = new Set();
    const relatedMatchesMap = new Map();
    
    // Prima pass: raccogli tutti gli eventId esistenti, tournamentId e partite correlate
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(SCRAPES_DIR, file), 'utf8'));
        if (content.api) {
          let currentEventId = null;
          
          for (const [url, data] of Object.entries(content.api)) {
            if (url.match(/\/api\/v1\/event\/\d+$/) && data?.event) {
              currentEventId = data.event.id;
              existingEventIds.add(String(data.event.id));
              if (data.event.tournament?.uniqueTournament?.id) {
                tournamentIds.add(data.event.tournament.uniqueTournament.id);
              }
            }
          }
          
          // Estrai partite correlate da H2H e pregame-form
          if (currentEventId) {
            const related = extractRelatedMatches(content.api, currentEventId);
            for (const match of related) {
              if (!existingEventIds.has(String(match.eventId)) && !relatedMatchesMap.has(String(match.eventId))) {
                relatedMatchesMap.set(String(match.eventId), match);
              }
            }
          }
        }
      } catch (e) { /* skip */ }
    }
    
    // Converti partite correlate in array con formato corretto
    const relatedMatches = Array.from(relatedMatchesMap.values()).map(match => ({
      eventId: match.eventId,
      sport: match.tournament?.category?.sport?.slug || 'tennis',
      sportName: match.tournament?.category?.sport?.name || 'Tennis',
      tournament: match.tournament?.uniqueTournament?.name || match.tournament?.name || '',
      category: match.tournament?.category?.name || '',
      homeTeam: {
        name: match.homeTeam?.name || '',
        shortName: match.homeTeam?.shortName || '',
        country: match.homeTeam?.country?.alpha2 || '',
        ranking: match.homeTeam?.ranking || null
      },
      awayTeam: {
        name: match.awayTeam?.name || '',
        shortName: match.awayTeam?.shortName || '',
        country: match.awayTeam?.country?.alpha2 || '',
        ranking: match.awayTeam?.ranking || null
      },
      homeScore: match.homeScore || null,
      awayScore: match.awayScore || null,
      status: match.status || null,
      startTimestamp: match.startTimestamp || null,
      winnerCode: match.winnerCode || null,
      isSuggested: true,
      suggestedFrom: match.type
    }));
    
    // Fetch partite dai tornei trovati (opzionale)
    const suggestedMatches = [...relatedMatches];
    
    if (relatedMatches.length < 20) {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.sofascore.com/'
      };
      
      for (const tournamentId of [...tournamentIds].slice(0, 3)) {
        try {
          const response = await fetch(
            `https://api.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${new Date().getFullYear()}/events/last/0`,
            { headers }
          );
          if (response.ok) {
            const data = await response.json();
            if (data.events) {
              for (const event of data.events) {
                if (!existingEventIds.has(String(event.id)) && !relatedMatchesMap.has(String(event.id))) {
                  suggestedMatches.push({
                    eventId: event.id,
                    sport: event.tournament?.category?.sport?.slug || 'tennis',
                    sportName: event.tournament?.category?.sport?.name || 'Tennis',
                    tournament: event.tournament?.uniqueTournament?.name || event.tournament?.name || '',
                    category: event.tournament?.category?.name || '',
                    homeTeam: {
                      name: event.homeTeam?.name || '',
                      shortName: event.homeTeam?.shortName || '',
                      country: event.homeTeam?.country?.alpha2 || '',
                      ranking: event.homeTeam?.ranking || null
                    },
                    awayTeam: {
                      name: event.awayTeam?.name || '',
                      shortName: event.awayTeam?.shortName || '',
                      country: event.awayTeam?.country?.alpha2 || '',
                      ranking: event.awayTeam?.ranking || null
                    },
                    status: event.status || null,
                    startTimestamp: event.startTimestamp || null,
                    isSuggested: true,
                    suggestedFrom: 'tournament'
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error(`Error fetching tournament ${tournamentId}:`, e.message);
        }
      }
    }
    
    // Ordina per data (più recenti prima)
    suggestedMatches.sort((a, b) => (b.startTimestamp || 0) - (a.startTimestamp || 0));
    
    res.json({ 
      matches: suggestedMatches.slice(0, 50), 
      count: suggestedMatches.length,
      sources: {
        related: relatedMatches.length,
        tournament: suggestedMatches.length - relatedMatches.length
      }
    });
  } catch (err) {
    console.error('Error fetching suggested matches:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Helper: Extract related matches from API data (H2H, form)
 */
function extractRelatedMatches(apiData, currentEventId) {
  const relatedMatches = [];
  const seenIds = new Set([String(currentEventId)]);
  
  if (!apiData) return relatedMatches;
  
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

/**
 * GET /api/detected-matches - Match rilevati
 */
exports.getDetected = async (req, res) => {
  if (!supabaseClient?.supabase) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    const { data, error, count } = await supabaseClient.supabase
      .from('detected_matches')
      .select('*', { count: 'exact' })
      .eq('is_acquired', false)
      .order('start_time', { ascending: true })
      .limit(100);
    
    if (error) throw error;
    
    const matches = (data || []).map(m => ({
      eventId: m.id,
      homeTeam: { name: m.home_team_name },
      awayTeam: { name: m.away_team_name },
      tournament: { name: m.tournament_name },
      status: m.status,
      startTimestamp: m.start_time ? new Date(m.start_time).getTime() / 1000 : null,
      isDetected: true
    }));
    
    res.json({ matches, count: matches.length, totalCount: count || matches.length });
    
  } catch (err) {
    console.error('Error fetching detected matches:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/tournament/:tournamentId/events
 */
exports.getTournamentEvents = async (req, res) => {
  const { tournamentId } = req.params;
  const { seasonId } = req.query;
  
  try {
    const existingMatches = [];
    
    if (matchRepository) {
      const dbMatches = await matchRepository.getMatches({ 
        tournamentId: seasonId || tournamentId, 
        limit: 1000 
      });
      
      (dbMatches || []).forEach(m => {
        existingMatches.push({
          eventId: m.id,
          homeTeam: m.home_name || '',
          awayTeam: m.away_name || '',
          status: m.status_type || 'unknown',
          startTimestamp: m.start_time ? Math.floor(new Date(m.start_time).getTime() / 1000) : null,
          winnerCode: m.winner_code
        });
      });
    }
    
    res.json({
      tournamentId,
      seasonId: seasonId || tournamentId,
      events: existingMatches,
      stats: { total: existingMatches.length, inDatabase: existingMatches.length }
    });
    
  } catch (err) {
    console.error(`Error fetching tournament ${tournamentId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/sync/:eventId - Sync manuale
 */
exports.syncMatch = async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  if (!liveManager) {
    return res.status(503).json({ error: 'Live manager not available' });
  }
  
  try {
    const result = await liveManager.syncMatch(eventId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
};

/**
 * POST /api/sync-match/:eventId - Sync completo
 */
exports.syncMatchFull = async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  if (!liveManager) {
    return res.status(503).json({ error: 'Live manager not available' });
  }
  
  try {
    const completeData = await liveManager.fetchCompleteData(eventId);
    
    res.json({ 
      success: true, 
      message: 'Dati recuperati',
      data: completeData,
      dataCompleteness: completeData.dataCompleteness
    });
  } catch (err) {
    console.error(`Sync error for event ${eventId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/check-data/:eventId - Verifica completezza
 */
exports.checkData = async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    // Check in files
    if (!fs.existsSync(SCRAPES_DIR)) {
      return res.json({ found: false, message: 'No scrapes directory' });
    }
    
    const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(SCRAPES_DIR, file), 'utf8'));
        if (content.api) {
          for (const [url, data] of Object.entries(content.api)) {
            if (url.includes(`/event/${eventId}`) || data?.event?.id === parseInt(eventId)) {
              const completeness = {
                event: false,
                pointByPoint: false,
                statistics: false,
                powerRankings: false
              };
              
              for (const [u, d] of Object.entries(content.api)) {
                if (u.includes('/event/') && d?.event) completeness.event = true;
                if (u.includes('point-by-point') && d?.pointByPoint?.length > 0) completeness.pointByPoint = true;
                if (u.includes('statistics') && d?.statistics?.length > 0) completeness.statistics = true;
                if (u.includes('power-rankings') && d?.tennisPowerRankings?.length > 0) completeness.powerRankings = true;
              }
              
              const fields = Object.values(completeness);
              completeness.total = Math.round((fields.filter(Boolean).length / fields.length) * 100);
              
              return res.json({
                found: true,
                fileName: file,
                dataCompleteness: completeness
              });
            }
          }
        }
      } catch (e) { /* skip */ }
    }
    
    res.json({ found: false, message: 'Match non trovato nei dati salvati' });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper function
function transformMatch(m) {
  return {
    eventId: m.id,
    homeTeam: m.home_name || 'Unknown',
    awayTeam: m.away_name || 'Unknown',
    tournament: m.tournament_name || 'Unknown',
    status: m.status_type || 'unknown',
    startTime: m.start_time,
    winnerCode: m.winner_code
  };
}
