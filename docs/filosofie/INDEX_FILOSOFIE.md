# 📚 INDEX FILOSOFIE – Mappa Navigazione Progetto

> **Ultimo aggiornamento**: 24 Dicembre 2025  
> **Stato**: ATTIVO – Source of Truth per navigazione documentale  
> **Integra**: `MAPPA_RETE_CONCETTUALE_V2.md`

---

## 🔗 LINK RAPIDI

| 📄 Documento | Descrizione |
|-------------|-------------|
| [🗺️ MAPPA_RETE_CONCETTUALE_V2](../MAPPA_RETE_CONCETTUALE_V2.md) | Visione architetturale unificata |
| [✅ CHECK_MAPPA_CONCETTUALE](../CHECK_MAPPA_CONCETTUALE.md) | Risultati verifica automatica |
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
| [**FILOSOFIA_MADRE**](FILOSOFIA_MADRE_TENNIS_ROLE_DRIVEN.md) | Costituzione tecnica del progetto | SEMPRE – Prima di ogni task |

---

## 📊 MAPPA DEI SETTORI

```
                    ┌─────────────────────────────┐
                    │      FILOSOFIA_MADRE        │
                    │    (Costituzione/Ruoli)     │
                    └─────────────┬───────────────┘
                                  │
    ┌─────────────────────────────┼─────────────────────────────┐
    │                             │                             │
    ▼                             ▼                             ▼
┌───────────┐             ┌───────────┐              ┌───────────┐
│   DB_V2   │             │  ODDS_V2  │              │  LIVE_V2  │
│   (DBA)   │             │  (Quant)  │              │(RT Engin) │
└─────┬─────┘             └─────┬─────┘              └─────┬─────┘
      │                         │                         │
      │    ┌───────────┐        │                         │
      └───►│    HPI    │◄───────┘                         │
           │(Features) │                                  │
           └─────┬─────┘                                  │
                 │                                        │
                 ▼                                        │
           ┌───────────────────────────────────────┐      │
           │            STATS_V3                   │◄─────┘
           │   (Feature Engine + Strategy Engine)  │
           └─────────────────┬─────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  MATCH BUNDLE  │
                    │ (Unico Output) │
                    └────────┬───────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
    ┌──────────────────┐         ┌──────────────────┐
    │ FRONTEND_DATA_V2 │────────►│   FRONTEND_UI    │
    │  (Come consumo)  │         │  (Come mostro)   │
    └──────────────────┘         └──────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │CONCEPT_CHECKS_V2│
                    │  (Guardrails)  │
                    └────────────────┘
```

---

## 📑 DOCUMENTI PER SETTORE

### 🗄️ Data Layer (Backend)

| File | Ruolo AI | Responsabilità |
|------|----------|----------------|
| [FILOSOFIA_DB_V2.md](FILOSOFIA_DB_V2.md) | DBA / Data Engineer | Schema, pipeline, MatchBundle snapshot |
| [FILOSOFIA_LIVE_TRACKING_V2.md](FILOSOFIA_LIVE_TRACKING_V2.md) | Real-time Engineer | Polling, WS, patch incrementali |
| [FILOSOFIA_ODDS_V2.md](FILOSOFIA_ODDS_V2.md) | Quant / Market Engineer | Market data, implied prob, liquidity |

### 🧮 Logic Layer (Processing)

| File | Ruolo AI | Responsabilità |
|------|----------|----------------|
| [FILOSOFIA_STATS_V3.md](FILOSOFIA_STATS_V3.md) | Data Analyst / Feature Engineer | Features, Strategy Engine, Signals |
| [HPI_RESILIENCE.md](../specs/HPI_RESILIENCE.md) | Feature Specialist | HPI, Break Resilience, Pressure |

### 📋 Specifications (docs/specs/)

| File | Tipo | Scopo |
|------|------|-------|
| [HPI_RESILIENCE.md](../specs/HPI_RESILIENCE.md) | Feature Spec | Indicatori pressione e resilienza |
| [SPEC_FRONTEND_MOTION_UI.md](../specs/SPEC_FRONTEND_MOTION_UI.md) | UI Spec | Animazioni e motion design |
| [SPEC_VALUE_SVG.md](../specs/SPEC_VALUE_SVG.md) | Visual Spec | SVG e visualizzazioni |

### 🖥️ Presentation Layer (Frontend)

| File | Ruolo AI | Responsabilità |
|------|----------|----------------|
| [FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md](FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md) | FE Data Consumer | Hook, cache, error handling |
| [FILOSOFIA_FRONTEND.md](FILOSOFIA_FRONTEND.md) | Frontend Engineer | UI, UX, visual design |

### 📦 Componenti Frontend Principali

| Componente | File | Bundle Data |
|------------|------|-------------|
| **OverviewTab** | [`src/components/match/tabs/OverviewTab.jsx`](../../src/components/match/tabs/OverviewTab.jsx) | header, tabs.overview, tabs.strategies |
| ↳ Scoreboard | (interno) | header.players, header.score, header.match, header.odds |
| ↳ QuickSignals | (interno) | header.features (volatility, pressure, dominance, etc.) |
| ↳ StrategyMiniPanel | (interno) | tabs.strategies.signals, tabs.strategies.summary |
| ↳ MiniMomentum | (interno) | header.features.momentum (trend, recentSwing, breakCount) |
| **useMatchBundle** | [`src/hooks/useMatchBundle.jsx`](../../src/hooks/useMatchBundle.jsx) | Fetch + WebSocket per tutti i tab |

