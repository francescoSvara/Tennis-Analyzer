/**
 * MotionButton - Wrapper per bottoni con micro-interazioni
 * Effetti: hover scale, tap feedback
 */
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { durations, easings } from '../../motion/tokens';

const MotionButton = React.forwardRef(({
  children,
  className = '',
  onClick,
  disabled = false,
  type = 'button',
  variant = 'default', // 'default' | 'primary' | 'ghost' | 'icon'
  ...props
}, ref) => {
  const prefersReducedMotion = useReducedMotion();
  
  // Configurazione hover/tap in base al variant
  const getHoverConfig = () => {
    if (disabled || prefersReducedMotion) return {};
    
    switch (variant) {
      case 'primary':
        return {
          whileHover: { 
            scale: 1.02, 
            y: -1,
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
          },
          whileTap: { scale: 0.98 },
        };
      case 'icon':
        return {
          whileHover: { scale: 1.1, rotate: 5 },
          whileTap: { scale: 0.95 },
        };
      case 'ghost':
        return {
          whileHover: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          whileTap: { scale: 0.98 },
        };
      default:
        return {
          whileHover: { scale: 1.02 },
          whileTap: { scale: 0.98 },
        };
    }
  };
  
  return (
    <motion.button
      ref={ref}
      type={type}
      className={`motion-button motion-button--${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      transition={{
        duration: durations.fast,
        ease: easings.premium,
      }}
      {...getHoverConfig()}
      {...props}
    >
      {children}
    </motion.button>
  );
});

MotionButton.displayName = 'MotionButton';

export default MotionButton;
