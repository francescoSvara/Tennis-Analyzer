/**
 * Data Analysis Module
 * 
 * Analizza la coerenza tra diversi set di dati:
 * 1. SofaScore API data (match info, set scores) 
 * 2. SVG momentum data (match_power_rankings_new - 18 games)
 * 3. PBP HTML data (extracted - 111 points/23 games)
 * 
 * Trova pattern e correlazioni tra i data sources
 */

const fs = require('fs');
const path = require('path');

class DataAnalyzer {
  constructor() {
    this.matchId = 14968724;
    this.data = {
      pbp: null,        // Point-by-point from HTML
      svg: null,        // SVG momentum data  
      api: null,        // SofaScore API data
      analysis: {}
    };
  }

  /**
   * Carica tutti i data sources
   */
  async loadData() {
    try {
      // 1. Carica PBP data dall'HTML
      console.log('📊 Caricando PBP data da HTML...');
      this.data.pbp = this.loadPbpData();
      
      // 2. Carica SVG data dal database
      console.log('📊 Caricando SVG data dal database...');
      this.data.svg = await this.loadSvgData();
      
      // 3. Carica API data (se disponibile)
      console.log('📊 Caricando API data...');
      this.data.api = await this.loadApiData();
      
      console.log('✅ Data loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error loading data:', error.message);
      return false;
    }
  }

  /**
   * Carica PBP data dall'HTML estratto
   */
  loadPbpData() {
    try {
      const extractor = require('./utils/sofascorePbpExtractor.cjs');
      const htmlPath = path.join(__dirname, 'pbp code');
      const html = fs.readFileSync(htmlPath, 'utf-8');
      
      const extracted = extractor.extractSofascorePbp(html);
      if (!extracted.ok) {
        throw new Error('PBP extraction failed: ' + extracted.error);
      }
      
      console.log(`   └── PBP: ${extracted.games.length} games, ${extracted.totalPoints} points`);
      return extracted;
    } catch (error) {
      console.error('   └── PBP load failed:', error.message);
      return null;
    }
  }

  /**
   * Carica SVG data dal database
   */
  async loadSvgData() {
    try {
      require('dotenv/config');
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
      
      const { data, error } = await supabase
        .from('match_power_rankings_new')
        .select('*')
        .eq('match_id', this.matchId)
        .order('set_number')
        .order('game_number');
      
      if (error) throw error;
      
      console.log(`   └── SVG: ${data ? data.length : 0} games`);
      return data || [];
    } catch (error) {
      console.error('   └── SVG load failed:', error.message);
      return [];
    }
  }

  /**
   * Carica API data dal database
   */
  async loadApiData() {
    try {
      require('dotenv/config');
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
      
      const { data, error } = await supabase
        .from('matches_new')
        .select('*')
        .eq('id', this.matchId)
        .single();
      
      if (error) throw error;
      
      console.log(`   └── API: match data loaded`);
      return data;
    } catch (error) {
      console.error('   └── API load failed:', error.message);
      return null;
    }
  }

  /**
   * Esegue l'analisi completa
   */
  analyze() {
    if (!this.data.pbp) {
      console.error('❌ Cannot analyze: PBP data not loaded');
      return;
    }

    console.log('\n🔍 ANALISI COERENZA DATI');
    console.log('=' .repeat(50));
    
    // 1. Analisi di base - conteggi
    this.analyzeBasicCounts();
    
    // 2. Analisi set scores
    this.analyzeSetScores();
    
    // 3. Analisi game winners
    this.analyzeGameWinners();
    
    // 4. Analisi break points
    this.analyzeBreaks();
    
    // 5. Analisi momentum correlation
    this.analyzeMomentumCorrelation();
    
    // 6. Report finale
    this.generateReport();
  }

  /**
   * Analisi conteggi di base
   */
  analyzeBasicCounts() {
    const pbpGames = this.data.pbp?.games?.length || 0;
    const svgGames = this.data.svg?.length || 0;
    
    console.log('\n📊 CONTEGGI BASE');
    console.log(`PBP Games: ${pbpGames}`);
    console.log(`SVG Games: ${svgGames}`);
    console.log(`Match: ${pbpGames === svgGames ? '✅' : '❌'} Games count`);
    
    this.data.analysis.counts = {
      pbpGames,
      svgGames,
      match: pbpGames === svgGames
    };
  }

  /**
   * Analisi set scores
   */
  analyzeSetScores() {
    if (!this.data.pbp?.sets || this.data.pbp.sets.length === 0) return;
    
    console.log('\n🎾 SET SCORES');
    
    const pbpSetScores = {};
    this.data.pbp.sets.forEach(set => {
      let homeGames = 0, awayGames = 0;
      
      set.games.forEach(game => {
        if (game.gameWinner === 'home') homeGames++;
        else if (game.gameWinner === 'away') awayGames++;
      });
      
      pbpSetScores[set.setNumber] = { home: homeGames, away: awayGames };
      console.log(`Set ${set.setNumber}: ${homeGames}-${awayGames} (PBP)`);
    });
    
    this.data.analysis.setScores = { pbp: pbpSetScores };
  }

