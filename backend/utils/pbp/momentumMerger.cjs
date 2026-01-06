/**
 * Momentum Merger Module
 * 
 * Standardizes momentum output per SPEC_VALUE_SVG:
 * - value_api: from API (priority)
 * - value_svg: from SVG DOM extraction
 * - value: final value (api if available, else svg)
 * - source: 'api' | 'svg_dom'
 * 
 * @module pbp/momentumMerger
 * @see docs/specs/SPEC_VALUE_SVG.md
 */

'use strict';

/**
 * Merge momentum values from API and SVG sources
 * 
 * Rules:
 * - If value_api is not null → value=value_api, source='api'
 * - Else value=value_svg, source='svg_dom'
 * - Store both fields for audit/debug
 * 
 * @param {Object} input - Input momentum data
 * @param {number|null} input.value_api - Value from API
 * @param {number|null} input.value_svg - Value from SVG extraction
 * @returns {Object} Merged momentum with standardized fields
 */
function mergeMomentum({ value_api, value_svg }) {
  const result = {
    value: null,
    value_api: value_api ?? null,
    value_svg: value_svg ?? null,
    source: null
  };

  // Priority: API > SVG
  if (value_api !== null && value_api !== undefined && !isNaN(value_api)) {
    result.value = value_api;
    result.source = 'api';
  } else if (value_svg !== null && value_svg !== undefined && !isNaN(value_svg)) {
    result.value = value_svg;
    result.source = 'svg_dom';
  }

  return result;
}

/**
 * Merge arrays of momentum rankings
 * 
 * @param {Array} apiRankings - Rankings from API (may have gaps)
 * @param {Array} svgRankings - Rankings from SVG extraction
 * @returns {Array} Merged rankings with both sources
 */
function mergeMomentumArrays(apiRankings = [], svgRankings = []) {
  // Create lookup maps by set/game
  const apiMap = new Map();
  const svgMap = new Map();

  for (const r of apiRankings) {
    const key = `${r.set_number || r.set}-${r.game_number || r.game}`;
    apiMap.set(key, r);
  }

  for (const r of svgRankings) {
    const key = `${r.set_number || r.set}-${r.game_number || r.game}`;
    svgMap.set(key, r);
  }

  // Get all unique keys
  const allKeys = new Set([...apiMap.keys(), ...svgMap.keys()]);
  
  const merged = [];
  for (const key of allKeys) {
    const apiR = apiMap.get(key);
    const svgR = svgMap.get(key);

    const value_api = apiR?.value ?? null;
    const value_svg = svgR?.value ?? svgR?.value_svg ?? null;

    const momentumMerge = mergeMomentum({ value_api, value_svg });

    merged.push({
      set_number: apiR?.set_number || svgR?.set_number || parseInt(key.split('-')[0]),
      game_number: apiR?.game_number || svgR?.game_number || parseInt(key.split('-')[1]),
      value: momentumMerge.value,
      value_api: momentumMerge.value_api,
      value_svg: momentumMerge.value_svg,
      source: momentumMerge.source,
      // Preserve other fields from API if available
      break_occurred: apiR?.break_occurred ?? svgR?.break_occurred ?? false,
      zone: apiR?.zone ?? svgR?.zone ?? null,
      favored_player: apiR?.favored_player ?? svgR?.favored_player ?? null
    });
  }

  // Sort by set then game
  merged.sort((a, b) => {
    if (a.set_number !== b.set_number) return a.set_number - b.set_number;
    return a.game_number - b.game_number;
  });

  return merged;
}

/**
 * Normalize momentum value to -100 to +100 range
 * @param {number} value 
 * @returns {number}
 */
function normalizeMomentumValue(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 0;
  }
  return Math.max(-100, Math.min(100, Math.round(value)));
}

/**
 * Validate momentum data consistency
 * @param {Array} rankings 
 * @returns {{valid: boolean, errors: Array}}
 */
function validateMomentumData(rankings) {
  const errors = [];

  if (!rankings || rankings.length === 0) {
    return { valid: true, errors };
  }

  for (let i = 0; i < rankings.length; i++) {
    const r = rankings[i];

    // Check for NaN values
    if (isNaN(r.value)) {
      errors.push({
        code: 'NAN_VALUE',
        message: `NaN value at set ${r.set_number} game ${r.game_number}`,
        at: { set: r.set_number, game: r.game_number }
      });
    }

    // Check value range
    if (r.value !== null && (r.value < -100 || r.value > 100)) {
      errors.push({
        code: 'VALUE_OUT_OF_RANGE',
        message: `Value ${r.value} out of range [-100, 100]`,
        at: { set: r.set_number, game: r.game_number }
      });
    }

    // Check source is valid
    if (r.source && !['api', 'svg_dom', 'calculated'].includes(r.source)) {
      errors.push({
        code: 'INVALID_SOURCE',
        message: `Unknown source: ${r.source}`,
        at: { set: r.set_number, game: r.game_number }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  mergeMomentum,
  mergeMomentumArrays,
  normalizeMomentumValue,
  validateMomentumData
};
