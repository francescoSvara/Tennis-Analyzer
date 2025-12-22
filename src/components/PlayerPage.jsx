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
import { apiUrl } from '../config';
import './PlayerPage.css';

// ============================================================================
// STAT CARD COMPONENTS
// ============================================================================

function StatCard({ title, value, subtitle, trend, icon }) {
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#8b95a5';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        {icon && <span className="stat-icon">{icon}</span>}
        <span className="stat-title">{title}</span>
      </div>
      <div className="stat-value">
        {value}
        {trend && <span className="stat-trend" style={{ color: trendColor }}>{trendIcon}</span>}
      </div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
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
    'Hard': '#3b82f6',
    'Clay': '#f97316',
    'Grass': '#22c55e',
    'Carpet': '#8b5cf6'
  };
  
  const surfaceIcons = {
    'Hard': '🔵',
    'Clay': '🟤',
    'Grass': '🟢',
    'Carpet': '🟣'
  };
  
  const color = surfaceColors[surface] || '#6b7280';
  const icon = surfaceIcons[surface] || '⚪';
  
  return (
    <div className="surface-card" style={{ borderLeftColor: color }}>
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
    </div>
  );
}

function SeriesCard({ series, stats }) {
  const seriesRank = {
    'Grand Slam': 1,
    'Masters 1000': 2,
    'ATP500': 3,
    'ATP250': 4,
    'ATP Finals': 5
  };
  
  const seriesColors = {
    'Grand Slam': '#fbbf24',
    'Masters 1000': '#f97316',
    'ATP500': '#3b82f6',
    'ATP250': '#8b95a5',
    'ATP Finals': '#a855f7'
  };
  
  return (
    <div className="series-card">
      <div className="series-header">
        <span className="series-name">{series}</span>
        <span className="series-matches">{stats.matches} matches</span>
      </div>
      <PercentBar 
        value={stats.win_rate} 
        label="Win Rate" 
        color={seriesColors[series] || '#6b7280'} 
      />
    </div>
  );
}

