import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function cleanSvgData() {
  const matchIds = [15023095, 15023098]; // Alcaraz-Musetti, Musetti-De Minaur
  
  for (const matchId of matchIds) {
    console.log(`\n🧹 Pulizia match ${matchId}...`);
    
    // Prima verifica quanti record ci sono
    const { data: existing, error: checkError } = await supabase
      .from('power_rankings')
      .select('id, value, value_svg, source')
      .eq('match_id', matchId);
    
    if (checkError) {
      console.error('Errore check:', checkError.message);
      continue;
    }
    
    console.log(`   Trovati ${existing?.length || 0} record`);
    
    if (existing && existing.length > 0) {
      // Mostra stato attuale
      const withSvg = existing.filter(r => r.value_svg !== null).length;
      const withApi = existing.filter(r => r.value !== null).length;
      console.log(`   - Con value (API): ${withApi}`);
      console.log(`   - Con value_svg: ${withSvg}`);
      
      // Resetta value_svg a NULL per questi match (mantieni value API)
      const { error } = await supabase
        .from('power_rankings')
        .update({ value_svg: null, source: 'api' })
        .eq('match_id', matchId);
      
      if (error) {
        console.error('   ❌ Errore update:', error.message);
      } else {
        console.log('   ✅ value_svg resettato a NULL, source = api');
      }
    }
  }
  
  console.log('\n✅ Pulizia completata!');
}

cleanSvgData().catch(console.error);
