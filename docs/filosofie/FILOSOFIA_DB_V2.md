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
| [FILOSOFIA_MADRE](FILOSOFIA_MADRE_TENNIS_ROLE_DRIVEN.md) | Fonti Esterne (SofaScore, XLSX) | [STATS_V3](FILOSOFIA_STATS_V3.md) |

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
│   ┌─────────┐                                                   │
│   │  XLSX   │──┐                                                │
│   └─────────┘  │                                                │
│                │     ┌──────────┐     ┌──────────────┐          │
│   ┌─────────┐  ├────▶│    DB    │────▶│ 1 QUERY      │          │
│   │SofaScore│──┤     │ Supabase │     │ /bundle      │          │
│   └─────────┘  │     └──────────┘     └──────────────┘          │
│                │           │                  │                 │
│   ┌─────────┐  │           │                  ▼                 │
│   │ SVG API │──┘           │          ┌──────────────┐          │
│   └─────────┘              │          │  FRONTEND    │          │
│                            │          │  (render)    │          │
│   ┌─────────┐              │          └──────────────┘          │
│   │ Future  │──────────────┘                                    │
│   │ Sources │                                                   │
│   └─────────┘                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**IMPORTANTE**: Le fonti dati (XLSX, SofaScore, SVG) popolano il database.  
Il frontend fa **UNA SOLA QUERY** al bundle e riceve tutto.

---

## 1️⃣ DISTINZIONE FONDAMENTALE: FONTI vs CONSUMO

### ⚠️ LEZIONE APPRESA (24 Dic 2025)

Un errore comune è confondere:
- **FONTI DATI** = come i dati entrano nel DB
- **CONSUMO DATI** = come il frontend li riceve

```
❌ SBAGLIATO: Frontend chiama XLSX API, SofaScore API, SVG API separatamente
✅ CORRETTO: Tutte le fonti → DB → 1 endpoint bundle → Frontend
```

### Responsabilità

| Componente | Responsabilità |
|------------|----------------|
| **XLSX Import** | Popolare tabella `matches` con dati storici |
| **SofaScore Scraper** | Popolare `matches_new` + `match_card_snapshot` con dati live/dettagliati |
| **SVG Momentum** | Arricchire match con `svg_momentum_json` |
| **Bundle Endpoint** | Unificare TUTTE le fonti in 1 risposta |

---

## 2️⃣ SCHEMA DATABASE: DUE TABELLE MATCH

### Situazione Attuale

Esistono **due tabelle match** per ragioni storiche:

| Tabella | Schema | Fonte | Dati |
|---------|--------|-------|------|
| `matches` | Legacy (winner_name, loser_name) | XLSX Import | ~2600 match storici |
| `matches_new` | Nuovo (home_player_id, away_player_id) | SofaScore Scraper | Match con dati dettagliati |

### Riferimenti Codice

```
backend/db/matchRepository.js     → Gestisce matches_new + view v_matches_with_players
backend/importXlsx.js             → Popola tabella matches (legacy)
backend/merge-xlsx-sofascore.js   → Merge tra le due fonti
```

### Fallback Implementato

L'endpoint `/api/match/:id/bundle` cerca in ordine:
1. `match_card_snapshot` (cache)
2. `v_matches_with_players` (matches_new)
3. `matches` (legacy XLSX) ← **FALLBACK**

```javascript
// backend/server.js L3243-3257
if (!matchData && supabaseClient?.supabase) {
  const { data: legacyMatch } = await supabaseClient.supabase
    .from('matches')
    .select('*')
    .eq('id', parseInt(eventId))
    .single();
  
  if (legacyMatch) {
    finalMatchData = transformLegacyMatchToBundle(legacyMatch);
  }
}
```

---

## 3️⃣ FONTI DATI (POPOLAMENTO DB)

### 3.1 XLSX Import
**File**: `backend/importXlsx.js`

