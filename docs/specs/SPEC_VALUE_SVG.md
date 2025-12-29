# 📊 SPEC VALUE SVG

## Estrazione Momentum da DOM SofaScore

> **Dominio**: Data Extraction · Momentum · SVG Parsing  
> **Stato**: ATTIVA  
> **Tipo**: Specifica Tecnica  
> **Ultimo aggiornamento**: 27 Dicembre 2025

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre                                                              | ⬅️ Input da   | ➡️ Output verso                                                                        |
| --------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------- |
| [FILOSOFIA_DB](../filosofie/10_data_platform/storage/FILOSOFIA_DB.md) | DOM SofaScore | [STATS](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md) (Momentum) |

### 📚 Documenti Correlati

| Documento                                                                             | Relazione             |
| ------------------------------------------------------------------------------------- | --------------------- |
| [FILOSOFIA_DB](../filosofie/10_data_platform/storage/FILOSOFIA_DB.md)                 | Schema power_rankings |
| [MAPPA_RETE_CONCETTUALE](../checks/MAPPA_RETE_CONCETTUALE_V2.md)                      | Funzioni SVG          |
| [FILOSOFIA_STATS](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md) | Dati derivati         |

### 📁 File Codice Principali

| File                                                                                   | Descrizione    | Linee      |
| -------------------------------------------------------------------------------------- | -------------- | ---------- |
| [`backend/utils/svgMomentumExtractor.js`](../../backend/utils/svgMomentumExtractor.js) | Estrazione SVG | L152, L302 |
| [`backend/db/matchRepository.js`](../../backend/db/matchRepository.js)                 | Insert/Read DB | L400, L770 |

---

## 0️⃣ SCOPO DEL DOCUMENTO

Strategia per estrarre i valori di momentum tennis dal **codice SVG** delle barre visuali di SofaScore, usato come **fallback** quando i dati API non sono disponibili.

---

## 1️⃣ OBIETTIVO

```
1. Estrarre momentum dal DOM SVG quando API non restituisce tennisPowerRankings
2. Salvare in colonna separata `value_svg` per distinguere dai dati API
3. Usare come fallback: Solo se `value` (API) è null
4. Normalizzare valori in range -100 a +100
```

---

## 2️⃣ STRUTTURA SVG SOFASCORE

### 2.1 Formato HTML

```html
<svg class="set" viewBox="0 -40 115.2 80">
  <g>
    <path
      class="game"
      d="M1,0 v25.84 h8 v-25.84 z"
      fill="var(--colors-home-away-away-primary)"
    ></path>
  </g>
  <g>
    <path
      class="game"
      d="M9.6,0 v-15.95 h8 v15.95 z"
      fill="var(--colors-home-away-home-primary)"
    ></path>
  </g>
</svg>
```

### 2.2 Elementi Chiave

| Elemento                             | Significato                                |
| ------------------------------------ | ------------------------------------------ |
| `svg.set`                            | Un set completo                            |
| `path.game`                          | Un singolo game                            |
| `d="M<x>,0 v<value> h8 v-<value> z"` | Path SVG della barra                       |
| `v<value>`                           | **Intensità del momentum** (altezza barra) |
| `fill="home-primary"`                | Game vinto dal giocatore HOME              |
| `fill="away-primary"`                | Game vinto dal giocatore AWAY              |

### 2.3 Interpretazione Valore `v`

| Segno                          | Direzione                | Giocatore |
| ------------------------------ | ------------------------ | --------- |
| **v positivo** (es: `v25.84`)  | Barra verso il **basso** | AWAY      |
| **v negativo** (es: `v-15.95`) | Barra verso l'**alto**   | HOME      |

**ViewBox**: `"0 -40 width 80"` → range verticale da -40 a +40

---

## 3️⃣ LOGICA DI ESTRAZIONE

### 3.1 Parsing Path SVG

```javascript
// Estrae primo comando "v" dal path d
function parseFirstV(d) {
  const match = /v\s*([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/i.exec(d);
  return match ? Number(match[1]) : null;
}

// Estrae posizione X iniziale
function parseMx(d) {
  const match = /M\s*([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/i.exec(d);
  return match ? Number(match[1]) : null;
}
```

### 3.2 Determinazione Side

