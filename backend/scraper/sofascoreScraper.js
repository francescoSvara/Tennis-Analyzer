const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// Database imports
let matchRepository = null;
try {
  matchRepository = require('../db/matchRepository');
} catch (e) {
  console.warn('⚠️ Database module not loaded - will save to files only');
}

const jobs = {}; // in-memory store: { [id]: { status, data } }

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function ensureDir(p) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch (e) {}
}

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
ensureDir(DATA_DIR);
ensureDir(path.join(DATA_DIR, 'scrapes'));
ensureDir(path.join(DATA_DIR, 'mappings'));

function extractMatchIdFromUrl(url) {
  try {
    const u = new URL(url);
    // SofaScore URLs typically like /event/<slug> or /match/<id>
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch (e) {
    return null;
  }
}

/**
 * Extract numeric event ID from URL or hash
 * Supports formats:
 * - #id:15108295
 * - /event/15108295
 * - URL with eventId in path
 */
function extractEventIdFromUrl(url) {
  try {
    const u = new URL(url);
    
    // Check hash for #id:XXXXX format
    if (u.hash) {
      const idMatch = u.hash.match(/id[=:](\d+)/i);
      if (idMatch) return idMatch[1];
    }
    
    // Check for event ID in path like /event/12345
    const pathMatch = u.pathname.match(/\/event\/(\d+)/);
    if (pathMatch) return pathMatch[1];
    
    // Try to find any numeric ID at the end of the path
    const parts = u.pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) return lastPart;
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Fetch all matches from a tournament (detected matches)
 * Returns array of simplified match objects
 */
async function fetchTournamentMatches(tournamentId, seasonId, currentEventId) {
  if (!tournamentId) return [];
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://www.sofascore.com/'
  };
  
  const detectedMatches = [];
  const seenIds = new Set([String(currentEventId)]);
  
  // Try to fetch upcoming and past events
  const endpoints = [];
  
  if (seasonId) {
    endpoints.push(
      `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/events/last/0`,
      `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/events/next/0`
    );
  } else {
    // Try current year as season
    const year = new Date().getFullYear();
    endpoints.push(
      `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${year}/events/last/0`,
      `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${year}/events/next/0`
    );
  }
  
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers, timeout: 10000 });
      if (res.ok) {
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          for (const event of data.events) {
            if (event.id && !seenIds.has(String(event.id))) {
              seenIds.add(String(event.id));
              detectedMatches.push({
                eventId: event.id,
                slug: event.slug,
                sport: event.tournament?.category?.sport?.slug || 'tennis',
                tournament: event.tournament?.uniqueTournament?.name || event.tournament?.name || '',
                tournamentId: event.tournament?.uniqueTournament?.id || tournamentId,
                category: event.tournament?.category?.name || '',
                round: event.roundInfo?.name || event.roundInfo?.round || null,
                homeTeam: {
                  id: event.homeTeam?.id,
                  name: event.homeTeam?.name || '',
                  shortName: event.homeTeam?.shortName || '',
                  country: event.homeTeam?.country?.alpha2 || '',
                  ranking: event.homeTeam?.ranking || null
                },
                awayTeam: {
                  id: event.awayTeam?.id,
                  name: event.awayTeam?.name || '',
                  shortName: event.awayTeam?.shortName || '',
                  country: event.awayTeam?.country?.alpha2 || '',
                  ranking: event.awayTeam?.ranking || null
                },
                homeScore: event.homeScore?.current ?? null,
                awayScore: event.awayScore?.current ?? null,
                status: event.status,
                startTimestamp: event.startTimestamp,
                winnerCode: event.winnerCode,
                detectedFrom: 'tournament'
              });
            }
          }
        }
      }
    } catch (e) {
      console.log(`Failed to fetch tournament matches from ${endpoint}:`, e.message);
    }
  }
  
  console.log(`📡 Detected ${detectedMatches.length} other matches from tournament ${tournamentId}`);
  return detectedMatches;
}

