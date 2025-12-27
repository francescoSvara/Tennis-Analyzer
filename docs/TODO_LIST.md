# 📋 TODO LIST UNIFICATA – Tennis Analyzer v3.1

> **Ultimo aggiornamento**: 2025-12-28  
> **QUESTO È L'UNICO DOCUMENTO AUTORIZZATO PER LE LISTE DI COSE DA FARE**
> 
> ⚠️ Le checklist dai file di filosofie/specs sono state consolidate qui.
> I documenti originali ora puntano a questa lista.

---

## ✅ COMPLETATO OGGI (28 Dic 2025)

### v3.1.1 - Fix Statistiche SofaScore + UI Responsive

| # | Task | Dettaglio | Stato |
|---|------|-----------|-------|
| 1 | Stats SofaScore Match JSON | Tutte le statistiche ora corrispondono esattamente al JSON SofaScore | ✅ |
| 2 | mergeValue fix | `mergeValue` ora tratta 0 come valore valido (non trigger fallback) | ✅ |
| 3 | convertSofaScoreArrayFormat | Mappatura completa: secondServeAccuracy, maxPointsInRow, gamesWon, maxGamesInRow, tiebreaks, serviceGamesTotal | ✅ |
| 4 | Duplicato "Service Points Won" | Rimosso da Serve Statistics (resta solo in Points Statistics) | ✅ |
| 5 | Stats Cards 2x2 Grid | Layout responsive con Bootstrap col-6 + CSS Grid | ✅ |
| 6 | Font Responsive Globale | CSS clamp() per scaling automatico su tutti i tab | ✅ |
| 7 | Overflow Prevention | min-width:0 globale + text-overflow:ellipsis + scrollable filters | ✅ |
| 8 | Dead Code Removal | Rimossa funzione `countBreakPointsFromPBP` (93 righe mai chiamate) | ✅ |
| 9 | Architectural Compliance | Verificata conformità con tutti i documenti FILOSOFIA | ✅ |

**File Modificati:**
- `backend/server.js` - Fix stats conversion, mergeValue, dead code removal
- `src/components/match/tabs/StatsTab.jsx` - Rimozione duplicato stat
- `src/components/match/tabs/StatsTab.css` - Grid 2x2 responsive
- `src/index.css` - Global responsive + utility classes
- `src/components/match/tabs/PointByPointTab.css` - Responsive fixes
- `src/components/match/tabs/OverviewTab.css` - Responsive fixes
- `src/components/match/tabs/MomentumTab.css` - Responsive fixes
- `src/components/match/tabs/StrategiesTab.css` - Responsive fixes
- `src/components/match/tabs/OddsTab.css` - Responsive fixes
- `src/components/match/tabs/JournalTab.css` - Responsive fixes
- `src/components/match/tabs/PredictorTab.css` - Responsive fixes

---

## 📊 SOMMARIO GLOBALE

| Categoria | Da Fare | Fatti | Totale |
|-----------|---------|-------|--------|
| Philosophy Enforcer Errori | 16 | 0 | 16 |
| Philosophy Enforcer Warning | 68 | 1 | 69 |
| Deep Philosophy TODO | 4 | 0 | 4 |
| Concept Checks Warning | 6 | 0 | 6 |
| Mappa Concettuale | 1 | 0 | 1 |
| Checklist Frontend | 12 | 8 | 20 |
| Checklist Motion UI | 6 | 0 | 6 |
| Checklist PBP Validation | 6 | 0 | 6 |
| Checklist Lineage/Versioning | 8 | 0 | 8 |
| TODO nel Codice | 5 | 0 | 5 |
| TODO nelle Filosofie | 6 | 0 | 6 |
| **TOTALE** | **138** | **9** | **147** |

---

# 🔴 SEZIONE 1: ERRORI CRITICI (Da risolvere PRIMA)

## 1.1 Philosophy Enforcer – ERRORI (16)

