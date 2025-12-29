/**
 * 🎯 STRATEGY ENGINE
 *
 * Motore centrale per la valutazione delle strategie di trading.
 * Consuma solo FEATURES, produce solo SIGNALS.
 *
 * Ref: docs/filosofie/FILOSOFIA_STATS_V3.md
 * Ref: docs/filosofie/FILOSOFIA_FRONTEND.md (sezione Strategie)
 *
 * @module strategyEngine
 */

// ============================================
// VERSION (FILOSOFIA_LINEAGE_VERSIONING compliance)
// ============================================
const STRATEGY_ENGINE_VERSION = 'v1.1.0';

// ============================================
// PRICE THRESHOLDS (FILOSOFIA_RISK_BANKROLL: RULE_PRICE_ACCEPTABLE)
// ============================================
const PRICE_THRESHOLDS = {
  MIN_LAY_PRICE: 1.1, // Minimum acceptable lay price
  MAX_LAY_PRICE: 5.0, // Maximum acceptable lay price
  MIN_BACK_PRICE: 1.2, // Minimum acceptable back price
  MAX_BACK_PRICE: 10.0, // Maximum acceptable back price
};

/**
 * Check if price is acceptable for given action
 * FILOSOFIA_RISK_BANKROLL: RULE_PRICE_ACCEPTABLE
 */
function isPriceAcceptable(price, action) {
  if (typeof price !== 'number' || price <= 1) return false;

  if (action === 'LAY') {
    return price >= PRICE_THRESHOLDS.MIN_LAY_PRICE && price <= PRICE_THRESHOLDS.MAX_LAY_PRICE;
  } else if (action === 'BACK') {
    return price >= PRICE_THRESHOLDS.MIN_BACK_PRICE && price <= PRICE_THRESHOLDS.MAX_BACK_PRICE;
  }
  return true;
}

// ============================================
// STRATEGY SIGNAL SCHEMA
// ============================================
/**
 * @typedef {Object} StrategySignal
 * @property {string} id - ID univoco strategia
 * @property {string} name - Nome visualizzabile
 * @property {'READY'|'WATCH'|'OFF'} status - Stato semaforico
 * @property {'BACK'|'LAY'|null} action - Azione suggerita
 * @property {string|null} target - Giocatore target
 * @property {number} confidence - Confidenza 0-1
 * @property {string} entryRule - Regola di ingresso
 * @property {string} exitRule - Regola di uscita
 * @property {string[]} reasons - Motivazioni umane
 * @property {Object} conditions - Condizioni verificate
 */

// ============================================
// STRATEGY IMPLEMENTATIONS
// ============================================

/**
 * Valuta tutte le strategie per un match
 * @param {Object} matchData - Dati match con features già calcolate
 * @returns {StrategySignal[]} Array di segnali strategia
 */
function evaluateAll(matchData) {
  // Per match finiti, skippa il check di staleness (analisi storica)
  const matchStatus = matchData?.status || matchData?.match?.status;
  const isFinished = matchStatus === 'finished' || matchStatus === 'ended';

  if (!isFinished) {
    // FILOSOFIA_TEMPORAL: UNKNOWN_TIME_NO_DECISION - verify timestamp before decisions
    const dataTimestamp = matchData?.meta?.as_of_time || matchData?.features?.as_of_time;
    const now = Date.now();
    const dataAge = dataTimestamp ? now - new Date(dataTimestamp).getTime() : Infinity;
    const MAX_DATA_AGE_MS = 5 * 60 * 1000; // 5 minutes

    if (dataAge > MAX_DATA_AGE_MS) {
      console.warn(
        `⚠️ StrategyEngine: Data too stale (${Math.round(dataAge / 1000)}s old), skipping evaluation`
      );
      return []; // Return empty - stale data should not produce decisions
    }
  }

  // FILOSOFIA_CONCEPT_CHECKS: RULE_NO_QUARANTINED_DATA - verify quality before decisions
  const dataQuality = matchData?.dataQuality?.score || matchData?.dataQuality || 0;
  const MIN_QUALITY_FOR_DECISION = 40;

  if (typeof dataQuality === 'number' && dataQuality < MIN_QUALITY_FOR_DECISION) {
    console.warn(`⚠️ StrategyEngine: Data quality too low (${dataQuality}%), skipping evaluation`);
    return []; // Return empty - low quality data should not produce decisions
  }

  const strategies = [
    evaluateLayWinner(matchData),
    evaluateBancaServizio(matchData),
    evaluateSuperBreak(matchData),
    evaluateTiebreakSpecialist(matchData),
    evaluateMomentumSwing(matchData),
  ];

  return strategies.filter(Boolean);
}

