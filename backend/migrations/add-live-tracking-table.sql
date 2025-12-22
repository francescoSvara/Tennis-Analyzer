-- ============================================================================
-- MIGRAZIONE: Tabella live_tracking per gestione match live
-- Data: 22 Dicembre 2025
-- Riferimento: FILOSOFIA_LIVE_TRACKING.md
-- ============================================================================

-- Tabella principale per il tracking dei match live
-- Sostituisce l'attuale Map() in-memory di liveManager.js
CREATE TABLE IF NOT EXISTS live_tracking (
  id SERIAL PRIMARY KEY,
  
  -- Identificazione fonte
  source_type VARCHAR(50) DEFAULT 'sofascore' NOT NULL,
  source_event_id VARCHAR(100) NOT NULL UNIQUE,
  
  -- Collegamento al match canonico (opzionale, può essere NULL finché non consolidato)
  match_id INTEGER REFERENCES matches(id) ON DELETE SET NULL,
  
  -- Status del tracking
  -- WATCHING: polling attivo
  -- PAUSED: temporaneamente sospeso (pioggia, problemi tecnici)
  -- FINISHED: match terminato, pronto per consolidamento
  -- ERROR: troppi errori, richiede intervento manuale
  status VARCHAR(20) DEFAULT 'WATCHING' NOT NULL 
    CHECK (status IN ('WATCHING', 'PAUSED', 'FINISHED', 'ERROR')),
  
  -- Priorità polling
  -- HIGH: finali, match importanti (poll ogni 3 sec)
  -- MEDIUM: default (poll ogni 10 sec)
  -- LOW: primo turno, qualificazioni (poll ogni 30 sec)
  priority VARCHAR(10) DEFAULT 'MEDIUM' NOT NULL 
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  
  -- Intervallo di polling in secondi (calcolato da priority)
  poll_interval_sec INTEGER DEFAULT 10 NOT NULL,
  
  -- Timestamps polling
  last_polled_at TIMESTAMP WITH TIME ZONE,
  last_change_at TIMESTAMP WITH TIME ZONE,
  next_poll_at TIMESTAMP WITH TIME ZONE,
  
  -- Hash per rilevare cambiamenti (evita broadcast inutili)
  last_payload_hash VARCHAR(64),
  
  -- Gestione errori
  fail_count INTEGER DEFAULT 0 NOT NULL,
  last_error TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadati match (cache per evitare fetch continui)
  player1_name VARCHAR(255),
  player2_name VARCHAR(255),
  tournament_name VARCHAR(255),
  match_status VARCHAR(50),  -- inprogress, finished, notstarted
  current_score JSONB,       -- {"sets": [[6,4], [3,2]], "game": "30-15", "server": 1}
  
  -- Timestamps standard
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indici per query frequenti
CREATE INDEX IF NOT EXISTS idx_live_tracking_status ON live_tracking(status);
CREATE INDEX IF NOT EXISTS idx_live_tracking_priority ON live_tracking(priority);
CREATE INDEX IF NOT EXISTS idx_live_tracking_next_poll ON live_tracking(next_poll_at) WHERE status = 'WATCHING';
CREATE INDEX IF NOT EXISTS idx_live_tracking_source ON live_tracking(source_type, source_event_id);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_live_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_live_tracking_updated ON live_tracking;
CREATE TRIGGER trigger_live_tracking_updated
  BEFORE UPDATE ON live_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_live_tracking_timestamp();

-- Funzione per calcolare poll_interval_sec da priority
CREATE OR REPLACE FUNCTION calculate_poll_interval(p_priority VARCHAR)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE p_priority
    WHEN 'HIGH' THEN 3
    WHEN 'MEDIUM' THEN 10
    WHEN 'LOW' THEN 30
    ELSE 10
  END;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare poll_interval_sec quando cambia priority
CREATE OR REPLACE FUNCTION update_poll_interval()
RETURNS TRIGGER AS $$
BEGIN
  NEW.poll_interval_sec = calculate_poll_interval(NEW.priority);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_poll_interval ON live_tracking;
CREATE TRIGGER trigger_poll_interval
  BEFORE INSERT OR UPDATE OF priority ON live_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_poll_interval();

-- ============================================================================
-- Tabella per lo storico degli snapshot live (opzionale, per analisi)
-- ============================================================================
CREATE TABLE IF NOT EXISTS live_snapshots (
  id SERIAL PRIMARY KEY,
  
  -- Riferimento al tracking
  live_tracking_id INTEGER REFERENCES live_tracking(id) ON DELETE CASCADE,
  source_event_id VARCHAR(100) NOT NULL,
  
  -- Payload completo SofaScore
  payload JSONB NOT NULL,
  payload_hash VARCHAR(64) NOT NULL,
  
  -- Timestamp snapshot
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indice per query per evento
CREATE INDEX IF NOT EXISTS idx_live_snapshots_event ON live_snapshots(source_event_id, captured_at DESC);

-- Politica di retention: mantieni solo ultime 24 ore (da gestire via cron/job)
COMMENT ON TABLE live_snapshots IS 'Snapshot temporanei dei match live. Retention: 24h';

-- ============================================================================
-- VIEW per match da pollare (ordinati per priorità e scadenza)
-- ============================================================================
CREATE OR REPLACE VIEW live_tracking_due AS
SELECT 
  id,
  source_event_id,
  match_id,
  status,
  priority,
  poll_interval_sec,
  last_polled_at,
  next_poll_at,
  fail_count,
  player1_name,
  player2_name,
  tournament_name,
  current_score,
  CASE priority
    WHEN 'HIGH' THEN 1
    WHEN 'MEDIUM' THEN 2
    WHEN 'LOW' THEN 3
  END as priority_order
FROM live_tracking
WHERE status = 'WATCHING'
  AND (next_poll_at IS NULL OR next_poll_at <= NOW())
ORDER BY priority_order ASC, last_polled_at ASC NULLS FIRST;

COMMENT ON VIEW live_tracking_due IS 'Match pronti per il prossimo poll, ordinati per priorità';

-- ============================================================================
-- Esempio di insert
-- ============================================================================
-- INSERT INTO live_tracking (source_event_id, priority, player1_name, player2_name, tournament_name)
-- VALUES ('12345678', 'HIGH', 'Jannik Sinner', 'Carlos Alcaraz', 'Australian Open');