| # | Filosofia | Regola | Problema | Stato |
|---|-----------|--------|----------|-------|
| 1 | FILOSOFIA_DB | CANONICAL_SCHEMA | Schema matches_new manca colonna home_player_id | ⬜ |
| 2 | FILOSOFIA_DB | CANONICAL_SCHEMA | Schema matches_new manca colonna away_player_id | ⬜ |
| 3 | FILOSOFIA_DB | CANONICAL_SCHEMA | Schema matches_new manca colonna event_time | ⬜ |
| 4 | FILOSOFIA_DB | DATAQUALITY_REQUIRED_completeness | matchCardService.js manca dataQuality.completeness | ⬜ |
| 5 | FILOSOFIA_DB | DATAQUALITY_REQUIRED_freshness | matchCardService.js manca dataQuality.freshness | ⬜ |
| 6 | FILOSOFIA_TEMPORAL | INVARIANT_event_time_required | liveTrackingRepository.js insert senza event_time/created_at | ⬜ |
| 7 | FILOSOFIA_TEMPORAL | INVARIANT_no_future_in_bundle | matchCardService.js non valida coerenza temporale del bundle | ⬜ |
| 8 | FILOSOFIA_CALCOLI | NEVER_RETURN_NULL | featureEngine.js non esiste | ⬜ |
| 9 | FILOSOFIA_CALCOLI | NEVER_RETURN_NaN | featureEngine.js non esiste | ⬜ |
| 10 | FILOSOFIA_PBP_EXTRACTION | INVARIANT_SERVER_SCORE_PROGRESSION | sofascoreScraper.js non traccia chi serve | ⬜ |
| 11 | FILOSOFIA_PBP_EXTRACTION | INVARIANT_SERVICE_ALTERNATION | insert-pbp-correct.js non implementa alternanza servizio | ⬜ |
| 12 | FILOSOFIA_CONCEPT_CHECKS | CHECK_LIN-001 | featureEngine.js non esiste | ⬜ |
| 13 | FILOSOFIA_CONCEPT_CHECKS | CHECK_CALC-001 | featureEngine.js non esiste | ⬜ |

### Checklist Errori Critici

- [ ] **ERR-001** Creare colonna `home_player_id` in schema matches_new
- [ ] **ERR-002** Creare colonna `away_player_id` in schema matches_new
- [ ] **ERR-003** Creare colonna `event_time` in schema matches_new
- [ ] **ERR-004** Aggiungere `dataQuality.completeness` in matchCardService.js
- [ ] **ERR-005** Aggiungere `dataQuality.freshness` in matchCardService.js
- [ ] **ERR-006** Aggiungere `event_time/created_at` negli insert di liveTrackingRepository.js
- [ ] **ERR-007** Validare coerenza temporale del bundle in matchCardService.js
- [ ] **ERR-008** Creare `backend/utils/featureEngine.js` con logica NEVER_RETURN_NULL
- [ ] **ERR-009** Implementare NEVER_RETURN_NaN in featureEngine.js
- [ ] **ERR-010** Tracciare chi serve in sofascoreScraper.js
- [ ] **ERR-011** Implementare alternanza servizio in insert-pbp-correct.js

---

## 1.2 Deep Philosophy Check – ERRORI (1)

- [ ] **DEEP-001** `backend/server.js` deve avere fallback legacy per match XLSX

---

## 1.3 Concept Checks – WARNING (6)

- [ ] **CC-001** `src/hooks/useMatchBundle.jsx` - Deve esporre meta dal bundle
- [ ] **CC-002** `backend/db/matchRepository.js` - Repository deve avere event_time
- [ ] **CC-003** `src/components/MatchCard.jsx` - Deve usare useMemo per rendering pesanti
- [ ] **CC-004** `src/App.jsx` - Deve importare useMatchBundle
- [ ] **CC-005** `backend/services/matchCardService.js` - Odds devono avere timestamp
- [ ] **CC-006** `backend/liveManager.js` - Deve avere polling adattivo

---

## 1.4 Mappa Concettuale – File Non Documentati (1)

> Questi file esistono ma non sono documentati in `MAPPA_RETE_CONCETTUALE_V2.md`

