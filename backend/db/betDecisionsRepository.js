/**
 * 📊 BET DECISIONS REPOSITORY
 * 
 * CRUD operations for bet_decisions table.
 * Handles audit logging of betting recommendations and placements.
 * 
 * Ref: docs/filosofie/FILOSOFIA_RISK_BANKROLL.md
 * 
 * @module betDecisionsRepository
 */

const { supabase, handleSupabaseError } = require('./supabase');

// ============================================================================
// VERSION
// ============================================================================
const BET_DECISIONS_REPO_VERSION = 'v1.0.0';

// ============================================================================
// DECISION TYPES
// ============================================================================
const DECISION_TYPES = {
  NO_BET: 'NO_BET',       // No value found
  WATCH: 'WATCH',         // Monitor, value potential
  RECOMMEND: 'RECOMMEND', // Value found, recommended bet
  PLACE: 'PLACE'          // Bet actually placed
};

// ============================================================================
// HELPER: Check Supabase availability
// ============================================================================
function checkSupabase() {
  if (!supabase) {
    console.warn('⚠️ Supabase not available for bet_decisions');
    return false;
  }
  return true;
}

// ============================================================================
// INSERT DECISION
// ============================================================================

/**
 * Insert a new bet decision record
 * 
 * @param {Object} decision - Decision data
 * @param {number} decision.matchId - Match ID
 * @param {string} decision.market - Market type (e.g., "match_winner")
 * @param {string} decision.selection - Selection (e.g., "home", "away")
 * @param {string} decision.decision - Decision type (NO_BET/WATCH/RECOMMEND/PLACE)
 * @param {Object} decision.versions - Version lineage object
 * @param {string} decision.asOfTime - Point-in-time timestamp
 * @param {Object} [decision.pricing] - Pricing info (pricesSeen, modelProb, edge)
 * @param {Object} [decision.stake] - Stake info (bankroll, recommended, final, kelly)
 * @param {Object} [decision.risk] - Risk engine output
 * @param {Object} [decision.bundleMeta] - Lightweight bundle meta snapshot
 * @param {string[]} [decision.reasonCodes] - Reason codes array
 * @param {number} [decision.confidence] - Decision confidence 0-1
 * @param {string} [decision.notes] - Manual notes
 * @returns {Object|null} Inserted record or null
 */
async function insertDecision(decision) {
  if (!checkSupabase()) return null;
  
  // Validate required fields
  if (!decision.matchId || !decision.market || !decision.selection || !decision.decision) {
    console.error('❌ Missing required fields for bet decision');
    return null;
  }
  
  if (!Object.values(DECISION_TYPES).includes(decision.decision)) {
    console.error(`❌ Invalid decision type: ${decision.decision}`);
    return null;
  }
  
  const now = new Date().toISOString();
  
  const record = {
    match_id: decision.matchId,
    player_a_id: decision.playerAId || null,
    player_b_id: decision.playerBId || null,
    tournament_id: decision.tournamentId || null,
    
    // FILOSOFIA_RISK_BANKROLL: strategy field for BetDecision
    strategy: decision.strategy || null,
    strategy_id: decision.strategyId || null,
    
    // Temporal (critical for audit)
    as_of_time: decision.asOfTime || now,
    generated_at: now,
    
    // Versions (critical for lineage)
    versions: decision.versions || {},
    
    // Market
    market: decision.market,
    selection: decision.selection,
    book_id: decision.bookId || null,
    
    // Pricing
    price_seen: decision.pricing?.priceSeen || null,
    price_min_acceptable: decision.pricing?.priceMin || null,
    implied_prob: decision.pricing?.impliedProb || null,
    model_prob: decision.pricing?.modelProb || null,
    edge: decision.pricing?.edge || null,
    
    // Stake
    bankroll: decision.stake?.bankroll || null,
    stake_recommended: decision.stake?.recommended || null,
    stake_final: decision.stake?.final || null,
    kelly_fraction: decision.stake?.kellyFraction || null,
    risk: decision.risk || null,
    
    // Decision
    decision: decision.decision,
    confidence: decision.confidence || null,
    reason_codes: decision.reasonCodes || [],
    
    // Meta snapshot
    bundle_meta: decision.bundleMeta || null,
    notes: decision.notes || null
  };
  
  const { data, error } = await supabase
    .from('bet_decisions')
    .insert(record)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error inserting bet decision:', error.message);
    return null;
  }
  
  console.log(`✅ Bet decision logged: match=${decision.matchId} market=${decision.market} decision=${decision.decision}`);
  return data;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * List decisions for a match
 * 
 * @param {number} matchId - Match ID
 * @param {Object} options - Query options
 * @param {number} [options.limit=50] - Max results
 * @param {string} [options.decision] - Filter by decision type
 * @returns {Array} List of decisions
 */
