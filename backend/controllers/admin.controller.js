/**
 * Admin Controller
 *
 * Controller per operazioni amministrative.
 * Gestione queue, manutenzione, diagnostica.
 */

// Lazy load dependencies
let matchRepository = null;

try {
  matchRepository = require('../db/matchRepository');
} catch (e) {
  console.warn('⚠️ matchRepository not available');
}

/**
 * GET /api/admin/queue/stats - Queue statistics
 */
exports.getQueueStats = async (req, res) => {
  if (!matchRepository) {
    return res.status(503).json({ error: 'Repository not available' });
  }

  try {
    const stats = await matchRepository.getQueueStats();
    res.json({ stats });
  } catch (err) {
    console.error('Error getting queue stats:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/queue/enqueue - Manually enqueue a task
 */
exports.enqueueTask = async (req, res) => {
  const { taskType, payload, uniqueKey, priority } = req.body;

  if (!taskType || !payload || !uniqueKey || !matchRepository) {
    return res.status(400).json({ error: 'Missing required fields or repository not available' });
  }

  try {
    const taskId = await matchRepository.enqueueCalculation(
      taskType,
      payload,
      uniqueKey,
      priority || 5
    );
    res.json({ success: true, taskId });
  } catch (err) {
    console.error('Error enqueueing task:', err);
    res.status(500).json({ error: err.message });
  }
};
