# 🎾 FILOSOFIA PBP EXTRACTION – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.

# Regole scoperte dopo 10+ ore debugging. NON MODIFICARE.

---

START FILOSOFIA_PBP_EXTRACTION

SET CONSTITUTIONAL = TRUE
SET TENNIS_RULES_ARE_INVARIANT = TRUE

---

# INVARIANTI TENNIS (NON NEGOZIABILI)

---

INVARIANT SERVER_SCORE_PROGRESSION
Who serves sees THEIR score increase when winning points
IF home_serves AND home_wins_point
THEN homeScore++
IF away_serves AND away_wins_point
THEN awayScore++
END

INVARIANT SERVICE_ALTERNATION
Service alternates every game (except tiebreak)

SET 1:
odd_games: initial_server
even_games: other_player

NEW SET:
first_server = WHO did NOT serve last game of previous set
END

INVARIANT BREAK_DEFINITION
BREAK = winning a game on OPPONENT's serve

IF home_serves AND away_wins_game
THEN break_for = 'away'
IF away_serves AND home_wins_game
THEN break_for = 'home'
END

INVARIANT TIEBREAK_ROTATION
In tiebreak, service rotates every 2 points (after first)

SEQUENCE:
point 1: initial_server
points 2-3: other_player
points 4-5: initial_server
...and so on
END

INVARIANT SCORE_DISPLAY_CONVENTION
Score ALWAYS shown from server's perspective
"40-30" means SERVER has 40, RECEIVER has 30

IN DATABASE:
store homeScore-awayScore (independent of server)
END

INVARIANT POINT_WINNER_EQUALS_SCORE_CHANGE
Who wins the point = who sees their score increase

IF score changes from "15-0" to "15-15"
THEN RECEIVER won
IF score changes from "15-0" to "30-0"
THEN SERVER won
END

---

# REGOLA CRITICA SOFASCORE HTML

---

RULE SOFASCORE_ROW_MAPPING_FIXED
⚠️ MAXIMUM ATTENTION ⚠️

IN SofaScore HTML:
row1 = HOME (first player in header)
row2 = AWAY (second player in header)

THIS NEVER CHANGES regardless of: - who serves - which set/game - if tiebreak or not
END

RULE CORRECT_MAPPING
❌ WRONG: assume mapping changes per block
serverIsTop = blockHeader.includes(serverName)
homeScore = serverIsTop ? row1Score : row2Score

✅ CORRECT: mapping always fixed
homeScore = row1Score // row1 IS ALWAYS HOME
awayScore = row2Score // row2 IS ALWAYS AWAY
END

---

# POINT WINNER DETECTION

---

RULE POINT_WINNER_FROM_CSS
pointWinner determined from CSS COLOR:

IF row1Won OR green_on_row1
THEN pointWinner = 'home'
ELIF row2Won OR green_on_row2
THEN pointWinner = 'away'
ELSE
pointWinner = 'unknown'
END

RULE NEVER_WINNER_FROM_SCORE
❌ NEVER determine winner from who has higher score

WRONG: winner = homeScore > awayScore ? 'home' : 'away'

REASON: score comparison doesn't tell you WHO WON THE POINT
END

---

# SERVER DETECTION

---

RULE SERVER_DETECTION_PRIORITY

1. Ball icon in game header
2. Logical alternation if icon missing
3. homeServed boolean in row
   END

FUNCTION detectServer(game, previousServer)
IF game.hasServerIcon
RETURN game.serverFromIcon

IF previousServer != null
RETURN alternateServer(previousServer)

IF game.rows[0].homeServed != null
RETURN game.rows[0].homeServed ? 'home' : 'away'

RETURN 'unknown'
END

---

# DATA STRUCTURE

---

STRUCT PbpPoint
set_number: int
game_number: int
point_number: int
homeScore: string ("0"|"15"|"30"|"40"|"AD")
awayScore: string
pointWinner: enum (home | away | unknown)
server: enum (home | away)
isBreakPoint: boolean
isTiebreak: boolean
timestamp: ISO8601
END

---

# VALIDATION

---

FUNCTION validatePbpData(points)
FOR EACH point IN points
// Verify score progression makes sense
IF point.pointWinner == 'home'
ASSERT next_homeScore > current_homeScore OR game_ended

    // Verify server alternation
    IF new_game AND NOT tiebreak
      ASSERT server != previous_game.server

    // Verify break calculation
    IF game_won_by != server
      ASSERT is_break == TRUE

END
END

---

# REGOLA FINALE

---

RULE CODE_ADAPTS_TO_TENNIS
IF pbp_data inconsistent with tennis rules
THEN CODE IS WRONG

Tennis rules ARE invariants
Code MUST adapt

NEVER question tennis rules
ALWAYS question code
END

---

RULE API_LAYER_IMPLEMENTATION
WHEN PBPs are served through API

- expose via controllers calling repositories/processors
- server.js must not embed pbp parsing logic
  END

END FILOSOFIA_PBP_EXTRACTION

---

# REFERENCES (INTER-DOCUMENT)

---

REFERENCES
PARENT: FILOSOFIA_MADRE_TENNIS
DEPENDS_ON: - FILOSOFIA_DB (raw_scrape_data storage) - FILOSOFIA_TEMPORAL (scrape timestamps) - FILOSOFIA_REGISTRY_CANON (player name resolution)
OUTPUTS_TO: - FILOSOFIA_LIVE_TRACKING (live point updates) - FILOSOFIA_STATS (point-by-point features) - FILOSOFIA_CALCOLI (break, pressure calculations) - FILOSOFIA_OBSERVABILITY_DATAQUALITY (pbp quality metrics)
END

ASSERT ROW1_IS_HOME
ASSERT ROW2_IS_AWAY
ASSERT WINNER_FROM_CSS
ASSERT TENNIS_RULES_INVARIANT
