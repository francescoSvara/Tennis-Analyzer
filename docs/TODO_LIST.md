# 📋 TODO LIST – Tennis Analyzer v3.0

> **Ultimo aggiornamento**: 2025-12-30  
> **Philosophy Enforcer v2.0**: 7 errori, 16 warnings (aperti)  
> **Regole verificate**: 278 su 250 estratte  
> **Pass rate**: 93%  
> **Fix migrati a README.md**: 15 (vedi v3.2.3)

---

## 🔬 PHILOSOPHY ENFORCER V2.0 (Auto-generato)

> Ultimo check: 2025-12-30  
> Esegui: `node scripts/philosophyEnforcer.js`

### 📊 Sommario

| Metrica            | Valore |
| ------------------ | ------ |
| Regole estratte    | 250    |
| Verifiche eseguite | 278    |
| ✅ Passate         | 260    |
| ❌ Errori          | 8      |
| ⚠️ Warning         | 23     |

### ❌ ERRORI CRITICI (8)

| #   | Filosofia                | Regola                             | Problema                                                     |
| --- | ------------------------ | ---------------------------------- | ------------------------------------------------------------ |
| 1   | FILOSOFIA_DB             | CANONICAL_SCHEMA                   | Schema matches_new manca colonna home_player_id              |
| 2   | FILOSOFIA_DB             | CANONICAL_SCHEMA                   | Schema matches_new manca colonna away_player_id              |
| 3   | FILOSOFIA_DB             | CANONICAL_SCHEMA                   | Schema matches_new manca colonna event_time                  |
| 4   | FILOSOFIA_DB             | CANONICAL_SCHEMA                   | Schema matches_new manca colonna home_player_id              |
| 5   | FILOSOFIA_DB             | CANONICAL_SCHEMA                   | Schema matches_new manca colonna away_player_id              |
| 6   | FILOSOFIA_DB             | CANONICAL_SCHEMA                   | Schema matches_new manca colonna event_time                  |
| 7   | FILOSOFIA_TEMPORAL       | INVARIANT_event_time_required      | liveTrackingRepository.js insert senza event_time/created_at |
| 8   | FILOSOFIA_CALCOLI        | NEVER_RETURN_NaN                   | featureEngine.js non verifica NaN nei calcoli                |

#### Checklist Errori da Correggere

- [ ] **ERR-001** [FILOSOFIA_DB] CANONICAL_SCHEMA: Schema matches_new manca colonna home_player_id
- [ ] **ERR-002** [FILOSOFIA_DB] CANONICAL_SCHEMA: Schema matches_new manca colonna away_player_id
- [ ] **ERR-003** [FILOSOFIA_DB] CANONICAL_SCHEMA: Schema matches_new manca colonna event_time
- [ ] **ERR-004** [FILOSOFIA_DB] CANONICAL_SCHEMA: Schema matches_new manca colonna home_player_id
- [ ] **ERR-005** [FILOSOFIA_DB] CANONICAL_SCHEMA: Schema matches_new manca colonna away_player_id
- [ ] **ERR-006** [FILOSOFIA_DB] CANONICAL_SCHEMA: Schema matches_new manca colonna event_time
- [ ] **ERR-009** [FILOSOFIA_PBP_EXTRACTION] INVARIANT_SERVER_SCORE_PROGRESSION: sofascoreScraper.js non traccia chi serve

> ✅ ERR-007, ERR-008, ERR-010 risolti (vedi README.md v3.2.3)

### ⚠️ WARNINGS (23)

