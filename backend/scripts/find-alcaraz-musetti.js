/**
 * Cerca TUTTI i match Alcaraz vs Musetti in qualsiasi data
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getLastName(name) {
  if (!name) return '';
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).pop() || '';
}

async function findAlcarazMusetti() {
  console.log('🔍 Cercando TUTTI i match con Alcaraz O Musetti...\n');
  
  // Carica tutti i match
  let allMatches = [];
  let offset = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: page } = await supabase
      .from('matches')
      .select('*')
      .order('start_time', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    if (!page || page.length === 0) break;
    allMatches = [...allMatches, ...page];
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  
  console.log(`Totale match nel DB: ${allMatches.length}\n`);
  
  // Filtra match con Alcaraz E Musetti insieme
  const alcarazMusetti = allMatches.filter(m => {
    const raw = m.raw_json || {};
    const p1 = m.winner_name || raw.homeTeam?.name || raw.mapping?.home?.name || '';
    const p2 = m.loser_name || raw.awayTeam?.name || raw.mapping?.away?.name || '';
    
    const hasAlcaraz = getLastName(p1) === 'alcaraz' || getLastName(p2) === 'alcaraz';
    const hasMusetti = getLastName(p1) === 'musetti' || getLastName(p2) === 'musetti';
    
    return hasAlcaraz && hasMusetti;
  });
  
  console.log(`Match Alcaraz vs Musetti trovati: ${alcarazMusetti.length}\n`);
  
  for (const m of alcarazMusetti) {
    const raw = m.raw_json || {};
    const p1 = m.winner_name || raw.homeTeam?.name || raw.mapping?.home?.name || '?';
    const p2 = m.loser_name || raw.awayTeam?.name || raw.mapping?.away?.name || '?';
    const tourney = raw.tournament?.uniqueTournament?.name || raw.tournament?.name || m.series || '?';
    
    console.log(`ID: ${m.id}`);
    console.log(`  Giocatori: ${p1} vs ${p2}`);
    console.log(`  Torneo: ${tourney}`);
    console.log(`  Data: ${m.start_time}`);
    console.log(`  Fonte: ${m.data_source}`);
    console.log(`  Status: ${m.status_type || 'null'}`);
    console.log('');
  }
}

findAlcarazMusetti().catch(console.error);
