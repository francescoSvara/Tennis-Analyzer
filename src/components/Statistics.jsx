import React, { useEffect, useState, memo } from 'react';
import StatGroup from './StatGroup';
import styles from '../styles/statistics.module.css';
import { extractStatistics, getAvailableStatPeriods } from '../utils';

/**
 * Statistics component - displays match statistics
 * 
 * @param {Object} props
 * @param {Object} props.data - Raw data from scraper (optional, will fetch from file if not provided)
 * @param {string} props.period - Period to display ('ALL', '1', '2', etc.). Default 'ALL'
 * @param {Function} props.onHasData - Callback to report if data is available
 */
function Statistics({ data: externalData, period = 'ALL', onHasData = () => {}, liveMode = false }) {
  const [internalData, setInternalData] = useState(null);
  const [loading, setLoading] = useState(!externalData);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  // Fetch data from file only if no external data provided
  useEffect(() => {
    if (externalData) {
      setInternalData(null);
      setLoading(false);
      return;
    }
    
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/evento-tennis-completo.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        if (mounted) setInternalData(json);
      } catch (e) {
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [externalData]);

  // Use external data if provided, otherwise use fetched data
  const sourceData = externalData || internalData;
  
  // Extract statistics using the new utility function
  const stats = sourceData ? extractStatistics(sourceData, selectedPeriod) : null;
  const availablePeriods = sourceData ? getAvailableStatPeriods(sourceData) : [];

  // Report data availability
  useEffect(() => {
    onHasData(!!stats);
  }, [stats, onHasData]);

  if (loading) {
    return <div className={styles.loading}>Caricamento statistiche...</div>;
  }
  
  if (error) {
    return <div className={styles.error}>Errore: {error.message}</div>;
  }

  if (!stats || !stats.groups || stats.groups.length === 0) {
    const className = liveMode ? `${styles.noData} ${styles.noDataLive}` : styles.noData;
    return <div className={className}>Nessuna statistica disponibile</div>;
  }

  return (
    <div className={styles.statisticsContainer}>
      {/* Period selector */}
      {availablePeriods.length > 1 && (
        <div className={styles.periodSelector}>
          {availablePeriods.map(p => (
            <button
              key={p}
              className={`${styles.periodBtn} ${selectedPeriod === p ? styles.active : ''}`}
              onClick={() => setSelectedPeriod(p)}
            >
              {p === 'ALL' ? 'Totale' : `Set ${p}`}
            </button>
          ))}
        </div>
      )}
      
      {/* Statistics groups */}
      {stats.groups.map((g, i) => (
        <StatGroup key={i} group={g} />
      ))}
    </div>
  );
}

export default memo(Statistics);
