# 🎾 FILOSOFIA PBP EXTRACTION

> Queste regole sono state scoperte dopo 10+ ore di debugging.  
> **NON MODIFICARE** senza revisione completa.

---

## 1️⃣ Perché Questo Documento

Il Point-by-Point extraction da SofaScore HTML ha regole specifiche che, se ignorate, producono dati corrotti.

Questo documento è **COSTITUZIONALE**: ogni riga di codice PBP deve rispettare queste regole.

---

## 2️⃣ Invarianti Tennis (Non Negoziabili)

### Server Score Progression
Chi serve vede il suo score aumentare quando vince punti.

### Alternanza Servizio
Il servizio alterna ogni game (eccetto tiebreak).  
Nuovo set: chi NON ha servito l'ultimo game del set precedente.

### Break Definition
BREAK = vincere un game sul servizio avversario.

### Tiebreak Rotation
Nel tiebreak il servizio ruota ogni 2 punti (dopo il primo).

### Score Display Convention
Score mostrato sempre dal punto di vista del server.

### Point Winner = Score Change
Chi vince il punto è chi vede aumentare il proprio score.

---

## 3️⃣ Regola Critica SofaScore HTML

```
⚠️ ATTENZIONE MASSIMA ⚠️

In SofaScore HTML:
  row1 = HOME (sempre)
  row2 = AWAY (sempre)

Questo NON CAMBIA MAI.
```

❌ **SBAGLIATO**: assumere che il mapping cambi per blocco
✅ **CORRETTO**: `homeScore = row1Score`, `awayScore = row2Score` sempre

---

## 4️⃣ Point Winner Detection

Il `pointWinner` si determina dal **colore CSS** della cella:
- `row1Won` (verde su row1) → HOME ha vinto
- `row2Won` (verde su row2) → AWAY ha vinto

❌ **MAI** determinare winner da chi ha score più alto.

---

## 5️⃣ Server Detection

Il server si determina:
1. Dall'icona palla nel game header
2. Dall'alternanza logica se icona mancante
3. Dal `homeServed` boolean nella row

---

## 6️⃣ Regola Finale

> Se i dati PBP risultano incoerenti con le regole tennis, **IL CODICE È SBAGLIATO**.
>
> Le regole tennis sono invarianti. Il codice deve adattarsi.

---

**Documenti Correlati**:
- [FILOSOFIA_DB](../10_data_platform/storage/FILOSOFIA_DB.md) – schema point_by_point
- [FILOSOFIA_LIVE_TRACKING](./live_scoring/FILOSOFIA_LIVE_TRACKING.md) – PBP real-time
- [FILOSOFIA_TEMPORAL](../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) – timestamps eventi
