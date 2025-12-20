import fetch from 'node-fetch';

// Cache per i risultati
const scrapeCache = new Map();

/**
 * Estrai l'eventId da un URL SofaScore
 */
export function extractEventId(url) {
  // Try hash format: #id:12345 or #id=12345
  const hashMatch = url.match(/#id[=:](\d+)/i);
  if (hashMatch) return hashMatch[1];
  
  // Try path format: /event/12345
  const pathMatch = url.match(/\/event\/(\d+)/);
  if (pathMatch) return pathMatch[1];
  
  // Try generic number at end
  const endMatch = url.match(/(\d{6,})/);
  if (endMatch) return endMatch[1];
  
  return null;
}

/**
 * Fetch diretto dall'API SofaScore (funziona da IP residenziali)
 */
export async function directFetch(url) {
  // Headers che simulano una richiesta da browser
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.sofascore.com/',
    'Origin': 'https://www.sofascore.com',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };
  
  try {
    const response = await fetch(url, { 
      headers,
      timeout: 30000
    });
    
    if (!response.ok) {
      return { 
        error: { 
          code: response.status, 
          message: response.statusText 
        } 
      };
    }
    
    const data = await response.json();
    return data;
  } catch (err) {
    return { error: { code: 0, message: err.message } };
  }
}

/**
 * Genera un ID univoco per lo scrape
 */
function generateId() {
  return 'local_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Scrape di un evento SofaScore completo
 */
export async function scrapeEvent(url) {
  const id = generateId();
  const eventId = extractEventId(url);
  
  if (!eventId) {
    scrapeCache.set(id, { 
      status: 'error', 
      error: 'Impossibile estrarre eventId dall\'URL' 
    });
    return id;
  }
  
  // Inizializza lo stato
  scrapeCache.set(id, { status: 'running', eventId });
  
  // Esegui lo scraping in background
  (async () => {
    try {
      const result = { api: {}, mapping: null };
      
      // Lista degli endpoint da chiamare - SCRAPE COMPLETO
      const endpoints = [
        `https://www.sofascore.com/api/v1/event/${eventId}`,
        `https://www.sofascore.com/api/v1/event/${eventId}/statistics`,
        `https://www.sofascore.com/api/v1/event/${eventId}/lineups`,
        `https://www.sofascore.com/api/v1/event/${eventId}/odds/1/all`,
        `https://www.sofascore.com/api/v1/event/${eventId}/h2h`,
        // ESSENZIALI per tennis:
        `https://www.sofascore.com/api/v1/event/${eventId}/point-by-point`,
        `https://www.sofascore.com/api/v1/event/${eventId}/tennis-power-rankings`
      ];
      
      // Chiama tutti gli endpoint
      for (const endpoint of endpoints) {
        console.log(`📡 Fetching: ${endpoint}`);
        const data = await directFetch(endpoint);
        result.api[endpoint] = data;
        
        // Estrai mapping dall'evento principale
        if (endpoint.endsWith(`/event/${eventId}`) && data?.event) {
          result.mapping = {
            event: { id: data.event.id },
            home: data.event.homeTeam,
            away: data.event.awayTeam,
            tournament: data.event.tournament
          };
        }
        
        // Pausa tra le richieste per non farsi bloccare
        await new Promise(r => setTimeout(r, 300));
      }
      
      scrapeCache.set(id, { status: 'completed', data: result, eventId });
      console.log(`✅ Scrape completato: ${id}`);
      
    } catch (err) {
      console.error(`❌ Scrape error: ${err.message}`);
      scrapeCache.set(id, { status: 'error', error: err.message, eventId });
    }
  })();
  
  return id;
}

/**
 * Ottieni lo stato di uno scrape
 */
export function getStatus(id) {
  const entry = scrapeCache.get(id);
  return entry?.status || 'unknown';
}

/**
 * Ottieni i dati di uno scrape completato
 */
export function getData(id) {
  const entry = scrapeCache.get(id);
  return entry?.data || null;
}

/**
 * Ottieni l'errore di uno scrape fallito
 */
export function getError(id) {
  const entry = scrapeCache.get(id);
  return entry?.error || null;
}

/**
 * Ottieni l'eventId di uno scrape
 */
export function getEventId(id) {
  const entry = scrapeCache.get(id);
  return entry?.eventId || null;
}
