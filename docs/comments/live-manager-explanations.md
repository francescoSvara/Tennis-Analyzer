# Live Manager Explanations

## Header

```javascript
/**
 * Live Match Manager
 * Gestisce il polling intelligente per match live e salvataggio automatico su DB
 *
 * AGGIORNATO: Ora supporta persistenza su Supabase tramite liveTrackingRepository
 * Riferimento: FILOSOFIA_LIVE_TRACKING.md
 *
 * FILOSOFIA_LIVE_TRACKING: LivePipeline Steps
 * 1. ingest → fetchLiveData
 * 2. normalize → normalizeLiveData
 * 3. validate → validateLiveData
 * 4. enrich → enrichLiveData (features, quality)
 * 5. persist → persistLiveData (DB)
 * 6. broadcast → Socket.IO emit
 */
```
