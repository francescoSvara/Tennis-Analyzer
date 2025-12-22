/**
 * Script per popolare la tabella player_aliases
 * Uso: node scripts/populate-player-aliases.js [--dry-run]
 * 
 * Questo script:
 * 1. Legge i mappings esistenti da dataNormalizer.js
 * 2. Per ogni giocatore in players_new, crea alias dalle varianti conosciute
 * 3. Aggiunge anche alias da pattern comuni (Cognome I., I. Cognome, etc.)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const dryRun = process.argv.includes('--dry-run');

// Mapping completo da dataNormalizer.js
const PLAYER_NAME_MAPPINGS = {
  // === TOP PLAYERS ===
  'sinner j': 'Jannik Sinner',
  'j sinner': 'Jannik Sinner',
  'alcaraz c': 'Carlos Alcaraz',
  'c alcaraz': 'Carlos Alcaraz',
  'alcaraz garfia c': 'Carlos Alcaraz',
  'djokovic n': 'Novak Djokovic',
  'n djokovic': 'Novak Djokovic',
  'medvedev d': 'Daniil Medvedev',
  'd medvedev': 'Daniil Medvedev',
  'zverev a': 'Alexander Zverev',
  'a zverev': 'Alexander Zverev',
  'rublev a': 'Andrey Rublev',
  'a rublev': 'Andrey Rublev',
  'ruud c': 'Casper Ruud',
  'c ruud': 'Casper Ruud',
  'fritz t': 'Taylor Fritz',
  't fritz': 'Taylor Fritz',
  'de minaur a': 'Alex De Minaur',
  'a de minaur': 'Alex De Minaur',
  'tsitsipas s': 'Stefanos Tsitsipas',
  's tsitsipas': 'Stefanos Tsitsipas',
  'hurkacz h': 'Hubert Hurkacz',
  'h hurkacz': 'Hubert Hurkacz',
  'dimitrov g': 'Grigor Dimitrov',
  'g dimitrov': 'Grigor Dimitrov',
  'paul t': 'Tommy Paul',
  't paul': 'Tommy Paul',
  'tiafoe f': 'Frances Tiafoe',
  'f tiafoe': 'Frances Tiafoe',
  'shelton b': 'Ben Shelton',
  'b shelton': 'Ben Shelton',
  'draper j': 'Jack Draper',
  'j draper': 'Jack Draper',
  'musetti l': 'Lorenzo Musetti',
  'l musetti': 'Lorenzo Musetti',
  'berrettini m': 'Matteo Berrettini',
  'm berrettini': 'Matteo Berrettini',
  'auger-aliassime f': 'Felix Auger-Aliassime',
  'f auger-aliassime': 'Felix Auger-Aliassime',
  'humbert u': 'Ugo Humbert',
  'u humbert': 'Ugo Humbert',
  'lehecka j': 'Jiri Lehecka',
  'j lehecka': 'Jiri Lehecka',
  'bublik a': 'Alexander Bublik',
  'a bublik': 'Alexander Bublik',
  'khachanov k': 'Karen Khachanov',
  'k khachanov': 'Karen Khachanov',
  'korda s': 'Sebastian Korda',
  's korda': 'Sebastian Korda',
  'cerundolo f': 'Francisco Cerundolo',
  'f cerundolo': 'Francisco Cerundolo',
  'jarry n': 'Nicolas Jarry',
  'n jarry': 'Nicolas Jarry',
  'baez s': 'Sebastian Baez',
  's baez': 'Sebastian Baez',
  'thompson j': 'Jordan Thompson',
  'j thompson': 'Jordan Thompson',
  'tabilo a': 'Alejandro Tabilo',
  'a tabilo': 'Alejandro Tabilo',
  'nakashima b': 'Brandon Nakashima',
  'b nakashima': 'Brandon Nakashima',
  'arnaldi m': 'Matteo Arnaldi',
  'm arnaldi': 'Matteo Arnaldi',
  'machac t': 'Tomas Machac',
  't machac': 'Tomas Machac',
  'mensik j': 'Jakub Mensik',
  'j mensik': 'Jakub Mensik',
  'fils a': 'Arthur Fils',
  'a fils': 'Arthur Fils',
  'cobolli f': 'Flavio Cobolli',
  'f cobolli': 'Flavio Cobolli',
  'popyrin a': 'Alexei Popyrin',
  'a popyrin': 'Alexei Popyrin',
  'nishikori k': 'Kei Nishikori',
  'k nishikori': 'Kei Nishikori',
  'murray a': 'Andy Murray',
  'a murray': 'Andy Murray',
  'nadal r': 'Rafael Nadal',
  'r nadal': 'Rafael Nadal',
  'federer r': 'Roger Federer',
  'r federer': 'Roger Federer',
  'wawrinka s': 'Stan Wawrinka',
  's wawrinka': 'Stan Wawrinka',
  'monfils g': 'Gael Monfils',
  'g monfils': 'Gael Monfils',
  'rune h': 'Holger Rune',
  'h rune': 'Holger Rune',
  
  // Altri formati
  'sonego l': 'Lorenzo Sonego',
  'l sonego': 'Lorenzo Sonego',
  'fognini f': 'Fabio Fognini',
  'f fognini': 'Fabio Fognini',
  'norrie c': 'Cameron Norrie',
  'c norrie': 'Cameron Norrie',
  'tien l': 'Learner Tien',
  'l tien': 'Learner Tien',
  'shang j': 'Juncheng Shang',
  'j shang': 'Juncheng Shang',
  'shapovalov d': 'Denis Shapovalov',
  'd shapovalov': 'Denis Shapovalov',
  'kyrgios n': 'Nick Kyrgios',
  'n kyrgios': 'Nick Kyrgios',
  'cilic m': 'Marin Cilic',
  'm cilic': 'Marin Cilic',
  'goffin d': 'David Goffin',
  'd goffin': 'David Goffin',
  'evans d': 'Daniel Evans',
  'd evans': 'Daniel Evans',
  'kokkinakis t': 'Thanasi Kokkinakis',
  't kokkinakis': 'Thanasi Kokkinakis',
  'gasquet r': 'Richard Gasquet',
  'r gasquet': 'Richard Gasquet',
  'moutet c': 'Corentin Moutet',
  'c moutet': 'Corentin Moutet',
  'gaston h': 'Hugo Gaston',
  'h gaston': 'Hugo Gaston',
  'mannarino a': 'Adrian Mannarino',
  'a mannarino': 'Adrian Mannarino',
  
  // Nomi speciali
  'van de zandschulp b': 'Botic Van De Zandschulp',
  'b van de zandschulp': 'Botic Van De Zandschulp',
  'bautista agut r': 'Roberto Bautista Agut',
  'r bautista agut': 'Roberto Bautista Agut',
  'carreno busta p': 'Pablo Carreno Busta',
  'p carreno busta': 'Pablo Carreno Busta',
  'davidovich fokina a': 'Alejandro Davidovich Fokina',
  'a davidovich fokina': 'Alejandro Davidovich Fokina',
  'mpetshi perricard g': 'Giovanni Mpetshi Perricard',
  'g mpetshi perricard': 'Giovanni Mpetshi Perricard',
  
  // Formati con iniziali multiple
  'struff jl': 'Jan-Lennard Struff',
  'jl struff': 'Jan-Lennard Struff',
  'cerundolo jm': 'Juan Manuel Cerundolo',
  'jm cerundolo': 'Juan Manuel Cerundolo',
  'zhang zh': 'Zhizhen Zhang',
  'zh zhang': 'Zhizhen Zhang',
  'tseng ch': 'Chun-Hsin Tseng',
  'ch tseng': 'Chun-Hsin Tseng'
};

/**
 * Genera alias comuni da un nome completo
 */
