/**
 * 🔄 GENERATE TODO REPORT
 * 
 * Funzione unificata per generare report nei docs.
 * Esegue sia checkConceptualMap che runConceptChecks e consolida i risultati.
 * 
 * Uso: node scripts/generateTodoReport.js
 * 
 * Output:
 *   - Aggiorna docs/TODO_LIST.md con sezione Report Check Mappa
 *   - Aggiorna docs/checks/CHECK_MAPPA_CONCETTUALE.md
 *   - Aggiorna docs/checks/report.md (se runConceptChecks è eseguito)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const TODO_LIST_FILE = path.join(ROOT_DIR, 'docs', 'TODO_LIST.md');

// ============================================================================
// ESEGUI TUTTI I CHECK
// ============================================================================

function runAllChecks() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🔄 GENERATE TODO REPORT - Tennis Analyzer');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const results = {
    checkConceptualMap: null,
    runConceptChecks: null,
    timestamp: new Date().toISOString()
  };
  
  // 1. Esegui checkConceptualMap.js
  console.log('📋 Esecuzione checkConceptualMap.js...');
  try {
    const output = execSync('node scripts/checkConceptualMap.js', { 
      cwd: ROOT_DIR, 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log('   ✅ checkConceptualMap.js completato');
    results.checkConceptualMap = { success: true, output };
  } catch (err) {
    console.log('   ⚠️ checkConceptualMap.js completato con warning');
    results.checkConceptualMap = { success: false, error: err.message };
  }
  
  // 2. Verifica se esiste rules.v2.json per runConceptChecks
  const rulesFile = path.join(ROOT_DIR, 'docs', 'concept', 'rules.v2.json');
  if (fs.existsSync(rulesFile)) {
    console.log('\n📋 Esecuzione runConceptChecks.js...');
    try {
      const output = execSync('node scripts/runConceptChecks.js', { 
        cwd: ROOT_DIR, 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      console.log('   ✅ runConceptChecks.js completato');
      results.runConceptChecks = { success: true, output };
    } catch (err) {
      console.log('   ⚠️ runConceptChecks.js completato con errori');
      results.runConceptChecks = { success: false, error: err.message };
    }
  } else {
    console.log('\n⚠️ rules.v2.json non trovato, skip runConceptChecks.js');
  }
  
  return results;
}

// ============================================================================
// GENERA SUMMARY
// ============================================================================

function generateSummary(results) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📊 RIEPILOGO');
  console.log('═══════════════════════════════════════════════════════════');
  
  console.log('\n📁 File aggiornati:');
  console.log('   - docs/checks/CHECK_MAPPA_CONCETTUALE.md');
  console.log('   - docs/TODO_LIST.md (sezione Report Check Mappa)');
  
  if (results.runConceptChecks) {
    console.log('   - docs/checks/report.md');
    console.log('   - docs/checks/report.json');
  }
  
  console.log('\n🛠️ Comandi per verifiche manuali:');
  console.log('   node scripts/checkConceptualMap.js');
  console.log('   node scripts/runConceptChecks.js');
  console.log('   node scripts/cleanDuplicates.js --dry-run');
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const results = runAllChecks();
  generateSummary(results);
  
  console.log('✅ Report generato con successo!\n');
}

// Esporta funzioni per uso esterno
module.exports = {
  runAllChecks,
  generateSummary
};

// Esegui se chiamato direttamente
if (require.main === module) {
  main();
}
