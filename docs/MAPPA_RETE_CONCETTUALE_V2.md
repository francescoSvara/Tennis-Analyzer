# 🗺️ MAPPA RETE CONCETTUALE  
## Versione V2.1 – MatchBundle-Centric Architecture

> **Scopo**: fornire una visione unificata e navigabile dell'architettura concettuale del progetto.  
> **Stato**: ATTIVA  
> **Sostituisce**: `MAPPA_RETE_CONCETTUALE.md` (V1 – DEPRECATA)  
> **Ultimo aggiornamento**: 24 Dicembre 2025  

---

## 🧭 NAVIGAZIONE RAPIDA

| 📚 Index | 🏛️ Costituzione |
|----------|-----------------|
| [INDEX_FILOSOFIE](filosofie/INDEX_FILOSOFIE.md) | [FILOSOFIA_MADRE](filosofie/FILOSOFIA_MADRE_TENNIS_ROLE_DRIVEN.md) |

---

## 0️⃣ PRINCIPIO GUIDA

> **Tutto converge sul MatchBundle.**

Il MatchBundle è:
- l'unica interfaccia frontend ↔ backend
- l'unico snapshot persistito
- il punto di integrazione di dati, feature, strategie e segnali

Ogni dominio del progetto **contribuisce** al MatchBundle  
Nessun dominio **bypassa** il MatchBundle

---

## ⚠️ LEZIONE APPRESA (24 Dic 2025)

### Problema 1: Match Legacy Non Visualizzabili
Match dalla tabella legacy (`matches` - import XLSX) non erano visualizzabili perché l'endpoint bundle cercava solo in `matches_new`.

**Soluzione**: Fallback a cascata nell'endpoint `/api/match/:id/bundle`:
1. `match_card_snapshot` (cache)
2. `v_matches_with_players` (matches_new)
3. `matches` (legacy) + `transformLegacyMatchToBundle()`

---

### Problema 2: Feature Con Valori Fake/Uguali ⚡ IMPORTANTE

**Sintomo**: Tutti i match mostravano gli stessi numeri (50%, 25%, 36%, 30%)

**Causa**: Il frontend mostrava fallback statici quando mancavano dati.

**Lezione Fondamentale**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ⚠️ "MOSTRARE DATI" = "CALCOLARE DATI"                                  │
│                                                                         │
│  Quando crei una dashboard con metriche (volatility, pressure, etc):   │
│                                                                         │
│  ❌ SBAGLIATO:                                                          │
│     features.volatility || 50      // Fallback fisso                   │
│     features.pressure ?? 'N/A'     // Placeholder                      │
│                                                                         │
│  ✅ CORRETTO:                                                           │
│     Il BACKEND calcola SEMPRE un valore usando dati disponibili:       │
│     - powerRankings → calcola volatility                               │
│     - score → calcola volatilityFromScore (fallback)                   │
│     - odds → calcola dominanceFromOdds (fallback)                      │
│     - rankings → calcola serveDominanceFromRankings (fallback)         │
│                                                                         │
│  Un match ha SEMPRE: score, odds, rankings.                            │
│  Quindi ogni feature ha SEMPRE un valore calcolato.                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Implementazione**: [`backend/utils/featureEngine.js`](../backend/utils/featureEngine.js)
- Funzioni primarie (dati completi)
- Funzioni fallback (dati parziali)
- Gerarchia: powerRankings → statistics → score → odds → rankings

---

### Concetto Chiave: Separazione Fonti/Consumo

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   FONTI DATI (popolano DB)        CONSUMO DATI (frontend)      │
│   ════════════════════════        ═══════════════════════       │
│                                                                 │
│   • XLSX Import                   Frontend fa UNA SOLA         │
│   • SofaScore Scraper      →      chiamata a /bundle           │
│   • SVG Momentum API              e riceve TUTTO               │
│   • Future sources                                              │
│                                                                 │
│   ❌ Frontend NON chiama queste fonti direttamente              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ DOCUMENTI DI RIFERIMENTO (ATTIVI)

### Core Architecture (docs/filosofie/)

