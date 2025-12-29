/**
 * 🔬 DEEP PHILOSOPHY CHECK
 *
 * Verifica che le FILOSOFIE siano implementate nel codice.
 * Non verifica solo l'esistenza dei file (come checkConceptualMap.js),
 * ma anche:
 * - Funzioni esportate dichiarate
 * - Pattern/strutture richieste
 * - Schema database
 * - Costanti/versioni
 *
 * Uso: node scripts/deepPhilosophyCheck.js
 * Output: docs/checks/DEEP_PHILOSOPHY_CHECK.md
 *         Aggiorna docs/TODO_LIST.md
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CHECK_OUTPUT_FILE = path.join(ROOT_DIR, 'docs', 'checks', 'DEEP_PHILOSOPHY_CHECK.md');
const TODO_LIST_FILE = path.join(ROOT_DIR, 'docs', 'TODO_LIST.md');

// ============================================================================
// PHILOSOPHY REQUIREMENTS
// Ogni filosofia dichiara: file, funzioni, pattern, tabelle, costanti
// ============================================================================

const PHILOSOPHY_REQUIREMENTS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // FILOSOFIA_RISK_BANKROLL (50_strategy_risk_execution)
  // ═══════════════════════════════════════════════════════════════════════════
  BANKROLL: {
    name: 'FILOSOFIA_RISK_BANKROLL',
    file: 'docs/filosofie/50_strategy_risk_execution/bankroll_risk/FILOSOFIA_RISK_BANKROLL.md',

    // File che DEVONO esistere
    requiredFiles: [
      {
        path: 'backend/services/riskEngine.js',
        description: 'Risk layer: edge → stake suggestion',
        status: 'TODO', // marcare se dichiarato come TODO nella filosofia
      },
      {
        path: 'backend/strategies/strategyEngine.js',
        description: 'Strategy signals: produce edge + confidence',
      },
    ],

    // Funzioni che DEVONO essere esportate
    requiredExports: [
      {
        file: 'backend/services/riskEngine.js',
        exports: ['calculateStake', 'calculateEdge', 'controlExposure', 'kellyFractional'],
        status: 'TODO',
      },
      {
        file: 'backend/strategies/strategyEngine.js',
        exports: ['evaluateStrategies', 'STRATEGY_ENGINE_VERSION'],
      },
    ],

    // Tabelle DB richieste
    requiredTables: [
      {
        name: 'bet_decisions',
        description: 'Log delle decisioni di betting',
        status: 'TODO',
      },
    ],

    // Pattern/strutture che DEVONO esistere nel codice
    requiredPatterns: [
      {
        file: 'backend/services/matchCardService.js',
        pattern: /risk|stake|edge/i,
        description: 'matchCardService deve integrare risk output nel bundle',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILOSOFIA_TEMPORAL (10_data_platform)
  // ═══════════════════════════════════════════════════════════════════════════
  TEMPORAL: {
    name: 'FILOSOFIA_TEMPORAL',
    file: 'docs/filosofie/10_data_platform/temporal/FILOSOFIA_TEMPORAL.md',

    requiredFiles: [
      {
        path: 'backend/liveManager.js',
        description: 'Live tracking con ingestion_time, event_time',
      },
      {
        path: 'backend/services/matchCardService.js',
        description: 'MatchBundle builder con as_of_time',
      },
      {
        path: 'backend/utils/featureEngine.js',
        description: 'Feature computation con as_of_time',
      },
    ],

    requiredExports: [
      {
        file: 'backend/utils/featureEngine.js',
        exports: ['computeFeatures', 'FEATURE_ENGINE_VERSION'],
      },
    ],

    requiredPatterns: [
      {
        file: 'backend/liveManager.js',
        pattern: /ingestion_time|event_time|source_time/i,
        description: 'liveManager deve usare timestamp semantici (ingestion_time, event_time)',
      },
      {
        file: 'backend/utils/featureEngine.js',
        pattern: /as_of_time|asOfTime/i,
        description: 'featureEngine deve supportare as_of_time per anti-leakage',
      },
      {
        file: 'backend/services/matchCardService.js',
        pattern: /as_of_time|asOfTime|generated_at/i,
        description: 'matchCardService deve includere meta.as_of_time nel bundle',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILOSOFIA_REGISTRY_CANON (10_data_platform)
  // ═══════════════════════════════════════════════════════════════════════════
  REGISTRY: {
    name: 'FILOSOFIA_REGISTRY_CANON',
    file: 'docs/filosofie/10_data_platform/registry_canon/FILOSOFIA_REGISTRY_CANON.md',

    requiredFiles: [
      {
        path: 'backend/services/dataNormalizer.js',
        description: 'Normalizzazione e mapping nomi → canonical IDs',
      },
      {
        path: 'data/mappings/players.json',
        description: 'Registry alias mapping per player names',
        status: 'TODO',
      },
    ],

    requiredExports: [
      {
        file: 'backend/services/dataNormalizer.js',
        exports: ['normalizeName', 'resolvePlayerId'],
      },
    ],

    requiredPatterns: [
      {
        file: 'backend/services/dataNormalizer.js',
        pattern: /canonical|normalize|alias/i,
        description: 'dataNormalizer deve avere logica canonical ID',
      },
      {
        file: 'backend/db/matchRepository.js',
        pattern: /player_id|home_player_id|away_player_id/i,
        description: 'matchRepository deve usare canonical player IDs',
      },
    ],

    requiredTables: [
      {
        name: 'players',
        description: 'Tabella players con canonical IDs e name_variants',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILOSOFIA_LINEAGE_VERSIONING (10_data_platform)
  // ═══════════════════════════════════════════════════════════════════════════
  LINEAGE: {
    name: 'FILOSOFIA_LINEAGE_VERSIONING',
    file: 'docs/filosofie/10_data_platform/lineage_versioning/FILOSOFIA_LINEAGE_VERSIONING.md',

    requiredFiles: [
      {
        path: 'backend/services/matchCardService.js',
        description: 'MatchBundle builder: aggiungere meta.versions',
      },
      {
        path: 'backend/utils/featureEngine.js',
        description: 'Export FEATURE_ENGINE_VERSION',
      },
      {
        path: 'backend/strategies/strategyEngine.js',
        description: 'Export STRATEGY_ENGINE_VERSION',
      },
    ],

    requiredExports: [
      {
        file: 'backend/utils/featureEngine.js',
        exports: ['FEATURE_ENGINE_VERSION'],
      },
      {
        file: 'backend/strategies/strategyEngine.js',
        exports: ['STRATEGY_ENGINE_VERSION'],
      },
    ],

    requiredPatterns: [
      {
        file: 'backend/services/matchCardService.js',
        pattern: /meta\.versions|versions\s*:|bundle_schema|feature_version|strategy_version/i,
        description: 'matchCardService deve includere meta.versions nel bundle',
      },
      {
        file: 'src/hooks/useMatchBundle.jsx',
        pattern: /meta\.versions|\.meta\b/i,
        description: 'useMatchBundle deve esporre meta dal bundle',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILOSOFIA_OBSERVABILITY_DATAQUALITY (10_data_platform)
  // ═══════════════════════════════════════════════════════════════════════════
  OBSERVABILITY: {
    name: 'FILOSOFIA_OBSERVABILITY_DATAQUALITY',
    file: 'docs/filosofie/10_data_platform/quality_observability/FILOSOFIA_OBSERVABILITY_DATAQUALITY.md',

    requiredFiles: [
      {
        path: 'backend/services/dataQualityChecker.js',
        description: 'Data quality validation: missingness, outliers, staleness',
        status: 'TODO',
      },
      {
        path: 'backend/utils/logger.js',
        description: 'Structured logging',
      },
    ],

    requiredExports: [
      {
        file: 'backend/services/dataQualityChecker.js',
        exports: [
          'calculateCompleteness',
          'calculateStaleness',
          'detectOutliers',
          'checkConsistency',
        ],
        status: 'TODO',
      },
      {
        file: 'backend/utils/logger.js',
        exports: ['logger', 'createLogger'],
      },
    ],

    requiredPatterns: [
      {
        file: 'backend/services/matchCardService.js',
        pattern: /dataQuality|data_quality|quality_score/i,
        description: 'matchCardService deve includere dataQuality nel bundle',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILOSOFIA_ODDS (30_domain_odds_markets)
  // ═══════════════════════════════════════════════════════════════════════════
  ODDS: {
    name: 'FILOSOFIA_ODDS',
    file: 'docs/filosofie/30_domain_odds_markets/odds_ticks_snapshots/FILOSOFIA_ODDS.md',

    requiredFiles: [
      {
        path: 'backend/services/matchCardService.js',
        description: 'Include odds nel bundle',
      },
    ],

    requiredPatterns: [
      {
        file: 'backend/services/matchCardService.js',
        pattern: /odds|implied_prob|closing_line/i,
        description: 'matchCardService deve gestire odds nel bundle',
      },
      {
        file: 'backend/server.js',
        pattern: /event_time.*odds|odds.*timestamp|ingestion_time/i,
        description: 'Odds devono avere timestamp per tracciare movimento',
      },
    ],

    requiredTables: [
      {
        name: 'match_odds_new',
        description: 'Tabella odds con event_time per ogni tick',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILOSOFIA_LIVE_TRACKING (20_domain_tennis)
  // ═══════════════════════════════════════════════════════════════════════════
  LIVE: {
    name: 'FILOSOFIA_LIVE_TRACKING',
    file: 'docs/filosofie/20_domain_tennis/live_scoring/FILOSOFIA_LIVE_TRACKING.md',

    requiredFiles: [
      {
        path: 'backend/liveManager.js',
        description: 'Gestione tracking live matches',
      },
      {
        path: 'backend/db/liveTrackingRepository.js',
        description: 'Repository per live snapshots',
      },
    ],

    requiredExports: [
      {
        file: 'backend/db/liveTrackingRepository.js',
        exports: ['saveSnapshot', 'getSnapshots', 'getLatestSnapshot'],
      },
      {
        file: 'backend/liveManager.js',
        exports: ['startTracking', 'stopTracking', 'getTrackedMatches'],
      },
    ],

    requiredPatterns: [
      {
        file: 'backend/db/liveTrackingRepository.js',
        pattern: /snapshot_time|snapshotTime|event_time/i,
        description: 'liveTrackingRepository deve usare snapshotTime per i dati live',
      },
    ],

    requiredTables: [
      {
        name: 'live_tracking_snapshots',
        description: 'Tabella per live snapshots con timestamp',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILOSOFIA_STATS (40_analytics_features_models)
  // ═══════════════════════════════════════════════════════════════════════════
  STATS: {
    name: 'FILOSOFIA_STATS',
    file: 'docs/filosofie/40_analytics_features_models/stats/FILOSOFIA_STATS.md',

    requiredFiles: [
      {
        path: 'backend/utils/featureEngine.js',
        description: 'Calcolo features: volatility, pressure, dominance',
      },
      {
        path: 'backend/services/playerStatsService.js',
        description: 'Stats aggregate per player',
      },
    ],

    requiredExports: [
      {
        file: 'backend/utils/featureEngine.js',
        exports: [
          'computeFeatures',
          'calculateVolatility',
          'calculatePressure',
          'calculateDominance',
        ],
      },
      {
        file: 'backend/services/playerStatsService.js',
        exports: ['getPlayerStats', 'calculateH2H'],
      },
    ],

    requiredPatterns: [
      {
        file: 'backend/utils/featureEngine.js',
        pattern: /volatility|pressure|dominance/i,
        description: 'featureEngine deve calcolare volatility, pressure, dominance',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILOSOFIA_CALCOLI (40_analytics_features_models)
  // ═══════════════════════════════════════════════════════════════════════════
  CALCOLI: {
    name: 'FILOSOFIA_CALCOLI',
    file: 'docs/filosofie/40_analytics_features_models/calcoli/FILOSOFIA_CALCOLI.md',

    requiredPatterns: [
      {
        file: 'backend/utils/featureEngine.js',
        pattern: /null.*return|return.*null|!=\s*null|\?\?/i,
        description: 'featureEngine: MAI restituire null, sempre fallback calcolato',
        antiPattern: true, // questo è un anti-pattern da evitare
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILOSOFIA_DB (10_data_platform/storage)
  // ═══════════════════════════════════════════════════════════════════════════
  DB: {
    name: 'FILOSOFIA_DB',
    file: 'docs/filosofie/10_data_platform/storage/FILOSOFIA_DB.md',

    requiredFiles: [
      {
        path: 'backend/db/matchRepository.js',
        description: 'CRUD matches_new',
      },
      {
        path: 'backend/db/supabase.js',
        description: 'Client Supabase',
      },
      {
        path: 'backend/server.js',
        description: 'Bundle endpoint /api/match/:id/bundle',
      },
    ],

    requiredExports: [
      {
        file: 'backend/db/matchRepository.js',
        exports: ['getMatches', 'getMatchById', 'saveMatch', 'getMatchBundle'],
      },
    ],

    requiredPatterns: [
      {
        file: 'backend/server.js',
        pattern: /\/api\/match\/:.*\/bundle|getMatchBundle/i,
        description: 'server.js deve avere endpoint /api/match/:id/bundle',
      },
      {
        file: 'backend/server.js',
        pattern: /transformLegacyMatchToBundle|legacy.*fallback/i,
        description: 'server.js deve avere fallback legacy per match XLSX',
      },
    ],

    requiredTables: [
      {
        name: 'matches',
        description: 'Tabella legacy con winner_name, loser_name',
      },
      {
        name: 'matches_new',
        description: 'Tabella nuova con home_player_id, away_player_id',
      },
      {
        name: 'match_card_snapshot',
        description: 'Cache per MatchBundle',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILOSOFIA_FRONTEND (70_frontend)
  // ═══════════════════════════════════════════════════════════════════════════
  FRONTEND: {
    name: 'FILOSOFIA_FRONTEND',
    file: 'docs/filosofie/70_frontend/ui/FILOSOFIA_FRONTEND.md',

    requiredFiles: [
      {
        path: 'src/hooks/useMatchBundle.jsx',
        description: 'Hook consumo bundle',
      },
      {
        path: 'src/components/match/MatchPage.jsx',
        description: 'Container tabs',
      },
    ],

    requiredExports: [
      {
        file: 'src/hooks/useMatchBundle.jsx',
        exports: ['useMatchBundle'],
      },
    ],

    requiredPatterns: [
      {
        file: 'src/hooks/useMatchBundle.jsx',
        pattern: /\/api\/match\/.*\/bundle|getMatchBundle/i,
        description: 'useMatchBundle deve chiamare endpoint bundle',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FILOSOFIA_FRONTEND_DATA_CONSUMPTION (70_frontend)
  // ═══════════════════════════════════════════════════════════════════════════
  FRONTEND_DATA: {
    name: 'FILOSOFIA_FRONTEND_DATA_CONSUMPTION',
    file: 'docs/filosofie/70_frontend/data_consumption/FILOSOFIA_FRONTEND_DATA_CONSUMPTION.md',

    requiredPatterns: [
      {
        file: 'src/components/match/MatchPage.jsx',
        pattern: /useMatchBundle/i,
        description: 'MatchPage deve usare useMatchBundle',
      },
      {
        file: 'src/App.jsx',
        pattern: /useMatchBundle|MatchPage/i,
        description: 'App.jsx deve importare useMatchBundle o MatchPage',
      },
    ],
  },
};

// ============================================================================
// CHECK FUNCTIONS
// ============================================================================

function checkFileExists(filePath) {
  const fullPath = path.join(ROOT_DIR, filePath);
  return fs.existsSync(fullPath);
}

function readFileContent(filePath) {
  const fullPath = path.join(ROOT_DIR, filePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf-8');
}

function checkExports(filePath, exports) {
  const content = readFileContent(filePath);
  if (!content) return { exists: false, found: [], missing: exports };

  const found = [];
  const missing = [];

  for (const exp of exports) {
    // Check various export patterns
    const patterns = [
      new RegExp(`module\\.exports\\.${exp}\\s*=`, 'i'),
      new RegExp(`module\\.exports\\s*=\\s*{[^}]*${exp}`, 'i'),
      new RegExp(`exports\\.${exp}\\s*=`, 'i'),
      new RegExp(`export\\s+(const|function|class|let|var)\\s+${exp}`, 'i'),
      new RegExp(`export\\s*{[^}]*${exp}`, 'i'),
      new RegExp(`const\\s+${exp}\\s*=`, 'i'), // anche se non esportato
      new RegExp(`function\\s+${exp}\\s*\\(`, 'i'),
    ];

    const isFound = patterns.some((p) => p.test(content));
    if (isFound) {
      found.push(exp);
    } else {
      missing.push(exp);
    }
  }

  return { exists: true, found, missing };
}

function checkPattern(filePath, pattern, antiPattern = false) {
  const content = readFileContent(filePath);
  if (!content) return { exists: false, matches: false };

  const matches = pattern.test(content);
  return {
    exists: true,
    matches: antiPattern ? !matches : matches,
  };
}

function checkDatabaseTable(tableName) {
  // Check migration files for table creation
  const migrationsDir = path.join(ROOT_DIR, 'backend', 'migrations');
  if (!fs.existsSync(migrationsDir)) return { definedInMigration: false };

  const migrations = fs.readdirSync(migrationsDir);
  for (const migration of migrations) {
    const content = readFileContent(`backend/migrations/${migration}`);
    if (content && new RegExp(`CREATE\\s+TABLE.*${tableName}`, 'i').test(content)) {
      return { definedInMigration: true, migrationFile: migration };
    }
  }

  return { definedInMigration: false };
}

// ============================================================================
// MAIN CHECK
// ============================================================================

function runDeepChecks() {
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks: 0,
      passed: 0,
      failed: 0,
      todoItems: 0, // items dichiarati come TODO nelle filosofie
    },
    philosophies: {},
  };

  for (const [key, philosophy] of Object.entries(PHILOSOPHY_REQUIREMENTS)) {
    const philResult = {
      name: philosophy.name,
      file: philosophy.file,
      checks: [],
      errors: [],
      warnings: [],
      todos: [],
    };

    // Check required files
    if (philosophy.requiredFiles) {
      for (const fileReq of philosophy.requiredFiles) {
        results.summary.totalChecks++;
        const exists = checkFileExists(fileReq.path);

        const check = {
          type: 'FILE',
          path: fileReq.path,
          description: fileReq.description,
          passed: exists,
          isTodo: fileReq.status === 'TODO',
        };

        philResult.checks.push(check);

        if (!exists) {
          if (fileReq.status === 'TODO') {
            results.summary.todoItems++;
            philResult.todos.push({
              type: 'FILE_MISSING_TODO',
              path: fileReq.path,
              description: fileReq.description,
              message: `File dichiarato come TODO: ${fileReq.path}`,
            });
          } else {
            results.summary.failed++;
            philResult.errors.push({
              type: 'FILE_MISSING',
              path: fileReq.path,
              description: fileReq.description,
              message: `File richiesto NON ESISTE: ${fileReq.path}`,
            });
          }
        } else {
          results.summary.passed++;
        }
      }
    }

    // Check required exports
    if (philosophy.requiredExports) {
      for (const expReq of philosophy.requiredExports) {
        const fileExists = checkFileExists(expReq.file);

        if (!fileExists) {
          // File doesn't exist - already reported above
          continue;
        }

        const expResult = checkExports(expReq.file, expReq.exports);

        for (const exp of expReq.exports) {
          results.summary.totalChecks++;
          const found = expResult.found.includes(exp);

          const check = {
            type: 'EXPORT',
            file: expReq.file,
            export: exp,
            passed: found,
            isTodo: expReq.status === 'TODO',
          };

          philResult.checks.push(check);

          if (!found) {
            if (expReq.status === 'TODO') {
              results.summary.todoItems++;
              philResult.todos.push({
                type: 'EXPORT_MISSING_TODO',
                file: expReq.file,
                export: exp,
                message: `Export dichiarato come TODO: ${expReq.file} → ${exp}`,
              });
            } else {
              results.summary.failed++;
              philResult.errors.push({
                type: 'EXPORT_MISSING',
                file: expReq.file,
                export: exp,
                message: `Export richiesto NON TROVATO: ${expReq.file} → ${exp}()`,
              });
            }
          } else {
            results.summary.passed++;
          }
        }
      }
    }

    // Check required patterns
    if (philosophy.requiredPatterns) {
      for (const patReq of philosophy.requiredPatterns) {
        results.summary.totalChecks++;
        const fileExists = checkFileExists(patReq.file);

        if (!fileExists) {
          philResult.warnings.push({
            type: 'PATTERN_FILE_MISSING',
            file: patReq.file,
            description: patReq.description,
            message: `File per pattern check non esiste: ${patReq.file}`,
          });
          continue;
        }

        const patResult = checkPattern(patReq.file, patReq.pattern, patReq.antiPattern);

        const check = {
          type: 'PATTERN',
          file: patReq.file,
          pattern: patReq.pattern.toString(),
          description: patReq.description,
          passed: patResult.matches,
          antiPattern: patReq.antiPattern || false,
        };

        philResult.checks.push(check);

        if (!patResult.matches) {
          results.summary.failed++;
          philResult.errors.push({
            type: patReq.antiPattern ? 'ANTIPATTERN_FOUND' : 'PATTERN_MISSING',
            file: patReq.file,
            pattern: patReq.pattern.toString(),
            description: patReq.description,
            message: patReq.antiPattern
              ? `Anti-pattern trovato in ${patReq.file}: ${patReq.description}`
              : `Pattern richiesto NON TROVATO in ${patReq.file}: ${patReq.description}`,
          });
        } else {
          results.summary.passed++;
        }
      }
    }

    // Check required tables
    if (philosophy.requiredTables) {
      for (const tableReq of philosophy.requiredTables) {
        results.summary.totalChecks++;
        const tableResult = checkDatabaseTable(tableReq.name);

        const check = {
          type: 'TABLE',
          name: tableReq.name,
          description: tableReq.description,
          passed: tableResult.definedInMigration,
          migrationFile: tableResult.migrationFile,
          isTodo: tableReq.status === 'TODO',
        };

        philResult.checks.push(check);

        if (!tableResult.definedInMigration) {
          if (tableReq.status === 'TODO') {
            results.summary.todoItems++;
            philResult.todos.push({
              type: 'TABLE_MISSING_TODO',
              name: tableReq.name,
              description: tableReq.description,
              message: `Tabella dichiarata come TODO: ${tableReq.name}`,
            });
          } else {
            philResult.warnings.push({
              type: 'TABLE_NOT_IN_MIGRATION',
              name: tableReq.name,
              description: tableReq.description,
              message: `Tabella non trovata in migrations: ${tableReq.name} (potrebbe esistere in Supabase)`,
            });
          }
        } else {
          results.summary.passed++;
        }
      }
    }

    results.philosophies[key] = philResult;
  }

  return results;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateMarkdownReport(results) {
  let md = `# 🔬 DEEP PHILOSOPHY CHECK REPORT

> **Generato**: ${results.timestamp}  
> **Script**: \`node scripts/deepPhilosophyCheck.js\`

---

## 📊 SOMMARIO

| Metrica | Valore |
|---------|--------|
| Check totali | ${results.summary.totalChecks} |
| ✅ Passati | ${results.summary.passed} |
| ❌ Falliti | ${results.summary.failed} |
| 📋 TODO dichiarati | ${results.summary.todoItems} |

`;

  // Errori critici (file/export mancanti non-TODO)
  const allErrors = [];
  const allWarnings = [];
  const allTodos = [];

  for (const [key, phil] of Object.entries(results.philosophies)) {
    for (const err of phil.errors) {
      allErrors.push({ philosophy: key, ...err });
    }
    for (const warn of phil.warnings) {
      allWarnings.push({ philosophy: key, ...warn });
    }
    for (const todo of phil.todos) {
      allTodos.push({ philosophy: key, ...todo });
    }
  }

  if (allErrors.length > 0) {
    md += `---

## 🔴 ERRORI CRITICI (${allErrors.length})

Questi sono file/funzioni dichiarate nelle filosofie che **DOVREBBERO ESISTERE** ma NON esistono.

| # | Filosofia | Tipo | Dettaglio | Descrizione |
|---|-----------|------|-----------|-------------|
`;
    allErrors.forEach((err, i) => {
      const detail = err.path || err.file || err.name || '';
      const extra = err.export ? `→ ${err.export}()` : '';
      md += `| ${i + 1} | ${err.philosophy} | ${err.type} | \`${detail}\` ${extra} | ${
        err.description || err.message
      } |\n`;
    });
  }

  if (allWarnings.length > 0) {
    md += `
---

## 🟡 WARNING (${allWarnings.length})

| # | Filosofia | Tipo | Dettaglio | Messaggio |
|---|-----------|------|-----------|-----------|
`;
    allWarnings.forEach((warn, i) => {
      const detail = warn.path || warn.file || warn.name || '';
      md += `| ${i + 1} | ${warn.philosophy} | ${warn.type} | \`${detail}\` | ${warn.message} |\n`;
    });
  }

  if (allTodos.length > 0) {
    md += `
---

## 📋 TODO DICHIARATI NELLE FILOSOFIE (${allTodos.length})

Questi elementi sono dichiarati come "TODO" nelle filosofie stesse (non ancora implementati by design).

| # | Filosofia | Tipo | Dettaglio | Descrizione |
|---|-----------|------|-----------|-------------|
`;
    allTodos.forEach((todo, i) => {
      const detail = todo.path || todo.file || todo.name || '';
      md += `| ${i + 1} | ${todo.philosophy} | ${todo.type} | \`${detail}\` | ${
        todo.description || todo.message
      } |\n`;
    });
  }

  // Dettaglio per filosofia
  md += `
---

## 📖 DETTAGLIO PER FILOSOFIA

`;

  for (const [key, phil] of Object.entries(results.philosophies)) {
    const errCount = phil.errors.length;
    const warnCount = phil.warnings.length;
    const todoCount = phil.todos.length;
    const passCount = phil.checks.filter((c) => c.passed).length;
    const totalCount = phil.checks.length;

    let status = '✅';
    if (errCount > 0) status = '🔴';
    else if (warnCount > 0) status = '🟡';
    else if (todoCount > 0) status = '📋';

    md += `### ${status} ${phil.name}

- **File**: \`${phil.file}\`
- **Check**: ${passCount}/${totalCount} passati
- **Errori**: ${errCount} | **Warning**: ${warnCount} | **TODO**: ${todoCount}

`;

    if (phil.errors.length > 0) {
      md += `**Errori:**\n`;
      phil.errors.forEach((e) => {
        md += `- ❌ ${e.message}\n`;
      });
      md += '\n';
    }

    if (phil.warnings.length > 0) {
      md += `**Warning:**\n`;
      phil.warnings.forEach((w) => {
        md += `- ⚠️ ${w.message}\n`;
      });
      md += '\n';
    }

    if (phil.todos.length > 0) {
      md += `**TODO:**\n`;
      phil.todos.forEach((t) => {
        md += `- 📋 ${t.message}\n`;
      });
      md += '\n';
    }
  }

  md += `
---

## 🛠️ COME RISOLVERE

### Per ogni ERRORE FILE_MISSING:
1. Crea il file nel path indicato
2. Implementa le funzioni richieste dalla filosofia
3. Esporta le funzioni

### Per ogni ERRORE EXPORT_MISSING:
1. Apri il file indicato
2. Implementa la funzione mancante
3. Esportala con \`module.exports\` o \`export\`

### Per ogni ERRORE PATTERN_MISSING:
1. Apri il file indicato
2. Implementa la logica richiesta (vedi descrizione)

### Per i TODO:
Questi sono elementi dichiarati "in roadmap" nelle filosofie. Non sono errori immediati.

---

**Fine report**
`;

  return md;
}

function generateTodoListUpdate(results) {
  // Genera sezione per TODO_LIST.md
  const allErrors = [];

  for (const [key, phil] of Object.entries(results.philosophies)) {
    for (const err of phil.errors) {
      allErrors.push({ philosophy: key, philosophyName: phil.name, ...err });
    }
  }

  if (allErrors.length === 0) {
    return null;
  }

  let section = `
## 🔬 Problemi Deep Philosophy Check (Auto-generato)

> Ultimo check: ${results.timestamp.split('T')[0]}
> Esegui: \`node scripts/deepPhilosophyCheck.js\`

### 🔴 File/Funzioni Mancanti (${allErrors.length})

`;

  allErrors.forEach((err, i) => {
    const id = `DEEP-${String(i + 1).padStart(3, '0')}`;
    const detail = err.path || `${err.file}:${err.export}` || err.name;
    section += `- [ ] **${id}** - \`${detail}\` - ${err.description || err.message} (${
      err.philosophyName
    })\n`;
  });

  return section;
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('🔬 Running Deep Philosophy Checks...\n');

  const results = runDeepChecks();

  // Console output
  console.log(`📊 Risultati:`);
  console.log(`   Check totali: ${results.summary.totalChecks}`);
  console.log(`   ✅ Passati: ${results.summary.passed}`);
  console.log(`   ❌ Falliti: ${results.summary.failed}`);
  console.log(`   📋 TODO dichiarati: ${results.summary.todoItems}`);
  console.log('');

  // List errors
  for (const [key, phil] of Object.entries(results.philosophies)) {
    if (phil.errors.length > 0) {
      console.log(`\n🔴 ${phil.name}:`);
      phil.errors.forEach((e) => {
        console.log(`   ❌ ${e.message}`);
      });
    }
  }

  // Write report
  const report = generateMarkdownReport(results);
  const checksDir = path.dirname(CHECK_OUTPUT_FILE);
  if (!fs.existsSync(checksDir)) {
    fs.mkdirSync(checksDir, { recursive: true });
  }
  fs.writeFileSync(CHECK_OUTPUT_FILE, report);
  console.log(`\n📄 Report salvato: ${CHECK_OUTPUT_FILE}`);

  // Update TODO_LIST.md
  const todoUpdate = generateTodoListUpdate(results);
  if (todoUpdate && fs.existsSync(TODO_LIST_FILE)) {
    let todoContent = fs.readFileSync(TODO_LIST_FILE, 'utf-8');

    // Remove old section if exists
    const sectionRegex = /\n## 🔬 Problemi Deep Philosophy Check[\s\S]*?(?=\n## |$)/;
    todoContent = todoContent.replace(sectionRegex, '');

    // Add new section before first ## if there's content
    const insertPoint = todoContent.indexOf('\n## ');
    if (insertPoint > -1) {
      todoContent = todoContent.slice(0, insertPoint) + todoUpdate + todoContent.slice(insertPoint);
    } else {
      todoContent += todoUpdate;
    }

    fs.writeFileSync(TODO_LIST_FILE, todoContent);
    console.log(`📝 TODO_LIST.md aggiornato con ${results.summary.failed} errori`);
  }

  // Write JSON for programmatic use
  const jsonPath = path.join(checksDir, 'deep_philosophy_check.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`📦 JSON salvato: ${jsonPath}`);

  // Exit code
  if (results.summary.failed > 0) {
    console.log(`\n⚠️ Ci sono ${results.summary.failed} errori da risolvere!`);
    process.exit(1);
  } else {
    console.log(`\n✅ Tutti i check passati!`);
    process.exit(0);
  }
}

main();
