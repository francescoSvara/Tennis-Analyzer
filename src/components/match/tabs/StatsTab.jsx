/**
 * StatsTab - Statistiche Standard + Trading-Oriented
 * Mostra statistiche per SET (ALL, SET1, SET2, SET3, ecc.)
 *
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartBar, TennisBall, Target, Pulse, Trophy } from '@phosphor-icons/react';
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
        <div className="stat-bar__fill home" style={{ width: `${homePercent}%` }} />
        <div className="stat-bar__fill away" style={{ width: `${100 - homePercent}%` }} />
      </div>
    </div>
  );
}

/**
 * Stat Bar Fraction - Mostra X/Y (Z%) come su SofaScore
 */
function StatBarFraction({ label, homeWon, homeTotal, awayWon, awayTotal }) {
  // Calcola percentuali
  const homePct = homeTotal > 0 ? Math.round((homeWon / homeTotal) * 100) : 0;
  const awayPct = awayTotal > 0 ? Math.round((awayWon / awayTotal) * 100) : 0;

  // Per la barra, usa le percentuali
  const total = homePct + awayPct || 1;
  const homeBarPercent = (homePct / total) * 100;

  // Formatta: "X/Y (Z%)"
  const formatFraction = (won, tot, pct) => {
    if (tot === 0) return '0/0 (0%)';
    return `${won}/${tot} (${pct}%)`;
  };

  return (
    <div className="stat-bar">
      <div className="stat-bar__header">
        <span className="stat-value home">{formatFraction(homeWon, homeTotal, homePct)}</span>
        <span className="stat-label">{label}</span>
        <span className="stat-value away">{formatFraction(awayWon, awayTotal, awayPct)}</span>
      </div>
      <div className="stat-bar__track">
        <div className="stat-bar__fill home" style={{ width: `${homeBarPercent}%` }} />
        <div className="stat-bar__fill away" style={{ width: `${100 - homeBarPercent}%` }} />
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
  const games = currentStats?.games || { home: {}, away: {} };
  const players = header?.players || {};

  // Estrai valori serve
  const homeServe = typeof serve.home === 'string' ? {} : serve.home;
  const awayServe = typeof serve.away === 'string' ? {} : serve.away;
  const homeReturn = typeof returnStats.home === 'string' ? {} : returnStats.home;
  const awayReturn = typeof returnStats.away === 'string' ? {} : returnStats.away;
  const homePoints = typeof points.home === 'string' ? {} : points.home;
  const awayPoints = typeof points.away === 'string' ? {} : points.away;
  const homeGames = typeof games.home === 'string' ? {} : games.home;
  const awayGames = typeof games.away === 'string' ? {} : games.away;

  // Labels per i periodi
  const periodLabels = {
    ALL: 'Match',
    SET1: 'Set 1',
    SET2: 'Set 2',
    SET3: 'Set 3',
    SET4: 'Set 4',
    SET5: 'Set 5',
  };

  return (
    <motion.div className="stats-tab" variants={fadeUp} initial="initial" animate="animate">
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
              Servizio
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
                label="Doppi Falli"
                homeValue={homeServe.doubleFaults || 0}
                awayValue={awayServe.doubleFaults || 0}
                format="number"
              />
              <StatBarFraction
                label="Primo Servizio %"
                homeWon={homeServe.firstServeIn || 0}
                homeTotal={homeServe.firstServeTotal || 0}
                awayWon={awayServe.firstServeIn || 0}
                awayTotal={awayServe.firstServeTotal || 0}
              />
              <StatBarFraction
                label="Punti Primo Servizio"
                homeWon={homeServe.firstServePointsWon || 0}
                homeTotal={homeServe.firstServePointsIn || homeServe.firstServeIn || 0}
                awayWon={awayServe.firstServePointsWon || 0}
                awayTotal={awayServe.firstServePointsIn || awayServe.firstServeIn || 0}
              />
              <StatBarFraction
                label="Punti Secondo Servizio"
                homeWon={homeServe.secondServePointsWon || 0}
                homeTotal={homeServe.secondServeTotal || 0}
                awayWon={awayServe.secondServePointsWon || 0}
                awayTotal={awayServe.secondServeTotal || 0}
              />
              <StatBar
                label="Servizio"
                homeValue={homeServe.serviceGamesPlayed || 0}
                awayValue={awayServe.serviceGamesPlayed || 0}
                format="number"
              />
              <StatBarFraction
                label="Break Points Salvati"
                homeWon={homeServe.breakPointsSaved || 0}
                homeTotal={homeServe.breakPointsFaced || 0}
                awayWon={awayServe.breakPointsSaved || 0}
                awayTotal={awayServe.breakPointsFaced || 0}
              />
            </div>
          </MotionCard>

          {/* Return Stats */}
          <MotionCard className="stats-card">
            <h3 className="card-title">
              <Target size={18} weight="duotone" />
              Ritorno
            </h3>
            <div className="stats-list">
              <StatBarFraction
                label="Punti Primo Ritorno"
                homeWon={homeReturn.firstReturnPointsWon || 0}
                homeTotal={homeReturn.firstReturnPointsTotal || 0}
                awayWon={awayReturn.firstReturnPointsWon || 0}
                awayTotal={awayReturn.firstReturnPointsTotal || 0}
              />
              <StatBarFraction
                label="Punti Secondo Ritorno"
                homeWon={homeReturn.secondReturnPointsWon || 0}
                homeTotal={homeReturn.secondReturnPointsTotal || 0}
                awayWon={awayReturn.secondReturnPointsWon || 0}
                awayTotal={awayReturn.secondReturnPointsTotal || 0}
              />
              <StatBar
                label="Games di Ritorno"
                homeValue={homeReturn.returnGamesPlayed || 0}
                awayValue={awayReturn.returnGamesPlayed || 0}
                format="number"
              />
              <StatBarFraction
                label="Break Points Convertiti"
                homeWon={homeReturn.breakPointsWon || 0}
                homeTotal={homeReturn.breakPointsTotal || 0}
                awayWon={awayReturn.breakPointsWon || 0}
                awayTotal={awayReturn.breakPointsTotal || 0}
              />
            </div>
          </MotionCard>

          {/* Points Stats */}
          <MotionCard className="stats-card">
            <h3 className="card-title">
              <Pulse size={18} weight="duotone" />
              Punti
            </h3>
            <div className="stats-list">
              <StatBar
                label="Punti Totali Vinti"
                homeValue={homePoints.totalWon || 0}
                awayValue={awayPoints.totalWon || 0}
                format="number"
              />
              <StatBar
                label="Punti Servizio Vinti"
                homeValue={homePoints.servicePointsWon || 0}
                awayValue={awayPoints.servicePointsWon || 0}
                format="number"
              />
              <StatBar
                label="Punti Ritorno Vinti"
                homeValue={homePoints.returnPointsWon || 0}
                awayValue={awayPoints.returnPointsWon || 0}
                format="number"
              />
              <StatBar
                label="Max Punti Consecutivi"
                homeValue={homePoints.maxConsecutivePointsWon || 0}
                awayValue={awayPoints.maxConsecutivePointsWon || 0}
                format="number"
              />
            </div>
          </MotionCard>

          {/* Games Stats */}
          <MotionCard className="stats-card">
            <h3 className="card-title">
              <Trophy size={18} weight="duotone" />
              Game
            </h3>
            <div className="stats-list">
              <StatBar
                label="Games Vinti"
                homeValue={homeGames.gamesWon || 0}
                awayValue={awayGames.gamesWon || 0}
                format="number"
              />
              <StatBar
                label="Servizi Vinti"
                homeValue={homeServe.serviceGamesWon || 0}
                awayValue={awayServe.serviceGamesWon || 0}
                format="number"
              />
              <StatBar
                label="Consec. Games Won"
                homeValue={homeGames.consecutiveGamesWon || 0}
                awayValue={awayGames.consecutiveGamesWon || 0}
                format="number"
              />
              <StatBar
                label="Tiebreaks Vinti"
                homeValue={homeGames.tiebreaksWon || 0}
                awayValue={awayGames.tiebreaksWon || 0}
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
