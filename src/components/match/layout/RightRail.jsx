/**
 * RightRail - Pannello destro sempre visibile
 * 
 * Contiene:
 * - Strategy CTA attiva
 * - Odds Quick View
 * - Risk Controls
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Lightning,
  ArrowRight,
  ShieldCheck,
  Gauge,
  CurrencyDollar,
  Warning,
  CheckCircle,
} from '@phosphor-icons/react';
import { MotionCard } from '../../../motion/MotionCard';
import { MotionButton } from '../../../motion/MotionButton';
import { durations, easings, fadeUp } from '../../../motion/tokens';
import './RightRail.css';

/**
 * Strategy CTA - Strategia pronta per l'azione
 */
function StrategyCTA({ strategy }) {
  if (!strategy) return null;

  const statusColors = {
    READY: '#10b981',
    WATCH: '#f59e0b',
    OFF: '#64748b',
  };

  const statusBg = {
    READY: 'rgba(16, 185, 129, 0.15)',
    WATCH: 'rgba(245, 158, 11, 0.15)',
    OFF: 'rgba(100, 116, 139, 0.15)',
  };

  const status = strategy.status || 'OFF';
  const isReady = status === 'READY';

  return (
    <motion.div
      className="strategy-cta"
      style={{
        borderColor: statusColors[status],
        background: statusBg[status],
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.normal, ease: easings.premium }}
    >
      <div className="strategy-cta__header">
        <span
          className="status-badge"
          style={{ background: statusColors[status] }}
        >
          <span className={`status-dot ${status.toLowerCase()}`}></span>
          {status}
        </span>
        <span className="strategy-name">{strategy.name}</span>
      </div>

      <div className="strategy-cta__body">
        <div className="strategy-detail">
          <span className="label">Target:</span>
          <span className="value">{strategy.target || '-'}</span>
        </div>
        <div className="strategy-detail">
          <span className="label">Score:</span>
          <span className="value">{strategy.score || '-'}</span>
        </div>
        <div className="strategy-detail">
          <span className="label">Confidence:</span>
          <span className="value">{strategy.confidence ? (strategy.confidence * 100).toFixed(0) + '%' : '-'}</span>
        </div>
      </div>

      {isReady && (
        <MotionButton
          variant="primary"
          className="strategy-cta__action"
          onClick={() => console.log('Execute strategy:', strategy)}
        >
          <Target size={16} weight="bold" />
          {strategy.action || 'LAY'} {strategy.target}
          <ArrowRight size={14} weight="bold" />
        </MotionButton>
      )}

      <div className="strategy-cta__footer">
        <span className="exit-rule">
          Exit: {strategy.exitRule || 'Break o Hold'}
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Odds Quick View - Quote sempre visibili
 */
function OddsQuickView({ odds }) {
  if (!odds) return null;

  const { home, away } = odds;

  const getTrendIcon = (trend) => {
    if (trend > 0) return { symbol: '↗', color: '#10b981' };
    if (trend < 0) return { symbol: '↘', color: '#ef4444' };
    return { symbol: '→', color: '#64748b' };
  };

  return (
    <div className="odds-quick">
      <h4 className="section-title">
        <CurrencyDollar size={16} weight="duotone" />
        Odds Quick View
      </h4>
      <div className="odds-row">
        <span className="player-name">{home?.name || 'Player 1'}</span>
        <span className="odds-value">{home?.value?.toFixed(2) || '-'}</span>
        <span style={{ color: getTrendIcon(home?.trend).color }}>
          {getTrendIcon(home?.trend).symbol}
        </span>
      </div>
      <div className="odds-row">
        <span className="player-name">{away?.name || 'Player 2'}</span>
        <span className="odds-value">{away?.value?.toFixed(2) || '-'}</span>
        <span style={{ color: getTrendIcon(away?.trend).color }}>
          {getTrendIcon(away?.trend).symbol}
        </span>
      </div>
    </div>
  );
}

/**
 * Risk Controls - Controlli rischio
 */
function RiskControls({ exposure, dailyStop }) {
  const exposurePercent = exposure?.current && exposure?.max
    ? (exposure.current / exposure.max) * 100
    : 0;

  const dailyPercent = dailyStop?.current && dailyStop?.limit
    ? Math.abs((dailyStop.current / dailyStop.limit) * 100)
    : 0;

  const getProgressColor = (percent) => {
    if (percent >= 80) return '#ef4444';
    if (percent >= 60) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="risk-controls">
      <h4 className="section-title">
        <ShieldCheck size={16} weight="duotone" />
        Risk Controls
      </h4>

      <div className="risk-item">
        <div className="risk-header">
          <span className="risk-label">Exposure this match</span>
          <span className="risk-value">
            €{exposure?.current || 0} / €{exposure?.max || 60}
          </span>
        </div>
        <div className="risk-progress">
          <div
            className="risk-progress__fill"
            style={{
              width: `${Math.min(exposurePercent, 100)}%`,
              background: getProgressColor(exposurePercent),
            }}
          />
        </div>
      </div>

      <div className="risk-item">
        <div className="risk-header">
          <span className="risk-label">Daily stop</span>
          <span className="risk-value" style={{ color: dailyStop?.current < 0 ? '#ef4444' : '#10b981' }}>
            €{dailyStop?.current || 0} / -€{Math.abs(dailyStop?.limit) || 50}
          </span>
        </div>
        <div className="risk-progress">
          <div
            className="risk-progress__fill"
            style={{
              width: `${Math.min(dailyPercent, 100)}%`,
              background: getProgressColor(dailyPercent),
            }}
          />
        </div>
      </div>

      <div className="risk-toggles">
        <label className="toggle-item">
          <input type="checkbox" />
          <span>Auto-cashout</span>
        </label>
        <label className="toggle-item">
          <input type="checkbox" defaultChecked />
          <span>Notifications</span>
        </label>
      </div>
    </div>
  );
}

/**
 * RightRail Component
 */
export function RightRail({ strategies, odds, header }) {
  // Bundle structure: strategies = { signals: [], summary: {} }
  const signals = strategies?.signals || [];
  
  // Trova la strategia READY con più alta confidence
  const readyStrategy = signals
    .filter(s => s.status === 'READY')
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];

  // Fallback a WATCH se nessuna READY
  const watchStrategy = signals
    .filter(s => s.status === 'WATCH')
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];

  const activeStrategy = readyStrategy || watchStrategy;
  
  // Normalizza odds per OddsQuickView
  // Bundle structure: odds = { matchWinner: {...}, history: [...] }
  const normalizedOdds = odds?.matchWinner ? {
    home: { 
      name: header?.players?.home?.name,
      value: typeof odds.matchWinner.home === 'object' ? odds.matchWinner.home.value : odds.matchWinner.home,
      trend: typeof odds.matchWinner.home === 'object' ? odds.matchWinner.home.trend : 0
    },
    away: {
      name: header?.players?.away?.name,
      value: typeof odds.matchWinner.away === 'object' ? odds.matchWinner.away.value : odds.matchWinner.away,
      trend: typeof odds.matchWinner.away === 'object' ? odds.matchWinner.away.trend : 0
    }
  } : null;

  return (
    <aside className="right-rail">
      {/* Strategy CTA */}
      <section className="right-rail__section">
        <AnimatePresence mode="wait">
          {activeStrategy ? (
            <StrategyCTA key={activeStrategy.id} strategy={activeStrategy} />
          ) : (
            <motion.div
              key="no-strategy"
              className="no-strategy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Gauge size={32} weight="duotone" className="icon" />
              <p>Nessuna strategia attiva</p>
              <span className="hint">Le strategie appariranno qui quando saranno READY o WATCH</span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Odds Quick View */}
      <section className="right-rail__section">
        <OddsQuickView odds={normalizedOdds} />
      </section>

      {/* Risk Controls */}
      <section className="right-rail__section">
        <RiskControls
          exposure={{ current: 20, max: 60 }}
          dailyStop={{ current: -12, limit: -50 }}
        />
      </section>
    </aside>
  );
}

export default RightRail;
