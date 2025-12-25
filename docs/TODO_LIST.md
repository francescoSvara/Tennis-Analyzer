# 📋 TODO LIST – Tennis Analyzer v3.0

> **Ultimo aggiornamento**: 25 Dicembre 2025  
> **Stato Check**: ✅ 0 errori, 0 warning, 30 info  
> **Check Mappa**: 125 passati, 0 falliti, 0 warning

---

## 📊 STATO ATTUALE

```
✅ Errori architetturali: 0
✅ Warning: 0  
✅ Check mappa: 125 passati
ℹ️ Info: 30 (console.log residui - bassa priorità)
```

---

## 🔵 BASSA PRIORITÀ – Miglioramenti Futuri

### INV-007: Migrazione console.log rimanenti
- [ ] Migrare ~30 console.log a logger strutturato
- File principali:
  - `backend/services/dataNormalizer.js`
  - `backend/services/strategyStatsService.js`
  - Altri file minori

### Miglioramenti Bundle
- [ ] **Arricchire player stats nel bundle** - Aggiungere `comeback_rate`, `roi`, `surfaces` a `bundle.header.player*.stats`
- [ ] **HPI nel bundle** - Implementare HPI in featureEngine.js ed esporre in `bundle.tabs.stats.hpi`

---

## 🔍 Report Check Mappa (Auto-generato)

> Ultimo check: 2025-12-25
> Esegui: `node scripts/checkConceptualMap.js`

| Metrica | Valore |
|---------|--------|
| Check totali | 125 |
| ✅ Passati | 125 |
| ❌ Falliti | 0 |
| ⚠️ Warning | 0 |
| 📄 Non doc | 0 |
| 🏗️ Arch viol | 0 |


## 📊 PRINCIPIO FONDAMENTALE

> **"Mostrare dati = Calcolare dati"**
> 
> MAI restituire null, 0, o fallback statici.
> Un match ha SEMPRE: score, odds, rankings → si può SEMPRE calcolare tutto.

---

## 🛠️ Comandi Utili

```bash
# Verifica architettura (concept checks)
node scripts/runConceptChecks.js

# Verifica mappa concettuale
node scripts/checkConceptualMap.js

# Avvia backend
cd backend && node server.js

# Avvia frontend
npm run dev
```

---

## 📈 Progresso Storico

| Metrica | Originale | 24 Dic | 25 Dic |
|---------|-----------|--------|--------|
| Errori | 26 | 20 | **0** ✅ |
| Warning | 25 | 25 | **0** ✅ |
| Info | 56 | 30 | 30 |

### Fix Principali (25 Dic 2025)
- ❌ `src/utils.js` eliminato (~2500 righe dead code)
- ✅ StrategiesPanel usa solo bundle
- ✅ useMatchCard pulito (rimosso usePlayer)
- ✅ Cross-references documentazione aggiornati


## 🏗️ Problemi Architetturali (Auto-generato)

> Ultimo check: 2025-12-25
> Esegui: `node scripts/runConceptChecks.js`

✅ **Nessun problema architetturale rilevato**

