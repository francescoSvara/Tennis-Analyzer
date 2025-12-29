/**
 * MotionButton - Button con micro-interazioni
 *
 * Ref: docs/specs/SPEC_FRONTEND_MOTION_UI.md
 * Ref: src/motion/tokens.js
 */

import { motion } from 'framer-motion';
import { durations, easings } from './tokens';

/**
 * Button animato con tap/hover feedback
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenuto del button
 * @param {string} [props.className] - Classi CSS aggiuntive
 * @param {Function} [props.onClick] - Handler click
 * @param {boolean} [props.disabled] - Disabilita il button
 * @param {'primary'|'secondary'|'ghost'} [props.variant] - Variante visiva
 * @param {'sm'|'md'|'lg'} [props.size] - Dimensione
 * @param {Object} [props.style] - Stili inline
 */
export function MotionButton({
  children,
  className = '',
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  style = {},
  ...props
}) {
  const buttonVariants = {
    initial: {
      scale: 1,
    },
    hover: {
      scale: 1.02,
      transition: {
        duration: durations.fast,
        ease: easings.premium,
      },
    },
    tap: {
      scale: 0.97,
      transition: {
        duration: durations.fast / 2,
      },
    },
  };

  const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: '13px' },
    md: { padding: '10px 18px', fontSize: '14px' },
    lg: { padding: '14px 24px', fontSize: '16px' },
  };

  const variantStyles = {
    primary: {
      background: 'var(--color-primary, #3b82f6)',
      color: 'white',
      border: 'none',
    },
    secondary: {
      background: 'var(--bg-secondary, #1e293b)',
      color: 'var(--text-primary, #f1f5f9)',
      border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
    },
    ghost: {
      background: 'rgba(255, 255, 255, 0.05)',
      color: 'var(--text-primary, #f1f5f9)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    },
  };

  return (
    <motion.button
      className={`motion-button motion-button--${variant} motion-button--${size} ${className}`}
      variants={buttonVariants}
      initial="initial"
      whileHover={disabled ? undefined : 'hover'}
      whileTap={disabled ? undefined : 'tap'}
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: 'var(--radius-sm, 6px)',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: `opacity ${durations.fast}s`,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export default MotionButton;
