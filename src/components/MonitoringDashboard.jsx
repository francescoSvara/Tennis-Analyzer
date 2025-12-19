import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../config';

/**
 * MonitoringDashboard Component
 * Pannello avanzato per monitorare lo stato del database, 
 * tornei, acquisizioni e completezza dati
 */

// Mini grafico a barre per la timeline
function MiniBarChart({ data, height = 40 }) {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data.map(d => d.count), 1);
  const barWidth = 100 / data.length;
  
  return (
    <div className="mini-bar-chart" style={{ height, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
      {data.map((d, i) => (
        <div
          key={i}
          className="mini-bar"
          title={`${d.date}: ${d.count} match`}
          style={{
            flex: 1,
            height: `${(d.count / max) * 100}%`,
            minHeight: d.count > 0 ? 4 : 1,
            background: d.count > 0 
              ? 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)' 
              : 'rgba(255,255,255,0.1)',
            borderRadius: '2px 2px 0 0',
            transition: 'height 0.3s ease'
          }}
        />
      ))}
    </div>
  );
}

// Progress ring/circle
function ProgressRing({ percentage, size = 60, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  const getColor = (pct) => {
    if (pct >= 80) return '#10b981';
    if (pct >= 50) return '#f59e0b';
    return '#ef4444';
  };
  
  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          stroke="rgba(255,255,255,0.1)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={getColor(percentage)}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.5s ease'
          }}
        />
      </svg>
      <span className="progress-ring-text" style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: size * 0.25,
        fontWeight: 700,
        color: getColor(percentage)
      }}>
        {percentage}%
      </span>
    </div>
  );
}

// Formatta data per visualizzazione
function formatTournamentDate(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp * 1000);
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('it-IT', options);
}

// Formatta range date
function formatDateRange(earliest, latest) {
  if (!earliest && !latest) return null;
  const e = formatTournamentDate(earliest);
  const l = formatTournamentDate(latest);
  if (e === l || !e) return l;
  if (!l) return e;
  return `${e} - ${l}`;
}

