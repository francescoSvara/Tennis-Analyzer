/**
 * Test script per svgMomentumExtractor
 * Testa l'estrazione con i dati reali di Musetti vs De Minaur
 */

const { 
  processSvgMomentum,
  extractMomentumFromSvgHtml,
  normalizeMomentumPerSet
} = require('./utils/svgMomentumExtractor');

// SVG HTML reale da sofascore bars group.txt (Musetti vs De Minaur)
const testSvgHtml = `
<div dir="ltr" class="d_flex flex-b_[auto] flex-g_0 flex-sh_1 pos_relative h_8xl me_[6px]"><svg class="set d_inline-block pos_relative me_2xs bg_surface.s1 bg-i_linear-gradient({colors.homeAway.home.primaryHighlight},_{colors.homeAway.home.primaryHighlight}_50%,_{colors.homeAway.away.primaryHighlight}_50%,_{colors.homeAway.away.primaryHighlight}) bd-t_2px_solid_{colors.homeAway.home.primary/40} bd-b_2px_solid_{colors.homeAway.away.primary/40} trs_all trs-dur_normal [&amp;.home]:bd-t-c_neutrals.nLv1 [&amp;.away]:bd-b-c_neutrals.nLv1 [&amp;_&gt;_g_&gt;_path]:shape-rendering_crispEdges home" viewBox="0 -40 115.19999999999999 80" width="96" transform="" height="80"><g><path class="game" d="
    M1,0
    v25.839999999999996
    h8
    v-25.839999999999996
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M9.6,0
    v-15.952000000000002
    h8
    v15.952000000000002
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M19.2,0
    v4
    h8
    v-4
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M28.799999999999997,0
    v-4
    h8
    v4
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M38.4,0
    v11.176000000000002
    h8
    v-11.176000000000002
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M48,0
    v-5.904
    h8
    v5.904
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M57.599999999999994,0
    v4
    h8
    v-4
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M67.2,0
    v-12.304000000000002
    h8
    v12.304000000000002
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M76.8,0
    v21.44
    h8
    v-21.44
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M86.39999999999999,0
    v-8.168000000000001
    h8
    v8.168000000000001
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M96,0
    v-4
    h8
    v4
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M105.6,0
    v-4
    h8
    v4
    z" fill="var(--colors-home-away-home-primary)"></path></g></svg><svg class="set d_inline-block pos_relative me_2xs bg_surface.s1 bg-i_linear-gradient({colors.homeAway.home.primaryHighlight},_{colors.homeAway.home.primaryHighlight}_50%,_{colors.homeAway.away.primaryHighlight}_50%,_{colors.homeAway.away.primaryHighlight}) bd-t_2px_solid_{colors.homeAway.home.primary/40} bd-b_2px_solid_{colors.homeAway.away.primary/40} trs_all trs-dur_normal [&amp;.home]:bd-t-c_neutrals.nLv1 [&amp;.away]:bd-b-c_neutrals.nLv1 [&amp;_&gt;_g_&gt;_path]:shape-rendering_crispEdges away" viewBox="0 -40 86.39999999999999 80" width="72" transform="" height="80"><g><path class="game" d="
    M1,0
    v4
    h8
    v-4
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M9.6,0
    v-10.16
    h8
    v10.16
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M19.2,0
    v9.136
    h8
    v-9.136
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M28.799999999999997,0
    v-10.72
    h8
    v10.72
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M38.4,0
    v4
    h8
    v-4
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M48,0
    v-12.328000000000001
    h8
    v12.328000000000001
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M57.599999999999994,0
    v21.872
    h8
    v-21.872
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M67.2,0
    v26.072000000000003
    h8
    v-26.072000000000003
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M76.8,0
    v9.719999999999999
    h8
    v-9.719999999999999
    z" fill="var(--colors-home-away-away-primary)"></path></g></svg><svg class="set d_inline-block pos_relative me_2xs bg_surface.s1 bg-i_linear-gradient({colors.homeAway.home.primaryHighlight},_{colors.homeAway.home.primaryHighlight}_50%,_{colors.homeAway.away.primaryHighlight}_50%,_{colors.homeAway.away.primaryHighlight}) bd-t_2px_solid_{colors.homeAway.home.primary/40} bd-b_2px_solid_{colors.homeAway.away.primary/40} trs_all trs-dur_normal [&amp;.home]:bd-t-c_neutrals.nLv1 [&amp;.away]:bd-b-c_neutrals.nLv1 [&amp;_&gt;_g_&gt;_path]:shape-rendering_crispEdges home" viewBox="0 -40 115.19999999999999 80" width="96" transform="" height="80"><g><path class="game" d="
    M1,0
    v23.52
    h8
    v-23.52
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M9.6,0
    v5.024000000000001
    h8
    v-5.024000000000001
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M19.2,0
    v-4
    h8
    v4
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M28.799999999999997,0
    v5.2
    h8
    v-5.2
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M38.4,0
    v-4
    h8
    v4
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M48,0
    v4
    h8
    v-4
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M57.599999999999994,0
    v-4
    h8
    v4
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M67.2,0
    v4
    h8
    v-4
    z" fill="var(--colors-home-away-away-primary)"></path></g><g><path class="game" d="
    M76.8,0
    v-4
    h8
    v4
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M86.39999999999999,0
    v-14.719999999999999
    h8
    v14.719999999999999
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M96,0
    v-4
    h8
    v4
    z" fill="var(--colors-home-away-home-primary)"></path></g><g><path class="game" d="
    M105.6,0
    v-13.008000000000003
    h8
    v13.008000000000003
    z" fill="var(--colors-home-away-home-primary)"></path></g></svg></div>
`;

