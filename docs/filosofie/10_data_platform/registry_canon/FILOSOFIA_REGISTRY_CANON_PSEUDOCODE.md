# 🔖 FILOSOFIA REGISTRY CANON – PSEUDOCODICE CANONICO

# Questo documento è PSEUDOCODICE.

# Identità = fondamenta del sistema.

---

START FILOSOFIA_REGISTRY_CANON

SET ONE_ENTITY_ONE_ID = TRUE

---

# ENTITÀ CANONICHE

---

ENTITY PlayerCanonical
player_id: string (canonical)
name: string (display)
aliases: string[]
sources: {
sofascore_id: number
atp_id: string
wta_id: string
}
END

ENTITY MatchCanonical
match_id: string (canonical)
home_player_id: FK → players
away_player_id: FK → players
tournament_id: FK → tournaments
event_time: timestamp
status: enum
END

ENTITY TournamentCanonical
tournament_id: string (canonical)
name: string
aliases: string[]
category: enum
surface: enum
END

---

# RESOLUTION RULES

---

RULE CANONICAL_ID_REQUIRED
FOR EACH entity IN system
ASSERT canonical_id EXISTS
ASSERT canonical_id IS UNIQUE
ASSERT canonical_id IS STABLE
END
END

RULE RESOLUTION_PRIORITY

1. native_source_id (sofascore_id)
2. mapping_file (players.json)
3. fuzzy_match + manual_confirm
   END

FUNCTION resolve(raw_name, source)
IF source.has_native_id
RETURN build_canonical(source.native_id)
END

IF mapping_exists(raw_name)
RETURN mapping[raw_name].canonical_id
END

candidates = fuzzy_search(raw_name)
IF candidates.count == 1 AND confidence > 0.95
RETURN candidates[0].canonical_id
END

RETURN UNRESOLVED (requires manual)
END

---

# ALIAS MANAGEMENT

---

RULE ALIAS_RESOLUTION
FOR EACH alias IN player.aliases
resolve(alias) → player.canonical_id
END
END

RULE NO_DUPLICATE_CANONICAL
FOR EACH entity_type
ASSERT COUNT(canonical_id) == COUNT(DISTINCT canonical_id)
END
END

---

# STORAGE

---

RULE STORAGE_CANONICAL_ONLY
DB stores canonical_id only
NEVER stores raw_name as identifier
raw_name stored as display_name or alias
END

RULE FK_CANONICAL
FOR EACH foreign_key
ASSERT FK references canonical_id
NEVER references raw_name
END
END

---

# BUNDLE REQUIREMENTS

---

RULE BUNDLE_CANONICAL_IDS
bundle.header MUST have: - home_player.player_id (canonical) - away_player.player_id (canonical) - tournament.tournament_id (canonical)
END

---

# REGOLA FINALE

---

RULE DIFFERENT_ID_DIFFERENT_ENTITY
IF record_a.canonical_id != record_b.canonical_id
THEN record_a IS_NOT record_b
ALWAYS
END

---

RULE API_LAYER_IMPLEMENTATION
WHEN Register/Lookup APIs needed

- implement via routes/controllers calling repository functions
- server.js must not contain lookup logic
  END

END FILOSOFIA_REGISTRY_CANON

---

# REFERENCES (INTER-DOCUMENT)

---

REFERENCES
PARENT: FILOSOFIA_MADRE_TENNIS
DEPENDS_ON: - FILOSOFIA_DB (players, tournaments tables)
OUTPUTS_TO: - FILOSOFIA_LINEAGE_VERSIONING (entity resolution) - FILOSOFIA_OBSERVABILITY_DATAQUALITY (identity warnings) - FILOSOFIA_CONCEPT_CHECKS (canonical ID validation)
END

ASSERT IDENTITIES_ARE_UNIQUE
ASSERT RESOLUTION_IS_DETERMINISTIC
ASSERT CANON_IS_STABLE
