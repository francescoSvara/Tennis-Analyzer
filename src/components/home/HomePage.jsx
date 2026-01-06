/**
 * HomePage.jsx - Lobby / Home refactored
 *
 * Ref: FILOSOFIA_FRONTEND.md - HOME (Lobby)
 * - Watchlist
 * - Live Matches → sorted by Edge (strategy priority)
 * - Alerts / Signals panel
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  House,
  Eye,
  Lightning,
  Bell,
  TennisBall,
  MagnifyingGlass,
  FunnelSimple,
  SortAscending,
  Star,
  Clock,
  TrendUp,
  CaretRight,
  CaretLeft,
  CaretDown,
  ArrowClockwise,
  Broadcast,
  CheckCircle,
  XCircle,
  Warning,
  User,
  ChartLineUp,
  Plus,
} from '@phosphor-icons/react';
import { MotionCard, MotionButton, MotionRow } from '../../motion';
import { apiUrl } from '../../config';
import SportSidebar from '../SportSidebar';
import MonitoringDashboard from '../MonitoringDashboard';
import './HomePage.css';
import '../../styles/homepage.css';

// Status indicator component
function StatusBadge({ status }) {
  const config = {
    live: { color: '#ef4444', label: 'LIVE', icon: <Broadcast size={12} weight="fill" /> },
    upcoming: { color: '#f59e0b', label: 'Upcoming', icon: <Clock size={12} /> },
    finished: { color: '#6b7280', label: 'Finished', icon: <CheckCircle size={12} /> },
  };
  const c = config[status] || config.upcoming;

  return (
    <span className="status-badge" style={{ '--status-color': c.color }}>
      {c.icon}
      {c.label}
    </span>
  );
}

// Edge indicator badge
function EdgeBadge({ edge }) {
  if (!edge || edge === 0) return null;
  const isPositive = edge > 0;
  const color = isPositive ? '#10b981' : '#ef4444';

  return (
    <span className="edge-badge" style={{ color, background: `${color}20` }}>
      {isPositive ? '+' : ''}
      {edge.toFixed(1)}%
    </span>
  );
}

// Strategy status pill
function StrategyPill({ status, name }) {
  const colors = {
    READY: '#10b981',
    WATCH: '#f59e0b',
    OFF: '#6b7280',
  };

  return (
    <span className="strategy-pill" style={{ borderColor: colors[status] }}>
      <span className={`status-dot ${status.toLowerCase()}`}></span>
      {name}
    </span>
  );
}

// Single Match Row (for live matches list)
function MatchRow({ match, onSelect, onToggleWatchlist, isWatched }) {
  // Get status label
  const getStatusLabel = (status) => {
    switch (status) {
      case 'live': return 'LIVE';
      case 'finished': return 'Finale';
      case 'upcoming': return 'Programma';
      default: return status;
    }
  };

  // Format player name with rank
  const formatPlayer = (name, rank) => {
    if (!name) return '—';
    // Get surname + initial: "Nakashima B." format
    const parts = name.split(' ');
    if (parts.length >= 2) {
      const surname = parts[parts.length - 1];
      const initials = parts.slice(0, -1).map(p => p[0] + '.').join(' ');
      return `${surname} ${initials}`;
    }
    return name;
  };

  // Parse sets data from backend or fallback from score string
  const getSetsData = () => {
    // For live matches with liveScore, show current set scores
    if (match.liveScore && match.status === 'live') {
      // liveScore has { home: X, away: Y } - current sets won
      // We show this as the overall score for live
      return [{ home: match.liveScore.home || 0, away: match.liveScore.away || 0 }];
    }
    // First try backend setsData
    if (match.setsData && match.setsData.length > 0) {
      return match.setsData;
    }
    // Fallback: parse from score string like "6-4, 7-5, 6-3"
    if (match.score) {
      const sets = match.score.split(',').map(s => s.trim());
      return sets.map(setStr => {
        const [home, away] = setStr.split('-').map(n => parseInt(n.trim(), 10));
        return { home: home || 0, away: away || 0 };
      }).filter(s => !isNaN(s.home) && !isNaN(s.away));
    }
    return [];
  };

  const setsData = getSetsData();

  return (
    <MotionRow className="match-row" onClick={() => onSelect(match)}>
      {/* Watchlist star */}
      <button
        className={`watchlist-star ${isWatched ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleWatchlist(match.id);
        }}
        title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        {isWatched ? <Star size={16} weight="fill" /> : <Star size={16} />}
      </button>

      {/* Match status */}
      <div className={`match-status-cell ${match.status}`}>
        {getStatusLabel(match.status)}
      </div>

      {/* Players and scores table */}
      <div className="match-players-scores">
        <div className="player-row home">
          <span className="player-name">{formatPlayer(match.homePlayer, match.homeRank)}</span>
          <div className="player-sets">
            {setsData.map((set, idx) => (
              <span 
                key={idx} 
                className={`set-score ${set.home > set.away ? 'winner' : ''}`}
              >
                {set.home}
              </span>
            ))}
          </div>
        </div>
        <div className="player-row away">
          <span className="player-name">{formatPlayer(match.awayPlayer, match.awayRank)}</span>
          <div className="player-sets">
            {setsData.map((set, idx) => (
              <span 
                key={idx} 
                className={`set-score ${set.away > set.home ? 'winner' : ''}`}
              >
                {set.away}
              </span>
            ))}
          </div>
        </div>
      </div>

      <CaretRight size={16} className="row-arrow" />
    </MotionRow>
  );
}

// Alert item component
function AlertItem({ alert, onDismiss }) {
  const typeConfig = {
    READY: { color: '#10b981', icon: <Lightning size={16} weight="fill" /> },
    momentum: { color: '#3b82f6', icon: <TrendUp size={16} weight="fill" /> },
    warning: { color: '#f59e0b', icon: <Warning size={16} weight="fill" /> },
  };
  const config = typeConfig[alert.type] || typeConfig.momentum;

  return (
    <motion.div
      className="alert-item"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      style={{ borderLeftColor: config.color }}
    >
      <span className="alert-icon" style={{ color: config.color }}>
        {config.icon}
      </span>
      <div className="alert-content">
        <span className="alert-title">{alert.title}</span>
        <span className="alert-description">{alert.description}</span>
        <span className="alert-time">{alert.time}</span>
      </div>
      <button className="alert-dismiss" onClick={() => onDismiss(alert.id)}>
        <XCircle size={16} />
      </button>
    </motion.div>
  );
}

// Search & Filter bar
function SearchFilterBar({ searchTerm, onSearchChange, isSearching }) {
  return (
    <div className="search-filter-bar">
      <div className="search-input-wrapper">
        {isSearching ? (
          <ArrowClockwise size={18} className="search-icon spinning" />
        ) : (
          <MagnifyingGlass size={18} className="search-icon" />
        )}
        <input
          type="text"
          className="search-input"
          placeholder="Search players (e.g., Moutet, Musetti)..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button className="search-clear" onClick={() => onSearchChange('')} title="Clear search">
            <XCircle size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// Add Match Modal (kept from original)
function AddMatchModal({ onClose, onSuccess }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

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
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (response.status === 409) {
        setStatus('duplicate');
        setError(`Match already exists: ${data.message}`);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Scraping error');
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
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            <Plus size={20} /> Add Match
          </h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label className="modal-label">SofaScore URL</label>
            <input
              type="url"
              className="modal-input"
              placeholder="https://www.sofascore.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <p className="modal-hint">Paste a match link from SofaScore to fetch its data</p>

            {status === 'scraping' && (
              <div className="modal-status scraping">
                <span className="status-spinner"></span>
                Fetching data...
              </div>
            )}
            {status === 'success' && (
              <div className="modal-status success">
                <CheckCircle size={16} weight="duotone" /> Match added successfully!
              </div>
            )}
            {status === 'duplicate' && (
              <div className="modal-status warning">
                <Warning size={16} weight="duotone" /> {error}
              </div>
            )}
            {error && status !== 'duplicate' && (
              <div className="modal-status error">
                <XCircle size={16} weight="duotone" /> {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <MotionButton variant="ghost" type="button" onClick={onClose}>
              Cancel
            </MotionButton>
            <MotionButton variant="primary" type="submit" disabled={loading || !url.trim()}>
              {loading ? 'Fetching...' : 'Add Match'}
            </MotionButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Main HomePage Component
export default function HomePage({
  onMatchSelect,
  onNavigateToPlayer,
  summaryCache,
  summaryLoading,
  onRefreshSummary,
}) {
  const [selectedSport, setSelectedSport] = useState('tennis');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('matchWatchlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [expandedTournaments, setExpandedTournaments] = useState(new Set());

  // Real matches from database
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search term (wait 300ms after user stops typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch matches from backend - SINGLE QUERY (FILOSOFIA)
  // Backend fa tutto il merge con live data, frontend riceve dati pronti
  const fetchMatches = useCallback(async (search = '', date = null) => {
    if (search) {
      setIsSearching(true);
    } else {
      setMatchesLoading(true);
    }
    setMatchesError(null);

    try {
      // Build URL with search and date parameters
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      // Add date filter if provided
      if (date) {
        const dateStr = date.toISOString().split('T')[0];
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        params.append('dateFrom', dateStr);
        params.append('dateTo', nextDayStr);
      }

      // SINGLE FETCH - Backend does all the work (merge with live, status correction)
      const response = await fetch(apiUrl(`/api/matches/db?${params.toString()}`));
      if (!response.ok) throw new Error('Failed to fetch matches');
      const data = await response.json();

      // Data is ready from backend - just add defaults
      const matches = (data.matches || []).map((m) => ({
        ...m,
        edge: m.edge || 0,
        strategies: m.strategies || [],
      }));

      setMatches(matches);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setMatchesError(err.message);
    } finally {
      setMatchesLoading(false);
      setIsSearching(false);
    }
  }, []);

  // Fetch matches when selectedDate changes
  useEffect(() => {
    fetchMatches(debouncedSearch, selectedDate);
  }, [fetchMatches, selectedDate, debouncedSearch]);

  // Auto-refresh live matches every 15 seconds
  useEffect(() => {
    // Check if there are any live matches
    const hasLiveMatches = matches.some((m) => m.status === 'live');
    
    // Only poll if viewing today (live matches) or if we have live matches
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    
    if (!isToday && !hasLiveMatches) return;

    const pollInterval = setInterval(() => {
      console.log('[HomePage] Auto-refreshing live matches...');
      fetchMatches(debouncedSearch, selectedDate);
    }, 15000); // 15 seconds

    return () => clearInterval(pollInterval);
  }, [fetchMatches, debouncedSearch, selectedDate, matches]);

  // Demo alerts (in production, would come from WebSocket/backend)
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'READY',
      title: 'Double Break Strategy READY',
      description: 'Sinner vs Alcaraz - High confidence setup detected',
      time: '2 min ago',
      matchId: 123,
    },
    {
      id: 2,
      type: 'momentum',
      title: 'Momentum Shift Detected',
      description: 'Djokovic gaining momentum after break',
      time: '5 min ago',
      matchId: 124,
    },
  ]);

  const summary = summaryCache || { total: 0, byYearMonth: [], matches: [] };
  const loading = summaryLoading;

  // Save watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('matchWatchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Toggle watchlist
  const toggleWatchlist = useCallback((matchId) => {
    setWatchlist((prev) =>
      prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId]
    );
  }, []);

  // Dismiss alert
  const dismissAlert = useCallback((alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  // Filter and sort matches (date filter is done by backend). Default: sort by edge
  const filteredMatches = useMemo(() => {
    let result = [...matches];
    
    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((m) => m.status === filterStatus);
    }
    
    // Sort by edge
    result.sort((a, b) => (b.edge || 0) - (a.edge || 0));
    return result;
  }, [matches, filterStatus]);

  // Group matches by tournament
  const matchesByTournament = useMemo(() => {
    const groups = {};
    filteredMatches.forEach((match) => {
      // Build tournament key: "CATEGORY: Name, Surface"
      const category = match.tournamentCategory || 'ATP';
      const name = match.tournamentName || match.tournament || 'Unknown';
      const surface = match.surface || 'Unknown';
      
      // Build the label
      const tournamentLabel = `${category}: ${name}, ${surface.toLowerCase()}`;
      
      if (!groups[tournamentLabel]) {
        groups[tournamentLabel] = {
          label: tournamentLabel,
          category,
          name,
          surface,
          matches: [],
        };
      }
      groups[tournamentLabel].matches.push(match);
    });
    
    // Convert to array and sort by category then name
    return Object.values(groups).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });
  }, [filteredMatches]);

  // Toggle tournament expansion
  const toggleTournament = useCallback((tournamentLabel) => {
    setExpandedTournaments((prev) => {
      const next = new Set(prev);
      if (next.has(tournamentLabel)) {
        next.delete(tournamentLabel);
      } else {
        next.add(tournamentLabel);
      }
      return next;
    });
  }, []);

  // Watchlist matches
  const watchlistMatches = useMemo(() => {
    return matches.filter((m) => watchlist.includes(m.id));
  }, [matches, watchlist]);

  return (
    <div className="home-page-new">
      {/* Header */}
      <header className="home-header">
        <div className="home-header-left">
          <h1 className="home-title">
            <House size={28} weight="duotone" className="home-icon" />
            Trading Lobby
          </h1>
        </div>

        <div className="home-header-right">
          <MotionButton variant="ghost" onClick={onNavigateToPlayer}>
            <User size={18} /> Players
          </MotionButton>
          <MotionButton variant="ghost" onClick={() => setShowMonitoring(true)}>
            <ChartLineUp size={18} /> Monitor
          </MotionButton>
        </div>
      </header>

      {/* Main Content */}
      <div className="home-content">
        <SportSidebar selectedSport={selectedSport} onSelectSport={setSelectedSport} />

        <main className="home-main">
          {/* Search & Filter */}
          <SearchFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            isSearching={isSearching}
          />

          {/* Watchlist Section */}
          {watchlistMatches.length > 0 && (
            <section className="home-section watchlist-section">
              <h2 className="section-title">
                <Eye size={20} weight="duotone" />
                Watchlist
                <span className="section-count">{watchlistMatches.length}</span>
              </h2>
              <div className="matches-list">
                {watchlistMatches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    onSelect={onMatchSelect}
                    onToggleWatchlist={toggleWatchlist}
                    isWatched={true}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Live Matches Section */}
          <section className="home-section live-section">
            <div className="filter-bar">
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('all')}
                >
                  Tutte
                </button>
                <button
                  className={`filter-tab ${filterStatus === 'live' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('live')}
                >
                  Live
                </button>
                <button
                  className={`filter-tab ${filterStatus === 'finished' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('finished')}
                >
                  Conclusi
                </button>
                <button
                  className={`filter-tab ${filterStatus === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('upcoming')}
                >
                  Programma
                </button>
              </div>
              
              <div className="date-picker">
                <button
                  className="date-arrow"
                  onClick={() => setSelectedDate(d => {
                    const prev = new Date(d);
                    prev.setDate(prev.getDate() - 1);
                    return prev;
                  })}
                  title="Giorno precedente"
                >
                  <CaretLeft size={18} weight="bold" />
                </button>
                <span className="date-display">
                  {selectedDate.toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit'
                  }).replace(/\//g, '/')}
                </span>
                <button
                  className="date-arrow"
                  onClick={() => setSelectedDate(d => {
                    const next = new Date(d);
                    next.setDate(next.getDate() + 1);
                    return next;
                  })}
                  title="Giorno successivo"
                >
                  <CaretRight size={18} weight="bold" />
                </button>
              </div>
            </div>

            {matchesLoading ? (
              <div className="empty-state">
                <ArrowClockwise size={48} weight="duotone" className="spinning" />
                <p>Loading matches from database...</p>
              </div>
            ) : matchesError ? (
              <div className="empty-state error">
                <Warning size={48} weight="duotone" />
                <p>Error loading matches: {matchesError}</p>
                <MotionButton variant="ghost" onClick={() => window.location.reload()}>
                  Retry
                </MotionButton>
              </div>
            ) : matchesByTournament.length === 0 ? (
              <div className="empty-state">
                <TennisBall size={48} weight="duotone" />
                <p>No matches found</p>
                {searchTerm && (
                  <MotionButton variant="ghost" onClick={() => setSearchTerm('')}>
                    Clear search
                  </MotionButton>
                )}
              </div>
            ) : (
              <div className="tournaments-list">
                {matchesByTournament.map((tournament) => {
                  const isExpanded = expandedTournaments.has(tournament.label);
                  return (
                    <div key={tournament.label} className="tournament-group">
                      <button
                        className={`tournament-header ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleTournament(tournament.label)}
                      >
                        <CaretDown
                          size={16}
                          weight="bold"
                          className={`tournament-caret ${isExpanded ? 'expanded' : ''}`}
                        />
                        <span className="tournament-label">{tournament.label}</span>
                        <span className="tournament-count">{tournament.matches.length}</span>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            className="tournament-matches"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {tournament.matches.map((match) => (
                              <MatchRow
                                key={match.id}
                                match={match}
                                onSelect={onMatchSelect}
                                onToggleWatchlist={toggleWatchlist}
                                isWatched={watchlist.includes(match.id)}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>

        {/* Right Rail - Alerts Panel */}
        <aside className="home-alerts">
          <div className="alerts-header">
            <h3 className="alerts-title">
              <Bell size={18} weight="duotone" />
              Alerts & Signals
            </h3>
            {alerts.length > 0 && <span className="alerts-badge">{alerts.length}</span>}
          </div>

          <div className="alerts-list">
            <AnimatePresence>
              {alerts.length === 0 ? (
                <div className="empty-alerts">
                  <Bell size={32} weight="duotone" />
                  <p>No active alerts</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <AlertItem key={alert.id} alert={alert} onDismiss={dismissAlert} />
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="alerts-footer">
            <MotionButton variant="ghost" className="full-width">
              View Alert History
            </MotionButton>
          </div>
        </aside>
      </div>

      <MonitoringDashboard
        isOpen={showMonitoring}
        onClose={() => setShowMonitoring(false)}
        onMatchesUpdated={onRefreshSummary}
        onMatchSelect={onMatchSelect}
      />
    </div>
  );
}
