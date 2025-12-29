# 🗺️ MAPPA RETE CONCETTUALE

## Versione V2.9 – MatchBundle-Centric Architecture + Complete API Reference

> **Scopo**: fornire una visione unificata e navigabile dell'architettura concettuale del progetto.  
> **Stato**: ATTIVA  
> **Sostituisce**: `MAPPA_RETE_CONCETTUALE.md` (V1 – DEPRECATA)  
> **Ultimo aggiornamento**: 28 Dicembre 2025  
> **Novità V2.9**: Aggiunti riferimenti bidirezionali INDEX_FILOSOFIE + SCHEDE_UI_TAB + script verifica

---

## 🧭 NAVIGAZIONE RAPIDA

| 📚 Index                                                                 | 🏛️ Costituzione                                                                               |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [INDEX_FILOSOFIE](../filosofie/INDEX_FILOSOFIE.md)                       | [FILOSOFIA_MADRE](../filosofie/00_foundation/FILOSOFIA_MADRE_TENNIS.md)                       |
| [INDEX_FILOSOFIE_PSEUDOCODE](../filosofie/INDEX_FILOSOFIE_PSEUDOCODE.md) | [FILOSOFIA_MADRE_PSEUDOCODE](../filosofie/00_foundation/FILOSOFIA_MADRE_TENNIS_PSEUDOCODE.md) |

### 🎯 Quick Access - File Codice Chiave

