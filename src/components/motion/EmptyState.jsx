/**
 * EmptyState - Componente per stati vuoti
 * Design minimale con animazione sottile
 */
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  MagnifyingGlass, 
  Database, 
  CloudSlash, 
  TennisBall,
  WarningCircle
} from '@phosphor-icons/react';
import { durations, easings } from '../../motion/tokens';
import '../../styles/emptystate.css';

// Icone per diversi tipi di empty state
const EMPTY_ICONS = {
  search: MagnifyingGlass,
  noData: Database,
  error: CloudSlash,
  noMatches: TennisBall,
  warning: WarningCircle,
};

const EmptyState = ({
  type = 'noData', // 'search' | 'noData' | 'error' | 'noMatches' | 'warning'
  title = 'Nessun dato',
  description = '',
  action = null, // { label: string, onClick: () => void }
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const IconComponent = EMPTY_ICONS[type] || Database;

  return (
    <motion.div 
      className={`empty-state ${className}`}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: durations.slow,
        ease: easings.premium,
      }}
    >
      <motion.div 
        className="empty-state-icon-wrapper"
        initial={prefersReducedMotion ? {} : { scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{
          duration: durations.slow,
          ease: easings.softBounce,
          delay: 0.1,
        }}
      >
        <IconComponent 
          size={48} 
          weight="duotone" 
          className="empty-state-icon"
        />
      </motion.div>
      
      <h3 className="empty-state-title">{title}</h3>
      
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      
      {action && (
        <motion.button
          className="empty-state-action"
          onClick={action.onClick}
          whileHover={!prefersReducedMotion ? { scale: 1.03, y: -1 } : {}}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: durations.fast, ease: easings.premium }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
};

export default EmptyState;
