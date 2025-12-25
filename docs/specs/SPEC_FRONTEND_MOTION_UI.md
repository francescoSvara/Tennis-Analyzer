# ✨ SPEC FRONTEND – UI / MOTION / ICONS (IMPLEMENTATION SPEC)

> **Scopo**: questo documento contiene la **specifica operativa** (task + regole + token) per implementare UI premium, motion e iconografia.
>
> ⚠️ Questo NON è un documento “filosofico”. È una **spec tecnica** che può cambiare spesso.
>
> Riferimento architetturale: `docs/filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md`

---

## 1️⃣ Stack desiderato (vincolante)

- React + TypeScript
- Tailwind CSS
- Animazioni: **Framer Motion** (primary)
- Lottie: opzionale per empty/loading (pochi casi)
- Icone: **Phosphor Icons** (primary) oppure Iconoir (se serve look più geometrico)
- Accessibilità: rispettare `prefers-reduced-motion`

---

## 2️⃣ Obiettivo UX/Motion

Trasformare la dashboard in una UI **high-end** senza eccessi:
- micro-interazioni sui componenti (hover, tap, focus)
- transizioni di pagina/route leggere
- animazioni **data-aware** (quando cambiano filtri e metriche)
- stati: loading, empty, error e success più curati (niente spinner brutti)

---

## 3️⃣ Regole di Motion Design

1) Animazioni rapide e sottili: **180–420ms max**, niente bounce eccessivo.
2) Easing custom (non usare solo easeInOut):
   - default: `cubic-bezier(0.22, 1, 0.36, 1)` (easeOut “premium”)
   - ingresso: opacity + y (8–16px)
   - hover: scale 0.98→1 o 1→1.02 con ombra/blur leggero (senza esagerare)
3) Layout shift: usare **layout animations** quando cambiano card/filtri.
4) Riduzione motion: se `prefers-reduced-motion`, disattivare spostamenti e usare solo fade.

---

## 4️⃣ Iconografia

- Usare **un unico set** in tutta la UI.
- Se Phosphor: scegliere **weight coerente** (es. `duotone` o `regular`) e mantenerlo ovunque.
- Dimensioni standard:
  - sidebar/menu: **20–22**
  - azioni su card: **18–20**
  - KPI header: **24–28**
- Mantenere stroke/weight coerente anche nei bottoni (non mischiare stili).

---

## 5️⃣ Componenti da migliorare (TASK)

### 5.1 DashboardPage layout
- Header con titolo + chip filtri (stagione, campionato, squadra)
- KPI cards (x4) animate al mount e al cambio filtro (stagger)
- Tab switch (Overview / Match / Players / Trends) con underline animata
- Sezione grafici e tabella partite

### 5.2 KPI Card “premium”
- hover: leggero lift (y -2/-4), shadow soft, bordi 2xl, transizione morbida
- on filter change: animate number (count-up) + highlight breve (glow/fade) senza flash
- icona grande top-right in duotone con opacità bassa

### 5.3 DataTable (partite)
- righe con hover elegante (bg + subtle slide indicator)
- sort icon animata (rotate/fade)
- row expansion (accordion) con AnimatePresence

### 5.4 Sidebar + Nav
- icone coerenti + hover indicator animato (pill/left border)
- item attivo con micro-motion (layoutId per pill)

### 5.5 Stati (importantissimo)
- Loading: skeleton elegante (shimmer leggerissimo) o Lottie SOLO se davvero serve e coerente con brand
- Empty state: illustrazione/animazione Lottie minimale + call to action
- Error state: messaggio chiaro + retry button con micro-interazione
- Success toast/snackbar con motion pulita

---

## 6️⃣ Implementazione (file e struttura)

### 6.1 Dipendenze
- `framer-motion`
- `@phosphor-icons/react` (oppure `iconoir-react`)
- `lottie-react` (opzionale)

### 6.2 Motion tokens
Creare:
- `src/motion/tokens.ts`
  - durations (fast, normal, slow)
  - easings
  - varianti: `fadeUp`, `fade`, `scaleIn`, `staggerContainer`, `tableRow`

### 6.3 Wrapper components
Creare wrapper:
- `<MotionCard>`
- `<MotionButton>`
- `<MotionTab>`
- `<MotionRow>`

### 6.4 AnimatePresence
Usare `AnimatePresence` per mount/unmount:
- modali
- drawer
- espansioni
- tab content

### 6.5 prefers-reduced-motion
Usare `useReducedMotion()`:
- se true: rimuovere y/scale
- mantenere solo opacity

---

## 7️⃣ Varianti base (da implementare)

### fadeUp
```js
initial: { opacity: 0, y: 12 }
animate: { opacity: 1, y: 0 }
exit:    { opacity: 0, y: 8 }
transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
```

### cardHover
```js
whileHover: { y: -3, scale: 1.01 }
transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
```

### staggerContainer
```js
animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } }
```

---

## 8️⃣ Look & Feel

- Card: `rounded-2xl`, shadow soft, border subtle, spacing generosa
- Tipografia: numeri KPI ben leggibili, gerarchia chiara
- Colore: niente arcobaleno: 1 colore primario + 1 accento; stati discreti
- Densità: dashboard “aria”, non troppo compressa

---

## 9️⃣ Output atteso

1) PR diff o codice completo per:
- `motion/tokens.ts`
- `components/MotionCard.tsx`, `MotionButton.tsx`, `MotionTabs.tsx`
- `pages/DashboardPage.tsx` (o equivalent)
- `components/KpiCard.tsx`, `MatchTable.tsx`, `SidebarNav.tsx`

2) Aggiornare almeno:
- 1 empty state
- 1 loading state

3) Verificare coerenza (no over-animation).

---

## ✅ Nota finale

- Evitare animazioni standard/banali
- Coerenza prima di tutto
- Lottie solo se minimale/coerente (altrimenti placeholder + istruzioni)
- Non introdurre dipendenze pesanti inutili

Riferimento: `docs/filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md` (principi e responsabilità)