/**
 * Fetch additional data directly from SofaScore API endpoints
 */
async function fetchAdditionalEndpoints(eventId) {
  if (!eventId) return {};
  
  const endpoints = [
    `https://www.sofascore.com/api/v1/event/${eventId}`,
    `https://www.sofascore.com/api/v1/event/${eventId}/statistics`,
    `https://www.sofascore.com/api/v1/event/${eventId}/point-by-point`,
    `https://www.sofascore.com/api/v1/event/${eventId}/incidents`,
    `https://www.sofascore.com/api/v1/event/${eventId}/tennis-power`,
    `https://www.sofascore.com/api/v1/event/${eventId}/h2h`,
    `https://www.sofascore.com/api/v1/event/${eventId}/odds/1/all`,
    `https://www.sofascore.com/api/v1/event/${eventId}/pregame-form`,
    `https://www.sofascore.com/api/v1/event/${eventId}/votes`,
  ];
  
  const results = {};
  
  await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const res = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
          timeout: 10000,
        });
        
        if (res.ok) {
          const json = await res.json();
          if (json && Object.keys(json).length > 0) {
            results[endpoint] = json;
          }
        }
      } catch (e) {
        // Silently ignore failed endpoints
      }
    })
  );
  
  return results;
}

async function runScraper(url) {
  const id = makeId();
  jobs[id] = { status: 'pending', data: null };

  (async () => {
    jobs[id].status = 'running';
    const collected = { api: {} };
    let browser;
    try {
      console.log(`[${id}] Starting scrape for: ${url}`);
      
      // Puppeteer launch options for cloud environments
      const launchOptions = { 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']
      };
      
      // Use system Chromium if available (Railway/Render)
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }
      
      browser = await puppeteer.launch(launchOptions);
      console.log(`[${id}] Browser launched successfully`);
      const page = await browser.newPage();

      page.on('response', async (response) => {
        try {
          const request = response.request();
          const urlResp = response.url();
          
          // Skip binary content (images, flags, logos)
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('image/') || contentType.includes('octet-stream')) {
            return; // Skip binary data
          }
          
          // Skip image URLs explicitly
          if (/\/(image|flag|logo)($|\?|\/)/i.test(urlResp) || /img\.sofascore\.com/i.test(urlResp)) {
            return; // Skip image endpoints
          }
          
          if (/\/api\/(v1|v2)\//.test(urlResp) || /api\/(v1|v2)\//.test(request.url())) {
            let txt = null;
            try {
              txt = await response.text();
            } catch (e) {
              txt = null;
            }
            
            // Skip if response looks like binary data
            if (txt && (txt.startsWith('\x89PNG') || txt.startsWith('GIF') || txt.includes('\x00'))) {
              return; // Skip binary content
            }
            
            let json = null;
            try {
              json = txt ? JSON.parse(txt) : null;
            } catch (e) {
              json = txt;
            }
            
            // Only save non-null JSON data
            if (json !== null) {
              collected.api[urlResp] = json;
            }
          }
        } catch (err) {
          // ignore per-response errors
        }
      });

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // Try to extract event ID from URL first
      let eventId = extractEventIdFromUrl(url);
      
      // If not found in URL, try to extract from page
      if (!eventId) {
        try {
          eventId = await page.evaluate(() => {
            // Try various methods to get event ID
            if (window.__INITIAL_DATA__?.event?.id) return String(window.__INITIAL_DATA__.event.id);
            if (window.__NEXT_DATA__?.props?.pageProps?.event?.id) return String(window.__NEXT_DATA__.props.pageProps.event.id);
            
            // Try to find in URL
            const urlMatch = window.location.href.match(/id[=:](\d+)/i);
            if (urlMatch) return urlMatch[1];
            
            // Try to find in page content
            const canonical = document.querySelector('link[rel="canonical"]');
            if (canonical) {
              const match = canonical.href.match(/\/event\/(\d+)/);
              if (match) return match[1];
            }
            
            // Look for event ID in any script tags
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
              const match = script.textContent?.match(/"eventId"\s*:\s*(\d+)/);
              if (match) return match[1];
            }
            
            return null;
          });
        } catch (e) {
          console.log('Could not extract event ID from page:', e.message);
        }
      }
      
      console.log('Extracted event ID:', eventId);

      // try to fetch statistics endpoint directly from page context (if available)
      try {
        const stats = await page.evaluate(() => {
          return window.__INITIAL_DATA__ || null;
        });
        if (stats) collected.initial = stats;
      } catch (e) {}

      // give some extra time for background requests
      await page.waitForTimeout(1500);
      
      // Fetch additional endpoints directly using the event ID
      if (eventId) {
        console.log('Fetching additional endpoints for event:', eventId);
        const additionalData = await fetchAdditionalEndpoints(eventId);
        
        // Merge additional data into collected.api
        for (const [endpoint, data] of Object.entries(additionalData)) {
          if (data && !collected.api[endpoint]) {
            collected.api[endpoint] = data;
            console.log('Added data from:', endpoint);
          }
        }
        
        // ========== DETECT OTHER TOURNAMENT MATCHES ==========
        // Extract tournament info from event data
        let tournamentId = null;
        let seasonId = null;
        
        for (const [url, data] of Object.entries(collected.api)) {
          if (url.match(/\/event\/\d+$/) && data?.event?.tournament) {
            tournamentId = data.event.tournament.uniqueTournament?.id || data.event.tournament.id;
            seasonId = data.event.season?.id;
            break;
          }
        }
        
        if (tournamentId) {
          console.log(`🔍 Detecting other matches from tournament ${tournamentId}...`);
          const detectedMatches = await fetchTournamentMatches(tournamentId, seasonId, eventId);
          if (detectedMatches.length > 0) {
            collected.detectedMatches = detectedMatches;
            
            // Also save detected matches to a separate file for easy access
            try {
              ensureDir(path.join(DATA_DIR, 'detected'));
              const detectedPath = path.join(DATA_DIR, 'detected', `${id}-detected.json`);
              fs.writeFileSync(detectedPath, JSON.stringify({
                scrapedEventId: eventId,
                tournamentId,
                seasonId,
                detectedAt: new Date().toISOString(),
                matches: detectedMatches
              }, null, 2), 'utf8');
              console.log(`📁 Saved ${detectedMatches.length} detected matches to ${detectedPath}`);
            } catch (e) {
              console.error('Failed to save detected matches:', e.message);
            }
          }
        }
      }

      // save raw collected data to disk for audit and mapping
      try {
        const outPath = path.join(DATA_DIR, 'scrapes', `${id}.json`);
        fs.writeFileSync(outPath, JSON.stringify(collected, null, 2), 'utf8');
      } catch (e) {
        console.error('Failed to write raw scrape to disk', e);
      }

      // perform a lightweight normalization to produce a mapping suitable for conceptual maps
      try {
        const mapping = normalizeForMapping(collected);
        const mapPath = path.join(DATA_DIR, 'mappings', `${id}-mapping.json`);
        fs.writeFileSync(mapPath, JSON.stringify(mapping, null, 2), 'utf8');
        collected._mappingPath = mapPath;
        // expose mapping object directly in the API response so frontend can consume it
        collected.mapping = mapping;
      } catch (e) {
        console.error('Failed to create mapping file', e);
      }

      // ========== SAVE TO DATABASE + AUTO-MERGE XLSX ==========
      if (matchRepository) {
        try {
          // Extract the main event object from collected data
          const eventData = extractEventForDB(collected);
          if (eventData) {
            // Usa insertMatchWithXlsxMerge per unire automaticamente con dati storici xlsx
            const savedMatch = await matchRepository.insertMatchWithXlsxMerge(eventData, url);
            collected._dbMatchId = savedMatch?.id;
            console.log('✅ Match saved to database (with xlsx merge):', savedMatch?.id);
          } else {
            console.warn('⚠️ Could not extract event data for database');
          }
        } catch (dbError) {
          console.error('❌ Failed to save to database:', dbError.message);
          // Continue anyway - data is still in files
        }
      }

      jobs[id].data = collected;
      jobs[id].status = 'finished';
    } catch (err) {
      jobs[id].status = 'error';
      jobs[id].data = { error: err.message };
    } finally {
      try {
        if (browser) await browser.close();
      } catch (e) {}
    }
  })();

  return id;
}