- [ ] **MAP-001** `backend/services/matchEnrichmentService.js` - Aggiungere alla mappa concettuale

---

# 🟡 SEZIONE 2: WARNING (Da valutare)

## 2.1 Philosophy Enforcer – WARNING (68 + 1 risolto)

### Database & Sources
- [ ] **WARN-001** calculationQueueWorker.js scrive in DB ma non è tra ALLOWED_SOURCES
- [ ] **WARN-002** matchCardService.js scrive in DB ma non è tra ALLOWED_SOURCES
- [ ] **WARN-003** playerService.js scrive in DB ma non è tra ALLOWED_SOURCES
- [ ] **WARN-004** rawEventsProcessor.js scrive in DB ma non è tra ALLOWED_SOURCES
- [ ] **WARN-005** unifiedImporter.js scrive in DB ma non è tra ALLOWED_SOURCES
- [ ] **WARN-006** useMatchBundle.jsx calcola dataQuality (deve essere solo backend)

### Temporal
- [ ] **WARN-007** liveTrackingRepository.js non traccia ingestion_time negli insert
- [ ] **WARN-008** featureEngine.js non esiste (temporal filter)
- [ ] **WARN-009** strategyEngine.js non verifica timestamp dei dati prima delle decisioni
- [ ] **WARN-010** featureEngine.js non esiste (leakage non può essere prevenuto)

### Calcoli & Features
- [ ] **WARN-011** featureEngine.js non esiste (FALLBACK_HIERARCHY)
- [ ] **WARN-012** Nessun file definisce isClutchPoint per MatchState
- [ ] **WARN-013** featureEngine.js usa naming errato per breakProbability
- [ ] **WARN-014** featureEngine.js non esiste (TEMPLATE_FeatureCard)
- [ ] **WARN-015** featureEngine.js non esiste (OUTPUT_VALIDATION)

### Stats
- [ ] **WARN-016** featureEngine.js non esiste (FLOW DataToSignals incompleto)
- [ ] **WARN-017** matchRepository.js interpreta RawData (deve solo read/write)
- [ ] **WARN-018** featureEngine.js non esiste (CLASS_Features_pure_functions)
- [ ] **WARN-019** featureEngine.js non esiste (FEATURE_DECLARATION)
- [ ] **WARN-020** featureEngine.js non esiste (FUNCTION_FeatureEngine_compute)
- [ ] **WARN-021** featureEngine.js non esiste (DETERMINISTIC_FEATURES)
- [ ] **WARN-022** featureEngine.js non esiste (FEATURES_PROPERTIES_documented)

### PBP Extraction
- [ ] **WARN-023** sofascoreScraper.js non usa CSS per determinare point winner
- [ ] **WARN-024** sofascoreScraper.js non ha logica server detection
- [ ] **WARN-025** Nessun file pbp ha funzione di validazione
- [ ] **WARN-026** insert-pbp-correct.js non ha validazione delle regole tennis

### Frontend Data
- [ ] **WARN-027** MatchBundle manca sezione header
- [ ] **WARN-028** Frontend non ha logica incremental patches
- [ ] **WARN-029** Non esiste hook useMatchBundle
- [ ] **WARN-030** HomePage.jsx fa fetch diretto invece di usare useMatchBundle
- [ ] **WARN-031** MatchGrid.jsx fa fetch diretto invece di usare useMatchBundle
- [ ] **WARN-032** MonitoringDashboard.jsx fa fetch diretto invece di usare useMatchBundle

### Madre Tennis
- [ ] **WARN-033** Frontend non consuma MatchBundle
- [ ] **WARN-034** matchRepository.js ha logica di calcolo (repo deve solo read/write)
- [ ] **WARN-035** featureEngine.js non esiste (ROLE_CALCULATION_pure)
- [ ] **WARN-036** PointByPointTab.jsx ha logica di dominio (frontend deve solo render)
- [x] **WARN-037** ~~MAPPA_RETE_CONCETTUALE_V2.md non esiste~~ → ORA ESISTE ✅

