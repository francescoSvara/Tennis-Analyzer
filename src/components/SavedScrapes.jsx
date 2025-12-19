import React, { useState, useEffect } from 'react';
import { apiUrl } from '../config';

/**
 * SavedScrapes - Component to list and load saved scrapes
 * 
 * @param {Object} props
 * @param {Function} props.onLoad - Callback when a scrape is selected (receives scraped data)
 * @param {boolean} props.collapsed - Whether to show collapsed by default
 */
export default function SavedScrapes({ onLoad, collapsed = true }) {
  const [scrapes, setScrapes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(!collapsed);
  const [loadingId, setLoadingId] = useState(null);

  // Fetch list of saved scrapes
  const fetchScrapes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/scrapes'));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      setScrapes(json.scrapes || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchScrapes();
    }
  }, [isOpen]);

  // Load a specific scrape
  const loadScrape = async (id) => {
    setLoadingId(id);
    try {
      const res = await fetch(apiUrl(`/api/scrapes/${id}`));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (onLoad) {
        onLoad(data, id);
      }
    } catch (e) {
      setError('Errore caricamento: ' + e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div style={{
      background: '#1a1a1a',
      borderRadius: 8,
      marginTop: 16,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: '#333',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 14,
          fontWeight: 'bold'
        }}
      >
        <span>📁 Scrapes Salvati ({scrapes.length})</span>
        <span>{isOpen ? '▼' : '▶'}</span>
      </button>

      {/* Content */}
      {isOpen && (
        <div style={{ padding: 12 }}>
          {/* Refresh button */}
          <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
            <button
              onClick={fetchScrapes}
              disabled={loading}
              style={{
                padding: '6px 12px',
                background: '#2196f3',
                border: 'none',
                borderRadius: 4,
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              🔄 Aggiorna lista
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div style={{ color: '#f44336', marginBottom: 12, padding: 8, background: '#2d1a1a', borderRadius: 4 }}>
              ❌ {error}
            </div>
          )}

          {/* Loading state */}
          {loading && <div style={{ color: '#888', textAlign: 'center', padding: 20 }}>Caricamento...</div>}

          {/* Empty state */}
          {!loading && scrapes.length === 0 && (
            <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>
              Nessuno scrape salvato trovato
            </div>
          )}

          {/* Scrapes list */}
          {!loading && scrapes.length > 0 && (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {scrapes.map((scrape) => (
                <div
                  key={scrape.id}
                  style={{
                    padding: '10px 12px',
                    background: '#222',
                    borderRadius: 6,
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Match info if available */}
                    {scrape.home && scrape.away ? (
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                        🎾 {scrape.home} vs {scrape.away}
                      </div>
                    ) : (
                      <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#888' }}>
                        📄 {scrape.id}
                      </div>
                    )}
                    
                    {/* Tournament */}
                    {scrape.tournament && (
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                        🏆 {scrape.tournament}
                      </div>
                    )}
                    
                    {/* Meta info */}
                    <div style={{ fontSize: 11, color: '#666' }}>
                      📅 {formatDate(scrape.createdAt)} • 💾 {formatSize(scrape.size)}
                    </div>
                  </div>

                  <button
                    onClick={() => loadScrape(scrape.id)}
                    disabled={loadingId === scrape.id}
                    style={{
                      padding: '8px 16px',
                      background: loadingId === scrape.id ? '#555' : '#4caf50',
                      border: 'none',
                      borderRadius: 4,
                      color: 'white',
                      cursor: loadingId === scrape.id ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {loadingId === scrape.id ? '⏳...' : '📂 Carica'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
