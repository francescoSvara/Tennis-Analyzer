import React from 'react';
import {
  Fire,
  X,
  Sparkle,
  WarningCircle,
  Barbell,
  Lightning,
  Target,
  PersonSimpleRun,
  Circle,
  Trophy,
  CheckCircle,
  TennisBall,
  Scales
} from '@phosphor-icons/react';

// Mappa dei tipi di punto con icone e descrizioni
const POINT_TYPE_INFO = {
  'ace': { icon: <Fire size={14} weight="duotone" style={{ color: '#4caf50' }} />, label: 'Ace', color: '#4caf50', isSpecial: true },
  'double_fault': { icon: <X size={14} weight="bold" style={{ color: '#f44336' }} />, label: 'Doppio Fallo', color: '#f44336', isSpecial: true },
  'doubleFault': { icon: <X size={14} weight="bold" style={{ color: '#f44336' }} />, label: 'Doppio Fallo', color: '#f44336', isSpecial: true },
  'winner': { icon: <Sparkle size={14} weight="duotone" style={{ color: '#2196f3' }} />, label: 'Vincente', color: '#2196f3', isSpecial: true },
  'unforced': { icon: <WarningCircle size={14} weight="duotone" style={{ color: '#ff9800' }} />, label: 'Errore non forzato', color: '#ff9800', isSpecial: true },
  'unforced_error': { icon: <WarningCircle size={14} weight="duotone" style={{ color: '#ff9800' }} />, label: 'Errore non forzato', color: '#ff9800', isSpecial: true },
  'forced_error': { icon: <Barbell size={14} weight="duotone" style={{ color: '#9c27b0' }} />, label: 'Errore forzato', color: '#9c27b0', isSpecial: false },
  'service_winner': { icon: <Lightning size={14} weight="duotone" style={{ color: '#4caf50' }} />, label: 'Servizio vincente', color: '#4caf50', isSpecial: true },
  'return_winner': { icon: <Target size={14} weight="duotone" style={{ color: '#00bcd4' }} />, label: 'Risposta vincente', color: '#00bcd4', isSpecial: true },
  'net_point': { icon: <PersonSimpleRun size={14} weight="duotone" style={{ color: '#673ab7' }} />, label: 'Punto a rete', color: '#673ab7', isSpecial: false },
  'break_point': { icon: <Circle size={12} weight="fill" style={{ color: '#e91e63' }} />, label: 'Palla Break', color: '#e91e63', isSpecial: true },
  'set_point': { icon: <Circle size={12} weight="fill" style={{ color: '#ff5722' }} />, label: 'Set Point', color: '#ff5722', isSpecial: true },
  'match_point': { icon: <Trophy size={14} weight="duotone" style={{ color: '#ffd700' }} />, label: 'Match Point', color: '#ffd700', isSpecial: true },
  // SofaScore numeric types
  1: { icon: <CheckCircle size={14} weight="duotone" style={{ color: '#4caf50' }} />, label: 'Punto vinto', color: '#4caf50', isSpecial: false },
  3: { icon: <CheckCircle size={14} weight="duotone" style={{ color: '#4caf50' }} />, label: 'Punto vinto', color: '#4caf50', isSpecial: false },
  5: { icon: <X size={14} weight="bold" style={{ color: '#f44336' }} />, label: 'Punto perso', color: '#f44336', isSpecial: false },
};

// Determina il momentum del punto basato sul punteggio
const getMomentumIndicator = (homePoint, awayPoint) => {
  const scores = { '0': 0, '15': 1, '30': 2, '40': 3, 'A': 4 };
  const hScore = scores[homePoint] ?? 0;
  const aScore = scores[awayPoint] ?? 0;
  
  const diff = hScore - aScore;
  
  if (diff >= 2) return { icon: <Circle size={10} weight="fill" style={{ color: '#10b981' }} />, label: 'Home domina', class: 'momentum-home-strong' };
  if (diff === 1) return { icon: <Circle size={10} weight="fill" style={{ color: '#3b82f6' }} />, label: 'Vantaggio Home', class: 'momentum-home' };
  if (diff === 0) return { icon: <Circle size={10} weight="fill" style={{ color: '#9ca3af' }} />, label: 'Equilibrio', class: 'momentum-balanced' };
  if (diff === -1) return { icon: <Circle size={10} weight="fill" style={{ color: '#fbbf24' }} />, label: 'Vantaggio Away', class: 'momentum-away' };
  if (diff <= -2) return { icon: <Circle size={10} weight="fill" style={{ color: '#ef4444' }} />, label: 'Away domina', class: 'momentum-away-strong' };
  
  return { icon: <Circle size={10} weight="fill" style={{ color: '#9ca3af' }} />, label: 'Neutro', class: 'momentum-balanced' };
};

