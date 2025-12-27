# 🎾 FILOSOFIA DATABASE & BACKEND  
## Versione V2.1 – MatchBundle Driven Architecture

> **Dominio**: Backend · Database · Data Pipeline  
> **Stato**: ATTIVA  
> **Sostituisce**: `FILOSOFIA_DB.md` (V1 – DEPRECATA)  
> **Ultimo aggiornamento**: 24 Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|----------------|
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | Fonti Esterne (SofaScore API, SVG Momentum) | [STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md), [LIVE](../../20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md) |

### 📚 Documenti Correlati (stesso layer)
| Documento | Relazione |
|-----------|-----------|
| [TEMPORAL](../temporal/FILOSOFIA_TEMPORAL.md) | Regole timestamps per insert/query |
| [REGISTRY_CANON](../registry_canon/FILOSOFIA_REGISTRY_CANON.md) | Normalizzazione player/match IDs |
| [LINEAGE_VERSIONING](../lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) | Versioning schema e snapshot |
| [OBSERVABILITY](../quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Data quality checks su DB |

### 📁 File Codice Principali
| File | Descrizione | Linee chiave |
|------|-------------|---------------|
| [`backend/db/matchRepository.js`](../../backend/db/matchRepository.js) | CRUD matches_new | L617-720 `getMatches()` |
| [`backend/db/supabase.js`](../../backend/db/supabase.js) | Client Supabase | - |
| [`backend/scraper/sofascoreScraper.js`](../../backend/scraper/sofascoreScraper.js) | Scraper SofaScore | - |
| [`backend/server.js`](../../backend/server.js) | Bundle endpoint | L3219-3423 |

---

## 0️⃣ PRINCIPIO FONDANTE

> **Il frontend non chiede dati.  
> Chiede uno stato del match.**

Questo stato:
- è **completo**
- è **pre-calcolato**
- è **consistente**
- è **versionato**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARCHITETTURA DATI                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   FONTI DATI (Popolamento DB)         CONSUMO DATI (Frontend)  │
│   ═══════════════════════════         ════════════════════════  │
│                                                                 │
│   ┌─────────┐      ┌──────────┐     ┌──────────────┐            │
│   │SofaScore│─────▶│    DB    │────▶│ 1 QUERY      │            │
│   └─────────┘      │ Supabase │     │ /bundle      │            │
│                    └──────────┘     └──────────────┘            │
│   ┌─────────┐            │                  │                   │
│   │ SVG API │────────────┤                  ▼                   │
│   └─────────┘            │          ┌──────────────┐            │
│                          │          │  FRONTEND    │            │
│   ┌─────────┐            │          │  (render)    │            │
│   │ Future  │────────────┘          └──────────────┘            │
│   │ Sources │                                                   │
│   └─────────┘                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**IMPORTANTE**: Le fonti dati (SofaScore API, SVG Momentum) popolano il database.  
Il frontend fa **UNA SOLA QUERY** al bundle e riceve tutto.

---

## 1️⃣ DISTINZIONE FONDAMENTALE: FONTI vs CONSUMO

### ⚠️ LEZIONE APPRESA (24 Dic 2025)

Un errore comune è confondere:
- **FONTI DATI** = come i dati entrano nel DB
- **CONSUMO DATI** = come il frontend li riceve

```
❌ SBAGLIATO: Frontend chiama SofaScore API, SVG API separatamente
✅ CORRETTO: Tutte le fonti → DB → 1 endpoint bundle → Frontend
```

### Responsabilità

| Componente | Responsabilità |
|------------|----------------|
| **SofaScore Scraper** | Popolare `matches_new` + `match_card_snapshot` con dati live/dettagliati |
| **SVG Momentum** | Arricchire match con `svg_momentum_json` |
| **Bundle Endpoint** | Unificare TUTTE le fonti in 1 risposta |

---

## 2️⃣ SCHEMA DATABASE: TABELLA MATCH UNIFICATA

### Situazione Attuale

Utilizziamo **una singola tabella match** con dati da SofaScore:

| Tabella | Schema | Fonte | Dati |
|---------|--------|-------|------|
| `matches_new` | Normalizzato (home_player_id, away_player_id) | SofaScore API | Match con dati completi |

### Riferimenti Codice

| File | Descrizione |
|------|-------------|
| [`backend/db/matchRepository.js`](../../backend/db/matchRepository.js) | Gestisce matches_new + view v_matches_with_players |
| [`backend/scraper/sofascoreScraper.js`](../../backend/scraper/sofascoreScraper.js) | Scraper dati SofaScore |

### Flusso Recupero Dati

L'endpoint `/api/match/:id/bundle` cerca in ordine:
1. `match_card_snapshot` (cache)
2. `v_matches_with_players` (matches_new)

---

## 3️⃣ FONTI DATI (POPOLAMENTO DB)

### 3.1 SofaScore Scraper
**File**: [`backend/scraper/sofascoreScraper.js`](../../backend/scraper/sofascoreScraper.js)

Scrape dati completi da SofaScore:
- Dati evento (`/api/v1/event/:id`)
- **Statistiche per periodo** (`/api/v1/event/:id/statistics`) → ALL, SET1, SET2, SET3...
- Point-by-point (`/api/v1/event/:id/incidents`)
- Odds (`/api/v1/event/:id/odds`)
- Momentum SVG (`/api/v1/event/:id/graph`)

**Qualità dati**: 80-100% (dipende da disponibilità dati SofaScore)

#### 📊 Statistiche per Periodo (V2.6)

Le statistiche vengono salvate **per ogni periodo** della partita:

| Periodo | Descrizione |
|---------|-------------|
| `ALL` | Totale partita (Match) |
| `SET1` | Primo set |
| `SET2` | Secondo set |
| `SET3` | Terzo set (se presente) |
| `SET4` | Quarto set (se presente) |
| `SET5` | Quinto set (se presente) |

**Normalizzazione**: SofaScore ritorna "1ST", "2ND"... → convertiti in "SET1", "SET2"...

**Tabella**: `match_statistics_new` con colonna `period`

**Frontend**: `StatsTab.jsx` mostra tabs selezionabili (Match | Set 1 | Set 2 | ...)

### 3.3 SVG Momentum
**File**: [`backend/services/svgMomentumService.js`](../../backend/services/svgMomentumService.js)

Parsing del grafico SVG momentum:
- Estrae punti dal path SVG
- Calcola powerRankings per game
- Salva in `svg_momentum_json`

### 3.4 Future Sources
Possibili integrazioni future:
- Betfair API (odds live)
- ATP/WTA API (ranking ufficiali)
- Weather API (condizioni meteo)

---

## 4️⃣ CONSUMO DATI (FRONTEND)

### Principio Unico

```
Frontend → GET /api/match/:id/bundle → Tutto il necessario
```

Il frontend **NON**:
- chiama SofaScore API direttamente
- chiama SVG API direttamente
- combina fonti diverse

### Endpoint Principale

```http
GET /api/match/:matchId/bundle
```

**File**: [`backend/server.js`](../../backend/server.js) L3219-3423

Restituisce:
```json
{
  "matchId": 14896634,
  "header": { "match": {...}, "players": {...}, "score": {...} },
  "features": { "volatility": 50, "pressure": 50, ... },
  "tabs": {
    "overview": {...},
    "strategies": {...},
    "stats": {
      "periods": ["ALL", "SET1", "SET2"],
      "byPeriod": {
        "ALL": { "aces": [4, 5], "doubleFaults": [0, 0], ... },
        "SET1": { "aces": [2, 4], "doubleFaults": [0, 0], ... },
        "SET2": { "aces": [2, 1], "doubleFaults": [0, 0], ... }
      },
      "dataSource": "database"
    },
    "momentum": {...},
    "odds": {...},
    "pointByPoint": {...},
    "predictor": {...},
    "journal": {...}
  },
  "dataQuality": 30,
  "meta": { "source": "legacy" | "snapshot" | "live" }
}
```

### Endpoint Lista Match

```http
GET /api/matches/db?limit=20&search=musetti
```

**File**: [`backend/server.js`](../../backend/server.js) L1131-1230

Parametri:
- `limit` - numero max risultati (default 20)
- `search` - cerca per nome giocatore
- `surface` - filtra per superficie
- `series` - filtra per tipo torneo

---

## 5️⃣ PIPELINE DATI COMPLETA

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PIPELINE DATI                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐   ┌─────────────┐                                 │
│  │  SofaScore  │   │   SVG API   │                                 │
│  │   Scraper   │   │  Momentum   │                                 │
│  └──────┬──────┘   └──────┬──────┘                                 │
│         │                 │                                         │
│         ▼                 ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      SUPABASE DB                            │   │
│  │  ┌─────────────┐  ┌─────────────────────┐                  │   │
│  │  │ matches_new │  │ match_card_snapshot │                  │   │
│  │  │  (primary)  │  │     (cache)         │                  │   │
│  │  └─────────────┘  └─────────────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    BUNDLE ENDPOINT                          │   │
│  │              GET /api/match/:id/bundle                      │   │
│  │                                                             │   │
│  │  1. Cerca in match_card_snapshot (cache)                   │   │
│  │  2. Se non trovato → v_matches_with_players (matches_new)  │   │
│  │  3. Applica Feature Engine                                  │   │
│  │  4. Applica Strategy Engine                                 │   │
│  │  5. Restituisce MatchBundle                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                       FRONTEND                              │   │
│  │                                                             │   │
│  │  useMatchBundle(matchId) → render tabs                     │   │
│  │                                                             │   │
│  │  ❌ NON chiama altre API                                    │   │
│  │  ❌ NON ricalcola metriche                                  │   │
│  │  ❌ NON combina fonti                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6️⃣ RIFERIMENTI CODICE

### Backend

| File | Linee | Descrizione |
|------|-------|-------------|
| `backend/server.js` | L1131-1230 | Endpoint `/api/matches/db` |
| `backend/server.js` | L3219-3423 | Endpoint `/api/match/:id/bundle` |
| `backend/db/matchRepository.js` | L617-720 | `getMatches()` con filtri |
| `backend/services/matchCardService.js` | L26-65 | `getMatchCardFromSnapshot()` |
| `backend/scraper/sofascoreScraper.js` | * | Scraper SofaScore |

### Frontend

| File | Descrizione |
|------|-------------|
| `src/hooks/useMatchBundle.jsx` | Hook consumo bundle |
| `src/components/home/HomePage.jsx` | Lista match + ricerca |
| `src/components/match/MatchPage.jsx` | Container tabs |
| `src/components/match/tabs/*.jsx` | Tab che consumano bundle |

---

## 7️⃣ DATA QUALITY

La qualità dipende dalla **fonte**:

| Fonte | Quality | Motivo |
|-------|---------|--------|
| SofaScore (parziale) | 60-70% | Manca SVG o PBP |
| SofaScore (completo) | 90-100% | Tutti i dati disponibili |

```json
// Esempio bundle da fonte completa
{
  "dataQuality": 95,
  "meta": { "source": "snapshot" }
}
```

---

## 8️⃣ INVARIANTI

1. **Frontend = 1 chiamata bundle** per match
2. **Fonti dati → DB**, mai direttamente al frontend
3. **DataQuality** calcolata solo backend
4. **Nessuna logica di dominio** nel frontend

---

**Fine documento – FILOSOFIA_DB**