/**
 * LAY THE WINNER
 *
 * Strategia: Quando il favorito (chi ha vinto il 1° set) inizia a perdere momentum,
 * si banca perché spesso chi perde il primo set recupera.
 *
 * Condizioni READY:
 * - Favorito ha vinto 1° set
 * - Quota winner < 1.60
 * - Momentum contro favorito (PR < 0 per home favorite, > 0 per away)
 * - Volatility > 40 (match instabile)
 */
function evaluateLayWinner(matchData) {
  const { features = {}, score = {}, odds = {}, players = {} } = matchData;
  const { volatility = 50, dominance = 50, dominantPlayer } = features;

  const reasons = [];
  const conditions = {
    set1Winner: false,
    favoriteLeading: false,
    lowOdds: false,
    momentumShift: false,
    highVolatility: false,
  };

  // Determina chi ha vinto il primo set
  const sets = score.sets || [];
  const set1 = sets[0];
  let set1Winner = null;

  if (set1) {
    if ((set1.home || 0) > (set1.away || 0)) set1Winner = 'home';
    else if ((set1.away || 0) > (set1.home || 0)) set1Winner = 'away';
    conditions.set1Winner = !!set1Winner;
  }

  // Check odds del favorito
  const winnerOdds = odds.matchWinner?.current || 2.0;
  conditions.lowOdds = winnerOdds < 1.6;

  // Check volatility
  conditions.highVolatility = volatility > 40;

  // Check momentum shift (if favorite is losing momentum)
  if (set1Winner === 'home' && dominance < 45) {
    conditions.momentumShift = true;
    reasons.push('Favorito (home) sta perdendo momentum');
  } else if (set1Winner === 'away' && dominance > 55) {
    conditions.momentumShift = true;
    reasons.push('Favorito (away) sta perdendo momentum');
  }

  // Calcola status
  let status = 'OFF';
  let confidence = 0;
  let action = null;
  let target = null;

  const metConditions = Object.values(conditions).filter(Boolean).length;

  // FILOSOFIA_RISK_BANKROLL: Calculate edge before decision
  const impliedProb = winnerOdds > 1 ? 1 / winnerOdds : 0;
  const modelProb = metConditions >= 3 ? 0.6 : 0.4; // Estimated model probability
  const edge = modelProb - impliedProb;

  // FILOSOFIA_RISK_BANKROLL: RULE_EDGE_POSITIVE - only READY if edge > 0
  // FILOSOFIA_RISK_BANKROLL: RULE_PRICE_ACCEPTABLE - verify price is in acceptable range
  const priceAcceptable = isPriceAcceptable(winnerOdds, 'LAY');

  if (metConditions >= 4 && edge > 0 && priceAcceptable) {
    status = 'READY';
    confidence = 0.75;
    action = 'LAY';
    target = set1Winner;
    reasons.push('Tutte le condizioni soddisfatte - LAY il vincitore del 1° set');
    reasons.push(`Edge positivo: ${(edge * 100).toFixed(1)}%`);
  } else if (metConditions >= 2) {
    status = 'WATCH';
    confidence = 0.4;
    reasons.push(`${metConditions}/4 condizioni soddisfatte`);
    if (edge <= 0) reasons.push('Edge non sufficiente');
  }

  return {
    id: 'lay-the-winner',
    name: 'Lay The Winner',
    status,
    action,
    target,
    confidence,
    entryRule: 'Favorito perde momentum dopo aver vinto 1° set, quota < 1.60',
    exitRule: 'Break favorito o fine game',
    reasons,
    conditions,
  };
}

/**
 * BANCA SERVIZIO
 *
 * Strategia: Banca il server quando è sotto pressione nel game.
 *
 * Condizioni READY:
 * - Punteggio game sfavorevole (0-30, 0-40, 15-40)
 * - Pressure index alto
 * - Break probability > 40%
 * - Server con % secondo servizio bassa
 */
