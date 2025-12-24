/**
 * MatchHeader - Header sticky della match page
 * 
 * Mostra: Nome match, score, odds, volatilità, liquidità, alerts
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  Gear,
  Broadcast,
  ArrowClockwise,
  TennisBall,
  Lightning,
  Drop,
} from '@phosphor-icons/react';
import { durations, easings } from '../../../motion/tokens';
import './MatchHeader.css';

/**
 * Badge per indicare stato live
 */
function LiveBadge({ isLive }) {
  if (!isLive) return null;

  return (
    <motion.span
      className="live-badge"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: durations.fast }}
    >
      <Broadcast size={14} weight="fill" />
      LIVE
    </motion.span>
  );
}

/**
 * Badge per data quality
 */
function DataQualityBadge({ quality }) {
  // quality può essere un numero o un oggetto con overall
  const level = typeof quality === 'number' ? quality / 100 : (quality?.overall || 0);
  const color = level >= 0.8 ? '#10b981' : level >= 0.5 ? '#f59e0b' : '#ef4444';
  const label = level >= 0.8 ? 'HIGH' : level >= 0.5 ? 'MED' : 'LOW';

  return (
    <span className="data-quality-badge" style={{ color }}>
      Data: {label}
    </span>
  );
}

/**
 * Scoreboard compatto
 */
function CompactScoreboard({ header }) {
  const score = header?.score;
  const players = header?.players;
  
  if (!score || !score.sets || score.sets.length === 0) return null;

  const homeName = players?.home?.name || 'Player 1';
  const awayName = players?.away?.name || 'Player 2';
  const serving = score?.serving;

  // Estrai i punteggi dei set
  const homeSets = score.sets.map(s => s.home).join(' ');
  const awaySets = score.sets.map(s => s.away).join(' ');

  return (
    <div className="compact-scoreboard">
      <div className={`player-line ${serving === 'home' ? 'serving' : ''}`}>
        {serving === 'home' && <TennisBall size={12} weight="fill" className="serve-icon" />}
        <span className="player-name">{homeName}</span>
        <span className="score">{homeSets || '-'}</span>
      </div>
      <div className={`player-line ${serving === 'away' ? 'serving' : ''}`}>
        {serving === 'away' && <TennisBall size={12} weight="fill" className="serve-icon" />}
        <span className="player-name">{awayName}</span>
        <span className="score">{awaySets || '-'}</span>
      </div>
    </div>
  );
}

/**
 * Quick indicators (volatilità, liquidità)
 */
function QuickIndicators({ header }) {
  const features = header?.features || {};
  const volatility = features?.volatility || 50;
  const pressure = features?.pressure || 50;

  const getVolatilityColor = (value) => {
    if (value >= 70) return '#ef4444';
    if (value >= 40) return '#f59e0b';
    return '#10b981';
  };

  const getLabel = (value) => {
    if (value >= 70) return 'HIGH';
    if (value >= 40) return 'MED';
    return 'LOW';
  };

  return (
    <div className="quick-indicators">
      <span className="indicator" style={{ color: getVolatilityColor(volatility) }}>
        <Lightning size={16} weight="fill" />
        Vol: {getLabel(volatility)}
      </span>
      <span className="indicator" style={{ color: getVolatilityColor(pressure) }}>
        <Drop size={16} weight="fill" />
        Press: {getLabel(pressure)}
      </span>
    </div>
  );
}

/**
 * Odds quick view
 */
function OddsQuickView({ header }) {
  const odds = header?.odds || {};
  
  // Se non ci sono odds, mostra placeholder
  const homeOdds = odds?.home?.value || odds?.homeOdds;
  const awayOdds = odds?.away?.value || odds?.awayOdds;

  const getTrend = (trend) => {
    if (trend > 0) return { symbol: '↗', color: '#10b981' };
    if (trend < 0) return { symbol: '↘', color: '#ef4444' };
    return { symbol: '→', color: '#64748b' };
  };

  const homeTrend = getTrend(odds?.home?.trend || 0);
  const awayTrend = getTrend(odds?.away?.trend || 0);

  return (
    <div className="odds-quick-view">
      <span className="odds-item">
        <span className="odds-value">{homeOdds ? homeOdds.toFixed(2) : '-'}</span>
        <span className="odds-trend" style={{ color: homeTrend.color }}>{homeTrend.symbol}</span>
      </span>
      <span className="odds-separator">|</span>
      <span className="odds-item">
        <span className="odds-value">{awayOdds ? awayOdds.toFixed(2) : '-'}</span>
        <span className="odds-trend" style={{ color: awayTrend.color }}>{awayTrend.symbol}</span>
      </span>
    </div>
  );
}

/**
 * MatchHeader Component
 */
export function MatchHeader({
  header,
  isLive,
  isRefreshing,
  dataQuality,
  onBack,
  onRefresh,
}) {
  // Estrai dati dal bundle header
  const match = header?.match || {};
  const players = header?.players || {};
  const homeName = players?.home?.name || 'Player 1';
  const awayName = players?.away?.name || 'Player 2';
  const surface = match?.surface || '';
  const tournament = match?.tournament || 'Tournament';

  return (
    <header className="match-header">
      <div className="match-header__left">
        <motion.button
          className="back-button"
          onClick={onBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: durations.fast, ease: easings.premium }}
          title="Go back"
          aria-label="Go back"
        >
          <ArrowLeft size={22} weight="bold" />
        </motion.button>

        <div className="match-info">
          <div className="match-title">
            <TennisBall size={28} weight="duotone" className="sport-icon" />
            <span className="players-name">
              {homeName} vs {awayName}
            </span>
            <LiveBadge isLive={isLive} />
          </div>
          <div className="match-meta">
            <span className="tournament">{tournament}</span>
            {surface && <span className="surface">• {surface}</span>}
          </div>
        </div>
      </div>

      <div className="match-header__center">
        <CompactScoreboard header={header} />
        <OddsQuickView header={header} />
      </div>

      <div className="match-header__right">
        <QuickIndicators header={header} />
        <DataQualityBadge quality={dataQuality} />

        <div className="header-actions">
          <motion.button
            className="icon-button"
            onClick={onRefresh}
            disabled={isRefreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={{ 
              duration: isRefreshing ? 1 : durations.fast, 
              repeat: isRefreshing ? Infinity : 0,
              ease: 'linear'
            }}
            title="Refresh data"
            aria-label="Refresh data"
          >
            <ArrowClockwise size={20} weight="bold" />
          </motion.button>

          <motion.button
            className="icon-button"
            onClick={() => console.log('Notifications clicked')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: durations.fast }}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={20} weight="fill" />
            <span className="badge">1</span>
          </motion.button>

          <motion.button
            className="icon-button"
            onClick={() => console.log('Settings clicked')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: durations.fast }}
            title="Settings"
            aria-label="Settings"
          >
            <Gear size={20} weight="fill" />
          </motion.button>
        </div>
      </div>
    </header>
  );
}

export default MatchHeader;
