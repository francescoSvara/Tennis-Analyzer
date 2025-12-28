# 📋 TODO LIST – Tennis Analyzer v3.0

> **Ultimo aggiornamento**: 2025-12-28  
> **Philosophy Enforcer v2.0**: 8 errori aperti, 25 warnings aperti  
> **Risolti oggi**: 5 errori + 27 warnings  
> **Pass rate**: 94%

---

## 🔬 PHILOSOPHY ENFORCER V2.0 (Auto-generato)

> Ultimo check: 2025-12-28  
> Esegui: `node scripts/philosophyEnforcer.js`

### 📊 Sommario

| Metrica | Valore |
|---------|--------|
| Regole estratte | 250 |
| Verifiche eseguite | 278 |
| ✅ Passate | 240 |
| ❌ Errori | 8 |
| ⚠️ Warning | 25 |

### ❌ ERRORI CRITICI (8)

| # | Filosofia | Regola | Problema |
|---|-----------|--------|----------|
| 1 | FILOSOFIA_DB | CANONICAL_SCHEMA | Schema matches_new manca colonna home_player_id |
| 2 | FILOSOFIA_DB | CANONICAL_SCHEMA | Schema matches_new manca colonna away_player_id |
| 3 | FILOSOFIA_DB | CANONICAL_SCHEMA | Schema matches_new manca colonna event_time |
| 4 | FILOSOFIA_DB | CANONICAL_SCHEMA | Schema matches_new manca colonna home_player_id |
| 5 | FILOSOFIA_DB | CANONICAL_SCHEMA | Schema matches_new manca colonna away_player_id |
| 6 | FILOSOFIA_DB | CANONICAL_SCHEMA | Schema matches_new manca colonna event_time |
| 7 | FILOSOFIA_PBP_EXTRACTION | INVARIANT_SERVER_SCORE_PROGRESSION | sofascoreScraper.js non traccia chi serve |
| 8 | FILOSOFIA_PBP_EXTRACTION | INVARIANT_SERVICE_ALTERNATION | insert-pbp-correct.js non implementa alternanza servizio |

#### Checklist Errori da Correggere

- [ ] **ERR-001** [FILOSOFIA_DB] CANONICAL_SCHEMA: Schema matches_new manca colonna home_player_id
- [ ] **ERR-002** [FILOSOFIA_DB] CANONICAL_SCHEMA: Schema matches_new manca colonna away_player_id
- [ ] **ERR-003** [FILOSOFIA_DB] CANONICAL_SCHEMA: Schema matches_new manca colonna event_time
- [ ] **ERR-004** [FILOSOFIA_DB] CANONICAL_SCHEMA: Schema matches_new manca colonna home_player_id
- [ ] **ERR-005** [FILOSOFIA_DB] CANONICAL_SCHEMA: Schema matches_new manca colonna away_player_id
- [ ] **ERR-006** [FILOSOFIA_DB] CANONICAL_SCHEMA: Schema matches_new manca colonna event_time
- [ ] **ERR-012** [FILOSOFIA_PBP_EXTRACTION] INVARIANT_SERVER_SCORE_PROGRESSION: sofascoreScraper.js non traccia chi serve
- [ ] **ERR-013** [FILOSOFIA_PBP_EXTRACTION] INVARIANT_SERVICE_ALTERNATION: insert-pbp-correct.js non implementa alternanza servizio

### ⚠️ WARNINGS (25)

