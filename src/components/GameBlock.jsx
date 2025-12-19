import React, { useState } from 'react';
import PointRow from './PointRow';
import { countPointDescriptions, interpretGameValue, getStatusColor, getZoneIcon } from '../utils';

export default function GameBlock({ game, setNumber, getValueForSetGame, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const value = getValueForSetGame ? getValueForSetGame(setNumber, game.game) : null;
  const summary = Array.isArray(game.points) ? countPointDescriptions(game.points) : '';
  const pointsCount = game.points?.length || 0;

  // Interpreta il value se disponibile
  const interpretation = value != null ? interpretGameValue({ 
    value, 
    serving: game.serving || 'home',
    scoring: game.scoring,
    breakOccurred: game.breakOccurred
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

  const gameScore = getGameScore();

  return (
    <div className={`game ${isExpanded ? 'game-expanded' : 'game-collapsed'}`}>
      <div 
        className="game-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="game-header-left">
          <span className={`game-chevron ${isExpanded ? 'game-chevron-open' : ''}`}>
            ▶
          </span>
          <div className="game-title">Game {game.game}</div>
          {gameScore && <span className="game-score-mini">{gameScore}</span>}
          <span className="game-points-count">{pointsCount} pt</span>
        </div>
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
      
      <div className={`game-content ${isExpanded ? 'game-content-visible' : 'game-content-hidden'}`}>
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
