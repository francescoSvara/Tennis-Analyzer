import React, { useState, useMemo } from 'react';
import PointRow from './PointRow';
import { countPointDescriptions, interpretGameValue, getStatusColor, getZoneIcon } from '../utils';
import { 
  TennisBall, 
  Fire, 
  X, 
  Target,
  Lightning,
  Barbell,
  CaretRight,
  Circle
} from '@phosphor-icons/react';

// Calcola statistiche avanzate del game
const calculateGameStats = (points) => {
  if (!points || points.length === 0) return null;
  
  let aces = 0, doubleFaults = 0, winners = 0, unforcedErrors = 0;
  let homePointsWon = 0, awayPointsWon = 0;
  let breakPoints = 0, breakPointsSaved = 0;
  
  points.forEach(p => {
    // Conta tipi di punto - assicurati che desc sia sempre una stringa
    const desc = String(p.pointDescription || '').toLowerCase();
    if (desc.includes('ace') || p.homePointType === 'ace' || p.awayPointType === 'ace') aces++;
    if (desc.includes('double fault') || desc.includes('doppio fallo') || 
        p.homePointType === 'double_fault' || p.awayPointType === 'double_fault') doubleFaults++;
    if (desc.includes('winner') || p.homePointType === 'winner' || p.awayPointType === 'winner') winners++;
    if (desc.includes('unforced') || p.homePointType === 'unforced' || p.awayPointType === 'unforced') unforcedErrors++;
    
    // Conta punti vinti
    if (p.homePointType === 1 || p.homePointType === 3) homePointsWon++;
    if (p.awayPointType === 1 || p.awayPointType === 3) awayPointsWon++;
    
    // Identifica break points (40-X o Deuce/Vantaggio)
    if ((p.awayPoint === '40' && p.homePoint !== '40') || p.awayPoint === 'A') {
      breakPoints++;
    }
  });
  
  return {
    aces,
    doubleFaults,
    winners,
    unforcedErrors,
    homePointsWon,
    awayPointsWon,
    breakPoints,
    totalPoints: points.length
  };
};

// Determina se c'è stato un break nel game
const detectBreak = (game) => {
  if (game.breakOccurred) return true;
  if (!game.score || !game.points) return false;
  
  // Il serving è chi serve, se il punteggio finale favorisce l'altro = break
  const serving = game.score?.serving || game.serving;
  const scoring = game.score?.scoring;
  
  // Se chi ha vinto (scoring) è diverso da chi serviva = break
  if (serving && scoring && serving !== scoring) {
    return true;
  }
  
  return false;
};

// Calcola la "pressione" nel game (0-100)
const calculateGamePressure = (points, value) => {
  if (!points || points.length === 0) return 0;
  
  let pressure = 0;
  const lastPoints = points.slice(-3);
  
  // Deuce aumenta pressione
  const deuces = points.filter(p => p.homePoint === '40' && p.awayPoint === '40').length;
  pressure += deuces * 15;
  
  // Break points aumentano pressione
  const bpCount = points.filter(p => 
    (p.awayPoint === '40' && p.homePoint !== '40' && p.homePoint !== 'A') || 
    p.awayPoint === 'A'
  ).length;
  pressure += bpCount * 20;
  
  // Valore alto (momentum) indica pressione su un giocatore
  if (value != null) {
    pressure += Math.abs(value) / 2;
  }
  
  // Game lunghi = più pressione
  if (points.length > 6) pressure += (points.length - 6) * 3;
  
  return Math.min(100, Math.round(pressure));
};

