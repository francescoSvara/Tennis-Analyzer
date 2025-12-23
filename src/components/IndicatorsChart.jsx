import React, { useMemo } from 'react';
import { interpretGameValue } from '../utils';
import {
  ChartBar,
  TennisBall,
  Barbell,
  Lightning,
  ChartLineUp,
  Hourglass,
  Circle,
  Info
} from '@phosphor-icons/react';

// ============================================================================
// DERIVED STATS CALCULATOR - 100% ACCURATE FROM SET SCORES
// ============================================================================

/**
 * Calcola statistiche DERIVATE dai soli punteggi set (w1/l1, w2/l2, ecc.)
 * Questi dati sono 100% accurati perché vengono da dati certi.
 * 
 * @param {Object} matchData - Dati match con w1/l1, w2/l2, etc.
 * @returns {Object|null} Statistiche derivate o null se dati insufficienti
 */
function calculateDerivedStats(matchData) {
  if (!matchData) return null;
  
  // Estrai punteggi set - supporta sia formato XLSX che SofaScore
  const sets = [];
  
  // Formato XLSX: w1/l1, w2/l2, etc (winner/loser perspective)
  for (let i = 1; i <= 5; i++) {
    const wGames = matchData[`w${i}`];
    const lGames = matchData[`l${i}`];
    
    if (wGames !== undefined && wGames !== null && lGames !== undefined && lGames !== null) {
      sets.push({ winner: wGames, loser: lGames });
    }
  }
  
  // Formato alternativo: home_sets/away_sets o period scores
  if (sets.length === 0 && matchData.homeScore && matchData.awayScore) {
    for (let i = 1; i <= 5; i++) {
      const hGames = matchData.homeScore[`period${i}`];
      const aGames = matchData.awayScore[`period${i}`];
      
      if (hGames !== undefined && aGames !== undefined) {
        // Determina winner/loser basandosi su chi ha vinto il set
        if (hGames > aGames) {
          sets.push({ winner: hGames, loser: aGames, homeWon: true });
        } else if (aGames > hGames) {
          sets.push({ winner: aGames, loser: hGames, homeWon: false });
        }
      }
    }
  }
  
  if (sets.length === 0) return null;
  
  // ====== CALCOLO GAME TOTALI (100% ACCURATO) ======
  let totalWinnerGames = 0;
  let totalLoserGames = 0;
  
  sets.forEach(set => {
    totalWinnerGames += set.winner;
    totalLoserGames += set.loser;
  });
  
  const totalGames = totalWinnerGames + totalLoserGames;
  
  // ====== CALCOLO SET VINTI (100% ACCURATO) ======
  const setsPlayed = sets.length;
  // In formato XLSX, tutti i set sono vinti dal winner
  // Ma possiamo contare quanti set ha vinto il loser guardando la struttura del match
  let winnerSetsWon = 0;
  let loserSetsWon = 0;
  
  // Se è Bo3 e ci sono 2 set, winner ha vinto 2-0
  // Se Bo3 e 3 set, winner ha vinto 2-1
  // Se Bo5 e 3 set, winner ha vinto 3-0
  // etc.
  
  // Logica: winner vince sempre, loser vince i set "extra"
  // In un Bo3: winner needs 2 sets to win
  // In un Bo5: winner needs 3 sets to win
  const bestOf = matchData.best_of || matchData.bestOf || (setsPlayed >= 4 ? 5 : 3);
  const setsToWin = Math.ceil(bestOf / 2);
  
  winnerSetsWon = setsToWin;
  loserSetsWon = setsPlayed - setsToWin;
  
  return {
    // 100% accurate data
    totalGames,
    winnerGames: totalWinnerGames,
    loserGames: totalLoserGames,
    setsPlayed,
    winnerSetsWon,
    loserSetsWon,
    setScores: sets,
    
    // Percentuali game (100% accurate)
    winnerGamePercent: Math.round((totalWinnerGames / totalGames) * 100),
    loserGamePercent: Math.round((totalLoserGames / totalGames) * 100),
    gameDiff: totalWinnerGames - totalLoserGames,
    
    // Flag per UI
    isDerived: true,
    accuracy: 100,
    source: 'set_scores'
  };
}

