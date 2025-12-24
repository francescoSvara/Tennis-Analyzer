# 🧪 FILOSOFIA CONCEPT CHECKS  
## Versione V2 – Semantic & Architectural Guardrails

> **Dominio**: Architettura · Qualità · Governance del Codice  
> **Stato**: ATTIVA  
> **Sostituisce**: `FILOSOFIA_CONCEPT_CHECKS.md` (V1 – DEPRECATA)  
> **Ultimo aggiornamento**: Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | 🔍 Valida | 🛡️ Protegge |
|---------|---------|------------|
| [FILOSOFIA_MADRE](FILOSOFIA_MADRE_TENNIS_ROLE_DRIVEN.md) | TUTTI i documenti | MatchBundle, Feature Engine, Strategy Engine |

---

## 0️⃣ SCOPO DEL DOCUMENTO (AGGIORNATO)

I **Concept Checks** sono il sistema immunitario del progetto.

Servono a:
- prevenire regressioni architetturali
- garantire coerenza tra documentazione e codice
- rendere l’uso di AI / Copilot sicuro
- proteggere MatchBundle, Feature Engine e Strategy Engine

❌ NON validano formule  
❌ NON sostituiscono i test  
❌ NON giudicano performance  

👉 Verificano **responsabilità e ruolo del codice**.

---

## 1️⃣ PRINCIPIO FONDANTE

> **Ogni pezzo di codice deve sapere:**
> - *chi è*
> - *cosa può fare*
> - *cosa non deve fare*

Se questo non è verificabile automaticamente → l’architettura è fragile.

---

## 2️⃣ CAMBIO DI PARADIGMA (V1 → V2)

### V1
- controlli su path
- controlli su import
- pattern statici

### V2
- controlli **semantici**
- controlli **sull’output**
- controlli **sulla responsabilità**
- guardrail sulle **decisioni**

👉 La V1 controlla *dove sta il codice*.  
👉 La V2 controlla *cosa sta facendo*.

---

## 3️⃣ INVARIANTI ARCHITETTURALI (NON NEGOZIABILI)

### 3.1 MatchBundle Invariant

```text
La Match Page frontend può consumare SOLO MatchBundle.
```

Violazioni:
- fetch FE verso `/stats`, `/momentum`, `/odds`, `/pbp` → ❌ ERROR
- composizione manuale di dati in FE → ❌ ERROR

---

### 3.2 Backend Interpretation Invariant

```text
Solo il backend interpreta i dati.
```

Violazioni:
- calcoli pressure/momentum/edge in FE → ❌ ERROR
- FE che combina due feature → ❌ ERROR

---

### 3.3 Feature vs Strategy Invariant

| Livello | Può fare |
|------|---------|
| Feature Engine | calcolare numeri |
| Strategy Engine | decidere READY/WATCH/OFF |
| Frontend | visualizzare segnali |

Violazioni:
- funzione che ritorna READY fuori dallo Strategy Engine → ❌ ERROR
- feature che decide un’azione → ❌ ERROR

---

### 3.4 Signal Invariant

```text
I segnali NON sono metriche.
```

Violazioni:
- persistenza DB di READY/WATCH/OFF → ❌ ERROR
- uso dei segnali come input statistico → ❌ ERROR

---

### 3.5 Data Quality Invariant

```text
La Data Quality è calcolata solo nel backend.
```

Violazioni:
- FE con `calculateDataCompleteness` → ❌ ERROR
- fallback logici FE basati su completeness → ❌ ERROR

---

## 4️⃣ CLASSI DI CHECK (V2)

### 4.1 Structural Checks (ereditati V1)
- path-based
- import-based
- forbidden modules

➡️ Rimangono invariati.

---

### 4.2 Semantic Checks (nuovi)

Verificano:
- tipo di output
- responsabilità implicita
- contesto di esecuzione

Esempio:
```pseudo
IF function returns { status, confidence, action }
AND NOT in Strategy Engine:
  ERROR STRATEGY_OUTSIDE_ENGINE
```

---

### 4.3 Output-Based Checks

Analizzano:
- forma del return object
- naming semantico
- persistenza indebita

Esempio:
```pseudo
IF object persisted AND contains status READY/WATCH:
  ERROR PERSISTING_SIGNAL
```

---

## 5️⃣ RULES REGISTRY (VERSIONATO)

### File consigliati
```
docs/concept/rules.v1.json   (legacy)
docs/concept/rules.v2.json   (semantic)
```

### Struttura V2 (estensione)

```json
{
  "version": 2,
  "invariants": [
    {
      "id": "MATCHBUNDLE_ONLY_FE",
      "severity": "ERROR",
      "description": "Frontend must consume MatchBundle only"
    }
  ],
  "semanticRules": [
    {
      "id": "STRATEGY_OUTSIDE_ENGINE",
      "match": "return.status",
      "allowedDomains": ["strategy_engine"]
    }
  ]
}
```

---

## 6️⃣ SEVERITÀ E CI

| Livello | Effetto |
|------|--------|
| ERROR | blocca CI |
| WARN | report + TODO |
| INFO | solo documentazione |

Policy:

```pseudo
IF errors > 0:
  FAIL
ELSE:
  PASS
```

---

## 7️⃣ MODALITÀ DI SCANSIONE

- **Full Scan**: main / release
- **Diff Scan**: PR / feature branch

La V2 usa **gli stessi runner** della V1.

---

## 8️⃣ ECCEZIONI (ALLOWLIST)

Eccezioni:
- devono essere rare
- motivate
- annotate

### Annotazione codice

```ts
// philosophy:allow STRATEGY_OUTSIDE_ENGINE reason="temporary experiment"
```

Check:
```pseudo
IF rule in allowlist:
  downgrade severity
```

---

## 9️⃣ REPORTING

Output obbligatori:
- `docs/checks/report.md`
- `docs/checks/report.json`

Ogni finding deve includere:
- rule id
- file
- linea
- spiegazione umana
- remediation

---

## 🔟 COSA QUESTO DOCUMENTO NON È

- non è una guida di implementazione
- non è una lista di regole ESLint
- non è una spec CI/CD

È una **costituzione architetturale**.

---

## 1️⃣1️⃣ REGOLA FINALE

Se un check:
- produce troppi falsi positivi
- è difficile da spiegare
- non è legato a una filosofia

➡️ **va rimosso o semplificato**.

La disciplina architetturale viene prima del tooling.

---

## 📍 NAVIGAZIONE RAPIDA

| ⬅️ Precedente | 🏠 Index | ➡️ Successivo |
|--------------|--------|---------------|
| [FRONTEND_UI](FILOSOFIA_FRONTEND.md) | [📚 INDEX](INDEX_FILOSOFIE.md) | [MADRE](FILOSOFIA_MADRE_TENNIS_ROLE_DRIVEN.md) |

---

**Fine documento – FILOSOFIA_CONCEPT_CHECKS_V2**
