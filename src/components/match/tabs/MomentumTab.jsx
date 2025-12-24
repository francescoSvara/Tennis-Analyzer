/**
 * MomentumTab - Trend e Run analysis
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendUp, TrendDown, ArrowRight, Lightning, Target, Pulse, Fire } from '@phosphor-icons/react';
import { MotionCard } from '../../../motion/MotionCard';
import { fadeUp } from '../../../motion/tokens';
import './MomentumTab.css';

/**
 * Points Visualization - Ultimi punti visivi
 */
function PointsViz({ points, label, winner }) {
  return (
    <div className="points-viz">
      <span className="points-label">{label}:</span>
      <div className="points-dots">
        {points.map((point, idx) => (
          <span
            key={idx}
            className={`point-dot ${point === winner ? 'won' : 'lost'}`}
          >
            {point === winner ? '●' : '○'}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Run Indicator
 */
function RunIndicator({ label, current, total, isHot }) {
  return (
    <div className={`run-indicator ${isHot ? 'hot' : ''}`}>
      <div className="run-header">
        <span className="run-label">{label}</span>
        {isHot && <Fire size={14} weight="fill" className="hot-icon" />}
      </div>
      <div className="run-value">
        <span className="current">{current}</span>
        <span className="separator">/</span>
        <span className="total">{total}</span>
      </div>
    </div>
  );
}

/**
 * Serve Dominance Meter
 */
function ServeDominance({ home, away, homeLabel, awayLabel }) {
  const total = home + away;
  const homePercent = total > 0 ? (home / total) * 100 : 50;

  return (
    <div className="serve-dominance">
      <div className="dominance-header">
        <span className="player-label">{homeLabel}</span>
        <span className="section-label">Serve Dominance</span>
        <span className="player-label">{awayLabel}</span>
      </div>
      <div className="dominance-bar">
        <div className="dominance-fill home" style={{ width: `${homePercent}%` }}>
          {home}%
        </div>
        <div className="dominance-fill away" style={{ width: `${100 - homePercent}%` }}>
          {away}%
        </div>
      </div>
    </div>
  );
}

/**
 * Quality Stats (Winners/UE)
 */
function QualityStats({ home, away, homeLabel, awayLabel }) {
  return (
    <div className="quality-stats">
      <h4 className="section-title">
        <Pulse size={16} weight="duotone" />
        Quality
      </h4>
      <div className="quality-grid">
        <div className="quality-item">
          <span className="quality-label">Winners</span>
          <div className="quality-values">
            <span className="home-val">{home.winners}</span>
            <span className="separator">-</span>
            <span className="away-val">{away.winners}</span>
          </div>
        </div>
        <div className="quality-item">
          <span className="quality-label">Unforced Errors</span>
          <div className="quality-values">
            <span className="home-val">{home.ue}</span>
            <span className="separator">-</span>
            <span className="away-val">{away.ue}</span>
          </div>
        </div>
        <div className="quality-item">
          <span className="quality-label">Net Points Won</span>
          <div className="quality-values">
            <span className="home-val">{home.winners - home.ue}</span>
            <span className="separator">-</span>
            <span className="away-val">{away.winners - away.ue}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MomentumTab Component - Legge dal bundle
 */
export function MomentumTab({ data, header }) {
  const players = header?.players || {};
  // Bundle: tabs.momentum.features = { trend, recentSwing, breakCount }
  // Bundle: tabs.momentum.powerRankings = []
  // Bundle: tabs.momentum.qualityStats = { home: { winners, ue }, away: { winners, ue } }
  const features = data?.features || {};
  const powerRankings = data?.powerRankings || [];
  const qualityStats = data?.qualityStats || { home: { winners: 0, ue: 0 }, away: { winners: 0, ue: 0 } };
  
  // header.features ha volatility, pressure, dominance, serveDominance, returnDominance
  const headerFeatures = header?.features || {};
  
  const homeLabel = players.home?.name?.split(' ').pop() || 'H';
  const awayLabel = players.away?.name?.split(' ').pop() || 'A';

  // Il bundle manda features.trend direttamente, non features.momentum.trend
  const momentum = {
    trend: features.trend || 'stable',
    recentSwing: features.recentSwing || 0,
    breakCount: features.breakCount || 0,
    last5avg: features.last5avg || null
  };
  
  const serveDom = headerFeatures.serveDominance || 50;
  const returnDom = headerFeatures.returnDominance || 50;

  return (
    <motion.div
      className="momentum-tab"
      variants={fadeUp}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="momentum-tab__header">
        <h2 className="tab-title">
          <TrendUp size={24} weight="duotone" />
          Momentum Analysis
        </h2>
      </div>

      <div className="momentum-grid">
        {/* Momentum Trend */}
        <MotionCard className="momentum-card points-card">
          <h3 className="card-title">
            <Pulse size={18} weight="duotone" />
            Trend Analysis
          </h3>
          <div className="trend-info">
            <div className="trend-item">
              <span className="trend-label">Trend</span>
              <span className={`trend-value trend-${momentum.trend || 'stable'}`}>
                {momentum.trend === 'rising' && <TrendUp size={16} weight="fill" className="trend-icon" />}
                {momentum.trend === 'falling' && <TrendDown size={16} weight="fill" className="trend-icon" />}
                {(!momentum.trend || momentum.trend === 'stable') && <ArrowRight size={16} weight="bold" className="trend-icon" />}
                <span>{momentum.trend === 'rising' ? 'Rising' : momentum.trend === 'falling' ? 'Falling' : 'Stable'}</span>
              </span>
            </div>
            <div className="trend-item">
              <span className="trend-label">Recent Swing</span>
              <span className="trend-value mono">{momentum.recentSwing ?? '—'}</span>
            </div>
            <div className="trend-item">
              <span className="trend-label">Break Count</span>
              <span className="trend-value mono">{momentum.breakCount ?? '—'}</span>
            </div>
            <div className="trend-item">
              <span className="trend-label">Last 5 Avg</span>
              <span className="trend-value mono">{typeof momentum.last5avg === 'number' ? momentum.last5avg.toFixed(1) : '—'}</span>
            </div>
          </div>
        </MotionCard>

        {/* Serve Dominance */}
        <MotionCard className="momentum-card dominance-card">
          <ServeDominance
            home={serveDom}
            away={100 - serveDom}
            homeLabel={homeLabel}
            awayLabel={awayLabel}
          />
        </MotionCard>

        {/* Quality Stats - Winners/UE */}
        <MotionCard className="momentum-card quality-card">
          <QualityStats
            home={qualityStats.home}
            away={qualityStats.away}
            homeLabel={homeLabel}
            awayLabel={awayLabel}
          />
        </MotionCard>

        {/* Power Rankings */}
        <MotionCard className="momentum-card runs-card">
          <h3 className="card-title">
            <Target size={18} weight="duotone" />
            Power Rankings
          </h3>
          <div className="rankings-container">
            {powerRankings.length > 0 ? (
              powerRankings.slice(0, 5).map((rank, idx) => (
                <div key={idx} className="ranking-item">
                  <span className="rank-position">#{idx + 1}</span>
                  <span className="rank-score">{rank.score || rank}</span>
                </div>
              ))
            ) : (
              <p className="no-data">No power rankings available</p>
            )}
          </div>
        </MotionCard>

        {/* Return Analysis */}
        <MotionCard className="momentum-card return-card">
          <h3 className="card-title">
            <Fire size={16} weight="duotone" />
            Return Analysis
          </h3>
          <div className="return-info">
            <div className="return-item">
              <span className="return-label">Return Dominance:</span>
              <span className="return-value">{returnDom}%</span>
            </div>
            <div className="return-item">
              <span className="return-label">Break Probability:</span>
              <span className="return-value">{headerFeatures.breakProbability || 25}%</span>
            </div>
          </div>
        </MotionCard>
      </div>
    </motion.div>
  );
}

export default MomentumTab;
