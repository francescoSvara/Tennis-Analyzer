require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

// Global error handlers to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});
const {
  runScraper,
  getData,
  getStatus,
  runDirectFetch,
  directFetch,
} = require('./scraper/sofascoreScraper');
const {
  interpretGameValue,
  analyzePowerRankings,
  getValueZone,
  DEFAULT_THRESHOLDS
} = require('./utils/valueInterpreter');
const { initLiveManager, getStats: getLiveStats, fetchCompleteData, trackMatch, untrackMatch, getTrackedMatches, startScheduler, stopScheduler, syncMatch } = require('./liveManager');

// Database imports
let matchRepository = null;
let supabaseClient = null;
try {
  matchRepository = require('./db/matchRepository');
  supabaseClient = require('./db/supabase');
  console.log('✅ Database modules loaded');
} catch (e) {
  console.warn('⚠️ Database modules not available:', e.message);
}

// Funzione per determinare lo status realistico di una partita
// Se una partita risulta "inprogress" ma è iniziata più di 6 ore fa, probabilmente è finita
function getRealisticStatus(status, startTimestamp, winnerCode) {
  if (!status) return null;
  
  const statusType = status.type?.toLowerCase();
  
  // Se c'è un vincitore, la partita è finita
  if (winnerCode && winnerCode !== 0) {
    return { ...status, type: 'finished', description: status.description || 'Match finished' };
  }
  
  // Se la partita è "inprogress" ma è iniziata più di 6 ore fa, considerala finita
  if (statusType === 'inprogress' && startTimestamp) {
    const matchStartTime = startTimestamp * 1000; // Converti in millisecondi
    const now = Date.now();
    const hoursSinceStart = (now - matchStartTime) / (1000 * 60 * 60);
    
    // Una partita di tennis dura al massimo 5-6 ore
    if (hoursSinceStart > 6) {
      console.log(`⚠️ Match started ${hoursSinceStart.toFixed(1)}h ago, marking as finished`);
      return { ...status, type: 'finished', description: 'Match finished' };
    }
  }
  
  return status;
}

const app = express();
const server = http.createServer(app);

// Lista origini consentite (dev + produzione)
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'https://tennis-analyzer.vercel.app'  // Produzione Vercel
  ];
  
  // Aggiungi domini Vercel dalla env var (per flessibilità)
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  return origins;
};

// CORS middleware per tutte le route Express
app.use((req, res, next) => {
  const allowedOrigins = getAllowedOrigins();
  const origin = req.headers.origin;
  
  // Permetti origini nella lista o pattern Vercel (.vercel.app)
  if (allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Setup Socket.IO con CORS per Vite dev server e produzione
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();
      // Permetti origini nella lista, Vercel patterns, o requests senza origin (mobile/server)
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Permetti comunque in produzione, log warning
        console.warn(`⚠️ CORS: Origin ${origin} not in allowed list`);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Inizializza WebSocket Live Manager
initLiveManager(io);

app.use(bodyParser.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Tennis Analyzer Backend',
    version: '0.1.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    supabase: !!supabaseClient?.supabase,
    database: !!matchRepository
  });
});

// Directory per i file di scrape
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const SCRAPES_DIR = path.join(DATA_DIR, 'scrapes');

// Funzione per calcolare completezza dati di un match
function calculateDataCompleteness(apiData, eventId, sport = 'tennis') {
  if (!apiData) return 0;
  
  // Determina se è tennis
  const isTennis = sport === 'tennis' || 
    Object.keys(apiData).some(k => k.includes('tennis-power') || k.includes('point-by-point'));
  
  // Per tennis, verifica solo i dati essenziali
  if (isTennis) {
    let score = 0;
    let maxScore = 0;
    
    // Event principale (35 punti) - obbligatorio
    maxScore += 35;
    const hasEvent = Object.keys(apiData).some(k => k.match(/\/event\/\d+$/) && apiData[k]?.event);
    if (hasEvent) score += 35;
    
    // Point by Point (35 punti) - fondamentale per tennis
    maxScore += 35;
    const pbpKey = Object.keys(apiData).find(k => k.includes('point-by-point'));
    const pbpData = pbpKey ? apiData[pbpKey] : null;
    if (pbpData && !pbpData.error) {
      const pbp = pbpData.pointByPoint || [];
      if (Array.isArray(pbp) && pbp.length > 0) {
        score += 35;
      } else {
        score += 15; // Dati parziali
      }
    }
    
    // Statistics (20 punti)
    maxScore += 20;
    const statsKey = Object.keys(apiData).find(k => k.includes('/statistics') && !k.includes('team-statistics'));
    const statsData = statsKey ? apiData[statsKey] : null;
    if (statsData && statsData.statistics && !statsData.error) {
      score += 20;
    }
    
    // H2H o Tennis Power (10 punti) - bonus
    maxScore += 10;
    const h2hKey = Object.keys(apiData).find(k => k.includes('/h2h'));
    const h2hData = h2hKey ? apiData[h2hKey] : null;
    const tpKey = Object.keys(apiData).find(k => k.includes('tennis-power'));
    const tpData = tpKey ? apiData[tpKey] : null;
    
    if ((h2hData && (h2hData.teamDuel || h2hData.managerDuel)) || (tpData && tpData.tennisPowerRankings)) {
      score += 10;
    }
    
    return Math.round((score / maxScore) * 100);
  }
  
  // Per altri sport, logica originale semplificata
  let totalWeight = 0;
  let achievedWeight = 0;
  
  const checks = [
    { weight: 25, check: () => Object.keys(apiData).some(k => k.match(/\/event\/\d+$/) && apiData[k]?.event) ? 1 : 0 },
    { weight: 20, check: () => Object.keys(apiData).some(k => k.includes('/statistics')) ? 1 : 0.5 },
    { weight: 15, check: () => Object.keys(apiData).some(k => k.includes('/incidents')) ? 1 : 0.5 },
    { weight: 15, check: () => Object.keys(apiData).some(k => k.includes('/h2h')) ? 1 : 0.5 },
    { weight: 15, check: () => Object.keys(apiData).some(k => k.includes('/lineups')) ? 1 : 0.5 },
    { weight: 10, check: () => Object.keys(apiData).some(k => k.includes('/graph')) ? 1 : 0.5 }
  ];
  
  for (const c of checks) {
    totalWeight += c.weight;
    achievedWeight += c.weight * c.check();
  }
  
  return Math.round((achievedWeight / totalWeight) * 100);
}

// Funzione per estrarre partite correlate dello stesso torneo dalle API salvate
function extractRelatedMatches(apiData, currentEventId) {
  const relatedMatches = [];
  const seenIds = new Set([String(currentEventId)]);
  
  if (!apiData) return relatedMatches;
  
  // Cerca nelle risposte API che potrebbero contenere altre partite
  for (const [url, data] of Object.entries(apiData)) {
    // H2H contiene partite precedenti tra i due giocatori
    if (url.includes('/h2h') && data?.teamDuel?.events) {
      for (const event of data.teamDuel.events) {
        if (event.id && !seenIds.has(String(event.id))) {
          seenIds.add(String(event.id));
          relatedMatches.push({
            eventId: event.id,
            type: 'h2h',
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            tournament: event.tournament,
            startTimestamp: event.startTimestamp,
            status: event.status,
            homeScore: event.homeScore,
            awayScore: event.awayScore,
            winnerCode: event.winnerCode
          });
        }
      }
    }
    
    // Pregame form contiene partite recenti di entrambi i giocatori
    if (url.includes('/pregame-form') && data) {
      const formTypes = ['homeTeam', 'awayTeam'];
      for (const formType of formTypes) {
        const form = data[formType]?.form || [];
        for (const event of form) {
          if (event.id && !seenIds.has(String(event.id))) {
            seenIds.add(String(event.id));
            relatedMatches.push({
              eventId: event.id,
              type: 'form',
              homeTeam: event.homeTeam,
              awayTeam: event.awayTeam,
              tournament: event.tournament,
              startTimestamp: event.startTimestamp,
              status: event.status,
              homeScore: event.homeScore,
              awayScore: event.awayScore,
              winnerCode: event.winnerCode
            });
          }
        }
      }
    }
  }
  
  return relatedMatches;
}

// ============================================================================
// DATABASE STATISTICS API
// ============================================================================

