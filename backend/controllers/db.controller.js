/**
 * Database Controller
 *
 * Controller per accesso al database.
 * Zero logica di dominio - solo req → repository → res
 *
 * @see docs/filosofie/guida refactor server.js
 * @see docs/filosofie/FILOSOFIA_DB.md
 */

const path = require('path');
const fs = require('fs');

// Lazy load dependencies
let matchRepository = null;
let supabaseClient = null;

try {
  matchRepository = require('../db/matchRepository');
  supabaseClient = require('../db/supabase');
} catch (e) {
  console.warn('⚠️ Database modules not available in db controller');
}

// Import services for tracking stats
let liveManager = null;
try {
  liveManager = require('../liveManager');
} catch (e) {
  console.warn('⚠️ LiveManager not available');
}

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const SCRAPES_DIR = path.join(DATA_DIR, 'scrapes');

/**
 * GET /api/db-stats - Statistiche complete del database
 */
exports.getDbStats = async (req, res) => {
  try {
    let dbMatches = [];
    let tournamentStats = [];

    // Carica tornei dalla tabella tournaments
    if (matchRepository && matchRepository.getTournamentsWithStats) {
      try {
        tournamentStats = (await matchRepository.getTournamentsWithStats()) || [];
        console.log(`📊 DB Stats: Found ${tournamentStats.length} tournaments from DB`);
      } catch (err) {
        console.log('⚠️ getTournamentsWithStats failed:', err.message);
      }
    }

    // Carica match per statistiche generali
    if (matchRepository) {
      try {
        dbMatches = (await matchRepository.getMatches({ limit: 10000 })) || [];
        console.log(`📊 DB Stats: Found ${dbMatches.length} matches in database`);
      } catch (dbErr) {
        console.log('⚠️ Database query failed, falling back to files:', dbErr.message);
      }
    }

    // Fallback a file locali se DB vuoto
    if (dbMatches.length === 0 && fs.existsSync(SCRAPES_DIR)) {
      console.log('📂 DB Stats: Loading from local files...');
      const files = fs.readdirSync(SCRAPES_DIR).filter((f) => f.endsWith('.json'));

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
              start_time: eventData.startTimestamp
                ? new Date(eventData.startTimestamp * 1000).toISOString()
                : null,
              created_at: new Date().toISOString(),
              tournament_id: eventData.tournament?.id || eventData.season?.id,
              home_name: eventData.homeTeam?.name || '',
              away_name: eventData.awayTeam?.name || '',
              sport: sportSlug,
            });
          }
        } catch (e) {
          /* skip */
        }
      }
      console.log(`📂 DB Stats: Loaded ${dbMatches.length} matches from files`);
    }

    // Statistiche generali match
    const matchesByStatus = { finished: 0, inprogress: 0, notstarted: 0, other: 0 };
    const matchesByDay = new Map();

    for (const match of dbMatches || []) {
      const statusType = (match.status_type || 'other').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(matchesByStatus, statusType)) {
        matchesByStatus[statusType]++;
      } else {
        matchesByStatus.other++;
      }

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
        count: matchesByDay.get(dayStr) || 0,
      });
    }

    // Acquisizioni recenti
    const recentAcquisitions = (dbMatches || [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20)
      .map((m) => ({
        eventId: m.id,
        acquiredAt: m.created_at,
        tournament: m.tournament?.name || '',
        homeTeam: m.home_player?.name || m.home_name || '',
        awayTeam: m.away_player?.name || m.away_name || '',
        status: m.status_type || 'unknown',
        completeness: 50,
      }));

    // Partite tracciate
    const tracked = liveManager ? liveManager.getTrackedMatches() : [];

    // Calcolo metriche database
    const totalMatches = (dbMatches || []).length;
    const finishedMatches = matchesByStatus.finished || 0;

    // Power Score semplificato
    const targetMatches = 1000;
    const dbSizeScore = Math.min(100, Math.round((totalMatches / targetMatches) * 100));
    const finishedScore = totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0;
    const powerScore = Math.round(dbSizeScore * 0.5 + finishedScore * 0.5);

    res.json({
      summary: {
        totalMatches,
        totalTournaments: tournamentStats.length,
        powerScore,
        powerDetails: {
          dbSize: { score: dbSizeScore, label: 'Match nel DB', detail: `${totalMatches} totali` },
          finished: {
            score: finishedScore,
            label: 'Match Finiti',
            detail: `${finishedMatches} finiti`,
          },
        },
        byStatus: matchesByStatus,
      },
      tournaments: tournamentStats,
      recentAcquisitions,
      timeline,
      tracking: {
        active: tracked.length,
        matches: tracked,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching DB stats:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/db/test - Test database connection
 */
exports.testConnection = async (req, res) => {
  if (!supabaseClient) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const connected = await supabaseClient.testConnection();
    res.json({ connected, message: connected ? 'Database connected' : 'Connection failed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/db/matches - Lista match dal database
 */
exports.getMatches = async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { limit, offset, status, tournamentId, playerId, orderBy, dateFrom, dateTo, dataSource } =
      req.query;

    const totalCount = await matchRepository.countMatches({
      status,
      tournamentId,
      playerId,
      dateFrom,
      dateTo,
      dataSource,
    });

    const dbMatches = await matchRepository.getMatches({
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      status,
      tournamentId: tournamentId ? parseInt(tournamentId) : undefined,
      playerId: playerId ? parseInt(playerId) : undefined,
      orderBy,
      dateFrom,
      dateTo,
      dataSource,
    });

    // Transform to frontend format
    const matches = (dbMatches || []).map((m) => transformMatchForFrontend(m));

    res.json({ matches, count: matches.length, totalCount, source: 'database' });
  } catch (err) {
    console.error('Error fetching matches:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/db/matches/summary - Summary per HomePage
 */
exports.getMatchesSummary = async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const summary = await matchRepository.getMatchesSummary();
    res.json(summary);
  } catch (err) {
    console.error('Error fetching matches summary:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/db/matches/by-month/:yearMonth - Match di un mese
 */
exports.getMatchesByMonth = async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { yearMonth } = req.params;
    const dbMatches = await matchRepository.getMatchesByMonth(yearMonth);
    const matches = (dbMatches || []).map((m) => transformMatchForFrontend(m));
    res.json({ matches, count: matches.length, yearMonth });
  } catch (err) {
    console.error('Error fetching matches by month:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/db/matches/:id - Singolo match
 */
exports.getMatchById = async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }
    const match = await matchRepository.getMatchById(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json(match);
  } catch (err) {
    console.error('Error fetching match:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/db/matches/:id/point-by-point
 */
exports.getPointByPoint = async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }
    const pbp = await matchRepository.getPointByPoint(matchId);
    res.json({ pointByPoint: pbp });
  } catch (err) {
    console.error('Error fetching point-by-point:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/db/matches/:id/statistics
 */
exports.getStatistics = async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { period = 'ALL' } = req.query;
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }
    const stats = await matchRepository.getStatistics(matchId, period);
    res.json(stats);
  } catch (err) {
    console.error('Error fetching statistics:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/db/tournaments
 */
exports.getTournaments = async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const tournaments = await matchRepository.getTournaments();
    res.json({ tournaments });
  } catch (err) {
    console.error('Error fetching tournaments:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/db/players/search
 */
exports.searchPlayers = async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { q, limit } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Missing search query (q)' });
    }
    const players = await matchRepository.searchPlayers(q, limit ? parseInt(limit) : 10);
    res.json({ players });
  } catch (err) {
    console.error('Error searching players:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/db/logs
 */
exports.getLogs = async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { limit } = req.query;
    const logs = await matchRepository.getExtractionLogs(limit ? parseInt(limit) : 20);
    res.json({ logs });
  } catch (err) {
    console.error('Error fetching logs:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Helper function
function transformMatchForFrontend(m) {
  const raw = m.raw_json || {};
  const homeName = m.home_name || m.home_player?.name || raw.homeTeam?.name || '';
  const awayName = m.away_name || m.away_player?.name || raw.awayTeam?.name || '';
  const tournamentName = m.tournament_name || m.tournament?.name || raw.tournament?.name || '';

  return {
    id: m.id,
    eventId: m.id,
    sport: 'tennis',
    sportName: 'Tennis',
    tournament: tournamentName,
    category: m.tournament_category || '',
    surface: m.tournament_ground || m.surface || '',
    homeTeam: {
      id: m.home_player_id,
      name: homeName,
      shortName: homeName,
      country: m.home_country || '',
      ranking: m.home_ranking || null,
    },
    awayTeam: {
      id: m.away_player_id,
      name: awayName,
      shortName: awayName,
      country: m.away_country || '',
      ranking: m.away_ranking || null,
    },
    homeScore: m.home_sets_won ? { current: m.home_sets_won } : null,
    awayScore: m.away_sets_won ? { current: m.away_sets_won } : null,
    status: {
      code: m.status_code,
      type: m.status_type,
      description: m.status_description,
    },
    startTimestamp: m.start_time ? Math.floor(new Date(m.start_time).getTime() / 1000) : null,
    winnerCode: m.winner_code,
    dataCompleteness: m.data_completeness || 50,
    source: 'database',
  };
}
