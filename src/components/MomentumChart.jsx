import React, { useMemo } from 'react';
import { interpretGameValue, getZoneIcon } from '../utils';
import { ChartLineUp, Hourglass } from '@phosphor-icons/react';

/**
 * MomentumChart - Grafico momentum match basato su powerRankings
 * Replica la logica del MomentumTab per l'overview
 */
export default function MomentumChart({ powerRankings = [], homeName = 'Home', awayName = 'Away' }) {
  
  // Prepara i dati per il grafico
  const chartData = useMemo(() => {
    if (!powerRankings || powerRankings.length === 0) return [];
    return powerRankings.map((item, idx) => ({
      index: idx,
      set: item.set,
      game: item.game,
      value: item.value || 0,
      breakOccurred: item.breakOccurred || false
    }));
  }, [powerRankings]);
  
  // Statistiche momentum
  const stats = useMemo(() => {
    if (!chartData.length) return { maxHome: 0, maxAway: 0, current: 0, recentAvg: 0, swings: 0 };
    
    let maxHome = 0;
    let maxAway = 0;
    let swings = 0;
    let lastSign = 0;
    
    chartData.forEach(p => {
      if (p.value > maxHome) maxHome = p.value;
      if (p.value < maxAway) maxAway = p.value;
      
      const sign = Math.sign(p.value);
      if (sign !== 0 && sign !== lastSign && lastSign !== 0) swings++;
      if (sign !== 0) lastSign = sign;
    });

    // recent average (last N games)
    const recentCount = 3;
    const lastVals = chartData.slice(-recentCount).map(p => p.value);
    const recentAvg = Math.round(lastVals.reduce((a, b) => a + b, 0) / (lastVals.length || 1));
    
    return {
      maxHome,
      maxAway: Math.abs(maxAway),
      current: chartData[chartData.length - 1]?.value || 0,
      recentAvg,
      swings
    };
  }, [chartData]);

  // Modal state for info panels ('recent', 'maxHome', 'maxAway', 'swings')
  const [openModal, setOpenModal] = React.useState(null);
  React.useEffect(() => {
    if (!openModal) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpenModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openModal]);

  // Values used in the modal explanation
  const recentVals = chartData.slice(-3).map(p => p.value);

  // Analisi per set
  const setStats = useMemo(() => {
    const bySet = {};
    chartData.forEach(item => {
      const setNum = item.set || 1;
      if (!bySet[setNum]) {
        bySet[setNum] = { games: 0, sum: 0 };
      }
      bySet[setNum].games++;
      bySet[setNum].sum += item.value;
    });
    return bySet;
  }, [chartData]);

  if (!chartData.length) {
    return (
      <div className="momentum-chart">
        <div className="chart-header">
          <span className="chart-icon"><ChartLineUp size={20} weight="duotone" /></span>
          <h3 className="chart-title">Momentum Match</h3>
        </div>
        <div className="chart-no-data">
          <span><Hourglass size={16} weight="duotone" /> Nessun dato momentum disponibile</span>
        </div>
      </div>
    );
  }

  // Parametri SVG
  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Trova min e max per scala
  const values = chartData.map(d => d.value);
  const maxVal = Math.max(100, Math.max(...values));
  const minVal = Math.min(-100, Math.min(...values));
  const range = maxVal - minVal;
  
  // Funzioni di scala
  const scaleX = (idx) => padding.left + (idx / (chartData.length - 1 || 1)) * chartWidth;
  const scaleY = (val) => padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
  
  // Genera path per l'area positiva (home)
  const areaPathPositive = chartData.map((d, i) => {
    const x = scaleX(i);
    const y = d.value > 0 ? scaleY(d.value) : scaleY(0);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') + ` L ${scaleX(chartData.length - 1)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;
  
  // Genera path per l'area negativa (away)
  const areaPathNegative = chartData.map((d, i) => {
    const x = scaleX(i);
    const y = d.value < 0 ? scaleY(d.value) : scaleY(0);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') + ` L ${scaleX(chartData.length - 1)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;
  
  // Genera path per la linea
  const linePath = chartData.map((d, i) => {
    const x = scaleX(i);
    const y = scaleY(d.value);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="momentum-chart">
      <div className="chart-header">
        <span className="chart-icon"><ChartLineUp size={18} weight="duotone" /></span>
        <h3 className="chart-title">Momentum Match</h3>
      </div>
      
      {/* Stats cards */}
      <div className="momentum-stats">
        <div
          className="momentum-stat-card home"
          role="button"
          tabIndex={0}
          onClick={() => setOpenModal('maxHome')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenModal('maxHome'); } }}
          title={`Spiegazione Max ${homeName}`}
        >
          <span className="stat-label">Max {homeName}</span>
          <span className="stat-value">+{stats.maxHome}</span>
        </div>
        <div
          className="momentum-stat-card away"
          role="button"
          tabIndex={0}
          onClick={() => setOpenModal('maxAway')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenModal('maxAway'); } }}
          title={`Spiegazione Max ${awayName}`}
        >
          <span className="stat-label">Max {awayName}</span>
          <span className="stat-value">+{stats.maxAway}</span>
        </div>
        <div
          className="momentum-stat-card current"
          role="button"
          tabIndex={0}
          onClick={() => setOpenModal('recent')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenModal('recent'); } }}
          title="Clicca per informazioni"
        >
          <span className="stat-label">Media ultimi 3 game</span>
          <span className="stat-value" style={{ color: stats.recentAvg > 0 ? '#5b8fb9' : stats.recentAvg < 0 ? '#c97676' : '#a0aec0' }}>
            {stats.recentAvg > 0 ? '+' : ''}{stats.recentAvg}
          </span>
        </div>
        <div
          className="momentum-stat-card swings"
          role="button"
          tabIndex={0}
          onClick={() => setOpenModal('swings')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenModal('swings'); } }}
          title="Spiegazione Cambi Momentum"
        >
          <span className="stat-label">Cambi Momentum</span>
          <span className="stat-value">{stats.swings}</span>
        </div>
      </div>

      {/* Modal info for stats (generic) */}
      {openModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Informazioni ${openModal}`} onClick={() => setOpenModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" aria-label="Chiudi" onClick={() => setOpenModal(null)}>×</button>

            {openModal === 'recent' && (
              <>
                <div className="modal-header">Media ultimi 3 game — Spiegazione</div>
                <div className="modal-body">
                  <p>La <strong>Media ultimi 3 game</strong> è la media aritmetica dei valori di momentum degli ultimi 3 game (o meno, se non ci sono ancora 3 game).</p>
                  <p><strong>Esempio:</strong> ({recentVals.length ? recentVals.join(' + ') : '0'}) / {recentVals.length || 1} = <strong>{stats.recentAvg > 0 ? '+' : ''}{stats.recentAvg}</strong></p>
                  <p>Valore positivo = vantaggio per <strong>{homeName}</strong>; valore negativo = vantaggio per <strong>{awayName}</strong>. I dati si aggiornano automaticamente quando cambiano le API.</p>
                </div>
              </>
            )}

            {openModal === 'maxHome' && (
              <>
                <div className="modal-header">Max {homeName} — Spiegazione</div>
                <div className="modal-body">
                  <p>Mostra il valore massimo di momentum raggiunto da <strong>{homeName}</strong> nel match (valore positivo massimo registrato nella serie di momentum).</p>
                  <p><strong>Valore:</strong> +{stats.maxHome}</p>
                </div>
              </>
            )}

            {openModal === 'maxAway' && (
              <>
                <div className="modal-header">Max {awayName} — Spiegazione</div>
                <div className="modal-body">
                  <p>Mostra il valore massimo di momentum raggiunto da <strong>{awayName}</strong> (valore negativo massimo in modulo nella serie di momentum).</p>
                  <p><strong>Valore:</strong> +{stats.maxAway}</p>
                </div>
              </>
            )}

            {openModal === 'swings' && (
              <>
                <div className="modal-header">Cambi Momentum — Spiegazione</div>
                <div className="modal-body">
                  <p>I <strong>Cambi Momentum</strong> contano il numero di volte in cui il segno del momentum è cambiato (da positivo a negativo o viceversa), ignorando gli zero. Indica quante inversioni di tendenza sono avvenute nel match.</p>
                  <p><strong>Valore:</strong> {stats.swings}</p>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Grafico SVG */}
      <div className="momentum-svg-container">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="momentum-svg"
          style={{ width: '100%', height: 'auto' }}
        >
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
                stroke={val === 0 ? '#5b8fb9' : 'rgba(255, 255, 255, 0.15)'} 
                strokeWidth={val === 0 ? 2 : 1}
                strokeDasharray={val === 0 ? '0' : '4,4'}
              />
              <text x={padding.left - 8} y={scaleY(val) + 4} textAnchor="end" fill="#5a6b7d" fontSize="11">
                {val}
              </text>
            </g>
          ))}
          
          {/* Area positiva (home) */}
          <path d={areaPathPositive} fill="rgba(74, 222, 128, 0.35)" />
          
          {/* Area negativa (away) */}
          <path d={areaPathNegative} fill="rgba(248, 113, 113, 0.35)" />
          
          {/* Linea momentum */}
          <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Punti */}
          {chartData.map((d, i) => (
            <g key={i}>
              <circle 
                cx={scaleX(i)} 
                cy={scaleY(d.value)} 
                r={d.breakOccurred ? 6 : 4} 
                fill={d.value > 0 ? '#4ade80' : d.value < 0 ? '#f87171' : '#94a3b8'}
                stroke="rgba(30, 41, 59, 0.9)"
                strokeWidth="2"
              />
              {d.breakOccurred && (
                <text x={scaleX(i)} y={scaleY(d.value) - 10} textAnchor="middle" fill="#d4a84b" fontSize="9" fontWeight="bold">
                  BRK
                </text>
              )}
            </g>
          ))}
          
          {/* Etichette asse X */}
          <text x={padding.left} y={height - 5} fill="#5a6b7d" fontSize="10">Game 1</text>
          <text x={width - padding.right} y={height - 5} textAnchor="end" fill="#5a6b7d" fontSize="10">Game {chartData.length}</text>
        </svg>
      </div>
      
      {/* Indicatori di set */}
      <div className="momentum-set-indicators">
        {Object.keys(setStats).map(setNum => (
          <div key={setNum} className="set-indicator-badge">
            <span className="set-badge-label">Set {setNum}</span>
            <span className="set-badge-games">{setStats[setNum].games} game</span>
            <span className="set-badge-avg" style={{ 
              color: setStats[setNum].sum > 0 ? '#4ade80' : setStats[setNum].sum < 0 ? '#f87171' : '#94a3b8' 
            }}>
              {setStats[setNum].sum > 0 ? '+' : ''}{Math.round(setStats[setNum].sum / setStats[setNum].games)}
            </span>
          </div>
        ))}
      </div>
      
      {/* Legenda */}
      <div className="momentum-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#4ade80' }}></div>
          <span>Momentum {homeName}</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#f87171' }}></div>
          <span>Momentum {awayName}</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ff9800' }}></div>
          <span>Break</span>
        </div>
      </div>
    </div>
  );
}
