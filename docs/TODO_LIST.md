# ?? TODO LIST – Tennis Analyzer v3.0

> **Ultimo aggiornamento**: 24 Dicembre 2025

---

## ?? ALTA PRIORITÀ – Violazioni Architetturali

### 1. Strategie duplicate nel Frontend
- [ ] Rimuovere `analyzeLayTheWinner` da `src/utils.js`
- [ ] Rimuovere `analyzeBancaServizio` da `src/utils.js`
- [ ] Rimuovere `analyzeSuperBreak` da `src/utils.js`

### 2. Feature Engine duplicato
- [ ] Rimuovere `calculateVolatility` da `MomentumTab.jsx`
- [ ] Rimuovere `calculateElasticity` da `MomentumTab.jsx`
- [ ] Rimuovere `calculatePressureIndex` da `src/utils.js`
- [ ] Rimuovere `calculateDataCompleteness` da `src/utils.js`

---

## ?? MEDIA PRIORITÀ – Funzionalità

### Backend
- [ ] Odds Engine (Factor Registry, probabilità FAIR)
- [ ] `oddsService.js` - calcolo edge vs market
- [ ] `tabs.stats.tradingStats` (holdDifficulty, clutchIndex)
- [ ] Cache Redis per dati live
- [ ] Import automatico XLSX (watcher)

### Frontend
- [ ] Implementare "Load More" per PointByPointTab
- [ ] Implementare visualizzazione powerRankings chart
- [ ] Odds history fetch/storage
- [ ] Event Log per StrategiesTab

### Metriche Avanzate
- [ ] Clutch Conversion Rate
- [ ] Serve Vulnerability Index
- [ ] Set Decay Index

---

## ?? BASSA PRIORITÀ

### Infrastruttura
- [ ] Provider astratti Live (`LiveProvider`)
- [ ] API esterne (API-Tennis, Sportradar)
- [ ] Live Odds Tracking
- [ ] Daily Match Evaluation Report

### Motion Components
- [ ] Integrare `MotionTab` nei tab esistenti
- [ ] Integrare `MotionRow` nelle tabelle
- [ ] Usare `Skeleton` per loading states
- [ ] Creare script `npm run check:arch`

### Documentazione
- [ ] FILOSOFIA_AI.md
- [ ] FILOSOFIA_OBSERVABILITY.md

---

## ?? In Progress

### UI: Barra ricerca HomePage
- [ ] Verificare nel browser se placeholder ancora collide con icona
- [ ] Se persiste, ridurre dimensione icona o aumentare padding

---

## ?? PRINCIPIO FONDAMENTALE

> **"Mostrare dati = Calcolare dati"**
> 
> MAI restituire null, 0, o fallback statici.
> Un match ha SEMPRE: score, odds, rankings ? si può SEMPRE calcolare tutto.

---

*Verifica: `node scripts/checkConceptualMap.js`*
