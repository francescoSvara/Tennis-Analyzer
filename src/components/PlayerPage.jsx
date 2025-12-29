/**
 * PLAYER PAGE
 *
 * Pagina dedicata al profilo giocatore con:
 * - Statistiche globali (win rate, matches)
 * - Breakdown per superficie
 * - Breakdown per formato (Bo3/Bo5)
 * - Breakdown per serie tornei
 * - Metriche speciali (comeback, tiebreak, deciding set)
 * - Form recente
 * - ROI betting
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  TennisBall,
  Trophy,
  ChartLineUp,
  Target,
  Fire,
  Coins,
  MagnifyingGlass,
  SpinnerGap,
  WarningCircle,
  Medal,
  ArrowUp,
  ArrowDown,
  Snowflake,
  Circle,
  Star,
  Crown,
  User,
  ArrowClockwise,
  NumberOne,
  NumberTwo,
  NumberThree,
  Percent,
  SoccerBall,
  CalendarBlank,
  Lightning,
  GlobeSimple,
  Ruler,
  Wrench,
  ArrowLeft,
  House,
  X,
} from '@phosphor-icons/react';
import { apiUrl } from '../config';
import { durations, easings } from '../motion/tokens';
import { MotionButton } from '../motion';
import './PlayerPage.css';

// ============================================================================
// STAT CARD COMPONENTS
// ============================================================================

function StatCard({ title, value, subtitle, trend, icon }) {
  const prefersReducedMotion = useReducedMotion();
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#8b95a5';

  // Mappa dei tipi icona a componenti Phosphor
  const iconMap = {
    trophy: Trophy,
    tennis: TennisBall,
    chart: ChartLineUp,
    target: Target,
    fire: Fire,
    medal: Medal,
    snowflake: Snowflake,
    coins: Coins,
    percent: Percent,
    lightning: Lightning,
    // Mantengo anche le emoji come fallback per retrocompatibilità
    '🏆': Trophy,
    '🎾': TennisBall,
    '📊': ChartLineUp,
    '🎯': Target,
    '💪': Fire,
    '1️⃣': Medal,
    '📈': ChartLineUp,
    '🔥': Fire,
    '📅': ChartLineUp,
    '❄️': Snowflake,
  };

  const IconComponent = iconMap[icon] || ChartLineUp;

  return (
    <motion.div
      className="stat-card"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.normal, ease: easings.premium }}
      whileHover={
        !prefersReducedMotion ? { y: -2, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)' } : {}
      }
    >
      <div className="stat-card-header">
        <IconComponent size={18} weight="duotone" className="stat-icon" />
        <span className="stat-title">{title}</span>
      </div>
      <div className="stat-value">
        {value}
        {trend && (
          <span className="stat-trend" style={{ color: trendColor }}>
            {trend === 'up' ? (
              <ArrowUp size={14} weight="bold" />
            ) : (
              <ArrowDown size={14} weight="bold" />
            )}
          </span>
        )}
      </div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </motion.div>
  );
}

function PercentBar({ value, label, color = '#3b82f6' }) {
  const percentage = Math.round(value * 100);

  return (
    <div className="percent-bar-container">
      <div className="percent-bar-header">
        <span className="percent-bar-label">{label}</span>
        <span className="percent-bar-value">{percentage}%</span>
      </div>
      <div className="percent-bar-track">
        <div
          className="percent-bar-fill"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function SurfaceCard({ surface, stats }) {
  const surfaceColors = {
    Hard: '#3b82f6',
    Clay: '#f97316',
    Grass: '#22c55e',
    Carpet: '#8b5cf6',
  };

  // Phosphor icons for surfaces
  const surfaceIcons = {
    Hard: <Circle size={16} weight="fill" color="#3b82f6" />,
    Clay: <Circle size={16} weight="fill" color="#f97316" />,
    Grass: <Circle size={16} weight="fill" color="#22c55e" />,
    Carpet: <Circle size={16} weight="fill" color="#8b5cf6" />,
  };

  const color = surfaceColors[surface] || '#6b7280';
  const icon = surfaceIcons[surface] || <Circle size={16} weight="fill" color="#6b7280" />;

  return (
    <motion.div
      className="surface-card"
      style={{ borderLeftColor: color }}
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ duration: durations.fast, ease: easings.premium }}
    >
      <div className="surface-header">
        <span className="surface-icon">{icon}</span>
        <span className="surface-name">{surface}</span>
        <span className="surface-matches">{stats.matches} matches</span>
      </div>
      <div className="surface-stats">
        <PercentBar value={stats.win_rate} label="Win Rate" color={color} />
        <div className="surface-record">
          <span className="wins">{stats.wins}W</span>
          <span className="losses">{stats.losses}L</span>
        </div>
      </div>
    </motion.div>
  );
}

function SeriesCard({ series, stats }) {
  const seriesRank = {
    'Grand Slam': 1,
    'Masters 1000': 2,
    ATP500: 3,
    ATP250: 4,
    'ATP Finals': 5,
  };

  const seriesColors = {
    'Grand Slam': '#fbbf24',
    'Masters 1000': '#f97316',
    ATP500: '#3b82f6',
    ATP250: '#8b95a5',
    'ATP Finals': '#a855f7',
  };

  // Icons for series
  const seriesIcons = {
    'Grand Slam': <Trophy size={18} weight="duotone" color="#fbbf24" />,
    'Masters 1000': <Medal size={18} weight="duotone" color="#f97316" />,
    ATP500: <Star size={18} weight="duotone" color="#3b82f6" />,
    ATP250: <TennisBall size={18} weight="duotone" color="#8b95a5" />,
    'ATP Finals': <Crown size={18} weight="duotone" color="#a855f7" />,
  };

  return (
    <motion.div
      className="series-card"
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ duration: durations.fast, ease: easings.premium }}
    >
      <div className="series-header">
        {seriesIcons[series] || <TennisBall size={18} weight="duotone" />}
        <span className="series-name">{series}</span>
        <span className="series-matches">{stats.matches} matches</span>
      </div>
      <PercentBar
        value={stats.win_rate}
        label="Win Rate"
        color={seriesColors[series] || '#6b7280'}
      />
    </motion.div>
  );
}

function RecentFormStreak({ results }) {
  return (
    <div className="form-streak">
      {results.map((result, idx) => (
        <motion.span
          key={idx}
          className={`form-result ${result === 'W' ? 'win' : 'loss'}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.05, duration: durations.fast }}
        >
          {result}
        </motion.span>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN PLAYER PAGE
// ============================================================================

export default function PlayerPage({ onBack }) {
  const [playerName, setPlayerName] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [surfaceFilter, setSurfaceFilter] = useState('');

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false); // Flag per evitare ri-fetch dopo selezione

  // Fetch suggestions for autocomplete
  const fetchSuggestions = useCallback(
    async (query) => {
      if (!query || query.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Non cercare se abbiamo appena selezionato un giocatore
      if (isSelecting) {
        setIsSelecting(false);
        return;
      }

      setSuggestionLoading(true);
      try {
        const url = apiUrl(`/api/players/search?q=${encodeURIComponent(query)}&limit=8`);
        const response = await fetch(url);
        const data = await response.json();

        setSuggestions(data || []);
        // Non mostrare se c'è solo 1 risultato che corrisponde esattamente
        if (data.length === 1 && data[0].name.toLowerCase() === query.toLowerCase()) {
          setShowSuggestions(false);
        } else {
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setSuggestions([]);
      } finally {
        setSuggestionLoading(false);
      }
    },
    [isSelecting]
  );

  // Handle input change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSuggestions(searchInput);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, fetchSuggestions]);

  // Select suggestion
  const selectSuggestion = (selectedName) => {
    setIsSelecting(true); // Previene ri-fetch
    setSearchInput(selectedName);
    setSuggestions([]);
    setShowSuggestions(false);
    setPlayerName(selectedName);
    fetchProfile(selectedName, surfaceFilter);
  };

  // Fetch profile
  const fetchProfile = useCallback(async (name, surface = '') => {
    if (!name) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (surface) params.append('surface', surface);

      const url = apiUrl(`/api/player/${encodeURIComponent(name)}/profile?${params}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setPlayerName(searchInput.trim());
      fetchProfile(searchInput.trim(), surfaceFilter);
    }
  };

  // Handle surface filter change
  const handleSurfaceChange = (surface) => {
    setSurfaceFilter(surface);
    if (playerName) {
      fetchProfile(playerName, surface);
    }
  };

  // Format percentage
  const formatPercent = (value) => {
    if (value === undefined || value === null) return '-';
    return `${Math.round(value * 100)}%`;
  };

  // Format ROI
  const formatROI = (roi) => {
    if (!roi) return '-';
    const sign = roi >= 0 ? '+' : '';
    return `${sign}${roi.toFixed(1)}%`;
  };

  return (
    <div className="player-page">
      {/* Header con ricerca */}
      <div className="player-page-header">
        <div className="header-left">
          {onBack && (
            <MotionButton variant="ghost" onClick={onBack} className="back-button">
              <ArrowLeft size={18} /> Back
            </MotionButton>
          )}
          <h1>
            <TennisBall size={28} weight="duotone" style={{ marginRight: 10, color: '#3b82f6' }} />
            Player Profile
          </h1>
        </div>
        {onBack && (
          <MotionButton variant="ghost" onClick={onBack} className="close-button-mobile">
            <X size={22} weight="bold" />
          </MotionButton>
        )}

        <form onSubmit={handleSearch} className="player-search-form">
          <div className="search-container">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                // Solo mostra dropdown se stiamo digitando e ci sono caratteri
                if (e.target.value.length >= 2) {
                  setShowSuggestions(true);
                } else {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => {
                // Mostra suggerimenti solo se ci sono e l'input ha >= 2 caratteri
                if (suggestions.length > 0 && searchInput.length >= 2 && !profile) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Cerca giocatore (es. Sinner, Alcaraz)..."
              className="player-search-input"
              autoComplete="off"
            />

            {/* Suggestions dropdown - mostra solo quando stiamo cercando, non quando abbiamo già un profilo */}
            <AnimatePresence>
              {showSuggestions &&
                !loading &&
                (suggestions.length > 0 || suggestionLoading || searchInput.length >= 2) && (
                  <motion.div
                    className="suggestions-dropdown"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: durations.fast, ease: easings.premium }}
                  >
                    {suggestionLoading && (
                      <div className="suggestion-item loading">
                        <SpinnerGap size={16} weight="bold" className="suggestion-spinner" />
                        Ricerca in corso...
                      </div>
                    )}
                    {!suggestionLoading &&
                      suggestions.length > 0 &&
                      suggestions.map((player, idx) => (
                        <motion.div
                          key={player.name || idx}
                          className="suggestion-item"
                          onClick={() => selectSuggestion(player.name)}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03, duration: durations.fast }}
                        >
                          <span className="suggestion-name">{player.name}</span>
                          <span className="suggestion-matches">{player.matchCount} match</span>
                        </motion.div>
                      ))}
                    {!suggestionLoading && suggestions.length === 0 && searchInput.length >= 2 && (
                      <div className="suggestion-item no-results">Nessun giocatore trovato</div>
                    )}
                  </motion.div>
                )}
            </AnimatePresence>
          </div>

          <motion.button
            type="submit"
            className="player-search-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <MagnifyingGlass size={18} weight="bold" style={{ marginRight: 6 }} />
            Cerca
          </motion.button>
        </form>
      </div>

      {/* Loading state */}
      {loading && (
        <motion.div className="loading-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <SpinnerGap size={40} className="loading-spinner" />
          <p>Caricamento profilo...</p>
        </motion.div>
      )}

      {/* Error state */}
      {error && (
        <motion.div
          className="error-container"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <WarningCircle size={24} weight="fill" style={{ marginRight: 8, color: '#ef4444' }} />
          <p>Errore: {error}</p>
        </motion.div>
      )}

      {/* No player selected */}
      {!loading && !error && !profile && (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: durations.slow, ease: easings.premium }}
        >
          <MagnifyingGlass size={48} weight="duotone" style={{ marginBottom: 16, opacity: 0.6 }} />
          <p>Inserisci il nome di un giocatore per visualizzare il profilo</p>
          <p className="hint">Prova: Sinner, Alcaraz, Djokovic, Medvedev...</p>
        </motion.div>
      )}

      {/* Profile content */}
      {profile && !profile.error && (
        <div className="profile-content">
          {/* Player header */}
          <div className="player-header-card">
            <h2>
              <TennisBall size={24} weight="duotone" style={{ marginRight: 8, color: '#10b981' }} />{' '}
              {playerName}
            </h2>
            <p className="matches-analyzed">
              <ChartLineUp size={14} weight="duotone" style={{ marginRight: 4 }} />{' '}
              {profile.player?.matches_analyzed || profile.statistics?.totalMatches || 0} partite
              analizzate
            </p>
            {surfaceFilter && <span className="surface-badge">{surfaceFilter}</span>}
          </div>

          {/* Global Stats Grid */}
          <section className="profile-section">
            <h3>
              <ChartLineUp size={18} weight="duotone" style={{ marginRight: 6 }} /> Statistiche
              Globali
            </h3>
            <div className="stats-grid">
              <StatCard
                title="Win Rate"
                value={formatPercent(profile.global?.win_rate)}
                subtitle={`${profile.global?.wins}W - ${profile.global?.losses}L`}
                icon="trophy"
              />
              <StatCard
                title="Total Matches"
                value={profile.global?.total_matches || 0}
                icon="tennis"
              />
              <StatCard
                title="Avg Sets/Match"
                value={(profile.global?.avg_sets_per_match || 0).toFixed(2)}
                icon="chart"
              />
              <StatCard
                title="Tiebreak Win"
                value={formatPercent(profile.global?.tiebreak_win_rate)}
                icon="target"
              />
            </div>
          </section>

          {/* Surface Breakdown */}
          {profile.by_surface && Object.keys(profile.by_surface).length > 0 && (
            <section className="profile-section">
              <h3>
                <GlobeSimple size={18} weight="duotone" style={{ marginRight: 6 }} /> Per Superficie
              </h3>
              <div className="surface-grid">
                {Object.entries(profile.by_surface)
                  .filter(([_, stats]) => stats.matches > 0)
                  .sort((a, b) => b[1].matches - a[1].matches)
                  .map(([surface, stats]) => (
                    <SurfaceCard key={surface} surface={surface} stats={stats} />
                  ))}
              </div>
            </section>
          )}

          {/* Format Breakdown */}
          {profile.by_format && (
            <section className="profile-section">
              <h3>
                <Ruler size={18} weight="duotone" style={{ marginRight: 6 }} /> Per Formato
              </h3>
              <div className="format-grid">
                {profile.by_format.best_of_3 && (
                  <div className="format-card">
                    <h4>Best of 3</h4>
                    <PercentBar
                      value={profile.by_format.best_of_3.win_rate}
                      label={`${profile.by_format.best_of_3.matches} matches`}
                      color="#3b82f6"
                    />
                  </div>
                )}
                {profile.by_format.best_of_5 && (
                  <div className="format-card">
                    <h4>Best of 5</h4>
                    <PercentBar
                      value={profile.by_format.best_of_5.win_rate}
                      label={`${profile.by_format.best_of_5.matches} matches`}
                      color="#f97316"
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Series Breakdown */}
          {profile.by_series && Object.keys(profile.by_series).length > 0 && (
            <section className="profile-section">
              <h3>
                <Medal size={18} weight="duotone" style={{ marginRight: 6 }} /> Per Livello Torneo
              </h3>
              <div className="series-grid">
                {Object.entries(profile.by_series)
                  .filter(([_, stats]) => stats.matches > 0)
                  .map(([series, stats]) => (
                    <SeriesCard key={series} series={series} stats={stats} />
                  ))}
              </div>
            </section>
          )}

          {/* Special Metrics */}
          {profile.special_metrics && (
            <section className="profile-section">
              <h3>
                <Target size={18} weight="duotone" style={{ marginRight: 6 }} /> Metriche Speciali
              </h3>
              <div className="stats-grid">
                <StatCard
                  title="Comeback Rate"
                  value={formatPercent(profile.special_metrics.comeback_rate)}
                  subtitle="Vittorie dopo aver perso il 1° set"
                  icon="fire"
                />
                <StatCard
                  title="1st Set Win Rate"
                  value={formatPercent(profile.special_metrics.first_set_win_rate)}
                  icon="medal"
                />
                <StatCard
                  title="Match Win After 1st Set"
                  value={formatPercent(profile.special_metrics.match_win_after_first_set)}
                  subtitle="Se vince il 1° set"
                  icon="chart"
                />
                <StatCard
                  title="Deciding Set Win"
                  value={formatPercent(profile.special_metrics.deciding_set_win_rate)}
                  subtitle={`${profile.special_metrics.deciding_set_wins || 0}/${
                    profile.special_metrics.deciding_set_matches || 0
                  }`}
                  icon="fire"
                />
              </div>
            </section>
          )}

          {/* Recent Form */}
          {profile.recent_form && (
            <section className="profile-section">
              <h3>
                <CalendarBlank size={18} weight="duotone" style={{ marginRight: 6 }} /> Form Recente
                (ultime {profile.recent_form.matches_count || 20} partite)
              </h3>
              <div className="recent-form-container">
                <div className="form-stats">
                  <StatCard
                    title="Win Rate Recente"
                    value={formatPercent(profile.recent_form.win_rate)}
                    trend={
                      profile.recent_form.trend === 'improving'
                        ? 'up'
                        : profile.recent_form.trend === 'declining'
                        ? 'down'
                        : null
                    }
                    icon="chart"
                  />
                  <StatCard
                    title="Trend"
                    value={profile.recent_form.trend || 'stable'}
                    icon="chart"
                  />
                  {profile.recent_form.current_streak && (
                    <StatCard
                      title="Streak Attuale"
                      value={`${profile.recent_form.current_streak.count}${profile.recent_form.current_streak.type}`}
                      icon={profile.recent_form.current_streak.type === 'W' ? 'fire' : 'snowflake'}
                    />
                  )}
                </div>
                {profile.recent_form.results && (
                  <div className="form-visual">
                    <RecentFormStreak results={profile.recent_form.results} />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ROI Section */}
          {profile.roi && (
            <section className="profile-section roi-section">
              <h3>
                <Coins size={18} weight="duotone" style={{ marginRight: 6, color: '#f59e0b' }} />{' '}
                ROI Analysis (Flat Stake)
              </h3>
              <div className="roi-container">
                <div className={`roi-value ${profile.roi.roi >= 0 ? 'positive' : 'negative'}`}>
                  {formatROI(profile.roi.roi_percent)}
                </div>
                <div className="roi-details">
                  <span>Scommesse: {profile.roi.bets_placed}</span>
                  <span>Puntata: {profile.roi.total_stake}u</span>
                  <span>Ritorno: {profile.roi.total_return}u</span>
                  <span className={profile.roi.profit >= 0 ? 'profit' : 'loss'}>
                    P/L: {profile.roi.profit >= 0 ? '+' : ''}
                    {profile.roi.profit}u
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Raw Data Debug (collapsible) */}
          <details className="raw-data-section">
            <summary>
              <Wrench size={14} weight="duotone" style={{ marginRight: 6 }} /> Raw Data (Debug)
            </summary>
            <pre>{JSON.stringify(profile, null, 2)}</pre>
          </details>

          {/* Metadata */}
          <div className="profile-metadata">
            <small>
              Calcolato:{' '}
              {profile.calculated_at ? new Date(profile.calculated_at).toLocaleString() : '-'}
              {profile.calculation_time_ms && ` (${profile.calculation_time_ms}ms)`}
            </small>
          </div>
        </div>
      )}

      {/* Profile error */}
      {profile && profile.error && (
        <div className="error-container">
          <p>
            <WarningCircle
              size={18}
              weight="duotone"
              style={{ marginRight: 6, color: '#f59e0b' }}
            />{' '}
            {profile.error}
          </p>
        </div>
      )}
    </div>
  );
}
