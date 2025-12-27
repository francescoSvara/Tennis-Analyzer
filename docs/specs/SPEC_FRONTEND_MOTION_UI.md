# ✨ SPEC FRONTEND – UI / MOTION / ICONS
## Implementation Spec – Premium UI Design

> **Dominio**: Frontend · UI Design · Animation · Iconography  
> **Stato**: ATTIVA  
> **Tipo**: Specifica Operativa  
> **Ultimo aggiornamento**: 27 Dicembre 2025  

---

## 🧭 NAVIGAZIONE ARCHITETTURA

| ⬆️ Padre | ➡️ Correlato |
|---------|--------------|
| [FILOSOFIA_FRONTEND](../filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md) | [FRONTEND_DATA](../filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md) |

### 📁 File Codice Principali

| Tipo | File |
|------|------|
| Motion Tokens | [`src/motion/tokens.js`](../../src/motion/tokens.js) |
| Motion Components | [`src/motion/`](../../src/motion/) |
| UI Components | [`src/components/`](../../src/components/) |

---

## 0️⃣ SCOPO DEL DOCUMENTO

> ⚠️ Questo NON è un documento "filosofico". È una **spec tecnica** operativa.

Definisce:
- Stack tecnologico UI/Motion
- Regole di motion design
- Standard iconografici
- Componenti da implementare

---

## 1️⃣ STACK TECNOLOGICO (VINCOLANTE)

| Tecnologia | Ruolo | Note |
|------------|-------|------|
| **React + TypeScript** | Base | - |
| **Tailwind CSS** | Styling | - |
| **Framer Motion** | Animazioni | Primary |
| **Lottie** | Empty/Loading states | Opzionale |
| **Phosphor Icons** | Iconografia | Primary |
| **Iconoir** | Alternative | Se serve look geometrico |

### Accessibilità

```
ASSERT prefers-reduced-motion RESPECTED
```

---

## 2️⃣ OBIETTIVO UX/MOTION

Trasformare la dashboard in una UI **high-end** senza eccessi:

- ✅ Micro-interazioni sui componenti (hover, tap, focus)
- ✅ Transizioni di pagina leggere
- ✅ Animazioni **data-aware** (cambio filtri/metriche)
- ✅ Stati loading/empty/error/success curati
- ❌ NO spinner brutti
- ❌ NO bounce eccessivo

---

## 3️⃣ REGOLE MOTION DESIGN

### 3.1 Durata e Timing

| Tipo | Durata | Note |
|------|--------|------|
| Micro-interactions | 180ms | Hover, focus |
| Transizioni | 280-320ms | Route change, tab switch |
| Layout animations | 320-420ms | Reorder, resize |
| **MAX** | 420ms | Mai superare |

### 3.2 Easing

```javascript
// Default premium
const easing = [0.22, 1, 0.36, 1];  // cubic-bezier

// ❌ EVITARE
// easeInOut standard
// bounce eccessivo
```

### 3.3 Pattern di Ingresso

```javascript
// fadeUp (standard)
initial: { opacity: 0, y: 12 }
animate: { opacity: 1, y: 0 }
exit:    { opacity: 0, y: 8 }
transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
```

### 3.4 Pattern Hover

```javascript
// cardHover
whileHover: { y: -3, scale: 1.01 }
transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] }

// ❌ NO scale > 1.05
// ❌ NO y > 5px
```

### 3.5 Stagger

```javascript
// staggerContainer
animate: { 
  transition: { 
    staggerChildren: 0.06, 
    delayChildren: 0.04 
  } 
}
```

### 3.6 Reduced Motion

```javascript
IF prefers-reduced-motion
  THEN remove y/scale transforms
  KEEP only opacity transitions
```

---

## 4️⃣ ICONOGRAFIA

### 4.1 Set Unico

```
USE Phosphor Icons (primary)
  OR Iconoir (if geometric needed)

NEVER mix icon sets
```

### 4.2 Weight Coerente

| Contesto | Weight |
|----------|--------|
| Sidebar/Menu | `duotone` o `regular` |
| Card actions | `regular` |
| KPI header | `bold` o `fill` |

### 4.3 Dimensioni Standard

| Contesto | Size |
|----------|------|
| Sidebar/Menu | 20-22px |
| Card actions | 18-20px |
| KPI header | 24-28px |

---

## 5️⃣ COMPONENTI DA IMPLEMENTARE

### 5.1 Motion Components

| Componente | Scopo |
|------------|-------|
| `<MotionCard>` | Card con hover lift |
| `<MotionButton>` | Button con feedback |
| `<MotionTab>` | Tab con underline animata |
| `<MotionRow>` | Row con hover indicator |

### 5.2 KPI Card Premium

```
✅ Hover: leggero lift (y -2/-4), shadow soft
✅ On filter change: animate number (count-up)
✅ Icona grande top-right in duotone
❌ NO flash
❌ NO bounce
```

### 5.3 DataTable

```
✅ Righe con hover elegante (bg + subtle slide)
✅ Sort icon animata (rotate/fade)
✅ Row expansion con AnimatePresence
```

### 5.4 Stati

| Stato | Implementazione |
|-------|-----------------|
| **Loading** | Skeleton con shimmer leggerissimo |
| **Empty** | Illustrazione minimale + CTA |
| **Error** | Messaggio chiaro + retry button |
| **Success** | Toast/snackbar con motion pulita |

---

## 6️⃣ STRUTTURA FILE

```
src/
├── motion/
│   ├── tokens.js         # durations, easings, variants
│   ├── MotionCard.jsx
│   ├── MotionButton.jsx
│   ├── MotionTab.jsx
│   ├── MotionRow.jsx
│   └── index.js          # exports
```

### 6.1 Motion Tokens

```javascript
// src/motion/tokens.js

export const durations = {
  fast: 0.18,
  normal: 0.32,
  slow: 0.42
};

export const easings = {
  premium: [0.22, 1, 0.36, 1],
  bounce: [0.68, -0.6, 0.32, 1.6]
};

export const variants = {
  fadeUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 }
  },
  // ...
};
```

---

## 7️⃣ LOOK & FEEL

| Aspetto | Standard |
|---------|----------|
| **Card** | `rounded-2xl`, shadow soft, border subtle |
| **Tipografia** | Numeri KPI leggibili, gerarchia chiara |
| **Colore** | 1 primario + 1 accento, stati discreti |
| **Densità** | Dashboard "aria", non compressa |

---

## 8️⃣ CHECKLIST IMPLEMENTAZIONE

> ⚠️ **Le checklist sono state consolidate in** [`docs/TODO_LIST.md`](../TODO_LIST.md#32-checklist-motion-ui-spec_frontend_motion_uimd)
> 
> Vai al documento TODO_LIST per tracciare lo stato delle implementazioni.

---

## ⚠️ REGOLE FINALI

```
❌ NO animazioni standard/banali
❌ NO dipendenze pesanti inutili
❌ NO Lottie se non minimale/coerente
✅ Coerenza prima di tutto
✅ Performance first
```

---

**Fine documento – SPEC_FRONTEND_MOTION_UI**