function getStatus(id) {
  const j = jobs[id];
  return j ? j.status : null;
}

function getData(id) {
  const j = jobs[id];
  return j ? j.data : null;
}

// --- Normalizer: a lightweight extraction similar to frontend normalizeApiResponse ---
function normalizeForMapping(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const firstApi = raw.api && Object.values(raw.api)[0] ? Object.values(raw.api)[0] : null;
  const source = firstApi || raw.initial || raw;
  const out = {};

  function findArrayKey(obj, key) {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj[key])) return obj[key];
    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object' && Array.isArray(v[key])) return v[key];
    }
    return null;
  }

  out.pointByPoint = Array.isArray(source.pointByPoint)
    ? source.pointByPoint
    : findArrayKey(source, 'pointByPoint');
  out.tennisPowerRankings = Array.isArray(source.tennisPowerRankings)
    ? source.tennisPowerRankings
    : findArrayKey(source, 'tennisPowerRankings');

  function getNameFromCandidate(candidate) {
    if (!candidate) return null;
    if (typeof candidate === 'string') return { name: candidate };
    if (typeof candidate === 'object') {
      if (candidate.name) return { name: candidate.name };
      if (candidate.title) return { name: candidate.title };
      if (candidate.displayName) return { name: candidate.displayName };
      if (candidate.teamName) return { name: candidate.teamName };
      if (candidate.shortName) return { name: candidate.shortName };
    }
    return null;
  }

  function extractHomeAway(obj) {
    if (!obj || typeof obj !== 'object') return { home: null, away: null };
    if (obj.home || obj.away) {
      return {
        home: getNameFromCandidate(obj.home) || null,
        away: getNameFromCandidate(obj.away) || null,
      };
    }
    if (Array.isArray(obj.teams) && obj.teams.length >= 2) {
      return {
        home: getNameFromCandidate(obj.teams[0]) || null,
        away: getNameFromCandidate(obj.teams[1]) || null,
      };
    }
    if (Array.isArray(obj.players)) {
      const homeP = obj.players.find((p) => p.side === 'home' || p.role === 'home');
      const awayP = obj.players.find((p) => p.side === 'away' || p.role === 'away');
      if (homeP || awayP)
        return {
          home: getNameFromCandidate(homeP) || null,
          away: getNameFromCandidate(awayP) || null,
        };
      if (obj.players.length >= 2)
        return {
          home: getNameFromCandidate(obj.players[0]) || null,
          away: getNameFromCandidate(obj.players[1]) || null,
        };
    }
    for (const v of Object.values(obj)) {
      if (
        v &&
        typeof v === 'object' &&
        (v.home || v.away || Array.isArray(v.teams) || Array.isArray(v.players))
      ) {
        const found = extractHomeAway(v);
        if (found.home || found.away) return found;
      }
    }
    return { home: null, away: null };
  }

  const names = extractHomeAway(source);
  out.home = names.home;
  out.away = names.away;
  out._rawPreview =
    source && typeof source === 'object'
      ? source.event
        ? { id: source.event.id, slug: source.event.slug }
        : null
      : null;
  return out;
}

