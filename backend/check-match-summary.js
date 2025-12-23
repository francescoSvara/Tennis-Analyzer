/**
 * Script di diagnostica per verificare discrepanza tra totale e raggruppamenti anno/mese
 */
require('dotenv/config');
const { supabase } = require('./db/supabase');

async function checkSummary() {
  console.log('🔍 Verifica discrepanza match summary...\n');
  
  // 1. Count totale match
  const { count: total } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true });
  console.log(`📊 Totale match nel DB: ${total}`);
  
  // 2. Count match con start_time null
  const { count: nullCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .is('start_time', null);
  console.log(`❌ Match con start_time NULL: ${nullCount}`);
  
  // 3. Count match con start_time valido
  const { count: validCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .not('start_time', 'is', null);
  console.log(`✅ Match con start_time valido: ${validCount}`);
  
  // 4. Raggruppa per anno/mese - CON PAGINAZIONE!
  let allGroupedData = [];
  let offset = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: page, error: groupError } = await supabase
      .from('matches')
      .select('start_time')
      .not('start_time', 'is', null)
      .order('start_time', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    if (groupError) {
      console.log(`❌ Errore query: ${groupError.message}`);
      break;
    }
    
    if (!page || page.length === 0) break;
    allGroupedData = allGroupedData.concat(page);
    offset += pageSize;
    console.log(`   📥 Caricati ${allGroupedData.length} match (pagina ${Math.ceil(offset/pageSize)})...`);
    if (page.length < pageSize) break; // Ultima pagina
  }
  
  const groupedData = allGroupedData;
  console.log(`\n🔢 Match ritornati con paginazione: ${groupedData?.length || 0}`);
  
  // Raggruppa per anno
  const byYear = {};
  let totalGrouped = 0;
  
  for (const m of (groupedData || [])) {
    if (!m.start_time) continue;
    const date = new Date(m.start_time);
    if (isNaN(date.getTime())) continue;
    const year = date.getFullYear();
    byYear[year] = (byYear[year] || 0) + 1;
    totalGrouped++;
  }
  
  console.log(`\n📅 Raggruppamento per anno:`);
  Object.entries(byYear)
    .sort((a, b) => b[0] - a[0])
    .forEach(([year, count]) => {
      console.log(`   ${year}: ${count} partite`);
    });
  
  console.log(`\n📈 Totale raggruppato: ${totalGrouped}`);
  console.log(`📉 Differenza: ${total - totalGrouped} (questi mancano nell'UI)`);
  
  // 5. Se ci sono match senza start_time, mostra esempi
  if (nullCount > 0) {
    const { data: nullMatches } = await supabase
      .from('matches')
      .select('id, slug, home_player_id, away_player_id, tournament_id, extracted_at')
      .is('start_time', null)
      .limit(10);
    
    console.log(`\n🔎 Esempi di match senza start_time:`);
    nullMatches?.forEach(m => {
      console.log(`   ID: ${m.id}, Slug: ${m.slug || 'N/A'}, Tournament: ${m.tournament_id || 'N/A'}`);
    });
  }
  
  // 6. Verifica match con date invalide
  const { data: allMatches } = await supabase
    .from('matches')
    .select('start_time')
    .not('start_time', 'is', null)
    .limit(10000);
  
  let invalidDates = 0;
  for (const m of (allMatches || [])) {
    const d = new Date(m.start_time);
    if (isNaN(d.getTime())) invalidDates++;
  }
  console.log(`\n⚠️ Match con date invalide: ${invalidDates}`);
}

checkSummary()
  .then(() => {
    console.log('\n✅ Diagnostica completata');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Errore:', err.message);
    process.exit(1);
  });
