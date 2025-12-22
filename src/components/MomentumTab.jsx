import React, { memo, useMemo } from 'react';
import './MomentumTab.css';
import {
  TennisBall,
  ChartLineUp,
  ChartLineDown,
  ChartBar,
  ArrowsClockwise,
  WarningCircle,
  Fire,
  CheckCircle,
  Barbell,
  Thermometer,
  Flask,
  Atom,
  Circle,
  TrendUp,
  Scales
} from '@phosphor-icons/react';

// ============================================================================
// NUOVE FUNZIONI: Volatility, Elasticity, Match Character
// ============================================================================

const VOLATILITY_THRESHOLDS = {
  stable: 15,      // delta medio < 15 = match controllato
  moderate: 25,    // 15-25 = normale alternanza
  volatile: 40,    // 25-40 = alti e bassi frequenti
  extreme: 40      // > 40 = match caotico/emotivo
};

/**
 * Calcola la volatilità del momentum (quanto oscilla tra game consecutivi)
 */
function calculateVolatility(powerRankings) {
  if (!Array.isArray(powerRankings) || powerRankings.length < 2) {
    return { value: 0, class: 'STABILE', deltas: [], percentage: 0 };
  }

  const deltas = [];
  for (let i = 1; i < powerRankings.length; i++) {
    const prev = powerRankings[i - 1].value || 0;
    const curr = powerRankings[i].value || 0;
    deltas.push(Math.abs(curr - prev));
  }

  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  
  let volatilityClass;
  if (avgDelta < VOLATILITY_THRESHOLDS.stable) {
    volatilityClass = 'STABILE';
  } else if (avgDelta < VOLATILITY_THRESHOLDS.moderate) {
    volatilityClass = 'MODERATO';
  } else if (avgDelta < VOLATILITY_THRESHOLDS.volatile) {
    volatilityClass = 'VOLATILE';
  } else {
    volatilityClass = 'MOLTO_VOLATILE';
  }

  // Percentuale per la barra (normalizzata su 100)
  const percentage = Math.min(100, (avgDelta / 60) * 100);

  return {
    value: Math.round(avgDelta * 10) / 10,
    class: volatilityClass,
    deltas,
    maxSwing: Math.max(...deltas),
    minSwing: Math.min(...deltas),
    percentage
  };
}

/**
 * Calcola l'elasticità (capacità di recupero da fasi negative)
 */
function calculateElasticity(powerRankings) {
  if (!Array.isArray(powerRankings) || powerRankings.length < 3) {
    return { value: 0.5, class: 'NORMALE', negative_phases: 0, avg_recovery_games: 0, percentage: 50 };
  }

  let negativePhases = 0;
  let recoveryGames = [];
  let inNegativePhase = false;
  let negativeStart = -1;

  for (let i = 0; i < powerRankings.length; i++) {
    const value = powerRankings[i].value || 0;
    
    if (value < -15 && !inNegativePhase) {
      inNegativePhase = true;
      negativeStart = i;
    } else if (value > 0 && inNegativePhase) {
      inNegativePhase = false;
      negativePhases++;
      recoveryGames.push(i - negativeStart);
    }
  }

  const avgRecovery = recoveryGames.length > 0 
    ? recoveryGames.reduce((a, b) => a + b, 0) / recoveryGames.length 
    : 0;
  
  const elasticityValue = avgRecovery > 0 ? Math.min(1, 1 / avgRecovery) : 0.5;
  
  let elasticityClass;
  if (elasticityValue >= 0.5) {
    elasticityClass = 'RESILIENTE';
  } else if (elasticityValue >= 0.33) {
    elasticityClass = 'NORMALE';
  } else {
    elasticityClass = 'FRAGILE';
  }

  return {
    value: Math.round(elasticityValue * 100) / 100,
    class: elasticityClass,
    negative_phases: negativePhases,
    avg_recovery_games: Math.round(avgRecovery * 10) / 10,
    percentage: elasticityValue * 100
  };
}

/**
 * Classifica il carattere del match
 */
