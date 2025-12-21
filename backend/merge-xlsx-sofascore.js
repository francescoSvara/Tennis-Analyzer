/**
 * Script per eseguire il merge batch dei dati xlsx con sofascore
 * 
 * USO: node merge-xlsx-sofascore.js
 */

require('dotenv').config();
const { batchMergeXlsxData } = require('./db/matchRepository');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           MERGE DATI XLSX + SOFASCORE                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Questo script cerca match Sofascore che corrispondono a      ║
║  match xlsx e unisce i dati (quote, ranking, punteggi set)    ║
╚═══════════════════════════════════════════════════════════════╝
`);

batchMergeXlsxData()
  .then(result => {
    console.log('\n✨ Merge completato!');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(err => {
    console.error('💥 Errore:', err.message);
    process.exit(1);
  });
