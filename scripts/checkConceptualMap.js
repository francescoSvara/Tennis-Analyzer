/**
 * 🔍 CHECK MAPPA CONCETTUALE
 * 
 * Script per verificare tutti i riferimenti nella mappa concettuale.
 * Controlla:
 * - Esistenza file referenziati
 * - Linee di codice delle funzioni
 * - Documenti filosofie
 * - Tabelle database
 * - Violazioni architetturali (MatchBundle-Centric)
 * 
 * Uso: node scripts/checkConceptualMap.js
 * Output: docs/CHECK_MAPPA_CONCETTUALE.md
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CHECK_OUTPUT_FILE = path.join(ROOT_DIR, 'docs', 'checks', 'CHECK_MAPPA_CONCETTUALE.md');
const TODO_LIST_FILE = path.join(ROOT_DIR, 'docs', 'TODO_LIST.md');

// ============================================================================
// DEFINIZIONE RIFERIMENTI DA VERIFICARE
// ============================================================================

const REFERENCES = {
  // Documenti Filosofie (nuova struttura gerarchica)
  docs: [
    // 00_foundation
    'docs/filosofie/00_foundation/FILOSOFIA_MADRE_TENNIS.md',
    'docs/filosofie/00_foundation/FILOSOFIA_CONCEPT_CHECKS.md',
    // 10_data_platform
    'docs/filosofie/10_data_platform/storage/FILOSOFIA_DB.md',
    'docs/filosofie/10_data_platform/temporal/FILOSOFIA_TEMPORAL.md',
    'docs/filosofie/10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md',
    'docs/filosofie/10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md',
    'docs/filosofie/10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md',
    // 20_domain_tennis
    'docs/filosofie/20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md',
    // 30_domain_odds_markets
    'docs/filosofie/30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md',
    // 40_analytics_features_models
    'docs/filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md',
    'docs/filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md',
    // 50_strategy_risk_execution
    'docs/filosofie/50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md',
    // 70_frontend
    'docs/filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md',
    'docs/filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md',
    // Index
    'docs/filosofie/INDEX_FILOSOFIE.md',
    // Specs
    'docs/specs/HPI_RESILIENCE.md',
    'docs/specs/SPEC_FRONTEND_MOTION_UI.md',
    'docs/specs/SPEC_VALUE_SVG.md',
    'docs/specs/FRONTEND_MIGRATION.md',
    'docs/specs/DEPRECATION_FRONTEND_UTILS.md',
    // Checks
    'docs/checks/MAPPA_RETE_CONCETTUALE_V2.md',
    'docs/checks/CHECK_MAPPA_CONCETTUALE.md',
    // Root docs
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
    'backend/services/unifiedImporter.js',
    'backend/services/strategyStatsService.js',
    'backend/services/dataQualityChecker.js',
    'backend/services/riskEngine.js'
  ],

  // Backend Strategies
  backendStrategies: [
    'backend/strategies/strategyEngine.js'
  ],

  // Backend Utils (tutti i file .js esistenti)
  backendUtils: [
    'backend/utils/featureEngine.js',
    'backend/utils/valueInterpreter.js',
    'backend/utils/breakDetector.js',
    'backend/utils/matchSegmenter.js',
    'backend/utils/pressureCalculator.js',
    'backend/utils/svgMomentumExtractor.js',
    'backend/utils/logger.js'
  ],

  // Backend DB
  backendDb: [
    'backend/db/matchRepository.js',
    'backend/db/liveTrackingRepository.js',
    'backend/db/betDecisionsRepository.js',
    'backend/db/supabase.js'
  ],

  // Backend Other
  backendOther: [
    'backend/liveManager.js',
    'backend/scraper/sofascoreScraper.js',
    'backend/server.js'
  ],

  // Migrations
  migrations: [
    'backend/migrations/create-new-schema.sql',
    'backend/migrations/add-snapshot-queue-tables.sql',
    'backend/migrations/add-live-tracking-table.sql'
  ],

  // Frontend - Components esistenti
  frontendComponents: [
    // Root components
    'src/components/HomePage.jsx',
    'src/components/ErrorBoundary.jsx',
    'src/components/MatchCard.jsx',
    'src/components/MatchGrid.jsx',
    'src/components/PlayerPage.jsx',
    'src/components/MonitoringDashboard.jsx',
    'src/components/SportSidebar.jsx',
    'src/components/StrategiesPanel.jsx',
    // Match page
    'src/components/match/MatchPage.jsx',
    // Match tabs
    'src/components/match/tabs/OverviewTab.jsx',
    'src/components/match/tabs/StatsTab.jsx',
    'src/components/match/tabs/MomentumTab.jsx',
    'src/components/match/tabs/StrategiesTab.jsx',
    'src/components/match/tabs/OddsTab.jsx',
    'src/components/match/tabs/PredictorTab.jsx',
    'src/components/match/tabs/PointByPointTab.jsx',
    'src/components/match/tabs/JournalTab.jsx'
  ],

  // Frontend - Hooks (includendo quelli da creare)
  frontendHooks: [
    'src/hooks/useMatchBundle.jsx',
    'src/hooks/useMatchCard.jsx',
    'src/hooks/useMatchData.jsx',
    'src/hooks/useLiveMatch.jsx'
  ],

  // Frontend Motion - esistenti
  frontendMotion: [
    'src/motion/index.js',
    'src/motion/tokens.js',
    'src/motion/MotionCard.jsx',
    'src/motion/MotionButton.jsx',
    'src/motion/MotionTab.jsx',
    'src/motion/MotionRow.jsx'
  ],

  // Note: src/utils.js eliminato il 25 Dic 2025 (era dead code)
  frontendUtils: [],

  // Scripts di verifica architetturale
  scripts: [
    'scripts/checkConceptualMap.js',
    'scripts/runConceptChecks.js',
    'scripts/cleanDuplicates.js',
    'scripts/generateTodoReport.js'
  ]
};

// Funzioni da verificare con linea approssimativa
const FUNCTIONS_TO_CHECK = [
  // Backend - featureEngine.js (NUOVO - principale)
  { file: 'backend/utils/featureEngine.js', func: 'calculateVolatility', expectedLine: 44 },
  { file: 'backend/utils/featureEngine.js', func: 'calculateDominance', expectedLine: 92 },
  { file: 'backend/utils/featureEngine.js', func: 'calculateServeDominance', expectedLine: 126 },
  { file: 'backend/utils/featureEngine.js', func: 'calculateBreakProbability', expectedLine: 191 },
  { file: 'backend/utils/featureEngine.js', func: 'calculateRecentMomentum', expectedLine: 277 },
  { file: 'backend/utils/featureEngine.js', func: 'computeFeatures', expectedLine: 353 },
  { file: 'backend/utils/featureEngine.js', func: 'calculateVolatilityFromScore', expectedLine: 523 },
  { file: 'backend/utils/featureEngine.js', func: 'calculateDominanceFromScore', expectedLine: 554 },
  { file: 'backend/utils/featureEngine.js', func: 'calculateDominanceFromOdds', expectedLine: 589 },
  { file: 'backend/utils/featureEngine.js', func: 'calculateServeDominanceFromRankings', expectedLine: 624 },
  { file: 'backend/utils/featureEngine.js', func: 'calculateBreakProbabilityFromOddsRankings', expectedLine: 649 },
  
  // Backend - strategyEngine.js
  { file: 'backend/strategies/strategyEngine.js', func: 'evaluateAll', expectedLine: 39 },
  { file: 'backend/strategies/strategyEngine.js', func: 'evaluateLayWinner', expectedLine: 63 },
  { file: 'backend/strategies/strategyEngine.js', func: 'evaluateBancaServizio', expectedLine: 148 },
  { file: 'backend/strategies/strategyEngine.js', func: 'evaluateSuperBreak', expectedLine: 222 },
  { file: 'backend/strategies/strategyEngine.js', func: 'evaluateTiebreakSpecialist', expectedLine: 307 },
  { file: 'backend/strategies/strategyEngine.js', func: 'evaluateMomentumSwing', expectedLine: 378 },
  
  // Backend - valueInterpreter.js (legacy)
  { file: 'backend/utils/valueInterpreter.js', func: 'getThresholdsForSurface', expectedLine: 55 },
  { file: 'backend/utils/valueInterpreter.js', func: 'interpretGameValue', expectedLine: 98 },
  
  // Backend - playerStatsService.js
  { file: 'backend/services/playerStatsService.js', func: 'getPlayerStats', expectedLine: 437 },
  { file: 'backend/services/playerStatsService.js', func: 'calculateComebackRate', expectedLine: 214 },
  { file: 'backend/services/playerStatsService.js', func: 'calculateROI', expectedLine: 252 },
  
  // Backend - liveManager.js
  { file: 'backend/liveManager.js', func: 'initLiveManager', expectedLine: 297 },
  { file: 'backend/liveManager.js', func: 'syncMatch', expectedLine: 1242 },
  
  // Frontend - useMatchBundle.jsx (NUOVO - principale)
  { file: 'src/hooks/useMatchBundle.jsx', func: 'useMatchBundle', expectedLine: 44 },
  { file: 'src/hooks/useMatchBundle.jsx', func: 'useTabData', expectedLine: 354 },
  { file: 'src/hooks/useMatchBundle.jsx', func: 'useHeaderData', expectedLine: 364 }
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
// VIOLAZIONI ARCHITETTURALI DA VERIFICARE (MatchBundle-Centric)
// Ref: FILOSOFIA_CONCEPT_CHECKS.md, FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md
// ============================================================================

const ARCHITECTURAL_CHECKS = [
  // 1. Endpoint Bundle deve esistere
  {
    id: 'BUNDLE_ENDPOINT',
    description: 'Endpoint /api/match/:id/bundle deve esistere',
    file: 'backend/server.js',
    pattern: /app\.(get|post)\s*\(\s*['"`]\/api\/match\/:.*\/bundle/i,
    severity: 'ERROR',
    reference: 'docs/filosofie/10_data_platform/storage/FILOSOFIA_DB.md#sezione-3'
  },
  // 2. Hook useMatchBundle deve esistere
  {
    id: 'USE_MATCH_BUNDLE_HOOK',
    description: 'Hook useMatchBundle.jsx deve esistere per consumare MatchBundle',
    file: 'src/hooks/useMatchBundle.jsx',
    mustExist: true,
    severity: 'ERROR',
    reference: 'docs/filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md#sezione-3'
  },
  // 3. Strategy Engine deve esistere e avere evaluateAll
  {
    id: 'STRATEGY_ENGINE_IMPLEMENTED',
    description: 'Strategy Engine deve avere evaluateAll() implementato',
    file: 'backend/strategies/strategyEngine.js',
    pattern: /function\s+evaluateAll|exports\.evaluateAll|evaluateAll\s*=/,
    severity: 'ERROR',
    reference: 'docs/filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md#sezione-6'
  },
  // 4. Feature Engine deve esistere e avere computeFeatures
  {
    id: 'FEATURE_ENGINE_IMPLEMENTED',
    description: 'Feature Engine deve avere computeFeatures() implementato',
    file: 'backend/utils/featureEngine.js',
    pattern: /function\s+computeFeatures|exports\.computeFeatures|computeFeatures\s*=/,
    severity: 'ERROR',
    reference: 'docs/filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md#sezione-5'
  },
  // 5. Frontend non deve calcolare strategie
  // Note: src/utils.js eliminato, check ora solo su componenti residui
  {
    id: 'STRATEGY_IN_FRONTEND',
    description: 'Strategie (analyzeLayTheWinner, etc.) non devono essere nel frontend',
    files: ['src/components/StrategiesPanel.jsx', 'src/components/StrategiesLivePanel.jsx'],
    pattern: /export\s+function\s+(analyzeLayTheWinner|analyzeBancaServizio|analyzeSuperBreak)/,
    shouldNotExist: true,
    severity: 'WARN',
    reference: 'docs/filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md#sezione-2'
  },
  // 6. Frontend non deve calcolare DataCompleteness
  // Note: src/utils.js eliminato il 25 Dic 2025 - check non più necessario
  // Mantenuto per eventuale regressione in altri file
  {
    id: 'DATA_COMPLETENESS_FRONTEND',
    description: 'calculateDataCompleteness non deve essere nel frontend',
    files: ['src/components/*.jsx'],
    pattern: /export\s+function\s+calculateDataCompleteness/,
    shouldNotExist: true,
    severity: 'WARN',
    reference: 'docs/filosofie/00_foundation/FILOSOFIA_CONCEPT_CHECKS.md#invariante-35'
  },
  // 7. Struttura cartelle filosofie (CI sulla struttura)
  {
    id: 'PHILOSOPHY_FOLDER_STRUCTURE',
    description: 'Le filosofie devono stare nella cartella architetturale corretta',
    files: [
      'docs/filosofie/00_foundation/FILOSOFIA_MADRE_TENNIS.md',
      'docs/filosofie/00_foundation/FILOSOFIA_CONCEPT_CHECKS.md',
      'docs/filosofie/10_data_platform/storage/FILOSOFIA_DB.md',
      'docs/filosofie/10_data_platform/temporal/FILOSOFIA_TEMPORAL.md',
      'docs/filosofie/10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md',
      'docs/filosofie/10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md',
      'docs/filosofie/10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md',
      'docs/filosofie/20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md',
      'docs/filosofie/30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md',
      'docs/filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md',
      'docs/filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md',
      'docs/filosofie/50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md',
      'docs/filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md',
      'docs/filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md'
    ],
    mustAllExist: true,
    severity: 'ERROR',
    reference: 'docs/filosofie/INDEX_FILOSOFIE.md#struttura-cartelle'
  }
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
// VERIFICA ARCHITETTURALE (MatchBundle-Centric)
// ============================================================================

function runArchitecturalChecks() {
  const violations = [];
  
  console.log('\n🏗️  Verifica architetturale (MatchBundle-Centric)...');
  
  for (const check of ARCHITECTURAL_CHECKS) {
    // Check file must exist
    if (check.mustExist) {
      const fullPath = path.join(ROOT_DIR, check.file);
      if (!fs.existsSync(fullPath)) {
        violations.push({
          id: check.id,
          severity: check.severity,
          description: check.description,
          file: check.file,
          issue: 'FILE_MISSING',
          reference: check.reference
        });
        console.log(`  ❌ ${check.id}: ${check.file} non esiste`);
      } else {
        console.log(`  ✅ ${check.id}: ${check.file} esiste`);
      }
      continue;
    }
    
    // Check single file for pattern
    if (check.file && check.pattern) {
      const fullPath = path.join(ROOT_DIR, check.file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const found = check.pattern.test(content);
        
        if (check.shouldNotExist && found) {
          violations.push({
            id: check.id,
            severity: check.severity,
            description: check.description,
            file: check.file,
            issue: 'PATTERN_SHOULD_NOT_EXIST',
            reference: check.reference
          });
          console.log(`  ❌ ${check.id}: Pattern trovato in ${check.file} (non dovrebbe esserci)`);
        } else if (!check.shouldNotExist && !found) {
          violations.push({
            id: check.id,
            severity: check.severity,
            description: check.description,
            file: check.file,
            issue: 'PATTERN_MISSING',
            reference: check.reference
          });
          console.log(`  ❌ ${check.id}: Pattern non trovato in ${check.file}`);
        } else {
          console.log(`  ✅ ${check.id}: OK`);
        }
      }
      continue;
    }
    
    // Check antiPattern (should NOT exist)
    if (check.file && check.antiPattern) {
      const fullPath = path.join(ROOT_DIR, check.file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const found = check.antiPattern.test(content);
        
        if (found) {
          violations.push({
            id: check.id,
            severity: check.severity,
            description: check.description,
            file: check.file,
            issue: 'ANTI_PATTERN_FOUND',
            reference: check.reference
          });
          console.log(`  ❌ ${check.id}: Anti-pattern trovato in ${check.file}`);
        } else {
          console.log(`  ✅ ${check.id}: OK`);
        }
      }
      continue;
    }
    
    // Check multiple files
    if (check.files && check.pattern) {
      let foundInAny = false;
      let foundFiles = [];
      
      for (const file of check.files) {
        const fullPath = path.join(ROOT_DIR, file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (check.pattern.test(content)) {
            foundInAny = true;
            foundFiles.push(file);
          }
        }
      }
      
      if (check.shouldNotExist && foundInAny) {
        violations.push({
          id: check.id,
          severity: check.severity,
          description: check.description,
          file: foundFiles.join(', '),
          issue: 'PATTERN_SHOULD_NOT_EXIST',
          reference: check.reference
        });
        console.log(`  ❌ ${check.id}: Pattern trovato in ${foundFiles.join(', ')}`);
      } else if (!check.shouldNotExist && !foundInAny) {
        violations.push({
          id: check.id,
          severity: check.severity,
          description: check.description,
          file: check.files.join(', '),
          issue: 'PATTERN_MISSING',
          reference: check.reference
        });
        console.log(`  ❌ ${check.id}: Pattern non trovato`);
      } else {
        console.log(`  ✅ ${check.id}: OK`);
      }
      continue;
    }
    
    // Check mustAllExist - tutti i file devono esistere
    if (check.files && check.mustAllExist) {
      let missingFiles = [];
      
      for (const file of check.files) {
        const fullPath = path.join(ROOT_DIR, file);
        if (!fs.existsSync(fullPath)) {
          missingFiles.push(file);
        }
      }
      
      if (missingFiles.length > 0) {
        violations.push({
          id: check.id,
          severity: check.severity,
          description: check.description,
          file: missingFiles.join(', '),
          issue: 'FILES_MISSING',
          reference: check.reference
        });
        console.log(`  ❌ ${check.id}: ${missingFiles.length} file mancanti`);
        for (const f of missingFiles.slice(0, 3)) {
          console.log(`      - ${f}`);
        }
        if (missingFiles.length > 3) {
          console.log(`      ... e altri ${missingFiles.length - 3}`);
        }
      } else {
        console.log(`  ✅ ${check.id}: Tutti i ${check.files.length} file esistono`);
      }
    }
  }
  
  return violations;
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
    architecturalViolations: [],
    warnings: []
  };

  console.log('🔍 Avvio verifica mappa concettuale...\n');

  // 1. Verifica file esistenti
  console.log('📁 Verifica file...');
  const allFiles = [
    ...REFERENCES.docs,
    ...REFERENCES.backendServices,
    ...REFERENCES.backendStrategies,
    ...REFERENCES.backendUtils,
    ...REFERENCES.backendDb,
    ...REFERENCES.backendOther,
    ...REFERENCES.migrations,
    ...REFERENCES.frontendComponents,
    ...REFERENCES.frontendHooks,
    ...REFERENCES.frontendMotion,
    ...REFERENCES.frontendUtils,
    ...REFERENCES.scripts
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

  // 5. Verifica architetturale (MatchBundle-Centric)
  const archViolations = runArchitecturalChecks();
  results.architecturalViolations = archViolations;
  
  for (const v of archViolations) {
    results.summary.totalChecks++;
    if (v.severity === 'ERROR') {
      results.summary.failed++;
    } else if (v.severity === 'WARN') {
      results.summary.warnings++;
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
> Esegui: \`node scripts/checkConceptualMap.js\`

---

## 📊 Riepilogo

| Metrica | Valore |
|---------|--------|
| Check totali | ${results.summary.totalChecks} |
| ✅ Passati | ${results.summary.passed} |
| ❌ Falliti | ${results.summary.failed} |
| ⚠️ Warning | ${results.summary.warnings} |
| 📄 Non doc | ${results.newFilesDetected.length} |
| 🏗️ Arch viol | ${results.architecturalViolations.length} |

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

  // Violazioni architetturali
  if (results.architecturalViolations.length > 0) {
    md += `## 🏗️ Violazioni Architetturali (MatchBundle-Centric)

Le seguenti violazioni rispetto alle filosofie sono state rilevate:

| # | ID | Severità | Descrizione | File | Riferimento |
|---|----|----|-------------|------|-------------|
`;
    results.architecturalViolations.forEach((v, i) => {
      const icon = v.severity === 'ERROR' ? '🔴' : '🟡';
      md += `| ${i + 1} | \`${v.id}\` | ${icon} ${v.severity} | ${v.description} | \`${v.file}\` | ${v.reference || ''} |\n`;
    });
    md += '\n---\n\n';
  }

  // Se tutto OK
  if (results.summary.failed === 0 && results.summary.warnings === 0 && 
      results.newFilesDetected.length === 0 && results.architecturalViolations.length === 0) {
    md += `## ✅ Tutto OK!

Nessun problema rilevato. La mappa concettuale è allineata con il codice.

`;
  }

  // Istruzioni
  md += `---

## 📌 Prossime Azioni

`;
  
  if (results.summary.failed > 0 || results.summary.warnings > 0 || 
      results.newFilesDetected.length > 0 || results.architecturalViolations.length > 0) {
    md += `1. Correggi i problemi elencati sopra
2. Aggiorna \`docs/checks/MAPPA_RETE_CONCETTUALE_V2.md\`
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
// AGGIORNA CHECK_MAPPA_CONCETTUALE.MD
// ============================================================================

function updateTodoList(results) {
  console.log('📋 Report generato in CHECK_MAPPA_CONCETTUALE.md');
  
  // Aggiorna sezione Check Mappa in TODO_LIST.md
  if (!fs.existsSync(TODO_LIST_FILE)) {
    console.warn('⚠️ TODO_LIST.md non trovato');
    return;
  }
  
  try {
    let content = fs.readFileSync(TODO_LIST_FILE, 'utf8');
    
    // Genera nuova sezione Check Mappa
    const date = new Date().toISOString().split('T')[0];
    let section = `## 🔍 Report Check Mappa (Auto-generato)

> Ultimo check: ${date}
> Esegui: \`node scripts/checkConceptualMap.js\`

`;
    
    section += `| Metrica | Valore |\n|---------|--------|\n`;
    section += `| Check totali | ${results.summary.totalChecks} |\n`;
    section += `| ✅ Passati | ${results.summary.passed} |\n`;
    section += `| ❌ Falliti | ${results.summary.failed} |\n`;
    section += `| ⚠️ Warning | ${results.summary.warnings} |\n`;
    section += `| 📄 Non doc | ${results.newFilesDetected.length} |\n`;
    section += `| 🏗️ Arch viol | ${results.architecturalViolations.length} |\n\n`;
    
    // Dettagli violazioni architetturali
    if (results.architecturalViolations.length > 0) {
      section += `### Violazioni Architetturali\n\n`;
      for (const v of results.architecturalViolations) {
        const icon = v.severity === 'ERROR' ? '🔴' : '🟡';
        section += `- ${icon} **${v.id}**: ${v.description}\n`;
        section += `  - File: \`${v.file}\`\n`;
        if (v.reference) section += `  - Ref: ${v.reference}\n`;
      }
      section += '\n';
    }
    
    // File mancanti
    if (results.missingFiles.length > 0) {
      section += `### File Mancanti (${results.missingFiles.length})\n\n`;
      for (const f of results.missingFiles.slice(0, 10)) {
        section += `- [ ] \`${f}\`\n`;
      }
      if (results.missingFiles.length > 10) {
        section += `- ... e altri ${results.missingFiles.length - 10}\n`;
      }
      section += '\n';
    }
    
    // File non documentati
    if (results.newFilesDetected.length > 0) {
      section += `### File Non Documentati (${results.newFilesDetected.length})\n\n`;
      for (const f of results.newFilesDetected.slice(0, 10)) {
        section += `- [ ] \`${f}\` → Aggiungere alla mappa\n`;
      }
      if (results.newFilesDetected.length > 10) {
        section += `- ... e altri ${results.newFilesDetected.length - 10}\n`;
      }
      section += '\n';
    }
    
    section += '\n';
    
    // Sostituisce o aggiunge sezione
    const sectionRegex = /## 🔍 Report Check Mappa \(Auto-generato\)[\s\S]*?(?=\n## |$)/;
    
    if (sectionRegex.test(content)) {
      content = content.replace(sectionRegex, section);
    } else {
      // Inserisce dopo "## 🔵 BASSA PRIORITÀ" o alla fine
      const insertPoint = content.indexOf('## 📊 PRINCIPIO FONDAMENTALE');
      if (insertPoint !== -1) {
        content = content.slice(0, insertPoint) + section + content.slice(insertPoint);
      } else {
        content += '\n---\n\n' + section;
      }
    }
    
    fs.writeFileSync(TODO_LIST_FILE, content, 'utf8');
    console.log('📋 Sezione Check Mappa aggiornata in TODO_LIST.md');
  } catch (err) {
    console.error('❌ Errore aggiornamento TODO_LIST:', err.message);
  }
  
  // Log summary
  if (results.architecturalViolations.length > 0) {
    console.log('\n🏗️  VIOLAZIONI ARCHITETTURALI DA RISOLVERE:');
    for (const v of results.architecturalViolations) {
      const icon = v.severity === 'ERROR' ? '🔴' : '🟡';
      console.log(`   ${icon} ${v.id}: ${v.description}`);
      console.log(`      File: ${v.file}`);
    }
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
  console.log(`   🏗️  Arch:    ${results.architecturalViolations.length}`);
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
