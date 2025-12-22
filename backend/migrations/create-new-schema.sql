-- ============================================================================
-- NUOVO SCHEMA DATABASE TENNIS
-- Separazione chiara: Players / Matches / Match Details
-- ============================================================================

-- Abilita UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PLAYERS (Dati anagrafici tennista)
-- ============================================================================
CREATE TABLE IF NOT EXISTS players_new (
  id BIGSERIAL PRIMARY KEY,
  
  -- Identificatori
  sofascore_id BIGINT UNIQUE,
  atp_id TEXT,
  wta_id TEXT,
  
  -- Nome
  name TEXT NOT NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  slug TEXT,
  
  -- Info personali
  country_code VARCHAR(3),
  country_name TEXT,
  birth_date DATE,
  height_cm INTEGER,
  weight_kg INTEGER,
  plays VARCHAR(20),                         -- 'Right-Handed', 'Left-Handed'
  backhand VARCHAR(20),                      -- 'One-Handed', 'Two-Handed'
  turned_pro INTEGER,
  
  gender VARCHAR(10) DEFAULT 'male',
  is_active BOOLEAN DEFAULT true,
  
  -- Ranking attuale (cache per query veloci)
  current_ranking INTEGER,
  current_points INTEGER,
  ranking_updated_at DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_new_name ON players_new(name);
CREATE INDEX IF NOT EXISTS idx_players_new_sofascore ON players_new(sofascore_id);
CREATE INDEX IF NOT EXISTS idx_players_new_ranking ON players_new(current_ranking);

-- ============================================================================
-- 2. PLAYER_ALIASES (Per matching nomi da diverse fonti)
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_aliases (
  id SERIAL PRIMARY KEY,
  player_id BIGINT REFERENCES players_new(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  alias_normalized TEXT NOT NULL,            -- lowercase, no accents
  source TEXT,                               -- 'xlsx', 'sofascore', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alias_normalized)
);

CREATE INDEX IF NOT EXISTS idx_player_aliases_normalized ON player_aliases(alias_normalized);

-- ============================================================================
-- 3. PLAYER_RANKINGS (Storico ranking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_rankings (
  id SERIAL PRIMARY KEY,
  player_id BIGINT REFERENCES players_new(id) ON DELETE CASCADE,
  ranking_date DATE NOT NULL,
  ranking INTEGER NOT NULL,
  points INTEGER,
  ranking_type VARCHAR(20) DEFAULT 'ATP',
  
  -- ELO calcolati
  elo_overall DECIMAL(7,2),
  elo_hard DECIMAL(7,2),
  elo_clay DECIMAL(7,2),
  elo_grass DECIMAL(7,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, ranking_date, ranking_type)
);

CREATE INDEX IF NOT EXISTS idx_player_rankings_date ON player_rankings(ranking_date DESC);

-- ============================================================================
-- 4. PLAYER_CAREER_STATS (Statistiche carriera)
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_career_stats (
  id SERIAL PRIMARY KEY,
  player_id BIGINT REFERENCES players_new(id) ON DELETE CASCADE,
  surface VARCHAR(20) DEFAULT 'all',         -- 'hard', 'clay', 'grass', 'all'
  year INTEGER,                              -- NULL = totali carriera
  
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  win_percentage DECIMAL(5,2),
  
  titles INTEGER DEFAULT 0,
  finals INTEGER DEFAULT 0,
  
  -- Serve
  aces_total INTEGER,
  double_faults_total INTEGER,
  first_serve_pct DECIMAL(5,2),
  first_serve_won_pct DECIMAL(5,2),
  second_serve_won_pct DECIMAL(5,2),
  service_games_won_pct DECIMAL(5,2),
  
  -- Return
  return_points_won_pct DECIMAL(5,2),
  return_games_won_pct DECIMAL(5,2),
  break_points_saved_pct DECIMAL(5,2),
  break_points_converted_pct DECIMAL(5,2),
  
  -- Tiebreaks
  tiebreaks_won INTEGER DEFAULT 0,
  tiebreaks_played INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, surface, year)
);

-- ============================================================================
-- 5. TOURNAMENTS_NEW
-- ============================================================================
CREATE TABLE IF NOT EXISTS tournaments_new (
  id BIGSERIAL PRIMARY KEY,
  sofascore_id BIGINT UNIQUE,
  atp_id TEXT,
  
  name TEXT NOT NULL,
  short_name TEXT,
  slug TEXT,
  
  category VARCHAR(30),                      -- 'Grand Slam', 'Masters 1000', 'ATP 500', 'ATP 250'
  tour VARCHAR(10),                          -- 'ATP', 'WTA', 'ITF'
  
  surface VARCHAR(20),
  indoor BOOLEAN DEFAULT false,
  
  country_code VARCHAR(3),
  country_name TEXT,
  city TEXT,
  
  typical_draw_size INTEGER,
  typical_prize_money INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. MATCHES_NEW (Solo dati base del match)
-- ============================================================================
CREATE TABLE IF NOT EXISTS matches_new (
  id BIGSERIAL PRIMARY KEY,
  
  -- Link a entità
  player1_id BIGINT REFERENCES players_new(id),
  player2_id BIGINT REFERENCES players_new(id),
  winner_id BIGINT REFERENCES players_new(id),
  tournament_id BIGINT REFERENCES tournaments_new(id),
  
  -- Timing
  match_date DATE NOT NULL,
  match_time TIME,
  start_timestamp BIGINT,
  
  -- Match info
  round VARCHAR(50),
  best_of INTEGER DEFAULT 3,
  surface VARCHAR(20),
  
  -- Status
  status VARCHAR(20) DEFAULT 'finished',
  winner_code INTEGER,                       -- 1 o 2
  
  -- Score
  score TEXT,                                -- "6-4 7-5"
  sets_player1 INTEGER,
  sets_player2 INTEGER,
  
  -- Set details (per query veloci)
  set1_p1 INTEGER, set1_p2 INTEGER, set1_tb INTEGER,
  set2_p1 INTEGER, set2_p2 INTEGER, set2_tb INTEGER,
  set3_p1 INTEGER, set3_p2 INTEGER, set3_tb INTEGER,
  set4_p1 INTEGER, set4_p2 INTEGER, set4_tb INTEGER,
  set5_p1 INTEGER, set5_p2 INTEGER, set5_tb INTEGER,
  
  -- Rankings al momento del match
  player1_rank INTEGER,
  player2_rank INTEGER,
  player1_seed INTEGER,
  player2_seed INTEGER,
  
  -- Quality indicator
  data_quality INTEGER DEFAULT 50,           -- 0-100
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_new_date ON matches_new(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_new_p1 ON matches_new(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_new_p2 ON matches_new(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_new_tournament ON matches_new(tournament_id);

-- ============================================================================
-- 7. MATCH_DATA_SOURCES (Traccia le fonti)
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_data_sources (
  id SERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES matches_new(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,          -- 'xlsx_2025', 'sofascore', 'atp_official'
  source_id TEXT,                            -- ID nella fonte originale
  source_url TEXT,
  
  has_score BOOLEAN DEFAULT false,
  has_statistics BOOLEAN DEFAULT false,
  has_power_rankings BOOLEAN DEFAULT false,
  has_point_by_point BOOLEAN DEFAULT false,
  has_odds BOOLEAN DEFAULT false,
  
  raw_data JSONB,                            -- Dati originali per debug
  
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, source_type)
);

-- ============================================================================
-- 8. MATCH_STATISTICS_NEW
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_statistics_new (
  id SERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES matches_new(id) ON DELETE CASCADE,
  period VARCHAR(20) DEFAULT 'ALL',
  
  -- Player 1 serve
  p1_aces INTEGER,
  p1_double_faults INTEGER,
  p1_first_serve_pct DECIMAL(5,2),
  p1_first_serve_won INTEGER,
  p1_first_serve_total INTEGER,
  p1_second_serve_won INTEGER,
  p1_second_serve_total INTEGER,
  p1_service_points_won INTEGER,
  p1_service_points_total INTEGER,
  
  -- Player 2 serve
  p2_aces INTEGER,
  p2_double_faults INTEGER,
  p2_first_serve_pct DECIMAL(5,2),
  p2_first_serve_won INTEGER,
  p2_first_serve_total INTEGER,
  p2_second_serve_won INTEGER,
  p2_second_serve_total INTEGER,
  p2_service_points_won INTEGER,
  p2_service_points_total INTEGER,
  
  -- Break points
  p1_break_points_won INTEGER,
  p1_break_points_total INTEGER,
  p2_break_points_won INTEGER,
  p2_break_points_total INTEGER,
  
  -- Points totali
  p1_total_points_won INTEGER,
  p2_total_points_won INTEGER,
  
  -- Shot stats
  p1_winners INTEGER,
  p1_unforced_errors INTEGER,
  p2_winners INTEGER,
  p2_unforced_errors INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, period)
);

-- ============================================================================
-- 9. MATCH_POWER_RANKINGS (Momentum)
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_power_rankings_new (
  id SERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES matches_new(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  game_number INTEGER NOT NULL,
  
  value INTEGER NOT NULL,                    -- -100 to +100
  break_occurred BOOLEAN DEFAULT false,
  
  zone VARCHAR(30),
  favored_player INTEGER,                    -- 1 o 2
  
  UNIQUE(match_id, set_number, game_number)
);

-- ============================================================================
-- 10. MATCH_POINT_BY_POINT
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_point_by_point_new (
  id SERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES matches_new(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  game_number INTEGER NOT NULL,
  point_number INTEGER NOT NULL,
  
  score_p1 VARCHAR(10),
  score_p2 VARCHAR(10),
  game_score_p1 INTEGER,                     -- Games nel set
  game_score_p2 INTEGER,
  
  server INTEGER,                            -- 1 o 2
  point_winner INTEGER,
  
  is_ace BOOLEAN DEFAULT false,
  is_double_fault BOOLEAN DEFAULT false,
  is_winner BOOLEAN DEFAULT false,
  is_unforced_error BOOLEAN DEFAULT false,
  is_break_point BOOLEAN DEFAULT false,
  is_set_point BOOLEAN DEFAULT false,
  is_match_point BOOLEAN DEFAULT false,
  
  rally_length INTEGER,
  point_description TEXT,
  
  UNIQUE(match_id, set_number, game_number, point_number)
);

-- ============================================================================
-- 11. MATCH_ODDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_odds (
  id SERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES matches_new(id) ON DELETE CASCADE,
  bookmaker VARCHAR(50),
  odds_type VARCHAR(30) DEFAULT 'match_winner',
  
  odds_player1 DECIMAL(8,3),
  odds_player2 DECIMAL(8,3),
  
  is_opening BOOLEAN DEFAULT false,
  is_closing BOOLEAN DEFAULT false,
  recorded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. HEAD_TO_HEAD
-- ============================================================================
CREATE TABLE IF NOT EXISTS head_to_head (
  id SERIAL PRIMARY KEY,
  player1_id BIGINT REFERENCES players_new(id) ON DELETE CASCADE,
  player2_id BIGINT REFERENCES players_new(id) ON DELETE CASCADE,
  
  total_matches INTEGER DEFAULT 0,
  player1_wins INTEGER DEFAULT 0,
  player2_wins INTEGER DEFAULT 0,
  
  hard_p1_wins INTEGER DEFAULT 0,
  hard_p2_wins INTEGER DEFAULT 0,
  clay_p1_wins INTEGER DEFAULT 0,
  clay_p2_wins INTEGER DEFAULT 0,
  grass_p1_wins INTEGER DEFAULT 0,
  grass_p2_wins INTEGER DEFAULT 0,
  
  last_match_id BIGINT REFERENCES matches_new(id),
  last_match_date DATE,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player1_id, player2_id)
);

-- ============================================================================
-- VIEWS per query comuni
-- ============================================================================

-- Vista match con nomi giocatori
CREATE OR REPLACE VIEW v_matches_with_players AS
SELECT 
  m.*,
  p1.name as player1_name,
  p1.country_code as player1_country,
  p1.current_ranking as player1_current_rank,
  p2.name as player2_name,
  p2.country_code as player2_country,
  p2.current_ranking as player2_current_rank,
  t.name as tournament_name,
  t.category as tournament_category
FROM matches_new m
LEFT JOIN players_new p1 ON m.player1_id = p1.id
LEFT JOIN players_new p2 ON m.player2_id = p2.id
LEFT JOIN tournaments_new t ON m.tournament_id = t.id;

-- Vista ultimi match di un giocatore
CREATE OR REPLACE VIEW v_player_recent_matches AS
SELECT 
  p.id as player_id,
  p.name as player_name,
  m.match_date,
  m.round,
  m.surface,
  t.name as tournament,
  CASE WHEN m.player1_id = p.id THEN p2.name ELSE p1.name END as opponent,
  CASE WHEN m.winner_id = p.id THEN 'W' ELSE 'L' END as result,
  m.score
FROM players_new p
CROSS JOIN LATERAL (
  SELECT * FROM matches_new 
  WHERE player1_id = p.id OR player2_id = p.id
  ORDER BY match_date DESC
  LIMIT 10
) m
LEFT JOIN players_new p1 ON m.player1_id = p1.id
LEFT JOIN players_new p2 ON m.player2_id = p2.id
LEFT JOIN tournaments_new t ON m.tournament_id = t.id;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Funzione per normalizzare nome (per matching)
CREATE OR REPLACE FUNCTION normalize_player_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    TRIM(
      REGEXP_REPLACE(
        TRANSLATE(name, 'áéíóúàèìòùäëïöüâêîôûãñõçÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÑÕÇ', 
                       'aeiouaeiouaeiouaeiouanoc AEIOUAEIOUAEIOUAEIOUANOC'),
        '[^a-zA-Z ]', '', 'g'
      )
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funzione per trovare o creare player
CREATE OR REPLACE FUNCTION find_or_create_player(
  p_name TEXT,
  p_country_code TEXT DEFAULT NULL,
  p_sofascore_id BIGINT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  v_player_id BIGINT;
  v_normalized TEXT;
BEGIN
  v_normalized := normalize_player_name(p_name);
  
  -- Prima cerca per sofascore_id se fornito
  IF p_sofascore_id IS NOT NULL THEN
    SELECT id INTO v_player_id FROM players_new WHERE sofascore_id = p_sofascore_id;
    IF v_player_id IS NOT NULL THEN
      RETURN v_player_id;
    END IF;
  END IF;
  
  -- Cerca per alias
  SELECT player_id INTO v_player_id 
  FROM player_aliases 
  WHERE alias_normalized = v_normalized;
  
  IF v_player_id IS NOT NULL THEN
    RETURN v_player_id;
  END IF;
  
  -- Crea nuovo player
  INSERT INTO players_new (name, country_code, sofascore_id)
  VALUES (p_name, p_country_code, p_sofascore_id)
  RETURNING id INTO v_player_id;
  
  -- Aggiungi alias
  INSERT INTO player_aliases (player_id, alias_name, alias_normalized, source)
  VALUES (v_player_id, p_name, v_normalized, 'auto')
  ON CONFLICT (alias_normalized) DO NOTHING;
  
  RETURN v_player_id;
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare H2H dopo inserimento match
CREATE OR REPLACE FUNCTION update_head_to_head()
RETURNS TRIGGER AS $$
DECLARE
  v_p1 BIGINT;
  v_p2 BIGINT;
BEGIN
  -- Ordina sempre player IDs per consistenza
  IF NEW.player1_id < NEW.player2_id THEN
    v_p1 := NEW.player1_id;
    v_p2 := NEW.player2_id;
  ELSE
    v_p1 := NEW.player2_id;
    v_p2 := NEW.player1_id;
  END IF;
  
  INSERT INTO head_to_head (player1_id, player2_id, total_matches, 
    player1_wins, player2_wins, last_match_id, last_match_date)
  VALUES (v_p1, v_p2, 1,
    CASE WHEN NEW.winner_id = v_p1 THEN 1 ELSE 0 END,
    CASE WHEN NEW.winner_id = v_p2 THEN 1 ELSE 0 END,
    NEW.id, NEW.match_date)
  ON CONFLICT (player1_id, player2_id) DO UPDATE SET
    total_matches = head_to_head.total_matches + 1,
    player1_wins = head_to_head.player1_wins + CASE WHEN NEW.winner_id = v_p1 THEN 1 ELSE 0 END,
    player2_wins = head_to_head.player2_wins + CASE WHEN NEW.winner_id = v_p2 THEN 1 ELSE 0 END,
    last_match_id = NEW.id,
    last_match_date = NEW.match_date,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_h2h
AFTER INSERT ON matches_new
FOR EACH ROW
WHEN (NEW.winner_id IS NOT NULL)
EXECUTE FUNCTION update_head_to_head();

-- ============================================================================
-- GRANT permissions (per Supabase anon key)
-- ============================================================================
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
