# 💪 HPI & BREAK RESILIENCE
## Indicatori di Pressione – Feature Specification

> **Dominio**: Features · Pressure Metrics · Strategy Inputs  
> **Stato**: ATTIVA  
> **Tipo**: Feature Specification  
> **Ultimo aggiornamento**: 27 Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|-----------------|
| [FILOSOFIA_MADRE](../filosofie/00_foundation/FILOSOFIA_MADRE_TENNIS.md) | [DB](../filosofie/10_data_platform/storage/FILOSOFIA_DB.md) (point-by-point) | [STATS](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md) (Strategy Engine) |

### 📚 Documenti Correlati

| Documento | Scopo |
|-----------|-------|
| [CALCOLI](../filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md) | Tassonomia completa features, standard input/output, fallback |
| [LIVE_TRACKING](../filosofie/20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md) | HPI in real-time |
| [OBSERVABILITY](../filosofie/10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Quality metrics per HPI |

### 📁 File Codice Principali

| File | Descrizione |
|------|-------------|
| [`backend/utils/featureEngine.js`](../../backend/utils/featureEngine.js) | Calcolo HPI/Resilience |
| [`backend/utils/pressureCalculator.js`](../../backend/utils/pressureCalculator.js) | Pressure index |
| [`backend/strategies/strategyEngine.js`](../../backend/strategies/strategyEngine.js) | Consumer HPI |

---

## 0️⃣ SCOPO DEL DOCUMENTO

Definisce due indicatori chiave per la valutazione della **resistenza psicologica** dei giocatori:

- **HPI** (Hold Pressure Index): capacità di tenere il servizio sotto pressione
- **Break Resilience**: capacità di recupero da situazioni negative

Questi indicatori **potenziano le strategie** di trading.

---

## 1️⃣ HPI – HOLD PRESSURE INDEX

Misura quanto un giocatore tiene il servizio in **situazioni di pressione**.

### 1.1 Situazioni di Pressione

| Situazione | Punteggio | Peso |
|------------|-----------|------|
| **Deuce** | 40-40, AD-40, 40-AD | Alto |
| **30-30** | Parità critica | Medio |
| **Break Point** | 30-40, 15-40, 0-40 | Altissimo |
| **Server in Danger** | 0-30, 15-30 | Medio |

### 1.2 Formula

```
HPI = (game tenuti sotto pressione / game totali al servizio sotto pressione) × 100
```

### 1.3 Livelli

| Range | Livello | Significato |
|-------|---------|-------------|
| ≥80% | ELITE | Eccezionale sotto pressione |
| ≥65% | STRONG | Solido nei momenti chiave |
| ≥50% | AVERAGE | Normale gestione pressione |
| ≥35% | VULNERABLE | Fragile sotto pressione |
| <35% | WEAK | Crolla nei momenti decisivi |

---

## 2️⃣ BREAK RESILIENCE SCORE

Combina capacità di salvare BP e recupero da momentum negativo.

### 2.1 Formula

```
Resilience = (BP Saved % × 0.6) + (Recovery Rate × 0.4)
```

### 2.2 Componenti

| Componente | Peso | Descrizione |
|------------|------|-------------|
| **BP Saved %** | 60% | Percentuale break point salvati |
| **Recovery Rate** | 40% | Percentuale fasi negative recuperate |

### 2.3 Livelli

| Range | Livello | Significato |
|-------|---------|-------------|
| ≥75% | RESILIENT | Alta capacità di recupero |
| ≥60% | SOLID | Buona resistenza mentale |
| ≥45% | AVERAGE | Resilienza nella media |
| ≥30% | FRAGILE | Difficoltà a recuperare |
| <30% | BRITTLE | Crolla dopo momenti negativi |

---

## 3️⃣ UTILIZZO NELLE STRATEGIE

HPI e Resilience potenziano le **3 strategie base**:

| Strategia | Come usa HPI | Come usa Resilience |
|-----------|--------------|---------------------|
| **Lay the Winner** | HPI basso del leader → più probabile comeback | Resilience alto del perdente → più chance di recupero |
| **Banca Servizio** | HPI basso del server → segnale più forte | Resilience basso → probabile cedimento |
| **Super Break** | HPI alto del favorito → conferma dominio | Resilience basso underdog → break più facile |

---

## 4️⃣ INTEGRAZIONE STRATEGIE

### 4.1 Lay the Winner + HPI/Resilience

```javascript
const loserHPI = calculateHPI(data, loserFirstSet);
const loserResilience = calculateBreakResilience(data, loserFirstSet);

if (loserResilience.level === 'RESILIENT' && loserHPI.level !== 'WEAK') {
  result.confidence += 15;
  result.factors.resilienceBonus = true;
}
```

### 4.2 Banca Servizio + HPI

```javascript
const serverHPI = calculateHPI(data, serving === 1 ? 'home' : 'away');

if (serverHPI.level === 'VULNERABLE' || serverHPI.level === 'WEAK') {
  result.signal = 'strong';
  result.confidence += 20;
  result.factors.hpiLow = serverHPI.value;
}
```

### 4.3 Super Break + Resilience

```javascript
const underdogResilience = calculateBreakResilience(data, sfavorito.side);

if (underdogResilience.level === 'FRAGILE' || underdogResilience.level === 'BRITTLE') {
  result.confidence += 15;
  result.factors.underdogFragile = true;
}
```

---

## 5️⃣ NOTE IMPLEMENTATIVE

| Aspetto | Valore |
|---------|--------|
| **Tipo dati** | DERIVED (calcolato da dati RAW) |
| **Persistenza** | Cache consigliata per statistiche storiche |
| **Frequenza update** | Real-time per match live, batch per storici |

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [DB](../filosofie/10_data_platform/storage/FILOSOFIA_DB.md) | [📚 INDEX](../filosofie/INDEX_FILOSOFIE.md) | [STATS](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md) |

---

**Fine documento – HPI_RESILIENCE**
