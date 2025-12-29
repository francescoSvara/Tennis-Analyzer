# ⏰ FILOSOFIA TEMPORAL – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.

# Il tempo è un constraint, non metadata.

---

START FILOSOFIA_TEMPORAL

SET TIME_IS_RULE = TRUE

---

# DEFINIZIONI TEMPI

---

DEFINE event_time
Quando l'evento è valido nel mondo reale
Usato per: anti-leakage, snapshot logici
END

DEFINE source_time
Timestamp fornito dalla fonte esterna
Usato per: audit, confronto
END

DEFINE ingestion_time
Quando il nostro sistema riceve il dato
Usato per: staleness, freshness
END

DEFINE as_of_time
Cut temporale per calcoli/snapshot
Usato per: riproducibilità, anti-leakage
END

---

# ANTI-LEAKAGE

---

RULE NO_FUTURE_DATA
FOR EACH query
ASSERT data.event_time <= as_of_time
END

IF violated
THEN edge IS FAKE
END

RULE TEMPORAL_COHERENCE
FOR EACH bundle
FOR EACH data_item IN bundle
ASSERT data_item.event_time <= bundle.as_of_time
END
END
END

---

# STALENESS THRESHOLDS

---

DEFINE staleness_thresholds
live_score = 30s
odds_live = 10s
odds_prematch = 60s
player_stats = 86400s (1 day)
END

RULE CHECK_STALENESS
age = now() - data.ingestion_time

IF age > threshold(data.type)
THEN EMIT warning
IF age > threshold \* 2
THEN QUARANTINE data
END
END
END

---

# SNAPSHOT RULES

---

RULE SNAPSHOT_COHERENCE
bundle.meta.as_of_time MUST exist

FOR EACH data IN bundle
ASSERT data.event_time <= bundle.meta.as_of_time
END
END

RULE FEATURE_CALCULATION
computeFeatures(match, as_of_time)
FILTER odds WHERE event_time <= as_of_time
FILTER stats WHERE event_time <= as_of_time
RETURN features
END
END

---

# INVARIANTI

---

INVARIANT event_time_required
FOR EACH data_item
ASSERT event_time EXISTS
END

INVARIANT ingestion_time_required
FOR EACH data_item
ASSERT ingestion_time EXISTS
END

INVARIANT no_future_in_bundle
FOR EACH bundle
FOR EACH item
ASSERT item.event_time <= bundle.as_of_time
END
END
END

---

# REGOLA FINALE

---

RULE UNKNOWN_TIME_NO_DECISION
IF data.event_time IS UNKNOWN
THEN data CANNOT be used for decisions
END

---

RULE API_LAYER_IMPLEMENTATION
WHEN exposing temporal semantics (as_of_time, ingestion_time)

- include them in bundle meta via controllers/services
- DO NOT compute or inject time semantics in server.js routing logic
  END

END FILOSOFIA_TEMPORAL

---

# REFERENCES (INTER-DOCUMENT)

---

REFERENCES
PARENT: FILOSOFIA_MADRE_TENNIS
DEPENDS_ON: - FILOSOFIA_DB (storage timestamps)
OUTPUTS_TO: - FILOSOFIA_OBSERVABILITY_DATAQUALITY (staleness) - FILOSOFIA_LINEAGE_VERSIONING (as_of_time) - FILOSOFIA_CALCOLI (feature calculation) - FILOSOFIA_LIVE_TRACKING (live freshness) - FILOSOFIA_ODDS (odds timestamps)
END

ASSERT TIME_IS_CONSTRAINT
ASSERT LEAKAGE_IS_PREVENTED
ASSERT STALENESS_IS_MONITORED
