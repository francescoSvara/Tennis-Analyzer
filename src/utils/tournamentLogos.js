/**
 * Tournament Logos Utility
 * 
 * Gestisce il mapping tra nomi dei tornei e i rispettivi loghi.
 * I loghi devono essere salvati in: public/logos/tournaments/
 * 
 * COME AGGIUNGERE UN NUOVO LOGO:
 * 1. Salva il file immagine in: public/logos/tournaments/
 * 2. Rinomina il file usando il formato: nome-torneo.png (tutto minuscolo, spazi = trattini)
 *    Esempio: "Australian Open" → "australian-open.png"
 * 3. Aggiungi il mapping nella mappa TOURNAMENT_LOGOS sotto
 * 
 * FORMATI SUPPORTATI: .png, .svg, .jpg, .webp (preferire .png o .svg)
 */

// Mappa dei tornei con i loro file logo
// Chiave: varianti del nome torneo (lowercase)
// Valore: nome del file logo (senza path)
const TOURNAMENT_LOGOS = {
  // === GRAND SLAM ===
  'australian open': 'australian-open.png',
  'roland garros': 'roland-garros.png',
  'french open': 'roland-garros.png',
  'wimbledon': 'wimbledon.png',
  'us open': 'us-open.png',
  
  // === ATP 1000 ===
  'indian wells': 'indian-wells.png',
  'bnp paribas open': 'indian-wells.png',
  'miami open': 'miami-open.png',
  'monte carlo': 'monte-carlo.png',
  'monte-carlo': 'monte-carlo.png',
  'madrid open': 'madrid-open.png',
  'mutua madrid open': 'madrid-open.png',
  'italian open': 'rome.png',
  'internazionali bnl d\'italia': 'rome.png',
  'rome': 'rome.png',
  'canadian open': 'canada.png',
  'rogers cup': 'canada.png',
  'national bank open': 'canada.png',
  'cincinnati': 'cincinnati.png',
  'western & southern open': 'cincinnati.png',
  'shanghai': 'shanghai.png',
  'rolex shanghai masters': 'shanghai.png',
  'paris': 'paris.png',
  'rolex paris masters': 'paris.png',
  
  // === ATP 500 ===
  'rotterdam': 'rotterdam.png',
  'abn amro open': 'rotterdam.png',
  'dubai': 'dubai.png',
  'dubai tennis championships': 'dubai.png',
  'acapulco': 'acapulco.png',
  'abierto mexicano': 'acapulco.png',
  'barcelona': 'barcelona.png',
  'barcelona open': 'barcelona.png',
  'queen\'s': 'queens.png',
  'queen\'s club': 'queens.png',
  'cinch championships': 'queens.png',
  'halle': 'halle.png',
  'terra wortmann open': 'halle.png',
  'hamburg': 'hamburg.png',
  'hamburg open': 'hamburg.png',
  'washington': 'washington.png',
  'citi open': 'washington.png',
  'tokyo': 'tokyo.png',
  'japan open': 'tokyo.png',
  'basel': 'basel.png',
  'swiss indoors': 'basel.png',
  'vienna': 'vienna.png',
  'erste bank open': 'vienna.png',
  
  // === ATP 250 ===
  'brisbane': 'brisbane.png',
  'brisbane international': 'brisbane.png',
  'adelaide': 'adelaide.png',
  'adelaide international': 'adelaide.png',
  'auckland': 'auckland.png',
  'asb classic': 'auckland.png',
  'doha': 'doha.png',
  'qatar open': 'doha.png',
  'qatar exxonmobil open': 'doha.png',
  'montpellier': 'montpellier.png',
  'open sud de france': 'montpellier.png',
  'buenos aires': 'buenos-aires.png',
  'argentina open': 'buenos-aires.png',
  'rio de janeiro': 'rio.png',
  'rio open': 'rio.png',
  'marseille': 'marseille.png',
  'open 13': 'marseille.png',
  'estoril': 'estoril.png',
  'millennium estoril open': 'estoril.png',
  'munich': 'munich.png',
  'bmw open': 'munich.png',
  'lyon': 'lyon.png',
  'open parc auvergne-rhône-alpes lyon': 'lyon.png',
  'geneva': 'geneva.png',
  'gonet geneva open': 'geneva.png',
  's-hertogenbosch': 'hertogenbosch.png',
  'libema open': 'hertogenbosch.png',
  'stuttgart': 'stuttgart.png',
  'boss open': 'stuttgart.png',
  'eastbourne': 'eastbourne.png',
  'rothesay international': 'eastbourne.png',
  'mallorca': 'mallorca.png',
  'mallorca championships': 'mallorca.png',
  'newport': 'newport.png',
  'hall of fame open': 'newport.png',
  'bastad': 'bastad.png',
  'nordea open': 'bastad.png',
  'gstaad': 'gstaad.png',
  'swiss open gstaad': 'gstaad.png',
  'atlanta': 'atlanta.png',
  'atlanta open': 'atlanta.png',
  'kitzbuhel': 'kitzbuhel.png',
  'generali open': 'kitzbuhel.png',
  'umag': 'umag.png',
  'plava laguna croatia open': 'umag.png',
  'los cabos': 'los-cabos.png',
  'abierto de tenis mifel': 'los-cabos.png',
  'winston-salem': 'winston-salem.png',
  'winston-salem open': 'winston-salem.png',
  'chengdu': 'chengdu.png',
  'chengdu open': 'chengdu.png',
  'hangzhou': 'hangzhou.png',
  'hangzhou open': 'hangzhou.png',
  'zhuhai': 'zhuhai.png',
  'zhuhai championships': 'zhuhai.png',
  'sofia': 'sofia.png',
  'sofia open': 'sofia.png',
  'antwerp': 'antwerp.png',
  'european open': 'antwerp.png',
  'stockholm': 'stockholm.png',
  'stockholm open': 'stockholm.png',
  'almaty': 'almaty.png',
  'astana open': 'almaty.png',
  'belgrade': 'belgrade.png',
  'serbia open': 'belgrade.png',
  'metz': 'metz.png',
  'moselle open': 'metz.png',
  
  // === TEAM EVENTS ===
  'united cup': 'united-cup.svg',
  'atp cup': 'atp-cup.png',
  'davis cup': 'davis-cup.png',
  'laver cup': 'laver-cup.png',
  
  // === ATP FINALS ===
  'atp finals': 'atp-finals.png',
  'nitto atp finals': 'atp-finals.png',
  'wta finals': 'wta-finals.png',
  
  // === WTA 1000 ===
  'wta indian wells': 'indian-wells.png',
  'wta miami': 'miami-open.png',
  'wta madrid': 'madrid-open.png',
  'wta rome': 'rome.png',
  'wta canada': 'canada.png',
  'wta cincinnati': 'cincinnati.png',
  'wta beijing': 'beijing.png',
  'china open': 'beijing.png',
  'wta wuhan': 'wuhan.png',
  'wuhan open': 'wuhan.png',
  
  // === CHALLENGERS (esempi comuni) ===
  'challenger': 'challenger.png',  // Logo generico ATP Challenger
  
  // === DEFAULT ===
  'atp': 'atp-default.png',
  'wta': 'wta-default.png',
  'itf': 'itf-default.png',
};

