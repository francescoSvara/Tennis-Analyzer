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
            <span className="stat-value">{tournament.matchCount}</span>
            <span className="stat-label">Salvate</span>
          </div>
          <div className="stat-item progress-stat">
            <div className="progress-ring-wrapper">
              <ProgressRing percentage={tournament.avgCompleteness} size={48} strokeWidth={5} />
            </div>
            <span className="progress-text-mobile" style={{
              color: tournament.avgCompleteness >= 80 ? '#10b981' : tournament.avgCompleteness >= 50 ? '#f59e0b' : '#ef4444'
            }}>
              {tournament.avgCompleteness}%
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
                  <h3>⚠️ Match Incompleti</h3>
                  <span className="recent-count">{paginatedIncomplete.total} match da completare</span>
                </div>
              </div>
              
              {paginatedIncomplete.total === 0 ? (
                <div className="no-incomplete">
                  <span className="no-incomplete-icon">✅</span>
                  <p>Tutti i match sono completi!</p>
                  <span className="no-incomplete-hint">
                    Nessun match con dati mancanti
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
