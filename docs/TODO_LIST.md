# 📋 TODO LIST – React Betfair Tennis

> Documento centrale per tracciare attività, problemi e sviluppi futuri.
>
> **Ultimo aggiornamento**: 22 Dicembre 2025

---

## 📑 Indice

1. [Problemi Rilevati dal Check](#-problemi-rilevati-dal-check)
2. [TODO Attivi](#-todo-attivi)
3. [In Progress](#-in-progress)
4. [Completati](#-completati)
5. [Backlog](#-backlog)

---

## 🔍 Problemi Rilevati dal Check

> Sezione auto-popolata da `node scripts/checkConceptualMap.js`
> Ultimo check: 22 dicembre 2025

### Stato Attuale: ✅ Nessun problema

La mappa concettuale è allineata con il codice.

| Metrica | Valore |
|---------|--------|
| Check totali | 105 |
| ✅ Passati | 105 |
| ❌ Falliti | 0 |
| ⚠️ Warning | 0 |

---

## 📝 TODO Attivi

> Attività da completare. Fonte: README_IMPLEMENTATION_GUIDE.md

| # | Priorità | Task | Dominio | Note |
|---|----------|------|---------|------|
| 1 | 🔴 Alta | Hold Pressure Index (HPI) | Stats | Game tenuti sotto pressione (30-30, deuce, BP) |
| 2 | 🔴 Alta | Break Resilience Score | Stats | Capacità salvare BP + peso momentum negativo |
| 3 | 🟡 Media | Clutch Conversion Rate | Stats | % punti clutch vinti (BP, GP, SP, TB) |
| 4 | 🟡 Media | Serve Vulnerability Index | Stats | Calo servizio sotto pressione |
| 5 | 🟡 Media | Set Decay Index | Stats | Calo performance tra set consecutivi |
| 6 | 🟡 Media | Player Profile Aggregato | Backend | Profilo storico per superficie/timeframe |
| 7 | 🟡 Media | Snapshot Strategici | Backend | Salvare snapshot a momenti chiave |
| 8 | 🟢 Bassa | Live Odds Tracking | Backend | Tracciamento quote live + delta |
| 9 | 🟢 Bassa | Daily Match Evaluation Report | Backend | Report giornaliero automatico |
| 10 | 🟢 Bassa | Historical Pattern Detector | Stats | Pattern ricorrenti (1st set loss recovery, etc) |

---

## 🔄 In Progress

> Attività in corso di sviluppo.

| # | Task | Assegnato | Inizio | Note |
|---|------|-----------|--------|------|
| - | *Nessuna attività in corso* | - | - | - |

---

## ✅ Completati

> Attività completate (ultime 20).

| # | Task | Completato | Dominio |
|---|------|------------|---------|
| 1 | Sistema Check Mappa Concettuale | 22/12/2025 | Docs |
| 2 | Mappa Rete Concettuale | 22/12/2025 | Docs |
| 3 | Live Tracking System | 22/12/2025 | Backend |
| 4 | Match Card Snapshot | 22/12/2025 | Backend |
| 5 | Raw Events Pipeline | 22/12/2025 | Backend |
| 6 | Calculation Queue Worker | 22/12/2025 | Backend |
| 7 | Player Profile Aggregator | 23/12/2025 | Backend |
| 8 | Match Segmentation Engine | 22/12/2025 | Stats |
| 9 | Break Detector | 22/12/2025 | Stats |
| 10 | Pressure Index Calculator | 22/12/2025 | Stats |
| 11 | Momentum Volatility & Elasticity | 22/12/2025 | Stats |
| 12 | Dynamic Surface Thresholds | 22/12/2025 | Stats |
| 13 | Enhanced analyzePowerRankings | 22/12/2025 | Stats |
| 14 | Bug Fix Player Stats + Sofascore | 23/12/2025 | Backend |

---

## 📦 Backlog

> Idee e attività future non ancora prioritizzate.

### 🔴 Alta Priorità (Prossimi)
- [ ] Calcolo ELO per superficie
- [ ] Cache Redis per dati live
- [ ] Odds Engine (Factor Registry, probabilità FAIR)

### 🟡 Media Priorità
- [ ] Previsioni ML vincitore
- [ ] Alerts match interessanti
- [ ] Import automatico XLSX (watcher)
- [ ] Normalized Point Structure (1.1)
- [ ] Overreaction Detection (quote)

### 🟢 Bassa Priorità
- [ ] Provider astratti Live (`LiveProvider`)
- [ ] API esterne (API-Tennis, Sportradar)
- [ ] Redis Streams / Kafka

### 📚 Documentazione
- [ ] FILOSOFIA_ODDS.md
- [ ] FILOSOFIA_AI.md
- [ ] FILOSOFIA_STRATEGIES.md
- [ ] FILOSOFIA_OBSERVABILITY.md

---

## 📌 Come Usare

### Aggiungere un TODO
```markdown
| # | Priorità | Task | Dominio | Note |
|---|----------|------|---------|------|
| 1 | 🔴 Alta | Descrizione task | Backend | Note aggiuntive |
```

### Priorità
- 🔴 **Alta**: Blocca sviluppo o critico
- 🟡 **Media**: Importante ma non urgente
- 🟢 **Bassa**: Nice to have

### Domini
- `Backend` - Server, API, DB
- `Frontend` - UI, Components, Hooks
- `Stats` - Calcoli, Metriche
- `Live` - Tracking, WebSocket
- `Docs` - Documentazione
- `DevOps` - Deploy, CI/CD

---

*Documento gestito manualmente + auto-update sezione Check*

## 🏗️ Problemi Architetturali (Auto-generato)

> Ultimo check: 2025-12-22
> Esegui: `node scripts/runConceptChecks.js`

### 🔴 Errori (1)

- [ ] **INV-002** - `src/hooks/useMatchData.jsx:124` - Frontend non deve fare scraping diretto

### 🟡 Warning (36)

- [ ] **INV-010** - `backend/services/rawEventsProcessor.js:1113` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/services/unifiedImporter.js:450` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/services/unifiedImporter.js:486` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:19` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:20` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:21` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:22` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:36` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:37` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:90` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:93` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:96` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:126` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:129` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:132` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:162` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:165` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:168` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:211` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:214` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:217` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:226` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:616` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:19` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:20` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:21` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:281` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:282` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:317` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:372` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:375` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:452` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:453` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:488` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:565` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:569` - Magic numbers in calcoli


## 🏗️ Problemi Architetturali (Auto-generato)

> Ultimo check: 2025-12-22
> Esegui: `node scripts/runConceptChecks.js`

### 🔴 Errori (1)

- [ ] **INV-002** - `src/hooks/useMatchData.jsx:124` - Frontend non deve fare scraping diretto

### 🟡 Warning (36)

- [ ] **INV-010** - `backend/services/rawEventsProcessor.js:1113` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/services/unifiedImporter.js:450` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/services/unifiedImporter.js:486` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:19` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:20` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:21` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:22` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:36` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:37` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:90` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:93` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:96` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:126` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:129` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:132` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:162` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:165` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:168` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:211` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:214` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:217` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:226` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/pressureCalculator.js:616` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:19` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:20` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:21` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:281` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:282` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:317` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:372` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:375` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:452` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:453` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:488` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:565` - Magic numbers in calcoli
- [ ] **INV-010** - `backend/utils/valueInterpreter.js:569` - Magic numbers in calcoli

