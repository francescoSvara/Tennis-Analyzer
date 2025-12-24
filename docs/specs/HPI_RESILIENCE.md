# HPI e Break Resilience - Indicatori di Pressione

> **Dominio**: Features · Pressure Metrics · Strategy Inputs  
> **Stato**: ATTIVA  
> **Tipo**: Feature Specification  
> **Ultimo aggiornamento**: Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|-----------------|
| [FILOSOFIA_MADRE](../filosofie/FILOSOFIA_MADRE_TENNIS_ROLE_DRIVEN.md) | [DB_V2](../filosofie/FILOSOFIA_DB_V2.md) (point-by-point) | [STATS_V3](../filosofie/FILOSOFIA_STATS_V3.md) (Strategy Engine) |

### 📚 Feature Library
| Documento | Scopo |
|-----------|-------|
| [FILOSOFIA_CALCOLI_V1](../filosofie/FILOSOFIA_CALCOLI_V1.md) | Tassonomia completa features, standard input/output, fallback, schede operative |

---

## HPI - Hold Pressure Index

Misura quanto un giocatore tiene il servizio in situazioni di pressione.

### Situazioni di Pressione

| Situazione | Punteggio | Peso |
|------------|-----------|------|
| **Deuce** | 40-40, AD-40, 40-AD | Alto |
| **30-30** | Parita critica | Medio |
| **Break Point** | 30-40, 15-40, 0-40 | Altissimo |
| **Server in Danger** | 0-30, 15-30 | Medio |

### Formula

```
HPI = (game tenuti sotto pressione / game totali al servizio sotto pressione) * 100
```

### Livelli

| Range | Livello | Significato |
|-------|---------|-------------|
| >=80% | ELITE | Eccezionale sotto pressione |
| >=65% | STRONG | Solido nei momenti chiave |
| >=50% | AVERAGE | Normale gestione pressione |
| >=35% | VULNERABLE | Fragile sotto pressione |
| <35% | WEAK | Crolla nei momenti decisivi |

---

## Break Resilience Score

Combina capacita di salvare BP e recupero da momentum negativo.

### Formula

```
Resilience = (BP Saved % * 0.6) + (Recovery Rate * 0.4)
```

### Componenti

- **BP Saved %** (peso 60%): % break point salvati
- **Recovery Rate** (peso 40%): % fasi negative da cui si e recuperato

### Livelli

| Range | Livello | Significato |
|-------|---------|-------------|
| >=75% | RESILIENT | Alta capacita di recupero |
| >=60% | SOLID | Buona resistenza mentale |
| >=45% | AVERAGE | Resilienza nella media |
| >=30% | FRAGILE | Difficolta a recuperare |
| <30% | BRITTLE | Crolla dopo momenti negativi |

---

## Funzioni Frontend

| Funzione | File | Tipo |
|----------|------|------|
| `calculateHPI` | `src/utils.js` | DERIVED |
| `calculateBreakResilience` | `src/utils.js` | DERIVED |
| `calculatePressurePerformance` | `src/utils.js` | DERIVED |

---

## Funzioni Backend (Statistiche Storiche)

| Funzione | File | Tipo |
|----------|------|------|
| `calculateHPIStats` | `backend/services/strategyStatsService.js` | DERIVED |
| `calculateBreakResilienceStats` | `backend/services/strategyStatsService.js` | DERIVED |

---

## Utilizzo nelle Strategie

HPI e Resilience potenziano le 3 strategie base:

| Strategia | Come usa HPI | Come usa Resilience |
|-----------|--------------|---------------------|
| **Lay the Winner** | HPI basso del leader = piu probabile comeback | Resilience alto del perdente = piu chance di recupero |
| **Banca Servizio** | HPI basso del server = segnale piu forte | Resilience basso = probabile cedimento |
| **Super Break** | HPI alto del favorito = conferma dominio | Resilience basso underdog = break piu facile |

---

## Integrazione nelle Strategie Base

### 1. Lay the Winner + HPI/Resilience

```javascript
// In analyzeLayTheWinner - potenziamento con HPI
const loserHPI = calculateHPI(data, loserFirstSet);
const loserResilience = calculateBreakResilience(data, loserFirstSet);

if (loserResilience.level === 'RESILIENT' && loserHPI.level !== 'WEAK') {
  result.confidence += 15;
  result.factors.resilienceBonus = true;
}
```

### 2. Banca Servizio + HPI

```javascript
// In analyzeBancaServizio - potenziamento con HPI
const serverHPI = calculateHPI(data, serving === 1 ? 'home' : 'away');

if (serverHPI.level === 'VULNERABLE' || serverHPI.level === 'WEAK') {
  result.signal = 'strong';
  result.confidence += 20;
  result.factors.hpiLow = serverHPI.value;
}
```

### 3. Super Break + Resilience

```javascript
// In analyzeSuperBreak - potenziamento con Resilience
const underdogResilience = calculateBreakResilience(data, sfavorito.side);

if (underdogResilience.level === 'FRAGILE' || underdogResilience.level === 'BRITTLE') {
  result.confidence += 15;
  result.factors.underdogFragile = true;
}
```

---

## Note Implementazione

- **Tipo dati**: DERIVED (calcolato da dati puri RAW)
- **Persistenza**: Cache consigliata per statistiche storiche
- **Frequenza update**: Real-time per match live, batch per storici

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [DB_V2](../filosofie/FILOSOFIA_DB_V2.md) | [📚 INDEX](../filosofie/INDEX_FILOSOFIE.md) | [STATS_V3](../filosofie/FILOSOFIA_STATS_V3.md) |

---

**Fine documento – HPI_RESILIENCE**
