import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// Progress ring/circle con animazione da 0%
function ProgressRing({ percentage, size = 60, strokeWidth = 6 }) {
  const [animatedPct, setAnimatedPct] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedPct / 100) * circumference;
  
  // Anima da 0 al valore reale
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPct(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);
  
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
            transition: 'stroke-dashoffset 0.8s ease-out'
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
  
  const loadTournamentEvents = useCallback(async (force = false) => {
    if (loadingEvents) return;
    if (!force && events) return;
    setLoadingEvents(true);
    try {
      // Usa uniqueTournamentId se disponibile per chiamare SofaScore, altrimenti usa id (season)
      const tournamentIdToUse = tournament.uniqueTournamentId || tournament.id;
      const res = await fetch(apiUrl(`/api/tournament/${tournamentIdToUse}/events?seasonId=${tournament.id}`));
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
          <div className="stat-item progress-stat">
            {/* Progress ring per desktop */}
            <div className="progress-ring-wrapper">
              <ProgressRing percentage={displayPercentage} size={48} strokeWidth={5} />
            </div>
            {/* Testo per mobile */}
            <span className="progress-text-mobile" style={{
              color: displayPercentage >= 80 ? '#10b981' : displayPercentage >= 50 ? '#f59e0b' : '#ef4444'
            }}>
              {displayPercentage}%
            </span>
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
          
          {/* Tournament events coverage */}
          {loadingEvents && (
            <div className="loading-events">
              <span className="spinner"></span> Caricamento statistiche...
            </div>
          )}
          
          {events && (
            <div className="tournament-events-summary">
              <div className="events-header">
                <h5>📊 Copertura Torneo</h5>
                <div className="coverage-stats">
                  <span className="coverage-rate">{events.stats.completionRate}%</span>
                  <span className="coverage-detail">
                    {events.stats.inDatabase}/{events.stats.total} partite salvate
                  </span>
                </div>
              </div>
              
              <div className="coverage-bar">
                <div 
                  className="coverage-fill" 
                  style={{ width: `${events.stats.completionRate}%` }}
                />
              </div>
              
              {/* Nota quando usiamo solo dati locali */}
              {events.note && events.stats.total > 0 && (
                <div className="coverage-note">
                  <small>✓ {tournament.matchCount} match nel database</small>
                </div>
              )}
            </div>
          )}
          
          {/* Sezione Match Salvati */}
          {tournament.matches.length > 0 && (
            <div className="tournament-matches saved-matches">
              <div className="matches-header">
                <h5>✅ Match nel Database ({tournament.matches.length})</h5>
              </div>
              <div className="matches-scroll">
                {tournament.matches.slice(0, 10).map(m => (
                  <div 
                    key={m.eventId} 
                    className="mini-match clickable saved-match"
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
                {tournament.matches.length > 10 && (
                  <div className="more-matches">...e altri {tournament.matches.length - 10} match</div>
                )}
              </div>
            </div>
          )}
          
          {/* Sezione Match Non Salvati */}
          {events && events.stats.missing > 0 && (
            <div className="tournament-matches missing-matches">
              <div className="matches-header">
                <h5>⚠️ Match Non Salvati ({events.stats.missing})</h5>
                <span className="missing-info-hint">Match rilevati ma non nel database</span>
              </div>
              <div className="matches-scroll">
                {events.events
                  .filter(e => !e.inDatabase)
                  .slice(0, 10)
                  .map(e => (
                    <div 
                      key={e.eventId} 
                      className="mini-match missing-match"
                      title="Match rilevato ma non ancora nel database"
                    >
                      <span className="mini-match-teams">
                        {e.homeTeam} vs {e.awayTeam}
                      </span>
                      <div className="mini-match-meta">
                        <span className={`mini-status ${e.status}`}>{e.status}</span>
                        <span className="missing-icon">❌</span>
                      </div>
                    </div>
                  ))}
                {events.stats.missing > 10 && (
                  <div className="more-matches">...e altri {events.stats.missing - 10} match</div>
                )}
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
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tournaments' | 'recent' | 'tracking'
  
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
      } else if (res.status === 503 && data.error === 'blocked') {
        setScrapeStatus('error');
        setScrapeMessage('⚠️ SofaScore blocca le richieste dal server. Usa lo scraping da localhost.');
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
      const res = await fetch(apiUrl(`/api/sync/${eventId}`), { method: 'POST' });
      if (res.ok) {
        refreshData(); // Aggiorna tutto dopo sync
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncingMatch(null);
    }
  };
  
  // Filtra match incompleti (non 100% O non finished) - TUTTI, non limitati
  const getIncompleteMatches = useCallback(() => {
    if (!stats?.recentAcquisitions) return [];
    return stats.recentAcquisitions
      .filter(m => m.completeness < 100 || m.status !== 'finished');
  }, [stats]);
  
  // Paginazione per la lista incompleti
  const [incompletePage, setIncompletePage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  
  const paginatedIncomplete = useMemo(() => {
    const all = getIncompleteMatches();
    const start = (incompletePage - 1) * ITEMS_PER_PAGE;
    return {
      items: all.slice(start, start + ITEMS_PER_PAGE),
      total: all.length,
      totalPages: Math.ceil(all.length / ITEMS_PER_PAGE),
      hasNext: start + ITEMS_PER_PAGE < all.length,
      hasPrev: incompletePage > 1
    };
  }, [getIncompleteMatches, incompletePage]);
  
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
        await fetch(apiUrl(`/api/sync/${match.eventId}`), { method: 'POST' });
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
                  <span className="recent-count">{paginatedIncomplete.total} match incompleti</span>
                </div>
                <button 
                  className="sync-all-btn"
                  onClick={handleSyncAllIncomplete}
                  disabled={syncingAll || paginatedIncomplete.total === 0}
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
              
              {paginatedIncomplete.total === 0 ? (
                <div className="no-incomplete">
                  <span className="no-incomplete-icon">✅</span>
                  <p>Tutti i match sono completi!</p>
                  <span className="no-incomplete-hint">
                    Non ci sono match da aggiornare
                  </span>
                </div>
              ) : (
                <>
                  <div className="recent-list">
                    {paginatedIncomplete.items.map((match, i) => (
                      <div key={match.eventId} className="recent-item">
                        <span className="recent-index">{(incompletePage - 1) * ITEMS_PER_PAGE + i + 1}</span>
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
                  
                  {/* Paginazione */}
                  {paginatedIncomplete.totalPages > 1 && (
                    <div className="pagination-controls">
                      <button 
                        className="pagination-btn"
                        onClick={() => setIncompletePage(p => p - 1)}
                        disabled={!paginatedIncomplete.hasPrev}
                      >
                        ← Precedente
                      </button>
                      <span className="pagination-info">
                        Pagina {incompletePage} di {paginatedIncomplete.totalPages}
                      </span>
                      <button 
                        className="pagination-btn"
                        onClick={() => setIncompletePage(p => p + 1)}
                        disabled={!paginatedIncomplete.hasNext}
                      >
                        Successivo →
                      </button>
                    </div>
                  )}
                </>
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