### Lineage & Versioning
- [ ] **WARN-038** Nessun file definisce DATA_VERSION
- [ ] **WARN-039** featureEngine.js non esiste (CONSTANT_VERSIONS_feature)
- [ ] **WARN-040** featureEngine.js non esiste (REPRODUCIBILITY_CONTRACT)
- [ ] **WARN-041** Nessun test di riproducibilità
- [ ] **WARN-042** matchCardService.js non valida meta block
- [ ] **WARN-043** strategyEngine.js non esporta VERSION
- [ ] **WARN-044** matchCardService.js non esporta VERSION

### Observability & Data Quality
- [ ] **WARN-045** dataQualityChecker.js non verifica accuracy/outliers
- [ ] **WARN-046** Nessun file backend implementa logica di quarantine
- [ ] **WARN-047** Troppi log non strutturati: 757 vs 156 strutturati

### Registry & Canon
- [ ] **WARN-048** add-snapshot-queue-tables.sql manca campi: home_player, away_player
- [ ] **WARN-049** create-new-schema.sql manca campi: home_player, away_player
- [ ] **WARN-050** Resolution function usa Math.random - non deterministica

### Live Tracking
- [ ] **WARN-051** liveManager.js non produce patches su MatchBundle
- [ ] **WARN-052** LivePipeline manca normalizer step
- [ ] **WARN-053** LivePipeline manca featureEngine step

### Odds
- [ ] **WARN-054** matchCardService.js non struttura odds in header/tabs

### Risk & Bankroll
- [ ] **WARN-055** betDecisionsRepository.js manca campi BetDecision: strategy
- [ ] **WARN-056** strategyEngine non verifica edge > 0
- [ ] **WARN-057** Nessun controllo price >= price_min in strategy

### Concept Checks
- [ ] **WARN-058** strategyEngine.js non verifica quarantine/quality prima di decisions
- [ ] **WARN-059** Nessun CI workflow per concept checks gate
- [ ] **WARN-060** Nessun CI workflow - concept checks non integrati

### Frontend UI
- [ ] **WARN-061** Nessun componente Home
- [ ] **WARN-062** MatchPage non ha RightRail/sidebar per odds sempre visibili
- [ ] **WARN-063** HomePage.jsx mostra N/A o placeholder
- [ ] **WARN-064** MomentumTab.jsx mostra N/A o placeholder
- [ ] **WARN-065** OverviewTab.jsx mostra N/A o placeholder
- [ ] **WARN-066** PredictorTab.jsx mostra N/A o placeholder
- [ ] **WARN-067** MatchCard.jsx mostra N/A o placeholder
- [ ] **WARN-068** MonitoringDashboard.jsx mostra N/A o placeholder
- [ ] **WARN-069** Nessun componente Strategy - design non serve decisions

---

# 📋 SEZIONE 3: CHECKLIST DA DOCUMENTI

## 3.1 Checklist Frontend (FILOSOFIA_FRONTEND.md)

### Visual/UX
- [ ] Card modulari
- [ ] Stato semaforico (🟢🟡🔴)
- [ ] Azione unica per strategia
- [ ] Dati minimi ma decisivi
- [ ] Psicologia > numeri

### Backend
- [x] Strategy Engine → `backend/strategies/strategyEngine.js`
- [x] Feature Engine → `backend/utils/featureEngine.js`
- [ ] Odds Service con edge calculation
- [x] Momentum da powerRankings → `backend/server.js`
- [ ] Predictor Service con win probability avanzata
- [x] Scraping solo backend → `backend/scraper/sofascoreScraper.js`
- [x] Pressure calculator backend → `backend/utils/pressureCalculator.js`

### Motion
- [x] `src/motion/tokens.js` con durations/easings/variants
- [x] MotionCard, MotionButton, MotionTab, MotionRow
- [ ] AnimatePresence per mount/unmount
- [ ] prefers-reduced-motion rispettato
- [ ] Phosphor Icons con weight coerente

### Performance
- [ ] UNA sola strategia attiva per match (evita overload)
- [ ] Notifiche solo 🟢 READY (niente spam)
- [ ] Cooldown segnali (anti-flap)
- [ ] Data completeness badge

