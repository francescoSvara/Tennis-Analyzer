# 🔍 FILOSOFIA OBSERVABILITY & DATA QUALITY

> Garbage in, garbage out.  
> Puoi avere il miglior modello del mondo, ma se i dati sono sporchi → output inutile.

---

## 1️⃣ Perché Serve

Senza observability:
- Odds stale da 10 minuti → strategia suggerisce bet su prezzo non valido
- Player stats mancanti → features calcolate con fallback → edge falso
- Live score delayed 30s → momentum calculation sbagliato
- Outlier non rilevato → feature spike → signal spurio

**Risultato**: decisioni basate su dati corrotti.

---

## 2️⃣ Dimensioni della Data Quality

### Completeness (Missingness)
Percentuale di campi obbligatori presenti.
- ≥95% → OK
- 80-95% → Warning
- <80% → Error (quarantine)

### Timeliness (Freshness)
Età dei dati rispetto a `now()` o `as_of_time`.
- Live score: max 30s
- Odds live: max 10s
- Odds pre-match: max 1 min

### Accuracy (Outliers)
Valori fuori range plausibile:
- Odds < 1.01 o > 1000 → sospetto
- Volatility fuori [0, 1] → impossibile
- Pressure fuori [0, 100] → impossibile

### Consistency
Coerenza tra campi correlati:
- Match "finished" ma score mancante → inconsistente
- Best_of=3 ma sets>3 → inconsistente

---

## 3️⃣ Overall Quality Score

Ogni match riceve un punteggio 0-100 basato su media pesata:
- Completeness: 40%
- Staleness: 30%
- Outliers: 20%
- Consistency: 10%

| Score | Livello |
|-------|---------|
| ≥95 | EXCELLENT |
| ≥80 | GOOD |
| ≥60 | ACCEPTABLE |
| ≥40 | POOR |
| <40 | UNUSABLE |

---

## 4️⃣ Quarantena

Dati vanno in quarantine se:
- Overall score < 40
- Outliers critici (odds < 1.01)
- Consistency issues gravi
- Canonical IDs mancanti

I dati quarantinati **non** vengono usati per decisioni finché non vengono revisionati.

---

## 5️⃣ Logging Strutturato

Ogni log entry contiene:
- `timestamp`: quando
- `level`: DEBUG / INFO / WARN / ERROR
- `module`: quale componente
- `message`: cosa è successo
- `context`: dettagli strutturati (match_id, durata, etc.)

---

## 6️⃣ Metriche da Tracciare

**System-level**:
- Request rate, response time, error rate

**Domain-level**:
- Data quality score distribution
- Quarantine rate
- Odds staleness
- Live latency

**Business-level**:
- Active matches count
- Strategies READY count
- Total exposure

---

## 7️⃣ Alerts

**Critical**: system crash, DB lost, error rate > 10%

**Warning**: quality score < 60, quarantine rate > 5%, live latency > 60s

Gli alert devono arrivare dove l'operatore può vederli (Slack, email, dashboard).

---

## 8️⃣ Integrazione con MatchBundle

Il bundle include `meta.data_quality`:

```json
{
  "meta": {
    "data_quality": {
      "completeness": { "header": 1.0, "odds": 0.9 },
      "staleness": { "odds": { "age_sec": 45, "is_stale": false } },
      "outliers": { "count": 0 },
      "overall_score": 92
    }
  }
}
```

Il frontend può mostrare un badge di qualità dati.

---

## 9️⃣ Regola Finale

> **Data quality = fondamenta di tutto.**

Senza observability:
- Non sai quando i dati sono corrotti
- Non puoi debuggare decisioni sbagliate
- Non puoi migliorare il sistema

Monitoring + Logging + Alerting = sistema production-ready.

---

**Documenti Correlati**:
- [FILOSOFIA_TEMPORAL](../temporal/FILOSOFIA_TEMPORAL.md) – staleness/freshness
- [FILOSOFIA_LINEAGE_VERSIONING](../lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) – version drift
- [FILOSOFIA_CONCEPT_CHECKS](../../00_foundation/FILOSOFIA_CONCEPT_CHECKS.md) – integration
