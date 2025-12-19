/**
 * useMatchData Hook
 * Hook React per la gestione dati match con polling HTTP
 * Sostituisce useLiveMatch per usare il DB come fonte dati principale
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Stati del fetch
export const FetchState = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  REFRESHING: 'refreshing'
};

// Configurazione di default
const DEFAULT_CONFIG = {
  pollInterval: 10000, // 10 secondi
  autoRefresh: true,
  retryAttempts: 3,
  retryDelay: 2000
};

/**
 * Hook per caricare e aggiornare dati di un match
 * @param {string} eventId - ID dell'evento SofaScore
 * @param {object} options - Opzioni di configurazione
 * @returns {object} - { data, fetchState, error, lastUpdate, refresh, startPolling, stopPolling, isPolling }
 */
export function useMatchData(eventId, options = {}) {
  const {
    pollInterval = DEFAULT_CONFIG.pollInterval,
    autoRefresh = DEFAULT_CONFIG.autoRefresh,
    retryAttempts = DEFAULT_CONFIG.retryAttempts,
    retryDelay = DEFAULT_CONFIG.retryDelay,
    onData = null,
    onError = null,
    onRefresh = null
  } = options;

  const [data, setData] = useState(null);
  const [fetchState, setFetchState] = useState(FetchState.IDLE);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [source, setSource] = useState(null); // 'database' | 'file' | 'sofascore'

  const pollRef = useRef(null);
  const retryCountRef = useRef(0);
  const eventIdRef = useRef(eventId);

  // Aggiorna ref quando eventId cambia
  useEffect(() => {
    eventIdRef.current = eventId;
  }, [eventId]);

  /**
   * Fetch dati dal backend (API ibrida)
   */
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!eventIdRef.current) {
      setError('Missing eventId');
      return null;
    }

    const isRefreshing = data !== null;
    setFetchState(isRefreshing ? FetchState.REFRESHING : FetchState.LOADING);
    setError(null);

    try {
      const url = forceRefresh 
        ? `/api/match/${eventIdRef.current}/refresh`
        : `/api/match/${eventIdRef.current}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const newData = await response.json();
      
      setData(newData);
      setSource(newData.source || 'unknown');
      setLastUpdate(new Date());
      setFetchState(FetchState.SUCCESS);
      retryCountRef.current = 0;

      if (onData) {
        onData(newData);
      }

      if (isRefreshing && onRefresh) {
        onRefresh(newData);
      }

      return newData;
    } catch (err) {
      console.error('Fetch error:', err.message);
      
      // Retry logic
      if (retryCountRef.current < retryAttempts) {
        retryCountRef.current++;
        console.log(`Retry ${retryCountRef.current}/${retryAttempts} in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchData(forceRefresh);
      }

      setError(err.message);
      setFetchState(FetchState.ERROR);

      if (onError) {
        onError(err);
      }

      return null;
    }
  }, [data, retryAttempts, retryDelay, onData, onError, onRefresh]);

  /**
   * Forza refresh dei dati (fetch diretto da SofaScore)
   */
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  /**
   * Avvia polling automatico
   */
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    if (!eventIdRef.current) return;

    console.log(`▶️ Starting polling for ${eventIdRef.current} (interval: ${pollInterval}ms)`);
    setIsPolling(true);

    pollRef.current = setInterval(() => {
      fetchData(false);
    }, pollInterval);
  }, [pollInterval, fetchData]);

  /**
   * Ferma polling
   */
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      console.log(`⏹️ Stopping polling for ${eventIdRef.current}`);
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  /**
   * Track match per monitoraggio automatico dal backend
   */
  const trackMatch = useCallback(async () => {
    if (!eventIdRef.current) return false;

    try {
      const response = await fetch(`/api/track/${eventIdRef.current}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: data?.event?.status?.type || 'unknown',
          startTimestamp: data?.event?.startTimestamp
        })
      });
      const result = await response.json();
      console.log(`📌 Track result:`, result);
      return result.success;
    } catch (err) {
      console.error('Track error:', err.message);
      return false;
    }
  }, [data]);

  /**
   * Untrack match
   */
  const untrackMatch = useCallback(async () => {
    if (!eventIdRef.current) return false;

    try {
      const response = await fetch(`/api/track/${eventIdRef.current}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result.success;
    } catch (err) {
      console.error('Untrack error:', err.message);
      return false;
    }
  }, []);

  // Fetch iniziale quando eventId cambia
  useEffect(() => {
    if (eventId) {
      fetchData(false);
    } else {
      setData(null);
      setSource(null);
      setFetchState(FetchState.IDLE);
    }

    return () => {
      stopPolling();
    };
  }, [eventId]); // Non includere fetchData per evitare loop

  // Auto-start polling se abilitato
  useEffect(() => {
    if (autoRefresh && eventId && data) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoRefresh, eventId, !!data]); // !!data per evitare ri-trigger su ogni cambio data

  // Verifica se il match è live (per decidere polling più frequente)
  const isLive = data?.event?.status?.type === 'inprogress';
  const isFinished = ['finished', 'ended', 'completed'].includes(
    data?.event?.status?.type?.toLowerCase()
  );

  // Se il match è finito, ferma il polling
  useEffect(() => {
    if (isFinished && isPolling) {
      console.log('🏁 Match finished, stopping polling');
      stopPolling();
    }
  }, [isFinished, isPolling, stopPolling]);

  return {
    // Dati
    data,
    event: data?.event || null,
    pointByPoint: data?.pointByPoint || data?.api?.[Object.keys(data?.api || {}).find(k => k.includes('point-by-point'))]?.pointByPoint || [],
    statistics: data?.statistics || data?.api?.[Object.keys(data?.api || {}).find(k => k.includes('statistics'))]?.statistics || [],
    powerRankings: data?.powerRankings || data?.api?.[Object.keys(data?.api || {}).find(k => k.includes('power-rankings'))]?.tennisPowerRankings || [],
    
    // Stato
    fetchState,
    error,
    lastUpdate,
    source,
    isLive,
    isFinished,
    isPolling,
    isLoading: fetchState === FetchState.LOADING,
    isRefreshing: fetchState === FetchState.REFRESHING,
    
    // Azioni
    refresh,
    startPolling,
    stopPolling,
    trackMatch,
    untrackMatch,
    fetchData
  };
}

