/**
 * MomentumTab - Trend e Run analysis
 *
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendUp,
  TrendDown,
  ArrowRight,
  Lightning,
  Target,
  Pulse,
  Fire,
} from '@phosphor-icons/react';
import { MotionCard } from '../../../motion/MotionCard';
import { fadeUp } from '../../../motion/tokens';
import './MomentumTab.css';

/**
 * Calcola power rankings dai punti point-by-point
 * Raggruppa per set/game e calcola un valore di "dominanza" per ogni game
 * Positivo = home domina, Negativo = away domina
 * 
 * LOGICA: Il valore rappresenta chi ha avuto il momentum nel game
 * - Se il server tiene facilmente (pochi punti), momentum neutro/leggero per server
 * - Se il receiver porta a deuce/break point, momentum per receiver
 * - Se c'è break, forte momentum per chi ha breakkato
 */
function calculatePowerRankingsFromPoints(points) {
  if (!points || points.length === 0) return [];
  
  // Raggruppa per set/game
  const games = {};
  points.forEach(p => {
    const key = `${p.set}-${p.game}`;
    if (!games[key]) {
      games[key] = {
        set_number: p.set,
        game_number: p.game,
        points: [],
        gameServer: p.gameServer,
        gameWinner: p.gameWinner,
        gameIsBreak: p.gameIsBreak
      };
    }
    games[key].points.push(p);
  });
  
  // Calcola power ranking per ogni game
  return Object.values(games).map(game => {
    const server = game.gameServer; // 'home' o 'away'
    const winner = game.gameWinner;
    const isBreak = game.gameIsBreak;
    const totalPoints = game.points.length;
    
    // Calcola punti vinti dal receiver (chi non serve)
    const receiverPointsWon = game.points.filter(p => p.pointWinner !== server).length;
    const serverPointsWon = totalPoints - receiverPointsWon;
    
    // Il momentum del game dipende da:
    // 1. Chi ha vinto il game
    // 2. Quanto è stato combattuto (più punti = più combattuto)
    // 3. Se c'è stato un break
    
    let value = 0;
    
    if (isBreak) {
      // BREAK: forte momentum per chi ha breakkato
      // winner !== server significa che il receiver ha vinto
      value = winner === 'home' ? 80 : -80;
      // Bonus se molti punti (break difficile = più momentum)
      if (totalPoints >= 8) value = winner === 'home' ? 100 : -100;
    } else {
      // HOLD: il server ha tenuto
      // Il valore dipende da quanto è stato facile/difficile
      // Game rapido (3-4 punti) = server dominante
      // Game lungo (7+ punti, deuce) = receiver ha lottato
      
      if (totalPoints <= 4) {
        // Hold facile - momentum per il server
        value = server === 'home' ? 60 : -60;
      } else if (totalPoints <= 6) {
        // Hold normale - momentum leggero per server
        value = server === 'home' ? 30 : -30;
      } else {
        // Hold difficile/deuce - momentum più neutro o per receiver
        // Se tanti punti, il receiver ha fatto bene anche se ha perso
        const receiverPressure = receiverPointsWon / totalPoints;
        if (receiverPressure > 0.45) {
          // Receiver ha messo pressione, momentum leggero per lui
          value = server === 'home' ? -20 : 20;
        } else {
          value = server === 'home' ? 15 : -15;
        }
      }
    }
    
    return {
      set_number: game.set_number,
      game_number: game.game_number,
      value: Math.max(-100, Math.min(100, value)),
      break_occurred: isBreak,
      source: 'calculated'
    };
  }).sort((a, b) => {
    if (a.set_number !== b.set_number) return a.set_number - b.set_number;
    return a.game_number - b.game_number;
  });
}

/**
 * Points Visualization - Ultimi punti visivi
 */
