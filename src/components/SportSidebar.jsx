/**
 * SportSidebar.jsx - Sport selection sidebar
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TennisBall, SoccerBall, Basketball, Trophy } from '@phosphor-icons/react';
import './SportSidebar.css';

const SPORTS = [
  { id: 'tennis', icon: TennisBall, label: 'Tennis' },
  { id: 'football', icon: SoccerBall, label: 'Football' },
  { id: 'basketball', icon: Basketball, label: 'Basketball' },
  { id: 'rugby-union', icon: Trophy, label: 'Rugby' },
];

export default function SportSidebar({ selectedSport, onSelectSport }) {
  return (
    <nav className="sport-sidebar">
      {SPORTS.map((sport) => {
        const Icon = sport.icon;
        const isSelected = selectedSport === sport.id;

        return (
          <motion.button
            key={sport.id}
            className={`sport-btn ${isSelected ? 'active' : ''}`}
            onClick={() => onSelectSport(sport.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={sport.label}
          >
            <Icon size={24} weight={isSelected ? 'fill' : 'duotone'} />
          </motion.button>
        );
      })}
    </nav>
  );
}
