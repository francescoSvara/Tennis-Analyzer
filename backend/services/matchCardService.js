/**
 * Match Card Service
 * @see docs/comments/match-card-service-explanations.md#header
 */

const { supabase } = require('../db/supabase');
const { createLogger } = require('../utils/logger');

const logger = createLogger('MatchCardService');

// FILOSOFIA_LINEAGE_VERSIONING: Module version exports
const MATCH_CARD_SERVICE_VERSION = '1.1.0';
const DATA_VERSION = 'canonical_v2'; // Schema DB + origine dati

// Cache per mappatura sofascore_id -> internal id
const sofascoreIdCache = new Map();

class MatchCardService {
  /**
   * Converte sofascore_id in match_id interno
   * Il frontend usa sofascore_id, il DB usa id interno
   */
  async resolveMatchId(sofascoreId) {
    // Check cache first
    const cached = sofascoreIdCache.get(sofascoreId);
    if (cached) return cached;
    
    // Query DB per trovare match_id interno
    const { data, error } = await supabase
      .from('matches')
      .select('id')
      .eq('sofascore_id', sofascoreId)
      .single();
    
    if (data?.id) {
      sofascoreIdCache.set(sofascoreId, data.id);
      logger.debug(`Resolved sofascore_id ${sofascoreId} -> internal id ${data.id}`);
      return data.id;
    }
    
    // Se non trovato, potrebbe essere già un ID interno
    const { data: direct } = await supabase
      .from('matches')
      .select('id')
      .eq('id', sofascoreId)
      .single();
    
    if (direct?.id) {
      return direct.id;
    }
    
    logger.warn(`Match not found in DB: sofascore_id=${sofascoreId}`);
    return null;
  }

  /**
   * Ottiene la card da snapshot (FAST - single query)
   * Se lo snapshot non esiste, costruisce e restituisce
   * IMPORTANTE: Arricchisce sempre i dati dello snapshot con quelli freschi dalla tabella matches
   */
  async getMatchCardFromSnapshot(matchId) {
    if (!supabase) {
      logger.warn('Supabase not available');
      return null;
    }

    try {
      // Resolve sofascore_id to internal match_id
      const internalId = await this.resolveMatchId(matchId);
      if (!internalId) {
        logger.warn(`Cannot resolve match ID: ${matchId}`);
        return null;
      }
      
      // Get both snapshot AND fresh match data from matches table
      const [snapshotResult, matchResult] = await Promise.all([
        supabase
          .from('match_card_snapshot')
          .select('*')
          .eq('match_id', internalId)
          .single(),
        supabase
          .from('matches')
          .select('*')
          .eq('id', internalId)
          .single()
      ]);
      
      const snapshot = snapshotResult.data;
      const freshMatch = matchResult.data;

      if (snapshot) {
        logger.debug(`Match ${matchId} (internal: ${internalId}) card from snapshot (quality=${snapshot.data_quality_int}%)`);
        // Enrich snapshot with fresh data from matches table
        return this.formatSnapshotResponse(snapshot, freshMatch);
      }

      // Snapshot doesn't exist, build it
      if (snapshotResult.error?.code === 'PGRST116') {
        logger.info(`Building snapshot for match ${matchId} (internal: ${internalId})...`);
        const card = await this.getMatchCard(internalId);

        if (card) {
          // Save snapshot in background (don't block response)
          this.saveSnapshot(internalId, card).catch((err) =>
            console.error('Error saving snapshot:', err.message)
          );
        }

        return card;
      }

      logger.error('Error fetching snapshot:', snapshotResult.error?.message);
      return null;
    } catch (error) {
      logger.error('Error in getMatchCardFromSnapshot:', error);
      return null;
    }
  }

