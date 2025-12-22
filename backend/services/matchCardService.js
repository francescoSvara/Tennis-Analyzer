/**
 * Match Card Service
 * 
 * Assembla i dati per le card match da multiple fonti:
 * - Dati base match (matches_new)
 * - Dati giocatori (players_new + stats)
 * - Statistiche match (match_statistics_new)
 * - Momentum (match_power_rankings_new)
 * - Point by Point
 * - Odds
 * - H2H
 */

const { supabase } = require('../db/supabase');

class MatchCardService {
  
  /**
   * Ottiene la card completa di un match
   */
  async getMatchCard(matchId) {
    if (!supabase) {
      console.warn('⚠️ Supabase not available');
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
        dataSources
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
        this.getDataSources(matchId)
      ]);

      // 3. Calcola data quality
      const dataQuality = this.calculateDataQuality(dataSources, matchStats, powerRankings, pointByPoint);

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
          winner: matchData.winner_code
        },

        // Tournament
        tournament: {
          id: matchData.tournament_id,
          name: matchData.tournament_name,
          category: matchData.tournament_category,
          surface: matchData.surface
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
          recentForm: player1RecentForm
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
          recentForm: player2RecentForm
        },

        // H2H
        h2h: h2h ? {
          total: `${h2h.player1_wins}-${h2h.player2_wins}`,
          player1Wins: h2h.player1_wins,
          player2Wins: h2h.player2_wins,
          onHard: `${h2h.hard_p1_wins}-${h2h.hard_p2_wins}`,
          onClay: `${h2h.clay_p1_wins}-${h2h.clay_p2_wins}`,
          onGrass: `${h2h.grass_p1_wins}-${h2h.grass_p2_wins}`,
          lastMatch: h2h.last_match_date
        } : null,

        // Match details
        statistics: matchStats,
        momentum: powerRankings,
        pointByPoint: pointByPoint,
        odds: odds,

        // Metadata
        dataSources: dataSources.map(s => s.source_type),
        dataQuality: dataQuality
      };

    } catch (error) {
      console.error('Error getting match card:', error);
      throw error;
    }
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
    const surfaceStats = data.find(s => s.surface === surface);
    const overallStats = data.find(s => s.surface === 'all');

    return {
      surface: surfaceStats || null,
      overall: overallStats || null,
      // Stats principali
      matchesPlayed: (surfaceStats || overallStats)?.matches_played || 0,
      winPercentage: (surfaceStats || overallStats)?.win_percentage || 0,
      firstServePct: (surfaceStats || overallStats)?.first_serve_pct || 0,
      firstServeWonPct: (surfaceStats || overallStats)?.first_serve_won_pct || 0,
      returnGamesWonPct: (surfaceStats || overallStats)?.return_games_won_pct || 0
    };
  }

  /**
   * Ottiene forma recente (ultimi N match)
   */
  async getPlayerRecentForm(playerId, limit = 5) {
    if (!playerId) return [];

    const { data, error } = await supabase
      .from('matches_new')
      .select(`
        id, match_date, round, surface, score, winner_id,
        player1_id, player2_id,
        tournament:tournaments_new(name)
      `)
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .eq('status', 'finished')
      .order('match_date', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(m => ({
      date: m.match_date,
      tournament: m.tournament?.name,
      round: m.round,
      surface: m.surface,
      result: m.winner_id === playerId ? 'W' : 'L',
      score: m.score
    }));
  }

  /**
   * Ottiene H2H tra due giocatori
   */
  async getHeadToHead(player1Id, player2Id) {
    if (!player1Id || !player2Id) return null;

    // Ordina IDs per consistenza
    const [p1, p2] = player1Id < player2Id 
      ? [player1Id, player2Id] 
      : [player2Id, player1Id];

    const { data, error } = await supabase
      .from('head_to_head')
      .select('*')
      .eq('player1_id', p1)
      .eq('player2_id', p2)
      .single();

    if (error) return null;

    // Se l'ordine nel DB è diverso, inverti i risultati
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
        grass_p2_wins: data.grass_p1_wins
      };
    }

    return data;
  }

  /**
   * Ottiene statistiche del match
   */
  async getMatchStatistics(matchId) {
    const { data, error } = await supabase
      .from('match_statistics_new')
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
   */
  async getPowerRankings(matchId) {
    const { data, error } = await supabase
      .from('match_power_rankings_new')
      .select('*')
      .eq('match_id', matchId)
      .order('set_number')
      .order('game_number');

    if (error) return [];
    return data || [];
  }

  /**
   * Ottiene point by point
   */
  async getPointByPoint(matchId) {
    const { data, error } = await supabase
      .from('match_point_by_point_new')
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
    const opening = data.find(o => o.is_opening) || data[0];
    const closing = data.find(o => o.is_closing) || data[data.length - 1];

    return {
      opening: opening ? { p1: opening.odds_player1, p2: opening.odds_player2 } : null,
      closing: closing ? { p1: closing.odds_player1, p2: closing.odds_player2 } : null,
      all: data
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
          tiebreak: match[`set${i}_tb`]
        });
      }
    }
    return sets;
  }

  /**
   * Calcola qualità dati (0-100)
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
   * Cerca match per giocatore e data
   */
  async findMatch(player1Name, player2Name, matchDate) {
    // Normalizza nomi
    const { data: alias1 } = await supabase
      .rpc('normalize_player_name', { name: player1Name });
    const { data: alias2 } = await supabase
      .rpc('normalize_player_name', { name: player2Name });

    // Cerca player IDs
    const { data: players } = await supabase
      .from('player_aliases')
      .select('player_id, alias_normalized')
      .in('alias_normalized', [alias1, alias2]);

    if (!players || players.length < 2) return null;

    const p1Id = players.find(p => p.alias_normalized === alias1)?.player_id;
    const p2Id = players.find(p => p.alias_normalized === alias2)?.player_id;

    if (!p1Id || !p2Id) return null;

    // Cerca match
    const { data: match } = await supabase
      .from('matches_new')
      .select('id')
      .or(`and(player1_id.eq.${p1Id},player2_id.eq.${p2Id}),and(player1_id.eq.${p2Id},player2_id.eq.${p1Id})`)
      .gte('match_date', new Date(new Date(matchDate).getTime() - 86400000).toISOString().split('T')[0])
      .lte('match_date', new Date(new Date(matchDate).getTime() + 86400000).toISOString().split('T')[0])
      .single();

    return match?.id || null;
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

    return data.map(m => ({
      id: m.id,
      date: m.match_date,
      tournament: m.tournament_name,
      round: m.round,
      surface: m.surface,
      player1: {
        name: m.player1_name,
        country: m.player1_country,
        ranking: m.player1_rank
      },
      player2: {
        name: m.player2_name,
        country: m.player2_country,
        ranking: m.player2_rank
      },
      score: m.score,
      winner: m.winner_code
    }));
  }
}

module.exports = new MatchCardService();
