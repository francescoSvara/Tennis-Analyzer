import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  TennisBall,
  Lightning,
  Timer,
  Target,
  ArrowRight,
  CheckCircle,
  XCircle,
  Fire,
  ChartLineUp,
  Broadcast,
  User,
  Clock,
  Crosshair,
  Play,
  Stop
} from '@phosphor-icons/react';
import {
  analyzeLayTheWinner,
  analyzeBancaServizio,
  analyzeSuperBreak
} from '../utils';
import '../styles/strategies-live.css';

/**
 * StrategiesLivePanel
 * 
 * Design basato su docs/migliorire frontend strategie.txt:
 * - Card modulari con stato semaforico (READY/WATCH/OFF)
 * - Azione unica consigliata
 * - Dati minimi ma decisivi
 * - Psicologia > numeri
 */

// Mappa segnale → stato semaforico
const signalToStatus = (signal, applicable) => {
  if (!applicable) return 'OFF';
  if (signal === 'strong') return 'READY';
  if (signal === 'medium') return 'WATCH';
  return 'OFF';
};

// Stato labels
const statusLabels = {
  READY: { text: 'READY', emoji: '🟢', subtext: 'Condizioni perfette → entra' },
  WATCH: { text: 'ATTENZIONE', emoji: '🟡', subtext: 'Quasi pronta → osserva' },
  OFF: { text: 'OFF', emoji: '🔴', subtext: 'Non valida → ignora' }
};

/**
 * MatchTimeline - Piccola timeline visiva del match
 */
function MatchTimeline({ homeScore, awayScore }) {
  const sets = homeScore?.sets || [];
  
  return (
    <div className="match-timeline">
      {sets.map((set, idx) => {
        const homeGames = set?.games ?? 0;
        const awayGames = awayScore?.sets?.[idx]?.games ?? 0;
        const isComplete = (homeGames >= 6 || awayGames >= 6) && Math.abs(homeGames - awayGames) >= 2;
        const won = isComplete && homeGames > awayGames;
        const lost = isComplete && awayGames > homeGames;
        const current = !isComplete;
        
        return (
          <span 
            key={idx} 
            className={`timeline-set ${won ? 'won' : ''} ${lost ? 'lost' : ''} ${current ? 'current' : ''}`}
          >
            Set {idx + 1} {won ? '✓' : lost ? '✗' : current ? '⚡' : ''}
          </span>
        );
      })}
      {sets.length === 0 && <span className="timeline-set current">⏳ In attesa</span>}
    </div>
  );
}

/**
 * LayTheWinnerCard - Card specifica per Lay the Winner
 * Design dal documento: Set attuale, vincitore 1° set, quota, favorito
 */
