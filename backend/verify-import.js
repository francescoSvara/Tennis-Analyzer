require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  const { data, count } = await supabase
    .from('matches')
    .select('*', { count: 'exact' })
    .eq('data_source', 'xlsx_import')
    .limit(5);
  
  console.log('Match importati da xlsx:', count);
  console.log('\nEsempi:');
  data.forEach(m => {
    console.log(`  - ${m.winner_name} vs ${m.loser_name}`);
    console.log(`    ${m.location} | ${m.surface} | ${m.series} | ${m.start_time}`);
    console.log(`    Quote B365: ${m.odds_b365_winner} / ${m.odds_b365_loser}`);
  });
})();
