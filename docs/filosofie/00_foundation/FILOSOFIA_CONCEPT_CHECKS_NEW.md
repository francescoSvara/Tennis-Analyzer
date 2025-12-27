# 🧪 FILOSOFIA CONCEPT CHECKS

> Ogni pezzo di codice deve sapere chi è, cosa può fare, cosa non deve fare.  
> I Concept Checks sono il sistema immunitario dell'architettura.

---

## 1️⃣ Cosa Proteggono

- **MatchBundle integrity**: il bundle è l'unica verità
- **Feature Engine purity**: calcoli deterministici
- **Strategy Engine boundaries**: segnali, non metriche
- **Frontend statelessness**: solo display, mai calcoli

---

## 2️⃣ Invarianti Non Negoziabili

| Invariante | Descrizione |
|------------|-------------|
| MATCHBUNDLE_ONLY_FE | Frontend consuma solo MatchBundle |
| BACKEND_INTERPRETATION | Solo backend interpreta dati |
| FEATURE_VS_STRATEGY | Feature calcola, Strategy decide, FE visualizza |
| SIGNAL_NOT_METRIC | Segnali non sono metriche (no persist) |
| DATAQUALITY_BACKEND | DataQuality calcolata solo backend |

---

## 3️⃣ Regole Temporali

- **as_of_time**: feature snapshot non può essere nel futuro
- **no_future_data**: nessuna query usa righe con `event_time > as_of_time`

Violazione = edge finto.

---

## 4️⃣ Regole Identità

Il bundle DEVE avere:
- `header.home_player.player_id` (canonical)
- `header.away_player.player_id` (canonical)
- `header.tournament.tournament_id` (canonical)
- `meta.versions.*` (tutte le versioni)

---

## 5️⃣ Regole Qualità

| Regola | Soglia | Azione |
|--------|--------|--------|
| Data quality score | < 40 | ERROR (blocca) |
| Data quality score | < 60 | WARNING |
| Odds staleness (live) | > 30s | WARNING |
| Odds staleness (pre-match) | > 10min | WARNING |
| Match quarantined | true | ERROR |

---

## 6️⃣ Severità e CI

```
ERROR  → blocca CI (merge denied)
WARN   → report + TODO (merge allowed)
INFO   → documentazione only
```

---

## 7️⃣ Eccezioni

Annotazione `// philosophy:allow RULE_ID reason="..."`

Se una regola ha troppi falsi positivi o non è legata a filosofia, va rimossa o semplificata.

---

## 8️⃣ Regola Finale

> Disciplina architetturale > tooling.
>
> I check devono essere spiegabili e legati alla filosofia.
> Se non lo sono, non servono.

---

**Documenti Correlati**:
- [FILOSOFIA_MADRE_TENNIS](./FILOSOFIA_MADRE_TENNIS.md) – principi fondanti
- [FILOSOFIA_OBSERVABILITY](../10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) – quality checks
- [FILOSOFIA_LINEAGE](../10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) – version checks
