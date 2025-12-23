/**
 * Cleanup Data Files
 * 
 * Elimina i file JSON temporanei dalle cartelle data/
 * che non sono più necessari dopo che i dati sono nel database.
 * 
 * ⚠️ NOTA: Da usare SOLO dopo aver verificato che i match siano nel DB!
 * 
 * Usage:
 *   node backend/scripts/cleanup-scrapes.js           # Elimina file più vecchi di 24h (solo scrapes)
 *   node backend/scripts/cleanup-scrapes.js --all     # Elimina tutti i file scrapes
 *   node backend/scripts/cleanup-scrapes.js --days=7  # Elimina file più vecchi di 7 giorni
 *   node backend/scripts/cleanup-scrapes.js --dry-run # Mostra cosa verrebbe eliminato
 *   node backend/scripts/cleanup-scrapes.js --full    # Elimina TUTTO: scrapes + mappings + detected
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const SCRAPES_DIR = path.join(DATA_DIR, 'scrapes');
const MAPPINGS_DIR = path.join(DATA_DIR, 'mappings');
const DETECTED_DIR = path.join(DATA_DIR, 'detected');

/**
 * Pulisce i file scrape vecchi o tutti
 * @param {Object} options
 * @param {number} options.maxAgeDays - Età massima in giorni (default: 1)
 * @param {boolean} options.all - Se true, elimina tutti i file
 * @param {boolean} options.dryRun - Se true, mostra solo cosa verrebbe eliminato
 * @returns {Object} { deleted: number, errors: number, totalSize: number }
 */
async function cleanupScrapes(options = {}) {
  const { maxAgeDays = 1, all = false, dryRun = false } = options;
  
  const result = {
    deleted: 0,
    errors: 0,
    totalSize: 0,
    files: []
  };

  // Verifica se la cartella esiste
  if (!fs.existsSync(SCRAPES_DIR)) {
    console.log('📁 Cartella scrapes non trovata:', SCRAPES_DIR);
    return result;
  }

  const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('✅ Nessun file scrape da eliminare');
    return result;
  }

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  console.log(`\n🧹 Cleanup scrapes ${dryRun ? '(DRY RUN)' : ''}`);
  console.log(`   Cartella: ${SCRAPES_DIR}`);
  console.log(`   File totali: ${files.length}`);
  console.log(`   Criterio: ${all ? 'TUTTI' : `più vecchi di ${maxAgeDays} giorni`}\n`);

  for (const file of files) {
    const filePath = path.join(SCRAPES_DIR, file);
    
    try {
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;
      
      // Controlla se il file deve essere eliminato
      const shouldDelete = all || fileAge > maxAgeMs;
      
      if (shouldDelete) {
        result.files.push({
          name: file,
          size: stats.size,
          age: Math.round(fileAge / (1000 * 60 * 60)) // ore
        });
        result.totalSize += stats.size;
        
        if (!dryRun) {
          fs.unlinkSync(filePath);
        }
        result.deleted++;
      }
    } catch (err) {
      console.error(`❌ Errore su ${file}:`, err.message);
      result.errors++;
    }
  }

  // Report
  const sizeMB = (result.totalSize / (1024 * 1024)).toFixed(2);
  
  if (dryRun) {
    console.log(`📋 File da eliminare: ${result.deleted}`);
    console.log(`📊 Spazio che verrebbe liberato: ${sizeMB} MB`);
    if (result.files.length > 0 && result.files.length <= 10) {
      result.files.forEach(f => console.log(`   - ${f.name} (${f.age}h)`));
    }
  } else {
    console.log(`🗑️  File eliminati: ${result.deleted}`);
    console.log(`📊 Spazio liberato: ${sizeMB} MB`);
  }
  
  if (result.errors > 0) {
    console.log(`⚠️  Errori: ${result.errors}`);
  }

  return result;
}

/**
 * Pulisce una cartella specifica
 */
function cleanupDir(dirPath, dryRun = false) {
  if (!fs.existsSync(dirPath)) {
    return { deleted: 0, size: 0 };
  }
  
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  let deleted = 0;
  let totalSize = 0;
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    try {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      if (!dryRun) {
        fs.unlinkSync(filePath);
      }
      deleted++;
    } catch (e) {
      console.error(`   ❌ ${file}: ${e.message}`);
    }
  }
  
  return { deleted, size: totalSize };
}

/**
 * Pulizia completa di tutte le cartelle data/
 */
async function cleanupAll(dryRun = false) {
  console.log(`\n🧹 Pulizia COMPLETA ${dryRun ? '(DRY RUN)' : ''}\n`);
  
  let totalDeleted = 0;
  let totalSize = 0;
  
  const dirs = [
    { name: 'scrapes', path: SCRAPES_DIR },
    { name: 'mappings', path: MAPPINGS_DIR },
    { name: 'detected', path: DETECTED_DIR }
  ];
  
  for (const dir of dirs) {
    console.log(`📁 ${dir.name}/`);
    const result = cleanupDir(dir.path, dryRun);
    console.log(`   ${dryRun ? 'Da eliminare' : 'Eliminati'}: ${result.deleted} file (${(result.size / (1024 * 1024)).toFixed(2)} MB)`);
    totalDeleted += result.deleted;
    totalSize += result.size;
  }
  
  console.log(`\n📊 Totale: ${totalDeleted} file, ${(totalSize / (1024 * 1024)).toFixed(2)} MB ${dryRun ? 'da liberare' : 'liberati'}`);
  return { deleted: totalDeleted, size: totalSize };
}

/**
 * Funzione esportabile per uso programmatico
 */
module.exports = { cleanupScrapes, cleanupAll, SCRAPES_DIR, MAPPINGS_DIR, DETECTED_DIR };

// Esecuzione da CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    all: args.includes('--all'),
    full: args.includes('--full'),
    dryRun: args.includes('--dry-run'),
    maxAgeDays: 1
  };
  
  // Parse --days=N
  const daysArg = args.find(a => a.startsWith('--days='));
  if (daysArg) {
    options.maxAgeDays = parseInt(daysArg.split('=')[1], 10) || 1;
  }

  // Se --full, pulisci tutto
  if (options.full) {
    cleanupAll(options.dryRun)
      .then(() => {
        console.log('\n✅ Pulizia completa terminata');
        process.exit(0);
      })
      .catch(err => {
        console.error('❌ Errore:', err);
        process.exit(1);
      });
  } else {
    cleanupScrapes(options)
      .then(result => {
        console.log('\n✅ Cleanup completato');
        process.exit(result.errors > 0 ? 1 : 0);
      })
      .catch(err => {
        console.error('❌ Errore fatale:', err);
        process.exit(1);
      });
  }
}
