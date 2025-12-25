# 🗺️ MAPPA RETE CONCETTUALE  
## Versione V2.3 – MatchBundle-Centric Architecture + Full Code References

> **Scopo**: fornire una visione unificata e navigabile dell'architettura concettuale del progetto.  
> **Stato**: ATTIVA  
> **Sostituisce**: `MAPPA_RETE_CONCETTUALE.md` (V1 – DEPRECATA)  
> **Ultimo aggiornamento**: 25 Dicembre 2025  

---

## 🧭 NAVIGAZIONE RAPIDA

| 📚 Index | 🏛️ Costituzione |
|----------|-----------------|
| [INDEX_FILOSOFIE](../filosofie/INDEX_FILOSOFIE.md) | [FILOSOFIA_MADRE](../filosofie/00_foundation/FILOSOFIA_MADRE_TENNIS.md) |

### 🎯 Quick Access - File Codice Chiave
| Area | File | Entry Point |
|------|------|-------------|
| **Feature Engine** | [`backend/utils/featureEngine.js`](../backend/utils/featureEngine.js) | `computeFeatures()` L44 |
| **Strategy Engine** | [`backend/strategies/strategyEngine.js`](../backend/strategies/strategyEngine.js) | `evaluateAll()` L39 |
| **Bundle Endpoint** | [`backend/server.js`](../backend/server.js) | L3219-3430 `/api/match/:id/bundle` |
| **Frontend Hook** | [`src/hooks/useMatchBundle.jsx`](../src/hooks/useMatchBundle.jsx) | `useMatchBundle()` L44 |
| **Concept Checks** | [`scripts/runConceptChecks.js`](../scripts/runConceptChecks.js) | Validazione architettura |

---

## 📁 STRUTTURA CODICE COMPLETA

```
React-Betfair/
├── backend/
│   ├── server.js                      # 🌐 Express API principale (~5400 righe)
│   ├── liveManager.js                 # ⚡ Gestione match live
│   ├── importXlsx.js                  # 📥 Import dati XLSX
│   ├── db/
│   │   ├── supabase.js                # 🔌 Client Supabase
│   │   ├── matchRepository.js         # 📦 CRUD matches_new
│   │   └── liveTrackingRepository.js  # 📦 CRUD live tracking
│   ├── services/
│   │   ├── matchCardService.js        # 🎴 MatchBundle snapshot
│   │   ├── playerStatsService.js      # 👤 Stats giocatori
│   │   ├── playerProfileService.js    # 👤 Profili giocatori
│   │   ├── dataNormalizer.js          # 🔄 Normalizzazione dati
│   │   └── unifiedImporter.js         # 📥 Import unificato
│   ├── strategies/
│   │   └── strategyEngine.js          # 🎯 Strategy Engine
│   ├── utils/
│   │   ├── featureEngine.js           # 🧮 Feature Engine
│   │   ├── pressureCalculator.js      # 📊 Calcolo pressure
│   │   ├── breakDetector.js           # 🔍 Rilevamento break
│   │   ├── matchSegmenter.js          # 📐 Segmentazione match
│   │   ├── svgMomentumExtractor.js    # 📈 Estrazione SVG momentum
│   │   ├── valueInterpreter.js        # 🔢 Interpretazione valori
│   │   └── logger.js                  # 📝 Logger strutturato
│   └── scraper/
│       └── sofascoreScraper.js        # 🕷️ Scraper SofaScore
├── src/
│   ├── hooks/
│   │   ├── useMatchBundle.jsx         # 🎣 Hook principale bundle
│   │   ├── useLiveMatch.jsx           # ⚡ Hook match live
│   │   └── useMatchCard.jsx           # 🎴 Hook card match
│   └── components/
│       ├── home/
│       │   └── HomePage.jsx           # 🏠 Lista match
│       ├── match/
│       │   ├── MatchPage.jsx          # 📄 Container match
│       │   └── tabs/
│       │       ├── OverviewTab.jsx    # 📊 Tab overview
│       │       ├── StatsTab.jsx       # 📈 Tab statistiche
│       │       ├── MomentumTab.jsx    # 📉 Tab momentum
│       │       ├── StrategiesTab.jsx  # 🎯 Tab strategie
│       │       ├── OddsTab.jsx        # 💹 Tab odds
│       │       ├── PredictorTab.jsx   # 🔮 Tab predictor
│       │       ├── PointByPointTab.jsx# 🎾 Tab punto per punto
│       │       └── JournalTab.jsx     # 📝 Tab journal
│       └── StrategiesPanel.jsx        # 🎯 Panel strategie
├── scripts/
│   ├── checkConceptualMap.js          # 🔍 Check mappa concettuale
│   ├── runConceptChecks.js            # 🧪 Concept checks architetturali
│   ├── cleanDuplicates.js             # 🗑️ Pulizia duplicati scrapes
│   └── generateTodoReport.js          # 🔄 Genera report unificato TODO_LIST
└── docs/
    ├── filosofie/                     # 📚 Documenti architetturali
    ├── specs/                         # 📋 Specifiche tecniche
    └── checks/
        └── MAPPA_RETE_CONCETTUALE_V2.md  # 🗺️ SEI QUI
```

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

