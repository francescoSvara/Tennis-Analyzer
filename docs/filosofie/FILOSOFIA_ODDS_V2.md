# 💹 FILOSOFIA ODDS & MARKET DATA  
## Versione V2 – Market Layer → Feature Provider

> **Dominio**: Odds · Market Data · Pricing  
> **Stato**: ATTIVA  
> **Sostituisce**: `FILOSOFIA_ODDS.md` (V1 – DEPRECATA)  
> **Ultimo aggiornamento**: Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|----------------|
| [FILOSOFIA_MADRE](FILOSOFIA_MADRE_TENNIS_ROLE_DRIVEN.md) | Market APIs | [STATS_V3](FILOSOFIA_STATS_V3.md) (market features) |

### 📁 File Codice Principali
| File | Descrizione | Linee chiave |
|------|-------------|---------------|
| [`backend/server.js`](../../backend/server.js) | `normalizeOddsForBundle()` | L3507-3590 |
| [`backend/scraper/sofascoreScraper.js`](../../backend/scraper/sofascoreScraper.js) | Fetch odds da SofaScore | `/api/v1/event/:id/odds` |
| [`src/components/match/tabs/OddsTab.jsx`](../../src/components/match/tabs/OddsTab.jsx) | UI display odds | - |

---

## 0️⃣ PRINCIPIO FONDANTE

> **Le odds descrivono il mercato,  
> non decidono il trade.**

Il dominio Odds:
- osserva il mercato
- normalizza prezzi
- produce feature di mercato

❌ Non decide stake  
❌ Non decide strategie  

---

## 1️⃣ RUOLO DEL DOMINIO ODDS

Il dominio Odds è un **Market Data Layer**.

Produce:
- implied probability
- trend
- liquidità
- spread
- staleness

Consumato da:
- Predictor
- Strategy Engine
- MatchBundle

---

## 2️⃣ OGGETTI STANDARD (OBBLIGATORI)

```json
marketOdds: {
  matchOdds: { back, lay, last },
  trend: { delta5m },
  liquidity: { level, spreadPct },
  lastUpdateTs
}
```

Nessun componente frontend deve “inventare” questi campi.

---

## 3️⃣ MARKET VS MODEL VS EDGE

Separazione obbligatoria:

- **Market**: odds osservate
- **Model**: probabilità interne (Predictor)
- **Edge**: differenza controllata

Il dominio Odds:
- calcola implied probability
- NON calcola win probability

---

## 4️⃣ LIVE ODDS POLICY

Le odds live hanno:
- timestamp
- freshness
- affidabilità

Se staleness > soglia:
- dataQuality.odds ↓
- confidence strategie ↓

---

## 5️⃣ FAIR ODDS (CHI LE CALCOLA)

Le fair odds:
- NON vivono nel dominio Odds
- sono output del Predictor

Odds fornisce solo:
- input puliti
- feature di mercato

---

## 6️⃣ MATCHBUNDLE INTEGRAZIONE

Nel MatchBundle:
- `header.market` → mercato grezzo
- `tabs.odds` → presentazione
- `tabs.predictor` → model vs market

---

## 7️⃣ COSA È STATO RIMOSSO

❌ fair odds placeholder  
❌ stake suggestion  
❌ trade execution logic  
❌ frontend odds logic  

---

## 8️⃣ REGOLA FINALE

Se una logica odds:
- suggerisce un trade
- calcola stake
- decide READY/WATCH

➡️ **non è dominio Odds**.

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [MADRE](FILOSOFIA_MADRE_TENNIS_ROLE_DRIVEN.md) | [📚 INDEX](INDEX_FILOSOFIE.md) | [LIVE_V2](FILOSOFIA_LIVE_TRACKING_V2.md) |

---

**Fine documento – FILOSOFIA_ODDS_V2**
