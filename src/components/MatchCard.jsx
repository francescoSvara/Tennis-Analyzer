import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  DownloadSimple, 
  ChartBar, 
  Broadcast, 
  PlusCircle,
  MapPin,
  Calendar,
  Trophy,
  User,
  ArrowRight,
  Circle,
  FlagBanner
} from '@phosphor-icons/react';
import { getTournamentLogo, getSuggestedFileName } from '../utils/tournamentLogos';
import { durations, easings } from '../motion/tokens';

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
    'inprogress': { label: <><Circle size={8} weight="fill" style={{ color: '#ef4444', marginRight: 4 }} /> LIVE</>, color: '#ef4444', pulse: true },
    'finished': { label: 'Finished', color: '#10b981', pulse: false },
    'canceled': { label: 'Canceled', color: '#f59e0b', pulse: false },
    'postponed': { label: 'Postponed', color: '#f59e0b', pulse: false },
    'interrupted': { label: 'Interrupted', color: '#f97316', pulse: false },
  };
  return statusMap[statusStr] || { label: statusType || 'Unknown', color: '#6b7280', pulse: false };
}

// Codice paese a emoji bandiera - mantengo emoji per le bandiere (standard Unicode)
function countryToFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return <FlagBanner size={14} weight="duotone" />;
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Componente per visualizzare il torneo con logo
function TournamentWithLogo({ tournament, category }) {
  const [logoError, setLogoError] = useState(false);
  const logoPath = getTournamentLogo(tournament, category);
  
  // Se non c'è logo o c'è stato errore, mostra solo il testo
  // In console logga il nome file suggerito per debug
  if (!logoPath || logoError) {
    // Debug: mostra in console come dovrebbe chiamarsi il file
    if (tournament && !logoPath) {
      console.debug(`[Logo mancante] Torneo: "${tournament}" → Rinomina il logo come: "${getSuggestedFileName(tournament)}" e salvalo in public/logos/tournaments/`);
    }
    return (
      <div className="match-tournament">
        {tournament || 'Unknown Tournament'}
      </div>
    );
  }
  
  return (
    <div className="match-tournament with-logo">
      <img 
        src={logoPath} 
        alt={`${tournament} logo`}
        className="tournament-logo"
        onError={() => setLogoError(true)}
      />
      <span className="tournament-name">{tournament || 'Unknown Tournament'}</span>
    </div>
  );
}

function MatchCard({ match, onClick, isSuggested = false, isDetected = false, onAddToDb, dataCompleteness = null, dataSources = null }) {
  const prefersReducedMotion = useReducedMotion();
  
  if (!match) return null;
  
  const statusBadge = getStatusBadge(match.status);
  const homeTeam = match.homeTeam || {};
  const awayTeam = match.awayTeam || {};
  
  // Determina se è un match xlsx (storico)
  const isXlsxMatch = match.dataSource === 'xlsx_import';
  const isMergedMatch = match.dataSource === 'merged_sofascore_xlsx';
  
  // Ottieni dataSources dal match se non passato come prop
  const sources = dataSources || match.dataSources || { sofascore: 50, xlsx: 50, hasBothSources: false };
  
  // Card suggerita o rilevata: stile diverso e non cliccabile
  const cardClass = isDetected 
    ? 'match-card detected-card'
    : isSuggested 
      ? 'match-card suggested-card' 
      : isXlsxMatch
        ? 'match-card xlsx-card'
        : 'match-card';
  
  const handleClick = () => {
    if (!isSuggested && !isDetected && onClick) {
      onClick(match);
    }
  };
  
  // Configurazione animazioni
  const hoverAnimation = !prefersReducedMotion && !isSuggested && !isDetected ? {
    whileHover: { 
      y: -4, 
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
    },
    whileTap: { scale: 0.99 },
  } : {};
  
  return (
    <motion.div 
      className={cardClass} 
      onClick={handleClick}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      transition={{
        duration: durations.normal,
        ease: easings.premium,
      }}
      {...hoverAnimation}
    >
      {/* Badge per card suggerite */}
      {isSuggested && !isDetected && (
        <div className="suggested-badge">
          <DownloadSimple size={14} weight="bold" className="suggested-icon" />
          <span className="suggested-text">Da aggiungere</span>
        </div>
      )}
      
      {/* Badge per match xlsx (storici) */}
      {isXlsxMatch && !isSuggested && !isDetected && (
        <div className="xlsx-badge">
          <ChartBar size={14} weight="duotone" className="xlsx-icon" />
          <span className="xlsx-text">Storico</span>
        </div>
      )}
      
      {/* Header: Superficie/Categoria e Data */}
      <div className="match-card-header">
        <span className="match-category">
          <MapPin size={12} weight="bold" style={{ marginRight: 4, opacity: 0.7 }} />
          {match.surface ? match.surface : (match.category || match.sport || 'Tennis')}
        </span>
        <span className="match-date">
          <Calendar size={12} weight="bold" style={{ marginRight: 4, opacity: 0.7 }} />
          {formatDate(match.startTimestamp, match.fileDate)}
        </span>
      </div>
      
      {/* Round info per detected */}
      {isDetected && match.round && (
        <div className="match-round">
          <Trophy size={12} weight="duotone" style={{ marginRight: 4 }} />
          {match.round}
        </div>
      )}
      
      {/* Torneo con Logo - nascosto per detected (già nel gruppo) */}
      {!isDetected && (
        <TournamentWithLogo 
          tournament={match.tournament} 
          category={match.category}
        />
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
      
      {/* Barra fonti dati - mostra proporzione Sofascore (blu) vs XLSX (verde) */}
      {!isSuggested && !isDetected && sources && (
        <div className="match-data-sources">
          <div 
            className="data-sources-bar"
            title={`Sofascore: ${sources.sofascore}% | XLSX: ${sources.xlsx}%`}
          >
            {sources.sofascore > 0 && (
              <div 
                className="source-fill sofascore"
                style={{ width: `${sources.sofascore}%` }}
              />
            )}
            {sources.xlsx > 0 && (
              <div 
                className="source-fill xlsx"
                style={{ width: `${sources.xlsx}%` }}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Footer: Status o Pulsante Aggiungi */}
      <div className="match-card-footer">
        {isDetected ? (
          // Footer per card rilevate - solo icona viola
          <div className="detected-indicator">
            <Broadcast size={16} weight="fill" className="detected-icon" />
            <span>Rilevata</span>
          </div>
        ) : isSuggested ? (
          <motion.button 
            className="add-to-db-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddToDb && onAddToDb();
            }}
            whileHover={!prefersReducedMotion ? { scale: 1.02 } : {}}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: durations.fast, ease: easings.premium }}
          >
            <PlusCircle size={16} weight="bold" style={{ marginRight: 6 }} />
            Aggiungi al Database
          </motion.button>
        ) : (
          <span 
            className={`match-status ${statusBadge.pulse ? 'pulse' : ''}`}
            style={{ backgroundColor: statusBadge.color }}
          >
            {statusBadge.label}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default MatchCard;