# ⚡ FILOSOFIA LIVE TRACKING

> Il live non produce dati. Mantiene aggiornato uno stato.  
> Lo stato è il MatchBundle.

---

## 1️⃣ Principio Fondante

Il Live Tracking è un **runtime engine**, non una sorgente dati.

Cosa fa:
- Osserva eventi in tempo reale
- Aggiorna feature runtime
- Rigenera segnali strategie
- Invia patch incrementali

Cosa NON fa:
- Esporre raw data al frontend
- Decidere strategie autonomamente
- Produrre nuovi dati persistenti

---

## 2️⃣ Output Ufficiale

Il live produce **solo patch** sul MatchBundle:
- Patch su `header` (score, status)
- Patch su `tabs.*` (features, strategies)
- Patch su `dataQuality`

Formato: JSON Patch o BundleDelta strutturato.

---

## 3️⃣ Pipeline Live

```
Live Events (API / polling)
     ↓
Live Normalizer
     ↓
Feature Engine (runtime)
     ↓
Strategy Engine
     ↓
Bundle Patch
     ↓
WebSocket / Cache Refresh
```

---

## 4️⃣ Polling Adattivo

Il polling non è fisso. Si adatta al contesto di trading:

| Condizione | Azione |
|------------|--------|
| Score change | Polling FAST |
| Nessun cambiamento N volte | Backoff |
| Strategy READY | Polling BOOST |
| Match idle | Polling SLOW |

---

## 5️⃣ Data Quality Live

Il live aggiorna:
- **Freshness**: quanto sono recenti i dati
- **Staleness**: se i dati sono scaduti
- **Completeness**: se manca qualcosa

Il frontend mostra questi indicatori, non li interpreta.

---

## 6️⃣ Consolidamento a Fine Match

Quando il match finisce:
- Si rigenera `match_bundle_snapshot` completo
- Nessun snapshot parziale
- Il bundle è l'unica verità persistita

---

## 7️⃣ Regola Finale

> Se un update live:
> - Non modifica il MatchBundle
> - Non migliora la latenza decisionale
>
> **→ Non serve.**

---

**Documenti Correlati**:
- [FILOSOFIA_TEMPORAL](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) – `event_time` vs `ingestion_time`
- [FILOSOFIA_ODDS](../../30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md) – sync live odds
- [FILOSOFIA_OBSERVABILITY](../../10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) – latency monitoring
- [FILOSOFIA_PBP_EXTRACTION](../FILOSOFIA_PBP_EXTRACTION.md) – Point-by-point parsing

### 📁 File Codice Principali

| File | Descrizione |
|------|-------------|
| [`backend/liveManager.js`](../../../../backend/liveManager.js) | Engine live tracking principale |
| [`backend/db/liveTrackingRepository.js`](../../../../backend/db/liveTrackingRepository.js) | Repository live data |
| [`backend/routes/tracking.routes.js`](../../../../backend/routes/tracking.routes.js) | Route tracking endpoints |
| [`backend/controllers/tracking.controller.js`](../../../../backend/controllers/tracking.controller.js) | Controller tracking |
