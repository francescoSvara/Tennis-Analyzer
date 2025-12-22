# 🧪 FILOSOFIA CONCEPT CHECKS – Guardrail Docs ↔ Code

> **Scopo**: definire un sistema di controlli (Concept Checks) che verifichi che il codice del progetto rispetti le filosofie architetturali.
>
> Questo documento è una **filosofia operativa**: stabilisce *cosa* controllare e *come* strutturare i controlli.
> Le implementazioni concrete vivono nel codice, ma qui ci sono **pseudo-codici e contratti** per costruirle.

---

## 1️⃣ Obiettivo

I Concept Checks servono a:
- ridurre regressioni architetturali
- rendere Copilot/AI “safe” nel repo
- individuare incongruenze tra documentazione e implementazione

I checks non devono:
- validare la correttezza matematica delle formule (quello è testing)
- sostituire review umana

---

## 2️⃣ Principio base: Docs come contratto

Le filosofie definiscono:
- domini (DB/Stats/Live/Frontend/Odds/…)
- confini (cosa può stare dove)
- responsabilità

Il codice deve dichiarare:
- a quale dominio appartiene
- quali eccezioni richiede (rare)

---

## 3️⃣ Struttura dei file (standard)

```text
docs/
  filosofie/
    FILOSOFIA_MADRE.md
    FILOSOFIA_*.md
  concept/
    rules.v1.json
    map.v1.md
  checks/
    report.md
    report.json
scripts/
  concept-checks/
    runConceptChecks.ts
    rulesLoader.ts
    scanners/
    reporters/
```

---

## 4️⃣ Rules Registry (versionato)

### Scopo
Le regole non devono vivere “solo nel testo”. Devono essere codificabili.

### File
- `docs/concept/rules.v1.json`

### Contenuto minimo
```pseudo
rules.v1.json = {
  version: 1,
  domains: {
    frontend_ui: { allowedPaths: [...], forbiddenImports: [...] },
    stats: { allowedPaths: [...], forbiddenPaths: [...] },
    live: { ... },
    odds: { ... }
  },
  invariants: [
    { id, severity, description, matchers, remediation }
  ],
  allowlist: [
    { matcher, reason }
  ]
}
```

---

## 5️⃣ Severità e gating CI

### Severità
- **ERROR**: viola un confine architetturale → fail CI
- **WARN**: possibile incongruenza → non blocca, ma report + TODO
- **INFO**: suggerimenti

### Policy consigliata
```pseudo
IF errors_count > 0:
  fail_pipeline()
ELSE:
  pass_pipeline_with_warnings()
```

---

## 6️⃣ Due modalità di esecuzione

### Full scan
Controlla tutto il repo.

### Diff scan
Controlla solo file modificati nella PR.

```pseudo
MODE = env("CONCEPT_CHECK_MODE")
IF MODE == "diff":
  files = git_changed_files()
ELSE:
  files = repo_all_files()
```

---

## 7️⃣ Scanner (come rileviamo violazioni)

Gli scanner sono moduli indipendenti.

### 7.1 Domain Scanner (path-based)
Verifica che file e cartelle rispettino i domini.

```pseudo
FOR file IN files:
  domain = infer_domain(file.path)
  IF file.path NOT IN rules.domains[domain].allowedPaths:
    emit(ERROR, "FILE_OUT_OF_DOMAIN", file)
```

### 7.2 Import Scanner (dependency boundaries)
Blocca import proibiti (es. frontend che importa moduli di calcolo dominio).

```pseudo
imports = parse_imports(file)
FOR imp IN imports:
  IF imp MATCH rules.domains[domain].forbiddenImports:
    emit(ERROR, "FORBIDDEN_IMPORT", file, imp)
```

### 7.3 Duplicate Logic Scanner (heuristic)
Individua segnali di logica duplicata (WARN).

```pseudo
IF same_function_name_exists_in(frontend, backend):
  emit(WARN, "POSSIBLE_DUPLICATE_LOGIC", locationA, locationB)
```

### 7.4 Forbidden Keyword/Pattern Scanner (quick wins)
Esempio: bloccare "impliedProbability" nel frontend se deve vivere altrove.

```pseudo
IF domain == frontend AND file.contains(pattern("fairOdds")):
  emit(ERROR, "FORBIDDEN_DOMAIN_CALC", file)
```

---

## 8️⃣ Eccezioni (allowlist) con annotazioni

Le eccezioni devono essere:
- rare
- esplicite
- motivabili

### Tag in codice
```pseudo
// philosophy:allow <RULE_ID> reason="visual-only"
```

### Uso nel check
```pseudo
IF finding.rule_id IN file.annotations.allow:
  downgrade_to(INFO)
```

---

## 9️⃣ Report e output (umano + macchina)

### Output obbligatori
- `docs/checks/report.md` (leggibile)
- `docs/checks/report.json` (macchina)

```pseudo
report = {
  timestamp,
  mode,
  summary: { errors, warns, infos },
  findings: [ { severity, rule_id, file, line, message, remediation } ]
}
write_json(report.json)
write_markdown(report.md)
```

---

## 🔟 Integrazione con TODO

Ogni WARN/ERROR può generare una TODO tecnica.

```pseudo
FOR finding IN findings:
  IF finding.severity IN [ERROR, WARN]:
    append_todo(finding)
```

---

## 1️⃣1️⃣ Regola finale

I Concept Checks devono essere:
- **deterministici** (stessi input → stesso output)
- **versionati** (rules.v1.json)
- **non invasivi** (WARN prima di ERROR quando possibile)

Se un check produce troppi falsi positivi → va semplificato o reso opt-in.