export default function GameBlock({ game, setNumber, getValueForSetGame, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const value = getValueForSetGame ? getValueForSetGame(setNumber, game.game) : null;
  const summary = Array.isArray(game.points) ? countPointDescriptions(game.points) : '';
  const pointsCount = game.points?.length || 0;
  
  // Calcoli avanzati
  const gameStats = useMemo(() => calculateGameStats(game.points), [game.points]);
  const isBreak = useMemo(() => detectBreak(game), [game]);
  const pressure = useMemo(() => calculateGamePressure(game.points, value), [game.points, value]);

  // Interpreta il value se disponibile
  const interpretation = value != null ? interpretGameValue({ 
    value, 
    serving: game.serving || 'home',
    scoring: game.scoring,
    breakOccurred: game.breakOccurred || isBreak
  }) : null;

  // Formatta il punteggio del game
  const getGameScore = () => {
    if (game.score) {
      if (typeof game.score === 'string') return game.score;
      if (typeof game.score === 'object' && game.score.homeScore !== undefined) {
        return `${game.score.homeScore} - ${game.score.awayScore}`;
      }
    }
    return null;
  };

  // Determina chi serve
  const getServingPlayer = () => {
    const serving = game.score?.serving || game.serving;
    if (serving === 1 || serving === 'home') return 'home';
    if (serving === 2 || serving === 'away') return 'away';
    return null;
  };

  const gameScore = getGameScore();
  const servingPlayer = getServingPlayer();
  
  // Determina se è un tiebreak
  const isTiebreak = game.game === 13 || game.isTiebreak || (game.points && game.points.length > 12);

  return (
    <div className={`game ${isExpanded ? 'game-expanded' : 'game-collapsed'} ${isBreak ? 'game-break' : ''} ${servingPlayer ? `game-serve-${servingPlayer}` : ''} ${isTiebreak ? 'game-tiebreak' : ''}`}>
      <div 
        className="game-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="game-header-left">
          <span className={`game-chevron ${isExpanded ? 'game-chevron-open' : ''}`}>
            ▶
          </span>
          <div className="game-title">
            Game {game.game}
            {servingPlayer && (
              <span className={`serving-indicator ${servingPlayer}`} title={`${servingPlayer === 'home' ? 'Home' : 'Away'} al servizio`}>
                <TennisBall size={14} weight="duotone" />
              </span>
            )}
          </div>
          {gameScore && <span className="game-score-mini">{gameScore}</span>}
          <span className="game-points-count">{pointsCount} pt</span>
          
          {/* Badge speciali del game */}
          {isBreak && (
            <span className="game-badge break-badge" title="Break!">
              <Circle size={10} weight="fill" style={{ color: '#ef4444', marginRight: 4 }} /> BREAK
            </span>
          )}
          {gameStats?.aces > 0 && (
            <span className="game-badge ace-badge" title={`${gameStats.aces} Ace`}>
              <Fire size={14} weight="duotone" color="#f59e0b" /> {gameStats.aces}
            </span>
          )}
          {gameStats?.doubleFaults > 0 && (
            <span className="game-badge df-badge" title={`${gameStats.doubleFaults} Doppi Falli`}>
              <X size={14} weight="bold" color="#ef4444" /> {gameStats.doubleFaults}
            </span>
          )}
        </div>
        
        <div className="game-header-right">
          {/* Barra pressione */}
          {pressure > 20 && (
            <div className="pressure-mini" title={`Pressione: ${pressure}%`}>
              <div className="pressure-mini-bar" style={{ 
                width: `${pressure}%`,
                backgroundColor: pressure > 70 ? '#ef4444' : pressure > 40 ? '#f59e0b' : '#3b82f6'
              }} />
              <span className="pressure-mini-label">
                {pressure > 70 ? <Fire size={12} weight="fill" color="#ef4444" /> : 
                 pressure > 40 ? <Lightning size={12} weight="fill" color="#f59e0b" /> : 
                 <Barbell size={12} weight="fill" color="#3b82f6" />}
              </span>
            </div>
          )}
          
          {value != null && (
            <div className="value-container">
              <div 
                className={`value-display value-${interpretation?.zone || 'neutral'}`}
                style={{ 
                  borderColor: getStatusColor(interpretation?.status),
                  backgroundColor: `${getStatusColor(interpretation?.status)}15`
                }}
              >
                <span className="value-icon">{getZoneIcon(interpretation?.zone)}</span>
                <span className="value-number">{value}</span>
              </div>
              {interpretation && (
                <div 
                  className="value-interpretation"
                  style={{ color: getStatusColor(interpretation.status) }}
                >
                  {interpretation.messageIt}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className={`game-content ${isExpanded ? 'game-content-visible' : 'game-content-hidden'}`}>
        {/* Stats mini del game */}
        {gameStats && (gameStats.aces > 0 || gameStats.doubleFaults > 0 || gameStats.winners > 0 || gameStats.breakPoints > 0) && (
          <div className="game-stats-mini">
            {gameStats.aces > 0 && <span className="stat-item ace"><Fire size={14} weight="duotone" /> {gameStats.aces} Ace</span>}
            {gameStats.doubleFaults > 0 && <span className="stat-item df"><X size={14} weight="bold" /> {gameStats.doubleFaults} DF</span>}
            {gameStats.winners > 0 && <span className="stat-item winner"><Lightning size={14} weight="duotone" /> {gameStats.winners} Winner</span>}
            {gameStats.breakPoints > 0 && <span className="stat-item bp"><Target size={14} weight="duotone" /> {gameStats.breakPoints} BP</span>}
          </div>
        )}
        
        <div className="points-list">
          {Array.isArray(game.points) && game.points.length ? (
            game.points.map((p, idx) => <PointRow key={idx} point={p} index={idx} />)
          ) : (
            <div className="no-points">Nessun punto</div>
          )}
        </div>
        {summary && <div className="score">Riepilogo: {summary}</div>}
      </div>
    </div>
  );
}