| Documento | Link | Ruolo |
|-----------|------|-------|
| FILOSOFIA_MADRE | [📄](filosofie/FILOSOFIA_MADRE_TENNIS_ROLE_DRIVEN.md) | Costituzione tecnica |
| FILOSOFIA_DB_V2 | [📄](filosofie/FILOSOFIA_DB_V2.md) | DBA / Data Engineer - **FONTI + PIPELINE** |
| FILOSOFIA_STATS_V3 | [📄](filosofie/FILOSOFIA_STATS_V3.md) | Feature & Strategy Engine |
| FILOSOFIA_LIVE_TRACKING_V2 | [📄](filosofie/FILOSOFIA_LIVE_TRACKING_V2.md) | Real-time Engineer |
| FILOSOFIA_ODDS_V2 | [📄](filosofie/FILOSOFIA_ODDS_V2.md) | Quant / Market Data |
| FILOSOFIA_FRONTEND | [📄](filosofie/FILOSOFIA_FRONTEND.md) | Frontend UI/UX |
| FILOSOFIA_FRONTEND_DATA_V2 | [📄](filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md) | FE Data Consumer |
| FILOSOFIA_CONCEPT_CHECKS_V2 | [📄](filosofie/FILOSOFIA_CONCEPT_CHECKS_V2.md) | Architecture Guardrail |
| INDEX_FILOSOFIE | [📄](filosofie/INDEX_FILOSOFIE.md) | Mappa navigazione |

### Specifications (docs/specs/)

| Documento | Link | Scopo |
|-----------|------|-------|
| HPI_RESILIENCE | [📄](specs/HPI_RESILIENCE.md) | Feature pressione/resilienza |
| SPEC_FRONTEND_MOTION_UI | [📄](specs/SPEC_FRONTEND_MOTION_UI.md) | Animazioni e motion |
| SPEC_VALUE_SVG | [📄](specs/SPEC_VALUE_SVG.md) | Visualizzazioni SVG |

### Documenti DEPRECATED
- tutte le versioni V1 precedenti non elencate sopra

---

## 2️⃣ ARCHITETTURA DATI END-TO-END

### Diagramma Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FONTI DATI (Popolamento)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ XLSX Import  │  │  SofaScore   │  │ SVG Momentum │  │   Future    │ │
│  │ (storici)    │  │  Scraper     │  │    API       │  │   Sources   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                 │                  │        │
│         │ importXlsx.js   │ sofascoreScraper│ svgMomentum     │        │
│         │                 │ .js             │ Service.js       │        │
│         ▼                 ▼                 ▼                  ▼        │
├─────────────────────────────────────────────────────────────────────────┤
│                         SUPABASE DATABASE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────┐│
│  │     matches      │  │   matches_new    │  │  match_card_snapshot   ││
│  │    (legacy)      │  │    (nuovo)       │  │       (cache)          ││
│  │                  │  │                  │  │                        ││
│  │ • winner_name    │  │ • home_player_id │  │ • bundle_json          ││
│  │ • loser_name     │  │ • away_player_id │  │ • data_quality_int     ││
│  │ • w1, l1, w2...  │  │ • statistics     │  │ • last_updated_at      ││
│  │                  │  │ • pbp, odds      │  │                        ││
│  └──────────────────┘  └──────────────────┘  └────────────────────────┘│
│           │                    │                       │               │
│           └────────────────────┼───────────────────────┘               │
│                                │                                        │
│                                ▼                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                    BUNDLE ENDPOINT (server.js L3219)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  GET /api/match/:id/bundle                                              │
│                                                                         │
│  Logica:                                                                │
│  1. matchCardService.getMatchCardFromSnapshot() → se trovato, return   │
│  2. Se null → cerca in matches (legacy) via transformLegacyMatch...    │
│  3. Applica featureEngine.computeFeatures()                            │
│  4. Applica strategyEngine.evaluateAll()                               │
│  5. Return MatchBundle completo                                         │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                              OUTPUT                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  {                                                                      │
│    matchId, timestamp, header, features, tabs, dataQuality, meta       │
│  }                                                                      │
│                                                                         │
│  meta.source = "snapshot" | "legacy" | "live"                          │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                            FRONTEND                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  useMatchBundle(matchId)  ─────────────────────────────────────────►   │
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ OverviewTab │ │ StatsTab    │ │ MomentumTab │ │ StrategiesTab│      │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  ❌ NON chiama API SofaScore                                            │
│  ❌ NON chiama API XLSX                                                 │
│  ❌ NON chiama API SVG                                                  │
│  ❌ NON ricalcola metriche                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ RIFERIMENTI CODICE

### Backend - Server

| File | Linee | Funzione |
|------|-------|----------|
| `backend/server.js` | L1131-1230 | `/api/matches/db` - Lista match con ricerca |
| `backend/server.js` | L3219-3430 | `/api/match/:id/bundle` - Bundle completo |
| `backend/server.js` | L3431-3505 | `transformLegacyMatchToBundle()` - Trasforma legacy |
| `backend/server.js` | L3591-3620 | `extractScore()` - Estrae score (nuovo + legacy) |

