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
  const inputRef = React.useRef(null);
  const dropdownRef = React.useRef(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/player/search?q=${encodeURIComponent(query)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.players || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Search error:', err);
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
    onSelect(player);
    setQuery('');
    setShowDropdown(false);
    setResults([]);
  };

  return (
    <div className={`player-search ${className || ''}`}>
      <label className="search-label">{label}</label>
      
      {selectedPlayer ? (
        <div className="selected-player">
          <span className="selected-name">{selectedPlayer.name}</span>
          <span className="selected-matches">{selectedPlayer.totalMatches} match</span>
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
                    {player.totalMatches} match • {(player.winRate * 100).toFixed(0)}% WR
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// STAT COMPARISON ROW
// ============================================
function ComparisonRow({ label, homeValue, awayValue, format = 'percent', higherIsBetter = true }) {
  const homeNum = parseFloat(homeValue) || 0;
  const awayNum = parseFloat(awayValue) || 0;
  
  const total = homeNum + awayNum || 1;
  const homePercent = (homeNum / total) * 100;
  const awayPercent = (awayNum / total) * 100;
  
  const homeIsWinner = higherIsBetter ? homeNum > awayNum : homeNum < awayNum;
  const awayIsWinner = higherIsBetter ? awayNum > homeNum : awayNum < homeNum;
  
  const formatValue = (val) => {
    if (format === 'percent') return `${(val * 100).toFixed(1)}%`;
    if (format === 'number') return val.toFixed(0);
    if (format === 'decimal') return val.toFixed(2);
    return val;
  };

  return (
    <div className="comparison-row">
      <span className={`comparison-value home ${homeIsWinner ? 'winner' : ''}`}>
        {formatValue(homeValue)}
      </span>
      <div className="comparison-center">
        <span className="comparison-label">{label}</span>
        <div className="comparison-bar-container">
          <div 
            className="comparison-bar home" 
            style={{ width: `${homePercent}%` }}
          />
          <div 
            className="comparison-bar away" 
            style={{ width: `${awayPercent}%` }}
          />
        </div>
      </div>
      <span className={`comparison-value away ${awayIsWinner ? 'winner' : ''}`}>
        {formatValue(awayValue)}
      </span>
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
  const [loading, setLoading] = useState({ home: false, away: false, h2h: false });
  const [surface, setSurface] = useState('all');
  const [format, setFormat] = useState('all');

  // Fetch player stats when selected
  const fetchPlayerStats = useCallback(async (player, type) => {
    if (!player) {
      if (type === 'home') setHomeStats(null);
      else setAwayStats(null);
      return;
    }

    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const params = new URLSearchParams();
      if (surface !== 'all') params.append('surface', surface);
      if (format !== 'all') params.append('format', format);
      
      const res = await fetch(`${apiUrl}/api/player/${encodeURIComponent(player.name)}/stats?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (type === 'home') setHomeStats(data);
        else setAwayStats(data);
      }
    } catch (err) {
      console.error(`Error fetching ${type} stats:`, err);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  }, [surface, format]);

  // Fetch H2H when both players selected
  const fetchH2H = useCallback(async () => {
    if (!homePlayer || !awayPlayer) {
      setH2hStats(null);
      return;
    }

    setLoading(prev => ({ ...prev, h2h: true }));
    try {
      const params = new URLSearchParams({
        player1: homePlayer.name,
        player2: awayPlayer.name
      });
      
      const res = await fetch(`${apiUrl}/api/player/h2h?${params}`);
      if (res.ok) {
        const data = await res.json();
        setH2hStats(data);
      }
    } catch (err) {
      console.error('Error fetching H2H:', err);
    } finally {
      setLoading(prev => ({ ...prev, h2h: false }));
    }
  }, [homePlayer, awayPlayer]);

  // Effects
  useEffect(() => {
    fetchPlayerStats(homePlayer, 'home');
  }, [homePlayer, fetchPlayerStats]);

  useEffect(() => {
    fetchPlayerStats(awayPlayer, 'away');
  }, [awayPlayer, fetchPlayerStats]);

  useEffect(() => {
    fetchH2H();
  }, [fetchH2H]);

  // Calculate prediction
  const calculatePrediction = () => {
    if (!homeStats || !awayStats) return null;

    const homeWR = homeStats.winRate || 0;
    const awayWR = awayStats.winRate || 0;
    const homeMatches = homeStats.totalMatches || 0;
    const awayMatches = awayStats.totalMatches || 0;

    // Weight by number of matches (more data = more reliable)
    const homeWeight = Math.min(homeMatches / 50, 1);
    const awayWeight = Math.min(awayMatches / 50, 1);

    // H2H bonus
    let h2hBonus = { home: 0, away: 0 };
    if (h2hStats && h2hStats.totalMatches > 0) {
      const h2hHomeWR = h2hStats.player1Wins / h2hStats.totalMatches;
      h2hBonus.home = (h2hHomeWR - 0.5) * 0.15;
      h2hBonus.away = (1 - h2hHomeWR - 0.5) * 0.15;
    }

    // Comeback rate bonus
    const homeComebackBonus = (homeStats.comebackRate || 0) * 0.1;
    const awayComebackBonus = (awayStats.comebackRate || 0) * 0.1;

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
      edge: Math.abs(homeProb - awayProb)
    };
  };

  const prediction = calculatePrediction();

  return (
    <div className="manual-predictor">
      <div className="predictor-header">
        <h2><span className="predictor-icon">🔮</span> Manual Predictor</h2>
        <p className="predictor-subtitle">
          Seleziona due giocatori per confrontare le loro statistiche storiche
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

      {/* Stats Comparison */}
      {(homeStats || awayStats) && (
        <div className="stats-comparison">
          <h3 className="section-title">
            <span className="section-icon">📊</span>
            Confronto Statistiche
          </h3>
          
          {loading.home || loading.away ? (
            <div className="comparison-loading">
              <div className="loading-spinner"></div>
              <span>Caricamento statistiche...</span>
            </div>
          ) : (
            <div className="comparison-rows">
              <ComparisonRow 
                label="Win Rate"
                homeValue={homeStats?.winRate || 0}
                awayValue={awayStats?.winRate || 0}
              />
              <ComparisonRow 
                label="Partite Giocate"
                homeValue={homeStats?.totalMatches || 0}
                awayValue={awayStats?.totalMatches || 0}
                format="number"
              />
              <ComparisonRow 
                label="Comeback Rate"
                homeValue={homeStats?.comebackRate || 0}
                awayValue={awayStats?.comebackRate || 0}
              />
              <ComparisonRow 
                label="ROI Storico"
                homeValue={homeStats?.roi || 0}
                awayValue={awayStats?.roi || 0}
                format="percent"
              />
            </div>
          )}
        </div>
      )}

      {/* H2H Section */}
      {h2hStats && h2hStats.totalMatches > 0 && (
        <div className="h2h-section">
          <h3 className="section-title">
            <span className="section-icon">⚔️</span>
            Head to Head
          </h3>
          <div className="h2h-content">
            <div className="h2h-score">
              <span className="h2h-player home">{homePlayer?.name}</span>
              <span className="h2h-record">
                {h2hStats.player1Wins} - {h2hStats.player2Wins}
              </span>
              <span className="h2h-player away">{awayPlayer?.name}</span>
            </div>
            <p className="h2h-total">{h2hStats.totalMatches} incontri totali</p>
          </div>
        </div>
      )}

      {/* Prediction Summary */}
      {prediction && (
        <div className={`prediction-summary ${
          prediction.confidence > 0.7 ? 'high' : 
          prediction.confidence > 0.4 ? 'medium' : 'low'
        }`}>
          <h3 className="section-title">
            <span className="section-icon">🎯</span>
            Previsione
          </h3>
          
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
              Affidabilità: {prediction.confidence > 0.7 ? 'Alta' : prediction.confidence > 0.4 ? 'Media' : 'Bassa'}
            </span>
          </div>
          
          <p className="prediction-disclaimer">
            ⚠️ Previsione basata su dati storici. Non costituisce consiglio di scommessa.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!homePlayer && !awayPlayer && (
        <div className="empty-state">
          <span className="empty-icon">🎾</span>
          <p>Seleziona due giocatori per iniziare l'analisi</p>
          <small>Cerca per nome usando i campi sopra</small>
        </div>
      )}
    </div>
  );
}
