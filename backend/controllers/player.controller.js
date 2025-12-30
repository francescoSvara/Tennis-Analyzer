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
let matchRepository = null;
let playerService = null;
let playerProfileService = null;

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

try {
  matchRepository = require('../db/matchRepository');
} catch (e) {
  console.warn('⚠️ matchRepository not available');
}

try {
  playerService = require('../services/playerService');
} catch (e) {
  console.warn('⚠️ Player Service not available');
}

try {
  playerProfileService = require('../services/playerProfileService');
} catch (e) {
  console.warn('⚠️ Player Profile Service not available');
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

/**
 * GET /api/player/:playerId/ranking-history - Player ranking at specific dates
 */
exports.getRankingHistory = async (req, res) => {
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
};

/**
 * GET /api/player/:playerId - Dettagli giocatore
 */
exports.getById = async (req, res) => {
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
      aliases,
    });
  } catch (err) {
    console.error('Error getting player:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/search/players - Cerca giocatori (alias per /api/player/search)
 */
exports.searchPlayers = async (req, res) => {
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
};

/**
 * POST /api/player/alias - Aggiungi alias per un giocatore
 */
exports.addAlias = async (req, res) => {
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
};

/**
 * POST /api/player/merge - Unisci due giocatori duplicati
 */
exports.mergePlayers = async (req, res) => {
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
};

/**
 * GET /api/player/:playerName/profile - Profilo completo aggregato giocatore
 */
exports.getProfile = async (req, res) => {
  const { playerName } = req.params;
  const { surface, format, series } = req.query;

  if (!playerName) {
    return res.status(400).json({ error: 'Missing playerName' });
  }

  if (!playerProfileService) {
    return res.status(503).json({ error: 'Player Profile Service not available' });
  }

  try {
    const profile = await playerProfileService.getPlayerProfile(decodeURIComponent(playerName), {
      surface,
      format,
      series,
    });

    res.json(profile);
  } catch (err) {
    console.error('Error getting player profile:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/player/:playerName/inspector - Data Inspector per giocatore
 */
exports.getInspector = async (req, res) => {
  const { playerName } = req.params;

  if (!playerName) {
    return res.status(400).json({ error: 'Missing playerName' });
  }

  try {
    const decodedName = decodeURIComponent(playerName);
    console.log(`🔬 Inspector: Loading data for "${decodedName}"`);

    const rawData = {};
    let playerMatches = [];

    if (playerProfileService && playerProfileService.getPlayerMatches) {
      playerMatches = await playerProfileService.getPlayerMatches(decodedName);
    } else if (matchRepository && matchRepository.getMatches) {
      const allMatches = await matchRepository.getMatches({
        limit: 5000,
        playerSearch: decodedName,
      });
      playerMatches = allMatches || [];
    }

    if (playerMatches.length > 0) {
      rawData.totalMatches = playerMatches.length;
      rawData.wins = playerMatches.filter((m) => m.player_role === 'winner').length;
      rawData.losses = playerMatches.filter((m) => m.player_role === 'loser').length;

      const surfaces = playerMatches.map((m) => m.surface || m.surface_normalized).filter(Boolean);
      rawData.surfaces = {
        hard: surfaces.filter((s) => s.toLowerCase().includes('hard')).length,
        clay: surfaces.filter((s) => s.toLowerCase().includes('clay')).length,
        grass: surfaces.filter((s) => s.toLowerCase().includes('grass')).length,
        indoor: surfaces.filter((s) => s.toLowerCase().includes('indoor')).length,
      };

      const matchesWithOdds = playerMatches.filter((m) => m.avgw || m.maxw || m.avgl || m.maxl);
      rawData.matchesWithOdds = matchesWithOdds.length;
      
      rawData.uniqueTournaments = [
        ...new Set(playerMatches.map((m) => m.tournament_name || m.tournament).filter(Boolean)),
      ].length;
    }

    const calculatedData = {};

    if (playerProfileService && rawData.totalMatches > 0) {
      try {
        const profile = await playerProfileService.getPlayerProfile(decodedName, {});
        if (profile.global) {
          calculatedData.winRate = profile.global.win_rate;
          calculatedData.totalWins = profile.global.wins;
          calculatedData.totalLosses = profile.global.losses;
        }
        if (profile.special_metrics) {
          calculatedData.comebackRate = profile.special_metrics.comeback_rate;
        }
      } catch (e) {
        console.warn('Could not calculate profile:', e.message);
      }
    }

    res.json({
      name: decodedName,
      rawData,
      calculatedData,
      coverage: {
        total: 15,
        available: Object.keys(rawData).length + Object.keys(calculatedData).length,
      },
    });
  } catch (err) {
    console.error('Error in player inspector:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/players/search - Ricerca giocatori per autocompletamento
 */
exports.searchAutocomplete = async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.length < 2) {
    return res.json([]);
  }

  try {
    const players = await playerStatsService.searchPlayers(q, parseInt(limit));
    res.json(
      players.map((p) => ({
        name: p.name,
        matchCount: p.totalMatches,
      }))
    );
  } catch (error) {
    console.error('Error searching players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/players/compare - Confronta due giocatori
 */
exports.compare = async (req, res) => {
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
};
