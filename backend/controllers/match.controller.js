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
 * Helper: Resolve sofascore_id to internal DB match_id
 * Il frontend passa sempre sofascore_id, ma il DB usa id interno
 */
async function resolveToInternalId(eventId) {
  if (!matchRepository?.resolveMatchId) return parseInt(eventId);
  const internalId = await matchRepository.resolveMatchId(parseInt(eventId));
  return internalId || parseInt(eventId);
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
  const { forceRefresh } = req.query;

  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }

  try {
    // Se bundleService è disponibile, usalo
    if (bundleService) {
      const bundle = await bundleService.buildBundle(parseInt(eventId), { 
        forceRefresh: forceRefresh === 'true' 
      });
      if (!bundle) {
        return res.status(404).json({ error: 'Match not found' });
      }
      return res.json(bundle);
    }

    // Fallback: redirect alla logica esistente in server.js
    // Questo verrà rimosso quando bundleService sarà completo
    return res.status(503).json({
      error: 'Bundle service not available',
      hint: 'Bundle logic is still in server.js during migration',
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
            timestamp: new Date().toISOString(),
          });
        }
      } catch (dbErr) {
        console.log(`⚠️ DB fetch failed for ${eventId}:`, dbErr.message);
      }
    }

    // 2. Prova dai file salvati
    if (!forceRefresh && fs.existsSync(SCRAPES_DIR)) {
      const files = fs.readdirSync(SCRAPES_DIR).filter((f) => f.endsWith('.json'));
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
                  timestamp: new Date().toISOString(),
                });
              }
            }
          }
        } catch (e) {
          /* skip */
        }
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
        timestamp: new Date().toISOString(),
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
      limit = 20,
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
      dateTo,
    });

    const matches = await matchRepository.getMatches({
      status,
      tournamentId: tournamentId ? parseInt(tournamentId, 10) : undefined,
      tournamentCategory,
      playerSearch,
      dateFrom,
      dateTo,
      limit: limitNum,
      offset,
    });

    res.json({
      matches: matches.map((m) => transformMatch(m)),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNext: pageNum * limitNum < totalCount,
        hasPrev: pageNum > 1,
      },
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
 * 
 * FILOSOFIA: Single Query - SOLO DB, zero chiamate esterne
 */
exports.getFromDb = async (req, res) => {
  if (!supabaseClient?.supabase) {
    return res.status(503).json({ error: 'Database not available', matches: [] });
  }

  try {
    const { limit = 20, search, surface, dateFrom, dateTo } = req.query;
    const limitNum = parseInt(limit);

    // SOLO DB - nessuna chiamata esterna
    let query = supabaseClient.supabase
      .from('matches')
      .select(
        `
        id, status, surface, round, best_of, winner_code, start_timestamp, score,
        set1_p1, set1_p2, set2_p1, set2_p2, set3_p1, set3_p2, set4_p1, set4_p2, set5_p1, set5_p2,
        player1:player1_id(id, name, full_name, country_code, current_ranking),
        player2:player2_id(id, name, full_name, country_code, current_ranking),
        tournament:tournament_id(id, name, category)
      `
      )
      .not('player1_id', 'is', null)
      .not('player2_id', 'is', null);

    if (surface) query = query.ilike('surface', `%${surface}%`);
    if (dateFrom) query = query.gte('start_timestamp', new Date(dateFrom).getTime() / 1000);
    if (dateTo) query = query.lte('start_timestamp', new Date(dateTo).getTime() / 1000);

    query = query.order('start_timestamp', { ascending: false }).limit(search?.trim() ? 500 : limitNum);

    const { data, error } = await query;
    if (error) throw error;

    // Transform DB data
    let matches = (data || []).map((m) => {
      const sets = [];
      if (m.set1_p1 != null) sets.push(`${m.set1_p1}-${m.set1_p2}`);
      if (m.set2_p1 != null) sets.push(`${m.set2_p1}-${m.set2_p2}`);
      if (m.set3_p1 != null) sets.push(`${m.set3_p1}-${m.set3_p2}`);
      if (m.set4_p1 != null) sets.push(`${m.set4_p1}-${m.set4_p2}`);
      if (m.set5_p1 != null) sets.push(`${m.set5_p1}-${m.set5_p2}`);

      const setsData = [];
      if (m.set1_p1 != null) setsData.push({ home: m.set1_p1, away: m.set1_p2 });
      if (m.set2_p1 != null) setsData.push({ home: m.set2_p1, away: m.set2_p2 });
      if (m.set3_p1 != null) setsData.push({ home: m.set3_p1, away: m.set3_p2 });
      if (m.set4_p1 != null) setsData.push({ home: m.set4_p1, away: m.set4_p2 });
      if (m.set5_p1 != null) setsData.push({ home: m.set5_p1, away: m.set5_p2 });

      const player1Name = m.player1?.name || m.player1?.full_name || 'Player 1';
      const player2Name = m.player2?.name || m.player2?.full_name || 'Player 2';

      return {
        id: m.id,
        eventId: m.id,
        sofascoreId: m.id,
        homePlayer: player1Name,
        awayPlayer: player2Name,
        homeRank: m.player1?.current_ranking,
        awayRank: m.player2?.current_ranking,
        tournament: m.tournament?.name || m.tournament?.category,
        tournamentName: m.tournament?.name || '',
        tournamentCategory: m.tournament?.category || '',
        surface: m.surface || 'Unknown',
        status: m.status || 'finished',
        score: sets.join(', ') || null,
        setsData: setsData,
        date: m.start_timestamp ? new Date(m.start_timestamp * 1000).toISOString() : null,
        winnerCode: m.winner_code,
        source: 'database',
        dataQuality: 50,
      };
    });

    // Apply search filter
    if (search?.trim()) {
      const term = search.trim().toLowerCase();
      matches = matches.filter(m => 
        m.homePlayer?.toLowerCase().includes(term) || 
        m.awayPlayer?.toLowerCase().includes(term)
      ).slice(0, limitNum);
    }

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

    const files = fs.readdirSync(SCRAPES_DIR).filter((f) => f.endsWith('.json'));
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
            tournament:
              eventData.tournament?.uniqueTournament?.name || eventData.tournament?.name || '',
            homeTeam: {
              name: eventData.homeTeam?.name || '',
              ranking: eventData.homeTeam?.ranking || null,
            },
            awayTeam: {
              name: eventData.awayTeam?.name || '',
              ranking: eventData.awayTeam?.ranking || null,
            },
            status: eventData.status,
            startTimestamp: eventData.startTimestamp,
            winnerCode: eventData.winnerCode,
          });
        }
      } catch (e) {
        /* skip */
      }
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

    const files = fs.readdirSync(SCRAPES_DIR).filter((f) => f.endsWith('.json'));
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
              if (
                !existingEventIds.has(String(match.eventId)) &&
                !relatedMatchesMap.has(String(match.eventId))
              ) {
                relatedMatchesMap.set(String(match.eventId), match);
              }
            }
          }
        }
      } catch (e) {
        /* skip */
      }
    }

    // Converti partite correlate in array con formato corretto
    const relatedMatches = Array.from(relatedMatchesMap.values()).map((match) => ({
      eventId: match.eventId,
      sport: match.tournament?.category?.sport?.slug || 'tennis',
      sportName: match.tournament?.category?.sport?.name || 'Tennis',
      tournament: match.tournament?.uniqueTournament?.name || match.tournament?.name || '',
      category: match.tournament?.category?.name || '',
      homeTeam: {
        name: match.homeTeam?.name || '',
        shortName: match.homeTeam?.shortName || '',
        country: match.homeTeam?.country?.alpha2 || '',
        ranking: match.homeTeam?.ranking || null,
      },
      awayTeam: {
        name: match.awayTeam?.name || '',
        shortName: match.awayTeam?.shortName || '',
        country: match.awayTeam?.country?.alpha2 || '',
        ranking: match.awayTeam?.ranking || null,
      },
      homeScore: match.homeScore || null,
      awayScore: match.awayScore || null,
      status: match.status || null,
      startTimestamp: match.startTimestamp || null,
      winnerCode: match.winnerCode || null,
      isSuggested: true,
      suggestedFrom: match.type,
    }));

    // Fetch partite dai tornei trovati (opzionale)
    const suggestedMatches = [...relatedMatches];

    if (relatedMatches.length < 20) {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
        Referer: 'https://www.sofascore.com/',
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
                if (
                  !existingEventIds.has(String(event.id)) &&
                  !relatedMatchesMap.has(String(event.id))
                ) {
                  suggestedMatches.push({
                    eventId: event.id,
                    sport: event.tournament?.category?.sport?.slug || 'tennis',
                    sportName: event.tournament?.category?.sport?.name || 'Tennis',
                    tournament:
                      event.tournament?.uniqueTournament?.name || event.tournament?.name || '',
                    category: event.tournament?.category?.name || '',
                    homeTeam: {
                      name: event.homeTeam?.name || '',
                      shortName: event.homeTeam?.shortName || '',
                      country: event.homeTeam?.country?.alpha2 || '',
                      ranking: event.homeTeam?.ranking || null,
                    },
                    awayTeam: {
                      name: event.awayTeam?.name || '',
                      shortName: event.awayTeam?.shortName || '',
                      country: event.awayTeam?.country?.alpha2 || '',
                      ranking: event.awayTeam?.ranking || null,
                    },
                    status: event.status || null,
                    startTimestamp: event.startTimestamp || null,
                    isSuggested: true,
                    suggestedFrom: 'tournament',
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
        tournament: suggestedMatches.length - relatedMatches.length,
      },
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
            winnerCode: event.winnerCode,
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
              winnerCode: event.winnerCode,
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

    const matches = (data || []).map((m) => ({
      eventId: m.id,
      homeTeam: { name: m.home_team_name },
      awayTeam: { name: m.away_team_name },
      tournament: { name: m.tournament_name },
      status: m.status,
      startTimestamp: m.start_time ? new Date(m.start_time).getTime() / 1000 : null,
      isDetected: true,
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
        limit: 1000,
      });

      (dbMatches || []).forEach((m) => {
        existingMatches.push({
          eventId: m.id,
          homeTeam: m.home_name || '',
          awayTeam: m.away_name || '',
          status: m.status_type || 'unknown',
          startTimestamp: m.start_time ? Math.floor(new Date(m.start_time).getTime() / 1000) : null,
          winnerCode: m.winner_code,
        });
      });
    }

    res.json({
      tournamentId,
      seasonId: seasonId || tournamentId,
      events: existingMatches,
      stats: { total: existingMatches.length, inDatabase: existingMatches.length },
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
      dataCompleteness: completeData.dataCompleteness,
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

    const files = fs.readdirSync(SCRAPES_DIR).filter((f) => f.endsWith('.json'));

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
                powerRankings: false,
              };

              for (const [u, d] of Object.entries(content.api)) {
                if (u.includes('/event/') && d?.event) completeness.event = true;
                if (u.includes('point-by-point') && d?.pointByPoint?.length > 0)
                  completeness.pointByPoint = true;
                if (u.includes('statistics') && d?.statistics?.length > 0)
                  completeness.statistics = true;
                if (u.includes('power-rankings') && d?.tennisPowerRankings?.length > 0)
                  completeness.powerRankings = true;
              }

              const fields = Object.values(completeness);
              completeness.total = Math.round(
                (fields.filter(Boolean).length / fields.length) * 100
              );

              return res.json({
                found: true,
                fileName: file,
                dataCompleteness: completeness,
              });
            }
          }
        }
      } catch (e) {
        /* skip */
      }
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
    winnerCode: m.winner_code,
  };
}

