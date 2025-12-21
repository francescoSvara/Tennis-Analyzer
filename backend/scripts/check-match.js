require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const {data: m} = await s.from('matches')
    .select('id, winner_name, loser_name, home_player_id, away_player_id, start_time, status_type, tournament_name, raw_json')
    .eq('id', 15017473)
    .single();
  
  console.log('=== Match DB Fields ===');
  console.log('ID:', m.id);
  console.log('Winner/Loser names:', m.winner_name, '/', m.loser_name);
  console.log('Home/Away player IDs:', m.home_player_id, '/', m.away_player_id);
  console.log('Tournament:', m.tournament_name);
  console.log('Status:', m.status_type);
  
  const raw = m?.raw_json || {};
  
  console.log('\n=== Raw JSON Event ===');
  for (const [url, data] of Object.entries(raw.api || {})) {
    if (url.endsWith('/15017473')) {
      const e = data?.event;
      console.log('Home:', e?.homeTeam?.name, '(ID:', e?.homeTeam?.id, ')');
      console.log('Away:', e?.awayTeam?.name, '(ID:', e?.awayTeam?.id, ')');
      console.log('Score:', e?.homeScore?.current, '-', e?.awayScore?.current);
      console.log('Tournament:', e?.tournament?.name);
    }
  }
}

check();