// Controlla se è un momento critico del game
const getCriticalMoment = (homePoint, awayPoint) => {
  // Palla break, game point, deuce, vantaggio
  if (homePoint === '40' && awayPoint === '40') return { icon: <Scales size={14} weight="duotone" />, label: 'Deuce', class: 'critical-deuce' };
  if (homePoint === 'A' || awayPoint === 'A') return { icon: <Lightning size={14} weight="duotone" />, label: 'Vantaggio', class: 'critical-advantage' };
  if (homePoint === '40' && awayPoint !== '40') return { icon: <TennisBall size={14} weight="duotone" />, label: 'Game Point Home', class: 'critical-gamepoint' };
  if (awayPoint === '40' && homePoint !== '40') return { icon: <TennisBall size={14} weight="duotone" />, label: 'Game Point Away', class: 'critical-gamepoint' };
  return null;
};

export default function PointRow({ point, index }) {
  const homeTypeInfo = POINT_TYPE_INFO[point.homePointType] || null;
  const awayTypeInfo = POINT_TYPE_INFO[point.awayPointType] || null;
  
  const momentum = getMomentumIndicator(point.homePoint, point.awayPoint);
  const critical = getCriticalMoment(point.homePoint, point.awayPoint);
  
  // Determina chi ha vinto il punto basandosi sul tipo
  const homeWon = point.homePointType === 1 || point.homePointType === 3 || 
                  point.homePointType === 'ace' || point.homePointType === 'winner' ||
                  point.homePointType === 'service_winner' || point.homePointType === 'return_winner';
  const awayWon = point.awayPointType === 1 || point.awayPointType === 3 ||
                  point.awayPointType === 'ace' || point.awayPointType === 'winner' ||
                  point.awayPointType === 'service_winner' || point.awayPointType === 'return_winner';
  
  // Controlla eventi speciali (ace, doppio fallo)
  const descriptionStr = typeof point.pointDescription === 'string' ? point.pointDescription.toLowerCase() : '';
  const isAce = point.homePointType === 'ace' || point.awayPointType === 'ace' ||
                descriptionStr.includes('ace');
  const isDoubleFault = point.homePointType === 'double_fault' || point.homePointType === 'doubleFault' ||
                        point.awayPointType === 'double_fault' || point.awayPointType === 'doubleFault' ||
                        descriptionStr.includes('doppio fallo') || descriptionStr.includes('double fault');

  return (
    <div className={`point ${momentum.class} ${critical ? critical.class : ''}`}>
      {/* Header con numero punto e indicatori */}
      <div className="point-header">
        <div className="point-title">
          <span className="point-number">#{index + 1}</span>
          {momentum && <span className="momentum-icon" title={momentum.label}>{momentum.icon}</span>}
          {critical && <span className="critical-badge" title={critical.label}>{critical.icon} {critical.label}</span>}
        </div>
        
        {/* Badge speciali */}
        <div className="point-badges">
          {isAce && <span className="badge badge-ace" title="Ace"><Fire size={12} weight="duotone" /> ACE</span>}
          {isDoubleFault && <span className="badge badge-df" title="Doppio Fallo"><X size={12} weight="bold" /> DF</span>}
        </div>
      </div>
      
      {/* Punteggio attuale */}
      <div className="point-score-display">
        <div className={`point-player ${homeWon ? 'point-winner' : ''}`}>
          <span className="player-label">H</span>
          <span className="player-score">{point.homePoint ?? '-'}</span>
          {homeTypeInfo && homeTypeInfo.isSpecial && (
            <span className="point-type-badge" style={{ backgroundColor: homeTypeInfo.color }} title={homeTypeInfo.label}>
              {homeTypeInfo.icon}
            </span>
          )}
        </div>
        <span className="score-vs">vs</span>
        <div className={`point-player ${awayWon ? 'point-winner' : ''}`}>
          <span className="player-label">A</span>
          <span className="player-score">{point.awayPoint ?? '-'}</span>
          {awayTypeInfo && awayTypeInfo.isSpecial && (
            <span className="point-type-badge" style={{ backgroundColor: awayTypeInfo.color }} title={awayTypeInfo.label}>
              {awayTypeInfo.icon}
            </span>
          )}
        </div>
      </div>
      
      {/* Descrizione del punto */}
      {point.pointDescription && (
        <div className="point-desc">
          {point.pointDescription}
        </div>
      )}
    </div>
  );
}
