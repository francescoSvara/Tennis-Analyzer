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

// Card per singolo torneo - SOLO DATI DAL DATABASE
// Lo scraping va fatto dal progetto locale Tennis-Scraper-Local
function TournamentCard({ tournament, onExpand, expanded, onMatchSelect }) {
  const dateRange = formatDateRange(tournament.earliestDate, tournament.latestDate);
  
  // Statistiche copertura reale
  const coverage = tournament.coverage || {};
  const hasCoverageData = coverage.totalDetected > 0;
  const coveragePercentage = hasCoverageData ? (coverage.percentage || 0) : 100;
  const missingCount = coverage.missing || 0;
  const missingMatches = tournament.missingMatches || [];
  
  // Handler click su partita esistente - naviga a scheda match
  const handleExistingMatchClick = async (match) => {
    if (onMatchSelect) {
      try {
        const res = await fetch(apiUrl(`/api/matches?sport=tennis`));
        if (res.ok) {
          const data = await res.json();
          const fullMatch = data.matches.find(m => String(m.eventId) === String(match.eventId));
          if (fullMatch) {
            onMatchSelect(fullMatch);
          } else {
            const directRes = await fetch(apiUrl(`/api/match/${match.eventId}`));
            if (directRes.ok) {
              const directData = await directRes.json();
              onMatchSelect(directData);
            } else {
              onMatchSelect(match);
            }
          }
        } else {
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
            <span className="stat-value">
              {tournament.matchCount}
              {hasCoverageData && (
                <span className="stat-total">/{coverage.totalDetected}</span>
              )}
            </span>
            <span className="stat-label">Salvate</span>
          </div>
          <div className="stat-item progress-stat">
            <div className="progress-ring-wrapper">
              <ProgressRing percentage={coveragePercentage} size={48} strokeWidth={5} />
            </div>
            <span className="progress-text-mobile" style={{
              color: coveragePercentage >= 80 ? '#10b981' : coveragePercentage >= 50 ? '#f59e0b' : '#ef4444'
            }}>
              {coveragePercentage}%
            </span>
          </div>
          <span className={`expand-icon ${expanded ? 'rotated' : ''}`}>▼</span>
        </div>
      </div>
      
      {expanded && (
        <div className="tournament-card-body">
          {/* Coverage info - sempre mostrata */}
          <div className="coverage-info">
            <div className="coverage-bar-container">
              <div 
                className="coverage-bar-fill" 
                style={{ 
                  width: `${coveragePercentage}%`,
                  backgroundColor: coveragePercentage >= 80 ? '#10b981' : coveragePercentage >= 50 ? '#f59e0b' : '#ef4444'
                }}
              />
            </div>
            {hasCoverageData ? (
              <div className="coverage-stats">
                <span className="coverage-acquired">✅ {coverage.acquired} acquisite</span>
                <span className="coverage-missing">⚠️ {missingCount} mancanti</span>
                <span className="coverage-total">📊 {coverage.totalDetected} totali</span>
              </div>
            ) : (
              <div className="coverage-stats">
                <span className="coverage-total">📊 {tournament.total_matches} match in DB</span>
              </div>
            )}
          </div>
          
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
          
          {/* Sezione Match nel Database */}
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
          
          {/* Sezione Match Mancanti (rilevate ma non acquisite) */}
          {missingMatches.length > 0 && (
            <div className="tournament-matches missing-matches">
              <div className="matches-header">
                <h5>⚠️ Match Mancanti ({missingCount})</h5>
                <span className="missing-hint">Usa Tennis-Scraper-Local per acquisire</span>
              </div>
              <div className="matches-scroll">
                {missingMatches.slice(0, 10).map(m => (
                  <div 
                    key={m.eventId} 
                    className="mini-match missing-match"
                    title={`Event ID: ${m.eventId} - Status: ${m.status}`}
                  >
                    <span className="mini-match-teams">
                      {m.homeTeam || 'TBD'} vs {m.awayTeam || 'TBD'}
                    </span>
                    <div className="mini-match-meta">
                      <span className={`mini-status ${m.status || 'unknown'}`}>{m.status || 'N/A'}</span>
                      <span className="event-id">#{m.eventId}</span>
                    </div>
                  </div>
                ))}
                {missingMatches.length > 10 && (
                  <div className="more-matches">...e altre {missingMatches.length - 10} partite mancanti</div>
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
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tournaments' | 'explore' | 'tracking'
  
  // === ESPLORA MATCH - Stati filtri ===
  const [searchFilters, setSearchFilters] = useState({
    status: '',
    tournamentId: '',
    tournamentCategory: '',
    playerSearch: '',
    dateFrom: '',
    dateTo: ''
  });
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [availableTournaments, setAvailableTournaments] = useState([]);
  
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
  
  // === ESPLORA MATCH - Carica lista tornei per dropdown ===
  const loadTournaments = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/matches/tournaments'));
      if (res.ok) {
        const data = await res.json();
        setAvailableTournaments(data.tournaments || []);
      }
    } catch (e) {
      console.error('Error loading tournaments:', e);
    }
  }, []);
  
  // === ESPLORA MATCH - Cerca match con filtri ===
  const searchMatches = useCallback(async (page = 1) => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchFilters.status) params.set('status', searchFilters.status);
      if (searchFilters.tournamentId) params.set('tournamentId', searchFilters.tournamentId);
      if (searchFilters.tournamentCategory) params.set('tournamentCategory', searchFilters.tournamentCategory);
      if (searchFilters.playerSearch) params.set('playerSearch', searchFilters.playerSearch);
      if (searchFilters.dateFrom) params.set('dateFrom', searchFilters.dateFrom);
      if (searchFilters.dateTo) params.set('dateTo', searchFilters.dateTo);
      params.set('page', page);
      params.set('limit', 20);
      
      const res = await fetch(apiUrl(`/api/matches/search?${params.toString()}`));
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        setSearchPage(page);
      }
    } catch (e) {
      console.error('Error searching matches:', e);
    } finally {
      setSearchLoading(false);
    }
  }, [searchFilters]);
  
  // Aggiorna filtro
  const updateFilter = (key, value) => {
    setSearchFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Reset filtri
  const resetFilters = () => {
    setSearchFilters({
      status: '',
      tournamentId: '',
      tournamentCategory: '',
      playerSearch: '',
      dateFrom: '',
      dateTo: ''
    });
    setSearchResults(null);
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
  
  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, loadStats]);
  
  // Carica tornei quando si apre tab Esplora
  useEffect(() => {
    if (isOpen && activeTab === 'explore' && availableTournaments.length === 0) {
      loadTournaments();
    }
  }, [isOpen, activeTab, availableTournaments.length, loadTournaments]);
  
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
            className={`tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => setActiveTab('explore')}
          >
            🔍 Esplora Match
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
                    onMatchSelect={onMatchSelect}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* === TAB ESPLORA MATCH === */}
          {activeTab === 'explore' && (
            <div className="tab-content explore-tab">
              {/* Form Filtri */}
              <div className="explore-filters">
                <h3>🔍 Cerca Match nel Database</h3>
                
                <div className="filters-grid">
                  {/* Ricerca Giocatore */}
                  <div className="filter-group">
                    <label>👤 Giocatore</label>
                    <input
                      type="text"
                      placeholder="Nome giocatore..."
                      value={searchFilters.playerSearch}
                      onChange={(e) => updateFilter('playerSearch', e.target.value)}
                    />
                  </div>
                  
                  {/* Categoria Torneo */}
                  <div className="filter-group">
                    <label>🏆 Categoria</label>
                    <select
                      value={searchFilters.tournamentCategory}
                      onChange={(e) => updateFilter('tournamentCategory', e.target.value)}
                    >
                      <option value="">Tutte</option>
                      <option value="ATP">ATP</option>
                      <option value="WTA">WTA</option>
                      <option value="Challenger">Challenger</option>
                      <option value="ITF Men">ITF Men</option>
                      <option value="ITF Women">ITF Women</option>
                    </select>
                  </div>
                                    {/* Categoria Torneo */}
                  <div className="filter-group">
                    <label>🏏️ Categoria</label>
                    <select
                      value={searchFilters.tournamentCategory}
                      onChange={(e) => updateFilter('tournamentCategory', e.target.value)}
                    >
                      <option value="">Tutte</option>
                      <option value="ATP">ATP</option>
                      <option value="WTA">WTA</option>
                      <option value="Challenger">Challenger</option>
                      <option value="ITF Men">ITF Men</option>
                      <option value="ITF Women">ITF Women</option>
                    </select>
                  </div>
                                    {/* Torneo */}
                  <div className="filter-group">
                    <label>🎾 Torneo</label>
                    <select
                      value={searchFilters.tournamentId}
                      onChange={(e) => updateFilter('tournamentId', e.target.value)}
                    >
                      <option value="">Tutti i tornei</option>
                      {availableTournaments.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.matchCount})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Status */}
                  <div className="filter-group">
                    <label>📊 Status</label>
                    <select
                      value={searchFilters.status}
                      onChange={(e) => updateFilter('status', e.target.value)}
                    >
                      <option value="">Tutti</option>
                      <option value="finished">Finite</option>
                      <option value="inprogress">In Corso</option>
                      <option value="notstarted">Da Iniziare</option>
                    </select>
                  </div>
                  
                  {/* Data Da */}
                  <div className="filter-group">
                    <label>📅 Da</label>
                    <input
                      type="date"
                      value={searchFilters.dateFrom}
                      onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    />
                  </div>
                  
                  {/* Data A */}
                  <div className="filter-group">
                    <label>📅 A</label>
                    <input
                      type="date"
                      value={searchFilters.dateTo}
                      onChange={(e) => updateFilter('dateTo', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="filter-actions">
                  <button 
                    className="search-btn"
                    onClick={() => searchMatches(1)}
                    disabled={searchLoading}
                  >
                    {searchLoading ? '⏳ Cerco...' : '🔍 Cerca'}
                  </button>
                  <button 
                    className="reset-btn"
                    onClick={resetFilters}
                  >
                    ↺ Reset
                  </button>
                </div>
              </div>
              
              {/* Risultati */}
              {searchResults && (
                <div className="explore-results">
                  <div className="results-header">
                    <span className="results-count">
                      {searchResults.pagination.total} match trovati
                    </span>
                  </div>
                  
                  {searchResults.matches.length === 0 ? (
                    <div className="no-results">
                      <span>🔍</span>
                      <p>Nessun match trovato con questi filtri</p>
                    </div>
                  ) : (
                    <>
                      <div className="results-list">
                        {searchResults.matches.map((match) => (
                          <div 
                            key={match.eventId} 
                            className="result-item clickable"
                            onClick={() => onMatchSelect && onMatchSelect(match)}
                          >
                            <div className="result-main">
                              <span className="result-teams">
                                {match.homeTeam} vs {match.awayTeam}
                              </span>
                              <span className="result-tournament">{match.tournament}</span>
                            </div>
                            <div className="result-meta">
                              <span className={`result-status ${match.status}`}>
                                {match.status === 'finished' ? '✓ Finita' : 
                                 match.status === 'inprogress' ? '● Live' : 
                                 '○ Da iniziare'}
                              </span>
                              {match.startTime && (
                                <span className="result-date">
                                  {new Date(match.startTime).toLocaleDateString('it-IT', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              )}
                              {match.homeScore !== null && match.awayScore !== null && (
                                <span className="result-score">
                                  {match.homeScore} - {match.awayScore}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Paginazione */}
                      {searchResults.pagination.totalPages > 1 && (
                        <div className="pagination-controls">
                          <button 
                            className="pagination-btn"
                            onClick={() => searchMatches(searchPage - 1)}
                            disabled={!searchResults.pagination.hasPrev || searchLoading}
                          >
                            ← Precedente
                          </button>
                          <span className="pagination-info">
                            Pagina {searchResults.pagination.page} di {searchResults.pagination.totalPages}
                          </span>
                          <button 
                            className="pagination-btn"
                            onClick={() => searchMatches(searchPage + 1)}
                            disabled={!searchResults.pagination.hasNext || searchLoading}
                          >
                            Successivo →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Messaggio iniziale */}
              {!searchResults && !searchLoading && (
                <div className="explore-hint">
                  <span>💡</span>
                  <p>Usa i filtri sopra per cercare match nel database</p>
                  <small>Puoi filtrare per giocatore, torneo, status o data</small>
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
