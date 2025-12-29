/**
 * 🧪 CONCEPT CHECKS - Verifica confini architetturali
 *
 * Controlla che il codice rispetti le regole definite in docs/concept/rules.v2.json
 * Complementare a checkConceptualMap.js (che verifica esistenza file)
 *
 * Uso: node scripts/runConceptChecks.js [--mode full|diff]
 * Output:
 *   - docs/checks/report.json (macchina)
 *   - docs/checks/report.md (umano)
 *   - Aggiorna docs/TODO_LIST.md sezione "Problemi Architetturali"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// CONFIGURAZIONE
// ============================================================================

const ROOT_DIR = path.join(__dirname, '..');
const RULES_FILE_V2 = path.join(ROOT_DIR, 'docs', 'concept', 'rules.v2.json');
const RULES_FILE_V1 = path.join(ROOT_DIR, 'docs', 'concept', 'rules.v1.json');
const REPORT_JSON = path.join(ROOT_DIR, 'docs', 'checks', 'report.json');
const REPORT_MD = path.join(ROOT_DIR, 'docs', 'checks', 'report.md');
const TODO_LIST_FILE = path.join(ROOT_DIR, 'docs', 'TODO_LIST.md');

// ============================================================================
// LOAD RULES
// ============================================================================

function loadRules() {
  // Prova prima V2, poi V1
  if (fs.existsSync(RULES_FILE_V2)) {
    console.log('📜 Using rules.v2.json (MatchBundle-Centric)');
    return JSON.parse(fs.readFileSync(RULES_FILE_V2, 'utf-8'));
  }
  if (fs.existsSync(RULES_FILE_V1)) {
    console.log('📜 Using rules.v1.json (legacy)');
    return JSON.parse(fs.readFileSync(RULES_FILE_V1, 'utf-8'));
  }
  console.error(`❌ Rules file not found`);
  process.exit(1);
}

// ============================================================================
// FILE DISCOVERY
// ============================================================================

function getAllFiles(dir, extensions = ['.js', '.jsx', '.ts', '.tsx']) {
  const files = [];

  function scan(currentDir) {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Skip node_modules, .git, dist, build
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) continue;
        scan(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  scan(dir);
  return files;
}

function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD~1', { cwd: ROOT_DIR, encoding: 'utf-8' });
    return output
      .split('\n')
      .filter((f) => f.trim())
      .map((f) => path.join(ROOT_DIR, f));
  } catch {
    console.warn('⚠️ Git diff failed, usando full scan');
    return null;
  }
}

// ============================================================================
// DOMAIN INFERENCE
// ============================================================================

function inferDomain(filePath, rules) {
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

  for (const [domainName, domainConfig] of Object.entries(rules.domains)) {
    for (const allowedPath of domainConfig.allowedPaths) {
      const pattern = allowedPath.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');

      if (new RegExp(`^${pattern}$`).test(relativePath)) {
        return domainName;
      }
    }
  }

  // Inferenza euristica per file non mappati
  if (relativePath.startsWith('src/components/')) return 'frontend_ui';
  if (relativePath.startsWith('src/hooks/')) return 'frontend_hooks';
  // Note: src/utils.js eliminato il 25 Dic 2025 (era dead code)
  if (relativePath.startsWith('src/utils/')) return 'frontend_utils';
  if (relativePath.startsWith('backend/services/')) return 'backend_services';
  if (relativePath.startsWith('backend/db/')) return 'backend_db';
  if (relativePath.startsWith('backend/utils/')) return 'backend_utils';
  if (relativePath.startsWith('backend/scraper/')) return 'backend_scraper';
  if (relativePath === 'backend/server.js') return 'backend_api';

  return 'unknown';
}

// ============================================================================
// SCANNERS
// ============================================================================

function scanImports(content) {
  const imports = [];

  // ES6 imports
  const es6Regex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6Regex.exec(content)) !== null) {
    imports.push({
      type: 'es6',
      module: match[1],
      line: content.substring(0, match.index).split('\n').length,
    });
  }

  // CommonJS requires
  const cjsRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = cjsRegex.exec(content)) !== null) {
    imports.push({
      type: 'cjs',
      module: match[1],
      line: content.substring(0, match.index).split('\n').length,
    });
  }

  return imports;
}

function scanPatterns(content, pattern) {
  const matches = [];
  const regex = new RegExp(pattern, 'gi');
  let match;

  while ((match = regex.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    matches.push({ match: match[0], line });
  }

  return matches;
}

function checkAllowlist(filePath, ruleId, allowlist) {
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

  return allowlist.some((entry) => relativePath.includes(entry.file) && entry.rule === ruleId);
}

function checkAnnotations(content, ruleId) {
  // Check for philosophy:allow annotations
  const annotationRegex = new RegExp(`philosophy:allow\\s+${ruleId}`, 'i');
  return annotationRegex.test(content);
}

// ============================================================================
// MAIN CHECK LOGIC
// ============================================================================

function runChecks(files, rules) {
  const findings = [];

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    const domain = inferDomain(filePath, rules);
    const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

    // Skip unknown domains
    if (domain === 'unknown') continue;

    // Check each invariant
    for (const invariant of rules.invariants) {
      // Skip if invariant doesn't apply to this domain
      if (!invariant.domains.includes(domain)) continue;

      // Check allowlist
      if (checkAllowlist(filePath, invariant.id, rules.allowlist)) continue;

      // Check annotations
      if (checkAnnotations(content, invariant.id)) continue;

      let matches = [];

      if (invariant.matcher.type === 'import') {
        const imports = scanImports(content);
        const pattern = new RegExp(invariant.matcher.pattern, 'i');
        matches = imports.filter((imp) => pattern.test(imp.module));
      } else if (invariant.matcher.type === 'pattern') {
        matches = scanPatterns(content, invariant.matcher.pattern);
      } else if (invariant.matcher.type === 'function') {
        // Simple function detection
        const funcRegex = new RegExp(
          `function\\s+${invariant.matcher.pattern}|const\\s+${invariant.matcher.pattern}\\s*=`,
          'gi'
        );
        matches = scanPatterns(content, funcRegex.source);
      }

      for (const match of matches) {
        findings.push({
          severity: invariant.severity,
          ruleId: invariant.id,
          file: relativePath,
          line: match.line || 0,
          domain: domain,
          message: invariant.description,
          match: match.match || match.module,
          remediation: invariant.remediation,
        });
      }
    }

    // Check forbidden imports for domain
    const domainConfig = rules.domains[domain];
    if (domainConfig && domainConfig.forbiddenImports) {
      const imports = scanImports(content);

      for (const imp of imports) {
        for (const forbidden of domainConfig.forbiddenImports) {
          if (imp.module.includes(forbidden)) {
            findings.push({
              severity: 'ERROR',
              ruleId: 'DOMAIN-IMPORT',
              file: relativePath,
              line: imp.line,
              domain: domain,
              message: `Import proibito per dominio ${domain}: ${forbidden}`,
              match: imp.module,
              remediation: `Rimuovere import di ${forbidden} da ${domain}`,
            });
          }
        }
      }
    }

    // Check forbidden patterns for domain
    if (domainConfig && domainConfig.forbiddenPatterns) {
      for (const pattern of domainConfig.forbiddenPatterns) {
        const matches = scanPatterns(content, pattern);
        for (const match of matches) {
          findings.push({
            severity: 'WARN',
            ruleId: 'DOMAIN-PATTERN',
            file: relativePath,
            line: match.line,
            domain: domain,
            message: `Pattern proibito per dominio ${domain}`,
            match: match.match,
            remediation:
              domainConfig.note || 'Verificare se questo codice appartiene a questo dominio',
          });
        }
      }
    }
  }

  return findings;
}

// ============================================================================
// ARCHITECTURAL CHECKS - Verifica struttura progetto
// ============================================================================

function runArchitecturalChecks(rules) {
  const findings = [];

  if (!rules.architecturalChecks) return findings;

  for (const check of rules.architecturalChecks) {
    // Check file must exist
    if (check.mustExist) {
      const fullPath = path.join(ROOT_DIR, check.file);
      if (!fs.existsSync(fullPath)) {
        findings.push({
          severity: check.severity || 'ERROR',
          ruleId: check.id,
          file: check.file,
          line: 0,
          domain: 'architecture',
          message: check.description,
          match: 'FILE_MISSING',
          remediation: `Creare il file ${check.file}`,
          reference: check.reference,
        });
      }
      continue;
    }

    // Check pattern in file
    const fullPath = path.join(ROOT_DIR, check.file);
    if (!fs.existsSync(fullPath)) {
      findings.push({
        severity: check.severity || 'ERROR',
        ruleId: check.id,
        file: check.file,
        line: 0,
        domain: 'architecture',
        message: `File non trovato: ${check.file}`,
        match: 'FILE_MISSING',
        remediation: `Verificare esistenza di ${check.file}`,
      });
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');

    // Check if pattern should exist
    if (check.pattern) {
      const regex = new RegExp(check.pattern, 'i');
      if (!regex.test(content)) {
        findings.push({
          severity: check.severity || 'ERROR',
          ruleId: check.id,
          file: check.file,
          line: 0,
          domain: 'architecture',
          message: check.description,
          match: 'PATTERN_MISSING',
          remediation: `Implementare: ${check.pattern}`,
          reference: check.reference,
        });
      }
    }

    // Check if antiPattern should NOT exist
    if (check.antiPattern) {
      const regex = new RegExp(check.antiPattern, 'gi');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        // Trova la riga
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            findings.push({
              severity: check.severity || 'ERROR',
              ruleId: check.id,
              file: check.file,
              line: i + 1,
              domain: 'architecture',
              message: check.description,
              match: matches[0],
              remediation: `Rimuovere/implementare: ${check.antiPattern}`,
              reference: check.reference,
            });
          }
        }
      }
    }
  }

  return findings;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReport(findings, mode, startTime) {
  const endTime = Date.now();

  const summary = {
    errors: findings.filter((f) => f.severity === 'ERROR').length,
    warns: findings.filter((f) => f.severity === 'WARN').length,
    infos: findings.filter((f) => f.severity === 'INFO').length,
  };

  const report = {
    timestamp: new Date().toISOString(),
    mode: mode,
    duration_ms: endTime - startTime,
    summary: summary,
    findings: findings.sort((a, b) => {
      const severityOrder = { ERROR: 0, WARN: 1, INFO: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
  };

  return report;
}

function writeJsonReport(report) {
  const dir = path.dirname(REPORT_JSON);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));
}

function writeMarkdownReport(report) {
  const dir = path.dirname(REPORT_MD);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let md = `# 🧪 Concept Checks Report

> Generato: ${report.timestamp}  
> Modalità: ${report.mode}  
> Durata: ${report.duration_ms}ms

---

## 📊 Riepilogo

| Severità | Count |
|----------|-------|
| 🔴 ERROR | ${report.summary.errors} |
| 🟡 WARN | ${report.summary.warns} |
| 🔵 INFO | ${report.summary.infos} |

---

`;

  if (report.findings.length === 0) {
    md += `## ✅ Nessun problema rilevato

Tutti i controlli architetturali sono passati!
`;
  } else {
    md += `## 🔍 Findings

`;

    // Group by severity
    const grouped = {
      ERROR: report.findings.filter((f) => f.severity === 'ERROR'),
      WARN: report.findings.filter((f) => f.severity === 'WARN'),
      INFO: report.findings.filter((f) => f.severity === 'INFO'),
    };

    for (const [severity, findings] of Object.entries(grouped)) {
      if (findings.length === 0) continue;

      const icon = severity === 'ERROR' ? '🔴' : severity === 'WARN' ? '🟡' : '🔵';
      md += `### ${icon} ${severity} (${findings.length})

`;

      for (const finding of findings) {
        md += `#### \`${finding.ruleId}\` - ${finding.file}:${finding.line}

- **Dominio:** ${finding.domain}
- **Problema:** ${finding.message}
- **Match:** \`${finding.match}\`
- **Rimedio:** ${finding.remediation}

`;
      }
    }
  }

  md += `---

*Report generato da \`scripts/runConceptChecks.js\`*
`;

  fs.writeFileSync(REPORT_MD, md);
}

function updateTodoList(findings) {
  if (!fs.existsSync(TODO_LIST_FILE)) {
    console.warn('⚠️ TODO_LIST.md non trovato, skip update');
    return;
  }

  let content = fs.readFileSync(TODO_LIST_FILE, 'utf-8');

  // Genera sezione problemi architetturali
  const errors = findings.filter((f) => f.severity === 'ERROR');
  const warns = findings.filter((f) => f.severity === 'WARN');

  let section = `## 🏗️ Problemi Architetturali (Auto-generato)

> Ultimo check: ${new Date().toISOString().split('T')[0]}
> Esegui: \`node scripts/runConceptChecks.js\`

`;

  if (errors.length === 0 && warns.length === 0) {
    section += `✅ **Nessun problema architetturale rilevato**
`;
  } else {
    if (errors.length > 0) {
      section += `### 🔴 Errori (${errors.length})

`;
      for (const e of errors) {
        section += `- [ ] **${e.ruleId}** - \`${e.file}:${e.line}\` - ${e.message}\n`;
      }
      section += '\n';
    }

    if (warns.length > 0) {
      section += `### 🟡 Warning (${warns.length})

`;
      for (const w of warns) {
        section += `- [ ] **${w.ruleId}** - \`${w.file}:${w.line}\` - ${w.message}\n`;
      }
    }
  }

  // Aggiorna SOLO la sezione auto-generata, fermandosi prima della prossima sezione o fine file
  // Match: dalla intestazione fino a (escludendo): prossimo ## oppure ---\n\n## oppure fine
  const archSectionRegex =
    /## 🏗️ Problemi Architetturali \(Auto-generato\)[\s\S]*?(?=\n---\n\n## |\n## (?!🏗️)|$)/u;

  if (archSectionRegex.test(content)) {
    content = content.replace(archSectionRegex, section.trim());
  } else {
    // Cerca il punto giusto dove inserire: dopo "BASSA PRIORITÀ" o prima di "Report Check Mappa"
    const insertBeforeReport = content.indexOf('## 🔍 Report Check Mappa');
    const insertAfterLow = content.indexOf('## 🔵 BASSA PRIORITÀ');

    if (insertBeforeReport !== -1) {
      // Inserisci prima di "Report Check Mappa" con separatore
      content =
        content.slice(0, insertBeforeReport) +
        section +
        '\n---\n\n' +
        content.slice(insertBeforeReport);
    } else if (insertAfterLow !== -1) {
      // Trova la fine della sezione BASSA PRIORITÀ e inserisci dopo
      const nextSection = content.indexOf('\n## ', insertAfterLow + 5);
      if (nextSection !== -1) {
        content = content.slice(0, nextSection) + '\n\n' + section + content.slice(nextSection);
      } else {
        content += '\n\n---\n\n' + section;
      }
    } else {
      content += '\n\n---\n\n' + section;
    }
  }

  fs.writeFileSync(TODO_LIST_FILE, content);
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const mode = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'full';

  console.log('🧪 Concept Checks - Verifica confini architetturali');
  console.log(`📁 Mode: ${mode}`);
  console.log('');

  // Load rules
  const rules = loadRules();
  console.log(
    `📜 Loaded ${rules.invariants.length} invariants, ${Object.keys(rules.domains).length} domains`
  );

  // Get files to check
  let files;
  if (mode === 'diff') {
    files = getChangedFiles();
    if (!files) {
      files = getAllFiles(ROOT_DIR);
    }
  } else {
    files = getAllFiles(ROOT_DIR);
  }

  console.log(`📂 Checking ${files.length} files...`);
  console.log('');

  // Run invariant checks
  const invariantFindings = runChecks(files, rules);

  // Run architectural checks
  console.log('🏗️  Running architectural checks...');
  const archFindings = runArchitecturalChecks(rules);

  // Combine findings
  const findings = [...invariantFindings, ...archFindings];

  // Generate report
  const report = generateReport(findings, mode, startTime);

  // Write outputs
  writeJsonReport(report);
  writeMarkdownReport(report);
  updateTodoList(findings);

  // Console summary
  console.log('📊 RISULTATI');
  console.log('─'.repeat(40));
  console.log(`🔴 Errori:  ${report.summary.errors}`);
  console.log(`🟡 Warning: ${report.summary.warns}`);
  console.log(`🔵 Info:    ${report.summary.infos}`);
  console.log('');

  if (report.summary.errors > 0) {
    console.log('❌ CI FAILED - Correggere gli errori prima di committare');
    console.log('');
    for (const e of findings.filter((f) => f.severity === 'ERROR').slice(0, 5)) {
      console.log(`   ${e.ruleId}: ${e.file}:${e.line}`);
      console.log(`   └─ ${e.message}`);
    }
    if (report.summary.errors > 5) {
      console.log(`   ... e altri ${report.summary.errors - 5} errori`);
    }
  } else {
    console.log('✅ CI PASSED');
  }

  console.log('');
  console.log(`📄 Report: docs/checks/report.md`);
  console.log(`📄 JSON:   docs/checks/report.json`);

  // Exit code for CI
  process.exit(report.summary.errors > 0 ? 1 : 0);
}

main();
