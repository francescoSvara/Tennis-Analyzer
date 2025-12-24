# 📋 TODO LIST – Tennis Analyzer v3.0

> **Ultimo aggiornamento**: 24 Dicembre 2025  
> **Stato Check**: 20 errori, 25 warning, 30 info  
> **Check Mappa**: 112 passati, 0 falliti, 2 warning arch

---

## ✅ COMPLETATI (24 Dicembre 2025)

### Documentazione Architetturale
- [x] **FILOSOFIA_CALCOLI_V1** - Creata nuova filosofia Feature Library & Calculation Standards
  - Tassonomia completa calcoli per dominio (Match State, Pressure, Break, Volatility, Dominance)
  - Standard uniformi (input/output, fallback chain, range, determinismo)
  - Schede feature operative con edge cases e test fixtures
  - Convenzione naming "break" (breakProbability vs breakPoints vs breakPointConversion)
  - Ownership moduli e regole dipendenza
- [x] **Collegamenti documentazione** - Integrato FILOSOFIA_CALCOLI_V1 in:
  - INDEX_FILOSOFIE.md (Logic Layer + mappa visuale)
  - MAPPA_RETE_CONCETTUALE_V2.md (tabella documenti + domini)
  - FILOSOFIA_STATS_V3.md (navigazione + riferimento Feature Engine)
  - HPI_RESILIENCE.md (navigazione + link Feature Library)

### Migrazione Feature Library (24 Dic 2025)
- [x] **featureEngine.js** - Verificata fallback chain completa per tutte le features
  - ✅ `calculateVolatility` → powerRankings → score → default
  - ✅ `calculatePressure` → statistics → score → default
  - ✅ `breakProbability` → statistics → odds/rankings → default
- [x] **dataSource flags** - Aggiunto trasparenza origine dati in `computeFeatures()`
  - Ogni feature ora ha `*Source` flag: 'live' | 'statistics' | 'score' | 'odds' | 'rankings' | 'estimated'
  - Esempio: `volatility`, `volatilitySource`, `pressure`, `pressureSource`, ecc.
- [x] **Test fixtures** - Creato `test/features/volatility.test.js`
  - Test per high/low volatility con diversi input
  - Test fallback chain (powerRankings → score → default)
  - Test dataSource transparency
  - Export fixtures riutilizzabili
- [x] **Naming convention** - Verificato corretto uso nel codice:
  - `breakProbability` = probabilità 0-100 ✅
  - `breakPointsWon`, `breakPointsTotal` = conteggi int ✅
  - Non esiste `breakPointConversion` (da implementare se necessario)
- [x] **Deprecation frontend utils** - Creato `docs/specs/DEPRECATION_FRONTEND_UTILS.md`
  - Tabella funzioni deprecate con rimpiazzi bundle.*
  - Pattern corretto di consumo (prima/dopo)
  - Documentazione dataSource flags
  - ⚠️ calculateVolatility già deprecata in utils.js con link a CALCOLI_V1

### Fix Alto Impatto
- [x] **StrategiesPanel.jsx** - Spostato consumo strategie dal frontend al backend
  - Ora usa `bundle.tabs.strategies.signals` invece di importare funzioni da utils.js
  - Rimossi import `analyzeLayTheWinner`, `analyzeBancaServizio`, `analyzeSuperBreak`
  - **Errori scesi da 26 a 20** (-6 errori relativi a strategy)

### Fix Basso Impatto
- [x] **INV-008** - Rimossi `localhost:3001` hardcoded da `useMatchBundle.jsx` - ora usa `WS_URL` da config
- [x] **Logger utility** - Creato `backend/utils/logger.js` per sostituire console.log strutturato
- [x] **INV-007** - Migrati console.log a logger in:
  - `matchCardService.js` (7 fix)
  - `playerProfileService.js` (8 fix)  
  - `calculationQueueWorker.js` (4 fix)
  - `unifiedImporter.js` (15 fix)
  - `rawEventsProcessor.js` (10 fix)
  - **INFO scesi da 56 a 30** (-26)
- [x] **INV-006 deprecated** - Aggiunti `@deprecated` comments a `calculateVolatility`, `calculateElasticity`, `classifyMatchCharacter` con supporto per dati pre-calcolati dal backend

