-- ============================================================================
-- Migration: Add SVG Momentum columns
-- Aggiunge colonne per salvare momentum estratto da SVG DOM
-- ============================================================================

-- 1. Aggiungi colonne alla tabella power_rankings (vecchio schema)
ALTER TABLE power_rankings 
ADD COLUMN IF NOT EXISTS value_svg INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'api';

-- Commenti per documentazione
COMMENT ON COLUMN power_rankings.value_svg IS 'Valore momentum estratto da SVG DOM (-100 to +100), usato come fallback se value è null';
COMMENT ON COLUMN power_rankings.source IS 'Origine del dato: api (default), svg_dom';

-- 2. Aggiungi colonne alla tabella match_power_rankings_new (nuovo schema)
ALTER TABLE match_power_rankings_new 
ADD COLUMN IF NOT EXISTS value_svg INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'api';

COMMENT ON COLUMN match_power_rankings_new.value_svg IS 'Valore momentum estratto da SVG DOM (-100 to +100), usato come fallback se value è null';
COMMENT ON COLUMN match_power_rankings_new.source IS 'Origine del dato: api (default), svg_dom';

-- 3. Indice per query su source
CREATE INDEX IF NOT EXISTS idx_power_rankings_source ON power_rankings(source);
CREATE INDEX IF NOT EXISTS idx_match_power_rankings_new_source ON match_power_rankings_new(source);

-- 4. View per usare automaticamente value o value_svg come fallback
CREATE OR REPLACE VIEW power_rankings_with_fallback AS
SELECT 
  id,
  match_id,
  set_number,
  game_number,
  COALESCE(value, value_svg) as value_effective,
  value as value_api,
  value_svg,
  break_occurred,
  zone,
  status,
  source,
  CASE 
    WHEN value IS NOT NULL THEN 'api'
    WHEN value_svg IS NOT NULL THEN 'svg_dom'
    ELSE 'none'
  END as value_source
FROM power_rankings;

CREATE OR REPLACE VIEW match_power_rankings_with_fallback AS
SELECT 
  id,
  match_id,
  set_number,
  game_number,
  COALESCE(value, value_svg) as value_effective,
  value as value_api,
  value_svg,
  break_occurred,
  zone,
  favored_player,
  source,
  CASE 
    WHEN value IS NOT NULL THEN 'api'
    WHEN value_svg IS NOT NULL THEN 'svg_dom'
    ELSE 'none'
  END as value_source
FROM match_power_rankings_new;
