/**
 * SCRIPT: Genera mapping completi giocatori
 *
 * Legge l'xlsx e il DB per creare mapping automatici
 * tra nomi abbreviati (Albot R.) e nomi completi
 */

const xlsx = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Nomi completi noti (presi da xlsx o altre fonti)
// Formato: 'Cognome X.' -> 'Nome Cognome'
const MANUAL_MAPPINGS = {
  // Top players già mappati
  'Sinner J.': 'Jannik Sinner',
  'Alcaraz C.': 'Carlos Alcaraz',
  'Djokovic N.': 'Novak Djokovic',
  'Medvedev D.': 'Daniil Medvedev',
  'Zverev A.': 'Alexander Zverev',
  'Rublev A.': 'Andrey Rublev',
  'Ruud C.': 'Casper Ruud',
  'Fritz T.': 'Taylor Fritz',
  'De Minaur A.': 'Alex De Minaur',
  'Tsitsipas S.': 'Stefanos Tsitsipas',
  'Hurkacz H.': 'Hubert Hurkacz',
  'Dimitrov G.': 'Grigor Dimitrov',
  'Paul T.': 'Tommy Paul',
  'Tiafoe F.': 'Frances Tiafoe',
  'Shelton B.': 'Ben Shelton',
  'Draper J.': 'Jack Draper',
  'Musetti L.': 'Lorenzo Musetti',
  'Berrettini M.': 'Matteo Berrettini',
  'Auger-Aliassime F.': 'Felix Auger-Aliassime',
  'Humbert U.': 'Ugo Humbert',
  'Lehecka J.': 'Jiri Lehecka',
  'Bublik A.': 'Alexander Bublik',
  'Khachanov K.': 'Karen Khachanov',
  'Korda S.': 'Sebastian Korda',
  'Cerundolo F.': 'Francisco Cerundolo',
  'Jarry N.': 'Nicolas Jarry',
  'Baez S.': 'Sebastian Baez',
  'Thompson J.': 'Jordan Thompson',
  'Tabilo A.': 'Alejandro Tabilo',
  'Nakashima B.': 'Brandon Nakashima',
  'Arnaldi M.': 'Matteo Arnaldi',
  'Machac T.': 'Tomas Machac',
  'Mensik J.': 'Jakub Mensik',
  'Fils A.': 'Arthur Fils',
  'Cobolli F.': 'Flavio Cobolli',
  'Popyrin A.': 'Alexei Popyrin',
  'Nishikori K.': 'Kei Nishikori',
  'Wawrinka S.': 'Stan Wawrinka',
  'Monfils G.': 'Gael Monfils',

  // === NUOVI MAPPING DA AGGIUNGERE ===
  'Albot R.': 'Radu Albot',
  'Altmaier D.': 'Daniel Altmaier',
  'Arseneault N.': 'Nathan Arseneault',
  'Baadi T.': 'Toby Baadi',
  'Barrere G.': 'Gregoire Barrere',
  'Barrios M.': 'Marcelo Barrios Vera',
  'Basavareddy N.': 'Nishesh Basavareddy',
  'Basilashvili N.': 'Nikoloz Basilashvili',
  'Bautista Agut R.': 'Roberto Bautista Agut',
  'Becroft I.': 'Isaac Becroft',
  'Bellucci M.': 'Mattia Bellucci',
  'Benchetrit E.': 'Elliot Benchetrit',
  'Bergs Z.': 'Zizou Bergs',
  'Blanchet U.': 'Ugo Blanchet',
  'Blockx A.': 'Alexander Blockx',
  'Bonzi B.': 'Benjamin Bonzi',
  'Borges N.': 'Nuno Borges',
  'Boyer T.': 'Titouan Boyer',
  'Brooksby J.': 'Jenson Brooksby',
  'Bu Y.': 'Yunchaokete Bu',
  'Burruchaga R.': 'Roman Burruchaga',
  'Buse I.': 'Ignacio Buse',
  'Carballes Baena R.': 'Roberto Carballes Baena',
  'Carreno Busta P.': 'Pablo Carreno Busta',
  'Cazaux A.': 'Arthur Cazaux',
  'Chidekh C.': 'Clement Chidekh',
  'Cilic M.': 'Marin Cilic',
  'Cina F.': 'Federico Cina',
  'Collignon R.': 'Raphael Collignon',
  'Comesana F.': 'Francisco Comesana',
  'Coria F.': 'Federico Coria',
  'Coric B.': 'Borna Coric',
  'Daniel T.': 'Taro Daniel',
  'Darderi L.': 'Luciano Darderi',
  'Davidovich Fokina A.': 'Alejandro Davidovich Fokina',
  'De Jong J.': 'Jesper De Jong',
  'Dellien H.': 'Hugo Dellien',
  'Denolly C.': 'Corentin Denolly',
  'Diallo G.': 'Gabriel Diallo',
  'Diaz Acosta F.': 'Facundo Diaz Acosta',
  'Djere L.': 'Laslo Djere',
  'Dougaz A.': 'Aziz Dougaz',
  'Duckworth J.': 'James Duckworth',
  'Dzumhur D.': 'Damir Dzumhur',
  'Etcheverry T.': 'Tomas Etcheverry',
  'Eubanks C.': 'Christopher Eubanks',
  'Evans D.': 'Daniel Evans',
  'Faria J.': 'Jaime Faria',
  'Fearnley J.': 'Jacob Fearnley',
  'Fognini F.': 'Fabio Fognini',
  'Fonseca J.': 'Joao Fonseca',
  'Fucsovics M.': 'Marton Fucsovics',
  'Garin C.': 'Cristian Garin',
  'Gasquet R.': 'Richard Gasquet',
  'Gaston H.': 'Hugo Gaston',
  'Gea A.': 'Alvaro Gea',
  'Gigante M.': 'Matteo Gigante',
  'Giron M.': 'Marcos Giron',
  'Goffin D.': 'David Goffin',
  'Gojo B.': 'Borna Gojo',
  'Gomez F.': 'Federico Gomez',
  'Grenier H.': 'Hugo Grenier',
  'Griekspoor T.': 'Tallon Griekspoor',
  'Guinard M.': 'Manuel Guinard',
  'Habib H.': 'Hady Habib',
  'Halys Q.': 'Quentin Halys',
  'Hanfmann Y.': 'Yannick Hanfmann',
  'Harris B.': 'Billy Harris',
  'Heide G.': 'Gustavo Heide',
  'Herbert P.': 'Pierre-Hugues Herbert',
  'Hijikata R.': 'Rinky Hijikata',
  'Holt B.': 'Brandon Holt',
  'Jasika O.': 'Omar Jasika',
  'Kachmazov A.': 'Alibek Kachmazov',
  'Kecmanovic M.': 'Miomir Kecmanovic',
  'Klizan M.': 'Martin Klizan',
  'Koepfer D.': 'Dominik Koepfer',
  'Kokkinakis T.': 'Thanasi Kokkinakis',
  'Kopriva V.': 'Vit Kopriva',
  'Kotov P.': 'Pavel Kotov',
  'Kovacevic A.': 'Aleksandar Kovacevic',
  'Krueger M.': 'Mitchell Krueger',
  'Kukushkin M.': 'Mikhail Kukushkin',
  'Kyrgios N.': 'Nick Kyrgios',
  'Lajovic D.': 'Dusan Lajovic',
  'Lalami Laaroussi Y.': 'Younes Lalami Laaroussi',
  'Landaluce M.': 'Martin Landaluce',
  'Lestienne C.': 'Constant Lestienne',
  'Majchrzak K.': 'Kamil Majchrzak',
  'Mannarino A.': 'Adrian Mannarino',
  'Marozsan F.': 'Fabian Marozsan',
  'Martinez P.': 'Pedro Martinez',
  'Mayot H.': 'Harold Mayot',
  'Mccabe J.': 'John Mccabe',
  'Mcdonald M.': 'Mackenzie Mcdonald',
  'Medjedovic H.': 'Hamad Medjedovic',
  'Meligeni Alves F.': 'Felipe Meligeni Alves',
  'Michelsen A.': 'Alex Michelsen',
  'Misolic F.': 'Filip Misolic',
  'Mmoh M.': 'Michael Mmoh',
  'Monteiro T.': 'Thiago Monteiro',
  'Moro Canas A.': 'Albert Moro Canas',
  'Moutet C.': 'Corentin Moutet',
  'Mpetshi G.': 'Giovanni Mpetshi Perricard',
  'Muller A.': 'Alexandre Muller',
  'Munar J.': 'Jaume Munar',
  'Nagal S.': 'Sumit Nagal',
  'Nardi L.': 'Luca Nardi',
  'Nava E.': 'Emilio Nava',
  'Navone M.': 'Mariano Navone',
  'Nishioka Y.': 'Yoshihito Nishioka',
  'Norrie C.': 'Cameron Norrie',
  'O Connell C.': 'Christopher O Connell',
  'Onclin G.': 'Gilles Onclin',
  'Opelka R.': 'Reilly Opelka',
  'Pacheco Mendez R.': 'Rodrigo Pacheco Mendez',
  'Passaro F.': 'Francesco Passaro',
  'Popko D.': 'Dmitry Popko',
  'Pouille L.': 'Lucas Pouille',
  'Quinn E.': 'Ethan Quinn',
  'Rinderknech A.': 'Arthur Rinderknech',
  'Ritschard A.': 'Alexander Ritschard',
  'Rottgering M.': 'Mees Rottgering',
  'Royer V.': 'Valentin Royer',
  'Rune H.': 'Holger Rune',
  'Safiullin R.': 'Roman Safiullin',
  'Sakamoto R.': 'Ryo Sakamoto',
  'Samrej K.': 'Kasidit Samrej',
  'Schoolkate T.': 'Tristan Schoolkate',
  'Schwartzman D.': 'Diego Schwartzman',
  'Seyboth Wild T.': 'Thiago Seyboth Wild',
  'Shang J.': 'Juncheng Shang',
  'Shapovalov D.': 'Denis Shapovalov',
  'Shelbayh A.': 'Abedallah Shelbayh',
  'Shevchenko A.': 'Alexander Shevchenko',
  'Skatov T.': 'Timofey Skatov',
  'Smith C.': 'Connor Smith',
  'Sonego L.': 'Lorenzo Sonego',
  'Spizzirri E.': 'Eliot Spizzirri',
  'Stricker D.': 'Dominic Stricker',
  'Svajda T.': 'Tristan Svajda',
  'Svajda Z.': 'Zachary Svajda',
  'Tien L.': 'Learner Tien',
  'Tu L.': 'Li Tu',
  'Ugo Carabelli C.': 'Camilo Ugo Carabelli',
  'Vacherot V.': 'Valentin Vacherot',
  'Van Assche L.': 'Luca Van Assche',
  'Van De Zandschulp B.': 'Botic Van De Zandschulp',
  'Vavassori A.': 'Andrea Vavassori',
  'Virtanen O.': 'Otto Virtanen',
  'Vukic A.': 'Aleksandar Vukic',
  'Walton A.': 'Adam Walton',
  'Watanuki Y.': 'Yosuke Watanuki',
  'Wong C.': 'Coleman Wong',
  'Wu Y.': 'Yibing Wu',
  'Zeppieri G.': 'Giulio Zeppieri',

  // Nomi con formato strano nel DB
  'Cerundolo J.m.': 'Juan Manuel Cerundolo',
  'Ficovich J.p.': 'Juan Pablo Ficovich',
  'Galan D.e.': 'Daniel Elahi Galan',
  'Huesler M.a.': 'Marc-Andrea Huesler',
  'Struff J.l.': 'Jan-Lennard Struff',
  'Tirante T.a.': 'Thiago Agustin Tirante',
  'Trotter J.k.': 'JK Trotter',
  'Tseng C.h.': 'Chun-Hsin Tseng',
  'Zhang Zh.': 'Zhizhen Zhang',
};