---

## 🔴 ALTA PRIORITÀ – Violazioni Architetturali (20 errori)

### 1. Calcoli Backend nel Frontend (14 errori in utils.js)
- [ ] `src/utils.js` - Calcoli dominio da spostare nel backend
  - L404, L455: `calculateVolatility`, `calculateElasticity` (definizioni)
  - L515-516, L592-593: chiamate a volatility/elasticity
  - L1709, L2131: `calculatePressure`
  - L2390-2391, L2760: altri calcoli
  - L2856, L2911: `calculateDataCompleteness`

### 2. Funzioni strategia residue (3 errori in utils.js)
- [ ] `src/utils.js:1799` - `analyzeLayTheWinner` (non più usata da componenti)
- [ ] `src/utils.js:2029` - `analyzeBancaServizio` (non più usata)
- [ ] `src/utils.js:2224` - `analyzeSuperBreak` (non più usata)
> ⚠️ Queste funzioni sono deprecate ma ancora presenti nel file. Possono essere rimosse quando non ci sono più riferimenti esterni.

### 3. Fetch separati (3 errori)
- [ ] `src/components/StrategiesPanel.jsx:411-412` - Fetch player stats separato
- [ ] `src/hooks/useMatchCard.jsx:205` - Fetch separato invece di bundle

---

## 🟠 PROSSIMI PASSI – Completamento Migrazione

### Rimozione duplicati frontend
- [ ] **src/utils.js** - Aggiungere `@deprecated` JSDoc completi a:
  - `calculatePressureIndex()` → bundle.header.features.pressure
  - `calculateHPI()` → bundle.tabs.stats.hpi (futuro)
  - `calculatePressurePerformance()` → bundle.tabs.stats (futuro)
  - ⚠️ Blocco tecnico: caratteri speciali impediscono replace automatico
  - ✅ Documentato in DEPRECATION_FRONTEND_UTILS.md
- [ ] **Componenti UI** - Rimuovere import funzioni calcolo da utils.js
  - Audit import di calculateVolatility, calculatePressure, calculateHPI nei componenti
  - Sostituire con bundle.header.features.*
- [ ] **Backend HPI** - Implementare HPI nel backend featureEngine.js
  - Integrare calculatePressureIndex da pressureCalculator.js
  - Esporre in bundle.tabs.stats.hpi

---

## 🟡 MEDIA PRIORITÀ – Warning (25)

### INV-006 Feature Engine duplicato (12 warning)
Le funzioni esistono sia nel frontend che backend. Soluzioni:
1. Rimuovere completamente dal frontend e usare `bundle.header.features`
2. Oppure modificare chiamate per passare `preComputed` dal bundle

### HPI_IN_FRONTEND (13 warning)  
`calculateHPI`, `calculateBreakResilience` in frontend - dovrebbero leggere da `bundle.tabs.stats`

---

## 🔵 BASSA PRIORITÀ – Info (30 restanti)

### INV-007 console.log cleanup
- [ ] Migrare restanti ~30 console.log a logger strutturato
- File principali rimanenti:
  - `backend/services/dataNormalizer.js`
  - `backend/services/strategyStatsService.js`
  - Altri file minori

---

## 📊 PRINCIPIO FONDAMENTALE

> **"Mostrare dati = Calcolare dati"**
> 
> MAI restituire null, 0, o fallback statici.
> Un match ha SEMPRE: score, odds, rankings → si può SEMPRE calcolare tutto.
>
> Vedi [FILOSOFIA_CALCOLI_V1](filosofie/FILOSOFIA_CALCOLI_V1.md) per contratto operativo completo.

---

## 🛠️ Comandi Utili

```bash
# Verifica architettura
node scripts/runConceptChecks.js

# Verifica mappa concettuale
node scripts/checkConceptualMap.js

# Avvia backend
cd backend && node server.js

# Avvia frontend
npm run dev
```

---

## 📈 Progresso

| Metrica | Prima | Dopo | Delta |
|---------|-------|------|-------|
| Errori | 26 | 20 | -6 |
| Warning | 25 | 25 | 0 |
| Info | 56 | 30 | -26 |
| Check Mappa Passati | 112 | 112 | ✓ |
| Check Mappa Falliti | 0 | 0 | ✓ |


