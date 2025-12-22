# 🧪 Concept Checks Report

> Generato: 2025-12-22T18:36:06.744Z  
> Modalità: full  
> Durata: 130ms

---

## 📊 Riepilogo

| Severità | Count |
|----------|-------|
| 🔴 ERROR | 1 |
| 🟡 WARN | 36 |
| 🔵 INFO | 66 |

---

## 🔍 Findings

### 🔴 ERROR (1)

#### `INV-002` - src/hooks/useMatchData.jsx:124

- **Dominio:** frontend_hooks
- **Problema:** Frontend non deve fare scraping diretto
- **Match:** `fetch diretto da SofaScore`
- **Rimedio:** Usare endpoint /api/match/:id invece di scraping diretto

### 🟡 WARN (36)

#### `INV-010` - backend/services/rawEventsProcessor.js:1113

- **Dominio:** backend_services
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 1000`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/services/unifiedImporter.js:450

- **Dominio:** backend_services
- **Problema:** Magic numbers in calcoli
- **Match:** `/2025`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/services/unifiedImporter.js:486

- **Dominio:** backend_services
- **Problema:** Magic numbers in calcoli
- **Match:** `/2025`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:19

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 25`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:20

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 30`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:21

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 25`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:22

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 20`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:36

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 65`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:37

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 55`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:90

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `* 0.6`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:93

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `* 0.3`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:96

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `* 0.2`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:126

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `* 0.7`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:129

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `* 0.4`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:132

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `* 0.15`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:162

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `* 0.65`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:165

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `* 0.35`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:168

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `* 0.1`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:211

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `* 0.7`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:214

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `* 0.4`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:217

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `* 0.15`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:226

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 15`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/pressureCalculator.js:616

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 30`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:19

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/20`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:20

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/18`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:21

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/25`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:281

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 15`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:282

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 25`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:317

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 10`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:372

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 100`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:375

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 10`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:452

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 10`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:453

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 10`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:488

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 60`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:565

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 10`
- **Rimedio:** Estrarre costanti con nomi significativi

#### `INV-010` - backend/utils/valueInterpreter.js:569

- **Dominio:** backend_utils
- **Problema:** Magic numbers in calcoli
- **Match:** `/ 10`
- **Rimedio:** Estrarre costanti con nomi significativi

### 🔵 INFO (66)

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

#### `INV-007` - src/components/HomePage.jsx:52

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/HomePage.jsx:54

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/HomePage.jsx:185

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/HomePage.jsx:211

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:36

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:39

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:74

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:264

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:268

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:292

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/ManualPredictor.jsx:296

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

#### `INV-007` - src/components/MatchGrid.jsx:274

- **Dominio:** frontend_ui
- **Problema:** Console.log in production code
- **Match:** `console.log(`
- **Rimedio:** Usare logger strutturato o rimuovere

---

*Report generato da `scripts/runConceptChecks.js`*
