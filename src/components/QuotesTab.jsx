import React, { useState, useMemo } from 'react';
import './QuotesTab.css';

/**
 * QuotesTab - Sezione per analisi quote e value betting
 * 
 * Calcola probabilità stimate basate su:
 * - Ranking giocatori
 * - Momentum attuale
 * - Statistiche match
 * - Break points
 * 
 * Confronta con quote manuali Betfair per trovare VALUE
 */
export default function QuotesTab({ 
  powerRankings = [], 
  eventInfo = {}, 
  statistics = null,
  matchSummary = null 
}) {
  const homeName = eventInfo?.home?.name || eventInfo?.home?.shortName || 'Home';
  const awayName = eventInfo?.away?.name || eventInfo?.away?.shortName || 'Away';
  const homeRanking = eventInfo?.home?.ranking || null;
  const awayRanking = eventInfo?.away?.ranking || null;

  // State per quote manuali Betfair
  const [betfairHomeOdds, setBetfairHomeOdds] = useState('');
  const [betfairAwayOdds, setBetfairAwayOdds] = useState('');

  // Calcola probabilità stimate basate sui dati disponibili
  const estimatedProbabilities = useMemo(() => {
    let homeProb = 50; // Default 50-50
    let factors = [];

    // 1. RANKING (peso: 30%)
    if (homeRanking && awayRanking) {
      // Differenza ranking - chi ha ranking più basso è favorito
      const rankDiff = awayRanking - homeRanking;
      let rankBonus = 0;
      
      if (rankDiff > 100) rankBonus = 15;
      else if (rankDiff > 50) rankBonus = 10;
      else if (rankDiff > 20) rankBonus = 5;
      else if (rankDiff > 0) rankBonus = 2;
      else if (rankDiff < -100) rankBonus = -15;
      else if (rankDiff < -50) rankBonus = -10;
      else if (rankDiff < -20) rankBonus = -5;
      else if (rankDiff < 0) rankBonus = -2;
      
      homeProb += rankBonus;
      factors.push({
        name: 'Ranking',
        homeValue: `#${homeRanking}`,
        awayValue: `#${awayRanking}`,
        impact: rankBonus > 0 ? `+${rankBonus}% Home` : rankBonus < 0 ? `${rankBonus}% Home` : 'Neutro',
        weight: '30%'
      });
    }

    // 2. MOMENTUM ATTUALE (peso: 25%)
    if (powerRankings && powerRankings.length > 0) {
      const lastGames = powerRankings.slice(-5);
      const avgMomentum = lastGames.reduce((sum, g) => sum + (g.value || 0), 0) / lastGames.length;
      
      let momentumBonus = 0;
      if (avgMomentum > 40) momentumBonus = 12;
      else if (avgMomentum > 20) momentumBonus = 8;
      else if (avgMomentum > 10) momentumBonus = 4;
      else if (avgMomentum < -40) momentumBonus = -12;
      else if (avgMomentum < -20) momentumBonus = -8;
      else if (avgMomentum < -10) momentumBonus = -4;
      
      homeProb += momentumBonus;
      factors.push({
        name: 'Momentum (ultimi 5)',
        homeValue: avgMomentum > 0 ? `+${avgMomentum.toFixed(0)}` : avgMomentum.toFixed(0),
        awayValue: avgMomentum < 0 ? `+${Math.abs(avgMomentum).toFixed(0)}` : `-${avgMomentum.toFixed(0)}`,
        impact: momentumBonus > 0 ? `+${momentumBonus}% Home` : momentumBonus < 0 ? `${momentumBonus}% Home` : 'Neutro',
        weight: '25%'
      });

      // Break count
      const homeBreaks = powerRankings.filter(g => g.breakOccurred && g.value > 0).length;
      const awayBreaks = powerRankings.filter(g => g.breakOccurred && g.value < 0).length;
      
      if (homeBreaks !== awayBreaks) {
        const breakBonus = (homeBreaks - awayBreaks) * 3;
        homeProb += Math.max(-10, Math.min(10, breakBonus));
        factors.push({
          name: 'Break effettuati',
          homeValue: homeBreaks.toString(),
          awayValue: awayBreaks.toString(),
          impact: breakBonus > 0 ? `+${Math.min(10, breakBonus)}% Home` : `${Math.max(-10, breakBonus)}% Home`,
          weight: '15%'
        });
      }
    }

    // 3. SCORE ATTUALE (peso: 20%)
    if (matchSummary?.sets && Array.isArray(matchSummary.sets)) {
      const homeSets = matchSummary.sets.filter(s => s.homeScore > s.awayScore).length;
      const awaySets = matchSummary.sets.filter(s => s.awayScore > s.homeScore).length;
      
      if (homeSets !== awaySets) {
        const setBonus = (homeSets - awaySets) * 8;
        homeProb += setBonus;
        factors.push({
          name: 'Set vinti',
          homeValue: homeSets.toString(),
          awayValue: awaySets.toString(),
          impact: setBonus > 0 ? `+${setBonus}% Home` : `${setBonus}% Home`,
          weight: '20%'
        });
      }
    } else if (matchSummary?.homeScore !== undefined && matchSummary?.awayScore !== undefined) {
      // Try alternative format
      const homeSets = matchSummary.homeScore || 0;
      const awaySets = matchSummary.awayScore || 0;
      
      if (homeSets !== awaySets) {
        const setBonus = (homeSets - awaySets) * 8;
        homeProb += setBonus;
        factors.push({
          name: 'Set vinti',
          homeValue: homeSets.toString(),
          awayValue: awaySets.toString(),
          impact: setBonus > 0 ? `+${setBonus}% Home` : `${setBonus}% Home`,
          weight: '20%'
        });
      }
    }

    // Limita probabilità tra 5% e 95%
    homeProb = Math.max(5, Math.min(95, homeProb));
    const awayProb = 100 - homeProb;

    return {
      home: homeProb,
      away: awayProb,
      factors
    };
  }, [powerRankings, eventInfo, matchSummary, homeRanking, awayRanking]);

  // Converti probabilità in quote decimali
  const estimatedOdds = useMemo(() => {
    const homeOdds = (100 / estimatedProbabilities.home).toFixed(2);
    const awayOdds = (100 / estimatedProbabilities.away).toFixed(2);
    return { home: parseFloat(homeOdds), away: parseFloat(awayOdds) };
  }, [estimatedProbabilities]);

  // Analizza VALUE comparing con quote Betfair
  const valueAnalysis = useMemo(() => {
    const betfairHome = parseFloat(betfairHomeOdds);
    const betfairAway = parseFloat(betfairAwayOdds);

    const result = {
      home: { signal: 'neutral', message: 'Inserisci quota Betfair', value: 0, recommendation: '' },
      away: { signal: 'neutral', message: 'Inserisci quota Betfair', value: 0, recommendation: '' }
    };

    if (betfairHome && betfairHome > 1) {
      const impliedProb = 100 / betfairHome;
      const edge = estimatedProbabilities.home - impliedProb;
      result.home.value = edge;

      if (edge > 8) {
        result.home.signal = 'buy';
        result.home.message = `VALUE! +${edge.toFixed(1)}% edge`;
        result.home.recommendation = `BACK ${homeName} - La quota ${betfairHome} sottovaluta il giocatore`;
      } else if (edge > 3) {
        result.home.signal = 'watch';
        result.home.message = `Leggero value +${edge.toFixed(1)}%`;
        result.home.recommendation = `Possibile BACK - Monitorare il momentum`;
      } else if (edge < -8) {
        result.home.signal = 'sell';
        result.home.message = `OVERPRICED ${edge.toFixed(1)}%`;
        result.home.recommendation = `LAY ${homeName} - La quota ${betfairHome} è troppo bassa`;
      } else if (edge < -3) {
        result.home.signal = 'caution';
        result.home.message = `Leggermente overpriced ${edge.toFixed(1)}%`;
        result.home.recommendation = `Evita BACK - Aspetta quota migliore`;
      } else {
        result.home.signal = 'neutral';
        result.home.message = `Fair value (${edge.toFixed(1)}%)`;
        result.home.recommendation = 'Quota in linea con le probabilità';
      }
    }

    if (betfairAway && betfairAway > 1) {
      const impliedProb = 100 / betfairAway;
      const edge = estimatedProbabilities.away - impliedProb;
      result.away.value = edge;

      if (edge > 8) {
        result.away.signal = 'buy';
        result.away.message = `VALUE! +${edge.toFixed(1)}% edge`;
        result.away.recommendation = `BACK ${awayName} - La quota ${betfairAway} sottovaluta il giocatore`;
      } else if (edge > 3) {
        result.away.signal = 'watch';
        result.away.message = `Leggero value +${edge.toFixed(1)}%`;
        result.away.recommendation = `Possibile BACK - Monitorare il momentum`;
      } else if (edge < -8) {
        result.away.signal = 'sell';
        result.away.message = `OVERPRICED ${edge.toFixed(1)}%`;
        result.away.recommendation = `LAY ${awayName} - La quota ${betfairAway} è troppo bassa`;
      } else if (edge < -3) {
        result.away.signal = 'caution';
        result.away.message = `Leggermente overpriced ${edge.toFixed(1)}%`;
        result.away.recommendation = `Evita BACK - Aspetta quota migliore`;
      } else {
        result.away.signal = 'neutral';
        result.away.message = `Fair value (${edge.toFixed(1)}%)`;
        result.away.recommendation = 'Quota in linea con le probabilità';
      }
    }

    return result;
  }, [betfairHomeOdds, betfairAwayOdds, estimatedProbabilities, homeName, awayName]);

  // Funzione per ottenere colore/icona semaforo
  const getSignalStyle = (signal) => {
    switch (signal) {
      case 'buy':
        return { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', color: '#34d399', icon: '🟢', label: 'COMPRA' };
      case 'watch':
        return { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', color: '#fbbf24', icon: '🟡', label: 'MONITORA' };
      case 'sell':
        return { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', color: '#f87171', icon: '🔴', label: 'VENDI/LAY' };
      case 'caution':
        return { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', color: '#fb923c', icon: '🟠', label: 'CAUTELA' };
      default:
        return { bg: 'rgba(30, 41, 59, 0.9)', border: 'rgba(255, 255, 255, 0.15)', color: '#8b95a5', icon: '⚪', label: 'ATTENDI' };
    }
  };

  return (
    <div className="quotes-tab">
      {/* Header */}
      <div className="quotes-header">
        <h2 className="quotes-title">
          <span className="quotes-icon">💰</span>
          Analisi Quote & Value Betting
        </h2>
        <p className="quotes-subtitle">
          Confronta le probabilità stimate con le quote Betfair per trovare VALUE
        </p>
      </div>

      {/* Probabilità Stimate */}
      <section className="quotes-section">
        <h3 className="section-title">
          <span className="section-icon">📊</span>
          Probabilità Stimate
        </h3>
        
        <div className="probability-display">
          <div className="prob-player home">
            <span className="prob-name">{homeName}</span>
            <div className="prob-bar-container">
              <div 
                className="prob-bar home" 
                style={{ width: `${estimatedProbabilities.home}%` }}
              />
            </div>
            <span className="prob-value">{estimatedProbabilities.home.toFixed(1)}%</span>
            <span className="prob-odds">@ {estimatedOdds.home}</span>
          </div>
          
          <div className="prob-player away">
            <span className="prob-name">{awayName}</span>
            <div className="prob-bar-container">
              <div 
                className="prob-bar away" 
                style={{ width: `${estimatedProbabilities.away}%` }}
              />
            </div>
            <span className="prob-value">{estimatedProbabilities.away.toFixed(1)}%</span>
            <span className="prob-odds">@ {estimatedOdds.away}</span>
          </div>
        </div>

        {/* Fattori */}
        <div className="factors-list">
          <h4 className="factors-title">Fattori considerati:</h4>
          {estimatedProbabilities.factors.map((factor, idx) => (
            <div key={idx} className="factor-row">
              <span className="factor-name">{factor.name}</span>
              <span className="factor-values">
                <span className="factor-home">{factor.homeValue}</span>
                <span className="factor-vs">vs</span>
                <span className="factor-away">{factor.awayValue}</span>
              </span>
              <span className={`factor-impact ${factor.impact.includes('+') ? 'positive' : factor.impact.includes('-') ? 'negative' : ''}`}>
                {factor.impact}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Input Quote Betfair */}
      <section className="quotes-section">
        <h3 className="section-title">
          <span className="section-icon">🎯</span>
          Quote Betfair (inserisci manualmente)
        </h3>
        
        <div className="betfair-inputs">
          <div className="betfair-input-group home">
            <label>{homeName}</label>
            <input
              type="number"
              step="0.01"
              min="1.01"
              placeholder="Es: 1.85"
              value={betfairHomeOdds}
              onChange={(e) => setBetfairHomeOdds(e.target.value)}
            />
          </div>
          
          <div className="betfair-input-group away">
            <label>{awayName}</label>
            <input
              type="number"
              step="0.01"
              min="1.01"
              placeholder="Es: 2.10"
              value={betfairAwayOdds}
              onChange={(e) => setBetfairAwayOdds(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Semaforo VALUE */}
      <section className="quotes-section signals-section">
        <h3 className="section-title">
          <span className="section-icon">🚦</span>
          Segnali VALUE
        </h3>
        
        <div className="value-signals">
          {/* Home Signal */}
          <div 
            className="signal-card"
            style={{ 
              background: getSignalStyle(valueAnalysis.home.signal).bg,
              borderColor: getSignalStyle(valueAnalysis.home.signal).border
            }}
          >
            <div className="signal-header">
              <span className="signal-player">{homeName}</span>
              <span className="signal-icon">{getSignalStyle(valueAnalysis.home.signal).icon}</span>
            </div>
            <div 
              className="signal-label"
              style={{ color: getSignalStyle(valueAnalysis.home.signal).color }}
            >
              {getSignalStyle(valueAnalysis.home.signal).label}
            </div>
            <div className="signal-message">{valueAnalysis.home.message}</div>
            {valueAnalysis.home.recommendation && (
              <div className="signal-recommendation">
                💡 {valueAnalysis.home.recommendation}
              </div>
            )}
            {betfairHomeOdds && (
              <div className="signal-comparison">
                <span>Betfair: <strong>{betfairHomeOdds}</strong></span>
                <span>vs</span>
                <span>Stimata: <strong>{estimatedOdds.home}</strong></span>
              </div>
            )}
          </div>

          {/* Away Signal */}
          <div 
            className="signal-card"
            style={{ 
              background: getSignalStyle(valueAnalysis.away.signal).bg,
              borderColor: getSignalStyle(valueAnalysis.away.signal).border
            }}
          >
            <div className="signal-header">
              <span className="signal-player">{awayName}</span>
              <span className="signal-icon">{getSignalStyle(valueAnalysis.away.signal).icon}</span>
            </div>
            <div 
              className="signal-label"
              style={{ color: getSignalStyle(valueAnalysis.away.signal).color }}
            >
              {getSignalStyle(valueAnalysis.away.signal).label}
            </div>
            <div className="signal-message">{valueAnalysis.away.message}</div>
            {valueAnalysis.away.recommendation && (
              <div className="signal-recommendation">
                💡 {valueAnalysis.away.recommendation}
              </div>
            )}
            {betfairAwayOdds && (
              <div className="signal-comparison">
                <span>Betfair: <strong>{betfairAwayOdds}</strong></span>
                <span>vs</span>
                <span>Stimata: <strong>{estimatedOdds.away}</strong></span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Legenda */}
      <section className="quotes-legend">
        <h4>Legenda Segnali:</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-icon">🟢</span>
            <span><strong>COMPRA</strong> - Value &gt; 8%: quota sottovalutata, BACK consigliato</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🟡</span>
            <span><strong>MONITORA</strong> - Value 3-8%: possibile opportunità, osservare</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🟠</span>
            <span><strong>CAUTELA</strong> - Value negativo lieve: evita BACK</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🔴</span>
            <span><strong>VENDI/LAY</strong> - Overpriced &gt; 8%: considera LAY</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">⚪</span>
            <span><strong>ATTENDI</strong> - Fair value: nessuna azione raccomandata</span>
          </div>
        </div>
      </section>
    </div>
  );
}
