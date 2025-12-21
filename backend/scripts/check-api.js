/**
 * Verifica cosa restituisce l'API per i match Alcaraz/Musetti
 */
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/db/matches?limit=200',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const matches = json.matches || [];
      
      // Filtra match Alcaraz o Musetti
      const filtered = matches.filter(m => {
        const home = m.homeTeam?.name || '';
        const away = m.awayTeam?.name || '';
        return home.includes('Alcaraz') || home.includes('Musetti') || 
               away.includes('Alcaraz') || away.includes('Musetti');
      });
      
      console.log(`Trovati ${filtered.length} match Alcaraz/Musetti nell'API:\n`);
      
      for (const m of filtered) {
        console.log(`ID: ${m.id}`);
        console.log(`  ${m.homeTeam?.name || '?'} vs ${m.awayTeam?.name || '?'}`);
        console.log(`  Torneo: ${m.tournament}`);
        console.log(`  Data: ${new Date(m.startTimestamp * 1000).toISOString().split('T')[0]}`);
        console.log(`  Fonte: ${m.dataSource}`);
        console.log(`  dataSources: ${JSON.stringify(m.dataSources)}`);
        console.log('');
      }
    } catch (e) {
      console.error('Errore parsing:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('Errore request:', e.message);
});

req.end();