| # | Filosofia | Regola | Problema |
|---|-----------|--------|----------|
| 6 | FILOSOFIA_DB | DATAQUALITY_BACKEND_ONLY | useMatchBundle.jsx calcola dataQuality (deve essere solo backend) |
| 11 | FILOSOFIA_STATS | CLASS_RawData_no_interpretation | matchRepository.js interpreta RawData (deve solo read/write) |
| 12 | FILOSOFIA_PBP_EXTRACTION | POINT_WINNER_FROM_CSS | sofascoreScraper.js non usa CSS per determinare point winner |
| 13 | FILOSOFIA_PBP_EXTRACTION | SERVER_DETECTION_PRIORITY | sofascoreScraper.js non ha logica server detection |
| 15 | FILOSOFIA_PBP_EXTRACTION | CODE_ADAPTS_TO_TENNIS | insert-pbp-correct.js non ha validazione delle regole tennis |
| 17 | FILOSOFIA_FRONTEND_DATA_CONSUMPTION | SINGLE_SOURCE_OF_TRUTH | HomePage.jsx fa fetch diretto invece di usare useMatchBundle |
| 18 | FILOSOFIA_FRONTEND_DATA_CONSUMPTION | SINGLE_SOURCE_OF_TRUTH | MatchGrid.jsx fa fetch diretto invece di usare useMatchBundle |
| 19 | FILOSOFIA_FRONTEND_DATA_CONSUMPTION | SINGLE_SOURCE_OF_TRUTH | MonitoringDashboard.jsx fa fetch diretto invece di usare useMatchBundle |
| 20 | FILOSOFIA_MADRE_TENNIS | ROLE_REPOSITORY | matchRepository.js ha logica di calcolo (repo deve solo read/write) |
| 21 | FILOSOFIA_MADRE_TENNIS | ROLE_FRONTEND | PointByPointTab.jsx ha logica di dominio (frontend deve solo render) |
| 23 | FILOSOFIA_LINEAGE_VERSIONING | FUNCTION_testReproducibility | Nessun test di riproducibilità |
| 29 | FILOSOFIA_OBSERVABILITY_DATAQUALITY | STRUCTURED_LOGGING | Troppi log non strutturati: 773 vs 156 strutturati |
| 30 | FILOSOFIA_REGISTRY_CANON | ENTITY_MatchCanonical | add-snapshot-queue-tables.sql manca campi: home_player, away_player |
| 31 | FILOSOFIA_REGISTRY_CANON | ENTITY_MatchCanonical | create-new-schema.sql manca campi: home_player, away_player |
| 42 | FILOSOFIA_CONCEPT_CHECKS | POLICY_CI_Gate | Nessun CI workflow per concept checks gate |
| 43 | FILOSOFIA_CONCEPT_CHECKS | ASSERT_CI_INTEGRATED | Nessun CI workflow - concept checks non integrati |
| 45 | FILOSOFIA_FRONTEND_UI | RULE_RIGHT_RAIL_PURPOSE | MatchPage non ha RightRail/sidebar per odds sempre visibili |
| 46 | FILOSOFIA_FRONTEND_UI | RULE_NO_NULL_DISPLAY | HomePage.jsx mostra N/A o placeholder (backend must provide value) |
| 47 | FILOSOFIA_FRONTEND_UI | RULE_NO_NULL_DISPLAY | MomentumTab.jsx mostra N/A o placeholder (backend must provide value) |
| 48 | FILOSOFIA_FRONTEND_UI | RULE_NO_NULL_DISPLAY | OverviewTab.jsx mostra N/A o placeholder (backend must provide value) |
| 49 | FILOSOFIA_FRONTEND_UI | RULE_NO_NULL_DISPLAY | PredictorTab.jsx mostra N/A o placeholder (backend must provide value) |
| 50 | FILOSOFIA_FRONTEND_UI | RULE_NO_NULL_DISPLAY | MatchCard.jsx mostra N/A o placeholder (backend must provide value) |
| 51 | FILOSOFIA_FRONTEND_UI | RULE_NO_NULL_DISPLAY | MonitoringDashboard.jsx mostra N/A o placeholder (backend must provide value) |
| 52 | FILOSOFIA_FRONTEND_UI | ASSERT_DESIGN_SERVES_DECISION | Nessun componente Strategy - design non serve decisions |

#### Checklist Warning da Valutare

