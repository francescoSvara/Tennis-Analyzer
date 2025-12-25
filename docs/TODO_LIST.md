# 📋 TODO LIST – Tennis Analyzer v3.0

> **Ultimo aggiornamento**: 25 Dicembre 2025  
> **Deep Philosophy Check**: 🔴 9 errori, 📋 3 TODO  
> **Concept Checks**: 0 errori, 8 warning ✅  
> **Check Mappa**: 125 passati, 0 falliti ✅

---

## 📊 STATO COMPLESSIVO

```
🔴 DEEP-CHECK:   9 errori (pattern architetturali da implementare)
📋 TODO-FILOS:   3 elementi dichiarati "da fare" nelle filosofie
✅ CONCEPT:      0 errori, 8 warning
✅ MAPPA:      125 file verificati esistenti
```

> **PRINCIPIO FONDAMENTALE:**
> Le filosofie dichiarano cosa DEVE esistere → Il codice si adatta alle filosofie, MAI il contrario.

**⚠️ Comandi check:**
```bash
node scripts/deepPhilosophyCheck.js   # Verifica implementazione filosofie
node scripts/runConceptChecks.js      # Verifica pattern architetturali  
node scripts/checkConceptualMap.js    # Verifica esistenza file
```

---

## 🔬 Problemi Deep Philosophy Check (9 rimanenti)

> Ultimo check: 2025-12-25
> Esegui: `node scripts/deepPhilosophyCheck.js`

### 🔴 TEMPORAL SEMANTICS (3 errori)

| ID | File | Problema | Fix |
|----|------|----------|-----|
| DEEP-002 | `backend/liveManager.js` | Manca pattern `ingestion_time`, `event_time` | Aggiungere timestamps semantici |
| DEEP-003 | `backend/utils/featureEngine.js` | Manca supporto `as_of_time` | Aggiungere parametro anti-leakage |
| DEEP-004 | `backend/services/matchCardService.js` | Bundle senza `meta.as_of_time` | Includere nel bundle |

### 🔴 MATCHCARDSERVICE (2 errori)

| ID | File | Problema | Fix |
|----|------|----------|-----|
| DEEP-001 | `matchCardService.js` | Manca integrazione `risk` output | Integrare riskEngine nel bundle |
| DEEP-005 | `matchCardService.js` | Manca `meta.versions` | Aggiungere versioning |

### 🔴 FRONTEND HOOK (1 errore)

| ID | File | Problema | Fix |
|----|------|----------|-----|
| DEEP-006 | `src/hooks/useMatchBundle.jsx` | Non espone `meta` dal bundle | Esporre meta object |

### 🔴 ODDS (1 errore)

| ID | File | Problema | Fix |
|----|------|----------|-----|
| DEEP-007 | `backend/server.js` | Odds senza `event_time` | Aggiungere timestamp per movimento |

### 🔴 LIVE TRACKING (1 errore)

| ID | File | Problema | Fix |
|----|------|----------|-----|
| DEEP-008 | `liveTrackingRepository.js` | Manca pattern `snapshotTime` | Usare snapshotTime per dati live |

### 🔴 CALCOLI (1 errore)

| ID | File | Problema | Fix |
|----|------|----------|-----|
| DEEP-009 | `featureEngine.js` | Ritorna `null` (anti-pattern) | MAI null, sempre fallback calcolato |

---

## ✅ Problemi Risolti (25 Dic 2025)

I seguenti problemi sono stati corretti:

| Categoria | Risolti |
|-----------|---------|
| VERSIONING | `FEATURE_ENGINE_VERSION`, `STRATEGY_ENGINE_VERSION` ✅ |
| REGISTRY CANON | `normalizeName()`, `resolvePlayerId()` ✅ |
| LIVE TRACKING | `getLatestSnapshot()`, `startTracking()`, `stopTracking()` ✅ |
| DB | `saveMatch()`, `getMatchBundle()` ✅ |
| STATS | `calculateH2H()` ✅ |
| RISK ENGINE | Creato `riskEngine.js` completo ✅ |
| FRONTEND | `getHoldDifficulty()`, `calculateBreaksFromPbp()`, `fetchLiveList()`, `getTrackedMatch()`, `getPointByPoint()` ✅ |
| BUNDLE | `meta.versions` in server.js ✅ |
| MAPPINGS | `players.json` creato ✅ |

---

## 🏗️ Warning Architetturali (8)

> Esegui: `node scripts/runConceptChecks.js`

| ID | File | Warning |
|----|------|---------|
| LIN-004 | `matchCardService.js` | meta nel bundle salvato |
| LIN-005 | `useMatchBundle.jsx` | esporre meta |
| TEMP-001 | `matchRepository.js` | event_time per entità temporali |
| TEMP-002 | `liveTrackingRepository.js` | snapshotTime per dati live |
| FE-002 | `MatchCard.jsx` | useMemo per rendering pesanti |
| FE-003 | `App.jsx` | importare useMatchBundle |
| ODDS-001 | `matchCardService.js` | Odds timestamp |
| LIVE-003 | `liveManager.js` | polling adattivo |

---

## 📋 TODO Dichiarati nelle Filosofie (3)

| File | Descrizione | Filosofia |
|------|-------------|-----------|
| `backend/services/dataQualityChecker.js` | Quality validation | OBSERVABILITY |
| `bet_decisions` table | Log decisioni betting | BANKROLL |
| Surface analysis | Analisi per superficie | STATS |

---

## 🔵 BASSA PRIORITÀ

### Miglioramenti Bundle
- [ ] Arricchire player stats: `comeback_rate`, `roi`, `surfaces`
- [ ] Implementare HPI in featureEngine.js
- [ ] match_card_snapshot: `feature_version`, `strategy_version`, `as_of_time`

### Cleanup Codice
- [ ] Migrare ~30 console.log a logger strutturato

---

## 📈 Progresso Storico

| Data | DEEP Errors | Concept Errors | Note |
|------|-------------|----------------|------|
| **25 Dic (Notte)** | **9** | **0** ✅ | Fix massivo: riskEngine, versioning, aliases |
| 25 Dic (Sera) | 14 | 0 | Primi fix export |
| 25 Dic (PM) | 22 | 12 | Setup deepPhilosophyCheck.js |
| 24 Dic | - | 20 | Eliminato src/utils.js |

---

## 🛠️ Comandi Utili

```bash
# Verifica DEEP (implementazione funzioni vs filosofie)  
node scripts/deepPhilosophyCheck.js

# Verifica pattern architetturali
node scripts/runConceptChecks.js

# Verifica esistenza file
node scripts/checkConceptualMap.js

# Avvia backend
cd backend && node server.js

# Avvia frontend
npm run dev
```

---

**Principio:**
> **Le filosofie dichiarano, il codice implementa.**  
> Ogni funzione dichiarata in una filosofia DEVE esistere nel codice.

---

## ✅ Check Mappa (125/125)

Tutti i file dichiarati nella mappa concettuale esistono.


