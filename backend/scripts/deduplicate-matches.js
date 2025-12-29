/**
 * SCRIPT: Deduplica match nel database
 *
 * Trova e rimuove duplicati basandosi su:
 * - Stessi giocatori (winner_name, loser_name)
 * - Date entro ±2 giorni
 * - Mantiene il record con più dati (preferisce sofascore)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');

async function findDuplicates() {
  console.log('🔍 Ricerca duplicati nel database...\n');
  console.log(`   Modalità: ${DRY_RUN ? 'DRY RUN (preview)' : 'LIVE (elimina duplicati)'}\n`);

  // Carica TUTTI i match (pagina per pagina)
  let allMatches = [];
  let offset = 0;
  const pageSize = 1000;

  /* eslint-disable-next-line no-constant-condition */
  while (true) {
    const { data: page, error } = await supabase
      .from('matches')
      .select(
        'id, winner_name, loser_name, start_time, data_source, surface, series, location, odds_b365_winner, winner_rank, w1, w2, w3'
      )
      .order('start_time', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Errore:', error);
      return;
    }

    if (!page || page.length === 0) break;

    allMatches = allMatches.concat(page);
    offset += pageSize;
    console.log(`   Caricati ${allMatches.length} match...`);
  }

  const matches = allMatches;

  console.log(`\nTotale match nel DB: ${matches.length}\n`);

  // Trova duplicati
  const duplicates = [];
  const processed = new Set();

  for (let i = 0; i < matches.length; i++) {
    const m1 = matches[i];
    if (processed.has(m1.id)) continue;

    // Salta match senza nomi giocatori
    if (!m1.winner_name || !m1.loser_name) continue;

    // Cerca match simili
    const similar = matches.filter((m2, j) => {
      if (j <= i || processed.has(m2.id)) return false;

      // Salta match senza nomi
      if (!m2.winner_name || !m2.loser_name) return false;

      // Stessi giocatori (in qualsiasi ordine)
      const samePlayersNormal =
        m1.winner_name === m2.winner_name && m1.loser_name === m2.loser_name;
      const samePlayersReverse =
        m1.winner_name === m2.loser_name && m1.loser_name === m2.winner_name;

      if (!samePlayersNormal && !samePlayersReverse) return false;

      // Date entro ±2 giorni
      const date1 = new Date(m1.start_time);
      const date2 = new Date(m2.start_time);
      const diffDays = Math.abs((date1 - date2) / (1000 * 60 * 60 * 24));

      return diffDays <= 2;
    });

    if (similar.length > 0) {
      // Trova il match "migliore" da tenere
      const all = [m1, ...similar];

      // Score di completezza
      const scoreMatch = (m) => {
        let score = 0;
        if (m.data_source === 'sofascore') score += 100;
        if (m.odds_b365_winner) score += 10;
        if (m.winner_rank) score += 10;
        if (m.w1 !== null) score += 5;
        if (m.w2 !== null) score += 5;
        if (m.w3 !== null) score += 5;
        if (m.series) score += 3;
        if (m.surface) score += 3;
        return score;
      };

      // Ordina per score decrescente
      all.sort((a, b) => scoreMatch(b) - scoreMatch(a));

      const keep = all[0];
      const remove = all.slice(1);

      duplicates.push({
        keep,
        remove,
        keepScore: scoreMatch(keep),
        removeScores: remove.map(scoreMatch),
      });

      // Marca come processati
      all.forEach((m) => processed.add(m.id));
    }
  }

  console.log(`\n📊 DUPLICATI TROVATI: ${duplicates.length}\n`);

  if (duplicates.length === 0) {
    console.log('✅ Nessun duplicato trovato!');
    return;
  }

  // Mostra dettagli
  let totalToRemove = 0;
  for (const dup of duplicates) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎾 ${dup.keep.winner_name} vs ${dup.keep.loser_name}`);
    console.log(`   Data: ${dup.keep.start_time?.substring(0, 10)}`);
    console.log(`\n   ✅ MANTIENI: ID ${dup.keep.id}`);
    console.log(`      Source: ${dup.keep.data_source}, Score: ${dup.keepScore}`);
    console.log(`      Location: ${dup.keep.location}, Series: ${dup.keep.series}`);

    for (let i = 0; i < dup.remove.length; i++) {
      const r = dup.remove[i];
      console.log(`\n   ❌ RIMUOVI: ID ${r.id}`);
      console.log(`      Source: ${r.data_source}, Score: ${dup.removeScores[i]}`);
      console.log(`      Date: ${r.start_time?.substring(0, 10)}`);
      totalToRemove++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n📊 RIEPILOGO:`);
  console.log(`   Gruppi duplicati: ${duplicates.length}`);
  console.log(`   Record da rimuovere: ${totalToRemove}`);

  // Esegui rimozione se non dry-run
  if (!DRY_RUN) {
    console.log('\n🗑️  Rimozione duplicati in corso...\n');

    let removed = 0;
    let errors = 0;

    for (const dup of duplicates) {
      for (const r of dup.remove) {
        const { error: delError } = await supabase.from('matches').delete().eq('id', r.id);

        if (delError) {
          console.error(`   ❌ Errore rimozione ${r.id}:`, delError.message);
          errors++;
        } else {
          console.log(`   ✅ Rimosso ${r.id} (${r.data_source})`);
          removed++;
        }
      }
    }

    console.log(`\n✅ COMPLETATO: ${removed} rimossi, ${errors} errori`);
  } else {
    console.log('\n⚠️  DRY RUN - nessuna modifica. Usa senza --dry-run per rimuovere.');
  }
}

findDuplicates();
