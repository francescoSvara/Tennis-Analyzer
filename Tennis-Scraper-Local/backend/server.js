import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { scrapeEvent, getStatus, getData, getError, getEventId, extractEventId, directFetch } from './scraper.js';
import { 
  checkDuplicate, 
  insertMatch, 
  getMatches, 
  getStats, 
  getMatchesWithCompleteness, 
  getRecentTournaments, 
  getMatchIdsByTournament, 
  getMatchCompleteness,
  // Funzioni per detected_matches
  ensureDetectedMatchesTable,
  upsertDetectedMatches,
  markMatchAsAcquired,
  getAdvancedStats,
  getMissingMatches,
  getDetectedMatchesByTournament,
  // Nuove funzioni per sync e mass scan
  syncAcquiredMatches,
  getUniqueTournaments
} from './db/matchRepository.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

/**
 * POST /api/scrape
 * Endpoint principale per lo scraping di un match
 * 
 * FILOSOFIA ACQUISIZIONE OSSESSIVA:
 * - SEMPRE fa scrape completo, anche se il match esiste già
 * - SEMPRE aggiorna tutti i dati (match, players, tournament, scores, stats)
 * - SEMPRE scansiona l'intero torneo dopo ogni acquisizione
 * - MAI ritorna "duplicato" - ogni richiesta = aggiornamento dati
 */
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL richiesto' });
  }
  
  try {
    // Estrai eventId per logging
    const eventId = extractEventId(url);
    
    // Controlla se esiste già (solo per logging, NON per bloccare)
    let isUpdate = false;
    let existingMatch = null;
    if (eventId) {
      existingMatch = await checkDuplicate(eventId);
      isUpdate = !!existingMatch;
    }
    
    console.log(`🎾 ${isUpdate ? '♻️ AGGIORNAMENTO' : '🆕 NUOVO'} scraping per: ${url}`);
    
    // SEMPRE avvia lo scraping completo
    const id = await scrapeEvent(url);
    
    // Attendi il completamento (max 60 secondi)
    let attempts = 0;
    let status = getStatus(id);
    
    while (status === 'running' && attempts < 120) {
      await new Promise(r => setTimeout(r, 500));
      status = getStatus(id);
      attempts++;
    }
    
    if (status === 'error') {
      const error = getError(id);
      return res.status(500).json({ error: error || 'Errore durante lo scraping' });
    }
    
    if (status !== 'completed') {
      return res.status(504).json({ error: 'Timeout durante lo scraping' });
    }
    
    // Ottieni i dati
    const data = getData(id);
    
    // Controlla se SofaScore ha restituito errore 403
    if (data?.api) {
      for (const [endpoint, response] of Object.entries(data.api)) {
        if (response?.error?.code === 403) {
          return res.status(503).json({
            error: 'blocked',
            message: 'SofaScore ha bloccato la richiesta anche da locale.',
            hint: 'Prova a usare una VPN o attendi qualche minuto'
          });
        }
      }
    }
    
    // Estrai tournament info
    let tournamentId = null;
    let tournamentName = null;
    
    if (data?.api) {
      for (const [apiUrl, response] of Object.entries(data.api)) {
        if (response?.event?.tournament?.uniqueTournament) {
          tournamentId = response.event.tournament.uniqueTournament.id;
          tournamentName = response.event.tournament.uniqueTournament.name;
          break;
        }
      }
    }
    
    // SEMPRE inserisci/aggiorna nel database (upsert)
    const match = await insertMatch(data);
    
    if (!match) {
      return res.status(500).json({ error: 'Errore durante il salvataggio nel database' });
    }
    
    // Estrai nomi per la risposta
    let homeTeam = 'Unknown';
    let awayTeam = 'Unknown';
    
    if (data?.mapping?.home?.name) homeTeam = data.mapping.home.name;
    if (data?.mapping?.away?.name) awayTeam = data.mapping.away.name;
    
    // Risposta con info su nuovo/aggiornato
    res.json({
      success: true,
      id,
      isUpdate,
      match: {
        homeTeam,
        awayTeam,
        eventId: getEventId(id)
      },
      dbId: match.id,
      tournamentId,
      tournamentName,
      message: isUpdate 
        ? `♻️ Match aggiornato: ${homeTeam} vs ${awayTeam}` 
        : `✅ Match acquisito: ${homeTeam} vs ${awayTeam}`
    });
    
    // === FILOSOFIA ACQUISIZIONE OSSESSIVA ===
    // Dopo aver salvato il match, scansiona l'INTERO torneo in background
    // e salva TUTTE le partite in detected_matches
    if (tournamentId) {
      console.log(`🔍 [CASCADE] Scansione automatica torneo ${tournamentId} (${tournamentName})`);
      cascadeTournamentScan(tournamentId, tournamentName, match.id).catch(err => {
        console.error('❌ [CASCADE] Errore scansione torneo:', err.message);
      });
    }
    
  } catch (err) {
    console.error('❌ Errore scraping:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * CASCADE SCAN - Scansiona un torneo e salva tutto in detected_matches
 * Questa funzione viene chiamata automaticamente dopo ogni scrape
 */
async function cascadeTournamentScan(tournamentId, tournamentName, acquiredMatchId) {
  try {
    // Fetch seasons
    const seasonsUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/seasons`;
    const seasonsData = await directFetch(seasonsUrl);
    
    if (!seasonsData.seasons || seasonsData.seasons.length === 0) {
      console.log(`   [CASCADE] Nessuna stagione trovata per torneo ${tournamentId}`);
      return;
    }
    
    const currentSeason = seasonsData.seasons[0];
    let allEvents = [];
    
    // Fetch last e next events
    const lastUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${currentSeason.id}/events/last/0`;
    const nextUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${currentSeason.id}/events/next/0`;
    
    const [lastData, nextData] = await Promise.all([
      directFetch(lastUrl).catch(() => ({ events: [] })),
      directFetch(nextUrl).catch(() => ({ events: [] }))
    ]);
    
    if (lastData.events) allEvents.push(...lastData.events);
    if (nextData.events) allEvents.push(...nextData.events);
    
    // Rimuovi duplicati
    const uniqueEvents = [];
    const seenIds = new Set();
    for (const event of allEvents) {
      if (!seenIds.has(event.id)) {
        seenIds.add(event.id);
        uniqueEvents.push(event);
      }
    }
    
    console.log(`   [CASCADE] Trovati ${uniqueEvents.length} eventi nel torneo`);
    
    // Salva in detected_matches
    const result = await upsertDetectedMatches(uniqueEvents, tournamentId, tournamentName);
    console.log(`   [CASCADE] Salvati: ${result.inserted} nuovi, ${result.updated} aggiornati`);
    
    // Marca il match appena acquisito
    if (acquiredMatchId) {
      await markMatchAsAcquired(acquiredMatchId);
      console.log(`   [CASCADE] Match ${acquiredMatchId} marcato come acquisito`);
    }
    
  } catch (err) {
    console.error(`   [CASCADE] Errore: ${err.message}`);
  }
}

/**
 * GET /api/matches
 * Lista dei match recenti dal database con percentuale completamento
 */
app.get('/api/matches', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const withCompleteness = req.query.completeness === 'true';
    
    if (withCompleteness) {
      const matches = await getMatchesWithCompleteness(limit);
      res.json(matches);
    } else {
      const matches = await getMatches(limit);
      res.json(matches);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/match/:id/completeness
 * Percentuale completamento di un singolo match
 */
app.get('/api/match/:id/completeness', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const completeness = await getMatchCompleteness(matchId);
    res.json(completeness);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/recent-tournaments
 * Tornei recenti con partite (ultimi 7 giorni)
 */
app.get('/api/recent-tournaments', async (req, res) => {
  try {
    const tournaments = await getRecentTournaments();
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/missing-matches
 * Partite mancanti dai tornei recenti
 */
app.get('/api/missing-matches', async (req, res) => {
  try {
    // Ottieni tornei recenti
    const tournaments = await getRecentTournaments();
    
    if (tournaments.length === 0) {
      return res.json({ tournaments: [], missingMatches: [] });
    }
    
    const allMissingMatches = [];
    const tournamentsWithMissing = [];
    
    for (const tournament of tournaments) {
      // Ottieni ID match esistenti per questo torneo
      const existingIds = await getMatchIdsByTournament(tournament.id);
      
      // Fetch eventi dal torneo da SofaScore
      try {
        const seasonsUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournament.id}/seasons`;
        const seasonsData = await directFetch(seasonsUrl);
        
        if (seasonsData.seasons && seasonsData.seasons.length > 0) {
          const currentSeason = seasonsData.seasons[0];
          
          // Prova last e next events
          const lastEventsUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournament.id}/season/${currentSeason.id}/events/last/0`;
          const lastData = await directFetch(lastEventsUrl);
          
          if (lastData.events) {
            for (const event of lastData.events) {
              if (!existingIds.has(event.id)) {
                allMissingMatches.push({
                  ...event,
                  tournamentId: tournament.id,
                  tournamentName: tournament.name
                });
              }
            }
          }
        }
        
        if (allMissingMatches.some(m => m.tournamentId === tournament.id)) {
          tournamentsWithMissing.push(tournament);
        }
      } catch (e) {
        console.error(`Errore fetch eventi torneo ${tournament.id}:`, e.message);
      }
    }
    
    res.json({ 
      tournaments: tournamentsWithMissing, 
      missingMatches: allMissingMatches 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/stats
 * Statistiche sui match
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Tennis Scraper Local attivo'
  });
});

/**
 * GET /api/tournament-events/:tournamentId
 * Recupera tutti gli eventi di un torneo da SofaScore
 */
app.get('/api/tournament-events/:tournamentId', async (req, res) => {
  const { tournamentId } = req.params;
  
  if (!tournamentId) {
    return res.status(400).json({ error: 'Tournament ID richiesto' });
  }
  
  try {
    console.log(`🏆 Recupero eventi torneo: ${tournamentId}`);
    
    // Try multiple API endpoints
    const endpoints = [
      // Current season events
      `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${tournamentId}/events/last/0`,
      `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/events/last/0`,
      // Try to get seasons first
      `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/seasons`,
    ];
    
    let events = [];
    let foundEvents = false;
    
    // First try to get seasons to find current season
    const seasonsUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/seasons`;
    console.log(`   Provando: ${seasonsUrl}`);
    const seasonsData = await directFetch(seasonsUrl);
    
    if (seasonsData.seasons && seasonsData.seasons.length > 0) {
      // Get latest season
      const currentSeason = seasonsData.seasons[0];
      console.log(`   Stagione corrente: ${currentSeason.name} (ID: ${currentSeason.id})`);
      
      // Try last and next events
      const lastEventsUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${currentSeason.id}/events/last/0`;
      const nextEventsUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${currentSeason.id}/events/next/0`;
      
      console.log(`   Provando last events: ${lastEventsUrl}`);
      const lastData = await directFetch(lastEventsUrl);
      if (lastData.events) {
        events = [...events, ...lastData.events];
        foundEvents = true;
      }
      
      console.log(`   Provando next events: ${nextEventsUrl}`);
      const nextData = await directFetch(nextEventsUrl);
      if (nextData.events) {
        events = [...events, ...nextData.events];
        foundEvents = true;
      }
    }
    
    // Fallback: try direct endpoints
    if (!foundEvents) {
      for (const url of endpoints.slice(0, 2)) {
        console.log(`   Provando fallback: ${url}`);
        const data = await directFetch(url);
        if (data.events && data.events.length > 0) {
          events = data.events;
          foundEvents = true;
          break;
        }
      }
    }
    
    // Remove duplicates by ID
    const uniqueEvents = [];
    const seenIds = new Set();
    for (const event of events) {
      if (!seenIds.has(event.id)) {
        seenIds.add(event.id);
        uniqueEvents.push(event);
      }
    }
    
    console.log(`   Trovati ${uniqueEvents.length} eventi unici`);
    res.json({ events: uniqueEvents });
    
  } catch (err) {
    console.error('❌ Errore recupero torneo:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/test-fetch
 * Test diretto di fetch SofaScore
 */
app.post('/api/test-fetch', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL richiesto' });
  }
  
  try {
    const data = await directFetch(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================
// NUOVI ENDPOINT - Sistema detected_matches
// ===========================================

/**
 * GET /api/advanced-stats
 * Statistiche avanzate basate su detected_matches
 */
app.get('/api/advanced-stats', async (req, res) => {
  try {
    const stats = await getAdvancedStats();
    res.json(stats);
  } catch (err) {
    console.error('❌ Errore advanced-stats:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/detected-matches
 * Inserisce/aggiorna partite rilevate da SofaScore
 */
app.post('/api/detected-matches', async (req, res) => {
  const { matches, tournamentId, tournamentName } = req.body;
  
  if (!matches || !Array.isArray(matches)) {
    return res.status(400).json({ error: 'Array matches richiesto' });
  }
  
  try {
    const result = await upsertDetectedMatches(matches, tournamentId, tournamentName);
    res.json(result);
  } catch (err) {
    console.error('❌ Errore upsert detected matches:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/detected-missing
 * Ottiene le partite rilevate ma non ancora acquisite
 */
app.get('/api/detected-missing', async (req, res) => {
  try {
    const missing = await getMissingMatches();
    res.json({ matches: missing });
  } catch (err) {
    console.error('❌ Errore get missing matches:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/detected-matches/:tournamentId
 * Ottiene le partite rilevate per un torneo specifico
 */
app.get('/api/detected-matches/:tournamentId', async (req, res) => {
  const { tournamentId } = req.params;
  
  try {
    const matches = await getDetectedMatchesByTournament(parseInt(tournamentId));
    res.json({ matches });
  } catch (err) {
    console.error('❌ Errore get detected by tournament:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/mark-acquired/:matchId
 * Segna una partita come acquisita
 */
app.post('/api/mark-acquired/:matchId', async (req, res) => {
  const { matchId } = req.params;
  
  try {
    const result = await markMatchAsAcquired(parseInt(matchId));
    res.json(result);
  } catch (err) {
    console.error('❌ Errore mark acquired:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scan-tournament/:tournamentId
 * Scansiona un torneo e salva TUTTE le partite in detected_matches
 */
app.post('/api/scan-tournament/:tournamentId', async (req, res) => {
  const { tournamentId } = req.params;
  const { tournamentName } = req.body;
  
  try {
    console.log(`🔍 Scansione torneo: ${tournamentId} (${tournamentName || 'Nome sconosciuto'})`);
    
    // Fetch eventi dal torneo
    const seasonsUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/seasons`;
    const seasonsData = await directFetch(seasonsUrl);
    
    let allEvents = [];
    
    if (seasonsData.seasons && seasonsData.seasons.length > 0) {
      const currentSeason = seasonsData.seasons[0];
      
      // Fetch last e next events
      const lastUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${currentSeason.id}/events/last/0`;
      const nextUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${currentSeason.id}/events/next/0`;
      
      const [lastData, nextData] = await Promise.all([
        directFetch(lastUrl).catch(() => ({ events: [] })),
        directFetch(nextUrl).catch(() => ({ events: [] }))
      ]);
      
      if (lastData.events) allEvents.push(...lastData.events);
      if (nextData.events) allEvents.push(...nextData.events);
    }
    
    // Rimuovi duplicati
    const uniqueEvents = [];
    const seenIds = new Set();
    for (const event of allEvents) {
      if (!seenIds.has(event.id)) {
        seenIds.add(event.id);
        uniqueEvents.push(event);
      }
    }
    
    console.log(`   Trovati ${uniqueEvents.length} eventi unici`);
    
    // Salva in detected_matches
    const name = tournamentName || seasonsData.seasons?.[0]?.name || `Torneo ${tournamentId}`;
    const result = await upsertDetectedMatches(uniqueEvents, parseInt(tournamentId), name);
    
    // Sincronizza subito gli acquisiti
    await syncAcquiredMatches();
    
    res.json({
      success: true,
      tournamentId,
      tournamentName: name,
      eventsFound: uniqueEvents.length,
      ...result
    });
    
  } catch (err) {
    console.error('❌ Errore scan tournament:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sync-acquired
 * Sincronizza detected_matches con matches esistenti
 * Marca come acquired tutte le partite già presenti in matches
 */
app.post('/api/sync-acquired', async (req, res) => {
  try {
    console.log('🔄 Sincronizzazione acquired matches...');
    const result = await syncAcquiredMatches();
    res.json(result);
  } catch (err) {
    console.error('❌ Errore sync acquired:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/mass-scan
 * Scansiona TUTTI i tornei unici e salva tutto in detected_matches
 * FILOSOFIA ACQUISIZIONE OSSESSIVA - Accumula TUTTI i dati possibili
 */
app.post('/api/mass-scan', async (req, res) => {
  try {
    console.log('🚀 [MASS SCAN] Avvio scansione massiva di tutti i tornei...');
    
    // Ottieni tutti i tornei unici dalla tabella matches
    const tournaments = await getUniqueTournaments();
    console.log(`   [MASS SCAN] Trovati ${tournaments.length} tornei unici`);
    
    const results = {
      tournamentsScanned: 0,
      totalEventsDetected: 0,
      errors: []
    };
    
    // Scansiona ogni torneo
    for (const tournament of tournaments) {
      try {
        const seasonsUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournament.id}/seasons`;
        const seasonsData = await directFetch(seasonsUrl);
        
        if (!seasonsData.seasons || seasonsData.seasons.length === 0) {
          continue;
        }
        
        const currentSeason = seasonsData.seasons[0];
        let allEvents = [];
        
        const lastUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournament.id}/season/${currentSeason.id}/events/last/0`;
        const nextUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournament.id}/season/${currentSeason.id}/events/next/0`;
        
        const [lastData, nextData] = await Promise.all([
          directFetch(lastUrl).catch(() => ({ events: [] })),
          directFetch(nextUrl).catch(() => ({ events: [] }))
        ]);
        
        if (lastData.events) allEvents.push(...lastData.events);
        if (nextData.events) allEvents.push(...nextData.events);
        
        // Rimuovi duplicati
        const uniqueEvents = [];
        const seenIds = new Set();
        for (const event of allEvents) {
          if (!seenIds.has(event.id)) {
            seenIds.add(event.id);
            uniqueEvents.push(event);
          }
        }
        
        // Salva in detected_matches
        await upsertDetectedMatches(uniqueEvents, tournament.id, tournament.name);
        
        results.tournamentsScanned++;
        results.totalEventsDetected += uniqueEvents.length;
        
        console.log(`   [MASS SCAN] ${tournament.name}: ${uniqueEvents.length} eventi`);
        
        // Piccola pausa per non sovraccaricare SofaScore
        await new Promise(r => setTimeout(r, 300));
        
      } catch (err) {
        results.errors.push({ tournamentId: tournament.id, error: err.message });
      }
    }
    
    // Sincronizza acquired
    await syncAcquiredMatches();
    
    console.log(`✅ [MASS SCAN] Completato: ${results.tournamentsScanned} tornei, ${results.totalEventsDetected} eventi`);
    res.json(results);
    
  } catch (err) {
    console.error('❌ Errore mass scan:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`
🎾 Tennis Scraper Local
========================
Server: http://localhost:${PORT}
Health: http://localhost:${PORT}/api/health

🧠 FILOSOFIA: Acquisizione Ossessiva dei Dati
   Ogni azione accumula dati nel DB!

Endpoints:
  POST /api/scrape              - Scrape match + cascade scan torneo
  GET  /api/matches             - Lista match recenti
  GET  /api/stats               - Statistiche base
  GET  /api/advanced-stats      - Statistiche avanzate (detected_matches)
  POST /api/detected-matches    - Salva partite rilevate
  GET  /api/detected-missing    - Partite non acquisite
  POST /api/scan-tournament/:id - Scansiona torneo e salva in DB
  POST /api/mark-acquired/:id   - Segna partita come acquisita
  POST /api/sync-acquired       - Sincronizza acquired con matches
  POST /api/mass-scan           - Scansiona TUTTI i tornei
  POST /api/test-fetch          - Test fetch diretto

Avvia il frontend con: npm run client
  `);
  
  // Server pronto!
  console.log('✅ Server avviato correttamente');
});