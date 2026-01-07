/**
 * Calculation Queue Worker
 *
 * Processa task asincroni dalla coda calculation_queue:
 * - RECALC_H2H: Ricalcola head-to-head tra due giocatori
 * - RECALC_CAREER_STATS: Ricalcola statistiche carriera giocatore
 * - REBUILD_MATCH_SNAPSHOT: Ricostruisce la card snapshot di un match
 *
 * Vantaggi:
 * - No trigger pesanti su INSERT
 * - Calcoli costosi in background
 * - Retry automatico su errori
 * - Concurrency-safe con FOR UPDATE SKIP LOCKED
 */

const { supabase } = require('../db/supabase');
const { createLogger } = require('../utils/logger');

const logger = createLogger('QueueWorker');

class CalculationQueueWorker {
  constructor(options = {}) {
    this.isRunning = false;
    this.pollIntervalMs = options.pollIntervalMs || 1000;
    this.batchSize = options.batchSize || 1;
    this.maxRetries = options.maxRetries || 3;
    this.pollTimer = null;
    this.stats = {
      processed: 0,
      errors: 0,
      startedAt: null,
    };
  }

  /**
   * Avvia il worker
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Worker already running');
      return;
    }

    this.isRunning = true;
    this.stats.startedAt = new Date();
    logger.info('Calculation Queue Worker started');

    this.poll();
  }

  /**
   * Ferma il worker
   */
  stop() {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    logger.info('Calculation Queue Worker stopped');
    logger.info(`Stats: Processed=${this.stats.processed}, Errors=${this.stats.errors}`);
  }

  /**
   * Poll loop principale
   */
  async poll() {
    if (!this.isRunning) return;

    try {
      const task = await this.claimNextTask();

      if (task) {
        await this.processTask(task);
      }
    } catch (error) {
      console.error('âŒ Poll error:', error.message);
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.poll(), this.pollIntervalMs);
  }

  /**
   * Claim prossimo task dalla coda (concurrency-safe)
   */
  async claimNextTask() {
    if (!supabase) {
      console.warn('âš ï¸ Supabase not available');
      return null;
    }

    // Usa la funzione PostgreSQL per claim atomico
    const { data, error } = await supabase.rpc('claim_next_calculation_task');

    if (error) {
      // Se la funzione non esiste, fallback a query diretta
      if (error.code === '42883') {
        return await this.claimNextTaskFallback();
      }
      console.error('âŒ Error claiming task:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return {
      id: data[0].task_id,
      type: data[0].task_type,
      payload: data[0].payload,
    };
  }

  /**
   * Fallback claim se la funzione SQL non esiste
   */
  async claimNextTaskFallback() {
    // Select and update in transaction simulation
    const { data: tasks, error: selectError } = await supabase
      .from('calculation_queue')
      .select('id, task_type, payload_json')
      .eq('status', 'PENDING')
      .lt('retry_count', this.maxRetries)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1);

    if (selectError || !tasks || tasks.length === 0) {
      return null;
    }

    const task = tasks[0];

    // Update to RUNNING
    const { error: updateError } = await supabase
      .from('calculation_queue')
      .update({ status: 'RUNNING', started_at: new Date().toISOString() })
      .eq('id', task.id)
      .eq('status', 'PENDING'); // Double check to avoid race

    if (updateError) {
      return null;
    }

    return {
      id: task.id,
      type: task.task_type,
      payload: task.payload_json,
    };
  }

