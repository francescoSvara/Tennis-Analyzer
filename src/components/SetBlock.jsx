import React, { useState } from 'react';
import GameBlock from './GameBlock';

export default function SetBlock({ set, getValueForSetGame, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
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
        </div>
        <div className="set-header-right">
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
