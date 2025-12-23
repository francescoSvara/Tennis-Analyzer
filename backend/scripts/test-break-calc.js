const fetch = require('node-fetch');

async function testBreakCalculation() {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  console.log('Searching for events from:', yesterday);
  const r = await fetch('https://www.sofascore.com/api/v1/sport/tennis/scheduled-events/' + yesterday, { 
    headers: { 'User-Agent': 'Mozilla/5.0' } 
  });
  const d = await r.json();
  const finished = (d.events || []).filter(e => e.status?.type === 'finished');
  
  console.log('Found', finished.length, 'finished events\n');
  
  // Find first event with power rankings
  let testedWithPR = false;
  for (const ev of finished.slice(0, 30)) {
    const pr = await fetch('https://www.sofascore.com/api/v1/event/' + ev.id + '/tennis-power-rankings', { 
      headers: { 'User-Agent': 'Mozilla/5.0' } 
    });
    const prData = await pr.json();
    
    if (prData.tennisPowerRankings?.length > 0) {
      console.log('=== Found event with Power Rankings ===');
      console.log('Event:', ev.id, '-', ev.homeTeam?.name, 'vs', ev.awayTeam?.name);
      console.log('PR count:', prData.tennisPowerRankings.length);
      console.log('Sample PR item:', JSON.stringify(prData.tennisPowerRankings[0]));
      console.log('Has breakOccurred in API?', prData.tennisPowerRankings.some(p => p.breakOccurred !== undefined));
      
      // Get point by point
      const pbp = await fetch('https://www.sofascore.com/api/v1/event/' + ev.id + '/point-by-point', { 
        headers: { 'User-Agent': 'Mozilla/5.0' } 
      });
      const pbpData = await pbp.json();
      
      console.log('\nPoint by point sets:', pbpData.pointByPoint?.length || 0);
      
      // Calculate breaks
      let breaks = [];
      for (const set of pbpData.pointByPoint || []) {
        for (const game of set.games || []) {
          if (game.score?.serving !== undefined && game.score?.scoring !== undefined) {
            if (game.score.serving !== game.score.scoring) {
              breaks.push({ set: set.set, game: game.game, serving: game.score.serving, scoring: game.score.scoring });
            }
          }
        }
      }
      
      console.log('\nCalculated breaks from PBP:', breaks.length);
      breaks.forEach(b => console.log(`  Set ${b.set} Game ${b.game}: serving=${b.serving} scoring=${b.scoring}`));
      
      testedWithPR = true;
      break;
    }
  }
  
  if (!testedWithPR) {
    console.log('No events with power rankings found, testing first event with PBP...');
    const ev = finished[0];
    if (ev) {
      console.log('Event:', ev.id, '-', ev.homeTeam?.name, 'vs', ev.awayTeam?.name);
      
      const pbp = await fetch('https://www.sofascore.com/api/v1/event/' + ev.id + '/point-by-point', { 
        headers: { 'User-Agent': 'Mozilla/5.0' } 
      });
      const pbpData = await pbp.json();
      
      console.log('\nPoint by point sets:', pbpData.pointByPoint?.length || 0);
      
      let breaks = [];
      for (const set of pbpData.pointByPoint || []) {
        for (const game of set.games || []) {
          if (game.score?.serving !== undefined && game.score?.scoring !== undefined) {
            if (game.score.serving !== game.score.scoring) {
              breaks.push({ set: set.set, game: game.game, serving: game.score.serving, scoring: game.score.scoring });
            }
          }
        }
      }
      
      console.log('\nCalculated breaks from PBP:', breaks.length);
      breaks.forEach(b => console.log(`  Set ${b.set} Game ${b.game}: serving=${b.serving} scoring=${b.scoring}`));
    }
  }
}

testBreakCalculation().catch(console.error);
