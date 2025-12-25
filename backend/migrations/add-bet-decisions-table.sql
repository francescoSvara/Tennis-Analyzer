-- ============================================================================
-- Migration: add-bet-decisions-table.sql
-- Description: Create bet_decisions table for audit/logging betting decisions
-- 
-- Purpose: Log recommended/placed bets with full context for:
-- - Audit trail (why did we bet?)
-- - Backtest on real recommendations
-- - Performance analysis per strategy/version
-- 
-- Ref: docs/filosofie/FILOSOFIA_RISK_BANKROLL.md
-- ============================================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS bet_decisions (
  -- Primary key
  id BIGSERIAL PRIMARY KEY,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Identity (match context)
  match_id BIGINT NOT NULL,
  player_a_id BIGINT,
  player_b_id BIGINT,
  tournament_id BIGINT,
  
  -- Temporal context (CRITICAL for reproducibility)
  as_of_time TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  
  -- Versions (CRITICAL for audit - lineage tracking)
  versions JSONB NOT NULL,
  -- Example: {"bundle": "2.0.0", "features": "v1.0.0", "strategies": "v1.0.0", "risk": "v1.0.0"}
  
  -- Market info
  market TEXT NOT NULL,           -- e.g., "match_winner", "set_winner", "game_handicap"
  selection TEXT NOT NULL,        -- e.g., "home", "away", "over", "under"
  book_id TEXT,                   -- optional: bookmaker identifier
  
  -- Prices
  price_seen NUMERIC(10,4),              -- observed market price
  price_min_acceptable NUMERIC(10,4),    -- value line threshold
  implied_prob NUMERIC(10,6),            -- 1 / price_seen
  model_prob NUMERIC(10,6),              -- model/strategy probability
  edge NUMERIC(10,6),                    -- model_prob - implied_prob
  
  -- Stake & Risk
  bankroll NUMERIC(14,2),
  stake_recommended NUMERIC(14,2),
  stake_final NUMERIC(14,2),
  kelly_fraction NUMERIC(10,6),
  risk JSONB,
  -- Example: {"level": "MEDIUM", "score": 45, "factors": ["Low edge"]}
  
  -- Decision
  decision TEXT NOT NULL,
  -- Values: "NO_BET" | "WATCH" | "RECOMMEND" | "PLACE"
  
  confidence NUMERIC(10,6),
  reason_codes TEXT[] DEFAULT '{}',
  -- Example: ["EDGE_POSITIVE", "STRATEGY_LAYBREAK_READY", "VOLATILITY_HIGH"]
  
  -- Snapshot (lightweight - for debugging)
  bundle_meta JSONB,
  -- Contains: source, as_of_time, versions, quality (NOT full tabs)
  
  -- Notes (manual annotation)
  notes TEXT,
  
  -- Constraints
  CONSTRAINT valid_decision CHECK (decision IN ('NO_BET', 'WATCH', 'RECOMMEND', 'PLACE')),
  CONSTRAINT valid_market CHECK (market IS NOT NULL AND market != ''),
  CONSTRAINT valid_selection CHECK (selection IS NOT NULL AND selection != '')
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup: by match and time
CREATE INDEX IF NOT EXISTS idx_bet_decisions_match_time
  ON bet_decisions(match_id, as_of_time DESC);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_bet_decisions_created
  ON bet_decisions(created_at DESC);

-- Decision analysis
CREATE INDEX IF NOT EXISTS idx_bet_decisions_decision
  ON bet_decisions(decision, created_at DESC);

-- Strategy/version analysis (JSONB)
CREATE INDEX IF NOT EXISTS idx_bet_decisions_versions
  ON bet_decisions USING GIN(versions);

-- Market analysis
CREATE INDEX IF NOT EXISTS idx_bet_decisions_market
  ON bet_decisions(market, selection);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE bet_decisions IS 'Audit log for betting decisions (recommendations and placements)';
COMMENT ON COLUMN bet_decisions.as_of_time IS 'Point-in-time when decision was calculated (anti-leakage)';
COMMENT ON COLUMN bet_decisions.versions IS 'Version lineage for reproducibility: bundle, features, strategies, risk versions';
COMMENT ON COLUMN bet_decisions.edge IS 'Calculated edge: model_prob - implied_prob';
COMMENT ON COLUMN bet_decisions.decision IS 'Decision outcome: NO_BET (no value), WATCH (monitor), RECOMMEND (value found), PLACE (bet executed)';
COMMENT ON COLUMN bet_decisions.bundle_meta IS 'Lightweight snapshot of bundle meta (NOT full data) for debugging';

-- ============================================================================
-- GRANTS (adjust as needed for your setup)
-- ============================================================================

-- Example: GRANT SELECT, INSERT ON bet_decisions TO your_backend_role;
