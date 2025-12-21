import React, { useState, useEffect, useCallback } from 'react';
import SportSidebar from './SportSidebar';
import MatchGrid from './MatchGrid';
import MonitoringDashboard from './MonitoringDashboard';
import { apiUrl } from '../config';

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


function HomePage({ onMatchSelect }) {
  const [selectedSport, setSelectedSport] = useState('tennis');
  const [allMatches, setAllMatches] = useState([]); // Tutti i match caricati
  const [suggestedMatches, setSuggestedMatches] = useState([]);
  const [detectedMatches, setDetectedMatches] = useState([]);
  const [totalMatchCount, setTotalMatchCount] = useState(0);
  const [totalDetectedCount, setTotalDetectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  
  // Filtri data gerarchici
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedDay, setSelectedDay] = useState('all');

  // Funzione per caricare i match
  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Carica TUTTI i match dal database (limite alto)
      const matchesRes = await fetch(apiUrl(`/api/db/matches?limit=10000`));
      if (!matchesRes.ok) {
        throw new Error(`Errore HTTP: ${matchesRes.status}`);
      }
      const matchesData = await matchesRes.json();
      setAllMatches(matchesData.matches || []);
      setTotalMatchCount(matchesData.totalCount || matchesData.matches?.length || 0);
      console.log(`📁 Loaded ${matchesData.matches?.length || 0} matches from database`);
      
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
      setAllMatches([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSport]);

  // Carica i match quando cambia lo sport o il filtro
  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // Calcola gli anni disponibili dai match
  const availableYears = React.useMemo(() => {
    const years = new Set();
    allMatches.forEach(m => {
      if (m.startTimestamp) {
        const date = new Date(m.startTimestamp * 1000);
        years.add(date.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Ordine decrescente
  }, [allMatches]);

  // Calcola i mesi disponibili per l'anno selezionato
  const availableMonths = React.useMemo(() => {
    if (selectedYear === 'all') return [];
    const months = new Set();
    allMatches.forEach(m => {
      if (m.startTimestamp) {
        const date = new Date(m.startTimestamp * 1000);
        if (date.getFullYear() === parseInt(selectedYear)) {
          months.add(date.getMonth() + 1); // 1-12
        }
      }
    });
    return Array.from(months).sort((a, b) => b - a); // Ordine decrescente
  }, [allMatches, selectedYear]);

  // Calcola i giorni disponibili per anno/mese selezionato
  const availableDays = React.useMemo(() => {
    if (selectedYear === 'all' || selectedMonth === 'all') return [];
    const days = new Set();
    allMatches.forEach(m => {
      if (m.startTimestamp) {
        const date = new Date(m.startTimestamp * 1000);
        if (date.getFullYear() === parseInt(selectedYear) && 
            (date.getMonth() + 1) === parseInt(selectedMonth)) {
          days.add(date.getDate());
        }
      }
    });
    return Array.from(days).sort((a, b) => b - a); // Ordine decrescente
  }, [allMatches, selectedYear, selectedMonth]);

  // Filtra i match in base ai filtri selezionati
  const filteredMatches = React.useMemo(() => {
    return allMatches.filter(m => {
      if (!m.startTimestamp) return selectedYear === 'all'; // Mostra match senza data solo se "tutti"
      
      const date = new Date(m.startTimestamp * 1000);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      if (selectedYear !== 'all' && year !== parseInt(selectedYear)) return false;
      if (selectedMonth !== 'all' && month !== parseInt(selectedMonth)) return false;
      if (selectedDay !== 'all' && day !== parseInt(selectedDay)) return false;
      
      return true;
    });
  }, [allMatches, selectedYear, selectedMonth, selectedDay]);

  // Reset filtri figli quando cambia il genitore
  useEffect(() => {
    setSelectedMonth('all');
    setSelectedDay('all');
  }, [selectedYear]);

  useEffect(() => {
    setSelectedDay('all');
  }, [selectedMonth]);

  // Nomi dei mesi in italiano
  const monthNames = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

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
            <span className="home-icon">🏆</span>
            Match Database
          </h1>
        </div>
        <div className="home-header-right">
          <button className="monitor-btn" onClick={() => setShowMonitoring(true)}>
            <span className="icon">📊</span> Database Monitor
          </button>
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
              {selectedSport === 'tennis' && '🎾 Tennis Matches'}
              {selectedSport === 'football' && '⚽ Football Matches'}
              {selectedSport === 'basketball' && '🏀 Basketball Matches'}
              {selectedSport === 'rugby-union' && '🏉 Rugby Matches'}
            </h2>
            
            {/* Filtri Data Gerarchici */}
            <div className="date-filters">
              {/* Anno */}
              <select 
                className="date-filter-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="all">📅 Tutti gli anni ({totalMatchCount})</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              {/* Mese - visibile solo se anno selezionato */}
              {selectedYear !== 'all' && (
                <select 
                  className="date-filter-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="all">📆 Tutti i mesi</option>
                  {availableMonths.map(month => (
                    <option key={month} value={month}>{monthNames[month]}</option>
                  ))}
                </select>
              )}

              {/* Giorno - visibile solo se mese selezionato */}
              {selectedYear !== 'all' && selectedMonth !== 'all' && (
                <select 
                  className="date-filter-select"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                >
                  <option value="all">📅 Tutti i giorni</option>
                  {availableDays.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              )}
            </div>
            
            <span className="match-count">
              {loading ? '...' : `${filteredMatches.length} visualizzate`}
              {filteredMatches.length !== totalMatchCount && !loading && (
                <span className="filtered-info"> / {totalMatchCount} totali</span>
              )}
              {totalDetectedCount > 0 && !loading && (
                <span className="detected-count"> · {totalDetectedCount} mancanti</span>
              )}
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
              <button className="retry-btn" onClick={loadMatches}>Riprova</button>
            </div>
          )}
          
          {/* Match Grid */}
          <MatchGrid 
            matches={filteredMatches}
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
