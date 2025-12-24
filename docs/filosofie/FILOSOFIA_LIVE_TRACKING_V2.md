# ⚡ FILOSOFIA LIVE TRACKING  
## Versione V2 – Runtime → MatchBundle Updates

> **Dominio**: Live Runtime · Streaming · Snapshot Sync  
> **Stato**: ATTIVA  
> **Sostituisce**: `FILOSOFIA_LIVE_TRACKING.md` (V1 – DEPRECATA)  
> **Ultimo aggiornamento**: Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|----------------|
| [FILOSOFIA_MADRE](FILOSOFIA_MADRE_TENNIS_ROLE_DRIVEN.md) | [DB_V2](FILOSOFIA_DB_V2.md) | [STATS_V3](FILOSOFIA_STATS_V3.md) (runtime features) |

---

## 0️⃣ PRINCIPIO FONDANTE

> **Il live non produce dati.  
> Mantiene aggiornato uno stato.**

Lo stato è il **MatchBundle**.

Il Live Tracking:
- osserva eventi
- aggiorna feature runtime
- rigenera segnali
- invia patch incrementali

❌ Non espone raw data al frontend  
❌ Non decide strategie  

---

## 1️⃣ SCOPO DEL LIVE TRACKING

- mantenere il MatchBundle coerente in tempo reale
- ridurre latenza sui segnali READY
- garantire consistenza tra REST snapshot e WS live

Il live è **un runtime engine**, non una sorgente dati.

---

## 2️⃣ OUTPUT UFFICIALE

### MatchBundle Patch

Il live produce **solo**:
- patch su `bundle.header`
- patch su `bundle.tabs.*`
- patch su `bundle.dataQuality`

Formato consigliato:
- JSON Patch
- oppure BundleDelta (diff strutturato)

---

## 3️⃣ PIPELINE LIVE (V2)

```
LIVE EVENTS (API / polling)
        │
        ▼
LIVE NORMALIZER
        │
        ▼
FEATURE ENGINE (runtime)
        │
        ▼
STRATEGY ENGINE
        │
        ▼
BUNDLE PATCH
        │
        ▼
WS / Cache Refresh
```

---

## 4️⃣ POLLING ADATTIVO (POLICY)

Il polling non è fisso.

### Regole consigliate
- score change → polling FAST
- nessun cambiamento N volte → backoff
- strategy READY → polling BOOST
- match idle → polling SLOW

Il live risponde al **contesto di trading**.

---

## 5️⃣ DATA QUALITY LIVE

Il live aggiorna:
- freshness
- completeness
- staleness

Per sezione:
```json
dataQuality.tabs.pointByPoint = 0.9
```

Il frontend **mostra**, non interpreta.

---

## 6️⃣ SNAPSHOT & CONSOLIDAMENTO

- a match concluso → rigenera `match_bundle_snapshot`
- nessun snapshot parziale
- nessuna card legacy

Il bundle è l’unica verità persistita.

---

## 7️⃣ COSA È STATO RIMOSSO

❌ push di raw events al frontend  
❌ snapshot multipli  
❌ frontend fallback logic  
❌ polling non contestuale  

---

## 8️⃣ REGOLA FINALE

Se un update live:
- non modifica il MatchBundle
- non migliora la latenza decisionale

➡️ **non serve**.

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [ODDS_V2](FILOSOFIA_ODDS_V2.md) | [📚 INDEX](INDEX_FILOSOFIE.md) | [DB_V2](FILOSOFIA_DB_V2.md) |

---

**Fine documento – FILOSOFIA_LIVE_TRACKING_V2**