console.log('========================================');
console.log('TEST SVG MOMENTUM EXTRACTOR');
console.log('Match: Musetti vs De Minaur');
console.log('========================================\n');

// Test 1: Estrazione grezza
console.log('--- TEST 1: Estrazione grezza ---');
const rawExtracted = extractMomentumFromSvgHtml(testSvgHtml);
console.log('OK:', rawExtracted.ok);
console.log('Sets trovati:', rawExtracted.sets.length);

if (rawExtracted.ok) {
  rawExtracted.sets.forEach((set, idx) => {
    console.log(`\nSet ${idx + 1}: ${set.games.length} game, viewBox width: ${set.vbW}`);
    set.games.slice(0, 3).forEach(g => {
      console.log(`  Game ${g.game}: side=${g.side}, raw_v=${g.raw_v?.toFixed(2)}, signed=${g.signed_raw?.toFixed(2)}`);
    });
    if (set.games.length > 3) console.log(`  ... e altri ${set.games.length - 3} game`);
  });
}

// Test 2: Normalizzazione per set
console.log('\n--- TEST 2: Normalizzazione per set ---');
const normalized = normalizeMomentumPerSet(rawExtracted);

if (normalized.ok) {
  normalized.sets.forEach((set, idx) => {
    console.log(`\nSet ${idx + 1} (normalizzato):`);
    set.games.forEach(g => {
      console.log(`  Game ${g.game}: value=${g.value}, side=${g.side}, scale=${g.normScale?.toFixed(2)}`);
    });
  });
}

// Test 3: Processo completo (estrazione + normalizzazione + formato DB)
console.log('\n--- TEST 3: Processo completo (per DB) ---');
const result = processSvgMomentum(testSvgHtml);

console.log('OK:', result.ok);
console.log('Sets:', result.setsCount);
console.log('Games totali:', result.gamesCount);

if (result.ok) {
  console.log('\nPrimi 5 power rankings (formato DB):');
  result.powerRankings.slice(0, 5).forEach(pr => {
    console.log(`  Set ${pr.set}, Game ${pr.game}: value=${pr.value}, side=${pr.side}, source=${pr.source}`);
  });
  
  console.log('\nUltimi 3 power rankings:');
  result.powerRankings.slice(-3).forEach(pr => {
    console.log(`  Set ${pr.set}, Game ${pr.game}: value=${pr.value}, side=${pr.side}`);
  });
}

// Test 4: Statistiche momentum
console.log('\n--- TEST 4: Statistiche momentum ---');
if (result.ok) {
  const homeGames = result.powerRankings.filter(p => p.value > 0);
  const awayGames = result.powerRankings.filter(p => p.value < 0);
  const neutralGames = result.powerRankings.filter(p => p.value === 0);
  
  const avgHome = homeGames.length > 0 
    ? homeGames.reduce((sum, p) => sum + p.value, 0) / homeGames.length 
    : 0;
  const avgAway = awayGames.length > 0 
    ? awayGames.reduce((sum, p) => sum + Math.abs(p.value), 0) / awayGames.length 
    : 0;
  
  console.log(`Game dominati da HOME (Musetti): ${homeGames.length} (avg: +${avgHome.toFixed(1)})`);
  console.log(`Game dominati da AWAY (De Minaur): ${awayGames.length} (avg: -${avgAway.toFixed(1)})`);
  console.log(`Game neutri: ${neutralGames.length}`);
  
  const maxHome = Math.max(...result.powerRankings.map(p => p.value));
  const maxAway = Math.min(...result.powerRankings.map(p => p.value));
  console.log(`\nMax momentum HOME: +${maxHome}`);
  console.log(`Max momentum AWAY: ${maxAway}`);
}

console.log('\n========================================');
console.log('TEST COMPLETATO ✅');
console.log('========================================');