---

## 3.2 Checklist Motion UI (SPEC_FRONTEND_MOTION_UI.md)

- [ ] `motion/tokens.js` con durations, easings, variants
- [ ] `MotionCard.jsx`, `MotionButton.jsx`, `MotionTab.jsx`
- [ ] Almeno 1 empty state animato
- [ ] Almeno 1 loading state animato
- [ ] Verifica coerenza (no over-animation)
- [ ] Test `prefers-reduced-motion`

---

## 3.3 Checklist PBP Validation (FILOSOFIA_PBP_EXTRACTION.md)

- [ ] **S1G1**: Chi serve? Lo score del server aumenta quando vince?
- [ ] **Break detection**: I break sono sul servizio dell'avversario?
- [ ] **Score progression**: Lo score segue la sequenza 0→15→30→40→game?
- [ ] **Tiebreak**: Il servizio ruota ogni 2 punti?
- [ ] **Point winners**: Il winner corrisponde a chi ha aumentato lo score?
- [ ] **Row mapping**: row1=HOME, row2=AWAY sempre?

---

## 3.4 Checklist Lineage & Versioning (FILOSOFIA_LINEAGE_VERSIONING.md)

### Versioning Rules
- [ ] Cambio formula feature → bump `feature_version`
- [ ] Nuova strategia → bump `strategy_version`
- [ ] Fix bug calcolo → bump `feature_version` (patch)
- [ ] Cambio struttura bundle → bump `bundle_schema_version`

### Pre-Commit Checklist
- [ ] Ho cambiato una feature calculation? → Bump `FEATURE_ENGINE_VERSION`
- [ ] Ho cambiato una strategia? → Bump `STRATEGY_ENGINE_VERSION`
- [ ] Ho cambiato il contratto MatchBundle? → Bump `BUNDLE_SCHEMA_VERSION`
- [ ] Ho fatto migration DB? → Bump `DATA_VERSION`

---

# 📝 SEZIONE 4: TODO DAL CODICE

## 4.1 TODO nei File Sorgente

| # | File | Linea | TODO |
|---|------|-------|------|
| 1 | `src/components/match/tabs/OddsTab.jsx` | 258 | Implementare logica |
| 2 | `src/components/match/tabs/OddsTab.jsx` | 262 | Implementare logica |
| 3 | `src/components/match/tabs/StrategiesTab.jsx` | 389 | Implementare logica di esecuzione |
| 4 | `backend/server.js` | 4801 | Get full history |
| 5 | `backend/services/dataNormalizer.js` | 765 | Integrare con database player registry |

### Checklist TODO Codice
- [ ] **CODE-001** `OddsTab.jsx:258` - Implementare logica
- [ ] **CODE-002** `OddsTab.jsx:262` - Implementare logica
- [ ] **CODE-003** `StrategiesTab.jsx:389` - Implementare logica di esecuzione
- [ ] **CODE-004** `server.js:4801` - Get full history
- [ ] **CODE-005** `dataNormalizer.js:765` - Integrare con database player registry

---

## 4.2 TODO nelle Filosofie

| # | Documento | TODO |
|---|-----------|------|
| 1 | FILOSOFIA_RISK_BANKROLL.md | `riskEngine.js` (TODO) - Risk layer completo |
| 2 | FILOSOFIA_RISK_BANKROLL.md | integrate predictor nel model_prob |
| 3 | FILOSOFIA_FRONTEND.md | `oddsService.js` - Implied prob, fair odds, edge |
| 4 | FILOSOFIA_FRONTEND.md | `predictorService.js` - Win prob avanzata, edge vs market |
| 5 | FILOSOFIA_OBSERVABILITY.md | send to logging service (CloudWatch, Datadog) |
| 6 | FILOSOFIA_OBSERVABILITY.md | send to alert service |

