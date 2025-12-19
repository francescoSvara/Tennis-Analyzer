/**
 * useLiveMatch Hook
 * Hook React per la connessione WebSocket ai match live
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { WS_URL } from '../config';

// Stati della connessione
export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  SUBSCRIBED: 'subscribed',
  ERROR: 'error'
};

/**
 * Hook per sottoscriversi a un match live via WebSocket
 * @param {string} eventId - ID dell'evento SofaScore
 * @param {object} options - Opzioni di configurazione
 * @returns {object} - { data, connectionState, error, lastUpdate, subscribe, unsubscribe }
 */
export function useLiveMatch(eventId, options = {}) {
  const {
    autoConnect = true,
    serverUrl = WS_URL || window.location.origin,
    onData = null,
    onError = null,
    onConnectionChange = null
  } = options;

  const [data, setData] = useState(null);
  const [connectionState, setConnectionState] = useState(ConnectionState.DISCONNECTED);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const socketRef = useRef(null);
  const eventIdRef = useRef(eventId);

  // Aggiorna ref quando eventId cambia
  useEffect(() => {
    eventIdRef.current = eventId;
  }, [eventId]);

  // Funzione per aggiornare lo stato della connessione
  const updateConnectionState = useCallback((state) => {
    setConnectionState(state);
    if (onConnectionChange) {
      onConnectionChange(state);
    }
  }, [onConnectionChange]);

  // Connetti al WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    updateConnectionState(ConnectionState.CONNECTING);
    setError(null);

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      updateConnectionState(ConnectionState.CONNECTED);
      
      // Auto-subscribe se abbiamo un eventId
      if (eventIdRef.current) {
        socket.emit('subscribe', eventIdRef.current);
      }
    });

    socket.on('subscribed', ({ eventId: subscribedId, status }) => {
      console.log(`📺 Subscribed to event ${subscribedId}`);
      updateConnectionState(ConnectionState.SUBSCRIBED);
    });

    socket.on('data', (newData) => {
      console.log('📊 Received live data');
      setData(newData);
      setLastUpdate(new Date());
      setError(null);
      
      if (onData) {
        onData(newData);
      }
    });

    socket.on('error', (err) => {
      console.error('❌ WebSocket error:', err);
      setError(err.message || 'Connection error');
      updateConnectionState(ConnectionState.ERROR);
      
      if (onError) {
        onError(err);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('📴 WebSocket disconnected:', reason);
      updateConnectionState(ConnectionState.DISCONNECTED);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Connection error:', err.message);
      setError(`Connection failed: ${err.message}`);
      updateConnectionState(ConnectionState.ERROR);
    });

    socketRef.current = socket;
  }, [serverUrl, updateConnectionState, onData, onError]);

  // Disconnetti dal WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    updateConnectionState(ConnectionState.DISCONNECTED);
  }, [updateConnectionState]);

  // Sottoscrivi a un evento
  const subscribe = useCallback((newEventId) => {
    if (!socketRef.current?.connected) {
      console.warn('Socket not connected, connecting first...');
      connect();
      // Il subscribe avverrà automaticamente dopo la connessione
      eventIdRef.current = newEventId;
      return;
    }

    // Disiscriviti dall'evento precedente se diverso
    if (eventIdRef.current && eventIdRef.current !== newEventId) {
      socketRef.current.emit('unsubscribe', eventIdRef.current);
    }

    eventIdRef.current = newEventId;
    socketRef.current.emit('subscribe', newEventId);
    updateConnectionState(ConnectionState.CONNECTING);
  }, [connect, updateConnectionState]);

  // Disiscriviti da un evento
  const unsubscribe = useCallback(() => {
    if (socketRef.current?.connected && eventIdRef.current) {
      socketRef.current.emit('unsubscribe', eventIdRef.current);
      eventIdRef.current = null;
      setData(null);
      updateConnectionState(ConnectionState.CONNECTED);
    }
  }, [updateConnectionState]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && eventId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // Solo al mount/unmount

  // Gestisci cambio eventId
  useEffect(() => {
    if (eventId && socketRef.current?.connected) {
      subscribe(eventId);
    }
  }, [eventId, subscribe]);

  return {
    data,
    connectionState,
    error,
    lastUpdate,
    isConnected: connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.SUBSCRIBED,
    isSubscribed: connectionState === ConnectionState.SUBSCRIBED,
    connect,
    disconnect,
    subscribe,
    unsubscribe
  };
}

/**
 * Componente indicatore stato connessione
 */
export function ConnectionIndicator({ state, className = '' }) {
  const stateConfig = {
    [ConnectionState.DISCONNECTED]: { color: '#8a9bab', icon: '⚪', label: 'Disconnesso' },
    [ConnectionState.CONNECTING]: { color: '#d4a84b', icon: '🟡', label: 'Connessione...' },
    [ConnectionState.CONNECTED]: { color: '#5b8fb9', icon: '🔵', label: 'Connesso' },
    [ConnectionState.SUBSCRIBED]: { color: '#6aba7f', icon: '🟢', label: 'Live' },
    [ConnectionState.ERROR]: { color: '#c97676', icon: '🔴', label: 'Errore' }
  };

  const config = stateConfig[state] || stateConfig[ConnectionState.DISCONNECTED];

  return (
    <span 
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500,
        background: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}30`
      }}
    >
      <span style={{ 
        width: '8px', 
        height: '8px', 
        borderRadius: '50%', 
        background: config.color,
        animation: state === ConnectionState.SUBSCRIBED ? 'pulse 2s infinite' : 'none'
      }} />
      {config.label}
    </span>
  );
}

export default useLiveMatch;