> ⚠️ **IMPORTANTE – Colori SVG SofaScore**:
>
> - **HOME = VERDE** (`home-primary`, barra verso l'alto)
> - **AWAY = BLU** (`away-primary`, barra verso il basso)

```javascript
function getSide(fill) {
  const f = fill.toLowerCase();
  if (f.includes('home-primary') || f.includes('home')) return 'home';
  if (f.includes('away-primary') || f.includes('away')) return 'away';
  return 'unknown';
}
```

### 3.3 Conversione a Valore Signed

```javascript
// Il segno semantico dipende dal side, non dal segno SVG
function getSignedValue(rawV, side) {
  const magnitude = Math.abs(rawV || 0);
  if (side === 'home') return +magnitude; // Home positivo
  if (side === 'away') return -magnitude; // Away negativo
  return rawV || 0;
}
```

---

## 4️⃣ NORMALIZZAZIONE

Valore SVG grezzo normalizzato in scala **-100 a +100**.

### 4.1 Metodo: Percentile Scaling (Robusto)

```javascript
function normalizeValue(signedRaw, scale) {
  // scale = 95° percentile dei valori assoluti del match/set
  const normalized = (signedRaw / scale) * 100;
  return Math.max(-100, Math.min(100, Math.round(normalized)));
}
```

### 4.2 Perché Percentile 95?

- ✅ Evita che outlier estremi "schiaccino" altri valori
- ✅ Mantiene distribuzione realistica
- ✅ Valori > 95° percentile clampati a ±100

---

## 5️⃣ SCHEMA DATABASE

### 5.1 Colonne Aggiunte

```sql
-- Tabella: power_rankings / match_power_rankings_new
ALTER TABLE power_rankings
ADD COLUMN value_svg INTEGER DEFAULT NULL;
ADD COLUMN source VARCHAR(20) DEFAULT 'api';
```

### 5.2 Significato Colonne

| Colonna     | Descrizione                           |
| ----------- | ------------------------------------- |
| `value`     | Valore da API SofaScore (PRIORITARIO) |
| `value_svg` | Valore estratto da DOM SVG (FALLBACK) |
| `source`    | `'api'` o `'svg_dom'`                 |

---

## 6️⃣ FLOW DI UTILIZZO

```
SCRAPE MATCH
     │
     ▼
API SofaScore restituisce tennisPowerRankings?
     │              │
    YES            NO
     │              │
     ▼              ▼
┌────────────┐  ┌─────────────────────┐
│ Salva in   │  │ Estrai SVG dal DOM  │
│ `value`    │  │ Normalizza          │
│ source=api │  │ Salva in `value_svg`│
│            │  │ source=svg_dom      │
└────────────┘  └─────────────────────┘
     │              │
     └──────┬───────┘
            ▼
Frontend: usa value se presente, altrimenti value_svg
```

---

## 7️⃣ FILE DI RIFERIMENTO

### 7.1 Estrazione

| Funzione                       | File                                    | Linea |
| ------------------------------ | --------------------------------------- | ----- |
| `extractMomentumFromSvgHtml()` | `backend/utils/svgMomentumExtractor.js` | L152  |
| `processSvgMomentum()`         | `backend/utils/svgMomentumExtractor.js` | L302  |
| `normalizeMomentumPerSet()`    | `backend/utils/svgMomentumExtractor.js` | L262  |

### 7.2 Database

| Funzione                   | File                            | Linea |
| -------------------------- | ------------------------------- | ----- |
| `insertPowerRankingsSvg()` | `backend/db/matchRepository.js` | L400  |
| `getPowerRankings()`       | `backend/db/matchRepository.js` | L770  |

### 7.3 API Endpoint

| Endpoint                                | Server                | File        | Linea |
| --------------------------------------- | --------------------- | ----------- | ----- |
| `POST /api/match/:eventId/momentum-svg` | Tennis-Scraper (3002) | `server.js` | L897  |

---

## 8️⃣ LOGICA FALLBACK LETTURA

```javascript
// matchRepository.js L784
value: pr.value ?? pr.value_svg ?? 0; // API → SVG → 0
```

---

## 9️⃣ LIMITAZIONI E VANTAGGI

### ⚠️ Limitazioni

| Limitazione     | Descrizione                           |
| --------------- | ------------------------------------- |
| Precisione      | Valore SVG è rappresentazione grafica |
| Disponibilità   | Richiede widget momentum renderizzato |
| Variazioni DOM  | SofaScore può cambiare struttura SVG  |
| Normalizzazione | Scala può variare tra match           |

### ✅ Vantaggi

| Vantaggio           | Descrizione                        |
| ------------------- | ---------------------------------- |
| Fallback affidabile | Recupera momentum anche post-match |
| Dati separati       | Non sovrascrive mai dati API       |
| Comparabilità       | Normalizzazione consente confronto |
| Tracciabilità       | Campo `source` indica origine      |

---

## 🔟 PRINCIPIO CHIAVE

```
RULE API_First_SVG_Fallback
  value (API)  ───► Priorità ASSOLUTA (dati originali SofaScore)
  value_svg    ───► Fallback SOLO se value è NULL
END
```

---

**Fine documento – SPEC_VALUE_SVG**
