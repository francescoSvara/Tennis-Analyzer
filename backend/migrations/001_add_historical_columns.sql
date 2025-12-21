-- ============================================================================
-- MIGRAZIONE: Aggiunta colonne per dati storici ATP/WTA xlsx
-- Data: 2025-12-21
-- Descrizione: Aggiunge colonne per importare dati storici da file xlsx
-- ============================================================================

-- NOTA: Esegui questo script nella console SQL di Supabase
-- Dashboard > SQL Editor > New query > Incolla e Run

-- 1. Aggiungi colonne informazioni torneo/match
ALTER TABLE matches ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS series TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS court_type TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS surface TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS best_of INTEGER;

-- 2. Aggiungi colonne per nomi giocatori (utile per import storico senza ID)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_name TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS loser_name TEXT;

-- 3. Aggiungi colonne ranking e punti
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_rank INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS loser_rank INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_points INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS loser_points INTEGER;

-- 4. Aggiungi colonne per i games di ogni set (W1-W5, L1-L5)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS w1 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS l1 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS w2 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS l2 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS w3 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS l3 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS w4 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS l4 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS w5 INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS l5 INTEGER;

-- 5. Aggiungi colonne set totali
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_sets INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS loser_sets INTEGER;

-- 6. Aggiungi colonna commenti/note
ALTER TABLE matches ADD COLUMN IF NOT EXISTS comment TEXT;

-- 7. Aggiungi colonne quote bookmakers
-- Bet365
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_b365_winner DECIMAL(6,3);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_b365_loser DECIMAL(6,3);

-- Pinnacle Sports
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_ps_winner DECIMAL(6,3);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_ps_loser DECIMAL(6,3);

-- Quote massime
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_max_winner DECIMAL(6,3);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_max_loser DECIMAL(6,3);

-- Quote medie
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_avg_winner DECIMAL(6,3);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_avg_loser DECIMAL(6,3);

-- Betfair Exchange
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_bfe_winner DECIMAL(6,3);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS odds_bfe_loser DECIMAL(6,3);

-- 8. Aggiungi colonna per identificare la fonte dei dati
ALTER TABLE matches ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'sofascore';

-- 9. Crea indici per migliorare le query
CREATE INDEX IF NOT EXISTS idx_matches_location ON matches(location);
CREATE INDEX IF NOT EXISTS idx_matches_surface ON matches(surface);
CREATE INDEX IF NOT EXISTS idx_matches_series ON matches(series);
CREATE INDEX IF NOT EXISTS idx_matches_winner_name ON matches(winner_name);
CREATE INDEX IF NOT EXISTS idx_matches_loser_name ON matches(loser_name);
CREATE INDEX IF NOT EXISTS idx_matches_data_source ON matches(data_source);

-- 10. Commenti sulle colonne (documentazione)
COMMENT ON COLUMN matches.location IS 'Città/luogo del torneo (es: Brisbane, Melbourne)';
COMMENT ON COLUMN matches.series IS 'Livello torneo (ATP250, ATP500, ATP1000, Grand Slam, etc.)';
COMMENT ON COLUMN matches.court_type IS 'Tipo campo: Indoor o Outdoor';
COMMENT ON COLUMN matches.surface IS 'Superficie: Hard, Clay, Grass, Carpet';
COMMENT ON COLUMN matches.best_of IS 'Formato match: 3 o 5 set';
COMMENT ON COLUMN matches.winner_name IS 'Nome vincitore (per import storici)';
COMMENT ON COLUMN matches.loser_name IS 'Nome perdente (per import storici)';
COMMENT ON COLUMN matches.winner_rank IS 'Ranking ATP/WTA del vincitore al momento del match';
COMMENT ON COLUMN matches.loser_rank IS 'Ranking ATP/WTA del perdente al momento del match';
COMMENT ON COLUMN matches.winner_points IS 'Punti ATP/WTA del vincitore';
COMMENT ON COLUMN matches.loser_points IS 'Punti ATP/WTA del perdente';
COMMENT ON COLUMN matches.w1 IS 'Games vinti dal winner nel set 1';
COMMENT ON COLUMN matches.l1 IS 'Games vinti dal loser nel set 1';
COMMENT ON COLUMN matches.winner_sets IS 'Totale set vinti dal winner';
COMMENT ON COLUMN matches.loser_sets IS 'Totale set vinti dal loser';
COMMENT ON COLUMN matches.comment IS 'Note sul match (Completed, Retired, Walkover, etc.)';
COMMENT ON COLUMN matches.odds_b365_winner IS 'Quota Bet365 per il vincitore';
COMMENT ON COLUMN matches.odds_b365_loser IS 'Quota Bet365 per il perdente';
COMMENT ON COLUMN matches.odds_ps_winner IS 'Quota Pinnacle Sports per il vincitore';
COMMENT ON COLUMN matches.odds_ps_loser IS 'Quota Pinnacle Sports per il perdente';
COMMENT ON COLUMN matches.odds_max_winner IS 'Quota massima disponibile per il vincitore';
COMMENT ON COLUMN matches.odds_max_loser IS 'Quota massima disponibile per il perdente';
COMMENT ON COLUMN matches.odds_avg_winner IS 'Quota media per il vincitore';
COMMENT ON COLUMN matches.odds_avg_loser IS 'Quota media per il perdente';
COMMENT ON COLUMN matches.odds_bfe_winner IS 'Quota Betfair Exchange per il vincitore';
COMMENT ON COLUMN matches.odds_bfe_loser IS 'Quota Betfair Exchange per il perdente';
COMMENT ON COLUMN matches.data_source IS 'Fonte dati: sofascore, xlsx_import, manual';

-- ============================================================================
-- FINE MIGRAZIONE
-- ============================================================================
