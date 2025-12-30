const http = require('http');
http.get('http://localhost:3001/api/match/14968724/bundle', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const j = JSON.parse(d);
      console.log('header.match keys:', Object.keys(j.header.match));
      console.log('header.match.setsWon =', JSON.stringify(j.header.match.setsWon));
      console.log('header.match.winner =', j.header.match.winner);
    } catch (e) {
      console.log('parse error', e.message);
    }
  });
}).on('error', e => console.log('Error', e.message));