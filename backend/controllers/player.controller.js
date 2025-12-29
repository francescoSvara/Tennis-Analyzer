/**
 * Player Controller
 *
 * Controller per statistiche giocatori.
 * Zero logica di dominio - delega a playerStatsService.
 *
 * @see docs/filosofie/FILOSOFIA_STATS.md
 */

// Lazy load services
let playerStatsService = null;
let strategyStatsService = null;

try {
  playerStatsService = require('../services/playerStatsService');
} catch (e) {
  console.warn('⚠️ Player Stats Service not available');
}

try {
  strategyStatsService = require('../services/strategyStatsService');
} catch (e) {
  console.warn('⚠️ Strategy Stats Service not available');
}

/**
 * GET /api/player/:name/stats - Stats complete giocatore
 */
exports.getStats = async (req, res) => {
  if (!playerStatsService) {
    return res.status(503).json({ error: 'Player Stats Service not available' });
  }
  try {
    const playerName = decodeURIComponent(req.params.name);
    console.log(`📊 API: Getting stats for player: ${playerName}`);

    const stats = await playerStatsService.getPlayerStats(playerName);

    if (stats.error) {
      return res.status(404).json(stats);
    }

    res.json(stats);
  } catch (err) {
    console.error('Error fetching player stats:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/player/:name/matches - Lista match giocatore
 */
exports.getMatches = async (req, res) => {
  if (!playerStatsService) {
    return res.status(503).json({ error: 'Player Stats Service not available' });
  }
  try {
    const playerName = decodeURIComponent(req.params.name);
    const matches = await playerStatsService.getPlayerMatches(playerName);

    res.json({
      player: playerName,
      total_matches: matches.length,
      matches: matches.slice(0, 50), // Limita a 50 match per risposta
    });
  } catch (err) {
    console.error('Error fetching player matches:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/player/search - Ricerca autocomplete
 */
exports.search = async (req, res) => {
  if (!playerStatsService) {
    return res.status(503).json({ error: 'Player Stats Service not available' });
  }
  try {
    const { q, limit } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const players = await playerStatsService.searchPlayers(q, limit ? parseInt(limit) : 10);
    res.json({ players, count: players.length });
  } catch (err) {
    console.error('Error searching players:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/player/h2h - Head to Head
 */
exports.getH2H = async (req, res) => {
  if (!playerStatsService) {
    return res.status(503).json({ error: 'Player Stats Service not available' });
  }
  try {
    const { player1, player2 } = req.query;
    if (!player1 || !player2) {
      return res.status(400).json({ error: 'Both player1 and player2 are required' });
    }

    const h2h = await playerStatsService.getHeadToHeadStats(
      decodeURIComponent(player1),
      decodeURIComponent(player2)
    );
    res.json(h2h);
  } catch (err) {
    console.error('Error fetching H2H stats:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/match/strategy-context/:home/:away - Contesto strategie
 */
exports.getStrategyContext = async (req, res) => {
  if (!playerStatsService) {
    return res.status(503).json({ error: 'Player Stats Service not available' });
  }
  try {
    const homeName = decodeURIComponent(req.params.home);
    const awayName = decodeURIComponent(req.params.away);
    const surface = req.query.surface || null;

    console.log(
      `📊 [Strategy Context] Fetching for ${homeName} vs ${awayName} (surface: ${surface || 'all'})`
    );

    // Fetch stats in parallelo
    const fetchPromises = [
      playerStatsService.getPlayerStats(homeName),
      playerStatsService.getPlayerStats(awayName),
      playerStatsService.getHeadToHeadStats(homeName, awayName),
    ];

    // Aggiungi strategy stats se disponibile
    if (strategyStatsService) {
      fetchPromises.push(strategyStatsService.getStrategyStats(homeName, awayName, surface));
    }

    const results = await Promise.all(fetchPromises);
    const [homeStats, awayStats, h2h, strategyStats] = results;

    // Estrai le metriche per giocatore
    const extractStrategyMetrics = (stats, surface) => {
      if (!stats || stats.error) {
        return { error: 'Player not found', metrics: null };
      }

      const surfaceStats =
        surface && stats.by_surface?.[surface] ? stats.by_surface[surface] : null;

      return {
        name: stats.player_name,
        totalMatches: stats.total_matches || 0,
        comeback: {
          rate: surfaceStats?.comeback_rate ?? stats.overall?.comeback_rate ?? 0,
          total: surfaceStats?.comebacks ?? stats.overall?.comebacks ?? 0,
          lostSet1Total: surfaceStats?.lost_set1_total ?? stats.overall?.lost_set1_total ?? 0,
        },
        winRate: {
          overall: stats.overall?.win_rate ?? 0,
          surface: surfaceStats?.win_rate ?? null,
          bySurface: stats.by_surface || {},
        },
        roi: stats.overall?.roi || null,
      };
    };

    const result = {
      home: extractStrategyMetrics(homeStats, surface),
      away: extractStrategyMetrics(awayStats, surface),
      h2h: h2h || { matches: 0 },
      strategyStats: strategyStats || {
        layTheWinner: { success_rate: 0, total_matches: 0 },
        bancaServizio: { success_rate: 0, total_matches: 0 },
        superBreak: { success_rate: 0, total_matches: 0 },
      },
      surface: surface,
      fetchedAt: new Date().toISOString(),
    };

    res.json(result);
  } catch (err) {
    console.error('Error fetching strategy context:', err.message);
    res.status(500).json({ error: err.message });
  }
};
