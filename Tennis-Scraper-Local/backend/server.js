import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
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
  getProblematicMatches,
  // Funzioni per detected_matches
  ensureDetectedMatchesTable,
  upsertDetectedMatches,
  markMatchAsAcquired,
  getAdvancedStats,
  getMissingMatches,
  getDetectedMatchesByTournament,
  // Nuove funzioni per sync e mass scan
  syncAcquiredMatches,
  getUniqueTournaments,
  // Funzioni per refresh count
  updateRefreshCount,
  markMatchAsForceComplete,
  // SVG Momentum
  insertPowerRankingsSvg,
  insertPowerRankingsMainTable,
  // Funzioni per data quality / pending
  getPendingMatches,
  getPartialMatches,
  markMatchAsComplete,
  getCompletenessStats
} from './db/matchRepository.js';
import { processSvgMomentum } from './utils/svgMomentumExtractor.js';
import { extractPointByPoint, parseDetailedPbp, combineSvgAndPbp, generateSimulatedPoints } from './utils/pbpExtractor.js';
import { supabase } from './db/supabase.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Aumenta limite per SVG grandi

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
  const { url, incrementRefreshCount } = req.body;
  
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
    
    // Se è un refresh per match problematico, incrementa il contatore
    let newRefreshCount = 0;
    if (incrementRefreshCount && existingMatch) {
      newRefreshCount = (existingMatch.refresh_count || 0) + 1;
      
      // Se siamo al 3° refresh, marca come completo e ritorna subito
      if (newRefreshCount >= 3) {
        await markMatchAsForceComplete(eventId, newRefreshCount);
        console.log(`✅ Match ${eventId} marcato come completo dopo ${newRefreshCount} refresh`);
        return res.json({
          success: true,
          isUpdate: true,
          refreshCount: newRefreshCount,
          forcedComplete: true,
          message: `Match marcato come completo dopo ${newRefreshCount} tentativi`
        });
      }
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
    
    // SEMPRE inserisci/aggiorna nel database (upsert) - SOLO SofaScore
    const match = await insertMatch(data);
    
    if (!match) {
      return res.status(500).json({ error: 'Errore durante il salvataggio nel database' });
    }
    
    // Se è un refresh per problematico, aggiorna il contatore
    if (incrementRefreshCount && newRefreshCount > 0) {
      await updateRefreshCount(match.id, newRefreshCount);
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
      refreshCount: newRefreshCount,
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
 * Partite mancanti - LEGGE SOLO DA DB (detected_matches)
 * 
 * FILOSOFIA DB: Mai chiamare API per visualizzazione!
 * Per aggiornare i dati usare POST /api/mass-scan o POST /api/scan-tournament/:id
 */
app.get('/api/missing-matches', async (req, res) => {
  try {
    // Legge SOLO da detected_matches (nessuna chiamata API)
    const result = await getMissingMatches();
    
    if (result.error === 'table_not_exists') {
      // Tabella non esiste, ritorna vuoto (l'utente deve fare mass-scan)
      return res.json({ 
        tournaments: [], 
        missingMatches: [],
        message: 'Tabella detected_matches non esiste. Eseguire mass-scan per popolare.'
      });
    }
    
    const missingMatches = result.matches || [];
    
    // Raggruppa per torneo per compatibilità con frontend
    const tournamentMap = new Map();
    for (const m of missingMatches) {
      if (m.tournament_id && !tournamentMap.has(m.tournament_id)) {
        tournamentMap.set(m.tournament_id, {
          id: m.tournament_id,
          name: m.tournament_name || `Torneo ${m.tournament_id}`
        });
      }
    }
    
    // Trasforma in formato compatibile con frontend
    const formattedMatches = missingMatches.map(m => ({
      id: m.id,
      homeTeam: { name: m.home_team_name || 'TBD' },
      awayTeam: { name: m.away_team_name || 'TBD' },
      status: { description: m.status || 'Unknown' },
      startTimestamp: m.start_time ? new Date(m.start_time).getTime() / 1000 : null,
      tournamentId: m.tournament_id,
      tournamentName: m.tournament_name,
      roundInfo: m.round_name ? { name: m.round_name } : null
    }));
    
    console.log(`📊 Partite mancanti da DB: ${formattedMatches.length} (zero chiamate API)`);
    
    res.json({ 
      tournaments: Array.from(tournamentMap.values()), 
      missingMatches: formattedMatches,
      source: 'database'
    });
  } catch (err) {
    console.error('❌ Errore missing-matches:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/problematic-matches
 * Restituisce partite con completeness < 100%
 * Ordinate dalla meno completa alla più completa
 */
app.get('/api/problematic-matches', async (req, res) => {
  try {
    const matches = await getProblematicMatches();
    console.log(`⚠️ Partite problematiche trovate: ${matches.length}`);
    res.json({ 
      count: matches.length,
      matches: matches
    });
  } catch (err) {
    console.error('❌ Errore problematic-matches:', err);
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
 * POST /api/increment-refresh/:eventId
 * Incrementa SOLO il contatore refresh di un match problematico
 * NON fa scraping - operazione leggera solo DB
 * Al 3° tentativo marca come force_completed
 */
app.post('/api/increment-refresh/:eventId', async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Event ID richiesto' });
  }
  
  try {
    // Recupera il match esistente
    const existingMatch = await checkDuplicate(eventId);
    
    if (!existingMatch) {
      return res.status(404).json({ error: 'Match non trovato' });
    }
    
    // DEBUG: mostra cosa legge dal DB
    console.log(`   → checkDuplicate returned:`, JSON.stringify(existingMatch));
    
    const currentCount = existingMatch.refresh_count ?? 0;
    const newRefreshCount = currentCount + 1;
    
    // Se al 3° tentativo, marca come force completed
    if (newRefreshCount >= 3) {
      await markMatchAsForceComplete(eventId, newRefreshCount);
      console.log(`✅ Match ${eventId} marcato force_completed dopo ${newRefreshCount} refresh`);
      return res.json({
        success: true,
        eventId,
        refreshCount: newRefreshCount,
        forceCompleted: true,
        message: `Match marcato come completo dopo ${newRefreshCount} tentativi`
      });
    }
    
    // Altrimenti incrementa solo il contatore
    const updated = await updateRefreshCount(eventId, newRefreshCount);
    if (!updated) {
      console.error(`❌ Fallito update refresh_count per ${eventId}`);
    }
    console.log(`🔄 Match ${eventId} refresh count: ${newRefreshCount}/3 (saved: ${updated})`);
    
    return res.json({
      success: true,
      eventId,
      refreshCount: newRefreshCount,
      forceCompleted: false
    });
    
  } catch (err) {
    console.error('Error incrementing refresh count:', err);
    return res.status(500).json({ error: 'Errore interno' });
  }
});

/**
 * POST /api/mark-complete/:eventId
 * Marca un match come completato (max info ottenute)
 * Usato quando l'utente conferma che non può ottenere più dati
 */
app.post('/api/mark-complete/:eventId', async (req, res) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Event ID richiesto' });
  }
  
  try {
    // Recupera il match esistente
    const existingMatch = await checkDuplicate(eventId);
    
    if (!existingMatch) {
      return res.status(404).json({ error: 'Match non trovato' });
    }
    
    // Marca come force completed
    await markMatchAsForceComplete(eventId, 0); // 0 = completato manualmente
    console.log(`✅ Match ${eventId} marcato manualmente come completato`);
    
    return res.json({
      success: true,
      eventId,
      message: 'Match marcato come completato'
    });
    
  } catch (err) {
    console.error('Error marking match complete:', err);
    return res.status(500).json({ error: 'Errore interno' });
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
 * POST /api/scan-all-tournaments
 * Scansiona SOLO i tornei dei match già nel DB e aggiorna detected_matches
 * Usa questo per aggiornare il DB prima di vedere i missing
 * 
 * FILOSOFIA: Le chiamate API vanno fatte SOLO quando l'utente lo richiede esplicitamente
 */
app.post('/api/scan-all-tournaments', async (req, res) => {
  try {
    console.log('🔄 [SCAN] Scansione tornei dai match esistenti...');
    
    // Ottieni tornei unici dalla tabella matches
    const tournaments = await getUniqueTournaments();
    console.log(`   [SCAN] Trovati ${tournaments.length} tornei unici`);
    
    if (tournaments.length === 0) {
      return res.json({ 
        success: true, 
        tournamentsScanned: 0, 
        message: 'Nessun torneo da scansionare' 
      });
    }
    
    let scanned = 0;
    let totalEvents = 0;
    
    for (const tournament of tournaments) {
      try {
        const seasonsUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournament.id}/seasons`;
        const seasonsData = await directFetch(seasonsUrl);
        
        if (!seasonsData.seasons || seasonsData.seasons.length === 0) continue;
        
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
        
        // Deduplica
        const uniqueEvents = [];
        const seenIds = new Set();
        for (const event of allEvents) {
          if (!seenIds.has(event.id)) {
            seenIds.add(event.id);
            uniqueEvents.push(event);
          }
        }
        
        await upsertDetectedMatches(uniqueEvents, tournament.id, tournament.name);
        scanned++;
        totalEvents += uniqueEvents.length;
        
        console.log(`   [SCAN] ${tournament.name}: ${uniqueEvents.length} eventi`);
        
        // Pausa per non sovraccaricare SofaScore
        await new Promise(r => setTimeout(r, 200));
        
      } catch (err) {
        console.error(`   [SCAN] Errore ${tournament.name}:`, err.message);
      }
    }
    
    // Sincronizza acquired
    await syncAcquiredMatches();
    
    console.log(`✅ [SCAN] Completato: ${scanned} tornei, ${totalEvents} eventi`);
    res.json({ 
      success: true, 
      tournamentsScanned: scanned, 
      totalEventsDetected: totalEvents 
    });
    
  } catch (err) {
    console.error('❌ Errore scan-all-tournaments:', err);
    res.status(500).json({ error: err.message });
  }
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

/**
 * POST /api/match/:eventId/momentum-svg
 * Inserisce momentum estratto da SVG DOM di SofaScore
 * Usato come fallback quando l'API non restituisce tennisPowerRankings
 * 
 * IMPORTANTE: Salva in ENTRAMBE le tabelle:
 * - match_power_rankings_new (con localMatchId) per coerenza locale
 * - power_rankings (con sofascoreId) per l'app React principale
 */
app.post('/api/match/:eventId/momentum-svg', async (req, res) => {
  const { eventId } = req.params;
  const { svgHtml, dryRun, localMatchId, sofascoreId } = req.body;
  
  // Determina quale ID usare per ogni tabella
  const sofascoreEventId = sofascoreId || parseInt(eventId);
  const localId = localMatchId || parseInt(eventId);
  
  console.log(`📊 [SVG MOMENTUM] Richiesta - SofaScore ID: ${sofascoreEventId}, Local ID: ${localId}, dryRun=${!!dryRun}`);
  
  if (!svgHtml) {
    return res.status(400).json({ error: 'svgHtml è richiesto' });
  }
  
  try {
    // Estrai e normalizza i dati SVG
    const result = processSvgMomentum(svgHtml);
    
    if (!result.ok) {
      console.log(`❌ [SVG MOMENTUM] Errore estrazione: ${result.error}`);
      return res.status(400).json({ error: result.error });
    }
    
    console.log(`✅ [SVG MOMENTUM] Estratti ${result.gamesCount} games da ${result.setsCount} set`);
    
    // Se dryRun, restituisci solo l'anteprima senza salvare
    if (dryRun) {
      return res.json({
        ok: true,
        gamesCount: result.gamesCount,
        setsCount: result.setsCount,
        preview: result.powerRankings.slice(0, 5) // Solo primi 5 per preview
      });
    }
    
    // Salva in match_power_rankings_new (tabella locale) con localId
    const insertedCountNew = await insertPowerRankingsSvg(localId, result.powerRankings);
    console.log(`✅ [SVG MOMENTUM] Salvati ${insertedCountNew} in match_power_rankings_new (ID: ${localId})`);
    
    // Salva ANCHE in power_rankings (tabella per app React) con sofascoreEventId
    let insertedCountMain = 0;
    try {
      insertedCountMain = await insertPowerRankingsMainTable(sofascoreEventId, result.powerRankings);
      console.log(`✅ [SVG MOMENTUM] Salvati ${insertedCountMain} in power_rankings (SofaScore ID: ${sofascoreEventId})`);
    } catch (mainErr) {
      console.warn(`⚠️ [SVG MOMENTUM] Errore salvataggio power_rankings: ${mainErr.message}`);
    }
    
    res.json({
      ok: true,
      insertedCount: insertedCountNew,
      insertedCountMain,
      gamesCount: result.gamesCount,
      setsCount: result.setsCount,
      sofascoreId: sofascoreEventId,
      localId: localId,
      message: `Salvati ${insertedCountNew} punti momentum SVG (+ ${insertedCountMain} in tabella principale)`
    });
    
  } catch (err) {
    console.error(`❌ [SVG MOMENTUM] Errore:`, err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// POINT-BY-POINT EXTRACTION ENDPOINTS
// ============================================================================

/**
 * POST /api/match/:localId/pbp
 * Upload HTML point-by-point e salva nel database
 * Collegato a un match specifico tramite localId
 */
app.post('/api/match/:localId/pbp', async (req, res) => {
  const { localId } = req.params;
  const { html, dryRun } = req.body;
  
  if (!html) {
    return res.status(400).json({ error: 'HTML point-by-point required in body' });
  }
  
  try {
    // Trova sofascoreEventId dal match locale
    const { data: match, error: matchError } = await supabase
      .from('matches_new')
      .select('sofascore_id')
      .eq('id', parseInt(localId))
      .single();
    
    const sofascoreId = match?.sofascore_id || parseInt(localId);
    
    console.log(`📋 [PBP] Estrazione point-by-point per match ${localId} (SofaScore: ${sofascoreId})`);
    
    // Estrai punti dall'HTML
    const basicResult = extractPointByPoint(html);
    const detailedResult = parseDetailedPbp(html);
    
    console.log(`✅ [PBP] Estratti: ${basicResult.points?.length || 0} score patterns, ${detailedResult.totalPoints || 0} punti dettagliati`);
    
    if (dryRun) {
      return res.json({
        ok: true,
        preview: {
          basic: basicResult,
          detailed: detailedResult
        },
        localId,
        sofascoreId
      });
    }
    
    // Salva i punti nel database
    const insertedCount = await insertPointByPointData(sofascoreId, detailedResult.points || basicResult.points || []);
    
    res.json({
      ok: true,
      insertedCount,
      pointsExtracted: detailedResult.totalPoints || basicResult.points?.length || 0,
      localId,
      sofascoreId,
      message: `Salvati ${insertedCount} punti point-by-point`
    });
    
  } catch (err) {
    console.error(`❌ [PBP] Errore:`, err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/match/:localId/enrich
 * Arricchisce un match combinando dati SVG + PBP
 * Genera punti simulati se PBP non disponibile
 * 
 * Supporta sia localId che sofascoreId direttamente
 */
app.post('/api/match/:localId/enrich', async (req, res) => {
  const { localId } = req.params;
  const { svgHtml, pbpHtml, generatePoints, sofascoreId: providedSofascoreId } = req.body;
  
  try {
    // Determina sofascoreId:
    // 1. Se fornito nel body, usa quello
    // 2. Altrimenti cerca nel DB
    // 3. Fallback: usa localId
    let sofascoreId = providedSofascoreId;
    
    if (!sofascoreId) {
      // Cerca prima in matches_new
      const { data: match } = await supabase
        .from('matches_new')
        .select('id')
        .eq('id', parseInt(localId))
        .single();
      
      // Se il localId è > 1000000, probabilmente è già un SofaScore ID
      if (parseInt(localId) > 1000000) {
        sofascoreId = parseInt(localId);
      } else {
        sofascoreId = match?.sofascore_id || parseInt(localId);
      }
    }
    
    console.log(`🔧 [ENRICH] Arricchimento match ${localId} (SofaScore: ${sofascoreId})`);
    
    // 1. Estrai/recupera dati SVG
    let svgData = [];
    if (svgHtml) {
      const svgResult = processSvgMomentum(svgHtml);
      if (svgResult.ok) {
        svgData = svgResult.powerRankings;
        console.log(`  ✅ SVG: ${svgData.length} games estratti`);
      }
    } else {
      // Recupera SVG esistente dal DB
      const { data: existingSvg } = await supabase
        .from('match_power_rankings_new')
        .select('*')
        .eq('match_id', sofascoreId)
        .order('set_number')
        .order('game_number');
      
      if (existingSvg?.length) {
        svgData = existingSvg.map(r => ({
          set: r.set_number,
          game: r.game_number,
          value: r.value,
          value_svg: r.value
        }));
        console.log(`  ✅ SVG da DB: ${svgData.length} games`);
      }
    }
    
    // 2. Estrai dati PBP se forniti
    let pbpData = [];
    if (pbpHtml) {
      const pbpResult = parseDetailedPbp(pbpHtml);
      if (pbpResult.ok) {
        pbpData = pbpResult.points || [];
        console.log(`  ✅ PBP: ${pbpData.length} punti estratti`);
      }
    }
    
    // 3. Calcola server/winner per ogni game dai dati SVG
    const enrichedGames = svgData.map(g => {
      const setNum = g.set;
      const gameNum = g.game;
      const value = g.value_svg || g.value || 0;
      
      // Server: Away serve first in set 1 (come già calcolato)
      const awayServesFirstInSet = setNum % 2 === 1;
      const isOddGame = gameNum % 2 === 1;
      const serverNum = awayServesFirstInSet 
        ? (isOddGame ? 2 : 1)
        : (isOddGame ? 1 : 2);
      
      const gameServer = serverNum === 1 ? 'home' : 'away';
      const gameWinner = value >= 0 ? 'home' : 'away';
      const gameIsBreak = gameServer !== gameWinner;
      
      return {
        ...g,
        gameServer,
        gameWinner,
        gameIsBreak,
        points: []
      };
    });
    
    // 4. Se generatePoints è true, genera punti simulati
    if (generatePoints && enrichedGames.length > 0 && pbpData.length === 0) {
      console.log(`  🎲 Generazione punti simulati...`);
      for (const game of enrichedGames) {
        game.points = generateSimulatedPoints(game);
      }
    }
    
    // 5. Combina SVG + PBP se abbiamo entrambi
    if (pbpData.length > 0) {
      const combined = combineSvgAndPbp(enrichedGames, pbpData);
      if (combined.ok) {
        console.log(`  ✅ Combinati: ${combined.totalGames} games, ${combined.totalPoints} punti`);
      }
    }
    
    // 6. Salva i dati arricchiti nel DB
    const savedCount = await saveEnrichedMatchData(sofascoreId, enrichedGames);
    
    res.json({
      ok: true,
      localId,
      sofascoreId,
      gamesCount: enrichedGames.length,
      games: enrichedGames,
      savedCount,
      message: `Match ${localId} arricchito con ${enrichedGames.length} games`
    });
    
  } catch (err) {
    console.error(`❌ [ENRICH] Errore:`, err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/match/:localId/full-data
 * Restituisce tutti i dati del match: SVG + PBP combinati
 */
app.get('/api/match/:localId/full-data', async (req, res) => {
  const { localId } = req.params;
  
  try {
    // Trova sofascoreEventId
    const { data: match } = await supabase
      .from('matches_new')
      .select('*')
      .eq('id', parseInt(localId))
      .single();
    
    const sofascoreId = match?.sofascore_id || parseInt(localId);
    
    // Recupera dati SVG
    const { data: svgData } = await supabase
      .from('match_power_rankings_new')
      .select('*')
      .eq('match_id', sofascoreId)
      .order('set_number')
      .order('game_number');
    
    // Recupera dati PBP
    const { data: pbpData } = await supabase
      .from('point_by_point')
      .select('*')
      .eq('match_id', sofascoreId)
      .order('set_number')
      .order('game_number')
      .order('point_number');
    
    // Combina
    const games = (svgData || []).map(svg => {
      const gamePoints = (pbpData || []).filter(
        p => p.set_number === svg.set_number && p.game_number === svg.game_number
      );
      
      const value = svg.value || 0;
      const awayServesFirstInSet = svg.set_number % 2 === 1;
      const isOddGame = svg.game_number % 2 === 1;
      const serverNum = awayServesFirstInSet 
        ? (isOddGame ? 2 : 1)
        : (isOddGame ? 1 : 2);
      
      return {
        set: svg.set_number,
        game: svg.game_number,
        momentum: value,
        gameServer: serverNum === 1 ? 'home' : 'away',
        gameWinner: value >= 0 ? 'home' : 'away',
        gameIsBreak: (serverNum === 1 ? 'home' : 'away') !== (value >= 0 ? 'home' : 'away'),
        points: gamePoints
      };
    });
    
    res.json({
      ok: true,
      match: {
        localId,
        sofascoreId,
        ...match
      },
      games,
      totalGames: games.length,
      totalPoints: games.reduce((sum, g) => sum + g.points.length, 0)
    });
    
  } catch (err) {
    console.error(`❌ [FULL-DATA] Errore:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Helper: Salva punti PBP nel database
async function insertPointByPointData(matchId, points) {
  if (!points || points.length === 0) return 0;
  
  let insertedCount = 0;
  
  for (const point of points) {
    const { error } = await supabase
      .from('point_by_point')
      .insert({
        match_id: matchId,
        set_number: point.set || 1,
        game_number: point.game || 1,
        point_number: point.pointNumber || insertedCount + 1,
        home_score: point.homeScore,
        away_score: point.awayScore,
        point_winner: point.pointWinner === 'home' ? 1 : (point.pointWinner === 'away' ? 2 : null),
        point_type: point.type || 'regular',
        is_break_point: point.type === 'breakPoint',
        is_set_point: point.type === 'setPoint',
        is_match_point: point.type === 'matchPoint',
        source: 'pbp_html'
      });
    
    if (!error) insertedCount++;
  }
  
  return insertedCount;
}

// Helper: Salva dati arricchiti
async function saveEnrichedMatchData(matchId, games) {
  if (!games || games.length === 0) return 0;
  
  let savedCount = 0;
  
  for (const game of games) {
    // Aggiorna power_rankings con dati arricchiti
    const { error: prError } = await supabase
      .from('match_power_rankings_new')
      .upsert({
        match_id: matchId,
        set_number: game.set,
        game_number: game.game,
        value: game.value || game.value_svg,
        zone: game.zone || 'balanced',
        break_occurred: game.gameIsBreak || false
      }, { onConflict: 'match_id,set_number,game_number' });
    
    if (!prError) savedCount++;
    
    // Salva punti simulati/reali se presenti
    if (game.points && game.points.length > 0) {
      for (let i = 0; i < game.points.length; i++) {
        const point = game.points[i];
        await supabase
          .from('point_by_point')
          .upsert({
            match_id: matchId,
            set_number: game.set,
            game_number: game.game,
            point_number: i + 1,
            home_score: point.homeScore,
            away_score: point.awayScore,
            point_winner: point.pointWinner === 'home' ? 1 : (point.pointWinner === 'away' ? 2 : null),
            point_type: point.type || 'simulated',
            source: point.type === 'simulated' ? 'generated' : 'pbp_html'
          }, { onConflict: 'match_id,set_number,game_number,point_number' });
      }
    }
  }
  
  return savedCount;
}

/**
 * GET /api/find-sofascore-id/:localMatchId
 * Trova l'ID SofaScore originale cercando in detected_matches
 * tramite i nomi dei giocatori del match locale
 */
app.get('/api/find-sofascore-id/:localMatchId', async (req, res) => {
  const { localMatchId } = req.params;
  
  try {
    // Prima ottieni il match locale con i nomi dei giocatori
    const { data: match, error: matchError } = await supabase
      .from('matches_new')
      .select(`
        id,
        player1_id,
        player2_id
      `)
      .eq('id', parseInt(localMatchId))
      .single();
    
    if (matchError || !match) {
      return res.json({ sofascoreId: null, error: 'Match locale non trovato' });
    }
    
    // Ottieni i nomi dei giocatori
    const [p1Res, p2Res] = await Promise.all([
      match.player1_id ? supabase.from('players_new').select('name').eq('id', match.player1_id).single() : { data: null },
      match.player2_id ? supabase.from('players_new').select('name').eq('id', match.player2_id).single() : { data: null }
    ]);
    
    const player1Name = p1Res.data?.name || '';
    const player2Name = p2Res.data?.name || '';
    
    if (!player1Name || !player2Name) {
      return res.json({ sofascoreId: null, error: 'Nomi giocatori non trovati' });
    }
    
    console.log(`🔍 Cercando SofaScore ID per: ${player1Name} vs ${player2Name}`);
    
    // Cerca in detected_matches usando i nomi dei giocatori
    const { data: detected, error: detectedError } = await supabase
      .from('detected_matches')
      .select('id, home_team_name, away_team_name')
      .or(`home_team_name.ilike.%${player1Name}%,away_team_name.ilike.%${player1Name}%`)
      .limit(10);
    
    if (detectedError || !detected || detected.length === 0) {
      return res.json({ sofascoreId: null, error: 'Match non trovato in detected_matches' });
    }
    
    // Trova il match che corrisponde a entrambi i giocatori
    const matchingDetected = detected.find(d => {
      const homeMatch = d.home_team_name?.toLowerCase().includes(player1Name.toLowerCase()) ||
                       d.home_team_name?.toLowerCase().includes(player2Name.toLowerCase());
      const awayMatch = d.away_team_name?.toLowerCase().includes(player1Name.toLowerCase()) ||
                       d.away_team_name?.toLowerCase().includes(player2Name.toLowerCase());
      return homeMatch && awayMatch;
    });
    
    if (matchingDetected) {
      console.log(`✅ Trovato SofaScore ID: ${matchingDetected.id}`);
      return res.json({ 
        sofascoreId: matchingDetected.id,
        player1Name,
        player2Name
      });
    }
    
    return res.json({ sofascoreId: null, error: 'Match non corrisponde in detected_matches' });
    
  } catch (err) {
    console.error('Errore ricerca SofaScore ID:', err);
    res.json({ sofascoreId: null, error: err.message });
  }
});

// ============================================================================
// ENDPOINTS DATA QUALITY / PENDING MATCHES
// ============================================================================

/**
 * GET /api/matches/pending
 * Ottieni match con dati insufficienti (data_quality < 50)
 * Questi match sono in ATTESA di completamento
 */
app.get('/api/matches/pending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const matches = await getPendingMatches(limit);
    
    res.json({
      count: matches.length,
      status: 'pending',
      description: 'Match con dati insufficienti, in attesa di completamento',
      matches
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/matches/partial
 * Ottieni match con dati parziali (data_quality >= 50 e < 80)
 * Questi match sono USABILI ma non completi
 */
app.get('/api/matches/partial', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const matches = await getPartialMatches(limit);
    
    res.json({
      count: matches.length,
      status: 'partial',
      description: 'Match con dati parziali, usabili ma incompleti',
      matches
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/completeness-stats
 * Statistiche di completezza del database
 */
app.get('/api/completeness-stats', async (req, res) => {
  try {
    const stats = await getCompletenessStats();
    
    res.json({
      ...stats,
      summary: {
        '🔴 Pending (< 50%)': `${stats.pending} match (${stats.pendingPercentage}%)`,
        '🟡 Partial (50-79%)': `${stats.partial} match (${stats.partialPercentage}%)`,
        '✅ Complete (≥ 80%)': `${stats.complete} match (${stats.completePercentage}%)`
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/matches/:id/mark-complete
 * Marca manualmente un match come completo
 * Usato quando l'utente decide che i dati sono sufficienti
 */
app.post('/api/matches/:id/mark-complete', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const success = await markMatchAsComplete(matchId);
    
    if (success) {
      res.json({
        ok: true,
        message: `Match ${matchId} marcato come COMPLETO (data_quality = 100)`
      });
    } else {
      res.status(500).json({ error: 'Errore nel marcare il match come completo' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/matches/:id/link-sofascore
 * Collega un match esistente a un link SofaScore e aggiorna i dati
 * Body: { sofascoreUrl: "https://www.sofascore.com/it/tennis/match/..." }
 */
app.post('/api/matches/:id/link-sofascore', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const { sofascoreUrl } = req.body;
    
    if (!sofascoreUrl) {
      return res.status(400).json({ error: 'sofascoreUrl è richiesto' });
    }
    
    // Estrai event ID dal URL
    // Formato: https://www.sofascore.com/.../KtNsmDnb#id:14968724
    const idMatch = sofascoreUrl.match(/#id:(\d+)/);
    if (!idMatch) {
      return res.status(400).json({ 
        error: 'URL non valido. Formato atteso: https://www.sofascore.com/.../match/...#id:XXXXXX' 
      });
    }
    
    const sofascoreId = parseInt(idMatch[1]);
    console.log(`🔗 Collegamento match ${matchId} a SofaScore ID ${sofascoreId}`);
    
    // Scrape dati da SofaScore
    const result = await scrapeEvent(sofascoreUrl);
    
    if (!result.ok) {
      return res.status(500).json({ 
        error: `Errore scraping: ${result.error}`,
        sofascoreId 
      });
    }
    
    // Aggiorna il match nel DB con i nuovi dati
    // Per ora restituiamo i dati scaricati, l'utente può usare l'endpoint /momentum-svg per il SVG
    res.json({
      ok: true,
      matchId,
      sofascoreId,
      message: `Dati SofaScore collegati. Usa /api/match/${matchId}/momentum-svg per aggiungere momentum SVG.`,
      data: {
        hasEvent: !!result.data?.event,
        hasStatistics: !!result.data?.statistics,
        hasPowerRankings: !!result.data?.powerRankings
      }
    });
    
  } catch (err) {
    console.error('❌ Errore link-sofascore:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/batch-scrape
 * Esegue batch scraping di partite da SofaScore
 * Recupera partite finite di oggi e ieri, filtra per tornei importanti
 */
app.post('/api/batch-scrape', async (req, res) => {
  const { daysBack = 1, maxMatches = 20 } = req.body;
  
  console.log('🎾 Batch Scraping avviato...');
  
  try {
    // Headers per SofaScore
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    
    // Genera date da controllare
    const dates = [];
    const today = new Date();
    for (let i = 0; i <= daysBack; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }
    
    // Recupera tutte le partite
    const allMatches = [];
    for (const date of dates) {
      console.log(`📅 Recupero partite del ${date}...`);
      try {
        const resp = await fetch(`https://api.sofascore.com/api/v1/sport/tennis/scheduled-events/${date}`, { headers });
        if (resp.ok) {
          const data = await resp.json();
          if (data.events) {
            const finished = data.events.filter(e => 
              e.status?.type === 'finished' || e.status?.type === 'inprogress'
            );
            allMatches.push(...finished);
          }
        }
      } catch (err) {
        console.error(`Errore per ${date}:`, err.message);
      }
    }
    
    console.log(`📊 Trovate ${allMatches.length} partite finite/in corso`);
    
    // Filtra per tornei importanti (escludi ITF basso livello)
    const filteredMatches = allMatches.filter(m => {
      const tournamentName = m.tournament?.name || '';
      if (tournamentName.includes('M15') || tournamentName.includes('W15') || 
          tournamentName.includes('M25') || tournamentName.includes('W25')) {
        return false;
      }
      return true;
    });
    
    console.log(`📌 ${filteredMatches.length} dopo filtro (esclusi ITF M15/W15/M25/W25)`);
    
    // Limita il numero di match
    const toScrape = filteredMatches.slice(0, maxMatches);
    
    const results = {
      total: toScrape.length,
      success: 0,
      failed: 0,
      pending: 0,
      matches: []
    };
    
    // Scraping sequenziale con pausa
    for (const match of toScrape) {
      const matchUrl = `https://www.sofascore.com/it/tennis/match/${match.slug}/${match.customId}`;
      const eventId = match.id;
      const matchName = `${match.homeTeam?.name} vs ${match.awayTeam?.name}`;
      
      console.log(`🔄 Scraping: ${matchName}`);
      
      try {
        // Usa l'endpoint interno /api/scrape
        const urlWithId = `${matchUrl}#id:${eventId}`;
        
        // Simula una richiesta interna
        const existingMatch = await checkDuplicate(eventId);
        
        // Se già esiste, skippa
        if (existingMatch) {
          console.log(`   ⏭️ Già presente nel DB`);
          results.matches.push({ name: matchName, status: 'skipped', reason: 'already_exists' });
          continue;
        }
        
        // Fai lo scraping
        await scrapeEvent(urlWithId);
        const data = getData();
        const status = getStatus();
        const error = getError();
        
        if (status === 'success' && data) {
          // Inserisci nel DB
          const dbResult = await insertMatch(data, eventId);
          
          if (dbResult.error) {
            console.log(`   ❌ DB Error: ${dbResult.error}`);
            results.failed++;
            results.matches.push({ name: matchName, status: 'failed', error: dbResult.error });
          } else {
            console.log(`   ✅ Inserito: ${dbResult.matchId}`);
            results.success++;
            results.matches.push({ name: matchName, status: 'success', matchId: dbResult.matchId });
          }
        } else {
          console.log(`   ❌ Scrape failed: ${error || 'Unknown'}`);
          results.failed++;
          results.matches.push({ name: matchName, status: 'failed', error: error || 'scrape_failed' });
        }
        
        // Pausa per evitare rate limiting
        await new Promise(r => setTimeout(r, 1500));
        
      } catch (err) {
        console.error(`   ❌ Errore: ${err.message}`);
        results.failed++;
        results.matches.push({ name: matchName, status: 'failed', error: err.message });
      }
    }
    
    console.log(`\n========================================`);
    console.log(`✅ Completati: ${results.success}`);
    console.log(`❌ Falliti: ${results.failed}`);
    console.log(`========================================\n`);
    
    res.json(results);
    
  } catch (err) {
    console.error('❌ Batch scrape error:', err);
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
  POST /api/batch-scrape         - Batch scrape partite da SofaScore
  
  📊 DATA QUALITY:
  GET  /api/matches/pending     - Match in attesa (quality < 50%)
  GET  /api/matches/partial     - Match parziali (quality 50-79%)
  GET  /api/completeness-stats  - Statistiche completezza DB
  POST /api/matches/:id/mark-complete - Marca match come completo

Avvia il frontend con: npm run client
  `);
  
  // Server pronto!
  console.log('✅ Server avviato correttamente');
});