const fs = require('fs');
const path = require('path');
const fe = require('../utils/featureEngine');

const bundlePath = path.join(__dirname, '..', '..', 'temp', 'api_output_test.json.bak');
let raw = fs.readFileSync(bundlePath, null);
// Show first bytes for debug
const bytes = raw.slice(0, 6);
console.log('first bytes:', bytes);
// Convert buffer to string robustly
raw = raw.toString('utf16le');
const firstBrace = raw.indexOf('{');
if (firstBrace > 0) raw = raw.slice(firstBrace);
raw = raw.trim();
// Optionally remove leading non-printable characters
while (raw.length && raw.charCodeAt(0) < 32) raw = raw.slice(1);
const obj = JSON.parse(raw);
const header = obj.header || {};
const features = header.features || {};
const momentum = obj.tabs?.momentum || obj.momentum || {};
const powerRankings = momentum.powerRankings || [];
console.log('top-level keys:', Object.keys(obj).slice(0,10));
console.log('momentum keys:', momentum && Object.keys(momentum).slice(0,10));
console.log('powerRankings length:', powerRankings.length);

// find powerRankings anywhere
function findPowerRankings(o, path = '') {
  if (!o || typeof o !== 'object') return null;
  if (Array.isArray(o.powerRankings)) return { path, value: o.powerRankings };
  for (const k of Object.keys(o)) {
    try {
      const res = findPowerRankings(o[k], path ? path + '.' + k : k);
      if (res) return res;
    } catch (e) {
      // ignore
    }
  }
  return null;
}
const found = findPowerRankings(obj);
console.log('found powerRankings at:', found ? found.path : 'NOT FOUND');
if (found) console.log('found length', found.value.length);
const score = header.score || {};
const odds = header.odds || {};

console.log('Bundle features:', features);

const prSwing01 = fe.computePRSweepIntensity(powerRankings);
const break01 = fe.computeRecentBreakRate(powerRankings);
const oddsSwing01 = fe.computeOddsSwingIntensity(odds);
const reversal01 = fe.computeReversalIntensity(powerRankings);
const scoreAmp01 = fe.computeScorePressureAmplifier(score);

// Debug raw computations
const windowPR = powerRankings.slice(-10).map(p => p.value || p.value === 0 ? p.value : 0);
let sum = 0; for (let i=1;i<windowPR.length;i++) sum += Math.abs(windowPR[i]-windowPR[i-1]);
const avg = sum / Math.max(windowPR.length - 1, 1);

const signal01 = prSwing01 * 0.30 + break01 * 0.25 + oddsSwing01 * 0.30 + reversal01 * 0.15;
const vol = Math.round(Math.max(0, Math.min(100, 35 + signal01 * 60 + scoreAmp01 * 10)));

console.log('Debug PR window and avg swing:', {windowPR, avg});
console.log('Computed components:');
console.log({ prSwing01, break01, oddsSwing01, reversal01, scoreAmp01, signal01, vol });