function LayTheWinnerCard({ analysis, eventInfo }) {
  const status = signalToStatus(analysis?.signal, analysis?.applicable);
  const statusInfo = statusLabels[status];
  
  const details = analysis?.details || {};
  const firstSetWinner = details.firstSetWinnerName || 'N/D';
  const setsScore = `${details.homeSetsWon || 0}–${details.awaySetsWon || 0}`;
  const secondSetScore = details.secondSetScore || '';
  const confidence = analysis?.confidence || 0;
  const comebackRate = details.comebackRate || 0;
  
  // Condizioni
  const conditions = [
    { 
      text: 'Favorito sotto di un set', 
      met: details.awaySetsWon > 0 || details.homeSetsWon > 0,
      key: 'set'
    },
    { 
      text: `Storico rimonte: ${comebackRate}%`, 
      met: comebackRate > 25,
      key: 'comeback' 
    },
    { 
      text: 'Quote non ancora corrette', 
      met: analysis?.signal === 'strong' || analysis?.signal === 'medium',
      key: 'quotes'
    }
  ];

  return (
    <motion.div 
      className={`strategy-card status-${status.toLowerCase()}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="card-header">
        <div className="card-title-section">
          <Trophy size={22} weight="duotone" className="card-icon gold" />
          <span className="card-name">LAY THE WINNER</span>
        </div>
        <div className={`card-status-badge status-${status.toLowerCase()}`}>
          <span className="status-emoji">{statusInfo.emoji}</span>
          <span className="status-label">{statusInfo.text}</span>
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="card-info-grid">
        <div className="info-row">
          <Target size={16} weight="duotone" />
          <span className="info-label">Target:</span>
          <span className="info-value highlight">{firstSetWinner}</span>
        </div>
        <div className="info-row">
          <TennisBall size={16} weight="duotone" />
          <span className="info-label">Set:</span>
          <span className="info-value">{setsScore}</span>
          {secondSetScore && (
            <span className="info-secondary">({secondSetScore})</span>
          )}
        </div>
        {confidence > 0 && (
          <div className="info-row">
            <ChartLineUp size={16} weight="duotone" />
            <span className="info-label">Confidence:</span>
            <span className={`info-value ${confidence >= 70 ? 'high' : confidence >= 50 ? 'medium' : 'low'}`}>
              {confidence}%
            </span>
          </div>
        )}
      </div>

      {/* Conditions */}
      {status !== 'OFF' && (
        <div className="card-conditions">
          <div className="conditions-title">📊 CONDIZIONI</div>
          {conditions.map((cond) => (
            <div key={cond.key} className={`condition-row ${cond.met ? 'met' : 'unmet'}`}>
              {cond.met ? (
                <CheckCircle size={14} weight="fill" className="check-icon" />
              ) : (
                <XCircle size={14} weight="fill" className="x-icon" />
              )}
              <span>{cond.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reason / Message */}
      {analysis?.message && status !== 'OFF' && (
        <div className="card-reason">
          <span className="reason-icon">🧠</span>
          <span className="reason-text">{analysis.message}</span>
        </div>
      )}

      {/* Action */}
      {status === 'READY' && (
        <div className="card-action">
          <div className="action-label">▶️ AZIONE CONSIGLIATA</div>
          <button className="action-button lay">
            <span>LAY {firstSetWinner}</span>
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
      )}

      {status === 'WATCH' && (
        <div className="card-waiting">
          <Timer size={16} weight="duotone" />
          <span>Aspetta break point nel 2° set</span>
        </div>
      )}

      {/* Stop Condition */}
      {status === 'READY' && (
        <div className="card-stop">
          <Stop size={14} weight="duotone" />
          <span>STOP: Break del favorito / Fine game</span>
        </div>
      )}

      {/* OFF Message */}
      {status === 'OFF' && (
        <div className="card-off">
          <XCircle size={16} weight="duotone" />
          <span>{analysis?.message || 'Condizioni non soddisfatte'}</span>
        </div>
      )}
    </motion.div>
  );
}

/**
 * BancaServizioCard - Card compatta e aggressiva
 * Design: pulsante grande, testo minimo, colori forti
 */
function BancaServizioCard({ analysis, eventInfo }) {
  const status = signalToStatus(analysis?.signal, analysis?.applicable);
  const statusInfo = statusLabels[status];
  
  const details = analysis?.details || {};
  const serverName = details.serverName || 'N/D';
  const gameScore = details.currentGameScore || details.score || 'N/D';
  const pressureLevel = analysis?.pressureIndex?.level || details.pressureLevel || 'N/D';

  return (
    <motion.div 
      className={`strategy-card compact status-${status.toLowerCase()}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {/* Header */}
      <div className="card-header">
        <div className="card-title-section">
          <Fire size={22} weight="duotone" className="card-icon fire" />
          <span className="card-name">BANCA SERVIZIO</span>
        </div>
        <div className={`card-status-badge status-${status.toLowerCase()}`}>
          <span className="status-emoji">{statusInfo.emoji}</span>
          <span className="status-label">{statusInfo.text}</span>
        </div>
      </div>

      {/* Compact Info */}
      <div className="card-compact-info">
        <div className="compact-row main">
          <TennisBall size={18} weight="duotone" />
          <span>Servizio: <strong>{serverName}</strong></span>
        </div>
        <div className="compact-row">
          <ChartLineUp size={16} weight="duotone" />
          <span>Pressione: <strong className={`pressure-${pressureLevel.toLowerCase()}`}>{pressureLevel}</strong></span>
        </div>
        <div className="compact-row">
          <Target size={16} weight="duotone" />
          <span>Score: <strong>{gameScore}</strong></span>
        </div>
      </div>

      {/* Big Action Button for READY */}
      {status === 'READY' && (
        <button className="big-action-button lay">
          <Play size={20} weight="fill" />
          <span>LAY {serverName}</span>
        </button>
      )}

      {/* Exit condition */}
      {status === 'READY' && (
        <div className="card-exit">
          <Clock size={14} weight="duotone" />
          <span>Esci: break o hold</span>
        </div>
      )}

      {/* OFF/WATCH state */}
      {status === 'OFF' && (
        <div className="card-off">
          <XCircle size={16} weight="duotone" />
          <span>{analysis?.message || 'Nessun momento critico'}</span>
        </div>
      )}

      {status === 'WATCH' && (
        <div className="card-waiting compact">
          <Timer size={16} weight="duotone" />
          <span>Monitora pressione servizio</span>
        </div>
      )}
    </motion.div>
  );
}

/**
 * SuperBreakCard - Card strategica con più contesto
 * Design: più "di lettura", serve contesto visivo
 */
function SuperBreakCard({ analysis, eventInfo }) {
  const status = signalToStatus(analysis?.signal, analysis?.applicable);
  const statusInfo = statusLabels[status];
  
  const details = analysis?.details || {};
  const favorito = details.favorito?.name || details.dominantPlayer || 'N/D';
  const dominanceScore = analysis?.dominanceScore || details.dominance || 0;

  return (
    <motion.div 
      className={`strategy-card strategic status-${status.toLowerCase()}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      {/* Header */}
      <div className="card-header">
        <div className="card-title-section">
          <Lightning size={22} weight="duotone" className="card-icon electric" />
          <span className="card-name">SUPER BREAK</span>
        </div>
        <div className={`card-status-badge status-${status.toLowerCase()}`}>
          <span className="status-emoji">{statusInfo.emoji}</span>
          <span className="status-label">{statusInfo.text}</span>
        </div>
      </div>

      {/* Strategic Info */}
      <div className="card-strategic-info">
        <div className="strategic-row">
          <User size={16} weight="duotone" />
          <span className="strat-label">Dominante:</span>
          <span className="strat-value">{favorito}</span>
        </div>
        <div className="strategic-row">
          <ChartLineUp size={16} weight="duotone" />
          <span className="strat-label">Dominanza:</span>
          <span className={`strat-value ${dominanceScore >= 60 ? 'high' : dominanceScore >= 50 ? 'medium' : 'low'}`}>
            {dominanceScore}%
          </span>
        </div>
        {details.surface && (
          <div className="strategic-row">
            <TennisBall size={16} weight="duotone" />
            <span className="strat-label">Superficie:</span>
            <span className="strat-value">{details.surface}</span>
          </div>
        )}
      </div>

      {/* Scenario */}
      {status !== 'OFF' && (
        <div className="card-scenario">
          <div className="scenario-title">📈 Scenario</div>
          <p className="scenario-text">
            {analysis?.message || 'Break raro → valore alto'}
          </p>
        </div>
      )}

      {/* Action */}
      {status === 'READY' && (
        <div className="card-action">
          <button className="action-button back">
            <span>BACK {favorito}</span>
            <ArrowRight size={18} weight="bold" />
          </button>
          <div className="action-target">
            <Crosshair size={14} weight="duotone" />
            <span>Obiettivo: free bet</span>
          </div>
        </div>
      )}

      {status === 'WATCH' && (
        <div className="card-waiting">
          <Timer size={16} weight="duotone" />
          <span>Attendere break point favorevole</span>
        </div>
      )}

      {status === 'OFF' && (
        <div className="card-off">
          <XCircle size={16} weight="duotone" />
          <span>{analysis?.message || 'Scenario non favorevole'}</span>
        </div>
      )}
    </motion.div>
  );
}

/**
 * StrategiesLivePanel - Pannello principale strategie live
 */
export default function StrategiesLivePanel({ data, eventInfo, refreshKey }) {
  // Calcola analisi strategie
  const strategies = useMemo(() => {
    if (!data) return null;
    
    console.log('📊 StrategiesLivePanel - Computing strategies...');
    
    const lay = analyzeLayTheWinner(data);
    const banca = analyzeBancaServizio(data);
    const superB = analyzeSuperBreak(data);
    
    console.log('📊 Lay the Winner:', lay);
    console.log('📊 Banca Servizio:', banca);
    console.log('📊 Super Break:', superB);
    
    return {
      layTheWinner: lay,
      bancaServizio: banca,
      superBreak: superB
    };
  }, [data, refreshKey]);

  // Conta strategie attive (READY o WATCH)
  const activeCount = useMemo(() => {
    if (!strategies) return 0;
    let count = 0;
    if (strategies.layTheWinner?.applicable) count++;
    if (strategies.bancaServizio?.applicable) count++;
    if (strategies.superBreak?.applicable) count++;
    return count;
  }, [strategies]);

  // Estrai info match
  const homeScore = eventInfo?.homeScore;
  const awayScore = eventInfo?.awayScore;
  const homeName = eventInfo?.home?.name || 'Home';
  const awayName = eventInfo?.away?.name || 'Away';
  
  // Chi serve
  const serving = homeScore?.serving === 1 ? homeName : 
                  awayScore?.serving === 1 ? awayName : '?';

  // Calcola punteggio set
  const homeSets = homeScore?.sets?.filter((s, i) => {
    const homeGames = s?.games ?? 0;
    const awayGames = awayScore?.sets?.[i]?.games ?? 0;
    return homeGames > awayGames && (homeGames >= 6 || awayGames >= 6);
  }).length || 0;
  
  const awaySets = awayScore?.sets?.filter((s, i) => {
    const awayGames = s?.games ?? 0;
    const homeGames = homeScore?.sets?.[i]?.games ?? 0;
    return awayGames > homeGames && (awayGames >= 6 || homeGames >= 6);
  }).length || 0;

  // Game corrente
  const currentSetIdx = (homeScore?.sets?.length || 1) - 1;
  const homeGames = homeScore?.sets?.[currentSetIdx]?.games ?? 0;
  const awayGames = awayScore?.sets?.[currentSetIdx]?.games ?? 0;

  if (!data) {
    return (
      <div className="strategies-live-panel empty">
        <div className="empty-state">
          <Broadcast size={48} weight="duotone" />
          <h3>Nessun match caricato</h3>
          <p>Carica un match per vedere le strategie live</p>
        </div>
      </div>
    );
  }

  return (
    <div className="strategies-live-panel">
      {/* Header Panel */}
      <div className="panel-header">
        <TennisBall size={24} weight="duotone" className="header-icon" />
        <div className="header-content">
          <h2 className="header-title">🎾 STRATEGIE LIVE – MATCH IN CORSO</h2>
          <div className="header-match">{homeName} vs {awayName}</div>
        </div>
      </div>

      {/* Match Status Bar */}
      <div className="match-status-bar">
        <div className="status-item">
          <span className="status-label">Set:</span>
          <span className="status-value">{homeSets}–{awaySets}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Game:</span>
          <span className="status-value">{homeGames}–{awayGames}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Servizio:</span>
          <span className="status-value serving">{serving}</span>
        </div>
      </div>

      {/* Timeline */}
      <MatchTimeline homeScore={homeScore} awayScore={awayScore} />

      {/* Active Strategies Counter */}
      <div className="active-header">
        <Fire size={20} weight="duotone" />
        <span>🔥 STRATEGIE ATTIVE ({activeCount})</span>
      </div>

      {/* Strategy Cards */}
      <div className="strategies-cards">
        <LayTheWinnerCard 
          analysis={strategies?.layTheWinner} 
          eventInfo={eventInfo}
        />
        
        <BancaServizioCard 
          analysis={strategies?.bancaServizio} 
          eventInfo={eventInfo}
        />
        
        <SuperBreakCard 
          analysis={strategies?.superBreak} 
          eventInfo={eventInfo}
        />
      </div>

      {/* Performance Section */}
      <div className="performance-section">
        <div className="perf-header">
          <ChartLineUp size={16} weight="duotone" />
          <span>📊 PERFORMANCE STRATEGIA</span>
        </div>
        <div className="perf-grid">
          <div className="perf-item">
            <CheckCircle size={14} weight="fill" className="perf-icon" />
            <span className="perf-label">Win Rate:</span>
            <span className="perf-value">~63%</span>
          </div>
          <div className="perf-item">
            <ChartLineUp size={14} weight="fill" className="perf-icon" />
            <span className="perf-label">ROI medio:</span>
            <span className="perf-value green">+4.1%</span>
          </div>
          <div className="perf-item">
            <Trophy size={14} weight="fill" className="perf-icon" />
            <span className="perf-label">Match ideali:</span>
            <span className="perf-value">ATP, Top 20</span>
          </div>
        </div>
      </div>
    </div>
  );
}