function generateCommonAliases(fullName) {
  const aliases = new Set();
  
  if (!fullName) return aliases;
  
  const normalized = fullName.toLowerCase().trim();
  const parts = normalized.split(' ');
  
  if (parts.length >= 2) {
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const initial = firstName[0];
    
    // Formato: Cognome I.
    aliases.add(`${lastName} ${initial}`);
    
    // Formato: I. Cognome
    aliases.add(`${initial} ${lastName}`);
    
    // Solo cognome
    aliases.add(lastName);
    
    // Nome completo lowercase
    aliases.add(normalized);
    
    // Nome completo con maiuscole
    aliases.add(fullName.toLowerCase());
    
    // Se ha trattini (es. Felix Auger-Aliassime)
    if (lastName.includes('-')) {
      const lastPart = lastName.split('-').pop();
      aliases.add(`${lastPart} ${initial}`);
      aliases.add(`${initial} ${lastPart}`);
    }
    
    // Se nome composto (es. Juan Manuel Cerundolo)
    if (parts.length > 2) {
      const initials = parts.slice(0, -1).map(p => p[0]).join('');
      aliases.add(`${lastName} ${initials}`);
      aliases.add(`${initials} ${lastName}`);
    }
  }
  
  return aliases;
}

/**
 * Normalizza stringa per confronto
 */
