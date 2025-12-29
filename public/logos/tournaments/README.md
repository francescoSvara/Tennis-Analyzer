# 🎾 Tournament Logos

Questa cartella contiene i loghi dei tornei di tennis visualizzati nelle card dei match.

## 📁 Come aggiungere un nuovo logo

### 1. Salva il file immagine in questa cartella

Formati supportati: `.png`, `.svg`, `.jpg`, `.webp`
**Preferire PNG o SVG** per qualità ottimale.

### 2. Rinomina il file seguendo queste regole:

- Tutto **minuscolo**
- **Spazi** sostituiti con **trattini** `-`
- **Nessun carattere speciale** (solo lettere, numeri, trattini)
- Estensione `.png`

### Esempi di nomi file corretti:

| Torneo          | Nome File             |
| --------------- | --------------------- |
| Australian Open | `australian-open.png` |
| Roland Garros   | `roland-garros.png`   |
| US Open         | `us-open.png`         |
| Monte Carlo     | `monte-carlo.png`     |
| Indian Wells    | `indian-wells.png`    |
| United Cup      | `united-cup.png`      |
| ATP Finals      | `atp-finals.png`      |
| Davis Cup       | `davis-cup.png`       |

### 3. Aggiungi il mapping nel codice (opzionale)

Se il nome del torneo nel database è diverso dal nome del file, aggiungi il mapping in:
`src/utils/tournamentLogos.js`

```javascript
const TOURNAMENT_LOGOS = {
  // ... altri tornei ...
  'nome torneo nel db': 'nome-file.png',
  'variante del nome': 'nome-file.png', // Stessa immagine, nome diverso
};
```

## 🔍 Come trovare i loghi mancanti

Apri la **Console del browser** (F12 → Console) e vedrai messaggi come:

```
[Logo mancante] Torneo: "Brisbane International" → Rinomina il logo come: "brisbane-international.png"
```

## 📏 Dimensioni consigliate

- Dimensione: **200x200** pixel (quadrato)
- Formato: **PNG** con sfondo trasparente
- Peso: **< 50KB** per performance ottimali

## 🏆 Loghi già configurati

### Grand Slam

- `australian-open.png`
- `roland-garros.png`
- `wimbledon.png`
- `us-open.png`

### ATP 1000

- `indian-wells.png`
- `miami-open.png`
- `monte-carlo.png`
- `madrid-open.png`
- `rome.png`
- `canada.png`
- `cincinnati.png`
- `shanghai.png`
- `paris.png`

### Team Events

- `united-cup.png`
- `atp-cup.png`
- `davis-cup.png`
- `laver-cup.png`

### Default/Fallback

- `atp-default.png` - Usato per tornei ATP non mappati
- `wta-default.png` - Usato per tornei WTA non mappati
- `itf-default.png` - Usato per tornei ITF non mappati
- `challenger.png` - Logo generico ATP Challenger

## ⚠️ Note importanti

1. **Il logo NON appare?**

   - Verifica il nome del file sia corretto
   - Controlla la console del browser per errori
   - Assicurati che il file sia in questa cartella

2. **Il torneo ha più nomi?**

   - Aggiungi tutte le varianti nel mapping in `tournamentLogos.js`
   - Esempio: "Roland Garros" e "French Open" puntano allo stesso logo

3. **Vuoi un logo di default?**
   - Crea `atp-default.png` per i tornei ATP senza logo specifico