  /**
   * Format snapshot data into API response format
   * Enriches with fresh data from matches table if available
   *
   * FILOSOFIA_TEMPORAL: generated_at / as_of_time for temporal tracking
   * FILOSOFIA_LINEAGE_VERSIONING: meta.versions for bundle versioning
   * FILOSOFIA_RISK_BANKROLL: risk/edge/stake placeholder for integration
   */
  formatSnapshotResponse(snapshot, freshMatch = null) {
    // Build sets from fresh match data (matches table has authoritative scores)
    let sets = snapshot.core_json?.sets || [];
    let matchData = { ...snapshot.core_json };
    
    if (freshMatch) {
      // Override with fresh data from matches table
      sets = [];
      if (freshMatch.set1_p1 != null) {
        sets.push({ player1: freshMatch.set1_p1, player2: freshMatch.set1_p2, tiebreak: freshMatch.set1_tb, setNumber: 1 });
      }
      if (freshMatch.set2_p1 != null) {
        sets.push({ player1: freshMatch.set2_p1, player2: freshMatch.set2_p2, tiebreak: freshMatch.set2_tb, setNumber: 2 });
      }
      if (freshMatch.set3_p1 != null) {
        sets.push({ player1: freshMatch.set3_p1, player2: freshMatch.set3_p2, tiebreak: freshMatch.set3_tb, setNumber: 3 });
      }
      if (freshMatch.set4_p1 != null) {
        sets.push({ player1: freshMatch.set4_p1, player2: freshMatch.set4_p2, tiebreak: freshMatch.set4_tb, setNumber: 4 });
      }
      if (freshMatch.set5_p1 != null) {
        sets.push({ player1: freshMatch.set5_p1, player2: freshMatch.set5_p2, tiebreak: freshMatch.set5_tb, setNumber: 5 });
      }
      
      // Override match data with authoritative values from matches table
      matchData = {
        ...matchData,
        sets: sets,
        status: freshMatch.status || matchData.status,
        winner: freshMatch.winner_code === 1 ? 'home' : freshMatch.winner_code === 2 ? 'away' : matchData.winner,
        winnerCode: freshMatch.winner_code || matchData.winnerCode,
        score: freshMatch.score || matchData.score,
        setsPlayer1: freshMatch.sets_player1 ?? matchData.setsPlayer1,
        setsPlayer2: freshMatch.sets_player2 ?? matchData.setsPlayer2,
        surface: freshMatch.surface || matchData.surface,
        round: freshMatch.round || matchData.round,
        bestOf: freshMatch.best_of || matchData.bestOf,
      };
      
      logger.debug(`Enriched match data from DB: status=${matchData.status}, score=${matchData.score}, sets=${sets.length}`);
    }
    
    return {
      match: matchData,
      tournament: snapshot.core_json?.tournament,
      player1: {
        ...(snapshot.players_json?.player1 || {}),
        stats: null, // Stats per player not in snapshot, load lazy if needed
        recentForm: [],
      },
      player2: {
        ...(snapshot.players_json?.player2 || {}),
        stats: null,
        recentForm: [],
      },
      h2h: snapshot.h2h_json
        ? {
            total: `${snapshot.h2h_json.player1_wins}-${snapshot.h2h_json.player2_wins}`,
            player1Wins: snapshot.h2h_json.player1_wins,
            player2Wins: snapshot.h2h_json.player2_wins,
            onHard: `${snapshot.h2h_json.hard_p1_wins || 0}-${snapshot.h2h_json.hard_p2_wins || 0}`,
            onClay: `${snapshot.h2h_json.clay_p1_wins || 0}-${snapshot.h2h_json.clay_p2_wins || 0}`,
            onGrass: `${snapshot.h2h_json.grass_p1_wins || 0}-${
              snapshot.h2h_json.grass_p2_wins || 0
            }`,
            lastMatch: snapshot.h2h_json.last_match_date,
          }
        : null,
      statistics: snapshot.stats_json,
      momentum: snapshot.momentum_json || [],
      pointByPoint: [], // Not in snapshot, load lazy via /api/match/:id/points
      odds: snapshot.odds_json,
      dataSources: (snapshot.data_sources_json || []).map((s) => s.source_type),
      dataQuality: snapshot.data_quality_int,
      fromSnapshot: true,
      snapshotUpdatedAt: snapshot.last_updated_at,
      // FILOSOFIA_TEMPORAL: as_of_time / generated_at for temporal semantics
      meta: {
        as_of_time: snapshot.last_updated_at,
        generated_at: snapshot.last_updated_at,
        // FILOSOFIA_LINEAGE_VERSIONING: bundle_schema and feature_version tracking
        versions: {
          bundle_schema: '1.0.0',
          feature_version: snapshot.core_json?.feature_version || 'v1.0.0',
          strategy_version: snapshot.core_json?.strategy_version || 'v1.0.0',
        },
        // FILOSOFIA_RISK_BANKROLL: risk/edge/stake when available
        risk: snapshot.core_json?.risk || null,
      },
    };
  }

