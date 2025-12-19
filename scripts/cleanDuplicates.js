/**
 * Script per pulire i match duplicati
 * Mantiene solo il file più recente per ogni eventId
 * 
 * Esegui con: node scripts/cleanDuplicates.js
 * Aggiungi --dry-run per vedere cosa verrebbe eliminato senza eliminare
 */

const fs = require('fs');
const path = require('path');

const SCRAPES_DIR = path.resolve(__dirname, '..', 'data', 'scrapes');
const isDryRun = process.argv.includes('--dry-run');

console.log('🔍 Analisi duplicati in corso...\n');
console.log(isDryRun ? '⚠️  MODALITÀ DRY-RUN: nessun file verrà eliminato\n' : '');

// Mappa: eventId -> [{ file, mtime }]
const eventMap = new Map();
let filesWithoutEventId = [];
let totalFiles = 0;

const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
totalFiles = files.length;

console.log(`📁 Trovati ${totalFiles} file JSON\n`);

for (const file of files) {
  const filePath = path.join(SCRAPES_DIR, file);
  const stats = fs.statSync(filePath);
  
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Cerca eventId nel JSON
    let eventId = null;
    if (content.api) {
      for (const [url, data] of Object.entries(content.api)) {
        if (url.match(/\/api\/v1\/event\/\d+$/) && data?.event?.id) {
          eventId = String(data.event.id);
          break;
        }
      }
    }
    
    if (eventId) {
      if (!eventMap.has(eventId)) {
        eventMap.set(eventId, []);
      }
      eventMap.get(eventId).push({
        file,
        filePath,
        mtime: stats.mtime,
        size: stats.size
      });
    } else {
      filesWithoutEventId.push({ file, filePath, mtime: stats.mtime });
    }
  } catch (e) {
    console.warn(`⚠️  Errore parsing ${file}: ${e.message}`);
    filesWithoutEventId.push({ file, filePath, mtime: stats.mtime, error: true });
  }
}

// Trova duplicati
let duplicatesCount = 0;
let bytesToFree = 0;
const filesToDelete = [];

for (const [eventId, fileList] of eventMap) {
  if (fileList.length > 1) {
    // Ordina per data (più recente prima)
    fileList.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
    
    // Mantieni il primo (più recente), elimina gli altri
    const keep = fileList[0];
    const toDelete = fileList.slice(1);
    
    duplicatesCount += toDelete.length;
    
    for (const dup of toDelete) {
      bytesToFree += dup.size;
      filesToDelete.push(dup);
    }
    
    if (toDelete.length > 0) {
      console.log(`🔄 EventId ${eventId}: ${fileList.length} file`);
      console.log(`   ✅ Mantieni: ${keep.file} (${new Date(keep.mtime).toLocaleString()})`);
      for (const dup of toDelete) {
        console.log(`   ❌ Elimina:  ${dup.file} (${new Date(dup.mtime).toLocaleString()})`);
      }
      console.log('');
    }
  }
}

// Riepilogo
console.log('\n📊 RIEPILOGO');
console.log('═'.repeat(50));
console.log(`File totali:           ${totalFiles}`);
console.log(`Match unici (eventId): ${eventMap.size}`);
console.log(`File duplicati:        ${duplicatesCount}`);
console.log(`File senza eventId:    ${filesWithoutEventId.length}`);
console.log(`Spazio da liberare:    ${(bytesToFree / 1024 / 1024).toFixed(2)} MB`);
console.log('═'.repeat(50));

// Elimina se non è dry-run
if (!isDryRun && filesToDelete.length > 0) {
  console.log('\n🗑️  Eliminazione in corso...');
  let deleted = 0;
  
  for (const { filePath, file } of filesToDelete) {
    try {
      fs.unlinkSync(filePath);
      deleted++;
    } catch (e) {
      console.error(`❌ Errore eliminazione ${file}: ${e.message}`);
    }
  }
  
  console.log(`\n✅ Eliminati ${deleted} file duplicati!`);
  console.log(`📁 File rimanenti: ${totalFiles - deleted}`);
} else if (isDryRun && filesToDelete.length > 0) {
  console.log('\n💡 Esegui senza --dry-run per eliminare i duplicati');
} else {
  console.log('\n✨ Nessun duplicato trovato!');
}
