/**
 * Test endpoint script
 */
const http = require('http');

const endpoints = [
  // Health & Stats
  '/api/health',
  '/api/stats/db',
  '/api/stats/health',
  '/api/db/test',
  
  // Matches list
  '/api/matches/db',
  '/api/matches/suggested',
  '/api/matches/detected',
  '/api/matches/cards',
  '/api/matches/merged',
  
  // Single match
  '/api/match/14968724',
  '/api/match/14968724/bundle',
  '/api/match/14968724/inspector',
  '/api/match/14968724/card',
  '/api/match/14968724/momentum',
  '/api/match/14968724/statistics',
  '/api/match/14968724/odds',
  '/api/match/14968724/points',
  '/api/match/14968724/breaks',
  
  // Admin
  '/api/admin/queue/stats',
  
  // Player (test with known player if available)
  '/api/player/search?q=alcaraz',
];

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          dataLength: data.length,
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        path,
        status: 'ERROR',
        ok: false,
        error: e.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        path,
        status: 'TIMEOUT',
        ok: false,
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing endpoints...\n');

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    const icon = result.ok ? '✅' : '❌';
    console.log(
      `${icon} ${result.path} => ${result.status} ${result.dataLength ? `(${result.dataLength} bytes)` : ''} ${result.error || ''}`
    );
  }

  console.log('\nDone!');
}

runTests();
