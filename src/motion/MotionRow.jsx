/**
 * MotionRow - Row tabella/lista con fade slide animation
 * 
 * Ref: docs/filosofie/FILOSOFIA_FRONTEND.md
 * Ref: src/motion/tokens.js
 */

import { motion } from 'framer-motion';
import { durations, easings, staggerItem } from './tokens';

/**
 * Row animata per tabelle e liste
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenuto della row
 * @param {string} [props.className] - Classi CSS aggiuntive
 * @param {Function} [props.onClick] - Handler click
 * @param {boolean} [props.isHighlighted] - Evidenzia la row
 * @param {'default'|'success'|'warning'|'error'} [props.status] - Stato visivo
 */
export function MotionRow({ 
  children, 
  className = '', 
  onClick,
  isHighlighted = false,
  status = 'default',
  ...props 
}) {
  const statusColors = {
    default: 'transparent',
    success: 'rgba(16, 185, 129, 0.08)',
    warning: 'rgba(245, 158, 11, 0.08)',
    error: 'rgba(239, 68, 68, 0.08)',
  };

  const statusBorders = {
    default: 'transparent',
    success: 'rgba(16, 185, 129, 0.3)',
    warning: 'rgba(245, 158, 11, 0.3)',
    error: 'rgba(239, 68, 68, 0.3)',
  };

  return (
    <motion.div
      className={`motion-row ${isHighlighted ? 'motion-row--highlighted' : ''} ${className}`}
      variants={staggerItem}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={{
        backgroundColor: 'var(--bg-hover, rgba(0,0,0,0.02))',
        transition: { duration: durations.fast },
      }}
      onClick={onClick}
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: statusColors[status],
        borderLeft: `3px solid ${statusBorders[status]}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Container per liste con stagger animation
 */
export function MotionRowList({ children, className = '', ...props }) {
  return (
    <motion.div
      className={`motion-row-list ${className}`}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: 0.04,
            delayChildren: 0.02,
          },
        },
        exit: {
          transition: {
            staggerChildren: 0.02,
            staggerDirection: -1,
          },
        },
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default MotionRow;
