/**
 * Bundle Service - Core service for building MatchBundle
 *
 * FILOSOFIA: MatchBundle is the ONLY interface between Backend and Frontend.
 * This service orchestrates data fetching, feature computation, strategy
 * evaluation, and bundle assembly.
 *
 * @module bundleService
 * @memberof ConceptualMap#Services
 * @see docs/filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md
 * @see docs/filosofie/FILOSOFIA_MATCHBUNDLE_ONLY_FE.md
 */

const {
  extractScore,
  normalizeOddsForBundle,
  normalizePointsForBundle,
  calculateDataQuality,
  calculateWinProbability,
  extractKeyFactors,
  computeSetsWon,
} = require('../utils/bundleHelpers');

const { buildStatsTab } = require('../utils/statsTabBuilder');

// Service version for lineage tracking
const BUNDLE_SERVICE_VERSION = '2.0.0';

// ============================================================================
// BUNDLE CACHE
// ============================================================================

const bundleCache = new Map();
const BUNDLE_CACHE_TTL_FINISHED = 30000; // 30 seconds for finished matches
const BUNDLE_CACHE_TTL_LIVE = 5000; // 5 seconds for live matches

function getCachedBundle(eventId) {
  const cached = bundleCache.get(String(eventId));
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    bundleCache.delete(String(eventId));
    return null;
  }
  return cached.bundle;
}

function setCachedBundle(eventId, bundle, isLive = false) {
  const ttl = isLive ? BUNDLE_CACHE_TTL_LIVE : BUNDLE_CACHE_TTL_FINISHED;
  bundleCache.set(String(eventId), {
    bundle,
    timestamp: Date.now(),
    ttl,
  });
}

function invalidateBundleCache(eventId) {
  bundleCache.delete(String(eventId));
}

// ============================================================================
// LAZY LOADED DEPENDENCIES
// ============================================================================

let matchRepository = null;
let supabaseClient = null;
let matchCardService = null;
let playerStatsService = null;
let featureEngine = null;
let strategyEngine = null;
let riskEngine = null;
let dataQualityChecker = null;
let liveManager = null;

function loadDependencies() {
  if (!matchRepository) {
    try {
      matchRepository = require('../db/matchRepository');
    } catch (e) {
      console.warn('⚠️ matchRepository not available for bundleService');
    }
  }
  if (!supabaseClient) {
    try {
      supabaseClient = require('../db/supabase');
    } catch (e) {
      console.warn('⚠️ supabaseClient not available for bundleService');
    }
  }
  if (!matchCardService) {
    try {
      matchCardService = require('./matchCardService');
    } catch (e) {
      console.warn('⚠️ matchCardService not available for bundleService');
    }
  }
  if (!playerStatsService) {
    try {
      playerStatsService = require('./playerStatsService');
    } catch (e) {
      console.warn('⚠️ playerStatsService not available for bundleService');
    }
  }
  if (!featureEngine) {
    try {
      featureEngine = require('../utils/featureEngine');
    } catch (e) {
      console.warn('⚠️ featureEngine not available for bundleService');
    }
  }
  if (!strategyEngine) {
    try {
      strategyEngine = require('../strategies/strategyEngine');
    } catch (e) {
      console.warn('⚠️ strategyEngine not available for bundleService');
    }
  }
  if (!riskEngine) {
    try {
      riskEngine = require('./riskEngine');
    } catch (e) {
      /* riskEngine optional */
    }
  }
  if (!dataQualityChecker) {
    try {
      dataQualityChecker = require('./dataQualityChecker');
    } catch (e) {
      /* dataQualityChecker optional */
    }
  }
  if (!liveManager) {
    try {
      liveManager = require('../liveManager');
    } catch (e) {
      console.warn('⚠️ liveManager not available for bundleService');
    }
  }
}

// ============================================================================
// BUILD OVERVIEW TAB
// ============================================================================

