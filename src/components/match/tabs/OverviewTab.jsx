/**
 * OverviewTab - Tab principale operativa
 * @see docs/comments/overview-tab-explanations.md#header
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  TennisBall,
  Target,
  TrendUp,
  TrendDown,
  ArrowRight,
  Gauge,
  Pulse,
} from '@phosphor-icons/react';
import { MotionCard } from '../../../motion/MotionCard';
import { staggerContainer, staggerItem } from '../../../motion/tokens';
import './OverviewTab.css';

/**
 * Scoreboard - Mostra stato match dal bundle.header
 *
 * Dati da bundle.header:
 * - header.players.home/away: { name, ranking, country }
 * - header.score: { sets: [{home, away}], game: {home, away}, serving }
 * - header.match: { status, surface, tournament, round }
 * - header.odds: { home, away }
 */
function Scoreboard({ header }) {
  const players = header?.players || {};
  const score = header?.score || {};
  const matchInfo = header?.match || {};
  const odds = header?.odds || {};
  const home = players.home || {};
  const away = players.away || {};
  const finalSets = header?.match?.setsWon;
  const showFinalSets = (matchInfo.status === 'finished' || header?.match?.winner) && finalSets;

  return (
    <MotionCard className="scoreboard">
      <h3 className="scoreboard__title">
        <TennisBall size={18} weight="duotone" />
        Match Info
        {matchInfo.status && (
          <span className={`match-status match-status--${matchInfo.status}`}>
            {matchInfo.status === 'live' ? '🔴 LIVE' : matchInfo.status}
          </span>
        )}
      </h3>

      <div className="scoreboard__players">
        {/* Home Player */}
        <div className={`scoreboard__player ${score.serving === 'home' ? 'serving' : ''}`}>
          <div className="player-info">
            {score.serving === 'home' && (
              <TennisBall size={14} weight="fill" className="serve-indicator" />
            )}
            <span className="player-name">{home.name || 'Player 1'}</span>
            {home.ranking && <span className="player-rank">#{home.ranking}</span>}
          </div>
          <div className="player-sets">
            {(score.sets || []).length > 0 ? (
              score.sets.map((set, idx) => (
                <span key={idx} className="set-score">
                  {set.home ?? '-'}
                </span>
              ))
            ) : (
              <span className="set-score">-</span>
            )}
          </div>
          <div className="player-game">
            <span className="game-score">{showFinalSets ? finalSets.home : score.game?.home ?? '-'}</span>
          </div>
          {odds.home && (
            <div className="player-odds">
              <span className="odds-value">
                {typeof odds.home === 'object' ? odds.home.value?.toFixed(2) : odds.home}
              </span>
            </div>
          )}
        </div>

        {/* Away Player */}
        <div className={`scoreboard__player ${score.serving === 'away' ? 'serving' : ''}`}>
          <div className="player-info">
            {score.serving === 'away' && (
              <TennisBall size={14} weight="fill" className="serve-indicator" />
            )}
            <span className="player-name">{away.name || 'Player 2'}</span>
            {away.ranking && <span className="player-rank">#{away.ranking}</span>}
          </div>
          <div className="player-sets">
            {(score.sets || []).length > 0 ? (
              score.sets.map((set, idx) => (
                <span key={idx} className="set-score">
                  {set.away ?? '-'}
                </span>
              ))
            ) : (
              <span className="set-score">-</span>
            )}
          </div>
          <div className="player-game">
            <span className="game-score">{showFinalSets ? finalSets.away : score.game?.away ?? '-'}</span>
          </div>
          {odds.away && (
            <div className="player-odds">
              <span className="odds-value">
                {typeof odds.away === 'object' ? odds.away.value?.toFixed(2) : odds.away}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="scoreboard__info">
        <span>{matchInfo.surface || 'N/A'}</span>
        <span>•</span>
        <span>{matchInfo.tournament || 'Tournament'}</span>
        {matchInfo.round && (
          <>
            <span>•</span>
            <span>{matchInfo.round}</span>
          </>
        )}
      </div>
    </MotionCard>
  );
}

/**
 * QuickSignals - Features pre-calcolate dal backend
 *
 * Dati da bundle.header.features (FILOSOFIA_STATS):
 * - volatility: 0-100 (null se N/A)
 * - pressure: 0-100 (null se N/A)
 * - dominance: 0-100 (null se N/A)
 * - serveDominance: 0-100 (null se N/A)
 * - returnDominance: 0-100 (null se N/A)
 * - breakProbability: 0-100 (null se N/A)
 * - hasRealData: boolean
 */
function QuickSignals({ header }) {
  const features = header?.features || {};
  const hasRealData = features.hasRealData !== false;

  const getSignalColor = (value) => {
    if (value === null || value === undefined) return 'var(--text-muted)';
    if (value >= 70) return 'var(--color-danger)';
    if (value >= 40) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  const getSignalLabel = (value) => {
    if (value === null || value === undefined) return '';
    if (value >= 70) return 'HIGH';
    if (value >= 40) return 'MED';
    return 'LOW';
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value}%`;
  };

  return (
    <MotionCard className="quick-signals">
      <h3 className="section-title">
        <Gauge size={18} weight="duotone" />
        Segnali
        {!hasRealData && <span className="no-data-badge">Dati non disponibili</span>}
      </h3>

      <div className="signals-grid">
        <div className="signal-item">
          <span className="signal-label">Volatilità</span>
          <span className="signal-value" style={{ color: getSignalColor(features.volatility) }}>
            {formatValue(features.volatility)}
            {features.volatility !== null && features.volatility !== undefined && (
              <small> ({getSignalLabel(features.volatility)})</small>
            )}
          </span>
        </div>

        <div className="signal-item">
          <span className="signal-label">Pressione</span>
          <span className="signal-value" style={{ color: getSignalColor(features.pressure) }}>
            {formatValue(features.pressure)}
          </span>
        </div>

        <div className="signal-item">
          <span className="signal-label">Dominance</span>
          <span className="signal-value" style={{ color: getSignalColor(features.dominance) }}>
            {formatValue(features.dominance)}
          </span>
        </div>

        <div className="signal-item">
          <span className="signal-label">Break Prob.</span>
          <span
            className="signal-value"
            style={{ color: getSignalColor(features.breakProbability) }}
          >
            {formatValue(features.breakProbability)}
          </span>
        </div>

        <div className="signal-item">
          <span className="signal-label">Serve Dom.</span>
          <span className="signal-value" style={{ color: getSignalColor(features.serveDominance) }}>
            {formatValue(features.serveDominance)}
          </span>
        </div>

        <div className="signal-item">
          <span className="signal-label">Return Dom.</span>
          <span
            className="signal-value"
            style={{ color: getSignalColor(features.returnDominance) }}
          >
            {formatValue(features.returnDominance)}
          </span>
        </div>
      </div>
    </MotionCard>
  );
}

/**
 * StrategyMiniPanel - Riassunto strategie
 *
 * Dati da bundle.tabs.strategies:
 * - signals: array di { id, name, status, confidence, target, reasons }
 * - summary: { ready, watch, off }
 */
function StrategyMiniPanel({ strategies }) {
  const signals = strategies?.signals || [];
  const summary = strategies?.summary || { ready: 0, watch: 0, off: 0 };

  const statusColors = {
    READY: 'var(--color-success)',
    WATCH: 'var(--color-warning)',
    OFF: 'var(--text-muted)',
  };

  return (
    <MotionCard className="strategy-mini-panel">
      <h3 className="section-title">
        <Target size={18} weight="duotone" />
        Strategie ({summary.ready} READY, {summary.watch} WATCH)
      </h3>

      <motion.div
        className="strategies-list"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {signals.length === 0 ? (
          <p className="no-strategies">Nessuna strategia configurata</p>
        ) : (
          signals.map((strategy, idx) => (
            <motion.div
              key={strategy.id || idx}
              className={`strategy-mini-item ${(strategy.status || 'off').toLowerCase()}`}
              variants={staggerItem}
              style={{ borderLeftColor: statusColors[strategy.status] || statusColors.OFF }}
            >
              <div className="strategy-mini-header">
                <span className="strategy-status">
                  <span className={`status-dot ${(strategy.status || 'off').toLowerCase()}`} />
                  {strategy.name}
                </span>
                <span className={`strategy-state ${(strategy.status || 'off').toLowerCase()}`}>
                  {strategy.status}
                </span>
              </div>
              {strategy.confidence > 0 && (
                <div className="strategy-mini-details">
                  <span>Confidence: {Math.round(strategy.confidence * 100)}%</span>
                  {strategy.target && (
                    <>
                      <span>•</span>
                      <span>Target: {strategy.target}</span>
                    </>
                  )}
                </div>
              )}
              {strategy.reasons?.length > 0 && (
                <p className="strategy-reason">{strategy.reasons[0]}</p>
              )}
            </motion.div>
          ))
        )}
      </motion.div>
    </MotionCard>
  );
}

/**
 * MiniMomentum - Trend momentum
 *
 * Dati da bundle.features.momentum:
 * - trend: 'stable' | 'home_rising' | 'away_rising'
 * - recentSwing: number
 * - breakCount: number
 * - last5avg: number
 */
function MiniMomentum({ header, data }) {
  // Momentum può essere in header.features.momentum o in data.features.momentum
  const features = header?.features || data?.features || {};
  const momentum = features.momentum || {};
  const players = header?.players || {};

  // Verifica se ci sono dati reali di momentum
  const hasRealData =
    features.hasRealData !== false &&
    (momentum.recentSwing !== undefined ||
      momentum.breakCount !== undefined ||
      momentum.last5avg !== undefined ||
      (momentum.trend && momentum.trend !== 'stable' && momentum.trend !== 'unknown'));

  const getTrendIcon = (trend) => {
    if (!hasRealData) return <ArrowRight size={16} weight="bold" className="trend-icon na" />;
    if (trend === 'home_rising' || trend === 'rising') {
      return <TrendUp size={16} weight="fill" className="trend-icon rising" />;
    }
    if (trend === 'away_rising' || trend === 'falling') {
      return <TrendDown size={16} weight="fill" className="trend-icon falling" />;
    }
    return <ArrowRight size={16} weight="bold" className="trend-icon stable" />;
  };

  const getTrendLabel = (trend) => {
    if (!hasRealData) return 'N/A';
    if (trend === 'home_rising') return 'Home Rising';
    if (trend === 'away_rising') return 'Away Rising';
    if (trend === 'rising') return 'Rising';
    if (trend === 'falling') return 'Falling';
    return 'Stable';
  };

  const formatValue = (value) => {
    if (!hasRealData || value === undefined || value === null) return 'N/A';
    return value;
  };

  return (
    <MotionCard className="mini-momentum">
      <h3 className="section-title">
        <Pulse size={18} weight="duotone" />
        Momentum
        {!hasRealData && <span className="no-data-badge">Dati non disponibili</span>}
      </h3>

      <div className={`momentum-info ${!hasRealData ? 'no-data' : ''}`}>
        <div className="momentum-row">
          <span className="momentum-label">Trend</span>
          <span
            className={`momentum-value ${
              hasRealData ? `trend-${momentum.trend || 'stable'}` : 'na'
            }`}
          >
            {getTrendIcon(momentum.trend)}
            <span>{getTrendLabel(momentum.trend)}</span>
          </span>
        </div>

        <div className="momentum-row">
          <span className="momentum-label">Recent Swing</span>
          <span className={`momentum-value mono ${!hasRealData ? 'na' : ''}`}>
            {formatValue(momentum.recentSwing)}
          </span>
        </div>

        <div className="momentum-row">
          <span className="momentum-label">Break Count</span>
          <span className={`momentum-value mono ${!hasRealData ? 'na' : ''}`}>
            {formatValue(momentum.breakCount)}
          </span>
        </div>

        <div className="momentum-row">
          <span className="momentum-label">Last 5 Avg</span>
          <span className={`momentum-value mono ${!hasRealData ? 'na' : ''}`}>
            {hasRealData && typeof momentum.last5avg === 'number'
              ? momentum.last5avg.toFixed(1)
              : 'N/A'}
          </span>
        </div>
      </div>

      <div className="momentum-players">
        <div className="player-momentum home">
          <span className="player-name">{players.home?.name?.split(' ').pop() || 'Home'}</span>
        </div>
        <span className="vs-divider">vs</span>
        <div className="player-momentum away">
          <span className="player-name">{players.away?.name?.split(' ').pop() || 'Away'}</span>
        </div>
      </div>
    </MotionCard>
  );
}

/**
 * OverviewTab Component
 *
 * Props dal MatchPage (useMatchBundle):
 * - data: bundle.tabs.overview
 * - header: bundle.header (players, score, odds, features, match)
 * - strategies: bundle.tabs.strategies
 */
export function OverviewTab({ data, header, strategies }) {
  return (
    <motion.div
      className="overview-tab"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <div className="overview-grid">
        {/* Top Row: Scoreboard + Quick Signals */}
        <div className="overview-top">
          <Scoreboard header={header} />
          <QuickSignals header={header} />
        </div>

        {/* Bottom Row: Strategy Panel + Mini Momentum */}
        <div className="overview-bottom">
          <StrategyMiniPanel strategies={strategies} />
          <MiniMomentum header={header} data={data} />
        </div>
      </div>
    </motion.div>
  );
}

export default OverviewTab;
