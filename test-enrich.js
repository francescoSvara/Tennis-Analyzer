// Test script per arricchire il match 14968724 con punti simulati
const http = require('http');

// Usa direttamente SofaScore ID
const data = JSON.stringify({ 
  generatePoints: true,
  sofascoreId: 14968724  // Forza l'uso del SofaScore ID
});

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/match/14968724/enrich',  // Usa SofaScore ID direttamente
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('🔧 Arricchimento match 5...');

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(body);
      console.log('\n✅ Risultato:');
      console.log('  Games:', result.gamesCount);
      console.log('  Local ID:', result.localId);
      console.log('  SofaScore ID:', result.sofascoreId);
      
      if (result.games) {
        console.log('\n📊 Dettaglio games:');
        result.games.forEach(g => {
          console.log(`  S${g.set}G${g.game}: srv=${g.gameServer} win=${g.gameWinner} brk=${g.gameIsBreak} pts=${g.points?.length || 0}`);
        });
      }
    } catch (e) {
      console.log('Response:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Errore:', e.message);
});

req.write(data);
req.end();