function classifyMatchCharacter(volatility, elasticity, breakCount = 0) {
  const v = volatility?.class || 'STABILE';
  const e = elasticity?.class || 'NORMALE';
  
  let character, description, emoji, color;
  
  if (v === 'MOLTO_VOLATILE' && breakCount >= 4) {
    character = 'BATTAGLIA_EMOTIVA';
    description = 'Match con grandi oscillazioni e molti break';
    emoji = 'swords'; // ⚔️
    color = '#f59e0b';
  } else if (v === 'STABILE' && e === 'RESILIENTE') {
    character = 'DOMINIO';
    description = 'Un giocatore controlla il match';
    emoji = 'crown'; // 👑
    color = '#10b981';
  } else if (e === 'RESILIENTE' && breakCount >= 2) {
    character = 'RIMONTE';
    description = 'Frequenti recuperi dopo momenti difficili';
    emoji = 'arrows'; // 🔄
    color = '#3b82f6';
  } else if (v === 'VOLATILE') {
    character = 'ALTALENA';
    description = 'Continui cambi di momentum';
    emoji = 'coaster'; // 🎢
    color = '#8b5cf6';
  } else {
    character = 'STANDARD';
    description = 'Andamento regolare';
    emoji = 'chart'; // 📊
    color = '#6b7280';
  }

  return { character, description, emoji, color };
}

// ============================================================================
// FUNZIONI ESISTENTI
// ============================================================================

/**
 * Analizza chi ha il momentum e perché
 */
function analyzeMomentumOwner(powerRankings, homeName, awayName) {
  if (!powerRankings || powerRankings.length < 2) {
    return { owner: 'unknown', strength: 0, reason: 'Dati insufficienti' };
  }
  
  const lastGame = powerRankings[powerRankings.length - 1];
  const lastValue = lastGame?.value || 0;
  const last3 = powerRankings.slice(-3);
  const last5 = powerRankings.slice(-5);
  
  const avgLast3 = last3.reduce((a, g) => a + (g.value || 0), 0) / last3.length;
  const avgLast5 = last5.reduce((a, g) => a + (g.value || 0), 0) / last5.length;
  
  // Determina chi ha il momentum
  let owner, strength, reason;
  
  if (lastValue > 30 && avgLast3 > 20) {
    owner = 'home';
    strength = Math.min(100, Math.abs(lastValue) + 20);
    reason = `${homeName} sta dominando`;
  } else if (lastValue < -30 && avgLast3 < -20) {
    owner = 'away';
    strength = Math.min(100, Math.abs(lastValue) + 20);
    reason = `${awayName} sta dominando`;
  } else if (lastValue > 15 || avgLast3 > 10) {
    owner = 'home';
    strength = Math.min(80, Math.abs(lastValue) + 10);
    reason = `${homeName} in leggero controllo`;
  } else if (lastValue < -15 || avgLast3 < -10) {
    owner = 'away';
    strength = Math.min(80, Math.abs(lastValue) + 10);
    reason = `${awayName} in leggero controllo`;
  } else {
    owner = 'balanced';
    strength = 50;
    reason = 'Match equilibrato';
  }
  
  return { owner, strength, reason, lastValue, avgLast3: Math.round(avgLast3), avgLast5: Math.round(avgLast5) };
}

/**
 * Detecta se il momentum sta cambiando
 */