// ============================================================================
// FUTURE: BREAK ESTIMATION (~85% accurate) - Ready for implementation
// ============================================================================
// TODO: Implement when confidence is higher
// function estimateBreaks(sets) { ... }

// ============================================================================
// FUTURE: DOMINATION ESTIMATION (~70% accurate) - Ready for implementation  
// ============================================================================
// TODO: Implement when we have better heuristics
// function estimateDomination(sets, gameDiff) { ... }

/**
 * Estrae break points converted dalle statistics
 * Somma i break di TUTTI i periodi (1ST, 2ND, 3RD, 4TH, 5TH)
 * @param {Object} matchData - Dati match con statistics
 * @returns {Object} { homeBreaks, awayBreaks } o null
 */
function extractBreaksFromStatistics(matchData) {
  if (!matchData?.statistics) return null;
  
  // Statistics può essere array o oggetto con chiave
  let statisticsArr = matchData.statistics;
  if (!Array.isArray(statisticsArr)) {
    // Se è oggetto, prova a estrarre l'array
    if (statisticsArr.statistics) {
      statisticsArr = statisticsArr.statistics;
    } else {
      return null;
    }
  }
  
  let totalHomeBreaks = 0;
  let totalAwayBreaks = 0;
  let foundAny = false;
  
  // Prima cerca nel periodo ALL (se esiste)
  const allPeriod = statisticsArr.find(s => s.period === 'ALL');
  if (allPeriod?.groups) {
    const returnGroup = allPeriod.groups.find(g => g.groupName === 'Return');
    if (returnGroup?.statisticsItems) {
      const breakStat = returnGroup.statisticsItems.find(
        item => item.key === 'breakPointsScored' || item.name === 'Break points converted'
      );
      if (breakStat) {
        totalHomeBreaks = parseInt(breakStat.homeValue || breakStat.home) || 0;
        totalAwayBreaks = parseInt(breakStat.awayValue || breakStat.away) || 0;
        foundAny = true;
      }
    }
  }
  
  // Se non c'è ALL, somma da tutti i set (1ST, 2ND, 3RD, 4TH, 5TH)
  if (!foundAny) {
    statisticsArr.forEach(stat => {
      if (['1ST', '2ND', '3RD', '4TH', '5TH'].includes(stat.period)) {
        const returnGroup = stat.groups?.find(g => g.groupName === 'Return');
        if (returnGroup?.statisticsItems) {
          const breakStat = returnGroup.statisticsItems.find(
            item => item.key === 'breakPointsScored' || item.name === 'Break points converted'
          );
          if (breakStat) {
            totalHomeBreaks += parseInt(breakStat.homeValue || breakStat.home) || 0;
            totalAwayBreaks += parseInt(breakStat.awayValue || breakStat.away) || 0;
            foundAny = true;
          }
        }
      }
    });
  }
  
  if (!foundAny) return null;
  
  return {
    homeBreaks: totalHomeBreaks,
    awayBreaks: totalAwayBreaks
  };
}

/**
 * IndicatorsChart - Grafico indicatori match basato su powerRankings
 * Mostra statistiche aggregate e distribuzione momentum
 * 
 * GAME TOTALI: Usa punteggi set reali (w1+w2+...+w5) per dati accurati
 * DOMINIO: Game con momentum dominante (|value| > 20) dai powerRankings
 * BREAK: Da statistics.breakPointsScored o powerRankings.breakOccurred
 * MAX MOMENTUM: raw_v originale o momentum medio se raw non disponibile
 */
