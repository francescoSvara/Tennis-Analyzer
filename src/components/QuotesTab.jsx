import React, { useState, useMemo, useEffect } from 'react';
import { apiUrl } from '../config';
import './QuotesTab.css';
import { 
  ChartBar, 
  Trophy, 
  Lightning, 
  ChartLineUp, 
  TennisBall,
  CurrencyDollar,
  Hourglass,
  Target,
  Circle,
  Lightbulb
} from '@phosphor-icons/react';

/**
 * QuotesTab - Sezione AVANZATA per analisi quote e value betting
 * 
 * Calcola probabilità stimate basate su:
 * - STORICO GIOCATORI (win rate, comeback rate, ROI) dal database
 * - Win rate per SUPERFICIE specifica
 * - Win rate per FORMATO (Bo3/Bo5)
 * - Ranking giocatori
 * - Momentum attuale del match
 * - Break points e statistiche live
 * - Pressure Index
 * 
 * Confronta con quote manuali Betfair per trovare VALUE
 */

// ============================================================================
// COSTANTI PER IL CALCOLO AVANZATO
// ============================================================================
const WEIGHT_FACTORS = {
  HISTORICAL_WIN_RATE: 0.25,      // Win rate storico generale
  SURFACE_WIN_RATE: 0.20,         // Win rate sulla superficie corrente
  FORMAT_WIN_RATE: 0.10,          // Win rate nel formato (Bo3/Bo5)
  RANKING: 0.15,                  // Differenza ranking
  MOMENTUM_LIVE: 0.15,            // Momentum nel match corrente
  COMEBACK_RATE: 0.10,            // Capacità di rimonta
  EXPERIENCE: 0.05,               // Numero match giocati (esperienza)
};

// Normalizza la superficie dal torneo
const normalizeSurface = (surface) => {
  if (!surface) return null;
  const s = surface.toLowerCase();
  if (s.includes('hard')) return 'Hard';
  if (s.includes('clay') || s.includes('terra')) return 'Clay';
  if (s.includes('grass') || s.includes('erba')) return 'Grass';
  if (s.includes('carpet')) return 'Carpet';
  return null;
};

// Calcola ELO-like probability basata su ranking
const calculateRankingProbability = (rankA, rankB) => {
  if (!rankA || !rankB) return 0.5;
  // Formula ELO-style: expected score based on ranking difference
  const K = 400; // Scaling factor
  const diff = rankB - rankA; // Positive = A is better ranked
  return 1 / (1 + Math.pow(10, -diff / K));
};