// ============================================================================
// ADDITIONAL MATCH ENDPOINTS
// ============================================================================

/**
 * GET /api/match/:eventId/refresh - Force refresh from SofaScore
 */
exports.refresh = async (req, res) => {
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
 * GET /api/match/:eventId/card - Card completa del match
 */
exports.getCard = async (req, res) => {
  const { eventId } = req.params;
  const { useSnapshot = 'true' } = req.query;

  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }

  try {
    // Resolve sofascore_id to internal DB match_id
    const dbMatchId = await resolveToInternalId(eventId);
    
    // Try snapshot first
    if (useSnapshot === 'true' && matchRepository) {
      const snapshot = await matchRepository.getMatchCardSnapshot(dbMatchId);

      if (snapshot) {
        return res.json({
          match: snapshot.core_json,
          tournament: snapshot.core_json?.tournament,
          player1: snapshot.players_json?.player1,
          player2: snapshot.players_json?.player2,
          h2h: snapshot.h2h_json,
          statistics: snapshot.stats_json,
          momentum: snapshot.momentum_json,
          odds: snapshot.odds_json,
          dataSources: snapshot.data_sources_json?.map((s) => s.source_type) || [],
          dataQuality: snapshot.data_quality_int,
          fromSnapshot: true,
          snapshotUpdatedAt: snapshot.last_updated_at,
          internalId: dbMatchId,
        });
      }
    }

    // Fallback to traditional service
    if (!matchCardService) {
      return res.status(503).json({ error: 'Match Card Service not available' });
    }

    const card = await matchCardService.getMatchCard(dbMatchId);

    if (!card) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({ ...card, fromSnapshot: false });
  } catch (err) {
    console.error('Error getting match card:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/match/:eventId/momentum - Power rankings
 */
exports.getMomentum = async (req, res) => {
  const { eventId } = req.params;

  if (!eventId || !matchRepository) {
    return res.status(400).json({ error: 'Missing eventId or repository not available' });
  }

  try {
    // Resolve sofascore_id to internal match_id
    const internalMatchId = await matchRepository.resolveMatchId(parseInt(eventId));
    const dbMatchId = internalMatchId || parseInt(eventId);
    
    const momentum = await matchRepository.getMatchMomentum(dbMatchId);
    res.json({ matchId: eventId, internalId: dbMatchId, momentum, count: momentum.length });
  } catch (err) {
    console.error('Error getting momentum:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/match/:eventId/momentum-svg - Save momentum from SVG
 */
exports.saveMomentumSvg = async (req, res) => {
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

    if (svgHtml && !powerRankings) {
      const { processSvgMomentum } = require('../utils/svgMomentumExtractor');
      const result = processSvgMomentum(svgHtml);

      if (!result.ok) {
        return res.status(400).json({ error: result.error || 'Failed to extract SVG data' });
      }
      rankings = result.powerRankings;
    }

    if (!rankings || rankings.length === 0) {
      return res.status(400).json({ error: 'No power rankings data extracted' });
    }

    const dbMatchId = await resolveToInternalId(eventId);
    await matchRepository.updateMomentum(dbMatchId, rankings);
    res.json({ success: true, matchId: eventId, internalId: dbMatchId, count: rankings.length });
  } catch (err) {
    console.error('Error saving momentum:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/match/:eventId/statistics - Match statistics
 */
exports.getStatistics = async (req, res) => {
  const { eventId } = req.params;

  if (!eventId || !matchRepository) {
    return res.status(400).json({ error: 'Missing eventId or repository not available' });
  }

  try {
    const dbMatchId = await resolveToInternalId(eventId);
    const statistics = await matchRepository.getMatchStatisticsNew(dbMatchId);
    res.json({ matchId: eventId, internalId: dbMatchId, statistics });
  } catch (err) {
    console.error('Error getting statistics:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/match/:eventId/odds - Match odds
 */
exports.getOdds = async (req, res) => {
  const { eventId } = req.params;

  if (!eventId || !matchRepository) {
    return res.status(400).json({ error: 'Missing eventId or repository not available' });
  }

  try {
    const dbMatchId = await resolveToInternalId(eventId);
    const odds = await matchRepository.getMatchOdds(dbMatchId);
    res.json({ matchId: eventId, internalId: dbMatchId, odds });
  } catch (err) {
    console.error('Error getting odds:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/match/:eventId/points - Point-by-point data
 */
exports.getPoints = async (req, res) => {
  const { eventId } = req.params;
  const { offset = 0, limit = 500 } = req.query;

  if (!eventId || !matchRepository) {
    return res.status(400).json({ error: 'Missing eventId or repository not available' });
  }

  try {
    const dbMatchId = await resolveToInternalId(eventId);
    const result = await matchRepository.getMatchPointByPoint(dbMatchId, {
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
    res.json({ matchId: eventId, internalId: dbMatchId, ...result });
  } catch (err) {
    console.error('Error getting point-by-point:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/match/:eventId/rebuild-snapshot - Rebuild snapshot
 */
exports.rebuildSnapshot = async (req, res) => {
  const { eventId } = req.params;

  if (!eventId || !matchRepository) {
    return res.status(400).json({ error: 'Missing eventId or repository not available' });
  }

  try {
    const dbMatchId = await resolveToInternalId(eventId);
    await matchRepository.buildMatchCardSnapshot(dbMatchId);
    const snapshot = await matchRepository.getMatchCardSnapshot(dbMatchId);
    res.json({ success: true, matchId: eventId, internalId: dbMatchId, snapshot });
  } catch (err) {
    console.error('Error rebuilding snapshot:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/match/:matchId/breaks - Break analysis
 */
exports.getBreaks = async (req, res) => {
  const { matchId, eventId } = req.params;
  const id = matchId || eventId;

  if (!id) {
    return res.status(400).json({ error: 'Missing matchId' });
  }

  let breakDetector = null;
  try {
    breakDetector = require('../utils/breakDetector');
  } catch (e) {
    return res.status(503).json({ error: 'Break Detector not available' });
  }

  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const match = await matchRepository.getMatchById(parseInt(id));

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const breakAnalysis = {
      match_id: match.id,
      players: {
        home: match.home_name,
        away: match.away_name,
      },
      sets: [],
    };

    for (let setNum = 1; setNum <= 5; setNum++) {
      const homeGames = match[`w${setNum}`];
      const awayGames = match[`l${setNum}`];

      if (homeGames === null || awayGames === null) break;

      const setScore = { w: homeGames, l: awayGames };
      const setBreaks = breakDetector.analyzeSetBreaks(setScore, setNum);

      breakAnalysis.sets.push({
        set_number: setNum,
        score: `${homeGames}-${awayGames}`,
        ...setBreaks,
      });
    }

    if (breakAnalysis.sets.length > 0) {
      const allBreaks = breakAnalysis.sets.map((s) => s.total_breaks_estimated);
      breakAnalysis.total_breaks = allBreaks.reduce((a, b) => a + b, 0);
      breakAnalysis.avg_breaks_per_set = breakAnalysis.total_breaks / breakAnalysis.sets.length;
    }

    res.json(breakAnalysis);
  } catch (err) {
    console.error('Error analyzing breaks:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/match/:matchId/inspector - Data inspector
 */
exports.getInspector = async (req, res) => {
  const { matchId, eventId } = req.params;
  const id = matchId || eventId;

  if (!id) {
    return res.status(400).json({ error: 'Missing matchId' });
  }

  try {
    let rawData = {};
    let match = null;

    if (matchRepository) {
      // Usa getMatchById invece di getAllMatches
      match = await matchRepository.getMatchById(parseInt(id));

      if (match) {
        rawData = {
          homePlayer: match.home_name || match.home_player || 'N/A',
          awayPlayer: match.away_name || match.away_player || 'N/A',
          tournament: match.tournament_name || match.tournament || 'N/A',
          surface: match.surface || 'N/A',
          status: match.status_type || match.status || 'N/A',
          score: match.score || 'N/A',
          winner: match.winner_code || match.winner || 'N/A',
          set1: match.w1 != null && match.l1 != null ? `${match.w1}-${match.l1}` : 'N/A',
          set2: match.w2 != null && match.l2 != null ? `${match.w2}-${match.l2}` : 'N/A',
          set3: match.w3 != null && match.l3 != null ? `${match.w3}-${match.l3}` : 'N/A',
          statsCount: match.statistics ? Object.keys(match.statistics).length : 0,
          powerRankingsCount: match.powerRankings?.length || match.power_rankings?.length || 0,
          pointByPointCount: match.pointByPoint?.length || match.point_by_point?.length || 0,
        };
      }
    }

    res.json({
      matchId: id,
      found: !!match,
      rawData,
      dataSources: match ? ['database'] : [],
    });
  } catch (err) {
    console.error('Error in match inspector:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/matches/cards - Match cards list
 */
exports.getCards = async (req, res) => {
  const { limit = 20, surface, tournament, playerId } = req.query;

  if (!matchRepository) {
    return res.status(503).json({ error: 'Match Repository not available' });
  }

  try {
    // Usa il repository direttamente per ottenere i match recenti
    const matches = await matchRepository.getMatches({
      limit: parseInt(limit),
      surface,
      tournament,
      playerId: playerId ? parseInt(playerId) : undefined,
    });
    
    // Trasforma in formato card minimale
    const cards = (matches || []).map(m => ({
      eventId: m.event_id || m.id,
      homeTeam: m.home_name || m.homeTeam?.name || 'Unknown',
      awayTeam: m.away_name || m.awayTeam?.name || 'Unknown',
      tournament: m.tournament_name || m.tournament || '',
      surface: m.surface || '',
      status: m.status_type || m.status || 'unknown',
      startTime: m.start_time || m.startTimestamp,
      winnerCode: m.winner_code,
    }));
    
    res.json({ cards, count: cards.length });
  } catch (err) {
    console.error('Error getting match cards:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/matches/merged - Merged matches from files
 */
exports.getMerged = async (req, res) => {
  const { getRealisticStatus } = require('../utils/bundleHelpers');
  
  try {
    const matches = [];

    if (!fs.existsSync(SCRAPES_DIR)) {
      return res.json({ matches: [], count: 0, source: 'files' });
    }

    const files = fs.readdirSync(SCRAPES_DIR).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(SCRAPES_DIR, file), 'utf8'));

        if (!content.api) continue;

        for (const [url, data] of Object.entries(content.api)) {
          if (!url.match(/\/event\/\d+$/) || !data?.event) continue;

          const eventData = data.event;
          const eventId = eventData.id;

          if (matches.some((m) => m.eventId === eventId)) continue;

          matches.push({
            eventId,
            tournament: {
              name: eventData.tournament?.name || '',
              category: eventData.tournament?.category?.name || '',
            },
            homeTeam: {
              name: eventData.homeTeam?.name || '',
              shortName: eventData.homeTeam?.shortName || '',
              country: eventData.homeTeam?.country?.alpha2 || '',
              ranking: eventData.homeTeam?.ranking || null,
            },
            awayTeam: {
              name: eventData.awayTeam?.name || '',
              shortName: eventData.awayTeam?.shortName || '',
              country: eventData.awayTeam?.country?.alpha2 || '',
              ranking: eventData.awayTeam?.ranking || null,
            },
            homeScore: eventData.homeScore || null,
            awayScore: eventData.awayScore || null,
            status: getRealisticStatus(
              eventData.status,
              eventData.startTimestamp,
              eventData.winnerCode
            ) || { type: 'unknown' },
            startTimestamp: eventData.startTimestamp || null,
            winnerCode: eventData.winnerCode || null,
            source: 'files',
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
};

/**
 * POST /api/match/pressure - Calcola indice pressione live
 */
exports.calculatePressure = (req, res) => {
  const { stats, context } = req.body;

  if (!stats) {
    return res.status(400).json({ error: 'Missing stats object' });
  }

  let pressureCalculator = null;
  try {
    pressureCalculator = require('../utils/pressureCalculator');
  } catch (e) {
    return res.status(503).json({ error: 'Pressure Calculator not available' });
  }

  try {
    const pressure = pressureCalculator.calculatePressureIndex(stats, context || {});
    res.json(pressure);
  } catch (err) {
    console.error('Error calculating pressure:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/match/segment - Segmenta un match in fasi
 */
exports.segmentMatch = (req, res) => {
  const { matchStats } = req.body;

  if (!matchStats) {
    return res.status(400).json({ error: 'Missing matchStats object' });
  }

  let matchSegmenter = null;
  try {
    matchSegmenter = require('../utils/matchSegmenter');
  } catch (e) {
    return res.status(503).json({ error: 'Match Segmenter not available' });
  }

  try {
    const segments = matchSegmenter.segmentMatch(matchStats);
    const summary = matchSegmenter.getSegmentSummary(segments);

    res.json({
      segments,
      summary,
      total_segments: segments.length,
    });
  } catch (err) {
    console.error('Error segmenting match:', err);
    res.status(500).json({ error: err.message });
  }
};
