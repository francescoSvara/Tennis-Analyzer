/**
 * StrategiesPanel Component
 * 
 * Layout a due colonne per le strategie di trading:
 * - SINISTRA: Analisi del match corrente (cosa farebbe la strategia sui dati live)
 * - DESTRA: Analisi storica dei due player (dal DB)
 * 
 * Filosofia: I dati del match sono caricati UNA SOLA VOLTA dal parent.
 *            Le statistiche storiche dei player sono caricate qui on-demand.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  TennisBall, 
  Lightning, 
  User, 
  ChartBar, 
  Circle,
  Hourglass,
  Fire,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  Lightbulb,
  Crown,
  Scales,
  ArrowClockwise
} from '@phosphor-icons/react';
import { apiUrl } from '../config';
import {
  analyzeLayTheWinner,
  analyzeBancaServizio,
  analyzeSuperBreak,
} from '../utils';
import './StrategiesPanel.css';

// Signal colors/backgrounds
const signalColors = {
  strong: '#10b981',
  medium: '#f59e0b',
  weak: '#8b95a5',
  none: '#6b7280'
};

const signalBg = {
  strong: 'rgba(16, 185, 129, 0.15)',
  medium: 'rgba(245, 158, 11, 0.15)',
  weak: 'rgba(139, 149, 165, 0.15)',
  none: 'rgba(107, 114, 128, 0.15)'
};

/**
 * Card per analisi match corrente (SINISTRA)
 * Mostra cosa farebbe la strategia sui dati del singolo match
 */