/**
 * GET /api/db-stats - Statistiche complete del database
 * Fornisce metriche su tornei, partite, completezza dati
 * Legge dal database Supabase, con fallback ai file JSON locali
 */
app.get('/api/db-stats', async (req, res) => {
  try {
    let dbMatches = [];
    let dbTournaments = [];
    
    // Prova a caricare dal database
    if (matchRepository) {
      try {
        dbMatches = await matchRepository.getMatches({ limit: 500 }) || [];
        dbTournaments = await matchRepository.getTournaments() || [];
        console.log(`📊 DB Stats: Found ${dbMatches.length} matches in database`);
      } catch (dbErr) {
        console.log('⚠️ Database query failed, falling back to files:', dbErr.message);
      }
    }
    
    // Fallback o integrazione con file locali se DB vuoto o non disponibile
    if (dbMatches.length === 0) {
      console.log('📂 DB Stats: Loading from local files...');
      const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(SCRAPES_DIR, file), 'utf8'));
          let eventData = null;
          
          if (content.api) {
            for (const [url, data] of Object.entries(content.api)) {
              if (url.match(/\/api\/v1\/event\/\d+$/) && data?.event) {
                eventData = data.event;
                break;
              }
            }
          }
          
          if (eventData) {
            const sportSlug = eventData.tournament?.category?.sport?.slug || 'tennis';
            const statusType = eventData.status?.type || 'unknown';
            
            // Estrai uniqueTournament ID (potrebbe essere oggetto o id diretto)
            let uniqueTournamentId = null;
            let uniqueTournamentName = null;
            const ut = eventData.tournament?.uniqueTournament;
            if (ut) {
              if (typeof ut === 'object') {
                uniqueTournamentId = ut.id;
                uniqueTournamentName = ut.name;
              } else if (typeof ut === 'number') {
                uniqueTournamentId = ut;
              }
            }
            
            // Usa season ID come fallback per raggruppamento, ma salva uniqueTournamentId separatamente
            const seasonId = eventData.tournament?.id || eventData.season?.id;
            
            dbMatches.push({
              id: eventData.id,
              status_type: statusType,
              start_time: eventData.startTimestamp ? new Date(eventData.startTimestamp * 1000).toISOString() : null,
              created_at: new Date().toISOString(),
              tournament_id: seasonId,
              unique_tournament_id: uniqueTournamentId,
              tournament_name: uniqueTournamentName || eventData.tournament?.name || 'Unknown',
              tournament_category: eventData.tournament?.category?.name || '',
              home_name: eventData.homeTeam?.name || '',
              away_name: eventData.awayTeam?.name || '',
              sport: sportSlug,
              data_completeness: calculateDataCompleteness(content.api, eventData.id, sportSlug)
            });
          }
        } catch (e) { /* skip */ }
      }
      console.log(`📂 DB Stats: Loaded ${dbMatches.length} matches from files`);
    }
    
    // Strutture per le statistiche
    const matchesByStatus = { finished: 0, inprogress: 0, notstarted: 0, other: 0 };
    const matchesByDay = new Map();
    const tournamentMap = new Map();
    
    // Processa ogni match
    for (const match of dbMatches || []) {
      // Status
      const statusType = (match.status_type || 'other').toLowerCase();
      if (matchesByStatus.hasOwnProperty(statusType)) {
        matchesByStatus[statusType]++;
      } else {
        matchesByStatus.other++;
      }
      
      // Per giorno di ACQUISIZIONE (quando il match è stato salvato nel DB)
      const acquiredDate = match.created_at;
      if (acquiredDate) {
        const day = new Date(acquiredDate).toISOString().split('T')[0];
        matchesByDay.set(day, (matchesByDay.get(day) || 0) + 1);
      }
      
      // Raggruppa per torneo
      const tournamentId = match.tournament_id || 'unknown';
      const tournamentName = match.tournament_name || 'Sconosciuto';
      
      // Estrai uniqueTournamentId - può venire da unique_tournament_id (file) o raw_json (DB)
      let uniqueTournamentId = match.unique_tournament_id;
      if (!uniqueTournamentId && match.raw_json) {
        try {
          const rawData = typeof match.raw_json === 'string' ? JSON.parse(match.raw_json) : match.raw_json;
          uniqueTournamentId = rawData?.tournament?.uniqueTournament?.id;
        } catch (e) { /* ignore parse errors */ }
      }
      
      if (!tournamentMap.has(tournamentId)) {
        tournamentMap.set(tournamentId, {
          id: tournamentId,
          uniqueTournamentId: uniqueTournamentId,
          name: tournamentName,
          category: match.tournament_category || '',
          sport: 'tennis',
          matches: [],
          completeness: [],
          latestDate: null,
          earliestDate: null
        });
      } else if (uniqueTournamentId && !tournamentMap.get(tournamentId).uniqueTournamentId) {
        // Aggiorna se non avevamo l'uniqueTournamentId
        tournamentMap.get(tournamentId).uniqueTournamentId = uniqueTournamentId;
      }
      
      const tData = tournamentMap.get(tournamentId);
      const completeness = 50; // Default, può essere calcolato se serve
      const matchStartTimestamp = match.start_time ? Math.floor(new Date(match.start_time).getTime() / 1000) : null;
      
      tData.matches.push({
        eventId: match.id,
        status: statusType,
        completeness,
        homeTeam: match.home_name || '',
        awayTeam: match.away_name || '',
        startTimestamp: matchStartTimestamp
      });
      tData.completeness.push(completeness);
      
      if (matchStartTimestamp) {
        if (!tData.latestDate || matchStartTimestamp > tData.latestDate) {
          tData.latestDate = matchStartTimestamp;
        }
        if (!tData.earliestDate || matchStartTimestamp < tData.earliestDate) {
          tData.earliestDate = matchStartTimestamp;
        }
      }
    }
    
    // Recupera statistiche detected_matches per calcolare copertura reale
    let detectedStats = {};
    if (matchRepository && matchRepository.getDetectedMatchesStats) {
      try {
        detectedStats = await matchRepository.getDetectedMatchesStats();
        console.log(`📊 DB Stats: Found detected_matches for ${Object.keys(detectedStats).length} tournaments`);
      } catch (err) {
        console.log('⚠️ Could not load detected_matches stats:', err.message);
      }
    }
    
    // Calcola statistiche per torneo
    const tournamentStats = Array.from(tournamentMap.values()).map(t => {
      // Dati dalla tabella detected_matches
      const detected = detectedStats[t.id] || null;
      const totalDetected = detected?.total || 0;
      const acquiredFromDetected = detected?.acquired || 0;
      const missingMatches = detected?.missingMatches || [];
      
      // Calcola percentuale reale di copertura
      // Se abbiamo detected_matches, usiamo quella - altrimenti consideriamo 100% (solo DB)
      const coveragePercentage = totalDetected > 0 
        ? Math.round((t.matches.length / totalDetected) * 100)
        : 100; // Se non abbiamo detected_matches, non possiamo calcolare
      
      return {
        id: t.id,
        uniqueTournamentId: t.uniqueTournamentId || null,
        name: t.name,
        category: t.category,
        sport: t.sport,
        matchCount: t.matches.length,
        avgCompleteness: t.completeness.length > 0 
          ? Math.round(t.completeness.reduce((a, b) => a + b, 0) / t.completeness.length)
          : 0,
        byStatus: {
          finished: t.matches.filter(m => m.status === 'finished').length,
          inprogress: t.matches.filter(m => m.status === 'inprogress').length,
          notstarted: t.matches.filter(m => m.status === 'notstarted').length
        },
        matches: t.matches,
        latestDate: t.latestDate,
        earliestDate: t.earliestDate,
        // NUOVI CAMPI per copertura reale
        coverage: {
          totalDetected,
          acquired: t.matches.length,
          missing: totalDetected - t.matches.length,
          percentage: coveragePercentage
        },
        missingMatches: missingMatches.slice(0, 50) // Max 50 partite mancanti per non appesantire
      };
    });
    
    // Ordina tornei per data più recente
    tournamentStats.sort((a, b) => {
      if (!a.latestDate && !b.latestDate) return b.matchCount - a.matchCount;
      if (!a.latestDate) return 1;
      if (!b.latestDate) return -1;
      return b.latestDate - a.latestDate;
    });
    
    // Timeline per giorno (ultimi 30 giorni)
    const timeline = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      timeline.push({
        date: dayStr,
        count: matchesByDay.get(dayStr) || 0
      });
    }
    
    // Acquisizioni recenti (ordinate per created_at)
    const recentAcquisitions = (dbMatches || [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20)
      .map(m => ({
        eventId: m.id,
        acquiredAt: m.created_at,
        tournament: m.tournament_name || '',
        homeTeam: m.home_name || '',
        awayTeam: m.away_name || '',
        status: m.status_type || 'unknown',
        completeness: 50
      }));
    
    // Partite tracciate (live monitoring)
    const tracked = getTrackedMatches();
    
    // === CALCOLO DATABASE POWER SCORE ===
    // Metriche reali sulla qualità e ricchezza del database
    let matchesWithScore = 0;
    let matchesWithWinner = 0;
    let matchesWithStats = 0;
    let totalStatsRecords = 0;
    let detectedCount = 0;
    
    // Conta match con dati completi
    for (const match of dbMatches || []) {
      if (match.home_sets_won !== null || match.away_sets_won !== null) matchesWithScore++;
      if (match.winner_code !== null && match.winner_code !== 0) matchesWithWinner++;
    }
    
    // Conta statistiche e detected matches dal DB
    try {
      const { count: statsCount } = await supabase.from('match_statistics').select('*', { count: 'exact', head: true });
      totalStatsRecords = statsCount || 0;
      matchesWithStats = Math.min((dbMatches || []).length, Math.floor(totalStatsRecords / 10)); // ~10 stats per match
      
      const { count: detected } = await supabase.from('detected_matches').select('*', { count: 'exact', head: true });
      detectedCount = detected || 0;
    } catch (e) {
      console.log('Stats count error:', e.message);
    }
    
    const totalMatches = (dbMatches || []).length;
    
    // Calcola punteggi parziali (0-100)
    const coverageScore = detectedCount > 0 ? Math.round((totalMatches / detectedCount) * 100) : 0;
    const scoreCompleteness = totalMatches > 0 ? Math.round((matchesWithScore / totalMatches) * 100) : 0;
    const winnerCompleteness = totalMatches > 0 ? Math.round((matchesWithWinner / totalMatches) * 100) : 0;
    const statsRichness = totalMatches > 0 ? Math.min(100, Math.round((totalStatsRecords / totalMatches) * 3)) : 0;
    
    // Power Score finale (media pesata)
    const powerScore = Math.round(
      (coverageScore * 0.25) +      // 25% peso copertura
      (scoreCompleteness * 0.25) +  // 25% peso punteggi
      (winnerCompleteness * 0.20) + // 20% peso vincitori  
      (statsRichness * 0.30)        // 30% peso statistiche
    );
    
    res.json({
      summary: {
        totalMatches: totalMatches,
        totalTournaments: tournamentMap.size,
        powerScore: powerScore,
        powerDetails: {
          coverage: { score: coverageScore, label: 'Copertura', detail: `${totalMatches}/${detectedCount} match` },
          scores: { score: scoreCompleteness, label: 'Punteggi', detail: `${matchesWithScore}/${totalMatches} completi` },
          winners: { score: winnerCompleteness, label: 'Vincitori', detail: `${matchesWithWinner}/${totalMatches} definiti` },
          statistics: { score: statsRichness, label: 'Statistiche', detail: `${totalStatsRecords} record totali` }
        },
        byStatus: matchesByStatus
      },
      tournaments: tournamentStats,
      recentAcquisitions,
      timeline,
      tracking: {
        active: tracked.length,
        matches: tracked
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Error fetching DB stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tournament/:tournamentId/events - Ottieni match per un torneo
 * 
 * Restituisce SOLO i match salvati nel database.
 * Lo scraping viene fatto ESCLUSIVAMENTE dal progetto locale (Tennis-Scraper-Local)
 * perché Railway/cloud blocca le chiamate a SofaScore (errore 409).
 */
app.get('/api/tournament/:tournamentId/events', async (req, res) => {
  const { tournamentId } = req.params;
  const { seasonId: seasonIdQuery } = req.query;
  const seasonId = seasonIdQuery || tournamentId;
  
  try {
    console.log(`Tournament events request: tournamentId=${tournamentId}, seasonId=${seasonId}`);
    
    // Raccogli tutti i match esistenti nel DB per questo torneo
    const existingMatches = [];
    
    // Check DB Supabase
    if (matchRepository) {
      try {
        // Prima prova con tournament_id (season_id)
        let dbMatches = await matchRepository.getMatches({ tournamentId: seasonId, limit: 1000 });
        
        // Se non trova nulla, prova a cercare tutti i match e filtrare per uniqueTournamentId
        if ((!dbMatches || dbMatches.length === 0) && tournamentId) {
          const allMatches = await matchRepository.getMatches({ limit: 1000 });
          if (allMatches && Array.isArray(allMatches)) {
            dbMatches = allMatches.filter(m => {
              if (m.raw_json) {
                try {
                  const rawData = typeof m.raw_json === 'string' ? JSON.parse(m.raw_json) : m.raw_json;
                  const utId = rawData?.tournament?.uniqueTournament?.id;
                  return String(utId) === String(tournamentId);
                } catch (e) { return false; }
              }
              return false;
            });
          }
        }
        
        if (dbMatches && Array.isArray(dbMatches)) {
          dbMatches.forEach(m => {
            if (!existingMatches.find(em => em.eventId === m.id)) {
              existingMatches.push({
                eventId: m.id,
                homeTeam: m.home_name || m.home_player?.name || '',
                awayTeam: m.away_name || m.away_player?.name || '',
                status: m.status_type || 'unknown',
                startTimestamp: m.start_time ? Math.floor(new Date(m.start_time).getTime() / 1000) : null,
                completeness: m.data_completeness || 50,
                winnerCode: m.winner_code
              });
            }
          });
        }
        console.log(`Found ${existingMatches.length} matches for tournament ${tournamentId} in DB`);
      } catch (dbErr) {
        console.log('Could not check DB:', dbErr.message);
      }
    }
    
    const total = existingMatches.length;
    
    res.json({
      tournamentId,
      seasonId,
      events: existingMatches,
      stats: {
        total,
        inDatabase: total
      },
      note: 'Solo dati dal database. Lo scraping va fatto dal progetto locale.'
    });
    
  } catch (err) {
    console.error(`Error fetching tournament ${tournamentId} events:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// MATCH SEARCH API - Ricerca filtrata match dal database
// ============================================================================

/**
 * GET /api/matches/search - Ricerca match con filtri
 * Query params: status, tournamentId, tournamentCategory, playerSearch, dateFrom, dateTo, page, limit
 */
app.get('/api/matches/search', async (req, res) => {
  try {
    if (!matchRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const {
      status,
      tournamentId,
      tournamentCategory,
      playerSearch,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;
    
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100); // Max 100
    const offset = (pageNum - 1) * limitNum;
    
    // Conta totale per paginazione
    const totalCount = await matchRepository.countMatches({
      status,
      tournamentId: tournamentId ? parseInt(tournamentId, 10) : undefined,
      tournamentCategory,
      playerSearch,
      dateFrom,
      dateTo
    });
    
    // Recupera match con filtri
    const matches = await matchRepository.getMatches({
      status,
      tournamentId: tournamentId ? parseInt(tournamentId, 10) : undefined,
      tournamentCategory,
      playerSearch,
      dateFrom,
      dateTo,
      limit: limitNum,
      offset
    });
    
    // Formatta risposta
    res.json({
      matches: matches.map(m => ({
        eventId: m.id,
        homeTeam: m.home_name || 'Unknown',
        awayTeam: m.away_name || 'Unknown',
        tournament: m.tournament_name || 'Unknown',
        tournamentId: m.tournament_id,
        category: m.tournament_category || '',
        status: m.status_type || 'unknown',
        startTime: m.start_time,
        homeScore: m.home_sets_won,
        awayScore: m.away_sets_won,
        winnerCode: m.winner_code,
        roundName: m.round_name,
        sofascoreUrl: m.sofascore_url
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNext: pageNum * limitNum < totalCount,
        hasPrev: pageNum > 1
      },
      filters: {
        status: status || null,
        tournamentId: tournamentId || null,
        playerSearch: playerSearch || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null
      }
    });
    
  } catch (err) {
    console.error('Error searching matches:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/matches/tournaments - Lista tornei per dropdown filtro
 */
app.get('/api/matches/tournaments', async (req, res) => {
  try {
    if (!matchRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const tournaments = await matchRepository.getDistinctTournaments();
    res.json({ tournaments });
    
  } catch (err) {
    console.error('Error fetching tournaments:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/matches - Restituisce lista di tutti i match salvati (senza duplicati per eventId)
app.get('/api/matches', async (req, res) => {
  try {
    const { sport } = req.query; // Filtro opzionale per sport
    const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
    
    const matches = [];
    const seenEventIds = new Set(); // Per evitare duplicati
    
    for (const file of files) {
      try {
        const filePath = path.join(SCRAPES_DIR, file);
        const stats = fs.statSync(filePath);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Cerca i dati dell'evento nel JSON
        let eventData = null;
        if (content.api) {
          for (const [url, data] of Object.entries(content.api)) {
            if (url.match(/\/api\/v1\/event\/\d+$/) && data?.event) {
              eventData = data.event;
              break;
            }
          }
        }
        
        if (eventData) {
          // Skip se già visto questo eventId (tieni solo il più recente)
          if (eventData.id && seenEventIds.has(String(eventData.id))) {
            continue;
          }
          seenEventIds.add(String(eventData.id));
          
          const sportSlug = eventData.tournament?.category?.sport?.slug || 
                           eventData.homeTeam?.sport?.slug || 'unknown';
          
          // Filtra per sport se specificato
          if (sport && sportSlug !== sport) continue;
          
          matches.push({
            id: file.replace('.json', ''),
            fileDate: stats.mtime,
            eventId: eventData.id,
            sport: sportSlug,
            sportName: eventData.tournament?.category?.sport?.name || 'Unknown',
            tournament: eventData.tournament?.uniqueTournament?.name || eventData.tournament?.name || '',
            category: eventData.tournament?.category?.name || '',
            homeTeam: {
              name: eventData.homeTeam?.name || '',
              shortName: eventData.homeTeam?.shortName || '',
              country: eventData.homeTeam?.country?.alpha2 || '',
              ranking: eventData.homeTeam?.ranking || null
            },
            awayTeam: {
              name: eventData.awayTeam?.name || '',
              shortName: eventData.awayTeam?.shortName || '',
              country: eventData.awayTeam?.country?.alpha2 || '',
              ranking: eventData.awayTeam?.ranking || null
            },
            homeScore: eventData.homeScore || null,
            awayScore: eventData.awayScore || null,
            status: getRealisticStatus(eventData.status, eventData.startTimestamp, eventData.winnerCode),
            startTimestamp: eventData.startTimestamp || null,
            winnerCode: eventData.winnerCode || null,
            // Calcola completezza dati (passa lo sport per logica specifica)
            dataCompleteness: calculateDataCompleteness(content.api, eventData.id, sportSlug)
          });
        }
      } catch (e) {
        // Skip file con errori
        console.error(`Error reading ${file}:`, e.message);
      }
    }
    
    // Ordina per: 1) Data/giorno, 2) Orario, 3) Torneo
    matches.sort((a, b) => {
      // Prima per timestamp di inizio (data + orario)
      const timeA = a.startTimestamp || 0;
      const timeB = b.startTimestamp || 0;
      if (timeA !== timeB) {
        return timeA - timeB; // Partite più vicine prima
      }
      // Poi per torneo (alfabetico)
      const tournamentA = (a.tournament || '').toLowerCase();
      const tournamentB = (b.tournament || '').toLowerCase();
      return tournamentA.localeCompare(tournamentB);
    });
    
    res.json({ matches, count: matches.length });
  } catch (err) {
    console.error('Error fetching matches:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/suggested-matches - Recupera partite suggerite dai tornei e dalle API salvate (non ancora nel DB)
app.get('/api/suggested-matches', async (req, res) => {
  try {
    const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
    const existingEventIds = new Set();
    const tournamentIds = new Set();
    const relatedMatchesMap = new Map(); // Per evitare duplicati nelle partite correlate
    
    // Prima pass: raccogli tutti gli eventId esistenti, tournamentId e partite correlate
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(SCRAPES_DIR, file), 'utf8'));
        if (content.api) {
          let currentEventId = null;
          
          for (const [url, data] of Object.entries(content.api)) {
            if (url.match(/\/api\/v1\/event\/\d+$/) && data?.event) {
              currentEventId = data.event.id;
              existingEventIds.add(String(data.event.id));
              if (data.event.tournament?.uniqueTournament?.id) {
                tournamentIds.add(data.event.tournament.uniqueTournament.id);
              }
            }
          }
          
          // Estrai partite correlate da H2H e pregame-form
          if (currentEventId) {
            const related = extractRelatedMatches(content.api, currentEventId);
            for (const match of related) {
              if (!existingEventIds.has(String(match.eventId)) && !relatedMatchesMap.has(String(match.eventId))) {
                relatedMatchesMap.set(String(match.eventId), match);
              }
            }
          }
        }
      } catch (e) { /* skip */ }
    }
    
    // Converti partite correlate in array con formato corretto
    const relatedMatches = Array.from(relatedMatchesMap.values()).map(match => ({
      eventId: match.eventId,
      sport: match.tournament?.category?.sport?.slug || 'tennis',
      sportName: match.tournament?.category?.sport?.name || 'Tennis',
      tournament: match.tournament?.uniqueTournament?.name || match.tournament?.name || '',
      category: match.tournament?.category?.name || '',
      homeTeam: {
        name: match.homeTeam?.name || '',
        shortName: match.homeTeam?.shortName || '',
        country: match.homeTeam?.country?.alpha2 || '',
        ranking: match.homeTeam?.ranking || null
      },
      awayTeam: {
        name: match.awayTeam?.name || '',
        shortName: match.awayTeam?.shortName || '',
        country: match.awayTeam?.country?.alpha2 || '',
        ranking: match.awayTeam?.ranking || null
      },
      homeScore: match.homeScore || null,
      awayScore: match.awayScore || null,
      status: match.status || null,
      startTimestamp: match.startTimestamp || null,
      winnerCode: match.winnerCode || null,
      isSuggested: true,
      suggestedFrom: match.type // 'h2h' o 'form'
    }));
    
    // Fetch partite dai tornei trovati (opzionale, solo se abbiamo poche partite correlate)
    const suggestedMatches = [...relatedMatches];
    
    if (relatedMatches.length < 20) {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.sofascore.com/'
      };
      
      for (const tournamentId of [...tournamentIds].slice(0, 3)) { // Limita a 3 tornei
        try {
          const response = await fetch(
            `https://api.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${new Date().getFullYear()}/events/last/0`,
            { headers }
          );
          if (response.ok) {
            const data = await response.json();
            if (data.events) {
              for (const event of data.events) {
                // Solo eventi non già nel DB e non già suggeriti
                if (!existingEventIds.has(String(event.id)) && !relatedMatchesMap.has(String(event.id))) {
                  suggestedMatches.push({
                    eventId: event.id,
                    sport: event.tournament?.category?.sport?.slug || 'tennis',
                    sportName: event.tournament?.category?.sport?.name || 'Tennis',
                    tournament: event.tournament?.uniqueTournament?.name || event.tournament?.name || '',
                    category: event.tournament?.category?.name || '',
                    homeTeam: {
                      name: event.homeTeam?.name || '',
                      shortName: event.homeTeam?.shortName || '',
                      country: event.homeTeam?.country?.alpha2 || '',
                      ranking: event.homeTeam?.ranking || null
                    },
                    awayTeam: {
                      name: event.awayTeam?.name || '',
                      shortName: event.awayTeam?.shortName || '',
                      country: event.awayTeam?.country?.alpha2 || '',
                      ranking: event.awayTeam?.ranking || null
                    },
                    status: event.status || null,
                    startTimestamp: event.startTimestamp || null,
                    isSuggested: true,
                    suggestedFrom: 'tournament'
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error(`Error fetching tournament ${tournamentId}:`, e.message);
        }
      }
    }
    
    // Ordina per data (più recenti prima)
    suggestedMatches.sort((a, b) => (b.startTimestamp || 0) - (a.startTimestamp || 0));
    
    res.json({ 
      matches: suggestedMatches.slice(0, 50), 
      count: suggestedMatches.length,
      sources: {
        related: relatedMatches.length,
        tournament: suggestedMatches.length - relatedMatches.length
      }
    });
  } catch (err) {
    console.error('Error fetching suggested matches:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/detected-matches - Recupera partite rilevate dalla tabella detected_matches (non ancora acquisite)
app.get('/api/detected-matches', async (req, res) => {
  try {
    // Prima ottieni il count totale dei mancanti
    const { count: totalMissing, error: countError } = await supabase
      .from('detected_matches')
      .select('*', { count: 'exact', head: true })
      .eq('is_acquired', false);
    
    if (countError) {
      console.error('Error counting detected matches:', countError);
    }
    
    // Poi ottieni i dati (limitati per performance)
    const { data: detectedMatches, error } = await supabase
      .from('detected_matches')
      .select('*')
      .eq('is_acquired', false)
      .order('start_time', { ascending: true })
      .limit(100);
    
    if (error) {
      console.error('Error fetching detected matches from DB:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // Formatta i match per il frontend
    const formattedMatches = (detectedMatches || []).map(m => ({
      eventId: m.id,
      homeTeam: { name: m.home_team_name },
      awayTeam: { name: m.away_team_name },
      tournament: { name: m.tournament_name },
      status: m.status,
      statusType: m.status_type,
      startTimestamp: m.start_time ? new Date(m.start_time).getTime() / 1000 : null,
      isDetected: true,
      tournamentId: m.tournament_id
    }));
    
    res.json({ 
      matches: formattedMatches,
      count: formattedMatches.length,
      totalCount: totalMissing || formattedMatches.length
    });
  } catch (err) {
    console.error('Error fetching detected matches:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// SCRAPING DISABILITATO - SofaScore blocca gli IP dei server cloud
// Usa Tennis-Scraper-Local per acquisire nuovi match da locale
app.post('/api/scrape', async (req, res) => {
  return res.status(503).json({
    error: 'scraping_disabled',
    message: 'Lo scraping è disabilitato sul server di produzione.',
    hint: 'SofaScore blocca le richieste dai server cloud. Usa Tennis-Scraper-Local per acquisire match da localhost.',
    instructions: [
      '1. Apri la cartella Tennis-Scraper-Local',
      '2. Esegui: npm install',
      '3. Esegui: npm run dev',
      '4. Apri http://localhost:5174',
      '5. Inserisci il link SofaScore per acquisire il match'
    ]
  });
});

/*
// VECCHIO ENDPOINT SCRAPE - MANTENUTO PER RIFERIMENTO
app.post('/api/scrape-old', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  
  try {
    // Estrai eventId dall'URL per controllo duplicati
    let eventId = null;
    try {
      const urlObj = new URL(url);
      // Check hash for #id:XXXXX format
      if (urlObj.hash) {
        const idMatch = urlObj.hash.match(/id[=:](\d+)/i);
        if (idMatch) eventId = idMatch[1];
      }
      // Check for event ID in path like /event/12345
      if (!eventId) {
        const pathMatch = urlObj.pathname.match(/\/event\/(\d+)/);
        if (pathMatch) eventId = pathMatch[1];
      }
    } catch (e) {}
    
    // Controlla se il match esiste già nel database/file system
    if (eventId) {
      const scrapesDir = path.join(__dirname, '..', 'data', 'scrapes');
      if (fs.existsSync(scrapesDir)) {
        const files = fs.readdirSync(scrapesDir);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          try {
            const filePath = path.join(scrapesDir, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Cerca eventId nella struttura api
            let fileEventId = null;
            let homeTeam = 'Unknown';
            let awayTeam = 'Unknown';
            
            // La struttura è: content.api = { 'url1': {...}, 'url2': {...} }
            if (content.api) {
              for (const [url, data] of Object.entries(content.api)) {
                if (data?.event?.id) {
                  fileEventId = data.event.id;
                  homeTeam = data.event?.homeTeam?.name || data.event?.homeTeam?.shortName || 'Unknown';
                  awayTeam = data.event?.awayTeam?.name || data.event?.awayTeam?.shortName || 'Unknown';
                  break;
                }
              }
            }
            
            // Fallback a mapping se presente
            if (!fileEventId && content.mapping?.event?.id) {
              fileEventId = content.mapping.event.id;
              homeTeam = content.mapping?.home?.name || 'Unknown';
              awayTeam = content.mapping?.away?.name || 'Unknown';
            }
            
            if (String(fileEventId) === String(eventId)) {
              // Match già esistente - restituisci 409 con info
              return res.status(409).json({ 
                error: 'duplicate',
                message: `Match già acquisito: ${homeTeam} vs ${awayTeam}`,
                eventId,
                homeTeam,
                awayTeam
              });
            }
          } catch (e) {}
        }
      }
    }
    
    // Heuristic: if URL looks like an API endpoint, ends with .json, or is a SofaScore URL
    const isLikelyApi = /\/api\/|\.json($|\?)/i.test(url);
    const isSofascoreUrl = /sofascore\.com/i.test(url);
    
    if (isLikelyApi || isSofascoreUrl) {
      try {
        // Convert SofaScore event page URLs to API endpoints
        let apiUrl = url;
        const eventMatch = url.match(/sofascore\.com\/(?:.*?\/)?(?:event\/)?(\d+)/i);
        if (eventMatch && !url.includes('/api/')) {
          apiUrl = `https://www.sofascore.com/api/v1/event/${eventMatch[1]}`;
          console.log(`🔄 Converting URL to API: ${apiUrl}`);
        }
        
        const id = await runDirectFetch(apiUrl);
        // Attendi il completamento e ottieni i dati
        let attempts = 0;
        let status = getStatus(id);
        while (status === 'pending' || status === 'running') {
          await new Promise(r => setTimeout(r, 500));
          status = getStatus(id);
          if (++attempts > 120) break; // max 60 secondi
        }
        const data = getData(id);
        
        // Estrai nomi da varie fonti
        let homeTeam = 'Unknown';
        let awayTeam = 'Unknown';
        let foundEventId = null;
        
        // Prima prova dal mapping
        if (data?.mapping?.home?.name) homeTeam = data.mapping.home.name;
        if (data?.mapping?.away?.name) awayTeam = data.mapping.away.name;
        
        // Se ancora Unknown, cerca nell'api
        if (data?.api && (homeTeam === 'Unknown' || awayTeam === 'Unknown')) {
          for (const [apiEndpoint, apiData] of Object.entries(data.api)) {
            // Check if SofaScore returned 403 error
            if (apiData?.error?.code === 403) {
              console.log('⚠️ SofaScore returned 403 Forbidden - IP blocked');
              return res.status(503).json({
                error: 'blocked',
                message: 'SofaScore ha bloccato la richiesta. Usa lo scraping da locale.',
                hint: 'Esegui il backend in locale per acquisire nuovi match'
              });
            }
            if (apiData?.event?.homeTeam?.name && homeTeam === 'Unknown') {
              homeTeam = apiData.event.homeTeam.name;
            }
            if (apiData?.event?.awayTeam?.name && awayTeam === 'Unknown') {
              awayTeam = apiData.event.awayTeam.name;
            }
            if (apiData?.event?.id && !foundEventId) {
              foundEventId = apiData.event.id;
            }
          }
        }
        
        return res.json({ 
          id, 
          method: 'direct',
          match: { homeTeam, awayTeam, eventId: foundEventId || data?.mapping?.event?.id }
        });
      } catch (e) {
        console.error('direct fetch failed, falling back to scraper:', e.message);
      }
    }
    
    const id = await runScraper(url);
    
    // Attendi il completamento e ottieni i dati per la risposta
    let attempts = 0;
    let status = getStatus(id);
    while (status === 'pending' || status === 'running') {
      await new Promise(r => setTimeout(r, 500));
      status = getStatus(id);
      if (++attempts > 120) break; // max 60 secondi
    }
    
    const data = getData(id);
    
    // Estrai nomi da varie fonti
    let homeTeam = 'Unknown';
    let awayTeam = 'Unknown';
    let foundEventId = null;
    
    // Prima prova dal mapping
    if (data?.mapping?.home?.name) homeTeam = data.mapping.home.name;
    if (data?.mapping?.away?.name) awayTeam = data.mapping.away.name;
    
    // Se ancora Unknown, cerca nell'api
    if (data?.api && (homeTeam === 'Unknown' || awayTeam === 'Unknown')) {
      for (const [url, apiData] of Object.entries(data.api)) {
        if (apiData?.event?.homeTeam?.name && homeTeam === 'Unknown') {
          homeTeam = apiData.event.homeTeam.name;
        }
        if (apiData?.event?.awayTeam?.name && awayTeam === 'Unknown') {
          awayTeam = apiData.event.awayTeam.name;
        }
        if (apiData?.event?.id && !foundEventId) {
          foundEventId = apiData.event.id;
        }
      }
    }
    
    res.json({ 
      id, 
      method: 'scrape',
      match: { homeTeam, awayTeam, eventId: foundEventId || data?.mapping?.event?.id }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
*/

// Quick lookup: try to fetch the URL and extract a home player/team name synchronously
app.post('/api/lookup-name', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  try {
    const fetched = await directFetch(url);
    const body = fetched && fetched.body ? fetched.body : null;

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

    const names = extractHomeAway(body);
    const homeName = names.home && names.home.name ? names.home.name : null;
    res.json({ home: homeName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync-match/:eventId - Sync completo dei dati di una partita dalle API
app.post('/api/sync-match/:eventId', async (req, res) => {
  const eventId = req.params.eventId;
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    console.log(`🔄 Manual sync requested for event ${eventId}`);
    
    // Fetch dati completi
    const completeData = await fetchCompleteData(eventId);
    
    // Salva nel file di scrape esistente o crea nuovo
    const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
    let targetFile = null;
    
    // Cerca file esistente per questo eventId
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(SCRAPES_DIR, file), 'utf8'));
        if (content.api) {
          for (const [url, data] of Object.entries(content.api)) {
            if (url.includes(`/event/${eventId}`) || data?.event?.id === parseInt(eventId)) {
              targetFile = file;
              break;
            }
          }
        }
        if (targetFile) break;
      } catch (e) { /* skip */ }
    }
    
    if (targetFile) {
      // Aggiorna file esistente con dati sincronizzati
      const filePath = path.join(SCRAPES_DIR, targetFile);
      const existingContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Aggiungi/aggiorna i dati sync
      existingContent.lastSync = completeData.timestamp;
      existingContent.syncData = completeData;
      existingContent.dataCompleteness = completeData.dataCompleteness;
      
      fs.writeFileSync(filePath, JSON.stringify(existingContent, null, 2));
      
      console.log(`✅ Synced data saved to ${targetFile}`);
      res.json({ 
        success: true, 
        message: 'Dati sincronizzati',
        file: targetFile,
        dataCompleteness: completeData.dataCompleteness
      });
    } else {
      // Nessun file esistente, ritorna solo i dati
      res.json({ 
        success: true, 
        message: 'Dati recuperati (nessun file esistente trovato)',
        data: completeData,
        dataCompleteness: completeData.dataCompleteness
      });
    }
  } catch (err) {
    console.error(`❌ Sync error for event ${eventId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/check-data/:eventId - Verifica completezza dati per una partita
app.get('/api/check-data/:eventId', async (req, res) => {
  const eventId = req.params.eventId;
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    // Cerca nei file salvati
    const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
    let savedData = null;
    let fileName = null;
    
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(SCRAPES_DIR, file), 'utf8'));
        if (content.api) {
          for (const [url, data] of Object.entries(content.api)) {
            if (url.includes(`/event/${eventId}`) || data?.event?.id === parseInt(eventId)) {
              savedData = content;
              fileName = file;
              break;
            }
          }
        }
        if (savedData) break;
      } catch (e) { /* skip */ }
    }
    
    if (!savedData) {
      return res.json({ 
        found: false, 
        message: 'Match non trovato nei dati salvati' 
      });
    }
    
    // Analizza completezza dati salvati
    const completeness = {
      event: false,
      pointByPoint: false,
      statistics: false,
      powerRankings: false,
      lastSync: savedData.lastSync || null
    };
    
    if (savedData.api) {
      for (const [url, data] of Object.entries(savedData.api)) {
        if (url.includes('/event/') && !url.includes('/')) {
          completeness.event = !!data?.event;
        }
        if (url.includes('point-by-point')) {
          completeness.pointByPoint = Array.isArray(data?.pointByPoint) && data.pointByPoint.length > 0;
        }
        if (url.includes('statistics')) {
          completeness.statistics = Array.isArray(data?.statistics) && data.statistics.length > 0;
        }
        if (url.includes('power-rankings')) {
          completeness.powerRankings = Array.isArray(data?.tennisPowerRankings) && data.tennisPowerRankings.length > 0;
        }
      }
    }
    
    // Se c'è syncData usa quella
    if (savedData.dataCompleteness) {
      Object.assign(completeness, savedData.dataCompleteness);
    }
    
    // Calcola % completezza
    const fields = [completeness.event, completeness.pointByPoint, completeness.statistics, completeness.powerRankings];
    completeness.total = Math.round((fields.filter(Boolean).length / fields.length) * 100);
    
    // Status partita
    let matchStatus = 'unknown';
    if (savedData.api) {
      for (const [url, data] of Object.entries(savedData.api)) {
        if (data?.event?.status?.type) {
          matchStatus = data.event.status.type;
          break;
        }
      }
    }
    
    res.json({
      found: true,
      fileName,
      matchStatus,
      lastSync: completeness.lastSync,
      dataCompleteness: completeness,
      needsSync: completeness.total < 100 && matchStatus === 'finished'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/status/:id', (req, res) => {
  res.json({ status: getStatus(req.params.id) || 'unknown' });
});

app.get('/api/data/:id', (req, res) => {
  const id = req.params.id;
  
  // Prima controlla in memoria (job recente)
  let data = getData(id);
  
  // Se non trovato, prova a leggere dal file salvato
  if (!data) {
    const filePath = path.join(SCRAPES_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        console.error(`Errore lettura file ${filePath}:`, e.message);
      }
    }
  }
  
  if (!data) {
    return res.status(404).json({ status: 'not_found', error: `Match ${id} non trovato` });
  }
  
  res.json(data);
});

// List saved scrapes from data/scrapes directory
app.get('/api/scrapes', (req, res) => {
  const scrapesDir = path.join(__dirname, '..', 'data', 'scrapes');
  try {
    if (!fs.existsSync(scrapesDir)) {
      return res.json({ scrapes: [] });
    }
    const files = fs.readdirSync(scrapesDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(scrapesDir, f);
        const stat = fs.statSync(filePath);
        const id = f.replace('.json', '');
        
        // Try to extract basic info from file
        let info = { id, filename: f, createdAt: stat.mtime.toISOString(), size: stat.size };
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          // Try to find match info
          if (content.event) {
            info.home = content.event.homeTeam?.name || content.event.homeTeam?.shortName;
            info.away = content.event.awayTeam?.name || content.event.awayTeam?.shortName;
            info.tournament = content.event.tournament?.name;
          } else if (content.api) {
            // Search in API responses
            for (const [url, data] of Object.entries(content.api)) {
              if (data?.event?.homeTeam || data?.homeTeam) {
                const evt = data.event || data;
                info.home = evt.homeTeam?.name || evt.homeTeam?.shortName;
                info.away = evt.awayTeam?.name || evt.awayTeam?.shortName;
                info.tournament = evt.tournament?.name;
                break;
              }
            }
          }
        } catch (e) {
          // ignore parse errors
        }
        return info;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest first
    
    res.json({ scrapes: files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load a specific saved scrape
app.get('/api/scrapes/:id', (req, res) => {
  const scrapesDir = path.join(__dirname, '..', 'data', 'scrapes');
  const filePath = path.join(scrapesDir, `${req.params.id}.json`);
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Scrape not found' });
    }
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// VALUE INTERPRETATION ENDPOINTS
// ============================================================================

/**
 * POST /api/interpret-value
 * Interpreta un singolo valore di game
 * Body: { serving, scoring, value, breakOccurred, description }
 */
app.post('/api/interpret-value', (req, res) => {
  try {
    const gameData = req.body;
    if (gameData.value === undefined) {
      return res.status(400).json({ error: 'Missing value field' });
    }
    const interpretation = interpretGameValue(gameData);
    res.json(interpretation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/analyze-power-rankings
 * Analizza un array di tennisPowerRankings
 * Body: { powerRankings: [...] }
 */
app.post('/api/analyze-power-rankings', (req, res) => {
  try {
    const { powerRankings } = req.body;
    if (!Array.isArray(powerRankings)) {
      return res.status(400).json({ error: 'powerRankings must be an array' });
    }
    const analysis = analyzePowerRankings(powerRankings);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/value-thresholds
 * Restituisce le soglie di default per l'interpretazione
 */
app.get('/api/value-thresholds', (req, res) => {
  res.json(DEFAULT_THRESHOLDS);
});

/**
 * GET /api/value-zone/:value
 * Restituisce la zona di un valore specifico
 */
app.get('/api/value-zone/:value', (req, res) => {
  const value = parseFloat(req.params.value);
  if (isNaN(value)) {
    return res.status(400).json({ error: 'Invalid value' });
  }
  res.json({ value, zone: getValueZone(value) });
});

// ============================================================================
// POINT-BY-POINT LIVE ENDPOINTS
// ============================================================================

/**
 * GET /api/event/:eventId/point-by-point
 * Fetcha i dati point-by-point direttamente dall'API SofaScore
 */
app.get('/api/event/:eventId/point-by-point', async (req, res) => {
  const { eventId } = req.params;
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    const url = `https://www.sofascore.com/api/v1/event/${eventId}/point-by-point`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `SofaScore API returned ${response.status}`,
        pointByPoint: []
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Point-by-point fetch error:', err.message);
    res.status(500).json({ error: err.message, pointByPoint: [] });
  }
});

/**
 * GET /api/event/:eventId/statistics
 * Fetcha le statistiche dell'evento dall'API SofaScore
 */
app.get('/api/event/:eventId/statistics', async (req, res) => {
  const { eventId } = req.params;
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    const url = `https://www.sofascore.com/api/v1/event/${eventId}/statistics`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `SofaScore API returned ${response.status}`,
        statistics: []
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Statistics fetch error:', err.message);
    res.status(500).json({ error: err.message, statistics: [] });
  }
});

/**
 * GET /api/event/:eventId/power-rankings
 * Fetcha i dati tennisPowerRankings (momentum) dall'API SofaScore
 */
app.get('/api/event/:eventId/power-rankings', async (req, res) => {
  const { eventId } = req.params;
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    const url = `https://www.sofascore.com/api/v1/event/${eventId}/tennis-power-rankings`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `SofaScore API returned ${response.status}`,
        tennisPowerRankings: []
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Power rankings fetch error:', err.message);
    res.status(500).json({ error: err.message, tennisPowerRankings: [] });
  }
});

/**
 * GET /api/event/:eventId/live
 * Fetcha tutti i dati live in una sola chiamata (evento, punteggio, point-by-point, statistiche)
 */
app.get('/api/event/:eventId/live', async (req, res) => {
  const { eventId } = req.params;
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  const baseUrl = 'https://www.sofascore.com/api/v1/event';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json'
  };
  
  const result = {
    eventId,
    timestamp: new Date().toISOString(),
    event: null,
    pointByPoint: [],
    statistics: [],
    powerRankings: [],
    errors: []
  };
  
  // Fetch in parallelo per velocità
  const fetches = [
    // Event info
    fetch(`${baseUrl}/${eventId}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { result.event = data?.event || data; })
      .catch(e => result.errors.push({ endpoint: 'event', error: e.message })),
    
    // Point-by-point
    fetch(`${baseUrl}/${eventId}/point-by-point`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { result.pointByPoint = data?.pointByPoint || []; })
      .catch(e => result.errors.push({ endpoint: 'point-by-point', error: e.message })),
    
    // Statistics
    fetch(`${baseUrl}/${eventId}/statistics`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { result.statistics = data?.statistics || []; })
      .catch(e => result.errors.push({ endpoint: 'statistics', error: e.message })),
    
    // Power rankings
    fetch(`${baseUrl}/${eventId}/tennis-power-rankings`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { result.powerRankings = data?.tennisPowerRankings || []; })
      .catch(e => result.errors.push({ endpoint: 'power-rankings', error: e.message }))
  ];
  
  try {
    await Promise.all(fetches);
    res.json(result);
  } catch (err) {
    console.error('Live data fetch error:', err.message);
    res.status(500).json({ ...result, error: err.message });
  }
});

// WebSocket stats endpoint
app.get('/api/live/stats', (req, res) => {
  res.json(getLiveStats());
});

// ============================================================================
// DATABASE API ENDPOINTS
// ============================================================================

// Test database connection
app.get('/api/db/test', async (req, res) => {
  if (!supabaseClient) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const connected = await supabaseClient.testConnection();
    res.json({ connected, message: connected ? 'Database connected' : 'Connection failed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all matches with optional filters (trasforma in formato frontend)
app.get('/api/db/matches', async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { limit, offset, status, tournamentId, playerId, orderBy } = req.query;
    
    // Ottieni il conteggio totale
    const totalCount = await matchRepository.countMatches({ status, tournamentId, playerId });
    
    const dbMatches = await matchRepository.getMatches({
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      status,
      tournamentId: tournamentId ? parseInt(tournamentId) : undefined,
      playerId: playerId ? parseInt(playerId) : undefined,
      orderBy
    });
    
    // Trasforma i dati dal formato DB (snake_case) al formato frontend (camelCase)
    // Colonne view v_matches_full: home_name, away_name, home_country, away_country, home_ranking, away_ranking
    const matches = (dbMatches || []).map(m => ({
      id: m.id,
      eventId: m.id,
      sport: 'tennis',
      sportName: 'Tennis',
      tournament: m.tournament_name || '',
      category: m.tournament_category || '',
      homeTeam: {
        id: m.home_player_id,
        name: m.home_name || '',
        shortName: m.home_name || '',
        country: m.home_country || '',
        ranking: m.home_ranking || null
      },
      awayTeam: {
        id: m.away_player_id,
        name: m.away_name || '',
        shortName: m.away_name || '',
        country: m.away_country || '',
        ranking: m.away_ranking || null
      },
      homeScore: m.home_sets_won ? { current: m.home_sets_won } : null,
      awayScore: m.away_sets_won ? { current: m.away_sets_won } : null,
      status: {
        code: m.status_code,
        type: m.status_type,
        description: m.status_description
      },
      startTimestamp: m.start_time ? Math.floor(new Date(m.start_time).getTime() / 1000) : null,
      winnerCode: m.winner_code,
      dataCompleteness: m.data_completeness || 50,
      source: 'database'
    }));
    
    res.json({ matches, count: matches.length, totalCount, source: 'database' });
  } catch (err) {
    console.error('Error fetching matches:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get single match with all related data
app.get('/api/db/matches/:id', async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const match = await matchRepository.getMatchById(parseInt(req.params.id));
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json(match);
  } catch (err) {
    console.error('Error fetching match:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get point-by-point for a match
app.get('/api/db/matches/:id/point-by-point', async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const pbp = await matchRepository.getPointByPoint(parseInt(req.params.id));
    res.json({ pointByPoint: pbp });
  } catch (err) {
    console.error('Error fetching point-by-point:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get statistics for a match
app.get('/api/db/matches/:id/statistics', async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { period = 'ALL' } = req.query;
    const stats = await matchRepository.getStatistics(parseInt(req.params.id), period);
    res.json(stats);
  } catch (err) {
    console.error('Error fetching statistics:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all tournaments
app.get('/api/db/tournaments', async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const tournaments = await matchRepository.getTournaments();
    res.json({ tournaments });
  } catch (err) {
    console.error('Error fetching tournaments:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Search players
app.get('/api/db/players/search', async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { q, limit } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Missing search query (q)' });
    }
    const players = await matchRepository.searchPlayers(q, limit ? parseInt(limit) : 10);
    res.json({ players });
  } catch (err) {
    console.error('Error searching players:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get extraction logs
app.get('/api/db/logs', async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { limit } = req.query;
    const logs = await matchRepository.getExtractionLogs(limit ? parseInt(limit) : 20);
    res.json({ logs });
  } catch (err) {
    console.error('Error fetching logs:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// TRACKING & SYNC ENDPOINTS
// ============================================================================

/**
 * POST /api/track/:eventId - Aggiunge una partita al monitoraggio automatico
 */
app.post('/api/track/:eventId', (req, res) => {
  const { eventId } = req.params;
  const { status, startTimestamp } = req.body;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  const tracked = trackMatch(eventId, { status, startTimestamp });
  res.json({ 
    success: tracked, 
    eventId,
    message: tracked ? 'Match added to tracking' : 'Match already tracked'
  });
});

/**
 * DELETE /api/track/:eventId - Rimuove una partita dal monitoraggio
 */
app.delete('/api/track/:eventId', (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  const removed = untrackMatch(eventId);
  res.json({ 
    success: removed, 
    eventId,
    message: removed ? 'Match removed from tracking' : 'Match was not tracked'
  });
});

/**
 * GET /api/tracked - Lista tutte le partite monitorate
 */
app.get('/api/tracked', (req, res) => {
  const tracked = getTrackedMatches();
  res.json({ 
    matches: tracked, 
    count: tracked.length 
  });
});

/**
 * POST /api/sync/:eventId - Sincronizza manualmente i dati di una partita
 */
app.post('/api/sync/:eventId', async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    const result = await syncMatch(eventId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
});

/**
 * POST /api/scheduler/start - Avvia lo scheduler di monitoraggio
 */
app.post('/api/scheduler/start', (req, res) => {
  startScheduler();
  res.json({ success: true, message: 'Scheduler started' });
});

/**
 * POST /api/scheduler/stop - Ferma lo scheduler di monitoraggio
 */
app.post('/api/scheduler/stop', (req, res) => {
  stopScheduler();
  res.json({ success: true, message: 'Scheduler stopped' });
});

/**
 * GET /api/live/status - Stato completo del sistema live (ws + scheduler + tracking)
 */
app.get('/api/live/status', (req, res) => {
  const wsStats = getLiveStats();
  const tracked = getTrackedMatches();
  
  res.json({
    websocket: wsStats,
    tracking: {
      matches: tracked,
      count: tracked.length
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// HYBRID API - Leggi da DB con fallback a file/SofaScore
// ============================================================================

/**
 * GET /api/match/:eventId - API ibrida: DB -> File -> SofaScore live
 * Questa è l'API principale da usare nel frontend
 */
app.get('/api/match/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { forceRefresh } = req.query;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    // 1. Prova prima dal database
    if (matchRepository) {
      try {
        const dbMatch = await matchRepository.getMatchById(parseInt(eventId));
        if (dbMatch && !forceRefresh) {
          console.log(`📦 Match ${eventId} served from database`);
          return res.json({
            source: 'database',
            eventId,
            ...dbMatch,
            timestamp: new Date().toISOString()
          });
        }
      } catch (dbErr) {
        console.log(`⚠️ DB fetch failed for ${eventId}, trying file...`);
      }
    }
    
    // 2. Prova dai file salvati
    const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(SCRAPES_DIR, file), 'utf8'));
        if (content.api) {
          for (const [url, data] of Object.entries(content.api)) {
            if (url.includes(`/event/${eventId}`) || data?.event?.id === parseInt(eventId)) {
              console.log(`📁 Match ${eventId} served from file ${file}`);
              return res.json({
                source: 'file',
                eventId,
                fileName: file,
                api: content.api,
                liveData: content.liveData,
                lastSync: content.lastSync,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      } catch (e) { /* skip */ }
    }
    
    // 3. Se richiesto refresh o non trovato, fetch da SofaScore
    console.log(`🌐 Match ${eventId} fetching from SofaScore...`);
    const liveData = await fetchCompleteData(eventId);
    
    // Salva su DB se disponibile
    if (matchRepository && liveData.event) {
      try {
        const { saveMatchToDatabase } = require('./liveManager');
        await saveMatchToDatabase(eventId, liveData, 'api-fetch');
      } catch (saveErr) {
        console.error('Failed to save fetched data:', saveErr.message);
      }
    }
    
    res.json({
      source: 'sofascore',
      eventId,
      ...liveData,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`Error fetching match ${eventId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/match/:eventId/refresh - Forza aggiornamento da SofaScore e salva su DB
 */
app.get('/api/match/:eventId/refresh', async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }
  
  try {
    const result = await syncMatch(eventId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
});

// Optional: serve frontend in dev if needed
const PORT = process.env.PORT || 3001;
// GET /api/matches/merged - Prova prima il database, fallback ai file locali
app.get('/api/matches/merged', async (req, res) => {
  try {
    // Prova prima il database
    if (matchRepository) {
      try {
        const { limit, offset, status } = req.query;
        const dbMatches = await matchRepository.getMatches({
          limit: limit ? parseInt(limit) : 50,
          offset: offset ? parseInt(offset) : 0,
          status
        });
        
        if (dbMatches && dbMatches.length > 0) {
          const matches = dbMatches.map(m => ({
            id: m.id,
            eventId: m.id,
            sport: 'tennis',
            sportName: 'Tennis',
            tournament: m.tournament_name || '',
            category: m.tournament_category || '',
            homeTeam: {
              id: m.home_player_id,
              name: m.home_name || '',
              shortName: m.home_name || '',
              country: m.home_country || '',
              ranking: m.home_ranking || null
            },
            awayTeam: {
              id: m.away_player_id,
              name: m.away_name || '',
              shortName: m.away_name || '',
              country: m.away_country || '',
              ranking: m.away_ranking || null
            },
            homeScore: m.home_sets_won ? { current: m.home_sets_won } : null,
            awayScore: m.away_sets_won ? { current: m.away_sets_won } : null,
            status: {
              code: m.status_code,
              type: m.status_type,
              description: m.status_description
            },
            startTimestamp: m.start_time ? Math.floor(new Date(m.start_time).getTime() / 1000) : null,
            winnerCode: m.winner_code,
            dataCompleteness: m.data_completeness || 50,
            source: 'database'
          }));
          return res.json({ matches, count: matches.length, source: 'database' });
        }
      } catch (dbErr) {
        console.warn('⚠️ Database fetch failed, falling back to files:', dbErr.message);
      }
    }
    
    // Fallback: file locali
    const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
    const matches = [];
    const seenEventIds = new Set();
    
    for (const file of files) {
      try {
        const filePath = path.join(SCRAPES_DIR, file);
        const stats = fs.statSync(filePath);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        let eventData = null;
        if (content.api) {
          for (const [url, data] of Object.entries(content.api)) {
            if (url.match(/\/api\/v1\/event\/\d+$/) && data?.event) {
              eventData = data.event;
              break;
            }
          }
        }
        
        if (eventData && !seenEventIds.has(String(eventData.id))) {
          seenEventIds.add(String(eventData.id));
          matches.push({
            id: file.replace('.json', ''),
            fileDate: stats.mtime,
            eventId: eventData.id,
            sport: eventData.tournament?.category?.sport?.slug || 'tennis',
            sportName: eventData.tournament?.category?.sport?.name || 'Tennis',
            tournament: eventData.tournament?.uniqueTournament?.name || eventData.tournament?.name || '',
            category: eventData.tournament?.category?.name || '',
            homeTeam: {
              name: eventData.homeTeam?.name || '',
              shortName: eventData.homeTeam?.shortName || '',
              country: eventData.homeTeam?.country?.alpha2 || '',
              ranking: eventData.homeTeam?.ranking || null
            },
            awayTeam: {
              name: eventData.awayTeam?.name || '',
              shortName: eventData.awayTeam?.shortName || '',
              country: eventData.awayTeam?.country?.alpha2 || '',
              ranking: eventData.awayTeam?.ranking || null
            },
            homeScore: eventData.homeScore || null,
            awayScore: eventData.awayScore || null,
            status: getRealisticStatus(eventData.status, eventData.startTimestamp, eventData.winnerCode) || { type: 'unknown' },
            startTimestamp: eventData.startTimestamp || null,
            winnerCode: eventData.winnerCode || null,
            dataCompleteness: calculateDataCompleteness(content.api, eventData.id) || 50,
            source: 'files'
          });
        }
      } catch (fileErr) {
        console.warn(`⚠️ Error reading file ${file}:`, fileErr.message);
      }
    }
    
    res.json({ matches, count: matches.length, source: 'files' });
  } catch (err) {
    console.error('Error in /api/matches/merged:', err.message);
    res.status(500).json({ error: err.message });
  }
});

server.listen(PORT, () => {
  console.info(`🚀 Scraper backend listening on port ${PORT} (HTTP + WebSocket)`);
  
  // Avvia scheduler per monitoraggio automatico partite
  console.log('🕐 Starting match monitoring scheduler...');
  startScheduler();
});
