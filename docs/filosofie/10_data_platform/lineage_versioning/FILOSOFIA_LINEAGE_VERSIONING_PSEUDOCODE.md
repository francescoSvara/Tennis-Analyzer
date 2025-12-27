# 📜 FILOSOFIA LINEAGE & VERSIONING – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.
# Riproducibilità = fondamenta del betting quantitativo.

--------------------------------------------------

START FILOSOFIA_LINEAGE_VERSIONING

SET VERSIONING_REQUIRED = TRUE
SET REPRODUCIBILITY_REQUIRED = TRUE

--------------------------------------------------
# VERSIONI OBBLIGATORIE
--------------------------------------------------

CONSTANT VERSIONS
  data_version: string        // schema DB + origine
  feature_version: string     // featureEngine.js
  odds_schema_version: string // struttura odds
  strategy_version: string    // strategyEngine.js
  bundle_schema_version: string // contratto bundle
END

RULE SEMANTIC_VERSIONING
  FORMAT "major.minor.patch"
  major: breaking changes
  minor: nuove features (backward compatible)
  patch: bug fix
END

--------------------------------------------------
# LINEAGE CHAIN
--------------------------------------------------

RULE LINEAGE_FLOW
  RawEvents
    → data_version
  → CanonicalTables
    → REGISTRY_CANON
  → FeatureSnapshot
    → feature_version + as_of_time
  → StrategyEvaluation
    → strategy_version
  → MatchBundleSnapshot
    → bundle_schema_version + meta
  → BetDecision (opzionale)
  
  EACH step produces metadata with version + timestamp
END

--------------------------------------------------
# MATCHBUNDLE META BLOCK
--------------------------------------------------

STRUCT BundleMeta
  generated_at: timestamp     // quando bundle generato
  as_of_time: timestamp       // cut temporale logico
  versions: {
    bundle_schema: string
    data: string
    features: string
    odds: string
    strategies: string
  }
  data_freshness: {
    last_live_ingestion_time?: timestamp
    last_odds_ingestion_time?: timestamp
  }
END

RULE META_REQUIRED
  FOR EACH MatchBundle
    ASSERT meta.generated_at EXISTS
    ASSERT meta.as_of_time EXISTS
    ASSERT meta.versions.bundle_schema EXISTS
    ASSERT meta.versions.data EXISTS
    ASSERT meta.versions.features EXISTS
    ASSERT meta.versions.strategies EXISTS
  END
END

--------------------------------------------------
# RIPRODUCIBILITÀ
--------------------------------------------------

RULE REPRODUCIBILITY_CONTRACT
  GIVEN match_id + versions + as_of_time
  MUST be able to regenerate same bundle
  
  REPRODUCIBLE 100%:
    - Features deterministiche
    - Strategy signals (READY/WATCH/OFF)
    - Odds snapshot
    
  NOT REPRODUCIBLE (accepted):
    - generated_at
    - ingestion timing
END

FUNCTION testReproducibility(original_bundle)
  rawData = fetchRawDataAsOf(match_id, as_of_time)
  
  features = featureEngine.compute(rawData, {
    version: meta.versions.features,
    as_of_time: meta.as_of_time
  })
  
  strategies = strategyEngine.evaluate(features, {
    version: meta.versions.strategies
  })
  
  recomputed = buildBundle(features, strategies)
  
  ASSERT recomputed.tabs.strategies == original.tabs.strategies
  ASSERT |recomputed.stats.volatility - original.stats.volatility| < 0.0001
END

--------------------------------------------------
# VERSION BUMP RULES
--------------------------------------------------

RULE VERSION_BUMP_TRIGGER
  IF formula_change IN featureEngine
    THEN bump feature_version
  END
  
  IF new_strategy OR threshold_change
    THEN bump strategy_version
  END
  
  IF bug_fix IN calculation
    THEN bump feature_version (patch)
  END
  
  IF bundle_structure_change
    THEN bump bundle_schema_version
  END
  
  IF db_migration
    THEN bump data_version
  END
END

--------------------------------------------------
# STORAGE
--------------------------------------------------

RULE SNAPSHOT_WITH_META
  WHEN saving match_card_snapshot
    STORE bundle complete with meta block
    INDEX by as_of_time for temporal queries
    INDEX by version for audit queries
END

TABLE match_card_snapshot
  match_id: PK
  snapshot: JSONB (full bundle)
  meta: JSONB (for indexing)
  as_of_time: timestamp
  generated_at: timestamp
  feature_version: string
  strategy_version: string
END

--------------------------------------------------
# CONCEPT CHECK
--------------------------------------------------

RULE BUNDLE_META_CHECK
  FOR EACH bundle
    ASSERT bundle.meta EXISTS
    ASSERT bundle.meta.generated_at IS valid timestamp
    ASSERT bundle.meta.as_of_time IS valid timestamp
    ASSERT bundle.meta.versions.features MATCHES semver
    ASSERT bundle.meta.versions.strategies MATCHES semver
  END
END

--------------------------------------------------
# VERSION EXPORT
--------------------------------------------------

RULE MODULE_VERSION_EXPORT
  FOR EACH versioned module
    EXPORT VERSION constant
    INCLUDE version in computed output
  END
END

EXAMPLE featureEngine
  CONST FEATURE_VERSION = "v1.2.0"
  
  FUNCTION computeFeatures(data)
    features = calculate(data)
    RETURN {
      ...features,
      feature_version: FEATURE_VERSION
    }
  END
  
  EXPORT VERSION = FEATURE_VERSION
END

--------------------------------------------------
# REGOLA FINALE
--------------------------------------------------

RULE AUDIT_COMPLIANCE
  FOR EACH bet_decision
    MUST answer:
      - Which features were used?
      - Which strategy version suggested READY?
      - Can I regenerate this bundle?
    
    IF cannot_answer
      THEN system NOT audit-compliant
  END
END

--------------------------------------------------

END FILOSOFIA_LINEAGE_VERSIONING

--------------------------------------------------
# REFERENCES (INTER-DOCUMENT)
--------------------------------------------------

REFERENCES
  PARENT: FILOSOFIA_MADRE_TENNIS
  DEPENDS_ON:
    - FILOSOFIA_DB (schema versioning)
    - FILOSOFIA_TEMPORAL (as_of_time)
    - FILOSOFIA_REGISTRY_CANON (entity mapping versions)
  OUTPUTS_TO:
    - FILOSOFIA_OBSERVABILITY_DATAQUALITY (version drift alerts)
    - FILOSOFIA_RISK_BANKROLL (bet decision audit)
    - FILOSOFIA_CONCEPT_CHECKS (version validation)
END

ASSERT EVERY_BUNDLE_HAS_META
ASSERT VERSIONS_ARE_SEMANTIC
ASSERT REPRODUCIBILITY_GUARANTEED
