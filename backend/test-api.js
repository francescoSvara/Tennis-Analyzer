const http = require('http');

http.get('http://localhost:3001/api/match/15302197/bundle', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      console.log('=== ROOT LEVEL ===');
      console.log('games.home.serviceGamesWon:', j.tabs?.stats?.games?.home?.serviceGamesWon);
      console.log('games.away.serviceGamesWon:', j.tabs?.stats?.games?.away?.serviceGamesWon);
      console.log('serve.home.serviceGamesWon:', j.tabs?.stats?.serve?.home?.serviceGamesWon);
      console.log('points.home.totalWon:', j.tabs?.stats?.points?.home?.totalWon);
      console.log('');
      console.log('=== byPeriod.ALL ===');
      console.log('games.home.serviceGamesWon:', j.tabs?.stats?.byPeriod?.ALL?.games?.home?.serviceGamesWon);
      console.log('serve.home.serviceGamesWon:', j.tabs?.stats?.byPeriod?.ALL?.serve?.home?.serviceGamesWon);
      console.log('points.home.totalWon:', j.tabs?.stats?.byPeriod?.ALL?.points?.home?.totalWon);
      console.log('points.home.maxConsec:', j.tabs?.stats?.byPeriod?.ALL?.points?.home?.maxConsecutivePointsWon);
      console.log('');
      console.log('=== byPeriod.SET1 ===');
      console.log('Full SET1 points:', JSON.stringify(j.tabs?.stats?.byPeriod?.SET1?.points, null, 2));
      console.log('Full SET1 serve:', JSON.stringify(j.tabs?.stats?.byPeriod?.SET1?.serve, null, 2));
    } catch (e) {
      console.log('Error:', e.message);
    }
  });
}).on('error', e => console.log('Net error:', e.message));
