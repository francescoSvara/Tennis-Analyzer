require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const {data: m} = await s.from('matches').select('raw_json').eq('id', 15017473).single();
  const raw = m?.raw_json || {};
  
  // Cerca la chiave con tennis-power-rankings
  for (const [url, data] of Object.entries(raw.api || {})) {
    if (url.includes('tennis-power-rankings')) {
      console.log('URL:', url);
      console.log('Keys in data:', Object.keys(data || {}));
      console.log('tennisPowerRankings?', data?.tennisPowerRankings?.length || 'NO');
      if (data?.tennisPowerRankings) {
        console.log('Sample:', JSON.stringify(data.tennisPowerRankings[0], null, 2));
      }
    }
  }
}

check();
