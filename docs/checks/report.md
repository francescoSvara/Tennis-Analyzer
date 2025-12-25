# 🧪 Concept Checks Report

> Generato: 2025-12-25T09:32:28.475Z  
> Modalità: full  
> Durata: 177ms

---

## 📊 Riepilogo

| Severità | Count |
|----------|-------|
| 🔴 ERROR | 12 |
| 🟡 WARN | 10 |
| 🔵 INFO | 30 |

---

## 🔍 Findings

### 🔴 ERROR (12)

#### `LIN-001` - backend/utils/featureEngine.js:0

- **Dominio:** architecture
- **Problema:** featureEngine.js deve esportare FEATURE_ENGINE_VERSION
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: (FEATURE_ENGINE_VERSION|VERSION)\s*[=:]\s*['"]v

#### `LIN-002` - backend/strategies/strategyEngine.js:0

- **Dominio:** architecture
- **Problema:** strategyEngine.js deve esportare STRATEGY_ENGINE_VERSION
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: (STRATEGY_ENGINE_VERSION|VERSION)\s*[=:]\s*['"]v

#### `LIN-003` - backend/server.js:0

- **Dominio:** architecture
- **Problema:** Bundle endpoint deve avere meta.versions con bundle_schema, features, strategies
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: meta:\s*\{[^}]*versions:\s*\{[^}]*(bundle_schema|features|strategies)

#### `REG-001` - data/mappings/players.json:0

- **Dominio:** architecture
- **Problema:** Registry Canon: mappings/players.json deve esistere per normalizzazione nomi
- **Match:** `FILE_MISSING`
- **Rimedio:** Creare il file data/mappings/players.json

#### `DB-002` - backend/db/matchRepository.js:0

- **Dominio:** architecture
- **Problema:** matchRepository deve esportare getMatchBundle
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: getMatchBundle|getBundle|fetchBundle

#### `RISK-002` - backend/services/riskEngine.js:0

- **Dominio:** architecture
- **Problema:** File non trovato: backend/services/riskEngine.js
- **Match:** `FILE_MISSING`
- **Rimedio:** Verificare esistenza di backend/services/riskEngine.js

#### `RISK-003` - backend/services/riskEngine.js:0

- **Dominio:** architecture
- **Problema:** File non trovato: backend/services/riskEngine.js
- **Match:** `FILE_MISSING`
- **Rimedio:** Verificare esistenza di backend/services/riskEngine.js

#### `RISK-004` - backend/services/riskEngine.js:0

- **Dominio:** architecture
- **Problema:** File non trovato: backend/services/riskEngine.js
- **Match:** `FILE_MISSING`
- **Rimedio:** Verificare esistenza di backend/services/riskEngine.js

#### `FE-DEEP-001` - backend/utils/pressureCalculator.js:0

- **Dominio:** architecture
- **Problema:** pressureCalculator deve esportare getHoldDifficulty()
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: getHoldDifficulty|module\.exports[^}]*getHoldDifficulty

#### `FE-DEEP-002` - backend/utils/breakDetector.js:0

- **Dominio:** architecture
- **Problema:** breakDetector deve esportare calculateBreaksFromPbp()
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: calculateBreaksFromPbp|module\.exports[^}]*calculateBreaksFromPbp

#### `FE-DEEP-003` - backend/liveManager.js:0

- **Dominio:** architecture
- **Problema:** liveManager deve esportare fetchLiveList()
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: fetchLiveList|module\.exports[^}]*fetchLiveList

#### `FE-DEEP-005` - backend/scraper/sofascoreScraper.js:0

- **Dominio:** architecture
- **Problema:** sofascoreScraper deve esportare getPointByPoint()
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: getPointByPoint|module\.exports[^}]*getPointByPoint

### 🟡 WARN (10)

#### `LIN-004` - backend/services/matchCardService.js:0

- **Dominio:** architecture
- **Problema:** matchCardService deve includere meta nel bundle salvato
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: meta:\s*\{|meta\.versions|versions:\s*\{

#### `LIN-005` - src/hooks/useMatchBundle.jsx:0

- **Dominio:** architecture
- **Problema:** useMatchBundle deve esporre meta dal bundle
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: bundle\.meta|meta:\s*bundle

#### `TEMP-001` - backend/db/matchRepository.js:0

- **Dominio:** architecture
- **Problema:** Repository deve avere event_time per ogni entità temporale
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: event_time|eventTime

#### `TEMP-002` - backend/db/liveTrackingRepository.js:0

- **Dominio:** architecture
- **Problema:** Live tracking deve usare snapshotTime per i dati live
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: snapshot_time|snapshotTime|event_time

#### `FE-002` - src/components/MatchCard.jsx:0

- **Dominio:** architecture
- **Problema:** Frontend deve usare useMemo per rendering pesanti
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: useMemo|useCallback

#### `FE-003` - src/App.jsx:0

- **Dominio:** architecture
- **Problema:** App.jsx deve importare useMatchBundle
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: useMatchBundle|import.*useMatchBundle

#### `ODDS-001` - backend/services/matchCardService.js:0

- **Dominio:** architecture
- **Problema:** Odds devono avere timestamp per tracciare movimento
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: odds.*time|oddsTimestamp|odds_at

#### `LIVE-003` - backend/liveManager.js:0

- **Dominio:** architecture
- **Problema:** liveManager deve avere polling adattivo (non fisso)
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: adaptivePolling|backoff|pollingInterval|FAST|SLOW|BOOST

#### `RISK-001` - backend/services/riskEngine.js:0

- **Dominio:** architecture
- **Problema:** riskEngine deve esistere per decisioni betting
- **Match:** `FILE_MISSING`
- **Rimedio:** Creare il file backend/services/riskEngine.js

#### `RISK-005` - backend/services/riskEngine.js:0

- **Dominio:** architecture
- **Problema:** File non trovato: backend/services/riskEngine.js
- **Match:** `FILE_MISSING`
- **Rimedio:** Verificare esistenza di backend/services/riskEngine.js

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