// Card per singolo torneo
function TournamentCard({ tournament, onExpand, expanded, refreshKey, onRefreshData, onMatchSelect }) {
  const [events, setEvents] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Stati per modale inserimento link
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedMissingMatch, setSelectedMissingMatch] = useState(null);
  const [linkInput, setLinkInput] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');
  
  // Stati per sync match esistenti
  const [syncingMatchId, setSyncingMatchId] = useState(null);
  const [syncingAllMatches, setSyncingAllMatches] = useState(false);
  
  const loadTournamentEvents = useCallback(async (force = false) => {
    if (loadingEvents) return;
    if (!force && events) return;
    setLoadingEvents(true);
    try {
      const res = await fetch(apiUrl(`/api/tournament/${tournament.id}/events`));
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (e) {
      console.error('Error loading tournament events:', e);
    } finally {
      setLoadingEvents(false);
    }
  }, [tournament.id, loadingEvents]);
  
  // Carica eventi subito al mount per avere la copertura corretta
  useEffect(() => {
    loadTournamentEvents();
  }, [tournament.id]);
  
  // Ricarica eventi quando refreshKey cambia (nuovo match aggiunto)
  useEffect(() => {
    if (refreshKey > 0) {
      loadTournamentEvents(true);
    }
  }, [refreshKey]);
  
  // Percentuale da mostrare: usa copertura (match in DB / totali) se disponibile, altrimenti completezza media
  const displayPercentage = events?.stats?.completionRate ?? tournament.avgCompleteness;
  
  const dateRange = formatDateRange(tournament.earliestDate, tournament.latestDate);
  
  // Handler click su partita mancante - apre modale per inserire link
  const handleMissingClick = (match) => {
    setSelectedMissingMatch(match);
    setLinkInput('');
    setLinkError('');
    setShowLinkModal(true);
  };
  
  // Handler submit link per partita mancante
  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!linkInput.trim()) return;
    
    setLinkLoading(true);
    setLinkError('');
    
    try {
      const res = await fetch(apiUrl('/api/scrape'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkInput.trim() })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowLinkModal(false);
        setSelectedMissingMatch(null);
        setLinkInput('');
        // Refresh dati
        loadTournamentEvents(true);
        if (onRefreshData) onRefreshData();
      } else {
        setLinkError(data.message || 'Errore durante lo scraping');
      }
    } catch (err) {
      setLinkError('Errore di connessione al server');
    } finally {
      setLinkLoading(false);
    }
  };
  
  // Handler click su partita esistente - naviga a scheda match
  const handleExistingMatchClick = async (match) => {
    // Carica il match completo dal backend usando l'eventId
    if (onMatchSelect) {
      try {
        // Prova prima a caricare il match specifico dal DB
        const res = await fetch(apiUrl(`/api/matches?sport=tennis`));
        if (res.ok) {
          const data = await res.json();
          // Trova il match completo con lo stesso eventId (confronto come stringa)
          const fullMatch = data.matches.find(m => String(m.eventId) === String(match.eventId));
          if (fullMatch) {
            console.log('Match completo trovato:', fullMatch);
            onMatchSelect(fullMatch);
          } else {
            console.warn('Match non trovato nella lista, provo a caricarlo direttamente:', match.eventId);
            // Se non trovato nella lista, prova a caricarlo direttamente
            const directRes = await fetch(apiUrl(`/api/match/${match.eventId}`));
            if (directRes.ok) {
              const directData = await directRes.json();
              onMatchSelect(directData);
            } else {
              console.error('Match non trovato, uso dati minimi');
              onMatchSelect(match);
            }
          }
        } else {
          console.error('Errore caricamento matches:', res.status);
          onMatchSelect(match);
        }
      } catch (err) {
        console.error('Error loading full match:', err);
        onMatchSelect(match);
      }
    }
  };
  
  // Handler per aggiornare tutte le partite incomplete
  const handleSyncAllIncomplete = async () => {
    if (syncingAllMatches) return;
    
    // Filtra partite che non sono (finished AND 100%)
    const incompleteMatches = tournament.matches.filter(m => 
      m.status !== 'finished' || m.completeness < 100
    );
    
    if (incompleteMatches.length === 0) return;
    
    setSyncingAllMatches(true);
    
    try {
      // Sync tutte le partite incomplete in parallelo
      const syncPromises = incompleteMatches.map(async (match) => {
        const url = `https://www.sofascore.com/event/${match.eventId}`;
        try {
          await fetch(apiUrl('/api/scrape'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
        } catch (err) {
          console.error(`Error syncing match ${match.eventId}:`, err);
        }
      });
      
      await Promise.all(syncPromises);
      
      // Refresh dati
      loadTournamentEvents(true);
      if (onRefreshData) onRefreshData();
    } finally {
      setSyncingAllMatches(false);
    }
  };
  
  return (
    <div className={`tournament-card ${expanded ? 'expanded' : ''}`}>
      <div className="tournament-card-header" onClick={() => onExpand(tournament.id)}>
        <div className="tournament-info">
          <span className="tournament-sport-icon">
            {tournament.sport === 'tennis' ? '🎾' : 
             tournament.sport === 'football' ? '⚽' : '🏆'}
          </span>
          <div className="tournament-details">
            <h4 className="tournament-name">{tournament.name}</h4>
            <div className="tournament-meta">
              <span className="tournament-category">{tournament.category}</span>
              {dateRange && (
                <span className="tournament-date">📅 {dateRange}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="tournament-stats">
          <div className="stat-item">
            <span className="stat-value">{tournament.matchCount}</span>
            <span className="stat-label">Salvate</span>
          </div>
          <div className="stat-item">
            <ProgressRing percentage={displayPercentage} size={48} strokeWidth={5} />
          </div>
          <span className={`expand-icon ${expanded ? 'rotated' : ''}`}>▼</span>
        </div>
      </div>
      
      {expanded && (
        <div className="tournament-card-body">
          {/* Status breakdown */}
          <div className="status-breakdown">
            <div className="status-item finished">
              <span className="status-dot"></span>
              <span>{tournament.byStatus.finished} Finite</span>
            </div>
            <div className="status-item inprogress">
              <span className="status-dot"></span>
              <span>{tournament.byStatus.inprogress} In Corso</span>
            </div>
            <div className="status-item notstarted">
              <span className="status-dot"></span>
              <span>{tournament.byStatus.notstarted} Da Iniziare</span>
            </div>
          </div>
          
          {/* Tournament events from SofaScore */}
          {loadingEvents && (
            <div className="loading-events">
              <span className="spinner"></span> Caricamento partite torneo...
            </div>
          )}
          
          {events && (
            <div className="tournament-events-summary">
              <div className="events-header">
                <h5>📊 Copertura Torneo</h5>
                <div className="coverage-stats">
                  <span className="coverage-rate">{events.stats.completionRate}%</span>
                  <span className="coverage-detail">
                    {events.stats.inDatabase}/{events.stats.total} partite
                  </span>
                </div>
              </div>
              
              <div className="coverage-bar">
                <div 
                  className="coverage-fill" 
                  style={{ width: `${events.stats.completionRate}%` }}
                />
              </div>
              
              {events.stats.missing > 0 && (
                <div className="missing-events">
                  <h6>⚠️ {events.stats.missing} partite mancanti</h6>
                  <div className="missing-list">
                    {events.events
                      .filter(e => !e.inDatabase)
                      .slice(0, 5)
                      .map(e => (
                        <div 
                          key={e.eventId} 
                          className="missing-event clickable"
                          onClick={() => handleMissingClick(e)}
                          title="Clicca per aggiungere link"
                        >
                          <span className="event-teams">{e.homeTeam} vs {e.awayTeam}</span>
                          <span className={`event-status ${e.status}`}>{e.status}</span>
                        </div>
                      ))
                    }
                    {events.stats.missing > 5 && (
                      <span className="more-missing">...e altre {events.stats.missing - 5}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Match list */}
          <div className="tournament-matches">
            <div className="matches-header">
              <h5>Match Salvati</h5>
              <button 
                className="sync-matches-btn"
                onClick={handleSyncAllIncomplete}
                disabled={syncingAllMatches || tournament.matches.filter(m => m.status !== 'finished' || m.completeness < 100).length === 0}
                title="Aggiorna tutte le partite incomplete"
              >
                {syncingAllMatches ? (
                  <><span className="btn-loader"></span> Aggiornamento...</>
                ) : (
                  <><span className="sync-icon">🔄</span> Aggiorna</>
                )}
              </button>
            </div>
            <div className="matches-scroll">
              {tournament.matches.slice(0, 10).map(m => (
                <div 
                  key={m.eventId} 
                  className="mini-match clickable"
                  onClick={() => handleExistingMatchClick(m)}
                  title="Clicca per aprire scheda match"
                >
                  <span className="mini-match-teams">
                    {m.homeTeam} vs {m.awayTeam}
                  </span>
                  <div className="mini-match-meta">
                    <span className={`mini-status ${m.status}`}>{m.status}</span>
                    <span className="mini-completeness">{m.completeness}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Modale inserimento link */}
          {showLinkModal && (
            <div className="link-modal-overlay" onClick={() => setShowLinkModal(false)}>
              <div className="link-modal" onClick={e => e.stopPropagation()}>
                <div className="link-modal-header">
                  <h4>Aggiungi Partita</h4>
                  <button className="close-modal" onClick={() => setShowLinkModal(false)}>×</button>
                </div>
                <div className="link-modal-body">
                  <p className="match-info">
                    <strong>{selectedMissingMatch?.homeTeam}</strong> vs <strong>{selectedMissingMatch?.awayTeam}</strong>
                  </p>
                  <form onSubmit={handleLinkSubmit}>
                    <input
                      type="text"
                      className="link-input"
                      placeholder="Incolla link SofaScore..."
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      autoFocus
                    />
                    {linkError && <p className="link-error">{linkError}</p>}
                    <div className="link-modal-actions">
                      <button type="button" className="btn-cancel" onClick={() => setShowLinkModal(false)}>
                        Annulla
                      </button>
                      <button type="submit" className="btn-submit" disabled={linkLoading || !linkInput.trim()}>
                        {linkLoading ? <span className="btn-loader"></span> : 'Aggiungi'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Componente principale
function MonitoringDashboard({ isOpen, onClose, onMatchesUpdated, onMatchSelect }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTournament, setExpandedTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tournaments' | 'recent' | 'tracking' | 'add'
  
  // Stati per aggiunta match
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState(null); // 'success' | 'error' | 'duplicate'
  const [scrapeMessage, setScrapeMessage] = useState('');
  
  // Stati per sync match
  const [syncingMatch, setSyncingMatch] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  
  // Chiave per forzare refresh dei componenti figli quando dati cambiano
  const [refreshKey, setRefreshKey] = useState(0);
  
  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/db-stats'));
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Funzione per aggiornare tutto dopo un cambiamento
  const refreshData = useCallback(() => {
    loadStats();
    setRefreshKey(prev => prev + 1);
    if (onMatchesUpdated) onMatchesUpdated();
  }, [loadStats, onMatchesUpdated]);
  
  // Funzione per aggiungere un match via scrape
  const handleScrapeMatch = async (e) => {
    e.preventDefault();
    if (!scrapeUrl.trim()) return;
    
    setScrapeLoading(true);
    setScrapeStatus(null);
    setScrapeMessage('');
    
    try {
      const res = await fetch(apiUrl('/api/scrape'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl.trim() })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setScrapeStatus('success');
        setScrapeMessage(`Match acquisito: ${data.match?.homeTeam || 'Unknown'} vs ${data.match?.awayTeam || 'Unknown'}`);
        setScrapeUrl('');
        refreshData(); // Aggiorna statistiche, grafici e copertura tornei
      } else if (res.status === 409) {
        setScrapeStatus('duplicate');
        setScrapeMessage(data.message || 'Match già presente nel database');
      } else {
        setScrapeStatus('error');
        setScrapeMessage(data.message || 'Errore durante lo scraping');
      }
    } catch (err) {
      setScrapeStatus('error');
      setScrapeMessage('Errore di connessione al server');
    } finally {
      setScrapeLoading(false);
    }
  };
  
  // Funzione per sincronizzare un match
  const handleSyncMatch = async (eventId) => {
    setSyncingMatch(eventId);
    try {
      const res = await fetch(`/api/sync/${eventId}`, { method: 'POST' });
      if (res.ok) {
        refreshData(); // Aggiorna tutto dopo sync
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncingMatch(null);
    }
  };
  
  // Filtra match incompleti (non 100% O non finished)
  const getIncompleteMatches = useCallback(() => {
    if (!stats?.recentAcquisitions) return [];
    return stats.recentAcquisitions
      .filter(m => m.completeness < 100 || m.status !== 'finished')
      .slice(0, 20);
  }, [stats]);
  
  // Funzione per sincronizzare tutti i match incompleti
  const handleSyncAllIncomplete = async () => {
    const incompleteMatches = getIncompleteMatches();
    if (incompleteMatches.length === 0) return;
    
    setSyncingAll(true);
    setSyncProgress({ current: 0, total: incompleteMatches.length });
    
    for (let i = 0; i < incompleteMatches.length; i++) {
      const match = incompleteMatches[i];
      setSyncProgress({ current: i + 1, total: incompleteMatches.length });
      setSyncingMatch(match.eventId);
      
      try {
        await fetch(`/api/sync/${match.eventId}`, { method: 'POST' });
        // Piccola pausa per non sovraccaricare il server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Sync error for ${match.eventId}:`, err);
      }
    }
    
    setSyncingMatch(null);
    setSyncingAll(false);
    setSyncProgress({ current: 0, total: 0 });
    refreshData(); // Aggiorna tutto dopo sync completo
  };
  
  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, loadStats]);
  
  if (!isOpen) return null;
  
  return (
    <div className="monitoring-overlay" onClick={onClose}>
      <div className="monitoring-dashboard" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="monitoring-header">
          <div className="monitoring-title">
            <span className="monitoring-icon">📊</span>
            <div>
              <h2>Database Monitor</h2>
              <p>Stato acquisizioni e completezza dati</p>
            </div>
          </div>
          <div className="monitoring-actions">
            <button className="close-monitoring-btn" onClick={onClose}>✕</button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="monitoring-tabs">
          <button 
            className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            ➕ Aggiungi
          </button>
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📈 Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'tournaments' ? 'active' : ''}`}
            onClick={() => setActiveTab('tournaments')}
          >
            🏆 Tornei
          </button>
          <button 
            className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            🕐 Recenti
          </button>
          <button 
            className={`tab-btn ${activeTab === 'tracking' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracking')}
          >
            📡 Live Tracking
          </button>
        </div>
        
        {/* Content */}
        <div className="monitoring-content">
          {loading && !stats && (
            <div className="monitoring-loading">
              <span className="spinner large"></span>
              <p>Caricamento statistiche...</p>
            </div>
          )}
          
          {error && (
            <div className="monitoring-error">
              <span>❌ {error}</span>
              <button onClick={loadStats}>Riprova</button>
            </div>
          )}
          
          {/* Tab Aggiungi Match */}
          {activeTab === 'add' && (
            <div className="tab-content add-tab">
              <div className="add-match-section">
                <h3>➕ Aggiungi Nuovo Match</h3>
                <p className="add-match-description">
                  Inserisci l'URL di un evento SofaScore per acquisire i dati
                </p>
                
                <form onSubmit={handleScrapeMatch} className="add-match-form">
                  <div className="url-input-wrapper">
                    <span className="url-icon">🔗</span>
                    <input
                      type="url"
                      value={scrapeUrl}
                      onChange={(e) => setScrapeUrl(e.target.value)}
                      placeholder="https://www.sofascore.com/..."
                      className="url-input"
                      disabled={scrapeLoading}
                    />
                    <button 
                      type="submit" 
                      className="scrape-btn"
                      disabled={scrapeLoading || !scrapeUrl.trim()}
                    >
                      {scrapeLoading ? (
                        <>
                          <span className="spinner small"></span>
                          Acquisizione...
                        </>
                      ) : (
                        <>📥 Acquisisci</>
                      )}
                    </button>
                  </div>
                </form>
                
                {scrapeStatus && (
                  <div className={`scrape-result ${scrapeStatus}`}>
                    <span className="scrape-result-icon">
                      {scrapeStatus === 'success' && '✅'}
                      {scrapeStatus === 'duplicate' && '❌'}
                      {scrapeStatus === 'error' && '❌'}
                    </span>
                    <span className="scrape-result-message">{scrapeMessage}</span>
                  </div>
                )}
                
                <div className="add-match-tips">
                  <h4>💡 Suggerimenti</h4>
                  <ul>
                    <li>Usa URL diretti di eventi tennis da SofaScore</li>
                    <li>Formato: <code>sofascore.com/player1-player2/xxYyyZzz#id:12345</code></li>
                    <li>I match già presenti non verranno duplicati</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {stats && activeTab === 'overview' && (
            <div className="tab-content overview-tab">
              {/* Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card total">
                  <div className="summary-icon">📁</div>
                  <div className="summary-info">
                    <span className="summary-value">{stats.summary.totalMatches}</span>
                    <span className="summary-label">Match Totali</span>
                  </div>
                </div>
                
                <div className="summary-card tournaments">
                  <div className="summary-icon">🏆</div>
                  <div className="summary-info">
                    <span className="summary-value">{stats.summary.totalTournaments}</span>
                    <span className="summary-label">Tornei</span>
                  </div>
                </div>
                
                <div className="summary-card completeness">
                  <div className="summary-icon">✅</div>
                  <div className="summary-info">
                    <span className="summary-value">{stats.summary.avgCompleteness}%</span>
                    <span className="summary-label">Completezza Media</span>
                  </div>
                </div>
                
                <div className="summary-card tracking">
                  <div className="summary-icon">📡</div>
                  <div className="summary-info">
                    <span className="summary-value">{stats.tracking.active}</span>
                    <span className="summary-label">In Monitoraggio</span>
                  </div>
                </div>
              </div>
              
              {/* Status Distribution */}
              <div className="status-distribution">
                <h3>Distribuzione Status</h3>
                <div className="status-bars">
                  <div className="status-bar-item">
                    <span className="status-bar-label">✅ Finite</span>
                    <div className="status-bar-track">
                      <div 
                        className="status-bar-fill finished" 
                        style={{ 
                          width: `${(stats.summary.byStatus.finished / stats.summary.totalMatches) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="status-bar-value">{stats.summary.byStatus.finished}</span>
                  </div>
                  <div className="status-bar-item">
                    <span className="status-bar-label">🔴 In Corso</span>
                    <div className="status-bar-track">
                      <div 
                        className="status-bar-fill inprogress" 
                        style={{ 
                          width: `${(stats.summary.byStatus.inprogress / stats.summary.totalMatches) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="status-bar-value">{stats.summary.byStatus.inprogress}</span>
                  </div>
                  <div className="status-bar-item">
                    <span className="status-bar-label">⏳ Da Iniziare</span>
                    <div className="status-bar-track">
                      <div 
                        className="status-bar-fill notstarted" 
                        style={{ 
                          width: `${(stats.summary.byStatus.notstarted / stats.summary.totalMatches) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="status-bar-value">{stats.summary.byStatus.notstarted}</span>
                  </div>
                </div>
              </div>
              
              {/* Timeline */}
              <div className="acquisition-timeline">
                <h3>Acquisizioni Ultimi 30 Giorni</h3>
                <MiniBarChart data={stats.timeline} height={80} />
                <div className="timeline-labels">
                  <span>{stats.timeline[0]?.date}</span>
                  <span>{stats.timeline[stats.timeline.length - 1]?.date}</span>
                </div>
              </div>
            </div>
          )}
          
          {stats && activeTab === 'tournaments' && (
            <div className="tab-content tournaments-tab">
              <div className="tournaments-list">
                {stats.tournaments.map(t => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    expanded={expandedTournament === t.id}
                    onExpand={(id) => setExpandedTournament(expandedTournament === id ? null : id)}
                    refreshKey={refreshKey}
                    onRefreshData={refreshData}
                    onMatchSelect={onMatchSelect}
                  />
                ))}
              </div>
            </div>
          )}
          
          {stats && activeTab === 'recent' && (
            <div className="tab-content recent-tab">
              <div className="recent-header">
                <div className="recent-title-section">
                  <h3>🔄 Match da Completare</h3>
                  <span className="recent-count">{getIncompleteMatches().length} match incompleti</span>
                </div>
                <button 
                  className="sync-all-btn"
                  onClick={handleSyncAllIncomplete}
                  disabled={syncingAll || getIncompleteMatches().length === 0}
                  title="Aggiorna tutti i match incompleti"
                >
                  {syncingAll ? (
                    <>
                      <span className="spinner small"></span>
                      {syncProgress.current}/{syncProgress.total}
                    </>
                  ) : (
                    <>🔄 Aggiorna Tutti</>
                  )}
                </button>
              </div>
              
              {getIncompleteMatches().length === 0 ? (
                <div className="no-incomplete">
                  <span className="no-incomplete-icon">✅</span>
                  <p>Tutti i match sono completi!</p>
                  <span className="no-incomplete-hint">
                    Non ci sono match da aggiornare
                  </span>
                </div>
              ) : (
                <div className="recent-list">
                  {getIncompleteMatches().map((match, i) => (
                    <div key={match.eventId} className="recent-item">
                      <span className="recent-index">{i + 1}</span>
                      <div className="recent-info">
                        <span className="recent-teams">{match.homeTeam} vs {match.awayTeam}</span>
                        <span className="recent-tournament">{match.tournament}</span>
                      </div>
                      <div className="recent-meta">
                        <span className={`recent-status ${match.status}`}>{match.status}</span>
                        <span className="recent-completeness">{match.completeness}%</span>
                        <span className="recent-time">
                          {new Date(match.acquiredAt).toLocaleString('it-IT', { 
                            day: '2-digit', 
                            month: 'short', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <button 
                        className="sync-match-btn"
                        onClick={() => handleSyncMatch(match.eventId)}
                        disabled={syncingMatch === match.eventId || syncingAll}
                        title="Aggiorna dati match"
                      >
                        {syncingMatch === match.eventId ? (
                          <span className="spinner small"></span>
                        ) : (
                          '🔄'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {stats && activeTab === 'tracking' && (
            <div className="tab-content tracking-tab">
              <div className="tracking-header">
                <h3>📡 Partite in Monitoraggio Automatico</h3>
                <p className="tracking-info">
                  Queste partite vengono aggiornate automaticamente ogni 30 secondi
                </p>
              </div>
              
              {stats.tracking.matches.length === 0 ? (
                <div className="no-tracking">
                  <span className="no-tracking-icon">🔇</span>
                  <p>Nessuna partita in monitoraggio attivo</p>
                  <span className="no-tracking-hint">
                    Le partite live vengono tracciate automaticamente
                  </span>
                </div>
              ) : (
                <div className="tracking-list">
                  {stats.tracking.matches.map(match => (
                    <div key={match.eventId} className="tracking-item">
                      <div className="tracking-dot pulse"></div>
                      <div className="tracking-details">
                        <span className="tracking-id">Event #{match.eventId}</span>
                        <span className="tracking-status">{match.status}</span>
                      </div>
                      <span className="tracking-time">
                        Ultimo update: {new Date(match.lastUpdate).toLocaleTimeString('it-IT')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonitoringDashboard;
