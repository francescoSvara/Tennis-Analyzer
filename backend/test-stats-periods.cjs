/**
 * Test per verificare che le statistiche abbiano i periodi (ALL, SET1, SET2, etc.)
 */

async function testStatsPeriods() {
  try {
    const response = await fetch('http://localhost:3001/api/match-bundle/14968724');
    const bundle = await response.json();

    const stats = bundle.data?.tabs?.stats;

    console.log('=== STATS TAB TEST ===');
    console.log('Has periods array:', !!stats?.periods);
    console.log('Periods:', stats?.periods);
    console.log('Has byPeriod object:', !!stats?.byPeriod);
    console.log('byPeriod keys:', Object.keys(stats?.byPeriod || {}));
    console.log('dataSource:', stats?.dataSource);

    if (stats?.byPeriod?.ALL) {
      console.log('\n=== ALL Period Stats ===');
      console.log('Serve:', stats.byPeriod.ALL.serve);
    }

    if (stats?.byPeriod?.SET1) {
      console.log('\n=== SET1 Period Stats ===');
      console.log('Serve:', stats.byPeriod.SET1.serve);
    }

    console.log('\n=== SUCCESS ===');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testStatsPeriods();
