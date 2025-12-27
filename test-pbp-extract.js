/**
 * Test script per estrarre PBP dal file "pbp code"
 * Esegui con: node test-pbp-extract.js
 */

const fs = require('fs');
const path = require('path');

// Leggi il file pbp code
const pbpFile = path.join(__dirname, 'backend', 'pbp code');
const html = fs.readFileSync(pbpFile, 'utf8');

console.log('📄 File letto:', html.length, 'caratteri\n');

// Importa l'estrattore (usa require per CommonJS)
const { extractSofascorePbp, generateSummary, formatForDatabase } = require('./Tennis-Scraper-Local/backend/utils/sofascorePbpExtractor.js');

// Estrai i dati
console.log('🔍 Estrazione PBP...\n');
const result = extractSofascorePbp(html);

if (!result.ok) {
  console.error('❌ Errore:', result.error);
  process.exit(1);
}

// Mostra summary
const summary = generateSummary(result);
console.log('📊 SUMMARY:');
console.log('  Players:', summary.players);
console.log('  Sets:', summary.sets);
console.log('  Total Games:', summary.totalGames);
console.log('  Total Points:', summary.totalPoints);
console.log('  Breaks:', summary.breakCount);
console.log('  Tiebreaks:', summary.tiebreaks);
console.log('  Games per Set:', summary.gamesPerSet);

console.log('\n📋 DETTAGLIO GAMES:');
result.games.forEach(g => {
  const breakTag = g.isBreak ? ' [BREAK]' : '';
  const tbTag = g.isTiebreak ? ' [TIEBREAK]' : '';
  console.log(`  S${g.set}G${g.game}: ${g.serverName || g.server} serves, ${g.points.length} pts, winner=${g.gameWinner}${breakTag}${tbTag}`);
  
  // Mostra primi 3 punti come esempio
  g.points.slice(0, 3).forEach(p => {
    console.log(`    P${p.pointNumber}: ${p.score} → ${p.pointWinner || '?'}`);
  });
  if (g.points.length > 3) {
    console.log(`    ... (${g.points.length - 3} more points)`);
  }
});

// Formatta per DB
const dbPoints = formatForDatabase(result, 14968724);
console.log('\n💾 Punti pronti per DB:', dbPoints.length);

// Mostra primi 5 record DB
console.log('\nPrimi 5 record DB:');
dbPoints.slice(0, 5).forEach(p => {
  console.log(`  S${p.set_number}G${p.game_number}P${p.point_number}: ${p.home_score}-${p.away_score} winner=${p.point_winner}`);
});

// Salva in JSON per debug
const outputFile = path.join(__dirname, 'pbp-extracted.json');
fs.writeFileSync(outputFile, JSON.stringify({ result, summary, dbPoints }, null, 2));
console.log('\n✅ Salvato in:', outputFile);
