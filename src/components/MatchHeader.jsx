import React from 'react';
import { extractEventInfo, safeRender } from '../utils';
import styles from '../styles/matchHeader.module.css';

/**
 * Converte codice paese alpha2 in emoji bandiera
 * Es: "IT" -> "🇮🇹", "US" -> "🇺🇸"
 */
function countryToFlag(alpha2) {
  if (!alpha2 || alpha2.length !== 2) return null;
  const code = alpha2.toUpperCase();
  // Converti le lettere in regional indicator symbols
  const flagEmoji = String.fromCodePoint(
    ...code.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
  return flagEmoji;
}

/**
 * MatchHeader - displays match info: players, scores, status, tournament
 * 
 * @param {Object} props
 * @param {Object} props.data - Raw data from scraper
 * @param {Object} props.eventInfo - Pre-extracted event info (optional, will extract from data if not provided)
 */
function MatchHeaderComponent({ data, eventInfo: externalEventInfo }) {
  // Extract event info if not provided
  const eventInfo = externalEventInfo || (data ? extractEventInfo(data) : null);
  
  if (!eventInfo) {
    return <div className={styles.noData}>Nessun dato evento disponibile</div>;
  }
  
  const { home, away, homeScore, awayScore, status, tournament, round, venue, winnerCode } = eventInfo;

  // Keep stable refs for point animation
  const homePointRef = React.useRef(homeScore?.point);
  const awayPointRef = React.useRef(awayScore?.point);
  const [homePulse, setHomePulse] = React.useState(false);
  const [awayPulse, setAwayPulse] = React.useState(false);

  // Detect point changes to trigger a pulse animation on the point element
  React.useEffect(() => {
    if (homeScore?.point !== homePointRef.current) {
      homePointRef.current = homeScore?.point;
      setHomePulse(true);
      const t = setTimeout(() => setHomePulse(false), 140);
      return () => clearTimeout(t);
    }
  }, [homeScore?.point]);

  React.useEffect(() => {
    if (awayScore?.point !== awayPointRef.current) {
      awayPointRef.current = awayScore?.point;
      setAwayPulse(true);
      const t = setTimeout(() => setAwayPulse(false), 140);
      return () => clearTimeout(t);
    }
  }, [awayScore?.point]);
  
  // Determine match status text and class
  const getStatusClass = () => {
    if (!status) return '';
    if (status.type === 'finished') return styles.finished;
    if (status.type === 'inprogress') return styles.live;
    if (status.type === 'notstarted') return styles.upcoming;
    return '';
  };
  
  const getStatusText = () => {
    if (!status) return '';
    if (status.type === 'finished') return 'Terminato';
    if (status.type === 'inprogress') return '🔴 LIVE';
    if (status.type === 'notstarted') return 'Non iniziato';
    return status.description || '';
  };
  
  // Small helper components to minimize re-renders
  const SetsDisplay = React.memo(function SetsDisplay({ sets }) {
    if (!sets || !sets.length) return null;
    return (
      <div className={styles.setsContainer}>
        {sets.map((s, i) => (
          <span key={i} className={styles.setScore}>
            {s.games}
            {s.tiebreak !== null && <sup>{s.tiebreak}</sup>}
          </span>
        ))}
      </div>
    );
  }, (prev, next) => {
    // Fast shallow compare by length and elements
    const a = prev.sets || [];
    const b = next.sets || [];
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].games !== b[i].games || a[i].tiebreak !== b[i].tiebreak) return false;
    }
    return true;
  });

  const GameScore = React.memo(function GameScore({ homeGame, awayGame, winnerCode, statusType }) {
    // show dash if values are null/undefined
    const h = homeGame ?? '-';
    const a = awayGame ?? '-';
    const leftClass = statusType === 'finished' && winnerCode === 1 ? `${styles.gameNumber} ${styles.winnerScore}` : styles.gameNumber;
    const rightClass = statusType === 'finished' && winnerCode === 2 ? `${styles.gameNumber} ${styles.winnerScore}` : styles.gameNumber;
    return (
      <div className={styles.gameScore}>
        <span className={leftClass}>{h}</span>
        <span className={styles.scoreSeparator}>-</span>
        <span className={rightClass}>{a}</span>
      </div>
    );
  }, (p, n) => p.homeGame === n.homeGame && p.awayGame === n.awayGame && p.winnerCode === n.winnerCode && p.statusType === n.statusType);

  const CurrentPoint = React.memo(function CurrentPoint({ point, className }) {
    if (!point && point !== 0) return null;
    return <span className={`${styles.currentPoint} ${className || ''}`}>{safeRender(point)}</span>;
  }, (p, n) => p.point === n.point && p.className === n.className);


  return (
    <div className={styles.matchHeader}>
      {/* Tournament info */}
      {tournament && (
        <div className={styles.tournamentInfo}>
          <span className={styles.tournamentName}>{safeRender(tournament.name, tournament)}</span>
          {round && <span className={styles.roundInfo}> - {safeRender(round.name || round.round, round)}</span>}
          {tournament.groundType && (
            <span className={styles.groundType}> ({safeRender(tournament.groundType)})</span>
          )}
        </div>
      )}
      
      {/* Status badge */}
      <div className={`${styles.statusBadge} ${getStatusClass()}`}>
        {getStatusText()}
      </div>
      
      {/* Players and scores */}
      <div className={styles.matchup}>
        {/* Home player */}
        <div className={`${styles.player} ${styles.home} ${winnerCode === 1 ? styles.winner : ''}`}>
          <div className={styles.playerInfo}>
            <span className={styles.playerName}>{safeRender(home?.name || home?.fullName, 'Home')}</span>
          </div>
          <div className={styles.scoreSection}>
            <SetsDisplay sets={homeScore?.sets || []} />
            <CurrentPoint point={homeScore?.point} className={homePulse ? styles.pulse : ''} />
          </div>
        </div>
        {/* Game score or VS separator */}
        <GameScore homeGame={homeScore?.current} awayGame={awayScore?.current} winnerCode={winnerCode} statusType={status?.type} />
        
        {/* Away player */}
        <div className={`${styles.player} ${styles.away} ${winnerCode === 2 ? styles.winner : ''}`}>
          <div className={styles.playerInfo}>
            <span className={styles.playerName}>{safeRender(away?.name || away?.fullName, 'Away')}</span>
          </div>
          <div className={styles.scoreSection}>
            <SetsDisplay sets={awayScore?.sets || []} />
            <CurrentPoint point={awayScore?.point} />
          </div>
        </div>
      </div>
      

      
      {/* Venue info */}
      {venue && (
        <div className={styles.venueInfo}>
          📍 {safeRender(venue.name)}{venue.city?.name && `, ${safeRender(venue.city.name)}`}
        </div>
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders during auto-refresh
export default React.memo(MatchHeaderComponent);
