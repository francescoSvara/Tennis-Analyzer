/**
 * StatsTab - Statistiche Standard + Trading-Oriented
 * Mostra statistiche per SET (ALL, SET1, SET2, SET3, ecc.)
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartBar, TennisBall, Target, Pulse } from '@phosphor-icons/react';
import { MotionCard } from '../../../motion/MotionCard';
import { fadeUp, durations, easings } from '../../../motion/tokens';
import './StatsTab.css';

/**
 * Stat Bar - Barra comparativa
 */
function StatBar({ label, homeValue, awayValue, format = 'percent', homeLabel, awayLabel }) {
  const total = homeValue + awayValue || 1;
  const homePercent = (homeValue / total) * 100;
  
  const formatValue = (val) => {
    if (format === 'percent') return `${val}%`;
    if (format === 'fraction') return val;
    return val;
  };

  return (
    <div className="stat-bar">
      <div className="stat-bar__header">
        <span className="stat-value home">{formatValue(homeValue)}</span>
        <span className="stat-label">{label}</span>
        <span className="stat-value away">{formatValue(awayValue)}</span>
      </div>
      <div className="stat-bar__track">
        <div 
          className="stat-bar__fill home" 
          style={{ width: `${homePercent}%` }}
        />
        <div 
          className="stat-bar__fill away" 
          style={{ width: `${100 - homePercent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Trading Stat - Indicatore trading-oriented
 */
function TradingStat({ label, value, status, subtext }) {
  const statusColors = {
    high: '#ef4444',
    med: '#f59e0b',
    low: '#10b981',
    neutral: '#64748b',
  };

  return (
    <div className="trading-stat">
      <span className="trading-stat__label">{label}</span>
      <span 
        className="trading-stat__value"
        style={{ color: statusColors[status] || statusColors.neutral }}
      >
        {value}
      </span>
      {subtext && <span className="trading-stat__subtext">{subtext}</span>}
    </div>
  );
}

/**
 * StatsTab Component
 */
export function StatsTab({ data, header }) {
  // Periodi disponibili (ALL, SET1, SET2, ecc.)
  const periods = data?.periods || ['ALL'];
  const [activePeriod, setActivePeriod] = useState('ALL');
  
  // Leggi stats dal periodo attivo
  const currentStats = data?.byPeriod?.[activePeriod] || data || {};
  const serve = currentStats?.serve || { home: {}, away: {} };
  const returnStats = currentStats?.return || { home: {}, away: {} };
  const points = currentStats?.points || { home: {}, away: {} };
  const players = header?.players || {};

  // Estrai valori serve
  const homeServe = typeof serve.home === 'string' ? {} : serve.home;
  const awayServe = typeof serve.away === 'string' ? {} : serve.away;
  const homeReturn = typeof returnStats.home === 'string' ? {} : returnStats.home;
  const awayReturn = typeof returnStats.away === 'string' ? {} : returnStats.away;
  const homePoints = typeof points.home === 'string' ? {} : points.home;
  const awayPoints = typeof points.away === 'string' ? {} : points.away;
  
  // Labels per i periodi
  const periodLabels = {
    'ALL': 'Match',
    'SET1': 'Set 1',
    'SET2': 'Set 2',
    'SET3': 'Set 3',
    'SET4': 'Set 4',
    'SET5': 'Set 5'
  };

  return (
    <motion.div
      className="stats-tab"
      variants={fadeUp}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="stats-tab__header">
        <h2 className="tab-title">
          <ChartBar size={24} weight="duotone" />
          Statistics
        </h2>
      </div>
      
      {/* Period Selector Tabs */}
      {periods.length > 1 && (
        <div className="stats-period-tabs">
          {periods.map((period) => (
            <button
              key={period}
              className={`period-tab ${activePeriod === period ? 'active' : ''}`}
              onClick={() => setActivePeriod(period)}
            >
              {periodLabels[period] || period}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div 
          key={activePeriod}
          className="stats-grid"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: durations.fast, ease: easings.premium }}
        >
          {/* Serve Stats */}
          <MotionCard className="stats-card">
            <h3 className="card-title">
              <TennisBall size={18} weight="duotone" />
              Serve Statistics
            </h3>
            <div className="stats-players">
              <span className="player-name">{players.home?.name || 'Player 1'}</span>
              <span className="player-name">{players.away?.name || 'Player 2'}</span>
            </div>
            <div className="stats-list">
              <StatBar 
                label="Aces" 
                homeValue={homeServe.aces || 0} 
                awayValue={awayServe.aces || 0} 
                format="number" 
              />
              <StatBar 
                label="Double Faults" 
                homeValue={homeServe.doubleFaults || 0} 
                awayValue={awayServe.doubleFaults || 0} 
                format="number" 
              />
              <StatBar 
                label="1st Serve %" 
                homeValue={homeServe.firstServePct || 0} 
                awayValue={awayServe.firstServePct || 0} 
              />
              <StatBar 
                label="1st Serve Won %" 
                homeValue={homeServe.firstServeWonPct || 0} 
                awayValue={awayServe.firstServeWonPct || 0} 
              />
              <StatBar 
                label="2nd Serve Won %" 
                homeValue={homeServe.secondServeWonPct || 0} 
                awayValue={awayServe.secondServeWonPct || 0} 
              />
            </div>
          </MotionCard>

          {/* Return Stats */}
          <MotionCard className="stats-card">
            <h3 className="card-title">
              <Target size={18} weight="duotone" />
              Return Statistics
            </h3>
            <div className="stats-list">
              <StatBar 
                label="Return Points Won %" 
                homeValue={homeReturn.returnPointsWonPct || 0} 
                awayValue={awayReturn.returnPointsWonPct || 0} 
              />
              <StatBar 
                label="Break Points Won" 
                homeValue={homeReturn.breakPointsWon || 0} 
                awayValue={awayReturn.breakPointsWon || 0} 
                format="number"
              />
              <StatBar 
                label="Break Points Total" 
                homeValue={homeReturn.breakPointsTotal || 0} 
                awayValue={awayReturn.breakPointsTotal || 0} 
                format="number"
              />
            </div>
          </MotionCard>

          {/* Points Stats */}
          <MotionCard className="stats-card">
            <h3 className="card-title">
              <Pulse size={18} weight="duotone" />
              Points Statistics
            </h3>
            <div className="stats-list">
              <StatBar 
                label="Total Points Won" 
                homeValue={homePoints.totalWon || 0} 
                awayValue={awayPoints.totalWon || 0} 
                format="number"
              />
              <StatBar 
                label="Winners" 
                homeValue={homePoints.winners || 0} 
                awayValue={awayPoints.winners || 0} 
                format="number"
              />
              <StatBar 
                label="Unforced Errors" 
                homeValue={homePoints.unforcedErrors || 0} 
                awayValue={awayPoints.unforcedErrors || 0} 
                format="number"
              />
            </div>
          </MotionCard>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export default StatsTab;