function detectMomentumShift(powerRankings, homeName, awayName) {
  if (!powerRankings || powerRankings.length < 5) {
    return { isShifting: false, direction: null, cause: null, confidence: 0 };
  }
  
  const last5 = powerRankings.slice(-5);
  const previous5 = powerRankings.slice(-10, -5);
  
  const avgLast5 = last5.reduce((a, g) => a + (g.value || 0), 0) / last5.length;
  const avgPrev5 = previous5.length > 0 
    ? previous5.reduce((a, g) => a + (g.value || 0), 0) / previous5.length 
    : 0;
  
  const shift = avgLast5 - avgPrev5;
  const values = last5.map(g => g.value || 0);
  
  // Calcola trend negli ultimi 5 game
  const trendSlope = (values[values.length - 1] - values[0]) / (values.length - 1);
  
  // Conta break recenti
  const recentBreaks = last5.filter(g => g.breakOccurred).length;
  
  // Calcola volatilità (oscillazioni)
  let volatility = 0;
  for (let i = 1; i < values.length; i++) {
    volatility += Math.abs(values[i] - values[i-1]);
  }
  volatility = volatility / (values.length - 1);
  
  // Determina se c'è uno shift
  let isShifting = false;
  let direction = null;
  let cause = null;
  let confidence = 0;
  
  // Shift significativo: cambio di almeno 20 punti di media
  if (Math.abs(shift) > 20) {
    isShifting = true;
    direction = shift > 0 ? 'to_home' : 'to_away';
    confidence = Math.min(90, 50 + Math.abs(shift));
    
    // Determina la causa
    if (recentBreaks > 0) {
      cause = direction === 'to_home' 
        ? `${homeName} ha breakkato (${recentBreaks} break)`
        : `${awayName} ha breakkato (${recentBreaks} break)`;
    } else if (volatility > 30) {
      cause = 'Errori non forzati stanno cambiando il match';
    } else if (Math.abs(trendSlope) > 10) {
      cause = direction === 'to_home'
        ? `${homeName} sta alzando il livello di gioco`
        : `${awayName} sta alzando il livello di gioco`;
    } else {
      cause = direction === 'to_home'
        ? `${awayName} sta calando di rendimento`
        : `${homeName} sta calando di rendimento`;
    }
  }
  // Trend costante in una direzione
  else if (Math.abs(trendSlope) > 8 && Math.abs(avgLast5) > 15) {
    isShifting = true;
    direction = trendSlope > 0 ? 'to_home' : 'to_away';
    confidence = Math.min(75, 40 + Math.abs(trendSlope) * 3);
    cause = direction === 'to_home'
      ? `${homeName} in crescita costante`
      : `${awayName} in crescita costante`;
  }
  
  return {
    isShifting,
    direction,
    cause,
    confidence,
    metrics: {
      shift: Math.round(shift),
      trendSlope: trendSlope.toFixed(1),
      volatility: Math.round(volatility),
      recentBreaks
    }
  };
}

/**
 * MomentumTab - Versione semplificata e focalizzata
 */
