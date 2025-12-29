/**
 * DATA NORMALIZER SERVICE
 *
 * Centralizza la normalizzazione di tutti i dati in ingresso:
 * - Nomi giocatori (Sinner J. -> Jannik Sinner)
 * - Superfici (Hardcourt indoor -> Hard)
 * - Tornei (Turin -> ATP Finals Turin)
 * - Date
 *
 * Genera fingerprint univoci per deduplicazione match
 */

const path = require('path');
const fs = require('fs');
const { createLogger } = require('../utils/logger');

const logger = createLogger('DataNormalizer');

// ============================================
// PLAYER NAME MAPPINGS
// ============================================

// Mapping COMPLETO per TUTTI i giocatori ATP (204 mapping)
const PLAYER_NAME_MAPPINGS = {
  // === TOP PLAYERS ===
  'Sinner J.': 'Jannik Sinner',
  'Alcaraz C.': 'Carlos Alcaraz',
  'Djokovic N.': 'Novak Djokovic',
  'Medvedev D.': 'Daniil Medvedev',
  'Zverev A.': 'Alexander Zverev',
  'Rublev A.': 'Andrey Rublev',
  'Ruud C.': 'Casper Ruud',
  'Fritz T.': 'Taylor Fritz',
  'De Minaur A.': 'Alex De Minaur',
  'Tsitsipas S.': 'Stefanos Tsitsipas',
  'Hurkacz H.': 'Hubert Hurkacz',
  'Dimitrov G.': 'Grigor Dimitrov',
  'Paul T.': 'Tommy Paul',
  'Tiafoe F.': 'Frances Tiafoe',
  'Shelton B.': 'Ben Shelton',
  'Draper J.': 'Jack Draper',
  'Musetti L.': 'Lorenzo Musetti',
  'Berrettini M.': 'Matteo Berrettini',
  'Auger-Aliassime F.': 'Felix Auger-Aliassime',
  'Humbert U.': 'Ugo Humbert',
  'Lehecka J.': 'Jiri Lehecka',
  'Bublik A.': 'Alexander Bublik',
  'Khachanov K.': 'Karen Khachanov',
  'Korda S.': 'Sebastian Korda',
  'Cerundolo F.': 'Francisco Cerundolo',
  'Jarry N.': 'Nicolas Jarry',
  'Baez S.': 'Sebastian Baez',
  'Thompson J.': 'Jordan Thompson',
  'Tabilo A.': 'Alejandro Tabilo',
  'Nakashima B.': 'Brandon Nakashima',
  'Arnaldi M.': 'Matteo Arnaldi',
  'Machac T.': 'Tomas Machac',
  'Mensik J.': 'Jakub Mensik',
  'Fils A.': 'Arthur Fils',
  'Cobolli F.': 'Flavio Cobolli',
  'Popyrin A.': 'Alexei Popyrin',
  'Nishikori K.': 'Kei Nishikori',
  'Murray A.': 'Andy Murray',
  'Nadal R.': 'Rafael Nadal',
  'Federer R.': 'Roger Federer',
  'Wawrinka S.': 'Stan Wawrinka',
  'Monfils G.': 'Gael Monfils',

  // === TUTTI GLI ALTRI GIOCATORI ATP ===
  'Albot R.': 'Radu Albot',
  'Altmaier D.': 'Daniel Altmaier',
  'Arseneault N.': 'Nathan Arseneault',
  'Baadi T.': 'Toby Baadi',
  'Barrere G.': 'Gregoire Barrere',
  'Barrios M.': 'Marcelo Barrios Vera',
  'Basavareddy N.': 'Nishesh Basavareddy',
  'Basilashvili N.': 'Nikoloz Basilashvili',
  'Bautista Agut R.': 'Roberto Bautista Agut',
  'Becroft I.': 'Isaac Becroft',
  'Bellucci M.': 'Mattia Bellucci',
  'Benchetrit E.': 'Elliot Benchetrit',
  'Bergs Z.': 'Zizou Bergs',
  'Blanchet U.': 'Ugo Blanchet',
  'Blockx A.': 'Alexander Blockx',
  'Bonzi B.': 'Benjamin Bonzi',
  'Borges N.': 'Nuno Borges',
  'Boyer T.': 'Titouan Boyer',
  'Brooksby J.': 'Jenson Brooksby',
  'Bu Y.': 'Yunchaokete Bu',
  'Burruchaga R.': 'Roman Burruchaga',
  'Buse I.': 'Ignacio Buse',
  'Carballes Baena R.': 'Roberto Carballes Baena',
  'Carreno Busta P.': 'Pablo Carreno Busta',
  'Cazaux A.': 'Arthur Cazaux',
  'Chidekh C.': 'Clement Chidekh',
  'Cilic M.': 'Marin Cilic',
  'Cina F.': 'Federico Cina',
  'Collignon R.': 'Raphael Collignon',
  'Comesana F.': 'Francisco Comesana',
  'Coria F.': 'Federico Coria',
  'Coric B.': 'Borna Coric',
  'Daniel T.': 'Taro Daniel',
  'Darderi L.': 'Luciano Darderi',
  'Davidovich Fokina A.': 'Alejandro Davidovich Fokina',
  'De Jong J.': 'Jesper De Jong',
  'Dellien H.': 'Hugo Dellien',
  'Denolly C.': 'Corentin Denolly',
  'Diallo G.': 'Gabriel Diallo',
  'Diaz Acosta F.': 'Facundo Diaz Acosta',
  'Djere L.': 'Laslo Djere',
  'Dougaz A.': 'Aziz Dougaz',
  'Duckworth J.': 'James Duckworth',
  'Dzumhur D.': 'Damir Dzumhur',
  'Etcheverry T.': 'Tomas Etcheverry',
  'Eubanks C.': 'Christopher Eubanks',
  'Evans D.': 'Daniel Evans',
  'Faria J.': 'Jaime Faria',
  'Fearnley J.': 'Jacob Fearnley',
  'Fognini F.': 'Fabio Fognini',
  'Fonseca J.': 'Joao Fonseca',
  'Fucsovics M.': 'Marton Fucsovics',
  'Garin C.': 'Cristian Garin',
  'Gasquet R.': 'Richard Gasquet',
  'Gaston H.': 'Hugo Gaston',
  'Gea A.': 'Alvaro Gea',
  'Gigante M.': 'Matteo Gigante',
  'Giron M.': 'Marcos Giron',
  'Goffin D.': 'David Goffin',
  'Gojo B.': 'Borna Gojo',
  'Gomez F.': 'Federico Gomez',
  'Grenier H.': 'Hugo Grenier',
  'Griekspoor T.': 'Tallon Griekspoor',
  'Guinard M.': 'Manuel Guinard',
  'Habib H.': 'Hady Habib',
  'Halys Q.': 'Quentin Halys',
  'Hanfmann Y.': 'Yannick Hanfmann',
  'Harris B.': 'Billy Harris',
  'Heide G.': 'Gustavo Heide',
  'Herbert P.': 'Pierre-Hugues Herbert',
  'Hijikata R.': 'Rinky Hijikata',
  'Holt B.': 'Brandon Holt',
  'Jasika O.': 'Omar Jasika',
  'Kachmazov A.': 'Alibek Kachmazov',
  'Kecmanovic M.': 'Miomir Kecmanovic',
  'Klizan M.': 'Martin Klizan',
  'Koepfer D.': 'Dominik Koepfer',
  'Kokkinakis T.': 'Thanasi Kokkinakis',
  'Kopriva V.': 'Vit Kopriva',
  'Kotov P.': 'Pavel Kotov',
  'Kovacevic A.': 'Aleksandar Kovacevic',
  'Krueger M.': 'Mitchell Krueger',
  'Kukushkin M.': 'Mikhail Kukushkin',
  'Kyrgios N.': 'Nick Kyrgios',
  'Lajovic D.': 'Dusan Lajovic',
  'Lalami Laaroussi Y.': 'Younes Lalami Laaroussi',
  'Landaluce M.': 'Martin Landaluce',
  'Lestienne C.': 'Constant Lestienne',
  'Majchrzak K.': 'Kamil Majchrzak',
  'Mannarino A.': 'Adrian Mannarino',
  'Marozsan F.': 'Fabian Marozsan',
  'Martinez P.': 'Pedro Martinez',
  'Mayot H.': 'Harold Mayot',
  'Mccabe J.': 'John Mccabe',
  'Mcdonald M.': 'Mackenzie Mcdonald',
  'Medjedovic H.': 'Hamad Medjedovic',
  'Meligeni Alves F.': 'Felipe Meligeni Alves',
  'Michelsen A.': 'Alex Michelsen',
  'Misolic F.': 'Filip Misolic',
  'Mmoh M.': 'Michael Mmoh',
  'Monteiro T.': 'Thiago Monteiro',
  'Moro Canas A.': 'Albert Moro Canas',
  'Moutet C.': 'Corentin Moutet',
  'Mpetshi G.': 'Giovanni Mpetshi Perricard',
  'Muller A.': 'Alexandre Muller',
  'Munar J.': 'Jaume Munar',
  'Nagal S.': 'Sumit Nagal',
  'Nardi L.': 'Luca Nardi',
  'Nava E.': 'Emilio Nava',
  'Navone M.': 'Mariano Navone',
  'Nishioka Y.': 'Yoshihito Nishioka',
  'Norrie C.': 'Cameron Norrie',
  'O Connell C.': 'Christopher O Connell',
  'Onclin G.': 'Gilles Onclin',
  'Opelka R.': 'Reilly Opelka',
  'Pacheco Mendez R.': 'Rodrigo Pacheco Mendez',
  'Passaro F.': 'Francesco Passaro',
  'Popko D.': 'Dmitry Popko',
  'Pouille L.': 'Lucas Pouille',
  'Quinn E.': 'Ethan Quinn',
  'Rinderknech A.': 'Arthur Rinderknech',
  'Ritschard A.': 'Alexander Ritschard',
  'Rottgering M.': 'Mees Rottgering',
  'Royer V.': 'Valentin Royer',
  'Rune H.': 'Holger Rune',
  'Safiullin R.': 'Roman Safiullin',
  'Sakamoto R.': 'Ryo Sakamoto',
  'Samrej K.': 'Kasidit Samrej',
  'Schoolkate T.': 'Tristan Schoolkate',
  'Schwartzman D.': 'Diego Schwartzman',
  'Seyboth Wild T.': 'Thiago Seyboth Wild',
  'Shang J.': 'Juncheng Shang',
  'Shapovalov D.': 'Denis Shapovalov',
  'Shelbayh A.': 'Abedallah Shelbayh',
  'Shevchenko A.': 'Alexander Shevchenko',
  'Skatov T.': 'Timofey Skatov',
  'Smith C.': 'Connor Smith',
  'Sonego L.': 'Lorenzo Sonego',
  'Spizzirri E.': 'Eliot Spizzirri',
  'Stricker D.': 'Dominic Stricker',
  'Svajda T.': 'Tristan Svajda',
  'Svajda Z.': 'Zachary Svajda',
  'Tien L.': 'Learner Tien',
  'Tu L.': 'Li Tu',
  'Ugo Carabelli C.': 'Camilo Ugo Carabelli',
  'Vacherot V.': 'Valentin Vacherot',
  'Van Assche L.': 'Luca Van Assche',
  'Van De Zandschulp B.': 'Botic Van De Zandschulp',
  'Vavassori A.': 'Andrea Vavassori',
  'Virtanen O.': 'Otto Virtanen',
  'Vukic A.': 'Aleksandar Vukic',
  'Walton A.': 'Adam Walton',
  'Watanuki Y.': 'Yosuke Watanuki',
  'Wong C.': 'Coleman Wong',
  'Wu Y.': 'Yibing Wu',
  'Zeppieri G.': 'Giulio Zeppieri',

  // === AGGIUNTI DOPO PRIMA NORMALIZZAZIONE ===
  'Borg L.': 'Leo Borg',
  'Jacquet K.': 'Kyrian Jacquet',
  'Kypson P.': 'Patrick Kypson',
  'Prizmic D.': 'Dino Prizmic',
  'Ruusuvuori E.': 'Emil Ruusuvuori',
  'Tabur C.': 'Clement Tabur',

  // === NOMI CON FORMATO SPECIALE (iniziali multiple) ===
  'Cerundolo J.m.': 'Juan Manuel Cerundolo',
  'Ficovich J.p.': 'Juan Pablo Ficovich',
  'Galan D.e.': 'Daniel Elahi Galan',
  'Huesler M.a.': 'Marc-Andrea Huesler',
  'Struff J.l.': 'Jan-Lennard Struff',
  'Tirante T.a.': 'Thiago Agustin Tirante',
  'Trotter J.k.': 'JK Trotter',
  'Tseng C.h.': 'Chun-Hsin Tseng',
  'Zhang Zh.': 'Zhizhen Zhang',
};

