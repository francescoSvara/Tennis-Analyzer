import React, { useState, useMemo } from 'react';
import GameBlock from './GameBlock';
import { Fire, X, Circle } from '@phosphor-icons/react';

// Calcola statistiche aggregate per il set
const calculateSetStats = (games) => {
  if (!games || games.length === 0) return null;
  
  let totalAces = 0, totalDF = 0, totalBP = 0, breakGames = 0;
  let homeBreaks = 0, awayBreaks = 0;
  
  games.forEach(game => {
    if (!game.points) return;
    
    game.points.forEach(p => {
      // Assicurati che desc sia sempre una stringa
      const desc = String(p.pointDescription || '').toLowerCase();
      if (desc.includes('ace') || p.homePointType === 'ace' || p.awayPointType === 'ace') totalAces++;
      if (desc.includes('double fault') || desc.includes('doppio fallo')) totalDF++;
    });
    
    // Conta breaks
    if (game.breakOccurred) {
      breakGames++;
      const serving = game.score?.serving || game.serving;
      const scoring = game.score?.scoring;
      if (serving === 1 || serving === 'home') awayBreaks++;
      else if (serving === 2 || serving === 'away') homeBreaks++;
    }
  });
  
  return { totalAces, totalDF, totalBP, breakGames, homeBreaks, awayBreaks };
};

export default function SetBlock({ set, getValueForSetGame, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Calcola statistiche del set
  const setStats = useMemo(() => calculateSetStats(set.games), [set.games]);
  
  // Calcola il punteggio del set - prende l'ultimo game score che rappresenta il totale games vinti
  const getSetScore = () => {
    if (!set.games || set.games.length === 0) return null;
    
    // L'ultimo game ha il punteggio finale del set (games vinti)
    const lastGame = set.games[set.games.length - 1];
    if (lastGame && lastGame.score) {
      const score = lastGame.score;
      if (typeof score === 'object' && score.homeScore !== undefined && score.awayScore !== undefined) {
        return { home: score.homeScore, away: score.awayScore };
      }
    }
    return null;
  };
  
  // Conta i punti totali nel set
  const getTotalPoints = () => {
    if (!set.games) return 0;
    return set.games.reduce((total, game) => {
      return total + (game.points?.length || 0);
    }, 0);
  };
  
  const setScore = getSetScore();
  const gamesCount = set.games?.length || 0;
  const totalPoints = getTotalPoints();
  
  // Determina se il set è stato vinto e da chi
  const setWinner = setScore ? (setScore.home > setScore.away ? 'home' : setScore.away > setScore.home ? 'away' : null) : null;

  return (
    <div className={`set ${isExpanded ? 'set-expanded' : 'set-collapsed'}`}>
      <div 
        className="set-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="set-header-left">
          <span className={`set-chevron ${isExpanded ? 'set-chevron-open' : ''}`}>
            ▶
          </span>
          <h2>Set {set.set}</h2>
          {setWinner && (
            <span className={`set-winner-badge ${setWinner}`}>
              <Circle size={12} weight="fill" style={{ color: setWinner === 'home' ? '#3b82f6' : '#ef4444' }} /> {setWinner === 'home' ? 'H' : 'A'}
            </span>
          )}
        </div>
        <div className="set-header-right">
          {/* Mini stats del set */}
          {setStats && (setStats.totalAces > 0 || setStats.breakGames > 0) && (
            <div className="set-stats-mini">
              {setStats.totalAces > 0 && <span className="set-stat ace"><Fire size={12} weight="duotone" />{setStats.totalAces}</span>}
              {setStats.breakGames > 0 && <span className="set-stat break"><Circle size={12} weight="fill" style={{ color: '#ef4444' }} />{setStats.breakGames}</span>}
            </div>
          )}
          
          {setScore && (
            <span className="set-score-badge">
              <span className={setScore.home > setScore.away ? 'score-winner' : ''}>{setScore.home}</span>
              <span className="score-separator">-</span>
              <span className={setScore.away > setScore.home ? 'score-winner' : ''}>{setScore.away}</span>
            </span>
          )}
          <span className="set-games-count">
            {gamesCount} games • {totalPoints} pt
          </span>
        </div>
      </div>
      
      <div className={`set-content ${isExpanded ? 'set-content-visible' : 'set-content-hidden'}`}>
        {/* Stats completi del set quando espanso */}
        {isExpanded && setStats && (setStats.totalAces > 0 || setStats.totalDF > 0 || setStats.breakGames > 0) && (
          <div className="set-stats-expanded">
            <div className="set-stat-item">
              <span className="stat-icon"><Fire size={14} weight="duotone" /></span>
              <span className="stat-label">Ace</span>
              <span className="stat-value">{setStats.totalAces}</span>
            </div>
            <div className="set-stat-item">
              <span className="stat-icon"><X size={14} weight="bold" /></span>
              <span className="stat-label">DF</span>
              <span className="stat-value">{setStats.totalDF}</span>
            </div>
            <div className="set-stat-item">
              <span className="stat-icon"><Circle size={14} weight="fill" style={{ color: '#ef4444' }} /></span>
              <span className="stat-label">Break</span>
              <span className="stat-value">{setStats.breakGames}</span>
            </div>
            {setStats.homeBreaks > 0 && (
              <div className="set-stat-item home">
                <span className="stat-label">H Break</span>
                <span className="stat-value">{setStats.homeBreaks}</span>
              </div>
            )}
            {setStats.awayBreaks > 0 && (
              <div className="set-stat-item away">
                <span className="stat-label">A Break</span>
                <span className="stat-value">{setStats.awayBreaks}</span>
              </div>
            )}
          </div>
        )}
        
        {Array.isArray(set.games) && set.games.length ? (
          set.games.map((g) => (
            <GameBlock
              key={g.game}
              game={g}
              setNumber={set.set}
              getValueForSetGame={getValueForSetGame}
            />
          ))
        ) : (
          <p className="no-games">Nessun game disponibile</p>
        )}
      </div>
    </div>
  );
}