  /**
   * Save card data as snapshot
   */
  async saveSnapshot(matchId, card) {
    if (!supabase || !card) return;

    const snapshot = {
      match_id: matchId,
      core_json: card.match,
      players_json: {
        player1: {
          id: card.player1?.id,
          name: card.player1?.name,
          country: card.player1?.country,
          currentRanking: card.player1?.currentRanking,
          rankingAtMatch: card.player1?.rankingAtMatch,
          seed: card.player1?.seed,
        },
        player2: {
          id: card.player2?.id,
          name: card.player2?.name,
          country: card.player2?.country,
          currentRanking: card.player2?.currentRanking,
          rankingAtMatch: card.player2?.rankingAtMatch,
          seed: card.player2?.seed,
        },
      },
      h2h_json: card.h2h
        ? {
            player1_wins: card.h2h.player1Wins,
            player2_wins: card.h2h.player2Wins,
            hard_p1_wins: parseInt(card.h2h.onHard?.split('-')[0]) || 0,
            hard_p2_wins: parseInt(card.h2h.onHard?.split('-')[1]) || 0,
            clay_p1_wins: parseInt(card.h2h.onClay?.split('-')[0]) || 0,
            clay_p2_wins: parseInt(card.h2h.onClay?.split('-')[1]) || 0,
            grass_p1_wins: parseInt(card.h2h.onGrass?.split('-')[0]) || 0,
            grass_p2_wins: parseInt(card.h2h.onGrass?.split('-')[1]) || 0,
            last_match_date: card.h2h.lastMatch,
          }
        : null,
      stats_json: card.statistics,
      momentum_json: card.momentum || [],
      odds_json: card.odds,
      data_sources_json: (card.dataSources || []).map((s) => ({ source_type: s })),
      // dataQuality può essere un oggetto {score, completeness, freshness} o un numero
      data_quality_int: typeof card.dataQuality === 'object' 
        ? (card.dataQuality?.score || 0) 
        : (card.dataQuality || 0),
      last_updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('match_card_snapshot')
      .upsert(snapshot, { onConflict: 'match_id' });

    if (error) {
      logger.error('Error saving snapshot:', error.message);
    } else {
      logger.info(`Snapshot saved for match ${matchId}`);
    }
  }

  /**
   * Ottiene la card completa di un match (LEGACY - multiple queries)
   * Preferire getMatchCardFromSnapshot() per performance
   */
  async getMatchCard(matchId) {
    if (!supabase) {
      logger.warn('Supabase not available');
      return null;
    }

    try {
      // 1. Dati base match con giocatori e torneo
      const matchData = await this.getMatchWithPlayers(matchId);
      if (!matchData) {
        return null;
      }

      // 2. Fetch parallelo di tutti i dati aggiuntivi
      const [
        player1Stats,
        player2Stats,
        player1RecentForm,
        player2RecentForm,
        h2h,
        matchStats,
        powerRankings,
        pointByPoint,
        odds,
        dataSources,
      ] = await Promise.all([
        this.getPlayerStats(matchData.player1_id, matchData.surface),
        this.getPlayerStats(matchData.player2_id, matchData.surface),
        this.getPlayerRecentForm(matchData.player1_id, 5),
        this.getPlayerRecentForm(matchData.player2_id, 5),
        this.getHeadToHead(matchData.player1_id, matchData.player2_id),
        this.getMatchStatistics(matchId),
        this.getPowerRankings(matchId),
        this.getPointByPoint(matchId),
        this.getOdds(matchId),
        this.getDataSources(matchId),
      ]);

      // 3. Calcola data quality
      const dataQuality = this.calculateDataQuality(
        dataSources,
        matchStats,
        powerRankings,
        pointByPoint
      );

      // 4. Assembla card
      return {
        // Match info
        match: {
          id: matchData.id,
          date: matchData.match_date,
          time: matchData.match_time,
          round: matchData.round,
          surface: matchData.surface,
          bestOf: matchData.best_of,
          status: matchData.status,
          score: matchData.score,
          setsPlayer1: matchData.sets_player1,
          setsPlayer2: matchData.sets_player2,
          sets: this.formatSets(matchData),
          winner: matchData.winner_code,
        },

        // Tournament
        tournament: {
          id: matchData.tournament_id,
          name: matchData.tournament_name,
          category: matchData.tournament_category,
          surface: matchData.surface,
        },

        // Player 1
        player1: {
          id: matchData.player1_id,
          name: matchData.player1_name,
          country: matchData.player1_country,
          currentRanking: matchData.player1_current_rank,
          rankingAtMatch: matchData.player1_rank,
          seed: matchData.player1_seed,
          stats: player1Stats,
          recentForm: player1RecentForm,
        },

        // Player 2
        player2: {
          id: matchData.player2_id,
          name: matchData.player2_name,
          country: matchData.player2_country,
          currentRanking: matchData.player2_current_rank,
          rankingAtMatch: matchData.player2_rank,
          seed: matchData.player2_seed,
          stats: player2Stats,
          recentForm: player2RecentForm,
        },

        // H2H
        h2h: h2h
          ? {
              total: `${h2h.player1_wins}-${h2h.player2_wins}`,
              player1Wins: h2h.player1_wins,
              player2Wins: h2h.player2_wins,
              onHard: `${h2h.hard_p1_wins}-${h2h.hard_p2_wins}`,
              onClay: `${h2h.clay_p1_wins}-${h2h.clay_p2_wins}`,
              onGrass: `${h2h.grass_p1_wins}-${h2h.grass_p2_wins}`,
              lastMatch: h2h.last_match_date,
            }
          : null,

        // Match details
        statistics: matchStats,
        momentum: powerRankings,
        pointByPoint: pointByPoint,

        // FILOSOFIA_ODDS: odds structured in header (current) and tabs (history)
        // header.odds = current/live odds for immediate display
        // tabs.odds = historical odds data
        odds: this.structureOdds(odds),

        // Metadata
        dataSources: dataSources.map((s) => s.source_type),
        // FILOSOFIA_DB: dataQuality MUST have completeness and freshness
        dataQuality: {
          score: dataQuality,
          completeness: this.calculateCompleteness(
            dataSources,
            matchStats,
            powerRankings,
            pointByPoint
          ),
          freshness: this.calculateFreshness(dataSources),
        },
      };
    } catch (error) {
      console.error('Error getting match card:', error);
      throw error;
    }
  }

  /**
   * FILOSOFIA_ODDS: Structure odds for header (current) and tabs (historical)
   *
   * @param {Object} rawOdds - Raw odds from getOdds
   * @returns {Object} Structured odds with header and tabs sections
   */
  structureOdds(rawOdds) {
    if (!rawOdds) return null;

    return {
      // Current/live odds for header display (RightRail)
      current: rawOdds.closing || rawOdds.opening || null,

      // Opening and closing for analysis
      opening: rawOdds.opening,
      closing: rawOdds.closing,

      // Full history for tabs/OddsTab
      history: rawOdds.all || [],

      // Movement indicators
      movement:
        rawOdds.closing && rawOdds.opening
          ? {
              p1: rawOdds.closing.p1 - rawOdds.opening.p1,
              p2: rawOdds.closing.p2 - rawOdds.opening.p2,
            }
          : null,

      // Implied probabilities
      implied: rawOdds.closing
        ? {
            p1: rawOdds.closing.p1 ? (1 / rawOdds.closing.p1) * 100 : null,
            p2: rawOdds.closing.p2 ? (1 / rawOdds.closing.p2) * 100 : null,
            overround:
              rawOdds.closing.p1 && rawOdds.closing.p2
                ? (1 / rawOdds.closing.p1 + 1 / rawOdds.closing.p2 - 1) * 100
                : null,
          }
        : null,
    };
  }

  /**
   * Ottiene match con dati giocatori dalla view
   */
  async getMatchWithPlayers(matchId) {
    const { data, error } = await supabase
      .from('v_matches_with_players')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error) {
      console.error('Error fetching match:', error);
      return null;
    }
    return data;
  }

