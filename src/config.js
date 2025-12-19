/**
 * Configurazione ambiente
 * In produzione (Vercel) usa VITE_API_URL, in dev usa proxy locale
 */

// API Base URL - in produzione punta a Railway, in dev usa il proxy Vite
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Supabase URL (per riferimento, il backend usa le sue env vars)
export const SUPABASE_URL = 'https://lhffxdsnpgteoeudeiwd.supabase.co';

/**
 * Helper per costruire URL API
 * @param {string} path - percorso API (es: '/api/matches')
 * @returns {string} URL completo
 */
export function apiUrl(path) {
  // Se path inizia già con http, restituiscilo così com'è
  if (path.startsWith('http')) {
    return path;
  }
  
  // Assicurati che path inizi con /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // In dev (API_BASE_URL vuoto) usa percorso relativo per il proxy Vite
  // In prod usa API_BASE_URL (Railway URL)
  return `${API_BASE_URL}${normalizedPath}`;
}

// Configurazione ambiente
export const IS_PRODUCTION = import.meta.env.PROD;
export const IS_DEVELOPMENT = import.meta.env.DEV;

// WebSocket URL (per Socket.IO)
export const WS_URL = import.meta.env.VITE_WS_URL || API_BASE_URL || 'http://localhost:3001';

// URLs di produzione (per riferimento)
export const PRODUCTION_URLS = {
  backend: 'https://tennis-analyzer-production.up.railway.app',
  frontend: 'https://tennis-analyzer.vercel.app',
  supabase: 'https://lhffxdsnpgteoeudeiwd.supabase.co'
};

export default {
  API_BASE_URL,
  apiUrl,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  WS_URL,
  SUPABASE_URL,
  PRODUCTION_URLS
};