/**
 * Extract event data from collected scrape for database insertion
 */
function extractEventForDB(collected) {
  if (!collected || !collected.api) return null;
  
  // Find the main event object
  let event = null;
  let pointByPoint = null;
  let statistics = null;
  let tennisPowerRankings = null;
  
  for (const [url, data] of Object.entries(collected.api)) {
    if (!data || typeof data !== 'object') continue;
    
    // Event endpoint
    if (data.event && data.event.id) {
      event = data.event;
    }
    
    // Point-by-point
    if (Array.isArray(data.pointByPoint)) {
      pointByPoint = data.pointByPoint;
    }
    
    // Statistics
    if (Array.isArray(data.statistics)) {
      statistics = data.statistics;
    }
    
    // Power rankings
    if (Array.isArray(data.tennisPowerRankings)) {
      tennisPowerRankings = data.tennisPowerRankings;
    }
  }
  
  if (!event) {
    // Try initial data
    if (collected.initial?.event) {
      event = collected.initial.event;
    }
  }
  
  if (!event || !event.id) return null;
  
  // Build combined object for database
  return {
    ...event,
    id: event.id,
    home: event.homeTeam,
    away: event.awayTeam,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    homeScore: event.homeScore,
    awayScore: event.awayScore,
    tournament: event.tournament || event.uniqueTournament,
    pointByPoint,
    statistics,
    tennisPowerRankings
  };
}

