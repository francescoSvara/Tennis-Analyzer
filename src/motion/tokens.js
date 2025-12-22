/**
 * Motion Design Tokens
 * Centralizzazione di durations, easings e varianti per animazioni coerenti
 * Ref: docs/specs/SPEC_FRONTEND_MOTION_UI.md
 */

// ============================================
// DURATIONS (in secondi)
// ============================================
export const durations = {
  fast: 0.18,      // hover, micro-interazioni
  normal: 0.32,    // transizioni standard
  slow: 0.42,      // entrate elaborate
  stagger: 0.06,   // delay tra elementi in lista
};

// ============================================
// EASINGS (cubic-bezier)
// ============================================
export const easings = {
  // Easing premium - smooth deceleration
  premium: [0.22, 1, 0.36, 1],
  // Easing per bounce leggero
  softBounce: [0.34, 1.56, 0.64, 1],
  // Easing standard
  easeOut: [0.0, 0.0, 0.2, 1],
  easeIn: [0.4, 0.0, 1, 1],
  easeInOut: [0.4, 0.0, 0.2, 1],
};

// ============================================
// VARIANTI FRAMER MOTION
// ============================================

// Fade Up - entrata standard per elementi
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: durations.normal, ease: easings.premium },
};

// Fade semplice
export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: durations.normal, ease: easings.premium },
};

// Scale In - per modali, popover
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: durations.normal, ease: easings.premium },
};

// Container con stagger per liste
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: durations.stagger,
      delayChildren: 0.04,
    },
  },
  exit: {},
};

// Item per liste con stagger
export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: durations.normal, ease: easings.premium },
};

// Hover per card - effetto lift
export const cardHover = {
  rest: { 
    y: 0, 
    scale: 1,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  hover: { 
    y: -3, 
    scale: 1.01,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
  },
  tap: { 
    scale: 0.99,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
  },
  transition: { duration: durations.fast, ease: easings.premium },
};

// Hover per bottoni
export const buttonHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  transition: { duration: durations.fast, ease: easings.premium },
};

// Hover per righe tabella
export const tableRow = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
  transition: { duration: durations.fast, ease: easings.premium },
};

// Slide da sinistra (per sidebar)
export const slideFromLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: durations.normal, ease: easings.premium },
};

// Slide da destra (per pannelli)
export const slideFromRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: durations.normal, ease: easings.premium },
};

// ============================================
// VARIANTI PER REDUCED MOTION
// Rispetta prefers-reduced-motion
// ============================================

export const reducedMotionFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: durations.fast },
};

// ============================================
// HELPER: Crea variante con reduced motion
// ============================================
export function getMotionVariant(variant, prefersReducedMotion) {
  if (prefersReducedMotion) {
    return reducedMotionFade;
  }
  return variant;
}

// ============================================
// TRANSIZIONI SPECIFICHE
// ============================================
export const defaultTransition = {
  duration: durations.normal,
  ease: easings.premium,
};

export const fastTransition = {
  duration: durations.fast,
  ease: easings.premium,
};

export const springTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};
