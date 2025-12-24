/**
 * Raw Events Processor
 * 
 * Pipeline per processare eventi raw e canonicalizzarli nelle tabelle standard.
 * 
 * Flusso:
 * 1. ingest() - Inserisce payload originale in raw_events (status=PENDING)
 * 2. processRawEvents() - Worker che processa eventi PENDING
 * 3. canonicalize() - Normalizza e inserisce in tabelle canoniche
 * 
 * Vantaggi:
 * - Dati originali sempre disponibili per reprocessing
 * - Audit trail completo
 * - Separazione import/normalizzazione
 * - Idempotenza garantita
 */

const { supabase } = require('../db/supabase');
const { enqueueTask } = require('./calculationQueueWorker');
const { createLogger } = require('../utils/logger');

const logger = createLogger('RawEventsProcessor');

class RawEventsProcessor {
  constructor(options = {}) {
    this.isRunning = false;
    this.pollIntervalMs = options.pollIntervalMs || 500;
    this.batchSize = options.batchSize || 50;
    this.pollTimer = null;
    this.stats = {
      ingested: 0,
      processed: 0,
      errors: 0,
      startedAt: null
    };
  }

  // ============================================================================
  // INGESTION
  // ============================================================================

  /**
   * Ingest raw data from any source
   * @param {string} sourceType - 'sofascore' or 'xlsx'
   * @param {string} sourceEntity - 'match', 'player', 'tournament', 'stats', 'odds', 'points'
   * @param {string} sourceKey - Unique key (eventId, row identifier, etc.)
   * @param {object} payload - Raw data payload
   * @returns {number|null} - raw_event id
   */
  async ingest(sourceType, sourceEntity, sourceKey, payload) {
    if (!supabase) {
      logger.warn('Supabase not available');
      return null;
    }

    const { data, error } = await supabase
      .from('raw_events')
      .upsert({
        source_type: sourceType,
        source_entity: sourceEntity,
        source_key: String(sourceKey),
        payload_json: payload,
        processing_status: 'PENDING',
        processed_at: null,
        error_text: null,
        retry_count: 0,
        ingested_at: new Date().toISOString()
      }, { 
        onConflict: 'source_type,source_entity,source_key',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (error) {
      logger.error(`Ingest error (${sourceType}/${sourceEntity}):`, error.message);
      return null;
    }

    this.stats.ingested++;
    return data?.id;
  }

  /**
   * Batch ingest multiple events
   */
  async ingestBatch(events) {
    if (!supabase || !events?.length) return [];

    const records = events.map(e => ({
      source_type: e.sourceType,
      source_entity: e.sourceEntity,
      source_key: String(e.sourceKey),
      payload_json: e.payload,
      processing_status: 'PENDING',
      ingested_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('raw_events')
      .upsert(records, { 
        onConflict: 'source_type,source_entity,source_key',
        ignoreDuplicates: false
      })
      .select('id');

    if (error) {
      console.error('❌ Batch ingest error:', error.message);
      return [];
    }

    this.stats.ingested += data?.length || 0;
    return data?.map(d => d.id) || [];
  }

  // ============================================================================
  // WORKER
  // ============================================================================

  /**
   * Start the processing worker
   */
  start() {
    if (this.isRunning) {
      logger.warn('Raw Events Processor already running');
      return;
    }

    this.isRunning = true;
    this.stats.startedAt = new Date();
    logger.info('Raw Events Processor started');
    
    this.poll();
  }

  /**
   * Stop the worker
   */
  stop() {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    logger.info('Raw Events Processor stopped');
    logger.info(`Stats: Ingested=${this.stats.ingested}, Processed=${this.stats.processed}, Errors=${this.stats.errors}`);
  }

  /**
   * Main poll loop
   */
  async poll() {
    if (!this.isRunning) return;

    try {
      const processed = await this.processBatch();
      
      // If we processed something, poll immediately; otherwise wait
      if (processed > 0) {
        setImmediate(() => this.poll());
        return;
      }
    } catch (error) {
      logger.error('Poll error:', error.message);
    }

    this.pollTimer = setTimeout(() => this.poll(), this.pollIntervalMs);
  }

  /**
   * Process a batch of pending events
   */
  async processBatch() {
    if (!supabase) return 0;

    // Fetch pending events
    const { data: events, error } = await supabase
      .from('raw_events')
      .select('*')
      .eq('processing_status', 'PENDING')
      .order('ingested_at', { ascending: true })
      .limit(this.batchSize);

    if (error || !events?.length) return 0;

    let processed = 0;

    for (const event of events) {
      try {
        // Mark as processing
        await supabase
          .from('raw_events')
          .update({ processing_status: 'PROCESSING' })
          .eq('id', event.id);

        // Canonicalize
        await this.canonicalize(event);

        // Mark as done
        await supabase
          .from('raw_events')
          .update({ 
            processing_status: 'DONE', 
            processed_at: new Date().toISOString(),
            error_text: null
          })
          .eq('id', event.id);

        this.stats.processed++;
        processed++;

      } catch (err) {
        console.error(`❌ Error processing event ${event.id}:`, err.message);
        
        await supabase
          .from('raw_events')
          .update({ 
            processing_status: 'ERROR', 
            error_text: err.message,
            retry_count: (event.retry_count || 0) + 1
          })
          .eq('id', event.id);

        this.stats.errors++;
      }
    }

    return processed;
  }

  // ============================================================================
  // CANONICALIZATION
  // ============================================================================

  /**
   * Main canonicalization dispatcher
   */
  async canonicalize(event) {
    const { source_type, source_entity, payload_json } = event;
    const payload = payload_json;

    switch (`${source_type}:${source_entity}`) {
      // XLSX Sources
      case 'xlsx:match':
        await this.canonicalizeXlsxMatch(payload);
        break;

      // SofaScore Sources
      case 'sofascore:match':
        await this.canonicalizeSofascoreMatch(payload);
        break;

      case 'sofascore:stats':
        await this.canonicalizeSofascoreStats(payload);
        break;

      case 'sofascore:points':
        await this.canonicalizeSofascorePoints(payload);
        break;

      case 'sofascore:momentum':
        await this.canonicalizeSofascoreMomentum(payload);
        break;

      case 'sofascore:player':
        await this.canonicalizeSofascorePlayer(payload);
        break;

      case 'sofascore:tournament':
        await this.canonicalizeSofascoreTournament(payload);
        break;

      default:
        console.warn(`⚠️ Unknown event type: ${source_type}:${source_entity}`);
    }
  }

  // ============================================================================
  // XLSX CANONICALIZATION
  // ============================================================================

  /**
   * Canonicalize XLSX match row
   */
  async canonicalizeXlsxMatch(payload) {
    // Normalize player names
    const winner = payload.Winner || payload.winner;
    const loser = payload.Loser || payload.loser;
    
    if (!winner || !loser) {
      throw new Error('Missing Winner or Loser in XLSX payload');
    }

    // Find or create players
    const player1Id = await this.findOrCreatePlayer(winner, payload.WRank);
    const player2Id = await this.findOrCreatePlayer(loser, payload.LRank);

    // Find or create tournament
    const tournamentId = await this.findOrCreateTournament(payload.Tournament, payload.Surface);

    // Parse date
    const matchDate = this.parseXlsxDate(payload.Date);

    // Determine winner
    const winnerId = player1Id; // Winner is always player1 in XLSX

    // Build match data
    const matchData = {
      player1_id: player1Id,
      player2_id: player2Id,
      winner_id: winnerId,
      tournament_id: tournamentId,
      match_date: matchDate,
      round: payload.Round,
      surface: payload.Surface,
      best_of: parseInt(payload['Best of'] || payload.BestOf || payload.best_of) || 3,
      status: 'finished',
      winner_code: 1,
      player1_rank: parseInt(payload.WRank) || null,
      player2_rank: parseInt(payload.LRank) || null,
      // Set scores
      set1_p1: parseInt(payload.W1) || null,
      set1_p2: parseInt(payload.L1) || null,
      set2_p1: parseInt(payload.W2) || null,
      set2_p2: parseInt(payload.L2) || null,
      set3_p1: parseInt(payload.W3) || null,
      set3_p2: parseInt(payload.L3) || null,
      set4_p1: parseInt(payload.W4) || null,
      set4_p2: parseInt(payload.L4) || null,
      set5_p1: parseInt(payload.W5) || null,
      set5_p2: parseInt(payload.L5) || null
    };

    // Calculate sets won
    matchData.sets_player1 = this.countSetsWon(matchData, 1);
    matchData.sets_player2 = this.countSetsWon(matchData, 2);

    // Build score string
    matchData.score = this.buildScoreString(matchData);

    // Upsert match
    const matchId = await this.upsertMatch(matchData, 'xlsx');

    // Insert odds if present
    await this.insertXlsxOdds(matchId, payload);

    // Enqueue calculations
    if (matchId) {
      await this.enqueueMatchCalculations(matchId, player1Id, player2Id);
    }

    return matchId;
  }

  /**
   * Insert odds from XLSX data
   */
  async insertXlsxOdds(matchId, payload) {
    const oddsBookmakers = [
      { prefix: 'B365', name: 'Bet365' },
      { prefix: 'PS', name: 'Pinnacle' },
      { prefix: 'Max', name: 'MaxOdds' },
      { prefix: 'Avg', name: 'Average' }
    ];

    for (const bm of oddsBookmakers) {
      const odds1 = parseFloat(payload[`${bm.prefix}W`]);
      const odds2 = parseFloat(payload[`${bm.prefix}L`]);

      if (odds1 && odds2 && odds1 > 1 && odds2 > 1) {
        await supabase
          .from('match_odds')
          .upsert({
            match_id: matchId,
            bookmaker: bm.name,
            odds_type: 'match_winner',
            odds_player1: odds1,
            odds_player2: odds2,
            is_opening: bm.prefix === 'B365', // Use Bet365 as opening
            is_closing: bm.prefix === 'Avg', // Use Average as closing
          }, { onConflict: 'match_id,bookmaker,odds_type' });
      }
    }
  }

  // ============================================================================
  // SOFASCORE CANONICALIZATION
  // ============================================================================

  /**
   * Canonicalize SofaScore match
   */
  async canonicalizeSofascoreMatch(payload) {
    const event = payload.event || payload;
    
    // Extract players
    const homePlayer = event.homeTeam || event.home;
    const awayPlayer = event.awayTeam || event.away;
    
    if (!homePlayer || !awayPlayer) {
      throw new Error('Missing home or away player in SofaScore payload');
    }

    // Find or create players with SofaScore ID
    const player1Id = await this.findOrCreatePlayerSofascore(homePlayer);
    const player2Id = await this.findOrCreatePlayerSofascore(awayPlayer);

    // Find or create tournament
    const tournament = event.tournament || event.uniqueTournament;
    const tournamentId = await this.findOrCreateTournamentSofascore(tournament);

    // Parse timestamp
    const matchDate = event.startTimestamp 
      ? new Date(event.startTimestamp * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Determine winner
    let winnerId = null;
    let winnerCode = null;
    if (event.winnerCode === 1) {
      winnerId = player1Id;
      winnerCode = 1;
    } else if (event.winnerCode === 2) {
      winnerId = player2Id;
      winnerCode = 2;
    }

    // Extract scores
    const homeScore = event.homeScore || {};
    const awayScore = event.awayScore || {};

    const matchData = {
      player1_id: player1Id,
      player2_id: player2Id,
      winner_id: winnerId,
      tournament_id: tournamentId,
      match_date: matchDate,
      start_timestamp: event.startTimestamp,
      round: this.normalizeRound(event.roundInfo?.name || event.round),
      surface: tournament?.groundType || event.groundType,
      best_of: event.bestOf || 3,
      status: this.mapSofascoreStatus(event.status?.type),
      winner_code: winnerCode,
      player1_rank: homePlayer.ranking,
      player2_rank: awayPlayer.ranking,
      player1_seed: event.homeTeamSeed,
      player2_seed: event.awayTeamSeed,
      // Set scores
      set1_p1: homeScore.period1,
      set1_p2: awayScore.period1,
      set2_p1: homeScore.period2,
      set2_p2: awayScore.period2,
      set3_p1: homeScore.period3,
      set3_p2: awayScore.period3,
      set4_p1: homeScore.period4,
      set4_p2: awayScore.period4,
      set5_p1: homeScore.period5,
      set5_p2: awayScore.period5
    };

    // Calculate sets won
    matchData.sets_player1 = homeScore.current || this.countSetsWon(matchData, 1);
    matchData.sets_player2 = awayScore.current || this.countSetsWon(matchData, 2);

    // Build score string
    matchData.score = this.buildScoreString(matchData);

    // Upsert match
    const matchId = await this.upsertMatch(matchData, 'sofascore', event.id);

    // Enqueue calculations
    if (matchId) {
      await this.enqueueMatchCalculations(matchId, player1Id, player2Id);
    }

    return matchId;
  }

  /**
   * Canonicalize SofaScore statistics
   */
  async canonicalizeSofascoreStats(payload) {
    const { matchId, statistics } = payload;
    
    if (!matchId || !statistics) {
      throw new Error('Missing matchId or statistics in payload');
    }

    // Process each period
    for (const periodStats of statistics) {
      const period = periodStats.period || 'ALL';
      const groups = periodStats.groups || [];

      const statsData = {
        match_id: matchId,
        period: period
      };

      // Parse stats groups
      for (const group of groups) {
        for (const item of group.statisticsItems || []) {
          const home = item.home;
          const away = item.away;
          
          switch (item.name?.toLowerCase()) {
            case 'aces':
              statsData.p1_aces = parseInt(home);
              statsData.p2_aces = parseInt(away);
              break;
            case 'double faults':
              statsData.p1_double_faults = parseInt(home);
              statsData.p2_double_faults = parseInt(away);
              break;
            case 'first serve percentage':
              statsData.p1_first_serve_pct = parseFloat(home);
              statsData.p2_first_serve_pct = parseFloat(away);
              break;
            case 'break points won':
              const bpHome = this.parseWonTotal(home);
              const bpAway = this.parseWonTotal(away);
              statsData.p1_break_points_won = bpHome.won;
              statsData.p1_break_points_total = bpHome.total;
              statsData.p2_break_points_won = bpAway.won;
              statsData.p2_break_points_total = bpAway.total;
              break;
            case 'total points won':
              statsData.p1_total_points_won = parseInt(home);
              statsData.p2_total_points_won = parseInt(away);
              break;
            case 'winners':
              statsData.p1_winners = parseInt(home);
              statsData.p2_winners = parseInt(away);
              break;
            case 'unforced errors':
              statsData.p1_unforced_errors = parseInt(home);
              statsData.p2_unforced_errors = parseInt(away);
              break;
          }
        }
      }

      // Upsert statistics
      await supabase
        .from('match_statistics_new')
        .upsert(statsData, { onConflict: 'match_id,period' });
    }

    // Update data source
    await this.updateDataSource(matchId, 'sofascore', { has_statistics: true });

    // Rebuild snapshot
    await enqueueTask('REBUILD_MATCH_SNAPSHOT', { match_id: matchId }, `snapshot_${matchId}`);
  }

  /**
   * Canonicalize SofaScore power rankings (momentum)
   */
  async canonicalizeSofascoreMomentum(payload) {
    const { matchId, powerRankings } = payload;
    
    if (!matchId || !powerRankings?.length) {
      throw new Error('Missing matchId or powerRankings in payload');
    }

    const records = [];
    
    for (const pr of powerRankings) {
      records.push({
        match_id: matchId,
        set_number: pr.set || 1,
        game_number: pr.game || 1,
        value: pr.value,
        zone: this.getValueZone(pr.value),
        favored_player: pr.value > 0 ? 1 : pr.value < 0 ? 2 : null,
        break_occurred: pr.breakOccurred || false
      });
    }

    // Delete existing and insert new
    await supabase
      .from('match_power_rankings_new')
      .delete()
      .eq('match_id', matchId);

    await supabase
      .from('match_power_rankings_new')
      .insert(records);

    // Update data source
    await this.updateDataSource(matchId, 'sofascore', { has_power_rankings: true });

    // Rebuild snapshot
    await enqueueTask('REBUILD_MATCH_SNAPSHOT', { match_id: matchId }, `snapshot_${matchId}`);
  }

  /**
   * Canonicalize SofaScore point-by-point
   */
  async canonicalizeSofascorePoints(payload) {
    const { matchId, pointByPoint } = payload;
    
    if (!matchId || !pointByPoint) {
      throw new Error('Missing matchId or pointByPoint in payload');
    }

    const records = [];
    
    // Parse point-by-point structure
    for (const setData of (pointByPoint.sets || [])) {
      const setNumber = setData.set || 1;
      
      for (const gameData of (setData.games || [])) {
        const gameNumber = gameData.game || 1;
        
        for (let i = 0; i < (gameData.points || []).length; i++) {
          const point = gameData.points[i];
          
          records.push({
            match_id: matchId,
            set_number: setNumber,
            game_number: gameNumber,
            point_number: i + 1,
            score_p1: point.homeScore,
            score_p2: point.awayScore,
            server: point.server,
            point_winner: point.winner,
            is_ace: point.isAce || false,
            is_double_fault: point.isDoubleFault || false,
            is_break_point: point.isBreakPoint || false
          });
        }
      }
    }

    if (records.length > 0) {
      // Delete existing and insert new
      await supabase
        .from('match_point_by_point_new')
        .delete()
        .eq('match_id', matchId);

      // Insert in batches
      const batchSize = 500;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await supabase.from('match_point_by_point_new').insert(batch);
      }

      // Update data source
      await this.updateDataSource(matchId, 'sofascore', { has_point_by_point: true });

      // Rebuild snapshot
      await enqueueTask('REBUILD_MATCH_SNAPSHOT', { match_id: matchId }, `snapshot_${matchId}`);
    }
  }

  /**
   * Canonicalize SofaScore player
   */
  async canonicalizeSofascorePlayer(payload) {
    const player = payload.player || payload;
    
    if (!player.id) {
      throw new Error('Missing player id');
    }

    const playerData = {
      sofascore_id: player.id,
      name: player.name || player.fullName || player.shortName,
      full_name: player.fullName,
      short_name: player.shortName,
      slug: player.slug,
      country_code: player.country?.alpha2,
      country_name: player.country?.name,
      current_ranking: player.ranking,
      updated_at: new Date().toISOString()
    };

    // Find by sofascore_id or insert
    const { data: existing } = await supabase
      .from('players_new')
      .select('id')
      .eq('sofascore_id', player.id)
      .single();

    if (existing) {
      await supabase
        .from('players_new')
        .update(playerData)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('players_new')
        .insert(playerData);
    }
  }

  /**
   * Canonicalize SofaScore tournament
   */
  async canonicalizeSofascoreTournament(payload) {
    const tournament = payload.tournament || payload;
    
    if (!tournament.id) {
      throw new Error('Missing tournament id');
    }

    const tournamentData = {
      sofascore_id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      category: tournament.category?.name,
      surface: tournament.groundType,
      country_name: tournament.category?.country?.name,
      updated_at: new Date().toISOString()
    };

    // Find by sofascore_id or insert
    const { data: existing } = await supabase
      .from('tournaments_new')
      .select('id')
      .eq('sofascore_id', tournament.id)
      .single();

    if (existing) {
      await supabase
        .from('tournaments_new')
        .update(tournamentData)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('tournaments_new')
        .insert(tournamentData);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  async findOrCreatePlayer(name, ranking = null) {
    if (!name) return null;

    const normalized = this.normalizeName(name);
    
    // Check aliases
    const { data: alias } = await supabase
      .from('player_aliases')
      .select('player_id')
      .eq('alias_normalized', normalized)
      .single();

    if (alias) return alias.player_id;

    // Create new player
    const { data: newPlayer, error } = await supabase
      .from('players_new')
      .insert({
        name: name,
        current_ranking: ranking ? parseInt(ranking) : null
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating player:', error.message);
      return null;
    }

    // Create alias
    await supabase
      .from('player_aliases')
      .insert({
        player_id: newPlayer.id,
        alias_name: name,
        alias_normalized: normalized,
        source: 'xlsx'
      })
      .select();

    return newPlayer.id;
  }

  async findOrCreatePlayerSofascore(playerData) {
    if (!playerData) return null;

    const sofascoreId = playerData.id;
    
    // Check by sofascore_id
    if (sofascoreId) {
      const { data: existing } = await supabase
        .from('players_new')
        .select('id')
        .eq('sofascore_id', sofascoreId)
        .single();

      if (existing) return existing.id;
    }

    // Create new
    const name = playerData.name || playerData.fullName || playerData.shortName;
    const { data: newPlayer, error } = await supabase
      .from('players_new')
      .insert({
        sofascore_id: sofascoreId,
        name: name,
        full_name: playerData.fullName,
        short_name: playerData.shortName,
        slug: playerData.slug,
        country_code: playerData.country?.alpha2,
        country_name: playerData.country?.name,
        current_ranking: playerData.ranking
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating player:', error.message);
      return null;
    }

    // Create alias
    if (name) {
      await supabase
        .from('player_aliases')
        .insert({
          player_id: newPlayer.id,
          alias_name: name,
          alias_normalized: this.normalizeName(name),
          source: 'sofascore'
        });
    }

    return newPlayer.id;
  }

  async findOrCreateTournament(name, surface = null) {
    if (!name) return null;

    const normalized = this.normalizeName(name);
    
    // Try to find existing
    const { data: existing } = await supabase
      .from('tournaments_new')
      .select('id')
      .ilike('name', `%${name}%`)
      .single();

    if (existing) return existing.id;

    // Create new
    const { data: newTournament, error } = await supabase
      .from('tournaments_new')
      .insert({
        name: name,
        surface: surface
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating tournament:', error.message);
      return null;
    }

    return newTournament.id;
  }

  async findOrCreateTournamentSofascore(tournamentData) {
    if (!tournamentData) return null;

    const sofascoreId = tournamentData.id || tournamentData.uniqueTournament?.id;
    
    if (sofascoreId) {
      const { data: existing } = await supabase
        .from('tournaments_new')
        .select('id')
        .eq('sofascore_id', sofascoreId)
        .single();

      if (existing) return existing.id;
    }

    // Create new
    const { data: newTournament, error } = await supabase
      .from('tournaments_new')
      .insert({
        sofascore_id: sofascoreId,
        name: tournamentData.name || tournamentData.uniqueTournament?.name,
        slug: tournamentData.slug,
        category: tournamentData.category?.name,
        surface: tournamentData.groundType
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating tournament:', error.message);
      return null;
    }

    return newTournament.id;
  }

  async upsertMatch(matchData, sourceType, sourceId = null) {
    // Try to find existing match by players + date
    const { data: existing } = await supabase
      .from('matches_new')
      .select('id')
      .eq('player1_id', matchData.player1_id)
      .eq('player2_id', matchData.player2_id)
      .eq('match_date', matchData.match_date)
      .single();

    let matchId;

    if (existing) {
      // Update existing
      await supabase
        .from('matches_new')
        .update({
          ...matchData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      matchId = existing.id;
    } else {
      // Also check with players swapped
      const { data: existingSwapped } = await supabase
        .from('matches_new')
        .select('id')
        .eq('player1_id', matchData.player2_id)
        .eq('player2_id', matchData.player1_id)
        .eq('match_date', matchData.match_date)
        .single();

      if (existingSwapped) {
        matchId = existingSwapped.id;
      } else {
        // Insert new
        const { data: newMatch, error } = await supabase
          .from('matches_new')
          .insert(matchData)
          .select('id')
          .single();

        if (error) {
          console.error('Error inserting match:', error.message);
          return null;
        }
        matchId = newMatch.id;
      }
    }

    // Update data sources
    await this.updateDataSource(matchId, sourceType, {
      source_id: sourceId,
      has_score: true
    });

    return matchId;
  }

  async updateDataSource(matchId, sourceType, updates) {
    const { data: existing } = await supabase
      .from('match_data_sources')
      .select('*')
      .eq('match_id', matchId)
      .eq('source_type', sourceType)
      .single();

    if (existing) {
      await supabase
        .from('match_data_sources')
        .update({
          ...existing,
          ...updates,
          imported_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('match_data_sources')
        .insert({
          match_id: matchId,
          source_type: sourceType,
          ...updates
        });
    }
  }

  async enqueueMatchCalculations(matchId, player1Id, player2Id) {
    // Enqueue H2H calculation
    const [p1, p2] = player1Id < player2Id ? [player1Id, player2Id] : [player2Id, player1Id];
    await enqueueTask('RECALC_H2H', { player1_id: p1, player2_id: p2 }, `h2h_${p1}_${p2}`, 3);

    // Enqueue career stats
    await enqueueTask('RECALC_CAREER_STATS', { player_id: player1Id }, `career_${player1Id}`, 5);
    await enqueueTask('RECALC_CAREER_STATS', { player_id: player2Id }, `career_${player2Id}`, 5);

    // Enqueue snapshot rebuild
    await enqueueTask('REBUILD_MATCH_SNAPSHOT', { match_id: matchId }, `snapshot_${matchId}`, 4);
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  normalizeName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z ]/g, '')
      .trim();
  }

  parseXlsxDate(dateValue) {
    if (!dateValue) return new Date().toISOString().split('T')[0];
    
    // Handle Excel serial date
    if (typeof dateValue === 'number') {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Handle string date
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
  }

  countSetsWon(matchData, playerNum) {
    let sets = 0;
    for (let i = 1; i <= 5; i++) {
      const p1Score = matchData[`set${i}_p1`];
      const p2Score = matchData[`set${i}_p2`];
      if (p1Score == null || p2Score == null) continue;
      
      if (playerNum === 1 && p1Score > p2Score) sets++;
      if (playerNum === 2 && p2Score > p1Score) sets++;
    }
    return sets;
  }

  buildScoreString(matchData) {
    const sets = [];
    for (let i = 1; i <= 5; i++) {
      const p1 = matchData[`set${i}_p1`];
      const p2 = matchData[`set${i}_p2`];
      if (p1 != null && p2 != null) {
        sets.push(`${p1}-${p2}`);
      }
    }
    return sets.join(' ');
  }

  normalizeRound(round) {
    if (!round) return null;
    const normalized = round.toLowerCase();
    
    if (normalized.includes('final') && !normalized.includes('semi') && !normalized.includes('quarter')) return 'Final';
    if (normalized.includes('semifinal') || normalized.includes('semi-final')) return 'Semifinal';
    if (normalized.includes('quarterfinal') || normalized.includes('quarter-final')) return 'Quarterfinal';
    if (normalized.includes('round of 16') || normalized === 'r16') return 'Round of 16';
    if (normalized.includes('round of 32') || normalized === 'r32') return 'Round of 32';
    if (normalized.includes('round of 64') || normalized === 'r64') return 'Round of 64';
    if (normalized.includes('round of 128') || normalized === 'r128') return 'Round of 128';
    if (normalized.includes('1st round') || normalized === '1r') return '1st Round';
    if (normalized.includes('2nd round') || normalized === '2r') return '2nd Round';
    if (normalized.includes('3rd round') || normalized === '3r') return '3rd Round';
    if (normalized.includes('4th round') || normalized === '4r') return '4th Round';
    
    return round;
  }

  mapSofascoreStatus(status) {
    const map = {
      'finished': 'finished',
      'notstarted': 'scheduled',
      'inprogress': 'live',
      'cancelled': 'cancelled',
      'postponed': 'postponed',
      'interrupted': 'suspended'
    };
    return map[status?.toLowerCase()] || status || 'unknown';
  }

  parseWonTotal(str) {
    if (!str) return { won: 0, total: 0 };
    const match = str.match(/(\d+)\/(\d+)/);
    if (match) {
      return { won: parseInt(match[1]), total: parseInt(match[2]) };
    }
    return { won: parseInt(str) || 0, total: 0 };
  }

  getValueZone(value) {
    if (value >= 50) return 'DOMINANT_P1';
    if (value >= 20) return 'STRONG_P1';
    if (value >= 5) return 'SLIGHT_P1';
    if (value <= -50) return 'DOMINANT_P2';
    if (value <= -20) return 'STRONG_P2';
    if (value <= -5) return 'SLIGHT_P2';
    return 'NEUTRAL';
  }

  /**
   * Get processor stats
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      uptime: this.stats.startedAt 
        ? Math.floor((Date.now() - this.stats.startedAt.getTime()) / 1000)
        : 0
    };
  }

  /**
   * Reprocess all raw events (for schema changes)
   */
  async reprocessAll(sourceType = null, sourceEntity = null) {
    let query = supabase
      .from('raw_events')
      .update({ 
        processing_status: 'PENDING',
        processed_at: null,
        error_text: null
      });

    if (sourceType) query = query.eq('source_type', sourceType);
    if (sourceEntity) query = query.eq('source_entity', sourceEntity);

    const { error } = await query;
    
    if (error) {
      console.error('Error resetting events:', error.message);
      return false;
    }

    console.log('✅ Events reset to PENDING for reprocessing');
    return true;
  }
}

// Singleton instance
const processor = new RawEventsProcessor();

module.exports = {
  RawEventsProcessor,
  processor,
  // Convenience methods
  ingest: (sourceType, sourceEntity, sourceKey, payload) => 
    processor.ingest(sourceType, sourceEntity, sourceKey, payload),
  ingestBatch: (events) => processor.ingestBatch(events),
  startProcessor: () => processor.start(),
  stopProcessor: () => processor.stop(),
  getProcessorStats: () => processor.getStats(),
  reprocessAll: (sourceType, sourceEntity) => processor.reprocessAll(sourceType, sourceEntity)
};
