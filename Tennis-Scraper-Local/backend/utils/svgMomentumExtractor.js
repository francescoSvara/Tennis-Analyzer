/**
 * SVG Momentum Extractor
 * 
 * Estrae i valori di momentum tennis dal codice HTML/SVG delle barre 
 * visualizzate su SofaScore. Usato come fallback quando l'API non 
 * restituisce tennisPowerRankings.
 * 
 * @see docs/filosofie/filosofia_value_svg.md
 */

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Estrae il primo comando verticale "v" dal path d
 * Esempio: "M1,0 v25.84 h8 v-25.84 z" → 25.84
 * @param {string} d - Attributo d del path SVG
 * @returns {number|null} Valore del primo v, o null se non trovato
 */
function parseFirstV(d) {
  if (!d) return null;
  const match = /v\s*([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/i.exec(d);
  return match ? Number(match[1]) : null;
}

/**
 * Estrae la posizione X iniziale dal comando "M"
 * Esempio: "M9.6,0 v-15.95 h8 v15.95 z" → 9.6
 * @param {string} d - Attributo d del path SVG
 * @returns {number|null} Valore X iniziale, o null se non trovato
 */
function parseMx(d) {
  if (!d) return null;
  const match = /M\s*([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/i.exec(d);
  return match ? Number(match[1]) : null;
}

/**
 * Determina il side (home/away) dal valore fill del path
 * @param {string} fill - Valore dell'attributo fill
 * @returns {'home'|'away'|'unknown'} Side del giocatore che domina il game
 */
function getSide(fill) {
  if (!fill) return 'unknown';
  const f = fill.toLowerCase();
  
  // Pattern più specifico per SofaScore:
  // "var(--colors-home-away-away-primary)" -> away
  // "var(--colors-home-away-home-primary)" -> home
  
  // Cerca "away-primary" prima (più specifico)
  if (f.includes('away-primary') || f.includes('away-away')) {
    return 'away';
  }
  // Poi cerca "home-primary"
  if (f.includes('home-primary') || f.includes('away-home')) {
    return 'home';
  }
  
  return 'unknown';
}

/**
 * Converte il valore raw SVG in valore signed semantico
 * - Home domina → positivo
 * - Away domina → negativo
 * @param {number} rawV - Valore grezzo dal path (può essere + o -)
 * @param {string} side - 'home' o 'away'
 * @returns {number} Valore con segno semantico
 */
function getSignedValue(rawV, side) {
  const magnitude = Math.abs(rawV || 0);
  if (side === 'home') return +magnitude;
  if (side === 'away') return -magnitude;
  return rawV || 0; // fallback al valore originale
}

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Calcola il percentile di un array
 * @param {number[]} arr - Array di numeri
 * @param {number} p - Percentile (0-1)
 * @returns {number} Valore al percentile specificato
 */
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Clamp un valore tra min e max
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalizza una serie di valori signed in scala -100..+100
 * Usa percentile 95 per robustezza contro outliers
 * @param {Array} points - Array di oggetti con signed_raw
 * @param {Object} options - Opzioni di normalizzazione
 * @returns {Array} Array con campo 'value' normalizzato aggiunto
 */
function normalizeMomentumSeries(points, options = {}) {
  const {
    signedField = 'signed_raw',
    pAbs = 0.95,
    outAbs = 100
  } = options;

  // Estrai valori assoluti per calcolare la scala
  const absValues = points.map(p => Math.abs(Number(p[signedField]) || 0));
  const scale = Math.max(percentile(absValues, pAbs), 1); // evita divisione per 0

  return points.map(p => {
    const v = Number(p[signedField]) || 0;
    const normalized = clamp(Math.round((v / scale) * outAbs), -outAbs, outAbs);
    
    return {
      ...p,
      value: normalized,
      normScale: scale
    };
  });
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Estrae momentum tennis da stringa HTML contenente SVG delle barre
 * 
 * @param {string} htmlString - HTML contenente gli SVG delle barre momentum
 * @returns {Object} { ok: boolean, sets: Array, error?: string }
 * 
 * @example
 * const result = extractMomentumFromSvgHtml(svgHtmlString);
 * // result.sets[0].games = [{ set: 1, game: 1, value: -65, side: 'away', ... }]
 */
function extractMomentumFromSvgHtml(htmlString) {
  if (!htmlString || typeof htmlString !== 'string') {
    return { ok: false, error: 'Input HTML string is required', sets: [] };
  }

  try {
    // Trova tutti gli SVG con class="set"
    const svgSetRegex = /<svg[^>]*class="[^"]*set[^"]*"[^>]*viewBox="([^"]*)"[^>]*>([\s\S]*?)<\/svg>/gi;
    const sets = [];
    let svgMatch;
    let setIndex = 0;

    while ((svgMatch = svgSetRegex.exec(htmlString)) !== null) {
      const viewBox = svgMatch[1] || '';
      const svgContent = svgMatch[2] || '';
      
      // Parse viewBox per ottenere width (usato per calcolare pos01)
      const vbParts = viewBox.trim().split(/\s+/).map(Number);
      const vbW = vbParts.length === 4 ? vbParts[2] : null;

      // Trova tutti i path con class="game"
      const pathGameRegex = /<path[^>]*class="[^"]*game[^"]*"[^>]*d="([^"]*)"[^>]*fill="([^"]*)"[^>]*>/gi;
      const games = [];
      let pathMatch;
      let gameIndex = 0;

      while ((pathMatch = pathGameRegex.exec(svgContent)) !== null) {
        const d = pathMatch[1] || '';
        const fill = pathMatch[2] || '';

        const rawV = parseFirstV(d);
        const x = parseMx(d);
        const side = getSide(fill);
        const signedRaw = getSignedValue(rawV, side);
        const pos01 = (vbW && x != null) ? x / vbW : null;

        games.push({
          set: setIndex + 1,
          game: gameIndex + 1,
          x,
          pos01,
          side,
          raw_v: rawV,
          signed_raw: signedRaw,
          fill
        });

        gameIndex++;
      }

      sets.push({
        set: setIndex + 1,
        viewBox,
        vbW,
        games
      });

      setIndex++;
    }

    if (sets.length === 0) {
      return { ok: false, error: 'No svg.set elements found in HTML', sets: [] };
    }

    return { ok: true, sets };

  } catch (err) {
    return { ok: false, error: `Parse error: ${err.message}`, sets: [] };
  }
}

/**
 * Normalizza i dati estratti per set (consigliato per tennis)
 * Ogni set viene normalizzato indipendentemente
 * @param {Object} extracted - Output di extractMomentumFromSvgHtml
 * @returns {Object} Dati con value normalizzato per ogni game
 */
function normalizeMomentumPerSet(extracted) {
  if (!extracted.ok || !extracted.sets.length) {
    return extracted;
  }

  return {
    ...extracted,
    sets: extracted.sets.map(s => ({
      ...s,
      games: normalizeMomentumSeries(s.games, { signedField: 'signed_raw' })
    }))
  };
}

/**
 * Normalizza tutti i game del match insieme (scala unica)
 * @param {Object} extracted - Output di extractMomentumFromSvgHtml
 * @returns {Object} Dati con value normalizzato
 */
function normalizeMomentumMatch(extracted) {
  if (!extracted.ok || !extracted.sets.length) {
    return extracted;
  }

  // Appiattisci tutti i game
  const allGames = extracted.sets.flatMap(s => s.games);
  const normalizedAll = normalizeMomentumSeries(allGames, { signedField: 'signed_raw' });

  // Rimappa nei set
  let k = 0;
  const sets = extracted.sets.map(s => {
    const games = s.games.map(() => normalizedAll[k++]);
    return { ...s, games };
  });

  return { ...extracted, sets };
}

/**
 * Converte dati normalizzati in formato power_rankings per il DB
 * @param {Object} normalizedData - Output di normalizeMomentumPerSet/Match
 * @returns {Array} Array pronto per inserimento in power_rankings
 */
function toPowerRankingsFormat(normalizedData) {
  if (!normalizedData.ok || !normalizedData.sets.length) {
    return [];
  }

  const rankings = [];
  
  for (const s of normalizedData.sets) {
    for (const g of s.games) {
      rankings.push({
        set: g.set,
        game: g.game,
        value: g.value,           // -100 to +100 (normalizzato)
        value_svg: g.value,       // stesso valore, sarà salvato in colonna separata
        side: g.side,
        raw_v: g.raw_v,
        source: 'svg_dom'
      });
    }
  }

  return rankings;
}

/**
 * Funzione completa: estrai + normalizza + formatta per DB
 * @param {string} htmlString - HTML contenente SVG momentum
 * @param {Object} options - { normalizeBy: 'set' | 'match' }
 * @returns {Object} { ok, powerRankings, error? }
 */
function processSvgMomentum(htmlString, options = {}) {
  const { normalizeBy = 'set' } = options;

  // 1. Estrai dal HTML
  const extracted = extractMomentumFromSvgHtml(htmlString);
  if (!extracted.ok) {
    return { ok: false, error: extracted.error, powerRankings: [] };
  }

  // 2. Normalizza
  const normalized = normalizeBy === 'match' 
    ? normalizeMomentumMatch(extracted)
    : normalizeMomentumPerSet(extracted);

  // 3. Formatta per DB
  const powerRankings = toPowerRankingsFormat(normalized);

  return {
    ok: true,
    powerRankings,
    setsCount: normalized.sets.length,
    gamesCount: powerRankings.length
  };
}

// ============================================================================
// EXPORTS (ES Module style for Tennis-Scraper-Local)
// ============================================================================

export {
  // Parsing
  parseFirstV,
  parseMx,
  getSide,
  getSignedValue,
  
  // Normalization
  percentile,
  clamp,
  normalizeMomentumSeries,
  
  // Main functions
  extractMomentumFromSvgHtml,
  normalizeMomentumPerSet,
  normalizeMomentumMatch,
  toPowerRankingsFormat,
  processSvgMomentum
};
