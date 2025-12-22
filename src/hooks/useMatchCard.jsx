/**
 * useMatchCard Hook
 * Hook React per caricare match card complete dal nuovo endpoint
 * Usa matchCardService sul backend per assemblare tutti i dati
 */

import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../config';

// Stati del fetch
export const CardFetchState = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

/**
 * Hook per caricare una match card completa
 * @param {string|number} matchId - ID del match
 * @returns {object} - { card, loading, error, refresh }
 */
export function useMatchCard(matchId) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCard = useCallback(async () => {
    if (!matchId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/api/match/${matchId}/card`));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setCard(data);
    } catch (err) {
      console.error('Error fetching match card:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  return {
    card,
    loading,
    error,
    refresh: fetchCard,
    // Helper per accedere ai dati
    match: card?.match || null,
    player1: card?.player1 || null,
    player2: card?.player2 || null,
    h2h: card?.h2h || null,
    statistics: card?.statistics || null,
    momentum: card?.momentum || null,
    pointByPoint: card?.pointByPoint || null,
    odds: card?.odds || null,
    dataQuality: card?.dataQuality || 0,
    dataSources: card?.dataSources || []
  };
}

/**
 * Hook per caricare lista di match cards
 * @param {object} filters - Filtri per la ricerca
 * @returns {object} - { cards, loading, error, refresh, totalCount }
 */
export function useMatchCards(filters = {}) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Costruisci query string dai filtri
      const params = new URLSearchParams();
      
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);
      if (filters.player) params.append('player', filters.player);
      if (filters.tournament) params.append('tournament', filters.tournament);
      if (filters.surface) params.append('surface', filters.surface);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const url = apiUrl(`/api/matches/cards?${params.toString()}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      setCards(data.cards || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      console.error('Error fetching match cards:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters.limit, filters.offset, filters.player, filters.tournament, filters.surface, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return {
    cards,
    loading,
    error,
    refresh: fetchCards,
    totalCount
  };
}

/**
 * Hook per cercare giocatori
 * @param {string} query - Testo di ricerca
 * @returns {object} - { players, loading, error }
 */
export function usePlayerSearch(query) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setPlayers([]);
      return;
    }

    const controller = new AbortController();
    
    const search = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          apiUrl(`/api/search/players?q=${encodeURIComponent(query)}`),
          { signal: controller.signal }
        );
        
        if (response.ok) {
          const data = await response.json();
          setPlayers(data.players || []);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    // Debounce
    const timer = setTimeout(search, 300);
    
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { players, loading, error };
}

/**
 * Hook per caricare dettagli giocatore
 * @param {number} playerId - ID del giocatore
 * @returns {object} - { player, loading, error }
 */
export function usePlayer(playerId) {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!playerId) return;

    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const response = await fetch(apiUrl(`/api/player/${playerId}`));
        
        if (response.ok) {
          const data = await response.json();
          setPlayer(data.player || null);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [playerId]);

  return { player, loading, error };
}

export default useMatchCard;
