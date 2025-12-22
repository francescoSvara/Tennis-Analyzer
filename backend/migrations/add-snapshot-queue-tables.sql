-- ============================================================================
-- NUOVE TABELLE PER ARCHITETTURA OTTIMIZZATA
-- Match Card Snapshot + Raw Events + Calculation Queue
-- ============================================================================

-- ============================================================================
-- 1. MATCH_CARD_SNAPSHOT (Card pre-calcolata, 1 query invece di N)
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_card_snapshot (
  match_id BIGINT PRIMARY KEY REFERENCES matches_new(id) ON DELETE CASCADE,
  
  -- Dati pre-assemblati in JSON
  core_json JSONB,                    -- match base data (date, score, round, etc.)
  players_json JSONB,                 -- player1 + player2 info complete
  h2h_json JSONB,                     -- head to head stats
  stats_json JSONB,                   -- match statistics
  momentum_json JSONB,                -- power rankings game by game
  odds_json JSONB,                    -- betting odds (opening, closing)
  data_sources_json JSONB,            -- source tracking
  
  -- Quality score pre-calcolato
  data_quality_int INTEGER DEFAULT 0, -- 0-100
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE match_card_snapshot IS 'Pre-computed match card for instant API response (1 query instead of 10+)';

-- Index per query su quality
CREATE INDEX IF NOT EXISTS idx_snapshot_quality ON match_card_snapshot(data_quality_int DESC);
CREATE INDEX IF NOT EXISTS idx_snapshot_updated ON match_card_snapshot(last_updated_at DESC);

-- ============================================================================
-- 2. RAW_EVENTS (Dati originali pre-normalizzazione)
-- ============================================================================
CREATE TABLE IF NOT EXISTS raw_events (
  id BIGSERIAL PRIMARY KEY,
  
  -- Source identification
  source_type VARCHAR(20) NOT NULL,           -- 'sofascore', 'xlsx'
  source_entity VARCHAR(30) NOT NULL,         -- 'match', 'player', 'tournament', 'stats', 'odds', 'points'
  source_key TEXT NOT NULL,                   -- eventId sofascore or xlsx row key
  
  -- Original payload (never modified)
  payload_json JSONB NOT NULL,
  
  -- Processing status
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_status VARCHAR(20) DEFAULT 'PENDING',  -- 'PENDING', 'PROCESSING', 'DONE', 'ERROR'
  error_text TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Unique constraint per idempotenza
  UNIQUE(source_type, source_entity, source_key)
);

COMMENT ON TABLE raw_events IS 'Raw data from all sources, preserved for reprocessing capability';

-- Indexes per worker efficiency
CREATE INDEX IF NOT EXISTS idx_raw_events_pending 
  ON raw_events(ingested_at) 
  WHERE processing_status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_raw_events_status 
  ON raw_events(processing_status, ingested_at);

CREATE INDEX IF NOT EXISTS idx_raw_events_source 
  ON raw_events(source_type, source_entity);

-- ============================================================================
-- 3. CALCULATION_QUEUE (Task asincroni per calcoli pesanti)
-- ============================================================================
CREATE TABLE IF NOT EXISTS calculation_queue (
  id BIGSERIAL PRIMARY KEY,
  
  -- Task identification
  task_type VARCHAR(50) NOT NULL,             -- 'RECALC_H2H', 'RECALC_CAREER_STATS', 'REBUILD_MATCH_SNAPSHOT'
  payload_json JSONB NOT NULL,                -- Task-specific data
  unique_key TEXT,                            -- For idempotency (e.g., "h2h_123_456")
  
  -- Priority and scheduling
  priority INTEGER DEFAULT 5,                 -- 1=highest, 10=lowest
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'PENDING',       -- 'PENDING', 'RUNNING', 'DONE', 'ERROR'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Error handling
  error_text TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Unique constraint per idempotenza (stessa task non accodata due volte)
  UNIQUE(task_type, unique_key)
);

COMMENT ON TABLE calculation_queue IS 'Async task queue for expensive calculations (H2H, career stats, snapshots)';

-- Index per worker polling (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_calc_queue_pending 
  ON calculation_queue(priority, created_at) 
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_calc_queue_status 
  ON calculation_queue(status);

-- ============================================================================
-- 4. FUNCTIONS FOR QUEUE MANAGEMENT
-- ============================================================================

-- Function to enqueue a calculation task (idempotent)
CREATE OR REPLACE FUNCTION enqueue_calculation(
  p_task_type TEXT,
  p_payload JSONB,
  p_unique_key TEXT,
  p_priority INTEGER DEFAULT 5
)
RETURNS BIGINT AS $$
DECLARE
  v_task_id BIGINT;
BEGIN
  INSERT INTO calculation_queue (task_type, payload_json, unique_key, priority, status)
  VALUES (p_task_type, p_payload, p_unique_key, p_priority, 'PENDING')
  ON CONFLICT (task_type, unique_key) DO UPDATE 
    SET priority = LEAST(calculation_queue.priority, EXCLUDED.priority),  -- Keep higher priority
        status = CASE 
          WHEN calculation_queue.status IN ('DONE', 'ERROR') THEN 'PENDING'  -- Re-schedule if completed/failed
          ELSE calculation_queue.status  -- Keep current status if already pending/running
        END,
        created_at = CASE 
          WHEN calculation_queue.status IN ('DONE', 'ERROR') THEN NOW()
          ELSE calculation_queue.created_at
        END
  RETURNING id INTO v_task_id;
  
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to claim next task (concurrency-safe)
CREATE OR REPLACE FUNCTION claim_next_calculation_task()
RETURNS TABLE (
  task_id BIGINT,
  task_type TEXT,
  payload JSONB
) AS $$
DECLARE
  v_task RECORD;
BEGIN
  -- Use FOR UPDATE SKIP LOCKED for concurrent workers
  SELECT cq.id, cq.task_type, cq.payload_json
  INTO v_task
  FROM calculation_queue cq
  WHERE cq.status = 'PENDING'
    AND (cq.retry_count < cq.max_retries OR cq.max_retries = 0)
  ORDER BY cq.priority, cq.created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_task.id IS NULL THEN
    RETURN;
  END IF;
  
  -- Mark as running
  UPDATE calculation_queue 
  SET status = 'RUNNING', started_at = NOW()
  WHERE id = v_task.id;
  
  task_id := v_task.id;
  task_type := v_task.task_type;
  payload := v_task.payload_json;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a task
CREATE OR REPLACE FUNCTION complete_calculation_task(
  p_task_id BIGINT,
  p_success BOOLEAN,
  p_error_text TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF p_success THEN
    UPDATE calculation_queue 
    SET status = 'DONE', 
        completed_at = NOW(),
        error_text = NULL
    WHERE id = p_task_id;
  ELSE
    UPDATE calculation_queue 
    SET status = 'ERROR', 
        completed_at = NOW(),
        error_text = p_error_text,
        retry_count = retry_count + 1
    WHERE id = p_task_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. TRIGGER TO ENQUEUE CALCULATIONS ON MATCH UPSERT
-- ============================================================================

-- Replace heavy H2H trigger with lightweight queue enqueue
CREATE OR REPLACE FUNCTION enqueue_match_calculations()
RETURNS TRIGGER AS $$
DECLARE
  v_p1 BIGINT;
  v_p2 BIGINT;
  v_h2h_key TEXT;
BEGIN
  -- Order player IDs for consistent H2H key
  IF NEW.player1_id < NEW.player2_id THEN
    v_p1 := NEW.player1_id;
    v_p2 := NEW.player2_id;
  ELSE
    v_p1 := NEW.player2_id;
    v_p2 := NEW.player1_id;
  END IF;
  
  v_h2h_key := 'h2h_' || v_p1 || '_' || v_p2;
  
  -- Enqueue H2H recalculation (high priority)
  PERFORM enqueue_calculation(
    'RECALC_H2H',
    jsonb_build_object('player1_id', v_p1, 'player2_id', v_p2),
    v_h2h_key,
    3  -- High priority
  );
  
  -- Enqueue career stats for both players
  PERFORM enqueue_calculation(
    'RECALC_CAREER_STATS',
    jsonb_build_object('player_id', NEW.player1_id),
    'career_' || NEW.player1_id,
    5  -- Medium priority
  );
  
  PERFORM enqueue_calculation(
    'RECALC_CAREER_STATS',
    jsonb_build_object('player_id', NEW.player2_id),
    'career_' || NEW.player2_id,
    5  -- Medium priority
  );
  
  -- Enqueue snapshot rebuild
  PERFORM enqueue_calculation(
    'REBUILD_MATCH_SNAPSHOT',
    jsonb_build_object('match_id', NEW.id),
    'snapshot_' || NEW.id,
    4  -- High-medium priority
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old H2H trigger if exists and create new lightweight one
DROP TRIGGER IF EXISTS trg_update_h2h ON matches_new;

CREATE TRIGGER trg_enqueue_match_calculations
AFTER INSERT OR UPDATE ON matches_new
FOR EACH ROW
WHEN (NEW.player1_id IS NOT NULL AND NEW.player2_id IS NOT NULL)
EXECUTE FUNCTION enqueue_match_calculations();

-- ============================================================================
-- 6. FUNCTION TO BUILD MATCH CARD SNAPSHOT
-- ============================================================================

CREATE OR REPLACE FUNCTION build_match_card_snapshot(p_match_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_match RECORD;
  v_p1 RECORD;
  v_p2 RECORD;
  v_h2h RECORD;
  v_sources JSONB;
  v_stats JSONB;
  v_momentum JSONB;
  v_odds JSONB;
  v_quality INTEGER;
BEGIN
  -- Get match with tournament
  SELECT m.*, t.name as tournament_name, t.category as tournament_category
  INTO v_match
  FROM matches_new m
  LEFT JOIN tournaments_new t ON m.tournament_id = t.id
  WHERE m.id = p_match_id;
  
  IF v_match.id IS NULL THEN
    RAISE NOTICE 'Match % not found', p_match_id;
    RETURN;
  END IF;
  
  -- Get players
  SELECT * INTO v_p1 FROM players_new WHERE id = v_match.player1_id;
  SELECT * INTO v_p2 FROM players_new WHERE id = v_match.player2_id;
  
  -- Get H2H (ordered by player IDs)
  IF v_match.player1_id < v_match.player2_id THEN
    SELECT * INTO v_h2h FROM head_to_head 
    WHERE player1_id = v_match.player1_id AND player2_id = v_match.player2_id;
  ELSE
    SELECT * INTO v_h2h FROM head_to_head 
    WHERE player1_id = v_match.player2_id AND player2_id = v_match.player1_id;
  END IF;
  
  -- Get data sources
  SELECT jsonb_agg(to_jsonb(ds))
  INTO v_sources
  FROM match_data_sources ds
  WHERE ds.match_id = p_match_id;
  
  -- Get statistics
  SELECT jsonb_object_agg(period, to_jsonb(s))
  INTO v_stats
  FROM match_statistics_new s
  WHERE s.match_id = p_match_id;
  
  -- Get momentum
  SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.set_number, pr.game_number)
  INTO v_momentum
  FROM match_power_rankings_new pr
  WHERE pr.match_id = p_match_id;
  
  -- Get odds
  SELECT jsonb_build_object(
    'opening', (SELECT to_jsonb(o) FROM match_odds o WHERE o.match_id = p_match_id AND o.is_opening LIMIT 1),
    'closing', (SELECT to_jsonb(o) FROM match_odds o WHERE o.match_id = p_match_id AND o.is_closing LIMIT 1),
    'all', (SELECT jsonb_agg(to_jsonb(o)) FROM match_odds o WHERE o.match_id = p_match_id)
  )
  INTO v_odds;
  
  -- Calculate data quality
  SELECT 
    COALESCE((SELECT 20 FROM match_data_sources WHERE match_id = p_match_id LIMIT 1), 0) +
    COALESCE((SELECT 20 FROM match_statistics_new WHERE match_id = p_match_id LIMIT 1), 0) +
    COALESCE((SELECT 20 FROM match_odds WHERE match_id = p_match_id LIMIT 1), 0) +
    COALESCE((SELECT 20 FROM match_power_rankings_new WHERE match_id = p_match_id LIMIT 1), 0) +
    COALESCE((SELECT 20 FROM match_point_by_point_new WHERE match_id = p_match_id LIMIT 1), 0)
  INTO v_quality;
  
  -- Upsert snapshot
  INSERT INTO match_card_snapshot (
    match_id,
    core_json,
    players_json,
    h2h_json,
    stats_json,
    momentum_json,
    odds_json,
    data_sources_json,
    data_quality_int,
    last_updated_at
  ) VALUES (
    p_match_id,
    jsonb_build_object(
      'id', v_match.id,
      'date', v_match.match_date,
      'time', v_match.match_time,
      'round', v_match.round,
      'surface', v_match.surface,
      'bestOf', v_match.best_of,
      'status', v_match.status,
      'score', v_match.score,
      'setsPlayer1', v_match.sets_player1,
      'setsPlayer2', v_match.sets_player2,
      'winnerCode', v_match.winner_code,
      'tournament', jsonb_build_object(
        'id', v_match.tournament_id,
        'name', v_match.tournament_name,
        'category', v_match.tournament_category
      ),
      'sets', jsonb_build_array(
        CASE WHEN v_match.set1_p1 IS NOT NULL THEN jsonb_build_object('p1', v_match.set1_p1, 'p2', v_match.set1_p2, 'tb', v_match.set1_tb) ELSE NULL END,
        CASE WHEN v_match.set2_p1 IS NOT NULL THEN jsonb_build_object('p1', v_match.set2_p1, 'p2', v_match.set2_p2, 'tb', v_match.set2_tb) ELSE NULL END,
        CASE WHEN v_match.set3_p1 IS NOT NULL THEN jsonb_build_object('p1', v_match.set3_p1, 'p2', v_match.set3_p2, 'tb', v_match.set3_tb) ELSE NULL END,
        CASE WHEN v_match.set4_p1 IS NOT NULL THEN jsonb_build_object('p1', v_match.set4_p1, 'p2', v_match.set4_p2, 'tb', v_match.set4_tb) ELSE NULL END,
        CASE WHEN v_match.set5_p1 IS NOT NULL THEN jsonb_build_object('p1', v_match.set5_p1, 'p2', v_match.set5_p2, 'tb', v_match.set5_tb) ELSE NULL END
      )
    ),
    jsonb_build_object(
      'player1', jsonb_build_object(
        'id', v_p1.id,
        'name', v_p1.name,
        'country', v_p1.country_code,
        'currentRanking', v_p1.current_ranking,
        'rankingAtMatch', v_match.player1_rank,
        'seed', v_match.player1_seed
      ),
      'player2', jsonb_build_object(
        'id', v_p2.id,
        'name', v_p2.name,
        'country', v_p2.country_code,
        'currentRanking', v_p2.current_ranking,
        'rankingAtMatch', v_match.player2_rank,
        'seed', v_match.player2_seed
      )
    ),
    CASE WHEN v_h2h.id IS NOT NULL THEN to_jsonb(v_h2h) ELSE NULL END,
    v_stats,
    v_momentum,
    v_odds,
    COALESCE(v_sources, '[]'::jsonb),
    v_quality,
    NOW()
  )
  ON CONFLICT (match_id) DO UPDATE SET
    core_json = EXCLUDED.core_json,
    players_json = EXCLUDED.players_json,
    h2h_json = EXCLUDED.h2h_json,
    stats_json = EXCLUDED.stats_json,
    momentum_json = EXCLUDED.momentum_json,
    odds_json = EXCLUDED.odds_json,
    data_sources_json = EXCLUDED.data_sources_json,
    data_quality_int = EXCLUDED.data_quality_int,
    last_updated_at = NOW();
    
  RAISE NOTICE 'Snapshot built for match % with quality %', p_match_id, v_quality;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNCTION TO RECALCULATE H2H
-- ============================================================================

CREATE OR REPLACE FUNCTION recalc_head_to_head(p_player1_id BIGINT, p_player2_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_p1 BIGINT;
  v_p2 BIGINT;
  v_stats RECORD;
BEGIN
  -- Ensure consistent ordering
  IF p_player1_id < p_player2_id THEN
    v_p1 := p_player1_id;
    v_p2 := p_player2_id;
  ELSE
    v_p1 := p_player2_id;
    v_p2 := p_player1_id;
  END IF;
  
  -- Calculate H2H stats from all matches
  SELECT 
    COUNT(*) as total_matches,
    SUM(CASE WHEN winner_id = v_p1 THEN 1 ELSE 0 END) as p1_wins,
    SUM(CASE WHEN winner_id = v_p2 THEN 1 ELSE 0 END) as p2_wins,
    SUM(CASE WHEN LOWER(surface) = 'hard' AND winner_id = v_p1 THEN 1 ELSE 0 END) as hard_p1,
    SUM(CASE WHEN LOWER(surface) = 'hard' AND winner_id = v_p2 THEN 1 ELSE 0 END) as hard_p2,
    SUM(CASE WHEN LOWER(surface) = 'clay' AND winner_id = v_p1 THEN 1 ELSE 0 END) as clay_p1,
    SUM(CASE WHEN LOWER(surface) = 'clay' AND winner_id = v_p2 THEN 1 ELSE 0 END) as clay_p2,
    SUM(CASE WHEN LOWER(surface) = 'grass' AND winner_id = v_p1 THEN 1 ELSE 0 END) as grass_p1,
    SUM(CASE WHEN LOWER(surface) = 'grass' AND winner_id = v_p2 THEN 1 ELSE 0 END) as grass_p2,
    MAX(id) as last_match_id,
    MAX(match_date) as last_match_date
  INTO v_stats
  FROM matches_new
  WHERE ((player1_id = v_p1 AND player2_id = v_p2) OR (player1_id = v_p2 AND player2_id = v_p1))
    AND winner_id IS NOT NULL;
  
  IF v_stats.total_matches > 0 THEN
    INSERT INTO head_to_head (
      player1_id, player2_id, total_matches, 
      player1_wins, player2_wins,
      hard_p1_wins, hard_p2_wins,
      clay_p1_wins, clay_p2_wins,
      grass_p1_wins, grass_p2_wins,
      last_match_id, last_match_date,
      updated_at
    ) VALUES (
      v_p1, v_p2, v_stats.total_matches,
      v_stats.p1_wins, v_stats.p2_wins,
      COALESCE(v_stats.hard_p1, 0), COALESCE(v_stats.hard_p2, 0),
      COALESCE(v_stats.clay_p1, 0), COALESCE(v_stats.clay_p2, 0),
      COALESCE(v_stats.grass_p1, 0), COALESCE(v_stats.grass_p2, 0),
      v_stats.last_match_id, v_stats.last_match_date,
      NOW()
    )
    ON CONFLICT (player1_id, player2_id) DO UPDATE SET
      total_matches = EXCLUDED.total_matches,
      player1_wins = EXCLUDED.player1_wins,
      player2_wins = EXCLUDED.player2_wins,
      hard_p1_wins = EXCLUDED.hard_p1_wins,
      hard_p2_wins = EXCLUDED.hard_p2_wins,
      clay_p1_wins = EXCLUDED.clay_p1_wins,
      clay_p2_wins = EXCLUDED.clay_p2_wins,
      grass_p1_wins = EXCLUDED.grass_p1_wins,
      grass_p2_wins = EXCLUDED.grass_p2_wins,
      last_match_id = EXCLUDED.last_match_id,
      last_match_date = EXCLUDED.last_match_date,
      updated_at = NOW();
  END IF;
  
  RAISE NOTICE 'H2H recalculated for players % vs % - Total matches: %', v_p1, v_p2, v_stats.total_matches;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. GRANTS (uncomment for Supabase)
-- ============================================================================
-- GRANT SELECT ON match_card_snapshot TO anon, authenticated;
-- GRANT SELECT ON raw_events TO authenticated;
-- GRANT SELECT ON calculation_queue TO authenticated;
-- GRANT EXECUTE ON FUNCTION build_match_card_snapshot TO authenticated;
-- GRANT EXECUTE ON FUNCTION recalc_head_to_head TO authenticated;