### Backend - Feature Engine ⚡ NUOVO

| File | Funzione | Descrizione |
|------|----------|-------------|
| [`backend/utils/featureEngine.js`](../backend/utils/featureEngine.js) | `computeFeatures()` | Calcola TUTTE le features |
| | `calculateVolatility()` | Da powerRankings |
| | `calculateVolatilityFromScore()` | Fallback da score |
| | `calculateDominance()` | Da powerRankings |
| | `calculateDominanceFromScore()` | Fallback da score |
| | `calculateDominanceFromOdds()` | Fallback da odds |
| | `calculateServeDominance()` | Da statistics |
| | `calculateServeDominanceFromRankings()` | Fallback da rankings |
| | `calculateBreakProbability()` | Da statistics |
| | `calculateBreakProbabilityFromOddsRankings()` | Fallback |
| | `calculatePressureFromScore()` | Fallback da score |
| | `calculateMomentumFromScore()` | Fallback da score |

> **PRINCIPIO**: Ogni feature ha SEMPRE un valore.  
> Se non ci sono powerRankings, usa score. Se non c'è score, usa odds. Etc.

### Backend - Repository & Services

| File | Funzione |
|------|----------|
| `backend/db/matchRepository.js` | CRUD matches_new, statistics, pbp |
| `backend/services/matchCardService.js` | Snapshot cache + build card |
| `backend/scraper/sofascoreScraper.js` | Scraper SofaScore |
| `backend/importXlsx.js` | Import XLSX → matches (legacy) |

### Frontend

| File | Funzione |
|------|----------|
| `src/hooks/useMatchBundle.jsx` | Hook fetch + WS + polling |
| `src/components/home/HomePage.jsx` | Lista match, ricerca |
| `src/components/match/MatchPage.jsx` | Container tabs |
| `src/components/match/tabs/*.jsx` | Singole tab (consumano bundle.tabs.*) |
| [`src/components/match/tabs/OverviewTab.jsx`](../src/components/match/tabs/OverviewTab.jsx) | QuickSignals, MiniMomentum |

---

## 4️⃣ DOMINI CONCETTUALI E RESPONSABILITÀ

### 🗄️ Database & Data Sources
**Documento**: [FILOSOFIA_DB_V2.md](filosofie/FILOSOFIA_DB_V2.md)

Responsabilità:
- **Acquisizione dati** da fonti esterne (XLSX, SofaScore, SVG)
- Persistenza raw e canonical
- Generazione `match_card_snapshot`
- Fallback tra tabelle (`matches_new` → `matches`)
- Versionamento schema

Output:
- Dati pronti per Bundle Endpoint

---

### ⚡ Live Tracking
**Documento**: [FILOSOFIA_LIVE_TRACKING_V2.md](filosofie/FILOSOFIA_LIVE_TRACKING_V2.md)

Responsabilità:
- Aggiornare stato live
- Calcolare feature runtime
- Rigenerare segnali
- Inviare patch al MatchBundle

Output:
- MatchBundle Patch (WS / refresh cache)

---

### 📊 Feature & Strategy Engine
**Documento**: [FILOSOFIA_STATS_V3.md](filosofie/FILOSOFIA_STATS_V3.md)  
**Spec**: [HPI_RESILIENCE.md](specs/HPI_RESILIENCE.md)

Responsabilità:
- Feature Engine (volatility, pressure, dominance, ecc.)
- Strategy Engine (READY / WATCH / OFF)
- Confidence, entry/exit rules

Codice:
- `backend/utils/featureEngine.js`
- `backend/strategies/strategyEngine.js`

Output:
- Segnali strategia
- Feature pronte per UI / predictor

---

### 💹 Odds & Market Data
**Documento**: [FILOSOFIA_ODDS_V2.md](filosofie/FILOSOFIA_ODDS_V2.md)

Responsabilità:
- Normalizzazione odds
- Implied probability
- Trend / liquidità / spread
- Feature di mercato

Output:
- Market features per Predictor e Strategie

---

### 🖥️ Frontend Data Consumption
**Documento**: [FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md](filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md)  
**UI/UX**: [FILOSOFIA_FRONTEND.md](filosofie/FILOSOFIA_FRONTEND.md)

Responsabilità:
- Consumo del MatchBundle
- Rendering UI
- Gestione stati visivi
- Ricezione patch live