function evaluateBancaServizio(matchData) {
  const { features = {}, score = {}, statistics = {} } = matchData;
  const { pressure = 50, breakProbability = 25, serveDominance = 50 } = features;

  const reasons = [];
  const conditions = {
    unfavorableScore: false,
    highPressure: false,
    highBreakProb: false,
    weakSecondServe: false,
  };

  // Check game score
  const gameScore = score.game;
  if (gameScore) {
    const unfavorable = ['0-30', '0-40', '15-40', '30-40'].includes(gameScore);
    conditions.unfavorableScore = unfavorable;
    if (unfavorable) reasons.push(`Punteggio sfavorevole: ${gameScore}`);
  }

  // Check pressure
  conditions.highPressure = pressure > 60;
  if (conditions.highPressure) reasons.push(`Pressione alta: ${pressure}%`);

  // Check break probability
  conditions.highBreakProb = breakProbability > 40;
  if (conditions.highBreakProb) reasons.push(`Break probability: ${breakProbability}%`);

  // Check second serve weakness
  conditions.weakSecondServe = serveDominance < 40;
  if (conditions.weakSecondServe) reasons.push('Secondo servizio debole');

  // Calcola status
  let status = 'OFF';
  let confidence = 0;
  let action = null;

  const metConditions = Object.values(conditions).filter(Boolean).length;

  if (metConditions >= 3) {
    status = 'READY';
    confidence = 0.7 + (metConditions === 4 ? 0.15 : 0);
    action = 'LAY';
    reasons.push('Condizioni ottimali per BANCA SERVIZIO');
  } else if (metConditions >= 2) {
    status = 'WATCH';
    confidence = 0.35;
  }

  return {
    id: 'banca-servizio',
    name: 'Banca Servizio',
    status,
    action,
    target: features.serverPlayerId || null,
    confidence,
    entryRule: 'Server sotto pressione (0-30, 0-40, 15-40) + break prob > 40%',
    exitRule: 'Break o hold',
    reasons,
    conditions,
  };
}

/**
 * SUPER BREAK
 *
 * Strategia: Punta sul break quando il giocatore dominante deve ricevere.
 *
 * Condizioni READY:
 * - Dominance > 60% per un giocatore
 * - Il dominante NON sta servendo (sta per ricevere)
 * - Momentum trend favorevole al dominante
 * - Volatility > 30
 */
function evaluateSuperBreak(matchData) {
  const { features = {} } = matchData;
  const {
    dominance = 50,
    dominantPlayer,
    serverPlayerId,
    volatility = 50,
    breakProbability = 25,
    momentum = {},
  } = features;

  const reasons = [];
  const conditions = {
    strongDominance: false,
    dominantReceiving: false,
    favorableMomentum: false,
    volatileMatch: false,
  };

  // Check dominance
  const isDominant = dominance > 65 || dominance < 35;
  conditions.strongDominance = isDominant;
  if (isDominant) {
    reasons.push(`Dominance: ${dominance}% (${dominantPlayer || 'TBD'} controlla)`);
  }

  // Check if dominant player is receiving
  if (dominantPlayer && serverPlayerId) {
    conditions.dominantReceiving = dominantPlayer !== serverPlayerId;
    if (conditions.dominantReceiving) {
      reasons.push('Giocatore dominante in risposta');
    }
  }

  // Check momentum trend
  const trend = momentum.trend || 'stable';
  const favorableTrend =
    (dominantPlayer === 'home' && trend === 'home_rising') ||
    (dominantPlayer === 'away' && trend === 'away_rising');
  conditions.favorableMomentum = favorableTrend;
  if (favorableTrend) reasons.push(`Momentum in crescita per ${dominantPlayer}`);

  // Check volatility
  conditions.volatileMatch = volatility > 30;

  // Calcola status
  let status = 'OFF';
  let confidence = 0;
  let action = null;

  const metConditions = Object.values(conditions).filter(Boolean).length;

  if (metConditions >= 3 && conditions.strongDominance && conditions.dominantReceiving) {
    status = 'READY';
    confidence = 0.65 + breakProbability / 200; // Break prob contribuisce
    action = 'BACK';
    reasons.push('SUPER BREAK: punta sul break del dominante');
  } else if (metConditions >= 2) {
    status = 'WATCH';
    confidence = 0.3;
  }

  return {
    id: 'super-break',
    name: 'Super Break',
    status,
    action,
    target: dominantPlayer,
    confidence,
    entryRule: 'Dominance > 60%, dominante in risposta, momentum favorevole',
    exitRule: 'Break o fine game',
    reasons,
    conditions,
  };
}

/**
 * TIEBREAK SPECIALIST
 *
 * Strategia: Nel tiebreak, banca chi ha servito peggio nel set.
 *
 * Condizioni READY:
 * - Set in corso a 6-6 o prossimo al tiebreak
 * - Differenza significativa in serve stats
 */
