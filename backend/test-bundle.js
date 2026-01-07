// Test bundle endpoint
require('dotenv').config();

const bundleService = require('./services/bundleService');

async function test() {
  console.log('Testing bundle for match 15298534...');
  
  const bundle = await bundleService.buildBundle(15298534, { forceRefresh: true });
  
  if (bundle) {
    console.log('\n=== RESULT ===');
    console.log('status:', bundle.header?.match?.status);
    console.log('winner:', bundle.header?.match?.winner);
    console.log('score:', bundle.header?.match?.score);
    console.log('sets:', JSON.stringify(bundle.header?.match?.sets, null, 2));
    console.log('setsWon:', JSON.stringify(bundle.header?.match?.setsWon));
  } else {
    console.log('Bundle is null!');
  }
  
  process.exit(0);
}

test().catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
