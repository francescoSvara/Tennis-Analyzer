/**
 * Script per verificare i dati nel DB
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://nfzlloghofaqxvqcmsfz.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5memxsb2dob2ZhcXh2cWNtc2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3NzMwNDYsImV4cCI6MjA1MDM0OTA0Nn0.d8guYYJzO7HH8sP4lIYBfGMvOOVcgEu6lqTgUt2sKM0'
);

async function main() {
  console.log('🔍 Controllo dati nel database...\n');

  // 1. Controlla point_by_point
  console.log('=== POINT_BY_POINT ===');
  const { data: pbp, count: pbpCount } = await supabase
    .from('point_by_point')
    .select('*', { count: 'exact' })
    .limit(3);
  console.log(`Total records: ${pbpCount}`);
  console.log('Sample:', JSON.stringify(pbp?.[0], null, 2));

  // 2. Controlla power_rankings con value e value_svg
  console.log('\n=== POWER_RANKINGS ===');
  const { data: pr, count: prCount } = await supabase
    .from('power_rankings')
    .select('match_id, set_number, game_number, value, value_svg, break_occurred, source', { count: 'exact' })
    .limit(10);
  console.log(`Total records: ${prCount}`);
  console.log('Sample:', JSON.stringify(pr, null, 2));

  // 3. Controlla match che hanno sia value che value_svg
  console.log('\n=== MATCH CON VALUE E VALUE_SVG ===');
  const { data: prWithBoth } = await supabase
    .from('power_rankings')
    .select('match_id, value, value_svg')
    .not('value_svg', 'is', null)
    .limit(5);
  console.log('Records with value_svg:', JSON.stringify(prWithBoth, null, 2));

  // 4. Controlla un match specifico (recente) per vedere tutti i dati
  console.log('\n=== MATCH RECENTE ===');
  const { data: recentMatch } = await supabase
    .from('matches')
    .select('id, winner_name, loser_name, match_date')
    .order('match_date', { ascending: false })
    .limit(1);
  
  if (recentMatch?.[0]) {
    const matchId = recentMatch[0].id;
    console.log(`Match: ${matchId} - ${recentMatch[0].winner_name} vs ${recentMatch[0].loser_name}`);
    
    // Power rankings per questo match
    const { data: matchPr } = await supabase
      .from('power_rankings')
      .select('set_number, game_number, value, value_svg, break_occurred')
      .eq('match_id', matchId)
      .order('set_number')
      .order('game_number');
    console.log(`Power rankings (${matchPr?.length || 0}):`, JSON.stringify(matchPr, null, 2));
    
    // Point by point per questo match
    const { data: matchPbp } = await supabase
      .from('point_by_point')
      .select('set_number, game_number, server, winner')
      .eq('match_id', matchId)
      .order('set_number')
      .order('game_number')
      .limit(20);
    console.log(`Point by point (${matchPbp?.length || 0}):`, JSON.stringify(matchPbp, null, 2));
  }
}

main().catch(console.error);