| #   | Filosofia                           | Regola                             | Problema                                                                      |
| --- | ----------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| 1   | FILOSOFIA_DB                        | DATAQUALITY_BACKEND_ONLY           | useMatchBundle.jsx calcola dataQuality (deve essere solo backend)             |
| 2   | FILOSOFIA_STATS                     | CLASS_RawData_no_interpretation    | matchRepository.js interpreta RawData (deve solo read/write)                  |
| 3   | FILOSOFIA_PBP_EXTRACTION            | POINT_WINNER_FROM_CSS              | sofascoreScraper.js non usa CSS per determinare point winner                  |
| 4   | FILOSOFIA_PBP_EXTRACTION            | SERVER_DETECTION_PRIORITY          | sofascoreScraper.js non ha logica server detection                            |
| 5   | FILOSOFIA_FRONTEND_DATA_CONSUMPTION | SINGLE_SOURCE_OF_TRUTH             | HomePage.jsx fa fetch diretto invece di usare useMatchBundle                  |
| 6   | FILOSOFIA_FRONTEND_DATA_CONSUMPTION | SINGLE_SOURCE_OF_TRUTH             | MatchGrid.jsx fa fetch diretto invece di usare useMatchBundle                 |
| 7   | FILOSOFIA_FRONTEND_DATA_CONSUMPTION | SINGLE_SOURCE_OF_TRUTH             | MonitoringDashboard.jsx fa fetch diretto invece di usare useMatchBundle       |
| 8   | FILOSOFIA_MADRE_TENNIS              | ROLE_REPOSITORY                    | matchRepository.js ha logica di calcolo (repo deve solo read/write)           |
| 9   | FILOSOFIA_MADRE_TENNIS              | ROLE_FRONTEND                      | PointByPointTab.jsx ha logica di dominio (frontend deve solo render)          |
| 10  | FILOSOFIA_LINEAGE_VERSIONING        | FUNCTION_testReproducibility       | Nessun test di riproducibilità                                                |
| 11  | FILOSOFIA_OBSERVABILITY_DATAQUALITY | STRUCTURED_LOGGING                 | Troppi log non strutturati: 773 vs 156 strutturati                            |
| 12  | FILOSOFIA_REGISTRY_CANON            | ENTITY_MatchCanonical              | add-snapshot-queue-tables.sql manca campi: home_player, away_player           |
| 13  | FILOSOFIA_REGISTRY_CANON            | ENTITY_MatchCanonical              | create-new-schema.sql manca campi: home_player, away_player                   |
| 14  | FILOSOFIA_REGISTRY_CANON            | ASSERT_RESOLUTION_IS_DETERMINISTIC | Resolution function usa Math.random - non deterministica                      |
| 15  | FILOSOFIA_CONCEPT_CHECKS            | POLICY_CI_Gate                     | Nessun CI workflow per concept checks gate                                    |
| 16  | FILOSOFIA_CONCEPT_CHECKS            | ASSERT_CI_INTEGRATED               | Nessun CI workflow - concept checks non integrati                             |
| 17  | FILOSOFIA_FRONTEND_UI               | STRUCTURE_Home                     | Nessun componente Home                                                        |
| 18  | FILOSOFIA_FRONTEND_UI               | RULE_RIGHT_RAIL_PURPOSE            | MatchPage non ha RightRail/sidebar per odds sempre visibili                   |
| 19  | FILOSOFIA_FRONTEND_UI               | RULE_NO_NULL_DISPLAY               | HomePage.jsx mostra N/A o placeholder (backend must provide value)            |
| 20  | FILOSOFIA_FRONTEND_UI               | RULE_NO_NULL_DISPLAY               | MomentumTab.jsx mostra N/A o placeholder (backend must provide value)         |
| 21  | FILOSOFIA_FRONTEND_UI               | RULE_NO_NULL_DISPLAY               | OverviewTab.jsx mostra N/A o placeholder (backend must provide value)         |
| 22  | FILOSOFIA_FRONTEND_UI               | RULE_NO_NULL_DISPLAY               | PredictorTab.jsx mostra N/A o placeholder (backend must provide value)        |
| 23  | FILOSOFIA_FRONTEND_UI               | RULE_NO_NULL_DISPLAY               | MatchCard.jsx mostra N/A o placeholder (backend must provide value)           |

#### Checklist Warning da Valutare

