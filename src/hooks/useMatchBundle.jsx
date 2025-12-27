/**
 * useMatchBundle Hook
 * 
 * Hook unificato per consumo MatchBundle come da FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md
 * 
 * Principi:
 * - Il frontend non interpreta il match
 * - Il frontend visualizza uno stato già interpretato
 * - Una chiamata iniziale, un solo schema dati
 * - Live update a patch (non rifetch completo)
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION_V2.md
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { apiUrl, WS_URL, IS_DEVELOPMENT } from '../config';

// Stati del fetch
export const BundleState = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  REFRESHING: 'refreshing',
  LIVE: 'live'
};

// Configurazione di default
const DEFAULT_CONFIG = {
  pollInterval: 10000,        // 10 secondi per polling fallback
  wsReconnectDelay: 3000,     // 3 secondi per riconnessione WS
  cacheEnabled: true,
  cacheTtlMs: 30000,          // 30 secondi TTL cache
  autoConnect: true,
};

/**
 * Hook per caricare e consumare MatchBundle
 * 
 * @param {string} matchId - ID del match
 * @param {object} options - Opzioni di configurazione
 * @returns {object} - { bundle, state, error, isLive, tabs, header, dataQuality, actions }
 */
export function useMatchBundle(matchId, options = {}) {
  const {
    pollInterval = DEFAULT_CONFIG.pollInterval,
    cacheEnabled = DEFAULT_CONFIG.cacheEnabled,
    cacheTtlMs = DEFAULT_CONFIG.cacheTtlMs,
    autoConnect = DEFAULT_CONFIG.autoConnect,
    onBundleUpdate = null,
    onError = null,
    onLiveEvent = null,
  } = options;

  // State
  const [bundle, setBundle] = useState(null);
  const [state, setState] = useState(BundleState.IDLE);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Refs
  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const cacheRef = useRef(new Map());
  const matchIdRef = useRef(matchId);

  // Update ref quando matchId cambia
  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  /**
   * Fetch iniziale del bundle completo
   */
  const fetchBundle = useCallback(async (forceRefresh = false) => {
    if (!matchIdRef.current) {
      setError('Missing matchId');
      return null;
    }

    const cacheKey = `bundle-${matchIdRef.current}`;
    
    // Check cache (se non forceRefresh)
    if (cacheEnabled && !forceRefresh) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < cacheTtlMs) {
        setBundle(cached.data);
        setState(BundleState.SUCCESS);
        return cached.data;
      }
    }

    const isRefreshing = bundle !== null;
    setState(isRefreshing ? BundleState.REFRESHING : BundleState.LOADING);
    setError(null);

    try {
      // Endpoint unico per bundle completo
      const url = apiUrl(`/api/match/${matchIdRef.current}/bundle`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      // Salva in cache
      if (cacheEnabled) {
        cacheRef.current.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      setBundle(data);
      setLastUpdate(new Date());
      setState(BundleState.SUCCESS);

      if (onBundleUpdate) {
        onBundleUpdate(data);
      }

      return data;
    } catch (err) {
      setError(err.message);
      setState(BundleState.ERROR);
      
      if (onError) {
        onError(err);
      }
      
      return null;
    }
  }, [bundle, cacheEnabled, cacheTtlMs, onBundleUpdate, onError]);

  /**
   * Applica patch incrementale al bundle
   */
  const applyPatch = useCallback((patch) => {
    if (!patch || !bundle) return;

    setBundle(prevBundle => {
      const newBundle = { ...prevBundle };

      // Applica patch per sezione
      if (patch.header) {
        newBundle.header = { ...newBundle.header, ...patch.header };
      }
      if (patch.tabs) {
        newBundle.tabs = { ...newBundle.tabs };
        Object.keys(patch.tabs).forEach(tabKey => {
          newBundle.tabs[tabKey] = { 
            ...newBundle.tabs[tabKey], 
            ...patch.tabs[tabKey] 
          };
        });
      }
      if (patch.dataQuality) {
        newBundle.dataQuality = { ...newBundle.dataQuality, ...patch.dataQuality };
      }

      return newBundle;
    });

    setLastUpdate(new Date());

    if (onLiveEvent) {
      onLiveEvent(patch);
    }
  }, [bundle, onLiveEvent]);

  /**
   * Avvia polling (fallback quando WS non disponibile)
   * FILOSOFIA: Polling SOLO per match live, MAI per match finiti
   */
  const startPolling = useCallback(() => {
    // NON avviare polling se già attivo
    if (pollRef.current) return;
    
    // FILOSOFIA: NON fare polling per match finiti
    // Controlla lo status dal bundle corrente
    const matchStatus = bundle?.header?.match?.status;
    const isFinished = matchStatus === 'finished' || matchStatus === 'ended' || matchStatus === 'completed';
    
    if (isFinished) {
      console.log('[MatchBundle] Match finished, no polling needed');
      return;
    }

    pollRef.current = setInterval(() => {
      fetchBundle(true);
    }, pollInterval);
  }, [fetchBundle, pollInterval, bundle]);

  /**
   * Ferma polling
   */
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  /**
   * Disconnetti WebSocket
   */
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /**
   * Connessione WebSocket per live updates
   * FILOSOFIA: WebSocket SOLO per match live, MAI per match finiti
   */
  const connectWebSocket = useCallback(() => {
    if (!matchIdRef.current) return;
    
    // FILOSOFIA: NON connettersi a WS per match finiti
    // Il bundle ha già tutti i dati necessari
    const matchStatus = bundle?.header?.match?.status;
    const isFinished = matchStatus === 'finished' || matchStatus === 'ended' || matchStatus === 'completed';
    
    if (isFinished) {
      console.log('[MatchBundle] Match finished, no WebSocket needed');
      return;
    }

    // Costruisci URL WebSocket usando WS_URL da config
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Usa WS_URL da config (già include fallback appropriato)
    let wsHost;
    try {
      // WS_URL da config include già il default corretto per dev/prod
      const wsBase = WS_URL;
      if (wsBase && wsBase.startsWith('http')) {
        wsHost = new URL(wsBase).host;
      } else {
        // Fallback: usa window.location.host (funziona in prod)
        wsHost = window.location.host;
      }
    } catch {
      // Fallback sicuro
      wsHost = window.location.host;
    }
    
    const wsUrl = `${wsProtocol}//${wsHost}/ws/match/${matchIdRef.current}`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log(`[MatchBundle] WS connected for match ${matchIdRef.current}`);
        setIsLive(true);
        setState(BundleState.LIVE);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const patch = JSON.parse(event.data);
          applyPatch(patch);
        } catch (err) {
          console.warn('[MatchBundle] Failed to parse WS message:', err);
        }
      };

      wsRef.current.onclose = () => {
        console.log('[MatchBundle] WS disconnected');
        setIsLive(false);
        
        // Fallback a polling SOLO se match non finito
        if (matchIdRef.current) {
          startPolling();
        }
      };

      wsRef.current.onerror = (err) => {
        console.warn('[MatchBundle] WS error:', err);
      };
    } catch (err) {
      console.warn('[MatchBundle] WS connection failed:', err);
      // Fallback a polling SOLO se match non finito
      startPolling();
    }
  }, [applyPatch, bundle, startPolling]);

  /**
   * Refresh manuale
   */
  const refresh = useCallback(() => {
    return fetchBundle(true);
  }, [fetchBundle]);

  /**
   * Invalidate cache
   */
  const invalidateCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // Effect: fetch iniziale quando matchId cambia
  // FILOSOFIA: UNA sola fetch per match finiti, WS/polling SOLO per match live
  useEffect(() => {
    if (matchId) {
      // Fetch iniziale
      fetchBundle().then((data) => {
        if (!data) return;
        
        // FILOSOFIA: Controlla se il match è finito
        const matchStatus = data?.header?.match?.status;
        const isFinished = matchStatus === 'finished' || matchStatus === 'ended' || matchStatus === 'completed';
        
        if (isFinished) {
          // Match finito: NON serve WS né polling
          console.log('[MatchBundle] Match finished, single fetch completed');
          return;
        }
        
        // Match live: tenta connessione WS se autoConnect
        if (autoConnect) {
          connectWebSocket();
        }
      });
    }

    return () => {
      disconnectWebSocket();
      stopPolling();
    };
  }, [matchId]);

  // Cleanup su unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
      stopPolling();
    };
  }, [disconnectWebSocket, stopPolling]);

  // Memoized selectors per le tabs
  const tabs = useMemo(() => bundle?.tabs || {}, [bundle]);
  const header = useMemo(() => bundle?.header || null, [bundle]);
  const dataQuality = useMemo(() => bundle?.dataQuality || {}, [bundle]);
  // DEEP-006: Esporre meta object dal bundle (FILOSOFIA_LINEAGE_VERSIONING compliance)
  const meta = useMemo(() => bundle?.meta || null, [bundle]);

  // Actions esposte
  const actions = useMemo(() => ({
    refresh,
    invalidateCache,
    connectWebSocket,
    disconnectWebSocket,
    startPolling,
    stopPolling,
  }), [refresh, invalidateCache, connectWebSocket, disconnectWebSocket, startPolling, stopPolling]);

  return {
    // Data
    bundle,
    tabs,
    header,
    dataQuality,
    // DEEP-006: Esporre meta (versions, source, as_of_time)
    meta,
    
    // State
    state,
    error,
    isLive,
    lastUpdate,
    
    // Loading states
    isLoading: state === BundleState.LOADING,
    isRefreshing: state === BundleState.REFRESHING,
    isError: state === BundleState.ERROR,
    isSuccess: state === BundleState.SUCCESS || state === BundleState.LIVE,
    
    // Actions
    actions,
  };
}

/**
 * Hook per selezionare una singola tab dal bundle
 * Utile per componenti che usano solo una tab specifica
 * 
 * @param {object} bundle - Bundle dal useMatchBundle
 * @param {string} tabKey - Nome della tab (overview, strategies, odds, etc.)
 */
export function useTabData(bundle, tabKey) {
  return useMemo(() => {
    if (!bundle?.tabs) return null;
    return bundle.tabs[tabKey] || null;
  }, [bundle, tabKey]);
}

/**
 * Hook per gli header data
 */
export function useHeaderData(bundle) {
  return useMemo(() => bundle?.header || null, [bundle]);
}

/**
 * Hook per data quality
 */
export function useDataQuality(bundle) {
  return useMemo(() => bundle?.dataQuality || {}, [bundle]);
}

export default useMatchBundle;
