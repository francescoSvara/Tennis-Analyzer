# 🧭 FILOSOFIA MADRE – TENNIS PROJECT (ROLE-DRIVEN)

> **Scopo**  
Questa è la **Costituzione tecnica** del progetto Tennis.  
È il **source of truth unico** che governa:
- struttura del repository
- ruoli tecnici (programming-oriented)
- confini tra settori
- comportamento atteso della AI durante lo sviluppo

Il progetto è progettato per **crescere come un’azienda tecnologica di grandi dimensioni**, ma con **terminologia e responsabilità da software system**, non astratte.

*Ultimo aggiornamento: 24 Dicembre 2025*

---

> 📚 **[APRI INDEX COMPLETO](../INDEX_FILOSOFIE.md)** – Mappa navigazione con diagrammi e FAQ

### 📁 File Codice Chiave (Quick Reference)
| Area | File Principale | Descrizione |
|------|-----------------|-------------|
| Feature Engine | [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) | Calcola tutte le features |
| Strategy Engine | [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js) | Valuta segnali READY/WATCH/OFF |
| Bundle Endpoint | [`backend/server.js`](../../backend/server.js) L3219-3423 | API unificata `/api/match/:id/bundle` |
| Frontend Hook | [`src/hooks/useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx) | Consumo bundle + WebSocket |
| Concept Checks | [`scripts/runConceptChecks.js`](../../scripts/runConceptChecks.js) | Validazione architettura |

---

## 1️⃣ Regole vincolanti (immutabili)

| Regola | Significato operativo |
|------|-----------------------|
| **Un documento = un ruolo tecnico** | DB ≠ Stats ≠ Live ≠ Odds ≠ UI |
| **No duplicazioni** | Una conoscenza vive in un solo posto |
| **Cross-reference minimale** | Max 1 riga di collegamento |
| **Filosofie ≠ implementazioni** | Le formule stanno nel codice |
| **Ruolo prima del task** | Ogni TODO ha un owner tecnico |
| **Vertical slice obbligatoria** | Niente feature isolate |

---

## 2️⃣ Metafora chiave (come deve “pensare” la AI)

Il progetto funziona come una **grande azienda data-driven**:

- ogni **Settore** è un reparto tecnico specializzato
- ogni reparto ha:
  - competenze
  - output tipici
  - confini rigidi
- quando una AI lavora su un file di settore,  
  **deve comportarsi come quel ruolo professionale**

👉 non come “AI generica”, ma come:
- DBA
- Data Analyst
- Live Systems Engineer
- Odds Quant
- Frontend Engineer
- Observability/SRE

---

## 3️⃣ Settori ufficiali (nomenclatura programming)

### 🏛️ Foundation (Questo livello)
| Settore | File | Ruolo AI |
|---------|------|----------|
| **MADRE** | *Questo documento* | Costituzione / Governance |
| **CONCEPT_CHECKS** | [FILOSOFIA_CONCEPT_CHECKS.md](FILOSOFIA_CONCEPT_CHECKS.md) | Architecture Guardrail |

### 🗄️ Data Platform (10_data_platform)
| Settore | File | Ruolo AI |
|---------|------|----------|
| **DB** | [FILOSOFIA_DB.md](../10_data_platform/storage/FILOSOFIA_DB.md) | DBA / Data Engineer |
| **TEMPORAL** | [FILOSOFIA_TEMPORAL.md](../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) | Time Architect |
| **REGISTRY_CANON** | [FILOSOFIA_REGISTRY_CANON.md](../10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md) | Data Architect |
| **LINEAGE_VERSIONING** | [FILOSOFIA_LINEAGE_VERSIONING.md](../10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) | Audit Architect |
| **OBSERVABILITY** | [FILOSOFIA_OBSERVABILITY_DATAQUALITY.md](../10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Data Quality Engineer |

### 🎾 Domain Tennis (20_domain_tennis)
| Settore | File | Ruolo AI |
|---------|------|----------|
| **LIVE** | [FILOSOFIA_LIVE_TRACKING.md](../20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md) | Real-time Engineer |

### 📈 Domain Odds & Markets (30_domain_odds_markets)
| Settore | File | Ruolo AI |
|---------|------|----------|
| **ODDS** | [FILOSOFIA_ODDS.md](../30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md) | Quant / Market Data Engineer |

### 🧮 Analytics & Features (40_analytics_features_models)
| Settore | File | Ruolo AI |
|---------|------|----------|
| **STATS** | [FILOSOFIA_STATS.md](../40_analytics_features_models/stats/FILOSOFIA_STATS.md) | Data Analyst / Feature Engineer |
| **CALCOLI** | [FILOSOFIA_CALCOLI.md](../40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md) | Feature Library Owner |

### 💰 Strategy & Risk (50_strategy_risk_execution)
| Settore | File | Ruolo AI |
|---------|------|----------|
| **RISK_BANKROLL** | [FILOSOFIA_RISK_BANKROLL.md](../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) | Risk Manager / Quant |

### 🖥️ Frontend (70_frontend)
| Settore | File | Ruolo AI |
|---------|------|----------|
| **FRONTEND_UI** | [FILOSOFIA_FRONTEND.md](../70_frontend/ui/FILOSOFIA_FRONTEND.md) | Frontend Engineer |
| **FRONTEND_DATA** | [FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md](../70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) | FE Data Consumer |

### 📋 Specifications (`docs/specs/`)
| Spec | File | Scopo |
|------|------|-------|
| **HPI_RESILIENCE** | [HPI_RESILIENCE.md](../specs/HPI_RESILIENCE.md) | Feature pressione/resilienza |
| **MOTION_UI** | [SPEC_FRONTEND_MOTION_UI.md](../specs/SPEC_FRONTEND_MOTION_UI.md) | Animazioni e motion |
| **VALUE_SVG** | [SPEC_VALUE_SVG.md](../specs/SPEC_VALUE_SVG.md) | Visualizzazioni SVG |

---

## 4️⃣ Flusso dati architetturale (PIPELINE UNICA)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FILOSOFIA_MADRE (Costituzione)                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│    TEMPORAL     │        │ REGISTRY_CANON  │        │    LINEAGE      │
│ (Time Semantics)│        │  (Canonical IDs)│        │  (Versioning)   │
└────────┬────────┘        └────────┬────────┘        └────────┬────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────┐
    │                               │                           │
    ▼                               ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│      DB       │          │     ODDS      │          │     LIVE      │
│ (Data Layer)  │          │(Market Layer) │          │(Runtime Layer)│
└───────┬───────┘          └───────┬───────┘          └───────┬───────┘
        │                          │                          │
        │          ┌───────────────┴───────────────┐          │
        │          ▼                               ▼          │
        │    ┌───────────┐                 ┌───────────────┐  │
        │    │  CALCOLI  │                 │ OBSERVABILITY │  │
        │    │ (Library) │                 │(Data Quality) │  │
        │    └─────┬─────┘                 └───────┬───────┘  │
        │          │                               │          │
        └──────────┼───────────────────────────────┼──────────┘
                   │                               │
                   ▼                               │
        ┌─────────────────────────────┐            │
        │          STATS              │◄───────────┘
        │   (Feature → Signal)        │
        │  + HPI_RESILIENCE Features  │
        └─────────────┬───────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌─────────────┐ ┌───────────┐ ┌──────────────┐
│RISK_BANKROLL│ │   MATCH   │ │CONCEPT_CHECKS│
│  (Staking)  │ │  BUNDLE   │ │ (Guardrails) │
└─────────────┘ └─────┬─────┘ └──────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────────────┐  ┌───────────────────────┐
│     FRONTEND_DATA     │  │      FRONTEND_UI      │
│ (Consumer Architecture)│  │    (Visual Design)    │
└───────────────────────┘  └───────────────────────┘
```

---

## 5️⃣ Dipendenze tra documenti

| Documento | Dipende da | Produce per |
|-----------|------------|-------------|
| **TEMPORAL** | MADRE | DB, ODDS, LIVE, STATS |
| **REGISTRY_CANON** | MADRE | DB, STATS |
| **LINEAGE_VERSIONING** | MADRE | DB, STATS, OBSERVABILITY |
| **DB** | TEMPORAL, REGISTRY, MADRE | STATS, LIVE |
| **ODDS** | TEMPORAL, MADRE | STATS, RISK_BANKROLL |
| **LIVE** | DB, TEMPORAL, MADRE | STATS |
| **CALCOLI** | MADRE | STATS |
| **OBSERVABILITY** | LINEAGE, MADRE | STATS, CONCEPT_CHECKS |
| **STATS** | DB, ODDS, LIVE, CALCOLI, HPI, OBSERVABILITY | FRONTEND_DATA, RISK_BANKROLL |
| **HPI_RESILIENCE** | DB | STATS |
| **RISK_BANKROLL** | STATS, ODDS, MADRE | FRONTEND_DATA |
| **FRONTEND_DATA** | STATS, RISK_BANKROLL, MADRE | FRONTEND_UI |
| **FRONTEND_UI** | FRONTEND_DATA, MADRE | Utente finale |
| **CONCEPT_CHECKS** | TUTTI | Validazione architettura |

---

## 6️⃣ Oggetto unificante: MatchBundle

Tutti i settori convergono verso **un unico oggetto**:

```json
MatchBundle {
  _meta {
    version       → LINEAGE_VERSIONING
    timestamp     → TEMPORAL
    source_id     → REGISTRY_CANON
    dataQuality   → OBSERVABILITY + CONCEPT_CHECKS
  }
  header        → DB + LIVE
  tabs {
    overview    → STATS
    strategies  → STATS (Strategy Engine)
    odds        → ODDS
    pointByPoint→ DB + LIVE
    stats       → STATS + HPI_RESILIENCE + CALCOLI
    momentum    → LIVE + STATS
    predictor   → STATS + ODDS + RISK_BANKROLL
    journal     → DB
  }
}
```

---

## ✅ Regola finale

**Il progetto cresce per ruoli, non per file.**

**La AI deve sempre sapere:**
1. In quale settore sta lavorando
2. Da chi dipende
3. Per chi produce output
4. Cosa NON può fare