function MomentumTabComponent({ powerRankings = [], eventInfo = {}, isLive = false }) {
  const homeName = eventInfo?.home?.name || eventInfo?.home?.shortName || 'Home';
  const awayName = eventInfo?.away?.name || eventInfo?.away?.shortName || 'Away';

  // Analisi principale
  const momentumOwner = useMemo(() => 
    analyzeMomentumOwner(powerRankings, homeName, awayName), 
    [powerRankings, homeName, awayName]
  );
  
  const momentumShift = useMemo(() => 
    detectMomentumShift(powerRankings, homeName, awayName), 
    [powerRankings, homeName, awayName]
  );

  // NUOVE ANALISI: Volatilità, Elasticità, Match Character
  const volatility = useMemo(() => calculateVolatility(powerRankings), [powerRankings]);
  const elasticity = useMemo(() => calculateElasticity(powerRankings), [powerRankings]);
  const breakCount = useMemo(() => powerRankings.filter(g => g.breakOccurred).length, [powerRankings]);
  const matchCharacter = useMemo(() => 
    classifyMatchCharacter(volatility, elasticity, breakCount),
    [volatility, elasticity, breakCount]
  );

  // Empty state
  if (!powerRankings || powerRankings.length === 0) {
    return (
      <div className="momentum-tab">
        <div className="momentum-empty">
          <div className="momentum-empty-icon"><ChartBar size={48} weight="duotone" color="#6b7280" /></div>
          <div className="momentum-empty-title">Dati momentum non disponibili</div>
          <div className="momentum-empty-subtitle">
            I dati appariranno quando il match sarà in corso
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="momentum-tab">
      {/* === SEZIONE 1: CHI HA IL MOMENTUM === */}
      <section className="momentum-section momentum-owner-section">
        <div className={`momentum-owner-card owner-${momentumOwner.owner}`}>
          <div className="owner-header">
            <span className="owner-icon">
              {momentumOwner.owner === 'home' ? <Circle size={16} weight="fill" style={{ color: '#3b82f6' }} /> : 
               momentumOwner.owner === 'away' ? <Circle size={16} weight="fill" style={{ color: '#ef4444' }} /> : <Scales size={18} weight="duotone" style={{ color: '#6b7280' }} />}
            </span>
            <h2 className="owner-title">
              {momentumOwner.owner === 'home' ? homeName : 
               momentumOwner.owner === 'away' ? awayName : 'Equilibrio'}
            </h2>
          </div>
          
          <div className="owner-strength">
            <div className="strength-bar-container">
              <div 
                className={`strength-bar strength-${momentumOwner.owner}`}
                style={{ width: `${momentumOwner.strength}%` }}
              />
            </div>
            <span className="strength-value">{momentumOwner.strength}%</span>
          </div>
          
          <div className="owner-reason">{momentumOwner.reason}</div>
          
          <div className="owner-stats">
            <div className="stat-box">
              <span className="stat-label">Valore Attuale</span>
              <span className={`stat-value ${momentumOwner.lastValue > 0 ? 'positive' : momentumOwner.lastValue < 0 ? 'negative' : ''}`}>
                {momentumOwner.lastValue > 0 ? '+' : ''}{momentumOwner.lastValue}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Media 3 Game</span>
              <span className={`stat-value ${momentumOwner.avgLast3 > 0 ? 'positive' : momentumOwner.avgLast3 < 0 ? 'negative' : ''}`}>
                {momentumOwner.avgLast3 > 0 ? '+' : ''}{momentumOwner.avgLast3}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Media 5 Game</span>
              <span className={`stat-value ${momentumOwner.avgLast5 > 0 ? 'positive' : momentumOwner.avgLast5 < 0 ? 'negative' : ''}`}>
                {momentumOwner.avgLast5 > 0 ? '+' : ''}{momentumOwner.avgLast5}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* === SEZIONE 2: ALERT CAMBIO MOMENTUM === */}
      {momentumShift.isShifting && (
        <section className="momentum-section shift-section">
          <div className={`shift-alert shift-${momentumShift.direction}`}>
            <div className="shift-header">
              <span className="shift-icon">
                {momentumShift.direction === 'to_home' ? <ChartLineUp size={24} weight="duotone" color="#10b981" /> : <ChartLineDown size={24} weight="duotone" color="#ef4444" />}
              </span>
              <h3 className="shift-title"><WarningCircle size={18} weight="duotone" color="#f59e0b" /> Cambio Momentum in Corso</h3>
            </div>
            
            <div className="shift-direction">
              <span className="shift-arrow">
                {momentumShift.direction === 'to_home' ? '→' : '←'}
              </span>
              <span className="shift-target">
                Verso {momentumShift.direction === 'to_home' ? homeName : awayName}
              </span>
              <span className="shift-confidence">
                {momentumShift.confidence}% confidenza
              </span>
            </div>
            
            <div className="shift-cause">
              <strong>Motivo:</strong> {momentumShift.cause}
            </div>
            
            <div className="shift-metrics">
              <span className="shift-metric">
                Shift: {momentumShift.metrics.shift > 0 ? '+' : ''}{momentumShift.metrics.shift}
              </span>
              <span className="shift-metric">
                Trend: {momentumShift.metrics.trendSlope}/game
              </span>
              {momentumShift.metrics.recentBreaks > 0 && (
                <span className="shift-metric break">
                  <Circle size={10} weight="fill" color="#ef4444" /> {momentumShift.metrics.recentBreaks} break recenti
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* === SEZIONE 2.5: ANALISI AVANZATA (VOLATILITÀ, ELASTICITÀ, CHARACTER) === */}
      <section className="momentum-section advanced-analysis-section">
        <h3 className="section-title">
          <span className="section-icon"><Flask size={18} weight="duotone" /></span>
          Analisi Avanzata
        </h3>
        
        {/* Match Character Badge */}
        <div className="match-character-card" style={{ borderColor: matchCharacter.color }}>
          <div className="character-header">
            <span className="character-emoji">{matchCharacter.emoji}</span>
            <div className="character-info">
              <span className="character-title" style={{ color: matchCharacter.color }}>
                {matchCharacter.character.replace('_', ' ')}
              </span>
              <span className="character-desc">{matchCharacter.description}</span>
            </div>
          </div>
        </div>
        
        {/* Volatilità e Elasticità side by side */}
        <div className="analysis-metrics-grid">
          {/* Volatilità */}
          <div className={`metric-card volatility-card vol-${volatility.class.toLowerCase()}`}>
            <div className="metric-header">
              <span className="metric-icon"><ChartBar size={18} weight="duotone" /></span>
              <span className="metric-title">Volatilità</span>
              <span className={`metric-badge badge-${volatility.class.toLowerCase()}`}>
                {volatility.class.replace('_', ' ')}
              </span>
            </div>
            
            <div className="metric-bar-container">
              <div 
                className={`metric-bar volatility-bar vol-${volatility.class.toLowerCase()}`}
                style={{ width: `${volatility.percentage}%` }}
              />
            </div>
            
            <div className="metric-stats">
              <div className="metric-stat">
                <span className="stat-label">Oscillazione Media</span>
                <span className="stat-value">{volatility.value}</span>
              </div>
              <div className="metric-stat">
                <span className="stat-label">Max Swing</span>
                <span className="stat-value">{Math.round(volatility.maxSwing || 0)}</span>
              </div>
            </div>
            
            <div className="metric-explanation">
              {volatility.class === 'STABILE' && <><CheckCircle size={14} weight="duotone" color="#10b981" /> Match controllato, poche oscillazioni</>}
              {volatility.class === 'MODERATO' && <><ChartLineUp size={14} weight="duotone" color="#3b82f6" /> Normale alternanza di momenti</>}
              {volatility.class === 'VOLATILE' && <><WarningCircle size={14} weight="duotone" color="#f59e0b" /> Frequenti cambi di momentum</>}
              {volatility.class === 'MOLTO_VOLATILE' && <><Fire size={14} weight="duotone" color="#ef4444" /> Match imprevedibile e caotico</>}
            </div>
          </div>
          
          {/* Elasticità */}
          <div className={`metric-card elasticity-card elas-${elasticity.class.toLowerCase()}`}>
            <div className="metric-header">
              <span className="metric-icon"><ArrowsClockwise size={18} weight="duotone" /></span>
              <span className="metric-title">Elasticità</span>
              <span className={`metric-badge badge-${elasticity.class.toLowerCase()}`}>
                {elasticity.class}
              </span>
            </div>
            
            <div className="metric-bar-container">
              <div 
                className={`metric-bar elasticity-bar elas-${elasticity.class.toLowerCase()}`}
                style={{ width: `${elasticity.percentage}%` }}
              />
            </div>
            
            <div className="metric-stats">
              <div className="metric-stat">
                <span className="stat-label">Fasi Negative</span>
                <span className="stat-value">{elasticity.negative_phases}</span>
              </div>
              <div className="metric-stat">
                <span className="stat-label">Recupero Medio</span>
                <span className="stat-value">{elasticity.avg_recovery_games} game</span>
              </div>
            </div>
            
            <div className="metric-explanation">
              {elasticity.class === 'RESILIENTE' && <><Barbell size={14} weight="duotone" color="#10b981" /> Recupera rapidamente dai momenti difficili</>}
              {elasticity.class === 'NORMALE' && <><ChartBar size={14} weight="duotone" color="#3b82f6" /> Capacità di recupero nella media</>}
              {elasticity.class === 'FRAGILE' && <><WarningCircle size={14} weight="duotone" color="#f59e0b" /> Fatica a recuperare dopo cali</>}
            </div>
          </div>
        </div>
      </section>

      {/* === SEZIONE 3: GRAFICO MOMENTUM === */}
      <section className="momentum-section chart-section">
        <h3 className="section-title">
          <span className="section-icon"><TrendUp size={18} weight="duotone" /></span>
          Andamento Partita
        </h3>
        
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color home"></span>
            <span>{homeName}</span>
            <span className="legend-hint">(valori +)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color away"></span>
            <span>{awayName}</span>
            <span className="legend-hint">(valori -)</span>
          </div>
        </div>
        
        <div className="momentum-chart">
          <MomentumChart data={powerRankings} homeName={homeName} awayName={awayName} />
        </div>
      </section>

      {/* === SEZIONE 4: TERMOMETRO ULTIMI GAME === */}
      <section className="momentum-section recent-section">
        <h3 className="section-title">
          <span className="section-icon"><Thermometer size={18} weight="duotone" /></span>
          Termometro Ultimi 5 Game
        </h3>
        
        {/* Header con nomi giocatori */}
        <div className="thermometer-header">
          <div className="thermo-player home">
            <span className="thermo-icon"><Circle size={12} weight="fill" color="#3b82f6" /></span>
            <span className="thermo-name">{homeName}</span>
          </div>
          <div className="thermo-center">EQUILIBRIO</div>
          <div className="thermo-player away">
            <span className="thermo-name">{awayName}</span>
            <span className="thermo-icon"><Circle size={12} weight="fill" color="#ef4444" /></span>
          </div>
        </div>
        
        <div className="thermometer-games">
          {powerRankings.slice(-5).map((game, idx) => {
            const value = game.value || 0;
            const maxValue = 80; // Valore massimo per la scala
            const percentage = Math.min(50, (Math.abs(value) / maxValue) * 50);
            const isHome = value > 0;
            
            // Determina chi serviva (game pari = home serve, dispari = away serve, alternando per set)
            const gameNum = game.game || 1;
            const setNum = game.set || 1;
            const homeServes = (gameNum % 2 === 1) === (setNum % 2 === 1);
            
            return (
              <div key={idx} className="thermo-row">
                {/* Info Game */}
                <div className="thermo-game-info">
                  <span className="thermo-game-label">S{game.set} G{game.game}</span>
                  <span className={`thermo-serve ${homeServes ? 'home' : 'away'}`}>
                    {homeServes ? <><TennisBall size={12} weight="duotone" />→</> : <>←<TennisBall size={12} weight="duotone" /></>}
                  </span>
                </div>
                
                {/* Termometro */}
                <div className="thermo-bar-wrapper">
                  {/* Lato Home (sinistra) */}
                  <div className="thermo-side home">
                    <div 
                      className={`thermo-fill home ${isHome ? 'active' : ''}`}
                      style={{ width: isHome ? `${percentage}%` : '0%' }}
                    />
                  </div>
                  
                  {/* Centro */}
                  <div className="thermo-center-line">
                    <div className={`thermo-indicator ${Math.abs(value) < 15 ? 'balanced' : isHome ? 'home' : 'away'}`} />
                  </div>
                  
                  {/* Lato Away (destra) */}
                  <div className="thermo-side away">
                    <div 
                      className={`thermo-fill away ${!isHome && value !== 0 ? 'active' : ''}`}
                      style={{ width: !isHome ? `${percentage}%` : '0%' }}
                    />
                  </div>
                </div>
                
                {/* Valore e Badge */}
                <div className="thermo-value-box">
                  <span className={`thermo-value ${isHome ? 'home' : value < 0 ? 'away' : ''}`}>
                    {value > 0 ? '+' : ''}{Math.round(value)}
                  </span>
                  {game.breakOccurred && <span className="thermo-break">BRK!</span>}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legenda */}
        <div className="thermo-legend">
          <span className="legend-serve"><TennisBall size={14} weight="duotone" /> = Chi Serve</span>
          <span className="legend-break">BRK = Break</span>
        </div>
      </section>

      {/* === SEZIONE 5: RIEPILOGO RAPIDO === */}
      <section className="momentum-section summary-section">
        <div className="quick-summary">
          <div className="summary-item">
            <span className="summary-icon"><TennisBall size={18} weight="duotone" color="#3b82f6" /></span>
            <span className="summary-label">Game Totali</span>
            <span className="summary-value">{powerRankings.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-icon"><Circle size={14} weight="fill" color="#ef4444" /></span>
            <span className="summary-label">Break</span>
            <span className="summary-value">{powerRankings.filter(g => g.breakOccurred).length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-icon"><ChartBar size={18} weight="duotone" color="#8b5cf6" /></span>
            <span className="summary-label">Media Match</span>
            <span className={`summary-value ${powerRankings.reduce((a, g) => a + (g.value || 0), 0) / powerRankings.length > 0 ? 'positive' : 'negative'}`}>
              {Math.round(powerRankings.reduce((a, g) => a + (g.value || 0), 0) / powerRankings.length)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Grafico Momentum SVG
 */
function MomentumChart({ data, homeName, awayName }) {
  if (!data || data.length === 0) return null;
  
  const width = 800;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 25, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const values = data.map(d => d.value || 0);
  const maxVal = Math.max(80, Math.max(...values.map(Math.abs)));
  
  const scaleX = (idx) => padding.left + (idx / (data.length - 1 || 1)) * chartWidth;
  const scaleY = (val) => padding.top + chartHeight / 2 - (val / maxVal) * (chartHeight / 2);
  
  // Area path per home (positivi)
  const areaPathPositive = data.map((d, i) => {
    const x = scaleX(i);
    const y = (d.value || 0) > 0 ? scaleY(d.value) : scaleY(0);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') + ` L ${scaleX(data.length - 1)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;
  
  // Area path per away (negativi)
  const areaPathNegative = data.map((d, i) => {
    const x = scaleX(i);
    const y = (d.value || 0) < 0 ? scaleY(d.value) : scaleY(0);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') + ` L ${scaleX(data.length - 1)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;
  
  // Line path
  const linePath = data.map((d, i) => {
    return `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.value || 0)}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="momentum-svg">
      {/* Background */}
      <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="rgba(15, 20, 25, 0.6)" rx="4" />
      
      {/* Grid lines */}
      <line x1={padding.left} y1={scaleY(0)} x2={width - padding.right} y2={scaleY(0)} stroke="#3b82f6" strokeWidth="2" />
      <line x1={padding.left} y1={scaleY(40)} x2={width - padding.right} y2={scaleY(40)} stroke="rgba(255,255,255,0.1)" strokeDasharray="4,4" />
      <line x1={padding.left} y1={scaleY(-40)} x2={width - padding.right} y2={scaleY(-40)} stroke="rgba(255,255,255,0.1)" strokeDasharray="4,4" />
      
      {/* Labels */}
      <text x={padding.left - 8} y={scaleY(0) + 4} textAnchor="end" fill="#8b95a5" fontSize="10">0</text>
      <text x={padding.left - 8} y={scaleY(40) + 4} textAnchor="end" fill="#4ade80" fontSize="10">+40</text>
      <text x={padding.left - 8} y={scaleY(-40) + 4} textAnchor="end" fill="#f87171" fontSize="10">-40</text>
      
      {/* Areas */}
      <path d={areaPathPositive} fill="rgba(74, 222, 128, 0.2)" />
      <path d={areaPathNegative} fill="rgba(248, 113, 113, 0.2)" />
      
      {/* Line */}
      <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Points */}
      {data.map((d, i) => (
        <g key={i}>
          <circle 
            cx={scaleX(i)} 
            cy={scaleY(d.value || 0)} 
            r={d.breakOccurred ? 6 : 4} 
            fill={(d.value || 0) > 0 ? '#4ade80' : (d.value || 0) < 0 ? '#f87171' : '#6b7280'}
            stroke="rgba(30, 41, 59, 0.9)"
            strokeWidth="2"
          />
          {d.breakOccurred && (
            <text x={scaleX(i)} y={scaleY(d.value || 0) - 10} textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold">
              BRK
            </text>
          )}
        </g>
      ))}
      
      {/* X axis labels */}
      <text x={padding.left} y={height - 5} fill="#8b95a5" fontSize="10">G1</text>
      <text x={width - padding.right} y={height - 5} textAnchor="end" fill="#8b95a5" fontSize="10">G{data.length}</text>
    </svg>
  );
}

export default memo(MomentumTabComponent);
