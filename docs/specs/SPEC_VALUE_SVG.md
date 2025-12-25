# Filosofia Value SVG - Estrazione Momentum da DOM SofaScore

## 📋 Sommario

Questo documento descrive la strategia per estrarre i valori di momentum tennis direttamente dal codice SVG delle barre visuali di SofaScore, da usare come **fallback** quando i dati API non sono disponibili.

---

## 🎯 Obiettivo

1. **Estrarre il momentum** dal DOM SVG quando l'API SofaScore non restituisce i `tennisPowerRankings`
2. **Salvare i dati in una colonna separata** `value_svg` per distinguerli dai dati originali API
3. **Usare come fallback**: Solo se `value` (API) è null/assente, usiamo `value_svg` (DOM)
4. **Normalizzare i valori** per renderli comparabili (-100 a +100)

---

## 📐 Struttura SVG SofaScore

Dall'analisi del file `sofascore bars group.txt`, la struttura è:

```html
<svg class="set" viewBox="0 -40 115.2 80">
  <g>
    <path class="game" d="M1,0 v25.84 h8 v-25.84 z" 
          fill="var(--colors-home-away-away-primary)">
    </path>
  </g>
  <g>
    <path class="game" d="M9.6,0 v-15.95 h8 v15.95 z" 
          fill="var(--colors-home-away-home-primary)">
    </path>
  </g>
  <!-- ... altri game ... -->
</svg>
```

### Elementi chiave:

| Elemento | Significato |
|----------|-------------|
| `svg.set` | Un set completo |
| `path.game` | Un singolo game |
| `d="M<x>,0 v<value> h8 v-<value> z"` | Path SVG della barra |
| `v<value>` | **Intensità del momentum** (altezza barra) |
| `fill="home-primary"` | Game vinto dal giocatore HOME |
| `fill="away-primary"` | Game vinto dal giocatore AWAY |

### Interpretazione del valore `v`:

- **v positivo** (es: `v25.84`): Barra verso il **basso** (away)
- **v negativo** (es: `v-15.95`): Barra verso l'**alto** (home)
- **ViewBox**: `"0 -40 width 80"` → range verticale da -40 a +40

---

## 🔄 Logica di Estrazione

### 1. Parsing del Path SVG

```javascript
// Estrae il primo comando "v" dal path d
function parseFirstV(d) {
  const match = /v\s*([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/i.exec(d);
  return match ? Number(match[1]) : null;
}

// Estrae la posizione X iniziale
function parseMx(d) {
  const match = /M\s*([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/i.exec(d);
  return match ? Number(match[1]) : null;
}
```

### 2. Determinazione Side (Home/Away)

```javascript
function getSide(fill) {
  const f = fill.toLowerCase();
  if (f.includes('home-primary') || f.includes('home')) return 'home';
  if (f.includes('away-primary') || f.includes('away')) return 'away';
  return 'unknown';
}
```

### 3. Conversione a Valore Signed

```javascript
// Il segno semantico dipende dal side, non dal segno SVG
function getSignedValue(rawV, side) {
  const magnitude = Math.abs(rawV || 0);
  if (side === 'home') return +magnitude;   // Home positivo
  if (side === 'away') return -magnitude;   // Away negativo
  return rawV || 0;
}
```

---

## 📊 Normalizzazione

Il valore SVG grezzo (es: 25.84) deve essere normalizzato in scala **-100 a +100**.

### Metodo: Percentile Scaling (Robusto)

```javascript
function normalizeValue(signedRaw, scale) {
  // scale = 95° percentile dei valori assoluti del match/set
  const normalized = (signedRaw / scale) * 100;
  return Math.max(-100, Math.min(100, Math.round(normalized)));
}
```

### Perché Percentile 95?

- Evita che outlier estremi "schiaccino" gli altri valori
- Mantiene la distribuzione realistica
- I valori > 95° percentile vengono clampati a ±100

---

## 🗄️ Schema Database - Modifica

### Nuova colonna nella tabella `power_rankings`:

```sql
ALTER TABLE power_rankings 
ADD COLUMN value_svg INTEGER DEFAULT NULL;

-- value     = valore da API SofaScore (originale)
-- value_svg = valore estratto da DOM SVG (fallback)
```

### Nuova colonna nella tabella `match_power_rankings_new`:

