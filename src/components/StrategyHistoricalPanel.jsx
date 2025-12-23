import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  TrendUp, 
  TrendDown,
  Trophy,
  TennisBall,
  Lightning,
  ChartBar,
  Scales,
  ArrowClockwise,
  SpinnerGap,
  WarningCircle,
  Target,
  Percent,
  Shield,
  HeartHalf
} from '@phosphor-icons/react';
import { apiUrl } from '../config';

/**
 * StrategyHistoricalPanel
 * Mostra statistiche storiche delle STRATEGIE dal database
 * Colonna DESTRA: % successo di ogni strategia basata sui match passati
 * 
 * Tipo: FRONTEND DISPLAY
 * Fonte dati: /api/match/strategy-context (backend)
 * Riferimento: docs/filosofie/FILOSOFIA_STATS_V2.md
 */

// Card per singola strategia con % successo storico
function StrategyStatsCard({ title, icon, stats, color, description }) {
  const successRate = stats?.success_rate ?? 0;
  const totalMatches = stats?.total_matches ?? stats?.applicable ?? 0;
  const successCount = stats?.success ?? stats?.favorite_wins ?? stats?.breaks_converted ?? 0;
  
  // Colore basato sulla percentuale
  const getRateColor = (rate) => {
    if (rate >= 0.6) return '#10b981'; // Verde - alta probabilità
    if (rate >= 0.4) return '#f59e0b'; // Giallo - media
    return '#ef4444'; // Rosso - bassa
  };
  
  const rateColor = getRateColor(successRate);
  
  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.9)',
      borderRadius: 12,
      padding: 14,
      border: `1px solid ${color}30`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{
          background: `${color}20`,
          borderRadius: 8,
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color
        }}>
          {icon}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#e4e6eb', fontSize: 13 }}>{title}</div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>{description}</div>
        </div>
      </div>

      {/* Stats principali */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15, 20, 25, 0.6)',
        borderRadius: 8,
        padding: 10,
        marginBottom: 6
      }}>
        <div>
          <div style={{ fontSize: 10, color: '#8b95a5', marginBottom: 2 }}>Successo Storico</div>
          <div style={{ 
            fontSize: 24, 
            fontWeight: 700, 
            color: rateColor,
            display: 'flex',
            alignItems: 'baseline',
            gap: 2
          }}>
            {(successRate * 100).toFixed(1)}
            <span style={{ fontSize: 12, color: '#8b95a5' }}>%</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#8b95a5', marginBottom: 2 }}>Casi</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e6eb' }}>
            {successCount}/{totalMatches}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4,
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${successRate * 100}%`,
          background: `linear-gradient(90deg, ${rateColor}80, ${rateColor})`,
          borderRadius: 2,
          transition: 'width 0.5s ease'
        }} />
      </div>

      {/* Dettagli extra */}
      {stats?.avg_ranking_gap && (
        <div style={{ marginTop: 6, fontSize: 10, color: '#6b7280' }}>
          Gap ranking medio: {stats.avg_ranking_gap} pos.
        </div>
      )}
    </div>
  );
}

// Card compatta per player
function PlayerMiniCard({ player, data, isHome }) {
  if (!data || data.error) {
    return (
      <div style={{
        background: 'rgba(15, 20, 25, 0.6)',
        borderRadius: 8,
        padding: 8,
        flex: 1,
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player}</div>
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>N/D</div>
      </div>
    );
  }

  const comebackRate = data.comeback?.rate ?? 0;
  const winRate = data.winRate?.overall ?? 0;
  
  return (
    <div style={{
      background: 'rgba(15, 20, 25, 0.6)',
      borderRadius: 8,
      padding: 8,
      flex: 1,
      border: `1px solid ${isHome ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
    }}>
      <div style={{ 
        fontSize: 11, 
        fontWeight: 600, 
        color: isHome ? '#3b82f6' : '#ef4444',
        marginBottom: 4,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {player}
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
        <div>
          <span style={{ color: '#6b7280' }}>W:</span>
          <span style={{ color: '#e4e6eb', fontWeight: 600, marginLeft: 2 }}>{(winRate * 100).toFixed(0)}%</span>
        </div>
        <div>
          <span style={{ color: '#6b7280' }}>CB:</span>
          <span style={{ color: comebackRate > 0.2 ? '#10b981' : '#f59e0b', fontWeight: 600, marginLeft: 2 }}>
            {(comebackRate * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function StrategyHistoricalPanel({ homeName, awayName, surface }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStrategyContext = useCallback(async () => {
    if (!homeName || !awayName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = apiUrl(`/api/match/strategy-context/${encodeURIComponent(homeName)}/${encodeURIComponent(awayName)}${surface ? `?surface=${surface}` : ''}`);
      const res = await fetch(url);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const result = await res.json();
      setData(result);
      console.log('📊 Strategy context loaded:', result);
    } catch (err) {
      console.error('Error loading strategy context:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [homeName, awayName, surface]);

  useEffect(() => {
    fetchStrategyContext();
  }, [fetchStrategyContext]);

  return (
    <div style={{
      background: 'rgba(15, 20, 30, 0.95)',
      borderRadius: 14,
      padding: 16,
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
      height: 'fit-content'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: '#e4e6eb',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <Percent size={16} weight="duotone" style={{ color: '#8b5cf6' }} />
          Storico Strategie
        </h3>
        <button
          onClick={fetchStrategyContext}
          disabled={loading}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: 4,
            padding: '4px 6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: '#8b95a5',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {loading ? <SpinnerGap size={12} className="spin" /> : <ArrowClockwise size={12} />}
        </button>
      </div>

      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 12 }}>
        % successo calcolata su tutti i match nel DB {surface ? `(${surface})` : ''}
      </div>

      {/* Loading */}
      {loading && !data && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#6b7280' }}>
          <SpinnerGap size={18} className="spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: 6,
          padding: 8,
          color: '#ef4444',
          fontSize: 11
        }}>
          <WarningCircle size={12} style={{ marginRight: 4 }} />
          {error}
        </div>
      )}

      {/* Data */}
      {data && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          
          {/* Player Mini Cards */}
          <div style={{ display: 'flex', gap: 6 }}>
            <PlayerMiniCard player={homeName} data={data.home} isHome={true} />
            <PlayerMiniCard player={awayName} data={data.away} isHome={false} />
          </div>

          {/* Strategy Stats Cards */}
          <StrategyStatsCard
            title="Lay the Winner"
            icon={<Trophy size={16} weight="duotone" />}
            stats={data.strategyStats?.layTheWinner}
            color="#f59e0b"
            description="Perdente 1° set vince match"
          />

          <StrategyStatsCard
            title="Banca Servizio"
            icon={<TennisBall size={16} weight="duotone" />}
            stats={data.strategyStats?.bancaServizio}
            color="#3b82f6"
            description="Break point convertiti"
          />

          <StrategyStatsCard
            title="Super Break"
            icon={<Lightning size={16} weight="duotone" />}
            stats={data.strategyStats?.superBreak}
            color="#10b981"
            description="Favorito (ranking) vince"
          />

          {/* Nuovi indicatori: HPI e Resilience */}
          <div style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: 10,
            marginTop: 4
          }}>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>
              📊 INDICATORI PRESSIONE
            </div>
            
            <StrategyStatsCard
              title="HPI - Hold Pressure"
              icon={<Shield size={16} weight="duotone" />}
              stats={data.strategyStats?.hpi}
              color="#8b5cf6"
              description="BP salvati (tenuta servizio)"
            />
            
            <div style={{ height: 8 }} />
            
            <StrategyStatsCard
              title="Break Resilience"
              icon={<HeartHalf size={16} weight="duotone" />}
              stats={data.strategyStats?.resilience}
              color="#ec4899"
              description="Capacità recupero + BP salvati"
            />
          </div>

          {/* H2H */}
          {data.h2h && data.h2h.matches > 0 && (
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: 8,
              padding: 8,
              border: '1px solid rgba(139, 92, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: 10, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Scales size={12} weight="duotone" />
                H2H
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e4e6eb' }}>
                {data.h2h.player1_wins || 0} - {data.h2h.player2_wins || 0}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
