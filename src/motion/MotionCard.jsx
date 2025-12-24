/**
 * MotionCard - Wrapper card con animazioni hover
 * 
 * Ref: docs/specs/SPEC_FRONTEND_MOTION_UI.md
 * Ref: src/motion/tokens.js
 */

import { motion } from 'framer-motion';
import { cardHover, durations, easings } from './tokens';

/**
 * Card animata con hover lift effect
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenuto della card
 * @param {string} [props.className] - Classi CSS aggiuntive
 * @param {Function} [props.onClick] - Handler click
 * @param {boolean} [props.disabled] - Disabilita animazioni
 * @param {Object} [props.style] - Stili inline
 */
export function MotionCard({ 
  children, 
  className = '', 
  onClick,
  disabled = false,
  style = {},
  ...props 
}) {
  const hoverVariants = {
    initial: { 
      y: 0, 
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)' 
    },
    hover: { 
      y: -2, 
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      transition: {
        duration: durations.fast,
        ease: easings.premium,
      }
    },
    tap: { 
      y: -1,
      scale: 0.99,
      transition: {
        duration: durations.fast / 2,
      }
    }
  };

  return (
    <motion.div
      className={`motion-card ${className}`}
      variants={hoverVariants}
      initial="initial"
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : "tap"}
      onClick={onClick}
      style={{
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default MotionCard;
