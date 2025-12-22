import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  ArrowLeft, 
  ChartLineUp, 
  ListBullets, 
  ChartBar, 
  Code, 
  Trophy,
  TennisBall,
  Target,
  CurrencyDollar,
  Lightning,
  Broadcast,
  ArrowClockwise,
  Star,
  Sparkle,
  Fire,
  Crown,
  Scales,
  Lightbulb,
  Info,
  Clipboard,
  Circle,
  Hourglass,
  FlagCheckered,
  Pause,
  Drop,
  FirstAid
} from '@phosphor-icons/react';
import PointByPoint from './components/PointByPoint';
import PointByPointWidget from './components/PointByPointWidget';
import Statistics from './components/Statistics';
import MomentumTab from './components/MomentumTab';
import QuotesTab from './components/QuotesTab';
import PredictorTab from './components/PredictorTab';
import MatchHeader from './components/MatchHeader';
import SavedScrapes from './components/SavedScrapes';
import ErrorBoundary from './components/ErrorBoundary';
import IndicatorsChart from './components/IndicatorsChart';
import MomentumChart from './components/MomentumChart';
import HomePage from './components/HomePage';
import PlayerPage from './components/PlayerPage';
import { apiUrl } from './config';
import { durations, easings } from './motion/tokens';

import './styles/overviewcharts.css';
import './styles/homepage.css';
import {
  normalizeApiResponse,
  extractPlayers,
  normalizeTennisPointByPoint,
  extractMatchSummary,
  extractEventInfo,
  extractStatistics,
  interpretGameValue,
  analyzePowerRankings,
  getStatusColor,
  getZoneIcon,
  deepFindAll,
  extractEventId,
  analyzeLayTheWinner,
  analyzeBancaServizio,
  analyzeSuperBreak,
} from './utils';
import { useLiveMatch, ConnectionIndicator } from './hooks/useLiveMatch.jsx';
import { useMatchData, FetchState } from './hooks/useMatchData.jsx';

function buildUrl(raw) {
  let url = raw.trim();
  if (!url) return null;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
    url = 'https://' + url;
  }
  return url;
}

