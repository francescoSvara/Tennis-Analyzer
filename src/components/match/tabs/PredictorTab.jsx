/**
 * PredictorTab - Probabilità e Edge
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Scales, ChartLineUp, Target, Lightning, Info } from '@phosphor-icons/react';
import { MotionCard } from '../../../motion/MotionCard';
import { fadeUp } from '../../../motion/tokens';
import './PredictorTab.css';

/**
 * Probability Gauge
 */
function ProbabilityGauge({ home, away, homeLabel, awayLabel, confidence }) {
  const getConfidenceColor = (conf) => {
    if (conf === 'HIGH') return '#10b981';
    if (conf === 'MED') return '#f59e0b';
    return '#64748b';
  };

  return (
    <div className="probability-gauge">
      <div className="gauge-header">
        <span className="gauge-title">Win Probability (model)</span>
        <span 
          className="confidence-badge"
          style={{ color: getConfidenceColor(confidence) }}
        >
          Confidence: {confidence}
        </span>
      </div>
      <div className="gauge-players">
        <div className="gauge-player home">
          <span className="player-name">{homeLabel}</span>
          <span className="player-prob">{home}%</span>
        </div>
        <div className="gauge-player away">
          <span className="player-name">{awayLabel}</span>
          <span className="player-prob">{away}%</span>
        </div>
      </div>
      <div className="gauge-bar">
        <div className="gauge-fill home" style={{ width: `${home}%` }} />
        <div className="gauge-fill away" style={{ width: `${away}%` }} />
      </div>
    </div>
  );
}

/**
 * Market Comparison
 */
function MarketComparison({ model, market, edge, liquidity }) {
  const getEdgeColor = (val) => {
    if (val > 2) return '#10b981';
    if (val > 0) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="market-comparison">
      <div className="comparison-row">
        <span className="comparison-label">Market implied:</span>
        <span className="comparison-value">
          H {market.home}% | A {market.away}%
        </span>
      </div>
      <div className="comparison-row edge">
        <span className="comparison-label">Edge:</span>
        <span 
          className="comparison-value"
          style={{ color: getEdgeColor(edge.value) }}
        >
          {edge.value > 0 ? '+' : ''}{edge.value}% su {edge.player}
        </span>
        {liquidity && (
          <span className="liquidity-warning">
            (WARNING: liquidity {liquidity})
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Break Probability
 */
function BreakProbability({ value, server, nextServer }) {
  return (
    <div className="break-probability">
      <div className="break-header">
        <Target size={18} weight="duotone" />
        <span>Break Next Game Probability</span>
      </div>
      <div className="break-value">
        <span className="prob-number">{value}%</span>
        <span className="prob-context">
          Next server: <strong>{nextServer}</strong>
        </span>
      </div>
      <div className="break-bar">
        <div className="break-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/**
 * Prediction Drivers
 */
function PredictionDrivers({ drivers }) {
  return (
    <div className="prediction-drivers">
      <h4 className="drivers-title">
        <Info size={16} weight="duotone" />
        Key Drivers
      </h4>
      <ul className="drivers-list">
        {drivers.map((driver, idx) => (
          <li key={idx} className="driver-item">
            <span className={`driver-indicator ${driver.direction}`}>
              {driver.direction === 'up' ? '↑' : '↓'}
            </span>
            {driver.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * PredictorTab Component - Legge dal bundle
 */
export function PredictorTab({ data, header }) {
  const players = header?.players || {};
  const winProb = data?.winProbability || { home: 50, away: 50 };
  const keyFactors = data?.keyFactors || [];
  // breakProbability dal tab predictor (data) o da header.features
  const breakProb = data?.breakProbability ?? header?.features?.breakProbability ?? 25;

  const homeLabel = players.home?.name || 'Player 1';
  const awayLabel = players.away?.name || 'Player 2';

  // Estrai features per mostrare drivers
  const features = header?.features || {};
  
  const drivers = keyFactors.length > 0 ? keyFactors : [
    { text: `Volatility: ${features.volatility || 50}%`, direction: features.volatility > 50 ? 'up' : 'down' },
    { text: `Pressure: ${features.pressure || 50}%`, direction: features.pressure > 50 ? 'up' : 'down' },
    { text: `Dominance: ${features.dominance || 50}%`, direction: features.dominance > 50 ? 'up' : 'down' },
  ];

  return (
    <motion.div
      className="predictor-tab"
      variants={fadeUp}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="predictor-tab__header">
        <h2 className="tab-title">
          <Scales size={24} weight="duotone" />
          Predictor
        </h2>
      </div>

      <div className="predictor-grid">
        {/* Win Probability */}
        <MotionCard className="predictor-card prob-card">
          <ProbabilityGauge
            home={winProb.home}
            away={winProb.away}
            homeLabel={homeLabel}
            awayLabel={awayLabel}
            confidence={features.volatility > 60 ? 'LOW' : features.volatility > 40 ? 'MED' : 'HIGH'}
          />
        </MotionCard>

        {/* Market Comparison & Edge */}
        <MotionCard className="predictor-card market-card">
          <h3 className="card-title">
            <ChartLineUp size={18} weight="duotone" />
            Market vs Model
          </h3>
          <MarketComparison
            model={winProb}
            market={{ home: winProb.home, away: winProb.away }}
            edge={{ value: 0, player: homeLabel }}
            liquidity="N/A"
          />
        </MotionCard>

        {/* Break Probability */}
        <MotionCard className="predictor-card break-card">
          <BreakProbability
            value={breakProb}
            nextServer={features.serverPlayerId ? 
              (features.serverPlayerId === players.home?.id ? awayLabel : homeLabel) : 
              'N/A'}
          />
        </MotionCard>

        {/* Drivers */}
        <MotionCard className="predictor-card drivers-card">
          <PredictionDrivers drivers={drivers} />
        </MotionCard>
      </div>
    </motion.div>
  );
}

export default PredictorTab;
