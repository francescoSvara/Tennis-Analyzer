/**
 * PointByPointTab - Feed punti con filtri e highlight
 * UI/UX migliorata con icone chiare e identificazione game importanti
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListBullets,
  Funnel,
  Lightning,
  Target,
  WarningCircle,
  Fire,
  Trophy,
  TennisBall,
  ArrowFatUp,
  Star,
  Sparkle,
  ShieldStar,
  Crosshair,
  Medal,
  SealCheck,
  X,
  CaretDown,
} from '@phosphor-icons/react';
import { MotionCard } from '../../../motion/MotionCard';
import { fadeUp } from '../../../motion/tokens';
import './PointByPointTab.css';

// Filtri disponibili con icone
const FILTERS = [
  { id: 'all', label: 'All', icon: ListBullets, count: null },
  { id: 'breakgames', label: 'Breaks', icon: Crosshair, color: '#dc2626' },
  { id: 'break', label: 'Break Points', icon: Target, color: '#ef4444' },
  { id: 'setpoint', label: 'Set Points', icon: Trophy, color: '#f59e0b' },
  { id: 'matchpoint', label: 'Match Points', icon: Medal, color: '#10b981' },
  { id: 'ace', label: 'Aces', icon: Lightning, color: '#3b82f6' },
  { id: 'df', label: 'Double Faults', icon: X, color: '#f97316' },
];

/**
 * Calcola il server per ogni punto basandosi sul game number
 * Nel tennis, il servizio alterna ogni game
 * Game 1, 3, 5... = Player 1 (home) serve (ipotesi)
 * Game 2, 4, 6... = Player 2 (away) serve
 * Nel tiebreak, il servizio alterna ogni 2 punti dopo il primo
 */
function calculateServer(point, setNumber) {
  const game = point.game || 1;
  const pointNumber = point.pointNumber || 1;
  
  // Tiebreak (game 7 in un set, o game 13 in alcuni formati)
  if (game === 7 || game === 13) {
    // Tiebreak: primo punto serve chi doveva servire, poi alterna ogni 2 punti
    // Punto 1: home, Punto 2-3: away, Punto 4-5: home, etc.
    if (pointNumber === 1) {
      return setNumber % 2 === 1 ? 'home' : 'away'; // Chi inizia il set
    }
    const adjustedPoint = pointNumber - 1;
    const serveBlock = Math.floor(adjustedPoint / 2);
    const firstServer = setNumber % 2 === 1 ? 'home' : 'away';
    return serveBlock % 2 === 0 ? (firstServer === 'home' ? 'away' : 'home') : firstServer;
  }
  
  // Game normali: alterna ogni game, considerando il set
  // Nel set 1: game dispari = home, game pari = away
  // Nel set 2: invertito, etc.
  const homeServesFirst = setNumber % 2 === 1;
  const isOddGame = game % 2 === 1;
  
  if (homeServesFirst) {
    return isOddGame ? 'home' : 'away';
  } else {
    return isOddGame ? 'away' : 'home';
  }
}

/**
 * Determina se un punteggio è un break point
 * 
 * REGOLA TENNIS FONDAMENTALE:
 * Break Point = il RECEIVER (chi riceve) è a UN PUNTO dal vincere il game
 * 
 * Il punteggio è sempre mostrato come HOME-AWAY.
 * Il break point esiste SOLO quando il RECEIVER ha 40 o AD e il server NO.
 * 
 * - Se server=home e away ha 40/AD (e home non ha 40/AD) → BP per away ✓
 * - Se server=away e home ha 40/AD (e away non ha 40/AD) → BP per home ✓
 * - Se il SERVER ha 40/AD → NON è un break point (è game point per il server)
 */
function isBreakPointScore(score, server) {
  if (!score || !server) return false;
  const parts = score.split('-');
  if (parts.length !== 2) return false;
  
  const [homeScore, awayScore] = parts;
  
  // Il receiver è l'opposto del server
  const receiver = server === 'home' ? 'away' : 'home';
  const receiverScore = receiver === 'home' ? homeScore : awayScore;
  const serverScore = server === 'home' ? homeScore : awayScore;
  
  // Break point SOLO se:
  // 1. Il receiver ha 40 o AD
  // 2. Il server NON ha 40 o AD (altrimenti è deuce o vantaggio server)
  const receiverHasGamePoint = receiverScore === '40' || receiverScore === 'AD' || receiverScore === 'A';
  const serverHasGamePoint = serverScore === '40' || serverScore === 'AD' || serverScore === 'A';
  
  // BP solo se receiver ha game point E server non ce l'ha
  return receiverHasGamePoint && !serverHasGamePoint;
}