```sql
ALTER TABLE match_power_rankings_new 
ADD COLUMN value_svg INTEGER DEFAULT NULL;
ADD COLUMN source VARCHAR(20) DEFAULT 'api';  -- 'api' o 'svg_dom'
```

---

## 📐 Esempio Pratico: Musetti vs De Minaur

Dal file `sofascore bars group.txt`:

### Set 1 (viewBox width: 115.2)
| Game | X | v raw | Fill | Side | Signed | Normalized* |
|------|---|-------|------|------|--------|-------------|
| 1 | 1 | 25.84 | away | away | -25.84 | -65 |
| 2 | 9.6 | -15.95 | home | home | +15.95 | +40 |
| 3 | 19.2 | 4 | away | away | -4 | -10 |
| 4 | 28.8 | -4 | home | home | +4 | +10 |
| 5 | 38.4 | 11.18 | away | away | -11.18 | -28 |
| ... | | | | | | |

*Normalizzato assumendo scale ≈ 40 (max viewBox)

---

## 🔄 Flow di Utilizzo

```
┌─────────────────────────────────────────────────────────────┐
│                    SCRAPE MATCH                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  API SofaScore restituisce tennisPowerRankings?             │
└─────────────────────────────────────────────────────────────┘
                    │              │
                  YES            NO
                    │              │
                    ▼              ▼
┌──────────────────────┐  ┌──────────────────────────────────┐
│ Salva in `value`     │  │ Estrai SVG dal DOM               │
│ source = 'api'       │  │ Normalizza                       │
│                      │  │ Salva in `value_svg`             │
│                      │  │ source = 'svg_dom'               │
└──────────────────────┘  └──────────────────────────────────┘
                    │              │
                    └──────┬───────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend: usa value se presente, altrimenti value_svg     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧮 Comparazione Valori API vs SVG

### Esempio partita con entrambi i dati (es: Sinner-Alcaraz 16 Nov):

Per validare la correttezza dell'estrazione SVG, confrontiamo:

| Set | Game | value (API) | value_svg (DOM) | Delta |
|-----|------|-------------|-----------------|-------|
| 1 | 1 | -23 | -24 | 1 |
| 1 | 2 | +18 | +17 | 1 |
| ... | | | | |

Se i delta sono piccoli (< 5), l'estrazione è accurata.

---

## 📝 Implementazione Completa con Riferimenti

### ✅ Fase 1: Utility Function

| File | Percorso | Funzioni Chiave | Linee |
|------|----------|-----------------|-------|
| `svgMomentumExtractor.js` | `backend/utils/svgMomentumExtractor.js` | `extractMomentumFromSvgHtml()` | L152 |
| | | `processSvgMomentum()` | L302 |
| | | `normalizeMomentumPerSet()` | L262 |
| | | `toPowerRankingsFormat()` | L272 |
| `svgMomentumExtractor.js` | `Tennis-Scraper-Local/backend/utils/svgMomentumExtractor.js` | Copia ES Module | L152, L302 |

### ✅ Fase 2: Database Schema

| Migrazione | Percorso | Modifiche |
|------------|----------|-----------|
| `add-svg-momentum-columns.sql` | `backend/migrations/add-svg-momentum-columns.sql` | +value_svg, +source, +VIEW |

**Schema Colonne:**
```sql
-- Tabella: power_rankings
value        INTEGER     -- Valore API SofaScore (PRIORITARIO)
value_svg    INTEGER     -- Valore estratto da SVG DOM (FALLBACK)
source       VARCHAR(20) -- 'api' o 'svg_dom'