function MatchAnalysisCard({ title, icon, analysis }) {
  const signalIcon = analysis?.signal === 'strong' 
    ? <Circle size={10} weight="fill" style={{ color: '#10b981' }} />
    : analysis?.signal === 'medium'
    ? <Circle size={10} weight="fill" style={{ color: '#f59e0b' }} />
    : analysis?.signal === 'weak'
    ? <Circle size={10} weight="fill" style={{ color: '#9ca3af' }} />
    : <Hourglass size={10} weight="duotone" style={{ color: '#6b7280' }} />;

  return (
    <div className="strategy-card match-card">
      <div className="strategy-card-header">
        <div className="strategy-icon">{icon}</div>
        <div className="strategy-title-section">
          <h4 className="strategy-title">{title}</h4>
          <span 
            className={`strategy-signal signal-${analysis?.signal || 'none'}`}
            style={{ 
              background: signalBg[analysis?.signal] || signalBg.none,
              color: signalColors[analysis?.signal] || signalColors.none
            }}
          >
            {signalIcon} {(analysis?.signal || 'N/D').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="strategy-card-body">
        <p className="strategy-message">{analysis?.message || 'Carica un match per analisi'}</p>
        
        {/* Dettagli specifici della strategia */}
        {analysis?.details && (
          <div className="strategy-details">
            {analysis.details.firstSetWinnerName && (
              <div className="detail-row">
                <Trophy size={14} weight="duotone" style={{ color: '#f59e0b' }} />
                <span>1° set: <strong>{analysis.details.firstSetWinnerName}</strong></span>
              </div>
            )}
            {analysis.details.secondSetScore && (
              <div className="detail-row">
                <TennisBall size={14} weight="duotone" style={{ color: '#3b82f6' }} />
                <span>2° set: <strong>{analysis.details.secondSetScore}</strong></span>
              </div>
            )}
            {analysis.details.serverName && (
              <div className="detail-row">
                <TennisBall size={14} weight="duotone" style={{ color: '#10b981' }} />
                <span>Servizio: <strong>{analysis.details.serverName}</strong></span>
              </div>
            )}
            {analysis.details.currentGameScore && (
              <div className="detail-row">
                <Lightning size={14} weight="duotone" style={{ color: '#f59e0b' }} />
                <span>Game: <strong>{analysis.details.currentGameScore}</strong></span>
              </div>
            )}
            {analysis.details.surface && (
              <div className="detail-row">
                <TennisBall size={14} weight="duotone" style={{ color: '#10b981' }} />
                <span>Superficie: <strong>{analysis.details.surface}</strong> {analysis.details.bestOf === 5 ? '(Bo5)' : '(Bo3)'}</span>
              </div>
            )}
            {analysis.details.comebackRate && (
              <div className="detail-row">
                <ArrowClockwise size={14} weight="duotone" style={{ color: '#3b82f6' }} />
                <span>Comeback rate: <strong className="highlight">{analysis.details.comebackRate}%</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Confidence bar */}
        {analysis?.confidence > 0 && (
          <div className="confidence-section">
            <div className="confidence-header">
              <span><ChartBar size={14} weight="duotone" /> Confidence</span>
              <span className={`confidence-value ${analysis.confidence >= 70 ? 'high' : analysis.confidence >= 50 ? 'medium' : 'low'}`}>
                {analysis.confidence}%
              </span>
            </div>
            <div className="confidence-bar">
              <div 
                className={`confidence-fill ${analysis.confidence >= 70 ? 'high' : analysis.confidence >= 50 ? 'medium' : 'low'}`}
                style={{ width: `${analysis.confidence}%` }}
              />
            </div>
          </div>
        )}

        {/* Recommendation */}
        {analysis?.recommendation && (
          <div 
            className={`strategy-recommendation signal-${analysis.signal}`}
            style={{ 
              background: signalBg[analysis.signal] || signalBg.none,
              borderColor: signalColors[analysis.signal] || signalColors.none
            }}
          >
            <Lightbulb size={16} weight="duotone" />
            <span>{analysis.recommendation}</span>
          </div>
        )}

        {!analysis?.applicable && (
          <div className="strategy-info">
            <Info size={14} weight="duotone" />
            <span>Strategia non applicabile al momento</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Card per statistiche storiche player (DESTRA)
 * Mostra l'andamento storico dei due giocatori dal DB
 */
function PlayerHistoryCard({ title, homeName, awayName, homeStats, awayStats, loading, surface }) {
  
  // Calcola comparazione per strategia specifica
  const comparison = useMemo(() => {
    if (!homeStats?.overall || !awayStats?.overall) return null;
    
    const homeWr = homeStats.overall.win_rate || 0;
    const awayWr = awayStats.overall.win_rate || 0;
    const homeCr = homeStats.overall.comeback_rate || 0;
    const awayCr = awayStats.overall.comeback_rate || 0;
    
    // Ottieni stats per superficie specifica
    const homeSurfaceStats = homeStats.surfaces?.[surface];
    const awaySurfaceStats = awayStats.surfaces?.[surface];
    
    return {
      homeWinRate: homeWr,
      awayWinRate: awayWr,
      homeComebackRate: homeCr,
      awayComebackRate: awayCr,
      homeSurfaceWr: homeSurfaceStats?.win_rate,
      awaySurfaceWr: awaySurfaceStats?.win_rate,
      homeMatches: homeStats.total_matches || 0,
      awayMatches: awayStats.total_matches || 0,
      homeRoi: homeStats.overall.roi?.roi_percent || 0,
      awayRoi: awayStats.overall.roi?.roi_percent || 0
    };
  }, [homeStats, awayStats, surface]);

  if (loading) {
    return (
      <div className="strategy-card history-card loading">
        <div className="strategy-card-header">
          <div className="strategy-icon"><User size={20} weight="duotone" /></div>
          <div className="strategy-title-section">
            <h4 className="strategy-title">{title} - Storico</h4>
          </div>
        </div>
        <div className="strategy-card-body">
          <div className="loading-skeleton">
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
            <div className="skeleton-line" />
          </div>
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="strategy-card history-card empty">
        <div className="strategy-card-header">
          <div className="strategy-icon"><User size={20} weight="duotone" /></div>
          <div className="strategy-title-section">
            <h4 className="strategy-title">{title} - Storico</h4>
          </div>
        </div>
        <div className="strategy-card-body">
          <p className="no-data-message">Dati storici non disponibili</p>
        </div>
      </div>
    );
  }

  // Determina chi è il favorito storico
  const favoriteHome = comparison.homeWinRate > comparison.awayWinRate;
  const winRateDiff = Math.abs(comparison.homeWinRate - comparison.awayWinRate) * 100;

  return (
    <div className="strategy-card history-card">
      <div className="strategy-card-header">
        <div className="strategy-icon"><User size={20} weight="duotone" /></div>
        <div className="strategy-title-section">
          <h4 className="strategy-title">{title} - Storico</h4>
          <span className="history-badge">
            <ChartBar size={12} /> Dal DB
          </span>
        </div>
      </div>

      <div className="strategy-card-body">
        {/* Confronto Win Rate */}
        <div className="comparison-section">
          <div className="comparison-label">Win Rate Globale</div>
          <div className="comparison-row">
            <div className={`player-stat ${favoriteHome ? 'winner' : ''}`}>
              <span className="player-name">{homeName}</span>
              <span className="stat-value">{(comparison.homeWinRate * 100).toFixed(1)}%</span>
            </div>
            <div className="vs-indicator">
              {winRateDiff > 10 ? (
                favoriteHome ? <ArrowUp size={16} className="arrow-home" /> : <ArrowDown size={16} className="arrow-away" />
              ) : (
                <Minus size={16} className="arrow-even" />
              )}
            </div>
            <div className={`player-stat ${!favoriteHome ? 'winner' : ''}`}>
              <span className="player-name">{awayName}</span>
              <span className="stat-value">{(comparison.awayWinRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Confronto Comeback Rate */}
        <div className="comparison-section">
          <div className="comparison-label">Comeback Rate</div>
          <div className="comparison-row">
            <div className={`player-stat ${comparison.homeComebackRate > comparison.awayComebackRate ? 'highlight-comeback' : ''}`}>
              <span className="stat-value">{(comparison.homeComebackRate * 100).toFixed(1)}%</span>
            </div>
            <div className="vs-indicator">
              <ArrowClockwise size={14} style={{ color: '#8b95a5' }} />
            </div>
            <div className={`player-stat ${comparison.awayComebackRate > comparison.homeComebackRate ? 'highlight-comeback' : ''}`}>
              <span className="stat-value">{(comparison.awayComebackRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Stats su superficie specifica */}
        {surface && (comparison.homeSurfaceWr || comparison.awaySurfaceWr) && (
          <div className="comparison-section surface-section">
            <div className="comparison-label">
              <TennisBall size={12} weight="duotone" /> Su {surface}
            </div>
            <div className="comparison-row">
              <div className="player-stat">
                <span className="stat-value">
                  {comparison.homeSurfaceWr ? `${(comparison.homeSurfaceWr * 100).toFixed(0)}%` : 'N/D'}
                </span>
              </div>
              <div className="vs-indicator">vs</div>
              <div className="player-stat">
                <span className="stat-value">
                  {comparison.awaySurfaceWr ? `${(comparison.awaySurfaceWr * 100).toFixed(0)}%` : 'N/D'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ROI */}
        <div className="comparison-section">
          <div className="comparison-label">ROI Storico</div>
          <div className="comparison-row">
            <div className={`player-stat ${comparison.homeRoi > 0 ? 'roi-positive' : 'roi-negative'}`}>
              <span className="stat-value">{comparison.homeRoi >= 0 ? '+' : ''}{comparison.homeRoi.toFixed(1)}%</span>
            </div>
            <div className="vs-indicator">
              <Fire size={14} style={{ color: '#f59e0b' }} />
            </div>
            <div className={`player-stat ${comparison.awayRoi > 0 ? 'roi-positive' : 'roi-negative'}`}>
              <span className="stat-value">{comparison.awayRoi >= 0 ? '+' : ''}{comparison.awayRoi.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Match giocati */}
        <div className="matches-played">
          <span>{homeName}: {comparison.homeMatches} match</span>
          <span>{awayName}: {comparison.awayMatches} match</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente principale: StrategiesPanel
 * Mostra le 3 strategie con layout a due colonne
 */
function StrategiesPanel({ matchData, eventInfo, powerRankings, dataKey }) {
  const [homeStats, setHomeStats] = useState(null);
  const [awayStats, setAwayStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);

  // Estrai nomi giocatori
  const homeName = eventInfo?.home?.name || eventInfo?.home?.shortName || 'Home';
  const awayName = eventInfo?.away?.name || eventInfo?.away?.shortName || 'Away';
  
  // Estrai superficie
  const surface = matchData?.surface || eventInfo?.surface || eventInfo?.groundType || 
                  matchData?.tournament_ground || 'Unknown';

  // Carica statistiche storiche UNA SOLA VOLTA quando cambiano i nomi
  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!homeName || !awayName || homeName === 'Home' || awayName === 'Away') {
        return;
      }
      
      // Skip se già caricato per questi giocatori
      if (statsLoaded) return;
      
      setStatsLoading(true);
      
      try {
        const [homeRes, awayRes] = await Promise.all([
          fetch(apiUrl(`/api/player/${encodeURIComponent(homeName)}/stats`)),
          fetch(apiUrl(`/api/player/${encodeURIComponent(awayName)}/stats`))
        ]);
        
        if (homeRes.ok) {
          const homeData = await homeRes.json();
          setHomeStats(homeData);
        }
        
        if (awayRes.ok) {
          const awayData = await awayRes.json();
          setAwayStats(awayData);
        }
        
        setStatsLoaded(true);
      } catch (err) {
        console.error('Error fetching player stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchPlayerStats();
  }, [homeName, awayName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calcola analisi per ogni strategia (solo dal match corrente)
  const layTheWinnerAnalysis = useMemo(() => analyzeLayTheWinner(matchData), [matchData, dataKey]);
  const bancaServizioAnalysis = useMemo(() => analyzeBancaServizio(matchData), [matchData, dataKey]);
  const superBreakAnalysis = useMemo(() => analyzeSuperBreak(matchData), [matchData, dataKey]);

  return (
    <div className="strategies-panel">
      <h2 className="strategies-title">
        <Target size={24} weight="duotone" style={{ color: '#3b82f6' }} />
        Strategie di Base Tennis
      </h2>

      {/* Lay the Winner */}
      <div className="strategy-row">
        <MatchAnalysisCard 
          title="Lay the Winner"
          icon={<Trophy size={20} weight="duotone" />}
          analysis={layTheWinnerAnalysis}
        />
        <PlayerHistoryCard 
          title="Lay the Winner"
          homeName={homeName}
          awayName={awayName}
          homeStats={homeStats}
          awayStats={awayStats}
          loading={statsLoading}
          surface={surface}
        />
      </div>

      {/* Banca Servizio */}
      <div className="strategy-row">
        <MatchAnalysisCard 
          title="Banca Servizio"
          icon={<TennisBall size={20} weight="duotone" />}
          analysis={bancaServizioAnalysis}
        />
        <PlayerHistoryCard 
          title="Banca Servizio"
          homeName={homeName}
          awayName={awayName}
          homeStats={homeStats}
          awayStats={awayStats}
          loading={statsLoading}
          surface={surface}
        />
      </div>

      {/* Super Break */}
      <div className="strategy-row">
        <MatchAnalysisCard 
          title="Super Break"
          icon={<Lightning size={20} weight="duotone" />}
          analysis={superBreakAnalysis}
        />
        <PlayerHistoryCard 
          title="Super Break"
          homeName={homeName}
          awayName={awayName}
          homeStats={homeStats}
          awayStats={awayStats}
          loading={statsLoading}
          surface={surface}
        />
      </div>
    </div>
  );
}

export default StrategiesPanel;
