# 🔌 FILOSOFIA FRONTEND – DATA CONSUMPTION

> Il frontend non interpreta il match.  
> Il frontend visualizza uno stato già interpretato.

---

## 1️⃣ Principio Fondante

Il frontend:
- Riceve **un solo payload** (MatchBundle)
- Non conosce DB, pipeline o fonti
- Non ricalcola metriche
- Non deduce logica di dominio

Il frontend è **stateless a livello logico**.

---

## 2️⃣ La Regola d'Oro

> "Mostrare dati" significa CALCOLARE dati, non passarli.

❌ **SBAGLIATO**: `{features.volatility || 'N/A'}`  
❌ **SBAGLIATO**: `{features.volatility ?? 50}` (default fisso)

✅ **CORRETTO**: Il backend calcola SEMPRE un valore usando la gerarchia di fallback. Non esiste "non ho dati" se il match esiste.

---

## 3️⃣ Payload Unico: MatchBundle

```http
GET /api/match/:matchId/bundle
```

Il MatchBundle contiene **tutto** per:
- Overview, Strategie, Odds
- Point-by-Point, Stats, Momentum
- Predictor, Journal, Data Quality

❌ Nessun altro endpoint richiesto per la Match Page.

---

## 4️⃣ Modello Mentale Frontend

```
MatchBundle
  ├─ header
  ├─ tabs.overview
  ├─ tabs.strategies
  ├─ tabs.odds
  ├─ tabs.pointByPoint
  ├─ tabs.stats
  ├─ tabs.momentum
  ├─ tabs.predictor
  ├─ tabs.journal
  └─ dataQuality
```

Ogni tab:
- Legge solo la sua sezione
- Non dipende dalle altre
- Non ricalcola nulla

---

## 5️⃣ Caricamento Iniziale

1. Fetch MatchBundle
2. Mostra skeleton strutturale
3. Render completo quando bundle è pronto

Regole:
- Niente spinner globali
- Skeleton per layout, non per dato
- Errore solo se bundle fallisce

---

## 6️⃣ Live Update (WebSocket)

Il frontend **non rifetcha** il bundle intero.

Riceve **patch incrementali**:
- Score changes
- Odds updates
- Point-by-point append
- Strategy signals update

Regole:
- Aggiornare solo componenti impattati
- Non bloccare la UI
- Indicare sempre che il dato è live

---

## 7️⃣ Data Quality (Solo Visiva)

Il frontend:
- Legge `bundle.dataQuality`
- Mostra badge / warning / tooltip
- **Non applica fallback logici**

Se `dataQuality.completeness.odds < 80%`:
→ Mostra warning "dati odds incompleti"
→ Non inventa numeri

---

## 8️⃣ Regola Finale

> Il frontend è un **display layer**.
>
> Mai calcolare, mai dedurre, mai inventare.
>
> Se un dato non è nel bundle, chiedi al backend di aggiungerlo.

---

**Documenti Correlati**:
- [FILOSOFIA_FRONTEND_UI](../ui/FILOSOFIA_FRONTEND.md) – visual design
- [FILOSOFIA_STATS](../../40_analytics_features_models/stats/FILOSOFIA_STATS.md) – bundle producer
- [FILOSOFIA_CALCOLI](../../40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md) – features

### 📁 File Codice Principali

| File | Descrizione |
|------|-------------|
| [`src/hooks/useMatchBundle.jsx`](../../../../src/hooks/useMatchBundle.jsx) | Hook principale fetch bundle |
| [`src/components/`](../../../../src/components/) | UI components |
| [`src/config.js`](../../../../src/config.js) | API configuration |
