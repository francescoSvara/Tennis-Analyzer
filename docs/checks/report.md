# 🧪 Concept Checks Report

> Generato: 2025-12-25T10:40:36.810Z  
> Modalità: full  
> Durata: 161ms

---

## 📊 Riepilogo

| Severità | Count |
|----------|-------|
| 🔴 ERROR | 0 |
| 🟡 WARN | 6 |
| 🔵 INFO | 30 |

---

## 🔍 Findings

### 🟡 WARN (6)

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
