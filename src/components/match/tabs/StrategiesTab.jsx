/**
 * StrategiesTab - Hub Trading per strategie live
 * 
 * Contiene:
 * - Filtri (Tutte, READY, WATCH, Preferite)
 * - Card strategie (Lay Winner, Banca Servizio, Super Break)
 * - Strategy Event Log
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Trophy,
  TennisBall,
  Lightning,
  Timer,
  ArrowRight,
  CheckCircle,
  XCircle,
  Fire,
  Play,
  Stop,
  Funnel,
  Star,
  Clock,
} from '@phosphor-icons/react';
import { MotionCard } from '../../../motion/MotionCard';
import { MotionButton } from '../../../motion/MotionButton';
import { MotionRow, MotionRowList } from '../../../motion/MotionRow';
import { durations, easings, staggerContainer, staggerItem, fadeUp } from '../../../motion/tokens';
import './StrategiesTab.css';

// ============================================
// HELPERS
// ============================================

/**
 * Format strategy ID to display name
 */
function formatStrategyName(id) {
  const names = {
    'lay-the-winner': 'LAY THE WINNER',
    'banca-servizio': 'BANCA SERVIZIO',
    'super-break': 'SUPER BREAK',
    'tiebreak-specialist': 'TIEBREAK SPECIALIST',
    'momentum-swing': 'MOMENTUM SWING',
  };
  return names[id] || id.replace(/-/g, ' ').toUpperCase();
}

/**
 * Format condition key to readable text
 */
function formatConditionText(key) {
  const texts = {
    set1Winner: 'Winner 1° set determinato',
    favoriteLeading: 'Favorito in vantaggio',
    lowOdds: 'Quote favorito < 1.60',
    momentumShift: 'Momentum in cambiamento',
    highVolatility: 'Alta volatilità',
    unfavorableScore: 'Punteggio sfavorevole al server',
    highPressure: 'Pressione alta',
    highBreakProb: 'Alta prob. di break',
    weakSecondServe: 'Secondo servizio debole',
    strongDominance: 'Dominanza > 60%',
    dominantReceiving: 'Dominante in risposta',
    favorableMomentum: 'Momentum favorevole',
    volatileMatch: 'Match volatile',
    nearTiebreak: 'Vicino al tiebreak',
    serveImbalance: 'Squilibrio servizio',
    bigSwing: 'Grande swing momentum',
    multipleBreaks: 'Break multipli recenti',
  };
  return texts[key] || key.replace(/([A-Z])/g, ' $1').trim();
}

// Configurazione stati - senza emoji, usa CSS
const STATUS_CONFIG = {
  READY: {
    label: 'READY',
    subtext: 'Condizioni perfette → entra',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.4)',
  },
  WATCH: {
    label: 'WATCH',
    subtext: 'Quasi pronta → osserva',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.4)',
  },
  OFF: {
    label: 'OFF',
    subtext: 'Non valida → ignora',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.15)',
    border: 'rgba(100, 116, 139, 0.4)',
  },
};

// Filtri disponibili - senza emoji
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'READY', label: 'Ready', status: 'ready' },
  { id: 'WATCH', label: 'Watch', status: 'watch' },
  { id: 'favorites', label: 'Favorites', icon: 'star' },
];

/**
 * Condition Item - Singola condizione
 */
function ConditionItem({ condition, met }) {
  return (
    <div className={`condition-item ${met ? 'met' : 'not-met'}`}>
      {met ? (
        <CheckCircle size={14} weight="fill" className="condition-icon success" />
      ) : (
        <XCircle size={14} weight="fill" className="condition-icon error" />
      )}
      <span className="condition-text">{condition}</span>
    </div>
  );
}

/**
 * Strategy Card - Card generica per strategia
 */