-- View: power_rankings_with_fallback
-- Usa COALESCE(value, value_svg) AS value_effective
```

### ✅ Fase 3: Repository Functions

| Funzione | File | Linea | Descrizione |
|----------|------|-------|-------------|
| `insertPowerRankingsSvg()` | `backend/db/matchRepository.js` | L400 | Backend principale - salva solo value_svg |
| `insertPowerRankingsSvg()` | `Tennis-Scraper-Local/backend/db/matchRepository.js` | L1177 | Tennis-Scraper - UPDATE solo value_svg |
| `getPowerRankings()` | `backend/db/matchRepository.js` | L770 | Legge con fallback COALESCE |

**Logica Fallback Lettura (matchRepository.js L784):**
```javascript
value: pr.value ?? pr.value_svg ?? 0,  // API -> SVG -> 0
```

### ✅ Fase 4: API Endpoints

| Endpoint | Server | File | Linea |
|----------|--------|------|-------|
| `POST /api/match/:eventId/momentum-svg` | Tennis-Scraper (3002) | `Tennis-Scraper-Local/backend/server.js` | L897 |

**Flow Endpoint:**
1. Riceve `svgHtml` nel body (JSON)
2. Chiama `processSvgMomentum(svgHtml)` → estrazione + normalizzazione
3. Chiama `insertPowerRankingsSvg(eventId, powerRankings)` → salva solo in value_svg

### ✅ Fase 5: Frontend UI (Tennis-Scraper-Local)

| Componente | File | Descrizione |
|------------|------|-------------|
| Modal SVG | `Tennis-Scraper-Local/index.html` | Modal con textarea per incollare SVG |
| CSS Modal | `Tennis-Scraper-Local/index.html` | Classe `.svg-momentum-modal` (tema viola) |
| Button Card | `Tennis-Scraper-Local/index.html` | Due pulsanti: API refresh (verde) + SVG (viola) |

**Comportamento Modal:**
- Click su card match → apre modal con eventId pre-compilato
- Body con `class="modal-open"` → blocca scroll pagina
- Scroll interno nel modal per contenuti lunghi

### ✅ Fase 6: Test

| Script | Percorso | Scopo |
|--------|----------|-------|
| `test-svg-momentum.js` | `backend/test-svg-momentum.js` | Test unitario extractor |
| `clean-svg-data.js` | `Tennis-Scraper-Local/backend/clean-svg-data.js` | Pulizia dati errati |

---

## 📊 Risultati Test (Musetti vs De Minaur)

```
Set 1: 12 game
Set 2: 9 game  
Set 3: 12 game
---
Totale: 33 game

Game HOME (Musetti): 17 (avg: +36.6)
Game AWAY (De Minaur): 16 (avg: -48.1)

Max momentum HOME: +79
Max momentum AWAY: -100
```

---

## 🔗 Cross-Reference

### Documenti Correlati
| Documento | Sezione | Relazione |
|-----------|---------|-----------|
| [FILOSOFIA_DB.md](../filosofie/10_data_platform/storage/FILOSOFIA_DB.md) | Schema Database | Tabella power_rankings |
| [MAPPA_RETE_CONCETTUALE_V2.md](../checks/MAPPA_RETE_CONCETTUALE_V2.md) | Sezione 6 | Funzioni SVG |
| [FILOSOFIA_STATS.md](../filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md) | Momentum | Dati derivati |

### File Sorgente Principali
| Concetto | File Backend | File Frontend |
|----------|--------------|---------------|
| Estrazione SVG | `backend/utils/svgMomentumExtractor.js` | - |
| Insert DB | `backend/db/matchRepository.js:L400` | - |
| Lettura Fallback | `backend/db/matchRepository.js:L770` | - |
| UI Modal | - | `Tennis-Scraper-Local/index.html` |
| API Endpoint | `Tennis-Scraper-Local/backend/server.js:L897` | - |

---

## ⚠️ Limitazioni

1. **Precisione**: Il valore SVG è una rappresentazione grafica, non il dato originale
2. **Disponibilità**: Richiede che il widget momentum sia renderizzato nella pagina
3. **Variazioni DOM**: SofaScore può cambiare la struttura SVG
4. **Normalizzazione**: La scala può variare tra match diversi

---

## ✅ Vantaggi

1. **Fallback affidabile**: Recupera momentum anche post-match
2. **Dati separati**: Non sovrascrive mai i dati API originali
3. **Comparabilità**: Normalizzazione consente confronto tra match
4. **Tracciabilità**: Campo `source` indica sempre l'origine

---

## 🎯 Conclusione

L'estrazione SVG è una soluzione **robusta e pragmatica** per recuperare dati momentum quando l'API non li fornisce. Mantenendo i dati separati (`value` vs `value_svg`) e tracciando la source, manteniamo l'integrità dei dati originali mentre estendiamo la copertura dei match con momentum.

### Principio Chiave: API First, SVG Fallback
```
value (API)  ───► Priorità ASSOLUTA (dati originali SofaScore)
value_svg    ───► Fallback SOLO se value è NULL
```

---

*Documento aggiornato: 23 Dicembre 2025*
*Ultimo update: Aggiunta sezione implementazione con riferimenti file/linee*
