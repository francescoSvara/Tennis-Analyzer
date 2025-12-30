const http = require('http');

http.get('http://localhost:3001/api/match/14968724/bundle', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const j = JSON.parse(data);
    
    // Check tabs.stats structure
    const statsTab = j.tabs?.stats;
    
    if (statsTab) {
      console.log('=== Periods available:', statsTab.periods);
      console.log('');
      
      const periods = ['ALL', 'SET1', 'SET2', 'SET3'];
      for (const period of periods) {
        const games = statsTab.byPeriod?.[period]?.games;
        if (games) {
          console.log(`=== ${period} ===`);
          console.log(`  Home: gamesWon=${games.home.gamesWon}, serviceGamesWon=${games.home.serviceGamesWon}, tiebreaksWon=${games.home.tiebreaksWon}, consec=${games.home.consecutiveGamesWon}`);
          console.log(`  Away: gamesWon=${games.away.gamesWon}, serviceGamesWon=${games.away.serviceGamesWon}, tiebreaksWon=${games.away.tiebreaksWon}, consec=${games.away.consecutiveGamesWon}`);
        } else {
          console.log(`=== ${period} === (not found)`);
        }
      }
    } else {
      console.log('No tabs.stats found. Tabs keys:', Object.keys(j.tabs || {}));
    }
  });
}).on('error', (e) => console.log('Error:', e.message));
