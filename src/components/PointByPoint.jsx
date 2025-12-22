import React, { useEffect, useState, useRef, useCallback } from 'react';
import SetBlock from './SetBlock';
import '../styles/pointbypoint.css';
import { extractMatchSummary, fetchPointByPoint, fetchPowerRankings, extractEventId } from '../utils';

export default function PointByPoint({ 
  data: propData = null, 
  eventId: propEventId = null,
  autoRefresh = false,
  refreshInterval = 5000,
  onHasData = () => {},
  liveMode = false
}) {
  const [data, setData] = useState(propData);
  const [livePointByPoint, setLivePointByPoint] = useState(null);
  const [livePowerRankings, setLivePowerRankings] = useState(null);
  const [loading, setLoading] = useState(!propData);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  // Estrai eventId dai dati se non fornito
  const eventId = propEventId || extractEventId(propData);

  // Carica dati live dall'API
  const loadLiveData = useCallback(async () => {
    if (!eventId) return;
    
    try {
      const [pbpData, prData] = await Promise.all([
        fetchPointByPoint(eventId),
        fetchPowerRankings(eventId)
      ]);
      
      if (pbpData && pbpData.length > 0) {
        setLivePointByPoint(pbpData);
      }
      if (prData && prData.length > 0) {
        setLivePowerRankings(prData);
      }
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Error loading live data:', e);
    }
  }, [eventId]);

  async function loadFallback() {
    try {
      const res = await fetch('/evento-tennis-completo.json');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (propData) {
      setData(propData);
      setLoading(false);
      // Se abbiamo un eventId, carica anche i dati live
      if (eventId) {
        loadLiveData();
      }
      return;
    }
    loadFallback();
  }, [propData, eventId, loadLiveData]);

  // Auto-refresh per dati live
  useEffect(() => {
    if (autoRefresh && eventId) {
      loadLiveData(); // Carica subito
      intervalRef.current = setInterval(loadLiveData, refreshInterval);
      return () => clearInterval(intervalRef.current);
    }
  }, [autoRefresh, eventId, refreshInterval, loadLiveData]);

  useEffect(() => {
    if (loading) {
      onHasData(false);
      return;
    }
    if (error) {
      onHasData(false);
      return;
    }
    const summary = data ? extractMatchSummary(data) : null;
    const pbpEntry = livePointByPoint || (
      summary && summary.pointByPoint
        ? summary.pointByPoint
        : data &&
          (Array.isArray(data.pointByPoint)
            ? data.pointByPoint
            : Object.values(data).find((x) => x && Array.isArray(x.pointByPoint))?.pointByPoint)
    );
    const has = Boolean(
      (summary &&
        ((summary.currentPoint && (summary.currentPoint.home || summary.currentPoint.away)) ||
          (summary.sets &&
            ((summary.sets.home && summary.sets.home.length) ||
              (summary.sets.away && summary.sets.away.length))))) ||
        (pbpEntry && pbpEntry.length)
    );
    onHasData(Boolean(has));
  }, [data, livePointByPoint, loading, error, onHasData]);

  if (loading) {
    return (
      <div className="pbp-root">
        <div className="pbp-loading">
          <span>⏳ Caricamento dati point-by-point...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="pbp-root">
        <div className="pbp-error">
          <span>❌ Errore nel caricamento: {error.message}</span>
        </div>
      </div>
    );
  }

  // prefer structured summary when available
  const summary = data ? extractMatchSummary(data) : null;

  // find pointByPoint entry - prefer live data
  const pbpEntry = livePointByPoint || (
    summary && summary.pointByPoint
      ? summary.pointByPoint
      : data &&
        (Array.isArray(data.pointByPoint)
          ? data.pointByPoint
          : Object.values(data).find((x) => x && Array.isArray(x.pointByPoint))?.pointByPoint)
  );

  // tennisPowerRankings - prefer live data
  const tennisPower = livePowerRankings || (
    data &&
    (Array.isArray(data.tennisPowerRankings)
      ? data.tennisPowerRankings
      : Object.values(data).find((x) => x && Array.isArray(x.tennisPowerRankings))
          ?.tennisPowerRankings)
  );

  function getValueForSetGame(setNum, gameNum) {
    if (!tennisPower) return null;
    const found = tennisPower.find((item) => item.set === setNum && item.game === gameNum);
    return found ? found.value : null;
  }

  return (
    <div className="pbp-root">
      {/* Legenda colori game */}
      <div className="pbp-legend">
        <span className="pbp-legend-title">Legenda:</span>
        <div className="pbp-legend-items">
          <div className="pbp-legend-item">
            <span className="pbp-legend-color legend-home-serve"></span>
            <span>Servizio Home</span>
          </div>
          <div className="pbp-legend-item">
            <span className="pbp-legend-color legend-away-serve"></span>
            <span>Servizio Away</span>
          </div>
          <div className="pbp-legend-item">
            <span className="pbp-legend-color legend-break"></span>
            <span>Break</span>
          </div>
          <div className="pbp-legend-item">
            <span className="pbp-legend-color legend-tiebreak"></span>
            <span>Tiebreak</span>
          </div>
        </div>
      </div>

      {pbpEntry && pbpEntry.length > 0 ? (
        pbpEntry.map((s, index) => (
          <SetBlock 
            key={s.set} 
            set={s} 
            getValueForSetGame={getValueForSetGame}
            defaultExpanded={index === pbpEntry.length - 1}
          />
        ))
      ) : (
        <div className="pbp-no-data" style={liveMode ? { background: '#fff6f6', border: '1px solid #f5cfcf', color: '#c97676', padding: '12px' } : {}}>
          <div className="pbp-no-data-icon">🎾</div>
          <div>Nessun dato point-by-point disponibile</div>
          <div style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>
            {liveMode ? 'In Live Mode i dati point-by-point dovrebbero arrivare in tempo reale; al momento sono assenti.' : 'I dati appariranno quando il match sarà in corso'}
          </div>
        </div>
      )}
    </div>
  );
}
