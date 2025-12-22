/**
 * Player Service
 * 
 * Gestisce i dati dei tennisti:
 * - Trova o crea giocatori
 * - Gestisce alias per matching nomi
 * - Aggiorna ranking e statistiche
 */

const { supabase } = require('../db/supabase');

class PlayerService {

  /**
   * Normalizza un nome per matching
   */
  normalizeName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
      .replace(/[^a-z\s]/g, '')        // Solo lettere e spazi
      .replace(/\s+/g, ' ')            // Normalizza spazi
      .trim();
  }

  /**
   * Trova un giocatore per nome (cerca anche negli alias)
   */
  async findByName(name) {
    if (!supabase || !name) return null;

    const normalized = this.normalizeName(name);

    // Prima cerca negli alias
    const { data: alias } = await supabase
      .from('player_aliases')
      .select('player_id')
      .eq('alias_normalized', normalized)
      .single();

    if (alias?.player_id) {
      return this.getById(alias.player_id);
    }

    // Cerca per nome diretto (case insensitive)
    const { data: player } = await supabase
      .from('players_new')
      .select('*')
      .ilike('name', `%${name}%`)
      .limit(1)
      .single();

    return player;
  }

  /**
   * Trova per SofaScore ID
   */
  async findBySofascoreId(sofascoreId) {
    if (!supabase || !sofascoreId) return null;

    const { data } = await supabase
      .from('players_new')
      .select('*')
      .eq('sofascore_id', sofascoreId)
      .single();

    return data;
  }

  /**
   * Ottiene giocatore per ID
   */
  async getById(playerId) {
    if (!supabase || !playerId) return null;

    const { data } = await supabase
      .from('players_new')
      .select('*')
      .eq('id', playerId)
      .single();

    return data;
  }

  /**
   * Trova o crea un giocatore
   */
  async findOrCreate(playerData) {
    if (!supabase) return null;

    const { name, sofascoreId, country, ranking } = playerData;

    // 1. Cerca per SofaScore ID
    if (sofascoreId) {
      const existing = await this.findBySofascoreId(sofascoreId);
      if (existing) {
        // Aggiorna se necessario
        await this.updateIfNeeded(existing.id, playerData);
        return existing;
      }
    }

    // 2. Cerca per nome
    const byName = await this.findByName(name);
    if (byName) {
      // Aggiorna sofascore_id se mancava
      if (sofascoreId && !byName.sofascore_id) {
        await supabase
          .from('players_new')
          .update({ sofascore_id: sofascoreId, updated_at: new Date().toISOString() })
          .eq('id', byName.id);
      }
      await this.updateIfNeeded(byName.id, playerData);
      return byName;
    }

    // 3. Crea nuovo
    return this.create(playerData);
  }

  /**
   * Crea un nuovo giocatore
   */
  async create(playerData) {
    if (!supabase) return null;

    const { name, sofascoreId, country, ranking, fullName, firstName, lastName, slug } = playerData;
    const normalized = this.normalizeName(name);

    // Inserisci player
    const { data: newPlayer, error } = await supabase
      .from('players_new')
      .insert({
        name: name,
        full_name: fullName || name,
        first_name: firstName || name.split(' ')[0],
        last_name: lastName || name.split(' ').slice(-1)[0],
        slug: slug,
        sofascore_id: sofascoreId,
        country_code: country?.alpha2 || country,
        country_name: country?.name,
        current_ranking: ranking,
        ranking_updated_at: ranking ? new Date().toISOString().split('T')[0] : null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating player:', error);
      return null;
    }

    // Aggiungi alias
    await this.addAlias(newPlayer.id, name, 'auto');

    console.log(`✅ Created player: ${name} (ID: ${newPlayer.id})`);
    return newPlayer;
  }

  /**
   * Aggiorna giocatore se ci sono nuovi dati
   */
  async updateIfNeeded(playerId, newData) {
    if (!supabase || !playerId) return;

    const updates = {};
    
    if (newData.ranking && newData.ranking > 0) {
      updates.current_ranking = newData.ranking;
      updates.ranking_updated_at = new Date().toISOString().split('T')[0];
    }
    if (newData.sofascoreId) {
      updates.sofascore_id = newData.sofascoreId;
    }
    if (newData.country?.alpha2) {
      updates.country_code = newData.country.alpha2;
      updates.country_name = newData.country.name;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabase
        .from('players_new')
        .update(updates)
        .eq('id', playerId);
    }

    // Aggiungi alias se il nome è diverso
    if (newData.name) {
      await this.addAlias(playerId, newData.name, newData.source || 'auto');
    }
  }

  /**
   * Aggiunge un alias per un giocatore
   */
  async addAlias(playerId, aliasName, source = 'manual') {
    if (!supabase || !playerId || !aliasName) return;

    const normalized = this.normalizeName(aliasName);
    if (!normalized) return;

    await supabase
      .from('player_aliases')
      .upsert({
        player_id: playerId,
        alias_name: aliasName,
        alias_normalized: normalized,
        source: source
      }, { onConflict: 'alias_normalized' });
  }

  /**
   * Aggiorna ranking storico
   */
  async updateRanking(playerId, ranking, points, date = new Date()) {
    if (!supabase || !playerId || !ranking) return;

    const rankingDate = date instanceof Date 
      ? date.toISOString().split('T')[0] 
      : date;

    // Aggiorna ranking corrente
    await supabase
      .from('players_new')
      .update({
        current_ranking: ranking,
        current_points: points,
        ranking_updated_at: rankingDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId);

    // Aggiungi a storico
    await supabase
      .from('player_rankings')
      .upsert({
        player_id: playerId,
        ranking_date: rankingDate,
        ranking: ranking,
        points: points,
        ranking_type: 'ATP'
      }, { onConflict: 'player_id,ranking_date,ranking_type' });
  }

  /**
   * Ottiene storico ranking di un giocatore
   */
  async getRankingHistory(playerId, limit = 52) {
    if (!supabase || !playerId) return [];

    const { data } = await supabase
      .from('player_rankings')
      .select('*')
      .eq('player_id', playerId)
      .order('ranking_date', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Aggiorna statistiche carriera
   */
  async updateCareerStats(playerId, surface, stats) {
    if (!supabase || !playerId) return;

    await supabase
      .from('player_career_stats')
      .upsert({
        player_id: playerId,
        surface: surface || 'all',
        year: stats.year || null,
        matches_played: stats.matchesPlayed,
        matches_won: stats.matchesWon,
        win_percentage: stats.matchesPlayed > 0 
          ? (stats.matchesWon / stats.matchesPlayed * 100).toFixed(2) 
          : 0,
        aces_total: stats.aces,
        double_faults_total: stats.doubleFaults,
        first_serve_pct: stats.firstServePct,
        first_serve_won_pct: stats.firstServeWonPct,
        second_serve_won_pct: stats.secondServeWonPct,
        return_games_won_pct: stats.returnGamesWonPct,
        break_points_saved_pct: stats.breakPointsSavedPct,
        break_points_converted_pct: stats.breakPointsConvertedPct,
        tiebreaks_won: stats.tiebreaksWon,
        tiebreaks_played: stats.tiebreaksPlayed,
        updated_at: new Date().toISOString()
      }, { onConflict: 'player_id,surface,year' });
  }

  /**
   * Ottiene statistiche carriera
   */
  async getCareerStats(playerId) {
    if (!supabase || !playerId) return null;

    const { data } = await supabase
      .from('player_career_stats')
      .select('*')
      .eq('player_id', playerId)
      .order('surface');

    if (!data || data.length === 0) return null;

    // Organizza per superficie
    const bySurface = {};
    for (const stat of data) {
      if (!bySurface[stat.surface]) {
        bySurface[stat.surface] = [];
      }
      bySurface[stat.surface].push(stat);
    }

    return bySurface;
  }

  /**
   * Cerca giocatori
   */
  async search(query, limit = 10) {
    if (!supabase || !query) return [];

    const { data } = await supabase
      .from('players_new')
      .select('id, name, country_code, current_ranking')
      .or(`name.ilike.%${query}%,full_name.ilike.%${query}%`)
      .order('current_ranking', { ascending: true, nullsFirst: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Ottiene tutti gli alias di un giocatore
   */
  async getAliases(playerId) {
    if (!supabase || !playerId) return [];

    const { data } = await supabase
      .from('player_aliases')
      .select('alias_name, source')
      .eq('player_id', playerId);

    return data || [];
  }

  /**
   * Merge due giocatori (in caso di duplicati)
   */
  async mergePlayers(keepId, mergeId) {
    if (!supabase || !keepId || !mergeId || keepId === mergeId) return false;

    // Sposta tutti gli alias
    await supabase
      .from('player_aliases')
      .update({ player_id: keepId })
      .eq('player_id', mergeId);

    // Sposta match (player1)
    await supabase
      .from('matches_new')
      .update({ player1_id: keepId })
      .eq('player1_id', mergeId);

    // Sposta match (player2)
    await supabase
      .from('matches_new')
      .update({ player2_id: keepId })
      .eq('player2_id', mergeId);

    // Sposta match (winner)
    await supabase
      .from('matches_new')
      .update({ winner_id: keepId })
      .eq('winner_id', mergeId);

    // Elimina player duplicato
    await supabase
      .from('players_new')
      .delete()
      .eq('id', mergeId);

    console.log(`✅ Merged player ${mergeId} into ${keepId}`);
    return true;
  }
}

module.exports = new PlayerService();