/**
 * Determina il tipo di punto importante
 */
function getPointImportance(point, server) {
  const score = point.score || '';
  
  // Match point
  if (point.isMatchPoint) return 'matchpoint';
  
  // Set point
  if (point.isSetPoint) return 'setpoint';
  
  // Break point (dal flag o calcolato)
  if (point.isBreakPoint || isBreakPointScore(score, server)) return 'breakpoint';
  
  // Ace
  if (point.type === 'ace' || point.description === '1') return 'ace';
  
  // Double fault
  if (point.type === 'double_fault' || point.description === '2') return 'doublefault';
  
  // Winner
  if (point.type === 'winner' || point.isWinner) return 'winner';
  
  return null;
}

/**
 * Badge per tipo di punto
 */
function PointBadge({ type }) {
  const badges = {
    breakpoint: { icon: Target, label: 'BP', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    setpoint: { icon: Trophy, label: 'SP', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    matchpoint: { icon: Medal, label: 'MP', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    ace: { icon: Lightning, label: 'ACE', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    doublefault: { icon: X, label: 'DF', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
    winner: { icon: Star, label: 'W', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  };
  
  const badge = badges[type];
  if (!badge) return null;
  
  const Icon = badge.icon;
  
  return (
    <span 
      className="point-badge" 
      style={{ 
        color: badge.color, 
        backgroundColor: badge.bg,
        border: `1px solid ${badge.color}40`
      }}
    >
      <Icon size={12} weight="bold" />
      <span>{badge.label}</span>
    </span>
  );
}

/**
 * Server indicator
 */
function ServerIndicator({ server, homeName, awayName }) {
  const isHome = server === 'home';
  const name = isHome ? homeName : awayName;
  const shortName = name?.split(' ').pop() || (isHome ? 'P1' : 'P2');
  
  return (
    <div className={`server-indicator ${isHome ? 'home' : 'away'}`}>
      <TennisBall size={14} weight="fill" />
      <span>{shortName}</span>
    </div>
  );
}

/**
 * Point Winner indicator
 */
function PointWinner({ winner, homeName, awayName }) {
  if (!winner) return null;
  
  const isHome = winner === 'home';
  const shortName = (isHome ? homeName : awayName)?.split(' ').pop() || (isHome ? 'P1' : 'P2');
  
  return (
    <span className={`point-winner ${isHome ? 'home' : 'away'}`}>
      <ArrowFatUp size={12} weight="fill" />
      {shortName}
    </span>
  );
}

/**
 * Single Point Row
 * 
 * REGOLA TENNIS: Il break point è SEMPRE e SOLO del receiver.
 * Se il server tiene il servizio, non c'è mai stato un break point da mostrare.
 */
function PointRow({ point, homeName, awayName, isFirst, showGameHeader }) {
  const server = point.server !== 'unknown' ? point.server : calculateServer(point, point.set || 1);
  const importance = getPointImportance(point, server);
  
  const rowClass = `point-row ${importance ? `point-row--${importance}` : ''}`;
  
  return (
    <>
      {showGameHeader && (
        <div className="game-header">
          <span className="game-header__set">Set {point.set}</span>
          <span className="game-header__game">Game {point.game}</span>
          <ServerIndicator server={server} homeName={homeName} awayName={awayName} />
        </div>
      )}
      <motion.div 
        className={rowClass}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="point-row__score">
          {point.score || '0-0'}
        </div>
        
        <div className="point-row__details">
          {importance && <PointBadge type={importance} />}
          <PointWinner winner={point.pointWinner} homeName={homeName} awayName={awayName} />
        </div>
        
        <div className="point-row__meta">
          {point.rallyLength && point.rallyLength > 8 && (
            <span className="rally-badge">
              <Fire size={12} weight="fill" />
              {point.rallyLength}
            </span>
          )}
        </div>
      </motion.div>
    </>
  );
}

/**
 * Game Group - raggruppa punti per game
 */
function GameGroup({ game, points, homeName, awayName, isExpanded, onToggle }) {
  // Server: usa gameServer dal backend (SofaScore) se disponibile, altrimenti calcola
  const firstPoint = points[0];
  const server = firstPoint?.gameServer || 
                 (firstPoint?.server !== 'unknown' ? firstPoint?.server : calculateServer(firstPoint, firstPoint?.set || 1));
  
  // Calcola statistiche del game
  const hasBreakPoint = points.some(p => getPointImportance(p, server) === 'breakpoint');
  const hasSetPoint = points.some(p => p.isSetPoint);
  const hasMatchPoint = points.some(p => p.isMatchPoint);
  const aces = points.filter(p => getPointImportance(p, server) === 'ace').length;
  const dfs = points.filter(p => getPointImportance(p, server) === 'doublefault').length;
  
  // BREAK detection:
  // 1. Se abbiamo gameIsBreak dal backend (SofaScore), usa quello (più affidabile)
  // 2. Altrimenti calcola: chi ha vinto il game (ultimo punto) !== chi serviva
  const gameIsBreakFromBackend = firstPoint?.gameIsBreak;
  const gameWinner = firstPoint?.gameWinner || points[points.length - 1]?.pointWinner;
  const isBreak = gameIsBreakFromBackend !== undefined 
    ? gameIsBreakFromBackend 
    : (gameWinner && gameWinner !== server);
  
  const gameClass = `game-group ${hasBreakPoint ? 'game-group--bp' : ''} ${hasSetPoint ? 'game-group--sp' : ''} ${hasMatchPoint ? 'game-group--mp' : ''} ${isBreak ? 'game-group--break' : ''}`;
  
  return (
    <div className={gameClass}>
      <button className="game-group__header" onClick={onToggle}>
        <div className="game-group__info">
          <span className="game-group__set-game">
            S{points[0]?.set || 1} G{game}
          </span>
          <ServerIndicator server={server} homeName={homeName} awayName={awayName} />
        </div>
        
        <div className="game-group__badges">
          {isBreak && (
            <span className="break-badge">
              <Crosshair size={14} weight="bold" />
              BREAK
            </span>
          )}
          {hasMatchPoint && <PointBadge type="matchpoint" />}
          {hasSetPoint && !hasMatchPoint && <PointBadge type="setpoint" />}
          {hasBreakPoint && !hasSetPoint && !hasMatchPoint && <PointBadge type="breakpoint" />}
          {aces > 0 && (
            <span className="stat-badge ace">
              <Lightning size={12} weight="bold" /> {aces}
            </span>
          )}
          {dfs > 0 && (
            <span className="stat-badge df">
              <X size={12} weight="bold" /> {dfs}
            </span>
          )}
        </div>
        
        <div className="game-group__result">
          {gameWinner && (
            <span className={`winner-indicator ${gameWinner === 'home' ? 'home' : 'away'}`}>
              <SealCheck size={16} weight="fill" />
            </span>
          )}
          <span className="points-count">{points.length} pts</span>
          <motion.span 
            className="expand-icon"
            animate={{ rotate: isExpanded ? 180 : 0 }}
          >
            <CaretDown size={14} weight="bold" />
          </motion.span>
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            className="game-group__points"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {points.map((point, idx) => (
              <PointRow 
                key={idx} 
                point={point} 
                homeName={homeName} 
                awayName={awayName}
                isFirst={idx === 0}
                showGameHeader={false}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * PointByPointTab Component
 */
export function PointByPointTab({ data, header }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedGames, setExpandedGames] = useState(new Set());
  const players = header?.players || {};
  const homeName = players.home?.name || 'Player 1';
  const awayName = players.away?.name || 'Player 2';

  // Leggi punti dal bundle
  const points = data?.points || [];
  const total = data?.total || 0;
  const source = data?.source || 'unknown';

  // Calcola server per tutti i punti e arricchisci i dati
  const enrichedPoints = useMemo(() => {
    return points.map(p => {
      const server = p.gameServer || (p.server !== 'unknown' ? p.server : calculateServer(p, p.set || 1));
      const importance = getPointImportance(p, server);
      return { ...p, server, importance };
    });
  }, [points]);

  // Raggruppa per set/game PRIMA di filtrare (per contare i break games)
  const allGroupedByGame = useMemo(() => {
    const groups = {};
    enrichedPoints.forEach(p => {
      const key = `${p.set}-${p.game}`;
      if (!groups[key]) {
        groups[key] = { set: p.set, game: p.game, points: [], key };
      }
      groups[key].points.push(p);
    });
    return Object.values(groups);
  }, [enrichedPoints]);

  // Calcola quali game sono break
  const breakGames = useMemo(() => {
    return allGroupedByGame.filter(group => {
      const firstPoint = group.points[0];
      const server = firstPoint?.gameServer || firstPoint?.server;
      const gameIsBreakFromBackend = firstPoint?.gameIsBreak;
      const gameWinner = firstPoint?.gameWinner || group.points[group.points.length - 1]?.pointWinner;
      return gameIsBreakFromBackend !== undefined 
        ? gameIsBreakFromBackend 
        : (gameWinner && gameWinner !== server);
    });
  }, [allGroupedByGame]);

  // Conta per filtri
  const filterCounts = useMemo(() => ({
    all: enrichedPoints.length,
    breakgames: breakGames.length, // Numero di BREAK (game vinti da chi riceve)
    break: enrichedPoints.filter(p => p.importance === 'breakpoint').length,
    setpoint: enrichedPoints.filter(p => p.isSetPoint).length,
    matchpoint: enrichedPoints.filter(p => p.isMatchPoint).length,
    ace: enrichedPoints.filter(p => p.importance === 'ace').length,
    df: enrichedPoints.filter(p => p.importance === 'doublefault').length,
  }), [enrichedPoints, breakGames]);

  // Filtra - per breakgames filtriamo i gruppi, non i punti
  const filteredPoints = useMemo(() => {
    if (activeFilter === 'all') return enrichedPoints;
    if (activeFilter === 'breakgames') {
      // Per breakgames, restituisci tutti i punti dei game che sono break
      const breakKeys = new Set(breakGames.map(g => g.key));
      return enrichedPoints.filter(p => breakKeys.has(`${p.set}-${p.game}`));
    }
    if (activeFilter === 'break') return enrichedPoints.filter(p => p.importance === 'breakpoint');
    if (activeFilter === 'setpoint') return enrichedPoints.filter(p => p.isSetPoint);
    if (activeFilter === 'matchpoint') return enrichedPoints.filter(p => p.isMatchPoint);
    if (activeFilter === 'ace') return enrichedPoints.filter(p => p.importance === 'ace');
    if (activeFilter === 'df') return enrichedPoints.filter(p => p.importance === 'doublefault');
    return enrichedPoints;
  }, [enrichedPoints, activeFilter, breakGames]);

  // Raggruppa per set/game (dopo filtro)
  const groupedByGame = useMemo(() => {
    const groups = {};
    filteredPoints.forEach(p => {
      const key = `${p.set}-${p.game}`;
      if (!groups[key]) {
        groups[key] = { set: p.set, game: p.game, points: [] };
      }
      groups[key].points.push(p);
    });
    return Object.values(groups);
  }, [filteredPoints]);

  const toggleGame = (key) => {
    setExpandedGames(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGames(new Set(groupedByGame.map(g => `${g.set}-${g.game}`)));
  };

  const collapseAll = () => {
    setExpandedGames(new Set());
  };

  return (
    <motion.div
      className="pbp-tab"
      variants={fadeUp}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="pbp-tab__header">
        <div className="pbp-tab__title">
          <ListBullets size={24} weight="duotone" />
          <h2>Point by Point</h2>
          <span className="pbp-tab__count">{total} points</span>
        </div>
        <div className="pbp-tab__actions">
          <button className="action-btn" onClick={expandAll}>Expand All</button>
          <button className="action-btn" onClick={collapseAll}>Collapse All</button>
        </div>
      </div>

      {/* Players Legend */}
      <div className="pbp-tab__legend">
        <div className="legend-item home">
          <TennisBall size={14} weight="fill" />
          <span>{homeName}</span>
        </div>
        <div className="legend-item away">
          <TennisBall size={14} weight="fill" />
          <span>{awayName}</span>
        </div>
        <span className="legend-source">Source: {source}</span>
      </div>

      {/* Filters */}
      <div className="pbp-tab__filters">
        {FILTERS.map((filter) => {
          const Icon = filter.icon;
          const count = filterCounts[filter.id] || 0;
          const isActive = activeFilter === filter.id;
          const isDisabled = count === 0 && filter.id !== 'all';
          
          return (
            <button
              key={filter.id}
              className={`filter-chip ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && setActiveFilter(filter.id)}
              disabled={isDisabled}
              style={isActive && filter.color ? { 
                borderColor: filter.color,
                backgroundColor: `${filter.color}15`
              } : {}}
            >
              <Icon size={14} weight={isActive ? 'fill' : 'regular'} style={filter.color ? { color: filter.color } : {}} />
              <span>{filter.label}</span>
              <span className="filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Games List */}
      <MotionCard className="pbp-card">
        {groupedByGame.length === 0 ? (
          <div className="no-points">
            <Funnel size={48} weight="duotone" />
            <h3>No data available</h3>
            <p>{total === 0 ? 'Point-by-point data is not available for this match' : 'No points match the selected filter'}</p>
          </div>
        ) : (
          <div className="games-list">
            {groupedByGame.map((group) => {
              const key = `${group.set}-${group.game}`;
              return (
                <GameGroup
                  key={key}
                  game={group.game}
                  points={group.points}
                  homeName={homeName}
                  awayName={awayName}
                  isExpanded={expandedGames.has(key)}
                  onToggle={() => toggleGame(key)}
                />
              );
            })}
          </div>
        )}
      </MotionCard>
    </motion.div>
  );
}

export default PointByPointTab;
