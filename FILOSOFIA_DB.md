# 🎾 Filosofia Database e Architettura

> Documento di riferimento per capire l'architettura del sistema di acquisizione e consumo dati tennis.

---

## 📋 Indice

1. [Architettura Generale](#architettura-generale)
2. [Fonti Dati](#fonti-dati)
3. [Schema Database](#schema-database)
4. [Architettura Avanzata](#architettura-avanzata)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Architettura Generale

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              FLUSSO DATI COMPLETO                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  INPUT                      PROCESSING                      OUTPUT            │
│  ┌──────────┐              ┌──────────────┐              ┌───────────────┐   │
│  │ SofaScore│──────────────▶│  raw_events  │──────────────▶│ TABELLE       │   │
│  │   API    │              │  (PENDING)   │              │ CANONICHE     │   │
│  └──────────┘              └──────────────┘              └───────┬───────┘   │
│  ┌──────────┐                     │                             │           │
│  │   XLSX   │──────────────▶      │                             ▼           │
│  │  Import  │                     │                      ┌─────────────┐    │
│  └──────────┘                     ▼                      │ calculation │    │
│                            ┌──────────────┐              │   _queue    │    │
│                            │ RAW EVENTS   │              └──────┬──────┘    │
│                            │   WORKER     │                     │           │
│                            │ (canonicalize│                     ▼           │
│                            └──────────────┘              ┌─────────────┐    │
│                                                          │ CALCULATION │    │
│                                                          │   WORKER    │    │
│                                                          │ (H2H, stats,│    │
│                                                          │  snapshots) │    │
│                                                          └──────┬──────┘    │
│                                                                 │           │
│                                                                 ▼           │
│  CONSUMO                                               ┌───────────────────┐│
│  ┌──────────┐     GET /api/match/:id/card              │ match_card_snapshot││
│  │ Frontend │◀─────────────────────────────────────────│  (1 query only)   ││
│  │  React   │                                          └───────────────────┘│
│  └──────────┘                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Fonti Dati

### Matrice Disponibilità

| Dato | SofaScore | XLSX | Soluzione se Manca |
|------|:---------:|:----:|-------------------|
| Nome giocatore | ✅ | ✅ | - |
| Punteggio | ✅ | ✅ | - |
| Ranking match | ⚠️ | ✅ | Usa XLSX |
| Quote betting | ❌ | ✅ | Solo da XLSX |
| Statistiche | ✅ | ❌ | Solo da SofaScore |
| Momentum | ⚠️ | ❌ | Cerca su SofaScore |
| Point-by-point | ⚠️ | ❌ | Cerca su SofaScore |
| H2H | ❌ | ❌ | **Calcolato** (calculation_queue) |
| Stats carriera | ❌ | ❌ | **Calcolato** (calculation_queue) |

### SofaScore Scraper

**File**: `backend/scraper/sofascoreScraper.js`

| Categoria | Endpoint API | Tabella |
|-----------|--------------|---------|
| Match Base | `/api/v1/event/{id}` | `matches_new` |
| Statistiche | `/api/v1/event/{id}/statistics` | `match_statistics_new` |
| Momentum | `/api/v1/event/{id}/tennis-power-rankings` | `match_power_rankings_new` |
| Point-by-Point | `/api/v1/event/{id}/point-by-point` | `match_point_by_point_new` |

### Import XLSX

**File**: `backend/importXlsx.js`

| Campo XLSX | Dove Salvato |
|------------|--------------|
| `Winner/Loser` | `players_new`, `matches_new` |
| `WRank/LRank` | `matches_new.player1_rank/player2_rank` |
| `B365W/PSW/MaxW/AvgW` | `match_odds` |
| `Surface/Tournament/Round` | `matches_new`, `tournaments_new` |

---

## � Re-Scraping Match SofaScore (Aggiornamento Dati)

### Filosofia "Acquisizione Ossessiva"

I match ATP su SofaScore hanno **alta disponibilità di dati** (80%+). È SEMPRE possibile ri-scrapare un match per:
- Aggiornare statistiche mancanti
- Ottenere point-by-point se non era disponibile prima
- Arricchire dati dopo che il match è terminato

### Quando Ri-Scrapare

| Scenario | Azione | Priorità |
|----------|--------|----------|
| Match incompleto (<100% data quality) | Re-scrape sempre utile | 🔴 Alta |
| Match terminato di recente | Re-scrape per stats finali | 🟡 Media |
| Match ATP con sofascore_id | Re-scrape possibile | 🟢 Bassa |
| Match solo XLSX senza sofascore_id | Cerca prima con `/find-sofascore` | 🔴 Alta |

### Endpoint per Re-Scraping

**Da Tennis-Scraper-Local** (localhost:3002):
```
POST /api/scrape
Body: { "url": "https://www.sofascore.com/event/12345" }

- SEMPRE esegue scrape completo
- SEMPRE aggiorna dati esistenti (upsert)
- MAI blocca per "duplicato"
- Dopo ogni scrape → cascade scan torneo
```

**Da Backend principale** (produzione):
```
POST /api/match/:id/find-sofascore
- Cerca match per nome giocatori + data
- Se trova → recupera statistiche
- Aggiorna match_data_sources

POST /api/match/:id/rebuild-snapshot  
- Ricostruisce card con dati aggiornati
```

### Flusso Re-Scraping

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUSSO RE-SCRAPING                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. IDENTIFICA match da aggiornare                                  │
│     └── data_quality < 100% OR has_statistics = false               │
│                                                                      │
│  2. VERIFICA sofascore_id                                           │
│     ├── Se esiste → costruisci URL: sofascore.com/event/{id}       │
│     └── Se non esiste → POST /find-sofascore (cerca per nome+data) │
│                                                                      │
│  3. ESEGUI re-scrape (da Tennis-Scraper-Local)                      │
│     └── POST localhost:3002/api/scrape { url }                      │
│                                                                      │
│  4. SISTEMA aggiorna automaticamente:                               │
│     ├── raw_events (nuovo payload)                                  │
│     ├── matches_new (dati aggiornati)                               │
│     ├── match_statistics_new                                        │
│     ├── match_power_rankings_new                                    │
│     ├── match_point_by_point_new                                    │
│     └── calculation_queue (enqueue rebuild snapshot)                │
│                                                                      │
│  5. RISULTATO                                                        │
│     └── data_quality aumenta, match_card_snapshot aggiornato        │
└─────────────────────────────────────────────────────────────────────┘
```

### Note Importanti

⚠️ **Scraping solo da localhost**: SofaScore blocca richieste da server cloud (Railway, Heroku, etc.). Usa SEMPRE `Tennis-Scraper-Local` per acquisire/aggiornare match.

✅ **Match ATP**: Probabilità alta (80%+) di trovare tutti i dati su SofaScore
⚠️ **Match Challenger/ITF**: Dati parziali, spesso manca momentum e point-by-point
❌ **Match molto vecchi**: SofaScore potrebbe non avere dati dettagliati

---

## �🗄️ Schema Database

### Tabelle Principali

| Tabella | Scopo |
|---------|-------|
| `players_new` | Anagrafica tennista |
| `player_aliases` | Mapping varianti nomi (per matching) |
| `player_rankings` | Storico ranking settimanale |
| `player_career_stats` | Stats carriera per superficie (calcolato) |
| `tournaments_new` | Info tornei |
| `matches_new` | Dati base partita |
| `match_data_sources` | Traccia quali fonti hanno dati |
| `match_statistics_new` | Stats dettagliate (SofaScore) |
| `match_power_rankings_new` | Momentum game-by-game (SofaScore) |
| `match_point_by_point_new` | Ogni punto (SofaScore) |
| `match_odds` | Quote betting (XLSX) |
| `head_to_head` | H2H giocatori (calcolato) |

### Nuove Tabelle Architettura (Dicembre 2025)

| Tabella | Scopo |
|---------|-------|
| `raw_events` | Payload originali fonti (per reprocessing) |
| `calculation_queue` | Coda task asincroni (H2H, career stats, snapshots) |
| `match_card_snapshot` | Card pre-calcolate per API veloce |

### Relazioni

```
players_new ◀───── matches_new ─────▶ tournaments_new
     │                  │
     │                  │
     ▼                  ▼
player_aliases      match_data_sources
player_rankings     match_statistics_new
player_career_stats match_power_rankings_new
                    match_point_by_point_new
                    match_odds
                    match_card_snapshot ◀── (aggregato)
```

> 📄 Schema SQL completo: **[migrations/create-new-schema.sql](backend/migrations/create-new-schema.sql)**
> 📄 Nuove tabelle: **[migrations/add-snapshot-queue-tables.sql](backend/migrations/add-snapshot-queue-tables.sql)**

---

## 🏗️ Architettura Avanzata

### 1. Match Card Snapshot (1 Query invece di N)

**Problema**: `getMatchCard()` eseguiva 10+ query parallele per assemblare una card.

**Soluzione**: Tabella `match_card_snapshot` con dati pre-aggregati.

```sql
TABLE match_card_snapshot (
  match_id BIGINT PRIMARY KEY,
  core_json JSONB,           -- match base data
  players_json JSONB,        -- player1, player2 info
  h2h_json JSONB,            -- head to head
  stats_json JSONB,          -- match statistics
  momentum_json JSONB,       -- power rankings
  odds_json JSONB,           -- betting odds
  data_sources_json JSONB,   -- source tracking
  data_quality_int INTEGER,  -- 0-100 quality score
  last_updated_at TIMESTAMPTZ
)
```

**API**: `GET /api/match/:id/card` → Single SELECT, ~5ms response.

### 2. Raw Events Pipeline (Reprocessable)

**Problema**: Se cambia logica di normalizzazione, bisogna re-importare tutto.

**Soluzione**: Tabella `raw_events` conserva payload originali + worker di canonicalizzazione.

```sql
TABLE raw_events (
  source_type VARCHAR(20),      -- 'sofascore', 'xlsx'
  source_entity VARCHAR(30),    -- 'match', 'stats', 'odds'
  source_key TEXT,              -- eventId o chiave xlsx
  payload_json JSONB,           -- dati originali
  processing_status VARCHAR(20) -- 'PENDING', 'DONE', 'ERROR'
)
```

**Worker**: `rawEventsProcessor.js` legge PENDING, canonicalizza, upsert in tabelle finali.

### 3. Calculation Queue (Task Asincroni)

**Problema**: Trigger H2H su ogni INSERT rallenta le write.

**Soluzione**: Coda di task con worker dedicato.

```sql
TABLE calculation_queue (
  task_type VARCHAR(50),    -- 'RECALC_H2H', 'RECALC_CAREER_STATS', 'REBUILD_MATCH_SNAPSHOT'
  payload_json JSONB,
  status VARCHAR(20),       -- 'PENDING', 'RUNNING', 'DONE', 'ERROR'
  priority INTEGER
)
```

**Trigger leggero su INSERT match**:
```sql
-- Invece di calcolare H2H inline, enqueue task
INSERT INTO calculation_queue(task_type, payload_json)
VALUES ('RECALC_H2H', jsonb_build_object('p1', player1_id, 'p2', player2_id));
```

**Worker**: `calculationQueueWorker.js` processa task in background.

### 4. Ranking Temporale

**Problema**: Devo sapere il ranking al momento del match.

**Soluzione**: Query con lookup temporale + caching su match.

```sql
-- Lookup temporale
SELECT rank_int FROM player_rankings
WHERE player_id = :id AND ranking_date <= :match_date
ORDER BY ranking_date DESC LIMIT 1;

-- matches_new.player1_rank già memorizza il ranking al momento
-- Calcolato una volta sola durante import
```

### 5. API Lazy Loading

| Endpoint | Contenuto | Velocità | Quando Usare |
|----------|-----------|----------|--------------|
| `/api/match/:id/card` | Snapshot completo | ⚡ Fast | Default |
| `/api/match/:id/momentum` | Solo power rankings | Medium | Grafico |
| `/api/match/:id/statistics` | Solo stats | Medium | Approfondimento |
| `/api/match/:id/odds` | Solo quote | Medium | Analisi betting |
| `/api/match/:id/points` | Point-by-point | 🐢 Slow | On-demand |

---

## 📡 API Reference

### Endpoint Principali

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/match/:id/card` | GET | Card completa (da snapshot) ⚡ |
| `/api/match/:id/momentum` | GET | Solo power rankings |
| `/api/match/:id/statistics` | GET | Solo statistiche |
| `/api/match/:id/odds` | GET | Solo quote |
| `/api/match/:id/points` | GET | Point-by-point (paginato) |
| `/api/match/:id/refresh` | GET | ⚠️ Sync da SofaScore (solo localhost) |
| `/api/match/:id/rebuild-snapshot` | POST | Ricostruisce snapshot |
| `/api/match/:id/find-sofascore` | POST | Cerca match per nome+data |
| `/api/matches/cards` | GET | Lista match recenti |
| `/api/player/:id` | GET | Profilo giocatore |
| `/api/search/players?q=` | GET | Cerca giocatori |
| `/api/admin/queue/stats` | GET | Statistiche coda calcoli |

### Endpoint Re-Scraping (Tennis-Scraper-Local)

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `POST localhost:3002/api/scrape` | POST | Scrape/refresh match (upsert) |
| `GET localhost:3002/api/matches` | GET | Lista match acquisiti |
| `GET localhost:3002/api/match/:id/completeness` | GET | Data quality match |

### Esempio Response `/api/match/:id/card`

```json
{
  "match": {
    "id": 12345,
    "date": "2025-04-12",
    "round": "Final",
    "surface": "clay",
    "score": "6-4 7-5"
  },
  "player1": {
    "id": 100,
    "name": "Lorenzo Musetti",
    "ranking": 15
  },
  "player2": { ... },
  "h2h": { "total": "5-3", "onClay": "2-1" },
  "statistics": { ... },
  "momentum": [ ... ],
  "odds": { "opening": {...}, "closing": {...} },
  "dataQuality": 85,
  "dataSources": ["xlsx_2025", "sofascore"]
}
```

---

## 🆘 Troubleshooting

### "Player non trovato"
```sql
-- Verifica alias esistenti
SELECT * FROM player_aliases WHERE alias_normalized LIKE '%nome%';

-- Aggiungi alias manualmente
INSERT INTO player_aliases (player_id, alias_name, alias_normalized, source)
VALUES (123, 'Nome Variante', 'nome variante', 'manual');
```

### "Match senza statistiche"
```sql
-- Verifica fonti dati
SELECT * FROM match_data_sources WHERE match_id = 123;
```
Poi chiama `POST /api/match/123/find-sofascore` per arricchire.

### "H2H non aggiornato"
```sql
-- Forza ricalcolo enqueuing task
INSERT INTO calculation_queue (task_type, payload_json)
VALUES ('RECALC_H2H', '{"p1": 123, "p2": 456}');
```

### "Snapshot obsoleto"
```bash
# Ricostruisci via API
curl -X POST http://localhost:3001/api/match/123/rebuild-snapshot
```

---

## 📁 File di Riferimento

| File | Scopo |
|------|-------|
| `backend/services/matchCardService.js` | Assembla card (usa snapshot) |
| `backend/services/playerService.js` | Gestione giocatori + alias |
| `backend/services/rawEventsProcessor.js` | Pipeline raw→canonical |
| `backend/services/calculationQueueWorker.js` | Worker task asincroni |
| `backend/scraper/sofascoreScraper.js` | Scraping SofaScore |
| `backend/importXlsx.js` | Import file Excel |
| `backend/db/matchRepository.js` | Query database |
| `backend/migrations/create-new-schema.sql` | Schema DB base |
| `backend/migrations/add-snapshot-queue-tables.sql` | Nuove tabelle architettura |

---

## 🚀 Sviluppi Futuri

### Priorità Alta
- [x] Match Card Snapshot (single query)
- [x] Raw Events Pipeline (reprocessable)
- [x] Calculation Queue (async H2H/stats)
- [ ] Calcolo ELO per superficie
- [ ] Cache Redis per dati live

### Priorità Media
- [ ] Previsioni ML vincitore
- [ ] Alerts match interessanti
- [ ] Import automatico XLSX (watcher)

---

*Ultimo aggiornamento: Dicembre 2025*