  /**
   * Analisi vincitori dei games
   */
  analyzeGameWinners() {
    if (!this.data.pbp?.games || !this.data.svg) return;
    
    console.log('\n🏆 GAME WINNERS');
    
    const comparison = [];
    this.data.pbp.games.forEach(pbpGame => {
      const svgGame = this.data.svg.find(sg => 
        sg.set_number === pbpGame.set && sg.game_number === pbpGame.game
      );
      
      if (svgGame) {
        const pbpWinner = pbpGame.gameWinner;
        const svgValue = svgGame.value_svg || svgGame.value || 0;
        const svgWinner = svgValue >= 0 ? 'home' : 'away';
        const match = pbpWinner === svgWinner;
        
        comparison.push({
          game: `S${pbpGame.set}G${pbpGame.game}`,
          pbpWinner,
          svgWinner,
          svgValue,
          match
        });
        
        console.log(`${match ? '✅' : '❌'} S${pbpGame.set}G${pbpGame.game}: PBP=${pbpWinner} | SVG=${svgWinner} (${svgValue})`);
      }
    });
    
    const matches = comparison.filter(c => c.match).length;
    const total = comparison.length;
    console.log(`\n📈 Game winners agreement: ${matches}/${total} (${Math.round(matches/total*100)}%)`);
    
    this.data.analysis.gameWinners = { comparison, matches, total };
  }

  /**
   * Analisi break points
   */
  analyzeBreaks() {
    if (!this.data.pbp?.games) return;
    
    console.log('\n💥 BREAKS ANALYSIS');
    
    const pbpBreaks = this.data.pbp.games.filter(g => g.isBreak);
    console.log(`PBP detected breaks: ${pbpBreaks.length}`);
    
    pbpBreaks.forEach(breakGame => {
      console.log(`   └── S${breakGame.set}G${breakGame.game}: ${breakGame.server} served, ${breakGame.gameWinner} won`);
    });
    
    this.data.analysis.breaks = { pbpBreaks: pbpBreaks.length };
  }

  /**
   * Analisi correlazione momentum
   */
  analyzeMomentumCorrelation() {
    if (!this.data.pbp?.games || !this.data.svg) return;
    
    console.log('\n📈 MOMENTUM CORRELATION');
    
    const correlations = [];
    
    this.data.pbp.games.forEach(pbpGame => {
      const svgGame = this.data.svg.find(sg => 
        sg.set_number === pbpGame.set && sg.game_number === pbpGame.game
      );
      
      if (svgGame) {
        const pointsCount = pbpGame.points?.length || 0;
        const momentum = Math.abs(svgGame.value_svg || svgGame.value || 0);
        const isBreak = pbpGame.isBreak;
        
        correlations.push({
          game: `S${pbpGame.set}G${pbpGame.game}`,
          pointsCount,
          momentum,
          isBreak
        });
      }
    });
    
    // Calcola correlazioni
    const avgMomentumBreaks = correlations.filter(c => c.isBreak)
      .reduce((sum, c) => sum + c.momentum, 0) / correlations.filter(c => c.isBreak).length || 0;
    
    const avgMomentumNormal = correlations.filter(c => !c.isBreak)
      .reduce((sum, c) => sum + c.momentum, 0) / correlations.filter(c => !c.isBreak).length || 0;
    
    console.log(`Break games avg momentum: ${avgMomentumBreaks.toFixed(2)}`);
    console.log(`Normal games avg momentum: ${avgMomentumNormal.toFixed(2)}`);
    console.log(`Momentum difference: ${(avgMomentumBreaks - avgMomentumNormal).toFixed(2)}`);
    
    this.data.analysis.momentum = {
      avgMomentumBreaks,
      avgMomentumNormal,
      difference: avgMomentumBreaks - avgMomentumNormal
    };
  }

  /**
   * Genera report finale
   */
  generateReport() {
    console.log('\n📋 REPORT FINALE');
    console.log('=' .repeat(50));
    
    const report = {
      timestamp: new Date().toISOString(),
      matchId: this.matchId,
      dataQuality: {
        pbpLoaded: !!this.data.pbp,
        svgLoaded: this.data.svg?.length > 0,
        apiLoaded: !!this.data.api
      },
      analysis: this.data.analysis
    };
    
    // Valutazione qualità
    const gameWinnerAccuracy = this.data.analysis.gameWinners?.matches / this.data.analysis.gameWinners?.total * 100 || 0;
    
    console.log(`✅ Data Quality:`);
    console.log(`   PBP: ${report.dataQuality.pbpLoaded ? '✅' : '❌'}`);
    console.log(`   SVG: ${report.dataQuality.svgLoaded ? '✅' : '❌'}`);
    console.log(`   API: ${report.dataQuality.apiLoaded ? '✅' : '❌'}`);
    
    console.log(`\n📊 Key Findings:`);
    console.log(`   Game winners accuracy: ${gameWinnerAccuracy.toFixed(1)}%`);
    console.log(`   Break games detected: ${this.data.analysis.breaks?.pbpBreaks || 0}`);
    console.log(`   Momentum difference (breaks vs normal): ${this.data.analysis.momentum?.difference?.toFixed(2) || 'N/A'}`);
    
    // Salva report
    const reportPath = path.join(__dirname, `data_analysis_report_${this.matchId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
    
    return report;
  }
}

module.exports = DataAnalyzer;

// CLI execution
if (require.main === module) {
  (async () => {
    const analyzer = new DataAnalyzer();
    const loaded = await analyzer.loadData();
    
    if (loaded) {
      analyzer.analyze();
    } else {
      console.error('❌ Failed to load data');
    }
  })();
}