/**
 * Value Controller
 * 
 * Controller per interpretazione valori tennis.
 * Zero logica di dominio - delega a valueInterpreter utils.
 * 
 * @see docs/filosofie/FILOSOFIA_CALCOLI.md
 */

const {
  interpretGameValue,
  analyzePowerRankings,
  getValueZone,
  DEFAULT_THRESHOLDS
} = require('../utils/valueInterpreter');

/**
 * POST /api/interpret-value - Interpreta singolo game value
 */
exports.interpret = (req, res) => {
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
};

/**
 * POST /api/analyze-power-rankings - Analizza array power rankings
 */
exports.analyzePowerRankings = (req, res) => {
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
};

/**
 * GET /api/value-thresholds - Soglie di default
 */
exports.getThresholds = (req, res) => {
  res.json(DEFAULT_THRESHOLDS);
};

/**
 * GET /api/value-zone/:value - Zona di un valore
 */
exports.getZone = (req, res) => {
  const value = parseFloat(req.params.value);
  if (isNaN(value)) {
    return res.status(400).json({ error: 'Invalid value' });
  }
  res.json({ value, zone: getValueZone(value) });
};