function normalizeForMatch(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('🔄 Popolamento tabella player_aliases...');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // 1. Carica tutti i giocatori
  const { data: players, error } = await supabase
    .from('players_new')
    .select('id, name, country');

  if (error) {
    console.error('❌ Errore caricamento giocatori:', error.message);
    process.exit(1);
  }

  console.log(`📦 Trovati ${players.length} giocatori\n`);

  // 2. Carica alias esistenti
  const { data: existingAliases } = await supabase
    .from('player_aliases')
    .select('player_id, alias_name');

  const existingSet = new Set(
    (existingAliases || []).map(a => `${a.player_id}:${a.alias_name.toLowerCase()}`)
  );

  console.log(`📋 Alias esistenti: ${existingSet.size}\n`);

  // 3. Prepara nuovi alias
  const newAliases = [];
  const stats = {
    fromMappings: 0,
    generated: 0,
    skippedExisting: 0
  };

  for (const player of players) {
    const playerAliases = new Set();
    const normalizedName = normalizeForMatch(player.name);

    // 3a. Cerca nei mappings esistenti
    for (const [alias, canonicalName] of Object.entries(PLAYER_NAME_MAPPINGS)) {
      const normalizedCanonical = normalizeForMatch(canonicalName);
      
      if (normalizedCanonical === normalizedName || 
          canonicalName.toLowerCase() === player.name.toLowerCase()) {
        playerAliases.add(alias);
        stats.fromMappings++;
      }
    }

    // 3b. Genera alias comuni
    const generated = generateCommonAliases(player.name);
    for (const alias of generated) {
      if (!playerAliases.has(alias)) {
        playerAliases.add(alias);
        stats.generated++;
      }
    }

    // 3c. Aggiungi solo alias non esistenti
    for (const alias of playerAliases) {
      const key = `${player.id}:${alias.toLowerCase()}`;
      
      if (existingSet.has(key)) {
        stats.skippedExisting++;
        continue;
      }

      newAliases.push({
        player_id: player.id,
        alias_name: alias,
        source: 'auto_generated'
      });
    }
  }

  console.log(`📊 Statistiche:`);
  console.log(`   Da mappings: ${stats.fromMappings}`);
  console.log(`   Generati: ${stats.generated}`);
  console.log(`   Già esistenti: ${stats.skippedExisting}`);
  console.log(`   Nuovi da inserire: ${newAliases.length}\n`);

  if (dryRun) {
    console.log('🔍 [DRY RUN] Primi 20 alias:');
    newAliases.slice(0, 20).forEach(a => {
      const player = players.find(p => p.id === a.player_id);
      console.log(`   ${player?.name} → "${a.alias_name}"`);
    });
    return;
  }

  // 4. Inserisci in batch
  if (newAliases.length === 0) {
    console.log('✅ Nessun nuovo alias da inserire');
    return;
  }

  console.log('💾 Inserimento alias...');
  
  const batchSize = 500;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < newAliases.length; i += batchSize) {
    const batch = newAliases.slice(i, i + batchSize);
    
    const { error: insertError } = await supabase
      .from('player_aliases')
      .insert(batch)
      .select();

    if (insertError) {
      console.error(`   ❌ Errore batch ${i}-${i + batch.length}: ${insertError.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(`   ✅ Inseriti ${inserted}/${newAliases.length}`);
    }
  }

  console.log(`\n✅ Completato: ${inserted} alias inseriti, ${errors} errori`);
}

main().catch(console.error);