function sanitizeForDisplay(value) {
  // Replace long binary-like strings with a placeholder to avoid dumping raw PNG bytes
  if (typeof value === 'string') {
    // if contains many non-printable chars or null bytes, treat as binary
    if (
      /\x00/.test(value) ||
      /[\x00-\x08\x0E-\x1F]/.test(value) ||
      (value.length > 200 && /[^\x20-\x7E]/.test(value))
    ) {
      return '[binary data]';
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(sanitizeForDisplay);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = sanitizeForDisplay(value[k]);
    return out;
  }
  return value;
}

// `normalizeApiResponse` is implemented in `src/utils.js` and imported above

// Strategy Card Component - memoized to prevent re-renders
const StrategyCard = React.memo(function StrategyCard({ title, icon, analysis, infoText, momentumData, dataKey }) {
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
  const signalIcons = {
    strong: <Circle size={12} weight="fill" style={{ color: '#10b981' }} />,
    medium: <Circle size={12} weight="fill" style={{ color: '#f59e0b' }} />,
    weak: <Circle size={12} weight="fill" style={{ color: '#9ca3af' }} />,
    none: <Hourglass size={12} weight="duotone" style={{ color: '#6b7280' }} />
  };

  // Calcola mini statistiche dal momentum
  const momentumStats = React.useMemo(() => {
    if (!momentumData || momentumData.length === 0) return null;
    
    const values = momentumData.map(d => d.value || 0);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const current = values[values.length - 1] || 0;
    const trend = values.length >= 3 
      ? values[values.length - 1] - values[values.length - 3]
      : 0;
    const breaks = momentumData.filter(d => d.breakOccurred).length;
    
    return { avg, current, trend, breaks, total: values.length };
  }, [momentumData, dataKey]);

  return (
    <div style={{ 
      background: 'rgba(30, 41, 59, 0.9)', 
      borderRadius: 14, 
      padding: 20, 
      color: '#e4e6eb',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      transition: 'all 0.3s ease',
      border: analysis?.signal === 'strong' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ 
            fontSize: 24, 
            background: 'rgba(59, 130, 246, 0.15)', 
            borderRadius: '50%', 
            width: 44, 
            height: 44, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>{icon}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#e4e6eb' }}>{title}</h3>
            <div style={{ 
              fontSize: 11, 
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{
                background: signalBg[analysis?.signal] || signalBg.none,
                color: signalColors[analysis?.signal] || signalColors.none,
                padding: '3px 10px',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 11
              }}>
                {signalIcons[analysis?.signal] || <Hourglass size={12} weight="duotone" />} {(analysis?.signal || 'none').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div style={{ 
        background: 'rgba(15, 20, 25, 0.6)', 
        borderRadius: 10, 
        padding: 12,
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: '#e4e6eb' }}>
          {analysis?.message || 'Carica un match per analisi'}
        </div>
        {analysis?.details && Object.keys(analysis.details).length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#8b95a5', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {analysis.details.firstSetWinnerName && (
              <div><Trophy size={14} weight="duotone" style={{ color: '#f59e0b', marginRight: 4, verticalAlign: 'middle' }} /> 1° set: <strong style={{ color: '#e4e6eb' }}>{analysis.details.firstSetWinnerName}</strong></div>
            )}
            {analysis.details.secondSetScore && (
              <div><Clipboard size={14} weight="duotone" style={{ color: '#3b82f6', marginRight: 4, verticalAlign: 'middle' }} /> 2° set: <strong style={{ color: '#e4e6eb' }}>{analysis.details.secondSetScore}</strong></div>
            )}
            {analysis.details.serverName && (
              <div><TennisBall size={14} weight="duotone" style={{ color: '#10b981', marginRight: 4, verticalAlign: 'middle' }} /> Servizio: <strong style={{ color: '#e4e6eb' }}>{analysis.details.serverName}</strong></div>
            )}
            {analysis.details.currentGameScore && (
              <div><Lightning size={14} weight="duotone" style={{ color: '#f59e0b', marginRight: 4, verticalAlign: 'middle' }} /> Game: <strong style={{ color: '#e4e6eb' }}>{analysis.details.currentGameScore}</strong></div>
            )}
            {analysis.details.favorito && (
              <div><Star size={14} weight="duotone" style={{ color: '#f59e0b', marginRight: 4, verticalAlign: 'middle' }} /> Favorito: <strong style={{ color: '#e4e6eb' }}>{analysis.details.favorito.name}</strong> (#{analysis.details.favorito.ranking})</div>
            )}
            {analysis.details.homeBreaks !== undefined && (
              <div><Sparkle size={14} weight="duotone" style={{ color: '#ef4444', marginRight: 4, verticalAlign: 'middle' }} /> Break: {analysis.details.homeName} {analysis.details.homeBreaks} - {analysis.details.awayBreaks} {analysis.details.awayName}</div>
            )}
            {/* NUOVI DATI POTENZIATI */}
            {analysis.details.surface && (
              <div><TennisBall size={14} weight="duotone" style={{ color: '#10b981', marginRight: 4, verticalAlign: 'middle' }} /> Superficie: <strong style={{ color: '#e4e6eb' }}>{analysis.details.surface}</strong> {analysis.details.bestOf === 5 ? '(Bo5)' : '(Bo3)'}</div>
            )}
            {analysis.details.comebackRate && (
              <div><ChartBar size={14} weight="duotone" style={{ color: '#3b82f6', marginRight: 4, verticalAlign: 'middle' }} /> Comeback rate: <strong style={{ color: '#10b981' }}>{analysis.details.comebackRate}%</strong></div>
            )}
            {analysis.details.rankingGap && (
              <div><ChartLineUp size={14} weight="duotone" style={{ color: '#3b82f6', marginRight: 4, verticalAlign: 'middle' }} /> Gap ranking: <strong style={{ color: '#e4e6eb' }}>{analysis.details.rankingGap}</strong> posizioni</div>
            )}
            {analysis.details.volatility && (
              <div><Lightning size={14} weight="duotone" style={{ color: analysis.details.volatility === 'MOLTO_VOLATILE' ? '#ef4444' : '#f59e0b', marginRight: 4, verticalAlign: 'middle' }} /> Volatilità: <strong style={{ color: analysis.details.volatility === 'MOLTO_VOLATILE' ? '#ef4444' : '#f59e0b' }}>{analysis.details.volatility}</strong></div>
            )}
            {analysis.dominanceScore !== undefined && analysis.dominanceScore > 0 && (
              <div><Fire size={14} weight="duotone" style={{ color: analysis.dominanceScore >= 65 ? '#10b981' : '#f59e0b', marginRight: 4, verticalAlign: 'middle' }} /> Dominance: <strong style={{ color: analysis.dominanceScore >= 65 ? '#10b981' : '#f59e0b' }}>{analysis.dominanceScore}/100</strong></div>
            )}
          </div>
        )}
      </div>
      
      {/* Pressure Index Bar (per Banca Servizio) */}
      {analysis?.pressureIndex && analysis.pressureIndex.value > 0 && (
        <div style={{
          background: 'rgba(15, 20, 25, 0.6)',
          borderRadius: 8,
          padding: 10,
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ fontSize: 11, color: '#8b95a5', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span><Fire size={14} weight="duotone" style={{ color: '#ef4444', marginRight: 4, verticalAlign: 'middle' }} /> Pressure Index</span>
            <span style={{ 
              color: analysis.pressureIndex.level === 'CRITICAL' ? '#ef4444' : 
                     analysis.pressureIndex.level === 'HIGH' ? '#f59e0b' : '#8b95a5',
              fontWeight: 600
            }}>{analysis.pressureIndex.level}</span>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{
              width: `${analysis.pressureIndex.value}%`,
              height: '100%',
              background: analysis.pressureIndex.value >= 70 ? 'linear-gradient(90deg, #ef4444, #dc2626)' :
                         analysis.pressureIndex.value >= 50 ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
                         analysis.pressureIndex.value >= 30 ? 'linear-gradient(90deg, #3b82f6, #2563eb)' :
                         'linear-gradient(90deg, #6b7280, #4b5563)',
              borderRadius: 4,
              transition: 'width 0.3s ease'
            }} />
          </div>
          {analysis.pressureIndex.breakdown && Object.keys(analysis.pressureIndex.breakdown).length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {analysis.details.doubleFaults && (
                <span style={{ fontSize: 10, color: '#8b95a5' }}>
                  DF: <strong style={{ color: analysis.pressureIndex.breakdown.doubleFaults === 'CRITICAL' ? '#ef4444' : '#e4e6eb' }}>{analysis.details.doubleFaults}</strong>
                </span>
              )}
              {analysis.details.firstServeWonPct && (
                <span style={{ fontSize: 10, color: '#8b95a5' }}>
                  1st%: <strong style={{ color: analysis.details.firstServeWonPct < 55 ? '#ef4444' : '#e4e6eb' }}>{analysis.details.firstServeWonPct}%</strong>
                </span>
              )}
              {analysis.details.breakPointsSavedPct && (
                <span style={{ fontSize: 10, color: '#8b95a5' }}>
                  BPS: <strong style={{ color: analysis.details.breakPointsSavedPct < 50 ? '#ef4444' : '#e4e6eb' }}>{analysis.details.breakPointsSavedPct}%</strong>
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Confidence Bar */}
      {analysis?.confidence > 0 && (
        <div style={{
          background: 'rgba(15, 20, 25, 0.6)',
          borderRadius: 8,
          padding: 10,
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ fontSize: 11, color: '#8b95a5', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span><ChartBar size={14} weight="duotone" style={{ color: '#3b82f6', marginRight: 4, verticalAlign: 'middle' }} /> Confidence</span>
            <span style={{ 
              color: analysis.confidence >= 70 ? '#10b981' : 
                     analysis.confidence >= 50 ? '#f59e0b' : '#8b95a5',
              fontWeight: 600
            }}>{analysis.confidence}%</span>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{
              width: `${analysis.confidence}%`,
              height: '100%',
              background: analysis.confidence >= 70 ? 'linear-gradient(90deg, #10b981, #059669)' :
                         analysis.confidence >= 50 ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
                         'linear-gradient(90deg, #6b7280, #4b5563)',
              borderRadius: 4,
              transition: 'width 0.3s ease'
            }} />
          </div>
          {analysis.factors && Object.keys(analysis.factors).length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {analysis.factors.surface && (
                <span style={{ fontSize: 9, background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 6px', borderRadius: 4 }}>
                  {analysis.factors.surface}
                </span>
              )}
              {analysis.factors.format && (
                <span style={{ fontSize: 9, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 6px', borderRadius: 4 }}>
                  {analysis.factors.format}
                </span>
              )}
              {analysis.factors.momentum && (
                <span style={{ fontSize: 9, background: analysis.factors.momentum === 'FAVORABLE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)', color: analysis.factors.momentum === 'FAVORABLE' ? '#34d399' : '#9ca3af', padding: '2px 6px', borderRadius: 4 }}>
                  Momentum {analysis.factors.momentum}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Match Character (per Super Break) */}
      {analysis?.matchCharacter && (
        <div style={{
          background: analysis.matchCharacter.character === 'DOMINIO' ? 'rgba(16, 185, 129, 0.15)' :
                     analysis.matchCharacter.character === 'BATTAGLIA_EMOTIVA' ? 'rgba(239, 68, 68, 0.15)' :
                     'rgba(59, 130, 246, 0.15)',
          borderRadius: 8,
          padding: 8,
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: analysis.matchCharacter.character === 'DOMINIO' ? '#10b981' :
                analysis.matchCharacter.character === 'BATTAGLIA_EMOTIVA' ? '#ef4444' : '#3b82f6'
        }}>
          {analysis.matchCharacter.character === 'DOMINIO' ? <Crown size={16} weight="duotone" /> :
           analysis.matchCharacter.character === 'BATTAGLIA_EMOTIVA' ? <Scales size={16} weight="duotone" /> :
           analysis.matchCharacter.character === 'RIMONTE_FREQUENTI' ? <ArrowClockwise size={16} weight="duotone" /> : <TennisBall size={16} weight="duotone" />} 
          <span>{analysis.matchCharacter.description}</span>
        </div>
      )}
      
      {/* Recommendation */}
      {analysis?.recommendation && (
        <div style={{ 
          padding: '10px 12px', 
          background: signalBg[analysis.signal] || signalBg.none,
          color: signalColors[analysis.signal] || signalColors.none,
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${signalColors[analysis.signal] || signalColors.none}30`
        }}>
          <Lightbulb size={16} weight="duotone" /> {analysis.recommendation}
        </div>
      )}
      
      {!analysis?.applicable && (
        <div style={{ 
          padding: '8px 10px', 
          background: 'rgba(15, 20, 25, 0.6)', 
          borderRadius: 8,
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: '#8b95a5',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <Info size={14} weight="duotone" /> {infoText}
        </div>
      )}
    </div>
  );
});

const AUTO_REFRESH_SECONDS = 10; // Intervallo auto-refresh in secondi (fallback polling)

export default function App() {
  // Navigation state: 'home' or 'match-detail'
  const [currentView, setCurrentView] = useState('home');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [link, setLink] = useState('');
  const [status, setStatus] = useState(null); // null | 'ok' | 'fail' | 'pending'
  const [checking, setChecking] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);
  const [scrapeData, setScrapeData] = useState(null);
  const [quickHomeName, setQuickHomeName] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [showStatusAlert, setShowStatusAlert] = useState(false);
  const pollRef = useRef(null);
  const autoRefreshRef = useRef(null);
  const countdownRef = useRef(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'pbp', 'stats', 'raw'
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loadedScrapeId, setLoadedScrapeId] = useState(null); // ID of loaded saved scrape
  const [hasPbp, setHasPbp] = useState(false);
  const [hasStats, setHasStats] = useState(false);
  const [dataKey, setDataKey] = useState(0); // key to force re-render when data changes
  const [autoRefresh, setAutoRefresh] = useState(false); // auto-refresh toggle for PointByPoint
  const [refreshInterval, setRefreshInterval] = useState(AUTO_REFRESH_SECONDS); // refresh interval in seconds

  // Live mode state
  const [liveMode, setLiveMode] = useState(false);
  const [liveEventId, setLiveEventId] = useState(null);
  const headerContainerRef = useRef(null);
  
  // Data sync state
  const [syncStatus, setSyncStatus] = useState(null); // null | 'checking' | 'syncing' | 'synced' | 'error'
  const [dataCompleteness, setDataCompleteness] = useState(null);
  
  // Data source preference: 'db' | 'websocket' | 'polling'
  const [dataSource, setDataSource] = useState('db');

  // Handler per selezionare un match dalla HomePage
  const handleMatchSelect = async (match) => {
    console.log('🎯 handleMatchSelect chiamato con:', match);
    try {
      // Usa la nuova API ibrida che legge da DB -> File -> SofaScore
      const eventId = match.eventId || match.id;
      console.log('📡 Carico match con eventId:', eventId);
      const response = await fetch(apiUrl(`/api/match/${eventId}`));
      const data = await response.json();
      console.log('📦 Dati ricevuti dal backend:', data);
      
      // Normalizza i dati in base alla fonte
      let normalizedData;
      if (data.source === 'database') {
        // Dati dal DB: usa raw_json se disponibile (contiene i dati originali SofaScore)
        // Altrimenti costruisci un oggetto evento compatibile
        const rawJson = data.raw_json || {};
        
        // Costruisci homeScore e awayScore dai dati scores del DB
        const buildScoreFromDb = (scores, homeSetsWon, awaySetsWon) => {
          const homeScore = rawJson.homeScore || { current: homeSetsWon };
          const awayScore = rawJson.awayScore || { current: awaySetsWon };
          
          // Aggiungi i punteggi dei set (period1, period2, etc.)
          if (Array.isArray(scores) && scores.length > 0) {
            scores.forEach(s => {
              if (s.set_number) {
                homeScore[`period${s.set_number}`] = s.home_games;
                awayScore[`period${s.set_number}`] = s.away_games;
                if (s.home_tiebreak !== null) homeScore[`period${s.set_number}TieBreak`] = s.home_tiebreak;
                if (s.away_tiebreak !== null) awayScore[`period${s.set_number}TieBreak`] = s.away_tiebreak;
              }
            });
          }
          
          return { homeScore, awayScore };
        };
        
        const { homeScore, awayScore } = buildScoreFromDb(data.scores, data.home_sets_won, data.away_sets_won);
        
        // Costruisci l'oggetto event usando i dati raw_json o i campi DB
        const eventObj = rawJson.id ? rawJson : {
          id: data.id,
          homeTeam: { 
            id: data.home_player_id, 
            name: data.home_name || rawJson.homeTeam?.name || '',
            shortName: rawJson.homeTeam?.shortName || data.home_name || '',
            country: { alpha2: data.home_country || rawJson.homeTeam?.country?.alpha2 || '' }
          },
          awayTeam: { 
            id: data.away_player_id, 
            name: data.away_name || rawJson.awayTeam?.name || '',
            shortName: rawJson.awayTeam?.shortName || data.away_name || '',
            country: { alpha2: data.away_country || rawJson.awayTeam?.country?.alpha2 || '' }
          },
          homeScore,
          awayScore,
          status: rawJson.status || { type: data.status_type, description: data.status_description },
          tournament: rawJson.tournament || { name: data.tournament_name },
          startTimestamp: data.start_time ? Math.floor(new Date(data.start_time).getTime() / 1000) : rawJson.startTimestamp,
          winnerCode: data.winner_code || rawJson.winnerCode,
          firstToServe: data.first_to_serve || rawJson.firstToServe
        };
        
        // Funzione helper per estrarre dati dalle chiavi API nel raw_json
        // Gestisce anche il caso di risposta con errore
        const extractFromApi = (rawJson, keyPattern, dataField) => {
          if (!rawJson?.api) return null;
          for (const [url, apiData] of Object.entries(rawJson.api)) {
            if (url.includes(keyPattern)) {
              // Salta se c'è un errore nella risposta
              if (apiData?.error) continue;
              // Prova il campo specifico
              if (apiData?.[dataField] && Array.isArray(apiData[dataField])) {
                return apiData[dataField];
              }
              // Se apiData stesso è un array valido
              if (Array.isArray(apiData) && apiData.length > 0) {
                return apiData;
              }
            }
          }
          return null;
        };
        
        // Estrai powerRankings, statistics e pointByPoint dalle chiavi API
        // NOTA: SofaScore usa sia 'tennis-power-rankings' che 'tennis-power' come endpoint
        // Prova anche direttamente dal response del backend se già estratti
        const extractedPowerRankings = 
          data.powerRankings ||                                              // Dal backend se già estratto
          data.tennisPowerRankings ||                                        // Alias
          extractFromApi(rawJson, 'tennis-power-rankings', 'tennisPowerRankings') ||
          extractFromApi(rawJson, 'tennis-power', 'tennisPowerRankings') ||  // Variante URL
          extractFromApi(rawJson, 'power-rankings', 'powerRankings') ||
          extractFromApi(rawJson, 'power', 'tennisPowerRankings') ||         // Altra variante
          rawJson?.tennisPowerRankings || 
          rawJson?.powerRankings || 
          [];
          
        const extractedStatistics = 
          data.statistics ||                                                 // Dal backend se già estratto
          extractFromApi(rawJson, '/statistics', 'statistics') ||
          rawJson?.statistics || 
          [];
          
        const extractedPointByPoint = 
          data.pointByPoint ||                                               // Dal backend se già estratto
          extractFromApi(rawJson, 'point-by-point', 'pointByPoint') ||
          rawJson?.pointByPoint || 
          [];
        
        console.log('🔍 Debug estrazione dati:');
        console.log('   source:', data.source || 'unknown');
        console.log('   extractedPowerRankings:', extractedPowerRankings?.length || 0);
        console.log('   extractedStatistics:', extractedStatistics?.length || 0);
        console.log('   extractedPointByPoint:', extractedPointByPoint?.length || 0);
        if (rawJson?.api) {
          console.log('   API keys disponibili:', Object.keys(rawJson.api).filter(k => k.includes('power') || k.includes('statistic')));
        }
        
        // Combina i dati - IMPORTANTE: ...data PRIMA per non sovrascrivere i campi normalizzati
        normalizedData = {
          ...data,  // Prima i dati grezzi dal DB
          event: eventObj,
          pointByPoint: extractedPointByPoint,
          statistics: extractedStatistics,
          tennisPowerRankings: extractedPowerRankings,
          powerRankings: extractedPowerRankings, // Alias per compatibilità
          scores: data.scores || []
        };
        
        // Se mancano dati dettagliati, prova a recuperarli
        const hasPowerRankings = Array.isArray(extractedPowerRankings) && extractedPowerRankings.length > 0;
        const hasStatistics = Array.isArray(extractedStatistics) && extractedStatistics.length > 0;
        const hasPointByPoint = Array.isArray(extractedPointByPoint) && extractedPointByPoint.length > 0;
        
        if (!hasPowerRankings && !hasStatistics && !hasPointByPoint) {
          console.log('⚠️ Dati dettagliati mancanti nel DB, provo a recuperare...');
          
          // Per match XLSX, prova a cercare su SofaScore per nome giocatori
          if (data.data_source === 'xlsx_2025' || data.data_source === 'xlsx') {
            console.log('🔍 Match XLSX - cerco corrispondenza su SofaScore...');
            try {
              const findResponse = await fetch(apiUrl(`/api/match/${eventId}/find-sofascore`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              const findResult = await findResponse.json();
              
              if (findResult.found && findResult.powerRankings?.count > 0) {
                console.log(`✅ Match trovato su SofaScore! ${findResult.powerRankings.count} powerRankings salvati`);
                
                // Ricarica i dati dal DB ora che ha i powerRankings
                const refreshResponse = await fetch(apiUrl(`/api/match/${eventId}`));
                const refreshData = await refreshResponse.json();
                
                if (refreshData.powerRankings?.length > 0) {
                  normalizedData = {
                    ...normalizedData,
                    tennisPowerRankings: refreshData.powerRankings,
                    powerRankings: refreshData.powerRankings,
                    statistics: refreshData.statistics || normalizedData.statistics,
                    pointByPoint: refreshData.pointByPoint || normalizedData.pointByPoint
                  };
                }
              } else {
                console.log('⚠️ Match SofaScore non trovato o senza powerRankings:', findResult.message);
              }
            } catch (findErr) {
              console.log('⚠️ Ricerca SofaScore fallita:', findErr.message);
            }
          } else {
            // Per match SofaScore, usa forceRefresh standard
            try {
              const sofaResponse = await fetch(apiUrl(`/api/match/${eventId}?forceRefresh=true`));
              const sofaData = await sofaResponse.json();
              
              if (sofaData.source === 'sofascore' || sofaData.tennisPowerRankings || sofaData.statistics || sofaData.pointByPoint) {
                console.log('✅ Dati recuperati da SofaScore');
                normalizedData = {
                  ...normalizedData,
                  tennisPowerRankings: sofaData.tennisPowerRankings || sofaData.powerRankings || normalizedData.tennisPowerRankings,
                  powerRankings: sofaData.tennisPowerRankings || sofaData.powerRankings || normalizedData.powerRankings,
                  statistics: sofaData.statistics || normalizedData.statistics,
                  pointByPoint: sofaData.pointByPoint || normalizedData.pointByPoint
                };
              }
            } catch (sofaErr) {
              console.log('⚠️ Impossibile recuperare dati da SofaScore:', sofaErr.message);
            }
          }
        }
        
        console.log('💾 Dati normalizzati dal DB:', normalizedData);
        console.log('🔍 PowerRankings finale:', normalizedData.powerRankings?.length || 0, 'items');
        console.log('🔍 Statistics finale:', normalizedData.statistics?.length || 0, 'items');
        console.log('🔍 PointByPoint finale:', normalizedData.pointByPoint?.length || 0, 'items');
        setRawData(normalizedData);
        setScrapeData(normalizeApiResponse(normalizedData));
      } else if (data.source === 'file') {
        // Dati da file
        console.log('📄 Dati da file:', data);
        // Normalizza i nomi dei campi
        const normalizedFileData = {
          ...data,
          tennisPowerRankings: data.tennisPowerRankings || data.powerRankings || [],
          powerRankings: data.tennisPowerRankings || data.powerRankings || []
        };
        setRawData(normalizedFileData);
        setScrapeData(normalizeApiResponse(normalizedFileData));
      } else {
        // Dati da SofaScore - normalizza i nomi dei campi
        console.log('🌐 Dati da SofaScore:', data);
        console.log('🔍 SofaScore powerRankings:', data.powerRankings?.length || 0, 'items');
        console.log('🔍 SofaScore tennisPowerRankings:', data.tennisPowerRankings?.length || 0, 'items');
        console.log('🔍 SofaScore statistics:', data.statistics?.length || 0, 'items');
        console.log('🔍 SofaScore pointByPoint:', data.pointByPoint?.length || 0, 'items');
        
        // Normalizza i nomi dei campi (SofaScore usa powerRankings, frontend usa tennisPowerRankings)
        const normalizedSofaData = {
          ...data,
          tennisPowerRankings: data.tennisPowerRankings || data.powerRankings || [],
          powerRankings: data.tennisPowerRankings || data.powerRankings || []
        };
        setRawData(normalizedSofaData);
        setScrapeData(normalizeApiResponse(normalizedSofaData));
      }
      
      setLoadedScrapeId(match.id);
      setLiveEventId(eventId);
      setStatus('ok');
      setLastRefresh(new Date());
      setDataKey(prev => prev + 1);
      setCurrentView('match-detail');
      setActiveTab('overview');
      console.log('✅ Vista impostata su match-detail');
      
      // Se il match è in corso, avvia tracking automatico
      const matchStatus = data.event?.status?.type || data.status_type;
      if (matchStatus === 'inprogress') {
        try {
          await fetch(apiUrl(`/api/track/${eventId}`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: matchStatus })
          });
          console.log(`📌 Match ${eventId} added to auto-tracking`);
        } catch (e) {
          console.log('⚠️ Tracking not available');
        }
      }
    } catch (error) {
      console.error('❌ Errore caricamento match:', error);
      setStatus('error');
    }
  };

  // Handler per aprire modal aggiungi match
  const handleAddMatch = () => {
    setShowAddModal(true);
  };

  // Handler per tornare alla home
  const handleBackToHome = () => {
    setCurrentView('home');
    setRawData(null);
    setScrapeData(null);
    setLink('');
    setStatus(null);
    setSyncStatus(null);
    setDataCompleteness(null);
  };

  // Check completezza dati
  const checkDataCompleteness = async (eventId) => {
    if (!eventId) return;
    setSyncStatus('checking');
    try {
      const response = await fetch(apiUrl(`/api/check-data/${eventId}`));
      const data = await response.json();
      if (data.dataCompleteness) {
        setDataCompleteness(data.dataCompleteness);
        setSyncStatus(data.needsSync ? 'needs-sync' : 'ok');
      } else {
        setSyncStatus('ok');
      }
    } catch (err) {
      console.error('Error checking data:', err);
      setSyncStatus('error');
    }
  };

  // Sync manuale dei dati (usa nuova API)
  const syncMatchData = async () => {
    const eventId = liveEventId || extractEventId(dataForExtraction);
    if (!eventId) return;
    
    setSyncStatus('syncing');
    try {
      // Usa la nuova API sync che aggiorna DB
      const response = await fetch(apiUrl(`/api/sync/${eventId}`), { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setDataCompleteness(data.dataCompleteness);
        setSyncStatus('synced');
        
        // Ricarica i dati aggiornati dalla nuova API
        const refreshResponse = await fetch(apiUrl(`/api/match/${eventId}`));
        const refreshData = await refreshResponse.json();
        
        if (refreshData.source === 'database') {
          // Costruisci l'oggetto event correttamente come in handleMatchSelect
          const rawJson = refreshData.raw_json || {};
          
          const buildScoreFromDb = (scores, homeSetsWon, awaySetsWon) => {
            const homeScore = rawJson.homeScore || { current: homeSetsWon };
            const awayScore = rawJson.awayScore || { current: awaySetsWon };
            
            if (Array.isArray(scores) && scores.length > 0) {
              scores.forEach(s => {
                if (s.set_number) {
                  homeScore[`period${s.set_number}`] = s.home_games;
                  awayScore[`period${s.set_number}`] = s.away_games;
                  if (s.home_tiebreak !== null) homeScore[`period${s.set_number}TieBreak`] = s.home_tiebreak;
                  if (s.away_tiebreak !== null) awayScore[`period${s.set_number}TieBreak`] = s.away_tiebreak;
                }
              });
            }
            return { homeScore, awayScore };
          };
          
          const { homeScore, awayScore } = buildScoreFromDb(refreshData.scores, refreshData.home_sets_won, refreshData.away_sets_won);
          
          const eventObj = rawJson.id ? rawJson : {
            id: refreshData.id,
            homeTeam: { 
              id: refreshData.home_player_id, 
              name: refreshData.home_name || rawJson.homeTeam?.name || '',
              shortName: rawJson.homeTeam?.shortName || refreshData.home_name || '',
              country: { alpha2: refreshData.home_country || rawJson.homeTeam?.country?.alpha2 || '' }
            },
            awayTeam: { 
              id: refreshData.away_player_id, 
              name: refreshData.away_name || rawJson.awayTeam?.name || '',
              shortName: rawJson.awayTeam?.shortName || refreshData.away_name || '',
              country: { alpha2: refreshData.away_country || rawJson.awayTeam?.country?.alpha2 || '' }
            },
            homeScore,
            awayScore,
            status: rawJson.status || { type: refreshData.status_type, description: refreshData.status_description },
            tournament: rawJson.tournament || { name: refreshData.tournament_name },
            startTimestamp: refreshData.start_time ? Math.floor(new Date(refreshData.start_time).getTime() / 1000) : rawJson.startTimestamp,
            winnerCode: refreshData.winner_code || rawJson.winnerCode,
            firstToServe: refreshData.first_to_serve || rawJson.firstToServe
          };
          
          const normalizedData = {
            ...refreshData,  // Prima i dati grezzi
            event: eventObj,
            pointByPoint: rawJson.pointByPoint || refreshData.pointByPoint || [],
            statistics: rawJson.statistics || refreshData.statistics || [],
            tennisPowerRankings: rawJson.tennisPowerRankings || refreshData.powerRankings || [],
            powerRankings: rawJson.tennisPowerRankings || refreshData.powerRankings || [],
            scores: refreshData.scores || []
          };
          setRawData(normalizedData);
          setScrapeData(normalizeApiResponse(normalizedData));
        } else {
          setRawData(refreshData);
          setScrapeData(normalizeApiResponse(refreshData));
        }
        
        setLastRefresh(new Date());
        setDataKey(prev => prev + 1);
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('Error syncing data:', err);
      setSyncStatus('error');
    }
  };



  


  // derived display sources - use useMemo for proper reactivity
  const displaySource = React.useMemo(() => {
    return scrapeData || rawData;
  }, [scrapeData, rawData]);
  
  // Use rawData first for eventInfo since it has the complete structure
  const dataForExtraction = React.useMemo(() => {
    return rawData || scrapeData;
  }, [rawData, scrapeData]);
  
  const matchSummary = React.useMemo(() => {
    return dataForExtraction ? extractMatchSummary(dataForExtraction) : null;
  }, [dataForExtraction]);
  
  const normalizedPbp = React.useMemo(() => {
    return dataForExtraction ? normalizeTennisPointByPoint(dataForExtraction) : null;
  }, [dataForExtraction]);
  
  const eventInfo = React.useMemo(() => {
    return dataForExtraction ? extractEventInfo(dataForExtraction) : null;
  }, [dataForExtraction]);



  // Handler for loading saved scrapes
  const handleLoadSavedScrape = (data, id) => {
    setRawData(data);
    setScrapeData(normalizeApiResponse(data));
    setLoadedScrapeId(id);
    setStatus('ok');
    setLink(''); // Clear link since this is loaded from file
    setLastRefresh(new Date());
    setDataKey(prev => prev + 1); // Force re-render
  };

  const startScrape = async (urlToRun, silentRefresh = false) => {
    // In silent mode (auto-refresh), don't clear existing data to avoid UI flash
    setIsBackgroundRefresh(silentRefresh);
    if (!silentRefresh) {
      setChecking(true);
      setStatus(null);
      setScrapeData(null);
      setRawData(null);
      setLoadedScrapeId(null);
      setQuickHomeName(null);
    }
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToRun }),
      });
      const json = await res.json();
      if (json && json.id) {
        setJobId(json.id);
        if (!silentRefresh) setStatus('pending');
      } else if (!silentRefresh) {
        setStatus('fail');
      }
    } catch (err) {
      if (!silentRefresh) setStatus('fail');
    } finally {
      if (!silentRefresh) setChecking(false);
    }
  };

  const lookupHomeName = async (urlToRun) => {
    try {
      const res = await fetch('/api/lookup-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToRun }),
      });
      if (!res.ok) return;
      const j = await res.json();
      if (j && j.home) setQuickHomeName(j.home);
    } catch (e) {
      // ignore quick lookup errors
    }
  };

  const statusInfo = React.useMemo(() => {
    switch (status) {
      case 'ok':
        return { label: 'Raggiungibile', color: 'green' };
      case 'fail':
        return { label: 'Errore', color: 'red' };
      case 'pending':
        return { label: 'In corso', color: 'yellow' };
      default:
        return { label: 'Nessun controllo', color: 'gray' };
    }
  }, [status]);

  // Map match status to a compact visual (icon, class, label)
  function getMatchStatusVisual(status) {
    try {
      const desc = (status?.description ?? '').toString().toLowerCase();
      const type = (status?.type ?? '').toString().toLowerCase();

      // Prioritize explicit types
      if (type === 'inprogress') return { icon: <Circle size={12} weight="fill" style={{ color: '#ef4444' }} />, className: 'inprogress', label: status?.description || 'Live' };
      if (type === 'finished') return { icon: <FlagCheckered size={14} weight="duotone" style={{ color: '#10b981' }} />, className: 'finished', label: status?.description || 'Terminato' };
      if (type === 'notstarted') return { icon: <Hourglass size={14} weight="duotone" style={{ color: '#6b7280' }} />, className: 'upcoming', label: status?.description || 'Pre-match' };
      if (type === 'paused') return { icon: <Pause size={14} weight="duotone" style={{ color: '#f59e0b' }} />, className: 'paused', label: status?.description || 'Sospeso' };

      // Fallback by description keywords (Italian/English)
      if (/piogg|rain/.test(desc)) return { icon: <Drop size={14} weight="duotone" style={{ color: '#3b82f6' }} />, className: 'paused', label: status?.description || 'Sospeso (pioggia)' };
      if (/medical|medical timeout|timeout medical|medicaltimeout/.test(desc)) return { icon: <FirstAid size={14} weight="duotone" style={{ color: '#ef4444' }} />, className: 'medical', label: status?.description || 'Medical timeout' };
      if (/paused|sospeso|pause/.test(desc)) return { icon: <Pause size={14} weight="duotone" style={{ color: '#f59e0b' }} />, className: 'paused', label: status?.description || 'Sospeso' };
      if (/live|in progress|inprogress/.test(desc)) return { icon: <Circle size={12} weight="fill" style={{ color: '#ef4444' }} />, className: 'inprogress', label: status?.description || 'Live' };

      // Default
      return { icon: <Circle size={12} weight="regular" style={{ color: '#6b7280' }} />, className: 'unknown', label: status?.description || 'Stato sconosciuto' };
    } catch (e) {
      // Fallback to unknown on any unexpected error
      return { icon: <Circle size={12} weight="regular" style={{ color: '#6b7280' }} />, className: 'unknown', label: 'Stato sconosciuto' };
    }
  }

  const compactStatus = React.useMemo(() => getMatchStatusVisual(eventInfo?.status), [eventInfo?.status]);

  // Callback for receiving live data via WebSocket
  const handleLiveData = useCallback((data) => {
    if (!data) return;
    try {
      // Update UI with raw payload and normalized form
      setRawData(data);
      setScrapeData(normalizeApiResponse(data));
      setLastRefresh(new Date());
      setStatus('ok');
      setDataKey(prev => prev + 1);
    } catch (e) {
      // ignore
    }
  }, []);

  // Hook WebSocket for live updates (auto-connect only when liveMode and eventId present)
  const {
    connectionState,
    error: wsError,
    lastUpdate: wsLastUpdate,
    subscribe: wsSubscribe,
    unsubscribe: wsUnsubscribe,
    disconnect: wsDisconnect
  } = useLiveMatch(liveMode ? liveEventId : null, {
    autoConnect: liveMode && !!liveEventId,
    serverUrl: 'http://localhost:3001',
    onData: handleLiveData
  });

  // Toggle Live mode (shared helper)
  const toggleLiveMode = async (shouldEnable) => {
    const eventId = extractEventId(dataForExtraction);
    const enable = typeof shouldEnable === 'boolean' ? shouldEnable : !liveMode;
    if (enable && eventId) {
      setLiveEventId(eventId);
      setLiveMode(true);
      setIsBackgroundRefresh(false);
      setCountdown(0);
      setJobId(null);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (autoRefreshRef.current) { clearInterval(autoRefreshRef.current); autoRefreshRef.current = null; }
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      try { if (wsSubscribe) await wsSubscribe(eventId); } catch (e) { /* ignore */ }
    } else {
      setLiveMode(false);
      setLiveEventId(null);
      setCountdown(AUTO_REFRESH_SECONDS);
      try { if (wsUnsubscribe) await wsUnsubscribe(); } catch (e) { /* ignore */ }
    }
  };

  const checkLink = async () => {
    const url = buildUrl(link);
    if (!url) return;
    // quick lookup for home name, then start full scrape
    lookupHomeName(url);
    await startScrape(url);
  };

  const runUrl = async (urlToRun) => {
    setLink(urlToRun);
    await startScrape(urlToRun);
  };

  const exampleUrl =
    'https://www.sofascore.com/it/tennis/match/kosuke-shibano-matt-kuhar/YNEbsxTkc#id:15224844';

  const handleStart = async () => {
    const url = buildUrl(link);
    if (!url) {
      await runUrl(exampleUrl);
    } else {
      lookupHomeName(url);
      await startScrape(url);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') checkLink();
  };

  useEffect(() => {
    let timer = null;
    if (status === 'fail') {
      setShowStatusAlert(true);
      timer = setTimeout(() => setShowStatusAlert(false), 5000);
    } else {
      setShowStatusAlert(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [status]);

  useEffect(() => {
    if (!jobId) return;
    pollRef.current = setInterval(async () => {
      try {
        const sRes = await fetch(apiUrl(`/api/status/${jobId}`));
        const sJson = await sRes.json();
        if (sJson.status === 'finished') {
          const dRes = await fetch(apiUrl(`/api/data/${jobId}`));
          const dJson = await dRes.json();
          // keep full backend response for complete display
          setRawData(dJson);
          // prefer backend-provided mapping for UI usage when available
          let mapped = null;
          if (dJson && dJson.mapping) mapped = dJson.mapping;
          else mapped = normalizeApiResponse(dJson);

          // attempt to extract home/away more robustly from raw payload
          try {
            const players = extractPlayers(dJson, []);
            if (players.home) mapped.home = players.home;
            if (players.away) mapped.away = players.away;
          } catch (e) {
            // ignore extraction errors
          }

          setScrapeData(mapped);
          // Solo aggiorna status se non è background refresh
          if (!isBackgroundRefresh) {
            setStatus('ok');
          }
          setLastRefresh(new Date());
          setIsBackgroundRefresh(false); // Reset flag
          clearInterval(pollRef.current);
          pollRef.current = null;
        } else if (sJson.status === 'error') {
          // Solo mostra errore se non è background refresh
          if (!isBackgroundRefresh) {
            setStatus('fail');
          }
          setIsBackgroundRefresh(false);
          clearInterval(pollRef.current);
          pollRef.current = null;
        } else {
          // Solo mostra pending se non è background refresh
          if (!isBackgroundRefresh) {
            setStatus('pending');
          }
        }
      } catch (err) {
        if (!isBackgroundRefresh) {
          setStatus('fail');
        }
        setIsBackgroundRefresh(false);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobId]);

  // Auto-refresh automatico con countdown (usa polling HTTP al DB)
  useEffect(() => {
    // Clear any existing intervals
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    // Non fare polling se Live Mode WebSocket è attivo
    if (liveMode) {
      return;
    }

    // Solo se abbiamo dati e non stiamo già facendo scrape
    if (!dataForExtraction || checking || status === 'pending') {
      return;
    }

    // Reset countdown
    setCountdown(AUTO_REFRESH_SECONDS);

    // Countdown ogni secondo
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return AUTO_REFRESH_SECONDS; // Reset
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-refresh ogni AUTO_REFRESH_SECONDS secondi (usa API DB invece di scraping)
    autoRefreshRef.current = setInterval(async () => {
      const eventId = liveEventId || extractEventId(dataForExtraction);
      if (eventId && !checking && !isBackgroundRefresh) {
        setIsBackgroundRefresh(true);
        try {
          // Usa la nuova API che legge dal DB (già aggiornato dallo scheduler)
          const response = await fetch(apiUrl(`/api/match/${eventId}`));
          if (response.ok) {
            const data = await response.json();
            
            if (data.source === 'database') {
              // Costruisci l'oggetto event correttamente
              const rawJson = data.raw_json || {};
              
              const buildScoreFromDb = (scores, homeSetsWon, awaySetsWon) => {
                const homeScore = rawJson.homeScore || { current: homeSetsWon };
                const awayScore = rawJson.awayScore || { current: awaySetsWon };
                
                if (Array.isArray(scores) && scores.length > 0) {
                  scores.forEach(s => {
                    if (s.set_number) {
                      homeScore[`period${s.set_number}`] = s.home_games;
                      awayScore[`period${s.set_number}`] = s.away_games;
                      if (s.home_tiebreak !== null) homeScore[`period${s.set_number}TieBreak`] = s.home_tiebreak;
                      if (s.away_tiebreak !== null) awayScore[`period${s.set_number}TieBreak`] = s.away_tiebreak;
                    }
                  });
                }
                return { homeScore, awayScore };
              };
              
              const { homeScore, awayScore } = buildScoreFromDb(data.scores, data.home_sets_won, data.away_sets_won);
              
              const eventObj = rawJson.id ? rawJson : {
                id: data.id,
                homeTeam: { 
                  id: data.home_player_id, 
                  name: data.home_name || rawJson.homeTeam?.name || '',
                  shortName: rawJson.homeTeam?.shortName || data.home_name || '',
                  country: { alpha2: data.home_country || rawJson.homeTeam?.country?.alpha2 || '' }
                },
                awayTeam: { 
                  id: data.away_player_id, 
                  name: data.away_name || rawJson.awayTeam?.name || '',
                  shortName: rawJson.awayTeam?.shortName || data.away_name || '',
                  country: { alpha2: data.away_country || rawJson.awayTeam?.country?.alpha2 || '' }
                },
                homeScore,
                awayScore,
                status: rawJson.status || { type: data.status_type, description: data.status_description },
                tournament: rawJson.tournament || { name: data.tournament_name },
                startTimestamp: data.start_time ? Math.floor(new Date(data.start_time).getTime() / 1000) : rawJson.startTimestamp,
                winnerCode: data.winner_code || rawJson.winnerCode,
                firstToServe: data.first_to_serve || rawJson.firstToServe
              };
              
              const normalizedData = {
                ...data,  // Prima i dati grezzi
                event: eventObj,
                pointByPoint: rawJson.pointByPoint || data.pointByPoint || [],
                statistics: rawJson.statistics || data.statistics || [],
                tennisPowerRankings: rawJson.tennisPowerRankings || data.powerRankings || [],
                powerRankings: rawJson.tennisPowerRankings || data.powerRankings || [],
                scores: data.scores || []
              };
              setRawData(normalizedData);
              setScrapeData(normalizeApiResponse(normalizedData));
            } else {
              setRawData(data);
              setScrapeData(normalizeApiResponse(data));
            }
            
            setLastRefresh(new Date());
            setDataKey(prev => prev + 1);
          }
        } catch (err) {
          console.error('Auto-refresh error:', err);
        } finally {
          setIsBackgroundRefresh(false);
        }
      }
    }, AUTO_REFRESH_SECONDS * 1000);

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [dataForExtraction, liveEventId, checking, status, liveMode]);

  // gestionale removed — render main UI as usual
  const prefersReducedMotion = useReducedMotion();

  // Sidebar navigation items con icone Phosphor
  const sidebarTabs = [
    { id: 'overview', label: 'Overview', icon: ChartLineUp },
    { id: 'predictor', label: 'Predictor', icon: Target },
    { id: 'quotes', label: 'Quote', icon: CurrencyDollar },
    { id: 'pbp', label: 'Point by Point', icon: ListBullets },
    { id: 'stats', label: 'Statistiche', icon: ChartBar },
    { id: 'momentum', label: 'Momentum', icon: Lightning },
    { id: 'raw', label: 'Raw JSON', icon: Code },
  ];

  return (
    <>
      {/* Modal Aggiungi Match */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Aggiungi Match</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                className="modal-input"
                placeholder="Incolla URL SofaScore..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleStart();
                    setShowAddModal(false);
                  }
                }}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-secondary" onClick={() => setShowAddModal(false)}>
                Annulla
              </button>
              <button 
                className="modal-btn modal-btn-primary" 
                onClick={() => {
                  handleStart();
                  setShowAddModal(false);
                }}
                disabled={!link.trim() || checking}
              >
                {checking ? 'Caricamento...' : 'Avvia Scraping'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HomePage View */}
      {currentView === 'home' && (
        <HomePage 
          onMatchSelect={handleMatchSelect}
          onNavigateToPlayer={() => setCurrentView('player')}
        />
      )}

      {/* Player Profile View */}
      {currentView === 'player' && (
        <div className="player-view-container">
          <header className="player-view-header">
            <button className="back-btn" onClick={() => setCurrentView('home')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Torna alla Home</span>
            </button>
          </header>
          <PlayerPage />
        </div>
      )}

      {/* Match Detail View */}
      {currentView === 'match-detail' && (
    <div className="app-layout">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="top-bar-left">
          <motion.button 
            className="back-btn" 
            onClick={handleBackToHome}
            whileHover={!prefersReducedMotion ? { x: -3 } : {}}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: durations.fast, ease: easings.premium }}
          >
            <ArrowLeft size={18} weight="bold" />
            <span>Indietro</span>
          </motion.button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="main-layout">
        {/* Sidebar Navigation */}
        {dataForExtraction && (
          <aside className="sidebar">
            <nav className="sidebar-nav">
              {sidebarTabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    className={`sidebar-tab ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={!prefersReducedMotion ? { x: 4, backgroundColor: 'rgba(255, 255, 255, 0.08)' } : {}}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: durations.fast, ease: easings.premium }}
                  >
                    <IconComponent 
                      size={20} 
                      weight={isActive ? 'fill' : 'duotone'} 
                      className="sidebar-tab-icon"
                    />
                    <span className="sidebar-tab-label">{tab.label}</span>
                    {isActive && (
                      <motion.span
                        className="sidebar-tab-indicator"
                        layoutId="tabIndicator"
                        transition={{ duration: durations.fast, ease: easings.premium }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Content Area */}
        <main className={`content-area ${dataForExtraction ? 'with-sidebar' : ''}`}>

      


      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>

      {showStatusAlert && (
        <div className="status-alert" role="alert" aria-live="assertive" style={{ margin: '8px 32px' }}>
          <strong>Impossibile raggiungere il link.</strong> Verifica l&apos;URL, prova a eseguire il controllo dal backend o controlla CORS/connessione.
        </div>
      )}

      {/* Match Header */}
      {dataForExtraction && (
        <div className="match-header-container" ref={headerContainerRef}>
          <div className="match-header-wrapper">
            <ErrorBoundary componentName="MatchHeader">
              <MatchHeader data={dataForExtraction} eventInfo={eventInfo} />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      {dataForExtraction && (
        <div className="dashboard-content">
          {/* Tab Content */}
          <div className="tab-content">
            {/* Overview Tab - Grafici e Strategie */}
            {activeTab === 'overview' && (
              <div className="overview-content">
                {/* Grafici full-width */}
                {(() => {
                  // Prova prima al top level, poi usa deepFindAll come fallback
                  let powerRankings = dataForExtraction.tennisPowerRankings || dataForExtraction.powerRankings || [];
                  
                  // Se non trovato al top level, cerca in profondità
                  if (!powerRankings || powerRankings.length === 0) {
                    const found = deepFindAll(dataForExtraction, 'tennisPowerRankings', 5).flat().filter(Boolean);
                    if (found.length > 0) powerRankings = found;
                  }
                  if (!powerRankings || powerRankings.length === 0) {
                    const found = deepFindAll(dataForExtraction, 'powerRankings', 5).flat().filter(Boolean);
                    if (found.length > 0) powerRankings = found;
                  }
                  
                  // Cerca anche nelle chiavi API del raw_json se presenti
                  if ((!powerRankings || powerRankings.length === 0) && dataForExtraction.raw_json?.api) {
                    for (const [url, apiData] of Object.entries(dataForExtraction.raw_json.api)) {
                      if (url.includes('power') && !apiData?.error) {
                        const pr = apiData?.tennisPowerRankings || apiData?.powerRankings;
                        if (Array.isArray(pr) && pr.length > 0) {
                          powerRankings = pr;
                          console.log('📊 PowerRankings trovati in raw_json.api:', url);
                          break;
                        }
                      }
                    }
                  }
                  
                  // Debug log
                  console.log('📊 PowerRankings trovati:', powerRankings?.length || 0, powerRankings?.slice(0,3));
                  
                  // Prepara matchData per fallback (se no powerRankings)
                  // Usa dati dal DB o dall'estrazione
                  const matchDataForFallback = dataForExtraction.dbMatch || dataForExtraction.match || {
                    // Estrai punteggi set se disponibili
                    w1: dataForExtraction.homeScore?.period1,
                    l1: dataForExtraction.awayScore?.period1,
                    w2: dataForExtraction.homeScore?.period2,
                    l2: dataForExtraction.awayScore?.period2,
                    w3: dataForExtraction.homeScore?.period3,
                    l3: dataForExtraction.awayScore?.period3,
                    w4: dataForExtraction.homeScore?.period4,
                    l4: dataForExtraction.awayScore?.period4,
                    w5: dataForExtraction.homeScore?.period5,
                    l5: dataForExtraction.awayScore?.period5,
                    winner_name: eventInfo?.home?.name,
                    loser_name: eventInfo?.away?.name,
                    homeScore: dataForExtraction.homeScore,
                    awayScore: dataForExtraction.awayScore
                  };
                  
                  return (
                    <>
                      <div style={{ marginBottom: 32 }}>
                        <IndicatorsChart 
                          powerRankings={powerRankings} 
                          homeName={eventInfo?.home?.name || 'Home'}
                          awayName={eventInfo?.away?.name || 'Away'}
                          matchData={matchDataForFallback}
                        />
                        
                        <MomentumChart 
                          powerRankings={powerRankings} 
                          homeName={eventInfo?.home?.name || 'Home'}
                          awayName={eventInfo?.away?.name || 'Away'}
                        />
                      </div>

                      {/* Strategie di Trading - Stack verticale */}
                      <h2 style={{ 
                        margin: '0 0 20px 0', 
                        fontSize: 20, 
                        fontWeight: 600, 
                        color: '#e4e6eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}>
                        <Target size={24} weight="duotone" style={{ color: '#3b82f6' }} />
                        Strategie di Base Tennis
                      </h2>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        
                        <StrategyCard 
                          title="Lay the Winner"
                          icon={<Trophy size={20} weight="duotone" />}
                          analysis={analyzeLayTheWinner(dataForExtraction)}
                          infoText="Banca chi vince il 1° set aspettando recupero nel 2°"
                          momentumData={powerRankings}
                          dataKey={dataKey}
                        />

                        <StrategyCard 
                          title="Banca Servizio"
                          icon={<TennisBall size={20} weight="duotone" />}
                          analysis={analyzeBancaServizio(dataForExtraction)}
                          infoText="Banca chi serve quando sotto pressione (0-30, 15-40, ecc.)"
                          momentumData={powerRankings}
                          dataKey={dataKey}
                        />

                        <StrategyCard 
                          title="Super Break"
                          icon={<Lightning size={20} weight="duotone" />}
                          analysis={analyzeSuperBreak(dataForExtraction)}
                          infoText="Punta favorito dominante, banca al break point per free bet"
                          momentumData={powerRankings}
                          dataKey={dataKey}
                        />

                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Predictor Tab */}
            {activeTab === 'predictor' && (
              <div className="predictor-content">
                <ErrorBoundary componentName="Predictor">
                  {(() => {
                    // Extract player names from eventInfo (home/away, NOT players)
                    const homePlayer = eventInfo?.home?.name || eventInfo?.home?.shortName || 'Giocatore 1';
                    const awayPlayer = eventInfo?.away?.name || eventInfo?.away?.shortName || 'Giocatore 2';
                    // Extract match context (surface, tournament, format)
                    const matchContext = {
                      surface: eventInfo?.groundType || eventInfo?.surface || eventInfo?.tournament?.groundType || null,
                      tournament: eventInfo?.tournament?.name || eventInfo?.tournamentName || null,
                      format: matchSummary?.format || (eventInfo?.bestOf === 5 ? 'best-of-5' : 'best-of-3'),
                    };
                    return (
                      <PredictorTab 
                        homePlayer={homePlayer}
                        awayPlayer={awayPlayer}
                        matchContext={matchContext}
                      />
                    );
                  })()}
                </ErrorBoundary>
              </div>
            )}

            {/* Quotes Tab */}
            {activeTab === 'quotes' && (
              <div className="quotes-content">
                <ErrorBoundary componentName="Quotes">
                  {(() => {
                    const powerRankings = dataForExtraction ? deepFindAll(dataForExtraction, 'tennisPowerRankings', 5).flat().filter(Boolean) : [];
                    return (
                      <QuotesTab 
                        powerRankings={powerRankings} 
                        eventInfo={eventInfo}
                        matchSummary={matchSummary}
                      />
                    );
                  })()}
                </ErrorBoundary>
              </div>
            )}

            {/* Point by Point Tab */}
            {activeTab === 'pbp' && (
              <div className="pbp-content">
                <ErrorBoundary componentName="Point by Point">
                  <PointByPoint 
                    data={dataForExtraction} 
                    eventId={extractEventId(dataForExtraction)}
                    autoRefresh={autoRefresh}
                    refreshInterval={refreshInterval * 1000}
                    onHasData={(v) => setHasPbp(Boolean(v))} 
                  />
                </ErrorBoundary>
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
              <div className="stats-content">
                <ErrorBoundary componentName="Statistics">
                  <Statistics data={dataForExtraction} onHasData={(v) => setHasStats(Boolean(v))} />
                </ErrorBoundary>
              </div>
            )}

            {/* Momentum Tab */}
            {activeTab === 'momentum' && (
              <div className="momentum-content">
                <ErrorBoundary componentName="Momentum">
                  {(() => {
                    // Priorità 1: usa tennisPowerRankings già estratti alla radice
                    let powerRankings = [];
                    if (Array.isArray(dataForExtraction?.tennisPowerRankings) && dataForExtraction.tennisPowerRankings.length > 0) {
                      powerRankings = dataForExtraction.tennisPowerRankings;
                    } else if (Array.isArray(dataForExtraction?.powerRankings) && dataForExtraction.powerRankings.length > 0) {
                      powerRankings = dataForExtraction.powerRankings;
                    } else {
                      // Fallback: cerca in profondità
                      powerRankings = dataForExtraction ? deepFindAll(dataForExtraction, 'tennisPowerRankings', 5).flat().filter(Boolean) : [];
                    }
                    console.log('🎯 MomentumTab powerRankings:', powerRankings?.length || 0, 'items');
                    return (
                      <MomentumTab 
                        powerRankings={powerRankings} 
                        eventInfo={eventInfo} 
  
                      />
                    );
                  })()}
                </ErrorBoundary>
              </div>
            )}

            {/* Raw JSON Tab */}
            {activeTab === 'raw' && (
              <div className="raw-content">
                <pre className="data-box" style={{ maxHeight: 500, overflow: 'auto' }}>
                  {rawData
                    ? JSON.stringify(sanitizeForDisplay(rawData), null, 2)
                    : scrapeData
                    ? JSON.stringify(sanitizeForDisplay(scrapeData), null, 2)
                    : 'Nessun dato estratto'}
                </pre>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={async () => {
                      const toCopy = rawData || scrapeData;
                      if (!toCopy) return;
                      const text = JSON.stringify(toCopy, null, 2);
                      try {
                        await navigator.clipboard.writeText(text);
                        const fb = document.createElement('div');
                        fb.textContent = 'JSON copiato negli appunti';
                        fb.style.cssText = 'position:fixed;bottom:16px;right:16px;background:rgba(0,0,0,0.8);color:white;padding:8px 12px;border-radius:6px;z-index:9999';
                        document.body.appendChild(fb);
                        setTimeout(() => fb.remove(), 2500);
                      } catch (e) {
                        console.error('Copy failed:', e);
                      }
                    }}
                  >
                    <Clipboard size={16} weight="duotone" style={{ marginRight: 4 }} /> Copia JSON
                  </button>

                  {/* Download JSON */}
                  <button
                    onClick={() => {
                      const toExport = rawData || scrapeData;
                      if (!toExport) return;
                      const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      const filename = eventInfo?.home?.name && eventInfo?.away?.name
                        ? `${eventInfo.home.name}_vs_${eventInfo.away.name}_${new Date().toISOString().slice(0,10)}.json`
                        : `scrape_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
                      a.href = url;
                      a.download = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    disabled={!dataForExtraction}
                    style={{
                      padding: '8px 14px',
                      background: '#6c9a8b',
                      border: 'none',
                      borderRadius: 6,
                      color: 'white',
                      cursor: dataForExtraction ? 'pointer' : 'not-allowed',
                      opacity: dataForExtraction ? 1 : 0.5,
                      fontWeight: 500,
                      fontSize: 13
                    }}
                  >
                    💾 Scarica JSON
                  </button>

                  {/* Download CSV - Statistics */}
                  <button
                    onClick={() => {
                      const toExport = rawData || scrapeData;
                      if (!toExport) return;
                      
                      // Build CSV from statistics
                      const stats = extractStatistics ? extractStatistics(toExport, 'ALL') : null;
                      if (!stats?.groups?.length) {
                        alert('Nessuna statistica da esportare');
                        return;
                      }

                      let csv = 'Gruppo,Statistica,Home,Away\n';
                      stats.groups.forEach(group => {
                        const items = group.statisticsItems || group.items || [];
                        items.forEach(item => {
                          const name = item.name || item.key || 'N/A';
                          const home = item.home ?? item.homeValue ?? '';
                          const away = item.away ?? item.awayValue ?? '';
                          csv += `"${group.groupName || 'Stats'}","${name}","${home}","${away}"\n`;
                        });
                      });

                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      const filename = eventInfo?.home?.name && eventInfo?.away?.name
                        ? `stats_${eventInfo.home.name}_vs_${eventInfo.away.name}.csv`
                        : `statistics_${new Date().toISOString().slice(0,10)}.csv`;
                      a.href = url;
                      a.download = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    disabled={!dataForExtraction}
                    style={{
                      padding: '8px 14px',
                      background: '#d4a84b',
                      border: 'none',
                      borderRadius: 6,
                      color: 'white',
                      cursor: dataForExtraction ? 'pointer' : 'not-allowed',
                      opacity: dataForExtraction ? 1 : 0.5,
                      fontWeight: 500,
                      fontSize: 13
                    }}
                  >
                    <ChartBar size={16} weight="duotone" style={{ marginRight: 4 }} /> Esporta Stats CSV
                  </button>

                  {/* Download CSV - Point by Point */}
                  <button
                    onClick={() => {
                      const toExport = rawData || scrapeData;
                      if (!toExport) return;
                      
                      const pbp = normalizeTennisPointByPoint(toExport);
                      if (!pbp?.points?.length) {
                        alert('Nessun dato point-by-point da esportare');
                        return;
                      }

                      let csv = 'Set,Game,Punto,Vincitore,Punteggio,Servizio\n';
                      pbp.points.forEach(point => {
                        csv += `"${point.set || ''}","${point.game || ''}","${point.pointNumber || ''}","${point.winner || ''}","${point.scoreAfter || ''}","${point.server || ''}"\n`;
                      });

                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      const filename = eventInfo?.home?.name && eventInfo?.away?.name
                        ? `pbp_${eventInfo.home.name}_vs_${eventInfo.away.name}.csv`
                        : `point_by_point_${new Date().toISOString().slice(0,10)}.csv`;
                      a.href = url;
                      a.download = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    disabled={!dataForExtraction}
                    style={{
                      padding: '8px 14px',
                      background: '#9b7bb8',
                      border: 'none',
                      borderRadius: 6,
                      color: 'white',
                      cursor: dataForExtraction ? 'pointer' : 'not-allowed',
                      opacity: dataForExtraction ? 1 : 0.5,
                      fontWeight: 500,
                      fontSize: 13
                    }}
                  >
                    <TennisBall size={16} weight="duotone" style={{ marginRight: 4 }} /> Esporta PbP CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
        </main>
      </div>
    </div>
      )}
    </>
  );
}