### ⚡ Feature Engine (Backend)

| File | Responsabilità |
|------|----------------|
| [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) | Calcola TUTTE le features dal MatchBundle |

**Funzioni Primarie** (dati completi):
- `calculateVolatility()` - da powerRankings
- `calculateDominance()` - da powerRankings
- `calculateServeDominance()` - da statistics
- `calculateBreakProbability()` - da statistics

**Funzioni Fallback** (dati parziali):
- `calculateVolatilityFromScore()` - da score.sets[]
- `calculateDominanceFromScore()` - da score.sets[]
- `calculateDominanceFromOdds()` - da odds.matchWinner
- `calculateServeDominanceFromRankings()` - da player.ranking
- `calculateBreakProbabilityFromOddsRankings()` - da odds + rankings
- `calculatePressureFromScore()` - da score.sets[]
- `calculateMomentumFromScore()` - da score.sets[]

### 🛡️ Governance Layer

| File | Ruolo AI | Responsabilità |
|------|----------|----------------|
| [FILOSOFIA_CONCEPT_CHECKS_V2.md](FILOSOFIA_CONCEPT_CHECKS_V2.md) | Architecture Guardrail | Invarianti, validazione, CI |

---

## 🔄 FLUSSO DATI CANONICO

```
1. FONTI (SofaScore, XLSX, Market APIs)
        │
        ▼
2. RAW EVENTS ─────────────────────────► DB_V2 (persistenza)
        │
        ▼
3. TABELLE CANONICHE
        │
        ├──► ODDS_V2 (market features)
        │
        ├──► LIVE_V2 (runtime updates)
        │
        ▼
4. FEATURE ENGINE ◄─── HPI_RESILIENCE
        │
        ▼
5. STRATEGY ENGINE ──► STATS_V3
        │
        ▼
6. MATCH BUNDLE SNAPSHOT
        │
        ▼
7. API / WebSocket ──► FRONTEND_DATA_V2
        │
        ▼
8. UI RENDER ──────────► FRONTEND_UI
```

---

## 📏 INVARIANTI ARCHITETTURALI (DA CONCEPT_CHECKS)

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
│  RAW DATA (DB_V2)                                           │
│       │                                                     │
│       ▼                                                     │
│  FEATURES (STATS_V3 + HPI)                                  │
│  - volatility, pressure, dominance                          │
│  - HPI, resilience, momentum                                │
│       │                                                     │
│       ▼                                                     │
│  STRATEGY ENGINE (STATS_V3)                                 │
│  - LayWinner, BancaServizio, SuperBreak                     │
│       │                                                     │
│       ▼                                                     │
│  SIGNAL: { status: READY|WATCH|OFF, action, confidence }    │
│       │                                                     │
│       ▼                                                     │
│  MATCH BUNDLE → API → FRONTEND                              │
│       │                                                     │
│       ▼                                                     │
│  UI: Card Strategia con semaforo 🟢🟡🔴                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ❓ FAQ RAPIDE

### Dove calcolo la pressure?
→ Backend (STATS_V3), usando HPI_RESILIENCE

### Dove mostro la strategia?
→ Frontend (FILOSOFIA_FRONTEND), leggendo da MatchBundle

### Posso fare fetch separati per ogni tab?
→ NO. Un solo fetch MatchBundle (FRONTEND_DATA_V2)

### Chi decide READY/WATCH/OFF?
→ Solo Strategy Engine (STATS_V3)

### Dove persisto i segnali?
→ NON li persisti. Sono runtime (CONCEPT_CHECKS_V2)

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
1. Dichiararla in Feature Engine
2. Classificarla (Player / Match / Combined)
3. Documentarla in `FILOSOFIA_STATS_V3.md`
4. Creare spec in `docs/specs/` se complessa
5. Usarla in Predictor o Strategy

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

Vedi [MAPPA_RETE_CONCETTUALE_V2](../MAPPA_RETE_CONCETTUALE_V2.md) per dettagli completi.

---

## 📁 STRUTTURA CARTELLE DOCS

```
docs/
├── filosofie/           # Documenti architetturali (FILOSOFIA_*.md)
│   ├── INDEX_FILOSOFIE.md   ← SEI QUI
│   ├── FILOSOFIA_MADRE_TENNIS_ROLE_DRIVEN.md
│   ├── FILOSOFIA_DB_V2.md
│   ├── FILOSOFIA_STATS_V3.md
│   ├── FILOSOFIA_LIVE_TRACKING_V2.md
│   ├── FILOSOFIA_ODDS_V2.md
│   ├── FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md
│   ├── FILOSOFIA_FRONTEND.md
│   └── FILOSOFIA_CONCEPT_CHECKS_V2.md
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
