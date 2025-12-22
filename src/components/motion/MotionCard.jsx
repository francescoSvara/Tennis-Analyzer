/**
 * MotionCard - Wrapper per card con animazioni premium
 * Effetti: hover lift, shadow soft, animazione mount
 */
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { fadeUp, cardHover, durations, easings, reducedMotionFade } from '../../motion/tokens';

const MotionCard = React.forwardRef(({
  children,
  className = '',
  onClick,
  disableHover = false,
  as = 'div',
  initial,
  animate,
  exit,
  transition,
  layout = false,
  layoutId,
  ...props
}, ref) => {
  const prefersReducedMotion = useReducedMotion();
  
  // Usa variante ridotta se necessario
  const motionVariant = prefersReducedMotion ? reducedMotionFade : fadeUp;
  
  // Configurazione hover
  const hoverConfig = !disableHover && !prefersReducedMotion ? {
    whileHover: { 
      y: -3, 
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
    },
    whileTap: onClick ? { scale: 0.99 } : undefined,
  } : {};
  
  const Component = motion[as] || motion.div;
  
  return (
    <Component
      ref={ref}
      className={`motion-card ${className}`}
      onClick={onClick}
      initial={initial ?? motionVariant.initial}
      animate={animate ?? motionVariant.animate}
      exit={exit ?? motionVariant.exit}
      transition={transition ?? {
        duration: durations.normal,
        ease: easings.premium,
      }}
      layout={layout}
      layoutId={layoutId}
      {...hoverConfig}
      {...props}
    >
      {children}
    </Component>
  );
});

MotionCard.displayName = 'MotionCard';

export default MotionCard;