  /**
   * Processa un task
   */
  async processTask(task) {
    console.log(`ðŸ“‹ Processing task: ${task.type} (ID: ${task.id})`);
    const startTime = Date.now();

    try {
      switch (task.type) {
        case 'RECALC_H2H':
          await this.recalcH2H(task.payload);
          break;

        case 'RECALC_CAREER_STATS':
          await this.recalcCareerStats(task.payload);
          break;

        case 'REBUILD_MATCH_SNAPSHOT':
          await this.rebuildMatchSnapshot(task.payload);
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Mark as done
      await this.completeTask(task.id, true);

      const duration = Date.now() - startTime;
      this.stats.processed++;
      console.log(`âœ… Task ${task.id} completed in ${duration}ms`);
    } catch (error) {
      console.error(`âŒ Task ${task.id} failed:`, error.message);
      await this.completeTask(task.id, false, error.message);
      this.stats.errors++;
    }
  }

  /**
   * Completa un task (success o error)
   */
  async completeTask(taskId, success, errorText = null) {
    // Try using the SQL function first
    const { error: rpcError } = await supabase.rpc('complete_calculation_task', {
      p_task_id: taskId,
      p_success: success,
      p_error_text: errorText,
    });

    if (rpcError && rpcError.code === '42883') {
      // Fallback to direct update
      const updateData = success
        ? { status: 'DONE', completed_at: new Date().toISOString(), error_text: null }
        : { status: 'ERROR', completed_at: new Date().toISOString(), error_text: errorText };

      await supabase.from('calculation_queue').update(updateData).eq('id', taskId);

      // Increment retry count on error
      if (!success) {
        await supabase.rpc('', {}, { head: true }); // No-op, just for structure
        // Manual increment
        const { data } = await supabase
          .from('calculation_queue')
          .select('retry_count')
          .eq('id', taskId)
          .single();

        if (data) {
          await supabase
            .from('calculation_queue')
            .update({ retry_count: (data.retry_count || 0) + 1 })
            .eq('id', taskId);
        }
      }
    }
  }

  // ============================================================================
  // TASK HANDLERS
  // ============================================================================

  /**
   * Ricalcola H2H tra due giocatori
   */
  async recalcH2H(payload) {
    const { player1_id, player2_id } = payload;

    if (!player1_id || !player2_id) {
      throw new Error('Missing player IDs for H2H calculation');
    }

    // Try using SQL function
    const { error: rpcError } = await supabase.rpc('recalc_head_to_head', {
      p_player1_id: player1_id,
      p_player2_id: player2_id,
    });

    if (rpcError && rpcError.code === '42883') {
      // Fallback to JavaScript calculation
      await this.recalcH2HFallback(player1_id, player2_id);
    } else if (rpcError) {
      throw new Error(`H2H recalc failed: ${rpcError.message}`);
    }

    console.log(`ðŸ“Š H2H recalculated for ${player1_id} vs ${player2_id}`);
  }

  /**
   * Fallback H2H calculation in JavaScript
   */
  async recalcH2HFallback(p1, p2) {
    // Ensure consistent ordering
    const [player1_id, player2_id] = p1 < p2 ? [p1, p2] : [p2, p1];

    // Get all matches between players
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id, match_date, surface, winner_id')
      .or(
        `and(player1_id.eq.${player1_id},player2_id.eq.${player2_id}),and(player1_id.eq.${player2_id},player2_id.eq.${player1_id})`
      )
      .not('winner_id', 'is', null);

    if (error) throw error;

    if (!matches || matches.length === 0) {
      console.log(`No matches found between ${player1_id} and ${player2_id}`);
      return;
    }

    // Calculate stats
    const stats = {
      total_matches: matches.length,
      player1_wins: 0,
      player2_wins: 0,
      hard_p1_wins: 0,
      hard_p2_wins: 0,
      clay_p1_wins: 0,
      clay_p2_wins: 0,
      grass_p1_wins: 0,
      grass_p2_wins: 0,
      last_match_id: null,
      last_match_date: null,
    };

    for (const match of matches) {
      const surface = (match.surface || '').toLowerCase();
      const winner = match.winner_id === player1_id ? 'p1' : 'p2';

      if (winner === 'p1') {
        stats.player1_wins++;
        if (surface === 'hard') stats.hard_p1_wins++;
        else if (surface === 'clay') stats.clay_p1_wins++;
        else if (surface === 'grass') stats.grass_p1_wins++;
      } else {
        stats.player2_wins++;
        if (surface === 'hard') stats.hard_p2_wins++;
        else if (surface === 'clay') stats.clay_p2_wins++;
        else if (surface === 'grass') stats.grass_p2_wins++;
      }

      if (!stats.last_match_date || match.match_date > stats.last_match_date) {
        stats.last_match_date = match.match_date;
        stats.last_match_id = match.id;
      }
    }

    // Upsert H2H
    const { error: upsertError } = await supabase.from('head_to_head').upsert(
      {
        player1_id,
        player2_id,
        ...stats,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'player1_id,player2_id' }
    );

    if (upsertError) throw upsertError;
  }

  /**
   * Ricalcola statistiche carriera giocatore
   */
  async recalcCareerStats(payload) {
    const { player_id } = payload;

    if (!player_id) {
      throw new Error('Missing player_id for career stats calculation');
    }

    // Get all matches for player
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id, match_date, surface, winner_id, player1_id, player2_id')
      .or(`player1_id.eq.${player_id},player2_id.eq.${player_id}`)
      .not('winner_id', 'is', null);

    if (error) throw error;

    // Calculate stats by surface
    const surfaceStats = {
      all: { played: 0, won: 0 },
      hard: { played: 0, won: 0 },
      clay: { played: 0, won: 0 },
      grass: { played: 0, won: 0 },
    };

    for (const match of matches || []) {
      const surface = (match.surface || 'hard').toLowerCase();
      const won = match.winner_id === player_id;

      surfaceStats.all.played++;
      if (won) surfaceStats.all.won++;

      if (surfaceStats[surface]) {
        surfaceStats[surface].played++;
        if (won) surfaceStats[surface].won++;
      }
    }

    // Upsert career stats for each surface
    for (const [surface, stats] of Object.entries(surfaceStats)) {
      if (stats.played === 0) continue;

      const { error: upsertError } = await supabase.from('player_career_stats').upsert(
        {
          player_id,
          surface,
          year: null, // Career total
          matches_played: stats.played,
          matches_won: stats.won,
          win_percentage: stats.played > 0 ? ((stats.won / stats.played) * 100).toFixed(2) : 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'player_id,surface,year' }
      );

      if (upsertError) {
        console.warn(`Failed to upsert career stats for ${surface}:`, upsertError.message);
      }
    }

    console.log(`ðŸ“Š Career stats recalculated for player ${player_id}`);
  }

  /**
   * Ricostruisce match card snapshot
   */
  async rebuildMatchSnapshot(payload) {
    const { match_id } = payload;

    if (!match_id) {
      throw new Error('Missing match_id for snapshot rebuild');
    }

    // Try using SQL function first
    const { error: rpcError } = await supabase.rpc('build_match_card_snapshot', {
      p_match_id: match_id,
    });

    if (rpcError && rpcError.code === '42883') {
      // Fallback to JavaScript
      await this.buildSnapshotFallback(match_id);
    } else if (rpcError) {
      throw new Error(`Snapshot rebuild failed: ${rpcError.message}`);
    }

    console.log(`ðŸ“¸ Snapshot rebuilt for match ${match_id}`);
  }

  /**
   * Fallback snapshot builder in JavaScript
   */
  async buildSnapshotFallback(matchId) {
    // Fetch all data in parallel
    const [
      { data: matchData },
      { data: player1 },
      { data: player2 },
      { data: stats },
      { data: momentum },
      { data: odds },
      { data: sources },
    ] = await Promise.all([
      supabase.from('v_matches_with_players').select('*').eq('id', matchId).single(),
      null, // Will be fetched from match data
      null,
      supabase.from('match_statistics').select('*').eq('match_id', matchId),
      supabase
        .from('match_power_rankings')
        .select('*')
        .eq('match_id', matchId)
        .order('set_number')
        .order('game_number'),
      supabase.from('match_odds').select('*').eq('match_id', matchId),
      supabase.from('match_data_sources').select('*').eq('match_id', matchId),
    ]);

    if (!matchData) {
      throw new Error(`Match ${matchId} not found`);
    }

    // Applica priorità SVG al momentum: se value_svg presente, sovrascrive value
    const processedMomentum = (momentum || []).map(row => {
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

    // Get players
    const { data: p1Data } = await supabase
      .from('players')
      .select('*')
      .eq('id', matchData.player1_id)
      .single();

    const { data: p2Data } = await supabase
      .from('players')
      .select('*')
      .eq('id', matchData.player2_id)
      .single();

    // Get H2H
    const [minP, maxP] =
      matchData.player1_id < matchData.player2_id
        ? [matchData.player1_id, matchData.player2_id]
        : [matchData.player2_id, matchData.player1_id];

    const { data: h2h } = await supabase
      .from('head_to_head')
      .select('*')
      .eq('player1_id', minP)
      .eq('player2_id', maxP)
      .single();

    // Calculate quality
    let quality = 0;
    if (sources && sources.length > 0) quality += 20;
    if (stats && stats.length > 0) quality += 20;
    if (odds && odds.length > 0) quality += 20;
    if (momentum && momentum.length > 0) quality += 20;

    // Check point by point
    const { count: pbpCount } = await supabase
      .from('match_point_by_point')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', matchId);
    if (pbpCount > 0) quality += 20;

    // Build snapshot
    const snapshot = {
      match_id: matchId,
      core_json: {
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
        winnerCode: matchData.winner_code,
        tournament: {
          id: matchData.tournament_id,
          name: matchData.tournament_name,
          category: matchData.tournament_category,
        },
      },
      players_json: {
        player1: {
          id: p1Data?.id,
          name: p1Data?.name,
          country: p1Data?.country_code,
          currentRanking: p1Data?.current_ranking,
          rankingAtMatch: matchData.player1_rank,
          seed: matchData.player1_seed,
        },
        player2: {
          id: p2Data?.id,
          name: p2Data?.name,
          country: p2Data?.country_code,
          currentRanking: p2Data?.current_ranking,
          rankingAtMatch: matchData.player2_rank,
          seed: matchData.player2_seed,
        },
      },
      h2h_json: h2h || null,
      stats_json: stats ? stats.reduce((acc, s) => ({ ...acc, [s.period]: s }), {}) : null,
      momentum_json: processedMomentum,
      odds_json: {
        opening: odds?.find((o) => o.is_opening) || odds?.[0] || null,
        closing: odds?.find((o) => o.is_closing) || odds?.[odds.length - 1] || null,
        all: odds || [],
      },
      data_sources_json: sources || [],
      data_quality_int: quality,
      last_updated_at: new Date().toISOString(),
    };

    // Upsert snapshot
    const { error: upsertError } = await supabase
      .from('match_card_snapshot')
      .upsert(snapshot, { onConflict: 'match_id' });

    if (upsertError) throw upsertError;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Enqueue a task manually
   */
  async enqueue(taskType, payload, uniqueKey, priority = 5) {
    if (!supabase) {
      console.warn('âš ï¸ Supabase not available');
      return null;
    }

    // Try SQL function first
    const { data, error } = await supabase.rpc('enqueue_calculation', {
      p_task_type: taskType,
      p_payload: payload,
      p_unique_key: uniqueKey,
      p_priority: priority,
    });

    if (error && error.code === '42883') {
      // Fallback to direct insert
      const { data: inserted, error: insertError } = await supabase
        .from('calculation_queue')
        .upsert(
          {
            task_type: taskType,
            payload_json: payload,
            unique_key: uniqueKey,
            priority,
            status: 'PENDING',
            created_at: new Date().toISOString(),
          },
          { onConflict: 'task_type,unique_key', ignoreDuplicates: true }
        )
        .select('id')
        .single();

      if (insertError && insertError.code !== '23505') {
        console.error('âŒ Error enqueueing task:', insertError.message);
        return null;
      }

      return inserted?.id;
    }

    if (error) {
      console.error('âŒ Error enqueueing task:', error.message);
      return null;
    }

    return data;
  }

  /**
   * Get queue stats
   */
  async getQueueStats() {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('calculation_queue')
      .select('status')
      .then((result) => {
        if (result.error) return { data: null, error: result.error };

        const stats = {
          pending: 0,
          running: 0,
          done: 0,
          error: 0,
        };

        for (const row of result.data || []) {
          const status = row.status?.toLowerCase();
          if (Object.prototype.hasOwnProperty.call(stats, status)) {
            stats[status]++;
          }
        }

        return { data: stats, error: null };
      });

    if (error) {
      console.error('Error fetching queue stats:', error.message);
      return null;
    }

    return data;
  }

  /**
   * Process all pending tasks (for batch processing)
   */
  async processAll(maxTasks = 1000) {
    let processed = 0;

    while (processed < maxTasks) {
      const task = await this.claimNextTask();
      if (!task) break;

      await this.processTask(task);
      processed++;
    }

    console.log(`âœ… Batch processing complete: ${processed} tasks processed`);
    return processed;
  }
}

// Singleton instance
const worker = new CalculationQueueWorker();

module.exports = {
  CalculationQueueWorker,
  worker,
  // Convenience methods
  startWorker: () => worker.start(),
  stopWorker: () => worker.stop(),
  enqueueTask: (type, payload, key, priority) => worker.enqueue(type, payload, key, priority),
  getQueueStats: () => worker.getQueueStats(),
  processAllTasks: (max) => worker.processAll(max),
};



