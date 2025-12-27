/**
 * Test Script per PBP Extraction
 * Testa l'estrazione dei dati point-by-point dall'HTML SofaScore
 */

const fs = require('fs');
const path = require('path');
const { extractSofascorePbp, formatForDatabase, generateSummary } = require('./utils/sofascorePbpExtractor.cjs');

// Leggi il file HTML
const htmlPath = path.join(__dirname, 'pbp code');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log('=== TEST PBP EXTRACTION ===');
console.log(`HTML length: ${html.length} bytes`);
console.log('');

// Esegui estrazione
const result = extractSofascorePbp(html);

if (!result.ok) {
  console.log('❌ ERRORE:', result.error);
  process.exit(1);
}

console.log('✅ Estrazione riuscita!');
console.log('');

// 1. Players
console.log('=== GIOCATORI ===');
console.log(`Home: ${result.players.home} (ID: ${result.playerIds.home})`);
console.log(`Away: ${result.players.away} (ID: ${result.playerIds.away})`);
console.log('');

// 2. Sets
console.log('=== SET ===');
result.sets.forEach(s => {
  console.log(`Set ${s.setNumber}: ${s.duration}m, ${s.games.length} games`);
});
console.log('');

// 3. Games summary
console.log('=== GAMES ===');
console.log(`Totale: ${result.games.length} games, ${result.totalPoints} punti`);
console.log('');

// 4. Games per set con dettagli
console.log('=== SET 1 (6-7 tiebreak) ===');
const set1Games = result.games.filter(g => g.set === 1);
set1Games.forEach(g => {
  const breakLabel = g.isBreak ? '[BREAK]' : '';
  const tbLabel = g.isTiebreak ? '[TIEBREAK]' : '';
  console.log(`  G${g.game}: ${g.serverName || '?'} (${g.server}) ${breakLabel} ${tbLabel} - ${g.points.length} pts, winner: ${g.gameWinner}`);
  if (g.points.length > 0) {
    const scores = g.points.map(p => p.score).join(' ');
    console.log(`       ${scores}`);
  }
});
console.log('');

console.log('=== SET 2 (4-6) ===');
const set2Games = result.games.filter(g => g.set === 2);
set2Games.forEach(g => {
  const breakLabel = g.isBreak ? '[BREAK]' : '';
  console.log(`  G${g.game}: ${g.serverName || '?'} (${g.server}) ${breakLabel} - ${g.points.length} pts, winner: ${g.gameWinner}`);
  if (g.points.length > 0 && g.points.length <= 6) {
    const scores = g.points.map(p => p.score).join(' ');
    console.log(`       ${scores}`);
  }
});
console.log('');

// 5. Verifica break
console.log('=== VERIFICA BREAK ===');
const breaks = result.games.filter(g => g.isBreak);
console.log(`Breaks trovati: ${breaks.length}`);
breaks.forEach(b => {
  console.log(`  Set ${b.set} Game ${b.game}: ${b.serverName} serviva, vinto da ${b.gameWinner}`);
});
console.log('');

// 6. Verifica tiebreak
console.log('=== VERIFICA TIEBREAK ===');
const tiebreaks = result.games.filter(g => g.isTiebreak);
console.log(`Tiebreaks trovati: ${tiebreaks.length}`);
tiebreaks.forEach(tb => {
  console.log(`  Set ${tb.set} Game ${tb.game}: ${tb.points.length} punti`);
  if (tb.points.length > 0) {
    const lastPoint = tb.points[tb.points.length - 1];
    console.log(`  Ultimo score: ${lastPoint.score}, vinto da ${tb.gameWinner}`);
  }
});
console.log('');

// 7. Formato DB preview
console.log('=== FORMATO DATABASE (primi 5 punti) ===');
const dbPoints = formatForDatabase(result, 14968724);
console.log(`Punti per DB: ${dbPoints.length}`);
dbPoints.slice(0, 5).forEach(p => {
  console.log(`  S${p.set_number}G${p.game_number}P${p.point_number}: ${p.home_score}-${p.away_score} | winner: ${p.point_winner} | server: ${p.server}`);
});
console.log('');

// 8. Summary
console.log('=== SUMMARY ===');
const summary = generateSummary(result);
console.log(JSON.stringify(summary, null, 2));
console.log('');

// 9. Verifica attesa
console.log('=== VERIFICA ATTESE ===');
console.log(`✓ Totale games: ${result.games.length} (atteso: 23)`);
console.log(`✓ Set 1 games: ${set1Games.length} (atteso: 13)`);
console.log(`✓ Set 2 games: ${set2Games.length} (atteso: 10)`);
console.log(`✓ Breaks: ${breaks.length} (atteso: 1)`);
console.log(`✓ Tiebreaks: ${tiebreaks.length} (atteso: 1)`);

if (result.games.length === 23 && breaks.length === 1 && tiebreaks.length === 1) {
  console.log('');
  console.log('✅ TUTTI I CONTROLLI PASSATI!');
} else {
  console.log('');
  console.log('⚠️ Alcuni controlli non corrispondono');
}