function RecentFormStreak({ results }) {
  return (
    <div className="form-streak">
      {results.map((result, idx) => (
        <span 
          key={idx} 
          className={`form-result ${result === 'W' ? 'win' : 'loss'}`}
        >
          {result}
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN PLAYER PAGE
// ============================================================================

export default function PlayerPage() {
  const [playerName, setPlayerName] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [surfaceFilter, setSurfaceFilter] = useState('');
  
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
        <h1>🎾 Player Profile</h1>
        
        <form onSubmit={handleSearch} className="player-search-form">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cerca giocatore (es. Sinner, Alcaraz)..."
            className="player-search-input"
          />
          <button type="submit" className="player-search-btn">
            🔍 Cerca
          </button>
        </form>
        
        {/* Surface filter */}
        <div className="surface-filters">
          <button 
            className={`filter-btn ${surfaceFilter === '' ? 'active' : ''}`}
            onClick={() => handleSurfaceChange('')}
          >
            All
          </button>
          <button 
            className={`filter-btn hard ${surfaceFilter === 'Hard' ? 'active' : ''}`}
            onClick={() => handleSurfaceChange('Hard')}
          >
            🔵 Hard
          </button>
          <button 
            className={`filter-btn clay ${surfaceFilter === 'Clay' ? 'active' : ''}`}
            onClick={() => handleSurfaceChange('Clay')}
          >
            🟤 Clay
          </button>
          <button 
            className={`filter-btn grass ${surfaceFilter === 'Grass' ? 'active' : ''}`}
            onClick={() => handleSurfaceChange('Grass')}
          >
            🟢 Grass
          </button>
        </div>
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Caricamento profilo...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="error-container">
          <p>❌ Errore: {error}</p>
        </div>
      )}
      
      {/* No player selected */}
      {!loading && !error && !profile && (
        <div className="empty-state">
          <p>🔍 Inserisci il nome di un giocatore per visualizzare il profilo</p>
          <p className="hint">Prova: Sinner, Alcaraz, Djokovic, Medvedev...</p>
        </div>
      )}
      
      {/* Profile content */}
      {profile && !profile.error && (
        <div className="profile-content">
          {/* Player header */}
          <div className="player-header-card">
            <h2>{profile.player?.name}</h2>
            <p className="matches-analyzed">
              📊 {profile.player?.matches_analyzed || 0} partite analizzate
            </p>
            {surfaceFilter && (
              <span className="surface-badge">{surfaceFilter}</span>
            )}
          </div>
          
          {/* Global Stats Grid */}
          <section className="profile-section">
            <h3>📈 Statistiche Globali</h3>
            <div className="stats-grid">
              <StatCard 
                title="Win Rate"
                value={formatPercent(profile.global?.win_rate)}
                subtitle={`${profile.global?.wins}W - ${profile.global?.losses}L`}
                icon="🏆"
              />
              <StatCard 
                title="Total Matches"
                value={profile.global?.total_matches || 0}
                icon="🎾"
              />
              <StatCard 
                title="Avg Sets/Match"
                value={(profile.global?.avg_sets_per_match || 0).toFixed(2)}
                icon="📊"
              />
              <StatCard 
                title="Tiebreak Win"
                value={formatPercent(profile.global?.tiebreak_win_rate)}
                icon="🎯"
              />
            </div>
          </section>
          
          {/* Surface Breakdown */}
          {profile.by_surface && Object.keys(profile.by_surface).length > 0 && (
            <section className="profile-section">
              <h3>🌍 Per Superficie</h3>
              <div className="surface-grid">
                {Object.entries(profile.by_surface)
                  .filter(([_, stats]) => stats.matches > 0)
                  .sort((a, b) => b[1].matches - a[1].matches)
                  .map(([surface, stats]) => (
                    <SurfaceCard key={surface} surface={surface} stats={stats} />
                  ))
                }
              </div>
            </section>
          )}
          
          {/* Format Breakdown */}
          {profile.by_format && (
            <section className="profile-section">
              <h3>📏 Per Formato</h3>
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
              <h3>🏅 Per Livello Torneo</h3>
              <div className="series-grid">
                {Object.entries(profile.by_series)
                  .filter(([_, stats]) => stats.matches > 0)
                  .map(([series, stats]) => (
                    <SeriesCard key={series} series={series} stats={stats} />
                  ))
                }
              </div>
            </section>
          )}
          
          {/* Special Metrics */}
          {profile.special_metrics && (
            <section className="profile-section">
              <h3>🎯 Metriche Speciali</h3>
              <div className="stats-grid">
                <StatCard 
                  title="Comeback Rate"
                  value={formatPercent(profile.special_metrics.comeback_rate)}
                  subtitle="Vittorie dopo aver perso il 1° set"
                  icon="💪"
                />
                <StatCard 
                  title="1st Set Win Rate"
                  value={formatPercent(profile.special_metrics.first_set_win_rate)}
                  icon="1️⃣"
                />
                <StatCard 
                  title="Match Win After 1st Set"
                  value={formatPercent(profile.special_metrics.match_win_after_first_set)}
                  subtitle="Se vince il 1° set"
                  icon="📈"
                />
                <StatCard 
                  title="Deciding Set Win"
                  value={formatPercent(profile.special_metrics.deciding_set_win_rate)}
                  subtitle={`${profile.special_metrics.deciding_set_wins || 0}/${profile.special_metrics.deciding_set_matches || 0}`}
                  icon="🔥"
                />
              </div>
            </section>
          )}
          
          {/* Recent Form */}
          {profile.recent_form && (
            <section className="profile-section">
              <h3>📅 Form Recente (ultime {profile.recent_form.matches_count || 20} partite)</h3>
              <div className="recent-form-container">
                <div className="form-stats">
                  <StatCard 
                    title="Win Rate Recente"
                    value={formatPercent(profile.recent_form.win_rate)}
                    trend={profile.recent_form.trend === 'improving' ? 'up' : 
                           profile.recent_form.trend === 'declining' ? 'down' : null}
                    icon="📊"
                  />
                  <StatCard 
                    title="Trend"
                    value={profile.recent_form.trend || 'stable'}
                    icon="📈"
                  />
                  {profile.recent_form.current_streak && (
                    <StatCard 
                      title="Streak Attuale"
                      value={`${profile.recent_form.current_streak.count}${profile.recent_form.current_streak.type}`}
                      icon={profile.recent_form.current_streak.type === 'W' ? '🔥' : '❄️'}
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
              <h3>💰 ROI Analysis (Flat Stake)</h3>
              <div className="roi-container">
                <div className={`roi-value ${profile.roi.roi >= 0 ? 'positive' : 'negative'}`}>
                  {formatROI(profile.roi.roi_percent)}
                </div>
                <div className="roi-details">
                  <span>Scommesse: {profile.roi.bets_placed}</span>
                  <span>Puntata: {profile.roi.total_stake}u</span>
                  <span>Ritorno: {profile.roi.total_return}u</span>
                  <span className={profile.roi.profit >= 0 ? 'profit' : 'loss'}>
                    P/L: {profile.roi.profit >= 0 ? '+' : ''}{profile.roi.profit}u
                  </span>
                </div>
              </div>
            </section>
          )}
          
          {/* Raw Data Debug (collapsible) */}
          <details className="raw-data-section">
            <summary>🔧 Raw Data (Debug)</summary>
            <pre>{JSON.stringify(profile, null, 2)}</pre>
          </details>
          
          {/* Metadata */}
          <div className="profile-metadata">
            <small>
              Calcolato: {profile.calculated_at ? new Date(profile.calculated_at).toLocaleString() : '-'}
              {profile.calculation_time_ms && ` (${profile.calculation_time_ms}ms)`}
            </small>
          </div>
        </div>
      )}
      
      {/* Profile error */}
      {profile && profile.error && (
        <div className="error-container">
          <p>⚠️ {profile.error}</p>
        </div>
      )}
    </div>
  );
}
