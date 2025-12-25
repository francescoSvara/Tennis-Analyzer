# 🔖 FILOSOFIA REGISTRY & CANONICAL IDs  
## Versione V1 – Entity Resolution & Normalization

> **Dominio**: Canonical IDs · Entity Resolution · Data Normalization  
> **Stato**: ATTIVA  
> **Ultimo aggiornamento**: Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|----------------|
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | Tutte le fonti (XLSX, SofaScore, Odds APIs) | [DB](../storage/FILOSOFIA_DB.md), [STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md) |

### � Documenti Correlati (stesso layer)
| Documento | Relazione |
|-----------|-----------|
| [DB](../storage/FILOSOFIA_DB.md) | Storage canonical IDs |
| [TEMPORAL](../temporal/FILOSOFIA_TEMPORAL.md) | Timestamps per resolution history |
| [LINEAGE_VERSIONING](../lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) | Versioning entity mappings |
| [OBSERVABILITY](../quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Resolution quality metrics |

### �📁 File Codice Principali
| File | Descrizione | Responsabilità |
|------|-------------|----------------|
| [`backend/services/dataNormalizer.js`](../../backend/services/dataNormalizer.js) | Normalizzazione e mapping | Resolve player/tournament names → canonical IDs |
| [`backend/db/matchRepository.js`](../../backend/db/matchRepository.js) | Persistenza match | Salva solo con canonical IDs |
| [`backend/importXlsx.js`](../../backend/importXlsx.js) | Import legacy matches | Map winner_name/loser_name → player_id |
| [`backend/merge-xlsx-sofascore.js`](../../backend/merge-xlsx-sofascore.js) | Cross-source linking | Legacy ↔ SofaScore |
| [`backend/scraper/sofascoreScraper.js`](../../backend/scraper/sofascoreScraper.js) | Scraping SofaScore | Ottiene player_id nativo |

---

## 0️⃣ PERCHÉ ESISTE (GAMBLER REASON)

> **Il betting muore se le stats si attaccano al player sbagliato.**

Problema reale:
```text
Legacy XLSX: "Carlos Alcaraz Garfia"
SofaScore:   "Alcaraz C."
Odds API:    "C. Alcaraz"

Se non risolvi → 3 player diversi → stats sbagliate → edge finto.
```

Il progetto ha **più fonti**:
- XLSX legacy (~2600 match) con `winner_name`, `loser_name` (string)
- SofaScore con `home_player_id`, `away_player_id` (int)
- Odds provider con nomi variabili

**Serve un "canon"**: una singola identità per ogni entità.

---

## 1️⃣ ENTITÀ CANONICHE (ID OBBLIGATORI)

Ogni cosa nel sistema deve avere un **canonical_id** stabile:

### 1.1 PlayerCanonical

```typescript
interface PlayerCanonical {
  player_id: string;         // canonical ID (es. "sof_123456" o UUID)
  name: string;              // nome display preferito
  name_variants: string[];   // alias noti
  dob?: Date;                // disambiguatore
  country?: string;
  sources: {
    sofascore_id?: number;
    atp_id?: number;
    wta_id?: number;
    // ...
  };
}
```

**Storage**: `players` table

---

### 1.2 MatchCanonical

```typescript
interface MatchCanonical {
  match_id: string;              // canonical ID (es. UUID o "sof_12345678")
  home_player_id: string;        // FK → players.player_id
  away_player_id: string;        // FK → players.player_id
  tournament_id: string;         // FK → tournaments.tournament_id
  event_time: Date;
  surface: SurfaceEnum;          // normalizzato
  best_of: 3 | 5;
  status: MatchStatus;
  sources: {
    sofascore_id?: number;
    legacy_xlsx_row?: number;
    // ...
  };
}
```

**Storage**: `matches_new` table

---

### 1.3 TournamentCanonical

```typescript
interface TournamentCanonical {
  tournament_id: string;     // canonical ID
  name: string;              // nome display
  name_variants: string[];
  location?: string;
  category: "GrandSlam" | "Masters1000" | "ATP500" | "ATP250" | ...;
  surface: SurfaceEnum;
  sources: {
    sofascore_id?: number;
    atp_id?: string;
    // ...
  };
}
```

**Storage**: `tournaments` table

---

### 1.4 BookCanonical

```typescript
interface BookCanonical {
  book_id: string;       // "bet365", "pinnacle", ...
  name: string;
  is_sharp: boolean;     // per market analysis
  markets: string[];     // "match_winner", "set_winner", ...
}
```

**Storage**: config file o `books` table

---

### 1.5 MarketCanonical

```typescript
type MarketEnum = 
  | "match_winner"
  | "set_winner"
  | "game_handicap"
  | "total_games"
  | ...;
```

**Storage**: enum stabile (non DB)

---

## 2️⃣ REGOLA FONDAMENTALE

> **Il FE/Strategy lavora SOLO su canonical_id.**

❌ NON accettabile:
```javascript
// Frontend
const playerName = "Alcaraz";  // string grezzo
const stats = getStats(playerName);  // ❌ fragile
```

✅ Corretto:
```javascript
// Frontend
const player_id = bundle.header.home_player.player_id;
const stats = getStats(player_id);  // ✅ robusto
```

---

## 3️⃣ MAPPING & RESOLUTION (COME RISOLVI)

### 3.1 Normalizzazione Nomi

**Passaggi standard**:
1. Trim whitespace
2. Unicode normalize (NFD → rimuovi accenti opzionale)
3. Lowercase
4. Rimuovi caratteri speciali (`-`, `.`, etc.)

**Esempio**:
```javascript
function normalizeName(name) {
  return name
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // rimuovi accenti
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '');  // solo alphanum
}

normalizeName("Carlos Alcaraz Garfia")  // "carlos alcaraz garfia"
normalizeName("Alcaraz C.")              // "alcaraz c"
```

---

### 3.2 Alias Mapping

**Struttura**:
```javascript
const PLAYER_ALIASES = {
  "sof_123456": [
    "Carlos Alcaraz Garfia",
    "Alcaraz C.",
    "C. Alcaraz",
    "Carlos Alcaraz"
  ],
  "sof_789012": [
    "Novak Djokovic",
    "Djokovic N.",
    "N. Djokovic"
  ]
};
```

**Storage**: `players.name_variants` (JSONB) o file config

---

### 3.3 Deduplication Rules

**"Same person" se**:
1. Nome normalizzato identico + DOB identico (se disponibile)
2. Nome normalizzato molto simile (Levenshtein < 3) + country identico
3. Match manual in alias mapping

**Algoritmo**:
```javascript
function resolvePlayers(rawPlayers) {
  const canonical = [];
  
  for (const raw of rawPlayers) {
    const normalized = normalizeName(raw.name);
    
    // Check alias mapping
    const existing = findByAlias(normalized);
    if (existing) {
      linkToCanonical(raw, existing);
      continue;
    }
    
    // Check fuzzy match + DOB
    const similar = findSimilar(normalized, raw.dob);
    if (similar && similar.similarity > 0.9) {
      linkToCanonical(raw, similar);
      continue;
    }
    
    // Create new canonical
    const newCanonical = createCanonicalPlayer(raw);
    canonical.push(newCanonical);
  }
  
  return canonical;
}
```

---

### 3.4 Cross-Source Linking (Legacy ↔ SofaScore)

**Problema**: legacy matches hanno `winner_name` (string), SofaScore ha `home_player_id` (int).

**Strategia**:
1. Normalizza `winner_name` / `loser_name`
2. Match con `players.name_variants`
3. Se match → `UPDATE matches SET winner_player_id = ...`
4. Se no match → crea entry in `unresolved_players` per review

**Pseudo-codice**:
```javascript
async function linkLegacyMatches() {
  const legacyMatches = await db.query('SELECT * FROM matches WHERE winner_player_id IS NULL');
  
  for (const match of legacyMatches) {
    const winnerId = await resolvePlayerName(match.winner_name);
    const loserId = await resolvePlayerName(match.loser_name);
    
    if (winnerId && loserId) {
      await db.query(`
        UPDATE matches 
        SET winner_player_id = $1, loser_player_id = $2 
        WHERE match_id = $3
      `, [winnerId, loserId, match.match_id]);
    } else {
      await db.query(`
        INSERT INTO unresolved_players (match_id, name)
        VALUES ($1, $2)
      `, [match.match_id, match.winner_name]);
    }
  }
}
```

---

### 3.5 Tournament Normalization

**Campi da normalizzare**:
- Nome: "Australian Open" vs "AO" vs "Aus Open"
- Location: "Melbourne" vs "Melbourne Park"
- Surface: "hard" vs "Hard" vs "HARD" → enum `SurfaceEnum.HARD`

**Standard**:
```typescript
enum SurfaceEnum {
  HARD = "hard",
  CLAY = "clay",
  GRASS = "grass",
  CARPET = "carpet",
  UNKNOWN = "unknown"
}

enum TournamentCategory {
  GRAND_SLAM = "grand_slam",
  MASTERS_1000 = "masters_1000",
  ATP_500 = "atp_500",
  ATP_250 = "atp_250",
  CHALLENGER = "challenger",
  // ...
}
```

---

## 4️⃣ CANONICAL SCHEMA CONTRACT (MINIMO INDISPENSABILE)

### Match Canonico Valido

**Requisiti obbligatori**:
```typescript
interface ValidMatchCanonical {
  match_id: string;                    // ✅ unique
  home_player_id: string;              // ✅ FK valido
  away_player_id: string;              // ✅ FK valido
  tournament_id: string;               // ✅ FK valido
  surface: SurfaceEnum;                // ✅ enum normalizzato
  best_of: 3 | 5;                      // ✅ coerente
  status: "scheduled" | "live" | "finished" | "retired" | "walkover";  // ✅ enum
  event_time: Date;                    // ✅ required
}
```

**Se manca uno di questi → match va in "quarantine"**:
```javascript
async function validateMatch(match) {
  const errors = [];
  
  if (!match.match_id) errors.push('missing match_id');
  if (!match.home_player_id) errors.push('missing home_player_id');
  if (!match.away_player_id) errors.push('missing away_player_id');
  if (!match.tournament_id) errors.push('missing tournament_id');
  if (!['hard', 'clay', 'grass', 'carpet'].includes(match.surface)) {
    errors.push('invalid surface');
  }
  if (![3, 5].includes(match.best_of)) errors.push('invalid best_of');
  
  if (errors.length > 0) {
    await db.query(`
      INSERT INTO quarantine_matches (match_id, errors)
      VALUES ($1, $2)
    `, [match.match_id, JSON.stringify(errors)]);
    return false;
  }
  
  return true;
}
```

---

## 5️⃣ DOVE VIVE LA LOGICA

### 5.1 `backend/services/dataNormalizer.js`

**Responsabilità**:
- Normalizzazione nomi
- Resolution player/tournament
- Mapping cross-source
- Dedup detection

**Funzioni chiave**:
```javascript
- normalizeName(name)
- resolvePlayerName(name, dob?, country?)
- resolveTournamentName(name, location?)
- linkLegacyToCanonical(legacyMatch)
- detectDuplicatePlayers()
```

**TODO**: se non esiste, crearlo.

---

### 5.2 `backend/db/matchRepository.js`

**Responsabilità**:
- Persistenza solo con canonical IDs
- Validazione schema before insert
- Query su canonical tables

**Regola**:
```javascript
// ❌ VIETATO
await matchRepository.saveMatch({
  winner_name: "Alcaraz",  // string grezzo
  loser_name: "Sinner"
});

// ✅ OBBLIGATORIO
await matchRepository.saveMatch({
  home_player_id: "sof_123456",
  away_player_id: "sof_789012",
  tournament_id: "tour_001"
});
```

---

### 5.3 NOTA: Frontend NON fa resolution

Il frontend:
- ✅ Consuma `player_id` già canonici dal bundle
- ✅ Mostra `player.name` (display name)
- ❌ NON chiama `resolvePlayerName()`
- ❌ NON fa fuzzy matching

Tutta la resolution = **backend only**.

---

## 6️⃣ OUTPUT NEL MATCHBUNDLE

### 6.1 Esportare Canonical IDs

```typescript
interface MatchBundleHeader {
  match_id: string;
  home_player: {
    player_id: string;        // ✅ canonical ID
    name: string;             // display name
    country?: string;
  };
  away_player: {
    player_id: string;
    name: string;
    country?: string;
  };
  tournament: {
    tournament_id: string;    // ✅ canonical ID
    name: string;             // display name
    category: string;
    surface: SurfaceEnum;
  };
  // ...
}
```

---

### 6.2 Identity Warnings (opzionale)

Se mapping incerto:
```typescript
interface MatchBundleMeta {
  // ... altri campi
  identity_warnings?: {
    home_player?: {
      confidence: number;  // 0.0 - 1.0
      reason: string;      // "fuzzy match: Levenshtein = 2"
    };
    tournament?: {
      confidence: number;
      reason: string;
    };
  };
}
```

**Uso**:
- `confidence >= 0.95` → OK
- `0.8 <= confidence < 0.95` → warning giallo in UI
- `confidence < 0.8` → errore, non usare

---

## 7️⃣ CONCEPT CHECKS

### 7.1 CANONICAL_IDS_REQUIRED

**Regola**:
```text
Nessun bundle senza player_id e tournament_id canonici.
```

**Test**:
```javascript
function checkCanonicalIds(bundle) {
  const { header } = bundle;
  
  assert(header.home_player.player_id, 'missing home_player_id');
  assert(header.away_player.player_id, 'missing away_player_id');
  assert(header.tournament.tournament_id, 'missing tournament_id');
  
  // Verifica formato
  assert(header.home_player.player_id.match(/^(sof_|uuid_)/), 'invalid player_id format');
}
```

---

### 7.2 NO_DUPLICATE_PLAYERS

**Regola**:
```text
Non devono esistere player duplicati nel registry.
```

**Test** (batch):
```javascript
async function detectDuplicatePlayers() {
  const players = await db.query('SELECT * FROM players');
  
  const normalized = players.map(p => ({
    ...p,
    norm_name: normalizeName(p.name)
  }));
  
  const groups = groupBy(normalized, 'norm_name');
  const duplicates = groups.filter(g => g.length > 1);
  
  if (duplicates.length > 0) {
    console.error('Duplicate players detected:', duplicates);
    return { error: 'duplicates found', count: duplicates.length };
  }
  
  return { ok: true };
}
```

**Azione**: review manuale + merge.

---

## 8️⃣ ESEMPI PRATICI

### Esempio 1: Import XLSX con Resolution

```javascript
async function importXlsxMatch(row) {
  // 1. Resolve players
  const winnerId = await resolvePlayerName(row.winner_name);
  const loserId = await resolvePlayerName(row.loser_name);
  
  if (!winnerId || !loserId) {
    throw new Error(`Cannot resolve players: ${row.winner_name}, ${row.loser_name}`);
  }
  
  // 2. Resolve tournament
  const tournamentId = await resolveTournamentName(row.tourney_name);
  
  // 3. Normalize surface
  const surface = normalizeSurface(row.surface);
  
  // 4. Create canonical match
  const match = {
    match_id: generateUUID(),
    home_player_id: winnerId,   // NOTA: winner = home in legacy
    away_player_id: loserId,
    tournament_id: tournamentId,
    surface,
    best_of: parseInt(row.best_of),
    event_time: parseDate(row.tourney_date),
    status: 'finished',
    score: row.score
  };
  
  // 5. Validate
  const valid = await validateMatch(match);
  if (!valid) return;
  
  // 6. Save
  await matchRepository.saveMatch(match);
}
```

---

### Esempio 2: Merge SofaScore ↔ Legacy

```javascript
async function linkSofascoreToLegacy(sofascoreMatch) {
  // 1. Cerca match legacy simile
  const candidates = await db.query(`
    SELECT * FROM matches
    WHERE ABS(EXTRACT(EPOCH FROM (event_time - $1))) < 86400
    AND (winner_name ILIKE $2 OR loser_name ILIKE $2)
  `, [sofascoreMatch.event_time, sofascoreMatch.home_player.name]);
  
  // 2. Fuzzy match per conferma
  for (const candidate of candidates) {
    const scoreHome = fuzzyMatch(sofascoreMatch.home_player.name, candidate.winner_name);
    const scoreAway = fuzzyMatch(sofascoreMatch.away_player.name, candidate.loser_name);
    
    if (scoreHome > 0.9 && scoreAway > 0.9) {
      // 3. Link
      await db.query(`
        UPDATE matches
        SET 
          sofascore_id = $1,
          home_player_id = $2,
          away_player_id = $3
        WHERE match_id = $4
      `, [
        sofascoreMatch.id,
        sofascoreMatch.home_player_id,
        sofascoreMatch.away_player_id,
        candidate.match_id
      ]);
      
      return { linked: true, legacy_id: candidate.match_id };
    }
  }
  
  return { linked: false };
}
```

---

### Esempio 3: MatchBundle con Canonical

```javascript
async function buildMatchBundle(match_id) {
  // 1. Fetch match con canonical IDs
  const match = await matchRepository.getMatchById(match_id);
  
  // 2. Fetch player details
  const homePlayer = await playerService.getPlayerById(match.home_player_id);
  const awayPlayer = await playerService.getPlayerById(match.away_player_id);
  const tournament = await tournamentService.getTournamentById(match.tournament_id);
  
  // 3. Build header
  const header = {
    match_id: match.match_id,
    home_player: {
      player_id: homePlayer.player_id,  // canonical
      name: homePlayer.name,            // display
      country: homePlayer.country
    },
    away_player: {
      player_id: awayPlayer.player_id,
      name: awayPlayer.name,
      country: awayPlayer.country
    },
    tournament: {
      tournament_id: tournament.tournament_id,
      name: tournament.name,
      category: tournament.category,
      surface: tournament.surface
    },
    event_time: match.event_time,
    status: match.status
  };
  
  // 4. Build bundle
  return {
    header,
    tabs: { /* ... */ },
    meta: { /* ... */ }
  };
}
```

---

## 9️⃣ MIGRATION CHECKLIST

Per passare da legacy a canonical:

- [ ] Crea `players` table con `player_id` + `name_variants`
- [ ] Populate da SofaScore scraping
- [ ] Crea mapping XLSX names → `player_id`
- [ ] Script di migration: `UPDATE matches SET home_player_id = ...`
- [ ] Valida: `SELECT * FROM matches WHERE home_player_id IS NULL`
- [ ] Depreca campi `winner_name`, `loser_name`
- [ ] Update tutti i consumer (featureEngine, strategyEngine, bundle)
- [ ] Test: nessun bundle con player_id mancanti

---

## 🔟 REGOLA FINALE

> **Un player è un player.  
> Un tournament è un tournament.  
> Stringhe != Identità.**

Se usi stringhe per identificare:
- Non puoi fare stats affidabili
- Non puoi linkare dati cross-source
- Non puoi dedupare

**Canonical IDs = fondamenta del sistema.**

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [TEMPORAL](../temporal/FILOSOFIA_TEMPORAL.md) | [📚 INDEX](../../INDEX_FILOSOFIE.md) | [LINEAGE](../lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) |

---

**Fine documento – FILOSOFIA_REGISTRY_CANON**
