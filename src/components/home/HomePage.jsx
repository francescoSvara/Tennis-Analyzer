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
  const mainStrategy =
    match.strategies?.find((s) => s.status === 'READY') ||
    match.strategies?.find((s) => s.status === 'WATCH');

  // Format player name with rank
  const formatPlayer = (name, rank) => {
    if (rank) return `${name} (${rank})`;
    return name;
  };

  return (
    <MotionRow className="match-row" onClick={() => onSelect(match)}>
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

      <div className="match-info">
        <div className="match-players">
          <span className="player home">{formatPlayer(match.homePlayer, match.homeRank)}</span>
          <span className="vs">vs</span>
          <span className="player away">{formatPlayer(match.awayPlayer, match.awayRank)}</span>
        </div>
        <div className="match-meta">
          <span className="tournament">
            {match.tournament}
            {match.surface ? ` · ${match.surface}` : ''}
          </span>
          <StatusBadge status={match.status} />
        </div>
      </div>

      <div className="match-score">{match.score || '—'}</div>

      <div className="match-edge">
        <EdgeBadge edge={match.edge} />
      </div>

      <div className="match-strategy">
        {mainStrategy && <StrategyPill status={mainStrategy.status} name={mainStrategy.name} />}
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
function SearchFilterBar({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  filterStatus,
  onFilterChange,
  isSearching,
}) {
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

      <div className="filter-group">
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => onFilterChange(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="live">Live Only</option>
          <option value="upcoming">Upcoming</option>
          <option value="finished">Finished</option>
        </select>

        <select
          className="filter-select sort"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="edge">Sort by Edge</option>
          <option value="time">Sort by Time</option>
          <option value="tournament">Sort by Tournament</option>
        </select>
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
  const [sortBy, setSortBy] = useState('edge');
  const [filterStatus, setFilterStatus] = useState('all');
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('matchWatchlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [showMonitoring, setShowMonitoring] = useState(false);

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

  // Fetch matches from backend - with search parameter
  const fetchMatches = useCallback(async (search = '') => {
    if (search) {
      setIsSearching(true);
    } else {
      setMatchesLoading(true);
    }
    setMatchesError(null);

    try {
      // Build URL with search parameter if provided
      const params = new URLSearchParams();
      params.append('limit', search ? '50' : '20'); // More results when searching
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(apiUrl(`/api/matches/db?${params.toString()}`));
      if (!response.ok) throw new Error('Failed to fetch matches');
      const data = await response.json();

      // Data is already in the right format from backend
      const transformed = (data.matches || []).map((m) => ({
        ...m,
        // Ensure all expected fields exist
        edge: m.edge || 0,
        strategies: m.strategies || [],
      }));

      setMatches(transformed);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setMatchesError(err.message);
    } finally {
      setMatchesLoading(false);
      setIsSearching(false);
    }
  }, []);

  // Initial load - fetch recent matches
  useEffect(() => {
    fetchMatches('');
  }, [fetchMatches]);

  // Fetch matches when debounced search changes
  useEffect(() => {
    fetchMatches(debouncedSearch);
  }, [debouncedSearch, fetchMatches]);

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

  // Filter and sort matches (search is done by backend, only do local status filtering and sorting)
  const filteredMatches = useMemo(() => {
    let result = [...matches];

    // Note: Search filtering is now done by the backend API
    // We only do local filtering for status here

    // Filter by status (local filter since backend doesn't support status filter yet)
    if (filterStatus !== 'all') {
      result = result.filter((m) => m.status === filterStatus);
    }

    // Sort
    switch (sortBy) {
      case 'edge':
        result.sort((a, b) => (b.edge || 0) - (a.edge || 0));
        break;
      case 'time': {
        const statusOrder = { live: 0, upcoming: 1, finished: 2 };
        result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
        break;
      }
      case 'tournament':
        result.sort((a, b) => (a.tournament || '').localeCompare(b.tournament || ''));
        break;
    }

    return result;
  }, [matches, searchTerm, filterStatus, sortBy]);

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
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
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
            <h2 className="section-title">
              <TennisBall size={20} weight="duotone" />
              {filterStatus === 'all'
                ? 'All Matches'
                : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Matches`}
              <span className="section-count">
                {matchesLoading ? '...' : filteredMatches.length}
              </span>
              {sortBy === 'edge' && (
                <span className="sort-indicator">
                  <TrendUp size={14} /> Sorted by Edge
                </span>
              )}
            </h2>

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
            ) : filteredMatches.length === 0 ? (
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
              <div className="matches-list">
                {filteredMatches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    onSelect={onMatchSelect}
                    onToggleWatchlist={toggleWatchlist}
                    isWatched={watchlist.includes(match.id)}
                  />
                ))}
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
