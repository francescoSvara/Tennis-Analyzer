/**
 * MotionTab - Tab con underline animata
 *
 * Ref: docs/filosofie/FILOSOFIA_FRONTEND.md
 * Ref: src/motion/tokens.js
 */

import { motion } from 'framer-motion';
import { durations, easings } from './tokens';

/**
 * Tab animato con underline indicator
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenuto del tab
 * @param {boolean} props.isActive - Se il tab è selezionato
 * @param {Function} props.onClick - Handler click
 * @param {string} [props.className] - Classi CSS aggiuntive
 * @param {boolean} [props.disabled] - Disabilita il tab
 */
export function MotionTab({
  children,
  isActive = false,
  onClick,
  className = '',
  disabled = false,
  ...props
}) {
  const tabVariants = {
    initial: {
      opacity: 0.7,
    },
    active: {
      opacity: 1,
      transition: {
        duration: durations.fast,
        ease: easings.premium,
      },
    },
    hover: {
      opacity: 0.9,
      transition: {
        duration: durations.fast,
        ease: easings.premium,
      },
    },
  };

  return (
    <motion.button
      className={`motion-tab ${isActive ? 'motion-tab--active' : ''} ${className}`}
      variants={tabVariants}
      initial="initial"
      animate={isActive ? 'active' : 'initial'}
      whileHover={disabled || isActive ? undefined : 'hover'}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        position: 'relative',
        padding: '12px 16px',
        background: 'transparent',
        border: 'none',
        color: isActive ? 'var(--color-primary, #3b82f6)' : 'var(--text-secondary, #64748b)',
        fontWeight: isActive ? 600 : 500,
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'color 0.2s ease',
      }}
      {...props}
    >
      {children}

      {/* Underline animata */}
      {isActive && (
        <motion.div
          layoutId="tab-underline"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'var(--color-primary, #3b82f6)',
            borderRadius: '1px 1px 0 0',
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{
            duration: durations.normal,
            ease: easings.premium,
          }}
        />
      )}
    </motion.button>
  );
}

/**
 * Container per tabs con layout animation
 */
export function MotionTabList({ children, className = '', ...props }) {
  return (
    <motion.div
      className={`motion-tab-list ${className}`}
      style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border-color, #e2e8f0)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default MotionTab;