| Documento | Link | Ruolo | 📁 File Codice Correlati |
|-----------|------|-------|--------------------------|
| FILOSOFIA_MADRE | [📄](../filosofie/00_foundation/FILOSOFIA_MADRE_TENNIS.md) | Costituzione tecnica | - |
| FILOSOFIA_DB | [📄](../filosofie/10_data_platform/storage/FILOSOFIA_DB.md) | DBA / Data Engineer | [`backend/db/`](../backend/db/), [`backend/importXlsx.js`](../backend/importXlsx.js) |
| FILOSOFIA_TEMPORAL | [📄](../filosofie/10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) | Time Architect | [`backend/liveManager.js`](../backend/liveManager.js) |
| FILOSOFIA_REGISTRY_CANON | [📄](../filosofie/10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md) | Data Architect | [`backend/services/dataNormalizer.js`](../backend/services/dataNormalizer.js) |
| FILOSOFIA_LINEAGE_VERSIONING | [📄](../filosofie/10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) | Audit Architect | [`backend/services/matchCardService.js`](../backend/services/matchCardService.js) |
| FILOSOFIA_OBSERVABILITY | [📄](../filosofie/10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Data Quality Engineer | [`backend/utils/logger.js`](../../backend/utils/logger.js) |
| FILOSOFIA_STATS | [📄](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md) | Feature & Strategy Engine | [`backend/utils/featureEngine.js`](../backend/utils/featureEngine.js), [`backend/strategies/`](../backend/strategies/) |
| FILOSOFIA_CALCOLI | [📄](../filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md) | Feature Library | [`backend/utils/featureEngine.js`](../backend/utils/featureEngine.js), [`backend/utils/pressureCalculator.js`](../backend/utils/pressureCalculator.js) |
| FILOSOFIA_LIVE_TRACKING | [📄](../filosofie/20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md) | Real-time Engineer | [`backend/liveManager.js`](../backend/liveManager.js), [`backend/db/liveTrackingRepository.js`](../backend/db/liveTrackingRepository.js) |
| FILOSOFIA_ODDS | [📄](../filosofie/30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md) | Quant / Market Data | [`backend/server.js`](../backend/server.js) (endpoints odds) |
| FILOSOFIA_RISK_BANKROLL | [📄](../filosofie/50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) | Risk Manager / Quant | [`backend/strategies/strategyEngine.js`](../backend/strategies/strategyEngine.js) |
| FILOSOFIA_FRONTEND | [📄](../filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md) | Frontend UI/UX | [`src/components/`](../src/components/) |
| FILOSOFIA_FRONTEND_DATA | [📄](../filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) | FE Data Consumer | [`src/hooks/useMatchBundle.jsx`](../src/hooks/useMatchBundle.jsx) |
| FILOSOFIA_CONCEPT_CHECKS | [📄](../filosofie/00_foundation/FILOSOFIA_CONCEPT_CHECKS.md) | Architecture Guardrail | [`scripts/runConceptChecks.js`](../scripts/runConceptChecks.js) |
| INDEX_FILOSOFIE | [📄](../filosofie/INDEX_FILOSOFIE.md) | Mappa navigazione | - |

### Specifications (docs/specs/)

| Documento | Link | Scopo | 📁 File Codice Correlati |
|-----------|------|-------|--------------------------|
| HPI_RESILIENCE | [📄](../specs/HPI_RESILIENCE.md) | Feature pressione/resilienza | [`backend/utils/pressureCalculator.js`](../backend/utils/pressureCalculator.js), [`backend/utils/featureEngine.js`](../backend/utils/featureEngine.js) |
| SPEC_FRONTEND_MOTION_UI | [📄](../specs/SPEC_FRONTEND_MOTION_UI.md) | Animazioni e motion | [`src/motion/`](../src/motion/) |
| SPEC_VALUE_SVG | [📄](../specs/SPEC_VALUE_SVG.md) | Visualizzazioni SVG | [`backend/utils/svgMomentumExtractor.js`](../backend/utils/svgMomentumExtractor.js) |
| FRONTEND_MIGRATION | [📄](../specs/FRONTEND_MIGRATION.md) | Guida migrazione frontend | [`src/components/`](../src/components/) |
| DEPRECATION_FRONTEND_UTILS | [📄](../specs/DEPRECATION_FRONTEND_UTILS.md) | Deprecazioni frontend | [`src/utils.js`](../src/utils.js) |

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

## 3️⃣ RIFERIMENTI CODICE DETTAGLIATI

### 🔌 Backend - Server Principale

| File | Righe | Funzione | Endpoint |
|------|-------|----------|----------|
| [`backend/server.js`](../backend/server.js) | ~5400 | Server Express principale | - |
| [`backend/server.js`](../backend/server.js) | L1131-1230 | Lista match con ricerca | `GET /api/matches/db` |
| [`backend/server.js`](../backend/server.js) | L3219-3430 | Bundle completo | `GET /api/match/:id/bundle` |
| [`backend/server.js`](../backend/server.js) | L3431-3505 | Trasforma legacy | `transformLegacyMatchToBundle()` |
| [`backend/server.js`](../backend/server.js) | L3591-3620 | Estrae score | `extractScore()` |

### 🧮 Backend - Feature Engine

| File | Funzione | Linea | Descrizione |
|------|----------|-------|-------------|
| [`backend/utils/featureEngine.js`](../backend/utils/featureEngine.js) | `calculateVolatility()` | L44 | Da powerRankings |
| | `calculateDominance()` | L92 | Da powerRankings |
| | `calculateServeDominance()` | L126 | Da statistics |
| | `calculateBreakProbability()` | L191 | Da statistics |
| | `calculateRecentMomentum()` | L277 | Da powerRankings |
| | `computeFeatures()` | L331 | Entry point - Calcola TUTTE le features |
| | `calculateVolatilityFromScore()` | L476 | Fallback da score |
| | `calculateDominanceFromScore()` | L507 | Fallback da score |
| | `calculateDominanceFromOdds()` | L540 | Fallback da odds |
| | `calculateServeDominanceFromRankings()` | L573 | Fallback da rankings |
| | `calculateBreakProbabilityFromOddsRankings()` | L598 | Fallback |

### 🎯 Backend - Strategy Engine

| File | Funzione | Linea | Descrizione |
|------|----------|-------|-------------|
| [`backend/strategies/strategyEngine.js`](../backend/strategies/strategyEngine.js) | `evaluateAll()` | L39 | Entry point - Valuta tutte le strategie |
| | `evaluateLayWinner()` | L63 | Strategia Lay the Winner |
| | `evaluateBancaServizio()` | L148 | Strategia Banca Servizio |
| | `evaluateSuperBreak()` | L222 | Strategia Super Break |
| | `evaluateTiebreakSpecialist()` | L307 | Strategia Tiebreak Specialist |
| | `evaluateMomentumSwing()` | L378 | Strategia Momentum Swing |
| | `getSummary()` | L443 | Riassunto segnali |

### 📦 Backend - Repository & Services

| File | Descrizione |
|------|-------------|
| [`backend/db/matchRepository.js`](../backend/db/matchRepository.js) | CRUD matches_new, statistics, pbp |
| [`backend/db/liveTrackingRepository.js`](../backend/db/liveTrackingRepository.js) | CRUD live tracking |
| [`backend/db/supabase.js`](../backend/db/supabase.js) | Client Supabase |
| [`backend/services/matchCardService.js`](../backend/services/matchCardService.js) | Snapshot cache + build card |
| [`backend/services/playerStatsService.js`](../backend/services/playerStatsService.js) | Statistiche giocatori |
| [`backend/services/playerProfileService.js`](../backend/services/playerProfileService.js) | Profili giocatori |
| [`backend/services/dataNormalizer.js`](../backend/services/dataNormalizer.js) | Normalizzazione dati |
| [`backend/scraper/sofascoreScraper.js`](../backend/scraper/sofascoreScraper.js) | Scraper SofaScore |
| [`backend/importXlsx.js`](../backend/importXlsx.js) | Import XLSX → matches (legacy) |

### 🧮 Backend - Utils Aggiuntive

| File | Descrizione |
|------|-------------|
| [`backend/utils/pressureCalculator.js`](../backend/utils/pressureCalculator.js) | Calcoli HPI e pressure |
| [`backend/utils/breakDetector.js`](../backend/utils/breakDetector.js) | Rilevamento break/hold |
| [`backend/utils/matchSegmenter.js`](../backend/utils/matchSegmenter.js) | Segmentazione temporale match |
| [`backend/utils/svgMomentumExtractor.js`](../backend/utils/svgMomentumExtractor.js) | Estrazione dati da SVG momentum |
| [`backend/utils/valueInterpreter.js`](../backend/utils/valueInterpreter.js) | Interpretazione valori |

### 🎣 Frontend - Hooks

| File | Export | Linea | Descrizione |
|------|--------|-------|-------------|
| [`src/hooks/useMatchBundle.jsx`](../src/hooks/useMatchBundle.jsx) | `useMatchBundle()` | L44 | Hook principale fetch + WS + polling |
| | `useTabData()` | L354 | Estrae dati tab specifico |
| | `useHeaderData()` | L364 | Estrae header dal bundle |
| | `useDataQuality()` | L371 | Estrae dataQuality |
| | `BundleState` | L19 | Enum stati bundle |
| [`src/hooks/useLiveMatch.jsx`](../src/hooks/useLiveMatch.jsx) | `useLiveMatch()` | - | Hook match live |
| [`src/hooks/useMatchCard.jsx`](../src/hooks/useMatchCard.jsx) | `useMatchCard()` | - | Hook card match |

### 🖥️ Frontend - Componenti

| File | Descrizione | Bundle Data Consumati |
|------|-------------|----------------------|
| [`src/components/HomePage.jsx`](../src/components/HomePage.jsx) | Lista match, ricerca | Lista matches |
| [`src/components/match/MatchPage.jsx`](../src/components/match/MatchPage.jsx) | Container tabs | bundle (intero) |
| [`src/components/match/tabs/OverviewTab.jsx`](../src/components/match/tabs/OverviewTab.jsx) | QuickSignals, MiniMomentum | header, tabs.overview, tabs.strategies |
| [`src/components/match/tabs/StatsTab.jsx`](../src/components/match/tabs/StatsTab.jsx) | Statistiche partita | tabs.stats |
| [`src/components/match/tabs/MomentumTab.jsx`](../src/components/match/tabs/MomentumTab.jsx) | Grafico momentum | tabs.momentum |
| [`src/components/match/tabs/StrategiesTab.jsx`](../src/components/match/tabs/StrategiesTab.jsx) | Panel strategie | tabs.strategies |
| [`src/components/match/tabs/OddsTab.jsx`](../src/components/match/tabs/OddsTab.jsx) | Quote mercato | tabs.odds |
| [`src/components/match/tabs/PredictorTab.jsx`](../src/components/match/tabs/PredictorTab.jsx) | Predizioni | tabs.predictor |
| [`src/components/match/tabs/PointByPointTab.jsx`](../src/components/match/tabs/PointByPointTab.jsx) | Punto per punto | tabs.pointByPoint |
| [`src/components/match/tabs/JournalTab.jsx`](../src/components/match/tabs/JournalTab.jsx) | Journal trading | tabs.journal |

---

## 4️⃣ DOMINI CONCETTUALI E RESPONSABILITÀ

### 🗄️ Database & Data Sources
**Documento**: [FILOSOFIA_DB](../filosofie/10_data_platform/db/FILOSOFIA_DB.md)  
**📁 Codice**: [`backend/db/`](../backend/db/), [`backend/importXlsx.js`](../backend/importXlsx.js), [`backend/services/matchCardService.js`](../backend/services/matchCardService.js)

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
**Documento**: [FILOSOFIA_LIVE_TRACKING](../filosofie/20_domain_tennis/live_tracking/FILOSOFIA_LIVE_TRACKING.md)  
**📁 Codice**: [`backend/liveManager.js`](../backend/liveManager.js), [`backend/db/liveTrackingRepository.js`](../backend/db/liveTrackingRepository.js)

Responsabilità:
- Aggiornare stato live
- Calcolare feature runtime
- Rigenerare segnali
- Inviare patch al MatchBundle

Output:
- MatchBundle Patch (WS / refresh cache)

---

### 📊 Feature & Strategy Engine
**Documento**: [FILOSOFIA_STATS](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md)  
**Feature Library**: [FILOSOFIA_CALCOLI](../filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md)  
**Spec**: [HPI_RESILIENCE.md](../specs/HPI_RESILIENCE.md)  
**📁 Codice**: [`backend/utils/featureEngine.js`](../backend/utils/featureEngine.js), [`backend/strategies/strategyEngine.js`](../backend/strategies/strategyEngine.js), [`backend/utils/pressureCalculator.js`](../backend/utils/pressureCalculator.js)

Responsabilità:
- Feature Engine (volatility, pressure, dominance, ecc.)
- Feature Library (tassonomia, standard, fallback, schede operative)
- Strategy Engine (READY / WATCH / OFF)
- Confidence, entry/exit rules

Output:
- Segnali strategia
- Feature pronte per UI / predictor

---

### 💹 Odds & Market Data
**Documento**: [FILOSOFIA_ODDS](../filosofie/30_domain_odds_markets/odds/FILOSOFIA_ODDS.md)  
**📁 Codice**: [`backend/server.js`](../backend/server.js) (endpoints odds)

Responsabilità:
- Normalizzazione odds
- Implied probability
- Trend / liquidità / spread
- Feature di mercato

Output:
- Market features per Predictor e Strategie

---

### 🖥️ Frontend Data Consumption
**Documento**: [FILOSOFIA_FRONTEND_DATA_CONSUMPTION](../filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md)  
**UI/UX**: [FILOSOFIA_FRONTEND](../filosofie/70_frontend/ui_ux/FILOSOFIA_FRONTEND.md)  
**📁 Codice**: [`src/hooks/useMatchBundle.jsx`](../src/hooks/useMatchBundle.jsx), [`src/components/match/`](../src/components/match/)

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
**Documento**: [FILOSOFIA_CONCEPT_CHECKS](../filosofie/00_foundation/concept_checks/FILOSOFIA_CONCEPT_CHECKS.md)  
**📁 Codice**: [`scripts/runConceptChecks.js`](../scripts/runConceptChecks.js), [`scripts/checkConceptualMap.js`](../scripts/checkConceptualMap.js)

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
 │ • XLSX (storici)            │  📁 backend/importXlsx.js
 │ • SofaScore API (live/det.) │  📁 backend/scraper/sofascoreScraper.js
 │ • SVG Momentum              │  📁 backend/utils/svgMomentumExtractor.js
 │ • Future...                 │
 └─────────────┬───────────────┘
               │
               ▼
        ┌──────────────┐
        │   SUPABASE   │          📁 backend/db/supabase.js
        │      DB      │          📁 backend/db/matchRepository.js
        └──────┬───────┘
               │
               ▼
      ┌────────────────┐
      │ FEATURE ENGINE │          📁 backend/utils/featureEngine.js
      └────────┬───────┘
               │
               ▼
      ┌────────────────┐
      │STRATEGY ENGINE │          📁 backend/strategies/strategyEngine.js
      └────────┬───────┘
               │
               ▼
      ┌────────────────┐
      │  MATCH BUNDLE  │          📁 backend/services/matchCardService.js
      │   SNAPSHOT     │
      └────────┬───────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
   REST API        WS PATCH
  (load init)       (live)      📁 backend/server.js (L3219 /api/match/:id/bundle)
       │               │        📁 backend/liveManager.js
       └───────┬───────┘
               │
               ▼
        ┌──────────────┐
        │   FRONTEND   │          📁 src/hooks/useMatchBundle.jsx
        │      UI      │          📁 src/components/match/tabs/*.jsx
        └──────────────┘
```

---

## 6️⃣ INVARIANTI GLOBALI (RIASSUNTO)

- ❗ Frontend consuma **solo MatchBundle** (1 chiamata) → [`useMatchBundle.jsx`](../src/hooks/useMatchBundle.jsx)
- ❗ Fonti dati (XLSX, SofaScore, SVG) → popolano DB, mai chiamate da FE
- ❗ Le strategie vivono **solo nel backend** → [`strategyEngine.js`](../backend/strategies/strategyEngine.js)
- ❗ Le feature non decidono → [`featureEngine.js`](../backend/utils/featureEngine.js)
- ❗ I segnali non sono metriche
- ❗ Odds ≠ Predictor
- ❗ Live aggiorna lo stato, non lo interpreta → [`liveManager.js`](../backend/liveManager.js)
- ❗ DataQuality è backend-only
- ❗ Fallback legacy trasparente al frontend

Questi invarianti sono **verificati automaticamente** dai Concept Checks → [`runConceptChecks.js`](../scripts/runConceptChecks.js)

---

## 7️⃣ TABELLE DATABASE

### Schema Corrente

| Tabella | Tipo | Fonte | Repository | Note |
|---------|------|-------|------------|------|
| `matches` | Legacy | XLSX Import | [`matchRepository.js`](../backend/db/matchRepository.js) | ~2600 match, schema (winner_name, loser_name) |
| `matches_new` | Nuovo | SofaScore | [`matchRepository.js`](../backend/db/matchRepository.js) | Schema normalizzato (home_player_id, away_player_id) |
| `match_card_snapshot` | Cache | Bundle Engine | [`matchCardService.js`](../backend/services/matchCardService.js) | Cache pre-calcolata del bundle |
| `players` | Lookup | SofaScore | [`playerService.js`](../backend/services/playerService.js) | Dati giocatori |
| `tournaments` | Lookup | SofaScore | - | Dati tornei |
| `match_statistics_new` | Detail | SofaScore | [`matchRepository.js`](../backend/db/matchRepository.js) | Statistiche match |
| `match_power_rankings_new` | Detail | SofaScore/SVG | [`matchRepository.js`](../backend/db/matchRepository.js) | Momentum per game |
| `match_odds_new` | Detail | SofaScore | [`matchRepository.js`](../backend/db/matchRepository.js) | Odds storiche |

### Fallback Order (Bundle Endpoint)

1. `match_card_snapshot` (più veloce, cache) → [`matchCardService.js`](../backend/services/matchCardService.js)
2. `v_matches_with_players` (matches_new + join) → [`matchRepository.js`](../backend/db/matchRepository.js)
3. `matches` (legacy) + transform → [`server.js`](../backend/server.js) L3431 `transformLegacyMatchToBundle()`

---

## 8️⃣ GUIDA ALL'ESTENSIONE DEL SISTEMA

### Aggiungere una nuova fonte dati
1. Creare script/service in [`backend/services/`](../backend/services/)
2. Popolare tabelle DB via [`backend/db/matchRepository.js`](../backend/db/matchRepository.js)
3. **NON** creare endpoint frontend separato
4. Integrare nel flow del bundle in [`backend/services/matchCardService.js`](../backend/services/matchCardService.js)

### Aggiungere una nuova feature
1. Dichiararla in [`backend/utils/featureEngine.js`](../backend/utils/featureEngine.js)
2. Classificarla (Player / Match / Combined)
3. Documentarla in `FILOSOFIA_STATS.md`
4. Usarla in [`backend/strategies/strategyEngine.js`](../backend/strategies/strategyEngine.js)

### Aggiungere una nuova strategia
1. Usare solo feature da featureEngine
2. Implementarla in [`backend/strategies/strategyEngine.js`](../backend/strategies/strategyEngine.js)
3. Produrre `StrategySignal` con status READY/WATCH/OFF
4. Aggiungere alla funzione `evaluateAll()`

### Aggiungere una nuova tab frontend
1. Creare file in [`src/components/match/tabs/`](../src/components/match/tabs/)
2. Leggere solo `MatchBundle.tabs.*` via [`useMatchBundle.jsx`](../src/hooks/useMatchBundle.jsx)
3. Non introdurre nuovi fetch
4. Rispettare dataQuality
5. Esportare da [`src/components/match/tabs/index.js`](../src/components/match/tabs/index.js)

---

## 9️⃣ API ENDPOINTS PRINCIPALI

### Match Bundle (Core)
| Metodo | Endpoint | File | Linea |
|--------|----------|------|-------|
| GET | `/api/match/:id/bundle` | [`server.js`](../backend/server.js) | L3219 |
| GET | `/api/matches/db` | [`server.js`](../backend/server.js) | L1131 |

### Statistiche & Momentum
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/match/:id/stats` | Statistiche match |
| GET | `/api/match/:id/momentum` | Dati momentum |
| GET | `/api/match/:id/odds` | Quote match |

### Giocatori
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/player/:id` | Profilo giocatore |
| GET | `/api/player/:id/stats` | Statistiche giocatore |

---

## 🔟 STATO DEL DOCUMENTO

Questa mappa è:
- il punto di ingresso architetturale
- il riferimento per onboarding
- la guida per AI e nuovi dev

Se un cambiamento **non è riflesso qui**,  
è da considerarsi **architetturalmente incompleto**.

---

## 1️⃣1️⃣ FILOSOFIE - RIEPILOGO COLLEGAMENTI CODICE

| Filosofia | File Codice Principali |
|-----------|------------------------|
| [DB](../filosofie/10_data_platform/db/FILOSOFIA_DB.md) | [`matchRepository.js`](../backend/db/matchRepository.js), [`importXlsx.js`](../backend/importXlsx.js), [`sofascoreScraper.js`](../backend/scraper/sofascoreScraper.js) |
| [STATS](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md) | [`featureEngine.js`](../backend/utils/featureEngine.js), [`strategyEngine.js`](../backend/strategies/strategyEngine.js), [`pressureCalculator.js`](../backend/utils/pressureCalculator.js) |
| [LIVE_TRACKING](../filosofie/20_domain_tennis/live_tracking/FILOSOFIA_LIVE_TRACKING.md) | [`liveManager.js`](../backend/liveManager.js), [`liveTrackingRepository.js`](../backend/db/liveTrackingRepository.js) |
| [ODDS](../filosofie/30_domain_odds_markets/odds/FILOSOFIA_ODDS.md) | [`server.js`](../backend/server.js) L3507-3590, [`OddsTab.jsx`](../src/components/match/tabs/OddsTab.jsx) |
| [FRONTEND](../filosofie/70_frontend/ui_ux/FILOSOFIA_FRONTEND.md) | [`src/components/match/tabs/`](../src/components/match/tabs/), [`src/motion/`](../src/motion/) |
| [FRONTEND_DATA_CONSUMPTION](../filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) | [`useMatchBundle.jsx`](../src/hooks/useMatchBundle.jsx), [`MatchPage.jsx`](../src/components/match/MatchPage.jsx) |
| [CONCEPT_CHECKS](../filosofie/00_foundation/concept_checks/FILOSOFIA_CONCEPT_CHECKS.md) | [`runConceptChecks.js`](../scripts/runConceptChecks.js), [`checkConceptualMap.js`](../scripts/checkConceptualMap.js) |

---

**Fine documento – MAPPA_RETE_CONCETTUALE_V2.3**