async function listByMatch(matchId, options = {}) {
  if (!checkSupabase()) return [];
  
  const { limit = 50, decision = null } = options;
  
  let query = supabase
    .from('bet_decisions')
    .select('*')
    .eq('match_id', matchId)
    .order('as_of_time', { ascending: false })
    .limit(limit);
  
  if (decision) {
    query = query.eq('decision', decision);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching bet decisions:', error.message);
    return [];
  }
  
  return data || [];
}

/**
 * List recent decisions
 * 
 * @param {Object} options - Query options
 * @param {number} [options.limit=100] - Max results
 * @param {string} [options.decision] - Filter by decision type
 * @param {string} [options.market] - Filter by market
 * @param {string} [options.since] - ISO timestamp, return only after this time
 * @returns {Array} List of decisions
 */
async function listRecent(options = {}) {
  if (!checkSupabase()) return [];
  
  const { limit = 100, decision = null, market = null, since = null } = options;
  
  let query = supabase
    .from('bet_decisions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (decision) {
    query = query.eq('decision', decision);
  }
  
  if (market) {
    query = query.eq('market', market);
  }
  
  if (since) {
    query = query.gte('created_at', since);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching recent bet decisions:', error.message);
    return [];
  }
  
  return data || [];
}

/**
 * Get decision statistics for a time period
 * 
 * @param {string} since - ISO timestamp
 * @param {string} [until] - ISO timestamp (default now)
 * @returns {Object} Statistics summary
 */
async function getStats(since, until = null) {
  if (!checkSupabase()) return null;
  
  let query = supabase
    .from('bet_decisions')
    .select('decision, market, edge, confidence')
    .gte('created_at', since);
  
  if (until) {
    query = query.lte('created_at', until);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching bet decision stats:', error.message);
    return null;
  }
  
  if (!data || data.length === 0) {
    return { total: 0, byDecision: {}, byMarket: {}, avgEdge: 0 };
  }
  
  // Aggregate stats
  const byDecision = {};
  const byMarket = {};
  let totalEdge = 0;
  let edgeCount = 0;
  
  for (const d of data) {
    byDecision[d.decision] = (byDecision[d.decision] || 0) + 1;
    byMarket[d.market] = (byMarket[d.market] || 0) + 1;
    
    if (d.edge !== null) {
      totalEdge += parseFloat(d.edge);
      edgeCount++;
    }
  }
  
  return {
    total: data.length,
    byDecision,
    byMarket,
    avgEdge: edgeCount > 0 ? totalEdge / edgeCount : 0
  };
}

/**
 * Get last decision for a match/market
 * 
 * @param {number} matchId - Match ID
 * @param {string} market - Market type
 * @returns {Object|null} Last decision or null
 */
async function getLastDecision(matchId, market) {
  if (!checkSupabase()) return null;
  
  const { data, error } = await supabase
    .from('bet_decisions')
    .select('*')
    .eq('match_id', matchId)
    .eq('market', market)
    .order('as_of_time', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') { // Not "no rows" error
    console.error('❌ Error fetching last bet decision:', error.message);
  }
  
  return data || null;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Version
  BET_DECISIONS_REPO_VERSION,
  
  // Constants
  DECISION_TYPES,
  
  // CRUD
  insertDecision,
  listByMatch,
  listRecent,
  getStats,
  getLastDecision
};
