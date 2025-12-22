import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  TennisBall, 
  SoccerBall, 
  Basketball, 
  Trophy,
  Clock
} from '@phosphor-icons/react';
import { durations, easings, fadeUp } from '../motion/tokens';

// Mappa icone Phosphor per ogni sport
const SPORT_ICONS = {
  tennis: TennisBall,
  football: SoccerBall,
  basketball: Basketball,
  'rugby-union': Trophy, // Placeholder, Phosphor non ha rugby
};

const SPORTS = [
  { id: 'tennis', name: 'Tennis', enabled: true },
  { id: 'football', name: 'Calcio', enabled: false },
  { id: 'basketball', name: 'Basket', enabled: false },
  { id: 'rugby-union', name: 'Rugby Union', enabled: false },
];

function SportSidebar({ selectedSport, onSelectSport }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <aside className="sport-sidebar">
      <div className="sport-sidebar-header">
        <Trophy size={18} weight="duotone" className="sport-sidebar-icon" />
        <span className="sport-sidebar-title">Sport</span>
      </div>
      <nav className="sport-list">
        {SPORTS.map((sport, index) => {
          const IconComponent = SPORT_ICONS[sport.id] || Trophy;
          const isActive = selectedSport === sport.id;
          
          return (
            <motion.button
              key={sport.id}
              className={`sport-item ${isActive ? 'active' : ''} ${!sport.enabled ? 'disabled' : ''}`}
              onClick={() => sport.enabled && onSelectSport(sport.id)}
              disabled={!sport.enabled}
              title={!sport.enabled ? 'Coming soon' : sport.name}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: durations.normal,
                ease: easings.premium,
                delay: index * 0.05,
              }}
              whileHover={!sport.enabled || prefersReducedMotion ? {} : { 
                x: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }}
              whileTap={!sport.enabled ? {} : { scale: 0.98 }}
            >
              {/* Indicator animato per item attivo */}
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    className="sport-active-indicator"
                    layoutId="sportIndicator"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 3 }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: durations.fast, ease: easings.premium }}
                  />
                )}
              </AnimatePresence>
              
              <IconComponent 
                size={20} 
                weight={isActive ? 'fill' : 'duotone'} 
                className="sport-icon"
              />
              <span className="sport-name">{sport.name}</span>
              {!sport.enabled && (
                <span className="sport-badge">
                  <Clock size={12} weight="bold" style={{ marginRight: 4 }} />
                  Soon
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>
    </aside>
  );
}

export default SportSidebar;