// Reverse mapping (Jannik Sinner -> Sinner J.)
const REVERSE_MAPPINGS = Object.fromEntries(
  Object.entries(PLAYER_NAME_MAPPINGS).map(([k, v]) => [v.toLowerCase(), k])
);

// ============================================
// SURFACE MAPPINGS
// ============================================

const SURFACE_MAPPINGS = {
  // Varianti -> Standard
  'hardcourt indoor': 'Hard',
  'hardcourt outdoor': 'Hard',
  'hard indoor': 'Hard',
  'hard outdoor': 'Hard',
  hard: 'Hard',
  'indoor hard': 'Hard',
  'outdoor hard': 'Hard',
  clay: 'Clay',
  'red clay': 'Clay',
  'clay outdoor': 'Clay',
  grass: 'Grass',
  carpet: 'Carpet',
  indoor: 'Hard', // Default indoor = hard
};

// ============================================
// TOURNAMENT MAPPINGS
// ============================================

const TOURNAMENT_MAPPINGS = {
  // CittÃ /Nome breve -> Nome completo
  turin: 'ATP Finals',
  torino: 'ATP Finals',
  'atp finals': 'ATP Finals',
  london: 'ATP Finals', // Pre-2021
  melbourne: 'Australian Open',
  'australian open': 'Australian Open',
  paris: 'Roland Garros',
  'roland garros': 'Roland Garros',
  'french open': 'Roland Garros',
  wimbledon: 'Wimbledon',
  'new york': 'US Open',
  'us open': 'US Open',
  'flushing meadows': 'US Open',
  'indian wells': 'Indian Wells',
  'bnp paribas open': 'Indian Wells',
  miami: 'Miami Open',
  'miami open': 'Miami Open',
  'monte carlo': 'Monte Carlo',
  'monte-carlo': 'Monte Carlo',
  madrid: 'Madrid Open',
  'mutua madrid open': 'Madrid Open',
  rome: 'Italian Open',
  roma: 'Italian Open',
  'internazionali bnl': 'Italian Open',
  'italian open': 'Italian Open',
  canada: 'Canadian Open',
  toronto: 'Canadian Open',
  montreal: 'Canadian Open',
  'rogers cup': 'Canadian Open',
  cincinnati: 'Cincinnati',
  'western & southern': 'Cincinnati',
  shanghai: 'Shanghai Masters',
  'shanghai masters': 'Shanghai Masters',
};