module.exports = { runScraper, getData, getStatus };

// --- Direct fetch helpers ---
async function directFetch(url) {
  // Headers to simulate a mobile app request (bypass 403)
  const headers = {
    'User-Agent': 'SofaScore/6.0.0 (com.sofascore.results; build:1234; Android 14) okhttp/4.12.0',
    'Accept': 'application/json',
    'Accept-Language': 'en',
    'Accept-Encoding': 'gzip',
    'X-Requested-With': 'com.sofascore.results',
    'Connection': 'keep-alive'
  };
  
  const res = await fetch(url, { redirect: 'follow', timeout: 30000, headers });
  const contentType =
    res.headers && (res.headers.get('content-type') || res.headers.get('Content-Type'));
  let body = null;
  try {
    if (contentType && contentType.includes('application/json')) {
      body = await res.json();
    } else {
      const txt = await res.text();
      try {
        body = JSON.parse(txt);
      } catch (e) {
        body = txt;
      }
    }
  } catch (e) {
    throw new Error('Failed to fetch or parse remote resource: ' + e.message);
  }
  return { url, contentType, body };
}

async function runDirectFetch(url) {
  const id = makeId();
  jobs[id] = { status: 'pending', data: null };

  (async () => {
    jobs[id].status = 'running';
    try {
      const fetched = await directFetch(url);
      const collected = { api: {}, mapping: null };
      collected.api[url] = fetched.body;

      try {
        const mapping = normalizeForMapping(collected);
        collected.mapping = mapping;
      } catch (e) {
        // ignore mapping errors
      }

      // ========== SAVE TO DATABASE + AUTO-MERGE XLSX ==========
      if (matchRepository) {
        try {
          const eventData = extractEventForDB(collected);
          if (eventData) {
            // Usa insertMatchWithXlsxMerge per unire automaticamente con dati storici xlsx
            const savedMatch = await matchRepository.insertMatchWithXlsxMerge(eventData, url);
            collected._dbMatchId = savedMatch?.id;
            console.log('✅ Match saved to database (with xlsx merge):', savedMatch?.id);
          }
        } catch (dbError) {
          console.error('❌ Failed to save to database:', dbError.message);
        }
      }

      jobs[id].data = collected;
      jobs[id].status = 'finished';
    } catch (err) {
      jobs[id].status = 'error';
      jobs[id].data = { error: err.message };
    }
  })();

  return id;
}

/**
 * Get point-by-point data for an event (FILOSOFIA_FRONTEND compliance)
 * @param {string|number} eventId - SofaScore event ID
 * @returns {Promise<Object>} Point-by-point incidents data
 */
async function getPointByPoint(eventId) {
  const url = `https://api.sofascore.com/api/v1/event/${eventId}/incidents`;
  const result = await directFetch(url);
  return result.body;
}

module.exports = { runScraper, getData, getStatus, runDirectFetch, directFetch, getPointByPoint };
