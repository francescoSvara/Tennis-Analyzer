import React, { useState, useMemo, useEffect, useCallback } from 'react';
import MatchCard from './MatchCard';

// Skeleton card per loading
function SkeletonCard() {
  return (
    <div className="match-card skeleton">
      <div className="skeleton-line short"></div>
      <div className="skeleton-line medium"></div>
      <div className="skeleton-line long"></div>
      <div className="skeleton-line long"></div>
      <div className="skeleton-line short"></div>
    </div>
  );
}

// Hook per aggiornare le date a mezzanotte
function useMidnightRefresh(callback) {
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Timer per la prossima mezzanotte
    const midnightTimer = setTimeout(() => {
      callback();
      // Dopo la prima mezzanotte, imposta intervallo giornaliero
      const dailyInterval = setInterval(callback, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, [callback]);
}

// Funzione per ottenere la label del mese
function getMonthLabel(timestamp) {
  if (!timestamp) return 'Data sconosciuta';
  
  const date = new Date(timestamp * 1000);
  const now = new Date();
  
  // Controlla se è il mese corrente
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    return 'Questo mese';
  }
  
  // Controlla se è il mese scorso
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (date.getFullYear() === lastMonth.getFullYear() && date.getMonth() === lastMonth.getMonth()) {
    return 'Mese scorso';
  }
  
  // Controlla se è il prossimo mese
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  if (date.getFullYear() === nextMonth.getFullYear() && date.getMonth() === nextMonth.getMonth()) {
    return 'Prossimo mese';
  }
  
  // Per altri mesi, mostra nome mese e anno
  return date.toLocaleDateString('it-IT', { 
    month: 'long',
    year: 'numeric'
  });
}

// Funzione per ottenere la chiave del mese (per ordinamento)
function getMonthKey(timestamp) {
  if (!timestamp) return '9999-99'; // Date sconosciute alla fine
  const date = new Date(timestamp * 1000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Funzione per ottenere la label della data (per sotto-raggruppamento)
function getDateLabel(timestamp) {
  if (!timestamp) return 'Data sconosciuta';
  
  const date = new Date(timestamp * 1000);
  const now = new Date();
  
  // Normalizza le date a mezzanotte per confronto
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffDays = Math.round((dateDay - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Domani';
  if (diffDays === -1) return 'Ieri';
  if (diffDays === 2) return 'Dopodomani';
  if (diffDays > 2 && diffDays <= 7) return `Tra ${diffDays} giorni`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} giorni fa`;
  
  // Per date più lontane, mostra la data completa
  return date.toLocaleDateString('it-IT', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

// Funzione per ottenere la chiave del gruppo (per ordinamento)
function getDateKey(timestamp) {
  if (!timestamp) return '9999-99-99'; // Date sconosciute alla fine
  const date = new Date(timestamp * 1000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Componente per gruppo di mesi collassabile
function MonthGroup({ monthLabel, monthKey, matches, onMatchClick, onAddSuggested, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Conta match nel DB vs suggeriti vs rilevati
  const dbCount = matches.filter(m => !m.isSuggested && !m.isDetected).length;
  const suggestedCount = matches.filter(m => m.isSuggested).length;
  const detectedCount = matches.filter(m => m.isDetected).length;
  
  // Raggruppa i match per giorno all'interno del mese
  const dayGroups = useMemo(() => {
    const groups = {};
    matches.forEach(match => {
      const dateKey = getDateKey(match.startTimestamp);
      const dateLabel = getDateLabel(match.startTimestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = { dateKey, dateLabel, matches: [] };
      }
      groups[dateKey].matches.push(match);
    });
    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [matches]);
  
  return (
    <div className="month-group">
      <button 
        className={`month-group-header ${isExpanded ? 'expanded' : 'collapsed'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="month-group-title">
          <span className="month-group-icon">{isExpanded ? '▼' : '▶'}</span>
          <span className="month-group-label">{monthLabel}</span>
          <span className="month-group-count">
            {dbCount} {dbCount === 1 ? 'partita' : 'partite'}
            {suggestedCount > 0 && (
              <span className="suggested-count"> (+{suggestedCount} da aggiungere)</span>
            )}
            {detectedCount > 0 && (
              <span className="detected-count"> (+{detectedCount} rilevate)</span>
            )}
          </span>
        </div>
      </button>
      
      {isExpanded && (
        <div className="month-group-content">
          {dayGroups.map((dayGroup) => (
            <DayGroup
              key={dayGroup.dateKey}
              dateLabel={dayGroup.dateLabel}
              matches={dayGroup.matches}
              onMatchClick={onMatchClick}
              onAddSuggested={onAddSuggested}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Componente per sotto-gruppo giornaliero
function DayGroup({ dateLabel, matches, onMatchClick, onAddSuggested }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const dbCount = matches.filter(m => !m.isSuggested && !m.isDetected).length;
  
  return (
    <div className="day-group">
      <button 
        className={`day-group-header ${isExpanded ? 'expanded' : 'collapsed'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="day-group-icon">{isExpanded ? '▾' : '▸'}</span>
        <span className="day-group-label">{dateLabel}</span>
        <span className="day-group-count">{dbCount}</span>
      </button>
      
      {isExpanded && (
        <div className="day-group-matches">
          {matches.map((match) => (
            <MatchCard 
              key={match.id || match.eventId} 
              match={match} 
              onClick={(match.isSuggested || match.isDetected) ? null : onMatchClick}
              isSuggested={match.isSuggested}
              isDetected={match.isDetected}
              onAddToDb={(match.isSuggested || match.isDetected) && onAddSuggested ? () => onAddSuggested(match) : null}
              dataCompleteness={match.dataCompleteness}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchGrid({ matches, loading, onMatchClick, suggestedMatches = [], detectedMatches = [], onAddSuggested }) {
  // State per forzare re-render a mezzanotte
  const [, setMidnightTick] = useState(0);
  
  // Callback per refresh a mezzanotte
  const handleMidnight = useCallback(() => {
    console.log('🕛 Mezzanotte! Aggiornamento date...');
    setMidnightTick(tick => tick + 1);
  }, []);
  
  // Hook per aggiornare le date a mezzanotte
  useMidnightRefresh(handleMidnight);
  
  // Raggruppa le partite per MESE (inclusi suggeriti e rilevati) - DEVE essere prima dei return condizionali
  const groupedByMonth = useMemo(() => {
    // Raccogli tutti gli eventId già nel database per evitare duplicati
    const existingEventIds = new Set((matches || []).map(m => String(m.eventId)));
    
    const groups = {};
    
    // Aggiungi match esistenti
    (matches || []).forEach(match => {
      const monthKey = getMonthKey(match.startTimestamp);
      const monthLabel = getMonthLabel(match.startTimestamp);
      
      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthKey,
          monthLabel,
          matches: []
        };
      }
      groups[monthKey].matches.push({ ...match, isSuggested: false, isDetected: false });
    });
    
    // Aggiungi match suggeriti (da API, non nel DB)
    (suggestedMatches || []).forEach(match => {
      const monthKey = getMonthKey(match.startTimestamp);
      const monthLabel = getMonthLabel(match.startTimestamp);
      
      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthKey,
          monthLabel,
          matches: []
        };
      }
      // Evita duplicati (controlla eventId)
      const exists = groups[monthKey].matches.some(m => String(m.eventId) === String(match.eventId));
      if (!exists && !existingEventIds.has(String(match.eventId))) {
        groups[monthKey].matches.push({ ...match, isSuggested: true, isDetected: false });
      }
    });
    
    // Aggiungi match rilevati (dal torneo, non nel DB)
    (detectedMatches || []).forEach(match => {
      // Salta se già nel database
      if (existingEventIds.has(String(match.eventId))) return;
      
      const monthKey = getMonthKey(match.startTimestamp);
      const monthLabel = getMonthLabel(match.startTimestamp);
      
      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthKey,
          monthLabel,
          matches: []
        };
      }
      // Evita duplicati (controlla eventId)
      const exists = groups[monthKey].matches.some(m => String(m.eventId) === String(match.eventId));
      if (!exists) {
        groups[monthKey].matches.push({ ...match, isSuggested: false, isDetected: true });
      }
    });
    
    // Se non ci sono gruppi, ritorna array vuoto
    if (Object.keys(groups).length === 0) return [];
    
    // Ordina i gruppi per mese (più recenti in alto) e le partite all'interno per data e orario
    return Object.values(groups)
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .map(group => ({
        ...group,
        matches: group.matches.sort((a, b) => {
          // Prima per data/orario (più recenti prima)
          const timeA = a.startTimestamp || 0;
          const timeB = b.startTimestamp || 0;
          if (timeA !== timeB) return timeB - timeA;
          // Poi per torneo
          return (a.tournament || '').localeCompare(b.tournament || '');
        })
      }));
  }, [matches, suggestedMatches, detectedMatches]);
  
  // Skeleton loading
  if (loading) {
    return (
      <div className="match-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (!matches || matches.length === 0) {
    return (
      <div className="match-grid-empty">
        <div className="empty-content">
          <span className="empty-icon">🎾</span>
          <h3>Nessun match trovato</h3>
          <p>Clicca su "Aggiungi Match" per scaricare dati da SofaScore</p>
        </div>
      </div>
    );
  }

  // Match grid con gruppi per MESE
  return (
    <div className="match-grid-grouped">
      {groupedByMonth.map((group) => (
        <MonthGroup
          key={group.monthKey}
          monthLabel={group.monthLabel}
          monthKey={group.monthKey}
          matches={group.matches}
          onMatchClick={onMatchClick}
          onAddSuggested={onAddSuggested}
          defaultExpanded={group.monthKey === getMonthKey(Date.now() / 1000)} // Espandi solo mese corrente
        />
      ))}
    </div>
  );
}

export default MatchGrid;
