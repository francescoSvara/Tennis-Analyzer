# 🧪 Concept Checks Report

> Generato: 2025-12-23T23:16:44.484Z  
> Modalità: full  
> Durata: 73ms

---

## 📊 Riepilogo

| Severità | Count |
|----------|-------|
| 🔴 ERROR | 42 |
| 🟡 WARN | 23 |
| 🔵 INFO | 72 |

---

## 🔍 Findings

### 🔴 ERROR (42)

#### `BACKEND_INTERPRETATION` - src/components/MomentumTab.jsx:35

- **Dominio:** frontend_ui
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateVolatility`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/components/MomentumTab.jsx:76

- **Dominio:** frontend_ui
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateElasticity`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/components/MomentumTab.jsx:314

- **Dominio:** frontend_ui
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateVolatility`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/components/MomentumTab.jsx:315

- **Dominio:** frontend_ui
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateElasticity`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `MATCHBUNDLE_ONLY_FE` - src/components/PredictorTab.jsx:316

- **Dominio:** frontend_ui
- **Problema:** Frontend consuma SOLO MatchBundle - niente fetch separati per stats/momentum/odds
- **Match:** `fetch(apiUrl(`/api/player`
- **Rimedio:** Usare /api/match/:id/bundle per ottenere tutto in un solo fetch

#### `MATCHBUNDLE_ONLY_FE` - src/components/QuotesTab.jsx:108

- **Dominio:** frontend_ui
- **Problema:** Frontend consuma SOLO MatchBundle - niente fetch separati per stats/momentum/odds
- **Match:** `fetch(apiUrl(`/api/player`
- **Rimedio:** Usare /api/match/:id/bundle per ottenere tutto in un solo fetch

#### `STRATEGY_OUTSIDE_ENGINE` - src/components/StrategiesLivePanel.jsx:22

- **Dominio:** frontend_ui
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeLayTheWinner`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/components/StrategiesLivePanel.jsx:23

- **Dominio:** frontend_ui
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeBancaServizio`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/components/StrategiesLivePanel.jsx:24

- **Dominio:** frontend_ui
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeSuperBreak`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/components/StrategiesLivePanel.jsx:411

- **Dominio:** frontend_ui
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeLayTheWinner`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/components/StrategiesLivePanel.jsx:412

- **Dominio:** frontend_ui
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeBancaServizio`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/components/StrategiesLivePanel.jsx:413

- **Dominio:** frontend_ui
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeSuperBreak`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `MATCHBUNDLE_ONLY_FE` - src/components/StrategiesPanel.jsx:378

- **Dominio:** frontend_ui
- **Problema:** Frontend consuma SOLO MatchBundle - niente fetch separati per stats/momentum/odds
- **Match:** `fetch(apiUrl(`/api/player`
- **Rimedio:** Usare /api/match/:id/bundle per ottenere tutto in un solo fetch

#### `MATCHBUNDLE_ONLY_FE` - src/components/StrategiesPanel.jsx:379

- **Dominio:** frontend_ui
- **Problema:** Frontend consuma SOLO MatchBundle - niente fetch separati per stats/momentum/odds
- **Match:** `fetch(apiUrl(`/api/player`
- **Rimedio:** Usare /api/match/:id/bundle per ottenere tutto in un solo fetch

#### `STRATEGY_OUTSIDE_ENGINE` - src/components/StrategiesPanel.jsx:34

- **Dominio:** frontend_ui
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeLayTheWinner`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/components/StrategiesPanel.jsx:35

- **Dominio:** frontend_ui
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeBancaServizio`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/components/StrategiesPanel.jsx:36

- **Dominio:** frontend_ui
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeSuperBreak`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/components/StrategiesPanel.jsx:404

- **Dominio:** frontend_ui
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeLayTheWinner`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/components/StrategiesPanel.jsx:405

- **Dominio:** frontend_ui
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeBancaServizio`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/components/StrategiesPanel.jsx:406

- **Dominio:** frontend_ui
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeSuperBreak`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `MATCHBUNDLE_ONLY_FE` - src/hooks/useMatchCard.jsx:205

- **Dominio:** frontend_hooks
- **Problema:** Frontend consuma SOLO MatchBundle - niente fetch separati per stats/momentum/odds
- **Match:** `fetch(apiUrl(`/api/player`
- **Rimedio:** Usare /api/match/:id/bundle per ottenere tutto in un solo fetch

#### `BACKEND_INTERPRETATION` - src/utils.js:395

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateVolatility`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:427

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateElasticity`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:537

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateVolatility`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:538

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateElasticity`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:1654

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculatePressure`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:2076

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculatePressure`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:2335

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateVolatility`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:2336

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateElasticity`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:2705

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateElasticity`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:2801

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculatePressure`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `BACKEND_INTERPRETATION` - src/utils.js:2856

- **Dominio:** frontend_utils
- **Problema:** Solo il backend interpreta i dati - niente calcoli dominio nel frontend
- **Match:** `calculateDataCompleteness`
- **Rimedio:** Spostare calcoli in backend/utils/ o backend/services/

#### `STRATEGY_OUTSIDE_ENGINE` - src/utils.js:1744

- **Dominio:** frontend_utils
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeLayTheWinner`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/utils.js:1974

- **Dominio:** frontend_utils
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeBancaServizio`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `STRATEGY_OUTSIDE_ENGINE` - src/utils.js:2169

- **Dominio:** frontend_utils
- **Problema:** Le strategie devono vivere SOLO nello Strategy Engine backend
- **Match:** `analyzeSuperBreak`
- **Rimedio:** Spostare in backend/strategies/strategyEngine.js

#### `DATAQUALITY_BACKEND` - src/utils.js:2856

- **Dominio:** frontend_utils
- **Problema:** DataQuality calcolata SOLO nel backend
- **Match:** `calculateDataCompleteness`
- **Rimedio:** Leggere bundle.dataQuality, non calcolare

#### `BUNDLE_ENDPOINT_EXISTS` - backend/server.js:0

- **Dominio:** architecture
- **Problema:** Endpoint /api/match/:matchId/bundle deve esistere
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: app\.(get|post).*\/api\/match\/:.*\/bundle

#### `STRATEGY_ENGINE_IMPLEMENTED` - backend/strategies/strategyEngine.js:39

- **Dominio:** architecture
- **Problema:** Strategy Engine deve avere implementazione reale (non solo TODO)
- **Match:** `TODO: Implementare`
- **Rimedio:** Rimuovere/implementare: TODO.*Implementare

#### `STRATEGY_ENGINE_IMPLEMENTED` - backend/strategies/strategyEngine.js:53

- **Dominio:** architecture
- **Problema:** Strategy Engine deve avere implementazione reale (non solo TODO)
- **Match:** `TODO: Implementare`
- **Rimedio:** Rimuovere/implementare: TODO.*Implementare

#### `STRATEGY_ENGINE_IMPLEMENTED` - backend/strategies/strategyEngine.js:73

- **Dominio:** architecture
- **Problema:** Strategy Engine deve avere implementazione reale (non solo TODO)
- **Match:** `TODO: Implementare`
- **Rimedio:** Rimuovere/implementare: TODO.*Implementare

#### `STRATEGY_ENGINE_IMPLEMENTED` - backend/strategies/strategyEngine.js:93

- **Dominio:** architecture
- **Problema:** Strategy Engine deve avere implementazione reale (non solo TODO)
- **Match:** `TODO: Implementare`
- **Rimedio:** Rimuovere/implementare: TODO.*Implementare

#### `USE_MATCH_BUNDLE_HOOK` - src/hooks/useMatchBundle.jsx:0

- **Dominio:** architecture
- **Problema:** Hook useMatchBundle deve esistere
- **Match:** `FILE_MISSING`
- **Rimedio:** Creare il file src/hooks/useMatchBundle.jsx

### 🟡 WARN (23)

#### `INV-006` - src/utils.js:395

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateVolatility`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:427

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateElasticity`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:472

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `classifyMatchCharacter`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:537

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateVolatility`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:538

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateElasticity`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:541

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `classifyMatchCharacter`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:2335

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateVolatility`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:2336

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateElasticity`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:2343

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `classifyMatchCharacter`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `INV-006` - src/utils.js:2705

- **Dominio:** frontend_utils
- **Problema:** Feature Engine duplicato - stesse funzioni frontend/backend
- **Match:** `calculateElasticity`
- **Rimedio:** Rimuovere duplicato frontend, usare valore da MatchBundle

#### `HPI_IN_FRONTEND` - src/utils.js:1934

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:1935

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateBreakResilience`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:1936

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2133

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2134

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateBreakResilience`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2409

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2410

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2411

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateBreakResilience`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2485

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2663

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateBreakResilience`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2801

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculatePressurePerformance`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2802

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateHPI`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

#### `HPI_IN_FRONTEND` - src/utils.js:2803

- **Dominio:** frontend_utils
- **Problema:** Calcoli HPI/Resilience devono stare nel backend Feature Engine
- **Match:** `calculateBreakResilience`
- **Rimedio:** Spostare in backend, frontend legge da MatchBundle.tabs.stats

### 🔵 INFO (72)

#### `INV-007` - backend/services/calculationQueueWorker.js:37

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:43

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:57

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:58

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:155

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:181

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:259

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:279

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:394

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:419

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/calculationQueueWorker.js:651

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/dataNormalizer.js:741

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/matchCardService.js:41

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/matchCardService.js:47

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/matchCardService.js:158

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerProfileService.js:159

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerProfileService.js:189

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerProfileService.js:218

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerProfileService.js:300

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

#### `INV-007` - backend/services/rawEventsProcessor.js:122

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/rawEventsProcessor.js:128

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/rawEventsProcessor.js:142

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/rawEventsProcessor.js:143

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/rawEventsProcessor.js:1140

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/strategyStatsService.js:473

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:239

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:240

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:241

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:242

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:258

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:266

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:279

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:280

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:281

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:292

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:310

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:342

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:343

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:358

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:359

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:360

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:371

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:378

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:391

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:392

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:393

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:394

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:468

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:472

- **Dominio:** backend_services
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

#### `INV-007` - src/components/ManualPredictor.jsx:49

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:52

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:87

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:277

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:281

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:305

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:309

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/MatchGrid.jsx:156

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/StrategiesLivePanel.jsx:409

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/StrategiesLivePanel.jsx:415

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/StrategiesLivePanel.jsx:416

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/StrategiesLivePanel.jsx:417

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/StrategyHistoricalPanel.jsx:205

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

---

*Report generato da `scripts/runConceptChecks.js`*
