# Nuovo Schema Database - Separazione Dati Match/Player

## Problema Attuale
I dati sono mischiati tra:
- Match data (risultato, punteggio, statistiche partita)
- Player data (ranking, nazionalità, statistiche carriera)
- Source data (sofascore, svg_momentum)

## Nuova Architettura

### 1. PLAYERS (Dati anagrafici tennista)
```sql
CREATE TABLE players (
  id BIGINT PRIMARY KEY,                    -- SofaScore ID se disponibile
  name TEXT NOT NULL,                        -- Nome display
  full_name TEXT,                            -- Nome completo
  first_name TEXT,
  last_name TEXT,
  slug TEXT,
  country_code VARCHAR(3),                   -- ISO Alpha-2/3
  country_name TEXT,
  birth_date DATE,
  height_cm INTEGER,
  weight_kg INTEGER,
  plays VARCHAR(20),                         -- 'Right-Handed', 'Left-Handed'
  backhand VARCHAR(20),                      -- 'One-Handed', 'Two-Handed'
  turned_pro INTEGER,                        -- Anno
  gender VARCHAR(10) DEFAULT 'male',
  is_active BOOLEAN DEFAULT true,
  
  -- Identificatori esterni per matching
  sofascore_id BIGINT,
  atp_id TEXT,
  wta_id TEXT,
  itf_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alias per matching nomi (es: "De Minaur" = "de Minaur" = "Alex De Minaur")
CREATE TABLE player_aliases (
  id SERIAL PRIMARY KEY,
  player_id BIGINT REFERENCES players(id),
  alias_name TEXT NOT NULL,
  source TEXT,                               -- 'sofascore', 'manual'
  UNIQUE(alias_name)
);
```

### 2. PLAYER_RANKINGS (Storico ranking)
```sql
CREATE TABLE player_rankings (
  id SERIAL PRIMARY KEY,
  player_id BIGINT REFERENCES players(id),
  ranking_date DATE NOT NULL,
  ranking INTEGER NOT NULL,
  points INTEGER,
  ranking_type VARCHAR(20) DEFAULT 'ATP',    -- 'ATP', 'WTA', 'ITF'
  
  -- ELO per superficie (calcolati)
  elo_overall DECIMAL(7,2),
  elo_hard DECIMAL(7,2),
  elo_clay DECIMAL(7,2),
  elo_grass DECIMAL(7,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, ranking_date, ranking_type)
);
```

### 3. PLAYER_STATS (Statistiche carriera per superficie)
```sql
CREATE TABLE player_career_stats (
  id SERIAL PRIMARY KEY,
  player_id BIGINT REFERENCES players(id),
  surface VARCHAR(20),                       -- 'hard', 'clay', 'grass', 'carpet', 'all'
  year INTEGER,                              -- NULL = career totals
  
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  win_percentage DECIMAL(5,2),
  
  -- Serve stats
  aces_total INTEGER,
  double_faults_total INTEGER,
  first_serve_pct DECIMAL(5,2),
  first_serve_won_pct DECIMAL(5,2),
  second_serve_won_pct DECIMAL(5,2),
  
  -- Return stats
  return_games_won_pct DECIMAL(5,2),
  break_points_saved_pct DECIMAL(5,2),
  break_points_converted_pct DECIMAL(5,2),
  
  -- Tiebreaks
  tiebreaks_won INTEGER,
  tiebreaks_played INTEGER,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, surface, year)
);
```