| Area                    | File                                                                                       | Entry Point                  |
| ----------------------- | ------------------------------------------------------------------------------------------ | ---------------------------- |
| **Feature Engine**      | [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js)                   | `computeFeatures()`          |
| **Strategy Engine**     | [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js)       | `evaluateAll()`              |
| **Data Quality**        | [`backend/services/dataQualityChecker.js`](../../backend/services/dataQualityChecker.js)   | `evaluateBundleQuality()`    |
| **Bundle Route**        | [`backend/routes/match.routes.js`](../../backend/routes/match.routes.js)                   | `GET /:eventId/bundle`       |
| **Bundle Controller**   | [`backend/controllers/match.controller.js`](../../backend/controllers/match.controller.js) | `getBundle()`                |
| **Bundle Service**      | [`backend/services/bundleService.js`](../../backend/services/bundleService.js)             | `buildBundle()`              |
| **Frontend Hook**       | [`src/hooks/useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx)                       | `useMatchBundle()`           |
| **Philosophy Enforcer** | [`scripts/philosophyEnforcer.js`](../../scripts/philosophyEnforcer.js)                     | Verifica SEMANTICA filosofie |

---

## 📁 STRUTTURA CODICE COMPLETA

```
React-Betfair/
├── backend/
│   ├── server.js                      # 🌐 Bootstrap + mount (~4850 righe, target ~300)
│   ├── liveManager.js                 # ⚡ Gestione match live
│   ├── routes/                        # 📍 Route definitions (10 files)
│   │   ├── index.js                   # Central router mount
│   │   ├── match.routes.js            # MatchBundle, suggested, detected
│   │   ├── player.routes.js           # Player stats, H2H
│   │   ├── tracking.routes.js         # Live tracking
│   │   ├── stats.routes.js            # DB statistics
│   │   └── ...
│   ├── controllers/                   # 🎮 Request handlers (9 files)
│   │   ├── match.controller.js        # getBundle, getSuggested
│   │   ├── player.controller.js       # getStats, getH2H
│   │   ├── stats.controller.js        # getDbStats, getHealth
│   │   └── ...
│   ├── db/
│   │   ├── supabase.js                # 🔌 Client Supabase
│   │   ├── matchRepository.js         # 📦 CRUD matches_new
│   │   ├── liveTrackingRepository.js  # 📦 CRUD live tracking
│   │   └── betDecisionsRepository.js  # 📦 CRUD bet_decisions audit
│   ├── services/
│   │   ├── bundleService.js           # 🎴 MatchBundle builder (~549 righe)
│   │   ├── matchCardService.js        # 🎴 MatchBundle snapshot
│   │   ├── playerStatsService.js      # 👤 Stats giocatori + Surface Splits
│   │   ├── playerProfileService.js    # 👤 Profili giocatori
│   │   ├── dataNormalizer.js          # 🔄 Normalizzazione dati
│   │   ├── dataQualityChecker.js      # 🔍 Bundle quality evaluation
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
│   ├── checkConceptualMap.js          # 🔍 Check mappa concettuale (esistenza file)
│   ├── runConceptChecks.js            # 🧪 Concept checks architetturali (pattern)
│   ├── deepPhilosophyCheck.js         # 🔬 Deep check funzioni/export
│   ├── philosophyEnforcer.js          # 🛡️ Verifica SEMANTICA filosofie ⭐ NUOVO
│   ├── cleanDuplicates.js             # 🗑️ Pulizia duplicati scrapes
│   └── generateTodoReport.js          # 🔄 Genera report unificato TODO_LIST
└── docs/
    ├── filosofie/                     # 📚 Documenti architetturali (Concetto + Pseudocode)
    ├── specs/                         # 📋 Specifiche tecniche
    └── checks/
        ├── MAPPA_RETE_CONCETTUALE_V2.md  # 🗺️ SEI QUI
        └── PHILOSOPHY_ENFORCEMENT.md     # 🛡️ Report verifica semantica
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

## ⚠️ LEZIONI APPRESE

### Problema 1: Feature Con Valori Fake/Uguali ⚡ IMPORTANTE

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

**Implementazione**: [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js)

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
│   • SofaScore Scraper      →      Frontend fa UNA SOLA         │
│   • SVG Momentum API              chiamata a /bundle            │
│   • Future sources                e riceve TUTTO                │
│                                                                 │
│   ❌ Frontend NON chiama queste fonti direttamente              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ DOCUMENTI DI RIFERIMENTO (ATTIVI)

### Core Architecture (docs/filosofie/) - Dual-File Pattern

> Ogni filosofia ha DUE file: **Concetto** (narrativo) + **Pseudocode** (regole formali)

| Documento                    | Concetto                                                                                         | Pseudocode                                                                                                  | Ruolo                     | 📁 File Codice Principali                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FILOSOFIA_MADRE              | [📄](../filosofie/00_foundation/FILOSOFIA_MADRE_TENNIS.md)                                       | [📜](../filosofie/00_foundation/FILOSOFIA_MADRE_TENNIS_PSEUDOCODE.md)                                       | Costituzione tecnica      | (tutti i figli)                                                                                                                                                                                                            |
| FILOSOFIA_CONCEPT_CHECKS     | [📄](../filosofie/00_foundation/FILOSOFIA_CONCEPT_CHECKS.md)                                     | [📜](../filosofie/00_foundation/FILOSOFIA_CONCEPT_CHECKS_PSEUDOCODE.md)                                     | Architecture Guardrail    | [`philosophyEnforcer.js`](../../scripts/philosophyEnforcer.js), [`checkConceptualMap.js`](../../scripts/checkConceptualMap.js), [`runConceptChecks.js`](../../scripts/runConceptChecks.js)                                 |
| FILOSOFIA_DB                 | [📄](../filosofie/10_data_platform/storage/FILOSOFIA_DB.md)                                      | [📜](../filosofie/10_data_platform/storage/FILOSOFIA_DB_PSEUDOCODE.md)                                      | DBA / Data Engineer       | [`supabase.js`](../../backend/db/supabase.js), [`matchRepository.js`](../../backend/db/matchRepository.js), [`db.routes.js`](../../backend/routes/db.routes.js), [`match.routes.js`](../../backend/routes/match.routes.js) |
| FILOSOFIA_TEMPORAL           | [📄](../filosofie/10_data_platform/temporal/FILOSOFIA_TEMPORAL.md)                               | [📜](../filosofie/10_data_platform/temporal/FILOSOFIA_TEMPORAL_PSEUDOCODE.md)                               | Time Architect            | [`liveManager.js`](../../backend/liveManager.js), [`matchCardService.js`](../../backend/services/matchCardService.js), [`dataQualityChecker.js`](../../backend/utils/dataQualityChecker.js)                                |
| FILOSOFIA_REGISTRY_CANON     | [📄](../filosofie/10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md)                   | [📜](../filosofie/10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON_PSEUDOCODE.md)                   | Data Architect            | [`dataNormalizer.js`](../../backend/utils/dataNormalizer.js), [`player.routes.js`](../../backend/routes/player.routes.js), [`data/mappings/`](../../data/mappings/)                                                        |
| FILOSOFIA_LINEAGE_VERSIONING | [📄](../filosofie/10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md)           | [📜](../filosofie/10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING_PSEUDOCODE.md)           | Audit Architect           | [`matchCardService.js`](../../backend/services/matchCardService.js), [`dataQualityChecker.js`](../../backend/utils/dataQualityChecker.js)                                                                                  |
| FILOSOFIA_OBSERVABILITY      | [📄](../filosofie/10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | [📜](../filosofie/10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY_PSEUDOCODE.md) | Data Quality Engineer     | [`dataQualityChecker.js`](../../backend/utils/dataQualityChecker.js), [`matchCardService.js`](../../backend/services/matchCardService.js), [`philosophyEnforcer.js`](../../scripts/philosophyEnforcer.js)                  |
| FILOSOFIA_PBP_EXTRACTION     | [📄](../filosofie/20_domain_tennis/FILOSOFIA_PBP_EXTRACTION.md)                                  | [📜](../filosofie/20_domain_tennis/FILOSOFIA_PBP_EXTRACTION_PSEUDOCODE.md)                                  | Tennis Data Engineer      | [`pbpExtractor.cjs`](../../backend/scraper/pbpExtractor.cjs), [`event.routes.js`](../../backend/routes/event.routes.js), [`event.controller.js`](../../backend/controllers/event.controller.js)                            |
| FILOSOFIA_LIVE_TRACKING      | [📄](../filosofie/20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md)                      | [📜](../filosofie/20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING_PSEUDOCODE.md)                      | Real-time Engineer        | [`liveManager.js`](../../backend/liveManager.js), [`liveTrackingRepository.js`](../../backend/db/liveTrackingRepository.js), [`tracking.routes.js`](../../backend/routes/tracking.routes.js)                               |
| FILOSOFIA_ODDS               | [📄](../filosofie/30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md)                 | [📜](../filosofie/30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS_PSEUDOCODE.md)                 | Quant / Market Data       | [`value.routes.js`](../../backend/routes/value.routes.js), [`value.controller.js`](../../backend/controllers/value.controller.js), [`matchCardService.js`](../../backend/services/matchCardService.js)                     |
| FILOSOFIA_STATS              | [📄](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md)                         | [📜](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS_PSEUDOCODE.md)                         | Feature & Strategy Engine | [`featureEngine.js`](../../backend/utils/featureEngine.js), [`strategyEngine.js`](../../backend/strategies/strategyEngine.js), [`stats.routes.js`](../../backend/routes/stats.routes.js)                                   |
| FILOSOFIA_CALCOLI            | [📄](../filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md)                     | [📜](../filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI_PSEUDOCODE.md)                     | Feature Library           | [`pressureCalculator.js`](../../backend/utils/pressureCalculator.js), [`featureEngine.js`](../../backend/utils/featureEngine.js), [`dataQualityChecker.js`](../../backend/utils/dataQualityChecker.js)                     |
| FILOSOFIA_RISK_BANKROLL      | [📄](../filosofie/50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md)           | [📜](../filosofie/50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL_PSEUDOCODE.md)           | Risk Manager / Quant      | [`strategies/`](../../backend/strategies/), [`betDecisionsRepository.js`](../../backend/db/betDecisionsRepository.js), [`value.routes.js`](../../backend/routes/value.routes.js)                                           |
| FILOSOFIA_FRONTEND_DATA      | [📄](../filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md)           | [📜](../filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION_PSEUDOCODE.md)           | FE Data Consumer          | [`useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx), [`src/components/`](../../src/components/), [`config.js`](../../src/config.js)                                                                                 |
| FILOSOFIA_FRONTEND           | [📄](../filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md)                                          | [📜](../filosofie/70_frontend/ui/FILOSOFIA_FRONTEND_PSEUDOCODE.md)                                          | Frontend UI/UX            | [`src/components/`](../../src/components/), [`src/styles/`](../../src/styles/), [`src/motion/`](../../src/motion/), [`App.jsx`](../../src/App.jsx)                                                                         |
| INDEX_FILOSOFIE              | [📄](../filosofie/INDEX_FILOSOFIE.md)                                                            | [📜](../filosofie/INDEX_FILOSOFIE_PSEUDOCODE.md)                                                            | Mappa navigazione         | -                                                                                                                                                                                                                          |

### Specifications (docs/specs/)

| Documento                  | Link                                         | Scopo                        | 📁 File Codice Correlati                                                                                                                                           |
| -------------------------- | -------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HPI_RESILIENCE             | [📄](../specs/HPI_RESILIENCE.md)             | Feature pressione/resilienza | [`pressureCalculator.js`](../../backend/utils/pressureCalculator.js), [`featureEngine.js`](../../backend/utils/featureEngine.js)                                   |
| SPEC_FRONTEND_MOTION_UI    | [📄](../specs/SPEC_FRONTEND_MOTION_UI.md)    | Animazioni e motion          | [`src/motion/`](../../src/motion/)                                                                                                                                 |
| SPEC_VALUE_SVG             | [📄](../specs/SPEC_VALUE_SVG.md)             | Visualizzazioni SVG          | [`svgMomentumExtractor.js`](../../backend/utils/svgMomentumExtractor.js)                                                                                           |
| FRONTEND_MIGRATION         | [📄](../specs/FRONTEND_MIGRATION.md)         | Guida migrazione frontend    | [`src/components/`](../../src/components/)                                                                                                                         |
| DEPRECATION_FRONTEND_UTILS | [📄](../specs/DEPRECATION_FRONTEND_UTILS.md) | Deprecazioni frontend        | [`src/utils.js`](../../src/utils.js)                                                                                                                               |
| SCHEDE_UI_TAB              | [📄](../specs/SCHEDE_UI_TAB.md)              | Visual design pagine/tab     | [`HomePage.jsx`](../../src/components/home/HomePage.jsx), [`MatchPage.jsx`](../../src/components/match/MatchPage.jsx), [`tabs/`](../../src/components/match/tabs/) |

### Documenti DEPRECATED

- tutte le versioni V1 precedenti non elencate sopra

---

## 🛡️ CI GUARDRAILS – Check Automatici per Filosofie (V2.7)

> **Aggiornato**: 27 Dicembre 2025
> **Script Principali**: 4 livelli di verifica

### Gerarchia Script di Verifica

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LIVELLO 1: ESISTENZA                                                   │
│  checkConceptualMap.js - Verifica che i file esistano                   │
│  Output: ✅ 143+ file verificati                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  LIVELLO 2: PATTERN                                                     │
│  runConceptChecks.js - Verifica pattern architetturali (import, etc)   │
│  Output: 0 errori, 6 warning                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  LIVELLO 3: FUNZIONI                                                    │
│  deepPhilosophyCheck.js - Verifica funzioni/export dichiarati          │
│  Output: Funzioni esportate correttamente                               │
├─────────────────────────────────────────────────────────────────────────┤
│  LIVELLO 4: SEMANTICA ⭐ NUOVO                                          │
│  philosophyEnforcer.js - Verifica che il CODICE rispetti le FILOSOFIE  │
│  Output: 2 errori, 2 warning (27 Dic 2025)                             │
│                                                                         │
│  Verifica:                                                              │
│  - Strutture dati corrette (dataQuality oggetto vs numero)             │
│  - Schema DB completo (colonne source, version)                         │
│  - Pattern invarianti (row1=HOME sempre)                                │
│  - Determinismo (no Math.random)                                        │
│  - Flussi corretti (frontend non calcola)                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Esecuzione Check

```bash
# Livello 1: Esistenza file
node scripts/checkConceptualMap.js

# Livello 2: Pattern architetturali
node scripts/runConceptChecks.js

# Livello 3: Funzioni/export
node scripts/deepPhilosophyCheck.js

# Livello 4: Verifica SEMANTICA filosofie ⭐
node scripts/philosophyEnforcer.js

# Tutti insieme
node scripts/generateTodoReport.js
```

### Check Semantici per Filosofia (philosophyEnforcer.js)

| ID            | Filosofia               | Descrizione                                                       | Severity |
| ------------- | ----------------------- | ----------------------------------------------------------------- | -------- |
| **DB-001**    | FILOSOFIA_DB            | dataQuality DEVE essere oggetto {completeness, freshness, source} | ERROR    |
| **DB-002**    | FILOSOFIA_DB            | matches_new DEVE avere colonne source, version                    | ERROR    |
| **DB-003**    | FILOSOFIA_DB            | Frontend chiama SOLO /api/match/:id/bundle                        | ERROR    |
| **PBP-001**   | FILOSOFIA_PBP           | row1=HOME deve essere INVARIANTE (non condizionale)               | WARN     |
| **TEMP-001**  | FILOSOFIA_TEMPORAL      | Tabelle devono avere event_time                                   | WARN     |
| **TEMP-002**  | FILOSOFIA_TEMPORAL      | Bundle deve avere meta.as_of_time                                 | ERROR    |
| **CALC-001**  | FILOSOFIA_CALCOLI       | Feature functions MAI null/undefined                              | ERROR    |
| **CALC-002**  | FILOSOFIA_CALCOLI       | Calcoli DETERMINISTICI (no random)                                | WARN     |
| **FE-001**    | FILOSOFIA_FRONTEND_DATA | Frontend NON calcola (pressure, edge...)                          | ERROR    |
| **LIN-001**   | FILOSOFIA_LINEAGE       | featureEngine export VERSION                                      | ERROR    |
| **LIN-002**   | FILOSOFIA_LINEAGE       | strategyEngine export VERSION                                     | ERROR    |
| **LIN-003**   | FILOSOFIA_LINEAGE       | Bundle include meta.versions                                      | ERROR    |
| **OBS-001**   | FILOSOFIA_OBSERVABILITY | dataQualityChecker valuta completeness, freshness                 | WARN     |
| **RISK-001**  | FILOSOFIA_RISK          | riskEngine verifica edge > 0                                      | ERROR    |
| **STATS-001** | FILOSOFIA_STATS         | Signals NON persistiti come history                               | WARN     |

### Stato Attuale (27 Dic 2025)

```
📊 philosophyEnforcer.js:
   ✅ Passati:  11
   ❌ Errori:   2 (DB-001, DB-002)
   ⚠️ Warning: 2 (PBP-001, TEMP-001)

📊 runConceptChecks.js:
   ✅ CI PASSED
   🟡 Warning: 6

📊 checkConceptualMap.js:
   ✅ 143 file verificati
   📄 1 file non documentato
```

---

## 2️⃣ ARCHITETTURA DATI END-TO-END

### Diagramma Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FONTI DATI (Popolamento)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐                   │
│  │  SofaScore   │  │ SVG Momentum │  │   Future    │                   │
│  │  Scraper     │  │    API       │  │   Sources   │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘                   │
│         │                 │                  │                          │
│         │ sofascoreScraper│ svgMomentum     │                          │
│         │ .js             │ Service.js       │                          │
│         ▼                 ▼                  ▼                          │
├─────────────────────────────────────────────────────────────────────────┤
│                         SUPABASE DATABASE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐  ┌────────────────────────┐                      │
│  │   matches_new    │  │  match_card_snapshot   │                      │
│  │    (primary)     │  │       (cache)          │                      │
│  │                  │  │                        │                      │
│  │ • home_player_id │  │ • bundle_json          │                      │
│  │ • away_player_id │  │ • data_quality_int     │                      │
│  │ • statistics     │  │ • last_updated_at      │                      │
│  │ • pbp, odds      │  │                        │                      │
│  └──────────────────┘  └────────────────────────┘                      │
│           │                       │                                     │
│           └───────────────────────┘                                     │
│                       │                                                 │
│                       ▼                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│          BUNDLE ENDPOINT (match.routes.js → match.controller.js)        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  GET /api/match/:id/bundle                                              │
│                                                                         │
│  Logica (bundleService.buildBundle):                                    │
│  1. matchCardService.getMatchCardFromSnapshot() → se trovato, return   │
│  2. Se null → cerca in matches_new via v_matches_with_players          │
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
│  ❌ NON chiama API SVG                                                  │
│  ❌ NON ricalcola metriche                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ RIFERIMENTI CODICE DETTAGLIATI

### 🔌 Backend - API Layer Complete Reference (Routes → Controllers)

> **Aggiornato**: 28 Dicembre 2025  
> **Source**: `backend/routes/index.js` + individual route files

#### Core Match APIs

| Route File        | Controller File       | Endpoint                               | Descrizione             |
| ----------------- | --------------------- | -------------------------------------- | ----------------------- |
| `match.routes.js` | `match.controller.js` | `GET /api/match/:id/bundle`            | MatchBundle completo ⭐ |
| `match.routes.js` | `match.controller.js` | `GET /api/match/:id`                   | Dati match singolo      |
| `match.routes.js` | `match.controller.js` | `GET /api/matches/db`                  | Lista match database    |
| `match.routes.js` | `match.controller.js` | `GET /api/matches/suggested`           | Match suggeriti         |
| `match.routes.js` | `match.controller.js` | `GET /api/matches/detected`            | Match rilevati          |
| `match.routes.js` | `match.controller.js` | `GET /api/matches/search`              | Ricerca match           |
| `match.routes.js` | `match.controller.js` | `GET /api/matches/tournaments`         | Lista tornei            |
| `match.routes.js` | `match.controller.js` | `GET /api/match/tournament/:id/events` | Match di un torneo      |
| `match.routes.js` | `match.controller.js` | `POST /api/match/sync/:id`             | Sync manuale            |
| `match.routes.js` | `match.controller.js` | `GET /api/match/check-data/:id`        | Verifica completezza    |

#### Player APIs

| Route File         | Controller File        | Endpoint                                      | Descrizione          |
| ------------------ | ---------------------- | --------------------------------------------- | -------------------- |
| `player.routes.js` | `player.controller.js` | `GET /api/player/:name/stats`                 | Stats giocatore      |
| `player.routes.js` | `player.controller.js` | `GET /api/player/:name/matches`               | Match giocatore      |
| `player.routes.js` | `player.controller.js` | `GET /api/player/search`                      | Ricerca autocomplete |
| `player.routes.js` | `player.controller.js` | `GET /api/player/h2h`                         | Head to Head         |
| `match.routes.js`  | `player.controller.js` | `GET /api/match/strategy-context/:home/:away` | Contesto strategie   |

#### Tracking & Live APIs

| Route File           | Controller File          | Endpoint                             | Descrizione       |
| -------------------- | ------------------------ | ------------------------------------ | ----------------- |
| `tracking.routes.js` | `tracking.controller.js` | `POST /api/track/:eventId`           | Aggiungi tracking |
| `tracking.routes.js` | `tracking.controller.js` | `DELETE /api/track/:eventId`         | Rimuovi tracking  |
| `tracking.routes.js` | `tracking.controller.js` | `GET /api/tracked`                   | Lista tracked     |
| `tracking.routes.js` | `tracking.controller.js` | `POST /api/track/:id/priority`       | Cambia priorità   |
| `tracking.routes.js` | `tracking.controller.js` | `POST /api/track/:id/resume`         | Riprendi tracking |
| `tracking.routes.js` | `tracking.controller.js` | `GET /api/tracking/stats`            | Stats tracking    |
| `tracking.routes.js` | `tracking.controller.js` | `GET /api/tracking/live/discover`    | Scopri match live |
| `tracking.routes.js` | `tracking.controller.js` | `GET /api/tracking/live/status`      | Status sistema    |
| `tracking.routes.js` | `tracking.controller.js` | `POST /api/tracking/scheduler/start` | Avvia scheduler   |
| `tracking.routes.js` | `tracking.controller.js` | `POST /api/tracking/scheduler/stop`  | Ferma scheduler   |

#### Event APIs (Direct SofaScore)

| Route File        | Controller File       | Endpoint                            | Descrizione       |
| ----------------- | --------------------- | ----------------------------------- | ----------------- |
| `event.routes.js` | `event.controller.js` | `GET /api/event/:id/point-by-point` | PBP diretto       |
| `event.routes.js` | `event.controller.js` | `GET /api/event/:id/statistics`     | Stats dirette     |
| `event.routes.js` | `event.controller.js` | `GET /api/event/:id/power-rankings` | Rankings diretti  |
| `event.routes.js` | `event.controller.js` | `GET /api/event/:id/live`           | Dati live diretti |

#### Database APIs

| Route File        | Controller File       | Endpoint                      | Descrizione      |
| ----------------- | --------------------- | ----------------------------- | ---------------- |
| `db.routes.js`    | `db.controller.js`    | `GET /api/db/test`            | Test connessione |
| `db.routes.js`    | `db.controller.js`    | `GET /api/db/matches`         | Lista match DB   |
| `db.routes.js`    | `db.controller.js`    | `GET /api/db/matches/summary` | Summary HomePage |
| `db.routes.js`    | `db.controller.js`    | `GET /api/db/matches/:id`     | Match singolo    |
| `db.routes.js`    | `db.controller.js`    | `GET /api/db/tournaments`     | Lista tornei     |
| `db.routes.js`    | `db.controller.js`    | `GET /api/db/players/search`  | Cerca giocatori  |
| `db.routes.js`    | `db.controller.js`    | `GET /api/db/logs`            | Extraction logs  |
| `stats.routes.js` | `stats.controller.js` | `GET /api/stats/db`           | Statistiche DB   |
| `stats.routes.js` | `stats.controller.js` | `GET /api/stats/health`       | Health check     |

#### Value Interpretation APIs

| Route File        | Controller File       | Endpoint                           | Descrizione       |
| ----------------- | --------------------- | ---------------------------------- | ----------------- |
| `value.routes.js` | `value.controller.js` | `POST /api/interpret-value`        | Interpreta valore |
| `value.routes.js` | `value.controller.js` | `POST /api/analyze-power-rankings` | Analizza rankings |
| `value.routes.js` | `value.controller.js` | `GET /api/value-thresholds`        | Soglie default    |
| `value.routes.js` | `value.controller.js` | `GET /api/value-zone/:value`       | Zona valore       |

#### Scrapes APIs

| Route File          | Controller File         | Endpoint                | Descrizione    |
| ------------------- | ----------------------- | ----------------------- | -------------- |
| `scrapes.routes.js` | `scrapes.controller.js` | `GET /api/scrapes`      | Lista scrapes  |
| `scrapes.routes.js` | `scrapes.controller.js` | `GET /api/scrapes/:id`  | Singolo scrape |
| `index.js`          | `scrapes.controller.js` | `POST /api/scrape`      | Avvia scrape   |
| `index.js`          | `scrapes.controller.js` | `GET /api/status/:id`   | Status scrape  |
| `index.js`          | `scrapes.controller.js` | `GET /api/data/:id`     | Dati scrape    |
| `index.js`          | `scrapes.controller.js` | `POST /api/lookup-name` | Lookup URL     |

#### Health & System APIs

| Route File         | Controller File        | Endpoint          | Descrizione  |
| ------------------ | ---------------------- | ----------------- | ------------ |
| `health.routes.js` | `health.controller.js` | `GET /api/`       | Root info    |
| `health.routes.js` | `health.controller.js` | `GET /api/health` | Health check |

### 🧮 Backend - Feature Engine

| File                                                                     | Funzione                                      | Linea | Descrizione                             |
| ------------------------------------------------------------------------ | --------------------------------------------- | ----- | --------------------------------------- |
| [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) | `calculateVolatility()`                       | L49   | Da powerRankings                        |
|                                                                          | `calculateDominance()`                        | L97   | Da powerRankings                        |
|                                                                          | `calculateServeDominance()`                   | L137  | Da statistics                           |
|                                                                          | `calculateBreakProbability()`                 | L205  | Da statistics                           |
|                                                                          | `calculateRecentMomentum()`                   | L293  | Da powerRankings                        |
|                                                                          | `computeFeatures()`                           | L353  | Entry point - Calcola TUTTE le features |
|                                                                          | `calculateVolatilityFromScore()`              | L523  | Fallback da score                       |
|                                                                          | `calculateDominanceFromScore()`               | L554  | Fallback da score                       |
|                                                                          | `calculateDominanceFromOdds()`                | L589  | Fallback da odds                        |
|                                                                          | `calculateServeDominanceFromRankings()`       | L624  | Fallback da rankings                    |
|                                                                          | `calculateBreakProbabilityFromOddsRankings()` | L649  | Fallback                                |
|                                                                          | `calculatePressureFromScore()`                | L694  | Fallback pressure                       |
|                                                                          | `calculateMomentumFromScore()`                | L725  | Fallback momentum                       |

### 🎯 Backend - Strategy Engine

| File                                                                                 | Funzione                       | Linea | Descrizione                             |
| ------------------------------------------------------------------------------------ | ------------------------------ | ----- | --------------------------------------- |
| [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js) | `evaluateAll()`                | L44   | Entry point - Valuta tutte le strategie |
|                                                                                      | `evaluateLayWinner()`          | L68   | Strategia Lay the Winner                |
|                                                                                      | `evaluateBancaServizio()`      | L153  | Strategia Banca Servizio                |
|                                                                                      | `evaluateSuperBreak()`         | L227  | Strategia Super Break                   |
|                                                                                      | `evaluateTiebreakSpecialist()` | L312  | Strategia Tiebreak Specialist           |
|                                                                                      | `evaluateMomentumSwing()`      | L383  | Strategia Momentum Swing                |
|                                                                                      | `getSummary()`                 | L448  | Riassunto segnali                       |

### 📦 Backend - Repository & Services

| File                                                                                      | Descrizione                            |
| ----------------------------------------------------------------------------------------- | -------------------------------------- |
| [`backend/db/matchRepository.js`](../backend/db/matchRepository.js)                       | CRUD matches_new, statistics, pbp      |
| [`backend/db/liveTrackingRepository.js`](../backend/db/liveTrackingRepository.js)         | CRUD live tracking                     |
| [`backend/db/betDecisionsRepository.js`](../backend/db/betDecisionsRepository.js)         | CRUD bet_decisions audit table         |
| [`backend/db/supabase.js`](../backend/db/supabase.js)                                     | Client Supabase                        |
| [`backend/services/matchCardService.js`](../backend/services/matchCardService.js)         | Snapshot cache + build card            |
| [`backend/services/playerStatsService.js`](../backend/services/playerStatsService.js)     | Statistiche giocatori + Surface Splits |
| [`backend/services/playerProfileService.js`](../backend/services/playerProfileService.js) | Profili giocatori                      |
| [`backend/services/dataNormalizer.js`](../backend/services/dataNormalizer.js)             | Normalizzazione dati                   |
| [`backend/services/dataQualityChecker.js`](../backend/services/dataQualityChecker.js)     | Bundle quality evaluation              |
| [`backend/scraper/sofascoreScraper.js`](../backend/scraper/sofascoreScraper.js)           | Scraper SofaScore                      |

### 🧮 Backend - Utils Aggiuntive

| File                                                                                | Descrizione                     |
| ----------------------------------------------------------------------------------- | ------------------------------- |
| [`backend/utils/pressureCalculator.js`](../backend/utils/pressureCalculator.js)     | Calcoli HPI e pressure          |
| [`backend/utils/breakDetector.js`](../backend/utils/breakDetector.js)               | Rilevamento break/hold          |
| [`backend/utils/matchSegmenter.js`](../backend/utils/matchSegmenter.js)             | Segmentazione temporale match   |
| [`backend/utils/svgMomentumExtractor.js`](../backend/utils/svgMomentumExtractor.js) | Estrazione dati da SVG momentum |
| [`backend/utils/valueInterpreter.js`](../backend/utils/valueInterpreter.js)         | Interpretazione valori          |

### 🎣 Frontend - Hooks

| File                                                                 | Export             | Linea | Descrizione                          |
| -------------------------------------------------------------------- | ------------------ | ----- | ------------------------------------ |
| [`src/hooks/useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx) | `useMatchBundle()` | L44   | Hook principale fetch + WS + polling |
|                                                                      | `useTabData()`     | L359  | Estrae dati tab specifico            |
|                                                                      | `useHeaderData()`  | L369  | Estrae header dal bundle             |
|                                                                      | `useDataQuality()` | L376  | Estrae dataQuality                   |
|                                                                      | `BundleState`      | L19   | Enum stati bundle                    |
| [`src/hooks/useLiveMatch.jsx`](../../src/hooks/useLiveMatch.jsx)     | `useLiveMatch()`   | -     | Hook match live                      |
| [`src/hooks/useMatchCard.jsx`](../../src/hooks/useMatchCard.jsx)     | `useMatchCard()`   | -     | Hook card match                      |

### 🖥️ Frontend - Componenti

| File                                                                                                | Descrizione                                                           | Bundle Data Consumati                  |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| [`src/components/HomePage.jsx`](../src/components/HomePage.jsx)                                     | Lista match, ricerca                                                  | Lista matches                          |
| [`src/components/match/MatchPage.jsx`](../src/components/match/MatchPage.jsx)                       | Container tabs                                                        | bundle (intero)                        |
| [`src/components/match/tabs/OverviewTab.jsx`](../src/components/match/tabs/OverviewTab.jsx)         | QuickSignals, MiniMomentum                                            | header, tabs.overview, tabs.strategies |
| [`src/components/match/tabs/StatsTab.jsx`](../src/components/match/tabs/StatsTab.jsx)               | Statistiche partita con **tabs per periodo** (Match, Set 1, Set 2...) | tabs.stats.byPeriod                    |
| [`src/components/match/tabs/MomentumTab.jsx`](../src/components/match/tabs/MomentumTab.jsx)         | Grafico momentum                                                      | tabs.momentum                          |
| [`src/components/match/tabs/StrategiesTab.jsx`](../src/components/match/tabs/StrategiesTab.jsx)     | Panel strategie                                                       | tabs.strategies                        |
| [`src/components/match/tabs/OddsTab.jsx`](../src/components/match/tabs/OddsTab.jsx)                 | Quote mercato                                                         | tabs.odds                              |
| [`src/components/match/tabs/PredictorTab.jsx`](../src/components/match/tabs/PredictorTab.jsx)       | Predizioni                                                            | tabs.predictor                         |
| [`src/components/match/tabs/PointByPointTab.jsx`](../src/components/match/tabs/PointByPointTab.jsx) | Punto per punto                                                       | tabs.pointByPoint                      |
| [`src/components/match/tabs/JournalTab.jsx`](../src/components/match/tabs/JournalTab.jsx)           | Journal trading                                                       | tabs.journal                           |

---

## 4️⃣ DOMINI CONCETTUALI E RESPONSABILITÀ

### 🗄️ Database & Data Sources

**Documento**: [FILOSOFIA_DB](../filosofie/10_data_platform/storage/FILOSOFIA_DB.md)  
**📁 Codice**: [`backend/db/`](../backend/db/), [`backend/services/matchCardService.js`](../backend/services/matchCardService.js)

Responsabilità:

- **Acquisizione dati** da fonti esterne (SofaScore API, SVG Momentum)
- Persistenza raw e canonical
- Generazione `match_card_snapshot`
- Versionamento schema

Output:

- Dati pronti per Bundle Endpoint

---

### ⚡ Live Tracking

**Documento**: [FILOSOFIA_LIVE_TRACKING](../filosofie/20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md)  
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

**Documento**: [FILOSOFIA_ODDS](../filosofie/30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md)  
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
**UI/UX**: [FILOSOFIA_FRONTEND](../filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md)  
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
      │  MATCH BUNDLE  │          📁 backend/services/bundleService.js
      │   SNAPSHOT     │
      └────────┬───────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
   REST API        WS PATCH
  (load init)       (live)      📁 backend/routes/match.routes.js → controllers/match.controller.js
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
- ❗ Fonti dati (SofaScore API, SVG Momentum) → popolano DB, mai chiamate da FE
- ❗ Le strategie vivono **solo nel backend** → [`strategyEngine.js`](../backend/strategies/strategyEngine.js)
- ❗ Le feature non decidono → [`featureEngine.js`](../backend/utils/featureEngine.js)
- ❗ I segnali non sono metriche
- ❗ Odds ≠ Predictor
- ❗ Live aggiorna lo stato, non lo interpreta → [`liveManager.js`](../backend/liveManager.js)
- ❗ DataQuality è backend-only

Questi invarianti sono **verificati automaticamente** dai Concept Checks → [`runConceptChecks.js`](../scripts/runConceptChecks.js)

---

## 7️⃣ TABELLE DATABASE

### Schema Corrente

| Tabella                    | Tipo     | Fonte         | Repository                                                             | Note                                                 |
| -------------------------- | -------- | ------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `matches_new`              | Primaria | SofaScore API | [`matchRepository.js`](../backend/db/matchRepository.js)               | Schema normalizzato (home_player_id, away_player_id) |
| `match_card_snapshot`      | Cache    | Bundle Engine | [`matchCardService.js`](../backend/services/matchCardService.js)       | Cache pre-calcolata del bundle                       |
| `players`                  | Lookup   | SofaScore     | [`playerService.js`](../backend/services/playerService.js)             | Dati giocatori                                       |
| `tournaments`              | Lookup   | SofaScore     | -                                                                      | Dati tornei                                          |
| `match_statistics_new`     | Detail   | SofaScore     | [`matchRepository.js`](../backend/db/matchRepository.js)               | Statistiche match                                    |
| `match_power_rankings_new` | Detail   | SofaScore/SVG | [`matchRepository.js`](../backend/db/matchRepository.js)               | Momentum per game                                    |
| `match_odds_new`           | Detail   | SofaScore     | [`matchRepository.js`](../backend/db/matchRepository.js)               | Odds storiche                                        |
| `bet_decisions`            | Audit    | Bundle Engine | [`betDecisionsRepository.js`](../backend/db/betDecisionsRepository.js) | Audit trail decisioni bet                            |

### Fallback Order (Bundle Endpoint)

1. `match_card_snapshot` (più veloce, cache) → [`matchCardService.js`](../backend/services/matchCardService.js)
2. `v_matches_with_players` (matches_new + join) → [`matchRepository.js`](../backend/db/matchRepository.js)
3. `matches` (legacy) + transform → [`bundleService.js`](../backend/services/bundleService.js) `transformLegacyMatchToBundle()`

---

## 8️⃣ GUIDA ALL'ESTENSIONE DEL SISTEMA

### Aggiungere una nuova fonte dati

1. Creare script/service in [`backend/services/`](../backend/services/)
2. Popolare tabelle DB via [`backend/db/matchRepository.js`](../backend/db/matchRepository.js)
3. **NON** creare endpoint frontend separato
4. Integrare nel flow del bundle in [`backend/services/bundleService.js`](../backend/services/bundleService.js)

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

| Metodo | Endpoint                 | Route File        | Controller       |
| ------ | ------------------------ | ----------------- | ---------------- |
| GET    | `/api/match/:id/bundle`  | `match.routes.js` | `getBundle()`    |
| GET    | `/api/matches/db`        | `match.routes.js` | `getFromDb()`    |
| GET    | `/api/matches/suggested` | `match.routes.js` | `getSuggested()` |
| GET    | `/api/matches/detected`  | `match.routes.js` | `getDetected()`  |

### Player

| Metodo | Endpoint                  | Route File         | Controller   |
| ------ | ------------------------- | ------------------ | ------------ |
| GET    | `/api/player/:name/stats` | `player.routes.js` | `getStats()` |
| GET    | `/api/player/search`      | `player.routes.js` | `search()`   |
| GET    | `/api/player/h2h`         | `player.routes.js` | `getH2H()`   |

### Tracking

| Metodo | Endpoint              | Route File           | Controller      |
| ------ | --------------------- | -------------------- | --------------- |
| POST   | `/api/track/:eventId` | `tracking.routes.js` | `track()`       |
| DELETE | `/api/track/:eventId` | `tracking.routes.js` | `untrack()`     |
| GET    | `/api/tracked`        | `tracking.routes.js` | `listTracked()` |

### Stats & Health

| Metodo | Endpoint            | Route File        | Controller     |
| ------ | ------------------- | ----------------- | -------------- |
| GET    | `/api/stats/db`     | `stats.routes.js` | `getDbStats()` |
| GET    | `/api/stats/health` | `stats.routes.js` | `getHealth()`  |

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

| Filosofia                                                                                                   | File Codice Principali                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [MADRE](../filosofie/00_foundation/FILOSOFIA_MADRE_TENNIS.md)                                               | Documento padre, riferimenti a tutti i figli                                                                                                                                                                               |
| [CONCEPT_CHECKS](../filosofie/00_foundation/FILOSOFIA_CONCEPT_CHECKS.md)                                    | [`philosophyEnforcer.js`](../../scripts/philosophyEnforcer.js), [`checkConceptualMap.js`](../../scripts/checkConceptualMap.js), [`runConceptChecks.js`](../../scripts/runConceptChecks.js)                                 |
| [DB](../filosofie/10_data_platform/storage/FILOSOFIA_DB.md)                                                 | [`supabase.js`](../../backend/db/supabase.js), [`matchRepository.js`](../../backend/db/matchRepository.js), [`db.routes.js`](../../backend/routes/db.routes.js), [`match.routes.js`](../../backend/routes/match.routes.js) |
| [TEMPORAL](../filosofie/10_data_platform/temporal/FILOSOFIA_TEMPORAL.md)                                    | [`liveManager.js`](../../backend/liveManager.js), [`matchCardService.js`](../../backend/services/matchCardService.js), [`dataQualityChecker.js`](../../backend/utils/dataQualityChecker.js)                                |
| [REGISTRY_CANON](../filosofie/10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md)                  | [`dataNormalizer.js`](../../backend/utils/dataNormalizer.js), [`player.routes.js`](../../backend/routes/player.routes.js)                                                                                                  |
| [LINEAGE](../filosofie/10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md)                 | [`matchCardService.js`](../../backend/services/matchCardService.js), [`dataQualityChecker.js`](../../backend/utils/dataQualityChecker.js)                                                                                  |
| [OBSERVABILITY](../filosofie/10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | [`dataQualityChecker.js`](../../backend/utils/dataQualityChecker.js), [`philosophyEnforcer.js`](../../scripts/philosophyEnforcer.js)                                                                                       |
| [PBP_EXTRACTION](../filosofie/20_domain_tennis/FILOSOFIA_PBP_EXTRACTION.md)                                 | [`pbpExtractor.cjs`](../../backend/scraper/pbpExtractor.cjs), [`event.routes.js`](../../backend/routes/event.routes.js), [`event.controller.js`](../../backend/controllers/event.controller.js)                            |
| [LIVE_TRACKING](../filosofie/20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md)                      | [`liveManager.js`](../../backend/liveManager.js), [`liveTrackingRepository.js`](../../backend/db/liveTrackingRepository.js), [`tracking.routes.js`](../../backend/routes/tracking.routes.js)                               |
| [ODDS](../filosofie/30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md)                          | [`value.routes.js`](../../backend/routes/value.routes.js), [`value.controller.js`](../../backend/controllers/value.controller.js), [`matchCardService.js`](../../backend/services/matchCardService.js)                     |
| [STATS](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md)                                 | [`featureEngine.js`](../../backend/utils/featureEngine.js), [`strategyEngine.js`](../../backend/strategies/strategyEngine.js), [`stats.routes.js`](../../backend/routes/stats.routes.js)                                   |
| [CALCOLI](../filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md)                           | [`pressureCalculator.js`](../../backend/utils/pressureCalculator.js), [`featureEngine.js`](../../backend/utils/featureEngine.js)                                                                                           |
| [RISK_BANKROLL](../filosofie/50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md)           | [`strategies/`](../../backend/strategies/), [`betDecisionsRepository.js`](../../backend/db/betDecisionsRepository.js), [`value.routes.js`](../../backend/routes/value.routes.js)                                           |
| [FRONTEND_DATA](../filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md)           | [`useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx), [`src/components/`](../../src/components/), [`config.js`](../../src/config.js)                                                                                 |
| [FRONTEND](../filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md)                                               | [`src/components/`](../../src/components/), [`src/styles/`](../../src/styles/), [`src/motion/`](../../src/motion/), [SCHEDE_UI_TAB](../specs/SCHEDE_UI_TAB.md)                                                             |

---

## 📚 Riferimenti

### 🧭 Navigazione Architettura

| ⬆️ Index                                                                 | ⬅️ Correlati                               | ➡️ Scripts Verifica                                            |
| ------------------------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------- |
| [INDEX_FILOSOFIE](../filosofie/INDEX_FILOSOFIE.md)                       | [TODO_LIST](../TODO_LIST.md)               | [`checkConceptualMap.js`](../../scripts/checkConceptualMap.js) |
| [INDEX_FILOSOFIE_PSEUDOCODE](../filosofie/INDEX_FILOSOFIE_PSEUDOCODE.md) | [SCHEDE_UI_TAB](../specs/SCHEDE_UI_TAB.md) | [`runConceptChecks.js`](../../scripts/runConceptChecks.js)     |
|                                                                          |                                            | [`philosophyEnforcer.js`](../../scripts/philosophyEnforcer.js) |

### 📁 Script di Verifica

| Script                                                           | Comando                               | Descrizione                     |
| ---------------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| [`checkConceptualMap.js`](../../scripts/checkConceptualMap.js)   | `node scripts/checkConceptualMap.js`  | Verifica esistenza file         |
| [`runConceptChecks.js`](../../scripts/runConceptChecks.js)       | `node scripts/runConceptChecks.js`    | Verifica pattern architetturali |
| [`deepPhilosophyCheck.js`](../../scripts/deepPhilosophyCheck.js) | `node scripts/deepPhilosophyCheck.js` | Verifica funzioni/export        |
| [`philosophyEnforcer.js`](../../scripts/philosophyEnforcer.js)   | `node scripts/philosophyEnforcer.js`  | Verifica semantica filosofie    |
| [`generateTodoReport.js`](../../scripts/generateTodoReport.js)   | `node scripts/generateTodoReport.js`  | Genera report TODO unificato    |

---

**Fine documento – MAPPA_RETE_CONCETTUALE_V2.9**
