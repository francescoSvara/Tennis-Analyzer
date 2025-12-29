# Match Card Service Explanations

## Header

```javascript
/**
 * Match Card Service
 *
 * Assembla i dati per le card match da multiple fonti:
 * - Dati base match (matches_new)
 * - Dati giocatori (players_new + stats)
 * - Statistiche match (match_statistics_new)
 * - Momentum (match_power_rankings_new)
 * - Point by Point
 * - Odds
 * - H2H
 *
 * NOTA: Per performance ottimali, usare prima getMatchCardFromSnapshot()
 * che legge dalla tabella match_card_snapshot (single query).
 * Il metodo getMatchCard() originale è mantenuto come fallback.
 *
 * FILOSOFIA_TEMPORAL compliance: includes meta.as_of_time (generated_at) in bundle
 * FILOSOFIA_LINEAGE_VERSIONING compliance: includes meta.versions (feature_version, strategy_version)
 * FILOSOFIA_RISK_BANKROLL compliance: integrates risk/edge/stake data when available
 */
```
