-- Migration: Add 'scoring' column to point_by_point table
-- Purpose: Track who wins each game for break detection
-- Formula: break = (serving != scoring)
--   - serving = 1 -> home serves
--   - serving = 2 -> away serves  
--   - scoring = 1 -> home wins game
--   - scoring = 2 -> away wins game

-- Add the scoring column if it doesn't exist
ALTER TABLE point_by_point 
ADD COLUMN IF NOT EXISTS scoring INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN point_by_point.scoring IS 'Who won the game: 1=home, 2=away. Used with serving to detect breaks (break when serving != scoring)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'point_by_point' 
AND column_name = 'scoring';