/**
 * Hook per ottenere la lista dei match dal database
 */
export function useMatchList(options = {}) {
  const { limit = 50, status, autoRefresh = false, refreshInterval = 30000 } = options;
  
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (limit) params.set('limit', limit);
      if (status) params.set('status', status);
      
      const response = await fetch(`/api/db/matches?${params}`);
      if (!response.ok) throw new Error('Failed to fetch matches');
      
      const data = await response.json();
      setMatches(data.matches || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      // Fallback: prova API file-based
      try {
        const fallbackResponse = await fetch('/api/matches');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setMatches(fallbackData.matches || []);
          setError(null);
        }
      } catch (fallbackErr) {
        // Keep original error
      }
    } finally {
      setLoading(false);
    }
  }, [limit, status]);

  useEffect(() => {
    fetchMatches();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMatches, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchMatches, autoRefresh, refreshInterval]);

  return { matches, loading, error, refresh: fetchMatches };
}

/**
 * Hook per gestire il tracking delle partite
 */
export function useTrackedMatches() {
  const [tracked, setTracked] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTracked = useCallback(async () => {
    try {
      const response = await fetch('/api/tracked');
      if (response.ok) {
        const data = await response.json();
        setTracked(data.matches || []);
      }
    } catch (err) {
      console.error('Error fetching tracked:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTracked();
    const interval = setInterval(fetchTracked, 10000);
    return () => clearInterval(interval);
  }, [fetchTracked]);

  return { tracked, loading, refresh: fetchTracked };
}

export default useMatchData;