  /**
   * Ottiene statistiche carriera di un giocatore per superficie
   */
  async getPlayerStats(playerId, surface = 'all') {
    if (!playerId) return null;

    const { data, error } = await supabase
      .from('player_career_stats')
      .select('*')
      .eq('player_id', playerId)
      .in('surface', [surface, 'all'])
      .order('surface', { ascending: surface === 'all' });

    if (error || !data || data.length === 0) {
      return null;
    }

    // Prendi stats specifiche per superficie se disponibili, altrimenti overall
    const surfaceStats = data.find((s) => s.surface === surface);
    const overallStats = data.find((s) => s.surface === 'all');

    return {
      surface: surfaceStats || null,
      overall: overallStats || null,
      // Stats principali
      matchesPlayed: (surfaceStats || overallStats)?.matches_played || 0,
      winPercentage: (surfaceStats || overallStats)?.win_percentage || 0,
      firstServePct: (surfaceStats || overallStats)?.first_serve_pct || 0,
      firstServeWonPct: (surfaceStats || overallStats)?.first_serve_won_pct || 0,
      returnGamesWonPct: (surfaceStats || overallStats)?.return_games_won_pct || 0,
    };
  }

  /**
   * Ottiene forma recente (ultimi N match)
   */
  async getPlayerRecentForm(playerId, limit = 5) {
    if (!playerId) return [];

    const { data, error } = await supabase
      .from('matches')
      .select(
        `
        id, match_date, round, surface, score, winner_id,
        player1_id, player2_id,
        tournament:tournaments_new(name)
      `
      )
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .eq('status', 'finished')
      .order('match_date', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((m) => ({
      date: m.match_date,
      tournament: m.tournament?.name,
      round: m.round,
      surface: m.surface,
      result: m.winner_id === playerId ? 'W' : 'L',
      score: m.score,
    }));
  }

  /**
   * Ottiene H2H tra due giocatori
   */
  async getHeadToHead(player1Id, player2Id) {
    if (!player1Id || !player2Id) return null;

    // Ordina IDs per consistenza
    const [p1, p2] = player1Id < player2Id ? [player1Id, player2Id] : [player2Id, player1Id];

    const { data, error } = await supabase
      .from('head_to_head')
      .select('*')
      .eq('player1_id', p1)
      .eq('player2_id', p2)
      .single();

    if (error) return null;

    // Se l'ordine nel DB Ã¨ diverso, inverti i risultati
    if (player1Id !== p1) {
      return {
        ...data,
        player1_wins: data.player2_wins,
        player2_wins: data.player1_wins,
        hard_p1_wins: data.hard_p2_wins,
        hard_p2_wins: data.hard_p1_wins,
        clay_p1_wins: data.clay_p2_wins,
        clay_p2_wins: data.clay_p1_wins,
        grass_p1_wins: data.grass_p2_wins,
        grass_p2_wins: data.grass_p1_wins,
      };
    }

    return data;
  }

  /**
   * Ottiene statistiche del match
   */
  async getMatchStatistics(matchId) {
    const { data, error } = await supabase
      .from('match_statistics')
      .select('*')
      .eq('match_id', matchId)
      .order('period');

    if (error || !data) return null;

    // Organizza per periodo
    const byPeriod = {};
    for (const stat of data) {
      byPeriod[stat.period] = stat;
    }

    return byPeriod;
  }

  /**
   * Ottiene power rankings (momentum)
   * PRIORITÀ: Se value_svg è presente, ha la precedenza su value (dati live)
   */
  async getPowerRankings(matchId) {
    const { data, error } = await supabase
      .from('match_power_rankings')
      .select('*')
      .eq('match_id', matchId)
      .order('set_number')
      .order('game_number');

    if (error) return [];
    
    // Applica priorità SVG: se value_svg presente, sovrascrive value
    const processed = (data || []).map(row => {
      if (row.value_svg != null) {
        return {
          ...row,
          value: row.value_svg,
          source: 'svg_manual',
          _original_value: row.value,
        };
      }
      return row;
    });
    
    return processed;
  }

  /**
   * Ottiene point by point
   */
  async getPointByPoint(matchId) {
    const { data, error } = await supabase
      .from('match_point_by_point')
      .select('*')
      .eq('match_id', matchId)
      .order('set_number')
      .order('game_number')
      .order('point_number');

    if (error) return [];
    return data || [];
  }

  /**
   * Ottiene quote
   */
  async getOdds(matchId) {
    const { data, error } = await supabase
      .from('match_odds')
      .select('*')
      .eq('match_id', matchId)
      .order('recorded_at');

    if (error || !data || data.length === 0) return null;

    // Trova opening e closing
    const opening = data.find((o) => o.is_opening) || data[0];
    const closing = data.find((o) => o.is_closing) || data[data.length - 1];

    return {
      opening: opening ? { p1: opening.odds_player1, p2: opening.odds_player2 } : null,
      closing: closing ? { p1: closing.odds_player1, p2: closing.odds_player2 } : null,
      all: data,
    };
  }

  /**
   * Ottiene le fonti dati
   */
  async getDataSources(matchId) {
    const { data, error } = await supabase
      .from('match_data_sources')
      .select('*')
      .eq('match_id', matchId);

    if (error) return [];
    return data || [];
  }

  /**
   * Formatta i set per display
   */
  formatSets(match) {
    const sets = [];
    for (let i = 1; i <= 5; i++) {
      const p1 = match[`set${i}_p1`];
      const p2 = match[`set${i}_p2`];
      if (p1 !== null && p2 !== null) {
        sets.push({
          setNumber: i,
          player1: p1,
          player2: p2,
          tiebreak: match[`set${i}_tb`],
        });
      }
    }
    return sets;
  }

  /**
   * Calcola qualitÃ  dati (0-100)
   */
  calculateDataQuality(sources, stats, momentum, pointByPoint) {
    let quality = 0;

    // Base: ha almeno una fonte
    if (sources.length > 0) quality += 20;
    if (sources.length > 1) quality += 10; // Bonus per multiple fonti

    // Ha statistiche
    if (stats && Object.keys(stats).length > 0) quality += 25;

    // Ha momentum
    if (momentum && momentum.length > 0) quality += 25;

    // Ha point by point
    if (pointByPoint && pointByPoint.length > 0) quality += 20;

    return Math.min(100, quality);
  }

  /**
   * FILOSOFIA_DB: Calculate data completeness (0-100)
   * Measures how much data is available vs expected
   */
  calculateCompleteness(sources, stats, momentum, pointByPoint) {
    let completeness = 0;
    const expectedFields = 5; // sources, stats, momentum, pbp, odds
    let presentFields = 0;

    if (sources && sources.length > 0) presentFields++;
    if (stats && Object.keys(stats).length > 0) presentFields++;
    if (momentum && momentum.length > 0) presentFields++;
    if (pointByPoint && pointByPoint.length > 0) presentFields++;

    // Calculate percentage
    completeness = Math.round((presentFields / expectedFields) * 100);

    // Bonus for having multiple sources
    if (sources && sources.length > 1) completeness = Math.min(100, completeness + 10);

    return completeness;
  }

  /**
   * FILOSOFIA_DB: Calculate data freshness (0-100)
   * Measures how recent the data is
   */
  calculateFreshness(sources) {
    if (!sources || sources.length === 0) return 0;

    const now = new Date();
    let newestTimestamp = null;

    for (const source of sources) {
      const timestamp = source.scraped_at || source.created_at || source.updated_at;
      if (timestamp) {
        const sourceDate = new Date(timestamp);
        if (!newestTimestamp || sourceDate > newestTimestamp) {
          newestTimestamp = sourceDate;
        }
      }
    }

    if (!newestTimestamp) return 50; // Default if no timestamps

    const ageMs = now - newestTimestamp;
    const ageHours = ageMs / (1000 * 60 * 60);

    // Freshness degrades over time
    // < 1 hour = 100, < 6 hours = 80, < 24 hours = 60, < 48 hours = 40, else 20
    if (ageHours < 1) return 100;
    if (ageHours < 6) return 80;
    if (ageHours < 24) return 60;
    if (ageHours < 48) return 40;
    return 20;
  }

  /**
   * FILOSOFIA_TEMPORAL: Validate meta block has required fields
   * ERR-010: Bundle must validate temporal coherence (no future data in bundle)
   */
  validateMetaBlock(meta, matchDate) {
    const errors = [];

    // Check required meta fields
    if (!meta) {
      errors.push('meta block is required');
      return { valid: false, errors };
    }

    if (!meta.as_of_time && !meta.generated_at) {
      errors.push('meta.as_of_time or meta.generated_at is required');
    }

    if (!meta.versions) {
      errors.push('meta.versions is required for lineage tracking');
    }

    // FILOSOFIA_TEMPORAL: No future data in bundle
    const asOfTime = new Date(meta.as_of_time || meta.generated_at);
    const now = new Date();

    if (asOfTime > now) {
      errors.push(`Temporal violation: as_of_time (${asOfTime.toISOString()}) is in the future`);
    }

    // If matchDate provided, check temporal coherence
    if (matchDate) {
      const match = new Date(matchDate);
      // Data should not reference times before match started (for live data)
      // This is a warning, not a hard error
    }

    return {
      valid: errors.length === 0,
      errors,
      meta: {
        ...meta,
        validated_at: new Date().toISOString(),
      },
    };
  }

  /**
   * WARN-024: Validate bundle meta block before returning
   */
  ensureMetaBlock(bundle) {
    if (!bundle) return bundle;

    // Ensure meta block exists with required fields
    if (!bundle.meta) {
      bundle.meta = {
        as_of_time: new Date().toISOString(),
        generated_at: new Date().toISOString(),
        versions: {
          bundle_schema: '1.0.0',
          feature_version: 'v1.0.0',
          strategy_version: 'v1.0.0',
        },
      };
    }

    // Validate and add validation timestamp
    const validation = this.validateMetaBlock(bundle.meta, bundle.match?.date);
    bundle.meta._validation = validation;

    return bundle;
  }

  /**
   * Lista match recenti con card minimali
   */
  async getRecentMatches(limit = 20, filters = {}) {
    let query = supabase
      .from('v_matches_with_players')
      .select('*')
      .order('match_date', { ascending: false })
      .limit(limit);

    if (filters.surface) {
      query = query.eq('surface', filters.surface);
    }
    if (filters.tournament) {
      query = query.eq('tournament_id', filters.tournament);
    }
    if (filters.playerId) {
      query = query.or(`player1_id.eq.${filters.playerId},player2_id.eq.${filters.playerId}`);
    }

    const { data, error } = await query;

    if (error) return [];

    return data.map((m) => ({
      id: m.id,
      date: m.match_date,
      tournament: m.tournament_name,
      round: m.round,
      surface: m.surface,
      player1: {
        name: m.player1_name,
        country: m.player1_country,
        ranking: m.player1_rank,
      },
      player2: {
        name: m.player2_name,
        country: m.player2_country,
        ranking: m.player2_rank,
      },
      score: m.score,
      winner: m.winner_code,
    }));
  }
}

// FILOSOFIA_LINEAGE_VERSIONING: Export module instance and version constants
const matchCardService = new MatchCardService();

module.exports = matchCardService;
module.exports.MATCH_CARD_SERVICE_VERSION = MATCH_CARD_SERVICE_VERSION;
module.exports.DATA_VERSION = DATA_VERSION;