export default function QuotesTab({ 
  powerRankings = [], 
  eventInfo = {}, 
  statistics = null,
  matchSummary = null 
}) {
  const homeName = eventInfo?.home?.name || eventInfo?.home?.shortName || 'Home';
  const awayName = eventInfo?.away?.name || eventInfo?.away?.shortName || 'Away';
  const homeRanking = eventInfo?.home?.ranking || null;
  const awayRanking = eventInfo?.away?.ranking || null;
  
  // Superficie del match corrente
  const matchSurface = useMemo(() => {
    return normalizeSurface(
      eventInfo?.groundType || 
      eventInfo?.surface || 
      eventInfo?.tournament?.groundType ||
      matchSummary?.surface
    );
  }, [eventInfo, matchSummary]);
  
  // Formato del match (best-of-3 o best-of-5)
  const matchFormat = useMemo(() => {
    if (matchSummary?.format?.includes('5') || eventInfo?.bestOf === 5) return 'best_of_5';
    return 'best_of_3';
  }, [matchSummary, eventInfo]);

  // State per quote manuali Betfair
  const [betfairHomeOdds, setBetfairHomeOdds] = useState('');
  const [betfairAwayOdds, setBetfairAwayOdds] = useState('');
  
  // State per statistiche storiche dai DB
  const [homeHistoricalStats, setHomeHistoricalStats] = useState(null);
  const [awayHistoricalStats, setAwayHistoricalStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState({ home: false, away: false });

  // Fetch statistiche storiche dei giocatori
  useEffect(() => {
    const fetchPlayerStats = async (playerName, setStats, side) => {
      if (!playerName || playerName === 'Home' || playerName === 'Away') return;
      
      setLoadingStats(prev => ({ ...prev, [side]: true }));
      try {
        const response = await fetch(apiUrl(`/api/player/${encodeURIComponent(playerName)}/stats`));
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error(`Error fetching historical stats for ${playerName}:`, err);
      } finally {
        setLoadingStats(prev => ({ ...prev, [side]: false }));
      }
    };

    fetchPlayerStats(homeName, setHomeHistoricalStats, 'home');
    fetchPlayerStats(awayName, setAwayHistoricalStats, 'away');
  }, [homeName, awayName]);

  // ============================================================================
  // CALCOLO PROBABILITÀ AVANZATO
  // ============================================================================
  const estimatedProbabilities = useMemo(() => {
    let homeScore = 0;
    let awayScore = 0;
    let factors = [];
    let totalWeight = 0;

    // -------------------------------------------------------------------------
    // 1. WIN RATE STORICO GENERALE (peso: 25%)
    // -------------------------------------------------------------------------
    const homeWR = homeHistoricalStats?.overall?.win_rate;
    const awayWR = awayHistoricalStats?.overall?.win_rate;
    
    if (homeWR !== undefined && awayWR !== undefined) {
      const weight = WEIGHT_FACTORS.HISTORICAL_WIN_RATE;
      homeScore += homeWR * weight;
      awayScore += awayWR * weight;
      totalWeight += weight;
      
      const diff = ((homeWR - awayWR) * 100).toFixed(1);
      factors.push({
        name: 'Win Rate Storico',
        homeValue: `${(homeWR * 100).toFixed(1)}%`,
        awayValue: `${(awayWR * 100).toFixed(1)}%`,
        homeMatches: homeHistoricalStats?.total_matches || 0,
        awayMatches: awayHistoricalStats?.total_matches || 0,
        impact: diff > 0 ? `+${diff}% Home` : diff < 0 ? `${diff}% Home` : 'Pari',
        weight: '25%',
        category: 'historical'
      });
    }

    // -------------------------------------------------------------------------
    // 2. WIN RATE PER SUPERFICIE (peso: 20%)
    // -------------------------------------------------------------------------
    if (matchSurface) {
      const homeSurfaceWR = homeHistoricalStats?.surfaces?.[matchSurface]?.win_rate;
      const awaySurfaceWR = awayHistoricalStats?.surfaces?.[matchSurface]?.win_rate;
      const homeSurfaceMatches = homeHistoricalStats?.surfaces?.[matchSurface]?.matches || 0;
      const awaySurfaceMatches = awayHistoricalStats?.surfaces?.[matchSurface]?.matches || 0;
      
      if (homeSurfaceWR !== undefined && awaySurfaceWR !== undefined && 
          homeSurfaceMatches >= 2 && awaySurfaceMatches >= 2) {
        const weight = WEIGHT_FACTORS.SURFACE_WIN_RATE;
        homeScore += homeSurfaceWR * weight;
        awayScore += awaySurfaceWR * weight;
        totalWeight += weight;
        
        const diff = ((homeSurfaceWR - awaySurfaceWR) * 100).toFixed(1);
        factors.push({
          name: `Win Rate ${matchSurface}`,
          homeValue: `${(homeSurfaceWR * 100).toFixed(0)}% (${homeSurfaceMatches}m)`,
          awayValue: `${(awaySurfaceWR * 100).toFixed(0)}% (${awaySurfaceMatches}m)`,
          impact: diff > 0 ? `+${diff}% Home` : diff < 0 ? `${diff}% Home` : 'Pari',
          weight: '20%',
          category: 'surface'
        });
      }
    }

    // -------------------------------------------------------------------------
    // 3. WIN RATE PER FORMATO Bo3/Bo5 (peso: 10%)
    // -------------------------------------------------------------------------
    const homeFormatWR = homeHistoricalStats?.formats?.[matchFormat]?.win_rate;
    const awayFormatWR = awayHistoricalStats?.formats?.[matchFormat]?.win_rate;
    
    if (homeFormatWR !== undefined && awayFormatWR !== undefined) {
      const weight = WEIGHT_FACTORS.FORMAT_WIN_RATE;
      homeScore += homeFormatWR * weight;
      awayScore += awayFormatWR * weight;
      totalWeight += weight;
      
      const diff = ((homeFormatWR - awayFormatWR) * 100).toFixed(1);
      const formatLabel = matchFormat === 'best_of_5' ? 'Best of 5' : 'Best of 3';
      factors.push({
        name: `Win Rate ${formatLabel}`,
        homeValue: `${(homeFormatWR * 100).toFixed(0)}%`,
        awayValue: `${(awayFormatWR * 100).toFixed(0)}%`,
        impact: diff > 0 ? `+${diff}% Home` : diff < 0 ? `${diff}% Home` : 'Pari',
        weight: '10%',
        category: 'format'
      });
    }

    // -------------------------------------------------------------------------
    // 4. RANKING (peso: 15%)
    // -------------------------------------------------------------------------
    if (homeRanking && awayRanking) {
      const weight = WEIGHT_FACTORS.RANKING;
      const rankProb = calculateRankingProbability(homeRanking, awayRanking);
      homeScore += rankProb * weight;
      awayScore += (1 - rankProb) * weight;
      totalWeight += weight;
      
      const rankDiff = awayRanking - homeRanking;
      let impactText = 'Neutro';
      if (rankDiff > 50) impactText = `+${(rankProb * 100 - 50).toFixed(0)}% Home`;
      else if (rankDiff < -50) impactText = `${(rankProb * 100 - 50).toFixed(0)}% Home`;
      
      factors.push({
        name: 'Ranking ATP/WTA',
        homeValue: `#${homeRanking}`,
        awayValue: `#${awayRanking}`,
        impact: impactText,
        weight: '15%',
        category: 'ranking'
      });
    }

    // -------------------------------------------------------------------------
    // 5. MOMENTUM LIVE NEL MATCH (peso: 15%)
    // -------------------------------------------------------------------------
    if (powerRankings && powerRankings.length > 0) {
      const weight = WEIGHT_FACTORS.MOMENTUM_LIVE;
      const lastGames = powerRankings.slice(-5);
      const avgMomentum = lastGames.reduce((sum, g) => sum + (g.value || 0), 0) / lastGames.length;
      
      // Normalizza momentum da -100/+100 a 0-1
      const normalizedMomentum = (avgMomentum + 100) / 200;
      homeScore += normalizedMomentum * weight;
      awayScore += (1 - normalizedMomentum) * weight;
      totalWeight += weight;
      
      factors.push({
        name: 'Momentum Live',
        homeValue: avgMomentum > 0 ? `+${avgMomentum.toFixed(0)}` : avgMomentum.toFixed(0),
        awayValue: avgMomentum < 0 ? `+${Math.abs(avgMomentum).toFixed(0)}` : `-${avgMomentum.toFixed(0)}`,
        impact: avgMomentum > 15 ? `+${(normalizedMomentum * 100 - 50).toFixed(0)}% Home` : 
                avgMomentum < -15 ? `${(normalizedMomentum * 100 - 50).toFixed(0)}% Home` : 'Neutro',
        weight: '15%',
        category: 'live'
      });

      // Break count (sub-factor del momentum)
      const homeBreaks = powerRankings.filter(g => g.breakOccurred && g.value > 0).length;
      const awayBreaks = powerRankings.filter(g => g.breakOccurred && g.value < 0).length;
      
      if (homeBreaks > 0 || awayBreaks > 0) {
        factors.push({
          name: 'Break Effettuati',
          homeValue: homeBreaks.toString(),
          awayValue: awayBreaks.toString(),
          impact: homeBreaks > awayBreaks ? `+${(homeBreaks - awayBreaks) * 3}% Home` : 
                  awayBreaks > homeBreaks ? `-${(awayBreaks - homeBreaks) * 3}% Home` : 'Pari',
          weight: '(incluso)',
          category: 'live'
        });
      }
    }

    // -------------------------------------------------------------------------
    // 6. COMEBACK RATE (peso: 10%)
    // -------------------------------------------------------------------------
    const homeComebackRate = homeHistoricalStats?.overall?.comeback_rate;
    const awayComebackRate = awayHistoricalStats?.overall?.comeback_rate;
    
    if (homeComebackRate !== undefined && awayComebackRate !== undefined) {
      const weight = WEIGHT_FACTORS.COMEBACK_RATE;
      homeScore += homeComebackRate * weight;
      awayScore += awayComebackRate * weight;
      totalWeight += weight;
      
      const diff = ((homeComebackRate - awayComebackRate) * 100).toFixed(1);
      factors.push({
        name: 'Comeback Rate',
        homeValue: `${(homeComebackRate * 100).toFixed(0)}%`,
        awayValue: `${(awayComebackRate * 100).toFixed(0)}%`,
        impact: Math.abs(parseFloat(diff)) > 10 ? 
                (diff > 0 ? `+${diff}% Home` : `${diff}% Home`) : 'Simile',
        weight: '10%',
        category: 'historical'
      });
    }

    // -------------------------------------------------------------------------
    // 7. ESPERIENZA (peso: 5%)
    // -------------------------------------------------------------------------
    const homeMatches = homeHistoricalStats?.total_matches || 0;
    const awayMatches = awayHistoricalStats?.total_matches || 0;
    
    if (homeMatches > 0 && awayMatches > 0) {
      const weight = WEIGHT_FACTORS.EXPERIENCE;
      const totalMatches = homeMatches + awayMatches;
      homeScore += (homeMatches / totalMatches) * weight;
      awayScore += (awayMatches / totalMatches) * weight;
      totalWeight += weight;
      
      factors.push({
        name: 'Esperienza (DB)',
        homeValue: `${homeMatches} match`,
        awayValue: `${awayMatches} match`,
        impact: homeMatches > awayMatches * 1.5 ? '+Exp Home' : 
                awayMatches > homeMatches * 1.5 ? '+Exp Away' : 'Simile',
        weight: '5%',
        category: 'experience'
      });
    }

    // -------------------------------------------------------------------------
    // 8. SET VINTI NEL MATCH (bonus live)
    // -------------------------------------------------------------------------
    if (matchSummary?.sets && Array.isArray(matchSummary.sets)) {
      const homeSets = matchSummary.sets.filter(s => s.homeScore > s.awayScore).length;
      const awaySets = matchSummary.sets.filter(s => s.awayScore > s.homeScore).length;
      
      if (homeSets !== awaySets) {
        const setBonus = (homeSets - awaySets) * 0.08;
        homeScore += setBonus > 0 ? setBonus : 0;
        awayScore += setBonus < 0 ? Math.abs(setBonus) : 0;
        
        factors.push({
          name: 'Set Vinti (live)',
          homeValue: homeSets.toString(),
          awayValue: awaySets.toString(),
          impact: `${setBonus > 0 ? '+' : ''}${(setBonus * 100).toFixed(0)}% Home`,
          weight: 'bonus',
          category: 'live'
        });
      }
    }

    // -------------------------------------------------------------------------
    // CALCOLO FINALE
    // -------------------------------------------------------------------------
    let homeProb, awayProb;
    
    if (totalWeight > 0) {
      // Normalizza i punteggi
      const totalScore = homeScore + awayScore;
      if (totalScore > 0) {
        homeProb = (homeScore / totalScore) * 100;
        awayProb = (awayScore / totalScore) * 100;
      } else {
        homeProb = 50;
        awayProb = 50;
      }
    } else {
      // Fallback: usa solo ranking se disponibile
      if (homeRanking && awayRanking) {
        const rankProb = calculateRankingProbability(homeRanking, awayRanking);
        homeProb = rankProb * 100;
        awayProb = (1 - rankProb) * 100;
      } else {
        homeProb = 50;
        awayProb = 50;
      }
    }

    // Limita probabilità tra 5% e 95%
    homeProb = Math.max(5, Math.min(95, homeProb));
    awayProb = 100 - homeProb;

    // Confidence: quanto siamo sicuri del calcolo (basato su dati disponibili)
    const confidence = Math.min(100, 
      (homeHistoricalStats ? 25 : 0) + 
      (awayHistoricalStats ? 25 : 0) +
      (homeRanking && awayRanking ? 20 : 0) +
      (powerRankings.length > 3 ? 20 : powerRankings.length > 0 ? 10 : 0) +
      (matchSurface ? 10 : 0)
    );

    return {
      home: homeProb,
      away: awayProb,
      factors,
      confidence,
      dataQuality: confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low',
      hasHistoricalData: !!(homeHistoricalStats || awayHistoricalStats)
    };
  }, [
    powerRankings, eventInfo, matchSummary, homeRanking, awayRanking,
    homeHistoricalStats, awayHistoricalStats, matchSurface, matchFormat
  ]);

  // Converti probabilità in quote decimali
  const estimatedOdds = useMemo(() => {
    const homeOdds = (100 / estimatedProbabilities.home).toFixed(2);
    const awayOdds = (100 / estimatedProbabilities.away).toFixed(2);
    return { home: parseFloat(homeOdds), away: parseFloat(awayOdds) };
  }, [estimatedProbabilities]);

  // Analizza VALUE comparing con quote Betfair
  const valueAnalysis = useMemo(() => {
    const betfairHome = parseFloat(betfairHomeOdds);
    const betfairAway = parseFloat(betfairAwayOdds);

    const result = {
      home: { signal: 'neutral', message: 'Inserisci quota Betfair', value: 0, recommendation: '' },
      away: { signal: 'neutral', message: 'Inserisci quota Betfair', value: 0, recommendation: '' }
    };

    if (betfairHome && betfairHome > 1) {
      const impliedProb = 100 / betfairHome;
      const edge = estimatedProbabilities.home - impliedProb;
      result.home.value = edge;

      if (edge > 8) {
        result.home.signal = 'buy';
        result.home.message = `VALUE! +${edge.toFixed(1)}% edge`;
        result.home.recommendation = `BACK ${homeName} - La quota ${betfairHome} sottovaluta il giocatore`;
      } else if (edge > 3) {
        result.home.signal = 'watch';
        result.home.message = `Leggero value +${edge.toFixed(1)}%`;
        result.home.recommendation = `Possibile BACK - Monitorare il momentum`;
      } else if (edge < -8) {
        result.home.signal = 'sell';
        result.home.message = `OVERPRICED ${edge.toFixed(1)}%`;
        result.home.recommendation = `LAY ${homeName} - La quota ${betfairHome} è troppo bassa`;
      } else if (edge < -3) {
        result.home.signal = 'caution';
        result.home.message = `Leggermente overpriced ${edge.toFixed(1)}%`;
        result.home.recommendation = `Evita BACK - Aspetta quota migliore`;
      } else {
        result.home.signal = 'neutral';
        result.home.message = `Fair value (${edge.toFixed(1)}%)`;
        result.home.recommendation = 'Quota in linea con le probabilità';
      }
    }

    if (betfairAway && betfairAway > 1) {
      const impliedProb = 100 / betfairAway;
      const edge = estimatedProbabilities.away - impliedProb;
      result.away.value = edge;

      if (edge > 8) {
        result.away.signal = 'buy';
        result.away.message = `VALUE! +${edge.toFixed(1)}% edge`;
        result.away.recommendation = `BACK ${awayName} - La quota ${betfairAway} sottovaluta il giocatore`;
      } else if (edge > 3) {
        result.away.signal = 'watch';
        result.away.message = `Leggero value +${edge.toFixed(1)}%`;
        result.away.recommendation = `Possibile BACK - Monitorare il momentum`;
      } else if (edge < -8) {
        result.away.signal = 'sell';
        result.away.message = `OVERPRICED ${edge.toFixed(1)}%`;
        result.away.recommendation = `LAY ${awayName} - La quota ${betfairAway} è troppo bassa`;
      } else if (edge < -3) {
        result.away.signal = 'caution';
        result.away.message = `Leggermente overpriced ${edge.toFixed(1)}%`;
        result.away.recommendation = `Evita BACK - Aspetta quota migliore`;
      } else {
        result.away.signal = 'neutral';
        result.away.message = `Fair value (${edge.toFixed(1)}%)`;
        result.away.recommendation = 'Quota in linea con le probabilità';
      }
    }

    return result;
  }, [betfairHomeOdds, betfairAwayOdds, estimatedProbabilities, homeName, awayName]);

  // Funzione per ottenere colore/icona semaforo
  const getSignalStyle = (signal) => {
    switch (signal) {
      case 'buy':
        return { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', color: '#34d399', icon: <Circle size={14} weight="fill" style={{ color: '#22c55e' }} />, label: 'COMPRA' };
      case 'watch':
        return { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', color: '#fbbf24', icon: <Circle size={14} weight="fill" style={{ color: '#eab308' }} />, label: 'MONITORA' };
      case 'sell':
        return { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', color: '#f87171', icon: <Circle size={14} weight="fill" style={{ color: '#ef4444' }} />, label: 'VENDI/LAY' };
      case 'caution':
        return { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', color: '#fb923c', icon: <Circle size={14} weight="fill" style={{ color: '#f97316' }} />, label: 'CAUTELA' };
      default:
        return { bg: 'rgba(30, 41, 59, 0.9)', border: 'rgba(255, 255, 255, 0.15)', color: '#8b95a5', icon: <Circle size={14} weight="fill" style={{ color: '#94a3b8' }} />, label: 'ATTENDI' };
    }
  };

  return (
    <div className="quotes-tab">
      {/* Header */}
      <div className="quotes-header">
        <h2 className="quotes-title">
          <span className="quotes-icon"><CurrencyDollar size={20} weight="duotone" /></span>
          Analisi Quote & Value Betting
        </h2>
        <p className="quotes-subtitle">
          Calcolo avanzato basato su statistiche storiche + dati live
        </p>
        {/* Data Quality Badge */}
        <div className="data-quality-badge">
          {loadingStats.home || loadingStats.away ? (
            <span className="quality-loading"><Hourglass size={14} weight="duotone" /> Caricamento dati storici...</span>
          ) : (
            <>
              <span className={`quality-indicator ${estimatedProbabilities.dataQuality}`}>
                <Circle size={10} weight="fill" style={{ color: estimatedProbabilities.dataQuality === 'high' ? '#22c55e' : estimatedProbabilities.dataQuality === 'medium' ? '#eab308' : '#f97316' }} />
                Affidabilità: {estimatedProbabilities.confidence}%
              </span>
              {matchSurface && <span className="surface-badge"><TennisBall size={12} weight="duotone" style={{ marginRight: 4 }} /> {matchSurface}</span>}
              {estimatedProbabilities.hasHistoricalData && (
                <span className="historical-badge"><ChartBar size={12} weight="duotone" style={{ marginRight: 4 }} /> Dati storici caricati</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Probabilità Stimate */}
      <section className="quotes-section">
        <h3 className="section-title">
          <span className="section-icon"><ChartBar size={18} weight="duotone" /></span>
          Probabilità Stimate (Modello Avanzato)
        </h3>
        
        <div className="probability-display">
          <div className="prob-player home">
            <span className="prob-name">{homeName}</span>
            <div className="prob-bar-container">
              <div 
                className="prob-bar home" 
                style={{ width: `${estimatedProbabilities.home}%` }}
              />
            </div>
            <span className="prob-value">{estimatedProbabilities.home.toFixed(1)}%</span>
            <span className="prob-odds">@ {estimatedOdds.home}</span>
          </div>
          
          <div className="prob-player away">
            <span className="prob-name">{awayName}</span>
            <div className="prob-bar-container">
              <div 
                className="prob-bar away" 
                style={{ width: `${estimatedProbabilities.away}%` }}
              />
            </div>
            <span className="prob-value">{estimatedProbabilities.away.toFixed(1)}%</span>
            <span className="prob-odds">@ {estimatedOdds.away}</span>
          </div>
        </div>

        {/* Fattori raggruppati per categoria */}
        <div className="factors-list">
          <h4 className="factors-title">
            Fattori considerati ({estimatedProbabilities.factors.length}):
          </h4>
          
          {/* Storico */}
          {estimatedProbabilities.factors.filter(f => f.category === 'historical').length > 0 && (
            <div className="factors-category">
              <span className="category-label"><ChartBar size={14} weight="duotone" style={{ marginRight: 4 }} /> Dati Storici</span>
              {estimatedProbabilities.factors.filter(f => f.category === 'historical').map((factor, idx) => (
                <div key={`hist-${idx}`} className="factor-row">
                  <span className="factor-name">{factor.name}</span>
                  <span className="factor-values">
                    <span className="factor-home">{factor.homeValue}</span>
                    <span className="factor-vs">vs</span>
                    <span className="factor-away">{factor.awayValue}</span>
                  </span>
                  <span className={`factor-impact ${factor.impact.includes('+') ? 'positive' : factor.impact.includes('-') ? 'negative' : ''}`}>
                    {factor.impact}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Superficie e Formato */}
          {estimatedProbabilities.factors.filter(f => f.category === 'surface' || f.category === 'format').length > 0 && (
            <div className="factors-category">
              <span className="category-label"><TennisBall size={14} weight="duotone" style={{ marginRight: 4 }} /> Superficie & Formato</span>
              {estimatedProbabilities.factors.filter(f => f.category === 'surface' || f.category === 'format').map((factor, idx) => (
                <div key={`surf-${idx}`} className="factor-row">
                  <span className="factor-name">{factor.name}</span>
                  <span className="factor-values">
                    <span className="factor-home">{factor.homeValue}</span>
                    <span className="factor-vs">vs</span>
                    <span className="factor-away">{factor.awayValue}</span>
                  </span>
                  <span className={`factor-impact ${factor.impact.includes('+') ? 'positive' : factor.impact.includes('-') ? 'negative' : ''}`}>
                    {factor.impact}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Ranking */}
          {estimatedProbabilities.factors.filter(f => f.category === 'ranking').map((factor, idx) => (
            <div key={`rank-${idx}`} className="factor-row highlighted">
              <span className="factor-name">{factor.name}</span>
              <span className="factor-values">
                <span className="factor-home">{factor.homeValue}</span>
                <span className="factor-vs">vs</span>
                <span className="factor-away">{factor.awayValue}</span>
              </span>
              <span className={`factor-impact ${factor.impact.includes('+') ? 'positive' : factor.impact.includes('-') ? 'negative' : ''}`}>
                {factor.impact}
              </span>
            </div>
          ))}

          {/* Live */}
          {estimatedProbabilities.factors.filter(f => f.category === 'live').length > 0 && (
            <div className="factors-category live">
              <span className="category-label"><Lightning size={14} weight="duotone" style={{ marginRight: 4 }} /> Dati Live Match</span>
              {estimatedProbabilities.factors.filter(f => f.category === 'live').map((factor, idx) => (
                <div key={`live-${idx}`} className="factor-row">
                  <span className="factor-name">{factor.name}</span>
                  <span className="factor-values">
                    <span className="factor-home">{factor.homeValue}</span>
                    <span className="factor-vs">vs</span>
                    <span className="factor-away">{factor.awayValue}</span>
                  </span>
                  <span className={`factor-impact ${factor.impact.includes('+') ? 'positive' : factor.impact.includes('-') ? 'negative' : ''}`}>
                    {factor.impact}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Experience */}
          {estimatedProbabilities.factors.filter(f => f.category === 'experience').map((factor, idx) => (
            <div key={`exp-${idx}`} className="factor-row subtle">
              <span className="factor-name">{factor.name}</span>
              <span className="factor-values">
                <span className="factor-home">{factor.homeValue}</span>
                <span className="factor-vs">vs</span>
                <span className="factor-away">{factor.awayValue}</span>
              </span>
              <span className={`factor-impact`}>{factor.impact}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Input Quote Betfair */}
      <section className="quotes-section">
        <h3 className="section-title">
          <span className="section-icon"><Target size={18} weight="duotone" /></span>
          Quote Betfair (inserisci manualmente)
        </h3>
        
        <div className="betfair-inputs">
          <div className="betfair-input-group home">
            <label>{homeName}</label>
            <input
              type="number"
              step="0.01"
              min="1.01"
              placeholder="Es: 1.85"
              value={betfairHomeOdds}
              onChange={(e) => setBetfairHomeOdds(e.target.value)}
            />
          </div>
          
          <div className="betfair-input-group away">
            <label>{awayName}</label>
            <input
              type="number"
              step="0.01"
              min="1.01"
              placeholder="Es: 2.10"
              value={betfairAwayOdds}
              onChange={(e) => setBetfairAwayOdds(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Semaforo VALUE */}
      <section className="quotes-section signals-section">
        <h3 className="section-title">
          <span className="section-icon"><ChartLineUp size={18} weight="duotone" /></span>
          Segnali VALUE
        </h3>
        
        <div className="value-signals">
          {/* Home Signal */}
          <div 
            className="signal-card"
            style={{ 
              background: getSignalStyle(valueAnalysis.home.signal).bg,
              borderColor: getSignalStyle(valueAnalysis.home.signal).border
            }}
          >
            <div className="signal-header">
              <span className="signal-player">{homeName}</span>
              <span className="signal-icon">{getSignalStyle(valueAnalysis.home.signal).icon}</span>
            </div>
            <div 
              className="signal-label"
              style={{ color: getSignalStyle(valueAnalysis.home.signal).color }}
            >
              {getSignalStyle(valueAnalysis.home.signal).label}
            </div>
            <div className="signal-message">{valueAnalysis.home.message}</div>
            {valueAnalysis.home.recommendation && (
              <div className="signal-recommendation">
                <Lightbulb size={14} weight="duotone" style={{ marginRight: 4 }} /> {valueAnalysis.home.recommendation}
              </div>
            )}
            {betfairHomeOdds && (
              <div className="signal-comparison">
                <span>Betfair: <strong>{betfairHomeOdds}</strong></span>
                <span>vs</span>
                <span>Stimata: <strong>{estimatedOdds.home}</strong></span>
              </div>
            )}
          </div>

          {/* Away Signal */}
          <div 
            className="signal-card"
            style={{ 
              background: getSignalStyle(valueAnalysis.away.signal).bg,
              borderColor: getSignalStyle(valueAnalysis.away.signal).border
            }}
          >
            <div className="signal-header">
              <span className="signal-player">{awayName}</span>
              <span className="signal-icon">{getSignalStyle(valueAnalysis.away.signal).icon}</span>
            </div>
            <div 
              className="signal-label"
              style={{ color: getSignalStyle(valueAnalysis.away.signal).color }}
            >
              {getSignalStyle(valueAnalysis.away.signal).label}
            </div>
            <div className="signal-message">{valueAnalysis.away.message}</div>
            {valueAnalysis.away.recommendation && (
              <div className="signal-recommendation">
                <Lightbulb size={14} weight="duotone" style={{ marginRight: 4 }} /> {valueAnalysis.away.recommendation}
              </div>
            )}
            {betfairAwayOdds && (
              <div className="signal-comparison">
                <span>Betfair: <strong>{betfairAwayOdds}</strong></span>
                <span>vs</span>
                <span>Stimata: <strong>{estimatedOdds.away}</strong></span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Legenda */}
      <section className="quotes-legend">
        <h4>Legenda Segnali:</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-icon"><Circle size={12} weight="fill" style={{ color: '#22c55e' }} /></span>
            <span><strong>COMPRA</strong> - Value &gt; 8%: quota sottovalutata, BACK consigliato</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon"><Circle size={12} weight="fill" style={{ color: '#eab308' }} /></span>
            <span><strong>MONITORA</strong> - Value 3-8%: possibile opportunità, osservare</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon"><Circle size={12} weight="fill" style={{ color: '#f97316' }} /></span>
            <span><strong>CAUTELA</strong> - Value negativo lieve: evita BACK</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon"><Circle size={12} weight="fill" style={{ color: '#ef4444' }} /></span>
            <span><strong>VENDI/LAY</strong> - Overpriced &gt; 8%: considera LAY</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon"><Circle size={12} weight="fill" style={{ color: '#94a3b8' }} /></span>
            <span><strong>ATTENDI</strong> - Fair value: nessuna azione raccomandata</span>
          </div>
        </div>
      </section>
    </div>
  );
}
