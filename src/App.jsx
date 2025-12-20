import React, { useState, useEffect, useRef, useCallback } from 'react';
import PointByPoint from './components/PointByPoint';
import PointByPointWidget from './components/PointByPointWidget';
import Statistics from './components/Statistics';
import MomentumTab from './components/MomentumTab';
import QuotesTab from './components/QuotesTab';
import MatchHeader from './components/MatchHeader';
import SavedScrapes from './components/SavedScrapes';
import ErrorBoundary from './components/ErrorBoundary';
import IndicatorsChart from './components/IndicatorsChart';
import MomentumChart from './components/MomentumChart';
import HomePage from './components/HomePage';
import { apiUrl } from './config';

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
    strong: '🟢',
    medium: '🟡',
    weak: '⚪',
    none: '⏳'
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
                {signalIcons[analysis?.signal] || '⏳'} {(analysis?.signal || 'none').toUpperCase()}
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
              <div>🏆 1° set: <strong style={{ color: '#e4e6eb' }}>{analysis.details.firstSetWinnerName}</strong></div>
            )}
            {analysis.details.secondSetScore && (
              <div>📋 2° set: <strong style={{ color: '#e4e6eb' }}>{analysis.details.secondSetScore}</strong></div>
            )}
            {analysis.details.serverName && (
              <div>🎾 Servizio: <strong style={{ color: '#e4e6eb' }}>{analysis.details.serverName}</strong></div>
            )}
            {analysis.details.currentGameScore && (
              <div>⚡ Game: <strong style={{ color: '#e4e6eb' }}>{analysis.details.currentGameScore}</strong></div>
            )}
            {analysis.details.favorito && (
              <div>⭐ Favorito: <strong style={{ color: '#e4e6eb' }}>{analysis.details.favorito.name}</strong> (#{analysis.details.favorito.ranking})</div>
            )}
            {analysis.details.homeBreaks !== undefined && (
              <div>💥 Break: {analysis.details.homeName} {analysis.details.homeBreaks} - {analysis.details.awayBreaks} {analysis.details.awayName}</div>
            )}
          </div>
        )}
      </div>
      
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
          💡 {analysis.recommendation}
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
          ℹ️ {infoText}
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
        
        // Combina i dati
        normalizedData = {
          event: eventObj,
          pointByPoint: rawJson.pointByPoint || data.pointByPoint || [],
          statistics: rawJson.statistics || data.statistics || [],
          tennisPowerRankings: rawJson.tennisPowerRankings || data.powerRankings || [],
          scores: data.scores || [],
          ...data
        };
        console.log('💾 Dati normalizzati dal DB:', normalizedData);
        setRawData(normalizedData);
        setScrapeData(normalizeApiResponse(normalizedData));
      } else if (data.source === 'file') {
        // Dati da file
        console.log('📄 Dati da file:', data);
        setRawData(data);
        setScrapeData(normalizeApiResponse(data));
      } else {
        // Dati da SofaScore
        console.log('🌐 Dati da SofaScore:', data);
        setRawData(data);
        setScrapeData(normalizeApiResponse(data));
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
          const normalizedData = {
            event: refreshData,
            pointByPoint: refreshData.pointByPoint || [],
            statistics: refreshData.statistics || [],
            powerRankings: refreshData.powerRankings || [],
            ...refreshData
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
      if (type === 'inprogress') return { icon: '🔴', className: 'inprogress', label: status?.description || 'Live' };
      if (type === 'finished') return { icon: '🏁', className: 'finished', label: status?.description || 'Terminato' };
      if (type === 'notstarted') return { icon: '⏳', className: 'upcoming', label: status?.description || 'Pre-match' };
      if (type === 'paused') return { icon: '⏸', className: 'paused', label: status?.description || 'Sospeso' };

      // Fallback by description keywords (Italian/English)
      if (/piogg|rain/.test(desc)) return { icon: '☔', className: 'paused', label: status?.description || 'Sospeso (pioggia)' };
      if (/medical|medical timeout|timeout medical|medicaltimeout/.test(desc)) return { icon: '⚕️', className: 'medical', label: status?.description || 'Medical timeout' };
      if (/paused|sospeso|pause/.test(desc)) return { icon: '⏸', className: 'paused', label: status?.description || 'Sospeso' };
      if (/live|in progress|inprogress/.test(desc)) return { icon: '🔴', className: 'inprogress', label: status?.description || 'Live' };

      // Default
      return { icon: '○', className: 'unknown', label: status?.description || 'Stato sconosciuto' };
    } catch (e) {
      // Fallback to unknown on any unexpected error
      return { icon: '○', className: 'unknown', label: 'Stato sconosciuto' };
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
              const normalizedData = {
                event: data,
                pointByPoint: data.pointByPoint || [],
                statistics: data.statistics || [],
                powerRankings: data.powerRankings || [],
                ...data
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

  // Sidebar navigation items
  const sidebarTabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'quotes', label: 'Quote', icon: '💰' },
    { id: 'pbp', label: 'Point by Point', icon: '🎾' },
    { id: 'stats', label: 'Statistiche', icon: '📈' },
    { id: 'momentum', label: 'Momentum', icon: '⚡' },
    { id: 'raw', label: 'Raw JSON', icon: '🔧' },
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
        />
      )}

      {/* Match Detail View */}
      {currentView === 'match-detail' && (
    <div className="app-layout">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="top-bar-left">
          <button className="back-btn" onClick={handleBackToHome}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Indietro</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="main-layout">
        {/* Sidebar Navigation */}
        {dataForExtraction && (
          <aside className="sidebar">
            <nav className="sidebar-nav">
              {sidebarTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="sidebar-tab-icon">{tab.icon}</span>
                  <span className="sidebar-tab-label">{tab.label}</span>
                </button>
              ))}
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
                  const powerRankings = dataForExtraction ? deepFindAll(dataForExtraction, 'tennisPowerRankings', 5).flat().filter(Boolean) : [];
                  return (
                    <>
                      <div style={{ marginBottom: 32 }}>
                        <IndicatorsChart 
                          powerRankings={powerRankings} 
                          homeName={eventInfo?.home?.name || 'Home'}
                          awayName={eventInfo?.away?.name || 'Away'}
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
                        🎯 Strategie di Base Tennis
                      </h2>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        
                        <StrategyCard 
                          title="Lay the Winner"
                          icon="🏆"
                          analysis={analyzeLayTheWinner(dataForExtraction)}
                          infoText="Banca chi vince il 1° set aspettando recupero nel 2°"
                          momentumData={powerRankings}
                          dataKey={dataKey}
                        />

                        <StrategyCard 
                          title="Banca Servizio"
                          icon="🎾"
                          analysis={analyzeBancaServizio(dataForExtraction)}
                          infoText="Banca chi serve quando sotto pressione (0-30, 15-40, ecc.)"
                          momentumData={powerRankings}
                          dataKey={dataKey}
                        />

                        <StrategyCard 
                          title="Super Break"
                          icon="⚡"
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
                    const powerRankings = dataForExtraction ? deepFindAll(dataForExtraction, 'tennisPowerRankings', 5).flat().filter(Boolean) : [];
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
                    📋 Copia JSON
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
                    📊 Esporta Stats CSV
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
                    🎾 Esporta PbP CSV
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
