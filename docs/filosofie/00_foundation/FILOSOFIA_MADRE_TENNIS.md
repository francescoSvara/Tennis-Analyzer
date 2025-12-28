# 🧠 FILOSOFIA MADRE – TENNIS ANALYZER (CONCETTO)

> **Costituzione del sistema**
> Questo documento definisce le **verità non negoziabili** del progetto Tennis Analyzer.
> Ogni scelta architetturale, tecnica e concettuale **discende da qui**.

---

## 1️⃣ Perché esiste questo sistema

Il sistema esiste per:
- trasformare **eventi grezzi di tennis** in **conoscenza strutturata**
- separare **dato**, **interpretazione** e **decisione**
- permettere analisi, strategie e visualizzazione **senza ambiguità**

Il progetto è **AI-first**: progettato per essere compreso e mantenuto da umani e AI.

---

## 2️⃣ Principio di Verità

> **Il dato grezzo non è mai verità.**
> La verità nasce solo dopo interpretazione controllata.

Conseguenze:
- l’interpretazione avviene **solo nel backend**
- il frontend **consuma**, non deduce
- nessuna metrica vive senza contesto

---

## 3️⃣ MatchBundle come unità di realtà

Il **MatchBundle** è l’unica rappresentazione valida di un match.

- tutto converge lì
- tutto viene versionato lì
- tutto viene consumato da lì

Non esistono:
- scorciatoie
- endpoint alternativi
- calcoli fuori bundle

---

## 4️⃣ Separazione dei ruoli

Il sistema cresce per **ruoli**, non per file:

- Data Engineer → Repository
- Analyst → Calculations
- Domain Architect → Services
- Strategist → Strategy Engine
- Frontend Engineer → UI

Un ruolo non invade mai un altro.

---

## 5️⃣ Tempo, Versioni, Qualità

Ogni dato:
- ha un **tempo**
- ha una **versione**
- ha una **qualità osservabile**

Un dato senza questi attributi è **incompleto**.

---

## 6️⃣ AI come cittadino vincolato

L’AI:
- non modifica filosofie
- non inventa scorciatoie
- segnala violazioni

Il codice si adatta alla filosofia, **mai il contrario**.

---

## 7️⃣ Regola finale

> **Se una decisione non è documentata, non è valida.**

---

## 📚 Riferimenti

### 🧭 Documenti Figli

| Layer | Documento | Scopo |
|-------|-----------|-------|
| 🗄️ Data Platform | [FILOSOFIA_DB](../10_data_platform/storage/FILOSOFIA_DB.md) | Schema, snapshot, persistenza |
| ⏰ Temporal | [FILOSOFIA_TEMPORAL](../10_data_platform/temporal/FILOSOFIA_TEMPORAL.md) | Time semantics |
| 🔖 Registry | [FILOSOFIA_REGISTRY_CANON](../10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md) | Identità canoniche |
| 📜 Lineage | [FILOSOFIA_LINEAGE_VERSIONING](../10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md) | Versioning |
| 🔍 Quality | [FILOSOFIA_OBSERVABILITY_DATAQUALITY](../10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md) | Data Quality |
| 🎾 Tennis | [FILOSOFIA_LIVE_TRACKING](../20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md) | Live tracking |
| 🎾 Tennis | [FILOSOFIA_PBP_EXTRACTION](../20_domain_tennis/FILOSOFIA_PBP_EXTRACTION.md) | Point-by-Point |
| 💹 Odds | [FILOSOFIA_ODDS](../30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md) | Market data |
| 📊 Analytics | [FILOSOFIA_STATS](../40_analytics_features_models/stats/FILOSOFIA_STATS.md) | Features & Strategies |
| 🧮 Calcoli | [FILOSOFIA_CALCOLI](../40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md) | Funzioni calcolo |
| 💰 Risk | [FILOSOFIA_RISK_BANKROLL](../50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md) | Bankroll management |
| 🖥️ Frontend | [FILOSOFIA_FRONTEND](../70_frontend/ui/FILOSOFIA_FRONTEND.md) | UI/UX |
| 🔌 Data Consumption | [FILOSOFIA_FRONTEND_DATA_CONSUMPTION](../70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) | Hook & cache |

### 🏠 Navigazione
- ⬆️ **Indice principale**: [INDEX_FILOSOFIE](../INDEX_FILOSOFIE.md)
- 🧪 **Checks correlato**: [FILOSOFIA_CONCEPT_CHECKS](./FILOSOFIA_CONCEPT_CHECKS.md)

---

**Fine FILOSOFIA MADRE – Concetto**
