import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChartBar,
  Trophy,
  MagnifyingGlass,
  Broadcast,
  Target,
  User,
  TennisBall,
  CalendarBlank,
  CheckCircle,
  Warning,
  XCircle,
  ArrowsClockwise,
  SpinnerGap,
  Flask,
  Package,
  Lightbulb,
  SoccerBall,
  ArrowLeft,
  ArrowRight,
  X,
  Circle,
  Hourglass,
  MathOperations,
  TextAlignLeft,
  Hash,
  Gear,
} from '@phosphor-icons/react';
import { apiUrl } from '../config';
// ManualPredictor rimosso - deprecato
// import ManualPredictor from './ManualPredictor';

/**
 * MonitoringDashboard Component
 * Pannello avanzato per monitorare lo stato del database,
 * tornei, acquisizioni e completezza dati
 */

// Mini grafico a barre per la timeline
function MiniBarChart({ data, height = 40 }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.count), 1);
  const barWidth = 100 / data.length;

  return (
    <div
      className="mini-bar-chart"
      style={{ height, display: 'flex', alignItems: 'flex-end', gap: 2 }}
    >
      {data.map((d, i) => (
        <div
          key={i}
          className="mini-bar"
          title={`${d.date}: ${d.count} match`}
          style={{
            flex: 1,
            height: `${(d.count / max) * 100}%`,
            minHeight: d.count > 0 ? 4 : 1,
            background:
              d.count > 0
                ? 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)'
                : 'rgba(255,255,255,0.1)',
            borderRadius: '2px 2px 0 0',
            transition: 'height 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

// Progress ring/circle con animazione da 0%
function ProgressRing({ percentage, size = 60, strokeWidth = 6 }) {
  const [animatedPct, setAnimatedPct] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedPct / 100) * circumference;

  // Anima da 0 al valore reale
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPct(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const getColor = (pct) => {
    if (pct >= 80) return '#10b981';
    if (pct >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          stroke="rgba(255,255,255,0.1)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={getColor(percentage)}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.8s ease-out',
          }}
        />
      </svg>
      <span
        className="progress-ring-text"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: size * 0.25,
          fontWeight: 700,
          color: getColor(percentage),
        }}
      >
        {percentage}%
      </span>
    </div>
  );
}

// Formatta data per visualizzazione
function formatTournamentDate(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp * 1000);
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('it-IT', options);
}

// Formatta range date
function formatDateRange(earliest, latest) {
  if (!earliest && !latest) return null;
  const e = formatTournamentDate(earliest);
  const l = formatTournamentDate(latest);
  if (e === l || !e) return l;
  if (!l) return e;
  return `${e} - ${l}`;
}

// Card per singolo torneo - SOLO DATI DAL DATABASE
// Lo scraping va fatto dal progetto esterno: c:\Users\UTENTE\Desktop\Tennis-Scraper-Local
function TournamentCard({ tournament, onExpand, expanded, onMatchSelect }) {
  const dateRange = formatDateRange(tournament.earliestDate, tournament.latestDate);

  // Statistiche copertura reale
  const coverage = tournament.coverage || {};
  const hasCoverageData = coverage.totalDetected > 0;
  const coveragePercentage = hasCoverageData ? coverage.percentage || 0 : 100;
  const missingCount = coverage.missing || 0;
  const missingMatches = tournament.missingMatches || [];

  // Handler click su partita esistente - naviga a scheda match
  const handleExistingMatchClick = async (match) => {
    if (onMatchSelect) {
      try {
        const res = await fetch(apiUrl(`/api/matches?sport=tennis`));
        if (res.ok) {
          const data = await res.json();
          const fullMatch = data.matches.find((m) => String(m.eventId) === String(match.eventId));
          if (fullMatch) {
            onMatchSelect(fullMatch);
          } else {
            const directRes = await fetch(apiUrl(`/api/match/${match.eventId}`));
            if (directRes.ok) {
              const directData = await directRes.json();
              onMatchSelect(directData);
            } else {
              onMatchSelect(match);
            }
          }
        } else {
          onMatchSelect(match);
        }
      } catch (err) {
        console.error('Error loading full match:', err);
        onMatchSelect(match);
      }
    }
  };

  return (
    <div className={`tournament-card ${expanded ? 'expanded' : ''}`}>
      <div className="tournament-card-header" onClick={() => onExpand(tournament.id)}>
        <div className="tournament-info">
          <span className="tournament-sport-icon">
            {tournament.sport === 'tennis' ? (
              <TennisBall size={20} weight="duotone" />
            ) : tournament.sport === 'football' ? (
              <SoccerBall size={20} weight="duotone" />
            ) : (
              <Trophy size={20} weight="duotone" />
            )}
          </span>
          <div className="tournament-details">
            <h4 className="tournament-name">{tournament.name}</h4>
            <div className="tournament-meta">
              <span className="tournament-category">{tournament.category}</span>
              {dateRange && (
                <span className="tournament-date">
                  <CalendarBlank size={14} weight="duotone" style={{ marginRight: 4 }} />
                  {dateRange}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="tournament-stats">
          <div className="stat-item">
            <span className="stat-value">
              {tournament.matchCount}
              {hasCoverageData && <span className="stat-total">/{coverage.totalDetected}</span>}
            </span>
            <span className="stat-label">Salvate</span>
          </div>
          <div className="stat-item progress-stat">
            <div className="progress-ring-wrapper">
              <ProgressRing percentage={coveragePercentage} size={48} strokeWidth={5} />
            </div>
            <span
              className="progress-text-mobile"
              style={{
                color:
                  coveragePercentage >= 80
                    ? '#10b981'
                    : coveragePercentage >= 50
                    ? '#f59e0b'
                    : '#ef4444',
              }}
            >
              {coveragePercentage}%
            </span>
          </div>
          <span className={`expand-icon ${expanded ? 'rotated' : ''}`}>▼</span>
        </div>
      </div>

      {expanded && (
        <div className="tournament-card-body">
          {/* Coverage info - sempre mostrata */}
          <div className="coverage-info">
            <div className="coverage-bar-container">
              <div
                className="coverage-bar-fill"
                style={{
                  width: `${coveragePercentage}%`,
                  backgroundColor:
                    coveragePercentage >= 80
                      ? '#10b981'
                      : coveragePercentage >= 50
                      ? '#f59e0b'
                      : '#ef4444',
                }}
              />
            </div>
            {hasCoverageData ? (
              <div className="coverage-stats">
                <span className="coverage-acquired">
                  <CheckCircle
                    size={14}
                    weight="fill"
                    style={{ marginRight: 4, color: '#10b981' }}
                  />
                  {coverage.acquired} acquisite
                </span>
                <span className="coverage-missing">
                  <Warning size={14} weight="fill" style={{ marginRight: 4, color: '#f59e0b' }} />
                  {missingCount} mancanti
                </span>
                <span className="coverage-total">
                  <ChartBar size={14} weight="duotone" style={{ marginRight: 4 }} />
                  {coverage.totalDetected} totali
                </span>
              </div>
            ) : (
              <div className="coverage-stats">
                <span className="coverage-total">
                  <ChartBar size={14} weight="duotone" style={{ marginRight: 4 }} />
                  {tournament.total_matches} match in DB
                </span>
              </div>
            )}
          </div>

          {/* Status breakdown */}
          <div className="status-breakdown">
            <div className="status-item finished">
              <span className="status-dot"></span>
              <span>{tournament.byStatus.finished} Finite</span>
            </div>
            <div className="status-item inprogress">
              <span className="status-dot"></span>
              <span>{tournament.byStatus.inprogress} In Corso</span>
            </div>
            <div className="status-item notstarted">
              <span className="status-dot"></span>
              <span>{tournament.byStatus.notstarted} Da Iniziare</span>
            </div>
          </div>

          {/* Sezione Match nel Database */}
          {tournament.matches.length > 0 && (
            <div className="tournament-matches saved-matches">
              <div className="matches-header">
                <h5>
                  <CheckCircle
                    size={16}
                    weight="fill"
                    style={{ marginRight: 6, color: '#10b981' }}
                  />
                  Match nel Database ({tournament.matches.length})
                </h5>
              </div>
              <div className="matches-scroll">
                {tournament.matches.slice(0, 10).map((m) => (
                  <div
                    key={m.eventId}
                    className="mini-match clickable saved-match"
                    onClick={() => handleExistingMatchClick(m)}
                    title="Clicca per aprire scheda match"
                  >
                    <span className="mini-match-teams">
                      {m.homeTeam} vs {m.awayTeam}
                    </span>
                    <div className="mini-match-meta">
                      <span className={`mini-status ${m.status}`}>{m.status}</span>
                      <span className="mini-completeness">{m.completeness}%</span>
                    </div>
                  </div>
                ))}
                {tournament.matches.length > 10 && (
                  <div className="more-matches">
                    ...e altri {tournament.matches.length - 10} match
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sezione Match Mancanti (rilevate ma non acquisite) */}
          {missingMatches.length > 0 && (
            <div className="tournament-matches missing-matches">
              <div className="matches-header">
                <h5>
                  <Warning size={16} weight="fill" style={{ marginRight: 6, color: '#f59e0b' }} />
                  Match Mancanti ({missingCount})
                </h5>
                <span className="missing-hint">Usa Tennis-Scraper-Local per acquisire</span>
              </div>
              <div className="matches-scroll">
                {missingMatches.slice(0, 10).map((m) => (
                  <div
                    key={m.eventId}
                    className="mini-match missing-match"
                    title={`Event ID: ${m.eventId} - Status: ${m.status}`}
                  >
                    <span className="mini-match-teams">
                      {m.homeTeam || 'TBD'} vs {m.awayTeam || 'TBD'}
                    </span>
                    <div className="mini-match-meta">
                      <span className={`mini-status ${m.status || 'unknown'}`}>
                        {m.status || 'Sconosciuto'}
                      </span>
                      <span className="event-id">#{m.eventId}</span>
                    </div>
                  </div>
                ))}
                {missingMatches.length > 10 && (
                  <div className="more-matches">
                    ...e altre {missingMatches.length - 10} partite mancanti
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Formule e spiegazioni per i dati calcolati
const CALCULATED_DATA_FORMULAS = {
  winRate: {
    name: 'Win Rate',
    formula: 'wins / totalMatches',
    description: 'Percentuale di vittorie sul totale delle partite giocate',
    example: (data) =>
      data
        ? `${data.totalWins || 0} / ${(data.totalWins || 0) + (data.totalLosses || 0)} = ${(
            (data.winRate || 0) * 100
          ).toFixed(1)}%`
        : null,
  },
  totalWins: {
    name: 'Vittorie Totali',
    formula: 'COUNT(matches WHERE player_role = "winner")',
    description: 'Numero totale di partite vinte',
    example: null,
  },
  totalLosses: {
    name: 'Sconfitte Totali',
    formula: 'COUNT(matches WHERE player_role = "loser")',
    description: 'Numero totale di partite perse',
    example: null,
  },
  avgSetsPerMatch: {
    name: 'Media Set per Match',
    formula: 'SUM(sets_played) / totalMatches',
    description: 'Numero medio di set giocati per partita (indica se le partite sono combattute)',
    example: null,
  },
  tiebreakWinRate: {
    name: 'Tiebreak Win Rate',
    formula: 'tiebreaks_won / tiebreaks_played',
    description: 'Percentuale di tiebreak vinti. Indica la capacità di gestire i momenti decisivi',
    example: null,
  },
  comebackRate: {
    name: 'Comeback Rate',
    formula: 'matches_won_after_losing_first_set / matches_lost_first_set',
    description:
      'Percentuale di vittorie dopo aver perso il primo set. Misura la resilienza mentale',
    example: null,
  },
  firstSetWinRate: {
    name: 'First Set Win Rate',
    formula: 'first_sets_won / totalMatches',
    description: 'Percentuale di primi set vinti. Indica la capacità di partire forte',
    example: null,
  },
  decidingSetWinRate: {
    name: 'Deciding Set Win Rate',
    formula: 'deciding_sets_won / deciding_sets_played',
    description: 'Percentuale di set decisivi vinti (3° set nel best of 3, 5° nel best of 5)',
    example: null,
  },
  matchWinAfterFirstSet: {
    name: 'Match Win After First Set',
    formula: 'matches_won_after_winning_first_set / first_sets_won',
    description: 'Probabilità di vincere il match dopo aver vinto il primo set',
    example: null,
  },
  recentForm: {
    name: 'Forma Recente',
    formula: 'wins_last_20 / 20',
    description:
      'Win rate nelle ultime 20 partite. Trend indica se sta migliorando o peggiorando rispetto alla media storica',
    example: null,
  },
  roi: {
    name: 'ROI (Return on Investment)',
    formula: '(total_return - total_stake) / total_stake * 100',
    description: 'Rendimento se si fosse scommesso sempre su questo giocatore alle quote medie',
    example: null,
  },
  bySurface: {
    name: 'Stats per Superficie',
    formula: 'Per ogni superficie: wins / matches',
    description: 'Win rate diviso per tipo di superficie (Hard, Clay, Grass)',
    example: null,
  },
  byFormat: {
    name: 'Stats per Formato',
    formula: 'Per ogni formato: wins / matches',
    description: 'Win rate diviso per formato (Best of 3 vs Best of 5)',
    example: null,
  },
  bySeries: {
    name: 'Stats per Torneo',
    formula: 'Per ogni categoria: wins / matches',
    description: 'Win rate diviso per categoria torneo (Grand Slam, Masters, ATP500, etc.)',
    example: null,
  },
};

// Helper per renderizzare valori nell'inspector (espande oggetti)
// FILOSOFIA_FRONTEND_UI: RULE_NO_NULL_DISPLAY - inspector shows N/A for truly missing data
// This is acceptable because inspector is a debug tool showing raw backend data
function renderInspectorValue(value, depth = 0) {
  if (value === null || value === undefined || value === '') {
    return (
      <>
        <XCircle size={14} weight="fill" style={{ marginRight: 4, color: '#ef4444' }} />
        Non disponibile
      </>
    );
  }

  if (typeof value === 'boolean') {
    return value ? (
      <>
        <CheckCircle size={14} weight="fill" style={{ marginRight: 4, color: '#10b981' }} />
        Sì
      </>
    ) : (
      <>
        <XCircle size={14} weight="fill" style={{ marginRight: 4, color: '#ef4444' }} />
        No
      </>
    );
  }

  if (typeof value === 'number') {
    // Formatta numeri con decimali se necessario
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2);
  }

  if (typeof value === 'string') {
    if (value.length > 60) return value.substring(0, 60) + '...';
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[] (vuoto)';
    if (depth > 0) return `[${value.length} elementi]`;
    // Mostra primi elementi se sono semplici
    const preview = value
      .slice(0, 3)
      .map((v) => (typeof v === 'object' ? '{...}' : String(v).substring(0, 20)))
      .join(', ');
    return `[${value.length}]: ${preview}${value.length > 3 ? '...' : ''}`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{} (vuoto)';

    // Per oggetti con proprietà specifiche, mostra valori chiave
    if (value.value !== undefined && value.class !== undefined) {
      return `${value.value} (${value.class})`;
    }
    if (value.rate !== undefined) {
      return `${(value.rate * 100).toFixed(1)}%`;
    }
    if (value.win_rate !== undefined) {
      return `WR: ${(value.win_rate * 100).toFixed(1)}%`;
    }
    if (value.wins !== undefined && value.losses !== undefined) {
      return `${value.wins}W - ${value.losses}L`;
    }
    if (value.trend !== undefined) {
      return `Trend: ${value.trend}`;
    }

    // Altrimenti mostra chiavi
    if (depth > 0) return `{${keys.length} props}`;
    const preview = keys.slice(0, 3).join(', ');
    return `{${keys.length}}: ${preview}${keys.length > 3 ? '...' : ''}`;
  }

  return String(value);
}

// Componente principale
function MonitoringDashboard({ isOpen, onClose, onMatchesUpdated, onMatchSelect }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTournament, setExpandedTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tournaments' | 'explore' | 'predictor'

  // === DATA INSPECTOR - Stati ===
  const [inspectorMode, setInspectorMode] = useState('player'); // 'player' | 'match'
  const [expandedFormula, setExpandedFormula] = useState(null); // quale metrica mostra la formula
  const [inspectorSearch, setInspectorSearch] = useState('');
  const [inspectorData, setInspectorData] = useState(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [matchSearchResults, setMatchSearchResults] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [playerSuggestions, setPlayerSuggestions] = useState([]);
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false);

  // === ESPLORA MATCH - Stati filtri ===
  const [searchFilters, setSearchFilters] = useState({
    status: '',
    tournamentId: '',
    tournamentCategory: '',
    playerSearch: '',
    dateFrom: '',
    dateTo: '',
  });
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [availableTournaments, setAvailableTournaments] = useState([]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/db-stats'));
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // === DATA INSPECTOR - Carica dati giocatore o match ===
  const loadInspectorData = useCallback(async () => {
    const searchTerm = inspectorMode === 'match' ? selectedMatchId : inspectorSearch;
    if (!searchTerm || !searchTerm.toString().trim()) return;

    setInspectorLoading(true);
    setInspectorData(null);

    try {
      if (inspectorMode === 'player') {
        // Carica profilo giocatore con dati puri e calcolati
        let data = null;
        try {
          const res = await fetch(
            apiUrl(`/api/player/${encodeURIComponent(searchTerm.trim())}/inspector`)
          );
          if (res.ok) {
            data = await res.json();
            if (data && !data.error) {
              setInspectorData({ type: 'player', ...data });
              return;
            }
          }
        } catch (e) {
          console.warn('Inspector endpoint failed, trying fallback:', e.message);
        }

        // Fallback: carica dati base
        try {
          const profileRes = await fetch(
            apiUrl(`/api/player/${encodeURIComponent(searchTerm.trim())}/profile`)
          );
          if (profileRes.ok) {
            const profile = await profileRes.json();
            setInspectorData({
              type: 'player',
              name: searchTerm,
              rawData: profile.rawData || {},
              calculatedData: profile.calculatedData || profile,
              coverage: profile.coverage || { total: 0, available: 0 },
            });
          } else {
            setInspectorData({ type: 'player', error: 'Giocatore non trovato nel database' });
          }
        } catch (e) {
          console.error('Profile fallback also failed:', e.message);
          setInspectorData({ type: 'player', error: 'Errore di connessione al server' });
        }
      } else {
        // Carica dati match
        try {
          const res = await fetch(apiUrl(`/api/match/${searchTerm}/inspector`));
          if (res.ok) {
            const data = await res.json();
            if (data && !data.error) {
              setInspectorData({ type: 'match', ...data });
              return;
            }
          }
        } catch (e) {
          console.warn('Match inspector endpoint failed, trying fallback:', e.message);
        }

        // Fallback: carica match base
        try {
          const matchRes = await fetch(apiUrl(`/api/match/${searchTerm}`));
          if (matchRes.ok) {
            const match = await matchRes.json();
            setInspectorData({
              type: 'match',
              eventId: searchTerm,
              rawData: match,
              calculatedData: {},
              coverage: { total: 0, available: 0 },
            });
          } else {
            setInspectorData({ type: 'match', error: 'Match non trovato nel database' });
          }
        } catch (e) {
          console.error('Match fallback also failed:', e.message);
          setInspectorData({ type: 'match', error: 'Errore di connessione al server' });
        }
      }
    } catch (e) {
      console.error('Error loading inspector data:', e);
      setInspectorData({ type: inspectorMode, error: `Errore: ${e.message}` });
    } finally {
      setInspectorLoading(false);
    }
  }, [inspectorMode, inspectorSearch, selectedMatchId]);

  // === DATA INSPECTOR - Cerca match per nome giocatore/torneo ===
  const searchMatchesForInspector = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setMatchSearchResults([]);
      return;
    }

    try {
      const res = await fetch(
        apiUrl(`/api/matches/search?playerSearch=${encodeURIComponent(query)}&limit=10`)
      );
      if (res.ok) {
        const data = await res.json();
        setMatchSearchResults(data.matches || []);
      }
    } catch (e) {
      console.error('Error searching matches:', e);
    }
  }, []);

  // === DATA INSPECTOR - Cerca giocatori per autocomplete ===
  const searchPlayersForAutocomplete = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setPlayerSuggestions([]);
      setShowPlayerSuggestions(false);
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/players/search?q=${encodeURIComponent(query)}&limit=8`));
      if (res.ok) {
        const data = await res.json();
        setPlayerSuggestions(data.players || data || []);
        setShowPlayerSuggestions(true);
      }
    } catch (e) {
      console.error('Error searching players:', e);
    }
  }, []);

  // === DATA INSPECTOR - Seleziona giocatore dall'autocomplete ===
  const selectPlayerFromSuggestions = useCallback(
    (player) => {
      const playerName = player.name || player.full_name || player;
      setInspectorSearch(playerName);
      setPlayerSuggestions([]);
      setShowPlayerSuggestions(false);
      // Carica subito i dati
      setTimeout(() => {
        loadInspectorData();
      }, 100);
    },
    [loadInspectorData]
  );

  // === DATA INSPECTOR - Seleziona match dalla lista ===
  const selectMatchForInspector = useCallback(
    (match) => {
      const matchId = match.event_id || match.eventId || match.id;
      setSelectedMatchId(matchId);
      setMatchSearchResults([]);
      setInspectorSearch(`${match.home_player} vs ${match.away_player}`);

      // Carica subito i dati
      setTimeout(() => {
        loadInspectorData();
      }, 100);
    },
    [loadInspectorData]
  );

  // Carica inspector data quando si seleziona un match
  useEffect(() => {
    if (selectedMatchId && inspectorMode === 'match') {
      loadInspectorData();
    }
  }, [selectedMatchId, inspectorMode, loadInspectorData]);

  // === ESPLORA MATCH - Carica lista tornei per dropdown ===
  const loadTournaments = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/matches/tournaments'));
      if (res.ok) {
        const data = await res.json();
        setAvailableTournaments(data.tournaments || []);
      }
    } catch (e) {
      console.error('Error loading tournaments:', e);
    }
  }, []);

  // Carica stats quando il modale si apre
  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, loadStats]);

  // === ESPLORA MATCH - Cerca match con filtri ===
  const searchMatches = useCallback(
    async (page = 1) => {
      setSearchLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchFilters.status) params.set('status', searchFilters.status);
        if (searchFilters.tournamentId) params.set('tournamentId', searchFilters.tournamentId);
        if (searchFilters.tournamentCategory)
          params.set('tournamentCategory', searchFilters.tournamentCategory);
        if (searchFilters.playerSearch) params.set('playerSearch', searchFilters.playerSearch);
        if (searchFilters.dateFrom) params.set('dateFrom', searchFilters.dateFrom);
        if (searchFilters.dateTo) params.set('dateTo', searchFilters.dateTo);
        params.set('page', page);
        params.set('limit', 20);

        const res = await fetch(apiUrl(`/api/matches/search?${params.toString()}`));
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setSearchPage(page);
        }
      } catch (e) {
        console.error('Error searching matches:', e);
      } finally {
        setSearchLoading(false);
      }
    },
    [searchFilters]
  );

  // Aggiorna filtro
  const updateFilter = (key, value) => {
    setSearchFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Reset filtri
  const resetFilters = () => {
    setSearchFilters({
      status: '',
      tournamentId: '',
      tournamentCategory: '',
      playerSearch: '',
      dateFrom: '',
      dateTo: '',
    });
    setSearchResults(null);
  };

  // Filtra match incompleti (non 100% O non finished) - TUTTI, non limitati
  const getIncompleteMatches = useCallback(() => {
    if (!stats?.recentAcquisitions) return [];
    return stats.recentAcquisitions.filter((m) => m.completeness < 100 || m.status !== 'finished');
  }, [stats]);

  // Paginazione per la lista incompleti
  const [incompletePage, setIncompletePage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const paginatedIncomplete = useMemo(() => {
    const all = getIncompleteMatches();
    const start = (incompletePage - 1) * ITEMS_PER_PAGE;
    return {
      items: all.slice(start, start + ITEMS_PER_PAGE),
      total: all.length,
      totalPages: Math.ceil(all.length / ITEMS_PER_PAGE),
      hasNext: start + ITEMS_PER_PAGE < all.length,
      hasPrev: incompletePage > 1,
    };
  }, [getIncompleteMatches, incompletePage]);

  // Carica tornei quando si apre tab Esplora
  useEffect(() => {
    if (isOpen && activeTab === 'explore' && availableTournaments.length === 0) {
      loadTournaments();
    }
  }, [isOpen, activeTab, availableTournaments.length, loadTournaments]);

  if (!isOpen) return null;

  return (
    <div className="monitoring-overlay" onClick={onClose}>
      <div className="monitoring-dashboard" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="monitoring-header">
          <div className="monitoring-title">
            <span className="monitoring-icon">
              <ChartBar size={28} weight="duotone" />
            </span>
            <div>
              <h2>Database Monitor</h2>
              <p>Stato acquisizioni e completezza dati</p>
            </div>
          </div>
          <div className="monitoring-actions">
            <button className="close-monitoring-btn" onClick={onClose}>
              <X size={20} weight="bold" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="monitoring-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Flask size={18} weight="duotone" style={{ marginRight: 6 }} />
            Data Inspector
          </button>
          <button
            className={`tab-btn ${activeTab === 'tournaments' ? 'active' : ''}`}
            onClick={() => setActiveTab('tournaments')}
          >
            <Trophy size={18} weight="duotone" style={{ marginRight: 6 }} />
            Tornei
          </button>
          <button
            className={`tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => setActiveTab('explore')}
          >
            <MagnifyingGlass size={18} weight="duotone" style={{ marginRight: 6 }} />
            Esplora Match
          </button>
          <button
            className={`tab-btn ${activeTab === 'predictor' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictor')}
          >
            <Target size={18} weight="duotone" style={{ marginRight: 6 }} />
            Predictor
          </button>
        </div>

        {/* Content */}
        <div className="monitoring-content">
          {loading && !stats && (
            <div className="monitoring-loading">
              <SpinnerGap size={32} className="spinner large" />
              <p>Caricamento statistiche...</p>
            </div>
          )}

          {error && (
            <div className="monitoring-error">
              <span>
                <XCircle size={18} weight="fill" style={{ marginRight: 6, color: '#ef4444' }} />
                {error}
              </span>
              <button onClick={loadStats}>Riprova</button>
            </div>
          )}

          {stats && activeTab === 'overview' && (
            <div className="tab-content overview-tab data-inspector-tab">
              {/* Header */}
              <div className="inspector-main-header">
                <h3>
                  <Flask size={22} weight="duotone" style={{ marginRight: 8 }} />
                  Data Inspector
                </h3>
                <p>Analizza dati puri vs calcolati per verificare affidabilità e copertura</p>
              </div>

              {/* Mode Toggle */}
              <div className="inspector-mode-toggle">
                <button
                  className={`mode-btn ${inspectorMode === 'player' ? 'active' : ''}`}
                  onClick={() => {
                    setInspectorMode('player');
                    setInspectorData(null);
                    setInspectorSearch('');
                    setMatchSearchResults([]);
                  }}
                >
                  <User size={16} weight="duotone" style={{ marginRight: 6 }} />
                  Giocatore
                </button>
                <button
                  className={`mode-btn ${inspectorMode === 'match' ? 'active' : ''}`}
                  onClick={() => {
                    setInspectorMode('match');
                    setInspectorData(null);
                    setInspectorSearch('');
                    setMatchSearchResults([]);
                  }}
                >
                  <TennisBall size={16} weight="duotone" style={{ marginRight: 6 }} />
                  Match
                </button>
              </div>

              {/* Search Section */}
              <div className="inspector-search-section">
                {inspectorMode === 'player' ? (
                  /* Ricerca Giocatore - con autocomplete */
                  <div className="player-search-container">
                    <div className="inspector-search">
                      <input
                        type="text"
                        placeholder="Nome giocatore (es: Sinner, Alcaraz...)"
                        value={inspectorSearch}
                        onChange={(e) => {
                          setInspectorSearch(e.target.value);
                          if (e.target.value.length >= 2) {
                            searchPlayersForAutocomplete(e.target.value);
                          } else {
                            setPlayerSuggestions([]);
                            setShowPlayerSuggestions(false);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setShowPlayerSuggestions(false);
                            loadInspectorData();
                          }
                          if (e.key === 'Escape') {
                            setShowPlayerSuggestions(false);
                          }
                        }}
                        onFocus={() =>
                          playerSuggestions.length > 0 && setShowPlayerSuggestions(true)
                        }
                        onBlur={() => setTimeout(() => setShowPlayerSuggestions(false), 200)}
                      />
                      <button
                        className="inspector-search-btn"
                        onClick={loadInspectorData}
                        disabled={inspectorLoading || !inspectorSearch.trim()}
                      >
                        {inspectorLoading ? (
                          <SpinnerGap size={16} className="spinner" />
                        ) : (
                          <MagnifyingGlass size={16} weight="bold" />
                        )}
                      </button>
                    </div>

                    {/* Player Autocomplete Dropdown */}
                    {showPlayerSuggestions && playerSuggestions.length > 0 && (
                      <div className="player-suggestions-dropdown">
                        {playerSuggestions.map((player, idx) => (
                          <div
                            key={idx}
                            className="player-suggestion-item"
                            onClick={() => selectPlayerFromSuggestions(player)}
                          >
                            <span className="player-name">
                              {player.name || player.full_name || player}
                            </span>
                            {player.country_name && (
                              <span className="player-country">
                                {player.country_alpha2 || player.country_name}
                              </span>
                            )}
                            {player.current_ranking && (
                              <span className="player-rank">#{player.current_ranking}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Ricerca Match - con ricerca per giocatore */
                  <div className="match-search-container">
                    <div className="inspector-search">
                      <input
                        type="text"
                        placeholder="Cerca match per giocatore o torneo..."
                        value={inspectorSearch}
                        onChange={(e) => {
                          setInspectorSearch(e.target.value);
                          if (e.target.value.length >= 2) {
                            searchMatchesForInspector(e.target.value);
                          } else {
                            setMatchSearchResults([]);
                          }
                        }}
                      />
                      <button
                        className="inspector-search-btn"
                        onClick={() => searchMatchesForInspector(inspectorSearch)}
                        disabled={inspectorLoading || !inspectorSearch.trim()}
                      >
                        {inspectorLoading ? (
                          <SpinnerGap size={16} className="spinner" />
                        ) : (
                          <MagnifyingGlass size={16} weight="bold" />
                        )}
                      </button>
                    </div>

                    {/* Match Search Results Dropdown */}
                    {matchSearchResults.length > 0 && (
                      <div className="match-search-dropdown">
                        {matchSearchResults.map((match, idx) => (
                          <div
                            key={idx}
                            className="match-search-item"
                            onClick={() => selectMatchForInspector(match)}
                          >
                            <span className="match-players">
                              {match.home_player} vs {match.away_player}
                            </span>
                            <span className="match-info">
                              {match.tournament_name || match.tournament} • {match.surface || 'Superficie n.d.'}
                            </span>
                            <span className="match-status">{match.status}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selected Match Info */}
                    {selectedMatchId && (
                      <div className="selected-match-badge">
                        <CheckCircle
                          size={14}
                          weight="fill"
                          style={{ marginRight: 4, color: '#10b981' }}
                        />
                        Match selezionato: {selectedMatchId}
                        <button
                          onClick={() => {
                            setSelectedMatchId(null);
                            setInspectorData(null);
                          }}
                        >
                          <X size={14} weight="bold" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Results */}
              {inspectorData && !inspectorData.error && (
                <div className="inspector-results">
                  {/* Header con nome e coverage */}
                  <div className="inspector-results-header">
                    <span className="inspector-entity-name">
                      {inspectorData.type === 'player' ? (
                        <>
                          <User size={18} weight="duotone" style={{ marginRight: 6 }} />
                          {inspectorData.name || inspectorSearch || 'Giocatore'}
                        </>
                      ) : (
                        <>
                          <TennisBall size={18} weight="duotone" style={{ marginRight: 6 }} />
                          {inspectorData.matchInfo ||
                            inspectorData.eventId ||
                            selectedMatchId ||
                            'Match'}
                        </>
                      )}
                    </span>
                    {inspectorData.coverage && typeof inspectorData.coverage === 'object' && (
                      <span className="inspector-coverage">
                        <ChartBar size={16} weight="duotone" style={{ marginRight: 4 }} />
                        Copertura: {inspectorData.coverage.available || 0}/
                        {inspectorData.coverage.total || 0}(
                        {inspectorData.coverage.total > 0
                          ? Math.round(
                              (inspectorData.coverage.available / inspectorData.coverage.total) *
                                100
                            )
                          : 0}
                        %)
                      </span>
                    )}
                  </div>

                  <div className="inspector-data-grid">
                    {/* Colonna Dati Puri */}
                    <div className="inspector-column raw-data">
                      <h4>
                        <Package size={18} weight="duotone" style={{ marginRight: 6 }} />
                        Dati Puri (DB)
                      </h4>
                      <div className="inspector-data-list">
                        {inspectorData.rawData &&
                        Object.entries(inspectorData.rawData).length > 0 ? (
                          Object.entries(inspectorData.rawData).map(([key, value]) => (
                            <div key={key} className="inspector-data-item">
                              <span className="data-key">{key}</span>
                              <span
                                className={`data-value ${
                                  value === null || value === undefined || value === ''
                                    ? 'missing'
                                    : ''
                                }`}
                              >
                                {renderInspectorValue(value)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="no-data">Nessun dato puro disponibile</div>
                        )}
                      </div>
                    </div>

                    {/* Colonna Dati Calcolati */}
                    <div className="inspector-column calculated-data">
                      <h4>
                        <Gear size={18} weight="duotone" style={{ marginRight: 6 }} />
                        Dati Calcolati <span className="click-hint">(clicca per formula)</span>
                      </h4>
                      <div className="inspector-data-list">
                        {inspectorData.calculatedData &&
                        Object.entries(inspectorData.calculatedData).length > 0 ? (
                          Object.entries(inspectorData.calculatedData).map(([key, value]) => {
                            const formulaInfo = CALCULATED_DATA_FORMULAS[key];
                            const isExpanded = expandedFormula === key;

                            return (
                              <div
                                key={key}
                                className={`inspector-data-item clickable ${
                                  isExpanded ? 'expanded' : ''
                                }`}
                              >
                                <div
                                  className="data-item-header"
                                  onClick={() => setExpandedFormula(isExpanded ? null : key)}
                                >
                                  <span className="data-key">
                                    {formulaInfo?.name || key}
                                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                                  </span>
                                  <span
                                    className={`data-value ${
                                      value === null || value === undefined
                                        ? 'missing'
                                        : 'calculated'
                                    }`}
                                  >
                                    {renderInspectorValue(value)}
                                  </span>
                                </div>

                                {isExpanded && formulaInfo && (
                                  <div className="formula-details">
                                    <div className="formula-row">
                                      <span className="formula-label">
                                        <MathOperations
                                          size={14}
                                          weight="duotone"
                                          style={{ marginRight: 4 }}
                                        />{' '}
                                        Formula:
                                      </span>
                                      <code className="formula-code">{formulaInfo.formula}</code>
                                    </div>
                                    <div className="formula-row">
                                      <span className="formula-label">
                                        <TextAlignLeft
                                          size={14}
                                          weight="duotone"
                                          style={{ marginRight: 4 }}
                                        />{' '}
                                        Descrizione:
                                      </span>
                                      <span className="formula-desc">
                                        {formulaInfo.description}
                                      </span>
                                    </div>
                                    {formulaInfo.example &&
                                      formulaInfo.example(inspectorData.calculatedData) && (
                                        <div className="formula-row">
                                          <span className="formula-label">
                                            <Hash
                                              size={14}
                                              weight="duotone"
                                              style={{ marginRight: 4 }}
                                            />{' '}
                                            Calcolo:
                                          </span>
                                          <code className="formula-example">
                                            {formulaInfo.example(inspectorData.calculatedData)}
                                          </code>
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="no-data">Nessun dato calcolato disponibile</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Data Sources Info */}
                  {inspectorData.sources && (
                    <div className="inspector-sources">
                      <h4>
                        <Broadcast size={18} weight="duotone" style={{ marginRight: 6 }} />
                        Fonti Dati
                      </h4>
                      <div className="sources-list">
                        {inspectorData.sources.map((src, i) => (
                          <span
                            key={i}
                            className={`source-badge ${src.available ? 'available' : 'missing'}`}
                          >
                            {src.available ? (
                              <CheckCircle size={14} weight="fill" />
                            ) : (
                              <XCircle size={14} weight="fill" />
                            )}{' '}
                            {src.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {inspectorData?.error && (
                <div className="inspector-error">
                  <XCircle size={18} weight="fill" style={{ marginRight: 6, color: '#ef4444' }} />
                  {inspectorData.error}
                </div>
              )}

              {/* Hint iniziale */}
              {!inspectorData && !inspectorLoading && (
                <div className="inspector-hint">
                  <Lightbulb
                    size={24}
                    weight="duotone"
                    style={{ marginRight: 8, color: '#f59e0b' }}
                  />
                  <p>
                    {inspectorMode === 'player'
                      ? 'Inserisci il nome di un giocatore per vedere i suoi dati puri dal DB e le metriche calcolate'
                      : 'Cerca un match per nome giocatore o torneo, poi selezionalo dalla lista'}
                  </p>
                </div>
              )}
            </div>
          )}

          {stats && activeTab === 'tournaments' && (
            <div className="tab-content tournaments-tab">
              <div className="tournaments-list">
                {stats.tournaments.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    expanded={expandedTournament === t.id}
                    onExpand={(id) => setExpandedTournament(expandedTournament === id ? null : id)}
                    onMatchSelect={onMatchSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* === TAB ESPLORA MATCH === */}
          {activeTab === 'explore' && (
            <div className="tab-content explore-tab">
              {/* Form Filtri */}
              <div className="explore-filters">
                <h3>
                  <MagnifyingGlass size={20} weight="duotone" style={{ marginRight: 8 }} />
                  Cerca Match nel Database
                </h3>

                <div className="filters-grid">
                  {/* Ricerca Giocatore */}
                  <div className="filter-group">
                    <label>
                      <User size={14} weight="duotone" style={{ marginRight: 4 }} />
                      Giocatore
                    </label>
                    <input
                      type="text"
                      placeholder="Nome giocatore..."
                      value={searchFilters.playerSearch}
                      onChange={(e) => updateFilter('playerSearch', e.target.value)}
                    />
                  </div>

                  {/* Categoria Torneo */}
                  <div className="filter-group">
                    <label>
                      <Trophy size={14} weight="duotone" style={{ marginRight: 4 }} />
                      Categoria
                    </label>
                    <select
                      value={searchFilters.tournamentCategory}
                      onChange={(e) => updateFilter('tournamentCategory', e.target.value)}
                    >
                      <option value="">Tutte</option>
                      <option value="ATP">ATP</option>
                      <option value="WTA">WTA</option>
                      <option value="Challenger">Challenger</option>
                      <option value="ITF Men">ITF Men</option>
                      <option value="ITF Women">ITF Women</option>
                    </select>
                  </div>

                  {/* Torneo */}
                  <div className="filter-group">
                    <label>
                      <TennisBall size={14} weight="duotone" style={{ marginRight: 4 }} />
                      Torneo
                    </label>
                    <select
                      value={searchFilters.tournamentId}
                      onChange={(e) => updateFilter('tournamentId', e.target.value)}
                    >
                      <option value="">Tutti i tornei</option>
                      {availableTournaments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.matchCount})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="filter-group">
                    <label>
                      <ChartBar size={14} weight="duotone" style={{ marginRight: 4 }} />
                      Status
                    </label>
                    <select
                      value={searchFilters.status}
                      onChange={(e) => updateFilter('status', e.target.value)}
                    >
                      <option value="">Tutti</option>
                      <option value="finished">Finite</option>
                      <option value="inprogress">In Corso</option>
                      <option value="notstarted">Da Iniziare</option>
                    </select>
                  </div>

                  {/* Data Da */}
                  <div className="filter-group">
                    <label>
                      <CalendarBlank size={14} weight="duotone" style={{ marginRight: 4 }} />
                      Da
                    </label>
                    <input
                      type="date"
                      value={searchFilters.dateFrom}
                      onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    />
                  </div>

                  {/* Data A */}
                  <div className="filter-group">
                    <label>
                      <CalendarBlank size={14} weight="duotone" style={{ marginRight: 4 }} />A
                    </label>
                    <input
                      type="date"
                      value={searchFilters.dateTo}
                      onChange={(e) => updateFilter('dateTo', e.target.value)}
                    />
                  </div>
                </div>

                <div className="filter-actions">
                  <button
                    className="search-btn"
                    onClick={() => searchMatches(1)}
                    disabled={searchLoading}
                  >
                    {searchLoading ? (
                      <>
                        <SpinnerGap size={16} className="spinner" style={{ marginRight: 6 }} />
                        Cerco...
                      </>
                    ) : (
                      <>
                        <MagnifyingGlass size={16} weight="bold" style={{ marginRight: 6 }} />
                        Cerca
                      </>
                    )}
                  </button>
                  <button className="reset-btn" onClick={resetFilters}>
                    <ArrowsClockwise size={16} weight="bold" style={{ marginRight: 4 }} />
                    Reset
                  </button>
                </div>
              </div>

              {/* Risultati */}
              {searchResults && (
                <div className="explore-results">
                  <div className="results-header">
                    <span className="results-count">
                      {searchResults.pagination.total} match trovati
                    </span>
                  </div>

                  {searchResults.matches.length === 0 ? (
                    <div className="no-results">
                      <MagnifyingGlass
                        size={32}
                        weight="duotone"
                        style={{ marginBottom: 8, opacity: 0.6 }}
                      />
                      <p>Nessun match trovato con questi filtri</p>
                    </div>
                  ) : (
                    <>
                      <div className="results-list">
                        {searchResults.matches.map((match) => (
                          <div
                            key={match.eventId}
                            className="result-item clickable"
                            onClick={() => onMatchSelect && onMatchSelect(match)}
                          >
                            <div className="result-main">
                              <span className="result-teams">
                                {match.homeTeam} vs {match.awayTeam}
                              </span>
                              <span className="result-tournament">{match.tournament}</span>
                            </div>
                            <div className="result-meta">
                              <span className={`result-status ${match.status}`}>
                                {match.status === 'finished' ? (
                                  <>
                                    <CheckCircle size={12} weight="duotone" /> Finita
                                  </>
                                ) : match.status === 'inprogress' ? (
                                  <>
                                    <Circle size={10} weight="fill" style={{ color: '#ef4444' }} />{' '}
                                    Live
                                  </>
                                ) : (
                                  <>
                                    <Hourglass size={12} weight="duotone" /> Da iniziare
                                  </>
                                )}
                              </span>
                              {match.startTime && (
                                <span className="result-date">
                                  {new Date(match.startTime).toLocaleDateString('it-IT', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                              {match.homeScore !== null && match.awayScore !== null && (
                                <span className="result-score">
                                  {match.homeScore} - {match.awayScore}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Paginazione */}
                      {searchResults.pagination.totalPages > 1 && (
                        <div className="pagination-controls">
                          <button
                            className="pagination-btn"
                            onClick={() => searchMatches(searchPage - 1)}
                            disabled={!searchResults.pagination.hasPrev || searchLoading}
                          >
                            <ArrowLeft size={16} weight="bold" style={{ marginRight: 4 }} />
                            Precedente
                          </button>
                          <span className="pagination-info">
                            Pagina {searchResults.pagination.page} di{' '}
                            {searchResults.pagination.totalPages}
                          </span>
                          <button
                            className="pagination-btn"
                            onClick={() => searchMatches(searchPage + 1)}
                            disabled={!searchResults.pagination.hasNext || searchLoading}
                          >
                            Successivo
                            <ArrowRight size={16} weight="bold" style={{ marginLeft: 4 }} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Messaggio iniziale */}
              {!searchResults && !searchLoading && (
                <div className="explore-hint">
                  <Lightbulb
                    size={24}
                    weight="duotone"
                    style={{ marginRight: 8, color: '#f59e0b' }}
                  />
                  <p>Usa i filtri sopra per cercare match nel database</p>
                  <small>Puoi filtrare per giocatore, torneo, status o data</small>
                </div>
              )}
            </div>
          )}

          {/* Predictor Tab - Rimosso, ora usa PredictorTab in MatchPage */}
          {activeTab === 'predictor' && (
            <div className="tab-content predictor-tab">
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                <p>Predictor moved to Match Page</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonitoringDashboard;
