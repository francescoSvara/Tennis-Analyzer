const fetch = require('node-fetch');

async function testBackendEnrichment() {
  // Fetch from our backend endpoint (running on 3001)
  const testEventId = '15255681'; // Yesterday's finished match
  
  console.log('Testing backend endpoint for eventId:', testEventId);
  console.log('=======================================\n');
  
  try {
    const response = await fetch(`http://localhost:3001/api/match/${testEventId}?refresh=true`);
    const data = await response.json();
    
    console.log('Response source:', data.source);
    console.log('Response timestamp:', data.timestamp);
    
    // Check powerRankings
    const pr = data.powerRankings || data.tennisPowerRankings || [];
    console.log('\nPowerRankings count:', pr.length);
    
    if (pr.length > 0) {
      // Check for breakOccurred
      const withBreak = pr.filter(p => p.breakOccurred === true);
      const withoutBreak = pr.filter(p => p.breakOccurred === false);
      const undefinedBreak = pr.filter(p => p.breakOccurred === undefined);
      
      console.log('With breakOccurred=true:', withBreak.length);
      console.log('With breakOccurred=false:', withoutBreak.length);
      console.log('With breakOccurred=undefined:', undefinedBreak.length);
      
      // Show sample items
      console.log('\nSample PR items:');
      pr.slice(0, 3).forEach((p, i) => {
        console.log(`  [${i}] set=${p.set}, game=${p.game}, value=${p.value}, breakOccurred=${p.breakOccurred}`);
      });
      
      // Show items with breaks
      if (withBreak.length > 0) {
        console.log('\nItems with break:');
        withBreak.forEach(p => {
          console.log(`  Set ${p.set} Game ${p.game}: value=${p.value}`);
        });
      }
    } else {
      console.log('\nNo powerRankings found!');
      
      // Check pointByPoint structure
      const pbp = data.pointByPoint || [];
      console.log('PointByPoint sets:', pbp.length);
      console.log('PointByPoint type:', typeof pbp);
      console.log('PointByPoint is array:', Array.isArray(pbp));
      
      if (pbp.length > 0) {
        console.log('\nFirst PBP item type:', typeof pbp[0]);
        console.log('First PBP item:', JSON.stringify(pbp[0]).slice(0, 500));
        
        let breaksFound = 0;
        for (const set of pbp) {
          console.log(`\nSet ${set.set || 'unknown'}:`);
          console.log('  - has games:', !!set.games);
          console.log('  - games count:', (set.games || []).length);
          
          for (const game of set.games || []) {
            console.log(`  Game ${game.game}: score=`, game.score);
            if (game.score?.serving !== game.score?.scoring) {
              breaksFound++;
              console.log('    ^^ BREAK!');
            }
          }
        }
        console.log('\nTotal breaks calculated:', breaksFound);
      }
    }
    
    console.log('\n=======================================');
    console.log('Full keys in response:', Object.keys(data).join(', '));
    
  } catch (err) {
    console.error('Error calling backend:', err.message);
    console.log('\nMake sure the backend is running: node server.js');
  }
}

testBackendEnrichment();
