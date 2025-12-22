# 🧭 FILOSOFIA MADRE – Indice Documentazione Architetturale

> **Scopo**: indice unico (source of truth) della documentazione del progetto.

*Ultimo aggiornamento: 22 Dicembre 2025*

---

## 1️⃣ Regole vincolanti

| Regola | Descrizione |
|--------|-------------|
| **Un documento = un dominio** | DB, Stats, Live, Odds, AI, Strategies, Observability |
| **No duplicazioni** | Mai copiare contenuti tra documenti |
| **Cross-reference minimale** | Max 1 riga: `Riferimento: docs/filosofie/<FILE>.md (sezione <Titolo>)` |
| **Dettagli nel codice** | Le filosofie definiscono struttura/invarianti, NON formule/pesi |

---

## 2️⃣ Mappa documenti attivi

| Dominio | File | Responsabilità |
|---------|------|----------------|
| **DB** | [FILOSOFIA_DB.md](FILOSOFIA_DB.md) | Schema, pipeline ingest, raw→canonical, snapshot |
| **Stats** | [FILOSOFIA_STATS_V2.md](FILOSOFIA_STATS_V2.md) | RAW vs DERIVED vs DYNAMIC, livelli Player/Match/Combined |
| **Live** | [FILOSOFIA_LIVE_TRACKING.md](FILOSOFIA_LIVE_TRACKING.md) | Polling, tracking, websocket, consolidamento |
| **Odds** | [FILOSOFIA_ODDS.md](FILOSOFIA_ODDS.md) | Quote mercato vs fair odds, value, margin |
| **Frontend UI** | [FILOSOFIA_FRONTEND_UI_UX.md](FILOSOFIA_FRONTEND_UI_UX.md) | Ruolo UI, confini responsabilità, principi motion/design |
| **Frontend Data** | [FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md](FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) | Fetch, loading, error, snapshot vs live |
| **Concept Checks** | [FILOSOFIA_CONCEPT_CHECKS.md](FILOSOFIA_CONCEPT_CHECKS.md) | Guardrail docs↔code, regole domini, CI |

### 📋 Spec operative

| Dominio | File | Contenuti |
|---------|------|-----------|
| **Frontend Motion/UI** | [SPEC_FRONTEND_MOTION_UI.md](../specs/SPEC_FRONTEND_MOTION_UI.md) | Task, animazioni, snippet, componenti |

### ⚠️ Documenti deprecati

| File | Stato | Note |
|------|-------|------|
| `FILOSOFIA_STATS.md` | ⚠️ DEPRECATO | Sostituito da V2. Contiene dettagli implementativi da mantenere nel codice. |

---

## 3️⃣ Roadmap documenti futuri

| Dominio | File proposto | Contenuti chiave |
|---------|---------------|------------------|
| **AI/ML** | `FILOSOFIA_AI.md` | Feature engineering, training, model registry |
| **Strategies** | `FILOSOFIA_STRATEGIES.md` | Backtest, ROI/drawdown/sharpe, anti-leakage |
| **Observability** | `FILOSOFIA_OBSERVABILITY.md` | Logging, data quality, alerting |

---

## 4️⃣ Matrice dipendenze tra domini

```
         ┌─────────┐
         │   DB    │ ◀── fonte dati per tutti
         └────┬────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐
│ Stats │ │ Live  │ │ Odds  │
└───┬───┘ └───┬───┘ └───┬───┘
    │         │         │
    └─────────┼─────────┘
              ▼
    ┌─────────────────┐
    │   AI/Strategies │
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │  Observability  │
    └─────────────────┘
```

---

## 5️⃣ Sistema di Verifica

| Strumento | Script | Output |
|-----------|--------|--------|
| **Check Mappa** | `node scripts/checkConceptualMap.js` | Verifica esistenza file, funzioni, tabelle |
| **Concept Checks** | `node scripts/runConceptChecks.js` | Verifica confini architetturali tra domini |

### Documenti Navigazione

| Documento | Scopo |
|-----------|-------|
| [MAPPA_RETE_CONCETTUALE.md](../MAPPA_RETE_CONCETTUALE.md) | Riferimenti file, funzioni, linee |
| [TODO_LIST.md](../TODO_LIST.md) | Task + problemi auto-rilevati |
| [rules.v1.json](../concept/rules.v1.json) | Regole confini domini |
| [report.md](../checks/report.md) | Ultimo report concept checks |

---

## 6️⃣ Checklist nuovo contenuto

1. Identifica il dominio
2. Aggiungi nel documento del dominio
3. Aggiorna questa mappa se serve
4. Aggiungi max 1 riga di riferimento nelle sezioni correlate
5. Esegui `node scripts/runConceptChecks.js` per verificare

---

## ✅ Regola finale

**Non duplicare conoscenza**: collega.
