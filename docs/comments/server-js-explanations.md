# Server.js Explanations

## calculateBreaksFromPbp

```javascript
/**
 * Calcola breakOccurred per ogni game analizzando i dati point-by-point
 * Un break avviene quando chi vince il game (scoring) è diverso da chi serve (serving)
 *
 * Convenzione SofaScore (da enrich-xlsx-matches.js):
 * - serving=1 = HOME serve
 * - serving=2 = AWAY serve
 * - scoring=1 = HOME wins
 * - scoring=2 = AWAY wins
 * - scoring=-1 = game incompleto
 *
 * BREAK = serving !== scoring (chi serve perde)
 * HOLD = serving === scoring (chi serve vince)
 *
 * @param {Array} pointByPoint - Array di set con games e points
 * @returns {Map} Mappa "set-game" -> boolean
 */
```

## generatePowerRankingsFromPbp

```javascript
/**
 * Genera powerRankings simulati dai pointByPoint se non disponibili da SofaScore
 * Usa la stessa logica di break detection di GameBlock.jsx
 *
 * Convenzione SofaScore:
 * - serving=1 = HOME serve
 * - serving=2 = AWAY serve
 * - scoring=1 = HOME wins
 * - scoring=2 = AWAY wins
 *
 * Il momentum viene calcolato come differenza running score:
 * - Home vince: +1 punto per set running
 * - Away vince: -1 punto per set running
 * - Break bonus: ±0.5 punti extra
 * Alla fine normalizzato -100..+100 in base al max/min del match
 *
 * @param {Array} pointByPoint - Array di set con games e points
 * @returns {Array} PowerRankings generati con value e breakOccurred
 */
```

## GET /api/match/:eventId/bundle

```javascript
/**
 * GET /api/match/:eventId/bundle - UNIFIED MATCH BUNDLE
 *
 * ⚠️ LEGACY: This handler is now replaced by:
 * routes/match.routes.js → controllers/match.controller.js → services/bundleService.js
 *
 * @see docs/filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md
 * @see docs/filosofie/FILOSOFIA_STATS.md
 *
 * FILOSOFIA: SofaScore → DB → Frontend (mai fetch diretto nel bundle)
 */
```
