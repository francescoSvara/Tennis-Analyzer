# 🎾 FILOSOFIA PBP EXTRACTION
## Versione V1 – Point-by-Point Data Extraction

> **Dominio**: Data Extraction · Point-by-Point · Tennis Rules  
> **Stato**: COSTITUZIONALE – NON MODIFICARE SENZA REVISIONE  
> **Ultimo aggiornamento**: 27 Dicembre 2025  
> **Lezione appresa**: 10+ ore di debugging per scoprire regole fondamentali SofaScore  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ⬅️ Input da | ➡️ Output verso |
|---------|-----------|-----------------|
| [FILOSOFIA_MADRE](../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | SofaScore HTML (DOM) | [DB](../10_data_platform/storage/FILOSOFIA_DB.md), [STATS](../40_analytics_features_models/stats/FILOSOFIA_STATS.md) |

### 📚 Documenti Correlati

| Documento | Relazione |
|-----------|-----------|
| [DB](../10_data_platform/storage/FILOSOFIA_DB.md) | Schema tabella point_by_point |
| [LIVE_TRACKING](live_scoring/FILOSOFIA_LIVE_TRACKING.md) | PBP in real-time |
| [TEMPORAL](../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) | Timestamps per eventi PBP |

### 📁 File Codice Principali

| File | Descrizione |
|------|-------------|
| [`backend/utils/pbpExtractor.cjs`](../../backend/utils/pbpExtractor.cjs) | Estrazione PBP da HTML SofaScore |
| [`backend/scripts/insert-pbp-correct.js`](../../backend/scripts/insert-pbp-correct.js) | Script inserimento PBP |
| [`src/components/match/tabs/PointByPointTab.jsx`](../../src/components/match/tabs/PointByPointTab.jsx) | Frontend visualizzazione PBP |

---

## 0️⃣ SCOPO DEL DOCUMENTO

Definisce le **regole fondamentali** per l'estrazione dei dati Point-by-Point da SofaScore HTML.

> ⚠️ Queste regole sono state scoperte dopo **10+ ore di debugging**.  
> **NON MODIFICARE** senza una revisione completa.

---

## 1️⃣ INVARIANTI TENNIS (NON NEGOZIABILI)

Queste 6 regole sono **SEMPRE vere** nel tennis. Se il codice le viola, **IL CODICE È SBAGLIATO**.

### 1.1 Server Score Progression

```
Chi serve vede il SUO score aumentare quando vince punti.
- Se serve HOME → homeScore aumenta quando HOME vince
- Se serve AWAY → awayScore aumenta quando AWAY vince
```

### 1.2 Alternanza Servizio

```
Il servizio alterna ogni game (eccetto tiebreak).
- Game dispari Set 1: chi ha servito G1
- Game pari Set 1: l'altro
- Nuovo set: chi NON ha servito ultimo game del set precedente
```

### 1.3 Break Definition

```
BREAK = vincere un game sul servizio AVVERSARIO.
- Se HOME serve e AWAY vince il game → Break per AWAY
- Se AWAY serve e HOME vince il game → Break per HOME
```

### 1.4 Tiebreak Server Rotation

```
Nel tiebreak il servizio ruota ogni 2 punti (dopo il primo).
- Punto 1: server iniziale
- Punti 2-3: altro giocatore
- Punti 4-5: primo giocatore
- ...e così via
```

### 1.5 Score Display Convention

```
Lo score si mostra SEMPRE dal punto di vista del server.
- "40-30" significa SERVER ha 40, RECEIVER ha 30
- Nel nostro DB: homeScore-awayScore (indipendente da chi serve)
```

### 1.6 Point Winner Determines Score Change

```
Chi vince il punto è chi vede aumentare il proprio score.
- Se score passa da "15-0" a "15-15" → RECEIVER ha vinto
- Se score passa da "15-0" a "30-0" → SERVER ha vinto
```

---

## 2️⃣ REGOLA CRITICA SOFASCORE HTML

### 2.1 Row Mapping SEMPRE FISSO

```
⚠️ ATTENZIONE MASSIMA ⚠️

In SofaScore HTML, le righe dei punti sono SEMPRE:
  row1 = HOME (primo giocatore nell'header)
  row2 = AWAY (secondo giocatore nell'header)

Questo NON CAMBIA MAI, indipendentemente da:
  - Chi serve
  - Quale set/game
  - Se è tiebreak o no
```

### 2.2 Errore Comune vs Soluzione

```javascript
// ❌ SBAGLIATO: assumere che il mapping cambi per blocco
const serverIsTop = blockHeader.includes(serverName);
const homeScore = serverIsTop ? p.row1Score : p.row2Score;

// ✅ CORRETTO: mapping sempre fisso
const homeScore = p.row1Score;  // row1 è SEMPRE HOME
const awayScore = p.row2Score;  // row2 è SEMPRE AWAY
```

---

## 3️⃣ POINT WINNER DETECTION

### 3.1 Metodo Corretto

Il `pointWinner` si determina dal **colore CSS** della cella in SofaScore HTML:

| Classe CSS | Significato |
|------------|-------------|
| `row1Won` o verde su row1 | **HOME ha vinto** |
| `row2Won` o verde su row2 | **AWAY ha vinto** |

### 3.2 Errore Comune vs Soluzione

```javascript
// ❌ SBAGLIATO: determinare winner da chi ha score più alto
const winner = homeScore > awayScore ? 'home' : 'away';

// ✅ CORRETTO: usare il colore/classe CSS
const pointWinner = p.row1Won ? 'home' : p.row2Won ? 'away' : 'unknown';
```

---

## 4️⃣ BREAK POINT LOGIC

### 4.1 Regola Fondamentale

```
Il BREAK POINT è SEMPRE e SOLO del RECEIVER.
Il SERVER può solo SALVARE un break point, MAI "farlo".
```

### 4.2 Quando Esiste un Break Point

```
Break Point esiste SOLO quando:
1. Il RECEIVER ha 40 o Advantage (AD/A)
2. Il SERVER NON ha 40 o Advantage

Esempio con score "40-A" (home-away):
- Se server=away → NON è BP (away ha AD sul suo servizio = game point)
- Se server=home → È BP (away ha AD = break point per away)
```

### 4.3 Implementazione Corretta

```javascript
function isBreakPointScore(score, server) {
  const [homeScore, awayScore] = score.split('-');
  
  const receiverScore = server === 'home' ? awayScore : homeScore;
  const serverScore = server === 'home' ? homeScore : awayScore;
  
  // BP solo se RECEIVER ha game point E SERVER no
  const receiverHasGamePoint = ['40', 'AD', 'A'].includes(receiverScore);
  const serverHasGamePoint = ['40', 'AD', 'A'].includes(serverScore);
  
  return receiverHasGamePoint && !serverHasGamePoint;
}
```

### 4.4 Concetto Errato: "Break Point Salvato"

```
🚫 NON ESISTE "Break Point Salvato" da mostrare

Se il server tiene il servizio, il break point NON È MAI ESISTITO.
Non mostrare "BPS" o "Break Point Saved" - semplicemente non mostrare nulla.
La regola del tennis è che il server non può MAI fare break point.
```

---

## 5️⃣ SCHEMA DATABASE PBP

### 5.1 Tabella `point_by_point`

```sql
CREATE TABLE point_by_point (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  game_number INTEGER NOT NULL,
  point_number INTEGER NOT NULL,
  home_score VARCHAR(5),      -- Score HOME (es: "40", "AD", "15")
  away_score VARCHAR(5),      -- Score AWAY
  serving INTEGER,            -- 1=HOME serve, 2=AWAY serve
  scoring INTEGER,            -- 1=HOME vince punto, 2=AWAY vince punto
  is_break_point BOOLEAN,
  is_set_point BOOLEAN,
  is_match_point BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 Mappings

| Campo | Valore 1 | Valore 2 |
|-------|----------|----------|
| `serving` | HOME serve | AWAY serve |
| `scoring` | HOME vince punto | AWAY vince punto |

---

## 6️⃣ CHECKLIST VALIDAZIONE PBP

> ⚠️ **Le checklist sono state consolidate in** [`docs/TODO_LIST.md`](../../TODO_LIST.md#33-checklist-pbp-validation-filosofia_pbp_extractionmd)
> 
> Prima di considerare i dati PBP corretti, verificare tutti i punti nel TODO_LIST:
> - S1G1, Break detection, Score progression, Tiebreak, Point winners, Row mapping

---

## 7️⃣ LEZIONI APPRESE (27 Dic 2025)

### Problema 1: Row Mapping Dinamico

| Aspetto | Dettaglio |
|---------|-----------|
| **Sintomo** | Score invertiti in alcuni game |
| **Causa** | Assumevamo che row1/row2 cambiassero in base al blocco |
| **Fix** | Row mapping SEMPRE fisso: row1=HOME, row2=AWAY |

### Problema 2: Break Point per il Server

| Aspetto | Dettaglio |
|---------|-----------|
| **Sintomo** | "40-A BP Vacherot" mostrato quando Vacherot serviva |
| **Causa** | Mostravamo BP ogni volta che qualcuno aveva 40/AD |
| **Fix** | BP solo quando RECEIVER ha 40/AD E SERVER no |

### Problema 3: "Break Point Salvato"

| Aspetto | Dettaglio |
|---------|-----------|
| **Sintomo** | Tentativo di mostrare "BPS" quando server vinceva su BP |
| **Causa** | Fraintendimento delle regole del tennis |
| **Fix** | Se server tiene, BP non è mai esistito - non mostrare nulla |

---

## 8️⃣ WARNING PER SVILUPPATORI FUTURI

```
⚠️ SE STAI MODIFICANDO LA LOGICA PBP:

1. LEGGI QUESTO DOCUMENTO PRIMA DI TUTTO
2. I 6 INVARIANTI NON SONO NEGOZIABILI
3. ROW1 = HOME, ROW2 = AWAY - SEMPRE
4. IL SERVER NON PUÒ MAI FARE BREAK POINT
5. TESTA CON MATCH REALI PRIMA DI PUSHARE

Abbiamo speso 10+ ore per scoprire queste regole.
Non ripetere gli stessi errori.
```

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [DB](../10_data_platform/storage/FILOSOFIA_DB.md) | [📚 INDEX](../INDEX_FILOSOFIE.md) | [LIVE_TRACKING](live_scoring/FILOSOFIA_LIVE_TRACKING.md) |

---

**Fine documento – FILOSOFIA_PBP_EXTRACTION**
