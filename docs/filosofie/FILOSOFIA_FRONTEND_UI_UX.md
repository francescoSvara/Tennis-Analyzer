# 🎨 FILOSOFIA FRONTEND UI / UX

> **Scopo**: definire il ruolo, i confini e i principi del frontend nel progetto.
>
> Questo documento è **architetturale**. Per implementazioni → `docs/specs/SPEC_FRONTEND_MOTION_UI.md`

---

## 1️⃣ Ruolo del Frontend

Il frontend è un **consumer intelligente** del sistema.

- visualizza dati canonici e runtime
- reagisce a filtri, stato live, navigazione
- non prende decisioni di dominio

**Regola chiave**:
> Il frontend decide *come mostrare* i dati, non *cosa sono*.

---

## 2️⃣ Confini di responsabilità

### Il frontend PUÒ
- aggregare dati per visualizzazione
- gestire stati UI (loading, empty, error)
- animare transizioni e micro-interazioni

### Il frontend NON PUÒ
- ricalcolare metriche
- modificare formule o pesi
- dedurre segnali o decisioni

---

## 3️⃣ Principi guida

| Principio | Descrizione |
|-----------|-------------|
| **Premium & pulita** | UI data-driven, gerarchia visiva forte |
| **Motion sottile** | Micro > macro, no effetti decorativi |
| **Coerenza** | Un set icone, un sistema colori, un ritmo |
| **Accessibilità** | Rispetto di `prefers-reduced-motion` |

---

## 4️⃣ Regola finale

Se una modifica UI:
- cambia il significato di una metrica
- introduce una nuova interpretazione
- influenza una decisione

➡️ NON è frontend UI/UX: va discussa a livello di Stats o Backend.

---

## 🔗 Riferimenti

| Documento | Responsabilità |
|-----------|----------------|
| [SPEC_FRONTEND_MOTION_UI.md](../specs/SPEC_FRONTEND_MOTION_UI.md) | Task, token, componenti, snippet |
| [FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md](FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) | Fetch, loading, error, live vs snapshot |
| [FILOSOFIA_STATS_V2.md](FILOSOFIA_STATS_V2.md) | Metriche e calcoli |
| [FILOSOFIA_LIVE_TRACKING.md](FILOSOFIA_LIVE_TRACKING.md) | Dati runtime |

