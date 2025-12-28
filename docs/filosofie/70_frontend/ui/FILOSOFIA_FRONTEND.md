# 📖 FILOSOFIA FRONTEND (UI)

> L'utente non deve "pensare", deve confermare una decisione.  
> ❌ NO dashboard piene di numeri  
> ✅ SI semafori, stati, contesto

---

## 1️⃣ Principio Base

- Ogni strategia è una **card indipendente**
- Massimo **1 azione suggerita** alla volta
- Semafori visivi: 🟢 READY, 🟡 WATCH, ⚫ OFF

---

## 2️⃣ Architettura Informativa

```
HOME (Lobby)
 ├─ Live Matches (selezione)
 ├─ Watchlist ⭐
 ├─ Alerts 🔔
 └─ Settings / Bankroll / Risk

MATCH (layout con sidebar)
 ├─ Overview (operativa)
 ├─ Strategie Live (hub trading)
 ├─ Odds (mercato + ladder)
 ├─ Point-by-point (log eventi)
 ├─ Stats (standard + avanzate)
 ├─ Momentum (trend + run)
 ├─ Predictor (probabilità + edge)
 └─ Journal (bet tracking)
```

---

## 3️⃣ Home (Lobby)

**Obiettivo**: in 20 secondi l'utente sceglie quale match è "tradabile".

Ogni match row mostra:
- Stato match (set/game/serve)
- Odds principali
- Semaforo strategie: quante 🟢/🟡
- Edge stimato
- Volatilità
- Bottone: **Apri Match**

---

## 4️⃣ Match Page – Layout

```
┌─────────────────────────────────────────────────────────┐
│ 🎾 Header: Players, Score, Odds, Volatility, Liquidity  │
└─────────────────────────────────────────────────────────┘
┌──────────┐  ┌──────────────────────────────┐  ┌────────┐
│ Sidebar  │  │ Main Tab Content             │  │ Right  │
│ (nav)    │  │                              │  │ Rail   │
│          │  │ [Tab bar]                    │  │ (quick │
│ Overview │  │ Overview│Strategie│Odds│...  │  │ trades)│
│ Strategy │  │                              │  │        │
│ Odds     │  │                              │  │        │
│ PbP      │  │                              │  │        │
│ ...      │  │                              │  │        │
└──────────┘  └──────────────────────────────┘  └────────┘
```

**Right Rail**: odds + CTA sempre visibili per eseguire senza cambiare tab.

---

## 5️⃣ Tab Principali

### Overview
- Scoreboard completo
- Quick signals (strategie 🟢)
- Features chiave (volatility, pressure)
- Status match (serving, clutch point)

### Strategie Live
- Cards per ogni strategia
- Semaforo + action suggerita
- Confidence + reason
- One-click execution (futuro)

### Odds
- Mercato principale + ladder
- Trend (frecce movimento)
- Implied probability
- Staleness indicator

### Point-by-Point
- Log eventi cronologico
- Momenti chiave evidenziati
- Break points, set points

### Stats
- Statistiche aggregate
- Confronto giocatori
- Grafici radar

### Momentum
- Grafico momentum temporale
- Run di punti
- Trend

### Predictor
- Model probability vs Market
- Edge visualization
- Confidence interval

### Journal
- Bet decisions logged
- P&L tracking
- Decision audit

---

## 6️⃣ Regole UI

| Regola | Descrizione |
|--------|-------------|
| Skeleton loading | Mai spinner globali |
| Semafori ovunque | READY=🟢, WATCH=🟡, OFF=⚫ |
| Una azione | Max 1 CTA prominente per card |
| Staleness visible | Mostra età dati se > soglia |
| Mobile-first | Layout responsive |

---

## 7️⃣ Regola Finale

> Il design serve la decisione.
>
> Se un elemento UI non aiuta a decidere, va rimosso.

---

**Documenti Correlati**:
- [FILOSOFIA_FRONTEND_DATA](../data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) – data architecture
- [SPEC_MOTION_UI](../../../specs/SPEC_FRONTEND_MOTION_UI.md) – animazioni
- [FILOSOFIA_STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md) – strategy signals
- [SCHEDE_UI_TAB](../../../specs/SCHEDE_UI_TAB.md) – specifiche visual design pagine e tab

### 📁 File Codice Principali

| File | Descrizione |
|------|-------------|
| [`src/components/`](../../../../src/components/) | React UI components |
| [`src/styles/`](../../../../src/styles/) | CSS / styled components |
| [`src/motion/`](../../../../src/motion/) | Animation utilities |
| [`src/App.jsx`](../../../../src/App.jsx) | App entry point |