- [ ] **WARN-006** [FILOSOFIA_DB] DATAQUALITY_BACKEND_ONLY: useMatchBundle.jsx calcola dataQuality (deve essere solo backend)
- [ ] **WARN-011** [FILOSOFIA_STATS] CLASS_RawData_no_interpretation: matchRepository.js interpreta RawData (deve solo read/write)
- [ ] **WARN-012** [FILOSOFIA_PBP_EXTRACTION] POINT_WINNER_FROM_CSS: sofascoreScraper.js non usa CSS per determinare point winner
- [ ] **WARN-013** [FILOSOFIA_PBP_EXTRACTION] SERVER_DETECTION_PRIORITY: sofascoreScraper.js non ha logica server detection
- [ ] **WARN-015** [FILOSOFIA_PBP_EXTRACTION] CODE_ADAPTS_TO_TENNIS: insert-pbp-correct.js non ha validazione delle regole tennis
- [ ] **WARN-017** [FILOSOFIA_FRONTEND_DATA_CONSUMPTION] SINGLE_SOURCE_OF_TRUTH: HomePage.jsx fa fetch diretto invece di usare useMatchBundle
- [ ] **WARN-018** [FILOSOFIA_FRONTEND_DATA_CONSUMPTION] SINGLE_SOURCE_OF_TRUTH: MatchGrid.jsx fa fetch diretto invece di usare useMatchBundle
- [ ] **WARN-019** [FILOSOFIA_FRONTEND_DATA_CONSUMPTION] SINGLE_SOURCE_OF_TRUTH: MonitoringDashboard.jsx fa fetch diretto invece di usare useMatchBundle
- [ ] **WARN-020** [FILOSOFIA_MADRE_TENNIS] ROLE_REPOSITORY: matchRepository.js ha logica di calcolo (repo deve solo read/write)
- [ ] **WARN-021** [FILOSOFIA_MADRE_TENNIS] ROLE_FRONTEND: PointByPointTab.jsx ha logica di dominio (frontend deve solo render)
- [ ] **WARN-023** [FILOSOFIA_LINEAGE_VERSIONING] FUNCTION_testReproducibility: Nessun test di riproducibilità
- [ ] **WARN-029** [FILOSOFIA_OBSERVABILITY_DATAQUALITY] STRUCTURED_LOGGING: Troppi log non strutturati: 773 vs 156 strutturati
- [ ] **WARN-030** [FILOSOFIA_REGISTRY_CANON] ENTITY_MatchCanonical: add-snapshot-queue-tables.sql manca campi: home_player, away_player
- [ ] **WARN-031** [FILOSOFIA_REGISTRY_CANON] ENTITY_MatchCanonical: create-new-schema.sql manca campi: home_player, away_player
- [ ] **WARN-035** [FILOSOFIA_LIVE_TRACKING] FLOW_LivePipeline: LivePipeline manca featureEngine step
- [ ] **WARN-042** [FILOSOFIA_CONCEPT_CHECKS] POLICY_CI_Gate: Nessun CI workflow per concept checks gate
- [ ] **WARN-043** [FILOSOFIA_CONCEPT_CHECKS] ASSERT_CI_INTEGRATED: Nessun CI workflow - concept checks non integrati
- [ ] **WARN-045** [FILOSOFIA_FRONTEND_UI] RULE_RIGHT_RAIL_PURPOSE: MatchPage non ha RightRail/sidebar per odds sempre visibili
- [ ] **WARN-046** [FILOSOFIA_FRONTEND_UI] RULE_NO_NULL_DISPLAY: HomePage.jsx mostra N/A o placeholder (backend must provide value)
- [ ] **WARN-047** [FILOSOFIA_FRONTEND_UI] RULE_NO_NULL_DISPLAY: MomentumTab.jsx mostra N/A o placeholder (backend must provide value)
- [ ] **WARN-048** [FILOSOFIA_FRONTEND_UI] RULE_NO_NULL_DISPLAY: OverviewTab.jsx mostra N/A o placeholder (backend must provide value)
- [ ] **WARN-049** [FILOSOFIA_FRONTEND_UI] RULE_NO_NULL_DISPLAY: PredictorTab.jsx mostra N/A o placeholder (backend must provide value)
- [ ] **WARN-050** [FILOSOFIA_FRONTEND_UI] RULE_NO_NULL_DISPLAY: MatchCard.jsx mostra N/A o placeholder (backend must provide value)
- [ ] **WARN-051** [FILOSOFIA_FRONTEND_UI] RULE_NO_NULL_DISPLAY: MonitoringDashboard.jsx mostra N/A o placeholder (backend must provide value)
- [ ] **WARN-052** [FILOSOFIA_FRONTEND_UI] ASSERT_DESIGN_SERVES_DECISION: Nessun componente Strategy - design non serve decisions

### 📈 Statistiche per Filosofia

