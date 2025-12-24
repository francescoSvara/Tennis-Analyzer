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

> 📚 **[APRI INDEX COMPLETO](INDEX_FILOSOFIE.md)** – Mappa navigazione con diagrammi e FAQ

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

| Settore | File | Ruolo che la AI deve assumere |
|------|------|-------------------------------|
| **DB** | [FILOSOFIA_DB_V2.md](FILOSOFIA_DB_V2.md) | DBA / Data Engineer |
| **STATS** | [FILOSOFIA_STATS_V3.md](FILOSOFIA_STATS_V3.md) | Data Analyst / Feature Engineer |
| **LIVE** | [FILOSOFIA_LIVE_TRACKING_V2.md](FILOSOFIA_LIVE_TRACKING_V2.md) | Real-time Engineer |
| **ODDS** | [FILOSOFIA_ODDS_V2.md](FILOSOFIA_ODDS_V2.md) | Quant / Market Data Engineer |
| **FRONTEND_UI** | [FILOSOFIA_FRONTEND.md](FILOSOFIA_FRONTEND.md) | Frontend Engineer |
| **FRONTEND_DATA** | [FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md](FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md) | FE Data Consumer |
| **CONCEPT_CHECKS** | [FILOSOFIA_CONCEPT_CHECKS_V2.md](FILOSOFIA_CONCEPT_CHECKS_V2.md) | Architecture Guardrail |

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
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   DB_V2       │          │   ODDS_V2     │          │   LIVE_V2     │
│ (Data Layer)  │          │(Market Layer) │          │(Runtime Layer)│
└───────┬───────┘          └───────┬───────┘          └───────┬───────┘
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   ▼
                    ┌─────────────────────────────┐
                    │        STATS_V3             │
                    │   (Feature → Signal)        │
                    │  + HPI_RESILIENCE Features  │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │       MATCH BUNDLE          │
                    │    (Unico Output API)       │
                    └─────────────┬───────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                                                   ▼
┌───────────────────────┐                    ┌───────────────────────┐
│   FRONTEND_DATA_V2    │                    │    FRONTEND_UI        │
│ (Consumer Architecture)│◄──────────────────│  (Visual Design)      │
└───────────────────────┘                    └───────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │    CONCEPT_CHECKS_V2        │
                    │  (Guardrail su TUTTO)       │
                    └─────────────────────────────┘
```

---

## 5️⃣ Dipendenze tra documenti

| Documento | Dipende da | Produce per |
|-----------|------------|-------------|
| DB_V2 | MADRE | STATS_V3, LIVE_V2 |
| ODDS_V2 | MADRE | STATS_V3 |
| LIVE_V2 | DB_V2, MADRE | STATS_V3 |
| STATS_V3 | DB_V2, ODDS_V2, LIVE_V2, HPI | FRONTEND_DATA_V2 |
| HPI_RESILIENCE | DB_V2 | STATS_V3 |
| FRONTEND_DATA_V2 | STATS_V3, MADRE | FRONTEND_UI |
| FRONTEND_UI | FRONTEND_DATA_V2, MADRE | Utente finale |
| CONCEPT_CHECKS_V2 | TUTTI | Validazione architettura |

---

## 6️⃣ Oggetto unificante: MatchBundle

Tutti i settori convergono verso **un unico oggetto**:

```json
MatchBundle {
  header      → DB_V2 + LIVE_V2
  tabs {
    overview    → STATS_V3
    strategies  → STATS_V3 (Strategy Engine)
    odds        → ODDS_V2
    pointByPoint→ DB_V2 + LIVE_V2
    stats       → STATS_V3 + HPI_RESILIENCE
    momentum    → LIVE_V2 + STATS_V3
    predictor   → STATS_V3 + ODDS_V2
    journal     → DB_V2
  }
  dataQuality → CONCEPT_CHECKS_V2
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