function PointsViz({ points, label, winner }) {
  return (
    <div className="points-viz">
      <span className="points-label">{label}:</span>
      <div className="points-dots">
        {points.map((point, idx) => (
          <span key={idx} className={`point-dot ${point === winner ? 'won' : 'lost'}`}>
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
 * Power Rankings Chart - Visualizzazione grafica del momentum
 * Barre orizzontali: positive (verde) a destra, negative (rosso) a sinistra
 */
function PowerRankingsChart({ rankings, homeLabel, awayLabel }) {
  if (!rankings || rankings.length === 0) {
    return <p className="no-data">No power rankings available</p>;
  }

  // Prendiamo gli ultimi 10 game (o meno se non ci sono)
  const recentRankings = rankings.slice(-10);
  
  // Trova il valore massimo assoluto per scalare le barre
  const maxAbsValue = Math.max(...recentRankings.map(r => Math.abs(r.value || 0)), 1);

  return (
    <div className="power-rankings-chart">
      {/* Legend */}
      <div className="pr-chart-legend">
        <span className="legend-home">{homeLabel}</span>
        <span className="legend-center">0</span>
        <span className="legend-away">{awayLabel}</span>
      </div>
      
      {/* Chart */}
      <div className="pr-chart-container">
        {recentRankings.map((rank, idx) => {
          const value = rank.value || 0;
          const barWidth = Math.abs(value) / maxAbsValue * 50; // max 50% each side
          const isPositive = value >= 0; // positive = home momentum
          const hasBreak = rank.break_occurred || rank.breakOccurred;
          
          return (
            <div key={idx} className="pr-chart-row">
              <span className="pr-game-label">
                S{rank.set_number || rank.set || 1}G{rank.game_number || rank.game || idx + 1}
              </span>
              <div className="pr-bar-container">
                {/* Left side (positive/home) */}
                <div className="pr-bar-side left">
                  {isPositive && (
                    <div 
                      className={`pr-bar home ${hasBreak ? 'has-break' : ''}`}
                      style={{ width: `${barWidth}%` }}
                    >
                      {hasBreak && <span className="break-marker">B</span>}
                    </div>
                  )}
                </div>
                {/* Center line */}
                <div className="pr-center-line" />
                {/* Right side (negative/away) */}
                <div className="pr-bar-side right">
                  {!isPositive && (
                    <div 
                      className={`pr-bar away ${hasBreak ? 'has-break' : ''}`}
                      style={{ width: `${barWidth}%` }}
                    >
                      {hasBreak && <span className="break-marker">B</span>}
                    </div>
                  )}
                </div>
              </div>
              <span className={`pr-value ${isPositive ? 'home' : 'away'}`}>
                {value > 0 ? '+' : ''}{value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Quality Stats (Winners/UE) - DEPRECATED, kept for reference
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
 * Usa pointByPointData come fallback se powerRankings incompleti
 */
export function MomentumTab({ data, header, pointByPointData }) {
  const players = header?.players || {};
  // Bundle: tabs.momentum.features = { trend, recentSwing, breakCount }
  // Bundle: tabs.momentum.powerRankings = []
  // Bundle: tabs.momentum.qualityStats = { home: { winners, ue }, away: { winners, ue } }
  const features = data?.features || {};
  const bundlePowerRankings = data?.powerRankings || [];
  const qualityStats = data?.qualityStats || {
    home: { winners: 0, ue: 0 },
    away: { winners: 0, ue: 0 },
  };

  // Calcola power rankings da point-by-point se bundle incompleto
  const pbpPoints = pointByPointData?.points || [];
  const calculatedPowerRankings = useMemo(() => {
    return calculatePowerRankingsFromPoints(pbpPoints);
  }, [pbpPoints]);
  
  // Usa power rankings calcolati se bundle ha meno game
  const powerRankings = useMemo(() => {
    if (calculatedPowerRankings.length > bundlePowerRankings.length) {
      return calculatedPowerRankings;
    }
    return bundlePowerRankings;
  }, [bundlePowerRankings, calculatedPowerRankings]);

  // header.features ha volatility, pressure, dominance, serveDominance, returnDominance
  const headerFeatures = header?.features || {};

  const homeLabel = players.home?.name?.split(' ').pop() || 'H';
  const awayLabel = players.away?.name?.split(' ').pop() || 'A';

  // Il bundle manda features.trend direttamente, non features.momentum.trend
  const momentum = {
    trend: features.trend || 'stable',
    recentSwing: features.recentSwing || 0,
    breakCount: features.breakCount || 0,
    last5avg: features.last5avg || null,
  };

  const serveDom = headerFeatures.serveDominance || 50;
  const returnDom = headerFeatures.returnDominance || 50;

  return (
    <motion.div className="momentum-tab" variants={fadeUp} initial="initial" animate="animate">
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
              <span className={`trend-value ${momentum.trend === 'home_rising' ? 'trend-rising home' : momentum.trend === 'away_rising' ? 'trend-rising away' : 'trend-stable'}`}>
                {momentum.trend === 'home_rising' && (
                  <TrendUp size={16} weight="fill" className="trend-icon" />
                )}
                {momentum.trend === 'away_rising' && (
                  // Rising arrow should point up even for away (label is 'Rising')
                  <TrendUp size={16} weight="fill" className="trend-icon" />
                )}
                {(!momentum.trend || momentum.trend === 'stable') && (
                  <ArrowRight size={16} weight="bold" className="trend-icon" />
                )}
                <span>
                  {momentum.trend === 'home_rising'
                    ? `${homeLabel} Rising`
                    : momentum.trend === 'away_rising'
                    ? `${awayLabel} Rising`
                    : 'Stable'}
                </span>
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
              <span className="trend-value mono">
                {typeof momentum.last5avg === 'number' ? momentum.last5avg.toFixed(1) : '—'}
              </span>
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

        {/* Power Rankings Chart */}
        <MotionCard className="momentum-card power-chart-card">
          <h3 className="card-title">
            <Target size={18} weight="duotone" />
            Momentum Flow
          </h3>
          <PowerRankingsChart 
            rankings={powerRankings} 
            homeLabel={homeLabel}
            awayLabel={awayLabel}
          />
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
