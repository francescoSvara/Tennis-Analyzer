import React, { useMemo } from 'react';
import { interpretGameValue } from '../utils';

/**
 * IndicatorsChart - Grafico indicatori match basato su powerRankings
 * Mostra statistiche aggregate e distribuzione momentum
 */
export default function IndicatorsChart({ powerRankings = [], homeName = 'Home', awayName = 'Away' }) {
  
  // Calcola statistiche dai powerRankings
  const stats = useMemo(() => {
    if (!powerRankings || powerRankings.length === 0) {
      return null;
    }
    
    let homeGames = 0;
    let awayGames = 0;
    let homeDominant = 0;
    let awayDominant = 0;
    let balanced = 0;
    let breaks = 0;
    let totalValue = 0;
    let maxValue = 0;
    let minValue = 0;
    
    // Nuovi contatori per momentum totale
    let homeMomentumTotal = 0;  // Somma di tutti i valori positivi
    let awayMomentumTotal = 0;  // Somma di tutti i valori negativi (in valore assoluto)
    
    powerRankings.forEach(item => {
      const value = item.value || 0;
      totalValue += value;
      
      // Accumula momentum per ciascun giocatore
      if (value > 0) {
        homeMomentumTotal += value;
      } else if (value < 0) {
        awayMomentumTotal += Math.abs(value);
      }
      
      if (value > maxValue) maxValue = value;
      if (value < minValue) minValue = value;
      
      if (value > 20) {
        homeDominant++;
        homeGames++;
      } else if (value < -20) {
        awayDominant++;
        awayGames++;
      } else if (value > 0) {
        homeGames++;
      } else if (value < 0) {
        awayGames++;
      } else {
        balanced++;
      }
      
      if (item.breakOccurred) breaks++;
    });
    
    const avgValue = Math.round(totalValue / powerRankings.length);
    
    // Calcola il totale combinato e la percentuale
    const combinedMomentum = homeMomentumTotal + awayMomentumTotal;
    const homePercent = combinedMomentum > 0 ? (homeMomentumTotal / combinedMomentum) * 100 : 50;
    const awayPercent = combinedMomentum > 0 ? (awayMomentumTotal / combinedMomentum) * 100 : 50;
    
    return {
      totalGames: powerRankings.length,
      homeGames,
      awayGames,
      homeDominant,
      awayDominant,
      balanced,
      breaks,
      avgValue,
      maxValue,
      minValue: Math.abs(minValue),
      // Nuovi valori per il termometro
      homeMomentumTotal: Math.round(homeMomentumTotal),
      awayMomentumTotal: Math.round(awayMomentumTotal),
      combinedMomentum: Math.round(combinedMomentum),
      homePercent: Math.round(homePercent),
      awayPercent: Math.round(awayPercent),
      momentumDiff: Math.round(homeMomentumTotal - awayMomentumTotal)
    };
  }, [powerRankings]);

  // Calcola statistiche per gli ULTIMI 3 GAME (trend recente)
  const recentStats = useMemo(() => {
    if (!powerRankings || powerRankings.length === 0) {
      return null;
    }
    
    // Prendi solo gli ultimi 3 game
    const last3Games = powerRankings.slice(-3);
    
    let homeMomentumRecent = 0;
    let awayMomentumRecent = 0;
    
    last3Games.forEach(item => {
      const value = item.value || 0;
      if (value > 0) {
        homeMomentumRecent += value;
      } else if (value < 0) {
        awayMomentumRecent += Math.abs(value);
      }
    });
    
    const combinedRecent = homeMomentumRecent + awayMomentumRecent;
    const homePercentRecent = combinedRecent > 0 ? (homeMomentumRecent / combinedRecent) * 100 : 50;
    const awayPercentRecent = combinedRecent > 0 ? (awayMomentumRecent / combinedRecent) * 100 : 50;
    
    return {
      gamesAnalyzed: last3Games.length,
      homeMomentum: Math.round(homeMomentumRecent),
      awayMomentum: Math.round(awayMomentumRecent),
      homePercent: Math.round(homePercentRecent),
      awayPercent: Math.round(awayPercentRecent),
      momentumDiff: Math.round(homeMomentumRecent - awayMomentumRecent)
    };
  }, [powerRankings]);

  // Distribuzione zone
  const zoneDistribution = useMemo(() => {
    if (!powerRankings || powerRankings.length === 0) return [];
    
    const zones = {
      'danger-away': { count: 0, label: 'Pericolo Away', color: '#c97676', icon: '🔴' },
      'away': { count: 0, label: 'Vantaggio Away', color: '#d4a84b', icon: '🟠' },
      'slight-away': { count: 0, label: 'Leggero Away', color: '#e8c36a', icon: '🟡' },
      'neutral': { count: 0, label: 'Equilibrio', color: '#9e9e9e', icon: '⚪' },
      'slight-home': { count: 0, label: 'Leggero Home', color: '#7eb5d6', icon: '🔵' },
      'home': { count: 0, label: 'Vantaggio Home', color: '#5b8fb9', icon: '🟢' },
      'danger-home': { count: 0, label: 'Dominio Home', color: '#6aba7f', icon: '💚' }
    };
    
    powerRankings.forEach(item => {
      const interp = interpretGameValue({ value: item.value });
      const zone = interp?.zone || 'neutral';
      if (zones[zone]) zones[zone].count++;
    });
    
    return Object.entries(zones)
      .filter(([, data]) => data.count > 0)
      .map(([key, data]) => ({ key, ...data }));
  }, [powerRankings]);

  if (!stats) {
    return (
      <div className="indicators-chart">
        <div className="chart-header">
          <span className="chart-icon">📊</span>
          <h3 className="chart-title">Indicatori Match</h3>
        </div>
        <div className="chart-no-data">
          <span>⏳ Nessun dato disponibile</span>
        </div>
      </div>
    );
  }

  const indicators = [
    { label: 'Game Totali', icon: '🎾', home: stats.homeGames, away: stats.awayGames, homeColor: '#5b8fb9', awayColor: '#c97676' },
    { label: 'Dominio', icon: '💪', home: stats.homeDominant, away: stats.awayDominant, homeColor: '#6aba7f', awayColor: '#c97676' },
    { label: 'Break', icon: '⚡', home: Math.ceil(stats.breaks/2), away: Math.floor(stats.breaks/2), homeColor: '#d4a84b', awayColor: '#d4a84b' },
    { label: 'Max Momentum', icon: '📈', home: stats.maxValue, away: stats.minValue, homeColor: '#6c9a8b', awayColor: '#6c9a8b' },
  ];

  return (
    <div className="indicators-chart">
      <div className="chart-header">
        <span className="chart-icon">📊</span>
        <h3 className="chart-title">Indicatori Match</h3>
      </div>
      
      {/* Intestazione giocatori */}
      <div className="players-header">
        <div className="player-home">
          <span className="player-name">{homeName}</span>
        </div>
        <div className="player-away">
          <span className="player-name">{awayName}</span>
        </div>
      </div>
      

      
      {/* Barre comparative */}
      <div className="indicators-list">
        {indicators.map(ind => {
          const total = ind.home + ind.away || 1;
          const homePercent = (ind.home / total) * 100;
          const awayPercent = (ind.away / total) * 100;
          const diff = ind.home - ind.away;

          return (
            <div key={ind.label} className="indicator-row">
              <div className="indicator-label">
                <span className="indicator-icon">{ind.icon}</span>
                <span className="indicator-text">{ind.label}</span>
              </div>

              <div className="indicator-thermometer-container">
                <div className="indicator-side-value"><span className="indicator-value home-value">{ind.home}</span></div>

                <div className="indicator-thermometer">
                  <div className="indicator-track">
                    <div className="thermometer-fill home-fill" style={{ width: `${homePercent}%` }} />
                    <div className="thermometer-fill away-fill" style={{ width: `${awayPercent}%` }} />
                    <div 
                      className="thermometer-indicator"
                      style={{ 
                        left: `${homePercent}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      <div className="indicator-needle"></div>
                      <div className="indicator-value-badge">
                        {diff > 0 ? '+' : ''}{Number.isInteger(diff) ? diff : diff.toFixed(2)}
                      </div>
                    </div>
                    <div className="thermometer-center-line"></div>
                  </div>
                </div>

                <div className="indicator-side-value"><span className="indicator-value away-value">{ind.away}</span></div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Distribuzione zone */}
      <div className="zone-distribution">
        <div className="zone-title">Distribuzione Momentum</div>
        
        {/* 🔥 MINI TERMOMETRO - Ultimi 3 Game (Trend Recente) */}
        {recentStats && (
          <div className="momentum-thermometer mini-thermometer">
            <div className="thermometer-header-mini">
              <span className="mini-label">⚡ Ultimi {recentStats.gamesAnalyzed} Game</span>
            </div>
            <div className="thermometer-track mini-track">
              {/* Lato Home (sinistra) */}
              <div 
                className="thermometer-fill home-fill"
                style={{ width: `${recentStats.homePercent}%` }}
              />
              {/* Lato Away (destra) */}
              <div 
                className="thermometer-fill away-fill"
                style={{ width: `${recentStats.awayPercent}%` }}
              />
              {/* Indicatore centrale che si sposta */}
              <div 
                className="thermometer-indicator mini-indicator"
                style={{ 
                  left: `${recentStats.homePercent}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="indicator-needle mini-needle"></div>
                <div className="indicator-value-badge mini-badge">
                  {recentStats.momentumDiff > 0 ? '+' : ''}{Number.isInteger(recentStats.momentumDiff) ? recentStats.momentumDiff : recentStats.momentumDiff.toFixed(2)}
                </div>
              </div>
              {/* Linea centrale di riferimento */}
              <div className="thermometer-center-line mini-center"></div>
            </div>
            <div className="thermometer-values mini-values">
              <span className="thermometer-value home-value">
                <span className="value-number">{recentStats.homeMomentum}</span>
              </span>
              <span className="thermometer-value away-value">
                <span className="value-number">{recentStats.awayMomentum}</span>
              </span>
            </div>
          </div>
        )}
        
        {/* 🔥 TERMOMETRO MOMENTUM COMPLETO - Tutta la partita */}
        <div className="momentum-thermometer full-thermometer">
          <div className="thermometer-header-mini">
            <span className="full-label">🎾 Partita Completa</span>
          </div>
          <div className="thermometer-labels">
            <span className="thermometer-label home-label">{homeName}</span>
            <span className="thermometer-label away-label">{awayName}</span>
          </div>
          <div className="thermometer-track">
            {/* Lato Home (sinistra) */}
            <div 
              className="thermometer-fill home-fill"
              style={{ width: `${stats.homePercent}%` }}
            />
            {/* Lato Away (destra) */}
            <div 
              className="thermometer-fill away-fill"
              style={{ width: `${stats.awayPercent}%` }}
            />
            {/* Indicatore centrale che si sposta */}
            <div 
              className="thermometer-indicator"
              style={{ 
                left: `${stats.homePercent}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="indicator-needle"></div>
              <div className="indicator-value-badge">
                {stats.momentumDiff > 0 ? '+' : ''}{Number.isInteger(stats.momentumDiff) ? stats.momentumDiff : stats.momentumDiff.toFixed(2)}
              </div>
            </div>
            {/* Linea centrale di riferimento */}
            <div className="thermometer-center-line"></div>
          </div>
          <div className="thermometer-values">
            <span className="thermometer-value home-value">
              <span className="value-number">{stats.homeMomentumTotal}</span>
              <span className="value-percent">({stats.homePercent}%)</span>
            </span>
            <span className="thermometer-value away-value">
              <span className="value-number">{stats.awayMomentumTotal}</span>
              <span className="value-percent">({stats.awayPercent}%)</span>
            </span>
          </div>
        </div>
        
        <div className="zone-bars">
          {zoneDistribution.map(zone => {
            const percent = (zone.count / stats.totalGames) * 100;
            return (
              <div key={zone.key} className="zone-item" title={`${zone.label}: ${zone.count} game (${Math.round(percent)}%)`}>
                <div className="zone-bar-wrapper">
                  <div 
                    className="zone-bar" 
                    style={{ height: `${percent}%`, backgroundColor: zone.color }}
                  />
                </div>
                <span className="zone-icon">{zone.icon}</span>
                <span className="zone-count">{zone.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