Vincoli:
- Nessun calcolo dominio
- Nessuna composizione dati
- 1 chiamata = tutto il necessario

---

### 🧪 Concept Checks
**Documento**: [FILOSOFIA_CONCEPT_CHECKS_V2.md](filosofie/FILOSOFIA_CONCEPT_CHECKS_V2.md)

Responsabilità:
- Enforce invarianti architetturali
- Prevenire regressioni concettuali
- Validare ruoli e output

Output:
- Report CI (ERROR / WARN / INFO)

---

## 5️⃣ FLUSSO COMPLETO (END-TO-END)

```
FONTI ESTERNE
 ┌─────────────────────────────┐
 │ • XLSX (storici)            │
 │ • SofaScore API (live/det.) │
 │ • SVG Momentum              │
 │ • Future...                 │
 └─────────────┬───────────────┘
               │
               ▼
        ┌──────────────┐
        │   SUPABASE   │
        │      DB      │
        └──────┬───────┘
               │
               ▼
      ┌────────────────┐
      │ FEATURE ENGINE │
      └────────┬───────┘
               │
               ▼
      ┌────────────────┐
      │STRATEGY ENGINE │
      └────────┬───────┘
               │
               ▼
      ┌────────────────┐
      │  MATCH BUNDLE  │
      │   SNAPSHOT     │
      └────────┬───────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
   REST API        WS PATCH
  (load init)       (live)
       │               │
       └───────┬───────┘
               │
               ▼
        ┌──────────────┐
        │   FRONTEND   │
        │      UI      │
        └──────────────┘
```

---

## 6️⃣ INVARIANTI GLOBALI (RIASSUNTO)

- ❗ Frontend consuma **solo MatchBundle** (1 chiamata)
- ❗ Fonti dati (XLSX, SofaScore, SVG) → popolano DB, mai chiamate da FE
- ❗ Le strategie vivono **solo nel backend**
- ❗ Le feature non decidono
- ❗ I segnali non sono metriche
- ❗ Odds ≠ Predictor
- ❗ Live aggiorna lo stato, non lo interpreta
- ❗ DataQuality è backend-only
- ❗ Fallback legacy trasparente al frontend

Questi invarianti sono **verificati automaticamente** dai Concept Checks.

---

## 7️⃣ TABELLE DATABASE

### Schema Corrente

| Tabella | Tipo | Fonte | Note |
|---------|------|-------|------|
| `matches` | Legacy | XLSX Import | ~2600 match, schema (winner_name, loser_name) |
| `matches_new` | Nuovo | SofaScore | Schema normalizzato (home_player_id, away_player_id) |
| `match_card_snapshot` | Cache | Bundle Engine | Cache pre-calcolata del bundle |
| `players` | Lookup | SofaScore | Dati giocatori |
| `tournaments` | Lookup | SofaScore | Dati tornei |
| `match_statistics_new` | Detail | SofaScore | Statistiche match |
| `match_power_rankings_new` | Detail | SofaScore/SVG | Momentum per game |
| `match_odds_new` | Detail | SofaScore | Odds storiche |

### Fallback Order (Bundle Endpoint)

1. `match_card_snapshot` (più veloce, cache)
2. `v_matches_with_players` (matches_new + join)
3. `matches` (legacy) + transform

---

## 8️⃣ GUIDA ALL'ESTENSIONE DEL SISTEMA

### Aggiungere una nuova fonte dati
1. Creare script/service di import
2. Popolare tabelle DB appropriate
3. **NON** creare endpoint frontend separato
4. Integrare nel flow del bundle

### Aggiungere una nuova feature
1. Dichiararla in Feature Engine
2. Classificarla (Player / Match / Combined)
3. Documentarla in `FILOSOFIA_STATS_V3.md`
4. Usarla in Predictor o Strategy

### Aggiungere una nuova strategia
1. Usare solo feature esistenti
2. Implementarla nello Strategy Engine
3. Produrre `StrategySignal`
4. Verificare Concept Checks

### Aggiungere una nuova tab frontend
1. Leggere solo `MatchBundle.tabs.*`
2. Non introdurre nuovi fetch
3. Rispettare dataQuality

---

## 9️⃣ STATO DEL DOCUMENTO

Questa mappa è:
- il punto di ingresso architetturale
- il riferimento per onboarding
- la guida per AI e nuovi dev

Se un cambiamento **non è riflesso qui**,  
è da considerarsi **architetturalmente incompleto**.

---

**Fine documento – MAPPA_RETE_CONCETTUALE_V2.1**
