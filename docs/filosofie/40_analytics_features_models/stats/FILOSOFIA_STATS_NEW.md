# 📊 FILOSOFIA STATS & STRATEGY ENGINE

> Il sistema non esiste per calcolare metriche.  
> Esiste per produrre segnali affidabili.

---

## 1️⃣ Cambio di Paradigma

Le metriche sono **mezzi**, non obiettivi.

Il centro del sistema è la **decisione operativa**: trasformare dati in segnali azionabili (READY / WATCH / OFF).

---

## 2️⃣ Architettura ad Albero

```
RAW DATA (matches, stats, pbp, odds)
     ↓
FEATURE ENGINE (volatility, pressure, dominance)
     ↓
STRATEGY ENGINE (LayWinner, BancaServizio, SuperBreak)
     ↓
SIGNALS (READY / WATCH / OFF + action)
```

Tutto questo avviene nel **backend**.  
Il frontend consuma solo il risultato.

---

## 3️⃣ Classi di Dati

### Raw Data
- Dati canonici DB, nessuna interpretazione, persistiti
- Esempi: `match_statistics_new`, `match_point_by_point_new`

### Features
- Funzioni pure, deterministiche, contestuali
- Esempi: `volatility`, `pressure`, `breakProbability`
- Possono essere persistite solo se utili storicamente

### Signals
- Discreti, orientati all'azione, temporanei
- Esempi: READY, WATCH, OFF, BACK/LAY
- **NON** sono metriche, **NON** sono persistibili come verità storica

---

## 4️⃣ Livelli di Analisi

### Player-Level
Contesto storico del giocatore, usato come **prior**.
- Win rate superficie, comeback rate, ROI storico

### Match-Level
Stato corrente del match, usato come **likelihood**.
- Pressure, momentum, volatility, dominance

### Combined-Level
Player + Match. Qui nascono le strategie.
- "Giocatore resiliente + pressione alta sull'avversario"

---

## 5️⃣ Strategy Engine

Il Strategy Engine prende features e produce signals:

```
Input: { volatility, pressure, dominance, context }
Output: [
  { name: "LayWinner", status: "READY", action: "LAY home" },
  { name: "BancaServizio", status: "WATCH", reason: "pressure rising" }
]
```

---

## 6️⃣ Segnali NON Persistibili

> I segnali (READY/WATCH/OFF) **non** sono metriche storiche persistibili.

Puoi persistere il **bundle snapshot** per audit, ma non creare tabelle `strategy_signals_history`.

---

## 7️⃣ Feature Engine Rules

Ogni feature deve dichiarare:
- Nome, Livello (Player/Match/Combined)
- Input richiesti, Output type e range
- Fallback chain
- Chi la usa (strategie/predictor)
- Se è persistibile

---

## 8️⃣ Regola Finale

> Le features devono essere:
> - Deterministiche (stessi input → stesso output)
> - Contestuali (sanno cosa rappresentano)
> - Documentate (scheda feature obbligatoria)
>
> I signals devono essere:
> - Azionabili (READY = si può agire)
> - Temporanei (valgono per questo momento)
> - Non persistibili come storia

---

**Documenti Correlati**:
- [FILOSOFIA_CALCOLI](../calcoli/FILOSOFIA_CALCOLI.md) – tassonomia features, fallback
- [FILOSOFIA_TEMPORAL](../../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) – `as_of_time`
- [FILOSOFIA_FRONTEND_DATA](../../70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) – consumer