### 4. TOURNAMENTS (Tornei)
```sql
CREATE TABLE tournaments (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  category VARCHAR(20),                      -- 'ATP', 'WTA', 'Grand Slam', 'Masters 1000'
  surface VARCHAR(20),                       -- 'hard', 'clay', 'grass'
  indoor BOOLEAN DEFAULT false,
  country_code VARCHAR(3),
  country_name TEXT,
  city TEXT,
  start_date DATE,
  end_date DATE,
  prize_money INTEGER,
  prize_currency VARCHAR(3) DEFAULT 'USD',
  draw_size INTEGER,
  
  sofascore_id BIGINT,
  atp_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. MATCHES (Match - dati di base)
```sql
CREATE TABLE matches (
  id BIGINT PRIMARY KEY,                     -- ID SofaScore (event_id)
  
  -- Riferimenti
  player1_id BIGINT REFERENCES players(id),  -- Home player
  player2_id BIGINT REFERENCES players(id),  -- Away player
  winner_id BIGINT REFERENCES players(id),
  tournament_id BIGINT REFERENCES tournaments(id),
  
  -- Timing
  match_date DATE NOT NULL,
  match_time TIME,
  start_timestamp BIGINT,                    -- Unix timestamp
  
  -- Match info
  round VARCHAR(50),                         -- 'Final', 'Semifinal', 'R16', etc.
  best_of INTEGER DEFAULT 3,
  surface VARCHAR(20),
  
  -- Result
  status VARCHAR(20) DEFAULT 'finished',     -- 'finished', 'live', 'scheduled', 'retired', 'walkover'
  winner_code INTEGER,                       -- 1 = player1, 2 = player2
  
  -- Score compatto
  score TEXT,                                -- "6-4 7-5" o "6-4 3-6 7-6(5)"
  sets_player1 INTEGER,
  sets_player2 INTEGER,
  
  -- Set details (denormalizzato per query veloci)
  set1_p1 INTEGER, set1_p2 INTEGER, set1_tb INTEGER,
  set2_p1 INTEGER, set2_p2 INTEGER, set2_tb INTEGER,
  set3_p1 INTEGER, set3_p2 INTEGER, set3_tb INTEGER,
  set4_p1 INTEGER, set4_p2 INTEGER, set4_tb INTEGER,
  set5_p1 INTEGER, set5_p2 INTEGER, set5_tb INTEGER,
  
  -- Rankings at match time
  player1_rank INTEGER,
  player2_rank INTEGER,
  player1_seed INTEGER,
  player2_seed INTEGER,
  
  -- Metadata
  data_quality INTEGER DEFAULT 50,           -- 0-100, quanto sono completi i dati
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. MATCH_DATA_SOURCES (Traccia fonti dati)
```sql
CREATE TABLE match_data_sources (
  id SERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES matches(id),
  source_type VARCHAR(50) NOT NULL,          -- 'sofascore', 'svg_momentum'
  source_id TEXT,                            -- ID nella fonte originale
  source_url TEXT,
  
  -- Quali dati provengono da questa fonte
  has_score BOOLEAN DEFAULT false,
  has_statistics BOOLEAN DEFAULT false,
  has_power_rankings BOOLEAN DEFAULT false,
  has_point_by_point BOOLEAN DEFAULT false,
  has_odds BOOLEAN DEFAULT false,
  
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, source_type)
);
```

### 7. MATCH_STATISTICS (Statistiche partita)
```sql
CREATE TABLE match_statistics (
  id SERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES matches(id),
  period VARCHAR(20) DEFAULT 'ALL',          -- 'ALL', 'SET1', 'SET2', etc.
  
  -- Serve stats player 1
  p1_aces INTEGER,
  p1_double_faults INTEGER,
  p1_first_serve_pct DECIMAL(5,2),
  p1_first_serve_won INTEGER,
  p1_first_serve_total INTEGER,
  p1_second_serve_won INTEGER,
  p1_second_serve_total INTEGER,
  
  -- Serve stats player 2
  p2_aces INTEGER,
  p2_double_faults INTEGER,
  p2_first_serve_pct DECIMAL(5,2),
  p2_first_serve_won INTEGER,
  p2_first_serve_total INTEGER,
  p2_second_serve_won INTEGER,
  p2_second_serve_total INTEGER,
  
  -- Break points
  p1_break_points_won INTEGER,
  p1_break_points_total INTEGER,
  p2_break_points_won INTEGER,
  p2_break_points_total INTEGER,
  
  -- Points
  p1_total_points_won INTEGER,
  p2_total_points_won INTEGER,
  
  -- Other
  p1_winners INTEGER,
  p1_unforced_errors INTEGER,
  p2_winners INTEGER,
  p2_unforced_errors INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8. MATCH_POWER_RANKINGS (Momentum)
```sql
CREATE TABLE match_power_rankings (
  id SERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES matches(id),
  set_number INTEGER NOT NULL,
  game_number INTEGER NOT NULL,
  
  value INTEGER NOT NULL,                    -- -100 to +100
  break_occurred BOOLEAN DEFAULT false,
  
  -- Zona interpretata
  zone VARCHAR(30),                          -- 'strong_control', 'advantage', 'balanced', 'pressure', 'critical'
  favored_player INTEGER,                    -- 1 o 2
  
  timestamp_game BIGINT,                     -- Quando è stato il game
  
  UNIQUE(match_id, set_number, game_number)
);
```

### 9. MATCH_POINT_BY_POINT
```sql
CREATE TABLE match_point_by_point (
  id SERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES matches(id),
  set_number INTEGER NOT NULL,
  game_number INTEGER NOT NULL,
  point_number INTEGER NOT NULL,
  
  score_p1 VARCHAR(10),                      -- '15', '30', '40', 'AD'
  score_p2 VARCHAR(10),
  
  server INTEGER,                            -- 1 o 2
  point_winner INTEGER,                      -- 1 o 2
  
  is_ace BOOLEAN DEFAULT false,
  is_double_fault BOOLEAN DEFAULT false,
  is_winner BOOLEAN DEFAULT false,
  is_unforced_error BOOLEAN DEFAULT false,
  
  rally_length INTEGER,
  point_description TEXT,
  
  UNIQUE(match_id, set_number, game_number, point_number)
);
```

### 10. MATCH_ODDS (Quote)
```sql
CREATE TABLE match_odds (
  id SERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES matches(id),
  bookmaker VARCHAR(50),                     -- 'betfair', 'pinnacle', 'bet365'
  odds_type VARCHAR(20) DEFAULT 'match_winner',
  
  odds_player1 DECIMAL(8,3),
  odds_player2 DECIMAL(8,3),
  
  recorded_at TIMESTAMPTZ,                   -- Quando è stata registrata la quota
  is_opening BOOLEAN DEFAULT false,          -- Quota apertura vs live
  is_closing BOOLEAN DEFAULT false,          -- Quota chiusura
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11. HEAD_TO_HEAD (Storico H2H)
```sql
CREATE TABLE head_to_head (
  id SERIAL PRIMARY KEY,
  player1_id BIGINT REFERENCES players(id),
  player2_id BIGINT REFERENCES players(id),
  
  -- Totali
  total_matches INTEGER DEFAULT 0,
  player1_wins INTEGER DEFAULT 0,
  player2_wins INTEGER DEFAULT 0,
  
  -- Per superficie
  hard_p1_wins INTEGER DEFAULT 0,
  hard_p2_wins INTEGER DEFAULT 0,
  clay_p1_wins INTEGER DEFAULT 0,
  clay_p2_wins INTEGER DEFAULT 0,
  grass_p1_wins INTEGER DEFAULT 0,
  grass_p2_wins INTEGER DEFAULT 0,
  
  last_match_id BIGINT REFERENCES matches(id),
  last_match_date DATE,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player1_id, player2_id)
);
```

---

## Flusso Dati Proposto

### Import da SofaScore API:
```
SofaScore → Trova/Crea Player (con sofascore_id) → Crea Match → 
  → Import Statistics → Import PowerRankings → Import PointByPoint
  → Segna source 'sofascore'
```

### Import SVG Momentum:
```
SVG Data → Parse Momentum Values → Associa a Match esistente →
  → Calcola PowerRankings game-by-game → Segna source 'svg_momentum'
```

---

## API Card Match

```javascript
GET /api/match/:id/card
{
  // Match info
  match: {
    id, date, round, surface, tournament, score, winner
  },
  
  // Player 1 info (dal DB players + rankings)
  player1: {
    id, name, country, age, height,
    current_ranking, ranking_at_match,
    career_stats: { win_pct_surface, aces_per_match, ... },
    recent_form: [ last_5_results ]
  },
  
  // Player 2 info
  player2: { ... },
  
  // H2H
  h2h: {
    total: "5-3",
    on_surface: "2-1",
    last_match: { ... }
  },
  
  // Match details (se disponibili)
  statistics: { ... },
  momentum: [ power_rankings ],
  point_by_point: [ ... ],
  
  // Odds (se disponibili)
  odds: {
    opening: { p1: 1.85, p2: 2.10 },
    closing: { p1: 1.75, p2: 2.20 }
  },
  
  // Data quality
  data_sources: ['sofascore', 'svg_momentum'],
  data_completeness: 85  // percentuale
}
```

---

## Prossimi Passi

1. **Creare nuove tabelle** in Supabase
2. **Migrare dati esistenti** dalla struttura attuale
3. **Creare servizio PlayerService** per gestire dati giocatori
4. **Creare MatchCardService** per assemblare card complete
5. **Aggiornare frontend** per usare nuovo formato

