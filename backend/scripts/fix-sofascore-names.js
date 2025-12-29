/**
 * SCRIPT: Popola winner_name/loser_name dai raw_json Sofascore
 * e poi fa merge con xlsx duplicati
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');

async function fixSofascoreNames() {
  console.log('🔧 Fix nomi Sofascore da raw_json...\n');
  console.log(`   Modalità: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // Trova match Sofascore con nomi vuoti
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, winner_name, loser_name, winner_code, raw_json, data_source')
    .or('winner_name.is.null,winner_name.eq.,loser_name.is.null,loser_name.eq.')
    .not('raw_json', 'is', null);

  if (error) {
    console.error('Errore:', error);
    return;
  }

  console.log(`Match con nomi vuoti e raw_json: ${matches.length}\n`);

  let fixed = 0;
  let errors = 0;

  for (const match of matches) {
    try {
      const raw = match.raw_json;

      // Estrai nomi da mapping nel raw_json
      let homeName = '';
      let awayName = '';

      if (raw?.mapping?.home?.name) {
        homeName = raw.mapping.home.name;
      }
      if (raw?.mapping?.away?.name) {
        awayName = raw.mapping.away.name;
      }

      // Se non trovati nel mapping, cerca in event
      if (!homeName && raw?.event?.homeTeam?.name) {
        homeName = raw.event.homeTeam.name;
      }
      if (!awayName && raw?.event?.awayTeam?.name) {
        awayName = raw.event.awayTeam.name;
      }

      if (!homeName || !awayName) {
        console.log(`   ⚠️  ID ${match.id}: nomi non trovati nel raw_json`);
        continue;
      }

      // Determina winner/loser dal winner_code
      let winnerName, loserName;
      if (match.winner_code === 1) {
        winnerName = homeName;
        loserName = awayName;
      } else if (match.winner_code === 2) {
        winnerName = awayName;
        loserName = homeName;
      } else {
        // Se non c'è winner_code, usa home come winner (default)
        winnerName = homeName;
        loserName = awayName;
      }

      console.log(`   🎾 ID ${match.id}: ${winnerName} vs ${loserName}`);

      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            winner_name: winnerName,
            loser_name: loserName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', match.id);

        if (updateError) {
          console.error(`   ❌ Errore update ${match.id}:`, updateError.message);
          errors++;
        } else {
          fixed++;
        }
      } else {
        fixed++;
      }
    } catch (e) {
      console.error(`   ❌ Errore ${match.id}:`, e.message);
      errors++;
    }
  }

  console.log(`\n✅ COMPLETATO: ${fixed} aggiornati, ${errors} errori`);
}

fixSofascoreNames();
