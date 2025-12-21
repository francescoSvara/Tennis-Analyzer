/**
 * Test del merge automatico - simula cosa succede quando si scrapa un match
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Normalizza nome
function normalizePlayerName(name) {
  if (!name) return '';
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, '').trim();
}

// Estrai cognome
function getLastName(name) {
  if (!name) return '';
  const parts = name.toLowerCase().trim().split(/\s+/);
  if (parts.length >= 1 && parts[parts.length - 1].match(/^[a-z]\.?$/)) {
    return parts[0];
  }
  return parts[parts.length - 1];
}

async function testMerge() {
  // Simula un match Sofascore: Ben Shelton vs Felix Auger-Aliassime, 12 novembre
  const sofascoreMatch = {
    home: { name: 'Ben Shelton' },
    away: { name: 'Felix Auger-Aliassime' },
    startTimestamp: new Date('2025-11-12T19:00:00Z').getTime() / 1000
  };
  
  console.log('🔍 Test merge per:', sofascoreMatch.home.name, 'vs', sofascoreMatch.away.name);
  console.log('   Data:', new Date(sofascoreMatch.startTimestamp * 1000).toISOString());
  
  const homeName = sofascoreMatch.home?.name;
  const awayName = sofascoreMatch.away?.name;
  const matchDate = new Date(sofascoreMatch.startTimestamp * 1000);
  
  // Cerca match xlsx nella stessa data (±2 giorni)
  const startDate = new Date(matchDate);
  startDate.setDate(startDate.getDate() - 2);
  const endDate = new Date(matchDate);
  endDate.setDate(endDate.getDate() + 2);
  
  console.log('\n📅 Range di ricerca:', startDate.toISOString(), '-', endDate.toISOString());
  
  const { data: xlsxMatches, error } = await supabase
    .from('matches')
    .select('id, winner_name, loser_name, start_time, data_source')
    .in('data_source', ['xlsx_import', 'xlsx_2025'])
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString());
  
  if (error) {
    console.error('❌ Errore query:', error.message);
    return;
  }
  
  console.log(`\n📊 Trovati ${xlsxMatches.length} match xlsx nel range:\n`);
  
  const homeNormalized = normalizePlayerName(homeName);
  const awayNormalized = normalizePlayerName(awayName);
  const homeLastName = getLastName(homeName);
  const awayLastName = getLastName(awayName);
  
  console.log('Nomi normalizzati Sofascore:');
  console.log(`  Home: "${homeNormalized}" (cognome: "${homeLastName}")`);
  console.log(`  Away: "${awayNormalized}" (cognome: "${awayLastName}")`);
  
  for (const xlsx of xlsxMatches) {
    const xlsxWinner = normalizePlayerName(xlsx.winner_name);
    const xlsxLoser = normalizePlayerName(xlsx.loser_name);
    const xlsxWinnerLast = getLastName(xlsx.winner_name);
    const xlsxLoserLast = getLastName(xlsx.loser_name);
    
    console.log(`\n📋 xlsx ID ${xlsx.id}:`);
    console.log(`   Winner: "${xlsx.winner_name}" -> "${xlsxWinner}" (cognome: "${xlsxWinnerLast}")`);
    console.log(`   Loser: "${xlsx.loser_name}" -> "${xlsxLoser}" (cognome: "${xlsxLoserLast}")`);
    console.log(`   Data: ${xlsx.start_time}`);
    
    // Check 1: Match esatto normalizzato
    const homeMatchesWinner = homeNormalized.includes(xlsxWinner) || xlsxWinner.includes(homeNormalized);
    const homeMatchesLoser = homeNormalized.includes(xlsxLoser) || xlsxLoser.includes(homeNormalized);
    const awayMatchesWinner = awayNormalized.includes(xlsxWinner) || xlsxWinner.includes(awayNormalized);
    const awayMatchesLoser = awayNormalized.includes(xlsxLoser) || xlsxLoser.includes(awayNormalized);
    
    console.log(`   Match nome completo: home-winner=${homeMatchesWinner}, home-loser=${homeMatchesLoser}, away-winner=${awayMatchesWinner}, away-loser=${awayMatchesLoser}`);
    
    if ((homeMatchesWinner && awayMatchesLoser) || (homeMatchesLoser && awayMatchesWinner)) {
      console.log(`   ✅ MATCH TROVATO (nome completo)!`);
      continue;
    }
    
    // Check 2: Match per cognome
    const homeLastMatchesWinner = homeLastName === xlsxWinnerLast;
    const homeLastMatchesLoser = homeLastName === xlsxLoserLast;
    const awayLastMatchesWinner = awayLastName === xlsxWinnerLast;
    const awayLastMatchesLoser = awayLastName === xlsxLoserLast;
    
    console.log(`   Match cognome: home-winner=${homeLastMatchesWinner}, home-loser=${homeLastMatchesLoser}, away-winner=${awayLastMatchesWinner}, away-loser=${awayLastMatchesLoser}`);
    
    if ((homeLastMatchesWinner && awayLastMatchesLoser) || (homeLastMatchesLoser && awayLastMatchesWinner)) {
      console.log(`   ✅ MATCH TROVATO (cognome)!`);
    } else {
      console.log(`   ❌ No match`);
    }
  }
}

testMerge().catch(console.error);
