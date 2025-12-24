# 🧪 Concept Checks Report

> Generato: 2025-12-24T15:37:18.148Z  
> Modalità: full  
> Durata: 160ms

---

## 📊 Riepilogo

| Severità | Count |
|----------|-------|
| 🔴 ERROR | 20 |
| 🟡 WARN | 25 |
| 🔵 INFO | 30 |

---

## 🔍 Findings

### 🔴 ERROR (20)

#### `MATCHBUNDLE_ONLY_FE` - src/components/StrategiesPanel.jsx:411

- **Dominio:** frontend_ui
- **Problema:** Frontend consuma SOLO MatchBundle - niente fetch separati per stats/momentum/odds
- **Match:** `fetch(apiUrl(`/api/player`
- **Rimedio:** Usare /api/match/:id/bundle per ottenere tutto in un solo fetch

#### `MATCHBUNDLE_ONLY_FE` - src/components/StrategiesPanel.jsx:412

- **Dominio:** frontend_ui
- **Problema:** Frontend consuma SOLO MatchBundle - niente fetch separati per stats/momentum/odds
- **Match:** `fetch(apiUrl(`/api/player`
- **Rimedio:** Usare /api/match/:id/bundle per ottenere tutto in un solo fetch

#### `MATCHBUNDLE_ONLY_FE` - src/hooks/useMatchCard.jsx:205

- **Dominio:** frontend_hooks
- **Problema:** Frontend consuma SOLO MatchBundle - niente fetch separati per stats/momentum/odds
- **Match:** `fetch(apiUrl(`/api/player`
- **Rimedio:** Usare /api/match/:id/bundle per ottenere tutto in un solo fetch

#### `BACKEND_INTERPRETATION` - src/utils.js:404

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateVolatility`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:455

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateElasticity`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:515

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateVolatility`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:516

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateElasticity`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:592

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateVolatility`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:593

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateElasticity`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:1709

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculatePressure`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:2131

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculatePressure`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:2390

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateVolatility`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:2391

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateElasticity`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:2760

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateElasticity`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:2856

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculatePressure`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:2911

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateDataCompleteness`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `STRATEGY_OUTSIDE_ENGINE` - src/utils.js:1799

- **Dominio:** frontend_utils
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeLayTheWinner`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/utils.js:2029

- **Dominio:** frontend_utils
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeBancaServizio`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/utils.js:2224

- **Dominio:** frontend_utils
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeSuperBreak`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `DATAQUALITY_BACKEND` - src/utils.js:2911

- **Dominio:** frontend_utils
- **Problema:** DataQuality calcolata SOLO nel backend
- **Match:** `calculateDataCompleteness`
- **Rimedio:** Leggere bundle.dataQuality, non calcolare

### 🟡 WARN (25)

#### `INV-006` - src/utils.js:404

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateVolatility`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:455

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateElasticity`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:515

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateVolatility`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:516

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateElasticity`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:521

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `classifyMatchCharacter`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:592

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateVolatility`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:593

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateElasticity`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:596

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `classifyMatchCharacter`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:2390

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateVolatility`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:2391

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateElasticity`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:2398

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `classifyMatchCharacter`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:2760

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateElasticity`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `HPI_IN_FRONTEND` - src/utils.js:1989

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:1990

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateBreakResilience`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:1991

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2188

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2189

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateBreakResilience`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2464

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2465

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2466

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateBreakResilience`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2540

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2718

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateBreakResilience`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2856

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculatePressurePerformance`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2857

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2858

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateBreakResilience`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

### 🔵 INFO (30)

#### `INV-007` - backend/services/calculationQueueWorker.js:158

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:184

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:262

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:282

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:397

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:422

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:654

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/dataNormalizer.js:744

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerService.js:159

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerService.js:388

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerStatsService.js:78

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerStatsService.js:205

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerStatsService.js:438

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerStatsService.js:450

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerStatsService.js:610

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerStatsService.js:756

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/rawEventsProcessor.js:1143

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/strategyStatsService.js:473

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:458

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:462

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/home/HomePage.jsx:410

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/HomePage.jsx:68

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/HomePage.jsx:70

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/HomePage.jsx:168

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/HomePage.jsx:180

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/match/layout/RightRail.jsx:91

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/match/tabs/OddsTab.jsx:258

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/match/tabs/OddsTab.jsx:263

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/match/tabs/StrategiesTab.jsx:389

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/MatchGrid.jsx:156

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

---

*Report generato da `scripts/runConceptChecks.js`*