function buildOverviewTab(matchData, features, strategies, statsTab) {
  const readyStrategies = strategies.filter((s) => s.status === 'READY');

  const keyStats = {
    aces: {
      home: statsTab?.serve?.home?.aces || 0,
      away: statsTab?.serve?.away?.aces || 0,
    },
    doubleFaults: {
      home: statsTab?.serve?.home?.doubleFaults || 0,
      away: statsTab?.serve?.away?.doubleFaults || 0,
    },
    breakPoints: {
      home: statsTab?.return?.home?.breakPointsWon || 0,
      away: statsTab?.return?.away?.breakPointsWon || 0,
    },
  };

  return {
    h2h: matchData.h2h || null,
    recentForm: {
      home: matchData.player1?.recentForm || [],
      away: matchData.player2?.recentForm || [],
    },
    keyStats,
    alerts: readyStrategies.map((s) => ({
      type: 'strategy',
      level: 'ready',
      message: `${s.name}: ${s.reasons?.[0] || s.entryRule}`,
      strategyId: s.id,
    })),
    // FILOSOFIA_STATS: tutte le features calcolate dal featureEngine (Markov model)
    features: {
      volatility: features.volatility,
      pressure: features.pressure,
      dominance: features.dominance,
      dominantPlayer: features.dominantPlayer,
      serveDominance: features.serveDominance,
      returnDominance: features.returnDominance,
      breakProbability: features.breakProbability,
      hasRealData: features.hasRealData,
      momentum: features.momentum,
      // Data source flags per trasparenza
      volatilitySource: features.volatilitySource,
      pressureSource: features.pressureSource,
      dominanceSource: features.dominanceSource,
      serveDominanceSource: features.serveDominanceSource,
      breakProbabilitySource: features.breakProbabilitySource,
    },
  };
}

// ============================================================================
// SOFASCORE DATA CONVERTER
// ============================================================================

/**
 * Convert raw SofaScore event data to our internal matchData format
 * Used when DB save fails but we still have fresh data from API
 */
function buildMatchDataFromSofaScore(event, fullData = {}) {
  if (!event) return null;

  // Extract status properly
  const status = typeof event.status === 'object' 
    ? event.status.type || event.status.description 
    : event.status || 'unknown';

  // Build sets array from period scores
  const sets = [];
  const homeScore = event.homeScore || {};
  const awayScore = event.awayScore || {};
  for (let i = 1; i <= 5; i++) {
    if (homeScore[`period${i}`] != null) {
      sets.push({ 
        home: homeScore[`period${i}`], 
        away: awayScore[`period${i}`] || 0 
      });
    }
  }

  return {
    match: {
      id: event.id,
      status: status,
      startTimestamp: event.startTimestamp,
      winnerCode: event.winnerCode,
      winner: event.winnerCode ? (event.winnerCode === 1 ? 'home' : 'away') : null,
      surface: event.groundType || event.tournament?.uniqueTournament?.groundType || 'Unknown',
      round: event.roundInfo?.name,
      sets: sets,
      currentGame: {
        home: homeScore.current || 0,
        away: awayScore.current || 0,
      },
      point: {
        home: homeScore.point,
        away: awayScore.point,
      },
      firstToServe: event.firstToServe,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      tournament: event.tournament?.uniqueTournament || event.tournament,
    },
    player1: {
      id: event.homeTeam?.id,
      name: event.homeTeam?.name || event.homeTeam?.shortName,
      country: event.homeTeam?.country?.alpha2,
      currentRanking: event.homeTeam?.ranking,
    },
    player2: {
      id: event.awayTeam?.id,
      name: event.awayTeam?.name || event.awayTeam?.shortName,
      country: event.awayTeam?.country?.alpha2,
      currentRanking: event.awayTeam?.ranking,
    },
    tournament: {
      id: event.tournament?.uniqueTournament?.id || event.tournament?.id,
      name: event.tournament?.uniqueTournament?.name || event.tournament?.name,
      surface: event.groundType || event.tournament?.uniqueTournament?.groundType,
    },
    statistics: fullData.statistics || [],
    pointByPoint: fullData.pointByPoint || [],
    powerRankings: fullData.powerRankings || fullData.tennisPowerRankings || [],
    h2h: fullData.h2h,
    dataQuality: 30, // Lower quality since not from DB
    _source: 'sofascore_direct',
  };
}

// ============================================================================
// BUILD BUNDLE (MAIN FUNCTION)
// ============================================================================

/**
 * Build complete MatchBundle for a given event
 *
 * @param {number} eventId - SofaScore event ID
 * @param {Object} options - Build options
 * @param {boolean} options.forceRefresh - Skip cache and force rebuild
 * @param {string} options.as_of_time - Temporal cut for historical analysis
 * @returns {Object|null} Complete MatchBundle or null if not found
 */