// ============================================
// NORMALIZZAZIONE FUNZIONI
// ============================================

/**
 * Normalizza il nome di un giocatore
 * Input: "Sinner J.", "Jannik Sinner", "J. Sinner", "SINNER J."
 * Output: "Jannik Sinner" (formato standard)
 */
function normalizePlayerName(name) {
  if (!name) return '';

  // Trim e normalizza spazi
  let normalized = name.trim().replace(/\s+/g, ' ');

  // Check mapping diretto (xlsx format)
  if (PLAYER_NAME_MAPPINGS[normalized]) {
    return PLAYER_NAME_MAPPINGS[normalized];
  }

  // Check case-insensitive
  const lowerName = normalized.toLowerCase();
  for (const [short, full] of Object.entries(PLAYER_NAME_MAPPINGS)) {
    if (short.toLowerCase() === lowerName) {
      return full;
    }
    if (full.toLowerCase() === lowerName) {
      return full; // GiÃ  nel formato corretto
    }
  }

  // Prova a riconoscere pattern "Cognome X." -> cerca nel mapping
  const initialsMatch = normalized.match(/^([A-Za-z\-']+)\s+([A-Z])\.?$/);
  if (initialsMatch) {
    const [, lastName, firstInitial] = initialsMatch;
    // Cerca nel mapping un nome che corrisponde
    for (const [short, full] of Object.entries(PLAYER_NAME_MAPPINGS)) {
      const fullLower = full.toLowerCase();
      const lastNameLower = lastName.toLowerCase();
      if (
        fullLower.includes(lastNameLower) &&
        full.charAt(0).toUpperCase() === firstInitial.toUpperCase()
      ) {
        return full;
      }
    }
  }

  // Prova pattern "X. Cognome"
  const reverseMatch = normalized.match(/^([A-Z])\.?\s+([A-Za-z\-']+)$/);
  if (reverseMatch) {
    const [, firstInitial, lastName] = reverseMatch;
    for (const [short, full] of Object.entries(PLAYER_NAME_MAPPINGS)) {
      const fullLower = full.toLowerCase();
      const lastNameLower = lastName.toLowerCase();
      if (
        fullLower.includes(lastNameLower) &&
        full.charAt(0).toUpperCase() === firstInitial.toUpperCase()
      ) {
        return full;
      }
    }
  }

  // Se non trovato nel mapping, restituisci con Title Case
  return toTitleCase(normalized);
}

/**
 * Estrae il cognome da un nome (per fuzzy matching)
 */
function extractLastName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  // Il cognome Ã¨ solitamente l'ultimo, ma per nomi con "De", "Van", etc.
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    // Se Ã¨ un'iniziale, prendi il precedente
    if (last.length <= 2 && last.endsWith('.')) {
      return parts[parts.length - 2] || last;
    }
    return last;
  }
  return parts[0] || '';
}

/**
 * Normalizza la superficie
 */
function normalizeSurface(surface) {
  if (!surface) return 'Unknown';

  const lower = surface.toLowerCase().trim();

  // Check mapping
  if (SURFACE_MAPPINGS[lower]) {
    return SURFACE_MAPPINGS[lower];
  }

  // Partial match
  if (lower.includes('hard')) return 'Hard';
  if (lower.includes('clay')) return 'Clay';
  if (lower.includes('grass')) return 'Grass';
  if (lower.includes('carpet')) return 'Carpet';

  return toTitleCase(surface);
}

/**
 * Normalizza il nome del torneo
 */
function normalizeTournament(tournament) {
  if (!tournament) return '';

  const lower = tournament.toLowerCase().trim();

  // Check mapping
  if (TOURNAMENT_MAPPINGS[lower]) {
    return TOURNAMENT_MAPPINGS[lower];
  }

  // Partial match per tornei comuni
  for (const [key, value] of Object.entries(TOURNAMENT_MAPPINGS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value;
    }
  }

  return toTitleCase(tournament);
}

/**
 * Normalizza una data in formato YYYY-MM-DD
 */
function normalizeDate(date) {
  if (!date) return null;

  try {
    let d;

    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string') {
      // Prova vari formati
      d = new Date(date);
    } else if (typeof date === 'number') {
      // Excel serial date
      d = excelDateToJS(date);
    }

    if (isNaN(d.getTime())) return null;

    // Ritorna solo la data (ignora l'ora)
    return d.toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
}

/**
 * Converte data Excel serial a JS Date
 */
function excelDateToJS(serial) {
  // Excel date serial: giorni dal 1 gennaio 1900
  const utc_days = Math.floor(serial - 25569);
  return new Date(utc_days * 86400 * 1000);
}

// ============================================
// FINGERPRINT E DEDUPLICAZIONE
// ============================================

/**
 * Genera un fingerprint univoco per un match
 * Usato per identificare duplicati
 */
function generateMatchFingerprint(match) {
  // Normalizza i dati
  const date = normalizeDate(match.date || match.match_date);
  const player1 = normalizePlayerName(match.winner_name || match.player1 || match.home);
  const player2 = normalizePlayerName(match.loser_name || match.player2 || match.away);
  const tournament = normalizeTournament(match.tournament || match.tournament_name || '');

  // Ordina i giocatori alfabeticamente per consistenza
  const players = [player1, player2].sort();

  // Crea fingerprint
  const fingerprint = `${date}|${players[0]}|${players[1]}|${tournament}`.toLowerCase();

  return {
    fingerprint,
    normalized: {
      date,
      player1: players[0],
      player2: players[1],
      tournament,
    },
  };
}

/**
 * Confronta due match per vedere se sono lo stesso
 */
function areMatchesSame(match1, match2) {
  const fp1 = generateMatchFingerprint(match1);
  const fp2 = generateMatchFingerprint(match2);

  return fp1.fingerprint === fp2.fingerprint;
}

/**
 * Calcola similaritÃ  tra due stringhe (per fuzzy matching)
 */
function similarity(s1, s2) {
  if (!s1 || !s2) return 0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Fuzzy match per nomi giocatori
 * Ritorna true se probabilmente lo stesso giocatore
 */
function isSamePlayer(name1, name2, threshold = 0.8) {
  const n1 = normalizePlayerName(name1);
  const n2 = normalizePlayerName(name2);

  // Match esatto dopo normalizzazione
  if (n1.toLowerCase() === n2.toLowerCase()) return true;

  // Confronta cognomi
  const last1 = extractLastName(n1);
  const last2 = extractLastName(n2);

  if (last1.toLowerCase() === last2.toLowerCase()) {
    // Stesso cognome, probabilmente stesso giocatore
    return true;
  }

  // SimilaritÃ  generale
  return similarity(n1, n2) >= threshold;
}

// ============================================
// NORMALIZZAZIONE COMPLETA MATCH
// ============================================

/**
 * Normalizza tutti i campi di un match
 * Ritorna un oggetto con dati standardizzati
 */
function normalizeMatch(match, source = 'unknown') {
  const normalized = {
    // Identificazione
    source: source,
    original_id: match.id || match.event_id || match.sofascore_id || null,

    // Data
    match_date: normalizeDate(match.date || match.match_date || match.startTimestamp),

    // Giocatori (normalizzati)
    winner_name: normalizePlayerName(match.winner_name || match.winner || ''),
    loser_name: normalizePlayerName(match.loser_name || match.loser || ''),

    // Nomi originali (per debug)
    winner_name_original: match.winner_name || match.winner || '',
    loser_name_original: match.loser_name || match.loser || '',

    // Torneo
    tournament: normalizeTournament(match.tournament || match.tournament_name || ''),
    tournament_original: match.tournament || match.tournament_name || '',

    // Superficie
    surface: normalizeSurface(match.surface || match.ground_type || ''),
    surface_original: match.surface || match.ground_type || '',

    // Risultato
    score: match.score || match.result || '',
    winner_sets: match.winner_sets || match.sets_won || null,
    loser_sets: match.loser_sets || match.sets_lost || null,

    // Ranking
    winner_rank: match.winner_rank || match.WRank || null,
    loser_rank: match.loser_rank || match.LRank || null,

    // Quote
    odds_b365_winner: match.odds_b365_winner || match.B365W || null,
    odds_b365_loser: match.odds_b365_loser || match.B365L || null,

    // Serie/Livello
    series: match.series || match.tournament_level || '',
    best_of: match.best_of || (match.series === 'Grand Slam' ? 5 : 3),

    // Metadata
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Genera fingerprint
  const { fingerprint } = generateMatchFingerprint(normalized);
  normalized.fingerprint = fingerprint;

  return normalized;
}

/**
 * Merge due match (stesso fingerprint) prendendo i dati piÃ¹ completi
 */
function mergeMatches(existing, incoming) {
  const merged = { ...existing };

  // Per ogni campo, prendi il valore non-null piÃ¹ recente
  for (const [key, value] of Object.entries(incoming)) {
    if (key === 'id' || key === 'created_at') continue;

    // Se il campo esistente Ã¨ null/empty e incoming ha un valore, usa incoming
    if ((merged[key] === null || merged[key] === '' || merged[key] === undefined) && value) {
      merged[key] = value;
    }

    // Per campi specifici, preferisci certi valori
    if (key === 'source') {
      // Combina le sorgenti
      const sources = new Set(
        [...(existing.source || '').split(','), incoming.source].filter(Boolean)
      );
      merged.source = Array.from(sources).join(',');
    }
  }

  merged.updated_at = new Date().toISOString();

  return merged;
}

// ============================================
// UTILITY
// ============================================

function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
}

// ============================================
// AUTO-LEARN MAPPINGS
// ============================================

/**
 * Impara nuovi mapping dai dati esistenti
 * Analizza il DB per trovare probabili duplicati e crea mapping
 */
async function learnMappingsFromDB(supabase) {
  if (!supabase) return { players: {}, tournaments: {} };

  const newMappings = { players: {}, tournaments: {} };

  try {
    // Prendi tutti i nomi unici
    const { data: winners } = await supabase.from('matches').select('winner_name').limit(5000);

    const { data: losers } = await supabase.from('matches').select('loser_name').limit(5000);

    const allNames = new Set();
    for (const w of winners || []) {
      if (w.winner_name) allNames.add(w.winner_name);
    }
    for (const l of losers || []) {
      if (l.loser_name) allNames.add(l.loser_name);
    }

    // Raggruppa nomi simili
    const names = Array.from(allNames);
    const groups = [];
    const used = new Set();

    for (const name of names) {
      if (used.has(name)) continue;

      const group = [name];
      used.add(name);

      for (const other of names) {
        if (used.has(other)) continue;
        if (isSamePlayer(name, other, 0.85)) {
          group.push(other);
          used.add(other);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    // Per ogni gruppo, scegli il nome piÃ¹ lungo come canonico
    for (const group of groups) {
      const canonical = group.reduce((a, b) => (a.length > b.length ? a : b));
      for (const name of group) {
        if (name !== canonical) {
          newMappings.players[name] = canonical;
        }
      }
    }

    console.log(`ðŸ“š Learned ${Object.keys(newMappings.players).length} new player mappings`);
  } catch (err) {
    console.error('Error learning mappings:', err.message);
  }

  return newMappings;
}

// ============================================
// EXPORTS
// ============================================

/**
 * Resolve player to canonical ID (FILOSOFIA_REGISTRY_CANON)
 * @param {string} name - Player name
 * @returns {string|null} Canonical player ID or null
 */
function resolvePlayerId(name) {
  const normalized = normalizePlayerName(name);
  // Per ora ritorna il nome normalizzato come ID
  // TODO: Integrare con database player registry
  return normalized || null;
}

module.exports = {
  // Normalizzazione
  normalizePlayerName,
  normalizeName: normalizePlayerName, // alias FILOSOFIA_REGISTRY_CANON
  resolvePlayerId, // FILOSOFIA_REGISTRY_CANON
  normalizeSurface,
  normalizeTournament,
  normalizeDate,
  normalizeMatch,

  // Deduplicazione
  generateMatchFingerprint,
  areMatchesSame,
  isSamePlayer,
  similarity,

  // Merge
  mergeMatches,

  // Utility
  extractLastName,
  toTitleCase,

  // Learning
  learnMappingsFromDB,

  // Mappings (per debug/estensione)
  PLAYER_NAME_MAPPINGS,
  SURFACE_MAPPINGS,
  TOURNAMENT_MAPPINGS,
};