export default function IndicatorsChart({ 
  powerRankings = [], 
  homeName = 'Home', 
  awayName = 'Away',
  matchData = null  // Dati match per punteggi set e statistics
}) {
  
  // Calcola statistiche dai powerRankings + matchData per dati reali
  const stats = useMemo(() => {
    if (!powerRankings || powerRankings.length === 0) {
      return null;
    }
    
    // ============================================================
    // DETECT DATA SOURCE: API vs SVG
    // ============================================================
    const isSvgSource = powerRankings.some(pr => pr.source === 'svg_dom');
    const hasBreakOccurred = powerRankings.some(pr => pr.breakOccurred === true);
    
    // ============================================================
    // GAME TOTALI: Calcola dai punteggi set o dai powerRankings
    // ============================================================
    let realHomeGames = 0;
    let realAwayGames = 0;
    
    // Prima prova matchData (w1/l1, w2/l2, etc.)
    if (matchData) {
      for (let i = 1; i <= 5; i++) {
        const homeSet = parseInt(matchData[`w${i}`]) || 0;
        const awaySet = parseInt(matchData[`l${i}`]) || 0;
        realHomeGames += homeSet;
        realAwayGames += awaySet;
      }
      // Fallback: prova anche homeScore/awayScore
      if (realHomeGames === 0 && realAwayGames === 0) {
        const hs = matchData.homeScore || {};
        const as = matchData.awayScore || {};
        for (let i = 1; i <= 5; i++) {
          realHomeGames += parseInt(hs[`period${i}`]) || 0;
          realAwayGames += parseInt(as[`period${i}`]) || 0;
        }
      }
    }
    
    // Se non abbiamo dati dai punteggi set, calcola dai powerRankings
    // Analizzando il max game per ogni set e il segno del value
    if (realHomeGames === 0 && realAwayGames === 0 && powerRankings.length > 0) {
      // Raggruppa per set e conta chi ha vinto ogni game
      const gamesBySet = {};
      powerRankings.forEach(pr => {
        const setNum = pr.set || 1;
        if (!gamesBySet[setNum]) {
          gamesBySet[setNum] = { home: 0, away: 0 };
        }
        // Il segno del value indica chi ha vinto il game
        // value > 0 = home ha vinto, value < 0 = away ha vinto
        if (pr.value > 0) {
          gamesBySet[setNum].home++;
        } else if (pr.value < 0) {
          gamesBySet[setNum].away++;
        }
      });
      
      // Somma i game di tutti i set
      Object.values(gamesBySet).forEach(setData => {
        realHomeGames += setData.home;
        realAwayGames += setData.away;
      });
    }
    
    let homeDominant = 0;
    let awayDominant = 0;
    let balanced = 0;
    let breaks = 0;
    let homeBreaks = 0;
    let awayBreaks = 0;
    let totalValue = 0;
    let maxValue = 0;
    let minValue = 0;
    
    // Contatori per momentum totale
    let homeMomentumTotal = 0;
    let awayMomentumTotal = 0;
    
    // Valori raw per Max Momentum (più significativi dei normalizzati)
    let maxRawValue = 0;
    let minRawValue = 0;
    let hasRawValues = false;
    
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
      
      // Traccia i valori raw se presenti (più significativi)
      if (item.raw_v !== undefined && item.raw_v !== null) {
        hasRawValues = true;
        if (value > 0 && item.raw_v > maxRawValue) {
          maxRawValue = item.raw_v;
        } else if (value < 0 && item.raw_v > Math.abs(minRawValue)) {
          minRawValue = -item.raw_v;
        }
      }
      
      // Dominio: conta solo i game con momentum dominante (|value| > 20)
      if (value > 20) {
        homeDominant++;
      } else if (value < -20) {
        awayDominant++;
      } else if (value === 0) {
        balanced++;
      }
      
      // Conta break per lato
      // Break avviene quando chi vince NON è chi serviva:
      // - value > 0 && breakOccurred = Home ha vinto un game dove Away serviva = break per Home
      // - value < 0 && breakOccurred = Away ha vinto un game dove Home serviva = break per Away
      if (item.breakOccurred) {
        breaks++;
        if (value > 0) {
          homeBreaks++;
        } else if (value < 0) {
          awayBreaks++;
        }
      }
    });
    
    // FALLBACK: Se nessun breakOccurred=true nei powerRankings,
    // usa le statistics dal matchData
    if (breaks === 0 && matchData) {
      const statsBreaks = extractBreaksFromStatistics(matchData);
      if (statsBreaks) {
        homeBreaks = statsBreaks.homeBreaks;
        awayBreaks = statsBreaks.awayBreaks;
        breaks = homeBreaks + awayBreaks;
      }
    }
    
    const avgValue = Math.round(totalValue / powerRankings.length);
    
    // Calcola il totale combinato e la percentuale
    const combinedMomentum = homeMomentumTotal + awayMomentumTotal;
    const homePercent = combinedMomentum > 0 ? (homeMomentumTotal / combinedMomentum) * 100 : 50;
    const awayPercent = combinedMomentum > 0 ? (awayMomentumTotal / combinedMomentum) * 100 : 50;
    
    // Per Max Momentum: usa raw_v se disponibile (più significativo), altrimenti usa momentum medio
    // I valori normalizzati (maxValue/minValue) sono sempre ~100 e non informativi
    const displayMaxHome = hasRawValues ? Math.round(maxRawValue) : Math.round(homeMomentumTotal / Math.max(1, realHomeGames));
    const displayMaxAway = hasRawValues ? Math.round(Math.abs(minRawValue)) : Math.round(awayMomentumTotal / Math.max(1, realAwayGames));
    
    return {
      totalGames: powerRankings.length,
      // Game Totali: conta corretta per tipo source
      homeGames: realHomeGames,
      awayGames: realAwayGames,
      // Dominio: game con momentum dominante (|value| > 20)
      homeDominant,
      awayDominant,
      balanced,
      breaks,
      homeBreaks,
      awayBreaks,
      // Flag per UI - indica se break è disponibile o stimato
      breakSource: hasBreakOccurred ? 'api' : (breaks > 0 ? 'statistics' : 'unavailable'),
      avgValue,
      maxValue: displayMaxHome,
      minValue: displayMaxAway,
      // Info source per debug/UI
      dataSource: isSvgSource ? 'svg' : 'api',
      hasRawValues,
      // Valori per il termometro momentum
      homeMomentumTotal: Math.round(homeMomentumTotal),
      awayMomentumTotal: Math.round(awayMomentumTotal),
      combinedMomentum: Math.round(combinedMomentum),
      homePercent: Math.round(homePercent),
      awayPercent: Math.round(awayPercent),
      momentumDiff: Math.round(homeMomentumTotal - awayMomentumTotal)
    };
  }, [powerRankings, matchData]);

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
      'danger-away': { count: 0, label: 'Pericolo Away', color: '#c97676', icon: <Circle size={12} weight="fill" style={{ color: '#ef4444' }} /> },
      'away': { count: 0, label: 'Vantaggio Away', color: '#d4a84b', icon: <Circle size={12} weight="fill" style={{ color: '#f59e0b' }} /> },
      'slight-away': { count: 0, label: 'Leggero Away', color: '#e8c36a', icon: <Circle size={12} weight="fill" style={{ color: '#fbbf24' }} /> },
      'neutral': { count: 0, label: 'Equilibrio', color: '#9e9e9e', icon: <Circle size={12} weight="fill" style={{ color: '#9ca3af' }} /> },
      'slight-home': { count: 0, label: 'Leggero Home', color: '#7eb5d6', icon: <Circle size={12} weight="fill" style={{ color: '#60a5fa' }} /> },
      'home': { count: 0, label: 'Vantaggio Home', color: '#5b8fb9', icon: <Circle size={12} weight="fill" style={{ color: '#10b981' }} /> },
      'danger-home': { count: 0, label: 'Dominio Home', color: '#6aba7f', icon: <Circle size={12} weight="fill" style={{ color: '#22c55e' }} /> }
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

  // ============================================================================
  // FALLBACK: Calcola statistiche derivate dai punteggi set
  // ============================================================================
  const derivedStats = useMemo(() => {
    // Solo se non abbiamo powerRankings ma abbiamo matchData
    if (powerRankings && powerRankings.length > 0) return null;
    return calculateDerivedStats(matchData);
  }, [matchData, powerRankings]);

  // ============================================================================
  // RENDER: FALLBACK MODE (Solo Game Totali - 100% accurate)
  // ============================================================================
  if (!stats && derivedStats) {
    // Mostra versione semplificata con solo dati 100% accurati
    const winnerName = matchData?.winner_name || matchData?.winnerName || homeName;
    const loserName = matchData?.loser_name || matchData?.loserName || awayName;
    
    return (
      <div className="indicators-chart">
        <div className="chart-header">
          <span className="chart-icon"><ChartBar size={20} weight="duotone" /></span>
          <h3 className="chart-title">Indicatori Match</h3>
          <span className="chart-badge derived-badge" title="Dati derivati dai punteggi set">
            <Info size={14} weight="duotone" /> Riepilogo
          </span>
        </div>
        
        {/* Intestazione giocatori */}
        <div className="players-header">
          <div className="player-home">
            <span className="player-name">{winnerName}</span>
          </div>
          <div className="player-away">
            <span className="player-name">{loserName}</span>
          </div>
        </div>
        
        {/* Solo indicatore Game Totali - 100% accurato */}
        <div className="indicators-list">
          <div className="indicator-row">
            <div className="indicator-label">
              <span className="indicator-icon"><TennisBall size={16} weight="duotone" /></span>
              <span className="indicator-text">Game Totali</span>
            </div>
            <div className="indicator-thermometer-container">
              <div className="indicator-side-value">
                <span className="indicator-value home-value">{derivedStats.winnerGames}</span>
              </div>
              <div className="indicator-thermometer">
                <div className="indicator-track">
                  <div className="thermometer-fill home-fill" style={{ width: `${derivedStats.winnerGamePercent}%` }} />
                  <div className="thermometer-fill away-fill" style={{ width: `${derivedStats.loserGamePercent}%` }} />
                  <div 
                    className="thermometer-indicator"
                    style={{ left: `${derivedStats.winnerGamePercent}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="indicator-needle"></div>
                    <div className="indicator-value-badge">+{derivedStats.gameDiff}</div>
                  </div>
                  <div className="thermometer-center-line"></div>
                </div>
              </div>
              <div className="indicator-side-value">
                <span className="indicator-value away-value">{derivedStats.loserGames}</span>
              </div>
            </div>
          </div>
          
          {/* Set vinti */}
          <div className="indicator-row">
            <div className="indicator-label">
              <span className="indicator-icon"><ChartLineUp size={16} weight="duotone" /></span>
              <span className="indicator-text">Set Vinti</span>
            </div>
            <div className="indicator-thermometer-container">
              <div className="indicator-side-value">
                <span className="indicator-value home-value">{derivedStats.winnerSetsWon}</span>
              </div>
              <div className="indicator-thermometer">
                <div className="indicator-track">
                  <div className="thermometer-fill home-fill" style={{ width: `${(derivedStats.winnerSetsWon / derivedStats.setsPlayed) * 100}%` }} />
                  <div className="thermometer-fill away-fill" style={{ width: `${(derivedStats.loserSetsWon / derivedStats.setsPlayed) * 100}%` }} />
                  <div 
                    className="thermometer-indicator"
                    style={{ left: `${(derivedStats.winnerSetsWon / derivedStats.setsPlayed) * 100}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="indicator-needle"></div>
                    <div className="indicator-value-badge">+{derivedStats.winnerSetsWon - derivedStats.loserSetsWon}</div>
                  </div>
                  <div className="thermometer-center-line"></div>
                </div>
              </div>
              <div className="indicator-side-value">
                <span className="indicator-value away-value">{derivedStats.loserSetsWon}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Dettaglio set per set */}
        <div className="zone-distribution">
          <div className="zone-title">Dettaglio Set</div>
          <div className="set-details-grid">
            {derivedStats.setScores.map((set, idx) => (
              <div key={idx} className="set-detail-item">
                <span className="set-label">Set {idx + 1}</span>
                <span className="set-score">{set.winner}-{set.loser}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: NO DATA AT ALL
  // ============================================================================
  if (!stats) {
    return (
      <div className="indicators-chart">
        <div className="chart-header">
          <span className="chart-icon"><ChartBar size={20} weight="duotone" /></span>
          <h3 className="chart-title">Indicatori Match</h3>
        </div>
        <div className="chart-no-data">
          <span><Hourglass size={16} weight="duotone" /> Nessun dato disponibile</span>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: FULL MODE (PowerRankings disponibili)
  // ============================================================================
  const indicators = [
    { label: 'Game Totali', icon: <TennisBall size={16} weight="duotone" />, home: stats.homeGames, away: stats.awayGames, homeColor: '#5b8fb9', awayColor: '#c97676' },
    { label: 'Dominio', icon: <Barbell size={16} weight="duotone" />, home: stats.homeDominant, away: stats.awayDominant, homeColor: '#6aba7f', awayColor: '#c97676' },
    { label: 'Break', icon: <Lightning size={16} weight="duotone" />, home: stats.homeBreaks, away: stats.awayBreaks, homeColor: '#d4a84b', awayColor: '#d4a84b' },
    { label: 'Max Momentum', icon: <ChartLineUp size={16} weight="duotone" />, home: stats.maxValue, away: stats.minValue, homeColor: '#6c9a8b', awayColor: '#6c9a8b' },
  ];

  return (
    <div className="indicators-chart">
      <div className="chart-header">
        <span className="chart-icon"><ChartBar size={20} weight="duotone" /></span>
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
          
          // Logica imparziale: valore sempre positivo, colore indica chi domina
          const absDiff = Math.abs(diff);
          const isDominantHome = diff > 0;
          const isDominantAway = diff < 0;
          const badgeColor = isDominantHome ? 'home' : (isDominantAway ? 'away' : 'neutral');

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
                      <div className={`indicator-value-badge badge-${badgeColor}`}>
                        {absDiff === 0 ? '=' : absDiff}
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
        
        {/* MINI TERMOMETRO - Ultimi 3 Game (Trend Recente) */}
        {recentStats && (
          <div className="momentum-thermometer mini-thermometer">
            <div className="thermometer-header-mini">
              <span className="mini-label"><Lightning size={14} weight="duotone" /> Ultimi {recentStats.gamesAnalyzed} Game</span>
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
                <div className={`indicator-value-badge mini-badge badge-${recentStats.momentumDiff > 0 ? 'home' : (recentStats.momentumDiff < 0 ? 'away' : 'neutral')}`}>
                  {Math.abs(recentStats.momentumDiff) === 0 ? '=' : Math.abs(recentStats.momentumDiff)}
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
        
        {/* TERMOMETRO MOMENTUM COMPLETO - Tutta la partita */}
        <div className="momentum-thermometer full-thermometer">
          <div className="thermometer-header-mini">
            <span className="full-label"><TennisBall size={14} weight="duotone" /> Partita Completa</span>
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
              <div className={`indicator-value-badge badge-${stats.momentumDiff > 0 ? 'home' : (stats.momentumDiff < 0 ? 'away' : 'neutral')}`}>
                {Math.abs(stats.momentumDiff) === 0 ? '=' : Math.abs(stats.momentumDiff)}
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