Importa dati storici da file Excel:
- Nomi giocatori (winner_name, loser_name)
- Punteggi (w1, l1, w2, l2, ...)
- Ranking, superficie, torneo

**Qualità dati**: 30% (no SVG, no point-by-point, no statistiche dettagliate)

### 3.2 SofaScore Scraper
**File**: `backend/scraper/sofascoreScraper.js`

Scrape dati completi da SofaScore:
- Dati evento (`/api/v1/event/:id`)
- Statistiche (`/api/v1/event/:id/statistics`)
- Point-by-point (`/api/v1/event/:id/incidents`)
- Odds (`/api/v1/event/:id/odds`)
- Momentum SVG (`/api/v1/event/:id/graph`)

**Qualità dati**: 80-100% (dipende da disponibilità dati SofaScore)

### 3.3 SVG Momentum
**File**: `backend/services/svgMomentumService.js`

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
- chiama XLSX API
- chiama SofaScore API
- chiama SVG API
- combina fonti diverse

### Endpoint Principale

```http
GET /api/match/:matchId/bundle
```

**File**: `backend/server.js` L3219-3423

Restituisce:
```json
{
  "matchId": 14896634,
  "header": { "match": {...}, "players": {...}, "score": {...} },
  "features": { "volatility": 50, "pressure": 50, ... },
  "tabs": {
    "overview": {...},
    "strategies": {...},
    "stats": {...},
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

**File**: `backend/server.js` L1131-1230

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
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │
│  │    XLSX     │   │  SofaScore  │   │   SVG API   │               │
│  │   Import    │   │   Scraper   │   │  Momentum   │               │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘               │
│         │                 │                 │                       │
│         ▼                 ▼                 ▼                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      SUPABASE DB                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │   │
│  │  │   matches   │  │ matches_new │  │ match_card_snapshot │ │   │
│  │  │  (legacy)   │  │   (nuovo)   │  │     (cache)         │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    BUNDLE ENDPOINT                          │   │
│  │              GET /api/match/:id/bundle                      │   │
│  │                                                             │   │
│  │  1. Cerca in match_card_snapshot (cache)                   │   │
│  │  2. Se non trovato → v_matches_with_players (nuovo)        │   │
│  │  3. Se non trovato → matches (legacy) + transform          │   │
│  │  4. Applica Feature Engine                                  │   │
│  │  5. Applica Strategy Engine                                 │   │
│  │  6. Restituisce MatchBundle                                 │   │
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
| `backend/server.js` | L3431-3505 | `transformLegacyMatchToBundle()` |
| `backend/server.js` | L3591-3620 | `extractScore()` con fallback legacy |
| `backend/db/matchRepository.js` | L617-720 | `getMatches()` con filtri |
| `backend/services/matchCardService.js` | L26-65 | `getMatchCardFromSnapshot()` |
| `backend/importXlsx.js` | * | Import XLSX → tabella matches |
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
| XLSX Import | 30% | Solo punteggio e nomi |
| SofaScore (parziale) | 60-70% | Manca SVG o PBP |
| SofaScore (completo) | 90-100% | Tutti i dati disponibili |

```json
// Esempio bundle da fonte legacy
{
  "dataQuality": 30,
  "meta": { "source": "legacy" }
}

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
3. **Fallback legacy** gestito dal backend, trasparente al frontend
4. **DataQuality** calcolata solo backend
5. **Nessuna logica di dominio** nel frontend

---

## 9️⃣ MIGRAZIONE FUTURA

### Obiettivo
Unificare le due tabelle `matches` e `matches_new` in un'unica struttura.

### Steps
1. Creare script migrazione `matches` → `matches_new`
2. Arricchire match legacy con scraping SofaScore
3. Deprecare fallback legacy
4. Rimuovere tabella `matches`

### Priorità
MEDIA - Il fallback funziona, ma mantiene complessità

---

**Fine documento – FILOSOFIA_DB_V2.1**