| Filosofia | Pass | Errori | Warning | Rate |
|-----------|------|--------|---------|------|
| FILOSOFIA_DB | 15 | 8 | 6 | 🟡 52% |
| FILOSOFIA_TEMPORAL | 13 | 2 | 2 | 🟡 76% |
| FILOSOFIA_CALCOLI | 19 | 1 | 2 | 🟢 86% |
| FILOSOFIA_STATS | 17 | 0 | 1 | 🟢 94% |
| FILOSOFIA_PBP_EXTRACTION | 8 | 2 | 4 | 🟡 57% |
| FILOSOFIA_FRONTEND_DATA_CONSUMPTION | 15 | 0 | 4 | 🟡 79% |
| FILOSOFIA_MADRE_TENNIS | 15 | 0 | 2 | 🟢 88% |
| FILOSOFIA_LINEAGE_VERSIONING | 12 | 0 | 5 | 🟡 71% |
| FILOSOFIA_OBSERVABILITY_DATAQUALITY | 1 | 0 | 3 | 🔴 25% |
| FILOSOFIA_REGISTRY_CANON | 14 | 0 | 3 | 🟢 82% |
| FILOSOFIA_LIVE_TRACKING | 16 | 0 | 3 | 🟢 84% |
| FILOSOFIA_ODDS | 18 | 0 | 2 | 🟢 90% |
| FILOSOFIA_RISK_BANKROLL | 24 | 0 | 3 | 🟢 89% |
| FILOSOFIA_CONCEPT_CHECKS | 24 | 0 | 3 | 🟢 89% |
| FILOSOFIA_FRONTEND_UI | 21 | 0 | 9 | 🟡 70% |

---

## 📝 TODO CONSOLIDATI DA ALTRI DOCUMENTI

### TODO dal Codice

| # | File | Linea | TODO |
|---|------|-------|------|
| 1 | `src/components/match/tabs/OddsTab.jsx` | 258, 262 | Implementare logica |
| 2 | `src/components/match/tabs/StrategiesTab.jsx` | 389 | Implementare logica di esecuzione |
| 3 | `backend/server.js` | 4801 | Get full history |
| 4 | `backend/services/dataNormalizer.js` | 765 | Integrare con database player registry |

### TODO dalle Filosofie

| # | Documento | TODO |
|---|-----------|------|
| 1 | FILOSOFIA_RISK_BANKROLL.md | riskEngine.js (TODO) - Risk layer completo |
| 2 | FILOSOFIA_RISK_BANKROLL.md | integrate predictor nel model_prob |
| 3 | FILOSOFIA_FRONTEND.md | oddsService.js - Implied prob, fair odds, edge |
| 4 | FILOSOFIA_FRONTEND.md | predictorService.js - Win prob avanzata, edge vs market |
| 5 | FILOSOFIA_OBSERVABILITY_DATAQUALITY.md | send to logging service (CloudWatch, Datadog) |
| 6 | FILOSOFIA_OBSERVABILITY_DATAQUALITY.md | send to alert service |

### TODO da Deep Philosophy Check

| # | Filosofia | Tipo | File | Descrizione |
|---|-----------|------|------|-------------|
| 1 | BANKROLL | EXPORT_TODO | riskEngine.js | kellyFractional |
| 2 | OBSERVABILITY | EXPORT_TODO | dataQualityChecker.js | calculateCompleteness |
| 3 | OBSERVABILITY | EXPORT_TODO | dataQualityChecker.js | detectOutliers |
| 4 | OBSERVABILITY | EXPORT_TODO | dataQualityChecker.js | checkConsistency |

---

## 🛠️ Comandi Utili

```bash
# Verifica Philosophy Enforcer (questo script)
node scripts/philosophyEnforcer.js

# Verifica DEEP (implementazione funzioni vs filosofie)  
node scripts/deepPhilosophyCheck.js

# Verifica pattern architetturali
node scripts/runConceptChecks.js

# Verifica esistenza file
node scripts/checkConceptualMap.js
```

---

## 📜 Principio Fondamentale

> **Le filosofie dichiarano cosa DEVE esistere → Il codice si adatta alle filosofie, MAI il contrario.**

---

*Generato automaticamente da `philosophyEnforcer.js` - 2025-12-28*
