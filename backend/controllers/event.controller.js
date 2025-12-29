/**
 * Event Controller
 *
 * Controller per fetch diretto da SofaScore.
 * Zero logica di dominio - solo fetch e forward.
 *
 * NOTA: Per dati da DB usare /api/match/:eventId/bundle (FILOSOFIA MATCHBUNDLE_ONLY_FE)
 *
 * @see docs/filosofie/FILOSOFIA_LIVE_TRACKING.md
 */

const fetch = require('node-fetch');

const SOFASCORE_BASE_URL = 'https://www.sofascore.com/api/v1/event';
const SOFASCORE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'application/json',
};

/**
 * GET /api/event/:eventId/point-by-point
 */
exports.getPointByPoint = async (req, res) => {
  const { eventId } = req.params;
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }

  try {
    const url = `${SOFASCORE_BASE_URL}/${eventId}/point-by-point`;
    const response = await fetch(url, { headers: SOFASCORE_HEADERS });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `SofaScore API returned ${response.status}`,
        pointByPoint: [],
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Point-by-point fetch error:', err.message);
    res.status(500).json({ error: err.message, pointByPoint: [] });
  }
};

/**
 * GET /api/event/:eventId/statistics
 */
exports.getStatistics = async (req, res) => {
  const { eventId } = req.params;
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }

  try {
    const url = `${SOFASCORE_BASE_URL}/${eventId}/statistics`;
    const response = await fetch(url, { headers: SOFASCORE_HEADERS });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `SofaScore API returned ${response.status}`,
        statistics: [],
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Statistics fetch error:', err.message);
    res.status(500).json({ error: err.message, statistics: [] });
  }
};

/**
 * GET /api/event/:eventId/power-rankings
 */
exports.getPowerRankings = async (req, res) => {
  const { eventId } = req.params;
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }

  try {
    const url = `${SOFASCORE_BASE_URL}/${eventId}/tennis-power-rankings`;
    const response = await fetch(url, { headers: SOFASCORE_HEADERS });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `SofaScore API returned ${response.status}`,
        tennisPowerRankings: [],
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Power rankings fetch error:', err.message);
    res.status(500).json({ error: err.message, tennisPowerRankings: [] });
  }
};

/**
 * GET /api/event/:eventId/live - Tutti i dati live in una chiamata
 */
exports.getLive = async (req, res) => {
  const { eventId } = req.params;
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' });
  }

  const baseUrl = SOFASCORE_BASE_URL;
  const headers = SOFASCORE_HEADERS;

  const result = {
    eventId,
    timestamp: new Date().toISOString(),
    event: null,
    pointByPoint: [],
    statistics: [],
    powerRankings: [],
    errors: [],
  };

  // Fetch in parallelo per velocità
  const fetches = [
    fetch(`${baseUrl}/${eventId}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        result.event = data?.event || data;
      })
      .catch((e) => result.errors.push({ endpoint: 'event', error: e.message })),

    fetch(`${baseUrl}/${eventId}/point-by-point`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        result.pointByPoint = data?.pointByPoint || [];
      })
      .catch((e) => result.errors.push({ endpoint: 'point-by-point', error: e.message })),

    fetch(`${baseUrl}/${eventId}/statistics`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        result.statistics = data?.statistics || [];
      })
      .catch((e) => result.errors.push({ endpoint: 'statistics', error: e.message })),

    fetch(`${baseUrl}/${eventId}/tennis-power-rankings`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        result.powerRankings = data?.tennisPowerRankings || [];
      })
      .catch((e) => result.errors.push({ endpoint: 'power-rankings', error: e.message })),
  ];

  try {
    await Promise.all(fetches);
    res.json(result);
  } catch (err) {
    console.error('Live data fetch error:', err.message);
    res.status(500).json({ ...result, error: err.message });
  }
};
