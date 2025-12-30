/**
 * 🔢 MATH UTILITIES
 *
 * Centralized math helper functions for feature calculations.
 * Deduplicated from featureEngine.js to avoid code duplication.
 *
 * @module utils/math
 */

/**
 * Clamp value between 0 and 1 (for probabilities)
 * @param {number} x - Value to clamp
 * @returns {number} Clamped value 0-1
 */
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Clamp value between 0 and 100 (for percentages)
 * @param {number} x - Value to clamp
 * @returns {number} Clamped value 0-100
 */
function clampTo0_100(x) {
  return Math.max(0, Math.min(100, x));
}

module.exports = {
  clamp01,
  clampTo0_100,
};