function evaluateTiebreakSpecialist(matchData) {
  const { features = {}, score = {}, statistics = {} } = matchData;

  const reasons = [];
  const conditions = {
    nearTiebreak: false,
    serveImbalance: false,
  };

  // Check se siamo vicini al tiebreak
  const sets = score.sets || [];
  const currentSet = sets[sets.length - 1];
  if (currentSet) {
    const { home = 0, away = 0 } = currentSet;
    const closeToTB = home >= 5 && away >= 5;
    const inTiebreak = home === 6 && away === 6;
    conditions.nearTiebreak = closeToTB || inTiebreak;
    if (inTiebreak) reasons.push('Tiebreak in corso!');
    else if (closeToTB) reasons.push(`Set ${home}-${away}, tiebreak probabile`);
  }

  // Check imbalance servizio
  const homeFirstServe = parseFloat(statistics.home?.firstServePointsWonPct) || 60;
  const awayFirstServe = parseFloat(statistics.away?.firstServePointsWonPct) || 60;
  const serveDiff = Math.abs(homeFirstServe - awayFirstServe);
  conditions.serveImbalance = serveDiff > 15;

  let weakerServer = null;
  if (conditions.serveImbalance) {
    weakerServer = homeFirstServe < awayFirstServe ? 'home' : 'away';
    reasons.push(`${weakerServer} ha servizio più debole (${serveDiff.toFixed(0)}% diff)`);
  }

  let status = 'OFF';
  let confidence = 0;
  let action = null;

  if (conditions.nearTiebreak && conditions.serveImbalance) {
    status = 'READY';
    confidence = 0.6;
    action = 'LAY';
    reasons.push('Banca il server più debole nel tiebreak');
  } else if (conditions.nearTiebreak) {
    status = 'WATCH';
    confidence = 0.25;
  }

  return {
    id: 'tiebreak-specialist',
    name: 'Tiebreak Specialist',
    status,
    action,
    target: weakerServer,
    confidence,
    entryRule: 'Set 6-6, giocatore con servizio più debole',
    exitRule: 'Fine tiebreak',
    reasons,
    conditions,
  };
}

/**
 * MOMENTUM SWING
 *
 * Strategia: Sfrutta i cambi di momentum improvvisi.
 *
 * Condizioni READY:
 * - Recent swing > 30 punti nel momentum
 * - Volatility alta
 * - Multiple breaks recenti
 */
function evaluateMomentumSwing(matchData) {
  const { features = {} } = matchData;
  const { momentum = {}, volatility = 50 } = features;

  const reasons = [];
  const conditions = {
    bigSwing: false,
    highVolatility: false,
    multipleBreaks: false,
  };

  // Check swing
  const recentSwing = momentum.recentSwing || 0;
  conditions.bigSwing = recentSwing > 30;
  if (conditions.bigSwing) reasons.push(`Swing di ${recentSwing} punti`);

  // Check volatility
  conditions.highVolatility = volatility > 60;
  if (conditions.highVolatility) reasons.push(`Volatilità alta: ${volatility}%`);

  // Check breaks
  const breakCount = momentum.breakCount || 0;
  conditions.multipleBreaks = breakCount >= 2;
  if (conditions.multipleBreaks) reasons.push(`${breakCount} break negli ultimi 10 game`);

  // Determina direzione del momentum
  const trend = momentum.trend || 'stable';
  const risingPlayer = trend === 'home_rising' ? 'home' : trend === 'away_rising' ? 'away' : null;

  let status = 'OFF';
  let confidence = 0;
  let action = null;

  const metConditions = Object.values(conditions).filter(Boolean).length;

  if (metConditions >= 2 && risingPlayer) {
    status = 'READY';
    confidence = 0.55;
    action = 'BACK';
    reasons.push(`BACK ${risingPlayer} - sta prendendo il controllo`);
  } else if (metConditions >= 1) {
    status = 'WATCH';
    confidence = 0.2;
  }

  return {
    id: 'momentum-swing',
    name: 'Momentum Swing',
    status,
    action,
    target: risingPlayer,
    confidence,
    entryRule: 'Swing > 30, volatilità > 60%, break multipli',
    exitRule: 'Stabilizzazione momentum',
    reasons,
    conditions,
  };
}

/**
 * Ottiene riepilogo conteggio strategie per stato
 * @param {StrategySignal[]} signals
 * @returns {{ready: number, watch: number, off: number}}
 */
function getSummary(signals) {
  return {
    ready: signals.filter((s) => s.status === 'READY').length,
    watch: signals.filter((s) => s.status === 'WATCH').length,
    off: signals.filter((s) => s.status === 'OFF').length,
  };
}

// ============================================
// EXPORTS (CommonJS for Node.js backend)
// ============================================
module.exports = {
  // Version (FILOSOFIA_LINEAGE_VERSIONING)
  STRATEGY_ENGINE_VERSION,
  // Constants (FILOSOFIA_RISK_BANKROLL)
  PRICE_THRESHOLDS,
  // Main
  evaluateAll,
  evaluateStrategies: evaluateAll, // alias per FILOSOFIA_RISK_BANKROLL
  evaluateLayWinner,
  evaluateBancaServizio,
  evaluateSuperBreak,
  evaluateTiebreakSpecialist,
  evaluateMomentumSwing,
  getSummary,
  // Helpers (FILOSOFIA_RISK_BANKROLL)
  isPriceAcceptable,
};