function StrategyCard({ strategy, onExecute }) {
  const status = strategy.status || 'OFF';
  const config = STATUS_CONFIG[status];
  const isReady = status === 'READY';

  return (
    <motion.div
      className="strategy-card"
      variants={staggerItem}
      style={{
        borderColor: config.border,
        background: config.bg,
      }}
    >
      {/* Header */}
      <div className="strategy-card__header">
        <div className="strategy-info">
          <span className="status-badge" style={{ background: config.color }}>
            <span className={`status-dot ${status.toLowerCase()}`}></span>
            {config.label}
          </span>
          <h3 className="strategy-name">{strategy.name}</h3>
        </div>
        <div className="strategy-meta">
          <span className="confidence">
            Confidence: {strategy.confidence ? (strategy.confidence * 100).toFixed(0) + '%' : '-'}
          </span>
          <span className="risk">
            Risk: {strategy.risk?.level || 'MED'}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="strategy-card__body">
        <div className="strategy-details">
          <div className="detail-row">
            <span className="detail-label">Target:</span>
            <span className="detail-value">{strategy.target || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Score:</span>
            <span className="detail-value">{strategy.score || '-'}</span>
          </div>
          {strategy.waitingFor && (
            <div className="detail-row">
              <span className="detail-label">Waiting for:</span>
              <span className="detail-value waiting">{strategy.waitingFor}</span>
            </div>
          )}
        </div>

        {/* Conditions */}
        {strategy.conditions && strategy.conditions.length > 0 && (
          <div className="strategy-conditions">
            <span className="conditions-label">Conditions:</span>
            <div className="conditions-list">
              {strategy.conditions.map((cond, idx) => (
                <ConditionItem
                  key={idx}
                  condition={cond.text}
                  met={cond.met}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action */}
      {isReady && (
        <div className="strategy-card__action">
          <MotionButton
            variant="primary"
            onClick={() => onExecute && onExecute(strategy)}
            className="execute-button"
          >
            <Target size={16} weight="bold" />
            {strategy.action || 'EXECUTE'} {strategy.target}
            <ArrowRight size={14} weight="bold" />
          </MotionButton>
          <div className="stake-info">
            <span>Stake: €{strategy.risk?.stakeSuggested || 10}</span>
            <span>Liability cap: €{strategy.risk?.liabilityCap || 30}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="strategy-card__footer">
        <span className="exit-rule">
          <Timer size={14} weight="duotone" />
          Exit: {strategy.exitRule || '-'}
        </span>
        {strategy.why && (
          <p className="strategy-why">
            "{strategy.why}"
          </p>
        )}
      </div>
    </motion.div>
  );
}


/**
 * StrategiesTab Component
 */
export function StrategiesTab({ data, header }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [favorites, setFavorites] = useState(new Set());

  // Transform bundle data into display format
  const strategies = useMemo(() => {
    // Use real data from bundle if available
    const signals = data?.signals || [];
    
    if (signals.length > 0) {
      return signals.map(signal => ({
        id: signal.id,
        name: signal.name || formatStrategyName(signal.id),
        status: signal.status || 'OFF',
        target: signal.target === 'home' ? header?.players?.home?.name : 
                signal.target === 'away' ? header?.players?.away?.name : 
                signal.target || '-',
        score: header?.score?.game || '-',
        confidence: signal.confidence || 0,
        risk: {
          level: signal.confidence > 0.7 ? 'MED' : signal.confidence > 0.5 ? 'LOW' : 'HIGH',
          stakeSuggested: 10,
          liabilityCap: 30
        },
        action: signal.action || null,
        exitRule: signal.exitRule || '-',
        waitingFor: signal.status === 'WATCH' ? signal.reasons?.[0] : null,
        conditions: Object.entries(signal.conditions || {}).map(([key, met]) => ({
          text: formatConditionText(key),
          met: !!met
        })),
        why: signal.reasons?.length > 0 ? signal.reasons.join('. ') : null,
      }));
    }
    
    // Fallback mock data for demo
    return [
      {
        id: 'lay-winner',
        name: 'LAY THE WINNER',
        status: 'WATCH',
        target: header?.players?.away?.name || 'Player 2',
        score: header?.score?.game || '1-0',
        confidence: 0.61,
        risk: { level: 'HIGH', stakeSuggested: 10, liabilityCap: 30 },
        action: 'LAY',
        exitRule: 'Al BP / al break del favorito / fine game',
        waitingFor: 'Break point nel 2° set',
        conditions: [
          { text: 'Favorito sotto di un set', met: true },
          { text: 'Quote non ancora corrette', met: true },
          { text: 'Storico rimonte: ALTO', met: false },
        ],
        why: 'Mercato sottostima il recupero del favorito',
      },
      {
        id: 'banca-servizio',
        name: 'BANCA SERVIZIO',
        status: 'READY',
        target: header?.players?.away?.name || 'Player 2',
        score: '0-40',
        confidence: 0.78,
        risk: { level: 'MED', stakeSuggested: 10, liabilityCap: 30 },
        action: 'LAY',
        exitRule: 'Break point convertito OR hold (fine game)',
        conditions: [
          { text: 'holdDifficulty HIGH', met: true },
          { text: 'score in {0-30, 0-40, 15-40}', met: true },
        ],
        why: 'Servizio sotto pressione, probabile break point imminente.',
      },
      {
        id: 'super-break',
        name: 'SUPER BREAK',
        status: 'OFF',
        target: header?.players?.home?.name || 'Player 1',
        confidence: null,
        risk: { level: 'MED' },
        exitRule: 'Al break / fine game',
        conditions: [
          { text: 'dominance > 60%', met: false },
          { text: 'dominant = server', met: true },
          { text: 'nextToServe != dominant', met: true },
          { text: 'Match ATP', met: true },
        ],
        why: null,
      },
    ];
  }, [data?.signals, header]);

  // Transform events
  const events = useMemo(() => {
    // Real events would come from a WebSocket or strategy history
    // For now, generate from current strategy states
    const now = new Date();
    return strategies.map((s, idx) => ({
      time: new Date(now.getTime() - idx * 60000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      status: s.status,
      message: `${s.name} ${s.status}${s.status === 'READY' ? ` → ${s.action} ${s.target}` : ''}`
    }));
  }, [strategies]);

  // Filtra strategie
  const filteredStrategies = useMemo(() => {
    if (activeFilter === 'all') return strategies;
    if (activeFilter === 'favorites') {
      return strategies.filter(s => favorites.has(s.id));
    }
    return strategies.filter(s => s.status === activeFilter);
  }, [strategies, activeFilter, favorites]);

  // Conteggi per filtri
  const counts = useMemo(() => ({
    all: strategies.length,
    READY: strategies.filter(s => s.status === 'READY').length,
    WATCH: strategies.filter(s => s.status === 'WATCH').length,
    favorites: favorites.size,
  }), [strategies, favorites]);

  const handleExecute = (strategy) => {
    // TODO: Implementare logica di esecuzione
  };

  return (
    <motion.div
      className="strategies-tab"
      variants={fadeUp}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="strategies-tab__header">
        <h2 className="tab-title">
          <Target size={24} weight="duotone" />
          Strategie Live
        </h2>
        <div className="tab-controls">
          <span className="control-label">Auto-Refresh: ON</span>
          <span className="control-label">Anti-spam: ON</span>
          <span className="control-label">Cooldown: 30s</span>
        </div>
      </div>

      {/* Filters */}
      <div className="strategies-tab__filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            className={`filter-button ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
            {counts[filter.id] > 0 && (
              <span className="filter-count">{counts[filter.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Strategy Cards */}
      <motion.div
        className="strategies-tab__cards"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <AnimatePresence mode="popLayout">
          {filteredStrategies.length === 0 ? (
            <motion.div
              className="no-strategies"
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Funnel size={48} weight="duotone" className="icon" />
              <p>Nessuna strategia corrisponde ai filtri</p>
            </motion.div>
          ) : (
            filteredStrategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                onExecute={handleExecute}
              />
            ))
          )}
        </AnimatePresence>
      </motion.div>

    </motion.div>
  );
}

export default StrategiesTab;
