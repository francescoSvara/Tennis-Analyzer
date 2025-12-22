import React, { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  Trophy, 
  User, 
  ChartLineUp, 
  TennisBall,
  SoccerBall,
  Basketball,
  WarningCircle,
  ArrowClockwise,
  Database
} from '@phosphor-icons/react';
import SportSidebar from './SportSidebar';
import MatchGrid from './MatchGrid';
import MonitoringDashboard from './MonitoringDashboard';
import { apiUrl } from '../config';
import { durations, easings } from '../motion/tokens';

// Modal per aggiungere un nuovo match (manteniamo per uso futuro)
function AddMatchModal({ onClose, onSuccess }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null); // 'scraping' | 'success' | 'duplicate'

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setStatus('scraping');

    try {
      const response = await fetch(apiUrl('/api/scrape'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      const data = await response.json();

      if (response.status === 409) {
        setStatus('duplicate');
        setError(`Match già presente: ${data.message}`);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante lo scraping');
      }

      // Estrai eventId dall'URL per il tracking
      const eventIdMatch = url.match(/id[=:](\d+)/i) || url.match(/\/event\/(\d+)/);
      if (eventIdMatch) {
        const eventId = eventIdMatch[1];
        // Avvia tracking automatico per partite live
        try {
          await fetch(apiUrl(`/api/track/${eventId}`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'inprogress' })
          });
          console.log(`📌 Match ${eventId} added to auto-tracking`);
        } catch (trackErr) {
          console.log('⚠️ Could not start tracking:', trackErr.message);
        }
      }

      setStatus('success');
      setTimeout(() => {
        onSuccess && onSuccess(data);
      }, 1000);

    } catch (err) {
      setError(err.message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">➕ Aggiungi Match</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label className="modal-label">URL SofaScore</label>
            <input
              type="url"
              className="modal-input"
              placeholder="https://www.sofascore.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <p className="modal-hint">
              Incolla il link di un match da SofaScore per scaricarne i dati
            </p>

            {/* Status messages */}
            {status === 'scraping' && (
              <div className="modal-status scraping">
                <span className="status-spinner"></span>
                Scaricamento in corso...
              </div>
            )}
            {status === 'success' && (
              <div className="modal-status success">
                ✅ Match aggiunto con successo!
              </div>
            )}
            {status === 'duplicate' && (
              <div className="modal-status warning">
                ⚠️ {error}
              </div>
            )}
            {error && status !== 'duplicate' && (
              <div className="modal-status error">
                ❌ {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>
              Annulla
            </button>
            <button 
              type="submit" 
              className="modal-btn modal-btn-primary"
              disabled={loading || !url.trim()}
            >
              {loading ? 'Scaricamento...' : 'Scarica Match'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function HomePage({ onMatchSelect, onNavigateToPlayer }) {
  const [selectedSport, setSelectedSport] = useState('tennis');
  const [matches, setMatches] = useState([]);
  const [suggestedMatches, setSuggestedMatches] = useState([]);
  const [detectedMatches, setDetectedMatches] = useState([]);
  const [totalMatchCount, setTotalMatchCount] = useState(0);
  const [totalDetectedCount, setTotalDetectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);

  // Funzione per caricare i match
  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Carica TUTTI i match dal database con paginazione
      let allMatches = [];
      let offset = 0;
      const pageSize = 1000; // Supabase ha limite di ~1000 per query
      let hasMore = true;
      
      while (hasMore) {
        const matchesRes = await fetch(apiUrl(`/api/db/matches?limit=${pageSize}&offset=${offset}`));
        if (!matchesRes.ok) {
          throw new Error(`Errore HTTP: ${matchesRes.status}`);
        }
        const matchesData = await matchesRes.json();
        const pageMatches = matchesData.matches || [];
        allMatches = [...allMatches, ...pageMatches];
        
        // Se abbiamo ricevuto meno del pageSize, abbiamo finito
        if (pageMatches.length < pageSize) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
        
        // Aggiorna totalCount dalla prima risposta
        if (offset === pageSize) {
          setTotalMatchCount(matchesData.totalCount || allMatches.length);
        }
      }
      
      setMatches(allMatches);
      setTotalMatchCount(allMatches.length);
      console.log(`📁 Loaded ${allMatches.length} matches from database (all pages)`);
      
      // Carica suggeriti e rilevati in parallelo
      const [suggestedRes, detectedRes, trackedRes] = await Promise.all([
        fetch(apiUrl(`/api/suggested-matches?sport=${selectedSport}`)).catch(() => null),
        fetch(apiUrl(`/api/detected-matches`)).catch(() => null),
        fetch(apiUrl(`/api/tracked`)).catch(() => null)
      ]);
      
      // Suggeriti sono opzionali, non fallire se non funziona
      if (suggestedRes?.ok) {
        const suggestedData = await suggestedRes.json();
        setSuggestedMatches(suggestedData.matches || []);
      }
      
      // Partite rilevate (dal torneo) - mostra le mancanti
      if (detectedRes?.ok) {
        const detectedData = await detectedRes.json();
        setDetectedMatches(detectedData.matches || []);
        setTotalDetectedCount(detectedData.totalCount || detectedData.count || 0);
      }
      
      // Log partite tracciate
      if (trackedRes?.ok) {
        const trackedData = await trackedRes.json();
        if (trackedData.count > 0) {
          console.log(`📌 ${trackedData.count} partite in monitoraggio automatico`);
        }
      }
    } catch (err) {
      console.error('Errore caricamento match:', err);
      setError('Impossibile caricare i match. Verifica che il backend sia attivo su porta 3001.');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSport]);

  // Carica i match quando cambia lo sport
  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleMatchClick = (match) => {
    if (onMatchSelect) {
      onMatchSelect(match);
    }
  };

  // Handler per aggiungere match suggerito al DB
  const handleAddSuggested = async (match) => {
    try {
      const sofaUrl = `https://www.sofascore.com/event/${match.eventId}`;
      const response = await fetch(apiUrl('/api/scrape'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sofaUrl })
      });
      
      if (response.ok) {
        // Ricarica lista dopo aggiunta
        loadMatches();
      }
    } catch (err) {
      console.error('Errore aggiunta match:', err);
    }
  };

  const handleAddMatchSuccess = () => {
    setShowAddModal(false);
    loadMatches(); // Ricarica la lista
  };

  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <div className="home-header-left">
          <h1 className="home-title">
            <Trophy size={28} weight="duotone" className="home-icon" />
            Match Database
          </h1>
        </div>
        <div className="home-header-right">
          <motion.button 
            className="player-btn" 
            onClick={onNavigateToPlayer}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: durations.fast, ease: easings.premium }}
          >
            <User size={18} weight="duotone" className="icon" /> Player Profiles
          </motion.button>
          <motion.button 
            className="monitor-btn" 
            onClick={() => setShowMonitoring(true)}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: durations.fast, ease: easings.premium }}
          >
            <ChartLineUp size={18} weight="duotone" className="icon" /> Database Monitor
          </motion.button>
        </div>
      </header>

      {/* Content Layout */}
      <div className="home-content">
        <SportSidebar 
          selectedSport={selectedSport}
          onSelectSport={setSelectedSport}
        />
        
        <main className="home-main">
          {/* Section Header */}
          <div className="home-main-header">
            <h2 className="section-title">
              {selectedSport === 'tennis' && <><TennisBall size={22} weight="duotone" style={{ marginRight: 8 }} />Tennis Matches</>}
              {selectedSport === 'football' && <><SoccerBall size={22} weight="duotone" style={{ marginRight: 8 }} />Football Matches</>}
              {selectedSport === 'basketball' && <><Basketball size={22} weight="duotone" style={{ marginRight: 8 }} />Basketball Matches</>}
              {selectedSport === 'rugby-union' && <><Trophy size={22} weight="duotone" style={{ marginRight: 8 }} />Rugby Matches</>}
            </h2>
            
            <span className="match-count">
              <Database size={14} weight="bold" style={{ marginRight: 4, opacity: 0.7 }} />
              {loading ? '...' : `${totalMatchCount} salvate`}
              {totalDetectedCount > 0 && !loading && (
                <span className="detected-count"> · {totalDetectedCount} mancanti</span>
              )}
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div 
              className="error-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: durations.normal, ease: easings.premium }}
            >
              <WarningCircle size={20} weight="fill" className="error-icon" />
              <span className="error-text">{error}</span>
              <motion.button 
                className="retry-btn" 
                onClick={loadMatches}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowClockwise size={14} weight="bold" style={{ marginRight: 4 }} />
                Riprova
              </motion.button>
            </motion.div>
          )}
          
          {/* Match Grid */}
          <MatchGrid 
            matches={matches}
            suggestedMatches={suggestedMatches}
            detectedMatches={detectedMatches}
            loading={loading}
            onMatchClick={handleMatchClick}
            onAddSuggested={handleAddSuggested}
          />
        </main>
      </div>

      {/* Add Match Modal */}
      {showAddModal && (
        <AddMatchModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddMatchSuccess}
        />
      )}

      {/* Monitoring Dashboard */}
      <MonitoringDashboard 
        isOpen={showMonitoring}
        onClose={() => setShowMonitoring(false)}
        onMatchesUpdated={loadMatches}
        onMatchSelect={onMatchSelect}
      />
    </div>
  );
}

export default HomePage;
