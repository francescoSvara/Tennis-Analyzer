# 🔖 FILOSOFIA REGISTRY & CANONICAL IDs (CONCETTO)

> **Una entità, una identità**
> Questo documento definisce come ogni giocatore, torneo, match ha un ID unico e stabile.
> Senza identità chiare, le statistiche si attaccano al giocatore sbagliato.

---

## 1️⃣ Perché esiste questo documento

Problema reale:
- SofaScore: "Alcaraz C."
- Odds API: "C. Alcaraz"  
- Display: "Carlos Alcaraz Garfia"

Se non risolvi → player diversi → stats sbagliate → edge finto.

---

## 2️⃣ Principio del Canon

> **Ogni entità ha un canonical_id stabile.**

Il canonical_id:
- non cambia nel tempo
- è unico nel sistema
- mappa tutte le varianti

---

## 3️⃣ Entità Canoniche

| Entità | ID Format | Esempio |
|--------|-----------|---------|
| Player | `sof_123456` | `sof_12345` |
| Match | `sof_14968724` | `sof_14968724` |
| Tournament | `sof_2345` | `sof_2345` |

Il prefisso indica la fonte primaria.

---

## 4️⃣ Resolution Flow

```
Nome grezzo → dataNormalizer → canonical_id
```

Ordine di priorità:
1. ID nativo SofaScore (se disponibile)
2. Mapping da players.json
3. Fuzzy match + conferma manuale

---

## 5️⃣ Alias e Varianti

Ogni player può avere N alias:

```
player_id: sof_12345
name: "Carlos Alcaraz"
aliases: ["C. Alcaraz", "Alcaraz C.", "Carlos Alcaraz Garfia"]
```

Il sistema accetta qualsiasi alias, ritorna sempre il canonical.

---

## 6️⃣ Regola finale

> **Se due record hanno ID diversi, sono entità diverse. Sempre.**

---

## 📚 Riferimenti

### 🧭 Navigazione
| ⬆️ Padre | ⬅️ Correlati | ➡️ Usato da |
|---------|-------------|-------------|
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | [FILOSOFIA_DB](../storage/FILOSOFIA_DB.md) | [FILOSOFIA_LINEAGE](../lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) |
| [INDEX_FILOSOFIE](../../INDEX_FILOSOFIE.md) | | [FILOSOFIA_OBSERVABILITY](../quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) |

### 📁 File Codice Principali

| File | Descrizione |
|------|-------------|
| [`backend/utils/dataNormalizer.js`](../../../../backend/utils/dataNormalizer.js) | Normalizzazione nomi e ID |
| [`data/mappings/`](../../../../data/mappings/) | Mapping files (players, tournaments) |
| [`backend/routes/player.routes.js`](../../../../backend/routes/player.routes.js) | Route player endpoints |
| [`backend/controllers/player.controller.js`](../../../../backend/controllers/player.controller.js) | Controller player search |

---

**Fine FILOSOFIA_REGISTRY_CANON – Concetto**
