import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  TennisBall, 
  CalendarBlank, 
  CaretDown, 
  CaretRight,
  FolderOpen,
  Calendar
} from '@phosphor-icons/react';
import MatchCard from './MatchCard';
import { MatchGridSkeleton } from './motion/Skeleton';
import EmptyState from './motion/EmptyState';
import { durations, easings, staggerContainer, staggerItem } from '../motion/tokens';

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

// Funzione per ottenere la label dell'anno
function getYearLabel(timestamp) {
  if (!timestamp) return 'Data sconosciuta';
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const year = date.getFullYear();
  
  if (year === now.getFullYear()) return 'Quest\'anno';
  if (year === now.getFullYear() - 1) return 'Anno scorso';
  if (year === now.getFullYear() + 1) return 'Prossimo anno';
  return String(year);
}

// Funzione per ottenere la chiave dell'anno (per ordinamento)
function getYearKey(timestamp) {
  if (!timestamp) return '9999';
  const date = new Date(timestamp * 1000);
  return String(date.getFullYear());
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

// Componente per gruppo di anni collassabile
function YearGroup({ yearLabel, yearKey, monthGroups, onMatchClick, onAddSuggested, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const prefersReducedMotion = useReducedMotion();
  
  // Conta totale partite nell'anno
  const totalCount = monthGroups.reduce((sum, mg) => sum + mg.matches.length, 0);
  
  return (
    <motion.div 
      className="year-group"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.normal, ease: easings.premium }}
    >
      <motion.button 
        className={`year-group-header ${isExpanded ? 'expanded' : 'collapsed'}`}
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={!prefersReducedMotion ? { backgroundColor: 'rgba(255, 255, 255, 0.06)' } : {}}
        whileTap={{ scale: 0.99 }}
      >
        <div className="year-group-title">
          <motion.span 
            className="year-group-icon"
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: durations.fast, ease: easings.premium }}
          >
            <CaretDown size={14} weight="bold" />
          </motion.span>
          <Calendar size={16} weight="duotone" style={{ marginRight: 6, opacity: 0.7 }} />
          <span className="year-group-label">{yearLabel}</span>
          <span className="year-group-count">
            {totalCount} {totalCount === 1 ? 'partita' : 'partite'}
          </span>
        </div>
      </motion.button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            className="year-group-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: durations.normal, ease: easings.premium }}
          >
            {monthGroups.map((monthGroup) => (
              <MonthGroup
                key={monthGroup.monthKey}
                monthLabel={monthGroup.monthLabel}
                monthKey={monthGroup.monthKey}
                matches={monthGroup.matches}
                onMatchClick={onMatchClick}
                onAddSuggested={onAddSuggested}
                defaultExpanded={monthGroup.monthKey === getMonthKey(Date.now() / 1000)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Componente per gruppo di mesi collassabile
function MonthGroup({ monthLabel, monthKey, matches, onMatchClick, onAddSuggested, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const prefersReducedMotion = useReducedMotion();
  
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
    <motion.div 
      className="month-group"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: durations.normal, ease: easings.premium }}
    >
      <motion.button 
        className={`month-group-header ${isExpanded ? 'expanded' : 'collapsed'}`}
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={!prefersReducedMotion ? { backgroundColor: 'rgba(255, 255, 255, 0.04)' } : {}}
        whileTap={{ scale: 0.99 }}
      >
        <div className="month-group-title">
          <motion.span 
            className="month-group-icon"
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: durations.fast, ease: easings.premium }}
          >
            <CaretDown size={12} weight="bold" />
          </motion.span>
          <FolderOpen size={14} weight="duotone" style={{ marginRight: 6, opacity: 0.7 }} />
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
      </motion.button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            className="month-group-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: durations.normal, ease: easings.premium }}
          >
            {dayGroups.map((dayGroup) => (
              <DayGroup
                key={dayGroup.dateKey}
                dateLabel={dayGroup.dateLabel}
                matches={dayGroup.matches}
                onMatchClick={onMatchClick}
                onAddSuggested={onAddSuggested}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Componente per sotto-gruppo giornaliero
function DayGroup({ dateLabel, matches, onMatchClick, onAddSuggested }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  
  const dbCount = matches.filter(m => !m.isSuggested && !m.isDetected).length;
  
  return (
    <div className="day-group">
      <motion.button 
        className={`day-group-header ${isExpanded ? 'expanded' : 'collapsed'}`}
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={!prefersReducedMotion ? { backgroundColor: 'rgba(255, 255, 255, 0.03)' } : {}}
        whileTap={{ scale: 0.99 }}
      >
        <motion.span 
          className="day-group-icon"
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: durations.fast, ease: easings.premium }}
        >
          <CaretDown size={10} weight="bold" />
        </motion.span>
        <CalendarBlank size={12} weight="duotone" style={{ marginRight: 6, opacity: 0.6 }} />
        <span className="day-group-label">{dateLabel}</span>
        <span className="day-group-count">{dbCount}</span>
      </motion.button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            className="day-group-matches"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: durations.normal, ease: easings.premium }}
            variants={staggerContainer}
          >
            {matches.map((match, index) => (
              <motion.div
                key={match.id || match.eventId}
                variants={staggerItem}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ 
                  duration: durations.normal, 
                  ease: easings.premium,
                  delay: index * 0.04
                }}
              >
                <MatchCard 
                  match={match} 
                  onClick={(match.isSuggested || match.isDetected) ? null : onMatchClick}
                  isSuggested={match.isSuggested}
                  isDetected={match.isDetected}
                  onAddToDb={(match.isSuggested || match.isDetected) && onAddSuggested ? () => onAddSuggested(match) : null}
                  dataSources={match.dataSources}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
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
  
  // Raggruppa le partite per ANNO > MESE (inclusi suggeriti e rilevati)
  const groupedByYear = useMemo(() => {
    // Raccogli tutti gli eventId già nel database per evitare duplicati
    const existingEventIds = new Set((matches || []).map(m => String(m.eventId)));
    
    const yearGroups = {};
    
    // Funzione helper per aggiungere un match al gruppo corretto
    const addMatchToGroup = (match, isSuggested, isDetected) => {
      const yearKey = getYearKey(match.startTimestamp);
      const yearLabel = getYearLabel(match.startTimestamp);
      const monthKey = getMonthKey(match.startTimestamp);
      const monthLabel = getMonthLabel(match.startTimestamp);
      
      if (!yearGroups[yearKey]) {
        yearGroups[yearKey] = {
          yearKey,
          yearLabel,
          monthGroups: {}
        };
      }
      
      if (!yearGroups[yearKey].monthGroups[monthKey]) {
        yearGroups[yearKey].monthGroups[monthKey] = {
          monthKey,
          monthLabel,
          matches: []
        };
      }
      
      yearGroups[yearKey].monthGroups[monthKey].matches.push({ 
        ...match, 
        isSuggested, 
        isDetected 
      });
    };
    
    // Aggiungi match esistenti
    (matches || []).forEach(match => {
      addMatchToGroup(match, false, false);
    });
    
    // Aggiungi match suggeriti (da API, non nel DB)
    (suggestedMatches || []).forEach(match => {
      if (!existingEventIds.has(String(match.eventId))) {
        addMatchToGroup(match, true, false);
      }
    });
    
    // Aggiungi match rilevati (dal torneo, non nel DB)
    (detectedMatches || []).forEach(match => {
      if (!existingEventIds.has(String(match.eventId))) {
        addMatchToGroup(match, false, true);
      }
    });
    
    // Se non ci sono gruppi, ritorna array vuoto
    if (Object.keys(yearGroups).length === 0) return [];
    
    // Converti e ordina
    return Object.values(yearGroups)
      .sort((a, b) => b.yearKey.localeCompare(a.yearKey)) // Anni più recenti prima
      .map(yearGroup => ({
        ...yearGroup,
        monthGroups: Object.values(yearGroup.monthGroups)
          .sort((a, b) => b.monthKey.localeCompare(a.monthKey)) // Mesi più recenti prima
          .map(monthGroup => ({
            ...monthGroup,
            matches: monthGroup.matches.sort((a, b) => {
              const timeA = a.startTimestamp || 0;
              const timeB = b.startTimestamp || 0;
              if (timeA !== timeB) return timeB - timeA;
              return (a.tournament || '').localeCompare(b.tournament || '');
            })
          }))
      }));
  }, [matches, suggestedMatches, detectedMatches]);
  
  // Skeleton loading con nuovo componente
  if (loading) {
    return <MatchGridSkeleton count={6} />;
  }

  // Empty state con nuovo componente
  if (!matches || matches.length === 0) {
    return (
      <EmptyState
        type="noMatches"
        title="Nessun match trovato"
        description="Clicca su 'Aggiungi Match' per scaricare dati da SofaScore"
      />
    );
  }

  // Match grid con gruppi per ANNO > MESE > GIORNO
  return (
    <motion.div 
      className="match-grid-grouped"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {groupedByYear.map((yearGroup) => (
        <YearGroup
          key={yearGroup.yearKey}
          yearLabel={yearGroup.yearLabel}
          yearKey={yearGroup.yearKey}
          monthGroups={yearGroup.monthGroups}
          onMatchClick={onMatchClick}
          onAddSuggested={onAddSuggested}
          defaultExpanded={yearGroup.yearKey === getYearKey(Date.now() / 1000)}
        />
      ))}
    </motion.div>
  );
}

export default MatchGrid;
