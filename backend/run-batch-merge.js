/**
 * Script per eseguire il batch merge di tutti i match
 * Unisce automaticamente i dati xlsx con i match Sofascore corrispondenti
 * 
 * Uso: node run-batch-merge.js
 */

const matchRepository = require('./db/matchRepository');

async function main() {
  console.log('========================================');
  console.log('  BATCH MERGE: xlsx + Sofascore');
  console.log('========================================\n');
  
  try {
    const result = await matchRepository.batchMergeXlsxData();
    
    console.log('\n========================================');
    console.log('  RISULTATO FINALE');
    console.log('========================================');
    console.log(`  ✅ Match mergiati: ${result.merged}`);
    console.log(`  🗑️  xlsx eliminati: ${result.deleted || 0}`);
    console.log(`  ⚪ Non trovati: ${result.notFound}`);
    console.log('========================================\n');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Errore:', err.message);
    process.exit(1);
  }
}

main();
