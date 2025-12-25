# 📚 INDEX FILOSOFIE – Mappa Navigazione Progetto

> **Ultimo aggiornamento**: 25 Dicembre 2025  
> **Stato**: ATTIVO – Source of Truth per navigazione documentale  
> **Integra**: `MAPPA_RETE_CONCETTUALE_V2.md`

---

## � STRUTTURA CODICE RAPIDA

```
React-Betfair/
├── backend/
│   ├── server.js                      # 🌐 Express API (~5400 righe)
│   ├── liveManager.js                 # ⚡ Match live
│   ├── db/                            # 📦 Repository
│   │   ├── supabase.js
│   │   ├── matchRepository.js
│   │   └── liveTrackingRepository.js
│   ├── services/                      # 🛠️ Business Logic
│   │   ├── matchCardService.js        # 🎴 Bundle snapshot
│   │   ├── playerStatsService.js
│   │   └── dataNormalizer.js
│   ├── strategies/
│   │   └── strategyEngine.js          # 🎯 Strategy Engine
│   ├── utils/
│   │   ├── featureEngine.js           # 🧮 Feature Engine
│   │   └── pressureCalculator.js      # 📊 HPI/Pressure
│   └── scraper/
│       └── sofascoreScraper.js        # 🕷️ Scraper
├── src/
│   ├── hooks/
│   │   └── useMatchBundle.jsx         # 🎣 Hook bundle
│   └── components/
│       └── match/tabs/                # 📄 Tab componenti
│           ├── OverviewTab.jsx
│           ├── StatsTab.jsx
│           ├── StrategiesTab.jsx
│           └── ...
└── docs/filosofie/                    # 📚 SEI QUI
```

---

## 🔗 LINK RAPIDI

| 📄 Documento | Descrizione |
|-------------|-------------|
| [🗺️ MAPPA_RETE_CONCETTUALE](../checks/MAPPA_RETE_CONCETTUALE_V2.md) | Visione architetturale unificata |
| [✅ CHECK_MAPPA_CONCETTUALE](../checks/CHECK_MAPPA_CONCETTUALE.md) | Risultati verifica automatica |
| [📋 TODO_LIST](../TODO_LIST.md) | Attività e backlog |

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

## 🎯 Come usare questo indice

1. **Parti sempre dalla MADRE** per capire il ruolo che devi assumere
2. **Segui le dipendenze** per capire input/output
3. **Usa i Concept Checks** per validare le decisioni architetturali

---

## 🏛️ DOCUMENTO COSTITUZIONALE

| Documento | Scopo | Quando leggerlo |
|-----------|-------|-----------------|
| [**FILOSOFIA_MADRE**](00_foundation/FILOSOFIA_MADRE_TENNIS.md) | Costituzione tecnica del progetto | SEMPRE – Prima di ogni task |

---

## 📊 MAPPA DEI SETTORI

```
                    ┌─────────────────────────────┐
                    │      FILOSOFIA_MADRE        │
                    │    (Costituzione/Ruoli)     │
                    └─────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
  ┌─────────────┐        ┌─────────────┐         ┌─────────────┐
  │  TEMPORAL   │        │REGISTRY     │         │  LINEAGE    │
  │(Time Rules) │        │(Canon IDs)  │         │(Versioning) │
  └──────┬──────┘        └──────┬──────┘         └──────┬──────┘
         │                      │                        │
         └──────────┬───────────┴───────┬────────────────┘
                    │                   │
    ┌───────────────┼───────────────────┼───────────────┐
    │               │                   │               │
    ▼               ▼                   ▼               ▼
┌───────┐     ┌──────────┐       ┌──────────┐    ┌──────────┐
│  DB   │     │   ODDS   │       │   LIVE   │    │OBSERV    │
│(DBA)  │     │ (Quant)  │       │(RT Eng)  │    │(Quality) │
└───┬───┘     └────┬─────┘       └────┬─────┘    └────┬─────┘
    │              │                  │               │
    │    ┌─────────┴──────┐           │               │
    └───►│      HPI       │◄──────────┘               │
         │   (Features)   │                           │
         └────────┬───────┘                           │
                  │                                   │
                  ├─────────────────────┐             │
                  │                     │             │
                  ▼                     ▼             │
           ┌────────────┐       ┌─────────────┐      │
           │  CALCOLI   │──────►│    STATS    │◄─────┘
           │  (Library) │       │(F→S→Signal) │
           └────────────┘       └──────┬──────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  MATCH BUNDLE   │
                              │ + META Standard │
                              └────────┬────────┘
                                       │
                        ┌──────────────┼──────────────┐
                        │              │              │
                        ▼              ▼              ▼
                  ┌──────────┐  ┌───────────┐  ┌──────────┐
                  │  FE_DATA │  │   FE_UI   │  │   RISK   │
                  │   (Hook) │  │ (Display) │  │(Bankroll)│
                  └──────────┘  └───────────┘  └──────────┘
                        │              │              │
                        └──────────────┼──────────────┘
                                       ▼
                              ┌─────────────────┐
                              │ CONCEPT_CHECKS  │
                              │  (Guardrails)   │
                              └─────────────────┘
```

