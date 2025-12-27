/**
 * OddsTab - Tab Mercato + Esecuzione
 * 
 * Contiene:
 * - Market selector (Match Odds, Set Winner, Next Game)
 * - Odds con trend
 * - Quick Tickets (BACK/LAY)
 * - Strategy context
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChartLineUp,
  ArrowUp,
  ArrowDown,
  TrendUp,
  TrendDown,
  CurrencyDollar,
  Target,
} from '@phosphor-icons/react';
import { MotionCard } from '../../../motion/MotionCard';
import { MotionButton } from '../../../motion/MotionButton';
import { durations, easings, fadeUp, staggerContainer, staggerItem } from '../../../motion/tokens';
import './OddsTab.css';

// Mercati disponibili
const MARKETS = [
  { id: 'match', label: 'Match Odds' },
  { id: 'set', label: 'Set Winner' },
  { id: 'game', label: 'Next Game' },
];

// Stake presets
const STAKE_PRESETS = [5, 10, 25, 50];

/**
 * Market Selector
 */
function MarketSelector({ active, onChange }) {
  return (
    <div className="market-selector">
      {MARKETS.map((market) => (
        <button
          key={market.id}
          className={`market-btn ${active === market.id ? 'active' : ''}`}
          onClick={() => onChange(market.id)}
        >
          {market.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Odds Display con trend - legge da bundle
 */
function OddsDisplay({ odds, header }) {
  const players = header?.players || {};
  const matchWinner = odds?.matchWinner || {};
  
  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendUp size={16} weight="bold" className="trend-up" />;
    if (trend < 0) return <TrendDown size={16} weight="bold" className="trend-down" />;
    return null;
  };

  const getImpliedProb = (value) => {
    if (!value) return null;
    return ((1 / value) * 100).toFixed(1);
  };

  return (
    <div className="odds-display">
      <div className="odds-player">
        <div className="player-header">
          <span className="player-name">{players.home?.name || 'Player 1'}</span>
          {getTrendIcon(matchWinner.home?.trend)}
        </div>
        <div className="odds-value-big">{matchWinner.home?.value?.toFixed(2) || '-'}</div>
        <div className="implied-prob">
          Implied: {getImpliedProb(matchWinner.home?.value) || '-'}%
        </div>
      </div>

      <div className="odds-vs">VS</div>

      <div className="odds-player">
        <div className="player-header">
          <span className="player-name">{players.away?.name || 'Player 2'}</span>
          {getTrendIcon(matchWinner.away?.trend)}
        </div>
        <div className="odds-value-big">{matchWinner.away?.value?.toFixed(2) || '-'}</div>
        <div className="implied-prob">
          Implied: {getImpliedProb(matchWinner.away?.value) || '-'}%
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Tickets - Pulsanti BACK/LAY
 */
function QuickTickets({ odds, header, stake, onBack, onLay }) {
  const players = header?.players || {};
  const matchWinner = odds?.matchWinner || {};
  
  return (
    <div className="quick-tickets">
      <h4 className="section-title">
        <CurrencyDollar size={16} weight="duotone" />
        Quick Tickets
      </h4>

      <div className="tickets-grid">
        {/* Home Player */}
        <div className="ticket-row">
          <span className="ticket-player">{players.home?.name || 'Player 1'}</span>
          <button
            className="ticket-btn back"
            onClick={() => onBack && onBack('home', matchWinner.home?.value)}
          >
            BACK @ {matchWinner.home?.value?.toFixed(2) || '-'}
          </button>
          <button
            className="ticket-btn lay"
            onClick={() => onLay && onLay('home', matchWinner.home?.value)}
          >
            LAY @ {matchWinner.home?.value ? (matchWinner.home.value + 0.02).toFixed(2) : '-'}
          </button>
        </div>

        {/* Away Player */}
        <div className="ticket-row">
          <span className="ticket-player">{players.away?.name || 'Player 2'}</span>
          <button
            className="ticket-btn back"
            onClick={() => onBack && onBack('away', matchWinner.away?.value)}
          >
            BACK @ {matchWinner.away?.value?.toFixed(2) || '-'}
          </button>
          <button
            className="ticket-btn lay"
            onClick={() => onLay && onLay('away', matchWinner.away?.value)}
          >
            LAY @ {matchWinner.away?.value ? (matchWinner.away.value + 0.02).toFixed(2) : '-'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Stake Selector
 */
function StakeSelector({ stake, onChange }) {
  const [customStake, setCustomStake] = useState('');

  return (
    <div className="stake-selector">
      <span className="stake-label">Stake Presets:</span>
      <div className="stake-buttons">
        {STAKE_PRESETS.map((preset) => (
          <button
            key={preset}
            className={`stake-btn ${stake === preset ? 'active' : ''}`}
            onClick={() => onChange(preset)}
          >
            €{preset}
          </button>
        ))}
      </div>
      <div className="stake-custom">
        <span>Custom:</span>
        <input
          type="number"
          value={customStake}
          onChange={(e) => {
            setCustomStake(e.target.value);
            if (e.target.value) onChange(Number(e.target.value));
          }}
          placeholder="€"
          min="1"
        />
      </div>
      <div className="liability-cap">
        <span>Liability cap:</span>
        <input type="number" defaultValue={30} placeholder="€" min="1" />
      </div>
    </div>
  );
}

/**
 * Strategy Context - Overlay con strategia suggerita
 */
function StrategyContext({ strategies }) {
  // Leggi signals dal bundle strategies
  const signals = strategies?.signals || [];
  const readyStrategy = signals.find(s => s.status === 'READY');

  if (!readyStrategy) {
    return (
      <div className="strategy-context empty">
        <div className="context-badge inactive">
          <Target size={14} weight="bold" />
          Nessuna strategia READY
        </div>
        <div className="context-details">
          <span className="strategy-name">In attesa di condizioni favorevoli...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="strategy-context">
      <div className="context-badge">
        <Target size={14} weight="bold" />
        <span className="status-dot ready"></span>
        Strategy READY
      </div>
      <div className="context-details">
        <span className="strategy-name">{readyStrategy.name}</span>
        <span className="strategy-action">
          {readyStrategy.action} {readyStrategy.target} - Confidence: {readyStrategy.confidence}%
        </span>
      </div>
    </div>
  );
}

/**
 * OddsTab Component
 */
export function OddsTab({ data, header, strategies }) {
  const [activeMarket, setActiveMarket] = useState('match');
  const [stake, setStake] = useState(10);

  // data = tabs.odds = { matchWinner, history, spreads, totals }
  // matchWinner può essere { home: { value, trend }, away: { value, trend } } o direttamente valore
  const rawMatchWinner = data?.matchWinner;
  
  // Normalizza struttura odds per compatibilità
  const odds = {
    matchWinner: {
      home: typeof rawMatchWinner?.home === 'object' ? rawMatchWinner.home : { value: rawMatchWinner?.home || null, trend: 0 },
      away: typeof rawMatchWinner?.away === 'object' ? rawMatchWinner.away : { value: rawMatchWinner?.away || null, trend: 0 }
    }
  };

  const handleBack = (player, oddValue) => {
    // TODO: Implementare logica
  };

  const handleLay = (player, oddValue) => {
    // TODO: Implementare logica
  };

  return (
    <motion.div
      className="odds-tab"
      variants={fadeUp}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="odds-tab__header">
        <h2 className="tab-title">
          <ChartLineUp size={24} weight="duotone" />
          Odds
        </h2>
        <MarketSelector active={activeMarket} onChange={setActiveMarket} />
      </div>

      {/* Main Content */}
      <div className="odds-tab__content">
        {/* Odds Display */}
        <MotionCard className="odds-main-card">
          <OddsDisplay odds={odds} header={header} />
        </MotionCard>

        {/* Stake Selector */}
        <MotionCard className="stake-card">
          <StakeSelector stake={stake} onChange={setStake} />
        </MotionCard>

        {/* Quick Tickets + Strategy Context */}
        <div className="odds-actions">
          <MotionCard className="tickets-card">
            <QuickTickets
              odds={odds}
              header={header}
              stake={stake}
              onBack={handleBack}
              onLay={handleLay}
            />
          </MotionCard>

          <MotionCard className="context-card">
            <StrategyContext strategies={strategies} />
          </MotionCard>
        </div>
      </div>
    </motion.div>
  );
}

export default OddsTab;
