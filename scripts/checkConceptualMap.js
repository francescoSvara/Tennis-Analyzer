/**
 * 🔍 CHECK MAPPA CONCETTUALE
 * 
 * Script per verificare tutti i riferimenti nella mappa concettuale.
 * Controlla:
 * - Esistenza file referenziati
 * - Linee di codice delle funzioni
 * - Documenti filosofie
 * - Tabelle database
 * 
 * Uso: node scripts/checkConceptualMap.js
 * Output: docs/TODO_MAPPA_CONCETTUALE.md
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CHECK_OUTPUT_FILE = path.join(ROOT_DIR, 'docs', 'CHECK_MAPPA_CONCETTUALE.md');
const TODO_LIST_FILE = path.join(ROOT_DIR, 'docs', 'TODO_LIST.md');

// ============================================================================
// DEFINIZIONE RIFERIMENTI DA VERIFICARE
// ============================================================================

const REFERENCES = {
  // Documenti Filosofie
  docs: [
    'docs/filosofie/FILOSOFIA_MADRE.md',
    'docs/filosofie/FILOSOFIA_DB.md',
    'docs/filosofie/FILOSOFIA_STATS_V2.md',
    'docs/filosofie/FILOSOFIA_LIVE_TRACKING.md',
    'docs/filosofie/FILOSOFIA_ODDS.md',
    'docs/filosofie/FILOSOFIA_FRONTEND_UI_UX.md',
    'docs/filosofie/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md',
    'docs/filosofie/FILOSOFIA_CONCEPT_CHECKS.md',
    'docs/specs/SPEC_FRONTEND_MOTION_UI.md',
    'docs/concept/rules.v1.json',
    'docs/MAPPA_RETE_CONCETTUALE.md',
    'docs/TODO_LIST.md'
  ],

  // Backend Services
  backendServices: [
    'backend/services/matchCardService.js',
    'backend/services/playerService.js',
    'backend/services/playerStatsService.js',
    'backend/services/playerProfileService.js',
    'backend/services/rawEventsProcessor.js',
    'backend/services/calculationQueueWorker.js',
    'backend/services/dataNormalizer.js',
    'backend/services/unifiedImporter.js'
  ],

  // Backend Utils
  backendUtils: [
    'backend/utils/valueInterpreter.js',
    'backend/utils/breakDetector.js',
    'backend/utils/matchSegmenter.js',
    'backend/utils/pressureCalculator.js'
  ],

  // Backend DB
  backendDb: [
    'backend/db/matchRepository.js',
    'backend/db/liveTrackingRepository.js',
    'backend/db/supabase.js'
  ],

  // Backend Other
  backendOther: [
    'backend/liveManager.js',
    'backend/scraper/sofascoreScraper.js',
    'backend/importXlsx.js',
    'backend/server.js'
  ],

  // Migrations
  migrations: [
    'backend/migrations/create-new-schema.sql',
    'backend/migrations/add-snapshot-queue-tables.sql',
    'backend/migrations/add-live-tracking-table.sql'
  ],

  // Frontend
  frontendComponents: [
    'src/components/MomentumTab.jsx',
    'src/components/QuotesTab.jsx',
    'src/components/ManualPredictor.jsx',
    'src/components/MatchCard.jsx',
    'src/components/MatchGrid.jsx',
    'src/components/MatchHeader.jsx',
    'src/components/Statistics.jsx',
    'src/components/PointByPoint.jsx',
    'src/components/PointByPointWidget.jsx',
    'src/components/PointRow.jsx',
    'src/components/MomentumChart.jsx',
    'src/components/IndicatorsChart.jsx',
    'src/components/PlayerPage.jsx',
    'src/components/HomePage.jsx',
    'src/components/Gestionale.jsx',
    'src/components/MonitoringDashboard.jsx',
    'src/components/PredictorTab.jsx',
    'src/components/SavedScrapes.jsx',
    'src/components/ErrorBoundary.jsx',
    'src/components/GameBlock.jsx',
    'src/components/SetBlock.jsx',
    'src/components/SportSidebar.jsx',
    'src/components/StatGroup.jsx',
    'src/components/StatRow.jsx'
  ],

  frontendHooks: [
    'src/hooks/useMatchCard.jsx',
    'src/hooks/useMatchData.jsx',
    'src/hooks/useLiveMatch.jsx'
  ],

  frontendUtils: [
    'src/utils.js'
  ]
};

// Funzioni da verificare con linea approssimativa
const FUNCTIONS_TO_CHECK = [
  // Backend - valueInterpreter.js
  { file: 'backend/utils/valueInterpreter.js', func: 'getThresholdsForSurface', expectedLine: 55 },
  { file: 'backend/utils/valueInterpreter.js', func: 'interpretGameValue', expectedLine: 98 },
  { file: 'backend/utils/valueInterpreter.js', func: 'calculateVolatility', expectedLine: 291 },
  { file: 'backend/utils/valueInterpreter.js', func: 'calculateElasticity', expectedLine: 330 },
  { file: 'backend/utils/valueInterpreter.js', func: 'classifyMatchCharacter', expectedLine: 386 },
  { file: 'backend/utils/valueInterpreter.js', func: 'analyzePowerRankingsEnhanced', expectedLine: 465 },
  
  // Backend - playerStatsService.js
  { file: 'backend/services/playerStatsService.js', func: 'getPlayerStats', expectedLine: 437 },
  { file: 'backend/services/playerStatsService.js', func: 'calculateComebackRate', expectedLine: 214 },
  { file: 'backend/services/playerStatsService.js', func: 'calculateROI', expectedLine: 252 },
  
  // Backend - dataNormalizer.js
  { file: 'backend/services/dataNormalizer.js', func: 'normalizePlayerName', expectedLine: 315 },
  { file: 'backend/services/dataNormalizer.js', func: 'generateMatchFingerprint', expectedLine: 481 },
  
  // Backend - liveManager.js
  { file: 'backend/liveManager.js', func: 'initLiveManager', expectedLine: 271 },
  { file: 'backend/liveManager.js', func: 'checkTrackedMatches', expectedLine: 857 },
  { file: 'backend/liveManager.js', func: 'reconcileLiveMatches', expectedLine: 678 },
  { file: 'backend/liveManager.js', func: 'fetchLiveMatchesList', expectedLine: 775 },
  { file: 'backend/liveManager.js', func: 'saveMatchToDatabase', expectedLine: 473 },
  { file: 'backend/liveManager.js', func: 'computeDataHash', expectedLine: 217 },
  
  // Frontend - utils.js
  { file: 'src/utils.js', func: 'extractKeyStats', expectedLine: 1590 },
  { file: 'src/utils.js', func: 'calculatePressureIndex', expectedLine: 1654 },
  { file: 'src/utils.js', func: 'analyzeLayTheWinner', expectedLine: 1744 },
  { file: 'src/utils.js', func: 'analyzeSuperBreak', expectedLine: 2082 },
  { file: 'src/utils.js', func: 'calculateDataCompleteness', expectedLine: 2326 },
  
  // Frontend - MomentumTab.jsx
  { file: 'src/components/MomentumTab.jsx', func: 'analyzeMomentumOwner', expectedLine: 152 },
  { file: 'src/components/MomentumTab.jsx', func: 'detectMomentumShift', expectedLine: 196 },
  
  // Frontend - ManualPredictor.jsx
  { file: 'src/components/ManualPredictor.jsx', func: 'calculatePrediction', expectedLine: 340 },
  
  // Frontend - QuotesTab.jsx
  { file: 'src/components/QuotesTab.jsx', func: 'calculateRankingProbability', expectedLine: 46 }
];

// Tabelle DB da verificare nei file SQL
const DB_TABLES = [
  // create-new-schema.sql
  { table: 'players_new', migration: 'create-new-schema.sql' },
  { table: 'player_aliases', migration: 'create-new-schema.sql' },
  { table: 'player_rankings', migration: 'create-new-schema.sql' },
  { table: 'player_career_stats', migration: 'create-new-schema.sql' },
  { table: 'tournaments_new', migration: 'create-new-schema.sql' },
  { table: 'matches_new', migration: 'create-new-schema.sql' },
  { table: 'match_data_sources', migration: 'create-new-schema.sql' },
  { table: 'match_statistics_new', migration: 'create-new-schema.sql' },
  { table: 'match_power_rankings_new', migration: 'create-new-schema.sql' },
  { table: 'match_point_by_point_new', migration: 'create-new-schema.sql' },
  { table: 'match_odds', migration: 'create-new-schema.sql' },
  { table: 'head_to_head', migration: 'create-new-schema.sql' },
  
  // add-snapshot-queue-tables.sql
  { table: 'match_card_snapshot', migration: 'add-snapshot-queue-tables.sql' },
  { table: 'raw_events', migration: 'add-snapshot-queue-tables.sql' },
  { table: 'calculation_queue', migration: 'add-snapshot-queue-tables.sql' },
  
  // add-live-tracking-table.sql
  { table: 'live_tracking', migration: 'add-live-tracking-table.sql' },
  { table: 'live_snapshots', migration: 'add-live-tracking-table.sql' }
];

// ============================================================================
// FUNZIONI DI VERIFICA
// ============================================================================

function checkFileExists(relativePath) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  return {
    exists: fs.existsSync(fullPath),
    path: relativePath,
    fullPath
  };
}

function findFunctionLine(filePath, funcName) {
  const fullPath = path.join(ROOT_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    return { found: false, line: null, error: 'File non trovato' };
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    
    // Pattern per trovare DICHIARAZIONI di funzione (non chiamate)
    // Ordine importante: pattern più specifici prima
    const patterns = [
      // export function name(
      new RegExp(`^\\s*export\\s+function\\s+${funcName}\\s*\\(`),
      // export async function name(
      new RegExp(`^\\s*export\\s+async\\s+function\\s+${funcName}\\s*\\(`),
      // function name(  - deve essere inizio riga (con possibili spazi)
      new RegExp(`^\\s*function\\s+${funcName}\\s*\\(`),
      // async function name(  - deve essere inizio riga
      new RegExp(`^\\s*async\\s+function\\s+${funcName}\\s*\\(`),
      // const name = ( - dichiarazione arrow function
      new RegExp(`^\\s*const\\s+${funcName}\\s*=\\s*\\(`),
      // const name = async ( - dichiarazione arrow function async
      new RegExp(`^\\s*const\\s+${funcName}\\s*=\\s*async\\s*\\(`),
      // export const name = - esportazione
      new RegExp(`^\\s*export\\s+const\\s+${funcName}\\s*=`),
      // name: function - metodo oggetto
      new RegExp(`^\\s*['"]?${funcName}['"]?\\s*:\\s*function`),
      // name: async function - metodo oggetto async
      new RegExp(`^\\s*['"]?${funcName}['"]?\\s*:\\s*async\\s+function`)
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip linee che sono chiamate (contengono await/return prima della funzione)
      if (/^\s*(await|return|\.)/.test(line) && line.includes(`${funcName}(`)) {
        continue;
      }
      
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          return { found: true, line: i + 1, content: line.trim() };
        }
      }
    }
    
    return { found: false, line: null, error: 'Funzione non trovata' };
  } catch (err) {
    return { found: false, line: null, error: err.message };
  }
}

function checkTableInMigration(tableName, migrationFile) {
  const fullPath = path.join(ROOT_DIR, 'backend/migrations', migrationFile);
  if (!fs.existsSync(fullPath)) {
    return { found: false, error: 'File migration non trovato' };
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const pattern = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${tableName}`, 'i');
    return { found: pattern.test(content) };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

// ============================================================================
// ESECUZIONE CHECK
// ============================================================================

function runCheck() {
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    },
    missingFiles: [],
    missingFunctions: [],
    lineMismatches: [],
    missingTables: [],
    newFilesDetected: [],
    warnings: []
  };

  console.log('🔍 Avvio verifica mappa concettuale...\n');

  // 1. Verifica file esistenti
  console.log('📁 Verifica file...');
  const allFiles = [
    ...REFERENCES.docs,
    ...REFERENCES.backendServices,
    ...REFERENCES.backendUtils,
    ...REFERENCES.backendDb,
    ...REFERENCES.backendOther,
    ...REFERENCES.migrations,
    ...REFERENCES.frontendComponents,
    ...REFERENCES.frontendHooks,
    ...REFERENCES.frontendUtils
  ];

  for (const file of allFiles) {
    results.summary.totalChecks++;
    const check = checkFileExists(file);
    if (check.exists) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
      results.missingFiles.push(file);
      console.log(`  ❌ ${file}`);
    }
  }

  // 2. Verifica funzioni e linee
  console.log('\n⚙️ Verifica funzioni...');
  for (const funcRef of FUNCTIONS_TO_CHECK) {
    results.summary.totalChecks++;
    const result = findFunctionLine(funcRef.file, funcRef.func);
    
    if (!result.found) {
      results.summary.failed++;
      results.missingFunctions.push({
        file: funcRef.file,
        func: funcRef.func,
        error: result.error
      });
      console.log(`  ❌ ${funcRef.func} in ${funcRef.file}`);
    } else if (Math.abs(result.line - funcRef.expectedLine) > 20) {
      // Tolleranza di 20 linee
      results.summary.warnings++;
      results.lineMismatches.push({
        file: funcRef.file,
        func: funcRef.func,
        expected: funcRef.expectedLine,
        actual: result.line,
        diff: result.line - funcRef.expectedLine
      });
      console.log(`  ⚠️ ${funcRef.func}: expected L${funcRef.expectedLine}, found L${result.line}`);
    } else {
      results.summary.passed++;
    }
  }

  // 3. Verifica tabelle DB
  console.log('\n🗄️ Verifica tabelle database...');
  for (const tableRef of DB_TABLES) {
    results.summary.totalChecks++;
    const result = checkTableInMigration(tableRef.table, tableRef.migration);
    
    if (!result.found) {
      results.summary.failed++;
      results.missingTables.push({
        table: tableRef.table,
        migration: tableRef.migration,
        error: result.error
      });
      console.log(`  ❌ ${tableRef.table} in ${tableRef.migration}`);
    } else {
      results.summary.passed++;
    }
  }

  // 4. Cerca nuovi file non documentati
  console.log('\n🔎 Cerca file non documentati...');
  const dirsToScan = [
    { dir: 'backend/services', pattern: '.js' },
    { dir: 'backend/utils', pattern: '.js' },
    { dir: 'src/components', pattern: '.jsx' },
    { dir: 'src/hooks', pattern: '.jsx' }
  ];

  for (const scan of dirsToScan) {
    const dirPath = path.join(ROOT_DIR, scan.dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith(scan.pattern));
      for (const file of files) {
        const relativePath = `${scan.dir}/${file}`;
        const isDocumented = allFiles.includes(relativePath);
        if (!isDocumented) {
          results.newFilesDetected.push(relativePath);
          console.log(`  📄 Non documentato: ${relativePath}`);
        }
      }
    }
  }

  return results;
}

// ============================================================================
// GENERA OUTPUT
// ============================================================================

function generateCheckMarkdown(results) {
  const date = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let md = `# 🔍 CHECK MAPPA CONCETTUALE

> Risultato verifica automatica: ${date}
> Script: \`scripts/checkConceptualMap.js\`

---

## 📊 Riepilogo

| Metrica | Valore |
|---------|--------|
| Check totali | ${results.summary.totalChecks} |
| ✅ Passati | ${results.summary.passed} |
| ❌ Falliti | ${results.summary.failed} |
| ⚠️ Warning | ${results.summary.warnings} |

---

`;

  // File mancanti
  if (results.missingFiles.length > 0) {
    md += `## ❌ File Mancanti

I seguenti file sono referenziati nella mappa ma non esistono:

| # | File | Azione |
|---|------|--------|
`;
    results.missingFiles.forEach((file, i) => {
      md += `| ${i + 1} | \`${file}\` | [ ] Creare o rimuovere riferimento |\n`;
    });
    md += '\n---\n\n';
  }

  // Funzioni mancanti
  if (results.missingFunctions.length > 0) {
    md += `## ❌ Funzioni Non Trovate

Le seguenti funzioni sono documentate ma non trovate nel codice:

| # | Funzione | File | Errore | Azione |
|---|----------|------|--------|--------|
`;
    results.missingFunctions.forEach((f, i) => {
      md += `| ${i + 1} | \`${f.func}()\` | \`${f.file}\` | ${f.error} | [ ] Verificare |\n`;
    });
    md += '\n---\n\n';
  }

  // Linee non corrispondenti
  if (results.lineMismatches.length > 0) {
    md += `## ⚠️ Linee da Aggiornare

Le seguenti funzioni hanno linee diverse da quelle documentate (diff > 20):

| # | Funzione | File | Documentata | Attuale | Diff | Azione |
|---|----------|------|-------------|---------|------|--------|
`;
    results.lineMismatches.forEach((m, i) => {
      const sign = m.diff > 0 ? '+' : '';
      md += `| ${i + 1} | \`${m.func}()\` | \`${m.file}\` | L${m.expected} | L${m.actual} | ${sign}${m.diff} | [ ] Aggiornare mappa |\n`;
    });
    md += '\n---\n\n';
  }

  // Tabelle mancanti
  if (results.missingTables.length > 0) {
    md += `## ❌ Tabelle DB Non Trovate

Le seguenti tabelle non sono state trovate nelle migrations:

| # | Tabella | Migration | Azione |
|---|---------|-----------|--------|
`;
    results.missingTables.forEach((t, i) => {
      md += `| ${i + 1} | \`${t.table}\` | \`${t.migration}\` | [ ] Verificare |\n`;
    });
    md += '\n---\n\n';
  }

  // Nuovi file non documentati
  if (results.newFilesDetected.length > 0) {
    md += `## 📄 File Non Documentati

I seguenti file esistono ma non sono nella mappa concettuale:

| # | File | Azione |
|---|------|--------|
`;
    results.newFilesDetected.forEach((file, i) => {
      md += `| ${i + 1} | \`${file}\` | [ ] Aggiungere alla mappa |\n`;
    });
    md += '\n---\n\n';
  }

  // Se tutto OK
  if (results.summary.failed === 0 && results.summary.warnings === 0 && results.newFilesDetected.length === 0) {
    md += `## ✅ Tutto OK!

Nessun problema rilevato. La mappa concettuale è allineata con il codice.

`;
  }

  // Istruzioni
  md += `---

## 📌 Prossime Azioni

`;
  
  if (results.summary.failed > 0 || results.summary.warnings > 0 || results.newFilesDetected.length > 0) {
    md += `1. Correggi i problemi elencati sopra
2. Aggiorna \`docs/MAPPA_RETE_CONCETTUALE.md\`
3. Ri-esegui: \`node scripts/checkConceptualMap.js\`
4. I problemi sono stati copiati in \`docs/TODO_LIST.md\`
`;
  } else {
    md += `Nessuna azione richiesta. Sistema allineato.
`;
  }

  md += `
---

*Generato da checkConceptualMap.js*
`;

  return md;
}

// ============================================================================
// AGGIORNA TODO_LIST.MD
// ============================================================================

function updateTodoList(results) {
  const date = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Leggi il file TODO_LIST esistente
  let todoContent = '';
  if (fs.existsSync(TODO_LIST_FILE)) {
    todoContent = fs.readFileSync(TODO_LIST_FILE, 'utf8');
  } else {
    console.log('⚠️  TODO_LIST.md non trovato, verrà creato');
    return;
  }

  // Genera la nuova sezione problemi
  let problemsSection = `## 🔍 Problemi Rilevati dal Check

> Sezione auto-popolata da \`node scripts/checkConceptualMap.js\`
> Ultimo check: ${date}

`;

  const hasProblems = results.summary.failed > 0 || 
                      results.summary.warnings > 0 || 
                      results.newFilesDetected.length > 0;

  if (!hasProblems) {
    problemsSection += `### Stato Attuale: ✅ Nessun problema

La mappa concettuale è allineata con il codice.

| Metrica | Valore |
|---------|--------|
| Check totali | ${results.summary.totalChecks} |
| ✅ Passati | ${results.summary.passed} |
| ❌ Falliti | ${results.summary.failed} |
| ⚠️ Warning | ${results.summary.warnings} |
`;
  } else {
    problemsSection += `### Stato Attuale: ⚠️ Problemi rilevati

| Metrica | Valore |
|---------|--------|
| Check totali | ${results.summary.totalChecks} |
| ✅ Passati | ${results.summary.passed} |
| ❌ Falliti | ${results.summary.failed} |
| ⚠️ Warning | ${results.summary.warnings} |

`;

    // File mancanti
    if (results.missingFiles.length > 0) {
      problemsSection += `### ❌ File Mancanti\n\n`;
      results.missingFiles.forEach((file, i) => {
        problemsSection += `- [ ] \`${file}\` - Creare o rimuovere riferimento\n`;
      });
      problemsSection += '\n';
    }

    // Funzioni mancanti
    if (results.missingFunctions.length > 0) {
      problemsSection += `### ❌ Funzioni Non Trovate\n\n`;
      results.missingFunctions.forEach((f, i) => {
        problemsSection += `- [ ] \`${f.func}()\` in \`${f.file}\` - ${f.error}\n`;
      });
      problemsSection += '\n';
    }

    // Linee non corrispondenti
    if (results.lineMismatches.length > 0) {
      problemsSection += `### ⚠️ Linee da Aggiornare\n\n`;
      results.lineMismatches.forEach((m, i) => {
        problemsSection += `- [ ] \`${m.func}()\` in \`${m.file}\`: L${m.expected} → L${m.actual}\n`;
      });
      problemsSection += '\n';
    }

    // File non documentati
    if (results.newFilesDetected.length > 0) {
      problemsSection += `### 📄 File Non Documentati\n\n`;
      results.newFilesDetected.forEach((file, i) => {
        problemsSection += `- [ ] \`${file}\` - Aggiungere alla mappa\n`;
      });
      problemsSection += '\n';
    }
  }

  // Trova e sostituisci la sezione problemi nel TODO_LIST
  const startMarker = '## 🔍 Problemi Rilevati dal Check';
  const endMarker = '## 📝 TODO Attivi';
  
  const startIdx = todoContent.indexOf(startMarker);
  const endIdx = todoContent.indexOf(endMarker);
  
  if (startIdx !== -1 && endIdx !== -1) {
    todoContent = todoContent.substring(0, startIdx) + 
                  problemsSection + 
                  '\n---\n\n' +
                  todoContent.substring(endIdx);
    
    fs.writeFileSync(TODO_LIST_FILE, todoContent, 'utf8');
    console.log(`📋 TODO_LIST aggiornato: ${TODO_LIST_FILE}`);
  } else {
    console.log('⚠️  Impossibile trovare sezione problemi in TODO_LIST.md');
  }
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🔍 CHECK MAPPA CONCETTUALE - React Betfair Tennis');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = runCheck();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📊 RIEPILOGO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   ✅ Passati:  ${results.summary.passed}`);
  console.log(`   ❌ Falliti:  ${results.summary.failed}`);
  console.log(`   ⚠️  Warning: ${results.summary.warnings}`);
  console.log(`   📄 Non doc:  ${results.newFilesDetected.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Genera file CHECK
  const checkMd = generateCheckMarkdown(results);
  fs.writeFileSync(CHECK_OUTPUT_FILE, checkMd, 'utf8');
  console.log(`🔍 CHECK generato: ${CHECK_OUTPUT_FILE}`);

  // Aggiorna sezione problemi in TODO_LIST
  updateTodoList(results);
  console.log('');

  // Exit code basato su risultati
  if (results.summary.failed > 0) {
    process.exit(1);
  }
}

main();