---

## 📑 DOCUMENTI PER SETTORE

### 🗄️ Data Layer (Backend)

| File | Ruolo AI | Responsabilità | 📁 Codice Correlato |
|------|----------|----------------|---------------------|
| [FILOSOFIA_TEMPORAL.md](10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) | Time Architect | Time semantics, anti-leakage, as-of snapshots | [`backend/liveManager.js`](../../backend/liveManager.js), [`backend/services/matchCardService.js`](../../backend/services/matchCardService.js) |
| [FILOSOFIA_REGISTRY_CANON.md](10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md) | Data Architect | Canonical IDs, entity resolution, dedup | [`backend/services/dataNormalizer.js`](../../backend/services/dataNormalizer.js), [`backend/db/matchRepository.js`](../../backend/db/matchRepository.js) |
| [FILOSOFIA_LINEAGE_VERSIONING.md](10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) | Audit Architect | Versioning, lineage, reproducibility | [`backend/services/matchCardService.js`](../../backend/services/matchCardService.js), [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) |
| [FILOSOFIA_DB.md](10_data_platform/storage/FILOSOFIA_DB.md) | DBA / Data Engineer | Schema, pipeline, MatchBundle snapshot | [`backend/db/`](../../backend/db/), [`backend/importXlsx.js`](../../backend/importXlsx.js), [`backend/services/matchCardService.js`](../../backend/services/matchCardService.js) |
| [FILOSOFIA_LIVE_TRACKING.md](20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md) | Real-time Engineer | Polling, WS, patch incrementali | [`backend/liveManager.js`](../../backend/liveManager.js), [`backend/db/liveTrackingRepository.js`](../../backend/db/liveTrackingRepository.js) |
| [FILOSOFIA_ODDS.md](30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md) | Quant / Market Engineer | Market data, implied prob, liquidity | [`backend/server.js`](../../backend/server.js) (endpoints `/api/match/:id/odds`) |

### 🧮 Logic Layer (Processing)

