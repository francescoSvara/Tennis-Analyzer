import React, { useState, useEffect, useCallback } from 'react';
import './ManualPredictor.css';
import { apiUrl } from '../config';

/**
 * ManualPredictor - Componente standalone per predizioni manuali
 * Permette di selezionare due giocatori qualsiasi e confrontare le loro statistiche
 * Utilizzato nella MonitoringDashboard
 */

// ============================================
// PLAYER SEARCH COMPONENT
// ============================================
function PlayerSearch({ label, selectedPlayer, onSelect, placeholder, className }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = React.useRef(null);
  const dropdownRef = React.useRef(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = apiUrl(`/api/player/search?q=${encodeURIComponent(query)}&limit=10`);
        console.log('[ManualPredictor] Searching:', url);
        const res = await fetch(url);
        const data = await res.json();
        console.log('[ManualPredictor] Search result:', data);
        
        if (res.ok) {
          setResults(data.players || []);
          setShowDropdown(true);
          if (data.players?.length === 0) {
            setError('Nessun giocatore trovato');
          }
        } else {
          setError(data.error || 'Errore ricerca');
        }
      } catch (err) {
        console.error('[ManualPredictor] Search error:', err);
        setError('Errore connessione: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (player) => {
    console.log('[ManualPredictor] Selected player:', player);
    onSelect(player);
    setQuery('');
    setShowDropdown(false);
    setResults([]);
    setError(null);
  };

  return (
    <div className={`player-search ${className || ''}`}>
      <label className="search-label">{label}</label>
      
      {selectedPlayer ? (
        <div className="selected-player">
          <span className="selected-name">{selectedPlayer.name}</span>
          <span className="selected-matches">{selectedPlayer.totalMatches || '?'} match</span>
          <button 
            className="clear-btn"
            onClick={() => onSelect(null)}
            title="Rimuovi giocatore"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="search-input-container">
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder={placeholder || "Cerca giocatore..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
          />
          {isLoading && <span className="search-spinner">⌛</span>}
          
          {showDropdown && results.length > 0 && (
            <ul className="search-dropdown" ref={dropdownRef}>
              {results.map((player, idx) => (
                <li 
                  key={idx} 
                  className="search-result"
                  onClick={() => handleSelect(player)}
                >
                  <span className="result-name">{player.name}</span>
                  <span className="result-meta">
                    {player.totalMatches} match • {((player.winRate || 0) * 100).toFixed(0)}% WR
                  </span>
                </li>
              ))}
            </ul>
          )}
          
          {error && <div className="search-error">{error}</div>}
        </div>
      )}
    </div>
  );
}

// ============================================
// DEBUG INFO COMPONENT
// ============================================
function DebugInfo({ label, data }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="debug-info">
      <button 
        className="debug-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        🔍 {label} {expanded ? '▼' : '▶'}
      </button>
      {expanded && (
        <pre className="debug-content">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ============================================
// STAT ROW COMPONENT (legacy)
// ============================================
function StatRow({ label, homeValue, awayValue, format = 'auto' }) {
  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';
    if (format === 'percent') return `${(val * 100).toFixed(1)}%`;
    if (format === 'number') return val.toFixed(0);
    if (typeof val === 'number') {
      if (val >= 0 && val <= 1) return `${(val * 100).toFixed(1)}%`;
      return val.toFixed(2);
    }
    return String(val);
  };

  return (
    <div className="stat-row">
      <span className="stat-value home">{formatValue(homeValue)}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-value away">{formatValue(awayValue)}</span>
    </div>
  );
}

// ============================================
// COMPARISON ROW - Enhanced side-by-side
// ============================================
function ComparisonRow({ label, homeValue, awayValue, format = 'auto', higherIsBetter = null }) {
  const formatValue = (val) => {
    if (val === null || val === undefined) return '-';
    if (format === 'percent') {
      const num = typeof val === 'number' ? val : parseFloat(val);
      if (num >= 0 && num <= 1) return `${(num * 100).toFixed(1)}%`;
      return `${num.toFixed(1)}%`;
    }
    if (format === 'number') return Math.round(val).toString();
    if (typeof val === 'number') {
      if (val >= 0 && val <= 1) return `${(val * 100).toFixed(1)}%`;
      return val.toFixed(1);
    }
    return String(val);
  };

  // Determina chi è "migliore" se higherIsBetter è specificato
  const getWinnerClass = (isHome) => {
    if (higherIsBetter === null) return '';
    if (homeValue === null || awayValue === null) return '';
    
    const homeNum = parseFloat(homeValue) || 0;
    const awayNum = parseFloat(awayValue) || 0;
    
    if (homeNum === awayNum) return '';
    
    if (higherIsBetter) {
      return isHome ? (homeNum > awayNum ? 'winner' : 'loser') : (awayNum > homeNum ? 'winner' : 'loser');
    } else {
      return isHome ? (homeNum < awayNum ? 'winner' : 'loser') : (awayNum < homeNum ? 'winner' : 'loser');
    }
  };

  return (
    <div className="comparison-row">
      <div className={`comparison-value home ${getWinnerClass(true)}`}>
        {formatValue(homeValue)}
      </div>
      <div className="comparison-label">{label}</div>
      <div className={`comparison-value away ${getWinnerClass(false)}`}>
        {formatValue(awayValue)}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function ManualPredictor() {
  const [homePlayer, setHomePlayer] = useState(null);
  const [awayPlayer, setAwayPlayer] = useState(null);
  const [homeStats, setHomeStats] = useState(null);
  const [awayStats, setAwayStats] = useState(null);
  const [h2hStats, setH2hStats] = useState(null);
  const [loading, setLoading] = useState({ home: false, away: false, h2h: false, calc: false });
  const [surface, setSurface] = useState('all');
  const [format, setFormat] = useState('all');
  const [calculated, setCalculated] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Reset calculation when players change
  useEffect(() => {
    setCalculated(false);
    setHomeStats(null);
    setAwayStats(null);
    setH2hStats(null);
  }, [homePlayer, awayPlayer, surface, format]);

  // Fetch player stats
  const fetchPlayerStats = async (player, type) => {
    if (!player) return null;

    try {
      const params = new URLSearchParams();
      if (surface !== 'all') params.append('surface', surface);
      if (format !== 'all') params.append('format', format);
      
      const url = apiUrl(`/api/player/${encodeURIComponent(player.name)}/stats?${params}`);
      console.log(`[ManualPredictor] Fetching ${type} stats:`, url);
      
      const res = await fetch(url);
      const data = await res.json();
      console.log(`[ManualPredictor] ${type} stats response:`, data);
      
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      
      return data;
    } catch (err) {
      console.error(`[ManualPredictor] Error fetching ${type} stats:`, err);
      throw err;
    }
  };

  // Fetch H2H
  const fetchH2H = async () => {
    if (!homePlayer || !awayPlayer) return null;

    try {
      const params = new URLSearchParams({
        player1: homePlayer.name,
        player2: awayPlayer.name
      });
      
      const url = apiUrl(`/api/player/h2h?${params}`);
      console.log('[ManualPredictor] Fetching H2H:', url);
      
      const res = await fetch(url);
      const data = await res.json();
      console.log('[ManualPredictor] H2H response:', data);
      
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      
      return data;
    } catch (err) {
      console.error('[ManualPredictor] Error fetching H2H:', err);
      throw err;
    }
  };

  // MAIN CALCULATE BUTTON HANDLER
  const handleCalculate = async () => {
    if (!homePlayer || !awayPlayer) {
      setApiError('Seleziona entrambi i giocatori');
      return;
    }

    setLoading({ home: true, away: true, h2h: true, calc: true });
    setApiError(null);
    setCalculated(false);

    try {
      // Fetch all data in parallel
      const [home, away, h2h] = await Promise.all([
        fetchPlayerStats(homePlayer, 'home'),
        fetchPlayerStats(awayPlayer, 'away'),
        fetchH2H()
      ]);

      setHomeStats(home);
      setAwayStats(away);
      setH2hStats(h2h);
      setCalculated(true);
    } catch (err) {
      setApiError('Errore nel calcolo: ' + err.message);
    } finally {
      setLoading({ home: false, away: false, h2h: false, calc: false });
    }
  };

  // Calculate prediction from stats
  const calculatePrediction = () => {
    if (!homeStats || !awayStats) return null;

    // Estrai i dati dalle stats
    const homeWR = homeStats.overall?.win_rate || homeStats.winRate || 0;
    const awayWR = awayStats.overall?.win_rate || awayStats.winRate || 0;
    const homeMatches = homeStats.overall?.total_matches || homeStats.totalMatches || 0;
    const awayMatches = awayStats.overall?.total_matches || awayStats.totalMatches || 0;
    const homeComeback = homeStats.overall?.comeback_rate || 0;
    const awayComeback = awayStats.overall?.comeback_rate || 0;

    // Weight by number of matches (more data = more reliable)
    const homeWeight = Math.min(homeMatches / 50, 1);
    const awayWeight = Math.min(awayMatches / 50, 1);

    // H2H bonus
    let h2hBonus = { home: 0, away: 0 };
    if (h2hStats && h2hStats.totalMatches > 0) {
      const h2hHomeWR = (h2hStats.player1Wins || 0) / h2hStats.totalMatches;
      h2hBonus.home = (h2hHomeWR - 0.5) * 0.15;
      h2hBonus.away = ((1 - h2hHomeWR) - 0.5) * 0.15;
    }

    // Comeback rate bonus
    const homeComebackBonus = homeComeback * 0.1;
    const awayComebackBonus = awayComeback * 0.1;

    // Calculate weighted probabilities
    let homeProb = homeWR * homeWeight + h2hBonus.home + homeComebackBonus;
    let awayProb = awayWR * awayWeight + h2hBonus.away + awayComebackBonus;

    // Normalize to 100%
    const total = homeProb + awayProb || 1;
    homeProb = homeProb / total;
    awayProb = awayProb / total;

    // Calculate confidence (based on data quality)
    const dataQuality = (homeWeight + awayWeight) / 2;
    const h2hQuality = h2hStats?.totalMatches ? Math.min(h2hStats.totalMatches / 5, 1) : 0;
    const confidence = dataQuality * 0.7 + h2hQuality * 0.3;

    return {
      homeProb,
      awayProb,
      confidence,
      favorite: homeProb > awayProb ? homePlayer.name : awayPlayer.name,
      edge: Math.abs(homeProb - awayProb),
      // Debug data
      _debug: {
        homeWR, awayWR, homeMatches, awayMatches, homeWeight, awayWeight,
        h2hBonus, homeComebackBonus, awayComebackBonus
      }
    };
  };

  const prediction = calculated ? calculatePrediction() : null;
  const bothPlayersSelected = homePlayer && awayPlayer;

  return (
    <div className="manual-predictor">
      <div className="predictor-header">
        <h2><span className="predictor-icon">🔮</span> Manual Predictor</h2>
        <p className="predictor-subtitle">
          Seleziona due giocatori e clicca "Calcola" per confrontare le statistiche
        </p>
      </div>

      {/* Filters */}
      <div className="predictor-filters">
        <div className="filter-group">
          <label>Superficie</label>
          <select value={surface} onChange={(e) => setSurface(e.target.value)}>
            <option value="all">Tutte</option>
            <option value="Hard">Hard</option>
            <option value="Clay">Clay</option>
            <option value="Grass">Grass</option>
            <option value="Indoor Hard">Indoor Hard</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Formato</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="all">Tutti</option>
            <option value="best-of-3">Best of 3</option>
            <option value="best-of-5">Best of 5</option>
          </select>
        </div>
      </div>

      {/* Player Selection */}
      <div className="player-selection">
        <PlayerSearch 
          label="Giocatore 1"
          selectedPlayer={homePlayer}
          onSelect={setHomePlayer}
          placeholder="Cerca giocatore..."
          className="home"
        />
        
        <div className="vs-badge">VS</div>
        
        <PlayerSearch 
          label="Giocatore 2"
          selectedPlayer={awayPlayer}
          onSelect={setAwayPlayer}
          placeholder="Cerca giocatore..."
          className="away"
        />
      </div>

      {/* CALCULATE BUTTON */}
      <div className="calculate-section">
        <button 
          className={`calculate-btn ${loading.calc ? 'loading' : ''} ${bothPlayersSelected ? 'ready' : 'disabled'}`}
          onClick={handleCalculate}
          disabled={!bothPlayersSelected || loading.calc}
        >
          {loading.calc ? (
            <>
              <span className="btn-spinner"></span>
              Calcolo in corso...
            </>
          ) : (
            <>
              🎯 CALCOLA PREVISIONE
            </>
          )}
        </button>
        
        {apiError && (
          <div className="api-error">
            ❌ {apiError}
          </div>
        )}
      </div>

      {/* RESULTS - Always show structure when calculated */}
      {calculated && (
        <>
          {/* Stats Comparison - UNIFIED */}
          <div className="stats-comparison">
            <h3 className="section-title">
              <span className="section-icon">📊</span>
              Confronto Statistiche
            </h3>
            
            {/* Header con nomi giocatori */}
            <div className="comparison-header">
              <span className="player-name home">{homePlayer?.name}</span>
              <span className="vs-divider">vs</span>
              <span className="player-name away">{awayPlayer?.name}</span>
            </div>
            
            {/* Stats unificate */}
            <div className="comparison-table">
              <ComparisonRow 
                label="Win Rate" 
                homeValue={homeStats?.overall?.win_rate} 
                awayValue={awayStats?.overall?.win_rate} 
                format="percent"
                higherIsBetter={true}
              />
              <ComparisonRow 
                label="Partite Giocate" 
                homeValue={homeStats?.overall?.total_matches} 
                awayValue={awayStats?.overall?.total_matches} 
                format="number"
              />
              <ComparisonRow 
                label="Vittorie" 
                homeValue={homeStats?.overall?.wins} 
                awayValue={awayStats?.overall?.wins} 
                format="number"
                higherIsBetter={true}
              />
              <ComparisonRow 
                label="Sconfitte" 
                homeValue={homeStats?.overall?.losses} 
                awayValue={awayStats?.overall?.losses} 
                format="number"
                higherIsBetter={false}
              />
              <ComparisonRow 
                label="Comeback Rate" 
                homeValue={homeStats?.overall?.comeback_rate} 
                awayValue={awayStats?.overall?.comeback_rate} 
                format="percent"
                higherIsBetter={true}
              />
              <ComparisonRow 
                label="ROI" 
                homeValue={homeStats?.overall?.roi?.roi} 
                awayValue={awayStats?.overall?.roi?.roi} 
                format="percent"
                higherIsBetter={true}
              />
            </div>
            
            {/* Debug toggle */}
            <div className="debug-row">
              <DebugInfo label="Raw Home" data={homeStats} />
              <DebugInfo label="Raw Away" data={awayStats} />
            </div>
          </div>

          {/* H2H Section - Enhanced */}
          <div className="h2h-section">
            <h3 className="section-title">
              <span className="section-icon">⚔️</span>
              Head to Head
            </h3>
            
            {h2hStats && h2hStats.totalMatches > 0 ? (
              <div className="h2h-content-enhanced">
                {/* Score centrale grande */}
                <div className="h2h-main-score">
                  <div className="h2h-side home">
                    <span className="h2h-name">{homePlayer?.name}</span>
                    <span className="h2h-wins">{h2hStats.player1Wins || 0}</span>
                  </div>
                  <div className="h2h-center">
                    <span className="h2h-dash">-</span>
                  </div>
                  <div className="h2h-side away">
                    <span className="h2h-wins">{h2hStats.player2Wins || 0}</span>
                    <span className="h2h-name">{awayPlayer?.name}</span>
                  </div>
                </div>
                
                {/* Barra visuale */}
                <div className="h2h-bar-container">
                  <div 
                    className="h2h-bar home"
                    style={{ 
                      width: h2hStats.totalMatches > 0 
                        ? `${(h2hStats.player1Wins / h2hStats.totalMatches) * 100}%`
                        : '50%'
                    }}
                  />
                  <div 
                    className="h2h-bar away"
                    style={{ 
                      width: h2hStats.totalMatches > 0 
                        ? `${(h2hStats.player2Wins / h2hStats.totalMatches) * 100}%`
                        : '50%'
                    }}
                  />
                </div>
                
                {/* Info aggiuntive */}
                <div className="h2h-meta">
                  <span className="h2h-total-matches">
                    📊 {h2hStats.totalMatches} incontri totali
                  </span>
                  {h2hStats.player1Wins !== h2hStats.player2Wins && (
                    <span className="h2h-leader">
                      👑 Leader: <strong>
                        {h2hStats.player1Wins > h2hStats.player2Wins ? homePlayer?.name : awayPlayer?.name}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="h2h-empty">
                <span className="h2h-empty-icon">🤝</span>
                <p>Nessun precedente H2H nel database</p>
                <small>Questi giocatori non si sono mai affrontati (nei dati disponibili)</small>
              </div>
            )}
            <DebugInfo label="Raw H2H Data" data={h2hStats} />
          </div>

          {/* Prediction Summary */}
          <div className={`prediction-summary ${
            prediction ? (
              prediction.confidence > 0.7 ? 'high' : 
              prediction.confidence > 0.4 ? 'medium' : 'low'
            ) : ''
          }`}>
            <h3 className="section-title">
              <span className="section-icon">🎯</span>
              Previsione
            </h3>
            
            {prediction ? (
              <>
                <div className="prediction-bars">
                  <div className="prediction-player home">
                    <span className="prediction-name">{homePlayer?.name}</span>
                    <div className="prediction-bar-container">
                      <div 
                        className="prediction-bar"
                        style={{ width: `${prediction.homeProb * 100}%` }}
                      />
                    </div>
                    <span className="prediction-prob">{(prediction.homeProb * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div className="prediction-player away">
                    <span className="prediction-name">{awayPlayer?.name}</span>
                    <div className="prediction-bar-container">
                      <div 
                        className="prediction-bar"
                        style={{ width: `${prediction.awayProb * 100}%` }}
                      />
                    </div>
                    <span className="prediction-prob">{(prediction.awayProb * 100).toFixed(1)}%</span>
                  </div>
                </div>
                
                <div className="prediction-footer">
                  <span className="prediction-favorite">
                    Favorito: <strong>{prediction.favorite}</strong>
                  </span>
                  <span className={`prediction-confidence ${
                    prediction.confidence > 0.7 ? 'high' : 
                    prediction.confidence > 0.4 ? 'medium' : 'low'
                  }`}>
                    Affidabilità: {(prediction.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                
                <DebugInfo label="Prediction Debug" data={prediction._debug} />
              </>
            ) : (
              <div className="prediction-empty">
                <p>⚠️ Impossibile calcolare previsione</p>
                <small>Dati insufficienti per uno o entrambi i giocatori</small>
              </div>
            )}
            
            <p className="prediction-disclaimer">
              ⚠️ Previsione basata su dati storici. Non costituisce consiglio di scommessa.
            </p>
          </div>
        </>
      )}

      {/* Empty State */}
      {!homePlayer && !awayPlayer && !calculated && (
        <div className="empty-state">
          <span className="empty-icon">🎾</span>
          <p>Seleziona due giocatori per iniziare l'analisi</p>
          <small>Cerca per nome usando i campi sopra, poi clicca "Calcola"</small>
        </div>
      )}

      {/* Waiting state - players selected but not calculated */}
      {bothPlayersSelected && !calculated && !loading.calc && (
        <div className="waiting-state">
          <span className="waiting-icon">⏳</span>
          <p>Giocatori selezionati</p>
          <small>Clicca "CALCOLA PREVISIONE" per vedere i risultati</small>
        </div>
      )}
    </div>
  );
}
