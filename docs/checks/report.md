# 🧪 Concept Checks Report

> Generato: 2025-12-28T01:57:51.564Z  
> Modalità: full  
> Durata: 99ms

---

## 📊 Riepilogo

| Severità | Count |
| -------- | ----- |
| 🔴 ERROR | 0     |
| 🟡 WARN  | 6     |
| 🔵 INFO  | 29    |

---

## 🔍 Findings

### 🟡 WARN (6)

#### `LIN-005` - src/hooks/useMatchBundle.jsx:0

- **Dominio:** architecture
- **Problema:** useMatchBundle deve esporre meta dal bundle
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: bundle\.meta|meta:\s\*bundle

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
- **Rimedio:** Implementare: useMatchBundle|import.\*useMatchBundle

#### `ODDS-001` - backend/services/matchCardService.js:0

- **Dominio:** architecture
- **Problema:** Odds devono avere timestamp per tracciare movimento
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: odds.\*time|oddsTimestamp|odds_at

#### `LIVE-003` - backend/liveManager.js:0

- **Dominio:** architecture
- **Problema:** liveManager deve avere polling adattivo (non fisso)
- **Match:** `PATTERN_MISSING`
- **Rimedio:** Implementare: adaptivePolling|backoff|pollingInterval|FAST|SLOW|BOOST

### 🔵 INFO (29)

#### `INV-007` - backend/services/bundleService.js:177

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/bundleService.js:182

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/bundleService.js:207

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/bundleService.js:211

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/bundleService.js:236

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/bundleService.js:240

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/bundleService.js:265

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/bundleService.js:533

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

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

#### `INV-007` - backend/services/playerStatsService.js:203

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerStatsService.js:436

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerStatsService.js:448

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerStatsService.js:631

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/playerStatsService.js:753

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/rawEventsProcessor.js:1143

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/strategyStatsService.js:482

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:375

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - backend/services/unifiedImporter.js:379

- **Dominio:** backend_services
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/match/layout/RightRail.jsx:91

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

---

_Report generato da `scripts/runConceptChecks.js`_
