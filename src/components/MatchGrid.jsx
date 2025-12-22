import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  CalendarBlank, 
  CaretDown, 
  FolderOpen,
  Calendar,
  Spinner
} from '@phosphor-icons/react';
import MatchCard from './MatchCard';
import { MatchGridSkeleton } from './motion/Skeleton';
import EmptyState from './motion/EmptyState';
import { durations, easings, staggerContainer, staggerItem } from '../motion/tokens';
import { apiUrl } from '../config';

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

// 🚀 OTTIMIZZATO: YearGroup - inizia CHIUSO, non carica dati finché non espanso
function YearGroup({ year, months, onMatchClick }) {
  const [isExpanded, setIsExpanded] = useState(false); // SEMPRE chiuso di default
  const prefersReducedMotion = useReducedMotion();
  
  // Conta totale partite nell'anno (dai conteggi, non dai match)
  const totalCount = months.reduce((sum, m) => sum + m.count, 0);
  
  // Label anno user-friendly
  const now = new Date();
  const yearNum = parseInt(year);
  let yearLabel = year;
  if (yearNum === now.getFullYear()) yearLabel = "Quest'anno";
  else if (yearNum === now.getFullYear() - 1) yearLabel = 'Anno scorso';
  
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
            {months.map((month) => (
              <MonthGroupLazy
                key={month.monthKey}
                monthKey={month.monthKey}
                count={month.count}
                onMatchClick={onMatchClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 🚀 LAZY: MonthGroup - carica i match SOLO quando espanso
function MonthGroupLazy({ monthKey, count, onMatchClick }) {
  const [isExpanded, setIsExpanded] = useState(false); // SEMPRE chiuso
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  
  // Label mese user-friendly
  const [year, month] = monthKey.split('-').map(Number);
  const monthDate = new Date(year, month - 1, 1);
  const now = new Date();
  
  let monthLabel;
  if (year === now.getFullYear() && month === now.getMonth() + 1) {
    monthLabel = 'Questo mese';
  } else if (year === now.getFullYear() && month === now.getMonth()) {
    monthLabel = 'Mese scorso';
  } else {
    monthLabel = monthDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  }
  
  // 🚀 LAZY LOAD: Carica i match solo quando l'utente espande il mese
  const handleExpand = async () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    // Carica i match solo alla prima espansione
    if (newExpanded && !loaded && !loading) {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/db/matches/by-month/${monthKey}`));
        if (res.ok) {
          const data = await res.json();
          setMatches(data.matches || []);
          setLoaded(true);
          console.log(`📂 Lazy loaded ${data.matches?.length || 0} matches for ${monthKey}`);
        }
      } catch (err) {
        console.error('Error loading month matches:', err);
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Raggruppa i match per giorno (solo se caricati)
  const dayGroups = useMemo(() => {
    if (!matches.length) return [];
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
        onClick={handleExpand}
        whileHover={!prefersReducedMotion ? { backgroundColor: 'rgba(255, 255, 255, 0.04)' } : {}}
        whileTap={{ scale: 0.99 }}
      >
        <div className="month-group-title">
          <motion.span 
            className="month-group-icon"
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: durations.fast, ease: easings.premium }}
          >
            {loading ? <Spinner size={12} className="spin" /> : <CaretDown size={12} weight="bold" />}
          </motion.span>
          <FolderOpen size={14} weight="duotone" style={{ marginRight: 6, opacity: 0.7 }} />
          <span className="month-group-label">{monthLabel}</span>
          <span className="month-group-count">
            {count} {count === 1 ? 'partita' : 'partite'}
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
            {loading ? (
              <div className="month-loading">
                <Spinner size={20} className="spin" />
                <span>Caricamento partite...</span>
              </div>
            ) : (
              dayGroups.map((dayGroup) => (
                <DayGroup
                  key={dayGroup.dateKey}
                  dateLabel={dayGroup.dateLabel}
                  matches={dayGroup.matches}
                  onMatchClick={onMatchClick}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 🚀 SEMPLIFICATO: DayGroup - mostra le card solo quando espanso
function DayGroup({ dateLabel, matches, onMatchClick }) {
  const [isExpanded, setIsExpanded] = useState(false); // SEMPRE chiuso
  const prefersReducedMotion = useReducedMotion();
  
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
        <span className="day-group-count">{matches.length}</span>
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
                  onClick={onMatchClick}
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

// 🚀 OTTIMIZZATO: MatchGrid - riceve solo summary (conteggi), lazy load on demand
function MatchGrid({ summary, loading, onMatchClick }) {
  // Skeleton loading
  if (loading) {
    return <MatchGridSkeleton count={6} />;
  }

  // Empty state
  if (!summary?.byYearMonth?.length) {
    return (
      <EmptyState
        type="noMatches"
        title="Nessun match trovato"
        description="Clicca su 'Aggiungi Match' per scaricare dati da SofaScore"
      />
    );
  }

  // Match grid con gruppi per ANNO > MESE > GIORNO
  // TUTTI I GRUPPI INIZIANO CHIUSI - lazy load quando espansi
  return (
    <motion.div 
      className="match-grid-grouped"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {summary.byYearMonth.map((yearGroup) => (
        <YearGroup
          key={yearGroup.year}
          year={yearGroup.year}
          months={yearGroup.months}
          onMatchClick={onMatchClick}
        />
      ))}
    </motion.div>
  );
}

export default MatchGrid;
