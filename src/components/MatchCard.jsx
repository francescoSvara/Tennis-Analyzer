import React from 'react';

// Formatta la data del match
function formatDate(timestamp, fileDate) {
  let date;
  if (timestamp) {
    date = new Date(timestamp * 1000);
  } else if (fileDate) {
    date = new Date(fileDate);
  } else {
    return 'N/A';
  }
  
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Se è nel futuro
  if (diffMs < 0) {
    const futureDays = Math.abs(diffDays);
    if (futureDays === 0) return 'Oggi';
    if (futureDays === 1) return 'Domani';
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  }
  
  // Passato
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 7) return `${diffDays}g fa`;
  
  return date.toLocaleDateString('it-IT', { 
    day: '2-digit', 
    month: 'short'
  });
}

// Badge di stato
function getStatusBadge(status) {
  // Handle status as object (from SofaScore API) or string
  const statusType = typeof status === 'object' && status !== null
    ? (status.type || status.description || 'unknown')
    : (status || 'unknown');
  
  const statusStr = String(statusType).toLowerCase();
  
  const statusMap = {
    'notstarted': { label: 'Scheduled', color: '#6b7280', pulse: false },
    'inprogress': { label: '● LIVE', color: '#ef4444', pulse: true },
    'finished': { label: 'Finished', color: '#10b981', pulse: false },
    'canceled': { label: 'Canceled', color: '#f59e0b', pulse: false },
    'postponed': { label: 'Postponed', color: '#f59e0b', pulse: false },
    'interrupted': { label: 'Interrupted', color: '#f97316', pulse: false },
  };
  return statusMap[statusStr] || { label: statusType || 'Unknown', color: '#6b7280', pulse: false };
}

// Codice paese a emoji bandiera
function countryToFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function MatchCard({ match, onClick, isSuggested = false, isDetected = false, onAddToDb, dataCompleteness = null }) {
  if (!match) return null;
  
  const statusBadge = getStatusBadge(match.status);
  const homeTeam = match.homeTeam || {};
  const awayTeam = match.awayTeam || {};
  
  // Card suggerita o rilevata: stile diverso e non cliccabile
  const cardClass = isDetected 
    ? 'match-card detected-card'
    : isSuggested 
      ? 'match-card suggested-card' 
      : 'match-card';
  
  const handleClick = () => {
    if (!isSuggested && !isDetected && onClick) {
      onClick(match);
    }
  };
  
  // Determina il colore della barra di completezza
  const getCompletenessColor = (percentage) => {
    if (percentage >= 100) return '#10b981'; // Verde al 100%
    if (percentage >= 70) return '#f59e0b';  // Arancione
    if (percentage >= 40) return '#3b82f6';  // Blu
    return '#6b7280'; // Grigio
  };
  
  return (
    <div className={cardClass} onClick={handleClick}>
      {/* Badge per card suggerite */}
      {isSuggested && !isDetected && (
        <div className="suggested-badge">
          <span className="suggested-icon">📥</span>
          <span className="suggested-text">Da aggiungere</span>
        </div>
      )}
      
      {/* Header: Categoria e Data */}
      <div className="match-card-header">
        <span className="match-category">
          {match.category || match.sport || 'Tennis'}
        </span>
        <span className="match-date">
          {formatDate(match.startTimestamp, match.fileDate)}
        </span>
      </div>
      
      {/* Round info per detected */}
      {isDetected && match.round && (
        <div className="match-round">
          {match.round}
        </div>
      )}
      
      {/* Torneo - nascosto per detected (già nel gruppo) */}
      {!isDetected && (
        <div className="match-tournament">
          {match.tournament || 'Unknown Tournament'}
        </div>
      )}
      
      {/* Teams/Players */}
      <div className="match-teams">
        <div className="team home">
          <span className="team-flag">
            {countryToFlag(homeTeam.country)}
          </span>
          <span className="team-name">
            {homeTeam.shortName || homeTeam.name || 'Player 1'}
          </span>
          {homeTeam.ranking && (
            <span className="team-ranking">#{homeTeam.ranking}</span>
          )}
        </div>
        
        <div className="vs-container">
          <span className="vs">VS</span>
        </div>
        
        <div className="team away">
          <span className="team-flag">
            {countryToFlag(awayTeam.country)}
          </span>
          <span className="team-name">
            {awayTeam.shortName || awayTeam.name || 'Player 2'}
          </span>
          {awayTeam.ranking && (
            <span className="team-ranking">#{awayTeam.ranking}</span>
          )}
        </div>
      </div>
      
      {/* Barra completezza dati - solo per card normali (non suggerite) */}
      {!isSuggested && dataCompleteness !== null && (
        <div className="match-data-completeness">
          <div className="completeness-info">
            <span className="completeness-icon">📊</span>
            <span 
              className={`completeness-value ${dataCompleteness >= 100 ? 'complete' : ''}`}
              style={{ color: getCompletenessColor(dataCompleteness) }}
            >
              {dataCompleteness}%
            </span>
          </div>
          <div className="completeness-bar-mini">
            <div 
              className="completeness-fill-mini"
              style={{ 
                width: `${Math.min(dataCompleteness, 100)}%`,
                backgroundColor: getCompletenessColor(dataCompleteness)
              }}
            />
          </div>
        </div>
      )}
      
      {/* Footer: Status o Pulsante Aggiungi */}
      <div className="match-card-footer">
        {isDetected ? (
          // Footer per card rilevate - solo icona viola
          <div className="detected-indicator">
            <span className="detected-icon">📡</span>
            <span>Rilevata</span>
          </div>
        ) : isSuggested ? (
          <button 
            className="add-to-db-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddToDb && onAddToDb();
            }}
          >
            ➕ Aggiungi al Database
          </button>
        ) : (
          <>
            <span 
              className={`match-status ${statusBadge.pulse ? 'pulse' : ''}`}
              style={{ backgroundColor: statusBadge.color }}
            >
              {statusBadge.label}
            </span>
            {match.eventId && (
              <span className="match-id">ID: {match.eventId}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MatchCard;