- [ ] **WARN-001** [FILOSOFIA_DB] DATAQUALITY_BACKEND_ONLY: useMatchBundle.jsx calcola dataQuality (deve essere solo backend)
- [ ] **WARN-002** [FILOSOFIA_STATS] CLASS_RawData_no_interpretation: matchRepository.js interpreta RawData (deve solo read/write)
- [ ] **WARN-003** [FILOSOFIA_PBP_EXTRACTION] POINT_WINNER_FROM_CSS: sofascoreScraper.js non usa CSS per determinare point winner
- [ ] **WARN-005** [FILOSOFIA_FRONTEND_DATA_CONSUMPTION] SINGLE_SOURCE_OF_TRUTH: HomePage.jsx fa fetch diretto invece di usare useMatchBundle
- [ ] **WARN-006** [FILOSOFIA_FRONTEND_DATA_CONSUMPTION] SINGLE_SOURCE_OF_TRUTH: MatchGrid.jsx fa fetch diretto invece di usare useMatchBundle
- [ ] **WARN-007** [FILOSOFIA_FRONTEND_DATA_CONSUMPTION] SINGLE_SOURCE_OF_TRUTH: MonitoringDashboard.jsx fa fetch diretto invece di usare useMatchBundle
- [ ] **WARN-008** [FILOSOFIA_MADRE_TENNIS] ROLE_REPOSITORY: matchRepository.js ha logica di calcolo (repo deve solo read/write)
- [ ] **WARN-009** [FILOSOFIA_MADRE_TENNIS] ROLE_FRONTEND: PointByPointTab.jsx ha logica di dominio (frontend deve solo render)
- [ ] **WARN-011** [FILOSOFIA_OBSERVABILITY_DATAQUALITY] STRUCTURED_LOGGING: Troppi log non strutturati: 773 vs 156 strutturati
- [ ] **WARN-015** [FILOSOFIA_CONCEPT_CHECKS] POLICY_CI_Gate: Nessun CI workflow per concept checks gate
- [ ] **WARN-016** [FILOSOFIA_CONCEPT_CHECKS] ASSERT_CI_INTEGRATED: Nessun CI workflow - concept checks non integrati
- [ ] **WARN-018** [FILOSOFIA_FRONTEND_UI] RULE_RIGHT_RAIL_PURPOSE: MatchPage non ha RightRail/sidebar per odds sempre visibili
- [ ] **WARN-019** [FILOSOFIA_FRONTEND_UI] RULE_NO_NULL_DISPLAY: HomePage.jsx mostra N/A o placeholder (backend must provide value)
- [ ] **WARN-020** [FILOSOFIA_FRONTEND_UI] RULE_NO_NULL_DISPLAY: MomentumTab.jsx mostra N/A o placeholder (backend must provide value)
- [ ] **WARN-021** [FILOSOFIA_FRONTEND_UI] RULE_NO_NULL_DISPLAY: OverviewTab.jsx mostra N/A o placeholder (backend must provide value)
- [ ] **WARN-022** [FILOSOFIA_FRONTEND_UI] RULE_NO_NULL_DISPLAY: PredictorTab.jsx mostra N/A o placeholder (backend must provide value)

> ✅ WARN-004, WARN-010, WARN-012, WARN-013, WARN-014, WARN-017, WARN-023 risolti (vedi README.md v3.2.3)

### 📈 Statistiche per Filosofia

| Filosofia                           | Pass | Errori | Warning | Rate    |
| ----------------------------------- | ---- | ------ | ------- | ------- |
| FILOSOFIA_DB                        | 18   | 6      | 1       | 🟡 72%  |
| FILOSOFIA_TEMPORAL                  | 16   | 1      | 0       | 🟢 94%  |
| FILOSOFIA_CALCOLI                   | 21   | 1      | 0       | 🟢 95%  |
| FILOSOFIA_STATS                     | 17   | 0      | 1       | 🟢 94%  |
| FILOSOFIA_PBP_EXTRACTION            | 14   | 0      | 2       | 🟢 88%  |
| FILOSOFIA_FRONTEND_DATA_CONSUMPTION | 16   | 0      | 3       | 🟢 84%  |
| FILOSOFIA_MADRE_TENNIS              | 15   | 0      | 2       | 🟢 88%  |
| FILOSOFIA_LINEAGE_VERSIONING        | 15   | 0      | 1       | 🟢 94%  |
| FILOSOFIA_OBSERVABILITY_DATAQUALITY | 3    | 0      | 1       | 🟡 75%  |
| FILOSOFIA_REGISTRY_CANON            | 14   | 0      | 3       | 🟢 82%  |
| FILOSOFIA_LIVE_TRACKING             | 18   | 0      | 0       | 🟢 100% |
| FILOSOFIA_ODDS                      | 20   | 0      | 0       | 🟢 100% |
| FILOSOFIA_RISK_BANKROLL             | 27   | 0      | 0       | 🟢 100% |
| FILOSOFIA_CONCEPT_CHECKS            | 25   | 0      | 2       | 🟢 93%  |
| FILOSOFIA_FRONTEND_UI               | 21   | 0      | 7       | 🟡 75%  |