async function generateMappings() {
  console.log('📊 Generazione mapping giocatori...\n');

  // Ottieni tutti i nomi dal DB
  const { data: matches, error } = await supabase.from('matches').select('winner_name, loser_name');

  if (error) {
    console.error('Errore DB:', error);
    return;
  }

  const allNames = new Set();
  matches.forEach((m) => {
    if (m.winner_name) allNames.add(m.winner_name);
    if (m.loser_name) allNames.add(m.loser_name);
  });

  const names = Array.from(allNames).sort();

  // Trova nomi abbreviati senza mapping
  const shortNames = names.filter((n) => n && /\s[A-Z]\.$/.test(n));
  const missingMappings = shortNames.filter((n) => !MANUAL_MAPPINGS[n]);

  console.log('Totale giocatori unici:', names.length);
  console.log('Nomi abbreviati:', shortNames.length);
  console.log('Mapping disponibili:', Object.keys(MANUAL_MAPPINGS).length);
  console.log('Mapping mancanti:', missingMappings.length);

  if (missingMappings.length > 0) {
    console.log('\n⚠️  MAPPING MANCANTI:');
    missingMappings.forEach((n) => console.log(`  '${n}': '???',`));
  }

  // Genera output per dataNormalizer.js
  console.log('\n\n=== CODICE DA INSERIRE IN dataNormalizer.js ===\n');
  console.log('const PLAYER_NAME_MAPPINGS = {');
  Object.entries(MANUAL_MAPPINGS)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([short, full]) => {
      console.log(`  '${short}': '${full}',`);
    });
  console.log('};');

  return MANUAL_MAPPINGS;
}

generateMappings();
