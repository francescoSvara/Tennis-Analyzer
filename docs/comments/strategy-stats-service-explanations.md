# Strategy Stats Service Explanations

## Header

```javascript
/**
 * Strategy Stats Service
 * Calcola statistiche storiche per le strategie di trading
 *
 * Tipo: DERIVED (calcolato da dati puri)
 * Livello: PLAYER + MATCH (aggregato)
 * Persistenza: SÌ (può essere cachato)
 *
 * Metriche calcolate:
 * - Lay the Winner: % successo quando il perdente del 1° set vince il match
 * - Banca Servizio: % break avvenuti (chi serve perde il game)
 * - Super Break: % match dove favorito (ranking) vince
 *
 * Riferimento: docs/filosofie/FILOSOFIA_STATS_V2.md
 */
```
