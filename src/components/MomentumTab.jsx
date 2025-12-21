import React, { memo, useState, useMemo } from 'react';
import { 
  interpretGameValue, 
  getStatusColor, 
  getZoneIcon, 
  analyzePowerRankings,
  calculateVolatility,
  calculateElasticity,
  analyzeMomentumTrend,
  classifyMatchCharacter,
  analyzePowerRankingsEnhanced
} from '../utils';
import './MomentumTab.css';

/**
 * MomentumTab - Sezione dedicata all'analisi del momentum della partita
 * 
 * @param {Array} powerRankings - Dati tennisPowerRankings
 * @param {Object} eventInfo - Info evento con home/away
 */
function MomentumTabComponent({ powerRankings = [], eventInfo = {}, isLive = false }) {
  const homeName = eventInfo?.home?.name || eventInfo?.home?.shortName || 'Home';
  const awayName = eventInfo?.away?.name || eventInfo?.away?.shortName || 'Away';

  // State per filtri
  const [gameCount, setGameCount] = useState(3);
  const [followPlayer, setFollowPlayer] = useState('home'); // 'home' | 'away' | 'both'

  // Analisi completa potenziata
  const analysis = useMemo(() => analyzePowerRankingsEnhanced(powerRankings), [powerRankings]);
  
  // Ultimi N game (filtrato)
  const lastNGames = useMemo(() => {
    return powerRankings.slice(-gameCount);
  }, [powerRankings, gameCount]);
  
  const lastNAnalysis = useMemo(() => {
    return analyzeLast3Games(lastNGames, homeName, awayName);
  }, [lastNGames, homeName, awayName]);
  
  // Dati per il grafico
  const chartData = prepareChartData(powerRankings);
  
  // Statistiche per set
  const setStats = analyzeBySet(powerRankings, homeName, awayName);

  if (!powerRankings || powerRankings.length === 0) {
    return (
      <div className="momentum-tab">
        <div className="momentum-empty" style={isLive ? { background: '#fff6f6', border: '1px solid #f5cfcf', color: '#c97676' } : {}}>
          <div className="momentum-empty-icon">📊</div>
          <div className="momentum-empty-title">Nessun dato di momentum disponibile</div>
          <div className="momentum-empty-subtitle">
            {isLive ? 'In Live Mode i dati momentum dovrebbero arrivare in tempo reale; al momento sono assenti.' : 'I dati di momentum vengono estratti da tennisPowerRankings durante la partita'}
          </div>
        </div>
      </div>
    );
  }

  // Funzione per interpretare il game dal punto di vista del giocatore selezionato
  const interpretGameForPlayer = (game, player) => {
    const value = game.value || 0;
    const isHome = player === 'home';
    const playerName = isHome ? homeName : awayName;
    const opponentName = isHome ? awayName : homeName;
    
    // Per home: valori positivi = bene, negativi = male
    // Per away: valori negativi = bene, positivi = male
    const adjustedValue = isHome ? value : -value;
    
    let status, message, colorClass;
    
    if (game.breakOccurred) {
      // C'è stato un break
      if (adjustedValue > 20) {
        status = 'excellent';
        message = `${playerName} ha breakkato!`;
        colorClass = 'success';
      } else if (adjustedValue < -20) {
        status = 'bad';
        message = `${playerName} ha subito break`;
        colorClass = 'danger';
      } else {
        status = 'neutral';
        message = 'Break nel game';
        colorClass = 'warning';
      }
    } else {
      // Game normale
      if (adjustedValue > 40) {
        status = 'excellent';
        message = `${playerName} domina`;
        colorClass = 'success';
      } else if (adjustedValue > 15) {
        status = 'good';
        message = `${playerName} in controllo`;
        colorClass = 'success-light';
      } else if (adjustedValue > -15) {
        status = 'neutral';
        message = 'Game equilibrato';
        colorClass = 'neutral';
      } else if (adjustedValue > -40) {
        status = 'pressure';
        message = `${playerName} sotto pressione`;
        colorClass = 'warning';
      } else {
        status = 'bad';
        message = `${playerName} in difficoltà`;
        colorClass = 'danger';
      }
    }
    
    return { status, message, colorClass, adjustedValue };
  };

  // Calcola trend per il giocatore selezionato
  const calculatePlayerTrend = (games, player) => {
    if (games.length < 2) return { trend: 'stable', icon: '➖', color: 'neutral' };
    
    const isHome = player === 'home';
    const values = games.map(g => isHome ? (g.value || 0) : -(g.value || 0));
    
    let positiveGames = 0;
    let negativeGames = 0;
    
    values.forEach(v => {
      if (v > 10) positiveGames++;
      else if (v < -10) negativeGames++;
    });
    
    const lastValue = values[values.length - 1];
    const firstValue = values[0];
    const diff = lastValue - firstValue;
    
    if (positiveGames >= games.length * 0.6 || diff > 15) {
      return { trend: 'up', icon: '📈', color: 'success' };
    } else if (negativeGames >= games.length * 0.6 || diff < -15) {
      return { trend: 'down', icon: '📉', color: 'danger' };
    }
    return { trend: 'stable', icon: '➖', color: 'neutral' };
  };

  const playerTrend = calculatePlayerTrend(lastNGames, followPlayer === 'both' ? 'home' : followPlayer);

  return (
    <div className="momentum-tab">
      {/* Sezione Ultimi 3 Game */}
      <section className="momentum-section">
        <div className="momentum-section-header">
          <h3 className="momentum-section-title">
            <span className="momentum-section-icon">⚡</span>
            Ultimi {gameCount} Game - Trend Attuale
          </h3>
          
          {/* Filtri */}
          <div className="momentum-filters">
            {/* Filtro numero game */}
            <div className="filter-group">
              <label className="filter-label">Game:</label>
              <div className="filter-buttons">
                {[3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    className={`filter-btn ${gameCount === n ? 'active' : ''}`}
                    onClick={() => setGameCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Filtro giocatore */}
            <div className="filter-group">
              <label className="filter-label">Segui:</label>
              <div className="filter-buttons player-filter">
                <button
                  className={`filter-btn player-btn home ${followPlayer === 'home' ? 'active' : ''}`}
                  onClick={() => setFollowPlayer('home')}
                >
                  {homeName.split(' ').pop()}
                </button>
                <button
                  className={`filter-btn player-btn away ${followPlayer === 'away' ? 'active' : ''}`}
                  onClick={() => setFollowPlayer('away')}
                >
                  {awayName.split(' ').pop()}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="momentum-last3-container">
          {/* Trend indicator in evidenza */}
          <div className={`trend-banner trend-${playerTrend.color}`}>
            <span className="trend-banner-icon">{playerTrend.icon}</span>
            <span className="trend-banner-text">
              {playerTrend.trend === 'up' && `${followPlayer === 'home' ? homeName : awayName} in crescita`}
              {playerTrend.trend === 'down' && `${followPlayer === 'home' ? homeName : awayName} in calo`}
              {playerTrend.trend === 'stable' && 'Situazione stabile'}
            </span>
          </div>
          
          {/* Cards dei game */}
          <div className="momentum-last3-cards" style={{ gridTemplateColumns: `repeat(${Math.min(gameCount, 3)}, 1fr)` }}>
            {lastNGames.map((game, idx) => {
              const playerInterpretation = interpretGameForPlayer(game, followPlayer);
              return (
                <div 
                  key={idx} 
                  className={`momentum-game-card card-${playerInterpretation.colorClass}`}
                >
                  <div className="game-card-header">
                    <span className="game-card-label">Set {game.set} - Game {game.game}</span>
                    {game.breakOccurred && <span className="game-card-break">BREAK</span>}
                  </div>
                  <div className="game-card-value">
                    <span className={`game-card-indicator ${playerInterpretation.colorClass}`}>
                      {playerInterpretation.colorClass === 'success' && '✓'}
                      {playerInterpretation.colorClass === 'success-light' && '↑'}
                      {playerInterpretation.colorClass === 'neutral' && '•'}
                      {playerInterpretation.colorClass === 'warning' && '⚠'}
                      {playerInterpretation.colorClass === 'danger' && '✗'}
                    </span>
                    <span className="game-card-number">{Math.round(Math.abs(game.value))}</span>
                  </div>
                  <div className="game-card-message">
                    {playerInterpretation.message}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Analisi trend */}
          <div className="momentum-last3-analysis">
            <div className="trend-stats">
              <div className="trend-stat">
                <span className="trend-stat-label">Media ultimi {gameCount}</span>
                <span className={`trend-stat-value ${lastNAnalysis.avgValue > 0 ? 'positive' : lastNAnalysis.avgValue < 0 ? 'negative' : ''}`}>
                  {lastNAnalysis.avgValue > 0 ? '+' : ''}{lastNAnalysis.avgValue}
                </span>
              </div>
              <div className="trend-stat">
                <span className="trend-stat-label">Direzione</span>
                <span className="trend-stat-value">{lastNAnalysis.direction}</span>
              </div>
              <div className="trend-stat">
                <span className="trend-stat-label">Dominante</span>
                <span className="trend-stat-value">{lastNAnalysis.dominant}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sezione Grafico Momentum */}
      <section className="momentum-section">
        <h3 className="momentum-section-title">
          <span className="momentum-section-icon">📈</span>
          Andamento Momentum - Intera Partita
        </h3>
        
        <div className="momentum-chart-container">
          {/* Legenda */}
          <div className="momentum-chart-legend">
            <div className="legend-item legend-home">
              <span className="legend-color"></span>
              <span className="legend-name">{homeName}</span>
              <span className="legend-direction">(valori positivi)</span>
            </div>
            <div className="legend-item legend-away">
              <span className="legend-color"></span>
              <span className="legend-name">{awayName}</span>
              <span className="legend-direction">(valori negativi)</span>
            </div>
          </div>
          
          {/* Grafico SVG */}
          <div className="momentum-chart">
            <MomentumChart data={chartData} homeName={homeName} awayName={awayName} />
          </div>
          
          {/* Indicatori di set */}
          <div className="momentum-chart-sets">
            {Object.keys(setStats).map(setNum => (
              <div key={setNum} className="set-indicator">
                <span className="set-badge">Set {setNum}</span>
                <span className="set-games">{setStats[setNum].games} game</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sezione Statistiche Generali */}
      <section className="momentum-section">
        <h3 className="momentum-section-title">
          <span className="momentum-section-icon">📊</span>
          Statistiche Momentum
        </h3>
        
        <div className="momentum-stats-grid">
          {/* Card Valore Attuale */}
          <div className="momentum-stat-card momentum-stat-current">
            <div className="stat-card-label">Valore Attuale</div>
            <div className="stat-card-value">
              {getZoneIcon(interpretGameValue({ value: powerRankings[powerRankings.length - 1]?.value })?.zone)}
              {' '}{powerRankings[powerRankings.length - 1]?.value || 0}
            </div>
            <div className="stat-card-sublabel">
              {interpretGameValue({ value: powerRankings[powerRankings.length - 1]?.value })?.messageIt || 'Equilibrato'}
            </div>
          </div>
          
          {/* Card Media */}
          <div className="momentum-stat-card">
            <div className="stat-card-label">Media Partita</div>
            <div className={`stat-card-value ${analysis?.averageValue > 0 ? 'text-positive' : analysis?.averageValue < 0 ? 'text-negative' : ''}`}>
              {analysis?.averageValue > 0 ? '+' : ''}{analysis?.averageValue || 0}
            </div>
            <div className="stat-card-sublabel">su {analysis?.totalGames || 0} game</div>
          </div>
          
          {/* Card Range */}
          <div className="momentum-stat-card">
            <div className="stat-card-label">Range Valori</div>
            <div className="stat-card-value stat-card-range">
              <span className="range-min">{analysis?.minValue || 0}</span>
              <span className="range-arrow">→</span>
              <span className="range-max">{analysis?.maxValue || 0}</span>
            </div>
            <div className="stat-card-sublabel">min → max</div>
          </div>
          
          {/* Card Game Dominanti */}
          <div className="momentum-stat-card momentum-stat-dominant">
            <div className="stat-card-label">Game Dominanti</div>
            <div className="stat-card-value">🔥 {analysis?.dominantGames?.length || 0}</div>
            <div className="stat-card-sublabel">value {'>'} 60</div>
          </div>
          
          {/* Card Game in Pressione */}
          <div className="momentum-stat-card momentum-stat-pressure">
            <div className="stat-card-label">Game in Pressione</div>
            <div className="stat-card-value">🚨 {analysis?.pressureGames?.length || 0}</div>
            <div className="stat-card-sublabel">value {'<'} -20</div>
          </div>
          
          {/* Card Break */}
          <div className="momentum-stat-card">
            <div className="stat-card-label">Break nella Partita</div>
            <div className="stat-card-value">
              {powerRankings.filter(g => g.breakOccurred).length}
            </div>
            <div className="stat-card-sublabel">game con break</div>
          </div>
        </div>
      </section>

      {/* Sezione Analisi Avanzata */}
      {analysis && (
        <section className="momentum-section">
          <h3 className="momentum-section-title">
            <span className="momentum-section-icon">🧠</span>
            Analisi Avanzata
          </h3>
          
          <div className="momentum-advanced-grid">
            {/* Card Volatilità */}
            <div className={`momentum-advanced-card volatility-${analysis.volatility?.class?.toLowerCase() || 'stabile'}`}>
              <div className="advanced-card-icon">📊</div>
              <div className="advanced-card-label">Volatilità</div>
              <div className="advanced-card-value">{analysis.volatility?.class || 'N/A'}</div>
              <div className="advanced-card-detail">
                Δ medio: {analysis.volatility?.value || 0}
              </div>
            </div>
            
            {/* Card Elasticità */}
            <div className={`momentum-advanced-card elasticity-${analysis.elasticity?.class?.toLowerCase() || 'normale'}`}>
              <div className="advanced-card-icon">🔄</div>
              <div className="advanced-card-label">Elasticità</div>
              <div className="advanced-card-value">{analysis.elasticity?.class || 'N/A'}</div>
              <div className="advanced-card-detail">
                Fasi negative: {analysis.elasticity?.negative_phases || 0}
              </div>
            </div>
            
            {/* Card Trend */}
            <div className={`momentum-advanced-card trend-${analysis.trend?.current_trend?.toLowerCase() || 'stable'}`}>
              <div className="advanced-card-icon">
                {analysis.trend?.current_trend === 'RISING' ? '📈' : 
                 analysis.trend?.current_trend === 'FALLING' ? '📉' : '➖'}
              </div>
              <div className="advanced-card-label">Trend Attuale</div>
              <div className="advanced-card-value">{analysis.trend?.current_trend || 'STABLE'}</div>
              <div className="advanced-card-detail">
                Media recente: {analysis.trend?.recent_avg || 0}
              </div>
            </div>
            
            {/* Card Carattere Match */}
            <div className="momentum-advanced-card match-character">
              <div className="advanced-card-icon">🎭</div>
              <div className="advanced-card-label">Carattere Match</div>
              <div className="advanced-card-value">{analysis.matchCharacter?.character?.replace(/_/g, ' ') || 'N/A'}</div>
              <div className="advanced-card-detail">
                {analysis.matchCharacter?.description || ''}
              </div>
            </div>
          </div>
          
          {/* Momentum Shift Alert */}
          {analysis.trend?.momentum_shift_detected && (
            <div className="momentum-shift-alert">
              <span className="shift-icon">⚡</span>
              <span className="shift-text">
                Rilevato cambio significativo di momentum! 
                Media recente ({analysis.trend.recent_avg}) molto diversa dalla media match ({analysis.trend.match_avg})
              </span>
            </div>
          )}
        </section>
      )}

      {/* Analisi per Set */}
      <section className="momentum-section">
        <h3 className="momentum-section-title">
          <span className="momentum-section-icon">🎯</span>
          Analisi per Set
        </h3>
        
        <div className="momentum-sets-container">
          {Object.entries(setStats).map(([setNum, stats]) => (
            <div key={setNum} className="momentum-set-card">
              <div className="set-card-header">
                <span className="set-card-title">Set {setNum}</span>
                <span className="set-card-games">{stats.games} game</span>
              </div>
              
              <div className="set-card-body">
                <div className="set-stat">
                  <span className="set-stat-label">Media</span>
                  <span className={`set-stat-value ${stats.avgValue > 0 ? 'positive' : stats.avgValue < 0 ? 'negative' : ''}`}>
                    {stats.avgValue > 0 ? '+' : ''}{stats.avgValue}
                  </span>
                </div>
                <div className="set-stat">
                  <span className="set-stat-label">Dominante</span>
                  <span className="set-stat-value">{stats.dominant}</span>
                </div>
                <div className="set-stat">
                  <span className="set-stat-label">Break</span>
                  <span className="set-stat-value">{stats.breaks}</span>
                </div>
              </div>
              
              {/* Mini grafico del set */}
              <div className="set-mini-chart">
                <MiniSetChart data={stats.values} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Analizza gli ultimi 3 game per determinare il trend
 */
function analyzeLast3Games(games, homeName, awayName) {
  if (!games || games.length === 0) {
    return {
      avgValue: 0,
      trendIcon: '➖',
      trendMessage: 'Nessun dato disponibile',
      direction: '-',
      dominant: '-'
    };
  }

  const values = games.map(g => g.value || 0);
  const avgValue = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  
  // Determina trend (crescente, decrescente, stabile)
  let trend = 'stable';
  if (values.length >= 2) {
    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;
    
    if (diff > 10) trend = 'rising';
    else if (diff < -10) trend = 'falling';
  }
  
  // Determina chi è dominante
  const dominant = avgValue > 15 ? homeName : avgValue < -15 ? awayName : 'Equilibrio';
  
  // Genera messaggi
  let trendIcon, trendMessage, direction;
  
  if (trend === 'rising') {
    trendIcon = '📈';
    direction = `↑ Verso ${homeName}`;
    if (avgValue > 0) {
      trendMessage = `${homeName} sta aumentando il controllo del match`;
    } else {
      trendMessage = `${awayName} sta perdendo momentum`;
    }
  } else if (trend === 'falling') {
    trendIcon = '📉';
    direction = `↓ Verso ${awayName}`;
    if (avgValue < 0) {
      trendMessage = `${awayName} sta prendendo il controllo`;
    } else {
      trendMessage = `${homeName} sta perdendo il vantaggio`;
    }
  } else {
    trendIcon = '➡️';
    direction = 'Stabile';
    if (avgValue > 20) {
      trendMessage = `${homeName} mantiene il controllo`;
    } else if (avgValue < -20) {
      trendMessage = `${awayName} mantiene il controllo`;
    } else {
      trendMessage = 'Situazione equilibrata, entrambi competitivi';
    }
  }

  return {
    avgValue,
    trendIcon,
    trendMessage,
    direction,
    dominant
  };
}

/**
 * Prepara i dati per il grafico
 */
function prepareChartData(powerRankings) {
  return powerRankings.map((item, idx) => ({
    index: idx,
    set: item.set,
    game: item.game,
    value: item.value || 0,
    breakOccurred: item.breakOccurred || false
  }));
}

/**
 * Analizza i dati raggruppati per set
 */
function analyzeBySet(powerRankings, homeName, awayName) {
  const bySet = {};
  
  for (const item of powerRankings) {
    const setNum = item.set || 1;
    if (!bySet[setNum]) {
      bySet[setNum] = {
        games: 0,
        values: [],
        breaks: 0,
        sum: 0
      };
    }
    
    bySet[setNum].games++;
    bySet[setNum].values.push(item.value || 0);
    bySet[setNum].sum += item.value || 0;
    if (item.breakOccurred) bySet[setNum].breaks++;
  }
  
  // Calcola medie e dominante per ogni set
  for (const setNum in bySet) {
    const set = bySet[setNum];
    set.avgValue = Math.round(set.sum / set.games);
    set.dominant = set.avgValue > 10 ? homeName : set.avgValue < -10 ? awayName : 'Equilibrio';
  }
  
  return bySet;
}

/**
 * Componente grafico momentum SVG
 */
function MomentumChart({ data, homeName, awayName }) {
  if (!data || data.length === 0) return null;
  
  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Trova min e max per scala
  const values = data.map(d => d.value);
  const maxVal = Math.max(100, Math.max(...values));
  const minVal = Math.min(-100, Math.min(...values));
  const range = maxVal - minVal;
  
  // Funzioni di scala
  const scaleX = (idx) => padding.left + (idx / (data.length - 1 || 1)) * chartWidth;
  const scaleY = (val) => padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
  
  // Genera path per l'area
  const areaPathPositive = data.map((d, i) => {
    const x = scaleX(i);
    const y = d.value > 0 ? scaleY(d.value) : scaleY(0);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') + ` L ${scaleX(data.length - 1)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;
  
  const areaPathNegative = data.map((d, i) => {
    const x = scaleX(i);
    const y = d.value < 0 ? scaleY(d.value) : scaleY(0);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') + ` L ${scaleX(data.length - 1)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;
  
  // Genera path per la linea
  const linePath = data.map((d, i) => {
    const x = scaleX(i);
    const y = scaleY(d.value);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  
  // Identifica i break points
  const breakPoints = data.filter(d => d.breakOccurred);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="momentum-svg-chart">
      {/* Sfondo */}
      <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="rgba(15, 20, 25, 0.6)" rx="4" />
      
      {/* Griglia orizzontale */}
      {[-50, 0, 50].map(val => (
        <g key={val}>
          <line 
            x1={padding.left} 
            y1={scaleY(val)} 
            x2={width - padding.right} 
            y2={scaleY(val)} 
            stroke={val === 0 ? '#3b82f6' : 'rgba(255, 255, 255, 0.15)'} 
            strokeWidth={val === 0 ? 2 : 1}
            strokeDasharray={val === 0 ? '0' : '4,4'}
          />
          <text x={padding.left - 8} y={scaleY(val) + 4} textAnchor="end" fill="#8b95a5" fontSize="11">
            {val}
          </text>
        </g>
      ))}
      
      {/* Area positiva (home) */}
      <path d={areaPathPositive} fill="rgba(76, 175, 80, 0.25)" />
      
      {/* Area negativa (away) */}
      <path d={areaPathNegative} fill="rgba(244, 67, 54, 0.25)" />
      
      {/* Linea momentum */}
      <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Punti */}
      {data.map((d, i) => (
        <g key={i}>
          <circle 
            cx={scaleX(i)} 
            cy={scaleY(d.value)} 
            r={d.breakOccurred ? 6 : 4} 
            fill={d.value > 0 ? '#4ade80' : d.value < 0 ? '#f87171' : '#6b7280'}
            stroke="rgba(30, 41, 59, 0.9)"
            strokeWidth="2"
          />
          {d.breakOccurred && (
            <text x={scaleX(i)} y={scaleY(d.value) - 10} textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="bold">
              BRK
            </text>
          )}
        </g>
      ))}
      
      {/* Etichette asse X (set) */}
      <text x={padding.left} y={height - 5} fill="#8b95a5" fontSize="10">Game 1</text>
      <text x={width - padding.right} y={height - 5} textAnchor="end" fill="#8b95a5" fontSize="10">Game {data.length}</text>
    </svg>
  );
}

/**
 * Mini grafico per singolo set
 */
function MiniSetChart({ data }) {
  if (!data || data.length === 0) return null;
  
  const width = 150;
  const height = 40;
  const padding = 4;
  
  const values = data;
  const maxVal = Math.max(50, Math.max(...values.map(Math.abs)));
  
  const scaleX = (idx) => padding + (idx / (values.length - 1 || 1)) * (width - 2 * padding);
  const scaleY = (val) => height / 2 - (val / maxVal) * (height / 2 - padding);
  
  const linePath = values.map((val, i) => {
    const x = scaleX(i);
    const y = scaleY(val);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mini-set-chart">
      {/* Linea zero */}
      <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
      
      {/* Linea momentum */}
      <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
      
      {/* Punti estremi */}
      {values.length > 0 && (
        <>
          <circle cx={scaleX(0)} cy={scaleY(values[0])} r="3" fill={values[0] > 0 ? '#4ade80' : '#f87171'} />
          <circle cx={scaleX(values.length - 1)} cy={scaleY(values[values.length - 1])} r="3" fill={values[values.length - 1] > 0 ? '#4ade80' : '#f87171'} />
        </>
      )}
    </svg>
  );
}

// Memoize MomentumTab to prevent unnecessary re-renders
export default memo(MomentumTabComponent);
