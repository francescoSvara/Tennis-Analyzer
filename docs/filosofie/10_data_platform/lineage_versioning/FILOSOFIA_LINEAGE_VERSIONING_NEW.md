# 📜 FILOSOFIA LINEAGE & VERSIONING

> Ogni decisione di betting deve essere riproducibile.  
> Se non sai con quale versione hai calcolato una feature, non sai se l'edge era reale o un bug.

---

## 1️⃣ Perché Serve il Versioning

Scenario reale:
- 10 gennaio: strategy suggerisce bet → perdi €500
- 11 gennaio: correggi bug nel calcolo volatility

**Senza versioning**: non sai se la decisione del 10 era valida.

**Con versioning**: la bet ha `feature_version: v1.1.0` (buggy). Puoi ricalcolare con `v1.2.0` e capire l'errore.

> Il versioning è la fondamenta del betting quantitativo.

---

## 2️⃣ Cosa si Versiona

Ogni layer del sistema ha una versione semantica (`major.minor.patch`):

| Versione | Cosa Rappresenta | Bump Quando |
|----------|-----------------|-------------|
| `data_version` | Schema DB + origine dati | Migration, nuova fonte |
| `feature_version` | featureEngine.js | Cambio formula, fix bug |
| `odds_schema_version` | Struttura odds ticks | Aggiunta campi temporali |
| `strategy_version` | strategyEngine.js | Nuova strategia, cambio threshold |
| `bundle_schema_version` | Contratto MatchBundle | Aggiunta/rimozione tab |

---

## 3️⃣ La Catena di Lineage

Il flusso dati segue una catena tracciabile:

```
Raw Events (SofaScore API)
     ↓ data_version
Canonical Tables (matches, players, odds)
     ↓ REGISTRY_CANON
Feature Snapshot
     ↓ feature_version + as_of_time
Strategy Evaluation
     ↓ strategy_version
MatchBundle Snapshot
     ↓ bundle_schema_version + meta
Bet Decision
```

Ogni step produce metadata con versione e timestamp.

---

## 4️⃣ Il Blocco Meta del Bundle

Ogni MatchBundle **deve** avere un blocco `meta`:

```json
{
  "meta": {
    "generated_at": "2025-12-25T14:55:30Z",
    "as_of_time": "2025-12-25T14:55:00Z",
    "versions": {
      "bundle_schema": "v2.1.0",
      "data": "canonical_v2",
      "features": "v1.2.0",
      "odds": "v2.0.0",
      "strategies": "v2.0.0"
    },
    "data_freshness": {
      "last_live_ingestion_time": "2025-12-25T14:55:20Z",
      "last_odds_ingestion_time": "2025-12-25T14:54:50Z"
    }
  }
}
```

---

## 5️⃣ Riproducibilità

> Dato `match_id` + `meta.versions` + `as_of_time`, devo poter rigenerare lo stesso bundle.

**Riproducibile al 100%**:
- Features deterministiche
- Strategy signals (READY/WATCH/OFF)
- Odds snapshot

**Non riproducibile** (accettato):
- `generated_at` (ovviamente diverso)
- Timing di ingestion

---

## 6️⃣ Workflow Version Bump

Prima di committare, verifica:

| Cambio | Azione |
|--------|--------|
| Formula feature | Bump `feature_version` |
| Nuova strategia | Bump `strategy_version` |
| Fix bug calcolo | Bump `feature_version` (patch) |
| Struttura bundle | Bump `bundle_schema_version` |
| Migration DB | Bump `data_version` |

---

## 7️⃣ Regola Finale

> **Se non puoi rispondere a queste domande, il sistema non è audit-compliant:**
>
> - Quali features ho usato per questa bet?
> - Quale versione della strategia ha suggerito READY?
> - Posso rigenerare questo bundle?

Versioning = fondamenta della riproducibilità.

---

**Documenti Correlati**:
- [FILOSOFIA_TEMPORAL](../temporal/FILOSOFIA_TEMPORAL.md) – gestione `as_of_time`
- [FILOSOFIA_OBSERVABILITY](../quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) – version drift alerts
- [FILOSOFIA_DB](../storage/FILOSOFIA_DB.md) – schema versioning
