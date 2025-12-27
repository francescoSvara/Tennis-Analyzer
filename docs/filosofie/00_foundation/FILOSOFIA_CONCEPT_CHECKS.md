# 🧪 FILOSOFIA CONCEPT CHECKS
## Sistema Immunitario Architetturale

> **Dominio**: Governance · Qualità · Guardrails  
> **Stato**: ATTIVA  
> **Ultimo aggiornamento**: 27 Dicembre 2025  

---

## 0️⃣ Principio Costituzionale

> **Ogni pezzo di codice deve sapere chi è, cosa può fare, cosa non deve fare.**

I Concept Checks proteggono:
- MatchBundle integrity
- Feature Engine purity
- Strategy Engine boundaries

---

## 1️⃣ Invarianti Non Negoziabili

```
INVARIANT MATCHBUNDLE_ONLY_FE
  Frontend consuma SOLO MatchBundle
  fetch FE verso /stats, /momentum → ❌ ERROR
END

INVARIANT BACKEND_INTERPRETATION
  Solo backend interpreta dati
  calcoli pressure/edge in FE → ❌ ERROR
END

INVARIANT FEATURE_VS_STRATEGY
  Feature Engine → calcola numeri
  Strategy Engine → decide READY/WATCH/OFF
  Frontend → visualizza segnali
END

INVARIANT SIGNAL_NOT_METRIC
  Segnali NON sono metriche
  persistenza READY/WATCH in DB → ❌ ERROR
END

INVARIANT DATAQUALITY_BACKEND
  DataQuality calcolata solo backend
  FE con calculateCompleteness → ❌ ERROR
END
```

---

## 2️⃣ Regole Temporali

```
RULE TEMPORAL_ASOF
  feature_snapshot.as_of_time <= match.event_time (pre-match)
  feature_snapshot.as_of_time <= now() (live)
END

RULE NO_FUTURE_DATA
  Nessuna query usa righe con event_time > as_of_time
  Violazione = edge finto
END
```

---

## 3️⃣ Regole Identità

```
RULE CANONICAL_IDS_REQUIRED
  Bundle DEVE avere:
    - header.home_player.player_id
    - header.away_player.player_id  
    - header.tournament.tournament_id
END

RULE MATCHBUNDLE_META_REQUIRED
  meta DEVE includere:
    - generated_at
    - as_of_time
    - versions.bundle_schema
    - versions.data
    - versions.features
    - versions.strategies
END
```

---

## 4️⃣ Regole Qualità

```
RULE DATA_QUALITY_THRESHOLD
  bundle.meta.data_quality.overall_score >= 60
  score < 40 → ERROR
  score < 60 → WARNING
END

RULE ODDS_STALENESS_WARNING
  Threshold pre-match: 10 min
  Threshold live: 30 sec
  Oltre → WARNING
END

RULE NO_QUARANTINED_DATA
  Match in quarantine → ERROR
  Non usare per decisioni
END
```

---

## 5️⃣ Check Architetturali

| ID | Regola | Target |
|----|--------|--------|
| `LIN-001` | featureEngine esporta VERSION | `featureEngine.js` |
| `LIN-002` | strategyEngine esporta VERSION | `strategyEngine.js` |
| `STATS-001` | Feature Engine esiste | `featureEngine.js` |
| `STATS-002` | Strategy Engine esiste | `strategyEngine.js` |
| `CALC-001` | featureEngine MAI null | `featureEngine.js` |
| `FE-001` | App.jsx NO featureEngine import | `App.jsx` |
| `DB-001` | Supabase client centralizzato | `supabase.js` |

---

## 6️⃣ Severità e CI

```
POLICY CI_Gate
  IF errors > 0
    THEN FAIL
  ELSE
    PASS
END

SEVERITY_LEVELS:
  ERROR  → blocca CI
  WARN   → report + TODO
  INFO   → solo documentazione
```

---

## 7️⃣ File di Riferimento

| File | Scopo |
|------|-------|
| `scripts/runConceptChecks.js` | Runner checks |
| `scripts/checkConceptualMap.js` | Verifica esistenza file |
| `docs/concept/rules.v2.json` | Regole semantic |

---

## 8️⃣ Eccezioni

```
ANNOTATION philosophy:allow
  // philosophy:allow RULE_ID reason="motivazione"
  
  IF rule in allowlist
    THEN downgrade severity
END
```

---

## 9️⃣ Regola Finale

```
IF check produce troppi falsi positivi
OR check difficile da spiegare
OR check non legato a filosofia
  THEN rimuovi o semplifica

Disciplina architetturale > tooling
```

---

**Fine FILOSOFIA_CONCEPT_CHECKS**
