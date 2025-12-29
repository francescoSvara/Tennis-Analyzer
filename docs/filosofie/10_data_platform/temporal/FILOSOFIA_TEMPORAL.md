# ⏰ FILOSOFIA TEMPORAL SEMANTICS (CONCETTO)

> **Il tempo è una regola, non un dettaglio**
> Questo documento definisce come il tempo governa ogni dato del sistema.
> Senza tempo corretto, ogni edge è potenzialmente finto.

---

## 1️⃣ Perché esiste questo documento

Nel betting:

- Odds e live sono **serie temporali**
- Ogni quota ha un momento di validità
- Usare dati futuri = **leakage fatale**

Il tempo non è metadata. È **constraint**.

---

## 2️⃣ I Quattro Tempi

| Tempo            | Significato                              |
| ---------------- | ---------------------------------------- |
| `event_time`     | Quando l'evento è valido nel mondo reale |
| `source_time`    | Timestamp dalla fonte esterna            |
| `ingestion_time` | Quando il nostro sistema riceve il dato  |
| `as_of_time`     | Cut temporale per calcoli/snapshot       |

Non confonderli mai.

---

## 3️⃣ Anti-Leakage

> **Regola d'oro: nessun dato con event_time > as_of_time può essere usato.**

Esempio distruttivo:

- Match inizia alle 14:00
- Calcolo features alle 13:55 usando quota delle 14:05
- Risultato: edge finto, modello inutile

---

## 4️⃣ Staleness

I dati invecchiano. Thresholds:

| Tipo           | Max Age |
| -------------- | ------- |
| Live score     | 30s     |
| Odds live      | 10s     |
| Odds pre-match | 1 min   |
| Player stats   | 1 day   |

Oltre = warning o quarantine.

---

## 5️⃣ Snapshot Coerenti

Ogni MatchBundle ha `as_of_time`.

Tutti i dati nel bundle devono avere `event_time <= as_of_time`.

Nessuna eccezione.

---

## 6️⃣ Regola finale

> **Se non sai quando un dato era valido, non puoi usarlo per decisioni.**

---

## 📚 Riferimenti

### 🧭 Navigazione

| ⬆️ Padre                                                         | ⬅️ Dipende da                              | ➡️ Usato da                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| [FILOSOFIA_MADRE](../../00_foundation/FILOSOFIA_MADRE_TENNIS.md) | [FILOSOFIA_DB](../storage/FILOSOFIA_DB.md) | [FILOSOFIA_LINEAGE](../lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md)                |
| [INDEX_FILOSOFIE](../../INDEX_FILOSOFIE.md)                      |                                            | [FILOSOFIA_LIVE_TRACKING](../../20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md) |

### � Pseudocode

| Documento                                                          | Descrizione               |
| ------------------------------------------------------------------ | ------------------------- |
| [FILOSOFIA_TEMPORAL_PSEUDOCODE](./FILOSOFIA_TEMPORAL_PSEUDOCODE.md) | Regole formali temporal   |

### �📁 File Codice Principali

| File                                                                                       | Descrizione                    |
| ------------------------------------------------------------------------------------------ | ------------------------------ |
| [`backend/liveManager.js`](../../../../backend/liveManager.js)                             | Gestione live polling adattivo |
| [`backend/services/matchCardService.js`](../../../../backend/services/matchCardService.js) | Meta block temporali           |
| [`backend/utils/dataQualityChecker.js`](../../../../backend/utils/dataQualityChecker.js)   | Staleness checks               |

---

**Fine FILOSOFIA_TEMPORAL – Concetto**
