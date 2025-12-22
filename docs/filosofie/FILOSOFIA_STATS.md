# ⚠️ DOCUMENTO DEPRECATO

> Questo file è stato archiviato. Usa [FILOSOFIA_STATS_V2.md](FILOSOFIA_STATS_V2.md).

Riferimento: [FILOSOFIA_MADRE.md](FILOSOFIA_MADRE.md) (sezione Documenti deprecati)

---

## Perché deprecato

Il contenuto originale (2200+ righe) conteneva:
- Codice inline che appartiene ai file sorgente
- Formule duplicate rispetto al codice
- Dettagli implementativi non architetturali

---

## Contenuti migrati in V2

| Sezione | Destinazione |
|---------|--------------|
| Quick Reference funzioni | V2 → sezione 9 (Mappatura Funzioni → File) |
| Schema relazioni moduli | V2 → sezione 10 |
| Classificazione RAW/DERIVED/DYNAMIC | V2 → sezione 3 |
| Livelli Player/Match/Combined | V2 → sezione 4 |

---

## Contenuti rimossi (nel codice)

I seguenti contenuti **restano solo nel codice sorgente**:

| Contenuto | File di riferimento |
|-----------|---------------------|
| Formule volatility/elasticity | `backend/utils/valueInterpreter.js` |
| Trading strategies | `src/utils.js` |
| Pressure calculation | `backend/utils/pressureCalculator.js` |
| Break detection | `backend/utils/breakDetector.js` |
| Match segmentation | `backend/utils/matchSegmenter.js` |

---

*Archiviato: 22 Dicembre 2025*