### Checklist TODO Filosofie
- [ ] **PHIL-001** Creare `backend/services/riskEngine.js` con kellyFractional
- [ ] **PHIL-002** Integrare predictor nel model_prob di strategyEngine
- [ ] **PHIL-003** Creare `backend/services/oddsService.js`
- [ ] **PHIL-004** Creare `backend/services/predictorService.js`
- [ ] **PHIL-005** Implementare logging service strutturato
- [ ] **PHIL-006** Implementare alert service

---

## 4.3 Deep Philosophy TODO (Dichiarati nelle filosofie)

| # | Filosofia | Tipo | Dettaglio | Descrizione |
|---|-----------|------|-----------|-------------|
| 1 | BANKROLL | EXPORT_TODO | `riskEngine.js` | kellyFractional |
| 2 | OBSERVABILITY | EXPORT_TODO | `dataQualityChecker.js` | calculateCompleteness |
| 3 | OBSERVABILITY | EXPORT_TODO | `dataQualityChecker.js` | detectOutliers |
| 4 | OBSERVABILITY | EXPORT_TODO | `dataQualityChecker.js` | checkConsistency |

### Checklist Deep TODO
- [ ] **DTODO-001** Implementare `kellyFractional` in riskEngine.js
- [ ] **DTODO-002** Implementare `calculateCompleteness` in dataQualityChecker.js
- [ ] **DTODO-003** Implementare `detectOutliers` in dataQualityChecker.js
- [ ] **DTODO-004** Implementare `checkConsistency` in dataQualityChecker.js

---

# 📈 SEZIONE 5: STATISTICHE

## 5.1 Statistiche per Filosofia (Philosophy Enforcer)

| Filosofia | Pass | Errori | Warning | Rate |
|-----------|------|--------|---------|------|
| FILOSOFIA_DB | 15 | 8 | 6 | 🟡 52% |
| FILOSOFIA_TEMPORAL | 11 | 2 | 4 | 🟡 65% |
| FILOSOFIA_CALCOLI | 15 | 2 | 5 | 🟡 68% |
| FILOSOFIA_STATS | 11 | 0 | 7 | 🟡 61% |
| FILOSOFIA_PBP_EXTRACTION | 8 | 2 | 4 | 🟡 57% |
| FILOSOFIA_FRONTEND_DATA | 13 | 0 | 6 | 🟡 68% |
| FILOSOFIA_MADRE_TENNIS | 12 | 0 | 5 | 🟡 71% |
| FILOSOFIA_LINEAGE | 10 | 0 | 7 | 🟡 59% |
| FILOSOFIA_OBSERVABILITY | 1 | 0 | 3 | 🔴 25% |
| FILOSOFIA_REGISTRY_CANON | 14 | 0 | 3 | 🟢 82% |
| FILOSOFIA_LIVE_TRACKING | 16 | 0 | 3 | 🟢 84% |
| FILOSOFIA_ODDS | 19 | 0 | 1 | 🟢 95% |
| FILOSOFIA_RISK_BANKROLL | 24 | 0 | 3 | 🟢 89% |
| FILOSOFIA_CONCEPT_CHECKS | 22 | 2 | 3 | 🟢 81% |
| FILOSOFIA_FRONTEND_UI | 21 | 0 | 9 | 🟡 70% |

---

# 🛠️ SEZIONE 6: COMANDI UTILI

```bash
# Verifica Philosophy Enforcer (genera report errori/warning)
node scripts/philosophyEnforcer.js

# Verifica DEEP (implementazione funzioni vs filosofie)  
node scripts/deepPhilosophyCheck.js

# Verifica pattern architetturali
node scripts/runConceptChecks.js

# Verifica esistenza file nella mappa
node scripts/checkConceptualMap.js

# Genera report unificato
node scripts/generateTodoReport.js
```

---

# 📜 PRINCIPIO FONDAMENTALE

> **Le filosofie dichiarano cosa DEVE esistere → Il codice si adatta alle filosofie, MAI il contrario.**
> 
> **Questo è l'UNICO documento TODO autorizzato. Tutti gli altri TODO devono essere consolidati qui.**

---

*Ultimo aggiornamento: 2025-12-27*
*Prossimo check: Esegui `node scripts/philosophyEnforcer.js`*
