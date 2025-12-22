/**
 * PredictorTab Component
 * Tab per visualizzare le statistiche storiche dei due giocatori di un match
 * I giocatori sono presi dal match corrente e NON sono modificabili
 */

import React, { useState, useEffect, useMemo } from 'react';
import { apiUrl } from '../config';
import './PredictorTab.css';
import { 
  ChartBar, 
  TennisBall, 
  Clipboard, 
  Target, 
  Circle, 
  WarningCircle,
  Trophy,
  Scales
} from '@phosphor-icons/react';

// Componente per la card statistiche di un singolo giocatore
function PlayerStatCard({ playerName, stats, side, isLoading }) {
  if (isLoading) {
    return (
      <div className={`player-stat-card ${side}`}>
        <div className="player-name">{playerName || 'Caricamento...'}</div>
        <div className="stats-loading">
          <div className="loading-spinner"></div>
          <span>Caricamento statistiche...</span>
        </div>
      </div>
    );
  }

  if (!stats || stats.error) {
    return (
      <div className={`player-stat-card ${side}`}>
        <div className="player-name">{playerName}</div>
        <div className="stats-empty">
          <span><ChartBar size={24} weight="duotone" /></span>
          <p>Statistiche non disponibili</p>
          <small>{stats?.error || 'Nessun dato storico trovato'}</small>
        </div>
      </div>
    );
  }

  const overall = stats.overall || {};
  const surfaces = stats.surfaces || {};
  
  return (
    <div className={`player-stat-card ${side}`}>
      <div className="player-name">{playerName}</div>
      
      {/* Overall Stats */}
      <div className="stats-section">
        <div className="section-label"><ChartBar size={14} weight="duotone" style={{ marginRight: 4 }} /> Overall ({stats.total_matches} match)</div>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Win Rate</span>
            <span className={`stat-value ${overall.win_rate >= 0.6 ? 'highlight' : ''}`}>
              {(overall.win_rate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Comeback Rate</span>
            <span className={`stat-value ${overall.comeback_rate >= 0.5 ? 'highlight' : 'warning'}`}>
              {(overall.comeback_rate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Ranking</span>
            <span className="stat-value">#{overall.avg_ranking || 'N/A'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">ROI</span>
            <span className={`stat-value ${overall.roi?.roi >= 0 ? 'highlight' : 'negative'}`}>
              {overall.roi?.roi_percent?.toFixed(2) || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Surface Stats */}
      <div className="stats-section">
        <div className="section-label"><TennisBall size={14} weight="duotone" style={{ marginRight: 4 }} /> Per Superficie</div>
        <div className="surface-stats">
          {['Hard', 'Clay', 'Grass'].map(surface => {
            const surfaceData = surfaces[surface];
            if (!surfaceData || surfaceData.matches === 0) return null;
            
            return (
              <div key={surface} className="surface-row">
                <span className="surface-name">
                  <Circle size={10} weight="fill" style={{ color: surface === 'Hard' ? '#3b82f6' : surface === 'Clay' ? '#b45309' : '#10b981', marginRight: 4 }} /> {surface}
                </span>
                <span className="surface-matches">{surfaceData.matches}m</span>
                <span className={`surface-wr ${surfaceData.win_rate >= 0.6 ? 'highlight' : ''}`}>
                  {(surfaceData.win_rate * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Format Stats */}
      {stats.formats && (
        <div className="stats-section">
          <div className="section-label"><Clipboard size={14} weight="duotone" style={{ marginRight: 4 }} /> Per Formato</div>
          <div className="format-stats">
            {stats.formats.best_of_3 && (
              <div className="format-row">
                <span className="format-name">Best of 3</span>
                <span className="format-wr">{(stats.formats.best_of_3.win_rate * 100).toFixed(0)}%</span>
              </div>
            )}
            {stats.formats.best_of_5 && (
              <div className="format-row">
                <span className="format-name">Best of 5</span>
                <span className="format-wr">{(stats.formats.best_of_5.win_rate * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente per la comparazione diretta
function ComparisonSection({ homeStats, awayStats, homeName, awayName }) {
  if (!homeStats?.overall || !awayStats?.overall) {
    return null;
  }

  const comparisons = [
    { 
      label: 'Win Rate', 
      home: homeStats.overall.win_rate, 
      away: awayStats.overall.win_rate,
      format: (v) => `${(v * 100).toFixed(1)}%`
    },
    { 
      label: 'Comeback Rate', 
      home: homeStats.overall.comeback_rate, 
      away: awayStats.overall.comeback_rate,
      format: (v) => `${(v * 100).toFixed(1)}%`
    },
    { 
      label: 'Match Giocati', 
      home: homeStats.total_matches, 
      away: awayStats.total_matches,
      format: (v) => v,
      inverse: false // più match = meglio per affidabilità
    }
  ];

  return (
    <div className="comparison-section">
      <div className="section-title">
        <span className="section-icon"><Scales size={16} weight="duotone" /></span>
        Confronto Diretto
      </div>
      
      {comparisons.map((comp, idx) => {
        const total = comp.home + comp.away;
        const homePercent = total > 0 ? (comp.home / total) * 100 : 50;
        const awayPercent = total > 0 ? (comp.away / total) * 100 : 50;
        const homeWins = comp.home > comp.away;
        const awayWins = comp.away > comp.home;
        
        return (
          <div key={idx} className="comparison-row">
            <div className={`comparison-value home ${homeWins ? 'winner' : ''}`}>
              {comp.format(comp.home)}
            </div>
            <div className="comparison-center">
              <div className="comparison-label">{comp.label}</div>
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
            <div className={`comparison-value away ${awayWins ? 'winner' : ''}`}>
              {comp.format(comp.away)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Componente per il summary della predizione
function PredictionSummary({ homeStats, awayStats, homeName, awayName }) {
  const prediction = useMemo(() => {
    if (!homeStats?.overall || !awayStats?.overall) {
      return null;
    }

    // Calcolo semplice basato su win rate e comeback rate
    const homeScore = (homeStats.overall.win_rate * 0.7) + (homeStats.overall.comeback_rate * 0.3);
    const awayScore = (awayStats.overall.win_rate * 0.7) + (awayStats.overall.comeback_rate * 0.3);
    
    const total = homeScore + awayScore;
    const homeProb = (homeScore / total) * 100;
    const awayProb = (awayScore / total) * 100;
    
    const favorite = homeProb > awayProb ? 'home' : 'away';
    const favoriteName = favorite === 'home' ? homeName : awayName;
    const favoriteProb = favorite === 'home' ? homeProb : awayProb;
    const confidence = Math.abs(homeProb - awayProb);

    return {
      favorite,
      favoriteName,
      favoriteProb,
      homeProb,
      awayProb,
      confidence,
      confidenceLevel: confidence > 20 ? 'high' : confidence > 10 ? 'medium' : 'low'
    };
  }, [homeStats, awayStats, homeName, awayName]);

  if (!prediction) {
    return (
      <div className="prediction-summary empty">
        <span className="prediction-icon"><Target size={24} weight="duotone" /></span>
        <p>Dati insufficienti per generare una predizione</p>
      </div>
    );
  }

  return (
    <div className={`prediction-summary ${prediction.confidenceLevel}`}>
      <div className="prediction-title"><Target size={18} weight="duotone" style={{ marginRight: 6 }} /> Analisi Predittiva</div>
      
      <div className="prediction-bars">
        <div className="prediction-player home">
          <span className="prediction-name">{homeName}</span>
          <div className="prediction-bar-container">
            <div 
              className="prediction-bar" 
              style={{ width: `${prediction.homeProb}%` }}
            />
          </div>
          <span className="prediction-prob">{prediction.homeProb.toFixed(1)}%</span>
        </div>
        
        <div className="prediction-player away">
          <span className="prediction-name">{awayName}</span>
          <div className="prediction-bar-container">
            <div 
              className="prediction-bar" 
              style={{ width: `${prediction.awayProb}%` }}
            />
          </div>
          <span className="prediction-prob">{prediction.awayProb.toFixed(1)}%</span>
        </div>
      </div>

      <div className="prediction-footer">
        <div className="prediction-favorite">
          Favorito: <strong>{prediction.favoriteName}</strong>
        </div>
        <div className={`prediction-confidence ${prediction.confidenceLevel}`}>
          Confidenza: {prediction.confidenceLevel === 'high' ? <><Circle size={10} weight="fill" style={{ color: '#10b981' }} /> Alta</> : 
                       prediction.confidenceLevel === 'medium' ? <><Circle size={10} weight="fill" style={{ color: '#fbbf24' }} /> Media</> : <><Circle size={10} weight="fill" style={{ color: '#f59e0b' }} /> Bassa</>}
        </div>
      </div>

      <div className="prediction-disclaimer">
        <WarningCircle size={14} weight="duotone" style={{ marginRight: 4 }} /> Basato su statistiche storiche. Non costituisce consiglio di scommessa.
      </div>
    </div>
  );
}

// Helper per estrarre il nome del giocatore (supporta sia stringhe che oggetti)
const extractPlayerName = (player, fallback) => {
  if (!player) return fallback;
  // Se è già una stringa, usala direttamente
  if (typeof player === 'string') return player;
  // Se è un oggetto, cerca le proprietà standard
  return player.name || player.fullName || player.shortName || fallback;
};

// Componente principale PredictorTab
function PredictorTab({ homePlayer, awayPlayer, matchContext }) {
  const [homeStats, setHomeStats] = useState(null);
  const [awayStats, setAwayStats] = useState(null);
  const [loading, setLoading] = useState({ home: true, away: true });
  const [error, setError] = useState(null);

  // Estrai i nomi dei giocatori (supporta sia stringhe che oggetti)
  const homeName = extractPlayerName(homePlayer, 'Home Player');
  const awayName = extractPlayerName(awayPlayer, 'Away Player');

  // Fetch stats per entrambi i giocatori
  useEffect(() => {
    const fetchPlayerStats = async (playerName, setStats, side) => {
      if (!playerName || playerName === 'Home Player' || playerName === 'Away Player') {
        setLoading(prev => ({ ...prev, [side]: false }));
        return;
      }

      try {
        setLoading(prev => ({ ...prev, [side]: true }));
        const response = await fetch(apiUrl(`/api/player/${encodeURIComponent(playerName)}/stats`));
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error(`Error fetching stats for ${playerName}:`, err);
        setStats({ error: `Impossibile caricare statistiche: ${err.message}` });
      } finally {
        setLoading(prev => ({ ...prev, [side]: false }));
      }
    };

    fetchPlayerStats(homeName, setHomeStats, 'home');
    fetchPlayerStats(awayName, setAwayStats, 'away');
  }, [homeName, awayName]);

  return (
    <div className="predictor-tab">
      {/* Header */}
      <div className="predictor-header">
        <h2>
          <span className="predictor-icon"><Target size={22} weight="duotone" /></span>
          Match Predictor
        </h2>
        <p className="predictor-subtitle">
          Confronto statistiche storiche dei giocatori
        </p>
        {matchContext?.surface && (
          <div className="match-context">
            <span className="context-badge">
              <Circle size={10} weight="fill" style={{ color: matchContext.surface === 'Hard' ? '#3b82f6' : matchContext.surface === 'Clay' ? '#b45309' : '#10b981', marginRight: 4 }} /> 
              {matchContext.surface}
            </span>
            {matchContext.tournament && (
              <span className="context-badge"><Trophy size={14} weight="duotone" style={{ marginRight: 4, color: '#f59e0b' }} /> {matchContext.tournament}</span>
            )}
          </div>
        )}
      </div>

      {/* H2H Section - Due card affiancate */}
      <div className="predictor-h2h">
        <PlayerStatCard 
          playerName={homeName} 
          stats={homeStats} 
          side="home" 
          isLoading={loading.home}
        />
        
        <div className="vs-divider">
          <span className="vs-text">VS</span>
        </div>
        
        <PlayerStatCard 
          playerName={awayName} 
          stats={awayStats} 
          side="away" 
          isLoading={loading.away}
        />
      </div>

      {/* Comparison Section */}
      {!loading.home && !loading.away && (
        <>
          <ComparisonSection 
            homeStats={homeStats} 
            awayStats={awayStats}
            homeName={homeName}
            awayName={awayName}
          />
          
          <PredictionSummary 
            homeStats={homeStats} 
            awayStats={awayStats}
            homeName={homeName}
            awayName={awayName}
          />
        </>
      )}
    </div>
  );
}

export default PredictorTab;