| File | Ruolo AI | Responsabilità | 📁 Codice Correlato |
|------|----------|----------------|---------------------|
| [FILOSOFIA_STATS.md](40_analytics_features_models/stats/FILOSOFIA_STATS.md) | Data Analyst / Feature Engineer | Features, Strategy Engine, Signals | [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js), [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js) |
| [FILOSOFIA_CALCOLI.md](40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md) | Feature Library | Tassonomia calcoli, standard, ownership | [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js), [`backend/utils/pressureCalculator.js`](../../backend/utils/pressureCalculator.js) |
| [FILOSOFIA_RISK_BANKROLL.md](50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) | Risk Manager / Quant | Edge, staking, bankroll, bet decisions | [`backend/services/riskEngine.js`](../../backend/services/riskEngine.js), [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js) |
| [FILOSOFIA_OBSERVABILITY_DATAQUALITY.md](10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Data Quality Engineer | Monitoring, quarantine, alerts | [`backend/services/dataQualityChecker.js`](../../backend/services/dataQualityChecker.js), [`backend/utils/logger.js`](../../backend/utils/logger.js) |
| [HPI_RESILIENCE.md](../specs/HPI_RESILIENCE.md) | Feature Specialist | HPI, Break Resilience, Pressure | [`backend/utils/pressureCalculator.js`](../../backend/utils/pressureCalculator.js), [`backend/utils/breakDetector.js`](../../backend/utils/breakDetector.js) |

### 📋 Specifications (docs/specs/)

| File | Tipo | Scopo | 📁 Codice Correlato |
|------|------|-------|---------------------|
| [HPI_RESILIENCE.md](../specs/HPI_RESILIENCE.md) | Feature Spec | Indicatori pressione e resilienza | [`backend/utils/pressureCalculator.js`](../../backend/utils/pressureCalculator.js) |
| [SPEC_FRONTEND_MOTION_UI.md](../specs/SPEC_FRONTEND_MOTION_UI.md) | UI Spec | Animazioni e motion design | [`src/motion/`](../../src/motion/) |
| [SPEC_VALUE_SVG.md](../specs/SPEC_VALUE_SVG.md) | Visual Spec | SVG e visualizzazioni | [`backend/utils/svgMomentumExtractor.js`](../../backend/utils/svgMomentumExtractor.js) |

### 🖥️ Presentation Layer (Frontend)

| File | Ruolo AI | Responsabilità | 📁 Codice Correlato |
|------|----------|----------------|---------------------|
| [FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md](70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) | FE Data Consumer | Hook, cache, error handling | [`src/hooks/useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx), [`src/hooks/useLiveMatch.jsx`](../../src/hooks/useLiveMatch.jsx) |
| [FILOSOFIA_FRONTEND.md](70_frontend/ui/FILOSOFIA_FRONTEND.md) | Frontend Engineer | UI, UX, visual design | [`src/components/`](../../src/components/) |

### 📦 Componenti Frontend Principali

| Componente | File | Bundle Data | Funzioni Key |
|------------|------|-------------|--------------|
| **OverviewTab** | [`src/components/match/tabs/OverviewTab.jsx`](../../src/components/match/tabs/OverviewTab.jsx) | header, tabs.overview, tabs.strategies | QuickSignals, MiniMomentum, StrategyMiniPanel |
| **StatsTab** | [`src/components/match/tabs/StatsTab.jsx`](../../src/components/match/tabs/StatsTab.jsx) | tabs.stats | Statistiche partita |
| **MomentumTab** | [`src/components/match/tabs/MomentumTab.jsx`](../../src/components/match/tabs/MomentumTab.jsx) | tabs.momentum | Grafico momentum |
| **StrategiesTab** | [`src/components/match/tabs/StrategiesTab.jsx`](../../src/components/match/tabs/StrategiesTab.jsx) | tabs.strategies | Panel strategie completo |
| **OddsTab** | [`src/components/match/tabs/OddsTab.jsx`](../../src/components/match/tabs/OddsTab.jsx) | tabs.odds | Quote mercato |
| **PredictorTab** | [`src/components/match/tabs/PredictorTab.jsx`](../../src/components/match/tabs/PredictorTab.jsx) | tabs.predictor | Predizioni |
| **PointByPointTab** | [`src/components/match/tabs/PointByPointTab.jsx`](../../src/components/match/tabs/PointByPointTab.jsx) | tabs.pointByPoint | Punto per punto |
| **JournalTab** | [`src/components/match/tabs/JournalTab.jsx`](../../src/components/match/tabs/JournalTab.jsx) | tabs.journal | Journal trading |
| **useMatchBundle** | [`src/hooks/useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx) | Fetch + WebSocket per tutti i tab | `useMatchBundle()`, `useTabData()`, `useHeaderData()` |

### ⚡ Feature Engine (Backend) – Riferimento Completo

| File | Funzione | Linea | Input → Output |
|------|----------|-------|----------------|
| [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) | `computeFeatures()` | L331 | matchData → features complete |

**Funzioni Primarie** (dati completi):
| Funzione | Linea | Input | Output |
|----------|-------|-------|--------|
| `calculateVolatility()` | L44 | powerRankings | volatility % |
| `calculateDominance()` | L92 | powerRankings | dominance % |
| `calculateServeDominance()` | L126 | statistics | serveDominance % |
| `calculateBreakProbability()` | L191 | statistics | breakProb % |
| `calculateRecentMomentum()` | L277 | powerRankings | momentum trend |

**Funzioni Fallback** (dati parziali):
| Funzione | Linea | Input | Output |
|----------|-------|-------|--------|
| `calculateVolatilityFromScore()` | L476 | score.sets[] | volatility % |
| `calculateDominanceFromScore()` | L507 | score.sets[] | dominance % |
| `calculateDominanceFromOdds()` | L540 | odds.matchWinner | dominance % |
| `calculateServeDominanceFromRankings()` | L573 | player.ranking | serveDominance % |
| `calculateBreakProbabilityFromOddsRankings()` | L598 | odds + rankings | breakProb % |
| `calculatePressureFromScore()` | L643 | score.sets[] | pressure index |
| `calculateMomentumFromScore()` | L674 | score.sets[] | momentum trend |

### 🎯 Strategy Engine (Backend) – Riferimento Completo

| File | Funzione | Linea | Strategia |
|------|----------|-------|-----------|
| [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js) | `evaluateAll()` | L39 | Entry point |
| | `evaluateLayWinner()` | L63 | Lay the Winner |
| | `evaluateBancaServizio()` | L148 | Banca Servizio |
| | `evaluateSuperBreak()` | L222 | Super Break |
| | `evaluateTiebreakSpecialist()` | L307 | Tiebreak Specialist |
| | `evaluateMomentumSwing()` | L378 | Momentum Swing |
| | `getSummary()` | L443 | Riassunto segnali |

### 🛡️ Governance Layer

| File | Ruolo AI | Responsabilità | 📁 Codice Correlato |
|------|----------|----------------|---------------------|
| [FILOSOFIA_CONCEPT_CHECKS.md](00_foundation/FILOSOFIA_CONCEPT_CHECKS.md) | Architecture Guardrail | Invarianti, validazione, CI | [`scripts/runConceptChecks.js`](../../scripts/runConceptChecks.js), [`scripts/checkConceptualMap.js`](../../scripts/checkConceptualMap.js) |

---

## 🧪 CI GUARDRAILS – Sistema Immunitario Architetturale

> **Principio**: L'architettura è codice verificabile.

Il progetto ha **due livelli di CI**, complementari e separati:

### 1️⃣ CI di Integrità Concettuale
**Script**: [`scripts/checkConceptualMap.js`](../../scripts/checkConceptualMap.js)

**Cosa verifica**:
- ✅ Esistenza file documentati (filosofie, services, components)
- ✅ Linee di codice delle funzioni chiave
- ✅ Tabelle DB nelle migrations
- ✅ Struttura cartelle filosofie
- ✅ Violazioni architetturali MatchBundle-centric

**Output**: 
- `docs/checks/CHECK_MAPPA_CONCETTUALE.md`
- Sezione auto-aggiornata in `docs/TODO_LIST.md`

**Filosofia**: *"Se lo dichiari, deve esistere"*

```bash
node scripts/checkConceptualMap.js
```

### 2️⃣ CI di Disciplina Architetturale
**Script**: [`scripts/runConceptChecks.js`](../../scripts/runConceptChecks.js)

**Cosa verifica**:
- ✅ Inferenza dominio per file
- ✅ Import/pattern vietati
- ✅ Invarianti definiti in `rules.v2.json`
- ✅ Allowlist + annotation override

**Output**:
- `docs/checks/report.md`
- `docs/checks/report.json`
- Sezione auto-aggiornata in `docs/TODO_LIST.md`

**Filosofia**: *"Questo codice NON dovrebbe stare qui"*

```bash
node scripts/runConceptChecks.js [--mode full|diff]
```

### 🔄 Report Unificato
**Script**: [`scripts/generateTodoReport.js`](../../scripts/generateTodoReport.js)

Esegue entrambi i CI e genera un report consolidato:

```bash
node scripts/generateTodoReport.js
```

### ⚠️ Regole Non Negoziabili

| ID | Regola | Livello |
|----|--------|---------|
| `BUNDLE_ENDPOINT` | Endpoint /api/match/:id/bundle deve esistere | ERROR |
| `USE_MATCH_BUNDLE_HOOK` | Hook useMatchBundle.jsx obbligatorio | ERROR |
| `STRATEGY_ENGINE_IMPLEMENTED` | evaluateAll() in strategyEngine.js | ERROR |
| `FEATURE_ENGINE_IMPLEMENTED` | computeFeatures() in featureEngine.js | ERROR |
| `PHILOSOPHY_FOLDER_STRUCTURE` | Filosofie nella cartella corretta | ERROR |
| `STRATEGY_IN_FRONTEND` | No strategie nel frontend | WARN (migrazione) |
| `DATA_COMPLETENESS_FRONTEND` | No DataCompleteness nel frontend | WARN (migrazione) |

---

## 🗄️ DATABASE – Tabelle e Repository

### Schema Database Supabase

| Tabella | Tipo | Repository | Descrizione |
|---------|------|------------|-------------|
| `matches` | Legacy | [`matchRepository.js`](../../backend/db/matchRepository.js) | ~2600 match XLSX (winner_name, loser_name) |
| `matches_new` | Nuovo | [`matchRepository.js`](../../backend/db/matchRepository.js) | Match SofaScore (home_player_id, away_player_id) |
| `match_card_snapshot` | Cache | [`matchCardService.js`](../../backend/services/matchCardService.js) | Cache pre-calcolata bundle |
| `match_statistics_new` | Detail | [`matchRepository.js`](../../backend/db/matchRepository.js) | Statistiche match |
| `match_power_rankings_new` | Detail | [`matchRepository.js`](../../backend/db/matchRepository.js) | Momentum per game |
| `match_odds_new` | Detail | [`matchRepository.js`](../../backend/db/matchRepository.js) | Odds storiche |
| `players` | Lookup | [`playerService.js`](../../backend/services/playerService.js) | Dati giocatori |
| `tournaments` | Lookup | - | Dati tornei |

### 📁 File Repository

| File | Funzioni Principali |
|------|---------------------|
| [`backend/db/supabase.js`](../../backend/db/supabase.js) | Client Supabase |
| [`backend/db/matchRepository.js`](../../backend/db/matchRepository.js) | `getMatchById()`, `saveMatch()`, `getStatistics()` |
| [`backend/db/liveTrackingRepository.js`](../../backend/db/liveTrackingRepository.js) | `saveLiveSnapshot()`, `getLiveHistory()` |

---

## 🔄 FLUSSO DATI CANONICO

```
1. FONTI (SofaScore, XLSX, Market APIs)
        │  📁 backend/scraper/sofascoreScraper.js
        │  📁 backend/importXlsx.js
        ▼
2. RAW EVENTS ────────────────────────► REGISTRY_CANON
        │                                (normalizzazione, canonical IDs)
        │                                📁 backend/services/dataNormalizer.js
        ▼
3. CANONICAL TABLES ──────────────────► DB (persistenza)
        │                                📁 backend/db/matchRepository.js
        │  + TEMPORAL (event_time, ingestion_time)
        ▼
4. DATA RETRIEVAL (as-of query)
        │  TEMPORAL: filter by as_of_time
        │  OBSERVABILITY: data quality check
        ├──► ODDS (market features)
        ├──► LIVE (runtime updates)
        │    📁 backend/liveManager.js
        ▼
5. FEATURE ENGINE ◄─── HPI_RESILIENCE
        │  📁 backend/utils/featureEngine.js
        │  📁 backend/utils/pressureCalculator.js
        │  + LINEAGE: feature_version
        ▼
6. STRATEGY ENGINE
        │  📁 backend/strategies/strategyEngine.js
        │  + LINEAGE: strategy_version
        ▼
7. RISK ENGINE (edge, staking)
        │  📁 backend/services/riskEngine.js
        │  RISK_BANKROLL: Kelly, exposure
        ▼
8. MATCH BUNDLE SNAPSHOT
        │  📁 backend/services/matchCardService.js
        │  + LINEAGE: meta.versions, meta.as_of_time
        │  + OBSERVABILITY: meta.data_quality
        ▼
9. API / WebSocket
        │  📁 backend/server.js (GET /api/match/:id/bundle)
        ▼
10. FRONTEND HOOKS
        │  📁 src/hooks/useMatchBundle.jsx
        ▼
11. UI RENDER
           📁 src/components/match/tabs/*.jsx
```

---

## � MATCHBUNDLE META STANDARD (OBBLIGATORIO)

> **Vedi**: [FILOSOFIA_LINEAGE_VERSIONING.md](10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md)

Ogni `MatchBundle` DEVE includere un blocco `meta` standard:

```typescript
interface MatchBundleMeta {
  // Temporal (FILOSOFIA_TEMPORAL)
  generated_at: Date;        // quando il bundle è stato creato
  as_of_time: Date;          // cut temporale logico
  
  // Lineage & Versioning (FILOSOFIA_LINEAGE_VERSIONING)
  versions: {
    bundle_schema: string;   // es. "v2.1.0"
    data: string;            // es. "canonical_v2"
    features: string;        // es. "v1.2.0"
    odds: string;            // es. "v2.0.0"
    strategies: string;      // es. "v2.0.0"
  };
  
  // Observability (FILOSOFIA_OBSERVABILITY_DATAQUALITY)
  data_quality: {
    overall_score: number;   // 0-100
    completeness: object;
    staleness: object;
    outliers: object;
  };
  
  // Data Freshness (FILOSOFIA_TEMPORAL)
  data_freshness: {
    last_live_ingestion_time?: Date;
    last_odds_ingestion_time?: Date;
  };
  
  // Identity Warnings (FILOSOFIA_REGISTRY_CANON)
  identity_warnings?: {
    home_player?: { confidence: number; reason: string; };
    tournament?: { confidence: number; reason: string; };
  };
}
```

**Campi obbligatori**:
- `meta.generated_at`
- `meta.as_of_time`
- `meta.versions` (tutti i sub-campi)
- `meta.data_quality.overall_score`

**Concept Check**: `MATCHBUNDLE_META_REQUIRED`

---

## �📏 INVARIANTI ARCHITETTURALI (DA CONCEPT_CHECKS)

| ID | Regola | Violazione = |
|----|--------|--------------|
| `MATCHBUNDLE_ONLY_FE` | Frontend consuma SOLO MatchBundle | ❌ ERROR |
| `BACKEND_INTERPRETATION` | Solo backend interpreta dati | ❌ ERROR |
| `FEATURE_VS_STRATEGY` | Features ≠ Strategie | ❌ ERROR |
| `SIGNAL_NOT_METRIC` | Segnali non sono metriche persistibili | ❌ ERROR |
| `DATAQUALITY_BACKEND` | DataQuality calcolata solo backend | ❌ ERROR |

---

## 🚦 STRATEGIA → SEGNALE (CICLO COMPLETO)

```
┌─────────────────────────────────────────────────────────────┐
│                    STRATEGY LIFECYCLE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RAW DATA (DB)                                              │
│  📁 backend/db/matchRepository.js                           │
│       │                                                     │
│       ▼                                                     │
│  FEATURES (STATS + HPI)                                     │
│  📁 backend/utils/featureEngine.js                          │
│  - volatility, pressure, dominance                          │
│  - HPI, resilience, momentum                                │
│       │                                                     │
│       ▼                                                     │
│  STRATEGY ENGINE (STATS)                                    │
│  📁 backend/strategies/strategyEngine.js                    │
│  - LayWinner, BancaServizio, SuperBreak                     │
│       │                                                     │
│       ▼                                                     │
│  SIGNAL: { status: READY|WATCH|OFF, action, confidence }    │
│       │                                                     │
│       ▼                                                     │
│  MATCH BUNDLE                                               │
│  📁 backend/services/matchCardService.js                    │
│       │                                                     │
│       ▼                                                     │
│  API → FRONTEND                                             │
│  📁 backend/server.js → src/hooks/useMatchBundle.jsx        │
│       │                                                     │
│       ▼                                                     │
│  UI: Card Strategia con semaforo 🟢🟡🔴                      │
│  📁 src/components/match/tabs/StrategiesTab.jsx             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ❓ FAQ RAPIDE

### Dove calcolo la pressure?
→ Backend (STATS), usando HPI_RESILIENCE

### Dove mostro la strategia?
→ Frontend (FILOSOFIA_FRONTEND), leggendo da MatchBundle

### Posso fare fetch separati per ogni tab?
→ NO. Un solo fetch MatchBundle (FRONTEND_DATA)

### Chi decide READY/WATCH/OFF?
→ Solo Strategy Engine (STATS)

### Dove persisto i segnali?
→ NON li persisti. Sono runtime (CONCEPT_CHECKS)

---

## ✅ CHECKLIST PRE-SVILUPPO

Prima di scrivere codice, verifica:

- [ ] Ho letto FILOSOFIA_MADRE?
- [ ] So in quale settore sto lavorando?
- [ ] Conosco le dipendenze del mio settore?
- [ ] Il mio codice rispetta gli invarianti?
- [ ] Sto modificando il MatchBundle correttamente?

---

## 🔧 GUIDA ALL'ESTENSIONE DEL SISTEMA

### Aggiungere una nuova feature
1. Dichiararla in [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js)
2. Classificarla (Player / Match / Combined)
3. Documentarla in `FILOSOFIA_STATS.md`
4. Creare spec in `docs/specs/` se complessa
5. Usarla in Predictor o Strategy

### Aggiungere una nuova strategia
1. Usare solo feature esistenti
2. Implementarla in [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js)
3. Produrre `StrategySignal` con status READY/WATCH/OFF
4. Verificare Concept Checks

### Aggiungere una nuova tab frontend
1. Creare file in [`src/components/match/tabs/`](../../src/components/match/tabs/)
2. Leggere solo `MatchBundle.tabs.*`
3. Non introdurre nuovi fetch
4. Rispettare dataQuality
5. Registrare in [`src/components/match/tabs/index.js`](../../src/components/match/tabs/index.js)

---

## ⚠️ LEZIONI APPRESE (24 Dic 2025)

### "Mostrare dati" = "Calcolare dati"

Quando si crea una dashboard che mostra metriche:

```
❌ SBAGLIATO:
   <span>{features.volatility || 'N/A'}</span>     // Placeholder
   <span>{features.pressure ?? 50}</span>          // Fallback fisso

✅ CORRETTO:
   Il BACKEND calcola SEMPRE usando dati disponibili:
   - powerRankings → calcola da quello
   - statistics → calcola da quello  
   - score → calcola da quello
   - odds → calcola da quello
   - rankings → calcola da quello

   NON ESISTE "non ho dati" se il match esiste.
   Un match ha SEMPRE almeno: score, odds, rankings.
```

**Implementazione**: [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js)

Vedi [MAPPA_RETE_CONCETTUALE_V2](../checks/MAPPA_RETE_CONCETTUALE_V2.md) per dettagli completi.

---

## 📁 STRUTTURA CARTELLE DOCS

```
docs/
├── filosofie/                   # Documenti architetturali
│   ├── INDEX_FILOSOFIE.md       ← SEI QUI
│   │
│   ├── 00_foundation/           # Documenti fondamentali
│   │   ├── FILOSOFIA_MADRE_TENNIS.md           # Costituzione
│   │   └── FILOSOFIA_CONCEPT_CHECKS.md         # Guardrails
│   │
│   ├── 10_data_platform/        # Data Layer
│   │   ├── storage/
│   │   │   └── FILOSOFIA_DB.md
│   │   ├── temporal/
│   │   │   └── FILOSOFIA_TEMPORAL.md
│   │   ├── registry_canon/
│   │   │   └── FILOSOFIA_REGISTRY_CANON.md
│   │   ├── lineage_versioning/
│   │   │   └── FILOSOFIA_LINEAGE_VERSIONING.md
│   │   └── quality_observability/
│   │       └── FILOSOFIA_OBSERVABILITY_DATAQUALITY.md
│   │
│   ├── 20_domain_tennis/        # Domain Tennis
│   │   └── live_scoring/
│   │       └── FILOSOFIA_LIVE_TRACKING.md
│   │
│   ├── 30_domain_odds_markets/  # Domain Odds
│   │   └── odds_ticks_snapshots/
│   │       └── FILOSOFIA_ODDS.md
│   │
│   ├── 40_analytics_features_models/  # Analytics
│   │   ├── stats/
│   │   │   └── FILOSOFIA_STATS.md
│   │   └── calcoli/
│   │       └── FILOSOFIA_CALCOLI.md
│   │
│   ├── 50_strategy_risk_execution/    # Risk Management
│   │   └── bankroll_risk/
│   │       └── FILOSOFIA_RISK_BANKROLL.md
│   │
│   └── 70_frontend/             # Presentation Layer
│       ├── ui/
│       │   └── FILOSOFIA_FRONTEND.md
│       └── data_consumption/
│           └── FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md
│
├── specs/               # Specifiche tecniche dettagliate
│   ├── HPI_RESILIENCE.md
│   ├── SPEC_FRONTEND_MOTION_UI.md
│   └── SPEC_VALUE_SVG.md
├── checks/              # Output dei check automatici
├── concept/             # Mappe concettuali legacy
├── CHECK_MAPPA_CONCETTUALE.md
├── MAPPA_RETE_CONCETTUALE_V2.md
└── TODO_LIST.md
```

---

**Fine INDEX – Aggiornato automaticamente**