async function buildBundle(eventId, options = {}) {
  loadDependencies();

  const { forceRefresh = false, as_of_time = null } = options;

  // Check cache first (unless forceRefresh)
  if (!forceRefresh) {
    const cachedBundle = getCachedBundle(eventId);
    if (cachedBundle) {
      console.log(`📦 Bundle for ${eventId} served from cache`);
      return cachedBundle;
    }
  }

  console.log(`📦 Building bundle for match ${eventId}...`);

  // STEP 0: Resolve sofascore_id to internal match_id
  // Il frontend passa sofascore_id, il DB usa id interno
  let internalMatchId = null;
  if (matchRepository?.resolveMatchId) {
    internalMatchId = await matchRepository.resolveMatchId(parseInt(eventId));
    if (internalMatchId) {
      console.log(`📦 Resolved sofascore_id ${eventId} -> internal id ${internalMatchId}`);
    }
  }
  
  // Use internal ID for DB queries, fallback to eventId
  const dbMatchId = internalMatchId || parseInt(eventId);

  // 1. Load all raw data in parallel from DB
  let [matchData, statisticsData, momentumData, oddsData, pointsData, matchScoresData] =
    await Promise.all([
      matchCardService ? matchCardService.getMatchCardFromSnapshot(parseInt(eventId)) : null,
      matchRepository ? matchRepository.getMatchStatisticsNew(dbMatchId) : [],
      matchRepository ? matchRepository.getMatchMomentum(dbMatchId) : [],
      matchRepository ? matchRepository.getMatchOdds(dbMatchId) : null,
      matchRepository
        ? matchRepository.getMatchPointByPoint(dbMatchId, { limit: 500 })
        : { data: [] },
      supabaseClient?.supabase
        ? supabaseClient.supabase
            .from('match_scores')
            .select('*')
            .eq('match_id', dbMatchId)
            .order('set_number')
        : { data: [] },
    ]);

  let finalMatchData = matchData;

  // 2. Data must come from DB only - no SofaScore sync

  if (!finalMatchData) {
    console.log(`📦 Match ${eventId} not found in DB`);
    return null;
  }

  // 3. Use only DB data, no SofaScore refresh

  // 4. Enrich match with scores from match_scores table if sets are empty
  const setScores = matchScoresData?.data || [];
  if (
    setScores.length > 0 &&
    (!finalMatchData.match?.sets || finalMatchData.match.sets.length === 0)
  ) {
    console.log(
      `📊 Enriching match ${eventId} with ${setScores.length} set scores from match_scores table`
    );
    if (!finalMatchData.match) finalMatchData.match = {};
    finalMatchData.match.sets = setScores.map((s) => ({
      home: s.home_games,
      away: s.away_games,
      tiebreak: s.home_tiebreak || s.away_tiebreak || null,
    }));
  }

  // 5. Compute Features
  const allPeriodStats = statisticsData?.ALL || {};
  const homeStats = {
    aces: allPeriodStats.p1_aces,
    doubleFaults: allPeriodStats.p1_double_faults,
    firstServePct: allPeriodStats.p1_first_serve_pct,
    firstServePointsWonPct:
      allPeriodStats.p1_first_serve_won && allPeriodStats.p1_first_serve_total
        ? Math.round(
            (allPeriodStats.p1_first_serve_won / allPeriodStats.p1_first_serve_total) * 100
          )
        : undefined,
    totalPointsWon: allPeriodStats.p1_total_points_won,
    breakPointsWon: allPeriodStats.p1_break_points_won,
  };
  const awayStats = {
    aces: allPeriodStats.p2_aces,
    doubleFaults: allPeriodStats.p2_double_faults,
    firstServePct: allPeriodStats.p2_first_serve_pct,
    firstServePointsWonPct:
      allPeriodStats.p2_first_serve_won && allPeriodStats.p2_first_serve_total
        ? Math.round(
            (allPeriodStats.p2_first_serve_won / allPeriodStats.p2_first_serve_total) * 100
          )
        : undefined,
    totalPointsWon: allPeriodStats.p2_total_points_won,
    breakPointsWon: allPeriodStats.p2_break_points_won,
  };

  const featureInput = {
    powerRankings: momentumData || finalMatchData.momentum || [],
    statistics: {
      home: homeStats || finalMatchData.statistics?.[0] || {},
      away: awayStats || finalMatchData.statistics?.[1] || {},
    },
    score: extractScore(finalMatchData),
    odds: oddsData || finalMatchData.odds || [],
    serving: finalMatchData.match?.serving || null,
    gameScore: finalMatchData.match?.gameScore || null,
    player1: finalMatchData.player1 || {},
    player2: finalMatchData.player2 || {},
  };

  let features = {};
  if (featureEngine && featureEngine.computeFeatures) {
    features = featureEngine.computeFeatures(featureInput);
  }

  // 6. Calculate data quality early (needed for strategy evaluation)
  const dataQuality = calculateDataQuality(finalMatchData, statisticsData, momentumData);

  // 7. Evaluate Strategies
  const strategyInput = {
    status: finalMatchData.match?.status || finalMatchData.status || 'unknown',
    dataQuality: dataQuality,
    features,
    score: extractScore(finalMatchData),
    statistics: featureInput.statistics,
    odds: {
      matchWinner: {
        current: oddsData?.matchWinner || finalMatchData.odds?.matchWinner || 2.0,
      },
    },
    players: {
      home: finalMatchData.player1,
      away: finalMatchData.player2,
    },
  };

  let strategySignals = [];
  let strategySummary = { ready: 0, watch: 0, off: 0 };
  if (strategyEngine) {
    strategySignals = strategyEngine.evaluateAll(strategyInput);
    strategySummary = strategyEngine.getSummary(strategySignals);
  }

  // 8. Build tabs data
  const normalizedOdds = normalizeOddsForBundle(oddsData, finalMatchData);
  const normalizedPoints = normalizePointsForBundle(pointsData);

  const hasNewStats = statisticsData && Object.keys(statisticsData).length > 0;
  const statsSource = hasNewStats ? statisticsData : finalMatchData?.statistics;
  const statsTab = buildStatsTab(
    statsSource,
    finalMatchData,
    extractScore(finalMatchData),
    normalizedPoints
  );

  const tabs = {
    overview: buildOverviewTab(finalMatchData, features, strategySignals, statsTab),
    strategies: {
      signals: strategySignals,
      summary: strategySummary,
      lastUpdated: new Date().toISOString(),
    },
    odds: {
      matchWinner: normalizedOdds,
      history: oddsData?.all || [],
      spreads: oddsData?.spreads || null,
      totals: oddsData?.totals || null,
    },
    pointByPoint: normalizedPoints,
    stats: statsTab,
    momentum: {
      powerRankings: momentumData || finalMatchData.momentum || [],
      features: {
        trend: features.momentum?.trend || 'stable',
        recentSwing: features.momentum?.recentSwing || 0,
        breakCount: features.momentum?.breakCount || 0,
        last5avg: features.momentum?.last5avg || 50,
      },
      qualityStats: {
        home: {
          winners: statsTab.points.home.winners,
          ue: statsTab.points.home.unforcedErrors,
        },
        away: {
          winners: statsTab.points.away.winners,
          ue: statsTab.points.away.unforcedErrors,
        },
      },
    },
    predictor: {
      winProbability: calculateWinProbability(features, featureInput.statistics),
      keyFactors: extractKeyFactors(features, strategySignals),
      breakProbability: features.breakProbability || 25,
    },
    journal: {
      enabled: true,
    },
  };

  // Note: dataQuality already calculated earlier (step 6)

  // 9. Build header
  const rawStatus = finalMatchData.match?.status;
  const matchStatus =
    typeof rawStatus === 'string'
      ? rawStatus
      : rawStatus?.type || rawStatus?.description || 'unknown';

  // Extract sets from match data (DB has authoritative data)
  const matchSets = finalMatchData.match?.sets || [];
  
  const header = {
    match: {
      id: finalMatchData.match?.id || parseInt(eventId),
      status: matchStatus,
      startTime: finalMatchData.match?.startTimestamp,
      tournament: finalMatchData.tournament?.name || finalMatchData.match?.tournament?.name,
      round: finalMatchData.match?.roundInfo?.name || finalMatchData.match?.round,
      surface: finalMatchData.match?.surface || finalMatchData.tournament?.surface,
      // Include sets and score from DB
      sets: matchSets,
      score: finalMatchData.match?.score,
    },
    players: {
      home: {
        id: finalMatchData.player1?.id,
        name: finalMatchData.player1?.name || finalMatchData.match?.homeTeam?.name,
        country: finalMatchData.player1?.country,
        ranking: finalMatchData.player1?.currentRanking || finalMatchData.player1?.rankingAtMatch,
        seed: finalMatchData.player1?.seed,
      },
      away: {
        id: finalMatchData.player2?.id,
        name: finalMatchData.player2?.name || finalMatchData.match?.awayTeam?.name,
        country: finalMatchData.player2?.country,
        ranking: finalMatchData.player2?.currentRanking || finalMatchData.player2?.rankingAtMatch,
        seed: finalMatchData.player2?.seed,
      },
    },
    score: extractScore(finalMatchData),
    odds: {
      home: oddsData?.home || finalMatchData.odds?.home,
      away: oddsData?.away || finalMatchData.odds?.away,
    },
    features: {
      volatility: features.volatility,
      pressure: features.pressure,
      dominance: features.dominance,
      dominantPlayer: features.dominantPlayer,
      serveDominance: features.serveDominance,
      returnDominance: features.returnDominance,
      breakProbability: features.breakProbability,
      hasRealData: features.hasRealData,
      momentum: features.momentum,
    },
  };

  // Calculate sets won from score and expose in header for UI convenience
  try {
    const setsResult = computeSetsWon(header.score);
    header.match.setsWon = { home: setsResult.home, away: setsResult.away };
    if (setsResult.winner) header.match.winner = setsResult.winner;
  } catch (e) {
    // Non-blocking: if compute fails, continue without sets info
  }
  
  // Ensure winner is set from DB data if available (fallback)
  if (!header.match.winner && finalMatchData.match?.winner) {
    header.match.winner = finalMatchData.match.winner;
  }
  // Also try winnerCode (1=home, 2=away)
  if (!header.match.winner && finalMatchData.match?.winnerCode) {
    header.match.winner = finalMatchData.match.winnerCode === 1 ? 'home' : 'away';
  }

  // 10. Risk analysis (optional)
  let riskAnalysis = null;
  if (riskEngine && normalizedOdds?.home?.value && features.dominance) {
    try {
      const modelProb = features.dominance / 100;
      riskAnalysis = riskEngine.analyzeRisk({
        modelProb,
        marketOdds: normalizedOdds.home.value,
        bankroll: 1000,
        confidence: (100 - features.volatility) / 100,
        volatility: features.volatility,
      });
    } catch (e) {
      // Risk engine error, continue without
    }
  }

  // 11. Surface splits (optional)
  let surfaceSplitsData = null;
  if (playerStatsService?.getMatchSurfaceSplits) {
    try {
      const player1Name = finalMatchData.player1?.name || finalMatchData.match?.homeTeam?.name;
      const player2Name = finalMatchData.player2?.name || finalMatchData.match?.awayTeam?.name;
      const matchSurface = finalMatchData.match?.surface || finalMatchData.tournament?.surface;

      if (player1Name && player2Name && matchSurface) {
        surfaceSplitsData = await playerStatsService.getMatchSurfaceSplits(
          player1Name,
          player2Name,
          matchSurface,
          { window: 'career' }
        );
      }
    } catch (surfaceErr) {
      console.warn(`⚠️ Surface splits calculation failed:`, surfaceErr.message);
    }
  }

  if (surfaceSplitsData) {
    tabs.stats.surfaceSplits = {
      playerA: surfaceSplitsData.playerA,
      playerB: surfaceSplitsData.playerB,
      matchSurface: surfaceSplitsData.matchSurface,
      comparison: surfaceSplitsData.comparison,
    };
  }

  // 12. Build final bundle
  const bundleAsOfTime = as_of_time || new Date().toISOString();

  const bundle = {
    matchId: parseInt(eventId),
    timestamp: new Date().toISOString(),
    header,
    features,
    tabs,
    dataQuality,
    meta: {
      version: BUNDLE_SERVICE_VERSION,
      source: finalMatchData.fromSnapshot
        ? 'snapshot'
        : finalMatchData.fromLegacy
        ? 'legacy'
        : 'live',
      strategiesCount: strategySignals.length,
      readyStrategies: strategySummary.ready,
      as_of_time: bundleAsOfTime,
      risk: riskAnalysis,
      versions: {
        bundle_schema: BUNDLE_SERVICE_VERSION,
        features: featureEngine?.FEATURE_ENGINE_VERSION || 'v1.0.0',
        strategies: strategyEngine?.STRATEGY_ENGINE_VERSION || 'v1.0.0',
        risk: riskAnalysis?.meta?.version || 'v1.0.0',
      },
    },
  };

  // 13. Quality evaluation (optional)
  if (dataQualityChecker) {
    try {
      const qualityResult = dataQualityChecker.evaluateBundleQuality(bundle);
      bundle.meta.quality = qualityResult;

      if (qualityResult.status === 'FAIL') {
        console.warn(
          `⚠️ Bundle quality FAIL for ${eventId}:`,
          qualityResult.issues?.map((i) => i.code).join(', ')
        );
      }
    } catch (qualityErr) {
      console.warn(`⚠️ Quality check failed:`, qualityErr.message);
    }
  }

  // 14. Cache bundle
  const isLive =
    matchStatus === 'inprogress' || matchStatus === 'live' || matchStatus === 'playing';
  setCachedBundle(eventId, bundle, isLive);

  console.log(
    `✅ Bundle built for ${eventId}: quality=${dataQuality}%, strategies=${strategySignals.length} (${strategySummary.ready} ready)`
  );

  return bundle;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  BUNDLE_SERVICE_VERSION,
  buildBundle,
  getCachedBundle,
  setCachedBundle,
  invalidateBundleCache,
};