---

## 📝 TODO CONSOLIDATI DA ALTRI DOCUMENTI

### TODO dal Codice

| #   | File                                          | Linea    | TODO                                   |
| --- | --------------------------------------------- | -------- | -------------------------------------- |
| 1   | `src/components/match/tabs/OddsTab.jsx`       | 258, 262 | UI implemented; **handleBack/handleLay** logic pending |
| 2   | `src/components/match/tabs/StrategiesTab.jsx` | 389      | UI enhancements implemented; **strategy execution** logic pending |
| 3   | `backend/server.js`                           | 4801     | Get full history                       |
| 4   | `backend/services/dataNormalizer.js`          | 765      | Integrare con database player registry |

### TODO dalle Filosofie

| #   | Documento                              | TODO                                                    |
| --- | -------------------------------------- | ------------------------------------------------------- |
| 1   | FILOSOFIA_RISK_BANKROLL.md             | riskEngine.js (TODO) - Risk layer completo              |
| 2   | FILOSOFIA_RISK_BANKROLL.md             | integrate predictor nel model_prob                      |
| 3   | FILOSOFIA_FRONTEND.md                  | oddsService.js - Implied prob, fair odds, edge — **IMPLEMENTED** (`features/odds.js`)          |
| 4   | FILOSOFIA_FRONTEND.md                  | predictorService.js - Win prob avanzata, edge vs market |
| 5   | FILOSOFIA_OBSERVABILITY_DATAQUALITY.md | send to logging service (CloudWatch, Datadog)           |
| 6   | FILOSOFIA_OBSERVABILITY_DATAQUALITY.md | send to alert service                                   |

### TODO da Deep Philosophy Check

| #   | Filosofia     | Tipo        | File                  | Descrizione           |
| --- | ------------- | ----------- | --------------------- | --------------------- |
| 1   | BANKROLL      | EXPORT_TODO | riskEngine.js         | kellyFractional       |
| 2   | OBSERVABILITY | EXPORT_TODO | dataQualityChecker.js | calculateCompleteness |
| 3   | OBSERVABILITY | EXPORT_TODO | dataQualityChecker.js | detectOutliers        |
| 4   | OBSERVABILITY | EXPORT_TODO | dataQualityChecker.js | checkConsistency      |

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

_Generato automaticamente da `philosophyEnforcer.js` - 2025-12-28_

---

## 🔍 Report Check Mappa (Auto-generato)

> Ultimo check: 2025-12-29
> Esegui: `node scripts/checkConceptualMap.js`

| Metrica | Valore |
|---------|--------|
| Check totali | 148 |
| ✅ Passati | 117 |
| ❌ Falliti | 21 |
| ⚠️ Warning | 10 |
| 📄 Non doc | 4 |
| 🏗️ Arch viol | 1 |

### Violazioni Architetturali

- 🔴 **BUNDLE_ENDPOINT**: Endpoint /api/match/:id/bundle deve esistere
  - File: `backend/server.js`
  - Ref: docs/filosofie/10_data_platform/storage/FILOSOFIA_DB.md#sezione-3

### File Mancanti

✅ Tutti i file mancanti sono stati creati (migrati a README.md v3.2.3)

### File Non Documentati

✅ Tutti i file sono stati documentati (migrati a README.md v3.2.3)

---

## ✅ RISOLTI

> I fix completati sono stati migrati al changelog in `README.md` sezione v3.2.3 (30 Dic 2025)

---

_Generato automaticamente da `philosophyEnforcer.js` - 2025-12-30_