// Percorso base per i loghi
const LOGO_BASE_PATH = '/logos/tournaments/';

/**
 * Normalizza il nome del torneo per il matching
 * @param {string} name - Nome del torneo
 * @returns {string} Nome normalizzato
 */
function normalizeTournamentName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")  // Normalizza apostrofi
    .replace(/\s+/g, ' ')   // Normalizza spazi multipli
    .replace(/\d{4}/g, '')  // Rimuovi anni (es. "Australian Open 2024" → "Australian Open")
    .trim();
}

/**
 * Cerca il logo per un torneo
 * @param {string} tournamentName - Nome del torneo
 * @param {string} category - Categoria (ATP, WTA, ITF, etc.)
 * @returns {string|null} Path del logo o null se non trovato
 */
export function getTournamentLogo(tournamentName, category = '') {
  if (!tournamentName) return null;
  
  const normalized = normalizeTournamentName(tournamentName);
  
  // 1. Cerca match esatto
  if (TOURNAMENT_LOGOS[normalized]) {
    return LOGO_BASE_PATH + TOURNAMENT_LOGOS[normalized];
  }
  
  // 2. Cerca match parziale (il nome del torneo contiene una chiave)
  for (const [key, logo] of Object.entries(TOURNAMENT_LOGOS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return LOGO_BASE_PATH + logo;
    }
  }
  
  // 3. Fallback per categoria
  const categoryLower = (category || '').toLowerCase();
  if (categoryLower.includes('wta') && TOURNAMENT_LOGOS['wta']) {
    return LOGO_BASE_PATH + TOURNAMENT_LOGOS['wta'];
  }
  if ((categoryLower.includes('atp') || categoryLower.includes('tennis')) && TOURNAMENT_LOGOS['atp']) {
    return LOGO_BASE_PATH + TOURNAMENT_LOGOS['atp'];
  }
  if (categoryLower.includes('itf') && TOURNAMENT_LOGOS['itf']) {
    return LOGO_BASE_PATH + TOURNAMENT_LOGOS['itf'];
  }
  
  // 4. Nessun logo trovato
  return null;
}

/**
 * Verifica se un logo esiste (per debugging)
 * @param {string} tournamentName - Nome del torneo
 * @returns {object} Info sul logo
 */
export function checkTournamentLogo(tournamentName) {
  const normalized = normalizeTournamentName(tournamentName);
  const logo = getTournamentLogo(tournamentName);
  
  return {
    originalName: tournamentName,
    normalizedName: normalized,
    logoFound: !!logo,
    logoPath: logo,
    suggestedFileName: normalized.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.png'
  };
}

/**
 * Lista tutti i tornei mappati (per debugging/admin)
 * @returns {Array} Lista dei tornei con i loro loghi
 */
export function listAllMappedTournaments() {
  return Object.entries(TOURNAMENT_LOGOS).map(([name, file]) => ({
    tournament: name,
    logoFile: file,
    fullPath: LOGO_BASE_PATH + file
  }));
}

/**
 * Ottieni il nome file suggerito per un nuovo torneo
 * @param {string} tournamentName - Nome del torneo
 * @returns {string} Nome file suggerito
 */
export function getSuggestedFileName(tournamentName) {
  if (!tournamentName) return 'unknown.png';
  return tournamentName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    + '.png';
}

export default {
  getTournamentLogo,
  checkTournamentLogo,
  listAllMappedTournaments,
  getSuggestedFileName,
  LOGO_BASE_PATH
};
