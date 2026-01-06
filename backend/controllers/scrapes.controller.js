/**
 * Scrapes Controller
 *
 * Controller per gestione scrapes salvati.
 * Zero logica di dominio - solo lettura file.
 *
 * @see docs/filosofie/FILOSOFIA_DB.md
 */

const path = require('path');
const fs = require('fs');

// Import scraper functions
let scraperModule = null;
try {
  scraperModule = require('../scraper/sofascoreScraper');
} catch (e) {
  console.warn('⚠️ SofaScore Scraper not available');
}

const SCRAPES_DIR = path.join(__dirname, '..', '..', 'data', 'scrapes');

/**
 * GET /api/scrapes - Lista scrapes salvati
 */
exports.list = (req, res) => {
  try {
    if (!fs.existsSync(SCRAPES_DIR)) {
      return res.json({ scrapes: [] });
    }
    const files = fs
      .readdirSync(SCRAPES_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const filePath = path.join(SCRAPES_DIR, f);
        const stat = fs.statSync(filePath);
        const id = f.replace('.json', '');

        let info = { id, filename: f, createdAt: stat.mtime.toISOString(), size: stat.size };
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (content.event) {
            info.home = content.event.homeTeam?.name || content.event.homeTeam?.shortName;
            info.away = content.event.awayTeam?.name || content.event.awayTeam?.shortName;
            info.tournament = content.event.tournament?.name;
          } else if (content.api) {
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
          /* ignore parse errors */
        }
        return info;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ scrapes: files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/scrapes/:id - Singolo scrape
 */
exports.get = (req, res) => {
  const filePath = path.join(SCRAPES_DIR, `${req.params.id}.json`);
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Scrape not found' });
    }
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/status/:id - Status scrape
 */
exports.getStatus = (req, res) => {
  if (!scraperModule) {
    return res.status(503).json({ error: 'Scraper not available' });
  }
  res.json({ status: scraperModule.getStatus(req.params.id) || 'unknown' });
};

/**
 * GET /api/data/:id - Dati scrape
 */
exports.getData = (req, res) => {
  const id = req.params.id;

  // Prima controlla in memoria
  let data = scraperModule ? scraperModule.getData(id) : null;

  // Se non trovato, prova file
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
};

/**
 * POST /api/scrape - Avvia scrape (DISABILITATO in produzione)
 */
exports.scrape = (req, res) => {
  return res.status(503).json({
    error: 'scraping_disabled',
    message: 'Lo scraping è disabilitato sul server di produzione.',
    hint: 'SofaScore blocca le richieste dai server cloud. Usa il progetto Tennis-Scraper-Local (Desktop) per acquisire match da localhost.',
    instructions: [
      '1. Apri la cartella c:\\Users\\UTENTE\\Desktop\\Tennis-Scraper-Local',
      '2. Esegui: npm install',
      '3. Esegui: npm run dev',
      '4. Apri http://localhost:5174',
      '5. Inserisci il link SofaScore per acquisire il match',
    ],
  });
};

/**
 * POST /api/lookup-name - Quick lookup URL
 */
exports.lookupName = async (req, res) => {
  if (!scraperModule) {
    return res.status(503).json({ error: 'Scraper not available' });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  try {
    const fetched = await scraperModule.directFetch(url);
    const body = fetched && fetched.body ? fetched.body : null;

    function getNameFromCandidate(candidate) {
      if (!candidate) return null;
      if (typeof candidate === 'string') return { name: candidate };
      if (typeof candidate === 'object') {
        if (candidate.name) return { name: candidate.name };
        if (candidate.title) return { name: candidate.title };
        if (candidate.displayName) return { name: candidate.displayName };
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
      return { home: null, away: null };
    }

    const names = extractHomeAway(body);
    const homeName = names.home && names.home.name ? names.home.name : null;
    res.json({ home: homeName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
